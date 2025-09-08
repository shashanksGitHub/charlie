/**
 * Hard Filters & Deal Breakers Enforcement System
 * 
 * Implements non-negotiable filtering that takes absolute priority over diversity injection.
 * Filters are applied BEFORE candidates reach the hybrid matching engine.
 */

import type { User, UserPreference } from "@shared/schema";
import { geocodingService } from "./geocoding-service";

export interface HardFilterConfig {
  enforceAccountStatus: boolean;
  enforceAgeBoundaries: boolean;
  enforceDistanceLimits: boolean;
  enforceChildrenPreferences: boolean;
  enforceDealBreakers: boolean;
  enforceCountryPool: boolean;
  enforceHighSchoolPreferences: boolean;
}

// Religion group mappings for group-based filtering
export const RELIGION_GROUPS = {
  'christianity': [
    'christianity-roman-catholic',
    'christianity-methodist', 
    'christianity-presbyterian',
    'christianity-anglican',
    'christianity-pentecostal',
    'christianity-charismatic',
    'christianity-baptist',
    'christianity-seventh-day-adventist',
    'christianity-evangelical',
    'christianity-church-of-christ',
    'christianity-apostolic',
    'christianity-lutheran',
    'christianity-jehovahs-witness',
    'christianity-salvation-army',
    'christianity-other'
  ],
  'islam': [
    'islam-sunni',
    'islam-ahmadiyya', 
    'islam-shia',
    'islam-sufi',
    'islam-other'
  ],
  'traditional': [
    'traditional-akan',
    'traditional-ewe',
    'traditional-ga-adangme',
    'traditional-dagbani',
    'traditional-other'
  ],
  'other': [
    'other-bahai',
    'other-buddhism',
    'other-hinduism', 
    'other-judaism',
    'other-rastafarianism',
    'other-other'
  ],
  'none': [
    'none-atheist',
    'none-agnostic',
    'none-secular',
    'none-prefer-not-to-say'
  ]
} as const;

export class HardFiltersEngine {
  private currentUserPreferences: UserPreference | null = null;
  
  /**
   * Apply all hard filters to candidate pool
   * Returns only candidates who pass ALL non-negotiable criteria
   */
  async applyHardFilters(
    candidates: User[],
    currentUser: User,
    userPreferences: UserPreference | null,
    config: HardFilterConfig = {
      enforceAccountStatus: true,
      enforceAgeBoundaries: true,
      enforceDistanceLimits: true,
      enforceChildrenPreferences: true,
      enforceDealBreakers: true,
      enforceCountryPool: true,
      enforceHighSchoolPreferences: true
    }
  ): Promise<User[]> {
    console.log(`[HARD-FILTERS] Starting hard filter enforcement for user ${currentUser.id}`);
    console.log(`[HARD-FILTERS] Initial candidate pool: ${candidates.length} users`);
    
    // Store current user preferences for use in deal breaker checking
    this.currentUserPreferences = userPreferences;
    
    let filteredCandidates = [...candidates];
    const startTime = Date.now();

    // FILTER 0: Account Status Enforcement (CRITICAL SAFETY)
    if (config.enforceAccountStatus) {
      filteredCandidates = await this.filterByAccountStatus(filteredCandidates, currentUser.id);
      console.log(`[HARD-FILTERS] After account status: ${filteredCandidates.length} candidates`);
    }

    // FILTER 1: Deal Breakers Enforcement
    if (config.enforceDealBreakers && userPreferences?.dealBreakers) {
      filteredCandidates = await this.filterByDealBreakers(filteredCandidates, userPreferences);
      console.log(`[HARD-FILTERS] After deal breakers: ${filteredCandidates.length} candidates`);
    }

    // FILTER 2: Age Boundaries Enforcement
    if (config.enforceAgeBoundaries && userPreferences?.minAge && userPreferences?.maxAge) {
      filteredCandidates = this.filterByAgeBoundaries(filteredCandidates, userPreferences);
      console.log(`[HARD-FILTERS] After age boundaries: ${filteredCandidates.length} candidates`);
    }

    // FILTER 3: Distance Limits Enforcement
    if (config.enforceDistanceLimits && userPreferences?.distancePreference && userPreferences.distancePreference !== -1) {
      filteredCandidates = await this.filterByDistanceLimits(filteredCandidates, currentUser, userPreferences);
      console.log(`[HARD-FILTERS] After distance limits: ${filteredCandidates.length} candidates`);
    }

    // FILTER 4: Children Preferences Compatibility
    if (config.enforceChildrenPreferences && userPreferences) {
      filteredCandidates = this.filterByChildrenCompatibility(filteredCandidates, userPreferences);
      console.log(`[HARD-FILTERS] After children compatibility: ${filteredCandidates.length} candidates`);
    }

    // FILTER 5: MEET Country Pool Enforcement
    if (config.enforceCountryPool && userPreferences?.meetPoolCountry && userPreferences.meetPoolCountry !== 'ANYWHERE') {
      filteredCandidates = this.filterByCountryPool(filteredCandidates, userPreferences.meetPoolCountry);
      console.log(`[HARD-FILTERS] After country pool: ${filteredCandidates.length} candidates`);
    }

    // FILTER 6: High School Preferences Enforcement (Under 18 Only)
    if (config.enforceHighSchoolPreferences && userPreferences) {
      filteredCandidates = this.filterByHighSchoolPreferences(filteredCandidates, currentUser, userPreferences);
      console.log(`[HARD-FILTERS] After high school preferences: ${filteredCandidates.length} candidates`);
    }

    const duration = Date.now() - startTime;
    const filterRate = ((candidates.length - filteredCandidates.length) / candidates.length * 100).toFixed(1);
    
    console.log(`[HARD-FILTERS] ✅ Filtering complete in ${duration}ms`);
    console.log(`[HARD-FILTERS] Filtered out ${candidates.length - filteredCandidates.length} users (${filterRate}%)`);
    console.log(`[HARD-FILTERS] Final acceptable pool: ${filteredCandidates.length} candidates`);

    return filteredCandidates;
  }

