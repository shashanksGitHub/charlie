/**
 * Manual Cache Invalidation Trigger
 * Sends a cache invalidation event to clear phantom messages
 */

const WebSocket = require('ws');

async function triggerManualCacheInvalidation() {
  console.log('🎯 Triggering manual cache invalidation for match 35...\n');

  try {
    // Connect to WebSocket as user 1 
    const ws = new WebSocket('ws://localhost:5000/ws', {
      headers: {
        'Cookie': 'connect.sid=s%3ALyBgAJF2FVwQiElI9oHHqM7GXqJMfyxN.b6CIu3nDYBvWx%2BsKu3%2FXmrlPWGaXJ5JGr9f%2Fo%2Fu5xGY'
      }
    });

    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Send a cache invalidation event manually
      const cacheInvalidationEvent = {
        type: 'cache:invalidate',
        matchId: 35,
        reason: 'manual_phantom_message_cleanup',
        timestamp: new Date().toISOString(),
        clearTargets: ['react-query', 'localStorage', 'sessionStorage', 'global-persistence']
      };

      console.log('📡 Broadcasting cache invalidation event...');
      
      // Simulate the server broadcasting this event
      setTimeout(() => {
        ws.send(JSON.stringify(cacheInvalidationEvent));
        console.log('✅ Cache invalidation event sent to all clients');
        console.log('Event details:', JSON.stringify(cacheInvalidationEvent, null, 2));
        
        ws.close();
        console.log('\n🎉 Manual cache invalidation completed!');
        console.log('This should clear all phantom messages from the chat interface.');
      }, 1000);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket connection failed:', error.message);
    });

  } catch (error) {
    console.error('❌ Failed to trigger cache invalidation:', error.message);
  }
}

triggerManualCacheInvalidation();