import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAppMode } from "@/hooks/use-app-mode";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import {
  useUnifiedHomeData,
  UnifiedHomeData,
} from "@/hooks/use-unified-home-data";
import { User } from "@shared/schema";
import { SwipeCard } from "@/components/ui/swipe-card";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { AppHeader } from "@/components/ui/app-header";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import { ProfileActivationModal } from "@/components/ui/profile-activation-modal";
import { PremiumUpgradeDialog } from "@/components/settings/premium-upgrade-dialog";
import { useToast } from "@/hooks/use-toast";
// import { FloatingKwameButton } from "@/components/kwame/floating-kwame-button";

// Function to generate standard user profile fields that meet our TypeScript requirements
const createStandardUserProfile = (profileData: Partial<User>): User => {
  // Default values that meet the User type requirements
  const baseProfile: User = {
    id: 0,
    username: "",
    password: "",
    fullName: "",
    email: "",
    phoneNumber: null,
    gender: "",
    location: "",
    countryOfOrigin: null,
    bio: null,
    profession: null,
    ethnicity: null,
    secondaryTribe: null,
    religion: null,
    photoUrl: null,
    showProfilePhoto: false,
    dateOfBirth: null,
    relationshipStatus: null,
    relationshipGoal: null,
    interests: null,
    visibilityPreferences: null,
    verifiedByPhone: false,
    twoFactorEnabled: false,
    isOnline: false,
    lastActive: null,
    createdAt: new Date(),
    showAppModeSelection: false,
    showNationalitySelection: false,
    profileHidden: false,
    ghostMode: false,
    lastUsedApp: null,
    hasActivatedProfile: false,
  };

  // Create default visibility preferences
  const defaultVisibility = {
    residence: true,
    countryOfOrigin: true,
    tribe: false,
    profession: false,
    religion: false,
    bio: false,
    relationshipStatus: false,
    relationshipGoal: false,
    interests: true,
  };

  return {
    ...baseProfile,
    ...profileData,
    visibilityPreferences: profileData.visibilityPreferences
      ? JSON.stringify(JSON.parse(profileData.visibilityPreferences))
      : JSON.stringify(defaultVisibility),
  };
};

