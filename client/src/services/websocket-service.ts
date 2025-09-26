/**
 * WebSocket Service
 *
 * This service provides a centralized way to manage WebSocket connections and message handling
 * throughout the application.
 *
 * Features:
 * - Automatic reconnection with configurable backoff strategy
 * - Global connection status tracking
 * - Type-safe message handling
 * - Health checking and connection monitoring
 * - Simple API for sending messages
 * - Event-based communication with components
 * - OPTIMIZED: Faster message processing with memory-first deduplication
 * - OPTIMIZED: Reduced ping interval for more responsive connection
 */

import { Message } from "@shared/schema";
import {
  WebSocketMessage,
  AllWebSocketMessages,
  ChatMessage,
  NewMessage,
  MessageSentConfirmation,
  MessageReadNotification,
  MatchNotificationMessage,
  ActiveChatMessage,
  MatchPopupClosedMessage,
  ReadReceiptMessage,
  SwipeActionMessage,
  TypingStatusMessage,
  UserStatusMessage,
  PingMessage,
  PongMessage,
  UnmatchNotificationMessage,
  NetworkingProfileUpdateMessage,
  CallInitiateMessage,
  CallRingingMessage,
  CallCancelMessage,
  CallAcceptMessage,
  CallDeclineMessage,
  CallEndMessage,
  WebRTCOfferMessage,
  WebRTCAnswerMessage,
  WebRTCIceCandidateMessage,
} from "@/types/websocket";
import {
  unifiedDeduplication,
  isMessageProcessed,
  isMessageDuplicate,
  markMessageProcessed,
} from "./unified-deduplication";

// Add TypeScript declarations for global window properties at the top of the file
declare global {
  interface Window {
    chatSocket?: WebSocket;
    socketConnectionStatus?: string;
    socketLastConnectAttempt?: number;
    socketReconnectAttempts?: number;
    socketReconnectSession?: string;
    reconnectWebSocket?: () => void;
    checkSocketHealth?: () => boolean;
    __processedMessageIds?: Set<number>;
    __messageProcessingTimes?: Record<string, number>;
    queryClient?: any;
    __appMode?: string;
  }
}

// WebSocket connection states
export enum ConnectionState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

// Connection configuration
interface ConnectionConfig {
  maxReconnectAttempts: number; // Maximum reconnection attempts
  baseReconnectDelay: number; // Base delay between reconnection attempts (ms)
  maxReconnectDelay: number; // Maximum delay between reconnection attempts (ms)
  defaultPath: string; // Default WebSocket path
  pingInterval: number; // How often to ping the server (ms)
  debug: boolean; // Enable debug logging
}

// Default configuration optimized for performance and battery life
const DEFAULT_CONFIG: ConnectionConfig = {
  maxReconnectAttempts: 10, // Reduced from 20 to avoid excessive retry overhead
  baseReconnectDelay: 2000, // Increased from 500ms for better connection stability
  maxReconnectDelay: 15000, // Optimized maximum backoff time
  defaultPath: "/ws",
  pingInterval: 45000, // Optimized from 25s to 45s to reduce network overhead and battery usage
  debug: true,
};

// Current configuration
let config = { ...DEFAULT_CONFIG };

// Connection state tracking
let connectionState: ConnectionState = ConnectionState.DISCONNECTED;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let reconnectSession = Date.now().toString();
// Outbox for messages attempted while socket is not OPEN
const pendingOutbox: WebSocketMessage[] = [];

/**
 * Initialize the WebSocket service with custom configuration
 * This sets up the WebSocket connection and the message deduplication system
 */
export function initWebSocketService(
  customConfig?: Partial<ConnectionConfig>,
): void {
  // Merge default config with custom config
  config = { ...DEFAULT_CONFIG, ...customConfig };

  // Log initialization
  console.log(
    "[WebSocketService] Initializing service for message queuing (connection managed by use-websocket.tsx)",
  );
  if (config.debug) {
    console.log("[WebSocketService] Config:", config);
  }

  // Unified message deduplication is initialized on import; nothing to do here
  console.log("[WebSocketService] Unified deduplication active");

  // Set up global functions for authenticated connection
  window.reconnectWebSocket = reconnectWebSocket;
  window.checkSocketHealth = checkSocketHealth;
  window.socketReconnectSession = reconnectSession;

  // Set up flush function for when authenticated connection becomes available
  (window as any).flushPendingMessages = () => {
    if (
      window.chatSocket &&
      window.chatSocket.readyState === WebSocket.OPEN &&
      pendingOutbox.length > 0
    ) {
      console.log(
        `📡 [WebSocketService] Flushing ${pendingOutbox.length} pending messages via authenticated connection`,
      );
      handleSocketOpen({} as Event);
    }
  };

  // DEBUG: Add test function to window for manual testing
  (window as any).testVideoCallMessage = () => {
    console.log("🧪 [DEBUG] Testing video call message send...");
    const testMessage = {
      type: "call_initiate",
      matchId: 25,
      callerId: 3,
      receiverId: 4,
      toUserId: 4,
      callId: 999,
      roomName: "test-room",
    };
    const result = sendWebSocketMessage(testMessage);
    console.log("🧪 [DEBUG] Test result:", result);
    return result;
  };

  // DEBUG: Add function to check WebSocket connection status
  (window as any).checkWebSocketStatus = () => {
    const status = {
      exists: !!window.chatSocket,
      readyState: window.chatSocket?.readyState,
      readyStateText: window.chatSocket?.readyState === 0 ? 'CONNECTING' : 
                     window.chatSocket?.readyState === 1 ? 'OPEN' : 
                     window.chatSocket?.readyState === 2 ? 'CLOSING' : 
                     window.chatSocket?.readyState === 3 ? 'CLOSED' : 'UNKNOWN',
      connectionStatus: window.socketConnectionStatus,
      lastConnectAttempt: window.socketLastConnectAttempt,
      reconnectAttempts: window.socketReconnectAttempts
    };
    console.log("🔍 [DEBUG] WebSocket Status:", status);
    return status;
  };

  // Initialize memory cache for faster message processing
  if (!window.__processedMessageIds) {
    window.__processedMessageIds = new Set<number>();
  }

  // Initialize performance tracking
  if (!window.__messageProcessingTimes) {
    window.__messageProcessingTimes = {};
  }

  // Don't start connection - use-websocket.tsx handles this
  console.log(
    "[WebSocketService] Connection management delegated to use-websocket.tsx",
  );
}

/**
 * Connect to the WebSocket server
 */
export function connectWebSocket(): void {
  console.warn(
    "[WebSocketService] connectWebSocket() is deprecated - connection managed by use-websocket.tsx",
  );
  console.log("[WebSocketService] Current authenticated connection state:", {
    exists: !!window.chatSocket,
    readyState: window.chatSocket?.readyState,
    isOpen: window.chatSocket?.readyState === WebSocket.OPEN,
  });

  // Don't create duplicate connections - let use-websocket.tsx handle it
  if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
    console.log(
      "[WebSocketService] Authenticated WebSocket connection already exists and is open",
    );
  } else {
    console.log(
      "[WebSocketService] No authenticated WebSocket connection available",
    );
    console.log(
      "[WebSocketService] Connection should be managed by use-websocket.tsx hook",
    );
  }
}

/**
 * Handle successful WebSocket connection
 */
function handleSocketOpen(event: Event): void {
  connectionState = ConnectionState.CONNECTED;
  window.socketConnectionStatus = "connected";
  reconnectAttempts = 0; // Reset reconnect attempts

  if (config.debug) {
    console.log("[WebSocketService] Connection established");
  }

  // Dispatch global connection event
  window.dispatchEvent(new CustomEvent("websocket:connected"));

  // Start ping interval to keep connection alive
  startPingInterval();

  // Flush any queued signaling/messages
  try {
    if (pendingOutbox.length > 0) {
      if (config.debug)
        console.log(
          `[WebSocketService] Flushing ${pendingOutbox.length} queued messages`,
        );
      // Send in FIFO order
      while (
        pendingOutbox.length > 0 &&
        window.chatSocket &&
        window.chatSocket.readyState === WebSocket.OPEN
      ) {
        const msg = pendingOutbox.shift()!;
        try {
          window.chatSocket.send(
            JSON.stringify({
              ...msg,
              timestamp: (msg as any).timestamp || new Date().toISOString(),
              clientSentTime: Date.now(),
              clientId: reconnectSession,
            }),
          );
        } catch (e) {
          console.warn(
            "[WebSocketService] Failed sending queued message, requeueing",
            e,
          );
          pendingOutbox.unshift(msg);
          break;
        }
      }
    }
  } catch (e) {
    console.error("[WebSocketService] Error flushing outbox:", e);
  }

  // Check localStorage for any stored read receipts and reapply them
  restoreReadReceiptsFromStorage();
}

