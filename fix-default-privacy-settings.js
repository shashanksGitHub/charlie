/**
 * Script to fix default privacy settings for existing users
 * This script:
 * 1. Sets profileHidden to false for all users (makes MEET profiles visible by default)
 * 2. Ensures SUITE discovery settings are properly defaulted to false (visible)
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function fixDefaultPrivacySettings() {
  try {
    console.log('🔧 Starting privacy settings fix...');

    // 1. Fix MEET profile visibility - set profileHidden to false for all users
    const meetResult = await sql`
      UPDATE users 
      SET profile_hidden = false 
      WHERE profile_hidden = true
    `;
    console.log(`✅ Updated ${meetResult.length} users to have visible MEET profiles`);

    // 2. Ensure SUITE profile settings exist with correct defaults
    const suiteResult = await sql`
      INSERT INTO suite_profile_settings (
        user_id, 
        job_profile_active, 
        mentorship_profile_active, 
        networking_profile_active,
        hidden_in_job_discovery,
        hidden_in_mentorship_discovery, 
        hidden_in_networking_discovery,
        created_at, 
        updated_at
      )
      SELECT 
        u.id,
        false, -- job_profile_active
        false, -- mentorship_profile_active  
        false, -- networking_profile_active
        false, -- hidden_in_job_discovery (visible by default)
        false, -- hidden_in_mentorship_discovery (visible by default)
        false, -- hidden_in_networking_discovery (visible by default)
        NOW(),
        NOW()
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM suite_profile_settings sps 
        WHERE sps.user_id = u.id
      )
    `;
    console.log(`✅ Created SUITE profile settings for ${suiteResult.length} users`);

    // 3. Fix any existing SUITE settings that have incorrect defaults
    const suiteUpdateResult = await sql`
      UPDATE suite_profile_settings 
      SET 
        hidden_in_job_discovery = false,
        hidden_in_mentorship_discovery = false,
        hidden_in_networking_discovery = false,
        updated_at = NOW()
      WHERE 
        hidden_in_job_discovery = true OR
        hidden_in_mentorship_discovery = true OR  
        hidden_in_networking_discovery = true
    `;
    console.log(`✅ Fixed SUITE discovery visibility for ${suiteUpdateResult.length} existing settings`);

    // 4. Verify the changes
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;
    const visibleMeetProfiles = await sql`
      SELECT COUNT(*) as count FROM users WHERE profile_hidden = false
    `;
    const visibleSuiteSettings = await sql`
      SELECT COUNT(*) as count FROM suite_profile_settings 
      WHERE hidden_in_job_discovery = false 
        AND hidden_in_mentorship_discovery = false 
        AND hidden_in_networking_discovery = false
    `;

    console.log('\n📊 Final Status:');
    console.log(`Total users: ${totalUsers[0].count}`);
    console.log(`Users with visible MEET profiles: ${visibleMeetProfiles[0].count}`);
    console.log(`Users with visible SUITE profiles: ${visibleSuiteSettings[0].count}`);

    console.log('\n✅ Privacy settings fix completed successfully!');
    console.log('🎯 All new and existing users now have profiles visible by default');

  } catch (error) {
    console.error('❌ Error fixing privacy settings:', error);
    process.exit(1);
  }
}

// Run the script
fixDefaultPrivacySettings();