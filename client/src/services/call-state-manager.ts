/**
 * Simple global call state manager to prevent conflicts between incoming and outgoing calls
 */

interface CallState {
  isInCall: boolean;
  callType: "audio" | "video" | null;
  callId: number | null;
  isOutgoing: boolean;
}

class CallStateManager {
  private state: CallState = {
    isInCall: false,
    callType: null,
    callId: null,
    isOutgoing: false,
  };

  private listeners: Array<(state: CallState) => void> = [];

  setCallActive(callType: "audio" | "video", callId: number, isOutgoing: boolean = false) {
    console.log(`📞 [CallStateManager] Setting call active: ${callType} call ${callId} (outgoing: ${isOutgoing})`);
    this.state = {
      isInCall: true,
      callType,
      callId,
      isOutgoing,
    };
    this.notifyListeners();
  }

  setCallInactive() {
    console.log(`📞 [CallStateManager] Setting call inactive (was: ${this.state.callType} call ${this.state.callId})`);
    this.state = {
      isInCall: false,
      callType: null,
      callId: null,
      isOutgoing: false,
    };
    this.notifyListeners();
  }

  getState(): CallState {
    return { ...this.state };
  }

  isInCall(): boolean {
    return this.state.isInCall;
  }

  isInOutgoingCall(): boolean {
    return this.state.isInCall && this.state.isOutgoing;
  }

  canAcceptIncomingCall(incomingCallId: number): boolean {
    // Can't accept if already in an outgoing call
    if (this.isInOutgoingCall()) {
      console.log(`📞 [CallStateManager] Cannot accept incoming call ${incomingCallId} - already in outgoing ${this.state.callType} call ${this.state.callId}`);
      return false;
    }
    
    // Can accept if no call is active or if it's the same call ID (duplicate message)
    const canAccept = !this.state.isInCall || this.state.callId === incomingCallId;
    if (!canAccept) {
      console.log(`📞 [CallStateManager] Cannot accept incoming call ${incomingCallId} - already handling call ${this.state.callId}`);
    }
    return canAccept;
  }

  subscribe(listener: (state: CallState) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Export singleton instance
export const callStateManager = new CallStateManager();

// Make it available globally for debugging
(window as any).__callStateManager = callStateManager;
