/**
 * Debug Login Script for MEET App
 * 
 * This script creates a pre-authenticated session for testing purposes.
 * It bypasses normal login flow to create a test session.
 */

const express = require('express');
const session = require('express-session');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');
const { eq } = require('drizzle-orm');

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Configure database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Create a simple Express app for session management
const app = express();

// Set up session middleware
app.use(session({
  secret: 'debug-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Create a debug login endpoint
app.get('/debug-login/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  
  if (isNaN(userId)) {
    return res.status(400).send('Invalid user ID');
  }
  
  try {
    // Get the user from the database
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    // Create a session with this user
    req.session.passport = {
      user: userId
    };
    
    // Mark user as online
    await updateUserOnlineStatus(userId, true);
    
    // Return success
    return res.send(`
      <h1>Debug Login Successful</h1>
      <p>Logged in as: ${user.username} (ID: ${user.id})</p>
      <p>Return to the app to continue testing.</p>
    `);
  } catch (error) {
    console.error('Debug login error:', error);
    return res.status(500).send('Error creating debug session');
  }
});

async function getUserById(userId) {
  // Get user from database
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

async function updateUserOnlineStatus(userId, isOnline) {
  // Update user's online status
  const query = 'UPDATE users SET is_online = $1 WHERE id = $2';
  await pool.query(query, [isOnline, userId]);
}

// Start the server
const port = 5002;
app.listen(port, () => {
  console.log(`Debug login server running at http://localhost:${port}`);
  console.log(`Use http://localhost:${port}/debug-login/3 to log in as user 3`);
});