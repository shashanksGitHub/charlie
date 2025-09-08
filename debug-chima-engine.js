const express = require('express');
const { storage } = require('./server/storage.ts');

async function debugChimaEngine() {
  console.log('🔍 DEBUGGING CHIMA\'S MATCHING ENGINE BEHAVIOR\n');
  
  try {
    // Get all users from database directly
    const allUsers = await storage.getUsers();
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    // Filter for potential candidates (not Chima, activated profiles)
    const potentialCandidates = allUsers.filter(user => 
      user.id !== 12 && 
      user.hasActivatedProfile && 
      !user.profileHidden && 
      !user.isSuspended
    );
    
    console.log(`✅ Potential candidates after basic filters: ${potentialCandidates.length}`);
    potentialCandidates.forEach(user => {
      console.log(`   ${user.id}. ${user.fullName} (Age: ${user.age})`);
    });
    
    // Get Chima's discovery users from storage directly
    const discoveryUsers = await storage.getDiscoverUsers(12);
    console.log(`\n🎯 Discovery users from storage.getDiscoverUsers(12): ${discoveryUsers.length}`);
    discoveryUsers.forEach(user => {
      console.log(`   ${user.id}. ${user.fullName} (Age: ${user.age})`);
    });
    
    // Check for any additional filtering
    const difference = potentialCandidates.length - discoveryUsers.length;
    if (difference > 0) {
      console.log(`\n⚠️ ${difference} users filtered out by storage.getDiscoverUsers()`);
      const discoveryIds = new Set(discoveryUsers.map(u => u.id));
      const filtered = potentialCandidates.filter(u => !discoveryIds.has(u.id));
      console.log('Missing users:');
      filtered.forEach(user => {
        console.log(`   ${user.id}. ${user.fullName} - WHY FILTERED?`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugChimaEngine();
