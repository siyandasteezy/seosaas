import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = registerSchema.parse(await req.json());
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name,
      passwordHash: await bcrypt.hash(body.password, 12),
    },
    select: { id: true, email: true, name: true },
  });
  return NextResponse.json(user, { status: 201 });
});