  /**
   * FILTER 0: Account Status Enforcement (CRITICAL SAFETY)
   * Removes candidates with problematic account statuses:
   * - Suspended users (isSuspended = true)
   * - Hidden profiles (profileHidden = true)
   * - Inactive profiles (hasActivatedProfile = false)
   * - Blocked users (bidirectional blocking)
   */
  private async filterByAccountStatus(candidates: User[], currentUserId: number): Promise<User[]> {
    console.log(`[ACCOUNT-STATUS] Starting account status filtering on ${candidates.length} candidates`);
    
    // Import blocking utilities
    const { areUsersBlocked } = await import('./user-blocking-api');
    
    const filteredCandidates = [];
    
    for (const candidate of candidates) {
      const now = new Date();
      
      // Check 1: Suspended Users (CRITICAL)
      if (candidate.isSuspended) {
        // Check if suspension has expired
        if (candidate.suspensionExpiresAt && new Date(candidate.suspensionExpiresAt) > now) {
          console.log(`[ACCOUNT-STATUS] ❌ User ${candidate.id} is suspended until ${candidate.suspensionExpiresAt}`);
          continue; // Still suspended
        } else if (candidate.suspensionExpiresAt && new Date(candidate.suspensionExpiresAt) <= now) {
          // Suspension expired - should be handled by cleanup job, but allow through
          console.log(`[ACCOUNT-STATUS] ⚠️ User ${candidate.id} suspension expired, allowing through`);
        } else {
          // No expiry date but marked as suspended
          console.log(`[ACCOUNT-STATUS] ❌ User ${candidate.id} is suspended (no expiry date)`);
          continue;
        }
      }
      
      // Check 2: Hidden Profiles (PRIVACY)
      if (candidate.profileHidden) {
        console.log(`[ACCOUNT-STATUS] ❌ User ${candidate.id} has hidden their profile`);
        continue;
      }
      
      // Check 3: Inactive Profiles (ACTIVATION)
      if (!candidate.hasActivatedProfile) {
        console.log(`[ACCOUNT-STATUS] ❌ User ${candidate.id} has not activated their profile`);
        continue;
      }
      
      // Check 4: User Blocking (SAFETY)
      const isBlocked = await areUsersBlocked(currentUserId, candidate.id);
      if (isBlocked) {
        console.log(`[ACCOUNT-STATUS] ❌ User ${candidate.id} is blocked (bidirectional blocking)`);
        continue;
      }
      
      filteredCandidates.push(candidate); // Passed all account status checks
    }
    
    const filteredCount = candidates.length - filteredCandidates.length;
    console.log(`[ACCOUNT-STATUS] Filtered out ${filteredCount} users with problematic account status`);
    console.log(`[ACCOUNT-STATUS] Account status filter complete: ${filteredCandidates.length} candidates remaining`);
    
    return filteredCandidates;
  }

