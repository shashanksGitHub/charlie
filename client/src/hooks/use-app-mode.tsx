import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/lib/storage-utils";

// Define app modes
export type AppMode = 'MEET' | 'HEAT' | 'SUITE';

type AppModeContextType = {
  currentMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  isTransitioning: boolean;
  transitionMode: AppMode | null;
  startTransition: (mode: AppMode) => void;
  completeTransition: () => void;
};

const AppModeContext = createContext<AppModeContextType | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Get the stored mode or default to MEET
  const [currentMode, setCurrentMode] = useState<AppMode>('MEET');
  // Add transition states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMode, setTransitionMode] = useState<AppMode | null>(null);

  // Initialize the mode from localStorage if available
  useEffect(() => {
    // Try user-specific value first
    if (userId) {
      // First check for the last-used-app key (newer format)
      const lastUsedApp = safeStorageGet(`last_used_app_${userId}`);
      if (lastUsedApp) {
        // Convert to proper app mode format (uppercase)
        const appMode = lastUsedApp.toUpperCase() as AppMode;
        if (['MEET', 'HEAT', 'SUITE'].includes(appMode)) {
          console.log(`[APP-MODE] Using last used app for user ${userId}: ${appMode}`);
          setCurrentMode(appMode);
          return;
        }
      }
      
      // Fall back to older user-specific format
      const userStoredMode = safeStorageGet(`charley-app-mode-${userId}`) as AppMode | null;
      if (userStoredMode && ['MEET', 'HEAT', 'SUITE'].includes(userStoredMode)) {
        console.log(`[APP-MODE] Using stored app mode for user ${userId}: ${userStoredMode}`);
        setCurrentMode(userStoredMode);
        
        // Also update the last_used_app format for consistency
        safeStorageSet(`last_used_app_${userId}`, userStoredMode.toLowerCase());
        return;
      }
    }
    
    // Fall back to global value if no user-specific value is available
    const storedMode = safeStorageGet('charley-app-mode') as AppMode | null;
    if (storedMode && ['MEET', 'HEAT', 'SUITE'].includes(storedMode)) {
      setCurrentMode(storedMode);
      
      // If we have a userId, migrate the global setting to a user-specific one
      if (userId) {
        safeStorageSet(`charley-app-mode-${userId}`, storedMode);
        safeStorageSet(`last_used_app_${userId}`, storedMode.toLowerCase());
      }
    }
  }, [userId]);

  // Function to change the app mode and save it with fallback
  const setAppMode = (mode: AppMode) => {
    setCurrentMode(mode);
    
    // Save with user-specific key if user is logged in
    if (userId) {
      // Save the current app mode in user-specific storage
      safeStorageSet(`charley-app-mode-${userId}`, mode);
      
      // Also save as the last used app for direct navigation on next login
      const appName = mode.toLowerCase();
      safeStorageSet(`last_used_app_${userId}`, appName);
      
      // Enable skipping the app selection screen on next login
      safeStorageSet(`show_app_mode_selection_${userId}`, 'false');
      
      console.log(`[APP-MODE] User ${userId} set app mode to ${mode}, will use this on next login`);
    } else {
      // For non-logged in users, use global storage
      safeStorageSet('charley-app-mode', mode);
    }
  };

  // Function to start the transition animation
  const startTransition = (mode: AppMode) => {
    setTransitionMode(mode);
    setIsTransitioning(true);
  };

  // Function to complete the transition and change the mode
  const completeTransition = () => {
    if (transitionMode) {
      setAppMode(transitionMode);
    }
    setIsTransitioning(false);
    setTransitionMode(null);
  };

  return (
    <AppModeContext.Provider
      value={{
        currentMode,
        setAppMode,
        isTransitioning,
        transitionMode,
        startTransition,
        completeTransition,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}