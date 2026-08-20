import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedPrefixes = ["/admin", "/profile", "/projects", "/employees", "/attendance", "/clients", "/suppliers", "/subcontractors", "/inventory", "/categories", "/departments", "/holidays", "/approvals", "/notifications", "/reports", "/analytics", "/bi-dashboard", "/executive-dashboard", "/statements", "/client-statements", "/treasury", "/miscellaneous", "/stock-movements", "/warehouses", "/project-boards", "/roles", "/pending-signatures"];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split("/")[1] || "ar";
  const token = request.cookies.get("elwataniya_token")?.value;

  const isProtected = protectedPrefixes.some((p) => pathname.includes(`/${locale}${p}`));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const response = intlMiddleware(request);

  if (isProtected) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: ["/(ar|en)/:path*"],
};
