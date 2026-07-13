/* eslint-disable */
"use client";

import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/") || `/${newLocale}`;
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
      <button
        onClick={() => switchLocale("ar")}
        className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
          pathname.startsWith("/ar")
            ? "bg-primary text-white"
            : "text-gray-500 hover:text-primary"
        }`}
      >
        ع
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2.5 py-1 text-sm font-medium rounded-md transition-colors ${
          pathname.startsWith("/en")
            ? "bg-primary text-white"
            : "text-gray-500 hover:text-primary"
        }`}
      >
        EN
      </button>
    </div>
  );
}
