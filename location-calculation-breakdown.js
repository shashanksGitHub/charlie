#!/usr/bin/env node

/**
 * LOCATION SCORE CALCULATION BREAKDOWN
 * How Chima vs Thibaut got 0.650 location score
 * 
 * This demonstrates the exact bidirectional geographic compatibility algorithm
 */

console.log('\n🌍 LOCATION SCORE CALCULATION BREAKDOWN');
console.log('Chima Ngozi vs Thibaut Courtois = 0.650');
console.log('==========================================\n');

// Real data from Chima and Thibaut
const chima = {
  location: 'Richardson, TX, USA',
  countryOfOrigin: 'Nigerian',
  poolCountry: 'ANYWHERE'
};

const thibaut = {
  location: 'Madrid, Spain',
  countryOfOrigin: 'Nigerian',
  poolCountry: 'Germany'
};

console.log('📍 USER LOCATION DATA:');
console.log('======================');
console.log('Chima:');
console.log(`  Location: ${chima.location}`);
console.log(`  Country of Origin: ${chima.countryOfOrigin}`);
console.log(`  Pool Country Preference: ${chima.poolCountry}`);
console.log();
console.log('Thibaut:');
console.log(`  Location: ${thibaut.location}`);
console.log(`  Country of Origin: ${thibaut.countryOfOrigin}`);
console.log(`  Pool Country Preference: ${thibaut.poolCountry}`);
console.log();

console.log('🔄 BIDIRECTIONAL ALGORITHM STEP-BY-STEP:');
console.log('=========================================\n');

// Extract countries from locations (algorithm logic)
function extractCountry(location) {
  if (location.includes('USA')) return 'USA';
  if (location.includes('Spain')) return 'Spain';
  if (location.includes('Ghana')) return 'Ghana';
  if (location.includes('Germany')) return 'Germany';
  return location;
}

// Create location sets for each user
const chimaLocations = new Set();
const chimaLocationCountry = extractCountry(chima.location);
if (chimaLocationCountry) chimaLocations.add(chimaLocationCountry);
if (chima.countryOfOrigin) chimaLocations.add(chima.countryOfOrigin);

const thibautLocations = new Set();
const thibautLocationCountry = extractCountry(thibaut.location);
if (thibautLocationCountry) thibautLocations.add(thibautLocationCountry);
if (thibaut.countryOfOrigin) thibautLocations.add(thibaut.countryOfOrigin);

console.log('STEP 1: EXTRACT LOCATION SETS');
console.log('------------------------------');
console.log(`Chima's Location Set: [${Array.from(chimaLocations).join(', ')}]`);
console.log(`Thibaut's Location Set: [${Array.from(thibautLocations).join(', ')}]`);
console.log();

console.log('STEP 2: BIDIRECTIONAL COMPATIBILITY CHECK');
console.log('------------------------------------------');

// DIRECTION 1: Does Chima match Thibaut's preferences?
console.log('Direction 1: Chima → Thibaut\'s Preferences');
let score1 = 0.5; // Default neutral score
if (thibaut.poolCountry) {
  if (thibaut.poolCountry === 'ANYWHERE') {
    score1 = 1.0;
    console.log(`  Thibaut wants: ${thibaut.poolCountry} → Score: 1.0 (accepts anyone)`);
  } else {
    // Check if Chima's locations match Thibaut's pool preference
    const matches = [...chimaLocations].some(loc => 
      loc.toLowerCase().includes(thibaut.poolCountry.toLowerCase()) ||
      thibaut.poolCountry.toLowerCase().includes(loc.toLowerCase())
    );
    score1 = matches ? 1.0 : 0.3; // Partial score for geographic mismatch
    console.log(`  Thibaut wants: ${thibaut.poolCountry}`);
    console.log(`  Chima has: [${Array.from(chimaLocations).join(', ')}]`);
    console.log(`  Match: ${matches ? 'YES' : 'NO'} → Score: ${score1}`);
  }
} else {
  console.log(`  Thibaut has no pool preference → Score: 0.5 (neutral)`);
}
console.log();

// DIRECTION 2: Does Thibaut match Chima's preferences?
console.log('Direction 2: Thibaut → Chima\'s Preferences');
let score2 = 0.5; // Default neutral score
if (chima.poolCountry) {
  if (chima.poolCountry === 'ANYWHERE') {
    score2 = 1.0;
    console.log(`  Chima wants: ${chima.poolCountry} → Score: 1.0 (accepts anyone)`);
  } else {
    // Check if Thibaut's locations match Chima's pool preference
    const matches = [...thibautLocations].some(loc => 
      loc.toLowerCase().includes(chima.poolCountry.toLowerCase()) ||
      chima.poolCountry.toLowerCase().includes(loc.toLowerCase())
    );
    score2 = matches ? 1.0 : 0.3; // Partial score for geographic mismatch
    console.log(`  Chima wants: ${chima.poolCountry}`);
    console.log(`  Thibaut has: [${Array.from(thibautLocations).join(', ')}]`);
    console.log(`  Match: ${matches ? 'YES' : 'NO'} → Score: ${score2}`);
  }
} else {
  console.log(`  Chima has no pool preference → Score: 0.5 (neutral)`);
}
console.log();

console.log('STEP 3: FINAL CALCULATION');
console.log('-------------------------');
const finalScore = (score1 + score2) / 2;
console.log(`Score 1 (Chima → Thibaut's prefs): ${score1.toFixed(3)}`);
console.log(`Score 2 (Thibaut → Chima's prefs): ${score2.toFixed(3)}`);
console.log(`Average: (${score1.toFixed(3)} + ${score2.toFixed(3)}) ÷ 2 = ${finalScore.toFixed(3)}`);
console.log();

console.log('🎯 EXPLANATION OF THE 0.650 SCORE:');
console.log('===================================');
console.log('• Direction 1: Chima (USA, Nigerian) vs Thibaut wants Germany = 0.3 (geographic mismatch)');
console.log('• Direction 2: Thibaut (Spain, Nigerian) vs Chima wants ANYWHERE = 1.0 (perfect match)');
console.log('• Bidirectional average: (0.3 + 1.0) ÷ 2 = 0.65');
console.log();
console.log('✅ KEY INSIGHTS:');
console.log('• Chima\'s "ANYWHERE" preference gives perfect score for Thibaut');
console.log('• Thibaut\'s "Germany" preference doesn\'t match Chima\'s USA/Nigerian locations');
console.log('• The 0.3 partial score prevents complete incompatibility');
console.log('• Final 65% compatibility reflects partial geographic alignment');

console.log(`\n✅ VERIFICATION: Our calculation = ${finalScore.toFixed(3)}, Algorithm output = 0.650`);
console.log(`Match: ${Math.abs(finalScore - 0.650) < 0.001 ? '✅ PERFECT' : '❌ MISMATCH'}`);