/**
 * WebSocket Initialization Module
 * 
 * This module initializes and configures the WebSocket service
 * for the entire application. It is intended to be imported
 * once at the application root level.
 */

import { initWebSocketService } from "@/services/websocket-service";
import { globalNotificationQueue } from "@/lib/global-notification-queue";

/**
 * Initialize the WebSocket service when the app starts
 */
export function initializeWebSockets(): void {
  console.log("[WebSocket] Initializing global WebSocket service");
  
  // Initialize with optimized configuration
  initWebSocketService({
    // Connect to the server-side WebSocket path
    defaultPath: '/ws',
    
    // Optimized reconnection settings
    maxReconnectAttempts: 10,     // Reduced from 20 to avoid excessive retry overhead
    baseReconnectDelay: 2000,     // Increased from 1 second for better connection stability
    maxReconnectDelay: 15000,     // Reduced from 30 seconds for faster recovery
    
    // Optimized ping settings for performance
    pingInterval: 45000,          // Increased from 25s to 45s to reduce network overhead and battery usage
    
    // Debug mode
    debug: true                   // Keep debug logging for monitoring
  });
  
  // Setup global networking notification interceptor
  setupGlobalNetworkingNotificationHandler();
  
  // Setup global mentorship notification interceptor
  setupGlobalMentorshipNotificationHandler();
  
  // Setup global visibility change handler for reconnection
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  console.log("[WebSocket] Global service initialization complete");
}

/**
 * Global handler for networking notifications that routes messages appropriately
 */
function setupGlobalNetworkingNotificationHandler(): void {
  // Wait for WebSocket to be available
  const checkAndSetupHandler = () => {
    if (window.chatSocket) {
      console.log("[GLOBAL-NETWORKING] Setting up global networking notification handler with queue integration");
      
      const globalNetworkingHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle networking-related messages globally
          if (data.type === 'networking_like' || data.type === 'networking_match' || data.type === 'swipe_action') {
            console.log("[GLOBAL-NETWORKING] Intercepted networking notification:", data);
            
            // Add to global notification queue for persistence and cross-page handling
            globalNotificationQueue.addNotification({
              type: data.type === 'networking_match' ? 'networking_match' : 'networking_like',
              data: data
            });
            
            // Also create a custom event for backward compatibility
            const customEvent = new CustomEvent('networkingNotification', {
              detail: data
            });
            
            // Dispatch to the document so any page can listen
            document.dispatchEvent(customEvent);
            console.log("[GLOBAL-NETWORKING] Added to queue and dispatched custom networking event");
          }
        } catch (error) {
          // Silently handle JSON parsing errors for non-JSON messages
        }
      };
      
      window.chatSocket.addEventListener('message', globalNetworkingHandler);
      console.log("[GLOBAL-NETWORKING] Global networking handler attached to WebSocket");
    } else {
      // Retry if WebSocket not ready yet
      setTimeout(checkAndSetupHandler, 1000);
    }
  };
  
  checkAndSetupHandler();
}

function setupGlobalMentorshipNotificationHandler(): void {
  // Wait for WebSocket to be available
  const checkAndSetupHandler = () => {
    if (window.chatSocket) {
      console.log("[GLOBAL-MENTORSHIP] Setting up global mentorship notification handler with queue integration");
      
      const globalMentorshipHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle mentorship-related messages globally
          if (data.type === 'mentorship_like' || data.type === 'mentorship_match') {
            console.log("[GLOBAL-MENTORSHIP] Intercepted mentorship notification:", data);
            
            // Add to global notification queue for persistence and cross-page handling
            globalNotificationQueue.addNotification({
              type: data.type === 'mentorship_match' ? 'mentorship_match' : 'mentorship_like',
              data: data
            });
            
            // Also create a custom event for backward compatibility
            const customEvent = new CustomEvent('mentorshipNotification', {
              detail: data
            });
            
            // Dispatch to the document so any page can listen
            document.dispatchEvent(customEvent);
            console.log("[GLOBAL-MENTORSHIP] Added to queue and dispatched custom mentorship event");
          }
        } catch (error) {
          // Silently handle JSON parsing errors for non-JSON messages
        }
      };
      
      window.chatSocket.addEventListener('message', globalMentorshipHandler);
      console.log("[GLOBAL-MENTORSHIP] Global mentorship handler attached to WebSocket");
    } else {
      // Retry if WebSocket not ready yet
      setTimeout(checkAndSetupHandler, 1000);
    }
  };
  
  checkAndSetupHandler();
}

/**
 * Handle page visibility changes to reconnect when user returns
 */
function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    console.log('[WebSocket] Page became visible, checking connection status');
    
    // If WebSocket is not connected, try to reconnect
    if (!window.chatSocket || 
        window.chatSocket.readyState !== WebSocket.OPEN && 
        window.chatSocket.readyState !== WebSocket.CONNECTING) {
      
      console.log('[WebSocket] Connection needs to be restored, reconnecting...');
      
      // Use the global reconnect function we exposed on the window
      if (window.reconnectWebSocket) {
        window.reconnectWebSocket();
      }
    }
  }
}

// Export the initialization function as default
export default initializeWebSockets;