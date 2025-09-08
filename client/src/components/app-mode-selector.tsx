import { useState, useEffect } from "react";
import { useAppMode, AppMode } from "@/hooks/use-app-mode";
import { useLocation } from "wouter";
import { Heart, Flame, Briefcase, ArrowRight, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { safeStorageGet, safeStorageSet } from "@/lib/storage-utils";
import { useAuth } from "@/hooks/use-auth";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

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

interface AppModeSelectorProps {
  onSelect: () => void;
}

export function AppModeSelector({ onSelect }: AppModeSelectorProps) {
  const { setAppMode, startTransition } = useAppMode();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<"MEET" | "HEAT" | "SUITE" | null>(
    null,
  );
  const [showAnimation, setShowAnimation] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const { translate } = useLanguage();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();

  // Check if MEET profile is activated
  const isMeetActivated = user?.hasActivatedProfile || false;

  // Check if any SUITE sections are activated
  const { data: suiteProfileSettings } = useQuery({
    queryKey: ["/api/suite/profile-settings"],
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const isSuiteActivated = suiteProfileSettings ? 
    ((suiteProfileSettings as any).jobProfileActive || 
     (suiteProfileSettings as any).mentorshipProfileActive || 
     (suiteProfileSettings as any).networkingProfileActive) : false;

  // Debug translations
  const userAge = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  console.log(`[APP-MODE-SELECTOR] User age: ${userAge}, Under 18: ${userAge && userAge < 18}`);
  console.log(`[APP-MODE-SELECTOR] Friendship app text: "${translate("appMode.friendshipApp")}"`);
  console.log(`[APP-MODE-SELECTOR] Dating app text: "${translate("appMode.datingApp")}"`);
  console.log(`[APP-MODE-SELECTOR] Friendship description: "${translate("appMode.meetFriendshipDescription")}"`);
  console.log(`[APP-MODE-SELECTOR] Dating description: "${translate("appMode.meetLongDescription")}"`);

  // Entrance animation effect
  useEffect(() => {
    // Auto-hide entrance animation after 1.2 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Storage utilities are now imported from @/lib/storage-utils

  const handleSelect = async (mode: "MEET" | "HEAT" | "SUITE") => {
    setSelected(mode);
    setAppMode(mode);

    // Early preload for MEET app to reduce loading time
    if (mode === "MEET" && user) {
      console.log("[APP-SELECTOR] Early preloading discover users for MEET...");
      queryClient
        .prefetchQuery({
          queryKey: ["/api/discover-users"],
          staleTime: 30000,
        })
        .catch((error) => {
          console.warn("[APP-SELECTOR] Early preload failed:", error);
        });
    }

    // Save last_used_app in DB if user is logged in
    if (user && user.id) {
      try {
        await import("@/lib/queryClient").then(async ({ apiRequest }) => {
          await apiRequest(`/api/profile/${user.id}`, {
            method: "PATCH",
            data: { lastUsedApp: mode },
          });
        });
      } catch (e) {
        // Optionally log error, but do not block UI
        console.error("Failed to update last_used_app in DB", e);
      }
    }
  };

  const handleContinue = () => {
    if (!selected || navigating) return;
    setNavigating(true);
    // If any app is selected and nationality selection is enabled, show nationality selection first
    const showNationalitySelection = user?.showNationalitySelection;
    if (showNationalitySelection) {
      // Set flag to indicate we're coming from app selection
      try {
        sessionStorage.setItem("fromAppSelection", "true");
        console.log(
          "[APP-SELECTION] Setting fromAppSelection flag for nationality flow",
        );
      } catch (error) {
        console.warn("[STORAGE] Failed to set fromAppSelection flag:", error);
      }
      setTimeout(() => {
        setLocation("/nationality");
      }, 1000);
      onSelect();
      startTransition(selected);
      return;
    }
    // Default: go to the selected app
    let targetUrl = "/";
    switch (selected) {
      case "MEET":
        targetUrl = "/";
        break;
      case "HEAT":
        targetUrl = "/heat";
        break;
      case "SUITE":
        targetUrl = "/suite";
        break;
    }
    onSelect();
    startTransition(selected);
    setTimeout(() => {
      setLocation(targetUrl);
    }, 1000);
  };

  // App mode option variants
  const optionVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: i * 0.15 + 0.1, // Add a small base delay
        duration: 0.6,
        type: "spring",
        stiffness: 120,
        damping: 10,
        bounce: 0.6,
      },
    }),
  };

  // Title variants
  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1,
        duration: 0.5,
      },
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-col items-center justify-center p-6 min-h-[90vh] app-mode-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Section title */}
        <motion.h2
          className="text-2xl md:text-3xl font-bold mb-8 text-center"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-orange-500 to-yellow-500">
            {translate("appMode.chooseYourAppMode")}
          </span>
        </motion.h2>

        <div className="grid grid-cols-1 gap-5 w-full max-w-md">
          {/* MEET Option */}
          <motion.div
            className={`relative overflow-hidden p-4 rounded-xl border min-h-[100px] ${
              selected === "MEET"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400"
                : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600"
            } shadow-xl cursor-pointer transition-all duration-300 transform-gpu hover:z-10`}
            style={{
              boxShadow:
                selected === "MEET"
                  ? "0 10px 25px -5px rgba(168, 85, 247, 0.5), 0 8px 10px -6px rgba(168, 85, 247, 0.2)"
                  : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 20px 25px -5px rgba(168, 85, 247, 0.4), 0 10px 10px -5px rgba(168, 85, 247, 0.2)",
              y: -8,
              rotateZ: [0, -1, 1, 0],
              transition: {
                rotateZ: {
                  repeat: 0,
                  duration: 0.5,
                  ease: "easeInOut",
                },
              },
            }}
            whileTap={{ scale: 0.96, y: 0, rotateZ: 0 }}
            onClick={() => handleSelect("MEET")}
            initial="hidden"
            variants={optionVariants}
            animate={
              selected === "MEET"
                ? {
                    ...optionVariants.visible(0),
                    scale: [1, 1.08, 1.04],
                    borderWidth: 2,
                    y: -8,
                    rotate: [0, -1, 1, -1, 0],
                    transition: {
                      duration: 0.6,
                      scale: {
                        times: [0, 0.5, 1],
                        duration: 0.7,
                      },
                      rotate: {
                        times: [0, 0.25, 0.5, 0.75, 1],
                        duration: 0.8,
                        ease: "easeInOut",
                      },
                      type: "spring",
                      stiffness: 150,
                      damping: 10,
                    },
                  }
                : "visible" // Use the variant name when not selected
            }
            custom={0}
          >
            {/* Purple shimmer effect */}
            {selected === "MEET" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-300/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                  repeatDelay: 0.5,
                }}
              />
            )}

            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full overflow-hidden shadow-lg transform-gpu"
                  animate={
                    selected === "MEET"
                      ? {
                          scale: [1, 1.1, 1],
                          transition: {
                            repeat: Infinity,
                            repeatType: "reverse",
                            duration: 1.5,
                            ease: "easeInOut",
                          },
                        }
                      : {}
                  }
                >
                  <motion.div
                    animate={
                      selected === "MEET"
                        ? {
                            rotate: 360,
                            transition: {
                              duration: 20,
                              repeat: Infinity,
                              ease: "linear",
                            },
                          }
                        : {}
                    }
                  >
                    <Heart className="h-7 w-7 text-white" fill="white" />
                  </motion.div>
                </motion.div>
                
                {/* Active Badge for MEET */}
                {isMeetActivated && (
                  <motion.div
                    className="absolute top-2 right-3 flex items-center gap-1 bg-gradient-to-r from-green-400 to-green-600 text-white text-xs px-2 py-0.5 rounded-full shadow-xl ring-2 ring-green-300 ring-opacity-50 z-10"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <CheckCircle className="h-2.5 w-2.5" />
                    <span className="font-semibold text-xs">Active</span>
                  </motion.div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translate("appMode.meet")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {user && user.dateOfBirth && calculateAge(user.dateOfBirth) < 18 
                    ? translate("appMode.friendshipApp") 
                    : translate("appMode.datingApp")
                  }
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">
                  {user && user.dateOfBirth && calculateAge(user.dateOfBirth) < 18 
                    ? translate("appMode.meetFriendshipDescription") 
                    : translate("appMode.meetLongDescription")
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* HEAT Option */}
          <motion.div
            className={`relative overflow-hidden p-4 rounded-xl border min-h-[100px] ${
              selected === "HEAT"
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400"
                : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600"
            } shadow-xl cursor-pointer transition-all duration-300 transform-gpu hover:z-10`}
            style={{
              boxShadow:
                selected === "HEAT"
                  ? "0 10px 25px -5px rgba(249, 115, 22, 0.5), 0 8px 10px -6px rgba(249, 115, 22, 0.2)"
                  : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 20px 25px -5px rgba(249, 115, 22, 0.4), 0 10px 10px -5px rgba(249, 115, 22, 0.2)",
              y: -8,
              rotateZ: [0, 1, -1, 0],
              transition: {
                rotateZ: {
                  repeat: 0,
                  duration: 0.5,
                  ease: "easeInOut",
                },
              },
            }}
            whileTap={{ scale: 0.96, y: 0, rotateZ: 0 }}
            onClick={() => handleSelect("HEAT")}
            initial="hidden"
            variants={optionVariants}
            animate={
              selected === "HEAT"
                ? {
                    ...optionVariants.visible(1),
                    scale: [1, 1.08, 1.04],
                    borderWidth: 2,
                    y: -8,
                    rotate: [0, 1, -1, 1, 0],
                    transition: {
                      duration: 0.6,
                      scale: {
                        times: [0, 0.5, 1],
                        duration: 0.7,
                      },
                      rotate: {
                        times: [0, 0.25, 0.5, 0.75, 1],
                        duration: 0.8,
                        ease: "easeInOut",
                      },
                      type: "spring",
                      stiffness: 150,
                      damping: 10,
                    },
                  }
                : "visible" // Use the variant name when not selected
            }
            custom={1}
          >
            {/* Orange shimmer effect */}
            {selected === "HEAT" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-orange-300/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                  repeatDelay: 0.5,
                }}
              />
            )}

            <div className="flex items-center gap-3">
              <motion.div
                className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-300 rounded-full overflow-hidden shadow-lg transform-gpu"
                animate={
                  selected === "HEAT"
                    ? {
                        scale: [1, 1.1, 1],
                        transition: {
                          repeat: Infinity,
                          repeatType: "reverse",
                          duration: 1.5,
                          ease: "easeInOut",
                        },
                      }
                    : {}
                }
              >
                <motion.div
                  animate={
                    selected === "HEAT"
                      ? {
                          y: [0, -3, 0, -3, 0],
                          transition: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                        }
                      : {}
                  }
                >
                  <Flame
                    className="h-7 w-7 text-white"
                    fill="rgba(255,255,255,0.3)"
                  />
                </motion.div>
              </motion.div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translate("appMode.heat")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {translate("appMode.socialApp")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">
                  {translate("appMode.heatLongDescription")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* SUITE Option */}
          <motion.div
            className={`relative overflow-hidden p-4 rounded-xl border min-h-[100px] ${
              selected === "SUITE"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
                : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600"
            } shadow-xl cursor-pointer transition-all duration-300 transform-gpu hover:z-10`}
            style={{
              boxShadow:
                selected === "SUITE"
                  ? "0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.2)"
                  : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
            whileHover={{
              scale: 1.05,
              boxShadow:
                "0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2)",
              y: -8,
              rotateZ: [0, -1, 1, 0],
              transition: {
                rotateZ: {
                  repeat: 0,
                  duration: 0.5,
                  ease: "easeInOut",
                },
              },
            }}
            whileTap={{ scale: 0.96, y: 0, rotateZ: 0 }}
            onClick={() => handleSelect("SUITE")}
            initial="hidden"
            variants={optionVariants}
            animate={
              selected === "SUITE"
                ? {
                    ...optionVariants.visible(2),
                    scale: [1, 1.08, 1.04],
                    borderWidth: 2,
                    y: -8,
                    rotate: [0, -1, 1, -1, 0],
                    transition: {
                      duration: 0.6,
                      scale: {
                        times: [0, 0.5, 1],
                        duration: 0.7,
                      },
                      rotate: {
                        times: [0, 0.25, 0.5, 0.75, 1],
                        duration: 0.8,
                        ease: "easeInOut",
                      },
                      type: "spring",
                      stiffness: 150,
                      damping: 10,
                    },
                  }
                : "visible" // Use the variant name when not selected
            }
            custom={2}
          >
            {/* Blue shimmer effect */}
            {selected === "SUITE" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-300/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                  repeatDelay: 0.5,
                }}
              />
            )}

            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-full overflow-hidden shadow-lg transform-gpu"
                  animate={
                    selected === "SUITE"
                      ? {
                          scale: [1, 1.1, 1],
                          transition: {
                            repeat: Infinity,
                            repeatType: "reverse",
                            duration: 1.5,
                            ease: "easeInOut",
                          },
                        }
                      : {}
                  }
                >
                  <motion.div
                    animate={
                      selected === "SUITE"
                        ? {
                            rotateY: 360,
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                          }
                        : {}
                    }
                  >
                    <Briefcase className="h-7 w-7 text-white" />
                  </motion.div>
                </motion.div>
                
                {/* Active Badge for SUITE */}
                {isSuiteActivated && (
                  <motion.div
                    className="absolute top-2 right-3 flex items-center gap-1 bg-gradient-to-r from-green-400 to-green-600 text-white text-xs px-2 py-0.5 rounded-full shadow-xl ring-2 ring-green-300 ring-opacity-50 z-10"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                  >
                    <CheckCircle className="h-2.5 w-2.5" />
                    <span className="font-semibold text-xs">Active</span>
                  </motion.div>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {translate("appMode.suite")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {translate("appMode.professionalNetwork")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">
                  {translate("appMode.suiteLongDescription")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="mt-10"
            >
              <Button
                size="lg"
                className="relative group py-6 px-8 overflow-hidden rounded-xl text-white font-bold text-lg shadow-2xl transform-gpu transition-all duration-300"
                style={{
                  background:
                    "linear-gradient(to right, #7e22ce, #f59e0b, #facc15)",
                  boxShadow:
                    "0 10px 30px -10px rgba(126, 34, 206, 0.5), 0 10px 20px -15px rgba(245, 158, 11, 0.4)",
                }}
                onClick={handleContinue}
                disabled={navigating}
              >
                <motion.span
                  className="absolute inset-0 bg-white opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                  animate={{
                    background: [
                      "radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 50%)",
                      "radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 50%)",
                      "radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 50%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative flex items-center">
                  {navigating ? (
                    <>
                      {translate("appMode.loading")} {selected}
                    </>
                  ) : (
                    <>
                      {translate("appMode.continueTo")} {selected}{" "}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </span>
                <motion.span
                  className="absolute bottom-0 left-0 right-0 h-1 bg-white opacity-30"
                  initial={{ width: 0 }}
                  animate={navigating ? { width: "100%" } : { width: 0 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
