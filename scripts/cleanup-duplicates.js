/**
 * Clean up duplicate phone numbers in users table
 * This script identifies users with duplicate phone numbers and keeps only the most recent one
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanupDuplicatePhoneNumbers() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('🔍 Finding duplicate phone numbers...');
    
    // Find phone numbers that appear more than once
    const duplicateQuery = `
      SELECT phone_number, COUNT(*) as count
      FROM users
      WHERE phone_number IS NOT NULL AND phone_number != ''
      GROUP BY phone_number
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;
    
    const duplicateResult = await client.query(duplicateQuery);
    const duplicatePhoneNumbers = duplicateResult.rows;
    
    console.log(`Found ${duplicatePhoneNumbers.length} phone numbers with duplicates`);
    
    // For each duplicate phone number, keep only the most recent entry
    for (const duplicate of duplicatePhoneNumbers) {
      const phoneNumber = duplicate.phone_number;
      
      console.log(`Processing duplicate phone number: ${phoneNumber} (${duplicate.count} occurrences)`);
      
      // Get all users with this phone number, ordered by creation date (newest first)
      const usersQuery = `
        SELECT id, username, created_at
        FROM users
        WHERE phone_number = $1
        ORDER BY created_at DESC
      `;
      
      const usersResult = await client.query(usersQuery, [phoneNumber]);
      const users = usersResult.rows;
      
      // Keep the newest account and mark the rest for updating
      const newestUser = users[0];
      const olderUsers = users.slice(1);
      
      console.log(`Keeping newest user (ID: ${newestUser.id}, created: ${newestUser.created_at})`);
      
      // Update older accounts' phone numbers to NULL or a placeholder
      for (const user of olderUsers) {
        console.log(`Clearing phone number for user ID: ${user.id}, created: ${user.created_at}`);
        
        // Option 1: Set phone number to NULL
        // await client.query('UPDATE users SET phone_number = NULL WHERE id = $1', [user.id]);
        
        // Option 2: Set phone number to placeholder with original as suffix (for audit trail)
        const placeholderPhoneNumber = `REMOVED-${Date.now()}-${user.id}-${phoneNumber}`;
        await client.query('UPDATE users SET phone_number = $1 WHERE id = $2', [placeholderPhoneNumber, user.id]);
      }
    }
    
    // Create a unique constraint on the phone_number column
    console.log('Creating unique constraint on phone_number column...');
    await client.query('ALTER TABLE users ADD CONSTRAINT unique_phone_number UNIQUE (phone_number)');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Cleanup completed successfully');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning up duplicate phone numbers:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the cleanup function
cleanupDuplicatePhoneNumbers()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
    process.exit(1);
  });