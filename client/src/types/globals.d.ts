/**
 * Global type declarations for the application
 * Enhanced version with optimized message tracking and performance metrics
 */

// Extend the Window interface to include our global WebSocket and tracking properties
declare global {
  interface Window {
    // WebSocket connection properties
    chatSocket?: WebSocket;
    socketConnectionStatus?: string;
    socketReconnectAttempts?: number;
    socketReconnectSession?: string;
    socketLastConnectAttempt?: number;
    socketLastPongTime?: number;
    reconnectWebSocket?: () => void;
    checkSocketHealth?: () => boolean;
    
    // Message deduplication tracking
    __lastKnownDuplicateMessageId?: number;
    __meetMessageDeduplicationCache?: Set<number>;
    __processedMessageIds?: Set<number>;
    __outgoingMessageCache?: Set<string>;
    
    // Performance tracking
    __messageProcessingTimes?: {
      [messageId: string]: number;
    };
    
    // Typing status optimization
    __lastTypingStatus?: boolean;
    __lastTypingStatusTime?: number;
  }
}

// This empty export is needed to make TypeScript treat this as a module
export {};