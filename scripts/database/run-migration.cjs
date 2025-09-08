const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running message reactions migration...');
    
    // Create a connection pool using the DATABASE_URL environment variable
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_message_reactions_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL:', migrationSQL);
    
    // Execute the migration
    const client = await pool.connect();
    
    try {
      await client.query(migrationSQL);
      console.log('✅ Message reactions table created successfully!');
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 