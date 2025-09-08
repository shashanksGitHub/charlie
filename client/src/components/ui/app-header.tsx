import { useLocation } from "wouter";
import { UserPicture } from "@/components/ui/user-picture";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings,
  Heart,
  Flame,
  Briefcase,
  User,
  Settings2,
  FileText,
  Bell,
  UserCircle,
  Bell as BellRing,
  Network,
  LogOut,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppMode } from "@/hooks/use-app-mode";
import { t } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import {
  recordLogoutTime,
  markMatchCheckNeeded,
} from "@/lib/offline-match-checker";
import { NationalityFlagButton } from "@/components/ui/nationality-flag-button";
import { safeStorageSet } from "@/lib/storage-utils";
import { motion } from "framer-motion";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { isUnder18 } from "@/lib/age-utils";
import { useMatchCount } from "@/hooks/use-match-count";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useSuiteConnectionCount } from "@/hooks/use-suite-connection-count";

export function AppHeader() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { currentMode, setAppMode, startTransition } = useAppMode();
  // Use the safe t() function instead of useLanguage hook to avoid context errors
  const { darkMode } = useDarkMode();
  const { onlineCount, isLoading, hasCount } = useOnlineUsers();
  const { likeCount } = useMatchCount();
  const { unreadCount } = useUnreadMessages();
  const { totalCount: suiteConnectionCount } = useSuiteConnectionCount();

  // Calculate total notification count for MEET app (matches + messages)
  const meetNotificationCount = (likeCount || 0) + (unreadCount || 0);

  // Calculate total notification count for SUITE app (connections + messages)
  const suiteNotificationCount =
    (suiteConnectionCount || 0) + (unreadCount || 0);

  // For HEAT app - currently no specific notifications, but structure ready for future expansion
  const heatNotificationCount = 0;

  // Calculate total notification count across ALL app modes for the menu icon badge
  const totalNotificationCount =
    meetNotificationCount + suiteNotificationCount + heatNotificationCount;

  // Helper function to navigate to Settings while capturing current page
  const navigateToSettings = (tab?: string) => {
    // Capture current page before navigating to Settings
    const validAppPages = ["/home", "/heat", "/suite/network", "/suite/jobs"];

    if (validAppPages.includes(location)) {
      const stack = {
        originPage: location,
        timestamp: Date.now(),
        capturedFrom: "app-header",
      };

      localStorage.setItem("settings_navigation_stack", JSON.stringify(stack));
      console.log(
        "[NAV-HELPER] Captured current page for Settings navigation:",
        stack,
      );
    }

    // Navigate to Settings with optional tab
    const settingsUrl = tab ? `/settings?tab=${tab}` : "/settings";
    setLocation(settingsUrl);
  };

  const updateLastUsedApp = async (mode: "MEET" | "HEAT" | "SUITE") => {
    if (user && user.id) {
      try {
        await import("@/lib/queryClient").then(async ({ apiRequest }) => {
          await apiRequest(`/api/profile/${user.id}`, {
            method: "PATCH",
            data: { lastUsedApp: mode },
          });
        });
      } catch (e) {
        console.error("Failed to update last_used_app in DB", e);
      }
    }
  };

  const handleLogout = () => {
    // Proceed with logout immediately - cleanup handled in auth hook
    logoutMutation.mutate();
  };

  // Get the appropriate icon based on the current app mode with total notification badge
  const renderAppIcon = () => {
    let iconContent;

    switch (currentMode) {
      case "MEET":
        iconContent = (
          <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full overflow-hidden shadow-md animate-pulse">
            <Heart
              className="h-4 w-4 text-white animate-icon-pulse"
              fill="white"
            />
          </div>
        );
        break;
      case "HEAT":
        iconContent = (
          <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-orange-500 to-yellow-300 rounded-full overflow-hidden shadow-md">
            <Flame
              className="h-4 w-4 text-white animate-icon-wave"
              fill="rgba(255,255,255,0.3)"
            />
          </div>
        );
        break;
      case "SUITE":
        iconContent = (
          <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-full overflow-hidden shadow-md">
            <Briefcase className="h-4 w-4 text-white animate-icon-spin" />
          </div>
        );
        break;
      default:
        return null;
    }

    // Wrap the icon with total notification badge if there are notifications
    return (
      <div className="relative">
        {iconContent}
        {totalNotificationCount > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: 1,
              rotate: 0,
              y: [0, -1, 0],
            }}
            transition={{
              scale: { type: "spring", stiffness: 500, damping: 12 },
              rotate: { duration: 0.4, ease: "easeOut" },
              y: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            className="absolute -top-1 -right-1"
          >
            <div
              className={`
              flex items-center justify-center min-w-[18px] h-[18px] px-1 
              bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 
              rounded-full shadow-lg border-2 border-white
              ${darkMode ? "shadow-red-500/40 border-gray-900" : "shadow-red-500/20 border-white"}
            `}
            >
              <span className="text-white text-[8px] font-extrabold leading-none">
                {totalNotificationCount > 99 ? "99+" : totalNotificationCount}
              </span>
            </div>
            {/* Subtle glow effect */}
            <div
              className={`
              absolute inset-0 rounded-full 
              bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 
              opacity-40 blur-sm scale-110 -z-10
              animate-pulse
            `}
            />
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div
      id="app-header"
      className={`sticky top-0 z-50 ${darkMode ? "" : "border-b border-white"}`}
    >
      <div
        className={`py-1 px-3 flex items-center justify-between ${darkMode ? "bg-gray-900" : "bg-white"}`}
      >
        {/* Left side with app icon and dropdown menu */}
        {user && (
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center p-0.5 cursor-pointer">
                  {renderAppIcon()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={`w-44 p-1 ${
                  darkMode
                    ? "bg-gradient-to-b from-gray-900/90 to-gray-900/95 border-gray-700/40 text-white"
                    : "bg-gradient-to-b from-white/90 to-white/80 border-gray-300/40 text-gray-900"
                } backdrop-blur-lg border rounded-xl shadow-2xl animate-in slide-in-from-top-5 fade-in zoom-in-95 duration-200`}
                sideOffset={8}
              >
                <DropdownMenuItem
                  onClick={async () => {
                    await updateLastUsedApp("MEET");
                    if (currentMode !== "MEET") {
                      setAppMode("MEET"); // Set app mode FIRST to prevent redirect
                      startTransition("MEET");
                      setTimeout(() => {
                        setLocation("/"); // Navigate to MEET discover page
                      }, 300);
                    } else {
                      setLocation("/");
                    }
                  }}
                  className={`
                    flex items-center p-2 my-0.5 rounded-lg 
                    ${
                      currentMode === "MEET"
                        ? `bg-gradient-to-r ${darkMode ? "from-purple-900/40 to-pink-800/30" : "from-purple-100 to-pink-100"} border ${darkMode ? "border-purple-500/20" : "border-purple-200"} ${darkMode ? "shadow-[0_0_10px_rgba(168,85,247,0.15)]" : "shadow-[0_0_10px_rgba(168,85,247,0.07)]"}`
                        : `hover:bg-gradient-to-r ${darkMode ? "hover:from-purple-900/20 hover:to-pink-800/10" : "hover:from-purple-50 hover:to-pink-50"} border border-transparent ${darkMode ? "hover:border-purple-500/10" : "hover:border-purple-200/60"}`
                    }
                    transition-all duration-300 group
                  `}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full overflow-hidden shadow-md mr-2.5 group-hover:scale-110 group-hover:shadow-purple-500/20 transition-all duration-200">
                    <Heart
                      className="h-4 w-4 text-white animate-pulse"
                      fill="white"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-medium text-xs ${darkMode ? "text-white group-hover:text-purple-300" : "text-purple-900 group-hover:text-purple-700"} tracking-wide transition-colors duration-200`}
                    >
                      {t("appMode.meet")}
                    </span>
                    <span
                      className={`text-[10px] ${darkMode ? "text-purple-300/70" : "text-purple-600/90"}`}
                    >
                      {isUnder18(user?.dateOfBirth)
                        ? t("appMode.palApp")
                        : t("appMode.datingApp")}
                    </span>
                  </div>
                  {meetNotificationCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{
                        scale: 1,
                        rotate: 0,
                        y: [0, -2, 0],
                      }}
                      transition={{
                        scale: { type: "spring", stiffness: 400, damping: 10 },
                        rotate: { duration: 0.5, ease: "easeOut" },
                        y: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }}
                      className="relative ml-auto"
                    >
                      <div
                        className={`
                        flex items-center justify-center min-w-[20px] h-[20px] px-1.5 
                        bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 
                        rounded-full shadow-lg transform
                        ${darkMode ? "shadow-purple-500/30" : "shadow-purple-500/20"}
                      `}
                      >
                        <span className="text-white text-[9px] font-bold">
                          {meetNotificationCount}
                        </span>
                      </div>
                      {/* Subtle glow effect */}
                      <div
                        className={`
                        absolute inset-0 rounded-full 
                        bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 
                        opacity-30 blur-sm scale-110 -z-10
                        animate-pulse
                      `}
                      />
                    </motion.div>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={async () => {
                    await updateLastUsedApp("HEAT");
                    if (currentMode !== "HEAT") {
                      setAppMode("HEAT"); // Set app mode FIRST to prevent redirect
                      startTransition("HEAT");
                      setTimeout(() => {
                        setLocation("/heat"); // Navigate to HEAT page
                      }, 300);
                    } else {
                      setLocation("/heat");
                    }
                  }}
                  className={`
                    flex items-center p-2 my-0.5 rounded-lg
                    ${
                      currentMode === "HEAT"
                        ? `bg-gradient-to-r ${darkMode ? "from-orange-900/40 to-amber-800/30" : "from-orange-100 to-amber-100"} border ${darkMode ? "border-orange-500/20" : "border-orange-200"} ${darkMode ? "shadow-[0_0_10px_rgba(249,115,22,0.15)]" : "shadow-[0_0_10px_rgba(249,115,22,0.07)]"}`
                        : `hover:bg-gradient-to-r ${darkMode ? "hover:from-orange-900/20 hover:to-amber-800/10" : "hover:from-orange-50 hover:to-amber-50"} border border-transparent ${darkMode ? "hover:border-orange-500/10" : "hover:border-orange-200/60"}`
                    }
                    transition-all duration-300 group
                  `}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-300 rounded-full overflow-hidden shadow-md mr-2.5 group-hover:scale-110 group-hover:shadow-orange-500/20 transition-all duration-200">
                    <Flame
                      className="h-4 w-4 text-white animate-[pulse_1.5s_ease-in-out_infinite]"
                      fill="rgba(255,255,255,0.3)"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-medium text-xs ${darkMode ? "text-white group-hover:text-orange-300" : "text-orange-900 group-hover:text-orange-700"} tracking-wide transition-colors duration-200`}
                    >
                      {t("appMode.heat")}
                    </span>
                    <span
                      className={`text-[10px] ${darkMode ? "text-orange-300/70" : "text-orange-600/90"}`}
                    >
                      {t("appMode.socialApp")}
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={async () => {
                    await updateLastUsedApp("SUITE");
                    if (currentMode !== "SUITE") {
                      setAppMode("SUITE"); // Set app mode FIRST to prevent redirect
                      startTransition("SUITE");
                      setTimeout(() => {
                        setLocation("/suite/network"); // Navigate to SUITE Network page (default)
                      }, 300);
                    } else {
                      setLocation("/suite/network");
                    }
                  }}
                  className={`
                    flex items-center p-2 my-0.5 rounded-lg
                    ${
                      currentMode === "SUITE"
                        ? `bg-gradient-to-r ${darkMode ? "from-blue-900/40 to-indigo-800/30" : "from-blue-100 to-indigo-100"} border ${darkMode ? "border-blue-500/20" : "border-blue-200"} ${darkMode ? "shadow-[0_0_10px_rgba(59,130,246,0.15)]" : "shadow-[0_0_10px_rgba(59,130,246,0.07)]"}`
                        : `hover:bg-gradient-to-r ${darkMode ? "hover:from-blue-900/20 hover:to-indigo-800/10" : "hover:from-blue-50 hover:to-indigo-50"} border border-transparent ${darkMode ? "hover:border-blue-500/10" : "hover:border-blue-200/60"}`
                    }
                    transition-all duration-300 group
                  `}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-full overflow-hidden shadow-md mr-2.5 group-hover:scale-110 group-hover:shadow-blue-500/20 transition-all duration-200">
                    <Briefcase className="h-4 w-4 text-white animate-[pulse_2s_ease-in-out_infinite]" />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-medium text-xs ${darkMode ? "text-white group-hover:text-blue-300" : "text-blue-900 group-hover:text-blue-700"} tracking-wide transition-colors duration-200`}
                    >
                      {t("appMode.suite")}
                    </span>
                    <span
                      className={`text-[10px] ${darkMode ? "text-blue-300/70" : "text-blue-600/90"}`}
                    >
                      {t("appMode.professionalNetwork")}
                    </span>
                  </div>
                  {suiteNotificationCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{
                        scale: 1,
                        rotate: 0,
                        y: [0, -2, 0],
                      }}
                      transition={{
                        scale: { type: "spring", stiffness: 400, damping: 10 },
                        rotate: { duration: 0.5, ease: "easeOut" },
                        y: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }}
                      className="relative ml-auto"
                    >
                      <div
                        className={`
                        flex items-center justify-center min-w-[20px] h-[20px] px-1.5 
                        bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-600 
                        rounded-full shadow-lg transform
                        ${darkMode ? "shadow-blue-500/30" : "shadow-blue-500/20"}
                      `}
                      >
                        <span className="text-white text-[9px] font-bold">
                          {suiteNotificationCount}
                        </span>
                      </div>
                      {/* Subtle glow effect */}
                      <div
                        className={`
                        absolute inset-0 rounded-full 
                        bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-600 
                        opacity-30 blur-sm scale-110 -z-10
                        animate-pulse
                      `}
                      />
                    </motion.div>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Middle section with title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-purple-900 via-orange-500 to-yellow-400 bg-clip-text text-transparent animate-gradient leading-tight mb-0">
              CHARLéY
            </h1>
            {/* Add nationality flag button */}
            <div className="ml-2 -mt-1">
              <NationalityFlagButton
                onClick={() => {
                  // Save current location for returning to it later
                  safeStorageSet("previousPage", window.location.pathname);
                  // Show nationality selection directly without splash screen
                  safeStorageSet(
                    "showingNationalityBeforeAppSelection",
                    "true",
                  );
                  safeStorageSet("skipSplashScreen", "true");
                  // Use Wouter navigation for a smooth client-side transition
                  setLocation("/nationality");
                }}
              />
            </div>
          </div>
          <span
            className="text-xs font-medium italic bg-gradient-to-r from-yellow-400 to-purple-900 bg-clip-text text-transparent static-gradient -mt-1"
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: "0.75rem",
              letterSpacing: "0.5px",
            }}
          >
            {t("app.slogan")}
          </span>
        </div>

        {/* Right side with settings */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="p-1 rounded-full hover:bg-gray-100/80 relative"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: [0, 30, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                >
                  <Settings className="h-6 w-6" />
                </motion.div>
                {/* Online Users Counter positioned under settings button */}
                {hasCount && (
                  <div className="absolute top-9 right-0 flex items-center space-x-0.5 text-[8px]">
                    <div
                      className={`w-1 h-1 rounded-full ${isLoading ? "bg-gray-400 animate-pulse" : "bg-green-500 animate-pulse"}`}
                    ></div>
                    <span
                      className={`${darkMode ? "text-gray-300" : "text-gray-600"} font-semibold`}
                    >
                      {onlineCount}
                    </span>
                    <span
                      className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      online
                    </span>
                  </div>
                )}
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={`w-44 p-1 ${
                darkMode
                  ? "bg-gradient-to-b from-gray-900/90 to-gray-900/95 border-gray-700/40 text-white"
                  : "bg-gradient-to-b from-white/90 to-white/80 border-gray-300/40 text-gray-900"
              } backdrop-blur-lg border rounded-xl shadow-2xl animate-in slide-in-from-top-3 fade-in zoom-in-95 duration-200`}
              sideOffset={8}
            >
              {/* Common settings */}
              <DropdownMenuItem
                onClick={() => navigateToSettings()}
                className={`p-2 my-0.5 rounded-lg ${
                  darkMode
                    ? "hover:bg-gray-800/50 text-gray-200"
                    : "hover:bg-gray-100/70 text-gray-700"
                } text-xs font-medium transition-colors duration-150 flex items-center`}
              >
                <User
                  className={`h-3.5 w-3.5 ${darkMode ? "text-gray-400" : "text-gray-500"} mr-2`}
                />
                {t("settingsMenu.accountSettings")}
              </DropdownMenuItem>

              {/* App-specific settings */}
              {currentMode === "MEET" && (
                <>
                  <DropdownMenuItem
                    onClick={() => setLocation("/dating-preferences")}
                    className={`p-2 my-0.5 rounded-lg ${
                      darkMode
                        ? "hover:bg-purple-900/20 text-purple-200/90"
                        : "hover:bg-purple-100/60 text-purple-800/90"
                    } text-xs font-medium transition-colors duration-150 flex items-center`}
                  >
                    {user && isUnder18(user.dateOfBirth) ? (
                      <Users
                        className={`h-3.5 w-3.5 ${darkMode ? "text-purple-400/80" : "text-purple-500"} mr-2`}
                      />
                    ) : (
                      <Heart
                        className={`h-3.5 w-3.5 ${darkMode ? "text-purple-400/80" : "text-purple-500"} mr-2`}
                      />
                    )}
                    {user && isUnder18(user.dateOfBirth)
                      ? "Friendship Preferences"
                      : t("settingsMenu.datingPreferences")}
                  </DropdownMenuItem>
                </>
              )}

              {currentMode === "HEAT" && (
                <>
                  <DropdownMenuItem
                    className={`p-2 my-0.5 rounded-lg ${
                      darkMode
                        ? "hover:bg-orange-900/20 text-orange-200/90"
                        : "hover:bg-orange-100/60 text-orange-800/90"
                    } text-xs font-medium transition-colors duration-150 flex items-center`}
                  >
                    <Settings2
                      className={`h-3.5 w-3.5 ${darkMode ? "text-orange-400/80" : "text-orange-500"} mr-2`}
                    />
                    {t("settingsMenu.contentPreferences")}
                  </DropdownMenuItem>
                </>
              )}

              {currentMode === "SUITE" && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      setLocation("/suite/connections-preferences")
                    }
                    className={`p-2 my-0.5 rounded-lg ${
                      darkMode
                        ? "hover:bg-blue-900/20 text-blue-200/90"
                        : "hover:bg-blue-100/60 text-blue-800/90"
                    } text-xs font-medium transition-colors duration-150 flex items-center`}
                  >
                    <Network
                      className={`h-3.5 w-3.5 ${darkMode ? "text-blue-400/80" : "text-blue-500"} mr-2`}
                    />
                    {t("settingsMenu.networkingPreferences")}
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator
                className={`my-1 h-px ${darkMode ? "bg-gray-700/40" : "bg-gray-300/60"}`}
              />
              <DropdownMenuItem
                onClick={handleLogout}
                className={`p-2 my-0.5 rounded-lg ${
                  darkMode
                    ? "hover:bg-red-900/20 text-red-400"
                    : "hover:bg-red-100/60 text-red-600"
                } text-xs font-medium transition-colors duration-150 flex items-center`}
              >
                <LogOut
                  className={`h-3.5 w-3.5 ${darkMode ? "text-red-400/80" : "text-red-500"} mr-2`}
                />
                {t("common.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
