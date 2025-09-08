import React from "react";
import KwameChatTab from "@/components/kwame/kwame-chat-tab";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function KwameChatPage() {
  const [location] = useLocation();
  // Wouter's useLocation returns pathname only; parse the real query string from window
  const openBig5 =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("open") ===
      "big5_assessment";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-screen"
    >
      <KwameChatTab openBig5OnLoad={openBig5} />
    </motion.div>
  );
}
