import { db } from "./db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function addVisibilityPreferencesColumn() {
  try {
    console.log("Adding visibility_preferences column to users table...");

    // Execute raw SQL to add the column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS visibility_preferences TEXT;
    `);

    console.log("Column added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

// Run the function
addVisibilityPreferencesColumn();

// Also ensure personality_records column for the Godmodel system
async function addPersonalityRecordsColumn() {
  try {
    console.log("Adding personality_records column to users table...");
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS personality_records TEXT;
    `);
    console.log("personality_records column added (or already exists).");
    process.exit(0);
  } catch (error) {
    console.error("Error adding personality_records column:", error);
    process.exit(1);
  }
}

// Uncomment to run directly if needed
// addPersonalityRecordsColumn();
