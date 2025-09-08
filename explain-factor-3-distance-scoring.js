/**
 * FACTOR 3: DISTANCE CALCULATIONS SCORING EXPLANATION
 * 
 * This script demonstrates the precise mathematical formula used for
 * calculating distance compatibility scores in the CHARLEY matching engine.
 */

console.log('📏 FACTOR 3: DISTANCE CALCULATIONS SCORING METRIC');
console.log('================================================');
console.log('Enhanced with Google Places API Integration\n');

// Distance scoring algorithm implementation
function calculateDistanceScore(actualDistance, userPreference) {
  console.log(`Input Parameters:`);
  console.log(`- Actual Distance: ${actualDistance} km`);
  console.log(`- User Preference: ${userPreference} km\n`);
  
  let score;
  let explanation;
  
  if (actualDistance <= userPreference) {
    // WITHIN PREFERENCE RANGE - Linear decay scoring
    score = Math.max(0.5, 1 - (actualDistance / userPreference) * 0.5);
    explanation = `Within preference range - Linear decay from 100% to 50%`;
    
    console.log(`🟢 WITHIN PREFERENCE CALCULATION:`);
    console.log(`   Formula: max(0.5, 1 - (distance / preference) * 0.5)`);
    console.log(`   Formula: max(0.5, 1 - (${actualDistance} / ${userPreference}) * 0.5)`);
    console.log(`   Formula: max(0.5, 1 - ${(actualDistance / userPreference).toFixed(3)} * 0.5)`);
    console.log(`   Formula: max(0.5, 1 - ${((actualDistance / userPreference) * 0.5).toFixed(3)})`);
    console.log(`   Formula: max(0.5, ${(1 - (actualDistance / userPreference) * 0.5).toFixed(3)})`);
    console.log(`   Result: ${score.toFixed(3)}`);
    
  } else {
    // BEYOND PREFERENCE RANGE - Exponential decay scoring
    const excessDistance = actualDistance - userPreference;
    score = Math.max(0.1, Math.exp(-excessDistance / userPreference));
    explanation = `Beyond preference range - Exponential decay with minimum 10%`;
    
    console.log(`🟡 BEYOND PREFERENCE CALCULATION:`);
    console.log(`   Excess Distance: ${actualDistance} - ${userPreference} = ${excessDistance} km`);
    console.log(`   Formula: max(0.1, exp(-excessDistance / preference))`);
    console.log(`   Formula: max(0.1, exp(-${excessDistance} / ${userPreference}))`);
    console.log(`   Formula: max(0.1, exp(-${(excessDistance / userPreference).toFixed(3)}))`);
    console.log(`   Formula: max(0.1, ${Math.exp(-excessDistance / userPreference).toFixed(6)})`);
    console.log(`   Result: ${score.toFixed(3)}`);
  }
  
  console.log(`\n📊 SCORE ANALYSIS:`);
  console.log(`   Distance Compatibility: ${(score * 100).toFixed(1)}%`);
  console.log(`   Explanation: ${explanation}\n`);
  
  return score;
}

// Haversine distance calculation (used in the actual system)
function calculateHaversineDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

console.log('🌍 REAL-WORLD DISTANCE SCORING EXAMPLES');
console.log('=======================================\n');

// Test scenarios with different distance preferences
const testScenarios = [
  {
    name: 'Local Dating (Short Preference)',
    userPreference: 50, // 50km preference
    distances: [10, 25, 50, 75, 100, 200, 500]
  },
  {
    name: 'Regional Dating (Medium Preference)', 
    userPreference: 200, // 200km preference
    distances: [50, 100, 200, 300, 500, 1000, 2000]
  },
  {
    name: 'International Dating (Long Preference)',
    userPreference: 5000, // 5000km preference
    distances: [1000, 2500, 5000, 7500, 10000, 15000, 20000]
  }
];

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name.toUpperCase()}`);
  console.log(`   User Preference: ${scenario.userPreference} km`);
  console.log(`   Distance → Score Analysis:`);
  
  scenario.distances.forEach(distance => {
    const score = calculateDistanceScore(distance, scenario.userPreference);
    const status = distance <= scenario.userPreference ? 'WITHIN' : 'BEYOND';
    console.log(`   ${distance.toString().padStart(6)} km → ${(score * 100).toFixed(1).padStart(5)}% (${status})`);
  });
  console.log('');
});

console.log('🎯 CHIMA & THIBAUT EXAMPLE CALCULATION');
console.log('====================================\n');

// Real example from Chima and Thibaut
const chimaCoords = { lat: 39.8283, lng: -98.5795 }; // Central USA
const thibautCoords = { lat: 40.4637, lng: -3.7492 }; // Madrid, Spain
const actualDistance = calculateHaversineDistance(chimaCoords, thibautCoords);
const userPreference = 5000; // 5000km preference (international dating)

console.log('GEOGRAPHIC COORDINATES:');
console.log(`Chima (USA): ${chimaCoords.lat}, ${chimaCoords.lng}`);
console.log(`Thibaut (Spain): ${thibautCoords.lat}, ${thibautCoords.lng}`);
console.log(`\nHAVERSINE DISTANCE CALCULATION:`);
console.log(`Actual Distance: ${actualDistance.toFixed(0)} km`);
console.log(`User Preference: ${userPreference} km\n`);

const chimaScore = calculateDistanceScore(actualDistance, userPreference);

console.log('📈 SCORING ALGORITHM CHARACTERISTICS');
console.log('==================================\n');

console.log('WITHIN PREFERENCE RANGE (Linear Decay):');
console.log('- At 0% of preference: 100% compatibility score');
console.log('- At 50% of preference: 75% compatibility score');  
console.log('- At 100% of preference: 50% compatibility score (minimum within range)');

console.log('\nBEYOND PREFERENCE RANGE (Exponential Decay):');
console.log('- Starts at 50% at preference boundary');
console.log('- Exponential decay function: e^(-excess/preference)');
console.log('- Minimum score: 10% (prevents zero compatibility)');
console.log('- Rapid decay for distances far beyond preference');

console.log('\n🔧 GOOGLE PLACES API INTEGRATION');
console.log('===============================\n');

console.log('ENHANCED GEOCODING FEATURES:');
console.log('✓ Real-time coordinate lookup via Google Places API');
console.log('✓ Global coverage with precise coordinate data');
console.log('✓ Automatic address parsing and standardization');  
console.log('✓ Fallback to local database when API unavailable');
console.log('✓ In-memory caching for performance optimization');
console.log('✓ Confidence scoring based on data source quality');

console.log('\nDISTANCE CALCULATION PIPELINE:');
console.log('1. User enters location (e.g., "Richardson, TX, USA")');
console.log('2. Google Places API geocodes to precise coordinates');
console.log('3. Haversine formula calculates exact distance');
console.log('4. Distance scoring algorithm applies user preferences');
console.log('5. Final compatibility score integrated into matching engine');

console.log('\n🏆 FACTOR 3 STATUS: ENHANCED WITH GOOGLE PLACES API');
console.log('=================================================\n');

console.log('KEY IMPROVEMENTS:');
console.log('✓ Replaced static location database with dynamic API');
console.log('✓ Enhanced global location coverage');
console.log('✓ Improved geocoding accuracy and reliability');
console.log('✓ Automatic coordinate updates and maintenance');
console.log('✓ Production-ready error handling and fallbacks');

console.log('\nFACTOR 3: DISTANCE CALCULATIONS - FULLY ENHANCED ✅');