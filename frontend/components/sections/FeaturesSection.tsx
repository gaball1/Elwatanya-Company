/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle,
  TrendingUp,
  Zap,
  FileText,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui";
import { useParams } from "next/navigation";

export default function FeaturesSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const features = isArabic
    ? [
        {
          icon: <Shield size={20} />,
          title: "صلاحيات متعددة",
          description: "مدير، مكتب فني، مهندس موقع، محاسب",
        },
        {
          icon: <CheckCircle size={20} />,
          title: "سهولة الاستخدام",
          description: "واجهة بسيطة ومنظمة",
        },
        {
          icon: <TrendingUp size={20} />,
          title: "تقارير وتحليلات",
          description: "رسوم بيانية لمتابعة الأداء",
        },
        {
          icon: <Zap size={20} />,
          title: "سرعة فائقة",
          description: "أداء عالي وتحميل سريع",
        },
        {
          icon: <FileText size={20} />,
          title: "مستخلصات أسبوعية",
          description: "حساب تلقائي للمصنعية",
        },
        {
          icon: <Clock size={20} />,
          title: "حضور وانصراف",
          description: "تسجيل الحضور وحساب المرتبات",
        },
      ]
    : [
        {
          icon: <Shield size={20} />,
          title: "Multiple Permissions",
          description: "Manager, Technical Office, Site Engineer, Accountant",
        },
        {
          icon: <CheckCircle size={20} />,
          title: "Easy to Use",
          description: "Simple and organized interface",
        },
        {
          icon: <TrendingUp size={20} />,
          title: "Reports & Analytics",
          description: "Charts for performance tracking",
        },
        {
          icon: <Zap size={20} />,
          title: "High Speed",
          description: "High performance and fast loading",
        },
        {
          icon: <FileText size={20} />,
          title: "Weekly Invoices",
          description: "Automatic calculation of workmanship",
        },
        {
          icon: <Clock size={20} />,
          title: "Attendance",
          description: "Attendance recording and salary calculation",
        },
      ];

  return (
    <section id="features" className="py-24 bg-gray-light">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4">
            {isArabic ? "مميزات" : "Features"}{" "}
            <span className="text-gold">
              {isArabic ? "النظام" : "of the System"}
            </span>
          </h2>
          <div className="w-20 h-1 bg-gold mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4 p-5 bg-surface rounded-xl shadow-md hover:shadow-lg transition"
            >
              <div className="text-gold mt-1">{feature.icon}</div>
              <div>
                <h4 className="font-bold text-primary mb-1">{feature.title}</h4>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
