import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AppModeSelector } from "@/components/app-mode-selector";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

export default function AppSelectionPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { translate } = useLanguage();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-4 px-3">
        <motion.div
          className="w-full max-w-sm flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 text-sm">{translate("common.loading")}</p>
        </motion.div>
      </div>
    );
  }

  // Redirect to auth if not logged in and clean up transition state
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
      return;
    }

    // Only proceed if we have a user and not loading
    if (user && !isLoading) {
      // Store the user ID in sessionStorage for app mode selection
      if (user.id) {
        try {
          sessionStorage.setItem("userId", user.id.toString());
          try {
            localStorage.setItem("userId", user.id.toString());
          } catch (storageError) {
            console.warn(
              "[STORAGE] Could not store userId in localStorage",
              storageError,
            );
          }
          sessionStorage.setItem("appSelectionStarted", "true");
        } catch (error) {
          console.warn("[STORAGE] Storage error:", error);
        }
      }
      sessionStorage.removeItem("loginTransition");

      // CRITICAL FIX: Check if both toggles are disabled and redirect appropriately
      if (
        user.showAppModeSelection === false &&
        user.showNationalitySelection === false
      ) {
        console.log(
          "[APP-SELECTION] Both toggles disabled, redirecting to last used app",
        );
        const lastUsedApp = user.lastUsedApp || "MEET";
        let targetUrl = "/";
        switch (lastUsedApp.toUpperCase()) {
          case "MEET":
            targetUrl = "/";
            break;
          case "HEAT":
            targetUrl = "/heat";
            break;
          case "SUITE":
            targetUrl = "/suite";
            break;
          default:
            targetUrl = "/";
        }

        // Set as selected to prevent redirect loops
        sessionStorage.setItem("appModeSelected", "true");

        // Redirect to the appropriate app
        setLocation(targetUrl);
        return;
      }
    }
  }, [user, isLoading, setLocation]);

  // Don't render the component if we're still loading or no user
  if (isLoading || !user) {
    return null;
  }

  // Handles app selection - will be passed to the AppModeSelector
  const handleAppSelected = () => {
    sessionStorage.setItem("appModeSelected", "true");
    sessionStorage.removeItem("showingNationalityBeforeAppSelection");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-4 px-3">
      <AnimatePresence>
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <AppModeSelector onSelect={handleAppSelected} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
