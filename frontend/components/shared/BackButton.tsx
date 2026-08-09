"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
}

export default function BackButton({
  fallbackHref,
  className = "text-text-secondary hover:text-gold transition",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (fallbackHref) {
      router.push(fallbackHref);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.back();
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label="Back">
      <ChevronLeft className="w-5 h-5" />
    </button>
  );
}
