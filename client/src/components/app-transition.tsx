import { AppMode } from "@/hooks/use-app-mode";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Flame,
  Briefcase,
  HandshakeIcon,
  Sparkles,
  Users,
  Star,
  Building,
} from "lucide-react";
import adinkraSymbol from "../assets/charley-logo.svg";
import { useLanguage } from "@/hooks/use-language";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: Date | string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

interface AppTransitionProps {
  appMode: AppMode;
  onTransitionComplete: () => void;
}

export function AppTransition({
  appMode,
  onTransitionComplete,
}: AppTransitionProps) {
  const [isExiting, setIsExiting] = useState(false);
  const { translate: t } = useLanguage();
  const { user } = useAuth();

  // Calculate user age for age-appropriate content
  const userAge = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  const isUnder18 = userAge !== null && userAge < 18;

  // Debug logging for age-appropriate content
  if (appMode === "MEET") {
    console.log(`[APP-TRANSITION] User age: ${userAge}, Under 18: ${isUnder18}`);
    console.log(`[APP-TRANSITION] MEET description will be: ${isUnder18 ? "Connect with young people who share your heritage and values" : t("app.meetSplashDescription")}`);
  }

  useEffect(() => {
    // Preload data for MEET app during transition to avoid "No More Matches" flash
    if (appMode === "MEET" && user) {
      console.log("[APP-TRANSITION] Preloading discover users for MEET app...");

      // Prefetch discover users data during the transition
      queryClient
        .prefetchQuery({
          queryKey: ["/api/discover-users"],
          staleTime: 30000, // Consider data fresh for 30 seconds
        })
        .then(() => {
          console.log("[APP-TRANSITION] Discover users preloaded successfully");
        })
        .catch((error) => {
          console.warn(
            "[APP-TRANSITION] Failed to preload discover users:",
            error,
          );
        });
    }

    // First phase: show content for 6.5 seconds
    const contentTimer = setTimeout(() => {
      // Start exit animation
      setIsExiting(true);
    }, 6500);

    // Second phase: allow 0.5 second for exit animation, then complete
    const exitTimer = setTimeout(() => {
      onTransitionComplete();
    }, 7000); // Transition extended to 7 seconds total

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(exitTimer);
    };
  }, [onTransitionComplete, appMode, user]);

  // App mode specific settings
  let backgroundGradient = "";
  let iconBackgroundClass = "";
  let mainColor = "";
  let secondaryColor = "";

  // Set colors and gradients based on app mode
  switch (appMode) {
    case "MEET":
      backgroundGradient =
        "linear-gradient(to bottom, #7e22ce, #9333EA 40%, #fb923c 80%, white 120%)";
      iconBackgroundClass = "from-purple-600 to-pink-500";
      mainColor = "#7e22ce";
      secondaryColor = "#fb923c";
      break;
    case "HEAT":
      backgroundGradient =
        "linear-gradient(to bottom, #f59e0b, #fb923c 40%, #facc15 80%, white 120%)";
      iconBackgroundClass = "from-orange-500 to-yellow-300";
      mainColor = "#f59e0b";
      secondaryColor = "#facc15";
      break;
    case "SUITE":
      backgroundGradient =
        "linear-gradient(to bottom, #3b82f6, #6366f1 40%, #a855f7 80%, white 120%)";
      iconBackgroundClass = "from-blue-600 to-indigo-500";
      mainColor = "#3b82f6";
      secondaryColor = "#6366f1";
      break;
  }

  // Determine which icon to show based on app mode
  const AppIcon = () => {
    switch (appMode) {
      case "MEET":
        return <Heart className="h-12 w-12 text-white" fill="white" />;
      case "HEAT":
        return (
          <Flame
            className="h-12 w-12 text-white"
            fill="rgba(255,255,255,0.3)"
          />
        );
      case "SUITE":
        return <Briefcase className="h-12 w-12 text-white" />;
      default:
        return null;
    }
  };

  // App mode name
  const appModeName =
    appMode === "MEET"
      ? t("appMode.meet")
      : appMode === "HEAT"
        ? t("appMode.heat")
        : t("appMode.suite");

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 perspective-1000 overflow-hidden"
      style={{
        background: backgroundGradient,
        perspective: "1000px",
      }}
      animate={{
        opacity: isExiting ? 0 : 1,
      }}
      transition={{
        opacity: { duration: 0.3, ease: "easeInOut" },
      }}
    >
      {/* Floating app icons in background */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`floating-icon-${i}`}
          className="absolute text-white/10"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            transform: `scale(${0.5 + Math.random() * 1.5})`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.1 + Math.random() * 0.1,
            rotate: Math.random() > 0.5 ? 360 : -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            opacity: { duration: 0.5, delay: Math.random() * 0.5 },
            rotate: {
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            },
            scale: {
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            },
          }}
        >
          {i % 8 === 0 ? (
            <Heart size={36} />
          ) : i % 8 === 1 ? (
            <Sparkles size={32} />
          ) : i % 8 === 2 ? (
            <Users size={28} />
          ) : i % 8 === 3 ? (
            <Briefcase size={30} />
          ) : i % 8 === 4 ? (
            <HandshakeIcon size={30} />
          ) : i % 8 === 5 ? (
            <Star size={28} />
          ) : i % 8 === 6 ? (
            <Building size={30} />
          ) : (
            <Flame size={30} />
          )}
        </motion.div>
      ))}
      {/* CHARLéY logo and title */}
      <motion.div
        className="flex flex-col items-center justify-center mb-12"
        initial={{ opacity: 1, scale: 1, y: 0 }}
        animate={{
          opacity: 0,
          scale: 0.8,
          y: -50,
          rotateX: 20,
        }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <img
          src={adinkraSymbol}
          alt={`${t("common.app")} ${t("common.logo")}`}
          className="w-24 h-24 mb-4"
          style={{
            filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))",
          }}
        />
        <div className="app-title overflow-hidden">
          {"CHARLéY".split("").map((letter, i) => (
            <span
              key={i}
              className="font-bold text-5xl md:text-6xl inline-block"
              style={{
                fontFamily: "'Arial Black', sans-serif",
                letterSpacing: "-2px",
                textShadow: "3px 3px 6px rgba(0,0,0,0.3)",
                background: "linear-gradient(to bottom, #ffffff, #fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      </motion.div>

      {/* App icon with 3D rotation effect */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, rotateY: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{
          delay: 0.1,
          duration: 0.5,
          type: "spring",
          stiffness: 80,
          damping: 15,
        }}
      >
        <div className="relative flex flex-col items-center justify-center">
          {/* Animated particles surrounding the icon */}
          {appMode === "MEET" &&
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute rounded-full bg-pink-400"
                style={{
                  width: 6 + Math.random() * 8,
                  height: 6 + Math.random() * 8,
                  top: `${30 + Math.random() * 60}%`,
                  left: `${30 + Math.random() * 60}%`,
                  filter: "blur(1px)",
                  opacity: 0.6 + Math.random() * 0.4,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 0.9, 0.6],
                  x: [0, Math.random() * 40 - 20, 0],
                  y: [0, Math.random() * 40 - 20, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  ease: "easeInOut",
                }}
              />
            ))}

          {appMode === "HEAT" &&
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`flame-${i}`}
                className="absolute rounded-full bg-yellow-400"
                style={{
                  width: 4 + Math.random() * 8,
                  height: 4 + Math.random() * 8,
                  top: `${30 + Math.random() * 60}%`,
                  left: `${30 + Math.random() * 60}%`,
                  filter: "blur(1px)",
                  opacity: 0.6 + Math.random() * 0.4,
                }}
                animate={{
                  y: [0, -30 - Math.random() * 30, 0],
                  opacity: [0.7, 0.3, 0.7],
                  scale: [1, 0.5, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2 + Math.random() * 1.5,
                  delay: Math.random() * 1,
                  ease: "easeInOut",
                }}
              />
            ))}

          {appMode === "SUITE" &&
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`connection-${i}`}
                className="absolute"
                style={{
                  width: 3,
                  height: 40 + Math.random() * 20,
                  top: `${30 + Math.random() * 40}%`,
                  left: `${40 + Math.random() * 40}%`,
                  transformOrigin: "center",
                  background:
                    "linear-gradient(to bottom, rgba(59,130,246,0), rgba(59,130,246,0.6), rgba(59,130,246,0))",
                  opacity: 0.5 + Math.random() * 0.5,
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                }}
                transition={{
                  repeat: Infinity,
                  duration: 8 + Math.random() * 8,
                  ease: "linear",
                }}
              />
            ))}

          {/* Rotating circle with app icon - slightly smaller on mobile for better layout */}
          <motion.div
            className={`relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br ${iconBackgroundClass} rounded-full overflow-hidden shadow-2xl transform-gpu`}
            animate={{
              scale: [1, 1.1, 1],
              rotate: 360,
            }}
            transition={{
              scale: {
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2,
                ease: "easeInOut",
              },
              rotate: {
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <motion.div
              animate={{
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <AppIcon />
            </motion.div>
          </motion.div>

          {/* App name with 3D effect - positioned for optimal mobile visibility */}
          <motion.div
            className="mt-10 text-center w-[300px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <h2
              className="text-4xl font-black"
              style={{
                background: `linear-gradient(to bottom, #ffffff, ${secondaryColor})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              {appModeName}
            </h2>
            <motion.div
              className="h-1 w-0 mt-1 mx-auto rounded-full"
              style={{ backgroundColor: mainColor }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.3, duration: 0.4 }}
            />

            {/* App description - larger and more visible text */}
            <motion.p
              className="text-white text-base mt-4 mx-auto max-w-[280px] text-center font-medium drop-shadow-lg opacity-90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {appMode === "MEET"
                ? isUnder18 
                  ? "Connect with young people who share your heritage and values"
                  : t("app.meetSplashDescription")
                : appMode === "HEAT"
                  ? t("app.heatSplashDescription")
                  : t("app.suiteSplashDescription")}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
