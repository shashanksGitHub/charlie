import * as React from "react";
import ApiCityInput from "@/components/ui/api-city-input";
import { fetchCitiesForCountry } from "@/lib/api-cities";
import { Label } from "@/components/ui/label";
import { City } from "@/lib/cities";
import { cn } from "@/lib/utils";

interface CitySelectorProps {
  value?: string;
  defaultCountry?: string;
  onChange?: (value: string) => void;
  className?: string;
  label?: string;
  required?: boolean;
  description?: string;
}

export function CitySelector({
  value,
  defaultCountry = "Ghana",
  onChange,
  className,
  label = "City",
  required = false,
  description,
}: CitySelectorProps) {
  const [selectedCity, setSelectedCity] = React.useState<string>(value || "");
  const [popularCities, setPopularCities] = React.useState<City[]>([]);
  
  // Load popular cities for the country
  React.useEffect(() => {
    async function loadPopularCities() {
      try {
        const cities = await fetchCitiesForCountry(defaultCountry);
        setPopularCities(cities.slice(0, 5)); // Take top 5 cities
      } catch (error) {
        console.error("Failed to load popular cities", error);
      }
    }
    
    loadPopularCities();
  }, [defaultCountry]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    if (onChange) {
      onChange(city);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label htmlFor="city" className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      <ApiCityInput
        value={selectedCity}
        defaultCountry={defaultCountry}
        onChange={handleCityChange}
        placeholder={`Select your city in ${defaultCountry}...`}
      />
      
      {popularCities.length > 0 && !selectedCity && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Popular cities:</p>
          <div className="flex flex-wrap gap-1">
            {popularCities.map((city) => (
              <button
                key={city.city}
                type="button"
                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                onClick={() => handleCityChange(`${city.city}, ${city.country}`)}
              >
                {city.city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CitySelector;