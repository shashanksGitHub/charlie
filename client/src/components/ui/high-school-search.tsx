import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";

interface HighSchoolSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface HighSchoolSearchResult {
  schools: string[];
}

export const HighSchoolSearch: React.FC<HighSchoolSearchProps> = ({
  value,
  onChange,
  placeholder = "Search for your high school...",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize query with value
  useEffect(() => {
    if (value && !query) {
      setQuery(value);
    }
  }, [value]);

  // Debounced search function
  useEffect(() => {
    if (justSelected) {
      // Skip search if we just made a selection
      setJustSelected(false);
      return;
    }

    // Only run search logic when the input has focus
    if (!hasFocus) {
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (query.length >= 2) {
      debounceTimeoutRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/highschool/search?q=${encodeURIComponent(query)}&limit=8`,
          );
          if (response.ok) {
            const data: HighSchoolSearchResult = await response.json();
            setResults(data.schools || []);
            // Only auto-open if this input currently has focus
            setIsOpen(document.activeElement === searchRef.current);
            setSelectedIndex(-1);
          }
        } catch (error) {
          console.error("High school search error:", error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, justSelected, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);

    // Propagate user-typed value so it can be persisted even if not in results
    onChange(newValue);
  };

  const handleSelectSchool = (school: string) => {
    setJustSelected(true); // Flag to prevent search from running
    setQuery(school);
    onChange(school);
    setResults([]); // Clear results to prevent dropdown from reopening
    setIsOpen(false);
    setSelectedIndex(-1);
    searchRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectSchool(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        searchRef.current?.blur();
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setHasFocus(true);
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => setHasFocus(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-pink-200 rounded-lg text-gray-900 placeholder-gray-500 focus:border-pink-400 focus:ring-pink-400/50 text-xs focus:outline-none focus:ring-1"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-purple-400/50 rounded-lg shadow-lg max-h-48 overflow-y-auto backdrop-blur-xl"
        >
          <div className="p-2 border-b border-purple-400/30">
            <span className="text-xs text-purple-200">
              {results.length} schools found
            </span>
          </div>

          {results.map((school, index) => (
            <div
              key={`${school}-${index}`}
              onClick={() => handleSelectSchool(school)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-purple-500/30 text-white"
                  : "text-purple-100 hover:bg-purple-500/20"
              }`}
            >
              <div className="font-medium text-xs">{school}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
