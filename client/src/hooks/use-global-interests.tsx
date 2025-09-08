import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GlobalInterest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { handleApiResponse } from "@/lib/api-helpers";
import { useAuth } from "@/hooks/use-auth";

interface AddInterestInput {
  interest: string;
  category: string;
}

export function useGlobalInterests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch global interests
  const { 
    data: globalInterests = [], 
    isLoading,
    error 
  } = useQuery<GlobalInterest[]>({
    queryKey: ["/api/global-interests"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache,
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/global-interests", { method: "GET" });
        return await handleApiResponse(res);
      } catch (error) {
        console.error("Error fetching global interests:", error);
        // Return empty array instead of throwing to avoid query retries
        return [];
      }
    }
  });
  
  // Add new global interest
  const addInterestMutation = useMutation({
    mutationFn: async (interestData: AddInterestInput) => {
      // Validate input data
      if (!interestData.interest || !interestData.category) {
        throw new Error("Interest and category are required");
      }
      
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Direct API call without blocking session check
      try {
        const response = await apiRequest("/api/global-interests", { 
          method: "POST", 
          data: interestData 
        });
        
        // Use our helper function to handle the response properly
        return await handleApiResponse(response);
      } catch (error) {
        console.error("Error adding global interest:", error);
        throw error instanceof Error ? error : new Error("Unknown error adding interest");
      }
    },
    onSuccess: (data) => {
      console.log("Interest added successfully:", data);
      // Refresh data without disruptive toast notifications
      queryClient.invalidateQueries({ queryKey: ["/api/global-interests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add interest",
        description: error.message || "There was an error adding your interest. Please try again.",
        variant: "destructive",
      });
      console.error("Interest mutation error details:", error);
    }
  });

  // Filter interests based on search term and selected category, then sort alphabetically
  const filteredInterests = globalInterests.filter(interest => {
    const matchesSearch = !searchTerm || 
      interest.interest.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || 
      interest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.interest.localeCompare(b.interest));

  // Group interests by category and sort within each category
  const interestsByCategory = globalInterests.reduce<Record<string, GlobalInterest[]>>(
    (acc, interest) => {
      const category = interest.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(interest);
      return acc;
    },
    {}
  );
  
  // Sort interests within each category alphabetically
  Object.keys(interestsByCategory).forEach(category => {
    interestsByCategory[category].sort((a, b) => 
      a.interest.localeCompare(b.interest)
    );
  });
  
  // Get unique categories
  const categories = Object.keys(interestsByCategory).sort();

  return {
    globalInterests,
    filteredInterests,
    interestsByCategory,
    categories,
    isLoading,
    error,
    addInterest: addInterestMutation.mutate,
    isPending: addInterestMutation.isPending,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory
  };
}