/**
 * WebSocket types for the application
 * These types are used to define the shape of messages sent and received over WebSocket
 *
 * OPTIMIZATION FEATURES:
 * - Enhanced timestamps for better ordering
 * - Client message IDs for faster local UI updates
 * - Session tracking for better deduplication
 * - Performance metrics for message handling
 */

// Basic WebSocket message interface that all message types extend
export interface WebSocketMessage {
  type: string;
  timestamp?: string;
  clientSentTime?: number;
  clientId?: string;
}

// Message sent to another user
export interface ChatMessage extends WebSocketMessage {
  type: "message";
  matchId: number;
  receiverId: number;
  content: string;
  clientMessageId?: string;
}

// Message received from another user via WebSocket
export interface NewMessage extends WebSocketMessage {
  type: "new_message";
  matchId: number;
  senderId: number;
  content: string;
  id: number; // Database ID
  read: boolean;
  createdAt?: string;
}

// Message sent confirmation from server
export interface MessageSentConfirmation extends WebSocketMessage {
  type: "message_sent";
  messageId: number;
  matchId: number;
  receiptId?: string;
  for: "sender";
}

// Typing status message
export interface TypingStatusMessage extends WebSocketMessage {
  type: "typing_status";
  matchId: number;
  isTyping: boolean;
}

// Active chat status message
export interface ActiveChatMessage extends WebSocketMessage {
  type: "active_chat";
  matchId: number;
  active: boolean;
}

// Read receipt message
export interface ReadReceiptMessage extends WebSocketMessage {
  type: "read_receipt";
  messageId: number;
  matchId: number;
}

// Message read notification (for real-time read status updates)
export interface MessageReadNotification extends WebSocketMessage {
  type: "message_read";
  matchId: number;
  messageIds: number[];
  userId: number;
}

// Match popup closed message
export interface MatchPopupClosedMessage extends WebSocketMessage {
  type: "match_popup_closed";
  matchId: number;
  userId?: number;
  sendMessage?: boolean;
  closedBy?: string;
}

// Swipe action message (kept for backwards compatibility)
export interface SwipeActionMessage extends WebSocketMessage {
  type: "swipe_action";
  targetUserId: number;
  action: "like" | "dislike" | "message";
  isMatch?: boolean;
}

// SURGICAL PRECISION FIX: Targeted card removal message
export interface RemoveFromDiscoverMessage extends WebSocketMessage {
  type: "remove_from_discover";
  removeUserId: number;
  reason: string;
}

// Real-time bidirectional card removal message
export interface CardRemovalMessage extends WebSocketMessage {
  type: "card_removal";
  removeUserId: number;
  reason: "mutual_match" | "blocked" | "other";
}

// New like received notification message
export interface NewLikeReceivedMessage extends WebSocketMessage {
  type: "new_like_received";
  fromUserId: number;
  fromUserInfo: {
    id: number;
    fullName: string;
    [key: string]: any;
  };
  isMatch: boolean;
}

// SURGICAL PRECISION FIX: SUITE targeted card removal message
export interface SuiteRemoveFromDiscoverMessage extends WebSocketMessage {
  type: "suite_remove_from_discover";
  suiteType: "networking" | "mentorship" | "job";
  removeProfileId: number;
  removeUserId: number;
  reason: string;
}

// SUITE connection request messages
export interface SuiteConnectionMessage extends WebSocketMessage {
  type:
    | "networking_like"
    | "networking_match"
    | "mentorship_like"
    | "mentorship_match";
  connection: any;
  fromUserId: number;
  fromUserInfo: {
    id: number;
    fullName: string;
    [key: string]: any;
  };
  targetProfileId: number;
  counts?: {
    pending: number;
    confirmed: number;
  };
  isMatch: boolean;
}

// SUITE connections refresh message
export interface SuiteConnectionsRefreshMessage extends WebSocketMessage {
  type: "suite_connections_refresh";
  suiteType: "networking" | "mentorship" | "job";
  reason: string;
}

// Ping/heartbeat message
export interface PingMessage extends WebSocketMessage {
  type: "ping";
}

// Pong response message
export interface PongMessage extends WebSocketMessage {
  type: "pong";
  serverTime?: string;
}

// User status message
export interface UserStatusMessage extends WebSocketMessage {
  type: "user_status";
  userId: number;
  status: "online" | "offline" | "away";
  lastSeen?: string;
}

