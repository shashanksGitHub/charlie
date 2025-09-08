/**
 * Predict what User 12 (Chima Ngozi) should see according to AI matching engine
 * Based on AI algorithm analysis and profile characteristics
 */

import { execSync } from 'child_process';

async function predictChimaResults() {
  console.log('🎯 PREDICTING AI RESULTS FOR USER 12 (CHIMA NGOZI)');
  console.log('================================================');
  
  try {
    // Check Chima's profile characteristics
    console.log('📊 Analyzing Chima\'s profile for AI prediction...');
    
    const profileAnalysis = execSync(
      `npx tsx -e "
        import { storage } from './server/storage.js';
        
        async function analyzeChima() {
          try {
            const user = await storage.getUser(12); // Chima's ID
            const preferences = await storage.getUserPreferences(12);
            
            console.log('Chima Profile Analysis:');
            console.log('- Name:', user?.full_name || user?.username);
            console.log('- Age:', user?.age);
            console.log('- Location:', user?.location);
            console.log('- Bio length:', user?.bio?.length || 0);
            console.log('- Interests count:', user?.interests?.split(',').length || 0);
            console.log('- Has photo:', !!user?.photoUrl);
            console.log('- Religion:', user?.religion);
            console.log('- Ethnicity:', user?.ethnicity);
            
            if (preferences) {
              console.log('\\nPreferences:');
              console.log('- Age range:', preferences.minAge + '-' + preferences.maxAge);
              console.log('- Location pref:', preferences.locationPreference);
              console.log('- Ethnicity pref:', preferences.ethnicityPreference);
            }
            
            // Calculate profile completeness
            const fields = [user?.bio, user?.profession, user?.interests, user?.photoUrl, user?.religion, user?.ethnicity];
            const completed = fields.filter(f => f && f.trim().length > 0).length;
            const completeness = completed / fields.length;
            
            console.log('\\nProfile Completeness:', (completeness * 100).toFixed(1) + '%');
            
          } catch (error) {
            console.error('Analysis failed:', error.message);
          }
        }
        
        analyzeChima().then(() => process.exit(0)).catch(console.error);
      "`,
      { encoding: 'utf8' }
    );
    
    console.log(profileAnalysis);
    
    // Try to run AI matching for Chima
    console.log('\n🤖 Running AI Matching Simulation for Chima...');
    
    const aiPrediction = execSync(
      `npx tsx -e "
        import { matchingEngine } from './server/matching-engine.js';
        
        async function predictForChima() {
          try {
            const context = {
              currentTime: new Date(),
              lastActiveThreshold: 60,
              mode: 'meet'
            };
            
            console.log('🎯 Running AI matching for User 12 (Chima)...');
            const results = await matchingEngine.getRankedDiscovery(12, context, 10);
            
            console.log(\`AI predicts \${results.length} ranked users for Chima:\`);
            
            if (results.length > 0) {
              console.log('\\nTop 5 AI-predicted matches for Chima:');
              results.slice(0, 5).forEach((user, index) => {
                console.log(\`  \${index + 1}. \${user.full_name || user.username} (ID: \${user.id})\`);
                console.log(\`     Score: \${user.score?.toFixed(3) || 'N/A'}\`);
                if (user.scoreDetails) {
                  console.log(\`     Breakdown: Content=\${user.scoreDetails.content?.toFixed(3)} | Collaborative=\${user.scoreDetails.collaborative?.toFixed(3)} | Context=\${user.scoreDetails.context?.toFixed(3)}\`);
                }
              });
              
              const topThreeNames = results.slice(0, 3).map(u => u.full_name || u.username);
              console.log(\`\\n📋 Chima's Predicted Top 3: \${topThreeNames.join(', ')}\`);
              
            } else {
              console.log('❌ No AI results available for Chima');
            }
            
          } catch (error) {
            console.error('AI prediction failed:', error.message);
            console.error('Stack:', error.stack);
          }
        }
        
        predictForChima().then(() => process.exit(0)).catch(console.error);
      "`,
      { encoding: 'utf8' }
    );
    
    console.log(aiPrediction);
    
  } catch (error) {
    console.error('❌ Prediction failed:', error.message);
  }
  
  console.log('\n🏁 CHIMA AI PREDICTION COMPLETE');
  console.log('===============================');
  console.log('This shows what User 12 (Chima) should see when she logs in');
  console.log('based on the sophisticated AI matching algorithms.');
}

predictChimaResults().catch(console.error);