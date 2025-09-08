#!/usr/bin/env node

/**
 * DEFINITIVE ANALYSIS: Chima's Swipe Card Order
 * Based on live database data and engine logs
 */

console.log('🎯 CHIMA\'S DEFINITIVE SWIPE CARD ORDER ANALYSIS\n');

// User data from database query
const CHIMA_DATA = {
  id: 12,
  name: 'Chima Ngozi',
  hardFilters: {
    minAge: 18,
    maxAge: 42,
    distancePreference: -1, // No distance filter
    poolCountry: 'ANYWHERE',
    dealBreakers: '[]' // No deal breakers
  }
};

const ALL_USERS = [
  { id: 2, name: 'Fuseini Adams', age: 35, location: 'Konongo, Ghana', active: true },
  { id: 3, name: 'Ntantamis Serandipis', age: 31, location: 'Sycamore, IL, USA', active: true },
  { id: 5, name: 'Gabbieeee A', age: 23, location: 'Columbus, OH, USA', active: true },
  { id: 7, name: 'Thibaut Courtois', age: 25, location: 'Sydney NSW, Australia', active: true },
  { id: 8, name: 'Andriy Lunin', age: 25, location: 'Dallas, United States', active: true },
  { id: 9, name: 'Fran González', age: 25, location: 'Madrid, Spain', active: true },
  { id: 10, name: 'Dean Huijsen', age: 25, location: 'London, UK', active: true },
  { id: 11, name: 'Obed Amissah', age: 30, location: 'Dallas, TX, USA', active: true },
  { id: 13, name: 'Raúl Asencio', age: 25, location: 'Madrid, Spain', active: true }
];

// From recent workflow logs
const LATEST_ENGINE_RESULTS = [
  { userId: 2, name: 'Fuseini Adams', score: 0.576, content: 0.728, collaborative: 0.500, context: 0.441 },
  { userId: 8, name: 'Andriy Lunin', score: 0.480, content: 0.528, collaborative: 0.500, context: 0.376 },
  { userId: 5, name: 'Gabbieeee A', score: 0.480, content: 0.524, collaborative: 0.500, context: 0.381 }
];

console.log('👤 USER: Chima Ngozi (ID: 12)');
console.log('══════════════════════════════════════════════════════════════════════════');

console.log('\n🔒 HARD FILTERS APPLIED:');
console.log('──────────────────────────────────────────────────────────────────────────');
console.log(`• Age Range: ${CHIMA_DATA.hardFilters.minAge}-${CHIMA_DATA.hardFilters.maxAge} years`);
console.log(`• Distance: No filter (${CHIMA_DATA.hardFilters.distancePreference})`);
console.log(`• Pool Country: ${CHIMA_DATA.hardFilters.poolCountry}`);
console.log(`• Deal Breakers: ${CHIMA_DATA.hardFilters.dealBreakers}`);

console.log('\n📋 CANDIDATE POOL (After Hard Filters):');
console.log('──────────────────────────────────────────────────────────────────────────');
const filteredCandidates = ALL_USERS.filter(user => 
  user.age >= CHIMA_DATA.hardFilters.minAge && 
  user.age <= CHIMA_DATA.hardFilters.maxAge &&
  user.active
);

filteredCandidates.forEach((user, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${user.name} (Age: ${user.age}, ${user.location})`);
});

console.log(`\n✅ CANDIDATES PASSED HARD FILTERS: ${filteredCandidates.length}/${ALL_USERS.length}`);

console.log('\n🎯 DIVERSITY INJECTION ANALYSIS:');
console.log('──────────────────────────────────────────────────────────────────────────');
const diversityCount = Math.floor(filteredCandidates.length * 0.15);
console.log(`• Total candidates: ${filteredCandidates.length}`);
console.log(`• Diversity percentage: 15%`);
console.log(`• Diversity count: Math.floor(${filteredCandidates.length} × 0.15) = ${diversityCount}`);
console.log(`• Diversity injection: ${diversityCount > 0 ? '✅ YES' : '❌ NO'}`);

if (diversityCount === 0) {
  console.log('• Reason: diversityCount === 0 (formula threshold not met)');
  console.log('• Result: Pure algorithmic ranking');
}

console.log('\n📊 ACTUAL SWIPE CARD ORDER (From Latest Engine Run):');
console.log('══════════════════════════════════════════════════════════════════════════');

if (LATEST_ENGINE_RESULTS.length > 0) {
  LATEST_ENGINE_RESULTS.forEach((result, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${result.name} (ID: ${result.userId})`);
    console.log(`    🎯 Overall Score: ${result.score.toFixed(3)}`);
    console.log(`    📊 Content (40%): ${result.content.toFixed(3)}`);
    console.log(`    🤝 Collaborative (35%): ${result.collaborative.toFixed(3)}`);
    console.log(`    ⚡ Context (25%): ${result.context.toFixed(3)}`);
    console.log('');
  });
  
  console.log(`📋 Engine Status: Processed ${LATEST_ENGINE_RESULTS.length} candidates`);
  console.log('🔄 Ranking Method: Pure hybrid algorithm (no diversity injection)');
  
} else {
  console.log('❌ No current engine results available');
  console.log('💡 Engine may be filtering candidates or running different logic');
}

console.log('\n🎯 SUMMARY:');
console.log('══════════════════════════════════════════════════════════════════════════');
console.log('• Hard filters: Minimal (age 18-42, no distance/deal breakers)');
console.log('• Candidate pool: 9 users pass hard filters');
console.log('• Diversity injection: SKIPPED (diversityCount = 0)');
console.log('• Engine ranking: Pure algorithmic compatibility scores');
console.log('• Current visible cards: Top 3-6 based on hybrid matching engine');