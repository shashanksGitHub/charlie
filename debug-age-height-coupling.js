// Debug script to investigate age range and height coupling bug
// This script tests the dating preferences functionality to identify why clicking age range buttons affects height range

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testAgeHeightCoupling() {
  console.log('🔧 [DEBUG] Starting age-height coupling investigation...');
  
  const options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Navigate to the dating preferences page
    console.log('🔧 [DEBUG] Navigating to dating preferences page...');
    await driver.get('http://localhost:5000/dating-preferences');
    
    // Wait for the page to load
    await driver.wait(until.elementLocated(By.css('[class*="age-range"]')), 10000);
    
    // Look for age range and height range elements
    const ageRangeElements = await driver.findElements(By.xpath("//div[contains(text(), 'Age Range')]"));
    const heightRangeElements = await driver.findElements(By.xpath("//div[contains(text(), 'Height Range')]"));
    
    console.log(`🔧 [DEBUG] Found ${ageRangeElements.length} age range elements`);
    console.log(`🔧 [DEBUG] Found ${heightRangeElements.length} height range elements`);
    
    // Get initial console logs from browser
    const initialLogs = await driver.manage().logs().get('browser');
    console.log('🔧 [DEBUG] Initial browser console logs:');
    initialLogs.forEach(log => {
      if (log.message.includes('FIELD-COUPLING-DEBUG') || log.message.includes('ageRange') || log.message.includes('height')) {
        console.log(`  ${log.level}: ${log.message}`);
      }
    });
    
    // Try to click an age range button (if available)
    try {
      const ageRangeButtons = await driver.findElements(By.css('button[class*="plus"], button[class*="minus"]'));
      if (ageRangeButtons.length > 0) {
        console.log(`🔧 [DEBUG] Found ${ageRangeButtons.length} +/- buttons, clicking first one...`);
        await ageRangeButtons[0].click();
        
        // Wait a moment for state updates
        await driver.sleep(1000);
        
        // Get console logs after clicking
        const afterClickLogs = await driver.manage().logs().get('browser');
        console.log('🔧 [DEBUG] Console logs after button click:');
        afterClickLogs.forEach(log => {
          if (log.message.includes('FIELD-COUPLING-DEBUG') || log.message.includes('ageRange') || log.message.includes('height')) {
            console.log(`  ${log.level}: ${log.message}`);
          }
        });
      } else {
        console.log('🔧 [DEBUG] No +/- buttons found');
      }
    } catch (buttonError) {
      console.log('🔧 [DEBUG] Error clicking buttons:', buttonError.message);
    }
    
  } catch (error) {
    console.error('🔧 [DEBUG] Test failed:', error);
  } finally {
    await driver.quit();
  }
}

// Run the test
testAgeHeightCoupling().catch(console.error);