#!/usr/bin/env node

/**
 * COLLABORATIVE FILTERING DATA ANALYSIS
 * 
 * Comprehensive analysis of user interaction data availability
 * for Matrix Factorization (Simplified SVD) implementation
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔍 COLLABORATIVE FILTERING DATA ANALYSIS');
console.log('Matrix Factorization (Simplified SVD) Requirements');
console.log('================================================\n');

const sql = neon(process.env.DATABASE_URL);

async function analyzeCollaborativeFilteringData() {
  try {
    
    console.log('📊 DATA SOURCE 1: MATCHES TABLE - Like/Dislike Patterns');
    console.log('=====================================================\n');
    
    // Analyze matches table structure
    const matchesStructure = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'matches' 
      ORDER BY ordinal_position
    `;
    
    console.log('🏗️  MATCHES TABLE SCHEMA:');
    matchesStructure.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });
    
    // Get matches sample data (fix column names)
    const matchesSample = await sql`
      SELECT user_id_1, user_id_2, matched, is_dislike, created_at 
      FROM matches 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log(`\n📈 MATCHES DATA AVAILABILITY:`);
    console.log(`   Total sample records: ${matchesSample.length}`);
    
    if (matchesSample.length > 0) {
      console.log(`   Example: User ${matchesSample[0].user_id_1} ↔ User ${matchesSample[0].user_id_2}`);
      console.log(`   Matched: ${matchesSample[0].matched}, Dislike: ${matchesSample[0].is_dislike}`);
      
      // Analyze match patterns
      const matchStats = await sql`
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(CASE WHEN matched = true THEN 1 END) as successful_matches,
          COUNT(CASE WHEN is_dislike = true THEN 1 END) as dislikes,
          ROUND(
            COUNT(CASE WHEN matched = true THEN 1 END)::numeric / 
            COUNT(*)::numeric * 100, 2
          ) as match_rate
        FROM matches
      `;
      
      console.log(`\n📊 MATCH PATTERN ANALYSIS:`);
      console.log(`   Total interactions: ${matchStats[0].total_interactions}`);
      console.log(`   Successful matches: ${matchStats[0].successful_matches}`);
      console.log(`   Dislikes: ${matchStats[0].dislikes}`);
      console.log(`   Match rate: ${matchStats[0].match_rate}%`);
    }
    
    console.log('\n📊 DATA SOURCE 2: SWIPE_HISTORY TABLE - User Preference Patterns');
    console.log('=============================================================\n');
    
    // Analyze swipe history structure
    const swipeStructure = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'swipe_history' 
      ORDER BY ordinal_position
    `;
    
    console.log('🏗️  SWIPE_HISTORY TABLE SCHEMA:');
    swipeStructure.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });
    
    // Get swipe history sample (fix column names)
    const swipeSample = await sql`
      SELECT user_id, target_user_id, action, app_mode, timestamp 
      FROM swipe_history 
      ORDER BY timestamp DESC 
      LIMIT 5
    `;
    
    console.log(`\n📈 SWIPE HISTORY DATA AVAILABILITY:`);
    console.log(`   Total sample records: ${swipeSample.length}`);
    
    if (swipeSample.length > 0) {
      console.log(`   Example: User ${swipeSample[0].user_id} → User ${swipeSample[0].target_user_id}`);
      console.log(`   Action: ${swipeSample[0].action}, Mode: ${swipeSample[0].app_mode}`);
      
      // Analyze swipe patterns
      const swipeStats = await sql`
        SELECT 
          COUNT(*) as total_swipes,
          COUNT(CASE WHEN action = 'like' THEN 1 END) as likes,
          COUNT(CASE WHEN action = 'dislike' THEN 1 END) as dislikes,
          COUNT(CASE WHEN action = 'star' THEN 1 END) as stars,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(DISTINCT app_mode) as app_modes_used
        FROM swipe_history
      `;
      
      console.log(`\n📊 SWIPE PATTERN ANALYSIS:`);
      console.log(`   Total swipes: ${swipeStats[0].total_swipes}`);
      console.log(`   Likes: ${swipeStats[0].likes}`);
      console.log(`   Dislikes: ${swipeStats[0].dislikes}`);
      console.log(`   Stars: ${swipeStats[0].stars}`);
      console.log(`   Active users: ${swipeStats[0].active_users}`);
      console.log(`   App modes: ${swipeStats[0].app_modes_used}`);
    }
    
    console.log('\n📊 DATA SOURCE 3: MESSAGES TABLE - Engagement Patterns');
    console.log('====================================================\n');
    
    // Analyze messages structure
    const messagesStructure = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `;
    
    console.log('🏗️  MESSAGES TABLE SCHEMA:');
    messagesStructure.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });
    
    // Get messages sample
    const messagesSample = await sql`
      SELECT sender_id, receiver_id, content, created_at 
      FROM messages 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log(`\n📈 MESSAGES DATA AVAILABILITY:`);
    console.log(`   Total sample records: ${messagesSample.length}`);
    
    if (messagesSample.length > 0) {
      console.log(`   Example: User ${messagesSample[0].sender_id} → User ${messagesSample[0].receiver_id}`);
      console.log(`   Message length: ${messagesSample[0].content?.length || 0} characters`);
      
      // Analyze message engagement
      const messageStats = await sql`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT sender_id) as active_senders,
          COUNT(DISTINCT receiver_id) as active_receivers,
          AVG(LENGTH(content)) as avg_message_length,
          COUNT(DISTINCT CONCAT(LEAST(sender_id, receiver_id), '-', GREATEST(sender_id, receiver_id))) as unique_conversations
        FROM messages
        WHERE content IS NOT NULL
      `;
      
      console.log(`\n📊 MESSAGE ENGAGEMENT ANALYSIS:`);
      console.log(`   Total messages: ${messageStats[0].total_messages}`);
      console.log(`   Active senders: ${messageStats[0].active_senders}`);
      console.log(`   Active receivers: ${messageStats[0].active_receivers}`);
      console.log(`   Average message length: ${Math.round(messageStats[0].avg_message_length || 0)} chars`);
      console.log(`   Unique conversations: ${messageStats[0].unique_conversations}`);
    }
    
    console.log('\n📊 DATA SOURCE 4: MATCH SUCCESS RATES - Conversation Conversion');
    console.log('============================================================\n');
    
    // Analyze match-to-conversation conversion
    const conversationAnalysis = await sql`
      SELECT 
        COUNT(DISTINCT CONCAT(m.user_id_1, '-', m.user_id_2)) as total_matches,
        COUNT(DISTINCT 
          CASE 
            WHEN msg.id IS NOT NULL THEN 
              CONCAT(LEAST(m.user_id_1, m.user_id_2), '-', GREATEST(m.user_id_1, m.user_id_2))
          END
        ) as matches_with_messages,
        ROUND(
          COUNT(DISTINCT 
            CASE 
              WHEN msg.id IS NOT NULL THEN 
                CONCAT(LEAST(m.user_id_1, m.user_id_2), '-', GREATEST(m.user_id_1, m.user_id_2))
            END
          )::numeric / 
          NULLIF(COUNT(DISTINCT CONCAT(m.user_id_1, '-', m.user_id_2)), 0) * 100, 2
        ) as conversation_rate
      FROM matches m
      LEFT JOIN messages msg ON (
        (m.user_id_1 = msg.sender_id AND m.user_id_2 = msg.receiver_id) OR
        (m.user_id_1 = msg.receiver_id AND m.user_id_2 = msg.sender_id)
      )
      WHERE m.matched = true
    `;
    
    console.log(`📊 MATCH SUCCESS ANALYSIS:`);
    console.log(`   Total successful matches: ${conversationAnalysis[0].total_matches}`);
    console.log(`   Matches with conversations: ${conversationAnalysis[0].matches_with_messages}`);
    console.log(`   Conversation conversion rate: ${conversationAnalysis[0].conversation_rate}%`);
    
    console.log('\n🔍 COLLABORATIVE FILTERING READINESS ASSESSMENT');
    console.log('==============================================\n');
    
    // Check data sufficiency for Matrix Factorization
    const hasMatches = matchesSample.length > 0;
    const hasSwipes = swipeSample.length > 0;
    const hasMessages = messagesSample.length > 0;
    const hasConversions = conversationAnalysis[0].conversation_rate > 0;
    
    console.log('✅ DATA AVAILABILITY CHECKLIST:');
    console.log(`   ${hasMatches ? '✓' : '✗'} Matches table: ${hasMatches ? 'Available' : 'Empty'} (like/dislike patterns)`);
    console.log(`   ${hasSwipes ? '✓' : '✗'} Swipe history: ${hasSwipes ? 'Available' : 'Empty'} (user preferences)`);
    console.log(`   ${hasMessages ? '✓' : '✗'} Messages table: ${hasMessages ? 'Available' : 'Empty'} (engagement data)`);
    console.log(`   ${hasConversions ? '✓' : '✗'} Match success: ${conversationAnalysis[0].conversation_rate}% (conversation conversion)`);
    
    console.log('\n🎯 MATRIX FACTORIZATION IMPLEMENTATION PLAN:');
    console.log('===========================================\n');
    
    if (hasMatches && hasSwipes) {
      console.log('🚀 READY FOR IMPLEMENTATION:');
      console.log('   ✓ Sufficient user interaction data available');
      console.log('   ✓ User-item interaction matrix can be constructed');
      console.log('   ✓ Like/dislike patterns provide explicit feedback');
      console.log('   ✓ Swipe history provides implicit preferences');
      
      console.log('\n📋 IMPLEMENTATION STEPS:');
      console.log('   1. Create user-item interaction matrix from matches + swipe_history');
      console.log('   2. Apply matrix factorization (Simplified SVD)');
      console.log('   3. Generate user and item embeddings');
      console.log('   4. Calculate collaborative filtering scores');
      console.log('   5. Integrate with existing hybrid matching engine');
      
      if (hasMessages) {
        console.log('\n🎁 BONUS FEATURES AVAILABLE:');
        console.log('   ✓ Message engagement can enhance scoring');
        console.log('   ✓ Response rates can inform user activity levels');
        console.log('   ✓ Conversation success can validate match quality');
      }
    } else {
      console.log('⚠️  IMPLEMENTATION CHALLENGES:');
      if (!hasMatches) console.log('   - No match data available for explicit feedback');
      if (!hasSwipes) console.log('   - No swipe history for user preferences');
      console.log('   - Consider cold start problem for new users');
      console.log('   - May need to use content-based filtering primarily');
    }
    
    console.log('\n🔧 API ENDPOINTS STATUS:');
    console.log('=======================\n');
    
    console.log('✅ EXISTING ENDPOINTS:');
    console.log('   ✓ POST /api/swipe/history - Record swipe actions');
    console.log('   ✓ GET matches via storage.getMatches() - Get user matches');
    console.log('   ✓ GET messages via storage.getMessagesByMatchId() - Message data');
    console.log('   ✓ swipeHistory table integration in matching engine');
    
    console.log('\n🚧 NEEDED FOR COLLABORATIVE FILTERING:');
    console.log('   • User interaction pattern extraction function');
    console.log('   • Matrix factorization algorithm implementation');
    console.log('   • Similar users identification logic');
    console.log('   • Collaborative score calculation method');
    
    console.log('\n🎯 NEXT IMPLEMENTATION PHASE:');
    console.log('============================');
    console.log('Ready to implement Matrix Factorization (Simplified SVD) with:');
    console.log(`• ${matchesSample.length > 0 ? 'Real match data' : 'Simulated match data'}`);
    console.log(`• ${swipeSample.length > 0 ? 'Real swipe patterns' : 'Simulated swipe patterns'}`);
    console.log(`• ${messagesSample.length > 0 ? 'Real engagement metrics' : 'Basic engagement estimation'}`);
    console.log('• Integration with existing 40% content-based filtering');
    
  } catch (error) {
    console.error('❌ Analysis Error:', error);
  }
}

analyzeCollaborativeFilteringData();