/**
 * Script to safely remove all messages from the database
 * This script preserves all other data (users, matches, etc.)
 */

// Use CommonJS style for compatibility
const { db } = require('./server/db');
const { messages } = require('./shared/schema');
const { sql } = require('drizzle-orm');

async function clearAllMessages() {
  console.log('🗑️ Starting message deletion process...');
  
  try {
    // Count messages before deletion
    const countResult = await db.select({ count: sql`count(*)` }).from(messages);
    const messageCount = parseInt(countResult[0].count);
    
    console.log(`Found ${messageCount} messages to delete`);
    
    if (messageCount === 0) {
      console.log('No messages to delete. Database is already clear.');
      process.exit(0);
    }
    
    // Perform deletion with a safety check
    console.log('Deleting all messages...');
    const result = await db.delete(messages);
    
    console.log('✅ Successfully deleted all messages!');
    console.log(`Database is now clean and ready for testing.`);
    
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearAllMessages();