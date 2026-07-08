import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z
    .string()
    .min(3)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()),
  scanFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "MANUAL"]).optional(),
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { memberships: { some: { userId: user.id } } },
    include: { _count: { select: { keywords: true, backlinks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = createProjectSchema.parse(await req.json());
  const project = await prisma.project.create({
    data: {
      name: body.name,
      domain: body.domain,
      scanFrequency: body.scanFrequency ?? "WEEKLY",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  return NextResponse.json(project, { status: 201 });
});
