import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
  variant?: 'default' | 'attention';
}

export function NotificationBadge({ 
  count, 
  maxCount = 99,
  className,
  variant = 'default'
}: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  // Display count up to maxCount, then show maxCount+
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  // Enhanced styles for attention-grabbing badge
  const attentionStyles = variant === 'attention' ? {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 10 
      }
    },
    whileHover: { scale: 1.1 },
    // Subtle pulsing animation when count > 0
    ...(count > 0 ? {
      animate: {
        scale: [1, 1.15, 1],
        opacity: 1,
        transition: {
          repeat: Infinity,
          repeatType: "reverse" as const,
          duration: 1.5,
          ease: "easeInOut"
        }
      }
    } : {})
  } : {};
  
  return (
    <motion.span 
      className={cn(
        "absolute -top-1 -right-1 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1",
        variant === 'attention' 
          ? "bg-gradient-to-r from-pink-500 to-red-500 shadow-md shadow-pink-500/20" 
          : "bg-pink-500",
        className
      )}
      {...attentionStyles}
    >
      {displayCount}
    </motion.span>
  );
}