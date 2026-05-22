import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth as any;
  const isLoggedIn = !!session;

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isDashboard = pathname.startsWith("/dashboard");

  // Force re-login if refresh token expired — only redirect if not already on sign-in
  if (isLoggedIn && session?.error === "RefreshTokenExpired" && !isAuthPage) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isLoggedIn && isAuthPage && !session?.error) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isLoggedIn && isDashboard) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
