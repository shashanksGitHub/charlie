import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Search,
  Bell,
  Info,
  Users,
  MessageCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  Clock,
  CheckCheck,
  Check,
  ChevronDown,
  X,
  Filter,
  MoreVertical,
} from "lucide-react";
import { compareMatchesByActivity } from "@/lib/message-sorting";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserPicture } from "@/components/ui/user-picture";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealTimeChat } from "./real-time-chat";
import { UserProfilePreviewPopup } from "@/components/ui/user-profile-preview-popup";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import KwameChatTab from "@/components/kwame/kwame-chat-tab";

// Utility function to format media messages for display in conversation lists
function formatMessagePreview(message: string): string {
  if (message.startsWith("_!_IMAGE_!_")) {
    return "📷 Photo";
  }
  if (message.startsWith("_!_VIDEO_!_")) {
    return "🎥 Video";
  }
  if (message.startsWith("Audio message")) {
    return "🎵 Audio message";
  }
  return message;
}
import { formatTimeAgo } from "@/lib/utils";

// Types
interface MatchWithUser {
  id: number;
  userId1: number;
  userId2: number;
  createdAt: string;
  matched: boolean;
  matchType?: "confirmed" | "pending";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  messageStatus?: "sending" | "sent" | "delivered" | "read" | "error";
  lastMessageSentByMe?: boolean; // Indicates if the last message was sent by the current user
  user: {
    id: number;
    fullName: string;
    photoUrl?: string;
    isOnline?: boolean;
    lastActive?: string;
    city?: string;
    country?: string;
    age?: number;
  };
}

