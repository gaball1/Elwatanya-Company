/* eslint-disable */
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const success = await login(email, password);
    if (success) {
      router.push(`/${locale}/admin`);
    } else {
      setError("بيانات الدخول غير صحيحة");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex flex-col">
      {/* زر الرجوع للرئيسية */}
      <div className="container mx-auto px-6 pt-8">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          العودة إلى الرئيسية
        </Link>
      </div>

      {/* محتوى الصفحة */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* اللوجو */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gold to-gold-light rounded-full blur-xl opacity-30 animate-pulse" />
                <Image
                  src="/logo2.jpg"
                  alt="Logo"
                  width={70}
                  height={70}
                  className="w-16 h-16 rounded-2xl shadow-xl relative z-10 border-2 border-white"
                  style={{ width: "auto", height: "auto" }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-primary">{t("login")}</h1>
            <p className="text-gray-500 text-sm mt-2">
              مرحباً بك في نظام الوطنية للتنمية العمرانية
            </p>
          </div>

          {/* الفورم */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t("email")}
              </label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-12 pl-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-gold focus:ring-gold"
                />
                <span className="text-sm text-gray-600">تذكرني</span>
              </label>
              <Link
                href={`/${locale}/forgot-password`}
                className="text-sm text-gold hover:underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {t("submit")}
                </>
              )}
            </motion.button>
          </form>

          {/* رابط إنشاء حساب */}
          <p className="text-center text-gray-500 mt-6">
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/register`}
              className="text-gold font-semibold hover:underline"
            >
              {t("register")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
