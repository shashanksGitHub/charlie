import { User } from "@shared/schema";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useLocation } from "wouter";
import { MessageSquare, X, HeartHandshake, Sparkles, Stars } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Extend the Window interface to include our global WebSocket
declare global {
  interface Window {
    chatSocket?: WebSocket;
  }
}

interface MatchPopupProps {
  matchedUser: User | null;
  currentUser: User;
  open: boolean;
  onClose: () => void;
  matchId?: number; // Add optional matchId for routing to chat
}

export function MatchPopup({ matchedUser, currentUser, open, onClose, matchId }: MatchPopupProps) {
  const [, setLocation] = useLocation();

  // CRITICAL FIX: Block ALL navigation attempts and ensure popup is shown
  useEffect(() => {
    // Play a notification sound when the popup opens
    if (open) {
      try {
        // Create and play a celebratory sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play a pleasant notification sound
        oscillator.type = 'sine';
        oscillator.frequency.value = 587.33; // D5
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        
        // Play first note then stop
        setTimeout(() => {
          oscillator.frequency.value = 659.25; // E5
          setTimeout(() => {
            oscillator.frequency.value = 783.99; // G5
            setTimeout(() => {
              oscillator.stop();
            }, 200);
          }, 200);
        }, 200);
      } catch (e) {
        console.log("Audio notification failed, but match popup still shown");
      }
      
      // Log to ensure popup display is tracked
      console.log("🎉🎉🎉 MATCH POPUP OPEN AND DISPLAYED! 🎉🎉🎉");
    }
    
    // Block navigation attempts with beforeunload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (open) {
        // Cancel the event to prevent navigation
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return '';
      }
    };
    
    // For browser navigation
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Aggressively block ALL navigation attempts
    const handleClick = (e: MouseEvent) => {
      if (open) {
        const target = e.target as HTMLElement;
        
        // Allow only clicks within the popup itself
        if (!target.closest('.match-popup-content') && 
            !target.closest('[role="dialog"]') &&
            !target.classList.contains('match-action-button')) {
          console.log("🔒 Blocking navigation attempt during match popup");
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    // Apply the click handler to the entire document with capture phase
    document.addEventListener('click', handleClick, true);
    
    // Also block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open) {
        // Block Escape key to prevent dialog closing
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
        
        // Block navigation keys
        if (e.key === 'Backspace' && (!e.target || !(e.target as HTMLElement).closest('input, textarea'))) {
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);
  
  if (!matchedUser) return null;

  const queryClient = useQueryClient();
  
  const handleSendMessage = async () => {
    // Prevent any re-clicks while processing
    const sendMsgBtn = document.querySelector('.send-message-btn') as HTMLButtonElement | null;
    if (sendMsgBtn) {
      sendMsgBtn.disabled = true;
      sendMsgBtn.textContent = "Opening Chat...";
    }
    
    // CRITICAL FIX: First, notify other users via WebSocket that this popup is being closed with sendMessage flag
    if (matchId) {
      try {
        // Try to use the WebSocket service first (dynamic import to avoid circular dependencies)
        import('@/services/websocket-service').then(module => {
          // Use the service to send the notification
          const success = module.sendMatchPopupClosed(
            matchId,
            currentUser?.id,
            true // sendMessage=true indicates "Send a Message" was clicked
          );
          
          if (success) {
            console.log(`✅ Successfully sent match_popup_closed WebSocket message using service for match ${matchId}`);
          } else {
            console.log("⚠️ WebSocket service failed to send message - will retry when connection is restored");
            
            // Fallback to direct WebSocket for backward compatibility
            if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
              window.chatSocket.send(JSON.stringify({
                type: 'match_popup_closed',
                matchId: matchId,
                sendMessage: true,
                userId: currentUser?.id,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Sent match_popup_closed WebSocket message with fallback for match ${matchId}`);
            }
          }
        }).catch(error => {
          console.error("Error importing WebSocket service:", error);
          
          // Fallback to direct WebSocket if service not available
          if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
            window.chatSocket.send(JSON.stringify({
              type: 'match_popup_closed',
              matchId: matchId,
              sendMessage: true,
              userId: currentUser?.id
            }));
            console.log(`✅ Sent match_popup_closed WebSocket message with legacy method for match ${matchId}`);
          }
        });
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
      }
    }
    
    // CRITICAL FIX: Close the popup immediately to address the issue where
    // it's not closing when clicking "Send a Message"
    onClose();
    
    // Clean up all match popup related flags from both storage types
    try {
      // Clean from both localStorage and sessionStorage for maximum compatibility
      try { localStorage.removeItem('pending_match_popup'); } catch (e) {}
      try { sessionStorage.removeItem('pending_match_popup'); } catch (e) {}
      
      if (matchId) {
        // Remove from both storage types
        try { localStorage.removeItem(`displaying_match_${matchId}`); } catch (e) {}
        try { sessionStorage.removeItem(`displaying_match_${matchId}`); } catch (e) {}
        try { localStorage.removeItem(`match_display_time_${matchId}`); } catch (e) {}
        try { sessionStorage.removeItem(`match_display_time_${matchId}`); } catch (e) {}
        
        // Also set storage flags for other tabs (try both storage types)
        try { localStorage.setItem('match_popup_closed', String(matchId)); } catch (e) {}
        try { sessionStorage.setItem('match_popup_closed', String(matchId)); } catch (e) {}
        
        // Include the sendMessage flag for cross-tab synchronization
        try { localStorage.setItem('match_popup_send_message', 'true'); } catch (e) {}
        try { sessionStorage.setItem('match_popup_send_message', 'true'); } catch (e) {}
        
        // Dispatch custom event for same-tab components
        window.dispatchEvent(new CustomEvent('match:popup:closed', {
          detail: { matchId, sendMessage: true }
        }));
      }
    } catch (e) {
      console.error("Error clearing match popup flags:", e);
    }
    
    // IMPROVED FIX: Ensure match data is available before navigation with better handling
    if (matchId) {
      console.log("🚀 Preparing match data before navigation to chat");
      
      // Save backup data in both storage types for maximum reliability
      if (matchedUser && matchId) {
        const matchData = JSON.stringify({
          id: matchId,
          userId1: currentUser.id,
          userId2: matchedUser.id,
          matched: true,
          user: matchedUser,
          createdAt: new Date().toISOString()
        });
        
        // Try sessionStorage first (less likely to hit quota limits)
        try {
          sessionStorage.setItem(`match_data_${matchId}`, matchData);
          console.log("✅ Backup match data saved to sessionStorage");
        } catch (e) {
          console.warn("Could not save match data to sessionStorage:", e);
        }
        
        // Then try localStorage as fallback
        try {
          localStorage.setItem(`match_data_${matchId}`, matchData);
          console.log("✅ Backup match data saved to localStorage");
        } catch (e) {
          console.error("Error saving backup match data to localStorage:", e);
        }
      }
      
      // Get existing match data from cache
      const existingMatches = queryClient.getQueryData<any[]>(["/api/matches"]);
      
      if (!existingMatches || !existingMatches.find((m: { id: number }) => m.id === matchId)) {
        console.log("⚠️ Match data not found in cache, pre-fetching for chat navigation");
        try {
          // Prefetch in background but don't wait for it
          queryClient.prefetchQuery({
            queryKey: ["/api/matches"],
            staleTime: 0 // Force fresh data
          }).catch(err => console.error("Background match prefetch error:", err));
        } catch (error) {
          console.error("Failed to start prefetch:", error);
        }
      }
      
      // Aggressively invalidate queries to ensure the match appears in the messages list
      console.log("✅ Invalidating queries to ensure match appears in messages list");
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      
      // Force an immediate refetch to ensure the match data is available
      queryClient.fetchQuery({ queryKey: ["/api/matches"] })
        .catch(err => console.error("Error refetching matches:", err));
       
      // Broadcast a custom event to notify other components about the new match
      window.dispatchEvent(new CustomEvent('match:created', { 
        detail: { matchId, userId1: currentUser.id, userId2: matchedUser.id }
      }));
      
      // Store a flag indicating this is a brand new match that needs to be displayed
      // Use try-catch to handle storage quota errors gracefully
      
      // Try sessionStorage first (preferred method, less likely to hit quota limits)
      try {
        sessionStorage.setItem('newly_created_match', matchId.toString());
        console.log("✅ Match flag stored in sessionStorage");
      } catch (error) {
        console.warn("Could not store match flag in sessionStorage:", error);
      }
      
      // Also try localStorage as fallback to ensure maximum compatibility
      try {
        localStorage.setItem('newly_created_match', matchId.toString());
        console.log("✅ Match flag stored in localStorage");
      } catch (error) {
        console.warn("Could not store match flag in localStorage:", error);
      }
      
      // Navigate immediately - popup is already closed
      console.log("✅ Navigating to chat immediately");
      setLocation(`/chat/${matchId}`);
    } else {
      // Fallback to messages page if no match ID available
      console.log("⚠️ No match ID available, falling back to messages page");
      setLocation('/messages');
    }
  };

  const handleKeepSwiping = () => {
    // CRITICAL FIX: First, notify other users via WebSocket that this popup is being closed
    if (matchId) {
      try {
        // Try to use the WebSocket service first (dynamic import to avoid circular dependencies)
        import('@/services/websocket-service').then(module => {
          // Use the service to send the notification with sendMessage=false
          const success = module.sendMatchPopupClosed(
            matchId,
            currentUser?.id,
            false // sendMessage=false indicates "Keep Swiping" was clicked
          );
          
          if (success) {
            console.log(`✅ Successfully sent match_popup_closed WebSocket message using service for match ${matchId} (Keep Swiping)`);
          } else {
            console.log("⚠️ WebSocket service failed to send keep swiping message - will retry when connection is restored");
            
            // Fallback to direct WebSocket for backward compatibility
            if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
              window.chatSocket.send(JSON.stringify({
                type: 'match_popup_closed',
                matchId: matchId,
                sendMessage: false,
                userId: currentUser?.id,
                timestamp: new Date().toISOString()
              }));
              console.log(`✅ Sent match_popup_closed WebSocket message with fallback for match ${matchId} (Keep Swiping)`);
            }
          }
        }).catch(error => {
          console.error("Error importing WebSocket service for keep swiping:", error);
          
          // Fallback to direct WebSocket if service not available
          if (typeof WebSocket !== 'undefined' && window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
            window.chatSocket.send(JSON.stringify({
              type: 'match_popup_closed',
              matchId: matchId,
              sendMessage: false,
              userId: currentUser?.id
            }));
            console.log(`✅ Sent match_popup_closed WebSocket message with legacy method for match ${matchId} (Keep Swiping)`);
          }
        });
      } catch (error) {
        console.error("Error sending WebSocket message for keep swiping:", error);
      }
    }
  
    // Mark this match as seen in localStorage to prevent showing it again
    try {
      if (matchId) {
        const seenMatchesKey = `seen_matches_${currentUser.id}`;
        const seenMatches = JSON.parse(localStorage.getItem(seenMatchesKey) || '[]');
        if (!seenMatches.includes(matchId)) {
          seenMatches.push(matchId);
          localStorage.setItem(seenMatchesKey, JSON.stringify(seenMatches));
        }
        
        // Also set a localStorage flag for other tabs
        localStorage.setItem('match_popup_closed', String(matchId));
        // Don't include sendMessage flag for cross-tab sync when keeping swiping
        localStorage.removeItem('match_popup_send_message');
        
        // Dispatch custom event for same-tab components
        window.dispatchEvent(new CustomEvent('match:popup:closed', {
          detail: { matchId, sendMessage: false }
        }));
      }
      
      // IMPORTANT: Clear the pending_match_popup flag to allow cards to be shown again
      localStorage.removeItem('pending_match_popup');
      
      // If this popup was created from a match event, clear the flag for this specific match
      if (matchId) {
        localStorage.removeItem(`displaying_match_${matchId}`);
        localStorage.removeItem(`match_display_time_${matchId}`);
      }
    } catch (e) {
      console.error("Error updating seen matches:", e);
    }
    
    // Close the popup and allow navigation
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-gradient-to-br from-purple-900/80 via-fuchsia-900/70 to-pink-900/80 backdrop-blur-lg border-none text-white max-w-md p-0 overflow-hidden rounded-2xl shadow-2xl" 
        aria-describedby="match-description"
        hideCloseButton={true}
      >
        <VisuallyHidden>
          <DialogTitle>Match Found</DialogTitle>
          <span id="match-description">You and another user have matched</span>
        </VisuallyHidden>
        
        {/* Functional close button */}
        <DialogClose className="absolute right-4 top-4 rounded-full p-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-50">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        {/* Glass effect for popup background */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-md"></div>
        
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Background glitter */}
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(25)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-white"
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: Math.random() * 100 + "%", 
                  scale: Math.random() * 0.5 + 0.5,
                  opacity: 0 
                }}
                animate={{ 
                  y: [
                    Math.random() * 100 + "%", 
                    Math.random() * 100 + "%"
                  ], 
                  opacity: [0, 0.8, 0],
                  scale: [Math.random() * 0.5 + 0.5, Math.random() * 0.8 + 0.2]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: Math.random() * 4 + 3,
                  delay: Math.random() * 2 
                }}
              />
            ))}
          </div>
          
          {/* Floating hearts */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`heart-${i}`}
              className="absolute text-pink-300/50"
              style={{
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${Math.random() * 20 + 10}px`
              }}
              initial={{ y: 100, opacity: 0 }}
              animate={{ 
                y: [100, -20],
                opacity: [0, 0.7, 0]
              }}
              transition={{
                repeat: Infinity,
                duration: Math.random() * 5 + 6,
                delay: Math.random() * 8
              }}
            >
              ❤
            </motion.div>
          ))}
          
          {/* Animated celebration icons - stars, sparkles */}
          <motion.div 
            className="absolute -left-10 top-1/4 text-amber-300/60"
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 8,
              ease: "linear"
            }}
          >
            <Stars className="h-20 w-20" />
          </motion.div>
          
          <motion.div 
            className="absolute -right-5 bottom-1/3 text-pink-300/60"
            animate={{ 
              rotate: -360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              repeat: Infinity,
              duration: 10,
              ease: "linear"
            }}
          >
            <Sparkles className="h-16 w-16" />
          </motion.div>
        </div>
        
        {/* Match content with animations */}
        <div className="relative z-10 flex flex-col items-center p-8 match-popup-content">
          {/* Animated ring around profile image */}
          <motion.div
            className="relative mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <motion.div 
              className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />
            
            <div className="relative w-28 h-28 rounded-full p-1 bg-black/30 backdrop-blur-sm">
              <img 
                src={matchedUser.photoUrl || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
                className="w-full h-full rounded-full object-cover" 
                alt="Match profile" 
              />
            </div>
            
            {/* Animated celebration sparks */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`spark-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100 + 155)})`
                }}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 0 
                }}
                animate={{ 
                  x: Math.cos(i * Math.PI / 6) * 90,
                  y: Math.sin(i * Math.PI / 6) * 90,
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 1.5,
                  delay: i * 0.1,
                  repeatDelay: 2 
                }}
              />
            ))}
          </motion.div>
          
          {/* Match title with Chopin font */}
          <motion.h2 
            className="font-chopin text-6xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              delay: 0.3, 
              duration: 0.7,
              scale: {
                repeat: Infinity,
                duration: 2.5,
                repeatDelay: 0.5
              }
            }}
          >
            It's a Match!
          </motion.h2>
          
          <motion.p 
            className="text-center text-white/90 mb-8 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            You and <span className="font-semibold text-amber-300">{matchedUser.fullName.split(" ")[0]}</span> both liked each other
          </motion.p>
          
          {/* Celebration icon */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400/20 pointer-events-none"
            style={{ width: '300px', height: '300px', zIndex: -1 }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 2.5],
              opacity: [0, 0.2, 0],
              rotate: 45
            }}
            transition={{
              repeat: Infinity,
              duration: 4,
              repeatDelay: 1
            }}
          >
            <HeartHandshake className="w-full h-full" />
          </motion.div>
          
          <motion.div 
            className="flex flex-col space-y-4 w-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button 
                className="w-full py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg shadow-lg shadow-amber-800/30 transition-all send-message-btn"
                onClick={handleSendMessage}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Send a Message
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button 
                variant="outline" 
                className="w-full py-6 border-2 border-white/30 text-white bg-transparent hover:bg-white/10 font-semibold text-lg transition-all"
                onClick={handleKeepSwiping}
              >
                Keep Swiping
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
