import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";

interface LanguageSelectionGuardProps {
  children: React.ReactNode;
}

export function LanguageSelectionGuard({
  children,
}: LanguageSelectionGuardProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { setLanguage, currentLanguage } = useLanguage();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldBlockChildren, setShouldBlockChildren] = useState(false);

  useEffect(() => {
    // Synchronous check to avoid flicker on pages like /auth
    const hasCompleted =
      localStorage.getItem("charley_language_selection_completed") === "true";
    const selected = localStorage.getItem("charley_selected_app_language");

    // If we're already on the language selection page, no guard overlay
    if (location === "/language-selection") {
      // On the language page itself, never block children
      setIsChecking(false);
      setShouldBlockChildren(false);
      return;
    }

    if (hasCompleted) {
      // Load saved language in background if different, but don't block UI
      if (selected && currentLanguage?.code !== selected) {
        (async () => {
          try {
            await setLanguage(selected);
          } catch (error) {
            console.error("Failed to load saved language:", error);
          }
        })();
      }
      setIsChecking(false);
      return;
    }

    // Not completed -> redirect; block children immediately to avoid auth flash
    console.log(
      "[LANGUAGE-GUARD] User has not completed language selection, redirecting...",
    );
    setShouldBlockChildren(true);
    setLocation("/language-selection");
    // Keep isChecking true until navigation occurs (component will unmount)
  }, [location, setLocation, setLanguage, currentLanguage?.code]);

  // If we're on the language page, render children immediately
  if (location === "/language-selection") {
    return <>{children}</>;
  }

  // Show loading while checking or while redirecting (and block children)
  if (isChecking || shouldBlockChildren) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