export default function HomePage() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const { currentMode, setAppMode } = useAppMode();
  const [, setLocation] = useLocation();
  const { translate } = useLanguage();
  const { darkMode } = useDarkMode();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hideConnectionAlert, setHideConnectionAlert] = useState(false);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);

  // Track this page as last app page and update origin for navigation chain
  useEffect(() => {
    const computeHeight = () => {
      const vv = (window as any).visualViewport;
      const viewportHeight = vv?.height || window.innerHeight;
      const header = document.getElementById("app-header");
      const footer = document.getElementById("bottom-navigation");
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const footerH = footer ? footer.getBoundingClientRect().height : 0;
      const safeBottom =
        Number(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--safe-area-inset-bottom")
            .replace("px", ""),
        ) ||
        Number((window as any).env?.safeAreaInsetBottom) ||
        0;
      const calc = Math.floor(viewportHeight - headerH - footerH - safeBottom);
      setAvailableHeight(calc > 0 ? calc : null);
    };

    computeHeight();
    const vv = (window as any).visualViewport;
    vv?.addEventListener("resize", computeHeight);
    window.addEventListener("orientationchange", computeHeight);
    window.addEventListener("resize", computeHeight);
    return () => {
      vv?.removeEventListener("resize", computeHeight);
      window.removeEventListener("orientationchange", computeHeight);
      window.removeEventListener("resize", computeHeight);
    };
  }, []);
  useEffect(() => {
    // Debug navigation tracking BEFORE making changes
    const previousLastPage = localStorage.getItem("last_app_page");
    const previousOriginPage = localStorage.getItem("origin_app_page");

    // Track this as the last app page visited (MEET app loads at root path)
    localStorage.setItem("last_app_page", "/");

    // Always update origin page when visiting app pages (this is the new source for navigation chains)
    localStorage.setItem("origin_app_page", "/");

    console.log("[HOME-PAGE] 🔍 Page Visit Debug");
    console.log("[HOME-PAGE] Previous last page:", previousLastPage);
    console.log("[HOME-PAGE] Previous origin page:", previousOriginPage);
    console.log("[HOME-PAGE] ✅ Set origin page to / (MEET app root)");
    console.log("[HOME-PAGE] ✅ Set last page to / (MEET app root)");

    if (currentMode && currentMode !== "MEET") {
      console.log(
        `[HOME-PAGE] User is in ${currentMode} mode, redirecting from MEET homepage`,
      );
      if (currentMode === "SUITE") {
        setLocation("/suite");
      } else if (currentMode === "HEAT") {
        setLocation("/heat");
      }
    }
  }, [currentMode, setLocation]);

  // State for undo functionality - track multiple swiped users in a stack
  // Supports both client-side (with user object) and server-side (with targetUserId) structures
  const [swipeHistory, setSwipeHistory] = useState<
    Array<{
      id: number;
      user?: User;
      targetUserId?: number;
      action: "like" | "dislike";
      timestamp: number;
    }>
  >([]);

  // Use unified data hook for better performance
  const {
    data: unifiedData,
    isLoading,
    isError,
    error,
    refetch: refetchUnifiedData,
  } = useUnifiedHomeData();

  // Extract individual data pieces from unified response
  const discoverUsers = unifiedData?.discoverUsers;
  const persistentHistory = unifiedData?.swipeHistory;
  const premiumStatus = unifiedData?.premiumStatus;
  const refetchDiscoverUsers = refetchUnifiedData;
  const refetchHistory = refetchUnifiedData;

  // Sync persistent history with local state when data loads
  useEffect(() => {
    if (persistentHistory && Array.isArray(persistentHistory)) {
      console.log(
        `[MEET-HISTORY] Syncing ${persistentHistory.length} records from unified API`,
      );
      const syncedHistory = persistentHistory.map((item: any) => ({
        id: item.id,
        targetUserId: item.targetUserId,
        action: item.action,
        timestamp: new Date(item.timestamp).getTime(),
      }));
      setSwipeHistory(syncedHistory);
      console.log(
        `[MEET-HISTORY] Swipe history updated with ${syncedHistory.length} records`,
      );
    } else if (persistentHistory && persistentHistory.length === 0) {
      setSwipeHistory([]);
      console.log("[MEET-HISTORY] Cleared local history - database is empty");
    }
  }, [persistentHistory]);

  // Store the last used app when visiting the MEET homepage
  useEffect(() => {
    if (user?.id) {
      try {
        sessionStorage.setItem("userId", user.id.toString());
        sessionStorage.setItem("appModeSelected", "true");
        sessionStorage.setItem(`last_used_app_${user.id}`, "meet");
      } catch (error) {
        console.warn("Storage error in home page:", error);
      }
      refetchDiscoverUsers();
    }
  }, [user, refetchDiscoverUsers]);

  // Track removed users for undo functionality
  const [removedUsers, setRemovedUsers] = useState<
    { user: User; action: "like" | "dislike" | "message" }[]
  >([]);

  // Premium functionality state from unified data
  const isPremium = premiumStatus?.premiumAccess || false;
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const { toast } = useToast();

  // Handle premium upgrade click
  const handlePremiumUpgradeClick = () => {
    setShowPremiumDialog(true);
  };

  // Track animation state for card restoration
  const [restoreAnimationClass, setRestoreAnimationClass] =
    useState<string>("");

  // Track animation state for next card entrance
  const [nextCardAnimationClass, setNextCardAnimationClass] =
    useState<string>("");

  // Force re-render trigger for WebSocket events
  const [forceRenderTrigger, setForceRenderTrigger] = useState<number>(0);

  // Profile activation modal state
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Check if user needs to activate profile
  useEffect(() => {
    if (user && !user.hasActivatedProfile) {
      setShowActivationModal(true);
    }
  }, [user]);

  // 🚀 REAL-TIME CARD REMOVAL: Listen for WebSocket card removal events
  useEffect(() => {
    const handleCardRemoval = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { removeUserId, reason, timestamp } = event.detail;
        console.log(
          `🗑️ [DISCOVER-REMOVAL] Received card removal for user ${removeUserId}, reason: ${reason}`,
        );

        // CRITICAL FORCE RE-RENDER FIX: Use requestAnimationFrame to ensure UI updates
        requestAnimationFrame(() => {
          // Force immediate state update to trigger re-render
          setForceRenderTrigger((prev) => prev + 1);

          // Update cache immediately
          queryClient.setQueryData(
            ["/api/home-page-data"],
            (old: UnifiedHomeData) => {
              if (!old) return old;
              const filteredUsers =
                old.discoverUsers?.filter((user) => user.id !== removeUserId) ||
                [];
              console.log(
                `🗑️ [DISCOVER-REMOVAL] Filtered out user ${removeUserId}, ${filteredUsers.length} users remaining`,
              );
              return {
                ...old,
                discoverUsers: filteredUsers,
              };
            },
          );

          // Adjust current index if needed
          setCurrentIndex((prev) => {
            const newUsers = queryClient.getQueryData([
              "/api/home-page-data",
            ]) as UnifiedHomeData;
            const remainingUsers = newUsers?.discoverUsers?.length || 0;

            if (prev >= remainingUsers && remainingUsers > 0) {
              const newIndex = remainingUsers - 1;
              console.log(
                `🗑️ [DISCOVER-REMOVAL] Adjusted current index from ${prev} to ${newIndex}`,
              );
              return newIndex;
            }

            return prev;
          });

          // Force query invalidation and refetch
          queryClient.invalidateQueries({ queryKey: ["/api/home-page-data"] });
        });
      }
    };

    // Listen for card removal events from WebSocket
    window.addEventListener("discover:card_removal", handleCardRemoval);

    return () => {
      window.removeEventListener("discover:card_removal", handleCardRemoval);
    };
  }, [queryClient]);

  // 🚀 REAL-TIME CARD RESTORATION: Listen for WebSocket card restoration events
  useEffect(() => {
    const handleCardRestoration = async (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { userId, reason, timestamp } = event.detail;
        console.log(
          `🔄 [MEET-RESTORATION] Received card restoration for user ${userId}, reason: ${reason}`,
        );

        // CRITICAL FIX: Force immediate cache invalidation and data refresh
        console.log(
          `🔄 [MEET-RESTORATION] Forcing immediate cache refresh for user ${userId}`,
        );

        // Invalidate and refetch the home page data immediately
        await queryClient.invalidateQueries({
          queryKey: ["/api/home-page-data"],
          refetchType: "active",
        });

        // Force component re-render to show restored card
        setForceRenderTrigger((prev) => prev + 1);

        console.log(
          `🔄 [MEET-RESTORATION] Cache invalidated and component re-render triggered for user ${userId}`,
        );
      }
    };

    // Listen for card restoration events from WebSocket (using correct event name)
    window.addEventListener("meet:restore_to_discover", handleCardRestoration);

    // BACKUP: Also listen for generic discover refresh events as fallback
    window.addEventListener("discover:refresh", handleCardRestoration);

    // DEBUGGING: Add console log to verify event listener is registered
    console.log(
      "🔄 [MEET-RESTORATION] Event listeners registered for meet:restore_to_discover and discover:refresh",
    );

    return () => {
      window.removeEventListener(
        "meet:restore_to_discover",
        handleCardRestoration,
      );
      window.removeEventListener("discover:refresh", handleCardRestoration);
    };
  }, [queryClient]);

  // Handle profile activation
  const handleProfileActivation = () => {
    setShowActivationModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  // Optimistic swipe mutation - instantly removes cards without flickering
  const meetSwipeMutation = useMutation({
    mutationFn: async (variables: {
      userId: number;
      action: "like" | "dislike";
    }) => {
      const response = await apiRequest("/api/swipe", {
        method: "POST",
        data: {
          targetUserId: variables.userId,
          action: variables.action,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to record swipe action");
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent optimistic update conflicts
      await queryClient.cancelQueries({
        queryKey: ["/api/home-page-data"],
      });

      // Snapshot the previous unified data for rollback
      const previousUnifiedData = queryClient.getQueryData([
        "/api/home-page-data",
      ]) as UnifiedHomeData;

      // Find and preserve the complete user data before removal (MEET-style caching)
      const currentUsers = previousUnifiedData?.discoverUsers;
      const swipedUser = currentUsers?.find(
        (user) => user.id === variables.userId,
      );

      // Store the complete user data in a cache for potential undo (same as mentorship system)
      if (swipedUser) {
        // Add swipe direction to user data for synchronized animations
        const userWithDirection = {
          ...swipedUser,
          lastSwipeDirection: variables.action === "like" ? "right" : "left",
        };

        console.log(
          `[MEET-SWIPE] Storing user ${swipedUser.id} with direction: ${userWithDirection.lastSwipeDirection}`,
        );

        queryClient.setQueryData(["/api/meet/removed-users"], (old: any) => {
          const updated = old || [];
          // Keep only last 10 removed users to prevent memory bloat
          const newCache = [userWithDirection, ...updated.slice(0, 9)];
          console.log(
            `[MEET-SWIPE] Updated removed-users cache with ${newCache.length} users`,
          );
          return newCache;
        });
      }

      // Optimistically update the unified cache to remove the swiped user instantly
      queryClient.setQueryData(
        ["/api/home-page-data"],
        (old: UnifiedHomeData) => {
          if (!old) return old;
          return {
            ...old,
            discoverUsers:
              old.discoverUsers?.filter(
                (user) => user.id !== variables.userId,
              ) || [],
          };
        },
      );

      console.log(
        `[MEET-OPTIMISTIC] Instantly removed user ${variables.userId} from unified cache`,
      );

      return { previousUnifiedData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, rollback the optimistic update and clear undo state
      if (context?.previousUnifiedData) {
        queryClient.setQueryData(
          ["/api/home-page-data"],
          context.previousUnifiedData,
        );
        // Clear latest swipe from history on error
        setSwipeHistory((prev) => prev.slice(0, -1));
        console.log(
          `[MEET-OPTIMISTIC] Rolled back user ${variables.userId} due to error`,
        );
      }
    },
    onSettled: () => {
      // No longer invalidating queries to prevent flickering
      // The optimistic updates handle the UI correctly
      // Server filtering will naturally exclude swiped users in future requests
    },
  });

  // Add swipe to database history
  const addSwipeHistoryMutation = useMutation({
    mutationFn: async (variables: {
      targetUserId: number;
      action: "like" | "dislike";
    }) => {
      const response = await apiRequest("/api/swipe/history", {
        method: "POST",
        data: {
          targetUserId: variables.targetUserId,
          action: variables.action,
          appMode: "MEET",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to save swipe history");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refetch history to keep local state in sync
      refetchHistory();
    },
  });

  // Undo mutation - restores the last swiped user and removes their swipe record
  const undoSwipeMutation = useMutation({
    mutationFn: async (variables: {
      userId: number;
      action: "like" | "dislike";
    }) => {
      const response = await apiRequest("/api/swipe/undo", {
        method: "POST",
        data: {
          userId: variables.userId,
          action: variables.action,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to undo swipe action");
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/home-page-data"],
      });

      // Snapshot previous data for rollback
      const previousData = queryClient.getQueryData(["/api/home-page-data"]);

      // Get the most recently removed user with complete data including photos (MEET-style optimistic restoration)
      const removedUsers =
        (queryClient.getQueryData(["/api/meet/removed-users"]) as User[]) || [];
      const userToRestore = removedUsers[0]; // Most recent removal (LIFO)

      // Instantly restore the user with full data (including photos) to prevent loading flash
      if (userToRestore) {
        // Determine animation direction based on last swipe
        const lastSwipeDirection =
          (userToRestore as any).lastSwipeDirection || "right";

        // Set the restore animation based on the direction they were swiped
        const restoreClass =
          lastSwipeDirection === "left"
            ? "card-restore-left"
            : "card-restore-right";
        setRestoreAnimationClass(restoreClass);

        console.log(
          `[MEET-UNDO] Starting restore animation: direction=${lastSwipeDirection}, class=${restoreClass}`,
        );

        queryClient.setQueryData(["/api/home-page-data"], (old: any) => {
          if (!old || !old.discoverUsers) return old;
          // Add restored user to front (LIFO order) with complete data
          return {
            ...old,
            discoverUsers: [userToRestore, ...old.discoverUsers],
          };
        });

        // Remove the restored user from the removed-users cache
        queryClient.setQueryData(["/api/meet/removed-users"], (old: User[]) => {
          if (!old) return [];
          return old.slice(1); // Remove first item (most recent)
        });

        // Clean up animation after restore movement completes
        setTimeout(() => {
          setRestoreAnimationClass("");
          console.log(`[MEET-UNDO] Restore animation completed`);
        }, 300); // Match animation duration

        console.log(
          `[MEET-UNDO] Restore animation started for user ${userToRestore.id} - ${lastSwipeDirection} direction`,
        );
      }

      return { previousData, userToRestore };
    },
    onSuccess: (data, variables, context) => {
      // Server undo completed successfully
      // Remove the undone swipe from history stack (LIFO: remove first element)
      setSwipeHistory((prev) => prev.slice(1));

      // Use optimistic cache update instead of expensive refetch
      queryClient.setQueryData(["/api/swipe/history"], (old: any[]) => {
        if (!old) return [];
        return old.slice(1); // Remove first item (most recent)
      });

      // CRITICAL FIX: Force cache invalidation to fetch fresh discover users from server
      // This ensures the undone user appears immediately since they're no longer in swipe_history
      console.log(
        `[MEET-UNDO] Forcing cache invalidation to fetch fresh data for user ${variables.userId}`,
      );
      queryClient.invalidateQueries({
        queryKey: ["/api/home-page-data"],
        refetchType: "active",
      });

      console.log(
        `[MEET-UNDO] Server undo completed for user ${variables.userId}`,
      );
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/home-page-data"], context.previousData);
      }

      // Restore the user back to removed-users cache on error
      if (context?.userToRestore) {
        queryClient.setQueryData(["/api/meet/removed-users"], (old: User[]) => {
          const updated = old || [];
          return [context.userToRestore, ...updated];
        });
      }

      console.log(
        `[MEET-UNDO] Rolled back undo due to error for user ${variables.userId}:`,
        err,
      );
    },
    onSettled: () => {
      // All cache updates handled optimistically - no expensive refetches needed
      // This eliminates race conditions and ensures instant subsequent undos
    },
  });

  const handleSwipeLeft = () => {
    // Get current user from query data directly
    const currentUser = discoverUsers?.[currentIndex];

    if (currentUser) {
      // Add to both the removed users array and the swipe history stack
      setRemovedUsers((prev) => [
        ...prev,
        { user: currentUser, action: "dislike" },
      ]);

      // Add to swipe history stack for multiple undos (newest-first ordering to match database)
      setSwipeHistory((prev) => [
        {
          id: -1, // Temporary ID, will be updated by database response
          user: currentUser,
          action: "dislike",
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      // Record the dislike using optimistic mutation - instant removal
      console.log("Recording dislike for user:", currentUser.id);
      meetSwipeMutation.mutate({ userId: currentUser.id, action: "dislike" });

      // Also save to persistent database history
      addSwipeHistoryMutation.mutate({
        targetUserId: currentUser.id,
        action: "dislike",
      });

      // Trigger next card entrance animation immediately for seamless transition
      setNextCardAnimationClass("next-card-slide-up");
      // Clear animation class after animation completes
      setTimeout(() => {
        setNextCardAnimationClass("");
      }, 300); // Match faster animation duration
    }
  };

  const handleSwipeRight = () => {
    // Get current user from query data directly
    const currentUser = discoverUsers?.[currentIndex];

    if (currentUser) {
      // Add to both the removed users array and the swipe history stack
      setRemovedUsers((prev) => [
        ...prev,
        { user: currentUser, action: "like" },
      ]);

      // Add to swipe history stack for multiple undos (newest-first ordering to match database)
      setSwipeHistory((prev) => [
        {
          id: -1, // Temporary ID, will be updated by database response
          user: currentUser,
          action: "like",
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      // Record the like using optimistic mutation - instant removal
      console.log("Recording like for user:", currentUser.id);
      meetSwipeMutation.mutate({ userId: currentUser.id, action: "like" });

      // Also save to persistent database history
      addSwipeHistoryMutation.mutate({
        targetUserId: currentUser.id,
        action: "like",
      });

      // Trigger next card entrance animation immediately for seamless transition
      setNextCardAnimationClass("next-card-slide-up");
      // Clear animation class after animation completes
      setTimeout(() => {
        setNextCardAnimationClass("");
      }, 300); // Match faster animation duration
    }
  };

  const handleMatchFound = (matchedUser: User) => {
    console.log("Match potentially created with user:", matchedUser.fullName);
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] });
  };

  const handleUndoAction = () => {
    console.log(
      `[MEET-UNDO] handleUndoAction called with ${swipeHistory.length} items in history`,
    );
    if (swipeHistory.length === 0) {
      console.log("[MEET-UNDO] No action to undo");
      return;
    }

    // Get the most recent swipe from the history stack (LIFO: first element is newest)
    const lastSwipe = swipeHistory[0];

    // Handle both client-side swipe history (with user object) and server-side history (with targetUserId)
    const targetUserId = lastSwipe.user?.id || lastSwipe.targetUserId;

    if (!targetUserId) {
      console.error(
        "[MEET-UNDO] Invalid swipe history entry - no user ID found",
        lastSwipe,
      );
      return;
    }

    console.log(
      `[MEET-UNDO] Undoing ${lastSwipe.action} for user ${targetUserId}`,
    );

    // Execute the undo mutation with optimistic UI updates
    undoSwipeMutation.mutate({
      userId: targetUserId,
      action: lastSwipe.action,
    });
  };

  // Use query data directly to prevent flickering
  const hasMatches = discoverUsers && discoverUsers.length > 0;
  const currentUser =
    discoverUsers && currentIndex < discoverUsers.length
      ? discoverUsers[currentIndex]
      : null;

  return (
    <>
      <AppHeader />

      <div
        className={`relative overflow-hidden ${darkMode ? "" : "border-t border-white"}`}
        style={availableHeight ? { height: availableHeight + "px" } : undefined}
      >
        <div className="h-full relative overflow-hidden">
          {isLoading || (!hasMatches && !isError) ? (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {translate("common.loading")}
                </h3>
                <p className="text-gray-600">
                  {translate("app.findingMorePeople")}
                </p>
              </div>
            </div>
          ) : isError ? (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <div>
                <h3 className="text-xl font-semibold text-red-500 mb-2">
                  {translate("common.error")}
                </h3>
                <p className="text-gray-600">
                  {error instanceof Error
                    ? error.message
                    : translate("swipeCard.errorTitle")}
                </p>
              </div>
            </div>
          ) : hasMatches && currentUser ? (
            <div className="h-full overflow-hidden">
              <SwipeCard
                key={`${currentUser.id}-${forceRenderTrigger}`}
                user={currentUser}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onMatchFound={handleMatchFound}
                onUndoAction={handleUndoAction}
                restoreAnimationClass={restoreAnimationClass}
                nextCardAnimationClass={nextCardAnimationClass}
                canUndo={swipeHistory.length > 0}
                undoCount={swipeHistory.length}
                onActivationNeeded={() => setShowActivationModal(true)}
                isPremium={isPremium}
                onPremiumUpgradeClick={handlePremiumUpgradeClick}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-center relative overflow-hidden">
              <FloatingIconsBackground
                count={60}
                color="rgba(168, 85, 247, 0.6)"
                opacityRange={[0.1, 0.3]}
                sizeRange={[16, 28]}
                speedRange={[20, 40]}
              />
              <div className="relative z-10">
                <h3 className="text-xl font-semibold mb-2">
                  {translate("app.noMoreMatches")}
                </h3>
                <p className="text-gray-600">
                  {translate("app.findingMorePeople")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />

      <ProfileActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onActivate={handleProfileActivation}
      />

      <PremiumUpgradeDialog
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
      />

      {/* KWAME AI Floating Button moved globally to `App.tsx` */}
    </>
  );
}
