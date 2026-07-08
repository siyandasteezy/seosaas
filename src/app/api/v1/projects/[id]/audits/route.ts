import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { runAuditScan } from "@/lib/scans";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const audits = await prisma.audit.findMany({
    where: { projectId: id },
    include: { issues: true },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return NextResponse.json(audits);
});

export const POST = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "MEMBER");
  const result = await runAuditScan(id);
  return NextResponse.json(result, { status: 201 });
});
