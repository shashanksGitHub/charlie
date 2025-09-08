import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { countryCodes, type CountryCode } from "@/lib/country-codes";
import { getCountryNationality } from "@/lib/nationality-map";

interface CountrySelectProps {
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
  showNationality?: boolean;
  isNationalityField?: boolean; // New prop to indicate this is for nationality (profile) vs preferences
}

export function CountrySelect({
  className = "",
  value = "",
  onChange,
  placeholder = "Select a country",
  darkMode = false,
  showNationality = true,
  isNationalityField = false, // Default to false for backward compatibility
}: CountrySelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Set the selected country based on the incoming value
  useEffect(() => {
    if (value) {
      // First try to find by country name or code
      let country = countryCodes.find(
        (country) => country.name === value || country.code === value
      );
      
      // If not found, try to find by nationality (e.g., "Nigerian" -> "Nigeria")
      if (!country) {
        country = countryCodes.find(
          (country) => getCountryNationality(country.name) === value
        );
      }
      
      if (country) {
        setSelectedCountry(country);
      }
    } else {
      setSelectedCountry(null);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchTerm("");
    
    // Return either the country name or nationality based on the prop
    const valueToReturn = showNationality ? getCountryNationality(country.name) : country.name;
    onChange(valueToReturn);
  };

  // Filter out "ANYWHERE" for nationality fields (profile context), but keep it for preference fields
  const availableCountries = isNationalityField 
    ? countryCodes.filter(country => country.name !== "ANYWHERE")
    : countryCodes;

  const filteredCountries = searchTerm
    ? availableCountries.filter(
        (country) =>
          country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCountryNationality(country.name).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableCountries;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex items-center border rounded-lg overflow-hidden
          ${darkMode 
            ? 'bg-white/10 text-white border-0 focus-within:ring-2 focus-within:ring-purple-500/40' 
            : 'bg-white text-gray-900 border-gray-200 focus-within:ring-2 focus-within:ring-purple-500/40'
          }
        `}
      >
        {/* Country selector button */}
        <button
          type="button"
          className={`flex items-center justify-between w-full px-3 py-2
            ${darkMode 
              ? 'text-white' 
              : 'text-gray-700'
            }
          `}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {selectedCountry ? (
            <div className="flex items-center">
              <span className="text-lg mr-2">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
            </div>
          ) : (
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {placeholder}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Country dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-lg shadow-lg border
            ${darkMode 
              ? 'bg-gray-900 border-gray-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
            }
          `}
        >
          {/* Search box */}
          <div className={`sticky top-0 p-2 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-white'}`}>
            <div className="relative">
              <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                ref={searchInputRef}
                className={`w-full pl-8 py-2 text-sm rounded-md 
                  ${darkMode 
                    ? 'bg-gray-800 text-white border-0 placeholder:text-gray-500' 
                    : 'bg-gray-50 text-gray-900 border border-gray-100 placeholder:text-gray-400'
                  }
                `}
                placeholder="Search countries"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Country list */}
          <div className="p-1">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors
                  ${
                    selectedCountry?.code === country.code
                      ? darkMode 
                        ? 'bg-purple-800/50 text-white' 
                        : 'bg-purple-50 text-purple-700'
                      : darkMode 
                        ? 'hover:bg-gray-800 text-gray-200' 
                        : 'hover:bg-gray-50 text-gray-800'
                  }
                `}
                onClick={() => handleCountrySelect(country)}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{country.flag}</span>
                  <span>{country.name}</span>
                </div>
                {selectedCountry?.code === country.code && (
                  <Check className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                )}
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className={`px-3 py-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No countries found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}