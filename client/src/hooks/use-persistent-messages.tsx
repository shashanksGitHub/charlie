import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

/**
 * Enhanced message persistence hook to ensure messages are preserved between sessions
 * This addresses the critical bug where messages disappear after reconnect or fresh login
 */
export function usePersistentMessages() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationAttempted = useRef(false);

  // Global message rehydration effect that runs on login
  useEffect(() => {
    // Skip if already initialized or no user yet or still loading auth
    if (isInitialized || initializationAttempted.current || isAuthLoading || !user) {
      return;
    }

    // Mark that we've attempted initialization
    initializationAttempted.current = true;
    
    console.log('[GLOBAL-MESSAGE-PERSISTENCE] Initializing global message persistence system');
    
    const initializeMessageSystem = async () => {
      try {
        // 1. First, try to restore any messages from local storage for any matches
        const matchIdsFromStorage: string[] = [];
        
        // Scan local storage for all match data
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          
          // Possible message cache formats
          if (key && (
            key.startsWith('meet_chat_messages_') || 
            key.startsWith('meet_session_messages_') ||
            key.startsWith('heat_chat_messages_') ||
            key.startsWith('heat_session_messages_')
          )) {
            try {
              const matchId = key.split('_').pop();
              if (matchId && !isNaN(Number(matchId))) {
                matchIdsFromStorage.push(matchId);
              }
            } catch (e) {
              console.error('[GLOBAL-MESSAGE-PERSISTENCE] Error parsing match ID from storage key:', key, e);
            }
          }
        }
        
        console.log(`[GLOBAL-MESSAGE-PERSISTENCE] Found ${matchIdsFromStorage.length} potential matches in storage`);
        
        // 2. Prefetch matches if we're logged in
        if (user && user.id) {
          try {
            console.log('[GLOBAL-MESSAGE-PERSISTENCE] Prefetching matches data');
            
            // Prefetch all matches to ensure we have the data available
            await queryClient.prefetchQuery({
              queryKey: ['/api/matches'],
              staleTime: 5 * 60 * 1000, // 5 minutes
            });
            
            // Get the prefetched matches
            const matches = queryClient.getQueryData(['/api/matches']) || [];
            
            if (Array.isArray(matches) && matches.length > 0) {
              console.log(`[GLOBAL-MESSAGE-PERSISTENCE] Successfully prefetched ${matches.length} matches`);
              
              // Find all match IDs
              const matchIds = matches.map((match: any) => match.id);
              
              // Combine with any match IDs we found in storage
              const combinedMatchIds = Array.from(new Set([...matchIds, ...matchIdsFromStorage]));
              
              console.log(`[GLOBAL-MESSAGE-PERSISTENCE] Prefetching messages for ${combinedMatchIds.length} matches`);
              
              // Loop through each match and prefetch its messages
              for (const matchId of combinedMatchIds) {
                try {
                  // Prefetch messages for each match
                  await queryClient.prefetchQuery({
                    queryKey: ['/api/messages', Number(matchId)],
                    staleTime: 2 * 60 * 1000, // 2 minutes
                  });
                  
                  console.log(`[GLOBAL-MESSAGE-PERSISTENCE] Prefetched messages for match ${matchId}`);
                } catch (error) {
                  console.error(`[GLOBAL-MESSAGE-PERSISTENCE] Error prefetching messages for match ${matchId}:`, error);
                }
              }
              
              console.log('[GLOBAL-MESSAGE-PERSISTENCE] Global message rehydration completed successfully');
              setIsInitialized(true);
            } else {
              console.log('[GLOBAL-MESSAGE-PERSISTENCE] No matches found to prefetch messages for');
              setIsInitialized(true);
            }
          } catch (error) {
            console.error('[GLOBAL-MESSAGE-PERSISTENCE] Error during match prefetching:', error);
            // Still mark as initialized to avoid repeated failures
            setIsInitialized(true);
          }
        } else {
          console.log('[GLOBAL-MESSAGE-PERSISTENCE] User not logged in, skipping prefetching');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[GLOBAL-MESSAGE-PERSISTENCE] Error initializing global message persistence:', error);
        // Still mark as initialized to avoid repeated failures
        setIsInitialized(true);
      }
    };
    
    // Start the initialization process
    initializeMessageSystem();
    
    // Clean up function
    return () => {
      console.log('[GLOBAL-MESSAGE-PERSISTENCE] Cleaning up global message persistence');
    };
  }, [user, isAuthLoading, queryClient, isInitialized]);
  
  // Return the initialization status for components to check
  return {
    isMessageSystemInitialized: isInitialized,
    messageInitializationAttempted: initializationAttempted.current
  };
}