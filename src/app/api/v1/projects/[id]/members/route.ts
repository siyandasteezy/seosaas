import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { sendMail, alertEmailHtml } from "@/lib/mail";

type Ctx = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const members = await prisma.membership.findMany({
    where: { projectId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "ADMIN");
  const body = inviteSchema.parse(await req.json());

  const invitee = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!invitee) {
    throw new ApiError(404, "No RankLens account with that email — ask them to register first");
  }

  const existing = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: invitee.id, projectId: id } },
  });
  if (existing) throw new ApiError(409, "User is already a member of this project");

  const membership = await prisma.membership.create({
    data: { userId: invitee.id, projectId: id, role: body.role },
    include: { user: { select: { id: true, name: true, email: true } }, project: true },
  });

  await sendMail(
    invitee.email,
    `You've been added to ${membership.project.name} on RankLens`,
    alertEmailHtml(
      `You've been added to ${membership.project.name}`,
      [`You now have ${body.role.toLowerCase()} access to this project.`],
      `/dashboard/projects/${id}`
    )
  );
  return NextResponse.json(membership, { status: 201 });
});
