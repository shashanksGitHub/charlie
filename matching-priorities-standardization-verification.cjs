#!/usr/bin/env node

/**
 * MATCHING PRIORITIES STANDARDIZATION VERIFICATION
 * ===============================================
 * 
 * This script verifies that matching priorities are now standardized between
 * MEET Profile page and Dating Preferences page using consistent priority labels.
 * 
 * STANDARDIZATION COMPLETE:
 * ✅ Updated MEET Profile matching priorities to use Dating Preferences labels
 * ✅ Added age-based filtering for Physical Attraction (users under 18)
 * ✅ Both components now show identical priority options for users 18+
 * ✅ Under-18 users see friendship-focused priorities (no Physical Attraction)
 * 
 * BEFORE (INCONSISTENT):
 * - MEET Profile: Values, Personality, Attraction, Career, Religion, Culture, Intelligence  
 * - Dating Preferences: Shared Values, Personality, Physical Attraction, Career & Ambition, Religious Compatibility, Same Tribe/Cultural Background, Intellectual Connection
 * 
 * AFTER (STANDARDIZED):
 * - Both pages: Shared Values, Personality, Physical Attraction*, Career & Ambition, Religious Compatibility, Same Tribe/Cultural Background, Intellectual Connection
 * - *Physical Attraction filtered out for users under 18
 * 
 * EXPECTED BEHAVIOR:
 * 1. MEET Profile and Dating Preferences show identical priority options
 * 2. 18+ users see all 7 priority options including Physical Attraction
 * 3. Under-18 users see 6 priority options (Physical Attraction filtered out)
 * 4. Consistent user experience across both components
 */

console.log('🎯 MATCHING PRIORITIES STANDARDIZATION VERIFICATION');
console.log('='.repeat(70));

const fs = require('fs');

function checkImplementation() {
  const meetProfilePath = 'client/src/components/profile/meet-profile-updated.tsx';
  const datingPrefsPath = 'client/src/components/settings/dating-preferences.tsx';
  
  console.log('\n1. FILE EXISTENCE CHECK');
  console.log('='.repeat(30));
  
  const meetExists = fs.existsSync(meetProfilePath);
  const datingExists = fs.existsSync(datingPrefsPath);
  
  console.log(`   ${meetExists ? '✅' : '❌'} MEET Profile component: ${meetProfilePath}`);
  console.log(`   ${datingExists ? '✅' : '❌'} Dating Preferences component: ${datingPrefsPath}`);
  
  if (!meetExists || !datingExists) {
    console.log('\n❌ Cannot proceed: Required files missing');
    return false;
  }
  
  const meetContent = fs.readFileSync(meetProfilePath, 'utf8');
  const datingContent = fs.readFileSync(datingPrefsPath, 'utf8');
  
  console.log('\n2. STANDARDIZED LABELS VERIFICATION');
  console.log('='.repeat(40));
  
  // Check for standardized labels in MEET Profile
  const meetLabels = [
    { name: 'Shared Values', pattern: 'values: "Shared Values"', found: meetContent.includes('values: "Shared Values"') },
    { name: 'Physical Attraction', pattern: 'looks: "Physical Attraction"', found: meetContent.includes('looks: "Physical Attraction"') },
    { name: 'Career & Ambition', pattern: 'career: "Career & Ambition"', found: meetContent.includes('career: "Career & Ambition"') },
    { name: 'Religious Compatibility', pattern: 'religion: "Religious Compatibility"', found: meetContent.includes('religion: "Religious Compatibility"') },
    { name: 'Same Tribe/Cultural Background', pattern: 'tribe: "Same Tribe/Cultural Background"', found: meetContent.includes('tribe: "Same Tribe/Cultural Background"') },
    { name: 'Intellectual Connection', pattern: 'intellect: "Intellectual Connection"', found: meetContent.includes('intellect: "Intellectual Connection"') }
  ];
  
  console.log('   MEET Profile Labels:');
  let meetLabelsCorrect = true;
  meetLabels.forEach(label => {
    const status = label.found ? '✅' : '❌';
    console.log(`     ${status} ${label.name}`);
    if (!label.found) meetLabelsCorrect = false;
  });
  
  // Check for standardized labels in Dating Preferences
  const datingLabels = [
    { name: 'Shared Values', pattern: 'label: "Shared Values"', found: datingContent.includes('label: "Shared Values"') },
    { name: 'Physical Attraction', pattern: 'label: "Physical Attraction"', found: datingContent.includes('label: "Physical Attraction"') },
    { name: 'Career & Ambition', pattern: 'label: "Career & Ambition"', found: datingContent.includes('label: "Career & Ambition"') },
    { name: 'Religious Compatibility', pattern: 'label: "Religious Compatibility"', found: datingContent.includes('label: "Religious Compatibility"') },
    { name: 'Same Tribe/Cultural Background', pattern: 'label: "Same Tribe/Cultural Background"', found: datingContent.includes('label: "Same Tribe/Cultural Background"') },
    { name: 'Intellectual Connection', pattern: 'label: "Intellectual Connection"', found: datingContent.includes('label: "Intellectual Connection"') }
  ];
  
  console.log('\n   Dating Preferences Labels:');
  let datingLabelsCorrect = true;
  datingLabels.forEach(label => {
    const status = label.found ? '✅' : '❌';
    console.log(`     ${status} ${label.name}`);
    if (!label.found) datingLabelsCorrect = false;
  });
  
  console.log('\n3. AGE-BASED FILTERING VERIFICATION');
  console.log('='.repeat(40));
  
  // Check for age filtering in MEET Profile
  const meetAgeFilter = meetContent.includes('.filter(priority => !isUnder18(user.dateOfBirth) || priority !== "looks")');
  const datingAgeFilter = datingContent.includes('isUnder18(user?.dateOfBirth)') && 
                         datingContent.includes('allPriorityOptions.filter(option => option.value !== "looks")');
  
  console.log(`   ${meetAgeFilter ? '✅' : '❌'} MEET Profile age-based filtering`);
  console.log(`   ${datingAgeFilter ? '✅' : '❌'} Dating Preferences age-based filtering`);
  
  console.log('\n4. CONSISTENCY VERIFICATION');
  console.log('='.repeat(30));
  
  const isConsistent = meetLabelsCorrect && datingLabelsCorrect && meetAgeFilter && datingAgeFilter;
  
  console.log(`   Labels standardized: ${meetLabelsCorrect && datingLabelsCorrect ? '✅' : '❌'}`);
  console.log(`   Age filtering implemented: ${meetAgeFilter && datingAgeFilter ? '✅' : '❌'}`);
  console.log(`   Overall consistency: ${isConsistent ? '✅' : '❌'}`);
  
  return isConsistent;
}

