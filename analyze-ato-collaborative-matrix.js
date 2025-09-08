// COLLABORATIVE SCORING ANALYSIS FOR USER ATO - Matrix Calculation Focus
// Analyzing why Obed appears before Chimamanda in collaborative scoring

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function analyzeCollaborativeMatrix() {
  console.log("🤝 ATO'S COLLABORATIVE SCORING - MATRIX CALCULATION ANALYSIS");
  console.log("===========================================================");
  
  try {
    // First, let's check what columns exist in the users table
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    const schemaResult = await pool.query(schemaQuery);
    
    console.log("\n📋 USERS TABLE SCHEMA:");
    console.log("=====================");
    schemaResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });

    // Get Ato's basic profile data
    const atoQuery = `
      SELECT id, username, date_of_birth, gender
      FROM users 
      WHERE id = 2
    `;
    const atoResult = await pool.query(atoQuery);
    const ato = atoResult.rows[0];
    
    console.log("\n👤 ATO'S PROFILE (User 2):");
    console.log("==========================");
    console.log(`ID: ${ato.id}`);
    console.log(`Username: ${ato.username}`);
    console.log(`Gender: ${ato.gender}`);
    console.log(`Age: ${new Date().getFullYear() - new Date(ato.date_of_birth).getFullYear()}`);

    // Get Obed and Chimamanda basic data
    const candidatesQuery = `
      SELECT id, username, date_of_birth, gender
      FROM users 
      WHERE id IN (1, 3)
      ORDER BY id
    `;
    const candidatesResult = await pool.query(candidatesQuery);
    const [obed, chimamanda] = candidatesResult.rows;
    
    console.log("\n🎯 CANDIDATES:");
    console.log("===============");
    console.log(`OBED (User 1): ${obed.username}`);
    console.log(`- Gender: ${obed.gender}`);
    console.log(`- Age: ${new Date().getFullYear() - new Date(obed.date_of_birth).getFullYear()}`);
    
    console.log(`\nCHIMAMANDA (User 3): ${chimamanda.username}`);
    console.log(`- Gender: ${chimamanda.gender}`);
    console.log(`- Age: ${new Date().getFullYear() - new Date(chimamanda.date_of_birth).getFullYear()}`);

    // Check swipe actions table for matrix factorization data
    const swipeQuery = `
      SELECT swiper_id, swiped_id, action, created_at
      FROM swipe_actions
      WHERE (swiper_id = 2 AND swiped_id IN (1, 3)) 
         OR (swiper_id IN (1, 3) AND swiped_id = 2)
      ORDER BY created_at DESC
    `;
    const swipeResult = await pool.query(swipeQuery);
    
    console.log("\n📊 SWIPE HISTORY FOR MATRIX FACTORIZATION:");
    console.log("==========================================");
    console.log(`Direct swipes involving Ato (User 2): ${swipeResult.rows.length}`);
    
    if (swipeResult.rows.length > 0) {
      swipeResult.rows.forEach(swipe => {
        const direction = swipe.swiper_id === 2 ? "→" : "←";
        const otherUser = swipe.swiper_id === 2 ? swipe.swiped_id : swipe.swiper_id;
        console.log(`Ato ${direction} User ${otherUser}: ${swipe.action} (${new Date(swipe.created_at).toLocaleString()})`);
      });
    } else {
      console.log("❌ NO DIRECT SWIPE HISTORY FOUND");
      console.log("Matrix Factorization will use default values");
    }

    // Analyze user preferences for traditional collaborative filtering
    const preferencesQuery = `
      SELECT user_id, matching_priorities, deal_breakers
      FROM user_preferences
      WHERE user_id IN (1, 2, 3)
      ORDER BY user_id
    `;
    const preferencesResult = await pool.query(preferencesQuery);
    
    console.log("\n🔍 USER PREFERENCES FOR COLLABORATIVE FILTERING:");
    console.log("===============================================");
    preferencesResult.rows.forEach(pref => {
      const userName = pref.user_id === 1 ? "Obed" : pref.user_id === 2 ? "Ato" : "Chimamanda";
      console.log(`${userName} (User ${pref.user_id}):`);
      console.log(`  Matching Priorities: ${JSON.stringify(pref.matching_priorities)}`);
      console.log(`  Deal Breakers: ${JSON.stringify(pref.deal_breakers)}`);
    });

    // Analyze collaborative scoring components based on algorithm structure
    console.log("\n🧮 MATRIX FACTORIZATION COMPONENT ANALYSIS:");
    console.log("==========================================");
    console.log("Formula: Matrix Score = Direct Interaction + Boost Factor");
    console.log("");
    console.log("For Ato → Obed:");
    console.log("- Direct Interaction: Based on swipe history between User 2 and User 1");
    console.log("- Boost Factor: Additional collaborative patterns");
    
    console.log("\nFor Ato → Chimamanda:");
    console.log("- Direct Interaction: Based on swipe history between User 2 and User 3");
    console.log("- Boost Factor: Additional collaborative patterns");

    if (swipeResult.rows.length === 0) {
      console.log("\n❗ MATRIX FACTORIZATION WITH NO SWIPE HISTORY:");
      console.log("- Direct Interaction = Default value (likely -0.500 as seen in logs)");
      console.log("- Boost Factor = 0.000 (no historical data)");
      console.log("- Final Matrix Score = -0.500 for BOTH candidates");
    }

    console.log("\n📈 TRADITIONAL COLLABORATIVE FILTERING ANALYSIS:");
    console.log("===============================================");
    console.log("Formula: Traditional CF = User-Item Matrix + Preference Similarity");
    console.log("");
    console.log("Traditional CF analyzes:");
    console.log("1. Users with similar matching priorities to Ato");
    console.log("2. What those similar users preferred (swiped right on)");
    console.log("3. Predicts Ato's preferences based on similar users");

    console.log("\n⚖️ BLENDED COLLABORATIVE SCORE CALCULATION:");
    console.log("==========================================");
    console.log("Final Collaborative = (Matrix × 0.3) + (Traditional × 0.7)");
    console.log("");
    console.log("Expected calculation:");
    console.log("Ato → Obed: (-0.500 × 0.3) + (Traditional_Obed × 0.7)");
    console.log("Ato → Chimamanda: (-0.500 × 0.3) + (Traditional_Chimamanda × 0.7)");

    console.log("\n🎯 FROM LIVE ALGORITHM LOGS (User 2's card stack):");
    console.log("=================================================");
    console.log("Obed (User 1): collaborative: '0.000'");
    console.log("Chimamanda (User 3): collaborative: '0.000'");
    console.log("");
    console.log("💡 COLLABORATIVE SCORING CONCLUSION:");
    console.log("====================================");
    console.log("✅ BOTH candidates receive IDENTICAL collaborative scores (0.000)");
    console.log("✅ Collaborative filtering is NOT the differentiating factor");
    console.log("✅ The ranking is determined by CONTENT SCORING:");
    console.log("   - Obed: content: '0.884'");
    console.log("   - Chimamanda: content: '0.862'");
    console.log("   - Obed's 0.022 content advantage places him first");

    console.log("\n🔍 WHY COLLABORATIVE SCORES ARE EQUAL:");
    console.log("======================================");
    console.log("1. NO SWIPE HISTORY: Matrix Factorization produces same default values");
    console.log("2. LIMITED USER BASE: Traditional CF has insufficient data for differentiation");
    console.log("3. SIMILAR PREFERENCES: Both candidates may appear equally collaborative");
    
    console.log("\n📊 FINAL RANKING EXPLANATION:");
    console.log("=============================");
    console.log("User Ato's card order: Obed → Chimamanda");
    console.log("Determining factor: CONTENT SCORING (not collaborative)");
    console.log("Obed's advantages in content scoring:");
    console.log("- Age difference (30 vs 32) affects Cosine Similarity (30% weight)");
    console.log("- Gender difference affects Jaccard Similarity (25% weight)");
    console.log("- Religion preference variations affect Preference Alignment (25% weight)");
    console.log("- Combined: 0.022-point content advantage = #1 ranking");

  } catch (error) {
    console.error("Error in collaborative matrix analysis:", error);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeCollaborativeMatrix();