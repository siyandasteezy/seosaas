import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z
    .string()
    .min(3)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase())
    .optional(),
  gscSiteUrl: z.string().nullable().optional(),
  ga4PropertyId: z.string().nullable().optional(),
  scanFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "MANUAL"]).optional(),
  emailAlerts: z.boolean().optional(),
});

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      _count: { select: { keywords: true, backlinks: true, audits: true, reports: true } },
    },
  });
  return NextResponse.json(project);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "ADMIN");
  const body = updateProjectSchema.parse(await req.json());
  const project = await prisma.project.update({ where: { id }, data: body });
  return NextResponse.json(project);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "OWNER");
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
