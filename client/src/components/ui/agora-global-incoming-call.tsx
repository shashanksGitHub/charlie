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

  useEffect(() => {
    console.log("📞 [AgoraGlobalIncomingCall] Component mounted, user:", user?.id);

    const onIncoming = (e: CustomEvent) => {
      console.log("📞 [AgoraGlobalIncomingCall] Incoming call:", e.detail);
      setMatchId(e.detail.matchId);
      setCallId(e.detail.callId);
      setOtherUserId(e.detail.fromUserId || e.detail.callerId);
      setCallType(e.detail.callType || "video"); // Default to video if not specified
      setOpen(true);
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

  console.log(`🚨 [AgoraGlobalIncomingCall] Rendering Agora${callType === "audio" ? "Audio" : "Video"}Call with:`, {
    matchId,
    userId: user.id,
    receiverId: otherUserId,
    open,
    isIncoming: true,
    existingCallId: callId,
    callType
  });

  // Render appropriate call component based on call type
  if (callType === "audio") {
    return (
      <AgoraAudioCall
        key={`audio-${callId}-${matchId}-${otherUserId}`}
        matchId={matchId}
        userId={user.id}
        receiverId={otherUserId}
        open={open}
        onClose={() => setOpen(false)}
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
      onClose={() => setOpen(false)}
      isIncoming
      existingCallId={callId}
    />
  );
} 