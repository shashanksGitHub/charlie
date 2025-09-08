/**
 * Combined script to enforce phone number uniqueness
 * This script:
 * 1. Cleans up duplicate phone numbers
 * 2. Applies the unique constraint directly with SQL
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './shared/schema.js';
import ws from 'ws';

// Configure neon to use the ws package
neonConfig.webSocketConstructor = ws;

async function enforcePhoneUniqueness() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
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
      
      // Update older accounts' phone numbers to a placeholder
      for (const user of olderUsers) {
        console.log(`Clearing phone number for user ID: ${user.id}, created: ${user.created_at}`);
        const placeholderPhoneNumber = `REMOVED-${Date.now()}-${user.id}-${phoneNumber}`;
        await client.query('UPDATE users SET phone_number = $1 WHERE id = $2', [placeholderPhoneNumber, user.id]);
      }
    }
    
    // Create a unique constraint on the phone_number column if it doesn't exist
    console.log('Creating unique constraint on phone_number column...');
    
    // Check if constraint already exists
    const constraintCheckQuery = `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'users_phone_number_unique'
    `;
    
    const constraintResult = await client.query(constraintCheckQuery);
    
    if (constraintResult.rows.length === 0) {
      await client.query('ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number)');
      console.log('Unique constraint added successfully');
    } else {
      console.log('Unique constraint already exists');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Phone number uniqueness enforcement completed successfully');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error enforcing phone number uniqueness:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the enforcement function
enforcePhoneUniqueness()
  .then(() => {
    console.log('Script execution completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script execution failed:', err);
    process.exit(1);
  });