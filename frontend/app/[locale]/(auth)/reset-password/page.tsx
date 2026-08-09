/* eslint-disable */
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api/apiClient";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(isArabic ? "رمز إعادة التعيين غير صالح" : "Invalid reset token");
      return;
    }
    if (password.length < 6) {
      setError(isArabic ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient("/auth/reset-password", {
        method: "POST",
        body: { token, password },
        skipAuth: true,
        skipAuthRetry: true,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || (isArabic ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-secondary flex flex-col">
      <div className="absolute top-6 right-6">
        <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 text-text-secondary hover:text-gold transition group px-4 py-2 rounded-lg hover:bg-surface/50">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          {isArabic ? "العودة لتسجيل الدخول" : "Back to Login"}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <div className="bg-surface-secondary rounded-2xl shadow-xl border border-border/50 p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <Image src="/logo2.jpg" alt="Logo" width={48} height={48} className="w-12 h-12 rounded-xl shadow-lg" />
              </div>
              <h1 className="text-2xl font-bold text-primary mb-2">
                {isArabic ? "إعادة تعيين كلمة المرور" : "Reset Password"}
              </h1>
              <p className="text-text-secondary text-sm">
                {isArabic ? "أدخل كلمة المرور الجديدة" : "Enter your new password"}
              </p>
            </div>

            {success ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                  <KeyRound size={32} className="text-success" />
                </div>
                <p className="text-text-primary font-medium">
                  {isArabic ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully"}
                </p>
                <button onClick={() => router.push(`/${locale}/login`)} className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl">
                  {isArabic ? "تسجيل الدخول" : "Login"}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {isArabic ? "كلمة المرور الجديدة" : "New Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-12 pl-12 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-12 pl-4 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-danger text-sm text-center bg-danger/10 py-2 px-3 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound size={18} />
                      {isArabic ? "إعادة تعيين" : "Reset"}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{/* loading */}</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
