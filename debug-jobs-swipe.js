/**
 * LIVE DEBUG: Test actual Jobs swipe with real API call
 */

const testJobsSwipe = async () => {
  console.log('🧪 [LIVE-DEBUG] Testing actual Jobs swipe...');
  
  try {
    // First get available Jobs cards
    const response = await fetch('/api/suite/discovery/jobs');
    const jobs = await response.json();
    
    if (jobs.length === 0) {
      console.log('❌ [LIVE-DEBUG] No Jobs cards available for testing');
      return;
    }
    
    const jobCard = jobs[0];
    console.log('📋 [LIVE-DEBUG] Found job card:', jobCard.id, 'from user:', jobCard.userId);
    
    // Now perform actual swipe
    console.log('🎯 [LIVE-DEBUG] Performing Jobs swipe...');
    
    const swipeResponse = await fetch('/api/suite/jobs/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: jobCard.id,
        action: 'like'
      })
    });
    
    const swipeResult = await swipeResponse.json();
    console.log('📤 [LIVE-DEBUG] Swipe result:', swipeResult);
    
    // Check if cards disappeared
    setTimeout(async () => {
      const afterResponse = await fetch('/api/suite/discovery/jobs');
      const afterJobs = await afterResponse.json();
      
      console.log('📊 [LIVE-DEBUG] Cards before swipe:', jobs.length);
      console.log('📊 [LIVE-DEBUG] Cards after swipe:', afterJobs.length);
      
      if (afterJobs.length < jobs.length) {
        console.log('✅ [LIVE-DEBUG] Card removal working!');
      } else {
        console.log('❌ [LIVE-DEBUG] Card removal NOT working!');
      }
    }, 1000);
    
  } catch (error) {
    console.error('💥 [LIVE-DEBUG] Error:', error);
  }
};

// Run the test
testJobsSwipe();