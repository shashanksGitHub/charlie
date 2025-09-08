/**
 * Script to create a test match directly in the database
 * 
 * This bypasses authentication requirements and simulates what happens
 * when a match is created through the UI.
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const WebSocket = require('ws');

// Configure WebSocket for Neon Serverless
neonConfig.webSocketConstructor = WebSocket;

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createTestMatch() {
  try {
    console.log('Creating test match and messages...');
    
    // Get user IDs from database
    const result = await db.execute(`SELECT id, username FROM users LIMIT 5`);
    console.log('Query result:', result);
    
    // Extract rows from result (format depends on the database driver)
    const users = Array.isArray(result) ? result : (result.rows || []);
    
    console.log('Found users:', users);
    
    if (!users || users.length < 2) {
      console.error('Not enough users in the database to create a match');
      return;
    }
    
    // Use first two users
    const user1Id = users[0]?.id;
    const user2Id = users[1]?.id;
    
    if (!user1Id || !user2Id) {
      console.error('Invalid user IDs:', user1Id, user2Id);
      return;
    }
    
    console.log(`Creating match between users ${user1Id} (${users[0].username}) and ${user2Id} (${users[1].username})`);
    
    // Insert match with direct values for testing only
    console.log(`Trying direct SQL with user IDs ${user1Id} and ${user2Id}`);
    
    const matchResult = await db.execute(
      `INSERT INTO matches (user_id_1, user_id_2, matched, is_dislike)
       VALUES (${user1Id}, ${user2Id}, TRUE, FALSE)
       RETURNING id, user_id_1, user_id_2, matched, is_dislike, created_at`
    );
    
    console.log('Match result:', matchResult);
    
    // Extract the match from the result
    const match = matchResult.rows?.[0] || matchResult[0];
    
    const matchId = match.id;
    console.log(`Match created successfully with ID: ${matchId}`);
    
    // Create welcome messages for both users
    const message1Text = "Congratulations! We matched! 🎉";
    const message2Text = `Oh yes! Hey there`;
    
    // Message from user2 to user1 - direct SQL for testing
    await db.execute(
      `INSERT INTO messages (match_id, sender_id, receiver_id, content, message_type)
       VALUES (${matchId}, ${user2Id}, ${user1Id}, '${message1Text}', 'text')`
    );
    
    // Message from user1 to user2 - direct SQL for testing
    await db.execute(
      `INSERT INTO messages (match_id, sender_id, receiver_id, content, message_type)
       VALUES (${matchId}, ${user1Id}, ${user2Id}, '${message2Text}', 'text')`
    );
    
    console.log('Welcome messages created successfully');
    
    // Store localStorage key to trigger match refresh in UI
    console.log(`
    *******************************************************************
    * TEST MATCH CREATED SUCCESSFULLY!                                *
    *                                                                 *
    * To test chat tab creation, perform these steps in the browser:  *
    * 1. Open browser console with F12                               *
    * 2. Run: localStorage.setItem('newly_created_match', ${matchId}) *
    * 3. Navigate to the Messages page                               *
    * 4. A new chat tab should appear immediately!                   *
    *******************************************************************
    `);
    
    // Emit WebSocket event if possible
    try {
      console.log('WebSocket connections are simulated in this test');
    } catch (err) {
      console.error('Error sending WebSocket event:', err);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error creating test match:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createTestMatch().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});