/**
 * Restore read receipts from localStorage when reconnecting
 * This ensures that UI components will show correct read status after a disconnect/reconnect
 */
function restoreReadReceiptsFromStorage(): void {
  try {
    console.log("[WebSocketService] Checking for stored read receipts");

    // Get all localStorage keys
    const keys = Object.keys(localStorage);

    // Filter for read receipt keys
    const readReceiptKeys = keys.filter((key) =>
      key.startsWith("read_receipts_match_"),
    );

    if (readReceiptKeys.length === 0) {
      console.log("[WebSocketService] No stored read receipts found");
      return;
    }

    console.log(
      `[WebSocketService] Found ${readReceiptKeys.length} stored read receipt collections`,
    );

    // Process each stored match read receipts
    readReceiptKeys.forEach((key) => {
      try {
        const matchId = parseInt(key.replace("read_receipts_match_", ""));
        if (isNaN(matchId)) return;

        const storedData = localStorage.getItem(key);
        if (!storedData) return;

        const readReceipts = JSON.parse(storedData);
        if (!Array.isArray(readReceipts) || readReceipts.length === 0) return;

        console.log(
          `[WebSocketService] Restoring ${readReceipts.length} read receipts for match ${matchId}`,
        );

        // Group message IDs by user
        const messagesByUser: { [userId: string]: number[] } = {};

        readReceipts.forEach((receipt) => {
          const userId = receipt.userId;
          if (!messagesByUser[userId]) {
            messagesByUser[userId] = [];
          }
          messagesByUser[userId].push(receipt.messageId);
        });

        // Process each user's read receipts
        Object.entries(messagesByUser).forEach(([userId, messageIds]) => {
          // Dispatch events to update UI
          window.dispatchEvent(
            new CustomEvent("message:status:updated", {
              detail: {
                matchId,
                messageIds,
                status: "read",
                timestamp: new Date().toISOString(),
                userId: parseInt(userId),
                processed: Date.now(),
                restored: true,
              },
            }),
          );

          // Also dispatch match-specific event
          window.dispatchEvent(
            new CustomEvent(`message:read:${matchId}`, {
              detail: {
                messageIds,
                userId: parseInt(userId),
                timestamp: new Date().toISOString(),
                restored: true,
              },
            }),
          );
        });

        // Also dispatch the global event
        window.dispatchEvent(
          new CustomEvent("message:read:global", {
            detail: {
              matchId,
              messageIds: readReceipts.map((r) => r.messageId),
              timestamp: new Date().toISOString(),
              restored: true,
            },
          }),
        );
      } catch (e) {
        console.error(
          `[WebSocketService] Error restoring read receipts for key ${key}:`,
          e,
        );
      }
    });
  } catch (e) {
    console.error("[WebSocketService] Error restoring read receipts:", e);
  }
}

/**
 * Start ping interval to keep connection alive
 */
function startPingInterval(): void {
  // Clear any existing ping interval
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  // Send periodic pings to keep connection alive
  pingInterval = setInterval(() => {
    if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
      try {
        window.chatSocket.send(
          JSON.stringify({ type: "ping", timestamp: Date.now() }),
        );
        if (config.debug) console.log("[WebSocketService] Ping sent");
      } catch (error) {
        console.error("[WebSocketService] Error sending ping:", error);
      }
    } else {
      // Connection lost, try to reconnect
      if (config.debug)
        console.log(
          "[WebSocketService] Connection lost, attempting to reconnect",
        );
      connectWebSocket();
    }
  }, config.pingInterval);
}

/**
 * Handle WebSocket message with enhanced deduplication
 *
 * This improved handler fully integrates with the message-deduplication.ts module
 * to prevent duplicate message processing across page refreshes and reconnections.
 */
