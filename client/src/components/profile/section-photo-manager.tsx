import React, { useState, useRef, useEffect } from "react";
import { Star, StarOff, Plus, Upload, Trash2, Loader2 } from "lucide-react";
import {
  setSectionPrimaryPhoto,
  isPhotoPrimaryForSection,
  ProfileSection,
} from "@/services/section-photo-service";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ProfilePhotoEditButton } from "@/components/profile/profile-photo-button";

interface SectionPhotoManagerProps {
  photos: any[];
  section: ProfileSection;
  onPhotosUpdate?: (photos: any[]) => void;
  className?: string;
  userId?: number;
  hideTitle?: boolean;
}

export function SectionPhotoManager({
  photos,
  section,
  onPhotosUpdate,
  className = "",
  userId,
  hideTitle = false,
}: SectionPhotoManagerProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCheckedForPrimary, setHasCheckedForPrimary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { translate } = useLanguage();

  // Auto-set first photo as primary when dialog opens with existing photos
  useEffect(() => {
    if (!photos || photos.length === 0 || hasCheckedForPrimary) return;

    // Check if there are any photos that already have primary status for this section
    const sectionPrimaryPhotos = photos.filter(photo => {
      if (!photo || !photo.id) return false;
      return (photo.isPrimaryForJob && section === 'job') ||
             (photo.isPrimaryForMentorship && section === 'mentorship') ||
             (photo.isPrimaryForNetworking && section === 'networking') ||
             (photo.isPrimaryForMeet && section === 'meet');
    });

    // If no photos are set as primary for this section, automatically set the first one
    if (sectionPrimaryPhotos.length === 0 && photos.length > 0) {
      const firstPhoto = photos[0];
      if (firstPhoto?.id) {
        console.log(`[AUTO-PRIMARY] Setting first photo (${firstPhoto.id}) as primary for ${section} section`);
        
        apiRequest(`/api/profile/photo/${firstPhoto.id}/primary/${section}`, {
          method: 'PATCH'
        }).then(() => {
          // Refresh photos to show updated primary status without disruptive toast
          if (onPhotosUpdate) {
            onPhotosUpdate([]);
          }
          
          // Invalidate queries to refresh the UI immediately
          queryClient.invalidateQueries({
            queryKey: [`/api/profile/photos/section/${section}`],
          });
        }).catch((error) => {
          console.error(`Failed to auto-set primary photo for ${section}:`, error);
        });
      }
    }
    
    setHasCheckedForPrimary(true);
  }, [photos, section, hasCheckedForPrimary, onPhotosUpdate, toast]);

  // Photo upload mutation with optimistic updates for instant UI response
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const photoData = e.target?.result as string;
            if (!photoData) {
              throw new Error('Failed to read file');
            }

            // Create optimistic photo for instant UI update
            const optimisticPhoto = {
              id: Date.now(), // Temporary ID
              userId: userId || 0,
              photoUrl: photoData,
              isPrimary: false,
              isPrimaryForJob: section === 'job' && photos.length === 0,
              isPrimaryForMentorship: section === 'mentorship' && photos.length === 0,
              isPrimaryForNetworking: section === 'networking' && photos.length === 0,
              isPrimaryForMeet: section === 'meet' && photos.length === 0,
              createdAt: new Date().toISOString(),
            };

            // Apply optimistic update immediately for instant UI response
            queryClient.setQueryData([`/api/photos`], (old: any) => {
              return [...(old || []), optimisticPhoto];
            });

            queryClient.setQueryData([`/api/profile/photos/section/${section}`], (old: any) => {
              return [...(old || []), optimisticPhoto];
            });

            try {
              // Make actual API request FIRST to avoid race conditions
              const response = await apiRequest('/api/profile/photo', {
                method: 'POST',
                data: { photoData }
              });
              
              const result = await response.json();
              
              // Update cache with real server response immediately
              queryClient.setQueryData([`/api/photos`], (old: any) => {
                return (old || []).map((photo: any) => 
                  photo.id === optimisticPhoto.id ? result : photo
                );
              });

              queryClient.setQueryData([`/api/profile/photos/section/${section}`], (old: any) => {
                return (old || []).map((photo: any) => 
                  photo.id === optimisticPhoto.id ? result : photo
                );
              });
              
              // Trigger stable photo update AFTER server confirms
              if (onPhotosUpdate) {
                // Invalidate queries to trigger refetch with latest data
                queryClient.invalidateQueries({
                  queryKey: [`/api/profile/photos/section/${section}`],
                });
              }

              resolve(result);
            } catch (error) {
              // Remove optimistic photo on error and restore clean state
              queryClient.setQueryData([`/api/photos`], (old: any) => {
                return (old || []).filter((photo: any) => photo.id !== optimisticPhoto.id);
              });

              queryClient.setQueryData([`/api/profile/photos/section/${section}`], (old: any) => {
                return (old || []).filter((photo: any) => photo.id !== optimisticPhoto.id);
              });

              // Restore original photo list
              if (onPhotosUpdate) {
                onPhotosUpdate(photos);
              }

              reject(error);
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: async (uploadResult: any) => {
      // Auto-set as primary if this is the first photo for this section
      if (uploadResult?.id && photos.length === 0) {
        try {
          await apiRequest(`/api/profile/photo/${uploadResult.id}/primary/${section}`, {
            method: 'PATCH'
          });
        } catch (error) {
          console.error(`Failed to set primary photo for ${section}:`, error);
        }
      }
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // No need for additional invalidation - already handled in mutation
      console.log(`[PHOTO-UPLOAD] Successfully uploaded photo for ${section} section`);
    },
    onError: (error) => {
      console.error("Photo upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Photo deletion mutation with optimistic updates for instant UI response
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      // Store original data for potential recovery
      const originalPhotos = queryClient.getQueryData([`/api/photos`]);
      const originalSectionPhotos = queryClient.getQueryData([`/api/profile/photos/section/${section}`]);

      // Apply optimistic update immediately - remove photo from UI instantly
      queryClient.setQueryData([`/api/photos`], (old: any) => {
        return (old || []).filter((photo: any) => photo.id !== photoId);
      });

      queryClient.setQueryData([`/api/profile/photos/section/${section}`], (old: any) => {
        return (old || []).filter((photo: any) => photo.id !== photoId);
      });

      // Update local photos list immediately for instant feedback
      if (onPhotosUpdate) {
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        onPhotosUpdate(updatedPhotos);
      }

      // Check if this is a temporary ID (from Date.now() optimistic updates)
      // PostgreSQL integers max out at 2,147,483,647, so anything larger is temporary
      const isTemporaryId = photoId > 2147483647;
      
      if (isTemporaryId) {
        // For temporary IDs, just remove from local state - no backend call needed
        console.log(`[SECTION-PHOTO-DELETE] Removing temporary photo ID ${photoId} from local state only`);
        return photoId;
      }

      try {
        // Make actual API request for real database IDs
        const response = await apiRequest(`/api/photos/${photoId}`, {
          method: "DELETE",
        });
        return response;
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos`], originalPhotos);
        queryClient.setQueryData([`/api/profile/photos/section/${section}`], originalSectionPhotos);
        
        // Restore original photo list
        if (onPhotosUpdate) {
          onPhotosUpdate(photos);
        }

        throw error;
      }
    },
    onSuccess: () => {
      // Final sync with server data (optimistic updates already handled above)
      queryClient.invalidateQueries({
        queryKey: [`/api/photos`],
      });
      
      queryClient.invalidateQueries({
        queryKey: [`/api/profile/photos/section/${section}`],
      });
    },
    onError: (error) => {
      console.error("Photo deletion error:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleSetPrimary = async (photoId: number) => {
    setIsUpdating(photoId);

    try {
      const response = await setSectionPrimaryPhoto(photoId, section);

      // Update the photos array with the new primary status
      if (onPhotosUpdate) {
        onPhotosUpdate(response.photos);
      }

      // Invalidate cache for this specific section to trigger re-render
      queryClient.invalidateQueries({
        queryKey: [`/api/profile/photos/section/${section}`],
      });

      // Also invalidate all section photo queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['/api/profile/photos/section'],
      });

      // Primary photo updated successfully - no disruptive toast notification needed
    } catch (error) {
      console.error("Error setting primary photo:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update primary photo",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    uploadPhotoMutation.mutate(file);
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };

  const getSectionDisplayName = (section: ProfileSection): string => {
    const displayNames: Record<ProfileSection, string> = {
      meet: translate("suite.profile.meetDating"),
      job: translate("suite.profile.jobsPhotos"),
      mentorship: translate("suite.profile.mentorshipPhotos"),
      networking: translate("suite.profile.networkingPhotos"),
    };
    return displayNames[section];
  };

  // Determine which photos to show based on collapse/expand state
  const displayPhotos = photos.length > 3 && !isExpanded ? photos.slice(0, 3) : photos;
  const hasMorePhotos = photos.length > 3;

  return (
    <div className={`section-photo-manager ${className}`}>
      {!hideTitle && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">
            {getSectionDisplayName(section)} Photos
          </h3>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayPhotos.map((photo) => {
          const isPrimary = isPhotoPrimaryForSection(photo.id, section, photos);
          const isCurrentlyUpdating = isUpdating === photo.id;
          const isDeleting = deletePhotoMutation.isPending && deletePhotoMutation.variables === photo.id;

          return (
            <div key={photo.id} className="relative group">
              {/* Photo */}
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={photo.photoUrl}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Star overlay - always visible, no hover animations */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleSetPrimary(photo.id)}
                  disabled={isCurrentlyUpdating || isDeleting}
                  className={`
                    p-2 rounded-full shadow-sm
                    ${
                      isPrimary
                        ? "bg-yellow-500 text-white"
                        : "bg-white text-gray-700"
                    }
                    ${
                      isCurrentlyUpdating
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  `}
                >
                  {isCurrentlyUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPrimary ? (
                    <Star className="w-4 h-4 fill-current" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Action button - bottom right corner */}
              <div className="absolute bottom-2 right-2">
                {isPrimary ? (
                  // Edit button for primary photos - same as MEET profile
                  <ProfilePhotoEditButton
                    userId={userId || photo.userId}
                    photoId={photo.id}
                    currentPhotoUrl={photo.photoUrl}
                    className="!static !bg-white/90 hover:!bg-gray-100 !shadow-lg !border !border-gray-200"
                  />
                ) : (
                  // Delete icon for non-primary photos
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={isDeleting || isCurrentlyUpdating}
                    className="p-2 rounded-full bg-red-500 text-white shadow-sm"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Primary indicator - bottom left corner */}
              {isPrimary && (
                <div className="absolute bottom-2 left-2">
                  <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    {translate("suite.profile.primary")}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add photo button - no loading state for instant feedback */}
        {photos.length < 6 && (
          <div 
            className="aspect-square rounded-lg border border-gray-300 bg-gray-50 cursor-pointer flex flex-col items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mb-2">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs text-gray-600">{translate("suite.profile.addPhoto")}</span>
          </div>
        )}

        {/* Show more/less button when there are more than 3 photos */}
        {hasMorePhotos && !isExpanded && (
          <div 
            className="aspect-square rounded-lg border border-blue-300 bg-blue-50 cursor-pointer flex flex-col items-center justify-center"
            onClick={() => setIsExpanded(true)}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mb-2">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs text-blue-600 font-medium">Click for MORE</span>
            <span className="text-xs text-blue-500">{photos.length - 3} more</span>
          </div>
        )}

        {/* Empty state - minimal */}
        {photos.length === 0 && (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-400">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm mb-2">No photos uploaded yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 text-sm font-medium"
              >
                Upload your first photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapse button when expanded and more than 3 photos */}
      {hasMorePhotos && isExpanded && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setIsExpanded(false)}
            className="text-blue-500 text-sm font-medium hover:text-blue-600"
          >
            Show Less
          </button>
        </div>
      )}

      {/* Hidden file input - no disabled state for instant feedback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
