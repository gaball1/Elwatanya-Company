/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { MapPin, ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

export default function ProjectsSection() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const projectsData = isArabic
    ? [
        {
          title: "مشروع الأندلس السكني",
          location: "مدينة نصر، القاهرة",
          image:
            "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=600&h=400&fit=crop",
          description:
            "مجمع سكني متكامل يضم 5 عمارات سكنية بمساحة 5000 متر مربع",
          year: "2024",
        },
        {
          title: "برج النيل التجاري",
          location: "الشيخ زايد، الجيزة",
          image:
            "https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?w=600&h=400&fit=crop",
          description:
            "برج إداري وتجاري بارتفاع 15 دور، يضم مكاتب إدارية ومحلات تجارية",
          year: "2023",
        },
        {
          title: "منتجع البحر الذهبي",
          location: "الساحل الشمالي، مطروح",
          image:
            "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?w=600&h=400&fit=crop",
          description:
            "منتجع سياحي فاخر على البحر مباشرة، يضم 50 فيلا وشاليهات",
          year: "2024",
        },
      ]
    : [
        {
          title: "Al-Andalus Residential Project",
          location: "Nasr City, Cairo",
          image:
            "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=600&h=400&fit=crop",
          description:
            "Integrated residential complex comprising 5 residential buildings on 5000 sqm",
          year: "2024",
        },
        {
          title: "Nile Tower Commercial",
          location: "Sheikh Zayed, Giza",
          image:
            "https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?w=600&h=400&fit=crop",
          description:
            "15-floor administrative and commercial tower with offices and shops",
          year: "2023",
        },
        {
          title: "Golden Beach Resort",
          location: "North Coast, Matrouh",
          image:
            "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?w=600&h=400&fit=crop",
          description:
            "Luxury beachfront resort with 50 villas, chalets and pools",
          year: "2024",
        },
      ];

  return (
    <section id="projects" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-primary mb-4">
            {isArabic ? "مشاريع" : "Our"}
            <span className="text-gold">{isArabic ? "نا" : " Projects"}</span>
          </h2>
          <div className="w-20 h-1 bg-gold mx-auto rounded-full" />
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
            {isArabic
              ? "نقدم لكم نماذج من أعمالنا المميزة"
              : "Explore examples of our featured work"}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projectsData.map((project, index) => (
            <ProjectCard
              key={index}
              {...project}
              index={index}
              isArabic={isArabic}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({
  title,
  location,
  image,
  description,
  year,
  index,
  isArabic,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Card hover className="p-0 overflow-hidden h-full group">
        <div className="relative h-56 overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={500}
            height={300}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-4 right-4 bg-gold text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
            {year}
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gold" />
            <span className="text-gray-500 text-sm">{location}</span>
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
            {description}
          </p>
          <button className="mt-4 text-gold font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            {isArabic ? "عرض التفاصيل" : "View Details"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
