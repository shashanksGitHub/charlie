/**
 * WebSocket Type Declarations
 * 
 * This file defines the type interfaces for WebSocket functionality
 * throughout the MEET application.
 */

// Make WebSocket globals available to TypeScript
declare global {
  interface Window {
    // Global WebSocket connection used for real-time communication
    chatSocket?: WebSocket;
    
    // Connection status tracking
    socketConnectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
    
    // Last connection time for debugging
    socketLastConnectAttempt?: number;
    
    // Reconnection tracking
    socketReconnectAttempts?: number;
    socketReconnectSession?: string;
    
    // Functions for managing WebSocket
    reconnectWebSocket?: () => void;
    checkSocketHealth?: () => boolean;
  }
}

/**
 * Base WebSocket message interface
 */
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Match popup closed notification message
 */
interface MatchPopupMessage extends WebSocketMessage {
  type: 'match_popup_closed';
  matchId: number;
  userId?: number;
  sendMessage?: boolean;
  timestamp?: string;
}

/**
 * New match notification message
 */
interface MatchNotificationMessage extends WebSocketMessage {
  type: 'match_notification';
  match: any; // Match object
  fromUserId: number;
  fromUserInfo?: any; // User info object
  isMatch: boolean;
  counts?: {
    confirmed: number;
    pending: number;
    total: number;
  };
}

/**
 * User status update message
 */
interface UserStatusMessage extends WebSocketMessage {
  type: 'user_status';
  userId: number;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  inChatMatch?: number | null;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Chat message interface
 */
interface ChatMessage extends WebSocketMessage {
  type: 'message';
  matchId: number;
  senderId: number;
  receiverId: number;
  content: string;
  id?: number;
  timestamp?: string;
}

/**
 * Read receipt message interface
 */
interface ReadReceiptMessage extends WebSocketMessage {
  type: 'read_receipt';
  messageId: number;
  matchId: number;
  userId: number;
  timestamp: string;
}

/**
 * Typing status message interface
 */
interface TypingStatusMessage extends WebSocketMessage {
  type: 'typing_status';
  matchId: number;
  userId: number;
  isTyping: boolean;
  timestamp?: string;
}

/**
 * Active chat status message interface
 */
interface ActiveChatMessage extends WebSocketMessage {
  type: 'active_chat';
  matchId: number;
  userId: number;
  active: boolean;
  timestamp?: string;
}

// Make interfaces available globally
export {
  WebSocketMessage,
  MatchPopupMessage,
  MatchNotificationMessage,
  UserStatusMessage,
  ChatMessage,
  ReadReceiptMessage,
  TypingStatusMessage,
  ActiveChatMessage
};