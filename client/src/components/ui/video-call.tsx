import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { MicOff, Video, VideoOff, Mic, PhoneOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  sendCallInitiate,
  sendCallRinging,
  sendCallCancel,
  sendCallAccept,
  sendCallDecline,
  sendCallEnd,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendWebRTCIceCandidate,
} from "@/services/websocket-service";

interface VideoCallProps {
  matchId: number;
  userId: number;
  receiverId: number;
  open: boolean;
  onClose: () => void;
  isIncoming?: boolean;
  existingCallId?: number;
}

export function VideoCall({
  matchId,
  userId,
  receiverId,
  open,
  onClose,
  isIncoming = false,
  existingCallId,
}: VideoCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callId, setCallId] = useState<number | undefined>(existingCallId);
  const [connectionState, setConnectionState] =
    useState<RTCIceConnectionState>("new");
  const [callStatus, setCallStatus] = useState<
    "ringing" | "connecting" | "connected" | "ended"
  >("ringing");
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Buffer and guard for accept → offer race on caller side
  const acceptPendingRef = useRef<any>(null);
  const offerSentRef = useRef<boolean>(false);
  // Always-current callId to avoid stale state in event listeners
  const callIdRef = useRef<number | undefined>(existingCallId);
  // ICE buffering until remoteDescription is set
  const remoteDescriptionSetRef = useRef<boolean>(false);
  const pendingRemoteIceRef = useRef<any[]>([]);
  // Removed HTMLAudioElement ref; we manage WebAudio contexts with idempotent cleanup
  // Receiver-side acceptance/offer buffering
  const hasAcceptedRef = useRef<boolean>(false);
  const pendingOfferDetailRef = useRef<any>(null);
  // Caller-side fallback offer timer
  const fallbackOfferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // This is a simplified implementation without the actual Twilio integration
  // In a production app, we would use the Twilio SDK to establish the connection

  // Reset core UI state whenever a new call session opens
  useEffect(() => {
    if (open) {
      setCallStatus("ringing");
      setIsConnecting(true);
      setConnectionState("new");
      setIsAudioOnly(false);
      setIsVideoOn(true);
      setCallTimer(0);
      // Clear any previous media elements to ensure proper first-render UI
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    }
  }, [open, existingCallId, matchId, userId, receiverId, isIncoming]);

  useEffect(() => {
    if (!open) return;

    const setupCall = async () => {
      try {
        setIsConnecting(true);

        if (!existingCallId) {
          console.log("📞 [VideoCall] Creating new video call...");
          console.log(
            "📞 [VideoCall] Current WebSocket state before API call:",
            {
              exists: !!(window as any).chatSocket,
              readyState: (window as any).chatSocket?.readyState,
              isOpen: (window as any).chatSocket?.readyState === WebSocket.OPEN,
            },
          );

          // Create a new call
          const response = await apiRequest("/api/video-calls", {
            method: "POST",
            data: {
              matchId,
              initiatorId: userId,
              receiverId,
              roomName: `charley-${matchId}-${Date.now()}`,
              status: "pending",
            },
          });

          const data = await response.json();
          setCallId(data.videoCall.id);
          callIdRef.current = data.videoCall.id;
          console.log("📞 [VideoCall] Call created, sending initiate signal:", {
            callId: data.videoCall.id,
            matchId,
            callerId: userId,
            receiverId,
            roomName: data.videoCall.roomName,
          });

          // Notify receiver via WebSocket signaling (will queue if socket not yet open)
          const signalSent = sendCallInitiate({
            type: "call_initiate",
            matchId,
            callerId: userId,
            receiverId,
            toUserId: receiverId, // 🎯 FIX: Add explicit toUserId for server
            callId: data.videoCall.id,
            roomName: data.videoCall.roomName,
          });
          console.log(
            "📞 [VideoCall] call_initiate dispatched (sent=",
            signalSent,
            ")",
            {
              wsOpen:
                !!(window as any).chatSocket &&
                (window as any).chatSocket.readyState === WebSocket.OPEN,
              wsReadyState: (window as any).chatSocket?.readyState,
              callId: data.videoCall.id,
              matchId,
              receiverId,
              messageType: "call_initiate",
            },
          );

          if (signalSent) {
            console.log(
              "🎉 [VideoCall] call_initiate sent successfully through authenticated WebSocket!",
            );
          } else {
            console.log(
              "⚠️ [VideoCall] call_initiate was queued - WebSocket not ready",
            );
          }

          // In a real app, we would set up Twilio here
          // const room = await connectToTwilioRoom(data.twilioToken, data.videoCall.roomName);
        } else {
          // Join existing call
          const response = await apiRequest(
            `/api/video-calls/${existingCallId}/status`,
            {
              method: "PATCH",
              data: {
                status: "active",
              },
            },
          );
          callIdRef.current = existingCallId;

          // In a real app, we would set up Twilio here
          // const data = await response.json();
          // const room = await connectToTwilioRoom(data.twilioToken, data.videoCall.roomName);
        }

        await initWebRTC();
        setIsConnecting(false);

        // Caller-only: schedule a fallback offer if accept doesn't arrive in time
        if (!isIncoming) {
          if (fallbackOfferTimerRef.current) {
            clearTimeout(fallbackOfferTimerRef.current);
            fallbackOfferTimerRef.current = null;
          }
          fallbackOfferTimerRef.current = setTimeout(async () => {
            try {
              if (offerSentRef.current) return;
              const pc = pcRef.current;
              if (!pc) return;
              // Ensure local media is present
              if (
                !localStreamRef.current ||
                localStreamRef.current.getTracks().length === 0
              ) {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                  });
                  localStreamRef.current = stream;
                  if (localVideoRef.current)
                    (localVideoRef.current as any).srcObject = stream;
                  pc.getSenders().forEach((s) => {
                    if (s.track) pc.removeTrack(s);
                  });
                  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
                } catch (e) {
                  // proceed even if only audio
                }
              }
              if (!pc.localDescription && callIdRef.current) {
                console.log(
                  "📞 [Caller] Fallback: creating and sending offer (no accept received yet)",
                );
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                offerSentRef.current = true;
                sendWebRTCOffer({
                  type: "webrtc_offer",
                  callId: callIdRef.current,
                  matchId,
                  fromUserId: userId,
                  toUserId: receiverId,
                  sdp: offer,
                });
              }
            } catch (e) {
              console.warn("📞 [Caller] Fallback offer failed:", e);
            }
          }, 3000);
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

    return () => {
      // Cleanup function
      cleanupMedia();
      cleanupTimers();
      // Clear fallback timer
      if (fallbackOfferTimerRef.current) {
        clearTimeout(fallbackOfferTimerRef.current);
        fallbackOfferTimerRef.current = null;
      }
    };
  }, [open, existingCallId]);

  // Caller-side: attach a top-level accept listener early and buffer if PC not ready yet
  useEffect(() => {
    if (!open || isIncoming) return;

    const onAcceptTop = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("📞 [Caller] Received call_accept:", detail);

      // Match by callId if known; otherwise fall back to matchId + toUserId
      const matchesCall = callId
        ? detail.callId === callId
        : detail.matchId === matchId &&
          (detail.toUserId === userId || detail.fromUserId === receiverId);
      if (!matchesCall) {
        console.log("📞 [Caller] Accept doesn't match this call, ignoring");
        return;
      }

      setCallStatus("connecting");
      setIsConnecting(true);

      const pc = pcRef.current;
      if (pc && !offerSentRef.current) {
        try {
          // Ensure we have local tracks before creating offer
          if (
            !localStreamRef.current ||
            localStreamRef.current.getTracks().length === 0
          ) {
            console.log(
              "📞 [Caller] No local stream, getting media before offer",
            );
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
              // Remove existing tracks and add new ones
              pc.getSenders().forEach((sender) => {
                if (sender.track) pc.removeTrack(sender);
              });
              stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
              });
            } catch (mediaErr) {
              console.warn(
                "📞 [Caller] Failed to get media, proceeding anyway:",
                mediaErr,
              );
            }
          }

          if (!pc.localDescription) {
            console.log("📞 [Caller] Creating and sending offer");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            offerSentRef.current = true;
            sendWebRTCOffer({
              type: "webrtc_offer",
              callId: detail.callId,
              matchId: detail.matchId ?? matchId,
              fromUserId: userId,
              toUserId: detail.fromUserId || receiverId,
              sdp: offer,
            });
            console.log("📞 [Caller] Offer sent successfully");
          }
        } catch (err) {
          console.error(
            "📞 [Caller] Error creating/sending offer after accept:",
            err,
          );
        }
      } else {
        console.log(
          "📞 [Caller] PC not ready or offer already sent, buffering accept",
        );
        // Buffer the accept until RTCPeerConnection is ready
        acceptPendingRef.current = detail;
      }
    };

    window.addEventListener("call:accept", onAcceptTop as any);
    return () => window.removeEventListener("call:accept", onAcceptTop as any);
  }, [open, isIncoming, callId, matchId, userId, receiverId]);

  // Set up call timeout for incoming calls
  useEffect(() => {
    if (isIncoming && open && callStatus === "ringing") {
      // Auto-decline after 45 seconds if not answered
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

  // Check for busy state (if user is already in a call)
  useEffect(() => {
    const checkBusyState = () => {
      // Check if there are other active video call dialogs open
      const activeCallDialogs = document.querySelectorAll(
        '[data-state="open"][role="dialog"]',
      );
      const hasActiveCall = Array.from(activeCallDialogs).some(
        (dialog) => dialog.querySelector("video") !== null,
      );

      if (hasActiveCall && !open) {
        setIsBusy(true);
      } else {
        setIsBusy(false);
      }
    };

    checkBusyState();
    const interval = setInterval(checkBusyState, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Auto-decline if busy
  useEffect(() => {
    if (isBusy && isIncoming && open) {
      console.log("User is busy, auto-declining call");
      setTimeout(() => {
        sendCallDecline({
          type: "call_decline",
          callId: callId!,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });
        onClose();
      }, 100);
    }
  }, [isBusy, isIncoming, open, callId, matchId, userId, receiverId, onClose]);

  // Ringtones: distinct sounds for receiver (incoming) and caller (ringback)
  useEffect(() => {
    const startReceiverRingtone = () => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        // Double-beep pattern (receiver): 800Hz 0.3s, pause 0.2s, 800Hz 0.3s, pause 1.7s (2.5s cycle)
        const interval = setInterval(() => {
          if (!(open && callStatus === "ringing" && isIncoming)) return;
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(audioContext.destination);
          const t = audioContext.currentTime;
          gain.gain.setValueAtTime(0.0, t);
          osc.frequency.setValueAtTime(800, t);
          gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
          gain.gain.setValueAtTime(0.3, t + 0.3);
          gain.gain.linearRampToValueAtTime(0.0, t + 0.31);
          // second beep
          gain.gain.setValueAtTime(0.0, t + 0.5);
          gain.gain.linearRampToValueAtTime(0.3, t + 0.51);
          gain.gain.setValueAtTime(0.3, t + 0.8);
          gain.gain.linearRampToValueAtTime(0.0, t + 0.81);
          osc.start(t);
          osc.stop(t + 0.82);
        }, 2500);
        return () => {
          clearInterval(interval);
          if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch(() => {});
          }
        };
      } catch (e) {
        console.warn("Receiver ringtone error:", e);
      }
    };

    const startCallerRingback = () => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        // Ringback (caller): 440Hz+480Hz mix for 1.5s, then 3.5s silence (5s cycle)
        const interval = setInterval(() => {
          if (!(open && callStatus === "ringing" && !isIncoming)) return;
          const osc1 = audioContext.createOscillator();
          const osc2 = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          osc1.type = "sine";
          osc2.type = "sine";
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioContext.destination);
          const t = audioContext.currentTime;
          gain.gain.setValueAtTime(0.0, t);
          gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
          gain.gain.setValueAtTime(0.25, t + 1.5);
          gain.gain.linearRampToValueAtTime(0.0, t + 1.52);
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 1.53);
          osc2.stop(t + 1.53);
        }, 5000);
        return () => {
          clearInterval(interval);
          if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch(() => {});
          }
        };
      } catch (e) {
        console.warn("Caller ringback error:", e);
      }
    };

    const startVibrate = () => {
      try {
        if ("vibrate" in navigator) {
          const vibratePattern = [400, 200, 400, 200, 400];
          navigator.vibrate(vibratePattern);
          const vibrateInterval = setInterval(() => {
            if (callStatus === "ringing" && isIncoming && open) {
              navigator.vibrate(vibratePattern);
            } else {
              clearInterval(vibrateInterval);
            }
          }, 2000);
          return () => clearInterval(vibrateInterval);
        }
      } catch (e) {
        console.warn("Vibrate error:", e);
      }
    };

    let cleanupTone: (() => void) | undefined;
    let cleanupVibrate: (() => void) | undefined;

    if (open && callStatus === "ringing") {
      setTimeout(() => {
        cleanupTone = isIncoming
          ? startReceiverRingtone()
          : startCallerRingback();
        if (isIncoming) cleanupVibrate = startVibrate();
      }, 100);
    }

    return () => {
      if ("vibrate" in navigator) navigator.vibrate(0);
      if (cleanupTone) {
        try {
          cleanupTone();
        } catch {}
      }
      if (cleanupVibrate) {
        try {
          cleanupVibrate();
        } catch {}
      }
    };
  }, [isIncoming, open, callStatus]);

  const initWebRTC = async () => {
    // Fetch ICE servers from backend for security and TURN support
    let iceServers = [
      { urls: ["stun:stun.l.google.com:19302"] }, // Fallback STUN
    ];

    try {
      const response = await apiRequest("/api/ice", { method: "GET" });
      const data = await response.json();
      if (data.ice_servers && Array.isArray(data.ice_servers)) {
        iceServers = data.ice_servers;
        console.log("Loaded ICE servers from backend:", iceServers.length);
      }
    } catch (error) {
      console.warn(
        "Failed to fetch ICE servers, using fallback STUN only:",
        error,
      );
    }

    const rtcConfig: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10, // Increase ICE candidate pool for better connectivity
    };
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setConnectionState(state);
      console.log("ICE connection state:", state);

      switch (state) {
        case "connected":
        case "completed":
          setCallStatus("connected");
          setIsConnecting(false);
          break;
        case "disconnected":
          console.log("Connection disconnected, attempting to reconnect...");
          break;
        case "failed":
          console.error("ICE connection failed");
          toast({
            title: "Connection Failed",
            description: "Failed to establish connection. Please try again.",
            variant: "destructive",
          });
          handleEndCall();
          break;
        case "closed":
          setCallStatus("ended");
          break;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        console.log(
          "📞 [WebRTC] Sending ICE candidate:",
          event.candidate.candidate.substring(0, 50) + "...",
        );
        sendWebRTCIceCandidate({
          type: "webrtc_ice",
          callId: callIdRef.current,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
          candidate: event.candidate.toJSON(),
        });
      } else if (!event.candidate) {
        console.log("📞 [WebRTC] ICE gathering complete (null candidate)");
      } else {
        console.warn(
          "📞 [WebRTC] ICE candidate generated but no callId available",
        );
      }
    };

    // In some browsers (Safari/iOS), you must set the remote description
    // before adding local tracks to guarantee bidirectional negotiation
    // is reflected in the first offer/answer. We already create
    // transceivers above, which also helps, but we keep this guard for safety.

    pc.ontrack = (event) => {
      console.log(
        "📞 [WebRTC] Received remote track:",
        event.track.kind,
        "from stream:",
        event.streams[0]?.id,
      );
      const el = remoteVideoRef.current;
      if (el && event.streams[0]) {
        try {
          console.log("📞 [WebRTC] Attaching remote stream to video element");
          el.srcObject = event.streams[0];
          // Autoplay safety: mute remote element initially and explicitly play
          if (el.muted !== true) el.muted = true;
          const playPromise = (el as any).play?.();
          if (playPromise && typeof playPromise.then === "function") {
            playPromise.catch((playErr: unknown) => {
              console.warn("📞 [WebRTC] Autoplay failed:", playErr);
            });
          }
          console.log("📞 [WebRTC] Remote stream attached successfully");
        } catch (e) {
          console.error(
            "📞 [WebRTC] Failed attaching/playing remote stream:",
            e,
          );
        }
      } else {
        console.warn(
          "📞 [WebRTC] No video element or stream available for remote track",
        );
      }
    };

    try {
      // Create transceivers up-front so offers/answers negotiate sendrecv even if tracks aren't ready yet
      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      } catch {}
      try {
        pc.addTransceiver("video", { direction: "sendrecv" });
      } catch {}

      // Try video + audio first
      let stream: MediaStream;
      try {
        console.log("📞 [WebRTC] Requesting video+audio media");
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log(
          "📞 [WebRTC] Got video+audio stream with",
          stream.getTracks().length,
          "tracks",
        );
      } catch (videoError) {
        console.warn(
          "📞 [WebRTC] Video permission denied, falling back to audio-only:",
          videoError,
        );
        // Fallback to audio-only
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        console.log(
          "📞 [WebRTC] Got audio-only stream with",
          stream.getTracks().length,
          "tracks",
        );
        setIsVideoOn(false);
        setIsAudioOnly(true);
        toast({
          title: "Audio-Only Call",
          description: "Camera access denied. Continuing with audio only.",
        });
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && !isAudioOnly) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("📞 [WebRTC] Adding local tracks to peer connection");
      stream.getTracks().forEach((track) => {
        console.log(
          "📞 [WebRTC] Adding track:",
          track.kind,
          "enabled:",
          track.enabled,
        );
        pc.addTrack(track, stream);
      });
    } catch (err) {
      console.error("getUserMedia error - no media access:", err);
      toast({
        title: "Media Access Denied",
        description:
          "Cannot access camera or microphone. Please check permissions.",
        variant: "destructive",
      });
      handleEndCall();
      return;
    }

    // Caller: wait for call_accept before creating and sending offer to ensure receiver is ready

    // Listen for signaling
    const onAnswer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("📞 [Caller] Received WebRTC answer:", detail);

      if (!callIdRef.current && detail.callId)
        callIdRef.current = detail.callId;
      const matches = detail.callId
        ? detail.callId === callIdRef.current
        : detail.matchId === matchId;
      if (!matches) {
        console.log("📞 [Caller] Answer doesn't match this call, ignoring");
        return;
      }

      if (detail.type === "webrtc_answer") {
        console.log("📞 [Caller] Processing WebRTC answer");
        pc.setRemoteDescription(new RTCSessionDescription(detail.sdp))
          .then(async () => {
            console.log(
              "📞 [Caller] Remote description (answer) set successfully",
            );
            remoteDescriptionSetRef.current = true;

            // Flush any ICE that arrived early
            if (pendingRemoteIceRef.current.length) {
              console.log(
                "📞 [Caller] Processing",
                pendingRemoteIceRef.current.length,
                "buffered ICE candidates",
              );
              try {
                for (const candidate of pendingRemoteIceRef.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
              } catch (iceErr) {
                console.warn("📞 [Caller] Some ICE candidates failed:", iceErr);
              }
              pendingRemoteIceRef.current = [];
            }
            console.log("📞 [Caller] Answer processing complete");
          })
          .catch((err) => {
            console.error(
              "📞 [Caller] setRemoteDescription(answer) failed:",
              err,
            );
          });
      }
    };
    const onOffer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log("📞 [Receiver] Received WebRTC offer:", detail);

      if (!callIdRef.current && detail.callId)
        callIdRef.current = detail.callId;
      const matches = detail.callId
        ? detail.callId === callIdRef.current
        : detail.matchId === matchId;
      if (!matches) {
        console.log("📞 [Receiver] Offer doesn't match this call, ignoring");
        return;
      }

      if (detail.type === "webrtc_offer") {
        // Guard: Only process the offer after the user accepts
        if (isIncoming && !hasAcceptedRef.current) {
          console.log("📞 [Receiver] Offer received before accept; buffering");
          pendingOfferDetailRef.current = detail;
          return;
        }
        console.log("📞 [Receiver] Processing WebRTC offer");
        pc.setRemoteDescription(new RTCSessionDescription(detail.sdp))
          .then(async () => {
            console.log("📞 [Receiver] Remote description set successfully");
            remoteDescriptionSetRef.current = true;

            // Flush any early ICE from caller
            if (pendingRemoteIceRef.current.length) {
              console.log(
                "📞 [Receiver] Processing",
                pendingRemoteIceRef.current.length,
                "buffered ICE candidates",
              );
              try {
                for (const candidate of pendingRemoteIceRef.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
              } catch (iceErr) {
                console.warn(
                  "📞 [Receiver] Some ICE candidates failed:",
                  iceErr,
                );
              }
              pendingRemoteIceRef.current = [];
            }

            // Ensure we have local tracks before answering
            if (
              !localStreamRef.current ||
              localStreamRef.current.getTracks().length === 0
            ) {
              console.log(
                "📞 [Receiver] Getting local media before creating answer",
              );
              try {
                const s = await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: true,
                });
                localStreamRef.current = s;
                if (localVideoRef.current) {
                  (localVideoRef.current as any).srcObject = s;
                }
                // Remove existing tracks and add new ones
                pc.getSenders().forEach((sender) => {
                  if (sender.track) pc.removeTrack(sender);
                });
                s.getTracks().forEach((t) => {
                  console.log("📞 [Receiver] Adding track:", t.kind);
                  pc.addTrack(t, s);
                });
                // Force sendrecv on video
                const videoTrack = s.getVideoTracks()[0];
                if (videoTrack) {
                  let videoSender = pc
                    .getSenders()
                    .find((snd) => snd.track && snd.track.kind === "video");
                  if (videoSender && videoSender.track !== videoTrack) {
                    try {
                      await videoSender.replaceTrack(videoTrack);
                    } catch {}
                  }
                  pc.getTransceivers().forEach((tr) => {
                    const isVideo =
                      (tr.sender &&
                        tr.sender.track &&
                        tr.sender.track.kind === "video") ||
                      (tr.receiver &&
                        tr.receiver.track &&
                        tr.receiver.track.kind === "video");
                    if (isVideo) tr.direction = "sendrecv";
                  });
                }
              } catch (videoErr) {
                console.warn(
                  "📞 [Receiver] Video failed, trying audio-only:",
                  videoErr,
                );
                // Fallback to audio only
                try {
                  const s = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true,
                  });
                  localStreamRef.current = s;
                  setIsAudioOnly(true);
                  setIsVideoOn(false);
                  s.getTracks().forEach((t) => {
                    console.log("📞 [Receiver] Adding audio track:", t.kind);
                    pc.addTrack(t, s);
                  });
                } catch (e) {
                  console.error(
                    "📞 [Receiver] getUserMedia failed completely:",
                    e,
                  );
                }
              }
            } else {
              console.log(
                "📞 [Receiver] Using existing local stream with",
                localStreamRef.current.getTracks().length,
                "tracks",
              );
              // Ensure video is actively sent
              try {
                const s = localStreamRef.current;
                const videoTrack = s?.getVideoTracks()[0];
                if (videoTrack) {
                  let videoSender = pc
                    .getSenders()
                    .find((snd) => snd.track && snd.track.kind === "video");
                  if (videoSender && videoSender.track !== videoTrack) {
                    await videoSender.replaceTrack(videoTrack);
                  } else if (!videoSender) {
                    pc.addTrack(videoTrack, s!);
                  }
                  pc.getTransceivers().forEach((tr) => {
                    const isVideo =
                      (tr.sender &&
                        tr.sender.track &&
                        tr.sender.track.kind === "video") ||
                      (tr.receiver &&
                        tr.receiver.track &&
                        tr.receiver.track.kind === "video");
                    if (isVideo) tr.direction = "sendrecv";
                  });
                }
              } catch {}
            }

            console.log("📞 [Receiver] Creating answer");
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log("📞 [Receiver] Sending WebRTC answer");
            sendWebRTCAnswer({
              type: "webrtc_answer",
              callId: detail.callId || callIdRef.current,
              matchId: detail.matchId,
              fromUserId: userId,
              toUserId: detail.fromUserId,
              sdp: answer,
            });
            console.log("📞 [Receiver] Answer sent successfully");
          })
          .catch((err) => {
            console.error(
              "📞 [Receiver] setRemoteDescription(offer) failed:",
              err,
            );
          });
      }
    };
    const onIce = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!callIdRef.current && detail.callId)
        callIdRef.current = detail.callId;
      const matches = detail.callId
        ? detail.callId === callIdRef.current
        : detail.matchId === matchId;
      if (!matches) return;

      if (detail.type === "webrtc_ice") {
        console.log(
          "📞 [WebRTC] Received ICE candidate, remoteDescSet:",
          remoteDescriptionSetRef.current,
        );
        if (remoteDescriptionSetRef.current) {
          pc.addIceCandidate(new RTCIceCandidate(detail.candidate))
            .then(() => {
              console.log("📞 [WebRTC] ICE candidate added successfully");
            })
            .catch((iceErr) => {
              console.warn(
                "📞 [WebRTC] ICE candidate failed, buffering:",
                iceErr,
              );
              // As a fallback, queue if it still fails (rare timing)
              pendingRemoteIceRef.current.push(detail.candidate);
            });
        } else {
          console.log(
            "📞 [WebRTC] Buffering ICE candidate until remote description is set",
          );
          // Queue until remoteDescription is applied
          pendingRemoteIceRef.current.push(detail.candidate);
        }
      }
    };
    window.addEventListener("call:answer", onAnswer as any);
    window.addEventListener("call:offer", onOffer as any);
    window.addEventListener("call:ice", onIce as any);
    // Note: accept is handled by the top-level listener with buffering

    // Cleanup listeners if component unmounts or re-inits
    return () => {
      window.removeEventListener("call:answer", onAnswer as any);
      window.removeEventListener("call:offer", onOffer as any);
      window.removeEventListener("call:ice", onIce as any);
      // accept listener removed in its own effect
    };

    // For incoming calls, wait for user to accept before sending call_accept
  };

  // If accept arrived before pc was ready, send the offer once ready
  useEffect(() => {
    if (!open || isIncoming) return;
    const pc = pcRef.current;
    const detail = acceptPendingRef.current;
    if (pc && detail && !offerSentRef.current) {
      console.log("📞 [Caller] Processing buffered accept");
      (async () => {
        try {
          setCallStatus("connecting");
          setIsConnecting(true);

          // Ensure we have local tracks before creating offer
          if (
            !localStreamRef.current ||
            localStreamRef.current.getTracks().length === 0
          ) {
            console.log("📞 [Caller] Getting media for buffered accept");
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
              // Remove existing tracks and add new ones
              pc.getSenders().forEach((sender) => {
                if (sender.track) pc.removeTrack(sender);
              });
              stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
              });
            } catch (mediaErr) {
              console.warn(
                "📞 [Caller] Media failed for buffered accept:",
                mediaErr,
              );
            }
          }

          if (!pc.localDescription) {
            console.log("📞 [Caller] Creating offer for buffered accept");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            offerSentRef.current = true;
            sendWebRTCOffer({
              type: "webrtc_offer",
              callId: detail.callId,
              matchId: detail.matchId ?? matchId,
              fromUserId: userId,
              toUserId: detail.fromUserId || receiverId,
              sdp: offer,
            });
            console.log("📞 [Caller] Buffered offer sent successfully");
          }
          acceptPendingRef.current = null;
        } catch (err) {
          console.error("📞 [Caller] Buffered accept → offer failed:", err);
        }
      })();
    }
  }, [open, isIncoming, matchId, userId, receiverId]);

  // Ensure local preview attaches when the in-call UI mounts (receiver case)
  useEffect(() => {
    if (open && localStreamRef.current && localVideoRef.current) {
      try {
        // Always bind the latest local stream to the video element when available
        if (
          (localVideoRef.current as any).srcObject !== localStreamRef.current
        ) {
          console.log("📞 [UI] Binding local stream to video element");
          (localVideoRef.current as any).srcObject = localStreamRef.current;
        }
      } catch (e) {
        console.warn("📞 [UI] Failed to bind local stream:", e);
      }
    }
  }, [open, callStatus]);

  // Receiver: when user accepts, process any buffered offer
  const processBufferedOfferIfAny = async () => {
    const detail = pendingOfferDetailRef.current;
    if (!detail) return;
    const pc = pcRef.current;
    if (!pc) return;
    try {
      console.log("📞 [Receiver] Processing buffered offer after accept");
      await pc.setRemoteDescription(new RTCSessionDescription(detail.sdp));
      remoteDescriptionSetRef.current = true;
      if (pendingRemoteIceRef.current.length) {
        try {
          for (const c of pendingRemoteIceRef.current)
            await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch {}
        pendingRemoteIceRef.current = [];
      }
      // Ensure local tracks exist
      if (
        !localStreamRef.current ||
        localStreamRef.current.getTracks().length === 0
      ) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStreamRef.current = s;
          if (localVideoRef.current)
            (localVideoRef.current as any).srcObject = s;
          pc.getSenders().forEach((sender) => {
            if (sender.track) pc.removeTrack(sender);
          });
          s.getTracks().forEach((t) => pc.addTrack(t, s));
          // Force sendrecv on video
          const videoTrack = s.getVideoTracks()[0];
          if (videoTrack) {
            let videoSender = pc
              .getSenders()
              .find((snd) => snd.track && snd.track.kind === "video");
            if (videoSender && videoSender.track !== videoTrack) {
              try {
                await videoSender.replaceTrack(videoTrack);
              } catch {}
            }
            pc.getTransceivers().forEach((tr) => {
              const isVideo =
                (tr.sender &&
                  tr.sender.track &&
                  tr.sender.track.kind === "video") ||
                (tr.receiver &&
                  tr.receiver.track &&
                  tr.receiver.track.kind === "video");
              if (isVideo) tr.direction = "sendrecv";
            });
          }
        } catch {
          try {
            const s = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            localStreamRef.current = s;
            setIsAudioOnly(true);
            setIsVideoOn(false);
            s.getTracks().forEach((t) => pc.addTrack(t, s));
          } catch {}
        }
      }
      // Ensure video track is active and direction is sendrecv even if we had existing stream
      try {
        const s = localStreamRef.current;
        const videoTrack = s?.getVideoTracks()[0];
        if (videoTrack) {
          let videoSender = pc
            .getSenders()
            .find((snd) => snd.track && snd.track.kind === "video");
          if (videoSender && videoSender.track !== videoTrack) {
            await videoSender.replaceTrack(videoTrack);
          } else if (!videoSender) {
            pc.addTrack(videoTrack, s!);
          }
          pc.getTransceivers().forEach((tr) => {
            const isVideo =
              (tr.sender &&
                tr.sender.track &&
                tr.sender.track.kind === "video") ||
              (tr.receiver &&
                tr.receiver.track &&
                tr.receiver.track.kind === "video");
            if (isVideo) tr.direction = "sendrecv";
          });
        }
      } catch {}
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendWebRTCAnswer({
        type: "webrtc_answer",
        callId: detail.callId || callIdRef.current,
        matchId: detail.matchId,
        fromUserId: userId,
        toUserId: detail.fromUserId,
        sdp: answer,
      });
      console.log("📞 [Receiver] Buffered answer sent successfully");
      pendingOfferDetailRef.current = null;
    } catch (err) {
      console.error("📞 [Receiver] Failed processing buffered offer:", err);
    }
  };

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Ringtones are managed by effect cleanup above
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

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Control actual audio track
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newMutedState;
      }
    }
  };

  const toggleVideo = () => {
    if (isAudioOnly) {
      toast({
        title: "Audio-Only Call",
        description: "Video is not available for this call.",
      });
      return;
    }

    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);

    // Control actual video track
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newVideoState;
      }
    }
  };

  // Format call timer display
  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = async () => {
    setCallStatus("ended");

    if (callId) {
      try {
        await apiRequest(`/api/video-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "completed" },
        });
        sendCallEnd({
          type: "call_end",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });

        // Invalidate any queries that might have this call data
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }

    cleanupMedia();
    cleanupTimers();
    onClose();
  };

  // Caller cancels while still ringing (no connection yet) → emit call_cancel
  const handleCancelCall = async () => {
    setCallStatus("ended");
    if (callId) {
      try {
        await apiRequest(`/api/video-calls/${callId}/status`, {
          method: "PATCH",
          data: { status: "declined" },
        });
        sendCallCancel({
          type: "call_cancel",
          callId,
          matchId,
          fromUserId: userId,
          toUserId: receiverId,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } catch (error) {
        console.error("Error canceling ringing call:", error);
      }
    }
    cleanupMedia();
    cleanupTimers();
    onClose();
  };

  // Remote side ended or declined: close locally without emitting again
  const handleRemoteClose = () => {
    setCallStatus("ended");
    cleanupMedia();
    cleanupTimers();
    onClose();
  };

  // Listen for remote end/decline and close this dialog
  useEffect(() => {
    if (!open) return;
    const onEnd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId !== callId) return;
      // Only react if the other party ended
      if (detail.fromUserId && detail.fromUserId !== userId) {
        handleRemoteClose();
      }
    };
    const onDecline = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.callId !== callId) return;
      if (detail.fromUserId && detail.fromUserId !== userId) {
        handleRemoteClose();
      }
    };
    window.addEventListener("call:end", onEnd as any);
    window.addEventListener("call:decline", onDecline as any);
    return () => {
      window.removeEventListener("call:end", onEnd as any);
      window.removeEventListener("call:decline", onDecline as any);
    };
  }, [open, callId, userId]);

  const handleDeclineCall = async () => {
    setCallStatus("ended");

    if (callId) {
      try {
        await apiRequest(`/api/video-calls/${callId}/status`, {
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

        // Invalidate any queries that might have this call data
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      } catch (error) {
        console.error("Error declining call:", error);
      }
    }

    cleanupMedia();
    cleanupTimers();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (!isIncoming && callStatus === "ringing") {
            handleCancelCall();
          } else {
            handleEndCall();
          }
        }
      }}
    >
      <DialogContent
        className={`${callStatus === "ringing" ? "sm:max-w-[100vw] w-[100vw] h-[100vh] p-0" : "sm:max-w-[800px] max-h-[90vh]"} overflow-hidden`}
      >
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

        {/* Main stage */}
        <div
          className={`${callStatus === "ringing" ? "relative w-screen h-[calc(100vh-4rem)]" : "relative w-full h-[60vh]"} bg-gray-900 rounded-md overflow-hidden`}
        >
          {callStatus === "ringing" ? (
            <div className="absolute inset-0">
              {/* Romantic gradient backdrop */}
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/40 via-fuchsia-500/30 to-indigo-500/30 blur-2xl" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                {/* Large avatar / placeholder for caller or callee */}
                <div className="w-40 h-40 rounded-full bg-white/10 border border-white/20 shadow-xl flex items-center justify-center backdrop-blur-md">
                  <div className="w-24 h-24 rounded-full bg-white/10 border border-white/30" />
                </div>
                <p className="mt-6 text-white/90 text-xl font-medium">
                  {isIncoming ? "Incoming call…" : "Calling…"}
                </p>

                {/* Caller self-preview in corner (if media available) */}
                {!isIncoming && (
                  <div className="absolute bottom-6 right-6 w-40 aspect-video bg-black/50 rounded-md overflow-hidden border border-white/20">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOn ? "" : "hidden"}`}
                    />
                    {!isVideoOn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800/70">
                        <VideoOff className="text-white" />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-10 flex items-center gap-4">
                  {isIncoming ? (
                    <>
                      <Button
                        variant="destructive"
                        onClick={handleDeclineCall}
                        className="h-12 px-6 rounded-full text-base"
                      >
                        Decline
                      </Button>
                      <Button
                        variant="default"
                        className="h-12 px-6 rounded-full text-base bg-green-600 hover:bg-green-700"
                        onClick={async () => {
                          console.log("📞 [Receiver] Accept button clicked");
                          hasAcceptedRef.current = true;
                          if (callTimeoutRef.current) {
                            clearTimeout(callTimeoutRef.current);
                            callTimeoutRef.current = null;
                          }
                          setCallStatus("connecting");

                          // Ensure we have local media before accepting
                          if (
                            !localStreamRef.current ||
                            localStreamRef.current.getTracks().length === 0
                          ) {
                            console.log(
                              "📞 [Receiver] Getting media before accepting call",
                            );
                            try {
                              const stream =
                                await navigator.mediaDevices.getUserMedia({
                                  video: true,
                                  audio: true,
                                });
                              localStreamRef.current = stream;
                              if (localVideoRef.current) {
                                localVideoRef.current.srcObject = stream;
                              }
                              // Add tracks to peer connection if it exists
                              const pc = pcRef.current;
                              if (pc) {
                                pc.getSenders().forEach((sender) => {
                                  if (sender.track) pc.removeTrack(sender);
                                });
                                stream.getTracks().forEach((track) => {
                                  console.log(
                                    "📞 [Receiver] Adding track on accept:",
                                    track.kind,
                                  );
                                  pc.addTrack(track, stream);
                                });
                              }
                            } catch (mediaErr) {
                              console.warn(
                                "📞 [Receiver] Failed to get media on accept:",
                                mediaErr,
                              );
                              // Continue anyway, might work with audio-only or existing stream
                            }
                          }

                          const targetCallId = callId || existingCallId;
                          if (targetCallId) {
                            console.log(
                              "📞 [Receiver] Sending call_accept for callId:",
                              targetCallId,
                            );
                            sendCallAccept({
                              type: "call_accept",
                              callId: targetCallId,
                              matchId,
                              fromUserId: userId,
                              toUserId: receiverId,
                            });
                          } else {
                            console.error(
                              "📞 [Receiver] No callId available for accept",
                            );
                          }

                          // If an offer was buffered before accept, process it now
                          setTimeout(() => {
                            processBufferedOfferIfAny();
                          }, 50);
                        }}
                      >
                        Accept
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={
                        callStatus === "ringing"
                          ? handleCancelCall
                          : handleEndCall
                      }
                      className="h-12 px-6 rounded-full text-base"
                    >
                      End Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : isConnecting ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-white">
                  {isIncoming ? "Connecting…" : "Starting call…"}
                </p>
                {connectionState !== "new" && (
                  <p className="mt-2 text-sm text-gray-300">
                    Connection: {connectionState}
                    {connectionState === "disconnected" && " - Reconnecting..."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Always render remote video once not connecting/ringing */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local preview: hide when audio-only or video toggled off */}
              <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-black rounded-md overflow-hidden border-2 border-gray-700">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOn && !isAudioOnly ? "" : "hidden"}`}
                />
                {(!isVideoOn || isAudioOnly) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="text-white" />
                  </div>
                )}
              </div>

              {/* If user is audio-only, show subtle badge instead of blocking remote video */}
              {isAudioOnly && (
                <div className="absolute top-4 right-4 bg-gray-900/70 text-white px-3 py-1 rounded-full text-xs">
                  Your camera is off
                </div>
              )}
            </>
          )}

          {!isConnecting &&
            callStatus !== "ringing" &&
            connectionState !== "connected" &&
            connectionState !== "completed" && (
              <div className="absolute top-4 left-4 bg-yellow-600 text-white px-3 py-1 rounded-full text-sm">
                {connectionState === "disconnected"
                  ? "Reconnecting..."
                  : `Connection: ${connectionState}`}
              </div>
            )}
        </div>

        <div className="flex justify-center space-x-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${isMuted ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${!isVideoOn ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video /> : <VideoOff />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full"
            onClick={
              isIncoming && callStatus === "ringing"
                ? handleDeclineCall
                : handleEndCall
            }
          >
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
