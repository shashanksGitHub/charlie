/**
 * Script to create a real pending match between test users
 * This will create a one-way like that should NOT appear in Messages pages
 */

const fetch = require('node-fetch');

async function createPendingMatch() {
  console.log('Creating pending match for testing...');
  
  try {
    // Login as user Thibaut
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'user_mbocxp0p', // Thibaut's username
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Logged in as Thibaut');

    // Get user info to confirm identity
    const userResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookies
      }
    });

    const userData = await userResponse.json();
    console.log(`User: ${userData.fullName} (ID: ${userData.id})`);

    // Like user Andriy (should create a pending match)
    const likeResponse = await fetch('http://localhost:5000/api/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        targetUserId: 2 // Andriy's user ID
      })
    });

    if (!likeResponse.ok) {
      const errorText = await likeResponse.text();
      throw new Error(`Like failed: ${likeResponse.status} - ${errorText}`);
    }

    const likeResult = await likeResponse.json();
    console.log('✅ Created like:', likeResult);

    // Check matches to see if it's pending
    const matchesResponse = await fetch('http://localhost:5000/api/matches', {
      headers: {
        'Cookie': cookies
      }
    });

    const matches = await matchesResponse.json();
    console.log('\nMatches for Thibaut:');
    matches.forEach(match => {
      console.log(`- Match ID: ${match.id}, Type: ${match.matchType || 'undefined'}, Matched: ${match.matched}, User: ${match.user?.fullName}`);
    });

    // Now login as Andriy to check his perspective
    const loginResponse2 = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'user_mbpe5i0s', // Andriy's username
        password: 'password123'
      })
    });

    if (!loginResponse2.ok) {
      throw new Error(`Login as Andriy failed: ${loginResponse2.status}`);
    }

    const cookies2 = loginResponse2.headers.get('set-cookie');
    console.log('\n✅ Logged in as Andriy');

    // Check Andriy's matches
    const matchesResponse2 = await fetch('http://localhost:5000/api/matches', {
      headers: {
        'Cookie': cookies2
      }
    });

    const matches2 = await matchesResponse2.json();
    console.log('\nMatches for Andriy:');
    matches2.forEach(match => {
      console.log(`- Match ID: ${match.id}, Type: ${match.matchType || 'undefined'}, Matched: ${match.matched}, User: ${match.user?.fullName}`);
    });

    console.log('\n=== TEST VERIFICATION ===');
    console.log('1. Go to Messages page as Thibaut - should NOT see Andriy in chat tabs');
    console.log('2. Go to Matches page as Andriy - should see Thibaut as a pending match to like back');
    console.log('3. If Andriy likes back, then both should see each other in Messages page');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

createPendingMatch();