function handleSocketMessage(event: MessageEvent): void {
  let data: any; // Start with any type for parsing

  try {
    data = JSON.parse(event.data);

    // Handle server pong responses
    if (data.type === "pong") {
      if (config.debug) console.log("[WebSocketService] Pong received");
      return;
    }

    // Handle message read status updates
    if (data.type === "message_read") {
      // Cast to proper type to enforce type safety
      const messageReadData = data as MessageReadNotification;
      console.log(
        "[WebSocketService] Message read notification received:",
        messageReadData,
      );

      // Store read receipt in local storage for persistence across page refreshes
      try {
        // Create a storage key for this match's read receipts
        const storageKey = `read_receipts_match_${messageReadData.matchId}`;

        // Get existing read receipts or initialize new array
        let existingReadReceipts = [];
        try {
          const storedData = localStorage.getItem(storageKey);
          if (storedData) {
            existingReadReceipts = JSON.parse(storedData);
          }
        } catch (e) {
          console.warn("Failed to parse stored read receipts, starting fresh");
        }

        // Add new read receipt entries
        const updatedReadReceipts = [
          ...existingReadReceipts,
          ...messageReadData.messageIds.map((id) => ({
            messageId: id,
            userId: messageReadData.userId,
            timestamp: messageReadData.timestamp || new Date().toISOString(),
          })),
        ];

        // Store updated read receipts
        localStorage.setItem(storageKey, JSON.stringify(updatedReadReceipts));
        console.log(
          `[WebSocketService] Persisted read receipts for match ${messageReadData.matchId} to localStorage`,
        );
      } catch (e) {
        console.warn("Failed to persist read receipts to localStorage:", e);
      }

      // Dispatch event for message read receipt with enhanced data
      window.dispatchEvent(
        new CustomEvent("message:status:updated", {
          detail: {
            matchId: messageReadData.matchId,
            messageIds: messageReadData.messageIds,
            status: "read",
            timestamp: messageReadData.timestamp || new Date().toISOString(),
            userId: messageReadData.userId, // Who read the message
            processed: Date.now(), // Add timestamp for debugging/timing
          },
        }),
      );

      // Also dispatch specific event for real-time chat components
      window.dispatchEvent(
        new CustomEvent(`message:read:${messageReadData.matchId}`, {
          detail: {
            messageIds: messageReadData.messageIds,
            userId: messageReadData.userId,
            timestamp: messageReadData.timestamp,
          },
        }),
      );

      // Force a global refresh event to ensure all components update
      window.dispatchEvent(
        new CustomEvent("message:read:global", {
          detail: {
            matchId: messageReadData.matchId,
            messageIds: messageReadData.messageIds,
            timestamp: messageReadData.timestamp || new Date().toISOString(),
          },
        }),
      );

      // Invalidate matches to update UI
      if (window.queryClient) {
        try {
          // Invalidate both matches and messages queries to ensure all UI components update
          window.queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

          // Also invalidate the messages query for this specific match
          window.queryClient.invalidateQueries({
            queryKey: ["/api/messages", messageReadData.matchId],
            // Don't refetch immediately as we already have the update via WebSocket
            refetchType: "none",
          });

          console.log(
            "[WebSocketService] Invalidated relevant caches to update message statuses",
          );
        } catch (err) {
          console.error(
            "Error invalidating caches for message read status:",
            err,
          );
        }
      }

      return;
    }

    // For match popup messages
    if (data.type === "match_popup_closed") {
      // Dispatch event for components
      window.dispatchEvent(
        new CustomEvent("match:popup:closed", {
          detail: {
            matchId: data.matchId,
            sendMessage: data.sendMessage || false,
            userId: data.userId,
            closedBy: data.closedBy,
          },
        }),
      );
    }

    // Handle SUITE professional connection notifications
    if (
      data.type === "networking_connection_request" ||
      data.type === "networking_match"
    ) {
      console.log("📊 WebSocket: Received networking connection event", data);

      // Dispatch event for SUITE networking connections
      window.dispatchEvent(
        new CustomEvent("networking_connection_request", {
          detail: data,
        }),
      );

      // If it's a match, also dispatch match event
      if (data.type === "networking_match") {
        window.dispatchEvent(
          new CustomEvent("networking_match", {
            detail: data,
          }),
        );
      }

      // Invalidate SUITE connection queries
      if (window.queryClient) {
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/networking"],
        });
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
      return;
    }

    if (
      data.type === "mentorship_connection_request" ||
      data.type === "mentorship_match"
    ) {
      console.log("🎓 WebSocket: Received mentorship connection event", data);

      // Dispatch event for SUITE mentorship connections
      window.dispatchEvent(
        new CustomEvent("mentorship_connection_request", {
          detail: data,
        }),
      );

      // If it's a match, also dispatch match event
      if (data.type === "mentorship_match") {
        window.dispatchEvent(
          new CustomEvent("mentorship_match", {
            detail: data,
          }),
        );
      }

      // Invalidate SUITE connection queries
      if (window.queryClient) {
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/mentorship"],
        });
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
      return;
    }

    if (data.type === "job_application_received") {
      console.log("💼 WebSocket: Received job application event", data);

      // Dispatch event for SUITE job applications
      window.dispatchEvent(
        new CustomEvent("job_application_received", {
          detail: data,
        }),
      );

      // Invalidate SUITE connection queries
      if (window.queryClient) {
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/jobs"],
        });
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
      return;
    }

    // For networking notifications
    if (data.type === "networking_like" || data.type === "networking_match") {
      console.log("🔔 WebSocket: Received networking notification", data);

      // Dispatch networking-specific events
      window.dispatchEvent(
        new CustomEvent("networking:connection", {
          detail: data,
        }),
      );

      // Invalidate networking connections queries to refresh the UI
      if (window.queryClient) {
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/networking"],
        });
        window.queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
      return;
    }

    // 🗑️ REAL-TIME CARD REMOVAL: Handle bidirectional card removal messages
    if (data.type === "card_removal") {
      const cardRemovalData = data as {
        type: "card_removal";
        removeUserId: number;
        reason: string;
        timestamp: string;
      };
      console.log("🗑️ WebSocket: Received card_removal event", cardRemovalData);

      // Dispatch card removal event for Discover page to filter out the card
      window.dispatchEvent(
        new CustomEvent("discover:card_removal", {
          detail: {
            removeUserId: cardRemovalData.removeUserId,
            reason: cardRemovalData.reason,
            timestamp: cardRemovalData.timestamp,
          },
        }),
      );

      console.log(
        `🗑️ WebSocket: Dispatched discover:card_removal for user ${cardRemovalData.removeUserId}`,
      );
    }

    // For new match notifications
    if (data.type === "match_notification" || data.type === "new_like") {
      // Cast to proper type for better type safety
      const matchNotificationData = data as MatchNotificationMessage;
      console.log(
        "🔥 WebSocket: Received match_notification or new_like event",
        matchNotificationData,
      );

      // CRITICAL FIX: Optional skip flag if present in payload
      if ((matchNotificationData as any).isDirectMessage) {
        console.log(
          "🔥 WebSocket: Skipping match popup - this was a direct message",
        );
        return;
      }

      // INSTANT MATCHES PAGE UPDATE: For new_like events, immediately dispatch events to update Matches page
      if (data.type === "new_like") {
        console.log(
          "📱 [WebSocket] NEW_LIKE: Dispatching instant match page updates",
        );

        // Invalidate matches cache immediately for instant UI update
        if (window.queryClient) {
          try {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/matches"],
              refetchType: "all",
            });
            console.log("📱 [WebSocket] NEW_LIKE: Invalidated matches cache");
          } catch (err) {
            console.error(
              "Error invalidating matches cache for new like:",
              err,
            );
          }
        }

        // Dispatch the specific events that Matches page is listening for
        window.dispatchEvent(
          new CustomEvent("like:new", { detail: matchNotificationData }),
        );
        window.dispatchEvent(
          new CustomEvent("like:received", { detail: matchNotificationData }),
        );

        console.log(
          "📱 [WebSocket] NEW_LIKE: Dispatched like:new and like:received events",
        );
      }

      // First dispatch the match:new event with typed data
      window.dispatchEvent(
        new CustomEvent("match:new", {
          detail: matchNotificationData,
        }),
      );

      // Also dispatch a match-specific event for components that need to respond to this exact match
      if (matchNotificationData.match && matchNotificationData.match.id) {
        window.dispatchEvent(
          new CustomEvent(`match:created:${matchNotificationData.match.id}`, {
            detail: {
              matchId: matchNotificationData.match.id,
              fromUserId: matchNotificationData.fromUserId,
              userInfo: matchNotificationData.fromUserInfo,
              timestamp:
                matchNotificationData.timestamp || new Date().toISOString(),
            },
          }),
        );
      }

      // For immediate UI updates, also directly force refresh
      // This ensures the chat tabs appear immediately
      queueMicrotask(() => {
        console.log(
          "🔥 WebSocket: Forcing immediate matches refresh after match notification",
        );
        window.dispatchEvent(new CustomEvent("matches:refresh"));
      });

      // CRITICAL FIX: Explicitly invalidate matches cache to force fresh data
      if (window.queryClient) {
        try {
          // Invalidate several related queries to ensure UI is fully updated
          window.queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/matches/counts"],
          });

          // If we have counts data in the notification, update it directly in the cache
          if (matchNotificationData.counts) {
            try {
              window.queryClient.setQueryData(
                ["/api/matches/counts"],
                matchNotificationData.counts,
              );
              console.log(
                "🔥 WebSocket: Updated match counts in cache with:",
                matchNotificationData.counts,
              );
            } catch (err) {
              console.error("Error updating match counts in cache:", err);
            }
          }

          console.log(
            "🔥 WebSocket: Invalidated matches cache to force fresh data",
          );
        } catch (err) {
          console.error("Error invalidating matches cache:", err);
        }
      }

      // Trigger additional refresh after a short delay to ensure all data is loaded
      setTimeout(() => {
        console.log(
          "🔥 WebSocket: Second matches refresh to catch any delayed updates",
        );
        window.dispatchEvent(new CustomEvent("matches:refresh"));

        // CRITICAL FIX: Also store match ID in localStorage as a backup mechanism
        if (data.matchId) {
          try {
            localStorage.setItem(
              "newly_created_match",
              data.matchId.toString(),
            );
            console.log(
              `🔥 WebSocket: Stored match ID ${data.matchId} in localStorage as backup`,
            );
          } catch (err) {
            console.error("Error storing match ID in localStorage:", err);
          }
        }
      }, 300); // Reduced from 500ms for faster response

      // Also trigger refresh of discover page
      window.dispatchEvent(new CustomEvent("discover:refresh"));
    }

    // CRITICAL FIX: Handle explicit matches:refresh events
    if (data.type === "matches:refresh") {
      console.log("🔥 WebSocket: Received matches:refresh event", data);

      // Invalidate matches cache
      if (window.queryClient) {
        try {
          window.queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          console.log(
            "🔥 WebSocket: Invalidated matches cache from matches:refresh event",
          );
        } catch (err) {
          console.error("Error invalidating matches cache:", err);
        }
      }

      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent("matches:refresh"));

      // Store match ID in localStorage as a backup
      if (data.matchId) {
        try {
          localStorage.setItem("newly_created_match", data.matchId.toString());
          console.log(
            `🔥 WebSocket: Stored match ID ${data.matchId} in localStorage from matches:refresh event`,
          );
        } catch (err) {
          console.error("Error storing match ID in localStorage:", err);
        }
      }
    }

    // Handle discover refresh events (fallback mechanism for card restoration)
    if (data.type === "discover:refresh") {
      console.log("🔄 WebSocket: Received discover:refresh event", data.reason);

      // Force immediate cache invalidation to trigger fresh data fetch
      if (window.queryClient) {
        window.queryClient.invalidateQueries({
          queryKey: ["/api/home-page-data"],
        });
        console.log(
          "🔄 WebSocket: Invalidated discover cache for immediate refresh",
        );
      }

      // Dispatch discover refresh event
      window.dispatchEvent(
        new CustomEvent("discover:refresh", {
          detail: data,
        }),
      );
    }

    // SURGICAL PRECISION FIX: Handle targeted card removal
    if (data.type === "remove_from_discover") {
      console.log("[WebSocketService] Targeted card removal received:", data);

      // Dispatch event for the discover page to handle specific user removal
      window.dispatchEvent(
        new CustomEvent("websocket:message", {
          detail: {
            type: "remove_from_discover",
            removeUserId: data.removeUserId,
            reason: data.reason,
            timestamp: data.timestamp,
          },
        }),
      );
    }

    // Handle new like received notifications
    if (data.type === "new_like_received") {
      console.log("[WebSocketService] New like received:", data);

      // Invalidate matches cache to show the new like
      if (window.queryClient) {
        try {
          window.queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/matches/counts"],
          });
          console.log(
            "[WebSocketService] Invalidated matches cache for new like",
          );
        } catch (err) {
          console.error("Error invalidating matches cache for new like:", err);
        }
      }

      // Dispatch event for matches page to handle
      window.dispatchEvent(
        new CustomEvent("match:newLikeReceived", {
          detail: {
            fromUserId: data.fromUserId,
            fromUserInfo: data.fromUserInfo,
            isMatch: data.isMatch,
            timestamp: data.timestamp,
          },
        }),
      );
    }

    // For profile visibility changes (hide/show profile)
    if (data.type === "profileVisibilityChanged") {
      console.log(
        "[WebSocketService] Profile visibility change received:",
        data,
      );

      // Dispatch event with the user ID and visibility status
      window.dispatchEvent(
        new CustomEvent("websocket:message", {
          detail: {
            type: "profileVisibilityChanged",
            userId: data.userId,
            isHidden: data.isHidden,
            timestamp: data.timestamp,
          },
        }),
      );

      // If user hid their profile, trigger discover refresh to remove them from all users' pools
      if (data.isHidden) {
        window.dispatchEvent(new CustomEvent("discover:refresh"));
      }
    }

    // For status updates
    if (data.type === "user_status") {
      window.dispatchEvent(new CustomEvent("user:status", { detail: data }));
    }

    // For Ghost Mode changes - Real-time privacy updates
    if (data.type === "ghostModeChanged") {
      console.log("[WebSocketService] Ghost Mode change received:", data);

      // Dispatch event for UserPresenceIndicator and other components
      window.dispatchEvent(
        new CustomEvent("websocket:ghostModeChanged", {
          detail: {
            userId: data.userId,
            ghostMode: data.isEnabled,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        }),
      );

      // Also invalidate user-related caches to ensure immediate updates
      if (window.queryClient && data.userId) {
        try {
          // Invalidate the specific user's data
          window.queryClient.invalidateQueries({
            queryKey: [`/api/users/${data.userId}`],
          });

          // Also invalidate matches to update online status in match lists
          window.queryClient.invalidateQueries({
            queryKey: ["/api/matches"],
          });

          console.log(
            `[WebSocketService] Invalidated caches for Ghost Mode change for user ${data.userId}`,
          );
        } catch (err) {
          console.error(
            "Error invalidating caches for Ghost Mode change:",
            err,
          );
        }
      }
    }

    // For verification status changes - Real-time verification badge updates
    if (data.type === "verificationStatusChanged") {
      console.log(
        "[WebSocketService] Verification status change received:",
        data,
      );

      // Dispatch event for swipe cards and other components to update verification badges
      window.dispatchEvent(
        new CustomEvent("websocket:verificationStatusChanged", {
          detail: {
            userId: data.userId,
            isVerified: data.isVerified,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        }),
      );

      // Invalidate user-related caches to ensure immediate updates
      if (window.queryClient && data.userId) {
        try {
          // Invalidate discovery queries to update verification badges on swipe cards
          window.queryClient.invalidateQueries({
            queryKey: ["/api/discover-users"],
          });

          // Invalidate SUITE discovery queries
          window.queryClient.invalidateQueries({
            queryKey: ["/api/suite/discovery/networking"],
          });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/suite/discovery/mentorship"],
          });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/suite/discovery/jobs"],
          });

          // Invalidate specific user data
          window.queryClient.invalidateQueries({
            queryKey: [`/api/users/${data.userId}`],
          });

          console.log(
            `[WebSocketService] Invalidated caches for verification status change for user ${data.userId}`,
          );
        } catch (err) {
          console.error(
            "Error invalidating caches for verification status change:",
            err,
          );
        }
      }
    }

    // For unmatch notifications - Redirect users immediately to Messages page
    if (data.type === "unmatch_notification") {
      console.log("[WebSocketService] Unmatch notification received:", data);

      // Cast to proper type to enforce type safety
      const unmatchData = data as UnmatchNotificationMessage;

      // Invalidate caches to remove the match
      if (window.queryClient) {
        try {
          // Immediately invalidate matches to update UI
          window.queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/matches/counts"],
          });

          // Also invalidate the messages query for this specific match
          window.queryClient.invalidateQueries({
            queryKey: ["/api/messages", unmatchData.matchId],
          });

          console.log(
            `[WebSocketService] Invalidated caches for unmatched match ${unmatchData.matchId}`,
          );
        } catch (err) {
          console.error("Error invalidating caches for unmatch:", err);
        }
      }

      // Dispatch event for UI components to handle
      window.dispatchEvent(
        new CustomEvent("match:unmatch", {
          detail: {
            matchId: unmatchData.matchId,
            unmatchedBy: unmatchData.unmatchedBy,
            timestamp: unmatchData.timestamp || new Date().toISOString(),
          },
        }),
      );

      // If action is redirect_to_messages, redirect the user
      if (unmatchData.action === "redirect_to_messages") {
        // Check current location to avoid unnecessary redirects
        const currentLocation = window.location.pathname;

        // Only redirect if not already on messages page
        if (currentLocation !== "/messages") {
          console.log(
            "[WebSocketService] Redirecting to messages page due to unmatch",
          );
          window.history.pushState({}, "", "/messages");

          // Dispatch a location change event for Wouter to pick up
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }
    }

    // SURGICAL PRECISION FIX: Handle SUITE targeted card removal
    if (data.type === "suite_remove_from_discover") {
      console.log(
        "[WebSocketService] SUITE targeted card removal received:",
        data,
      );

      // Dispatch event for the SUITE discover page to handle specific profile removal
      window.dispatchEvent(
        new CustomEvent("websocket:message", {
          detail: {
            type: "suite_remove_from_discover",
            suiteType: data.suiteType,
            removeProfileId: data.removeProfileId,
            removeUserId: data.removeUserId,
            reason: data.reason,
          },
        }),
      );
    }

    // Handle MEET card restoration for undo functionality
    if (data.type === "meet_restore_to_discover") {
      console.log("[WebSocketService] MEET card restoration received:", data);

      // Get the target user data and restore to discovery
      if (window.queryClient) {
        // Invalidate discover cache to trigger fresh data fetch
        window.queryClient.invalidateQueries({
          queryKey: ["/api/home-page-data"],
        });

        console.log(
          `[WebSocketService] Restored MEET profile for user ${data.userId} to discover deck`,
        );
      }

      // Dispatch event for the home page to handle immediate restoration
      console.log(
        `🔄 [WebSocketService] Dispatching meet:restore_to_discover event for user ${data.userId}`,
      );
      window.dispatchEvent(
        new CustomEvent("meet:restore_to_discover", {
          detail: {
            userId: data.userId,
            reason: data.reason,
            timestamp: data.timestamp,
          },
        }),
      );
      console.log(
        `🔄 [WebSocketService] Event dispatched successfully for user ${data.userId}`,
      );
    }

    // Handle SUITE connection requests and matches
    if (
      data.type === "networking_like" ||
      data.type === "networking_match" ||
      data.type === "mentorship_like" ||
      data.type === "mentorship_match" ||
      data.type === "job_match" ||
      data.type === "job_application"
    ) {
      console.log("[WebSocketService] SUITE connection received:", data);

      // Invalidate SUITE connections cache to show new requests
      if (window.queryClient) {
        try {
          if (data.type.startsWith("networking")) {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/networking/connections"],
            });
          } else if (data.type.startsWith("mentorship")) {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/mentorship/connections"],
            });
          } else if (data.type.startsWith("job")) {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/connections/jobs"],
            });
          }
          console.log("[WebSocketService] Invalidated SUITE connections cache");
        } catch (err) {
          console.error("Error invalidating SUITE connections cache:", err);
        }
      }

      // CRITICAL FIX: For match notifications, dispatch to SUITE Match Dialog system
      if (
        data.type === "networking_match" ||
        data.type === "mentorship_match" ||
        data.type === "job_match"
      ) {
        console.log(
          "[WebSocketService] SUITE MATCH detected - dispatching to match dialog system:",
          data,
        );
        console.log(
          "[WebSocketService] About to dispatch websocket-message event with detail:",
          JSON.stringify(data, null, 2),
        );

        // Dispatch to SUITE Match Dialog system (uses hyphen, not colon)
        const matchEvent = new CustomEvent("websocket-message", {
          detail: data,
        });

        console.log("[WebSocketService] Created CustomEvent:", matchEvent);
        console.log("[WebSocketService] Event detail:", matchEvent.detail);

        const result = window.dispatchEvent(matchEvent);
        console.log(
          "[WebSocketService] Event dispatched successfully, result:",
          result,
        );

        // Also log if there are any listeners
        console.log(
          "[WebSocketService] Event dispatched - listeners should be attached if working correctly",
        );
      }

      // Dispatch event for SUITE connections page
      window.dispatchEvent(
        new CustomEvent("websocket:message", {
          detail: data,
        }),
      );
    }

    // Handle SUITE profile deletion for real-time swipecard removal
    if (data.type === "suite_profile_deleted") {
      console.log("[WebSocketService] SUITE profile deleted:", data);

      // Invalidate discovery cache to remove deleted profiles from swipecards
      if (window.queryClient) {
        try {
          if (data.profileType === "networking") {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/discovery/networking"],
            });
            console.log(
              `[WebSocketService] Invalidated networking discovery cache for deleted profile user ${data.userId}`,
            );
          } else if (data.profileType === "mentorship") {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/discovery/mentorship"],
            });
            console.log(
              `[WebSocketService] Invalidated mentorship discovery cache for deleted profile user ${data.userId}`,
            );
          }
        } catch (err) {
          console.error(
            "Error invalidating discovery cache for deleted profile:",
            err,
          );
        }
      }

      // Dispatch event for immediate swipecard removal
      window.dispatchEvent(
        new CustomEvent("suite_profile_deleted", {
          detail: {
            profileType: data.profileType,
            userId: data.userId,
            role: data.role,
            timestamp: data.timestamp,
          },
        }),
      );
    }

    // Handle SUITE connections page refresh
    if (data.type === "suite_connections_refresh") {
      console.log("[WebSocketService] SUITE connections refresh:", data);

      // Invalidate appropriate SUITE connections cache
      if (window.queryClient) {
        try {
          if (data.suiteType === "networking") {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/networking/connections"],
            });
          } else if (data.suiteType === "mentorship") {
            window.queryClient.invalidateQueries({
              queryKey: ["/api/suite/mentorship/connections"],
            });
          }
          console.log(
            `[WebSocketService] Invalidated ${data.suiteType} connections cache`,
          );
        } catch (err) {
          console.error("Error invalidating SUITE connections cache:", err);
        }
      }

      // Dispatch event to refresh SUITE connections
      window.dispatchEvent(
        new CustomEvent("suite:connections:refresh", {
          detail: {
            suiteType: data.suiteType,
            reason: data.reason,
          },
        }),
      );
    }

    // For networking profile updates - Real-time swipe card synchronization
    if (data.type === "networking_profile_updated") {
      console.log(
        "[WebSocketService] Networking profile update received:",
        data,
      );

      // Cast to proper type to enforce type safety
      const profileUpdateData = data as NetworkingProfileUpdateMessage;

      // Invalidate discovery networking profiles cache to get fresh data
      if (window.queryClient) {
        try {
          // Invalidate networking discovery cache to refresh swipe cards
          window.queryClient.invalidateQueries({
            queryKey: ["/api/suite/discovery/networking"],
          });

          console.log(
            `[WebSocketService] Invalidated networking discovery cache for user ${profileUpdateData.userId} profile update`,
          );
        } catch (err) {
          console.error("Error invalidating networking discovery cache:", err);
        }
      }

      // Dispatch custom event for components to handle real-time updates
      window.dispatchEvent(
        new CustomEvent("networking:profile:updated", {
          detail: {
            userId: profileUpdateData.userId,
            profile: profileUpdateData.profile,
            timestamp: profileUpdateData.timestamp || new Date().toISOString(),
          },
        }),
      );

      // Also dispatch a general discovery refresh event
      window.dispatchEvent(new CustomEvent("suite:discovery:refresh"));
    }

    // For new messages - OPTIMIZED VERSION for speed
    if (
      data.type === "message" ||
      data.type === "new_message" ||
      data.type === "message_sent"
    ) {
      // Process message event - Fast path implementation
      processMessageEvent(data);
    }

    // Handle message deletion events
    if (data.type === "messageDeleted") {
      console.log(`[WebSocketService] Message deletion event received:`, data);

      // Dispatch event for UI components to handle
      window.dispatchEvent(
        new CustomEvent("message:deleted", {
          detail: {
            messageId: data.messageId,
            matchId: data.matchId,
            deletedBy: data.deletedBy,
          },
        }),
      );

      // Invalidate queries to ensure fresh data
      try {
        if (window.queryClient) {
          window.queryClient.invalidateQueries({
            queryKey: ["/api/messages", data.matchId],
          });
          window.queryClient.invalidateQueries({
            queryKey: ["/api/messages"],
          });
          console.log(
            `[WebSocketService] Invalidated message caches for match ${data.matchId}`,
          );
        }
      } catch (err) {
        console.error("Error invalidating caches for message deletion:", err);
      }
    }

    // Handle auto-delete events (when user's messages are deleted due to "always" mode)
    if (data.type === "messagesDeletedForUser") {
      console.log(`[WebSocketService] Auto-delete event received:`, data);

      // Immediately update matches cache with new lastMessage if provided
      try {
        if (window.queryClient && data.newLastMessage !== undefined) {
          const matchesQueryKey = ["/api/matches"];
          const currentMatches =
            window.queryClient.getQueryData(matchesQueryKey);

          if (Array.isArray(currentMatches)) {
            const updatedMatches = currentMatches.map((match) => {
              if (match.id === data.matchId) {
                return {
                  ...match,
                  lastMessage: data.newLastMessage
                    ? data.newLastMessage.content
                    : null,
                  lastMessageTime: data.newLastMessage
                    ? data.newLastMessage.createdAt
                    : null,
                };
              }
              return match;
            });

            // Update the cache immediately
            window.queryClient.setQueryData(matchesQueryKey, updatedMatches);
            console.log(
              `[WebSocketService] Updated matches cache with new lastMessage for match ${data.matchId}:`,
              data.newLastMessage ? data.newLastMessage.content : "null",
            );
          }
        }
      } catch (err) {
        console.error(
          "[WebSocketService] Error updating matches cache for auto-delete:",
          err,
        );
      }

      // Dispatch event for UI components to handle
      window.dispatchEvent(
        new CustomEvent("messages:auto-deleted", {
          detail: {
            matchId: data.matchId,
            deletedForUserId: data.deletedForUserId,
            reason: data.reason,
            isCurrentUser: data.isCurrentUser,
            newLastMessage: data.newLastMessage,
          },
        }),
      );

      // If this is for the current user, immediately clear their cache and reload messages
      if (data.isCurrentUser) {
        try {
          if (window.queryClient) {
            // Clear the cache completely for this match
            window.queryClient.removeQueries({
              queryKey: ["/api/messages", data.matchId],
            });

            // Also clear general messages cache
            window.queryClient.removeQueries({
              queryKey: ["/api/messages"],
            });

            // Force refetch fresh data
            window.queryClient.invalidateQueries({
              queryKey: ["/api/messages", data.matchId],
            });

            console.log(
              `[WebSocketService] Cleared message cache for current user in match ${data.matchId}`,
            );
          }
        } catch (err) {
          console.error("Error clearing cache for auto-delete:", err);
        }
      }

      // Always invalidate matches to ensure fresh data - ENHANCED for auto-delete
      try {
        if (window.queryClient) {
          // CRITICAL FIX: More aggressive cache invalidation for auto-delete
          window.queryClient.removeQueries({
            queryKey: ["/api/matches"],
          });

          window.queryClient.invalidateQueries({
            queryKey: ["/api/matches"],
          });

          // Force immediate refetch after a short delay
          setTimeout(() => {
            window.queryClient.refetchQueries({
              queryKey: ["/api/matches"],
            });
            console.log(
              "[WebSocketService] Forced matches refetch after auto-delete",
            );
          }, 100);
        }
      } catch (err) {
        console.error(
          "[WebSocketService] Error invalidating matches cache:",
          err,
        );
      }
    }

    // Handle reaction added events (including replacements)
    if (data.type === "reactionAdded" || data.type === "reactionReplaced") {
      console.log(
        `[WebSocketService] Reaction ${data.type} event received:`,
        data,
      );

      // Dispatch event for UI components to handle
      window.dispatchEvent(
        new CustomEvent("reaction:added", {
          detail: {
            messageId: data.messageId,
            userId: data.userId,
            emoji: data.emoji,
            matchId: data.matchId,
            reaction: data.reaction,
            isReplacement: data.isReplacement || false, // 🎯 Flag for replacement behavior
          },
        }),
      );
    }

    // Handle reaction removed events
    if (data.type === "reactionRemoved") {
      console.log(`[WebSocketService] Reaction removed event received:`, data);

      // Dispatch event for UI components to handle
      window.dispatchEvent(
        new CustomEvent("reaction:removed", {
          detail: {
            messageId: data.messageId,
            userId: data.userId,
            emoji: data.emoji,
            matchId: data.matchId,
          },
        }),
      );
    }

    // Dispatch raw message event for custom handlers
    window.dispatchEvent(
      new CustomEvent("websocket:message", { detail: data }),
    );
  } catch (error) {
    console.error("[WebSocketService] Error parsing message:", error);
  }

  // Call signaling routing: DISABLED - handled by use-websocket.tsx to prevent duplicates
  // The websocket-service.ts handleSocketMessage function is not actually hooked to the WebSocket connection
  // so we handle call events in use-websocket.tsx where the actual WebSocket message handler is located
  if (data && typeof data.type === "string") {
    if (
      data.type === "call_initiate" ||
      data.type === "call_ringing" ||
      data.type === "call_cancel" ||
      data.type === "call_accept" ||
      data.type === "call_decline" ||
      data.type === "call_end" ||
      data.type === "webrtc_offer" ||
      data.type === "webrtc_answer" ||
      data.type === "webrtc_ice"
    ) {
      console.log("📞 [WebSocketService] Call event detected but not processed (handled by use-websocket.tsx):", {
        type: data.type,
        callId: data.callId,
        callType: data.callType,
      });
      // Skip processing - handled by use-websocket.tsx
      return;
    }
  }
}

