/**
 * Script to reset all matches, messages, likes, and dislikes in the database
 * while preserving user data and profiles
 * 
 * This script uses CommonJS format to ensure compatibility
 */

// Import required dependencies
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');
require('dotenv').config();

// Configure WebSocket for Neon connection
neonConfig.webSocketConstructor = ws;

// Create a connection to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = pool.query.bind(pool);

async function resetAllMatchData() {
  console.log('Starting database cleanup...');
  
  try {
    // Check existing tables first
    console.log('Checking database tables...');
    const tablesResult = await db(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = tablesResult.rows.map(row => row.table_name);
    console.log('Found tables:', tableNames.join(', '));
    
    // Execute deletions in the correct order to avoid foreign key constraints
    
    // 1. Messages (dependent on matches)
    if (tableNames.includes('messages')) {
      console.log('Deleting all messages...');
      await db('DELETE FROM messages');
      console.log('✓ All messages deleted successfully');
    } else {
      console.log('⚠️ Messages table not found, skipping...');
    }
    
    // 2. Typing status
    if (tableNames.includes('typing_status')) {
      console.log('Deleting typing status records...');
      await db('DELETE FROM typing_status');
      console.log('✓ All typing status records deleted successfully');
    } else {
      console.log('⚠️ Typing status table not found, skipping...');
    }
    
    // 3. Try unread message counts with different possible table names
    try {
      if (tableNames.includes('unread_counts')) {
        console.log('Deleting unread counts...');
        await db('DELETE FROM unread_counts');
        console.log('✓ All unread counts deleted successfully');
      } else if (tableNames.includes('unread_message_counts')) {
        console.log('Deleting unread message counts...');
        await db('DELETE FROM unread_message_counts');
        console.log('✓ All unread message counts deleted successfully');
      } else {
        console.log('⚠️ No unread message counts table found, skipping...');
      }
    } catch (err) {
      console.log('⚠️ Error cleaning unread counts:', err.message);
    }
    
    // 4. Likes and dislikes
    if (tableNames.includes('likes')) {
      console.log('Deleting likes...');
      await db('DELETE FROM likes');
      console.log('✓ All likes deleted successfully');
    } else {
      console.log('⚠️ Likes table not found, skipping...');
    }
    
    if (tableNames.includes('dislikes')) {
      console.log('Deleting dislikes...');
      await db('DELETE FROM dislikes');
      console.log('✓ All dislikes deleted successfully');
    } else {
      console.log('⚠️ Dislikes table not found, skipping...');
    }
    
    // 5. Finally delete matches
    if (tableNames.includes('matches')) {
      console.log('Deleting matches...');
      await db('DELETE FROM matches');
      console.log('✓ All matches deleted successfully');
    } else {
      console.log('⚠️ Matches table not found, skipping...');
    }
    
    // 6. Reset user match-related counts
    if (tableNames.includes('users')) {
      console.log('Checking user table columns...');
      const columnsResult = await db(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      const columnNames = columnsResult.rows.map(row => row.column_name);
      console.log('User table columns:', columnNames.join(', '));
      
      // Build dynamic SQL to update only columns that exist
      const updateColumns = [];
      
      if (columnNames.includes('matches_count')) {
        updateColumns.push('matches_count = 0');
      }
      
      if (columnNames.includes('likes_count')) {
        updateColumns.push('likes_count = 0');
      }
      
      if (columnNames.includes('dislikes_count')) {
        updateColumns.push('dislikes_count = 0');
      }
      
      if (updateColumns.length > 0) {
        const updateSQL = `UPDATE users SET ${updateColumns.join(', ')}`;
        console.log('Resetting match counts...');
        console.log('Executing:', updateSQL);
        await db(updateSQL);
        console.log('✓ All user match counts reset to zero');
      } else {
        console.log('⚠️ No match-related count columns found in users table');
      }
    } else {
      console.log('⚠️ Users table not found, cannot reset counts');
    }
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('User profiles and other data remain intact.');
    
  } catch (error) {
    console.error('❌ Error resetting match data:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the cleanup
resetAllMatchData();