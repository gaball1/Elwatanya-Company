import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "الوطنية للتنمية العمرانية | نظام إدارة مشاريع المقاولات",
  description:
    "نظام متكامل لإدارة المشاريع والمقاولين الباطنين والمخازن والمستخلصات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
