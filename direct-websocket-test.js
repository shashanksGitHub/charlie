// Direct WebSocket message test - run this in browser console when on Connections page
console.log('🔍 Testing WebSocket message reception on Connections page...');

// Check if we're on the right page
if (window.location.pathname !== '/suite/connections') {
  console.log('❌ Not on Connections page. Navigate to /suite/connections first');
  console.log('Current path:', window.location.pathname);
} else {
  console.log('✅ On Connections page');
}

// Check WebSocket status
if (window.chatSocket) {
  console.log('WebSocket status:', window.chatSocket.readyState);
  console.log('WebSocket ready states: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');
  
  if (window.chatSocket.readyState === 1) {
    console.log('✅ WebSocket is OPEN and ready');
    
    // Add a temporary message listener to test
    const testListener = (event) => {
      const data = JSON.parse(event.data);
      console.log('🎯 DIRECT TEST: Received WebSocket message:', data);
    };
    
    window.chatSocket.addEventListener('message', testListener);
    console.log('✅ Test listener added to WebSocket');
    
    // Clean up after 30 seconds
    setTimeout(() => {
      window.chatSocket.removeEventListener('message', testListener);
      console.log('🧹 Test listener removed');
    }, 30000);
    
  } else {
    console.log('❌ WebSocket not in OPEN state');
  }
} else {
  console.log('❌ window.chatSocket not available');
}

// Now trigger a networking like
fetch('/api/suite/networking/swipe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ profileId: 59, action: 'like' })
})
.then(response => response.json())
.then(result => {
  console.log('🚀 Networking like triggered:', result);
  console.log('📡 Watch for WebSocket message above...');
})
.catch(error => {
  console.error('❌ Failed to trigger networking like:', error);
});