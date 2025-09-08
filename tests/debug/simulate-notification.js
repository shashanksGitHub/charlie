// Simulate receiving a networking notification - run in browser console on Connections page
console.log('🧪 Simulating networking notification reception...');

// Simulate the exact message that would be sent from the server
const mockNotification = {
  type: "networking_like",
  connection: {
    id: 123,
    userId: 18,
    targetProfileId: 59,
    targetUserId: 6,
    action: "like",
    matched: false
  },
  fromUserId: 18,
  fromUserInfo: {
    id: 18,
    fullName: "1010",
    username: "user_macrjhrd"
  },
  targetProfileId: 59,
  counts: {
    pending: 1,
    confirmed: 0
  },
  isMatch: false,
  timestamp: new Date().toISOString()
};

// Test the global handler directly
if (window.chatSocket) {
  console.log('✅ WebSocket available');
  
  // Create a custom event to simulate the notification
  const customEvent = new CustomEvent('networkingNotification', {
    detail: mockNotification
  });
  
  // Dispatch the event to see if the Connections page processes it
  document.dispatchEvent(customEvent);
  console.log('📡 Mock notification dispatched:', mockNotification);
  
  // Also test if we can manually trigger a WebSocket message
  setTimeout(() => {
    console.log('Testing manual WebSocket message simulation...');
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(mockNotification)
    });
    
    // Trigger the global handler manually
    const globalHandler = window.chatSocket.onmessage;
    if (globalHandler) {
      globalHandler(messageEvent);
      console.log('📨 Manual WebSocket message triggered');
    }
  }, 2000);
  
} else {
  console.log('❌ WebSocket not available');
}

console.log('🔍 Check if the Connections page shows the notification or updates the UI');
console.log('Expected: New grid card should appear or toast notification should show');