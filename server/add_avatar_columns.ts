import { db } from './db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function addAvatarColumns() {
  try {
    console.log('Adding avatar_photo and show_avatar columns to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_photo TEXT,
      ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN DEFAULT FALSE;
    `);
    console.log('Columns added successfully (or already exist).');
    process.exit(0);
  } catch (error) {
    console.error('Error adding avatar columns:', error);
    process.exit(1);
  }
}

addAvatarColumns();


