import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no Prisma imports) shared between the
 * middleware and the full server-side auth setup in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const protectedPath = request.nextUrl.pathname.startsWith("/dashboard");
      if (protectedPath) return !!auth?.user;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
