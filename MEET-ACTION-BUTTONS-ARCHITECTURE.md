# MEET App Action Buttons Architecture Documentation

## Overview
The MEET app's Discover page features 4 primary action buttons for user interaction with swipecards. This document details the complete architecture including UI components, database interactions, API endpoints, WebSocket communications, and special functions.

## Action Buttons Layout

```
[Back/Undo] [Dislike] [Star] [Like] [Direct Message]
    (1)       (2)     (3)    (4)        (5)
```

**Note:** You mentioned 4 buttons, but the implementation actually has 5 buttons. The Star button (3rd) appears to be decorative/inactive.

## 1. Back/Undo Button (1st Button)

### UI Implementation
- **Location:** `client/src/components/ui/swipe-card.tsx` (lines 1575-1610)
- **Component:** Circular button with rotate-left arrow icon
- **Style:** Purple gradient background with 3D perspective effects
- **Size:** 12x12 (w-12 h-12)
- **States:** default, processing, success

### Database Impact
- **Table:** `matches`
- **Operations:** 
  - DELETE operations via `storage.removeLikeOrDislike()`
  - DELETE match records via `storage.deleteMatch()`
  - UPDATE match status via `storage.updateMatchStatus()`

### API Endpoints
- **Endpoint:** `POST /api/swipe/undo`
- **Location:** `server/routes.ts` (lines 50-120)
- **Authentication:** Required (`req.isAuthenticated()`)
- **Request Body:**
  ```json
  {
    "userId": number,
    "action": "like" | "dislike" | "message"
  }
  ```

### Special Functions
1. **Action History Tracking:** Maintains `previousActions` state array
2. **Animation System:** Button click effects with icon animations
3. **Card Restoration:** Triggers parent component to restore swiped cards
4. **Query Invalidation:** Refreshes discover users and matches data
5. **Match Cleanup:** Handles complex undo logic for message actions:
   - Deletes matches with no messages
   - Updates match status for matches with existing messages

### WebSocket Integration
- No direct WebSocket events for undo actions
- Triggers data refreshes that may affect other connected users

## 2. Dislike Button (2nd Button)

### UI Implementation
- **Location:** `client/src/components/ui/swipe-card.tsx` (lines 1612-1658)
- **Component:** Circular button with X icon
- **Style:** Rose/red gradient background with 3D perspective
- **Size:** 14x14 (w-14 h-14)
- **Animation:** Pulse effect on decorative elements

### Database Impact
- **Table:** `matches`
- **Operations:** Creates match record with `matched: false` and `isDislike: true`
- **Conflict Handling:** 409 status for duplicate dislikes (gracefully handled)

### API Endpoints
- **Endpoint:** `POST /api/matches`
- **Location:** `server/routes.ts` via `registerMatchAPI()`
- **Request Body:**
  ```json
  {
    "userId1": number,
    "userId2": number,
    "matched": false,
    "isDislike": true
  }
  ```

### Handler Functions
- **Frontend:** `handleSwipeLeft()` in SwipeCard component
- **Parent Logic:** `dislikeMutation` in `client/src/pages/home-page.tsx`

### WebSocket Integration
- **Event Type:** `swipe_action`
- **Action:** `dislike`
- **Broadcast:** Notifies target user and triggers discover page refresh

### Special Functions
1. **Rain Animation:** Generates 150 raindrops across card surface
2. **Card Removal:** Triggers swipe-left animation and card exit
3. **Real-time Updates:** Removes card from other users' discover decks

## 3. Star Button (3rd Button) - Decorative

### UI Implementation
- **Location:** `client/src/components/ui/swipe-card.tsx` (lines 1660-1706)
- **Component:** Circular button with star icon
- **Style:** Yellow/amber gradient background
- **Size:** 16x16 (w-16 h-16)
- **Animation:** Rotating star with sparkle effects
- **Function:** Appears to be decorative only (no onClick handler found)

## 4. Like Button (4th Button)

### UI Implementation
- **Location:** `client/src/components/ui/swipe-card.tsx` (lines 1708-1752)
- **Component:** Circular button with heart icon
- **Style:** Emerald/green gradient background with 3D perspective
- **Size:** 14x14 (w-14 h-14)
- **Animation:** Sparkle effects and hover animations

### Database Impact
- **Table:** `matches`
- **Operations:** 
  - Creates match record with `matched: false` initially
  - Updates to `matched: true` if mutual like detected
- **Mutual Match Detection:** Server-side logic checks for reciprocal likes

### API Endpoints
- **Endpoint:** `POST /api/matches`
- **Request Body:**
  ```json
  {
    "userId1": number,
    "userId2": number,
    "matched": false
  }
  ```

### Handler Functions
- **Frontend:** `handleSwipeRight()` and `createMatchMutation`
- **Mutation Logic:** Located in SwipeCard component (lines 120-200)

