/**
 * Simple Cache Invalidation Test
 * Uses authenticated API calls to test the cache invalidation system
 */

const { exec } = require('child_process');

async function testCacheInvalidation() {
  console.log('🧪 Testing Cache Invalidation System\n');

  // Create a test message using curl
  console.log('1️⃣ Creating test message...');
  
  const createCommand = `curl -X POST http://localhost:5000/api/messages \\
    -H "Content-Type: application/json" \\
    -H "Cookie: connect.sid=s%3ALyBgAJF2FVwQiElI9oHHqM7GXqJMfyxN.b6CIu3nDYBvWx%2BsKu3%2FXmrlPWGaXJ5JGr9f%2Fo%2Fu5xGY" \\
    -d '{"matchId": 35, "content": "Cache invalidation test message 🧪"}'`;

  exec(createCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error creating message:', error);
      return;
    }

    try {
      const result = JSON.parse(stdout);
      console.log('✅ Message created:', result);
      
      if (result.id) {
        // Wait a moment then delete the message
        setTimeout(() => {
          console.log('\n2️⃣ Deleting message to trigger cache invalidation...');
          
          const deleteCommand = `curl -X DELETE http://localhost:5000/api/messages/${result.id} \\
            -H "Cookie: connect.sid=s%3ALyBgAJF2FVwQiElI9oHHqM7GXqJMfyxN.b6CIu3nDYBvWx%2BsKu3%2FXmrlPWGaXJ5JGr9f%2Fo%2Fu5xGY"`;
          
          exec(deleteCommand, (deleteError, deleteStdout, deleteStderr) => {
            if (deleteError) {
              console.error('❌ Error deleting message:', deleteError);
              return;
            }
            
            try {
              const deleteResult = JSON.parse(deleteStdout);
              console.log('✅ Message deleted:', deleteResult);
              console.log('\n🎯 Check the server logs for cache invalidation events!');
              console.log('Look for "[CACHE-INVALIDATION]" messages in the workflow console.');
            } catch (parseError) {
              console.log('✅ Message deletion response:', deleteStdout);
            }
          });
        }, 1000);
      }
    } catch (parseError) {
      console.log('Response:', stdout);
    }
  });
}

testCacheInvalidation();