/**
 * Process message event with optimized approach
 *
 * @param data The message data from WebSocket
 */
function processMessageEvent(data: any): void {
  // Cast data to appropriate type based on message type
  const isIncoming = data.type === "new_message";
  const isSentConfirmation = data.type === "message_sent";

  // Fast path implementation - process directly for maximum speed
  // Support both direct message objects and nested message property
  const message = data.message || data;
  const messageId = message.id || data.messageId; // Extract message ID for deduplication

  // Safety check for missing message ID
  if (!messageId) {
    console.warn(
      "[WebSocketService] Received message without ID, cannot process:",
      message,
    );
    return;
  }

  // Get other important fields for advanced deduplication if needed
  const senderId = message.senderId || data.senderId;
  const matchId = message.matchId || data.matchId;
  const content = message.content || data.content;

  // FLICKER FIX: For message_sent events, check if we have a current user context
  // If the sender is the current user AND this is a sent confirmation,
  // we need to handle it differently to prevent flickering
  if (isSentConfirmation && typeof window !== "undefined") {
    // Try to get current user from various sources
    let currentUserId = null;
    try {
      // Check if user data is available in React Query cache
      if (window.queryClient) {
        const userData = window.queryClient.getQueryData(["/api/user"]);
        if (userData && typeof userData === "object" && "id" in userData) {
          currentUserId = (userData as any).id;
        }
      }
    } catch (e) {
      // Fallback methods if React Query is not available
    }

    // If this is a message_sent for the current user, handle it specially
    if (currentUserId && senderId === currentUserId) {
      console.log(
        `[FLICKER-FIX] Processing message_sent for current user ${currentUserId}, using sender-optimized flow`,
      );

      // Store recent sending activity to help prevent flicker in components
      try {
        const recentSentKey = `recent_sent_${matchId}_${currentUserId}`;
        const recentSentData = {
          messageId,
          content,
          timestamp: Date.now(),
          senderId: currentUserId,
        };
        sessionStorage.setItem(recentSentKey, JSON.stringify(recentSentData));

        // Auto-cleanup after 10 seconds
        setTimeout(() => {
          try {
            sessionStorage.removeItem(recentSentKey);
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 10000);
      } catch (e) {
        // Ignore storage errors
      }

      // Dispatch a special event type that won't conflict with optimistic updates
      window.dispatchEvent(
        new CustomEvent("message:sent:confirmed", {
          detail: {
            message,
            messageId,
            matchId,
            senderId,
            timestamp: data.timestamp || new Date().toISOString(),
            processed: Date.now(),
            type: "sent_confirmation",
          },
        }),
      );
      return; // Exit early to prevent double processing
    }
  }

  // Record processing start time for performance analysis
  const startTime = performance.now();

  try {
    // Step 1: Check if this message has been processed before using our deduplication system
    if (isMessageProcessed(messageId)) {
      if (config.debug)
        console.log(
          `[WebSocketService] Message ${messageId} already processed (from storage), skipping`,
        );
      return;
    }

    // Step 2: Check content-based fingerprinting for duplicate detection
    if (
      senderId &&
      matchId &&
      content &&
      isMessageDuplicate(messageId, content, senderId, matchId)
    ) {
      console.log(
        `[WebSocketService] Message ${messageId} identified as duplicate via content fingerprinting, skipping`,
      );
      return;
    }
  } catch (deduplicationError) {
    // If the deduplication system fails, fall back to basic checking
    console.error(
      "[WebSocketService] Error in deduplication system, falling back to basic checks:",
      deduplicationError,
    );

    // Fall back to basic checks using the window object
    if (window.__processedMessageIds?.has(messageId)) {
      if (config.debug)
        console.log(
          `[FALLBACK] Message ${messageId} found in window cache, skipping`,
        );
      return;
    }

    // Track in basic window object for simplest tracking
    if (!window.__processedMessageIds) {
      window.__processedMessageIds = new Set<number>();
    }
    window.__processedMessageIds.add(messageId);
  }

  try {
    // Mark this message as processed to prevent future duplicates
    if (senderId && matchId && content) {
      markMessageProcessed(messageId, content, senderId, matchId);
      if (config.debug) {
        console.log(
          `[WebSocketService] Marked message ${messageId} as processed`,
        );
      }
    }
  } catch (error) {
    console.error(
      "[WebSocketService] Error recording message in deduplication system:",
      error,
    );
  }

  // Create a simple, fast unique event ID
  const fastEventId = `${messageId}_${Date.now()}`;

  // OPTIMIZED: Determine message type once
  // (recipient = message received, sender = message sent)
  const messageFor = isIncoming ? "recipient" : "sender";

  // PERFORMANCE: Dispatch event immediately for better responsiveness
  window.dispatchEvent(
    new CustomEvent("message:new", {
      detail: {
        message: message,
        for: messageFor,
        eventId: fastEventId,
        processed: Date.now(), // Add timestamp for debugging
      },
    }),
  );

  // Also dispatch specific event for the match ID if available
  if (matchId) {
    window.dispatchEvent(
      new CustomEvent(`message:new:${matchId}`, {
        detail: {
          message: message,
          for: messageFor,
          eventId: fastEventId,
          processed: Date.now(),
        },
      }),
    );
  }

  // OPTIMIZED: Conditionally refresh matches list if needed
  if (data.shouldRefreshMatches) {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent("matches:refresh"));
    });
  }

  // Immediate unread count update - critical for instant UI feedback
  // This ensures the notification count appears immediately on the Messages icon
  if (messageFor === "recipient") {
    queueMicrotask(() => {
      // Get the current app mode
      const appMode =
        window.__appMode || localStorage.getItem("appMode") || "MEET";
      // Dispatch instant unread count update event
      window.dispatchEvent(
        new CustomEvent("unread-count:increment", {
          detail: { mode: appMode },
        }),
      );
    });
  }

  // Store event ID in session storage for cross-page tracking
  try {
    sessionStorage.setItem(`event_${fastEventId}`, "true");
  } catch (e) {
    // Ignore storage errors - already dispatched the event
  }

  // Record performance metrics
  if (window.__messageProcessingTimes) {
    const processingTime = performance.now() - startTime;
    window.__messageProcessingTimes[messageId] = processingTime;

    // Log processing time for performance analysis
    if (config.debug) {
      console.log(
        `[WebSocketService] Message ${messageId} processed in ${processingTime.toFixed(2)}ms`,
      );
    }
  }
}

