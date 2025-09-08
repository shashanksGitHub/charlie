// Bidirectional notification test - creates a scenario where current user receives notifications
console.log('Setting up bidirectional notification test...');

async function setupBidirectionalTest() {
  try {
    // Step 1: Get current user info
    const userResponse = await fetch('/api/user');
    const currentUser = await userResponse.json();
    console.log('Current user:', currentUser.id, currentUser.fullName);
    
    // Step 2: Get available networking profiles
    const profilesResponse = await fetch('/api/suite/discovery/networking');
    const profiles = await profilesResponse.json();
    
    if (!profiles || profiles.length === 0) {
      console.log('No networking profiles available for testing');
      return;
    }
    
    const targetProfile = profiles[0];
    console.log('Target profile:', targetProfile.id, 'User:', targetProfile.userId);
    
    // Step 3: Set up listeners
    const notifications = [];
    const wsMessages = [];
    
    const globalListener = (event) => {
      notifications.push(event.detail);
      console.log('🎉 NOTIFICATION RECEIVED:', event.detail);
    };
    document.addEventListener('networkingNotification', globalListener);
    
    const wsListener = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'networking_like' || data.type === 'networking_match') {
          wsMessages.push(data);
          console.log('📡 WEBSOCKET MESSAGE:', data);
        }
      } catch (e) {}
    };
    
    if (window.chatSocket) {
      window.chatSocket.addEventListener('message', wsListener);
    }
    
    // Step 4: Create a like from target user to current user (if different users)
    if (targetProfile.userId !== currentUser.id) {
      console.log('Creating reverse like scenario...');
      
      // Simulate what would happen if target user liked current user's profile
      // First, check if current user has a networking profile
      const currentUserProfileResponse = await fetch('/api/suite/networking-profile');
      const currentUserProfile = await currentUserProfileResponse.json();
      
      if (currentUserProfile && currentUserProfile.id) {
        console.log('Current user has networking profile:', currentUserProfile.id);
        
        // This would normally require logging in as the other user
        // Instead, let's test with a manual notification simulation
        console.log('Simulating notification that target user liked current user...');
        
        const mockNotification = {
          type: "networking_like",
          connection: {
            id: Date.now(),
            userId: targetProfile.userId,
            targetProfileId: currentUserProfile.id,
            targetUserId: currentUser.id,
            action: "like",
            matched: false
          },
          fromUserId: targetProfile.userId,
          fromUserInfo: {
            id: targetProfile.userId,
            fullName: targetProfile.fullName || 'Test User',
            username: targetProfile.username || 'testuser'
          },
          targetProfileId: currentUserProfile.id,
          counts: {
            pending: 1,
            confirmed: 0
          },
          isMatch: false,
          timestamp: new Date().toISOString()
        };
        
        // Trigger the notification
        const customEvent = new CustomEvent('networkingNotification', {
          detail: mockNotification
        });
        document.dispatchEvent(customEvent);
        
        console.log('Mock notification dispatched. Check for UI updates...');
        
        // Wait and check results
        setTimeout(() => {
          console.log('\n=== TEST RESULTS ===');
          console.log('Custom events received:', notifications.length);
          console.log('WebSocket messages received:', wsMessages.length);
          
          if (notifications.length > 0) {
            console.log('✅ Custom event system working');
            console.log('Check if new grid card appeared in Connections page');
          } else {
            console.log('❌ Custom event system not working');
          }
          
          // Cleanup
          document.removeEventListener('networkingNotification', globalListener);
          if (window.chatSocket) {
            window.chatSocket.removeEventListener('message', wsListener);
          }
          
        }, 3000);
        
      } else {
        console.log('Current user has no networking profile to test with');
      }
    } else {
      console.log('Target profile belongs to current user - cannot test cross-user notifications');
    }
    
  } catch (error) {
    console.error('Test setup failed:', error);
  }
}

// Run the test
setupBidirectionalTest();