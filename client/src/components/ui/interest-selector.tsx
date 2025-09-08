import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Search, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { interestCategories, allInterests } from "@/lib/ghanaian-interests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InterestSelectorProps {
  userInterests: string[];
  maxInterests?: number;
  onAddInterest: (interest: string) => void;
  onRemoveInterest?: (interest: string) => void;
  disabled?: boolean;
  showTopLabels?: boolean;
}

export function InterestSelector({
  userInterests,
  maxInterests = 10, 
  onAddInterest,
  onRemoveInterest,
  disabled = false,
  showTopLabels = true
}: InterestSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Filter interests based on search query
  const filteredInterests = searchQuery
    ? allInterests.filter((interest) =>
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Check if a specific interest is already selected
  const isInterestSelected = (interest: string) => 
    userInterests.includes(interest);

  // Check if max interests has been reached
  const isMaxReached = userInterests.length >= maxInterests;

  // Get top 4 interests
  const topInterests = userInterests.slice(0, 4);
  const otherInterests = userInterests.slice(4);

  // Handle adding an interest
  const handleAddInterest = (interest: string) => {
    if (!isInterestSelected(interest) && !isMaxReached) {
      onAddInterest(interest);
      setSearchQuery("");
    }
  };

  // Handle removing an interest
  const handleRemoveInterest = (interest: string) => {
    if (onRemoveInterest) {
      onRemoveInterest(interest);
    }
  };

  return (
    <div className="w-full space-y-4">
      {showTopLabels && userInterests.length > 0 && (
        <div className="space-y-2">
          {topInterests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full"></div>
                <h4 className="text-sm font-medium text-purple-800">Top Interests</h4>
                <div className="text-xs text-gray-500">(shown on your profile)</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {topInterests.map((interest, index) => {
                  // Use different gradient colors for top interests
                  const gradientClasses = [
                    "from-purple-500 to-fuchsia-400",
                    "from-amber-500 to-orange-400",
                    "from-teal-500 to-cyan-400",
                    "from-blue-500 to-indigo-400"
                  ];
                  const gradientClass = gradientClasses[index % gradientClasses.length];
                  
                  return (
                    <Badge
                      key={`top-${interest}`}
                      className={`relative bg-gradient-to-br ${gradientClass} text-white shadow-lg py-1 px-3 border border-white/30 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                      <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                      <span className="relative z-10 drop-shadow-sm">{interest}</span>
                      {onRemoveInterest && (
                        <button
                          className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                          onClick={() => handleRemoveInterest(interest)}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {otherInterests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-gradient-to-b from-purple-400 to-pink-300 rounded-full"></div>
                <h4 className="text-sm font-medium text-purple-700">Other Interests</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {otherInterests.map((interest) => (
                  <Badge
                    key={`other-${interest}`}
                    variant="outline"
                    className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-pink-200 py-1 px-3"
                  >
                    {interest}
                    {onRemoveInterest && (
                      <button
                        className="ml-1 rounded-full hover:bg-purple-100 p-0.5"
                        onClick={() => handleRemoveInterest(interest)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!showTopLabels && userInterests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {userInterests.map((interest) => (
            <Badge
              key={interest}
              variant="outline"
              className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-pink-200 py-1 px-3"
            >
              {interest}
              {onRemoveInterest && (
                <button
                  className="ml-1 rounded-full hover:bg-purple-100 p-0.5"
                  onClick={() => handleRemoveInterest(interest)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full border-dashed border-pink-200 text-sm text-gray-500 hover:text-purple-700 hover:border-purple-200 justify-between",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled || isMaxReached}
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 mr-1" />
              {isMaxReached 
                ? `Maximum of ${maxInterests} interests reached`
                : userInterests.length === 0
                ? "Add your interests and hobbies"
                : "Add more interests"}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
            <div className="flex items-center border-b px-3">
              <TabsList className="h-10 flex-1 bg-transparent">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-purple-500 rounded-none"
                >
                  Categories
                </TabsTrigger>
                <TabsTrigger
                  value="search"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-purple-500 rounded-none"
                >
                  Search
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="p-0 mt-0">
              <Command>
                <CommandList>
                  <CommandEmpty>No interests found.</CommandEmpty>
                  {interestCategories.map((category) => (
                    <CommandGroup key={category.category} heading={category.category}>
                      <div className="grid grid-cols-2 gap-1 p-1">
                        {category.interests.map((interest) => {
                          const isSelected = isInterestSelected(interest);
                          return (
                            <CommandItem
                              key={interest}
                              value={interest}
                              onSelect={() => {
                                if (!isSelected && !isMaxReached) {
                                  handleAddInterest(interest);
                                }
                              }}
                              disabled={isSelected || isMaxReached}
                              className={cn(
                                "cursor-pointer flex justify-between py-1 px-2",
                                isSelected
                                  ? "bg-purple-50 text-purple-700"
                                  : isMaxReached
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              )}
                            >
                              <span className="truncate">{interest}</span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-purple-600" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </div>
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </TabsContent>

            <TabsContent value="search" className="p-0 mt-0">
              <Command>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <CommandInput
                    placeholder="Search interests..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="border-0 pl-8"
                  />
                </div>
                <CommandList>
                  <CommandEmpty>No interests found.</CommandEmpty>
                  {filteredInterests.length > 0 && (
                    <CommandGroup>
                      {filteredInterests.map((interest) => {
                        const isSelected = isInterestSelected(interest);
                        return (
                          <CommandItem
                            key={interest}
                            value={interest}
                            onSelect={() => {
                              if (!isSelected && !isMaxReached) {
                                handleAddInterest(interest);
                                setOpen(false);
                              }
                            }}
                            disabled={isSelected || isMaxReached}
                            className={cn(
                              "cursor-pointer",
                              isSelected
                                ? "bg-purple-50 text-purple-700"
                                : isMaxReached
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            )}
                          >
                            <span>{interest}</span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-purple-600 ml-auto" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </TabsContent>
          </Tabs>

          <Separator />
          
          <div className="p-2 text-xs text-gray-500 flex justify-between items-center">
            <div>
              {userInterests.length}/{maxInterests} interests selected
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-xs h-7"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}