import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { readLegacyReportFile } from "@/lib/reports";

type Ctx = { params: Promise<{ id: string; reportId: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id, reportId } = await params;
  await requireProjectRole(id, "VIEWER");

  const report = await prisma.report.findFirst({ where: { id: reportId, projectId: id } });
  if (!report) throw new ApiError(404, "Report not found");

  const bytes =
    report.content ?? (report.filePath ? await readLegacyReportFile(report.filePath) : null);
  if (!bytes) throw new ApiError(410, "Report file no longer available");

  const isPdf = report.format === "PDF";
  const safeTitle = report.title.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}.${isPdf ? "pdf" : "csv"}"`,
    },
  });
});