### WebSocket Integration
- **Event Type:** `swipe_action`
- **Action:** `like`
- **Match Notification:** Triggers `match_notification` event for mutual matches
- **Broadcast:** Updates both users' matches pages

### Special Functions
1. **Celebration Animation:** Generates confetti, hearts, stars, and sparkles
2. **Match Detection:** Triggers match popup for mutual likes
3. **Local Storage:** Stores match data for recovery and popup display
4. **Query Cache:** Updates TanStack Query cache with new match data

## 5. Direct Message Button (5th Button)

### UI Implementation
- **Location:** `client/src/components/ui/swipe-card.tsx` (lines 1754-1820)
- **Component:** Circular button with message bubble icon
- **Style:** Sky blue gradient background with 3D perspective
- **Size:** 12x12 (w-12 h-12)
- **States:** default, sending, success
- **Visibility:** Hidden in "match" mode

### Database Impact
- **Table:** `matches`
- **Operations:** Creates match with `matched: true` (instant match)
- **Chat Creation:** Automatically sets up messaging channel

### API Endpoints
- **Primary:** `POST /api/messages/create-chat`
- **Location:** `server/routes.ts` (lines 150-261)
- **Request Body:**
  ```json
  {
    "targetUserId": number
  }
  ```
- **Response:**
  ```json
  {
    "matchId": number,
    "match": object,
    "success": boolean
  }
  ```

### Handler Functions
- **Frontend:** `handleDirectMessage()` (lines 400-600 in SwipeCard)
- **Complex Logic:** Multi-step process with error handling and navigation

### WebSocket Integration
- **Event Type:** `swipe_action`
- **Action:** `message`
- **Special:** `isMatch: true` parameter
- **Chat Creation:** Sends `chat_created` event to recipient
- **Broadcast:** Triggers matches page refresh

### Special Functions
1. **Instant Matching:** Bypasses traditional swipe-match flow
2. **Chat Navigation:** Redirects to `/chat/${matchId}` page
3. **Data Enrichment:** Stores comprehensive match data in localStorage
4. **Polling System:** Waits for match data availability before redirect
5. **Cache Management:** Updates multiple query caches simultaneously
6. **Toast Notifications:** User feedback for action progress

## Common Infrastructure

### Animation System
- **Location:** `client/src/index.css` (keyframes for raindrop, confetti, heart-float, star-twinkle)
- **Performance:** Optimized particle counts (reduced by 75% from original)
- **GPU Acceleration:** Uses `transform: translateZ(0)` and `will-change`

### State Management
- **Local State:** React useState for button states and animations
- **Global State:** TanStack Query for server data synchronization
- **WebSocket State:** Real-time updates via custom WebSocket service

### Error Handling
- **Network Errors:** Comprehensive try-catch blocks with user feedback
- **Duplicate Actions:** Graceful handling of 409 conflicts
- **Session Management:** Automatic session refresh on authentication errors

### Security Features
- **Authentication:** All endpoints require `req.isAuthenticated()`
- **User Validation:** Server-side checks for valid user IDs
- **Input Sanitization:** Zod schema validation for request bodies

## Database Schema

### Matches Table
```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user_id_1 INTEGER NOT NULL REFERENCES users(id),
  user_id_2 INTEGER NOT NULL REFERENCES users(id),
  matched BOOLEAN NOT NULL DEFAULT false,
  is_dislike BOOLEAN NOT NULL DEFAULT false,
  has_unread_messages_1 BOOLEAN NOT NULL DEFAULT false,
  has_unread_messages_2 BOOLEAN NOT NULL DEFAULT false,
  notified_user_1 BOOLEAN NOT NULL DEFAULT false,
  notified_user_2 BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Optimizations

1. **Debounced Actions:** Prevents rapid button clicking
2. **Optimistic Updates:** UI updates before server confirmation
3. **Query Invalidation:** Targeted cache updates instead of full refreshes
4. **Animation Optimization:** Reduced particle counts and GPU acceleration
5. **WebSocket Efficiency:** Event-driven updates instead of polling

## Integration Points

### With Matches Page
- **Query Keys:** `["/api/matches"]` for data synchronization
- **Real-time Updates:** WebSocket events trigger immediate UI updates

### With Messages System
- **Chat Creation:** Direct integration with messaging infrastructure
- **Unread Counts:** Automatic badge updates via `["/api/messages/unread/count"]`

### With Discovery System
- **Card Removal:** Real-time updates across all user instances
- **User Filtering:** Server-side exclusion of already-swiped users

## Error Recovery

1. **Network Failures:** Retry logic with exponential backoff
2. **Session Expiry:** Automatic re-authentication attempts
3. **Data Corruption:** LocalStorage cleanup and cache invalidation
4. **WebSocket Disconnection:** Automatic reconnection with state sync

This architecture provides a robust, real-time, and performant user interaction system for the MEET app's core matching functionality.