// Find a fresh networking profile for testing - run in browser console
console.log('🔍 Finding fresh networking profile for testing...');

fetch('/api/suite/discovery/networking')
  .then(response => response.json())
  .then(profiles => {
    console.log('Available networking profiles:', profiles);
    
    if (profiles && profiles.length > 0) {
      const firstProfile = profiles[0];
      console.log('Testing with profile ID:', firstProfile.id);
      console.log('Profile details:', firstProfile);
      
      // Now test the notification with this fresh profile
      fetch('/api/suite/networking/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: firstProfile.id, action: 'like' })
      })
      .then(response => response.json())
      .then(result => {
        console.log('✅ Fresh networking like result:', result);
        if (result.success) {
          console.log('🎯 Watch for WebSocket notifications now!');
        }
      })
      .catch(error => {
        console.error('❌ Fresh networking like failed:', error);
      });
    } else {
      console.log('❌ No networking profiles available');
    }
  })
  .catch(error => {
    console.error('❌ Failed to fetch networking profiles:', error);
  });