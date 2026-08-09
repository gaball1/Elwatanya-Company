/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useScrollTo } from "@/hooks/useScrollTo";
import LoadingScreen from "@/components/shared/LoadingScreen";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import ServicesSection from "@/components/sections/ServicesSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import AboutSection from "@/components/sections/AboutSection";
import ContactSection from "@/components/sections/ContactSection";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const scrollTo = useScrollTo();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar scrollTo={scrollTo} />
      <HeroSection scrollTo={scrollTo} />
      <StatsSection />
      <ServicesSection />
      <FeaturesSection />
      <ProjectsSection />
      <AboutSection />
      <ContactSection />
      <Footer scrollTo={scrollTo} />
    </div>
  );
}
