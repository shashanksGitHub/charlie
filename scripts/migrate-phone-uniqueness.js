/**
 * Migration script to push the unique constraint on phone_number column
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Run the migration
    await migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });
    
    console.log('✅ Migration completed successfully');
    pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();