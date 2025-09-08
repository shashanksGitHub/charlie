import { useState, useEffect } from 'react';

export function useOnlineUsers() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null); // null = loading/unknown
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get cached count from localStorage first
    const cachedCount = localStorage.getItem('lastOnlineCount');
    if (cachedCount) {
      const parsed = parseInt(cachedCount, 10);
      if (!isNaN(parsed)) {
        setOnlineCount(parsed);
        setIsLoading(false);
      }
    }

    // Use the existing centralized WebSocket instead of creating a new one
    const checkExistingWebSocket = () => {
      if (window.chatSocket && window.chatSocket.readyState === WebSocket.OPEN) {
        console.log('[ONLINE-USERS] Using existing WebSocket connection');
        
        // Request online count from existing connection
        window.chatSocket.send(JSON.stringify({ type: 'get_online_count' }));
        
        // Listen for online count updates
        const handleMessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'online_count_update') {
              const count = data.count || 0;
              setOnlineCount(count);
              setIsLoading(false);
              // Cache the count
              localStorage.setItem('lastOnlineCount', count.toString());
            }
          } catch (error) {
            // Ignore parsing errors
          }
        };

        window.chatSocket.addEventListener('message', handleMessage);
        
        // Return cleanup function
        return () => {
          if (window.chatSocket) {
            window.chatSocket.removeEventListener('message', handleMessage);
          }
        };
      } else {
        // If no WebSocket available, retry in 1 second
        const timeout = setTimeout(checkExistingWebSocket, 1000);
        return () => clearTimeout(timeout);
      }
    };

    const cleanup = checkExistingWebSocket();

    return cleanup;
  }, []);

  return { 
    onlineCount, 
    isLoading,
    hasCount: onlineCount !== null 
  };
}