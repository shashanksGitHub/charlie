const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function runAutoDeleteMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the auto-delete migration file
    const migrationSQL = fs.readFileSync('./migrations/add_auto_delete_settings.sql', 'utf8');
    console.log('Running auto-delete migration...');
    console.log('Migration SQL:', migrationSQL.substring(0, 200) + '...');

    // Execute the migration
    await client.query(migrationSQL);
    console.log('✅ Auto-delete migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runAutoDeleteMigration(); 