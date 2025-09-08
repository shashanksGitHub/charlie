#!/usr/bin/env node

/**
 * DEMOGRAPHIC DIVERSITY CATEGORIES EXPLANATION
 * 
 * Real-world demonstration of the 5 Enhanced Demographic Diversity Categories
 * using actual user profiles: Chima, Thibaut, and other users
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🎯 ENHANCED DEMOGRAPHIC DIVERSITY CATEGORIES EXPLANATION');
console.log('Using Real User Profiles: Chima, Thibaut, and Others');
console.log('=======================================================\n');

const sql = neon(process.env.DATABASE_URL);

async function explainDemographicDiversityCategories() {
  try {
    
    console.log('STEP 1: LOADING USER PROFILES FOR DIVERSITY ANALYSIS');
    console.log('====================================================\n');
    
    // Get comprehensive user profiles
    const users = await sql`
      SELECT 
        u.id, u.full_name, u.date_of_birth, u.location, u.country_of_origin,
        u.ethnicity, u.secondary_tribe, u.education_level, u.profession,
        EXTRACT(YEAR FROM AGE(u.date_of_birth)) as age,
        p.min_age, p.max_age, p.pool_country, p.location_preference
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id IN (7, 11, 12, 13, 2, 8, 9, 10) 
      ORDER BY u.id
    `;
    
    console.log(`✅ Found ${users.length} user profiles for diversity demonstration\n`);
    
    // Focus on key users
    const chima = users.find(u => u.id === 12);
    const thibaut = users.find(u => u.id === 7);
    const obed = users.find(u => u.id === 11);
    const raul = users.find(u => u.id === 13);
    
    console.log('🔍 KEY USER PROFILES:\n');
    
    console.log(`👤 CHIMA (User ${chima.id}): ${chima.full_name}`);
    console.log(`   Age: ${chima.age} years | Education: ${chima.education_level || 'Not specified'}`);
    console.log(`   Profession: ${chima.profession || 'Not specified'} | Location: ${chima.location || 'Not specified'}`);
    console.log(`   Ethnicity: ${chima.ethnicity || 'Not specified'} | Country of Origin: ${chima.country_of_origin || 'Not specified'}`);
    console.log(`   Age Preferences: ${chima.min_age || 'Not set'}-${chima.max_age || 'Not set'} years\n`);
    
    console.log(`👤 THIBAUT (User ${thibaut.id}): ${thibaut.full_name}`);
    console.log(`   Age: ${thibaut.age} years | Education: ${thibaut.education_level || 'Not specified'}`);
    console.log(`   Profession: ${thibaut.profession || 'Not specified'} | Location: ${thibaut.location || 'Not specified'}`);
    console.log(`   Ethnicity: ${thibaut.ethnicity || 'Not specified'} | Country of Origin: ${thibaut.country_of_origin || 'Not specified'}`);
    console.log(`   Age Preferences: ${thibaut.min_age || 'Not set'}-${thibaut.max_age || 'Not set'} years\n`);
    
    console.log(`👤 OBED (User ${obed.id}): ${obed.full_name}`);
    console.log(`   Age: ${obed.age} years | Education: ${obed.education_level || 'Not specified'}`);
    console.log(`   Profession: ${obed.profession || 'Not specified'} | Location: ${obed.location || 'Not specified'}`);
    console.log(`   Ethnicity: ${obed.ethnicity || 'Not specified'} | Country of Origin: ${obed.country_of_origin || 'Not specified'}\n`);
    
    console.log('=' * 80 + '\n');
    
    console.log('CATEGORY 1: AGE RANGE EXPANSION BEYOND PREFERENCES');
    console.log('==================================================\n');
    
    console.log('🎯 HOW IT WORKS:');
    console.log('   • Expands user age preferences by ±4 years to introduce age diversity');
    console.log('   • Includes users slightly outside strict age requirements');
    console.log('   • Prevents age-based filter bubbles while respecting general preferences\n');
    
    console.log('📊 REAL EXAMPLE - CHIMA\'S AGE PREFERENCES:');
    console.log(`   Original preferences: ${chima.min_age || 18}-${chima.max_age || 45} years`);
    console.log(`   Expanded for diversity: ${Math.max(18, (chima.min_age || 18) - 4)}-${Math.min(50, (chima.max_age || 45) + 4)} years`);
    console.log(`   Chima's age: ${chima.age} years\n`);
    
    // Find users outside Chima's original preferences but within expanded range
    const chimaMinAge = chima.min_age || 18;
    const chimaMaxAge = chima.max_age || 45;
    const expandedMin = Math.max(18, chimaMinAge - 4);
    const expandedMax = Math.min(50, chimaMaxAge + 4);
    
    const ageDiversityCandidates = users.filter(user => {
      if (user.id === chima.id || !user.age) return false;
      const inExpandedRange = user.age >= expandedMin && user.age <= expandedMax;
      const outsideOriginal = user.age < chimaMinAge || user.age > chimaMaxAge;
      return inExpandedRange && outsideOriginal;
    });
    
    console.log('✅ AGE DIVERSITY CANDIDATES FOR CHIMA:');
    ageDiversityCandidates.forEach(candidate => {
      console.log(`   • ${candidate.full_name} (${candidate.age} years) - Outside original range but within expanded diversity range`);
    });
    
    if (ageDiversityCandidates.length === 0) {
      console.log('   • No users found outside original age preferences (current data limitations)');
    }
    console.log('   💡 This prevents Chima from only seeing users within narrow age band\n');
    
    console.log('=' * 80 + '\n');
    
    console.log('CATEGORY 2: ETHNICITY & SECONDARY TRIBE VARIETY');
    console.log('===============================================\n');
    
    console.log('🎯 HOW IT WORKS:');
    console.log('   • Introduces users with different ethnic backgrounds');
    console.log('   • Considers both primary ethnicity and secondary tribal affiliations');
    console.log('   • Promotes cross-cultural connections and cultural exchange\n');
    
    console.log('📊 REAL EXAMPLE - THIBAUT\'S ETHNIC BACKGROUND:');
    console.log(`   Primary ethnicity: ${thibaut.ethnicity || 'Not specified'}`);
    console.log(`   Secondary tribe: ${thibaut.secondary_tribe || 'Not specified'}`);
    console.log(`   Country of origin: ${thibaut.country_of_origin || 'Not specified'}\n`);
    
    const ethnicityDiversityCandidates = users.filter(user => {
      if (user.id === thibaut.id) return false;
      const differentEthnicity = user.ethnicity && user.ethnicity !== thibaut.ethnicity;
      const differentTribe = user.secondary_tribe && user.secondary_tribe !== thibaut.secondary_tribe;
      return differentEthnicity || differentTribe;
    });
    
    console.log('✅ ETHNICITY DIVERSITY CANDIDATES FOR THIBAUT:');
    ethnicityDiversityCandidates.forEach(candidate => {
      console.log(`   • ${candidate.full_name}: ${candidate.ethnicity || 'Unknown ethnicity'} / ${candidate.secondary_tribe || 'No tribal affiliation'}`);
    });
    
    if (ethnicityDiversityCandidates.length === 0) {
      console.log('   • Limited ethnic diversity data available in current profiles');
    }
    console.log('   💡 This exposes Thibaut to different cultural perspectives and backgrounds\n');
    
    console.log('=' * 80 + '\n');
    
    console.log('CATEGORY 3: EDUCATION LEVEL DIVERSITY');
    console.log('====================================\n');
    
    console.log('🎯 HOW IT WORKS:');
    console.log('   • Mixes users with different educational backgrounds');
    console.log('   • Includes various education levels: high school, bachelors, masters, etc.');
    console.log('   • Broadens intellectual perspectives and life experiences\n');
    
    console.log('📊 REAL EXAMPLE - CHIMA\'S EDUCATION LEVEL:');
    console.log(`   Education level: ${chima.education_level || 'Not specified'}\n`);
    
    const educationDiversityCandidates = users.filter(user => {
      if (user.id === chima.id) return false;
      return user.education_level && user.education_level !== chima.education_level;
    });
    
    console.log('✅ EDUCATION DIVERSITY CANDIDATES FOR CHIMA:');
    educationDiversityCandidates.forEach(candidate => {
      console.log(`   • ${candidate.full_name}: ${candidate.education_level} (vs. Chima's ${chima.education_level})`);
    });
    
    if (educationDiversityCandidates.length === 0) {
      console.log('   • Limited education diversity in current user base');
    }
    console.log('   💡 This introduces Chima to people with different educational journeys\n');
    
    console.log('=' * 80 + '\n');
    
    console.log('CATEGORY 4: PROFESSION CATEGORY MIXING');
    console.log('=====================================\n');
    
    console.log('🎯 HOW IT WORKS:');
    console.log('   • Crosses professional boundaries (Creative, Sports, Tech, Business, etc.)');
    console.log('   • Categorizes professions into broader groups for diversity analysis');
    console.log('   • Introduces varied career backgrounds and professional perspectives\n');
    
    // Profession categorization function
    function categorizeProfession(profession) {
      if (!profession) return 'Unknown';
      
      const professionLower = profession.toLowerCase();
      
      if (professionLower.includes('author') || professionLower.includes('writer') || professionLower.includes('artist')) {
        return 'Creative';
      }
      if (professionLower.includes('soccer') || professionLower.includes('athlete') || professionLower.includes('sports')) {
        return 'Sports';
      }
      if (professionLower.includes('tech') || professionLower.includes('engineer') || professionLower.includes('developer')) {
        return 'Technology';
      }
      if (professionLower.includes('doctor') || professionLower.includes('nurse') || professionLower.includes('medical')) {
        return 'Healthcare';
      }
      if (professionLower.includes('teacher') || professionLower.includes('professor') || professionLower.includes('education')) {
        return 'Education';
      }
      if (professionLower.includes('business') || professionLower.includes('manager') || professionLower.includes('entrepreneur')) {
        return 'Business';
      }
      if (professionLower.includes('carpenter') || professionLower.includes('builder') || professionLower.includes('construction')) {
        return 'Trades';
      }
      
      return 'Other';
    }
    
    console.log('📊 REAL EXAMPLE - THIBAUT\'S PROFESSION CATEGORY:');
    console.log(`   Profession: ${thibaut.profession || 'Not specified'}`);
    console.log(`   Category: ${categorizeProfession(thibaut.profession)}\n`);
    
    const professionDiversityCandidates = users.filter(user => {
      if (user.id === thibaut.id || !user.profession) return false;
      return categorizeProfession(user.profession) !== categorizeProfession(thibaut.profession);
    });
    
    console.log('✅ PROFESSION DIVERSITY CANDIDATES FOR THIBAUT:');
    professionDiversityCandidates.forEach(candidate => {
      console.log(`   • ${candidate.full_name}: ${candidate.profession} (${categorizeProfession(candidate.profession)} category)`);
    });
    
    if (professionDiversityCandidates.length === 0) {
      console.log('   • Limited profession diversity in current user base');
    }
    console.log(`   💡 This exposes Thibaut (${categorizeProfession(thibaut.profession)}) to different professional worlds\n`);
    
    console.log('=' * 80 + '\n');
    
    console.log('CATEGORY 5: GEOGRAPHIC DIVERSITY');
    console.log('===============================\n');
    
    console.log('🎯 HOW IT WORKS:');
    console.log('   • Promotes location diversity beyond typical preferences');
    console.log('   • Includes users from different cities, countries, and regions');
    console.log('   • Considers both current location and country of origin\n');
    
    console.log('📊 REAL EXAMPLE - CHIMA\'S GEOGRAPHIC PROFILE:');
    console.log(`   Current location: ${chima.location || 'Not specified'}`);
    console.log(`   Country of origin: ${chima.country_of_origin || 'Not specified'}`);
    console.log(`   Pool country preference: ${chima.pool_country || 'Not set'}\n`);
    
    const geographicDiversityCandidates = users.filter(user => {
      if (user.id === chima.id) return false;
      const differentLocation = user.location && user.location !== chima.location;
      const differentOrigin = user.country_of_origin && user.country_of_origin !== chima.country_of_origin;
      return differentLocation || differentOrigin;
    });
    
    console.log('✅ GEOGRAPHIC DIVERSITY CANDIDATES FOR CHIMA:');
    geographicDiversityCandidates.forEach(candidate => {
      console.log(`   • ${candidate.full_name}: ${candidate.location || candidate.country_of_origin || 'Unknown location'}`);
    });
    
    if (geographicDiversityCandidates.length === 0) {
      console.log('   • Limited geographic diversity in current user base');
    }
    console.log('   💡 This introduces Chima to people from different geographic backgrounds\n');
    
    console.log('=' * 80 + '\n');
    
    console.log('🏆 ENHANCED DEMOGRAPHIC DIVERSITY INJECTION SUMMARY');
    console.log('===================================================\n');
    
    console.log('✅ FILTER BUBBLE PREVENTION STRATEGY:');
    console.log('   • Strategic 15% diversity injection in discovery results');
    console.log('   • Weighted diversity scoring (0.15-0.3 bonus per candidate)');
    console.log('   • Natural integration maintains high-quality personalized matches');
    console.log('   • Comprehensive logging for algorithm transparency\n');
    
    console.log('✅ REAL-WORLD IMPACT FOR USERS:');
    console.log(`   • Chima (${chima.age}, ${chima.education_level}, Creative): Exposed to older/younger users, different education levels, varied professions, global locations`);
    console.log(`   • Thibaut (${thibaut.age}, ${thibaut.education_level}, Sports): Introduced to different ethnic backgrounds, education levels, non-sports professions, varied locations`);
    console.log(`   • All users: Serendipitous connections while maintaining compatibility-based matching\n`);
    
    console.log('✅ ALGORITHM INTEGRATION:');
    console.log('   • Enhanced `injectDemographicDiversity()` function in matching engine');
    console.log('   • Category-specific candidate selection and scoring');
    console.log('   • Strategic positioning at intervals throughout discovery results');
    console.log('   • Fallback to basic diversity when demographic data unavailable\n');
    
    console.log('🎯 [CONCLUSION] Enhanced Demographic Diversity Injection');
    console.log('=======================================================');
    console.log('The CHARLEY Hybrid Matching Engine now intelligently prevents filter bubbles');
    console.log('by strategically introducing demographic diversity across 5 key categories,');
    console.log('ensuring users discover serendipitous connections while maintaining high');
    console.log('compatibility scores for meaningful relationship potential.');

  } catch (error) {
    console.error('\n❌ [ERROR] Demographic diversity explanation failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the explanation
explainDemographicDiversityCategories();