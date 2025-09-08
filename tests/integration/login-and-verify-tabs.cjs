/**
 * Script to log in as the test user and verify that the matches API returns the correct data
 * This will help diagnose why chat tabs aren't appearing
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

async function loginAndVerifyTabs() {
  try {
    // Step 1: Log in as the test user
    console.log('Logging in as logintest user...');
    const loginCommand = `curl -v -X POST -H "Content-Type: application/json" -d '{"email":"logintest@example.com","password":"password123"}' -c cookies.txt http://localhost:5000/api/login`;
    
    let { stdout: loginOutput, stderr: loginError } = await execPromise(loginCommand);
    console.log('\nLogin response:', loginOutput);
    
    if (!loginOutput.includes('"id":')) {
      console.error('Login failed!');
      console.error('Error details:', loginError);
      return;
    }
    
    console.log('\nLogin successful!');
    
    // Extract cookie from response
    let cookie = '';
    const cookieMatch = loginError.match(/set-cookie: ([^;]+)/i);
    if (cookieMatch && cookieMatch[1]) {
      cookie = cookieMatch[1];
      console.log(`Extracted cookie: ${cookie}`);
    } else {
      console.log('Could not extract cookie from response, using cookie file instead.');
    }
    
    // Step 2: Fetch matches with the cookie
    console.log('\nFetching matches...');
    const matchesCommand = cookie 
      ? `curl -v -H "Cookie: ${cookie}" http://localhost:5000/api/matches`
      : `curl -v -b cookies.txt http://localhost:5000/api/matches`;
    
    const { stdout: matchesOutput } = await execPromise(matchesCommand);
    console.log('\nMatches response:', matchesOutput);
    
    // Parse and display matches data
    try {
      const matches = JSON.parse(matchesOutput);
      console.log(`\nFound ${matches.length} matches:`);
      
      if (matches.length === 0) {
        console.log('No matches found. Chat tabs will not appear.');
        return;
      }
      
      matches.forEach((match, index) => {
        console.log(`\nMatch #${index + 1}:`);
        console.log(`ID: ${match.id}`);
        console.log(`Matched: ${match.matched}`);
        console.log(`User: ${match.user.fullName} (ID: ${match.user.id})`);
        console.log(`Match Type: ${match.matchType || 'Not specified'}`);
        console.log(`Last Message: ${match.lastMessage || 'None'}`);
        console.log(`Unread Count: ${match.unreadCount || 0}`);
        
        // Check if this match should be displayed as a chat tab
        const shouldShowChatTab = match.matched === true || match.matchType === 'confirmed';
        console.log(`Should Show Chat Tab: ${shouldShowChatTab}`);
      });
      
      console.log('\nSuccess! These matches should appear as chat tabs in the Messages page.');
    } catch (parseError) {
      console.error('Error parsing matches response:', parseError);
    }
  } catch (error) {
    console.error('Error during login and verification:', error);
  }
}

loginAndVerifyTabs();