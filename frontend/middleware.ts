// middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // ✅ تعطيل Route Protection تماماً - كل الصفحات مفتوحة
  // تقدر تدخل أي صفحة من الـ URL من غير Login

  // بس لو عاوز تحمي صفحة معينة في المستقبل، هتفعل الكود اللي تحت
  // const pathname = request.nextUrl.pathname;
  // const locale = pathname.split('/')[1] || 'ar';
  // const isAdminRoute = pathname.includes(`/${locale}/admin`);
  // if (isAdminRoute) {
  //   const token = request.cookies.get('elwataniya_token')?.value;
  //   if (!token) {
  //     return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  //   }
  // }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
