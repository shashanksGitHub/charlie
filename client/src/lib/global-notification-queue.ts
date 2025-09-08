/**
 * Global Notification Queue System
 * 
 * This system provides instant, real-time notifications across all pages,
 * similar to social media platforms. Notifications are queued, persisted,
 * and displayed immediately regardless of which page the user is on.
 */

export interface QueuedNotification {
  id: string;
  type: 'networking_like' | 'networking_match' | 'mentorship_like' | 'mentorship_match' | 'job_application';
  data: any;
  timestamp: number;
  processed: boolean;
  displayOnPage?: string; // Optional: specific page to display on
}

interface NotificationHandler {
  type: string;
  handler: (notification: QueuedNotification) => void;
  persistent?: boolean; // Whether to keep handler active across page changes
}

class GlobalNotificationQueue {
  private queue: QueuedNotification[] = [];
  private handlers: Map<string, NotificationHandler[]> = new Map();
  private processedIds: Set<string> = new Set();
  private persistentStorageKey = 'global_notification_queue';
  private toastDisplayed: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupStorageSync();
    this.setupPageVisibilityHandler();
    console.log('[NOTIFICATION-QUEUE] Global notification queue initialized');
    
    // Initialize the notification queue logging
    const stats = this.getStats();
    console.log('[NOTIFICATION-QUEUE] Initial queue stats:', stats);
  }

  /**
   * Add a notification to the queue
   */
  addNotification(notification: Omit<QueuedNotification, 'id' | 'timestamp' | 'processed'>): void {
    const queuedNotification: QueuedNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      processed: false,
      ...notification
    };

    // Avoid duplicates by checking recent notifications
    const isDuplicate = this.queue.some(existing => 
      existing.type === queuedNotification.type &&
      existing.data?.fromUserId === queuedNotification.data?.fromUserId &&
      existing.data?.targetUserId === queuedNotification.data?.targetUserId &&
      (Date.now() - existing.timestamp) < 5000 // Within 5 seconds
    );

    if (isDuplicate) {
      console.log('[NOTIFICATION-QUEUE] Duplicate notification detected, skipping');
      return;
    }

    this.queue.unshift(queuedNotification); // Add to front for newest-first
    this.saveToStorage();
    
    console.log('[NOTIFICATION-QUEUE] Added notification:', queuedNotification);
    
    // Process immediately
    this.processNotification(queuedNotification);
    
    // Clean old notifications (keep last 50)
    if (this.queue.length > 50) {
      this.queue = this.queue.slice(0, 50);
      this.saveToStorage();
    }
  }

  /**
   * Register a handler for specific notification types
   */
  registerHandler(type: string, handler: (notification: QueuedNotification) => void, persistent = false): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    
    this.handlers.get(type)!.push({ type, handler, persistent });
    console.log(`[NOTIFICATION-QUEUE] Registered ${persistent ? 'persistent' : 'temporary'} handler for ${type}`);
    
    // Process any queued notifications for this type
    this.processQueuedNotifications(type);
  }

  /**
   * Unregister handlers for a specific type (used when components unmount)
   */
  unregisterHandlers(type: string, keepPersistent = true): void {
    if (this.handlers.has(type)) {
      if (keepPersistent) {
        // Keep only persistent handlers
        const persistentHandlers = this.handlers.get(type)!.filter(h => h.persistent);
        if (persistentHandlers.length > 0) {
          this.handlers.set(type, persistentHandlers);
        } else {
          this.handlers.delete(type);
        }
      } else {
        this.handlers.delete(type);
      }
    }
  }

  /**
   * Unregister a specific handler (used when components unmount)
   */
  unregisterHandler(type: string, handlerFunction: (notification: QueuedNotification) => void): void {
    if (this.handlers.has(type)) {
      const existingHandlers = this.handlers.get(type)!;
      const filteredHandlers = existingHandlers.filter(h => h.handler !== handlerFunction);
      
      if (filteredHandlers.length > 0) {
        this.handlers.set(type, filteredHandlers);
      } else {
        this.handlers.delete(type);
      }
      
      console.log(`[NOTIFICATION-QUEUE] Unregistered handler for ${type}`);
    }
  }

  /**
   * Process a specific notification
   */
  private processNotification(notification: QueuedNotification): void {
    const handlers = this.handlers.get(notification.type) || [];
    
    if (handlers.length > 0) {
      handlers.forEach(({ handler }) => {
        try {
          handler(notification);
        } catch (error) {
          console.error(`[NOTIFICATION-QUEUE] Error in handler for ${notification.type}:`, error);
        }
      });
      
      // Mark as processed
      notification.processed = true;
      this.processedIds.add(notification.id);
      this.saveToStorage();
    } else {
      console.log(`[NOTIFICATION-QUEUE] No handlers registered for ${notification.type}, queuing for later`);
    }
  }

  /**
   * Process all queued notifications for a specific type
   */
  private processQueuedNotifications(type: string): void {
    const unprocessedNotifications = this.queue.filter(
      notif => notif.type === type && !notif.processed && !this.processedIds.has(notif.id)
    );

    console.log(`[NOTIFICATION-QUEUE] Processing ${unprocessedNotifications.length} queued notifications for ${type}`);
    
    unprocessedNotifications.forEach(notification => {
      this.processNotification(notification);
    });
  }

  /**
   * Get all unprocessed notifications
   */
  getUnprocessedNotifications(): QueuedNotification[] {
    return this.queue.filter(notif => !notif.processed && !this.processedIds.has(notif.id));
  }

  /**
   * Get notifications for specific type
   */
  getNotificationsForType(type: string): QueuedNotification[] {
    return this.queue.filter(notif => notif.type === type);
  }

  /**
   * Mark notification as processed
   */
  markAsProcessed(notificationId: string): void {
    const notification = this.queue.find(n => n.id === notificationId);
    if (notification) {
      notification.processed = true;
      this.processedIds.add(notificationId);
      this.saveToStorage();
    }
  }

  /**
   * Save queue to localStorage for persistence across page reloads
   */
  private saveToStorage(): void {
    try {
      const data = {
        queue: this.queue,
        processedIds: Array.from(this.processedIds),
        toastDisplayed: Array.from(this.toastDisplayed)
      };
      localStorage.setItem(this.persistentStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[NOTIFICATION-QUEUE] Failed to save to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.persistentStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.queue = data.queue || [];
        this.processedIds = new Set(data.processedIds || []);
        this.toastDisplayed = new Set(data.toastDisplayed || []);
        
        // Clean old notifications (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.queue = this.queue.filter(notif => notif.timestamp > oneHourAgo);
        
        console.log(`[NOTIFICATION-QUEUE] Loaded ${this.queue.length} notifications from storage`);
      }
    } catch (error) {
      console.error('[NOTIFICATION-QUEUE] Failed to load from storage:', error);
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.persistentStorageKey && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          const newNotifications = data.queue.filter((notif: QueuedNotification) => 
            !this.queue.some(existing => existing.id === notif.id)
          );
          
          if (newNotifications.length > 0) {
            console.log(`[NOTIFICATION-QUEUE] Synced ${newNotifications.length} notifications from another tab`);
            newNotifications.forEach((notif: QueuedNotification) => {
              if (!notif.processed) {
                this.processNotification(notif);
              }
            });
          }
        } catch (error) {
          console.error('[NOTIFICATION-QUEUE] Failed to sync from storage:', error);
        }
      }
    });
  }

  /**
   * Setup page visibility handler to process notifications when user returns
   */
  private setupPageVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[NOTIFICATION-QUEUE] Page became visible, processing queued notifications');
        // Process any unprocessed notifications
        const unprocessed = this.getUnprocessedNotifications();
        if (unprocessed.length > 0) {
          console.log(`[NOTIFICATION-QUEUE] Processing ${unprocessed.length} queued notifications`);
          unprocessed.forEach(notification => {
            this.processNotification(notification);
          });
        }
      }
    });
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(maxAge: number = 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    const before = this.queue.length;
    this.queue = this.queue.filter(notif => notif.timestamp > cutoff);
    const after = this.queue.length;
    
    if (before !== after) {
      console.log(`[NOTIFICATION-QUEUE] Cleared ${before - after} old notifications`);
      this.saveToStorage();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): { total: number; processed: number; unprocessed: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    this.queue.forEach(notif => {
      types[notif.type] = (types[notif.type] || 0) + 1;
    });

    return {
      total: this.queue.length,
      processed: this.queue.filter(n => n.processed).length,
      unprocessed: this.queue.filter(n => !n.processed).length,
      types
    };
  }
}

// Create singleton instance
export const globalNotificationQueue = new GlobalNotificationQueue();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).globalNotificationQueue = globalNotificationQueue;
}

export default globalNotificationQueue;