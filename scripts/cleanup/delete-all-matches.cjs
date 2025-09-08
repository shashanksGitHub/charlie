/**
 * Script to delete all matches, messages, likes, dislikes, and related records from the database
 * 
 * This script will carefully remove:
 * 1. All typing status records
 * 2. All messages (including welcome messages)
 * 3. All matches (both confirmed matches and likes/dislikes)
 * 4. Reset any related flags in the users table
 * 
 * WARNING: This is a destructive operation that cannot be undone!
 */

const { Pool } = require('pg');

async function deleteAllMatches() {
  try {
    // Database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // Count total records before deletion
    const matchesCountResult = await pool.query('SELECT COUNT(*) FROM matches');
    const messagesCountResult = await pool.query('SELECT COUNT(*) FROM messages');
    const typingStatusCountResult = await pool.query('SELECT COUNT(*) FROM typing_status');
    
    console.log(`Found:`);
    console.log(`- ${matchesCountResult.rows[0].count} matches`);
    console.log(`- ${messagesCountResult.rows[0].count} messages`);
    console.log(`- ${typingStatusCountResult.rows[0].count} typing status records`);
    
    // First, delete typing status records
    console.log('\nDeleting all typing status records...');
    await pool.query('DELETE FROM typing_status');
    console.log('Successfully deleted all typing status records.');
    
    // Check for any other dependent tables
    console.log('Checking for other dependent tables...');
    try {
      // Delete any notifications related to matches
      if ((await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications')")).rows[0].exists) {
        console.log('Deleting match-related notifications...');
        await pool.query(`DELETE FROM notifications WHERE type LIKE 'match%' OR type LIKE '%like%'`);
        console.log('Successfully deleted match-related notifications.');
      }
      
      // Delete any match events or logs
      if ((await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'match_events')")).rows[0].exists) {
        console.log('Deleting match events...');
        await pool.query('DELETE FROM match_events');
        console.log('Successfully deleted match events.');
      }
    } catch (err) {
      console.warn('Warning when cleaning dependent tables:', err.message);
    }
    
    // Now delete messages
    console.log('\nDeleting all messages...');
    await pool.query('DELETE FROM messages');
    console.log('Successfully deleted all messages.');
    
    // Finally delete matches
    console.log('\nDeleting all matches (including likes/dislikes)...');
    await pool.query('DELETE FROM matches');
    console.log('Successfully deleted all matches, likes, and dislikes.');
    
    // Reset any unread message flags in users table
    console.log('\nResetting unread message flags in users table...');
    try {
      await pool.query(`
        UPDATE users
        SET has_unread_messages = false
        WHERE has_unread_messages = true
      `);
      console.log('Successfully reset has_unread_messages flag.');
    } catch (err) {
      console.warn('Warning: has_unread_messages column may not exist:', err.message);
    }
    
    try {
      await pool.query(`
        UPDATE users
        SET unread_message_count = 0
        WHERE unread_message_count > 0
      `);
      console.log('Successfully reset unread_message_count flag.');
    } catch (err) {
      console.warn('Warning: unread_message_count column may not exist:', err.message);
    }
    
    // Verify everything was deleted
    const newMatchesCountResult = await pool.query('SELECT COUNT(*) FROM matches');
    const newMessagesCountResult = await pool.query('SELECT COUNT(*) FROM messages');
    const newTypingStatusCountResult = await pool.query('SELECT COUNT(*) FROM typing_status');
    
    console.log(`\nVerification complete:`);
    console.log(`Matches: ${matchesCountResult.rows[0].count} → ${newMatchesCountResult.rows[0].count}`);
    console.log(`Messages: ${messagesCountResult.rows[0].count} → ${newMessagesCountResult.rows[0].count}`);
    console.log(`Typing Status: ${typingStatusCountResult.rows[0].count} → ${newTypingStatusCountResult.rows[0].count}`);
    
    if (newMatchesCountResult.rows[0].count === '0' && 
        newMessagesCountResult.rows[0].count === '0' &&
        newTypingStatusCountResult.rows[0].count === '0') {
      console.log('\n✅ SUCCESS: All matches, messages, likes, dislikes, and related records have been removed from the database.');
    } else {
      console.log('\n⚠️ WARNING: Some records may still exist. Please check the database manually.');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error deleting matches and messages:', error);
  }
}

// Show a warning before proceeding
console.warn('\n⚠️  WARNING: This will permanently delete ALL matches, messages, likes, and dislikes from the database!');
console.warn('⚠️  This operation cannot be undone!\n');

// Give a brief pause before proceeding
setTimeout(() => {
  console.log('Proceeding with deletion in 3 seconds...');
  setTimeout(deleteAllMatches, 3000);
}, 1000);