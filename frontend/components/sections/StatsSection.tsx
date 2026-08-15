"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Award, HardHat } from "lucide-react";
import { Card } from "@/components/ui";
import { useParams } from "next/navigation";

export default function StatsSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const stats = [
    {
      value: 20,
      label: isArabic ? "مشروع منفذ" : "Projects Completed",
      icon: <Building2 className="w-8 h-8" />,
    },
    {
      value: 50,
      label: isArabic ? "عميل موثوق" : "Trusted Clients",
      icon: <Users className="w-8 h-8" />,
    },
    {
      value: 10,
      label: isArabic ? "سنوات خبرة" : "Years Experience",
      icon: <Award className="w-8 h-8" />,
    },
    {
      value: 100,
      label: isArabic ? "موظف محترف" : "Professional Staff",
      icon: <HardHat className="w-8 h-8" />,
    },
  ];

  return (
    <section className="py-16 bg-gray-light">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              value={stat.value}
              label={stat.label}
              icon={stat.icon}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  icon,
  delay,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const timer = setInterval(() => {
      start += Math.ceil(value / 30);
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <Card hover className="p-6">
        <div className="text-gold mb-3 flex justify-center">{icon}</div>
        <div className="text-3xl md:text-4xl font-black text-primary">
          {count}+
        </div>
        <p className="text-gray-500 mt-1">{label}</p>
      </Card>
    </motion.div>
  );
}
