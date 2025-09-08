/**
 * Script to delete specific user IDs from the database
 * This will remove the specified users and all their related data
 */

require('dotenv').config();
const { Pool } = require('pg');

const usersToDelete = [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46];

async function clearSpecificUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Starting deletion of ${usersToDelete.length} users...`);
    
    // Start a transaction
    await pool.query('BEGIN');
    
    // First, remove all related data in the correct order to respect foreign key constraints
    for (const userId of usersToDelete) {
      console.log(`Clearing data for user ID ${userId}...`);
      
      // Clear user typing status
      await pool.query('DELETE FROM typing_status WHERE user_id = $1', [userId]);
      console.log(`- Deleted typing status for user ${userId}`);
      
      // Clear user messages
      await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      console.log(`- Deleted messages for user ${userId}`);
      
      // Clear user matches
      await pool.query('DELETE FROM matches WHERE user_id_1 = $1 OR user_id_2 = $1', [userId]);
      console.log(`- Deleted matches for user ${userId}`);
      
      // Clear user interests
      await pool.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
      console.log(`- Deleted interests for user ${userId}`);
      
      // Clear user preferences
      await pool.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
      console.log(`- Deleted preferences for user ${userId}`);
      
      // Clear user photos
      await pool.query('DELETE FROM user_photos WHERE user_id = $1', [userId]);
      console.log(`- Deleted photos for user ${userId}`);
      
      // Clear video calls
      await pool.query('DELETE FROM video_calls WHERE initiator_id = $1 OR receiver_id = $1', [userId]);
      console.log(`- Deleted video calls for user ${userId}`);
      
      // Finally delete the user
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      
      if (result.rowCount > 0) {
        console.log(`✓ Successfully deleted user ${userId}`);
      } else {
        console.log(`⚠ User ${userId} not found in database`);
      }
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    console.log(`\n✅ Successfully cleared ${usersToDelete.length} users from the database`);
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error clearing users:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

clearSpecificUsers().catch(console.error);