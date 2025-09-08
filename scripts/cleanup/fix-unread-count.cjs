/**
 * Script to investigate unread count issue
 * This will check why we're seeing 2 unread messages instead of 1
 */

const { Pool } = require('pg');

async function investigateUnreadCount() {
  try {
    // Database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // Get the match
    const matchResult = await pool.query(`
      SELECT id, user_id_1, user_id_2, matched, has_unread_messages_1, has_unread_messages_2
      FROM matches WHERE id = 19
    `);
    
    if (matchResult.rows.length === 0) {
      console.error('Match ID 19 not found.');
      await pool.end();
      return;
    }
    
    const match = matchResult.rows[0];
    console.log(`Found match ID 19 between users ${match.user_id_1} and ${match.user_id_2}`);
    console.log(`Has unread messages for user ${match.user_id_1}: ${match.has_unread_messages_1}`);
    console.log(`Has unread messages for user ${match.user_id_2}: ${match.has_unread_messages_2}`);
    
    // Get the messages
    const messagesResult = await pool.query(`
      SELECT id, match_id, sender_id, receiver_id, content, read, created_at
      FROM messages
      WHERE match_id = 19
      ORDER BY created_at
    `);
    
    console.log(`\nFound ${messagesResult.rows.length} messages for this match:`);
    
    // Process each message
    for (const msg of messagesResult.rows) {
      console.log(`- Message ${msg.id}: From ${msg.sender_id} to ${msg.receiver_id}: "${msg.content}" (Read: ${msg.read})`);
    }
    
    // Calculate unread counts as the API would
    const unreadForUser5 = messagesResult.rows.filter(msg => 
      msg.receiver_id === 5 && !msg.read
    ).length;
    
    const unreadForUser2 = messagesResult.rows.filter(msg => 
      msg.receiver_id === 2 && !msg.read
    ).length;
    
    console.log(`\nCalculated unread counts:`);
    console.log(`User 5 should see ${unreadForUser5} unread messages`);
    console.log(`User 2 should see ${unreadForUser2} unread messages`);
    
    // Let's trace the problem by examining the API code output for user 5
    console.log('\nSimulating API calculation for user 5...');
    
    // Reproducing the API calculation:
    const userId = 5;
    const chatMessages = messagesResult.rows;
    let unreadCount = 0;
    
    if (match.user_id_1 === userId && match.has_unread_messages_1) {
      // Count how many unread messages
      unreadCount = chatMessages.filter(msg => 
        msg.receiver_id === userId && !msg.read
      ).length;
      console.log(`User 5 is user_id_1, has_unread_messages1=${match.has_unread_messages_1}`);
      console.log(`Filtered ${chatMessages.filter(msg => msg.receiver_id === userId && !msg.read).length} unread messages for user 5`);
    } else if (match.user_id_2 === userId && match.has_unread_messages_2) {
      // Count how many unread messages
      unreadCount = chatMessages.filter(msg => 
        msg.receiver_id === userId && !msg.read
      ).length;
      console.log(`User 5 is user_id_2, has_unread_messages2=${match.has_unread_messages_2}`);
      console.log(`Filtered ${chatMessages.filter(msg => msg.receiver_id === userId && !msg.read).length} unread messages for user 5`);
    }
    
    // Default to 1 if we know there are unread messages but counting returns 0
    if (unreadCount === 0) {
      if ((match.user_id_1 === userId && match.has_unread_messages_1) || 
          (match.user_id_2 === userId && match.has_unread_messages_2)) {
        unreadCount = 1;
        console.log('API defaulted to unreadCount=1 because filtering returned 0 but hasUnreadMessages flag is true');
      }
    }
    
    console.log(`API would return unreadCount=${unreadCount} for user 5`);
    
    // Potential solutions:
    console.log('\nPossible solutions:');
    console.log('1. Debug the API code to ensure message filtering is working correctly');
    console.log('2. Mark one of the messages as read so the count equals 1');
    console.log('3. Check if the frontend is incorrectly double-counting messages');
    
    await pool.end();
  } catch (error) {
    console.error('Error investigating unread count:', error);
  }
}

investigateUnreadCount();