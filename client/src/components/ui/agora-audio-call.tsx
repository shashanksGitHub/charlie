import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { MicOff, Mic, PhoneOff, Phone, User } from "lucide-react";
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
import { agoraAudioService, AudioCallStatus, AudioCallParticipant } from "@/services/agora-audio-service";
import type { UID, IRemoteAudioTrack } from "agora-rtc-sdk-ng";

interface AgoraAudioCallProps {
  matchId: number;
  userId: number;
  receiverId: number;
  open: boolean;
  onClose: () => void;
  isIncoming?: boolean;
  existingCallId?: number;
}

export function AgoraAudioCall({
  matchId,
  userId,
  receiverId,
  open,
  onClose,
  isIncoming = false,
  existingCallId,
}: AgoraAudioCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<AudioCallStatus>("connecting");
  const [callId, setCallId] = useState<number | undefined>(existingCallId);
  const [callTimer, setCallTimer] = useState(0);
  const [participants, setParticipants] = useState<AudioCallParticipant[]>([]);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [hasJoinAttempted, setHasJoinAttempted] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState<{
    appId: string;
    token?: string;
    channel: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Agora service events
  useEffect(() => {
    if (!open) return;

    const currentCallId = callId || existingCallId || "pending";
    console.log(`[AgoraAudioCall-${currentCallId}] Setting up event handlers for audio call`);

    const handleStatusChange = (status: AudioCallStatus) => {
      console.log(`[AgoraAudioCall-${currentCallId}] Status changed to: ${status}`);
      setCallStatus(status);
    };

    const handleParticipantJoined = (participant: AudioCallParticipant) => {
      console.log(`[AgoraAudioCall-${currentCallId}] Participant joined:`, participant);
      setParticipants(prev => [...prev.filter(p => p.uid !== participant.uid), participant]);
    };

    const handleParticipantLeft = (uid: UID) => {
      console.log(`[AgoraAudioCall-${currentCallId}] Participant left:`, uid);
      setParticipants(prev => prev.filter(p => p.uid !== uid));
    };

    const handleTrackSubscribed = (uid: UID, track: IRemoteAudioTrack) => {
      console.log(`[AgoraAudioCall-${currentCallId}] Audio track subscribed from ${uid}`);
      if (track.trackMediaType === "audio") {
        track.play();
      }
    };

    const handleError = (error: Error) => {
      console.error(`[AgoraAudioCall-${currentCallId}] Agora error:`, error);
      
      // Handle specific error types gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("WS_ABORT") || errorMessage.includes("LEAVE") || errorMessage.includes("INVALID_OPERATION")) {
        console.log(`[AgoraAudioCall-${currentCallId}] Call was cancelled/aborted - this is expected during cleanup`);
        // Don't show error toast for expected cleanup operations
        handleEndCall();
        return;
      }
      
      toast({
        title: "Call Error",
        description: error.message || "An error occurred during the call",
        variant: "destructive",
      });
      
      // IMMEDIATELY stop all microphone access on any error
      console.log(`[AgoraAudioCall-${currentCallId}] IMMEDIATELY stopping microphone due to Agora error`);
      agoraAudioService.forceStopAllMedia();
      
      // Then do full cleanup
      console.log(`[AgoraAudioCall-${currentCallId}] Performing full cleanup after error`);
      handleEndCall();
    };

    agoraAudioService.setEventHandlers({
      onStatusChange: handleStatusChange,
      onParticipantJoined: handleParticipantJoined,
      onParticipantLeft: handleParticipantLeft,
      onParticipantAudioSubscribed: handleTrackSubscribed,
      onError: handleError,
    });

    return () => {
      // Clean up event handlers when component unmounts
      agoraAudioService.setEventHandlers({});
    };
  }, [open]);

  // Cleanup microphone when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log(`[AgoraAudioCall-${callId}] Page unloading, ensuring microphone cleanup`);
      agoraAudioService.leaveCall().catch(error => {
        console.error(`[AgoraAudioCall-${callId}] Error during page unload cleanup:`, error);
      });
    };

    if (open) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (open && !isCleaningUp) {
        console.log(`[AgoraAudioCall-${callId}] Component unmounting, IMMEDIATE microphone cleanup`);
        // Immediately stop microphone first
        agoraAudioService.forceStopAllMedia();
        // Then do full cleanup
        agoraAudioService.leaveCall().catch(error => {
          console.error(`[AgoraAudioCall-${callId}] Error during unmount cleanup:`, error);
        });
      }
    };
  }, [open, callId]);

  // Setup call when dialog opens
  useEffect(() => {
    if (!open || isCreatingCall) return;

    const setupCall = async () => {
      try {
        setCallStatus("connecting");
        setIsCreatingCall(true);

        let currentCallId = existingCallId;

        // Create new call if not joining existing one
        if (!existingCallId) {
          console.log(`📞 [AgoraAudioCall] Creating new audio call for match ${matchId}...`);
          
          const response = await apiRequest("/api/agora-calls", {
            method: "POST",
            data: {
              matchId,
              initiatorId: userId,
              receiverId,
              channel: `charley-audio-${matchId}-${Date.now()}`,
              status: "pending",
              callType: "audio", // Add call type for audio calls
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

          console.log(`📞 [AgoraAudioCall-${currentCallId}] Audio call created, sending initiate signal:`, {
            callId: currentCallId,
            matchId,
            callerId: userId,
            receiverId,
            callType: "audio",
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
              callType: "audio", // Add call type to WebSocket message
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
        console.error("[AgoraAudioCall] Failed to setup call:", error);
        toast({
          title: "Connection Error",
          description: "Could not establish audio call connection.",
          variant: "destructive",
        });
        onClose();
      } finally {
        setIsCreatingCall(false);
      }
    };

    setupCall();
  }, [open, existingCallId, matchId, userId, receiverId, onClose, isCreatingCall]);

  // Join Agora channel when config is ready (only for outgoing calls or after accepting incoming)
  useEffect(() => {
    if (!agoraConfig || !open || hasJoinAttempted) return;

    // Skip join if cleanup is in progress
    if (isCleaningUp) {
      console.log(`[AgoraAudioCall-${callId || "pending"}] ⛔ useEffect blocked - cleanup in progress`);
      return;
    }

    // Skip auto-join for incoming calls (wait for user to accept)
    if (isIncoming && callStatus === "connecting") {
      console.log(`[AgoraAudioCall-${callId || "pending"}] Incoming call - waiting for user to accept`);
      return;
    }

    const joinChannel = async () => {
      try {
        // Mark join attempt to prevent duplicates
        setHasJoinAttempted(true);

        // Double-check cleanup state before proceeding
        if (isCleaningUp) {
          console.log(`[AgoraAudioCall-${callId || "pending"}] ⛔ Preventing join - cleanup in progress`);
          return;
        }

        console.log(`[AgoraAudioCall-${callId || "pending"}] Joining Agora channel for audio call:`, agoraConfig.channel);

        // Add a small delay before joining to ensure any previous cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Double-check again after delay
        if (isCleaningUp) {
          console.log(`[AgoraAudioCall-${callId || "pending"}] ⛔ Aborting join - cleanup started during delay`);
          return;
        }

        // Join with audio-only (no video)
        await agoraAudioService.joinCall({
          appId: agoraConfig.appId,
          token: agoraConfig.token,
          channel: agoraConfig.channel,
          uid: userId,
        });

        console.log(`[AgoraAudioCall-${callId || "pending"}] Successfully joined Agora channel for audio call`);
        
      } catch (error) {
        console.error(`[AgoraAudioCall-${callId || "pending"}] Failed to join Agora channel:`, error);
        
        // Handle specific cancellation case gracefully
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("cancel") || errorMessage.includes("OPERATION_ABORTED") || errorMessage.includes("WS_ABORT") || errorMessage.includes("LEAVE") || errorMessage.includes("INVALID_OPERATION")) {
          console.log(`[AgoraAudioCall-${callId || "pending"}] Call was cancelled/aborted by user or cleanup - this is expected`);
          // Don't show error toast for expected cleanup operations
          return;
        }
        
        toast({
          title: "Connection Failed",
          description: "Could not join the audio call. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (!isIncoming || callStatus === "connected") {
      joinChannel();
    }
  }, [agoraConfig, open, userId, callStatus, isIncoming, isCleaningUp, hasJoinAttempted, callId]);

  // WebSocket message handling
  useEffect(() => {
    if (!open) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "call_accept" && data.callId === callId) {
          console.log("[AgoraAudioCall] Call accepted by remote user");
          setCallStatus("connected");
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          startCallTimer();
        } else if (data.type === "call_decline" && data.callId === callId) {
          console.log("[AgoraAudioCall] Call declined by remote user");
          toast({
            title: "Call Declined",
            description: "The other person declined your call.",
          });
          handleRemoteClose();
        } else if (data.type === "call_end" && data.callId === callId) {
          console.log("[AgoraAudioCall] Call ended by remote user");
          toast({
            title: "Call Ended",
            description: "The call has been ended.",
          });
          handleRemoteClose();
        } else if (data.type === "call_cancel" && data.callId === callId) {
          console.log("[AgoraAudioCall] Call cancelled by remote user");
          toast({
            title: "Call Cancelled",
            description: "The caller cancelled the call.",
          });
          handleRemoteClose();
        }
      } catch (error) {
        console.error("[AgoraAudioCall] Error parsing WebSocket message:", error);
      }
    };

    // Add WebSocket event listener
    if (window.WebSocket) {
      window.addEventListener("message", handleWebSocketMessage);
    }

    return () => {
      if (window.WebSocket) {
        window.removeEventListener("message", handleWebSocketMessage);
      }
    };
  }, [open, callId]);

  // Mute/unmute audio
  const toggleMute = async () => {
    try {
      const shouldEnableAudio = isMuted;
      const newState = await agoraAudioService.toggleAudio(shouldEnableAudio);
      setIsMuted(!newState);
      console.log(`[AgoraAudioCall-${callId || "pending"}] Mute toggled - isMuted: ${!newState}, audioEnabled: ${newState}`);
    } catch (error) {
      console.error(`[AgoraAudioCall-${callId || "pending"}] Failed to toggle mute:`, error);
      toast({
        title: "Audio Error",
        description: "Failed to toggle microphone",
        variant: "destructive",
      });
    }
  };

  // End call
  const handleEndCall = async () => {
    if (isCleaningUp) {
      console.log(`[AgoraAudioCall-${callId}] Already cleaning up, skipping duplicate end call`);
      return;
    }
    setIsCleaningUp(true);

    console.log(`[AgoraAudioCall-${callId}] Starting call end cleanup - callId: ${callId}, userId: ${userId}, receiverId: ${receiverId}`);

    try {
      // Leave Agora audio channel
      await agoraAudioService.leaveCall();

      // Update call status in backend
      if (callId) {
        console.log(`[AgoraAudioCall-${callId}] Updating call ${callId} status to completed`);
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "completed" },
        });

        console.log(`[AgoraAudioCall] Sending call_end WebSocket message`);
        sendCallEnd({
          type: "call_end",
          matchId,
          callId,
          fromUserId: userId,
          toUserId: receiverId,
        });
      } else {
        console.warn("[AgoraAudioCall] No callId available for ending call");
      }

      stopCallTimer();
    } catch (error) {
      console.error("[AgoraAudioCall] Error ending call:", error);
    } finally {
      onClose();
      setIsCleaningUp(false);
    }
  };

  // Cancel call (before connection)
  const handleCancelCall = async () => {
    if (isCleaningUp) {
      console.log(`[AgoraAudioCall-${callId}] Already cleaning up, skipping duplicate cancel call`);
      return;
    }
    setIsCleaningUp(true);

    console.log(`[AgoraAudioCall-${callId}] Starting call cancel cleanup`);

    try {
      await agoraAudioService.leaveCall();

      if (callId) {
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "cancelled" },
        });

        sendCallCancel({
          type: "call_cancel",
          matchId,
          callId,
          fromUserId: userId,
          toUserId: receiverId,
        });
      }

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("[AgoraAudioCall] Error cancelling call:", error);
    } finally {
      onClose();
      setIsCleaningUp(false);
    }
  };

  // Decline incoming call
  const handleDeclineCall = async () => {
    if (isCleaningUp) {
      console.log(`[AgoraAudioCall-${callId}] Already cleaning up, skipping duplicate decline call`);
      return;
    }
    setIsCleaningUp(true);

    console.log(`[AgoraAudioCall-${callId}] Starting call decline cleanup`);

    try {
      await agoraAudioService.leaveCall();

      if (callId) {
        await apiRequest(`/api/agora-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "declined" },
        });

        sendCallDecline({
          type: "call_decline",
          matchId,
          callId,
          fromUserId: userId,
          toUserId: receiverId,
        });
      }
    } catch (error) {
      console.error("[AgoraAudioCall] Error declining call:", error);
    } finally {
      onClose();
      setIsCleaningUp(false);
    }
  };

  // Accept incoming call
  const handleAcceptCall = async () => {
    try {
      setCallStatus("connected");
      setHasJoinAttempted(true); // Prevent duplicate join attempts

      // Join Agora audio channel when accepting incoming call
      if (agoraConfig) {
        console.log(`[AgoraAudioCall-${callId || "pending"}] Accepting call - joining Agora audio channel`);

        // Join with audio-only (no video)
        await agoraAudioService.joinCall({
          appId: agoraConfig.appId,
          token: agoraConfig.token,
          channel: agoraConfig.channel,
          uid: userId,
        });

        if (callId) {
          sendCallAccept({
            type: "call_accept",
            matchId,
            callId,
            fromUserId: userId,
            toUserId: receiverId,
          });
        }
      }

      startCallTimer();
    } catch (error) {
      console.error(`[AgoraAudioCall-${callId || "pending"}] Error accepting call:`, error);
      toast({
        title: "Connection Error",
        description: "Could not accept the call. Please try again.",
        variant: "destructive",
      });
      onClose();
    }
  };

  // Handle remote close
  const handleRemoteClose = async () => {
    if (isCleaningUp) {
      console.log(`[AgoraAudioCall-${callId}] Already cleaning up, skipping duplicate remote close`);
      return;
    }
    setIsCleaningUp(true);

    console.log(`[AgoraAudioCall-${callId}] Starting remote close cleanup`);

    try {
      await agoraAudioService.leaveCall();
      stopCallTimer();
    } catch (error) {
      console.error(`[AgoraAudioCall-${callId}] Error during remote close cleanup:`, error);
    } finally {
      onClose();
      setIsCleaningUp(false);
    }
  };

  // Start call timer
  const startCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    const startTime = Date.now();
    callTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setCallTimer(elapsed);
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Format call duration
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      stopCallTimer();

      // Critical: Force reset cleanup state if component unmounts during cleanup
      if (isCleaningUp) {
        console.log("[AgoraAudioCall] Resetting stuck cleanup state");
        setIsCleaningUp(false);
      }
    };
  }, [isCleaningUp]);

  const handleClose = (force: boolean = false) => {
    try {
      if (isCleaningUp && !force) {
        console.log("[AgoraAudioCall] Dialog closing, determining cleanup action");
        return;
      }

      if (isIncoming && callStatus === "connecting") {
        handleDeclineCall();
      } else if (callStatus === "connected") {
        handleEndCall();
      } else {
        handleCancelCall();
      }
    } catch (error) {
      console.error("[AgoraAudioCall] Error in handleClose:", error);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isIncoming ? "Incoming Audio Call" : "Audio Call"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Participant Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
            
            <div className="text-center">
              <p className="text-lg font-semibold">Audio Call</p>
              {callStatus === "connected" && (
                <p className="text-sm text-muted-foreground">
                  {formatCallDuration(callTimer)}
                </p>
              )}
              {callStatus === "connecting" && !isIncoming && (
                <p className="text-sm text-muted-foreground">Connecting...</p>
              )}
              {callStatus === "connecting" && isIncoming && (
                <p className="text-sm text-muted-foreground">Incoming audio call</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-6">
            {/* Incoming Call Controls */}
            {isIncoming && callStatus === "connecting" && (
              <>
                {/* Accept Button */}
                <Button
                  onClick={handleAcceptCall}
                  size="lg"
                  className="w-16 h-16 rounded-full p-0 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  disabled={isCleaningUp || hasJoinAttempted}
                >
                  <Phone className="h-8 w-8" />
                </Button>

                {/* Decline Button */}
                <Button
                  onClick={() => {
                    if (isCleaningUp) return;
                    console.log(`[AgoraAudioCall-${callId || "pending"}] Decline button clicked`);
                    agoraAudioService.forceStopAllMedia();
                    handleDeclineCall();
                  }}
                  variant="destructive"
                  size="lg"
                  className="w-16 h-16 rounded-full p-0 shadow-lg"
                  disabled={isCleaningUp}
                >
                  <PhoneOff className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Connected Call Controls */}
            {callStatus === "connected" && (
              <>
                {/* Mute/Unmute Button */}
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  size="lg"
                  className="w-16 h-16 rounded-full p-0 shadow-lg"
                  disabled={isCleaningUp}
                >
                  {isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>

                {/* End Call Button */}
                <Button
                  onClick={() => {
                    if (isCleaningUp) return;
                    console.log(`[AgoraAudioCall-${callId || "pending"}] End call button clicked`);
                    agoraAudioService.forceStopAllMedia();
                    handleEndCall();
                  }}
                  variant="destructive"
                  size="lg"
                  className="w-16 h-16 rounded-full p-0 shadow-lg"
                  disabled={isCleaningUp}
                >
                  <PhoneOff className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Outgoing Call Controls (connecting state, not incoming) */}
            {!isIncoming && callStatus === "connecting" && (
              <Button
                onClick={() => {
                  if (isCleaningUp) return;
                  console.log(`[AgoraAudioCall-${callId || "pending"}] Cancel call button clicked`);
                  agoraAudioService.forceStopAllMedia();
                  handleCancelCall();
                }}
                variant="destructive"
                size="lg"
                className="w-16 h-16 rounded-full p-0 shadow-lg"
                disabled={isCleaningUp}
              >
                <PhoneOff className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Call Status Debug Info (development only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-muted-foreground text-center">
              Status: {callStatus} | Incoming: {isIncoming ? "Yes" : "No"} | Cleaning: {isCleaningUp ? "Yes" : "No"} | ID: {callId || "pending"} | Joined: {hasJoinAttempted ? "Yes" : "No"}
            </div>
          )}

          {/* Participants indicator */}
          {participants.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} in call
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
