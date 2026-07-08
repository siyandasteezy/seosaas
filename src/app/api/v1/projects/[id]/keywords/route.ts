import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

const createKeywordSchema = z.object({
  phrases: z.array(z.string().min(1).max(200)).min(1).max(100),
  country: z.string().length(2).default("us"),
  device: z.enum(["DESKTOP", "MOBILE"]).default("DESKTOP"),
});

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "VIEWER");
  const keywords = await prisma.keyword.findMany({
    where: { projectId: id },
    include: { rankings: { orderBy: { checkedAt: "desc" }, take: 30 } },
    orderBy: { phrase: "asc" },
  });
  return NextResponse.json(keywords);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await requireProjectRole(id, "MEMBER");
  const body = createKeywordSchema.parse(await req.json());

  const phrases = [...new Set(body.phrases.map((p) => p.trim().toLowerCase()).filter(Boolean))];
  if (phrases.length === 0) throw new ApiError(422, "No valid keywords provided");

  const created = await prisma.keyword.createMany({
    data: phrases.map((phrase) => ({
      projectId: id,
      phrase,
      country: body.country.toLowerCase(),
      device: body.device,
    })),
    skipDuplicates: true,
  });
  return NextResponse.json({ created: created.count }, { status: 201 });
});
