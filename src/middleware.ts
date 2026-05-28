import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "repairtrack-secret-key-2026"
);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/asignaciones",
  "/services",
  "/inventory",
  "/software",
  "/scanner",
  "/quotations",
  "/extracto",
  "/new-order",
  "/print",
  "/admin",
  "/certificates",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/asignaciones/:path*",
    "/services/:path*",
    "/inventory/:path*",
    "/software/:path*",
    "/scanner/:path*",
    "/quotations/:path*",
    "/extracto/:path*",
    "/new-order/:path*",
    "/print/:path*",
    "/admin/:path*",
    "/certificates/:path*",
  ],
};
