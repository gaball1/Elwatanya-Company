/* eslint-disable */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui";

interface NavbarProps {
  scrollTo?: (id: string) => void;
}

export default function Navbar({ scrollTo }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";

  const isArabic = locale === "ar";
  const navItems = isArabic
    ? [
        { name: "الرئيسية", id: "home" },
        { name: "خدماتنا", id: "services" },
        { name: "المميزات", id: "features" },
        { name: "مشاريعنا", id: "projects" },
        { name: "من نحن", id: "about" },
        { name: "اتصل بنا", id: "contact" },
      ]
    : [
        { name: "Home", id: "home" },
        { name: "Services", id: "services" },
        { name: "Features", id: "features" },
        { name: "Projects", id: "projects" },
        { name: "About", id: "about" },
        { name: "Contact", id: "contact" },
      ];

  // ✅ تحديث موضع الخط عند تغيير السيكشن النشط
  useEffect(() => {
    const activeElement = navRefs.current[activeSection];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setIndicatorStyle({
        left: offsetLeft,
        width: offsetWidth,
      });
    }
  }, [activeSection]);

  // ✅ تحديد السيكشن النشط بناءً على Scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const scrollPosition = window.scrollY + 120;

      for (const item of navItems) {
        const element = document.getElementById(item.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [navItems]);

  const handleClick = (id: string) => {
    setActiveSection(id);
    if (scrollTo) {
      scrollTo(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-md py-3"
          : "bg-white/95 backdrop-blur-sm py-4"
      } border-b border-gray-200`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Image
              src="/logo11.jpg"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-lg shadow-md"
            />
            <div className="hidden sm:block">
              <p className="font-bold text-primary text-lg leading-tight">
                {isArabic ? "الوطنية للتنمية العمرانية" : "El Wataniya"}
              </p>
              <p className="text-xs text-gold">
                {isArabic
                  ? "Al-Wataniya For Urban Development"
                  : "Urban Development"}
              </p>
            </div>
          </Link>

          {/* ✅ Desktop Menu مع خط متحرك */}
          <div className="hidden md:flex items-center gap-8 relative">
            {navItems.map((item) => (
              <button
                key={item.id}
                ref={(el) => {
                  navRefs.current[item.id] = el;
                }}
                onClick={() => handleClick(item.id)}
                className={`relative text-sm font-medium transition-colors duration-300 px-1 ${
                  activeSection === item.id
                    ? "text-gold"
                    : "text-gray-700 hover:text-gold"
                }`}
              >
                {item.name}
              </button>
            ))}

            {/* ✅ الخط الذهبي المتحرك تحت النص */}
            <motion.span
              className="absolute -bottom-1 h-0.5 bg-gold rounded-full"
              animate={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3,
              }}
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href={`/${locale}/login`}>
              <Button variant="outline" size="sm">
                {isArabic ? "تسجيل دخول" : "Login"}
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t mt-4 py-4">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`text-right py-2 px-2 transition-all ${
                    activeSection === item.id
                      ? "text-gold font-medium"
                      : "text-gray-700 hover:text-gold"
                  }`}
                >
                  {item.name}
                  {activeSection === item.id && (
                    <span className="inline-block w-1 h-1 bg-gold rounded-full mr-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  );
}