/**
 * Process message in fallback mode (simplified)
 *
 * This is a simpler version of message processing used as fallback
 * when the optimized path fails or for older browsers
 *
 * @param data The message data from WebSocket
 */
function processFallbackMessage(data: any): void {
  const message = data.message || data;
  const messageId = message.id;
  const eventId = `msg_${messageId}_${Date.now()}`;

  // Simplified duplicate check
  if (window.__lastKnownDuplicateMessageId === messageId) {
    return;
  }

  // Track this message to prevent duplicates
  window.__lastKnownDuplicateMessageId = messageId;

  // Fast path for message type determination
  const messageFor =
    data.for || (data.type === "new_message" ? "recipient" : "sender");

  // Dispatch immediately
  window.dispatchEvent(
    new CustomEvent("message:new", {
      detail: {
        message: message,
        for: messageFor,
        eventId: eventId,
      },
    }),
  );

  // Optional refresh in background
  if (data.shouldRefreshMatches) {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent("matches:refresh"));
    });
  }

  // Immediate unread count update for fallback mode too
  if (messageFor === "recipient") {
    queueMicrotask(() => {
      // Get the current app mode
      const appMode =
        window.__appMode || localStorage.getItem("appMode") || "MEET";
      // Dispatch instant unread count update event
      window.dispatchEvent(
        new CustomEvent("unread-count:increment", {
          detail: { mode: appMode },
        }),
      );
    });
  }
}

