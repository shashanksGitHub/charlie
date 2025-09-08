import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { globalNotificationQueue } from '@/lib/global-notification-queue';

export interface SuiteConnectionCounts {
  networking: {
    matches: number;
    pending: number;
    total: number;
  };
  mentorship: {
    matches: number;
    pending: number;
    total: number;
  };
  jobs: {
    applications: number;
    pending: number;
    total: number;
  };
}

export function useSuiteConnectionCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeCounts, setRealtimeCounts] = useState<SuiteConnectionCounts | null>(null);

  const { data: counts, isLoading, refetch } = useQuery({
    queryKey: ["/api/suite/connections/counts"],
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds to reduce mobile battery drain
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Set up real-time notification listener for instant count updates
  useEffect(() => {
    if (!user) return;

    console.log('[SUITE-CONNECTION-COUNT] Setting up real-time notification listener for user:', user.id);

    // Handler for networking/mentorship notifications
    const handleConnectionNotification = (notification: any) => {
      console.log('[SUITE-CONNECTION-COUNT] Raw notification received:', notification);
      
      const { type } = notification;
      // Check both data.targetUserId and direct targetUserId fields
      const targetUserId = notification.data?.targetUserId || notification.targetUserId;
      
      console.log('[SUITE-CONNECTION-COUNT] Extracted:', { type, targetUserId, currentUserId: user.id });
      
      // Only process notifications for the current user
      if (targetUserId !== user.id) {
        console.log('[SUITE-CONNECTION-COUNT] Notification not for current user, skipping');
        return;
      }

      console.log('[SUITE-CONNECTION-COUNT] Processing connection notification for current user:', type, targetUserId);

      // Invalidate and refetch connection counts immediately
      console.log('[SUITE-CONNECTION-COUNT] Invalidating connection counts query');
      queryClient.invalidateQueries({ queryKey: ["/api/suite/connections/counts"] });

      // Also increment the local count optimistically for instant UI feedback
      const currentCounts = queryClient.getQueryData(["/api/suite/connections/counts"]) as SuiteConnectionCounts;
      console.log('[SUITE-CONNECTION-COUNT] Current counts in cache:', currentCounts);
      
      if (currentCounts) {
        const updatedCounts = { ...currentCounts };
        
        if (type === 'networking_like') {
          console.log('[SUITE-CONNECTION-COUNT] Incrementing networking count');
          updatedCounts.networking = {
            ...updatedCounts.networking,
            total: updatedCounts.networking.total + 1,
            pending: updatedCounts.networking.pending + 1
          };
        } else if (type === 'mentorship_like') {
          console.log('[SUITE-CONNECTION-COUNT] Incrementing mentorship count');
          updatedCounts.mentorship = {
            ...updatedCounts.mentorship,
            total: updatedCounts.mentorship.total + 1,
            pending: updatedCounts.mentorship.pending + 1
          };
        } else if (type === 'job_application') {
          console.log('[SUITE-CONNECTION-COUNT] Incrementing job applications count');
          updatedCounts.jobs = {
            ...updatedCounts.jobs,
            total: updatedCounts.jobs.total + 1,
            pending: updatedCounts.jobs.pending + 1
          };
        }

        // Update the query cache with optimistic data
        queryClient.setQueryData(["/api/suite/connections/counts"], updatedCounts);
        console.log('[SUITE-CONNECTION-COUNT] Optimistically updated counts:', updatedCounts);
        
        // Also update the realtime state for immediate UI update
        setRealtimeCounts(updatedCounts);
        console.log('[SUITE-CONNECTION-COUNT] Updated realtime state');
      } else {
        console.log('[SUITE-CONNECTION-COUNT] No current counts in cache, just invalidating');
      }
    };

    // Register handlers for different notification types
    globalNotificationQueue.registerHandler('networking_like', handleConnectionNotification, true);
    globalNotificationQueue.registerHandler('mentorship_like', handleConnectionNotification, true);
    globalNotificationQueue.registerHandler('job_application', handleConnectionNotification, true);

    // Cleanup on unmount
    return () => {
      globalNotificationQueue.unregisterHandler('networking_like', handleConnectionNotification);
      globalNotificationQueue.unregisterHandler('mentorship_like', handleConnectionNotification);
      globalNotificationQueue.unregisterHandler('job_application', handleConnectionNotification);
    };
  }, [user, queryClient]);

  // Use the latest data (either from query or realtime updates)
  const safeData = (realtimeCounts || counts) as SuiteConnectionCounts | undefined;
  const totalCount = safeData ? 
    (safeData.networking?.total || 0) + (safeData.mentorship?.total || 0) + (safeData.jobs?.total || 0) : 0;

  return {
    counts: safeData,
    totalCount,
    networkingCount: safeData?.networking?.total || 0,
    mentorshipCount: safeData?.mentorship?.total || 0,
    jobsCount: safeData?.jobs?.total || 0,
    isLoading,
    refetch
  };
}