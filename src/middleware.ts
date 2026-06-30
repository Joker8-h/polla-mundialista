import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/match", "/perfil", "/ranking", "/premios"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  if (isProtected && !req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/match/:path*", "/perfil/:path*", "/ranking/:path*", "/store/:path*", "/premios/:path*"],
};
