import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { AgoraAudioCall } from "@/components/ui/agora-audio-call";
import { toast } from "@/hooks/use-toast";
import { callStateManager } from "@/services/call-state-manager";

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
  const lastCallAttempt = useRef<number>(0);
  const callInProgress = useRef<boolean>(false);

  const handleAudioCall = async () => {
    const now = Date.now();
    
    // Rate limiting: prevent calls within 3 seconds of each other
    if (now - lastCallAttempt.current < 3000) {
      console.log("📞 [AudioCallLauncher] Rate limited - too soon after last attempt");
      return;
    }
    
    // Check if call is already in progress or starting
    if (isStartingCall || callInProgress.current || isAudioCallOpen) {
      console.log("📞 [AudioCallLauncher] Call already in progress, ignoring duplicate click");
      return;
    }

    // Check if already in any call
    if (callStateManager.isInCall()) {
      console.log("📞 [AudioCallLauncher] Cannot start audio call - already in another call");
      toast({
        title: "Call in Progress",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    lastCallAttempt.current = now;
    console.log("📞 [AudioCallLauncher] Starting Agora audio call");
    setIsStartingCall(true);
    callInProgress.current = true;
    
    // Simple permission check for microphone only
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Just testing permissions
      console.log("✅ [AudioCallLauncher] Audio permission granted");
      setIsAudioCallOpen(true);
      // Set global call state - we'll get the actual callId from the call component
      callStateManager.setCallActive("audio", 0, true); // Temporary callId, will be updated
      // Don't reset isStartingCall here - let the call component handle it
    } catch (error) {
      console.warn("⚠️ [AudioCallLauncher] Audio permission denied:", error);
      toast({
        title: "Audio Permission Required",
        description: "Please allow microphone access for audio calls.",
        variant: "destructive",
      });
      // Reset flags on permission error
      setIsStartingCall(false);
      callInProgress.current = false;
    }
  };

  const handleCallClose = () => {
    console.log("📞 [AudioCallLauncher] Call closed, resetting states");
    setIsAudioCallOpen(false);
    setIsStartingCall(false);
    callInProgress.current = false;
    callStateManager.setCallInactive();
  };

  return (
    <>
      <Button
        onClick={handleAudioCall}
        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        disabled={isStartingCall || callInProgress.current || isAudioCallOpen}
        title={isStartingCall || callInProgress.current || isAudioCallOpen ? "Call in progress..." : "Audio Call"}
      >
        <Phone className="h-4 w-4" />
      </Button>

      {/* Only render AgoraAudioCall when it should be open - prevents multiple instances */}
      {isAudioCallOpen && (
        <AgoraAudioCall
          matchId={matchId}
          userId={userId}
          receiverId={receiverId}
          open={isAudioCallOpen}
          onClose={handleCallClose}
          isIncoming={false}
        />
      )}
    </>
  );
}
