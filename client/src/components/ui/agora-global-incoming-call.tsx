import { useState, useEffect } from "react";
import { AgoraVideoCall } from "./agora-video-call";
import { AgoraAudioCall } from "./agora-audio-call";
import { useAuth } from "@/hooks/use-auth";

export function AgoraGlobalIncomingCall() {
  console.log("🚨 [AgoraGlobalIncomingCall] Component rendered!");
  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [callId, setCallId] = useState<number | null>(null);
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const { user } = useAuth();

  // Track if user is currently making an outgoing call
  const [hasActiveOutgoingCall, setHasActiveOutgoingCall] = useState(false);

  // Listen for outgoing call state changes to prevent conflicts
  useEffect(() => {
    const handleOutgoingCallStart = () => {
      console.log("📞 [AgoraGlobalIncomingCall] 📱 Outgoing call started - preventing incoming call conflicts");
      setHasActiveOutgoingCall(true);
    };

    const handleOutgoingCallEnd = () => {
      console.log("📞 [AgoraGlobalIncomingCall] 📱 Outgoing call ended - allowing incoming calls");
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
      console.log("📞 [AgoraGlobalIncomingCall] 🚨 INCOMING CALL RECEIVED:", e.detail);
      console.log("📞 [AgoraGlobalIncomingCall] 🔍 PARSING CALL DATA:", {
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
        console.log(`📞 [AgoraGlobalIncomingCall] ⛔ IGNORING CALL - Not for this user (target: ${targetUserId}, current: ${user?.id})`);
        return;
      }

      // CRITICAL: Don't show incoming calls if user has active outgoing call
      if (hasActiveOutgoingCall) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⛔ IGNORING INCOMING CALL - User has active outgoing call`);
        return;
      }

      // CRITICAL: Close any existing call before opening new one
      if (open) {
        console.log(`📞 [AgoraGlobalIncomingCall] ⚠️ Closing existing call before opening new one`);
        setOpen(false);
        // Small delay to ensure cleanup
        setTimeout(() => {
          handleNewIncomingCall(e.detail);
        }, 100);
        return;
      }

      handleNewIncomingCall(e.detail);
    };

    const handleNewIncomingCall = (detail: any) => {
      console.log(`📞 [AgoraGlobalIncomingCall] 🔄 PROCESSING NEW INCOMING CALL:`, detail);
      
      setMatchId(detail.matchId);
      setCallId(detail.callId);
      setOtherUserId(detail.fromUserId || detail.callerId);
      
      // CRITICAL: Ensure callType is properly set and validated
      const incomingCallType = detail.callType;
      if (!incomingCallType || (incomingCallType !== "audio" && incomingCallType !== "video")) {
        console.error(`📞 [AgoraGlobalIncomingCall] ❌ INVALID CALL TYPE: "${incomingCallType}" - Defaulting to video`);
        setCallType("video");
      } else {
        console.log(`📞 [AgoraGlobalIncomingCall] ✅ VALID CALL TYPE: "${incomingCallType}"`);
        setCallType(incomingCallType);
      }
      
      setOpen(true);
      
      console.log(`📞 [AgoraGlobalIncomingCall] 🎯 NEW CALL OPENED - Type: ${incomingCallType || "video"}, CallId: ${detail.callId}`);
    };

    const onCancel = () => {
      console.log("📞 [AgoraGlobalIncomingCall] Call cancelled");
      setOpen(false);
    };

    const onEnd = () => {
      console.log("📞 [AgoraGlobalIncomingCall] Call ended");
      setOpen(false);
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

  // CRITICAL: Don't render if this call is FROM the current user (they are the caller)
  if (otherUserId === user.id) {
    console.log(`📞 [AgoraGlobalIncomingCall] ⛔ IGNORING CALL - This user is the caller, not receiver (callerId: ${otherUserId}, currentUserId: ${user.id})`);
    return null;
  }

  // CRITICAL: Don't render if user has active outgoing call
  if (hasActiveOutgoingCall) {
    console.log(`📞 [AgoraGlobalIncomingCall] ⛔ NOT RENDERING - User has active outgoing call`);
    return null;
  }

  console.log(`🚨 [AgoraGlobalIncomingCall] Rendering Agora${callType === "audio" ? "Audio" : "Video"}Call with:`, {
    matchId,
    userId: user.id,
    receiverId: otherUserId,
    open,
    isIncoming: true,
    existingCallId: callId,
    callType
  });

  // FINAL CHECK: Only render ONE call type at a time
  console.log(`📞 [AgoraGlobalIncomingCall] 🎯 FINAL RENDER CHECK - CallType: "${callType}", Open: ${open}`);

  // Render appropriate call component based on call type
  if (callType === "audio") {
    console.log(`📞 [AgoraGlobalIncomingCall] 🎧 RENDERING AUDIO CALL COMPONENT (INCOMING):`, {
      callId,
      matchId,
      userId: user.id,
      receiverId: otherUserId,
      open,
      isIncoming: true,
      existingCallId: callId,
      callType: "audio"
    });
    
    return (
      <AgoraAudioCall
        key={`incoming-audio-${callId}-${matchId}-${otherUserId}`}
        matchId={matchId}
        userId={user.id}
        receiverId={otherUserId}
        open={open}
        onClose={() => {
          console.log(`📞 [AgoraGlobalIncomingCall] 🔴 INCOMING AUDIO CALL CLOSED`);
          setOpen(false);
        }}
        isIncoming
        existingCallId={callId}
      />
    );
  }

  if (callType === "video") {
    console.log(`📞 [AgoraGlobalIncomingCall] 📹 RENDERING VIDEO CALL COMPONENT (INCOMING):`, {
      callId,
      matchId,
      userId: user.id,
      receiverId: otherUserId,
      open,
      isIncoming: true,
      existingCallId: callId,
      callType: "video"
    });
    
    return (
      <AgoraVideoCall
        key={`incoming-video-${callId}-${matchId}-${otherUserId}`}
        matchId={matchId}
        userId={user.id}
        receiverId={otherUserId}
        open={open}
        onClose={() => {
          console.log(`📞 [AgoraGlobalIncomingCall] 🔴 INCOMING VIDEO CALL CLOSED`);
          setOpen(false);
        }}
        isIncoming
        existingCallId={callId}
      />
    );
  }

  console.log(`📞 [AgoraGlobalIncomingCall] ❌ UNKNOWN CALL TYPE: "${callType}" - Not rendering anything`);
  return null;
} 