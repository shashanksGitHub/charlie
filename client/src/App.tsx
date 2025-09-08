import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import MessagesPage from "@/pages/messages-page";
import ChatPage from "@/pages/chat-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import VerifyIdPage from "@/pages/verify-id-page";
import PaymentPage from "@/pages/payment-page";
import DatingPreferencesPage from "@/pages/dating-preferences-page";
import MatchesPage from "@/pages/matches-page";
import AdminPage from "@/pages/admin-page";
import HeatPage from "@/pages/heat-page";
import SuitePage from "@/pages/suite-page";
import SuiteNetworkPage from "@/pages/suite-network-page";
import SuiteConnectionsPage from "@/pages/suite-connections-page";
import LanguageSelectionPage from "@/pages/language-selection-page";
import { LanguageSelectionGuard } from "@/components/language-selection-guard";

import SuiteCompatibilityPage from "@/pages/suite-compatibility-page";
import SuiteMentorshipCompatibilityPage from "@/pages/suite-mentorship-compatibility-page";
import JobsCompatibilityReview from "@/pages/jobs-compatibility-review";
import ConnectionsPreferences from "@/pages/connections-preferences";
import AppSelectionPage from "@/pages/app-selection-page";
import MatchDashboard from "@/pages/match-dashboard";
import MatchingEngineTest from "@/pages/matching-engine-test";
import ContentAnalysis from "@/pages/content-analysis";
import KwameChatPage from "@/pages/kwame-chat-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { WebSocketProvider } from "./hooks/use-websocket";
import { AppModeProvider, useAppMode } from "./hooks/use-app-mode";
import { DarkModeProvider } from "./hooks/use-dark-mode";
import { LanguageProvider } from "./hooks/use-language";
import { MatchCountProvider } from "./hooks/use-match-count";
import { NationalityProvider, useNationality } from "./hooks/use-nationality";
import { usePersistentMessages } from "./hooks/use-persistent-messages"; // New enhanced message persistence
import { SplashScreen } from "@/components/splash-screen";
import { AppTransition } from "@/components/app-transition";
import { SplashScreenProvider } from "@/contexts/splash-screen-context";
import { SharedHighSchoolProvider } from "@/hooks/use-shared-high-school";
import { SharedCollegeUniversityProvider } from "@/hooks/use-shared-college-university";
import { SuiteMatchProvider } from "@/hooks/use-suite-match-notifications";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
} from "./lib/storage-utils";
import { TransitionGuard } from "@/components/transition-guard";

import { MatchCountLoader } from "@/components/match-count-loader";
import GlobalMatchPopup from "@/components/ui/global-match-popup";
import GlobalNotificationToast from "@/components/ui/global-notification-toast";
import { GlobalIncomingCall } from "@/components/ui/global-incoming-call";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
// Import WebSocket initialization
import initializeWebSockets from "@/lib/websocket-init";
// Import nationality selection components
import CountrySelector from "@/components/nationality/country-selector";
import NationalitySplash from "@/components/nationality/nationality-splash";
import { FloatingKwameButton } from "@/components/kwame/floating-kwame-button";

// Loading fallback for app mode transitions
function AppModeLoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading app...</p>
      </div>
    </div>
  );
}

