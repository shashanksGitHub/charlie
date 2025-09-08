/**
 * Global Notification Toast System
 * 
 * This component provides instant toast notifications that appear on any page
 * when real-time events occur, similar to social media platforms.
 */

import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { globalNotificationQueue } from "@/lib/global-notification-queue";
import { type QueuedNotification } from "@/lib/global-notification-queue";

interface GlobalNotificationToastProps {
  userId?: number;
}

export function GlobalNotificationToast({ userId }: GlobalNotificationToastProps) {
  const [processedToasts, setProcessedToasts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Handler for networking notifications
    const handleNetworkingNotification = (notification: QueuedNotification) => {
      // Avoid duplicate toasts
      if (processedToasts.has(notification.id)) {
        return;
      }

      const data = notification.data;
      
      // Only show toast if current user is the target (recipient)
      if (data.targetUserId !== userId) {
        return;
      }

      const fromUserName = data.fromUserInfo?.fullName || "Someone";
      
      if (data.isMatch) {
        toast({
          title: "🤝 Professional Match!",
          description: `You and ${fromUserName} want to connect! Check your connections.`,
          variant: "default",
          duration: 6000,
        });
      } else {
        toast({
          title: "💼 New Professional Like!",
          description: `${fromUserName} has liked your networking profile!`,
          variant: "default", 
          duration: 5000,
        });
      }

      // Mark toast as displayed
      setProcessedToasts(prev => new Set([...prev, notification.id]));
      globalNotificationQueue.markAsProcessed(notification.id);
      
      console.log(`[GLOBAL-TOAST] Displayed networking toast for notification ${notification.id}`);
    };

    // Handler for mentorship notifications
    const handleMentorshipNotification = (notification: QueuedNotification) => {
      // Avoid duplicate toasts
      if (processedToasts.has(notification.id)) {
        return;
      }

      const data = notification.data;
      
      // Only show toast if current user is the target (recipient)
      if (data.targetUserId !== userId) {
        return;
      }

      const fromUserName = data.fromUserInfo?.fullName || "Someone";
      
      if (data.isMatch) {
        toast({
          title: "🎓 Mentorship Match!",
          description: `You and ${fromUserName} want to connect for mentorship! Check your connections.`,
          variant: "default",
          duration: 6000,
        });
      } else {
        toast({
          title: "🌟 New Mentorship Interest!",
          description: `${fromUserName} is interested in your mentorship profile!`,
          variant: "default",
          duration: 5000,
        });
      }

      // Mark toast as displayed
      setProcessedToasts(prev => new Set([...prev, notification.id]));
      globalNotificationQueue.markAsProcessed(notification.id);
      
      console.log(`[GLOBAL-TOAST] Displayed mentorship toast for notification ${notification.id}`);
    };

    // Handler for job application notifications
    const handleJobNotification = (notification: QueuedNotification) => {
      // Avoid duplicate toasts
      if (processedToasts.has(notification.id)) {
        return;
      }

      const data = notification.data;
      
      // Only show toast if current user is the target (job poster)
      if (data.targetUserId !== userId) {
        return;
      }

      const fromUserName = data.fromUserInfo?.fullName || "Someone";
      
      toast({
        title: "💼 New Job Application!",
        description: `${fromUserName} has applied for your job posting!`,
        variant: "default",
        duration: 5000,
      });

      // Mark toast as displayed
      setProcessedToasts(prev => new Set([...prev, notification.id]));
      globalNotificationQueue.markAsProcessed(notification.id);
      
      console.log(`[GLOBAL-TOAST] Displayed job application toast for notification ${notification.id}`);
    };

    // Register persistent handlers that work across all pages
    globalNotificationQueue.registerHandler('networking_like', handleNetworkingNotification, true);
    globalNotificationQueue.registerHandler('networking_match', handleNetworkingNotification, true);
    globalNotificationQueue.registerHandler('mentorship_like', handleMentorshipNotification, true);
    globalNotificationQueue.registerHandler('mentorship_match', handleMentorshipNotification, true);
    globalNotificationQueue.registerHandler('job_application', handleJobNotification, true);

    console.log('[GLOBAL-TOAST] Registered persistent notification handlers for user', userId);

    // Process any existing unprocessed notifications
    const unprocessed = globalNotificationQueue.getUnprocessedNotifications();
    if (unprocessed.length > 0) {
      console.log(`[GLOBAL-TOAST] Processing ${unprocessed.length} existing notifications`);
      unprocessed.forEach(notification => {
        if (notification.type.includes('networking')) {
          handleNetworkingNotification(notification);
        } else if (notification.type.includes('mentorship')) {
          handleMentorshipNotification(notification);
        } else if (notification.type.includes('job')) {
          handleJobNotification(notification);
        }
      });
    }

    // Cleanup function - keep persistent handlers but update processed set
    return () => {
      // Don't unregister persistent handlers, just clear local state
      setProcessedToasts(new Set());
      console.log('[GLOBAL-TOAST] Component unmounted, kept persistent handlers');
    };
  }, [userId, processedToasts]);

  // This component doesn't render anything visible - it just handles toasts
  return null;
}

export default GlobalNotificationToast;