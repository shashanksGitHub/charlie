import * as React from "react";
import { Check, ChevronsUpDown, X, Pencil, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GHANA_TRIBES, DEFAULT_GHANA_TRIBES, TRIBE_GROUPS, loadGlobalTribes, addGlobalTribe } from "@/lib/tribes";
import { useState, useEffect } from "react";

export interface TribeSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function TribeSelect({
  value = [],
  onChange,
  maxSelections = 2,
  disabled = false,
  className,
  placeholder = "Select your tribe(s)"
}: TribeSelectProps) {
  // Log the current value array for debugging
  console.log("TribeSelect rendering with value:", value);
  console.log("TribeSelect max selections:", maxSelections);
  const [open, setOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTribeName, setCustomTribeName] = useState("");
  const [internalValue, setInternalValue] = useState<string[]>(value);
  const [isLoadingTribes, setIsLoadingTribes] = useState(false);
  const [isAddingToGlobal, setIsAddingToGlobal] = useState(false);
  const [tribesLoaded, setTribesLoaded] = useState(false);
  
  // Keep internal state in sync with external value
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  // Load global tribes when component mounts
  useEffect(() => {
    async function fetchGlobalTribes() {
      if (!tribesLoaded) {
        setIsLoadingTribes(true);
        try {
          await loadGlobalTribes();
          setTribesLoaded(true);
        } catch (error) {
          console.error("Error loading global tribes:", error);
        } finally {
          setIsLoadingTribes(false);
        }
      }
    }
    
    fetchGlobalTribes();
  }, [tribesLoaded]);

  const handleSelect = (currentValue: string) => {
    console.log("handleSelect called with:", currentValue);
    console.log("Current value array:", internalValue);
    
    if (internalValue.includes(currentValue)) {
      // Remove the option if already selected
      const newValue = internalValue.filter((item) => item !== currentValue);
      console.log("Removing tribe, new array:", newValue);
      
      // Update both the internal state and parent component
      setInternalValue(newValue);
      onChange(newValue);
    } else if (internalValue.length < maxSelections) {
      // Add the option if less than max selections
      const newValue = [...internalValue, currentValue];
      console.log("Adding tribe, new array:", newValue);
      
      // Update both the internal state and parent component
      setInternalValue(newValue);
      onChange(newValue);
      
      // Keep the popover open for easy selection of second tribe
      setOpen(true);
    } else {
      console.log("Max selections reached:", maxSelections);
    }
  };

  const handleCustomTribeAdd = async () => {
    if (customTribeName.trim() && internalValue.length < maxSelections) {
      const tribeName = customTribeName.trim();
      
      try {
        // Add to global tribes database instead of just using custom- prefix
        setIsAddingToGlobal(true);
        const newGlobalTribe = await addGlobalTribe(tribeName);
        
        if (newGlobalTribe) {
          // Use the new global tribe value that includes the ID
          const newValue = [...internalValue, newGlobalTribe.value];
          setInternalValue(newValue); // Update internal state immediately
          onChange(newValue); // Update parent state
          console.log("Added and selected global tribe:", newGlobalTribe);
        } else {
          // Fallback to custom- prefix if API call fails
          const customValue = `custom-${tribeName}`;
          if (!internalValue.some(v => v === customValue)) {
            const newValue = [...internalValue, customValue];
            setInternalValue(newValue);
            onChange(newValue);
            console.log("Selected custom tribe (API failed):", customValue);
          }
        }
      } catch (error) {
        console.error("Error adding global tribe:", error);
        // Fallback to custom- prefix
        const customValue = `custom-${tribeName}`;
        if (!internalValue.some(v => v === customValue)) {
          const newValue = [...internalValue, customValue];
          setInternalValue(newValue);
          onChange(newValue);
          console.log("Selected custom tribe (after error):", customValue);
        }
      } finally {
        setIsAddingToGlobal(false);
        setCustomTribeName("");
        setShowCustomInput(false);
        setOpen(true); // Keep dropdown open for additional selections
      }
    }
  };

  const selectedLabels = value.map(val => {
    if (val.startsWith("custom-")) {
      return val.substring(7); // Remove the "custom-" prefix for display
    }
    const tribe = GHANA_TRIBES.find(t => t.value === val);
    return tribe ? tribe.label : val;
  });

  const handleRemove = (valueToRemove: string) => {
    const newValue = internalValue.filter(v => v !== valueToRemove);
    setInternalValue(newValue); // Update internal state immediately
    onChange(newValue); // Update parent state
    console.log("Selected tribes:", newValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between auth-input border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors focus:border-indigo-500",
              internalValue.length > 0 ? "h-auto min-h-10 py-2" : "h-10",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {internalValue.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {internalValue.map((val) => (
                  <Badge 
                    key={val} 
                    className="mr-1 mb-1 pr-1 bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 shadow-sm border-0 transition-all"
                  >
                    {val.startsWith("custom-") ? val.substring(7) : (GHANA_TRIBES.find(t => t.value === val)?.label || val)}
                    <span
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 inline-flex items-center justify-center"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(val);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(val);
                      }}
                    >
                      <X className="h-3 w-3 text-white" />
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[220px] bg-gradient-to-b from-gray-900/95 via-indigo-950/90 to-gray-900/95 border border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.2)] backdrop-blur-xl rounded-xl">
          <Command className="bg-transparent border-none">
            <CommandEmpty>
              <p className="py-2 px-3 text-sm text-gray-400">No tribe found.</p>
              {!showCustomInput && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start px-3 py-1.5 text-sm text-left text-gray-300 hover:text-white hover:bg-white/10"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                  Create custom tribe
                </Button>
              )}
            </CommandEmpty>
            <CommandInput 
              placeholder="Search tribes..." 
              className="border-none focus:ring-0 text-white bg-black/20 placeholder:text-gray-400"
            />
            <CommandList>
              <ScrollArea className="h-[280px]" style={{ scrollbarWidth: 'thin' }}>
                {/* Show loading indicator while fetching global tribes */}
                {isLoadingTribes && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin text-indigo-400" />
                    <span className="text-sm text-gray-400">Loading global tribes...</span>
                  </div>
                )}
                
                {/* Standard Tribes */}
                <CommandGroup heading="Standard Tribes" className="text-indigo-400 text-xs font-semibold">
                  {DEFAULT_GHANA_TRIBES.sort((a, b) => a.label.localeCompare(b.label)).map((tribe: { value: string, label: string }) => (
                    <CommandItem
                      key={tribe.value}
                      value={tribe.label}
                      onSelect={() => {
                        handleSelect(tribe.value);
                        // Keep popover open for multi-selection - don't close it
                        setOpen(true);
                      }}
                      disabled={internalValue.length >= maxSelections && !internalValue.includes(tribe.value)}
                      className="flex items-center justify-between group transition-colors duration-150"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            internalValue.includes(tribe.value) 
                              ? "opacity-100 text-indigo-400" 
                              : "opacity-0"
                          )}
                        />
                        <span className="text-gray-200">{tribe.label}</span>
                      </div>
                      {internalValue.includes(tribe.value) && (
                        <span className="text-xs text-white bg-gradient-to-r from-indigo-500 to-blue-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-400/30 shadow-sm">
                          Selected
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                
                {/* Global Tribes - added by other users */}
                {GHANA_TRIBES.some(t => t.value.startsWith('global-')) && (
                  <>
                    <CommandSeparator className="bg-white/10 my-1" />
                    <CommandGroup heading="Community Tribes" className="text-purple-400 text-xs font-semibold">
                      {GHANA_TRIBES.filter(t => t.value.startsWith('global-'))
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map((tribe: { value: string, label: string }) => (
                          <CommandItem
                            key={tribe.value}
                            value={tribe.label}
                            onSelect={() => {
                              handleSelect(tribe.value);
                              setOpen(true);
                            }}
                            disabled={internalValue.length >= maxSelections && !internalValue.includes(tribe.value)}
                            className="flex items-center justify-between group transition-colors duration-150"
                          >
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  internalValue.includes(tribe.value) 
                                    ? "opacity-100 text-purple-400" 
                                    : "opacity-0"
                                )}
                              />
                              <span className="text-gray-200">{tribe.label}</span>
                            </div>
                            {internalValue.includes(tribe.value) && (
                              <span className="text-xs text-white bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 py-0.5 rounded-full font-bold border border-purple-400/30 shadow-sm">
                                Selected
                              </span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </>
                )}
                
                <CommandSeparator className="bg-white/10" />
                <CommandGroup heading="Custom Tribe" className="text-indigo-400 text-xs font-semibold">
                  {showCustomInput ? (
                    <div className="flex items-center p-2">
                      <Input
                        value={customTribeName}
                        onChange={(e) => setCustomTribeName(e.target.value)}
                        placeholder="Enter your tribe name"
                        className="flex-1 mr-2 h-8 text-sm bg-black/30 border-indigo-500/30 placeholder:text-gray-500 text-white focus-visible:ring-indigo-500/50"
                        disabled={internalValue.length >= maxSelections || isAddingToGlobal}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCustomTribeAdd();
                          }
                        }}
                        autoFocus
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        className="h-8 bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-none hover:from-indigo-500 hover:to-blue-500"
                        disabled={!customTribeName.trim() || internalValue.length >= maxSelections || isAddingToGlobal}
                        onClick={handleCustomTribeAdd}
                      >
                        {isAddingToGlobal ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : "Add"}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start px-3 py-1.5 text-sm text-left text-gray-300 hover:text-white hover:bg-white/10"
                      onClick={() => setShowCustomInput(true)}
                      disabled={internalValue.length >= maxSelections}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                      Create custom tribe
                    </Button>
                  )}
                  
                  {/* Display any previously added custom tribes with "Selected" label */}
                  {internalValue.filter(v => v.startsWith('custom-')).map(customValue => (
                    <CommandItem
                      key={customValue}
                      value={customValue.substring(7)}
                      onSelect={() => handleRemove(customValue)}
                      className="flex items-center justify-between group transition-colors duration-150"
                    >
                      <div className="flex items-center">
                        <Check className="mr-2 h-4 w-4 opacity-100 text-indigo-400" />
                        <span className="text-gray-200">{customValue.substring(7)}</span>
                      </div>
                      <span className="text-xs text-white bg-gradient-to-r from-indigo-500 to-blue-600 px-1.5 py-0.5 rounded-full font-bold border border-indigo-400/30 shadow-sm">
                        Selected
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Help text only shown when no tribes are selected */}
      {internalValue.length === 0 && (
        <div className="text-xs text-gray-500 mt-1 mb-3">
          You can select up to {maxSelections} tribes. For mixed heritage, create a custom tribe.
        </div>
      )}
    </div>
  );
}