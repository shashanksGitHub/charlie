/**
 * Debug script to directly test the API endpoints by sending a request
 * This will print the response or error details
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// Check if a session ID was provided as an argument
const sessionId = process.argv[2];

async function testMatchesAPI() {
  try {
    // Create a synthetic cookie with a connect.sid value (replace with real cookie value when available)
    const cookieValue = sessionId || 's:fake-session-id.XXXXXXX'; // Replace this with a real session ID when you have it
    
    console.log(`Testing /api/matches endpoint directly...`);
    
    // Make the API request with the cookie
    const curlCommand = `curl -v -H "Cookie: connect.sid=${cookieValue}" http://localhost:5000/api/matches`;
    
    const { stdout, stderr } = await execPromise(curlCommand);
    
    console.log('Response:');
    console.log(stdout);
    
    // Parse and display matches data in a more readable format
    try {
      const matches = JSON.parse(stdout);
      console.log(`\nFound ${matches.length} matches:`);
      matches.forEach((match, index) => {
        console.log(`\nMatch #${index + 1}:`);
        console.log(`ID: ${match.id}`);
        console.log(`Matched: ${match.matched}`);
        console.log(`User: ${match.user.fullName} (ID: ${match.user.id})`);
        console.log(`Last Message: ${match.lastMessage || 'None'}`);
        console.log(`Unread Count: ${match.unreadCount || 0}`);
      });
    } catch (parseError) {
      console.log('Could not parse response as JSON. This might indicate an authentication error.');
    }
    
    if (stderr && stderr.includes('401')) {
      console.log('\n⚠️ Authentication failed (401 Unauthorized). You need a valid session cookie.');
      console.log('Try logging in through the web interface first.');
    }
  } catch (error) {
    console.error('Error during API request:', error);
  }
}

// Run the test
testMatchesAPI();