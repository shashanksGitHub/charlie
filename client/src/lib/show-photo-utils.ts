/**
 * Utility functions for Show Photo toggle feature
 * Implements conditional logic based on Active MEET Profile status
 */

interface User {
  showProfilePhoto?: boolean | null;
  hasActivatedProfile?: boolean | null;
}

interface ShowPhotoOptions {
  hasActiveMeetProfile: boolean;
}

/**
 * Business Logic for Show Photo Toggle:
 * 1. No Active MEET Profile = Photo toggle switched OFF (false)
 * 2. Active MEET Profile = Respects user's showProfilePhoto setting
 */
export function getEffectiveShowPhoto(user: User, hasActiveMeetProfile: boolean): boolean {
  if (!hasActiveMeetProfile) {
    // No active MEET profile: photo should be hidden regardless of user setting
    return false;
  } else {
    // Active MEET profile: respect user's showProfilePhoto setting, default to true
    return Boolean(user.showProfilePhoto ?? true);
  }
}

/**
 * Gets the effective Show Photo value for display/business logic
 */
export function shouldDisplayPhoto(user: User, hasActiveMeetProfile: boolean): boolean {
  return getEffectiveShowPhoto(user, hasActiveMeetProfile);
}