#!/usr/bin/env node

/**
 * HYBRID MATCHING ENGINE SWIPE CARD ORDER ANALYSIS
 * Analyzes the personalized swipe card order for Chima, Thibaut, and Obed
 * based on the 40% Content + 35% Collaborative + 25% Context hybrid algorithm
 */

import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

// User mapping
const USER_MAPPING = {
  'Chima': 12,
  'Thibaut': 7, 
  'Obed': 11
};

async function analyzeSwipeOrder() {
  console.log('🎯 HYBRID MATCHING ENGINE SWIPE CARD ORDER ANALYSIS\n');
  console.log('Analyzing personalized swipe card order based on:');
  console.log('• Content-Based Filtering (40%): Cosine, Jaccard, TF-IDF, Preference Alignment');
  console.log('• Collaborative Filtering (35%): Matrix Factorization + User Behavior Patterns');
  console.log('• Context-Aware Re-ranking (25%): Temporal, Geographic, Profile Health, Reciprocity\n');

  for (const [userName, userId] of Object.entries(USER_MAPPING)) {
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`📱 SWIPE CARD ORDER FOR ${userName.toUpperCase()} (User ${userId})`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    try {
      // Simulate the discovery API call to get actual swipe order
      const response = await fetch(`http://localhost:5000/api/discovery/enhanced?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`❌ Failed to fetch data for ${userName}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const swipeCards = data.matches || data.users || [];

      if (swipeCards.length === 0) {
        console.log(`⚠️  No swipe cards available for ${userName}`);
        continue;
      }

      console.log(`🎯 AI-RANKED SWIPE CARD ORDER (${swipeCards.length} cards):\n`);

      swipeCards.forEach((card, index) => {
        const rank = index + 1;
        const userId = card.id || card.userId;
        const name = card.fullName || card.name || `User ${userId}`;
        const score = card.score ? parseFloat(card.score).toFixed(3) : 'N/A';
        const content = card.content ? parseFloat(card.content).toFixed(3) : 'N/A';
        const collaborative = card.collaborative ? parseFloat(card.collaborative).toFixed(3) : 'N/A';
        const context = card.context ? parseFloat(card.context).toFixed(3) : 'N/A';

        console.log(`${rank.toString().padStart(2)}. ${name} (ID: ${userId})`);
        console.log(`    Overall Score: ${score}`);
        console.log(`    Content (40%): ${content} | Collaborative (35%): ${collaborative} | Context (25%): ${context}`);
        console.log('');
      });

      // Show top 3 matches with detailed breakdown
      console.log('🏆 TOP 3 MATCHES BREAKDOWN:\n');
      swipeCards.slice(0, 3).forEach((card, index) => {
        const rank = index + 1;
        const name = card.fullName || card.name || `User ${card.id || card.userId}`;
        const score = card.score ? parseFloat(card.score).toFixed(3) : 'N/A';
        
        console.log(`${rank}. ${name}: ${score} overall compatibility`);
        
        if (card.content) {
          console.log(`   • Content-Based: ${parseFloat(card.content).toFixed(3)} (interests, preferences, profile matching)`);
        }
        if (card.collaborative) {
          console.log(`   • Collaborative: ${parseFloat(card.collaborative).toFixed(3)} (similar user behavior patterns)`);
        }
        if (card.context) {
          console.log(`   • Context-Aware: ${parseFloat(card.context).toFixed(3)} (activity, location, profile completeness)`);
        }
        console.log('');
      });

    } catch (error) {
      console.error(`❌ Error analyzing ${userName}:`, error.message);
    }
  }

  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('The hybrid matching engine personalizes swipe card order based on comprehensive compatibility scoring.');
}

// Run the analysis
analyzeSwipeOrder().catch(console.error);