import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { countryCodes, type CountryCode } from "@/lib/country-codes";
import { Check, ChevronDown, Search } from "lucide-react";

interface PhoneInputProps {
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  darkMode?: boolean; // For using in dark mode dialogs
}

export function PhoneInput({
  className = "",
  value = "",
  onChange,
  defaultCountry = "US", // Default to United States
  placeholder = "Enter phone number",
  darkMode = false,
}: PhoneInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find and set the default country on mount
  useEffect(() => {
    // Filter out countries without dial codes (like ANYWHERE)
    const validCountries = countryCodes.filter(country => country.dialCode && country.dialCode.trim() !== '');
    
    console.log("Setting default country. defaultCountry prop:", defaultCountry);
    console.log("Valid countries:", validCountries.length);
    
    const country = validCountries.find(
      (country) => 
        country.code.toLowerCase() === defaultCountry.toLowerCase() || 
        country.dialCode === defaultCountry
    ) || validCountries.find((country) => country.code === "US") || validCountries[0];
    
    console.log("Selected country:", country);
    setSelectedCountry(country);
  }, [defaultCountry]);

  // Parse the input value when it changes externally
  useEffect(() => {
    if (value && value.trim() !== '') {
      console.log("PhoneInput received value:", value);
      
      // Filter out countries without dial codes for matching
      const validCountries = countryCodes.filter(country => country.dialCode && country.dialCode.trim() !== '');
      
      // Try to find a matching country code at the start of the value
      let matchingCountry = null;
      
      if (value.startsWith('+')) {
        // Look for a matching country code if value starts with +
        matchingCountry = validCountries.find((country) => 
          value.startsWith(country.dialCode)
        );
      }
      
      if (matchingCountry) {
        console.log("Found matching country:", matchingCountry);
        setSelectedCountry(matchingCountry);
        // Extract only the digits for the phone number part
        const phoneDigits = value.substring(matchingCountry.dialCode.length).replace(/[^\d]/g, '');
        setPhoneNumber(phoneDigits);
        console.log("Parsed phone number:", { 
          countryCode: matchingCountry.dialCode, 
          phoneNumber: phoneDigits,
          flag: matchingCountry.flag 
        });
      } else if (selectedCountry) {
        // If we have a selected country but no match in the value,
        // assume the value is just the phone number part
        const phoneDigits = value.replace(/[^\d]/g, '');
        setPhoneNumber(phoneDigits);
      } else {
        // If no country is selected yet and no match, just use the value as digits
        const phoneDigits = value.replace(/[^\d]/g, '');
        setPhoneNumber(phoneDigits);
      }
    }
  }, [value, selectedCountry]);

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
    
    // Trigger onChange with the new value
    const newValue = `${country.dialCode}${phoneNumber}`;
    onChange(newValue);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the new phone number and only keep digits
    let newPhoneNumber = e.target.value;
    
    // Allow only numbers in the input
    const digitsOnly = newPhoneNumber.replace(/[^\d]/g, '');
    
    // Update the internal state with the cleaned value
    setPhoneNumber(digitsOnly);
    
    // Only trigger onChange if we have a selected country
    if (selectedCountry) {
      const newValue = `${selectedCountry.dialCode}${digitsOnly}`;
      onChange(newValue);
    }
  };

  const filteredCountries = searchTerm
    ? countryCodes.filter(
        (country) =>
          // Only include countries with valid dial codes
          country.dialCode && country.dialCode.trim() !== '' &&
          (country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          country.dialCode.includes(searchTerm) ||
          country.code.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : countryCodes.filter(country => country.dialCode && country.dialCode.trim() !== '');

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
          className={`flex items-center h-full px-3 py-2 border-r
            ${darkMode 
              ? 'border-white/10 text-white' 
              : 'border-gray-200 text-gray-700'
            }
          `}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="text-lg mr-1">{selectedCountry?.flag}</span>
          <span className="text-xs font-medium mx-1">{selectedCountry?.dialCode}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Phone number input */}
        <Input
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          className={`border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 h-11
            ${darkMode ? 'bg-transparent text-white placeholder:text-gray-400' : 'text-gray-900'}
          `}
          placeholder={placeholder}
          type="tel"
        />
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
                  <span className="ml-2 text-xs font-medium text-gray-500">{country.dialCode}</span>
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