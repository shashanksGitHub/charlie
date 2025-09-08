/**
 * Offline Match Checker
 * 
 * This utility checks for matches that occurred while a user was offline
 * and triggers the "It's a Match!" popup when they log back in.
 * 
 * The system works by:
 * 1. Recording logout timestamp when user logs out
 * 2. Checking for matches created during the offline period on next login
 * 3. Displaying the match popup if any new matches are found
 */

const LOGOUT_TIME_KEY = 'charley_logout_timestamp';
const MATCH_CHECK_NEEDED_KEY = 'charley_match_check_needed';

/**
 * Records the current timestamp when user logs out
 */
export function recordLogoutTime(): void {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem(LOGOUT_TIME_KEY, timestamp);
    console.log('[MATCH-CHECKER] Recorded logout time:', timestamp);
  } catch (error) {
    console.error('[MATCH-CHECKER] Error recording logout time:', error);
  }
}

/**
 * Sets a flag indicating that we need to check for offline matches on next login
 */
export function markMatchCheckNeeded(): void {
  try {
    localStorage.setItem(MATCH_CHECK_NEEDED_KEY, 'true');
    console.log('[MATCH-CHECKER] Marked match check as needed for next login');
  } catch (error) {
    console.error('[MATCH-CHECKER] Error marking match check needed:', error);
  }
}

/**
 * Checks if there are new matches for this user and triggers the match popup if found
 * This works for both offline matches (if logout timestamp exists) and new matches on login
 * 
 * @param userId The ID of the logged-in user
 * @returns Promise that resolves when check is complete
 */
export async function checkOfflineMatches(userId: number): Promise<void> {
  try {
    console.log('[MATCH-CHECKER] Starting match check for user:', userId);
    
    // Get the logout timestamp
    const logoutTimeStr = localStorage.getItem(LOGOUT_TIME_KEY);
    
    // If no logout time is found, use a timestamp from 24 hours ago
    // This ensures we check for recent matches even if the user didn't properly logout before
    const timestampToUse = logoutTimeStr || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Log the timestamp we're using
    console.log('[MATCH-CHECKER] Using timestamp for match check:', timestampToUse);

    // Make API request to check for matches since the timestamp
    const response = await fetch(`/api/matches/since/${encodeURIComponent(timestampToUse)}`);
    
    if (!response.ok) {
      console.error('[MATCH-CHECKER] API error checking for offline matches:', response.status);
      return;
    }

    const matches = await response.json();
    console.log('[MATCH-CHECKER] Found matches for user:', matches);

    if (matches && matches.length > 0) {
      // Found matches! Now we need to display them, starting with the first one
      // Using dynamic import to avoid circular dependencies
      const { showMatchPopup } = await import('@/components/ui/global-match-popup');
      
      console.log(`[MATCH-CHECKER] 🚨 CRITICAL: Will show ${matches.length} match popup(s) now!`);
      
      // Process each match with a short delay between them if there are multiple
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        
        // We trigger the match popup with a short delay if there are multiple matches
        // This ensures they don't all try to display at once
        setTimeout(() => {
          console.log(`[MATCH-CHECKER] 🎉 Showing match popup #${i+1}:`, match);
          showMatchPopup(match);
        }, i * 1500); // 1.5 second delay between multiple match popups
      }
    } else {
      console.log('[MATCH-CHECKER] No new matches found for user');
    }

    // Clear the check flags after processing
    clearMatchCheckFlags();
  } catch (error) {
    console.error('[MATCH-CHECKER] Error checking for offline matches:', error);
    // Don't clear flags on error so we can retry later
  }
}

/**
 * Clears match check flags after processing
 */
function clearMatchCheckFlags(): void {
  try {
    localStorage.removeItem(MATCH_CHECK_NEEDED_KEY);
    console.log('[MATCH-CHECKER] Cleared match check flags');
  } catch (error) {
    console.error('[MATCH-CHECKER] Error clearing match check flags:', error);
  }
}