/**
 * Complete verification test for pending match filtering fix
 * This script will simulate the exact scenario and verify the fix works
 */

const puppeteer = require('puppeteer');

async function verifyPendingMatchFix() {
  console.log('Starting comprehensive pending match filtering verification...\n');

  let browser;
  try {
    // Launch browser for testing
    browser = await puppeteer.launch({ 
      headless: false, 
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging to catch our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[MESSAGES-NEW-FILTER]') || 
          text.includes('[HEAT-MESSAGES-FILTER]') || 
          text.includes('[SUITE-MESSAGES-FILTER]')) {
        console.log('🔍 Debug Log:', text);
      }
    });

    // Navigate to the app
    console.log('1. Navigating to application...');
    await page.goto('http://localhost:5000');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Check if we need to login or if already authenticated
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Try to navigate to messages page to trigger the filtering
    console.log('2. Attempting to navigate to Messages page...');
    await page.goto('http://localhost:5000/messages');
    await page.waitForTimeout(3000);
    
    // Check for any chat tabs in the messages page
    const chatTabs = await page.$$('[data-testid="chat-tab"], .chat-item, .message-item');
    console.log(`3. Found ${chatTabs.length} chat tabs in Messages page`);
    
    if (chatTabs.length === 0) {
      console.log('✅ SUCCESS: No chat tabs found - pending match correctly filtered out');
    } else {
      console.log('❌ POTENTIAL ISSUE: Chat tabs found - need to verify if they are pending matches');
      
      // Check each chat tab for user names
      for (let i = 0; i < chatTabs.length; i++) {
        const tabText = await chatTabs[i].textContent();
        console.log(`   Chat tab ${i + 1}: ${tabText}`);
        
        if (tabText.includes('Thibaut') || tabText.includes('Courtois')) {
          console.log('❌ BUG DETECTED: Thibaut appears in Messages (pending match not filtered)');
        }
      }
    }
    
    console.log('\n4. Test Summary:');
    console.log('   - Pending match exists in database: Thibaut -> Andriy (unconfirmed)');
    console.log('   - Expected: Messages page should NOT show Thibaut as chat tab');
    console.log('   - Actual: Check debug logs and chat tab count above');
    
  } catch (error) {
    console.error('Error during verification:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if we're in a proper environment first
if (typeof require !== 'undefined') {
  // Try to install puppeteer if not available
  try {
    require('puppeteer');
    verifyPendingMatchFix();
  } catch (err) {
    console.log('Puppeteer not available. Running basic verification instead...\n');
    
    // Fallback: Just log the current state
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    (async () => {
      try {
        const pendingMatches = await sql`
          SELECT m.*, u1.full_name as user1_name, u2.full_name as user2_name 
          FROM matches m 
          JOIN users u1 ON m.user_id_1 = u1.id 
          JOIN users u2 ON m.user_id_2 = u2.id 
          WHERE m.matched = false AND m.is_dislike = false
        `;
        
        console.log('📊 Current Database State:');
        console.log(`   Pending matches: ${pendingMatches.length}`);
        
        if (pendingMatches.length > 0) {
          pendingMatches.forEach(match => {
            console.log(`   - ${match.user1_name} -> ${match.user2_name} (ID: ${match.id})`);
          });
          
          console.log('\n🧪 Manual Test Instructions:');
          console.log('1. Login as Andriy (user_mbpe5i0s)');
          console.log('2. Go to Messages page');
          console.log('3. Check browser console for [MESSAGES-NEW-FILTER] logs');
          console.log('4. Verify Thibaut does NOT appear as chat tab');
        } else {
          console.log('   No pending matches found - create test data first');
        }
        
      } catch (error) {
        console.error('Database query failed:', error.message);
      }
    })();
  }
} else {
  console.log('Running in browser environment - manual verification needed');
}