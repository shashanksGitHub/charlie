# Agora Video Call Implementation

## Overview

The video call system has been successfully migrated from WebRTC to Agora SDK for improved reliability, better connection handling, and simplified implementation.

## Changes Made

### Frontend Changes

1. **Removed Old Components:**
   - `client/src/components/ui/video-call.tsx` (deleted)
   - `client/src/components/ui/global-incoming-call.tsx` (deleted)

2. **Added New Components:**
   - `client/src/components/ui/agora-video-call.tsx` - Main video call component using Agora
   - `client/src/components/ui/agora-global-incoming-call.tsx` - Global incoming call handler
   - `client/src/services/agora-service.ts` - Agora SDK service wrapper

3. **Updated Components:**
   - `client/src/components/messaging/call-launcher.tsx` - Updated to use new Agora components
   - `client/src/App.tsx` - Updated to use new global incoming call component

4. **Dependencies:**
   - Added `agora-rtc-sdk-ng` for Agora Web SDK

### Backend Changes

1. **New API Endpoints:**
   - `POST /api/agora-calls` - Create new Agora video call
   - `GET /api/agora-calls/:id` - Get Agora call details
   - `PATCH /api/agora-calls/:id/status` - Update Agora call status

2. **Configuration:**
   - Added support for `AGORA_APP_ID` environment variable
   - Agora configuration returned with call creation/retrieval

## Features

### Agora Service (`client/src/services/agora-service.ts`)

- **Connection Management:** Automatic join/leave channel functionality
- **Media Control:** Toggle video/audio with proper track management
- **Event Handling:** Comprehensive event system for call status and participants
- **Error Handling:** Robust error handling and recovery
- **Participant Management:** Track remote participants and their media

### Video Call Component (`client/src/components/ui/agora-video-call.tsx`)

- **Call States:** Support for connecting, connected, ended states
- **Media Controls:** Mute/unmute audio, enable/disable video
- **Call Timer:** Track call duration for connected calls
- **Incoming Call UI:** Accept/decline interface for incoming calls
- **Responsive Design:** Optimized UI for different screen sizes

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
AGORA_APP_ID=your_agora_app_id_here
```

### Agora Setup

1. Create an account at [Agora.io](https://www.agora.io)
2. Create a new project and get your App ID
3. For production, implement token-based authentication
4. Update the backend to generate temporary tokens as needed

## API Usage

### Creating a Call

```javascript
const response = await fetch('/api/agora-calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    matchId: 123,
    initiatorId: 456,
    receiverId: 789,
    channel: 'unique-channel-name'
  })
});

