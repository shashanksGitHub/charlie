#!/usr/bin/env node

/**
 * DEFINITIVE ANSWER: Diversity Injection Threshold
 */

console.log('🎯 DEFINITIVE ANSWER: DIVERSITY INJECTION THRESHOLD\n');

console.log('📋 THE THRESHOLD IS 100% FORMULA-BASED (No Hardcoded Minimum)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🔢 EXACT CODE LOGIC (Lines 202-208):');
console.log('```typescript');
console.log('const totalResults = rankedCandidates.length;');
console.log('const diversityCount = Math.floor(totalResults * diversityPercentage);');
console.log('');
console.log('if (diversityCount === 0 || allCandidates.length <= rankedCandidates.length) {');
console.log('  console.log("[DEMOGRAPHIC-DIVERSITY] ⚠️ Skipping diversity injection (insufficient candidates)");');
console.log('  return rankedCandidates;');
console.log('}');
console.log('```\n');

console.log('✅ CONCLUSION: It\'s the MATHEMATICAL FORMULA, not a hardcoded threshold');
console.log('═══════════════════════════════════════════════════════════════');
console.log('• diversityPercentage = 0.15 (15%)');
console.log('• diversityCount = Math.floor(rankedCandidates.length × 0.15)');
console.log('• NO hardcoded minimum like "if (rankedCandidates.length < 7)"');
console.log('• It\'s purely: "if (diversityCount === 0)" which happens when < 7 candidates\n');

console.log('🧮 WHY 7 IS THE PRACTICAL MINIMUM:');
console.log('• Math.floor(6 × 0.15) = Math.floor(0.9) = 0 → NO INJECTION');
console.log('• Math.floor(7 × 0.15) = Math.floor(1.05) = 1 → INJECTION STARTS');
console.log('• The "minimum of 7" is a side effect of the 15% formula, not a rule\n');

console.log('🎯 TWO CONDITIONS MUST BE MET:');
console.log('1. diversityCount > 0 (formula-derived minimum)');
console.log('2. allCandidates.length > rankedCandidates.length (need extras to inject)\n');

console.log('📊 PRACTICAL RESULT:');
console.log('• Current Chima: 6 candidates → Math.floor(6 × 0.15) = 0 → NO DIVERSITY');
console.log('• Required: 7+ candidates → Math.floor(7 × 0.15) = 1 → DIVERSITY STARTS');
console.log('• The threshold emerges from the percentage calculation, not explicit code');