import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from "@/components/ui/select";
import { religions, loadGlobalReligions, addGlobalReligion, getFlattenedReligionsList } from "@/lib/religions";
import { X, RefreshCw, Pencil, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReligionSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  allowCustom?: boolean;
}

export function ReligionSelect({
  value,
  onValueChange,
  placeholder = "Select religion and denomination",
  disabled = false,
  allowClear = true,
  allowCustom = true
}: ReligionSelectProps) {
  const [isLoadingReligions, setIsLoadingReligions] = useState(false);
  const [religionsLoaded, setReligionsLoaded] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReligionName, setCustomReligionName] = useState("");
  const [isAddingToGlobal, setIsAddingToGlobal] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Special "clear" value used internally
  const CLEAR_VALUE = "__clear__";

  // Load global religions when component mounts
  useEffect(() => {
    async function fetchGlobalReligions() {
      if (!religionsLoaded) {
        setIsLoadingReligions(true);
        try {
          await loadGlobalReligions();
          setReligionsLoaded(true);
        } catch (error) {
          console.error("Error loading global religions:", error);
        } finally {
          setIsLoadingReligions(false);
        }
      }
    }
    
    fetchGlobalReligions();
  }, [religionsLoaded]);

  const handleValueChange = (newValue: string) => {
    if (newValue === CLEAR_VALUE) {
      // Pass empty string to clear the selection
      onValueChange("");
      setOpen(false);
    } else {
      onValueChange(newValue);
      setOpen(false);
    }
  };

  const handleCustomReligionAdd = async () => {
    if (customReligionName.trim()) {
      try {
        // Add to global religions database
        setIsAddingToGlobal(true);
        const newGlobalReligion = await addGlobalReligion(customReligionName.trim());
        
        if (newGlobalReligion) {
          // Use the new global religion value
          onValueChange(newGlobalReligion.value);
          console.log("Added and selected global religion:", newGlobalReligion);
        } else {
          // Fallback if API call fails
          console.error("Failed to add religion to global database");
        }
      } catch (error) {
        console.error("Error adding global religion:", error);
      } finally {
        setIsAddingToGlobal(false);
        setCustomReligionName("");
        setShowCustomInput(false);
        setOpen(false);
      }
    }
  };

  // Get the display label for the current value
  const selectedLabel = value ? 
    value.startsWith('global-') ? 
      // Find in global religions group
      religions.find(r => r.value === 'global')?.denominations.find(d => d.value === value)?.name || value :
      // Find in regular denominations
      religions.flatMap(r => r.denominations).find(d => d.value === value)?.name || value
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border-purple-200 dark:border-purple-800/50 bg-white dark:bg-gray-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {value ? (
            <span className="text-left line-clamp-1">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px] bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-xl rounded-xl">
        <Command className="bg-transparent border-none">
          <CommandEmpty>
            <p className="py-2 px-3 text-sm text-gray-400">No religion found.</p>
            {allowCustom && !showCustomInput && (
              <Button 
                variant="ghost" 
                className="w-full justify-start px-3 py-1.5 text-sm text-left text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => setShowCustomInput(true)}
              >
                <Pencil className="w-3.5 h-3.5 mr-2 text-purple-400" />
                Add custom religion
              </Button>
            )}
          </CommandEmpty>
          
          <CommandInput 
            placeholder="Search religions..." 
            className="border-none focus:ring-0 text-white bg-black/20 placeholder:text-gray-400"
          />
          
          {showCustomInput && (
            <div className="p-2 border-t border-gray-700/50">
              <Input
                value={customReligionName}
                onChange={(e) => setCustomReligionName(e.target.value)}
                placeholder="Type custom religion name"
                className="mb-2 bg-black/30 border-purple-500/50 text-white placeholder:text-gray-500"
              />
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={() => setShowCustomInput(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={handleCustomReligionAdd}
                  disabled={isAddingToGlobal || !customReligionName.trim()}
                >
                  {isAddingToGlobal ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add & Select'
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <CommandList>
            <ScrollArea className="h-[300px]" style={{ scrollbarWidth: 'thin' }}>
              {/* Show loading indicator while fetching global religions */}
              {isLoadingReligions && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin text-purple-400" />
                  <span className="text-sm text-gray-400">Loading religions...</span>
                </div>
              )}
              
              {allowClear && value && (
                <>
                  <CommandItem 
                    key={CLEAR_VALUE}
                    value={CLEAR_VALUE}
                    onSelect={() => handleValueChange(CLEAR_VALUE)}
                    className="text-gray-300 italic flex items-center hover:bg-white/10 focus:bg-white/10 rounded-lg my-1"
                  >
                    <X className="h-3.5 w-3.5 mr-2 text-gray-400" />
                    Clear selection
                  </CommandItem>
                  <CommandSeparator className="my-1 bg-white/10" />
                </>
              )}
              
              {religions.map((religionGroup) => (
                <CommandGroup 
                  key={religionGroup.value}
                  heading={religionGroup.name}
                  className={cn(
                    "text-xs font-semibold",
                    religionGroup.value === 'global' ? "text-pink-400" : "text-purple-400"
                  )}
                >
                  {religionGroup.denominations.map((denomination) => (
                    <CommandItem 
                      key={denomination.value} 
                      value={denomination.value}
                      onSelect={() => handleValueChange(denomination.value)}
                      className="flex items-center justify-between group transition-colors duration-150"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === denomination.value 
                              ? "opacity-100 text-purple-400" 
                              : "opacity-0"
                          )}
                        />
                        <span className="text-gray-200">{denomination.name}</span>
                      </div>
                      {value === denomination.value && (
                        <span className="text-xs text-white bg-gradient-to-r from-purple-500 to-pink-600 px-1.5 py-0.5 rounded-full font-bold border border-purple-400/30 shadow-sm">
                          Selected
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}