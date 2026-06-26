import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no database/bcrypt imports)
// Used by middleware only
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.avatar = (user as any).avatar;
      }
      if (trigger === "update" && session?.avatar) {
        token.avatar = session.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
  providers: [], // Providers added in auth.ts (not edge-compatible)
};
