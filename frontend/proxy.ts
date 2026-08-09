// middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split('/')[1] || 'ar';
  const token = request.cookies.get('elwataniya_token')?.value;

  console.log("[MIDDLEWARE] REQUEST - pathname:", pathname, "cookie_token:", !!token);

  // Protect admin routes
  if (pathname.includes(`/${locale}/admin`) || pathname.includes(`/${locale}/dashboard`) || pathname.includes(`/${locale}/profile`)) {
    if (!token) {
      console.log("[MIDDLEWARE] BLOCKED - no token, redirecting to login from:", pathname);
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    console.log("[MIDDLEWARE] ALLOWED - token found for protected route:", pathname);
  }

  const result = intlMiddleware(request);
  console.log("[MIDDLEWARE] COMPLETED - pathname:", pathname, "status:", result.status);
  return result;
}

export const config = {
  matcher: ["/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
