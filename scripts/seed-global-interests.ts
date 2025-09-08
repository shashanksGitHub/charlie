import { db } from "../server/db";
import { storage } from "../server/storage";
import { globalInterests } from "@shared/schema";
import { initialInterests } from "../client/src/lib/interest-categories";

/**
 * Seeds the global_interests table with initial interests
 */
async function seedGlobalInterests() {
  console.log("Checking for existing global interests...");
  
  // Get count of existing interests
  const count = await db.select({ count: sql`count(*)` }).from(globalInterests);
  const interestCount = parseInt(count[0].count.toString());
  
  if (interestCount > 0) {
    console.log(`Found ${interestCount} existing interests. Skipping seed.`);
    return;
  }
  
  console.log("No existing interests found. Seeding global interests...");
  
  // Flatten all interests into a single array
  const allInterests = Object.values(initialInterests).flat();
  
  // Add all interests to the database
  for (const interest of allInterests) {
    try {
      const category = Object.keys(initialInterests).find(
        cat => initialInterests[cat].includes(interest)
      );
      
      await storage.addGlobalInterest({
        interest,
        category: category || "Other",
        createdBy: null // System-created
      });
      
      console.log(`Added: ${interest} (${category})`);
    } catch (err) {
      console.error(`Error adding interest "${interest}":`, err);
    }
  }
  
  console.log("Global interests seeding complete!");
}

// Import missing dependencies
import { sql } from "drizzle-orm";

// Run the seed function
seedGlobalInterests()
  .then(() => {
    console.log("Finished seeding global interests");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error seeding global interests:", err);
    process.exit(1);
  });