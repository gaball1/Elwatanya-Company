"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Lock, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { ApiError } from "@/lib/api/apiClient";
import { isNetworkError } from "@/lib/api/fetchTransport";

function getLoginError(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return t("invalidCredentials");
    if (err.status === 429) return t("tooManyAttempts");
    return err.message || t("loginFailed");
  }
  if (isNetworkError(err)) return t("networkError");
  return t("loginFailed");
}

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
    try {
      const user = await login(email, password);
      if (user) {
        const perms = user.permissions ?? [];
        const canManage =
          perms.includes("attendance.update") ||
          perms.includes("attendance.write") ||
          user.roleNames?.includes("SUPER_ADMIN") === true;
        const destination = canManage ? "admin" : "attendance";
        router.push(`/${locale}/${destination}`);
        return;
      }
      setError(t("invalidCredentials"));
    } catch (err) {
      setError(getLoginError(err, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-secondary flex flex-col">
      {/* زر الرجوع للرئيسية */}
      <div className="absolute top-6 right-6">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-gold transition group px-4 py-2 rounded-lg hover:bg-surface/50"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          {t("backToHome")}
        </Link>
      </div>

      {/* محتوى الصفحة */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Card Container */}
          <div className="bg-surface-secondary rounded-2xl shadow-xl border border-border/50 p-8">
            {/* Brand Logo - Removed oversized logo as requested */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gold to-gold-light rounded-2xl blur-2xl opacity-20" />
                  <Image
                    src="/logo2.jpg"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl shadow-lg relative z-10 border-2 border-white/10"
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-2xl font-bold text-primary mb-2"
              >
                {t("login")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-text-secondary text-sm"
              >
                {t("welcomeMessage")}
              </motion.p>
            </div>

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  {t("email")}
                </label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    suppressHydrationWarning
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full pr-12 pl-4 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-text-primary"
                  >
                    {t("password")}
                  </label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-sm text-gold hover:underline transition-colors"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    suppressHydrationWarning
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface/50"
                    suppressHydrationWarning
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border-dark text-gold focus:ring-gold focus:ring-offset-0"
                    suppressHydrationWarning
                  />
                  <span className="text-sm text-text-secondary">تذكرني</span>
                </label>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-danger text-sm text-center bg-danger/10 py-2 px-3 rounded-lg"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                suppressHydrationWarning
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {t("login")}
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-4 text-sm text-text-muted bg-surface-secondary">أو</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Google Login Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full py-3.5 bg-surface hover:bg-surface-secondary border border-border rounded-xl transition-all duration-200 flex items-center justify-center gap-3 mb-6"
              suppressHydrationWarning
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.205c0-.642-.029-1.264-.086-1.886H12v3.57h4.478c-.194 1.045-.73 1.951-1.536 2.568v2.125h2.48c1.456-1.335 2.286-3.306 2.286-5.635z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.05 0 5.586-1.01 7.444-2.725l-2.48-2.125c-.684.459-1.572.729-2.464.729-1.895 0-3.506-1.281-4.082-3.017l-2.54 1.978c1.193 2.376 3.542 4.01 6.026 4.01z"
                />
                <path
                  fill="#FBBC05"
                  d="M7.218 9.858l2.375 1.84c.572-.35 1.23-.557 1.915-.557 1.347 0 2.473.908 2.896 2.143l2.583-1.957c-1.083-1.717-2.949-2.93-5.158-2.93-3.885 0-7.03 2.875-7.03 6.41 0 2.44 1.477 4.53 3.56 5.577l2.562-1.982c-.84-.63-1.407-1.49-1.571-2.53z"
                />
                <path
                  fill="#EA4335"
                  d="M5.026 11.65c-.382.596-.569 1.28-.569 1.97 0 .695.188 1.375.569 1.97l2.562-1.98c-.444-.544-.76-1.256-.76-2.03 0-.772.317-1.486.76-2.03L5.026 7.026z"
                />
              </svg>
              <span className="text-text-primary font-medium">تسجيل الدخول عبر Google</span>
            </motion.button>

            {/* Register Link */}
            <p className="text-center text-text-secondary mt-6">
              {t("noAccount")}{" "}
              <Link
                href={`/${locale}/register`}
                className="text-gold font-semibold hover:underline transition-colors"
              >
                {t("createAccount")}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
