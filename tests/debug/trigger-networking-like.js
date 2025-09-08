// Trigger a networking like from the browser console
// This will send the WebSocket message to test if the Connections page receives it

const triggerNetworkingLike = async () => {
  try {
    console.log('🔥 Triggering networking like to test WebSocket flow...');
    
    const response = await fetch('/api/suite/networking/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profileId: 59, // Lupita's profile
        action: 'like'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Networking like sent successfully:', result);
      console.log('📡 Check for WebSocket messages in Connections page:');
      console.log('- [CONNECTIONS-PAGE] Received WebSocket message');
      console.log('- [CONNECTIONS-PAGE] Processing networking notification');
    } else {
      const error = await response.text();
      console.log('❌ Failed to send networking like:', response.status, error);
    }
  } catch (error) {
    console.error('❌ Error triggering networking like:', error);
  }
};

// Auto-execute
triggerNetworkingLike();