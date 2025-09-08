const { neon } = require('@neondatabase/serverless');

async function createTestNetworkingLike() {
  console.log('Creating test networking like to demonstrate grid cards...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Create a networking like from user 7 (Harry) to user 6 (Lupita)
    // This will make Harry appear in Lupita's "New Professional Likes" grid
    
    console.log('Step 1: Creating networking like from Harry (7) to Lupita (6)...');
    
    const [newConnection] = await sql`
      INSERT INTO suite_networking_connections (
        user_id, 
        target_user_id, 
        target_profile_id, 
        action, 
        matched
      ) VALUES (
        7,  -- Harry's user ID
        6,  -- Lupita's user ID  
        8,  -- Target networking profile ID
        'like', 
        false
      ) 
      RETURNING *
    `;
    
    console.log('Created networking connection:', newConnection);
    
    // Verify the connection was created
    console.log('\nStep 2: Verifying connection exists...');
    
    const connections = await sql`
      SELECT 
        snc.id, 
        snc.user_id, 
        snc.target_user_id, 
        snc.action, 
        snc.matched,
        u.full_name as liker_name,
        target_u.full_name as target_name
      FROM suite_networking_connections snc
      LEFT JOIN users u ON snc.user_id = u.id
      LEFT JOIN users target_u ON snc.target_user_id = target_u.id
      WHERE snc.target_user_id = 6 AND snc.action = 'like' AND snc.matched = false
    `;
    
    console.log('Incoming likes for Lupita (user 6):');
    connections.forEach(conn => {
      console.log(`  - ${conn.liker_name} (ID: ${conn.user_id}) liked ${conn.target_name}`);
    });
    
    console.log('\n✅ Test networking like created successfully!');
    console.log('💡 Now log in as Lupita (user 6) and go to Connections page to see Harry in the small grid cards');
    
  } catch (error) {
    console.error('Error creating test networking like:', error);
  }
}

createTestNetworkingLike();