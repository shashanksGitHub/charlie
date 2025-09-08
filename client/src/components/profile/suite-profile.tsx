import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/hooks/use-language";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { debounce } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CityInput } from "@/components/ui/city-input";
import { HighSchoolSearch } from "@/components/ui/high-school-search";
import { UniversitySearch } from "@/components/ui/university-search";
import { useSharedHighSchool } from "@/hooks/use-shared-high-school";
import { useSharedCollegeUniversity } from "@/hooks/use-shared-college-university";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPicture } from "@/components/ui/user-picture";
import SuiteProfileBuilder from "@/components/suite/suite-profile-builder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExpandableSwipeCardModal } from "@/components/ui/expandable-swipe-card-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Briefcase,
  Users,
  Network,
  Edit,
  Sparkles,
  X,
  Check,
  Save,
  Calendar,
  MapPin,
  Globe,
  Heart,
  Camera,
  Loader2,
  Star,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  Building,
  TrendingUp,
  Target,
  MessageCircle,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Trophy,
  Code,
  DollarSign,
  Banknote,
  Link,
  Mail,
  Shield,
} from "lucide-react";
import { User } from "@shared/schema";
import { SectionPhotoManager } from "./section-photo-manager";
import {
  useSectionPhotos,
  useSectionPrimaryPhotoUrls,
} from "@/hooks/user-section-photos";
import { ProfileSection } from "@/services/section-photo-service";
import {
  ProfilePhotoButton,
  ProfilePhotoEditButton,
} from "./profile-photo-button";
import { isUnder18 } from "@/lib/age-utils";

interface SuiteProfileProps {
  user: User;
}

interface JobProfileFormData {
  role?: "job-seeker" | "recruiter";
  jobTitle?: string;
  company?: string;
  description?: string;
  compensation?: string;
  compensationCurrency?: string;
  compensationPeriod?: string;
  salary?: string;
  salaryCurrency?: string;
  salaryPeriod?: string;
  requirements?: string;
  location?: string;
  workType?: "Remote" | "In-person" | "Hybrid";
  jobType?: "Full-time" | "Part-time" | "Contract" | "Internship";
  experienceLevel?: "Entry" | "Mid" | "Senior" | "Executive";
  areasOfExpertise?: string;
  whyItMatters?: string;
  whoShouldApply?: string;
  culturalFit?: string;
  industryTags?: string[];
  skillTags?: string[];
  applicationUrl?: string;
  applicationEmail?: string;
  applicationInstructions?: string;
}

// Add job field visibility interface
interface JobFieldVisibility {
  showProfilePhoto: boolean;
  role: boolean;
  jobTitle: boolean;
  company: boolean;
  description: boolean;
  compensation: boolean;
  salary: boolean;
  location: boolean;
  workType: boolean;
  jobType: boolean;
  experienceLevel: boolean;
  areasOfExpertise: boolean;
  whyItMatters: boolean;
  whoShouldApply: boolean;
  industryTags: boolean;
  skillTags: boolean;
  applicationUrl: boolean;
  applicationEmail: boolean;
  [key: string]: boolean;
}

// Add mentorship field visibility interface
interface MentorshipFieldVisibility {
  showProfilePhoto: boolean;
  professionalTagline: boolean;
  role: boolean;
  timeCommitment: boolean;
  availability: boolean;
  timezone: boolean;
  location: boolean;
  languagesSpoken: boolean;
  // Mentor-specific fields
  areasOfExpertise: boolean;
  mentorshipStyle: boolean;
  whyMentor: boolean;
  industriesOrDomains: boolean;
  // Mentee-specific fields
  learningGoals: boolean;
  whySeekMentorship: boolean;
  preferredMentorshipStyle: boolean;
  industryAspiration: boolean;
  highSchool: boolean;
  collegeUniversity: boolean;
  [key: string]: boolean;
}

// Add networking field visibility interface
interface NetworkingFieldVisibility {
  showProfilePhoto: boolean;
  showNetworkingPhotos: boolean;
  // Essential Fields
  professionalTagline: boolean;
  currentRole: boolean;
  currentCompany: boolean;
  industry: boolean;
  workplace: boolean;
  experienceYears: boolean;
  lookingFor: boolean;
  canOffer: boolean;
  workingStyle: boolean;
  professionalInterests: boolean;
  networkingGoals: boolean;
  lightUpWhenTalking: boolean;

  // Advanced/Optional Fields
  languagesSpoken: boolean;
  openToCollaborateOn: boolean;
  preferredNetworkingFormat: boolean;
  signatureAchievement: boolean;
  timezone: boolean;
  location: boolean;
  highSchool: boolean;
  collegeUniversity: boolean;
  [key: string]: boolean;
}

interface MentorshipProfileFormData {
  role?: "mentor" | "mentee";
  professionalTagline?: string;
  // Common fields
  timeCommitment?:
    | "Light (1-2 hrs/month)"
    | "Regular (3-5 hrs/month)"
    | "Intensive (5+ hrs/month)";
  availability?: string;
  location?: string;
  languagesSpoken?: string[];

  // Mentor-specific fields
  areasOfExpertise?: string[];
  mentorshipStyle?: string;
  whyMentor?: string;
  industriesOrDomains?: string[];

  // Mentee-specific fields
  learningGoals?: string[];
  whySeekMentorship?: string;
  preferredMentorshipStyle?: string;
  industryAspiration?: string;
  highSchool?: string;
  collegeUniversity?: string;
}

interface NetworkingProfileFormData {
  // Essential Fields
  professionalTagline?: string;
  currentRole?: string;
  currentCompany?: string;
  industry?: string;
  workplace?: string;
  experienceYears?: string;
  lookingFor?: string;
  canOffer?: string;
  workingStyle?: string;
  professionalInterests?: string[];
  networkingGoals?: string[];
  lightUpWhenTalking?: string;

  // Advanced/Optional Fields
  languagesSpoken?: string[];
  openToCollaborateOn?: string[];
  preferredNetworkingFormat?: string[];
  signatureAchievement?: string;
  timezone?: string;
  location?: string;
  highSchool?: string;
  collegeUniversity?: string;
}

