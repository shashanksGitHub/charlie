import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAppMode } from "@/hooks/use-app-mode";
import { useEffect, useCallback, useRef } from "react";

/**
 * Hook to fetch and manage unread message counts
 * Enhanced to keep MEET, HEAT, and SUITE messaging systems completely independent
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const { currentMode } = useAppMode();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<number | null>(null);
  
  // CRITICAL FIX FOR DOUBLE-COUNTING OF UNREAD MESSAGES
  // Load the unread-count-fix module on initial mount to ensure it's initialized
  useEffect(() => {
    import('@/lib/unread-count-fix').then(({ resetMessageTracking }) => {
      console.log('[UNREAD-COUNT-FIX] Initializing global unread count tracking');
      resetMessageTracking(); // Reset tracking when component mounts
    }).catch(err => {
      console.error('[UNREAD-COUNT-FIX] Failed to initialize unread count fix:', err);
    });
  }, []);
  
  // Create a mode-specific endpoint to ensure separation between app modes
  const apiEndpoint = `/api/messages/unread/count?mode=${currentMode}`;
  
  console.log(`[UNREAD-MESSAGES] Hook initialized for mode: ${currentMode}, user: ${user?.id}`);
  
  // Only fetch unread messages if user is authenticated
  const { 
    data: unreadCount, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    // Use mode-specific query key to separate cache data between modes
    queryKey: ['/api/messages/unread/count', currentMode],
    queryFn: async () => {
      if (!user) return { count: 0 };
      
      try {
        console.log(`[UNREAD-MESSAGES] Fetching unread count for ${currentMode} mode from ${apiEndpoint}`);
        // Use mode-specific API endpoint to get mode-filtered count
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          throw new Error(`Error fetching unread count: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[UNREAD-MESSAGES] Received unread count for ${currentMode}:`, data);
        return data;
      } catch (error) {
        console.error(`Error fetching unread count for ${currentMode}:`, error);
        return { count: 0 };
      }
    },
    // Don't fetch if user is not authenticated
    enabled: !!user,
    // Refetch every 30 seconds to reduce mobile battery drain
    refetchInterval: 30 * 1000,
    // Don't retry on error
    retry: false,
  });
  
  // Memoize the refetch function to avoid dependency issues
  const refetchCount = useCallback(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);
  
  // Subscribe to changes in matches data to update unread count immediately
  useEffect(() => {
    if (!user) return;
    
    // This ensures we refetch when user logs in
    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      refetchCount();
    }
    
    // Set up event listener for match changes and message views
    const handleStorageChange = (e: StorageEvent) => {
      // Only process events relevant to the current app mode
      if (e.key && (
        e.key.startsWith(`match_${currentMode}_`) || 
        e.key === `last_match_created_${currentMode}` ||
        e.key === `messages_viewed_at_${currentMode}`
      )) {
        // Immediately refetch unread count when match storage changes or messages are viewed
        refetchCount();
      }
    };
    
    // Listen for storage events (used by the match creation system)
    window.addEventListener('storage', handleStorageChange);
    
    // Custom handler for messages updates - mode-specific
    const handleMessagesUpdate = () => {
      refetchCount();
    };
    
    // Handler for immediate unread count updates from WebSockets
    const handleUnreadCountIncrement = (e: CustomEvent) => {
      // Only update if the event is for the current mode
      if (e.detail?.mode === currentMode) {
        // Optimistically increment local count for immediate UI feedback
        queryClient.setQueryData(
          ['/api/messages/unread/count', currentMode], 
          (oldData: any) => {
            const currentCount = oldData?.count || 0;
            // Increment and return new data structure
            return { count: currentCount + 1 };
          }
        );
        
        // Then refetch to ensure accuracy
        setTimeout(() => refetchCount(), 1000);
      }
    };
    
    // Add custom event listener for when messages are viewed - mode-specific
    const eventName = `messages-viewed-${currentMode}`;
    window.addEventListener(eventName, handleMessagesUpdate);
    
    // Listen for immediate unread count update events
    window.addEventListener('unread-count:increment', handleUnreadCountIncrement as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(eventName, handleMessagesUpdate);
      window.removeEventListener('unread-count:increment', handleUnreadCountIncrement as EventListener);
    };
  }, [user, refetchCount, currentMode, queryClient]);
  
  return {
    unreadCount: unreadCount?.count || 0,
    isLoading,
    error,
    refetch: refetchCount
  };
}