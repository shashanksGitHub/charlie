import { apiRequest } from "@/lib/queryClient";



/**
 * Upload a profile photo image (base64 data) to the server
 * @param photoData Base64 image data
 * @param photoId Optional photo ID for updating an existing photo instead of creating a new one
 * @returns Promise resolving to the uploaded or updated photo data
 */
export async function uploadProfilePhoto(photoData: string, photoId?: number) {
  try {
    const response = await apiRequest('/api/profile/photo', {
      method: 'POST',
      data: { photoData, photoId }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error uploading profile photo: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in uploadProfilePhoto:', error);
    throw error;
  }
}

/**
 * Set a photo as the primary profile photo
 * @param photoId The ID of the photo to set as primary
 * @returns Promise resolving to the updated photo data
 */
export async function setPrimaryPhoto(photoId: number) {
  try {
    const response = await apiRequest(`/api/photos/${photoId}/primary`, {
      method: 'PATCH'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error setting primary photo: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in setPrimaryPhoto:', error);
    throw error;
  }
}

/**
 * Delete a user photo
 * @param photoId The ID of the photo to delete
 * @returns Promise resolving when the photo is deleted
 */
export async function deleteUserPhoto(photoId: number) {
  try {
    const response = await apiRequest(`/api/photos/${photoId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error deleting photo: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteUserPhoto:', error);
    throw error;
  }
}

/**
 * Get all photos for a user
 * @param userId The user ID
 * @returns Promise resolving to an array of user photos
 */
export async function getUserPhotos(userId: number) {
  try {
    const response = await apiRequest(`/api/photos/${userId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error getting user photos: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getUserPhotos:', error);
    throw error;
  }
}

/**
 * Get a specific photo by its ID
 * @param photoId The ID of the photo to retrieve
 * @returns Promise resolving to the photo data
 */
export async function getPhotoById(photoId: number) {
  try {
    const response = await apiRequest(`/api/photos/single/${photoId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error getting photo: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getPhotoById:', error);
    throw error;
  }
}