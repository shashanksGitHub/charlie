import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { MessageCircle, Sparkles, Heart, Brain } from "lucide-react";
import { useLocation } from "wouter";

interface FloatingKwameButtonProps {
  currentContext?: {
    page?: string;
    userProfile?: any;
  };
  className?: string;
  // Default starting position when first shown
  // - 'bottom-right' (current behavior)
  // - 'right-middle' (center vertically on the right edge)
  defaultPosition?: "bottom-right" | "right-middle";
}

export function FloatingKwameButton({
  currentContext,
  className = "",
  defaultPosition = "bottom-right",
}: FloatingKwameButtonProps) {
  const [, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [notifications, setNotifications] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const buttonRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Hide the pulse after initial mount
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Simulate random notifications (for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setNotifications((prev) => Math.min(prev + 1, 9));
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 2000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Initialize position based on provided defaultPosition
  useEffect(() => {
    const updateInitialPosition = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const buttonSize = 64; // 16 * 4 = 64px (w-16 h-16)
      const margin = 24; // 6 * 4 = 24px (bottom-6 right-6)

      const initialX = windowWidth - buttonSize - margin;
      const initialY =
        defaultPosition === "right-middle"
          ? Math.max(
              margin,
              Math.min(
                windowHeight / 2 - buttonSize / 2,
                windowHeight - buttonSize - margin,
              ),
            )
          : windowHeight - buttonSize - margin;

      setPosition({ x: initialX, y: initialY });
      x.set(initialX);
      y.set(initialY);
    };

    updateInitialPosition();
    window.addEventListener("resize", updateInitialPosition);
    return () => window.removeEventListener("resize", updateInitialPosition);
  }, [x, y, defaultPosition]);

  // Physics-based edge snapping
  const snapToEdge = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonSize = 64;
    const margin = 24;

    const currentX = x.get();
    const currentY = y.get();

    // Calculate center of button
    const centerX = currentX + buttonSize / 2;
    const centerY = currentY + buttonSize / 2;

    // Calculate distances to each edge
    const distanceToLeft = centerX;
    const distanceToRight = windowWidth - centerX;
    const distanceToTop = centerY;
    const distanceToBottom = windowHeight - centerY;

    // Find the closest edge
    const minDistance = Math.min(
      distanceToLeft,
      distanceToRight,
      distanceToTop,
      distanceToBottom,
    );

    let targetX = currentX;
    let targetY = currentY;

    if (minDistance === distanceToLeft) {
      // Snap to left edge
      targetX = margin;
    } else if (minDistance === distanceToRight) {
      // Snap to right edge
      targetX = windowWidth - buttonSize - margin;
    } else if (minDistance === distanceToTop) {
      // Snap to top edge
      targetY = margin;
    } else {
      // Snap to bottom edge
      targetY = windowHeight - buttonSize - margin;
    }

    // Ensure button stays within screen bounds
    targetX = Math.max(
      margin,
      Math.min(targetX, windowWidth - buttonSize - margin),
    );
    targetY = Math.max(
      margin,
      Math.min(targetY, windowHeight - buttonSize - margin),
    );

    // Animate to target position with spring physics
    animate(x, targetX, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 1,
    });
    animate(y, targetY, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 1,
    });

    setPosition({ x: targetX, y: targetY });
  };

  const handleClick = () => {
    // Only navigate if not dragging
    if (!isDragging) {
      setLocation("/kwame-chat");
      setNotifications(0); // Clear notifications when clicked
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
    setShowPulse(false); // Hide pulse during drag
  };

  const handleDragEnd = () => {
    // Small delay to distinguish between click and drag
    setTimeout(() => {
      setIsDragging(false);
      snapToEdge();
    }, 100);
  };

  return (
    <motion.div
      ref={buttonRef}
      className={`fixed z-50 ${className}`}
      style={{
        x,
        y,
        left: 0,
        top: 0,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      dragConstraints={{
        left: 24,
        right: typeof window !== "undefined" ? window.innerWidth - 64 - 24 : 0,
        top: 24,
        bottom:
          typeof window !== "undefined" ? window.innerHeight - 64 - 24 : 0,
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 60,
        cursor: "grabbing",
      }}
    >
      {/* Outer glow effect */}
      <AnimatePresence>
        {(showPulse || isHovered) && !isDragging && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 0.2, 0.6],
            }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: showPulse ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        )}
      </AnimatePresence>

      {/* Drag indicator when dragging */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-dashed border-white/50"
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={handleClick}
        onHoverStart={() => !isDragging && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group overflow-hidden ${
          isDragging ? "cursor-grabbing" : "cursor-grab hover:cursor-pointer"
        }`}
        whileHover={
          !isDragging
            ? {
                scale: 1.15,
                rotateY: 10,
                rotateX: -5,
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(147, 51, 234, 0.4)",
              }
            : {}
        }
        whileTap={
          !isDragging
            ? {
                scale: 0.95,
                rotateY: -5,
                rotateX: 5,
              }
            : {}
        }
        style={{
          borderRadius: "50%",
          boxShadow: isDragging
            ? "0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 30px rgba(147, 51, 234, 0.3)"
            : "0 15px 35px -5px rgba(0, 0, 0, 0.3), 0 5px 20px rgba(147, 51, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Avatar image container with proper clipping */}
        <div
          className="absolute inset-0 w-full h-full rounded-full overflow-hidden"
          style={{
            backgroundImage: "url(/kwame-ai-avatar.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            borderRadius: "50%",
          }}
        />

        {/* Inner ring for 3D depth */}
        <div
          className="absolute inset-1 rounded-full border border-white/30 shadow-inner"
          style={{ borderRadius: "50%" }}
        />

        {/* 3D gradient overlay */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/20"
          style={{ borderRadius: "50%" }}
        />

        {/* Glossy highlight for 3D effect */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-sm" />

        {/* Bottom shadow for depth */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black/20 rounded-full blur-md" />

        {/* Animated pulse ring when hovered */}
        <AnimatePresence>
          {isHovered && !isDragging && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.3, 1.5],
                opacity: [0.6, 0.3, 0],
              }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 rounded-full border-2 border-purple-400/60"
              style={{ borderRadius: "50%" }}
            />
          )}
        </AnimatePresence>

        {/* Rotating glow effect */}
        <motion.div
          animate={
            isHovered && !isDragging
              ? {
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }
              : { rotate: 0 }
          }
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 blur-sm"
          style={{ borderRadius: "50%" }}
        />

        {/* Shimmer effect */}
        <motion.div
          animate={
            !isDragging
              ? {
                  x: [-100, 100],
                  opacity: [0, 0.5, 0],
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 rounded-full overflow-hidden"
          style={{ borderRadius: "50%" }}
        />
      </motion.button>

      {/* Notification badge - REMOVED */}
      {/* 
        <AnimatePresence>
          {notifications > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white"
            >
              {notifications}
            </motion.div>
          )}
        </AnimatePresence>
        */}

      {/* Hover text - only show when not dragging */}
      <AnimatePresence>
        {isHovered && !isDragging && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-xl pointer-events-none"
          >
            {isDragging ? "Drag to move" : "Chat with KWAME AI"}
            <div className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Hook for managing KWAME button state
export function useKwameButton() {
  const [notifications, setNotifications] = useState(0);

  const addNotification = () => {
    setNotifications((prev) => Math.min(prev + 1, 9));
  };

  const clearNotifications = () => {
    setNotifications(0);
  };

  return {
    notifications,
    addNotification,
    clearNotifications,
  };
}
