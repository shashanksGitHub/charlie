import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useAppMode } from "@/hooks/use-app-mode";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Search,
  MessageCircle,
  Loader2,
  X,
  Clock,
  CheckCheck,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPicture } from "@/components/ui/user-picture";
import { formatTimeAgo } from "@/lib/utils";
import KwameConversationRow from "@/components/kwame/kwame-conversation-row";

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

interface MatchWithUser {
  id: number;
  userId1: number;
  userId2: number;
  createdAt: string;
  matched: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  messageStatus?: "sending" | "sent" | "delivered" | "read" | "error";
  lastMessageSentByMe?: boolean;
  user: {
    id: number;
    fullName: string;
    photoUrl?: string;
    isOnline?: boolean;
  };
}

export function HeatMessages() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const { isDarkMode } = useDarkMode();
  const { getUserPresence } = useWebSocket();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { currentMode, setAppMode } = useAppMode();

  // Ensure HEAT mode is set when this component loads
  useEffect(() => {
    if (currentMode !== "HEAT") {
      console.log(
        "[HEAT-MESSAGES] Setting app mode to HEAT, current mode:",
        currentMode,
      );
      setAppMode("HEAT");
    }
  }, [currentMode, setAppMode]);

  const { unreadCount, refetch: refetchUnreadCount } = useUnreadMessages();

  console.log(
    "[HEAT-MESSAGES] Component rendered, mode:",
    currentMode,
    "unread count:",
    unreadCount,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [enrichedMatches, setEnrichedMatches] = useState<MatchWithUser[]>([]);
  // Process the enriched matches to include message status
  const [processedMatches, setProcessedMatches] = useState<MatchWithUser[]>([]);
  // KWAME AI last message for virtual conversation
  const [kwameLastMessage, setKwameLastMessage] = useState<{
    content: string;
    timestamp: string;
  } | null>(null);
  // Track read receipt settings for each match - Enable by default for testing
  const [readReceiptsStatus, setReadReceiptsStatus] = useState<
    Record<number, boolean>
  >({});

  // Initialize read receipts for all matches
  useEffect(() => {
    if (processedMatches && processedMatches.length > 0) {
      const newReadReceiptsStatus: Record<number, boolean> = {};
      processedMatches.forEach((match) => {
        newReadReceiptsStatus[match.id] = true; // Enable read receipts for all matches by default
      });
      setReadReceiptsStatus(newReadReceiptsStatus);
    }
  }, [processedMatches]);

  const {
    data: matches,
    isLoading,
    isError,
    refetch,
  } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches"],
  });

  useEffect(() => {
    if (!user || !matches || matches.length === 0) {
      setEnrichedMatches([]);
      return;
    }

    const fetchProfiles = async () => {
      const enriched = await Promise.all(
        matches.map(async (match) => {
          const otherUserId =
            match.userId1 === user.id ? match.userId2 : match.userId1;

          console.log(
            `🔍 HEAT Enriching match ${match.id}: current user=${user.id}, other user=${otherUserId}, existing user data:`,
            match.user,
          );

          // CRITICAL FIX: Validate that the user field contains the OTHER user's data
          if (
            match.user &&
            match.user.fullName &&
            match.user.id === otherUserId
          ) {
            console.log(
              `✅ HEAT Match ${match.id} already has correct user data for ${match.user.fullName}`,
            );
            return match;
          }

          try {
            const res = await fetch(`/api/profile/${otherUserId}`);
            if (!res.ok) throw new Error(`Failed to fetch profile`);
            const userProfile = await res.json();

            return {
              ...match,
              user: {
                ...userProfile,
                id: otherUserId,
                isOnline: !!getUserPresence(otherUserId),
              },
            };
          } catch (error) {
            return {
              ...match,
              user: {
                id: otherUserId,
                fullName: "Social User",
                photoUrl: undefined,
                isOnline: false,
              },
            };
          }
        }),
      );

      setEnrichedMatches(enriched);
    };

    fetchProfiles();
  }, [matches, user, getUserPresence]);

  // Process matches with message status - Updated to match MEET Messages logic
  const processMatchesWithMessageStatus = async () => {
    if (!user || !enrichedMatches || enrichedMatches.length === 0) {
      return;
    }

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
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
        "📱 [HEAT] Updated match message statuses:",
        matchesWithStatus.map((m) => ({
          id: m.id,
          lastMessageSentByMe: m.lastMessageSentByMe,
          messageStatus: m.messageStatus,
          lastMessage: m.lastMessage,
        })),
      );
      setProcessedMatches(matchesWithStatus);
    } else {
      // Add debug logging even when no updates to see current state
      console.log(
        "📱 [HEAT] Current match states (no updates):",
        matchesWithStatus.map((m) => ({
          id: m.id,
          lastMessageSentByMe: m.lastMessageSentByMe,
          messageStatus: m.messageStatus,
          lastMessage: m.lastMessage,
        })),
      );
    }
  };

  useEffect(() => {
    if (enrichedMatches && enrichedMatches.length > 0) {
      // Set initial processed matches with matchType
      const initialProcessed = enrichedMatches.map((match) => ({
        ...match,
        matchType: match.matched ? "confirmed" : "pending",
      }));
      setProcessedMatches(initialProcessed);

      // Then process message statuses
      processMatchesWithMessageStatus();
    } else {
      setProcessedMatches([]);
    }
  }, [enrichedMatches, user]);

  // Fetch KWAME AI last message (small, cheap request)
  useEffect(() => {
    const fetchKwameLastMessage = async () => {
      try {
        const response = await fetch(
          `/api/kwame/conversation-history?limit=1`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = await response.json();
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
      } catch (_) {
        setKwameLastMessage({
          content: "",
          timestamp: new Date().toISOString(),
        });
      }
    };
    fetchKwameLastMessage();
  }, []);

  // Event handlers for real-time updates
  useEffect(() => {
    if (!user) return;

    // Handle message status updates
    const handleMessageStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { matchId, status, lastMessageSentByMe } = customEvent.detail;

      setProcessedMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, messageStatus: status, lastMessageSentByMe }
            : match,
        ),
      );
    };

    // Handle new message events - Updated to match WebSocket service structure
    const handleNewMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;

      if (!message || !message.matchId) return;

      console.log(
        `📱 [HEAT] New message received for match ${message.matchId}:`,
        message,
      );

      const isCurrentUserSender = message.senderId === user.id;

      setProcessedMatches((prev) =>
        prev.map((match) => {
          if (match.id === message.matchId) {
            return {
              ...match,
              lastMessage: message.content,
              lastMessageTime: message.createdAt,
              lastMessageSentByMe: isCurrentUserSender,
              unreadCount: isCurrentUserSender
                ? match.unreadCount || 0
                : (match.unreadCount || 0) + 1,
              messageStatus: isCurrentUserSender
                ? "delivered"
                : match.messageStatus,
            };
          }
          return match;
        }),
      );

      // Force immediate UI refresh
      queryClient.invalidateQueries({
        queryKey: ["/api/matches"],
        refetchType: "none", // Don't refetch, just use the updated state
      });
    };

    // Handle last message updates
    const handleLastMessageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { matchId, lastMessage, lastMessageTime, unreadCount } =
        customEvent.detail;

      setProcessedMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? {
                ...match,
                lastMessage,
                lastMessageTime,
                unreadCount: unreadCount || 0,
              }
            : match,
        ),
      );
    };

    // Handle message read events
    const handleGlobalMessageRead = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { matchId } = customEvent.detail;

      setProcessedMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, unreadCount: 0 } : match,
        ),
      );
    };

    // Add event listeners with correct event names that match WebSocket service
    window.addEventListener(
      "message:status:updated",
      handleMessageStatusUpdate,
    );
    window.addEventListener("message:new", handleNewMessage);
    window.addEventListener(
      "match:lastMessage:updated",
      handleLastMessageUpdate,
    );
    window.addEventListener("message:read:global", handleGlobalMessageRead);

    // Handle matches refresh events for instant updates
    const handleMatchesRefresh = (event: Event) => {
      console.log(
        "📱 [HEAT] Matches refresh event received, forcing query invalidation",
      );
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    };

    window.addEventListener("matches:refresh", handleMatchesRefresh);

    // Handle unread count increment events for instant badge updates
    const handleUnreadCountIncrement = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const { mode } = event.detail;

      // Only handle if this is for HEAT mode
      if (mode === "HEAT") {
        console.log("📱 [HEAT] Unread count increment event received");
        queryClient.invalidateQueries({
          queryKey: ["/api/messages/unread/count", "HEAT"],
        });
      }
    };

    window.addEventListener(
      "unread-count:increment",
      handleUnreadCountIncrement,
    );

    return () => {
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

  // Add periodic status refresh interval - matching MEET Messages pattern
  useEffect(() => {
    if (!processedMatches || processedMatches.length === 0 || !user?.id) return;

    // Set up an interval to refresh message statuses periodically
    const statusRefreshInterval = setInterval(() => {
      processMatchesWithMessageStatus();
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [processedMatches, user?.id, queryClient]);

  // First filter: Only show confirmed matches (exclude pending matches) in Messages page
  // Debug logging to see what we're filtering
  const confirmedMatches = (processedMatches || []).filter((match) => {
    console.log(
      `[HEAT-MESSAGES-FILTER] Match ID: ${match.id}, matchType: ${(match as any).matchType}, matched: ${match.matched}, user: ${match.user?.fullName}`,
    );

    // Only show confirmed matches (mutual matches where both users liked each other)
    const isConfirmed =
      (match as any).matchType === "confirmed" || match.matched === true;
    console.log(`[HEAT-MESSAGES-FILTER] isConfirmed: ${isConfirmed}`);
    return isConfirmed;
  });
  const newMatches = (processedMatches || []).filter((match) => !match.matched);

  // Inject KWAME AI as a virtual conversation at the top
  const kwameConversation: MatchWithUser = {
    id: -1,
    userId1: user?.id || 0,
    userId2: -1,
    createdAt: new Date().toISOString(),
    matched: true,
    lastMessage: kwameLastMessage?.content || "",
    lastMessageTime: kwameLastMessage?.timestamp || "",
    unreadCount: 0,
    user: {
      id: -1,
      fullName: "KWAME AI",
      photoUrl: "/kwame-ai-avatar.png",
      isOnline: true,
    },
  };

  const conversationsWithKwame = [kwameConversation, ...confirmedMatches];

  const filteredMatches = (conversationsWithKwame || []).filter((match) =>
    match.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleMatchClick = (matchId: number) => {
    if (matchId === -1) {
      setLocation("/kwame-chat");
    } else {
      setLocation(`/chat/${matchId}`);
    }
  };

  const isUserOnline = (userId: number): boolean => {
    return !!getUserPresence(userId);
  };

  if (isLoading) {
    return (
      <div
        className={`h-[calc(100vh-132px)] flex items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-orange-600 animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Loading Social Connections
          </h3>
          <p className="text-gray-600">Finding your network...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`h-[calc(100vh-132px)] flex items-center justify-center p-6 text-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div>
          <h3 className="text-xl font-semibold text-red-500 mb-2">
            Error Loading Social Connections
          </h3>
          <p className="text-gray-600 mb-4">
            There was a problem loading your social network. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md text-sm"
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
      {/* Header - simplified to only search (match SUITE style) */}
      <div className="px-4 py-4">
        {confirmedMatches.length > 0 && (
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
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div
        className={`flex-1 overflow-y-auto ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} px-4 py-2`}
      >
        {filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isDarkMode ? "bg-gray-800" : "bg-orange-100"
              }`}
            >
              <Flame
                className={`h-8 w-8 ${isDarkMode ? "text-orange-400" : "text-orange-500"}`}
              />
            </div>
            <p
              className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              {searchQuery
                ? "No social connections matching your search"
                : "No social conversations yet"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setLocation("/heat/explore")}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full text-sm font-medium hover:from-orange-600 hover:to-yellow-600 transition-colors"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMatches.map((match) =>
              match.id === -1 ? (
                <KwameConversationRow
                  key={match.id}
                  isDarkMode={isDarkMode}
                  onClick={() => handleMatchClick(match.id)}
                  lastMessage={match.lastMessage}
                  lastMessageTime={match.lastMessageTime}
                  unreadCount={match.unreadCount}
                />
              ) : (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match.id)}
                  className={`p-3 rounded-lg flex items-center space-x-3 cursor-pointer ${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700"
                      : "bg-white hover:bg-gray-50"
                  } shadow-sm transition-colors`}
                >
                  <div className="relative">
                    <UserPicture
                      imageUrl={match.user?.photoUrl}
                      fallbackInitials={match.user?.fullName?.charAt(0) || "?"}
                      className="h-12 w-12 rounded-full"
                    />
                    {isUserOnline(match.user?.id) && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3
                        className={`font-medium text-sm truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        {match.user?.fullName || "Social User"}
                      </h3>
                      {match.lastMessageTime && (
                        <span
                          className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {formatTimeAgo(new Date(match.lastMessageTime))}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-0.5">
                      <div className="flex items-center space-x-1 flex-grow overflow-hidden">
                        {/* Message content */}
                        <div className="overflow-hidden flex-grow">
                          <p
                            className={`text-[11px] truncate max-w-full leading-tight ${
                              match.unreadCount && match.unreadCount > 0
                                ? isDarkMode
                                  ? "text-white font-medium"
                                  : "text-gray-800 font-medium"
                                : isDarkMode
                                  ? "text-gray-400"
                                  : "text-gray-500"
                            }`}
                          >
                            {formatMessagePreview(
                              match.lastMessage || "Start a conversation",
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Status indicators and unread badge */}
                      <div className="flex items-center space-x-2">
                        {/* Show message status indicators when the CURRENT USER is the sender of the last message */}
                        {match.lastMessage && match.lastMessageSentByMe && (
                          <div className="flex-shrink-0">
                            {match.messageStatus ? (
                              match.messageStatus === "read" ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              ) : match.messageStatus === "delivered" ? (
                                <CheckCheck className="h-3 w-3 text-gray-400" />
                              ) : match.messageStatus === "sent" ? (
                                <Check className="h-3 w-3 text-gray-400" />
                              ) : match.messageStatus === "sending" ? (
                                <Clock className="h-3 w-3 text-gray-400" />
                              ) : match.messageStatus === "error" ? (
                                <X className="h-3 w-3 text-red-500" />
                              ) : (
                                <Check className="h-3 w-3 text-gray-400" />
                              )
                            ) : (
                              // Always show a fallback check mark when user sent a message
                              <Check className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        )}

                        {/* Always keep unread badge on the right */}
                        <div className="flex-shrink-0">
                          {match.unreadCount && match.unreadCount > 0 ? (
                            <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full">
                              {match.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
