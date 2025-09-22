import { useState, useRef, useEffect, useMemo } from "react";
// Minimal dialog import for photo viewer (full dialog set is imported below)
import {
  Dialog as MinimalDialog,
  DialogContent as MinimalDialogContent,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getCountryNationality } from "@/lib/nationality-map";
import { isUnder18 } from "@/lib/age-utils";
import ProfilePhotoButton, {
  ProfilePhotoEditButton,
} from "./profile-photo-button";
import { HighSchoolSearch } from "@/components/ui/high-school-search";
import { UniversitySearch } from "@/components/ui/university-search";
import { useSharedCollegeUniversity } from "@/hooks/use-shared-college-university";
import { useSharedHighSchool } from "@/hooks/use-shared-high-school";

// Height conversion utilities
const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round((feet * 12 + inches) * 2.54);
};

const formatHeight = (cm: number): string => {
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
};
// Avatar component has been removed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Eye,
  X,
  Settings,
  BookType,
  CalendarHeart,
  MapPin,
  UserCheck,
  Gift,
  Heart,
  Camera,
  Edit,
  Sparkles,
  MessageCircle,
  Music,
  Film,
  Book,
  GraduationCap,
  Building2,
  Coffee,
  Loader2,
  Globe,
  ArrowLeft,
  Check,
  HeartPulse,
  UserPlus,
  Briefcase,
  Shield,
  Trash2,
  Scale,
  Ruler,
  Baby,
  Trophy,
  ChevronUp,
} from "lucide-react";
import { allInterests } from "@/lib/ghanaian-interests";
import { useUserInterests } from "@/hooks/use-user-interests";
import { calculateAge } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getEffectiveHideAge } from "@/lib/hide-age-utils";
import { getEffectiveShowPhoto } from "@/lib/show-photo-utils";
import { motion } from "framer-motion";
import { User } from "@shared/schema";
import { ReligionSelect } from "@/components/ui/religion-select";
import { getReligionDisplayName } from "@/lib/religions";
import { CityInput } from "@/components/ui/city-input";
import { InterestsSection } from "@/components/interests/interests-section";
import { TribeSelect } from "@/components/ui/tribe-select";
import { CountrySelect } from "@/components/ui/country-select";
import { RelationshipStatusSelect } from "@/components/ui/relationship-status-select";
import { RelationshipGoalSelect } from "@/components/ui/relationship-goal-select";
import { GHANA_TRIBES } from "@/lib/tribes";
import { UserPicture } from "@/components/ui/user-picture";
import { t, useLanguage } from "@/hooks/use-language";
import { useNationality } from "@/hooks/use-nationality";

interface MeetProfileProps {
  user: User;
}

