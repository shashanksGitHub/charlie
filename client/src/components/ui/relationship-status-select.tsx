import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface RelationshipStatusSelectProps {
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
}

const getRelationshipStatusOptions = (translate: (key: string) => string) => [
  { key: "single", label: translate("relationshipStatus.single") },
  { key: "dating", label: translate("relationshipStatus.dating") },
  {
    key: "inRelationship",
    label: translate("relationshipStatus.inRelationship"),
  },
  { key: "engaged", label: translate("relationshipStatus.engaged") },
  { key: "married", label: translate("relationshipStatus.married") },
  { key: "divorced", label: translate("relationshipStatus.divorced") },
  { key: "widowed", label: translate("relationshipStatus.widowed") },
  { key: "separated", label: translate("relationshipStatus.separated") },
  { key: "complicated", label: translate("relationshipStatus.complicated") },
  {
    key: "openRelationship",
    label: translate("relationshipStatus.openRelationship"),
  },
  {
    key: "preferNotToSay",
    label: translate("relationshipStatus.preferNotToSay"),
  },
];

export function RelationshipStatusSelect({
  className = "",
  value = "",
  onChange,
  placeholder = "Select relationship status",
  darkMode = false,
}: RelationshipStatusSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { translate } = useLanguage();

  const options = getRelationshipStatusOptions(translate);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleOptionSelect = (optionKey: string) => {
    onChange(optionKey);
    setIsDropdownOpen(false);
  };

  // Find the display value for the current selection
  const selectedOption = options.find((opt) => opt.key === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center border rounded-lg overflow-hidden
          ${
            darkMode
              ? "bg-white/10 text-white border-0 focus-within:ring-2 focus-within:ring-purple-500/40"
              : "bg-white text-gray-900 border-gray-200 focus-within:ring-2 focus-within:ring-purple-500/40"
          }
        `}
      >
        {/* Status selector button */}
        <button
          type="button"
          className={`flex items-center justify-between w-full px-3 py-2
            ${darkMode ? "text-white" : "text-gray-700"}
          `}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {value ? (
            <span>{displayValue}</span>
          ) : (
            <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {placeholder}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Options dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-lg shadow-lg border
            ${
              darkMode
                ? "bg-gray-900 border-gray-700 text-white"
                : "bg-white border-gray-200 text-gray-900"
            }
          `}
        >
          {/* Option list */}
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.key}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors
                  ${
                    value === option.key
                      ? darkMode
                        ? "bg-purple-800/50 text-white"
                        : "bg-purple-50 text-purple-700"
                      : darkMode
                        ? "hover:bg-gray-800 text-gray-200"
                        : "hover:bg-gray-50 text-gray-800"
                  }
                `}
                onClick={() => handleOptionSelect(option.key)}
              >
                <span>{option.label}</span>
                {value === option.key && (
                  <Check
                    className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
