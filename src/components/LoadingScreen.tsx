// src/components/LoadingScreen.tsx
"use client";
import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
      >
        <img
            src="/T-school.png"
            alt="Logo"
            className="h-24"
        />
      </motion.div>
    </div>
  );
}