export default function MeetProfile({ user }: MeetProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { translate, currentLanguage } = useLanguage();
  // Using t() function for translations with fallback
  const { country: meetPoolCountry } = useNationality();
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showOptionalSection, setShowOptionalSection] = useState(true);

  // Fields state
  const [residenceValue, setResidenceValue] = useState(user.location || "");
  const [countryOfOriginValue, setCountryOfOriginValue] = useState(
    user.countryOfOrigin || "",
  );
  const [secondaryCountryOfOriginValue, setSecondaryCountryOfOriginValue] =
    useState((user as any).secondaryCountryOfOrigin || "");
  const [professionValue, setProfessionValue] = useState(user.profession || "");
  const [religionValue, setReligionValue] = useState(user.religion || "");
  const [bioValue, setBioValue] = useState(user.bio || "");
  const [relationshipStatusValue, setRelationshipStatusValue] = useState(
    user.relationshipStatus || "",
  );
  const [relationshipGoalValue, setRelationshipGoalValue] = useState(
    user.relationshipGoal || "",
  );
  const {
    value: sharedHighSchool,
    setValue: setSharedHighSchool,
    initialize: initSharedHighSchool,
  } = useSharedHighSchool();
  const [highSchoolValue, setHighSchoolValue] = useState(user.highSchool || "");
  const {
    value: sharedCollege,
    setValue: setSharedCollege,
    initialize: initSharedCollege,
  } = useSharedCollegeUniversity();
  const [collegeUniversityValue, setCollegeUniversityValue] = useState(
    user.collegeUniversity || "",
  );

  // New state variables for matching algorithm fields
  const [bodyTypeValue, setBodyTypeValue] = useState<string>(
    user.bodyType || "",
  );
  const [heightValue, setHeightValue] = useState<number[]>(() => {
    // Convert from cm to slider format (4'0" to 7'0" range)
    const minHeightCm = 122; // 4'0"
    const maxHeightCm = 213; // 7'0"
    // Only set height if user has specified one, otherwise default to middle value for UI
    const userHeightCm = user.height ? user.height : 170; // Default to 5'7" only for UI display
    return [Math.min(Math.max(userHeightCm, minHeightCm), maxHeightCm)];
  });
  // Rehydrate OPTIONAL fields from local cache on mount only
  // Important: Only set values that are not already present to avoid visual flips
  useEffect(() => {
    try {
      const raw = localStorage.getItem("meet_optional_profile_cache");
      if (!raw) return;
      const cache = JSON.parse(raw || "{}");
      if (!bodyTypeValue && cache.bodyType) setBodyTypeValue(cache.bodyType);
      if ((!heightValue || !heightValue[0]) && typeof cache.height === "number")
        setHeightValue([cache.height]);
      if (!educationLevelValue && cache.educationLevel)
        setEducationLevelValue(cache.educationLevel);
      if (!hasChildrenValue && cache.hasChildren !== undefined)
        setHasChildrenValue(cache.hasChildren);
      if (!wantsChildrenValue && cache.wantsChildren !== undefined)
        setWantsChildrenValue(cache.wantsChildren);
      if (!smokingValue && cache.smoking) setSmokingValue(cache.smoking);
      if (!drinkingValue && cache.drinking) setDrinkingValue(cache.drinking);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [hasChildrenValue, setHasChildrenValue] = useState<
    string | boolean | null
  >(() => {
    const cache = localStorage.getItem("meet_optional_profile_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.hasChildren !== undefined) return parsed.hasChildren;
    }
    return (user as any).hasChildren ?? null;
  });
  const [wantsChildrenValue, setWantsChildrenValue] = useState<
    string | boolean | null
  >(() => {
    const cache = localStorage.getItem("meet_optional_profile_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.wantsChildren !== undefined) return parsed.wantsChildren;
    }
    return (user as any).wantsChildren ?? null;
  });
  const [smokingValue, setSmokingValue] = useState(() => {
    const cache = localStorage.getItem("meet_optional_profile_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.smoking) return parsed.smoking;
    }
    const value = (user as any).smoking || "";
    // Map legacy values to simplified options
    if (value === "occasionally") return "yes";
    return value;
  });
  const [drinkingValue, setDrinkingValue] = useState(() => {
    const cache = localStorage.getItem("meet_optional_profile_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.drinking) return parsed.drinking;
    }
    const value = (user as any).drinking || "";
    // Map legacy values to simplified options
    if (value === "socially" || value === "occasionally") return "yes";
    return value;
  });
  const [educationLevelValue, setEducationLevelValue] = useState<string>(() => {
    const cache = localStorage.getItem("meet_optional_profile_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      if (parsed.educationLevel) return parsed.educationLevel;
    }
    return (user as any).educationLevel || "";
  });

  // Derived completion flags for optional personal detail fields
  const isHasChildrenSet =
    hasChildrenValue !== undefined &&
    hasChildrenValue !== null &&
    hasChildrenValue !== "";
  const isWantsChildrenSet =
    wantsChildrenValue !== undefined &&
    wantsChildrenValue !== null &&
    wantsChildrenValue !== "";
  const isSmokingSet =
    typeof smokingValue === "string"
      ? smokingValue.trim() !== ""
      : smokingValue !== undefined && smokingValue !== null;
  const isDrinkingSet =
    typeof drinkingValue === "string"
      ? drinkingValue.trim() !== ""
      : drinkingValue !== undefined && drinkingValue !== null;

  // Avatar toggle has been removed, but we still need photo toggle
  // Show Photo toggle automatically switches OFF when user lacks Active MEET Profile
  const hasActiveMeetProfile = user.hasActivatedProfile || false;
  const [showProfilePhotoValue, setShowProfilePhotoValue] = useState(
    getEffectiveShowPhoto(user, hasActiveMeetProfile),
  );
  const [showAvatarValue, setShowAvatarValue] = useState<boolean>(
    (user as any).showAvatar === true,
  );
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  // Tribe state - create an array with both primary and secondary tribes if they exist
  const [tribeValues, setTribeValues] = useState<string[]>(() => {
    const tribes = [];
    if (user.ethnicity) tribes.push(user.ethnicity);
    if (user.secondaryTribe) tribes.push(user.secondaryTribe);
    return tribes;
  });

  // Interests state - convert from array or initialize empty with defensive parsing
  const [userInterests, setUserInterests] = useState<string[]>(() => {
    try {
      if (!user.interests) return [];
      if (Array.isArray(user.interests)) return user.interests;
      if (typeof user.interests === "string") {
        return JSON.parse(user.interests || "[]");
      }
      return [];
    } catch (e) {
      console.error("Failed to parse user interests:", e);
      return [];
    }
  });

  // Use the authenticated user object as the single source of truth to avoid
  // layout thrash and re-animations caused by duplicate refetches
  const displayUser = user;

  // Track if user has explicitly changed visibility preferences to prevent overwrites
  const [hasUserModifiedVisibility, setHasUserModifiedVisibility] =
    useState(false);

  // CRITICAL FIX: Synchronize all local toggle states with fresh backend data
  // BUT preserve user's explicit visibility preference changes
  useEffect(() => {
    if (!displayUser) return;

    // Update showProfilePhoto toggle state
    const newShowPhotoValue = getEffectiveShowPhoto(
      displayUser,
      displayUser.hasActivatedProfile || false,
    );
    setShowProfilePhotoValue(newShowPhotoValue);

    // ONLY update fieldVisibility if user hasn't explicitly modified them during this session
    // This prevents form field changes from overriding user toggle choices
    if (displayUser.visibilityPreferences && !hasUserModifiedVisibility) {
      try {
        const freshVisibilityPreferences = JSON.parse(
          displayUser.visibilityPreferences,
        ) as FieldVisibility;
        setFieldVisibility(freshVisibilityPreferences);
        console.log(
          "Updated fieldVisibility from fresh data (user hasn't modified):",
          freshVisibilityPreferences,
        );
      } catch (error) {
        console.error("Error parsing fresh visibility preferences:", error);
      }
    } else if (hasUserModifiedVisibility) {
      console.log(
        "Skipping visibility sync - user has made explicit changes during this session",
      );
    }

    // Update all field values from fresh data (this is safe and needed)
    setResidenceValue(displayUser.location || "");
    setCountryOfOriginValue(displayUser.countryOfOrigin || "");
    setProfessionValue(displayUser.profession || "");
    setReligionValue(displayUser.religion || "");
    setBioValue(displayUser.bio || "");
    setRelationshipStatusValue(displayUser.relationshipStatus || "");
    setRelationshipGoalValue(displayUser.relationshipGoal || "");
    setHighSchoolValue(displayUser.highSchool || "");
    initSharedHighSchool(displayUser.highSchool || "");
    setCollegeUniversityValue(displayUser.collegeUniversity || "");
    initSharedCollege(displayUser.collegeUniversity || "");

    // Update new matching algorithm fields ONLY if the values aren't currently set locally.
    // This prevents flicker when unrelated fields are saved and user data refetches.
    if (!bodyTypeValue) setBodyTypeValue(displayUser.bodyType || "");
    if (hasChildrenValue === null || hasChildrenValue === "")
      setHasChildrenValue((displayUser as any).hasChildren ?? null);
    if (wantsChildrenValue === null || wantsChildrenValue === "")
      setWantsChildrenValue((displayUser as any).wantsChildren ?? null);
    if (!smokingValue) setSmokingValue((displayUser as any).smoking || "");
    if (!drinkingValue) setDrinkingValue((displayUser as any).drinking || "");

    // Update tribe values
    const freshTribes = [];
    if (displayUser.ethnicity) freshTribes.push(displayUser.ethnicity);
    if (displayUser.secondaryTribe)
      freshTribes.push(displayUser.secondaryTribe);
    setTribeValues(freshTribes);

    // Update interests from fresh data
    try {
      if (!displayUser.interests) {
        setUserInterests([]);
      } else if (Array.isArray(displayUser.interests)) {
        setUserInterests(displayUser.interests);
      } else if (typeof displayUser.interests === "string") {
        setUserInterests(JSON.parse(displayUser.interests || "[]"));
      }
    } catch (e) {
      console.error("Failed to parse fresh interests:", e);
      setUserInterests([]);
    }

    console.log("Synchronized field values with fresh backend data");
  }, [displayUser, hasUserModifiedVisibility]);

  // Fetch visible user interests (for SwipeCard preview)
  const {
    visibleInterestStrings = [],
    allInterestStrings = [],
    isLoading: interestsLoading,
  } = useUserInterests(user?.id);

  // Profile update mutation
  const profileUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: updateData,
      });
    },
    // Avoid invalidating the global user query on every small edit; we already
    // perform optimistic updates below for a smooth UX
    onSuccess: () => {},
  });

  // Handle profile updates
  const handleProfileUpdate = async (updateData: any) => {
    try {
      console.log("[PROFILE-UPDATE] Sending update data:", updateData);
      await profileUpdateMutation.mutateAsync(updateData);
      console.log("[PROFILE-UPDATE] Update successful");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Define a type for field visibility
  type FieldVisibility = {
    residence: boolean;
    countryOfOrigin: boolean;
    tribe: boolean;
    profession: boolean;
    religion: boolean;
    bio: boolean;
    relationshipStatus: boolean;
    relationshipGoal: boolean;
    highSchool: boolean;
    collegeUniversity: boolean;
    interests: boolean;
    photos: boolean; // Add photos field to visibility preferences
    [key: string]: boolean; // Allow indexing with string keys
  };

  // State for field visibility - load from saved preferences or default to basic visibility
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibility>(
    () => {
      // Try to parse saved visibility preferences if available
      try {
        if (user.visibilityPreferences) {
          const savedPreferences = JSON.parse(
            user.visibilityPreferences,
          ) as FieldVisibility;
          console.log("Loaded visibility preferences:", savedPreferences);
          return savedPreferences;
        }
      } catch (error) {
        console.error("Error parsing visibility preferences:", error);
      }

      // If no saved preferences or error parsing, fall back to defaults
      // All toggles default to ON for new users except MY PHOTOS toggle
      return {
        residence: true,
        countryOfOrigin: true,
        tribe: true,
        profession: true,
        religion: true,
        bio: true,
        relationshipStatus: true,
        relationshipGoal: true,
        highSchool: true,
        collegeUniversity: true,
        interests: true,
        photos: Boolean(user?.showProfilePhoto ?? false), // Initialize from showProfilePhoto field
      };
    },
  );

  // Keep field visibility in sync with the user object on mount/prop changes,
  // unless the user has explicitly modified it in this session
  useEffect(() => {
    if (!user) return;
    if (!hasUserModifiedVisibility && user.visibilityPreferences) {
      try {
        const saved = JSON.parse(user.visibilityPreferences) as FieldVisibility;
        setFieldVisibility(saved);
      } catch (e) {
        console.error("Error parsing visibility preferences from user:", e);
      }
    }
  }, [user?.visibilityPreferences, hasUserModifiedVisibility]);

  // Guard: when saving High School or College, do not let a user cache refresh
  // inadvertently reset the local education level selection. We rely on the
  // controlled state unless the user is explicitly saving education level itself.
  useEffect(() => {
    // When a global user change happens, avoid forcing educationLevelValue here.
    // It will remain whatever the user last selected until they save it.
  }, [user?.educationLevel]);

  // Sync education field states with user object when it updates
  useEffect(() => {
    setHighSchoolValue(user.highSchool || "");
    if (user.highSchool) initSharedHighSchool(user.highSchool);
  }, [user.highSchool]);

  // Keep shared and local values in sync
  useEffect(() => {
    if (sharedHighSchool !== highSchoolValue) {
      setHighSchoolValue(sharedHighSchool || "");
    }
  }, [sharedHighSchool]);

  // Avoid writing to global user cache while typing in the High School field,
  // as it causes the user object to update and resync other fields like
  // education level back to defaults. We only update the cache on explicit save.
  useEffect(() => {
    if (editField === "highSchool") return; // typing phase — skip
    if (typeof sharedHighSchool === "string" && sharedHighSchool.length > 0) {
      try {
        queryClient.setQueryData(["/api/user"], (prev: any) => {
          if (!prev || typeof prev !== "object") return prev;
          if (prev.highSchool === sharedHighSchool) return prev;
          return { ...prev, highSchool: sharedHighSchool };
        });
      } catch {}
    }
  }, [sharedHighSchool, editField]);

  useEffect(() => {
    setCollegeUniversityValue(user.collegeUniversity || "");
    if (user.collegeUniversity) initSharedCollege(user.collegeUniversity);
  }, [user.collegeUniversity]);

  // Keep shared and local values in sync (college) without forcing global cache writes during typing
  useEffect(() => {
    if (sharedCollege !== collegeUniversityValue) {
      setCollegeUniversityValue(sharedCollege || "");
    }
  }, [sharedCollege]);

  // Fetch user photos
  const { data: userPhotos, isLoading: loadingPhotos } = useQuery<
    Array<{ id: number; photoUrl: string; isPrimary: boolean }>
  >({
    queryKey: [`/api/photos/${user?.id}`],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (v5 uses gcTime instead of cacheTime)
  });

  // Normalize primary flags defensively to prevent duplicate primary indicators in UI
  const normalizedUserPhotos = useMemo(() => {
    if (!userPhotos || userPhotos.length === 0) return userPhotos;
    let primarySeen = false;
    return userPhotos.map((p) => {
      if (p.isPrimary) {
        if (primarySeen) {
          return { ...p, isPrimary: false };
        }
        primarySeen = true;
      }
      return p;
    });
  }, [userPhotos]);

  // If duplicates detected, write back a normalized cache so other components stay consistent
  useEffect(() => {
    if (!user || !userPhotos || userPhotos.length === 0) return;
    const count = userPhotos.filter((p) => p.isPrimary === true).length;
    if (count > 1 && normalizedUserPhotos) {
      queryClient.setQueryData(
        [`/api/photos/${user.id}`],
        normalizedUserPhotos,
      );
    }
  }, [user, userPhotos, normalizedUserPhotos]);

  // File upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  // Avatar feature has been removed

  // Enhanced file selection handler with comprehensive validation and performance optimization
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type more thoroughly
    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: translate("profile.invalidFileType"),
        description: translate("profile.selectValidImage"),
        variant: "destructive",
      });
      // Reset file input
      if (event.target) event.target.value = "";
      return;
    }

    // File size validation removed - now accepting files of any size

    // Validate image dimensions and quality by loading it (prevents corrupted images)
    const validateImageAndUpload = (fileUrl: string) => {
      // Process image validation without disruptive toast notifications
      const dismissValidationToast = () => {}; // No-op function for compatibility

      const img = new Image();

      // Original onload handler (will be properly set after timeout setup)
      const handleImageLoad = () => {
        // Dismiss the validation toast
        dismissValidationToast();

        // Valid image, proceed with upload checks

        // Check if image is too small
        if (img.width < 200 || img.height < 200) {
          toast({
            title: translate("profile.imageTooSmall"),
            description: translate("profile.imageMinSize"),
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Check aspect ratio - continue without disruptive warning toast
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          // Continue anyway as this is just a warning - no disruptive toast notification
        }

        // Check if we already have maximum photos (8)
        if (userPhotos && userPhotos.length >= 8) {
          toast({
            title: translate("profile.maxPhotosReached"),
            description: translate("profile.maxPhotosDescription"),
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Image is valid, proceed with upload immediately without blocking operations
        // Call mutation immediately for instant response
        addPhotoMutation.mutate(fileUrl);
      };

      // Original error handler (will be properly set after timeout setup)
      const handleImageError = () => {
        // Dismiss the validation toast
        dismissValidationToast();

        toast({
          title: translate("profile.invalidImage"),
          description: translate("profile.corruptedImage"),
          variant: "destructive",
        });
        // Reset file input
        if (event.target) event.target.value = "";
      };

      // Set a timeout for loading failure
      const imageLoadTimeout = setTimeout(() => {
        dismissValidationToast();

        toast({
          title: translate("profile.imageLoadTimeout"),
          description: translate("profile.imageTookTooLong"),
          variant: "destructive",
        });

        // Reset file input
        if (event.target) event.target.value = "";

        // Cancel the image load
        img.src = "";
      }, 20000); // 20 second timeout

      // Set up the event handlers correctly
      img.onload = () => {
        clearTimeout(imageLoadTimeout);
        handleImageLoad();
      };

      img.onerror = () => {
        clearTimeout(imageLoadTimeout);
        handleImageError();
      };

      // Start loading the image
      img.src = fileUrl;
    };

    // Track loading state for better UI feedback
    const { dismiss: dismissLoadingToast } = toast({
      title: translate("profile.processingPhoto"),
      description: translate("profile.photoBeingPrepared"),
      duration: 60000, // Long duration since we'll manually dismiss on success/error
    });

    // Read the file as data URL with enhanced error handling
    const reader = new FileReader();

    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;

      // Dismiss the loading toast since processing is done
      dismissLoadingToast();

      if (photoUrl) {
        // Check image data URL for validity
        if (!photoUrl.startsWith("data:image/")) {
          toast({
            title: "Invalid image format",
            description:
              "The file appears to be corrupted or is not a valid image.",
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Proceed with validation and upload
        validateImageAndUpload(photoUrl);
      } else {
        toast({
          title: "Empty image data",
          description:
            "The file couldn't be read correctly. Please try another image.",
          variant: "destructive",
        });
        // Reset file input
        if (event.target) event.target.value = "";
      }
    };

    reader.onerror = () => {
      // Dismiss the loading toast since processing failed
      dismissLoadingToast();

      toast({
        title: "Upload failed",
        description:
          "Failed to process image. The file may be corrupted. Please try another image.",
        variant: "destructive",
      });

      // Reset file input
      if (event.target) event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  // Add photo mutation (with performance optimization)
  const addPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      // Implement optimistic UI update to show progress immediately
      // Use the latest cache to decide if this should be primary
      const cachedPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]) as any[] | undefined;
      const shouldBePrimary = !cachedPhotos || cachedPhotos.length === 0;

      const optimisticPhoto = {
        id: Date.now(), // Temporary ID
        userId: user.id,
        photoUrl: photoUrl,
        isPrimary: shouldBePrimary,
        createdAt: new Date().toISOString(),
      };

      // Update UI immediately with optimistic data
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        const base: any[] = Array.isArray(old) ? old : [];
        const normalized = shouldBePrimary
          ? base.map((p) => ({ ...p, isPrimary: false }))
          : base;
        return [...normalized, optimisticPhoto];
      });

      try {
        // Actual API request (can happen in background)
        const res = await apiRequest("/api/photos", {
          method: "POST",
          data: {
            photoUrl,
            isPrimary: shouldBePrimary, // Make first photo primary based on latest cache
          },
        });

        // Check if response is valid JSON before parsing
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          // Return response without blocking toast notification
          return await res.json();
        } else {
          // Handle non-JSON response
          const text = await res.text();
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error("Server error. Please try again later.");
          }

          // Return success without blocking toast notification
          return { success: true };
        }
      } catch (error) {
        // Remove optimistic update on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
          return (old || []).filter(
            (photo: any) => photo.id !== optimisticPhoto.id,
          );
        });

        // Show error toast
        toast({
          title: translate("toast.errorAddingPhoto"),
          description:
            error instanceof Error
              ? error.message
              : translate("toast.unknownError"),
          variant: "destructive",
        });

        throw error;
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    onSuccess: () => {
      // Invalidate query immediately for instant sync without artificial delays
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
    },
  });

  // Delete photo mutation (with true optimistic update)
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      // Store the original photo list for potential recovery
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);

      // Apply optimistic update immediately - remove the photo from UI
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        return (old || []).filter((photo: any) => photo.id !== photoId);
      });

      // Check if this is a temporary ID (from Date.now() optimistic updates)
      // PostgreSQL integers max out at 2,147,483,647, so anything larger is temporary
      const isTemporaryId = photoId > 2147483647;

      if (isTemporaryId) {
        // For temporary IDs, just remove from local state - no backend call needed
        console.log(
          `[PHOTO-DELETE] Removing temporary photo ID ${photoId} from local state only`,
        );
        return photoId;
      }

      try {
        // Make the API request for real database IDs
        const res = await apiRequest(`/api/photos/${photoId}`, {
          method: "DELETE",
        });

        // Check for valid response
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          // Return response without blocking toast notification
          return await res.json();
        } else {
          // Handle non-JSON response
          const text = await res.text();
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error("Server error. Please try again later.");
          }

          // Return success without blocking toast notification
          return photoId;
        }
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);

        // Show error toast
        toast({
          title: translate("toast.errorDeletingPhoto"),
          description:
            error instanceof Error
              ? error.message
              : translate("toast.unknownError"),
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: (deletedPhotoId) => {
      // Check if the deleted photo was primary
      const wasPrimary = userPhotos?.find(
        (photo) => photo.id === deletedPhotoId,
      )?.isPrimary;

      // If deleted photo was primary, need to update user data as well
      if (wasPrimary) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }

      // Final sync with server data immediately without artificial delays
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
    },
    onError: () => {
      // Error is already handled in the mutation function
    },
  });

  // Set primary photo mutation (with true optimistic updates)
  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      // Save original data for potential recovery
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);
      const originalUser = queryClient.getQueryData(["/api/user"]);

      // Create optimistic updated photo array using current cache
      const currentPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]) as any[] | undefined;
      if (currentPhotos) {
        // Get the URL of the new primary photo
        const newPrimaryPhotoUrl = currentPhotos.find(
          (photo) => photo.id === photoId,
        )?.photoUrl;

        // Update photo array optimistically - ensure only one primary
        const updatedPhotos = currentPhotos.map((photo) => ({
          ...photo,
          isPrimary: photo.id === photoId,
        }));

        // Apply immediate UI updates
        queryClient.setQueryData([`/api/photos/${user?.id}`], updatedPhotos);

        // Also update user data with new primary photo
        if (newPrimaryPhotoUrl && originalUser) {
          queryClient.setQueryData(["/api/user"], {
            ...originalUser,
            photoUrl: newPrimaryPhotoUrl,
          });
        }
      }

      // Primary photo update processing - no disruptive toast needed

      try {
        // Make the actual API request
        const res = await apiRequest(`/api/photos/${photoId}/primary`, {
          method: "PATCH",
        });

        // Check if response is valid JSON before parsing
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          // Primary photo updated successfully - no disruptive toast notification needed

          return await res.json();
        } else {
          // Handle non-JSON response
          const text = await res.text();
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error("Server error. Please try again later.");
          }

          // Primary photo updated successfully - no disruptive toast notification needed

          return { success: true };
        }
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);
        queryClient.setQueryData(["/api/user"], originalUser);

        // Show error toast
        toast({
          title: translate("toast.errorUpdatingPrimaryPhoto"),
          description:
            error instanceof Error
              ? error.message
              : translate("toast.unknownError"),
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Final sync with server data immediately - no artificial delays needed
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: () => {
      // Error is already handled in the mutation function
    },
  });

  const handleEditProfile = () => {
    setLocation("/settings");
  };

  const handleSettings = () => {
    setLocation("/settings");
  };

  // Helper function to generate random integer in a range (used for compatibility score)
  const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string | Date | null | undefined) => {
    if (!dateOfBirth) return 0;
    const birthDate =
      dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Toggle edit mode for a field

  // Avatar-related functionality has been removed

  const toggleEditMode = (fieldName: string) => {
    setEditField(editField === fieldName ? null : fieldName);
  };

  // Toggle visibility for a field
  const toggleVisibility = (fieldName: string) => {
    // Mark that user has explicitly modified visibility preferences
    setHasUserModifiedVisibility(true);

    setFieldVisibility((prev: FieldVisibility) => {
      const updated = { ...prev, [fieldName]: !prev[fieldName] };

      // Save the updated visibility preferences to the database
      console.log(
        `User explicitly toggling visibility for ${fieldName} to ${!prev[fieldName]}`,
      );
      console.log("Updated visibility preferences:", updated);

      // Update in database using the profile mutation
      updateProfileMutation.mutate({
        visibilityPreferences: JSON.stringify(updated),
      });

      return updated;
    });
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<any>) => {
      try {
        // Only update the specific field, not the entire profile
        const res = await apiRequest(`/api/profile/${user.id}`, {
          method: "PATCH",
          data,
        });

        // Check if response is valid JSON before parsing
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await res.json();
        } else {
          // Handle non-JSON response
          const text = await res.text();
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error("Server error. Please try again later.");
          }
          return { message: "Profile updated successfully" };
        }
      } catch (error) {
        console.error("Profile update error:", error);
        throw error;
      }
    },
    // Keep the optimistic cache; skip forcing a global user refetch to prevent
    // page-level flicker. A background sync can be triggered elsewhere if needed.
    onSuccess: () => {},
    onError: (error: any) => {
      console.error("Profile update error:", error);
      toast({
        title: translate("toast.errorUpdatingProfile"),
        description: error?.message || "Unknown error updating profile",
        variant: "destructive",
      });
    },
  });

  // Toggle an interest in the selection list
  const toggleInterest = (interest: string) => {
    if (userInterests.includes(interest)) {
      // Remove interest
      setUserInterests(userInterests.filter((i) => i !== interest));
    } else {
      // Add interest
      setUserInterests([...userInterests, interest]);
    }
  };

  // Save edited field
  const saveField = (fieldName: string, forceClear = false) => {
    let value: string | null = "";
    let updateData: Partial<any> = {};

    // Check if we're explicitly clearing a field (trim returns empty string)
    // We need to detect this condition to set the correct flag
    let isClearing = forceClear; // Force clearing if requested

    switch (fieldName) {
      case "residence":
        if (forceClear) {
          setResidenceValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear || !residenceValue || residenceValue.trim() === "";
        value = isClearing ? null : residenceValue.trim();
        updateData = { location: value };
        break;
      case "countryOfOrigin":
        if (forceClear) {
          setCountryOfOriginValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear ||
          !countryOfOriginValue ||
          countryOfOriginValue.trim() === "";
        value = isClearing ? null : countryOfOriginValue.trim();
        updateData = { countryOfOrigin: value };
        break;
      case "secondaryCountryOfOrigin":
        if (forceClear) {
          setSecondaryCountryOfOriginValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear ||
          !secondaryCountryOfOriginValue ||
          secondaryCountryOfOriginValue.trim() === "";
        value = isClearing ? null : secondaryCountryOfOriginValue.trim();
        updateData = { secondaryCountryOfOrigin: value };
        break;
      case "profession":
        if (forceClear) {
          setProfessionValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear || !professionValue || professionValue.trim() === "";
        value = isClearing ? null : professionValue.trim();
        updateData = { profession: value };
        break;
      case "religion":
        if (forceClear) {
          setReligionValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear || !religionValue || religionValue.trim() === "";
        value = isClearing ? null : religionValue.trim();
        updateData = { religion: value };
        break;
      case "bio":
        if (forceClear) {
          setBioValue(""); // Immediately clear the input field
        }
        isClearing = forceClear || !bioValue || bioValue.trim() === "";
        value = isClearing ? null : bioValue.trim();
        updateData = { bio: value };
        break;
      case "relationshipStatus":
        if (forceClear) {
          setRelationshipStatusValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear ||
          !relationshipStatusValue ||
          relationshipStatusValue.trim() === "";
        value = isClearing ? null : relationshipStatusValue.trim();
        updateData = { relationshipStatus: value };
        break;
      case "relationshipGoal":
        if (forceClear) {
          setRelationshipGoalValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear ||
          !relationshipGoalValue ||
          relationshipGoalValue.trim() === "";
        value = isClearing ? null : relationshipGoalValue.trim();
        updateData = { relationshipGoal: value };
        break;
      case "highSchool":
        if (forceClear) {
          setHighSchoolValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear || !highSchoolValue || highSchoolValue.trim() === "";
        value = isClearing ? null : highSchoolValue.trim();
        updateData = { highSchool: value };
        break;
      case "collegeUniversity":
        if (forceClear) {
          setCollegeUniversityValue(""); // Immediately clear the input field
        }
        isClearing =
          forceClear ||
          !collegeUniversityValue ||
          collegeUniversityValue.trim() === "";
        value = isClearing ? null : collegeUniversityValue.trim();
        updateData = { collegeUniversity: value };
        break;
      case "educationLevel":
        if (forceClear) {
          setEducationLevelValue("");
        }
        isClearing =
          forceClear ||
          !educationLevelValue ||
          educationLevelValue.trim() === "";
        value = isClearing ? null : educationLevelValue.trim();
        updateData = { educationLevel: value };
        break;
      case "bodyType":
        if (forceClear) {
          setBodyTypeValue("");
        }
        isClearing =
          forceClear || !bodyTypeValue || bodyTypeValue.trim() === "";
        value = isClearing ? null : bodyTypeValue.trim();
        updateData = { bodyType: value };
        break;
      case "height":
        if (forceClear) {
          // Don't reset to default when clearing - keep UI at middle value but save NULL
          // setHeightValue([170]); // Don't auto-reset to prevent confusion
        }
        isClearing = forceClear;
        // Height value is already in cm from slider
        // If forceClear is true, save NULL; otherwise save the current heightValue
        const heightInt = isClearing ? null : heightValue[0];
        console.log(
          "[HEIGHT-DEBUG] Saving height:",
          heightValue,
          "-> cm:",
          heightInt,
          "isClearing:",
          isClearing,
          "userHadHeight:",
          !!user.height,
        );
        updateData = { height: heightInt };
        break;
      case "hasChildren": {
        if (forceClear) setHasChildrenValue(null);
        const normalized =
          typeof hasChildrenValue === "string"
            ? hasChildrenValue.trim()
            : hasChildrenValue;
        isClearing = forceClear || normalized === null || normalized === "";
        updateData = { hasChildren: isClearing ? null : normalized };
        break;
      }
      case "wantsChildren": {
        if (forceClear) setWantsChildrenValue(null);
        const normalized =
          typeof wantsChildrenValue === "string"
            ? wantsChildrenValue.trim()
            : wantsChildrenValue;
        isClearing = forceClear || normalized === null || normalized === "";
        updateData = { wantsChildren: isClearing ? null : normalized };
        break;
      }
      case "smoking":
        if (forceClear) {
          setSmokingValue("");
        }
        isClearing = forceClear || !smokingValue || smokingValue.trim() === "";
        value = isClearing ? null : smokingValue.trim();
        updateData = { smoking: value };
        break;
      case "drinking":
        if (forceClear) {
          setDrinkingValue("");
        }
        isClearing =
          forceClear || !drinkingValue || drinkingValue.trim() === "";
        value = isClearing ? null : drinkingValue.trim();
        updateData = { drinking: value };
        break;

      case "interests":
        // Store interests as a JSON string in the database
        if (forceClear) {
          setUserInterests([]); // Immediately clear the interests
        }
        isClearing = forceClear || userInterests.length === 0;
        updateData = {
          interests:
            userInterests.length > 0 ? JSON.stringify(userInterests) : null,
        };
        break;
      case "tribe":
        // Update the primary and secondary tribes
        if (forceClear) {
          setTribeValues([]); // Immediately clear the tribes
          // For force clear, immediately set the values to null
          updateData = {
            ethnicity: null,
            secondaryTribe: null,
          };
          isClearing = true;
        } else {
          // Normal save operation
          isClearing = !tribeValues[0] || tribeValues[0].trim() === "";
          updateData = {
            ethnicity: tribeValues[0]?.trim() || null,
            secondaryTribe: tribeValues[1]?.trim() || null,
          };
        }

        // Apply immediate UI update for tribes to improve responsiveness
        if (!isClearing) {
          toast({
            title: "Updating tribe",
            description: "Saving your tribe information...",
            duration: 2000,
          });
        } else if (forceClear) {
          toast({
            title: "Clearing tribe",
            description: "Removing tribe information...",
            duration: 1500,
          });
        }
        break;
    }

    // Add the clearing flag if we're explicitly setting empty fields to null
    if (isClearing) {
      console.log(`Clearing field ${fieldName} with null value`);
      updateData.clearingFields = true;
    }

    // Create optimistic update to apply instantly with type safety
    const optimisticUser = { ...user };

    // Type-safe approach to update fields
    if ("location" in updateData) optimisticUser.location = updateData.location;
    if ("countryOfOrigin" in updateData)
      optimisticUser.countryOfOrigin = updateData.countryOfOrigin;
    if ("profession" in updateData)
      optimisticUser.profession = updateData.profession;
    if ("religion" in updateData) optimisticUser.religion = updateData.religion;
    if ("bio" in updateData) optimisticUser.bio = updateData.bio;
    if ("ethnicity" in updateData)
      optimisticUser.ethnicity = updateData.ethnicity;
    if ("secondaryTribe" in updateData)
      optimisticUser.secondaryTribe = updateData.secondaryTribe;
    if ("relationshipStatus" in updateData)
      optimisticUser.relationshipStatus = updateData.relationshipStatus;
    if ("relationshipGoal" in updateData)
      optimisticUser.relationshipGoal = updateData.relationshipGoal;
    if ("highSchool" in updateData)
      optimisticUser.highSchool = updateData.highSchool;
    if ("collegeUniversity" in updateData)
      optimisticUser.collegeUniversity = updateData.collegeUniversity;
    if ("interests" in updateData)
      optimisticUser.interests = updateData.interests;

    // OPTIONAL section fields – ensure optimistic cache sync so values don't reset
    if ("educationLevel" in updateData)
      (optimisticUser as any).educationLevel = (
        updateData as any
      ).educationLevel;
    if ("bodyType" in updateData)
      (optimisticUser as any).bodyType = (updateData as any).bodyType;
    if ("height" in updateData)
      (optimisticUser as any).height = (updateData as any).height as any;
    if ("hasChildren" in updateData)
      (optimisticUser as any).hasChildren = (updateData as any).hasChildren;
    if ("wantsChildren" in updateData)
      (optimisticUser as any).wantsChildren = (updateData as any).wantsChildren;
    if ("smoking" in updateData)
      (optimisticUser as any).smoking = (updateData as any).smoking;
    if ("drinking" in updateData)
      (optimisticUser as any).drinking = (updateData as any).drinking;

    // Update the user in the cache immediately for a responsive UI
    queryClient.setQueryData(["/api/user"], (prev: any) => ({
      ...(prev || {}),
      ...(optimisticUser || {}),
    }));

    // For tribe clearing, ensure immediate visual feedback by forcing component state update
    if (fieldName === "tribe" && forceClear) {
      console.log("Force clearing tribe - ensuring immediate visual update");
      // The optimistic update above should handle the display immediately
      // No need to invalidate queries as that would override our optimistic update
    }

    console.log(`Optimistically updating ${fieldName} with data:`, updateData);

    // Update in database - exclude visibilityPreferences for faster nationality updates
    const isNationalityField =
      fieldName === "countryOfOrigin" ||
      fieldName === "secondaryCountryOfOrigin";
    const dataToSend = isNationalityField
      ? updateData // Send only the field data for nationality fields (faster)
      : {
          ...updateData,
          // Only send visibility preferences for non-nationality fields
          visibilityPreferences: JSON.stringify(fieldVisibility),
        };

    // Persist a lightweight cache of OPTIONAL selections to avoid UI reset
    try {
      const rawExisting = localStorage.getItem("meet_optional_profile_cache");
      const existing = rawExisting ? JSON.parse(rawExisting) : {};
      const merged = { ...existing } as any;
      if (Object.prototype.hasOwnProperty.call(updateData, "educationLevel"))
        merged.educationLevel = (updateData as any).educationLevel;
      if (Object.prototype.hasOwnProperty.call(updateData, "bodyType"))
        merged.bodyType = (updateData as any).bodyType;
      if (Object.prototype.hasOwnProperty.call(updateData, "height"))
        merged.height = (updateData as any).height;
      if (Object.prototype.hasOwnProperty.call(updateData, "hasChildren"))
        merged.hasChildren = (updateData as any).hasChildren;
      if (Object.prototype.hasOwnProperty.call(updateData, "wantsChildren"))
        merged.wantsChildren = (updateData as any).wantsChildren;
      if (Object.prototype.hasOwnProperty.call(updateData, "smoking"))
        merged.smoking = (updateData as any).smoking;
      if (Object.prototype.hasOwnProperty.call(updateData, "drinking"))
        merged.drinking = (updateData as any).drinking;
      localStorage.setItem(
        "meet_optional_profile_cache",
        JSON.stringify(merged),
      );
    } catch (_) {}

    // Do not force a global user refetch here; we rely on optimistic cache above
    // to prevent UI flicker. Background sync is handled elsewhere when needed.
    updateProfileMutation.mutate(dataToSend);

    // If education fields are being updated, also sync to SUITE profiles for unified experience
    if (fieldName === "highSchool" || fieldName === "collegeUniversity") {
      console.log(
        `🔗 UNIFIED-EDUCATION: Education field ${fieldName} updated in MEET Profile, syncing to SUITE profiles`,
      );

      // Sync to all active SUITE profiles
      const syncEducationToSuite = async () => {
        try {
          const suiteProfiles = ["networking", "mentorship", "job"];

          for (const profileType of suiteProfiles) {
            try {
              // Check if this SUITE profile exists
              const checkResponse = await fetch(
                `/api/suite/${profileType}-profile`,
                {
                  credentials: "include",
                },
              );

              if (checkResponse.ok) {
                // Profile exists, update it with the education field
                await apiRequest(`/api/suite/${profileType}-profile`, {
                  method: "PATCH",
                  data: updateData, // Contains the education field update
                });
                console.log(
                  `🔗 UNIFIED-EDUCATION: Synced ${fieldName} to ${profileType} profile`,
                );
              }
            } catch (profileError) {
              console.log(
                `🔗 UNIFIED-EDUCATION: No ${profileType} profile to sync (this is normal)`,
              );
            }
          }
        } catch (syncError) {
          console.error(
            "🔗 UNIFIED-EDUCATION: Error syncing education fields to SUITE profiles:",
            syncError,
          );
        }
      };

      // Run sync in background without blocking the main update
      syncEducationToSuite().then(() => {
        // Invalidate SUITE profile queries to reflect the changes immediately
        ["networking", "mentorship", "job"].forEach((profileType) => {
          queryClient.invalidateQueries({
            queryKey: [`/api/suite/${profileType}-profile`],
          });
        });
        console.log(
          "🔗 UNIFIED-EDUCATION: Invalidated SUITE profile caches for education field sync",
        );
      });
    }

    // Close edit mode
    setFieldVisibility((prevVisibility: FieldVisibility) => {
      // Log for debugging
      console.log("Saving visibility preferences:", prevVisibility);
      return prevVisibility;
    });
    setEditField(null);
  };

  // Define interface for dating preferences based on the existing implementation
  interface DatingPreferences {
    ageRange?: [number, number];
    distance?: number;
    religion?: string[];
    religiousImportance?: number;
    educationLevel?: string[];
    hasChildren?: boolean | null;
    wantsChildren?: boolean | null;
    height?: [number, number]; // in cm
    tribes?: string[];
    lookingFor?: string; // relationship, casual, friendship, marriage
    dealBreakers?: string[];
    interests?: string[];
    bodyType?: string[];
    matchingPriorities?: string[]; // What's most important to them
    // For under-18 flow: track optional high school preferences
    highSchoolPreferences?: string[];
  }

  // Extended User type that may contain dating preferences
  type ExtendedUser = User & {
    datingPreferences?: DatingPreferences;
    age?: number;
    phone?: string;
  };

  // Type guard for photo arrays to fix TypeScript errors
  const isPhotoArray = (
    data: any,
  ): data is Array<{ id: number; photoUrl: string; isPrimary: boolean }> => {
    return (
      Array.isArray(data) &&
      (data.length === 0 ||
        (data[0] &&
          typeof data[0].id === "number" &&
          typeof data[0].photoUrl === "string"))
    );
  };

  // Helper function to safely parse JSON strings into arrays
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

  // Fetch user preferences directly to ensure accurate profile completion calculation
  const { data: userPreferences, isLoading: loadingPreferences } = useQuery({
    queryKey: [`/api/preferences/${user?.id}`],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await apiRequest(`/api/preferences/${user?.id}`, {
          method: "GET",
        });
        if (res.status === 404) {
          console.log("No dating preferences found for user");
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch user preferences");
        }
        const data = await res.json();
        console.log("Fetched user preferences from API:", data);
        return data;
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (v5 uses gcTime instead of cacheTime)
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Deactivate profile mutation
  const deactivateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/user/deactivate-profile`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to deactivate profile");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate user data to reflect changes
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Clear localStorage cache for dating preferences to ensure UI shows reset values
      if (user?.id) {
        const userId = user.id;
        const preferencesFields = [
          "ageRange",
          "height",
          "bodyType",
          "distance",
          "religion",
          "tribes",
          "educationLevel",
          "hasChildren",
          "wantsChildren",
          "lookingFor",
          "dealBreakers",
          "matchingPriorities",
          "interests",
          "relationshipGoalPreference",
        ];

        // Clear all dating preferences from localStorage
        preferencesFields.forEach((field) => {
          const storageKey = `dating_preferences_${userId}_${field}`;
          try {
            localStorage.removeItem(storageKey);
          } catch (error) {
            console.error(
              `Error removing ${storageKey} from localStorage:`,
              error,
            );
          }
        });

        console.log(
          `Cleared dating preferences localStorage cache for user ${userId}`,
        );
      }
      // Invalidate preferences queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/preferences/${user?.id}`],
      });
      // Close dialog
      setShowDeactivateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to deactivate profile",
        variant: "destructive",
      });
    },
  });

  // Combine user data with preferences into extended user
  const extendedUser: ExtendedUser = {
    ...user,
    // Map database preferences to frontend DatingPreferences format
    datingPreferences: userPreferences
      ? {
          // Map minAge/maxAge to ageRange
          ageRange:
            userPreferences.minAge && userPreferences.maxAge
              ? ([userPreferences.minAge, userPreferences.maxAge] as [
                  number,
                  number,
                ])
              : undefined,

          // Map minHeight/maxHeight to height
          height:
            userPreferences.minHeightPreference &&
            userPreferences.maxHeightPreference
              ? ([
                  userPreferences.minHeightPreference,
                  userPreferences.maxHeightPreference,
                ] as [number, number])
              : undefined,

          // Map direct fields
          distance: userPreferences.distancePreference,
          religiousImportance: userPreferences.religiousImportance,
          lookingFor: userPreferences.relationshipGoalPreference,

          // Parse boolean preferences from string representation
          hasChildren:
            userPreferences.hasChildrenPreference === "true"
              ? true
              : userPreferences.hasChildrenPreference === "false"
                ? false
                : null,

          wantsChildren:
            userPreferences.wantsChildrenPreference === "true"
              ? true
              : userPreferences.wantsChildrenPreference === "false"
                ? false
                : null,

          // Parse JSON strings into arrays
          religion: userPreferences.religionPreference
            ? safeParseJSON(userPreferences.religionPreference)
            : [],
          tribes: userPreferences.ethnicityPreference
            ? safeParseJSON(userPreferences.ethnicityPreference)
            : [],
          educationLevel: userPreferences.educationLevelPreference
            ? safeParseJSON(userPreferences.educationLevelPreference)
            : [],
          bodyType: userPreferences.bodyTypePreference
            ? safeParseJSON(userPreferences.bodyTypePreference)
            : [],
          dealBreakers: userPreferences.dealBreakers
            ? safeParseJSON(userPreferences.dealBreakers)
            : [],
          interests: userPreferences.interestPreferences
            ? safeParseJSON(userPreferences.interestPreferences)
            : [],
          matchingPriorities: userPreferences.matchingPriorities
            ? safeParseJSON(userPreferences.matchingPriorities)
            : [],
          // CRITICAL FIX: Map highSchoolPreference (singular from API) to highSchoolPreferences (plural expected by frontend)
          highSchoolPreferences: userPreferences.highSchoolPreference
            ? safeParseJSON(userPreferences.highSchoolPreference)
            : [],
        }
      : undefined,
  };

  // Fetch interests directly from the useUserInterests hook result
  const hasInterests =
    visibleInterestStrings.length > 0 || allInterestStrings.length > 0;

  // Define profile fields that show in the UI (including ethnicity but excluding secondaryTribe)
  const profileFields = [
    userPhotos && userPhotos.length > 0, // Has photos
    !!user.fullName, // Name
    !!user.dateOfBirth, // Date of Birth
    !!user.phoneNumber, // Phone
    !!user.bio, // Bio
    !!user.location, // Location/Residence
    !!user.countryOfOrigin, // Nationality
    !!user.profession, // Profession
    // Conditionally include ethnicity/tribe for users with Ghana/Ghanaian as either primary OR secondary nationality
    ...(user.countryOfOrigin === "Ghana" ||
    user.countryOfOrigin === "Ghanaian" ||
    (user as any).secondaryCountryOfOrigin === "Ghana" ||
    (user as any).secondaryCountryOfOrigin === "Ghanaian"
      ? [!!user.ethnicity] // Primary Tribe (for Ghana/Ghanaian nationality)
      : []),
    !!user.religion, // Religion
    !!user.educationLevel, // {t('profile.educationLevel')} - FIXED: Now included in profile completion
    // Age-based conditional fields
    ...(isUnder18(user.dateOfBirth)
      ? [
          !!user.highSchool, // High School (under 18 only)
          // College/University - Only include if education level is NOT "high_school"
          ...(user.educationLevel !== "high_school"
            ? [!!user.collegeUniversity]
            : []), // College/University (under 18 only, conditional on education level)
        ]
      : [
          !!user.relationshipStatus, // Relationship Status (18+ only)
          !!user.relationshipGoal, // Relationship Goal (18+ only)
        ]),
    hasInterests, // Has interests (using data from useUserInterests hook)
    // OTHER section fields - personal details (18+ only)
    ...(isUnder18(user.dateOfBirth)
      ? []
      : [
          isHasChildrenSet, // {t('profile.haveChildren')}
          isWantsChildrenSet, // {t('profile.wantChildren')}
          isSmokingSet, // {t('profile.smoking')}
          isDrinkingSet, // {t('profile.drinking')}
          !!user.bodyType, // {t('profile.bodyType')}
          !!user.height, // Height
        ]),
  ];

  // Define dating preference fields that show in the UI (including all fields for proper completion tracking)
  const datingPreferenceFields = [
    !!extendedUser.datingPreferences?.ageRange, // Age range preference
    // Religious Importance - REMOVED from completion calculation per user request
    !!extendedUser.datingPreferences?.religion?.length, // Religion preference
    !!extendedUser.datingPreferences?.distance, // Preferred Distance - FIXED: Now included
    // Relationship Goals - Only for users 18+ (age-appropriate content)
    ...(isUnder18(user.dateOfBirth)
      ? []
      : [!!extendedUser.datingPreferences?.lookingFor]),
    // Conditionally include Ghanaian Tribes only when user selected "Ghana" for "Where Should Love Come From?"
    ...(meetPoolCountry === "Ghana"
      ? [!!extendedUser.datingPreferences?.tribes?.length] // Ghanaian Tribes - Only when Ghana is selected for love source
      : []),
    // Age-based conditional fields
    ...(isUnder18(user.dateOfBirth)
      ? [
          // High School Preferences - Only for users under 18 (age-appropriate content)
          !!extendedUser.datingPreferences?.highSchoolPreferences?.length, // High School preferences (under 18 only)
        ]
      : [
          !!extendedUser.datingPreferences?.height, // Height preference (18+ only)
          extendedUser.datingPreferences?.hasChildren !== undefined &&
            extendedUser.datingPreferences?.hasChildren !== null, // Has children preference (18+ only)
          extendedUser.datingPreferences?.wantsChildren !== undefined &&
            extendedUser.datingPreferences?.wantsChildren !== null, // Wants children preference (18+ only)
          !!extendedUser.datingPreferences?.dealBreakers?.length, // Deal breakers (18+ only)
          !!extendedUser.datingPreferences?.bodyType?.length, // Body type preference (18+ only)
        ]),
    !!extendedUser.datingPreferences?.educationLevel?.length, // Education level
    !!extendedUser.datingPreferences?.interests?.length, // Interests preference
    // Matching Priorities - Only for users 18+ (requires adult relationship decision-making)
    ...(isUnder18(user.dateOfBirth)
      ? []
      : [!!extendedUser.datingPreferences?.matchingPriorities?.length]), // Matching priorities (18+ only)
  ];

  // Calculate profile completion percentage with improved accuracy
  const calculateProfileCompletionPercentage = (): number => {
    // Use interests data from useUserInterests hook
    const hasInterests =
      visibleInterestStrings.length > 0 || allInterestStrings.length > 0;

    // We're using the component-level profileFields and datingPreferenceFields here

    // Combine all fields into a single array
    const allFields = [...profileFields, ...datingPreferenceFields];

    // Count completed fields
    const completedFields = allFields.filter(Boolean).length;
    const totalFields = allFields.length;

    // Debug logging for under 18 users
    if (isUnder18(user.dateOfBirth)) {
      console.log("🔍 DETAILED COMPLETION DEBUG (Under 18):", {
        userId: user.id,
        age: user.dateOfBirth
          ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()
          : 0,

        // Profile Fields Analysis
        profileFieldsDetailed: {
          hasPhotos: !!(userPhotos && userPhotos.length > 0),
          fullName: !!user.fullName,
          dateOfBirth: !!user.dateOfBirth,
          phoneNumber: !!user.phoneNumber,
          bio: !!user.bio,
          location: !!user.location,
          countryOfOrigin: !!user.countryOfOrigin,
          profession: !!user.profession,
          ethnicity: !!user.ethnicity,
          religion: !!user.religion,
          educationLevel: !!user.educationLevel,
          relationshipStatus: !!user.relationshipStatus,
          relationshipGoal: !!user.relationshipGoal,
          highSchool: !!user.highSchool,
          collegeUniversity: !!user.collegeUniversity,
          // College/University conditional logic for under-18
          collegeUniversityIncludedInCompletion: isUnder18(user.dateOfBirth)
            ? user.educationLevel !== "high_school"
            : true, // Always included for 18+
          hasInterests: hasInterests,
          // OTHER section fields (18+ only)
          hasChildren:
            user.hasChildren !== undefined && user.hasChildren !== null,
          wantsChildren:
            user.wantsChildren !== undefined && user.wantsChildren !== null,
          smoking: user.smoking !== undefined && user.smoking !== null,
          drinking: user.drinking !== undefined && user.drinking !== null,
          bodyType: !!user.bodyType,
          height: !!user.height,
        },

        // Raw data values for missing field identification
        rawProfileData: {
          hasPhotos: userPhotos ? userPhotos.length : 0,
          fullName: user.fullName,
          dateOfBirth: user.dateOfBirth,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          location: user.location,
          countryOfOrigin: user.countryOfOrigin,
          profession: user.profession,
          ethnicity: user.ethnicity,
          religion: user.religion,
          educationLevel: user.educationLevel,
          relationshipStatus: user.relationshipStatus,
          relationshipGoal: user.relationshipGoal,
          highSchool: user.highSchool,
          collegeUniversity: user.collegeUniversity,
          interestsCount:
            visibleInterestStrings.length + allInterestStrings.length,
          // OTHER section fields
          hasChildren: user.hasChildren,
          wantsChildren: user.wantsChildren,
          smoking: user.smoking,
          drinking: user.drinking,
          bodyType: user.bodyType,
          height: user.height,
        },

        // Dating Preference Fields Analysis
        datingPreferenceFieldsDetailed: {
          ageRange: !!extendedUser.datingPreferences?.ageRange,
          height: !!extendedUser.datingPreferences?.height,
          religiousImportance:
            !!extendedUser.datingPreferences?.religiousImportance !== undefined,
          religionPreference:
            !!extendedUser.datingPreferences?.religion?.length,
          preferredDistance: !!extendedUser.datingPreferences?.distance, // FIXED: Added distance tracking
          relationshipGoals: !!extendedUser.datingPreferences?.lookingFor, // FIXED: Added relationship goals tracking
          ghanaianTribes: !!extendedUser.datingPreferences?.tribes?.length, // FIXED: Added Ghanaian tribes tracking
          // High School Preferences - Only for users under 18 (age-appropriate content)
          ...(isUnder18(user.dateOfBirth)
            ? {
                highSchoolPreferences:
                  !!extendedUser.datingPreferences?.highSchoolPreferences
                    ?.length,
              }
            : {}),
          educationLevel:
            !!extendedUser.datingPreferences?.educationLevel?.length,
          dealBreakers: !!extendedUser.datingPreferences?.dealBreakers?.length,
          interestsPreference:
            !!extendedUser.datingPreferences?.interests?.length,
          bodyType: !!extendedUser.datingPreferences?.bodyType?.length,
          // Matching Priorities - Only for users 18+ (requires adult relationship decision-making)
          ...(isUnder18(user.dateOfBirth)
            ? {}
            : {
                matchingPriorities:
                  !!extendedUser.datingPreferences?.matchingPriorities?.length,
              }),
        },

        // Summary
        summary: {
          profileFieldsCount: profileFields.length,
          profileFieldsCompleted: profileFields.filter(Boolean).length,
          datingPreferenceFieldsCount: datingPreferenceFields.length,
          datingPreferenceFieldsCompleted:
            datingPreferenceFields.filter(Boolean).length,
          totalFields,
          completedFields,
          percentage: Math.round((completedFields / totalFields) * 100),
        },
      });
    }

    // Calculate simple percentage - number of filled fields divided by total number of fields
    const percentage = Math.round((completedFields / totalFields) * 100);

    // Return the calculated percentage based on completed fields
    return percentage;
  };

  // Calculate the profile completion percentage
  const profileCompletionPercentage = calculateProfileCompletionPercentage();

  // Get the appropriate color for the health bar
  const getHealthBarColor = (percent: number): string => {
    if (percent < 20) return "#cc0000"; // deep red
    if (percent < 40) return "#ff4500"; // red-orange
    if (percent < 60) return "#ffc107"; // yellow
    if (percent < 80) return "#90ee90"; // light green
    if (percent < 100) return "#32cd32"; // lime green
    return "#006400"; // deep green
  };

  return (
    <>
      <div className="pb-0 relative">
        {/* Profile Header with gradient background */}
        <div className="w-full flex flex-col items-center relative">
          {/* Top gradient background */}
          <div className="relative w-full h-20">
            <div
              className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-500"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>

            {/* Floating status badge positioned on the left side */}
            <div className="absolute bottom-6 left-4 z-40">
              {!user.profileHidden ? (
                <Badge className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg transition-all duration-200 rounded-full px-3 py-1.5">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">
                    {t("profile.active") || "Active"}
                  </span>
                </Badge>
              ) : (
                <Badge className="flex items-center gap-1.5 bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white border-0 shadow-lg transition-all duration-200 rounded-full px-3 py-1.5">
                  <div className="w-2 h-2 bg-white/70 rounded-full"></div>
                  <span className="text-xs font-medium">
                    {t("profile.inactive") || "Inactive"}
                  </span>
                </Badge>
              )}
            </div>

            {/* Delete button positioned on right side at same level as Active badge - only show when profile is Active */}
            {!user.profileHidden && (
              <div className="absolute bottom--1 right-4 z-50">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border border-red-300 dark:border-red-700 bg-white/95 hover:bg-red-50/100 dark:bg-gray-800/95 dark:hover:bg-red-900/20 shadow-md transition-colors pointer-events-auto rounded-full px-2 py-1"
                  onClick={() => setShowDeactivateDialog(true)}
                >
                  <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                  <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                    {t("common.delete")}
                  </span>
                </Button>
              </div>
            )}

            {/* Floating "Show Preview" button positioned closer to profile photo */}
            <div className="absolute bottom-6 right-4 z-40">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 border-2 border-pink-300 dark:border-pink-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-3"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <X className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      {t("profile.hidePreview")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      {t("profile.showPreview")}
                    </span>
                    <Check className="h-3.5 w-3.5 ml-1 text-purple-500 dark:text-purple-400" />
                  </>
                )}
              </Button>
            </div>

            {/* Floating hearts animation */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-white opacity-30"
                  initial={{
                    x: `${Math.random() * 100}%`,
                    y: "100%",
                    scale: 0.3 + Math.random() * 0.7,
                  }}
                  animate={{
                    y: "-20%",
                    rotate: Math.random() * 360,
                    transition: {
                      repeat: Infinity,
                      duration: 10 + Math.random() * 20,
                      delay: Math.random() * 5,
                      ease: "linear",
                    },
                  }}
                >
                  <Heart
                    fill={Math.random() > 0.5 ? "#fff" : "none"}
                    size={20 + Math.random() * 20}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Profile photo - Hide when preview is showing */}
          {!showPreview && (
            <div className="relative -mt-14">
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => setPhotoExpanded(!photoExpanded)}
                className="cursor-pointer"
              >
                {(() => {
                  const show = getEffectiveShowPhoto(
                    user,
                    hasActiveMeetProfile,
                  );
                  const avatarPhoto = (user as any).avatarPhoto as
                    | string
                    | undefined;
                  const useAvatar =
                    (user as any).showAvatar === true && !!avatarPhoto;
                  const effective = useAvatar
                    ? avatarPhoto
                    : user.photoUrl || undefined;
                  if (show && effective) {
                    return (
                      <div className="relative">
                        <UserPicture
                          imageUrl={effective}
                          size="xl"
                          allowRotate={true}
                          fallbackInitials={
                            user.fullName?.substring(0, 2) || ""
                          }
                          className="w-28 h-28 border-4 border-white dark:border-gray-800 shadow-lg"
                        />
                      </div>
                    );
                  }
                  return (
                    // Show placeholder if no photo, avatar, or if photo visibility is disabled
                    <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
                      {!show ? (
                        // Photo is hidden - show a lock icon
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-14 w-14 text-gray-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="10"
                            rx="2"
                            ry="2"
                          ></rect>
                          <circle cx="12" cy="16" r="1"></circle>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      ) : (
                        // No photo available - show person icon
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-14 w-14 text-gray-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      )}
                    </div>
                  );
                })()}
              </motion.div>

              {/* Camera icon button for Profile Picture Crop & Zoom Editor */}
              <div className="absolute bottom-1 right-1 z-30">
                <ProfilePhotoEditButton
                  userId={user.id}
                  photoId={userPhotos?.find((photo) => photo.isPrimary)?.id}
                  currentPhotoUrl={user.photoUrl}
                  className="bg-purple-500 hover:bg-purple-600 text-white border-white"
                  useCamera={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Profile Preview (SwipeCard) */}
        {showPreview && (
          <div className="mt-0 mb-6 px-4 block relative z-40 bg-white dark:bg-gray-900 pt-4 pb-2 rounded-lg">
            <div className="relative">
              <div className="flex flex-col gap-0 mt-[-8px]">
                <h3 className="text-center text-sm font-semibold text-purple-800 dark:text-purple-300 mt-0 mb-0 leading-none">
                  {t("profile.profilePreview")}
                </h3>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1 leading-none pt-1">
                  {t("profile.previewDescription")}
                </p>
              </div>

              {/* SwipeCard Preview */}
              <div className="w-full h-[480px] mx-auto border-2 border-white dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                <div className="h-full flex flex-col relative">
                  {/* Profile image */}
                  <div className="relative h-full w-full overflow-hidden">
                    {(() => {
                      const showAvatar =
                        (showAvatarValue ?? false) ||
                        Boolean((displayUser as any).showAvatar);
                      const avatarPhoto = (displayUser as any).avatarPhoto as
                        | string
                        | undefined;
                      const basePhoto = displayUser.photoUrl as
                        | string
                        | undefined;
                      const effectivePhoto =
                        showAvatar && avatarPhoto ? avatarPhoto : basePhoto;

                      if (showProfilePhotoValue && effectivePhoto) {
                        return (
                          <img
                            src={effectivePhoto}
                            className="w-full h-full object-cover"
                            alt={`${displayUser.fullName}'s profile`}
                          />
                        );
                      }

                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
                          <div className="p-6 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md">
                            <span className="text-4xl font-bold text-purple-300 dark:text-purple-200 block mb-2">
                              {displayUser.fullName?.charAt(0) || "?"}
                            </span>
                            <span className="text-purple-500 dark:text-purple-300 font-medium">
                              {!showProfilePhotoValue
                                ? "Photo Hidden"
                                : "No Photo Available"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Verification Badge - positioned in top-right corner */}
                    {displayUser?.isVerified && (
                      <div className="absolute top-4 right-4 z-30">
                        <div className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[8px] font-bold shadow-[0_2px_8px_rgba(34,197,94,0.3),0_1px_4px_rgba(34,197,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)] overflow-hidden border border-emerald-300/40 transform hover:scale-105 transition-all duration-200">
                          <Shield className="h-2 w-2 drop-shadow-sm" />
                          <span className="drop-shadow-sm tracking-wide">
                            Verified
                          </span>
                          {/* Metallic shine overlay */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                    )}

                    {/* Profile info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent px-4 pt-14 pb-3 flex flex-col">
                      {/* Main row with name, age, and nationality */}
                      <div className="flex flex-col mb-1">
                        {/* Name and age row, with nationality */}
                        <div className="flex justify-between items-center">
                          <h2 className="text-3xl font-extrabold">
                            <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                              <span className="text-4xl">
                                {displayUser.fullName.split(" ")[0].charAt(0)}
                              </span>
                              {displayUser.fullName.split(" ")[0].slice(1)}
                              {!getEffectiveHideAge(
                                displayUser,
                                displayUser.premiumAccess || false,
                              ) && `, ${calculateAge(displayUser.dateOfBirth)}`}
                            </span>
                          </h2>

                          {/* Country of Origin / Nationality - moved to top-right position */}
                          {displayUser.countryOfOrigin &&
                            fieldVisibility.countryOfOrigin && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                <div className="flex flex-wrap gap-0.5">
                                  <span className="font-medium text-xs text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    {getCountryNationality(
                                      displayUser.countryOfOrigin,
                                    )}
                                  </span>
                                  {(displayUser as any)
                                    .secondaryCountryOfOrigin && (
                                    <span className="font-medium text-xs text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] opacity-90">
                                      /{" "}
                                      {getCountryNationality(
                                        (displayUser as any)
                                          .secondaryCountryOfOrigin,
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Single tribe badge below nationality on right side */}
                        {displayUser.ethnicity &&
                          fieldVisibility.tribe &&
                          !displayUser.secondaryTribe && (
                            <div className="flex justify-end mb-1">
                              <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                <span className="relative z-10 drop-shadow-sm">
                                  {displayUser.ethnicity}
                                </span>
                              </Badge>
                            </div>
                          )}

                        {/* Two tribe badges below nationality on right side */}
                        {displayUser.ethnicity &&
                          fieldVisibility.tribe &&
                          displayUser.secondaryTribe && (
                            <div className="flex justify-end mb-1">
                              <div className="flex flex-wrap gap-1">
                                <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                                  <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                  <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                  <span className="relative z-10 drop-shadow-sm">
                                    {displayUser.ethnicity}
                                  </span>
                                </Badge>
                                <Badge className="relative bg-gradient-to-br from-fuchsia-400 via-fuchsia-600 to-purple-700 text-white shadow-lg text-xs py-0.5 px-2 border border-fuchsia-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                                  <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                  <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                  <span className="relative z-10 drop-shadow-sm">
                                    {displayUser.secondaryTribe}
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Location row */}
                      {displayUser.location && fieldVisibility.residence && (
                        <div className="flex items-center mb-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="font-medium text-sm text-orange-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                            {displayUser.location}
                          </span>
                        </div>
                      )}

                      {/* Job/Profession row with icon */}
                      {displayUser.profession && fieldVisibility.profession && (
                        <div className="flex items-center mb-1.5">
                          <Briefcase className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                          <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                            {displayUser.profession}
                          </span>
                        </div>
                      )}

                      {/* Religion display */}
                      {displayUser.religion && fieldVisibility.religion && (
                        <div className="flex items-center mb-1.5">
                          <span className="text-pink-500 mr-1.5 text-sm drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                            🙏
                          </span>
                          <span className="font-medium text-sm text-pink-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                            {(() => {
                              const fullDisplay = getReligionDisplayName(
                                displayUser.religion,
                              );
                              // For Islam, show the full display
                              if (displayUser.religion.startsWith("islam-")) {
                                return fullDisplay;
                              }
                              // For other religions, extract just the denomination
                              if (fullDisplay.includes(" - ")) {
                                return fullDisplay.split(" - ")[1];
                              }
                              return fullDisplay;
                            })()}
                          </span>
                        </div>
                      )}

                      {/* Relationship Status display - moved up to match new SwipeCard order */}
                      {displayUser.relationshipStatus &&
                        fieldVisibility.relationshipStatus && (
                          <div className="flex items-center mb-1.5">
                            <Heart className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                            <span className="font-medium text-sm text-rose-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                              Status:{" "}
                              {translate(
                                `relationshipStatus.${displayUser.relationshipStatus}`,
                              ) || displayUser.relationshipStatus}
                            </span>
                          </div>
                        )}

                      {/* Looking For (Relationship Goal) - Add to match SwipeCard in discover mode */}
                      {displayUser.relationshipGoal &&
                        fieldVisibility.relationshipGoal && (
                          <div className="flex items-center mb-1.5">
                            <CalendarHeart className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                            <span className="bg-gradient-to-r from-rose-300 to-red-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient no-animation">
                              Open to:{" "}
                              {translate(
                                `relationshipGoals.${displayUser.relationshipGoal}`,
                              ) || displayUser.relationshipGoal}
                            </span>
                          </div>
                        )}

                      {/* Bio */}
                      {displayUser.bio && fieldVisibility.bio && (
                        <div className="mb-2 rounded-md overflow-hidden">
                          <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                            {displayUser.bio}
                          </p>
                        </div>
                      )}

                      {/* High School display */}
                      {(sharedHighSchool || displayUser.highSchool) &&
                        fieldVisibility.highSchool && (
                          <div
                            className="flex items-center mb-1.5"
                            data-field="highSchool"
                          >
                            <BookType className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                            <span className="font-serif text-sm bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                              {sharedHighSchool || displayUser.highSchool}
                            </span>
                          </div>
                        )}

                      {/* College/University display */}
                      {(sharedCollege || displayUser.collegeUniversity) &&
                        fieldVisibility.collegeUniversity && (
                          <div
                            className="flex items-center mb-1.5"
                            data-field="collegeUniversity"
                          >
                            <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                            <span className="font-serif text-sm bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                              {sharedCollege || displayUser.collegeUniversity}
                            </span>
                          </div>
                        )}

                      {/* Interests display (using visibleInterestStrings from useUserInterests hook) */}
                      {
                        fieldVisibility.interests &&
                          (interestsLoading ? (
                            // Show loading skeleton while interests are being loaded
                            <div className="mb-2">
                              <span className="font-semibold text-white text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                {t("app.topInterests")}:
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <div className="h-5 w-16 rounded bg-white/20 animate-pulse"></div>
                                <div className="h-5 w-20 rounded bg-white/20 animate-pulse"></div>
                                <div className="h-5 w-14 rounded bg-white/20 animate-pulse"></div>
                              </div>
                            </div>
                          ) : Array.isArray(visibleInterestStrings) &&
                            visibleInterestStrings.length > 0 ? (
                            // Only show interests section when there are actual interests to display
                            <div className="mb-2">
                              <span className="font-semibold text-white text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                {t("app.topInterests")}:
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {visibleInterestStrings
                                  .slice(0, 3)
                                  .map((interest: string, index: number) => {
                                    // Dynamic colorful badges with alternating gradients
                                    const gradientClasses = [
                                      "from-purple-500/90 to-fuchsia-500/90",
                                      "from-amber-500/90 to-orange-500/90",
                                      "from-teal-500/90 to-cyan-500/90",
                                    ];
                                    const gradientClass =
                                      gradientClasses[
                                        index % gradientClasses.length
                                      ];

                                    return (
                                      <Badge
                                        key={`${user.id}-${index}`}
                                        className={`relative bg-gradient-to-br ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border border-white/30 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal static-gradient no-animation`}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                        <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                        <span className="relative z-10 drop-shadow-sm">
                                          {interest}
                                        </span>
                                      </Badge>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : null) /* Don't show anything if no interests */
                      }

                      {/* Relationship Goals section removed to eliminate duplicate - it already appears above Top Interests */}
                    </div>
                  </div>

                  {/* No swipe actions as requested */}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content section */}
        <div className="mt-1 px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Name/Age field removed as requested */}
          </motion.div>

          {/* Profile Completion Health Bar - Enhanced with dynamic feedback */}
          <div className="mt-2 mb-3">
            <div className="relative h-5 w-72 bg-gray-200 rounded-full mx-auto border border-gray-300 dark:border-gray-600 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${profileCompletionPercentage}%` }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: 0.1,
                }}
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  backgroundColor: getHealthBarColor(
                    profileCompletionPercentage,
                  ),
                  boxShadow:
                    profileCompletionPercentage > 0
                      ? `0 0 10px ${getHealthBarColor(profileCompletionPercentage)}`
                      : "none",
                }}
              >
                {/* Light reflection effect */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>
              </motion.div>

              {/* Percentage indicator with enhanced visibility */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-xs font-bold drop-shadow-[0_0px_2px_rgba(0,0,0,0.7)]"
                  style={{
                    color: "#ffffff",
                    textShadow:
                      "0px 0px 3px rgba(0,0,0,0.9), 0px 0px 6px rgba(255,255,255,0.5)",
                  }}
                >
                  {t("profile.profileCompletion", {
                    percent: `${profileCompletionPercentage}`,
                  })}
                </span>
              </div>
            </div>

            {/* Status message based on completion level */}
            <div className="flex flex-col items-center mt-1">
              {profileCompletionPercentage < 100 ? (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                    {t("profile.completeProfileMessage")}
                  </p>

                  {/* Missing fields list - shows when below 100% */}
                  {profileCompletionPercentage < 100 && (
                    <div className="mt-1 text-xs flex flex-wrap justify-center gap-1 max-w-md">
                      {/* Profile Basic Info Badges */}
                      {(!userPhotos || userPhotos.length === 0) && (
                        <span
                          onClick={() =>
                            document
                              .getElementById("photos-section")
                              ?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <Camera className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.photos")}
                        </span>
                      )}
                      {!user.location && (
                        <span
                          onClick={() => {
                            document
                              .getElementById("residence-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => toggleEditMode("residence"), 800);
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <MapPin className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.residence")}
                        </span>
                      )}
                      {!user.relationshipGoal &&
                        !isUnder18(user.dateOfBirth) && (
                          <span
                            onClick={() => {
                              document
                                .getElementById("relationship-goals-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                              setTimeout(
                                () => toggleEditMode("relationshipGoal"),
                                800,
                              );
                            }}
                            className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                          >
                            <CalendarHeart className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.relationshipGoals")}
                          </span>
                        )}
                      {!user.bio && (
                        <span
                          onClick={() => {
                            document
                              .getElementById("bio-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => toggleEditMode("bio"), 800);
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <BookType className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.bio")}
                        </span>
                      )}
                      {!user.countryOfOrigin && (
                        <span
                          onClick={() => {
                            document
                              .getElementById("countryOfOrigin-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(
                              () => toggleEditMode("countryOfOrigin"),
                              800,
                            );
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <Globe className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.nationality")}
                        </span>
                      )}
                      {!user.profession && (
                        <span
                          onClick={() => {
                            document
                              .getElementById("profession-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => toggleEditMode("profession"), 800);
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <Briefcase className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.profession")}
                        </span>
                      )}
                      {!user.ethnicity &&
                        (user.countryOfOrigin === "Ghana" ||
                          user.countryOfOrigin === "Ghanaian" ||
                          (user as any).secondaryCountryOfOrigin === "Ghana" ||
                          (user as any).secondaryCountryOfOrigin ===
                            "Ghanaian") && (
                          <span
                            onClick={() => {
                              document
                                .getElementById("tribe-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                              setTimeout(() => toggleEditMode("tribe"), 800);
                            }}
                            className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                          >
                            <UserCheck className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.tribe")}
                          </span>
                        )}
                      {!user.religion && (
                        <span
                          onClick={() => {
                            document
                              .getElementById("religion-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => toggleEditMode("religion"), 800);
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <span className="inline-block mr-0.5">🙏</span>
                          {t("profile.religion")}
                        </span>
                      )}
                      {!hasInterests && (
                        <span
                          onClick={() =>
                            document
                              .getElementById("interests-section")
                              ?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <Heart className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.interests")}
                        </span>
                      )}

                      {/* Relationship Status Badge - Only show for users 18+ */}
                      {!user.relationshipStatus &&
                        !isUnder18(user.dateOfBirth) && (
                          <span
                            onClick={() => {
                              document
                                .getElementById("relationship-goals-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                              setTimeout(
                                () => toggleEditMode("relationshipStatus"),
                                800,
                              );
                            }}
                            className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                          >
                            <Heart className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.relationshipStatusBadge")}
                          </span>
                        )}

                      {/* {t('profile.educationLevel')} Badge - Consolidated single badge */}
                      {!user.educationLevel && (
                        <span
                          onClick={() => {
                            // Scroll to education section
                            document
                              .getElementById("education-section")
                              ?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(
                              () => toggleEditMode("educationLevel"),
                              800,
                            );
                          }}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 rounded-full text-[10px] border border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
                        >
                          <GraduationCap className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.educationLevel")}
                        </span>
                      )}

                      {/* OTHER Section Badges - Personal Details (18+ only) */}
                      {!isUnder18(user.dateOfBirth) && !isHasChildrenSet && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <Baby className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.haveChildren")}
                        </span>
                      )}
                      {!isUnder18(user.dateOfBirth) && !isWantsChildrenSet && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <HeartPulse className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.wantChildren")}
                        </span>
                      )}
                      {!isUnder18(user.dateOfBirth) && !isSmokingSet && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <Shield className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.smoking")}
                        </span>
                      )}
                      {!isUnder18(user.dateOfBirth) && !isDrinkingSet && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <Shield className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.drinking")}
                        </span>
                      )}
                      {!isUnder18(user.dateOfBirth) && !user.bodyType && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <Scale className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.bodyType")}
                        </span>
                      )}
                      {!isUnder18(user.dateOfBirth) && !user.height && (
                        <span
                          onClick={() => {
                            setShowOptionalSection(true);
                            setTimeout(() => {
                              document
                                .getElementById("optional-section")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[10px] border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                        >
                          <Ruler className="inline-block h-2 w-2 mr-0.5" />
                          {t("profile.height")}
                        </span>
                      )}

                      {/* Dating Preferences Badges */}
                      {!extendedUser.datingPreferences?.ageRange && (
                        <Link to="/dating-preferences?section=basics&field=ageRange">
                          <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                            <Settings className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.ageRange")}
                          </span>
                        </Link>
                      )}
                      {!isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.height && (
                          <Link to="/dating-preferences?section=basics&field=height">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.heightRange")}
                            </span>
                          </Link>
                        )}
                      {/* Removed Religious Importance badge as requested */}
                      {!extendedUser.datingPreferences?.religion?.length && (
                        <Link to="/dating-preferences?section=background&field=religion">
                          <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                            <Settings className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.religionPreferences")}
                          </span>
                        </Link>
                      )}
                      {/* Only show has children and wants children badges for users 18+ */}
                      {!isUnder18(user.dateOfBirth) &&
                        (extendedUser.datingPreferences?.hasChildren ===
                          undefined ||
                          extendedUser.datingPreferences?.hasChildren ===
                            null) && (
                          <Link to="/dating-preferences?section=lifestyle&field=hasChildren">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <UserPlus className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.hasChildren")}
                            </span>
                          </Link>
                        )}
                      {!isUnder18(user.dateOfBirth) &&
                        (extendedUser.datingPreferences?.wantsChildren ===
                          undefined ||
                          extendedUser.datingPreferences?.wantsChildren ===
                            null) && (
                          <Link to="/dating-preferences?section=lifestyle&field=wantsChildren">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Heart className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.wantsChildren")}
                            </span>
                          </Link>
                        )}
                      {!extendedUser.datingPreferences?.educationLevel
                        ?.length && (
                        <Link to="/dating-preferences?section=background&field=educationLevel">
                          <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                            <Settings className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.educationLevel")}
                          </span>
                        </Link>
                      )}
                      {!isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.dealBreakers
                          ?.length && (
                          <Link to="/dating-preferences?section=dealbreakers&field=dealBreakers">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.dealBreakers")}
                            </span>
                          </Link>
                        )}
                      {!isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.bodyType?.length && (
                          <Link to="/dating-preferences?section=basics&field=bodyType">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.bodyType")}
                            </span>
                          </Link>
                        )}
                      {!extendedUser.datingPreferences?.interests?.length && (
                        <Link to="/dating-preferences?section=lifestyle&field=interests">
                          <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                            <Settings className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.interestPreferences")}
                          </span>
                        </Link>
                      )}
                      {/* Matching Priorities - Only for users 18+ (requires adult relationship decision-making) */}
                      {!isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.matchingPriorities
                          ?.length && (
                          <Link to="/dating-preferences?section=lifestyle&field=matchingPriorities">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.matchingPriorities")}
                            </span>
                          </Link>
                        )}

                      {/* FIXED: Added the 3 missing dating preference badges */}
                      {!extendedUser.datingPreferences?.distance && (
                        <Link to="/dating-preferences?section=basics&field=distance">
                          <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                            <Settings className="inline-block h-2 w-2 mr-0.5" />
                            {t("profile.preferredDistance")}
                          </span>
                        </Link>
                      )}
                      {/* Relationship Goals - Only for users 18+ (age-appropriate content) */}
                      {!isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.lookingFor && (
                          <Link to="/dating-preferences?section=dealbreakers&field=lookingFor">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.relationshipGoals")}
                            </span>
                          </Link>
                        )}
                      {/* Only show Ghanaian Tribes badge when user selected "Ghana" for "Where Should Love Come From?" */}
                      {meetPoolCountry === "Ghana" &&
                        !extendedUser.datingPreferences?.tribes?.length && (
                          <Link to="/dating-preferences?section=background&field=tribes">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <Settings className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.ghanaianTribes")}
                            </span>
                          </Link>
                        )}
                      {/* High School Preferences - Only for users under 18 (age-appropriate content) */}
                      {isUnder18(user.dateOfBirth) &&
                        !extendedUser.datingPreferences?.highSchoolPreferences
                          ?.length && (
                          <Link to="/dating-preferences?section=background&field=highSchoolPreference">
                            <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 rounded-full text-[10px] border border-pink-200 dark:border-pink-700 cursor-pointer hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors">
                              <GraduationCap className="inline-block h-2 w-2 mr-0.5" />
                              {t("profile.highSchoolPreferences")}
                            </span>
                          </Link>
                        )}
                      {/* Removed Dating Preferences badges as requested */}
                    </div>
                  )}
                </>
              ) : (
                <p
                  className="text-xs font-medium italic"
                  style={{
                    color: "#006400",
                    textShadow: "0px 0px 5px rgba(255,255,255,0.7)",
                    background: "rgba(255,255,255,0.3)",
                    padding: "1px 8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,100,0,0.3)",
                  }}
                >
                  {t("profile.completeMessage")} ✓
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Fields in the Requested Order */}
        <div className="px-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
            {t("profile.myInfo")}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {/* Residence (location) */}
            <div
              id="residence-section"
              className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.residence")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("residence")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.residence}
                      onCheckedChange={() => toggleVisibility("residence")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "residence" ? (
                <div className="mt-2">
                  <CityInput
                    initialValue={residenceValue}
                    onLocationSelect={setResidenceValue}
                    placeholder={t("profile.enterCityCountry")}
                    className="text-xs border-pink-200"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("residence", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("residence")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.location || t("profile.notSpecified")}
                </p>
              )}
            </div>

            {/* Nationality */}
            <div
              id="nationality-section"
              className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <Globe className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.nationality")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("countryOfOrigin")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.countryOfOrigin}
                      onCheckedChange={() =>
                        toggleVisibility("countryOfOrigin")
                      }
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "countryOfOrigin" ? (
                <div className="mt-2 space-y-3">
                  {/* Primary Nationality */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Primary Nationality
                    </label>
                    <CountrySelect
                      value={countryOfOriginValue}
                      onChange={setCountryOfOriginValue}
                      placeholder="Select your primary nationality"
                      className="text-xs border-pink-200"
                      isNationalityField={true}
                    />
                  </div>

                  {/* Secondary Nationality (Dual Citizenship) */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Secondary Nationality{" "}
                      <span className="text-gray-500">
                        (Optional - for dual citizenship)
                      </span>
                    </label>
                    <CountrySelect
                      value={secondaryCountryOfOriginValue}
                      onChange={setSecondaryCountryOfOriginValue}
                      placeholder="Select your secondary nationality"
                      className="text-xs border-pink-200"
                      isNationalityField={true}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        saveField("countryOfOrigin", true);
                        saveField("secondaryCountryOfOrigin", true);
                      }}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Close edit mode immediately for instant UI feedback
                        setEditField(null);

                        // Save both nationality fields
                        saveField("countryOfOrigin");
                        if (
                          secondaryCountryOfOriginValue &&
                          secondaryCountryOfOriginValue.trim()
                        ) {
                          saveField("secondaryCountryOfOrigin");
                        }
                      }}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  {user.countryOfOrigin ? (
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm text-xs py-0.5 px-2 border-0">
                        {user.countryOfOrigin}
                      </Badge>
                      {(user as any).secondaryCountryOfOrigin && (
                        <Badge className="bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-sm text-xs py-0.5 px-2 border-0">
                          {(user as any).secondaryCountryOfOrigin}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{t("profile.notSpecified")}</p>
                  )}
                </div>
              )}
            </div>

            {/* Tribe (ethnicity) - Show if Ghana is selected as either primary OR secondary nationality */}
            {(countryOfOriginValue === "Ghana" ||
              countryOfOriginValue === "Ghanaian" ||
              user.countryOfOrigin === "Ghana" ||
              user.countryOfOrigin === "Ghanaian" ||
              secondaryCountryOfOriginValue === "Ghana" ||
              secondaryCountryOfOriginValue === "Ghanaian" ||
              (user as any).secondaryCountryOfOrigin === "Ghana" ||
              (user as any).secondaryCountryOfOrigin === "Ghanaian") && (
              <div
                id="tribe-section"
                className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                    <UserCheck className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    {t("profile.tribe")}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleEditMode("tribe")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t("profile.show")}
                      </span>
                      <Switch
                        checked={fieldVisibility.tribe}
                        onCheckedChange={() => toggleVisibility("tribe")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "tribe" ? (
                  <div className="mt-2">
                    <TribeSelect
                      value={tribeValues}
                      onChange={setTribeValues}
                      maxSelections={2}
                      className="text-xs"
                      placeholder={t("profile.selectTribes")}
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveField("tribe", true)}
                        className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                      >
                        <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                        {t("profile.clear")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveField("tribe")}
                        className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                      >
                        {t("profile.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex flex-wrap gap-1">
                      <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                        <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                        <span className="relative z-10 drop-shadow-sm">
                          {user.ethnicity || t("profile.notSpecified")}
                        </span>
                      </Badge>
                      {user.secondaryTribe && (
                        <Badge className="relative bg-gradient-to-br from-fuchsia-400 via-fuchsia-600 to-purple-700 text-white shadow-lg text-xs py-0.5 px-2 border border-fuchsia-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                          <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                          <span className="relative z-10 drop-shadow-sm">
                            {user.secondaryTribe}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profession */}
            <div
              id="profession-section"
              className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.profession")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("profession")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.profession}
                      onCheckedChange={() => toggleVisibility("profession")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "profession" ? (
                <div className="mt-2">
                  <Input
                    value={professionValue}
                    onChange={(e) => setProfessionValue(e.target.value)}
                    placeholder={t("profile.enterProfession")}
                    className="text-xs border-pink-200"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("profession", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("profession")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.profession || t("profile.notSpecified")}
                </p>
              )}
            </div>

            {/* Religion */}
            <div
              id="religion-section"
              className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <span className="text-pink-500 mr-1.5 text-sm">🙏</span>
                  {t("profile.religion")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("religion")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.religion}
                      onCheckedChange={() => toggleVisibility("religion")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "religion" ? (
                <div className="mt-2">
                  <ReligionSelect
                    value={religionValue}
                    onValueChange={(value) => setReligionValue(value)}
                    placeholder={t("profile.selectReligion")}
                    allowClear={false}
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("religion", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("religion")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.religion
                    ? getReligionDisplayName(user.religion)
                    : t("profile.notSpecified")}
                </p>
              )}
            </div>

            {/* About me (bio) */}
            <div
              id="bio-section"
              className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.aboutMe")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("bio")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.bio}
                      onCheckedChange={() => toggleVisibility("bio")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "bio" ? (
                <div className="mt-2">
                  <Input
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder={t("profile.tellAboutYourself")}
                    className="text-xs border-pink-200"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("bio", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("bio")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.bio || t("profile.notSpecified")}
                </p>
              )}
            </div>
          </div>

          {/* Avatar creation has been removed */}
        </div>

        {/* Photos section */}
        <div className="px-5 mb-6" id="photos-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center">
              <Camera className="h-4 w-4 mr-2 text-pink-500" />
              {t("profile.myPhotosHeader")}
            </h3>
            <div className="flex items-center space-x-3">
              {/* Show Photo toggle */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t("profile.showPhoto")}
                </span>
                <Switch
                  checked={showProfilePhotoValue}
                  className="scale-75 origin-left data-[state=checked]:bg-purple-500"
                  onCheckedChange={(checked) => {
                    setShowProfilePhotoValue(checked);

                    // Apply optimistic update - type-safe approach
                    const optimisticUser = {
                      ...user,
                      showProfilePhoto: checked,
                    } as typeof user;
                    queryClient.setQueryData(["/api/user"], optimisticUser);

                    // CRITICAL FIX: Update both showProfilePhoto AND visibility_preferences
                    // This ensures photo visibility is synced across both systems
                    const updatedVisibilityPreferences = {
                      ...fieldVisibility,
                      photos: checked,
                    };

                    // Update local state immediately
                    setFieldVisibility(updatedVisibilityPreferences);

                    // Update the profile with both showProfilePhoto and visibility preferences
                    updateProfileMutation.mutate({
                      showProfilePhoto: checked,
                      visibilityPreferences: JSON.stringify(
                        updatedVisibilityPreferences,
                      ),
                    });

                    // Photo visibility update completed - no disruptive toast notification needed
                  }}
                  aria-label="Toggle profile photo visibility"
                />
              </div>

              {/* Show Avatar toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Show Avatar
                </span>
                <Switch
                  checked={showAvatarValue}
                  className="scale-75 origin-left data-[state=checked]:bg-emerald-500"
                  onCheckedChange={async (checked) => {
                    setShowAvatarValue(checked);
                    setAvatarLoading(checked && !(user as any).avatarPhoto);
                    // Optimistic update
                    queryClient.setQueryData(["/api/user"], {
                      ...user,
                      showAvatar: checked,
                    });
                    updateProfileMutation.mutate({ showAvatar: checked });
                    try {
                      if (checked && !(user as any).avatarPhoto) {
                        await fetch("/api/kwame/generate-avatar", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            style: "pixar",
                            section: "meet",
                          }),
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["/api/user"],
                        });
                        setAvatarLoading(false);
                      }
                    } catch (e) {
                      console.error("[AVATAR] generation failed", e);
                      setAvatarLoading(false);
                    }
                  }}
                />
                {avatarLoading && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 animate-pulse">
                    generating…
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Photo gallery */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {loadingPhotos ? (
              <div className="col-span-3 flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : (
              <>
                {/* Existing photos first */}
                {!userPhotos || userPhotos.length === 0 ? (
                  <>
                    {/* Add photo cell (first if no photos) */}
                    <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center cursor-pointer bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-600">
                      <ProfilePhotoButton
                        userId={user.id}
                        currentPhotoUrl={user.photoUrl}
                        variant="ghost"
                        className="w-full h-full flex flex-col items-center justify-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-1">
                          <span className="text-white text-2xl font-light">
                            +
                          </span>
                        </div>
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                          {t("profile.addPhoto")}
                        </span>
                      </ProfilePhotoButton>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {t("profile.noPhotosYet")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Show avatar photo (if generated) */}
                    {(user as any).avatarPhoto && (
                      <div className="relative aspect-square rounded-lg overflow-hidden group ring-2 ring-emerald-400/60">
                        <img
                          src={(user as any).avatarPhoto}
                          alt={t("profile.userPhoto")}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute top-1 left-1 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full shadow">
                          Avatar
                        </div>
                        {/* Actions for avatar (clickable overlay) */}
                        <div className="absolute top-2 right-2 flex flex-col space-y-1 z-30 pointer-events-auto">
                          {/* Delete avatar button (clears avatar_photo and show_avatar) */}
                          <button
                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                            onClick={async () => {
                              // Store previous state for rollback
                              const prevUser: any = queryClient.getQueryData([
                                "/api/user",
                              ]);
                              const prevShowAvatar = showAvatarValue;

                              try {
                                console.log(
                                  "[AVATAR-DELETE] Starting delete process...",
                                );
                                console.log(
                                  "[AVATAR-DELETE] Current user state:",
                                  {
                                    avatarPhoto: user.avatarPhoto,
                                    showAvatar: user.showAvatar,
                                  },
                                );

                                // Optimistic update - immediately update UI
                                setShowAvatarValue(false);
                                queryClient.setQueryData(
                                  ["/api/user"],
                                  (old: any) => {
                                    const updated = {
                                      ...(old || {}),
                                      avatarPhoto: null,
                                      showAvatar: false,
                                    };
                                    console.log(
                                      "[AVATAR-DELETE] Updated cache optimistically:",
                                      updated,
                                    );
                                    return updated;
                                  },
                                );

                                // Make API call to delete avatar
                                console.log(
                                  "[AVATAR-DELETE] Making DELETE request to /api/user/avatar",
                                );
                                const resp = await fetch("/api/user/avatar", {
                                  method: "DELETE",
                                  credentials: "include",
                                });

                                console.log(
                                  "[AVATAR-DELETE] Response status:",
                                  resp.status,
                                );

                                if (!resp.ok) {
                                  const errorText = await resp.text();
                                  console.error(
                                    "[AVATAR-DELETE] API error:",
                                    errorText,
                                  );
                                  throw new Error(
                                    `Failed to delete avatar: ${errorText}`,
                                  );
                                }

                                const responseData = await resp.json();
                                console.log(
                                  "[AVATAR-DELETE] API response:",
                                  responseData,
                                );

                                // Refresh user data from server
                                console.log(
                                  "[AVATAR-DELETE] Invalidating queries...",
                                );
                                queryClient.invalidateQueries({
                                  queryKey: ["/api/user"],
                                });

                                console.log(
                                  "[AVATAR-DELETE] Delete process completed successfully",
                                );
                              } catch (e) {
                                console.error("[AVATAR] delete failed", e);
                                // Rollback optimistic updates
                                if (prevUser) {
                                  queryClient.setQueryData(
                                    ["/api/user"],
                                    prevUser,
                                  );
                                }
                                setShowAvatarValue(prevShowAvatar);

                                // Show error toast
                                toast({
                                  title: translate("toast.errorDeletingPhoto"),
                                  description:
                                    e instanceof Error
                                      ? e.message
                                      : translate("toast.unknownError"),
                                  variant: "destructive",
                                });
                              }
                            }}
                            title="Delete avatar"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                          {/* Star button to mark avatar as primary presentation */}
                          <button
                            className={`rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-colors ${showAvatarValue ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-600"}`}
                            title={
                              showAvatarValue
                                ? "Current primary"
                                : "Set avatar as primary"
                            }
                            onClick={async () => {
                              try {
                                setShowAvatarValue(true);
                                queryClient.setQueryData(["/api/user"], {
                                  ...user,
                                  showAvatar: true,
                                });
                                updateProfileMutation.mutate({
                                  showAvatar: true,
                                });
                              } catch (e) {
                                console.error("[AVATAR] set primary failed", e);
                              }
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.285-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show existing photos first */}
                    {userPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden group"
                      >
                        <img
                          src={photo.photoUrl}
                          alt={t("profile.userPhoto")}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setExpandedPhotoUrl(photo.photoUrl);
                            setPhotoModalOpen(true);
                          }}
                          loading="eager"
                        />

                        {/* Star icon for primary photo - prefer photo.isPrimary flag */}
                        {!showAvatarValue && (photo as any).isPrimary && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Edit button for primary photo - only for the primary flagged photo */}
                        {!showAvatarValue && (photo as any).isPrimary && (
                          <div className="absolute bottom-2 right-2 z-20">
                            <ProfilePhotoEditButton
                              userId={user.id}
                              photoId={photo.id}
                              currentPhotoUrl={photo.photoUrl}
                            />
                          </div>
                        )}

                        {/* Action buttons - visible for all photos except the current primary */}
                        {!(photo as any).isPrimary && (
                          <div className="absolute top-2 right-2 flex flex-col space-y-1 z-10">
                            {/* Delete button */}
                            <button
                              className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                              onClick={() =>
                                deletePhotoMutation.mutate(photo.id)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                            </button>

                            {/* Set as primary photo button (shows as gray star) */}
                            <button
                              className="bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-yellow-100 hover:text-yellow-600 transition-colors"
                              onClick={() => {
                                setShowAvatarValue(false);
                                updateProfileMutation.mutate({
                                  showAvatar: false,
                                });
                                setPrimaryPhotoMutation.mutate(photo.id);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add photo cell (always last after existing photos) */}
                    <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center cursor-pointer bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-600">
                      <Button
                        variant="ghost"
                        className="w-full h-full flex flex-col items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-1">
                          <span className="text-white text-2xl font-light">
                            +
                          </span>
                        </div>
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                          {t("profile.addPhoto")}
                        </span>
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Minimal photo viewer (no controls) */}
        {expandedPhotoUrl && (
          <MinimalDialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
            <MinimalDialogContent
              className="p-0 bg-transparent border-0 shadow-none max-w-[420px] w-[90vw]"
              hideCloseButton
            >
              <div
                className="relative w-full"
                onClick={() => setPhotoModalOpen(false)}
              >
                <img
                  src={expandedPhotoUrl}
                  alt="Photo"
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>
            </MinimalDialogContent>
          </MinimalDialog>
        )}

        {/* Interests section */}
        <div className="px-5 mb-6" id="interests-section">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center">
            <BookType className="h-4 w-4 mr-2 text-pink-500" />
            {t("profile.myInterests")}
          </h3>

          {/* Using the new InterestsSection component with visibility toggle */}
          <InterestsSection
            userId={user.id}
            onToggleVisibility={toggleVisibility}
            isVisible={fieldVisibility.interests}
          />
        </div>

        {/* Relationship Goals - Hidden for users under 18 */}
        {!isUnder18(user.dateOfBirth) && (
          <div id="relationship-goals-section" className="px-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center">
              <CalendarHeart className="h-4 w-4 mr-2 text-pink-500" />
              {t("profile.relationshipGoalsSection")}
            </h3>

            {/* Relationship Status */}
            <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <Heart className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.myRelationshipStatus")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("relationshipStatus")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.relationshipStatus}
                      onCheckedChange={() =>
                        toggleVisibility("relationshipStatus")
                      }
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "relationshipStatus" ? (
                <div className="mt-2">
                  <RelationshipStatusSelect
                    value={relationshipStatusValue}
                    onChange={setRelationshipStatusValue}
                    placeholder="Select your relationship status"
                    className="text-xs border-pink-200"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("relationshipStatus", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("relationshipStatus")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.relationshipStatus
                    ? translate(
                        `relationshipStatus.${user.relationshipStatus}`,
                      ) || user.relationshipStatus
                    : t("profile.notSpecified")}
                </p>
              )}
            </div>

            {/* What I'm Looking For */}
            <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <HeartPulse className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.whatImLookingFor")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("relationshipGoal")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.relationshipGoal}
                      onCheckedChange={() =>
                        toggleVisibility("relationshipGoal")
                      }
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "relationshipGoal" ? (
                <div className="mt-2">
                  <RelationshipGoalSelect
                    value={relationshipGoalValue}
                    onChange={setRelationshipGoalValue}
                    placeholder={t("profile.whatAreYouLookingFor")}
                    className="text-xs border-pink-200"
                    userDateOfBirth={
                      user.dateOfBirth ? user.dateOfBirth.toString() : null
                    }
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("relationshipGoal", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("relationshipGoal")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {user.relationshipGoal
                    ? translate(`relationshipGoals.${user.relationshipGoal}`) ||
                      user.relationshipGoal
                    : t("profile.notSpecified")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Education Section - {t('profile.educationLevel')} visible for all ages, other fields age-restricted */}
        <div id="education-section" className="px-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center">
            <GraduationCap className="h-4 w-4 mr-2 text-pink-500" />
            {t("profile.educationSection")}{" "}
            <span className="text-[10px] normal-case font-normal ml-1 opacity-70">
              ({t("profile.optional")} - {t("profile.yourInformation")})
            </span>
          </h3>

          {/* {t('profile.educationLevel')} - Visible for all ages */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                {t("profile.educationLevel")}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleEditMode("educationLevel")}
                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>

            {editField === "educationLevel" ? (
              <div className="mt-2">
                <Select
                  value={educationLevelValue}
                  onValueChange={setEducationLevelValue}
                >
                  <SelectTrigger className="text-xs border-pink-200">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="vocational">Vocational</SelectItem>
                    <SelectItem value="bachelors">Bachelor's</SelectItem>
                    <SelectItem value="masters">Master's</SelectItem>
                    <SelectItem value="doctorate">Doctorate+</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 flex justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveField("educationLevel", true)}
                    className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                  >
                    <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                    {t("profile.clear")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveField("educationLevel")}
                    className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    {t("profile.save")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">
                {educationLevelValue === "high_school"
                  ? "High School"
                  : educationLevelValue === "vocational"
                    ? "Vocational"
                    : educationLevelValue === "bachelors"
                      ? "Bachelor's"
                      : educationLevelValue === "masters"
                        ? "Master's"
                        : educationLevelValue === "doctorate"
                          ? "Doctorate+"
                          : t("profile.notSpecified")}
              </p>
            )}
          </div>

          {/* High School - Show when any education level is selected */}
          {educationLevelValue && (
            <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <BookType className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.highSchool")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("highSchool")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.highSchool}
                      onCheckedChange={() => toggleVisibility("highSchool")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "highSchool" ? (
                <div className="mt-2">
                  <HighSchoolSearch
                    value={highSchoolValue}
                    onChange={(value) => {
                      setSharedHighSchool(value);
                      setHighSchoolValue(value);
                    }}
                    placeholder="Search for your high school"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("highSchool", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("highSchool")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {sharedHighSchool ||
                    highSchoolValue ||
                    user.highSchool ||
                    t("profile.notSpecified")}
                </p>
              )}
            </div>
          )}

          {/* College/University - Show only when higher education is selected */}
          {educationLevelValue && educationLevelValue !== "high_school" && (
            <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                  {t("profile.vocationalCollegeUniversity")}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleEditMode("collegeUniversity")}
                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("profile.show")}
                    </span>
                    <Switch
                      checked={fieldVisibility.collegeUniversity}
                      onCheckedChange={() =>
                        toggleVisibility("collegeUniversity")
                      }
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              {editField === "collegeUniversity" ? (
                <div className="mt-2">
                  <UniversitySearch
                    value={collegeUniversityValue}
                    onChange={(value) => {
                      setSharedCollege(value);
                      setCollegeUniversityValue(value);
                      try {
                        queryClient.setQueryData(["/api/user"], (prev: any) => {
                          if (!prev || typeof prev !== "object") return prev;
                          if (prev.collegeUniversity === value) return prev;
                          return { ...prev, collegeUniversity: value };
                        });
                      } catch {}
                    }}
                    placeholder="Search for your vocational school, college, or university..."
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveField("collegeUniversity", true)}
                      className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                      {t("profile.clear")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveField("collegeUniversity")}
                      className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                    >
                      {t("profile.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1">
                  {sharedCollege ||
                    collegeUniversityValue ||
                    user.collegeUniversity ||
                    t("profile.notSpecified")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* OPTIONAL Section Toggle - 18+ Only */}
        {!isUnder18(user.dateOfBirth) && !showOptionalSection && (
          <div className="mt-6 mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOptionalSection(true)}
              className="w-full h-10 text-sm text-gray-600 hover:text-purple-600 border-gray-200 hover:border-purple-300 dark:text-gray-400 dark:hover:text-purple-400 dark:border-gray-700 dark:hover:border-purple-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t("profile.showOptionalFields")}
            </Button>
          </div>
        )}

        {/* OPTIONAL Section - 18+ Only */}
        {!isUnder18(user.dateOfBirth) && showOptionalSection && (
          <div id="optional-section" className="mt-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-300 flex items-center">
                <Settings className="h-4 w-4 mr-2 text-pink-500" />
                {t("profile.optionalSection")}
                <span className="text-xs font-normal ml-2 opacity-70">
                  {t("profile.personalDetails")}
                </span>
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowOptionalSection(false)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Clarifying description */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {t("profile.personalDetailsDescription")}
              </p>
            </div>

            <div className="space-y-4">
              {/* Children Fields - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* {t('profile.haveChildren')} */}
                <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-3">
                  <div className="mb-2">
                    <h3 className="text-xs font-medium text-purple-800 dark:text-purple-300 flex items-center">
                      <Baby className="h-3 w-3 mr-1 text-pink-500" />
                      {t("profile.haveChildren")}
                    </h3>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={
                        hasChildrenValue === "yes" ? "default" : "outline"
                      }
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (hasChildrenValue === "yes") {
                          setHasChildrenValue("");
                          await handleProfileUpdate({ hasChildren: null });
                        } else {
                          setHasChildrenValue("yes");
                          await handleProfileUpdate({ hasChildren: "yes" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        hasChildrenValue === "yes"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        hasChildrenValue === "no" ? "default" : "outline"
                      }
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (hasChildrenValue === "no") {
                          setHasChildrenValue("");
                          await handleProfileUpdate({ hasChildren: null });
                        } else {
                          setHasChildrenValue("no");
                          await handleProfileUpdate({ hasChildren: "no" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        hasChildrenValue === "no"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.no")}
                    </Button>
                  </div>
                </div>

                {/* {t('profile.wantChildren')} */}
                <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-3">
                  <div className="mb-2">
                    <h3 className="text-xs font-medium text-purple-800 dark:text-purple-300 flex items-center">
                      <Heart className="h-3 w-3 mr-1 text-pink-500" />
                      {t("profile.wantChildren")}
                    </h3>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={
                        wantsChildrenValue === "yes" ? "default" : "outline"
                      }
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (wantsChildrenValue === "yes") {
                          setWantsChildrenValue("");
                          await handleProfileUpdate({ wantsChildren: null });
                        } else {
                          setWantsChildrenValue("yes");
                          await handleProfileUpdate({ wantsChildren: "yes" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        wantsChildrenValue === "yes"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        wantsChildrenValue === "no" ? "default" : "outline"
                      }
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (wantsChildrenValue === "no") {
                          setWantsChildrenValue("");
                          await handleProfileUpdate({ wantsChildren: null });
                        } else {
                          setWantsChildrenValue("no");
                          await handleProfileUpdate({ wantsChildren: "no" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        wantsChildrenValue === "no"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.no")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* {t('profile.smoking')} and {t('profile.drinking')} Fields - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* {t('profile.smoking')} */}
                <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-3">
                  <div className="mb-2">
                    <h3 className="text-xs font-medium text-purple-800 dark:text-purple-300 flex items-center">
                      <Coffee className="h-3 w-3 mr-1 text-pink-500" />
                      {t("profile.smoking")}
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={smokingValue === "yes" ? "default" : "outline"}
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (smokingValue === "yes") {
                          setSmokingValue("");
                          await handleProfileUpdate({ smoking: null });
                        } else {
                          setSmokingValue("yes");
                          await handleProfileUpdate({ smoking: "yes" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        smokingValue === "yes"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={smokingValue === "no" ? "default" : "outline"}
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (smokingValue === "no") {
                          setSmokingValue("");
                          await handleProfileUpdate({ smoking: null });
                        } else {
                          setSmokingValue("no");
                          await handleProfileUpdate({ smoking: "no" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        smokingValue === "no"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.no")}
                    </Button>
                  </div>
                </div>

                {/* {t('profile.drinking')} */}
                <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-3">
                  <div className="mb-2">
                    <h3 className="text-xs font-medium text-purple-800 dark:text-purple-300 flex items-center">
                      <Coffee className="h-3 w-3 mr-1 text-pink-500" />
                      {t("profile.drinking")}
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={drinkingValue === "yes" ? "default" : "outline"}
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (drinkingValue === "yes") {
                          setDrinkingValue("");
                          await handleProfileUpdate({ drinking: null });
                        } else {
                          setDrinkingValue("yes");
                          await handleProfileUpdate({ drinking: "yes" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        drinkingValue === "yes"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={drinkingValue === "no" ? "default" : "outline"}
                      onClick={async () => {
                        // Toggle functionality: if already selected, deselect (set to null)
                        if (drinkingValue === "no") {
                          setDrinkingValue("");
                          await handleProfileUpdate({ drinking: null });
                        } else {
                          setDrinkingValue("no");
                          await handleProfileUpdate({ drinking: "no" });
                        }
                      }}
                      className={`flex-1 h-7 text-xs px-2 ${
                        drinkingValue === "no"
                          ? "bg-purple-500 hover:bg-purple-600 text-white"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("common.no")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* {t('profile.bodyType')} */}
              <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                    <Scale className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    {t("profile.bodyType")}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("bodyType")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {editField === "bodyType" ? (
                  <div className="mt-2">
                    <Select
                      value={bodyTypeValue}
                      onValueChange={setBodyTypeValue}
                    >
                      <SelectTrigger className="text-xs border-pink-200">
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slim">Slim</SelectItem>
                        <SelectItem value="athletic">Athletic</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="curvy">Curvy</SelectItem>
                        <SelectItem value="plus_sized">Plus Sized</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveField("bodyType", true)}
                        className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                      >
                        <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                        {t("profile.clear")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveField("bodyType")}
                        className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                      >
                        {t("profile.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1">
                    {bodyTypeValue
                      ? bodyTypeValue
                          .replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())
                      : t("profile.notSpecified")}
                  </p>
                )}
              </div>

              {/* Height - Below {t('profile.bodyType')} */}
              <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                    <Ruler className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    {t("profile.height")}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("height")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {editField === "height" ? (
                  <div className="mt-2">
                    <div className="space-y-3">
                      <div className="text-center">
                        <span className="text-lg font-medium text-purple-600">
                          {formatHeight(heightValue[0])}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({heightValue[0]} cm)
                        </span>
                      </div>
                      <Slider
                        value={heightValue}
                        onValueChange={setHeightValue}
                        min={122} // 4'0"
                        max={213} // 7'0"
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>4'0"</span>
                        <span>7'0"</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveField("height", true)}
                        className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
                      >
                        <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                        {t("profile.clear")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveField("height")}
                        className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                      >
                        {t("profile.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1">
                    {user.height
                      ? formatHeight(user.height)
                      : t("profile.notSpecified")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deactivate Profile Dialog */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <DialogContent
          className="w-[80vw] max-w-[280px] p-4 bg-gradient-to-br from-white/98 via-red-50/95 to-pink-50/98 dark:from-slate-900/98 dark:via-red-950/95 dark:to-pink-950/98 backdrop-blur-2xl border-2 border-red-300/40 dark:border-red-700/40 shadow-2xl rounded-2xl overflow-hidden"
          hideCloseButton
        >
          {/* Enhanced floating orbs with shimmer effect */}
          <div className="absolute -top-12 -left-12 w-20 h-20 bg-gradient-to-r from-red-400 via-pink-400 to-rose-500 rounded-full opacity-25 blur-2xl animate-pulse"></div>
          <div
            className="absolute -bottom-8 -right-8 w-16 h-16 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 rounded-full opacity-30 blur-xl animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>
          <div
            className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full opacity-20 blur-lg animate-pulse"
            style={{ animationDelay: "3s" }}
          ></div>

          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse opacity-50"
            style={{ animationDuration: "3s" }}
          ></div>

          <div className="relative z-10">
            <DialogHeader className="pb-2 text-center">
              <DialogTitle className="text-base font-bold bg-gradient-to-r from-red-600 via-red-700 to-pink-600 dark:from-red-400 dark:via-red-500 dark:to-pink-400 bg-clip-text text-transparent flex items-center justify-center gap-1.5">
                <div className="p-1 rounded-full bg-gradient-to-r from-red-200 to-pink-200 dark:from-red-800/60 dark:to-pink-800/60 shadow-inner">
                  <Trash2 className="h-3.5 w-3.5 text-red-700 dark:text-red-300" />
                </div>
                Deactivate MEET Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2.5">
              <p className="text-xs text-gray-700 dark:text-gray-300 text-center font-medium">
                This action will:
              </p>

              <div className="bg-gradient-to-r from-red-100/80 via-red-50/90 to-pink-50/80 dark:from-red-900/40 dark:via-red-950/50 dark:to-pink-950/40 border border-red-300/50 dark:border-red-700/40 rounded-xl p-2.5 space-y-1 shadow-inner">
                <div className="flex items-center gap-1.5 text-[10px] text-red-800 dark:text-red-200 font-medium">
                  <div className="w-1 h-1 bg-red-600 rounded-full shadow-sm"></div>
                  Remove from discovery
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-red-800 dark:text-red-200 font-medium">
                  <div className="w-1 h-1 bg-red-600 rounded-full shadow-sm"></div>
                  Hide from other users
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-red-800 dark:text-red-200 font-medium">
                  <div className="w-1 h-1 bg-red-600 rounded-full shadow-sm"></div>
                  Disable account features
                </div>
              </div>

              <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center font-medium opacity-80">
                Reactivate anytime on the MEET Discover page
              </p>
            </div>

            <DialogFooter className="flex gap-1.5 pt-3 mt-1">
              <Button
                variant="outline"
                onClick={() => setShowDeactivateDialog(false)}
                className="flex-1 h-8 bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 border-gray-400/60 dark:border-gray-500/60 text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Start deactivation and close dialog immediately for faster UX
                  deactivateProfileMutation.mutate();
                  setShowDeactivateDialog(false);
                }}
                className="flex-1 h-8 bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Deactivate
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
