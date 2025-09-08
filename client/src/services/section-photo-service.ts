/**
 * Section-specific photo management service
 * Handles API calls for setting different primary photos across MEET, Jobs, Mentorship, and Networking sections
 */

export type ProfileSection = "meet" | "job" | "mentorship" | "networking";

export interface SectionPhotoResponse {
  message: string;
  photos: any[];
  updatedPhotoId: number;
  section: string;
}

export interface SectionPhotosResponse {
  photos: any[];
  section: string;
}

export interface PrimaryPhotoResponse {
  photo: any;
  section: string;
}

/**
 * Set a photo as primary for a specific section
 * @param photoId - The ID of the photo to set as primary
 * @param section - The section to set the primary photo for
 * @returns Promise resolving to the response data
 */
export async function setSectionPrimaryPhoto(
  photoId: number,
  section: ProfileSection,
): Promise<SectionPhotoResponse> {
  const response = await fetch(
    `/api/profile/photo/${photoId}/primary/${section}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `Failed to set primary photo for ${section}`,
    );
  }

  return await response.json();
}

/**
 * Get all photos with section-specific primary status
 * @param section - The section to get photos for
 * @returns Promise resolving to photos for the section
 */
export async function getSectionPhotos(
  section: ProfileSection,
): Promise<SectionPhotosResponse> {
  const response = await fetch(`/api/profile/photos/section/${section}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `Failed to fetch photos for ${section}`,
    );
  }

  return await response.json();
}

/**
 * Get the primary photo for a specific section
 * @param section - The section to get the primary photo for
 * @returns Promise resolving to the primary photo for the section
 */
export async function getSectionPrimaryPhoto(
  section: ProfileSection,
): Promise<PrimaryPhotoResponse> {
  const response = await fetch(`/api/profile/photo/primary/${section}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `Failed to fetch primary photo for ${section}`,
    );
  }

  return await response.json();
}

/**
 * Get the primary photo URL for a specific section
 * @param section - The section to get the primary photo URL for
 * @returns Promise resolving to the photo URL or null if no primary photo
 */
export async function getSectionPrimaryPhotoUrl(
  section: ProfileSection,
): Promise<string | null> {
  try {
    const response = await getSectionPrimaryPhoto(section);
    return response.photo?.photoUrl || null;
  } catch (error) {
    // Return null if no primary photo found (404)
    return null;
  }
}

/**
 * Check if a photo is primary for a specific section
 * @param photoId - The photo ID to check
 * @param section - The section to check
 * @param photos - Array of photos with section-specific primary flags
 * @returns Boolean indicating if the photo is primary for the section
 */
export function isPhotoPrimaryForSection(
  photoId: number,
  section: ProfileSection,
  photos: any[],
): boolean {
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return false;

  const sectionFieldMap: Record<ProfileSection, string> = {
    meet: "isPrimaryForMeet",
    job: "isPrimaryForJob",
    mentorship: "isPrimaryForMentorship",
    networking: "isPrimaryForNetworking",
  };

  const fieldName = sectionFieldMap[section];
  return photo[fieldName] === true;
}

/**
 * Get the section-specific primary photo from a photos array
 * @param section - The section to find the primary photo for
 * @param photos - Array of photos with section-specific primary flags
 * @returns The primary photo object or null if none found
 */
export function findSectionPrimaryPhoto(
  section: ProfileSection,
  photos: any[],
): any | null {
  const sectionFieldMap: Record<ProfileSection, string> = {
    meet: "isPrimaryForMeet",
    job: "isPrimaryForJob",
    mentorship: "isPrimaryForMentorship",
    networking: "isPrimaryForNetworking",
  };

  const fieldName = sectionFieldMap[section];
  return photos.find((photo) => photo[fieldName] === true) || null;
}
