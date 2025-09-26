import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { AgoraVideoCall } from "@/components/ui/agora-video-call";
import { toast } from "@/hooks/use-toast";
import { callStateManager } from "@/services/call-state-manager";

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
  const lastCallAttempt = useRef<number>(0);
  const callInProgress = useRef<boolean>(false);

  const handleVideoCall = async () => {
    const now = Date.now();
    
    // Rate limiting: prevent calls within 3 seconds of each other
    if (now - lastCallAttempt.current < 3000) {
      console.log("📞 [VideoCallLauncher] Rate limited - too soon after last attempt");
      return;
    }
    
    // Check if call is already in progress or starting
    if (isStartingCall || callInProgress.current || isVideoCallOpen) {
      console.log("📞 [VideoCallLauncher] Call already in progress, ignoring duplicate click");
      return;
    }

    // Check if already in any call
    if (callStateManager.isInCall()) {
      console.log("📞 [VideoCallLauncher] Cannot start video call - already in another call");
      toast({
        title: "Call in Progress",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    lastCallAttempt.current = now;
    console.log("📞 [VideoCallLauncher] Starting Agora video call");
    setIsStartingCall(true);
    callInProgress.current = true;
    
    // Simple permission check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [VideoCallLauncher] Media permissions granted");
      setIsVideoCallOpen(true);
      // Set global call state - we'll get the actual callId from the call component
      callStateManager.setCallActive("video", 0, true); // Temporary callId, will be updated
      // Don't reset isStartingCall here - let the call component handle it
    } catch (error) {
      console.warn("⚠️ [VideoCallLauncher] Media permission denied:", error);
      toast({
        title: "Media Permission Required",
        description: "Please allow camera and microphone access for video calls.",
        variant: "destructive",
      });
      // Reset flags on permission error
      setIsStartingCall(false);
      callInProgress.current = false;
    }
  };

  const handleCallClose = () => {
    console.log("📞 [VideoCallLauncher] Call closed, resetting states");
    setIsVideoCallOpen(false);
    setIsStartingCall(false);
    callInProgress.current = false;
    callStateManager.setCallInactive();
  };

  return (
    <>
      <Button
        onClick={handleVideoCall}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        disabled={isStartingCall || callInProgress.current || isVideoCallOpen}
        title={isStartingCall || callInProgress.current || isVideoCallOpen ? "Call in progress..." : "Video Call"}
      >
        <Video className="h-4 w-4" />
      </Button>

      {/* Only render AgoraVideoCall when it should be open - prevents multiple instances */}
      {isVideoCallOpen && (
        <AgoraVideoCall
          matchId={matchId}
          userId={userId}
          receiverId={receiverId}
          open={isVideoCallOpen}
          onClose={handleCallClose}
          isIncoming={false}
        />
      )}
    </>
  );
}