const { call, agoraConfig } = await response.json();
```

### WebSocket Events

The system continues to use existing WebSocket events for call signaling:
- `call_initiate` - Notify about incoming call
- `call_accept` - Call accepted by receiver
- `call_decline` - Call declined by receiver
- `call_cancel` - Call cancelled by caller
- `call_end` - Call ended by either party

## Migration Notes

### Backward Compatibility

- Database schema remains unchanged (uses existing `videoCalls` table)
- WebSocket messaging protocol unchanged
- Existing call records are compatible

### Removed Dependencies

The old WebRTC implementation has been completely removed:
- No more manual ICE server configuration
- No more complex peer-to-peer negotiation
- Simplified media track management

## Testing

The implementation includes:

- **Media Permission Handling:** Graceful fallback to audio-only if video denied
- **Connection Recovery:** Automatic reconnection on network issues  
- **Call State Management:** Proper cleanup on call end/cancel
- **Cross-browser Compatibility:** Works with all modern browsers

## Production Considerations

1. **Token Authentication:** Implement Agora token generation for security
2. **Rate Limiting:** Add call frequency limits per user
3. **Recording:** Optional call recording using Agora Cloud Recording
4. **Analytics:** Track call quality and connection metrics
5. **Backup Channels:** Implement fallback communication methods

## Next Steps

1. Configure your Agora App ID in environment variables
2. Test video/audio calls between users
3. Monitor call quality and connection reliability
4. Implement token-based authentication for production
5. Add call recording if needed 

## Overview

The video call system has been successfully migrated from WebRTC to Agora SDK for improved reliability, better connection handling, and simplified implementation.

## Changes Made

### Frontend Changes

1. **Removed Old Components:**
   - `client/src/components/ui/video-call.tsx` (deleted)
   - `client/src/components/ui/global-incoming-call.tsx` (deleted)

2. **Added New Components:**
   - `client/src/components/ui/agora-video-call.tsx` - Main video call component using Agora
   - `client/src/components/ui/agora-global-incoming-call.tsx` - Global incoming call handler
   - `client/src/services/agora-service.ts` - Agora SDK service wrapper

3. **Updated Components:**
   - `client/src/components/messaging/call-launcher.tsx` - Updated to use new Agora components
   - `client/src/App.tsx` - Updated to use new global incoming call component

4. **Dependencies:**
   - Added `agora-rtc-sdk-ng` for Agora Web SDK

### Backend Changes

1. **New API Endpoints:**
   - `POST /api/agora-calls` - Create new Agora video call
   - `GET /api/agora-calls/:id` - Get Agora call details
   - `PATCH /api/agora-calls/:id/status` - Update Agora call status

2. **Configuration:**
   - Added support for `AGORA_APP_ID` environment variable
   - Agora configuration returned with call creation/retrieval

## Features

### Agora Service (`client/src/services/agora-service.ts`)

- **Connection Management:** Automatic join/leave channel functionality
- **Media Control:** Toggle video/audio with proper track management
- **Event Handling:** Comprehensive event system for call status and participants
- **Error Handling:** Robust error handling and recovery
- **Participant Management:** Track remote participants and their media

### Video Call Component (`client/src/components/ui/agora-video-call.tsx`)

- **Call States:** Support for connecting, connected, ended states
- **Media Controls:** Mute/unmute audio, enable/disable video
- **Call Timer:** Track call duration for connected calls
- **Incoming Call UI:** Accept/decline interface for incoming calls
- **Responsive Design:** Optimized UI for different screen sizes

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
AGORA_APP_ID=your_agora_app_id_here
```

### Agora Setup

1. Create an account at [Agora.io](https://www.agora.io)
2. Create a new project and get your App ID
3. For production, implement token-based authentication
4. Update the backend to generate temporary tokens as needed

## API Usage

### Creating a Call

```javascript
const response = await fetch('/api/agora-calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    matchId: 123,
    initiatorId: 456,
    receiverId: 789,
    channel: 'unique-channel-name'
  })
});

const { call, agoraConfig } = await response.json();
```

### WebSocket Events

The system continues to use existing WebSocket events for call signaling:
- `call_initiate` - Notify about incoming call
- `call_accept` - Call accepted by receiver
- `call_decline` - Call declined by receiver
- `call_cancel` - Call cancelled by caller
- `call_end` - Call ended by either party

## Migration Notes

### Backward Compatibility

- Database schema remains unchanged (uses existing `videoCalls` table)
- WebSocket messaging protocol unchanged
- Existing call records are compatible

### Removed Dependencies

The old WebRTC implementation has been completely removed:
- No more manual ICE server configuration
- No more complex peer-to-peer negotiation
- Simplified media track management

## Testing

The implementation includes:

- **Media Permission Handling:** Graceful fallback to audio-only if video denied
- **Connection Recovery:** Automatic reconnection on network issues  
- **Call State Management:** Proper cleanup on call end/cancel
- **Cross-browser Compatibility:** Works with all modern browsers

## Production Considerations

1. **Token Authentication:** Implement Agora token generation for security
2. **Rate Limiting:** Add call frequency limits per user
3. **Recording:** Optional call recording using Agora Cloud Recording
4. **Analytics:** Track call quality and connection metrics
5. **Backup Channels:** Implement fallback communication methods

## Next Steps

1. Configure your Agora App ID in environment variables
2. Test video/audio calls between users
3. Monitor call quality and connection reliability
4. Implement token-based authentication for production
5. Add call recording if needed 