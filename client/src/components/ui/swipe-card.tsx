import { User } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { calculateCompatibility } from "@/lib/compatibility";
import { useUserInterests } from "@/hooks/use-user-interests";
import { Card } from "./card";
import { Badge } from "./badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { getReligionDisplayName } from "@/lib/religions";
import { getCountryNationality } from "@/lib/nationality-map";
import {
  Globe,
  Heart,
  CalendarHeart,
  BookType,
  GraduationCap,
  CheckCircle,
  Shield,
} from "lucide-react";

import { getEffectiveShowPhoto } from "@/lib/show-photo-utils";

import { useSplashScreen } from "@/contexts/splash-screen-context";
import {
  detectBrowser,
  getBrowserCSSClass,
  logBrowserInfo,
} from "@/utils/browser-detection";
import {
  applySafeStyles,
  getSafeTransform,
  initializeBrowserCompat,
} from "@/utils/safari-transform-fix";
import { browserDebugLogger } from "@/utils/browser-debug-logger";
import "./swipe-card.css"; // Import custom animations and effects
import "./swipe-card-optimized.css"; // Import optimized performance styles
import "./swipe-card-safari-compat.css"; // Import Safari/Edge compatibility styles
import "./padlock-animation.css"; // Import padlock unlock animation styles

// Type for field visibility settings (must match profile component)
interface FieldVisibility {
  residence: boolean;
  countryOfOrigin: boolean;
  tribe: boolean;
  profession: boolean;
  religion: boolean;
  bio: boolean;
  relationshipStatus: boolean;
  relationshipGoal: boolean;
  highSchool: boolean;
  collegeUniversity: boolean;
  interests: boolean; // Add interests field to match profile component
  photos: boolean; // Add photos field to match profile component
  [key: string]: boolean; // Allow indexing with string keys
}

interface SwipeCardProps {
  user: User;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onMatchFound: (matchedUser: User) => void;
  onUndoAction?: () => void;
  restoreAnimationClass?: string;
  nextCardAnimationClass?: string;
  mode?: string; // Add mode prop to identify context (discover, preview, etc.)
  onActivationNeeded?: () => void;
  profileType?: "networking" | "mentorship" | "jobs"; // For SUITE connections
  profileId?: number; // For SUITE connections
  canUndo?: boolean; // Indicates if undo is available
  undoCount?: number; // Number of actions that can be undone
  // Premium feature controls
  isPremium?: boolean;
  onPremiumUpgradeClick?: () => void;
  // Synchronized bidirectional animation props
  currentCardExiting?: boolean;
  previousCardEntering?: boolean;
  currentCardExitDirection?: "left" | "right" | null;
  // SUITE Profile customization
  isFromSuiteProfile?: boolean; // True when opened from SUITE Profile page
  // Disable swipe functionality
  disableSwipe?: boolean; // True to disable all swipe gestures and handlers
  // Click to close functionality
  onClose?: () => void; // Callback to close modal when photo is clicked
}

