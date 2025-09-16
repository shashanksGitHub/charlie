import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSuggestions, formatLocation, City } from "@/lib/cities";
import { MapPin, Loader2 } from "lucide-react";

interface GooglePlacesSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface CityInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onLocationSelect: (location: string) => void;
  initialValue?: string;
  showIcon?: boolean;
}

export function CityInput({
  className,
  onLocationSelect,
  initialValue = "",
  showIcon = true,
  ...props
}: CityInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [googleSuggestions, setGoogleSuggestions] = useState<
    GooglePlacesSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Google Places API integration (using backend proxy)
  const searchGooglePlaces = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/places/autocomplete?query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        console.warn(`[GooglePlaces] Backend proxy error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (data.status === "OK" && data.predictions) {
        console.log(
          `[GooglePlaces] Found ${data.predictions.length} suggestions for "${query}" via backend proxy`,
        );
        return data.predictions; // Already limited to 5 on backend
      } else {
        console.log(
          `[GooglePlaces] No results from backend proxy for "${query}", status: ${data.status}`,
        );
        return [];
      }
    } catch (error) {
      console.error(
        "[GooglePlaces] Error searching locations via backend proxy:",
        error,
      );
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if a local suggestion is already covered by Google Places
  const isLocalSuggestionDuplicate = (
    localCity: City,
    googleSuggestions: GooglePlacesSuggestion[],
  ): boolean => {
    const localCityName = localCity.city.toLowerCase().trim();
    const localCountryName = localCity.country.toLowerCase().trim();

    return googleSuggestions.some((googleSuggestion) => {
      const googleDescription = googleSuggestion.description.toLowerCase();
      const googleMainText = googleSuggestion.structured_formatting.main_text
        .toLowerCase()
        .trim();
      const googleSecondaryText =
        googleSuggestion.structured_formatting.secondary_text
          .toLowerCase()
          .trim();

      // Enhanced matching logic - check multiple patterns
      // Pattern 1: Exact city name match in main text
      const exactCityMatch = googleMainText === localCityName;

      // Pattern 2: City name appears in full description with country
      const cityInDescription = googleDescription.includes(localCityName);
      const countryInDescription = googleDescription.includes(localCountryName);

      // Pattern 3: Secondary text contains country or state info that matches
      const countryInSecondary = googleSecondaryText.includes(localCountryName);

      // If Google has the exact city name AND either country info matches, it's a duplicate
      return exactCityMatch && (countryInDescription || countryInSecondary);
    });
  };

  // Helper function to filter out duplicate local suggestions
  const getUniqueLocalSuggestions = (
    localSuggestions: City[],
    googleSuggestions: GooglePlacesSuggestion[],
  ): City[] => {
    return localSuggestions.filter(
      (localCity) => !isLocalSuggestionDuplicate(localCity, googleSuggestions),
    );
  };

  // Handle input changes with debounced Google Places search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Notify with current input as is to allow manual entry
    onLocationSelect(value);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Get suggestions
    if (value.length >= 2) {
      // First get local suggestions immediately
      const cityMatches = getSuggestions(value);
      setSuggestions(cityMatches);
      setShowSuggestions(true);

      // Then search Google Places with debounce (300ms delay)
      debounceTimeoutRef.current = setTimeout(async () => {
        const googleResults = await searchGooglePlaces(value);
        setGoogleSuggestions(googleResults);

        // After getting Google results, filter local suggestions to remove duplicates
        const uniqueLocalSuggestions = getUniqueLocalSuggestions(
          cityMatches,
          googleResults,
        );

        // Debug logging to verify duplicate filtering
        if (cityMatches.length > uniqueLocalSuggestions.length) {
          console.log(
            `[CITY-INPUT] Filtered ${cityMatches.length - uniqueLocalSuggestions.length} duplicate local suggestions`,
          );
          console.log(
            `[CITY-INPUT] Google results:`,
            googleResults.map((g: GooglePlacesSuggestion) => g.description),
          );
          console.log(
            `[CITY-INPUT] Filtered out:`,
            cityMatches
              .filter(
                (city) =>
                  !uniqueLocalSuggestions.some(
                    (unique) =>
                      unique.city === city.city &&
                      unique.country === city.country,
                  ),
              )
              .map((city) => `${city.city}, ${city.country}`),
          );
        }

        setSuggestions(uniqueLocalSuggestions);
      }, 300);
    } else {
      setSuggestions([]);
      setGoogleSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle local city suggestion selection
  const handleSuggestionClick = (city: City) => {
    const formattedLocation = formatLocation(city.city, city.country);
    setInputValue(formattedLocation);
    setSuggestions([]);
    setGoogleSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(formattedLocation);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Handle Google Places suggestion selection
  const handleGoogleSuggestionClick = (suggestion: GooglePlacesSuggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setGoogleSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(suggestion.description);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = googleSuggestions.length + suggestions.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < totalSuggestions - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (focusedIndex >= 0 && focusedIndex < totalSuggestions) {
          // Google suggestions come first, then local suggestions
          if (focusedIndex < googleSuggestions.length) {
            handleGoogleSuggestionClick(googleSuggestions[focusedIndex]);
          } else {
            handleSuggestionClick(
              suggestions[focusedIndex - googleSuggestions.length],
            );
          }
          e.preventDefault();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          className={cn(showIcon ? "pl-10 pr-10" : "pr-10", className)}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.length >= 2) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a city name"
          {...props}
        />
        {showIcon && (
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600" />
        )}
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto border border-purple-100 dark:border-purple-700"
          style={{
            boxShadow:
              "0 10px 25px -5px rgba(124, 58, 237, 0.15), 0 8px 10px -6px rgba(124, 58, 237, 0.1)",
          }}
        >
          {/* Loading indicator */}
          {isLoading && (
            <div className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400 flex items-center">
              <Loader2 className="h-3.5 w-3.5 mr-2 text-purple-400 animate-spin flex-shrink-0" />
              <p>Searching locations...</p>
            </div>
          )}

          {/* Google Places suggestions */}
          {googleSuggestions.length > 0 && (
            <ul className="py-1">
              {googleSuggestions.map((suggestion, index) => (
                <li
                  key={suggestion.place_id}
                  className={cn(
                    "px-4 py-2.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 text-sm flex items-center transition-colors duration-150",
                    focusedIndex === index &&
                      "bg-purple-50 dark:bg-purple-900/30",
                  )}
                  onClick={() => handleGoogleSuggestionClick(suggestion)}
                >
                  <MapPin className="h-3.5 w-3.5 mr-2 text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {suggestion.structured_formatting.main_text}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      , {suggestion.structured_formatting.secondary_text}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Local suggestions */}
          {suggestions.length > 0 && (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.city}-${suggestion.country}`}
                  className={cn(
                    "px-4 py-2.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 text-sm flex items-center transition-colors duration-150",
                    focusedIndex === googleSuggestions.length + index &&
                      "bg-purple-50 dark:bg-purple-900/30",
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <MapPin className="h-3.5 w-3.5 mr-2 text-purple-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-purple-800 dark:text-purple-300">
                      {suggestion.city}
                    </span>
                    <span className="text-purple-400 dark:text-purple-400">
                      , {suggestion.country}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* No results found */}
          {!isLoading &&
            googleSuggestions.length === 0 &&
            suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-2 text-purple-400 flex-shrink-0" />
                <p>
                  No cities found. Try another name or enter manually as{" "}
                  <span className="font-semibold">"City, Country"</span>.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
