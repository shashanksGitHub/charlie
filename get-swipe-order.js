#!/usr/bin/env node

/**
 * Extract swipe card order from recent workflow logs
 */

console.log('🎯 HYBRID MATCHING ENGINE SWIPE CARD ORDER ANALYSIS\n');

// Extract from workflow console logs in the automated updates
const recentLogs = `
[MATCHING-ENGINE] Ranked 9 users for 12
[MATCHING-ENGINE] Top matches: [
  {
    userId: 7,
    score: '0.608',
    content: '0.733',
    collaborative: '0.500',
    context: '0.561'
  },
  {
    userId: 11,
    score: '0.577',
    content: '0.705',
    collaborative: '0.500',
    context: '0.478'
  },
  {
    userId: 2,
    score: '0.576',
    content: '0.728',
    collaborative: '0.500',
    context: '0.441'
  }
]

[MATCHING-ENGINE] Ranked 2 users for 11
[MATCHING-ENGINE] Top matches: [
  {
    userId: 12,
    score: '0.644',
    content: '0.844',
    collaborative: '0.500',
    context: '0.526'
  },
  {
    userId: 8,
    score: '0.539',
    content: '0.675',
    collaborative: '0.500',
    context: '0.376'
  }
]

[MATCHING-ENGINE] Ranked 9 users for 7
[MATCHING-ENGINE] Top matches: [
  {
    userId: 11,
    score: '0.577',
    content: '0.705',
    collaborative: '0.500',
    context: '0.478'
  }
]
`;

function parseUserMatches(logs, userId, userName) {
  const regex = new RegExp(`\\[MATCHING-ENGINE\\] Ranked \\d+ users for ${userId}[\\s\\S]*?\\[MATCHING-ENGINE\\] Top matches: \\[([\\s\\S]*?)\\]`, 'g');
  const match = regex.exec(logs);
  
  if (!match) {
    console.log(`❌ No matches found for ${userName} (User ${userId})`);
    return;
  }

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`📱 SWIPE CARD ORDER FOR ${userName.toUpperCase()} (User ${userId})`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  try {
    // Parse the match data
    const matchData = match[1];
    const users = [];
    
    // Extract each user match
    const userRegex = /{\s*userId:\s*(\d+),\s*score:\s*'([\d.]+)',\s*content:\s*'([\d.]+)',\s*collaborative:\s*'([\d.]+)',\s*context:\s*'([\d.]+)'\s*}/g;
    let userMatch;
    
    while ((userMatch = userRegex.exec(matchData)) !== null) {
      users.push({
        userId: parseInt(userMatch[1]),
        score: parseFloat(userMatch[2]),
        content: parseFloat(userMatch[3]),
        collaborative: parseFloat(userMatch[4]),
        context: parseFloat(userMatch[5])
      });
    }

    if (users.length === 0) {
      console.log(`⚠️  No parsed matches for ${userName}`);
      return;
    }

    console.log(`🎯 AI-RANKED SWIPE CARD ORDER (${users.length} cards):\n`);

    users.forEach((user, index) => {
      const rank = index + 1;
      const userNames = {
        2: 'Andriy',
        7: 'Thibaut', 
        8: 'Fran',
        11: 'Obed',
        12: 'Chima'
      };
      
      const name = userNames[user.userId] || `User ${user.userId}`;
      
      console.log(`${rank.toString().padStart(2)}. ${name} (ID: ${user.userId})`);
      console.log(`    Overall Score: ${user.score.toFixed(3)}`);
      console.log(`    Content (40%): ${user.content.toFixed(3)} | Collaborative (35%): ${user.collaborative.toFixed(3)} | Context (25%): ${user.context.toFixed(3)}`);
      console.log('');
    });

    console.log('🏆 TOP 3 MATCHES BREAKDOWN:\n');
    users.slice(0, 3).forEach((user, index) => {
      const rank = index + 1;
      const userNames = {
        2: 'Andriy',
        7: 'Thibaut', 
        8: 'Fran',
        11: 'Obed',
        12: 'Chima'
      };
      const name = userNames[user.userId] || `User ${user.userId}`;
      
      console.log(`${rank}. ${name}: ${user.score.toFixed(3)} overall compatibility`);
      console.log(`   • Content-Based: ${user.content.toFixed(3)} (interests, preferences, profile matching)`);
      console.log(`   • Collaborative: ${user.collaborative.toFixed(3)} (similar user behavior patterns)`);
      console.log(`   • Context-Aware: ${user.context.toFixed(3)} (activity, location, profile completeness)`);
      console.log('');
    });

  } catch (error) {
    console.error(`❌ Error parsing matches for ${userName}:`, error.message);
  }
}

// Analyze each user
parseUserMatches(recentLogs, 12, 'Chima');
parseUserMatches(recentLogs, 7, 'Thibaut');
parseUserMatches(recentLogs, 11, 'Obed');

console.log('\n🎯 ANALYSIS COMPLETE');
console.log('The hybrid matching engine personalizes swipe card order based on comprehensive compatibility scoring.');
console.log('Algorithm: 40% Content-Based + 35% Collaborative + 25% Context-Aware Re-ranking');