// Add global type declarations
declare module '*.mp3';
declare module '*.gif';
declare module '*.wav';
declare module '*.png';
declare module '*.svg';
declare module '@assets/*';

// Global window augmentation
interface Window {
  // Message deduplication system
  __seenMessageIds: Set<number>;
  __messageDeduplicationEnabled: boolean;
  __lastKnownDuplicateMessageId?: number;
  
  // Nationality demonym mapping for global access
  __nationalities?: Record<string, string>;
}