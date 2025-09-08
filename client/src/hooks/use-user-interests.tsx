import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { handleApiResponse, safeParseJson } from "@/lib/api-helpers";

// Simple interface that matches exactly what the API returns
interface UserInterestResponse {
  id: number;
  userId: number;
  interest: string;
  showOnProfile: boolean;
}

export function useUserInterests(userId: number) {
  // Enhanced fetch function with proper error handling
  const fetchUserInterests = async (): Promise<UserInterestResponse[]> => {
    if (!userId) return [];

    try {
      // Use our improved API request function
      const response = await apiRequest(`/api/interests/${userId}`, {
        method: "GET",
      });

      // Use our helper to safely process the response
      const result = await handleApiResponse(response);

      // Make sure the result is an array
      if (Array.isArray(result)) {
        return result;
      } else if (result && typeof result === "string") {
        // If we got a string response, try to parse it as JSON
        const parsed = safeParseJson(result, []);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }

      // If we got something else, return an empty array
      console.warn("[useUserInterests] Unexpected response format:", result);
      return [];
    } catch (error) {
      console.error("[useUserInterests] Error fetching interests:", error);
      return [];
    }
  };

  // Use TanStack Query for data fetching with optimized cache settings
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery<UserInterestResponse[]>({
    queryKey: ["/api/interests", userId],
    queryFn: fetchUserInterests,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes before considering stale
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (v5 uses gcTime instead of cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 1, // Only retry once on failure
  });

  // Ensure data is always an array before filtering
  const safeData = Array.isArray(data) ? data : [];

  // Filter to only visible interests
  const visibleInterests = safeData.filter(
    (interest) => interest.showOnProfile === true,
  );

  // Get all interests for managing them
  const allInterests = safeData;

  // Convert to simple string arrays for convenience
  const visibleInterestStrings = visibleInterests.map((i) => i.interest);
  const allInterestStrings = allInterests.map((i) => i.interest);

  return {
    visibleInterests,
    allInterests,
    visibleInterestStrings,
    allInterestStrings,
    isLoading,
    error,
    refetch,
  };
}
