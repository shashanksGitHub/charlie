/**
 * Script to create a test match between the login test user and another user
 * This will set up a match with welcome messages and unread flags
 */

const { Pool } = require('pg');

async function createTestMatch() {
  try {
    // Database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // Get the login test user ID
    const loginTestUserResult = await pool.query(`
      SELECT id, username, full_name
      FROM users
      WHERE username = 'logintest'
    `);
    
    if (loginTestUserResult.rows.length === 0) {
      console.error('Login test user not found. Run create-and-test-login.cjs first.');
      await pool.end();
      return;
    }
    
    const loginTestUser = loginTestUserResult.rows[0];
    console.log(`Found login test user: ${loginTestUser.full_name} (ID: ${loginTestUser.id})`);
    
    // Get another user to match with
    const otherUserResult = await pool.query(`
      SELECT id, username, full_name
      FROM users
      WHERE id != $1
      ORDER BY id
      LIMIT 1
    `, [loginTestUser.id]);
    
    if (otherUserResult.rows.length === 0) {
      console.error('No other users found to match with.');
      await pool.end();
      return;
    }
    
    const otherUser = otherUserResult.rows[0];
    console.log(`Found other user to match with: ${otherUser.full_name} (ID: ${otherUser.id})`);
    
    // Check if a match already exists
    const existingMatchResult = await pool.query(`
      SELECT id
      FROM matches
      WHERE 
        (user_id_1 = $1 AND user_id_2 = $2) OR
        (user_id_1 = $2 AND user_id_2 = $1)
    `, [loginTestUser.id, otherUser.id]);
    
    let matchId;
    
    if (existingMatchResult.rows.length > 0) {
      matchId = existingMatchResult.rows[0].id;
      console.log(`Match already exists with ID: ${matchId}`);
      
      // Update match to ensure it's a confirmed match with unread messages
      await pool.query(`
        UPDATE matches
        SET 
          matched = true,
          has_unread_messages_1 = true,
          has_unread_messages_2 = true,
          is_dislike = false
        WHERE id = $1
      `, [matchId]);
      
      console.log(`Updated match to ensure it's a confirmed match with unread flags.`);
    } else {
      // Create a new match
      const newMatchResult = await pool.query(`
        INSERT INTO matches (
          user_id_1, user_id_2, matched, created_at,
          has_unread_messages_1, has_unread_messages_2, 
          notified_user_1, notified_user_2,
          last_message_at, is_dislike
        )
        VALUES (
          $1, $2, true, NOW(),
          true, true,
          false, false,
          NOW(), false
        )
        RETURNING id
      `, [loginTestUser.id, otherUser.id]);
      
      matchId = newMatchResult.rows[0].id;
      console.log(`Created new match with ID: ${matchId}`);
    }
    
    // Check if welcome messages exist
    const existingMessagesResult = await pool.query(`
      SELECT id, sender_id, content
      FROM messages
      WHERE match_id = $1
    `, [matchId]);
    
    if (existingMessagesResult.rows.length > 0) {
      console.log(`Messages already exist for this match:`);
      existingMessagesResult.rows.forEach((msg) => {
        const sender = msg.sender_id === loginTestUser.id ? loginTestUser.full_name : otherUser.full_name;
        console.log(`- From ${sender}: "${msg.content}"`);
      });
    } else {
      // Create welcome messages from both users
      const message1Result = await pool.query(`
        INSERT INTO messages (
          match_id, sender_id, receiver_id, content, read, created_at, message_type
        )
        VALUES (
          $1, $2, $3, 'Hey there! We matched! 🎉', false, NOW(), 'text'
        )
        RETURNING id
      `, [matchId, loginTestUser.id, otherUser.id]);
      
      console.log(`Created welcome message from login test user with ID: ${message1Result.rows[0].id}`);
      
      // Add a reply message with a small time delay
      await pool.query(`
        INSERT INTO messages (
          match_id, sender_id, receiver_id, content, read, created_at, message_type
        )
        VALUES (
          $1, $2, $3, 'Hello! Nice to meet you!', false, NOW() + interval '1 second', 'text'
        )
      `, [matchId, otherUser.id, loginTestUser.id]);
      
      console.log(`Created reply message from other user.`);
    }
    
    console.log(`\nTest match setup complete!`);
    console.log(`Match ID: ${matchId}`);
    console.log(`Login Test User: ${loginTestUser.full_name} (ID: ${loginTestUser.id})`);
    console.log(`Other User: ${otherUser.full_name} (ID: ${otherUser.id})`);
    console.log(`\nYou can now log in as ${loginTestUser.username} to test chat tabs.`);
    
    await pool.end();
  } catch (error) {
    console.error('Error creating test match:', error);
  }
}

createTestMatch();