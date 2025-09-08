/**
 * Simple verification script to test the networking swipe endpoint directly
 */

async function testNetworkingSwipe() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🚀 Testing networking swipe endpoint directly...');
    
    // Test with a sample networking profile swipe
    const response = await fetch('http://localhost:5000/api/suite/networking/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: 54, // Andriy's profile from the logs
        action: 'like'
      })
    });
    
    const responseText = await response.text();
    
    if (response.status === 401) {
      console.log('✅ Endpoint requires authentication (expected)');
      console.log('🔍 Response:', responseText);
      return true;
    } else if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Swipe endpoint working:', result);
      return true;
    } else {
      console.error('❌ Unexpected response:', response.status, responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testNetworkingSwipe()
  .then(success => {
    console.log(success ? '✅ Endpoint test passed' : '❌ Endpoint test failed');
    process.exit(success ? 0 : 1);
  });