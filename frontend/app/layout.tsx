import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "الوطنية للتنمية العمرانية | نظام إدارة مشاريع المقاولات",
  description:
    "نظام متكامل لإدارة المشاريع والمقاولين الباطنين والمخازن والمستخلصات",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                var s = t || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (s === 'dark') document.documentElement.classList.add('dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
