
# Replace Agora with Built-in WebRTC Calling System

## Overview
Replace the broken Agora-based calling system with a free, built-in peer-to-peer calling system using the browser's native **WebRTC** API. Signaling (how the two users find each other) will be handled through **Supabase Realtime Broadcast** -- no third-party service needed, no API keys, completely free.

## How It Works

**WebRTC** is built into every modern browser. It allows direct audio/video streaming between two users. The only thing it needs is a "signaling" mechanism to exchange connection details -- we'll use Supabase Realtime for that.

```text
Patient                    Supabase Realtime                    Doctor
   |                              |                               |
   |-- call_offer (SDP) -------->|-------- call_offer ---------->|
   |                              |                               |
   |<-------- call_answer -------|<------ call_answer (SDP) -----|
   |                              |                               |
   |-- ice_candidate ----------->|-------- ice_candidate ------->|
   |<-------- ice_candidate -----|<------ ice_candidate ---------|
   |                              |                               |
   |============= Direct P2P Audio/Video Stream =================|
```

## Changes

### 1. New Hook: `src/hooks/useWebRTCCall.ts`
Core WebRTC logic replacing `useAgoraCall.ts`:
- Creates `RTCPeerConnection` using free Google STUN servers for NAT traversal
- Manages local/remote media streams (audio + video)
- Handles offer/answer/ICE candidate exchange via Supabase Realtime Broadcast channel
- Provides `startCall`, `joinCall`, `endCall`, `toggleAudio`, `toggleVideo`
- Renders local and remote video into HTML video elements

### 2. Update `src/components/CallInterface.tsx`
- Accept WebRTC media streams instead of Agora tracks
- Use `<video>` elements with `ref` to display local/remote video via `srcObject`
- Wire mute/camera toggle to actual WebRTC track enable/disable
- Show real connection status from the `RTCPeerConnection` state

### 3. Update `src/components/messaging/PatientMessaging.tsx`
- Remove `generate-agora-token` edge function call
- Use `useWebRTCCall` hook to initiate calls
- Send call offer through Supabase Realtime to the doctor
- Show incoming call notification and `CallInterface` when active

### 4. Update `src/components/messaging/DoctorMessaging.tsx`
- Remove `generate-agora-token` edge function call
- Use `useWebRTCCall` hook
- Listen for incoming call offers via Supabase Realtime
- Show incoming call UI with accept/reject buttons
- Display `CallInterface` when call is active

### 5. Update `src/hooks/useCallSession.tsx`
- Keep the existing `call_sessions` database logging (start/end call records)
- Remove any Agora token generation references

### 6. Delete Agora-related files
- Delete `supabase/functions/generate-agora-token/` (hardcoded credentials, duplicate)
- Delete `supabase/functions/agora-token/` (fake token algorithm)
- Delete `src/hooks/useAgoraCall.ts`
- Remove both entries from `supabase/config.toml`

### 7. Remove `agora-rtc-sdk-ng` dependency
- No longer needed since we use native browser WebRTC APIs

## Technical Details

### WebRTC Hook Core Structure
```typescript
// Free STUN servers - no account needed
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Signaling via Supabase Realtime Broadcast
const channel = supabase.channel(`call:${appointmentId}`);
channel.on('broadcast', { event: 'offer' }, handleOffer);
channel.on('broadcast', { event: 'answer' }, handleAnswer);
channel.on('broadcast', { event: 'ice-candidate' }, handleIceCandidate);
channel.on('broadcast', { event: 'call-ended' }, handleCallEnded);
```

### Incoming Call Flow
When a patient clicks "Call", a broadcast event is sent on the appointment channel. The doctor's messaging component listens on the same channel and shows an incoming call modal with Accept/Reject. On accept, the WebRTC handshake completes and media flows directly peer-to-peer.

### Limitations (Honest)
- **No TURN server**: ~85% of connections work with STUN only. Some strict corporate firewalls may block P2P. A TURN server costs money, so we skip it for now.
- **Browser only**: Works on Chrome, Firefox, Safari, Edge. Not in older WebView containers.
- **Two-party calls only**: WebRTC P2P is designed for 1-to-1 calls, which is perfect for doctor-patient consultations.

## Files Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useWebRTCCall.ts` |
| Rewrite | `src/components/CallInterface.tsx` |
| Update | `src/components/messaging/PatientMessaging.tsx` |
| Update | `src/components/messaging/DoctorMessaging.tsx` |
| Update | `src/hooks/useCallSession.tsx` |
| Update | `supabase/config.toml` (remove agora entries) |
| Delete | `supabase/functions/agora-token/` |
| Delete | `supabase/functions/generate-agora-token/` |
| Delete | `src/hooks/useAgoraCall.ts` |
| Remove dep | `agora-rtc-sdk-ng` from package.json |
