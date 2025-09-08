import React, { useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { RealTimeChat } from "@/components/messaging/real-time-chat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  // Extract matchId from the URL
  const { matchId } = useParams<{ matchId: string }>();
  const matchIdNumber = parseInt(matchId || '0', 10);
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { isDarkMode } = useDarkMode();
  
  // Check if this is a new match and load backup data for messages persistence
  useEffect(() => {
    const checkStorage = () => {
      try {
        // First check sessionStorage (preferred method) then fall back to localStorage
        let newMatchId = sessionStorage.getItem('newly_created_match');
        
        // If not in sessionStorage, try localStorage as fallback
        if (!newMatchId) {
          newMatchId = localStorage.getItem('newly_created_match');
        }
        
        // If we're opening this match and it's new, invalidate matches query
        if (newMatchId && parseInt(newMatchId, 10) === matchIdNumber) {
          console.log(`📲 Opening newly created match ${newMatchId}, invalidating matches`);
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          
          // Clean up from both storage types to be safe
          try { sessionStorage.removeItem('newly_created_match'); } catch (e) {}
          try { localStorage.removeItem('newly_created_match'); } catch (e) {}
        }
        
        // CRITICAL FIX FOR DISAPPEARING MESSAGES:
        // Check for backup match data from session storage first, or fallback to local storage
        // 1. This ensures messages persist when navigating between pages
        // 2. Prevents "flash" of empty state before messages load
        const sessionStorageKeys = [
          `chat_messages_${matchIdNumber}`,
          `${matchIdNumber}_session_messages`,
          `meet_messages_${matchIdNumber}`,
          `meet_unmount_${matchIdNumber}`,
        ];
        
        let foundBackupMessages = false;
        
        // Check each possible storage key
        for (const key of sessionStorageKeys) {
          try {
            // Try session storage first (for navigation within the app)
            const sessionData = sessionStorage.getItem(key);
            if (sessionData) {
              console.log(`📤 Found backup messages in sessionStorage with key: ${key}`);
              
              // Prefill the query cache to prevent flashing of "No Messages"
              try {
                const parsedData = JSON.parse(sessionData);
                const messages = Array.isArray(parsedData) ? parsedData : 
                                 (parsedData.messages && Array.isArray(parsedData.messages)) ? 
                                 parsedData.messages : null;
                
                if (messages && messages.length > 0) {
                  // Prefill the query cache with the backup messages
                  // This ensures they display immediately before any API call completes
                  queryClient.setQueryData(['/api/messages', matchIdNumber], messages);
                  foundBackupMessages = true;
                  console.log(`💾 Restored ${messages.length} messages from backup storage`);
                  break; // Exit loop once we've found valid messages
                }
              } catch (e) {
                console.error('Error parsing backup messages:', e);
              }
            }
          } catch (e) {
            console.error(`Error checking sessionStorage key ${key}:`, e);
          }
        }
        
        // If no session storage data, try local storage backup as last resort
        if (!foundBackupMessages) {
          const backupMatchData = localStorage.getItem(`match_data_${matchIdNumber}`);
          if (backupMatchData) {
            console.log("📂 Found backup match data in localStorage");
            try {
              const parsedData = JSON.parse(backupMatchData);
              if (parsedData.messages && parsedData.messages.length > 0) {
                queryClient.setQueryData(['/api/messages', matchIdNumber], parsedData.messages);
                console.log(`💾 Restored ${parsedData.messages.length} messages from localStorage backup`);
              }
            } catch (e) {
              console.error('Error parsing localStorage backup messages:', e);
            }
          }
        }
      } catch (e) {
        console.error("Error checking storage in chat page:", e);
      }
    };
    
    if (matchIdNumber > 0) {
      // Run immediately to ensure messages load without flashing
      checkStorage();
    }
  }, [matchIdNumber, queryClient]);
  
  // CRITICAL FIX: Check cached data first before API call
  const hasStoredMatchData = useMemo(() => {
    try {
      const sessionData = sessionStorage.getItem(`match_data_${matchIdNumber}`);
      const localData = localStorage.getItem(`match_data_${matchIdNumber}`);
      return !!(sessionData || localData);
    } catch {
      return false;
    }
  }, [matchIdNumber]);
  
  // CRITICAL FIX: Disable match validation to ensure instant chat rendering
  const { data: match, isLoading: isLoadingMatch, isError: isMatchError } = useQuery({
    queryKey: ["/api/match", matchIdNumber],
    enabled: false, // Never load - always use cached data for instant experience
    staleTime: 0,
    retry: false,
  });
  
  // Handle back button click
  const handleBack = () => {
    setLocation("/messages");
  };
  
  // CRITICAL FIX: Skip invalid match ID validation - render chat directly
  if (!matchId || matchIdNumber <= 0) {
    // Still render chat component even with invalid ID
    console.log(`[CHAT-PAGE] Invalid match ID ${matchIdNumber}, but rendering chat anyway`);
  }

  // CRITICAL FIX: Always render chat immediately - no loading, validation, or error states
  console.log(`[CHAT-PAGE] Rendering chat page for match ${matchIdNumber}`);
  console.log(`[CHAT-PAGE] Current URL:`, window.location.pathname);
  console.log(`[CHAT-PAGE] Match ID Number:`, matchIdNumber);

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="h-screen">
        <RealTimeChat matchId={matchIdNumber} />
      </div>
    </div>
  );
}