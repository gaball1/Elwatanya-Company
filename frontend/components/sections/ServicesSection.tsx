"use client";

import { motion } from "framer-motion";
import { Building2, Users, Package } from "lucide-react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

export default function ServicesSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const services = isArabic
    ? [
        {
          icon: <Building2 size={28} />,
          title: "إدارة المشاريع",
          description: "تتبع المشاريع والمباني والمقايسات والبنود بدقة",
        },
        {
          icon: <Users size={28} />,
          title: "المقاولين الباطن",
          description: "إدارة المستخلصات والمصنعيات والخصومات",
        },
        {
          icon: <Package size={28} />,
          title: "المخازن والمشتريات",
          description: "نظام متكامل لإدارة العهد والمخازن",
        },
      ]
    : [
        {
          icon: <Building2 size={28} />,
          title: "Project Management",
          description:
            "Track projects, buildings, estimates and items accurately",
        },
        {
          icon: <Users size={28} />,
          title: "Subcontractors",
          description: "Manage invoices, workmanship and discounts",
        },
        {
          icon: <Package size={28} />,
          title: "Warehouses & Purchases",
          description: "Integrated system for managing custody and warehouses",
        },
      ];

  return (
    <section id="services" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4">
            {isArabic ? "خدماتنا" : "Our Services"}{" "}
            <span className="text-gold">
              {isArabic ? "المتكاملة" : "Integrated"}
            </span>
          </h2>
          <div className="w-20 h-1 bg-gold mx-auto rounded-full" />
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            {isArabic
              ? "نقدم حلولاً تقنية متطورة لقطاع المقاولات"
              : "We provide advanced technology solutions for the construction sector"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <Card hover className="p-8 text-center h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition">
                  <div className="text-primary text-3xl">{service.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-500">{service.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
