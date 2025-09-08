/**
 * Live application test to verify the bidirectional dislike fix works in the real app
 * This creates the exact test scenario and provides manual verification steps
 */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function createLiveTestScenario() {
  console.log('🔧 SETTING UP LIVE APPLICATION TEST SCENARIO\n');

  try {
    // Step 1: Clean up any existing test data
    console.log('1. Cleaning up existing test data...');
    await sql`DELETE FROM matches WHERE (user_id_1 IN (1, 2) AND user_id_2 IN (1, 2))`;
    console.log('   ✓ Cleared all matches between test users');

    // Step 2: Create the test scenario - User A likes User B
    console.log('\n2. Creating test scenario: User A likes User B...');
    const testMatch = await sql`
      INSERT INTO matches (user_id_1, user_id_2, matched, is_dislike, created_at)
      VALUES (1, 2, false, false, NOW())
      RETURNING *
    `;
    console.log(`   ✓ Created pending match ID ${testMatch[0].id} (Thibaut -> Andriy)`);

    // Step 3: Verify current database state
    console.log('\n3. Current database state:');
    const currentMatches = await sql`
      SELECT m.*, u1.full_name as user1_name, u2.full_name as user2_name
      FROM matches m
      JOIN users u1 ON m.user_id_1 = u1.id
      JOIN users u2 ON m.user_id_2 = u2.id
      WHERE (m.user_id_1 IN (1, 2) AND m.user_id_2 IN (1, 2))
      ORDER BY m.created_at DESC
    `;
    
    currentMatches.forEach(match => {
      const status = match.matched ? 'CONFIRMED' : (match.is_dislike ? 'DISLIKE' : 'PENDING');
      console.log(`   ${match.user1_name} -> ${match.user2_name}: ${status} (ID: ${match.id})`);
    });

    // Step 4: Show expected behavior
    console.log('\n=== MANUAL TESTING INSTRUCTIONS ===');
    console.log('\n📱 TEST PHASE 1: Messages Page Filtering');
    console.log('1. Login as Andriy (user_mbpe5i0s)');
    console.log('2. Navigate to Messages page');
    console.log('3. Expected: NO chat tabs should appear (pending match filtered out)');
    console.log('4. Check browser console for [MESSAGES-NEW-FILTER] logs');
    
    console.log('\n📱 TEST PHASE 2: Matches Page Functionality');
    console.log('1. Still logged in as Andriy');
    console.log('2. Navigate to Matches page');
    console.log('3. Expected: Thibaut should appear as a pending match');
    console.log('4. Click on Thibaut\'s card and reject (X button)');
    console.log('5. Expected: Card disappears from Matches page');
    
    console.log('\n📱 TEST PHASE 3: Bidirectional Discover Filtering');
    console.log('1. Navigate to Discover page as Andriy');
    console.log('2. Expected: Thibaut should NOT appear in swipe cards');
    console.log('3. Switch to login as Thibaut (user_mbocxp0p)');
    console.log('4. Navigate to Discover page as Thibaut');
    console.log('5. Expected: Andriy should NOT appear in swipe cards');
    
    console.log('\n🔍 VERIFICATION COMMANDS:');
    console.log('Run these SQL queries to verify the fix:');
    console.log('\n-- Check final database state after rejection:');
    console.log('SELECT m.*, u1.full_name as user1, u2.full_name as user2');
    console.log('FROM matches m');
    console.log('JOIN users u1 ON m.user_id_1 = u1.id');
    console.log('JOIN users u2 ON m.user_id_2 = u2.id');
    console.log('WHERE (m.user_id_1 IN (1, 2) AND m.user_id_2 IN (1, 2))');
    console.log('ORDER BY m.created_at DESC;');
    
    console.log('\n-- Expected result after rejection:');
    console.log('-- Two dislike records:');
    console.log('-- 1. Andriy -> Thibaut (is_dislike: true, matched: false)');
    console.log('-- 2. Thibaut -> Andriy (is_dislike: true, matched: false)');
    
    console.log('\n✅ SUCCESS CRITERIA:');
    console.log('1. Messages page shows 0 chat tabs for Andriy');
    console.log('2. Matches page shows Thibaut before rejection');
    console.log('3. Rejection creates 2 bidirectional dislike records');
    console.log('4. Both users never see each other in Discover again');
    console.log('5. No errors in browser console or server logs');

    return {
      testMatchId: testMatch[0].id,
      setupComplete: true
    };

  } catch (error) {
    console.error('Failed to setup live test scenario:', error.message);
    return {
      setupComplete: false,
      error: error.message
    };
  }
}

// Create the live test scenario
createLiveTestScenario().then(result => {
  if (result.setupComplete) {
    console.log('\n🎯 LIVE TEST SCENARIO READY');
    console.log('Follow the manual testing instructions above to verify both fixes work correctly.');
  } else {
    console.log('\n❌ SETUP FAILED');
    console.log('Error:', result.error);
  }
});