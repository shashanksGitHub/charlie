import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import adinkraSymbol from "../assets/Charley.png";

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Set a timeout to ensure the splash screen shows for at least 3 seconds
    const timer = setTimeout(() => {
      console.log("Splash screen animation complete, triggering callback");
      setIsComplete(true);
      // Call the callback to notify parent component
      onAnimationComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  // Animation for the logo (faster appearance)
  const logoVariants = {
    hidden: { scale: 0.5, opacity: 0.3, rotate: -90 },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  // Animation for the text (quicker appearance)
  const textVariants = {
    hidden: { opacity: 0.5, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.05,
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="h-screen w-full fixed top-0 left-0 z-50 flex flex-col items-center justify-center bg-white lg:bg-gradient-to-br lg:from-purple-50 lg:via-white lg:to-orange-50 relative overflow-hidden">
      {/* Desktop: Advanced background effects */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-purple-200/30 to-pink-200/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-orange-200/25 to-yellow-200/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-gradient-to-r from-blue-200/20 to-purple-200/25 blur-3xl animate-pulse delay-2000" />

        {/* Floating particles */}
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-300/40 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}

        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute top-20 left-20 w-32 h-32 border border-purple-300 rotate-45 animate-spin"
            style={{ animationDuration: "20s" }}
          />
          <div
            className="absolute bottom-20 right-20 w-24 h-24 border border-orange-300 rotate-12 animate-spin"
            style={{ animationDuration: "15s" }}
          />
          <div
            className="absolute top-1/2 left-20 w-40 h-40 border border-purple-200 -rotate-12 animate-spin"
            style={{ animationDuration: "25s" }}
          />
        </div>
      </div>

      <motion.div
        className="flex flex-col items-center justify-center relative z-10 lg:scale-125 xl:scale-150"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56"
          variants={logoVariants}
        >
          <img
            src={adinkraSymbol}
            alt="CHARLéY Logo"
            className="w-full h-full lg:drop-shadow-2xl"
            style={{
              filter: "drop-shadow(0 10px 30px rgba(147, 51, 234, 0.3))",
            }}
          />
        </motion.div>

        <motion.div
          className="mt-4 lg:mt-8 flex items-center"
          variants={textVariants}
        >
          <span
            className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold"
            style={{
              fontFamily: "'Arial Black', sans-serif",
              letterSpacing: "2px",
              background:
                "linear-gradient(45deg, #9333EA, #FB923C, #9333EA, #FB923C)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient-shift 3s ease-in-out infinite",
              textShadow:
                "0 0 40px rgba(147, 51, 234, 0.3), 0 0 80px rgba(251, 146, 60, 0.2)",
            }}
          >
            CHARLéY
          </span>
        </motion.div>

        <motion.div
          className="mt-2 lg:mt-6 text-gray-600 lg:text-gray-500 text-center text-base md:text-lg lg:text-xs xl:text-xs font-light lg:font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          }}
        >
          Connect. Engage. Elevate.
        </motion.div>

        {/* Desktop-only loading indicator */}
        <motion.div
          className="hidden lg:block mt-8 xl:mt-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
