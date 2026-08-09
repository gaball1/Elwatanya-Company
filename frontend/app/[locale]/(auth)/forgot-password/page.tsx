/* eslint-disable */
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api/apiClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(isArabic ? "البريد الإلكتروني مطلوب" : "Email is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient("/auth/forgot-password", {
        method: "POST",
        body: { email },
        skipAuth: true,
        skipAuthRetry: true,
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || (isArabic ? "حدث خطأ" : "An error occurred"));
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
                {isArabic ? "نسيت كلمة المرور" : "Forgot Password"}
              </h1>
              <p className="text-text-secondary text-sm">
                {isArabic
                  ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور"
                  : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {sent ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                  <Send size={32} className="text-success" />
                </div>
                <p className="text-text-primary font-medium">
                  {isArabic ? "تم إرسال رابط إعادة التعيين" : "Reset link sent"}
                </p>
                <p className="text-text-secondary text-sm">
                  {isArabic
                    ? "يرجى التحقق من بريدك الإلكتروني"
                    : "Please check your email inbox"}
                </p>
                <button onClick={() => router.push(`/${locale}/login`)} className="text-gold hover:underline text-sm">
                  {isArabic ? "العودة لتسجيل الدخول" : "Back to Login"}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {isArabic ? "البريد الإلكتروني" : "Email"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@company.com"
                      className="w-full pr-12 pl-4 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary"
                      required
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
                      <Send size={18} />
                      {isArabic ? "إرسال" : "Send"}
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
