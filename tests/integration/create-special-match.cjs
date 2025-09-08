/**
 * Special Match Creation Script
 * 
 * This script creates a confirmed match between two users
 * and adds welcome messages for immediate chat tab display.
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createSpecialMatch() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Create match between users 2 and 3 (confirmed match)
    const matchResult = await client.query(`
      INSERT INTO matches 
        (user_id_1, user_id_2, matched, created_at, has_unread_messages_1, has_unread_messages_2, last_message_at)
      VALUES
        (2, 3, true, NOW(), true, true, NOW())
      RETURNING id
    `);
    
    const matchId = matchResult.rows[0].id;
    console.log(`Created match with ID: ${matchId}`);
    
    // Add welcome messages
    await client.query(`
      INSERT INTO messages 
        (match_id, sender_id, receiver_id, content, read, created_at, message_type)
      VALUES
        ($1, 2, 3, 'Hey there! We matched! 🎉', false, NOW(), 'text'),
        ($1, 3, 2, 'Hello! Nice to meet you!', false, NOW() + interval '1 second', 'text')
    `, [matchId]);
    
    console.log('Created welcome messages');
    
    // Update unread message flags
    await client.query(`
      UPDATE matches 
      SET has_unread_messages_1 = true, has_unread_messages_2 = true 
      WHERE id = $1
    `, [matchId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Special match created successfully!');
    console.log(`Match ID: ${matchId}`);
    console.log('Users: 2 and 3');
    console.log('Status: Confirmed with welcome messages');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating special match:', error);
  } finally {
    client.release();
  }
}

// Execute the function
createSpecialMatch().finally(() => pool.end());