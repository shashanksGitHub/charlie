import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Phone } from "lucide-react";
import { AgoraVideoCall } from "@/components/ui/agora-video-call";
import { AgoraAudioCall } from "@/components/ui/agora-audio-call";
import { toast } from "@/hooks/use-toast";

interface CallLauncherProps {
  matchId: number;
  userId: number;
  receiverId: number;
}

export function CallLauncher({
  matchId,
  userId,
  receiverId,
}: CallLauncherProps) {
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);

  const handleVideoCall = async () => {
    if (isStartingCall) {
      console.log("📞 [CallLauncher] Video call already starting, ignoring duplicate click");
      return;
    }

    console.log("📞 [CallLauncher] Starting Agora video call");
    setIsStartingCall(true);
    
    // Simple permission check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [CallLauncher] Media permissions granted");
      setIsVideoCallOpen(true);
    } catch (error) {
      console.warn("⚠️ [CallLauncher] Media permission denied:", error);
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

  const handleAudioCall = async () => {
    if (isStartingCall) {
      console.log("📞 [CallLauncher] Audio call already starting, ignoring duplicate click");
      return;
    }

    console.log("📞 [CallLauncher] Starting Agora audio call");
    setIsStartingCall(true);
    
    // Simple permission check for microphone only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [CallLauncher] Audio permission granted");
      setIsAudioCallOpen(true);
    } catch (error) {
      console.warn("⚠️ [CallLauncher] Audio permission denied:", error);
      toast({
        title: "Audio Permission Required",
        description: "Please allow microphone access for audio calls.",
        variant: "destructive",
      });
    } finally {
      // Reset debouncing flag after a short delay
      setTimeout(() => setIsStartingCall(false), 1000);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleAudioCall}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          disabled={isStartingCall}
          title="Audio Call"
        >
          <Phone className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleVideoCall}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isStartingCall}
          title="Video Call"
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>

      <AgoraAudioCall
        matchId={matchId}
        userId={userId}
        receiverId={receiverId}
        open={isAudioCallOpen}
        onClose={() => setIsAudioCallOpen(false)}
        isIncoming={false}
      />

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