/**
 * Handle WebSocket close
 */
function handleSocketClose(event: CloseEvent): void {
  if (config.debug) {
    console.log(
      `[WebSocketService] Connection closed (code: ${event.code}, reason: ${event.reason || "none"})`,
    );
  }

  connectionState = ConnectionState.DISCONNECTED;
  window.socketConnectionStatus = "disconnected";

  // Dispatch global disconnect event
  window.dispatchEvent(new CustomEvent("websocket:disconnected"));

  // Schedule reconnect if not clean closure
  if (event.code !== 1000) {
    scheduleReconnect();
  }
}

/**
 * Handle WebSocket error
 */
function handleSocketError(event: Event): void {
  console.error("[WebSocketService] Connection error:", event);

  connectionState = ConnectionState.ERROR;
  window.socketConnectionStatus = "error";

  // Dispatch global error event
  window.dispatchEvent(new CustomEvent("websocket:error", { detail: event }));

  // Schedule reconnect
  scheduleReconnect();
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Check if we've exceeded max attempts
  if (reconnectAttempts >= config.maxReconnectAttempts) {
    if (config.debug) {
      console.log(
        "[WebSocketService] Max reconnect attempts reached, giving up",
      );
    }
    return;
  }

  // Calculate optimized backoff delay with reduced jitter
  const backoffDelay = Math.min(
    config.baseReconnectDelay * Math.pow(1.5, reconnectAttempts) +
      Math.random() * 200, // Reduced exponent (1.5 vs 1.8) and jitter (200ms vs 500ms) for less aggressive backoff
    config.maxReconnectDelay,
  );

  if (config.debug) {
    console.log(
      `[WebSocketService] Scheduling reconnect in ${Math.round(backoffDelay)}ms`,
    );
  }

  // Schedule reconnect
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectWebSocket();
  }, backoffDelay);
}

