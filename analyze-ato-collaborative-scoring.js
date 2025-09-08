// COLLABORATIVE SCORING ANALYSIS FOR USER ATO
// Comprehensive analysis of Matrix Calculation determining Obed vs Chimamanda ranking

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function analyzeAtoCollaborativeScoring() {
  console.log("🤝 COLLABORATIVE SCORING ANALYSIS FOR USER ATO (User 2)");
  console.log("========================================================");
  
  try {
    // Get Ato's profile and preferences
    const atoQuery = `
      SELECT u.id, u.username, u.first_name, u.date_of_birth, u.gender,
             p.matching_priorities, p.deal_breakers
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id = 2
    `;
    const atoResult = await pool.query(atoQuery);
    const ato = atoResult.rows[0];
    
    console.log("\n👤 ATO'S PROFILE:");
    console.log(`User ID: ${ato.id}`);
    console.log(`Name: ${ato.first_name} (${ato.username})`);
    console.log(`Gender: ${ato.gender}`);
    console.log(`Age: ${new Date().getFullYear() - new Date(ato.date_of_birth).getFullYear()}`);
    console.log(`Matching Priorities: ${JSON.stringify(ato.matching_priorities)}`);
    console.log(`Deal Breakers: ${JSON.stringify(ato.deal_breakers)}`);

    // Get Obed and Chimamanda profiles
    const candidatesQuery = `
      SELECT u.id, u.username, u.first_name, u.date_of_birth, u.gender,
             p.matching_priorities, p.deal_breakers
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id IN (1, 3)
      ORDER BY u.id
    `;
    const candidatesResult = await pool.query(candidatesQuery);
    const [obed, chimamanda] = candidatesResult.rows;
    
    console.log("\n🎯 CANDIDATES BEING ANALYZED:");
    console.log("============================");
    console.log(`OBED (User 1): ${obed.first_name} (${obed.username})`);
    console.log(`- Gender: ${obed.gender}`);
    console.log(`- Age: ${new Date().getFullYear() - new Date(obed.date_of_birth).getFullYear()}`);
    console.log(`- Priorities: ${JSON.stringify(obed.matching_priorities)}`);
    
    console.log(`\nCHIMAMANDA (User 3): ${chimamanda.first_name} (${chimamanda.username})`);
    console.log(`- Gender: ${chimamanda.gender}`);
    console.log(`- Age: ${new Date().getFullYear() - new Date(chimamanda.date_of_birth).getFullYear()}`);
    console.log(`- Priorities: ${JSON.stringify(chimamanda.matching_priorities)}`);

    // Get swipe history data for matrix factorization
    const swipeHistoryQuery = `
      SELECT swiper_id, swiped_id, action, created_at
      FROM swipe_actions
      WHERE swiper_id = 2 OR swiped_id = 2 OR swiper_id IN (1, 3) OR swiped_id IN (1, 3)
      ORDER BY created_at DESC
    `;
    const swipeResult = await pool.query(swipeHistoryQuery);
    
    console.log("\n📊 SWIPE HISTORY DATA (Matrix Factorization Input):");
    console.log("===================================================");
    console.log(`Total swipe records found: ${swipeResult.rows.length}`);
    
    if (swipeResult.rows.length > 0) {
      console.log("\nRecent swipe interactions:");
      swipeResult.rows.slice(0, 10).forEach(swipe => {
        console.log(`User ${swipe.swiper_id} → User ${swipe.swiped_id}: ${swipe.action} (${swipe.created_at})`);
      });
    } else {
      console.log("No swipe history found - Matrix Factorization will use default values");
    }

    // Analyze Traditional Collaborative Filtering
    console.log("\n🔍 TRADITIONAL COLLABORATIVE FILTERING ANALYSIS:");
    console.log("================================================");
    
    // Find similar users to Ato based on preferences
    const similarUsersQuery = `
      SELECT u.id, u.first_name, p.matching_priorities,
             CASE 
               WHEN p.matching_priorities = $1 THEN 1.0
               WHEN p.matching_priorities IS NULL THEN 0.0
               ELSE 0.5
             END as priority_similarity
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id != 2 AND u.has_activated_profile = true
      ORDER BY priority_similarity DESC
    `;
    const similarResult = await pool.query(similarUsersQuery, [JSON.stringify(ato.matching_priorities)]);
    
    console.log("Users with similar preferences to Ato:");
    similarResult.rows.slice(0, 5).forEach(user => {
      console.log(`User ${user.id} (${user.first_name}): ${user.priority_similarity} similarity`);
      console.log(`  Priorities: ${JSON.stringify(user.matching_priorities)}`);
    });

    // Matrix Factorization Component Analysis
    console.log("\n🧮 MATRIX FACTORIZATION COMPONENT:");
    console.log("===================================");
    console.log("Matrix Factorization Score = Direct Interaction + Boost Factor");
    console.log("Direct Interaction: Based on actual swipe history between users");
    console.log("Boost Factor: Additional weight from collaborative patterns");
    
    console.log("\nFor Ato → Obed interaction:");
    console.log("- Looking for direct swipes between User 2 and User 1");
    console.log("- Analyzing indirect patterns through shared connections");
    
    console.log("\nFor Ato → Chimamanda interaction:");
    console.log("- Looking for direct swipes between User 2 and User 3");
    console.log("- Analyzing indirect patterns through shared connections");

    // Traditional Collaborative Component Analysis
    console.log("\n📈 TRADITIONAL COLLABORATIVE FILTERING:");
    console.log("=======================================");
    console.log("Traditional CF Score = User-Item Matrix + Preference Similarity");
    console.log("- Analyzes users with similar preferences");
    console.log("- Predicts preferences based on similar user behavior");
    console.log("- Uses implicit feedback from swipe patterns");

    // Blended Score Calculation
    console.log("\n⚖️ BLENDED COLLABORATIVE SCORE:");
    console.log("===============================");
    console.log("Final Collaborative Score = (Matrix * 0.3) + (Traditional * 0.7)");
    console.log("- Matrix Factorization: 30% weight (direct interactions)");
    console.log("- Traditional CF: 70% weight (preference similarity)");

    // Expected outcomes based on data
    console.log("\n🎯 EXPECTED COLLABORATIVE SCORING OUTCOMES:");
    console.log("===========================================");
    
    if (swipeResult.rows.length === 0) {
      console.log("NO SWIPE HISTORY SCENARIO:");
      console.log("- Matrix Factorization: Default values (likely 0.0 or negative)");
      console.log("- Traditional CF: Based on preference similarity only");
      console.log("- Both Obed and Chimamanda likely get similar collaborative scores");
      console.log("- Content scoring (0.022 advantage) becomes the deciding factor");
    } else {
      console.log("WITH SWIPE HISTORY:");
      console.log("- Matrix scores based on actual interaction patterns");
      console.log("- Traditional CF incorporates learned user preferences");
      console.log("- Collaborative scores may differentiate candidates");
    }

    console.log("\n💡 KEY INSIGHT FOR ATO'S CARD ORDERING:");
    console.log("=======================================");
    console.log("If collaborative scores are equal (0.000 for both as seen in logs),");
    console.log("then Obed's 0.022 content advantage is the PRIMARY factor");
    console.log("determining why he appears first in Ato's card stack.");
    
    console.log("\nThe collaborative component confirms user preference patterns");
    console.log("but doesn't override the content-based ranking in this case.");

  } catch (error) {
    console.error("Error in collaborative scoring analysis:", error);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeAtoCollaborativeScoring();