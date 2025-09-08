/**
 * Simple script to log in as a test user for testing
 * This submits a login request to the API with hardcoded credentials
 */

// Use curl instead of node-fetch which has ESM issues
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

async function loginAsTestUser() {
  try {
    // The auth system uses the 'email' field for login (not username)
    // This can contain an email, username, or phone number - all are accepted
    const curlCommand = `curl -v -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}' -c cookies.txt http://localhost:5000/api/login`;
    
    console.log('Sending login request...');
    const { stdout, stderr } = await execPromise(curlCommand);
    
    console.log('Response:', stdout);
    
    if (stdout && stdout.includes('"id":')) {
      console.log('Login successful!');
      console.log('\nYou can now refresh the app and navigate to the Messages page to see the chat tabs.');
      console.log('Cookie has been saved to cookies.txt');
    } else {
      console.error('Login failed');
      console.error('Error details:', stderr);
    }
  } catch (error) {
    console.error('Error during login request:', error);
  }
}

loginAsTestUser();