function displayExpectedBehavior() {
  console.log('\n5. EXPECTED USER EXPERIENCE');
  console.log('='.repeat(35));
  
  console.log('\n   👤 USERS 18+ (Dating Context):');
  console.log('   ────────────────────────────────');
  console.log('     1. Shared Values');
  console.log('     2. Personality');
  console.log('     3. Physical Attraction');
  console.log('     4. Career & Ambition');
  console.log('     5. Religious Compatibility'); 
  console.log('     6. Same Tribe/Cultural Background');
  console.log('     7. Intellectual Connection');
  
  console.log('\n   👶 USERS UNDER 18 (Friendship Context):');
  console.log('   ─────────────────────────────────────────');
  console.log('     1. Shared Values');
  console.log('     2. Personality');
  console.log('     3. Career & Ambition');
  console.log('     4. Religious Compatibility');
  console.log('     5. Same Tribe/Cultural Background');
  console.log('     6. Intellectual Connection');
  console.log('     (Physical Attraction filtered out)');
}

function displayBenefits() {
  console.log('\n6. STANDARDIZATION BENEFITS');
  console.log('='.repeat(35));
  
  console.log('   ✅ Consistent user experience across components');
  console.log('   ✅ Clear, descriptive priority labels for better understanding');
  console.log('   ✅ Age-appropriate content filtering for youth protection');
  console.log('   ✅ Unified terminology reducing user confusion');
  console.log('   ✅ Professional, descriptive labels instead of abbreviated ones');
  console.log('   ✅ Maintains existing functionality while improving UX');
}

// Run verification
const implementationComplete = checkImplementation();

displayExpectedBehavior();
displayBenefits();

console.log('\n' + '='.repeat(70));

if (implementationComplete) {
  console.log('🎉 SUCCESS: Matching Priorities fully standardized!');
  console.log('   Both MEET Profile and Dating Preferences now use identical priority options.');
  console.log('   Age-appropriate filtering ensures proper content for all users.');
  console.log('   Users will experience consistent terminology across the platform.');
} else {
  console.log('⚠️  INCOMPLETE: Some standardization issues remain.');
  console.log('   Review the failed checks above and complete the implementation.');
}

console.log('\n📋 NEXT STEPS:');
console.log('   1. Test both components with users 18+ and under 18');
console.log('   2. Verify priorities save correctly across both interfaces');
console.log('   3. Confirm age-based filtering works as expected');
console.log('   4. User experience should now be consistent and intuitive');

console.log('\n' + '='.repeat(70));