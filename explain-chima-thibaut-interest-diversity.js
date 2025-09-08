/**
 * INTEREST DIVERSITY EXPLANATION: CHIMA vs THIBAUT
 * 
 * This demonstrates Feature 1: Interest Diversity Enhancement using real user data
 * from Chima Ngozi and Thibaut Courtois to show how the algorithm works.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { advancedMatchingEngine } from './server/advanced-matching-algorithms.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

console.log('🎯 INTEREST DIVERSITY EXPLANATION: CHIMA vs THIBAUT');
console.log('=' .repeat(80));

async function explainInterestDiversity() {
  try {
    console.log('\n📊 STEP 1: Loading user interest data...');
    
    // Get Chima and Thibaut's data
    const users = await sql`
      SELECT 
        id, full_name, interests, created_at
      FROM users 
      WHERE id IN (7, 12)
      ORDER BY id
    `;
    
    const preferences = await sql`
      SELECT 
        user_id, interest_preferences
      FROM user_preferences 
      WHERE user_id IN (7, 12)
      ORDER BY user_id
    `;
    
    console.log(`✅ Loaded ${users.length} users and ${preferences.length} preference profiles`);
    
    const thibaut = users.find(u => u.id === 7);
    const chima = users.find(u => u.id === 12);
    const thibautPrefs = preferences.find(p => p.user_id === 7);
    const chimaPrefs = preferences.find(p => p.user_id === 12);
    
    console.log('\n👥 USER PROFILES:');
    console.log(`   🇪🇸 Thibaut Courtois (ID: 7)`);
    console.log(`      Current interests: ${thibaut?.interests || 'None'}`);
    console.log(`      Interest preferences: ${thibautPrefs?.interest_preferences || 'None'}`);
    console.log(`   🇺🇸 Chima Ngozi (ID: 12)`);
    console.log(`      Current interests: ${chima?.interests || 'None'}`);
    console.log(`      Interest preferences: ${chimaPrefs?.interest_preferences || 'None'}`);
    
    console.log('\n' + '=' .repeat(80));
    console.log('🧪 FEATURE 1: INTEREST DIVERSITY ALGORITHM EXPLANATION');
    console.log('=' .repeat(80));
    
    console.log('\n🔍 ALGORITHM OVERVIEW:');
    console.log('   Interest Diversity = (70% × Overlap Score) + (30% × Complementary Score)');
    console.log('   • Overlap Score: How many interests they share (common ground)');
    console.log('   • Complementary Score: How many unique interests candidate brings (discovery)');
    console.log('   • Weighted Balance: 70% familiarity + 30% novelty for optimal matching');
    
    if (thibaut && chima) {
      console.log('\n🔄 TESTING: Thibaut viewing Chima\'s profile');
      
      // Parse interests safely
      let thibautInterests = [];
      let chimaInterests = [];
      
      try {
        thibautInterests = thibaut.interests ? JSON.parse(thibaut.interests) : [];
        chimaInterests = chima.interests ? JSON.parse(chima.interests) : [];
      } catch (e) {
        console.log('⚠️ Interest parsing failed, using empty arrays');
      }
      
      console.log(`\n📋 INTEREST ANALYSIS:`);
      console.log(`   Thibaut's interests: [${thibautInterests.join(', ')}]`);
      console.log(`   Chima's interests: [${chimaInterests.join(', ')}]`);
      
      if (thibautInterests.length === 0 || chimaInterests.length === 0) {
        console.log('\n⚠️ EMPTY INTERESTS DETECTED:');
        console.log('   When users have empty interests, algorithm returns neutral 0.5 score');
        console.log('   This prevents bias against incomplete profiles');
        
        const diversityScore = advancedMatchingEngine.calculateInterestDiversity(chima, thibaut, thibautPrefs);
        console.log(`   ✅ Interest Diversity Score: ${diversityScore.toFixed(4)}`);
      } else {
        // Calculate overlap manually for explanation
        const thibautSet = new Set(thibautInterests);
        const chimaSet = new Set(chimaInterests);
        
        const commonInterests = chimaInterests.filter(interest => thibautSet.has(interest));
        const uniqueChimaInterests = chimaInterests.filter(interest => !thibautSet.has(interest));
        
        console.log(`\n🔗 OVERLAP ANALYSIS:`);
        console.log(`   Common interests: [${commonInterests.join(', ')}]`);
        console.log(`   Common count: ${commonInterests.length}`);
        console.log(`   Smaller profile size: ${Math.min(thibautInterests.length, chimaInterests.length)}`);
        const overlapRatio = commonInterests.length / Math.min(thibautInterests.length, chimaInterests.length);
        console.log(`   Overlap ratio: ${commonInterests.length}/${Math.min(thibautInterests.length, chimaInterests.length)} = ${overlapRatio.toFixed(3)}`);
        
        console.log(`\n🎁 COMPLEMENTARY ANALYSIS:`);
        console.log(`   Chima's unique interests: [${uniqueChimaInterests.join(', ')}]`);
        console.log(`   Unique count: ${uniqueChimaInterests.length}`);
        console.log(`   Chima's total interests: ${chimaInterests.length}`);
        const complementaryRatio = uniqueChimaInterests.length / chimaInterests.length;
        console.log(`   Complementary ratio: ${uniqueChimaInterests.length}/${chimaInterests.length} = ${complementaryRatio.toFixed(3)}`);
        
        console.log(`\n🧮 WEIGHTED CALCULATION:`);
        const diversityScore = (overlapRatio * 0.7) + (complementaryRatio * 0.3);
        console.log(`   Diversity Score = (${overlapRatio.toFixed(3)} × 0.7) + (${complementaryRatio.toFixed(3)} × 0.3)`);
        console.log(`   Diversity Score = ${(overlapRatio * 0.7).toFixed(3)} + ${(complementaryRatio * 0.3).toFixed(3)}`);
        console.log(`   ✅ Final Score = ${diversityScore.toFixed(4)}`);
        
        // Verify with actual algorithm
        const algorithmScore = advancedMatchingEngine.calculateInterestDiversity(chima, thibaut, thibautPrefs);
        console.log(`   🔍 Algorithm verification: ${algorithmScore.toFixed(4)}`);
        
        if (Math.abs(diversityScore - algorithmScore) < 0.001) {
          console.log(`   ✅ Manual calculation matches algorithm!`);
        } else {
          console.log(`   ⚠️ Calculation difference detected`);
        }
      }
      
      console.log('\n🔄 TESTING: Chima viewing Thibaut\'s profile');
      const reverseDiversityScore = advancedMatchingEngine.calculateInterestDiversity(thibaut, chima, chimaPrefs);
      console.log(`   ✅ Reverse Interest Diversity Score: ${reverseDiversityScore.toFixed(4)}`);
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('🎯 ALGORITHM BENEFITS & RATIONALE');
    console.log('=' .repeat(80));
    
    console.log(`\n✨ WHY THIS ALGORITHM WORKS:`);
    console.log(`   📈 70% Overlap Weight: Ensures compatibility through shared interests`);
    console.log(`   📈 30% Complementary Weight: Encourages discovery of new activities`);
    console.log(`   📈 Balanced Approach: Prevents both echo chambers and complete mismatches`);
    console.log(`   📈 Serendipitous Connections: Users discover new hobbies through matches`);
    
    console.log(`\n🚀 REAL-WORLD IMPACT:`);
    console.log(`   🎯 Dating: Partners share some interests but bring new experiences`);
    console.log(`   🎯 Networking: Professionals find common ground + learn new skills`);
    console.log(`   🎯 Mentorship: Mentors/mentees share field + explore adjacent areas`);
    console.log(`   🎯 User Retention: Interesting conversations from diverse yet compatible matches`);
    
    console.log(`\n🔄 INTEGRATION WITH HYBRID ENGINE:`);
    console.log(`   📊 Feature 1 integrates into VALUES score calculation`);
    console.log(`   📊 VALUES = (Personality + Values + Religion + Interests + Goals) / 5`);
    console.log(`   📊 Interest Diversity replaces simple interest matching`);
    console.log(`   📊 Contributes to 40% Content-Based Filtering in hybrid algorithm`);
    
    console.log('\n' + '=' .repeat(80));
    console.log('✅ INTEREST DIVERSITY EXPLANATION COMPLETE');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ ERROR in interest diversity explanation:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the explanation
explainInterestDiversity();