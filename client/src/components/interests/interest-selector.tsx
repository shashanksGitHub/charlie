import { useState, useEffect } from "react";
import { Search, AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGlobalInterests } from "@/hooks/use-global-interests";
import { GlobalInterest } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to format interest with proper capitalization
const formatInterest = (interest: string): string => {
  return interest.trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface InterestSelectorProps {
  selectedInterests: string[];
  onSelectInterest: (interest: string) => void;
  onRemoveInterest: (interest: string) => void;
  maxInterests?: number;
  horizontalCategories?: boolean;
  darkMode?: boolean;
  compactLayout?: boolean;
}

export function InterestSelector({
  selectedInterests,
  onSelectInterest,
  onRemoveInterest,
  maxInterests = 10,
  horizontalCategories = false,
  darkMode = false,
  compactLayout = false,
}: InterestSelectorProps) {
  const {
    globalInterests,
    categories,
    isLoading,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    addInterest,
    isPending,
  } = useGlobalInterests();
  
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filteredInterests, setFilteredInterests] = useState<GlobalInterest[]>([]);
  const [showAddButton, setShowAddButton] = useState(false);

  const { toast } = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const isInterestSelected = (interest: string) => 
    selectedInterests.some(i => i.toLowerCase() === interest.toLowerCase());
  
  const canAddMoreInterests = selectedInterests.length < maxInterests;

  // Filter interests based on search and category, then sort alphabetically
  useEffect(() => {
    let filtered = [...globalInterests];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(interest => 
        interest.interest.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter unless "all" is selected
    if (activeTab !== "all") {
      filtered = filtered.filter(interest => interest.category === activeTab);
    }
    
    // Sort alphabetically
    filtered.sort((a, b) => a.interest.localeCompare(b.interest));
    
    setFilteredInterests(filtered);

    // Show add button if search term doesn't exist in global interests and is valid
    const formattedSearchTerm = formatInterest(searchTerm);
    const exactMatch = globalInterests.some(
      interest => interest.interest.toLowerCase() === formattedSearchTerm.toLowerCase()
    );
    setShowAddButton(
      searchTerm.trim().length >= 2 && 
      searchTerm.trim().length <= 30 && 
      !exactMatch &&
      canAddMoreInterests
    );
  }, [globalInterests, searchTerm, activeTab, canAddMoreInterests]);

  const handleAddCustomInterest = () => {
    // Reset error state
    setErrorMsg(null);
    
    if (!searchTerm.trim()) return;
    
    // Validate interest format (no weird characters, reasonable length)
    if (searchTerm.length < 2) {
      setErrorMsg("Interest must be at least 2 characters long");
      return;
    }
    
    if (searchTerm.length > 30) {
      setErrorMsg("Interest must be less than 30 characters long");
      return;
    }
    
    // Format the interest with proper capitalization
    const formattedInterest = formatInterest(searchTerm);
    
    // Check if already exists in global interests (case-insensitive)
    const exists = globalInterests.some(
      i => i.interest.toLowerCase() === formattedInterest.toLowerCase()
    );
    
    if (exists) {
      // If exists, find the exact match and use that formatting
      const exactInterest = globalInterests.find(
        i => i.interest.toLowerCase() === formattedInterest.toLowerCase()
      );
      onSelectInterest(exactInterest?.interest || formattedInterest);
      
      // Clear input without disruptive toast notifications
      setSearchTerm("");
    } else {
      try {
        // If doesn't exist, add to global database with proper formatting
        console.log(`Adding new interest to global database: ${formattedInterest}`);
        
        // Always select it for the user immediately with proper formatting
        // This ensures the UX is responsive even if server has issues
        onSelectInterest(formattedInterest);
        setSearchTerm("");
        
        // Then add to global database with proper formatting
        addInterest({
          interest: formattedInterest,
          category: selectedCategory || activeTab === "all" ? "Other" : activeTab
        });
        
      } catch (error) {
        console.error("Error in handleAddCustomInterest:", error);
        
        // Show error in UI but don't block the user
        toast({
          title: "Warning",
          description: "Interest was added to your selection but may not be available to others",
          variant: "destructive"
        });
        
        setErrorMsg(error instanceof Error ? error.message : "Unknown error adding interest");
      }
    }
  };
  
  return (
    <div className="w-full space-y-3">
      {/* Show selected interests - smaller container */}
      <div className={`${horizontalCategories ? 'mb-2' : 'mb-3'}`}>
        <h3 className={`text-sm font-medium mb-1.5 ${darkMode ? 'text-white' : ''}`}>
          Selected Interests ({selectedInterests.length}/{maxInterests})
        </h3>
        <div className="flex flex-wrap gap-2 max-w-[350px]">
          {selectedInterests.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-muted-foreground'}`}>
              No interests selected yet
            </p>
          ) : (
            selectedInterests.map(interest => (
              <Badge 
                key={interest} 
                variant={darkMode ? "outline" : "secondary"}
                className={`py-1 px-2.5 gap-1.5 text-xs ${darkMode ? 'bg-purple-500/60 border-purple-400/40 text-white' : ''}`}
              >
                {interest}
                <button
                  onClick={() => onRemoveInterest(interest)}
                  className={`ml-1 w-3.5 h-3.5 rounded-full inline-flex items-center justify-center ${
                    darkMode ? 'hover:bg-purple-600/70 text-gray-100' : 'hover:bg-muted'
                  }`}
                >
                  ×
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
      
      {/* Combined search and add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className={`absolute left-2.5 top-2.5 h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`} />
          <Input
            type="search"
            placeholder="Search interests..."
            className={`pl-8 ${
              darkMode ? 'bg-black/30 border-white/10 text-white placeholder:text-gray-400' : ''
            } ${compactLayout ? 'h-8 text-xs rounded-md' : ''}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showAddButton) {
                handleAddCustomInterest();
              }
            }}
          />
        </div>
        {showAddButton && (
          <Button 
            onClick={handleAddCustomInterest}
            disabled={isPending}
            size={compactLayout ? "sm" : "default"}
            className={`${darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} gap-1`}
          >
            <Plus className="h-3.5 w-3.5" />
            {isPending ? "Adding..." : "Add"}
          </Button>
        )}
      </div>
      
      {/* Error message display */}
      {errorMsg && (
        <Alert variant="destructive" className="py-2 mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs ml-2">
            {errorMsg}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Category tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        {/* Always use horizontal scrolling for categories */}
        <div className="overflow-x-auto custom-scrollbar-horizontal pb-1.5 max-w-[350px] mx-auto">
          <TabsList className={`flex min-w-max ${darkMode ? 'bg-black/20 border border-white/5' : ''}`}>
            <TabsTrigger 
              value="all" 
              className={`${darkMode ? 'text-white data-[state=active]:bg-purple-500/50 data-[state=active]:text-white' : ''} 
                ${compactLayout ? 'text-xs py-1 px-2' : ''}`}
            >
              All
            </TabsTrigger>
            {categories.map(category => (
              <TabsTrigger 
                key={category} 
                value={category}
                className={`${darkMode ? 'text-white data-[state=active]:bg-purple-500/50 data-[state=active]:text-white' : ''}
                  ${compactLayout ? 'text-xs py-1 px-2' : ''}`}
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <TabsContent value={activeTab} className="mt-2">
          <ScrollArea className={`${compactLayout ? 'h-56' : horizontalCategories ? 'h-56' : 'h-72'} w-full rounded-md ${darkMode ? 'border-0' : 'border'} ${darkMode ? 'bg-black/20 backdrop-blur-md' : 'p-2'}`}>
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : filteredInterests.length === 0 ? (
              <div className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-muted-foreground'} ${compactLayout ? 'text-xs' : 'text-sm'}`}>
                {searchTerm ? (
                  <div className="space-y-2">
                    <p>No interests found matching "{searchTerm}"</p>
                    {showAddButton && (
                      <p className="text-xs opacity-75">Press Enter or click Add to create it</p>
                    )}
                  </div>
                ) : (
                  <p>No interests in this category yet</p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2">
                {filteredInterests.map(interest => (
                  <Badge
                    key={interest.id}
                    variant={isInterestSelected(interest.interest) ? (darkMode ? "secondary" : "default") : "outline"}
                    className={`${compactLayout ? 'py-1 px-2 text-xs' : 'py-1.5 px-3'} cursor-pointer transition-colors ${
                      darkMode && isInterestSelected(interest.interest)
                        ? 'bg-purple-500/80 hover:bg-purple-500 text-white'
                        : darkMode
                        ? 'border-purple-500/30 bg-black/20 text-gray-200 hover:bg-purple-500/50 hover:text-white'
                        : 'hover:bg-primary hover:text-primary-foreground'
                    } ${
                      !canAddMoreInterests && !isInterestSelected(interest.interest) ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      if (isInterestSelected(interest.interest)) {
                        onRemoveInterest(interest.interest);
                      } else if (canAddMoreInterests) {
                        onSelectInterest(interest.interest);
                      }
                    }}
                  >
                    {interest.interest}
                  </Badge>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}