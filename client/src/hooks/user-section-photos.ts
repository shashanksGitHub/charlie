import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSectionPhotos,
  getSectionPrimaryPhoto,
  findSectionPrimaryPhoto,
  ProfileSection,
} from "@/services/section-photo-service";

interface UseSectionPhotosReturn {
  photos: any[];
  primaryPhoto: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<any>;
  updatePhotos: (newPhotos: any[]) => void;
  setPrimaryPhotoLocally: (photoId: number) => void;
}

/**
 * Hook for managing section-specific photos
 * @param section - The profile section to manage photos for
 * @param initialPhotos - Optional initial photos array
 * @returns Object with photos state and management functions
 */
export function useSectionPhotos(
  section: ProfileSection,
  initialPhotos?: any[],
): UseSectionPhotosReturn {
  // Use React Query for proper cache management
  const { data: photosData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [`/api/profile/photos/section/${section}`],
    queryFn: async () => {
      const response = await getSectionPhotos(section);
      return response.photos;
    },
    enabled: !initialPhotos, // Only fetch if no initial photos provided
    initialData: initialPhotos,
  });

  const photos = photosData || [];
  const [primaryPhoto, setPrimaryPhoto] = useState<any | null>(null);
  const error = queryError ? (queryError as Error).message : null;

  // Update primary photo when photos change
  useEffect(() => {
    const currentPrimary = findSectionPrimaryPhoto(section, photos);
    setPrimaryPhoto(currentPrimary);
  }, [photos, section]);

  // Update photos state
  const updatePhotos = useCallback(async (newPhotos: any[]) => {
    // This will be handled by React Query cache invalidation
    await refetch();
  }, [refetch]);

  // Set primary photo locally (optimistic update)
  const setPrimaryPhotoLocally = useCallback(
    async (photoId: number) => {
      // This is now handled by the section photo manager with proper cache invalidation
      await refetch();
    },
    [refetch],
  );

  return {
    photos,
    primaryPhoto,
    loading,
    error,
    refetch,
    updatePhotos,
    setPrimaryPhotoLocally,
  };
}

/**
 * Hook for managing multiple sections' photos
 * @param sections - Array of sections to manage
 * @returns Record of section hooks
 */
export function useMultipleSectionPhotos(
  sections: ProfileSection[],
): Record<ProfileSection, UseSectionPhotosReturn> {
  const hooks: Record<string, UseSectionPhotosReturn> = {};

  sections.forEach((section) => {
    hooks[section] = useSectionPhotos(section);
  });

  return hooks as Record<ProfileSection, UseSectionPhotosReturn>;
}

/**
 * Hook for getting primary photo URLs for all sections
 * @param photos - Array of photos with section-specific primary flags
 * @returns Record of primary photo URLs by section
 */
export function useSectionPrimaryPhotoUrls(
  photos: any[],
): Record<ProfileSection, string | null> {
  const [primaryUrls, setPrimaryUrls] = useState<
    Record<ProfileSection, string | null>
  >({
    meet: null,
    job: null,
    mentorship: null,
    networking: null,
  });

  useEffect(() => {
    const sections: ProfileSection[] = [
      "meet",
      "job",
      "mentorship",
      "networking",
    ];
    const urls: Record<ProfileSection, string | null> = {
      meet: null,
      job: null,
      mentorship: null,
      networking: null,
    };

    sections.forEach((section) => {
      const primaryPhoto = findSectionPrimaryPhoto(section, photos);
      urls[section] = primaryPhoto?.photoUrl || null;
    });

    setPrimaryUrls(urls);
  }, [photos]);

  return primaryUrls;
}
