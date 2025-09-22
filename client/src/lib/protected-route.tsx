import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SuspendedAccountScreen } from "@/components/ui/suspended-account-screen";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // CRITICAL FIX: Better loading state handling
  if (isLoading || isRedirecting) {
    // For chat routes, skip loading screen entirely to prevent intermediate screens
    if (path === "/chat/:matchId") {
      return (
        <Route path={path}>
          <Component />
        </Route>
      );
    }

    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Route>
    );
  }

  // CRITICAL FIX: Skip auth redirect for chat routes to prevent navigation blocking
  if (!user) {
    // For chat routes, allow component to render and handle auth internally
    if (path === "/chat/:matchId") {
      return (
        <Route path={path}>
          <Component />
        </Route>
      );
    }

    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user is suspended
  if (user.isSuspended) {
    const suspensionExpiresAt = user.suspensionExpiresAt
      ? new Date(user.suspensionExpiresAt)
      : null;
    const now = new Date();

    // If suspension has expired, allow access (should be handled server-side too)
    if (suspensionExpiresAt && now > suspensionExpiresAt) {
      // Suspension expired, let them through
    } else {
      // Show suspended account screen
      const { logoutMutation } = useAuth();
      return (
        <Route path={path}>
          <SuspendedAccountScreen
            user={user}
            onLogout={() => logoutMutation.mutate()}
          />
        </Route>
      );
    }
  }

  // SIMPLIFIED APP SELECTION LOGIC
  // This is an app page (MEET, HEAT, SUITE)
  const isAppPage = path === "/" || path === "/heat" || path === "/suite";

  // If user is navigating directly within the app, mark app as selected
  // This prevents redirects when clicking navigation icons like Discover
  const isUsingAppNavigation =
    // Check if we're on any app-internal page that has menu navigation
    location === "/messages" ||
    location === "/matches" ||
    location === "/profile" ||
    location === "/settings";

  // If user is actively using the app, consider it as having selected the app
  if (isUsingAppNavigation && user?.id) {
    sessionStorage.setItem("appModeSelected", "true");
  }

  // User has previously confirmed their app selection
  const hasSelectedApp = sessionStorage.getItem("appModeSelected") === "true";

  // User preference for showing the app selection screen
  // Use only user object, no localStorage fallback
  const shouldSkipAppSelection = user.showAppModeSelection === false;

  // User preference for showing nationality selection screen
  // Use only user object, no localStorage fallback
  const shouldShowNationality = user.showNationalitySelection !== false;

  // ENHANCED DEBUG: Check the exact values and types
  console.log("[TOGGLE-DEBUG] Raw user object:", user);
  console.log(
    "[TOGGLE-DEBUG] showAppModeSelection value:",
    user.showAppModeSelection,
  );
  console.log(
    "[TOGGLE-DEBUG] showAppModeSelection type:",
    typeof user.showAppModeSelection,
  );
  console.log(
    "[TOGGLE-DEBUG] showNationalitySelection value:",
    user.showNationalitySelection,
  );
  console.log(
    "[TOGGLE-DEBUG] showNationalitySelection type:",
    typeof user.showNationalitySelection,
  );
  console.log(
    "[TOGGLE-DEBUG] shouldSkipAppSelection result:",
    shouldSkipAppSelection,
  );
  console.log(
    "[TOGGLE-DEBUG] shouldShowNationality result:",
    shouldShowNationality,
  );

  // Check if nationality selection was completed this session
  // This helps prevent redirect loops between nationality and app selection
  const nationalityCompleted =
    sessionStorage.getItem("nationalitySelectionCompleted") === "true";

  // Debug info with expanded information for troubleshooting
  console.log("ProtectedRoute check:", {
    userId: user.id,
    path: path,
    location: location,
    isAppPage: isAppPage,
    isUsingAppNavigation: isUsingAppNavigation,
    hasSelectedApp: hasSelectedApp,
    userPreferences: {
      showAppModeSelection: user.showAppModeSelection,
      showNationalitySelection: user.showNationalitySelection,
    },
    shouldSkipAppSelection: shouldSkipAppSelection,
    shouldShowNationality: shouldShowNationality,
    nationalityCompleted: nationalityCompleted,
    sessionStorage: {
      appModeSelected: sessionStorage.getItem("appModeSelected"),
      nationalitySelectionCompleted: sessionStorage.getItem(
        "nationalitySelectionCompleted",
      ),
      showingNationalityBeforeAppSelection: sessionStorage.getItem(
        "showingNationalityBeforeAppSelection",
      ),
    },
  });

  // Check if user has a last used app saved (from user object only, fallback to 'meet' if not present)
  let lastUsedApp = (user as any).lastUsedApp || "meet";
  lastUsedApp = lastUsedApp.toLowerCase();
  const hasLastUsedApp = !!lastUsedApp;

  // CRITICAL: Check toggle-specific scenarios FIRST before generic redirects
  // This prevents conflicts where generic logic overrides user preferences

  if (isAppPage && !hasSelectedApp && !isUsingAppNavigation) {
    // SCENARIO 4: Both toggles OFF - Skip all selection screens, go directly to last used app
    // This must be checked FIRST to prevent conflicts with auth page logic
    // Also check for directAppRedirect flag from auth page for seamless flow
    const isDirectRedirect =
      sessionStorage.getItem("directAppRedirect") === "true";

    if (shouldSkipAppSelection && !shouldShowNationality) {
      console.log(
        `[APP-FLOW] Both toggles disabled for user ${user.id}, using last app: ${lastUsedApp}`,
      );
      console.log(`[APP-FLOW] Direct redirect flag: ${isDirectRedirect}`);

      sessionStorage.setItem("appModeSelected", "true");

      // Clean up the direct redirect flag since we're handling it
      if (isDirectRedirect) {
        try {
          sessionStorage.removeItem("directAppRedirect");
          console.log("[APP-FLOW] Cleaned up directAppRedirect flag");
        } catch (e) {
          console.warn("[STORAGE] Failed to remove directAppRedirect flag:", e);
        }
      }

      // Add a small delay to ensure auth page navigation completes smoothly
      if (isDirectRedirect) {
        setIsRedirecting(true);
        setTimeout(() => {
          setIsRedirecting(false);
        }, 100);
      }

      return (
        <Route path={path}>
          <Redirect to={lastUsedApp === "meet" ? "/" : `/${lastUsedApp}`} />
        </Route>
      );
    }

    // SCENARIO 3: App selection OFF, nationality ON, last app is MEET
    if (
      shouldSkipAppSelection &&
      shouldShowNationality &&
      !nationalityCompleted &&
      lastUsedApp === "meet"
    ) {
      try {
        sessionStorage.setItem("showingNationalityBeforeAppSelection", "true");
      } catch (e) {
        console.warn("[STORAGE] Failed to set nationality flag:", e);
      }
      console.log(
        `[APP-FLOW] Showing nationality selection screen for user ${user.id} before MEET app`,
      );
      return (
        <Route path={path}>
          <Redirect to="/nationality" />
        </Route>
      );
    }

    // SCENARIO 1 & 2: App selection is ON (nationality is either OFF or completed)
    if (!shouldSkipAppSelection) {
      console.log(
        `[APP-FLOW] Showing app selection screen for user ${user.id}`,
      );
      return (
        <Route path={path}>
          <Redirect to="/app-selection" />
        </Route>
      );
    }

    // SCENARIO 3b: App selection OFF, nationality ON, but last app is NOT MEET (skip nationality for non-MEET apps)
    if (hasLastUsedApp) {
      console.log(
        `[APP-FLOW] App selection disabled, using last app: ${lastUsedApp} (skipping nationality for non-MEET app)`,
      );
      sessionStorage.setItem("appModeSelected", "true");
      return (
        <Route path={path}>
          <Redirect to={lastUsedApp === "meet" ? "/" : `/${lastUsedApp}`} />
        </Route>
      );
    }
  }

  // FALLBACK: Generic last-used-app redirect (only if no toggle-specific logic applied)
  // This should rarely be reached now that toggle logic is prioritized
  if (isAppPage && hasLastUsedApp && !hasSelectedApp && !isUsingAppNavigation) {
    console.log(
      `[ROUTE] FALLBACK: User ${user.id} being redirected to last used app: ${lastUsedApp}`,
    );
    sessionStorage.setItem("appModeSelected", "true");

    // Go directly to the last used app
    return (
      <Route path={path}>
        <Redirect to={lastUsedApp === "meet" ? "/" : `/${lastUsedApp}`} />
      </Route>
    );
  }

  // If user is on app selection page and has chosen to skip it,
  // redirect them to their last used app
  if (path === "/app-selection" && shouldSkipAppSelection) {
    const appToShow = lastUsedApp || "meet";
    sessionStorage.setItem("appModeSelected", "true");

    return (
      <Route path={path}>
        <Redirect to={appToShow === "meet" ? "/" : `/${appToShow}`} />
      </Route>
    );
  }

  // Render the actual component with a simple fade-in
  return (
    <Route path={path}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full"
      >
        <Component />
      </motion.div>
    </Route>
  );
}
