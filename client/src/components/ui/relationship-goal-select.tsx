import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { isUnder18 } from "@/lib/age-utils";
import { useLanguage } from "@/hooks/use-language";

interface RelationshipGoalSelectProps {
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
  userDateOfBirth?: string | null;
}

const getRelationshipGoalOptions = (
  dateOfBirth?: string | null,
  translate: (key: string) => string,
) => {
  const isUnder18User = dateOfBirth ? isUnder18(dateOfBirth) : false;

  if (isUnder18User) {
    // For users under 18 (friendship-focused)
    return [
      { key: "friendship", label: translate("relationshipGoals.friendship") },
      {
        key: "studyPartner",
        label: translate("relationshipGoals.studyPartner"),
      },
      {
        key: "activityBuddy",
        label: translate("relationshipGoals.activityBuddy"),
      },
    ];
  } else {
    // For users 18+ (dating-focused)
    return [
      { key: "friendship", label: translate("relationshipGoals.friendship") },
      {
        key: "longTermRelationship",
        label: translate("relationshipGoals.longTermRelationship"),
      },
      { key: "marriage", label: translate("relationshipGoals.marriage") },
      {
        key: "givingCoupleCounseling",
        label: translate("relationshipGoals.givingCoupleCounseling"),
      },
      {
        key: "receivingCoupleCounseling",
        label: translate("relationshipGoals.receivingCoupleCounseling"),
      },
    ];
  }
};

const getOptionDescription = (
  optionKey: string,
  isUnder18User: boolean,
  translate: (key: string) => string,
) => {
  if (isUnder18User) {
    switch (optionKey) {
      case "friendship":
        return translate("relationshipGoals.descriptions.friendship");
      case "studyPartner":
        return translate("relationshipGoals.descriptions.studyPartner");
      case "activityBuddy":
        return translate("relationshipGoals.descriptions.activityBuddy");
      default:
        return "";
    }
  } else {
    switch (optionKey) {
      case "friendship":
        return translate("relationshipGoals.descriptions.friendship");
      case "longTermRelationship":
        return translate("relationshipGoals.descriptions.longTermRelationship");
      case "marriage":
        return translate("relationshipGoals.descriptions.marriage");
      case "givingCoupleCounseling":
        return translate(
          "relationshipGoals.descriptions.givingCoupleCounseling",
        );
      case "receivingCoupleCounseling":
        return translate(
          "relationshipGoals.descriptions.receivingCoupleCounseling",
        );
      default:
        return "";
    }
  }
};

export function RelationshipGoalSelect({
  className = "",
  value = "",
  onChange,
  placeholder = "Select what you're looking for",
  darkMode = false,
  userDateOfBirth,
}: RelationshipGoalSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { translate } = useLanguage();

  const options = getRelationshipGoalOptions(userDateOfBirth, translate);
  const isUnder18User = userDateOfBirth ? isUnder18(userDateOfBirth) : false;

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
        {/* Goal selector button */}
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
                className={`flex flex-col items-start w-full px-3 py-2.5 text-sm rounded-md transition-colors
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
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{option.label}</span>
                  {value === option.key && (
                    <Check
                      className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs mt-0.5 ${
                    value === option.key
                      ? darkMode
                        ? "text-purple-200"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                  }`}
                >
                  {getOptionDescription(option.key, isUnder18User, translate)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
