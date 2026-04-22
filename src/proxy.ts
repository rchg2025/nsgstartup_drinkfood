import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Public routes
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/order-status")) {
    if (isAuthenticated && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (req.auth?.user as any)?.role;

  // Kitchen page - only barista, cashier and admin
  if (pathname === "/dashboard/kitchen") {
    if (role !== "BARISTA" && role !== "ADMIN" && role !== "CASHIER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Admin-only routes
  if (
    pathname.startsWith("/dashboard/staff") ||
    pathname.startsWith("/dashboard/settings")
  ) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
