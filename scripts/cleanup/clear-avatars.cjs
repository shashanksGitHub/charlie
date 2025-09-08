/**
 * Script to clean up all avatar-related data from the MEET app
 * 
 * This script will:
 * 1. Reset all avatarUrl fields to null in the users table
 * 2. Set all showAsAvatar toggles to false
 * 3. Log the cleanup for verification
 */

// Import required modules
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, sql } = require('drizzle-orm');
const ws = require('ws');

// Configure WebSocket for Neon
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

// Get database schema
const schema = require('./shared/schema');
const { users } = schema;

// Create a database connection
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { users } });

async function clearAllAvatars() {
  console.log('Starting avatar cleanup...');
  
  try {
    // Get count of users with avatars before cleanup
    const usersWithAvatars = await db.select({
      count: sql`count(*)::int`,
    }).from(users)
      .where(sql`avatar_url IS NOT NULL`);
    
    const usersWithAvatarToggle = await db.select({
      count: sql`count(*)::int`,
    }).from(users)
      .where(eq(users.showAsAvatar, true));
    
    console.log(`Found ${usersWithAvatars[0]?.count || 0} users with avatar URLs`);
    console.log(`Found ${usersWithAvatarToggle[0]?.count || 0} users with avatar toggle enabled`);
    
    // Reset all avatar URLs to null
    const resetUrlsResult = await db.update(users)
      .set({ avatarUrl: null })
      .where(sql`avatar_url IS NOT NULL`);
    
    // Disable all avatar toggles
    const resetTogglesResult = await db.update(users)
      .set({ showAsAvatar: false })
      .where(eq(users.showAsAvatar, true));
    
    console.log('Avatar cleanup completed successfully');
    console.log(`Reset ${usersWithAvatars[0]?.count || 0} avatar URLs to null`);
    console.log(`Disabled ${usersWithAvatarToggle[0]?.count || 0} avatar toggles`);
    
    return {
      success: true,
      urlsReset: usersWithAvatars[0]?.count || 0,
      togglesReset: usersWithAvatarToggle[0]?.count || 0
    };
  } catch (error) {
    console.error('Error during avatar cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the cleanup
clearAllAvatars()
  .then(result => {
    console.log('Cleanup result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error during cleanup:', err);
    process.exit(1);
  });

// Export for potential import elsewhere
module.exports = { clearAllAvatars };