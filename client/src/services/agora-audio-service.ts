import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  ConnectionState,
  UID,
} from "agora-rtc-sdk-ng";

export interface AgoraAudioConfig {
  appId: string;
  token?: string;
  channel: string;
  uid?: UID;
}

export interface AudioCallParticipant {
  uid: UID;
  audioTrack?: IRemoteAudioTrack;
  hasAudio: boolean;
  isLocal: boolean;
}

export type AudioCallStatus = "connecting" | "connected" | "disconnected" | "failed" | "ended";

export type AgoraAudioCallEvents = {
  onStatusChange: (status: AudioCallStatus) => void;
  onParticipantJoined: (participant: AudioCallParticipant) => void;
  onParticipantLeft: (uid: UID) => void;
  onParticipantAudioSubscribed: (uid: UID, track: IRemoteAudioTrack) => void;
  onParticipantAudioUnsubscribed: (uid: UID, track: IRemoteAudioTrack) => void;
  onError: (error: Error) => void;
};

class AgoraAudioService {
  private client: IAgoraRTCClient;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private isJoined: boolean = false;
  private isJoining: boolean = false;
  private currentChannel: string | null = null;
  private events: Partial<AgoraAudioCallEvents> = {};
  private participants: Map<UID, AudioCallParticipant> = new Map();

