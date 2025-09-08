import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { debounce } from "@/lib/utils";
import { handleApiResponse } from "@/lib/api-helpers";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSetObject,
  safeStorageGetObject,
} from "@/lib/storage-utils";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Heart,
  Globe,
  BookOpen,
  Church,
  Calendar,
  Users,
  Eye,
  Coffee,
  Home,
  Crown,
  CheckCircle2,
  BookType,
  Baby,
  GraduationCap,
  Search,
  Sparkles,
  HeartHandshake,
  Trophy,
  Filter,
  Check,
  X,
  Plus,
  Minus,
  Ruler,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, t } from "@/hooks/use-language";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { religions, getReligionDisplayName } from "@/lib/religions";
import { countryCodes, CountryCode } from "@/lib/country-codes";
import { GHANA_TRIBES, TRIBE_GROUPS } from "@/lib/tribes";
import { TribesDialog } from "./tribes-dialog";
import { EducationDialog } from "./education-dialog";
import { HighSchoolDialog } from "./high-school-dialog";
import { InterestSelector } from "@/components/interests/interest-selector";
import { isUnder18 } from "@/lib/age-utils";
import CountrySelector from "@/components/nationality/country-selector";
import { useNationality } from "@/hooks/use-nationality";

// Utility function to get country flag emoji
const getCountryFlag = (countryName: string): string => {
  if (countryName === "ANYWHERE") {
    return "🌍";
  }

  const country = countryCodes.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase(),
  );

  return country?.flag || "🌍";
};

// Types for dating preferences
interface DatingPreferences {
  ageRange: [number, number] | null;
  distance: number | null;
  religion: string[];
  // religiousImportance field removed as requested
  educationLevel: string[];
  hasChildren: boolean | null;
  wantsChildren: boolean | null;
  height: [number, number] | null; // in cm (stored in cm but displayed in ft)
  tribes: string[];
  lookingFor: string | null; // relationship, casual, friendship, marriage
  dealBreakers: string[];
  interests: string[];
  bodyType: string[];
  matchingPriorities: string[]; // What's most important to them
  relationshipGoalPreference: string | null; // Free text field for relationship goals
  smokingPreference: string | null; // 'no' for zero tolerance, null for any level acceptable
  drinkingPreference: string | null; // 'no' for zero tolerance, null for any level acceptable
  highSchoolPreferences: string[]; // High school preferences for users under 18
}

// Helper function to convert cm to feet and inches
const cmToFeet = (cm: number): string => {
  // Convert cm to inches (1 inch = 2.54 cm)
  const inches = cm / 2.54;

  // Calculate feet and remaining inches
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);

  // Format as "5'10"" (feet and inches)
  return `${feet}'${remainingInches}"`;
};

// Helper function to convert feet and inches to cm
const feetToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
};

// Helper function to parse feet/inches string back to cm
const parseFeetStringToCm = (feetStr: string): number => {
  const match = feetStr.match(/(\d+)'(\d+)"/);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return feetToCm(feet, inches);
  }
  return 170; // Default fallback
};

