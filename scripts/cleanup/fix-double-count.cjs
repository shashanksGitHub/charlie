/**
 * Script to fix the "double unread count" issue for welcome messages
 * 
 * Problem: When a match is created, two welcome messages are created, both marked as unread.
 *          This leads to unread counts showing as 2 instead of 1.
 * 
 * Solution: We'll fix the existing welcome messages to only count one message as unread for each user.
 */

const { Pool } = require('pg');

async function fixDoubleCountIssue() {
  try {
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // 1. Identify all matches with welcome messages (typically the first two messages in a match)
    const matchesResult = await pool.query(`
      SELECT DISTINCT match_id 
      FROM messages 
      GROUP BY match_id 
      HAVING COUNT(*) = 2
    `);
    
    console.log(`Found ${matchesResult.rows.length} potential matches with welcome messages.`);
    
    // 2. Process each match
    for (const { match_id } of matchesResult.rows) {
      // Get the messages for this match
      const messagesResult = await pool.query(`
        SELECT id, match_id, sender_id, receiver_id, content, read
        FROM messages
        WHERE match_id = $1
        ORDER BY created_at
      `, [match_id]);
      
      if (messagesResult.rows.length !== 2) {
        console.log(`Match ${match_id} has ${messagesResult.rows.length} messages, skipping.`);
        continue;
      }
      
      console.log(`Processing match ${match_id} with ${messagesResult.rows.length} messages.`);
      
      // Get the match details to determine user_id_1 and user_id_2
      const matchResult = await pool.query(`
        SELECT id, user_id_1, user_id_2
        FROM matches
        WHERE id = $1
      `, [match_id]);
      
      if (matchResult.rows.length === 0) {
        console.log(`Match ${match_id} not found, skipping.`);
        continue;
      }
      
      const match = matchResult.rows[0];
      const message1 = messagesResult.rows[0];
      const message2 = messagesResult.rows[1];
      
      console.log(`Match ${match_id}: user1=${match.user_id_1}, user2=${match.user_id_2}`);
      console.log(`Message 1: from=${message1.sender_id} to=${message1.receiver_id}, read=${message1.read}`);
      console.log(`Message 2: from=${message2.sender_id} to=${message2.receiver_id}, read=${message2.read}`);
      
      // Fix the unread count issue by setting one of the messages as read
      // Specifically, mark the message where the sender and receiver are the same person as read
      // This means user1 should see message2 as unread (from user2)
      // And user2 should see message1 as unread (from user1)
      
      let fixedCount = 0;
      
      // If user1 sent message1, mark it as read for user2
      if (message1.sender_id === match.user_id_1 && message1.receiver_id === match.user_id_2 && !message1.read) {
        console.log(`Setting message ${message1.id} as read (user1's welcome to user2)`);
        await pool.query(`
          UPDATE messages SET read = TRUE WHERE id = $1
        `, [message1.id]);
        fixedCount++;
      }
      
      // If user2 sent message2, mark it as read for user1
      if (message2.sender_id === match.user_id_2 && message2.receiver_id === match.user_id_1 && !message2.read) {
        console.log(`Setting message ${message2.id} as read (user2's welcome to user1)`);
        await pool.query(`
          UPDATE messages SET read = TRUE WHERE id = $1
        `, [message2.id]);
        fixedCount++;
      }
      
      console.log(`Fixed ${fixedCount} messages for match ${match_id}`);
    }
    
    console.log('Completed fixing the double unread count issue.');
    
    // Check the total unread count for a specific user
    const testUserId = 5; // logintest user
    const unreadResult = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM messages
      WHERE receiver_id = $1 AND read = FALSE
    `, [testUserId]);
    
    console.log(`User ${testUserId} now has ${unreadResult.rows[0].unread_count} unread messages in total.`);
    
    await pool.end();
  } catch (error) {
    console.error('Error fixing double unread count issue:', error);
  }
}

fixDoubleCountIssue();