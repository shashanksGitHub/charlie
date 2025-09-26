import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./use-auth";
import { Message } from "@shared/schema";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSetObject,
  safeStorageGetObject,
} from "@/lib/storage-utils";
import { handleCacheInvalidation } from "@/lib/cache-invalidation";

// Extend the Window interface to include our global WebSocket
declare global {
  interface Window {
    chatSocket?: WebSocket;
  }
}

// Type for user presence status
export interface UserPresenceStatus {
  status: "online" | "offline";
  lastSeen: string | null; // ISO timestamp for last seen
  inChatMatch?: number | null; // Match ID if user is in active chat
  lastUpdateTimestamp?: number; // Timestamp for when the status was last updated (for conflict resolution)
  lastChatUpdateTimestamp?: number; // Timestamp for when the chat status was last updated
}

type WebSocketContextType = {
  sendMessage: (
    matchId: number,
    receiverId: number,
    content: string,
  ) => boolean;
  updateTypingStatus: (matchId: number, isTyping: boolean) => void;
  markMessageAsRead: (messageId: number) => void;
  setActiveChatStatus: (matchId: number, active: boolean) => void; // Add active chat status
  resetConnection: () => void; // Function to manually reset the connection
  isConnected: boolean;
  isTyping: Map<number, boolean>; // Map of matchId to typing status
  onlineUsers: Set<number>; // Set of online user IDs
  userPresence: Map<number, UserPresenceStatus>; // Map of userId to presence status
  activeChats: Map<number, Set<number>>; // Map of userId to active chat matches
  readReceipts: Map<number, Date>; // Map of messageId to read timestamp
  getUserPresence: (userId: number) => UserPresenceStatus | null; // Helper to get user presence
  isUserInChat: (userId: number, matchId: number) => boolean; // Helper to check if a user is in chat
};

