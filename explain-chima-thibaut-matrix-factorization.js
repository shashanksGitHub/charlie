#!/usr/bin/env node

/**
 * MATRIX FACTORIZATION EXPLANATION: CHIMA & THIBAUT CASE STUDY
 * 
 * Detailed explanation of how Matrix Factorization (Simplified SVD) 
 * processes real user interaction data for Chima and Thibaut
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🧮 MATRIX FACTORIZATION EXPLAINED: CHIMA & THIBAUT');
console.log('=================================================\n');

const sql = neon(process.env.DATABASE_URL);

async function explainMatrixFactorization() {
  try {
    
    console.log('STEP 1: IDENTIFYING CHIMA & THIBAUT IN THE SYSTEM');
    console.log('===============================================\n');
    
    // Find Chima and Thibaut in the database
    const users = await sql`
      SELECT id, full_name, username, email, bio, profession, location
      FROM users 
      WHERE full_name ILIKE '%chima%' OR full_name ILIKE '%thibaut%' 
      OR bio ILIKE '%chima%' OR bio ILIKE '%thibaut%'
      ORDER BY id
    `;
    
    console.log(`Found ${users.length} users matching Chima/Thibaut:`);
    users.forEach(user => {
      console.log(`  • User ${user.id}: ${user.full_name} (${user.username})`);
      if (user.bio) console.log(`    Bio: ${user.bio.substring(0, 100)}...`);
      if (user.profession) console.log(`    Profession: ${user.profession}`);
      if (user.location) console.log(`    Location: ${user.location}`);
    });
    
    if (users.length < 2) {
      console.log('\n⚠️  Insufficient Chima/Thibaut data. Using system users for demonstration...');
      
      // Get any two users for demonstration
      const demoUsers = await sql`
        SELECT id, full_name, username, bio, profession
        FROM users 
        WHERE id IN (7, 11)
        ORDER BY id
      `;
      
      if (demoUsers.length >= 2) {
        console.log('\nUsing demo users for Matrix Factorization explanation:');
        demoUsers.forEach(user => {
          console.log(`  • User ${user.id}: ${user.full_name} (${user.username})`);
        });
        
        await explainWithUsers(demoUsers[0].id, demoUsers[1].id, demoUsers[0].full_name, demoUsers[1].full_name);
      }
      
      return;
    }
    
    // Use Chima and Thibaut for explanation
    const chima = users.find(u => u.full_name.toLowerCase().includes('chima'));
    const thibaut = users.find(u => u.full_name.toLowerCase().includes('thibaut'));
    
    if (chima && thibaut) {
      await explainWithUsers(chima.id, thibaut.id, chima.full_name, thibaut.full_name);
    } else if (users.length >= 2) {
      await explainWithUsers(users[0].id, users[1].id, users[0].full_name, users[1].full_name);
    }
    
  } catch (error) {
    console.error('❌ Error in Matrix Factorization explanation:', error);
  }
}

async function explainWithUsers(userId1, userId2, userName1, userName2) {
  try {
    
    console.log(`\nSTEP 2: ANALYZING INTERACTION DATA FOR ${userName1} & ${userName2}`);
    console.log('='.repeat(60) + '\n');
    
    // Get their interaction history
    const interactions = await sql`
      SELECT 
        'match' as source,
        user_id_1, user_id_2, 
        CASE 
          WHEN matched = true THEN 2
          WHEN is_dislike = true THEN -1
          ELSE 0
        END as rating,
        created_at as timestamp
      FROM matches 
      WHERE (user_id_1 = ${userId1} AND user_id_2 = ${userId2})
         OR (user_id_1 = ${userId2} AND user_id_2 = ${userId1})
      
      UNION ALL
      
      SELECT 
        'swipe' as source,
        user_id, target_user_id,
        CASE 
          WHEN action = 'star' THEN 2
          WHEN action = 'like' THEN 1
          WHEN action = 'dislike' THEN -1
          ELSE 0
        END as rating,
        timestamp
      FROM swipe_history 
      WHERE (user_id = ${userId1} AND target_user_id = ${userId2})
         OR (user_id = ${userId2} AND target_user_id = ${userId1})
      
      ORDER BY timestamp DESC
    `;
    
    console.log('🔍 DIRECT INTERACTIONS BETWEEN THE USERS:');
    if (interactions.length > 0) {
      interactions.forEach((interaction, index) => {
        const actionType = interaction.rating === 2 ? 'MATCH/STAR' : 
                          interaction.rating === 1 ? 'LIKE' : 
                          interaction.rating === -1 ? 'DISLIKE' : 'NEUTRAL';
        console.log(`   ${index + 1}. ${interaction.source.toUpperCase()}: User ${interaction.user_id_1 || interaction.user_id} → User ${interaction.user_id_2 || interaction.target_user_id}: ${actionType} (${interaction.rating})`);
      });
    } else {
      console.log('   No direct interactions found between these users');
    }
    
    console.log(`\nSTEP 3: USER-ITEM INTERACTION MATRIX CONSTRUCTION`);
    console.log('===============================================\n');
    
    // Get all match interactions for both users
    const matchInteractions = await sql`
      SELECT 
        'match' as source,
        user_id_1 as user_id, user_id_2 as item_id,
        CASE 
          WHEN matched = true THEN 2
          WHEN is_dislike = true THEN -1
          ELSE 0
        END as rating
      FROM matches 
      WHERE user_id_1 IN (${userId1}, ${userId2})
      
      UNION ALL
      
      SELECT 
        'match' as source,
        user_id_2 as user_id, user_id_1 as item_id,
        CASE 
          WHEN matched = true THEN 2
          WHEN is_dislike = true THEN -1
          ELSE 0
        END as rating
      FROM matches 
      WHERE user_id_2 IN (${userId1}, ${userId2})
    `;
    
    // Get all swipe interactions for both users
    const swipeInteractions = await sql`
      SELECT 
        'swipe' as source,
        user_id, target_user_id as item_id,
        CASE 
          WHEN action = 'star' THEN 2
          WHEN action = 'like' THEN 1
          WHEN action = 'dislike' THEN -1
          ELSE 0
        END as rating
      FROM swipe_history 
      WHERE user_id IN (${userId1}, ${userId2})
    `;
    
    // Combine all interactions and filter out neutral ratings
    const allInteractions = [...matchInteractions, ...swipeInteractions].filter(i => i.rating !== 0);
    
    console.log('📊 INTERACTION MATRIX FOR MATRIX FACTORIZATION:');
    console.log('   Rating Scale: +2 (match/star), +1 (like), -1 (dislike), 0 (no interaction)\n');
    
    // Group by user
    const user1Interactions = allInteractions.filter(i => i.user_id === userId1);
    const user2Interactions = allInteractions.filter(i => i.user_id === userId2);
    
    console.log(`   ${userName1} (User ${userId1}) interactions:`);
    if (user1Interactions.length > 0) {
      user1Interactions.forEach(interaction => {
        const ratingType = interaction.rating === 2 ? 'MATCH/STAR' : 
                          interaction.rating === 1 ? 'LIKE' : 'DISLIKE';
        console.log(`     → User ${interaction.item_id}: ${ratingType} (${interaction.rating})`);
      });
    } else {
      console.log(`     No interactions recorded`);
    }
    
    console.log(`\n   ${userName2} (User ${userId2}) interactions:`);
    if (user2Interactions.length > 0) {
      user2Interactions.forEach(interaction => {
        const ratingType = interaction.rating === 2 ? 'MATCH/STAR' : 
                          interaction.rating === 1 ? 'LIKE' : 'DISLIKE';
        console.log(`     → User ${interaction.item_id}: ${ratingType} (${interaction.rating})`);
      });
    } else {
      console.log(`     No interactions recorded`);
    }
    
    console.log(`\nSTEP 4: SVD ALGORITHM EXPLANATION`);
    console.log('================================\n');
    
    console.log('🧮 HOW MATRIX FACTORIZATION WORKS:');
    console.log('');
    console.log('1. USER-ITEM MATRIX CONSTRUCTION:');
    console.log('   ┌─────────────┬─────────┬─────────┬─────────┐');
    console.log('   │    Users    │ Item A  │ Item B  │ Item C  │');
    console.log('   ├─────────────┼─────────┼─────────┼─────────┤');
    console.log(`   │ ${userName1.padEnd(11)} │   ${user1Interactions.find(i => i.item_id)?.rating || '?'}     │   ${user1Interactions.filter(i => i.rating !== 0)[1]?.rating || '?'}     │   ${user1Interactions.filter(i => i.rating !== 0)[2]?.rating || '?'}     │`);
    console.log(`   │ ${userName2.padEnd(11)} │   ${user2Interactions.find(i => i.item_id)?.rating || '?'}     │   ${user2Interactions.filter(i => i.rating !== 0)[1]?.rating || '?'}     │   ${user2Interactions.filter(i => i.rating !== 0)[2]?.rating || '?'}     │`);
    console.log('   └─────────────┴─────────┴─────────┴─────────┘');
    console.log('');
    
    console.log('2. SVD DECOMPOSITION:');
    console.log('   Matrix R ≈ U × Σ × V^T');
    console.log('   • R: User-Item Rating Matrix');
    console.log('   • U: User Feature Matrix (50 latent factors)');
    console.log('   • Σ: Singular Values (importance weights)');
    console.log('   • V^T: Item Feature Matrix (50 latent factors)');
    console.log('');
    
    console.log('3. GRADIENT DESCENT TRAINING:');
    console.log('   • Learning Rate: 0.01');
    console.log('   • Regularization: 0.01 (prevents overfitting)');
    console.log('   • Latent Factors: 50 dimensions');
    console.log('   • Max Iterations: 100');
    console.log('   • Convergence: When improvement < 0.001');
    console.log('');
    
    console.log('4. EMBEDDING GENERATION:');
    console.log(`   ${userName1} Embedding: 50-dimensional vector representing preferences`);
    console.log(`   ${userName2} Embedding: 50-dimensional vector representing preferences`);
    console.log('   Item Embeddings: 50-dimensional vectors for each user-as-item');
    console.log('');
    
    console.log(`STEP 5: COLLABORATIVE FILTERING PREDICTION`);
    console.log('=========================================\n');
    
    console.log('🔮 PREDICTION FORMULA:');
    console.log('   prediction = global_bias + user_bias + item_bias + dot_product(user_factors, item_factors)');
    console.log('');
    console.log('🎯 SIMILARITY CALCULATION (for finding similar users):');
    console.log('   similarity = cosine_similarity(user1_embedding, user2_embedding)');
    console.log('   = dot_product(u1, u2) / (||u1|| × ||u2||)');
    console.log('');
    
    console.log(`STEP 6: HYBRID INTEGRATION`);
    console.log('=========================\n');
    
    console.log('⚖️  CHARLEY HYBRID MATCHING ENGINE:');
    console.log('   Final Score = (40% × Content-Based) + (35% × Collaborative) + (25% × Context-Aware)');
    console.log('');
    console.log('🤝 ENHANCED COLLABORATIVE FILTERING:');
    console.log('   Collaborative Score = (70% × Matrix Factorization) + (30% × Traditional)');
    console.log('');
    console.log(`   For ${userName1} ↔ ${userName2} compatibility:`);
    console.log('   1. Matrix Factorization predicts rating using SVD embeddings');
    console.log('   2. Traditional approach finds similar users and their preferences');
    console.log('   3. Blend both approaches for robust recommendation');
    console.log('   4. Combine with content-based (profile similarity) and context (activity, online status)');
    console.log('');
    
    console.log(`STEP 7: REAL-WORLD BENEFITS`);
    console.log('==========================\n');
    
    console.log('✅ ADVANTAGES OF MATRIX FACTORIZATION:');
    console.log('   • Discovers hidden patterns in user behavior');
    console.log('   • Handles sparse interaction data effectively');
    console.log('   • Reduces dimensionality (millions of users → 50 factors)');
    console.log('   • Captures complex user-item relationships');
    console.log('   • Learns from similar users\' preferences automatically');
    console.log('');
    
    console.log('🎯 SPECIFIC TO DATING APPS:');
    console.log('   • Learns that users who like similar profiles tend to match');
    console.log('   • Identifies users with compatible swiping patterns');
    console.log('   • Predicts attraction based on collective behavior');
    console.log('   • Improves recommendations as more data is collected');
    console.log('');
    
    const totalInteractions = user1Interactions.length + user2Interactions.length + interactions.length;
    
    console.log('📈 CURRENT SYSTEM STATUS:');
    console.log(`   • Total interactions analyzed: ${totalInteractions}`);
    console.log(`   • Users in analysis: ${userName1} & ${userName2}`);
    console.log('   • SVD model: Auto-initializes on first discovery request');
    console.log('   • Integration: Live in CHARLEY hybrid matching engine');
    console.log('   • Performance: Real-time predictions with fallback mechanisms');
    
  } catch (error) {
    console.error('❌ Error in user analysis:', error);
  }
}

explainMatrixFactorization();