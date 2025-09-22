import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { MicOff, Video, VideoOff, Mic, PhoneOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  sendCallInitiate,
  sendCallCancel,
  sendCallAccept,
  sendCallDecline,
  sendCallEnd,
} from "@/services/websocket-service";
import { agoraService, CallStatus, CallParticipant } from "@/services/agora-service";
import type { UID, IRemoteVideoTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";

interface AgoraVideoCallProps {
  matchId: number;
  userId: number;
  receiverId: number;
  open: boolean;
  onClose: () => void;
  isIncoming?: boolean;
  existingCallId?: number;
}

export function AgoraVideoCall({
  matchId,
  userId,
  receiverId,
  open,
  onClose,
  isIncoming = false,
  existingCallId,
}: AgoraVideoCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [callId, setCallId] = useState<number | undefined>(existingCallId);
  const [callTimer, setCallTimer] = useState(0);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState<{
    appId: string;
    token?: string;
    channel: string;
  } | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Agora service events
  useEffect(() => {
    if (!open) return;

    const handleStatusChange = (status: CallStatus) => {
      console.log(`[AgoraVideoCall] Status changed to: ${status}`);
      setCallStatus(status);
    };

    const handleParticipantJoined = (participant: CallParticipant) => {
      console.log(`[AgoraVideoCall] Participant joined:`, participant);
      setParticipants(prev => [...prev.filter(p => p.uid !== participant.uid), participant]);
    };

    const handleParticipantLeft = (uid: UID) => {
      console.log(`[AgoraVideoCall] Participant left:`, uid);
      setParticipants(prev => prev.filter(p => p.uid !== uid));
    };

    const handleTrackSubscribed = (uid: UID, track: IRemoteVideoTrack | IRemoteAudioTrack) => {
      console.log(`[AgoraVideoCall] Track subscribed from ${uid}:`, track.trackMediaType);
      
      if (track.trackMediaType === "video" && remoteVideoRef.current) {
        (track as IRemoteVideoTrack).play(remoteVideoRef.current);
      } else if (track.trackMediaType === "audio") {
        (track as IRemoteAudioTrack).play();
      }
    };

    const handleError = (error: Error) => {
      console.error("[AgoraVideoCall] Agora error:", error);
      toast({
        title: "Call Error",
        description: error.message || "An error occurred during the call",
        variant: "destructive",
      });
      
      // IMMEDIATELY stop all camera and mic access on any error
      console.log("[AgoraVideoCall] IMMEDIATELY stopping camera/mic due to Agora error");
      agoraService.forceStopAllMedia();
      
      // Then do full cleanup
      console.log("[AgoraVideoCall] Performing full cleanup after error");
      handleEndCall();
    };

    agoraService.setEventHandlers({
      onStatusChange: handleStatusChange,
      onParticipantJoined: handleParticipantJoined,
      onParticipantLeft: handleParticipantLeft,
      onParticipantTrackSubscribed: handleTrackSubscribed,
      onError: handleError,
    });

    return () => {
      // Clean up event handlers when component unmounts
      agoraService.setEventHandlers({});
    };
  }, [open]);

  // Cleanup camera and mic when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log("[AgoraVideoCall] Page unloading, ensuring camera/mic cleanup");
      agoraService.leaveCall().catch(error => {
        console.error("[AgoraVideoCall] Error during page unload cleanup:", error);
      });
    };

    if (open) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (open && !isCleaningUp) {
        console.log("[AgoraVideoCall] Component unmounting, IMMEDIATE camera/mic cleanup");
        // Immediately stop camera/mic first
        agoraService.forceStopAllMedia();
        // Then do full cleanup
        agoraService.leaveCall().catch(error => {
          console.error("[AgoraVideoCall] Error during unmount cleanup:", error);
        });
      }
    };
  }, [open]);

  // Setup call when dialog opens
  useEffect(() => {
    if (!open) return;

    const setupCall = async () => {
      try {
        setCallStatus("connecting");

        let currentCallId = existingCallId;

        // Create new call if not joining existing one
        if (!existingCallId) {
          console.log("📞 [AgoraVideoCall] Creating new video call...");
          
          const response = await apiRequest("/api/agora-calls", {
            method: "POST",
            data: {
              matchId,
              initiatorId: userId,
              receiverId,
              channel: `charley-${matchId}-${Date.now()}`,
              status: "pending",
            },
          });

          const data = await response.json();
          currentCallId = data.call.id;
          setCallId(currentCallId);
          setAgoraConfig({
            appId: data.agoraConfig.appId,
            token: data.agoraConfig.token,
            channel: data.agoraConfig.channel,
          });

          console.log("📞 [AgoraVideoCall] Call created, sending initiate signal:", {
            callId: currentCallId,
            matchId,
            callerId: userId,
            receiverId,
          });

          // Notify receiver via WebSocket
          if (currentCallId) {
            sendCallInitiate({
              type: "call_initiate",
              matchId,
              callerId: userId,
              receiverId,
              toUserId: receiverId,
              callId: currentCallId,
              roomName: data.agoraConfig.channel,
            });
          }
        } else {
          // Get existing call configuration
          const response = await apiRequest(`/api/agora-calls/${existingCallId}`, {
            method: "GET",
          });
          
          const data = await response.json();
          setAgoraConfig({
            appId: data.agoraConfig.appId,
            token: data.agoraConfig.token,
            channel: data.agoraConfig.channel,
          });
        }

      } catch (error) {
        console.error("Error setting up call:", error);
        toast({
          title: "Call Failed",
          description: "Could not establish video call connection.",
          variant: "destructive",
        });
        handleEndCall();
      }
    };

    setupCall();
  }, [open, existingCallId, matchId, userId, receiverId]);

  // Join Agora channel when config is ready (only for outgoing calls or after accepting incoming)
  useEffect(() => {
    if (!agoraConfig || !open) return;
    
    // For incoming calls, only join after user accepts
    if (isIncoming && callStatus === "connecting") {
      console.log("[AgoraVideoCall] Incoming call - waiting for user to accept");
      return;
    }

    const joinChannel = async () => {
      try {
        console.log("[AgoraVideoCall] Joining Agora channel:", agoraConfig.channel);
        
        await agoraService.joinCall({
          appId: agoraConfig.appId,
          token: agoraConfig.token,
          channel: agoraConfig.channel,
          uid: userId,
        });

        // Attach local video preview
        const localVideoTrack = agoraService.getLocalVideoTrack();
        if (localVideoTrack && localVideoRef.current) {
          localVideoTrack.play(localVideoRef.current);
        }

        console.log("[AgoraVideoCall] Successfully joined Agora channel");
        
      } catch (error) {
        console.error("[AgoraVideoCall] Failed to join Agora channel:", error);
        
        // Check if this is a user cancellation vs actual failure
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("WS_ABORT: LEAVE") || errorMessage.includes("cancel") || errorMessage.includes("OPERATION_ABORTED")) {
          console.log("[AgoraVideoCall] Call was cancelled by user, no error toast needed");
          // Don't show error toast for user cancellations
        } else {
          toast({
            title: "Call Disconnected", 
            description: "",
            variant: "destructive",
          });
        }
        handleEndCall();
      }
    };

    joinChannel();
  }, [agoraConfig, open, userId, callStatus, isIncoming]);

  // Handle incoming call timeout
  useEffect(() => {
    if (isIncoming && open && callStatus === "connecting") {
      callTimeoutRef.current = setTimeout(() => {
        console.log("Call timeout reached, auto-declining");
        toast({
          title: "Missed Call",
          description: "Call ended - no answer",
        });
        handleDeclineCall();
      }, 45000);
    }

    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    };
  }, [isIncoming, open, callStatus]);

  // Call timer for connected calls
  useEffect(() => {
    if (callStatus === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callStatus]);

  // Listen for remote call events
  useEffect(() => {
    if (!open) return;

    const handleCallAccept = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId === callId) {
        console.log("[AgoraVideoCall] Call accepted by remote user");
        setCallStatus("connected");
      }
    };

    const handleCallDecline = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId === callId && detail.fromUserId !== userId) {
        console.log("[AgoraVideoCall] Call declined by remote user");
        toast({
          title: "Call Declined",
          description: "The other person declined your call",
        });
        handleRemoteClose();
      }
    };

    const handleCallEnd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId === callId && detail.fromUserId !== userId) {
        console.log("[AgoraVideoCall] Call ended by remote user");
        handleRemoteClose();
      }
    };

    const handleCallCancel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId === callId) {
        console.log("[AgoraVideoCall] Call cancelled by remote user");
        toast({
          title: "Call Cancelled",
          description: "The caller cancelled the call",
        });
        handleRemoteClose();
      }
    };

    window.addEventListener("call:accept", handleCallAccept as any);
    window.addEventListener("call:decline", handleCallDecline as any);
    window.addEventListener("call:end", handleCallEnd as any);
    window.addEventListener("call:cancel", handleCallCancel as any);

    return () => {
      window.removeEventListener("call:accept", handleCallAccept as any);
      window.removeEventListener("call:decline", handleCallDecline as any);
      window.removeEventListener("call:end", handleCallEnd as any);
      window.removeEventListener("call:cancel", handleCallCancel as any);
    };
  }, [open, callId, userId]);

  const toggleMute = async () => {
    try {
      // If currently muted, enable audio (unmute)
      // If currently unmuted, disable audio (mute)
      const shouldEnableAudio = isMuted;
      const newState = await agoraService.toggleAudio(shouldEnableAudio);
      setIsMuted(!newState);
      console.log(`[AgoraVideoCall] Mute toggled - isMuted: ${!newState}, audioEnabled: ${newState}`);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
      toast({
        title: "Error",
        description: "Failed to toggle microphone",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = async () => {
    try {
      // If currently video off, enable video
      // If currently video on, disable video  
      const shouldEnableVideo = !isVideoOn;
      const newState = await agoraService.toggleVideo(shouldEnableVideo);
      setIsVideoOn(newState);
      console.log(`[AgoraVideoCall] Video toggled - isVideoOn: ${newState}, videoEnabled: ${newState}`);
      
      if (!newState) {
        setIsAudioOnly(true);
      } else {
        setIsAudioOnly(false);
        // Re-attach local video if enabled
        const localVideoTrack = agoraService.getLocalVideoTrack();
        if (localVideoTrack && localVideoRef.current) {
          localVideoTrack.play(localVideoRef.current);
        }
      }
    } catch (error) {
      console.error("Failed to toggle video:", error);
      toast({
        title: "Error", 
        description: "Failed to toggle camera",
        variant: "destructive",
      });
    }
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = async () => {
    if (isCleaningUp) {
      console.log("[AgoraVideoCall] Already cleaning up, skipping duplicate end call");
      return;
    }
    
    setIsCleaningUp(true);
    console.log(`[AgoraVideoCall] Starting call end cleanup - callId: ${callId}, userId: ${userId}, receiverId: ${receiverId}`);

    try {
      // Leave Agora channel
      await agoraService.leaveCall();
      
      setCallStatus("ended");

      if (callId) {
        console.log(`[AgoraVideoCall] Updating call ${callId} status to completed`);
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "completed" },
        });
        
        console.log(`[AgoraVideoCall] Sending call_end WebSocket message`);
        sendCallEnd({
          type: "call_end",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } else {
        console.warn("[AgoraVideoCall] No callId available for ending call");
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }

    cleanupTimers();
    onClose();
  };

  const handleCancelCall = async () => {
    if (isCleaningUp) {
      console.log("[AgoraVideoCall] Already cleaning up, skipping duplicate cancel call");
      return;
    }
    
    setIsCleaningUp(true);
    console.log("[AgoraVideoCall] Starting call cancel cleanup");

    try {
      await agoraService.leaveCall();
      setCallStatus("ended");
      
      if (callId) {
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "cancelled" },
        });
        
        sendCallCancel({
          type: "call_cancel",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    } catch (error) {
      console.error("Error canceling call:", error);
    }

    cleanupTimers();
    onClose();
  };

  const handleDeclineCall = async () => {
    if (isCleaningUp) {
      console.log("[AgoraVideoCall] Already cleaning up, skipping duplicate decline call");
      return;
    }
    
    setIsCleaningUp(true);
    console.log("[AgoraVideoCall] Starting call decline cleanup");

    try {
      await agoraService.leaveCall();
      setCallStatus("ended");

      if (callId) {
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH", 
          data: { status: "declined" },
        });
        
        sendCallDecline({
          type: "call_decline",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    } catch (error) {
      console.error("Error declining call:", error);
    }

    cleanupTimers();
    onClose();
  };

  const handleAcceptCall = async () => {
    try {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      // Join Agora channel when accepting incoming call
      if (agoraConfig) {
        console.log("[AgoraVideoCall] Accepting call - joining Agora channel");
        
        await agoraService.joinCall({
          appId: agoraConfig.appId,
          token: agoraConfig.token,
          channel: agoraConfig.channel,
          uid: userId,
        });

        // Attach local video preview
        const localVideoTrack = agoraService.getLocalVideoTrack();
        if (localVideoTrack && localVideoRef.current) {
          localVideoTrack.play(localVideoRef.current);
        }
      }

      setCallStatus("connected");

      if (callId) {
        sendCallAccept({
          type: "call_accept",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });
      }
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleRemoteClose = async () => {
    if (isCleaningUp) {
      console.log("[AgoraVideoCall] Already cleaning up, skipping duplicate remote close");
      return;
    }
    
    setIsCleaningUp(true);
    console.log("[AgoraVideoCall] Starting remote close cleanup");

    try {
      await agoraService.leaveCall();
    } catch (error) {
      console.error("Error during remote close:", error);
    }
    
    setCallStatus("ended");
    cleanupTimers();
    onClose();
  };

  const cleanupTimers = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Reset cleanup state if it gets stuck
  useEffect(() => {
    if (isCleaningUp) {
      const resetTimer = setTimeout(() => {
        console.log("[AgoraVideoCall] Resetting stuck cleanup state");
        setIsCleaningUp(false);
      }, 5000); // Reset after 5 seconds

      return () => clearTimeout(resetTimer);
    }
  }, [isCleaningUp]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isCleaningUp) {
          console.log("[AgoraVideoCall] Dialog closing, determining cleanup action");
          // Small delay to prevent interference with button clicks
          setTimeout(() => {
            if (!isCleaningUp) {
              if (isIncoming && callStatus === "connecting") {
                handleDeclineCall();
              } else if (!isIncoming && callStatus === "connecting") {
                handleCancelCall();
              } else {
                handleEndCall();
              }
            }
          }, 100);
        }
      }}
    >
      <DialogContent className={`sm:max-w-[800px] max-h-[90vh] overflow-hidden`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {isIncoming
                ? "Incoming Video Call"
                : isAudioOnly
                  ? "Audio Call"
                  : "Video Call"}
            </span>
            {callStatus === "connected" && (
              <span className="text-sm font-normal text-muted-foreground">
                {formatCallTime(callTimer)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[60vh] bg-gray-900 rounded-md overflow-hidden">
          {callStatus === "connecting" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-white">
                  {isIncoming ? "Incoming call..." : "Connecting..."}
                </p>
              </div>

              {/* Show answer/decline buttons for incoming calls */}
              {isIncoming && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
                  <Button
                    variant="destructive"
                    onClick={handleDeclineCall}
                    className="h-12 w-12 rounded-full p-0"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={handleAcceptCall}
                    className="h-12 w-12 rounded-full p-0 bg-green-600 hover:bg-green-700"
                  >
                    <Video className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Remote video */}
              <div
                ref={remoteVideoRef}
                className="w-full h-full bg-gray-800 flex items-center justify-center"
              >
                {participants.length === 0 && (
                  <div className="text-white text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center">
                      <Video className="h-8 w-8" />
                    </div>
                    <p>Waiting for other participant...</p>
                  </div>
                )}
              </div>

              {/* Local video preview */}
              <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-black rounded-md overflow-hidden border-2 border-gray-700">
                <div
                  ref={localVideoRef}
                  className={`w-full h-full ${isVideoOn && !isAudioOnly ? "" : "hidden"}`}
                />
                {(!isVideoOn || isAudioOnly) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="text-white" />
                  </div>
                )}
              </div>

              {isAudioOnly && (
                <div className="absolute top-4 right-4 bg-gray-900/70 text-white px-3 py-1 rounded-full text-xs">
                  Audio only
                </div>
              )}
            </>
          )}

          {/* Connection status indicator */}
          {callStatus === "connecting" && (
            <div className="absolute top-4 left-4 bg-yellow-600 text-white px-3 py-1 rounded-full text-sm">
              Connecting...
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className="flex justify-center space-x-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${isMuted ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
            onClick={toggleMute}
            disabled={callStatus === "ended"}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${!isVideoOn ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
            onClick={toggleVideo}
            disabled={callStatus === "ended"}
          >
            {isVideoOn ? <Video /> : <VideoOff />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full"
            onClick={async () => {
              console.log(`[AgoraVideoCall] End call button clicked - isIncoming: ${isIncoming}, callStatus: ${callStatus}, callId: ${callId}, isCleaningUp: ${isCleaningUp}`);
              
              // Force close if already cleaning up for too long
              if (isCleaningUp) {
                console.log("[AgoraVideoCall] Force closing due to stuck cleanup state");
                setIsCleaningUp(false);
                onClose();
                return;
              }

              // IMMEDIATELY stop camera/mic when red button is clicked
              console.log("[AgoraVideoCall] Red button clicked - IMMEDIATELY stopping camera/mic");
              agoraService.forceStopAllMedia();

              if (isIncoming && callStatus === "connecting") {
                console.log("[AgoraVideoCall] Declining incoming call");
                handleDeclineCall();
              } else if (callStatus === "connecting" && !isIncoming) {
                console.log("[AgoraVideoCall] Cancelling outgoing call");
                handleCancelCall();
              } else {
                console.log("[AgoraVideoCall] Ending active call");
                handleEndCall();
              }
            }}
          >
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 