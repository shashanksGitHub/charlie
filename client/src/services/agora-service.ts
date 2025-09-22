import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  ConnectionState,
  UID,
  ILocalVideoTrack,
  ILocalAudioTrack,
} from "agora-rtc-sdk-ng";

export interface AgoraConfig {
  appId: string;
  token?: string;
  channel: string;
  uid?: UID;
}

export interface CallParticipant {
  uid: UID;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
  hasVideo: boolean;
  hasAudio: boolean;
  isLocal: boolean;
}

export type CallStatus = "connecting" | "connected" | "disconnected" | "failed" | "ended";

export type AgoraCallEvents = {
  onStatusChange: (status: CallStatus) => void;
  onParticipantJoined: (participant: CallParticipant) => void;
  onParticipantLeft: (uid: UID) => void;
  onParticipantTrackSubscribed: (uid: UID, track: IRemoteVideoTrack | IRemoteAudioTrack) => void;
  onParticipantTrackUnsubscribed: (uid: UID, track: IRemoteVideoTrack | IRemoteAudioTrack) => void;
  onError: (error: Error) => void;
};

class AgoraService {
  private client: IAgoraRTCClient;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private isJoined: boolean = false;
  private isJoining: boolean = false;
  private currentChannel: string | null = null;
  private events: Partial<AgoraCallEvents> = {};
  private participants: Map<UID, CallParticipant> = new Map();

