/**
 * Script to log in and open the Messages page
 * This will create the necessary cookie and provide instructions to see chat tabs
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fs = require('fs').promises;

async function loginAndPrepareMessagesPage() {
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
      console.log(`\nExtracted cookie: ${cookie}`);
    }
    
    // Step 2: Verify that the cookie gives access to matches
    console.log('\nVerifying access to matches with the cookie...');
    const matchesCommand = `curl -s -b cookies.txt http://localhost:5000/api/matches`;
    
    const { stdout: matchesOutput } = await execPromise(matchesCommand);
    
    try {
      const matches = JSON.parse(matchesOutput);
      console.log(`\nSuccess! Found ${matches.length} matches for user logintest.`);
      
      // Step 3: Create a simple HTML page that will set the cookie and redirect to the Messages page
      const cookieScript = `
<!DOCTYPE html>
<html>
<head>
  <title>Login Redirect</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      padding: 20px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #333;
    }
    p {
      line-height: 1.6;
      color: #555;
    }
    button {
      background-color: #4e5fd3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 20px;
    }
    button:hover {
      background-color: #3a4cbf;
    }
    .steps {
      text-align: left;
      margin-top: 20px;
    }
    .steps ol {
      margin-top: 10px;
    }
    .code {
      font-family: monospace;
      background-color: #f0f0f0;
      padding: 2px 5px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login as Test User</h1>
    <p>This page will set the authentication cookie for the test user and then redirect you to the Messages page.</p>
    
    <div class="steps">
      <strong>What will happen:</strong>
      <ol>
        <li>When you click the button below, we'll set the authentication cookie for <span class="code">logintest</span> user</li>
        <li>You'll be redirected to the Messages page where you should see a chat tab with Test User</li>
        <li>The chat tab should contain a message saying "Hello! Nice to meet you!"</li>
      </ol>
    </div>
    
    <button id="loginButton">Log In as Test User and Go to Messages</button>
  </div>

  <script>
    document.getElementById('loginButton').addEventListener('click', function() {
      // Set the cookie
      document.cookie = "connect.sid=${cookie.split('=')[1]}; path=/;";
      
      // Redirect to Messages page
      window.location.href = "/messages";
    });
  </script>
</body>
</html>
`;
      
      // Save the HTML file
      await fs.writeFile('login-redirect.html', cookieScript);
      console.log('\nCreated login-redirect.html file.');
      
      console.log('\n===== INSTRUCTIONS TO TEST CHAT TABS =====');
      console.log('1. Open login-redirect.html in a browser');
      console.log('2. Click the "Log In as Test User and Go to Messages" button');
      console.log('3. You should be redirected to the Messages page and see a chat tab with Test User');
      console.log('4. The chat tab should show the unread message "Hello! Nice to meet you!"');
      console.log('======================================\n');
      
    } catch (parseError) {
      console.error('Error parsing matches response:', parseError);
    }
  } catch (error) {
    console.error('Error during login preparation:', error);
  }
}

loginAndPrepareMessagesPage();