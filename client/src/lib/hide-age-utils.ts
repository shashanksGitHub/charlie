/**
 * Utility functions for Hide My Age feature
 * Implements conditional logic based on premium access and profile activation status
 */

interface User {
  hideAge?: boolean | null;
  hasActivatedProfile?: boolean | null;
  premiumAccess?: boolean | null;
}

interface HideAgeOptions {
  isPremium: boolean;
}

/**
 * Determines if a user's age should be hidden based on business rules:
 * 
 * Rules:
 * 1. No Premium + No Active Profile = Age hidden (enabled by default)
 * 2. No Premium + Active Profile = Age visible (disabled and not switchable)
 * 3. Premium + Any Profile = Respects user's hideAge setting (switchable)
 */
export function shouldHideAge(user: User, options: HideAgeOptions): boolean {
  const { isPremium } = options;
  const hasActivatedMeet = user.hasActivatedProfile || false;
  
  if (!isPremium && !hasActivatedMeet) {
    // Non-premium users without active profile: hide age by default
    return true;
  } else if (!isPremium && hasActivatedMeet) {
    // Non-premium users with active profile: show age (premium required to hide)
    return false;
  } else {
    // Premium users: respect their hideAge setting, default to false
    return Boolean(user.hideAge);
  }
}

/**
 * Gets the effective hide age setting for display purposes
 * This function should be used in all components that display age
 */
export function getEffectiveHideAge(user: User, isPremium: boolean): boolean {
  return shouldHideAge(user, { isPremium });
}