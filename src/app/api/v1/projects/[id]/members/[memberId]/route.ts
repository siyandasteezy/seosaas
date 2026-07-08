import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

const updateSchema = z.object({ role: z.enum(["ADMIN", "MEMBER", "VIEWER"]) });

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id, memberId } = await params;
  await requireProjectRole(id, "ADMIN");
  const body = updateSchema.parse(await req.json());

  const target = await prisma.membership.findFirst({ where: { id: memberId, projectId: id } });
  if (!target) throw new ApiError(404, "Member not found");
  if (target.role === "OWNER") throw new ApiError(403, "Cannot change the owner's role");

  const updated = await prisma.membership.update({
    where: { id: memberId },
    data: { role: body.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id, memberId } = await params;
  await requireProjectRole(id, "ADMIN");

  const target = await prisma.membership.findFirst({ where: { id: memberId, projectId: id } });
  if (!target) throw new ApiError(404, "Member not found");
  if (target.role === "OWNER") throw new ApiError(403, "Cannot remove the project owner");

  await prisma.membership.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
});
