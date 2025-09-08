/**
 * Daylight Detection Service
 * Determines if it's currently dark/night time based on user's location
 * Uses sunrise-sunset.org API for accurate solar data
 */

interface SunriseSunsetResponse {
  results: {
    sunrise: string;
    sunset: string;
    solar_noon: string;
    day_length: string;
    civil_twilight_begin: string;
    civil_twilight_end: string;
    nautical_twilight_begin: string;
    nautical_twilight_end: string;
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
  };
  status: string;
}

interface DaylightStatus {
  isDark: boolean;
  isDarkMode: boolean; // Alias for consistency
  isAutomatic: boolean;
  lastChecked: number;
  location?: string;
  nextSunrise?: string;
  nextSunset?: string;
}

class DaylightService {
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly STORAGE_KEY = 'daylight_status';
  
  /**
   * Get latitude and longitude from a city/location string
   * Uses a simple geocoding approach with major cities
   */
  private static async getCoordinatesFromLocation(location: string): Promise<{ lat: number; lng: number } | null> {
    // Major city coordinates mapping
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      // Ghana cities
      'accra': { lat: 5.6037, lng: -0.1870 },
      'kumasi': { lat: 6.6885, lng: -1.6244 },
      'tamale': { lat: 9.4034, lng: -0.8424 },
      'cape coast': { lat: 5.1053, lng: -1.2466 },
      'tema': { lat: 5.6698, lng: 0.0166 },
      
      // US cities
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
      'philadelphia': { lat: 39.9526, lng: -75.1652 },
      'san antonio': { lat: 29.4241, lng: -98.4936 },
      'san diego': { lat: 32.7157, lng: -117.1611 },
      'dallas': { lat: 32.7767, lng: -96.7970 },
      'san jose': { lat: 37.3382, lng: -121.8863 },
      
      // UK cities
      'london': { lat: 51.5074, lng: -0.1278 },
      'manchester': { lat: 53.4808, lng: -2.2426 },
      'birmingham': { lat: 52.4862, lng: -1.8904 },
      'liverpool': { lat: 53.4084, lng: -2.9916 },
      'bristol': { lat: 51.4545, lng: -2.5879 },
      
      // Other major cities
      'toronto': { lat: 43.6532, lng: -79.3832 },
      'vancouver': { lat: 49.2827, lng: -123.1207 },
      'sydney': { lat: -33.8688, lng: 151.2093 },
      'melbourne': { lat: -37.8136, lng: 144.9631 },
      'lagos': { lat: 6.5244, lng: 3.3792 },
      'johannesburg': { lat: -26.2041, lng: 28.0473 },
      'nairobi': { lat: -1.2921, lng: 36.8219 },
      'cairo': { lat: 30.0444, lng: 31.2357 },
    };

    // Normalize location string for lookup
    const normalizedLocation = location.toLowerCase().trim();
    
    // Try direct city lookup first
    if (cityCoordinates[normalizedLocation]) {
      return cityCoordinates[normalizedLocation];
    }
    
