import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMatchCount } from "@/hooks/use-match-count";
import { useAppMode } from "@/hooks/use-app-mode";
import { apiRequest } from "@/lib/queryClient";

/**
 * MatchCountLoader - Real-time match notification system with preloading
 * 
 * This component combines multiple strategies to ensure reliable and immediate match count updates:
 * 1. WebSocket notifications for instant updates when new likes/matches arrive
 * 2. Regular polling as a fallback/redundancy mechanism
 * 3. CustomEvent listeners for cross-component communication
 * 4. LocalStorage listeners for cross-tab communication
 * 5. PRELOADING: Automatically preloads actual match data so cards are ready before navigation
 */
export function MatchCountLoader() {
  const { user } = useAuth();
  const { setMatchCount, setLikeCount } = useMatchCount();
  const { currentMode } = useAppMode();
  const queryClient = useQueryClient();
  
  // Keep a reference to the last update time to prevent redundant updates
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Get stored clicked match IDs (matches the user has viewed)
  const getClickedMatchIds = useCallback(() => {
    if (!user) return [];
    try {
      const storageKey = `clicked_matches_${user.id}`;
      const storedIdsString = localStorage.getItem(storageKey);
      return storedIdsString ? JSON.parse(storedIdsString) : [];
    } catch (error) {
      console.error("Error retrieving clicked match IDs:", error);
      return [];
    }
  }, [user]);
  
  // Optimized match counts endpoint with aggressive caching
  const { data: matchCounts, refetch: refetchMatchCounts } = useQuery<{
    confirmed: number;
    pending: number;
    total: number;
    timestamp: number;
  }>({
    queryKey: ["/api/matches/counts", { clicked: JSON.stringify(getClickedMatchIds()) }],
    queryFn: async ({ queryKey }) => {
      console.log('[MATCH-COUNT] 🚀 Loading match counts...');
      const startTime = Date.now();
      const [, params] = queryKey as [string, { clicked: string }];
      const url = `/api/matches/counts?clicked=${encodeURIComponent(params.clicked)}`;
      const response = await apiRequest(url);
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[MATCH-COUNT] ⚡ Counts loaded in ${duration}ms`);
      return data;
    },
    enabled: !!user,
    // Smart polling: rely primarily on WebSocket events, minimal background polling
    refetchInterval: 2 * 60 * 1000, // 2 minutes - very conservative background polling
    retry: 2,
    retryDelay: 500,
    staleTime: 15 * 1000, // 15 seconds stale time - reasonable balance
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnWindowFocus: true, // Refetch when window gains focus for instant updates
    refetchOnReconnect: true, // Refetch when connection is restored
  });
  
  // PRELOADING: Query to preload actual match data so cards are ready before navigation
  const { data: preloadedMatches } = useQuery({
    queryKey: ["/api/matches"],
    enabled: !!user && currentMode === 'MEET',
    // Aggressive preloading settings for instant card display
    staleTime: 10 * 1000, // 10 seconds stale time
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Instant refresh when tab becomes active
    refetchInterval: 90 * 1000, // 90 seconds background polling - frequent enough for instant cards
    refetchIntervalInBackground: false, // No background polling to save battery
  });

  // Update match counts when polling data is received
  useEffect(() => {
    if (matchCounts) {
      // Update the timestamp reference
      lastUpdateTimeRef.current = Date.now();
      
      // Update the counts
      setMatchCount(matchCounts.confirmed);
      setLikeCount(matchCounts.pending);
      
      // Log the counts for debugging - now using efficient background polling
      console.log(`MatchCountLoader: Updated counts via efficient polling (2min background) - Confirmed: ${matchCounts.confirmed}, Pending: ${matchCounts.pending}`);
      
      // PRELOADING FIX: If we have counts but no preloaded matches, trigger immediate preload
      if ((matchCounts.confirmed > 0 || matchCounts.pending > 0) && (!preloadedMatches || (Array.isArray(preloadedMatches) && preloadedMatches.length === 0))) {
        console.log(`🚀 PRELOADING: Match counts detected (${matchCounts.confirmed + matchCounts.pending}), preloading match data for instant display`);
        queryClient.prefetchQuery({
          queryKey: ["/api/matches"],
          staleTime: 0, // Force fresh data
        });
      }
    }
  }, [matchCounts, setMatchCount, setLikeCount, preloadedMatches, queryClient]);
  
  // Force immediate refresh when component mounts or app mode changes to MEET
  useEffect(() => {
    if (user) {
      // Trigger immediate refetch on mount for responsive initial load
      refetchMatchCounts();
      
      // AGGRESSIVE PRELOADING: Also immediately preload match data when user logs in
      queryClient.prefetchQuery({
        queryKey: ["/api/matches"],
        staleTime: 0, // Force fresh data
      }).then(() => {
        console.log('🚀 PRELOADING: Match data preloaded on user login for instant card display');
      }).catch((error) => {
        console.warn('⚠️ PRELOADING: Failed to preload match data:', error);
      });
    }
  }, [user, refetchMatchCounts, queryClient]);
  
  // Smart refresh triggers for instant updates without battery drain
  useEffect(() => {
    if (currentMode === 'MEET' && user) {
      // Invalidate cache and refetch immediately when switching to MEET mode
      queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] });
      refetchMatchCounts();
    }
  }, [currentMode, user, queryClient, refetchMatchCounts]);
  
  // Mobile-optimized visibility and focus listeners for instant updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && currentMode === 'MEET') {
        // Only refresh when MEET app becomes visible - instant mobile experience
        const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
        if (timeSinceLastUpdate > 10000) { // Only if >10s since last update
          refetchMatchCounts();
        }
      }
    };
    
    const handleFocusEvent = () => {
      if (user && currentMode === 'MEET') {
        // Instant refresh when user focuses on MEET app
        refetchMatchCounts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusEvent);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusEvent);
    };
  }, [user, currentMode, refetchMatchCounts]);
  
  // Listen for WebSocket-triggered count updates through custom events
  useEffect(() => {
    if (!user) return;
    
    // Handler for direct WebSocket count updates
    const handleCountsUpdated = (event: CustomEvent) => {
      const now = Date.now();
      const { confirmed, pending, total } = event.detail;
      
      // Avoid redundant updates within a short time window
      if (now - lastUpdateTimeRef.current < 500) return;
      
      // Update the timestamp reference
      lastUpdateTimeRef.current = now;
      
      // Update state with the new counts
      setMatchCount(confirmed);
      setLikeCount(pending);
      
      console.log(`MatchCountLoader: Updated counts via WebSocket event - Confirmed: ${confirmed}, Pending: ${pending}`);
    };
    
    // Handler for new like events
    const handleNewLike = () => {
      // Force-refresh match counts on new like
      refetchMatchCounts();
    };
    
    // Listen for custom events from WebSocket notifications
    window.addEventListener('match:countsUpdated', handleCountsUpdated as EventListener);
    window.addEventListener('match:newLike', handleNewLike);
    
    // Listen for localStorage changes (for cross-tab communication)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'newLike') {
        refetchMatchCounts();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('match:countsUpdated', handleCountsUpdated as EventListener);
      window.removeEventListener('match:newLike', handleNewLike);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, setMatchCount, setLikeCount, refetchMatchCounts, queryClient]);

  // This component doesn't render anything
  return null;
}