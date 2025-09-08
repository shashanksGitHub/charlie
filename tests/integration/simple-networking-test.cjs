const { neon } = require('@neondatabase/serverless');

async function testNetworkingConnection() {
  console.log('Testing networking connection creation...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Clean up existing connections
    await sql`DELETE FROM suite_networking_connections WHERE user_id = 18 AND target_user_id = 6`;
    
    // Get target profile ID
    const [profile] = await sql`SELECT id FROM suite_networking_profiles WHERE user_id = 6 LIMIT 1`;
    const targetProfileId = profile?.id || 8;
    
    console.log('Target profile ID:', targetProfileId);
    
    // Create networking connection directly
    const [newConnection] = await sql`
      INSERT INTO suite_networking_connections (
        user_id, 
        target_user_id, 
        target_profile_id, 
        action, 
        matched
      ) VALUES (
        18, 
        6, 
        ${targetProfileId}, 
        'like', 
        false
      ) 
      RETURNING *
    `;
    
    console.log('Created connection:', newConnection);
    
    // Verify connection exists
    const connections = await sql`
      SELECT * FROM suite_networking_connections 
      WHERE user_id = 18 AND target_user_id = 6
    `;
    
    console.log('Verification - found connections:', connections.length);
    
    if (connections.length > 0) {
      console.log('✅ Networking connection created successfully');
      console.log('💡 This connection should trigger a real-time WebSocket notification to user 6');
      console.log('💡 If user 6 is on /suite/connections, they should see a new grid card appear');
    } else {
      console.log('❌ Connection creation failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNetworkingConnection();