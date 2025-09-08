import { useEffect, useState } from "react";
import { User } from "@shared/schema";
import { MatchPopup } from "./match-popup";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

/**
 * Global match popup trigger function
 * This allows any component to trigger the "It's a Match!" popup
 * 
 * @param matchData The match object containing user data and matchId
 */
export function showMatchPopup(matchData: any): void {
  try {
    // Extract user data and match ID from the match data
    const userInfo = matchData.userInfo || matchData.matchedUser || matchData.user;
    const matchId = matchData.id || matchData.matchId;
    
    if (!userInfo) {
      console.error('showMatchPopup: No user info provided in match data', matchData);
      return;
    }
    
    console.log('[MATCH] Triggering match popup display for:', userInfo.fullName);
    
    // Store matched user data in localStorage for global access
    localStorage.setItem('matched_user_data', JSON.stringify(userInfo));
    
    // Set match ID if available
    if (matchId) {
      localStorage.setItem('current_match_id', String(matchId));
    }
    
    // Set force flag to trigger immediate display
    localStorage.setItem('force_match_popup', 'true');
    localStorage.setItem('pending_match_popup', 'true');
    
    // Also dispatch an event for faster detection
    window.dispatchEvent(new CustomEvent('match:newMatch', {
      detail: {
        fromUserInfo: userInfo,
        matchId: matchId,
        forceDisplay: true
      }
    }));
    
    console.log('[MATCH] Match popup triggered successfully');
  } catch (error) {
    console.error('showMatchPopup: Error triggering match popup:', error);
  }
}

// Extend the Window interface to include our global WebSocket
declare global {
  interface Window {
    chatSocket?: WebSocket;
  }
}

/**
 * GlobalMatchPopup - A globally available match popup component that displays
 * immediately when a match is detected, regardless of the current page.
 */