  /**
   * FILTER 1: Deal Breakers Enforcement
   * Removes candidates who match user's specified deal breakers
   */
  private async filterByDealBreakers(candidates: User[], preferences: UserPreference): Promise<User[]> {
    try {
      const dealBreakers = JSON.parse(preferences.dealBreakers || '[]');
      
      if (dealBreakers.length === 0) {
        console.log(`[DEAL-BREAKERS] No deal breakers specified`);
        return candidates;
      }

      console.log(`🔧 [UNIFIED-DEAL-BREAKERS] Applying ${dealBreakers.length} deal breakers (unified binary system):`, dealBreakers);

      const filteredCandidates = candidates.filter(candidate => {
        // Check standard deal breakers using UNIFIED BINARY SYSTEM
        for (const dealBreaker of dealBreakers) {
          if (this.candidateViolatesDealBreaker(candidate, dealBreaker)) {
            console.log(`🔧 [UNIFIED-DEAL-BREAKERS] ❌ User ${candidate.id} violates deal breaker: ${dealBreaker} (binary zero-tolerance filtering)`);
            return false;
          }
        }
        return true;
      });

      return filteredCandidates;

    } catch (error) {
      console.error(`[DEAL-BREAKERS] Error parsing deal breakers:`, error);
      return candidates; // Return all candidates if parsing fails
    }
  }

  /**
   * Check if candidate violates a specific deal breaker
   */
  private candidateViolatesDealBreaker(candidate: User, dealBreaker: string): boolean {
    switch (dealBreaker) {
      case 'smoking':
        // UNIFIED BINARY SYSTEM: Deal breaker = zero tolerance (exclude any smoking)
        // If user selected 'smoking' deal breaker, they get smokingPreference = 'no' (zero tolerance)
        const smoking = (candidate as any).smoking;
        return smoking === 'yes' || smoking === 'occasionally' || smoking === true;
      
      case 'drinking':
        // UNIFIED BINARY SYSTEM: Deal breaker = zero tolerance (exclude any drinking)
        // If user selected 'drinking' deal breaker, they get drinkingPreference = 'no' (zero tolerance)
        const drinking = (candidate as any).drinking;
        return drinking === 'yes' || drinking === 'occasionally' || drinking === 'socially' || drinking === true;
      
      case 'different_religion':
        // ENHANCED RELIGION GROUP-BASED HARD FILTER: True hard filtering with religion group compatibility
        // When user selects "different_religion" deal breaker, they only want candidates from their religion group
        return this.isReligionGroupIncompatible(candidate, this.currentUserPreferences);
        
      case 'different_religion_old':
        // LEGACY: This should be handled in religion compatibility, but can be strict here
        return false; // Let religion matching handle this with tolerance
      
      case 'no_education':
        return !(candidate as any).educationLevel || (candidate as any).educationLevel === 'no_formal_education';
      
      case 'different_tribe':
        // This should be handled in ethnicity matching
        return false; // Let ethnicity matching handle this
      
      case 'long_distance':
        // LONG DISTANCE DEAL BREAKER: Enhanced strict distance filtering
        // This creates stricter distance requirements beyond the basic distance preference
        // When selected, it applies additional distance constraints for zero tolerance
        return false; // Enhanced filtering implemented in Filter 3 (Distance Limits)
      
      case 'has_children':
        // UNIFIED CHILDREN SYSTEM: Deal breaker = zero tolerance (exclude candidates with children)
        // If user selected 'has_children' deal breaker, they don't want to see anyone with children
        return (candidate as any).hasChildren === true || (candidate as any).hasChildren === 'yes';
      
      default:
        // Handle custom deal breakers (would need to implement custom logic)
        console.log(`[DEAL-BREAKERS] Unknown deal breaker: ${dealBreaker}`);
        return false;
    }
  }

