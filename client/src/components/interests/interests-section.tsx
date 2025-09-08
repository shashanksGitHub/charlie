import { useState, useEffect } from "react";
import { Edit, Pencil, X, Plus, Move, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { handleApiResponse } from "@/lib/api-helpers";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InterestSelector } from "./interest-selector";
import { UserInterest } from "@shared/schema";

interface InterestsSectionProps {
  userId: number;
  onToggleVisibility?: (fieldName: string, isVisible: boolean) => void;
  isVisible?: boolean;
}

export function InterestsSection({
  userId,
  onToggleVisibility,
  isVisible = true,
}: InterestsSectionProps) {
  const { toast } = useToast();
  const { translate } = useLanguage();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showInterests, setShowInterests] = useState(isVisible);

  // CRITICAL FIX: Synchronize toggle state with fresh backend data
  // This ensures MY INTERESTS toggle updates immediately after Delete button
  useEffect(() => {
    setShowInterests(isVisible);
    console.log(`[InterestsSection] Toggle state synchronized: ${isVisible}`);
  }, [isVisible]);

  // Fetch user's interests with improved error handling
  const {
    data: userInterests = [],
    isLoading,
    refetch: refetchUserInterests,
  } = useQuery<UserInterest[]>({
    queryKey: ["/api/interests", userId],
    enabled: !!userId,
    queryFn: async () => {
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
          try {
            const parsed = JSON.parse(result);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            console.error("Failed to parse interests response as JSON:", e);
          }
        }

        console.warn("[InterestsSection] Unexpected response format:", result);
        return [];
      } catch (error) {
        console.error("[InterestsSection] Error fetching interests:", error);
        // Return empty array instead of throwing
        return [];
      }
    },
  });

  // Extract just the interest strings for easier handling
  const interestNames = userInterests.map((interest) => interest.interest);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [orderedInterests, setOrderedInterests] = useState<UserInterest[]>([]);

  // Update orderedInterests when userInterests changes
  useEffect(() => {
    if (userInterests && userInterests.length > 0) {
      setOrderedInterests([...userInterests]);
    }
  }, [userInterests]);

  // Save interests function with improved error handling
  const saveInterestsMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      const formattedInterests = interests.map((interest) => ({
        userId,
        interest,
      }));

      try {
        // Delete all existing interests for this user
        const deleteResponse = await apiRequest(`/api/interests/${userId}`, {
          method: "DELETE",
        });
        await handleApiResponse(deleteResponse);

        // Add each interest one by one with error handling
        for (const interest of formattedInterests) {
          const response = await apiRequest("/api/interests", {
            method: "POST",
            data: interest,
          });
          await handleApiResponse(response);
        }

        return interests;
      } catch (error) {
        console.error("Failed to save interests:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to save interests");
      }
    },
    onSuccess: () => {
      // Immediately refresh the interests list to show updated badges
      refetchUserInterests();

      queryClient.invalidateQueries({ queryKey: ["/api/interests", userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving interests",
        description:
          error.message ||
          "There was an error saving your interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle adding an interest - just update local state, don't save yet
  const handleSelectInterest = (interest: string) => {
    if (!selectedInterests.includes(interest)) {
      const newInterests = [...selectedInterests, interest];
      setSelectedInterests(newInterests);

      // Show temporary preview in the main interest display
      const updatedInterests = newInterests.map((int) => ({
        userId,
        interest: int,
        id: Math.random() * 1000000,
      }));
      queryClient.setQueryData(["/api/interests", userId], updatedInterests);
    }
  };

  // Handle removing an interest - just update local state, don't save yet
  const handleRemoveInterest = (interest: string) => {
    const newInterests = selectedInterests.filter((i) => i !== interest);
    setSelectedInterests(newInterests);

    // Show temporary preview in the main interest display
    const updatedInterests = newInterests.map((int) => ({
      userId,
      interest: int,
      id: Math.random() * 1000000,
    }));
    queryClient.setQueryData(["/api/interests", userId], updatedInterests);
  };

  // Handle opening dialog
  const handleOpenDialog = () => {
    // First refetch the latest data from server
    refetchUserInterests().then(() => {
      // Then set the selected interests based on the latest data
      setSelectedInterests(userInterests.map((interest) => interest.interest));
      setEditDialogOpen(true);
    });
  };

  // Save interests explicitly
  const handleSaveInterests = () => {
    // Save current selected interests
    saveInterestsMutation.mutate(selectedInterests, {
      onSuccess: () => {
        // Force an immediate update of the displayed interests
        const updatedInterests = selectedInterests.map((interest) => ({
          userId,
          interest,
          // Generate temporary IDs for immediate display
          id: Math.random() * 1000000,
        }));

        // Update local state to show interests immediately without waiting for refetch
        queryClient.setQueryData(["/api/interests", userId], updatedInterests);

        // Close the dialog immediately without disruptive toast notifications
        setEditDialogOpen(false);

        // Refetch immediately without delays for instant data sync
        refetchUserInterests();
      },
    });
  };

  // Handle dialog open/close
  const handleDialogChange = (open: boolean) => {
    setEditDialogOpen(open);

    // When closing the dialog with X without saving, restore the actual saved interests
    if (!open) {
      // First revert any unsaved changes in the UI by restoring from server
      refetchUserInterests();
    }
  };

  // Toggle visibility mutation - updates showOnProfile in database
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (visible: boolean) => {
      console.log(
        `[InterestsSection] Setting all interests visibility to: ${visible}`,
      );

      // Direct API call without blocking session check
      try {
        const res = await apiRequest(`/api/interests/${userId}/visibility`, {
          method: "PATCH",
          data: { showOnProfile: visible },
        });

        // Use our improved handleApiResponse helper to parse the response safely
        return await handleApiResponse(res);
      } catch (error) {
        console.error("[InterestsSection] API request error:", error);
        throw error instanceof Error
          ? error
          : new Error(
              "Failed to update interest visibility. Please try again.",
            );
      }
    },
    onSuccess: () => {
      console.log(
        "[InterestsSection] Successfully updated interests visibility",
      );

      // Refresh data without disruptive toast notifications
      queryClient.invalidateQueries({ queryKey: ["/api/interests", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/interests"] });
      
      // Single efficient refetch without delays
      refetchUserInterests();
    },
    onError: (error: Error) => {
      console.error("[InterestsSection] Error updating visibility:", error);
      toast({
        title: "Error updating visibility",
        description:
          error.message ||
          "There was an error updating your interests visibility",
        variant: "destructive",
      });
      // Revert the local state on error
      setShowInterests(!showInterests);
    },
  });

  // Handle drag-and-drop reordering
  const handleDragEnd = (result: DropResult) => {
    // Drop outside the list
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // No change
    if (sourceIndex === destinationIndex) {
      return;
    }

    // Reorder the interests array
    const newOrderedInterests = Array.from(orderedInterests);
    const [reorderedItem] = newOrderedInterests.splice(sourceIndex, 1);
    newOrderedInterests.splice(destinationIndex, 0, reorderedItem);

    // Update state
    setOrderedInterests(newOrderedInterests);

    // Update displayed interests immediately
    queryClient.setQueryData(["/api/interests", userId], newOrderedInterests);

    // Save the new order to the database
    saveInterestOrderMutation.mutate(
      newOrderedInterests.map((i) => i.interest),
    );
  };

  // Mutation to save interest order
  const saveInterestOrderMutation = useMutation({
    mutationFn: async (interestsList: string[]) => {
      try {
        // Delete all existing interests
        const deleteResponse = await apiRequest(`/api/interests/${userId}`, {
          method: "DELETE",
        });
        await handleApiResponse(deleteResponse);

        // Add each interest in the new order
        for (const interest of interestsList) {
          const response = await apiRequest("/api/interests", {
            method: "POST",
            data: { userId, interest },
          });
          await handleApiResponse(response);
        }

        return interestsList;
      } catch (error) {
        console.error("Failed to save interest order:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to save interest order");
      }
    },
    onSuccess: () => {
      // Show toast notification
      toast({
        title: "Interest Order Saved",
        description:
          "The first three interests will appear on your profile card",
        variant: "default",
      });

      // Refetch the interests to ensure we have the latest data
      refetchUserInterests();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Order",
        description:
          error.message ||
          "Failed to save your interest order. Please try again.",
        variant: "destructive",
      });

      // Revert to previous state
      setOrderedInterests([...userInterests]);
    },
  });

  // Handle visibility toggle
  const handleToggleVisibility = () => {
    const newVisibility = !showInterests;
    setShowInterests(newVisibility);

    // Update the visibility in the database
    toggleVisibilityMutation.mutate(newVisibility);

    // Notify parent component if callback is provided
    if (onToggleVisibility) {
      onToggleVisibility("interests", newVisibility);
    }
  };

  return (
    <div>
      {/* Display selected interests as colorful badges */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
        {/* Header with edit button and visibility toggle - consistent with other profile sections */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1"></div>{" "}
          {/* Spacer to push controls to the right */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenDialog}
              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {translate("profile.showOnCard")}
              </span>
              <Switch
                checked={showInterests}
                onCheckedChange={handleToggleVisibility}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-muted h-6 w-20 animate-pulse"
              />
            ))}
          </div>
        ) : userInterests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center italic">
            {translate("profile.addInterestsToProfile")}
          </p>
        ) : (
          <>
            {/* First 3 interests shown on profile card indicator */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 italic mb-2 flex items-center">
                <Move className="h-3 w-3 mr-1" /> Drag to reorder - first 3
                interests appear on your profile card
              </p>

              {/* Draggable interests list with react-beautiful-dnd */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="interests-list" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50"
                    >
                      {orderedInterests.map((interest, index) => {
                        // Dynamic colorful badges with alternating gradients
                        const gradientClasses = [
                          "from-purple-500/90 to-fuchsia-500/90",
                          "from-amber-500/90 to-orange-500/90",
                          "from-teal-500/90 to-cyan-500/90",
                        ];
                        const gradientClass =
                          gradientClasses[index % gradientClasses.length];

                        // Add special styling for the first 3 interests
                        const isTopThree = index < 3;
                        const topThreeClass = isTopThree
                          ? "ring-2 ring-yellow-400 dark:ring-yellow-500 ring-offset-1 dark:ring-offset-gray-900"
                          : "";

                        return (
                          <Draggable
                            key={`${interest.interest}-${index}`}
                            draggableId={`${interest.interest}-${index}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`relative group cursor-move transition-all duration-200 ${
                                  snapshot.isDragging
                                    ? "z-50 scale-105 opacity-90"
                                    : ""
                                }`}
                              >
                                <Badge
                                  className={`bg-gradient-to-r ${gradientClass} text-white shadow-md text-xs py-1 px-3 border-0 transition-all ${topThreeClass} ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                >
                                  <span className="flex items-center">
                                    {isTopThree && (
                                      <span className="w-4 h-4 rounded-full bg-yellow-400/80 text-[9px] flex items-center justify-center text-black mr-1 font-bold">
                                        {index + 1}
                                      </span>
                                    )}
                                    {interest.interest}
                                    <GripVertical className="h-3 w-3 ml-1 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </span>
                                </Badge>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Display visibility status information */}
            {!showInterests && (
              <p className="text-xs text-gray-500 italic mt-2">
                Note: Interests are hidden from your SwipeCard preview
              </p>
            )}
          </>
        )}
      </div>

      {/* Edit Dialog with smooth transitions */}
      <Dialog open={editDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className="sm:max-w-[380px] rounded-3xl bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] overflow-hidden backdrop-blur-xl"
          aria-describedby="interest-selector-description"
        >
          {/* Animated background elements - futuristic with glowing effects */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-700 rounded-full animate-pulse blur-3xl mix-blend-overlay"></div>
            <div className="absolute -bottom-32 -left-16 w-56 h-56 bg-gradient-to-tr from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 rounded-full animate-pulse animation-delay-2000 blur-3xl mix-blend-overlay"></div>
            <div className="absolute top-1/3 -right-16 w-48 h-48 bg-gradient-to-tr from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700 rounded-full animate-pulse animation-delay-4000 blur-3xl mix-blend-overlay"></div>
          </div>

          {/* Using DialogClose component properly */}
          <DialogClose className="absolute top-4 right-4 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-md border border-white/20 z-50">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Glowing border effect */}
          <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

          <div className="relative z-10 backdrop-blur-md pt-4 pr-4 pb-4 pl-0">
            <DialogHeader className="pb-0">
              <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
              <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                Select Your Interests
              </DialogTitle>
            </DialogHeader>

            <div className="relative py-3 px-1 flex flex-col items-center animate-in fade-in duration-300">
              <p
                id="interest-selector-description"
                className="text-xs text-center text-gray-200 mb-2 px-2"
              >
                Add interests to express your personality.
                <br />
                Click the Save button when you're done.
              </p>

              {/* Use the InterestSelector component with scrollable container */}
              <div className="relative rounded-xl p-2 bg-black/30 backdrop-blur-xl border border-purple-500/20 shadow-inner max-w-[350px] animate-in slide-in-from-bottom-4 duration-300">
                <div className="max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                  <InterestSelector
                    selectedInterests={selectedInterests}
                    onSelectInterest={handleSelectInterest}
                    onRemoveInterest={handleRemoveInterest}
                    maxInterests={10}
                    horizontalCategories={false}
                    darkMode={true}
                    compactLayout={true}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleSaveInterests}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-md transition-all duration-300 text-sm px-6 py-2 rounded-full"
                  disabled={saveInterestsMutation.isPending}
                  aria-label="Save Interests"
                  title="Save your selected interests"
                  aria-describedby="interest-selector-description"
                >
                  {saveInterestsMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <span>Save Interests</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
