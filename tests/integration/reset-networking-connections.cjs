/**
 * Reset networking connections for testing real-time notifications
 */
const { sql } = require('@neondatabase/serverless');

async function resetNetworkingConnections() {
  try {
    console.log('Resetting networking connections for fresh testing...');
    
    // Delete all networking connections to start fresh
    const deleted = await sql`
      DELETE FROM suite_networking_connections
      WHERE user_id = 18 OR target_user_id = 18
    `;
    
    console.log(`Deleted ${deleted.length} networking connections for user 18`);
    
    // Verify clean state
    const remaining = await sql`
      SELECT * FROM suite_networking_connections
      WHERE user_id = 18 OR target_user_id = 18
    `;
    
    console.log(`Remaining connections: ${remaining.length}`);
    console.log('✅ Networking connections reset complete');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting networking connections:', error);
    process.exit(1);
  }
}

resetNetworkingConnections();