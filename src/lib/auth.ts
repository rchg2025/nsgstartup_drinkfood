import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.active) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await prisma.activityLog.create({
          data: {
            userId: user.id as string,
            action: "Đăng nhập",
            details: `Thành viên ${user.name} đã đăng nhập hệ thống`,
          }
        }).catch(err => console.error("SignIn log error:", err));
      }
    },
    async signOut(message) {
      if ("token" in message && message.token?.id) {
        await prisma.activityLog.create({
          data: {
            userId: message.token.id as string,
            action: "Đăng xuất",
            details: "Đăng xuất khỏi hệ thống",
          }
        }).catch(err => console.error("SignOut log error:", err));
      } else if ("session" in message && message.session) {
        // Safe fallback if user has session-based auth 
        await prisma.activityLog.create({
          data: {
            // @ts-ignore
            userId: message.session.userId || "unknown",
            action: "Đăng xuất",
            details: "Đăng xuất khỏi hệ thống",
          }
        }).catch(err => console.error("SignOut log error:", err));
      }
    }
  }
});
