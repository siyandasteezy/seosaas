import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { generateCsvReport, generatePdfReport } from "@/lib/reports";

type Ctx = { params: Promise<{ id: string }> };

const generateSchema = z.object({ format: z.enum(["PDF", "CSV"]) });

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const reports = await prisma.report.findMany({
    where: { projectId: id },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reports);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const { user } = await requireProjectRole(id, "MEMBER");
  const body = generateSchema.parse(await req.json());
  const report =
    body.format === "PDF"
      ? await generatePdfReport(id, user.id)
      : await generateCsvReport(id, user.id);
  return NextResponse.json(report, { status: 201 });
});