// Unmatch notification message
export interface UnmatchNotificationMessage extends WebSocketMessage {
  type: "unmatch_notification";
  matchId: number;
  unmatchedBy: number;
  action?: "redirect_to_messages";
}

// Networking profile update message
export interface NetworkingProfileUpdateMessage extends WebSocketMessage {
  type: "networking_profile_updated";
  userId: number;
  profile: any;
}

// Video/Voice call signaling messages
export interface CallInitiateMessage extends WebSocketMessage {
  type: "call_initiate";
  matchId: number;
  callerId: number;
  receiverId: number;
  toUserId: number; // 🎯 FIX: Add explicit toUserId for server
  callId: number; // created server-side or via REST then echoed
  roomName: string;
  callType?: "video" | "audio"; // Add call type to distinguish between video and audio calls
}

export interface CallRingingMessage extends WebSocketMessage {
  type: "call_ringing";
  matchId: number;
  callerId: number;
  receiverId: number;
  callId: number;
}

export interface CallCancelMessage extends WebSocketMessage {
  type: "call_cancel";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
}

export interface CallAcceptMessage extends WebSocketMessage {
  type: "call_accept";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
}

export interface CallDeclineMessage extends WebSocketMessage {
  type: "call_decline";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
}

export interface CallEndMessage extends WebSocketMessage {
  type: "call_end";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
}

export interface WebRTCOfferMessage extends WebSocketMessage {
  type: "webrtc_offer";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
  sdp: any; // RTCSessionDescriptionInit
}

export interface WebRTCAnswerMessage extends WebSocketMessage {
  type: "webrtc_answer";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
  sdp: any; // RTCSessionDescriptionInit
}

export interface WebRTCIceCandidateMessage extends WebSocketMessage {
  type: "webrtc_ice";
  callId: number;
  matchId: number;
  fromUserId: number;
  toUserId: number;
  candidate: any; // RTCIceCandidateInit
}

// Networking like notification message
export interface NetworkingLikeMessage extends WebSocketMessage {
  type: "networking_like";
  connection: any;
  fromUserId: number;
  fromUserInfo: any;
  targetProfileId: number;
  counts: {
    pending: number;
    confirmed: number;
  };
  isMatch: boolean;
}

// Networking match notification message
export interface NetworkingMatchMessage extends WebSocketMessage {
  type: "networking_match";
  connection: any;
  fromUserId: number;
  fromUserInfo: any;
  targetProfileId: number;
  counts: {
    pending: number;
    confirmed: number;
  };
  isMatch: boolean;
}

// Match notification message
export interface MatchNotificationMessage extends WebSocketMessage {
  type: "match_notification" | "new_like";
  match: {
    id: number;
    userId1: number;
    userId2: number;
    matched: boolean;
  };
  fromUserId: number;
  fromUserInfo?: {
    id: number;
    fullName: string;
    [key: string]: any;
  };
  counts?: {
    confirmed: number;
    pending: number;
    total?: number;
  };
  isMatch?: boolean;
  shouldRefreshMatches?: boolean;
}

// Networking connection request notification
export interface NetworkingConnectionRequestMessage extends WebSocketMessage {
  type: "networking_connection_request";
  connection: any;
  fromUserId: number;
  isMatch: boolean;
}

// Networking match notification
export interface NetworkingMatchNotificationMessage extends WebSocketMessage {
  type: "networking_match";
  connection: any;
  fromUserId: number;
  isMatch: boolean;
}

// Enhanced type to include all possible message types
export type AllWebSocketMessages =
  | ChatMessage
  | NewMessage
  | MessageSentConfirmation
  | TypingStatusMessage
  | ActiveChatMessage
  | ReadReceiptMessage
  | MessageReadNotification
  | MatchPopupClosedMessage
  | SwipeActionMessage
  | RemoveFromDiscoverMessage
  | NewLikeReceivedMessage
  | SuiteRemoveFromDiscoverMessage
  | SuiteConnectionMessage
  | SuiteConnectionsRefreshMessage
  | PingMessage
  | PongMessage
  | UserStatusMessage
  | MatchNotificationMessage
  | UnmatchNotificationMessage
  | NetworkingProfileUpdateMessage
  | CallInitiateMessage
  | CallRingingMessage
  | CallCancelMessage
  | CallAcceptMessage
  | CallDeclineMessage
  | CallEndMessage
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCIceCandidateMessage
  | NetworkingLikeMessage
  | NetworkingMatchMessage
  | NetworkingConnectionRequestMessage
  | NetworkingMatchNotificationMessage;
