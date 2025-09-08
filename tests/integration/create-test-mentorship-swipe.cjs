/**
 * Create a test mentorship swipe for undo functionality testing
 * This creates a swipe that can be undone to test the instant card restoration
 */

async function createTestSwipe() {
  try {
    console.log('🔄 Creating test mentorship swipe...');

    // Using user ID 49 (Luka) based on the logs showing previous swipe history
    const swipeData = {
      profileId: 49, // Luka's profile ID
      action: "pass" // Create a pass action that can be undone
    };

    const response = await fetch('http://localhost:5000/api/suite/mentorship/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3ADHWcFOcCzHDFNb0dQBzrXqAaKCyNtHOa.nYMt9W8oOLhJvMl6JEX9O7lqFSRWe8kgBu1iX5wJhpE' // Session cookie
      },
      body: JSON.stringify(swipeData)
    });

    if (!response.ok) {
      throw new Error(`Swipe failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Test swipe created successfully:', result);
    console.log('📊 Profile ID:', swipeData.profileId, 'Action:', swipeData.action);
    console.log('💡 You can now test the undo functionality!');

    return result;
  } catch (error) {
    console.error('❌ Failed to create test swipe:', error.message);
  }
}

// Run the test
createTestSwipe();