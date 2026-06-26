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
      if (trigger === "update" && session) {
        if (session.avatar !== undefined) token.avatar = session.avatar;
        if (session.name !== undefined) token.name = session.name;
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