export default function SuiteProfile({ user }: SuiteProfileProps) {
  const {
    value: sharedHighSchool,
    setValue: setSharedHighSchool,
    initialize: initSharedHighSchool,
  } = useSharedHighSchool();
  const {
    value: sharedCollege,
    setValue: setSharedCollege,
    initialize: initSharedCollege,
  } = useSharedCollegeUniversity();
  // Track which profile section was last updated for dynamic photo display
  const [lastUpdatedSection, setLastUpdatedSection] = useState<
    "job" | "mentorship" | "networking" | null
  >(null);

  // Section-specific photo management
  const jobPhotos = useSectionPhotos("job");
  const mentorshipPhotos = useSectionPhotos("mentorship");
  const networkingPhotos = useSectionPhotos("networking");

  // Calculate primary URLs for each section independently
  const jobPrimaryUrls = useSectionPrimaryPhotoUrls(jobPhotos.photos);
  const mentorshipPrimaryUrls = useSectionPrimaryPhotoUrls(
    mentorshipPhotos.photos,
  );
  const networkingPrimaryUrls = useSectionPrimaryPhotoUrls(
    networkingPhotos.photos,
  );

  // Combine all primary URLs into a single object for easier access
  const primaryUrls = {
    job: jobPrimaryUrls.job,
    mentorship: mentorshipPrimaryUrls.mentorship,
    networking: networkingPrimaryUrls.networking,
    meet: jobPrimaryUrls.meet, // Keep meet from job photos for consistency
  };

  // Function to determine which photo to display in top-left circle
  const getDisplayPhoto = () => {
    // If a section was recently updated, use its primary photo
    if (lastUpdatedSection) {
      const sectionPhoto = primaryUrls[lastUpdatedSection];
      if (sectionPhoto) {
        return sectionPhoto;
      }
    }

    // Fallback priority: job -> mentorship -> networking -> user photo
    return (
      primaryUrls.job ||
      primaryUrls.mentorship ||
      primaryUrls.networking ||
      user.photoUrl
    );
  };

  // Debug logging
  console.log("SUITE-PROFILE: Section photos debug:", {
    jobPhotos: jobPhotos.photos,
    mentorshipPhotos: mentorshipPhotos.photos,
    networkingPhotos: networkingPhotos.photos,
    primaryUrls,
    lastUpdatedSection,
    displayPhoto: getDisplayPhoto(),
    jobPrimaryUrl: primaryUrls.job,
    mentorshipPrimaryUrl: primaryUrls.mentorship,
    networkingPrimaryUrl: primaryUrls.networking,
  });

  const { darkMode } = useDarkMode();
  const [, setLocation] = useLocation();
  const [showProfileBuilder, setShowProfileBuilder] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobFormData, setJobFormData] = useState<JobProfileFormData>({});

  // Currency state for compensation field
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedPeriod, setSelectedPeriod] = useState("/year");

  // Currency mapping with country flags and common currencies
  const currencyOptions = [
    { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar" },
    { code: "GHS", symbol: "₵", flag: "🇬🇭", name: "Ghana Cedi" },
    { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro" },
    { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound" },
    { code: "CAD", symbol: "C$", flag: "🇨🇦", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar" },
    { code: "NGN", symbol: "₦", flag: "🇳🇬", name: "Nigerian Naira" },
    { code: "KES", symbol: "KSh", flag: "🇰🇪", name: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R", flag: "🇿🇦", name: "South African Rand" },
    { code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen" },
    { code: "CHF", symbol: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
    { code: "SEK", symbol: "kr", flag: "🇸🇪", name: "Swedish Krona" },
    { code: "NOK", symbol: "kr", flag: "🇳🇴", name: "Norwegian Krone" },
    { code: "DKK", symbol: "kr", flag: "🇩🇰", name: "Danish Krone" },
  ];

  // Function to get default currency based on user's country of origin
  const getDefaultCurrency = (countryOfOrigin: string): string => {
    const countryToCurrency: { [key: string]: string } = {
      Ghana: "GHS",
      Nigeria: "NGN",
      Kenya: "KES",
      "South Africa": "ZAR",
      "United States": "USD",
      Canada: "CAD",
      "United Kingdom": "GBP",
      Australia: "AUD",
      Japan: "JPY",
      Switzerland: "CHF",
      Sweden: "SEK",
      Norway: "NOK",
      Denmark: "DKK",
    };

    return countryToCurrency[countryOfOrigin] || "USD";
  };

  // Set default currency based on user's country when component mounts
  useEffect(() => {
    if (user?.countryOfOrigin) {
      const defaultCurrency = getDefaultCurrency(user.countryOfOrigin);
      setSelectedCurrency(defaultCurrency);
      // Also update the form data with the default currency
      setJobFormData((prev) => ({
        ...prev,
        compensationCurrency: defaultCurrency,
      }));
    }
  }, [user?.countryOfOrigin]);

  // Update form data when currency changes
  useEffect(() => {
    setJobFormData((prev) => ({
      ...prev,
      compensationCurrency: selectedCurrency,
    }));
  }, [selectedCurrency]);

  // Update form data when period changes
  useEffect(() => {
    setJobFormData((prev) => ({
      ...prev,
      compensationPeriod: selectedPeriod,
    }));
  }, [selectedPeriod]);

  // Add job field visibility state
  const [jobFieldVisibility, setJobFieldVisibility] =
    useState<JobFieldVisibility>(() => {
      // Initialize with default visibility for fields that are commonly shown
      return {
        showProfilePhoto: false,
        role: true,
        jobTitle: true,
        company: true,
        description: true,
        compensation: true,
        salary: true,
        location: true,
        workType: true,
        jobType: true,
        experienceLevel: true,
        areasOfExpertise: true,
        whyItMatters: true,
        whoShouldApply: true,
        industryTags: true,
        skillTags: true,
        applicationUrl: true,
        applicationEmail: true,
      };
    });

  const [showMentorshipForm, setShowMentorshipForm] = useState(false);
  const [showMentorshipDialog, setShowMentorshipDialog] = useState(false);
  const [mentorshipFormData, setMentorshipFormData] =
    useState<MentorshipProfileFormData>({});

  // Delete dialog states
  const [showDeleteMentorshipDialog, setShowDeleteMentorshipDialog] =
    useState(false);
  const [showDeleteNetworkingDialog, setShowDeleteNetworkingDialog] =
    useState(false);
  const [showDeleteJobDialog, setShowDeleteJobDialog] = useState(false);
  const [mentorshipRoleToDelete, setMentorshipRoleToDelete] = useState<
    string | undefined
  >();

  // Custom input dialog states
  const [showCustomExpertiseDialog, setShowCustomExpertiseDialog] =
    useState(false);
  const [customExpertiseInput, setCustomExpertiseInput] = useState("");

  // Function to handle custom expertise submission
  const handleCustomExpertiseSubmit = () => {
    if (customExpertiseInput && customExpertiseInput.trim()) {
      const currentExpertise = mentorshipFormData.areasOfExpertise || [];
      if (!currentExpertise.includes(customExpertiseInput.trim())) {
        handleMentorshipInputChange("areasOfExpertise", [
          ...currentExpertise,
          customExpertiseInput.trim(),
        ]);
      }
      setCustomExpertiseInput("");
      setShowCustomExpertiseDialog(false);
    }
  };

  // Add mentorship field visibility state with proper defaults
  const [mentorshipFieldVisibility, setMentorshipFieldVisibility] =
    useState<MentorshipFieldVisibility>({
      showProfilePhoto: true,
      professionalTagline: true,
      role: true,
      timeCommitment: true,
      availability: true,
      timezone: true,
      location: true,
      languagesSpoken: true,
      // Mentor-specific fields
      areasOfExpertise: true,
      mentorshipStyle: true,
      whyMentor: true,
      industriesOrDomains: true,
      // Mentee-specific fields
      learningGoals: true,
      whySeekMentorship: true,
      preferredMentorshipStyle: true,
      industryAspiration: true,
      highSchool: true,
      collegeUniversity: true,
    });

  const [showNetworkingForm, setShowNetworkingForm] = useState(false);
  const [networkingFormData, setNetworkingFormData] =
    useState<NetworkingProfileFormData>({});

  // Add networking field visibility state
  const [networkingFieldVisibility, setNetworkingFieldVisibility] =
    useState<NetworkingFieldVisibility>({
      showProfilePhoto: false,
      showNetworkingPhotos: true,
      // Essential Fields
      professionalTagline: true,
      currentRole: true,
      currentCompany: true,
      industry: true,
      workplace: true,
      experienceYears: true,
      lookingFor: true,
      canOffer: true,
      workingStyle: true,
      professionalInterests: true,
      networkingGoals: true,
      lightUpWhenTalking: true,

      // Advanced/Optional Fields
      languagesSpoken: true,
      openToCollaborateOn: true,
      preferredNetworkingFormat: true,
      signatureAchievement: true,
      timezone: true,
      location: true,
      highSchool: true,
      collegeUniversity: true,
    });
  const [showJobPreview, setShowJobPreview] = useState(false);
  const [showMentorshipPreview, setShowMentorshipPreview] = useState(false);
  const [showNetworkingPreview, setShowNetworkingPreview] = useState(false);

  // Add inline preview state for networking section
  const [showNetworkingInlinePreview, setShowNetworkingInlinePreview] =
    useState(false);

  // Add inline preview states for job and mentorship sections
  const [showJobInlinePreview, setShowJobInlinePreview] = useState(false);
  const [showMentorshipInlinePreview, setShowMentorshipInlinePreview] =
    useState(false);

  // Expandable profile picture modal state
  const [showExpandableModal, setShowExpandableModal] = useState(false);

  // Dialog state variables
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showNetworkingDialog, setShowNetworkingDialog] = useState(false);
  const [showCustomIndustryDialog, setShowCustomIndustryDialog] =
    useState(false);
  const [customIndustryInput, setCustomIndustryInput] = useState("");
  const [customIndustryContext, setCustomIndustryContext] = useState<
    "networking" | "mentorship"
  >("networking");

  const { toast } = useToast();

  // Time period options for compensation (after translate is available)
  const periodOptions = [
    { value: "/hour", label: t("suite.profile.periodOptions.hour") },
    { value: "/day", label: t("suite.profile.periodOptions.day") },
    { value: "/month", label: t("suite.profile.periodOptions.month") },
    { value: "/year", label: t("suite.profile.periodOptions.year") },
  ];

  // Fetch SUITE profile settings
  const { data: profileSettings, isLoading: isLoadingProfileSettings } =
    useQuery({
      queryKey: ["/api/suite/profile-settings"],
      queryFn: async () => {
        try {
          const response = await apiRequest("/api/suite/profile-settings");
          return await response.json();
        } catch (error) {
          console.warn("No SUITE profile settings found", error);
          return null;
        }
      },
    });

  // Fetch SUITE profiles
  const { data: jobProfile } = useQuery({
    queryKey: ["/api/suite/job-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/job-profile");
        return await response.json();
      } catch (error) {
        console.warn("No job profile found", error);
        return null;
      }
    },
  });

  const { data: mentorshipProfiles } = useQuery({
    queryKey: ["/api/suite/mentorship-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/mentorship-profile");
        const result = await response.json();
        // Handle both single profile (old format) and array (new format)
        return Array.isArray(result) ? result : result ? [result] : [];
      } catch (error) {
        console.warn("No mentorship profile found", error);
        return [];
      }
    },
  });

  // Get the primary mentorship profile for preview (use most recently updated)
  const mentorshipProfile =
    mentorshipProfiles?.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )?.[0] || null;

  const { data: networkingProfile, isLoading: isLoadingNetworkingProfile } =
    useQuery({
      queryKey: ["/api/suite/networking-profile"],
      queryFn: async () => {
        try {
          const response = await apiRequest("/api/suite/networking-profile");
          return await response.json();
        } catch (error) {
          console.warn("No networking profile found", error);
          return null;
        }
      },
    });

  // Check URL parameters for auto-opening dialogs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("openNetworking") === "true") {
      // Load existing data if available, otherwise initialize with user photo
      if (networkingProfile) {
        setNetworkingFormData(networkingProfile);
        if (networkingProfile.highSchool)
          initSharedHighSchool(networkingProfile.highSchool);
      } else if (user?.photoUrl) {
        // If user has a photo in their profile, it will be pre-loaded in the dialog
        console.log(
          "Auto-opening networking dialog with user photo pre-loading",
        );
      }
      // Auto-open networking dialog
      setShowNetworkingDialog(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, "", window.location.pathname);
    } else if (urlParams.get("openMentorship") === "true") {
      // Load existing mentorship data if available
      if (mentorshipProfiles && mentorshipProfiles.length > 0) {
        setMentorshipFormData(mentorshipProfiles[0]);
        if (mentorshipProfiles[0]?.highSchool)
          initSharedHighSchool(mentorshipProfiles[0].highSchool);
      } else if (user?.photoUrl) {
        // If user has a photo in their profile, it will be pre-loaded in the dialog
        console.log(
          "Auto-opening mentorship dialog with user photo pre-loading",
        );
      }
      // Auto-open mentorship dialog
      setShowMentorshipDialog(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, "", window.location.pathname);
    } else if (urlParams.get("openJob") === "true") {
      // Load existing job data if available
      if (jobProfile) {
        setJobFormData(jobProfile);
      } else if (user?.photoUrl) {
        // If user has a photo in their profile, it will be pre-loaded in the dialog
        console.log("Auto-opening job dialog with user photo pre-loading");
      }
      // Auto-open job dialog
      setShowJobDialog(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [networkingProfile, mentorshipProfiles, jobProfile, user]);

  // DISABLED: Legacy field visibility system for Job profiles - conflicts with JSON persistence
  // Job profiles now use JSON-based visibility preferences in the profile record itself
  // const { data: jobFieldVisibilityData } = useQuery({
  //   queryKey: ["/api/suite/field-visibility/job"],
  //   queryFn: async () => {
  //     try {
  //       const response = await apiRequest("/api/suite/field-visibility/job");
  //       return await response.json();
  //     } catch (error) {
  //       console.warn("No job field visibility settings found", error);
  //       return [];
  //     }
  //   },
  // });

  const { data: mentorshipFieldVisibilityData } = useQuery({
    queryKey: ["/api/suite/field-visibility/mentorship"],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "/api/suite/field-visibility/mentorship",
        );
        return await response.json();
      } catch (error) {
        console.warn("No mentorship field visibility settings found", error);
        return [];
      }
    },
  });

  const { data: networkingFieldVisibilityData } = useQuery({
    queryKey: ["/api/suite/field-visibility/networking"],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "/api/suite/field-visibility/networking",
        );
        return await response.json();
      } catch (error) {
        console.warn("No networking field visibility settings found", error);
        return [];
      }
    },
  });

  // Helper function to convert field visibility array to object
  const convertFieldVisibilityArrayToObject = (
    visibilityData: any,
    defaultVisibility: any,
  ) => {
    // Handle case where no field visibility data exists (empty object or null/undefined)
    if (
      !visibilityData ||
      typeof visibilityData !== "object" ||
      Object.keys(visibilityData).length === 0 ||
      !Array.isArray(visibilityData)
    ) {
      return defaultVisibility;
    }

    const visibilityObject = { ...defaultVisibility };
    visibilityData.forEach((item: any) => {
      if (item.fieldName) {
        visibilityObject[item.fieldName] = item.isVisible;
      }
    });

    return visibilityObject;
  };

  // DISABLED: Legacy field visibility loading for Job profiles - conflicts with JSON persistence
  // Job profiles now use JSON-based visibility preferences loaded from jobProfile.visibilityPreferences
  // useEffect(() => {
  //   if (jobFieldVisibilityData) {
  //     const defaultJobVisibility = {
  //       showProfilePhoto: true,
  //       role: true,
  //       jobTitle: true,
  //       company: true,
  //       description: true,
  //       compensation: true,
  //       salary: true,
  //       location: true,
  //       workType: true,
  //       jobType: true,
  //       experienceLevel: true,
  //       areasOfExpertise: true,
  //       whyItMatters: true,
  //       whoShouldApply: true,
  //       industryTags: true,
  //       skillTags: true,
  //       applicationUrl: true,
  //       applicationEmail: true,
  //     };

  //     const convertedVisibility = convertFieldVisibilityArrayToObject(
  //       jobFieldVisibilityData,
  //       defaultJobVisibility,
  //     );
  //     setJobFieldVisibility(convertedVisibility);
  //   }
  // }, [jobFieldVisibilityData]);

  // Note: Removed the mentorshipFieldVisibilityData useEffect to avoid conflicts
  // Mentorship profiles now use JSON column persistence like networking profiles

  // DISABLED: Legacy networking field visibility system that conflicts with JSON-based persistence
  // This useEffect was overriding the education field toggles causing them to reset after refresh
  // useEffect(() => {
  //   if (networkingFieldVisibilityData) {
  //     const defaultNetworkingVisibility = {
  //       showProfilePhoto: true,
  //       showNetworkingPhotos: true,
  //       professionalTagline: true,
  //       currentRole: true,
  //       industry: true,
  //       workplace: true,
  //       experienceYears: true,
  //       lookingFor: true,
  //       canOffer: true,
  //       workingStyle: true,
  //       professionalInterests: true,
  //       networkingGoals: true,
  //       lightUpWhenTalking: true,
  //       languagesSpoken: true,
  //       openToCollaborateOn: true,
  //       preferredNetworkingFormat: true,
  //       signatureAchievement: true,
  //       timezone: true,
  //       location: true,
  //     };

  //     const convertedVisibility = convertFieldVisibilityArrayToObject(
  //       networkingFieldVisibilityData,
  //       defaultNetworkingVisibility,
  //     );
  //     setNetworkingFieldVisibility(convertedVisibility);
  //   }
  // }, [networkingFieldVisibilityData]);

  // Load saved visibility preferences from networking profile JSON field
  useEffect(() => {
    console.log("Networking profile useEffect triggered:", {
      hasNetworkingProfile: !!networkingProfile,
      hasVisibilityPreferences: !!networkingProfile?.visibilityPreferences,
      visibilityPreferences: networkingProfile?.visibilityPreferences,
    });

    if (networkingProfile?.visibilityPreferences) {
      try {
        const savedVisibility = JSON.parse(
          networkingProfile.visibilityPreferences,
        );
        console.log(
          "Loading saved networking visibility preferences:",
          savedVisibility,
        );
        setNetworkingFieldVisibility(savedVisibility);
      } catch (error) {
        console.error(
          "Error parsing networking visibility preferences:",
          error,
        );
        // Keep existing visibility preferences if parsing fails
      }
    } else {
      console.log(
        "No networking profile visibility preferences found, using defaults",
      );
    }
  }, [networkingProfile]);

  // Load saved visibility preferences from job profile JSON field
  useEffect(() => {
    if (jobProfile?.visibilityPreferences) {
      try {
        const savedVisibility = JSON.parse(jobProfile.visibilityPreferences);
        console.log(
          "Loading saved job visibility preferences:",
          savedVisibility,
        );
        setJobFieldVisibility(savedVisibility);
      } catch (error) {
        console.error("Error parsing job visibility preferences:", error);
        // Keep existing visibility preferences if parsing fails
      }
    }
  }, [jobProfile]);

  // Load saved visibility preferences from mentorship profile JSON field
  useEffect(() => {
    console.log("Mentorship profile useEffect triggered:", {
      hasMentorshipProfile: !!mentorshipProfile,
      hasVisibilityPreferences: !!mentorshipProfile?.visibilityPreferences,
      visibilityPreferences: mentorshipProfile?.visibilityPreferences,
      currentVisibilityState: mentorshipFieldVisibility,
    });

    if (mentorshipProfile?.visibilityPreferences) {
      try {
        const savedVisibility = JSON.parse(
          mentorshipProfile.visibilityPreferences,
        );
        console.log(
          "Loading saved mentorship visibility preferences:",
          savedVisibility,
        );
        console.log(
          "Previous mentorship visibility state:",
          mentorshipFieldVisibility,
        );
        // Force state update with a functional update to ensure React processes it
        setMentorshipFieldVisibility((prevState) => {
          console.log("Functional state update - previous:", prevState);
          console.log("Functional state update - new:", savedVisibility);
          return savedVisibility;
        });

        console.log(
          "After setMentorshipFieldVisibility call - this should trigger re-render",
        );
      } catch (error) {
        console.error(
          "Error parsing mentorship visibility preferences:",
          error,
        );
        // Keep existing visibility preferences if parsing fails
      }
    } else if (mentorshipProfile) {
      // If no JSON preferences exist, use the new defaults (with location: true)
      const defaultMentorshipVisibility: MentorshipFieldVisibility = {
        showProfilePhoto: false,
        professionalTagline: true,
        role: true,
        timeCommitment: true,
        availability: true,
        timezone: true,
        location: true, // Fixed: Set to true by default
        languagesSpoken: true,
        areasOfExpertise: true,
        mentorshipStyle: true,
        whyMentor: true,
        industriesOrDomains: true,
        learningGoals: true,
        whySeekMentorship: true,
        preferredMentorshipStyle: true,
        industryAspiration: true,
        highSchool: true,
        collegeUniversity: true,
      };
      console.log(
        "Using default mentorship visibility preferences (no JSON found):",
        defaultMentorshipVisibility,
      );
      setMentorshipFieldVisibility(defaultMentorshipVisibility);
    } else {
      console.log(
        "No mentorship profile found, keeping current visibility state",
      );
    }
  }, [mentorshipProfile]);

  // Optimistically reflect shared education fields into networking/mentorship caches so previews update instantly
  useEffect(() => {
    queryClient.setQueryData(["/api/suite/networking-profile"], (prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (typeof sharedHighSchool === "string")
        next.highSchool = sharedHighSchool;
      if (typeof sharedCollege === "string")
        next.collegeUniversity = sharedCollege;
      return next;
    });
    queryClient.setQueryData(["/api/suite/mentorship-profile"], (prev: any) => {
      if (!prev) return prev;
      if (Array.isArray(prev)) {
        return prev.map((p) => ({
          ...p,
          highSchool:
            typeof sharedHighSchool === "string"
              ? sharedHighSchool
              : p.highSchool,
          collegeUniversity:
            typeof sharedCollege === "string"
              ? sharedCollege
              : p.collegeUniversity,
        }));
      }
      const next = { ...prev };
      if (typeof sharedHighSchool === "string")
        next.highSchool = sharedHighSchool;
      if (typeof sharedCollege === "string")
        next.collegeUniversity = sharedCollege;
      return next;
    });
  }, [sharedHighSchool, sharedCollege]);

  // Mutation for saving job profile
  const saveJobProfileMutation = useMutation({
    mutationFn: (data: JobProfileFormData) =>
      apiRequest("/api/suite/job-profile", { method: "POST", data }),
    onSuccess: () => {
      // Job profile saved successfully - no disruptive toast notification needed
      setShowJobForm(false);
      setJobFormData({});
      setLastUpdatedSection("job"); // Set job as last updated section for dynamic photo display
      queryClient.invalidateQueries({ queryKey: ["/api/suite/job-profile"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save job profile",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving job profile visibility preferences as JSON
  const saveJobVisibilityMutation = useMutation({
    mutationFn: async (data: { visibilityPreferences: string }) => {
      console.log("SUITE-PROFILE: Saving job visibility preferences:", data);
      return apiRequest("/api/suite/job-profile", {
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      console.log(
        "SUITE-PROFILE: Job visibility preferences saved successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["/api/suite/job-profile"] });
    },
    onError: (error: any) => {
      console.error(
        "SUITE-PROFILE: Error saving job visibility preferences:",
        error,
      );
      toast({
        title: "Error",
        description: "Failed to save visibility preferences",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving mentorship profile
  const saveMentorshipProfileMutation = useMutation({
    mutationFn: (data: MentorshipProfileFormData) => {
      console.log(
        "SUITE-PROFILE: Saving mentorship profile with visibility preferences",
      );
      console.log("SUITE-PROFILE: Form data:", data);
      console.log(
        "SUITE-PROFILE: Current visibility preferences:",
        mentorshipFieldVisibility,
      );

      // Include visibility preferences in the profile data
      const dataWithVisibility = {
        ...data,
        visibilityPreferences: JSON.stringify(mentorshipFieldVisibility),
      };

      console.log(
        "SUITE-PROFILE: Data with visibility preferences:",
        dataWithVisibility,
      );

      return apiRequest("/api/suite/mentorship-profile", {
        method: "POST",
        data: dataWithVisibility,
      });
    },
    onSuccess: () => {
      // SEAMLESS UX: Removed disruptive "Profile Saved!" toast notification
      // Profile creation now completes instantly without blocking popup interruptions
      setShowMentorshipForm(false);
      setMentorshipFormData({});
      setLastUpdatedSection("mentorship"); // Set mentorship as last updated section for dynamic photo display
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/mentorship-profile"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save mentorship profile",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving networking profile
  const saveNetworkingProfileMutation = useMutation({
    mutationFn: (data: NetworkingProfileFormData) =>
      apiRequest("/api/suite/networking-profile", { method: "POST", data }),
    onSuccess: () => {
      // SEAMLESS UX: Removed disruptive "Profile Saved!" toast notification
      // Profile creation now completes instantly without blocking popup interruptions
      setShowNetworkingForm(false);
      setNetworkingFormData({});
      setLastUpdatedSection("networking"); // Set networking as last updated section for dynamic photo display
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/networking-profile"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save networking profile",
        variant: "destructive",
      });
    },
  });

  // Mutations for saving field visibility
  const saveJobFieldVisibilityMutation = useMutation({
    mutationFn: async (visibilityData: Record<string, boolean>) => {
      const response = await apiRequest("/api/suite/field-visibility/job", {
        method: "PUT",
        data: visibilityData,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        // Return a success message for non-JSON responses
        return { message: "Field visibility updated successfully" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/field-visibility/job"],
      });
      toast({
        title: "Field Visibility Updated",
        description: "Your job profile field visibility has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save field visibility",
        variant: "destructive",
      });
    },
  });

  // Note: Removed saveMentorshipFieldVisibilityMutation - using JSON approach instead

  // Mutation for saving networking visibility preferences immediately (like MEET Profile)
  const saveNetworkingVisibilityMutation = useMutation({
    mutationFn: async (data: { visibilityPreferences: string }) => {
      console.log("Saving networking visibility preferences:", data);
      const response = await apiRequest(`/api/suite/networking-profile`, {
        method: "PATCH",
        data,
      });
      return await response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/networking-profile"],
      });

      // Snapshot the previous value for potential rollback
      const previousProfile = queryClient.getQueryData([
        "/api/suite/networking-profile",
      ]);

      // Optimistically update the profile with new visibility preferences
      queryClient.setQueryData(
        ["/api/suite/networking-profile"],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            visibilityPreferences: variables.visibilityPreferences,
          };
        },
      );

      // Return a context object with the snapshotted value
      return { previousProfile };
    },
    onError: (error: any, newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(
          ["/api/suite/networking-profile"],
          context.previousProfile,
        );
      }
      console.error("Error saving networking visibility:", error);
      toast({
        title: "Error saving visibility preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/networking-profile"],
      });
      console.log("Networking visibility preferences saved successfully");
    },
  });

  // Debounced API call for networking visibility to prevent flickering
  const debouncedSaveNetworkingVisibility = useMemo(
    () =>
      debounce((data: { visibilityPreferences: string }) => {
        saveNetworkingVisibilityMutation.mutate(data);
      }, 150), // Reduced from 300ms to 150ms for more responsive feel
    [saveNetworkingVisibilityMutation],
  );

  // Mutation for saving mentorship visibility preferences immediately (like MEET Profile)
  const saveMentorshipVisibilityMutation = useMutation({
    mutationFn: async (data: {
      visibilityPreferences: string;
      role?: string;
    }) => {
      console.log("Saving mentorship visibility preferences:", data);
      const response = await apiRequest(`/api/suite/mentorship-profile`, {
        method: "PATCH",
        data,
      });
      return await response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/mentorship-profile"],
      });

      // Snapshot the previous value for potential rollback
      const previousProfile = queryClient.getQueryData([
        "/api/suite/mentorship-profile",
      ]);

      // Optimistically update the profile with new visibility preferences
      queryClient.setQueryData(
        ["/api/suite/mentorship-profile"],
        (old: any) => {
          if (!old) return old;
          // Handle both array and single profile formats
          if (Array.isArray(old)) {
            return old.map((profile: any) => ({
              ...profile,
              visibilityPreferences: variables.visibilityPreferences,
            }));
          }
          return {
            ...old,
            visibilityPreferences: variables.visibilityPreferences,
          };
        },
      );

      // Return a context object with the snapshotted value
      return { previousProfile };
    },
    onError: (error: any, newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(
          ["/api/suite/mentorship-profile"],
          context.previousProfile,
        );
      }
      console.error("Error saving mentorship visibility:", error);
      toast({
        title: "Error saving visibility preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/mentorship-profile"],
      });
      console.log("Mentorship visibility preferences saved successfully");
    },
  });

  // Debounced API call for mentorship visibility to prevent flickering
  const debouncedSaveMentorshipVisibility = useMemo(
    () =>
      debounce((data: { visibilityPreferences: string; role?: string }) => {
        saveMentorshipVisibilityMutation.mutate(data);
      }, 150), // Reduced from 300ms to 150ms for more responsive feel
    [saveMentorshipVisibilityMutation],
  );

  // Delete networking profile mutation
  const deleteNetworkingProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/suite/networking-profile", {
        method: "DELETE",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/networking-profile"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
      setNetworkingFormData({});
      setShowNetworkingForm(false);
      setShowNetworkingDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete networking profile",
        variant: "destructive",
      });
    },
  });

  // Delete mentorship profile mutation
  const deleteMentorshipProfileMutation = useMutation({
    mutationFn: async (role?: string) => {
      const params = role ? `?role=${role}` : "";
      const response = await apiRequest(
        `/api/suite/mentorship-profile${params}`,
        {
          method: "DELETE",
        },
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/mentorship-profile"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
      setMentorshipFormData({});
      setShowMentorshipForm(false);
      setShowMentorshipDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete mentorship profile",
        variant: "destructive",
      });
    },
  });

  // Delete job profile mutation
  const deleteJobProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/suite/job-profile", {
        method: "DELETE",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/job-profile"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
      setJobFormData({});
      setShowJobForm(false);
      setShowJobDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job profile",
        variant: "destructive",
      });
    },
  });

  const saveNetworkingFieldVisibilityMutation = useMutation({
    mutationFn: async (visibilityData: Record<string, boolean>) => {
      const response = await apiRequest(
        "/api/suite/field-visibility/networking",
        {
          method: "PUT",
          data: visibilityData,
        },
      );

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        // Return a success message for non-JSON responses
        return { message: "Field visibility updated successfully" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/field-visibility/networking"],
      });
      toast({
        title: "Field Visibility Updated",
        description: "Your networking profile field visibility has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save field visibility",
        variant: "destructive",
      });
    },
  });

  // Fetch user photos
  const { data: userPhotos, isLoading: loadingPhotos } = useQuery<
    Array<{ id: number; photoUrl: string; isPrimary: boolean }>
  >({
    queryKey: [`/api/photos/${user?.id}`],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // File upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced file selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
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
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, WebP, GIF)",
        variant: "destructive",
      });
      if (event.target) event.target.value = "";
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      if (event.target) event.target.value = "";
      return;
    }

    // Read file and upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;
      if (photoUrl) {
        addPhotoMutation.mutate(photoUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      const optimisticPhoto = {
        id: Date.now(),
        userId: user.id,
        photoUrl: photoUrl,
        isPrimary: !userPhotos || userPhotos.length === 0,
        createdAt: new Date().toISOString(),
      };

      // Update UI immediately with optimistic data
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        return [...(old || []), optimisticPhoto];
      });

      try {
        const res = await apiRequest("/api/photos", {
          method: "POST",
          data: {
            photoUrl,
            isPrimary: !userPhotos || userPhotos.length === 0,
          },
        });

        toast({
          title: "Photo added",
          description: "Your photo has been added to your profile",
        });

        return await res.json();
      } catch (error) {
        // Remove optimistic update on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
          return (old || []).filter(
            (photo: any) => photo.id !== optimisticPhoto.id,
          );
        });

        toast({
          title: "Error adding photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
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
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);

      // Optimistically remove photo
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        return (old || []).filter((photo: any) => photo.id !== photoId);
      });

      try {
        await apiRequest(`/api/photos/${photoId}`, { method: "DELETE" });

        return photoId;
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);

        toast({
          title: "Error deleting photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: (deletedPhotoId) => {
      const wasPrimary = userPhotos?.find(
        (photo) => photo.id === deletedPhotoId,
      )?.isPrimary;

      if (wasPrimary) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }

      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
    },
  });

  // Set primary photo mutation
  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);
      const originalUser = queryClient.getQueryData(["/api/user"]);

      // Optimistically update photos
      if (userPhotos) {
        const newPrimaryPhotoUrl = userPhotos.find(
          (photo) => photo.id === photoId,
        )?.photoUrl;

        const updatedPhotos = userPhotos.map((photo) => ({
          ...photo,
          isPrimary: photo.id === photoId,
        }));

        queryClient.setQueryData([`/api/photos/${user?.id}`], updatedPhotos);

        if (newPrimaryPhotoUrl && originalUser) {
          queryClient.setQueryData(["/api/user"], {
            ...originalUser,
            photoUrl: newPrimaryPhotoUrl,
          });
        }
      }

      try {
        const res = await apiRequest(`/api/photos/${photoId}/primary`, {
          method: "PATCH",
        });

        return await res.json();
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);
        queryClient.setQueryData(["/api/user"], originalUser);

        toast({
          title: "Error setting primary photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${user?.id}`],
      });
    },
  });

  // Photo management functions
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(event);
    }
  };

  const handleSetPrimaryPhoto = (photoId: number) => {
    setPrimaryPhotoMutation.mutate(photoId);
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };

  // State for photo management
  const settingPrimaryPhoto = setPrimaryPhotoMutation.isPending;
  const deletingPhotoId = deletePhotoMutation.variables;

  // Helper functions for form handling
  const handleJobInputChange = (
    field: keyof JobProfileFormData,
    value: any,
  ) => {
    setJobFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobArrayInput = (
    field: keyof JobProfileFormData,
    value: string,
  ) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setJobFormData((prev) => ({ ...prev, [field]: items }));
  };

  const handleJobSave = () => {
    saveJobProfileMutation.mutate(jobFormData);
  };

  const handleJobEdit = () => {
    // Load existing data if available
    if (jobProfile) {
      const formData = { ...jobProfile };
      // Prefill location from user's authentication data if not already set
      if (!formData.location && user.location) {
        formData.location = user.location;
      }
      setJobFormData(formData);
    } else {
      // Prefill location from user's authentication data for new profiles
      const initialData: JobProfileFormData = {};
      if (user.location) {
        initialData.location = user.location;
      }
      setJobFormData(initialData);
    }
    setShowJobDialog(true);
  };

  // Add job field visibility toggle function
  const toggleJobFieldVisibility = (field: keyof JobFieldVisibility) => {
    console.log(
      "SUITE-PROFILE: toggleJobFieldVisibility function called with field:",
      field,
    );
    setJobFieldVisibility((prev) => {
      const updated = { ...prev, [field]: !prev[field] };

      console.log(
        `SUITE-PROFILE: Toggling job field visibility for ${field} to ${!prev[field]}`,
      );
      console.log(
        "SUITE-PROFILE: Updated job visibility preferences:",
        updated,
      );

      // Save immediately to database using JSON approach like mentorship profile
      console.log("SUITE-PROFILE: About to trigger saveJobVisibilityMutation");
      console.log(
        "SUITE-PROFILE: Mutation function exists:",
        typeof saveJobVisibilityMutation,
      );
      console.log("SUITE-PROFILE: Data to save:", JSON.stringify(updated));

      try {
        saveJobVisibilityMutation.mutate({
          visibilityPreferences: JSON.stringify(updated),
        });
        console.log("SUITE-PROFILE: Job mutation triggered successfully");
      } catch (error) {
        console.error("SUITE-PROFILE: Error triggering job mutation:", error);
      }

      return updated;
    });
  };

  // Add mentorship field visibility toggle function
  const toggleMentorshipFieldVisibility = (
    field: keyof MentorshipFieldVisibility,
  ) => {
    console.log(
      "SUITE-PROFILE: toggleMentorshipFieldVisibility function called with field:",
      field,
    );

    // Optimistic update with improved state management to prevent flickering
    setMentorshipFieldVisibility((prev) => {
      const updated = { ...prev, [field]: !prev[field] };

      console.log(
        `SUITE-PROFILE: Toggling mentorship field visibility for ${field} to ${!prev[field]}`,
      );
      console.log(
        "SUITE-PROFILE: Updated mentorship visibility preferences:",
        updated,
      );

      // Only save to database if profile already exists (not during creation)
      if (mentorshipProfile && mentorshipProfile.id) {
        console.log(
          "SUITE-PROFILE: Profile exists, saving visibility preferences via debounced PATCH",
        );
        console.log("SUITE-PROFILE: Data to save:", JSON.stringify(updated));

        try {
          // Use the role from the form data being edited, not the loaded profile
          const currentRole =
            mentorshipFormData?.role || mentorshipProfile?.role || "mentor";

          // Use debounced API call with optimistic updates to prevent flickering
          debouncedSaveMentorshipVisibility({
            visibilityPreferences: JSON.stringify(updated),
            role: currentRole,
          });

          console.log(
            "SUITE-PROFILE: Debounced mentorship mutation triggered successfully with role:",
            currentRole,
          );
        } catch (error) {
          console.error(
            "SUITE-PROFILE: Error triggering debounced mentorship mutation:",
            error,
          );
        }
      } else {
        console.log(
          "SUITE-PROFILE: No existing profile found, storing visibility preferences locally for profile creation",
        );
        console.log(
          "SUITE-PROFILE: Preferences will be included when profile is created via POST",
        );
      }

      return updated;
    });
  };

  // Add networking field visibility toggle function
  const toggleNetworkingFieldVisibility = (
    field: keyof NetworkingFieldVisibility,
  ) => {
    console.log(
      "SUITE-PROFILE: toggleNetworkingFieldVisibility function called with field:",
      field,
    );

    // Optimistic update with improved state management to prevent flickering
    setNetworkingFieldVisibility((prev) => {
      let updated;

      // Special handling for showNetworkingPhotos - it should also control showProfilePhoto
      if (field === "showNetworkingPhotos") {
        const newValue = !prev[field];
        updated = {
          ...prev,
          [field]: newValue,
          showProfilePhoto: newValue, // Also update showProfilePhoto with same value
        };
        console.log(
          `SUITE-PROFILE: Networking Photos toggle controls both showNetworkingPhotos and showProfilePhoto to ${newValue}`,
        );
      } else {
        updated = { ...prev, [field]: !prev[field] };
      }

      console.log(
        `SUITE-PROFILE: Toggling networking field visibility for ${field} to ${!prev[field]}`,
      );
      console.log(
        "SUITE-PROFILE: Updated networking visibility preferences:",
        updated,
      );

      // Use debounced API call to prevent multiple rapid requests causing flickering
      console.log("SUITE-PROFILE: Data to save:", JSON.stringify(updated));

      try {
        debouncedSaveNetworkingVisibility({
          visibilityPreferences: JSON.stringify(updated),
        });
        console.log(
          "SUITE-PROFILE: Debounced networking mutation triggered successfully",
        );
      } catch (error) {
        console.error(
          "SUITE-PROFILE: Error triggering debounced networking mutation:",
          error,
        );
      }

      return updated;
    });
  };

  // Helper functions for mentorship form handling
  const handleMentorshipInputChange = (
    field: keyof MentorshipProfileFormData,
    value: any,
  ) => {
    // When role changes, load the appropriate role-specific data
    if (field === "role" && value !== mentorshipFormData.role) {
      const roleSpecificProfile = mentorshipProfiles?.find(
        (profile) => profile.role === value,
      );
      if (roleSpecificProfile) {
        // Load existing data for the selected role
        const formData = { ...roleSpecificProfile };

        // Convert string fields back to arrays for proper Select component display
        const arrayFields = [
          "languagesSpoken",
          "areasOfExpertise",
          "industriesOrDomains",
          "learningGoals",
        ] as const;

        arrayFields.forEach((field) => {
          if (formData[field] && typeof formData[field] === "string") {
            formData[field] = (formData[field] as string)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean) as any;
          }
        });

        setMentorshipFormData(formData);
      } else {
        // No existing profile for this role, reset form with role and preserve location
        const newFormData: MentorshipProfileFormData = { role: value };
        if (user.location) {
          newFormData.location = user.location;
        }
        setMentorshipFormData(newFormData);
      }
    } else {
      setMentorshipFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleMentorshipArrayInput = (
    field: keyof MentorshipProfileFormData,
    value: string,
  ) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setMentorshipFormData((prev) => ({ ...prev, [field]: items }));
  };

  const handleMentorshipSave = () => {
    saveMentorshipProfileMutation.mutate(mentorshipFormData);
  };

  const handleMentorshipEdit = (selectedRole?: "mentor" | "mentee") => {
    console.log("=== MENTORSHIP EDIT DEBUG ===");
    console.log("mentorshipProfiles:", mentorshipProfiles);
    console.log("selectedRole:", selectedRole);
    console.log("user object:", user);
    console.log("user.location:", user.location);

    // If a specific role is selected, find that profile
    let profileToLoad = null;
    if (selectedRole && mentorshipProfiles?.length) {
      profileToLoad = mentorshipProfiles.find((p) => p.role === selectedRole);
    } else if (mentorshipProfiles?.length) {
      // Use the most recently updated profile
      profileToLoad = mentorshipProfile || mentorshipProfiles[0];
    }

    console.log("Profile to load:", profileToLoad);

    if (profileToLoad) {
      const formData = { ...profileToLoad };

      // Convert string fields back to arrays for proper Select component display
      const arrayFields = [
        "languagesSpoken",
        "areasOfExpertise",
        "industriesOrDomains",
        "learningGoals",
      ] as const;

      arrayFields.forEach((field) => {
        if (formData[field] && typeof formData[field] === "string") {
          formData[field] = (formData[field] as string)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean) as any;
        }
      });

      // Prefill location from user's authentication data if not already set
      if (!formData.location && user.location) {
        console.log("Prefilling location from user.location:", user.location);
        formData.location = user.location;
      }

      console.log("Form data being set:", formData);
      setMentorshipFormData(formData);
    } else {
      console.log("No profile found, starting with empty form");
      console.log("Creating new profile with user.location:", user.location);
      // Prefill location from user's authentication data for new profiles
      const initialData: MentorshipProfileFormData = {};
      if (selectedRole) {
        initialData.role = selectedRole;
      }
      if (user.location) {
        console.log("Setting location for new profile:", user.location);
        initialData.location = user.location;
      }
      console.log("Initial data for new profile:", initialData);
      setMentorshipFormData(initialData);
    }
    setShowMentorshipDialog(true);
  };

  // Helper functions for networking form handling
  const handleNetworkingInputChange = (
    field: keyof NetworkingProfileFormData,
    value: any,
  ) => {
    console.log(`[NETWORKING] Updating field "${field}" with value:`, value);
    setNetworkingFormData((prev) => {
      const updated = { ...prev, [field]: value };
      console.log("[NETWORKING] Updated form data:", updated);
      return updated;
    });
  };

  const handleNetworkingArrayInput = (
    field: keyof NetworkingProfileFormData,
    value: string,
  ) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setNetworkingFormData((prev) => ({ ...prev, [field]: items }));
  };

  const handleNetworkingSave = () => {
    saveNetworkingProfileMutation.mutate(networkingFormData);
  };

  const handleNetworkingEdit = () => {
    console.log("SUITE-PROFILE: handleNetworkingEdit called - opening dialog");
    console.log("SUITE-PROFILE: networkingProfile data:", networkingProfile);

    // Load existing data if available
    if (networkingProfile) {
      const formData = { ...networkingProfile };
      // Prefill location from user's authentication data if not already set
      if (!formData.location && user.location) {
        formData.location = user.location;
      }
      console.log("SUITE-PROFILE: formData being set:", formData);
      console.log("SUITE-PROFILE: education fields in formData:", {
        highSchool: formData.highSchool,
        collegeUniversity: formData.collegeUniversity,
      });
      setNetworkingFormData(formData);
    } else {
      // Prefill location from user's authentication data for new profiles
      const initialData: NetworkingProfileFormData = {};
      if (user.location) {
        initialData.location = user.location;
      }
      setNetworkingFormData(initialData);
    }
    setShowNetworkingDialog(true);
    console.log("SUITE-PROFILE: showNetworkingDialog set to true");
  };

  const handleActivateNetworking = async (active: boolean) => {
    try {
      const response = await fetch("/api/suite/networking-profile/activate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        // Refresh profile settings to update the UI without full page reload
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/profile-settings"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/networking-profile"],
        });
      }
    } catch (error) {
      console.error("Error activating networking profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile activation status.",
        variant: "destructive",
      });
    }
  };

  // If showing profile builder, render it
  if (showProfileBuilder) {
    return (
      <SuiteProfileBuilder
        userId={user.id}
        onBack={() => setShowProfileBuilder(false)}
      />
    );
  }

  const profileTypes = [
    {
      id: "job",
      title: t("suite.profile.jobOpportunities"),
      icon: Briefcase,
      description: t("suite.profile.jobDescription"),
      color: "from-blue-500 to-blue-600",
      profile: jobProfile,
      active: (profileSettings?.jobProfileActive && jobProfile) || false,
    },
    {
      id: "mentorship",
      title: t("suite.profile.mentorship"),
      icon: Users,
      description: t("suite.profile.mentorshipDescription"),
      color: "from-purple-500 to-purple-600",
      profile: mentorshipProfile,
      active:
        (profileSettings?.mentorshipProfileActive && mentorshipProfile) ||
        false,
    },
    {
      id: "networking",
      title: t("suite.profile.networking"),
      icon: Network,
      description: t("suite.profile.networkingDescription"),
      color: "from-green-500 to-green-600",
      profile: networkingProfile,
      active:
        (networkingProfile?.isActive &&
          networkingProfile &&
          !isLoadingProfileSettings &&
          !isLoadingNetworkingProfile) ||
        false,
    },
  ];

  // Hide Jobs section for users under 18
  const visibleProfileTypes = isUnder18(user?.dateOfBirth ?? null)
    ? profileTypes.filter((type) => type.id !== "job")
    : profileTypes;

  // Enhanced Job Profile Swipecard Preview Component with role-based field display
  const renderJobSwipecard = () => {
    const profile = jobProfile || jobFormData;
    if (
      !profile ||
      (!profile.jobTitle && !profile.description && !profile.role)
    ) {
      return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-6 text-center">
          <p className="text-gray-500">
            {t("suite.profile.noJobDataToPreview")}
          </p>
        </div>
      );
    }

    // Define which fields are visible for each role
    const isJobSeeker = profile.role === "job-seeker";
    const isRecruiter = profile.role === "recruiter";

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm mx-auto rounded-xl shadow-2xl overflow-hidden relative"
        style={{ minHeight: "400px" }}
      >
        {/* Background Image */}
        {jobFieldVisibility.showProfilePhoto &&
        (primaryUrls.job || user.photoUrl) ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${primaryUrls.job || user.photoUrl})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
          </div>
        )}

        {/* Verification Badge - positioned in top-right corner */}
        {user?.isVerified && (
          <div className="absolute top-4 right-4 z-30">
            <div className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[8px] font-bold shadow-[0_2px_8px_rgba(34,197,94,0.3),0_1px_4px_rgba(34,197,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)] overflow-hidden border border-emerald-300/40 transform hover:scale-105 transition-all duration-200">
              <Shield className="h-2 w-2 drop-shadow-sm" />
              <span className="drop-shadow-sm tracking-wide">Verified</span>
              {/* Metallic shine overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        )}

        {/* Content Overlay */}
        <div
          className="relative z-10 p-4 h-full flex flex-col justify-between text-white"
          style={{ minHeight: "400px" }}
        >
          {/* Header with Enhanced Badge */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              {/* Top left badge */}
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-orange-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {isJobSeeker ? "SEEKING" : "HIRING"}
                </span>
              </div>

              {/* Industry Badge - Only show Industry Tags */}
              {profile.industryTags &&
                profile.industryTags.length > 0 &&
                jobFieldVisibility.industryTags && (
                  <Badge
                    className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-xl border w-fit relative overflow-hidden ${
                      isRecruiter || isJobSeeker
                        ? "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 text-white border-purple-200/50"
                        : "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white border-blue-200/50"
                    } transform hover:scale-110 transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-skew-x-12 before:animate-pulse`}
                  >
                    <span className="relative z-10 tracking-wider drop-shadow-sm">
                      {profile.industryTags[0].toUpperCase()}
                    </span>
                  </Badge>
                )}
            </div>
          </div>

          {/* Bottom Content - Role-specific fields */}
          <div className="mt-auto space-y-2">
            {/* User Name with Shiny Salary Badge and Desired Industry Badge */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-3xl font-extrabold">
                <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                  <span className="text-4xl">
                    {user.fullName?.split(" ")[0]?.charAt(0) || "U"}
                  </span>
                  {user.fullName?.split(" ")[0]?.slice(1) || "ser"}
                </span>
              </h2>

              {/* Shiny Salary Badge - positioned at right edge for recruiters */}
              {isRecruiter && profile.salary && jobFieldVisibility.salary && (
                <div className="relative bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl">
                  {/* Shiny overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 rounded-xl" />

                  {/* Content */}
                  <div className="relative flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-white drop-shadow-lg" />
                    <span className="text-white text-sm font-extrabold drop-shadow-lg tracking-wide">
                      {
                        currencyOptions.find(
                          (c) =>
                            c.code ===
                            (profile.salaryCurrency || selectedCurrency),
                        )?.symbol
                      }{" "}
                      {profile.salary}
                      {profile.salaryPeriod || selectedPeriod}
                    </span>
                  </div>

                  {/* Additional shine effect */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
                  <div className="absolute top-1 left-2 w-1 h-1 bg-white/60 rounded-full" />
                </div>
              )}

              {/* Desired Industry Badge - positioned at right edge - only show for job seekers when salary is not present */}
              {isJobSeeker &&
                profile.company &&
                profile.company !== "prefer_not_to_say" &&
                jobFieldVisibility.company && (
                  <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                    <span className="relative z-10 text-xs">
                      {profile.company}
                    </span>
                  </Badge>
                )}
            </div>
            {/* Job Title - Different labels for different roles */}
            {profile.jobTitle && jobFieldVisibility.jobTitle && (
              <div className="mb-1.5">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {isJobSeeker
                      ? t("suite.profile.desiredRoleColon")
                      : t("suite.profile.jobTitleColon")}
                  </span>
                  <span className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                    {profile.jobTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Work Style (Work Type + Job Type) - show for both roles */}
            {((profile.workType && jobFieldVisibility.workType) ||
              (profile.jobType && jobFieldVisibility.jobType)) && (
              <div className="mb-1.5">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {isJobSeeker ? "Preferred:" : "Work Style:"}
                  </span>
                  <span className="text-yellow-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                    {[profile.workType, profile.jobType]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
              </div>
            )}

            {/* Experience Level - show for both roles */}
            {profile.experienceLevel && jobFieldVisibility.experienceLevel && (
              <div className="mb-1.5">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-1 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {isJobSeeker ? "Experience:" : "Required Level:"}
                  </span>
                  <span className="text-emerald-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                    {profile.experienceLevel}
                  </span>
                </div>
              </div>
            )}

            {/* Areas of Expertise - only for job seekers when industry is selected */}
            {isJobSeeker &&
              profile.areasOfExpertise &&
              jobFieldVisibility.areasOfExpertise && (
                <div className="mb-1.5">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-purple-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Expertise:
                    </span>
                    <span className="text-purple-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                      {profile.areasOfExpertise.length > 40
                        ? `${profile.areasOfExpertise.substring(0, 40)}...`
                        : profile.areasOfExpertise}
                    </span>
                  </div>
                </div>
              )}

            {/* Description/Summary - show for both but with different labels */}
            {profile.description && jobFieldVisibility.description && (
              <div className="mb-1.5">
                <div className="flex items-center mb-1">
                  <MessageCircle className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {isJobSeeker ? "Summary:" : "Job Description:"}
                  </span>
                </div>
                <div className="text-cyan-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                  {profile.description.length > 80
                    ? `${profile.description.substring(0, 80)}...`
                    : profile.description}
                </div>
              </div>
            )}

            {/* Requirements - only for recruiters */}
            {isRecruiter &&
              profile.requirements &&
              jobFieldVisibility.requirements && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <CheckCircle className="h-4 w-4 mr-1 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Requirements:
                    </span>
                  </div>
                  <div className="text-amber-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.requirements.length > 80
                      ? `${profile.requirements.substring(0, 80)}...`
                      : profile.requirements}
                  </div>
                </div>
              )}

            {/* Industry Tags - Display as small badges if available */}
            {profile.industryTags &&
              profile.industryTags.length > 0 &&
              jobFieldVisibility.industryTags && (
                <div className="mb-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-1 text-purple-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                      <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        Industry Tags:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile.industryTags
                        .slice(0, 2)
                        .map((industry: string, index: number) => (
                          <Badge
                            key={index}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]"
                          >
                            <span className="relative z-10 text-xs">
                              {industry}
                            </span>
                          </Badge>
                        ))}
                      {profile.industryTags.length > 2 && (
                        <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden">
                          <span className="relative z-10 text-xs">
                            +{profile.industryTags.length - 2}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Skills/Technologies */}
            {profile.skillTags &&
              profile.skillTags.length > 0 &&
              jobFieldVisibility.skillTags && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Code className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Skills:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profile.skillTags
                      .slice(0, 3)
                      .map((skill: string, index: number) => (
                        <Badge
                          key={index}
                          className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30 text-[10px] px-1 py-0.5"
                        >
                          {skill}
                        </Badge>
                      ))}
                    {profile.skillTags.length > 3 && (
                      <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30 text-[10px] px-1 py-0.5">
                        +{profile.skillTags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

            {/* Expected Compensation for job seekers */}
            {isJobSeeker &&
              profile.compensation &&
              jobFieldVisibility.compensation && (
                <div className="mb-1.5">
                  <div className="flex items-center">
                    <Banknote className="h-4 w-4 mr-1 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Expected Compensation:
                    </span>
                    <span className="text-purple-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                      {
                        currencyOptions.find(
                          (c) =>
                            c.code ===
                            (profile.compensationCurrency || selectedCurrency),
                        )?.symbol
                      }{" "}
                      {profile.compensation}
                      {profile.compensationPeriod || selectedPeriod}
                    </span>
                  </div>
                </div>
              )}

            {/* Who Should Apply */}
            {profile.whoShouldApply && jobFieldVisibility.whoShouldApply && (
              <div className="mb-1.5">
                <div className="flex items-center mb-1">
                  <Users className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {t("suite.profile.whoShouldApplyColon")}
                  </span>
                </div>
                <div className="text-indigo-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                  {profile.whoShouldApply.length > 80
                    ? `${profile.whoShouldApply.substring(0, 80)}...`
                    : profile.whoShouldApply}
                </div>
              </div>
            )}

            {/* Application URL */}
            {profile.applicationUrl && jobFieldVisibility.applicationUrl && (
              <div className="mb-1.5">
                <div className="flex items-center">
                  <Link className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    Apply:
                  </span>
                  <span className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1 truncate">
                    {profile.applicationUrl.length > 25
                      ? `${profile.applicationUrl.substring(0, 25)}...`
                      : profile.applicationUrl}
                  </span>
                </div>
              </div>
            )}

            {/* Application Email */}
            {profile.applicationEmail &&
              jobFieldVisibility.applicationEmail && (
                <div className="mb-1.5">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Email:
                    </span>
                    <span className="text-pink-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1 truncate">
                      {profile.applicationEmail.length > 25
                        ? `${profile.applicationEmail.substring(0, 25)}...`
                        : profile.applicationEmail}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Enhanced Mentorship Profile Swipecard Preview Component with networking-style design
  const renderMentorshipSwipecard = () => {
    const base = mentorshipProfile || {};
    const overlay = mentorshipFormData || {};
    const profile = {
      ...base,
      ...overlay,
      highSchool: sharedHighSchool ?? overlay.highSchool ?? base.highSchool,
      collegeUniversity:
        sharedCollege ?? overlay.collegeUniversity ?? base.collegeUniversity,
    } as any;
    if (!profile || !profile.role) {
      return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-6 text-center">
          <p className="text-gray-500">
            {t("suite.profile.noMentorshipDataToPreview")}
          </p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm mx-auto rounded-xl shadow-2xl overflow-hidden relative"
        style={{ minHeight: "400px" }}
      >
        {/* Background Image */}
        {mentorshipFieldVisibility.showProfilePhoto &&
        primaryUrls.mentorship ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${primaryUrls.mentorship})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
          </div>
        )}

        {/* Verification Badge - positioned in top-right corner */}
        {user?.isVerified && (
          <div className="absolute top-4 right-4 z-30">
            <div className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[8px] font-bold shadow-[0_2px_8px_rgba(34,197,94,0.3),0_1px_4px_rgba(34,197,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)] overflow-hidden border border-emerald-300/40 transform hover:scale-105 transition-all duration-200">
              <Shield className="h-2 w-2 drop-shadow-sm" />
              <span className="drop-shadow-sm tracking-wide">Verified</span>
              {/* Metallic shine overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        )}

        {/* Content Overlay */}
        <div
          className="relative z-10 p-4 h-full flex flex-col justify-between text-white"
          style={{ minHeight: "400px" }}
        >
          {/* Header with Enhanced Badge */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              {profile.role && mentorshipFieldVisibility.role && (
                <Badge className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900 font-bold shadow-lg border-0 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite] px-2 py-1 text-xs rounded-full w-fit transform hover:scale-105 transition-all duration-200">
                  <span className="relative z-10 tracking-wide drop-shadow-sm">
                    {profile.role === "mentor" ? "Mentor" : "Mentee"}
                  </span>
                </Badge>
              )}
            </div>
          </div>

          {/* Bottom Content */}
          <div className="space-y-3">
            {/* User Name with Technology Badge */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-3xl font-extrabold">
                <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                  <span className="text-4xl">
                    {user.fullName?.split(" ")[0]?.charAt(0) || "U"}
                  </span>
                  {user.fullName?.split(" ")[0]?.slice(1) || "ser"}
                </span>
              </h2>
              {/* Show Industry Aspiration badge for mentees, Industries/Domains for mentors */}
              {profile.role === "mentee" &&
                profile.industryAspiration &&
                mentorshipFieldVisibility.industryAspiration && (
                  <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                    <span className="relative z-10 text-xs">
                      {profile.industryAspiration}
                    </span>
                  </Badge>
                )}
              {profile.role === "mentor" &&
                profile.industriesOrDomains &&
                profile.industriesOrDomains.length > 0 &&
                mentorshipFieldVisibility.industriesOrDomains && (
                  <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                    <span className="relative z-10 text-xs">
                      {Array.isArray(profile.industriesOrDomains)
                        ? profile.industriesOrDomains[0]
                        : profile.industriesOrDomains.split(",")[0]?.trim()}
                    </span>
                  </Badge>
                )}
            </div>

            {/* Location - Right under the name */}
            {profile.location && mentorshipFieldVisibility.location && (
              <div className="mb-1.5 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                <span className="text-indigo-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                  {profile.location}
                </span>
              </div>
            )}

            {/* Education Fields - High School - Right after location */}
            {profile.highSchool && mentorshipFieldVisibility.highSchool && (
              <div className="flex items-center mb-1.5">
                <BookOpen className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                <span className="bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                  {profile.highSchool}
                </span>
              </div>
            )}

            {/* Education Fields - College/University - Right after high school */}
            {profile.collegeUniversity &&
              mentorshipFieldVisibility.collegeUniversity && (
                <div className="flex items-center mb-1.5">
                  <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                    {profile.collegeUniversity}
                  </span>
                </div>
              )}

            {/* Professional Tagline */}
            {profile.professionalTagline &&
              mentorshipFieldVisibility.professionalTagline && (
                <p className="text-white/90 text-xs font-medium italic drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] mb-1.5">
                  "{profile.professionalTagline}"
                </p>
              )}

            {/* Areas of Expertise for Mentors */}
            {profile.role === "mentor" &&
              profile.areasOfExpertise &&
              profile.areasOfExpertise.length > 0 &&
              mentorshipFieldVisibility.areasOfExpertise && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Star className="h-4 w-4 mr-1 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.areasOfExpertise")}:
                    </span>
                  </div>
                  <div className="text-emerald-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {Array.isArray(profile.areasOfExpertise)
                      ? profile.areasOfExpertise.join(", ")
                      : profile.areasOfExpertise}
                  </div>
                </div>
              )}

            {/* Learning Goals for Mentees */}
            {profile.role === "mentee" &&
              profile.learningGoals &&
              profile.learningGoals.length > 0 &&
              mentorshipFieldVisibility.learningGoals && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Target className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.learningGoals")}:
                    </span>
                  </div>
                  <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {Array.isArray(profile.learningGoals)
                      ? profile.learningGoals.join(", ")
                      : profile.learningGoals}
                  </div>
                </div>
              )}

            {/* Time Commitment */}
            {profile.timeCommitment &&
              mentorshipFieldVisibility.timeCommitment && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Clock className="h-4 w-4 mr-1 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.timeCommitment")}:
                    </span>
                  </div>
                  <div className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.timeCommitment}
                  </div>
                </div>
              )}

            {/* Availability - Under Time Commitment */}
            {profile.availability && mentorshipFieldVisibility.availability && (
              <div className="mb-1.5 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                <span className="text-purple-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                  {profile.availability}
                </span>
              </div>
            )}

            {/* Languages Spoken */}
            {profile.languagesSpoken &&
              profile.languagesSpoken.length > 0 &&
              mentorshipFieldVisibility.languagesSpoken && (
                <div className="mb-1.5">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(profile.languagesSpoken)
                        ? profile.languagesSpoken.slice(0, 3)
                        : profile.languagesSpoken
                            .split(",")
                            .slice(0, 3)
                            .map((s: string) => s.trim())
                      ).map((language: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]"
                        >
                          {language}
                        </span>
                      ))}
                      {(Array.isArray(profile.languagesSpoken)
                        ? profile.languagesSpoken.length > 3
                        : profile.languagesSpoken.split(",").length > 3) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          +
                          {Array.isArray(profile.languagesSpoken)
                            ? profile.languagesSpoken.length - 3
                            : profile.languagesSpoken.split(",").length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Mentorship Style (for mentors) */}
            {profile.role === "mentor" &&
              profile.mentorshipStyle &&
              mentorshipFieldVisibility.mentorshipStyle && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Zap className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.mentorshipStyle")}:
                    </span>
                  </div>
                  <div className="text-yellow-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.mentorshipStyle}
                  </div>
                </div>
              )}

            {/* Why I Mentor (for mentors) */}
            {profile.role === "mentor" &&
              profile.whyMentor &&
              mentorshipFieldVisibility.whyMentor && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Heart className="h-4 w-4 mr-1 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.whyMentor")}:
                    </span>
                  </div>
                  <div className="text-pink-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.whyMentor.length > 60
                      ? `${profile.whyMentor.substring(0, 60)}...`
                      : profile.whyMentor}
                  </div>
                </div>
              )}

            {/* Why I Seek Mentorship (for mentees) */}
            {profile.role === "mentee" &&
              profile.whySeekMentorship &&
              mentorshipFieldVisibility.whySeekMentorship && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Heart className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.whySeekMentorship")}:
                    </span>
                  </div>
                  <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.whySeekMentorship.length > 60
                      ? `${profile.whySeekMentorship.substring(0, 60)}...`
                      : profile.whySeekMentorship}
                  </div>
                </div>
              )}

            {/* Preferred Mentorship Style (for mentees) */}
            {profile.role === "mentee" &&
              profile.preferredMentorshipStyle &&
              mentorshipFieldVisibility.preferredMentorshipStyle && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Zap className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {t("suite.profile.preferredStyle")}:
                    </span>
                  </div>
                  <div className="text-teal-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.preferredMentorshipStyle}
                  </div>
                </div>
              )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Networking Profile Swipecard Preview Component
  const renderNetworkingSwipecard = () => {
    const base = networkingProfile || {};
    const overlay = networkingFormData || {};
    const profile = {
      ...base,
      ...overlay,
      highSchool: sharedHighSchool ?? overlay.highSchool ?? base.highSchool,
      collegeUniversity:
        sharedCollege ?? overlay.collegeUniversity ?? base.collegeUniversity,
    } as any;
    if (
      !profile ||
      (!profile.currentRole &&
        !profile.professionalTagline &&
        !profile.industry &&
        !profile.location)
    ) {
      return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-xl p-6 text-center">
          <p className="text-gray-500">
            {t("suite.profile.noNetworkingDataToPreview")}
          </p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full h-[400px] mx-auto bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-xl overflow-hidden relative"
      >
        {/* Background Image */}
        <div className="relative h-full w-full overflow-hidden">
          {networkingFieldVisibility.showNetworkingPhotos &&
          (primaryUrls.networking || user.photoUrl) ? (
            <img
              src={primaryUrls.networking || user.photoUrl || ""}
              className="w-full h-full object-cover"
              alt={`${user.fullName}'s networking profile`}
            />
          ) : networkingFieldVisibility.showNetworkingPhotos ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
              <UserPicture
                imageUrl={user.photoUrl || undefined}
                fallbackInitials={user.fullName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
                size="xl"
                className="w-20 h-20 text-3xl"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-black" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Verification Badge - positioned in top-right corner */}
          {user?.isVerified && (
            <div className="absolute top-4 right-4 z-30">
              <div className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[8px] font-bold shadow-[0_2px_8px_rgba(34,197,94,0.3),0_1px_4px_rgba(34,197,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.1)] overflow-hidden border border-emerald-300/40 transform hover:scale-105 transition-all duration-200">
                <Shield className="h-2 w-2 drop-shadow-sm" />
                <span className="drop-shadow-sm tracking-wide">Verified</span>
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="absolute inset-0 p-4 flex flex-col justify-between">
            {/* Top Content */}
            <div className="text-white space-y-1">
              {/* Role Badge - Removed */}
            </div>

            {/* Bottom Content */}
            <div className="space-y-3">
              {/* User Name with Industry Badge */}
              <div className="mb-2 flex items-start justify-between">
                <h2 className="text-3xl font-extrabold flex-1">
                  <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                    <span className="text-4xl">
                      {user.fullName?.split(" ")[0]?.charAt(0) || "U"}
                    </span>
                    {user.fullName?.split(" ")[0]?.slice(1) || "ser"}
                  </span>
                </h2>
                {/* Industry Badge */}
                {(() => {
                  // Parse visibility preferences from the profile data directly
                  let fieldVisibility = { industry: true }; // default
                  if (profile.visibilityPreferences) {
                    try {
                      fieldVisibility = JSON.parse(
                        profile.visibilityPreferences,
                      );
                    } catch (e) {
                      console.warn(
                        "Failed to parse visibility preferences:",
                        e,
                      );
                    }
                  }
                  return profile.industry && fieldVisibility.industry;
                })() && (
                  <div className="ml-3 flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border border-white/20 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1.5 animate-pulse"></span>
                      {profile.industry}
                    </span>
                  </div>
                )}
              </div>

              {/* Location */}
              {(() => {
                // Parse visibility preferences from the profile data directly
                let fieldVisibility = { location: true }; // default
                if (profile.visibilityPreferences) {
                  try {
                    fieldVisibility = JSON.parse(profile.visibilityPreferences);
                  } catch (e) {
                    console.warn("Failed to parse visibility preferences:", e);
                  }
                }
                return profile.location && fieldVisibility.location;
              })() && (
                <div className="flex items-center mb-1.5">
                  <MapPin className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="font-medium text-sm text-rose-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {profile.location}
                  </span>
                </div>
              )}

              {/* Current Role and Company */}
              {profile.currentRole && networkingFieldVisibility.currentRole && (
                <div className="flex items-center mb-1.5">
                  <Briefcase className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                    {profile.currentRole}
                    {profile.currentCompany &&
                      networkingFieldVisibility.currentCompany &&
                      ` @ ${profile.currentCompany}`}
                  </span>
                  {profile.experienceYears &&
                    networkingFieldVisibility.experienceYears && (
                      <span className="text-teal-100 text-sm ml-1 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        • {profile.experienceYears}
                      </span>
                    )}
                </div>
              )}

              {/* Current Company (standalone when no role) */}
              {!profile.currentRole &&
                profile.currentCompany &&
                networkingFieldVisibility.currentCompany && (
                  <div className="flex items-center mb-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 12h.01" />
                      <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      <path d="M22 13a18.15 18.15 0 0 1-20 0" />
                      <rect width="20" height="14" x="2" y="6" rx="2" />
                    </svg>
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                      {profile.currentCompany}
                    </span>
                  </div>
                )}

              {/* Education Fields - High School */}
              {profile.highSchool && networkingFieldVisibility.highSchool && (
                <div className="flex items-center mb-1.5">
                  <BookOpen className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="font-serif bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                    {profile.highSchool}
                  </span>
                </div>
              )}

              {/* Education Fields - College/University */}
              {profile.collegeUniversity &&
                networkingFieldVisibility.collegeUniversity && (
                  <div className="flex items-center mb-1.5">
                    <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="font-serif bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                      {profile.collegeUniversity}
                    </span>
                  </div>
                )}

              {/* Professional Tagline */}
              {profile.professionalTagline &&
                networkingFieldVisibility.professionalTagline && (
                  <div className="mb-2 rounded-md overflow-hidden">
                    <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient italic">
                      "{profile.professionalTagline}"
                    </p>
                  </div>
                )}

              {/* Workplace */}
              {profile.workplace && networkingFieldVisibility.workplace && (
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
                    {profile.workplace}
                  </span>
                </div>
              )}

              {/* Working Style */}
              {profile.workingStyle &&
                networkingFieldVisibility.workingStyle && (
                  <div className="flex items-center mb-1.5">
                    <Globe className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="font-medium text-sm text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {profile.workingStyle}
                    </span>
                  </div>
                )}

              {/* Looking For */}
              {profile.lookingFor && networkingFieldVisibility.lookingFor && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Looking for:
                    </span>
                  </div>
                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                    {profile.lookingFor}
                  </p>
                </div>
              )}

              {/* Can Offer */}
              {profile.canOffer && networkingFieldVisibility.canOffer && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="m2 17 10 5 10-5" />
                      <path d="m2 12 10 5 10-5" />
                    </svg>
                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Can offer:
                    </span>
                  </div>
                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                    {profile.canOffer}
                  </p>
                </div>
              )}

              {/* Professional Interests */}
              {profile.professionalInterests &&
                profile.professionalInterests.length > 0 &&
                networkingFieldVisibility.professionalInterests && (
                  <div className="mb-2">
                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Interests:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {profile.professionalInterests
                        .slice(0, 2)
                        .map((interest: string, index: number) => {
                          const gradientClasses = [
                            "from-purple-500/90 to-fuchsia-500/90",
                            "from-amber-500/90 to-orange-500/90",
                          ];
                          const gradientClass =
                            gradientClasses[index % gradientClasses.length];

                          return (
                            <Badge
                              key={`${user.id}-interest-${index}`}
                              className={`bg-gradient-to-r ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border-0 static-gradient no-animation`}
                            >
                              {interest}
                            </Badge>
                          );
                        })}
                      {profile.professionalInterests.length > 2 && (
                        <Badge className="bg-white/20 text-white text-xs py-0 px-2.5 border-0">
                          +{profile.professionalInterests.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Footer Button */}
        {/* <div className="absolute bottom-3 left-4 right-4">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm py-2">
            Connect & Network
          </Button>
        </div> */}
      </motion.div>
    );
  };

  return (
    <div
      className={`${
        darkMode
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
          : "bg-gradient-to-br from-gray-50 via-white to-blue-50"
      } relative flex flex-col`}
      style={{
        height: "calc(90vh - 65px)",
        overflow:
          showNetworkingInlinePreview ||
          showJobInlinePreview ||
          showMentorshipInlinePreview
            ? "auto"
            : "hidden",
      }}
    >
      {/* Sophisticated ambient lighting effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 via-transparent to-blue-900/10 pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Executive Header with Enhanced Glassmorphism */}
      <div
        className={`relative z-10 backdrop-blur-xl ${
          darkMode
            ? "bg-slate-900/80 border-b border-slate-700/40"
            : "bg-white/80 border-b border-gray-200/40"
        } shadow-2xl flex-shrink-0`}
      >
        <div className="w-full mx-auto px-2 sm:px-4 py-1">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Enhanced Profile Photo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative flex-shrink-0 cursor-pointer"
              onClick={() => setShowExpandableModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  {getDisplayPhoto() ? (
                    <img
                      src={getDisplayPhoto() || undefined}
                      className="w-full h-full object-cover"
                      alt="Profile"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm sm:text-lg font-bold">
                        {user.fullName?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Status Indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
            </motion.div>

            {/* Enhanced Profile Info */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className={`text-base sm:text-lg font-bold truncate ${
                    darkMode
                      ? "bg-gradient-to-r from-slate-100 to-blue-300 bg-clip-text text-transparent"
                      : "text-gray-800"
                  }`}
                >
                  {user.fullName || "Professional Name"}
                </h1>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`relative z-10 w-full mx-auto px-2 sm:px-4 flex-1 flex flex-col min-h-0 ${showNetworkingInlinePreview || showJobInlinePreview || showMentorshipInlinePreview ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {/* Enhanced Professional Profiles Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex-shrink-0 mt-3 sm:mt-6"
        >
          <Card
            className={`backdrop-blur-xl ${
              darkMode
                ? "bg-slate-900/80 border border-slate-700/50"
                : "bg-white/80 border border-gray-200/50"
            } shadow-2xl rounded-2xl overflow-hidden w-full`}
          >
            <div
              className={`${
                darkMode
                  ? "bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-800/60"
                  : "bg-gradient-to-r from-blue-50/80 via-purple-50/60 to-indigo-50/80"
              } p-2 sm:p-4 border-b ${
                darkMode ? "border-slate-700/50" : "border-gray-200/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle
                    className={`text-sm sm:text-base font-bold truncate ${
                      darkMode
                        ? "bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent"
                        : "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                    }`}
                  >
                    {t("suite.profile.professionalProfiles")}
                  </CardTitle>
                  <p
                    className={`mt-0.5 text-[10px] sm:text-xs truncate ${
                      darkMode ? "text-blue-200/90" : "text-blue-700/90"
                    }`}
                  >
                    {t("suite.profile.previewDescription")}
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-2 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                {visibleProfileTypes.map((type, index) => {
                  const Icon = type.icon;
                  return (
                    <motion.div
                      key={type.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 * index }}
                      whileHover={{
                        scale: 1.01,
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                      }}
                      className={`group relative p-1.5 sm:p-3 backdrop-blur-xl ${
                        darkMode
                          ? "bg-gradient-to-r from-slate-800/80 via-slate-700/70 to-slate-800/80 border border-slate-600/40 hover:border-slate-500/60"
                          : "bg-gradient-to-r from-white/90 via-blue-50/80 to-white/90 border border-gray-200/60 hover:border-blue-300/60"
                      } rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden transform hover:-translate-y-1`}
                    >
                      {/* Enhanced Hover Effect Background */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${type.color} opacity-0 group-hover:opacity-20 transition-all duration-500`}
                      ></div>

                      {/* Animated Border Glow */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${type.color} opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500 -z-10`}
                      ></div>

                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {/* Enhanced Icon */}
                          <motion.div
                            whileHover={{ rotate: 360, scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            className={`p-2 rounded-xl bg-gradient-to-r ${type.color} shadow-lg group-hover:shadow-xl transition-shadow duration-300 flex-shrink-0`}
                          >
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </motion.div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`font-semibold text-sm transition-colors duration-300 truncate ${
                                  darkMode
                                    ? "text-slate-200 group-hover:text-blue-300"
                                    : "text-gray-800 group-hover:text-blue-600"
                                }`}
                              >
                                {type.title}
                              </h3>
                              {/* Show Active badge only when fully loaded and verified */}
                              {type.id === "networking"
                                ? profileSettings?.networkingProfileActive &&
                                  networkingProfile &&
                                  !isLoadingProfileSettings &&
                                  !isLoadingNetworkingProfile && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="flex-shrink-0"
                                    >
                                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs shadow-lg">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {t("profile.active")}
                                      </Badge>
                                    </motion.div>
                                  )
                                : type.active && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="flex-shrink-0"
                                    >
                                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs shadow-lg">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {t("profile.active")}
                                      </Badge>
                                    </motion.div>
                                  )}
                            </div>
                            <p
                              className={`transition-colors duration-300 text-xs truncate ${
                                darkMode
                                  ? "text-slate-400 group-hover:text-slate-300"
                                  : "text-gray-600 group-hover:text-gray-800"
                              }`}
                            >
                              {type.description}
                            </p>
                          </div>
                        </div>

                        {/* Mobile-responsive button layout */}
                        {type.id === "job" ? (
                          <div className="flex flex-col space-y-1.5 ml-2 flex-shrink-0">
                            {/* Show Preview button for job */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  setShowJobInlinePreview(!showJobInlinePreview)
                                }
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-green-300 dark:border-green-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                {showJobInlinePreview ? (
                                  <>
                                    <X className="h-3 w-3 text-pink-500 dark:text-pink-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:inline">
                                      {t("suite.profile.hidePreview")}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                      {t("suite.profile.preview")}
                                    </span>
                                    <Check className="h-3 w-3 text-green-500 dark:text-green-400 flex-shrink-0 sm:hidden" />
                                  </>
                                )}
                              </Button>
                            </motion.div>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() => handleJobEdit()}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-blue-300 dark:border-blue-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                <Edit className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hidden sm:inline">
                                  {t("suite.profile.editProfile")}
                                </span>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:hidden">
                                  Edit
                                </span>
                              </Button>
                            </motion.div>

                            {/* Delete job profile button - only show if profile is active */}
                            {type.active && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  onClick={() => {
                                    setShowDeleteJobDialog(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  disabled={deleteJobProfileMutation.isPending}
                                  className="flex items-center gap-1 border-2 border-red-300 dark:border-red-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                                >
                                  {deleteJobProfileMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-red-600 dark:text-red-400" />
                                  ) : (
                                    <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 hidden sm:inline">
                                    {t("profile.delete")}
                                  </span>
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 sm:hidden">
                                    Del
                                  </span>
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        ) : type.id === "mentorship" ? (
                          <div className="flex flex-col space-y-1.5 ml-2 flex-shrink-0">
                            {/* Show Preview button for mentorship */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  setShowMentorshipInlinePreview(
                                    !showMentorshipInlinePreview,
                                  )
                                }
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-green-300 dark:border-green-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                {showMentorshipInlinePreview ? (
                                  <>
                                    <X className="h-3 w-3 text-pink-500 dark:text-pink-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:inline">
                                      {t("suite.profile.hidePreview")}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                      {t("suite.profile.preview")}
                                    </span>
                                    <Check className="h-3 w-3 text-green-500 dark:text-green-400 flex-shrink-0 sm:hidden" />
                                  </>
                                )}
                              </Button>
                            </motion.div>

                            {/* Edit button for the most recently updated profile */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  handleMentorshipEdit(
                                    mentorshipProfile?.role as
                                      | "mentor"
                                      | "mentee",
                                  )
                                }
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-blue-300 dark:border-blue-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                <Edit className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hidden sm:inline">
                                  {mentorshipProfile?.role
                                    ? `Edit ${mentorshipProfile.role === "mentor" ? "Mentor" : "Mentee"}`
                                    : "Edit Profile"}
                                </span>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:hidden">
                                  Edit
                                </span>
                              </Button>
                            </motion.div>

                            {/* Delete mentorship profile button - only show if profile is active */}
                            {type.active && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  onClick={() => {
                                    setMentorshipRoleToDelete(
                                      mentorshipProfile?.role,
                                    );
                                    setShowDeleteMentorshipDialog(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    deleteMentorshipProfileMutation.isPending
                                  }
                                  className="flex items-center gap-1 border-2 border-red-300 dark:border-red-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                                >
                                  {deleteMentorshipProfileMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-red-600 dark:text-red-400" />
                                  ) : (
                                    <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 hidden sm:inline">
                                    {t("profile.delete")}
                                  </span>
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 sm:hidden">
                                    Del
                                  </span>
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1.5 ml-2 flex-shrink-0">
                            {/* Show Preview button for networking */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() =>
                                  setShowNetworkingInlinePreview(
                                    !showNetworkingInlinePreview,
                                  )
                                }
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-green-300 dark:border-green-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                {showNetworkingInlinePreview ? (
                                  <>
                                    <X className="h-3 w-3 text-pink-500 dark:text-pink-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden sm:inline">
                                      {t("suite.profile.hidePreview")}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                      {t("suite.profile.preview")}
                                    </span>
                                    <Check className="h-3 w-3 text-green-500 dark:text-green-400 flex-shrink-0 sm:hidden" />
                                  </>
                                )}
                              </Button>
                            </motion.div>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                onClick={() => handleNetworkingEdit()}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border-2 border-blue-300 dark:border-blue-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                              >
                                <Edit className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hidden sm:inline">
                                  {t("suite.profile.editProfile")}
                                </span>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:hidden">
                                  Edit
                                </span>
                              </Button>
                            </motion.div>

                            {/* Delete networking profile button - only show if profile is active */}
                            {type.active && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  onClick={() => {
                                    setShowDeleteNetworkingDialog(true);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    deleteNetworkingProfileMutation.isPending
                                  }
                                  className="flex items-center gap-1 border-2 border-red-300 dark:border-red-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-2 sm:px-3 text-xs whitespace-nowrap min-w-fit"
                                >
                                  {deleteNetworkingProfileMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-red-600 dark:text-red-400" />
                                  ) : (
                                    <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 hidden sm:inline">
                                    {t("profile.delete")}
                                  </span>
                                  <span className="text-xs font-medium text-red-600 dark:text-red-400 sm:hidden">
                                    Del
                                  </span>
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inline Preview for Networking Section */}
                      {type.id === "networking" &&
                        showNetworkingInlinePreview && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 mb-2 px-2 block relative z-40 bg-white dark:bg-gray-900 pt-4 pb-2 rounded-lg border border-green-200 dark:border-green-800"
                          >
                            <div className="relative">
                              <div className="flex flex-col gap-0 mt-[-8px] mb-4">
                                <h3 className="text-center text-sm font-semibold text-green-800 dark:text-purple-300 mt-0 mb-0 leading-none">
                                  {t("suite.profile.networkingProfilePreview")}
                                </h3>
                                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1 leading-none pt-1">
                                  {t("suite.profile.networkingProfileSubtitle")}
                                </p>
                              </div>

                              {/* Networking SwipeCard Preview */}
                              <div className="w-full h-[400px] mx-auto border-2 border-white dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
                                {renderNetworkingSwipecard()}
                              </div>
                            </div>
                          </motion.div>
                        )}

                      {/* Inline Preview for Job Section */}
                      {type.id === "job" && showJobInlinePreview && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 mb-2 px-2 block relative z-40 bg-white dark:bg-gray-900 pt-4 pb-2 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="relative">
                            <div className="flex flex-col gap-0 mt-[-8px] mb-4">
                              <h3 className="text-center text-sm font-semibold text-blue-800 dark:text-blue-300 mt-0 mb-0 leading-none">
                                {t("suite.profile.jobProfilePreview")}
                              </h3>
                              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1 leading-none pt-1">
                                {t("suite.profile.jobProfileSubtitle")}
                              </p>
                            </div>

                            {/* Job SwipeCard Preview */}
                            <div className="w-full max-w-sm mx-auto border-2 border-white dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                              {renderJobSwipecard()}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Inline Preview for Mentorship Section */}
                      {type.id === "mentorship" &&
                        showMentorshipInlinePreview && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 mb-2 px-2 block relative z-40 bg-white dark:bg-gray-900 pt-4 pb-2 rounded-lg border border-purple-200 dark:border-purple-800"
                          >
                            <div className="relative">
                              <div className="flex flex-col gap-0 mt-[-8px] mb-4">
                                <h3 className="text-center text-sm font-semibold text-purple-800 dark:text-purple-300 mt-0 mb-0 leading-none">
                                  {t("suite.profile.mentorshipProfilePreview")}
                                </h3>
                                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1 leading-none pt-1">
                                  {t("suite.profile.mentorshipProfileSubtitle")}
                                </p>
                              </div>

                              {/* Mentorship SwipeCard Preview */}
                              <div className="w-full max-w-sm mx-auto border-2 border-white dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                {renderMentorshipSwipecard()}
                              </div>
                            </div>
                          </motion.div>
                        )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialog Components */}
      {showJobDialog && (
        <Dialog open={showJobDialog} onOpenChange={setShowJobDialog}>
          <DialogContent className="w-[95vw] max-w-4xl h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 border-2 border-white/30 shadow-2xl rounded-2xl">
            <div className="relative overflow-hidden h-full flex flex-col">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
              </div>

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl border-b border-white/10 p-4 flex-shrink-0">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl flex items-center justify-center shadow-lg"
                      >
                        <Briefcase className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <DialogTitle className="text-lg md:text-2xl font-bold text-white font-['Space_Grotesk'] mb-1">
                          {jobProfile
                            ? t("suite.profile.editJobProfile")
                            : t("suite.profile.createJobProfile")}
                        </DialogTitle>
                        <p className="text-blue-100 font-['Inter'] text-xs md:text-sm">
                          {t("suite.profile.craftJobProfileSubtitle")}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowJobDialog(false)}
                      className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                    >
                      <X className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </DialogHeader>
              </div>

              {/* Content */}
              <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-20">
                  {/* Role Selection Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                        {t("suite.profile.yourRole")}
                      </h3>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                          {t("suite.profile.iAmHereTo")}
                        </label>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-blue-300">
                            {t("suite.profile.show")}
                          </span>
                          <Switch
                            checked={jobFieldVisibility.role || true}
                            onCheckedChange={() =>
                              toggleJobFieldVisibility("role")
                            }
                            className="data-[state=checked]:bg-blue-500"
                          />
                        </div>
                      </div>
                      <Select
                        value={jobFormData.role || ""}
                        onValueChange={(value) =>
                          handleJobInputChange("role", value)
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                          <SelectValue
                            placeholder={t("suite.profile.selectYourRole")}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="job-seeker">
                            {t("suite.profile.findJobOpportunities")}
                          </SelectItem>
                          <SelectItem value="recruiter">
                            {t("suite.profile.postJobOpportunities")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>

                  {/* Professional Photo Section - Jobs */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Camera className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.professionalPhoto")}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-blue-200 font-['Inter']">
                          {t("suite.profile.show")}
                        </span>
                        <Switch
                          checked={jobFieldVisibility.showProfilePhoto}
                          onCheckedChange={() =>
                            toggleJobFieldVisibility("showProfilePhoto")
                          }
                          className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200"
                        />
                      </div>
                    </div>

                    {/* Section-specific Photo Manager */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <SectionPhotoManager
                        section="job"
                        photos={jobPhotos.photos}
                        onPhotosUpdate={() => {
                          // Update section tracking for dynamic photo display
                          setLastUpdatedSection("job");
                        }}
                        className="custom-job-photos"
                        userId={user.id}
                      />
                    </div>
                  </motion.div>

                  {/* Basic Information Section - only show for job seekers */}
                  {jobFormData.role === "job-seeker" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          Your Profile
                        </h3>
                      </div>

                      {jobFormData.role === "job-seeker" ? (
                        // Job Seeker Fields
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.desiredRole")} *
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.jobTitle}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("jobTitle")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <Input
                              value={jobFormData.jobTitle || ""}
                              onChange={(e) =>
                                handleJobInputChange("jobTitle", e.target.value)
                              }
                              placeholder={t(
                                "suite.profile.desiredRolePlaceholder",
                              )}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.desiredIndustry")} *
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.company}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("company")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <Select
                              value={jobFormData.company || ""}
                              onValueChange={(value) =>
                                handleJobInputChange("company", value)
                              }
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                <SelectValue
                                  placeholder={t(
                                    "suite.profile.selectDesiredIndustry",
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="Technology">
                                  {t(
                                    "suite.profile.industryOptions.technology",
                                  )}
                                </SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Healthcare">
                                  {t(
                                    "suite.profile.industryOptions.healthcare",
                                  )}
                                </SelectItem>
                                <SelectItem value="Education">
                                  {t("suite.profile.industryOptions.education")}
                                </SelectItem>
                                <SelectItem value="Manufacturing">
                                  Manufacturing
                                </SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Government">
                                  Government
                                </SelectItem>
                                <SelectItem value="Non-profit">
                                  Non-profit
                                </SelectItem>
                                <SelectItem value="Media">
                                  Media & Entertainment
                                </SelectItem>
                                <SelectItem value="Agriculture">
                                  Agriculture
                                </SelectItem>
                                <SelectItem value="Construction">
                                  Construction
                                </SelectItem>
                                <SelectItem value="Tourism">
                                  Tourism & Hospitality
                                </SelectItem>
                                <SelectItem value="Consulting">
                                  Consulting
                                </SelectItem>
                                <SelectItem value="Real Estate">
                                  Real Estate
                                </SelectItem>
                                <SelectItem value="Energy">
                                  Energy & Utilities
                                </SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="prefer_not_to_say">
                                  {t(
                                    "suite.profile.industryOptions.preferNotToSay",
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        // Recruiter Fields - Job Title moved to Job Details section
                        <div className="text-center text-blue-200/60 text-sm font-['Inter'] py-4">
                          {t("suite.profile.jobDetailsNote")}
                        </div>
                      )}

                      {/* Areas of Expertise - only show for job seekers when industry is selected */}
                      {jobFormData.role === "job-seeker" &&
                        jobFormData.company &&
                        jobFormData.company !== "prefer_not_to_say" && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.areasOfExpertise")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.areasOfExpertise}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("areasOfExpertise")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <Select
                              value={jobFormData.areasOfExpertise || ""}
                              onValueChange={(value) =>
                                handleJobInputChange("areasOfExpertise", value)
                              }
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                <SelectValue
                                  placeholder={t(
                                    "suite.profile.selectAreasOfExpertise",
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                {jobFormData.company === "Technology" && (
                                  <>
                                    <SelectItem value="Software Development">
                                      Software Development
                                    </SelectItem>
                                    <SelectItem value="Data Science">
                                      Data Science & Analytics
                                    </SelectItem>
                                    <SelectItem value="Cybersecurity">
                                      Cybersecurity
                                    </SelectItem>
                                    <SelectItem value="Cloud Computing">
                                      Cloud Computing
                                    </SelectItem>
                                    <SelectItem value="Mobile Development">
                                      Mobile Development
                                    </SelectItem>
                                    <SelectItem value="Web Development">
                                      Web Development
                                    </SelectItem>
                                    <SelectItem value="AI/ML">
                                      AI/Machine Learning
                                    </SelectItem>
                                    <SelectItem value="DevOps">
                                      DevOps
                                    </SelectItem>
                                    <SelectItem value="UI/UX Design">
                                      UI/UX Design
                                    </SelectItem>
                                    <SelectItem value="Product Management">
                                      Product Management
                                    </SelectItem>
                                  </>
                                )}
                                {jobFormData.company === "Finance" && (
                                  <>
                                    <SelectItem value="Investment Banking">
                                      Investment Banking
                                    </SelectItem>
                                    <SelectItem value="Financial Analysis">
                                      Financial Analysis
                                    </SelectItem>
                                    <SelectItem value="Risk Management">
                                      Risk Management
                                    </SelectItem>
                                    <SelectItem value="Accounting">
                                      Accounting
                                    </SelectItem>
                                    <SelectItem value="Financial Planning">
                                      Financial Planning
                                    </SelectItem>
                                    <SelectItem value="Corporate Finance">
                                      Corporate Finance
                                    </SelectItem>
                                    <SelectItem value="Insurance">
                                      Insurance
                                    </SelectItem>
                                    <SelectItem value="Fintech">
                                      Fintech
                                    </SelectItem>
                                  </>
                                )}
                                {jobFormData.company === "Healthcare" && (
                                  <>
                                    <SelectItem value="Medical Practice">
                                      Medical Practice
                                    </SelectItem>
                                    <SelectItem value="Nursing">
                                      Nursing
                                    </SelectItem>
                                    <SelectItem value="Healthcare Administration">
                                      {t(
                                        "suite.profile.industryOptions.healthcareAdministration",
                                      )}
                                    </SelectItem>
                                    <SelectItem value="Medical Research">
                                      Medical Research
                                    </SelectItem>
                                    <SelectItem value="Pharmacy">
                                      Pharmacy
                                    </SelectItem>
                                    <SelectItem value="Public Health">
                                      Public Health
                                    </SelectItem>
                                    <SelectItem value="Mental Health">
                                      Mental Health
                                    </SelectItem>
                                    <SelectItem value="Medical Technology">
                                      {t(
                                        "suite.profile.industryOptions.medicalTechnology",
                                      )}
                                    </SelectItem>
                                  </>
                                )}
                                {jobFormData.company === "Education" && (
                                  <>
                                    <SelectItem value="Teaching">
                                      Teaching
                                    </SelectItem>
                                    <SelectItem value="Educational Administration">
                                      {t(
                                        "suite.profile.industryOptions.educationalAdministration",
                                      )}
                                    </SelectItem>
                                    <SelectItem value="Curriculum Development">
                                      Curriculum Development
                                    </SelectItem>
                                    <SelectItem value="Educational Technology">
                                      {t(
                                        "suite.profile.industryOptions.educationalTechnology",
                                      )}
                                    </SelectItem>
                                    <SelectItem value="Student Services">
                                      Student Services
                                    </SelectItem>
                                    <SelectItem value="Research">
                                      Academic Research
                                    </SelectItem>
                                  </>
                                )}
                                {/* Add a generic "Other" option for all industries */}
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="prefer_not_to_say">
                                  {t(
                                    "suite.profile.industryOptions.preferNotToSay",
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                      {/* Only show Professional Summary for job seekers */}
                      {jobFormData.role === "job-seeker" && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                              {t("suite.profile.professionalSummary")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-blue-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={jobFieldVisibility.description}
                                onCheckedChange={() =>
                                  toggleJobFieldVisibility("description")
                                }
                                className="data-[state=checked]:bg-blue-500"
                              />
                            </div>
                          </div>
                          <Textarea
                            value={jobFormData.description || ""}
                            onChange={(e) =>
                              handleJobInputChange(
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "suite.profile.professionalSummaryPlaceholder",
                            )}
                            rows={3}
                            className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Job Details Section - only show if role is selected */}
                  {jobFormData.role && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Zap className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.jobDetails")}
                        </h3>
                      </div>

                      {jobFormData.role === "job-seeker" ? (
                        // Job Seeker Job Details
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.experienceLevel")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.experienceLevel}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("experienceLevel")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <Select
                              value={jobFormData.experienceLevel || ""}
                              onValueChange={(value) =>
                                handleJobInputChange("experienceLevel", value)
                              }
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                <SelectValue
                                  placeholder={t(
                                    "suite.profile.selectExperienceLevel",
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                <SelectItem value="Intern">Intern</SelectItem>
                                <SelectItem value="Entry">
                                  Entry Level (0-2 years)
                                </SelectItem>
                                <SelectItem value="Mid">
                                  Mid Level (3-5 years)
                                </SelectItem>
                                <SelectItem value="Senior">
                                  Senior (6-10 years)
                                </SelectItem>
                                <SelectItem value="Executive">
                                  Executive (10+ years)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        // Recruiter Job Details
                        <div className="space-y-4">
                          {/* Job Title field for recruiters */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.jobTitle")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.jobTitle}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("jobTitle")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <Input
                              value={jobFormData.jobTitle || ""}
                              onChange={(e) =>
                                handleJobInputChange("jobTitle", e.target.value)
                              }
                              placeholder={t(
                                "suite.profile.jobTitlePlaceholder",
                              )}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                  {t("suite.profile.workType")}
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-300">
                                    {t("suite.profile.show")}
                                  </span>
                                  <Switch
                                    checked={jobFieldVisibility.workType}
                                    onCheckedChange={() =>
                                      toggleJobFieldVisibility("workType")
                                    }
                                    className="data-[state=checked]:bg-blue-500"
                                  />
                                </div>
                              </div>
                              <Select
                                value={jobFormData.workType || ""}
                                onValueChange={(value) =>
                                  handleJobInputChange("workType", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue
                                    placeholder={t(
                                      "suite.profile.selectWorkType",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="Remote">
                                    {t("suite.profile.workTypeOptions.remote")}
                                  </SelectItem>
                                  <SelectItem value="In-person">
                                    {t(
                                      "suite.profile.workTypeOptions.inPerson",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="Hybrid">
                                    {t("suite.profile.workTypeOptions.hybrid")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                  {t("suite.profile.jobType")}
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-300">
                                    {t("suite.profile.show")}
                                  </span>
                                  <Switch
                                    checked={jobFieldVisibility.jobType}
                                    onCheckedChange={() =>
                                      toggleJobFieldVisibility("jobType")
                                    }
                                    className="data-[state=checked]:bg-blue-500"
                                  />
                                </div>
                              </div>
                              <Select
                                value={jobFormData.jobType || ""}
                                onValueChange={(value) =>
                                  handleJobInputChange("jobType", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue
                                    placeholder={t(
                                      "suite.profile.selectJobType",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="Full-time">
                                    {t("suite.profile.jobTypeOptions.fullTime")}
                                  </SelectItem>
                                  <SelectItem value="Part-time">
                                    {t("suite.profile.jobTypeOptions.partTime")}
                                  </SelectItem>
                                  <SelectItem value="Contract">
                                    {t("suite.profile.jobTypeOptions.contract")}
                                  </SelectItem>
                                  <SelectItem value="Internship">
                                    {t(
                                      "suite.profile.jobTypeOptions.internship",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                  {t("suite.profile.experienceLevel")}
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-300">
                                    {t("suite.profile.show")}
                                  </span>
                                  <Switch
                                    checked={jobFieldVisibility.experienceLevel}
                                    onCheckedChange={() =>
                                      toggleJobFieldVisibility(
                                        "experienceLevel",
                                      )
                                    }
                                    className="data-[state=checked]:bg-blue-500"
                                  />
                                </div>
                              </div>
                              <Select
                                value={jobFormData.experienceLevel || ""}
                                onValueChange={(value) =>
                                  handleJobInputChange("experienceLevel", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue
                                    placeholder={t("suite.profile.selectLevel")}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="Entry">
                                    {t(
                                      "suite.profile.experienceLevelOptions.entry",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="Mid">
                                    {t(
                                      "suite.profile.experienceLevelOptions.mid",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="Senior">
                                    {t(
                                      "suite.profile.experienceLevelOptions.senior",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="Executive">
                                    {t(
                                      "suite.profile.experienceLevelOptions.executive",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Salary field for recruiters */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.salary")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.salary}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("salary")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {/* Currency Selector */}
                              <Select
                                value={
                                  jobFormData.salaryCurrency ||
                                  user.countryOfOrigin ||
                                  "GHS"
                                }
                                onValueChange={(value) =>
                                  handleJobInputChange("salaryCurrency", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white max-h-60">
                                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                                  <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                                  <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                                  <SelectItem value="GHS">🇬🇭 GHS</SelectItem>
                                  <SelectItem value="NGN">🇳🇬 NGN</SelectItem>
                                  <SelectItem value="KES">🇰🇪 KES</SelectItem>
                                  <SelectItem value="ZAR">🇿🇦 ZAR</SelectItem>
                                  <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
                                  <SelectItem value="AUD">🇦🇺 AUD</SelectItem>
                                  <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
                                  <SelectItem value="CNY">🇨🇳 CNY</SelectItem>
                                  <SelectItem value="INR">🇮🇳 INR</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Amount Input */}
                              <Input
                                value={jobFormData.salary || ""}
                                onChange={(e) =>
                                  handleJobInputChange("salary", e.target.value)
                                }
                                placeholder={t(
                                  "suite.profile.salaryPlaceholder",
                                )}
                                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                              />

                              {/* Time Period Selector */}
                              <Select
                                value={jobFormData.salaryPeriod || "/year"}
                                onValueChange={(value) =>
                                  handleJobInputChange("salaryPeriod", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="/hour">
                                    {t("suite.profile.periodOptions.hour")}
                                  </SelectItem>
                                  <SelectItem value="/day">
                                    {t("suite.profile.periodOptions.day")}
                                  </SelectItem>
                                  <SelectItem value="/month">
                                    {t("suite.profile.periodOptions.month")}
                                  </SelectItem>
                                  <SelectItem value="/year">
                                    {t("suite.profile.periodOptions.year")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Additional Details Section - only show if role is selected */}
                  {jobFormData.role && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Network className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {jobFormData.role === "job-seeker"
                            ? t("suite.profile.workPreferences")
                            : t("suite.profile.additionalDetails")}
                        </h3>
                      </div>

                      {jobFormData.role === "job-seeker" ? (
                        // Job Seeker specific fields - Work type, Job type, and Expected Compensation
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                  {t("suite.profile.workType")}
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-300">
                                    {t("suite.profile.show")}
                                  </span>
                                  <Switch
                                    checked={jobFieldVisibility.workType}
                                    onCheckedChange={() =>
                                      toggleJobFieldVisibility("workType")
                                    }
                                    className="data-[state=checked]:bg-blue-500"
                                  />
                                </div>
                              </div>
                              <Select
                                value={jobFormData.workType || ""}
                                onValueChange={(value) =>
                                  handleJobInputChange("workType", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue
                                    placeholder={t(
                                      "suite.profile.selectWorkType",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="Remote">
                                    {t("suite.profile.workTypeOptions.remote")}
                                  </SelectItem>
                                  <SelectItem value="In-person">
                                    {t(
                                      "suite.profile.workTypeOptions.inPerson",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="Hybrid">
                                    {t("suite.profile.workTypeOptions.hybrid")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                  {t("suite.profile.jobType")}
                                </label>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-300">
                                    {t("suite.profile.show")}
                                  </span>
                                  <Switch
                                    checked={jobFieldVisibility.jobType}
                                    onCheckedChange={() =>
                                      toggleJobFieldVisibility("jobType")
                                    }
                                    className="data-[state=checked]:bg-blue-500"
                                  />
                                </div>
                              </div>
                              <Select
                                value={jobFormData.jobType || ""}
                                onValueChange={(value) =>
                                  handleJobInputChange("jobType", value)
                                }
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                  <SelectValue
                                    placeholder={t(
                                      "suite.profile.selectJobType",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  <SelectItem value="Full-time">
                                    {t("suite.profile.jobTypeOptions.fullTime")}
                                  </SelectItem>
                                  <SelectItem value="Part-time">
                                    {t("suite.profile.jobTypeOptions.partTime")}
                                  </SelectItem>
                                  <SelectItem value="Contract">
                                    {t("suite.profile.jobTypeOptions.contract")}
                                  </SelectItem>
                                  <SelectItem value="Internship">
                                    {t(
                                      "suite.profile.jobTypeOptions.internship",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                {t("suite.profile.expectedCompensation")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-blue-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.compensation}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("compensation")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex">
                              {/* Currency Selector */}
                              <Select
                                value={selectedCurrency}
                                onValueChange={setSelectedCurrency}
                              >
                                <SelectTrigger className="w-[80px] bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-l-xl backdrop-blur-xl font-['Inter'] border-r-0">
                                  <SelectValue>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm">
                                        {
                                          currencyOptions.find(
                                            (c) => c.code === selectedCurrency,
                                          )?.flag
                                        }
                                      </span>
                                      <span className="text-xs">
                                        {
                                          currencyOptions.find(
                                            (c) => c.code === selectedCurrency,
                                          )?.symbol
                                        }
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  {currencyOptions.map((currency) => (
                                    <SelectItem
                                      key={currency.code}
                                      value={currency.code}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <span className="text-lg">
                                          {currency.flag}
                                        </span>
                                        <span className="text-sm font-medium">
                                          {currency.symbol}
                                        </span>
                                        <span className="text-sm text-gray-300">
                                          {currency.code}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Compensation Input */}
                              <Input
                                value={jobFormData.compensation || ""}
                                onChange={(e) =>
                                  handleJobInputChange(
                                    "compensation",
                                    e.target.value,
                                  )
                                }
                                placeholder="70,000 - 85,000"
                                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 backdrop-blur-xl font-['Inter'] border-l-0 border-r-0 flex-1"
                              />

                              {/* Time Period Selector */}
                              <Select
                                value={selectedPeriod}
                                onValueChange={setSelectedPeriod}
                              >
                                <SelectTrigger className="w-[80px] bg-white/10 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/50 rounded-r-xl backdrop-blur-xl font-['Inter'] border-l-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                  {periodOptions.map((period) => (
                                    <SelectItem
                                      key={period.value}
                                      value={period.value}
                                    >
                                      {period.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Recruiter specific fields - keep existing additional details
                        <div className="space-y-4">
                          {/* Job Description field for recruiters */}
                          <div>
                            <label className="flex items-center justify-between text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                              <span>{t("suite.profile.jobDescription")} *</span>
                              <Switch
                                checked={jobFieldVisibility.description}
                                onCheckedChange={() =>
                                  toggleJobFieldVisibility("description")
                                }
                                className="data-[state=checked]:bg-blue-500"
                              />
                            </label>
                            <Textarea
                              value={jobFormData.description || ""}
                              onChange={(e) =>
                                handleJobInputChange(
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder={t(
                                "suite.profile.jobDescriptionPlaceholder",
                              )}
                              rows={3}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>

                          <div>
                            <label className="flex items-center justify-between text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                              <span>{t("suite.profile.whoShouldApply")}</span>
                              <Switch
                                checked={jobFieldVisibility.whoShouldApply}
                                onCheckedChange={() =>
                                  toggleJobFieldVisibility("whoShouldApply")
                                }
                                className="data-[state=checked]:bg-blue-500"
                              />
                            </label>
                            <Textarea
                              value={jobFormData.whoShouldApply || ""}
                              onChange={(e) =>
                                handleJobInputChange(
                                  "whoShouldApply",
                                  e.target.value,
                                )
                              }
                              placeholder={t(
                                "suite.profile.whoShouldApplyPlaceholder",
                              )}
                              rows={3}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center justify-between text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                <span>{t("suite.profile.applicationUrl")}</span>
                                <Switch
                                  checked={jobFieldVisibility.applicationUrl}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("applicationUrl")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </label>
                              <Input
                                value={jobFormData.applicationUrl || ""}
                                onChange={(e) =>
                                  handleJobInputChange(
                                    "applicationUrl",
                                    e.target.value,
                                  )
                                }
                                placeholder="https://company.com/apply"
                                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                              />
                            </div>
                            <div>
                              <label className="flex items-center justify-between text-sm font-medium text-blue-200 mb-2 font-['Inter']">
                                <span>
                                  {t("suite.profile.applicationEmail")}
                                </span>
                                <Switch
                                  checked={jobFieldVisibility.applicationEmail}
                                  onCheckedChange={() =>
                                    toggleJobFieldVisibility("applicationEmail")
                                  }
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </label>
                              <Input
                                value={jobFormData.applicationEmail || ""}
                                onChange={(e) =>
                                  handleJobInputChange(
                                    "applicationEmail",
                                    e.target.value,
                                  )
                                }
                                placeholder="careers@company.com"
                                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="relative z-10 bg-gradient-to-r from-slate-900/95 to-blue-900/95 backdrop-blur-xl border-t border-white/20 p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowJobDialog(false);
                      setJobFormData({});
                    }}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-xl font-['Inter'] text-sm"
                  >
                    {t("common.cancel")}
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        handleJobSave();
                        setShowJobDialog(false);
                      }}
                      disabled={saveJobProfileMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg font-['Inter'] font-semibold text-sm"
                    >
                      {saveJobProfileMutation.isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          {t("suite.profile.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("suite.profile.saveProfile")}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Networking Dialog */}
      {showNetworkingDialog &&
        (() => {
          console.log(
            "NETWORKING DIALOG RENDERING - showNetworkingDialog:",
            showNetworkingDialog,
          );
          console.log(
            "NETWORKING DIALOG - networkingFieldVisibility:",
            networkingFieldVisibility,
          );
          return true;
        })() && (
          <Dialog
            open={showNetworkingDialog}
            onOpenChange={setShowNetworkingDialog}
          >
            <DialogContent className="w-[95vw] max-w-4xl h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 border-2 border-emerald-300/30 shadow-2xl rounded-2xl">
              <div className="relative overflow-hidden h-full flex flex-col">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
                </div>

                {/* Header */}
                <div className="relative z-10 bg-gradient-to-r from-emerald-600/90 to-green-600/90 backdrop-blur-xl border-b border-emerald-200/10 p-4 flex-shrink-0">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5 }}
                          className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl flex items-center justify-center shadow-lg"
                        >
                          <Network className="w-5 h-5 text-white" />
                        </motion.div>
                        <div>
                          <DialogTitle className="text-lg md:text-2xl font-bold text-white font-['Space_Grotesk'] mb-1">
                            {networkingProfile
                              ? t("suite.profile.editNetworkingProfile")
                              : t("suite.profile.createNetworkingProfile")}
                          </DialogTitle>
                          <p className="text-emerald-100 font-['Inter'] text-xs md:text-sm">
                            {t("suite.profile.buildMeaningfulConnections")}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowNetworkingDialog(false)}
                        className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                      >
                        <X className="w-4 h-4 text-white" />
                      </motion.button>
                    </div>
                  </DialogHeader>
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide">
                  <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-20">
                    {/* Professional Overview */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.professionalOverview")}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Networking Photos Section */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.05 }}
                          className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <Camera className="w-5 h-5 text-emerald-400" />
                              <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                                {t("suite.profile.networkingPhotos")}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-emerald-200 font-['Inter']">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  networkingFieldVisibility.showNetworkingPhotos
                                }
                                onCheckedChange={() =>
                                  toggleNetworkingFieldVisibility(
                                    "showNetworkingPhotos",
                                  )
                                }
                                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                              />
                            </div>
                          </div>

                          {/* Section-specific Photo Manager */}
                          <SectionPhotoManager
                            section="networking"
                            photos={networkingPhotos.photos}
                            onPhotosUpdate={() => {
                              // Update section tracking for dynamic photo display
                              setLastUpdatedSection("networking");
                            }}
                            className="bg-white/5 border-white/10"
                            userId={user.id}
                            hideTitle={true}
                          />
                        </motion.div>

                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                              {t("suite.profile.professionalTagline")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-emerald-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  networkingFieldVisibility.professionalTagline
                                }
                                onCheckedChange={() =>
                                  toggleNetworkingFieldVisibility(
                                    "professionalTagline",
                                  )
                                }
                                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                              />
                            </div>
                          </div>
                          <Input
                            value={networkingFormData.professionalTagline || ""}
                            onChange={(e) =>
                              handleNetworkingInputChange(
                                "professionalTagline",
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "suite.profile.networkingPlaceholders.professionalTagline",
                            )}
                            className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                                {t("suite.profile.currentRole")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-emerald-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={
                                    networkingFieldVisibility.currentRole
                                  }
                                  onCheckedChange={() =>
                                    toggleNetworkingFieldVisibility(
                                      "currentRole",
                                    )
                                  }
                                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                                />
                              </div>
                            </div>
                            <Input
                              value={networkingFormData.currentRole || ""}
                              onChange={(e) =>
                                handleNetworkingInputChange(
                                  "currentRole",
                                  e.target.value,
                                )
                              }
                              placeholder={t(
                                "suite.profile.networkingPlaceholders.currentRole",
                              )}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                                {t("suite.profile.currentCompany")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-emerald-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={
                                    networkingFieldVisibility.currentCompany
                                  }
                                  onCheckedChange={() =>
                                    toggleNetworkingFieldVisibility(
                                      "currentCompany",
                                    )
                                  }
                                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                                />
                              </div>
                            </div>
                            <Input
                              value={networkingFormData.currentCompany || ""}
                              onChange={(e) =>
                                handleNetworkingInputChange(
                                  "currentCompany",
                                  e.target.value,
                                )
                              }
                              placeholder={t(
                                "suite.profile.networkingPlaceholders.currentCompany",
                              )}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                                {t("suite.profile.industry")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-emerald-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={networkingFieldVisibility.industry}
                                  onCheckedChange={() =>
                                    toggleNetworkingFieldVisibility("industry")
                                  }
                                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                                />
                              </div>
                            </div>
                            <Select
                              value={networkingFormData.industry || ""}
                              onValueChange={(value) => {
                                if (value === "custom") {
                                  setCustomIndustryInput("");
                                  setCustomIndustryContext("networking");
                                  setShowCustomIndustryDialog(true);
                                } else {
                                  handleNetworkingInputChange(
                                    "industry",
                                    value,
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                                <SelectValue
                                  placeholder={t(
                                    "suite.profile.selectIndustry",
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent
                                className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                                side="bottom"
                                align="start"
                                sideOffset={5}
                                alignOffset={0}
                                avoidCollisions={true}
                              >
                                {/* Show current custom value if it exists and isn't in predefined list */}
                                {networkingFormData.industry &&
                                  ![
                                    "prefer-not-to-say",
                                    "Technology",
                                    "Healthcare",
                                    "Finance",
                                    "Education",
                                    "Manufacturing",
                                    "Retail",
                                    "Consulting",
                                    "Media & Entertainment",
                                    "Government",
                                    "Non-profit",
                                    "Energy",
                                    "Transportation",
                                    "Real Estate",
                                    "Agriculture",
                                    "Construction",
                                    "Hospitality",
                                    "Legal",
                                    "Marketing & Advertising",
                                  ].includes(networkingFormData.industry) && (
                                    <SelectItem
                                      value={networkingFormData.industry}
                                    >
                                      {networkingFormData.industry} (Custom)
                                    </SelectItem>
                                  )}
                                <SelectItem value="prefer-not-to-say">
                                  {t(
                                    "suite.profile.industryOptions.preferNotToSay",
                                  )}
                                </SelectItem>
                                <SelectItem value="Technology">
                                  {t(
                                    "suite.profile.industryOptions.technology",
                                  )}
                                </SelectItem>
                                <SelectItem value="Healthcare">
                                  {t(
                                    "suite.profile.industryOptions.healthcare",
                                  )}
                                </SelectItem>
                                <SelectItem value="Finance">
                                  {t("suite.profile.industryOptions.finance")}
                                </SelectItem>
                                <SelectItem value="Education">
                                  {t("suite.profile.industryOptions.education")}
                                </SelectItem>
                                <SelectItem value="Manufacturing">
                                  Manufacturing
                                </SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Consulting">
                                  Consulting
                                </SelectItem>
                                <SelectItem value="Media & Entertainment">
                                  Media & Entertainment
                                </SelectItem>
                                <SelectItem value="Government">
                                  Government
                                </SelectItem>
                                <SelectItem value="Non-profit">
                                  Non-profit
                                </SelectItem>
                                <SelectItem value="Energy">Energy</SelectItem>
                                <SelectItem value="Transportation">
                                  Transportation
                                </SelectItem>
                                <SelectItem value="Real Estate">
                                  Real Estate
                                </SelectItem>
                                <SelectItem value="Agriculture">
                                  Agriculture
                                </SelectItem>
                                <SelectItem value="Construction">
                                  Construction
                                </SelectItem>
                                <SelectItem value="Hospitality">
                                  Hospitality
                                </SelectItem>
                                <SelectItem value="Legal">Legal</SelectItem>
                                <SelectItem value="Marketing & Advertising">
                                  Marketing & Advertising
                                </SelectItem>
                                <SelectItem value="custom">
                                  {t(
                                    "suite.profile.mentorshipStyleOptions.addCustom",
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                                {t("suite.profile.location")}
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-emerald-300">
                                  {t("suite.profile.show")}
                                </span>
                                <Switch
                                  checked={networkingFieldVisibility.location}
                                  onCheckedChange={() =>
                                    toggleNetworkingFieldVisibility("location")
                                  }
                                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                                />
                              </div>
                            </div>
                            <CityInput
                              value={networkingFormData.location || ""}
                              onLocationSelect={(location) =>
                                handleNetworkingInputChange(
                                  "location",
                                  location,
                                )
                              }
                              initialValue={networkingFormData.location || ""}
                              placeholder={t(
                                "suite.profile.networkingPlaceholders.location",
                              )}
                              className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                              showIcon={false}
                            />
                          </div>
                        </div>

                        {/* High School Field */}
                        <div>
                          <label className="flex items-center justify-between text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                            <span className="flex items-center">
                              {t("suite.profile.highSchool")}
                            </span>
                            <Switch
                              checked={networkingFieldVisibility.highSchool}
                              onCheckedChange={() =>
                                toggleNetworkingFieldVisibility("highSchool")
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                            />
                          </label>
                          <HighSchoolSearch
                            value={
                              sharedHighSchool ||
                              networkingFormData.highSchool ||
                              ""
                            }
                            onChange={(value) => {
                              setSharedHighSchool(value);
                              handleNetworkingInputChange("highSchool", value);
                            }}
                            placeholder={t("suite.profile.searchForHighSchool")}
                          />
                        </div>

                        {/* College/University Field */}
                        <div>
                          <label className="flex items-center justify-between text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                            <span className="flex items-center">
                              {t("suite.profile.vocationalCollegeUniversity")}
                            </span>
                            <Switch
                              checked={
                                networkingFieldVisibility.collegeUniversity
                              }
                              onCheckedChange={() =>
                                toggleNetworkingFieldVisibility(
                                  "collegeUniversity",
                                )
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                            />
                          </label>
                          <UniversitySearch
                            value={
                              sharedCollege ||
                              networkingFormData.collegeUniversity ||
                              ""
                            }
                            onChange={(value) => {
                              setSharedCollege(value);
                              handleNetworkingInputChange(
                                "collegeUniversity",
                                value,
                              );
                            }}
                            placeholder={t(
                              "suite.profile.searchForVocationalSchool",
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Networking Goals */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Zap className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.whatImLookingForAndCanOffer")}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="flex items-center justify-between text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                            <span>{t("suite.profile.whatImLookingFor")}</span>
                            <Switch
                              checked={networkingFieldVisibility.lookingFor}
                              onCheckedChange={() => {
                                console.log("SWITCH CLICKED: lookingFor");
                                toggleNetworkingFieldVisibility("lookingFor");
                              }}
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                            />
                          </label>
                          <Textarea
                            value={networkingFormData.lookingFor || ""}
                            onChange={(e) =>
                              handleNetworkingInputChange(
                                "lookingFor",
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "suite.profile.networkingPlaceholders.lookingFor",
                            )}
                            rows={3}
                            className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                          />
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-sm font-medium text-emerald-200 mb-2 font-['Inter']">
                            <span>{t("suite.profile.whatICanOffer")}</span>
                            <Switch
                              checked={networkingFieldVisibility.canOffer}
                              onCheckedChange={() =>
                                toggleNetworkingFieldVisibility("canOffer")
                              }
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
                            />
                          </label>
                          <Textarea
                            value={networkingFormData.canOffer || ""}
                            onChange={(e) =>
                              handleNetworkingInputChange(
                                "canOffer",
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "suite.profile.networkingPlaceholders.canOffer",
                            )}
                            rows={3}
                            className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="relative z-10 bg-gradient-to-r from-emerald-900/95 to-green-900/95 backdrop-blur-xl border-t border-emerald-200/20 p-3 md:p-4 flex-shrink-0">
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNetworkingDialog(false);
                        setNetworkingFormData({});
                      }}
                      className="bg-emerald-100/10 border-emerald-200/20 text-white hover:bg-emerald-100/20 backdrop-blur-xl font-['Inter'] text-sm"
                    >
                      {t("suite.profile.cancel")}
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={() => {
                          handleNetworkingSave();
                          setShowNetworkingDialog(false);
                        }}
                        disabled={saveNetworkingProfileMutation.isPending}
                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg font-['Inter'] font-semibold text-sm"
                      >
                        {saveNetworkingProfileMutation.isPending ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                            />
                            {t("suite.profile.saving")}
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {t("suite.profile.saveProfile")}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      {/* Profile Preview Modals */}
      {showJobPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowJobPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <Button
              onClick={() => setShowJobPreview(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-black p-0"
              variant="outline"
            >
              ×
            </Button>
            {renderJobSwipecard()}
          </motion.div>
        </motion.div>
      )}

      {showMentorshipPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMentorshipPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <Button
              onClick={() => setShowMentorshipPreview(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-black p-0"
              variant="outline"
            >
              ×
            </Button>
            {renderMentorshipSwipecard()}
          </motion.div>
        </motion.div>
      )}

      {showNetworkingPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNetworkingPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <Button
              onClick={() => setShowNetworkingPreview(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-black p-0"
              variant="outline"
            >
              ×
            </Button>
            {renderNetworkingSwipecard()}
          </motion.div>
        </motion.div>
      )}

      {/* Mentorship Dialog */}
      {showMentorshipDialog && (
        <Dialog
          open={showMentorshipDialog}
          onOpenChange={setShowMentorshipDialog}
        >
          <DialogContent className="w-[95vw] max-w-4xl h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-900 via-purple-900 to-pink-900 border-2 border-white/30 shadow-2xl rounded-2xl">
            <div className="relative overflow-hidden h-full flex flex-col">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-magenta-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
              </div>

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-xl border-b border-white/10 p-4 flex-shrink-0">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg"
                      >
                        <Users className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <DialogTitle className="text-lg md:text-2xl font-bold text-white font-['Space_Grotesk'] mb-1">
                          {mentorshipProfile
                            ? t("suite.profile.editMentorshipProfile")
                            : t("suite.profile.createMentorshipProfile")}
                        </DialogTitle>
                        <p className="text-purple-100 font-['Inter'] text-xs md:text-sm">
                          {t("suite.profile.craftMentorshipProfileSubtitle")}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowMentorshipDialog(false)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </DialogHeader>
              </div>

              {/* Main Content - Scrollable */}
              <div className="relative z-10 flex-1 overflow-y-auto">
                <div className="p-4 md:p-6 space-y-6">
                  {/* Your Role Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <Star className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                        {t("suite.profile.yourRole")}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-purple-200 font-['Inter']">
                        {t("suite.profile.iWantToBeA")} *
                      </label>
                      <Select
                        value={mentorshipFormData.role || ""}
                        onValueChange={(value) =>
                          handleMentorshipInputChange(
                            "role",
                            value as "mentor" | "mentee",
                          )
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                          <SelectValue
                            placeholder={t("suite.profile.selectYourRole")}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="mentor">
                            {t("suite.mentorship.mentor")}
                          </SelectItem>
                          <SelectItem value="mentee">
                            {t("suite.mentorship.mentee")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>

                  {/* Professional Photo Section - only show if role is selected */}
                  {mentorshipFormData.role && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Camera className="w-5 h-5 text-green-400" />
                          <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                            {t("suite.profile.professionalPhoto")}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-purple-200 font-['Inter']">
                            {t("suite.profile.show")}
                          </span>
                          <Switch
                            checked={mentorshipFieldVisibility.showProfilePhoto}
                            onCheckedChange={() =>
                              toggleMentorshipFieldVisibility(
                                "showProfilePhoto",
                              )
                            }
                            className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-200"
                          />
                        </div>
                      </div>

                      <SectionPhotoManager
                        section="mentorship"
                        photos={mentorshipPhotos.photos}
                        onPhotosUpdate={() => {
                          // Update section tracking for dynamic photo display
                          setLastUpdatedSection("mentorship");
                        }}
                        userId={user.id}
                        className="bg-white/5 border-white/10 rounded-xl p-4 backdrop-blur-xl"
                      />
                    </motion.div>
                  )}

                  {/* Basic Information Section */}
                  {mentorshipFormData.role && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-6">
                        <Zap className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.basicInformation")}
                        </h3>
                      </div>

                      <div className="space-y-6">
                        {/* Time Commitment */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-purple-200 font-['Inter']">
                              {t("suite.profile.timeCommitment")}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-purple-200 font-['Inter']">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.timeCommitment
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "timeCommitment",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={mentorshipFormData.timeCommitment || ""}
                            onValueChange={(value) =>
                              handleMentorshipInputChange(
                                "timeCommitment",
                                value,
                              )
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-cyan-400 focus:ring-cyan-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue placeholder="Select time commitment" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white">
                              <SelectItem value="Light (1-2 hrs/month)">
                                {t("suite.profile.timeCommitmentOptions.light")}
                              </SelectItem>
                              <SelectItem value="Regular (3-5 hrs/month)">
                                {t(
                                  "suite.profile.timeCommitmentOptions.regular",
                                )}
                              </SelectItem>
                              <SelectItem value="Intensive (5+ hrs/month)">
                                {t(
                                  "suite.profile.timeCommitmentOptions.intensive",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Availability */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-purple-200 font-['Inter']">
                              {t("suite.profile.availability")}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-purple-200 font-['Inter']">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={mentorshipFieldVisibility.availability}
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "availability",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={mentorshipFormData.availability || ""}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                const customValue = prompt(
                                  "Enter your availability:",
                                );
                                if (customValue) {
                                  handleMentorshipInputChange(
                                    "availability",
                                    customValue,
                                  );
                                }
                              } else {
                                handleMentorshipInputChange(
                                  "availability",
                                  value,
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-cyan-400 focus:ring-cyan-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectAvailability",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="Prefer not to say">
                                {t(
                                  "suite.profile.availabilityOptions.preferNotToSay",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekday Mornings">
                                {t(
                                  "suite.profile.availabilityOptions.weekdayMornings",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekday Afternoons">
                                {t(
                                  "suite.profile.availabilityOptions.weekdayAfternoons",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekday Evenings">
                                {t(
                                  "suite.profile.availabilityOptions.weekdayEvenings",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekend Mornings">
                                {t(
                                  "suite.profile.availabilityOptions.weekendMornings",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekend Afternoons">
                                {t(
                                  "suite.profile.availabilityOptions.weekendAfternoons",
                                )}
                              </SelectItem>
                              <SelectItem value="Weekend Evenings">
                                {t(
                                  "suite.profile.availabilityOptions.weekendEvenings",
                                )}
                              </SelectItem>
                              <SelectItem value="Flexible Weekdays">
                                {t(
                                  "suite.profile.availabilityOptions.flexibleWeekdays",
                                )}
                              </SelectItem>
                              <SelectItem value="Flexible Weekends">
                                {t(
                                  "suite.profile.availabilityOptions.flexibleWeekends",
                                )}
                              </SelectItem>
                              <SelectItem value="Very Flexible">
                                {t(
                                  "suite.profile.availabilityOptions.veryFlexible",
                                )}
                              </SelectItem>
                              <SelectItem value="Business Hours Only">
                                {t(
                                  "suite.profile.availabilityOptions.businessHoursOnly",
                                )}
                              </SelectItem>
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.availabilityOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Location */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-purple-200 font-['Inter']">
                              {t("suite.profile.location")}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-purple-200 font-['Inter']">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={mentorshipFieldVisibility.location}
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility("location")
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <CityInput
                            value={mentorshipFormData.location || ""}
                            onLocationSelect={(location) =>
                              handleMentorshipInputChange("location", location)
                            }
                            initialValue={mentorshipFormData.location || ""}
                            placeholder={t("suite.profile.cityCountry")}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:border-cyan-400 focus:ring-cyan-400/50 backdrop-blur-xl font-['Inter']"
                            showIcon={false}
                          />
                        </div>

                        {/* High School Field */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter'] flex items-center">
                              {t("suite.profile.highSchool")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={mentorshipFieldVisibility.highSchool}
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility("highSchool")
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <HighSchoolSearch
                            value={
                              sharedHighSchool ||
                              mentorshipFormData.highSchool ||
                              ""
                            }
                            onChange={(value) => {
                              setSharedHighSchool(value);
                              handleMentorshipInputChange("highSchool", value);
                            }}
                            placeholder={t("suite.profile.searchForHighSchool")}
                          />
                        </div>

                        {/* College/University Field */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter'] flex items-center">
                              {t("suite.profile.vocationalCollegeUniversity")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.collegeUniversity
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "collegeUniversity",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <UniversitySearch
                            value={
                              sharedCollege ||
                              mentorshipFormData.collegeUniversity ||
                              ""
                            }
                            onChange={(value) => {
                              setSharedCollege(value);
                              handleMentorshipInputChange(
                                "collegeUniversity",
                                value,
                              );
                            }}
                            placeholder={t(
                              "suite.profile.searchForVocationalSchool",
                            )}
                          />
                        </div>

                        {/* Languages Spoken */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.languagesSpoken")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.languagesSpoken
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "languagesSpoken",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>

                          {/* Display selected languages as badges */}
                          {mentorshipFormData.languagesSpoken &&
                            mentorshipFormData.languagesSpoken.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mentorshipFormData.languagesSpoken.map(
                                  (language, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-purple-200 border border-green-400/30 backdrop-blur-sm"
                                    >
                                      {language}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedLanguages =
                                            mentorshipFormData.languagesSpoken?.filter(
                                              (_, i) => i !== index,
                                            ) || [];
                                          handleMentorshipInputChange(
                                            "languagesSpoken",
                                            updatedLanguages,
                                          );
                                        }}
                                        className="ml-2 hover:text-red-400 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value === "custom") {
                                const customValue = prompt(
                                  "Enter a language you speak:",
                                );
                                if (customValue && customValue.trim()) {
                                  const currentLanguages =
                                    mentorshipFormData.languagesSpoken || [];
                                  if (
                                    !currentLanguages.includes(
                                      customValue.trim(),
                                    )
                                  ) {
                                    handleMentorshipInputChange(
                                      "languagesSpoken",
                                      [...currentLanguages, customValue.trim()],
                                    );
                                  }
                                }
                              } else if (
                                value &&
                                value !== "prefer-not-to-say"
                              ) {
                                const currentLanguages =
                                  mentorshipFormData.languagesSpoken || [];
                                if (!currentLanguages.includes(value)) {
                                  handleMentorshipInputChange(
                                    "languagesSpoken",
                                    [...currentLanguages, value],
                                  );
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t("suite.profile.addALanguage")}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="prefer-not-to-say">
                                Prefer not to say
                              </SelectItem>

                              {/* African Languages */}
                              <SelectItem value="Afrikaans">
                                Afrikaans
                              </SelectItem>
                              <SelectItem value="Akan">Akan</SelectItem>
                              <SelectItem value="Amharic">Amharic</SelectItem>
                              <SelectItem value="Arabic">Arabic</SelectItem>
                              <SelectItem value="Ashanti">Ashanti</SelectItem>
                              <SelectItem value="Dagbani">Dagbani</SelectItem>
                              <SelectItem value="Ewe">Ewe</SelectItem>
                              <SelectItem value="Fante">Fante</SelectItem>
                              <SelectItem value="Ga">Ga</SelectItem>
                              <SelectItem value="Gonja">Gonja</SelectItem>
                              <SelectItem value="Hausa">Hausa</SelectItem>
                              <SelectItem value="Igbo">Igbo</SelectItem>
                              <SelectItem value="Kikuyu">Kikuyu</SelectItem>
                              <SelectItem value="Lingala">Lingala</SelectItem>
                              <SelectItem value="Shona">Shona</SelectItem>
                              <SelectItem value="Swahili">Swahili</SelectItem>
                              <SelectItem value="Twi">Twi</SelectItem>
                              <SelectItem value="Wolof">Wolof</SelectItem>
                              <SelectItem value="Xhosa">Xhosa</SelectItem>
                              <SelectItem value="Yoruba">Yoruba</SelectItem>
                              <SelectItem value="Zulu">Zulu</SelectItem>

                              {/* European Languages */}
                              <SelectItem value="Albanian">Albanian</SelectItem>
                              <SelectItem value="Bulgarian">
                                Bulgarian
                              </SelectItem>
                              <SelectItem value="Croatian">Croatian</SelectItem>
                              <SelectItem value="Czech">Czech</SelectItem>
                              <SelectItem value="Danish">Danish</SelectItem>
                              <SelectItem value="Dutch">Dutch</SelectItem>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="Estonian">Estonian</SelectItem>
                              <SelectItem value="Finnish">Finnish</SelectItem>
                              <SelectItem value="French">French</SelectItem>
                              <SelectItem value="German">German</SelectItem>
                              <SelectItem value="Greek">Greek</SelectItem>
                              <SelectItem value="Hungarian">
                                Hungarian
                              </SelectItem>
                              <SelectItem value="Icelandic">
                                Icelandic
                              </SelectItem>
                              <SelectItem value="Irish">Irish</SelectItem>
                              <SelectItem value="Italian">Italian</SelectItem>
                              <SelectItem value="Latvian">Latvian</SelectItem>
                              <SelectItem value="Lithuanian">
                                Lithuanian
                              </SelectItem>
                              <SelectItem value="Norwegian">
                                Norwegian
                              </SelectItem>
                              <SelectItem value="Polish">Polish</SelectItem>
                              <SelectItem value="Portuguese">
                                Portuguese
                              </SelectItem>
                              <SelectItem value="Romanian">Romanian</SelectItem>
                              <SelectItem value="Russian">Russian</SelectItem>
                              <SelectItem value="Serbian">Serbian</SelectItem>
                              <SelectItem value="Slovak">Slovak</SelectItem>
                              <SelectItem value="Slovenian">
                                Slovenian
                              </SelectItem>
                              <SelectItem value="Spanish">Spanish</SelectItem>
                              <SelectItem value="Swedish">Swedish</SelectItem>
                              <SelectItem value="Ukrainian">
                                Ukrainian
                              </SelectItem>

                              {/* Asian Languages */}
                              <SelectItem value="Bengali">Bengali</SelectItem>
                              <SelectItem value="Cantonese">
                                Cantonese
                              </SelectItem>
                              <SelectItem value="Filipino">Filipino</SelectItem>
                              <SelectItem value="Gujarati">Gujarati</SelectItem>
                              <SelectItem value="Hindi">Hindi</SelectItem>
                              <SelectItem value="Indonesian">
                                Indonesian
                              </SelectItem>
                              <SelectItem value="Japanese">Japanese</SelectItem>
                              <SelectItem value="Javanese">Javanese</SelectItem>
                              <SelectItem value="Kannada">Kannada</SelectItem>
                              <SelectItem value="Korean">Korean</SelectItem>
                              <SelectItem value="Malay">Malay</SelectItem>
                              <SelectItem value="Malayalam">
                                Malayalam
                              </SelectItem>
                              <SelectItem value="Mandarin">Mandarin</SelectItem>
                              <SelectItem value="Marathi">Marathi</SelectItem>
                              <SelectItem value="Punjabi">Punjabi</SelectItem>
                              <SelectItem value="Tamil">Tamil</SelectItem>
                              <SelectItem value="Telugu">Telugu</SelectItem>
                              <SelectItem value="Thai">Thai</SelectItem>
                              <SelectItem value="Turkish">Turkish</SelectItem>
                              <SelectItem value="Urdu">Urdu</SelectItem>
                              <SelectItem value="Vietnamese">
                                Vietnamese
                              </SelectItem>

                              {/* Middle Eastern Languages */}
                              <SelectItem value="Armenian">Armenian</SelectItem>
                              <SelectItem value="Azerbaijani">
                                Azerbaijani
                              </SelectItem>
                              <SelectItem value="Farsi">
                                Farsi (Persian)
                              </SelectItem>
                              <SelectItem value="Georgian">Georgian</SelectItem>
                              <SelectItem value="Hebrew">Hebrew</SelectItem>
                              <SelectItem value="Kurdish">Kurdish</SelectItem>

                              {/* Other Languages */}
                              <SelectItem value="Esperanto">
                                Esperanto
                              </SelectItem>
                              <SelectItem value="Latin">Latin</SelectItem>
                              <SelectItem value="Sign Language">
                                Sign Language
                              </SelectItem>

                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Mentor Details - Combined Section */}
                  {mentorshipFormData.role === "mentor" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Users className="w-5 h-5 text-teal-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.mentorDetails")}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Industries or Domains */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              Industries or Domains
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.industriesOrDomains
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "industriesOrDomains",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={
                              Array.isArray(
                                mentorshipFormData.industriesOrDomains,
                              ) &&
                              mentorshipFormData.industriesOrDomains.length > 0
                                ? mentorshipFormData.industriesOrDomains[0]
                                : ""
                            }
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setCustomIndustryInput("");
                                setCustomIndustryContext("mentorship");
                                setShowCustomIndustryDialog(true);
                              } else if (value) {
                                handleMentorshipInputChange(
                                  "industriesOrDomains",
                                  [value],
                                );
                                // Clear areas of expertise when industry changes
                                handleMentorshipInputChange(
                                  "areasOfExpertise",
                                  [],
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectIndustryOrDomain",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              {/* Show current custom value if it exists and isn't in predefined list */}
                              {Array.isArray(
                                mentorshipFormData.industriesOrDomains,
                              ) &&
                                mentorshipFormData.industriesOrDomains.length >
                                  0 &&
                                mentorshipFormData.industriesOrDomains[0] &&
                                ![
                                  "Technology",
                                  "Finance & Banking",
                                  "Healthcare & Medicine",
                                  "Education & Academia",
                                  "Consulting & Strategy",
                                  "Marketing & Advertising",
                                  "Sales & Business Development",
                                  "Human Resources",
                                  "Operations & Supply Chain",
                                  "Legal & Compliance",
                                  "Real Estate",
                                  "Media & Entertainment",
                                  "Non-Profit & Social Impact",
                                  "Government & Public Policy",
                                  "Manufacturing",
                                  "Retail & E-commerce",
                                  "Energy & Utilities",
                                  "Agriculture & Food",
                                  "Transportation & Logistics",
                                  "Architecture & Construction",
                                ].includes(
                                  mentorshipFormData.industriesOrDomains[0],
                                ) && (
                                  <SelectItem
                                    value={
                                      mentorshipFormData.industriesOrDomains[0]
                                    }
                                  >
                                    {mentorshipFormData.industriesOrDomains[0]}{" "}
                                    (Custom)
                                  </SelectItem>
                                )}
                              <SelectItem value="Technology">
                                Technology
                              </SelectItem>
                              <SelectItem value="Finance & Banking">
                                {t(
                                  "suite.profile.industryOptions.financeBanking",
                                )}
                              </SelectItem>
                              <SelectItem value="Healthcare & Medicine">
                                {t(
                                  "suite.profile.industryOptions.healthcareMedicine",
                                )}
                              </SelectItem>
                              <SelectItem value="Education & Academia">
                                {t(
                                  "suite.profile.industryOptions.educationAcademia",
                                )}
                              </SelectItem>
                              <SelectItem value="Consulting & Strategy">
                                Consulting & Strategy
                              </SelectItem>
                              <SelectItem value="Marketing & Advertising">
                                Marketing & Advertising
                              </SelectItem>
                              <SelectItem value="Sales & Business Development">
                                Sales & Business Development
                              </SelectItem>
                              <SelectItem value="Human Resources">
                                Human Resources
                              </SelectItem>
                              <SelectItem value="Operations & Supply Chain">
                                Operations & Supply Chain
                              </SelectItem>
                              <SelectItem value="Legal & Compliance">
                                Legal & Compliance
                              </SelectItem>
                              <SelectItem value="Real Estate">
                                Real Estate
                              </SelectItem>
                              <SelectItem value="Media & Entertainment">
                                Media & Entertainment
                              </SelectItem>
                              <SelectItem value="Non-Profit & Social Impact">
                                Non-Profit & Social Impact
                              </SelectItem>
                              <SelectItem value="Government & Public Policy">
                                Government & Public Policy
                              </SelectItem>
                              <SelectItem value="Manufacturing">
                                Manufacturing
                              </SelectItem>
                              <SelectItem value="Retail & E-commerce">
                                Retail & E-commerce
                              </SelectItem>
                              <SelectItem value="Energy & Utilities">
                                Energy & Utilities
                              </SelectItem>
                              <SelectItem value="Agriculture & Food">
                                Agriculture & Food
                              </SelectItem>
                              <SelectItem value="Transportation & Logistics">
                                Transportation & Logistics
                              </SelectItem>
                              <SelectItem value="Architecture & Construction">
                                {t(
                                  "suite.profile.industryOptions.architectureConstruction",
                                )}
                              </SelectItem>
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Areas of Expertise - Dynamic based on Industry */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.areasOfExpertise")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.areasOfExpertise
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "areasOfExpertise",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>

                          {/* Display selected expertise as badges */}
                          {mentorshipFormData.areasOfExpertise &&
                            mentorshipFormData.areasOfExpertise.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mentorshipFormData.areasOfExpertise.map(
                                  (expertise, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 border border-teal-400/30 backdrop-blur-sm"
                                    >
                                      {expertise}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedExpertise =
                                            mentorshipFormData.areasOfExpertise?.filter(
                                              (_, i) => i !== index,
                                            ) || [];
                                          handleMentorshipInputChange(
                                            "areasOfExpertise",
                                            updatedExpertise,
                                          );
                                        }}
                                        className="ml-2 hover:text-red-400 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value && value !== "custom") {
                                const currentExpertise =
                                  mentorshipFormData.areasOfExpertise || [];
                                if (!currentExpertise.includes(value)) {
                                  handleMentorshipInputChange(
                                    "areasOfExpertise",
                                    [...currentExpertise, value],
                                  );
                                }
                              } else if (value === "custom") {
                                setShowCustomExpertiseDialog(true);
                              }
                            }}
                            disabled={
                              !mentorshipFormData.industriesOrDomains ||
                              mentorshipFormData.industriesOrDomains.length ===
                                0
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={
                                  !mentorshipFormData.industriesOrDomains ||
                                  mentorshipFormData.industriesOrDomains
                                    .length === 0
                                    ? t("suite.profile.selectIndustryFirst")
                                    : "Select area of expertise"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              {(() => {
                                const selectedIndustry =
                                  mentorshipFormData.industriesOrDomains?.[0];

                                const expertiseMap: Record<string, string[]> = {
                                  Technology: [
                                    "Software Engineering",
                                    "Data Science & Analytics",
                                    "Product Management",
                                    "DevOps & Infrastructure",
                                    "Cybersecurity",
                                    "AI & Machine Learning",
                                    "Mobile Development",
                                    "Web Development",
                                    "Cloud Computing",
                                    "UI/UX Design",
                                  ],
                                  "Finance & Banking": [
                                    "Investment Banking",
                                    "Corporate Finance",
                                    "Risk Management",
                                    "Financial Planning",
                                    "Wealth Management",
                                    "Trading & Markets",
                                    "Compliance",
                                    "Fintech",
                                    "Insurance",
                                    "Real Estate Finance",
                                  ],
                                  "Healthcare & Medicine": [
                                    "Clinical Practice",
                                    "Healthcare Administration",
                                    "Medical Research",
                                    "Public Health",
                                    "Nursing",
                                    "Pharmacy",
                                    "Medical Technology",
                                    "Healthcare Policy",
                                    "Mental Health",
                                    "Emergency Medicine",
                                  ],
                                  "Education & Academia": [
                                    "Teaching & Pedagogy",
                                    "Educational Leadership",
                                    "Curriculum Development",
                                    "Academic Research",
                                    "Student Affairs",
                                    "Educational Technology",
                                    "Special Education",
                                    "Higher Education",
                                    "K-12 Education",
                                    "Adult Learning",
                                  ],
                                  "Consulting & Strategy": [
                                    "Management Consulting",
                                    "Strategy Development",
                                    "Business Transformation",
                                    "Organizational Development",
                                    "Change Management",
                                    "Process Improvement",
                                    "Market Research",
                                    "Due Diligence",
                                    "Digital Transformation",
                                    "Advisory Services",
                                  ],
                                  "Marketing & Advertising": [
                                    "Digital Marketing",
                                    "Brand Management",
                                    "Content Strategy",
                                    "Social Media Marketing",
                                    "SEO/SEM",
                                    "Market Research",
                                    "Creative Direction",
                                    "Public Relations",
                                    "Event Marketing",
                                    "Growth Marketing",
                                  ],
                                  "Sales & Business Development": [
                                    "B2B Sales",
                                    "B2C Sales",
                                    "Account Management",
                                    "Business Development",
                                    "Sales Operations",
                                    "Channel Partnerships",
                                    "Lead Generation",
                                    "Customer Success",
                                    "Sales Leadership",
                                    "Territory Management",
                                  ],
                                  "Human Resources": [
                                    "Talent Acquisition",
                                    "Learning & Development",
                                    "Compensation & Benefits",
                                    "Employee Relations",
                                    "Performance Management",
                                    "HR Technology",
                                    "Diversity & Inclusion",
                                    "Organizational Psychology",
                                    "Workforce Planning",
                                    "HR Analytics",
                                  ],
                                  "Operations & Supply Chain": [
                                    "Supply Chain Management",
                                    "Operations Management",
                                    "Logistics",
                                    "Quality Management",
                                    "Process Optimization",
                                    "Procurement",
                                    "Inventory Management",
                                    "Manufacturing",
                                    "Lean Six Sigma",
                                    "Project Management",
                                  ],
                                  "Legal & Compliance": [
                                    "Corporate Law",
                                    "Contract Law",
                                    "Regulatory Compliance",
                                    "Intellectual Property",
                                    "Employment Law",
                                    "Litigation",
                                    "Privacy & Data Protection",
                                    "Securities Law",
                                    "Tax Law",
                                    "Legal Operations",
                                  ],
                                };

                                const expertise = (selectedIndustry &&
                                  expertiseMap[selectedIndustry]) || [
                                  "Leadership",
                                  "Strategic Planning",
                                  "Team Management",
                                  "Project Management",
                                  "Communication",
                                  "Problem Solving",
                                ];

                                return expertise.map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {item}
                                  </SelectItem>
                                ));
                              })()}
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Mentorship Style */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.mentorshipStyle")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.mentorshipStyle
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "mentorshipStyle",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={mentorshipFormData.mentorshipStyle || ""}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                const customValue = prompt(
                                  "Enter your mentorship style:",
                                );
                                if (customValue && customValue.trim()) {
                                  handleMentorshipInputChange(
                                    "mentorshipStyle",
                                    customValue.trim(),
                                  );
                                }
                              } else {
                                handleMentorshipInputChange(
                                  "mentorshipStyle",
                                  value,
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectMentorshipStyle",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="Prefer not to say">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.preferNotToSay",
                                )}
                              </SelectItem>
                              <SelectItem value="Hands-on & Practical">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.handsOnPractical",
                                )}
                              </SelectItem>
                              <SelectItem value="Philosophical & Reflective">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.philosophicalReflective",
                                )}
                              </SelectItem>
                              <SelectItem value="Career-focused & Goal-oriented">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.careerFocusedGoalOriented",
                                )}
                              </SelectItem>
                              <SelectItem value="Supportive Listener">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.supportiveListener",
                                )}
                              </SelectItem>
                              <SelectItem value="Accountability Partner">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.accountabilityPartner",
                                )}
                              </SelectItem>
                              <SelectItem value="Technical Expert">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.technicalExpert",
                                )}
                              </SelectItem>
                              <SelectItem value="Life Coach">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.lifeCoach",
                                )}
                              </SelectItem>
                              <SelectItem value="Industry Navigator">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.industryNavigator",
                                )}
                              </SelectItem>
                              <SelectItem value="Creative Collaborator">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.creativeCollaborator",
                                )}
                              </SelectItem>
                              <SelectItem value="Problem Solver">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.problemSolver",
                                )}
                              </SelectItem>
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Why I Mentor */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.whyMentor")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={mentorshipFieldVisibility.whyMentor}
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility("whyMentor")
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Textarea
                            value={mentorshipFormData.whyMentor || ""}
                            onChange={(e) =>
                              handleMentorshipInputChange(
                                "whyMentor",
                                e.target.value,
                              )
                            }
                            placeholder={t("suite.profile.shareYourMotivation")}
                            rows={3}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:border-purple-400 focus:ring-purple-400/50 backdrop-blur-xl font-['Inter'] resize-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Mentee Details - Combined Section */}
                  {mentorshipFormData.role === "mentee" && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <Users className="w-5 h-5 text-teal-400" />
                        <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {t("suite.profile.menteeDetails")}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {/* Learning Goals - Multi-select Dropdown */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.learningGoals")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.learningGoals
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "learningGoals",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>

                          {/* Display selected goals as badges */}
                          {mentorshipFormData.learningGoals &&
                            mentorshipFormData.learningGoals.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mentorshipFormData.learningGoals.map(
                                  (goal, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-200 border border-purple-400/30 backdrop-blur-sm"
                                    >
                                      {goal}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedGoals =
                                            mentorshipFormData.learningGoals?.filter(
                                              (_, i) => i !== index,
                                            ) || [];
                                          handleMentorshipInputChange(
                                            "learningGoals",
                                            updatedGoals,
                                          );
                                        }}
                                        className="ml-2 hover:text-red-400 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ),
                                )}
                              </div>
                            )}

                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value && value !== "custom") {
                                const currentGoals =
                                  mentorshipFormData.learningGoals || [];
                                if (!currentGoals.includes(value)) {
                                  handleMentorshipInputChange("learningGoals", [
                                    ...currentGoals,
                                    value,
                                  ]);
                                }
                              } else if (value === "custom") {
                                const customValue = prompt(
                                  "Enter your learning goal:",
                                );
                                if (customValue && customValue.trim()) {
                                  const currentGoals =
                                    mentorshipFormData.learningGoals || [];
                                  if (
                                    !currentGoals.includes(customValue.trim())
                                  ) {
                                    handleMentorshipInputChange(
                                      "learningGoals",
                                      [...currentGoals, customValue.trim()],
                                    );
                                  }
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectLearningGoal",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="Prefer not to say">
                                {t(
                                  "suite.profile.learningGoalOptions.preferNotToSay",
                                )}
                              </SelectItem>
                              <SelectItem value="Leadership & Management">
                                {t(
                                  "suite.profile.learningGoalOptions.leadershipManagement",
                                )}
                              </SelectItem>
                              <SelectItem value="Resume Building & Career Strategy">
                                {t(
                                  "suite.profile.learningGoalOptions.resumeBuildingCareerStrategy",
                                )}
                              </SelectItem>
                              <SelectItem value="Product Management">
                                {t(
                                  "suite.profile.learningGoalOptions.productManagement",
                                )}
                              </SelectItem>
                              <SelectItem value="Scholarships & Financial Aid">
                                {t(
                                  "suite.profile.learningGoalOptions.scholarshipsFinancialAid",
                                )}
                              </SelectItem>
                              <SelectItem value="Programming & Coding">
                                {t(
                                  "suite.profile.learningGoalOptions.programmingCoding",
                                )}
                              </SelectItem>
                              <SelectItem value="Public Speaking & Communication">
                                {t(
                                  "suite.profile.learningGoalOptions.publicSpeakingCommunication",
                                )}
                              </SelectItem>
                              <SelectItem value="Networking & Relationship Building">
                                {t(
                                  "suite.profile.learningGoalOptions.networkingRelationshipBuilding",
                                )}
                              </SelectItem>
                              <SelectItem value="Interview Preparation">
                                {t(
                                  "suite.profile.learningGoalOptions.interviewPreparation",
                                )}
                              </SelectItem>
                              <SelectItem value="Entrepreneurship & Startups">
                                {t(
                                  "suite.profile.learningGoalOptions.entrepreneurshipStartups",
                                )}
                              </SelectItem>
                              <SelectItem value="Data Science & Analytics">
                                {t(
                                  "suite.profile.learningGoalOptions.dataScienceAnalytics",
                                )}
                              </SelectItem>
                              <SelectItem value="Design & Creative Skills">
                                {t(
                                  "suite.profile.learningGoalOptions.designCreativeSkills",
                                )}
                              </SelectItem>
                              <SelectItem value="Sales & Business Development">
                                {t(
                                  "suite.profile.learningGoalOptions.salesBusinessDevelopment",
                                )}
                              </SelectItem>
                              <SelectItem value="Graduate School Applications">
                                {t(
                                  "suite.profile.learningGoalOptions.graduateSchoolApplications",
                                )}
                              </SelectItem>
                              <SelectItem value="Work-Life Balance">
                                {t(
                                  "suite.profile.learningGoalOptions.workLifeBalance",
                                )}
                              </SelectItem>
                              <SelectItem value="Industry Transition">
                                {t(
                                  "suite.profile.learningGoalOptions.industryTransition",
                                )}
                              </SelectItem>
                              <SelectItem value="Technical Skills Development">
                                {t(
                                  "suite.profile.learningGoalOptions.technicalSkillsDevelopment",
                                )}
                              </SelectItem>
                              <SelectItem value="Personal Branding">
                                {t(
                                  "suite.profile.learningGoalOptions.personalBranding",
                                )}
                              </SelectItem>
                              <SelectItem value="Confidence Building">
                                {t(
                                  "suite.profile.learningGoalOptions.confidenceBuilding",
                                )}
                              </SelectItem>
                              <SelectItem value="Time Management">
                                {t(
                                  "suite.profile.learningGoalOptions.timeManagement",
                                )}
                              </SelectItem>
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.learningGoalOptions.customOption",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Why I'm Seeking Mentorship */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              Why I'm Seeking Mentorship
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.whySeekMentorship
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "whySeekMentorship",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Textarea
                            value={mentorshipFormData.whySeekMentorship || ""}
                            onChange={(e) =>
                              handleMentorshipInputChange(
                                "whySeekMentorship",
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "suite.profile.describeMentorshipGoals",
                            )}
                            rows={3}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:border-teal-400 focus:ring-teal-400/50 backdrop-blur-xl font-['Inter'] resize-none"
                          />
                        </div>

                        {/* Preferred Mentorship Style */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.preferredMentorshipStyle")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.preferredMentorshipStyle
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "preferredMentorshipStyle",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={
                              mentorshipFormData.preferredMentorshipStyle || ""
                            }
                            onValueChange={(value) => {
                              if (value === "custom") {
                                const customValue = prompt(
                                  "Enter your preferred mentorship style:",
                                );
                                if (customValue && customValue.trim()) {
                                  handleMentorshipInputChange(
                                    "preferredMentorshipStyle",
                                    customValue.trim(),
                                  );
                                }
                              } else {
                                handleMentorshipInputChange(
                                  "preferredMentorshipStyle",
                                  value,
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectPreferredStyle",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="Prefer not to say">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.preferNotToSay",
                                )}
                              </SelectItem>
                              <SelectItem value="Hands-on & Practical">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.handsOnPractical",
                                )}
                              </SelectItem>
                              <SelectItem value="Philosophical & Reflective">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.philosophicalReflective",
                                )}
                              </SelectItem>
                              <SelectItem value="Career-focused & Goal-oriented">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.careerFocusedGoalOriented",
                                )}
                              </SelectItem>
                              <SelectItem value="Supportive Listener">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.supportiveListener",
                                )}
                              </SelectItem>
                              <SelectItem value="Accountability Partner">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.accountabilityPartner",
                                )}
                              </SelectItem>
                              <SelectItem value="Technical Expert">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.technicalExpert",
                                )}
                              </SelectItem>
                              <SelectItem value="Life Coach">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.lifeCoach",
                                )}
                              </SelectItem>
                              <SelectItem value="Industry Navigator">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.industryNavigator",
                                )}
                              </SelectItem>
                              <SelectItem value="Creative Collaborator">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.creativeCollaborator",
                                )}
                              </SelectItem>
                              <SelectItem value="Problem Solver">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.problemSolver",
                                )}
                              </SelectItem>
                              <SelectItem value="Just-in-time Advice">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.justInTimeAdvice",
                                )}
                              </SelectItem>
                              <SelectItem value="Structured Learning">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.structuredLearning",
                                )}
                              </SelectItem>
                              <SelectItem value="custom">
                                {t(
                                  "suite.profile.mentorshipStyleOptions.addCustom",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Industry Aspiration */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                              {t("suite.profile.industryAspiration")}
                            </label>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-purple-300">
                                {t("suite.profile.show")}
                              </span>
                              <Switch
                                checked={
                                  mentorshipFieldVisibility.industryAspiration
                                }
                                onCheckedChange={() =>
                                  toggleMentorshipFieldVisibility(
                                    "industryAspiration",
                                  )
                                }
                                className="data-[state=checked]:bg-purple-500"
                              />
                            </div>
                          </div>
                          <Select
                            value={mentorshipFormData.industryAspiration || ""}
                            onValueChange={(value) =>
                              handleMentorshipInputChange(
                                "industryAspiration",
                                value,
                              )
                            }
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-green-400 focus:ring-green-400/50 rounded-xl backdrop-blur-xl font-['Inter']">
                              <SelectValue
                                placeholder={t(
                                  "suite.profile.selectIndustryAspiration",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-slate-800 border-slate-600 text-white max-h-64 overflow-y-auto"
                              side="bottom"
                              align="start"
                              sideOffset={5}
                              alignOffset={0}
                              avoidCollisions={true}
                            >
                              <SelectItem value="Technology">
                                {t("suite.profile.industryOptions.technology")}
                              </SelectItem>
                              <SelectItem value="Finance & Banking">
                                {t(
                                  "suite.profile.industryOptions.financeBanking",
                                )}
                              </SelectItem>
                              <SelectItem value="Healthcare & Medicine">
                                {t(
                                  "suite.profile.industryOptions.healthcareMedicine",
                                )}
                              </SelectItem>
                              <SelectItem value="Education & Academia">
                                {t(
                                  "suite.profile.industryOptions.educationAcademia",
                                )}
                              </SelectItem>
                              <SelectItem value="Consulting & Strategy">
                                {t(
                                  "suite.profile.industryOptions.consultingStrategy",
                                )}
                              </SelectItem>
                              <SelectItem value="Marketing & Advertising">
                                {t(
                                  "suite.profile.industryOptions.marketingAdvertising",
                                )}
                              </SelectItem>
                              <SelectItem value="Sales & Business Development">
                                {t(
                                  "suite.profile.industryOptions.salesBusinessDevelopment",
                                )}
                              </SelectItem>
                              <SelectItem value="Human Resources">
                                {t(
                                  "suite.profile.industryOptions.humanResources",
                                )}
                              </SelectItem>
                              <SelectItem value="Operations & Supply Chain">
                                {t(
                                  "suite.profile.industryOptions.operationsSupplyChain",
                                )}
                              </SelectItem>
                              <SelectItem value="Legal & Compliance">
                                {t(
                                  "suite.profile.industryOptions.legalCompliance",
                                )}
                              </SelectItem>
                              <SelectItem value="Real Estate">
                                {t("suite.profile.industryOptions.realEstate")}
                              </SelectItem>
                              <SelectItem value="Media & Entertainment">
                                {t(
                                  "suite.profile.industryOptions.mediaEntertainment",
                                )}
                              </SelectItem>
                              <SelectItem value="Non-Profit & Social Impact">
                                {t(
                                  "suite.profile.industryOptions.nonProfitSocialImpact",
                                )}
                              </SelectItem>
                              <SelectItem value="Government & Public Policy">
                                {t(
                                  "suite.profile.industryOptions.governmentPublicPolicy",
                                )}
                              </SelectItem>
                              <SelectItem value="Manufacturing">
                                {t(
                                  "suite.profile.industryOptions.manufacturing",
                                )}
                              </SelectItem>
                              <SelectItem value="Retail & E-commerce">
                                {t(
                                  "suite.profile.industryOptions.retailEcommerce",
                                )}
                              </SelectItem>
                              <SelectItem value="Energy & Utilities">
                                {t(
                                  "suite.profile.industryOptions.energyUtilities",
                                )}
                              </SelectItem>
                              <SelectItem value="Agriculture & Food">
                                {t(
                                  "suite.profile.industryOptions.agricultureFood",
                                )}
                              </SelectItem>
                              <SelectItem value="Transportation & Logistics">
                                {t(
                                  "suite.profile.industryOptions.transportationLogistics",
                                )}
                              </SelectItem>
                              <SelectItem value="Architecture & Construction">
                                {t(
                                  "suite.profile.industryOptions.architectureConstruction",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="relative z-10 bg-gradient-to-r from-purple-900/95 to-pink-800/95 backdrop-blur-xl border-t border-white/20 p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMentorshipDialog(false);
                      setMentorshipFormData({});
                    }}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-xl font-['Inter'] text-sm"
                  >
                    {t("suite.profile.cancel")}
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        handleMentorshipSave();
                        setShowMentorshipDialog(false);
                      }}
                      disabled={saveMentorshipProfileMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg font-['Inter'] font-semibold text-sm"
                    >
                      {saveMentorshipProfileMutation.isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("suite.profile.saveProfile")}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom Industry Input Dialog */}
      {showCustomIndustryDialog && (
        <Dialog
          open={showCustomIndustryDialog}
          onOpenChange={setShowCustomIndustryDialog}
        >
          <DialogContent className="w-[90vw] max-w-md bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 border-2 border-white/30 shadow-2xl rounded-2xl p-0 overflow-hidden">
            <div className="relative">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              </div>

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-xl border-b border-white/10 p-4">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-8 h-8 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg"
                      >
                        <Briefcase className="w-4 h-4 text-white" />
                      </motion.div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-white font-['Space_Grotesk']">
                          Add Custom Industry
                        </DialogTitle>
                        <p className="text-purple-100 font-['Inter'] text-sm">
                          Enter your specific industry
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowCustomIndustryDialog(false)}
                      className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                    >
                      <X className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </DialogHeader>
              </div>

              {/* Content */}
              <div className="relative z-10 p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <label className="block text-sm font-medium text-purple-200 mb-3 font-['Inter']">
                    Industry Name
                  </label>
                  <Input
                    value={customIndustryInput}
                    onChange={(e) => setCustomIndustryInput(e.target.value)}
                    placeholder="e.g., Renewable Energy, EdTech, FinTech..."
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customIndustryInput.trim()) {
                        handleNetworkingInputChange(
                          "industry",
                          customIndustryInput.trim(),
                        );
                        setShowCustomIndustryDialog(false);
                        setCustomIndustryInput("");
                      }
                    }}
                  />
                </motion.div>
              </div>

              {/* Footer */}
              <div className="relative z-10 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-xl border-t border-white/20 p-4">
                <div className="flex items-center justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCustomIndustryDialog(false);
                      setCustomIndustryInput("");
                    }}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-xl font-['Inter'] text-sm"
                  >
                    {t("suite.profile.cancel")}
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => {
                        console.log(
                          "[CUSTOM-INDUSTRY] Add Industry button clicked",
                        );
                        console.log(
                          "[CUSTOM-INDUSTRY] Current input value:",
                          customIndustryInput,
                        );
                        if (customIndustryInput.trim()) {
                          console.log(
                            "[CUSTOM-INDUSTRY] Saving to context:",
                            customIndustryContext,
                            "with value:",
                            customIndustryInput.trim(),
                          );

                          if (customIndustryContext === "networking") {
                            handleNetworkingInputChange(
                              "industry",
                              customIndustryInput.trim(),
                            );
                          } else if (customIndustryContext === "mentorship") {
                            handleMentorshipInputChange("industriesOrDomains", [
                              customIndustryInput.trim(),
                            ]);
                            // Clear areas of expertise when industry changes
                            handleMentorshipInputChange("areasOfExpertise", []);
                          }

                          setShowCustomIndustryDialog(false);
                          setCustomIndustryInput("");
                          console.log(
                            "[CUSTOM-INDUSTRY] Dialog closed and input cleared",
                          );
                        } else {
                          console.log(
                            "[CUSTOM-INDUSTRY] Input is empty, not saving",
                          );
                        }
                      }}
                      disabled={!customIndustryInput.trim()}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg font-['Inter'] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Industry
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Mentorship Profile Dialog */}
      <AlertDialog
        open={showDeleteMentorshipDialog}
        onOpenChange={setShowDeleteMentorshipDialog}
      >
        <AlertDialogContent className="max-w-[85vw] sm:max-w-md mx-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-500/30 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-['Space_Grotesk'] text-xl flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20 border border-red-400/30">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              {t("suite.profile.deleteMentorshipProfile")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 font-['Inter'] text-base leading-relaxed">
              {t("suite.profile.deleteMentorshipConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-center gap-3 pt-4">
            <AlertDialogCancel
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-['Inter'] font-medium transition-all duration-200"
              disabled={deleteMentorshipProfileMutation.isPending}
            >
              {t("suite.profile.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMentorshipProfileMutation.mutate(mentorshipRoleToDelete);
                setShowDeleteMentorshipDialog(false);
              }}
              disabled={deleteMentorshipProfileMutation.isPending}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-['Inter'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteMentorshipProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("suite.profile.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("profile.delete")} {t("navigation.profile")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Networking Profile Dialog */}
      <AlertDialog
        open={showDeleteNetworkingDialog}
        onOpenChange={setShowDeleteNetworkingDialog}
      >
        <AlertDialogContent className="max-w-[85vw] sm:max-w-md mx-auto bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 border border-emerald-500/30 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-['Space_Grotesk'] text-xl flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20 border border-red-400/30">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              Delete Networking Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 font-['Inter'] text-base leading-relaxed">
              Are you sure you want to delete your networking profile?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-center gap-3 pt-4">
            <AlertDialogCancel
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-['Inter'] font-medium transition-all duration-200"
              disabled={deleteNetworkingProfileMutation.isPending}
            >
              {t("suite.profile.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteNetworkingProfileMutation.mutate();
                setShowDeleteNetworkingDialog(false);
              }}
              disabled={deleteNetworkingProfileMutation.isPending}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-['Inter'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteNetworkingProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("profile.delete")} {t("navigation.profile")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Job Profile Dialog */}
      <AlertDialog
        open={showDeleteJobDialog}
        onOpenChange={setShowDeleteJobDialog}
      >
        <AlertDialogContent className="max-w-[85vw] sm:max-w-md mx-auto bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-blue-500/30 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-['Space_Grotesk'] text-xl flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20 border border-red-400/30">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              Delete Job Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 font-['Inter'] text-base leading-relaxed">
              Are you sure you want to delete your job profile?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-center gap-3 pt-4">
            <AlertDialogCancel
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-['Inter'] font-medium transition-all duration-200"
              disabled={deleteJobProfileMutation.isPending}
            >
              {t("suite.profile.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteJobProfileMutation.mutate();
                setShowDeleteJobDialog(false);
              }}
              disabled={deleteJobProfileMutation.isPending}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-['Inter'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteJobProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("profile.delete")} {t("navigation.profile")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expandable Profile Picture Modal */}
      <ExpandableSwipeCardModal
        user={user}
        isOpen={showExpandableModal}
        onClose={() => setShowExpandableModal(false)}
        mode="SUITE"
        profileType={
          lastUpdatedSection === "job"
            ? "jobs"
            : lastUpdatedSection === "mentorship"
              ? "mentorship"
              : lastUpdatedSection === "networking"
                ? "networking"
                : jobProfile
                  ? "jobs"
                  : mentorshipProfile
                    ? "mentorship"
                    : networkingProfile
                      ? "networking"
                      : "networking"
        }
        additionalData={{
          jobPrimaryPhotoUrl: primaryUrls.job,
          mentorshipPrimaryPhotoUrl: primaryUrls.mentorship,
          networkingPrimaryPhotoUrl: primaryUrls.networking,
          currentPrimaryPhoto: getDisplayPhoto(),
        }}
        isPremium={user?.premiumAccess || false}
        isFromSuiteProfile={true}
        disableSwipe={true}
      />

      {/* Custom Expertise Input Dialog */}
      <Dialog
        open={showCustomExpertiseDialog}
        onOpenChange={setShowCustomExpertiseDialog}
      >
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-purple-900/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Add Custom Expertise
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2 font-['Inter']">
                Your Area of Expertise
              </label>
              <Input
                value={customExpertiseInput}
                onChange={(e) => setCustomExpertiseInput(e.target.value)}
                placeholder="e.g., Machine Learning, Digital Marketing, Project Management"
                className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:ring-purple-400/50 rounded-xl backdrop-blur-xl font-['Inter']"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomExpertiseSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setCustomExpertiseInput("");
                setShowCustomExpertiseDialog(false);
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-xl font-['Inter'] text-sm"
            >
              {t("suite.profile.cancel")}
            </Button>
            <Button
              onClick={handleCustomExpertiseSubmit}
              disabled={!customExpertiseInput.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg font-['Inter'] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Expertise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
