/**
 * Script to verify if chat tabs should appear for the test matches in the database
 * This directly queries the database to check match and message records
 */

const { Pool } = require('pg');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);

// Function to get all matches for a user
async function getMatchesByUserId(pool, userId) {
  try {
    const result = await pool.query(`
      SELECT * FROM matches
      WHERE (user_id_1 = $1 OR user_id_2 = $1)
      ORDER BY id DESC
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting matches:', error);
    return [];
  }
}

// Function to get messages for a match
async function getMessagesForMatch(pool, matchId) {
  try {
    const result = await pool.query(`
      SELECT * FROM messages
      WHERE match_id = $1
      ORDER BY created_at ASC
    `, [matchId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

// Function to get user info
async function getUserInfo(pool, userId) {
  try {
    const result = await pool.query(`
      SELECT id, username, full_name
      FROM users
      WHERE id = $1
    `, [userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

async function runVerification() {
  try {
    // Database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database. Checking for matches and chat tabs...\n');
    
    // Get all users to test
    const usersResult = await pool.query('SELECT id, username, full_name FROM users ORDER BY id');
    const users = usersResult.rows;
    
    for (const user of users) {
      console.log(`\n========== User: ${user.full_name} (ID: ${user.id}) ==========`);
      
      // Get matches for this user
      const matches = await getMatchesByUserId(pool, user.id);
      
      if (matches.length === 0) {
        console.log(`No matches found for this user.`);
        continue;
      }
      
      console.log(`Found ${matches.length} matches for this user.`);
      
      for (const match of matches) {
        // Get the other user in this match
        const otherUserId = match.user_id_1 === user.id ? match.user_id_2 : match.user_id_1;
        const otherUser = await getUserInfo(pool, otherUserId);
        
        if (!otherUser) {
          console.log(`Match ID ${match.id}: Could not find other user (ID: ${otherUserId})`);
          continue;
        }
        
        // Get messages for this match
        const messages = await getMessagesForMatch(pool, match.id);
        
        // Determine if chat tab should be shown
        const shouldShowChatTab = match.matched === true;
        const hasUnreadMessages = user.id === match.user_id_1 ? match.has_unread_messages_1 : match.has_unread_messages_2;
        
        console.log(`\nMatch ID ${match.id} with ${otherUser.full_name} (ID: ${otherUser.id}):`);
        console.log(`  Matched: ${match.matched}`);
        console.log(`  Created At: ${match.created_at}`);
        console.log(`  Has Unread Messages: ${hasUnreadMessages}`);
        console.log(`  Should Show Chat Tab: ${shouldShowChatTab}`);
        console.log(`  Messages: ${messages.length}`);
        
        // Display message info
        if (messages.length > 0) {
          console.log('  Message Details:');
          messages.forEach((msg, idx) => {
            const direction = msg.sender_id === user.id ? 'Sent' : 'Received';
            console.log(`    ${idx + 1}. ${direction}: "${msg.content}" (Read: ${msg.read})`);
          });
        }
      }
    }
    
    await pool.end();
    console.log('\nVerification complete!');
    console.log('Based on the database state, any user with matched=true connections should see chat tabs when logged in.');
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

runVerification();