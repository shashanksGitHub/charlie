import { useEffect, useState } from "react";
import { VideoCall } from "@/components/ui/video-call";
import { useAuth } from "@/hooks/use-auth";

type IncomingEvent = {
  type: "call_initiate";
  matchId: number;
  callerId: number;
  receiverId: number;
  callId: number;
  roomName: string;
  toUserId?: number;
};

export function GlobalIncomingCall() {
  console.log("🚨🚨🚨 [GlobalIncomingCall] COMPONENT CALLED!");
  const { user } = useAuth();
  console.log("🚨 [GlobalIncomingCall] Component rendering, user:", user?.id);
  const [open, setOpen] = useState(false);
  const [callId, setCallId] = useState<number | undefined>(undefined);
  const [matchId, setMatchId] = useState<number | undefined>(undefined);
  const [otherUserId, setOtherUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    console.log("📞 [GlobalIncomingCall] Component mounted, user:", user?.id);

    const onIncoming = (e: Event) => {
      console.log("📞 [GlobalIncomingCall] Incoming call event received:", e);
      const detail = (e as CustomEvent<IncomingEvent>).detail;
      console.log("📞 [GlobalIncomingCall] Call details:", detail);
      console.log("📞 [GlobalIncomingCall] Current user ID:", user?.id);
      console.log("📞 [GlobalIncomingCall] Receiver IDs:", {
        receiverId: detail.receiverId,
        toUserId: (detail as any)?.toUserId,
      });

      // Only handle if this user is the receiver
      const targetId = detail.receiverId ?? (detail as any)?.toUserId;
      if (!user?.id || targetId !== user.id) {
        console.log(
          "📞 [GlobalIncomingCall] Ignoring call - not for this user",
        );
        return;
      }

      console.log("📞 [GlobalIncomingCall] Accepting incoming call!");
      setCallId(detail.callId);
      setMatchId(detail.matchId);
      setOtherUserId(detail.callerId);
      setOpen(true);
    };
    const onCancel = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (detail?.callId === callId) setOpen(false);
    };
    const onEnd = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (detail?.callId === callId) setOpen(false);
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

  console.log("🚨 [GlobalIncomingCall] Render check:", {
    user: user?.id,
    open,
    matchId,
    callId,
    otherUserId,
  });

  if (!user || !open || !matchId || !callId || !otherUserId) {
    console.log(
      "🚨 [GlobalIncomingCall] Not rendering VideoCall - missing data",
    );
    return null;
  }

  console.log("🚨 [GlobalIncomingCall] Rendering VideoCall component!");
  return (
    <VideoCall
      key={`${callId}-${matchId}-${otherUserId}`}
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
