/**
 * Unified hook for HomePage data loading
 * Replaces multiple sequential API calls with single parallel request for better performance
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";

export interface UnifiedHomeData {
  user: any;
  discoverUsers: any[];
  swipeHistory: any[];
  premiumStatus: any;
  matchCounts: any;
  matches: any[];
  unreadCount: number;
  suiteConnectionCounts: any;
}

export function useUnifiedHomeData() {
  const { user } = useAuth();

  return useQuery<UnifiedHomeData>({
    queryKey: ["/api/home-page-data"],
    queryFn: async () => {
      console.log('[UNIFIED-HOME-DATA] 🚀 Fetching optimized data in single request');
      const startTime = Date.now();
      
      try {
        const response = await apiRequest("/api/home-page-data");
        const data = await response.json();
        const duration = Date.now() - startTime;
        console.log(`[UNIFIED-HOME-DATA] ⚡ Data loaded in ${duration}ms`);
        return data;
      } catch (error) {
        console.error('[UNIFIED-HOME-DATA] ❌ Failed to load data:', error);
        
        // If it's a network error, provide more specific feedback
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          throw new Error('Network connection issue. Please check your internet connection.');
        }
        
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - fresh data for better UX
    gcTime: 2 * 60 * 1000, // 2 minutes cache retention
    retry: (failureCount, error) => {
      // Don't retry on network connectivity issues to prevent overlay spam
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('[UNIFIED-HOME-DATA] Network issue detected, not retrying to prevent overlay spam');
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Allow reconnect retries for network issues
    throwOnError: false, // Prevent errors from bubbling up to error boundary/overlay
  });
}