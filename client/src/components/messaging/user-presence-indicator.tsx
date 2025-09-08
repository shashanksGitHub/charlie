import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket, UserPresenceStatus } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

// Define the MatchWithUser type to match what /api/matches returns
interface MatchWithUser {
  id: number;
  userId1: number;
  userId2: number;
  matched: boolean;
  user: {
    id: number;
    username: string;
    fullName: string;
    photoUrl?: string;
    isOnline?: boolean;
    lastActive?: string;
    ghostMode?: boolean;
    // ... other user fields
  };
  // ... other match fields
}

interface UserPresenceIndicatorProps {
  userId: number;
  matchId?: number;
  showDetailedStatus?: boolean;
  className?: string;
}

/**
 * Component to display a user's online status, last seen time, and whether they're in the chat
 * Respects Ghost Mode - users with Ghost Mode enabled always appear offline
 * NOW USES /api/matches DATA FOR CONSISTENCY WITH CHAT TABS
 */
export function UserPresenceIndicator({
  userId,
  matchId,
  showDetailedStatus = true,
  className,
}: UserPresenceIndicatorProps) {
  const { getUserPresence, isUserInChat } = useWebSocket();

  // ✅ NEW: Use /api/matches data instead of /api/users/{userId} for consistency with chat tabs
  const { data: matches } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
    staleTime: 0, // Same as chat tabs - always get fresh data
    retry: false,
  });

  // Find the user data from matches - the API returns matches where the 'user' field
  // contains data for the other user in the match
  // We need to find a match where user.id equals the userId we're looking for
  // Handle different possible match structures (user property vs direct user fields)
  const matchWithUser = matches?.find((match) => {
    if (match.user?.id) {
      return match.user.id === userId;
    }
    // Fallback: check if the match itself contains user data
    return match.userId1 === userId || match.userId2 === userId;
  });

  // Get user data from the match
  const finalUserData = matchWithUser?.user;

  // Listen for Ghost Mode changes via WebSocket to invalidate cache
  useEffect(() => {
    const handleGhostModeChange = (event: Event) => {
      const wsEvent = event as CustomEvent;
      const { userId: changedUserId, ghostMode } = wsEvent.detail || {};

      if (changedUserId === userId) {
        console.log(
          `[UserPresenceIndicator] Ghost Mode changed for user ${userId}: ${ghostMode}`,
        );
        // ✅ NEW: Invalidate matches cache instead of user cache
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
        });
      }
    };

    // Listen for Ghost Mode change events
    window.addEventListener(
      "websocket:ghostModeChanged",
      handleGhostModeChange,
    );

    return () => {
      window.removeEventListener(
        "websocket:ghostModeChanged",
        handleGhostModeChange,
      );
    };
  }, [userId]);

  // Get the current presence data for this user
  const presence = getUserPresence(userId);

  // Check if the user is actively in this chat (if matchId is provided)
  const userInThisChat = matchId ? isUserInChat(userId, matchId) : false;

  // If no presence data is available, don't render anything
  if (!presence) return null;

  // ✅ NEW: GHOST MODE CHECK using matches data (same as chat tabs)
  const isGhostMode = finalUserData?.ghostMode === true;
  const actualStatus = isGhostMode ? "offline" : presence.status;

  // ✅ ENHANCED: Ghost Mode users should show NO presence information at all
  // If user is in Ghost Mode, don't show any presence details or dots
  if (isGhostMode) {
    return null; // No presence indicator whatsoever for Ghost Mode users
  }

  // Enhanced last seen time formatting with better error handling and time display
  const formattedLastSeen = (() => {
    try {
      // If we have a valid lastSeen timestamp, format it nicely
      if (presence.lastSeen) {
        const lastSeenDate = new Date(presence.lastSeen);

        // Check if the date is valid
        if (!isNaN(lastSeenDate.getTime())) {
          return formatDistanceToNow(lastSeenDate, { addSuffix: true });
        }
      }
      // Fallback for missing or invalid lastSeen value
      return "a while ago";
    } catch (error) {
      console.error("Error formatting lastSeen time:", error);
      return "a while ago";
    }
  })();

  return (
    <div className={cn("flex items-center text-xs", className)}>
      {/* Online status indicator with enhanced visual feedback */}
      {/* Note: Ghost Mode users return null early, so this only handles non-Ghost Mode users */}
      <div
        className={cn(
          "w-2 h-2 rounded-full mr-1.5 transition-all duration-300",
          actualStatus === "online"
            ? userInThisChat
              ? "bg-purple-500" // Purple for "In Chat"
              : "bg-green-500" // Green for "Online"
            : "bg-gray-400", // Gray for offline (includes Ghost Mode users)
        )}
      />

      {showDetailedStatus && (
        <span
          className={cn(
            "transition-colors duration-300",
            userInThisChat && actualStatus === "online"
              ? "text-purple-600 dark:text-purple-400 font-medium" // Emphasized for "in chat"
              : "text-gray-600 dark:text-gray-300", // Normal for other statuses
          )}
        >
          {
            actualStatus === "online"
              ? userInThisChat
                ? "In Chat" // User is online and in this conversation
                : "Online" // User is online but not in this conversation
              : // For offline users, conditionally show last seen based on Ghost Mode
                isGhostMode
                ? "" // Ghost Mode users: don't show any last seen information
                : `Last seen ${formattedLastSeen}` // Non-Ghost Mode users: show when last seen
          }
        </span>
      )}
    </div>
  );
}

