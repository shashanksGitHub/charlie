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
    <div className="h-screen w-full fixed top-0 left-0 z-50 flex flex-col items-center justify-center bg-white relative overflow-hidden">
      <motion.div
        className="flex flex-col items-center justify-center relative z-10"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="w-32 h-32 md:w-40 md:h-40"
          variants={logoVariants}
        >
          <img
            src={adinkraSymbol}
            alt="CHARLéY Logo"
            className="w-full h-full"
          />
        </motion.div>

        <motion.div className="mt-4 flex items-center" variants={textVariants}>
          <span
            className="text-5xl md:text-7xl font-bold"
            style={{
              fontFamily: "'Arial Black', sans-serif",
              letterSpacing: "2px",
              background: "linear-gradient(to right, #9333EA, #FB923C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CHARLéY
          </span>
        </motion.div>

        <motion.div
          className="mt-2 text-gray-600 text-center text-base md:text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          Connect. Engage. Elevate.
        </motion.div>
      </motion.div>
    </div>
  );
}
