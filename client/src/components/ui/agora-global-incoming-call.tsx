import { useState, useEffect } from "react";
import { AgoraVideoCall } from "./agora-video-call";
import { AgoraAudioCall } from "./agora-audio-call";
import { useAuth } from "@/hooks/use-auth";
import { callStateManager } from "@/services/call-state-manager";

export function AgoraGlobalIncomingCall() {
  console.log("🚨 [AgoraGlobalIncomingCall] Component rendered! Timestamp:", Date.now());
  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [callId, setCallId] = useState<number | null>(null);
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [activeCallId, setActiveCallId] = useState<number | null>(null); // Track active call to prevent duplicates
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number>(0); // Prevent rapid duplicate events
  const { user } = useAuth();

  // Debug state changes
  useEffect(() => {
    if (open && callId && matchId && otherUserId) {
      console.log(`🎯 [AgoraGlobalIncomingCall] INCOMING CALL STATE READY:`, {
        callType,
        callId,
        matchId,
        otherUserId,
        userId: user?.id,
        open
      });
    }
  }, [open, callId, matchId, otherUserId, callType, user?.id]);

  useEffect(() => {
    console.log("📞 [AgoraGlobalIncomingCall] Component mounted, user:", user?.id);

    const onIncoming = (e: CustomEvent) => {
      const now = Date.now();
      console.log("📞 [AgoraGlobalIncomingCall] 🚨 INCOMING CALL RECEIVED:", e.detail);
      console.log("📞 [AgoraGlobalIncomingCall] 🔍 PARSING CALL DATA:", {
        matchId: e.detail.matchId,
        callId: e.detail.callId,
        fromUserId: e.detail.fromUserId,
        callerId: e.detail.callerId,
        callType: e.detail.callType,
        roomName: e.detail.roomName,
        currentActiveCallId: activeCallId,
        currentOpen: open,
        timeSinceLastEvent: now - lastEventTimestamp
      });

      // Only prevent rapid duplicates within 500ms (reduced from 1000ms)
      if (now - lastEventTimestamp < 500) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ RAPID DUPLICATE EVENT IGNORED - Only ${now - lastEventTimestamp}ms since last event`);
        return;
      }

      // Only prevent processing the same call ID if it's currently active (less aggressive)
      if (e.detail.callId && activeCallId === e.detail.callId) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ SAME CALL ID ALREADY ACTIVE - Ignoring duplicate callId: ${e.detail.callId}`);
        return;
      }

      setLastEventTimestamp(now);

      // Check if we can accept this incoming call
      if (!callStateManager.canAcceptIncomingCall(e.detail.callId)) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ INCOMING CALL REJECTED - Cannot accept call ${e.detail.callId}`);
        return;
      }

      // Prevent duplicate call handling
      if (activeCallId === e.detail.callId) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ DUPLICATE CALL IGNORED - CallId ${e.detail.callId} already active`);
        return;
      }

      // If there's already an active call, close it first
      if (activeCallId && open) {
        console.log(`📞 [AgoraGlobalIncomingCall] 🔄 REPLACING ACTIVE CALL - Old: ${activeCallId}, New: ${e.detail.callId}`);
        setOpen(false);
        setActiveCallId(null);
        callStateManager.setCallInactive();
        // Add a small delay to allow cleanup
        setTimeout(() => {
          handleIncomingCall(e.detail);
        }, 100);
      } else {
        handleIncomingCall(e.detail);
      }
    };

    const handleIncomingCall = (detail: any) => {
      // More robust callType detection with multiple fallbacks
      let incomingCallType = detail.callType;
      
      // If no callType, check if it's explicitly an audio call from the room name or other indicators
      if (!incomingCallType) {
        // Check room name for audio indicators
        if (detail.roomName && detail.roomName.includes('audio')) {
          incomingCallType = "audio";
        } else {
          // Default to video for backward compatibility
          incomingCallType = "video";
        }
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ NO CALLTYPE PROVIDED - Using fallback: ${incomingCallType}`);
      }
      
      console.log(`📞 [AgoraGlobalIncomingCall] 🎯 HANDLING INCOMING ${incomingCallType.toUpperCase()} CALL:`, {
        callId: detail.callId,
        matchId: detail.matchId,
        fromUserId: detail.fromUserId,
        callType: incomingCallType,
        originalCallType: detail.callType,
        roomName: detail.roomName
      });
      
      setMatchId(detail.matchId);
      setCallId(detail.callId);
      setOtherUserId(detail.fromUserId || detail.callerId);
      setCallType(incomingCallType);
      setActiveCallId(detail.callId);
      setOpen(true);
      
      // Update global call state
      callStateManager.setCallActive(incomingCallType as "audio" | "video", detail.callId, false);
      
      console.log(`📞 [AgoraGlobalIncomingCall] ✅ STATE SET - Type: ${incomingCallType}, CallId: ${detail.callId}, Opening: true`);
    };

    const onCancel = () => {
      console.log("📞 [AgoraGlobalIncomingCall] Call cancelled");
      setOpen(false);
      setActiveCallId(null);
      callStateManager.setCallInactive();
    };

    const onEnd = () => {
      console.log("📞 [AgoraGlobalIncomingCall] Call ended");
      setOpen(false);
      setActiveCallId(null);
      callStateManager.setCallInactive();
    };

    window.addEventListener("call:incoming", onIncoming as any);
    window.addEventListener("call:cancel", onCancel as any);
    window.addEventListener("call:end", onEnd as any);
    
    return () => {
      window.removeEventListener("call:incoming", onIncoming as any);
      window.removeEventListener("call:cancel", onCancel as any);
      window.removeEventListener("call:end", onEnd as any);
    };
  }, [user?.id, callId]);

  if (!user || !open || !matchId || !callId || !otherUserId) {
    console.log("🚨 [AgoraGlobalIncomingCall] Not rendering - missing data:", {
      hasUser: !!user,
      open,
      matchId,
      callId,
      otherUserId,
      userId: user?.id
    });
    return null;
  }

  console.log(`🚨 [AgoraGlobalIncomingCall] 🎯 RENDERING ${callType.toUpperCase()} CALL COMPONENT:`, {
    matchId,
    userId: user.id,
    receiverId: otherUserId,
    open,
    isIncoming: true,
    existingCallId: callId,
    callType,
    activeCallId
  });

  // Render appropriate call component based on call type
  if (callType === "audio") {
    console.log(`📞 [AgoraGlobalIncomingCall] 🎧 RENDERING AUDIO CALL COMPONENT:`, {
      callId,
      matchId,
      userId: user.id,
      receiverId: otherUserId,
      open,
      isIncoming: true,
      existingCallId: callId
    });
    
    return (
      <AgoraAudioCall
        key={`audio-${callId}-${matchId}-${otherUserId}`}
        matchId={matchId}
        userId={user.id}
        receiverId={otherUserId}
        open={open}
        onClose={() => {
          console.log(`📞 [AgoraGlobalIncomingCall] 🔴 INCOMING AUDIO CALL CLOSED`);
          setOpen(false);
          setActiveCallId(null);
          callStateManager.setCallInactive();
        }}
        isIncoming
        existingCallId={callId}
      />
    );
  }

  return (
    <AgoraVideoCall
      key={`video-${callId}-${matchId}-${otherUserId}`}
      matchId={matchId}
      userId={user.id}
      receiverId={otherUserId}
      open={open}
      onClose={() => {
        console.log(`📞 [AgoraGlobalIncomingCall] 🔴 INCOMING VIDEO CALL CLOSED`);
        setOpen(false);
        setActiveCallId(null);
        callStateManager.setCallInactive();
      }}
      isIncoming
      existingCallId={callId}
    />
  );
} 