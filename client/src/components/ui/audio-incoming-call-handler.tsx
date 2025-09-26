import { useState, useEffect } from "react";
import { AgoraAudioCall } from "./agora-audio-call";
import { useAuth } from "@/hooks/use-auth";

export function AudioIncomingCallHandler() {
  console.log("🎧 [AudioIncomingCallHandler] Component rendered!");
  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [callId, setCallId] = useState<number | null>(null);
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const { user } = useAuth();

  // Track if user is currently making an outgoing call
  const [hasActiveOutgoingCall, setHasActiveOutgoingCall] = useState(false);

  // Listen for outgoing call state changes to prevent conflicts
  useEffect(() => {
    const handleOutgoingCallStart = () => {
      console.log("🎧 [AudioIncomingCallHandler] 📱 Outgoing call started - preventing incoming call conflicts");
      setHasActiveOutgoingCall(true);
    };

    const handleOutgoingCallEnd = () => {
      console.log("🎧 [AudioIncomingCallHandler] 📱 Outgoing call ended - allowing incoming calls");
      setHasActiveOutgoingCall(false);
    };

    // Listen to custom events from call launchers
    window.addEventListener("outgoing-call:start", handleOutgoingCallStart);
    window.addEventListener("outgoing-call:end", handleOutgoingCallEnd);

    return () => {
      window.removeEventListener("outgoing-call:start", handleOutgoingCallStart);
      window.removeEventListener("outgoing-call:end", handleOutgoingCallEnd);
    };
  }, []);

  // Debug state changes
  useEffect(() => {
    if (open && callId && matchId && otherUserId) {
      console.log(`🎧 [AudioIncomingCallHandler] INCOMING AUDIO CALL STATE READY:`, {
        callId,
        matchId,
        otherUserId,
        userId: user?.id,
        open
      });
    }
  }, [open, callId, matchId, otherUserId, user?.id]);

  useEffect(() => {
    console.log("🎧 [AudioIncomingCallHandler] Component mounted, user:", user?.id);

    const onIncoming = (e: CustomEvent) => {
      console.log("🎧 [AudioIncomingCallHandler] 🚨 INCOMING CALL RECEIVED:", e.detail);
      
      // CRITICAL: Only handle AUDIO calls - be very strict
      if (e.detail.callType !== "audio") {
        console.log(`🎧 [AudioIncomingCallHandler] ⛔ IGNORING NON-AUDIO CALL - Type: "${e.detail.callType || 'undefined'}"`);
        return;
      }
      
      // PRIORITY: Stop event propagation for audio calls to prevent video handler from processing
      e.stopPropagation();
      e.preventDefault();
      console.log("🎧 [AudioIncomingCallHandler] 🛡️ CLAIMED AUDIO CALL - Stopped event propagation");

      console.log("🎧 [AudioIncomingCallHandler] 🔍 PARSING AUDIO CALL DATA:", {
        matchId: e.detail.matchId,
        callId: e.detail.callId,
        fromUserId: e.detail.fromUserId,
        callerId: e.detail.callerId,
        callType: e.detail.callType,
        roomName: e.detail.roomName,
        toUserId: e.detail.toUserId,
        currentUserId: user?.id
      });

      // CRITICAL: Only handle incoming calls for the current user
      const targetUserId = e.detail.toUserId || e.detail.receiverId;
      if (targetUserId !== user?.id) {
        console.log(`🎧 [AudioIncomingCallHandler] ⛔ IGNORING CALL - Not for this user (target: ${targetUserId}, current: ${user?.id})`);
        return;
      }

      // CRITICAL: Don't show incoming calls if user has active outgoing call
      if (hasActiveOutgoingCall) {
        console.log(`🎧 [AudioIncomingCallHandler] ⛔ IGNORING INCOMING CALL - User has active outgoing call`);
        return;
      }

      // CRITICAL: Global call guard - prevent multiple call instances
      if ((window as any).globalCallActive) {
        console.log(`🎧 [AudioIncomingCallHandler] ⛔ IGNORING INCOMING CALL - Another call already active globally`);
        return;
      }

      // CRITICAL: Close any existing call before opening new one
      if (open) {
        console.log(`🎧 [AudioIncomingCallHandler] ⚠️ Closing existing call before opening new one`);
        setOpen(false);
        // Small delay to ensure cleanup
        setTimeout(() => {
          handleNewIncomingAudioCall(e.detail);
        }, 100);
        return;
      }

      handleNewIncomingAudioCall(e.detail);
    };

    const handleNewIncomingAudioCall = (detail: any) => {
      console.log(`🎧 [AudioIncomingCallHandler] 🔄 PROCESSING NEW INCOMING AUDIO CALL:`, detail);
      
      // Set global call guard
      (window as any).globalCallActive = true;
      
      setMatchId(detail.matchId);
      setCallId(detail.callId);
      setOtherUserId(detail.fromUserId || detail.callerId);
      setOpen(true);
      
      console.log(`🎧 [AudioIncomingCallHandler] 🎯 AUDIO CALL OPENED - CallId: ${detail.callId}, Global guard: ACTIVE`);
    };

    const onCancel = () => {
      console.log("🎧 [AudioIncomingCallHandler] Audio call cancelled");
      (window as any).globalCallActive = false;
      setOpen(false);
    };

    const onEnd = () => {
      console.log("🎧 [AudioIncomingCallHandler] Audio call ended");
      (window as any).globalCallActive = false;
      setOpen(false);
    };

    // Add with capture=true to get events before video handler
    window.addEventListener("call:incoming", onIncoming as any, true);
    window.addEventListener("call:cancel", onCancel as any);
    window.addEventListener("call:end", onEnd as any);
    
    return () => {
      window.removeEventListener("call:incoming", onIncoming as any, true);
      window.removeEventListener("call:cancel", onCancel as any);
      window.removeEventListener("call:end", onEnd as any);
    };
  }, [user?.id, callId]);

  if (!user || !open || !matchId || !callId || !otherUserId) {
    return null;
  }

  // CRITICAL: Don't render if this call is FROM the current user (they are the caller)
  if (otherUserId === user.id) {
    console.log(`🎧 [AudioIncomingCallHandler] ⛔ IGNORING CALL - This user is the caller, not receiver (callerId: ${otherUserId}, currentUserId: ${user.id})`);
    return null;
  }

  // CRITICAL: Don't render if user has active outgoing call
  if (hasActiveOutgoingCall) {
    console.log(`🎧 [AudioIncomingCallHandler] ⛔ NOT RENDERING - User has active outgoing call`);
    return null;
  }

  console.log(`🎧 [AudioIncomingCallHandler] 🎧 RENDERING AUDIO CALL COMPONENT (INCOMING):`, {
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
      key={`incoming-audio-${callId}-${matchId}-${otherUserId}`}
      matchId={matchId}
      userId={user.id}
      receiverId={otherUserId}
      open={open}
      onClose={() => {
        console.log(`🎧 [AudioIncomingCallHandler] 🔴 INCOMING AUDIO CALL CLOSED`);
        (window as any).globalCallActive = false;
        setOpen(false);
      }}
      isIncoming
      existingCallId={callId}
    />
  );
} 