/**
 * Send a message through the WebSocket connection with optimized delivery
 */
export function sendWebSocketMessage<T extends WebSocketMessage>(
  message: T,
): boolean {
  console.log("📡 [WebSocketService] sendWebSocketMessage called with:", {
    type: message.type,
    hasCallId: !!(message as any).callId,
    hasMatchId: !!(message as any).matchId,
  });
  console.log("📡 [WebSocketService] WebSocket state:", {
    exists: !!window.chatSocket,
    readyState: window.chatSocket?.readyState,
    OPEN: WebSocket.OPEN,
  });

  if (!window.chatSocket || window.chatSocket.readyState !== WebSocket.OPEN) {
    console.log(
      "⚠️ [WebSocketService] Authenticated WebSocket not available, queueing message",
    );
    console.log(
      "📡 [WebSocketService] Message queued, pending:",
      pendingOutbox.length + 1,
    );
    try {
      pendingOutbox.push(message);
    } catch (e) {
      console.warn("[WebSocketService] Failed to queue message, dropping:", e);
    }
    // Don't try to create new connection - let use-websocket.tsx handle it
    console.log(
      "📡 [WebSocketService] This message will be sent when authenticated connection is restored",
    );
    return false;
  }

  try {
    // Add high-resolution timestamp for better ordering and deduplication
    const enhancedMessage = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
      clientSentTime: Date.now(),
      clientId: reconnectSession,
    } as unknown as T;

    // Send optimized message
    const messageString = JSON.stringify(enhancedMessage);
    console.log(
      "📡 [WebSocketService] ✅ Sending via authenticated WebSocket:",
      {
        type: enhancedMessage.type,
        length: messageString.length,
        hasAuth: true,
      },
    );
    window.chatSocket.send(messageString);
    console.log(
      "📡 [WebSocketService] ✅ Message sent successfully through authenticated connection",
    );

    // For message types, register them immediately in memory for deduplication
    if (enhancedMessage.type === "message") {
      // Since we already know this is a message type, we can safely cast
      // First cast to unknown then to ChatMessage to avoid TypeScript error
      const chatMessage = enhancedMessage as unknown as ChatMessage;
      if (chatMessage.content) {
        // Register a synthetic ID for outgoing messages that don't have an ID yet
        const syntheticId = `${chatMessage.matchId}_${enhancedMessage.clientSentTime}`;
        // Store this in a temporary outgoing cache
        if (!window.__outgoingMessageCache) {
          window.__outgoingMessageCache = new Set<string>();
        }
        window.__outgoingMessageCache.add(syntheticId);
      }
    }

    return true;
  } catch (error) {
    console.error(
      "📡 [WebSocketService] Failed to send message through authenticated connection:",
      error,
    );
    // If sending fails, queue the message for retry
    try {
      pendingOutbox.push(message);
      console.log("📡 [WebSocketService] Failed message queued for retry");
    } catch (e) {
      console.warn("[WebSocketService] Failed to queue failed message:", e);
    }
    return false;
  }
}

/**
 * Forcibly reconnect the WebSocket with optimized reconnection
 *
 * This function properly handles the reconnection process to ensure message
 * history is preserved and duplicates are prevented even across reconnections
 */
export function reconnectWebSocket(): void {
  // Reset connection state
  reconnectAttempts = 0;

  // Clear any existing timeouts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Generate a new session ID for tracking this reconnection session
  reconnectSession = Date.now().toString();
  window.socketReconnectSession = reconnectSession;

  // Clean only in-memory WebSocket-specific tracking data
  // but preserve storage-based message tracking
  try {
    // Close existing WebSocket first
    if (window.chatSocket) {
      window.chatSocket.close(1000, "Reconnecting");
      window.chatSocket = undefined;
    }

    // Clear in-memory message tracking
    if (window.__processedMessageIds) {
      window.__processedMessageIds.clear();
    }

    // Reset last duplicate message ID
    window.__lastKnownDuplicateMessageId = undefined;

    // Clear message processing times for performance metrics
    window.__messageProcessingTimes = {};

    // Preserve message history in storage during reconnect
    const {
      clearAllDeduplicationData,
    } = require("../lib/message-deduplication");
    if (
      clearAllDeduplicationData &&
      typeof clearAllDeduplicationData === "function"
    ) {
      // Using preserveStorage=true to keep stored message history
      clearAllDeduplicationData(true);
    }

    console.log(
      "[WebSocketService] Prepared for clean reconnection while preserving message history",
    );
  } catch (error) {
    console.error(
      "[WebSocketService] Error during reconnection preparation:",
      error,
    );
  }

  // Force reconnection
  connectWebSocket();
}

/**
 * Check if the WebSocket connection is healthy with enhanced monitoring
 */
