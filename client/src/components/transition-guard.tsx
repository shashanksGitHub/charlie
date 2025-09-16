import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import adinkraSymbol from "../assets/charley-logo.svg";

interface TransitionGuardProps {
  children: ReactNode;
}

/**
 * TransitionGuard prevents flashing of content during transitions
 * between login and app selection page, or when redirecting
 * from app pages to app selection.
 */
export function TransitionGuard({ children }: TransitionGuardProps) {
  const [location] = useLocation();
  const [isReady, setIsReady] = useState(true); // CRITICAL FIX: Default to true to prevent blank pages

  useEffect(() => {
    // Check the current location and state
    const isAppPage = ["/", "/heat", "/suite"].includes(location);
    const needsAppSelection =
      isAppPage && !sessionStorage.getItem("appModeSelected");
    const inDirectRedirect =
      sessionStorage.getItem("directRedirect") === "true";
    const inAppModeTransition =
      sessionStorage.getItem("modeTransition") !== null;
    const selectedAppMode = sessionStorage.getItem("modeTransition");
    const isAppSelectionPage = location.includes("app-selection");

    // Handle direct redirect from password page to app selection
    if (inDirectRedirect) {
      // Skip loading screen during direct redirects - immediately show content
      if (isAppSelectionPage) {
        // Already on app selection page, clear the flag and show content
        sessionStorage.removeItem("directRedirect");
        setIsReady(true);
      } else if (isAppPage) {
        // If trying to access an app page during direct redirect, redirect to app selection
        // Use history API instead of window.location to avoid full page refresh
        setIsReady(false); // Keep content hidden during navigation
        window.history.replaceState(null, "", "/app-selection");
        // Force a refresh of the current component after a small delay
        setTimeout(() => setIsReady(true), 10);
      } else {
        // For any other pages during direct redirect, show content
        setIsReady(true);
      }

      return undefined;
    }

    // Handle app mode transition
    else if (inAppModeTransition) {
      setIsReady(false);

      // Verify we're on the correct app page for the selected mode
      const correctPage =
        (selectedAppMode === "MEET" && location === "/") ||
        (selectedAppMode === "HEAT" && location === "/heat") ||
        (selectedAppMode === "SUITE" && location === "/suite");

      // We've reached the destination page, clear transition flag and show content
      if (correctPage) {
        // Leave the transition flag in place for a short time to allow the animation to complete
        const timer = setTimeout(() => {
          sessionStorage.removeItem("modeTransition");
          setIsReady(true);
        }, 3000); // Extended delay to match the longer app transition duration
        return () => clearTimeout(timer);
      }

      // Display the loading transition screen with CHARLéY logo
      return () => {
        // Clean up any timers
      };
    }

    // Handle app page redirect if mode not selected
    else if (needsAppSelection && !isAppSelectionPage) {
      // Show loading while redirecting to app selection
      // Use the same history API approach to avoid page reload
      setIsReady(false);
      window.history.replaceState(null, "", "/app-selection");
      // Force a refresh of the current component after a small delay
      setTimeout(() => setIsReady(true), 10);
      return undefined;
    }

    // For all other cases, show content immediately
    else {
      setIsReady(true);
      return undefined;
    }
  }, [location]);

  if (!isReady) {
    const inModeTransition = sessionStorage.getItem("modeTransition") !== null;

    if (inModeTransition) {
      // Show CHARLéY logo during app mode transitions
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-50"
          style={{
            background:
              "linear-gradient(to bottom, #7e22ce, #9333EA 40%, #fb923c 80%, white 120%)",
          }}
        >
          <div className="flex flex-col items-center justify-center">
            <motion.img
              src={adinkraSymbol}
              alt="CHARLéY Logo"
              className="w-24 h-24 mb-4"
              style={{
                filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))",
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.2, 1],
                opacity: 1,
                y: [0, -10, 0],
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                times: [0, 0.6, 1],
              }}
            />
            <div className="app-title overflow-hidden">
              {"CHARLéY".split("").map((letter, i) => (
                <motion.span
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
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.05 + i * 0.03,
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      // Improved, branded spinner for direct redirect loading states
      return (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "linear-gradient(to bottom, white, #f8fafc)", // Very subtle gradient
            opacity: 0.9, // Slight transparency so the app behind is visible
          }}
        >
          <div className="text-center">
            <img
              src={adinkraSymbol}
              alt="CHARLéY Logo"
              className="w-16 h-16 mb-2 animate-pulse"
              style={{
                filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.2))",
              }}
            />
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
