/**
 * GEOCODING SERVICE FOR DISTANCE CALCULATIONS
 * 
 * Enhanced geocoding service using Google Places API for real-time location data
 * and provides distance calculations using the Haversine formula.
 * Includes caching, fallback coordinates, and comprehensive location parsing.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationData {
  coordinates: Coordinates;
  city?: string;
  country?: string;
  timezone?: string;
  timezoneOffset?: number; // UTC offset in hours
  confidence: number; // 0-1 scale
  source: 'google-places' | 'precise' | 'fallback' | 'approximate';
}

interface TimezoneCompatibility {
  score: number; // 0-1 compatibility score
  hoursDifference: number; // Absolute hours difference
  overlappingHours: number[]; // Hours that overlap for both users
  compatibility: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
}

interface GooglePlacesResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    place_id: string;
  }>;
  status: string;
}

export class GeocodingService {
  private coordinateCache = new Map<string, LocationData>();
  private readonly googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
  
  /**
   * TIMEZONE API INTEGRATION
   * Get timezone information from coordinates using Google Timezone API
   */
  private async getTimezoneFromCoordinates(lat: number, lng: number): Promise<{ timezone: string; offset: number } | null> {
    try {
      if (!this.googlePlacesApiKey) {
        return null;
      }

      const timestamp = Math.floor(Date.now() / 1000); // Current timestamp
      const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${this.googlePlacesApiKey}`;
      
      console.log(`[TIMEZONE] Getting timezone for coordinates: ${lat}, ${lng}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const rawOffset = data.rawOffset / 3600; // Convert seconds to hours
        const dstOffset = data.dstOffset / 3600; // Convert seconds to hours
        const totalOffset = rawOffset + dstOffset;
        
        console.log(`[TIMEZONE] Success: ${data.timeZoneId}, offset: ${totalOffset}h`);
        
        return {
          timezone: data.timeZoneId,
          offset: totalOffset
        };
      } else {
        console.log(`[TIMEZONE] API returned status: ${data.status}`);
        return null;
      }
      
    } catch (error) {
      console.error(`[TIMEZONE] Error getting timezone:`, error);
      return null;
    }
  }

  /**
   * GOOGLE PLACES API GEOCODING
   * Real-time location lookup using Google Places API for global coverage
   */
  private async geocodeWithGooglePlaces(location: string): Promise<LocationData | null> {
    try {
      if (!this.googlePlacesApiKey) {
        console.log('[GEOCODING] Google Places API key not found, using fallback database');
        return null;
      }

      const encodedLocation = encodeURIComponent(location);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${this.googlePlacesApiKey}`;
      
      console.log(`[GEOCODING] Geocoding "${location}" with Google Places API`);
      
      const response = await fetch(url);
      const data = await response.json() as GooglePlacesResponse;
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        
        // Extract city and country from address components
        let city: string | undefined;
        let country: string | undefined;
        
        for (const component of result.address_components) {
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_1')) {
            city = component.long_name;
          }
          if (component.types.includes('country')) {
            country = component.long_name;
          }
        }
        
        // Get timezone information for the coordinates
        const timezoneInfo = await this.getTimezoneFromCoordinates(lat, lng);
        
        const locationData: LocationData = {
          coordinates: { latitude: lat, longitude: lng },
          city,
          country,
          timezone: timezoneInfo?.timezone,
          timezoneOffset: timezoneInfo?.offset,
          confidence: 0.95, // High confidence for Google Places API
          source: 'google-places'
        };
        
        console.log(`[GEOCODING] Successfully geocoded "${location}": ${lat}, ${lng} (${city}, ${country}, ${timezoneInfo?.timezone})`);
        return locationData;
        
      } else {
        console.log(`[GEOCODING] Google Places API returned status: ${data.status} for "${location}"`);
        return null;
      }
      
    } catch (error) {
      console.error(`[GEOCODING] Error with Google Places API for "${location}":`, error);
      return null;
    }
  }

  /**
   * Fallback location coordinate database for offline/backup scenarios
   */
  private readonly fallbackLocationDatabase: Record<string, LocationData> = {
    // Major US Cities
    'richardson, tx, usa': { coordinates: { latitude: 32.9483, longitude: -96.7299 }, city: 'Richardson', country: 'USA', confidence: 0.95, source: 'precise' },
    'dallas, tx, usa': { coordinates: { latitude: 32.7767, longitude: -96.7970 }, city: 'Dallas', country: 'USA', confidence: 0.95, source: 'precise' },
    'houston, tx, usa': { coordinates: { latitude: 29.7604, longitude: -95.3698 }, city: 'Houston', country: 'USA', confidence: 0.95, source: 'precise' },
    'austin, tx, usa': { coordinates: { latitude: 30.2672, longitude: -97.7431 }, city: 'Austin', country: 'USA', confidence: 0.95, source: 'precise' },
    'new york, ny, usa': { coordinates: { latitude: 40.7128, longitude: -74.0060 }, city: 'New York', country: 'USA', confidence: 0.95, source: 'precise' },
    'los angeles, ca, usa': { coordinates: { latitude: 34.0522, longitude: -118.2437 }, city: 'Los Angeles', country: 'USA', confidence: 0.95, source: 'precise' },
    'chicago, il, usa': { coordinates: { latitude: 41.8781, longitude: -87.6298 }, city: 'Chicago', country: 'USA', confidence: 0.95, source: 'precise' },
    'miami, fl, usa': { coordinates: { latitude: 25.7617, longitude: -80.1918 }, city: 'Miami', country: 'USA', confidence: 0.95, source: 'precise' },
    
    // European Cities  
    'madrid, spain': { coordinates: { latitude: 40.4168, longitude: -3.7038 }, city: 'Madrid', country: 'Spain', confidence: 0.95, source: 'precise' },
    'barcelona, spain': { coordinates: { latitude: 41.3851, longitude: 2.1734 }, city: 'Barcelona', country: 'Spain', confidence: 0.95, source: 'precise' },
    'berlin, germany': { coordinates: { latitude: 52.5200, longitude: 13.4050 }, city: 'Berlin', country: 'Germany', confidence: 0.95, source: 'precise' },
    'munich, germany': { coordinates: { latitude: 48.1351, longitude: 11.5820 }, city: 'Munich', country: 'Germany', confidence: 0.95, source: 'precise' },
    'london, uk': { coordinates: { latitude: 51.5074, longitude: -0.1278 }, city: 'London', country: 'UK', confidence: 0.95, source: 'precise' },
    'manchester, uk': { coordinates: { latitude: 53.4808, longitude: -2.2426 }, city: 'Manchester', country: 'UK', confidence: 0.95, source: 'precise' },
    'paris, france': { coordinates: { latitude: 48.8566, longitude: 2.3522 }, city: 'Paris', country: 'France', confidence: 0.95, source: 'precise' },
    'rome, italy': { coordinates: { latitude: 41.9028, longitude: 12.4964 }, city: 'Rome', country: 'Italy', confidence: 0.95, source: 'precise' },
    'amsterdam, netherlands': { coordinates: { latitude: 52.3676, longitude: 4.9041 }, city: 'Amsterdam', country: 'Netherlands', confidence: 0.95, source: 'precise' },
    
    // African Cities
    'accra, ghana': { coordinates: { latitude: 5.6037, longitude: -0.1870 }, city: 'Accra', country: 'Ghana', confidence: 0.95, source: 'precise' },
    'kumasi, ghana': { coordinates: { latitude: 6.6885, longitude: -1.6244 }, city: 'Kumasi', country: 'Ghana', confidence: 0.95, source: 'precise' },
    'tamale, ghana': { coordinates: { latitude: 9.4075, longitude: -0.8533 }, city: 'Tamale', country: 'Ghana', confidence: 0.95, source: 'precise' },
    'lagos, nigeria': { coordinates: { latitude: 6.5244, longitude: 3.3792 }, city: 'Lagos', country: 'Nigeria', confidence: 0.95, source: 'precise' },
    'abuja, nigeria': { coordinates: { latitude: 9.0765, longitude: 7.3986 }, city: 'Abuja', country: 'Nigeria', confidence: 0.95, source: 'precise' },
    'kano, nigeria': { coordinates: { latitude: 12.0022, longitude: 8.5920 }, city: 'Kano', country: 'Nigeria', confidence: 0.95, source: 'precise' },
    
    // Canadian Cities
    'toronto, canada': { coordinates: { latitude: 43.6532, longitude: -79.3832 }, city: 'Toronto', country: 'Canada', confidence: 0.95, source: 'precise' },
    'vancouver, canada': { coordinates: { latitude: 49.2827, longitude: -123.1207 }, city: 'Vancouver', country: 'Canada', confidence: 0.95, source: 'precise' },
    'montreal, canada': { coordinates: { latitude: 45.5019, longitude: -73.5674 }, city: 'Montreal', country: 'Canada', confidence: 0.95, source: 'precise' },
    
    // Country Fallbacks (approximate center coordinates)
    'usa': { coordinates: { latitude: 39.8283, longitude: -98.5795 }, city: undefined, country: 'USA', confidence: 0.6, source: 'fallback' },
    'united states': { coordinates: { latitude: 39.8283, longitude: -98.5795 }, city: undefined, country: 'USA', confidence: 0.6, source: 'fallback' },
    'spain': { coordinates: { latitude: 40.4637, longitude: -3.7492 }, city: undefined, country: 'Spain', confidence: 0.6, source: 'fallback' },
    'germany': { coordinates: { latitude: 51.1657, longitude: 10.4515 }, city: undefined, country: 'Germany', confidence: 0.6, source: 'fallback' },
    'ghana': { coordinates: { latitude: 7.9465, longitude: -1.0232 }, city: undefined, country: 'Ghana', confidence: 0.6, source: 'fallback' },
    'nigeria': { coordinates: { latitude: 9.0820, longitude: 8.6753 }, city: undefined, country: 'Nigeria', confidence: 0.6, source: 'fallback' },
    'uk': { coordinates: { latitude: 55.3781, longitude: -3.4360 }, city: undefined, country: 'UK', confidence: 0.6, source: 'fallback' },
    'united kingdom': { coordinates: { latitude: 55.3781, longitude: -3.4360 }, city: undefined, country: 'UK', confidence: 0.6, source: 'fallback' },
    'france': { coordinates: { latitude: 46.6034, longitude: 1.8883 }, city: undefined, country: 'France', confidence: 0.6, source: 'fallback' },
    'italy': { coordinates: { latitude: 41.8719, longitude: 12.5674 }, city: undefined, country: 'Italy', confidence: 0.6, source: 'fallback' },
    'netherlands': { coordinates: { latitude: 52.1326, longitude: 5.2913 }, city: undefined, country: 'Netherlands', confidence: 0.6, source: 'fallback' },
    'canada': { coordinates: { latitude: 56.1304, longitude: -106.3468 }, city: undefined, country: 'Canada', confidence: 0.6, source: 'fallback' }
  };

  /**
   * Get coordinates for a location string
   */
  async getCoordinates(location: string): Promise<LocationData | null> {
    if (!location || location.trim() === '') {
      return null;
    }

    const locationKey = this.normalizeLocationString(location);
    console.log(`[GEOCODING] Looking up coordinates for: "${location}" → normalized: "${locationKey}"`);

    // Check cache first
    if (this.coordinateCache.has(locationKey)) {
      const cached = this.coordinateCache.get(locationKey)!;
      console.log(`[GEOCODING] Cache hit: ${cached.coordinates.latitude}, ${cached.coordinates.longitude} (${cached.source})`);
      return cached;
    }

    // Check location database (async now with Google Places API)
    const locationData = await this.findLocationInDatabase(locationKey);
    if (locationData) {
      this.coordinateCache.set(locationKey, locationData);
      console.log(`[GEOCODING] Location found: ${locationData.coordinates.latitude}, ${locationData.coordinates.longitude} (${locationData.source})`);
      return locationData;
    }

    // Try parsing as structured location
    const parsedLocation = this.parseStructuredLocation(location);
    if (parsedLocation) {
      this.coordinateCache.set(locationKey, parsedLocation);
      console.log(`[GEOCODING] Parsed location: ${parsedLocation.coordinates.latitude}, ${parsedLocation.coordinates.longitude} (${parsedLocation.source})`);
      return parsedLocation;
    }

    console.log(`[GEOCODING] No coordinates found for: "${location}"`);
    return null;
  }

  /**
   * Normalize location string for consistent matching
   */
  private normalizeLocationString(location: string): string {
    return location
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[,]+/g, ',')
      .replace(/\s*,\s*/g, ', ');
  }

  /**
   * Find location using Google Places API first, then fallback database
   */
  private async findLocationInDatabase(normalizedLocation: string): Promise<LocationData | null> {
    // Try Google Places API first
    const googleResult = await this.geocodeWithGooglePlaces(normalizedLocation);
    if (googleResult) {
      return googleResult;
    }

    // Fallback to local database
    // Direct match
    if (this.fallbackLocationDatabase[normalizedLocation]) {
      return this.fallbackLocationDatabase[normalizedLocation];
    }

    // Fuzzy matching - try various combinations
    for (const [key, data] of Object.entries(this.fallbackLocationDatabase)) {
      // Check if location contains key or key contains location
      if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
        return data;
      }

      // Check individual parts
      const locationParts = normalizedLocation.split(',').map(p => p.trim());
      const keyParts = key.split(',').map(p => p.trim());

      // Check if any part matches
      const hasMatch = locationParts.some(part => 
        keyParts.some(keyPart => 
          part.includes(keyPart) || keyPart.includes(part)
        )
      );

      if (hasMatch) {
        return { ...data, confidence: data.confidence * 0.8, source: 'approximate' as const };
      }
    }

    return null;
  }

  /**
   * Parse structured location (City, State, Country format)
   */
  private parseStructuredLocation(location: string): LocationData | null {
    const parts = location.split(',').map(p => p.trim().toLowerCase());
    
    if (parts.length >= 2) {
      // Try country-level fallback for multi-part locations
      const lastPart = parts[parts.length - 1];
      const countryData = this.fallbackLocationDatabase[lastPart];
      
      if (countryData) {
        return {
          ...countryData,
          confidence: countryData.confidence * 0.7,
          source: 'approximate' as const
        };
      }
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    
    const lat1Rad = this.toRadians(coord1.latitude);
    const lat2Rad = this.toRadians(coord2.latitude);
    const deltaLatRad = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLonRad = this.toRadians(coord2.longitude - coord1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate distance between two location strings
   */
  async calculateLocationDistance(location1: string, location2: string): Promise<{
    distance: number | null;
    confidence: number;
    details: {
      location1Data: LocationData | null;
      location2Data: LocationData | null;
    };
  }> {
    console.log(`[DISTANCE-CALC] Calculating distance between "${location1}" and "${location2}"`);

    const [coord1Data, coord2Data] = await Promise.all([
      this.getCoordinates(location1),
      this.getCoordinates(location2)
    ]);

    if (!coord1Data || !coord2Data) {
      console.log(`[DISTANCE-CALC] Missing coordinates - coord1: ${!!coord1Data}, coord2: ${!!coord2Data}`);
      return {
        distance: null,
        confidence: 0,
        details: {
          location1Data: coord1Data,
          location2Data: coord2Data
        }
      };
    }

    const distance = this.calculateDistance(coord1Data.coordinates, coord2Data.coordinates);
    const confidence = Math.min(coord1Data.confidence, coord2Data.confidence);

    console.log(`[DISTANCE-CALC] Distance: ${distance}km, Confidence: ${confidence}`);
    console.log(`[DISTANCE-CALC] Locations: (${coord1Data.coordinates.latitude}, ${coord1Data.coordinates.longitude}) → (${coord2Data.coordinates.latitude}, ${coord2Data.coordinates.longitude})`);

    return {
      distance,
      confidence,
      details: {
        location1Data: coord1Data,
        location2Data: coord2Data
      }
    };
  }

  /**
   * Check if distance is within preference range
   */
  async isWithinDistancePreference(
    userLocation: string,
    candidateLocation: string,
    maxDistanceKm: number
  ): Promise<{
    withinRange: boolean;
    actualDistance: number | null;
    confidence: number;
  }> {
    const distanceResult = await this.calculateLocationDistance(userLocation, candidateLocation);
    
    if (distanceResult.distance === null) {
      // If we can't calculate distance, assume it's within range (neutral)
      return {
        withinRange: true,
        actualDistance: null,
        confidence: 0
      };
    }

    const withinRange = distanceResult.distance <= maxDistanceKm;
    
    console.log(`[DISTANCE-FILTER] ${userLocation} → ${candidateLocation}: ${distanceResult.distance}km ${withinRange ? '✓' : '✗'} ${maxDistanceKm}km limit`);
    
    return {
      withinRange,
      actualDistance: distanceResult.distance,
      confidence: distanceResult.confidence
    };
  }

  /**
   * FACTOR 4: TIMEZONE COMPATIBILITY CALCULATIONS
   * Calculate timezone compatibility between two locations
   */
  async calculateTimezoneCompatibility(
    location1: string,
    location2: string
  ): Promise<TimezoneCompatibility> {
    console.log(`[TIMEZONE-COMPAT] Calculating timezone compatibility: "${location1}" vs "${location2}"`);

    try {
      const [loc1Data, loc2Data] = await Promise.all([
        this.getCoordinates(location1),
        this.getCoordinates(location2)
      ]);

      if (!loc1Data || !loc2Data) {
        console.log(`[TIMEZONE-COMPAT] Missing location data`);
        return {
          score: 0.5, // Neutral score when data unavailable
          hoursDifference: 0,
          overlappingHours: [],
          compatibility: 'fair',
          confidence: 0
        };
      }

      // If no timezone data available, use fallback based on coordinates
      let offset1 = loc1Data.timezoneOffset;
      let offset2 = loc2Data.timezoneOffset;

      if (offset1 === undefined || offset2 === undefined) {
        // Rough timezone estimation based on longitude
        offset1 = offset1 ?? Math.round(loc1Data.coordinates.longitude / 15);
        offset2 = offset2 ?? Math.round(loc2Data.coordinates.longitude / 15);
        console.log(`[TIMEZONE-COMPAT] Using longitude-based timezone estimation`);
      }

      const hoursDifference = Math.abs(offset1 - offset2);
      
      // Calculate overlapping hours (assuming 9 AM - 11 PM active hours)
      const activeHours1 = this.getActiveHours(offset1);
      const activeHours2 = this.getActiveHours(offset2);
      const overlappingHours = activeHours1.filter(hour => activeHours2.includes(hour));

      // Scoring based on time difference and overlapping active hours
      let score: number;
      let compatibility: 'excellent' | 'good' | 'fair' | 'poor';

      if (hoursDifference === 0) {
        score = 1.0;
        compatibility = 'excellent';
      } else if (hoursDifference <= 3) {
        score = 0.8 - (hoursDifference * 0.1);
        compatibility = 'good';
      } else if (hoursDifference <= 8) {
        score = 0.6 - (hoursDifference * 0.05);
        compatibility = 'fair';
      } else {
        score = Math.max(0.1, 0.4 - (hoursDifference * 0.02));
        compatibility = 'poor';
      }

      // Boost score based on overlapping hours
      const overlapBonus = overlappingHours.length / 14; // 14 hours is ideal overlap
      score = Math.min(1.0, score + (overlapBonus * 0.2));

      const confidence = Math.min(loc1Data.confidence, loc2Data.confidence);

      console.log(`[TIMEZONE-COMPAT] ${location1} (UTC${offset1}) vs ${location2} (UTC${offset2})`);
      console.log(`[TIMEZONE-COMPAT] Hours difference: ${hoursDifference}, Overlapping hours: ${overlappingHours.length}`);
      console.log(`[TIMEZONE-COMPAT] Score: ${(score * 100).toFixed(1)}%, Compatibility: ${compatibility}`);

      return {
        score,
        hoursDifference,
        overlappingHours,
        compatibility,
        confidence
      };

    } catch (error) {
      console.error(`[TIMEZONE-COMPAT] Error calculating timezone compatibility:`, error);
      return {
        score: 0.5,
        hoursDifference: 0,
        overlappingHours: [],
        compatibility: 'fair',
        confidence: 0
      };
    }
  }

  /**
   * Get active hours in UTC for a given timezone offset
   * Assumes people are active from 9 AM to 11 PM local time
   */
  private getActiveHours(utcOffset: number): number[] {
    const activeHours: number[] = [];
    
    // Local active hours: 9 AM to 11 PM (14 hours)
    for (let localHour = 9; localHour <= 23; localHour++) {
      let utcHour = localHour - utcOffset;
      
      // Handle day wrap-around
      if (utcHour < 0) utcHour += 24;
      if (utcHour >= 24) utcHour -= 24;
      
      activeHours.push(utcHour);
    }
    
    return activeHours.sort((a, b) => a - b);
  }

  /**
   * Helper function to convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get distance-based compatibility score (0-1 scale)
   */
  async getDistanceCompatibilityScore(
    userLocation: string,
    candidateLocation: string,
    maxDistanceKm: number = 100
  ): Promise<number> {
    const distanceResult = await this.calculateLocationDistance(userLocation, candidateLocation);
    
    if (distanceResult.distance === null || distanceResult.confidence < 0.3) {
      // Low confidence or no distance data - return neutral score
      return 0.5;
    }

    // Score based on distance within preference
    // Closer = higher score, with exponential decay beyond preference
    const distance = distanceResult.distance;
    
    if (distance <= maxDistanceKm) {
      // Within preference - score based on proximity (closer = better)
      const proximityScore = Math.max(0.5, 1 - (distance / maxDistanceKm) * 0.5);
      return proximityScore * distanceResult.confidence;
    } else {
      // Beyond preference - exponential decay
      const excessDistance = distance - maxDistanceKm;
      const decayScore = Math.max(0.1, Math.exp(-excessDistance / maxDistanceKm));
      return decayScore * distanceResult.confidence;
    }
  }

  /**
   * Get comprehensive location analysis
   */
  async analyzeLocationCompatibility(
    userLocation: string,
    candidateLocation: string,
    distancePreference?: number
  ): Promise<{
    score: number;
    distance: number | null;
    withinPreference: boolean;
    confidence: number;
    analysis: string;
  }> {
    const maxDistance = distancePreference || 100; // Default 100km
    
    const distanceResult = await this.calculateLocationDistance(userLocation, candidateLocation);
    const score = await this.getDistanceCompatibilityScore(userLocation, candidateLocation, maxDistance);
    
    let analysis = '';
    if (distanceResult.distance === null) {
      analysis = 'Distance calculation unavailable - using neutral scoring';
    } else if (distanceResult.distance <= maxDistance) {
      analysis = `Within ${maxDistance}km preference (${distanceResult.distance}km) - high compatibility`;
    } else {
      analysis = `Beyond ${maxDistance}km preference (${distanceResult.distance}km) - reduced compatibility`;
    }

    return {
      score,
      distance: distanceResult.distance,
      withinPreference: distanceResult.distance !== null && distanceResult.distance <= maxDistance,
      confidence: distanceResult.confidence,
      analysis
    };
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();