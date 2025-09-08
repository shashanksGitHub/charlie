#!/usr/bin/env node

import { AdvancedMatchingEngine } from './server/advanced-matching-algorithms.js';
import { DatabaseService } from './server/database.js';

console.log('🔍 ATO (USER 2) CONTENT-BASED SCORING ANALYSIS');
console.log('==============================================');
console.log('Analyzing why Obed ranks higher than Chimamanda for Ato');

async function analyzeAtoContentScoring() {
  try {
    const db = new DatabaseService();
    const advancedMatchingEngine = new AdvancedMatchingEngine();
    
    // Load user data
    const ato = await db.getUser(2); // User Ato
    const obed = await db.getUser(1); // User Obed  
    const chimamanda = await db.getUser(3); // User Chimamanda
    
    // Load preferences
    const atoPrefs = await db.getUserPreferences(2);
    const obedPrefs = await db.getUserPreferences(1);
    const chimamandaPrefs = await db.getUserPreferences(3);
    
    console.log('👥 PARTICIPANTS:');
    console.log(`  Ato (User 2): ${ato.firstName || ato.fullName}`);
    console.log(`  Obed (User 1): ${obed.firstName || obed.fullName}`);
    console.log(`  Chimamanda (User 3): ${chimamanda.firstName || chimamanda.fullName}`);
    console.log();
    
    // ============ ANALYZE ATO vs OBED ============
    console.log('🥇 ATO vs OBED - CONTENT-BASED SCORING BREAKDOWN');
    console.log('===============================================');
    
    const atoObedResult = advancedMatchingEngine.calculateAdvancedContentScore(
      ato, obed, atoPrefs, obedPrefs
    );
    
    console.log(`🎯 OVERALL CONTENT SCORE: ${atoObedResult.score.toFixed(4)}`);
    console.log();
    
    console.log('📊 FOUR SIMILARITY CALCULATIONS:');
    console.log(`  A. JACCARD SIMILARITY: ${atoObedResult.details.jaccard?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log(`     • Categorical feature matching (ethnicity, religion, body type, etc.)`);
    
    console.log(`  B. TF-IDF SIMILARITY: ${atoObedResult.details.tfidf?.toFixed(4) || 'N/A'} (20% weight)`);
    console.log(`     • Textual content analysis (bio, interests, profession)`);
    
    console.log(`  C. COSINE SIMILARITY: ${atoObedResult.details.cosine?.toFixed(4) || 'N/A'} (30% weight)`);
    console.log(`     • Numerical feature vectors (age, height, activity, completeness)`);
    
    console.log(`  D. PREFERENCE ALIGNMENT: ${atoObedResult.details.preference?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log(`     • Matching priorities alignment (values, personality, looks, etc.)`);
    console.log();
    
    // ============ ANALYZE ATO vs CHIMAMANDA ============
    console.log('🥈 ATO vs CHIMAMANDA - CONTENT-BASED SCORING BREAKDOWN');
    console.log('====================================================');
    
    const atoChimamandaResult = advancedMatchingEngine.calculateAdvancedContentScore(
      ato, chimamanda, atoPrefs, chimamandaPrefs
    );
    
    console.log(`🎯 OVERALL CONTENT SCORE: ${atoChimamandaResult.score.toFixed(4)}`);
    console.log();
    
    console.log('📊 FOUR SIMILARITY CALCULATIONS:');
    console.log(`  A. JACCARD SIMILARITY: ${atoChimamandaResult.details.jaccard?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log(`     • Categorical feature matching (ethnicity, religion, body type, etc.)`);
    
    console.log(`  B. TF-IDF SIMILARITY: ${atoChimamandaResult.details.tfidf?.toFixed(4) || 'N/A'} (20% weight)`);
    console.log(`     • Textual content analysis (bio, interests, profession)`);
    
    console.log(`  C. COSINE SIMILARITY: ${atoChimamandaResult.details.cosine?.toFixed(4) || 'N/A'} (30% weight)`);
    console.log(`     • Numerical feature vectors (age, height, activity, completeness)`);
    
    console.log(`  D. PREFERENCE ALIGNMENT: ${atoChimamandaResult.details.preference?.toFixed(4) || 'N/A'} (25% weight)`);
    console.log(`     • Matching priorities alignment (values, personality, looks, etc.)`);
    console.log();
    
    // ============ DETAILED COMPARISON ============
    console.log('⚖️ DETAILED COMPONENT COMPARISON');
    console.log('=================================');
    
    const obedAdvantage = atoObedResult.score - atoChimamandaResult.score;
    console.log(`🏆 OBED'S ADVANTAGE: +${obedAdvantage.toFixed(4)} points`);
    console.log();
    
    console.log('📈 COMPONENT-BY-COMPONENT BREAKDOWN:');
    
    // Jaccard comparison
    const jaccardDiff = (atoObedResult.details.jaccard || 0) - (atoChimamandaResult.details.jaccard || 0);
    console.log(`  Jaccard: Obed ${jaccardDiff >= 0 ? '+' : ''}${jaccardDiff.toFixed(4)} vs Chimamanda`);
    
    // TF-IDF comparison
    const tfidfDiff = (atoObedResult.details.tfidf || 0) - (atoChimamandaResult.details.tfidf || 0);
    console.log(`  TF-IDF: Obed ${tfidfDiff >= 0 ? '+' : ''}${tfidfDiff.toFixed(4)} vs Chimamanda`);
    
    // Cosine comparison
    const cosineDiff = (atoObedResult.details.cosine || 0) - (atoChimamandaResult.details.cosine || 0);
    console.log(`  Cosine: Obed ${cosineDiff >= 0 ? '+' : ''}${cosineDiff.toFixed(4)} vs Chimamanda`);
    
    // Preference comparison
    const prefDiff = (atoObedResult.details.preference || 0) - (atoChimamandaResult.details.preference || 0);
    console.log(`  Preference: Obed ${prefDiff >= 0 ? '+' : ''}${prefDiff.toFixed(4)} vs Chimamanda`);
    console.log();
    
    // ============ USER PROFILE DETAILS ============
    console.log('👤 USER PROFILE COMPARISON');
    console.log('===========================');
    
    console.log('ATO (User 2) Profile:');
    console.log(`  • Bio: "${ato.bio?.substring(0, 80) || 'No bio'}..."`);
    console.log(`  • Profession: ${ato.profession || 'No profession'}`);
    console.log(`  • Religion: ${ato.religion || 'No religion'}`);
    console.log(`  • Ethnicity: ${ato.ethnicity || 'No ethnicity'}`);
    console.log(`  • Age: ${ato.dateOfBirth ? new Date().getFullYear() - new Date(ato.dateOfBirth).getFullYear() : 'Unknown'}`);
    console.log(`  • Location: ${ato.location || 'No location'}`);
    console.log();
    
    console.log('OBED (User 1) Profile:');
    console.log(`  • Bio: "${obed.bio?.substring(0, 80) || 'No bio'}..."`);
    console.log(`  • Profession: ${obed.profession || 'No profession'}`);
    console.log(`  • Religion: ${obed.religion || 'No religion'}`);
    console.log(`  • Ethnicity: ${obed.ethnicity || 'No ethnicity'}`);
    console.log(`  • Age: ${obed.dateOfBirth ? new Date().getFullYear() - new Date(obed.dateOfBirth).getFullYear() : 'Unknown'}`);
    console.log(`  • Location: ${obed.location || 'No location'}`);
    console.log();
    
    console.log('CHIMAMANDA (User 3) Profile:');
    console.log(`  • Bio: "${chimamanda.bio?.substring(0, 80) || 'No bio'}..."`);
    console.log(`  • Profession: ${chimamanda.profession || 'No profession'}`);
    console.log(`  • Religion: ${chimamanda.religion || 'No religion'}`);
    console.log(`  • Ethnicity: ${chimamanda.ethnicity || 'No ethnicity'}`);
    console.log(`  • Age: ${chimamanda.dateOfBirth ? new Date().getFullYear() - new Date(chimamanda.dateOfBirth).getFullYear() : 'Unknown'}`);
    console.log(`  • Location: ${chimamanda.location || 'No location'}`);
    console.log();
    
    // ============ MATCHING PRIORITIES ============
    console.log('🎯 MATCHING PRIORITIES ANALYSIS');
    console.log('===============================');
    
    let atoMatchingPriorities = [];
    try {
      if (atoPrefs?.matchingPriorities) {
        atoMatchingPriorities = JSON.parse(atoPrefs.matchingPriorities);
      }
    } catch (e) {
      console.log('Error parsing Ato matching priorities');
    }
    
    console.log(`Ato's Matching Priorities: [${atoMatchingPriorities.join(', ')}]`);
    console.log('Priority weighting: 1st=40%, 2nd=30%, 3rd=20%');
    console.log();
    
    // ============ CONCLUSION ============
    console.log('🏁 CONCLUSION: WHY OBED RANKS HIGHER');
    console.log('====================================');
    
    if (obedAdvantage > 0) {
      console.log(`✅ Obed scores ${obedAdvantage.toFixed(4)} points higher in content-based scoring`);
      
      // Identify strongest advantage
      const advantages = [
        { name: 'Jaccard', diff: jaccardDiff, weight: 0.25 },
        { name: 'TF-IDF', diff: tfidfDiff, weight: 0.20 },
        { name: 'Cosine', diff: cosineDiff, weight: 0.30 },
        { name: 'Preference', diff: prefDiff, weight: 0.25 }
      ];
      
      const strongestAdvantage = advantages.reduce((max, curr) => 
        (curr.diff * curr.weight) > (max.diff * max.weight) ? curr : max
      );
      
      console.log(`🎯 Strongest advantage: ${strongestAdvantage.name} (+${strongestAdvantage.diff.toFixed(4)})`);
      console.log(`📊 Weighted contribution: +${(strongestAdvantage.diff * strongestAdvantage.weight).toFixed(4)} to final score`);
    } else {
      console.log('❓ Unexpected: Chimamanda actually scores higher in content-based scoring');
      console.log('   The ranking difference may be due to collaborative filtering or context factors');
    }
    
  } catch (error) {
    console.error('Error in analysis:', error);
  }
}

analyzeAtoContentScoring();