  constructor() {
    // Initialize Agora client specifically for audio calls
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
      console.log(`[AgoraAudioService] Connection state changed from ${prevState} to ${newState}`);
      
      let status: AudioCallStatus;
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
      console.log(`[AgoraAudioService] 🎉 REMOTE USER ${user.uid} JOINED THE AUDIO CHANNEL!`);
      
      const participant: AudioCallParticipant = {
        uid: user.uid,
        hasAudio: false,
        isLocal: false,
      };
      
      this.participants.set(user.uid, participant);
      this.events.onParticipantJoined?.(participant);
      
      // Debug: Log all current participants
      console.log(`[AgoraAudioService] 👥 Total participants in audio call:`, this.participants.size);
      for (const [uid, p] of this.participants.entries()) {
        console.log(`[AgoraAudioService] 👤 Participant ${uid}: hasAudio=${p.hasAudio}, isLocal=${p.isLocal}`);
      }
    });

    // Handle remote users leaving
    this.client.on("user-left", (user, reason) => {
      console.log(`[AgoraAudioService] Remote user ${user.uid} left (${reason})`);
      this.participants.delete(user.uid);
      this.events.onParticipantLeft?.(user.uid);
    });

    // Handle remote user publishing audio
    this.client.on("user-published", async (user, mediaType) => {
      if (mediaType !== "audio") return; // Only handle audio for this service
      
      console.log(`[AgoraAudioService] Remote user ${user.uid} published audio`);
      
      try {
        // Subscribe to the remote user's audio track
        await this.client.subscribe(user, "audio");
        
        const participant = this.participants.get(user.uid);
        if (participant && user.audioTrack) {
          participant.audioTrack = user.audioTrack;
          participant.hasAudio = true;
          this.participants.set(user.uid, participant);
          
          // CRITICAL: Immediately play the audio track with proper settings
          console.log(`[AgoraAudioService] 🔊 Starting audio playback for user ${user.uid}`);
          try {
            // Set volume to ensure audio is audible
            user.audioTrack.setVolume(100);
            
            // Play the audio track immediately
            await user.audioTrack.play();
            console.log(`[AgoraAudioService] ✅ Successfully started audio playback for user ${user.uid}`);
          } catch (playError) {
            console.error(`[AgoraAudioService] ❌ Failed to play audio for user ${user.uid}:`, playError);
            
            // Handle browser autoplay policy
            const playErrorMsg = playError instanceof Error ? playError.message : String(playError);
            if (playErrorMsg.includes("autoplay") || playErrorMsg.includes("user interaction")) {
              console.warn(`[AgoraAudioService] ⚠️ Browser autoplay policy blocked audio. Audio will play after user interaction.`);
              // Store the track for later playback after user interaction
              (window as any).__pendingAudioTrack = user.audioTrack;
            } else {
              console.error(`[AgoraAudioService] 🔊 Audio playback error:`, playErrorMsg);
            }
          }
          
          this.events.onParticipantAudioSubscribed?.(user.uid, user.audioTrack);
        }
      } catch (error) {
        console.error(`[AgoraAudioService] Failed to subscribe to audio from user ${user.uid}:`, error);
        this.events.onError?.(error as Error);
      }
    });

    // Handle remote user unpublishing audio
    this.client.on("user-unpublished", (user, mediaType) => {
      if (mediaType !== "audio") return; // Only handle audio for this service
      
      console.log(`[AgoraAudioService] Remote user ${user.uid} unpublished audio`);
      
      const participant = this.participants.get(user.uid);
      if (participant && participant.audioTrack) {
        const track = participant.audioTrack;
        participant.audioTrack = undefined;
        participant.hasAudio = false;
        this.participants.set(user.uid, participant);
        
        this.events.onParticipantAudioUnsubscribed?.(user.uid, track);
      }
    });

    // Handle client exceptions
    this.client.on("exception", (evt) => {
      console.log(`[AgoraAudioService] Client exception: ${evt.code} - ${evt.msg}`);
      
      // Only treat critical errors as actual errors, warnings are just logged
      const criticalErrorCodes = [1001, 1002, 1005, 1006]; // Critical error codes
      const audioBitrateWarning = 2003; // SEND_AUDIO_BITRATE_TOO_LOW
      
      if (criticalErrorCodes.includes(evt.code)) {
        this.events.onError?.(new Error(`Agora audio client exception: ${evt.code} - ${evt.msg}`));
      } else if (evt.code === audioBitrateWarning) {
        // Audio bitrate warning is common and non-critical, just log it
        console.warn(`[AgoraAudioService] Audio bitrate warning (${evt.code}): ${evt.msg}`);
      } else {
        // Other non-critical warnings are just logged
        console.warn(`[AgoraAudioService] Non-critical warning: ${evt.code} - ${evt.msg}`);
      }
    });
  }

  // Set event handlers
  setEventHandlers(events: Partial<AgoraAudioCallEvents>): void {
    this.events = { ...this.events, ...events };
  }

  // Join an audio call
  async joinCall(config: AgoraAudioConfig): Promise<void> {
    try {
      console.log(`[AgoraAudioService] 🚀 STARTING AUDIO CALL JOIN PROCESS`);
      console.log(`[AgoraAudioService] 📋 Config - Channel: ${config.channel}, UID: ${config.uid}, AppId: ${config.appId.slice(0, 8)}...`);
      
      // Prevent multiple simultaneous join attempts
      if (this.isJoining) {
        console.log("[AgoraAudioService] ⚠️ Already joining an audio channel, skipping duplicate join");
        return;
      }

      if (this.isJoined) {
        console.log("[AgoraAudioService] ⚠️ Already joined to an audio channel, skipping duplicate join");
        return;
      }

      // Set joining flag immediately to prevent race conditions
      this.isJoining = true;
      console.log(`[AgoraAudioService] 🔄 Set joining flag to true, starting join sequence...`);

      try {
        // Cleanup any existing state
        if (this.isJoined || this.localAudioTrack) {
          console.log("[AgoraAudioService] 🔄 Cleaning up previous audio call state");
          this.isJoining = false; // Temporarily reset to allow cleanup
          await this.leaveCall();
          await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
          this.isJoining = true; // Reset joining flag
        }

        // Create audio track first
        await this.createLocalAudioTrack();

        // Join the channel
        const uid = await this.client.join(
          config.appId,
          config.channel,
          config.token || null,
          config.uid || null
        );

        console.log(`[AgoraAudioService] ✅ SUCCESSFULLY JOINED AUDIO CHANNEL with UID: ${uid}`);
        console.log(`[AgoraAudioService] 📡 Now listening for other participants to join channel: ${config.channel}`);
        
        this.isJoined = true;
        this.currentChannel = config.channel;

        // Publish the audio track
        await this.publishAudioTrack();
        
        console.log(`[AgoraAudioService] 🎤 Local audio publishing complete - waiting for remote participants...`);
        
      } finally {
        this.isJoining = false;
      }
      
    } catch (error) {
      console.error("[AgoraAudioService] Failed to join audio channel:", error);
      this.isJoining = false;
      
      // Enhanced error handling for join failures
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("cancel") || errorMessage.includes("OPERATION_ABORTED") || errorMessage.includes("WS_ABORT")) {
        console.log("[AgoraAudioService] 🚫 Audio call cancelled by user (normal operation)");
        // Don't trigger error handler for user cancellations
        return;
      } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
        console.error("[AgoraAudioService] 🌐 Network connection failure");
        this.events.onError?.(new Error("Network connection failed. Please check your internet connection."));
      } else if (errorMessage.includes("token") || errorMessage.includes("authentication")) {
        console.error("[AgoraAudioService] 🔐 Authentication failure");
        this.events.onError?.(new Error("Audio call authentication failed. Please try again."));
      } else {
        this.events.onError?.(error as Error);
      }
      
      // Always cleanup on join failure
      await this.cleanupAudioTrack();
      throw error;
    }
  }

  // Create local audio track
  async createLocalAudioTrack(enableAudio: boolean = true): Promise<void> {
    try {
      console.log(`[AgoraAudioService] Creating local audio track (audio: ${enableAudio})`);

      if (enableAudio && !this.localAudioTrack) {
        // Create audio track with high quality settings
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

      console.log("[AgoraAudioService] Local audio track created successfully");
    } catch (error) {
      console.error("[AgoraAudioService] Failed to create local audio track:", error);
      
      // Enhanced error handling for common failures
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        console.error("[AgoraAudioService] 🚫 Microphone permission denied");
        this.events.onError?.(new Error("Microphone permission is required for audio calls"));
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("DeviceNotFoundError")) {
        console.error("[AgoraAudioService] 📱 Microphone device not found");
        this.events.onError?.(new Error("Microphone device not found"));
      } else {
        this.events.onError?.(error as Error);
      }
      
      await this.cleanupAudioTrack();
      throw error;
    }
  }

  // Publish local audio track
  async publishAudioTrack(): Promise<void> {
    try {
      if (!this.isJoined) {
        console.error("[AgoraAudioService] Cannot publish audio track - not joined to channel yet");
        throw new Error("Cannot publish audio track - not joined to channel");
      }

      if (this.localAudioTrack) {
        console.log("[AgoraAudioService] 📢 Publishing local audio track...");
        await this.client.publish(this.localAudioTrack);
        console.log("[AgoraAudioService] ✅ Successfully published local audio track");
        
        // Debug: Check microphone is active
        const isEnabled = this.localAudioTrack.enabled;
        const volume = this.localAudioTrack.getVolumeLevel();
        console.log(`[AgoraAudioService] 🎤 Local mic status: enabled=${isEnabled}, volume=${volume}`);
      } else {
        console.warn("[AgoraAudioService] ⚠️ No local audio track to publish - microphone not available");
      }
    } catch (error) {
      console.error("[AgoraAudioService] ❌ Failed to publish local audio track:", error);
      if (!this.isJoining) {
        this.events.onError?.(error as Error);
        throw error;
      }
    }
  }

  // Toggle audio on/off
  async toggleAudio(enable?: boolean): Promise<boolean> {
    try {
      if (!this.localAudioTrack) {
        if (enable === false) return false;
        
        // Create audio track if it doesn't exist
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: {
            sampleRate: 48000,
            stereo: true,
            bitrate: 128,
          },
          ANS: true,
          AEC: true,
          AGC: true,
        });
        if (this.isJoined) {
          await this.client.publish(this.localAudioTrack);
        }
        return true;
      }

      const shouldEnable = enable !== undefined ? enable : !this.localAudioTrack.enabled;
      await this.localAudioTrack.setEnabled(shouldEnable);
      
      console.log(`[AgoraAudioService] Audio ${shouldEnable ? "enabled" : "disabled"}`);
      return shouldEnable;
    } catch (error) {
      console.error("[AgoraAudioService] Failed to toggle audio:", error);
      this.events.onError?.(error as Error);
      return false;
    }
  }

  // Get local audio track
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  // Get all participants
  getParticipants(): AudioCallParticipant[] {
    return Array.from(this.participants.values());
  }

  // Get specific participant
  getParticipant(uid: UID): AudioCallParticipant | undefined {
    return this.participants.get(uid);
  }

  // Check if currently in an audio call
  isInCall(): boolean {
    return this.isJoined;
  }

  // Get current channel
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  // Cleanup audio track on failure
  private async cleanupAudioTrack(): Promise<void> {
    console.log("[AgoraAudioService] 🧹 Cleaning up audio track");
    
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.close();
        console.log("[AgoraAudioService] 🎤 Closed audio track (microphone turned off)");
      } catch (error) {
        console.error("[AgoraAudioService] Error closing audio track:", error);
      }
      this.localAudioTrack = null;
    }
  }

  // Leave the current audio call
  async leaveCall(): Promise<void> {
    try {
      console.log(`[AgoraAudioService] Leaving audio call... (isJoined: ${this.isJoined}, isJoining: ${this.isJoining})`);

      // Always try to leave the client
      try {
        await this.client.leave();
        console.log("[AgoraAudioService] ✅ Successfully left Agora audio client");
      } catch (clientError) {
        // Ignore "not joined" errors - this is expected for cleanup calls
        const errorMsg = clientError instanceof Error ? clientError.message : String(clientError);
        if (!errorMsg.includes("not joined") && !errorMsg.includes("INVALID_OPERATION")) {
          console.error("[AgoraAudioService] Error leaving audio client:", clientError);
        } else {
          console.log("[AgoraAudioService] Audio client was already left (expected for cleanup)");
        }
      }

      // Reset all state
      this.isJoined = false;
      this.isJoining = false;
      this.currentChannel = null;

      // Close and cleanup local audio track
      if (this.localAudioTrack) {
        console.log("[AgoraAudioService] 🎤 Closing microphone (audio track)");
        try {
          this.localAudioTrack.close();
        } catch (error) {
          console.error("[AgoraAudioService] Error closing audio track:", error);
        }
        this.localAudioTrack = null;
      }

      // Clear participants
      this.participants.clear();

      console.log("[AgoraAudioService] Successfully left audio call and reset all state");
      this.events.onStatusChange?.("ended");
    } catch (error) {
      console.error("[AgoraAudioService] Failed to leave audio call:", error);
      
      // Even if leave fails, force reset state to prevent stuck state
      this.isJoined = false;
      this.isJoining = false;
      this.currentChannel = null;
      
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  // Retry audio playback (for browser autoplay policy)
  async retryAudioPlayback(): Promise<void> {
    console.log("[AgoraAudioService] 🔄 Retrying audio playback for all participants");
    
    for (const [uid, participant] of this.participants.entries()) {
      if (participant.audioTrack && participant.hasAudio) {
        try {
          await participant.audioTrack.play();
          console.log(`[AgoraAudioService] ✅ Successfully retried audio playback for user ${uid}`);
        } catch (error) {
          console.error(`[AgoraAudioService] ❌ Still cannot play audio for user ${uid}:`, error);
        }
      }
    }

    // Also try any pending track stored by browser autoplay policy
    const pendingTrack = (window as any).__pendingAudioTrack;
    if (pendingTrack) {
      try {
        await pendingTrack.play();
        console.log("[AgoraAudioService] ✅ Successfully played pending audio track");
        delete (window as any).__pendingAudioTrack;
      } catch (error) {
        console.error("[AgoraAudioService] ❌ Still cannot play pending audio track:", error);
      }
    }
  }

  // Force stop all microphone access
  forceStopAllMedia(): void {
    console.log("[AgoraAudioService] 🚨 Force stopping ALL microphone access");
    
    if (this.localAudioTrack) {
      try {
        // Get the underlying MediaStreamTrack and stop it directly
        const mediaStreamTrack = this.localAudioTrack.getMediaStreamTrack();
        if (mediaStreamTrack) {
          mediaStreamTrack.stop();
          console.log("[AgoraAudioService] 🎤 STOPPED underlying microphone MediaStreamTrack - mic access RELEASED NOW");
        }
        this.localAudioTrack.close();
        console.log("[AgoraAudioService] 🎤 CLOSED Agora audio track");
      } catch (error) {
        console.error("[AgoraAudioService] Error force closing microphone:", error);
      }
      this.localAudioTrack = null;
    }

    console.log("[AgoraAudioService] ✅ HARDWARE microphone access TERMINATED");
  }

  // Destroy the audio service
  async destroy(): Promise<void> {
    try {
      if (this.isJoined) {
        await this.leaveCall();
      }

      this.events = {};
      console.log("[AgoraAudioService] Audio service destroyed");
    } catch (error) {
      console.error("[AgoraAudioService] Failed to destroy audio service:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance for audio calls
export const agoraAudioService = new AgoraAudioService();

// Export the class for advanced usage
export { AgoraAudioService };
