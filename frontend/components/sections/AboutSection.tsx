/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { Building2, Users, Award, Target } from "lucide-react";

export default function AboutSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  return (
    <section
      id="about"
      className="py-24 bg-gradient-to-b from-white to-gray-50/50"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-gold/10 text-gold rounded-full text-sm font-medium mb-4">
            {isArabic ? "من نحن" : "About Us"}
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-primary">
            {isArabic ? "نحن نبني" : "We Build"}{" "}
            <span className="text-gold">
              {isArabic ? "المستقبل" : "The Future"}
            </span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
            {isArabic
              ? "شركة رائدة في مجال التنمية العمرانية والمقاولات، نقدم حلولاً متكاملة لإدارة المشاريع والمقاولين والمخازن."
              : "A leading company in urban development and contracting, providing integrated solutions."}
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* ✅ الصورة */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-gold/20 to-primary/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                <Image
                  src="logo11.jpg"
                  alt={isArabic ? "عن الشركة" : "About Company"}
                  width={200}
                  height={200}
                  className="w-full h-[200px] md:h-[300px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xl font-bold">
                    {isArabic ? "الوطنية للتنمية العمرانية" : "El Wataniya"}
                  </p>
                  <p className="text-sm opacity-90">
                    {isArabic
                      ? "شريكك في البناء والتطوير"
                      : "Your partner in construction & development"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ✅ المحتوى */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:w-1/2"
          >
            <h3 className="text-2xl font-bold text-primary mb-4">
              {isArabic ? "رؤيتنا" : "Our Vision"}
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              {isArabic
                ? "نطمح لأن نكون الخيار الأول في مجال التنمية العمرانية من خلال تقديم حلول مبتكرة تعتمد على التكنولوجيا الحديثة وأعلى معايير الجودة."
                : "We aspire to be the first choice in urban development by providing innovative solutions based on modern technology and the highest quality standards."}
            </p>

            {/* ✅ القيم */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <Award size={20} />
                </div>
                <div>
                  <p className="font-bold text-primary text-sm">الجودة</p>
                  <p className="text-xs text-gray-500">Quality</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-primary text-sm">الثقة</p>
                  <p className="text-xs text-gray-500">Trust</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <Target size={20} />
                </div>
                <div>
                  <p className="font-bold text-primary text-sm">الالتزام</p>
                  <p className="text-xs text-gray-500">Commitment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="font-bold text-primary text-sm">الابتكار</p>
                  <p className="text-xs text-gray-500">Innovation</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
