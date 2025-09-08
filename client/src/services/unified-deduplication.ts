// Unified Message Deduplication Service
// Replaces 4 different deduplication systems with single centralized approach

interface MessageFingerprint {
  id: number;
  content: string;
  senderId: number;
  matchId: number;
  timestamp: number;
  hash: string;
}

class UnifiedDeduplicationService {
  private processedMessages = new Map<number, MessageFingerprint>();
  private contentHashes = new Set<string>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanupProcess();
  }

  // Generate content hash for fuzzy matching
  private generateContentHash(content: string, senderId: number, matchId: number): string {
    const normalized = content.trim().toLowerCase();
    return `${senderId}_${matchId}_${normalized.substring(0, 50)}`;
  }

  // Check if message is duplicate
  public isDuplicate(
    messageId: number,
    content: string,
    senderId: number,
    matchId: number
  ): boolean {
    // Check by ID first (fastest)
    if (this.processedMessages.has(messageId)) {
      return true;
    }

    // Check by content hash (fuzzy matching)
    const contentHash = this.generateContentHash(content, senderId, matchId);
    if (this.contentHashes.has(contentHash)) {
      console.log(`[UNIFIED-DEDUP] Duplicate detected by content hash: ${contentHash}`);
      return true;
    }

    return false;
  }

  // Public method to check if message ID exists
  public hasMessage(messageId: number): boolean {
    return this.processedMessages.has(messageId);
  }

  // Mark message as processed
  public markAsProcessed(
    messageId: number,
    content: string,
    senderId: number,
    matchId: number
  ): void {
    const contentHash = this.generateContentHash(content, senderId, matchId);
    const fingerprint: MessageFingerprint = {
      id: messageId,
      content,
      senderId,
      matchId,
      timestamp: Date.now(),
      hash: contentHash
    };

    this.processedMessages.set(messageId, fingerprint);
    this.contentHashes.add(contentHash);
  }

  // Remove message from tracking (for undo operations)
  public removeFromTracking(messageId: number): void {
    const fingerprint = this.processedMessages.get(messageId);
    if (fingerprint) {
      this.processedMessages.delete(messageId);
      this.contentHashes.delete(fingerprint.hash);
    }
  }

  // Clear old entries to prevent memory leaks
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes

      for (const [id, fingerprint] of this.processedMessages.entries()) {
        if (now - fingerprint.timestamp > maxAge) {
          this.processedMessages.delete(id);
          this.contentHashes.delete(fingerprint.hash);
        }
      }
    }, 60000); // Cleanup every minute
  }

  // Get statistics for debugging
  public getStats() {
    return {
      processedCount: this.processedMessages.size,
      hashCount: this.contentHashes.size,
      memoryUsage: JSON.stringify([...this.processedMessages.values()]).length
    };
  }

  // Cleanup on service destruction
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.processedMessages.clear();
    this.contentHashes.clear();
  }
}

// Export singleton instance
export const unifiedDeduplication = new UnifiedDeduplicationService();

// Export for backward compatibility
export const isMessageProcessed = (messageId: number): boolean => {
  return unifiedDeduplication.hasMessage(messageId);
};

export const markMessageProcessed = (
  messageId: number,
  content: string,
  senderId: number,
  matchId: number
): void => {
  unifiedDeduplication.markAsProcessed(messageId, content, senderId, matchId);
};

export const isMessageDuplicate = (
  messageId: number,
  content: string,
  senderId: number,
  matchId: number
): boolean => {
  return unifiedDeduplication.isDuplicate(messageId, content, senderId, matchId);
};