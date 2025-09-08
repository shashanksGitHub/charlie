# Offline Match Detection System

## Overview

The Offline Match Detection System is a feature that ensures users see their match notifications immediately after logging in, even for matches that occurred while they were offline. This enhances user engagement by making sure no match notification is missed.

## Components

### 1. `offline-match-checker.ts`

The core utility that handles the logic for detecting matches that occurred while users were offline:

- Records logout timestamps in localStorage
- Checks for matches created during offline periods upon login
- Triggers "It's a Match!" popups for matches found

### 2. Match API Enhancement

Server-side API endpoint in `match-api.ts` that supports fetching matches by timestamp:

- Accepts ISO string or numeric timestamps
- Enhances matches with user details for popups
- Filters matches that involved the current user

### 3. Authentication Integration

Integration with authentication flow in `use-auth.tsx`:

- Records logout time in `logoutMutation`
- Automatically checks for offline matches in `loginMutation.onSuccess`
- Preserves timestamps between sessions

### 4. Manual UI Trigger

Added UI element in `app-header.tsx` for users to manually check for offline matches:

- Animated bell icon with pulsing effect
- Toast notifications for feedback
- Error handling with fallbacks

## How It Works

1. When a user logs out, the system records the current timestamp.
2. When the user logs back in, the system queries for matches created since the recorded logout time.
3. If matches are found, the system triggers the "It's a Match!" popup for each match.
4. After processing, it clears the match check flags to prevent duplicate popups.

## Technical Implementation

### Client-Side:

```typescript
// Record logout time
recordLogoutTime();
markMatchCheckNeeded();

// Check for offline matches
await checkOfflineMatches(user.id);
```

### Server-Side:

```typescript
// API endpoint to get matches since timestamp
app.get("/api/matches/since/:timestamp", async (req, res) => {
  // Parse timestamp from request
  // Retrieve matches created after timestamp
  // Return matches with user details
});
```

## Testing

Use the `test-offline-match-detector.js` script to test the system:

1. `simulateUserLogout()` - Simulates a user logout
2. `simulateUserLogoutWithPreviousTime(30)` - Simulates a logout 30 minutes ago
3. `testMatchDetection()` - Manually triggers match detection
4. `cleanupTestData()` - Cleans up all test data

## Benefits

- Ensures users never miss a match notification
- Improves user engagement and retention
- Creates a more responsive and reliable experience
- Provides both automatic and manual detection options