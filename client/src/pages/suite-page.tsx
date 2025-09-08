import { useAppMode } from "@/hooks/use-app-mode";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SuitePage() {
  const { currentMode, setAppMode } = useAppMode();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // We no longer need to set app mode here
  // The app-selection page handles setting the initial app mode
  // and the protected route prevents direct access to this page

  // Ensure SUITE app mode and store the last used app when visiting the SUITE page with storage quota handling
  useEffect(() => {
    if (user?.id) {
      try {
        // Force SUITE app mode to keep header/navigation consistent during redirects
        if (currentMode !== "SUITE") {
          setAppMode("SUITE");
        }

        // Store the user ID for app mode selection features
        sessionStorage.setItem("userId", user.id.toString());

        // Try to use localStorage but fall back to sessionStorage if quota is exceeded
        try {
          localStorage.setItem("userId", user.id.toString());
          localStorage.setItem(`last_used_app_${user.id}`, "suite");
        } catch (error) {
          console.warn(
            "[STORAGE] localStorage quota exceeded, using sessionStorage fallback",
          );
          sessionStorage.setItem(`last_used_app_${user.id}`, "suite");
        }

        // Ensure app mode is selected (prevents redirect loops)
        sessionStorage.setItem("appModeSelected", "true");

        // Redirect to the network page (main SUITE functionality)
        setLocation("/suite/network");
      } catch (error) {
        console.error("[STORAGE] Error setting storage values:", error);
        // App continues to work even if storage fails
        setLocation("/suite/network");
      }
    }
  }, [user, setLocation]);

  // This component just redirects, so return null
  return null;
}