export function SwipeCard({
  user,
  onSwipeLeft,
  onSwipeRight,
  onMatchFound,
  onUndoAction,
  restoreAnimationClass = "",
  nextCardAnimationClass = "",
  mode = "discover", // Default mode is discover
  onActivationNeeded,
  profileType,
  profileId,
  canUndo = false,
  undoCount = 0,
  // Premium feature controls
  isPremium = false,
  onPremiumUpgradeClick,
  // Synchronized animation props (use local state if not provided)
  currentCardExiting: propCurrentCardExiting,
  previousCardEntering: propPreviousCardEntering,
  currentCardExitDirection: propCurrentCardExitDirection,
  // SUITE Profile customization
  isFromSuiteProfile = false,
  // Disable swipe functionality
  disableSwipe = false,
  // Click to close functionality
  onClose,
}: SwipeCardProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { translate } = useLanguage();
  const { showSplash } = useSplashScreen();
  const [, setLocation] = useLocation();

  // Star animation state
  const [starAnimating, setStarAnimating] = useState(false);
  const [showStarOnButton, setShowStarOnButton] = useState(true);
  const [currentCardId, setCurrentCardId] = useState<string | number>(user.id);

  // Padlock unlock state for MEET cards
  const [meetPadlockUnlocked, setMeetPadlockUnlocked] = useState(false);

  // Arrow guidance system for MEET cards
  const [showArrowGuide, setShowArrowGuide] = useState(false);

  // Touch event handling to prevent double firing and conflicts
  const touchHandledRef = useRef(false);

  // Browser compatibility detection
  const browserInfo = detectBrowser();
  const cssClassSuffix = getBrowserCSSClass();

  // Log browser info and initialize compatibility fixes on component mount
  useEffect(() => {
    logBrowserInfo();
    initializeBrowserCompat();
    browserDebugLogger.logSwipeCardLoad();
  }, []);

  // Helper function to get browser-compatible CSS class names
  const getCompatibleClassName = (baseClass: string): string => {
    if (browserInfo.isSafari || browserInfo.isEdge) {
      return `${baseClass}${cssClassSuffix}`;
    }
    return baseClass;
  };

  // Synchronized bidirectional animation states (use props if provided, otherwise local state)
  const [localCurrentCardExiting, setLocalCurrentCardExiting] = useState(false);
  const [localPreviousCardEntering, setLocalPreviousCardEntering] =
    useState(false);
  const [localCurrentCardExitDirection, setLocalCurrentCardExitDirection] =
    useState<"left" | "right" | null>(null);

  // Use props if provided, otherwise use local state
  const currentCardExiting = propCurrentCardExiting ?? localCurrentCardExiting;
  const previousCardEntering =
    propPreviousCardEntering ?? localPreviousCardEntering;
  const currentCardExitDirection =
    propCurrentCardExitDirection ?? localCurrentCardExitDirection;

  const [compatibility] = useState(() =>
    calculateCompatibility(currentUser!, user),
  );

  // Get user interests directly from user object (pre-loaded from discover-users endpoint)
  const userInterests = (user as any).visibleInterests || [];

  // Function to format religion display for SwipeCard (show only denomination except for Islam)
  const getSwipeCardReligionDisplay = (religionValue: string): string => {
    const fullDisplay = getReligionDisplayName(religionValue);

    // For Islam, show the full display (e.g., "Islam - Sunni")
    if (religionValue.startsWith("islam-")) {
      return fullDisplay;
    }

    // For other religions, extract just the denomination after the " - "
    if (fullDisplay.includes(" - ")) {
      return fullDisplay.split(" - ")[1];
    }

    // If no " - " separator, return the full display (for global religions or edge cases)
    return fullDisplay;
  };

  // Parse visibility preferences from user data - ensuring consistent behavior across all instances
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibility>(
    () => {
      // Try to parse saved visibility preferences if available
      try {
        if (user.visibilityPreferences) {
          const savedPreferences = JSON.parse(
            user.visibilityPreferences,
          ) as FieldVisibility;

          // CRITICAL FIX: Ensure photos field exists in saved preferences
          // If missing, use showProfilePhoto value as fallback
          if (savedPreferences.photos === undefined) {
            savedPreferences.photos = Boolean(user?.showProfilePhoto ?? true);
          }

          console.log(
            `SwipeCard: Loaded visibility preferences for user ${user.id}:`,
            savedPreferences,
          );
          return savedPreferences;
        }
      } catch (error) {
        console.error(
          "Error parsing visibility preferences in SwipeCard:",
          error,
        );
      }

      // If no saved preferences or error parsing, generate consistent defaults
      // This ensures the same behavior when SwipeCard is used in Discover, Matches, and Profile pages
      // All toggles default to ON for new users except MY PHOTOS toggle
      const defaultVisibility = {
        residence: true,
        countryOfOrigin: true,
        tribe: true,
        profession: true,
        religion: true,
        bio: true,
        relationshipStatus: true,
        relationshipGoal: true,
        highSchool: true,
        collegeUniversity: true,
        interests: true, // Always show interests section, handle loading state in render
        photos: Boolean(user?.showProfilePhoto ?? true), // Initialize from showProfilePhoto field, default to true for activated profiles
      };

      console.log(
        `SwipeCard: Generated default visibility for user ${user.id}:`,
        defaultVisibility,
      );
      return defaultVisibility;
    },
  );

  // Watch for changes in user.visibilityPreferences and update fieldVisibility accordingly
  // This ensures SwipeCard components respect visibility preference toggles without requiring a browser refresh
  useEffect(() => {
    if (user.visibilityPreferences) {
      try {
        const savedPreferences = JSON.parse(
          user.visibilityPreferences,
        ) as FieldVisibility;

        // CRITICAL FIX: Ensure photos field exists in saved preferences
        // If missing, use showProfilePhoto value as fallback
        if (savedPreferences.photos === undefined) {
          savedPreferences.photos = Boolean(user?.showProfilePhoto ?? true);
        }

        console.log(
          `SwipeCard: Updating visibility preferences for user ${user.id}:`,
          savedPreferences,
        );
        setFieldVisibility(savedPreferences);
      } catch (error) {
        console.error(
          "Error parsing updated visibility preferences in SwipeCard:",
          error,
        );
      }
    } else {
      // If visibilityPreferences is cleared/null, regenerate defaults
      // All toggles default to ON for new users except MY PHOTOS toggle
      const defaultVisibility = {
        residence: true,
        countryOfOrigin: true,
        tribe: true,
        profession: true,
        religion: true,
        bio: true,
        relationshipStatus: true,
        relationshipGoal: true,
        highSchool: true,
        collegeUniversity: true,
        interests: true, // Always show interests section, handle loading state in render
        photos: Boolean(user?.showProfilePhoto ?? true), // Initialize from showProfilePhoto field, default to true for activated profiles
      };

      console.log(
        `SwipeCard: Regenerated default visibility for user ${user.id}:`,
        defaultVisibility,
      );
      setFieldVisibility(defaultVisibility);
    }
  }, [
    user.visibilityPreferences,
    user.location,
    user.countryOfOrigin,
    user.ethnicity,
    user.profession,
    user.religion,
    user.bio,
    user.relationshipStatus,
    user.relationshipGoal,
    user.highSchool,
    user.collegeUniversity,
  ]);

  // Use the useUserInterests hook to load interests when they should be displayed
  const { visibleInterestStrings, isLoading: interestsLoading } =
    useUserInterests(user.id);

  // Compute user interests dynamically based on field visibility (no need for state)
  const dynamicUserInterests = fieldVisibility.interests
    ? visibleInterestStrings
    : [];

  // Real-time verification status tracking
  const [isVerified, setIsVerified] = useState(user.isVerified || false);

  // Listen for real-time verification status changes via WebSocket
  useEffect(() => {
    const handleVerificationStatusChanged = (event: CustomEvent) => {
      const { userId, isVerified: newVerificationStatus } = event.detail;

      // Update verification status if this event is for the current user being displayed
      if (userId === user.id) {
        console.log(
          `[SwipeCard] Verification status changed for user ${userId}: ${newVerificationStatus}`,
        );
        setIsVerified(newVerificationStatus);
      }
    };

    // Add event listener for verification status changes
    window.addEventListener(
      "websocket:verificationStatusChanged",
      handleVerificationStatusChanged as EventListener,
    );

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener(
        "websocket:verificationStatusChanged",
        handleVerificationStatusChanged as EventListener,
      );
    };
  }, [user.id]);

  // Update verification status when user prop changes
  useEffect(() => {
    setIsVerified(user.isVerified || false);
  }, [user.isVerified]);

  const createMatchMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !user) {
        throw new Error("User information is missing");
      }

      // Prevent self-matching
      if (currentUser.id === user.id) {
        throw new Error("Cannot match with yourself");
      }

      try {
        // Make the match request directly without session checks to avoid intermittent failures
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          credentials: "include",
          body: JSON.stringify({
            userId1: currentUser.id,
            userId2: user.id,
            matched: false, // This is used for normal swipe right, not direct messaging
          }),
        });

        // Handle 409 Conflict (duplicate match) as success
        if (response.status === 409) {
          console.log("Match already exists - treating as success");
          return {
            success: true,
            message: "Match already exists",
            alreadyExists: true,
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Match creation error response:", errorText);

          // Handle specific error cases
          if (response.status === 401) {
            throw new Error("Please log in again to continue");
          }

          throw new Error(errorText || "Failed to create match");
        }

        // Parse the response with error handling
        const responseText = await response.text();

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse match response:", responseText);
          throw new Error("Invalid server response");
        }
      } catch (error) {
        console.error("Match creation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/liked-by"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/unread/count"],
      });

      // If this is a mutual match (matched = true)
      if (data.matched) {
        // Update localStorage to trigger notifications to update immediately
        localStorage.setItem("last_match_created", Date.now().toString());
        localStorage.setItem(`match_${data.id}`, "true");

        // Trigger a storage event for the current window
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "last_match_created",
            newValue: Date.now().toString(),
          }),
        );

        onMatchFound(user);
      }
    },
    onError: (error) => {
      console.error("Match mutation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Don't show error for expected cases
      if (
        errorMessage.includes("Match already exists") ||
        errorMessage.includes("Cannot match with yourself")
      ) {
        return;
      }

      // Show specific error messages based on the error type
      let title = translate("swipeCard.errorTitle");
      let description = translate("swipeCard.likeError");

      if (errorMessage.includes("Please log in again")) {
        title = translate("auth.sessionExpired");
        description = translate("auth.pleaseLoginAgain");
      } else if (errorMessage.includes("User information is missing")) {
        description = translate("swipeCard.userInfoMissing");
      } else if (errorMessage.includes("Invalid server response")) {
        description = translate("swipeCard.serverError");
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Import sendSwipeAction dynamically to avoid circular dependencies
  const sendSwipeActionEvent = async (
    targetUserId: number,
    action: "like" | "dislike" | "message",
    isMatch: boolean = false,
  ) => {
    try {
      const { sendSwipeAction } = await import("@/services/websocket-service");
      return sendSwipeAction(targetUserId, action, isMatch);
    } catch (error) {
      console.error("Failed to import websocket-service:", error);
      return false;
    }
  };

  // Database-backed undo system - local state no longer needed

  // Enhanced function for the Undo button with animations
  const [undoButtonState, setUndoButtonState] = useState<
    "default" | "processing" | "success"
  >("default");

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Debounced undo to prevent rapid clicks
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUndo = () => {
    // Block undo actions if current user has never activated their profile
    if (!currentUser?.hasActivatedProfile) {
      onActivationNeeded?.();
      return;
    }

    // Premium restriction check for undo functionality
    if (!isPremium && onPremiumUpgradeClick) {
      onPremiumUpgradeClick();
      return;
    }

    if (!canUndo || undoCount <= 0 || undoButtonState !== "default") return;

    // Clear any existing timeout to prevent multiple rapid clicks
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Set button state to processing
    setUndoButtonState("processing");

    // Apply optimistic UI updates immediately
    if (undoButtonRef.current) {
      // Add click animation classes
      undoButtonRef.current.classList.add("button-click-effect", "active");

      // Animate the icon
      const iconElement = undoButtonRef.current.querySelector("svg");
      if (iconElement) {
        iconElement.classList.add("message-icon-animation");
      }

      // Remove the active class after animation completes - faster
      setTimeout(() => {
        undoButtonRef.current?.classList.remove("active");
      }, 200);
    }

    // Immediately notify parent component for instant UI restoration
    // Parent will handle getting the correct action from database
    if (onUndoAction) {
      console.log("Executing database-backed undo action callback");
      onUndoAction(); // Call parent's handleUndoAction function
    }

    // Reset button state after short delay to allow for another undo
    setTimeout(() => {
      setUndoButtonState("default");
    }, 300);

    // Toast notification removed for seamless user experience
    // Undo actions now complete instantly without disruptive popups
    // Legacy fetch-based undo operation removed to prevent duplicated requests
    // Parent component handles all undo logic with optimistic updates for better performance
  };

  // Reference to the message button for animations
  const messageButtonRef = useRef<HTMLButtonElement>(null);
  const undoButtonRef = useRef<HTMLButtonElement>(null);
  const [messageButtonState, setMessageButtonState] = useState<
    "default" | "sending" | "success"
  >("default");

  // Enhanced function for direct messaging with visual feedback
  const handleDirectMessage = () => {
    if (!user || !user.id || messageButtonState !== "default") return;

    // Block message actions if current user has never activated their profile
    if (!currentUser?.hasActivatedProfile) {
      onActivationNeeded?.();
      return;
    }

    // Premium restriction check for direct messaging functionality
    if (!isPremium && onPremiumUpgradeClick) {
      onPremiumUpgradeClick();
      return;
    }

    // Animate the message button to show the action is being processed
    setMessageButtonState("sending");

    // Animate the button with a click effect
    if (messageButtonRef.current) {
      // Apply click animation
      messageButtonRef.current.classList.add(
        "button-click-effect",
        "active",
        "message-sent-animation",
      );

      // Animate the icon
      const iconElement = messageButtonRef.current.querySelector("svg");
      if (iconElement) {
        iconElement.classList.add("message-icon-animation");
      }

      // Remove the active class after animation completes
      setTimeout(() => {
        messageButtonRef.current?.classList.remove("active");
      }, 300);
    }

    // No toast notification - seamless chat initiation experience
    console.log(
      "[CHAT-PERFORMANCE] Optimized direct message initiated for",
      user.fullName,
    );

    // No need to create match here - the create-chat API will handle it with matched=true
    // Removing this line to avoid creating an unmatched connection:
    // createMatchMutation.mutate();

    // Notify via WebSocket that this user was messaged using the new message action type
    sendSwipeActionEvent(user.id, "message", true);

    // Undo is now handled via database-backed system

    // Schedule card removal to happen DURING splash screen display (2.5 seconds after button click)
    if (mode === "SUITE" && profileType && profileId) {
      setTimeout(() => {
        const removalEvent = new CustomEvent("suite_remove_from_discover", {
          detail: {
            suiteType: profileType, // "networking" or "mentorship"
            removeProfileId: profileId,
            removeUserId: user.id,
            reason: `${profileType}_message_button_clicked`,
            timestamp: new Date().toISOString(),
          },
        });
        window.dispatchEvent(removalEvent);

        console.log(
          `[CARD-REMOVAL] Removed ${profileType} profile ${profileId} from discover deck during splash screen (message button clicked)`,
        );
      }, 2500); // Remove card 2.5 seconds after button click, well into splash screen display
    }

    // Schedule card removal for MEET mode - same aggressive timing
    if (mode === "MEET" || mode === "match") {
      setTimeout(() => {
        const removalEvent = new CustomEvent("meet_remove_from_discover", {
          detail: {
            removeUserId: user.id,
            reason: "meet_message_button_clicked",
            timestamp: new Date().toISOString(),
          },
        });
        window.dispatchEvent(removalEvent);

        console.log(
          `[CARD-REMOVAL] Removed MEET user ${user.id} from discover deck during splash screen (message button clicked)`,
        );
      }, 2500); // Remove card 2.5 seconds after button click, well into splash screen display
    }

    // Navigate to messages page with this user selected
    // This will be handled by the server through the WebSocket notification
    // For now, we'll make a direct API call to create the chat tab
    fetch("/api/messages/create-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUserId: user.id,
      }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        // Set success state visually
        setMessageButtonState("success");
        if (messageButtonRef.current) {
          messageButtonRef.current.classList.add("button-success");
        }

        // Parallel cache optimization for better performance
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] }),
          queryClient.invalidateQueries({
            queryKey: ["/api/messages/unread/count"],
          }),
          queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] }),
        ]).catch((error) => {
          console.warn("[CHAT-PERFORMANCE] Cache invalidation error:", error);
        });

        // Trigger immediate card removal BEFORE API call
        window.dispatchEvent(
          new CustomEvent("meet_remove_from_discover", {
            detail: { removeUserId: user.id, reason: "direct_message" },
          }),
        );
        console.log(
          `[MEET-CARD-REMOVAL] Immediately removed user ${user.id} from discover deck (message button clicked)`,
        );

        // CRITICAL FIX: Show splash screen then navigate to chat
        if (data && data.matchId && typeof data.matchId === "number") {
          console.log(
            `MEET Direct Message: Got response with matchId ${data.matchId}, showing splash and navigating to chat`,
          );

          // Show splash screen with immediate navigation
          showSplash({
            currentUser: {
              fullName: currentUser?.fullName || "",
              photoUrl: currentUser?.photoUrl || undefined,
            },
            targetUser: {
              fullName: user.fullName,
              photoUrl: user.photoUrl || undefined,
            },
            matchId: data.matchId,
          });

          return; // Exit early, skip all other logic
        }

        // Save match object to storage for recovery (fallback logic)
        if (data && data.matchId && data.match) {
          try {
            // CRITICAL FIX: Use server's enriched match data which already has proper structure
            // The server now returns match.user instead of match.targetUser
            const enrichedMatch = {
              ...data.match,
              // Store the match type to indicate this was created via direct message
              matchType: "direct_message",
              // Ensure we have the user data (server should provide this now)
              user: data.match.user || {
                id: user.id,
                fullName: user.fullName,
                photoUrl: user.photoUrl,
                location: user.location || "",
                bio: user.bio || null,
                profession: user.profession || null,
              },
              // Store current user info for reference
              currentUser: currentUser
                ? {
                    id: currentUser.id,
                    fullName: currentUser.fullName,
                  }
                : null,
              // Store explicit IDs to prevent confusion
              targetUserId: user.id,
              initiatorId: currentUser?.id,
            };

            // CRITICAL FIX: Store match data in the exact format expected by chat page
            // Use the enriched match from server which has the correct structure
            const matchData = {
              ...enrichedMatch,
              id: data.matchId,
              // Ensure we have the match ID for navigation
              matchId: data.matchId,
            };

            // Save to both storage types for redundancy
            localStorage.setItem(
              `match_data_${data.matchId}`,
              JSON.stringify(matchData),
            );
            sessionStorage.setItem(
              `match_data_${data.matchId}`,
              JSON.stringify(matchData),
            );

            // Store newly created match flag for immediate detection
            sessionStorage.setItem(
              "newly_created_match",
              data.matchId.toString(),
            );
            localStorage.setItem(
              "newly_created_match",
              data.matchId.toString(),
            );

            console.log(
              `MEET: Cached enriched match data for match ${data.matchId} with proper structure`,
              matchData,
            );
          } catch (e) {
            console.error("Failed to cache match data:", e);
          }

          // Try polling, but always redirect after polling
          const waitForMatch = async (
            matchId: number,
            maxRetries = 5,
            delay = 500,
          ) => {
            for (let i = 0; i < maxRetries; i++) {
              try {
                // Fetch match data directly from API
                const res = await fetch("/api/matches", {
                  credentials: "include",
                  headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                  },
                });

                if (res.ok) {
                  const matches = await res.json();
                  const matchFound =
                    Array.isArray(matches) &&
                    matches.some((m) => m.id === matchId);

                  // If match is found in API, enrich it with our cached data and store it
                  if (matchFound) {
                    const match = matches.find((m) => m.id === matchId);
                    if (match) {
                      const enrichedMatch = {
                        ...match,
                        user: match.user || {
                          id: user.id,
                          fullName: user.fullName,
                          photoUrl: user.photoUrl,
                          // Only include properties that are confirmed to exist on the user object
                          location: user.location || "",
                          bio: user.bio || null,
                          profession: user.profession || null,
                        },
                      };

                      // Update the cache with this enriched data
                      localStorage.setItem(
                        `match_data_${matchId}`,
                        JSON.stringify(enrichedMatch),
                      );
                      sessionStorage.setItem(
                        `match_data_${matchId}`,
                        JSON.stringify(enrichedMatch),
                      );

                      // Update the query cache
                      queryClient.setQueryData(
                        ["/api/matches"],
                        (oldData: any) => {
                          if (Array.isArray(oldData)) {
                            // Replace the match in the array if it exists
                            const matchIndex = oldData.findIndex(
                              (m) => m.id === matchId,
                            );
                            if (matchIndex >= 0) {
                              const newData = [...oldData];
                              newData[matchIndex] = enrichedMatch;
                              return newData;
                            }
                            // Or add it if it doesn't exist
                            return [...oldData, enrichedMatch];
                          }
                          return oldData;
                        },
                      );
                    }
                    return true;
                  }
                }
              } catch (e) {
                console.error("Error checking match:", e);
              }
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            return false;
          };

          waitForMatch(data.matchId).then((matchFound) => {
            console.log(
              `Redirecting to chat page for match ${data.matchId}, match found: ${matchFound}`,
            );

            // Show splash screen before navigation
            showSplash({
              currentUser: {
                fullName: currentUser?.fullName || "",
                photoUrl: currentUser?.photoUrl || undefined,
              },
              targetUser: {
                fullName: user.fullName,
                photoUrl: user.photoUrl || undefined,
              },
              matchId: data.matchId,
            });
          });
        } else {
          // Handle case where matchId exists but match object is missing
          if (data.matchId && typeof data.matchId === "number") {
            console.log(
              `Match ID exists (${data.matchId}) but match object missing, showing splash with valid ID`,
            );

            // Show splash with valid matchId
            showSplash({
              currentUser: {
                fullName: currentUser?.fullName || "",
                photoUrl: currentUser?.photoUrl || undefined,
              },
              targetUser: {
                fullName: user.fullName,
                photoUrl: user.photoUrl || undefined,
              },
              matchId: data.matchId,
            });
          } else {
            // No valid matchId - navigate to messages page instead
            console.log("No valid match ID found, showing error splash");

            showSplash({
              currentUser: {
                fullName: currentUser?.fullName || "",
                photoUrl: currentUser?.photoUrl || undefined,
              },
              targetUser: {
                fullName: user.fullName,
                photoUrl: user.photoUrl || undefined,
              },
              matchId: 0, // Use 0 to indicate messages page navigation
              error: true,
            });
          }
        }
      })
      .catch((error) => {
        console.error("Failed to create chat:", error);
        setMessageButtonState("default");
        if (messageButtonRef.current) {
          messageButtonRef.current.classList.remove(
            "button-click-effect",
            "message-sent-animation",
            "button-success",
          );
        }

        console.log("Chat creation failed, showing error splash");

        // Show error splash screen
        showSplash({
          currentUser: {
            fullName: currentUser?.fullName || "",
            photoUrl: currentUser?.photoUrl || undefined,
          },
          targetUser: {
            fullName: user.fullName,
            photoUrl: user.photoUrl || undefined,
          },
          matchId: 0, // Use 0 to indicate messages page navigation
          error: true,
        });

        toast({
          title: translate("swipeCard.messagingFailedTitle"),
          description: translate("swipeCard.messagingFailedDescription"),
          variant: "destructive",
        });
      });
  };

  // Optimization: Add image loading optimization
  useEffect(() => {
    // Preload user image if available for faster rendering
    if (user.photoUrl) {
      const img = new Image();
      img.src = user.photoUrl;
    }
  }, [user.photoUrl]);

  // Generate raindrops for the rain effect - optimized for performance
  const generateRaindrops = () => {
    const raindrops = [];
    // Create only 150 raindrops with random positions and animation delays (reduced by 75%)
    // This greatly improves performance while maintaining the visual effect
    for (let i = 0; i < 150; i++) {
      // Ensure even distribution across the card including white areas
      const topSection = i < 105; // 70% of drops in the top image section

      let yPosition;
      if (topSection) {
        // For the image area (top 90% of card)
        yPosition = Math.random() * 80; // 0-80% from the top
      } else {
        // For the button area (bottom 10% of card with white background)
        yPosition = 80 + Math.random() * 20; // 80-100% from the top
      }

      const style = {
        left: `${Math.random() * 100}%`,
        top: `${yPosition}%`,
        animation: `raindrop ${0.7 + Math.random() * 0.7}s linear infinite`,
        animationDelay: `${Math.random() * 0.5}s`,
      };

      // Use completely different class for the white footer area raindrops
      if (!topSection) {
        raindrops.push(
          <div
            key={i}
            className="white-area-raindrop"
            style={{
              left: style.left,
              top: style.top,
              animationDelay: style.animationDelay,
            }}
          />,
        );
      } else {
        // For the main image area, use the standard raindrop but with custom animation
        raindrops.push(
          <div
            key={i}
            className="raindrop"
            style={{
              ...style,
              animation: `raindrop-fall ${0.7 + Math.random() * 0.8}s linear infinite`,
            }}
          />,
        );
      }
    }
    return raindrops;
  };

  // Generate celebration elements for the right swipe - optimized for performance
  const generateCelebration = () => {
    const elements = [];

    // Create only 50 confetti elements with random colors and positions (reduced by 75%)
    // This significantly improves rendering performance
    for (let i = 0; i < 50; i++) {
      // Different colors for confetti
      const colors = [
        "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
        "linear-gradient(140deg, #a78bfa 0%, #8b5cf6 100%)",
        "linear-gradient(140deg, #fda4af 0%, #f43f5e 100%)",
        "linear-gradient(140deg, #fde68a 0%, #fbbf24 100%)",
        "linear-gradient(140deg, #93c5fd 0%, #3b82f6 100%)",
      ];

      const color = colors[Math.floor(Math.random() * colors.length)];

      // Ensure even distribution with more confetti on the right side
      const rightSide = i < 70; // 70% on the right side

      let xPosition;
      if (rightSide) {
        // For right side, more confetti
        xPosition = 50 + Math.random() * 50; // 50-100% from the left
      } else {
        // For left side, less confetti
        xPosition = Math.random() * 50; // 0-50% from the left
      }

      const style = {
        left: `${xPosition}%`,
        top: `${Math.random() * 100}%`,
        background: color,
        animation: `confetti-fall ${0.8 + Math.random() * 1.2}s ease-out`,
        animationDelay: `${Math.random() * 0.5}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      };

      elements.push(
        <div key={`confetti-${i}`} className="confetti" style={style} />,
      );
    }

    // Create floating hearts (reduced to 10 - 80% reduction from original)
    for (let i = 0; i < 10; i++) {
      const xPosition = 50 + Math.random() * 50; // Mostly on the right side

      const style = {
        left: `${xPosition}%`,
        top: `${Math.random() * 100}%`,
        animation: `heart-float ${1 + Math.random() * 2}s ease-out`,
        animationDelay: `${Math.random() * 0.8}s`,
      };

      elements.push(
        <div key={`heart-${i}`} className="heart-particle" style={style}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>,
      );
    }

    // Add twinkling stars (reduced to 8 - 80% reduction from original)
    for (let i = 0; i < 8; i++) {
      const xPosition = 40 + Math.random() * 60; // Mostly on the right side

      const style = {
        left: `${xPosition}%`,
        top: `${Math.random() * 100}%`,
        animation: `star-twinkle ${0.5 + Math.random() * 1}s ease-out`,
        animationDelay: `${Math.random() * 0.8}s`,
      };

      elements.push(
        <div key={`star-${i}`} className="star-particle" style={style}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>,
      );
    }

    // Add sparkling dots (reduced to 15 - 75% reduction from original)
    for (let i = 0; i < 15; i++) {
      const xPosition = 30 + Math.random() * 70; // Across the entire card but more on right

      const style = {
        left: `${xPosition}%`,
        top: `${Math.random() * 100}%`,
        animation: `star-twinkle ${0.3 + Math.random() * 0.7}s ease-out`,
        animationDelay: `${Math.random() * 0.5}s`,
      };

      elements.push(
        <div key={`sparkle-${i}`} className="sparkle-particle" style={style} />,
      );
    }

    return elements;
  };

  // All drag handling, touch/mouse events, and swipe animations have been removed
  // Swipe actions now only work through the like/dislike buttons without any physics

  // Tinder-style swipe card physics implementation
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentTransform = useRef({ x: 0, y: 0, rotation: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0, time: 0 });
  const animationId = useRef<number | null>(null);
  const leftIndicatorRef = useRef<HTMLDivElement>(null);
  const rightIndicatorRef = useRef<HTMLDivElement>(null);

  // Animation state for programmatic swipes (button clicks)
  const [isAnimating, setIsAnimating] = useState(false);
  const [cursorState, setCursorState] = useState<"grab" | "grabbing">("grab");

  // Tinder-style physics constants
  const SWIPE_THRESHOLD = 100; // pixels to trigger swipe
  const MAX_ROTATION = 15; // maximum rotation in degrees
  const ROTATION_STRENGTH = 0.1; // how much rotation per pixel
  const FRICTION = 0.95; // velocity decay
  const SPRING_STRENGTH = 0.15; // snap-back force
  const VELOCITY_THRESHOLD = 0.8; // minimum velocity for fling

  // Get pointer position from mouse or touch event
  const getPointerPosition = (
    e: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return {
      x: (e as React.MouseEvent).clientX,
      y: (e as React.MouseEvent).clientY,
    };
  };

  // Update card transform with smooth CSS transitions
  const updateCardTransform = (
    x: number,
    y: number,
    rotation: number,
    transition = false,
    updateVisual = true,
  ) => {
    if (!cardRef.current) return;

    const card = cardRef.current;

    // Apply CSS transform
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    card.style.transition = transition
      ? "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "none";

    // Update visual feedback based on position
    if (updateVisual) {
      updateVisualFeedback(x, y, rotation);
    }

    // Store current transform
    currentTransform.current = { x, y, rotation };
  };

  // Update visual feedback (indicators, shadows, etc.)
  const updateVisualFeedback = (x: number, y: number, rotation: number) => {
    if (!cardRef.current) return;
    const swipeProgress = Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1);

    // Update swipe indicators without DOM queries or heavy box-shadow changes
    const leftIndicator = leftIndicatorRef.current as HTMLElement | null;
    const rightIndicator = rightIndicatorRef.current as HTMLElement | null;

    if (x > 30) {
      if (rightIndicator)
        rightIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (leftIndicator) leftIndicator.style.opacity = "0";
    } else if (x < -30) {
      if (leftIndicator)
        leftIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (rightIndicator) rightIndicator.style.opacity = "0";
    } else {
      if (leftIndicator) leftIndicator.style.opacity = "0";
      if (rightIndicator) rightIndicator.style.opacity = "0";
    }
  };

  // Start drag interaction
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAnimating) return; // Don't allow dragging during animations

    const pos = getPointerPosition(e);
    isDragging.current = true;
    setCursorState("grabbing");
    dragStart.current = pos;
    lastPosition.current = { ...pos, time: Date.now() };

    // Reset any existing transitions
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
    }

    // Avoid preventDefault to allow browser optimizations; rely on touch-action CSS
  };

  // Handle drag movement with real-time updates
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || isAnimating) return;

    const pos = getPointerPosition(e);
    const deltaX = pos.x - dragStart.current.x;
    const deltaY = pos.y - dragStart.current.y;

    // Calculate rotation based on horizontal movement (Tinder-style)
    const rotation = Math.max(
      -MAX_ROTATION,
      Math.min(MAX_ROTATION, deltaX * ROTATION_STRENGTH),
    );

    // Update card position and rotation
    updateCardTransform(deltaX, deltaY, rotation);

    // Track velocity for momentum calculation
    const now = Date.now();
    const timeDelta = now - lastPosition.current.time;
    if (timeDelta > 0) {
      velocity.current.x = (pos.x - lastPosition.current.x) / timeDelta;
      velocity.current.y = (pos.y - lastPosition.current.y) / timeDelta;
    }
    lastPosition.current = { ...pos, time: now };

    // Avoid preventDefault on move to keep input passive-friendly
  };

  // Handle drag end with threshold-based decision
  const handleDragEnd = () => {
    if (!isDragging.current || isAnimating) return;

    isDragging.current = false;
    setCursorState("grab");
    const { x, y } = currentTransform.current;
    const velocityMagnitude = Math.sqrt(
      velocity.current.x ** 2 + velocity.current.y ** 2,
    );

    // Determine if we should swipe off or snap back
    const shouldSwipeOff =
      Math.abs(x) > SWIPE_THRESHOLD || velocityMagnitude > VELOCITY_THRESHOLD;

    // Hide indicators at end of drag to avoid extra work during animations
    if (leftIndicatorRef.current) leftIndicatorRef.current.style.opacity = "0";
    if (rightIndicatorRef.current)
      rightIndicatorRef.current.style.opacity = "0";

    if (shouldSwipeOff) {
      // Trigger swipe animation
      const direction = x > 0 ? "right" : "left";
      animateSwipeOff(direction);
    } else {
      // Snap back to center
      animateSnapBack();
    }
  };

  // Animate card flying off screen
  const animateSwipeOff = (direction: "left" | "right") => {
    if (!cardRef.current) return;

    setIsAnimating(true);
    const card = cardRef.current;

    // Calculate final position (off-screen)
    const windowWidth = window.innerWidth;
    const finalX =
      direction === "right" ? windowWidth + 200 : -windowWidth - 200;
    const finalY = currentTransform.current.y + velocity.current.y * 300; // Add some momentum
    const finalRotation = direction === "right" ? 30 : -30;

    // Apply final transform with transition
    card.style.transition =
      "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    card.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${finalRotation}deg)`;

    // Clear indicators
    setTimeout(() => {
      const leftIndicator = document.querySelector(
        ".left-indicator",
      ) as HTMLElement;
      const rightIndicator = document.querySelector(
        ".right-indicator",
      ) as HTMLElement;
      if (leftIndicator) leftIndicator.style.opacity = "0";
      if (rightIndicator) rightIndicator.style.opacity = "0";
    }, 100);

    // Trigger the appropriate action
    setTimeout(() => {
      if (direction === "right") {
        handleSwipeRight();
      } else {
        handleSwipeLeft();
      }
      setIsAnimating(false);
    }, 300); // Trigger action mid-animation for responsiveness
  };

  // Animate card snapping back to center
  const animateSnapBack = () => {
    if (!cardRef.current) return;

    setIsAnimating(true);

    // Smooth spring animation back to center
    const startTime = Date.now();
    const startTransform = { ...currentTransform.current };

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const duration = 400; // ms
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (elastic out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const x = startTransform.x * (1 - eased);
      const y = startTransform.y * (1 - eased);
      const rotation = startTransform.rotation * (1 - eased);

      updateCardTransform(x, y, rotation, false, false);

      if (progress < 1) {
        animationId.current = requestAnimationFrame(animateFrame);
      } else {
        setIsAnimating(false);
        // Reset to exact center
        updateCardTransform(0, 0, 0, false, false);
      }
    };

    animationId.current = requestAnimationFrame(animateFrame);
  };

  // Button-triggered swipe animations
  const triggerButtonSwipe = (direction: "left" | "right") => {
    if (isAnimating) return;

    // Start from center and animate to off-screen
    currentTransform.current = { x: 0, y: 0, rotation: 0 };
    velocity.current = { x: direction === "right" ? 2 : -2, y: 0 };
    animateSwipeOff(direction);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) {
      return;
    }

    handleDragStart(e);

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e as any);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  // Simple button handlers without any animations or physics
  const handleSwipeLeft = () => {
    // Block swipe actions if current user has never activated their profile
    if (!currentUser?.hasActivatedProfile) {
      onActivationNeeded?.();
      return;
    }

    // Directly trigger the swipe action without any animations
    onSwipeLeft();

    // Notify via WebSocket that this user was disliked
    if (user && user.id) {
      sendSwipeActionEvent(user.id, "dislike");
    }
  };

  const handleSwipeRight = () => {
    // Block swipe actions if current user has never activated their profile
    if (!currentUser?.hasActivatedProfile) {
      onActivationNeeded?.();
      return;
    }

    // Directly trigger the swipe action without any animations
    // Create a match when swiping right
    createMatchMutation.mutate();

    // Notify via WebSocket that this user was liked
    if (user && user.id) {
      // We don't know yet if this is a match, the server will determine that
      // and send a match_notification event if needed
      sendSwipeActionEvent(user.id, "like");
    }

    onSwipeRight();
  };

  // Unified button event handler to prevent conflicts and double firing
  const createButtonHandler = (action: () => void) => {
    return {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // If this was triggered by a touch event, ignore the click
        if (touchHandledRef.current) {
          touchHandledRef.current = false;
          return;
        }

        action();
      },
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Mark that we handled a touch event
        touchHandledRef.current = true;

        // Clear the flag after a short delay to allow for the click event
        setTimeout(() => {
          touchHandledRef.current = false;
        }, 100);

        action();
      },
    };
  };

  // Button click handlers with animation
  const handleDislikeButtonClick = () => {
    triggerButtonSwipe("left");
  };

  const handleLikeButtonClick = () => {
    triggerButtonSwipe("right");
  };

  return (
    <div
      className={`swipe-card h-full p-2 transition-transform duration-300 ease-out overflow-hidden ${getCompatibleClassName("fast-card")}`}
      style={{
        willChange: "transform, opacity",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        maxHeight: "100%",
      }}
    >
      {/* Rain effect container - only visible when swiped left */}
      <div className="rain-container">{generateRaindrops()}</div>

      {/* Celebration effect container - only visible when swiped right */}
      <div className="celebration-container">{generateCelebration()}</div>

      {/* Enhanced swipe indicator overlays */}
      <div
        ref={leftIndicatorRef}
        className="absolute inset-0 z-20 pointer-events-none opacity-0 transition-opacity duration-200 flex items-center justify-start pl-8 left-indicator"
      >
        <div className="bg-rose-500/80 text-white text-xl font-bold py-2 px-6 rounded-lg transform -rotate-12 backdrop-blur-sm">
          PASS
        </div>
      </div>
      <div
        ref={rightIndicatorRef}
        className="absolute inset-0 z-20 pointer-events-none opacity-0 transition-opacity duration-200 flex items-center justify-end pr-8 right-indicator"
      >
        <div className="bg-emerald-500/80 text-white text-xl font-bold py-2 px-6 rounded-lg transform rotate-12 backdrop-blur-sm">
          LIKE
        </div>
      </div>

      {/* Shooting sparklight around card edges */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden">
        <div className="absolute w-1.5 h-8 bg-gradient-to-b from-transparent via-white to-transparent opacity-100 animate-spark-shoot shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8),0_0_45px_rgba(168,85,247,0.7),0_0_60px_rgba(168,85,247,0.4)]" />
      </div>

      <Card
        ref={cardRef}
        className={`swipe-card overflow-hidden h-full flex flex-col card-highlight border border-white 
        rounded-xl relative overscroll-none
        drop-shadow-[0_0_35px_rgba(168,85,247,0.4)]
        shadow-[0_0_30px_rgba(168,85,247,0.45),0_0_60px_rgba(168,85,247,0.25),inset_0_1px_3px_rgba(255,255,255,0.9)]
        transform transition-all duration-300 hover:scale-[1.01]
        ${restoreAnimationClass}
        ${nextCardAnimationClass}
        ${currentCardExiting && currentCardExitDirection === "left" ? "animate-meet-current-exit-left" : ""}
        ${currentCardExiting && currentCardExitDirection === "right" ? "animate-meet-current-exit-right" : ""}
        ${previousCardEntering && currentCardExitDirection === "left" ? "animate-meet-previous-enter-left" : ""}
        ${previousCardEntering && currentCardExitDirection === "right" ? "animate-meet-previous-enter-right" : ""}`}
        style={{
          // Performance optimized styles
          backgroundSize: "100% 100%", // Smaller size for better performance
          perspective: "1500px",
          transformStyle: "preserve-3d",
          willChange: "transform", // Hint to browser for optimization
          backfaceVisibility: "hidden", // Prevent flickering during animations
          WebkitBackfaceVisibility: "hidden", // Safari support
          MozBackfaceVisibility: "hidden", // Firefox support
          transform: "translateZ(0)", // Force GPU acceleration
          cursor: cursorState,
          touchAction: "none",
        }}
        onMouseDown={disableSwipe ? undefined : handleMouseDown}
        onTouchStart={disableSwipe ? undefined : handleTouchStart}
        onTouchMove={disableSwipe ? undefined : handleTouchMove}
        onTouchEnd={disableSwipe ? undefined : handleTouchEnd}
      >
        {/* Profile image - increased height */}
        <div className="relative h-[90%] overflow-hidden overscroll-none touch-none">
          {(user.photoUrl || (user as any).avatarPhoto) &&
          getEffectiveShowPhoto(user, user.hasActivatedProfile || false) &&
          fieldVisibility.photos ? (
            <img
              src={
                (user as any).showAvatar && (user as any).avatarPhoto
                  ? (user as any).avatarPhoto
                  : user.photoUrl
              }
              className="w-full h-full object-cover card-image"
              alt={`${user.fullName}'s profile`}
              loading="lazy"
              decoding="async"
              onClick={
                disableSwipe && onClose
                  ? (e) => {
                      e.stopPropagation();
                      onClose();
                    }
                  : undefined
              }
              style={
                disableSwipe && onClose ? { cursor: "pointer" } : undefined
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-pattern-dots bg-gradient-to-b from-purple-50 to-amber-50">
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-md">
                <span className="text-xl bg-gradient-to-r from-purple-600 to-amber-500 text-transparent bg-clip-text font-bold">
                  {translate("swipeCard.noPhotoAvailable")}
                </span>
              </div>
            </div>
          )}

          {/* Enhanced compatibility score with 3D effects, glow and improved animations - always show in MEET (even if locked/missing Big 5) */}
          {!isFromSuiteProfile && (
            <button
              onClick={(e) => {
                e.stopPropagation();

                // If padlock is locked, show arrow guidance (like SUITE badges)
                if (!meetPadlockUnlocked) {
                  setShowArrowGuide(true);
                  // Hide arrow after 2 seconds
                  setTimeout(() => {
                    setShowArrowGuide(false);
                  }, 2000);
                  return;
                }

                // Only navigate to Match Dashboard when padlock is unlocked
                if (currentUser && user) {
                  setLocation(
                    `/match-dashboard/users/${currentUser.id}/${user.id}`,
                  );
                }
              }}
              className={`absolute top-3 right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-purple-100 to-white flex items-center justify-center shadow-[0_4px_16px_rgba(168,85,247,0.4),0_2px_4px_rgba(168,85,247,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] backdrop-blur-sm ${getCompatibleClassName("compatibility-score")} hover:shadow-[0_6px_20px_rgba(168,85,247,0.5),0_4px_8px_rgba(168,85,247,0.4)] transition-all duration-300 cursor-pointer percentage-badge-container`}
              title="View detailed match analysis"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center no-animation relative overflow-hidden"
                style={{
                  boxShadow:
                    "inset 0 0 15px rgba(168, 85, 247, 0.2), 0 2px 8px rgba(168, 85, 247, 0.15)",
                  background:
                    (compatibility ?? 0) >= 90
                      ? `conic-gradient(#10b981 0%, #10b981 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                      : (compatibility ?? 0) >= 75
                        ? `conic-gradient(#6366f1 0%, #6366f1 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                        : `conic-gradient(#8b5cf6 0%, #8b5cf6 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`,
                }}
              >
                <div
                  className="w-[3.1rem] h-[3.1rem] rounded-full bg-white flex items-center justify-center 
                shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)]
                transform transition-transform duration-300 hover:scale-105"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center scale-110 opacity-30 blur-[2px]">
                      <span
                        className="text-2xl font-black"
                        style={{
                          color:
                            (compatibility ?? 0) >= 90
                              ? "#10b981"
                              : (compatibility ?? 0) >= 75
                                ? "#6366f1"
                                : "#8b5cf6",
                        }}
                      >
                        {compatibility !== null ? compatibility : "—"}
                      </span>
                    </div>
                    <span
                      className={`text-xl font-extrabold bg-gradient-to-b from-purple-600 to-fuchsia-600 text-transparent bg-clip-text drop-shadow-sm ${meetPadlockUnlocked ? "percentage-revealed" : "percentage-blurred"}`}
                    >
                      {compatibility !== null ? `${compatibility}%` : "—"}
                    </span>
                    {!meetPadlockUnlocked && (
                      <div className="padlock-overlay padlock-meet">🔒</div>
                    )}
                  </div>
                </div>

                {/* Enhanced sparkle effects with our new animation */}
                <div
                  className={`absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white ${getCompatibleClassName("animate-pulse-slow")} opacity-80`}
                ></div>
                <div
                  className="absolute bottom-3 left-1.5 w-1 h-1 rounded-full bg-white animate-pulse-slow opacity-60"
                  style={{ animationDelay: "0.5s" }}
                ></div>

                {/* Add additional colored sparkles for more visual appeal */}
                <div
                  className="absolute top-2 left-3 w-2 h-2 rounded-full bg-purple-300 animate-pulse-slow"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="absolute bottom-2 right-3 w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse-slow"
                  style={{ animationDelay: "0.8s" }}
                ></div>
                <div
                  className="absolute top-[40%] left-1 w-1 h-1 rounded-full bg-purple-400 animate-pulse-slow"
                  style={{ animationDelay: "1.2s" }}
                ></div>
              </div>
            </button>
          )}

          {/* SUITE Percentage Badges - Show for networking, mentorship, and jobs contexts */}
          {profileType &&
            (profileType === "networking" ||
              profileType === "mentorship" ||
              profileType === "jobs") && (
              <>
                {/* Networking Percentage Badge */}
                {profileType === "networking" && (
                  <button
                    onClick={() => {
                      console.log(
                        `[SUITE-DISCOVER-DEBUG] Networking badge clicked for profileId: ${profileId}, user: ${user?.id}, currentUser: ${currentUser?.id}, isPremium: ${isPremium}`,
                      );

                      // Premium restriction check for SUITE percentage badges
                      if (!isPremium && onPremiumUpgradeClick) {
                        console.log(
                          `[SUITE-DISCOVER-DEBUG] Premium upgrade required - showing arrow guide`,
                        );
                        // Show arrow guide pointing to star button
                        setShowArrowGuide(true);
                        // Hide arrow after 2 seconds
                        setTimeout(() => {
                          setShowArrowGuide(false);
                        }, 2000);
                        return;
                      }

                      console.log(
                        `[SUITE-DISCOVER-DEBUG] Premium check passed, proceeding with API call`,
                      );

                      // Self-compatibility check - prevent users from viewing their own compatibility
                      if (currentUser && user && currentUser.id === user.id) {
                        console.log(
                          `[SUITE-DISCOVER-DEBUG] User trying to view their own compatibility - showing toast`,
                        );
                        toast({
                          title: "Cannot View Own Compatibility",
                          description:
                            "You cannot view compatibility analysis for your own profile.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // First call the compatibility API to create the record in suite_compatibility_scores table
                      if (currentUser && user && user.id) {
                        console.log(
                          `[SUITE-DISCOVER-DEBUG] Making API call to /api/suite/compatibility/user/${user.id}`,
                        );
                        // Call compatibility API first to create/update the score record
                        fetch(`/api/suite/compatibility/user/${user.id}`, {
                          method: "GET",
                          credentials: "include",
                          headers: {
                            "Content-Type": "application/json",
                          },
                        })
                          .then((response) => {
                            console.log(
                              `[SUITE-DISCOVER-DEBUG] API response status: ${response.status}`,
                            );
                            if (response.ok) {
                              console.log(
                                `[SUITE-DISCOVER] Compatibility score created/updated for user ${user.id}`,
                              );
                              return response.json();
                            } else {
                              console.warn(
                                `[SUITE-DISCOVER] Failed to create compatibility score for user ${user.id}:`,
                                response.status,
                              );
                              // Check if it's a self-compatibility error
                              if (response.status === 400) {
                                response
                                  .json()
                                  .then((data) => {
                                    if (
                                      data.message?.includes("yourself") ||
                                      data.message?.includes("own")
                                    ) {
                                      toast({
                                        title: "Cannot View Own Compatibility",
                                        description:
                                          "You cannot view compatibility analysis for your own profile.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                  })
                                  .catch(() => {});
                              }
                              throw new Error(
                                `API call failed with status ${response.status}`,
                              );
                            }
                          })
                          .then((data) => {
                            if (
                              data &&
                              data.score &&
                              data.score.targetProfileId
                            ) {
                              // Navigate using target profile ID from API response
                              setLocation(
                                `/suite/compatibility/${data.score.targetProfileId}`,
                              );
                            } else {
                              // Fallback: use profileId if available
                              if (profileId) {
                                setLocation(
                                  `/suite/compatibility/${profileId}`,
                                );
                              } else {
                                console.warn(
                                  "No profileId available for navigation",
                                );
                              }
                            }
                          })
                          .catch((error) => {
                            console.error(
                              `[SUITE-DISCOVER] Error calling compatibility API for user ${user.id}:`,
                              error,
                            );
                            // Navigate even if API call fails - use profileId as fallback
                            if (profileId) {
                              setLocation(`/suite/compatibility/${profileId}`);
                            } else {
                              console.warn(
                                "No profileId available for fallback navigation",
                              );
                            }
                          });
                      } else {
                        console.log(
                          `[SUITE-DISCOVER-DEBUG] Missing required data - currentUser: ${!!currentUser}, user: ${!!user}, userId: ${user?.id}`,
                        );
                      }
                    }}
                    className="absolute top-3 right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-emerald-100 to-white flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.4),0_2px_4px_rgba(16,185,129,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] backdrop-blur-sm compatibility-score hover:shadow-[0_6px_20px_rgba(16,185,129,0.5),0_4px_8px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer percentage-badge-container relative"
                    title="View detailed networking compatibility analysis"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center no-animation relative overflow-hidden"
                      style={{
                        boxShadow:
                          "inset 0 0 15px rgba(16, 185, 129, 0.2), 0 2px 8px rgba(16, 185, 129, 0.15)",
                        background:
                          (compatibility ?? 0) >= 90
                            ? `conic-gradient(#10b981 0%, #10b981 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                            : (compatibility ?? 0) >= 75
                              ? `conic-gradient(#059669 0%, #059669 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                              : `conic-gradient(#047857 0%, #047857 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`,
                      }}
                    >
                      <div
                        className="w-[3.1rem] h-[3.1rem] rounded-full bg-white flex items-center justify-center 
                      shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)]
                      transform transition-transform duration-300 hover:scale-105"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center justify-center scale-110 opacity-30 blur-[2px]">
                            <span
                              className="text-2xl font-black"
                              style={{
                                color:
                                  (compatibility ?? 0) >= 90
                                    ? "#10b981"
                                    : (compatibility ?? 0) >= 75
                                      ? "#059669"
                                      : "#047857",
                              }}
                            >
                              {compatibility ?? 0}
                            </span>
                          </div>
                          <span
                            className={`text-xl font-extrabold bg-gradient-to-b from-emerald-600 to-green-600 text-transparent bg-clip-text drop-shadow-sm ${"percentage-blurred"}`}
                          >
                            {compatibility ?? 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Padlock overlay at button level */}
                    {!isPremium && (
                      <div className="padlock-overlay padlock-networking">
                        🔒
                      </div>
                    )}
                  </button>
                )}

                {/* Mentorship Percentage Badge */}
                {profileType === "mentorship" && (
                  <button
                    onClick={() => {
                      // Premium restriction check for SUITE percentage badges
                      if (!isPremium && onPremiumUpgradeClick) {
                        // Show arrow guide pointing to star button
                        setShowArrowGuide(true);
                        // Hide arrow after 2 seconds
                        setTimeout(() => {
                          setShowArrowGuide(false);
                        }, 2000);
                        return;
                      }

                      // Navigate to mentorship compatibility (placeholder logic)
                      if (currentUser && user && profileId) {
                        setLocation(
                          `/suite/mentorship/compatibility/${profileId}`,
                        );
                      }
                    }}
                    className="absolute top-3 right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-amber-100 to-white flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.4),0_2px_4px_rgba(245,158,11,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] backdrop-blur-sm compatibility-score hover:shadow-[0_6px_20px_rgba(245,158,11,0.5),0_4px_8px_rgba(245,158,11,0.4)] transition-all duration-300 cursor-pointer percentage-badge-container relative"
                    title="View detailed mentorship compatibility analysis"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center no-animation relative overflow-hidden"
                      style={{
                        boxShadow:
                          "inset 0 0 15px rgba(245, 158, 11, 0.2), 0 2px 8px rgba(245, 158, 11, 0.15)",
                        background:
                          (compatibility ?? 0) >= 90
                            ? `conic-gradient(#f59e0b 0%, #f59e0b ${compatibility ?? 0}%, #dc2626 ${compatibility ?? 0}%, #dc2626 100%)`
                            : (compatibility ?? 0) >= 75
                              ? `conic-gradient(#d97706 0%, #d97706 ${compatibility ?? 0}%, #dc2626 ${compatibility ?? 0}%, #dc2626 100%)`
                              : `conic-gradient(#b45309 0%, #b45309 ${compatibility ?? 0}%, #dc2626 ${compatibility ?? 0}%, #dc2626 100%)`,
                      }}
                    >
                      <div
                        className="w-[3.1rem] h-[3.1rem] rounded-full bg-white flex items-center justify-center 
                      shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)]
                      transform transition-transform duration-300 hover:scale-105"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center justify-center scale-110 opacity-30 blur-[2px]">
                            <span
                              className="text-2xl font-black"
                              style={{
                                color:
                                  (compatibility ?? 0) >= 90
                                    ? "#f59e0b"
                                    : (compatibility ?? 0) >= 75
                                      ? "#d97706"
                                      : "#b45309",
                              }}
                            >
                              {compatibility ?? 0}
                            </span>
                          </div>
                          <span
                            className={`text-xl font-extrabold bg-gradient-to-b from-amber-600 to-orange-600 text-transparent bg-clip-text drop-shadow-sm ${"percentage-blurred"}`}
                          >
                            {compatibility ?? 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Padlock overlay at button level */}
                    {!isPremium && (
                      <div className="padlock-overlay padlock-mentorship">
                        🔒
                      </div>
                    )}
                  </button>
                )}

                {/* Jobs Percentage Badge */}
                {profileType === "jobs" && (
                  <button
                    onClick={() => {
                      // Premium restriction check for SUITE percentage badges
                      if (!isPremium && onPremiumUpgradeClick) {
                        // Show arrow guide pointing to star button
                        setShowArrowGuide(true);
                        // Hide arrow after 2 seconds
                        setTimeout(() => {
                          setShowArrowGuide(false);
                        }, 2000);
                        return;
                      }

                      // Navigate to jobs compatibility and trigger professional review creation
                      if (currentUser && user && profileId) {
                        // Call the jobs compatibility API to create professional review record
                        fetch(`/api/jobs/compatibility/${user.id}`)
                          .then((response) => response.json())
                          .then((data) => {
                            console.log(
                              "Jobs compatibility API response:",
                              data,
                            );
                            if (data.review) {
                              // Navigate to jobs professional review page
                              setLocation(`/suite/jobs/review/${user.id}`);
                            }
                          })
                          .catch((error) => {
                            console.error(
                              "Error calling jobs compatibility API:",
                              error,
                            );
                            // Navigate anyway as fallback
                            setLocation(`/suite/jobs/review/${user.id}`);
                          });
                      }
                    }}
                    className="absolute top-3 right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-blue-100 to-white flex items-center justify-center shadow-[0_4px_16px_rgba(59,130,246,0.4),0_2px_4px_rgba(59,130,246,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] backdrop-blur-sm compatibility-score hover:shadow-[0_6px_20px_rgba(59,130,246,0.5),0_4px_8px_rgba(59,130,246,0.4)] transition-all duration-300 cursor-pointer percentage-badge-container relative"
                    title="View detailed jobs compatibility analysis"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center no-animation relative overflow-hidden"
                      style={{
                        boxShadow:
                          "inset 0 0 15px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(59, 130, 246, 0.15)",
                        background:
                          (compatibility ?? 0) >= 90
                            ? `conic-gradient(#3b82f6 0%, #3b82f6 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                            : (compatibility ?? 0) >= 75
                              ? `conic-gradient(#2563eb 0%, #2563eb ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`
                              : `conic-gradient(#1d4ed8 0%, #1d4ed8 ${compatibility ?? 0}%, #f59e0b ${compatibility ?? 0}%, #f59e0b 100%)`,
                      }}
                    >
                      <div
                        className="w-[3.1rem] h-[3.1rem] rounded-full bg-white flex items-center justify-center 
                      shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)]
                      transform transition-transform duration-300 hover:scale-105"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center justify-center scale-110 opacity-30 blur-[2px]">
                            <span
                              className="text-2xl font-black"
                              style={{
                                color:
                                  (compatibility ?? 0) >= 90
                                    ? "#3b82f6"
                                    : (compatibility ?? 0) >= 75
                                      ? "#2563eb"
                                      : "#1d4ed8",
                              }}
                            >
                              {compatibility ?? 0}
                            </span>
                          </div>
                          <span
                            className={`text-xl font-extrabold bg-gradient-to-b from-blue-600 to-indigo-600 text-transparent bg-clip-text drop-shadow-sm ${"percentage-blurred"}`}
                          >
                            {compatibility ?? 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Padlock overlay at button level */}
                    {!isPremium && (
                      <div className="padlock-overlay padlock-jobs">🔒</div>
                    )}
                  </button>
                )}
              </>
            )}

          {/* Verification Badge - positioned below percentage badge with 3D shiny styling */}
          {isVerified && (
            <div className="absolute top-24 right-4 z-30">
              <div className="relative inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-[0_3px_12px_rgba(34,197,94,0.4),0_1px_6px_rgba(34,197,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden border border-emerald-300/50 transform hover:scale-105 transition-all duration-200">
                <Shield className="h-2.5 w-2.5 drop-shadow-sm" />
                <span className="drop-shadow-sm tracking-wide">Verified</span>
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          )}

          {/* Enhanced user info overlay with gradient background for better text readability */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 pt-16 pb-3 flex flex-col">
            <div className="relative z-10">
              {/* Main row with name, age, and nationality - Hide name/age for SUITE Profile */}
              <div className="flex items-center justify-between mb-1">
                {!isFromSuiteProfile && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-extrabold flex items-center">
                      <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient no-animation">
                        <span className="text-4xl">
                          {user.fullName.split(" ")[0].charAt(0)}
                        </span>
                        {user.fullName.split(" ")[0].slice(1)}
                        {!user.hideAge && (
                          <>, {calculateAge(user.dateOfBirth)}</>
                        )}
                      </span>
                    </h2>
                  </div>
                )}

                {/* Country of Origin / Nationality - Hide for SUITE Profile */}
                {!isFromSuiteProfile &&
                  user.countryOfOrigin &&
                  fieldVisibility.countryOfOrigin && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                      <div className="flex flex-wrap gap-0.5">
                        <span className="font-medium text-xs text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          {getCountryNationality(user.countryOfOrigin)}
                        </span>
                        {(user as any).secondaryCountryOfOrigin && (
                          <span className="font-medium text-xs text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] opacity-90">
                            /{" "}
                            {getCountryNationality(
                              (user as any).secondaryCountryOfOrigin,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Profile fields - Hide for SUITE Profile */}
              {!isFromSuiteProfile && (
                <>
                  {/* Single tribe badge below nationality on right side */}
                  {user.ethnicity &&
                    !user.secondaryTribe &&
                    fieldVisibility.tribe && (
                      <div className="flex justify-end mb-1">
                        <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                          <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                          <span className="relative z-10 drop-shadow-sm">
                            {user.ethnicity}
                          </span>
                        </Badge>
                      </div>
                    )}

                  {/* Two tribe badges below nationality on right side (only if there are two) - only show if visibility enabled */}
                  {user.ethnicity &&
                    user.secondaryTribe &&
                    fieldVisibility.tribe && (
                      <div className="flex justify-end mb-1">
                        <div className="flex flex-wrap gap-1">
                          <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                            <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                            <span className="relative z-10 drop-shadow-sm">
                              {user.ethnicity}
                            </span>
                          </Badge>
                          <Badge className="relative bg-gradient-to-br from-fuchsia-400 via-fuchsia-600 to-purple-700 text-white shadow-lg text-xs py-0.5 px-2 border border-fuchsia-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                            <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                            <span className="relative z-10 drop-shadow-sm">
                              {user.secondaryTribe}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    )}

                  {/* Location row - only show if visibility enabled */}
                  {user.location && fieldVisibility.residence && (
                    <div className="flex items-center mb-1.5">
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="font-medium text-sm text-orange-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] no-animation">
                          {user.location}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Job/Profession row with icon - only show if visibility enabled */}
                  {user.profession && fieldVisibility.profession && (
                    <div className="flex items-center mb-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation">
                        {user.profession}
                      </span>
                    </div>
                  )}

                  {/* Religion row with icon - only show if visibility enabled */}
                  {user.religion && fieldVisibility.religion && (
                    <div className="flex items-center mb-1.5">
                      <span className="mr-1 text-violet-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                        🙏
                      </span>
                      <span className="font-medium text-sm bg-gradient-to-r from-violet-200 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                        {getSwipeCardReligionDisplay(user.religion)}
                      </span>
                    </div>
                  )}

                  {/* Relationship Status - only show if visibility enabled - MOVED UP */}
                  {user.relationshipStatus &&
                    fieldVisibility.relationshipStatus && (
                      <div className="flex items-center mb-1.5">
                        <Heart className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                        <span className="font-medium text-sm text-rose-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          Status:{" "}
                          {translate(
                            `relationshipStatus.${user.relationshipStatus}`,
                          ) || user.relationshipStatus}
                        </span>
                      </div>
                    )}

                  {/* Move "Looking for" after Nationality - except for Profile Preview mode */}
                  {user.relationshipGoal &&
                    fieldVisibility.relationshipGoal &&
                    !mode.includes("preview") && (
                      <div className="flex items-center mb-1.5">
                        <CalendarHeart className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                        <span className="bg-gradient-to-r from-rose-300 to-red-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation">
                          Open to:{" "}
                          {translate(
                            `relationshipGoals.${user.relationshipGoal}`,
                          ) || user.relationshipGoal}
                        </span>
                      </div>
                    )}

                  {/* Bio with enhanced visibility - only shown when bio exists and visibility is enabled */}
                  {user.bio && fieldVisibility.bio && (
                    <div className="mb-2 rounded-md overflow-hidden">
                      <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation">
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* High School - only show if visibility enabled - MOVED UNDER BIO */}
                  {user.highSchool && fieldVisibility.highSchool && (
                    <div className="flex items-center mb-1.5">
                      <BookType className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                      <span className="font-serif text-sm bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation tracking-wide italic font-semibold">
                        {user.highSchool}
                      </span>
                    </div>
                  )}

                  {/* College/University - only show if visibility enabled - MOVED UNDER BIO */}
                  {user.collegeUniversity &&
                    fieldVisibility.collegeUniversity && (
                      <div className="flex items-center mb-1.5">
                        <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                        <span className="font-serif text-sm bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation tracking-wide italic font-semibold">
                          {user.collegeUniversity}
                        </span>
                      </div>
                    )}

                  {/* Interests with colorful badges - only show when there are actual interests or when loading and we expect interests */}
                  {fieldVisibility.interests &&
                    (interestsLoading || dynamicUserInterests.length > 0) && (
                      <div>
                        <span className="font-semibold text-white bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation">
                          {translate("app.topInterests")}
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {/* Show loading state while interests are being fetched */}
                          {interestsLoading && dynamicUserInterests.length === 0
                            ? // Loading skeleton badges
                              Array.from({ length: 3 }).map((_, index) => (
                                <div
                                  key={`loading-${index}`}
                                  className="h-6 bg-gray-300/20 rounded-full animate-pulse"
                                  style={{
                                    width: `${60 + Math.random() * 40}px`,
                                  }}
                                />
                              ))
                            : // Display real user interests (only visible ones)
                              dynamicUserInterests
                                .slice(0, 3)
                                .map((interest: string, index: number) => {
                                  // Dynamic colorful badges with alternating gradients
                                  const gradientClasses = [
                                    "from-purple-500/90 to-fuchsia-500/90",
                                    "from-amber-500/90 to-orange-500/90",
                                    "from-teal-500/90 to-cyan-500/90",
                                  ];
                                  const gradientClass =
                                    gradientClasses[
                                      index % gradientClasses.length
                                    ];

                                  return (
                                    <Badge
                                      key={`${user.id}-${index}`}
                                      className={`relative bg-gradient-to-br ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border border-white/30 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal static-gradient no-animation`}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                      <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                      <span className="relative z-10 drop-shadow-sm">
                                        {interest}
                                      </span>
                                    </Badge>
                                  );
                                })}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced swipe buttons with 3D styling and custom animations - Hide for SUITE Profile */}
        {!isFromSuiteProfile && (
          <div className="py-1.5 px-5 flex justify-around relative overflow-hidden backdrop-blur-md button-container">
            {/* Enhanced flamboyant animated background with vibrant patterns */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-purple-200/80 via-pink-100/90 to-rose-200/80 z-0
            before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZjlkZmYiIGZpbGwtb3BhY2l0eT0iMC4wOCI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NWgtMXYtNXptNCAwdjFoLTN2LTFoM3ptLTggMmgxdjFoLTF2LTF6bS0yIDBoMXYxaC0xdi0xem00IDB2MWgtMXYtMWgxem0wLTJ2MWgtM3YtMWgzeiIvPjwvZz48L2c+PC9zdmc+')]
            before:opacity-80
            after:absolute after:inset-0 after:bg-gradient-to-r after:from-cyan-200/20 after:via-fuchsia-300/30 after:to-amber-200/20 after:bg-blend-color-dodge
            "
            ></div>

            {/* Shimmering overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-80 mix-blend-soft-light"></div>

            {/* Enhanced animated decorative elements */}
            <div className="absolute -top-2 left-[15%] w-3 h-3 rounded-full bg-indigo-300/70 blur-[2px] animate-float"></div>
            <div
              className="absolute -bottom-1 left-[75%] w-2.5 h-2.5 rounded-full bg-pink-300/70 blur-[2px] animate-float"
              style={{ animationDelay: "1.5s" }}
            ></div>
            <div
              className="absolute top-[30%] right-[10%] w-2 h-2 rounded-full bg-amber-300/70 blur-[2px] animate-float"
              style={{ animationDelay: "0.7s" }}
            ></div>
            <div
              className="absolute top-[40%] left-[40%] w-1.5 h-1.5 rounded-full bg-teal-300/70 blur-[2px] animate-float"
              style={{ animationDelay: "1.2s" }}
            ></div>
            <div
              className="absolute bottom-[15%] right-[25%] w-1.5 h-1.5 rounded-full bg-purple-300/70 blur-[2px] animate-float"
              style={{ animationDelay: "0.9s" }}
            ></div>

            {/* Enhanced light beam effect that moves across buttons */}
            <div className="absolute top-0 -left-[100%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-light-beam"></div>

            {/* Radial glow effect */}
            <div className="absolute inset-0 bg-radial-gradient opacity-70 mix-blend-overlay"></div>

            {/* Undo Button with enhanced animations - ONLY SHOWN IN NON-MATCH MODE */}
            {mode !== "match" && (
              <button
                ref={undoButtonRef}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 relative overflow-hidden ${getCompatibleClassName("swipe-button")} ${undoButtonState === "processing" ? "button-click-effect" : ""}`}
                onClick={handleUndo}
                disabled={
                  undoButtonState !== "default" ||
                  (!canUndo && !currentUser?.profileHidden)
                }
                style={{
                  background:
                    "linear-gradient(140deg, #a5b4fc 0%, #6366f1 100%)",
                  boxShadow:
                    "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(99, 102, 241, 0.1)",
                  transform: "perspective(500px) rotateX(10deg)",
                  opacity:
                    !canUndo && !currentUser?.profileHidden ? "0.7" : "1",
                }}
                onMouseOver={(e) => {
                  if (
                    undoButtonState === "default" &&
                    (canUndo || currentUser?.profileHidden)
                  ) {
                    applySafeStyles(e.currentTarget as HTMLElement, {
                      transform: "perspective(500px) rotateX(5deg) scale(1.05)",
                      boxShadow:
                        "0 6px 10px rgba(99, 102, 241, 0.35), 0 10px 30px rgba(99, 102, 241, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(99, 102, 241, 0.1)",
                    });
                  }
                }}
                onMouseOut={(e) => {
                  if (undoButtonState === "default") {
                    applySafeStyles(e.currentTarget as HTMLElement, {
                      transform: "perspective(500px) rotateX(10deg)",
                      boxShadow:
                        "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(99, 102, 241, 0.1)",
                    });
                  }
                }}
              >
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                  >
                    <path d="M9 14 4 9l5-5" />
                    <path d="M4 9h9a6 6 0 0 1 0 12H9" />
                  </svg>

                  {/* Conditional animation based on button state */}
                  {undoButtonState === "success" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-8 h-8 rounded-full bg-indigo-200 opacity-70 animate-ping"
                        style={{ animationDuration: "1s" }}
                      ></div>
                    </div>
                  ) : undoButtonState === "processing" ? (
                    <div
                      className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-indigo-300 animate-spin-slow"
                      style={{ animationDuration: "1.5s" }}
                    ></div>
                  ) : canUndo && undoCount === 0 ? (
                    <div
                      className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse-slow opacity-50"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                  ) : (
                    <div
                      className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse-slow"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                  )}
                </div>
              </button>
            )}

            {/* Dislike Button */}
            <button
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 relative overflow-hidden swipe-button"
              {...createButtonHandler(handleDislikeButtonClick)}
              style={{
                background: "linear-gradient(140deg, #fda4af 0%, #e11d48 100%)",
                boxShadow:
                  "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(225, 29, 72, 0.1)",
                transform: "perspective(500px) rotateX(10deg)",
                touchAction: "manipulation", // Improve touch responsiveness
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(5deg) scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 10px rgba(225, 29, 72, 0.35), 0 10px 30px rgba(225, 29, 72, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(225, 29, 72, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(10deg)";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(225, 29, 72, 0.1)";
              }}
            >
              {/* Add a subtle pulse effect to the Pass X icon */}
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>

                {/* Add a small decorative element */}
                <div
                  className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse-slow"
                  style={{ animationDelay: "0.3s" }}
                ></div>
              </div>
            </button>

            <button
              className="w-16 h-16 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 relative overflow-hidden swipe-button"
              onClick={(e) => {
                // Block star button actions if current user has never activated their profile
                if (!currentUser?.hasActivatedProfile) {
                  onActivationNeeded?.();
                  return;
                }
                // Premium restriction check for middle star button
                if (!isPremium && onPremiumUpgradeClick) {
                  onPremiumUpgradeClick();
                  return;
                }
                // Trigger star animation
                if (!starAnimating && showStarOnButton) {
                  setStarAnimating(true);
                  setShowStarOnButton(false);

                  // Create flying star animation
                  const button = e.currentTarget;
                  const flyingStar = document.createElement("div");
                  flyingStar.innerHTML = "⭐";
                  flyingStar.className = "flying-star";
                  flyingStar.style.position = "fixed";
                  flyingStar.style.zIndex = "9999";
                  flyingStar.style.fontSize = "2rem";
                  flyingStar.style.pointerEvents = "none";

                  // Get button position
                  const buttonRect = button.getBoundingClientRect();
                  flyingStar.style.left = `${buttonRect.left + buttonRect.width / 2 - 16}px`;
                  flyingStar.style.top = `${buttonRect.top + buttonRect.height / 2 - 16}px`;

                  // Add to document
                  document.body.appendChild(flyingStar);

                  // Get percentage badge position for precise targeting
                  const cardElement = e.currentTarget.closest(".swipe-card");
                  if (cardElement) {
                    let badgeX, badgeY;

                    // First try to get actual percentage badge position
                    const percentageBadge = cardElement.querySelector(
                      ".percentage-badge-container",
                    );
                    if (percentageBadge) {
                      const badgeRect = percentageBadge.getBoundingClientRect();
                      badgeX = badgeRect.left + badgeRect.width / 2;
                      badgeY = badgeRect.top + badgeRect.height / 2;
                    } else {
                      // Fallback to card-based approximation if badge not found
                      const cardRect = cardElement.getBoundingClientRect();
                      badgeX = cardRect.right - 50;
                      badgeY = cardRect.top + 30;
                    }

                    // Calculate precise trajectory from button center to badge center
                    const buttonCenterX =
                      buttonRect.left + buttonRect.width / 2;
                    const buttonCenterY =
                      buttonRect.top + buttonRect.height / 2;
                    const deltaX = badgeX - buttonCenterX;
                    const deltaY = badgeY - buttonCenterY;

                    // Set CSS custom properties for dynamic targeting
                    flyingStar.style.setProperty("--target-x", `${deltaX}px`);
                    flyingStar.style.setProperty("--target-y", `${deltaY}px`);
                    flyingStar.style.animation =
                      "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

                    // Also apply dynamic targeting to the black star animation
                    setTimeout(() => {
                      const blackStar =
                        document.getElementById("flying-black-star");
                      if (blackStar) {
                        blackStar.style.setProperty(
                          "--target-x",
                          `${deltaX}px`,
                        );
                        blackStar.style.setProperty(
                          "--target-y",
                          `${deltaY}px`,
                        );
                        blackStar.style.animation =
                          "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";
                      }
                    }, 50);

                    // Trigger padlock unlock and percentage badge hit animation after flight delay
                    setTimeout(() => {
                      const percentageBadge = cardElement.querySelector(
                        ".percentage-badge-container",
                      );
                      if (percentageBadge) {
                        // Start padlock unlock animation
                        const padlock =
                          percentageBadge.querySelector(".padlock-overlay");
                        if (padlock) {
                          padlock.classList.add("padlock-unlock");
                          setTimeout(() => {
                            setMeetPadlockUnlocked(true);
                          }, 400);
                        }

                        // Badge hit animation
                        percentageBadge.classList.add("percentage-badge-hit");
                        setTimeout(() => {
                          percentageBadge.classList.remove(
                            "percentage-badge-hit",
                          );
                        }, 600);
                      }

                      // Create confetti explosion
                      const confettiColors = [
                        "#ff6b6b",
                        "#4ecdc4",
                        "#45b7d1",
                        "#f9ca24",
                        "#f0932b",
                      ];
                      for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                          const confetti = document.createElement("div");
                          confetti.innerHTML = "✨";
                          confetti.className = "confetti-particle";
                          confetti.style.position = "fixed";
                          confetti.style.left = badgeX + "px";
                          confetti.style.top = badgeY + "px";
                          confetti.style.fontSize = "1.2rem";
                          confetti.style.pointerEvents = "none";
                          confetti.style.zIndex = "9998";
                          confetti.style.color = confettiColors[i];
                          document.body.appendChild(confetti);

                          // Random explosion direction
                          const angle = (Math.PI * 2 * i) / 5;
                          const distance = 60 + Math.random() * 40;
                          const x = Math.cos(angle) * distance;
                          const y = Math.sin(angle) * distance;

                          confetti.style.transition = "all 0.8s ease-out";
                          confetti.style.transform = `translate(${x}px, ${y}px) scale(0.5)`;
                          confetti.style.opacity = "0";

                          setTimeout(() => {
                            if (confetti.parentNode) {
                              confetti.parentNode.removeChild(confetti);
                            }
                          }, 800);
                        }, i * 50);
                      }

                      // Remove flying star
                      setTimeout(() => {
                        if (flyingStar.parentNode) {
                          flyingStar.parentNode.removeChild(flyingStar);
                        }
                      }, 200);
                    }, 1500);
                  }

                  // Reset animation after completion
                  setTimeout(() => {
                    setStarAnimating(false);
                  }, 2000);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Trigger the same onClick logic
                const clickEvent = new MouseEvent("click", {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                });
                Object.defineProperty(clickEvent, "currentTarget", {
                  writable: false,
                  value: e.currentTarget,
                });
                e.currentTarget.dispatchEvent(clickEvent);
              }}
              style={{
                background: "linear-gradient(140deg, #fde68a 0%, #fbbf24 100%)",
                boxShadow:
                  "0 4px 6px rgba(251, 191, 36, 0.25), 0 8px 24px rgba(251, 191, 36, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(251, 191, 36, 0.1)",
                transform: "perspective(500px) rotateX(10deg)",
                touchAction: "manipulation", // Improve touch responsiveness
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(5deg) scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 10px rgba(251, 191, 36, 0.35), 0 10px 30px rgba(251, 191, 36, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(251, 191, 36, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(10deg)";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(251, 191, 36, 0.25), 0 8px 24px rgba(251, 191, 36, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(251, 191, 36, 0.1)";
              }}
            >
              <div
                className="perspective-[800px] relative"
                style={{
                  animation: "star-spin-3d 3s linear infinite",
                  transformStyle: "preserve-3d",
                }}
              >
                {showStarOnButton && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-9 w-9"
                    viewBox="0 0 24 24"
                    fill="black"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                )}

                {/* Add small star sparkles around the main star */}
                {showStarOnButton && (
                  <>
                    <div
                      className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse-slow"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="absolute -bottom-1 left-2 w-1 h-1 rounded-full bg-amber-400 animate-pulse-slow"
                      style={{ animationDelay: "0.7s" }}
                    ></div>
                  </>
                )}
              </div>
            </button>

            <button
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 relative overflow-hidden swipe-button"
              {...createButtonHandler(handleLikeButtonClick)}
              style={{
                background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
                boxShadow:
                  "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(16, 185, 129, 0.1)",
                transform: "perspective(500px) rotateX(10deg)",
                touchAction: "manipulation", // Improve touch responsiveness
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(5deg) scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(16, 185, 129, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(10deg)";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(16, 185, 129, 0.1)";
              }}
            >
              {/* Add a subtle pulse effect to the heart */}
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>

                {/* Add small sparkles */}
                <div
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-slow"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>
            </button>

            {/* Message Button with enhanced animations - ONLY SHOWN IN NON-MATCH MODE */}
            {mode !== "match" && (
              <button
                ref={messageButtonRef}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 relative overflow-hidden swipe-button ${messageButtonState === "sending" ? "button-click-effect" : ""}`}
                onClick={handleDirectMessage}
                disabled={messageButtonState !== "default"}
                style={{
                  background:
                    "linear-gradient(140deg, #7dd3fc 0%, #0ea5e9 100%)",
                  boxShadow:
                    "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(14, 165, 233, 0.1)",
                  transform: "perspective(500px) rotateX(10deg)",
                }}
                onMouseOver={(e) => {
                  if (messageButtonState === "default") {
                    e.currentTarget.style.transform =
                      "perspective(500px) rotateX(5deg) scale(1.05)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 10px rgba(14, 165, 233, 0.35), 0 10px 30px rgba(14, 165, 233, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(14, 165, 233, 0.1)";
                  }
                }}
                onMouseOut={(e) => {
                  if (messageButtonState === "default") {
                    e.currentTarget.style.transform =
                      "perspective(500px) rotateX(10deg)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(14, 165, 233, 0.1)";
                  }
                }}
              >
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>

                  {/* Conditional animation based on button state */}
                  {messageButtonState === "success" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-8 h-8 rounded-full bg-sky-200 opacity-70 animate-ping"
                        style={{ animationDuration: "1s" }}
                      ></div>
                    </div>
                  ) : messageButtonState === "sending" ? (
                    <div
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-sky-300 animate-spin-slow"
                      style={{ animationDuration: "1.5s" }}
                    ></div>
                  ) : (
                    <div
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-sky-300 animate-ping"
                      style={{ animationDuration: "2s" }}
                    ></div>
                  )}
                </div>
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Flying Star Animation */}
      {starAnimating && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <div
            id="flying-black-star"
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2"
            style={{
              animation: "star-flight 1.5s ease-in-out forwards",
              animationDelay: "0s",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="black"
              stroke="black"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                animation: "star-rotate 1.5s linear infinite",
              }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>

          {/* Confetti explosion at impact */}
          <div
            className="absolute top-4 right-4"
            style={{
              animation: "confetti-explosion 0.8s ease-out forwards",
              animationDelay: "1.4s",
            }}
          >
            {/* Multiple confetti particles */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    "#fbbf24",
                    "#f59e0b",
                    "#d97706",
                    "#b45309",
                    "#92400e",
                  ][i % 5],
                  animation: `confetti-particle-${i % 4} 1s ease-out forwards`,
                  animationDelay: `${1.4 + i * 0.05}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Arrow Guide for MEET Unlock */}
      {showArrowGuide && (
        <div className="unlock-guide-arrow arrow-meet">
          <div className="unlock-guide-text">Click ⭐ to unlock</div>
          <div className="arrow-line-container">
            <div className="arrow-line"></div>
            <div className="arrow-head"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate age from date of birth
function calculateAge(dob: Date | null): string {
  if (!dob) return "Unknown"; // Display "Unknown" instead of "?" for better UX

  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // If age is negative (which could happen due to bugs),
  // display it as "Unknown" rather than showing an incorrect value
  if (age < 0) return "0";

  // If age is exactly 0, show "0" instead of "Unknown" as requested
  return age.toString();
}