export default function DatingPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Country selector functionality for MEET app context
  const { country: selectedCountry, setCountry: setSelectedCountry } =
    useNationality();

  // Dialog state management
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Parse URL parameters for section and field
  const parseUrlParams = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const section = searchParams.get("section");
    const field = searchParams.get("field");
    return { section, field };
  };

  // Initialize with null/empty values for new users
  const [preferences, setPreferences] = useState<DatingPreferences>({
    ageRange: null,
    distance: null,
    religion: [],
    // religiousImportance removed as requested
    educationLevel: [],
    hasChildren: null,
    wantsChildren: null,
    height: null, // Initial height should be null
    tribes: [],
    lookingFor: null, // Initial relationship goal should be null
    dealBreakers: [],
    interests: [],
    bodyType: [],
    matchingPriorities: [], // Initial priorities should be empty
    relationshipGoalPreference: null, // Free text relationship goal
    smokingPreference: null, // Default: any level acceptable
    drinkingPreference: null, // Default: any level acceptable
    highSchoolPreferences: [], // Initial high school preferences should be empty
  });

  // Form state for animations
  // Get initial section from URL parameters if available
  const { section: urlSection, field: urlField } = parseUrlParams();
  const [activeSection, setActiveSection] = useState<string>(
    urlSection &&
      ["basics", "background", "lifestyle", "dealbreakers"].includes(urlSection)
      ? urlSection
      : "basics",
  );
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Options for selects
  const religiousOptions = [
    {
      value: "christian",
      label: t("datingPreferences.religionOptions.christian"),
    },
    { value: "muslim", label: t("datingPreferences.religionOptions.muslim") },
    {
      value: "traditional",
      label: t("datingPreferences.religionOptions.traditional"),
    },
    { value: "other", label: t("datingPreferences.religionOptions.other") },
    { value: "none", label: t("datingPreferences.religionOptions.none") },
  ];

  const educationOptions = [
    {
      value: "high_school",
      label: t("datingPreferences.educationOptions.highSchool"),
    },
    {
      value: "vocational",
      label: t("datingPreferences.educationOptions.vocational"),
    },
    {
      value: "bachelors",
      label: t("datingPreferences.educationOptions.bachelors"),
    },
    {
      value: "masters",
      label: t("datingPreferences.educationOptions.masters"),
    },
    {
      value: "doctorate",
      label: t("datingPreferences.educationOptions.doctorate"),
    },
  ];

  const tribeOptions = [
    { value: "akan", label: t("datingPreferences.tribeOptions.akan") },
    { value: "ewe", label: t("datingPreferences.tribeOptions.ewe") },
    { value: "ga", label: t("datingPreferences.tribeOptions.ga") },
    { value: "dagomba", label: t("datingPreferences.tribeOptions.dagomba") },
    { value: "fante", label: t("datingPreferences.tribeOptions.fante") },
    { value: "other", label: t("datingPreferences.tribeOptions.other") },
    {
      value: "non_ghanaian",
      label: t("datingPreferences.tribeOptions.nonGhanaian"),
    },
  ];

  const relationshipOptions = [
    {
      value: "casual",
      label: t("datingPreferences.relationshipOptions.casual"),
    },
    {
      value: "relationship",
      label: t("datingPreferences.relationshipOptions.relationship"),
    },
    {
      value: "marriage",
      label: t("datingPreferences.relationshipOptions.marriage"),
    },
    {
      value: "friendship",
      label: t("datingPreferences.relationshipOptions.friendship"),
    },
  ];

  const bodyTypeOptions = [
    {
      value: "no_preference",
      label: t("datingPreferences.bodyTypeOptions.noPreference"),
    },
    { value: "slim", label: t("datingPreferences.bodyTypeOptions.slim") },
    {
      value: "athletic",
      label: t("datingPreferences.bodyTypeOptions.athletic"),
    },
    { value: "average", label: t("datingPreferences.bodyTypeOptions.average") },
    { value: "curvy", label: t("datingPreferences.bodyTypeOptions.curvy") },
    {
      value: "plus_sized",
      label: t("datingPreferences.bodyTypeOptions.plusSized"),
    },
  ];

  const distanceOptions = [
    {
      value: 10,
      label: t("datingPreferences.distanceOptions.within10Miles"),
      description: t("datingPreferences.distanceOptions.localAreaMatches"),
    },
    {
      value: 25,
      label: t("datingPreferences.distanceOptions.within25Miles"),
      description: t("datingPreferences.distanceOptions.nearbyCityMatches"),
    },
    {
      value: 100,
      label: t("datingPreferences.distanceOptions.within100Miles"),
      description: t("datingPreferences.distanceOptions.regionalMatches"),
    },
    {
      value: 999999,
      label: t("datingPreferences.distanceOptions.withinCountry"),
      description: t("datingPreferences.distanceOptions.nationalMatches"),
    },
    {
      value: -1,
      label: t("datingPreferences.distanceOptions.noLimit"),
      description: t("datingPreferences.distanceOptions.globalMatches"),
    },
  ];

  const interestOptions = [
    { value: "cooking", label: "Cooking" },
    { value: "travel", label: "Travel" },
    { value: "music", label: "Music" },
    { value: "sports", label: "Sports" },
    { value: "reading", label: "Reading" },
    { value: "movies", label: "Movies" },
    { value: "dance", label: "Dance" },
    { value: "art", label: "Art" },
    { value: "photography", label: "Photography" },
    { value: "fitness", label: "Fitness" },
    { value: "technology", label: "Technology" },
  ];

  const dealBreakerOptions = [
    {
      value: "smoking",
      label: t("datingPreferences.dealBreakerOptions.smoking"),
    },
    {
      value: "drinking",
      label: t("datingPreferences.dealBreakerOptions.drinking"),
    },
    {
      value: "different_religion",
      label: t("datingPreferences.dealBreakerOptions.differentReligion"),
    },
    {
      value: "no_education",
      label: t("datingPreferences.dealBreakerOptions.noEducation"),
    },
    {
      value: "different_tribe",
      label: t("datingPreferences.dealBreakerOptions.differentTribe"),
    },
    {
      value: "long_distance",
      label: t("datingPreferences.dealBreakerOptions.longDistance"),
    },
    {
      value: "has_children",
      label: t("datingPreferences.dealBreakerOptions.hasChildren"),
    },
  ];

  // Function to get a colorful class for deal breaker options
  const getColorClass = (value: string) => {
    const colors = [
      "bg-blue-50/80 hover:bg-blue-100/50 dark:bg-blue-900/30 dark:hover:bg-blue-800/40",
      "bg-green-50/80 hover:bg-green-100/50 dark:bg-green-900/30 dark:hover:bg-green-800/40",
      "bg-yellow-50/80 hover:bg-yellow-100/50 dark:bg-yellow-900/30 dark:hover:bg-yellow-800/40",
      "bg-indigo-50/80 hover:bg-indigo-100/50 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/40",
      "bg-red-50/80 hover:bg-red-100/50 dark:bg-red-900/30 dark:hover:bg-red-800/40",
      "bg-cyan-50/80 hover:bg-cyan-100/50 dark:bg-cyan-900/30 dark:hover:bg-cyan-800/40",
      "bg-orange-50/80 hover:bg-orange-100/50 dark:bg-orange-900/30 dark:hover:bg-orange-800/40",
      "bg-teal-50/80 hover:bg-teal-100/50 dark:bg-teal-900/30 dark:hover:bg-teal-800/40",
    ];

    // Use the value to deterministically choose a color
    const hash = value
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // State for custom deal breaker dialog
  const [customDealBreakerDialogOpen, setCustomDealBreakerDialogOpen] =
    useState(false);
  const [customDealBreaker, setCustomDealBreaker] = useState("");
  const [globalDealBreakers, setGlobalDealBreakers] = useState<
    Array<{ id: number; dealBreaker: string }>
  >([]);
  const [isLoadingGlobalDealBreakers, setIsLoadingGlobalDealBreakers] =
    useState(false);
  const [isAddingGlobalDealBreaker, setIsAddingGlobalDealBreaker] =
    useState(false);

  const allPriorityOptions = [
    { value: "values", label: t("datingPreferences.priorityOptions.values") },
    {
      value: "personality",
      label: t("datingPreferences.priorityOptions.personality"),
    },
    { value: "looks", label: t("datingPreferences.priorityOptions.looks") },
    { value: "career", label: t("datingPreferences.priorityOptions.career") },
    {
      value: "religion",
      label: t("datingPreferences.priorityOptions.religion"),
    },
    { value: "tribe", label: t("datingPreferences.priorityOptions.tribe") },
    {
      value: "intellect",
      label: t("datingPreferences.priorityOptions.intellect"),
    },
  ];

  // Filter out Physical Attraction for users under 18
  const priorityOptions = isUnder18(user?.dateOfBirth || null)
    ? allPriorityOptions.filter((option) => option.value !== "looks")
    : allPriorityOptions;

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: DatingPreferences) => {
      if (!user?.id) {
        throw new Error(t("datingPreferences.errors.mustBeLoggedIn"));
      }

      // Set loading state
      setIsSaving(true);

      // CRITICAL FIX: DO NOT load all localStorage fields during mutation
      // This was causing field coupling - only use the data passed to mutation
      console.log(
        "🔧 [FIELD-COUPLING-FIX] Using ONLY the data passed to mutation:",
        data,
      );

      // CRITICAL FIX: Only include fields that are actually present in data
      // This prevents coupling between unrelated fields
      const formattedData: any = {};

      // Only map fields that are actually present in the data object
      if (data.ageRange !== undefined) {
        formattedData.minAge = data.ageRange ? data.ageRange[0] : null;
        formattedData.maxAge = data.ageRange ? data.ageRange[1] : null;
      }

      if (data.height !== undefined) {
        formattedData.minHeightPreference = data.height ? data.height[0] : null;
        formattedData.maxHeightPreference = data.height ? data.height[1] : null;
      }

      if (data.distance !== undefined) {
        formattedData.distancePreference = data.distance;
      }

      if (data.hasChildren !== undefined) {
        formattedData.hasChildrenPreference =
          data.hasChildren !== null ? String(data.hasChildren) : null;
      }

      if (data.wantsChildren !== undefined) {
        formattedData.wantsChildrenPreference =
          data.wantsChildren !== null ? String(data.wantsChildren) : null;
      }

      if (data.relationshipGoalPreference !== undefined) {
        formattedData.relationshipGoalPreference =
          data.relationshipGoalPreference;
      }

      if (data.dealBreakers !== undefined) {
        formattedData.dealBreakers = Array.isArray(data.dealBreakers)
          ? JSON.stringify(data.dealBreakers)
          : null;
      }

      if (data.matchingPriorities !== undefined) {
        formattedData.matchingPriorities = Array.isArray(
          data.matchingPriorities,
        )
          ? JSON.stringify(data.matchingPriorities)
          : null;
      }

      if (data.tribes !== undefined) {
        formattedData.ethnicityPreference = Array.isArray(data.tribes)
          ? JSON.stringify(data.tribes)
          : null;
      }

      if (data.religion !== undefined) {
        formattedData.religionPreference = Array.isArray(data.religion)
          ? JSON.stringify(data.religion)
          : null;
      }

      if (data.educationLevel !== undefined) {
        formattedData.educationLevelPreference = Array.isArray(
          data.educationLevel,
        )
          ? JSON.stringify(data.educationLevel)
          : null;
      }

      if (data.bodyType !== undefined) {
        formattedData.bodyTypePreference = Array.isArray(data.bodyType)
          ? JSON.stringify(data.bodyType)
          : null;
      }

      if (data.interests !== undefined) {
        formattedData.interestPreferences = Array.isArray(data.interests)
          ? JSON.stringify(data.interests)
          : null;
      }

      if (data.highSchoolPreferences !== undefined) {
        formattedData.highSchoolPreference = Array.isArray(
          data.highSchoolPreferences,
        )
          ? JSON.stringify(data.highSchoolPreferences)
          : null;
      }

      // Smoking and drinking preferences (unified system)
      if (data.smokingPreference !== undefined) {
        formattedData.smokingPreference = data.smokingPreference;
      }

      if (data.drinkingPreference !== undefined) {
        formattedData.drinkingPreference = data.drinkingPreference;
      }

      console.log(
        "🔧 [UNIFIED-DEAL-BREAKERS] Formatted data for server:",
        formattedData,
      );

      try {
        // Check if preferences already exist for this user
        const existingPrefs = await apiRequest(`/api/preferences/${user.id}`, {
          method: "GET",
        });

        let res;
        if (existingPrefs.ok) {
          // If preferences exist, patch them
          // Process the response properly with our helper
          const prefData = await handleApiResponse(existingPrefs);

          res = await apiRequest(`/api/preferences/${prefData.id || user.id}`, {
            method: "PATCH",
            data: formattedData,
          });
        } else {
          // If preferences don't exist, create new ones
          res = await apiRequest("/api/preferences", {
            method: "POST",
            data: {
              ...formattedData,
              userId: user.id,
            },
          });
        }

        // Process the response with our helper function
        return await handleApiResponse(res);
      } catch (error) {
        // If we get a 401, it's likely that the user's session has expired
        if (error instanceof Error && error.message.includes("401")) {
          // Refresh the auth state by querying the user endpoint again
          try {
            await apiRequest("/api/user", { method: "GET" });

            // If that succeeds, try the original request again
            const res = await apiRequest("/api/preferences", {
              method: "POST",
              data: {
                ...formattedData,
                userId: user.id,
              },
            });

            // Process the response properly
            return await handleApiResponse(res);
          } catch (refreshError) {
            console.error("Failed to refresh authentication:", refreshError);
            throw new Error(t("datingPreferences.errors.sessionExpired"));
          }
        }

        // For other errors, rethrow
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the user and preferences queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/preferences/${user?.id}`],
      });
      setIsFormDirty(false);
      setIsSaving(false);

      // Clear any remaining pending changes and timeouts
      pendingChangesRef.current = {};
      setPendingChanges({});
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Dating preferences saved successfully - no disruptive toast notification needed
    },
    onError: (error: Error) => {
      setIsSaving(false);
      toast({
        title: t("datingPreferences.errors.updateFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // State to track pending changes for batching
  const [pendingChanges, setPendingChanges] = useState<
    Partial<DatingPreferences>
  >({});
  const pendingChangesRef = useRef<Partial<DatingPreferences>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced save function that batches multiple rapid changes
  const batchedSave = useCallback(() => {
    if (!user?.id || Object.keys(pendingChangesRef.current).length === 0)
      return;

    // CRITICAL FIX: Only save the pending changes, don't merge with existing preferences
    const finalData = pendingChangesRef.current;

    console.log(
      "🔧 [FIELD-COUPLING-FIX] Saving ONLY changed fields:",
      pendingChangesRef.current,
    );
    console.log(
      "🔧 [FIELD-COUPLING-FIX] Changed field count:",
      Object.keys(pendingChangesRef.current).length,
    );

    // Clear pending changes
    pendingChangesRef.current = {};
    setPendingChanges({});

    // Execute the mutation
    updatePreferencesMutation.mutate(finalData as DatingPreferences);
  }, [preferences, user?.id, updatePreferencesMutation]);

  // Auto-save debounced function with minimal delay for instant UX
  const debouncedSave = useCallback(
    debounce(() => {
      batchedSave();
    }, 100), // Reduced from 500ms to 100ms for instant responsiveness
    [batchedSave],
  );

  // Enhanced handleChange with optimistic updates and race condition prevention
  const handleChange = (field: keyof DatingPreferences, value: any) => {
    if (!user?.id) {
      console.error("Cannot save preferences: User is not logged in");
      toast({
        title: t("common.error"),
        description: t("datingPreferences.errors.mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    console.log(
      `🔧 [UNIFIED-DEAL-BREAKERS] Updating field: ${field}, value:`,
      value,
    );

    // UNIFIED SMOKING/DRINKING PREFERENCE SYSTEM
    // When deal breakers are changed, automatically set smokingPreference and drinkingPreference
    let updatedPreferences = { [field]: value };

    if (field === "dealBreakers" && Array.isArray(value)) {
      // Set smoking preference based on smoking deal breaker
      if (value.includes("smoking")) {
        updatedPreferences["smokingPreference"] = "no"; // Zero tolerance for any smoking
        console.log(
          `🔧 [UNIFIED-DEAL-BREAKERS] Setting smokingPreference: no (due to smoking deal breaker)`,
        );
      } else {
        updatedPreferences["smokingPreference"] = null; // Any level acceptable
        console.log(
          `🔧 [UNIFIED-DEAL-BREAKERS] Setting smokingPreference: null (no smoking deal breaker)`,
        );
      }

      // Set drinking preference based on drinking deal breaker
      if (value.includes("drinking")) {
        updatedPreferences["drinkingPreference"] = "no"; // Zero tolerance for any drinking
        console.log(
          `🔧 [UNIFIED-DEAL-BREAKERS] Setting drinkingPreference: no (due to drinking deal breaker)`,
        );
      } else {
        updatedPreferences["drinkingPreference"] = null; // Any level acceptable
        console.log(
          `🔧 [UNIFIED-DEAL-BREAKERS] Setting drinkingPreference: null (no drinking deal breaker)`,
        );
      }
    }

    // Update UI state with all changes
    setPreferences((prev) => ({
      ...prev,
      ...updatedPreferences,
    }));
    setIsFormDirty(true);

    // Track all changes for batched saving
    pendingChangesRef.current = updatedPreferences;
    setPendingChanges(updatedPreferences);

    // Show saving indicator when changes are made
    setIsSaving(true);

    // Store selection persistently in storage as backup with user-specific key
    try {
      const userId = user.id;
      const storageKey = `dating_preferences_${userId}_${field}`;
      safeStorageSetObject(storageKey, value);
    } catch (error) {
      console.error("Error saving to storage:", error);
    }

    // Clear existing timeout and set new one for batched save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Use immediate save for critical changes, optimized debounced for rapid selections
    if (field === "dealBreakers") {
      // For deal breakers, use immediate save for instant responsiveness
      saveTimeoutRef.current = setTimeout(() => {
        batchedSave();
      }, 10); // Reduced from 30ms to 10ms for instant deal breaker updates
    } else {
      // For other fields, use optimized debounced save
      debouncedSave();
    }
  };

  // Manual save function (kept for compatibility)
  const handleSave = () => {
    setIsSaving(true);
    updatePreferencesMutation.mutate(preferences);
  };

  // Fetch global deal breakers
  const fetchGlobalDealBreakers = async () => {
    if (!user?.id) return;

    setIsLoadingGlobalDealBreakers(true);
    try {
      const res = await apiRequest("/api/global-deal-breakers", {
        method: "GET",
      });
      const data = await handleApiResponse(res);
      setGlobalDealBreakers(data || []);
    } catch (error) {
      console.error("Error fetching global deal breakers:", error);
      toast({
        title: "Error",
        description: "Failed to load global deal breakers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGlobalDealBreakers(false);
    }
  };

  // Add custom deal breaker to global list
  const addCustomDealBreaker = async () => {
    if (!customDealBreaker.trim() || !user?.id) return;

    setIsAddingGlobalDealBreaker(true);
    try {
      const res = await apiRequest("/api/global-deal-breakers", {
        method: "POST",
        data: {
          dealBreaker: customDealBreaker.trim(),
          createdBy: user.id,
        },
      });

      const newDealBreaker = await handleApiResponse(res);

      // Add to local state
      setGlobalDealBreakers((prev) => [...prev, newDealBreaker]);

      // Add to user's selected deal breakers
      const dealBreakerValue = `custom_${newDealBreaker.id}`;
      handleChange("dealBreakers", [
        ...preferences.dealBreakers,
        dealBreakerValue,
      ]);

      // Reset form
      setCustomDealBreaker("");
      setCustomDealBreakerDialogOpen(false);

      toast({
        title: "Deal Breaker Added",
        description: "Your custom deal breaker has been added",
        variant: "default",
      });
    } catch (error) {
      console.error("Error adding custom deal breaker:", error);
      toast({
        title: "Error",
        description: "Failed to add custom deal breaker",
        variant: "destructive",
      });
    } finally {
      setIsAddingGlobalDealBreaker(false);
    }
  };

  // Fetch global deal breakers when component mounts and when user ID changes
  useEffect(() => {
    if (user?.id) {
      fetchGlobalDealBreakers();
    }
  }, [user?.id]);

  // Fetch preferences query
  const { data: fetchedPreferences, isLoading: isLoadingPreferences } =
    useQuery({
      queryKey: [`/api/preferences/${user?.id}`],
      queryFn: async () => {
        if (!user?.id) return null;

        try {
          const res = await apiRequest(`/api/preferences/${user?.id}`, {
            method: "GET",
          });

          // If 404, it means preferences don't exist yet - return null instead of throwing error
          if (res.status === 404) {
            return null;
          }

          if (!res.ok) {
            throw new Error("Failed to fetch dating preferences");
          }

          // Use our helper function to safely process the response
          return await handleApiResponse(res);
        } catch (error) {
          console.error("Error fetching dating preferences:", error);
          // If it's a 404, return null instead of throwing
          if (error instanceof Error && error.message.includes("404")) {
            return null;
          }
          throw error;
        }
      },
      enabled: !!user?.id, // Only run the query if user ID exists
      staleTime: 300000, // 5 minutes
      retry: 1, // Only retry once to avoid too many retries on non-existent data
    });

  // Also fetch global deal breakers when preferences are loaded to ensure proper resolution
  useEffect(() => {
    if (fetchedPreferences && user?.id && globalDealBreakers.length === 0) {
      fetchGlobalDealBreakers();
    }
  }, [fetchedPreferences, user?.id, globalDealBreakers.length]);

  // Cleanup function to prevent memory leaks on component unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Clear pending changes
      pendingChangesRef.current = {};

      console.log("Dating preferences component cleanup completed");
    };
  }, []);

  // Helper function to safely parse JSON string
  const safeParseJSON = (
    jsonString: string | null | undefined,
    defaultValue: any[] = [],
  ): any[] => {
    if (!jsonString) return defaultValue;

    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (e) {
      console.error("Error parsing JSON:", e);
      return defaultValue;
    }
  };

  // Load preferences from localStorage as a fallback when component mounts
  useEffect(() => {
    if (!user?.id) return; // Only proceed if user is logged in

    try {
      // Load saved preferences from localStorage for all fields in all tabs
      // Use user-specific keys to avoid cross-user data pollution
      const userId = user.id;
      const fields: (keyof DatingPreferences)[] = [
        // Basics tab
        "ageRange",
        "height",
        "bodyType",
        "distance",
        // Background tab
        "religion",
        "tribes",
        "educationLevel",
        "highSchoolPreferences",
        // Lifestyle tab
        "hasChildren",
        "wantsChildren",
        "lookingFor",
        // Dealbreakers tab
        "dealBreakers",
        "matchingPriorities",
        "interests",
        "relationshipGoalPreference",
      ];

      const localPrefs: Partial<DatingPreferences> = {};

      for (const field of fields) {
        // Use user-specific storage key
        const storageKey = `dating_preferences_${userId}_${field}`;
        const parsedValue = safeStorageGetObject<any>(storageKey);

        if (parsedValue !== null && parsedValue !== undefined) {
          localPrefs[field] = parsedValue;
        }
      }

      if (Object.keys(localPrefs).length > 0) {
        console.log(
          `🔧 [FIELD-COUPLING-FIX] Loaded user ${userId} preferences from localStorage:`,
          localPrefs,
        );

        // CRITICAL FIX: Update each field individually to prevent coupling
        // Don't batch all localStorage values together
        for (const [field, value] of Object.entries(localPrefs)) {
          if (value !== null && value !== undefined) {
            setPreferences((prev) => ({
              ...prev,
              [field]: value,
            }));
            console.log(
              `🔧 [FIELD-COUPLING-FIX] Individually loaded ${field}:`,
              value,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }, [user?.id]); // Re-run when user ID changes

  // Create refs for form fields to use for scrolling
  const fieldRefs = {
    ageRange: useRef<HTMLDivElement>(null),
    height: useRef<HTMLDivElement>(null),
    bodyType: useRef<HTMLDivElement>(null),
    distance: useRef<HTMLDivElement>(null),
    religion: useRef<HTMLDivElement>(null),
    // religiousImportance field removed
    educationLevel: useRef<HTMLDivElement>(null),
    highSchoolPreferences: useRef<HTMLDivElement>(null),
    tribes: useRef<HTMLDivElement>(null),
    hasChildren: useRef<HTMLDivElement>(null),
    wantsChildren: useRef<HTMLDivElement>(null),
    lookingFor: useRef<HTMLDivElement>(null),
    dealBreakers: useRef<HTMLDivElement>(null),
    interests: useRef<HTMLDivElement>(null),
    matchingPriorities: useRef<HTMLDivElement>(null),
  };

  // Handle URL parameters for section and field focus
  useEffect(() => {
    const { section, field } = parseUrlParams();

    // If there's a field specified in the URL, scroll to it after component is fully rendered
    if (field && Object.keys(fieldRefs).includes(field)) {
      // Set the appropriate section first if it exists
      if (
        section &&
        ["basics", "background", "lifestyle", "dealbreakers"].includes(section)
      ) {
        setActiveSection(section);
      }

      // Immediately scroll to the field without artificial delays
      setTimeout(() => {
        const fieldRef = fieldRefs[field as keyof typeof fieldRefs];
        if (fieldRef?.current) {
          fieldRef.current.scrollIntoView({ behavior: "smooth" });

          // Add visual highlight to the field
          fieldRef.current.classList.add(
            "animate-pulse",
            "bg-purple-100",
            "dark:bg-purple-900/30",
          );

          // Remove highlight after 1 second for faster feedback
          setTimeout(() => {
            fieldRef.current?.classList.remove(
              "animate-pulse",
              "bg-purple-100",
              "dark:bg-purple-900/30",
            );
          }, 1000); // Reduced from 2000ms to 1000ms
        }
      }, 50); // Reduced from 300ms to 50ms for instant field highlighting

      // Clean the URL to avoid keeping the parameters
      setLocation("/dating-preferences", { replace: true });
    }
  }, [parseUrlParams, setLocation]);

  // Update preferences when data is fetched
  useEffect(() => {
    if (fetchedPreferences) {
      console.log("Fetched preferences from API:", fetchedPreferences);

      // First, check for values in localStorage that may be more recent than the API data
      // Use user-specific keys to ensure we're getting the current user's data
      if (!user?.id) {
        console.error(
          "User ID is undefined, cannot load user-specific preferences",
        );
        return;
      }

      const userId = user.id;

      // Basics tab
      const localBodyType =
        safeStorageGetObject<string[]>(
          `dating_preferences_${userId}_bodyType`,
        ) || [];
      if (localBodyType.length > 0) {
        console.log(
          `Found bodyType in storage for user ${userId}:`,
          localBodyType,
        );
      }

      // Basic tab
      const localAgeRange = safeStorageGetObject<[number, number]>(
        `dating_preferences_${userId}_ageRange`,
      );
      if (
        localAgeRange &&
        Array.isArray(localAgeRange) &&
        localAgeRange.length === 2
      ) {
        console.log(
          `Found ageRange in storage for user ${userId}:`,
          localAgeRange,
        );
      }

      const localHeight = safeStorageGetObject<[number, number]>(
        `dating_preferences_${userId}_height`,
      );
      if (
        localHeight &&
        Array.isArray(localHeight) &&
        localHeight.length === 2
      ) {
        console.log(`Found height in storage for user ${userId}:`, localHeight);
      }

      // Background tab
      const localReligion =
        safeStorageGetObject<string[]>(
          `dating_preferences_${userId}_religion`,
        ) || [];
      if (localReligion.length > 0) {
        console.log(
          `Found religion in storage for user ${userId}:`,
          localReligion,
        );
      }

      const localTribes =
        safeStorageGetObject<string[]>(`dating_preferences_${userId}_tribes`) ||
        [];
      if (localTribes.length > 0) {
        console.log(`Found tribes in storage for user ${userId}:`, localTribes);
      }

      const localEducationLevel =
        safeStorageGetObject<string[]>(
          `dating_preferences_${userId}_educationLevel`,
        ) || [];
      if (localEducationLevel.length > 0) {
        console.log(
          `Found educationLevel in storage for user ${userId}:`,
          localEducationLevel,
        );
      }

      // Lifestyle tab
      const localHasChildren = safeStorageGetObject<boolean>(
        `dating_preferences_${userId}_hasChildren`,
      );
      if (localHasChildren !== null && localHasChildren !== undefined) {
        console.log(
          `Found hasChildren in storage for user ${userId}:`,
          localHasChildren,
        );
      }

      const localWantsChildren = safeStorageGetObject<boolean>(
        `dating_preferences_${userId}_wantsChildren`,
      );
      if (localWantsChildren !== null && localWantsChildren !== undefined) {
        console.log(
          `Found wantsChildren in storage for user ${userId}:`,
          localWantsChildren,
        );
      }

      const localLookingFor = safeStorageGetObject<string>(
        `dating_preferences_${userId}_lookingFor`,
      );
      if (localLookingFor) {
        console.log(
          `Found lookingFor in storage for user ${userId}:`,
          localLookingFor,
        );
      }

      // Deal Breakers tab
      const localRelationshipGoalPreference = safeStorageGetObject<string>(
        `dating_preferences_${userId}_relationshipGoalPreference`,
      );
      if (localRelationshipGoalPreference) {
        console.log(
          `Found relationshipGoalPreference in storage for user ${userId}:`,
          localRelationshipGoalPreference,
        );
      }

      // Check that each field in the fetched data is valid before using it
      const validatedPreferences: Partial<DatingPreferences> = {};

      // For numeric preferences - prioritize localStorage values

      // Age Range - prioritize localStorage values and apply age restrictions
      if (localAgeRange) {
        // Apply age restriction: cap max age to 25 for users under 18
        const maxAllowed = isUnder18(user?.dateOfBirth || null)
          ? 25
          : localAgeRange[1];
        const cappedAgeRange: [number, number] = [
          localAgeRange[0],
          Math.min(maxAllowed, localAgeRange[1]),
        ];
        validatedPreferences.ageRange = cappedAgeRange;
        console.log(
          "Using ageRange from localStorage with age restriction applied:",
          cappedAgeRange,
        );
      } else if (
        fetchedPreferences.minAge !== null &&
        fetchedPreferences.minAge !== undefined &&
        fetchedPreferences.maxAge !== null &&
        fetchedPreferences.maxAge !== undefined
      ) {
        // Only set ageRange if BOTH minAge AND maxAge are present (not null)
        // Apply age restriction: cap max age to 25 for users under 18
        const maxAllowed = isUnder18(user?.dateOfBirth || null)
          ? 25
          : fetchedPreferences.maxAge;
        const cappedAgeRange: [number, number] = [
          fetchedPreferences.minAge,
          Math.min(maxAllowed, fetchedPreferences.maxAge),
        ];
        validatedPreferences.ageRange = cappedAgeRange;
      }
      // If minAge or maxAge is null, keep ageRange as null (default N/A state)

      // Distance preference
      if (typeof fetchedPreferences.distancePreference === "number") {
        validatedPreferences.distance = fetchedPreferences.distancePreference;
      }

      // Religious importance preference - removed as requested

      // Height Range - prioritize localStorage values
      if (localHeight) {
        validatedPreferences.height = localHeight;
        console.log(
          "Using height from localStorage instead of API:",
          localHeight,
        );
      } else if (
        fetchedPreferences.minHeightPreference &&
        fetchedPreferences.maxHeightPreference
      ) {
        validatedPreferences.height = [
          fetchedPreferences.minHeightPreference,
          fetchedPreferences.maxHeightPreference,
        ];
      }

      // Parse JSON strings for arrays
      // Religion preferences - prioritize localStorage values
      if (localReligion.length > 0) {
        validatedPreferences.religion = localReligion;
        console.log("Using religion from localStorage instead of API");
      } else {
        if (
          typeof fetchedPreferences.religionPreference === "string" &&
          fetchedPreferences.religionPreference
        ) {
          validatedPreferences.religion = safeParseJSON(
            fetchedPreferences.religionPreference,
          );
        } else if (
          Array.isArray(fetchedPreferences.religionPreference) &&
          fetchedPreferences.religionPreference.length > 0
        ) {
          validatedPreferences.religion = fetchedPreferences.religionPreference;
        } else {
          // Keep it as an empty array for new users
          validatedPreferences.religion = [];
        }
      }

      // Education level preferences - prioritize localStorage values
      if (localEducationLevel.length > 0) {
        validatedPreferences.educationLevel = localEducationLevel;
        console.log("Using educationLevel from localStorage instead of API");
      } else {
        if (
          typeof fetchedPreferences.educationLevelPreference === "string" &&
          fetchedPreferences.educationLevelPreference
        ) {
          validatedPreferences.educationLevel = safeParseJSON(
            fetchedPreferences.educationLevelPreference,
          );
        } else if (
          Array.isArray(fetchedPreferences.educationLevelPreference) &&
          fetchedPreferences.educationLevelPreference.length > 0
        ) {
          validatedPreferences.educationLevel =
            fetchedPreferences.educationLevelPreference;
        } else {
          // Keep it as an empty array for new users
          validatedPreferences.educationLevel = [];
        }
      }

      // Tribes/ethnicity preferences - prioritize localStorage values
      if (localTribes.length > 0) {
        validatedPreferences.tribes = localTribes;
        console.log("Using tribes from localStorage instead of API");
      } else {
        if (
          typeof fetchedPreferences.ethnicityPreference === "string" &&
          fetchedPreferences.ethnicityPreference
        ) {
          validatedPreferences.tribes = safeParseJSON(
            fetchedPreferences.ethnicityPreference,
          );
        } else if (
          Array.isArray(fetchedPreferences.ethnicityPreference) &&
          fetchedPreferences.ethnicityPreference.length > 0
        ) {
          validatedPreferences.tribes = fetchedPreferences.ethnicityPreference;
        } else {
          // Keep it as an empty array for new users
          validatedPreferences.tribes = [];
        }
      }

      // Looking for relationship type - prioritize localStorage values
      if (localLookingFor) {
        validatedPreferences.lookingFor = localLookingFor;
        console.log("Using lookingFor from localStorage instead of API");
      } else {
        // Keep it as null for new users
        validatedPreferences.lookingFor = null;
      }

      // Relationship Goal Preference (free text field) - prioritize localStorage values
      if (localRelationshipGoalPreference) {
        validatedPreferences.relationshipGoalPreference =
          localRelationshipGoalPreference;
        console.log(
          "Using relationshipGoalPreference from localStorage instead of API",
        );
      } else if (
        typeof fetchedPreferences.relationshipGoalPreference === "string" &&
        fetchedPreferences.relationshipGoalPreference
      ) {
        validatedPreferences.relationshipGoalPreference =
          fetchedPreferences.relationshipGoalPreference;
      } else {
        // Keep it as null for new users
        validatedPreferences.relationshipGoalPreference = null;
      }

      // Smoking and drinking preferences (unified system - automatically set by deal breakers)
      validatedPreferences.smokingPreference =
        fetchedPreferences.smokingPreference || null;
      validatedPreferences.drinkingPreference =
        fetchedPreferences.drinkingPreference || null;
      console.log(
        `🔧 [UNIFIED-DEAL-BREAKERS] Loaded preferences - smoking: ${validatedPreferences.smokingPreference}, drinking: ${validatedPreferences.drinkingPreference}`,
      );

      // Deal breakers
      if (
        typeof fetchedPreferences.dealBreakers === "string" &&
        fetchedPreferences.dealBreakers
      ) {
        validatedPreferences.dealBreakers = safeParseJSON(
          fetchedPreferences.dealBreakers,
        );
      } else if (
        Array.isArray(fetchedPreferences.dealBreakers) &&
        fetchedPreferences.dealBreakers.length > 0
      ) {
        validatedPreferences.dealBreakers = fetchedPreferences.dealBreakers;
      } else {
        // Keep it as an empty array for new users
        validatedPreferences.dealBreakers = [];
      }

      // Interest preferences
      if (
        typeof fetchedPreferences.interestPreferences === "string" &&
        fetchedPreferences.interestPreferences
      ) {
        validatedPreferences.interests = safeParseJSON(
          fetchedPreferences.interestPreferences,
        );
      } else if (
        Array.isArray(fetchedPreferences.interestPreferences) &&
        fetchedPreferences.interestPreferences.length > 0
      ) {
        validatedPreferences.interests = fetchedPreferences.interestPreferences;
      } else {
        // Keep it as an empty array for new users
        validatedPreferences.interests = [];
      }

      // Body type preferences
      // If we have localStorage value, prefer it over API value
      if (localBodyType.length > 0) {
        validatedPreferences.bodyType = localBodyType;
        console.log("Using bodyType from localStorage instead of API");
      } else {
        if (
          typeof fetchedPreferences.bodyTypePreference === "string" &&
          fetchedPreferences.bodyTypePreference
        ) {
          validatedPreferences.bodyType = safeParseJSON(
            fetchedPreferences.bodyTypePreference,
          );
        } else if (
          Array.isArray(fetchedPreferences.bodyTypePreference) &&
          fetchedPreferences.bodyTypePreference.length > 0
        ) {
          validatedPreferences.bodyType = fetchedPreferences.bodyTypePreference;
        } else {
          // Keep it as an empty array for new users
          validatedPreferences.bodyType = [];
        }
      }

      // Matching priorities
      if (
        typeof fetchedPreferences.matchingPriorities === "string" &&
        fetchedPreferences.matchingPriorities
      ) {
        validatedPreferences.matchingPriorities = safeParseJSON(
          fetchedPreferences.matchingPriorities,
        );
      } else if (
        Array.isArray(fetchedPreferences.matchingPriorities) &&
        fetchedPreferences.matchingPriorities.length > 0
      ) {
        validatedPreferences.matchingPriorities =
          fetchedPreferences.matchingPriorities;
      } else {
        // Keep it as an empty array for new users
        validatedPreferences.matchingPriorities = [];
      }

      // High school preferences - check localStorage first, then server data
      const localHighSchoolPreferences =
        safeStorageGetObject<string[]>(
          `dating_preferences_${userId}_highSchoolPreferences`,
        ) || [];
      if (localHighSchoolPreferences.length > 0) {
        validatedPreferences.highSchoolPreferences = localHighSchoolPreferences;
        console.log(
          "Using highSchoolPreferences from localStorage instead of API:",
          localHighSchoolPreferences,
        );
      } else {
        if (
          typeof fetchedPreferences.highSchoolPreference === "string" &&
          fetchedPreferences.highSchoolPreference
        ) {
          validatedPreferences.highSchoolPreferences = safeParseJSON(
            fetchedPreferences.highSchoolPreference,
          );
        } else if (
          Array.isArray(fetchedPreferences.highSchoolPreference) &&
          fetchedPreferences.highSchoolPreference.length > 0
        ) {
          validatedPreferences.highSchoolPreferences =
            fetchedPreferences.highSchoolPreference;
        } else {
          // Keep it as an empty array for new users - NO DEFAULT "ANYWHERE" SELECTION
          validatedPreferences.highSchoolPreferences = [];
        }
      }

      // Boolean preferences - prioritize localStorage values
      if (localHasChildren !== null) {
        validatedPreferences.hasChildren = localHasChildren;
        console.log(
          "Using hasChildren from localStorage instead of API:",
          localHasChildren,
        );
      } else if (fetchedPreferences.hasChildrenPreference === "yes") {
        validatedPreferences.hasChildren = true;
      } else if (fetchedPreferences.hasChildrenPreference === "no") {
        validatedPreferences.hasChildren = false;
      } else {
        // For any other value or if it's not set, keep it as null for new users
        validatedPreferences.hasChildren = null;
      }

      if (localWantsChildren !== null) {
        validatedPreferences.wantsChildren = localWantsChildren;
        console.log(
          "Using wantsChildren from localStorage instead of API:",
          localWantsChildren,
        );
      } else if (fetchedPreferences.wantsChildrenPreference === "yes") {
        validatedPreferences.wantsChildren = true;
      } else if (fetchedPreferences.wantsChildrenPreference === "no") {
        validatedPreferences.wantsChildren = false;
      } else {
        // For any other value or if it's not set, keep it as null for new users
        validatedPreferences.wantsChildren = null;
      }

      console.log(
        "Validated preferences with localStorage priority:",
        validatedPreferences,
      );

      // Update the state with the validated preferences merged with defaults
      // Make sure we keep all values from validatedPreferences to ensure persistence across tabs
      setPreferences((prev) => {
        const mergedPreferences = {
          ...prev,
          ...validatedPreferences,
        };
        console.log("Merged preferences for persistence:", mergedPreferences);
        return mergedPreferences;
      });

      // Also ensure we update any missing values in localStorage
      try {
        // Save all preferences from all tabs to localStorage for backup/persistence
        const allFieldsToSave: (keyof DatingPreferences)[] = [
          // Basics tab
          "bodyType",
          "ageRange",
          "height",
          "distance",
          // Background tab
          "religion",
          "tribes",
          "educationLevel",
          "highSchoolPreferences",
          // Lifestyle tab
          "hasChildren",
          "wantsChildren",
          "lookingFor",
          // Deal Breakers tab
          "dealBreakers",
          "matchingPriorities",
          "interests",
        ];

        for (const field of allFieldsToSave) {
          if (validatedPreferences[field] !== undefined) {
            const userId = user?.id;
            if (!userId) {
              console.error(
                "Cannot save preferences to storage: User is not logged in",
              );
              return;
            }
            safeStorageSetObject(
              `dating_preferences_${userId}_${field}`,
              validatedPreferences[field],
            );
          }
        }
      } catch (e) {
        console.error("Error saving to localStorage during API sync:", e);
      }
    }
  }, [fetchedPreferences]);

  // Animation variants for transitions
  const slideInRight = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  // Show loading state when fetching preferences
  if (isLoadingPreferences) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin w-8 h-8 rounded-full border-4 border-pink-100 border-t-pink-500"></div>
          <p className="text-sm text-gray-500 font-medium">
            Loading your preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Introduction Card */}
      <div className="animate-in slide-in-from-bottom duration-500">
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-1.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-xs font-medium tracking-tight">
                  {isUnder18(user?.dateOfBirth || null)
                    ? t("datingPreferences.friendshipTitle")
                    : t("datingPreferences.title")}
                </h3>
                <p className="text-white/90 text-[10px]">
                  {isUnder18(user?.dateOfBirth || null)
                    ? t("datingPreferences.friendshipSubtitle")
                    : t("datingPreferences.subtitle")}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {isSaving && (
                  <div className="flex items-center space-x-1">
                    <Loader2 className="h-3 w-3 animate-spin text-white/80" />
                    <span className="text-white/90 text-[10px]">Saving...</span>
                  </div>
                )}
                <Heart className="h-4 w-4 text-white/80" />
              </div>
            </div>
          </div>
          <CardContent className="p-1.5 bg-gradient-to-b from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
            <p className="text-[10px] text-gray-700 dark:text-gray-300">
              {t("datingPreferences.description")}
            </p>

            <div className="mt-3 mx-auto max-w-lg">
              <div className="relative pb-8">
                {/* Slider Track */}
                <div className="absolute h-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full top-5 left-0 right-0 z-0"></div>

                {/* Slider Fill - Dynamic width based on activeSection */}
                <div
                  className="absolute h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full top-5 left-0 z-0"
                  style={{
                    width:
                      activeSection === "basics"
                        ? "12.5%"
                        : activeSection === "background"
                          ? "37.5%"
                          : activeSection === "lifestyle"
                            ? "62.5%"
                            : "87.5%",
                  }}
                ></div>

                {/* Section Indicators */}
                <div className="flex justify-between relative z-10">
                  {/* Basics */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setActiveSection("basics")}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-300 ${
                        activeSection === "basics"
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md scale-110"
                          : "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-gray-700"
                      }`}
                      aria-label="Basics section"
                    >
                      <Users className="h-5 w-5" />
                    </button>
                    <span
                      className="text-xs font-medium"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {t("datingPreferences.sections.basics")}
                    </span>
                  </div>

                  {/* Background */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setActiveSection("background")}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-300 ${
                        activeSection === "background"
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md scale-110"
                          : "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-gray-700"
                      }`}
                      aria-label="Background section"
                    >
                      <Globe className="h-5 w-5" />
                    </button>
                    <span
                      className="text-xs font-medium"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {t("datingPreferences.sections.background")}
                    </span>
                  </div>

                  {/* Lifestyle */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setActiveSection("lifestyle")}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-300 ${
                        activeSection === "lifestyle"
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md scale-110"
                          : "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-gray-700"
                      }`}
                      aria-label="Lifestyle section"
                    >
                      <Coffee className="h-5 w-5" />
                    </button>
                    <span
                      className="text-xs font-medium"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {t("datingPreferences.sections.lifestyle")}
                    </span>
                  </div>

                  {/* Dealbreakers - only show for users 18+ */}
                  {!isUnder18(user?.dateOfBirth || null) && (
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => setActiveSection("dealbreakers")}
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-300 ${
                          activeSection === "dealbreakers"
                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md scale-110"
                            : "bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-gray-700"
                        }`}
                        aria-label="Dealbreakers section"
                      >
                        <Filter className="h-5 w-5" />
                      </button>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {t("datingPreferences.sections.dealbreakers")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content with conditional rendering based on activeSection */}
      <div className="animate-in slide-in-from-right duration-500 delay-200 relative h-[70vh] overflow-hidden">
        {activeSection === "basics" && (
          <div className="animate-in fade-in duration-300 absolute inset-0 overflow-y-auto pb-10 max-h-full">
            {/* Basics Section */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="py-1 px-1">
                <div className="h-1"></div>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                {/* Age Range - Compact UI with +/- buttons */}
                <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-white dark:bg-gray-900 shadow-sm">
                  {/* Header area */}
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-gray-800 dark:text-gray-200 text-sm">
                      <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2">
                        <Calendar className="h-4 w-4 text-pink-500" />
                      </div>
                      {t("datingPreferences.fields.ageRange")}
                    </Label>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {preferences.ageRange
                        ? `${preferences.ageRange[0]} - ${preferences.ageRange[1]} years`
                        : t("datingPreferences.labels.notSpecified")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Min age adjustment */}
                    <div className="flex items-center">
                      <div className="text-xs font-medium mr-1">
                        {t("datingPreferences.labels.min")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          if (!preferences.ageRange) {
                            // Initialize with default values if not set - restrict to 25 for under 18 users
                            const maxAge = isUnder18(user?.dateOfBirth || null)
                              ? 25
                              : 35;
                            handleChange("ageRange", [18, maxAge]);
                            return;
                          }
                          const newMin = Math.max(
                            18,
                            preferences.ageRange[0] - 1,
                          );
                          if (newMin < preferences.ageRange[1]) {
                            handleChange("ageRange", [
                              newMin,
                              preferences.ageRange[1],
                            ]);
                          }
                        }}
                      >
                        <Minus className="h-2 w-2" />
                      </Button>
                      <span className="mx-1 min-w-6 text-center text-xs">
                        {preferences.ageRange ? preferences.ageRange[0] : "N/A"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          if (!preferences.ageRange) {
                            // Initialize with default values if not set - restrict to 25 for under 18 users
                            const maxAge = isUnder18(user?.dateOfBirth || null)
                              ? 25
                              : 35;
                            handleChange("ageRange", [18, maxAge]);
                            return;
                          }
                          const newMin = Math.min(
                            preferences.ageRange[1] - 1,
                            preferences.ageRange[0] + 1,
                          );
                          handleChange("ageRange", [
                            newMin,
                            preferences.ageRange[1],
                          ]);
                        }}
                      >
                        <Plus className="h-2 w-2" />
                      </Button>
                    </div>

                    {/* Max age adjustment */}
                    <div className="flex items-center">
                      <div className="text-xs font-medium mr-1">
                        {t("datingPreferences.labels.max")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          if (!preferences.ageRange) {
                            // Initialize with default values if not set - restrict to 25 for under 18 users
                            const maxAge = isUnder18(user?.dateOfBirth || null)
                              ? 25
                              : 35;
                            handleChange("ageRange", [18, maxAge]);
                            return;
                          }
                          const newMax = Math.max(
                            preferences.ageRange[0] + 1,
                            preferences.ageRange[1] - 1,
                          );
                          handleChange("ageRange", [
                            preferences.ageRange[0],
                            newMax,
                          ]);
                        }}
                      >
                        <Minus className="h-2 w-2" />
                      </Button>
                      <span className="mx-1 min-w-6 text-center text-xs">
                        {preferences.ageRange ? preferences.ageRange[1] : "N/A"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          if (!preferences.ageRange) {
                            // Initialize with default values if not set - restrict to 25 for under 18 users
                            const maxAge = isUnder18(user?.dateOfBirth || null)
                              ? 25
                              : 35;
                            handleChange("ageRange", [18, maxAge]);
                            return;
                          }
                          // Restrict max age to 25 for users under 18, otherwise allow up to 75
                          const maxAllowed = isUnder18(
                            user?.dateOfBirth || null,
                          )
                            ? 25
                            : 75;
                          const newMax = Math.min(
                            maxAllowed,
                            preferences.ageRange[1] + 1,
                          );
                          handleChange("ageRange", [
                            preferences.ageRange[0],
                            newMax,
                          ]);
                        }}
                      >
                        <Plus className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Hidden Distance and Looking For fields */}

                {/* Height Range - Compact UI with +/- buttons - Hide for under 18 users */}
                {!isUnder18(user?.dateOfBirth || null) && (
                  <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-white dark:bg-gray-900 shadow-sm">
                    {/* Header area */}
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold flex items-center text-gray-800 dark:text-gray-200 text-sm">
                        <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2">
                          <Ruler className="h-4 w-4 text-pink-500" />
                        </div>
                        {t("datingPreferences.fields.heightRange")}
                      </Label>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {preferences.height
                          ? `${cmToFeet(preferences.height[0])} - ${cmToFeet(preferences.height[1])}`
                          : t("datingPreferences.labels.notSpecified")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {/* Min height adjustment */}
                      <div className="flex items-center">
                        <div className="text-xs font-medium mr-1">
                          {t("datingPreferences.labels.min")}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            if (!preferences.height) {
                              // Initialize with default values if not set
                              handleChange("height", [160, 185]);
                              return;
                            }
                            const newMin = Math.max(
                              140,
                              preferences.height[0] - 1,
                            );
                            if (newMin < preferences.height[1]) {
                              handleChange("height", [
                                newMin,
                                preferences.height[1],
                              ]);
                            }
                          }}
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                        <span className="mx-1 min-w-9 text-center text-xs">
                          {preferences.height
                            ? cmToFeet(preferences.height[0])
                            : "N/A"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            if (!preferences.height) {
                              // Initialize with default values if not set
                              handleChange("height", [160, 185]);
                              return;
                            }
                            const newMin = Math.min(
                              preferences.height[1] - 1,
                              preferences.height[0] + 1,
                            );
                            handleChange("height", [
                              newMin,
                              preferences.height[1],
                            ]);
                          }}
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>

                      {/* Max height adjustment */}
                      <div className="flex items-center">
                        <div className="text-xs font-medium mr-1">
                          {t("datingPreferences.labels.max")}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            if (!preferences.height) {
                              // Initialize with default values if not set
                              handleChange("height", [160, 185]);
                              return;
                            }
                            const newMax = Math.max(
                              preferences.height[0] + 1,
                              preferences.height[1] - 1,
                            );
                            handleChange("height", [
                              preferences.height[0],
                              newMax,
                            ]);
                          }}
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                        <span className="mx-1 min-w-9 text-center text-xs">
                          {preferences.height
                            ? cmToFeet(preferences.height[1])
                            : "N/A"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            if (!preferences.height) {
                              // Initialize with default values if not set
                              handleChange("height", [160, 185]);
                              return;
                            }
                            const newMax = Math.min(
                              220,
                              preferences.height[1] + 1,
                            );
                            handleChange("height", [
                              preferences.height[0],
                              newMax,
                            ]);
                          }}
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Body Type - Compact UI - Hide for under 18 users */}
                {!isUnder18(user?.dateOfBirth || null) && (
                  <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-white dark:bg-gray-900 shadow-sm">
                    {/* Header area */}
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold flex items-center text-gray-800 dark:text-gray-200 text-sm">
                        <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2">
                          <Scale className="h-4 w-4 text-pink-500" />
                        </div>
                        {t("datingPreferences.fields.bodyType")}
                      </Label>
                    </div>
                    <Select
                      onValueChange={(value) => {
                        let newBodyTypes;

                        if (value === "no_preference") {
                          // If "No Preference" is selected, clear all other selections and set only this
                          newBodyTypes = ["no_preference"];
                        } else {
                          // For any other selection, first remove "no_preference" if it exists
                          const currentBodyTypes = Array.isArray(
                            preferences.bodyType,
                          )
                            ? preferences.bodyType.filter(
                                (t) => t !== "no_preference",
                              )
                            : [];

                          // Then toggle the selected value
                          if (currentBodyTypes.includes(value)) {
                            newBodyTypes = currentBodyTypes.filter(
                              (t) => t !== value,
                            );
                          } else {
                            newBodyTypes = [...currentBodyTypes, value];
                          }
                        }

                        console.log("Body Type selection changed:", {
                          value,
                          newBodyTypes,
                        });
                        handleChange("bodyType", newBodyTypes);

                        // Also save to localStorage directly for redundancy with user ID
                        try {
                          const userId = user?.id;
                          if (userId) {
                            localStorage.setItem(
                              `dating_preferences_${userId}_bodyType`,
                              JSON.stringify(newBodyTypes),
                            );
                          }
                        } catch (e) {
                          console.error(
                            "Error saving body type to localStorage:",
                            e,
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-full border-pink-200 dark:border-pink-900/50 bg-white dark:bg-gray-800 mt-1">
                        <SelectValue
                          placeholder={t(
                            "datingPreferences.labels.selectBodyTypes",
                          )}
                        >
                          {Array.isArray(preferences.bodyType) &&
                          preferences.bodyType.length > 0
                            ? `${preferences.bodyType.length} selected`
                            : t("datingPreferences.labels.selectBodyTypes")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {bodyTypeOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className={
                                Array.isArray(preferences.bodyType) &&
                                preferences.bodyType.includes(option.value)
                                  ? "bg-pink-50 dark:bg-pink-900/20"
                                  : ""
                              }
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{option.label}</span>
                                {Array.isArray(preferences.bodyType) &&
                                  preferences.bodyType.includes(
                                    option.value,
                                  ) && (
                                    <Check className="h-4 w-4 text-pink-500 ml-2" />
                                  )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {/* Display selected body types */}
                    {Array.isArray(preferences.bodyType) &&
                    preferences.bodyType.length > 0 ? (
                      <div className="flex flex-col gap-2 mt-3 bg-pink-50/50 dark:bg-pink-950/20 p-3 rounded-lg border border-pink-100 dark:border-pink-900/30 max-h-[120px] overflow-y-auto">
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-medium text-pink-700 dark:text-pink-300">
                            Selected:
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Clear all body types
                              handleChange("bodyType", []);

                              // Update localStorage
                              try {
                                const userId = user?.id;
                                if (userId) {
                                  localStorage.setItem(
                                    `dating_preferences_${userId}_bodyType`,
                                    JSON.stringify([]),
                                  );
                                }
                              } catch (e) {
                                console.error(
                                  "Error saving body type to localStorage:",
                                  e,
                                );
                              }
                            }}
                            className="h-6 text-[10px] text-pink-600 hover:bg-pink-50 -mt-1 -mr-1"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear All
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {preferences.bodyType.map((bodyTypeValue) => {
                            const bodyTypeOption = bodyTypeOptions.find(
                              (o) => o.value === bodyTypeValue,
                            );
                            return (
                              <Badge
                                key={bodyTypeValue}
                                className="bg-pink-500 hover:bg-pink-600 px-2.5 py-0.5 text-xs shadow-sm flex-shrink-0 dating-preferences-font"
                                onClick={() => {
                                  // Ensure we have an array before filtering
                                  const currentBodyTypes = Array.isArray(
                                    preferences.bodyType,
                                  )
                                    ? preferences.bodyType
                                    : [];
                                  const newBodyTypes = currentBodyTypes.filter(
                                    (t) => t !== bodyTypeValue,
                                  );

                                  console.log("Removing body type:", {
                                    bodyTypeValue,
                                    newBodyTypes,
                                  });
                                  handleChange("bodyType", newBodyTypes);

                                  // Also save to localStorage directly for redundancy with user ID
                                  try {
                                    const userId = user?.id;
                                    if (userId) {
                                      localStorage.setItem(
                                        `dating_preferences_${userId}_bodyType`,
                                        JSON.stringify(newBodyTypes),
                                      );
                                    }
                                  } catch (e) {
                                    console.error(
                                      "Error saving body type to localStorage:",
                                      e,
                                    );
                                  }
                                }}
                              >
                                {bodyTypeOption
                                  ? bodyTypeOption.label
                                  : bodyTypeValue}
                                <X className="h-3 w-3 ml-1 inline-block" />
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-2 italic px-1">
                        {t("datingPreferences.descriptions.bodyTypeHelper")}
                      </div>
                    )}
                  </div>
                )}

                {/* Preferred Distance - New field below Body Type */}
                <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-white dark:bg-gray-900 shadow-sm">
                  {/* Header area */}
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-gray-800 dark:text-gray-200 text-sm">
                      <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2">
                        <Globe className="h-4 w-4 text-pink-500" />
                      </div>
                      {t("datingPreferences.fields.preferredDistance")}
                    </Label>
                  </div>
                  <Select
                    value={
                      preferences.distance !== null &&
                      preferences.distance !== undefined
                        ? preferences.distance.toString()
                        : undefined
                    }
                    onValueChange={(value) => {
                      const numValue =
                        value === "-1" ? -1 : parseInt(value, 10);
                      console.log("Distance preference changed:", {
                        value,
                        numValue,
                      });
                      handleChange("distance", numValue);

                      // Also save to localStorage directly for redundancy with user ID
                      try {
                        const userId = user?.id;
                        if (userId) {
                          localStorage.setItem(
                            `dating_preferences_${userId}_distance`,
                            JSON.stringify(numValue),
                          );
                        }
                      } catch (e) {
                        console.error(
                          "Error saving distance to localStorage:",
                          e,
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="w-full border-pink-200 dark:border-pink-900/50 bg-white dark:bg-gray-800 mt-1">
                      <SelectValue
                        placeholder={t(
                          "datingPreferences.labels.selectPreferredDistance",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {distanceOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {option.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {/* Display selected distance */}
                  {preferences.distance !== null &&
                    preferences.distance !== undefined && (
                      <div className="mt-3 bg-pink-50/50 dark:bg-pink-950/20 p-2.5 rounded-lg border border-pink-100 dark:border-pink-900/30">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-pink-700 dark:text-pink-300">
                              {distanceOptions.find(
                                (d) => d.value === preferences.distance,
                              )?.label || "Custom distance"}
                            </span>
                            <span className="text-xs text-pink-600 dark:text-pink-400">
                              {distanceOptions.find(
                                (d) => d.value === preferences.distance,
                              )?.description || "Custom range"}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleChange("distance", null);

                              // Update localStorage
                              try {
                                const userId = user?.id;
                                if (userId) {
                                  localStorage.removeItem(
                                    `dating_preferences_${userId}_distance`,
                                  );
                                }
                              } catch (e) {
                                console.error(
                                  "Error removing distance from localStorage:",
                                  e,
                                );
                              }
                            }}
                            className="h-6 text-[10px] text-pink-600 hover:bg-pink-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "background" && (
          <div className="animate-in fade-in duration-300 absolute inset-0 overflow-y-auto pb-10 max-h-full">
            {/* Background Section */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="py-1 px-1">
                <div className="h-1"></div>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                {/* Religion - Futuristic Dialog */}
                <div
                  ref={fieldRefs.religion}
                  className="p-4 rounded-xl border-2 border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-base">
                      <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
                        <span className="text-pink-500 text-lg">🙏</span>
                      </div>
                      Religion
                    </Label>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />{" "}
                          {t("datingPreferences.labels.selectReligions")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[380px] rounded-3xl bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] overflow-hidden backdrop-blur-xl">
                        {/* Animated background elements - futuristic with glowing effects */}
                        <div className="absolute inset-0 overflow-hidden opacity-20">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 rounded-full animate-pulse blur-3xl mix-blend-overlay"></div>
                          <div className="absolute -bottom-32 -left-16 w-56 h-56 bg-gradient-to-tr from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-full animate-pulse animation-delay-2000 blur-3xl mix-blend-overlay"></div>
                          <div className="absolute top-1/3 -right-16 w-48 h-48 bg-gradient-to-tr from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full animate-pulse animation-delay-4000 blur-3xl mix-blend-overlay"></div>
                        </div>

                        {/* Close button */}
                        <DialogClose className="absolute top-4 right-4 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-md border border-white/20 z-50">
                          <X className="h-5 w-5" />
                          <span className="sr-only">Close</span>
                        </DialogClose>

                        {/* Glowing border effect */}
                        <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

                        <div className="relative z-10 backdrop-blur-md">
                          <DialogHeader className="pb-0">
                            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
                            <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                              Faith Preferences
                            </DialogTitle>
                          </DialogHeader>

                          <div className="relative py-4 px-2 flex flex-col items-center">
                            <p className="text-xs text-center text-gray-300 mb-3 px-3">
                              Select the religious backgrounds you're interested
                              in
                            </p>

                            {/* Futuristic container for religion selection */}
                            <div className="relative rounded-2xl py-3 px-2 bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner w-full max-h-[350px] overflow-y-auto">
                              <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                                {religions.map((religionGroup) => (
                                  <div
                                    key={religionGroup.value}
                                    className="mb-2"
                                  >
                                    <h3 className="text-white text-sm font-medium mb-2 px-2 opacity-80">
                                      {religionGroup.name}
                                    </h3>

                                    <div className="flex flex-wrap gap-1.5 px-1">
                                      {religionGroup.denominations.map(
                                        (religion) => {
                                          const isSelected =
                                            preferences.religion.includes(
                                              religion.value,
                                            );

                                          return (
                                            <Badge
                                              key={religion.value}
                                              className={`cursor-pointer text-xs py-1 px-2.5 transition-all ${
                                                isSelected
                                                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700"
                                                  : "bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
                                              } backdrop-blur-md border ${isSelected ? "border-pink-400/50" : "border-white/10"}`}
                                              onClick={() => {
                                                const newReligions =
                                                  preferences.religion.includes(
                                                    religion.value,
                                                  )
                                                    ? preferences.religion.filter(
                                                        (r) =>
                                                          r !== religion.value,
                                                      )
                                                    : [
                                                        ...preferences.religion,
                                                        religion.value,
                                                      ];
                                                handleChange(
                                                  "religion",
                                                  newReligions,
                                                );
                                              }}
                                            >
                                              {religion.name}
                                              {isSelected && (
                                                <Check className="h-3 w-3 ml-1 inline-block" />
                                              )}
                                            </Badge>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Display selected religions */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
                    {preferences.religion.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {preferences.religion.map((religionValue) => (
                            <Badge
                              key={religionValue}
                              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-2.5 py-1 text-xs shadow-sm text-white flex items-center"
                              onClick={() => {
                                const newReligions =
                                  preferences.religion.filter(
                                    (r) => r !== religionValue,
                                  );
                                handleChange("religion", newReligions);
                              }}
                            >
                              {getReligionDisplayName(religionValue)}
                              <X className="h-3 w-3 ml-1.5" />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChange("religion", [])}
                            className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                          >
                            <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                            Clear All
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                        {t(
                          "datingPreferences.descriptions.religionHelperEmpty",
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Where should Love/Friendship come from? - Country Pool Selection */}
                <div className="p-4 rounded-xl border-2 border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-base">
                      <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
                        <Globe className="h-5 w-5 text-pink-500" />
                      </div>
                      {isUnder18(user?.dateOfBirth || null)
                        ? t("datingPreferences.fields.whereFromFriendshipTitle")
                        : t("datingPreferences.fields.whereFromTitle")}
                    </Label>
                  </div>

                  {/* Country selector display */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedCountry === "ANYWHERE"
                            ? `${getCountryFlag("ANYWHERE")} ` +
                              t("datingPreferences.labels.anywhereInWorld")
                            : `${getCountryFlag(selectedCountry)} ${selectedCountry}`}
                        </span>
                      </div>
                      <Dialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            <Globe className="h-4 w-4 mr-1" />{" "}
                            {t("datingPreferences.labels.changeLocation")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none bg-transparent">
                          <CountrySelector
                            onComplete={(country) => {
                              setSelectedCountry(country);
                            }}
                            initialCountry={selectedCountry}
                            isInDialog={true}
                            onDialogClose={() => setIsDialogOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {isUnder18(user?.dateOfBirth || null)
                        ? t(
                            "datingPreferences.descriptions.locationHelper",
                          ).replace("amour", "amitié")
                        : t("datingPreferences.descriptions.locationHelper")}
                    </div>
                  </div>
                </div>

                {/* Religious Importance section removed as requested */}

                {/* Tribes - Only show when Ghana is selected for geographic preferences */}
                {selectedCountry === "Ghana" && (
                  <div ref={fieldRefs.tribes}>
                    <TribesDialog
                      tribes={preferences.tribes}
                      onChange={(newTribes) => {
                        // Handle tribe selection with immediate update to both local state and API
                        handleChange("tribes", newTribes);

                        // Trigger immediate save to API
                        if (user?.id) {
                          const storageKey = `dating_preferences_${user.id}_tribes`;
                          try {
                            // Save to localStorage first for immediate feedback
                            localStorage.setItem(
                              storageKey,
                              JSON.stringify(newTribes),
                            );
                            console.log(
                              `Saved tribes to localStorage for user ${user.id}:`,
                              newTribes,
                            );

                            // Then trigger API save
                            updatePreferencesMutation.mutate({
                              ...preferences,
                              tribes: newTribes,
                            });
                          } catch (error) {
                            console.error("Error saving tribes:", error);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {/* Education Level */}
                <div ref={fieldRefs.educationLevel}>
                  <EducationDialog
                    educationLevel={preferences.educationLevel}
                    onChange={(newEducationLevel) =>
                      handleChange("educationLevel", newEducationLevel)
                    }
                    educationOptions={educationOptions}
                  />
                </div>

                {/* High School Preferences - Only show for users under 18 */}
                {isUnder18(user?.dateOfBirth || null) && (
                  <div ref={fieldRefs.highSchoolPreferences}>
                    <HighSchoolDialog
                      highSchoolPreferences={preferences.highSchoolPreferences}
                      onChange={(newHighSchoolPreferences) =>
                        handleChange(
                          "highSchoolPreferences",
                          newHighSchoolPreferences,
                        )
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "lifestyle" && (
          <div className="animate-in fade-in duration-300 absolute inset-0 overflow-y-auto pb-10 max-h-full">
            {/* Lifestyle Section */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="py-1 px-1">
                <div className="h-1"></div>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                {/* Has Children and Wants Children in a compact row - Hide for under 18 users */}
                {!isUnder18(user?.dateOfBirth || null) && (
                  <div className="flex flex-row gap-3 justify-between">
                    {/* Has Children - more compact design */}
                    <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm flex-1">
                      <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-sm mb-2">
                        <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2 shadow-sm">
                          <Baby className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        {t("datingPreferences.fields.hasChildren")}
                      </Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-center items-center">
                          <div className="w-full max-w-[150px] flex">
                            <Badge
                              className={`px-3 py-1 cursor-pointer text-xs dating-preferences-font flex-1 rounded-l-md rounded-r-none ${
                                preferences.hasChildren === true
                                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                              }`}
                              onClick={() => handleChange("hasChildren", true)}
                            >
                              YES
                            </Badge>
                            <Badge
                              className={`px-3 py-1 cursor-pointer text-xs dating-preferences-font flex-1 rounded-r-md rounded-l-none ${
                                preferences.hasChildren === false
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                              }`}
                              onClick={() => handleChange("hasChildren", false)}
                            >
                              NO
                            </Badge>
                          </div>
                        </div>
                        {preferences.hasChildren !== null && (
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChange("hasChildren", null)}
                              className="h-6 text-[10px] border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                            >
                              <X className="h-2.5 w-2.5 mr-1 text-gray-500" />
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2 italic px-1 text-center">
                        {t("datingPreferences.descriptions.hasChildrenHelper")}
                      </div>
                    </div>

                    {/* Wants Children - more compact design */}
                    <div className="p-3 rounded-xl border border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm flex-1">
                      <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-sm mb-2">
                        <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-2 shadow-sm">
                          <HeartHandshake className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        {t("datingPreferences.fields.wantsChildren")}
                      </Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-center items-center">
                          <div className="w-full max-w-[150px] flex">
                            <Badge
                              className={`px-3 py-1 cursor-pointer text-xs dating-preferences-font flex-1 rounded-l-md rounded-r-none ${
                                preferences.wantsChildren === true
                                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                              }`}
                              onClick={() =>
                                handleChange("wantsChildren", true)
                              }
                            >
                              YES
                            </Badge>
                            <Badge
                              className={`px-3 py-1 cursor-pointer text-xs dating-preferences-font flex-1 rounded-r-md rounded-l-none ${
                                preferences.wantsChildren === false
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                              }`}
                              onClick={() =>
                                handleChange("wantsChildren", false)
                              }
                            >
                              NO
                            </Badge>
                          </div>
                        </div>
                        {preferences.wantsChildren !== null && (
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleChange("wantsChildren", null)
                              }
                              className="h-6 text-[10px] border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                            >
                              <X className="h-2.5 w-2.5 mr-1 text-gray-500" />
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2 italic px-1 text-center">
                        {t(
                          "datingPreferences.descriptions.wantsChildrenHelper",
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Interests */}
                <div
                  ref={fieldRefs.interests}
                  className="p-4 rounded-xl border-2 border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-base">
                      <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
                        <BookType className="h-5 w-5 text-pink-500" />
                      </div>
                      {t("datingPreferences.fields.interests")}
                    </Label>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />{" "}
                          {t("datingPreferences.labels.editInterests")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[380px] rounded-3xl bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] overflow-hidden backdrop-blur-xl">
                        {/* Animated background elements - more futuristic with glowing effects */}
                        <div className="absolute inset-0 overflow-hidden opacity-20">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-700 rounded-full animate-pulse blur-3xl mix-blend-overlay"></div>
                          <div className="absolute -bottom-32 -left-16 w-56 h-56 bg-gradient-to-tr from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 rounded-full animate-pulse animation-delay-2000 blur-3xl mix-blend-overlay"></div>
                          <div className="absolute top-1/3 -right-16 w-48 h-48 bg-gradient-to-tr from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700 rounded-full animate-pulse animation-delay-4000 blur-3xl mix-blend-overlay"></div>
                        </div>

                        {/* Using DialogClose component properly */}
                        <DialogClose className="absolute top-4 right-4 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-md border border-white/20 z-50">
                          <X className="h-5 w-5" />
                          <span className="sr-only">Close</span>
                        </DialogClose>

                        {/* Glowing border effect */}
                        <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

                        <div className="relative z-10 backdrop-blur-md">
                          <DialogHeader className="pb-0">
                            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
                            <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                              {t(
                                "datingPreferences.dialogs.selectCandidateInterests",
                              )}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="relative py-3 px-1 flex flex-col items-center">
                            <p className="text-xs text-center text-gray-200 mb-2 px-2">
                              {t(
                                "datingPreferences.descriptions.chooseInterestsCandidatesShould",
                              )}
                            </p>

                            {/* Use the InterestSelector component with scrollable container */}
                            <div className="relative rounded-xl p-2 bg-black/30 backdrop-blur-xl border border-purple-500/20 shadow-inner max-w-[350px]">
                              <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                                <InterestSelector
                                  selectedInterests={preferences.interests}
                                  onSelectInterest={(interest) => {
                                    try {
                                      console.log(
                                        `Adding interest: ${interest}`,
                                      );
                                      const newInterests = [
                                        ...preferences.interests,
                                        interest,
                                      ];
                                      handleChange("interests", newInterests);
                                    } catch (error) {
                                      console.error(
                                        "Error adding interest:",
                                        error,
                                      );
                                      toast({
                                        title: t(
                                          "datingPreferences.errors.errorAddingInterest",
                                        ),
                                        description:
                                          error instanceof Error
                                            ? error.message
                                            : t(
                                                "datingPreferences.errors.unknownError",
                                              ),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  onRemoveInterest={(interest) => {
                                    const newInterests =
                                      preferences.interests.filter(
                                        (i) => i !== interest,
                                      );
                                    handleChange("interests", newInterests);
                                  }}
                                  maxInterests={10}
                                  horizontalCategories={false}
                                  darkMode={true}
                                  compactLayout={true}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Display selected interests as colorful badges */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
                    {preferences.interests.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {preferences.interests.map((interest, index) => {
                            // Dynamic colorful badges with alternating gradients
                            const gradientClasses = [
                              "from-purple-500/90 to-fuchsia-500/90",
                              "from-amber-500/90 to-orange-500/90",
                              "from-teal-500/90 to-cyan-500/90",
                            ];
                            const gradientClass =
                              gradientClasses[index % gradientClasses.length];

                            // Display the interest directly - may come from global interests db
                            const interestLabel = interest;

                            return (
                              <Badge
                                key={`${interest}-${index}`}
                                className={`relative bg-gradient-to-br ${gradientClass} text-white shadow-lg text-xs py-1 px-3 border border-white/30 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                <span className="relative z-10 drop-shadow-sm">
                                  {interestLabel}
                                </span>
                              </Badge>
                            );
                          })}
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChange("interests", [])}
                            className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                          >
                            <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                            Clear All
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center italic">
                        {t(
                          "datingPreferences.descriptions.selectInterestsForMatches",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 italic px-1">
                    {t("datingPreferences.descriptions.interestsHelper")}
                  </div>
                </div>

                {/* Matching Priorities */}
                <div
                  ref={fieldRefs.matchingPriorities}
                  className="p-4 rounded-xl border-2 border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-base">
                      <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
                        <Crown className="h-5 w-5 text-pink-500" />
                      </div>
                      {t("datingPreferences.fields.matchingPriorities")}
                    </Label>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />{" "}
                          {t("datingPreferences.labels.setPriorities")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[380px] rounded-3xl bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] overflow-hidden backdrop-blur-xl">
                        {/* Animated background elements - more futuristic with glowing effects */}
                        <div className="absolute inset-0 overflow-hidden opacity-20">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 rounded-full animate-pulse blur-3xl mix-blend-overlay"></div>
                          <div className="absolute -bottom-32 -left-16 w-56 h-56 bg-gradient-to-tr from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-full animate-pulse animation-delay-2000 blur-3xl mix-blend-overlay"></div>
                          <div className="absolute top-1/3 -right-16 w-48 h-48 bg-gradient-to-tr from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-full animate-pulse animation-delay-4000 blur-3xl mix-blend-overlay"></div>
                        </div>

                        {/* Using DialogClose component properly */}
                        <DialogClose className="absolute top-4 right-4 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-md border border-white/20 z-50">
                          <X className="h-5 w-5" />
                          <span className="sr-only">Close</span>
                        </DialogClose>

                        {/* Glowing border effect */}
                        <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

                        <div className="relative z-10 backdrop-blur-md">
                          <DialogHeader className="pb-0">
                            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
                            <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                              {t("datingPreferences.dialogs.yourTopPriorities")}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="relative py-4 px-2 flex flex-col items-center">
                            <p className="text-xs text-center text-gray-300 mb-3 px-3">
                              {t(
                                "datingPreferences.descriptions.selectTop3Priorities",
                              )}
                            </p>

                            {/* Futuristic container for priorities */}
                            <div className="relative rounded-2xl py-3 px-2 bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner w-full">
                              <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                                {priorityOptions.map((option) => {
                                  // Get fresh state every render to avoid race conditions
                                  const currentPriorities =
                                    preferences.matchingPriorities || [];
                                  const isSelected = currentPriorities.includes(
                                    option.value,
                                  );
                                  const priority = isSelected
                                    ? currentPriorities.indexOf(option.value)
                                    : -1;

                                  // Different gradients based on priority
                                  const gradients = [
                                    "from-pink-500 to-purple-600", // First priority
                                    "from-amber-500 to-orange-500", // Second priority
                                    "from-blue-500 to-indigo-600", // Third priority
                                  ];

                                  return (
                                    <div
                                      key={option.value}
                                      className={`relative rounded-xl cursor-pointer transition-all p-2.5 hover:scale-[1.02] ${
                                        isSelected
                                          ? `border-0 bg-gradient-to-r ${gradients[priority]} shadow-lg`
                                          : "border border-white/5 dark:border-white/5 hover:border-purple-500/30 bg-black/20 backdrop-blur-xl hover:bg-black/30 text-gray-300"
                                      }`}
                                      onClick={() => {
                                        // Use the same fresh state calculation as render
                                        const currentPriorities =
                                          preferences.matchingPriorities || [];
                                        const currentlySelected =
                                          currentPriorities.includes(
                                            option.value,
                                          );

                                        let newPriorities;

                                        if (currentlySelected) {
                                          // Remove the priority
                                          newPriorities =
                                            currentPriorities.filter(
                                              (p) => p !== option.value,
                                            );
                                        } else {
                                          // Add the priority if under 3 limit
                                          if (currentPriorities.length < 3) {
                                            newPriorities = [
                                              ...currentPriorities,
                                              option.value,
                                            ];
                                          } else {
                                            toast({
                                              title: t(
                                                "datingPreferences.descriptions.maximumReached",
                                              ),
                                              description: t(
                                                "datingPreferences.descriptions.canOnlySelect3Priorities",
                                              ),
                                              variant: "default",
                                            });
                                            return;
                                          }
                                        }

                                        // Only update if there's an actual change
                                        const sortedNew = [
                                          ...newPriorities,
                                        ].sort();
                                        const sortedCurrent = [
                                          ...currentPriorities,
                                        ].sort();

                                        if (
                                          JSON.stringify(sortedNew) !==
                                          JSON.stringify(sortedCurrent)
                                        ) {
                                          handleChange(
                                            "matchingPriorities",
                                            newPriorities,
                                          );
                                        }
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {isSelected ? (
                                            <>
                                              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-white/20 text-white font-medium text-xs shadow-md backdrop-blur-sm">
                                                {priority + 1}
                                              </div>
                                              <span className="text-sm font-medium text-white">
                                                {option.label}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <div className="h-7 w-7 rounded-full border border-purple-500/30 flex items-center justify-center bg-black/30 backdrop-blur-md shadow-inner">
                                                <div className="h-1.5 w-1.5 rounded-full bg-purple-400/50"></div>
                                              </div>
                                              <span className="text-sm font-medium text-gray-300">
                                                {option.label}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {isSelected && (
                                          <Crown className="h-4 w-4 text-white ml-1" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Display selected priorities */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
                    {preferences.matchingPriorities.length > 0 ? (
                      <div className="flex flex-col space-y-2.5">
                        {preferences.matchingPriorities.map(
                          (priority, index) => {
                            // Find the corresponding option
                            const option = priorityOptions.find(
                              (o) => o.value === priority,
                            );
                            if (!option) return null;

                            // Different gradients based on priority level
                            const gradients = [
                              "from-pink-500 to-purple-600", // First priority
                              "from-amber-500 to-orange-500", // Second priority
                              "from-blue-500 to-indigo-600", // Third priority
                            ];

                            return (
                              <div
                                key={priority}
                                className="flex items-center rounded-lg p-2.5 bg-gradient-to-r from-purple-50/90 to-pink-50/90 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-900/20"
                              >
                                <div
                                  className={`flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-r ${gradients[index]} text-white font-semibold text-sm mr-3 shadow-sm`}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {option.label}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {index === 0
                                      ? "Most important factor in matching"
                                      : index === 1
                                        ? "Secondary matching priority"
                                        : "Third matching priority"}
                                  </p>
                                </div>
                              </div>
                            );
                          },
                        )}
                        {preferences.matchingPriorities.length > 0 && (
                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleChange("matchingPriorities", [])
                              }
                              className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                            >
                              <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                              Clear All
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <Crown className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm italic">
                          {t("datingPreferences.labels.selectTopPriorities")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mt-2 italic px-1">
                    {t("datingPreferences.descriptions.prioritiesHelper")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "dealbreakers" &&
          !isUnder18(user?.dateOfBirth || null) && (
            <div className="animate-in fade-in duration-300 absolute inset-0 overflow-y-auto pb-10 max-h-full">
              {/* Deal Breakers Section */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="py-1 px-1">
                  <div className="h-1"></div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {dealBreakerOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`relative rounded-lg border cursor-pointer transition-all p-1 ${
                          preferences.dealBreakers.includes(option.value)
                            ? "border-pink-500 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/60 dark:to-purple-900/60 shadow-md"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        } ${getColorClass(option.value)}`}
                        onClick={() => {
                          const newDealBreakers =
                            preferences.dealBreakers.includes(option.value)
                              ? preferences.dealBreakers.filter(
                                  (d) => d !== option.value,
                                )
                              : [...preferences.dealBreakers, option.value];
                          handleChange("dealBreakers", newDealBreakers);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {preferences.dealBreakers.includes(option.value) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium">
                            {option.label}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Custom Deal Breakers */}
                    {globalDealBreakers.map((dealBreaker) => {
                      const customValue = `custom_${dealBreaker.id}`;
                      return (
                        <div
                          key={customValue}
                          className={`relative rounded-lg border cursor-pointer transition-all p-1 ${
                            preferences.dealBreakers.includes(customValue)
                              ? "border-pink-500 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/60 dark:to-purple-900/60 shadow-md"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          } ${getColorClass(customValue)}`}
                          onClick={() => {
                            const newDealBreakers =
                              preferences.dealBreakers.includes(customValue)
                                ? preferences.dealBreakers.filter(
                                    (d) => d !== customValue,
                                  )
                                : [...preferences.dealBreakers, customValue];
                            handleChange("dealBreakers", newDealBreakers);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {preferences.dealBreakers.includes(customValue) ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium">
                              {dealBreaker.dealBreaker}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Other button */}
                    <div
                      className="relative rounded-lg border border-dashed border-pink-300 dark:border-pink-700 cursor-pointer hover:border-pink-500 hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-all p-1"
                      onClick={() => setCustomDealBreakerDialogOpen(true)}
                    >
                      <div className="flex items-center justify-center gap-1 text-pink-500">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Add Other</span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Deal Breaker Dialog */}
                  <Dialog
                    open={customDealBreakerDialogOpen}
                    onOpenChange={setCustomDealBreakerDialogOpen}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
                          Add Custom Deal Breaker
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-pink-100 dark:bg-pink-900/30 p-2">
                            <Filter className="h-4 w-4 text-pink-500" />
                          </div>
                          <div>
                            <Label
                              htmlFor="customDealBreaker"
                              className="text-sm font-medium"
                            >
                              What's a deal breaker for you?
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Add something specific that would make you not
                              want to match with someone
                            </p>
                          </div>
                        </div>

                        <Input
                          id="customDealBreaker"
                          value={customDealBreaker}
                          onChange={(e) =>
                            setCustomDealBreaker(e.target.value.slice(0, 20))
                          }
                          placeholder="e.g., Doesn't like pets (max 20 chars)"
                          className="w-full"
                          maxLength={20}
                        />
                        <div className="text-xs text-right text-gray-500">
                          {customDealBreaker.length}/20 characters
                        </div>

                        {isLoadingGlobalDealBreakers && (
                          <div className="flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
                          </div>
                        )}
                      </div>
                      <DialogFooter className="flex sm:justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCustomDealBreakerDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={addCustomDealBreaker}
                          disabled={
                            !customDealBreaker.trim() ||
                            isAddingGlobalDealBreaker
                          }
                          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700"
                        >
                          {isAddingGlobalDealBreaker ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Deal Breaker
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Relationship Goal Preference Section - Hide for under 18 users */}
              {!isUnder18(user?.dateOfBirth || null) && (
                <Card className="border-none shadow-sm overflow-hidden mt-4">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
                      {t("datingPreferences.fields.relationshipGoals")}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                      {t(
                        "datingPreferences.descriptions.relationshipGoalsHelper",
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div className="relative">
                        <textarea
                          id="relationshipGoal"
                          value={preferences.relationshipGoalPreference || ""}
                          onChange={(e) =>
                            handleChange(
                              "relationshipGoalPreference",
                              e.target.value.slice(0, 100),
                            )
                          }
                          placeholder={t(
                            "datingPreferences.descriptions.relationshipGoalsPlaceholder",
                          )}
                          className="w-full h-24 p-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-sm"
                          maxLength={100}
                        />
                        <div className="absolute bottom-3 right-3">
                          <span className="text-xs text-gray-400">
                            {
                              (preferences.relationshipGoalPreference || "")
                                .length
                            }
                            /100
                          </span>
                        </div>
                      </div>

                      {preferences.relationshipGoalPreference &&
                        preferences.relationshipGoalPreference.length > 0 && (
                          <div className="p-2 rounded-lg border border-pink-100 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/10">
                            <p className="text-xs text-pink-700 dark:text-pink-300">
                              <span className="font-medium">
                                Your relationship goal:
                              </span>{" "}
                              {preferences.relationshipGoalPreference}
                            </p>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI-Powered Matching Info */}
              <Card className="border-none shadow-sm overflow-hidden mt-4">
                <CardContent className="p-4">
                  <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm">
                    <div className="flex items-start">
                      <div className="rounded-full bg-purple-100 dark:bg-purple-900/50 p-1.5 mr-2.5 flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400">
                          {t("datingPreferences.fields.aiPoweredMatching")}
                        </h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 leading-relaxed">
                          {t(
                            "datingPreferences.descriptions.aiMatchingDescription",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {preferences.dealBreakers.length > 0 && (
                    <div className="mt-3 p-2 rounded-lg border border-pink-100 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/10">
                      <div className="flex justify-between items-start">
                        <p className="text-xs text-pink-700 dark:text-pink-300">
                          <span className="font-medium">
                            Your deal breakers:
                          </span>{" "}
                          {preferences.dealBreakers.map((d, i) => {
                            // Debug logging
                            if (d.startsWith("custom_")) {
                              console.log(`Resolving deal breaker: ${d}`);
                              console.log(
                                "globalDealBreakers array:",
                                globalDealBreakers,
                              );
                              console.log(
                                "isLoading:",
                                isLoadingGlobalDealBreakers,
                              );
                              const dealBreakerId = parseInt(
                                d.replace("custom_", ""),
                              );
                              console.log(
                                "Looking for dealBreakerId:",
                                dealBreakerId,
                              );
                              const found = globalDealBreakers.find(
                                (db) => db.id === dealBreakerId,
                              );
                              console.log("Found deal breaker:", found);
                            }

                            // Check if it's a standard deal breaker
                            const option = dealBreakerOptions.find(
                              (o) => o.value === d,
                            );
                            if (option) {
                              return (
                                <span key={d}>
                                  {i > 0 && ", "}
                                  {option.label}
                                </span>
                              );
                            }

                            // Check if it's a custom deal breaker
                            if (d.startsWith("custom_")) {
                              const dealBreakerId = parseInt(
                                d.replace("custom_", ""),
                              );

                              // Try multiple approaches to find the deal breaker
                              let customDealBreaker = globalDealBreakers.find(
                                (db) => db.id === dealBreakerId,
                              );

                              // If not found with strict equality, try with type conversion
                              if (!customDealBreaker) {
                                customDealBreaker = globalDealBreakers.find(
                                  (db) =>
                                    Number(db.id) === Number(dealBreakerId),
                                );
                              }

                              // If still not found, try string comparison
                              if (!customDealBreaker) {
                                customDealBreaker = globalDealBreakers.find(
                                  (db) =>
                                    String(db.id) === String(dealBreakerId),
                                );
                              }

                              if (customDealBreaker) {
                                return (
                                  <span key={d}>
                                    {i > 0 && ", "}
                                    {customDealBreaker.dealBreaker}
                                  </span>
                                );
                              } else if (isLoadingGlobalDealBreakers) {
                                // Show loading state while global deal breakers are being fetched
                                return (
                                  <span key={d}>
                                    {i > 0 && ", "}
                                    <span className="inline-flex items-center">
                                      <div className="w-12 h-3 bg-pink-200 animate-pulse rounded"></div>
                                    </span>
                                  </span>
                                );
                              } else {
                                // Fallback: show the raw value if global deal breakers failed to load
                                console.warn(
                                  `Custom deal breaker ${d} not found in globalDealBreakers:`,
                                  globalDealBreakers,
                                );
                                return (
                                  <span key={d}>
                                    {i > 0 && ", "}
                                    {d}
                                  </span>
                                );
                              }
                            }

                            return null;
                          })}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleChange("dealBreakers", [])}
                          className="h-6 text-[10px] text-pink-600 hover:bg-pink-50 -mt-1 -mr-1"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
      </div>

      {/* Auto-save functionality still works in the background */}
    </div>
  );
}
