import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthSecret } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
  });

  if (pathname.startsWith("/admin")) {
    if (!token) return redirectToLogin(request);
    if (token.role !== "ADMIN") return NextResponse.redirect(new URL("/label", request.url));
  }

  if (pathname.startsWith("/label") && !token) {
    return redirectToLogin(request);
  }

  if (pathname === "/login" && token) {
    const target = token.role === "ADMIN" ? "/admin" : "/label";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/label/:path*", "/login"],
};
