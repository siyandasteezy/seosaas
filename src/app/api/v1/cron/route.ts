import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api";
import { runDueScheduledScans } from "@/lib/scans";

export const maxDuration = 300;

/**
 * Triggers all due scheduled scans. Authenticated with CRON_SECRET instead of
 * a user session so external schedulers (Netlify scheduled functions, GitHub
 * Actions, cron-job.org, …) can call it on serverless deployments where the
 * long-running worker process isn't available.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new ApiError(501, "CRON_SECRET is not configured");

  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) throw new ApiError(401, "Invalid cron secret");

  const summary = await runDueScheduledScans();
  return NextResponse.json(summary);
});
