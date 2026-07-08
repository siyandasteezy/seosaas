import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
].join(" ");

function redirectUri() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/v1/google/callback`;
}

export function googleConsentUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new ApiError(502, `Google token exchange failed: ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
}

/**
 * Returns a valid Google access token for the user, refreshing it via the
 * stored refresh token when expired. Throws 400 if Google isn't connected.
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const cred = await prisma.googleCredential.findUnique({ where: { userId } });
  if (!cred) throw new ApiError(400, "Google account not connected");

  const stillValid =
    cred.accessToken && cred.expiresAt && cred.expiresAt.getTime() > Date.now() + 60_000;
  if (stillValid) return cred.accessToken as string;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: cred.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new ApiError(502, "Failed to refresh Google access token");
  const data = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.googleCredential.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
  return data.access_token;
}
