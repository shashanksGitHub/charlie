import * as React from "react";
import { searchCities, fetchCitiesForCountry } from "@/lib/api-cities";
import { City } from "@/lib/cities";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApiCityInputProps {
  value?: string;
  defaultCountry?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function ApiCityInput({
  value,
  defaultCountry = "Ghana", // Default to Ghana
  onChange,
  className,
  placeholder = "Select your city...",
}: ApiCityInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cities, setCities] = React.useState<City[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedCity, setSelectedCity] = React.useState<string>(value || "");
  const { translate } = useLanguage();

  // Load initial cities based on default country
  React.useEffect(() => {
    if (!open) return;
    
    async function loadInitialCities() {
      setLoading(true);
      try {
        const countryCities = await fetchCitiesForCountry(defaultCountry);
        setCities(countryCities);
      } catch (error) {
        console.error("Failed to load initial cities", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadInitialCities();
  }, [defaultCountry, open]);

  // Search cities when query changes
  React.useEffect(() => {
    if (!open || query.length < 2) return;
    
    const searchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        // Pass the country parameter to filter results by country
        const results = await searchCities(query, defaultCountry);
        setCities(results);
      } catch (error) {
        console.error("Failed to search cities", error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce search for 300ms
    
    return () => clearTimeout(searchTimer);
  }, [query, open, defaultCountry]);

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    setOpen(false);
    if (onChange) {
      onChange(city);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedCity && "text-muted-foreground",
            className
          )}
        >
          {selectedCity ? (
            <span>{selectedCity}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="w-full">
          <CommandInput
            placeholder={translate('cities.searchPlaceholder')}
            className="h-9"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? translate('common.loading') : translate('cities.noCityFound')}
            </CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={`${city.city}-${city.country}`}
                  value={`${city.city}, ${city.country}`}
                  onSelect={() => handleSelect(`${city.city}, ${city.country}`)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCity === `${city.city}, ${city.country}`
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span>{city.city}</span>
                    </div>
                    <Badge variant="outline" className="ml-6 mt-0.5">
                      {city.country}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ApiCityInput;