export const WebSocketContext = createContext<WebSocketContextType | null>(
  null,
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<Map<number, boolean>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [userPresence, setUserPresence] = useState<
    Map<number, UserPresenceStatus>
  >(new Map());
  const [activeChats, setActiveChats] = useState<Map<number, Set<number>>>(
    new Map(),
  );
  const [readReceipts, setReadReceipts] = useState<Map<number, Date>>(
    new Map(),
  );

  // Use a ref to persist the WebSocket connection
  const socketRef = useRef<WebSocket | null>(null);

  // Add a reconnection attempt counter
  const reconnectAttemptRef = useRef(0);

  // Handler for new messages
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Enhanced privacy checks for message handling
      if (!user || !message) return;

      // SECURITY CHECK: Ensure message is actually intended for this user
      const isMessageRecipient = message.receiverId === user.id;
      const isMessageSender = message.senderId === user.id;

      // Only process messages where the current user is either the sender or intended recipient
      if (!isMessageRecipient && !isMessageSender) {
        console.error(
          `[PRIVACY ERROR] Received unauthorized message with ID ${message.id} for match ${message.matchId}`,
        );
        return;
      }

      // CRITICAL FIX: Update query cache with the new message to show it in real-time
      console.log(
        `[REAL-TIME] Updating message cache for matchId=${message.matchId} with new message ID ${message.id}`,
      );

      // Get current messages from cache
      const currentMessages =
        queryClient.getQueryData<Message[]>([
          "/api/messages",
          message.matchId,
        ]) || [];

      // Check if this message already exists in the cache (prevent duplicates)
      const messageExists = currentMessages.some((m) => m.id === message.id);

      if (!messageExists) {
        // Add the new message to the cache
        const updatedMessages = [...currentMessages, message];

        // Update the cache to trigger UI refresh
        queryClient.setQueryData(
          ["/api/messages", message.matchId],
          updatedMessages,
        );

        // Store in local storage for persistence
        try {
          const storageKey = `${localStorage.getItem("currentMode") || "MEET"}_messages_${message.matchId}`;
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              messages: updatedMessages,
              timestamp: Date.now(),
            }),
          );
        } catch (e) {
          console.error(
            "[STORAGE ERROR] Failed to update local message cache:",
            e,
          );
        }

        // Notify only when user is the recipient (not the sender)
        if (isMessageRecipient) {
          // Show a toast for incoming messages, but exclude KWAME AI messages (matchId: -1)
          if (message.matchId !== -1) {
            toast({
              title: "New Message",
              description: "You have received a new message.",
            });
          }
        }
      }
    },
    [user, toast, queryClient],
  );

  // Handler for new likes/matches with enhanced data for immediate UI updates
  const handleNewLike = useCallback(
    (data: any) => {
      if (!user) return;

      const { match, fromUserId, fromUserInfo, counts, isMatch } = data;

      // Ensure this like is intended for this user
      const isLikeRecipient =
        match.userId1 === user.id || match.userId2 === user.id;
      if (!isLikeRecipient) {
        console.error(
          `[PRIVACY ERROR] Received unauthorized like notification for match ${match.id}`,
        );
        return;
      }

      // CRITICAL FIX: Ensure fromUserInfo is not the current user
      if (fromUserInfo && fromUserInfo.id === user.id) {
        console.error(
          `[MATCH ERROR] Received match notification where fromUserInfo is the current user - ignoring`,
        );
        return;
      }

      // Only notify when the current user is the recipient, not the sender
      if (
        (match.userId1 === user.id && match.userId2 === fromUserId) ||
        (match.userId2 === user.id && match.userId1 === fromUserId)
      ) {
        console.log(
          "⚡ Real-time like notification received via WebSocket:",
          data,
        );

        // Try to get the name of the user who liked/matched
        const fromUserName = fromUserInfo?.fullName || "Someone";

        // Show a toast for new likes with a more attractive design
        toast({
          title: match.matched ? "🎉 New Match!" : "💗 New Like",
          description: match.matched
            ? `You matched with ${fromUserName}! Start chatting now.`
            : `${fromUserName} has liked your profile!`,
          variant: match.matched ? "default" : "default",
        });

        // IMPROVED: Consolidated data refresh approach to prevent duplicate API calls
        if (counts) {
          // If we have counts directly from the server, use them without making API calls
          console.log(
            "Using server-provided count data for immediate UI update:",
            counts,
          );

          // Dispatch a custom event with the updated counts from the server
          window.dispatchEvent(
            new CustomEvent("match:countsUpdated", {
              detail: {
                confirmed: counts.confirmed,
                pending: counts.pending,
                total: counts.total || counts.pending,
              },
            }),
          );

          // Set the count data directly in the query cache to avoid a refetch
          queryClient.setQueryData(["/api/matches/counts"], counts);
        } else {
          // If no counts provided, invalidate the query once (this will trigger a single refetch)
          queryClient.invalidateQueries({
            queryKey: ["/api/matches/counts"],
            refetchType: "active", // Only refetch if the query is already active
          });
        }

        // Single invalidation for matches data with proper cache control
        queryClient.invalidateQueries({
          queryKey: ["/api/matches"],
          refetchType: "active", // Only refetch if the query is already active
        });

        // Update timestamp for the new like in localStorage (for cross-tab communication)
        localStorage.setItem("newLike", Date.now().toString());
        localStorage.setItem(`like_${match.id}`, "true");

        // GLOBAL MATCH POPUP: Guaranteed match popup activation
        // ALWAYS immediately show the popup for matches, with no complex conditions
        if (match.matched === true) {
          console.log(
            "🔥 GLOBAL MATCH POPUP TRIGGER: Implementing guaranteed match popup display",
            fromUserInfo,
          );

          // CRITICAL: Set priority flags to guarantee popup display
          // Use safe storage utilities to prevent quota errors
          safeStorageSet("pending_match_popup", "true");
          safeStorageSet("force_match_popup", "true");
          safeStorageSet(`current_match_id`, match.id.toString());
          safeStorageSetObject(`matched_user_data`, fromUserInfo);

          // FIXED: Track that this match popup has been shown to prevent duplicate popups
          // Create a set of seen match IDs or initialize from existing data
          const seenMatchesString =
            localStorage.getItem("seen_match_popups") || "[]";
          let seenMatches = [];
          try {
            seenMatches = JSON.parse(seenMatchesString);
          } catch (e) {
            seenMatches = [];
          }

          // Add this match ID to the seen list to prevent duplicate popups
          if (!seenMatches.includes(match.id)) {
            seenMatches.push(match.id);
            safeStorageSetObject("seen_match_popups", seenMatches);
          }

          // Set a match timestamp for debugging
          const currentTime = Date.now();
          safeStorageSet(`match_timestamp`, currentTime.toString());

          // Notify user with a toast - backup mechanism
          toast({
            title: "🎉 New Match!",
            description: `You matched with ${fromUserInfo.fullName}! Start chatting now.`,
            variant: "default",
          });

          // IMPROVED: Single event dispatch instead of multiple redundant ones
          window.dispatchEvent(
            new CustomEvent("match:newMatch", {
              detail: {
                match,
                fromUserId,
                fromUserInfo,
                matchId: match.id,
                timestamp: currentTime,
                forceDisplay: true, // Force flag for global popup
              },
            }),
          );

          // Broadcast to all tabs with storage event
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "force_match_popup",
              newValue: "true",
            }),
          );
        }

        // Also dispatch the general like event for other UI updates
        window.dispatchEvent(
          new CustomEvent("match:newLike", {
            detail: {
              match,
              fromUserId,
              fromUserInfo,
              counts,
              isMatch: match.matched === true,
            },
          }),
        );
      }
    },
    [user, toast, queryClient],
  );

  // Handler for typing status
  const handleTypingStatus = useCallback(
    (matchId: number, userId: number, typing: boolean) => {
      setIsTyping((prevState) => {
        const newState = new Map(prevState);
        newState.set(matchId, typing);
        return newState;
      });
    },
    [],
  );

  // Handler for read receipts
  const handleReadReceipt = useCallback((messageId: number, readAt: Date) => {
    setReadReceipts((prevState) => {
      const newState = new Map(prevState);
      newState.set(messageId, readAt);
      return newState;
    });
  }, []);

  // Handler for user status updates with timestamp-based conflict resolution
  const handleUserStatus = useCallback(
    (data: {
      userId: number;
      status: string;
      lastSeen?: string;
      timestamp: string;
      inChatMatch?: number | null;
      priority?: string;
    }) => {
      const { userId, status, lastSeen, timestamp, inChatMatch, priority } =
        data;
      const updateTimestamp = timestamp
        ? new Date(timestamp).getTime()
        : Date.now();

      console.log(
        `[WebSocket] User status update: userId=${userId}, status=${status}, timestamp=${timestamp}, priority=${priority || "normal"}`,
      );

      // Update the traditional online users set for backward compatibility
      setOnlineUsers((prevState) => {
        const newState = new Set(prevState);
        if (status === "online") {
          newState.add(userId);
        } else {
          newState.delete(userId);
        }
        return newState;
      });

      // Update the enhanced presence information with timestamp checking
      setUserPresence((prevState) => {
        const newState = new Map(prevState);

        // Get current presence or create default
        const currentPresence = newState.get(userId) || {
          status: "offline",
          lastSeen: null,
          inChatMatch: null,
          lastUpdateTimestamp: 0,
        };

        // Skip older updates to prevent race conditions unless this is a high priority update
        if (
          priority !== "high" &&
          currentPresence.lastUpdateTimestamp &&
          currentPresence.lastUpdateTimestamp > updateTimestamp
        ) {
          console.log(
            `[WebSocket] Skipping outdated status update for userId=${userId}`,
          );
          return newState; // Return unchanged if this is an older, non-priority update
        }

        // Keep track of most recent lastSeen timestamp
        const currentLastSeen = currentPresence.lastSeen
          ? new Date(currentPresence.lastSeen).getTime()
          : 0;
        const incomingLastSeen = lastSeen ? new Date(lastSeen).getTime() : 0;

        // Use the most recent lastSeen timestamp
        const mostRecentLastSeen =
          Math.max(currentLastSeen, incomingLastSeen) > 0
            ? new Date(
                Math.max(currentLastSeen, incomingLastSeen),
              ).toISOString()
            : lastSeen || timestamp || new Date().toISOString();

        // Prepare updated presence data
        const updatedPresence: UserPresenceStatus = {
          ...currentPresence,
          status: status === "online" ? "online" : "offline",
          lastUpdateTimestamp: updateTimestamp,
          // Update lastSeen based on status change
          lastSeen:
            status === "offline"
              ? mostRecentLastSeen
              : currentPresence.lastSeen,
        };

        // If inChatMatch is provided in this update, include it
        if (inChatMatch !== undefined) {
          updatedPresence.inChatMatch = inChatMatch;
        }

        // Log enhanced presence information for debugging
        console.log(
          `[PRESENCE] Updated status for user ${userId}: ${status}, lastSeen: ${updatedPresence.lastSeen}`,
        );

        // Set the updated presence
        newState.set(userId, updatedPresence);
        return newState;
      });
    },
    [],
  );

  // Enhanced handler for chat partner active status with conflict resolution
  const handleChatPartnerActive = useCallback(
    (data: {
      userId: number;
      matchId: number;
      active: boolean;
      inChat?: boolean;
      timestamp: string;
    }) => {
      const { userId, matchId, active, inChat, timestamp } = data;
      const updateTimestamp = timestamp
        ? new Date(timestamp).getTime()
        : Date.now();

      console.log(
        `[WebSocket] Chat partner active update: userId=${userId}, matchId=${matchId}, active=${active}, timestamp=${timestamp}`,
      );

      // Update the active chats map
      setActiveChats((prevState) => {
        const newState = new Map(prevState);

        // If this user doesn't have an entry yet, create one
        if (!newState.has(userId)) {
          newState.set(userId, new Set<number>());
        }

        // Update the active chats for this user
        const userChats = newState.get(userId)!;
        if (active) {
          userChats.add(matchId);
        } else {
          userChats.delete(matchId);
        }

        return newState;
      });

      // Update user presence with in-chat status and timestamp-based validation
      setUserPresence((prevState) => {
        const newState = new Map(prevState);

        // Get current presence or create default
        const currentPresence = newState.get(userId) || {
          status: "offline",
          lastSeen: null,
          inChatMatch: null,
          lastUpdateTimestamp: 0,
          lastChatUpdateTimestamp: 0,
        };

        // Check if this update is older than our current chat state
        if (
          currentPresence.lastChatUpdateTimestamp &&
          currentPresence.lastChatUpdateTimestamp > updateTimestamp
        ) {
          console.log(
            `[WebSocket] Skipping outdated chat active update for userId=${userId}, matchId=${matchId}`,
          );
          return newState; // Return unchanged if this is an older update
        }

        // Create updated presence object with the new chat status
        const updatedPresence: UserPresenceStatus = {
          ...currentPresence,
          // If user is active in a chat, set the match ID, otherwise null
          inChatMatch: active ? matchId : null,
          // Update timestamps for conflict resolution
          lastChatUpdateTimestamp: updateTimestamp,
          // If this is our first presence data, assume user is online
          status: currentPresence.status || ("online" as "online"),
        };

        // Set the updated presence
        newState.set(userId, updatedPresence);
        return newState;
      });
    },
    [],
  );

  // Track WebSocket connection status with a ref
  const connectionStatusRef = useRef<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  // Track the WebSocket session ID to prevent duplicate reconnections
  const reconnectSessionRef = useRef<string>(Date.now().toString());

  // Reference to store all timeout IDs for proper cleanup
  const socketTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Only connect if the user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);
      }
      connectionStatusRef.current = "disconnected";
      return;
    }

    // Don't try to connect if user doesn't have an ID yet
    if (!user.id) {
      return;
    }

    // Prevent concurrent connection attempts
    if (connectionStatusRef.current === "connecting") {
      return;
    }

    // Don't try to connect if we already have an active connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Don't log redundant connection attempts
    if (
      reconnectAttemptRef.current === 0 ||
      reconnectAttemptRef.current % 5 === 0
    ) {
      console.log(
        `Connecting WebSocket: user ${user.id} (attempt: ${reconnectAttemptRef.current + 1})`,
      );
    }

    // Mark as connecting to prevent duplicate connection attempts
    connectionStatusRef.current = "connecting";

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/websocket`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Make the WebSocket available globally for other components that need it
      // This is needed for the match popup synchronization
      window.chatSocket = socket;

      // Connection opened
      socket.addEventListener("open", () => {
        if (reconnectAttemptRef.current > 0) {
          console.log("WebSocket reconnected successfully");
        }
        setIsConnected(true);
        reconnectAttemptRef.current = 0; // Reset counter on successful connection
        connectionStatusRef.current = "connected";

        // IMPROVED: Prefetch with smart caching for better performance
        // Prefetch matches data once with stale time and cache time settings
        queryClient.prefetchQuery({
          queryKey: ["/api/matches"],
          staleTime: 5000, // Consider data fresh for 5 seconds
          gcTime: 60000, // Keep in cache for 1 minute
        });

        // Also prefetch match counts once with caching
        queryClient.prefetchQuery({
          queryKey: ["/api/matches/counts"],
          staleTime: 5000,
          gcTime: 60000,
        });

        // Authenticate the WebSocket connection
        socket.send(
          JSON.stringify({
            type: "auth",
            userId: user.id,
          }),
        );

        // Flush any pending messages from websocket-service.ts
        setTimeout(() => {
          if ((window as any).flushPendingMessages) {
            console.log(
              "📡 [use-websocket] Flushing pending messages after authentication",
            );
            (window as any).flushPendingMessages();
          }
        }, 100);
      });

      // Use a single message handler for better performance
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            // ===== Call Signaling - REMOVED DUPLICATE DISPATCHER =====
            // Call events are now handled ONLY by websocket-service.ts to prevent duplicate popups
            case "call_initiate":
            case "call_ringing":
            case "call_cancel":
            case "call_accept":
            case "call_decline":
            case "call_end":
            case "webrtc_offer":
            case "webrtc_answer":
            case "webrtc_ice": {
              console.log("📞 [WebSocketProvider] ⚠️ CALL EVENT RECEIVED - Delegating to websocket-service.ts to prevent duplicate events:", data.type);
              // DO NOT dispatch here - websocket-service.ts handles all call events with proper callType support
              break;
            }
            case "auth_success":
              connectionStatusRef.current = "connected";
              break;

            case "auth_error":
              connectionStatusRef.current = "disconnected";
              setIsConnected(false);
              socket.close();
              break;

            case "match_popup_prepare":
              // CRITICAL FIX: Pre-prepare the client for an upcoming match popup
              console.log(
                "🌟 MATCH POPUP PREPARE: Received pre-notification to prepare for match popup",
                data,
              );

              // Store match user data
              if (data.fromUserInfo) {
                // CRITICAL FIX: Verify fromUserInfo is not the current user (prevent self-matches)
                if (user && data.fromUserInfo.id === user.id) {
                  console.error(
                    `[MATCH ERROR] Received match prepare notification with current user as fromUserInfo - ignoring`,
                  );
                  return;
                }

                safeStorageSetObject("matched_user_data", data.fromUserInfo);
                safeStorageSet("force_match_popup", "true");

                if (data.matchId) {
                  safeStorageSet("current_match_id", data.matchId.toString());
                }

                // Trigger event to ensure immediate popup
                window.dispatchEvent(
                  new CustomEvent("match:newMatch", {
                    detail: {
                      fromUserInfo: data.fromUserInfo,
                      matchId: data.matchId,
                      forceDisplay: true,
                    },
                  }),
                );
              }
              break;

            case "new_message":
              // Process both recipient and sender notifications so both sides update immediately
              {
                const isRecipient = data.for === "recipient";
                const roleTag = isRecipient
                  ? "recipient"
                  : data.for === "sender"
                    ? "sender"
                    : "unknown";

                if (roleTag === "unknown") {
                  console.log(
                    `[REAL-TIME] Ignoring new_message with unknown 'for' tag`,
                    data,
                  );
                  break;
                }

                // Dedupe by receipt (if provided) and by message ID
                const receiptKey =
                  data.receiptId || `message_${data.message?.id}_${roleTag}`;
                const receiptStorageKey = `message_receipt_${receiptKey}`;
                if (receiptKey && sessionStorage.getItem(receiptStorageKey)) {
                  console.log(
                    `[DUPLICATE] Skipping already-processed receipt ${receiptKey}`,
                  );
                  break;
                }
                if (receiptKey)
                  sessionStorage.setItem(
                    receiptStorageKey,
                    Date.now().toString(),
                  );

                const msg = data.message;
                if (!msg || !msg.id) {
                  console.warn(
                    `[REAL-TIME] Malformed new_message payload`,
                    data,
                  );
                  break;
                }

                const messageIDKey = `message_id_${msg.id}`;
                if (sessionStorage.getItem(messageIDKey)) {
                  console.log(
                    `[DUPLICATE] Message ID ${msg.id} already processed, skipping`,
                  );
                  break;
                }
                sessionStorage.setItem(messageIDKey, Date.now().toString());

                console.log(
                  `[REAL-TIME] Processing new message for ${roleTag}: ID=${msg.id}, matchId=${msg.matchId}, type=${msg.messageType}`,
                );

                // Update client cache/state
                handleNewMessage(msg);

                // Broadcast to UI listeners
                window.dispatchEvent(
                  new CustomEvent("message:new", {
                    detail: {
                      message: msg,
                      timestamp: Date.now(),
                      for: roleTag,
                    },
                  }),
                );
              }
              break;

            case "message_sent":
              // This is a confirmation to the sender that their message was sent
              console.log(
                `[REAL-TIME] Message sent confirmation: ID=${data.messageId}, matchId=${data.matchId}`,
              );

              // We don't need to update UI here since the sent message
              // should already be displayed optimistically
              break;

            case "new_like":
              // CRITICAL FIX: Check for guaranteed match popup flags first
              if (
                data.guaranteed_match_popup === true ||
                data.forceDisplay === true ||
                (data.isMatch === true && data.priority === "critical")
              ) {
                console.log(
                  "🌟 GUARANTEED MATCH POPUP: Received message with guaranteed popup flag",
                  data,
                );

                // First trigger toast notification
                toast({
                  title: "🎉 New Match!",
                  description: data.fromUserInfo
                    ? `You matched with ${data.fromUserInfo.fullName}! Start chatting now.`
                    : "You have a new match! Start chatting now.",
                  variant: "default",
                });

                // Then immediately create "It's a Match" popup with highest priority
                if (data.fromUserInfo) {
                  // CRITICAL FIX: Verify fromUserInfo is not the current user (prevent self-matches)
                  if (user && data.fromUserInfo.id === user.id) {
                    console.error(
                      `[MATCH ERROR] Received new_like notification with current user as fromUserInfo - ignoring`,
                    );
                    return;
                  }

                  // Store data for the global popup component
                  safeStorageSetObject("matched_user_data", data.fromUserInfo);
                  safeStorageSet("force_match_popup", "true");

                  // Also store the match ID if available
                  if (data.match && data.match.id) {
                    safeStorageSet(
                      "current_match_id",
                      data.match.id.toString(),
                    );
                  }

                  // Trigger the event immediately
                  window.dispatchEvent(
                    new CustomEvent("match:newMatch", {
                      detail: {
                        fromUserInfo: data.fromUserInfo,
                        matchId: data.match?.id,
                        forceDisplay: true,
                      },
                    }),
                  );

                  // Also dispatch storage event for cross-tab communication
                  window.dispatchEvent(
                    new StorageEvent("storage", {
                      key: "force_match_popup",
                      newValue: "true",
                    }),
                  );

                  // Schedule additional trigger events with delays for redundancy
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent("match:newMatch", {
                        detail: {
                          fromUserInfo: data.fromUserInfo,
                          matchId: data.match?.id,
                          forceDisplay: true,
                        },
                      }),
                    );
                  }, 300);
                }
              }

              // Then handle normal like processing
              handleNewLike(data);
              break;

            case "typing_status":
              handleTypingStatus(data.matchId, data.userId, data.isTyping);
              break;

            case "read_receipt":
              handleReadReceipt(data.messageId, new Date(data.readAt));
              break;

            case "user_status":
              handleUserStatus(data);
              break;

            case "chat_partner_active":
              handleChatPartnerActive(data);
              break;

            case "chat_clear_user":
              // New message type to handle a user that has completely disconnected
              console.log(
                `[WebSocket] Received chat_clear_user for userId=${data.userId}`,
              );

              // Force clear any presence state for this user with high priority
              const clearStatus = {
                userId: data.userId,
                status: "offline" as "offline",
                lastSeen: data.timestamp || new Date().toISOString(),
                inChatMatch: null,
                timestamp: data.timestamp || new Date().toISOString(),
                priority: "highest", // Special highest priority to override anything else
              };

              handleUserStatus(clearStatus);

              // Also remove any active chats for this user
              setActiveChats((prevState) => {
                const newState = new Map(prevState);
                newState.delete(data.userId);
                return newState;
              });

              // And clear typing state
              setIsTyping((prevState) => {
                const newState = new Map(prevState);
                // Find any matches where this user might be typing
                // This is a bit inefficient but we don't have a direct user->match mapping
                newState.forEach((_, matchId) => {
                  // For any active typing in matches, check if this user is part of it
                  // If they are, we'll update the state in the useEffect below
                  // This is just a placeholder to prevent race conditions
                });
                return newState;
              });
              break;

            case "user_disconnected":
              // Enhanced and more reliable user disconnect event handling
              console.log(
                `[WebSocket] Received user_disconnected event for userId=${data.userId}, timestamp=${data.timestamp}`,
              );

              // Force update user status to offline with high priority to override any conflicts
              const offlineStatus = {
                userId: data.userId,
                status: "offline" as "offline", // Type assertion to fix TypeScript error
                lastSeen: data.timestamp || new Date().toISOString(),
                inChatMatch: null, // Clear any active chat
                timestamp: data.timestamp || new Date().toISOString(),
                priority: "high", // Mark as high priority to override any race conditions
              };

              // Log detailed disconnect information to help debug presence issues
              console.log(
                `[PRESENCE] User ${data.userId} disconnected at ${data.timestamp}`,
              );

              // Update our presence maps with the disconnect info
              handleUserStatus(offlineStatus);

              // Also remove any active chats for this user
              setActiveChats((prevState) => {
                const newState = new Map(prevState);
                newState.delete(data.userId);
                return newState;
              });
              break;

            case "chat_created":
              // Handle chat tab creation notification
              console.log(
                `[WebSocket] Received chat_created event for matchId=${data.matchId}, userId=${data.userId}, isDirectMessage=${data.isDirectMessage}`,
              );

              // CRITICAL FIX: Skip match notifications for direct messages
              if (data.isDirectMessage) {
                console.log(
                  "[WebSocket] Skipping match notification - this was a direct message",
                );

                // Still invalidate matches to update chat list, but don't trigger match popup
                queryClient.invalidateQueries({
                  queryKey: ["/api/matches"],
                  refetchType: "active",
                  exact: false,
                });

                // Dispatch chat created event without match notification
                window.dispatchEvent(
                  new CustomEvent("chat:created", {
                    detail: {
                      matchId: data.matchId,
                      userId: data.userId,
                      isDirectMessage: true,
                      timestamp: data.timestamp || new Date().toISOString(),
                    },
                  }),
                );
                break;
              }

              // IMPROVED: Single data refresh with proper caching
              // Invalidate matches only if the query is already active
              queryClient.invalidateQueries({
                queryKey: ["/api/matches"],
                refetchType: "active", // Only refetch if already active
                exact: false, // Include related queries
              });

              // Dispatch an event that components can listen for
              window.dispatchEvent(
                new CustomEvent("chat:created", {
                  detail: {
                    matchId: data.matchId,
                    userId: data.userId,
                    timestamp: data.timestamp || new Date().toISOString(),
                  },
                }),
              );

              // Show a toast notification for the new chat
              toast({
                title: "New Chat Created",
                description: "A new chat has been created for you.",
                variant: "default",
              });
              break;

            case "cache:invalidate":
              // Handle cache invalidation events from the server
              console.log(
                `[WebSocket] Received cache invalidation event for match ${data.matchId}, reason: ${data.reason}`,
              );

              try {
                const invalidationResult = handleCacheInvalidation(
                  queryClient,
                  data,
                );

                if (invalidationResult.success) {
                  console.log(
                    `[CACHE-INVALIDATION] Successfully processed cache invalidation for match ${data.matchId}`,
                  );
                } else {
                  console.error(
                    `[CACHE-INVALIDATION] Cache invalidation failed for match ${data.matchId}:`,
                    invalidationResult.error,
                  );
                }

                // Dispatch event for other components that might need to respond
                window.dispatchEvent(
                  new CustomEvent("cache:invalidated", {
                    detail: {
                      matchId: data.matchId,
                      messageId: data.messageId,
                      reason: data.reason,
                      success: invalidationResult.success,
                      timestamp: data.timestamp,
                    },
                  }),
                );
              } catch (error) {
                console.error(
                  `[CACHE-INVALIDATION] Error handling cache invalidation event:`,
                  error,
                );
              }
              break;

            // CRITICAL FIX: Handle SUITE match notifications
            case "networking_match":
            case "mentorship_match":
            case "job_match":
              console.log("[WebSocketProvider] SUITE MATCH received:", data);

              // Dispatch to SUITE Match Dialog system
              window.dispatchEvent(
                new CustomEvent("websocket-message", {
                  detail: data,
                }),
              );
              break;
          }
        } catch (error) {
          // Silent error handling for better performance
        }
      });

      // Get the current session ID to detect if reconnections should proceed
      const currentReconnectSession = reconnectSessionRef.current;

      // Connection closed
      socket.addEventListener("close", () => {
        if (connectionStatusRef.current === "connected") {
          console.log("WebSocket disconnected");
        }

        setIsConnected(false);
        connectionStatusRef.current = "disconnected";

        // Also clear the global reference if it's this socket
        if (window.chatSocket === socket) {
          window.chatSocket = undefined;
        }

        // Hard limit on reconnection attempts (196 is way too many!)
        if (reconnectAttemptRef.current >= 5) {
          console.log(
            "Maximum reconnection attempts reached. Waiting for user interaction.",
          );
          return;
        }

        // Increment the reconnection counter
        reconnectAttemptRef.current += 1;

        // Use fixed backoff times to avoid calculation overhead
        const backoffTimes = [2000, 5000, 10000, 20000, 30000];
        const backoffDelay =
          backoffTimes[
            Math.min(reconnectAttemptRef.current - 1, backoffTimes.length - 1)
          ];

        // Attempt to reconnect after the backoff delay, but only if this is still the active session
        const timeoutId = setTimeout(() => {
          // Only reconnect if this is still the active session and the page is visible
          if (
            user &&
            document.visibilityState !== "hidden" &&
            reconnectSessionRef.current === currentReconnectSession
          ) {
            connectWebSocket();
          }
        }, backoffDelay);

        // Store timeout ID for cleanup in the component unmount
        const timeoutKey = `reconnect_${Date.now()}`;
        socketTimeoutsRef.current[timeoutKey] = timeoutId;
      });

      // Connection error - minimal handler
      socket.addEventListener("error", () => {
        connectionStatusRef.current = "disconnected";

        // Clear global reference on error
        if (window.chatSocket === socket) {
          window.chatSocket = undefined;
        }

        // Close the socket
        socket.close();
      });
    } catch (error) {
      connectionStatusRef.current = "disconnected";
    }
  }, [
    user,
    handleNewMessage,
    handleNewLike,
    handleTypingStatus,
    handleReadReceipt,
    handleUserStatus,
    handleChatPartnerActive,
  ]);

  // Add visibility change listener to reconnect when tab becomes visible again
  useEffect(() => {
    // Reconnect when the page becomes visible again
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
      ) {
        connectWebSocket();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connectWebSocket, user]);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      // Close socket connection if it exists
      if (socketRef.current) {
        socketRef.current.close();

        // Also clear the global reference
        if (window.chatSocket === socketRef.current) {
          window.chatSocket = undefined;
        }
      }

      // Clear all stored timeouts
      Object.values(socketTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      // Reset session to prevent reconnections from other components
      reconnectSessionRef.current = Date.now().toString();
    };
  }, [connectWebSocket]);

  // Function to send a new message
  const sendMessage = useCallback(
    (matchId: number, receiverId: number, content: string) => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        // Instead of showing a toast (which can be annoying), we'll return false
        // to indicate the message couldn't be sent
        // The UI already shows a connection status banner
        return false;
      }

      socketRef.current.send(
        JSON.stringify({
          type: "message",
          matchId,
          receiverId,
          content,
        }),
      );

      return true; // Message was sent successfully
    },
    [],
  );

  // Store typing timeouts to avoid sending too many updates
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Function to update typing status with debouncing to prevent flooding
  const updateTypingStatus = useCallback(
    (matchId: number, isTyping: boolean) => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const timeoutKey = `typing_${matchId}`;

      // Clear any existing timeout for this match
      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      }

      // If starting to type, send immediately
      if (isTyping) {
        socketRef.current.send(
          JSON.stringify({
            type: "typing_status",
            matchId,
            isTyping: true,
          }),
        );

        // Set a refresher timeout to keep typing status active
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          // Clear from timeouts map
          delete typingTimeoutsRef.current[timeoutKey];
        }, 4000); // Refresh typing status every 4 seconds while actively typing
      } else {
        // If stopping typing, delay slightly to prevent flickering during short pauses
        typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(
              JSON.stringify({
                type: "typing_status",
                matchId,
                isTyping: false,
              }),
            );
          }
          // Clear from timeouts map
          delete typingTimeoutsRef.current[timeoutKey];
        }, 800);
      }
    },
    [],
  );

  // Function to mark a message as read
  const markMessageAsRead = useCallback((messageId: number) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message_read",
        messageId,
      }),
    );
  }, []);

  // Store active chat debounce timeouts
  const activeChatTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastActiveChatStateRef = useRef<Record<string, boolean>>({});

  // Function to update active chat status with debouncing
  const setActiveChatStatus = useCallback(
    (matchId: number, active: boolean) => {
      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const timeoutKey = `active_chat_${matchId}`;
      const stateKey = `${matchId}`;

      // Check if we're updating to the same state to avoid duplicate updates
      if (lastActiveChatStateRef.current[stateKey] === active) {
        return; // Skip sending duplicate state updates
      }

      // Update the stored state
      lastActiveChatStateRef.current[stateKey] = active;

      // Clear any existing timeout for this match
      if (activeChatTimeoutsRef.current[timeoutKey]) {
        clearTimeout(activeChatTimeoutsRef.current[timeoutKey]);
      }

      // Debounce the update to avoid flooding with updates during rapid navigation
      activeChatTimeoutsRef.current[timeoutKey] = setTimeout(
        () => {
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(
              JSON.stringify({
                type: "active_chat",
                matchId,
                active,
              }),
            );

            console.log(
              `[WebSocket] Sent active chat status: matchId=${matchId}, active=${active}`,
            );
          }

          // Clean up the timeout reference
          delete activeChatTimeoutsRef.current[timeoutKey];
        },
        active ? 300 : 500,
      ); // Faster response for activation, slightly longer for deactivation
    },
    [],
  );

  // Function to manually reset connection (useful after errors or long idle periods)
  const resetConnection = useCallback(() => {
    // Close current socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Reset reconnect counter
    reconnectAttemptRef.current = 0;

    // Generate new session ID
    reconnectSessionRef.current = Date.now().toString();

    // Clear state
    setIsTyping(new Map());
    setOnlineUsers(new Set());
    setActiveChats(new Map());

    // Reconnect
    connectWebSocket();
  }, [connectWebSocket]);

  // Helper function to get user presence
  const getUserPresence = useCallback(
    (userId: number): UserPresenceStatus | null => {
      return userPresence.get(userId) || null;
    },
    [userPresence],
  );

  // Helper function to check if a user is in a specific chat
  const isUserInChat = useCallback(
    (userId: number, matchId: number): boolean => {
      const presence = userPresence.get(userId);
      if (!presence) return false;

      return presence.inChatMatch === matchId;
    },
    [userPresence],
  );

  // The context value that will be provided
  const contextValue = {
    sendMessage,
    updateTypingStatus,
    markMessageAsRead,
    setActiveChatStatus,
    resetConnection,
    isConnected,
    isTyping,
    onlineUsers,
    userPresence,
    activeChats,
    readReceipts,
    getUserPresence,
    isUserInChat,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
