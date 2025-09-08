#!/usr/bin/env node

/**
 * REAL-TIME CONTEXT FACTORS DEMONSTRATION
 * 
 * Explaining Temporal Context factors using real users Chima (12) and Thibaut (7)
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.DATABASE_URL);

console.log('\n🕒 REAL-TIME CONTEXT FACTORS DEMONSTRATION');
console.log('=========================================\n');
console.log('Using REAL users: Chima (User 12) and Thibaut (User 7)');
console.log('Demonstrating how Temporal Context factors create personalized matching\n');

class RealTimeContextDemo {
  
  // TEMPORAL FACTOR 1: Online Status Detection (30% weight)
  async calculateOnlineStatus(userId) {
    const userActivity = await sql`
      SELECT 
        id, full_name, last_active, is_online,
        EXTRACT(EPOCH FROM (NOW() - last_active))/60 as minutes_since_active
      FROM users WHERE id = ${userId}
    `;

    if (userActivity.length === 0) return { isOnline: false, onlineBoost: 0, name: 'Unknown' };

    const user = userActivity[0];
    const minutesSinceActive = user.minutes_since_active ? Number(user.minutes_since_active) : null;
    
    let isOnline = false, onlineBoost = 0, status = '';

    if (user.is_online === true) {
      isOnline = true;
      onlineBoost = 1.0;
      status = 'ONLINE NOW';
    } else if (minutesSinceActive !== null) {
      if (minutesSinceActive <= 5) {
        isOnline = true;
        onlineBoost = 1.0;
        status = 'JUST ACTIVE';
      } else if (minutesSinceActive <= 15) {
        onlineBoost = 0.8;
        status = 'RECENTLY ACTIVE';
      } else if (minutesSinceActive <= 30) {
        onlineBoost = 0.6;
        status = 'MODERATELY ACTIVE';
      } else if (minutesSinceActive <= 120) {
        onlineBoost = 0.3;
        status = 'SOMEWHAT ACTIVE';
      } else {
        onlineBoost = 0.1;
        status = 'LESS ACTIVE';
      }
    }

    return { 
      isOnline, 
      onlineBoost, 
      status, 
      name: user.full_name,
      minutesAgo: minutesSinceActive ? minutesSinceActive.toFixed(1) : 'Unknown'
    };
  }

  // TEMPORAL FACTOR 2: Last Active Recency Scoring (25% weight)
  async calculateRecencyScore(userId) {
    const userRecency = await sql`
      SELECT 
        id, full_name, last_active,
        CASE 
          WHEN last_active IS NULL THEN 0
          WHEN last_active >= NOW() - INTERVAL '1 hour' THEN 100
          WHEN last_active >= NOW() - INTERVAL '6 hours' THEN 80
          WHEN last_active >= NOW() - INTERVAL '24 hours' THEN 60
          WHEN last_active >= NOW() - INTERVAL '3 days' THEN 40
          WHEN last_active >= NOW() - INTERVAL '7 days' THEN 20
          ELSE 10
        END as recency_score,
        EXTRACT(EPOCH FROM (NOW() - last_active))/3600 as hours_since_active
      FROM users WHERE id = ${userId}
    `;

    if (userRecency.length === 0) return { score: 0, name: 'Unknown' };

    const user = userRecency[0];
    const recencyScore = Number(user.recency_score);
    const hoursAgo = user.hours_since_active ? Number(user.hours_since_active).toFixed(1) : 'Unknown';

    let tier = '';
    if (recencyScore >= 100) tier = 'PEAK ENGAGEMENT';
    else if (recencyScore >= 80) tier = 'HIGH ENGAGEMENT';
    else if (recencyScore >= 60) tier = 'GOOD ENGAGEMENT';
    else if (recencyScore >= 40) tier = 'MODERATE ENGAGEMENT';
    else if (recencyScore >= 20) tier = 'LOW ENGAGEMENT';
    else tier = 'MINIMAL ENGAGEMENT';

    return {
      score: recencyScore / 100,
      tier,
      name: user.full_name,
      hoursAgo
    };
  }

  // TEMPORAL FACTOR 3: Profile Update Freshness (20% weight)
  async calculateProfileFreshness(userId) {
    const updateTimestamp = await sql`
      SELECT 
        id, full_name, updated_at, created_at,
        CASE 
          WHEN updated_at IS NOT NULL THEN
            CASE 
              WHEN updated_at >= NOW() - INTERVAL '24 hours' THEN 100
              WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 80
              WHEN updated_at >= NOW() - INTERVAL '30 days' THEN 60
              WHEN updated_at >= NOW() - INTERVAL '90 days' THEN 40
              ELSE 20
            END
          WHEN created_at >= NOW() - INTERVAL '7 days' THEN 70
          WHEN created_at >= NOW() - INTERVAL '30 days' THEN 50
          ELSE 30
        END as freshness_score,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(updated_at, created_at)))/86400 as days_since_update
      FROM users WHERE id = ${userId}
    `;

    if (updateTimestamp.length === 0) return { score: 0.3, name: 'Unknown' };

    const user = updateTimestamp[0];
    const freshnessScore = Number(user.freshness_score);
    const daysAgo = user.days_since_update ? Number(user.days_since_update).toFixed(1) : 'Unknown';

    let freshness = '';
    if (freshnessScore >= 100) freshness = 'ULTRA FRESH';
    else if (freshnessScore >= 80) freshness = 'VERY FRESH';
    else if (freshnessScore >= 60) freshness = 'FRESH';
    else if (freshnessScore >= 40) freshness = 'MODERATE';
    else freshness = 'STALE';

    return {
      score: freshnessScore / 100,
      freshness,
      name: user.full_name,
      daysAgo
    };
  }

  // TEMPORAL FACTOR 4: Peak Activity Hours Alignment (25% weight)
  async analyzePeakActivityHours(userId) {
    const swipeActivity = await sql`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as activity_hour,
        COUNT(*) as swipe_count
      FROM swipe_history 
      WHERE user_id = ${userId}
        AND timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY swipe_count DESC
      LIMIT 3
    `;

    const userName = await sql`SELECT full_name FROM users WHERE id = ${userId}`;
    const name = userName[0]?.full_name || 'Unknown';

    const activityMap = new Map();
    swipeActivity.forEach(record => {
      const hour = Number(record.activity_hour);
      const weight = Number(record.swipe_count);
      activityMap.set(hour, weight);
    });

    const sortedActivity = Array.from(activityMap.entries()).sort((a, b) => b[1] - a[1]);
    const peakHours = sortedActivity.map(([hour]) => hour);
    const totalActivity = Array.from(activityMap.values()).reduce((sum, count) => sum + count, 0);
    const activityStrength = totalActivity > 0 ? Math.min(totalActivity / 10, 1.0) : 0.1;

    // Convert hours to readable format
    const readableHours = peakHours.map(hour => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      return `${displayHour}:00 ${period}`;
    });

    return { 
      peakHours, 
      readableHours,
      activityStrength, 
      name,
      totalSwipes: totalActivity
    };
  }

  async calculateActivityAlignment(userId1, userId2) {
    const user1Activity = await this.analyzePeakActivityHours(userId1);
    const user2Activity = await this.analyzePeakActivityHours(userId2);

    if (user1Activity.peakHours.length === 0 || user2Activity.peakHours.length === 0) {
      return {
        score: 0.5,
        alignment: 'INSUFFICIENT DATA',
        sharedHours: [],
        user1: user1Activity,
        user2: user2Activity
      };
    }

    const user1Hours = new Set(user1Activity.peakHours);
    const user2Hours = new Set(user2Activity.peakHours);
    const sharedHours = [...user1Hours].filter(hour => user2Hours.has(hour));

    let alignmentScore = 0;
    if (sharedHours.length > 0) {
      alignmentScore += 0.6 * (sharedHours.length / Math.max(user1Hours.size, user2Hours.size));
    }

    const strengthFactor = (user1Activity.activityStrength + user2Activity.activityStrength) / 2;
    alignmentScore *= strengthFactor;
    alignmentScore = Math.max(0, Math.min(1, alignmentScore));

    let alignment = '';
    if (alignmentScore >= 0.8) alignment = 'EXCELLENT ALIGNMENT';
    else if (alignmentScore >= 0.6) alignment = 'GOOD ALIGNMENT';
    else if (alignmentScore >= 0.4) alignment = 'MODERATE ALIGNMENT';
    else if (alignmentScore >= 0.2) alignment = 'POOR ALIGNMENT';
    else alignment = 'NO ALIGNMENT';

    const sharedReadableHours = sharedHours.map(hour => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      return `${displayHour}:00 ${period}`;
    });

    return {
      score: alignmentScore,
      alignment,
      sharedHours: sharedReadableHours,
      user1: user1Activity,
      user2: user2Activity
    };
  }

  // COMBINED CONTEXT SCORE CALCULATION
  async calculateContextScore(targetUserId, candidateUserId) {
    console.log(`\n🎯 CALCULATING CONTEXT SCORE: ${targetUserId} evaluating ${candidateUserId}`);
    console.log('=' .repeat(70));

    const [onlineStatus, recencyScore, freshnessScore, activityAlignment] = await Promise.all([
      this.calculateOnlineStatus(candidateUserId),
      this.calculateRecencyScore(candidateUserId),
      this.calculateProfileFreshness(candidateUserId),
      this.calculateActivityAlignment(targetUserId, candidateUserId)
    ]);

    console.log(`\n📊 TEMPORAL FACTOR BREAKDOWN for ${onlineStatus.name}:`);
    console.log(`   1️⃣ ONLINE STATUS (30% weight):`);
    console.log(`      Status: ${onlineStatus.status}`);
    console.log(`      Boost: ${onlineStatus.onlineBoost.toFixed(3)}/1.000`);
    console.log(`      Minutes ago: ${onlineStatus.minutesAgo}`);
    
    console.log(`\n   2️⃣ RECENCY SCORE (25% weight):`);
    console.log(`      Tier: ${recencyScore.tier}`);
    console.log(`      Score: ${recencyScore.score.toFixed(3)}/1.000`);
    console.log(`      Hours ago: ${recencyScore.hoursAgo}`);
    
    console.log(`\n   3️⃣ PROFILE FRESHNESS (20% weight):`);
    console.log(`      Freshness: ${freshnessScore.freshness}`);
    console.log(`      Score: ${freshnessScore.score.toFixed(3)}/1.000`);
    console.log(`      Days since update: ${freshnessScore.daysAgo}`);
    
    console.log(`\n   4️⃣ ACTIVITY ALIGNMENT (25% weight):`);
    console.log(`      Alignment: ${activityAlignment.alignment}`);
    console.log(`      Score: ${activityAlignment.score.toFixed(3)}/1.000`);
    if (activityAlignment.sharedHours.length > 0) {
      console.log(`      Shared peak hours: ${activityAlignment.sharedHours.join(', ')}`);
    }
    console.log(`      ${activityAlignment.user1.name} peaks: ${activityAlignment.user1.readableHours.join(', ') || 'None'}`);
    console.log(`      ${activityAlignment.user2.name} peaks: ${activityAlignment.user2.readableHours.join(', ') || 'None'}`);

    // Calculate weighted context score
    const onlineWeight = 0.3, recencyWeight = 0.25, freshnessWeight = 0.20, alignmentWeight = 0.25;

    let contextScore = 0;
    contextScore += onlineWeight * onlineStatus.onlineBoost;
    contextScore += recencyWeight * recencyScore.score;
    contextScore += freshnessWeight * freshnessScore.score;
    contextScore += alignmentWeight * activityAlignment.score;

    contextScore = Math.max(0, Math.min(1, contextScore));

    console.log(`\n🔢 WEIGHTED CALCULATION:`);
    console.log(`   Online Status: ${onlineWeight} × ${onlineStatus.onlineBoost.toFixed(3)} = ${(onlineWeight * onlineStatus.onlineBoost).toFixed(3)}`);
    console.log(`   Recency Score: ${recencyWeight} × ${recencyScore.score.toFixed(3)} = ${(recencyWeight * recencyScore.score).toFixed(3)}`);
    console.log(`   Profile Fresh: ${freshnessWeight} × ${freshnessScore.score.toFixed(3)} = ${(freshnessWeight * freshnessScore.score).toFixed(3)}`);
    console.log(`   Activity Align: ${alignmentWeight} × ${activityAlignment.score.toFixed(3)} = ${(alignmentWeight * activityAlignment.score).toFixed(3)}`);

    console.log(`\n🎯 FINAL CONTEXT SCORE: ${contextScore.toFixed(3)}/1.000`);

    let contextTier = '';
    if (contextScore >= 0.8) contextTier = 'PREMIUM CONTEXT';
    else if (contextScore >= 0.6) contextTier = 'HIGH CONTEXT';
    else if (contextScore >= 0.4) contextTier = 'MODERATE CONTEXT';
    else if (contextScore >= 0.2) contextTier = 'LOW CONTEXT';
    else contextTier = 'MINIMAL CONTEXT';

    console.log(`   Context Tier: ${contextTier}`);
    console.log(`   → This score affects candidate ranking in Context-Aware Re-ranking (25% of total hybrid score)`);

    return contextScore;
  }
}

async function demonstrateRealTimeContextFactors() {
  try {
    const contextDemo = new RealTimeContextDemo();
    
    console.log('🔍 SCENARIO 1: CHIMA (User 12) EVALUATING THIBAUT (User 7)');
    console.log('===========================================================');
    
    const chimaToThibautScore = await contextDemo.calculateContextScore(12, 7);
    
    console.log('\n\n🔍 SCENARIO 2: THIBAUT (User 7) EVALUATING CHIMA (User 12)');
    console.log('===========================================================');
    
    const thibautToChimaScore = await contextDemo.calculateContextScore(7, 12);
    
    console.log('\n\n📈 REAL-TIME CONTEXT FACTORS IMPACT');
    console.log('==================================\n');
    
    console.log('💡 HOW THIS AFFECTS MATCHING:');
    console.log(`   • Chima sees Thibaut with context boost: ${chimaToThibautScore.toFixed(3)}`);
    console.log(`   • Thibaut sees Chima with context boost: ${thibautToChimaScore.toFixed(3)}`);
    console.log(`   • Higher context scores = higher position in swipe deck`);
    console.log(`   • Context accounts for 25% of total hybrid matching score`);
    
    console.log('\n🎯 PERSONALIZATION INSIGHTS:');
    console.log('   ✅ Online users get priority positioning');
    console.log('   ✅ Recently active users rank higher');
    console.log('   ✅ Fresh profiles get preference');
    console.log('   ✅ Users with aligned activity patterns match better');
    
    console.log('\n🚀 CONTEXT-AWARE RE-RANKING IN ACTION:');
    console.log('   • Traditional content-based filtering: 40% weight');
    console.log('   • Collaborative filtering: 35% weight');
    console.log('   • Real-time context factors: 25% weight ← THIS DEMO');
    console.log('   • Result: Highly personalized, time-sensitive matching');
    
    console.log('\n✨ REAL-TIME ADVANTAGES:');
    console.log('   🔥 Shows online users first (immediate response potential)');
    console.log('   ⚡ Promotes recently active profiles (engagement likelihood)');
    console.log('   🔄 Boosts fresh profiles (active maintenance behavior)');
    console.log('   🕒 Aligns activity patterns (temporal compatibility)');

  } catch (error) {
    console.error('❌ Error in real-time context demonstration:', error);
  }
}

demonstrateRealTimeContextFactors();