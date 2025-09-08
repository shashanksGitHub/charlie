import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import GlobalMessageSplash from "@/components/ui/global-message-splash";
import MentorshipSplash from "@/components/ui/mentorship-splash";
import NetworkingSplash from "@/components/ui/networking-splash";
import JobSplash from "@/components/ui/job-splash";

interface SplashScreenData {
  currentUser: {
    fullName: string;
    photoUrl?: string;
  };
  targetUser: {
    fullName: string;
    photoUrl?: string;
  };
  matchId: number;
  error?: boolean; // Optional flag for error states
  type?: 'meet' | 'mentorship' | 'networking' | 'job'; // New field to specify splash type
}

interface SplashScreenContextType {
  showSplash: (data: SplashScreenData) => void;
  hideSplash: () => void;
}

const SplashScreenContext = createContext<SplashScreenContextType | undefined>(undefined);

export function SplashScreenProvider({ children }: { children: ReactNode }) {
  const [splashData, setSplashData] = useState<SplashScreenData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();

  const showSplash = (data: SplashScreenData) => {
    setSplashData(data);
    setIsVisible(true);
  };

  const hideSplash = () => {
    setIsVisible(false);
    setSplashData(null);
  };

  const handleSplashComplete = () => {
    if (splashData) {
      // CRITICAL FIX: Always navigate to chat, ignore error states
      if (splashData.matchId && splashData.matchId > 0) {
        // Valid matchId - navigate to specific chat
        console.log(`[SPLASH-NAV] Splash complete: Immediately navigating to chat page for ${splashData.type || 'MEET'} match ${splashData.matchId}`);
        console.log(`[SPLASH-NAV] Current location before navigation:`, window.location.pathname);
        
        // Use immediate navigation without any setTimeout delays
        setLocation(`/chat/${splashData.matchId}`);
        
        // Add verification logging
        setTimeout(() => {
          console.log(`[SPLASH-NAV] Location after navigation attempt:`, window.location.pathname);
          console.log(`[SPLASH-NAV] Expected: /chat/${splashData.matchId}, Actual: ${window.location.pathname}`);
        }, 100);
      } else {
        // CRITICAL FIX: No valid matchId, navigate to messages instead of invalid chat
        console.log(`[SPLASH-NAV] No valid matchId, navigating to messages page`);
        if (splashData.type === 'networking' || splashData.type === 'mentorship' || splashData.type === 'job') {
          setLocation("/suite/messages");
        } else {
          setLocation("/messages");
        }
      }
    }
    hideSplash();
  };

  const renderSplash = () => {
    if (!isVisible || !splashData) return null;

    const splashProps = {
      currentUser: splashData.currentUser,
      targetUser: splashData.targetUser,
      onComplete: handleSplashComplete,
      duration: 3000,
    };

    switch (splashData.type) {
      case 'mentorship':
        return <MentorshipSplash {...splashProps} />;
      case 'networking':
        return <NetworkingSplash {...splashProps} />;
      case 'job':
        return <JobSplash {...splashProps} />;
      case 'meet':
      default:
        return <GlobalMessageSplash {...splashProps} />;
    }
  };

  return (
    <SplashScreenContext.Provider value={{ showSplash, hideSplash }}>
      {children}
      {renderSplash()}
    </SplashScreenContext.Provider>
  );
}

export function useSplashScreen() {
  const context = useContext(SplashScreenContext);
  if (context === undefined) {
    throw new Error("useSplashScreen must be used within a SplashScreenProvider");
  }
  return context;
}