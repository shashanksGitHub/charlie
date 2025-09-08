const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function loginAndTestGrid() {
  console.log('Testing grid cards by logging in as Lupita (user 6)...');
  
  try {
    // Login as Lupita who should have incoming networking likes
    console.log('Step 1: Logging in as Lupita...');
    
    const { stdout: loginResult } = await execAsync(`
      curl -s -X POST "http://localhost:5000/api/auth/login" \\
        -H "Content-Type: application/json" \\
        -c cookies.txt \\
        -d '{
          "phoneNumber": "+233501234568",
          "password": "password123"
        }'
    `);
    
    console.log('Login result:', loginResult);
    
    // Wait for login to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check networking connections for user 6
    console.log('\\nStep 2: Fetching networking connections...');
    
    const { stdout: connectionsResult } = await execAsync(`
      curl -s "http://localhost:5000/api/suite/connections/networking" \\
        -b cookies.txt
    `);
    
    console.log('Networking connections result:', connectionsResult);
    
    // Also check the user info
    console.log('\\nStep 3: Verifying user session...');
    
    const { stdout: userResult } = await execAsync(`
      curl -s "http://localhost:5000/api/auth/me" \\
        -b cookies.txt
    `);
    
    // Extract just the JSON part (user data should be at the end)
    const userMatch = userResult.match(/{"id":\d+.*?}$/);
    if (userMatch) {
      console.log('Current user:', userMatch[0]);
    } else {
      console.log('Could not extract user data from response');
    }
    
    console.log('\\n✅ Test completed - check Connections page at /suite/connections');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

loginAndTestGrid();