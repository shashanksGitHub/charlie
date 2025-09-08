/**
 * Script to create a test user and log in
 * This will create a user with known credentials and attempt to log in
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);

// Hash a password using the same method as the application
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function createTestUser() {
  try {
    // Database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Connected to database.');
    
    // Check if test user exists
    const checkResult = await pool.query(`
      SELECT id, username, email, phone_number
      FROM users
      WHERE username = 'logintest' OR email = 'logintest@example.com'
    `);
    
    let userId;
    
    if (checkResult.rows.length > 0) {
      console.log(`Test user already exists: ${JSON.stringify(checkResult.rows[0])}`);
      userId = checkResult.rows[0].id;
    } else {
      // Create a test user with known credentials
      const hashedPassword = await hashPassword('password123');
      
      const insertResult = await pool.query(`
        INSERT INTO users (
          username, password, full_name, email, phone_number, 
          gender, location, bio, created_at
        )
        VALUES (
          'logintest', $1, 'Login Test', 'logintest@example.com', '9999999999',
          'other', 'Test Location', 'This is a test user for login testing', NOW()
        )
        RETURNING id, username, email
      `, [hashedPassword]);
      
      console.log(`Created new test user: ${JSON.stringify(insertResult.rows[0])}`);
      userId = insertResult.rows[0].id;
    }
    
    // Now try to log in with these credentials
    const loginCommand = `curl -v -X POST -H "Content-Type: application/json" -d '{"email":"logintest@example.com","password":"password123"}' -c cookies.txt http://localhost:5000/api/login`;
    
    console.log('\nAttempting to log in...');
    const { stdout, stderr } = await execPromise(loginCommand);
    
    console.log('\nLogin response:');
    console.log(stdout);
    
    if (stdout && stdout.includes('"id":')) {
      console.log('\nLogin successful!');
      console.log('Session cookie saved to cookies.txt');
      
      // Extract the cookie from the response
      let cookie = '';
      const cookieMatch = stderr.match(/set-cookie: ([^;]+)/i);
      if (cookieMatch && cookieMatch[1]) {
        cookie = cookieMatch[1];
        console.log(`\nExtracted cookie: ${cookie}`);
      }
      
      // Now try to access the matches API
      console.log('\nTesting access to /api/matches endpoint...');
      const apiCommand = `curl -v -H "Cookie: ${cookie}" http://localhost:5000/api/matches`;
      
      const { stdout: apiOutput } = await execPromise(apiCommand);
      console.log('\nAPI response:');
      console.log(apiOutput);
      
      try {
        const matches = JSON.parse(apiOutput);
        console.log(`\nFound ${matches.length} matches.`);
      } catch (e) {
        console.log('\nCould not parse API response as JSON.');
      }
    } else {
      console.log('\nLogin failed!');
      console.error('Error details:', stderr);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error during test:', error);
  }
}

createTestUser();