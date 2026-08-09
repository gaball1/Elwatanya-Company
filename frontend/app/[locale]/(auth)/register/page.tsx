/* eslint-disable */
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const { register } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  console.log("[REGISTER_PAGE] RENDERED, locale:", locale);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    const errors: string[] = [];

    if (pwd.length >= 8) strength += 25;
    else errors.push("8 characters minimum");

    if (/[A-Z]/.test(pwd)) strength += 25;
    else errors.push("uppercase letter");

    if (/[a-z]/.test(pwd)) strength += 25;
    else errors.push("lowercase letter");

    if (/\d/.test(pwd)) strength += 15;
    else errors.push("number");

    if (pwd.length >= 12) strength = 100;

    setPasswordStrength(strength);
    setPasswordErrors(errors);
    return { strength, errors };
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    calculatePasswordStrength(pwd);
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return "bg-danger";
    if (passwordStrength < 70) return "bg-warning";
    return "bg-success";
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength < 40) return t("weak") || "ضعيف";
    if (passwordStrength < 70) return t("medium") || "متوسط";
    return t("strong") || "قوي";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[REGISTER_PAGE] submit() - ENTERED, name:", name, "email:", email, "password length:", password.length);
    if (password !== confirmPassword) {
      console.log("[REGISTER_PAGE] submit() - passwords don't match, returning");
      setError(t("passwordMismatch") || "Passwords do not match");
      return;
    }
    if (passwordStrength < 70) {
      console.log("[REGISTER_PAGE] submit() - password too weak, strength:", passwordStrength);
      setError(t("passwordTooWeak") || "Password is too weak");
      return;
    }
    setLoading(true);
    setError("");
    console.log("[REGISTER_PAGE] submit() - calling register()");
    const success = await register(name, email, password);
    console.log("[REGISTER_PAGE] submit() - register() RETURNED:", success);
    if (success) {
      console.log("[REGISTER_PAGE] submit() - SUCCESS, calling router.push(/ar/login)");
      console.log("[REGISTER_PAGE] submit() - ABOUT TO NAVIGATE to /ar/login");
      router.push(`/${locale}/login`);
      console.log("[REGISTER_PAGE] submit() - router.push() CALLED - navigation initiated");
      return;
    }
    setLoading(false);
    setError(t("registrationFailed") || "Failed to create account");
    console.log("[REGISTER_PAGE] submit() - FAILED, showing error message");
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
            {/* Brand Logo */}
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
                {t("createAccount")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-text-secondary text-sm"
              >
                {t("registerDescription")}
              </motion.p>
            </div>

            {/* Register Form */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  {t("fullName")}
                </label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أحمد محمد"
                    className="w-full pr-12 pl-4 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                </div>
              </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full pr-12 pl-4 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  {t("password")}
                </label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface/50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength}%` }}
                            className={`h-full ${getStrengthColor()} transition-all duration-500`}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength < 40 ? 'text-danger' : passwordStrength < 70 ? 'text-warning' : 'text-success'}`}>
                        {getStrengthText()}
                      </span>
                    </div>

                    {passwordErrors.length > 0 && (
                      <div className="space-y-1">
                        {passwordErrors.map((error, idx) => (
                          <p key={idx} className="text-xs text-text-muted">
                            • {t("passwordRequirement" as any) || error}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-primary mb-2"
                >
                  {t("confirmPassword")}
                </label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3.5 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-surface-secondary hover:border-primary/30"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface/50"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-danger text-xs mt-1">
                    {t("passwordMismatch") || "Passwords do not match"}
                  </p>
                )}
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
                disabled={loading || passwordStrength < 70 || password !== confirmPassword}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    {t("createAccount")}
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

            {/* Google Register Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full py-3.5 bg-surface hover:bg-surface-secondary border border-border rounded-xl transition-all duration-200 flex items-center justify-center gap-3 mb-6"
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
                  d="M7.218 9.858l2.375 1.84c.572-.35 1.23-.557 1.915-.557 1.347 0 2.473.908 2.896 2.143l2.583-1.957c-1.083-1.717-2.949-2.93-5.158-2.93-3.885 0-7.03 2.875-7.03 6.41 0 2.44 1.477 4.53 5.577l2.562-1.982c-.84-.63-1.407-1.49-1.571-2.53z"
                />
                <path
                  fill="#EA4335"
                  d="M5.026 11.65c-.382.596-.569 1.28-.569 1.97 0 .695.188 1.375.569 1.97l2.562-1.98c-.444-.544-.76-1.256-.76-2.03 0-.772.317-1.486.76-2.03L5.026 7.026z"
                />
              </svg>
              <span className="text-text-primary font-medium">تسجيل الدخول عبر Google</span>
            </motion.button>

            {/* Login Link */}
            <p className="text-center text-text-secondary mt-6">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href={`/${locale}/login`}
                className="text-gold font-semibold hover:underline transition-colors"
              >
                {t("login")}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
