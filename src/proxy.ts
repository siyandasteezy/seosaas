import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16 proxy (formerly middleware): redirects unauthenticated
// users away from /dashboard via the `authorized` callback.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