// Nationality Selection Page Component for direct access via URL
function NationalitySelectionPage() {
  const { country, setCountry } = useNationality();
  const [, setLocation] = useLocation();
  const [selectedCountry, setSelectedCountry] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialCountry] = useState(country); // Store the initial country when component mounts
  const [showCloseButton, setShowCloseButton] = useState(true); // Control close button visibility

  // Preload the content and immediately set as loaded
  useEffect(() => {
    // Set session-based flag to track nationality selection in progress
    // Using sessionStorage to prevent persistence across sessions
    try {
      sessionStorage.setItem("showingNationalityBeforeAppSelection", "true");
    } catch (error) {
      console.warn("[STORAGE] Failed to set nationality flag:", error);
    }

    // Check if we're coming from app selection (new user flow)
    // In this case, hide the close button since user must complete nationality selection
    const fromAppSelection =
      sessionStorage.getItem("fromAppSelection") === "true";
    if (fromAppSelection) {
      setShowCloseButton(false);
      console.log(
        "[NATIONALITY] Coming from app selection - hiding close button",
      );
    }

    // Use a minimal timeout to ensure the component is mounted before animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  const handleCountrySelected = (country: string) => {
    setSelectedCountry(country);
    setCountry(country);
    setShowConfirmation(true);
  };

  const handleConfirmationComplete = async () => {
    // Mark nationality selection as completed in sessionStorage to prevent redirect loops
    try {
      sessionStorage.setItem("nationalitySelectionCompleted", "true");

      // Clean up flags to prevent redirect loops
      sessionStorage.removeItem("showingNationalityBeforeAppSelection");
      sessionStorage.removeItem("fromAppSelection"); // Clean up the flag we set
      safeStorageRemove("skipSplashScreen");

      // Log for debugging
      console.log(
        "[NATIONALITY] Selection completed, redirecting to next step",
      );
    } catch (error) {
      console.warn("[STORAGE] Failed to clean up nationality flags:", error);
    }

    // Check if the user has just logged in
    const comingFromLogin =
      sessionStorage.getItem("showingNationalityAfterLogin") === "true";
    if (comingFromLogin) {
      // Clean up the login flag
      sessionStorage.removeItem("showingNationalityAfterLogin");
      console.log("[NATIONALITY] Coming from login, cleaning up flag");
    }

    // Get user ID and app selection preferences
    const storedUserId = safeStorageGet("userId");

    if (storedUserId) {
      // Save selected country preference for the user (for location preferences only)
      try {
        localStorage.setItem(`nationality_${storedUserId}`, selectedCountry);
        console.log(
          `[LOCATION-PREFERENCE] Successfully saved ${selectedCountry} as location preference`,
        );
      } catch (error) {
        console.warn(
          "[STORAGE] Failed to save location preference for user:",
          error,
        );
      }

      // Check if we should skip app selection
      const skipAppSelection =
        localStorage.getItem(`show_app_mode_selection_${storedUserId}`) ===
        "false";

      if (skipAppSelection) {
        // If user wants to skip app selection, go to their last used app
        let lastUsedApp =
          localStorage.getItem(`last_used_app_${storedUserId}`) || "meet";
        lastUsedApp = lastUsedApp.toLowerCase();
        console.log(
          `[NATIONALITY] Redirecting to last used app: ${lastUsedApp}`,
        );
        setLocation(lastUsedApp === "meet" ? "/" : `/${lastUsedApp}`);
      } else {
        // Otherwise go to app selection
        console.log("[NATIONALITY] Redirecting to app selection");
        setLocation("/app-selection");
      }
    } else {
      // For users without a stored ID (new users), go to app selection
      console.log("[NATIONALITY] No user ID found, going to app selection");
      setLocation("/app-selection");
    }
  };

  // Handle close button click - return to previous page
  const handleClose = () => {
    // Mark nationality selection as completed in sessionStorage to prevent redirect loops
    try {
      sessionStorage.setItem("nationalitySelectionCompleted", "true");

      // Clean up flags to prevent redirect loops
      sessionStorage.removeItem("showingNationalityBeforeAppSelection");
      safeStorageRemove("skipSplashScreen");
    } catch (error) {
      console.warn("[STORAGE] Failed to clean up nationality flags:", error);
    }

    // Get previous page from storage or default to app page
    const previousPage = safeStorageGet("previousPage") || "/";
    console.log("[APP] Returning to previous page:", previousPage);

    // Navigate back
    setLocation(previousPage);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated background with graceful loading (reduced on mobile) */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-violet-900"></div>

        {/* Animated particles (disabled on small screens) */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          {typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(min-width: 640px)").matches &&
            [...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: 2,
                  height: 2,
                  left: Math.random() * 100 + "%",
                  top: Math.random() * 100 + "%",
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.4, 0],
                  y: [0, -20],
                  scale: [1, 1.1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  delay: (i % 6) * 0.5,
                  ease: "easeInOut",
                }}
              />
            ))}
        </motion.div>

        {/* Light orbs (reduced blur on mobile) */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-blue-500/10 sm:blur-[100px] blur-[20px]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 2.5 }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/15 sm:blur-[100px] blur-[20px]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.7, scale: 1 }}
          transition={{ duration: 3, delay: 0.5 }}
        />
      </motion.div>

      {/* Close button - conditionally rendered */}
      {showCloseButton && (
        <motion.button
          className="absolute top-2 right-4 bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-full z-50 
                   hover:bg-opacity-30 transition-all duration-300 shadow-lg"
          onClick={handleClose}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        {!showConfirmation ? (
          <motion.div
            key="country-selector"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: isLoaded ? 1 : 0,
              scale: isLoaded ? 1 : 0.6,
              rotateY: isLoaded ? 0 : 15,
              y: isLoaded ? 0 : 20,
            }}
            exit={{
              opacity: 0,
              scale: 0.6,
              y: 10,
            }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 60,
              damping: 14,
            }}
            className="w-full flex items-center justify-center"
          >
            <CountrySelector
              onComplete={handleCountrySelected}
              initialCountry={initialCountry}
            />
          </motion.div>
        ) : (
          <motion.div
            key="nationality-splash"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -20 }}
            transition={{
              duration: 0.7,
              type: "spring",
              stiffness: 60,
              damping: 14,
            }}
            className="w-full flex items-center justify-center z-10"
          >
            <NationalitySplash
              country={selectedCountry}
              onComplete={handleConfirmationComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  // If user is not logged in and not on auth or language selection page, redirect to auth
  // This ensures the auth page shows up in the preview panel
  if (
    !isLoading &&
    !user &&
    location !== "/auth" &&
    location !== "/language-selection"
  ) {
    return <Redirect to="/auth" />;
  }

  return (
    <Switch>
      <Route path="/language-selection" component={LanguageSelectionPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/nationality">
        {(params) => <NationalitySelectionPage />}
      </Route>
      <ProtectedRoute path="/app-selection" component={AppSelectionPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/heat" component={HeatPage} />
      <ProtectedRoute path="/suite" component={SuitePage} />
      <ProtectedRoute path="/suite/discover" component={SuiteNetworkPage} />
      <ProtectedRoute path="/suite/network" component={SuiteNetworkPage} />
      <ProtectedRoute
        path="/suite/connections"
        component={SuiteConnectionsPage}
      />
      <ProtectedRoute
        path="/suite-connections"
        component={SuiteConnectionsPage}
      />

      <ProtectedRoute
        path="/suite/compatibility/:targetProfileId"
        component={SuiteCompatibilityPage}
      />
      <ProtectedRoute
        path="/suite/mentorship/compatibility/:targetProfileId"
        component={SuiteMentorshipCompatibilityPage}
      />
      <ProtectedRoute
        path="/suite/jobs/review/:userId"
        component={JobsCompatibilityReview}
      />

      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/matches" component={MatchesPage} />
      <ProtectedRoute path="/chat/:matchId" component={ChatPage} />
      <ProtectedRoute
        path="/match-dashboard/:matchId"
        component={MatchDashboard}
      />
      <ProtectedRoute
        path="/match-dashboard/users/:userId1/:userId2"
        component={MatchDashboard}
      />
      <ProtectedRoute path="/profile/:id?" component={ProfilePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/verify-id" component={VerifyIdPage} />
      <ProtectedRoute path="/payment" component={PaymentPage} />
      <ProtectedRoute
        path="/dating-preferences"
        component={DatingPreferencesPage}
      />
      <ProtectedRoute
        path="/suite/connections-preferences"
        component={ConnectionsPreferences}
      />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/content-analysis" component={ContentAnalysis} />
      <ProtectedRoute
        path="/matching-engine-test"
        component={MatchingEngineTest}
      />
      <ProtectedRoute path="/kwame-chat" component={KwameChatPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Get user information upfront for decision making
  const storedUserId = safeStorageGet("userId");
  const [location] = useLocation();
  const { user } = useAuth();

  // Check if we should skip the splash screen
  // Skip if flag is set (when clicking flag in header) OR user is already logged in
  const shouldSkipSplash =
    safeStorageGet("skipSplashScreen") === "true" || !!storedUserId;

  // For existing users, we'll skip splash screen
  const [showSplash, setShowSplash] = useState(!shouldSkipSplash);
  const {
    currentMode,
    setAppMode,
    isTransitioning,
    transitionMode,
    completeTransition,
  } = useAppMode();

  // CRITICAL FIX: Initialize global message persistence system to prevent messages from disappearing
  // This hooks into login/logout and ensures messages are properly cached and rehydrated
  const { isMessageSystemInitialized } = usePersistentMessages();

  // Log message system status for debugging
  useEffect(() => {
    console.log(
      `[APP] Message persistence system initialized: ${isMessageSystemInitialized}`,
    );
  }, [isMessageSystemInitialized]);

  // Initialize global WebSocket service for reliable real-time communication
  useEffect(() => {
    // Initialize WebSocket service when component mounts
    console.log("[APP] Initializing global WebSocket service");
    initializeWebSockets();

    // No cleanup needed as the WebSocket service has its own cleanup
  }, []);

  // Route-aware app mode guard to keep header/navigation in sync with URL
  useEffect(() => {
    // Determine intended app mode from current route
    let intendedMode: "MEET" | "HEAT" | "SUITE" = "MEET";
    if (location.startsWith("/suite")) {
      intendedMode = "SUITE";
    } else if (location.startsWith("/heat")) {
      intendedMode = "HEAT";
    } else {
      intendedMode = "MEET";
    }

    // Do not override the current mode on the generic profile route.
    // The profile page renders mode-specific profile by currentMode,
    // so preserve whatever mode the user is currently in.
    if (location === "/profile" || location === "/messages") {
      intendedMode = currentMode;
    }

    // Avoid changing mode during transition animations
    if (!isTransitioning && currentMode !== intendedMode) {
      setAppMode(intendedMode);
    }
  }, [location, currentMode, isTransitioning, setAppMode]);

  // Check if this is a first-time user or returning user (keep for backward compatibility)
  const isNewUser = !safeStorageGet("charley-user-exists");
  // Check if we're on the app selection page
  const isAppSelectionPage = location === "/app-selection";

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);

    // If this is a new user, mark them as not a new user for future sessions
    if (isNewUser) {
      safeStorageSet("charley-user-exists", "true");
    }
  };

  // Use the storage utilities imported at the top of the file

  // Clean up the skipSplashScreen flag when splash is complete
  useEffect(() => {
    if (!showSplash && shouldSkipSplash) {
      safeStorageRemove("skipSplashScreen");
      console.log("[APP] Cleaned up skipSplashScreen flag");
    }
  }, [showSplash, shouldSkipSplash]);

  // Handle transition animation completion
  const handleTransitionComplete = () => {
    completeTransition();
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background shadow-lg relative">
      {/* Immediate display of content container to prevent blank screen */}
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <AnimatePresence mode="wait">
          {showSplash ? (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{
                opacity: 0,
                scale: 1.05,
                filter: "blur(5px)",
                transition: {
                  opacity: { duration: 0.7, ease: "easeInOut" },
                  scale: { duration: 0.7, ease: "easeInOut" },
                  filter: { duration: 0.7, ease: "easeInOut" },
                },
              }}
            >
              <SplashScreen onAnimationComplete={handleSplashComplete} />
            </motion.div>
          ) : isTransitioning ? (
            <motion.div
              key="app-transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <AppTransition
                appMode={transitionMode || "MEET"}
                onTransitionComplete={handleTransitionComplete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale: [0.98, 1],
                transition: {
                  opacity: { duration: 0.8, ease: "easeOut" },
                  scale: { duration: 0.8, ease: "easeOut" },
                  delay: 0.2,
                },
              }}
            >
              <TransitionGuard>
                <MatchCountLoader />
                <LanguageSelectionGuard>
                  <Router />
                </LanguageSelectionGuard>
              </TransitionGuard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toaster />
      <GlobalMatchPopup />

      <GlobalIncomingCall />
      {/* Global notification system - works across all pages */}
      {user && <GlobalNotificationToast userId={user.id} />}
      {/* Global KWAME AI floating button across MEET/HEAT/SUITE pages */}
      {user &&
        ![
          "/auth",
          "/language-selection",
          "/nationality",
          "/app-selection",
          "/kwame-chat",
        ].includes(location) && (
          <FloatingKwameButton
            currentContext={{
              page: location,
              userProfile: user,
            }}
            // Place KWAME in the middle-right for new users on first run
            defaultPosition={isNewUser ? "right-middle" : "bottom-right"}
          />
        )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DarkModeProvider>
            <LanguageProvider>
              <AppModeProvider>
                <NationalityProvider>
                  <WebSocketProvider>
                    <MatchCountProvider>
                      <SuiteMatchProvider>
                        <SplashScreenProvider>
                          <SharedHighSchoolProvider>
                            <SharedCollegeUniversityProvider>
                              <AppContent />
                            </SharedCollegeUniversityProvider>
                          </SharedHighSchoolProvider>
                        </SplashScreenProvider>
                      </SuiteMatchProvider>
                    </MatchCountProvider>
                  </WebSocketProvider>
                </NationalityProvider>
              </AppModeProvider>
            </LanguageProvider>
          </DarkModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
