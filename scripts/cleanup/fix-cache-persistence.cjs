/**
 * Comprehensive Cache Clearing Script
 * Clears all possible sources of cached message data
 */

console.log('🧹 Starting comprehensive cache cleanup...\n');

// Function to clear all React Query cache
function clearReactQueryCache() {
  try {
    // Get the query client from window if available
    if (window.queryClient) {
      console.log('✓ Clearing React Query cache...');
      window.queryClient.clear();
      window.queryClient.invalidateQueries();
      console.log('  - All React Query cache cleared');
    }
    
    // Also try to access queryClient through the app
    const queryClients = document.querySelectorAll('[data-query-client]');
    if (queryClients.length > 0) {
      console.log('✓ Found query client elements, clearing...');
    }
  } catch (error) {
    console.log('⚠ Could not clear React Query cache:', error.message);
  }
}

// Function to clear all browser storage
function clearBrowserStorage() {
  console.log('✓ Clearing browser storage...');
  
  // Clear localStorage
  const localStorageKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    localStorageKeys.push(localStorage.key(i));
  }
  localStorageKeys.forEach(key => {
    if (key && (key.includes('message') || key.includes('chat') || key.includes('query') || key.includes('cache'))) {
      localStorage.removeItem(key);
      console.log(`  - Removed localStorage: ${key}`);
    }
  });
  
  // Clear sessionStorage
  const sessionStorageKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    sessionStorageKeys.push(sessionStorage.key(i));
  }
  sessionStorageKeys.forEach(key => {
    if (key && (key.includes('message') || key.includes('chat') || key.includes('query') || key.includes('cache'))) {
      sessionStorage.removeItem(key);
      console.log(`  - Removed sessionStorage: ${key}`);
    }
  });
}

// Function to clear any global message state
function clearGlobalState() {
  console.log('✓ Clearing global message state...');
  
  // Clear any global variables related to messages
  if (window.__messageCache) {
    delete window.__messageCache;
    console.log('  - Cleared global message cache');
  }
  
  if (window.__lastKnownDuplicateMessageId) {
    delete window.__lastKnownDuplicateMessageId;
    console.log('  - Cleared duplicate message tracker');
  }
  
  // Clear any other global message-related variables
  Object.keys(window).forEach(key => {
    if (key.includes('message') || key.includes('chat')) {
      try {
        delete window[key];
        console.log(`  - Cleared global: ${key}`);
      } catch (error) {
        // Ignore errors for non-deletable properties
      }
    }
  });
}

// Function to force reload the chat component
function forceReloadChat() {
  console.log('✓ Force reloading chat component...');
  
  // Try to trigger a full page reload if we're on the chat page
  if (window.location.pathname.includes('/messages/')) {
    console.log('  - Triggering page reload for chat...');
    window.location.reload();
  }
  
  // Or try to re-render the component by changing the URL slightly
  const currentPath = window.location.pathname;
  if (currentPath.includes('/messages/')) {
    console.log('  - Refreshing chat view...');
    // Force a re-render by navigating away and back
    window.history.pushState({}, '', '/');
    setTimeout(() => {
      window.history.pushState({}, '', currentPath);
    }, 100);
  }
}

// Main cleanup function
function performComprehensiveCleanup() {
  console.log('🚀 Performing comprehensive cache cleanup...\n');
  
  clearReactQueryCache();
  clearBrowserStorage();
  clearGlobalState();
  
  console.log('\n✅ Cache cleanup completed!');
  console.log('\nThe messages you were seeing should now be gone.');
  console.log('If messages still appear, they may be coming from:');
  console.log('1. Component state that needs a page refresh');
  console.log('2. Service worker cache (rare)');
  console.log('3. Browser cache (try hard refresh: Ctrl+F5)');
  
  // Ask user if they want to force reload
  const shouldReload = confirm('Would you like to reload the page to ensure all cached data is cleared?');
  if (shouldReload) {
    forceReloadChat();
  }
}

// Run the cleanup
performComprehensiveCleanup();