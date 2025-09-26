import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Phone } from "lucide-react";
import { AgoraVideoCall } from "@/components/ui/agora-video-call";
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

  return (
    <>
      <Button
        onClick={handleVideoCall}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Video className="h-4 w-4" />
        <span>Video Call</span>
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
