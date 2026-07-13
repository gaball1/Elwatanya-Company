/* eslint-disable */
"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
    >
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: 0 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary flex items-center justify-center">
          <Image
            src="/logo11.jpg"
            alt="Logo"
            width={60}
            height={60}
            className="rounded-xl"
          />
        </div>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-bold text-primary mt-6"
      >
        الوطنية للتنمية العمرانية
      </motion.h1>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="h-1 bg-gold rounded-full mt-4"
      />
    </motion.div>
  );
}
