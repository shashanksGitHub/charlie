import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { countriesData } from "./countries-data";
import { t } from "@/hooks/use-language";
import { stopWelcomeAudio } from "@/lib/ambient-audio";

interface NationalitySplashProps {
  country: string;
  onComplete: () => void;
}

// Function to get the correct country flag URL using proper ISO country codes
const getCountryFlagUrl = (countryName: string): string => {
  // Find the country in the countriesData array
  const countryData = countriesData.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase(),
  );

  // If found, return the flag URL, otherwise return a default flag
  if (countryData) {
    return countryData.flag;
  }

  // Special case mappings for countries that might have different names
  const specialCases: Record<string, string> = {
    USA: "https://flagcdn.com/us.svg",
    "United States": "https://flagcdn.com/us.svg",
    UK: "https://flagcdn.com/gb.svg",
    "United Kingdom": "https://flagcdn.com/gb.svg",
    Russia: "https://flagcdn.com/ru.svg",
    "South Korea": "https://flagcdn.com/kr.svg",
    "North Korea": "https://flagcdn.com/kp.svg",
  };

  return specialCases[countryName] || "https://flagcdn.com/gb.svg";
};

export default function NationalitySplash({
  country,
  onComplete,
}: NationalitySplashProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(
    t("nationality.loadingMessages.initializingConnection"),
  );
  const [showFinalMessage, setShowFinalMessage] = useState(false);

  // Array of loading messages to cycle through
  const loadingMessages = [
    t("nationality.loadingMessages.initializingConnection"),
    t("nationality.loadingMessages.applyingCulturalPreferences"),
    t("nationality.loadingMessages.customizingMatches"),
    t("nationality.loadingMessages.configuringRegionalSettings"),
    t("nationality.loadingMessages.optimizingLanguageCompatibility"),
    t("nationality.loadingMessages.preparingLocalRecommendations"),
    t("nationality.loadingMessages.syncingGlobalNetwork"),
    t("nationality.loadingMessages.finalizingProfileSetup"),
  ];

  useEffect(() => {
    // Simulate loading process with progressive updates
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        // Calculate the new progress
        const newProgress = prevProgress + (Math.random() * 2 + 0.5);

        // Update loading message based on progress
        const messageIndex = Math.floor(
          (newProgress / 100) * loadingMessages.length,
        );
        if (messageIndex < loadingMessages.length) {
          setLoadingText(loadingMessages[messageIndex]);
        }

        // Check if loading is complete
        if (newProgress >= 100) {
          clearInterval(timer);
          setShowFinalMessage(true);

          // Navigate to auth page after showing final message
          // Increased delay for better animation timing + gives user time to see success message

          // First timeout: show success message fully before starting transition
          setTimeout(() => {
            // Trigger a graceful fade-out before calling onComplete
            const rootElement = document.getElementById(
              "nationality-splash-root",
            );
            if (rootElement) {
              // Add a CSS class for fade-out transition
              rootElement.classList.add("fade-out-transition");

              // Preload the next screen in the background while animation is happening
              // This helps prevent any potential white flash
              const preloadNextScreen = new Image();
              preloadNextScreen.src = "/assets/bg-pattern-light.png"; // Common bg image

              // Call onComplete after animation completes with improved timing to match CSS
              setTimeout(async () => {
                try {
                  await stopWelcomeAudio();
                } catch (audioStopError) {
                  console.warn(
                    "[AUDIO] Failed to stop welcome audio:",
                    audioStopError,
                  );
                }
                // Enable smooth body transitions for page to page flow
                document.body.classList.add("page-transition");
                onComplete();
              }, 1200); // Match the enhanced CSS transition duration
            } else {
              // Fallback if element not found
              (async () => {
                try {
                  await stopWelcomeAudio();
                } catch {}
                onComplete();
              })();
            }
          }, 2000); // Slightly shorter delay for a more responsive feel

          return 100;
        }

        return newProgress;
      });
    }, 120); // Slower progress for more dramatic effect

    return () => {
      clearInterval(timer);
      // Ensure audio stops if user navigates away before completion
      (async () => {
        try {
          await stopWelcomeAudio();
        } catch {}
      })();
    };
  }, [onComplete, loadingMessages]);

  // This function is no longer needed as we now use getCountryFlagUrl
  // but we're keeping it for backward compatibility
  const getCountryFlag = () => {
    return getCountryFlagUrl(country);
  };

  // Get appropriate greeting based on country
  const getGreeting = () => {
    const greetings: { [key: string]: string } = {
      Ghana: "Akwaaba",
      Nigeria: "Ẹ n lẹ",
      Kenya: "Karibu",
      Japan: "ようこそ",
      France: "Bienvenue",
      Germany: "Willkommen",
      Italy: "Benvenuto",
      Spain: "Bienvenido",
      China: "欢迎",
      Russia: "Добро пожаловать",
      Brazil: "Bem-vindo",
      India: "स्वागत है",
      "United States": "Welcome",
    };

    return greetings[country] || t("nationality.welcome");
  };

  return (
    <div
      id="nationality-splash-root"
      className="min-h-screen w-full bg-gradient-to-br from-black via-blue-950 to-indigo-950 flex flex-col items-center justify-center text-white overflow-hidden transition-opacity duration-800 ease-in-out"
    >
      {/* Dynamic subtle background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute w-full h-full opacity-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z"
            fill="url(#gradient1)"
            initial={{ y: 20 }}
            animate={{
              y: [20, 25, 20],
              d: [
                "M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z",
                "M0,50 Q25,70 50,50 Q75,30 100,50 L100,100 L0,100 Z",
                "M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z",
              ],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg px-8"
      >
        <AnimatePresence mode="wait">
          {showFinalMessage ? (
            <motion.div
              key="final-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <motion.svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <motion.path
                      d="M5 13L9 17L19 7"
                      stroke="#4ade80"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </motion.svg>
                </motion.div>
              </div>
              <h1 className="text-4xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                {getGreeting()}!
              </h1>
              <p className="text-lg text-blue-200">
                {t("nationality.journeyBeginsNow", { appName: "CHARLéY" })}
              </p>
            </motion.div>
          ) : (
            <motion.div key="loading" exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-10">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="mb-3 flex items-center justify-center gap-3">
                    <img
                      src={getCountryFlagUrl(country)}
                      alt={`${country} flag`}
                      className="w-10 h-10 rounded-full shadow-glow object-cover"
                      onError={(e) => {
                        // Fallback if specific country code doesn't match
                        (e.target as HTMLImageElement).src =
                          "https://flagcdn.com/gb.svg";
                      }}
                    />
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {country === "ANYWHERE"
                        ? t("nationality.anywhere")
                        : country}
                    </h1>
                  </div>
                  <p className="text-lg text-blue-200 opacity-90">
                    {t("nationality.setupPersonalizedExperience")}
                  </p>
                </motion.div>
              </div>

              {/* Futuristic progress bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <div className="relative h-3 bg-gray-800/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/10">
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                      className="w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ opacity: 0.5 }}
                    />
                  </div>

                  {/* Actual progress bar */}
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                  />

                  {/* Glowing progress indicator */}
                  <motion.div
                    className="absolute top-0 bottom-0 w-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                    style={{
                      left: `calc(${progress}% - 8px)`,
                      display: progress > 2 ? "block" : "none",
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2 text-sm">
                  <motion.span
                    className="text-blue-300"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {loadingText}...
                  </motion.span>
                  <span className="text-blue-300 font-mono">
                    {Math.floor(progress)}%
                  </span>
                </div>
              </motion.div>

              {/* Futuristic animated loader */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center items-center"
              >
                <div className="relative w-32 h-32">
                  {/* Outer spinning ring */}
                  <motion.div
                    animate={{
                      rotate: 360,
                      borderRadius: ["30%", "40%", "50%", "40%", "30%"],
                    }}
                    transition={{
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      borderRadius: {
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                    className="absolute top-0 left-0 w-full h-full border-4 border-l-blue-400 border-r-purple-500 border-t-transparent border-b-pink-400"
                    style={{
                      borderRadius: "30%",
                      boxShadow: "0 0 20px rgba(79, 70, 229, 0.3)",
                    }}
                  />

                  {/* Middle rotating element */}
                  <motion.div
                    animate={{
                      rotate: -180,
                      scale: [1, 0.9, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                      scale: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                    className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed border-indigo-400 rounded-full"
                    style={{
                      boxShadow: "inset 0 0 15px rgba(99, 102, 241, 0.4)",
                    }}
                  />

                  {/* Country icon in center */}
                  <motion.div
                    animate={{
                      opacity: [0.8, 1, 0.8],
                      scale: [0.9, 1.05, 0.9],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute top-8 left-8 right-8 bottom-8 bg-gradient-to-br from-blue-600/90 to-indigo-600/90 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <img
                      src={getCountryFlagUrl(country)}
                      alt={`${country} flag`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                      onError={(e) => {
                        // Fallback if specific country code doesn't match
                        (e.target as HTMLImageElement).src =
                          "https://flagcdn.com/gb.svg";
                      }}
                    />
                  </motion.div>

                  {/* Data stream particles */}
                  <div className="absolute inset-0">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{
                          x: "50%",
                          y: "50%",
                          scale: 0,
                        }}
                        animate={{
                          x: `${50 + 45 * Math.cos((i * Math.PI) / 4)}%`,
                          y: `${50 + 45 * Math.sin((i * Math.PI) / 4)}%`,
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.25,
                          ease: "easeInOut",
                        }}
                        className="absolute w-2 h-2 rounded-full bg-blue-400"
                        style={{ transform: "translate(-50%, -50%)" }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* HUD-like interface elements */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        {/* Futuristic grid lines */}
        <div className="absolute inset-0">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          ></div>

          {/* Corner elements - top left */}
          <motion.div
            className="absolute top-3 left-3 w-20 h-20 border-t-2 border-l-2 border-blue-400/30"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Corner elements - bottom right */}
          <motion.div
            className="absolute bottom-3 right-3 w-20 h-20 border-b-2 border-r-2 border-blue-400/30"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </div>

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: Math.random() * 0.3 + 0.1,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              x: [null, Math.random() * 100 + "%", Math.random() * 100 + "%"],
              y: [null, Math.random() * 100 + "%", Math.random() * 100 + "%"],
              opacity: [
                null,
                Math.random() * 0.3 + 0.1,
                Math.random() * 0.3 + 0.1,
              ],
            }}
            transition={{
              duration: 15 + Math.random() * 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute w-2 h-2 rounded-full bg-blue-400"
            style={{ filter: "blur(1px)" }}
          />
        ))}
      </motion.div>
    </div>
  );
}