  /**
   * FILTER 2: Age Boundaries Enforcement
   * Removes candidates outside specified age range
   */
  private filterByAgeBoundaries(candidates: User[], preferences: UserPreference): User[] {
    const minAge = preferences.minAge;
    const maxAge = preferences.maxAge;

    if (!minAge || !maxAge) {
      console.log(`[AGE-BOUNDARIES] No age boundaries specified`);
      return candidates;
    }

    console.log(`[AGE-BOUNDARIES] Enforcing age range: ${minAge}-${maxAge} years`);

    const filteredCandidates = candidates.filter(candidate => {
      if (!candidate.dateOfBirth) {
        console.log(`[AGE-BOUNDARIES] ❌ User ${candidate.id} has no birth date`);
        return false;
      }

      const candidateAge = this.calculateAge(candidate.dateOfBirth);
      const withinRange = candidateAge >= minAge && candidateAge <= maxAge;

      if (!withinRange) {
        console.log(`[AGE-BOUNDARIES] ❌ User ${candidate.id} age ${candidateAge} outside range ${minAge}-${maxAge}`);
      }

      return withinRange;
    });

    return filteredCandidates;
  }

  /**
   * FILTER 3: Distance Limits Enforcement
   * Removes candidates beyond specified distance preference
   * Enhanced with "Long Distance" deal breaker for stricter filtering
   */
  private async filterByDistanceLimits(
    candidates: User[], 
    currentUser: User, 
    preferences: UserPreference
  ): Promise<User[]> {
    const distancePreferenceMiles = preferences.distancePreference;

    // Check if long distance deal breaker is active
    let dealBreakers: string[] = [];
    let hasLongDistanceDealBreaker = false;
    try {
      dealBreakers = preferences.dealBreakers ? JSON.parse(preferences.dealBreakers) : [];
      hasLongDistanceDealBreaker = dealBreakers.includes('long_distance');
    } catch {
      dealBreakers = [];
    }

    if (!distancePreferenceMiles || distancePreferenceMiles === -1) {
      if (hasLongDistanceDealBreaker) {
        // Long distance deal breaker with no distance limit = enforce strict local limit
        console.log(`[DISTANCE-LIMITS] Long distance deal breaker active: enforcing strict 25 mile limit despite "no limit" preference`);
        // Apply strict 25 mile limit when long distance deal breaker is active
      } else {
        console.log(`[DISTANCE-LIMITS] No distance limit specified or unlimited`);
        return candidates;
      }
    }

    // Calculate effective distance limit with long distance deal breaker enhancement
    let effectiveDistanceMiles: number = distancePreferenceMiles || 25; // Default to 25 if null/undefined
    let maxDistanceKm: number;
    
    if (hasLongDistanceDealBreaker) {
      // LONG DISTANCE DEAL BREAKER LOGIC: Make distance filtering stricter
      if (!distancePreferenceMiles || distancePreferenceMiles === -1) {
        effectiveDistanceMiles = 25; // Force 25 mile limit when no preference set
      } else if (distancePreferenceMiles >= 999999) {
        effectiveDistanceMiles = 100; // Reduce country-level to 100 miles
      } else {
        effectiveDistanceMiles = Math.min(distancePreferenceMiles * 0.6, 50); // Reduce by 40%, max 50 miles
      }
      console.log(`[DISTANCE-LIMITS] Long distance deal breaker active: reducing ${distancePreferenceMiles || 'unlimited'} → ${effectiveDistanceMiles} miles`);
    }
    
    if (effectiveDistanceMiles >= 999999) {
      // "Within my country" option - use very large radius
      maxDistanceKm = 999999;
      console.log(`[DISTANCE-LIMITS] Country-level filtering: ${maxDistanceKm}km`);
    } else {
      // Convert miles to kilometers: 1 mile = 1.60934 km
      maxDistanceKm = Math.round(effectiveDistanceMiles * 1.60934);
      console.log(`[DISTANCE-LIMITS] Converting ${effectiveDistanceMiles} miles → ${maxDistanceKm}km`);
    }

    const dealBreakerNote = hasLongDistanceDealBreaker ? " (enhanced by long_distance deal breaker)" : "";
    console.log(`[DISTANCE-LIMITS] Enforcing maximum distance: ${maxDistanceKm}km${dealBreakerNote}`);

    // Get current user coordinates
    const userCoordinates = await geocodingService.getCoordinates(currentUser.location || '');
    if (!userCoordinates) {
      console.log(`[DISTANCE-LIMITS] ⚠️ Cannot get coordinates for user location: ${currentUser.location}`);
      return candidates; // Return all if we can't calculate distances
    }

    const filteredCandidates = [];

    for (const candidate of candidates) {
      if (!candidate.location) {
        console.log(`[DISTANCE-LIMITS] ❌ User ${candidate.id} has no location`);
        continue;
      }

      const candidateCoordinates = await geocodingService.getCoordinates(candidate.location);
      if (!candidateCoordinates) {
        console.log(`[DISTANCE-LIMITS] ⚠️ Cannot get coordinates for candidate location: ${candidate.location}`);
        continue;
      }

      const distance = this.calculateDistance(
        userCoordinates.coordinates.latitude, userCoordinates.coordinates.longitude,
        candidateCoordinates.coordinates.latitude, candidateCoordinates.coordinates.longitude
      );

      if (distance <= maxDistanceKm) {
        filteredCandidates.push(candidate);
      } else {
        const dealBreakerLog = hasLongDistanceDealBreaker ? " [LONG-DISTANCE-DEAL-BREAKER]" : "";
        console.log(`[DISTANCE-LIMITS]${dealBreakerLog} ❌ User ${candidate.id} distance ${distance.toFixed(1)}km > ${maxDistanceKm}km (${effectiveDistanceMiles} miles effective limit)`);
      }
    }

    return filteredCandidates;
  }

