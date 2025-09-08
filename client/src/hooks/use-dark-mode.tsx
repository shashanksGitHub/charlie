import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { safeStorageGet, safeStorageSet } from "@/lib/storage-utils";
import DaylightService, { DaylightStatus } from "@/lib/daylight-service";

type DarkModeContextType = {
  darkMode: boolean;
  isDarkMode: boolean;  // Alias for darkMode for better readability
  toggleDarkMode: () => void;
  isAutomaticMode: boolean;
  enableAutomaticMode: () => void;
  disableAutomaticMode: () => void;
  daylightStatus: DaylightStatus | null;
  refreshDaylight: () => Promise<void>;
};

const DarkModeContext = createContext<DarkModeContextType | null>(null);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isAutomaticMode, setIsAutomaticMode] = useState<boolean>(false);
  const [daylightStatus, setDaylightStatus] = useState<DaylightStatus | null>(null);

  // Get user's location for daylight detection
  const getUserLocation = (): string | undefined => {
    return user?.location || user?.countryOfOrigin;
  };

  // Refresh daylight status
  const refreshDaylight = async (forceRefresh: boolean = true): Promise<void> => {
    try {
      const location = getUserLocation();
      console.log('[DARK-MODE] Refreshing daylight status for location:', location, 'Force refresh:', forceRefresh);
      const status = await DaylightService.checkDaylightStatus(location, forceRefresh);
      setDaylightStatus(status);
      
      // If automatic mode is enabled, update dark mode based on daylight
      if (isAutomaticMode && status.isAutomatic) {
        setDarkMode(status.isDark);
        applyDarkMode(status.isDark);
        
        // Save the automatic preference but mark it as automatic
        if (userId) {
          safeStorageSet(`darkMode-${userId}`, status.isDark.toString());
          safeStorageSet(`darkMode-${userId}-automatic`, "true");
        }
      }
    } catch (error) {
      console.error('[DARK-MODE] Error refreshing daylight status:', error);
    }
  };

  // Initialize dark mode from storage with automatic daylight detection
  useEffect(() => {
    const initializeDarkMode = async () => {
      let savedMode = false;
      let automaticMode = false;
      
      // Try to get user-specific setting first if user is logged in
      if (userId) {
        // Check if automatic mode was previously enabled
        const automaticSetting = safeStorageGet(`darkMode-${userId}-automatic`);
        automaticMode = automaticSetting === "true";
        
        // Use safeStorageGet which handles storage quota issues with fallbacks
        const userSetting = safeStorageGet(`darkMode-${userId}`);
        if (userSetting !== null) {
          savedMode = userSetting === "true";
        } else {
          // If no user-specific setting exists, check for global setting
          const globalMode = safeStorageGet("darkMode");
          savedMode = globalMode === "true";
          
          // For new users, enable automatic mode by default
          automaticMode = true;
          
          // Migrate global setting to user-specific setting
          safeStorageSet(`darkMode-${userId}`, savedMode.toString());
          safeStorageSet(`darkMode-${userId}-automatic`, automaticMode.toString());
        }
      } else {
        // Fall back to global setting if no user is logged in
        const globalSetting = safeStorageGet("darkMode");
        if (globalSetting !== null) {
          savedMode = globalSetting === "true";
        }
      }
      
      setIsAutomaticMode(automaticMode);
      
      // If automatic mode is enabled, check daylight status
      if (automaticMode && userId) {
        try {
          const location = getUserLocation();
          console.log('[DARK-MODE] Initial daylight check for location:', location);
          const status = await DaylightService.checkDaylightStatus(location, false); // Don't force refresh on initial load
          setDaylightStatus(status);
          
          if (status.isAutomatic) {
            console.log(`[DARK-MODE] Automatic mode enabled, setting dark mode to ${status.isDark} based on location daylight`);
            savedMode = status.isDark;
            
            // Update storage with automatic preference
            safeStorageSet(`darkMode-${userId}`, savedMode.toString());
          }
        } catch (error) {
          console.error('[DARK-MODE] Error checking initial daylight status:', error);
        }
      }
      
      setDarkMode(savedMode);
      applyDarkMode(savedMode);
    };

    initializeDarkMode();
  }, [userId]);

  // Watch for location changes and refresh daylight status
  useEffect(() => {
    if (!isAutomaticMode || !userId) return;
    
    const currentLocation = getUserLocation();
    
    // If location has changed from what we have cached, force refresh
    if (currentLocation && daylightStatus?.location && currentLocation !== daylightStatus.location) {
      console.log('[DARK-MODE] Location changed from', daylightStatus.location, 'to', currentLocation, '- force refreshing');
      refreshDaylight(true); // Force refresh when location changes
    }
  }, [user?.location, user?.countryOfOrigin, isAutomaticMode, userId, daylightStatus?.location]);

  // Set up automatic refresh every 30 minutes if automatic mode is enabled
  useEffect(() => {
    if (!isAutomaticMode || !userId) return;

    const interval = setInterval(() => {
      refreshDaylight(false); // Regular automatic refresh, no force
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [isAutomaticMode, userId]);

  // Function to apply dark mode to the document
  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }
  };

  // Toggle dark mode and save preference with storage fallback mechanisms
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // When manually toggling, disable automatic mode
    if (isAutomaticMode) {
      setIsAutomaticMode(false);
      if (userId) {
        safeStorageSet(`darkMode-${userId}-automatic`, "false");
      }
      console.log('[DARK-MODE] Manual toggle detected, disabling automatic mode');
    }
    
    // Save as user-specific preference if logged in using safe storage
    if (userId) {
      safeStorageSet(`darkMode-${userId}`, newMode.toString());
    } else {
      safeStorageSet("darkMode", newMode.toString());
    }
    
    applyDarkMode(newMode);
  };

  // Enable automatic daylight-based dark mode
  const enableAutomaticMode = async () => {
    setIsAutomaticMode(true);
    
    if (userId) {
      safeStorageSet(`darkMode-${userId}-automatic`, "true");
    }
    
    console.log('[DARK-MODE] Automatic mode enabled');
    
    // Immediately check daylight status
    await refreshDaylight();
  };

  // Disable automatic mode and keep current manual setting
  const disableAutomaticMode = () => {
    setIsAutomaticMode(false);
    
    if (userId) {
      safeStorageSet(`darkMode-${userId}-automatic`, "false");
    }
    
    console.log('[DARK-MODE] Automatic mode disabled');
  };

  return (
    <DarkModeContext.Provider value={{ 
      darkMode, 
      isDarkMode: darkMode, 
      toggleDarkMode,
      isAutomaticMode,
      enableAutomaticMode,
      disableAutomaticMode,
      daylightStatus,
      refreshDaylight
    }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
}