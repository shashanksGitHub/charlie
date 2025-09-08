import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Search,
  Bell,
  Info,
  Users,
  MessageCircle,
  Building,
  Loader2,
  ArrowRight,
  Clock,
  CheckCheck,
  Check,
  ChevronDown,
  X,
  Filter,
  MoreVertical,
  UserCheck,
  Star,
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
    profession?: string;
    company?: string;
    jobTitle?: string;
    industry?: string;
    verifiedProfile?: boolean;
  };
}

export function SuiteMessages() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const { isDarkMode } = useDarkMode();
  const { toast } = useToast();
  const { getUserPresence } = useWebSocket();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [infoMode, setInfoMode] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(true); // Always show all matches by default
  const [enrichedMatches, setEnrichedMatches] = useState<MatchWithUser[]>([]);
  // Track read receipt settings for each match
  const [readReceiptsStatus, setReadReceiptsStatus] = useState<
    Record<number, boolean>
  >({});

  // Animated gradients for SUITE theme (blue instead of purple)
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

  // Load read receipts settings for all matches
  useEffect(() => {
    if (!matches || matches.length === 0) return;

    const loadReadReceiptsSettings = () => {
      const newSettings: Record<number, boolean> = {};

      matches.forEach((match) => {
        try {
          // Use the same storage key as in real-time-chat.tsx
          const currentMode = localStorage.getItem("app_mode") || "SUITE";
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
      console.log(
        "🔍 Enriching SUITE matches with user profiles:",
        matches.length,
      );

      // CRITICAL FIX: Log all matches before enrichment to help diagnose issues
      console.log(
        "🔍 Raw SUITE matches data before enrichment:",
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
            `🔍 Enriching SUITE match ${match.id}: current user=${user.id}, other user=${otherUserId}`,
          );

          // If the match already has a user object with fullName, use it
          if (
            match.user &&
            match.user.fullName &&
            match.user.id === otherUserId
          ) {
            console.log(
              `✅ SUITE Match ${match.id} already has user data for ${match.user.fullName}`,
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
              `✅ Successfully fetched SUITE profile for user ${otherUserId}: ${userProfile.fullName}`,
            );

            // Return match with enriched user data
            return {
              ...match,
              user: {
                ...userProfile,
                id: otherUserId,
                isOnline: !!getUserPresence(otherUserId),
              },
            };
          } catch (error) {
            console.error(
              `❌ Failed to fetch profile for user ${otherUserId}:`,
              error,
            );
            // Return match with basic user data as fallback
            return {
              ...match,
              user: {
                id: otherUserId,
                fullName: "Professional", // Generic fallback for SUITE
                photoUrl: undefined,
                isOnline: false,
              },
            };
          }
        }),
      );

      if (!cancelled) {
        console.log("✅ Setting enriched SUITE matches:", enriched.length);
        setEnrichedMatches(enriched);
      }
    };

    fetchProfiles();

    return () => {
      cancelled = true;
    };
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
        "📱 [SUITE] Updated match message statuses:",
        matchesWithStatus.map((m) => ({
          id: m.id,
          lastMessageSentByMe: m.lastMessageSentByMe,
          messageStatus: m.messageStatus,
        })),
      );
      setProcessedMatches(matchesWithStatus);
    }
  };

  // Process the enriched matches to include message status
  const [processedMatches, setProcessedMatches] = useState<MatchWithUser[]>([]);
  // KWAME AI last message for virtual conversation in SUITE
  const [kwameLastMessage, setKwameLastMessage] = useState<{
    content: string;
    timestamp: string;
  } | null>(null);

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

  // Fetch KWAME AI last message for SUITE tab
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

  // Filter based on search query and match type
  // Debug logging to see what we're filtering
  const confirmedMatches = (processedMatches || []).filter((match) => {
    console.log(
      `[SUITE-MESSAGES-FILTER] Match ID: ${match.id}, matchType: ${(match as any).matchType}, matched: ${match.matched}, user: ${match.user?.fullName}`,
    );

    // Only show confirmed matches (mutual matches where both users liked each other)
    const isConfirmed =
      (match as any).matchType === "confirmed" || match.matched === true;
    console.log(`[SUITE-MESSAGES-FILTER] isConfirmed: ${isConfirmed}`);
    return isConfirmed;
  });
  const newMatches = (processedMatches || []).filter((match) => !match.matched);

  // Inject KWAME AI as a virtual conversation at the top for SUITE
  const kwameConversation: MatchWithUser = {
    id: -1,
    userId1: user?.id || 0,
    userId2: -1,
    createdAt: new Date().toISOString(),
    matched: true,
    matchType: "confirmed",
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

  const filteredMatches = (conversationsWithKwame || []).filter(
    (match) =>
      match.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (match.user?.profession &&
        match.user.profession
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (match.user?.company &&
        match.user.company.toLowerCase().includes(searchQuery.toLowerCase())),
  );

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
        `📱 [SUITE] New message received for match ${message.matchId}:`,
        message,
      );

      setProcessedMatches((prev) =>
        prev.map((match) => {
          if (match.id === message.matchId) {
            const isCurrentUserSender = message.senderId === user.id;
            return {
              ...match,
              lastMessage: message.content,
              lastMessageTime: message.createdAt || new Date().toISOString(),
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
        "📱 [SUITE] Matches refresh event received, forcing query invalidation",
      );
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    };

    window.addEventListener("matches:refresh", handleMatchesRefresh);

    // Handle unread count increment events for instant badge updates
    const handleUnreadCountIncrement = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const { mode } = event.detail;

      // Only handle if this is for SUITE mode
      if (mode === "SUITE") {
        console.log("📱 [SUITE] Unread count increment event received");
        queryClient.invalidateQueries({
          queryKey: ["/api/messages/unread/count", "SUITE"],
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
  }, [user]);

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

  const clearSearch = () => {
    setSearchQuery("");
  };

  const toggleShowAllMatches = () => {
    setShowAllMatches(!showAllMatches);
  };

  if (isLoading) {
    return (
      <div
        className={`h-[calc(100vh-132px)] flex items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Loading Professional Connections
          </h3>
          <p className="text-gray-600">Finding your professional network...</p>
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
            Error Loading Professional Connections
          </h3>
          <p className="text-gray-600 mb-4">
            There was a problem loading your professional network. Please try
            again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md text-sm"
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
      {/* Premium header with animated gradient and professional design */}
      <motion.div
        className={`${isDarkMode ? "bg-black/40 backdrop-blur-xl" : "bg-white/80 backdrop-blur-md"} border-b shadow-lg`}
        style={{
          borderImage: isDarkMode
            ? "linear-gradient(to right, rgba(59, 130, 246, 0.3), rgba(34, 197, 94, 0.3)) 1"
            : "linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(34, 197, 94, 0.15)) 1",
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
              initial={{ backgroundColor: "#3b82f6" }}
              animate={{
                backgroundColor: ["#3b82f6", "#22c55e", "#3b82f6"],
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
              initial={{ backgroundColor: "#22c55e" }}
              animate={{
                backgroundColor: ["#22c55e", "#3b82f6", "#22c55e"],
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
            {confirmedMatches.length > 0 && (
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search professional network..."
                  className={`pl-10 pr-10 py-2 h-11 rounded-full placeholder:text-gray-400 dark:placeholder:text-gray-500
                  ${
                    isDarkMode
                      ? "bg-gray-800/90 border-gray-700 text-white focus:border-blue-600"
                      : "bg-white/90 border-gray-200 text-gray-900 focus:border-blue-400"
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
          </div>
        </motion.div>
      </motion.div>

      {/* Conversations List */}
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
              {/* Floating icons background - professional theme */}
              <FloatingIconsBackground
                count={48}
                color={
                  isDarkMode
                    ? "rgba(59, 130, 246, 0.5)"
                    : "rgba(59, 130, 246, 0.6)"
                }
                opacityRange={[0.1, 0.25]}
                sizeRange={[16, 28]}
                speedRange={[25, 45]}
              />
              <div className="relative z-10">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ml-4 ${
                    isDarkMode ? "bg-gray-800" : "bg-blue-100"
                  }`}
                >
                  <Briefcase
                    className={`h-8 w-8 ${
                      isDarkMode ? "text-blue-400" : "text-blue-500"
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
                    {matches.length} potential connections found
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2 pb-2">
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
                  <motion.div
                    key={match.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleMatchClick(match.id)}
                    className={`p-3 rounded-2xl flex items-center space-x-3 mb-2 cursor-pointer ${
                      isDarkMode
                        ? "hover:bg-gray-800 bg-gray-800/50"
                        : "hover:bg-white bg-white"
                    } ${match.unreadCount ? "shadow-md" : "shadow-sm"} transition-all duration-200`}
                  >
                    {/* User Avatar */}
                    <div className="relative">
                      {match.user && (
                        <UserProfilePreviewPopup user={match.user}>
                          <div className="relative cursor-pointer hover:scale-105 transition-transform duration-200 ease-in-out">
                            <UserPicture
                              imageUrl={match.user.photoUrl}
                              fallbackInitials={match.user.fullName.charAt(0)}
                              className="h-12 w-12 rounded-full"
                            />
                            {isUserOnline(match.user.id) && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
                            )}
                            {match.user.verifiedProfile && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                                <UserCheck className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                        </UserProfilePreviewPopup>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-medium text-sm truncate ${
                              match.unreadCount
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {match.user ? match.user.fullName : "Professional"}
                          </h3>
                        </div>

                        {match.lastMessageTime && (
                          <span
                            className={`text-xs ${
                              match.unreadCount
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
                                className={`text-xs ${isDarkMode ? "text-blue-400" : "text-blue-600"} font-light italic`}
                              >
                                Start a conversation
                              </p>
                            )}
                          </div>

                          {/* Show message status indicators when the CURRENT USER is the sender of the last message
                            AND Read Receipts are enabled for this match */}
                          {match.lastMessage &&
                            match.lastMessageSentByMe &&
                            readReceiptsStatus[match.id] && (
                              <div className="flex-shrink-0 ml-2">
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
                                  // Fallback to a single check mark if no message status is available
                                  <Check className="h-3 w-3 text-blue-500" />
                                )}
                              </div>
                            )}
                        </div>

                        {/* Always keep unread badge on the right */}
                        <div className="flex-shrink-0 ml-2">
                          {match.unreadCount && match.unreadCount > 0 ? (
                            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] min-w-[20px] h-[20px] flex items-center justify-center rounded-full">
                              {match.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ),
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
