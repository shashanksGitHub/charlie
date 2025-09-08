/**
 * Debug the live matching engine to see what it's actually returning
 * vs what users see on the frontend
 */

import { execSync } from 'child_process';

async function debugLiveMatching() {
  console.log('🔍 DEBUGGING LIVE AI MATCHING ENGINE');
  console.log('=====================================');
  
  // Test with actual user IDs from logs: User 11 (Obed) and User 7 (Thibaut)
  const testUsers = [
    { id: 11, name: 'Obed' },
    { id: 7, name: 'Thibaut' }
  ];
  
  for (const testUser of testUsers) {
    console.log(`\n🎯 Testing AI Engine for User ${testUser.name} (ID: ${testUser.id})`);
    console.log('=' + '='.repeat(50));
    
    try {
      // Call the exact same API endpoint the frontend uses
      const result = execSync(
        `curl -s -X GET "http://localhost:5000/api/home-page-data" \
         -H "Content-Type: application/json" \
         -H "Cookie: $(cat .auth_cookie)" \
         --connect-timeout 10`,
        { encoding: 'utf8', timeout: 15000 }
      );
      
      console.log('API Response Length:', result.length);
      
      if (result.includes('discoverUsers')) {
        const apiData = JSON.parse(result);
        const discoverUsers = apiData.discoverUsers || [];
        
        console.log(`✅ API returned ${discoverUsers.length} discover users for ${testUser.name}`);
        
        if (discoverUsers.length > 0) {
          console.log('\n📊 First 5 users in discovery order:');
          discoverUsers.slice(0, 5).forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.full_name || user.username || 'Unknown'} (ID: ${user.id})`);
            console.log(`     Score: ${user.score?.toFixed(3) || 'N/A'} | Age: ${user.age || 'N/A'} | Location: ${user.location || 'N/A'}`);
            
            if (user.scoreDetails) {
              console.log(`     Content: ${user.scoreDetails.content?.toFixed(3) || 'N/A'} | Collaborative: ${user.scoreDetails.collaborative?.toFixed(3) || 'N/A'} | Context: ${user.scoreDetails.context?.toFixed(3) || 'N/A'}`);
            }
          });
          
          // Compare with user's actual experience
          if (testUser.id === 11) { // Obed
            console.log('\n🔍 Obed reported seeing: Thibaut, Fran, Dean');
            console.log('AI is returning:', discoverUsers.slice(0, 3).map(u => u.full_name || u.username).join(', '));
          } else if (testUser.id === 7) { // Thibaut  
            console.log('\n🔍 Thibaut reported seeing: Fran, Dean, Obed');
            console.log('AI is returning:', discoverUsers.slice(0, 3).map(u => u.full_name || u.username).join(', '));
          }
          
        } else {
          console.log('⚠️  No discover users returned');
        }
        
      } else {
        console.log('❌ API response doesn\'t contain discoverUsers');
        console.log('Response preview:', result.substring(0, 200));
      }
      
    } catch (error) {
      console.error(`❌ Failed to test user ${testUser.name}:`, error.message);
    }
  }
  
  // Also test the matching engine directly
  console.log('\n🧮 TESTING MATCHING ENGINE DIRECTLY');
  console.log('====================================');
  
  try {
    const directResult = execSync(
      `npx tsx -e "
        import { matchingEngine } from './server/matching-engine.js';
        
        async function testDirect() {
          try {
            const context = {
              currentTime: new Date(),
              lastActiveThreshold: 60,
              mode: 'meet'
            };
            
            // Test for Obed (ID: 11)
            const obedResults = await matchingEngine.getRankedDiscovery(11, context, 10);
            console.log('Direct Engine - Obed sees:', obedResults.slice(0, 3).map(u => \`\${u.full_name || u.username} (ID: \${u.id}, Score: \${u.score?.toFixed(3)})\`).join(', '));
            
            // Test for Thibaut (ID: 7)  
            const thibautResults = await matchingEngine.getRankedDiscovery(7, context, 10);
            console.log('Direct Engine - Thibaut sees:', thibautResults.slice(0, 3).map(u => \`\${u.full_name || u.username} (ID: \${u.id}, Score: \${u.score?.toFixed(3)})\`).join(', '));
            
          } catch (error) {
            console.error('Direct test failed:', error.message);
          }
        }
        
        testDirect().then(() => process.exit(0)).catch(console.error);
      "`,
      { encoding: 'utf8' }
    );
    
    console.log(directResult);
    
  } catch (error) {
    console.error('❌ Direct matching engine test failed:', error.message);
  }
  
  console.log('\n🏁 DEBUG COMPLETE');
  console.log('=================');
  console.log('Check if AI engine results match what users actually see!');
}

debugLiveMatching().catch(console.error);