import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { User, Match } from "@shared/schema";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { UserPicture } from "@/components/ui/user-picture";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Heart,
  X,
  Star,
  MessageSquare,
  SendHorizonal,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateCompatibility } from "@/lib/compatibility";
import {
  safeApiRequest,
  handleApiResponse,
  safeParseJson,
} from "@/lib/api-helpers";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageSetObject,
  safeStorageGetObject,
} from "@/lib/storage-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SwipeCard } from "@/components/ui/swipe-card";
import { MatchPopup } from "@/components/ui/match-popup";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useLanguage } from "@/hooks/use-language";
import { useMatchCount } from "@/hooks/use-match-count";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { ExpandableSwipeCardModal } from "@/components/ui/expandable-swipe-card-modal";
import { PremiumUpgradeDialog } from "@/components/settings/premium-upgrade-dialog";

interface LikedByUser {
  id: number;
  matchId: number;
  userId: number;
  fullName: string;
  photoUrl?: string;
  age?: number;
  location?: string;
  bio?: string;
  compatibility?: number;
}

interface MatchUser {
  id: number;
  matchId: number;
  userId: number;
  fullName: string;
  photoUrl?: string;
  age?: number;
  location?: string;
  bio?: string;
  profession?: string;
  ethnicity?: string;
  secondaryTribe?: string;
  religion?: string;
  relationshipGoal?: string;
  relationshipStatus?: string;
  countryOfOrigin?: string;
  visibilityPreferences?: string;
  compatibility?: number;
  matched: boolean;
  isPendingLike?: boolean; // Indicates if this user has liked the current user but isn't matched yet
  lastMessageTime?: string;
  showProfilePhoto?: boolean; // Controls whether to show the profile photo
}

// Helper function to check if photo should be shown based on both showProfilePhoto and visibility preferences
function shouldShowMatchPhoto(match: MatchUser): boolean {
  // First check the basic showProfilePhoto field
  if (match.showProfilePhoto === false) {
    return false;
  }

  // Then check visibility preferences if they exist
  if (match.visibilityPreferences) {
    try {
      const preferences = JSON.parse(match.visibilityPreferences);
      // If photos field exists in preferences, respect it
      if (preferences.photos !== undefined) {
        return Boolean(preferences.photos);
      }
    } catch (error) {
      console.error("Error parsing visibility preferences for match:", error);
    }
  }

  // Default: show photo if showProfilePhoto is not explicitly false
  return match.showProfilePhoto !== false;
}

