#!/usr/bin/env node

/**
 * DEBUG COUNTRY SELECTOR AUTHENTICATION ISSUE
 * Check if the pool country API endpoint is working properly
 */

import fetch from 'node-fetch';

console.log('\n🔍 DEBUGGING COUNTRY SELECTOR AUTHENTICATION');
console.log('=============================================\n');

async function testPoolCountryEndpoint() {
  try {
    console.log('🔄 Testing /api/user/pool-country endpoint without auth...');
    
    const response = await fetch('http://localhost:5000/api/user/pool-country', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Expected 401 error (good - auth required):', errorText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Check browser console for [COUNTRY-SELECTOR] logs');
  console.log('2. Look for pool country query errors');
  console.log('3. Verify user authentication status');
  console.log('4. Check if TanStack Query is handling auth properly');
}

await testPoolCountryEndpoint();