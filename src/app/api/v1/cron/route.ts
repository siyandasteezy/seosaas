import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, ApiError } from "@/lib/api";
import { listDueProjects, runDueScheduledScans, runScan } from "@/lib/scans";

export const maxDuration = 300;

/**
 * Scheduler API, authenticated with CRON_SECRET instead of a user session so
 * external schedulers (GitHub Actions, cron-job.org, …) can drive scans on
 * serverless deployments where the long-running worker isn't available.
 *
 * GET  -> list projects whose scheduled scan is due
 * POST {projectId, type} -> run one scan unit (fits serverless time limits)
 * POST {}                -> run everything due in one call (no-limit hosts)
 */
function checkSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new ApiError(501, "CRON_SECRET is not configured");
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) throw new ApiError(401, "Invalid cron secret");
}

const unitSchema = z.object({
  projectId: z.string().optional(),
  type: z.enum(["RANKINGS", "BACKLINKS", "AUDIT", "FULL"]).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  checkSecret(req);
  const due = await listDueProjects();
  return NextResponse.json({ due: due.map((p) => ({ id: p.id, name: p.name })) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  checkSecret(req);
  const body = unitSchema.parse(await req.json().catch(() => ({})));

  if (body.projectId) {
    const { scanId, summary } = await runScan(body.projectId, body.type ?? "FULL");
    return NextResponse.json({ scanId, status: "COMPLETED", summary });
  }
  const summary = await runDueScheduledScans();
  return NextResponse.json(summary);
});
