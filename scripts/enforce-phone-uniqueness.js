/**
 * Combined script to enforce phone number uniqueness
 * 1. Generates drizzle migrations
 * 2. Cleans up duplicate phone numbers
 * 3. Applies the migrations
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function enforcePhoneUniqueness() {
  try {
    console.log('🔧 Starting phone number uniqueness enforcement process...');
    
    // 1. Generate Drizzle migrations
    console.log('\n📝 Generating Drizzle migrations...');
    try {
      await execPromise('npm run db:generate');
      console.log('✅ Migration generation successful');
    } catch (error) {
      console.error('❌ Migration generation failed:', error.stderr || error.message);
      throw new Error('Migration generation failed');
    }
    
    // 2. Clean up duplicate phone numbers
    console.log('\n🧹 Cleaning up duplicate phone numbers...');
    try {
      await require('./cleanup-duplicates');
      console.log('✅ Cleanup successful');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      throw new Error('Cleanup failed');
    }
    
    // 3. Apply migrations
    console.log('\n⬆️ Applying migrations...');
    try {
      await execPromise('npm run db:push');
      console.log('✅ Migration application successful');
    } catch (error) {
      console.error('❌ Migration application failed:', error.stderr || error.message);
      throw new Error('Migration application failed');
    }
    
    console.log('\n🎉 Phone number uniqueness enforcement completed!');
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

enforcePhoneUniqueness();