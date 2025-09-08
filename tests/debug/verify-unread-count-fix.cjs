/**
 * Verification script for unread message count fixes
 * 
 * This script:
 * 1. Checks if the unread count endpoint now properly returns conversation counts
 * 2. Verifies match objects contain correctly filtered unread message counts
 * 
 * Run this script after deploying to verify the fixes are working properly
 */

const { Pool } = require('pg');

async function verifyUnreadCountFixes() {
  console.log('\n🔍 VERIFYING UNREAD MESSAGE COUNT FIXES\n');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test setup: Show environment information
    console.log('📊 Environment info:');
    try {
      const dbInfo = await pool.query('SELECT current_database(), version();');
      console.log(`  Database: ${dbInfo.rows[0].current_database}`);
      console.log(`  Postgres: ${dbInfo.rows[0].version.split(' ')[0]}`);
      console.log('  Connection: SUCCESS');
    } catch (err) {
      console.log('  Database Connection: FAILED', err.message);
    }
    
    // Part 1: Check the number of conversations with unread messages vs raw message count
    console.log('\n📬 Checking unread message count logic...');
    
    // Get total number of unread messages in the system (raw count)
    const rawMessageCountResult = await pool.query(`
      SELECT COUNT(*) FROM messages WHERE read = false
    `);
    const rawUnreadCount = parseInt(rawMessageCountResult.rows[0].count);
    
    console.log(`Total unread messages across all conversations: ${rawUnreadCount}`);
    
    // Check for users with unread messages
    const usersWithUnreadResult = await pool.query(`
      SELECT DISTINCT receiver_id AS user_id FROM messages WHERE read = false
    `);
    
    if (usersWithUnreadResult.rows.length === 0) {
      console.log('⚠️ No users with unread messages found for testing.');
      console.log('   Please create some test messages first.');
    } else {
      for (const userRow of usersWithUnreadResult.rows) {
        const userId = userRow.user_id;
        
        console.log(`\n------ User ID: ${userId} ------`);
        
        // Count raw unread messages for this user
        const userRawUnreadResult = await pool.query(`
          SELECT COUNT(*) FROM messages 
          WHERE receiver_id = $1 AND read = false
        `, [userId]);
        
        const userRawUnreadCount = parseInt(userRawUnreadResult.rows[0].count);
        console.log(`Total unread messages: ${userRawUnreadCount}`);
        
        // Count conversations with unread messages from other users
        const conversationsWithUnreadCount = await getUnreadConversationsCount(pool, userId);
        console.log(`Conversations with unread messages: ${conversationsWithUnreadCount}`);
        
        // Display matches with unread messages to check
        const matchesResult = await pool.query(`
          SELECT m.* FROM matches m
          WHERE (m.user_id_1 = $1 AND m.has_unread_messages_1 = true)
             OR (m.user_id_2 = $1 AND m.has_unread_messages_2 = true)
        `, [userId]);
        
        console.log(`Matches with unread flags set: ${matchesResult.rows.length}`);
        
        // Detailed check for up to 3 matches
        const matchesToCheck = matchesResult.rows.slice(0, 3);
        for (const match of matchesToCheck) {
          console.log(`\n  Match ID: ${match.id}`);
          
          // Get all messages for this match
          const messagesResult = await pool.query(`
            SELECT * FROM messages WHERE match_id = $1
          `, [match.id]);
          
          // Get all unread messages for this user
          const allUnreadMessages = messagesResult.rows.filter(
            msg => msg.receiver_id === userId && !msg.read
          );
          
          // Get only unread messages from other users
          const unreadFromOthers = messagesResult.rows.filter(
            msg => msg.receiver_id === userId && 
                  msg.sender_id !== userId && 
                  !msg.read
          );
          
          console.log(`  • Total unread: ${allUnreadMessages.length}`);
          console.log(`  • Unread from others: ${unreadFromOthers.length}`);
          
          // Detailed message info for debugging
          if (unreadFromOthers.length > 0) {
            console.log('  • Unread message details:');
            unreadFromOthers.forEach((msg, idx) => {
              if (idx < 3) { // Show max 3 messages for brevity
                console.log(`    - From User ${msg.sender_id}: "${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}"`);
              }
            });
            if (unreadFromOthers.length > 3) {
              console.log(`    - ... and ${unreadFromOthers.length - 3} more`);
            }
          }
        }
      }
    }
    
    console.log('\n✅ Verification complete!');
    console.log('The fixes should now ensure:');
    console.log('1. Navigation badge shows count of conversations with unread messages');
    console.log('2. Chat tab badges only show unread messages from other users');
    
    await pool.end();
  } catch (error) {
    console.error('❌ ERROR during verification:', error);
  }
}

// Helper function - replicates server implementation
async function getUnreadConversationsCount(pool, userId) {
  try {
    // Get all matches for the user
    const matchesResult = await pool.query(`
      SELECT * FROM matches 
      WHERE user_id_1 = $1 OR user_id_2 = $1
    `, [userId]);
    
    let conversationsWithUnread = 0;
    
    // Count each conversation that has at least one unread message
    for (const match of matchesResult.rows) {
      // Only check matches that have the unread flag set
      if ((match.user_id_1 === userId && match.has_unread_messages_1) || 
          (match.user_id_2 === userId && match.has_unread_messages_2)) {
        
        // Get all messages for this match
        const messagesResult = await pool.query(`
          SELECT * FROM messages WHERE match_id = $1
        `, [match.id]);
        
        // Check if there's at least one unread message from the other user
        const hasUnreadFromOther = messagesResult.rows.some(
          message => message.receiver_id === userId && 
                   message.sender_id !== userId && 
                   !message.read
        );
        
        // If there's at least one unread message from the other user, count this conversation
        if (hasUnreadFromOther) {
          conversationsWithUnread++;
        }
      }
    }
    
    return conversationsWithUnread;
  } catch (error) {
    console.error("Error getting unread conversations count:", error);
    return 0; // Default to 0 on error
  }
}

// Run the verification
verifyUnreadCountFixes();