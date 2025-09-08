const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function runTimestampMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the timestamp migration file
    const migrationSQL = fs.readFileSync('./migrations/update_auto_delete_timestamp.sql', 'utf8');
    console.log('Running timestamp migration...');
    console.log('Migration SQL:', migrationSQL.substring(0, 200) + '...');

    // Execute the migration
    await client.query(migrationSQL);
    console.log('✅ Timestamp migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTimestampMigration(); 