export function checkSocketHealth(): boolean {
  const isOpen =
    window.chatSocket !== undefined &&
    window.chatSocket.readyState === WebSocket.OPEN;

  // If connection looks healthy but we haven't received a pong recently,
  // it might be a zombie connection - force reconnect
  if (isOpen && window.socketLastPongTime) {
    const timeSinceLastPong = Date.now() - window.socketLastPongTime;
    if (timeSinceLastPong > config.pingInterval * 3) {
      if (config.debug)
        console.log(
          "[WebSocketService] Zombie connection detected, forcing reconnect",
        );
      reconnectWebSocket();
      return false;
    }
  }

  return isOpen;
}

/**
 * Close the WebSocket connection and clean up resources
 *
 * @param preserveMessageHistory - Whether to preserve message history (default=false on logout)
 */
export function closeWebSocket(preserveMessageHistory: boolean = false): void {
  // Close socket if it exists
  if (window.chatSocket) {
    window.chatSocket.close(1000, "Normal closure");
    window.chatSocket = undefined;
  }

  // Clear intervals
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clear the in-memory message tracking
  if (window.__processedMessageIds) {
    window.__processedMessageIds.clear();
  }

  // Reset last duplicate message ID
  window.__lastKnownDuplicateMessageId = undefined;

  // Clear message processing times for performance metrics
  window.__messageProcessingTimes = {};

  // Clear all deduplication data from the deduplication system
  // During logout, we want to clear everything (preserveStorage=false)
  // During reconnect, we might want to preserve storage (preserveStorage=true)
  try {
    // Import might be null during hot module reload
    const {
      clearAllDeduplicationData,
    } = require("../lib/message-deduplication");
    if (
      clearAllDeduplicationData &&
      typeof clearAllDeduplicationData === "function"
    ) {
      clearAllDeduplicationData(preserveMessageHistory);
    }
  } catch (error) {
    console.error(
      "[WebSocketService] Error clearing deduplication data:",
      error,
    );
  }

  // Update connection state
  connectionState = ConnectionState.DISCONNECTED;
  window.socketConnectionStatus = "disconnected";

  console.log("[WebSocketService] WebSocket closed and resources cleaned up");
}

/**
 * Get the current connection state
 */
export function getConnectionState(): ConnectionState {
  return connectionState;
}

/**
 * Helper to send match popup closed notification
 */
export function sendMatchPopupClosed(
  matchId: number,
  userId?: number,
  sendMessage: boolean = false,
): boolean {
  return sendWebSocketMessage<MatchPopupClosedMessage>({
    type: "match_popup_closed",
    matchId,
    userId,
    sendMessage,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper to send active chat status
 */
export function sendActiveChatStatus(
  matchId: number,
  active: boolean,
): boolean {
  return sendWebSocketMessage<ActiveChatMessage>({
    type: "active_chat",
    matchId,
    active,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper to send typing status with rate limiting to reduce network traffic
 */
export function sendTypingStatus(matchId: number, isTyping: boolean): boolean {
  // Rate limit typing status updates to reduce network traffic
  const now = Date.now();
  const lastTypingTime = window.__lastTypingStatusTime || 0;
  const sameStatus = window.__lastTypingStatus === isTyping;

  // Only send typing updates if status changed or more than 2 seconds have passed
  if (!sameStatus || now - lastTypingTime > 2000) {
    window.__lastTypingStatusTime = now;
    window.__lastTypingStatus = isTyping;

    return sendWebSocketMessage<TypingStatusMessage>({
      type: "typing_status",
      matchId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  return true; // Pretend we sent it successfully
}

/**
 * Helper to send a chat message with optimized delivery
 */
export function sendChatMessage(
  matchId: number,
  receiverId: number,
  content: string,
): boolean {
  // Generate clientMessageId for faster local rendering
  const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Dispatch a local "sending" event for immediate UI feedback
  window.dispatchEvent(
    new CustomEvent("message:sending", {
      detail: {
        clientMessageId,
        matchId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
      },
    }),
  );

  // Send the actual message through WebSocket
  return sendWebSocketMessage<ChatMessage>({
    type: "message",
    matchId,
    receiverId,
    content,
    clientMessageId, // Include client ID for correlation
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper to mark a message as read
 */
export function sendReadReceipt(messageId: number, matchId: number): boolean {
  return sendWebSocketMessage<ReadReceiptMessage>({
    type: "read_receipt",
    messageId,
    matchId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper to send swipe card action (like/dislike/message)
 */
export function sendSwipeAction(
  targetUserId: number,
  action: "like" | "dislike" | "message",
  isMatch: boolean = false,
): boolean {
  return sendWebSocketMessage<SwipeActionMessage>({
    type: "swipe_action",
    targetUserId,
    action,
    isMatch,
    timestamp: new Date().toISOString(),
  });
}

// ===== Video/Voice Call Signaling Helpers =====
export function sendCallInitiate(payload: CallInitiateMessage): boolean {
  console.log("🚨 [WebSocketService] sendCallInitiate called with:", {
    matchId: payload.matchId,
    callerId: payload.callerId,
    receiverId: payload.receiverId,
    callId: payload.callId,
    callType: payload.callType,
    timestamp: payload.timestamp,
    fullPayload: payload
  });

  console.log(
    "🚨 [WebSocketService] Current WebSocket state in sendCallInitiate:",
    {
      exists: !!window.chatSocket,
      readyState: window.chatSocket?.readyState,
      OPEN: WebSocket.OPEN,
      isOpen: window.chatSocket?.readyState === WebSocket.OPEN,
    },
  );

  const result = sendWebSocketMessage<CallInitiateMessage>({
    ...payload,
    type: "call_initiate",
    timestamp: new Date().toISOString(),
  });

  console.log("🚨 [WebSocketService] sendCallInitiate result:", result);
  if (!result) {
    console.log(
      "🚨 [WebSocketService] call_initiate was NOT sent - WebSocket not ready!",
    );
  } else {
    console.log("🚨 [WebSocketService] call_initiate was sent successfully!");
  }
  return result;
}

export function sendCallRinging(payload: CallRingingMessage): boolean {
  return sendWebSocketMessage<CallRingingMessage>({
    ...payload,
    type: "call_ringing",
    timestamp: new Date().toISOString(),
  });
}

export function sendCallCancel(payload: CallCancelMessage): boolean {
  return sendWebSocketMessage<CallCancelMessage>({
    ...payload,
    type: "call_cancel",
    timestamp: new Date().toISOString(),
  });
}

export function sendCallAccept(payload: CallAcceptMessage): boolean {
  console.log("📞 [WebSocketService] Sending call accept:", {
    callId: payload.callId,
    matchId: payload.matchId,
    fromUserId: payload.fromUserId,
    toUserId: payload.toUserId,
  });
  return sendWebSocketMessage<CallAcceptMessage>({
    ...payload,
    type: "call_accept",
    timestamp: new Date().toISOString(),
  });
}

export function sendCallDecline(payload: CallDeclineMessage): boolean {
  return sendWebSocketMessage<CallDeclineMessage>({
    ...payload,
    type: "call_decline",
    timestamp: new Date().toISOString(),
  });
}

export function sendCallEnd(payload: CallEndMessage): boolean {
  return sendWebSocketMessage<CallEndMessage>({
    ...payload,
    type: "call_end",
    timestamp: new Date().toISOString(),
  });
}

export function sendWebRTCOffer(payload: WebRTCOfferMessage): boolean {
  console.log("📞 [WebSocketService] Sending WebRTC offer:", {
    callId: payload.callId,
    matchId: payload.matchId,
    fromUserId: payload.fromUserId,
    toUserId: payload.toUserId,
  });
  return sendWebSocketMessage<WebRTCOfferMessage>({
    ...payload,
    type: "webrtc_offer",
    timestamp: new Date().toISOString(),
  });
}

export function sendWebRTCAnswer(payload: WebRTCAnswerMessage): boolean {
  console.log("📞 [WebSocketService] Sending WebRTC answer:", {
    callId: payload.callId,
    matchId: payload.matchId,
    fromUserId: payload.fromUserId,
    toUserId: payload.toUserId,
  });
  return sendWebSocketMessage<WebRTCAnswerMessage>({
    ...payload,
    type: "webrtc_answer",
    timestamp: new Date().toISOString(),
  });
}

export function sendWebRTCIceCandidate(
  payload: WebRTCIceCandidateMessage,
): boolean {
  return sendWebSocketMessage<WebRTCIceCandidateMessage>({
    ...payload,
    type: "webrtc_ice",
    timestamp: new Date().toISOString(),
  });
}
