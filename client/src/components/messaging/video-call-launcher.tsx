import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { AgoraVideoCall } from "@/components/ui/agora-video-call";
import { toast } from "@/hooks/use-toast";

interface VideoCallLauncherProps {
  matchId: number;
  userId: number;
  receiverId: number;
}

export function VideoCallLauncher({
  matchId,
  userId,
  receiverId,
}: VideoCallLauncherProps) {
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);

  const handleVideoCall = async () => {
    if (isStartingCall) {
      console.log("📞 [VideoCallLauncher] Video call already starting, ignoring duplicate click");
      return;
    }

    console.log("📞 [VideoCallLauncher] Starting Agora video call");
    setIsStartingCall(true);
    
    // Simple permission check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [VideoCallLauncher] Media permissions granted");
      setIsVideoCallOpen(true);
    } catch (error) {
      console.warn("⚠️ [VideoCallLauncher] Media permission denied:", error);
      toast({
        title: "Media Permission Required",
        description: "Please allow camera and microphone access for video calls.",
        variant: "destructive",
      });
    } finally {
      // Reset debouncing flag after a short delay
      setTimeout(() => setIsStartingCall(false), 1000);
    }
  };

  return (
    <>
      <Button
        onClick={handleVideoCall}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        disabled={isStartingCall}
        title="Video Call"
      >
        <Video className="h-4 w-4" />
      </Button>

      <AgoraVideoCall
        matchId={matchId}
        userId={userId}
        receiverId={receiverId}
        open={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        isIncoming={false}
      />
    </>
  );
}