export function MeetMessagesNew() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { translate } = useLanguage();
  const { toast } = useToast();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useDarkMode();
  const [infoMode, setInfoMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(true); // Always show all matches by default
  const [enrichedMatches, setEnrichedMatches] = useState<MatchWithUser[]>([]);
  // Track read receipt settings for each match
  const [readReceiptsStatus, setReadReceiptsStatus] = useState<
    Record<number, boolean>
  >({});
  // State for KWAME AI last message
  const [kwameLastMessage, setKwameLastMessage] = useState<{
    content: string;
    timestamp: string;
  } | null>(null);

  // Animated gradients for MEET theme
  const gradientVariants = {
    initial: {
      backgroundPosition: "0% 50%",
    },
    animate: {
      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      transition: {
        duration: 15,
        ease: "linear",
        repeat: Infinity,
      },
    },
  };

  // Fetch matches with aggressive refetching to ensure new matches appear
  const {
    data: matches,
    isLoading,
    isError,
    refetch,
  } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 5000, // Consider data stale quickly to refresh more often
  });

  // Fetch KWAME AI last message
  useEffect(() => {
    const fetchKwameLastMessage = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/kwame/conversation-history?limit=1`);
        // Avoid cached 304 responses so we always get the latest last message
        // Note: Using a second fetch with no-store to bypass HTTP cache if needed
        if (response.status === 304 || !response.ok) {
          const fresh = await fetch(`/api/kwame/conversation-history?limit=1`, {
            cache: "no-store",
          });
          if (fresh.ok) {
            const data = await fresh.json();
            const messages = data.messages || [];
            if (messages && messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              setKwameLastMessage({
                content: lastMessage.content || "",
                timestamp: lastMessage.timestamp || new Date().toISOString(),
              });
            } else {
              setKwameLastMessage({
                content: "",
                timestamp: new Date().toISOString(),
              });
            }
          }
          return;
        }
        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1]; // Get the most recent message
            setKwameLastMessage({
              content: lastMessage.content || "",
              timestamp: lastMessage.timestamp || new Date().toISOString(),
            });
          } else {
            // No conversation history: show nothing (avoid placeholder flicker)
            setKwameLastMessage({
              content: "",
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching KWAME last message:", error);
        // On error, do not show a misleading placeholder
        setKwameLastMessage({
          content: "",
          timestamp: new Date().toISOString(),
        });
      }
    };

    fetchKwameLastMessage();
  }, [user?.id]);

  // Load read receipts settings for all matches
  useEffect(() => {
    if (!matches || matches.length === 0) return;

    const loadReadReceiptsSettings = () => {
      const newSettings: Record<number, boolean> = {};

      matches.forEach((match) => {
        try {
          // Use the same storage key as in real-time-chat.tsx
          const currentMode = localStorage.getItem("app_mode") || "MEET";
          const storageKey = `${currentMode}_chat_read_receipts_${match.id}`;
          const setting = localStorage.getItem(storageKey);

          // Setting is enabled by default unless explicitly set to 'false'
          newSettings[match.id] = setting !== "false";
        } catch (error) {
          console.error(
            `Error loading read receipts setting for match ${match.id}:`,
            error,
          );
          // Default to enabled if there's an error
          newSettings[match.id] = true;
        }
      });

      setReadReceiptsStatus(newSettings);
    };

    loadReadReceiptsSettings();

    // Also set up a storage event listener to update settings when they change
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.includes("chat_read_receipts_")) {
        loadReadReceiptsSettings();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [matches]);

  // Enrich matches with user profiles (same approach as matches-page.tsx)
  useEffect(() => {
    if (!user || !matches || matches.length === 0) {
      setEnrichedMatches([]);
      return;
    }

    let cancelled = false;
    const fetchProfiles = async () => {
      console.log("🔍 Enriching matches with user profiles:", matches.length);

      // CRITICAL FIX: Log all matches before enrichment to help diagnose issues
      console.log(
        "🔍 Raw matches data before enrichment:",
        matches.map((m) => ({
          id: m.id,
          userId1: m.userId1,
          userId2: m.userId2,
          matched: m.matched,
          matchType: m.matchType,
          hasLastMessage: !!m.lastMessage,
          hasLastMessageTime: !!m.lastMessageTime,
        })),
      );

      const enriched = await Promise.all(
        matches.map(async (match) => {
          // Determine which user ID is the other user (not the current user)
          const otherUserId =
            match.userId1 === user.id ? match.userId2 : match.userId1;

          // CRITICAL FIX: Add debug logging for each match
          console.log(
            `🔍 Enriching match ${match.id}: current user=${user.id}, other user=${otherUserId}`,
          );

          // If the match already has a user object with fullName, use it
          if (
            match.user &&
            match.user.fullName &&
            match.user.id === otherUserId
          ) {
            console.log(
              `✅ Match ${match.id} already has user data for ${match.user.fullName}`,
            );
            return match;
          }

          try {
            // Fetch the user profile
            const res = await fetch(`/api/profile/${otherUserId}`);
            if (!res.ok) {
              throw new Error(
                `Failed to fetch profile for user ${otherUserId}: ${res.status}`,
              );
            }
            const userProfile = await res.json();

            console.log(
              `✅ Successfully fetched profile for user ${otherUserId}: ${userProfile.fullName}`,
            );

            // Return match with enriched user data
            return {
              ...match,
              user: {
                ...userProfile,
                id: otherUserId,
                fullName: userProfile.fullName || "",
              },
            };
          } catch (e) {
            console.error(`Error fetching profile for user ${otherUserId}:`, e);
            return {
              ...match,
              user: {
                id: otherUserId,
                fullName: "",
                photoUrl: undefined,
              },
            };
          }
        }),
      );

      if (!cancelled) {
        console.log("✅ Enriched matches data:", enriched.length);

        // CRITICAL FIX: Log enriched matches to help diagnose issues
        console.log(
          "✅ Enriched matches details:",
          enriched.map((m) => ({
            id: m.id,
            matched: m.matched,
            matchType: m.matchType,
            user: m.user
              ? {
                  id: m.user.id,
                  fullName: m.user.fullName,
                }
              : "Missing User",
            hasLastMessage: !!m.lastMessage,
            hasLastMessageTime: !!m.lastMessageTime,
          })),
        );

        setEnrichedMatches(enriched);
      }
    };

    fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, [matches, user]);

  // Enhance matches with message status information
  useEffect(() => {
    if (!enrichedMatches || enrichedMatches.length === 0 || !user?.id) return;

    // Define a function to process message statuses
    const processMatchesWithMessageStatus = async () => {
      // Create a deep copy of enriched matches to avoid mutations
      const matchesWithStatus = [...enrichedMatches];
      let hasUpdates = false;

      // Process each match to determine message status
      for (const match of matchesWithStatus) {
        try {
          // Try to fetch the last message for this match from the cache first
          const queryKey = ["/api/messages", match.id];
          let messagesData = queryClient.getQueryData<any>(queryKey);
          let messages = [];

          // Extract messages from the response structure which may vary
          if (messagesData) {
            if (Array.isArray(messagesData)) {
              messages = messagesData;
            } else if (
              messagesData.messages &&
              Array.isArray(messagesData.messages)
            ) {
              messages = messagesData.messages;
            } else if (
              messagesData.matchId === match.id &&
              messagesData.messages
            ) {
              messages = messagesData.messages;
            }
          }

          if (messages && messages.length > 0) {
            // Sort messages by created time to get the most recent one
            const sortedMessages = [...messages].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );

            const lastMessage = sortedMessages[0];

            // Determine message status based on the last message properties
            if (lastMessage) {
              // Check if the current user is the sender of the last message
              const isCurrentUserSender = lastMessage.senderId === user.id;

              // Set the lastMessageSentByMe flag for proper status indicator display
              const previousSentByMe = match.lastMessageSentByMe;
              match.lastMessageSentByMe = isCurrentUserSender;

              if (previousSentByMe !== isCurrentUserSender) {
                hasUpdates = true;
              }

              // Update the lastMessage content if needed
              if (!match.lastMessage && lastMessage.content) {
                match.lastMessage = lastMessage.content;
                match.lastMessageTime = lastMessage.createdAt;
                hasUpdates = true;
              }

              if (isCurrentUserSender) {
                // If the user sent the message, update the message status
                const newStatus:
                  | "sending"
                  | "sent"
                  | "delivered"
                  | "read"
                  | "error" = lastMessage.sending
                  ? "sending"
                  : lastMessage.error
                    ? "error"
                    : lastMessage.read
                      ? "read"
                      : "delivered"; // Default status

                // Always update the status to ensure consistency
                match.messageStatus = newStatus;
                hasUpdates = true;
              }
            }
          }
        } catch (error) {
          console.error(
            `Error processing message status for match ${match.id}:`,
            error,
          );
        }
      }

      // Update the state only if there were changes
      if (hasUpdates) {
        console.log(
          "📱 Updated match message statuses:",
          matchesWithStatus.map((m) => ({
            id: m.id,
            lastMessageSentByMe: m.lastMessageSentByMe,
            messageStatus: m.messageStatus,
          })),
        );
        setEnrichedMatches(matchesWithStatus);
      }
    };

    // Process message statuses
    processMatchesWithMessageStatus();

    // Set up an interval to refresh message statuses periodically
    const statusRefreshInterval = setInterval(() => {
      processMatchesWithMessageStatus();
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [enrichedMatches, user?.id, queryClient]);

  // Listen for global message status updates and new messages from RealTimeChat component
  useEffect(() => {
    const userId = user?.id;

    // Handle message status updates (global event)
    const handleMessageStatusUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;

      const { matchId, status, messageIds } = event.detail;

      console.log(
        `📱 message:status:updated event received for match ${matchId}, status: ${status}, messageIds:`,
        messageIds,
      );

      // Always update the enriched matches with the new status information
      setEnrichedMatches((prevMatches) => {
        const updatedMatches = [...prevMatches];
        const matchIndex = updatedMatches.findIndex((m) => m.id === matchId);

        if (matchIndex !== -1) {
          const match = updatedMatches[matchIndex];

          // For any message that's marked as read and was sent by the current user,
          // always update the status to reflect it's been read
          if (status === "read" && match.lastMessageSentByMe) {
            // Update to read status immediately
            const newStatus: "read" = "read";
            match.messageStatus = newStatus;
            console.log(
              `📱 Updated message status for match ${matchId} to read (global handler fixed)`,
            );
          }
        }

        return updatedMatches;
      });
    };

    // Handle new message events - Updated to match WebSocket service structure
    const handleNewMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;

      if (!message || !message.matchId || !user) return;

      console.log(
        `📱 New message received for match ${message.matchId}:`,
        message,
      );

      // Handle KWAME AI messages (matchId -1)
      if (message.matchId === -1) {
        setKwameLastMessage({
          content: message.content,
          timestamp: message.createdAt || new Date().toISOString(),
        });
        return;
      }

      // Update the match in our list with the new message
      setEnrichedMatches((prevMatches) => {
        const updatedMatches = [...prevMatches];
        const matchIndex = updatedMatches.findIndex(
          (m) => m.id === message.matchId,
        );

        if (matchIndex !== -1) {
          const match = updatedMatches[matchIndex];
          const isCurrentUserSender = message.senderId === user.id;

          // Update all relevant match properties
          match.lastMessage = message.content;
          match.lastMessageTime = message.createdAt || new Date().toISOString();
          match.lastMessageSentByMe = isCurrentUserSender;
          match.unreadCount = isCurrentUserSender
            ? match.unreadCount || 0
            : (match.unreadCount || 0) + 1;
          match.messageStatus = isCurrentUserSender
            ? "delivered"
            : match.messageStatus;

          console.log(
            `📱 Updated match ${match.id} with new message: ${match.lastMessage}`,
          );
        }

        return updatedMatches;
      });

      // Force immediate UI refresh
      queryClient.invalidateQueries({
        queryKey: ["/api/matches"],
        refetchType: "none", // Don't refetch, just use the updated state
      });
    };

    // Handle lastMessage updates from auto-delete events
    const handleLastMessageUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;

      const { matchId, newLastMessage } = event.detail;

      if (!matchId) return;

      console.log(
        `📱 LastMessage update received for match ${matchId}:`,
        newLastMessage,
      );

      // Update the match in our list with the new lastMessage
      setEnrichedMatches((prevMatches) => {
        const updatedMatches = [...prevMatches];
        const matchIndex = updatedMatches.findIndex((m) => m.id === matchId);

        if (matchIndex !== -1) {
          const match = updatedMatches[matchIndex];

          // Update the last message content and time
          match.lastMessage = newLastMessage ? newLastMessage.content : null;
          match.lastMessageTime = newLastMessage
            ? newLastMessage.createdAt
            : null;

          console.log(
            `📱 Updated match ${match.id} lastMessage to: ${match.lastMessage}`,
          );
        }

        return updatedMatches;
      });
    };

    // Add the main event listeners for global status updates and new messages
    window.addEventListener(
      "message:status:updated",
      handleMessageStatusUpdate,
    );
    window.addEventListener("message:new", handleNewMessage);
    window.addEventListener(
      "match:lastMessage:updated",
      handleLastMessageUpdate,
    );

    // Handle global message read events
    const handleGlobalMessageRead = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;

      const { matchId, messageIds, timestamp } = event.detail;

      console.log(
        `📱 Global message read event received for match ${matchId}, messageIds:`,
        messageIds,
      );

      // Force a refresh of matches to ensure UI is updated
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

      // Update enriched matches directly to force UI update
      setEnrichedMatches((prevMatches) => {
        if (!prevMatches) return prevMatches;

        const updatedMatches = [...prevMatches];
        const matchToUpdate = updatedMatches.find((m) => m.id === matchId);

        if (matchToUpdate && matchToUpdate.lastMessageSentByMe) {
          matchToUpdate.messageStatus = "read";
          console.log(
            `📱 Global update: Set match ${matchId} message status to read`,
          );
        }

        return updatedMatches;
      });
    };

    // Add listener for global message read events
    window.addEventListener("message:read:global", handleGlobalMessageRead);

    // Handle matches refresh events for instant updates
    const handleMatchesRefresh = (event: Event) => {
      console.log(
        "📱 [MEET] Matches refresh event received, forcing query invalidation",
      );
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    };

    window.addEventListener("matches:refresh", handleMatchesRefresh);

    // Handle unread count increment events for instant badge updates
    const handleUnreadCountIncrement = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const { mode } = event.detail;

      // Only handle if this is for MEET mode
      if (mode === "MEET") {
        console.log("📱 [MEET] Unread count increment event received");
        queryClient.invalidateQueries({
          queryKey: ["/api/messages/unread/count", "MEET"],
        });
      }
    };

    window.addEventListener(
      "unread-count:increment",
      handleUnreadCountIncrement,
    );

    // Cleanup function to remove all event listeners when component unmounts
    return () => {
      // Remove global event listeners
      window.removeEventListener(
        "message:status:updated",
        handleMessageStatusUpdate,
      );
      window.removeEventListener("message:new", handleNewMessage);
      window.removeEventListener(
        "match:lastMessage:updated",
        handleLastMessageUpdate,
      );
      window.removeEventListener(
        "message:read:global",
        handleGlobalMessageRead,
      );
      window.removeEventListener("matches:refresh", handleMatchesRefresh);
      window.removeEventListener(
        "unread-count:increment",
        handleUnreadCountIncrement,
      );
    };
  }, [user, queryClient]);

  // Setup match-specific listeners for direct read receipt updates
  useEffect(() => {
    if (!user?.id) return;

    console.log(
      "Setting up match-specific read receipt handlers for",
      enrichedMatches.length,
      "matches",
    );

    // Setup direct match-specific event listeners for real-time status updates
    const matchReadHandlers: { [key: string]: (e: Event) => void } = {};

    // Create handlers for each match
    enrichedMatches.forEach((match) => {
      // Skip if no match ID
      if (!match.id) return;

      // Create the specific event name for this match
      const eventName = `message:read:${match.id}`;

      // Handler for direct read receipts for this specific match
      const handler = (event: Event) => {
        if (!(event instanceof CustomEvent)) return;
        const { messageIds, userId } = event.detail;

        console.log(
          `📱 Direct read receipt received for match ${match.id}, messageIds:`,
          messageIds,
        );

        // Update regardless of the current message status to ensure consistency
        setEnrichedMatches((prevMatches) => {
          const updatedMatches = [...prevMatches];
          const matchToUpdate = updatedMatches.find((m) => m.id === match.id);

          if (matchToUpdate && matchToUpdate.lastMessageSentByMe) {
            // Using the properly typed value from the enum
            const newStatus: "read" = "read";
            matchToUpdate.messageStatus = newStatus;
            console.log(
              `📱 Directly updated message status for match ${match.id} to read (fixed)`,
            );
          }

          return updatedMatches;
        });
      };

      // Store the handler to remove it later
      matchReadHandlers[eventName] = handler;

      // Add the listener
      window.addEventListener(eventName, handler);
    });

    // Cleanup function to remove all event listeners when component unmounts
    return () => {
      // Remove match-specific event listeners
      Object.entries(matchReadHandlers).forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });
    };
  }, [enrichedMatches, user?.id]);

  // Listen for match:created events to immediately refetch matches
  useEffect(() => {
    const handleMatchCreated = (event: Event) => {
      console.log(
        "🎯 match:created event detected, forcing immediate data refresh",
      );

      // Check for match details in the event
      let matchId: number | undefined;
      if (event instanceof CustomEvent && event.detail) {
        matchId = event.detail.matchId;
        console.log(`🎯 match:created event contains matchId: ${matchId}`);
      }

      // Invalidate to clear any stale cache data
      queryClient.invalidateQueries({
        queryKey: ["/api/matches"],
        refetchType: "all",
      });

      // Then immediately refetch to update the UI
      refetch().then(() => {
        console.log(
          "✅ Match data successfully refreshed after match:created event",
        );

        // Store match data in sessionStorage for better reliability
        if (matchId !== undefined && matches) {
          const match = matches.find((m) => m.id === matchId);
          if (match) {
            try {
              sessionStorage.setItem(
                `match_data_${matchId}`,
                JSON.stringify(match),
              );
              console.log(
                `✅ Stored match data for ${matchId} in sessionStorage`,
              );
            } catch (err) {
              console.error(`Failed to store match data: ${err}`);
            }
          }
        }
      });
    };

    // Handle matches:refresh event (sent by WebSocket)
    const handleMatchesRefresh = () => {
      console.log(
        "🔄 matches:refresh event detected, forcing immediate refetch",
      );

      // First, clear any potentially stale cache of matches
      // This ensures we get fresh data from the server
      queryClient.invalidateQueries({
        queryKey: ["/api/matches"],
        refetchType: "all", // Force refetch even if data is considered fresh
      });

      // Then immediately refetch to update the UI
      refetch()
        .then(() => {
          console.log("✅ Match data successfully refreshed");
        })
        .catch((err) => {
          console.error("❌ Error refreshing match data:", err);
        });
    };

    // Check for newly created match in storage
    const checkForNewMatch = () => {
      try {
        // First check sessionStorage (preferred method), then fallback to localStorage
        let newMatchId = sessionStorage.getItem("newly_created_match");

        // If not in sessionStorage, try localStorage as fallback
        if (!newMatchId) {
          newMatchId = localStorage.getItem("newly_created_match");
        }

        if (newMatchId) {
          console.log(`🎯 Found newly created match ${newMatchId}, refetching`);
          refetch();

          // Remove the flag from both storage types to ensure it's completely cleared
          try {
            sessionStorage.removeItem("newly_created_match");
          } catch (e) {}
          try {
            localStorage.removeItem("newly_created_match");
          } catch (e) {}
        }
      } catch (e) {
        console.error("Error checking for new match:", e);
      }
    };

    // PERFORMANCE FIX: Remove aggressive polling - rely on WebSocket events instead
    // Periodic polling disabled to prevent API flood
    // const periodicMatchCheck = setInterval(() => {
    //   console.log("🔍 Performing periodic match check");
    //   checkForNewMatch();
    //   refetch();
    // }, 10000); // Check every 10 seconds
    
    console.log("🔄 [PERFORMANCE] Relying on WebSocket events instead of polling");

    // Add event listeners
    window.addEventListener("match:created", handleMatchCreated);
    window.addEventListener("matches:refresh", handleMatchesRefresh);

    // CRITICAL FIX: Add listener for match:new events from WebSocket
    const handleMatchNew = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        console.log(
          "🎯 match:new event detected, forcing immediate data refresh",
          event.detail,
        );

        // Store match ID in sessionStorage as a backup mechanism
        if (event.detail.matchId) {
          try {
            // Use sessionStorage instead of localStorage to avoid quota issues
            sessionStorage.setItem(
              "newly_created_match",
              event.detail.matchId.toString(),
            );
            console.log(
              `✅ Stored match ID ${event.detail.matchId} in sessionStorage from match:new event`,
            );
          } catch (err) {
            console.error(`Failed to store match ID: ${err}`);
            // The application will still work even if storage fails
          }
        }

        // Force immediate refetch
        refetch();
      }
    };

    // Handle unmatch notification from WebSocket
    const handleUnmatch = (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { matchId, unmatchedBy, timestamp } = event.detail;
        console.log(
          `🔥 Unmatch notification received for match ${matchId}, unmatchedBy: ${unmatchedBy}, at ${timestamp}`,
        );

        // Find the unmatched match in our local state and remove it
        setEnrichedMatches((prevMatches) => {
          return prevMatches.filter((match) => match.id !== matchId);
        });

        // Invalidate caches to reflect the updated match state
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] });

        // If the user is currently viewing the chat with this match, redirect them to messages
        const currentPath = window.location.pathname;
        const chatPathRegex = new RegExp(`^/chat/${matchId}$`);

        if (chatPathRegex.test(currentPath)) {
          console.log(
            `🔄 User is currently viewing the unmatched chat. Redirecting to messages page.`,
          );
          setLocation("/messages");
        }

        // No toast notification - seamless unmatch experience
        console.log(
          "[UNMATCH-PERFORMANCE] Messages page unmatch handled silently",
        );
      }
    };

    window.addEventListener("match:new", handleMatchNew);
    window.addEventListener("match:unmatch", handleUnmatch);

    // Check for new match on mount
    checkForNewMatch();

    // CRITICAL FIX: Force immediate refetch on mount
    refetch();

    // Cleanup
    return () => {
      window.removeEventListener("match:created", handleMatchCreated);
      window.removeEventListener("matches:refresh", handleMatchesRefresh);
      window.removeEventListener("match:new", handleMatchNew);
      window.removeEventListener("match:unmatch", handleUnmatch);
      // clearInterval(periodicMatchCheck); // No longer needed - polling disabled
    };
  }, [refetch, matches, queryClient]);

  // First, filter to only show confirmed matches (mutual matches)
  // Debug logging to see what we're filtering
  const confirmedMatches = (enrichedMatches || []).filter((match) => {
    console.log(
      `[MESSAGES-NEW-FILTER] Match ID: ${match.id}, matchType: ${match.matchType}, matched: ${match.matched}, user: ${match.user?.fullName}`,
    );

    // Only show confirmed matches (mutual matches where both users liked each other)
    const isConfirmed =
      match.matchType === "confirmed" || match.matched === true;
    console.log(`[MESSAGES-NEW-FILTER] isConfirmed: ${isConfirmed}`);
    return isConfirmed;
  });

  // Add KWAME as a virtual conversation at the top
  const kwameConversation: MatchWithUser = {
    id: -1, // Special ID for KWAME
    userId1: user?.id || 0,
    userId2: -1,
    createdAt: new Date().toISOString(),
    matched: true,
    matchType: "confirmed",
    // Do not use a hardcoded placeholder; avoid flicker by leaving empty until real data arrives
    lastMessage: kwameLastMessage?.content || "",
    lastMessageTime: kwameLastMessage?.timestamp || "",
    unreadCount: 0,
    user: {
      id: -1,
      fullName: "KWAME AI",
      photoUrl: "/kwame-ai-avatar.png",
      isOnline: true,
      city: "Your AI Wingman",
      country: "🇬🇭 Ghana",
    },
  };

  // Combine KWAME conversation with regular matches
  const allConversations = [kwameConversation, ...confirmedMatches];

  // Sort matches by lastMessageTime FIRST, so both circles and list have the same order
  // If no lastMessageTime is available, use createdAt date as fallback
  allConversations.sort(compareMatchesByActivity);

  // Data for new matches carousel - now takes the first 5 from the sorted array
  const newMatches = allConversations.slice(0, 5) || [];

  // Filter conversations based only on search query - showing all confirmed matches
  const filteredMatches =
    allConversations.filter((match) => {
      // Check if match.user exists before accessing fullName property
      if (!match.user) return false;

      const nameMatch = match.user.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return nameMatch;
    }) || [];

  // filteredMatches is already sorted since confirmedMatches was sorted above

  const handleMatchClick = (matchId: number) => {
    if (matchId === -1) {
      // Special handling for KWAME AI
      setLocation("/kwame-chat");
    } else {
      setLocation(`/chat/${matchId}`);
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Debug toggle function to show all matches - no longer needed but kept for compatibility
  const toggleShowAllMatches = () => {
    // No-op function - we always show all matches now
    console.log("🔧 All matches are now shown by default");
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-132px)] flex items-center justify-center">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
          <Heart
            className="h-5 w-5 text-purple-500 absolute top-2.5 left-2.5"
            fill="white"
          />
        </div>
        <p className="text-sm ml-3 text-gray-600 dark:text-gray-400">
          Loading your conversations...
        </p>
      </div>
    );
  }

  // Add debugging for when matches exist but aren't showing
  if (matches && matches.length > 0 && confirmedMatches.length === 0) {
    console.log("🔎 DEBUG: Matches exist but no confirmed matches:", {
      totalCount: matches.length,
      matchData: matches.map((m) => ({
        id: m.id,
        matched: m.matched,
        matchType: m.matchType,
      })),
    });
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-132px)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">
            {translate("errors.loadingMessages")}
          </p>
          <p className="text-gray-500 text-sm">
            {translate("errors.tryAgainLater")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-[calc(100vh-132px)] flex flex-col ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Premium header with animated gradient and futuristic design */}
      <motion.div
        className={`${isDarkMode ? "bg-black/40 backdrop-blur-xl" : "bg-white/80 backdrop-blur-md"} border-b shadow-lg`}
        style={{
          borderImage: isDarkMode
            ? "linear-gradient(to right, rgba(126, 34, 206, 0.3), rgba(236, 72, 153, 0.3)) 1"
            : "linear-gradient(to right, rgba(126, 34, 206, 0.15), rgba(236, 72, 153, 0.15)) 1",
        }}
      >
        <motion.div
          className="px-4 py-5 relative overflow-hidden"
          variants={gradientVariants}
          initial="initial"
          animate="animate"
        >
          {/* Background subtle animated elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className={`absolute w-20 h-20 rounded-full blur-3xl opacity-10 top-0 left-10`}
              initial={{ backgroundColor: "#9333ea" }}
              animate={{
                backgroundColor: ["#9333ea", "#ec4899", "#9333ea"],
                x: [0, 10, 0],
                y: [0, 5, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className={`absolute w-16 h-16 rounded-full blur-3xl opacity-10 bottom-0 right-10`}
              initial={{ backgroundColor: "#ec4899" }}
              animate={{
                backgroundColor: ["#ec4899", "#9333ea", "#ec4899"],
                x: [0, -10, 0],
                y: [0, -5, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </div>

          {/* Header Content */}
          <div className="relative z-10">
            {/* Search bar - only show when there are conversations */}
            {allConversations.length > 0 && (
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className={`pl-10 pr-10 py-2 h-11 rounded-full placeholder:text-gray-400 dark:placeholder:text-gray-500
                  ${
                    isDarkMode
                      ? "bg-gray-800/90 border-gray-700 text-white focus:border-purple-600"
                      : "bg-white/90 border-gray-200 text-gray-900 focus:border-purple-400"
                  }`}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* New Matches Horizontal Scroll */}
            <div className="mt-4">
              {newMatches.length > 0 && (
                <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  <h3 className="text-xs font-medium mb-3 flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-500" />
                    New Connectionsssss
                  </h3>
                  <div className="flex space-x-3">
                    {newMatches.map((match) =>
                      match.user ? (
                        <motion.div
                          key={match.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -5, transition: { duration: 0.2 } }}
                          onClick={() => handleMatchClick(match.id)}
                          className={`flex-shrink-0 w-12 flex flex-col items-center cursor-pointer`}
                        >
                          <div className="relative">
                            <UserProfilePreviewPopup user={match.user}>
                              <div
                                className={`h-12 w-12 rounded-full border-2 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 ease-in-out ${
                                  isDarkMode
                                    ? "border-purple-600"
                                    : "border-purple-400"
                                }`}
                              >
                                <UserPicture
                                  imageUrl={match.user.photoUrl}
                                  fallbackInitials={match.user.fullName.charAt(
                                    0,
                                  )}
                                  className="h-full w-full"
                                />
                              </div>
                            </UserProfilePreviewPopup>
                            {match.user.isOnline && (
                              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
                            )}
                          </div>
                        </motion.div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Messages Content */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} px-4 py-2`}
      >
        <AnimatePresence initial={false}>
          {filteredMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center h-full py-10 text-center relative overflow-hidden"
            >
              {/* Floating icons background - 6x original count */}
              <FloatingIconsBackground
                count={48}
                color={
                  isDarkMode
                    ? "rgba(168, 85, 247, 0.5)"
                    : "rgba(168, 85, 247, 0.6)"
                }
                opacityRange={[0.1, 0.25]}
                sizeRange={[16, 28]}
                speedRange={[25, 45]}
              />
              <div className="relative z-10">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    isDarkMode ? "bg-gray-800" : "bg-purple-100"
                  }`}
                >
                  <MessageCircle
                    className={`h-8 w-8 ${
                      isDarkMode ? "text-purple-400" : "text-purple-500"
                    }`}
                  />
                </div>
                <p
                  className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {searchQuery
                    ? translate("messages.noConversationsMatching")
                    : translate("messages.noConversationsYet")}
                </p>

                {matches && matches.length > 0 && (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    {matches.length} potential matches found
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2 pb-2">
              {filteredMatches.map((match) => (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleMatchClick(match.id)}
                  className={`p-3 rounded-2xl flex items-center space-x-3 mb-2 cursor-pointer transition-all duration-300 ${
                    match.id === -1
                      ? // KWAME AI Special Styling
                        `relative overflow-hidden ${
                          isDarkMode
                            ? "bg-gradient-to-r from-purple-900/80 via-pink-900/60 to-purple-900/80 hover:from-purple-800/90 hover:via-pink-800/70 hover:to-purple-800/90 shadow-2xl shadow-purple-500/20 border border-purple-500/30"
                            : "bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 hover:from-purple-100 hover:via-pink-100 hover:to-purple-100 shadow-2xl shadow-purple-500/20 border border-purple-200/50"
                        } transform hover:scale-[1.02] hover:shadow-3xl backdrop-blur-sm`
                      : // Regular chat styling
                        `${
                          isDarkMode
                            ? "hover:bg-gray-800 bg-gray-800/50"
                            : "hover:bg-white bg-white"
                        } ${match.unreadCount ? "shadow-md" : "shadow-sm"}`
                  }`}
                >
                  {/* KWAME AI Animated Background Pattern */}
                  {match.id === -1 && (
                    <div className="absolute inset-0 opacity-10">
                      <motion.div
                        animate={{
                          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-400"
                        style={{
                          backgroundSize: "400% 400%",
                        }}
                      />
                    </div>
                  )}

                  {/* User Avatar */}
                  <div className="relative z-10">
                    {match.user &&
                      (match.id === -1 ? (
                        // Enhanced KWAME Avatar with glow effects
                        <motion.div
                          className="relative cursor-pointer"
                          whileHover={{ scale: 1.1, rotateY: 10 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                        >
                          <div className="relative">
                            {/* Glowing ring effect */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-75 animate-pulse"></div>
                            <div className="relative h-12 w-12 rounded-full overflow-hidden shadow-2xl border-2 border-white/20 bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                              <div className="w-full h-full rounded-full overflow-hidden">
                                <img
                                  src="/kwame-ai-avatar.png"
                                  alt="KWAME AI"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fallback = e.currentTarget
                                      .nextElementSibling as HTMLElement;
                                    if (fallback)
                                      fallback.style.display = "flex";
                                  }}
                                />
                                <div
                                  className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white"
                                  style={{ display: "none" }}
                                >
                                  <Sparkles className="h-6 w-6 text-white drop-shadow-lg" />
                                </div>
                              </div>
                            </div>
                            {/* Enhanced online indicator with glow */}
                            <motion.span
                              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-white dark:border-gray-900 shadow-lg"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></span>
                            </motion.span>
                          </div>
                        </motion.div>
                      ) : (
                        // Regular user avatar
                        <UserProfilePreviewPopup user={match.user}>
                          <div className="relative cursor-pointer hover:scale-105 transition-transform duration-200 ease-in-out">
                            <UserPicture
                              imageUrl={match.user.photoUrl}
                              fallbackInitials={match.user.fullName.charAt(0)}
                              className="h-12 w-12 rounded-full"
                            />
                            {match.user.isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
                            )}
                          </div>
                        </UserProfilePreviewPopup>
                      ))}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <h3
                          className={`font-medium text-sm truncate ${
                            match.id === -1
                              ? // KWAME AI Special Name Styling
                                `bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent font-bold ${
                                  isDarkMode
                                    ? "from-purple-300 via-pink-300 to-purple-300"
                                    : ""
                                }`
                              : // Regular name styling
                                match.unreadCount
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {match.user ? match.user.fullName : ""}
                        </h3>
                        {/* Remove AI badge - no badge for KWAME AI anymore */}
                      </div>

                      {match.lastMessageTime && (
                        <span
                          className={`text-xs ${
                            match.id === -1
                              ? isDarkMode
                                ? "text-purple-300"
                                : "text-purple-600"
                              : match.unreadCount
                                ? "text-gray-800 dark:text-gray-100"
                                : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTimeAgo(new Date(match.lastMessageTime))}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-0.5">
                      <div className="flex items-center space-x-1 flex-grow overflow-hidden">
                        {/* Message content */}
                        <div className="overflow-hidden flex-grow">
                          {match.lastMessage ? (
                            <p
                              className={`text-[11px] truncate max-w-full leading-tight ${
                                match.id === -1
                                  ? // KWAME AI Message Styling
                                    isDarkMode
                                    ? "text-purple-200 font-medium"
                                    : "text-purple-700 font-medium"
                                  : // Regular message styling
                                    match.unreadCount && match.unreadCount > 0
                                    ? isDarkMode
                                      ? "text-white font-medium"
                                      : "text-gray-800 font-medium"
                                    : isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-500"
                              }`}
                            >
                              {formatMessagePreview(match.lastMessage)}
                            </p>
                          ) : (
                            <p
                              className={`text-xs font-light italic ${
                                match.id === -1
                                  ? isDarkMode
                                    ? "text-purple-300"
                                    : "text-purple-600"
                                  : isDarkMode
                                    ? "text-purple-400"
                                    : "text-purple-600"
                              }`}
                            >
                              {match.id === -1 ? "" : "Start a conversation"}
                            </p>
                          )}
                        </div>

                        {/* Show message status indicators when the CURRENT USER is the sender of the last message
                                AND Read Receipts are enabled for this match */}
                        {match.lastMessage &&
                          match.lastMessageSentByMe &&
                          readReceiptsStatus[match.id] && (
                            <div className="flex-shrink-0">
                              {match.messageStatus ? (
                                match.messageStatus === "read" ? (
                                  <CheckCheck
                                    className={`h-3 w-3 ${match.id === -1 ? "text-purple-400" : "text-purple-500"}`}
                                  />
                                ) : match.messageStatus === "delivered" ? (
                                  <Check
                                    className={`h-3 w-3 ${match.id === -1 ? "text-purple-400" : "text-purple-500"}`}
                                  />
                                ) : (
                                  <Clock
                                    className={`h-3 w-3 ${match.id === -1 ? "text-purple-400" : "text-purple-500"}`}
                                  />
                                )
                              ) : (
                                // Fallback to a single check mark if no message status is available
                                <Check
                                  className={`h-3 w-3 ${match.id === -1 ? "text-purple-400" : "text-purple-500"}`}
                                />
                              )}
                            </div>
                          )}
                      </div>

                      {/* Enhanced unread badge for KWAME AI */}
                      <div className="flex-shrink-0 ml-2">
                        {match.unreadCount && match.unreadCount > 0 ? (
                          match.id === -1 ? (
                            // Special KWAME AI unread badge with glow effect
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Badge className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white text-[10px] min-w-[22px] h-[22px] flex items-center justify-center rounded-full shadow-lg shadow-purple-500/30 border border-purple-300/20">
                                <span className="relative z-10">
                                  {match.unreadCount}
                                </span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-50 animate-pulse"></div>
                              </Badge>
                            </motion.div>
                          ) : (
                            // Regular unread badge
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full">
                              {match.unreadCount}
                            </Badge>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
