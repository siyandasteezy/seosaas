import { NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { googleConsentUrl } from "@/lib/integrations/googleAuth";

/** Starts the Google OAuth consent flow for Search Console + GA4 access. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError(501, "Google OAuth is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
  return NextResponse.redirect(googleConsentUrl(user.id));
});
