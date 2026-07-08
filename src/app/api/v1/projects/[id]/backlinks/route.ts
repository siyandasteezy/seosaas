import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const status = req.nextUrl.searchParams.get("status");
  const backlinks = await prisma.backlink.findMany({
    where: {
      projectId: id,
      ...(status === "ACTIVE" || status === "LOST" ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { domainRating: "desc" }],
  });
  return NextResponse.json(backlinks);
});