/**
 * Enhanced component for displaying typing indicators with presence information
 * Includes improved reliability with debounced typing status to prevent flicker
 * NOW RESPECTS GHOST MODE - typing indicators won't show for Ghost Mode users
 */
export function TypingWithPresenceIndicator({
  matchId,
  userId,
  className,
}: {
  matchId: number;
  userId: number;
  className?: string;
}) {
  const { isTyping, getUserPresence, isUserInChat } = useWebSocket();
  const [debouncedTyping, setDebouncedTyping] = useState(false);

  // ✅ NEW: Get Ghost Mode status from /api/matches data (same as UserPresenceIndicator)
  const { data: matches } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
    staleTime: 0,
    retry: false,
  });

  // Find the user data from matches to check Ghost Mode
  // Handle different possible match structures (user property vs direct user fields)
  const matchWithUser = matches?.find((match) => {
    if (match.user?.id) {
      return match.user.id === userId;
    }
    // Fallback: check if the match itself contains user data
    return match.userId1 === userId || match.userId2 === userId;
  });
  
  const isGhostMode = matchWithUser?.user?.ghostMode === true;

  // Check if the user is typing in this conversation
  const typing = isTyping.get(matchId) || false;

  // Get presence info
  const presence = getUserPresence(userId);
  const isOnline = presence?.status === "online";
  const isInThisChat = isUserInChat(userId, matchId);

  // Use effect to debounce typing status to prevent flickering
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    
    // When typing starts, update immediately
    if (typing) {
      setDebouncedTyping(true);
      // Clear any existing timeout
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    } else {
      // When typing stops, add a small delay to prevent flickering
      timeout = setTimeout(() => {
        setDebouncedTyping(false);
      }, 1000); // Slightly longer delay but more reliable clearing
    }

    // Clean up timeout on component unmount or dependency change
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [typing]);

  // ✅ ENHANCED: Don't show typing indicator for Ghost Mode users
  // Early return if conditions aren't met or user is in Ghost Mode
  if (!isOnline || !debouncedTyping || isGhostMode) return null;

  // Enhanced styling with visual emphasis based on chat presence
  const typingClass = isInThisChat
    ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 shadow-sm"
    : "bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50";

  // Enhanced text styling based on chat presence
  const textClass = isInThisChat
    ? "text-purple-600 dark:text-purple-400 font-medium"
    : "text-gray-600 dark:text-gray-300";

  // Enhanced indicator styling
  const indicatorClass = isInThisChat
    ? "typing-indicator-purple" // Custom purple indicator
    : "typing-indicator"; // Default indicator

  return (
    <div
      className={cn(
        `flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-300 ${typingClass}`,
        className,
      )}
    >
      <div className={indicatorClass}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className={textClass}>
        {isInThisChat ? "typing in chat..." : "typing..."}
      </span>
    </div>
  );
}