export default function GlobalMatchPopup() {
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [matchId, setMatchId] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  // Initialize and set up event listeners
  useEffect(() => {
    if (!currentUser) return; // Only activate when user is logged in
    
    console.log("🔥 GLOBAL MATCH POPUP: Initializing with super-aggressive strategy");
    
    // Function to handle storage events for cross-tab communication
    const handleStorageEvent = (event: StorageEvent | Event) => {
      if (event instanceof StorageEvent) {
        if (event.key === 'force_match_popup' && event.newValue === 'true') {
          handleMatchPopupTrigger();
        } else if (event.key === 'match_popup_closed' && event.newValue) {
          // CRITICAL FIX: Handle match popup closing event from other tabs
          const closedMatchId = parseInt(event.newValue, 10);
          if (matchId === closedMatchId && showMatch) {
            console.log(`🔥 GLOBAL MATCH POPUP: Closing popup from storage event for match ${closedMatchId}`);
            handleCloseMatch();
          }
        }
      }
    };
    
    // IMPROVED: Use the new WebSocket service's event system for cross-user popup synchronization
    const handlePopupClosedWSEvent = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const data = event.detail;
        
        // Handle match popup closing from other users
        // Only close if we're showing the same match
        if (matchId === data.matchId && showMatch) {
          console.log(`🔥 GLOBAL MATCH POPUP: Closing popup from WebSocket event for match ${data.matchId}`);
          setShowMatch(false);
          setMatchedUser(null);
          
          // Clear popup flags
          localStorage.removeItem('force_match_popup');
          localStorage.removeItem('pending_match_popup');
        }
      }
    };
    
    // Listen for the 'match:popup:closed' custom event from the WebSocket service
    window.addEventListener('match:popup:closed', handlePopupClosedWSEvent);
    console.log("🔥 GLOBAL MATCH POPUP: WebSocket event listeners attached");
    
    // Function to handle direct match events - TOP PRIORITY
    const handleMatchEvent = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { fromUserInfo, matchId, forceDisplay, isDirectMessage } = event.detail;
        
        // CRITICAL FIX: Skip match popup for direct messages
        if (isDirectMessage) {
          console.log("🔥 GLOBAL MATCH POPUP: Skipping match popup - this was a direct message action");
          return;
        }
        
        // CRITICAL FIX: Check if this match was created from the message button
        if (matchId) {
          try {
            // First check if we have explicit target user data stored
            const targetUserData = localStorage.getItem(`match_target_user_${matchId}`);
            if (targetUserData) {
              const targetUser = JSON.parse(targetUserData);
              console.log("🔍 Found explicit target user data for match popup:", targetUser.fullName);
              
              // Use the explicit target user data instead of fromUserInfo
              if (targetUser && targetUser.id && targetUser.fullName) {
                // Format user for display
                const matchUser = {
                  ...targetUser,
                  showProfilePhoto: true
                } as User;
                
                // CRITICAL FIX: Verify this is a valid match user (not the current user)
                if (currentUser && matchUser.id === currentUser.id) {
                  console.error("Match popup attempted to show current user as the match - aborting popup");
                  return;
                }
                
                // IMMEDIATE display - no conditions, no delays
                setMatchId(matchId);
                setMatchedUser(matchUser);
                
                // SHORT DELAY to avoid React errors
                setTimeout(() => {
                  setShowMatch(true);
                }, 10);
                
                // Log successful popup trigger
                console.log("🔥 GLOBAL MATCH POPUP: Popup triggered for user:", matchUser.fullName);
                return; // Exit early since we've handled this case
              }
            }
            
            // Check for enriched match data which has explicit user info
            const enrichedMatchData = localStorage.getItem(`match_data_${matchId}`);
            if (enrichedMatchData) {
              const enrichedMatch = JSON.parse(enrichedMatchData);
              console.log("🔍 Found enriched match data for popup:", enrichedMatch);
              
              if (enrichedMatch.user && enrichedMatch.user.id !== currentUser?.id) {
                // Use the user from enriched match data
                const matchUser = {
                  ...enrichedMatch.user,
                  showProfilePhoto: true
                } as User;
                
                // IMMEDIATE display - no conditions, no delays
                setMatchId(matchId);
                setMatchedUser(matchUser);
                
                // SHORT DELAY to avoid React errors
                setTimeout(() => {
                  setShowMatch(true);
                }, 10);
                
                // Log successful popup trigger
                console.log("🔥 GLOBAL MATCH POPUP: Popup triggered for user from enriched data:", matchUser.fullName);
                return; // Exit early since we've handled this case
              }
            }
          } catch (error) {
            console.error("Error checking for explicit match data:", error);
          }
        }
        
        // Handle ANY match event - especially those with force flag
        if (fromUserInfo) {
          console.log("🔥 GLOBAL MATCH POPUP: GUARANTEED DISPLAY of match popup");
          
          // Format user for display
          // Ensure this is actually the correct user for the match
          const matchUser = {
            ...fromUserInfo,
            showProfilePhoto: true
          } as User;
          
          // CRITICAL FIX: Verify this is a valid match user (not the current user)
          if (currentUser && matchUser.id === currentUser.id) {
            console.error("Match popup attempted to show current user as the match - aborting popup");
            return;
          }
          
          // IMMEDIATE display - no conditions, no delays
          if (matchId) setMatchId(matchId);
          setMatchedUser(matchUser);
          
          // SHORT DELAY to avoid React errors
          setTimeout(() => {
            setShowMatch(true);
          }, 10);
          
          // Log successful popup trigger
          console.log("🔥 GLOBAL MATCH POPUP: Popup triggered for user:", matchUser.fullName);
        }
      }
    };
    
    // CRITICAL FIX: Handle popup:closed events from same-tab components
    const handlePopupClosedEvent = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { matchId: closedMatchId } = event.detail;
        
        // If we're showing this match, close it
        if (matchId === closedMatchId && showMatch) {
          console.log(`🔥 GLOBAL MATCH POPUP: Closing popup from direct event for match ${closedMatchId}`);
          setShowMatch(false);
          setMatchedUser(null);
        }
      }
    };
    
    // Function to check localStorage for match popup triggers
    const handleMatchPopupTrigger = () => {
      console.log("🔥 GLOBAL MATCH POPUP: Force match popup triggered via localStorage");
      
      try {
        // Get match user data from localStorage
        const userDataString = localStorage.getItem('matched_user_data');
        const matchIdString = localStorage.getItem('current_match_id');
        
        // CRITICAL FIX: Check if this match has already been shown to prevent duplicate popups
        if (matchIdString) {
          const matchId = parseInt(matchIdString, 10);
          
          // Get the list of matches that have already shown popups
          const seenMatchesString = localStorage.getItem('seen_match_popups') || '[]';
          let seenMatches = [];
          try {
            seenMatches = JSON.parse(seenMatchesString);
            
            // If we've already shown a popup for this match, don't show it again
            // unless it's explicitly forced by setting 'force_match_popup' to 'true'
            const isForcePopup = localStorage.getItem('force_match_popup') === 'true';
            if (seenMatches.includes(matchId) && !isForcePopup) {
              console.log(`🔥 GLOBAL MATCH POPUP: Skipping duplicate localStorage popup for match ID ${matchId} (already seen)`);
              
              // Clear trigger flags to prevent further attempts
              localStorage.removeItem('pending_match_popup');
              return;
            }
            
            // If this is a new match, add it to the seen list
            if (!seenMatches.includes(matchId)) {
              seenMatches.push(matchId);
              localStorage.setItem('seen_match_popups', JSON.stringify(seenMatches));
              console.log(`🔥 GLOBAL MATCH POPUP: Added match ID ${matchId} to seen list from localStorage`);
            }
          } catch (e) {
            console.error("Error parsing seen matches:", e);
          }
        }
        
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          
          // Format user for display
          const matchUser = {
            ...userData,
            showProfilePhoto: true
          } as User;
          
          // CRITICAL FIX: Verify this is the correct match user (not current user showing as match)
          if (currentUser && matchUser.id === currentUser.id) {
            console.error("Match popup attempted to show current user as the match from localStorage - aborting popup");
            // Clear invalid match popup data
            localStorage.removeItem('matched_user_data');
            localStorage.removeItem('force_match_popup');
            localStorage.removeItem('pending_match_popup');
            return;
          }
          
          console.log("🔥 GLOBAL MATCH POPUP: Showing match popup from localStorage for user:", matchUser.fullName);
          
          // Show match popup immediately
          setMatchedUser(matchUser);
          if (matchIdString) setMatchId(parseInt(matchIdString, 10));
          
          // Very short timeout to prevent React errors during state changes
          setTimeout(() => {
            setShowMatch(true);
            
            // Also dispatch match event as redundancy
            window.dispatchEvent(new CustomEvent('match:newMatch', {
              detail: {
                fromUserInfo: userData,
                matchId: matchIdString ? parseInt(matchIdString, 10) : undefined,
                forceDisplay: true
              }
            }));
          }, 10);
        }
      } catch (error) {
        console.error("Error parsing matched user data:", error);
      }
    };
    
    // CRITICAL: Check for multiple possible trigger mechanisms on mount
    const forceMatchPopup = localStorage.getItem('force_match_popup') === 'true';
    const pendingMatchPopup = localStorage.getItem('pending_match_popup') === 'true';
    const userDataExists = !!localStorage.getItem('matched_user_data');
    
    // Check ANY of these conditions to show popup
    if ((forceMatchPopup || pendingMatchPopup) && userDataExists) {
      console.log("🔥 GLOBAL MATCH POPUP: Detected active match popup triggers on mount");
      handleMatchPopupTrigger();
    }
    
    // Add multiple event listeners
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('match:newMatch', handleMatchEvent as EventListener);
    window.addEventListener('match:popup:closed', handlePopupClosedEvent as EventListener);
    
    // Multiple backup mechanisms
    
    // 1. Periodic check with short interval (100ms)
    const fastCheckInterval = setInterval(() => {
      const forceMatchPopup = localStorage.getItem('force_match_popup') === 'true';
      const pendingMatchPopup = localStorage.getItem('pending_match_popup') === 'true';
      const userDataExists = !!localStorage.getItem('matched_user_data');
      
      if ((forceMatchPopup || pendingMatchPopup) && userDataExists && !showMatch) {
        console.log("🔥 GLOBAL MATCH POPUP: Detected match popup trigger in fast interval check");
        handleMatchPopupTrigger();
      }
    }, 100);
    
    // 2. Another periodic check with medium interval (500ms)
    const mediumCheckInterval = setInterval(() => {
      const forceMatchPopup = localStorage.getItem('force_match_popup') === 'true';
      const pendingMatchPopup = localStorage.getItem('pending_match_popup') === 'true';
      const userDataExists = !!localStorage.getItem('matched_user_data');
      
      if ((forceMatchPopup || pendingMatchPopup) && userDataExists && !showMatch) {
        console.log("🔥 GLOBAL MATCH POPUP: Detected match popup trigger in medium interval check");
        handleMatchPopupTrigger();
      }
    }, 500);
    
    // 3. Final fallback check (1000ms)
    const slowCheckInterval = setInterval(() => {
      const forceMatchPopup = localStorage.getItem('force_match_popup') === 'true';
      const pendingMatchPopup = localStorage.getItem('pending_match_popup') === 'true';
      const userDataExists = !!localStorage.getItem('matched_user_data');
      
      if ((forceMatchPopup || pendingMatchPopup) && userDataExists && !showMatch) {
        console.log("🔥 GLOBAL MATCH POPUP: Last resort - detected match popup trigger in slow interval check");
        handleMatchPopupTrigger();
      }
    }, 1000);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('match:newMatch', handleMatchEvent as EventListener);
      window.removeEventListener('match:popup:closed', handlePopupClosedEvent as EventListener);
      window.removeEventListener('match:popup:closed', handlePopupClosedWSEvent as EventListener);
      
      console.log("🔥 GLOBAL MATCH POPUP: WebSocket event listeners removed during cleanup");
      
      clearInterval(fastCheckInterval);
      clearInterval(mediumCheckInterval);
      clearInterval(slowCheckInterval);
    };
  }, [showMatch, currentUser]);
  
  // Handle closing the match popup
  const handleCloseMatch = () => {
    // CRITICAL FIX: Broadcast a close message via localStorage and WebSocket for cross-tab/user sync
    if (matchId) {
      // 1. Set a flag in localStorage that can be detected by other tabs
      localStorage.setItem('match_popup_closed', String(matchId));
      
      // 2. Broadcast a custom event on this tab to notify other components
      window.dispatchEvent(new CustomEvent('match:popup:closed', { 
        detail: { matchId }
      }));
      
      // 3. Also broadcast through WebSocket if available so other users also close their popups
      // This is critical for ensuring both sides of a match close their popups when either clicks
      // "Send a Message" or "Keep Swiping"
      try {
        // Try to use the WebSocket service first
        import('@/services/websocket-service').then(module => {
          // Use the service to send the notification
          const success = module.sendMatchPopupClosed(
            matchId,
            currentUser?.id,
            false // Not sending a message from global popup close
          );
          
          if (success) {
            console.log(`🔥 GLOBAL MATCH POPUP: Successfully broadcast popup close for match ${matchId} via WebSocket service`);
          } else {
            console.log("⚠️ WebSocket service failed to send close notification - will retry when connection is restored");
            
            // Fallback to direct WebSocket for backward compatibility
            if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
              window.chatSocket.send(JSON.stringify({
                type: 'match_popup_closed',
                matchId: matchId,
                userId: currentUser?.id,
                timestamp: new Date().toISOString()
              }));
              console.log(`🔥 GLOBAL MATCH POPUP: Broadcast popup close for match ${matchId} via fallback WebSocket`);
            }
          }
        }).catch(error => {
          console.error("Error importing WebSocket service:", error);
          
          // Fallback to direct WebSocket if service not available
          if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
            window.chatSocket.send(JSON.stringify({
              type: 'match_popup_closed',
              matchId: matchId,
              userId: currentUser?.id
            }));
            console.log(`🔥 GLOBAL MATCH POPUP: Broadcast popup close using legacy WebSocket for match ${matchId}`);
          } else {
            console.log("WebSocket not available or not connected for match popup close notification");
          }
        });
      } catch (err) {
        console.error("Error broadcasting popup close via WebSocket:", err);
      }
    }
    
    setShowMatch(false);
    setMatchedUser(null);
    
    // Clear any pending match flags
    localStorage.removeItem('force_match_popup');
    localStorage.removeItem('pending_match_popup');
    
    // Mark this match as seen to prevent reshowing the popup
    if (matchId) {
      // Get current seen matches
      const seenMatchesString = localStorage.getItem('seen_match_popups') || '[]';
      let seenMatches = [];
      try {
        seenMatches = JSON.parse(seenMatchesString);
        
        // Add this match ID if not already present
        if (!seenMatches.includes(matchId)) {
          seenMatches.push(matchId);
          localStorage.setItem('seen_match_popups', JSON.stringify(seenMatches));
          console.log(`🔥 GLOBAL MATCH POPUP: Added match ID ${matchId} to seen list on popup close`);
        }
      } catch (e) {
        console.error("Error handling seen matches on popup close:", e);
      }
    }
    
    // Refresh match data
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
  };
  
  // Don't render anything if no match to show or no current user
  if (!showMatch || !matchedUser || !currentUser) {
    return null;
  }
  
  // Render the match popup
  return (
    <MatchPopup 
      matchedUser={matchedUser}
      currentUser={currentUser}
      open={showMatch}
      onClose={handleCloseMatch}
      matchId={matchId}
    />
  );
}