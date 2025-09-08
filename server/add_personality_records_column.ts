import { db } from './db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addPersonalityRecordsColumn() {
  try {
    console.log('Adding personality_records column to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS personality_records TEXT;
    `);
    console.log('personality_records column added successfully (or already exists).');
    process.exit(0);
  } catch (error) {
    console.error('Error adding personality_records column:', error);
    process.exit(1);
  }
}

// Run the function
addPersonalityRecordsColumn();


