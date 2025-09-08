import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface DiscoveryCard {
  id: string | number;
  type: 'networking' | 'mentorship' | 'job';
  userId?: number;
  [key: string]: any;
}

export function useRealTimeDiscovery(
  context: 'networking' | 'mentorship' | 'job',
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Cache keys for different discovery contexts
  const getCacheKey = useCallback(() => {
    switch (context) {
      case 'networking':
        return ['/api/suite/discovery/networking'];
      case 'mentorship':
        return ['/api/suite/discovery/mentorship'];
      case 'job':
        return ['/api/suite/discovery/jobs'];
      default:
        return ['/api/discover-users'];
    }
  }, [context]);

  // Smart cache invalidation with extended debouncing for performance
  const invalidateDiscoveryCache = useCallback((immediate: boolean = false) => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // Extended debounce: minimum 5 seconds between refreshes for better performance
    if (!immediate && timeSinceLastRefresh < 5000) {
      return;
    }

    lastRefreshRef.current = now;
    
    queryClient.invalidateQueries({
      queryKey: getCacheKey(),
      exact: true
    });

    console.log(`[RealTimeDiscovery] ⚡ Cache invalidated for ${context} discovery`);
  }, [queryClient, getCacheKey, context]);

  // Handle card removal from discovery stack
  const handleCardRemoval = useCallback((data: any) => {
    const cacheKey = getCacheKey();
    
    console.log(`🚨 [CARD-REMOVAL-DEBUG] Attempting to remove card:`, {
      removeProfileId: data.removeProfileId,
      removeUserId: data.removeUserId,
      context: context,
      cacheKey: cacheKey
    });
    
    queryClient.setQueryData(cacheKey, (oldData: any) => {
      if (!Array.isArray(oldData)) {
        console.log(`🚨 [CARD-REMOVAL-DEBUG] No data to filter, oldData:`, oldData);
        return oldData;
      }
      
      console.log(`🚨 [CARD-REMOVAL-DEBUG] Current cards before filtering:`, oldData.map(card => ({
        id: card.id,
        userId: card.userId,
        name: card.fullName || card.role || 'Unknown'
      })));
      
      // Remove cards based on profile ID or user ID
      const filteredData = oldData.filter((card: DiscoveryCard) => {
        const cardId = card.id?.toString();
        const cardUserId = card.userId?.toString();
        const removeId = data.removeProfileId?.toString();
        const removeUserId = data.removeUserId?.toString();
        
        console.log(`🚨 [CARD-REMOVAL-DEBUG] Checking card:`, {
          cardId,
          cardUserId,
          removeId,
          removeUserId,
          cardMatches: cardId === removeId || cardUserId === removeUserId
        });
        
        // Don't remove if neither ID matches
        if (cardId !== removeId && cardUserId !== removeUserId) {
          return true;
        }
        
        console.log(`🚨 [CARD-REMOVAL-DEBUG] REMOVING card ${cardId} from ${context} discovery`);
        return false;
      });
      
      console.log(`🚨 [CARD-REMOVAL-DEBUG] Cards after filtering:`, filteredData.map(card => ({
        id: card.id,
        userId: card.userId,
        name: card.fullName || card.role || 'Unknown'
      })));
      
      return filteredData;
    });
  }, [queryClient, getCacheKey, context]);

  // Handle new cards being added
  const handleNewCards = useCallback((data: any) => {
    if (data.newProfiles && Array.isArray(data.newProfiles)) {
      const cacheKey = getCacheKey();
      
      queryClient.setQueryData(cacheKey, (oldData: any) => {
        if (!Array.isArray(oldData)) return data.newProfiles;
        
        // Merge new profiles, avoiding duplicates
        const existingIds = new Set(oldData.map((card: DiscoveryCard) => card.id?.toString()));
        const newCards = data.newProfiles.filter((card: DiscoveryCard) => 
          !existingIds.has(card.id?.toString())
        );
        
        if (newCards.length > 0) {
          console.log(`[RealTimeDiscovery] Adding ${newCards.length} new cards to ${context} discovery`);
          return [...oldData, ...newCards];
        }
        
        return oldData;
      });
    }
  }, [queryClient, getCacheKey, context]);

  // WebSocket event handlers using global socket
  useEffect(() => {
    if (!enabled) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // DEBUG: Log all WebSocket messages for discovery debugging
        if (data.type === 'suite_remove_from_discover') {
          console.log(`🚨 [WEBSOCKET-DEBUG] Received removal message:`, {
            type: data.type,
            suiteType: data.suiteType,
            removeProfileId: data.removeProfileId,
            removeUserId: data.removeUserId,
            reason: data.reason,
            currentContext: context
          });
        }
        
        // Handle card removal events
        // CRITICAL FIX: Backend sends "jobs" (plural), frontend uses "job" (singular)
        const suiteTypeMatches = data.suiteType === context || 
                                (data.suiteType === "jobs" && context === "job");
        if (data.type === 'suite_remove_from_discover' && suiteTypeMatches) {
          console.log(`🚨 [WEBSOCKET-DEBUG] Processing removal for context ${context}, suiteType matches: ${suiteTypeMatches}`);
          handleCardRemoval(data);
        }
        
        // Handle discovery refresh events
        if (data.type === 'discovery:refresh' || data.type === `${context}:refresh`) {
          invalidateDiscoveryCache(true);
        }
        
        // Handle new profile additions
        if (data.type === 'discovery:new_profiles' && data.context === context) {
          handleNewCards(data);
        }
        
        // Handle profile updates that might affect discovery
        if (data.type === `${context}_profile_updated`) {
          invalidateDiscoveryCache();
        }
        
      } catch (error) {
        console.error('[RealTimeDiscovery] Error parsing WebSocket message:', error);
      }
    };

    // Use global WebSocket if available
    if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
      window.chatSocket.addEventListener('message', handleWebSocketMessage);
      
      return () => {
        if (window.chatSocket) {
          window.chatSocket.removeEventListener('message', handleWebSocketMessage);
        }
      };
    }
    
    // Fallback: listen for WebSocket connection establishment
    const handleWebSocketConnection = () => {
      if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
        window.chatSocket.addEventListener('message', handleWebSocketMessage);
      }
    };
    
    window.addEventListener('websocket:connected', handleWebSocketConnection);
    
    return () => {
      window.removeEventListener('websocket:connected', handleWebSocketConnection);
      if (window.chatSocket) {
        window.chatSocket.removeEventListener('message', handleWebSocketMessage);
      }
    };
  }, [enabled, context, handleCardRemoval, handleNewCards, invalidateDiscoveryCache]);

  // Custom event listeners for browser-based events
  useEffect(() => {
    if (!enabled) return;

    const handleCustomEvents = (event: CustomEvent) => {
      const { detail } = event;
      
      // Handle suite card removal events
      // CRITICAL FIX: Backend sends "jobs" (plural), frontend uses "job" (singular)
      const suiteTypeMatches = detail.suiteType === context || 
                              (detail.suiteType === "jobs" && context === "job");
      if (event.type === 'suite_remove_from_discover' && suiteTypeMatches) {
        handleCardRemoval(detail);
      }
      
      // Handle discovery refresh events
      if (event.type === 'discovery:refresh' || event.type === `${context}:refresh`) {
        invalidateDiscoveryCache(true);
      }
    };

    // Listen for custom discovery events
    window.addEventListener('suite_remove_from_discover', handleCustomEvents as EventListener);
    window.addEventListener('discovery:refresh', handleCustomEvents as EventListener);
    window.addEventListener(`${context}:refresh`, handleCustomEvents as EventListener);
    
    return () => {
      window.removeEventListener('suite_remove_from_discover', handleCustomEvents as EventListener);
      window.removeEventListener('discovery:refresh', handleCustomEvents as EventListener);
      window.removeEventListener(`${context}:refresh`, handleCustomEvents as EventListener);
    };
  }, [enabled, context, handleCardRemoval, invalidateDiscoveryCache]);

  // Periodic refresh for new profiles (every 60 seconds)
  useEffect(() => {
    if (!enabled) return;

    const startPeriodicRefresh = () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      
      refreshTimerRef.current = setInterval(() => {
        invalidateDiscoveryCache();
      }, 120000); // 2 minutes for better performance
    };

    startPeriodicRefresh();
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [enabled, invalidateDiscoveryCache]);

  // Manual refresh function for components
  const refreshDiscovery = useCallback(() => {
    invalidateDiscoveryCache(true);
  }, [invalidateDiscoveryCache]);

  // Get current cache data
  const getCachedData = useCallback(() => {
    return queryClient.getQueryData(getCacheKey());
  }, [queryClient, getCacheKey]);

  return {
    refreshDiscovery,
    getCachedData,
    cacheKey: getCacheKey()
  };
}