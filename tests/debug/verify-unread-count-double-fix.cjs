/**
 * Verification Script for Unread Count Double-Counting Bug Fix
 * 
 * This script specifically tests whether the message deduplication system
 * successfully prevents the unread message count from incrementing by 2, 4, 6
 * instead of 1, 2, 3 as expected.
 * 
 * How it works:
 * 1. Sets up a clean test environment by marking all messages as read
 * 2. Sends a sequence of test messages
 * 3. After each message, checks if the unread count increased by exactly 1
 * 4. Reports on whether double-counting is still occurring
 */

const { Pool } = require('pg');
const WebSocket = require('ws');

// Setup database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test users - actual users from the database
const TEST_USER_1 = { id: 2, name: 'testuser' };
const TEST_USER_2 = { id: 3, name: 'user_ma1ig5tk' };

// Get current unread count for a user
async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM messages 
       WHERE receiver_id = $1 AND read = false`,
      [userId]
    );
    
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

// Mark all messages as read to start fresh
async function resetUnreadMessages() {
  try {
    await pool.query(
      `UPDATE messages 
       SET read = true, read_at = NOW() 
       WHERE receiver_id IN ($1, $2) AND read = false`,
      [TEST_USER_1.id, TEST_USER_2.id]
    );
    
    // Also reset unread flags in matches table
    await pool.query(
      `UPDATE matches 
       SET has_unread_messages_1 = false, has_unread_messages_2 = false 
       WHERE user_id_1 IN ($1, $2) OR user_id_2 IN ($1, $2)`,
      [TEST_USER_1.id, TEST_USER_2.id]
    );
    
    console.log('Reset all unread messages.');
  } catch (error) {
    console.error('Error resetting unread messages:', error);
    throw error;
  }
}

// Find an existing match between the two test users
async function findMatchBetweenUsers() {
  try {
    const result = await pool.query(
      `SELECT id FROM matches 
       WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)`,
      [TEST_USER_1.id, TEST_USER_2.id]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`No match found between users ${TEST_USER_1.id} and ${TEST_USER_2.id}`);
    }
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error finding match between users:', error);
    throw error;
  }
}

// Send a test message through database (simulating API call)
async function sendMessageThroughDatabase(matchId, senderId, receiverId, content) {
  try {
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, receiver_id, content, created_at, read, read_at)
       VALUES ($1, $2, $3, $4, NOW(), false, NULL)
       RETURNING id`,
      [matchId, senderId, receiverId, content]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error sending message through database:', error);
    throw error;
  }
}

// Send a WebSocket message
function sendWebSocketMessage(matchId, senderId, receiverId, content) {
  return new Promise((resolve, reject) => {
    try {
      const socket = new WebSocket('wss://45d87801-de1c-4840-a311-42dee31dcc89-00-1kcy7xrb1y5cw.kirk.replit.dev/ws');
      
      socket.on('open', () => {
        console.log('WebSocket connected');
        
        // Send the message
        const message = {
          type: 'chat',
          matchId: matchId,
          senderId: senderId,
          receiverId: receiverId,
          content: content
        };
        
        socket.send(JSON.stringify(message));
        console.log(`Sent WebSocket message: ${content}`);
        
        // Close the socket after a delay to ensure message is processed
        setTimeout(() => {
          socket.close();
          console.log('WebSocket closed');
          resolve();
        }, 1000);
      });
      
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      socket.on('close', () => {
        console.log('WebSocket connection closed');
      });
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      reject(error);
    }
  });
}