  constructor() {
    // Initialize Agora client with proper configuration
    this.client = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
      role: "host"
    });

    this.setupClientEvents();
  }

  private setupClientEvents(): void {
    // Handle connection state changes
    this.client.on("connection-state-change", (newState, prevState) => {
      console.log(`[AgoraService] Connection state changed from ${prevState} to ${newState}`);
      
      let status: CallStatus;
      switch (newState) {
        case "CONNECTING":
          status = "connecting";
          break;
        case "CONNECTED":
          status = "connected";
          break;
        case "DISCONNECTED":
          status = "disconnected";
          break;
        case "DISCONNECTING":
          status = "disconnected";
          break;
        default:
          status = "failed";
      }
      
      this.events.onStatusChange?.(status);
    });

    // Handle remote users joining
    this.client.on("user-joined", async (user) => {
      console.log(`[AgoraService] Remote user ${user.uid} joined`);
      
      const participant: CallParticipant = {
        uid: user.uid,
        hasVideo: false,
        hasAudio: false,
        isLocal: false,
      };
      
      this.participants.set(user.uid, participant);
      this.events.onParticipantJoined?.(participant);
    });

    // Handle remote users leaving
    this.client.on("user-left", (user, reason) => {
      console.log(`[AgoraService] Remote user ${user.uid} left (${reason})`);
      this.participants.delete(user.uid);
      this.events.onParticipantLeft?.(user.uid);
    });

    // Handle remote user publishing tracks
    this.client.on("user-published", async (user, mediaType) => {
      console.log(`[AgoraService] Remote user ${user.uid} published ${mediaType}`);
      
      try {
        // Subscribe to the remote user's track
        await this.client.subscribe(user, mediaType);
        
        const participant = this.participants.get(user.uid);
        if (participant) {
          if (mediaType === "video") {
            participant.videoTrack = user.videoTrack;
            participant.hasVideo = true;
          } else if (mediaType === "audio") {
            participant.audioTrack = user.audioTrack;
            participant.hasAudio = true;
          }
          
          this.participants.set(user.uid, participant);
          
          const track = mediaType === "video" ? user.videoTrack : user.audioTrack;
          if (track) {
            this.events.onParticipantTrackSubscribed?.(user.uid, track);
          }
        }
      } catch (error) {
        console.error(`[AgoraService] Failed to subscribe to ${mediaType} from user ${user.uid}:`, error);
        this.events.onError?.(error as Error);
      }
    });

    // Handle remote user unpublishing tracks
    this.client.on("user-unpublished", (user, mediaType) => {
      console.log(`[AgoraService] Remote user ${user.uid} unpublished ${mediaType}`);
      
      const participant = this.participants.get(user.uid);
      if (participant) {
        const track = mediaType === "video" ? participant.videoTrack : participant.audioTrack;
        
        if (mediaType === "video") {
          participant.videoTrack = undefined;
          participant.hasVideo = false;
        } else if (mediaType === "audio") {
          participant.audioTrack = undefined;
          participant.hasAudio = false;
        }
        
        this.participants.set(user.uid, participant);
        
        if (track) {
          this.events.onParticipantTrackUnsubscribed?.(user.uid, track);
        }
      }
    });

    // Handle client exceptions
    this.client.on("exception", (evt) => {
      console.log(`[AgoraService] Client exception: ${evt.code} - ${evt.msg}`);
      
      // Only treat critical errors as actual errors, warnings are just logged
      const criticalErrorCodes = [1001, 1002, 1005, 1006]; // Critical error codes
      const audioBitrateWarning = 2003; // SEND_AUDIO_BITRATE_TOO_LOW
      
      if (criticalErrorCodes.includes(evt.code)) {
        this.events.onError?.(new Error(`Agora client exception: ${evt.code} - ${evt.msg}`));
      } else if (evt.code === audioBitrateWarning) {
        // Audio bitrate warning is common and non-critical, just log it
        console.warn(`[AgoraService] Audio bitrate warning (${evt.code}): ${evt.msg}`);
      } else {
        // Other non-critical warnings are just logged
        console.warn(`[AgoraService] Non-critical warning: ${evt.code} - ${evt.msg}`);
      }
    });
  }

  // Set event handlers
  setEventHandlers(events: Partial<AgoraCallEvents>): void {
    this.events = { ...this.events, ...events };
  }

  // Join a call
  async joinCall(config: AgoraConfig): Promise<void> {
    try {
      console.log(`[AgoraService] Joining channel: ${config.channel}`);
      
      // Prevent multiple simultaneous join attempts
      if (this.isJoining) {
        console.log("[AgoraService] Already joining a channel, skipping duplicate join");
        return;
      }

      // Leave existing call if already joined
      if (this.isJoined) {
        console.log("[AgoraService] Leaving existing call before joining new one");
        await this.leaveCall();
      }

      console.log(`[AgoraService] Starting fresh join - isJoined: ${this.isJoined}, isJoining: ${this.isJoining}`);

      this.isJoining = true;

      try {
        // Create local tracks first (before joining)
        await this.createLocalTracks();

        // Join the channel
        const uid = await this.client.join(
          config.appId,
          config.channel,
          config.token || null,
          config.uid || null
        );

        console.log(`[AgoraService] Successfully joined channel with UID: ${uid}`);
        
        // CRITICAL: Set isJoined IMMEDIATELY after successful join, before publishing
        this.isJoined = true;
        this.currentChannel = config.channel;

        console.log(`[AgoraService] Channel join confirmed - isJoined: ${this.isJoined}, channel: ${this.currentChannel}`);

        // Wait a moment for connection to stabilize, then publish tracks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`[AgoraService] About to publish tracks - isJoined: ${this.isJoined}`);
        await this.publishLocalTracks();
        
      } finally {
        this.isJoining = false;
        console.log(`[AgoraService] Join attempt completed - isJoined: ${this.isJoined}, isJoining: ${this.isJoining}`);
      }
      
    } catch (error) {
      console.error("[AgoraService] Failed to join channel:", error);
      this.isJoining = false;
      // Ensure we're in a clean state after failure
      this.isJoined = false;
      this.currentChannel = null;
      
      // Enhanced error handling for join failures
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
        console.error("[AgoraService] 🌐 Network connection failure");
        this.events.onError?.(new Error("Network connection failed. Please check your internet connection."));
      } else if (errorMessage.includes("token") || errorMessage.includes("authentication")) {
        console.error("[AgoraService] 🔐 Authentication failure");
        this.events.onError?.(new Error("Call authentication failed. Please try again."));
      } else {
        this.events.onError?.(error as Error);
      }
      
      // Always cleanup on join failure
      await this.cleanupPartialTracks();
      throw error;
    }
  }

  // Create local audio and video tracks
  async createLocalTracks(enableVideo: boolean = true, enableAudio: boolean = true): Promise<void> {
    try {
      console.log(`[AgoraService] Creating local tracks (video: ${enableVideo}, audio: ${enableAudio})`);

      if (enableAudio && !this.localAudioTrack) {
        // Create audio track with higher quality settings
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: {
            sampleRate: 48000,
            stereo: true,
            bitrate: 128,
          },
          ANS: true, // Automatic Noise Suppression
          AEC: true, // Acoustic Echo Cancellation
          AGC: true, // Automatic Gain Control
        });
      }

      if (enableVideo && !this.localVideoTrack) {
        // Create video track with better quality settings
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 400,
            bitrateMax: 1000,
          },
        });
      }

      console.log("[AgoraService] Local tracks created successfully");
    } catch (error) {
      console.error("[AgoraService] Failed to create local tracks:", error);
      
      // Enhanced error handling for common failures
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        console.error("[AgoraService] 🚫 Camera/microphone permission denied");
        this.events.onError?.(new Error("Camera and microphone permissions are required for video calls"));
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("DeviceNotFoundError")) {
        console.error("[AgoraService] 📱 Camera/microphone device not found");
        this.events.onError?.(new Error("Camera or microphone device not found"));
      } else {
        this.events.onError?.(error as Error);
      }
      
      // Always cleanup any partially created tracks on failure
      await this.cleanupPartialTracks();
      throw error;
    }
  }

  // Publish local tracks
  async publishLocalTracks(): Promise<void> {
    try {
      console.log(`[AgoraService] publishLocalTracks called - isJoined: ${this.isJoined}, isJoining: ${this.isJoining}, channel: ${this.currentChannel}`);
      
      // Check if we're actually joined before publishing
      if (!this.isJoined) {
        console.error(`[AgoraService] Cannot publish tracks - not joined to channel yet (isJoined: ${this.isJoined})`);
        throw new Error("Cannot publish tracks - not joined to channel");
      }

      const tracks = [];
      
      if (this.localVideoTrack) {
        console.log("[AgoraService] Adding video track to publish list");
        tracks.push(this.localVideoTrack);
      }
      
      if (this.localAudioTrack) {
        console.log("[AgoraService] Adding audio track to publish list");
        tracks.push(this.localAudioTrack);
      }

      if (tracks.length > 0) {
        console.log(`[AgoraService] Publishing ${tracks.length} local tracks...`);
        await this.client.publish(tracks);
        console.log(`[AgoraService] ✅ Successfully published ${tracks.length} local tracks`);
      } else {
        console.log("[AgoraService] No local tracks to publish");
      }
    } catch (error) {
      console.error("[AgoraService] Failed to publish local tracks:", error);
      // Don't throw error here during join process - let join complete
      if (!this.isJoining) {
        this.events.onError?.(error as Error);
        throw error;
      }
    }
  }

  // Toggle video on/off
  async toggleVideo(enable?: boolean): Promise<boolean> {
    try {
      if (!this.localVideoTrack) {
        if (enable === false) return false;
        
        // Create video track if it doesn't exist with high quality settings
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 400,
            bitrateMax: 1000,
          },
        });
        if (this.isJoined) {
          await this.client.publish(this.localVideoTrack);
        }
        return true;
      }

      const shouldEnable = enable !== undefined ? enable : !this.localVideoTrack.enabled;
      await this.localVideoTrack.setEnabled(shouldEnable);
      
      console.log(`[AgoraService] Video ${shouldEnable ? "enabled" : "disabled"}`);
      return shouldEnable;
    } catch (error) {
      console.error("[AgoraService] Failed to toggle video:", error);
      this.events.onError?.(error as Error);
      return false;
    }
  }

  // Toggle audio on/off
  async toggleAudio(enable?: boolean): Promise<boolean> {
    try {
      if (!this.localAudioTrack) {
        if (enable === false) return false;
        
        // Create audio track if it doesn't exist with high quality settings
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: {
            sampleRate: 48000,
            stereo: true,
            bitrate: 128,
          },
          ANS: true, // Automatic Noise Suppression
          AEC: true, // Acoustic Echo Cancellation
          AGC: true, // Automatic Gain Control
        });
        if (this.isJoined) {
          await this.client.publish(this.localAudioTrack);
        }
        return true;
      }

      const shouldEnable = enable !== undefined ? enable : !this.localAudioTrack.enabled;
      await this.localAudioTrack.setEnabled(shouldEnable);
      
      console.log(`[AgoraService] Audio ${shouldEnable ? "enabled" : "disabled"}`);
      return shouldEnable;
    } catch (error) {
      console.error("[AgoraService] Failed to toggle audio:", error);
      this.events.onError?.(error as Error);
      return false;
    }
  }

  // Get local video track
  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  // Get local audio track
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  // Get all participants
  getParticipants(): CallParticipant[] {
    return Array.from(this.participants.values());
  }

  // Get specific participant
  getParticipant(uid: UID): CallParticipant | undefined {
    return this.participants.get(uid);
  }

  // Check if currently in a call
  isInCall(): boolean {
    return this.isJoined;
  }

  // Get current channel
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  // Cleanup partially created tracks on failure
  private async cleanupPartialTracks(): Promise<void> {
    console.log("[AgoraService] 🧹 Cleaning up partially created tracks");
    
    if (this.localVideoTrack) {
      try {
        this.localVideoTrack.close();
        console.log("[AgoraService] 📹 Closed partial video track");
      } catch (error) {
        console.error("[AgoraService] Error closing partial video track:", error);
      }
      this.localVideoTrack = null;
    }

    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.close();
        console.log("[AgoraService] 🎤 Closed partial audio track");
      } catch (error) {
        console.error("[AgoraService] Error closing partial audio track:", error);
      }
      this.localAudioTrack = null;
    }
  }

  // Leave the current call
  async leaveCall(): Promise<void> {
    try {
      console.log("[AgoraService] Leaving call...");

      if (this.isJoined) {
        await this.client.leave();
        this.isJoined = false;
        this.currentChannel = null;
      }

      // Reset joining state
      this.isJoining = false;

      // Close and cleanup local tracks (camera and microphone)
      if (this.localVideoTrack) {
        console.log("[AgoraService] 📹 Closing camera (video track)");
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.localAudioTrack) {
        console.log("[AgoraService] 🎤 Closing microphone (audio track)");
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      // Clear participants
      this.participants.clear();

      console.log("[AgoraService] Successfully left call");
      this.events.onStatusChange?.("ended");
    } catch (error) {
      console.error("[AgoraService] Failed to leave call:", error);
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  // Destroy the service
  async destroy(): Promise<void> {
    try {
      if (this.isJoined) {
        await this.leaveCall();
      }

      this.events = {};
      console.log("[AgoraService] Service destroyed");
    } catch (error) {
      console.error("[AgoraService] Failed to destroy service:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const agoraService = new AgoraService();

// Export the class for advanced usage
export { AgoraService }; 