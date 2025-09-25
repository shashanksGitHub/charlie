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

  const handleVideoCall = async () => {
    console.log("📞 [CallLauncher] Starting Agora video call");
    
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
    }
  };

  const handleAudioCall = async () => {
    console.log("📞 [CallLauncher] Starting Agora audio call");
    
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
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleAudioCall}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Phone className="h-4 w-4" />
          <span>Audio Call</span>
        </Button>

        <Button
          onClick={handleVideoCall}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Video className="h-4 w-4" />
          <span>Video Call</span>
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
