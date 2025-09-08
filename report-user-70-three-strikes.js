/**
 * Script to report user ID 70 three times to trigger suspension system
 * This will create 3 report strikes against user 70
 */

import { db } from './server/db.js';
import { userReportStrikes, users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function reportUser70ThreeStrikes() {
  try {
    console.log('🚨 [ADMIN-REPORT] Starting 3-strike reporting for user ID 70');

    // Strike 1: Inappropriate Behavior
    const strike1 = await db.insert(userReportStrikes).values({
      reporterUserId: 1, // Admin user ID
      reportedUserId: 70,
      reason: 'inappropriate_behavior',
      description: 'Strike 1: Inappropriate behavior in chat messages',
      createdAt: new Date(),
    }).returning();

    console.log('⚡ Strike 1 created:', strike1[0]);

    // Strike 2: Harassment
    const strike2 = await db.insert(userReportStrikes).values({
      reporterUserId: 2, // Different reporter
      reportedUserId: 70,
      reason: 'harassment',
      description: 'Strike 2: Harassment and unwanted contact',
      createdAt: new Date(),
    }).returning();

    console.log('⚡ Strike 2 created:', strike2[0]);

    // Strike 3: Fake Profile
    const strike3 = await db.insert(userReportStrikes).values({
      reporterUserId: 1, // Different reporter (using valid user ID)
      reportedUserId: 70,
      reason: 'fake_profile',
      description: 'Strike 3: Fake profile information and photos',
      createdAt: new Date(),
    }).returning();

    console.log('⚡ Strike 3 created:', strike3[0]);

    // Check total strikes
    const totalStrikes = await db
      .select()
      .from(userReportStrikes)
      .where(eq(userReportStrikes.reportedUserId, 70));

    console.log(`🎯 User 70 now has ${totalStrikes.length} total strikes!`);

    if (totalStrikes.length >= 3) {
      console.log('🔨 User 70 should be suspended with 3+ strikes!');
      
      // Check if user needs to be suspended
      
      // Suspend the user
      const suspensionExpires = new Date();
      suspensionExpires.setDate(suspensionExpires.getDate() + 3); // 3-day suspension
      
      const suspendedUser = await db.update(users)
        .set({
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionExpiresAt: suspensionExpires,
        })
        .where(eq(users.id, 70))
        .returning();

      console.log('🚫 User 70 has been suspended:', suspendedUser[0]);
    }

    console.log('✅ [ADMIN-REPORT] Successfully reported user 70 three times!');
    return {
      success: true,
      strikes: totalStrikes.length,
      message: 'User 70 reported 3 times and suspended'
    };

  } catch (error) {
    console.error('❌ [ADMIN-REPORT] Error reporting user 70:', error);
    console.error('Error details:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the function
reportUser70ThreeStrikes()
  .then(result => {
    console.log('📊 Final result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });