#!/usr/bin/env node

/**
 * JACCARD SIMILARITY ALGORITHM EXPLANATION
 * Using Real User Data: Chima and Thibaut
 * 
 * This demonstrates how all 8 categorical features work together
 * to calculate bidirectional compatibility scores.
 */

import { storage } from './server/storage.ts';
import { advancedMatchingEngine } from './server/advanced-matching-algorithms.ts';

async function explainJaccardAlgorithmWithChimaThibaut() {
  console.log('\n🎯 JACCARD SIMILARITY ALGORITHM EXPLANATION');
  console.log('Using Real Users: Chima and Thibaut');
  console.log('=============================================\n');

  try {
    // Find Chima and Thibaut by searching users
    const allUsers = await storage.getAllUsers();
    
    let chima = null;
    let thibaut = null;
    
    // Search for users by name patterns
    for (const user of allUsers) {
      const fullName = (user.fullName || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      
      if (fullName.includes('chim') || firstName.includes('chim')) {
        chima = user;
      }
      if (fullName.includes('thib') || firstName.includes('thib')) {
        thibaut = user;
      }
    }

    if (!chima || !thibaut) {
      console.log('🔍 SEARCHING FOR USERS WITH SIMILAR NAMES...');
      console.log('Available users:');
      allUsers.slice(0, 20).forEach(user => {
        console.log(`  User ${user.id}: ${user.fullName || user.firstName || 'No Name'}`);
      });
      
      // Let's use users we know exist from the logs
      chima = await storage.getUser(11); // Obed (we'll call him Chima for demo)
      thibaut = await storage.getUser(9); // Fran (we'll call him Thibaut for demo)
      
      console.log('\n📝 Using available users for demonstration:');
      console.log(`  "Chima" (User ${chima?.id}): ${chima?.fullName || 'No Name'}`);
      console.log(`  "Thibaut" (User ${thibaut?.id}): ${thibaut?.fullName || 'No Name'}`);
    }

    if (!chima || !thibaut) {
      console.error('❌ Could not find suitable users for demonstration');
      return;
    }

    // Get their preferences
    const chimaPrefs = await storage.getUserPreferences(chima.id);
    const thibautPrefs = await storage.getUserPreferences(thibaut.id);

    console.log('\n👥 USER PROFILES LOADED');
    console.log('========================');
    console.log(`Chima (User ${chima.id}):`);
    console.log(`  Name: ${chima.fullName || chima.firstName || 'No Name'}`);
    console.log(`  Email: ${chima.email || 'No Email'}`);
    console.log();
    console.log(`Thibaut (User ${thibaut.id}):`);
    console.log(`  Name: ${thibaut.fullName || thibaut.firstName || 'No Name'}`);
    console.log(`  Email: ${thibaut.email || 'No Email'}`);
    console.log();

    console.log('🧬 DETAILED CATEGORICAL FEATURE ANALYSIS');
    console.log('==========================================');
    
    console.log('FEATURE 1: ETHNICITY + SECONDARY TRIBE (Weight: 15%)');
    console.log('-----------------------------------------------------');
    console.log(`Chima's Ethnicity: ${chima.ethnicity || 'Not specified'}`);
    console.log(`Chima's Secondary Tribe: ${chima.secondaryTribe || 'Not specified'}`);
    console.log(`Thibaut's Ethnicity: ${thibaut.ethnicity || 'Not specified'}`);
    console.log(`Thibaut's Secondary Tribe: ${thibaut.secondaryTribe || 'Not specified'}`);
    
    if (chimaPrefs?.ethnicityPreference) {
      try {
        const chimaEthnicityPrefs = JSON.parse(chimaPrefs.ethnicityPreference);
        console.log(`Chima's Ethnicity Preferences: ${Array.isArray(chimaEthnicityPrefs) ? chimaEthnicityPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Chima's Ethnicity Preferences: ${chimaPrefs.ethnicityPreference}`);
      }
    } else {
      console.log(`Chima's Ethnicity Preferences: Not specified`);
    }
    
    if (thibautPrefs?.ethnicityPreference) {
      try {
        const thibautEthnicityPrefs = JSON.parse(thibautPrefs.ethnicityPreference);
        console.log(`Thibaut's Ethnicity Preferences: ${Array.isArray(thibautEthnicityPrefs) ? thibautEthnicityPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Thibaut's Ethnicity Preferences: ${thibautPrefs.ethnicityPreference}`);
      }
    } else {
      console.log(`Thibaut's Ethnicity Preferences: Not specified`);
    }
    console.log();

    console.log('FEATURE 2: RELIGION (Weight: 20% - Highest Priority)');
    console.log('---------------------------------------------------');
    console.log(`Chima's Religion: ${chima.religion || 'Not specified'}`);
    console.log(`Thibaut's Religion: ${thibaut.religion || 'Not specified'}`);
    
    if (chimaPrefs?.religionPreference) {
      try {
        const chimaReligionPrefs = JSON.parse(chimaPrefs.religionPreference);
        console.log(`Chima's Religion Preferences: ${Array.isArray(chimaReligionPrefs) ? chimaReligionPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Chima's Religion Preferences: ${chimaPrefs.religionPreference}`);
      }
    } else {
      console.log(`Chima's Religion Preferences: Not specified`);
    }
    
    if (thibautPrefs?.religionPreference) {
      try {
        const thibautReligionPrefs = JSON.parse(thibautPrefs.religionPreference);
        console.log(`Thibaut's Religion Preferences: ${Array.isArray(thibautReligionPrefs) ? thibautReligionPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Thibaut's Religion Preferences: ${thibautPrefs.religionPreference}`);
      }
    } else {
      console.log(`Thibaut's Religion Preferences: Not specified`);
    }
    console.log();

    console.log('FEATURE 3: BODY TYPE (Weight: 10%)');
    console.log('----------------------------------');
    console.log(`Chima's Body Type: ${chima.bodyType || 'Not specified'}`);
    console.log(`Thibaut's Body Type: ${thibaut.bodyType || 'Not specified'}`);
    
    if (chimaPrefs?.bodyTypePreference) {
      try {
        const chimaBodyPrefs = JSON.parse(chimaPrefs.bodyTypePreference);
        console.log(`Chima's Body Type Preferences: ${Array.isArray(chimaBodyPrefs) ? chimaBodyPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Chima's Body Type Preferences: ${chimaPrefs.bodyTypePreference}`);
      }
    } else {
      console.log(`Chima's Body Type Preferences: Not specified`);
    }
    
    if (thibautPrefs?.bodyTypePreference) {
      try {
        const thibautBodyPrefs = JSON.parse(thibautPrefs.bodyTypePreference);
        console.log(`Thibaut's Body Type Preferences: ${Array.isArray(thibautBodyPrefs) ? thibautBodyPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Thibaut's Body Type Preferences: ${thibautPrefs.bodyTypePreference}`);
      }
    } else {
      console.log(`Thibaut's Body Type Preferences: Not specified`);
    }
    console.log();

    console.log('FEATURE 4: EDUCATION LEVEL (Weight: 15%)');
    console.log('----------------------------------------');
    console.log(`Chima's Education: ${chima.educationLevel || 'Not specified'}`);
    console.log(`Thibaut's Education: ${thibaut.educationLevel || 'Not specified'}`);
    
    if (chimaPrefs?.educationLevelPreference) {
      try {
        const chimaEduPrefs = JSON.parse(chimaPrefs.educationLevelPreference);
        console.log(`Chima's Education Preferences: ${Array.isArray(chimaEduPrefs) ? chimaEduPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Chima's Education Preferences: ${chimaPrefs.educationLevelPreference}`);
      }
    } else {
      console.log(`Chima's Education Preferences: Not specified`);
    }
    
    if (thibautPrefs?.educationLevelPreference) {
      try {
        const thibautEduPrefs = JSON.parse(thibautPrefs.educationLevelPreference);
        console.log(`Thibaut's Education Preferences: ${Array.isArray(thibautEduPrefs) ? thibautEduPrefs.join(', ') : 'Invalid format'}`);
      } catch {
        console.log(`Thibaut's Education Preferences: ${thibautPrefs.educationLevelPreference}`);
      }
    } else {
      console.log(`Thibaut's Education Preferences: Not specified`);
    }
    console.log();

    console.log('FEATURE 5: HAS CHILDREN (Weight: 15%)');
    console.log('-------------------------------------');
    console.log(`Chima Has Children: ${chima.hasChildren || 'Not specified'}`);
    console.log(`Thibaut Has Children: ${thibaut.hasChildren || 'Not specified'}`);
    console.log(`Chima's Has Children Preference: ${chimaPrefs?.hasChildrenPreference || 'Not specified'}`);
    console.log(`Thibaut's Has Children Preference: ${thibautPrefs?.hasChildrenPreference || 'Not specified'}`);
    console.log();

    console.log('FEATURE 6: WANTS CHILDREN (Weight: 15%)');
    console.log('---------------------------------------');
    console.log(`Chima Wants Children: ${chima.wantsChildren || 'Not specified'}`);
    console.log(`Thibaut Wants Children: ${thibaut.wantsChildren || 'Not specified'}`);
    console.log(`Chima's Wants Children Preference: ${chimaPrefs?.wantsChildrenPreference || 'Not specified'}`);
    console.log(`Thibaut's Wants Children Preference: ${thibautPrefs?.wantsChildrenPreference || 'Not specified'}`);
    console.log();

    console.log('FEATURE 7: RELATIONSHIP GOAL (Weight: 10% - Text Analysis)');
    console.log('----------------------------------------------------------');
    console.log(`Chima's Relationship Goal: ${chima.relationshipGoal || 'Not specified'}`);
    console.log(`Thibaut's Relationship Goal: ${thibaut.relationshipGoal || 'Not specified'}`);
    console.log(`Chima's Goal Preference: ${chimaPrefs?.relationshipGoalPreference || 'Not specified'}`);
    console.log(`Thibaut's Goal Preference: ${thibautPrefs?.relationshipGoalPreference || 'Not specified'}`);
    console.log();

    console.log('FEATURE 8: LOCATION/GEOGRAPHY (Weight: 10%)');
    console.log('-------------------------------------------');
    console.log(`Chima's Location: ${chima.location || 'Not specified'}`);
    console.log(`Chima's Country of Origin: ${chima.countryOfOrigin || 'Not specified'}`);
    console.log(`Thibaut's Location: ${thibaut.location || 'Not specified'}`);
    console.log(`Thibaut's Country of Origin: ${thibaut.countryOfOrigin || 'Not specified'}`);
    console.log(`Chima's Location Preference: ${chimaPrefs?.locationPreference || 'Not specified'}`);
    console.log(`Chima's Pool Country: ${chimaPrefs?.poolCountry || 'Not specified'}`);
    console.log(`Thibaut's Location Preference: ${thibautPrefs?.locationPreference || 'Not specified'}`);
    console.log(`Thibaut's Pool Country: ${thibautPrefs?.poolCountry || 'Not specified'}`);
    console.log();

    console.log('🎯 RUNNING JACCARD SIMILARITY CALCULATION');
    console.log('==========================================');
    
    // Calculate the Jaccard similarity
    const result = advancedMatchingEngine.calculateAdvancedContentScore(
      chima, thibaut, chimaPrefs, thibautPrefs
    );
    
    console.log('ALGORITHM RESULTS:');
    console.log(`Overall Content Score: ${result.score.toFixed(4)} (out of 1.0)`);
    console.log(`  - Jaccard Similarity: ${result.details.jaccard?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log(`  - Cosine Similarity: ${result.details.cosine?.toFixed(4) || 'N/A'} (30% weight)`);
    console.log(`  - TF-IDF Similarity: ${result.details.tfidf?.toFixed(4) || 'N/A'} (20% weight)`);
    console.log(`  - Preference Alignment: ${result.details.preference?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log();

    console.log('📊 JACCARD ALGORITHM EXPLANATION');
    console.log('=================================');
    console.log('The Jaccard Similarity Algorithm works by:');
    console.log();
    console.log('1. BIDIRECTIONAL ANALYSIS:');
    console.log('   - Checks if Chima matches Thibaut\'s preferences');
    console.log('   - Checks if Thibaut matches Chima\'s preferences');
    console.log('   - Averages both directions for fairness');
    console.log();
    console.log('2. WEIGHTED FEATURE IMPORTANCE:');
    console.log('   - Religion: 20% (most important for compatibility)');
    console.log('   - Education, Ethnicity, Children: 15% each');
    console.log('   - Relationship Goal, Body Type, Location: 10% each');
    console.log();
    console.log('3. SCORING LOGIC:');
    console.log('   - Perfect match: 1.0 score');
    console.log('   - No match: 0.0 score');
    console.log('   - Missing data: 0.5 neutral score');
    console.log('   - "ANYWHERE" or "ANY" preferences: 1.0 accepting score');
    console.log();
    console.log('4. TEXT PROCESSING (Relationship Goals):');
    console.log('   - Tokenizes text into meaningful words');
    console.log('   - Calculates semantic similarity');
    console.log('   - Uses Jaccard coefficient for word overlap');
    console.log();
    console.log('5. GEOGRAPHIC INTELLIGENCE:');
    console.log('   - Handles location vs country preferences');
    console.log('   - Supports "ANYWHERE" for global matching');
    console.log('   - Partial scoring for geographic proximity');
    console.log();

    console.log('✅ JACCARD SIMILARITY ALGORITHM EXPLANATION COMPLETE');
    console.log('This sophisticated algorithm ensures compatibility by analyzing');
    console.log('all categorical features with appropriate weights and bidirectional logic.');

  } catch (error) {
    console.error('❌ Error explaining Jaccard algorithm:', error);
  }
}

// Run the explanation
explainJaccardAlgorithmWithChimaThibaut().catch(console.error);