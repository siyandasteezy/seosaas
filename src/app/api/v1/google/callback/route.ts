import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { exchangeCodeForTokens } from "@/lib/integrations/googleAuth";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) throw new ApiError(400, "Missing authorization code");
  if (state !== user.id) throw new ApiError(403, "OAuth state mismatch");

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    // Google only returns a refresh token on first consent; we force
    // prompt=consent so this should not happen in practice.
    throw new ApiError(502, "Google did not return a refresh token — try disconnecting and reconnecting");
  }

  await prisma.googleCredential.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    },
  });

  return NextResponse.redirect(`${appUrl}/dashboard?google=connected`);
});
