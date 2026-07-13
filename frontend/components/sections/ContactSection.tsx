/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, Button } from "@/components/ui";

export default function ContactSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  return (
    <section id="contact" className="py-24 bg-gray-light">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4">
            {isArabic ? "تواصل" : "Contact"}{" "}
            <span className="text-gold">{isArabic ? "معنا" : "Us"}</span>
          </h2>
          <div className="w-20 h-1 bg-gold mx-auto rounded-full" />
          <p className="text-gray-500 mt-4">
            {isArabic
              ? "يسعدنا تواصلك معنا – نحن هنا لمساعدتك"
              : "We look forward to hearing from you – we're here to help"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <ContactCard
              icon={<Phone />}
              title={isArabic ? "الهاتف" : "Phone"}
              content="01009890386 - 01015313070"
            />
            <ContactCard
              icon={<Mail />}
              title={isArabic ? "البريد الإلكتروني" : "Email"}
              content="Alwatanya007@gmail.com"
            />
            <ContactCard
              icon={<MapPin />}
              title={isArabic ? "العنوان" : "Address"}
              content={
                isArabic ? "مدينة نصر، القاهرة، مصر" : "Nasr City, Cairo, Egypt"
              }
            />
          </motion.div>

          <motion.form
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder={isArabic ? "الاسم" : "Your Name"}
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition bg-white"
            />
            <input
              type="email"
              placeholder={isArabic ? "البريد الإلكتروني" : "Email Address"}
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition bg-white"
            />
            <textarea
              placeholder={isArabic ? "رسالتك" : "Your Message"}
              rows={4}
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition bg-white resize-none"
            />
            <Button
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              {isArabic ? "إرسال الرسالة" : "Send Message"}
              <Send size={18} />
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <Card hover className="flex items-center gap-4 p-5">
      <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-gold/10 rounded-full flex items-center justify-center text-gold">
        {icon}
      </div>
      <div>
        <p className="font-bold text-primary">{title}</p>
        <p className="text-gray-500">{content}</p>
      </div>
    </Card>
  );
}