// Enhanced mini profile card with dramatic dark mode styling
function MatchProfileCard({
  match,
  onClick,
  darkMode,
  hasBlurredCards = false,
}: {
  match: MatchUser;
  onClick: () => void;
  darkMode?: boolean;
  hasBlurredCards?: boolean;
}) {
  return (
    <motion.div
      className={`cursor-pointer rounded-2xl overflow-hidden fast-card relative transition-all duration-700 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 shadow-2xl shadow-black/50 border border-gray-700/40 backdrop-blur-md hover:shadow-purple-500/30 hover:border-purple-500/50' 
          : 'bg-white shadow-lg hover:shadow-2xl border border-purple-200/60 backdrop-blur-md'
      }`}
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        minHeight: "200px",
      }}
      whileHover={{
        y: -6,
        scale: 1.02,
        boxShadow: darkMode 
          ? "0 25px 50px -12px rgba(168, 85, 247, 0.4), 0 20px 30px -5px rgba(168, 85, 247, 0.2)"
          : "0 20px 40px -12px rgba(124, 58, 237, 0.15), 0 15px 20px -5px rgba(124, 58, 237, 0.1)",
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
        delay: match.isPendingLike ? 0 : Math.random() * 0.1,
      }}
    >
      {/* Single photo container with overlay text - no separate text section */}
      <div className="relative w-full h-full overflow-hidden group">
        {match.photoUrl && shouldShowMatchPhoto(match) ? (
          <>
            <img
              src={match.photoUrl}
              alt={match.fullName}
              className={`w-full h-full object-cover transform transition-all duration-700 group-hover:scale-105 card-image ${
                darkMode ? 'brightness-95 contrast-110 saturate-110' : ''
              } ${hasBlurredCards ? 'blur-xl' : ''}`}
              loading="eager"
              decoding="async"
            />
            {darkMode && (
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/30 via-transparent to-gray-800/10"></div>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center transition-all duration-700 ${
            darkMode 
              ? 'bg-gradient-to-br from-purple-600/90 via-purple-700/80 to-pink-600/90 shadow-inner shadow-black/30' 
              : 'bg-gradient-to-br from-purple-400 via-purple-500 to-pink-500'
          } ${hasBlurredCards ? 'blur-xl' : ''}`}>
            <span className={`text-4xl font-bold drop-shadow-lg transition-all duration-700 ${
              darkMode ? 'text-white/98 filter drop-shadow-2xl' : 'text-white'
            }`}>
              {match.fullName.charAt(0)}
            </span>
            {darkMode && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            )}
          </div>
        )}

        {/* Enhanced gradient overlay with dark mode support */}
        <div className={`absolute inset-0 transition-all duration-700 ${
          darkMode 
            ? 'bg-gradient-to-t from-black/80 via-black/20 to-transparent' 
            : 'bg-gradient-to-t from-black/70 via-black/10 to-transparent'
        }`} />

        {/* Enhanced status badge with premium dark mode styling */}
        <div className="absolute top-3 right-3 flex items-center space-x-1">
          {match.isPendingLike ? (
            // Enhanced pending like indicator with dark mode glow
            <motion.div
              className={`w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center transition-all duration-700 ${
                darkMode ? 'shadow-lg shadow-pink-500/40 border border-pink-400/30' : ''
              }`}
              animate={{
                scale: [1, 1.2, 1],
                boxShadow: darkMode ? [
                  "0 0 0 0 rgba(236, 72, 153, 0.8)",
                  "0 0 0 8px rgba(236, 72, 153, 0)",
                  "0 0 0 0 rgba(236, 72, 153, 0.8)",
                ] : [
                  "0 0 0 0 rgba(236, 72, 153, 0.7)",
                  "0 0 0 6px rgba(236, 72, 153, 0)",
                  "0 0 0 0 rgba(236, 72, 153, 0.7)",
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              }}
            >
              <Heart className="h-3 w-3 text-white" fill="white" />
            </motion.div>
          ) : (
            // Enhanced confirmed match indicator with dark mode styling
            <div className={`w-3 h-3 rounded-full bg-green-400 relative transition-all duration-700 ${
              darkMode ? 'shadow-lg shadow-green-400/50' : ''
            }`}>
              <span className={`absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75 ${
                darkMode ? 'shadow-green-400/30' : ''
              }`}></span>
            </div>
          )}
        </div>

        {/* Enhanced overlay text with premium dark mode styling */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-700 ${
          darkMode ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent backdrop-blur-sm' : ''
        } ${hasBlurredCards ? 'blur-xl' : ''}`}>
          <h3 
            className="text-white text-lg font-bold truncate mb-1 transition-all duration-700"
            style={{ 
              textShadow: darkMode 
                ? '4px 4px 12px rgba(0,0,0,0.95), 2px 2px 6px rgba(0,0,0,0.9), 0 0 20px rgba(168, 85, 247, 0.3)' 
                : '4px 4px 8px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {hasBlurredCards ? "•••••" : match.fullName.split(" ")[0]}
          </h3>
          {match.location && (
            <p 
              className="text-xs font-medium text-white transition-all duration-700"
              style={{ 
                textShadow: darkMode 
                  ? '2px 2px 6px rgba(0,0,0,0.95), 0 0 10px rgba(168, 85, 247, 0.2)' 
                  : '2px 2px 4px rgba(0,0,0,0.9)'
              }}
            >
              📍 {hasBlurredCards ? "•••••" : match.location}
            </p>
          )}
        </div>

        {/* Premium upgrade overlay when cards are blurred */}
        {hasBlurredCards && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center text-white p-4">
              <div className="text-2xl mb-2">👑</div>
              <p className="text-sm font-semibold mb-1">Premium Required</p>
              <p className="text-xs opacity-80">Upgrade to see who likes you</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { translate } = useLanguage();
  const { darkMode } = useDarkMode();
  const { setMatchCount, setLikeCount } = useMatchCount();
  const [selectedUser, setSelectedUser] = useState<MatchUser | null>(null);
  const [expandedCardOpen, setExpandedCardOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [enrichedMatches, setEnrichedMatches] = useState<any[]>([]); // New state for matches with user profiles
  
  // State for expandable swipe card modal
  const [expandableModalOpen, setExpandableModalOpen] = useState(false);
  const [expandableModalUser, setExpandableModalUser] = useState<User | null>(null);
  const [premiumUpgradeOpen, setPremiumUpgradeOpen] = useState(false);

  // No specific view preference needed - we'll just show matches specific to this user
  // Store clicked match IDs specific to each user in localStorage with quota fallback
  const [clickedMatchIds, setClickedMatchIds] = useState<number[]>(() => {
    if (!user) return [];

    try {
      // User-specific key for clicked matches
      const storageKey = `clicked_matches_${user.id}`;
      return safeStorageGetObject(storageKey) || [];
    } catch (e) {
      console.error("Error loading clicked matches from storage:", e);
      return [];
    }
  });

  // Define a proper type for matches data to avoid TypeScript errors
  type MatchData = {
    id: number;
    matchId: number;
    userId: number;
    matchType: "confirmed" | "pending";
    fullName: string;
    photoUrl?: string;
    age?: number;
    location?: string;
    // Other potential fields
    isPendingLike?: boolean;
    compatibility?: number;
  }[];

  // Fetch both confirmed matches and users who have liked the current user - optimized for instant updates
  const {
    data: allMatches = [],
    isLoading: loadingMatches,
    refetch: refetchMatches,
  } = useQuery<MatchData>({
    queryKey: ["/api/matches"],
    enabled: !!user,
    // INSTANT LOADING: Optimized to use cache first, then update if needed
    staleTime: 30 * 1000, // 30 seconds stale time - use cached data for instant display
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    // Instant cache usage for immediate match display
    refetchOnMount: false, // Use cached data immediately, don't wait for refetch
    refetchOnWindowFocus: true, // Refresh when tab becomes active (but use cache first)
    // Conservative background polling to prevent mobile heating
    refetchInterval: 2 * 60 * 1000, // 2 minutes background polling - battery friendly
    refetchIntervalInBackground: false, // Do not poll in background
    select: (data) => {
      // Sort for priority display - pending likes first, then confirmed matches
      return [...data].sort((a, b) => {
        // First prioritize pending likes
        if (a.isPendingLike && !b.isPendingLike) return -1;
        if (!a.isPendingLike && b.isPendingLike) return 1;

        // Then by compatibility score (if available)
        if (a.compatibility && b.compatibility) {
          return b.compatibility - a.compatibility;
        }

        // Default to ID sort for stability
        return a.id - b.id;
      });
    },
  });

  // INSTANT DISPLAY FIX: Show matches immediately, then enrich in background
  useEffect(() => {
    if (!user || !allMatches || allMatches.length === 0) {
      setEnrichedMatches([]);
      return;
    }
    
    // IMMEDIATE: Set basic match data for instant card display
    const basicMatches = allMatches.map((match: any) => ({
      ...match,
      user: { 
        id: match.userId1 === user.id ? match.userId2 : match.userId1, 
        fullName: match.fullName || "Loading...",
        photoUrl: match.photoUrl || undefined
      }
    }));
    setEnrichedMatches(basicMatches);
    
    // BACKGROUND: Enrich with detailed profiles without blocking display
    let cancelled = false;
    const enrichProfiles = async () => {
      try {
        const enriched = await Promise.all(
          allMatches.map(async (match: any) => {
            const otherUserId =
              match.userId1 === user.id ? match.userId2 : match.userId1;
            try {
              const res = await fetch(`/api/profile/${otherUserId}`);
              const userProfile = await res.json();
              return { ...match, user: userProfile };
            } catch (e) {
              return {
                ...match,
                user: { 
                  id: otherUserId, 
                  fullName: match.fullName || "Unknown",
                  photoUrl: match.photoUrl || undefined
                },
              };
            }
          }),
        );
        if (!cancelled) {
          setEnrichedMatches(enriched);
        }
      } catch (error) {
        console.warn('Background profile enrichment failed:', error);
      }
    };
    
    // Start background enrichment after a short delay to ensure instant display
    setTimeout(enrichProfiles, 100);
    
    return () => {
      cancelled = true;
    };
  }, [allMatches, user]);

  // Update match count to reflect exactly what's displayed on the matches page
  useEffect(() => {
    if (enrichedMatches && Array.isArray(enrichedMatches) && user) {
      // Calculate the visible cards count - this is what should be shown in the badge
      const visibleMatchCards = enrichedMatches.filter(
        (match: any) => !clickedMatchIds.includes(match.id),
      );

      // Count confirmed matches vs pending likes
      const confirmedCount = visibleMatchCards.filter(
        (match: any) => match.matchType === "confirmed",
      ).length;
      const pendingCount = visibleMatchCards.filter(
        (match: any) => match.matchType === "pending",
      ).length;

      // Update counts to match exactly what's displayed on this page
      setMatchCount(confirmedCount);
      setLikeCount(pendingCount);
    }
  }, [enrichedMatches, clickedMatchIds, user, setMatchCount, setLikeCount]);

  // CRITICAL FIX: Special one-time effect to ensure matches refresh on first page load after login
  useEffect(() => {
    // This effect runs once on component mount
    console.log(
      "🔄 INITIAL LOAD: Ensuring fresh matches data right after login",
    );

    // ENHANCED: Use both prefetchQuery for immediate loading (no delay) and invalidateQueries for cache refresh
    queryClient
      .prefetchQuery({
        queryKey: ["/api/matches"],
        staleTime: 0,
      })
      .then(() => {
        console.log("✅ Initial prefetch of matches completed successfully");
      })
      .catch((error) => {
        console.error("❌ Error in initial matches prefetch:", error);

        // Fallback to invalidation in case prefetch fails
        // Force refresh matches data to ensure latest state
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
          refetchType: "all", // Force refetch even if data is considered fresh
        });
      });

    // Also refresh match counts
    queryClient.invalidateQueries({
      queryKey: ["/api/matches/counts"],
      refetchType: "all",
    });

    // Important: Remove any stale storage flags that might prevent showing new matches
    if (user) {
      // Clear any forcing flags that might be leftover from previous sessions
      safeStorageSet("force_match_popup", "");
      safeStorageSet("pending_match_popup", "");
    }

    // ENHANCED: Check in a short delay if matches loaded properly
    const timeoutId = setTimeout(() => {
      if (enrichedMatches && enrichedMatches.length === 0 && !loadingMatches) {
        console.log(
          "⚡ CRITICAL FIX: No matches loaded after timeout - forcing another reload",
        );
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
          refetchType: "all",
        });
      }
    }, 500); // Give network a short time to respond

    return () => clearTimeout(timeoutId);
    // Only run this effect when the component mounts and user is available
  }, [user, queryClient, enrichedMatches, loadingMatches]); // Include dependencies to avoid warnings

  // Enhanced WebSocket event system for instant match updates - prevents slow match card loading
  useEffect(() => {
    // Track last update time to prevent excessive API calls
    let lastUpdateTime = 0;
    
    // Function to handle standard like events with intelligent throttling
    const handleNewLike = (event: Event) => {
      const now = Date.now();
      if (now - lastUpdateTime < 3000) return; // Throttle to max once per 3 seconds
      
      lastUpdateTime = now;
      console.log("📱 [MATCHES-PAGE] New like received via WebSocket, refreshing match data");
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    };

    // Enhanced handler for instant match updates on mobile and desktop
    const handleNewLikeReceived = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { fromUserInfo, fromUserId, match } = event.detail;
        const now = Date.now();
        if (now - lastUpdateTime < 2000) return; // Prevent rapid-fire updates
        
        lastUpdateTime = now;
        console.log("📱 [MATCHES-PAGE] Instant new like received, updating matches");

        // Immediate cache invalidation for instant card display
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
          refetchType: "all",
        });

        // Also trigger immediate refetch to ensure UI updates instantly
        refetchMatches();
      }
    };

    // INSTANT UPDATE FIX: Handler specifically for WebSocket new_like events
    const handleInstantNewLike = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const now = Date.now();
        if (now - lastUpdateTime < 1000) return; // Allow faster updates for WebSocket events
        
        lastUpdateTime = now;
        console.log("📱 [MATCHES-PAGE] INSTANT: WebSocket new_like received, immediate update");

        // Force immediate cache invalidation and refetch
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
          refetchType: "all",
        });
        
        // Trigger immediate refetch without delay
        refetchMatches();
      }
    };

    // Mobile-optimized event handlers for instant updates
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        const now = Date.now();
        if (now - lastUpdateTime > 10000) { // Only if >10s since last update
          lastUpdateTime = now;
          console.log("📱 [MATCHES-PAGE] App became visible, refreshing matches");
          refetchMatches();
        }
      }
    };
    
    const handleFocusEvent = () => {
      if (user) {
        const now = Date.now();
        if (now - lastUpdateTime > 5000) { // Only if >5s since last update
          lastUpdateTime = now;
          console.log("📱 [MATCHES-PAGE] App focused, refreshing matches");
          refetchMatches();
        }
      }
    };

    // Cross-tab communication for synchronized updates
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'matches_updated' && user) {
        const now = Date.now();
        if (now - lastUpdateTime > 3000) { // Prevent duplicate updates
          lastUpdateTime = now;
          console.log("📱 [MATCHES-PAGE] Cross-tab update detected");
          refetchMatches();
        }
      }
    };

    // Add all event listeners for instant match updates
    window.addEventListener("like:new", handleNewLike);
    window.addEventListener("like:received", handleNewLikeReceived);
    window.addEventListener("like:new", handleInstantNewLike); // Additional handler for instant WebSocket updates
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocusEvent);
    window.addEventListener("storage", handleStorageChange);

    // Cleanup function
    return () => {
      window.removeEventListener("like:new", handleNewLike);
      window.removeEventListener("like:received", handleNewLikeReceived);
      window.removeEventListener("like:new", handleInstantNewLike);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocusEvent);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, refetchMatches, queryClient]);

  // Separate useEffect for handling match events  
  useEffect(() => {
    // Completely rewritten to robustly handle match events
    const handleNewMatch = (event: Event) => {
      console.log(
        "⚡ MATCH POPUP HANDLER: Received match event with high priority handling",
      );

      // Check for data in the event or in localStorage as a fallback
      if (event instanceof CustomEvent && event.detail) {
        const { fromUserInfo, matchId, match, forceDisplay } = event.detail;

        // Regardless of event data, check for forced match popup in localStorage
        const forceMatchPopup =
          localStorage.getItem("force_match_popup") === "true" ||
          forceDisplay === true;

        if (fromUserInfo || forceMatchPopup) {
          console.log(
            "⚡ MATCH POPUP HANDLER: Processing match popup with priority",
            { forceMatchPopup },
          );

          // IMMEDIATELY cancel any card interaction
          if (expandedCardOpen) {
            setExpandedCardOpen(false);
          }

          // Get matched user data - either from event or localStorage
          let matchUserData = fromUserInfo;

          // If no user info in event, try localStorage
          if (!matchUserData) {
            try {
              const storedUserData = localStorage.getItem("matched_user_data");
              if (storedUserData) {
                matchUserData = JSON.parse(storedUserData);
              }
            } catch (e) {
              console.error(
                "Error parsing matched user data from localStorage:",
                e,
              );
            }
          }

          if (!matchUserData) {
            console.error(
              "⚡ MATCH POPUP HANDLER: No user data available for match popup",
            );
            return;
          }

          // Prepare match user object for display
          const matchUser = {
            ...matchUserData,
            showProfilePhoto: true,

            createdAt: matchUserData.createdAt || null,
          } as User;

          console.log(
            "⚡ MATCH POPUP HANDLER: Instantly showing match popup for:",
            matchUser.fullName,
          );

          // Multiple redundant mechanisms to ensure popup appears:

          // 1. Refresh matches data to ensure up-to-date state
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

          // 2. Ensure match ID is stored for direct navigation
          const matchIdToUse = matchId || safeStorageGet("current_match_id");
          if (matchIdToUse) {
            safeStorageSet(`current_match_id`, matchIdToUse.toString());
            safeStorageSet(`displayed_match_popup_${matchIdToUse}`, "true");
          }

          // 3. Track every userId to ensure their cards never appear as likes
          if (match) {
            const userId1 = match.userId1;
            const userId2 = match.userId2;
            if (userId1 && userId2 && user) {
              const otherUserId = userId1 === user.id ? userId2 : userId1;
              safeStorageSet(`remove_like_${otherUserId}`, "true");

              // Add this match to clicked IDs to prevent showing in grid
              setClickedMatchIds((prev) => {
                const newIds = matchId ? [...prev, matchId] : prev;
                const storageKey = `clicked_matches_${user.id}`;
                try {
                  safeStorageSetObject(storageKey, newIds);
                } catch (e) {
                  console.error("Error saving clicked matches:", e);
                }
                return newIds;
              });
            }
          }

          // 4. GUARANTEED display of match popup - not dependent on state updates
          setTimeout(() => {
            setMatchedUser(matchUser);
            setShowMatch(true);
            console.log(
              "⚡ MATCH POPUP HANDLER: Match popup display forced in next tick",
            );
          }, 0);
        }
      }
    };

    // SURGICAL PRECISION FIX: Handler for WebSocket events
    const handleWebSocketMessage = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const message = event.detail;

        // Handle new like received event
        if (message.type === "new_like_received") {
          console.log(
            `[WebSocket] New like received from user ${message.fromUserId}:`,
            message.fromUserInfo,
          );

          // Refresh matches data to show the new like
          refetchMatches();

          // Trigger the new like received handler
          handleNewLikeReceived(event);
        }

        // Handle discover:refresh event
        if (
          message.type === "discover:refresh" ||
          message.type === "matches:refresh"
        ) {
          console.log(
            "[WebSocket] Refresh event received, updating matches data",
          );
          refetchMatches();
        }
      }
    };

    // CRITICAL FIX: Force immediate fetch of matches data when page mounts
    // This is essential for showing the most up-to-date likes immediately
    queryClient.invalidateQueries({
      queryKey: ["/api/matches"],
      refetchType: "all", // Force refetch even if data is considered fresh
    });

    // Check if there's a pending match popup from storage (for cases where match happened while on another page)
    const pendingMatchPopup = safeStorageGet("pending_match_popup");
    if (pendingMatchPopup === "true" && user) {
      // Clear the flag
      safeStorageSet("pending_match_popup", "");

      // Try to get match info if available
      const pendingMatchId = safeStorageGet("current_match_id");
      if (pendingMatchId) {
        // Fetch match details and show popup via API request
        fetch(`/api/matches/${pendingMatchId}`)
          .then((response) => response.json())
          .then((match: { userId1: number; userId2: number; id: number }) => {
            if (match) {
              // Determine the other user's ID from the match
              const otherUserId =
                match.userId1 === user.id ? match.userId2 : match.userId1;

              // Fetch the other user's profile
              return fetch(`/api/profile/${otherUserId}`)
                .then((response) => response.json())
                .then((otherUser: User) => {
                  if (otherUser) {
                    // Show the match popup with the other user
                    setMatchedUser(otherUser);
                    setShowMatch(true);
                  }
                });
            }
          })
          .catch((err: Error) =>
            console.error("Error loading pending match:", err),
          );
      }
    }

    // Clean up is handled by React Query and component unmounting
    return () => {};
  }, [user, refetchMatches, queryClient, setMatchedUser, setShowMatch]);

  // Define a type for match creation response to fix TypeScript errors
  interface MatchCreationResponse {
    id: number;
    userId1: number;
    userId2: number;
    matched: boolean;
    createdAt?: string;
    user?: User; // The matched user information
    success?: boolean;
    message?: string;
  }

  // Mutation to create a match when user likes back
  const likeBackMutation = useMutation<MatchCreationResponse, Error, number>({
    mutationFn: async (otherUserId: number) => {
      try {
        console.log(
          `Creating match between users ${user!.id} and ${otherUserId}`,
        );

        // Use the safe API request function that properly handles non-JSON responses
        const result = (await safeApiRequest("/api/matches", "POST", {
          userId1: user!.id,
          userId2: otherUserId,
          matched: true,
        })) as MatchCreationResponse;

        // Check if the response indicates a failure
        if (!result.success && result.message) {
          throw new Error(result.message);
        }

        return result;
      } catch (err) {
        console.error("Match creation error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      // Refresh data after match
      console.log("Match created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/liked-by"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/unread/count"],
      });

      // ⚡ REVISED MATCH POPUP TRIGGER: Multiple redundant mechanisms
      console.log(
        "⚡ MATCH POPUP TRIGGER: Implementing comprehensive match popup display",
      );

      // 1. Set all localStorage flags for popup visibility
      localStorage.setItem("pending_match_popup", "true");
      localStorage.setItem("force_match_popup", "true");
      localStorage.setItem(`current_match_id`, data.id.toString());
      localStorage.setItem(`displayed_match_popup_${data.id}`, "true");

      // 2. Store match timestamp for debugging
      const currentTime = Date.now();
      localStorage.setItem(`match_timestamp`, currentTime.toString());

      // 3. Store matched user data for retrieval by other handlers
      const matchUser = data.user as User | undefined;
      if (matchUser) {
        localStorage.setItem(`matched_user_data`, JSON.stringify(matchUser));
      }

      // 4. Dispatch events to ensure popup appears
      if (matchUser) {
        // Create custom event with all required data
        window.dispatchEvent(
          new CustomEvent("match:newMatch", {
            detail: {
              match: data,
              fromUserId: matchUser.id,
              fromUserInfo: matchUser,
              matchId: data.id,
              timestamp: currentTime,
              forceDisplay: true,
            },
          }),
        );
      }

      // 5. Dispatch storage event for cross-tab communication
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "force_match_popup",
          newValue: "true",
        }),
      );

      // 6. Update UI counts
      setMatchCount((prev: number) => prev + 1);
      setLikeCount((prev: number) => Math.max(0, prev - 1));

      // 7. DIRECT popup display (most reliable mechanism)
      if (matchUser) {
        // Format user for match popup
        const matchUserDisplay = {
          ...matchUser,
          showProfilePhoto: true,

          createdAt: matchUser.createdAt || null,
        } as User;

        // GUARANTEED immediate display with setTimeout
        setTimeout(() => {
          console.log(
            "⚡ MATCH POPUP TRIGGER: Direct popup display for:",
            matchUserDisplay.fullName,
          );
          setMatchedUser(matchUserDisplay);
          setShowMatch(true);
        }, 0);
      } else {
        // Fallback if user info not included in response
        toast({
          title: "It's a match!",
          description: "You can now message each other.",
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error("Match mutation error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Could not create match. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to reject a user who liked you
  const rejectUserMutation = useMutation({
    mutationFn: async (matchId: number) => {
      try {
        console.log(`Rejecting match with ID ${matchId}`);

        // Use the safe API request function that properly handles non-JSON responses
        const result = await safeApiRequest(
          `/api/matches/${matchId}`,
          "DELETE",
        );

        // Check if the response indicates a failure
        if (!result.success && result.message) {
          throw new Error(result.message);
        }

        return result;
      } catch (err) {
        console.error("Match rejection error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Successfully rejected user");
      queryClient.invalidateQueries({ queryKey: ["/api/liked-by"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

      // Update the like count when a user is rejected
      setLikeCount((prev: number) => Math.max(0, prev - 1));

      toast({
        title: "User rejected",
        description: "This user will no longer appear in your matches.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Reject mutation error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Could not reject user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle opening the expanded card with details
  // Enhanced function to fetch complete profile data before showing card
  const handleOpenUserCard = async (matchUser: MatchUser) => {
    try {
      console.log("🔍 CLICK DEBUG: Opening expandable swipe card for:", matchUser.fullName);
      console.log("🔍 CLICK DEBUG: Current user premium status:", user?.premiumAccess);
      console.log("🔍 CLICK DEBUG: Current premiumUpgradeOpen state:", premiumUpgradeOpen);

      // Check if current authenticated user doesn't have premium access and should see blurred cards
      if (!user?.premiumAccess) {
        console.log("🚨 PREMIUM GATE: Non-premium user attempting to view blurred card - showing upgrade dialog");
        setPremiumUpgradeOpen(true);
        console.log("🚨 PREMIUM GATE: setPremiumUpgradeOpen(true) called");
        return;
      }

      // Fetch complete profile data from API to ensure we have accurate field values
      const response = await fetch(`/api/profile/${matchUser.userId}`);
      let profileData = null;

      if (response.ok) {
        profileData = await response.json();
        console.log(`Retrieved profile data for ${matchUser.userId}:`, profileData);
      } else {
        console.warn(`Failed to fetch profile data for user ${matchUser.userId}, status: ${response.status}`);
      }

      // CRITICAL FIX: Also fetch interests separately since they're not included in profile endpoint
      const interestsResponse = await fetch(`/api/interests/${matchUser.userId}`);
      let interestsData = null;

      if (interestsResponse.ok) {
        interestsData = await interestsResponse.json();
        console.log(`Retrieved interests data for ${matchUser.userId}:`, interestsData);
        
        // Convert interests to the format expected by SwipeCard (array of interest strings)
        if (Array.isArray(interestsData)) {
          profileData = profileData || {};
          profileData.visibleInterests = interestsData
            .filter(interest => interest.showOnProfile === true)
            .map(interest => interest.interest);
          console.log(`Filtered visible interests for ${matchUser.userId}:`, profileData.visibleInterests);
        }
      } else {
        console.warn(`Failed to fetch interests data for user ${matchUser.userId}, status: ${interestsResponse.status}`);
      }

      // Convert MatchUser to User format for the expandable modal
      const convertedUser = convertToUserFormat(matchUser);
      
      // Enhance with API data if available
      if (profileData) {
        Object.assign(convertedUser, {
          countryOfOrigin: profileData.countryOfOrigin || convertedUser.countryOfOrigin,
          relationshipStatus: profileData.relationshipStatus || convertedUser.relationshipStatus,
          interests: profileData.interests || convertedUser.interests,
          bio: profileData.bio || convertedUser.bio,
          profession: profileData.profession || convertedUser.profession,
          religion: profileData.religion || convertedUser.religion,
          visibilityPreferences: profileData.visibilityPreferences || convertedUser.visibilityPreferences,
          // CRITICAL FIX: Add missing education fields
          highSchool: profileData.highSchool || profileData.high_school || convertedUser.highSchool,
          collegeUniversity: profileData.collegeUniversity || profileData.college_university || convertedUser.collegeUniversity,
          // CRITICAL FIX: Add visibleInterests for SwipeCard component
          visibleInterests: profileData.visibleInterests || [],
          // Add other potentially missing fields
          hasActivatedProfile: profileData.hasActivatedProfile || convertedUser.hasActivatedProfile,
          photoUrl: profileData.photoUrl || convertedUser.photoUrl,
          showProfilePhoto: profileData.showProfilePhoto || convertedUser.showProfilePhoto,
        });
        
        // DEBUG: Log the enhanced user data
        console.log(
          `[ENHANCEMENT-DEBUG] Enhanced user data for ${matchUser.userId}:`,
          {
            highSchool: convertedUser.highSchool,
            collegeUniversity: convertedUser.collegeUniversity,
            interests: convertedUser.interests,
            visibleInterests: convertedUser.visibleInterests,
            profileData_highSchool: profileData.highSchool,
            profileData_high_school: profileData.high_school,
            profileData_collegeUniversity: profileData.collegeUniversity,
            profileData_college_university: profileData.college_university,
            profileData_visibleInterests: profileData.visibleInterests
          }
        );
      }

      setExpandableModalUser(convertedUser);
      setExpandableModalOpen(true);
    } catch (error) {
      console.error("Error opening user card:", error);
      toast({
        title: translate("error.generic"),
        description: translate("error.tryAgain"),
        variant: "destructive",
      });
    }
  };

  // Handle liking a user - creates a match and shows match popup
  const handleLikeBack = () => {
    if (selectedUser) {
      // Store the matchId to remove from the grid
      const matchIdToRemove = selectedUser.matchId;

      // If not already matched, create the match via API
      if (!selectedUser.matched) {
        likeBackMutation.mutate(selectedUser.userId, {
          onSuccess: () => {
            // Convert to proper user format for match popup
            const matchedUser = convertToUserFormat(selectedUser);
            setMatchedUser(matchedUser);

            // Close the dialog and show match popup
            setExpandedCardOpen(false);

            // Add this match ID to clickedMatchIds to remove it from the grid
            setClickedMatchIds((prev) => {
              const newIds = [...prev, matchIdToRemove];
              if (user) {
                try {
                  const storageKey = `clicked_matches_${user.id}`;
                  localStorage.setItem(storageKey, JSON.stringify(newIds));
                } catch (e) {
                  console.error("Error saving matched IDs to localStorage:", e);
                }
              }
              return newIds;
            });

            // Wait a moment before showing the match popup for better UX
            setTimeout(() => {
              setShowMatch(true);
            }, 300);
          },
        });
      } else {
        // Already matched user, just show success toast and popup
        toast({
          title: "It's a match!",
          description: "You can now message each other.",
          variant: "default",
        });

        // Convert to proper user format for match popup
        const matchedUser = convertToUserFormat(selectedUser);
        setMatchedUser(matchedUser);

        // Close the dialog and show match popup
        setExpandedCardOpen(false);

        // Add this match ID to clickedMatchIds to remove it from the grid
        setClickedMatchIds((prev) => {
          const newIds = [...prev, matchIdToRemove];
          if (user) {
            try {
              const storageKey = `clicked_matches_${user.id}`;
              localStorage.setItem(storageKey, JSON.stringify(newIds));
            } catch (e) {
              console.error("Error saving matched IDs to localStorage:", e);
            }
          }
          return newIds;
        });

        // Wait a moment before showing the match popup for better UX
        setTimeout(() => {
          setShowMatch(true);
        }, 300);
      }
    }
  };

  // Handle rejecting a user
  const handleReject = () => {
    if (selectedUser) {
      // Immediately close the expanded card for better UX
      setExpandedCardOpen(false);

      // Store the matchId before clearing the selected user
      const matchIdToRemove = selectedUser.matchId;
      const userId = selectedUser.userId;

      // Clear the selected user
      setSelectedUser(null);

      // Create a local update to the matches list to immediately remove this card
      // This provides immediate visual feedback before the API call completes
      const filteredMatches = enrichedMatches.filter(
        (match) => match.matchId !== matchIdToRemove,
      );

      // Update the local storage of clicked/removed matches
      setClickedMatchIds((prev) => {
        const newIds = [...prev, matchIdToRemove];
        if (user) {
          try {
            const storageKey = `clicked_matches_${user.id}`;
            localStorage.setItem(storageKey, JSON.stringify(newIds));
          } catch (e) {
            console.error("Error saving rejected matches to localStorage:", e);
          }
        }
        return newIds;
      });

      // Now make the actual API call to delete the match
      rejectUserMutation.mutate(matchIdToRemove, {
        onSuccess: () => {
          // Refresh the matches data once the API call completes
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

          toast({
            title: "Profile removed",
            description: "This profile has been removed from your matches.",
            variant: "default",
          });
        },
        onError: (error) => {
          // If there was an error, we need to roll back our optimistic update
          setClickedMatchIds((prev) => {
            const newIds = prev.filter((id) => id !== matchIdToRemove);
            if (user) {
              try {
                const storageKey = `clicked_matches_${user.id}`;
                localStorage.setItem(storageKey, JSON.stringify(newIds));
              } catch (e) {
                console.error(
                  "Error updating rejected matches in localStorage:",
                  e,
                );
              }
            }
            return newIds;
          });

          toast({
            title: "Error",
            description: "Could not remove this profile. Please try again.",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Handle super-liking a user
  const handleSuperLike = () => {
    if (selectedUser) {
      // Store the matchId to remove from the grid
      const matchIdToRemove = selectedUser.matchId;

      // Implementation for super like with enhanced match display
      toast({
        title: "Super Like!",
        description: `You super liked ${selectedUser.fullName}!`,
        variant: "default",
      });

      // If not already matched, create the match via API
      if (!selectedUser.matched) {
        likeBackMutation.mutate(selectedUser.userId, {
          onSuccess: () => {
            // Convert to proper user format for match popup
            const matchedUser = convertToUserFormat(selectedUser);
            setMatchedUser(matchedUser);

            // Close the dialog and show match popup
            setExpandedCardOpen(false);

            // Add this match ID to clickedMatchIds to remove it from the grid
            setClickedMatchIds((prev) => {
              const newIds = [...prev, matchIdToRemove];
              if (user) {
                try {
                  const storageKey = `clicked_matches_${user.id}`;
                  localStorage.setItem(storageKey, JSON.stringify(newIds));
                } catch (e) {
                  console.error("Error saving matched IDs to localStorage:", e);
                }
              }
              return newIds;
            });

            // Wait a moment before showing the match popup for better UX
            setTimeout(() => {
              setShowMatch(true);
            }, 300);
          },
        });
      } else {
        // Already matched user, just show success toast and popup
        // Convert to proper user format for match popup
        const matchedUser = convertToUserFormat(selectedUser);
        setMatchedUser(matchedUser);

        // Close the dialog and show match popup
        setExpandedCardOpen(false);

        // Add this match ID to clickedMatchIds to remove it from the grid
        setClickedMatchIds((prev) => {
          const newIds = [...prev, matchIdToRemove];
          if (user) {
            try {
              const storageKey = `clicked_matches_${user.id}`;
              localStorage.setItem(storageKey, JSON.stringify(newIds));
            } catch (e) {
              console.error("Error saving matched IDs to localStorage:", e);
            }
          }
          return newIds;
        });

        // Wait a moment before showing the match popup for better UX
        setTimeout(() => {
          setShowMatch(true);
        }, 300);
      }
    }
  };

  // Handle sending a message to matched user
  const handleSendMessage = () => {
    if (selectedUser && selectedUser.matched) {
      // Store the matchId that we're routing to
      const matchIdToRemove = selectedUser.matchId;

      // Close the dialog and remove the matched user from the display
      setExpandedCardOpen(false);

      // Remove this match from the UI by filtering it out
      // We'll use local state to track which matches have been clicked
      // This ensures they don't appear in the grid anymore
      setClickedMatchIds((prev) => {
        const newIds = [...prev, matchIdToRemove];

        // Save clicked matches to localStorage with user-specific key
        if (user) {
          try {
            const storageKey = `clicked_matches_${user.id}`;
            localStorage.setItem(storageKey, JSON.stringify(newIds));
          } catch (e) {
            console.error("Error saving clicked matches to localStorage:", e);
          }
        }

        return newIds;
      });

      // Redirect to the chat
      setLocation(`/chat/${matchIdToRemove}`);
    }
  };

  // Convert selected user to format needed for SwipeCard
  const convertToUserFormat = (matchUser: MatchUser): User => {
    console.log("[SYNC] Converting match user to full User format:", matchUser);

    // IMPORTANT FIX: First, check if we have a full user profile in the Match object
    // This happens when enrichedMatches contains the user profile info from the API
    // OR when we've just fetched it in handleOpenUserCard
    const useActualUserData = (matchUser as any).user;

    if (useActualUserData) {
      console.log(
        "[SYNC] USING COMPLETE PROFILE DATA FROM API:",
        useActualUserData,
      );

      // If we have actual user data from the API, use that as the base
      // but still apply any necessary formatting or defaults

      // Calculate a valid dateOfBirth from the age if available
      let dateOfBirth = useActualUserData.dateOfBirth
        ? new Date(useActualUserData.dateOfBirth)
        : null;
      if (!dateOfBirth && matchUser.age) {
        const today = new Date();
        // Set to January 1st of the year that makes the person matchUser.age years old
        dateOfBirth = new Date(today.getFullYear() - matchUser.age, 0, 1);
      }

      // Use actual visibility preferences from the database API response
      // Don't fall back to generated defaults that override user's actual preferences
      const visPrefs = useActualUserData.visibilityPreferences;

      // Log the visibility preferences for debugging
      console.log(
        `[SYNC] Visibility preferences for user ${matchUser.userId}:`,
        visPrefs,
      );
      
      // DEBUG: Log what fields are available from API
      console.log(
        `[FIELD-DEBUG] API fields for user ${matchUser.userId}:`,
        {
          highSchool: useActualUserData.highSchool,
          collegeUniversity: useActualUserData.collegeUniversity,
          hasActivatedProfile: useActualUserData.hasActivatedProfile,
          photoUrl: useActualUserData.photoUrl,
          showProfilePhoto: useActualUserData.showProfilePhoto,
          interests: useActualUserData.interests,
          // Check snake_case versions too
          high_school: useActualUserData.high_school,
          college_university: useActualUserData.college_university
        }
      );
      
      // DEBUG: Log ALL available fields from API
      console.log(`[API-ALL-FIELDS] Complete API response for user ${matchUser.userId}:`, Object.keys(useActualUserData));

      // Parsing visibilityPreferences to see if we can extract interests
      let interestsValue = useActualUserData.interests || "[]";

      // *** SYNCED DATA VALUES: Log the critical field values from the API ***
      console.log("[SYNC] CRITICAL FIELD VALUES FROM API:", {
        relationshipStatus: useActualUserData.relationshipStatus,
        countryOfOrigin: useActualUserData.countryOfOrigin,
      });

      // CRITICAL FIX: Use the actual values from the profile API
      // This ensures proper synchronization between the profile page and matches page
      return {
        ...useActualUserData,
        // Ensure all optional fields have at least empty string values to avoid undefined rendering issues
        location: useActualUserData.location || "",
        bio: useActualUserData.bio || "",
        profession: useActualUserData.profession || "",
        ethnicity: useActualUserData.ethnicity || "",
        secondaryTribe: useActualUserData.secondaryTribe || "",
        religion: useActualUserData.religion || "",
        relationshipGoal: useActualUserData.relationshipGoal || "",
        interests: interestsValue,
        visibilityPreferences: visPrefs,
        dateOfBirth: dateOfBirth,
        // Keep these standard properties consistent
        verifiedByPhone: useActualUserData.verifiedByPhone || false,
        twoFactorEnabled: useActualUserData.twoFactorEnabled || false,
        isOnline: useActualUserData.isOnline || false,
        lastActive: useActualUserData.lastActive
          ? new Date(useActualUserData.lastActive)
          : new Date(),
        createdAt: useActualUserData.createdAt
          ? new Date(useActualUserData.createdAt)
          : new Date(),
        showProfilePhoto: useActualUserData.showProfilePhoto ?? true,
        showAppModeSelection: useActualUserData.showAppModeSelection || false,
        showNationalitySelection:
          useActualUserData.showNationalitySelection || false,
        // CRITICAL: Ensure required fields for SwipeCard display
        highSchool: useActualUserData.highSchool || "",
        collegeUniversity: useActualUserData.collegeUniversity || "",
        hasActivatedProfile: useActualUserData.hasActivatedProfile ?? true,
      };
    }

    // If we don't have actual user data, continue with the original logic...
    console.warn(
      "[SYNC] WARNING: Using fallback data conversion - could lead to field synchronization issues",
    );

    // Calculate a valid dateOfBirth from the age if available
    let dateOfBirth = null;
    if (matchUser.age) {
      const today = new Date();
      // Set to January 1st of the year that makes the person matchUser.age years old
      dateOfBirth = new Date(today.getFullYear() - matchUser.age, 0, 1);
    }

    // Use visibility preferences from matchUser if available, otherwise use empty preferences
    // Don't generate defaults that override user's actual database preferences
    const visPrefs = matchUser.visibilityPreferences || null;

    // Log the visibility preferences for debugging
    console.log(
      `[SYNC] Visibility preferences for user ${matchUser.userId}:`,
      visPrefs,
    );

    // Parsing visibilityPreferences to see if we can extract interests
    let interestsValue = "[]";
    try {
      if (matchUser.visibilityPreferences) {
        const parsedVisPrefs = JSON.parse(matchUser.visibilityPreferences);
        // If there are stored interests in the preferences, use them
        if (parsedVisPrefs.interestsData) {
          interestsValue = JSON.stringify(parsedVisPrefs.interestsData);
        }
      }
    } catch (error) {
      console.warn(
        "[SYNC] Failed to parse visibility preferences for interests",
        error,
      );
    }

    // *** IMPORTANT: Don't use hardcoded values for these critical fields ***
    // Instead, check if we have the actual values from the match data
    const relationshipStatus = matchUser.relationshipStatus || ""; // Use empty string if not provided, not a hardcoded value
    const countryOfOrigin = matchUser.countryOfOrigin || ""; // Use empty string if not provided, not a hardcoded value

    console.log("[SYNC] Field values without defaults:", {
      countryOfOrigin,
      relationshipStatus,
    });

    // DEBUG: Log what fields are available in fallback path
    console.log(
      `[FALLBACK-DEBUG] matchUser fields for user ${matchUser.userId}:`,
      {
        highSchool: matchUser.highSchool,
        collegeUniversity: matchUser.collegeUniversity,
        interests: matchUser.interests,
        // Check if these exist in the matchUser object
        keys: Object.keys(matchUser)
      }
    );

    // Create a complete user object with all required fields
    return {
      id: matchUser.userId,
      username: "",
      password: "",
      fullName: matchUser.fullName,
      email: "",
      phoneNumber: null,
      gender: "",
      location: matchUser.location || "",
      bio: matchUser.bio || "", // Use empty string instead of null for consistent display
      profession: matchUser.profession || "", // Use empty string instead of null for consistent display
      ethnicity: matchUser.ethnicity || "",
      photoUrl: matchUser.photoUrl || null,
      secondaryTribe: matchUser.secondaryTribe || "",
      religion: matchUser.religion || "", // Use empty string instead of null for consistent display
      dateOfBirth: dateOfBirth, // Use the calculated date of birth
      relationshipGoal: matchUser.relationshipGoal || "", // Use empty string instead of null
      relationshipStatus: relationshipStatus, // Use the actual value, not a default
      interests: interestsValue, // Use extracted interests or default
      verifiedByPhone: false,
      twoFactorEnabled: false,
      isOnline: false,
      lastActive: new Date(), // Provide a valid date for consistency
      createdAt: new Date(), // Provide a valid date for consistency
      showProfilePhoto: matchUser.showProfilePhoto ?? true, // Required field from schema
      countryOfOrigin: countryOfOrigin, // Use the actual value, not a default
      visibilityPreferences: visPrefs,
      showAppModeSelection: false, // Default value
      showNationalitySelection: false, // Default value
      // CRITICAL: Add missing fields needed for SwipeCard display
      highSchool: matchUser.highSchool || "", // For education field display
      collegeUniversity: matchUser.collegeUniversity || "", // For education field display
      hasActivatedProfile: true, // Required for photo visibility logic
    };
  };

  // Generate default visibility preferences based on field availability
  const generateDefaultVisibilityPreferences = (user: any): string => {
    // SYNC FIX: Always set these to true so they are consistently visible
    // This ensures fields are always shown when present regardless of their value
    const defaults = {
      residence: true,
      countryOfOrigin: true, // CRITICAL: Force this to always be visible
      relationshipStatus: true, // CRITICAL: Force this to always be visible
      tribe: true,
      profession: true,
      religion: true,
      bio: true,
      relationshipGoal: true,
      interests: true,
    };

    console.log(
      "[SYNC] Generated consistent visibility preferences:",
      defaults,
    );

    return JSON.stringify(defaults);
  };

  const handleMatchFound = (matchedUser: User) => {
    setMatchedUser(matchedUser);
    setShowMatch(true);
  };

  const handleCloseMatch = () => {
    setShowMatch(false);
    setMatchedUser(null);

    // We don't reset the clickedMatchIds here, so the matched cards
    // remain filtered out from the grid after the popup is closed
  };

  // Check if there's a pending match popup that needs to be shown first
  const pendingMatchPopup = localStorage.getItem("pending_match_popup");

  // CRITICAL FIX: Check for confirmed matches and immediately show a popup
  useEffect(() => {
    if (!user || !enrichedMatches || enrichedMatches.length === 0 || showMatch)
      return;

    // Only proceed if we're not already showing a match popup
    if (pendingMatchPopup !== "true") {
      // Find the first confirmed match that hasn't been sent a message to yet
      const confirmedMatch = enrichedMatches.find(
        (match: any) =>
          match.matchType === "confirmed" &&
          !clickedMatchIds.includes(match.id),
      );

      if (confirmedMatch) {
        console.log(
          "CRITICAL FIX: Found confirmed match that needs immediate popup:",
          confirmedMatch.id,
        );

        // Set a flag to prevent showing cards - with storage cleanup first
        try {
          // First try to clear some space by removing old keys
          try {
            // Get all localStorage keys
            const keys = Object.keys(localStorage);

            // Find all match-related keys
            const matchKeys = keys.filter(
              (key) =>
                key.startsWith("displayed_match_popup_") ||
                key.startsWith("remove_like_"),
            );

            // If we have more than 30 match keys, remove the oldest 15
            if (matchKeys.length > 30) {
              // Sort alphabetically as a simple proxy for age
              const sortedKeys = matchKeys.sort();
              // Remove oldest 15 keys
              sortedKeys.slice(0, 15).forEach((key) => {
                localStorage.removeItem(key);
              });
            }
          } catch (error) {
            console.warn("Error while cleaning localStorage:", error);
            // Continue anyway, we'll try to set the item and catch any error
          }

          // Now try to set the pending match popup flag
          localStorage.setItem("pending_match_popup", "true");
        } catch (error) {
          // If storage is still full, just log and continue without storing
          console.warn("Could not store pending match popup flag:", error);
          // We'll continue without storing - the experience might not be perfect
          // but it's better than crashing
        }

        // Get the other user's profile
        // Use type assertion to access the user property that exists at runtime but not in the type
        const otherUser = (confirmedMatch as any).user;

        if (otherUser) {
          // Format user for the match popup
          const matchUserDisplay = {
            ...otherUser,
            showProfilePhoto: true,
            createdAt: otherUser.createdAt || null,
            interests: otherUser.interests || "[]",
            countryOfOrigin: otherUser.countryOfOrigin || "Ghana",
            relationshipStatus: otherUser.relationshipStatus || "Single",
          } as User;

          // Set match data for the popup
          setMatchedUser(matchUserDisplay);

          // Store match ID
          if (confirmedMatch.id) {
            try {
              // Clean up first - remove any unnecessary match data
              const keys = Object.keys(localStorage);
              // Remove old display flags for previously displayed matches
              keys
                .filter(
                  (key) =>
                    key.startsWith("displaying_match_") &&
                    key !== `displaying_match_${confirmedMatch.id}`,
                )
                .forEach((key) => {
                  localStorage.removeItem(key);
                });

              // Now set these values
              localStorage.setItem(
                `current_match_id`,
                confirmedMatch.id.toString(),
              );
              localStorage.setItem(
                `displaying_match_${confirmedMatch.id}`,
                "true",
              );
            } catch (error) {
              console.warn("Could not store match display data:", error);
              // Continue without storing - the app will still function
            }
          }

          // Show the match popup after a tiny delay for better UX
          setTimeout(() => {
            setShowMatch(true);

            // Add this match to clicked IDs so it doesn't appear in grid
            setClickedMatchIds((prev) => {
              const newIds = [...prev, confirmedMatch.id];
              if (user) {
                try {
                  const storageKey = `clicked_matches_${user.id}`;
                  localStorage.setItem(storageKey, JSON.stringify(newIds));
                } catch (e) {
                  console.error(
                    "Error saving clicked matches to localStorage:",
                    e,
                  );
                }
              }
              return newIds;
            });
          }, 100);
        }
      }
    }
  }, [enrichedMatches, clickedMatchIds, user, showMatch, pendingMatchPopup]);

  // CRITICAL OVERRIDE: Check for any confirmed matches before processing interactions
  useEffect(() => {
    // Only run if we're not currently showing a match popup and we have matches data
    if (!showMatch && enrichedMatches && enrichedMatches.length > 0 && user) {
      // Find any confirmed match that hasn't been clicked
      const confirmedMatch = enrichedMatches.find(
        (match: any) =>
          match.matchType === "confirmed" &&
          !clickedMatchIds.includes(match.id),
      );

      if (confirmedMatch) {
        console.log(
          "CRITICAL OVERRIDE: Found confirmed match in data, forcing popup:",
          confirmedMatch.id,
        );

        // Set flag to prevent showing cards - safely
        try {
          // Try to clear space first
          const keys = Object.keys(localStorage);
          const matchKeys = keys.filter(
            (key) =>
              key.startsWith("displayed_match_popup_") ||
              key.startsWith("remove_like_"),
          );

          // Remove older keys if needed
          if (matchKeys.length > 30) {
            matchKeys
              .sort()
              .slice(0, 15)
              .forEach((key) => {
                localStorage.removeItem(key);
              });
          }

          // Now try to set the flag
          localStorage.setItem("pending_match_popup", "true");
        } catch (error) {
          console.warn("Could not store pending match popup flag:", error);
          // Continue without storing
        }

        // Format the user for display
        // Use type assertion to access the user property that exists at runtime
        const otherUser = (confirmedMatch as any).user;
        if (otherUser) {
          const matchUser = {
            ...otherUser,
            showProfilePhoto: true,
            interests: otherUser.interests || "[]",
            countryOfOrigin: otherUser.countryOfOrigin || "Ghana",
            relationshipStatus: otherUser.relationshipStatus || "Single",
          } as User;

          // Show the match popup immediately
          setMatchedUser(matchUser);
          setShowMatch(true);

          // Add to clicked IDs to hide from grid
          setClickedMatchIds((prev) => {
            const newIds = [...prev, confirmedMatch.id];
            try {
              // Clean up old localStorage entries first
              const keys = Object.keys(localStorage);
              // If we have too many entries, clean up some space
              if (keys.length > 100) {
                // Find non-critical entries to remove
                const nonCriticalKeys = keys.filter(
                  (key) =>
                    key.startsWith("displayed_match_popup_") ||
                    key.startsWith("remove_like_"),
                );
                // Remove oldest 30 keys if we have a lot
                if (nonCriticalKeys.length > 60) {
                  nonCriticalKeys
                    .sort()
                    .slice(0, 30)
                    .forEach((key) => {
                      localStorage.removeItem(key);
                    });
                }
              }

              // Now try to save the clicked matches
              localStorage.setItem(
                `clicked_matches_${user.id}`,
                JSON.stringify(newIds),
              );
            } catch (e) {
              console.error("Error updating clicked matches:", e);
            }
            return newIds;
          });
        }
      }
    }
  }, [enrichedMatches, showMatch, clickedMatchIds, user]);

  // CRITICAL FIX (REVISED): Force immediate match popup for confirmed matches
  // Check for any confirmed matches that need a popup before processing interactions
  const confirmedMatchesNeedingPopup =
    enrichedMatches?.filter((match: any) => {
      // Basic checks first
      if (
        match.matchType !== "confirmed" ||
        clickedMatchIds.includes(match.id)
      ) {
        return false;
      }

      // Safely check localStorage
      try {
        return !localStorage.getItem(`displayed_match_popup_${match.id}`);
      } catch (error) {
        console.warn("Error accessing localStorage:", error);
        // If we can't access localStorage, still show the popup
        // It's better to show it again than to never show it
        return true;
      }
    }) || [];

  // If we found any confirmed matches that need immediate popup, show it
  if (confirmedMatchesNeedingPopup.length > 0 && !showMatch) {
    const matchToShow = confirmedMatchesNeedingPopup[0];
    console.log(
      "❗IMMEDIATE POPUP FIX: Found match requiring immediate popup:",
      matchToShow.id,
    );

    // Storage management: First try to clear old match popup records to make space
    try {
      // Get all keys in localStorage
      const keys = Object.keys(localStorage);

      // Find match popup keys
      const matchPopupKeys = keys.filter((key) =>
        key.startsWith("displayed_match_popup_"),
      );

      // If we have more than 50 match popup records, remove the oldest ones
      if (matchPopupKeys.length > 50) {
        // Sort the keys numerically by match ID (extract the number from the key)
        const sortedKeys = matchPopupKeys.sort((a, b) => {
          const idA = parseInt(a.replace("displayed_match_popup_", ""));
          const idB = parseInt(b.replace("displayed_match_popup_", ""));
          return idA - idB; // Sort ascending (remove oldest first)
        });

        // Remove the oldest 20 keys
        sortedKeys.slice(0, 20).forEach((key) => {
          localStorage.removeItem(key);
        });
      }

      // Now try to set the item
      localStorage.setItem(`displayed_match_popup_${matchToShow.id}`, "true");
    } catch (error) {
      // If storage is still full, use a fallback approach - memory storage
      console.warn("Could not store match popup state in localStorage:", error);
      // We'll just continue without storing - it's better to show the popup twice
      // than to crash the application
    }

    // Set the matched user immediately
    // Use type assertion to access the user property
    const matchUser = {
      ...((matchToShow as any).user || {}),
      showProfilePhoto: true,
      interests: (matchToShow as any).user?.interests || "[]",
      countryOfOrigin: (matchToShow as any).user?.countryOfOrigin || "Ghana",
      relationshipStatus:
        (matchToShow as any).user?.relationshipStatus || "Single",
    } as User;

    // Force display popup in the next tick to avoid state updates during render
    setTimeout(() => {
      setMatchedUser(matchUser);
      setShowMatch(true);
    }, 0);
  }

  // IMPROVED: Process matches from the API into the right format for display
  // Added memoization to fix flickering issue when data is reloaded
  const [cachedProcessedInteractions, setCachedProcessedInteractions] =
    useState<MatchUser[]>([]);

  // Update processed interactions whenever matches data changes
  useEffect(() => {
    if (!enrichedMatches || !Array.isArray(enrichedMatches)) return;

    console.log("⚡ ENHANCED: Processing matches data for display", {
      matchCount: enrichedMatches.length,
      clicked: clickedMatchIds.length,
      pendingMatchPopup,
    });

    // If there's a pending popup, don't show any cards
    if (pendingMatchPopup === "true" || showMatch) {
      setCachedProcessedInteractions([]);
      return;
    }

    // Otherwise, process matches normally with enhanced filtering logic
    const processed = enrichedMatches
      // Filter out matches that have been clicked on (sent message to)
      .filter((match: any) => !clickedMatchIds.includes(match.id))
      // Show both pending likes and confirmed matches - users should see all their interactions
      .filter(
        (match: any) =>
          match.matchType === "pending" || match.matchType === "confirmed",
      )
      // Also filter out any users who were just matched (based on the localStorage flag)
      .map((match: any) => ({ ...match })); // Create a shallow copy to avoid mutations

    console.log("🔍 DEBUG: Processed matches for display:", {
      total: enrichedMatches.length,
      afterFiltering: processed.length,
      matchTypes: enrichedMatches.map((m: any) => m.matchType),
      processed: processed.map((m: any) => ({
        id: m.id,
        type: m.matchType,
        user: m.user?.fullName,
      })),
    });

    setCachedProcessedInteractions(processed);
  }, [enrichedMatches, clickedMatchIds, pendingMatchPopup, showMatch]);

  // Use the cached version for display
  const processedInteractions: MatchUser[] = cachedProcessedInteractions;

  // Original filtering logic continues...
  // Filter out any users who were just matched (based on the localStorage flag)
  const finalFilteredInteractions = processedInteractions
    .filter((match: any) => {
      // If this is a like from another user
      if (match.matchType === "pending") {
        // Check if this user is part of a recent match
        const otherUserId = match.user?.id;
        if (otherUserId) {
          try {
            const shouldRemove =
              localStorage.getItem(`remove_like_${otherUserId}`) === "true";
            if (shouldRemove) {
              // Clear the flag once we've filtered out this card
              try {
                localStorage.removeItem(`remove_like_${otherUserId}`);
              } catch (error) {
                console.warn("Could not remove item from localStorage:", error);
              }
              return false;
            }
          } catch (error) {
            console.warn("Error accessing localStorage:", error);
            // If we can't check localStorage, still show the card
            return true;
          }
        }
      }
      return true;
    })
    .map((match: any) => ({
      id: match.id,
      matchId: match.id,
      userId: match.user.id,
      fullName: match.user.fullName,
      photoUrl: match.user.photoUrl,
      age: calculateAge(match.user.dateOfBirth),
      location: match.user.location,
      bio: match.user.bio,
      profession: match.user.profession,
      ethnicity: match.user.ethnicity,
      secondaryTribe: match.user.secondaryTribe,
      religion: match.user.religion,
      relationshipGoal: match.user.relationshipGoal,
      compatibility:
        match.user.compatibility || calculateCompatibility(user!, match.user),
      // For UI/UX, we'll show different indicators based on match type
      matched: match.matchType === "confirmed", // true for confirmed matches, false for pending likes
      isPendingLike: match.matchType === "pending", // Indicate this user liked the current user
      lastMessageTime: match.lastMessageTime,
      // CRITICAL: Add visibility preferences and photo settings for shouldShowMatchPhoto function
      visibilityPreferences: match.user.visibilityPreferences,
      showProfilePhoto: match.user.showProfilePhoto,
    }));

  // If the user is not authenticated, redirect to the auth page
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Helper function to calculate age from date of birth
  function calculateAge(dateOfBirth: string | Date | null): number | undefined {
    if (!dateOfBirth) return undefined;

    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  }

  const isLoading = loadingMatches;
  const hasInteractions =
    finalFilteredInteractions && finalFilteredInteractions.length > 0;

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-all duration-700 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-black' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      <AppHeader />
      <div className={`relative pb-16 flex-1 overflow-hidden flex flex-col transition-all duration-700 ${
        darkMode 
          ? 'bg-gradient-to-b from-slate-900/80 via-gray-900/60 to-black/90' 
          : 'bg-gradient-to-b from-purple-100 via-purple-50 to-purple-100'
      }`}>
        {/* Enhanced decorative background elements with dramatic dark mode */}
        <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-all duration-700 ${
          darkMode ? 'opacity-40' : 'opacity-50'
        }`}>
          <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl transition-all duration-700 ${
            darkMode 
              ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/20 shadow-2xl shadow-purple-500/20' 
              : 'bg-purple-200'
          }`}></div>
          <div className={`absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl transition-all duration-700 ${
            darkMode 
              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/30 shadow-2xl shadow-pink-500/10' 
              : 'bg-pink-200'
          }`}></div>
          <div className={`absolute bottom-10 left-10 w-60 h-60 rounded-full blur-3xl transition-all duration-700 ${
            darkMode 
              ? 'bg-gradient-to-r from-blue-500/25 to-indigo-600/20 shadow-xl shadow-blue-500/15' 
              : 'bg-blue-200'
          }`}></div>
          {darkMode && (
            <>
              <div className="absolute top-1/3 left-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/15 blur-3xl transform -translate-x-1/2 animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-r from-fuchsia-500/15 to-pink-500/10 blur-2xl animate-pulse"></div>
            </>
          )}
        </div>

        {/* Ultra-futuristic header with dramatic dark mode enhancement */}
        <motion.div
          className={`relative z-10 pt-5 pb-7 mb-5 overflow-hidden transition-all duration-700 ${
            darkMode 
              ? 'border-b border-gray-700/50 bg-gradient-to-r from-slate-800/30 via-gray-800/20 to-slate-800/30 backdrop-blur-sm' 
              : 'border-b border-purple-100'
          }`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Enhanced decorative header elements with premium dark mode */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <motion.div
              className={`absolute -right-32 top-0 w-64 h-64 rounded-full blur-3xl transition-all duration-700 ${
                darkMode 
                  ? 'bg-gradient-to-r from-purple-500/25 to-blue-500/15 shadow-2xl shadow-purple-500/30' 
                  : 'bg-purple-200/30'
              }`}
              animate={{
                scale: [1, 1.2, 1],
                x: [0, -10, 0],
                y: [0, 5, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 8,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className={`absolute left-10 -bottom-16 w-32 h-32 rounded-full blur-2xl transition-all duration-700 ${
                darkMode 
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/25 shadow-xl shadow-pink-500/20' 
                  : 'bg-pink-200/20'
              }`}
              animate={{
                scale: [1, 1.3, 1],
                x: [-10, 10, -10],
                opacity: [0.5, 0.7, 0.5],
              }}
              transition={{
                repeat: Infinity,
                duration: 10,
                ease: "easeInOut",
              }}
            />
            {darkMode && (
              <motion.div
                className="absolute right-1/4 top-1/2 w-40 h-40 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 12,
                  ease: "easeInOut",
                }}
              />
            )}
          </div>

          {/* Title with clearer text and subtle glow */}
          <div className="relative">
            {/* Removed blur effect for better readability */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-fuchsia-500/10 to-pink-500/10 rounded-full"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            <motion.h1
              className={`text-5xl font-extrabold text-center my-4 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent animate-gradient relative z-10 transition-all duration-700 ${
                darkMode ? 'drop-shadow-2xl' : ''
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                textShadow: darkMode ? [
                  "0 0 10px rgba(168, 85, 247, 0.4)",
                  "0 0 20px rgba(168, 85, 247, 0.6)",
                  "0 0 10px rgba(168, 85, 247, 0.4)",
                ] : [
                  "0 0 2px rgba(168, 85, 247, 0.3)",
                  "0 0 4px rgba(168, 85, 247, 0.4)",
                  "0 0 2px rgba(168, 85, 247, 0.3)",
                ],
              }}
              transition={{
                delay: 0.2,
                duration: 0.5,
                textShadow: {
                  repeat: Infinity,
                  duration: darkMode ? 3 : 2,
                },
              }}
              style={darkMode ? {
                filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))',
              } : {}}
            >
              {/* Removed character splitting for better readability */}
              {translate("matches.matches")}
            </motion.h1>
          </div>

          {/* Animated underline with glowing effect */}
          <div className="relative">
            <motion.div
              className="w-24 h-1 mx-auto mt-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 relative overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "6rem" }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {/* Animated glow effect across the line */}
              <motion.div
                className="absolute inset-0 bg-white/70"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  repeatDelay: 1,
                }}
                style={{ width: "30%" }}
              />
            </motion.div>
          </div>

          {/* Subtitle with fade-in animation and gradient */}
          {!isLoading && hasInteractions && (
            <motion.p
              className={`text-center text-sm mt-3 bg-gradient-to-r from-purple-500/80 via-fuchsia-500/80 to-pink-500/80 bg-clip-text text-transparent font-medium transition-all duration-700 ${
                darkMode ? 'drop-shadow-lg' : ''
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              style={darkMode ? {
                filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.2))',
              } : {}}
            >
              {translate("matches.connectWithPeople")}
            </motion.p>
          )}
        </motion.div>

        {/* No filter tabs needed - all match data is user-specific */}

        {isLoading ? (
          <motion.div
            className={`flex flex-col justify-center items-center flex-1 transition-all duration-700 ${
              darkMode ? 'bg-gradient-to-b from-transparent to-gray-900/20' : ''
            }`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="relative">
              <Loader2 className={`h-12 w-12 animate-spin transition-all duration-700 ${
                darkMode ? 'text-purple-400 drop-shadow-lg' : 'text-purple-500'
              }`} />
              <div className={`absolute inset-0 h-12 w-12 rounded-full border-t-2 animate-ping opacity-20 transition-all duration-700 ${
                darkMode ? 'border-purple-400 shadow-lg shadow-purple-500/30' : 'border-purple-300'
              }`}></div>
              {darkMode && (
                <div className="absolute inset-0 h-12 w-12 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/10 blur-xl animate-pulse"></div>
              )}
            </div>
            <p className={`mt-4 text-sm animate-pulse transition-all duration-700 ${
              darkMode ? 'text-gray-300 drop-shadow-sm' : 'text-gray-600'
            }`}>
              {translate("matches.loadingMatches")}
            </p>
          </motion.div>
        ) : !hasInteractions ? (
          <motion.div
            className={`flex flex-col items-center justify-center flex-1 text-center p-4 h-full transition-all duration-700 ${
              darkMode ? 'bg-gradient-to-b from-transparent via-gray-900/10 to-gray-800/20' : ''
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-28 h-28 mb-6">
              <div className={`absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse transition-all duration-700 ${
                darkMode 
                  ? 'bg-gradient-to-r from-purple-500/50 to-pink-500/40 shadow-2xl shadow-purple-500/30' 
                  : 'bg-gradient-to-r from-purple-400 to-pink-400'
              }`}></div>
              <div className={`relative w-full h-full rounded-full flex items-center justify-center border-4 shadow-lg transition-all duration-700 ${
                darkMode 
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-purple-500/30 shadow-2xl shadow-purple-500/20' 
                  : 'bg-white border-purple-100'
              }`}>
                <Heart className={`h-12 w-12 transition-all duration-700 ${
                  darkMode ? 'text-purple-400 drop-shadow-lg' : 'text-purple-500'
                }`} />
                {darkMode && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/5 animate-pulse"></div>
                )}
              </div>
            </div>

            <motion.h3
              className={`text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent transition-all duration-700 ${
                darkMode ? 'drop-shadow-lg' : ''
              }`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={darkMode ? {
                filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))',
              } : {}}
            >
              {translate("matches.noMatches")}
            </motion.h3>

            <p className={`max-w-md transition-all duration-700 ${
              darkMode ? 'text-gray-300 drop-shadow-sm' : 'text-gray-600'
            }`}>
              {translate("matches.whenYouMatch")}
            </p>

            <motion.div
              className={`mt-8 bg-gradient-to-r from-purple-500 to-pink-500 p-px rounded-full transition-all duration-700 ${
                darkMode ? 'shadow-2xl shadow-purple-500/30' : ''
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                boxShadow: darkMode ? [
                  "0 0 0 0 rgba(168, 85, 247, 0.6)",
                  "0 0 0 15px rgba(168, 85, 247, 0)",
                  "0 0 0 0 rgba(168, 85, 247, 0.6)",
                ] : [
                  "0 0 0 0 rgba(168, 85, 247, 0.4)",
                  "0 0 0 10px rgba(168, 85, 247, 0)",
                  "0 0 0 0 rgba(168, 85, 247, 0.4)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.button
                className={`py-2 px-6 rounded-full font-medium transition-all duration-700 ${
                  darkMode 
                    ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-purple-300 shadow-inner shadow-purple-500/20 hover:shadow-purple-500/30' 
                    : 'bg-white text-purple-700'
                }`}
                onClick={() => setLocation("/")}
              >
                {translate("matches.startSwiping")}
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className={`px-3 sm:px-4 flex-1 overflow-y-auto transition-all duration-700 ${
              darkMode ? 'bg-gradient-to-b from-transparent to-gray-900/10' : ''
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-6xl mx-auto">
              {finalFilteredInteractions.map((interaction) => (
                <MatchProfileCard
                  key={`${interaction.matched ? "match" : "like"}-${interaction.id}`}
                  match={interaction}
                  onClick={() => handleOpenUserCard(interaction)}
                  darkMode={darkMode}
                  hasBlurredCards={!user?.premiumAccess}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Match popup */}
        {showMatch && matchedUser && user && selectedUser && (
          <MatchPopup
            matchedUser={matchedUser}
            currentUser={user}
            open={showMatch}
            onClose={handleCloseMatch}
            matchId={selectedUser.matchId} // Pass the match ID for proper routing to chat
          />
        )}

        {/* Expanded Profile Card Dialog */}
        <AnimatePresence>
          {selectedUser && (
            <Dialog open={expandedCardOpen} onOpenChange={setExpandedCardOpen}>
              <DialogContent
                className="sm:max-w-[600px] p-0 border-0 overflow-hidden max-h-[90vh] h-[80vh] flex flex-col"
                aria-describedby="profile-description"
              >
                <VisuallyHidden>
                  <DialogTitle>User Profile</DialogTitle>
                  <div id="profile-description">
                    View and interact with this user's profile
                  </div>
                </VisuallyHidden>

                <div className="flex-1 h-full">
                  <SwipeCard
                    user={convertToUserFormat(selectedUser)}
                    onSwipeLeft={handleReject}
                    onSwipeRight={handleLikeBack}
                    onMatchFound={handleMatchFound}
                    mode="match" // Pass the match mode to ensure consistent field ordering
                    isPremium={user?.premiumAccess || false}
                    onPremiumUpgradeClick={() => setPremiumUpgradeOpen(true)}
                  />
                </div>
                {/* No additional action buttons - the SwipeCard itself is interactive */}
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </div>
      <BottomNavigation />
      
      {/* Expandable Swipe Card Modal */}
      <ExpandableSwipeCardModal
        user={expandableModalUser}
        isOpen={expandableModalOpen}
        onClose={() => setExpandableModalOpen(false)}
        mode="MEET"
        isPremium={user?.premiumAccess || false}
        onPremiumUpgradeClick={() => setPremiumUpgradeOpen(true)}
      />

      {/* Premium Upgrade Dialog */}
      <PremiumUpgradeDialog
        open={premiumUpgradeOpen}
        onOpenChange={setPremiumUpgradeOpen}
      />
    </div>
  );
}