  /**
   * FILTER 4: Has Children Compatibility Only
   * Handles only "hasChildren" preference for binary compatibility matching
   * NOTE: "wantsChildren" is NOT filtered here - it's handled in matching algorithm scoring
   */
  private filterByChildrenCompatibility(candidates: User[], preferences: UserPreference): User[] {
    const hasChildrenPref = preferences.hasChildrenPreference;

    // If user has deal breakers for children, this filter is skipped (already handled in Filter 1)
    let dealBreakers: string[] = [];
    try {
      dealBreakers = preferences.dealBreakers ? JSON.parse(preferences.dealBreakers) : [];
    } catch {
      dealBreakers = [];
    }
    
    if (dealBreakers.includes('has_children')) {
      console.log(`[CHILDREN-COMPATIBILITY] Skipping - 'has_children' deal breaker active in Filter 1`);
      return candidates;
    }

    if (!hasChildrenPref) {
      console.log(`[CHILDREN-COMPATIBILITY] No hasChildren preference specified`);
      return candidates;
    }

    console.log(`[CHILDREN-COMPATIBILITY] Enforcing hasChildren preference: ${hasChildrenPref}`);

    const filteredCandidates = candidates.filter(candidate => {
      // Check hasChildren preference (only if not a deal breaker)
      if (hasChildrenPref && hasChildrenPref !== 'any') {
        const candidateHasChildren = this.normalizeBoolean((candidate as any).hasChildren);
        const preferenceHasChildren = hasChildrenPref === 'yes';

        if (candidateHasChildren !== preferenceHasChildren) {
          console.log(`[CHILDREN-COMPATIBILITY] ❌ User ${candidate.id} hasChildren mismatch: ${candidateHasChildren} vs wanted ${preferenceHasChildren}`);
          return false;
        }
      }

      // NOTE: wantsChildren is NOT filtered in hard filters
      // It's handled in the matching algorithm for compatibility scoring
      // This allows nuanced scoring rather than binary exclusion

      return true;
    });

    return filteredCandidates;
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if user is under 18 years old
   */
  private isUnder18(dateOfBirth: Date | string | null): boolean {
    if (!dateOfBirth) return false;
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    return this.calculateAge(birthDate) < 18;
  }

  /**
   * FILTER 6: High School Preferences Enforcement (Under 18 Only)
   * For users under 18, filters candidates based on high school preferences
   * "ANY SCHOOL" means candidates can come from any or no high school
   */
  private filterByHighSchoolPreferences(candidates: User[], currentUser: User, preferences: UserPreference): User[] {
    // Only apply this filter for users under 18
    if (!this.isUnder18(currentUser.dateOfBirth)) {
      console.log(`[HIGH-SCHOOL-PREFERENCES] User ${currentUser.id} is 18+, skipping high school filtering`);
      return candidates;
    }

    const highSchoolPref = preferences.highSchoolPreference;
    if (!highSchoolPref) {
      console.log(`[HIGH-SCHOOL-PREFERENCES] No high school preference set for user ${currentUser.id}`);
      return candidates;
    }

    let preferredSchools: string[] = [];
    try {
      preferredSchools = JSON.parse(highSchoolPref);
    } catch {
      console.log(`[HIGH-SCHOOL-PREFERENCES] Invalid JSON in high school preference: ${highSchoolPref}`);
      return candidates;
    }

    // If "ANY SCHOOL" is selected, allow all candidates (no filtering)
    if (preferredSchools.includes("ANY SCHOOL")) {
      console.log(`[HIGH-SCHOOL-PREFERENCES] "ANY SCHOOL" selected - allowing all candidates`);
      return candidates;
    }

    if (preferredSchools.length === 0) {
      console.log(`[HIGH-SCHOOL-PREFERENCES] Empty high school preferences - allowing all candidates`);
      return candidates;
    }

    console.log(`[HIGH-SCHOOL-PREFERENCES] Filtering by preferred schools: [${preferredSchools.join(', ')}]`);

    const filteredCandidates = candidates.filter(candidate => {
      // Only filter other users under 18
      if (!this.isUnder18(candidate.dateOfBirth)) {
        console.log(`[HIGH-SCHOOL-PREFERENCES] ✅ User ${candidate.id} is 18+, passing through`);
        return true;
      }

      const candidateHighSchool = (candidate as any).highSchool;
      
      // If candidate has no high school, they pass through when "ANY SCHOOL" would be acceptable
      if (!candidateHighSchool) {
        console.log(`[HIGH-SCHOOL-PREFERENCES] ✅ User ${candidate.id} has no high school - allowed through`);
        return true;
      }

      // Check if candidate's high school matches any preferred schools
      const isMatch = preferredSchools.some(school => 
        school.toLowerCase() === candidateHighSchool.toLowerCase()
      );

      if (isMatch) {
        console.log(`[HIGH-SCHOOL-PREFERENCES] ✅ User ${candidate.id} high school "${candidateHighSchool}" matches preferences`);
        return true;
      } else {
        console.log(`[HIGH-SCHOOL-PREFERENCES] ❌ User ${candidate.id} high school "${candidateHighSchool}" not in preferred list`);
        return false;
      }
    });

    return filteredCandidates;
  }

  /**
   * Helper: Calculate distance using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Normalize boolean values from various formats
   */
  private normalizeBoolean(value: any): boolean {
    if (value === true || value === 'yes' || value === 'true') return true;
    // All other values (false, 'no', 'false', null, undefined, '') treated as false
    return false;
  }

  /**
   * FILTER 5: MEET Country Pool Enforcement
   * Removes candidates who don't match the user's geographic preference
   * "Where should love come from?" field enforcement
   */
  private filterByCountryPool(candidates: User[], poolCountry: string): User[] {
    console.log(`[COUNTRY-POOL] Filtering by pool country: ${poolCountry}`);
    console.log(`[COUNTRY-POOL] Initial candidates: ${candidates.length}`);

    if (!poolCountry || poolCountry === 'ANYWHERE') {
      console.log(`[COUNTRY-POOL] Pool country is ANYWHERE - no filtering needed`);
      return candidates;
    }

    const filteredCandidates = candidates.filter(candidate => {
      // Extract candidate's country identities from profile fields
      const candidateIdentities = this.extractCountryIdentities(candidate);
      
      // Check if any candidate identity matches the pool country preference
      const isMatch = Array.from(candidateIdentities).some(identity => 
        identity.toLowerCase().includes(poolCountry.toLowerCase()) ||
        poolCountry.toLowerCase().includes(identity.toLowerCase())
      );

      if (isMatch) {
        console.log(`[COUNTRY-POOL] ✅ User ${candidate.id} matches pool country ${poolCountry}: ${Array.from(candidateIdentities).join(', ')}`);
      } else {
        console.log(`[COUNTRY-POOL] ❌ User ${candidate.id} filtered out - identities [${Array.from(candidateIdentities).join(', ')}] don't match pool country ${poolCountry}`);
      }

      return isMatch;
    });

    console.log(`[COUNTRY-POOL] Filtering complete: ${filteredCandidates.length}/${candidates.length} candidates passed`);
    return filteredCandidates;
  }

  /**
   * Helper: Extract country identities from user profile
   * Gets countries from countryOfOrigin, location, and nationality fields
   */
  private extractCountryIdentities(user: User): Set<string> {
    const identities = new Set<string>();

    // Add country of origin
    if (user.countryOfOrigin) {
      identities.add(user.countryOfOrigin.trim());
    }

    // Add location (extract country from "City, State, Country" format)
    if (user.location) {
      const locationParts = user.location.split(',').map(part => part.trim());
      if (locationParts.length >= 1) {
        // Add the last part as country
        identities.add(locationParts[locationParts.length - 1]);
      }
      if (locationParts.length >= 2) {
        // Also add second-to-last part (could be state/region)
        identities.add(locationParts[locationParts.length - 2]);
      }
    }

    // Add country of origin variants (since there's no nationality field in User schema)
    // Use countryOfOrigin as the primary country identifier
    if (user.countryOfOrigin) {
      const countryFromOrigin = this.convertNationalityToCountry(user.countryOfOrigin);
      if (countryFromOrigin) {
        identities.add(countryFromOrigin);
      }
    }

    // Remove empty strings
    identities.delete('');
    
    return identities;
  }

  /**
   * Helper: Convert nationality to country name
   * Maps nationalities like "Nigerian" to "Nigeria"
   */
  private convertNationalityToCountry(nationality: string): string | null {
    const nationalityToCountry: Record<string, string> = {
      'American': 'USA',
      'Nigerian': 'Nigeria',
      'Ghanaian': 'Ghana',
      'British': 'UK',
      'Spanish': 'Spain',
      'German': 'Germany',
      'French': 'France',
      'Italian': 'Italy',
      'Dutch': 'Netherlands',
      'Canadian': 'Canada',
      'Mexican': 'Mexico',
      'Brazilian': 'Brazil',
      'Argentine': 'Argentina',
      'Chilean': 'Chile',
      'Colombian': 'Colombia',
      'Peruvian': 'Peru',
      'Venezuelan': 'Venezuela',
      'Ecuadorian': 'Ecuador',
      'Bolivian': 'Bolivia',
      'Uruguayan': 'Uruguay',
      'Paraguayan': 'Paraguay'
    };

    return nationalityToCountry[nationality] || null;
  }

  /**
   * ENHANCED RELIGION GROUP-BASED FILTERING
   * Check if candidate's religion is incompatible with user's religion group
   * Returns true if candidate should be filtered out (incompatible)
   */
  private isReligionGroupIncompatible(candidate: User, preferences: UserPreference | null): boolean {
    if (!preferences?.religionPreference || !candidate.religion) {
      console.log(`[RELIGION-GROUP-FILTER] Missing data - user prefs: ${!!preferences?.religionPreference}, candidate religion: ${!!candidate.religion}`);
      return false; // Don't filter if we don't have enough data
    }

    try {
      // Parse user's religion preferences (should be array of religion values)
      let userReligionPrefs: string[] = [];
      try {
        userReligionPrefs = JSON.parse(preferences.religionPreference);
      } catch {
        // Fallback to treating as single religion string
        userReligionPrefs = [preferences.religionPreference];
      }

      if (userReligionPrefs.length === 0) {
        console.log(`[RELIGION-GROUP-FILTER] No religion preferences specified`);
        return false; // Don't filter if no preferences
      }

      // Find which religion group(s) the user belongs to
      const userReligionGroups = this.getUserReligionGroups(userReligionPrefs);
      
      // Find which religion group the candidate belongs to
      const candidateReligionGroup = this.getCandidateReligionGroup(candidate.religion);

      if (!candidateReligionGroup) {
        console.log(`[RELIGION-GROUP-FILTER] ⚠️ Candidate religion "${candidate.religion}" not found in any group - allowing through`);
        return false; // Don't filter unknown religions
      }

      // Check if candidate's religion group matches any of user's religion groups
      const isCompatible = userReligionGroups.includes(candidateReligionGroup);
      
      if (!isCompatible) {
        console.log(`[RELIGION-GROUP-FILTER] ❌ User ${candidate.id} filtered - candidate group "${candidateReligionGroup}" not in user groups [${userReligionGroups.join(', ')}]`);
      } else {
        console.log(`[RELIGION-GROUP-FILTER] ✅ User ${candidate.id} compatible - candidate group "${candidateReligionGroup}" matches user groups [${userReligionGroups.join(', ')}]`);
      }

      return !isCompatible; // Return true to filter out (incompatible)
      
    } catch (error) {
      console.error(`[RELIGION-GROUP-FILTER] Error processing religion compatibility:`, error);
      return false; // Don't filter on error
    }
  }

  /**
   * Get religion groups for user's preferences
   */
  private getUserReligionGroups(userReligionPrefs: string[]): string[] {
    const groups = new Set<string>();
    
    for (const religionValue of userReligionPrefs) {
      for (const [groupName, denominations] of Object.entries(RELIGION_GROUPS)) {
        if ((denominations as readonly string[]).includes(religionValue)) {
          groups.add(groupName);
          break;
        }
      }
    }
    
    return Array.from(groups);
  }

  /**
   * Get religion group for candidate's religion
   */
  private getCandidateReligionGroup(candidateReligion: string): string | null {
    for (const [groupName, denominations] of Object.entries(RELIGION_GROUPS)) {
      if ((denominations as readonly string[]).includes(candidateReligion)) {
        return groupName;
      }
    }
    
    // Handle global religions (community added) - treat as separate group
    if (candidateReligion.startsWith('global-')) {
      return 'global';
    }
    
    return null;
  }

  /**
   * Get filtering statistics for debugging
   */
  async getFilteringStats(
    candidates: User[],
    currentUser: User,
    userPreferences: UserPreference | null
  ): Promise<{
    total: number;
    afterDealBreakers: number;
    afterAgeBoundaries: number;
    afterDistanceLimits: number;
    afterChildrenFilters: number;
    afterCountryPool: number;
    afterHighSchoolPreferences: number;
    filteringRate: number;
  }> {
    if (!userPreferences) {
      return {
        total: candidates.length,
        afterDealBreakers: candidates.length,
        afterAgeBoundaries: candidates.length,
        afterDistanceLimits: candidates.length,
        afterChildrenFilters: candidates.length,
        afterCountryPool: candidates.length,
        afterHighSchoolPreferences: candidates.length,
        filteringRate: 0
      };
    }

    let filtered = [...candidates];
    const stats = { total: candidates.length } as any;

    // Apply each filter and track results
    if (userPreferences.dealBreakers) {
      filtered = await this.filterByDealBreakers(filtered, userPreferences);
      stats.afterDealBreakers = filtered.length;
    } else {
      stats.afterDealBreakers = filtered.length;
    }

    if (userPreferences.minAge && userPreferences.maxAge) {
      filtered = this.filterByAgeBoundaries(filtered, userPreferences);
      stats.afterAgeBoundaries = filtered.length;
    } else {
      stats.afterAgeBoundaries = filtered.length;
    }

    if (userPreferences.distancePreference && userPreferences.distancePreference !== -1) {
      filtered = await this.filterByDistanceLimits(filtered, currentUser, userPreferences);
      stats.afterDistanceLimits = filtered.length;
    } else {
      stats.afterDistanceLimits = filtered.length;
    }

    filtered = this.filterByChildrenCompatibility(filtered, userPreferences);
    stats.afterChildrenFilters = filtered.length;

    if (userPreferences.meetPoolCountry && userPreferences.meetPoolCountry !== 'ANYWHERE') {
      filtered = this.filterByCountryPool(filtered, userPreferences.meetPoolCountry);
      stats.afterCountryPool = filtered.length;
    } else {
      stats.afterCountryPool = filtered.length;
    }

    // Filter 6: High School Preferences (Under 18 Only)
    filtered = this.filterByHighSchoolPreferences(filtered, currentUser, userPreferences);
    stats.afterHighSchoolPreferences = filtered.length;

    stats.filteringRate = ((candidates.length - filtered.length) / candidates.length * 100);

    return stats;
  }
}

// Export singleton instance
export const hardFiltersEngine = new HardFiltersEngine();