    // Try partial matching for city names
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
        return coords;
      }
    }
    
    // Extract country and use capital city as fallback
    const countryCapitals: Record<string, { lat: number; lng: number }> = {
      'ghana': { lat: 5.6037, lng: -0.1870 }, // Accra
      'usa': { lat: 38.9072, lng: -77.0369 }, // Washington DC
      'united states': { lat: 38.9072, lng: -77.0369 },
      'uk': { lat: 51.5074, lng: -0.1278 }, // London
      'united kingdom': { lat: 51.5074, lng: -0.1278 },
      'canada': { lat: 45.4215, lng: -75.6919 }, // Ottawa
      'australia': { lat: -35.2809, lng: 149.1300 }, // Canberra
      'nigeria': { lat: 9.0765, lng: 7.3986 }, // Abuja
      'south africa': { lat: -25.7479, lng: 28.2293 }, // Pretoria
      'kenya': { lat: -1.2921, lng: 36.8219 }, // Nairobi
      'egypt': { lat: 30.0444, lng: 31.2357 }, // Cairo
    };
    
    for (const [country, coords] of Object.entries(countryCapitals)) {
      if (normalizedLocation.includes(country)) {
        return coords;
      }
    }
    
    return null;
  }

  /**
   * Check if it's currently dark based on location
   */
  static async checkDaylightStatus(userLocation?: string, forceRefresh: boolean = false): Promise<DaylightStatus> {
    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cached = this.getCachedStatus();
        if (cached && (Date.now() - cached.lastChecked) < this.CACHE_DURATION) {
          console.log('[DAYLIGHT] Using cached daylight status');
          return cached;
        }
      } else {
        console.log('[DAYLIGHT] Force refresh requested - clearing cache');
        this.clearCache();
      }

      let coordinates: { lat: number; lng: number } | null = null;

      // Try to get coordinates from user's location
      if (userLocation) {
        coordinates = await this.getCoordinatesFromLocation(userLocation);
      }

      // Fallback to browser geolocation if available and location lookup failed
      if (!coordinates && navigator.geolocation) {
        try {
          coordinates = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              },
              reject,
              { timeout: 5000, enableHighAccuracy: false }
            );
          });
        } catch (error) {
          console.warn('[DAYLIGHT] Geolocation not available:', error);
        }
      }

      // Default to Accra, Ghana if no coordinates available
      if (!coordinates) {
        console.log('[DAYLIGHT] Using default location (Accra, Ghana)');
        coordinates = { lat: 5.6037, lng: -0.1870 };
      }

      // Fetch sunrise/sunset data
      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${coordinates.lat}&lng=${coordinates.lng}&formatted=0`
      );

      if (!response.ok) {
        throw new Error(`Sunrise API error: ${response.status}`);
      }

      const data: SunriseSunsetResponse = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Sunrise API status: ${data.status}`);
      }

      // Parse times and determine if it's dark
      const now = new Date();
      const sunrise = new Date(data.results.sunrise);
      const sunset = new Date(data.results.sunset);
      const civilTwilightEnd = new Date(data.results.civil_twilight_end);
      const civilTwilightBegin = new Date(data.results.civil_twilight_begin);

      // It's dark if current time is after civil twilight end or before civil twilight begin
      const isDark = now < civilTwilightBegin || now > civilTwilightEnd;

      const status: DaylightStatus = {
        isDark,
        isDarkMode: isDark,
        isAutomatic: true,
        lastChecked: Date.now(),
        location: userLocation || 'Auto-detected',
        nextSunrise: sunrise.toLocaleTimeString(),
        nextSunset: sunset.toLocaleTimeString()
      };

      // Cache the result
      this.setCachedStatus(status);

      console.log(`[DAYLIGHT] Location: ${status.location}, Dark: ${isDark}, Sunrise: ${status.nextSunrise}, Sunset: ${status.nextSunset}`);
      
      return status;

    } catch (error) {
      console.error('[DAYLIGHT] Error checking daylight status:', error);
      
      // Return default fallback
      return {
        isDark: false,
        isDarkMode: false,
        isAutomatic: false,
        lastChecked: Date.now(),
        location: 'Unknown'
      };
    }
  }

  /**
   * Get cached daylight status
   */
  private static getCachedStatus(): DaylightStatus | null {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[DAYLIGHT] Error reading cached status:', error);
      return null;
    }
  }

  /**
   * Set cached daylight status
   */
  private static setCachedStatus(status: DaylightStatus): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(status));
    } catch (error) {
      console.warn('[DAYLIGHT] Error caching status:', error);
    }
  }

  /**
   * Clear cached daylight status
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('[DAYLIGHT] Error clearing cache:', error);
    }
  }
}

export default DaylightService;
export type { DaylightStatus };