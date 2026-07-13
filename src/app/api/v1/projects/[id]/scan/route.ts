import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { runScan } from "@/lib/scans";

type Ctx = { params: Promise<{ id: string }> };

const scanSchema = z.object({
  type: z.enum(["RANKINGS", "BACKLINKS", "AUDIT", "FULL"]).default("FULL"),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "MEMBER");
  const body = scanSchema.parse(await req.json().catch(() => ({})));
  const { scanId, summary } = await runScan(id, body.type);
  return NextResponse.json({ scanId, status: "COMPLETED", summary }, { status: 201 });
});
