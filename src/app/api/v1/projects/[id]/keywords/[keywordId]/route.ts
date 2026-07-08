import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; keywordId: string }> };

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id, keywordId } = await params;
  await requireProjectRole(id, "MEMBER");
  const keyword = await prisma.keyword.findFirst({ where: { id: keywordId, projectId: id } });
  if (!keyword) throw new ApiError(404, "Keyword not found");
  await prisma.keyword.delete({ where: { id: keywordId } });
  return NextResponse.json({ ok: true });
});
