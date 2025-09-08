/**
 * Debug script to test mentorship visibility preferences loading and display
 * This will help identify why toggles show opposite values from database
 */

const { neon } = require("@neondatabase/serverless");

async function debugMentorshipVisibility() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("=== Debugging Mentorship Visibility Preferences ===\n");
  
  // Get Thibaut's mentorship profile
  const mentorshipProfile = await sql`
    SELECT id, user_id, role, visibility_preferences 
    FROM suite_mentorship_profiles 
    WHERE user_id = 1
    ORDER BY updated_at DESC 
    LIMIT 1
  `;
  
  if (mentorshipProfile.length === 0) {
    console.log("❌ No mentorship profile found for user 1 (Thibaut)");
    return;
  }
  
  const profile = mentorshipProfile[0];
  console.log("📋 Found mentorship profile:");
  console.log(`   User ID: ${profile.user_id}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Profile ID: ${profile.id}`);
  
  console.log("\n🔍 Visibility Preferences from Database:");
  console.log(`   Raw JSON: ${profile.visibility_preferences}`);
  
  if (profile.visibility_preferences) {
    try {
      const parsed = JSON.parse(profile.visibility_preferences);
      console.log("\n📊 Parsed Visibility Preferences:");
      
      // Check each field that should be false according to the database
      const expectedFalse = [
        'showProfilePhoto',
        'timeCommitment', 
        'availability',
        'location',
        'languagesSpoken',
        'learningGoals',
        'whySeekMentorship',
        'preferredMentorshipStyle',
        'industryAspiration'
      ];
      
      const expectedTrue = [
        'professionalTagline',
        'role',
        'timezone',
        'areasOfExpertise',
        'mentorshipStyle',
        'whyMentor',
        'industriesOrDomains'
      ];
      
      console.log("\n✅ Fields that should show ENABLED toggles:");
      expectedTrue.forEach(field => {
        const value = parsed[field];
        const status = value === true ? "✓ CORRECT" : "❌ WRONG";
        console.log(`   ${field}: ${value} ${status}`);
      });
      
      console.log("\n❌ Fields that should show DISABLED toggles:");
      expectedFalse.forEach(field => {
        const value = parsed[field];
        const status = value === false ? "✓ CORRECT" : "❌ WRONG";
        console.log(`   ${field}: ${value} ${status}`);
      });
      
    } catch (error) {
      console.error("❌ Error parsing visibility preferences JSON:", error);
    }
  } else {
    console.log("⚠️  No visibility preferences JSON found");
  }
  
  console.log("\n💡 Expected UI Toggle States:");
  console.log("   If database shows FALSE → UI toggle should be OFF");
  console.log("   If database shows TRUE → UI toggle should be ON");
  console.log("\n🔧 If toggles show opposite values, there's a React state issue");
}

if (require.main === module) {
  debugMentorshipVisibility().catch(console.error);
}

module.exports = debugMentorshipVisibility;