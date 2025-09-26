import { useState, useEffect } from "react";
import { AgoraVideoCall } from "./agora-video-call";
import { useAuth } from "@/hooks/use-auth";

export function VideoIncomingCallHandler() {
  console.log("📹 [VideoIncomingCallHandler] Component rendered!");
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
      console.log("📹 [VideoIncomingCallHandler] 📱 Outgoing call started - preventing incoming call conflicts");
      setHasActiveOutgoingCall(true);
    };

    const handleOutgoingCallEnd = () => {
      console.log("📹 [VideoIncomingCallHandler] 📱 Outgoing call ended - allowing incoming calls");
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
      console.log(`📹 [VideoIncomingCallHandler] INCOMING VIDEO CALL STATE READY:`, {
        callId,
        matchId,
        otherUserId,
        userId: user?.id,
        open
      });
    }
  }, [open, callId, matchId, otherUserId, user?.id]);

  useEffect(() => {
    console.log("📹 [VideoIncomingCallHandler] Component mounted, user:", user?.id);

    const onIncoming = (e: CustomEvent) => {
      console.log("📹 [VideoIncomingCallHandler] 🚨 INCOMING CALL RECEIVED:", e.detail);
      
      // CRITICAL: Reject audio calls immediately and completely
      if (e.detail.callType === "audio") {
        console.log(`📹 [VideoIncomingCallHandler] ⛔ REJECTING AUDIO CALL - Type: "${e.detail.callType}" (handled by AudioIncomingCallHandler)`);
        return;
      }
      
      // Handle video calls or calls without callType (backward compatibility)
      if (e.detail.callType && e.detail.callType !== "video") {
        console.log(`📹 [VideoIncomingCallHandler] ⛔ IGNORING UNKNOWN CALL TYPE - Type: "${e.detail.callType}"`);
        return;
      }
      
      // PRIORITY: Stop event propagation for video calls
      e.stopPropagation();
      e.preventDefault();
      console.log("📹 [VideoIncomingCallHandler] 🛡️ CLAIMED VIDEO CALL - Stopped event propagation");

      console.log("📹 [VideoIncomingCallHandler] 🔍 PARSING VIDEO CALL DATA:", {
        matchId: e.detail.matchId,
        callId: e.detail.callId,
        fromUserId: e.detail.fromUserId,
        callerId: e.detail.callerId,
        callType: e.detail.callType || "video",
        roomName: e.detail.roomName,
        toUserId: e.detail.toUserId,
        currentUserId: user?.id
      });

      // CRITICAL: Only handle incoming calls for the current user
      const targetUserId = e.detail.toUserId || e.detail.receiverId;
      if (targetUserId !== user?.id) {
        console.log(`📹 [VideoIncomingCallHandler] ⛔ IGNORING CALL - Not for this user (target: ${targetUserId}, current: ${user?.id})`);
        return;
      }

      // CRITICAL: Don't show incoming calls if user has active outgoing call
      if (hasActiveOutgoingCall) {
        console.log(`📹 [VideoIncomingCallHandler] ⛔ IGNORING INCOMING CALL - User has active outgoing call`);
        return;
      }

      // CRITICAL: Global call guard - prevent multiple call instances
      if ((window as any).globalCallActive) {
        console.log(`📹 [VideoIncomingCallHandler] ⛔ IGNORING INCOMING CALL - Another call already active globally`);
        return;
      }

      // CRITICAL: Close any existing call before opening new one
      if (open) {
        console.log(`📹 [VideoIncomingCallHandler] ⚠️ Closing existing call before opening new one`);
        setOpen(false);
        // Small delay to ensure cleanup
        setTimeout(() => {
          handleNewIncomingVideoCall(e.detail);
        }, 100);
        return;
      }

      handleNewIncomingVideoCall(e.detail);
    };

    const handleNewIncomingVideoCall = (detail: any) => {
      console.log(`📹 [VideoIncomingCallHandler] 🔄 PROCESSING NEW INCOMING VIDEO CALL:`, detail);
      
      // Set global call guard
      (window as any).globalCallActive = true;
      
      setMatchId(detail.matchId);
      setCallId(detail.callId);
      setOtherUserId(detail.fromUserId || detail.callerId);
      setOpen(true);
      
      console.log(`📹 [VideoIncomingCallHandler] 🎯 VIDEO CALL OPENED - CallId: ${detail.callId}, Global guard: ACTIVE`);
    };

    const onCancel = () => {
      console.log("📹 [VideoIncomingCallHandler] Video call cancelled");
      (window as any).globalCallActive = false;
      setOpen(false);
      
      // CRITICAL: If this was a wrong popup closure, reset all states for clean retry
      console.log("📹 [VideoIncomingCallHandler] 🧹 Cleaning up after video call cancel - resetting global state");
    };

    const onEnd = () => {
      console.log("📹 [VideoIncomingCallHandler] Video call ended");
      (window as any).globalCallActive = false;
      setOpen(false);
      
      // CRITICAL: Clean state reset
      console.log("📹 [VideoIncomingCallHandler] 🧹 Cleaning up after video call end - resetting global state");
    };

    // Add with capture=false (normal bubbling) - audio handler gets priority with capture=true
    window.addEventListener("call:incoming", onIncoming as any, false);
    window.addEventListener("call:cancel", onCancel as any);
    window.addEventListener("call:end", onEnd as any);
    
    return () => {
      window.removeEventListener("call:incoming", onIncoming as any, false);
      window.removeEventListener("call:cancel", onCancel as any);
      window.removeEventListener("call:end", onEnd as any);
    };
  }, [user?.id, callId]);

  if (!user || !open || !matchId || !callId || !otherUserId) {
    return null;
  }

  // CRITICAL: Don't render if this call is FROM the current user (they are the caller)
  if (otherUserId === user.id) {
    console.log(`📹 [VideoIncomingCallHandler] ⛔ IGNORING CALL - This user is the caller, not receiver (callerId: ${otherUserId}, currentUserId: ${user.id})`);
    return null;
  }

  // CRITICAL: Don't render if user has active outgoing call
  if (hasActiveOutgoingCall) {
    console.log(`📹 [VideoIncomingCallHandler] ⛔ NOT RENDERING - User has active outgoing call`);
    return null;
  }

  console.log(`📹 [VideoIncomingCallHandler] 📹 RENDERING VIDEO CALL COMPONENT (INCOMING):`, {
    callId,
    matchId,
    userId: user.id,
    receiverId: otherUserId,
    open,
    isIncoming: true,
    existingCallId: callId
  });
  
  return (
    <AgoraVideoCall
      key={`incoming-video-${callId}-${matchId}-${otherUserId}`}
      matchId={matchId}
      userId={user.id}
      receiverId={otherUserId}
      open={open}
      onClose={() => {
        console.log(`📹 [VideoIncomingCallHandler] 🔴 INCOMING VIDEO CALL CLOSED - Cleaning up global state`);
        (window as any).globalCallActive = false;
        setOpen(false);
        
        // CRITICAL: If this was closed by mistake (user clicked red button), ensure clean state
        console.log("📹 [VideoIncomingCallHandler] 🧹 RESET: Video popup closed - ensuring clean state for audio calls");
      }}
      isIncoming
      existingCallId={callId}
    />
  );
} 
