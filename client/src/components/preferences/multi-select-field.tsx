import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, X, ChevronDown } from "lucide-react";
import { MultiSelectFieldProps } from "./types";

export function MultiSelectField({
  label,
  value = [],
  onChange,
  options = [],
  placeholder = "Select options...",
  searchPlaceholder = "Search options...",
  emptyText = "No options found.",
  allowCustomInput = false,
  customInputPlaceholder = "Add custom option...",
  theme = "blue",
  className = ""
}: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const themeClasses = {
    blue: {
      badge: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      border: "border-blue-200",
      button: "border-blue-200 hover:border-blue-300",
      accent: "text-blue-600"
    },
    violet: {
      badge: "bg-violet-100 text-violet-800 hover:bg-violet-200",
      border: "border-violet-200",
      button: "border-violet-200 hover:border-violet-300",
      accent: "text-violet-600"
    },
    emerald: {
      badge: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
      border: "border-emerald-200",
      button: "border-emerald-200 hover:border-emerald-300",
      accent: "text-emerald-600"
    },
    pink: {
      badge: "bg-pink-100 text-pink-800 hover:bg-pink-200",
      border: "border-pink-200",
      button: "border-pink-200 hover:border-pink-300",
      accent: "text-pink-600"
    }
  };

  const currentTheme = themeClasses[theme as keyof typeof themeClasses] || themeClasses.blue;

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(option.value)
  );

  const handleSelect = (optionValue: string) => {
    if (!value.includes(optionValue)) {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const handleAddCustom = () => {
    if (customInput.trim() && !value.includes(customInput.trim())) {
      onChange([...value, customInput.trim()]);
      setCustomInput("");
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getOptionLabel = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    return option ? option.label : optionValue;
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-gray-400 hover:text-gray-200 p-1 h-auto"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Selected values display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((selectedValue) => (
            <Badge
              key={selectedValue}
              variant="secondary"
              className={`${currentTheme.badge} text-xs px-2 py-1 flex items-center gap-1`}
            >
              <span className="truncate max-w-[120px]">
                {getOptionLabel(selectedValue)}
              </span>
              <X
                className="h-3 w-3 cursor-pointer hover:opacity-70"
                onClick={() => handleRemove(selectedValue)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Multi-select dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={`w-full justify-between text-left font-normal ${currentTheme.button} bg-gray-800/50 text-gray-300`}
          >
            <span className="truncate">
              {value.length === 0 ? placeholder : `${value.length} selected`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-gray-900 border-gray-700" align="start">
          <div className="p-3 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-gray-800 border-gray-600 text-gray-200"
              />
            </div>

            {/* Custom input option */}
            {allowCustomInput && (
              <div className="flex gap-2">
                <Input
                  placeholder={customInputPlaceholder}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddCustom()}
                  className="flex-1 bg-gray-800 border-gray-600 text-gray-200"
                />
                <Button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customInput.trim()}
                  size="sm"
                  className={`${currentTheme.accent} bg-transparent border ${currentTheme.border} hover:bg-gray-800`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">{emptyText}</p>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-2 rounded"
                    onClick={() => handleSelect(option.value)}
                  >
                    <Checkbox
                      checked={value.includes(option.value)}
                      onChange={() => {}}
                      className={`${currentTheme.border}`}
                    />
                    <span className="text-sm text-gray-200 flex-1">{option.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}