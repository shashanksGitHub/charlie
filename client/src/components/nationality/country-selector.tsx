import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Compass,
  Globe,
  MapPin,
  ArrowRight,
  MoveRight,
  MoveLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { countriesData } from "./countries-data";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { isUnder18 } from "@/lib/age-utils";
import { t } from "@/hooks/use-language";
import { startWelcomeAudio } from "@/lib/ambient-audio";

interface CountrySelectorProps {
  onComplete: (country: string) => void;
  initialCountry?: string;
  isInDialog?: boolean; // New prop to indicate if used in a dialog context
  onDialogClose?: () => void; // Callback to close dialog when in dialog context
}

export default function CountrySelector({
  onComplete,
  initialCountry,
  isInDialog = false,
  onDialogClose,
}: CountrySelectorProps) {
  const [location, setLocation] = useLocation();
  const [countries, setCountries] = useState(countriesData);

  // Fetch user data to check age for appropriate text
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  // Determine app context for styling and title
  const isInSuiteApp = location.includes("/suite");
  const selectedAppFromStorage = sessionStorage.getItem("selectedApp");
  const storedUserId = localStorage.getItem("userId");
  const lastUsedApp =
    localStorage.getItem("last_used_app") ||
    (storedUserId
      ? localStorage.getItem(`last_used_app_${storedUserId}`)
      : null);
  const fromAppSelection =
    sessionStorage.getItem("fromAppSelection") === "true";
  const currentAppMode =
    sessionStorage.getItem("currentAppMode") ||
    sessionStorage.getItem("appMode") ||
    localStorage.getItem("currentAppMode");

  // Determine if this is SUITE context through multiple checks
  const isSuiteContext =
    isInSuiteApp ||
    (fromAppSelection && selectedAppFromStorage === "suite") ||
    (lastUsedApp && lastUsedApp.toLowerCase() === "suite") ||
    (currentAppMode && currentAppMode.toLowerCase() === "suite");

  // Fetch app-specific pool country preferences with fallback to manual fetch
  const {
    data: poolCountryData,
    error: poolCountryError,
    isLoading: poolCountryLoading,
    isSuccess: poolCountrySuccess,
  } = useQuery({
    queryKey: ["/api/user/pool-country"],
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000,
    queryFn: async () => {
      console.log(
        "[COUNTRY-SELECTOR] Making manual fetch request to /api/user/pool-country",
      );
      const response = await fetch("/api/user/pool-country", {
        method: "GET",
        credentials: "include", // Important: include credentials for auth
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "[COUNTRY-SELECTOR] Pool country fetch failed:",
          response.status,
          response.statusText,
        );
        throw new Error(`Pool country fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("[COUNTRY-SELECTOR] Pool country fetch successful:", data);
      return data;
    },
  });

  // Debug query errors and status
  useEffect(() => {
    console.log("[COUNTRY-SELECTOR] Query status:", {
      userExists: !!user?.id,
      userId: user?.id,
      isLoading: poolCountryLoading,
      isSuccess: poolCountrySuccess,
      hasData: !!poolCountryData,
      hasError: !!poolCountryError,
    });

    if (poolCountryError) {
      console.error(
        "[COUNTRY-SELECTOR] Pool country query error:",
        poolCountryError,
      );
    }

    if (poolCountrySuccess && poolCountryData) {
      console.log(
        "[COUNTRY-SELECTOR] 🎉 Pool country data successfully loaded:",
        poolCountryData,
      );
    }

    if (
      user?.id &&
      !poolCountryLoading &&
      !poolCountryData &&
      !poolCountryError
    ) {
      console.warn(
        "[COUNTRY-SELECTOR] 🚨 User exists but no pool country data - potential auth issue",
      );
    }
  }, [
    user?.id,
    poolCountryLoading,
    poolCountrySuccess,
    poolCountryData,
    poolCountryError,
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Update selected index when pool country data loads
  useEffect(() => {
    console.log(
      "[COUNTRY-SELECTOR] Pool country data loaded:",
      poolCountryData,
    );
    console.log(
      "[COUNTRY-SELECTOR] App context - isSuiteContext:",
      isSuiteContext,
    );
    console.log("[COUNTRY-SELECTOR] User ID:", user?.id);
    console.log("[COUNTRY-SELECTOR] Pool country error:", poolCountryError);
    console.log("[COUNTRY-SELECTOR] Available pool countries:", {
      meet: poolCountryData?.meetPoolCountry,
      suite: poolCountryData?.suitePoolCountry,
      legacy: poolCountryData?.poolCountry,
    });

    let targetCountry = initialCountry;

    // If we have app-specific pool country data, use it instead of initialCountry
    if (poolCountryData && !initialCountry) {
      targetCountry = isSuiteContext
        ? poolCountryData.suitePoolCountry
        : poolCountryData.meetPoolCountry;
      console.log(
        `[COUNTRY-SELECTOR] Using app-specific preference: ${targetCountry} for ${isSuiteContext ? "SUITE" : "MEET"}`,
      );
    } else if (!poolCountryData && user?.id && !poolCountryLoading) {
      console.warn(
        "[COUNTRY-SELECTOR] 🚨 No pool country data loaded despite having user ID - API might be failing",
      );
      console.warn("[COUNTRY-SELECTOR] Falling back to default behavior");
    }

    if (targetCountry) {
      const index = countries.findIndex((c) => c.name === targetCountry);
      console.log(
        "[COUNTRY-SELECTOR] Found index for",
        targetCountry,
        ":",
        index,
      );
      if (index > -1) {
        setSelectedIndex(index);
        return;
      }
    }

    // Fallback logic
    const anywhereIndex = countries.findIndex((c) => c.name === "ANYWHERE");
    if (anywhereIndex > -1) {
      setSelectedIndex(anywhereIndex);
      return;
    }

    const ghanaIndex = countries.findIndex((c) => c.name === "Ghana");
    setSelectedIndex(ghanaIndex > -1 ? ghanaIndex : 0);
  }, [
    poolCountryData,
    isSuiteContext,
    initialCountry,
    countries,
    user?.id,
    poolCountryError,
  ]);

  // Determine the appropriate title based on app context and user age
  const getTitle = () => {
    if (isSuiteContext) {
      return t("nationality.titles.connectionComesFrom");
    }

    // For MEET context, check user age
    if (user && isUnder18(user.dateOfBirth)) {
      return t("nationality.titles.friendshipComesFrom");
    }

    return t("nationality.titles.loveComesFrom");
  };
  const [isScrolling, setIsScrolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastTouchY = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  // Remove momentum mechanics to avoid background loops on mobile
  const velocityRef = useRef(0);
  const momentumRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Calculate visible items in the wheel
  const visibleItems = 7; // Must be odd number
  const halfVisibleItems = Math.floor(visibleItems / 2);

  // Update filtered countries when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const filtered = countries.filter((country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredCountries(filtered);

    // If we have matches, select the first match
    if (filtered.length > 0) {
      const newIndex = countries.findIndex((c) => c.name === filtered[0].name);
      if (newIndex !== -1) {
        setSelectedIndex(newIndex);
      }
    }
  }, [searchQuery, countries]);

  // Get the currently visible countries based on selected index
  const getVisibleCountries = () => {
    const result = [];
    for (let i = -halfVisibleItems; i <= halfVisibleItems; i++) {
      const index = (selectedIndex + i + countries.length) % countries.length;
      result.push({
        ...countries[index],
        position: i,
      });
    }
    return result;
  };

  // Handle manual wheel rotation (with reduced speed and no momentum)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (Math.abs(e.deltaY) > 0) {
      // Only move if not already dragging and the delta is significant
      if (!isDraggingRef.current && Math.abs(e.deltaY) > 10) {
        // Increased threshold
        isDraggingRef.current = true;
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 1000); // Much longer delay before allowing another wheel event

        // Determine direction but only move if the delta is significant
        const direction = e.deltaY > 0 ? 1 : -1;

        // Move exactly one position at a time, no randomness
        setSelectedIndex((prevIndex) => {
          const newIndex =
            (prevIndex + direction + countries.length) % countries.length;
          return newIndex;
        });

        // No momentum; just set velocity for potential future use
        velocityRef.current = 0;
      }
    }
  };

  // Handle touch interactions with greatly improved sensitivity for slower movement
  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchY.current = e.touches[0].clientY;
    setIsScrolling(true);
    // Stop momentum when user touches
    momentumRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!lastTouchY.current) return;

    const touchY = e.touches[0].clientY;
    const diff = touchY - lastTouchY.current;

    // Significantly increase threshold for touch sensitivity for much more control
    if (Math.abs(diff) > 25) {
      // Very high threshold for very infrequent updates
      const direction = diff > 0 ? -1 : 1;

      // Only move if not already dragging
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 1200); // Extremely long delay before allowing another touch move

        // No randomness - move exactly one position
        setSelectedIndex((prevIndex) => {
          const newIndex =
            (prevIndex + direction + countries.length) % countries.length;
          return newIndex;
        });

        lastTouchY.current = touchY;

        // Set velocity for momentum with extremely slow speed
        velocityRef.current = direction * 0.3; // Drastically reduced velocity
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchY.current = null;
    setIsScrolling(false);
    isDraggingRef.current = false;
    // No momentum on touch end
  };

  // Remove momentum animation to prevent background CPU usage
  const animateMomentum = () => {};

  const handleContinue = async () => {
    const selectedCountry = countries[selectedIndex].name;
    console.log("Continue button clicked, selected country:", selectedCountry);

    // Determine app mode for saving app-specific pool country
    const appMode = isSuiteContext ? "SUITE" : "MEET";
    console.log(
      `[POOL-COUNTRY] Saving for app mode: ${appMode}, country: ${selectedCountry}`,
    );

    // Save the selected country to the database for authenticated users
    if (user?.id) {
      try {
        const response = await fetch("/api/user/pool-country", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poolCountry: selectedCountry,
            appMode: appMode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(
            `[POOL-COUNTRY] Successfully saved ${selectedCountry} for ${appMode} app:`,
            data,
          );
        } else {
          console.warn(
            `[POOL-COUNTRY] Failed to save ${selectedCountry} for ${appMode} app:`,
            response.status,
          );
        }
      } catch (error) {
        console.error(
          `[POOL-COUNTRY] Error saving country for ${appMode} app:`,
          error,
        );
      }
    }

    // Start ambient welcome audio on explicit user gesture (Explore click)
    try {
      await startWelcomeAudio();
    } catch (audioError) {
      console.warn("[AUDIO] Unable to start welcome audio:", audioError);
    }

    // Call the onComplete callback with the selected country
    onComplete(selectedCountry);

    // If in dialog mode, close the dialog and navigate to dating preferences
    if (isInDialog && onDialogClose) {
      onDialogClose();
      // Navigate back to dating preferences if not already there
      if (!location.includes("/dating-preferences")) {
        setLocation("/dating-preferences");
      }
    }
  };

  // Updated arrow handler for up/down navigation
  const handleArrowClick = (direction: "up" | "down") => {
    console.log(`Arrow clicked: ${direction}`);

    // Map directions to increments (up decreases index, down increases)
    const increment = direction === "up" ? -1 : 1;

    // Calculate new index with proper wrapping
    const newIndex =
      (selectedIndex + increment + countries.length) % countries.length;

    console.log(`Changing index from ${selectedIndex} to ${newIndex}`);

    // Update state directly
    setSelectedIndex(newIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-violet-900 flex flex-col items-center justify-center select-none">
      {/* Ambient 3D lights */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-blue-500/5 sm:blur-[80px] blur-[16px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/5 sm:blur-[80px] blur-[16px]"></div>
      </div>

      <div className="relative my-2">
        {/* Title with conditional styling based on app context */}
        <h1
          className="relative text-center mb-0 py-1"
          style={{
            fontFamily: isSuiteContext
              ? "Inter, system-ui, sans-serif"
              : "Great Vibes, cursive",
            textShadow: isSuiteContext
              ? "0 0 10px rgba(255, 255, 255, 0.2), 0 0 20px rgba(59, 130, 246, 0.3)"
              : "0 0 10px rgba(255, 255, 255, 0.3), 0 0 15px rgba(148, 130, 238, 0.3)",
          }}
        >
          <span
            className={`block text-2xl md:text-3xl font-bold tracking-wide transform hover:scale-105 transition-transform duration-500 ${
              isSuiteContext
                ? "font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-slate-200 drop-shadow-sm"
                : "text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300"
            }`}
          >
            {getTitle()}
          </span>

          {/* Conditional subtitle styling based on app context */}
          <motion.span
            className={`block text-xs mt-3 tracking-wider text-transparent bg-clip-text ${
              isSuiteContext
                ? "font-['Space_Grotesk'] bg-gradient-to-r from-blue-200 via-cyan-200 to-slate-200 font-medium"
                : "font-['Cormorant_Garamond'] bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200"
            }`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {isSuiteContext
              ? t("nationality.subtitles.selectConnectionPool")
              : user && isUnder18(user.dateOfBirth)
                ? t("nationality.subtitles.selectFriendPool")
                : t("nationality.subtitles.selectMatchPool")}
          </motion.span>

          {/* Conditional animated underline decoration */}
          <motion.div
            className={`h-[1px] w-[50%] mx-auto mt-1 opacity-70 ${
              isSuiteContext
                ? "bg-gradient-to-r from-blue-400 via-cyan-400 to-slate-400"
                : "bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400"
            }`}
            initial={{ width: "0%" }}
            animate={{
              width: ["0%", "50%", "40%", "50%"],
              opacity: [0, 0.7, 0.5, 0.7],
            }}
            transition={{
              duration: isSuiteContext ? 2 : 3,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        </h1>

        {/* Conditional floating decorative elements */}
        {!isSuiteContext && (
          <>
            <motion.span
              className="absolute top-0 left-[25%] text-pink-300 opacity-40 text-sm"
              animate={{ y: [0, -3, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              ❤
            </motion.span>
            <motion.span
              className="absolute bottom-0 right-[25%] text-indigo-300 opacity-40 text-sm"
              animate={{ y: [0, 3, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5,
              }}
            >
              ❤
            </motion.span>
          </>
        )}
        {isSuiteContext && (
          <>
            <motion.span
              className="absolute top-0 left-[25%] text-blue-300 opacity-30 text-sm"
              animate={{ y: [0, -2, 0], opacity: [0.3, 0.5, 0.3] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              ◆
            </motion.span>
            <motion.span
              className="absolute bottom-0 right-[25%] text-cyan-300 opacity-30 text-sm"
              animate={{ y: [0, 2, 0], opacity: [0.3, 0.5, 0.3] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5,
              }}
            >
              ◆
            </motion.span>
          </>
        )}
      </div>

      {/* Search input - compact and beautiful */}
      <div className="relative w-full max-w-sm mb-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("nationality.searchPlaceholder")}
            className="w-full px-4 py-2 text-sm rounded-full bg-white/10 backdrop-blur-lg
                     text-white placeholder-white/40 border border-white/20
                     focus:border-indigo-300 focus:outline-none focus:ring-1 
                     focus:ring-indigo-300/40 transition-all duration-300
                     shadow-md hover:shadow-lg hover:bg-white/15"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
            <Search size={16} />
          </div>

          {/* Animated search suggestions */}
          {searchQuery && filteredCountries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white/10 
                       backdrop-blur-xl rounded-2xl border border-white/20 
                       shadow-xl overflow-hidden z-50"
            >
              <div className="max-h-48 overflow-y-auto">
                {filteredCountries.map((country, idx) => (
                  <motion.div
                    key={country.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      const newIndex = countries.findIndex(
                        (c) => c.name === country.name,
                      );
                      if (newIndex !== -1) {
                        setSelectedIndex(newIndex);
                        setSearchQuery(""); // Clear search after selection
                      }
                    }}
                    className={`flex items-center px-4 py-2 cursor-pointer transition-colors duration-200 ${
                      country.name === "ANYWHERE"
                        ? "hover:bg-gradient-to-r hover:from-blue-600/20 hover:via-purple-600/20 hover:to-cyan-600/20"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {country.name === "ANYWHERE" ? (
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-6 h-4 mr-3 flex items-center justify-center"
                      >
                        <Globe size={16} className="text-cyan-300" />
                      </motion.div>
                    ) : (
                      <img
                        src={country.flag}
                        alt={`${country.name} flag`}
                        className="w-6 h-4 mr-3 rounded-sm"
                      />
                    )}
                    <span
                      className={`text-sm ${
                        country.name === "ANYWHERE"
                          ? "text-cyan-200 font-medium tracking-wide"
                          : "text-white/90"
                      }`}
                    >
                      {country.name === "ANYWHERE"
                        ? t("nationality.anywhere")
                        : country.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Quick ANYWHERE button - floating for easy access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-1"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const anywhereIndex = countries.findIndex(
                (c) => c.name === "ANYWHERE",
              );
              if (anywhereIndex !== -1) {
                setSelectedIndex(anywhereIndex);
              }
            }}
            className="group relative px-4 py-1.5 rounded-full text-xs font-medium tracking-wider
                     bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20
                     border border-cyan-400/30 text-cyan-200 hover:text-cyan-100
                     hover:border-cyan-300/50 transition-all duration-300
                     backdrop-blur-sm shadow-lg hover:shadow-cyan-400/20"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex items-center gap-2"
            >
              <Globe size={14} className="text-cyan-300" />
              <span>{t("nationality.quickSelectAnywhere")}</span>
            </motion.div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-full bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </motion.button>
        </motion.div>
      </div>

      {/* Main container for country selection - reduced height */}
      <div className="relative w-full max-w-md h-[280px] mx-auto">
        {/* 3D carousel container */}
        <div
          ref={wheelRef}
          className="absolute inset-0 perspective-[1500px] overflow-hidden"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Decorative ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-4 border-indigo-600/30 z-0"></div>

          {/* Side navigation controls - positioned on the left and right sides */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 z-30">
            <button
              id="left-arrow"
              className="w-12 h-12 sm:w-16 sm:h-16 flex justify-center items-center bg-blue-600/80 text-white hover:text-blue-100 hover:bg-blue-500/90 rounded-full transition-colors border-2 border-white/30 shadow-lg ml-2"
              onClick={() => handleArrowClick("up")}
            >
              <ChevronUp size={28} className="sm:size-[36px]" />
            </button>
          </div>

          <div className="absolute top-1/2 right-0 -translate-y-1/2 z-30">
            <button
              id="right-arrow"
              className="w-12 h-12 sm:w-16 sm:h-16 flex justify-center items-center bg-blue-600/80 text-white hover:text-blue-100 hover:bg-blue-500/90 rounded-full transition-colors border-2 border-white/30 shadow-lg mr-2"
              onClick={() => handleArrowClick("down")}
            >
              <ChevronDown size={28} className="sm:size-[36px]" />
            </button>
          </div>

          {/* Center highlight and selected country display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full bg-black/50 sm:backdrop-blur-md backdrop-blur-0 border-2 border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.3)] flex flex-col items-center justify-center">
            {/* Display the currently selected country */}
            <div className="px-4 py-3 rounded-xl">
              {countries[selectedIndex] && (
                <>
                  {/* Globe emoji above ANYWHERE title */}
                  {countries[selectedIndex].name === "ANYWHERE" && (
                    <div className="flex justify-center mb-3">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 10, 0, -10, 0],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="text-6xl"
                        style={{
                          filter:
                            "drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))",
                        }}
                      >
                        🌍
                      </motion.div>
                    </div>
                  )}

                  {/* Flag display for non-ANYWHERE countries */}
                  {countries[selectedIndex].name !== "ANYWHERE" && (
                    <div className="flex justify-center mb-3">
                      <img
                        src={countries[selectedIndex].flag}
                        alt={`${countries[selectedIndex].name} flag`}
                        className="w-20 h-16 rounded shadow-glow"
                      />
                    </div>
                  )}
                  <div
                    className={`text-center text-xl font-bold ${
                      countries[selectedIndex].name === "ANYWHERE"
                        ? "bg-gradient-to-r from-blue-300 via-purple-300 to-cyan-300 text-transparent bg-clip-text drop-shadow-lg text-2xl tracking-wide"
                        : "text-white"
                    }`}
                  >
                    {countries[selectedIndex].name === "ANYWHERE"
                      ? t("nationality.anywhere")
                      : countries[selectedIndex].name}
                  </div>
                  {countries[selectedIndex].name === "ANYWHERE" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs text-cyan-200/80 mt-2 tracking-wider"
                    >
                      {t("nationality.openToAllBackgrounds")}
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 3D wheel countries positioned around the circle */}
          <div className="w-full h-full relative transform-style-3d">
            <AnimatePresence>
              {getVisibleCountries().map((country) => {
                if (country.position === 0) return null; // Skip the center one as we display it separately

                // Calculate position on the circle
                const angle = (country.position / halfVisibleItems) * Math.PI; // Convert to radians
                const radius = 140; // Reduced radius from 200 to 140 to fit better on screen

                // Calculate position with a left offset to ensure all countries are visible
                const x = Math.sin(angle) * radius - 70; // Shift all positions 20px to the left
                const y = -Math.cos(angle) * radius - 20;
                const z = 100 - Math.abs(country.position) * 20; // Z decreases as we move away from center

                return (
                  <motion.div
                    key={`${country.code}-${country.position}`}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1 - Math.abs(country.position) * 0.15,
                      x: x,
                      y: y,
                      z: z,
                      scale: 1 - Math.abs(country.position) * 0.1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center px-3 py-1 rounded-lg sm:backdrop-blur-sm backdrop-blur-0 border min-w-[160px] ${
                      country.name === "ANYWHERE"
                        ? "bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 border-cyan-400/30 shadow-lg shadow-cyan-400/20"
                        : "bg-black/30 border-white/10"
                    }`}
                    style={{
                      zIndex: -Math.abs(country.position), // Lower position numbers are in front
                    }}
                  >
                    {country.name === "ANYWHERE" ? (
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-7 h-5 mr-2 flex items-center justify-center"
                      >
                        <Globe size={20} className="text-cyan-300" />
                      </motion.div>
                    ) : (
                      <img
                        src={country.flag}
                        alt={`${country.name} flag`}
                        className="w-7 h-5 mr-2 rounded-sm"
                      />
                    )}
                    <span
                      className={`text-sm truncate ${
                        country.name === "ANYWHERE"
                          ? "text-cyan-200 font-medium tracking-wide"
                          : "text-white/80"
                      }`}
                    >
                      {country.name === "ANYWHERE"
                        ? t("nationality.anywhere")
                        : country.name}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Compact Explore button */}
      <div className="mt-1 flex flex-col items-center justify-center">
        {/* Round button with icon and animated arrows pointing to it */}
        <div onClick={handleContinue} className="relative cursor-pointer">
          {/* Left animated arrow pointing directly to the button - more compact */}
          <motion.div
            className="absolute top-1/2 -left-14 -translate-y-1/2 text-blue-300"
            initial={{ x: -5, opacity: 0 }}
            animate={{
              x: [-5, 2, -5],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <div className="flex items-center">
              <MoveRight className="h-8 w-8 stroke-[3] text-blue-200" />
              <span className="text-xs ml-1 font-bold text-blue-200 tracking-wider">
                {t("nationality.tap")}
              </span>
            </div>
          </motion.div>

          {/* Right animated arrow pointing directly to the button - more compact */}
          <motion.div
            className="absolute top-1/2 -right-14 -translate-y-1/2 text-purple-300"
            initial={{ x: 5, opacity: 0 }}
            animate={{
              x: [5, -2, 5],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
              delay: 0.3,
            }}
          >
            <div className="flex items-center">
              <span className="text-xs mr-1 font-bold text-purple-200 tracking-wider">
                {t("nationality.tap")}
              </span>
              <MoveLeft className="h-8 w-8 stroke-[3] text-purple-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
            }}
            className="w-16 h-16 rounded-full flex items-center justify-center
                     bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 
                     border-2 border-indigo-400/30
                     shadow-md shadow-indigo-900/30 relative"
          >
            {/* Outer glowing ring */}
            <div className="absolute -inset-1 rounded-full bg-blue-500/10 blur-sm"></div>
            {/* Animated white particle ring */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  initial={{
                    top: "50%",
                    left: "50%",
                    opacity: 0,
                  }}
                  animate={{
                    top: [
                      `${50 + 45 * Math.sin((i * (Math.PI * 2)) / 12)}%`,
                      `${50 + 45 * Math.sin(((i + 1) * (Math.PI * 2)) / 12)}%`,
                    ],
                    left: [
                      `${50 + 45 * Math.cos((i * (Math.PI * 2)) / 12)}%`,
                      `${50 + 45 * Math.cos(((i + 1) * (Math.PI * 2)) / 12)}%`,
                    ],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-blue-500/30"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            {/* Pulsing glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full opacity-70"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                  "0 0 0 15px rgba(99, 102, 241, 0.4)",
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Explore icon */}
            <div className="relative z-10">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, 0, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Compass size={24} className="text-white" strokeWidth={2.5} />
              </motion.div>
            </div>
          </motion.div>

          {/* Enhanced invisible layer that ensures full clickability with extended hit area */}
          <div
            className="absolute -inset-3 z-20 opacity-0 cursor-pointer"
            onClick={handleContinue}
            aria-label="Explore button"
          >
            Click to explore
          </div>
        </div>

        {/* Simple compact label */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-1 text-center relative cursor-pointer"
          onClick={handleContinue}
        >
          <div
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 
                         text-xs tracking-wider font-medium flex items-center justify-center space-x-1"
          >
            <span className="text-blue-300 text-[0.5rem]">❈</span>
            <span>{t("nationality.explore")}</span>
            <span className="text-purple-300 text-[0.5rem]">❈</span>
          </div>
        </motion.div>
      </div>

      {/* Enhanced decorative elements */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>

      {/* Floating particles for depth */}
      <div className="absolute w-full h-full overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/30"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ filter: "blur(1px)" }}
          />
        ))}
      </div>
    </div>
  );
}
