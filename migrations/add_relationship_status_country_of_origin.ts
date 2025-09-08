import { pool } from "../server/db";

/**
 * Migration to add relationship_status and country_of_origin fields to users table
 */
async function addNewFields() {
  try {
    console.log("Starting migration: Adding relationship_status and country_of_origin fields...");
    
    // Execute the ALTER TABLE queries
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS relationship_status TEXT,
      ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

// Execute the migration
addNewFields();