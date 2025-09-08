import { config } from "dotenv";
import { pool } from "../server/db.js";

// Load environment variables
config();

/**
 * Migration to add section-specific primary photo fields to user_photos table
 * This allows each section (MEET, Jobs, Mentorship, Networking) to have independent primary photos
 */
async function addSectionPrimaryPhotoFields() {
  try {
    console.log(
      "Starting migration: Adding section-specific primary photo fields...",
    );

    // Execute the ALTER TABLE query to add new columns
    await pool.query(`
      ALTER TABLE user_photos 
      ADD COLUMN IF NOT EXISTS is_primary_for_meet BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_primary_for_job BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_primary_for_mentorship BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_primary_for_networking BOOLEAN DEFAULT FALSE;
    `);

    console.log(
      "✅ Added section-specific primary photo columns successfully!",
    );

    // Migrate existing primary photos to MEET section for backwards compatibility
    console.log("🔄 Migrating existing primary photos to MEET section...");

    await pool.query(`
      UPDATE user_photos 
      SET is_primary_for_meet = TRUE 
      WHERE is_primary = TRUE;
    `);

    console.log("✅ Migration completed successfully!");
    console.log("📸 Section-specific primary photos are now available for:");
    console.log("   - MEET dating app");
    console.log("   - SUITE Jobs");
    console.log("   - SUITE Mentorship");
    console.log("   - SUITE Networking");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

// Execute the migration
addSectionPrimaryPhotoFields();
