import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { AgoraAudioCall } from "@/components/ui/agora-audio-call";
import { toast } from "@/hooks/use-toast";

interface AudioCallLauncherProps {
  matchId: number;
  userId: number;
  receiverId: number;
}

export function AudioCallLauncher({
  matchId,
  userId,
  receiverId,
}: AudioCallLauncherProps) {
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);

  const handleAudioCall = async () => {
    if (isStartingCall) {
      console.log("📞 [AudioCallLauncher] Audio call already starting, ignoring duplicate click");
      return;
    }

    console.log("📞 [AudioCallLauncher] Starting Agora audio call");
    setIsStartingCall(true);
    
    // Simple permission check for microphone only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [AudioCallLauncher] Audio permission granted");
      setIsAudioCallOpen(true);
    } catch (error) {
      console.warn("⚠️ [AudioCallLauncher] Audio permission denied:", error);
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
      <Button
        onClick={handleAudioCall}
        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
        disabled={isStartingCall}
        title="Audio Call"
      >
        <Phone className="h-4 w-4" />
      </Button>

      <AgoraAudioCall
        matchId={matchId}
        userId={userId}
        receiverId={receiverId}
        open={isAudioCallOpen}
        onClose={() => setIsAudioCallOpen(false)}
        isIncoming={false}
      />
    </>
  );
}