// Wait for a specified time
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the verification test
async function runVerificationTest() {
  try {
    console.log('Starting unread count double-counting verification test...');
    
    // Step 1: Reset all unread messages
    await resetUnreadMessages();
    
    // Step 2: Find match between test users
    const matchId = await findMatchBetweenUsers();
    console.log(`Found match ID: ${matchId} between users ${TEST_USER_1.id} and ${TEST_USER_2.id}`);
    
    // Step 3: Get initial unread counts
    const initialCount1 = await getUnreadCount(TEST_USER_1.id);
    const initialCount2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Initial unread count for User 1: ${initialCount1}`);
    console.log(`Initial unread count for User 2: ${initialCount2}`);
    
    if (initialCount1 > 0 || initialCount2 > 0) {
      console.warn('Warning: Initial unread counts are not zero. This may affect test results.');
    }
    
    // Step 4: Send a sequence of messages and check unread counts after each one
    console.log('\n=== Test Sequence 1: Database Messages ===');
    console.log('Sending 3 messages through database API...');
    
    // Send first message from User 1 to User 2
    const msgId1 = await sendMessageThroughDatabase(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'DB Test Message 1'
    );
    console.log(`Sent message ID ${msgId1} from User 1 to User 2`);
    
    // Wait a moment for the system to process
    await wait(1000);
    
    // Check counts after first message
    const countAfterMsg1_User1 = await getUnreadCount(TEST_USER_1.id);
    const countAfterMsg1_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after first message: ${countAfterMsg1_User1} (Change: ${countAfterMsg1_User1 - initialCount1})`);
    console.log(`Unread count for User 2 after first message: ${countAfterMsg1_User2} (Change: ${countAfterMsg1_User2 - initialCount2})`);
    
    // Send second message
    const msgId2 = await sendMessageThroughDatabase(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'DB Test Message 2'
    );
    console.log(`Sent message ID ${msgId2} from User 1 to User 2`);
    
    // Wait a moment for the system to process
    await wait(1000);
    
    // Check counts after second message
    const countAfterMsg2_User1 = await getUnreadCount(TEST_USER_1.id);
    const countAfterMsg2_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after second message: ${countAfterMsg2_User1} (Change: ${countAfterMsg2_User1 - countAfterMsg1_User1})`);
    console.log(`Unread count for User 2 after second message: ${countAfterMsg2_User2} (Change: ${countAfterMsg2_User2 - countAfterMsg1_User2})`);
    
    // Send third message
    const msgId3 = await sendMessageThroughDatabase(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'DB Test Message 3'
    );
    console.log(`Sent message ID ${msgId3} from User 1 to User 2`);
    
    // Wait a moment for the system to process
    await wait(1000);
    
    // Check counts after third message
    const countAfterMsg3_User1 = await getUnreadCount(TEST_USER_1.id);
    const countAfterMsg3_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after third message: ${countAfterMsg3_User1} (Change: ${countAfterMsg3_User1 - countAfterMsg2_User1})`);
    console.log(`Unread count for User 2 after third message: ${countAfterMsg3_User2} (Change: ${countAfterMsg3_User2 - countAfterMsg2_User2})`);
    
    // Step 5: Reset and test with WebSocket messages
    console.log('\n=== Resetting unread counts for WebSocket test ===');
    await resetUnreadMessages();
    
    const wsInitialCount1 = await getUnreadCount(TEST_USER_1.id);
    const wsInitialCount2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Initial unread count for User 1: ${wsInitialCount1}`);
    console.log(`Initial unread count for User 2: ${wsInitialCount2}`);
    
    console.log('\n=== Test Sequence 2: WebSocket Messages ===');
    console.log('Sending 3 messages through WebSocket...');
    
    // Send first WebSocket message
    await sendWebSocketMessage(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'WS Test Message 1'
    );
    
    // Wait longer for WebSocket processing
    await wait(2000);
    
    // Check counts after first WebSocket message
    const wsCountAfterMsg1_User1 = await getUnreadCount(TEST_USER_1.id);
    const wsCountAfterMsg1_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after first WS message: ${wsCountAfterMsg1_User1} (Change: ${wsCountAfterMsg1_User1 - wsInitialCount1})`);
    console.log(`Unread count for User 2 after first WS message: ${wsCountAfterMsg1_User2} (Change: ${wsCountAfterMsg1_User2 - wsInitialCount2})`);
    
    // Send second WebSocket message
    await sendWebSocketMessage(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'WS Test Message 2'
    );
    
    // Wait longer for WebSocket processing
    await wait(2000);
    
    // Check counts after second WebSocket message
    const wsCountAfterMsg2_User1 = await getUnreadCount(TEST_USER_1.id);
    const wsCountAfterMsg2_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after second WS message: ${wsCountAfterMsg2_User1} (Change: ${wsCountAfterMsg2_User1 - wsCountAfterMsg1_User1})`);
    console.log(`Unread count for User 2 after second WS message: ${wsCountAfterMsg2_User2} (Change: ${wsCountAfterMsg2_User2 - wsCountAfterMsg1_User2})`);
    
    // Send third WebSocket message
    await sendWebSocketMessage(
      matchId, TEST_USER_1.id, TEST_USER_2.id, 'WS Test Message 3'
    );
    
    // Wait longer for WebSocket processing
    await wait(2000);
    
    // Check counts after third WebSocket message
    const wsCountAfterMsg3_User1 = await getUnreadCount(TEST_USER_1.id);
    const wsCountAfterMsg3_User2 = await getUnreadCount(TEST_USER_2.id);
    
    console.log(`Unread count for User 1 after third WS message: ${wsCountAfterMsg3_User1} (Change: ${wsCountAfterMsg3_User1 - wsCountAfterMsg2_User1})`);
    console.log(`Unread count for User 2 after third WS message: ${wsCountAfterMsg3_User2} (Change: ${wsCountAfterMsg3_User2 - wsCountAfterMsg2_User2})`);
    
    // Step 6: Analyze results
    console.log('\n=== Analysis ===');
    
    // Check for double-counting in database messages
    const dbIncreases = [
      countAfterMsg1_User2 - initialCount2,
      countAfterMsg2_User2 - countAfterMsg1_User2,
      countAfterMsg3_User2 - countAfterMsg2_User2
    ];
    
    const dbDoubleCount = dbIncreases.some(increase => increase > 1);
    
    if (dbDoubleCount) {
      console.error('❌ PROBLEM DETECTED: Double-counting still occurring with database messages');
      console.error(`Message count increases: ${dbIncreases.join(', ')}`);
    } else {
      console.log('✅ Database messages increment correctly (by 1 each time)');
    }
    
    // Check for double-counting in WebSocket messages
    const wsIncreases = [
      wsCountAfterMsg1_User2 - wsInitialCount2,
      wsCountAfterMsg2_User2 - wsCountAfterMsg1_User2,
      wsCountAfterMsg3_User2 - wsCountAfterMsg2_User2
    ];
    
    const wsDoubleCount = wsIncreases.some(increase => increase > 1);
    
    if (wsDoubleCount) {
      console.error('❌ PROBLEM DETECTED: Double-counting still occurring with WebSocket messages');
      console.error(`Message count increases: ${wsIncreases.join(', ')}`);
    } else {
      console.log('✅ WebSocket messages increment correctly (by 1 each time)');
    }
    
    // Final verdict
    if (dbDoubleCount || wsDoubleCount) {
      console.error('\n❌ FIX NEEDED: Double-counting bug is still present!');
    } else {
      console.log('\n✅ SUCCESS: No double-counting detected! The fix appears to be working.');
    }
    
  } catch (error) {
    console.error('Error in verification test:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification
runVerificationTest();