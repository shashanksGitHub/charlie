import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppMode } from "@/hooks/use-app-mode";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLocation } from "wouter";
import { useSplashScreen } from "@/contexts/splash-screen-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRealTimeDiscovery } from "@/hooks/use-real-time-discovery";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase,
  GraduationCap,
  BookOpen,
  Users,
  MapPin,
  Clock,
  Star,
  MessageCircle,
  X,
  Zap,
  Building,
  Target,
  Sparkles,
  Heart,
  Check,
  ArrowLeft,
  Undo,
  Loader2,
  Calendar,
  Trophy,
  Building2,
  DollarSign,
  FileText,
  UserCheck,
  Link,
  Mail,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnder18 } from "@/lib/age-utils";
import { t } from "@/hooks/use-language";
import { SuiteStarButton } from "@/components/suite/suite-star-button";
import { PremiumUpgradeDialog } from "@/components/settings/premium-upgrade-dialog";
import "@/components/ui/handshake-animation.css";
import "@/components/ui/briefcase-animation.css";
import "@/components/ui/padlock-animation.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types for different card categories
type JobCard = {
  id: string;
  type: "job";
  role: "job-seeker" | "recruiter";
  fullName: string;
  jobTitle: string;
  workType?: "Remote" | "In-person" | "Hybrid";
  jobType?: "Full-time" | "Part-time" | "Contract" | "Internship";
  experienceLevel?: "Entry" | "Mid" | "Senior" | "Executive";
  skills: string[];
  desiredIndustry?: string;
  photoUrl?: string;
  userId?: number;
  company?: string;
  compensation?: string;
  salary?: string;
  // Dynamic salary fields
  salaryCurrency?: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryPeriod?: string;
  description?: string;
  requirements?: string;
  whoShouldApply?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  fieldVisibility?: any; // Visibility preferences for this job profile
  isVerified?: boolean; // User verification status
};

type MentorshipCard = {
  id: string;
  userId: number; // Add missing userId field
  type: "mentorship";
  name: string;
  profession: string;
  field: string;
  mentorshipStyle: string;
  availability: string;
  photoUrl?: string;
  isMentor: boolean;
  role?: string;
  areasOfExpertise?: string[];
  learningGoals?: string[];
  languagesSpoken?: string[];
  industriesOrDomains?: string[];
  timeCommitment?: string;
  whyMentor?: string;
  whySeekMentorship?: string;
  preferredMentorshipStyle?: string;
  preferredFormat?: string;
  communicationStyle?: string;
  location?: string;
  successStories?: string;
  preferredMenteeLevel?: string;
  preferredMentorExperience?: string;
  preferredIndustries?: string;
  maxMentees?: number;
  currentMentees?: number;
  visibilityPreferences?: string;
  fieldVisibility?: any; // Add field visibility preferences
  industryAspiration?: string;
  sparkIndicator?: number;
  highSchool?: string; // Add education field
  collegeUniversity?: string; // Add education field
  isVerified?: boolean; // User verification status
};

type NetworkingCard = {
  id: string;
  userId: number; // Add missing userId field
  type: "networking";
  name: string;
  professionalTag: string;
  currentRole: string;
  currentCompany: string;
  industry: string;
  lookingFor: string;
  canOffer: string;
  sharedInterests: string[];
  sparkIndicator: number; // 1-5 alignment score
  photoUrl?: string;
  location?: string;
  highSchool?: string;
  collegeUniversity?: string;
  fieldVisibility?: {
    showProfilePhoto?: boolean;
    professionalTagline?: boolean;
    currentRole?: boolean;
    currentCompany?: boolean;
    industry?: boolean;
    workplace?: boolean;
    experienceYears?: boolean;
    lookingFor?: boolean;
    canOffer?: boolean;
    workingStyle?: boolean;
    professionalInterests?: boolean;
    networkingGoals?: boolean;
    lightUpWhenTalking?: boolean;
    languagesSpoken?: boolean;
    openToCollaborateOn?: boolean;
    preferredNetworkingFormat?: boolean;
    signatureAchievement?: boolean;
    timezone?: boolean;
    location?: boolean;
    highSchool?: boolean;
    collegeUniversity?: boolean;
  };
  isVerified?: boolean; // User verification status
};

type SuiteCard = JobCard | MentorshipCard | NetworkingCard;

export default function SuiteNetworkPage() {
  const { user } = useAuth();
  const { currentMode, setAppMode } = useAppMode();
  const { darkMode } = useDarkMode();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Use t function directly from import
  const queryClient = useQueryClient();
  const { showSplash } = useSplashScreen();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Initialize cardType with URL parameter, persisted tab preference, or default to "networking"
  // Touch event handling to prevent double firing and conflicts (same as MEET cards)
  const touchHandledRef = useRef(false);

  const [cardType, setCardType] = useState<"job" | "mentorship" | "networking">(
    () => {
      const under18 = user ? isUnder18(user.dateOfBirth) : false;
      // First check URL parameters
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get("tab");
        if (
          tabParam &&
          (tabParam === "job" ||
            tabParam === "mentorship" ||
            tabParam === "networking")
        ) {
          const initialTab = tabParam as "job" | "mentorship" | "networking";
          return under18 && initialTab === "job" ? "networking" : initialTab;
        }
      } catch (error) {
        console.warn("Failed to parse URL parameters:", error);
      }

      // Fall back to saved tab preference
      try {
        const savedTab = localStorage.getItem(
          `suite_network_last_tab_${user?.id}`,
        );
        if (
          savedTab &&
          (savedTab === "job" ||
            savedTab === "mentorship" ||
            savedTab === "networking")
        ) {
          const initialSaved = savedTab as "job" | "mentorship" | "networking";
          return under18 && initialSaved === "job"
            ? "networking"
            : initialSaved;
        }
      } catch (error) {
        console.warn("Failed to load saved tab preference:", error);
      }
      return "networking";
    },
  );
  const [swiping, setSwiping] = useState<"left" | "right" | null>(null);
  const [cardEntering, setCardEntering] = useState(false);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<
    "left" | "right" | null
  >(null);

  // New synchronized bidirectional animation states
  const [currentCardExiting, setCurrentCardExiting] = useState(false);
  const [currentCardExitDirection, setCurrentCardExitDirection] = useState<
    "left" | "right" | null
  >(null);
  const [previousCardEntering, setPreviousCardEntering] = useState(false);
  const [previousCardEnterDirection, setPreviousCardEnterDirection] = useState<
    "left" | "right" | null
  >(null);

  // Briefcase animation state for SUITE Jobs and Mentorship (separate states)
  const [briefcaseAnimating, setBriefcaseAnimating] = useState(false);
  const [jobBriefcaseHidden, setJobBriefcaseHidden] = useState(false);
  const [mentorshipBriefcaseHidden, setMentorshipBriefcaseHidden] =
    useState(false);
  const [lastMentorshipCardUserId, setLastMentorshipCardUserId] = useState<
    string | null
  >(null);

  // Arrow guide system for padlock unlock
  const [showArrowGuide, setShowArrowGuide] = useState(false);
  const [arrowGuideType, setArrowGuideType] = useState<
    "job" | "mentorship" | "networking" | null
  >(null);
  const [showNetworkingProfilePrompt, setShowNetworkingProfilePrompt] =
    useState(false);
  const [showMentorshipProfilePrompt, setShowMentorshipProfilePrompt] =
    useState(false);
  const [showJobProfilePrompt, setShowJobProfilePrompt] = useState(false);

  // Premium functionality state with database-backed access
  const { data: premiumStatus, isLoading: premiumLoading } = useQuery({
    queryKey: ["/api/premium/status"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  const isPremium = false; // SUITE functionality is free for all users
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [
    showCreateNetworkingProfileModal,
    setShowCreateNetworkingProfileModal,
  ] = useState(false);

  // Tinder-style physics states (matching MEET swipecard implementation)
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentTransform = useRef({ x: 0, y: 0, rotation: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0, time: 0 });
  const animationId = useRef<number | null>(null);

  // Animation state for programmatic swipes (button clicks)
  const [isAnimating, setIsAnimating] = useState(false);
  const [cursorState, setCursorState] = useState<"grab" | "grabbing">("grab");

  // Undo restore animation state
  const [restoreAnimationClass, setRestoreAnimationClass] = useState("");

  // Card entrance animation state (like MEET's next-card-slide-up)
  const [nextCardAnimationClass, setNextCardAnimationClass] = useState("");

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  // Enforce under-18 restriction: prevent selecting Jobs tab via URL or state
  useEffect(() => {
    const under18 = user ? isUnder18(user.dateOfBirth) : false;
    if (under18 && cardType === "job") {
      setCardType("networking");
      try {
        const newUrl = new URL(window.location.href);
        if (newUrl.searchParams.get("tab") === "job") {
          newUrl.searchParams.set("tab", "networking");
          window.history.replaceState({}, "", newUrl.toString());
        }
      } catch {}
    }
  }, [user, cardType]);

  // Reset card state when switching between cards (like MEET does)
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
      cardRef.current.style.transform = "translate(0px, 0px) rotate(0deg)";
    }
    // Reset physics state for new card
    currentTransform.current = { x: 0, y: 0, rotation: 0 };
    velocity.current = { x: 0, y: 0 };
    setIsAnimating(false);
    setCursorState("grab");
  }, [currentCardIndex, cardType]); // Reset when card changes

  // Handle premium upgrade click
  const handlePremiumUpgradeClick = () => {
    setShowPremiumDialog(true);
  };

  // Handle create networking profile click for premium users without active profile
  const handleCreateNetworkingProfileClick = () => {
    setShowCreateNetworkingProfileModal(true);
  };

  // Card refs only - no physics or animation variables
  const jobCardRef = useRef<HTMLDivElement>(null);
  const mentorshipCardRef = useRef<HTMLDivElement>(null);
  const networkingCardRef = useRef<HTMLDivElement>(null);

  // Check if user has an active networking profile with aggressive caching
  const { data: userNetworkingProfile, isLoading: profileCheckLoading } =
    useQuery({
      queryKey: ["/api/suite/networking-profile"],
      queryFn: async () => {
        console.log("[PROFILE-CHECK] 🚀 Checking networking profile...");
        const startTime = Date.now();
        const response = await apiRequest("/api/suite/networking-profile");
        if (!response.ok) {
          throw new Error("Failed to fetch user networking profile");
        }
        const data = await response.json();
        const duration = Date.now() - startTime;
        console.log(
          `[PROFILE-CHECK] ⚡ Networking profile checked in ${duration}ms`,
        );
        return data;
      },
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
      gcTime: 10 * 60 * 1000, // 10 minutes retention
    });

  // Check if user has an active mentorship profile with aggressive caching
  const {
    data: userMentorshipProfile,
    isLoading: mentorshipProfileCheckLoading,
  } = useQuery({
    queryKey: ["/api/suite/mentorship-profile"],
    queryFn: async () => {
      console.log("[PROFILE-CHECK] 🚀 Checking mentorship profile...");
      const startTime = Date.now();
      const response = await apiRequest("/api/suite/mentorship-profile");
      if (!response.ok) {
        throw new Error("Failed to fetch user mentorship profile");
      }
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(
        `[PROFILE-CHECK] ⚡ Mentorship profile checked in ${duration}ms`,
      );
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes retention
  });

  // Check if user has an active job profile with aggressive caching
  const { data: userJobProfile, isLoading: jobProfileCheckLoading } = useQuery({
    queryKey: ["/api/suite/job-profile"],
    queryFn: async () => {
      console.log("[PROFILE-CHECK] 🚀 Checking job profile...");
      const startTime = Date.now();
      const response = await apiRequest("/api/suite/job-profile");
      if (!response.ok) {
        throw new Error("Failed to fetch user job profile");
      }
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[PROFILE-CHECK] ⚡ Job profile checked in ${duration}ms`);
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes retention
  });

  // Real-time discovery system for networking
  const { refreshDiscovery: refreshNetworking } = useRealTimeDiscovery(
    "networking",
    !!user,
  );

  // Fetch real networking profiles from SUITE discovery API with instant loading
  const {
    data: networkingProfiles,
    isLoading: networkingLoading,
    isError: networkingError,
    error: networkingApiError,
    refetch: refetchNetworkingProfiles,
  } = useQuery({
    queryKey: ["/api/suite/discovery/networking"],
    queryFn: async () => {
      console.log("[SUITE-DISCOVERY] 🚀 Loading networking profiles...");
      const startTime = Date.now();
      const response = await apiRequest("/api/suite/discovery/networking");
      if (!response.ok) {
        throw new Error("Failed to fetch networking profiles");
      }
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[SUITE-DISCOVERY] ⚡ Networking loaded in ${duration}ms`);
      return data;
    },
    enabled: !!user, // INSTANT LOADING: Always load when user is authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes fresh cache for instant loading
    gcTime: 30 * 60 * 1000, // 30 minutes in memory for better performance
    refetchOnMount: false, // Use cache first
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
    retryDelay: 300,
  });

  // Batch calculate compatibility scores for networking profiles to ensure percentage badges appear
  const { mutate: calculateBatchCompatibility } = useMutation({
    mutationFn: async (profileIds: number[]) => {
      const response = await fetch("/api/suite/compatibility/batch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate batch compatibility");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the compatibility rating queries to refresh percentage badges
      queryClient.invalidateQueries({
        queryKey: ["suite-compatibility-rating"],
      });
    },
  });

  // DISABLED: Automatic batch compatibility calculation to match mentorship behavior
  // Compatibility scores should only be calculated when users click percentage badges
  // useEffect(() => {
  //   if (networkingProfiles && Array.isArray(networkingProfiles) && networkingProfiles.length > 0) {
  //     const profileIds = networkingProfiles.map(profile => profile.id).filter(id => id);
  //     if (profileIds.length > 0) {
  //       calculateBatchCompatibility(profileIds);
  //     }
  //   }
  // }, [networkingProfiles, calculateBatchCompatibility]);

  // Real-time discovery system for mentorship
  const { refreshDiscovery: refreshMentorship } = useRealTimeDiscovery(
    "mentorship",
    !!user,
  );

  // Real-time discovery system for jobs
  const { refreshDiscovery: refreshJobs } = useRealTimeDiscovery("job", !!user);

  // Fetch real mentorship profiles from SUITE discovery API with instant loading
  const {
    data: mentorshipProfiles,
    isLoading: mentorshipLoading,
    isError: mentorshipError,
    error: mentorshipApiError,
    refetch: refetchMentorshipProfiles,
  } = useQuery({
    queryKey: ["/api/suite/discovery/mentorship"],
    queryFn: async () => {
      console.log("[SUITE-DISCOVERY] 🚀 Loading mentorship profiles...");
      const startTime = Date.now();
      const response = await apiRequest("/api/suite/discovery/mentorship");
      if (!response.ok) {
        throw new Error("Failed to fetch mentorship profiles");
      }
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[SUITE-DISCOVERY] ⚡ Mentorship loaded in ${duration}ms`);
      return data;
    },
    enabled: !!user, // INSTANT LOADING: Always load when user is authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes fresh cache for instant loading
    gcTime: 30 * 60 * 1000, // 30 minutes in memory for better performance
    refetchOnMount: false, // Use cache first
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
    retryDelay: 300,
  });

  // Briefcase animation logic - restore briefcase when user moves to different mentorship card
  useEffect(() => {
    if (
      cardType === "mentorship" &&
      mentorshipProfiles &&
      mentorshipProfiles[currentCardIndex]
    ) {
      const currentCard = mentorshipProfiles[currentCardIndex];
      const currentUserId = currentCard?.userId?.toString() || currentCard?.id;

      // If this is a different card than the last one, restore the briefcase and reset padlock
      if (
        lastMentorshipCardUserId !== null &&
        lastMentorshipCardUserId !== currentUserId
      ) {
        setMentorshipBriefcaseHidden(false);
        setBriefcaseAnimating(false);
        setMentorshipPadlockUnlocked(false);
        console.log(
          `[BRIEFCASE-RESTORE] Briefcase restored and padlock reset for new mentorship card: ${currentUserId}`,
        );
      }

      // Update the tracked card ID
      setLastMentorshipCardUserId(currentUserId);
    }
  }, [
    cardType,
    mentorshipProfiles,
    currentCardIndex,
    lastMentorshipCardUserId,
  ]);

  // Handshake animation states for networking cards
  const [handshakeHidden, setHandshakeHidden] = useState(false);
  const [handshakeAnimating, setHandshakeAnimating] = useState(false);
  const [lastNetworkingCardUserId, setLastNetworkingCardUserId] = useState<
    string | null
  >(null);

  // Job card animation states
  const [lastJobCardUserId, setLastJobCardUserId] = useState<string | null>(
    null,
  );

  // Padlock unlock state management for all card types
  const [jobsPadlockUnlocked, setJobsPadlockUnlocked] = useState(false);
  const [networkingPadlockUnlocked, setNetworkingPadlockUnlocked] =
    useState(false);
  const [mentorshipPadlockUnlocked, setMentorshipPadlockUnlocked] =
    useState(false);

  // Fetch real job profiles from SUITE discovery API with instant loading
  const {
    data: jobProfiles,
    isLoading: jobLoading,
    isError: jobError,
    error: jobApiError,
    refetch: refetchJobProfiles,
  } = useQuery({
    queryKey: ["/api/suite/discovery/jobs"],
    queryFn: async () => {
      console.log("[SUITE-DISCOVERY] 🚀 Loading job profiles...");
      const startTime = Date.now();
      const response = await apiRequest("/api/suite/discovery/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch job profiles");
      }
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[SUITE-DISCOVERY] ⚡ Jobs loaded in ${duration}ms`);
      return data;
    },
    enabled: !!user, // INSTANT LOADING: Always load when user is authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes fresh cache for instant loading
    gcTime: 30 * 60 * 1000, // 30 minutes in memory for better performance
    refetchOnMount: false, // Use cache first
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
    retryDelay: 300,
  });

  // Handshake animation logic - restore handshake when user moves to different networking card
  useEffect(() => {
    if (
      cardType === "networking" &&
      networkingProfiles &&
      networkingProfiles[currentCardIndex]
    ) {
      const currentCard = networkingProfiles[currentCardIndex];
      const currentUserId = currentCard?.userId?.toString() || currentCard?.id;

      // If this is a different card than the last one, restore the handshake and reset padlock
      if (
        lastNetworkingCardUserId !== null &&
        lastNetworkingCardUserId !== currentUserId
      ) {
        setHandshakeHidden(false);
        setHandshakeAnimating(false);
        setNetworkingPadlockUnlocked(false);
        console.log(
          `[HANDSHAKE-RESTORE] Handshake restored and padlock reset for new networking card: ${currentUserId}`,
        );
      }

      // Update the tracked card ID
      setLastNetworkingCardUserId(currentUserId);
    }
  }, [
    cardType,
    networkingProfiles,
    currentCardIndex,
    lastNetworkingCardUserId,
  ]);

  // Briefcase animation logic - restore briefcase when user moves to different job card
  useEffect(() => {
    if (cardType === "job" && jobProfiles && jobProfiles[currentCardIndex]) {
      const currentCard = jobProfiles[currentCardIndex];
      const currentUserId = currentCard?.userId?.toString() || currentCard?.id;

      // If this is a different card than the last one, restore the briefcase and reset padlock
      if (lastJobCardUserId !== null && lastJobCardUserId !== currentUserId) {
        setJobBriefcaseHidden(false);
        setBriefcaseAnimating(false);
        setJobsPadlockUnlocked(false);
        console.log(
          `[BRIEFCASE-RESTORE] Briefcase restored and padlock reset for new job card: ${currentUserId}`,
        );
      }

      // Update the tracked card ID
      setLastJobCardUserId(currentUserId);
    }
  }, [cardType, jobProfiles, currentCardIndex, lastJobCardUserId]);

  // Mutation for networking profile swipe actions with optimistic updates
  const swipeNetworkingMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
    }) => {
      const response = await apiRequest("/api/suite/networking/swipe", {
        method: "POST",
        data: data,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for networking");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record swipe action");
      }
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/networking"],
      });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData([
        "/api/suite/discovery/networking",
      ]);

      // Find and preserve the complete profile data before removal
      const swipedProfile = (previousData as any[])?.find(
        (profile: any) => profile.id === variables.profileId,
      );

      // Store the complete profile data in a cache for potential undo (with direction tracking)
      if (swipedProfile) {
        queryClient.setQueryData(
          ["/api/suite/networking/removed-profiles"],
          (old: any) => {
            const updated = old || [];
            // Add the swipe direction to the profile for directional undo animation
            const profileWithDirection = {
              ...swipedProfile,
              lastSwipeDirection,
            };
            // Keep only last 10 removed profiles to prevent memory bloat
            return [profileWithDirection, ...updated.slice(0, 9)];
          },
        );
      }

      // Optimistically update to remove the swiped profile
      queryClient.setQueryData(
        ["/api/suite/discovery/networking"],
        (old: any) => {
          if (!old) return old;
          return old.filter(
            (profile: any) => profile.id !== variables.profileId,
          );
        },
      );

      // Return context for rollback
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      // Check if this is a profile validation error
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/networking"],
          context.previousData,
        );
      }
      toast({
        title: "Action Failed",
        description: "Could not process your action. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // CRITICAL FIX: Immediately invalidate networking swipe history to activate undo button
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_NETWORKING"],
      });

      // Also optimistically increment the networking swipe count for instant undo button activation
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_NETWORKING"],
        (old: number = 0) => {
          return Math.min(old + 1, 9); // Increment but cap at 9 for display
        },
      );
    },
    onSettled: () => {
      // Always refetch after mutation completes (success or error)
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/discovery/networking"],
      });
    },
  });

  // Mutation for mentorship profile swipe actions with optimistic updates
  const swipeMentorshipMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
    }) => {
      const response = await apiRequest("/api/suite/mentorship/swipe", {
        method: "POST",
        data: data,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for mentorship");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record swipe action");
      }
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/mentorship"],
      });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData([
        "/api/suite/discovery/mentorship",
      ]);

      // Find and preserve the complete profile data before removal
      const swipedProfile = (previousData as any[])?.find(
        (profile: any) => profile.id === variables.profileId,
      );

      // Store the complete profile data in a cache for potential undo (with direction tracking)
      if (swipedProfile) {
        queryClient.setQueryData(
          ["/api/suite/mentorship/removed-profiles"],
          (old: any) => {
            const updated = old || [];
            // Add the swipe direction to the profile for directional undo animation
            const profileWithDirection = {
              ...swipedProfile,
              lastSwipeDirection,
            };
            // Keep only last 10 removed profiles to prevent memory bloat
            return [profileWithDirection, ...updated.slice(0, 9)];
          },
        );
      }

      // Optimistically update to remove the swiped profile
      queryClient.setQueryData(
        ["/api/suite/discovery/mentorship"],
        (old: any) => {
          if (!old) return old;
          return old.filter(
            (profile: any) => profile.id !== variables.profileId,
          );
        },
      );

      // Return context for rollback
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      // Check if this is a profile validation error
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/mentorship"],
          context.previousData,
        );
      }
      toast({
        title: t("suite.actionFailed"),
        description: t("suite.couldNotProcess"),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // CRITICAL FIX: Immediately invalidate mentorship swipe history to activate undo button
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_MENTORSHIP"],
      });

      // Also optimistically increment the mentorship swipe count for instant undo button activation
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_MENTORSHIP"],
        (old: number = 0) => {
          return Math.min(old + 1, 9); // Increment but cap at 9 for display
        },
      );
    },
    onSettled: () => {
      // Always refetch after mutation completes (success or error)
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/discovery/mentorship"],
      });
    },
  });

  // Query for swipe history count to display undo availability
  const { data: swipeHistoryCount = 0 } = useQuery({
    queryKey: ["/api/swipe/history", "SUITE_MENTORSHIP"],
    queryFn: async () => {
      if (!user) return 0;
      const response = await apiRequest(
        "/api/swipe/history?appMode=SUITE_MENTORSHIP",
      );
      if (!response.ok) return 0;
      const history = await response.json();
      return Math.min(history.length, 9); // Cap at 9 for display
    },
    enabled: !!user,
    refetchInterval: false, // PERFORMANCE FIX: Disabled automatic refetch - using immediate cache invalidation instead
    staleTime: 0, // Always consider data fresh to rely on immediate invalidation
  });

  // Undo mutation for SUITE mentorship with instant optimistic updates (MEET-style)
  const undoMentorshipMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/suite/mentorship/undo", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to undo mentorship action");
      }
      return response.json();
    },
    onMutate: async () => {
      console.log(
        `[MENTORSHIP-UNDO] Starting directional restore animation: lastSwipeDirection=${lastSwipeDirection}`,
      );

      // Set the restore animation based on the direction of the last swipe
      const restoreClass =
        lastSwipeDirection === "left"
          ? "card-restore-left"
          : "card-restore-right";
      setRestoreAnimationClass(restoreClass);
      console.log(`[MENTORSHIP-UNDO] Applying restore class: ${restoreClass}`);

      // Cancel outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/mentorship"],
      });

      // Snapshot previous data for rollback
      const previousDiscoveryData = queryClient.getQueryData([
        "/api/suite/discovery/mentorship",
      ]);

      // Get the most recently removed profile with complete data including photos
      const removedProfiles =
        (queryClient.getQueryData([
          "/api/suite/mentorship/removed-profiles",
        ]) as any[]) || [];
      const profileToRestore = removedProfiles[0]; // Most recent removal (LIFO)

      // DELAY optimistic update until after animation completes (250ms)
      setTimeout(() => {
        if (profileToRestore) {
          queryClient.setQueryData(
            ["/api/suite/discovery/mentorship"],
            (old: any[]) => {
              if (!old) return [profileToRestore];
              // Add restored profile to front (LIFO order) with complete data
              return [profileToRestore, ...old];
            },
          );

          // Remove the restored profile from the removed-profiles cache
          queryClient.setQueryData(
            ["/api/suite/mentorship/removed-profiles"],
            (old: any[]) => {
              if (!old) return [];
              return old.slice(1); // Remove first item (most recent)
            },
          );

          console.log(
            `[MENTORSHIP-UNDO] Delayed restored profile ${profileToRestore.id} after animation completes`,
          );
        }

        // Clean up restore animation after it completes
        setTimeout(() => {
          setRestoreAnimationClass("");
          console.log(`[MENTORSHIP-UNDO] Restore animation completed`);
        }, 300); // Match animation duration
      }, 50); // Small delay to ensure card appears before animation starts

      return { previousDiscoveryData, profileToRestore };
    },
    onSuccess: (data, variables, context) => {
      // Server undo completed successfully - no additional UI updates needed
      // The optimistic update in onMutate already restored the profile with photos
      console.log(
        `[MENTORSHIP-UNDO] Server undo completed for profile ${data?.profileId}`,
      );

      // CRITICAL FIX: Immediately update mentorship swipe history count to reflect the undo
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_MENTORSHIP"],
      });

      // Also optimistically decrement the mentorship swipe count for instant undo button update
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_MENTORSHIP"],
        (old: number = 0) => {
          return Math.max(old - 1, 0); // Decrement but never go below 0
        },
      );

      // Animation cleanup already handled in onMutate setTimeout
      console.log(`[MENTORSHIP-UNDO] Undo operation completed successfully`);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousDiscoveryData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/mentorship"],
          context.previousDiscoveryData,
        );
      }

      // Restore the profile back to removed-profiles cache on error
      if (context?.profileToRestore) {
        queryClient.setQueryData(
          ["/api/suite/mentorship/removed-profiles"],
          (old: any[]) => {
            const updated = old || [];
            return [context.profileToRestore, ...updated];
          },
        );
      }

      console.log(`[MENTORSHIP-UNDO] Rolled back undo due to error`);
    },
  });

  // Query for networking swipe history count to display undo availability
  const { data: networkingSwipeHistoryCount = 0 } = useQuery({
    queryKey: ["/api/swipe/history", "SUITE_NETWORKING"],
    queryFn: async () => {
      if (!user) return 0;
      const response = await apiRequest(
        "/api/swipe/history?appMode=SUITE_NETWORKING",
      );
      if (!response.ok) return 0;
      const history = await response.json();
      return Math.min(history.length, 9); // Cap at 9 for display
    },
    enabled: !!user,
    refetchInterval: false, // PERFORMANCE FIX: Disabled automatic refetch - using immediate cache invalidation instead
    staleTime: 0, // Always consider data fresh to rely on immediate invalidation
  });

  // Undo mutation for SUITE networking with instant optimistic updates (MEET-style)
  const undoNetworkingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/suite/networking/undo", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to undo networking action");
      }
      return response.json();
    },
    onMutate: async () => {
      console.log(
        `[NETWORKING-UNDO] Starting directional restore animation: lastSwipeDirection=${lastSwipeDirection}`,
      );

      // Set the restore animation based on the direction of the last swipe
      const restoreClass =
        lastSwipeDirection === "left"
          ? "card-restore-left"
          : "card-restore-right";
      setRestoreAnimationClass(restoreClass);
      console.log(`[NETWORKING-UNDO] Applying restore class: ${restoreClass}`);

      // Cancel outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/networking"],
      });

      // Snapshot previous data for rollback
      const previousDiscoveryData = queryClient.getQueryData([
        "/api/suite/discovery/networking",
      ]);

      // Get the most recently removed profile with complete data including photos
      const removedProfiles =
        (queryClient.getQueryData([
          "/api/suite/networking/removed-profiles",
        ]) as any[]) || [];
      const profileToRestore = removedProfiles[0]; // Most recent removal (LIFO)

      // DELAY optimistic update until after animation completes (250ms)
      setTimeout(() => {
        if (profileToRestore) {
          queryClient.setQueryData(
            ["/api/suite/discovery/networking"],
            (old: any[]) => {
              if (!old) return [profileToRestore];
              // Add restored profile to front (LIFO order) with complete data
              return [profileToRestore, ...old];
            },
          );

          // Remove the restored profile from the removed-profiles cache
          queryClient.setQueryData(
            ["/api/suite/networking/removed-profiles"],
            (old: any[]) => {
              if (!old) return [];
              return old.slice(1); // Remove first item (most recent)
            },
          );

          console.log(
            `[NETWORKING-UNDO] Delayed restored profile ${profileToRestore.id} after animation completes`,
          );
        }

        // Clean up restore animation after it completes
        setTimeout(() => {
          setRestoreAnimationClass("");
          console.log(`[NETWORKING-UNDO] Restore animation completed`);
        }, 300); // Match animation duration
      }, 50); // Small delay to ensure card appears before animation starts

      return { previousDiscoveryData, profileToRestore };
    },
    onSuccess: (data, variables, context) => {
      // Server undo completed successfully - no additional UI updates needed
      // The optimistic update in onMutate already restored the profile with photos
      console.log(
        `[NETWORKING-UNDO] Server undo completed for profile ${data?.profileId}`,
      );

      // CRITICAL FIX: Immediately update networking swipe history count to reflect the undo
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_NETWORKING"],
      });

      // Also optimistically decrement the networking swipe count for instant undo button update
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_NETWORKING"],
        (old: number = 0) => {
          return Math.max(old - 1, 0); // Decrement but never go below 0
        },
      );

      // Animation cleanup already handled in onMutate setTimeout
      console.log(`[NETWORKING-UNDO] Undo operation completed successfully`);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousDiscoveryData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/networking"],
          context.previousDiscoveryData,
        );
      }

      // Restore the profile back to removed-profiles cache on error
      if (context?.profileToRestore) {
        queryClient.setQueryData(
          ["/api/suite/networking/removed-profiles"],
          (old: any[]) => {
            const updated = old || [];
            return [context.profileToRestore, ...updated];
          },
        );
      }

      console.log(`[NETWORKING-UNDO] Rolled back undo due to error`);
    },
  });

  // Query for job swipe history count
  const { data: jobSwipeHistoryCount = 0 } = useQuery({
    queryKey: ["/api/swipe/history", "SUITE_JOBS"],
    queryFn: async () => {
      if (!user) return 0;
      const response = await apiRequest(
        "/api/swipe/history?appMode=SUITE_JOBS",
      );
      if (!response.ok) return 0;
      const history = await response.json();
      return Math.min(history.length, 9); // Cap at 9 for display
    },
    enabled: !!user && cardType === "job", // Only load when Jobs tab is selected
    refetchInterval: false, // PERFORMANCE FIX: Disabled automatic refetch - using immediate cache invalidation instead
    staleTime: 0, // Always consider data fresh to rely on immediate invalidation
  });

  // Undo mutation for SUITE jobs with instant optimistic updates
  const undoJobMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/suite/jobs/undo", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to undo job action");
      }
      return response.json();
    },
    onMutate: async () => {
      // Cancel outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/jobs"],
      });

      // Snapshot previous data for rollback
      const previousDiscoveryData = queryClient.getQueryData([
        "/api/suite/discovery/jobs",
      ]);

      // Get the most recently removed profile with complete data
      const removedProfiles =
        (queryClient.getQueryData([
          "/api/suite/jobs/removed-profiles",
        ]) as any[]) || [];
      const profileToRestore = removedProfiles[0]; // Most recent removal (LIFO)

      if (profileToRestore) {
        // Determine animation direction based on last swipe
        const lastSwipeDirection =
          profileToRestore.lastSwipeDirection || "right";

        // Set the restore animation based on the direction of the last swipe
        const restoreClass =
          lastSwipeDirection === "left"
            ? "card-restore-left"
            : "card-restore-right";
        setRestoreAnimationClass(restoreClass);
        console.log(`[JOBS-UNDO] Applying restore class: ${restoreClass}`);
        setPreviousCardEntering(true);

        // Optimistically restore the profile immediately
        queryClient.setQueryData(["/api/suite/discovery/jobs"], (old: any) => {
          if (!old) return [profileToRestore];
          return [profileToRestore, ...old];
        });

        // Remove the restored profile from the removed-profiles cache
        queryClient.setQueryData(
          ["/api/suite/jobs/removed-profiles"],
          (old: any[]) => {
            if (!old) return [];
            return old.slice(1); // Remove first item (most recent)
          },
        );

        // Clean up restore animation after it completes
        setTimeout(() => {
          setRestoreAnimationClass("");
          console.log(`[JOBS-UNDO] Restore animation completed`);
        }, 300); // Match animation duration

        console.log(
          `[JOBS-UNDO] Synchronized animation started for profile ${profileToRestore.id} - ${lastSwipeDirection} direction`,
        );
      }

      return { previousDiscoveryData, profileToRestore };
    },
    onSuccess: (data, variables, context) => {
      console.log(
        `[JOBS-UNDO] Server undo completed for profile ${data?.profileId}`,
      );

      // CRITICAL FIX: Immediately update job swipe history count to reflect the undo
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_JOBS"],
      });

      // Also optimistically decrement the job swipe count for instant undo button update
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_JOBS"],
        (old: number = 0) => {
          return Math.max(old - 1, 0); // Decrement but never go below 0
        },
      );

      // Animation cleanup already handled in onMutate setTimeout
      console.log(`[JOBS-UNDO] Undo operation completed successfully`);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousDiscoveryData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/jobs"],
          context.previousDiscoveryData,
        );
      }

      // Restore the profile back to removed-profiles cache on error
      if (context?.profileToRestore) {
        queryClient.setQueryData(
          ["/api/suite/jobs/removed-profiles"],
          (old: any[]) => {
            const updated = old || [];
            return [context.profileToRestore, ...updated];
          },
        );
      }

      console.log(`[JOBS-UNDO] Rolled back undo due to error`);
    },
  });

  // Mutation for job profile swipe actions with optimistic updates
  const swipeJobMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
    }) => {
      const response = await apiRequest("/api/suite/jobs/apply", {
        method: "POST",
        data: data,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for jobs");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record job application");
      }
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent interference
      await queryClient.cancelQueries({
        queryKey: ["/api/suite/discovery/jobs"],
      });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData([
        "/api/suite/discovery/jobs",
      ]);

      // Find and cache the profile being removed for undo functionality
      const currentProfiles = queryClient.getQueryData([
        "/api/suite/discovery/jobs",
      ]) as any[];
      const removedProfile = currentProfiles?.find(
        (profile) => profile.id === variables.profileId,
      );

      if (removedProfile) {
        // Add the removed profile to the cache for undo functionality (with direction tracking)
        queryClient.setQueryData(
          ["/api/suite/jobs/removed-profiles"],
          (old: any[]) => {
            const updated = old || [];
            // Add the swipe direction to the profile for directional undo animation
            const profileWithDirection = {
              ...removedProfile,
              lastSwipeDirection,
            };
            // Add to front (LIFO - Last In, First Out) and limit to 10 items
            return [profileWithDirection, ...updated].slice(0, 10);
          },
        );

        console.log(
          `[JOBS-SWIPE] Cached removed profile ${removedProfile.id} for undo functionality`,
        );
      }

      // Optimistically update to remove the swiped profile
      queryClient.setQueryData(["/api/suite/discovery/jobs"], (old: any) => {
        if (!old) return old;
        return old.filter((profile: any) => profile.id !== variables.profileId);
      });

      // Return context for rollback
      return { previousData, removedProfile };
    },
    onError: (error: any, variables, context) => {
      // Check if this is a profile validation error
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/suite/discovery/jobs"],
          context.previousData,
        );
      }

      // Remove the profile from removed-profiles cache on error
      if (context?.removedProfile) {
        queryClient.setQueryData(
          ["/api/suite/jobs/removed-profiles"],
          (old: any[]) => {
            if (!old) return [];
            return old.filter(
              (profile) => profile.id !== context.removedProfile.id,
            );
          },
        );
      }

      toast({
        title: "Application Failed",
        description: "Could not process your application. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // CRITICAL FIX: Immediately invalidate job swipe history to activate undo button
      queryClient.invalidateQueries({
        queryKey: ["/api/swipe/history", "SUITE_JOBS"],
      });

      // Also optimistically increment the job swipe count for instant undo button activation
      queryClient.setQueryData(
        ["/api/swipe/history", "SUITE_JOBS"],
        (old: number = 0) => {
          return Math.min(old + 1, 9); // Increment but cap at 9 for display
        },
      );
    },
    onSettled: () => {
      // Always refetch after mutation completes (success or error)
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/discovery/jobs"],
      });
    },
  });

  // Transform real job profiles into card format with visibility preferences
  const jobCards: JobCard[] = jobProfiles
    ? jobProfiles.map((profile: any) => {
        // Parse visibility preferences first to check photo visibility
        let fieldVisibility = {
          showProfilePhoto: true, // Default to true
          professionalTagline: true,
          jobTitle: true,
          company: true,
          workType: true,
          jobType: true,
          experienceLevel: true,
          skills: true,
          industry: true,
          description: true,
          requirements: true,
          whoShouldApply: true,
          compensation: true,
          applicationUrl: true,
          applicationEmail: true,
          location: true,
          highSchool: true,
          collegeUniversity: true,
        };

        if (profile.visibilityPreferences) {
          try {
            fieldVisibility = {
              ...fieldVisibility,
              ...JSON.parse(profile.visibilityPreferences),
            };
          } catch (error) {
            console.error("Error parsing job visibility preferences:", error);
          }
        }

        // Debug salary data
        console.log(`[SALARY-DEBUG] Profile ${profile.id} salary data:`, {
          salary: profile.salary,
          compensation: profile.compensation,
          jobs_salary_currency: profile.jobs_salary_currency,
          jobs_salary_min: profile.jobs_salary_min,
          jobs_salary_max: profile.jobs_salary_max,
          jobs_salary_period: profile.jobs_salary_period,
        });

        // Use job-specific primary photo or fallback to user photo, but only if showProfilePhoto is true
        const primaryPhotoUrl = fieldVisibility.showProfilePhoto
          ? profile.jobPrimaryPhotoUrl || profile.user?.photoUrl
          : undefined;

        return {
          id: String(profile.id),
          type: "job" as const,
          role: (profile.role as "job-seeker" | "recruiter") || "job-seeker",
          fullName: profile.user?.fullName || "Anonymous User",
          jobTitle: profile.jobTitle || "Job Opportunity",
          workType: profile.workType || "Remote",
          jobType: profile.jobType || "Full-time",
          experienceLevel: profile.experienceLevel || "Mid",
          skills: profile.skillTags
            ? profile.skillTags.split(",").map((skill: string) => skill.trim())
            : [],
          desiredIndustry: profile.industryTags
            ? profile.industryTags.split(",")[0]?.trim()
            : undefined,
          photoUrl: primaryPhotoUrl, // Only include photo if visibility allows
          userId: profile.userId,
          // Add comprehensive job profile fields
          company: profile.company || undefined,
          compensation: profile.compensation || undefined,
          salary: profile.salary || undefined,
          // Dynamic salary fields
          salaryCurrency: profile.jobs_salary_currency || undefined,
          salaryMin: profile.jobs_salary_min || undefined,
          salaryMax: profile.jobs_salary_max || undefined,
          salaryPeriod: profile.jobs_salary_period || undefined,
          description: profile.description || undefined,
          requirements: profile.requirements || undefined,
          whoShouldApply: profile.whoShouldApply || undefined,
          applicationUrl: profile.applicationUrl || undefined,
          applicationEmail: profile.applicationEmail || undefined,
          isVerified: profile.user?.isVerified || false,
          // Add visibility preferences to the card
          fieldVisibility: fieldVisibility,
        };
      })
    : [];

  // Sample data for demonstration (fallback - remove when API is working)
  const sampleJobCards: JobCard[] = [
    {
      id: "job1",
      type: "job",
      role: "job-seeker" as const,
      fullName: "Kwame Asante",
      jobTitle: "Senior Frontend Developer",
      workType: "Hybrid",
      jobType: "Full-time",
      experienceLevel: "Senior",
      skills: ["React", "TypeScript", "Node.js", "AWS"],
      desiredIndustry: "Technology",
      photoUrl: undefined,
      userId: 101, // Sample user ID
    },
    {
      id: "job2",
      type: "job",
      role: "job-seeker" as const,
      fullName: "Ama Osei",
      jobTitle: "Product Manager",
      workType: "In-person",
      jobType: "Full-time",
      experienceLevel: "Mid",
      skills: ["Product Strategy", "Data Analysis", "User Research", "Agile"],
      desiredIndustry: "AgriTech",
      photoUrl: undefined,
      userId: 102, // Sample user ID
    },
    {
      id: "job3",
      type: "job",
      role: "job-seeker" as const,
      fullName: "Kofi Mensah",
      jobTitle: "UX Designer",
      workType: "Remote",
      jobType: "Internship",
      experienceLevel: "Entry",
      skills: ["Figma", "User Research", "Prototyping", "Design Systems"],
      desiredIndustry: "Design",
      photoUrl: undefined,
      userId: 103, // Sample user ID
    },
  ];

  // Dummy mentorship cards removed - only use authentic API data

  // Transform real networking profiles into card format
  const networkingCards: NetworkingCard[] = networkingProfiles
    ? networkingProfiles.map((profile: any) => {
        // Parse visibility preferences first to check photo visibility
        let fieldVisibility = {
          showProfilePhoto: true, // Default to true
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
          languagesSpoken: true,
          openToCollaborateOn: true,
          preferredNetworkingFormat: true,
          signatureAchievement: true,
          timezone: true,
          location: true,
          highSchool: true,
          collegeUniversity: true,
        };

        if (profile.visibilityPreferences) {
          try {
            fieldVisibility = {
              ...fieldVisibility,
              ...JSON.parse(profile.visibilityPreferences),
            };
          } catch (error) {
            console.error(
              "Error parsing networking visibility preferences:",
              error,
            );
          }
        }

        // Use networking-specific primary photo or fallback to user photo, but only if showProfilePhoto is true
        const primaryPhotoUrl = fieldVisibility.showProfilePhoto
          ? profile.networkingPrimaryPhotoUrl || profile.user?.photoUrl
          : undefined;

        return {
          id: String(profile.id),
          userId: profile.userId || profile.user?.id, // Add missing userId field
          type: "networking" as const,
          name: profile.user?.fullName || "Anonymous User",
          professionalTag: profile.professionalTagline || "",
          currentRole: profile.currentRole || "",
          currentCompany: profile.currentCompany || "",
          industry: profile.industry || "",
          lookingFor: profile.lookingFor || "",
          canOffer: profile.canOffer || "",
          sharedInterests: profile.professionalInterests
            ? profile.professionalInterests
                .split(",")
                .map((i: string) => i.trim())
            : [],
          sparkIndicator: Math.floor(Math.random() * 3) + 3, // Random 3-5 for now
          photoUrl: primaryPhotoUrl, // Only include photo if visibility allows
          location: profile.location,
          highSchool: profile.highSchool,
          collegeUniversity: profile.collegeUniversity,
          isVerified: profile.user?.isVerified || false,
          fieldVisibility: fieldVisibility,
        };
      })
    : [];

  // Transform real mentorship profiles into card format
  const mentorshipCardsFromAPI: MentorshipCard[] = mentorshipProfiles
    ? mentorshipProfiles.map((profile: any) => {
        // Parse visibility preferences first to check photo visibility
        let fieldVisibility = {
          showProfilePhoto: true, // Default to true
          professionalTagline: true,
          role: true,
          areasOfExpertise: true,
          learningGoals: true,
          currentLevel: true,
          mentorshipStyle: true,
          preferredFormat: true,
          communicationStyle: true,
          availability: true,
          timeCommitment: true,
          location: true,
          successStories: false,
          whyMentor: true,
          whySeekMentorship: true,
          preferredMentorshipStyle: true,
          industryAspiration: true,
          preferredMenteeLevel: false,
          preferredMentorExperience: false,
          preferredIndustries: false,
          maxMentees: true,
          languagesSpoken: true,
          timezone: true,
          industriesOrDomains: true,
          highSchool: true,
          collegeUniversity: true,
        };

        if (profile.visibilityPreferences) {
          try {
            fieldVisibility = {
              ...fieldVisibility,
              ...JSON.parse(profile.visibilityPreferences),
            };
          } catch (error) {
            console.error(
              "Error parsing mentorship visibility preferences:",
              error,
            );
          }
        }

        // Use mentorship-specific primary photo or fallback to user photo, but only if showProfilePhoto is true
        const primaryPhotoUrl = fieldVisibility.showProfilePhoto
          ? profile.mentorshipPrimaryPhotoUrl || profile.user?.photoUrl
          : undefined;

        return {
          id: String(profile.id),
          userId: profile.userId || profile.user?.id, // Add missing userId field
          type: "mentorship" as const,
          name: profile.user?.fullName || "Anonymous User",
          profession: profile.user?.profession || "",
          field: profile.industriesOrDomains
            ? profile.industriesOrDomains.join(", ")
            : "",
          mentorshipStyle:
            profile.role === "mentor"
              ? profile.mentorshipStyle || ""
              : profile.whySeekMentorship || "",
          availability: profile.availability || "",
          isMentor: profile.role === "mentor",
          role: profile.role,
          areasOfExpertise: profile.areasOfExpertise || [],
          learningGoals: profile.learningGoals || [],
          languagesSpoken: profile.languagesSpoken || [],
          industriesOrDomains: profile.industriesOrDomains || [],
          timeCommitment: profile.timeCommitment || "",
          photoUrl: primaryPhotoUrl, // Only include photo if visibility allows
          whyMentor: profile.whyMentor,
          whySeekMentorship: profile.whySeekMentorship,
          preferredMentorshipStyle: profile.preferredMentorshipStyle,
          // Add all the missing fields from the API
          preferredFormat: profile.preferredFormat,
          communicationStyle: profile.communicationStyle,
          location: profile.location,
          successStories: profile.successStories,
          preferredMenteeLevel: profile.preferredMenteeLevel,
          preferredMentorExperience: profile.preferredMentorExperience,
          preferredIndustries: profile.preferredIndustries,
          maxMentees: profile.maxMentees,
          currentMentees: profile.currentMentees,
          visibilityPreferences: profile.visibilityPreferences,
          // Add education fields
          highSchool: profile.highSchool,
          collegeUniversity: profile.collegeUniversity,
          isVerified: profile.user?.isVerified || false,
          fieldVisibility: fieldVisibility,
          industryAspiration: profile.industryAspiration,
          sparkIndicator: Math.floor(Math.random() * 3) + 3, // Random 3-5 for now
        };
      })
    : [];

  // Get current cards based on selected type
  const getCurrentCards = (): SuiteCard[] => {
    switch (cardType) {
      case "job":
        return jobCards;
      case "mentorship":
        // Only use authentic mentorship profiles from API
        return mentorshipCardsFromAPI;
      case "networking":
        // Use real networking profiles from API when available
        return networkingCards;
      default:
        return jobCards;
    }
  };

  const currentCards = getCurrentCards();

  // Optimized bounds checking with debounced state updates
  useEffect(() => {
    // Only update if we have a valid out-of-bounds condition
    if (currentCards.length > 0 && currentCardIndex >= currentCards.length) {
      setCurrentCardIndex(0);
    }
  }, [currentCards.length]); // Remove currentCardIndex dependency to prevent loops

  // Reset card index when switching card types with immediate effect
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [cardType]);

  const currentCard = currentCards[currentCardIndex];
  const previousCard =
    previousCardEntering && currentCards[currentCardIndex - 1]
      ? currentCards[currentCardIndex - 1]
      : null;

  console.log("Networking cards array:", networkingCards);
  console.log("Current card type:", cardType);
  console.log("Current card index:", currentCardIndex);
  console.log("Current card being rendered:", currentCard);
  console.log("Route check - should be on /suite/network");

  // Track this page as last app page and update origin for navigation chain
  useEffect(() => {
    // Track this as the last app page visited
    // Debug navigation tracking
    const previousLastPage = localStorage.getItem("last_app_page");
    const previousOriginPage = localStorage.getItem("origin_app_page");

    localStorage.setItem("last_app_page", "/suite/network");

    // Always update origin page when visiting app pages (this is the new source for navigation chains)
    localStorage.setItem("origin_app_page", "/suite/network");

    console.log("[SUITE-NETWORK-PAGE] 🔍 Page Visit Debug");
    console.log("[SUITE-NETWORK-PAGE] Previous last page:", previousLastPage);
    console.log(
      "[SUITE-NETWORK-PAGE] Previous origin page:",
      previousOriginPage,
    );
    console.log("[SUITE-NETWORK-PAGE] ✅ Set origin page to /suite/network");
    console.log("[SUITE-NETWORK-PAGE] ✅ Set last page to /suite/network");

    if (user?.id) {
      try {
        sessionStorage.setItem("userId", user.id.toString());
        sessionStorage.setItem("appModeSelected", "true");
        sessionStorage.setItem(`last_used_app_${user.id}`, "suite");
      } catch (error) {
        console.warn("Storage error in suite network page:", error);
      }
    }
  }, [user]);

  // Handle URL parameter changes and save tab preference
  useEffect(() => {
    // Check for URL parameter changes on initial load and when URL changes
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (
      tabParam &&
      (tabParam === "job" ||
        tabParam === "mentorship" ||
        tabParam === "networking")
    ) {
      if (cardType !== tabParam) {
        setCardType(tabParam as "job" | "mentorship" | "networking");
      }
    }

    // Save tab preference whenever cardType changes
    if (user?.id) {
      try {
        localStorage.setItem(`suite_network_last_tab_${user.id}`, cardType);
      } catch (error) {
        console.warn("Failed to save tab preference:", error);
      }
    }
  }, [cardType, user?.id]);

  // Listen for URL changes (e.g., browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (
        tabParam &&
        (tabParam === "job" ||
          tabParam === "mentorship" ||
          tabParam === "networking")
      ) {
        setCardType(tabParam as "job" | "mentorship" | "networking");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // WebSocket event listeners for real-time networking profile updates
  useEffect(() => {
    // Handle profile deletion for real-time swipecard removal
    const handleProfileDeleted = (event: Event) => {
      const wsEvent = event as CustomEvent;
      const message = wsEvent.detail;

      console.log("[SUITE Network] Profile deleted event received:", message);

      const { profileType, userId } = message;

      // Handle networking profile deletion
      if (profileType === "networking" && cardType === "networking") {
        const currentNetworkingCards = queryClient.getQueryData([
          "/api/suite/discovery/networking",
        ]) as any[];

        if (currentNetworkingCards) {
          const updatedCards = currentNetworkingCards.filter(
            (card) => card.userId !== userId,
          );

          // Optimistically update the cache
          queryClient.setQueryData(
            ["/api/suite/discovery/networking"],
            updatedCards,
          );

          console.log(
            `[SUITE Network] Removed networking profile for user ${userId} from discover deck (profile deleted)`,
          );
        }
      }

      // Handle mentorship profile deletion
      if (profileType === "mentorship" && cardType === "mentorship") {
        const currentMentorshipCards = queryClient.getQueryData([
          "/api/suite/discovery/mentorship",
        ]) as any[];

        if (currentMentorshipCards) {
          const updatedCards = currentMentorshipCards.filter(
            (card) => card.userId !== userId,
          );

          // Optimistically update the cache
          queryClient.setQueryData(
            ["/api/suite/discovery/mentorship"],
            updatedCards,
          );

          console.log(
            `[SUITE Network] Removed mentorship profile for user ${userId} from discover deck (profile deleted)`,
          );
        }
      }
    };

    // SURGICAL PRECISION FIX: Handle targeted SUITE card removal
    const handleWebSocketMessage = (event: Event) => {
      const wsEvent = event as CustomEvent;
      const message = wsEvent.detail;

      if (message.type === "suite_remove_from_discover") {
        console.log(
          "[SUITE Network] SUITE targeted card removal received:",
          message,
        );
        console.log(
          "[DEBUG] Current cardType:",
          cardType,
          "Message suiteType:",
          message.suiteType,
        );
        console.log(
          `[DEBUG] Jobs condition check: suiteType === "jobs" (${message.suiteType === "jobs"}) && cardType === "job" (${cardType === "job"})`,
        );

        const { suiteType, removeProfileId, removeUserId, reason } = message;

        // Handle networking card removal
        if (suiteType === "networking" && cardType === "networking") {
          const currentNetworkingCards = queryClient.getQueryData([
            "/api/suite/discovery/networking",
          ]) as any[];

          if (currentNetworkingCards) {
            const updatedCards = currentNetworkingCards.filter(
              (card) => card.id !== removeProfileId,
            );

            // Optimistically update the cache
            queryClient.setQueryData(
              ["/api/suite/discovery/networking"],
              updatedCards,
            );

            console.log(
              `[SUITE Network] Removed networking profile ${removeProfileId} from discover deck (${reason})`,
            );
          }
        }

        // Handle mentorship card removal
        if (suiteType === "mentorship" && cardType === "mentorship") {
          const currentMentorshipCards = queryClient.getQueryData([
            "/api/suite/discovery/mentorship",
          ]) as any[];

          if (currentMentorshipCards) {
            const updatedCards = currentMentorshipCards.filter(
              (card) => card.id !== removeProfileId,
            );

            // Optimistically update the cache
            queryClient.setQueryData(
              ["/api/suite/discovery/mentorship"],
              updatedCards,
            );

            console.log(
              `[SUITE Network] Removed mentorship profile ${removeProfileId} from discover deck (${reason})`,
            );
          }
        }

        // Handle jobs card removal (CRITICAL NAMING FIX)
        // Backend sends "jobs" (plural), frontend uses "job" (singular)
        if (suiteType === "jobs" && cardType === "job") {
          const currentJobCards = queryClient.getQueryData([
            "/api/suite/discovery/jobs",
          ]) as any[];

          if (currentJobCards) {
            const updatedCards = currentJobCards.filter(
              (card) => card.id !== removeProfileId,
            );

            // Optimistically update the cache
            queryClient.setQueryData(
              ["/api/suite/discovery/jobs"],
              updatedCards,
            );

            console.log(
              `[SUITE Network] Removed jobs profile ${removeProfileId} from discover deck (${reason})`,
            );
          }
        }
      }
    };

    const handleNetworkingProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(
        "[SUITE Network] Networking profile update received:",
        customEvent.detail,
      );

      // Invalidate and refetch networking profiles to get fresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/discovery/networking"],
      });
    };

    const handleSuiteDiscoveryRefresh = () => {
      console.log("[SUITE Network] Discovery refresh event received");

      // Invalidate and refetch networking profiles
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/discovery/networking"],
      });
    };

    // SUITE connections refresh listener
    const handleConnectionsRefresh = (event: Event) => {
      const wsEvent = event as CustomEvent;
      const { suiteType, reason } = wsEvent.detail;

      console.log(
        `[SUITE Network] SUITE connections refresh: ${suiteType} (${reason})`,
      );
    };

    // Add event listeners including direct suite_remove_from_discover events
    window.addEventListener("websocket:message", handleWebSocketMessage);
    window.addEventListener(
      "suite_remove_from_discover",
      handleWebSocketMessage,
    );
    window.addEventListener(
      "networking:profile:updated",
      handleNetworkingProfileUpdate,
    );
    window.addEventListener(
      "suite:discovery:refresh",
      handleSuiteDiscoveryRefresh,
    );
    window.addEventListener(
      "suite:connections:refresh",
      handleConnectionsRefresh,
    );

    // Cleanup function
    return () => {
      window.removeEventListener("websocket:message", handleWebSocketMessage);
      window.removeEventListener(
        "suite_remove_from_discover",
        handleWebSocketMessage,
      );
      window.removeEventListener(
        "networking:profile:updated",
        handleNetworkingProfileUpdate,
      );
      window.removeEventListener(
        "suite:discovery:refresh",
        handleSuiteDiscoveryRefresh,
      );
      window.removeEventListener(
        "suite:connections:refresh",
        handleConnectionsRefresh,
      );
    };
  }, [queryClient, cardType]);

  // Animation cleanup effect to prevent diagonal positioning
  useEffect(() => {
    const cleanupAnimation = (event: AnimationEvent) => {
      if (event.target instanceof HTMLElement) {
        const card = event.target.closest(".swipe-card");
        if (
          card &&
          (event.animationName.includes("job-swipe") ||
            event.animationName.includes("mentorship-swipe") ||
            event.animationName.includes("networking-swipe") ||
            event.animationName.includes("card-entrance") ||
            event.animationName.includes("undo-exit"))
        ) {
          // Reset transform properties after animation completes
          (card as HTMLElement).style.transform =
            "translateZ(0) translate3d(0, 0, 0)";
          (card as HTMLElement).style.opacity = "1";
        }
      }
    };

    // Listen for animation end events to clean up transforms
    document.addEventListener("animationend", cleanupAnimation);
    document.addEventListener("animationcancel", cleanupAnimation);

    return () => {
      document.removeEventListener("animationend", cleanupAnimation);
      document.removeEventListener("animationcancel", cleanupAnimation);
    };
  }, []);

  // Loading state for networking tab - only show on initial load (not tab switching)
  if (cardType === "networking" && networkingLoading && !networkingProfiles) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Loading networking profiles...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Error state for networking tab
  if (cardType === "networking" && networkingError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center p-6">
            <X className="h-8 w-8 text-red-500" />
            <p className="text-red-600 font-medium">
              Failed to load networking profiles
            </p>
            <p className="text-gray-600 text-sm">Please try again later</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Loading state for mentorship tab - only show on initial load (not tab switching)
  if (cardType === "mentorship" && mentorshipLoading && !mentorshipProfiles) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Loading mentorship profiles...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Error state for mentorship tab
  if (cardType === "mentorship" && mentorshipError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center p-6">
            <X className="h-8 w-8 text-red-500" />
            <p className="text-red-600 font-medium">
              Failed to load mentorship profiles
            </p>
            <p className="text-gray-600 text-sm">Please try again later</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Loading state for jobs tab - only show on initial load (not tab switching)
  if (cardType === "job" && jobLoading && !jobProfiles) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Loading job opportunities...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Error state for jobs tab
  if (cardType === "job" && jobError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center p-6">
            <X className="h-8 w-8 text-red-500" />
            <p className="text-red-600 font-medium">
              Failed to load job opportunities
            </p>
            <p className="text-gray-600 text-sm">Please try again later</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Get the appropriate card ref based on card type with null safety
  const getCurrentCardRef = () => {
    switch (cardType) {
      case "job":
        return jobCardRef;
      case "mentorship":
        return mentorshipCardRef;
      case "networking":
        return networkingCardRef;
      default:
        return jobCardRef;
    }
  };

  // Safe card styling helper
  const safeStyleCard = (callback: (element: HTMLElement) => void) => {
    const cardRef = getCurrentCardRef();
    if (cardRef && cardRef.current) {
      callback(cardRef.current);
    }
  };

  // Check if user has active networking profile for networking actions
  const hasActiveNetworkingProfile = () => {
    return userNetworkingProfile && userNetworkingProfile.isActive === true;
  };

  // Handle networking profile validation
  const validateNetworkingAction = () => {
    if (!hasActiveNetworkingProfile()) {
      setShowNetworkingProfilePrompt(true);
      return false;
    }
    return true;
  };

  // Check if user has active mentorship profile for mentorship actions
  const hasActiveMentorshipProfile = () => {
    return (
      userMentorshipProfile &&
      Array.isArray(userMentorshipProfile) &&
      userMentorshipProfile.length > 0 &&
      userMentorshipProfile.some((profile) => profile.isActive === true)
    );
  };

  // Handle mentorship profile validation
  const validateMentorshipAction = () => {
    if (!hasActiveMentorshipProfile()) {
      setShowMentorshipProfilePrompt(true);
      return false;
    }
    return true;
  };

  // Check if user has active job profile for job actions
  const hasActiveJobProfile = () => {
    return userJobProfile && userJobProfile.isActive === true;
  };

  // Handle job profile validation
  const validateJobAction = () => {
    if (!hasActiveJobProfile()) {
      setShowJobProfilePrompt(true);
      return false;
    }
    return true;
  };

  // Tinder-style physics constants (matching MEET swipecard implementation)
  const SWIPE_THRESHOLD = 100; // pixels to trigger swipe
  const MAX_ROTATION = 15; // maximum rotation in degrees
  const ROTATION_STRENGTH = 0.1; // how much rotation per pixel
  const FRICTION = 0.95; // velocity decay
  const SPRING_STRENGTH = 0.15; // snap-back force
  const VELOCITY_THRESHOLD = 0.8; // minimum velocity for fling

  // Get pointer position from mouse or touch event
  const getPointerPosition = (
    e: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return {
      x: (e as React.MouseEvent).clientX,
      y: (e as React.MouseEvent).clientY,
    };
  };

  // Update card transform with smooth CSS transitions
  const updateCardTransform = (
    x: number,
    y: number,
    rotation: number,
    transition = false,
  ) => {
    if (!cardRef.current) return;

    const card = cardRef.current;

    // Apply CSS transform
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    card.style.transition = transition
      ? "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "none";

    // Update visual feedback based on position
    updateVisualFeedback(x, y, rotation);

    // Store current transform
    currentTransform.current = { x, y, rotation };
  };

  // Update visual feedback (indicators, shadows, etc.)
  const updateVisualFeedback = (x: number, y: number, rotation: number) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const swipeProgress = Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1);

    // Update swipe indicators based on card type
    let leftIndicatorClass = "";
    let rightIndicatorClass = "";

    if (cardType === "job") {
      leftIndicatorClass = ".job-pass-indicator";
      rightIndicatorClass = ".job-apply-indicator";
    } else if (cardType === "mentorship") {
      leftIndicatorClass = ".mentorship-pass-indicator";
      rightIndicatorClass = ".mentorship-connect-indicator";
    } else if (cardType === "networking") {
      leftIndicatorClass = ".networking-pass-indicator";
      rightIndicatorClass = ".networking-like-indicator";
    }

    const leftIndicator = document.querySelector(
      leftIndicatorClass,
    ) as HTMLElement;
    const rightIndicator = document.querySelector(
      rightIndicatorClass,
    ) as HTMLElement;

    if (x > 30) {
      // Right swipe (like/apply/connect) feedback
      card.style.boxShadow = `0 0 ${20 + swipeProgress * 30}px rgba(16, 185, 129, ${0.3 + swipeProgress * 0.4})`;
      if (rightIndicator)
        rightIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (leftIndicator) leftIndicator.style.opacity = "0";
    } else if (x < -30) {
      // Left swipe (pass) feedback
      card.style.boxShadow = `0 0 ${20 + swipeProgress * 30}px rgba(225, 29, 72, ${0.3 + swipeProgress * 0.4})`;
      if (leftIndicator)
        leftIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (rightIndicator) rightIndicator.style.opacity = "0";
    } else {
      // Neutral state
      card.style.boxShadow =
        "0 0 25px rgba(168, 85, 247, 0.35), inset 0 1px 3px rgba(255, 255, 255, 0.9)";
      if (leftIndicator) leftIndicator.style.opacity = "0";
      if (rightIndicator) rightIndicator.style.opacity = "0";
    }
  };

  // Start drag interaction
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAnimating) return; // Don't allow dragging during animations

    const pos = getPointerPosition(e);
    isDragging.current = true;
    setCursorState("grabbing");
    dragStart.current = pos;
    lastPosition.current = { ...pos, time: Date.now() };

    // Reset any existing transitions
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
    }

    // Prevent default to avoid scrolling on mobile
    e.preventDefault();
  };

  // Handle drag movement with real-time updates
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || isAnimating) return;

    const pos = getPointerPosition(e);
    const deltaX = pos.x - dragStart.current.x;
    const deltaY = pos.y - dragStart.current.y;

    // Calculate rotation based on horizontal movement (Tinder-style)
    const rotation = Math.max(
      -MAX_ROTATION,
      Math.min(MAX_ROTATION, deltaX * ROTATION_STRENGTH),
    );

    // Update card position and rotation
    updateCardTransform(deltaX, deltaY, rotation);

    // Track velocity for momentum calculation
    const now = Date.now();
    const timeDelta = now - lastPosition.current.time;
    if (timeDelta > 0) {
      velocity.current.x = (pos.x - lastPosition.current.x) / timeDelta;
      velocity.current.y = (pos.y - lastPosition.current.y) / timeDelta;
    }
    lastPosition.current = { ...pos, time: now };

    e.preventDefault();
  };

  // Handle drag end with threshold-based decision
  const handleDragEnd = () => {
    if (!isDragging.current || isAnimating) return;

    isDragging.current = false;
    setCursorState("grab");
    const { x, y } = currentTransform.current;
    const velocityMagnitude = Math.sqrt(
      velocity.current.x ** 2 + velocity.current.y ** 2,
    );

    // Determine if we should swipe off or snap back
    const shouldSwipeOff =
      Math.abs(x) > SWIPE_THRESHOLD || velocityMagnitude > VELOCITY_THRESHOLD;

    if (shouldSwipeOff) {
      // Trigger swipe animation
      const direction = x > 0 ? "right" : "left";
      animateSwipeOff(direction);
    } else {
      // Snap back to center
      animateSnapBack();
    }
  };

  // Animate card flying off screen
  const animateSwipeOff = (direction: "left" | "right") => {
    if (!cardRef.current) return;

    // Track the swipe direction for undo functionality
    setLastSwipeDirection(direction);

    setIsAnimating(true);
    const card = cardRef.current;

    // Calculate final position (off-screen)
    const windowWidth = window.innerWidth;
    const finalX =
      direction === "right" ? windowWidth + 200 : -windowWidth - 200;
    const finalY = currentTransform.current.y + velocity.current.y * 300; // Add some momentum
    const finalRotation = direction === "right" ? 30 : -30;

    // Apply final transform with transition
    card.style.transition =
      "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    card.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${finalRotation}deg)`;

    // Clear indicators after animation starts
    setTimeout(() => {
      const indicators = [
        ".job-pass-indicator",
        ".job-apply-indicator",
        ".mentorship-pass-indicator",
        ".mentorship-connect-indicator",
        ".networking-pass-indicator",
        ".networking-like-indicator",
      ];
      indicators.forEach((selector) => {
        const indicator = document.querySelector(selector) as HTMLElement;
        if (indicator) indicator.style.opacity = "0";
      });
    }, 100);

    // Trigger the appropriate action
    setTimeout(() => {
      if (direction === "right") {
        handleApply(currentCard);
      } else {
        handlePass();
      }
      setIsAnimating(false);

      // Trigger next card entrance animation immediately for seamless transition (like MEET)
      setNextCardAnimationClass("suite-card-emerge");
      // Clear animation class after animation completes
      setTimeout(() => {
        setNextCardAnimationClass("");
      }, 300); // Match animation duration

      // Reset card's visual state after animation completes (let SUITE handle card progression)
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = "none";
          cardRef.current.style.transform = "translate(0px, 0px) rotate(0deg)";
        }
        // Reset physics state
        currentTransform.current = { x: 0, y: 0, rotation: 0 };
        velocity.current = { x: 0, y: 0 };
      }, 100); // Quick reset after animation
    }, 300); // Trigger action mid-animation for responsiveness
  };

  // Animate card snapping back to center
  const animateSnapBack = () => {
    if (!cardRef.current) return;

    setIsAnimating(true);

    // Smooth spring animation back to center
    const startTime = Date.now();
    const startTransform = { ...currentTransform.current };

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const duration = 400; // ms
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (elastic out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const x = startTransform.x * (1 - eased);
      const y = startTransform.y * (1 - eased);
      const rotation = startTransform.rotation * (1 - eased);

      updateCardTransform(x, y, rotation);

      if (progress < 1) {
        animationId.current = requestAnimationFrame(animateFrame);
      } else {
        setIsAnimating(false);
        // Reset to exact center
        updateCardTransform(0, 0, 0);
      }
    };

    animationId.current = requestAnimationFrame(animateFrame);
  };

  // Button-triggered swipe animations
  const triggerButtonSwipe = (direction: "left" | "right") => {
    if (isAnimating) return;

    // Start from center and animate to off-screen
    currentTransform.current = { x: 0, y: 0, rotation: 0 };
    velocity.current = { x: direction === "right" ? 2 : -2, y: 0 };
    animateSwipeOff(direction);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) {
      return;
    }

    handleDragStart(e);

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e as any);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle card actions with SUITE cards (with Tinder-style animations)
  const handleApply = (card: SuiteCard) => {
    if (card.type === "job") {
      // Validate job profile before action
      if (!validateJobAction()) {
        return;
      }
      // Use real API for job applications
      swipeJobMutation.mutate({
        profileId: parseInt(card.id),
        action: "like",
      });
      // SEAMLESS UX: Removed disruptive "Application Sent!" toast notification
      // Job applications now submit instantly without blocking popup interruptions
    } else if (card.type === "mentorship") {
      // Validate mentorship profile before action
      if (!validateMentorshipAction()) {
        return;
      }

      // Use real API for mentorship profiles
      swipeMentorshipMutation.mutate({
        profileId: parseInt(card.id),
        action: "like",
      });
      // SEAMLESS UX: Removed disruptive mentorship toast notifications
      // Mentorship requests now submit instantly without blocking popup interruptions
    } else if (card.type === "networking") {
      // Validate networking profile before action
      if (!validateNetworkingAction()) {
        return;
      }
      // Use real API for networking profiles
      swipeNetworkingMutation.mutate({
        profileId: parseInt(card.id),
        action: "like",
      });
      // SEAMLESS UX: Removed disruptive "Connection Sent!" toast notification
      // Networking connection requests now submit instantly without blocking popup interruptions
    }

    // Don't call nextCard() - optimistic updates handle this
  };

  const handlePass = () => {
    if (currentCard?.type === "networking") {
      // Validate networking profile before action
      if (!validateNetworkingAction()) {
        return;
      }
      // Use real API for networking profiles
      swipeNetworkingMutation.mutate({
        profileId: parseInt(currentCard.id),
        action: "pass",
      });
    } else if (currentCard?.type === "mentorship") {
      // Validate mentorship profile before action
      if (!validateMentorshipAction()) {
        return;
      }
      // Use real API for mentorship profiles
      swipeMentorshipMutation.mutate({
        profileId: parseInt(currentCard.id),
        action: "pass",
      });
    } else if (currentCard?.type === "job") {
      // Validate job profile before action
      if (!validateJobAction()) {
        return;
      }
      // Use real API for job pass action
      swipeJobMutation.mutate({
        profileId: parseInt(currentCard.id),
        action: "pass",
      });
    }

    // Don't call nextCard() - optimistic updates handle this
  };

  // Enhanced handler functions for back/undo and message buttons
  const handleBack = () => {
    // Premium check for undo functionality
    if (!isPremium) {
      handlePremiumUpgradeClick();
      return;
    }

    // For mentorship cards, use the multi-undo system
    if (currentCard?.type === "mentorship") {
      if (swipeHistoryCount > 0 && !undoMentorshipMutation.isPending) {
        undoMentorshipMutation.mutate();
        return;
      }
      // If no swipes to undo for mentorship, don't navigate - just return
      return;
    }

    // For networking cards, use the multi-undo system
    if (currentCard?.type === "networking") {
      if (
        networkingSwipeHistoryCount > 0 &&
        !undoNetworkingMutation.isPending
      ) {
        undoNetworkingMutation.mutate();
        return;
      }
      // If no swipes to undo for networking, don't navigate - just return
      return;
    }

    // For job cards, use the multi-undo system
    if (currentCard?.type === "job") {
      if (jobSwipeHistoryCount > 0 && !undoJobMutation.isPending) {
        undoJobMutation.mutate();
        return;
      }
      // If no swipes to undo for jobs, don't navigate - just return
      return;
    }

    // For any other card types, allow navigation between cards
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    } else {
      // Cycle to last card if at first
      setCurrentCardIndex(currentCards.length - 1);
    }
  };

  // Enhanced message handler that creates instant matches across all SUITE contexts
  const handleMessage = async (card: SuiteCard) => {
    // Premium check for direct messaging functionality
    if (!isPremium) {
      handlePremiumUpgradeClick();
      return;
    }

    // Validate networking profile for networking cards
    if (card.type === "networking" && !validateNetworkingAction()) {
      return;
    }

    // Validate mentorship profile for mentorship cards
    if (card.type === "mentorship" && !validateMentorshipAction()) {
      return;
    }

    // Validate job profile for job cards
    if (card.type === "job" && !validateJobAction()) {
      return;
    }

    // Schedule card removal to happen DURING splash screen display (2.5 seconds after button click)
    setTimeout(() => {
      const removalEvent = new CustomEvent("suite_remove_from_discover", {
        detail: {
          suiteType: card.type, // "networking", "mentorship", or "job"
          removeProfileId: parseInt(card.id),
          removeUserId: parseInt((card.userId || card.id).toString()), // Use actual user ID from card, fallback to card.id
          reason: `${card.type}_message_button_clicked`,
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(removalEvent);

      console.log(
        `[CARD-REMOVAL] Removed ${card.type} profile ${card.id} from discover deck during splash screen (message button clicked)`,
      );
    }, 2500); // Remove card 2.5 seconds after button click, well into splash screen display

    try {
      // Create instant match via unified message endpoint
      const response = await fetch("/api/suite/connections/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: parseInt((card.userId || card.id).toString()), // Use actual user ID from card, fallback to card.id
          connectionType: card.type === "job" ? "jobs" : card.type, // Map "job" to "jobs" for backend compatibility
          profileId: parseInt(card.id), // Use profile ID for profile identification
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create connection");
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: "Instant Match Created! 💬",
        description: `You can now message ${
          card.type === "job"
            ? card.fullName
            : card.type === "mentorship"
              ? card.name
              : card.name
        } directly.`,
      });

      // Remove card from current view since connection is established
      const updatedCards = currentCards.filter(
        (_, index) => index !== currentCardIndex,
      );

      // Adjust current index if needed
      if (currentCardIndex >= updatedCards.length && updatedCards.length > 0) {
        setCurrentCardIndex(updatedCards.length - 1);
      } else if (updatedCards.length === 0) {
        setCurrentCardIndex(0);
      }

      // FIXED: Use smooth React Router navigation with splash screen instead of page refresh
      if (result.chatId) {
        // Store match data immediately to prevent loading issues
        try {
          // Create a temporary match object for immediate use
          const tempMatchData = {
            id: result.chatId,
            userId1: user?.id,
            userId2: parseInt(card.userId!.toString()),
            matched: true,
            createdAt: new Date().toISOString(),
            otherUser: {
              id: parseInt(card.userId!.toString()),
              fullName:
                card.type === "job"
                  ? card.fullName
                  : card.type === "mentorship"
                    ? card.name
                    : card.type === "networking"
                      ? card.name
                      : "Anonymous",
              photoUrl: card.photoUrl,
              bio:
                card.type === "job"
                  ? card.jobTitle
                  : card.type === "mentorship"
                    ? card.profession
                    : card.type === "networking"
                      ? card.professionalTag
                      : "Professional",
              profession:
                card.type === "mentorship"
                  ? card.profession
                  : card.type === "networking"
                    ? card.professionalTag
                    : "Professional",
              location:
                card.type === "networking"
                  ? (card as NetworkingCard).location
                  : card.type === "mentorship"
                    ? (card as MentorshipCard).location
                    : "Ghana",
            },
          };

          // Store match data in both session and local storage for immediate access
          sessionStorage.setItem(
            `match_data_${result.chatId}`,
            JSON.stringify(tempMatchData),
          );
          localStorage.setItem(
            `match_data_${result.chatId}`,
            JSON.stringify(tempMatchData),
          );

          // Prefill query cache to eliminate loading state
          queryClient.setQueryData(
            ["/api/match", result.chatId],
            tempMatchData,
          );

          // Ensure matches cache is invalidated to pick up new match
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

          // Store the new match flag to help chat page identify it
          sessionStorage.setItem(
            "newly_created_match",
            result.chatId.toString(),
          );

          console.log(
            `SUITE ${card.type} message success, prefilled cache and showing splash for chat ${result.chatId}`,
          );
        } catch (storageError) {
          console.error("Error storing match data:", storageError);
        }

        setTimeout(() => {
          showSplash({
            currentUser: {
              fullName: user?.fullName || "",
              photoUrl: user?.photoUrl || undefined,
            },
            targetUser: {
              fullName:
                card.type === "job"
                  ? card.fullName
                  : card.type === "mentorship"
                    ? (card as MentorshipCard).name
                    : card.type === "networking"
                      ? (card as NetworkingCard).name
                      : "Anonymous",
              photoUrl: card.photoUrl || undefined,
            },
            // Use chatId as matchId for navigation
            matchId: result.chatId,
            type: card.type, // Pass the card type for custom splash screen
          });
        }, 1500);
      } else {
        // ENHANCED: Show splash screen even without chatId for consistent UX
        console.log(
          `SUITE ${card.type} message incomplete data, showing splash and navigating to messages`,
        );

        setTimeout(() => {
          showSplash({
            currentUser: {
              fullName: user?.fullName || "",
              photoUrl: user?.photoUrl || undefined,
            },
            targetUser: {
              fullName:
                card.type === "job"
                  ? card.fullName
                  : card.type === "mentorship"
                    ? card.name
                    : card.type === "networking"
                      ? card.name
                      : "Anonymous",
              photoUrl: card.photoUrl || undefined,
            },
            // Use a temporary ID since chatId is missing
            matchId: Date.now(),
            error: true, // Flag to indicate error state for navigation to messages page
            type: card.type, // Pass the card type for custom splash screen
          });
        }, 1500);
      }

      // Refresh connections to update messaging tab
      queryClient.invalidateQueries({ queryKey: ["/api/suite/connections"] });
    } catch (error) {
      console.error("Error creating message connection:", error);

      // ENHANCED: Show splash screen even for errors to maintain smooth UX
      console.log(
        `SUITE ${card.type} message failed, showing splash and navigating to messages`,
      );

      showSplash({
        currentUser: {
          fullName: user?.fullName || "",
          photoUrl: user?.photoUrl || undefined,
        },
        targetUser: {
          fullName:
            card.type === "job"
              ? card.fullName
              : card.type === "mentorship"
                ? (card as MentorshipCard).name
                : card.type === "networking"
                  ? (card as NetworkingCard).name
                  : "Anonymous",
          photoUrl: card.photoUrl || undefined,
        },
        // Use a temporary ID for error cases
        matchId: Date.now(),
        error: true, // Flag to indicate this is an error state
        type: card.type, // Pass the card type for custom splash screen
      });

      toast({
        title: "Connection Failed",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const nextCard = () => {
    // Don't navigate if cards are being mutated or if array is empty
    if (currentCards.length === 0) {
      return;
    }

    // Use functional state update to avoid stale closure issues
    setCurrentCardIndex((prevIndex) => {
      if (prevIndex < currentCards.length - 1) {
        return prevIndex + 1;
      } else {
        // Reset to first card when reaching the end
        return 0;
      }
    });
  };

  // Unified button handler to prevent mobile touch event conflicts (same as MEET cards)
  const createButtonHandler = (action: () => void) => {
    return {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // If this was triggered by a touch event, ignore the click
        if (touchHandledRef.current) {
          touchHandledRef.current = false;
          return;
        }
        
        action();
      },
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Mark that we handled a touch event
        touchHandledRef.current = true;
        
        // Clear the flag after a short delay to allow for the click event
        setTimeout(() => {
          touchHandledRef.current = false;
        }, 100);
        
        action();
      }
    };
  };

  // Button click handlers with Tinder-style animations
  const handleDislikeButtonClick = () => {
    triggerButtonSwipe("left");
  };

  const handleLikeButtonClick = () => {
    triggerButtonSwipe("right");
  };

  // Swipe handlers (with Tinder-style animations)
  const handleSwipeLeft = () => {
    triggerButtonSwipe("left");
  };

  const handleSwipeRight = () => {
    triggerButtonSwipe("right");
  };

  // Jobs undo handler for button click
  const handleJobUndo = () => {
    if (jobSwipeHistoryCount > 0 && !undoJobMutation.isPending) {
      undoJobMutation.mutate();
    }
  };

  // All drag/swipe physics and animations removed - buttons only

  const renderJobCard = (card: JobCard) => (
    <div className="swipe-card h-full p-2 overflow-hidden">
      <Card
        ref={cardRef}
        className={`overflow-hidden h-full flex flex-col border border-white 
        rounded-xl relative overscroll-none
        drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]
        shadow-[0_0_25px_rgba(59,130,246,0.35),0_0_50px_rgba(59,130,246,0.2),inset_0_1px_3px_rgba(255,255,255,0.7)]
        transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(59,130,246,0.55),0_0_60px_rgba(59,130,246,0.3),inset_0_1px_3px_rgba(255,255,255,0.9)]
        ${restoreAnimationClass}
        ${nextCardAnimationClass}
        `}
        style={{
          perspective: "1500px",
          transformStyle: "preserve-3d",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          MozBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          cursor: cursorState,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header image with gradient overlay */}
        <div className="relative h-[90%] overflow-hidden overscroll-none touch-none">
          {/* Background Image - Show networking photo if available and visibility allows */}
          {card.photoUrl &&
          card.fieldVisibility?.showNetworkingPhotos !== false ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${card.photoUrl})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
            </div>
          )}

          {/* Enhanced compatibility/match score - NOW CLICKABLE */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => {
                // Check if padlock is locked - show arrow guide instead of opening dashboard
                if (!jobsPadlockUnlocked) {
                  setShowArrowGuide(true);
                  setArrowGuideType("job");
                  // Hide arrow after 2 seconds
                  setTimeout(() => {
                    setShowArrowGuide(false);
                    setArrowGuideType(null);
                  }, 2000);
                  return;
                }

                // Check premium access before navigation
                if (!user?.premiumAccess) {
                  setShowPremiumDialog(true);
                  return;
                }

                // Check if user has an active job profile
                if (!userJobProfile || !userJobProfile.isActive) {
                  // Show Create Job Profile modal instead of dashboard
                  setShowJobProfilePrompt(true);
                  return;
                }

                // Call the jobs compatibility API to create professional review record
                fetch(`/api/jobs/compatibility/${card.userId}`)
                  .then((response) => response.json())
                  .then((data) => {
                    console.log("Jobs compatibility API response:", data);
                    if (data.review) {
                      // Navigate to jobs professional review page
                      setLocation(`/suite/jobs/review/${card.userId}`);
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Error calling jobs compatibility API:",
                      error,
                    );
                    // Navigate anyway as fallback
                    setLocation(`/suite/jobs/review/${card.userId}`);
                  });
              }}
              className="relative bg-gradient-to-br from-blue-500/90 via-blue-600/90 to-indigo-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 
                         shadow-[0_8px_25px_rgba(59,130,246,0.3),0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]
                         hover:shadow-[0_12px_35px_rgba(59,130,246,0.4),0_6px_18px_rgba(0,0,0,0.25),inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.15)]
                         transition-all duration-300 hover:scale-105 hover:-translate-y-1 group percentage-badge-container
                         transform-gpu perspective-1000"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* Continuous circular outward effect */}
              <div
                className="absolute inset-0 rounded-xl border border-blue-300/30"
                style={{
                  animation: "expand-circle 2s ease-out infinite",
                }}
              />

              {/* Enhanced ripple effect */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-blue-400/60 animate-ping opacity-0"
                style={{
                  animation: "ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />

              {/* 3D Inner Button Container */}
              <div
                className="w-[3.1rem] h-[3.1rem] rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center 
                           shadow-[inset_0_2px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.8),0_3px_8px_rgba(59,130,246,0.2),0_1px_3px_rgba(0,0,0,0.3)]
                           transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_-3px_6px_rgba(255,255,255,0.9),0_4px_12px_rgba(59,130,246,0.3),0_2px_4px_rgba(0,0,0,0.4)]
                           relative z-10 border border-white/50 group-hover:-translate-y-0.5"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "translateZ(8px)",
                }}
              >
                {/* 3D Text with Enhanced Depth */}
                <div
                  className="relative flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Text Shadow Layer */}
                  <span className="absolute text-xl font-extrabold text-blue-600/20 transform translate-x-0.5 translate-y-0.5 blur-[0.5px]">
                    95%
                  </span>
                  {/* Main Text */}
                  <span
                    className={`relative text-xl font-extrabold bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-600 text-transparent bg-clip-text 
                                   drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transform transition-all duration-300 group-hover:scale-105 ${jobsPadlockUnlocked ? "percentage-revealed" : "percentage-blurred"}`}
                    style={{
                      textShadow:
                        "0 1px 3px rgba(59,130,246,0.3), 0 0 8px rgba(59,130,246,0.2)",
                      transform: "translateZ(4px)",
                    }}
                  >
                    95%
                  </span>
                  {/* Highlight Layer */}
                  <span className="absolute text-xl font-extrabold bg-gradient-to-t from-transparent to-white/30 text-transparent bg-clip-text transform -translate-y-0.5 scale-95">
                    95%
                  </span>
                </div>
                {/* Padlock moved outside the text container to avoid transform conflicts */}
                {!jobsPadlockUnlocked && (
                  <div className="padlock-overlay padlock-jobs">🔒</div>
                )}
              </div>
            </button>
          </div>

          {/* Arrow Guide for Jobs Unlock */}
          {showArrowGuide && arrowGuideType === "job" && (
            <div className="unlock-guide-arrow arrow-jobs">
              <div className="unlock-guide-text">Click 💼 to unlock</div>
              <div className="arrow-line-container">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            </div>
          )}

          {/* Verification Badge - positioned below percentage badge with 3D shiny styling */}
          {card.isVerified && (
            <div className="absolute top-24 right-4 z-30">
              <div className="relative inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-[0_3px_12px_rgba(34,197,94,0.4),0_1px_6px_rgba(34,197,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden border border-emerald-300/50 transform hover:scale-105 transition-all duration-200">
                <Shield className="h-2.5 w-2.5 drop-shadow-sm" />
                <span className="drop-shadow-sm tracking-wide">Verified</span>
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          )}

          {/* Header with Role Badge */}
          <div className="absolute top-4 left-4 z-30">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-orange-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                HIRING
              </span>
            </div>
          </div>

          {/* Job seeker profile info overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent px-4 pt-14 pb-3 flex flex-col text-white">
            {/* User Name with Salary Badge */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-3xl font-extrabold">
                <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                  <span className="text-4xl">
                    {card.fullName?.split(" ")[0]?.charAt(0) || "U"}
                  </span>
                  {card.fullName?.split(" ")[0]?.slice(1) || "ser"}
                </span>
              </h2>
              {/* Shiny Salary Badge positioned on the right edge */}
              {(card.salary ||
                card.compensation ||
                (card.salaryMin && card.salaryMax)) &&
                (card.fieldVisibility?.salary !== false ||
                  card.fieldVisibility?.compensation !== false) && (
                  <div className="relative bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl">
                    {/* Shiny overlay effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 rounded-xl" />

                    {/* Content */}
                    <div className="relative flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-white drop-shadow-lg" />
                      <span className="text-white text-sm font-extrabold drop-shadow-lg tracking-wide">
                        {/* Display dynamic salary with currency and period if available */}
                        {card.salaryMin && card.salaryMax
                          ? `${card.salaryCurrency || "$"}${card.salaryMin} - ${card.salaryMax}${card.salaryPeriod || "/year"}`
                          : `${card.salary || card.compensation}${card.salaryPeriod || "/year"}`}
                      </span>
                    </div>

                    {/* Additional shine effect */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
                    <div className="absolute top-1 left-2 w-1 h-1 bg-white/60 rounded-full" />
                  </div>
                )}
              {/* Desired Industry Badge - only show for job seekers if no salary */}
              {card.role === "job-seeker" && card.desiredIndustry && (
                <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden">
                  <span className="relative z-10 text-xs">
                    {card.desiredIndustry}
                  </span>
                </Badge>
              )}
            </div>

            {/* Job Title */}
            {card.jobTitle && card.fieldVisibility?.jobTitle !== false && (
              <div className="mb-3">
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    Job Title:
                  </span>
                  <span className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                    {card.jobTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Work Style (Work Type + Job Type) */}
            {(card.workType || card.jobType) &&
              card.fieldVisibility?.workType !== false &&
              card.fieldVisibility?.jobType !== false && (
                <div className="mb-3">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Work Style:
                    </span>
                    <span className="text-yellow-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                      {[card.workType, card.jobType]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                </div>
              )}

            {/* Experience Level */}
            {card.experienceLevel &&
              card.fieldVisibility?.experienceLevel !== false && (
                <div className="mb-3">
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Required Level:
                    </span>
                    <span className="text-emerald-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                      {card.experienceLevel}
                    </span>
                  </div>
                </div>
              )}

            {/* Company */}
            {card.company && card.fieldVisibility?.company !== false && (
              <div className="mb-3">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    Company:
                  </span>
                  <span className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                    {card.company}
                  </span>
                </div>
              </div>
            )}

            {/* Skills/Technologies */}
            {card.skills &&
              card.skills.length > 0 &&
              card.fieldVisibility?.skills !== false && (
                <div className="mb-3">
                  <span className="font-semibold text-white bg-gradient-to-r from-amber-300 to-blue-400 bg-clip-text text-transparent text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {card.skills.slice(0, 3).map((skill, index) => {
                      const gradientClasses = [
                        "from-blue-500/90 to-indigo-500/90",
                        "from-indigo-500/90 to-purple-500/90",
                        "from-purple-500/90 to-pink-500/90",
                      ];
                      const gradientClass =
                        gradientClasses[index % gradientClasses.length];

                      return (
                        <Badge
                          key={`${card.id}-skill-${index}`}
                          className={`bg-gradient-to-r ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border-0`}
                        >
                          {skill}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Job Description */}
            {card.description &&
              card.fieldVisibility?.description !== false && (
                <div className="mb-4">
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] block">
                        Job Description:
                      </span>
                      <span className="text-cyan-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                        {card.description}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Requirements */}
            {card.requirements &&
              card.fieldVisibility?.requirements !== false && (
                <div className="mb-4">
                  <div className="flex items-start">
                    <UserCheck className="h-4 w-4 mr-1 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] block">
                        Requirements:
                      </span>
                      <span className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                        {card.requirements}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Who Should Apply */}
            {card.whoShouldApply &&
              card.fieldVisibility?.whoShouldApply !== false && (
                <div className="mb-4">
                  <div className="flex items-start">
                    <UserCheck className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] block">
                        Who Should Apply:
                      </span>
                      <span className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                        {card.whoShouldApply}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Application URL */}
            {card.applicationUrl &&
              card.fieldVisibility?.applicationUrl !== false && (
                <div className="mb-3">
                  <div className="flex items-center">
                    <Link className="h-4 w-4 mr-1 text-purple-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Apply:
                    </span>
                    <span className="text-purple-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1 truncate">
                      {card.applicationUrl}
                    </span>
                  </div>
                </div>
              )}

            {/* Application Email */}
            {card.applicationEmail &&
              card.fieldVisibility?.applicationEmail !== false && (
                <div className="mb-3">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Email:
                    </span>
                    <span className="text-pink-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1 truncate">
                      {card.applicationEmail}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Enhanced action buttons with 3D styling */}
        <div className="py-1.5 px-3 flex justify-between items-center relative overflow-hidden backdrop-blur-md button-container">
          {/* Enhanced background with professional theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-200/80 via-indigo-100/90 to-purple-200/80 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-80 mix-blend-soft-light"></div>

          {/* Decorative elements */}
          <div className="absolute -top-2 left-[15%] w-3 h-3 rounded-full bg-blue-300/70 blur-[2px] animate-pulse"></div>
          <div
            className="absolute -bottom-1 right-[15%] w-2.5 h-2.5 rounded-full bg-indigo-300/70 blur-[2px] animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>

          {/* Back/Undo Button - Dynamic icon switching */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-sky-400 relative overflow-hidden z-10"
            {...createButtonHandler(jobSwipeHistoryCount > 0 ? handleJobUndo : handleBack)}
            style={{
              background: "linear-gradient(140deg, #a5b4fc 0%, #6366f1 100%)",
              boxShadow:
                "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(99, 102, 241, 0.35), 0 10px 30px rgba(99, 102, 241, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            {jobSwipeHistoryCount > 0 ? (
              // Undo icon when swipes are available
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            ) : (
              // Back arrow when no swipes available
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h9a6 6 0 0 1 0 12H9" />
              </svg>
            )}
          </button>

          {/* Pass Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-rose-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleDislikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #fda4af 0%, #e11d48 100%)",
              boxShadow:
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(225, 29, 72, 0.35), 0 10px 30px rgba(225, 29, 72, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <X
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Main Action Button - Apply */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-blue-400 relative overflow-hidden z-10"
            onClick={(e) => {
              // Prevent default action and stop propagation
              e.preventDefault();
              e.stopPropagation();

              // Skip animation if already animating
              if (briefcaseAnimating) return;

              // Premium check for middle button functionality
              if (!user?.premiumAccess) {
                setShowPremiumDialog(true);
                return;
              }

              // Start the briefcase animation
              setBriefcaseAnimating(true);
              setJobBriefcaseHidden(true);

              // Get button position
              const buttonRect = e.currentTarget.getBoundingClientRect();
              const buttonCenterX = buttonRect.left + buttonRect.width / 2;
              const buttonCenterY = buttonRect.top + buttonRect.height / 2;

              // Create flying briefcase element
              const flyingBriefcase = document.createElement("div");
              flyingBriefcase.className = "briefcase-flying";
              flyingBriefcase.style.left = `${buttonCenterX - 20}px`;
              flyingBriefcase.style.top = `${buttonCenterY - 20}px`;
              flyingBriefcase.style.fontSize = "40px";
              flyingBriefcase.textContent = "💼";
              document.body.appendChild(flyingBriefcase);

              // Get actual percentage badge position for precise targeting
              const cardElement = e.currentTarget.closest(".swipe-card");
              if (cardElement) {
                const percentageBadge = cardElement.querySelector(
                  ".percentage-badge-container",
                );
                let badgeX, badgeY;

                if (percentageBadge) {
                  // Use actual badge position for precise targeting
                  const badgeRect = percentageBadge.getBoundingClientRect();
                  badgeX = badgeRect.left + badgeRect.width / 2;
                  badgeY = badgeRect.top + badgeRect.height / 2;
                } else {
                  // Fallback to card-based approximation if badge not found
                  const cardRect = cardElement.getBoundingClientRect();
                  badgeX = cardRect.right - 50;
                  badgeY = cardRect.top + 30;
                }

                // Animate the briefcase flying to the exact badge position
                const deltaX = badgeX - buttonCenterX;
                const deltaY = badgeY - buttonCenterY;

                flyingBriefcase.style.setProperty("--target-x", `${deltaX}px`);
                flyingBriefcase.style.setProperty("--target-y", `${deltaY}px`);
                flyingBriefcase.style.animation =
                  "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

                // Trigger padlock unlock and percentage badge hit animation after flight delay
                setTimeout(() => {
                  const percentageBadge = cardElement.querySelector(
                    ".percentage-badge-container",
                  );
                  if (percentageBadge) {
                    // Start padlock unlock animation
                    const padlock =
                      percentageBadge.querySelector(".padlock-overlay");
                    if (padlock) {
                      padlock.classList.add("padlock-unlock");
                      setTimeout(() => {
                        setJobsPadlockUnlocked(true);
                      }, 400);
                    }

                    // Badge hit animation
                    percentageBadge.classList.add("percentage-badge-hit");
                    setTimeout(() => {
                      percentageBadge.classList.remove("percentage-badge-hit");
                    }, 600);

                    // Add unlock glow effect
                    percentageBadge.classList.add("badge-unlock-glow");
                    setTimeout(() => {
                      percentageBadge.classList.remove("badge-unlock-glow");
                    }, 1000);
                  }

                  // Create beautiful sparkle effect
                  const sparkle = document.createElement("div");
                  sparkle.className = "unlock-sparkle";
                  sparkle.textContent = "✨";
                  sparkle.style.left = `${badgeX}px`;
                  sparkle.style.top = `${badgeY}px`;
                  document.body.appendChild(sparkle);

                  setTimeout(() => {
                    document.body.removeChild(sparkle);
                  }, 800);

                  // Create confetti explosion at badge position
                  const confettiContainer = document.createElement("div");
                  confettiContainer.className = "confetti-container";
                  confettiContainer.style.left = `${badgeX}px`;
                  confettiContainer.style.top = `${badgeY}px`;

                  // Add confetti particles
                  for (let i = 0; i < 5; i++) {
                    const particle = document.createElement("div");
                    particle.className = "confetti-particle";
                    confettiContainer.appendChild(particle);
                  }

                  document.body.appendChild(confettiContainer);

                  // Clean up confetti after animation
                  setTimeout(() => {
                    document.body.removeChild(confettiContainer);
                  }, 600);
                }, 1500);
              }

              // Clean up flying briefcase after animation
              setTimeout(() => {
                document.body.removeChild(flyingBriefcase);
                setBriefcaseAnimating(false);
              }, 1500);
            }}
            style={{
              background: "linear-gradient(140deg, #93c5fd 0%, #3b82f6 100%)",
              boxShadow:
                "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(59, 130, 246, 0.35), 0 10px 30px rgba(59, 130, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            {!jobBriefcaseHidden && (
              <span
                className="text-4xl animate-spin-3d"
                style={{
                  filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                  animation: "spin3d 2s linear infinite",
                }}
              >
                💼
              </span>
            )}
          </button>

          {/* Accept Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-emerald-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleLikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
              boxShadow:
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <Heart
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Message Button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-sky-400 relative overflow-hidden z-10"
            onClick={() => handleMessage(card)}
            style={{
              background: "linear-gradient(140deg, #7dd3fc 0%, #0ea5e9 100%)",
              boxShadow:
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(14, 165, 233, 0.35), 0 10px 30px rgba(14, 165, 233, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </Card>
    </div>
  );

  const renderMentorshipCard = (card: MentorshipCard) => (
    <div className="swipe-card h-full p-2 overflow-hidden">
      <Card
        ref={cardRef}
        className={`overflow-hidden h-full flex flex-col border border-white
        rounded-xl relative overscroll-none
        drop-shadow-[0_0_35px_rgba(139,92,246,0.4)]
        shadow-[0_0_25px_rgba(139,92,246,0.35),0_0_50px_rgba(139,92,246,0.2),inset_0_1px_3px_rgba(255,255,255,0.7)]
        transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(139,92,246,0.55),0_0_60px_rgba(139,92,246,0.3),inset_0_1px_3px_rgba(255,255,255,0.9)]
        ${restoreAnimationClass}
        ${nextCardAnimationClass}
        `}
        style={{
          perspective: "1500px",
          transformStyle: "preserve-3d",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          MozBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          cursor: cursorState,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated Sparklight - Shooting Around Edges */}
        <div className="absolute inset-0 pointer-events-none z-40 rounded-xl overflow-hidden">
          <div className="sparklight-mentorship"></div>
        </div>

        {/* Header image with gradient overlay */}
        <div className="relative h-[90%] overflow-hidden overscroll-none touch-none">
          {card.photoUrl ? (
            <img
              src={card.photoUrl}
              className="w-full h-full object-cover"
              alt={`${card.name} photo`}
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-100 to-indigo-50">
              <div className="bg-white/80 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <span className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text font-bold block text-center">
                  {card.name}
                </span>
              </div>
            </div>
          )}

          {/* Enhanced compatibility/match score - Clickable with 3D Effects */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Check if padlock is locked - show arrow guide instead of opening dashboard
                if (!mentorshipPadlockUnlocked) {
                  setShowArrowGuide(true);
                  setArrowGuideType("mentorship");
                  // Hide arrow after 2 seconds
                  setTimeout(() => {
                    setShowArrowGuide(false);
                    setArrowGuideType(null);
                  }, 2000);
                  return;
                }

                // Check premium access before navigation
                if (!user?.premiumAccess) {
                  setShowPremiumDialog(true);
                  return;
                }

                // Check if user has an active mentorship profile
                if (!hasActiveMentorshipProfile()) {
                  // Show Create Mentorship Profile modal instead of dashboard
                  setShowMentorshipProfilePrompt(true);
                  return;
                }

                setLocation(`/suite/mentorship/compatibility/${card.id}`);
              }}
              className="relative bg-gradient-to-br from-purple-500/90 via-purple-600/90 to-pink-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 
                         shadow-[0_8px_25px_rgba(139,69,199,0.3),0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]
                         hover:shadow-[0_12px_35px_rgba(139,69,199,0.4),0_6px_18px_rgba(0,0,0,0.25),inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.15)]
                         transition-all duration-300 hover:scale-105 hover:-translate-y-1 group
                         transform-gpu perspective-1000"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* Continuous circular outward effect */}
              <div
                className="absolute inset-0 rounded-xl border border-purple-300/30"
                style={{
                  animation: "expand-circle 2s ease-out infinite",
                }}
              />

              {/* Enhanced ripple effect */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-purple-400/60 animate-ping opacity-0"
                style={{
                  animation: "ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />

              {/* 3D Inner Button Container */}
              <div
                className="percentage-badge-container w-[3.1rem] h-[3.1rem] rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center 
                           shadow-[inset_0_2px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.8),0_3px_8px_rgba(139,69,199,0.2),0_1px_3px_rgba(0,0,0,0.3)]
                           transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_-3px_6px_rgba(255,255,255,0.9),0_4px_12px_rgba(139,69,199,0.3),0_2px_4px_rgba(0,0,0,0.4)]
                           relative z-10 border border-white/50 group-hover:-translate-y-0.5"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "translateZ(8px)",
                }}
              >
                {/* 3D Text with Enhanced Depth */}
                <div
                  className="relative flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Text Shadow Layer */}
                  <span className="absolute text-xl font-extrabold text-purple-600/20 transform translate-x-0.5 translate-y-0.5 blur-[0.5px]">
                    92%
                  </span>
                  {/* Main Text */}
                  <span
                    className={`relative text-xl font-extrabold bg-gradient-to-b from-purple-600 via-purple-700 to-pink-600 text-transparent bg-clip-text 
                                   drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transform transition-all duration-300 group-hover:scale-105 ${mentorshipPadlockUnlocked ? "percentage-revealed" : "percentage-blurred"}`}
                    style={{
                      textShadow:
                        "0 1px 3px rgba(139,69,199,0.3), 0 0 8px rgba(139,69,199,0.2)",
                      transform: "translateZ(4px)",
                    }}
                  >
                    92%
                  </span>
                  {/* Highlight Layer */}
                  <span className="absolute text-xl font-extrabold bg-gradient-to-t from-transparent to-white/30 text-transparent bg-clip-text transform -translate-y-0.5 scale-95">
                    92%
                  </span>
                </div>
                {/* Padlock moved outside the text container to avoid transform conflicts */}
                {!mentorshipPadlockUnlocked && (
                  <div className="padlock-overlay padlock-mentorship">🔒</div>
                )}
              </div>
            </button>
          </div>

          {/* Arrow Guide for Mentorship Unlock */}
          {showArrowGuide && arrowGuideType === "mentorship" && (
            <div className="unlock-guide-arrow arrow-mentorship">
              <div className="unlock-guide-text">Click 🎓 to unlock</div>
              <div className="arrow-line-container">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            </div>
          )}

          {/* Verification Badge - positioned below percentage badge with 3D shiny styling */}
          {card.isVerified && (
            <div className="absolute top-24 right-4 z-30">
              <div className="relative inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-[0_3px_12px_rgba(34,197,94,0.4),0_1px_6px_rgba(34,197,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden border border-emerald-300/50 transform hover:scale-105 transition-all duration-200">
                <Shield className="h-2.5 w-2.5 drop-shadow-sm" />
                <span className="drop-shadow-sm tracking-wide">Verified</span>
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-4 left-4 z-30">
            <Badge className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900 font-bold shadow-lg border-0 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
              <span className="relative z-10">
                {card.isMentor ? "Mentor" : "Mentee"}
              </span>
            </Badge>
          </div>

          {/* Comprehensive mentorship info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 pt-16 pb-3 flex flex-col">
            <div className="mb-2">
              {/* Name and badge on same line */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-3xl font-extrabold">
                  <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                    <span className="text-4xl">
                      {card.name?.split(" ")[0]?.charAt(0) || "U"}
                    </span>
                    {card.name?.split(" ")[0]?.slice(1) || "ser"}
                  </span>
                </h2>
                {/* Industry Aspiration badge for mentees, Industries/Domains for mentors */}
                {card.role === "mentee" && card.industryAspiration && (
                  <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                    <span className="relative z-10 text-xs">
                      {card.industryAspiration}
                    </span>
                  </Badge>
                )}
                {card.role === "mentor" &&
                  card.industriesOrDomains &&
                  Array.isArray(card.industriesOrDomains) &&
                  card.industriesOrDomains.length > 0 &&
                  card.fieldVisibility?.industriesOrDomains !== false && (
                    <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                      <span className="relative z-10 text-xs">
                        {card.industriesOrDomains[0]}
                      </span>
                    </Badge>
                  )}
              </div>
              {/* Location - directly under name */}
              {card.type === "mentorship" &&
                card.location &&
                card.fieldVisibility?.location !== false && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-blue-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {card.location}
                    </span>
                  </div>
                )}
            </div>

            {/* Location field now handled within specific card types */}

            {/* Areas of Expertise for Mentors */}
            {card.role === "mentor" &&
              card.areasOfExpertise &&
              card.areasOfExpertise.length > 0 &&
              card.fieldVisibility?.areasOfExpertise !== false && (
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 mr-2 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Areas of Expertise:
                    </span>
                    <div className="text-emerald-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {Array.isArray(card.areasOfExpertise)
                        ? card.areasOfExpertise.join(", ")
                        : card.areasOfExpertise}
                    </div>
                  </div>
                </div>
              )}

            {/* Learning Goals for Mentees */}
            {card.role === "mentee" &&
              card.learningGoals &&
              card.learningGoals.length > 0 &&
              card.fieldVisibility?.learningGoals !== false && (
                <div className="flex items-center mb-2">
                  <Target className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Learning Goals:
                    </span>
                    <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {Array.isArray(card.learningGoals)
                        ? card.learningGoals.join(", ")
                        : card.learningGoals}
                    </div>
                  </div>
                </div>
              )}

            {/* Time Commitment */}
            {card.type === "mentorship" &&
              card.timeCommitment &&
              card.timeCommitment.trim() !== "" &&
              card.fieldVisibility?.timeCommitment !== false && (
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 mr-2 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Time Commitment:
                    </span>
                    <div className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {card.timeCommitment}
                    </div>
                  </div>
                </div>
              )}

            {/* Availability - Under Time Commitment */}
            {card.type === "mentorship" &&
              card.availability &&
              card.availability.trim() !== "" &&
              card.fieldVisibility?.availability !== false && (
                <div className="mb-1.5 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-green-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {card.availability}
                  </span>
                </div>
              )}

            {/* Languages Spoken */}
            {card.type === "mentorship" &&
              card.languagesSpoken &&
              card.languagesSpoken.length > 0 &&
              card.fieldVisibility?.languagesSpoken !== false && (
                <div className="mb-1.5">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <div className="flex flex-wrap gap-1">
                      {card.languagesSpoken
                        .slice(0, 3)
                        .map((language, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]"
                          >
                            {language}
                          </span>
                        ))}
                      {card.languagesSpoken.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          +{card.languagesSpoken.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Education Fields - High School */}
            {card.type === "mentorship" &&
              card.highSchool &&
              card.fieldVisibility?.highSchool !== false && (
                <div className="flex items-center mb-1.5">
                  <BookOpen className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="font-serif bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                    {card.highSchool}
                  </span>
                </div>
              )}

            {/* Education Fields - College/University */}
            {card.type === "mentorship" &&
              card.collegeUniversity &&
              card.fieldVisibility?.collegeUniversity !== false && (
                <div className="flex items-center mb-1.5">
                  <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="font-serif bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                    {card.collegeUniversity}
                  </span>
                </div>
              )}

            {/* Mentorship Style (for mentors) */}
            {card.type === "mentorship" &&
              card.role === "mentor" &&
              card.mentorshipStyle &&
              card.fieldVisibility?.mentorshipStyle !== false && (
                <div className="flex items-center mb-2">
                  <Zap className="h-4 w-4 mr-2 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Mentorship Style:
                    </span>
                    <div className="text-yellow-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {card.mentorshipStyle}
                    </div>
                  </div>
                </div>
              )}

            {/* Why I Mentor (for mentors) */}
            {card.type === "mentorship" &&
              card.role === "mentor" &&
              card.whyMentor &&
              card.fieldVisibility?.whyMentor !== false && (
                <div className="flex items-center mb-2">
                  <Heart className="h-4 w-4 mr-2 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Why I Mentor:
                    </span>
                    <div className="text-pink-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {card.whyMentor.length > 60
                        ? `${card.whyMentor.substring(0, 60)}...`
                        : card.whyMentor}
                    </div>
                  </div>
                </div>
              )}

            {/* Why I Seek Mentorship (for mentees) */}
            {card.type === "mentorship" &&
              card.role === "mentee" &&
              card.whySeekMentorship &&
              card.fieldVisibility?.whySeekMentorship !== false && (
                <div className="flex items-center mb-2">
                  <Heart className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <div>
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Why I Seek Mentorship:
                    </span>
                    <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      {card.whySeekMentorship.length > 60
                        ? `${card.whySeekMentorship.substring(0, 60)}...`
                        : card.whySeekMentorship}
                    </div>
                  </div>
                </div>
              )}

            {/* Preferred Mentorship Style (for mentees) */}
            {card.type === "mentorship" &&
              card.role === "mentee" &&
              card.preferredMentorshipStyle &&
              card.fieldVisibility?.preferredMentorshipStyle !== false && (
                <div className="mb-1.5">
                  <div className="flex items-center mb-1">
                    <Zap className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Preferred Style:
                    </span>
                  </div>
                  <div className="text-teal-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {card.preferredMentorshipStyle}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Enhanced action buttons with 3D styling */}
        <div className="py-1.5 px-3 flex justify-between items-center relative overflow-hidden backdrop-blur-md button-container">
          {/* Enhanced background with professional theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200/80 via-pink-100/90 to-indigo-200/80 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-80 mix-blend-soft-light"></div>

          {/* Decorative elements */}
          <div className="absolute -top-2 left-[15%] w-3 h-3 rounded-full bg-purple-300/70 blur-[2px] animate-pulse"></div>
          <div
            className="absolute -bottom-1 right-[15%] w-2.5 h-2.5 rounded-full bg-pink-300/70 blur-[2px] animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>

          {/* Back/Undo Button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-sky-400 relative overflow-hidden z-10"
            onClick={handleBack}
            style={{
              background: "linear-gradient(140deg, #a5b4fc 0%, #6366f1 100%)",
              boxShadow:
                "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(99, 102, 241, 0.35), 0 10px 30px rgba(99, 102, 241, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* For mentorship cards with undo capability, show undo icon, otherwise show back arrow */}
              {cardType === "mentorship" && swipeHistoryCount > 0 ? (
                <Undo
                  className="w-5 h-5 text-white"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h9a6 6 0 0 1 0 12H9" />
                </svg>
              )}
            </div>
          </button>

          {/* Pass Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-rose-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleDislikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #fda4af 0%, #e11d48 100%)",
              boxShadow:
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(225, 29, 72, 0.35), 0 10px 30px rgba(225, 29, 72, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <X
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Main Action Button - Connect */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-purple-400 relative overflow-hidden z-10"
            onClick={(e) => {
              // Trigger graduation cap animation instead of swipe
              if (!briefcaseAnimating) {
                // Premium check for middle button functionality
                if (!user?.premiumAccess) {
                  setShowPremiumDialog(true);
                  return;
                }

                setMentorshipBriefcaseHidden(true);
                setBriefcaseAnimating(true);
                console.log(
                  "[GRADUATION-CAP-ANIMATION] Started graduation cap flight animation for mentorship card",
                );

                // Get button position for animation starting point
                const buttonRect = e.currentTarget.getBoundingClientRect();
                const buttonCenterX = buttonRect.left + buttonRect.width / 2;
                const buttonCenterY = buttonRect.top + buttonRect.height / 2;

                // Create flying graduation cap element
                const flyingGradCap = document.createElement("div");
                flyingGradCap.className = "briefcase-flying";
                flyingGradCap.style.left = `${buttonCenterX - 20}px`;
                flyingGradCap.style.top = `${buttonCenterY - 20}px`;
                flyingGradCap.style.fontSize = "40px";
                flyingGradCap.textContent = "🎓";
                document.body.appendChild(flyingGradCap);

                // Get actual percentage badge position for precise targeting
                const cardElement = e.currentTarget.closest(".swipe-card");
                if (cardElement) {
                  const percentageBadge = cardElement.querySelector(
                    ".percentage-badge-container",
                  );
                  let badgeX, badgeY;

                  if (percentageBadge) {
                    // Use actual badge position for precise targeting
                    const badgeRect = percentageBadge.getBoundingClientRect();
                    badgeX = badgeRect.left + badgeRect.width / 2;
                    badgeY = badgeRect.top + badgeRect.height / 2;
                  } else {
                    // Fallback to card-based approximation if badge not found
                    const cardRect = cardElement.getBoundingClientRect();
                    badgeX = cardRect.right - 50;
                    badgeY = cardRect.top + 30;
                  }

                  // Animate the graduation cap flying to the exact badge position
                  const deltaX = badgeX - buttonCenterX;
                  const deltaY = badgeY - buttonCenterY;

                  flyingGradCap.style.setProperty("--target-x", `${deltaX}px`);
                  flyingGradCap.style.setProperty("--target-y", `${deltaY}px`);
                  flyingGradCap.style.animation =
                    "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

                  // Trigger padlock unlock and percentage badge hit animation after flight delay
                  setTimeout(() => {
                    const percentageBadge = cardElement.querySelector(
                      ".percentage-badge-container",
                    );
                    if (percentageBadge) {
                      // Start padlock unlock animation
                      const padlock =
                        percentageBadge.querySelector(".padlock-overlay");
                      if (padlock) {
                        padlock.classList.add("padlock-unlock");
                        setTimeout(() => {
                          setMentorshipPadlockUnlocked(true);
                        }, 400);
                      }

                      // Badge hit animation
                      percentageBadge.classList.add("percentage-badge-hit");
                      setTimeout(() => {
                        percentageBadge.classList.remove(
                          "percentage-badge-hit",
                        );
                      }, 600);
                    }

                    // Create confetti explosion
                    const confettiColors = [
                      "#ff6b6b",
                      "#4ecdc4",
                      "#45b7d1",
                      "#f9ca24",
                      "#f0932b",
                    ];
                    for (let i = 0; i < 5; i++) {
                      setTimeout(() => {
                        const confetti = document.createElement("div");
                        confetti.innerHTML = "✨";
                        confetti.className = "confetti-particle";
                        confetti.style.position = "fixed";
                        confetti.style.left = badgeX + "px";
                        confetti.style.top = badgeY + "px";
                        confetti.style.fontSize = "1.2rem";
                        confetti.style.pointerEvents = "none";
                        confetti.style.zIndex = "9998";
                        confetti.style.color = confettiColors[i];
                        document.body.appendChild(confetti);

                        // Random explosion direction
                        const angle = (Math.PI * 2 * i) / 5;
                        const distance = 60 + Math.random() * 40;
                        const x = Math.cos(angle) * distance;
                        const y = Math.sin(angle) * distance;

                        confetti.style.transition = "all 0.6s ease-out";
                        confetti.style.transform = `translate(${x}px, ${y}px) scale(0.5)`;
                        confetti.style.opacity = "0";

                        setTimeout(() => {
                          if (confetti.parentNode) {
                            confetti.parentNode.removeChild(confetti);
                          }
                        }, 600);
                      }, i * 50);
                    }

                    // Remove flying graduation cap
                    setTimeout(() => {
                      if (flyingGradCap.parentNode) {
                        flyingGradCap.parentNode.removeChild(flyingGradCap);
                      }
                    }, 200);
                  }, 1500);
                }

                // Reset animation after completion (1.5s flight + 0.8s confetti)
                setTimeout(() => {
                  setBriefcaseAnimating(false);
                  console.log("[GRADUATION-CAP-ANIMATION] Animation completed");
                }, 2300);
              }
            }}
            style={{
              background: "linear-gradient(140deg, #c084fc 0%, #8b5cf6 100%)",
              boxShadow:
                "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(139, 92, 246, 0.35), 0 10px 30px rgba(139, 92, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            {!mentorshipBriefcaseHidden && (
              <span
                className="text-4xl"
                style={{
                  filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                  animation: "spin3d 2s linear infinite",
                }}
              >
                🎓
              </span>
            )}
          </button>

          {/* Accept Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-emerald-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleLikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
              boxShadow:
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <Heart
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Message Button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-sky-400 relative overflow-hidden z-10"
            onClick={() => handleMessage(card)}
            style={{
              background: "linear-gradient(140deg, #7dd3fc 0%, #0ea5e9 100%)",
              boxShadow:
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(14, 165, 233, 0.35), 0 10px 30px rgba(14, 165, 233, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </Card>
    </div>
  );

  const renderNetworkingCard = (card: NetworkingCard) => (
    <div className="swipe-card h-full p-2 overflow-hidden">
      <Card
        ref={cardRef}
        className={`overflow-hidden h-full flex flex-col border border-white
        rounded-xl relative overscroll-none
        drop-shadow-[0_0_35px_rgba(16,185,129,0.4)]
        shadow-[0_0_30px_rgba(16,185,129,0.4),0_0_55px_rgba(16,185,129,0.25),inset_0_1px_3px_rgba(255,255,255,0.7)]
        transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_45px_rgba(16,185,129,0.6),0_0_65px_rgba(16,185,129,0.35),inset_0_1px_3px_rgba(255,255,255,0.9)]
        ${restoreAnimationClass}
        ${nextCardAnimationClass}
        `}
        style={{
          perspective: "1500px",
          transformStyle: "preserve-3d",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          MozBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          cursor: cursorState,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated Sparklight - Shooting Around Edges */}
        <div className="absolute inset-0 pointer-events-none z-40 rounded-xl overflow-hidden">
          <div className="sparklight-networking"></div>
        </div>

        {/* Header image with gradient overlay */}
        <div className="relative h-[90%] overflow-hidden overscroll-none touch-none">
          {card.photoUrl ? (
            <img
              src={card.photoUrl}
              className="w-full h-full object-cover"
              alt={`${card.name} photo`}
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-100 to-green-50">
              <div className="bg-white/80 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <span className="text-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-transparent bg-clip-text font-bold block text-center">
                  {card.name}
                </span>
              </div>
            </div>
          )}

          {/* Enhanced compatibility/match score - NOW CLICKABLE */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => {
                // Check if padlock is locked - show arrow guide instead of opening dashboard
                if (!networkingPadlockUnlocked) {
                  setShowArrowGuide(true);
                  setArrowGuideType("networking");
                  // Hide arrow after 2 seconds
                  setTimeout(() => {
                    setShowArrowGuide(false);
                    setArrowGuideType(null);
                  }, 2000);
                  return;
                }

                // Check premium access before navigation
                if (!user?.premiumAccess) {
                  setShowPremiumDialog(true);
                  return;
                }

                // Check if user has an active networking profile
                if (!hasActiveNetworkingProfile()) {
                  // Show Create Networking Profile modal instead of dashboard
                  setShowNetworkingProfilePrompt(true);
                  return;
                }

                // Self-compatibility check - prevent users from viewing their own compatibility
                if (user && card.userId === user.id) {
                  toast({
                    title: "Cannot View Own Compatibility",
                    description:
                      "You cannot view compatibility analysis for your own profile.",
                    variant: "destructive",
                  });
                  return;
                }

                // Call the networking compatibility API to create database record first
                fetch(`/api/suite/compatibility/user/${card.userId}`)
                  .then((response) => {
                    if (response.ok) {
                      return response.json();
                    } else {
                      throw new Error(
                        `API call failed with status ${response.status}`,
                      );
                    }
                  })
                  .then((data) => {
                    console.log("Networking compatibility API response:", data);
                    if (data.score && data.score.targetProfileId) {
                      // Navigate to networking compatibility dashboard using target profile ID
                      setLocation(
                        `/suite/compatibility/${data.score.targetProfileId}`,
                      );
                    } else {
                      console.warn(
                        "No targetProfileId found in API response, falling back to user navigation",
                      );
                      // Fallback: try to find the profile ID from the card data
                      setLocation(`/suite/compatibility/${card.id}`);
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Error calling networking compatibility API:",
                      error,
                    );
                    // Check if it's a self-compatibility error
                    if (error.message?.includes("400")) {
                      toast({
                        title: "Cannot View Own Compatibility",
                        description:
                          "You cannot view compatibility analysis for your own profile.",
                        variant: "destructive",
                      });
                      return;
                    }
                    // Navigate anyway as fallback for other errors
                    setLocation(`/suite/compatibility/${card.id}`);
                  });
              }}
              className="relative bg-gradient-to-br from-emerald-500/90 via-emerald-600/90 to-green-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 
                         shadow-[0_8px_25px_rgba(16,185,129,0.3),0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]
                         hover:shadow-[0_12px_35px_rgba(16,185,129,0.4),0_6px_18px_rgba(0,0,0,0.25),inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.15)]
                         transition-all duration-300 hover:scale-105 hover:-translate-y-1 group percentage-badge-container
                         transform-gpu perspective-1000"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* Continuous circular outward effect */}
              <div
                className="absolute inset-0 rounded-xl border border-emerald-300/30"
                style={{
                  animation: "expand-circle 2s ease-out infinite",
                }}
              />

              {/* Enhanced ripple effect */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-emerald-400/60 animate-ping opacity-0"
                style={{
                  animation: "ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />

              {/* 3D Inner Button Container */}
              <div
                className="w-[3.1rem] h-[3.1rem] rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center 
                           shadow-[inset_0_2px_6px_rgba(0,0,0,0.1),inset_0_-2px_4px_rgba(255,255,255,0.8),0_3px_8px_rgba(16,185,129,0.2),0_1px_3px_rgba(0,0,0,0.3)]
                           transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_-3px_6px_rgba(255,255,255,0.9),0_4px_12px_rgba(16,185,129,0.3),0_2px_4px_rgba(0,0,0,0.4)]
                           relative z-10 border border-white/50 group-hover:-translate-y-0.5"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "translateZ(8px)",
                }}
              >
                {/* 3D Text with Enhanced Depth */}
                <div
                  className="relative flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Text Shadow Layer */}
                  <span className="absolute text-xl font-extrabold text-emerald-600/20 transform translate-x-0.5 translate-y-0.5 blur-[0.5px]">
                    87%
                  </span>
                  {/* Main Text */}
                  <span
                    className={`relative text-xl font-extrabold bg-gradient-to-b from-emerald-600 via-emerald-700 to-green-600 text-transparent bg-clip-text 
                                   drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transform transition-all duration-300 group-hover:scale-105 ${networkingPadlockUnlocked ? "percentage-revealed" : "percentage-blurred"}`}
                    style={{
                      textShadow:
                        "0 1px 3px rgba(16,185,129,0.3), 0 0 8px rgba(16,185,129,0.2)",
                      transform: "translateZ(4px)",
                    }}
                  >
                    87%
                  </span>
                  {/* Highlight Layer */}
                  <span className="absolute text-xl font-extrabold bg-gradient-to-t from-transparent to-white/30 text-transparent bg-clip-text transform -translate-y-0.5 scale-95">
                    87%
                  </span>
                </div>
                {/* Padlock moved outside the text container to avoid transform conflicts */}
                {!networkingPadlockUnlocked && (
                  <div className="padlock-overlay padlock-networking">🔒</div>
                )}
              </div>
            </button>
          </div>

          {/* Arrow Guide for Networking Unlock */}
          {showArrowGuide && arrowGuideType === "networking" && (
            <div className="unlock-guide-arrow arrow-networking">
              <div className="unlock-guide-text">Click 🤝 to unlock</div>
              <div className="arrow-line-container">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            </div>
          )}

          {/* Verification Badge - positioned below percentage badge with 3D shiny styling */}
          {card.isVerified && (
            <div className="absolute top-24 right-4 z-30">
              <div className="relative inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-[0_3px_12px_rgba(34,197,94,0.4),0_1px_6px_rgba(34,197,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden border border-emerald-300/50 transform hover:scale-105 transition-all duration-200">
                <Shield className="h-2.5 w-2.5 drop-shadow-sm" />
                <span className="drop-shadow-sm tracking-wide">Verified</span>
                {/* Metallic shine overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          )}

          {/* Profile Content with gradient overlay for better text readability */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 pt-16 pb-3 flex flex-col">
            {/* Bottom Content */}
            <div className="space-y-3">
              {/* User Name with Industry Badge */}
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-3xl font-extrabold">
                  <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                    <span className="text-4xl">
                      {card.name?.split(" ")[0]?.charAt(0) || "U"}
                    </span>
                    {card.name?.split(" ")[0]?.slice(1) || "ser"}
                  </span>
                </h2>
                {/* Industry Badge */}
                {card.industry && card.fieldVisibility?.industry && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border border-white/20 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1.5 animate-pulse"></span>
                    {card.industry}
                  </span>
                )}
              </div>

              {/* Location */}
              {card.location && card.fieldVisibility?.location && (
                <div className="flex items-center mb-2">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-indigo-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {card.location}
                  </span>
                </div>
              )}

              {/* Current Role and Company */}
              {((card.currentRole && card.fieldVisibility?.currentRole) ||
                (card.currentCompany &&
                  card.fieldVisibility?.currentCompany)) && (
                <div className="flex items-center mb-2">
                  <Briefcase className="h-4 w-4 mr-2 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="text-teal-400 font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                    {card.currentRole &&
                    card.fieldVisibility?.currentRole &&
                    card.currentCompany &&
                    card.fieldVisibility?.currentCompany
                      ? `${card.currentRole} @ ${card.currentCompany}`
                      : card.currentRole && card.fieldVisibility?.currentRole
                        ? card.currentRole
                        : card.currentCompany &&
                            card.fieldVisibility?.currentCompany
                          ? card.currentCompany
                          : ""}
                  </span>
                </div>
              )}

              {/* Education Fields - High School */}
              {card.highSchool && card.fieldVisibility?.highSchool && (
                <div className="flex items-center mb-1.5">
                  <BookOpen className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                  <span className="font-serif bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                    {card.highSchool}
                  </span>
                </div>
              )}

              {/* Education Fields - College/University */}
              {card.collegeUniversity &&
                card.fieldVisibility?.collegeUniversity && (
                  <div className="flex items-center mb-1.5">
                    <GraduationCap className="h-4 w-4 mr-1 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                    <span className="font-serif bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                      {card.collegeUniversity}
                    </span>
                  </div>
                )}

              {/* Professional Tagline */}
              {card.professionalTag &&
                card.fieldVisibility?.professionalTagline && (
                  <div className="mb-3 rounded-md overflow-hidden">
                    <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient italic">
                      "{card.professionalTag}"
                    </p>
                  </div>
                )}

              {/* Looking For */}
              {card.lookingFor && card.fieldVisibility?.lookingFor && (
                <div className="mb-2">
                  <div className="flex items-start mb-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] mt-0.5"
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
                    <div>
                      <span className="font-semibold text-white text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        Looking for:
                      </span>
                      <p className="text-white/90 text-sm leading-tight drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        {card.lookingFor}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Can Offer */}
              {card.canOffer && card.fieldVisibility?.canOffer && (
                <div className="mb-1.5">
                  <div className="flex items-start mb-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] mt-0.5"
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
                    <div>
                      <span className="font-semibold text-white text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        Can offer:
                      </span>
                      <p className="text-white/90 text-sm leading-tight drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        {card.canOffer}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Interests */}
              {card.sharedInterests &&
                card.sharedInterests.length > 0 &&
                card.fieldVisibility?.professionalInterests && (
                  <div className="mb-2">
                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                      Interests:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {card.sharedInterests
                        .slice(0, 2)
                        .map((interest, index) => {
                          const gradientClasses = [
                            "from-purple-500/90 to-fuchsia-500/90",
                            "from-amber-500/90 to-orange-500/90",
                          ];
                          const gradientClass =
                            gradientClasses[index % gradientClasses.length];

                          return (
                            <Badge
                              key={`${card.id}-interest-${index}`}
                              className={`bg-gradient-to-r ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border-0`}
                            >
                              {interest}
                            </Badge>
                          );
                        })}
                      {card.sharedInterests.length > 2 && (
                        <Badge className="bg-white/20 text-white text-xs py-0 px-2.5 border-0">
                          +{card.sharedInterests.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Enhanced action buttons with 3D styling */}
        <div className="py-1.5 px-3 flex justify-between items-center relative overflow-hidden backdrop-blur-md button-container">
          {/* Enhanced background with professional theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/80 via-teal-100/90 to-green-200/80 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-80 mix-blend-soft-light"></div>

          {/* Decorative elements */}
          <div className="absolute -top-2 left-[15%] w-3 h-3 rounded-full bg-emerald-300/70 blur-[2px] animate-pulse"></div>
          <div
            className="absolute -bottom-1 right-[15%] w-2.5 h-2.5 rounded-full bg-teal-300/70 blur-[2px] animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>

          {/* Back/Undo Button */}
          <button
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform border border-sky-400 relative overflow-hidden z-10 ${
              // Disabled state when no swipes available - excluding networking from cursor-not-allowed
              (cardType === "mentorship" && swipeHistoryCount === 0) ||
              (cardType === "job" && jobSwipeHistoryCount === 0)
                ? "opacity-50 cursor-not-allowed"
                : cardType === "networking" && networkingSwipeHistoryCount === 0
                  ? "opacity-50 cursor-pointer"
                  : "hover:scale-110 cursor-pointer"
            }`}
            onClick={handleBack}
            disabled={
              (cardType === "mentorship" && swipeHistoryCount === 0) ||
              (cardType === "job" && jobSwipeHistoryCount === 0)
            }
            style={{
              background: "linear-gradient(140deg, #c084fc 0%, #8b5cf6 100%)",
              boxShadow:
                "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              const isDisabled =
                (cardType === "mentorship" && swipeHistoryCount === 0) ||
                (cardType === "job" && jobSwipeHistoryCount === 0);

              if (!isDisabled) {
                e.currentTarget.style.transform =
                  "perspective(500px) rotateX(5deg) scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 10px rgba(139, 92, 246, 0.35), 0 10px 30px rgba(139, 92, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Show undo icon when swipes are available, back arrow when disabled */}
              {(cardType === "mentorship" && swipeHistoryCount > 0) ||
              (cardType === "networking" && networkingSwipeHistoryCount > 0) ||
              (cardType === "job" && jobSwipeHistoryCount > 0) ? (
                <Undo
                  className="w-5 h-5 text-white"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h9a6 6 0 0 1 0 12H9" />
                </svg>
              )}

              {/* Undo count indicator for job cards */}
              {cardType === "job" && jobSwipeHistoryCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white shadow-lg">
                  {jobSwipeHistoryCount > 9 ? "9+" : jobSwipeHistoryCount}
                </div>
              )}
            </div>
          </button>

          {/* Pass Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-rose-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleDislikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #fda4af 0%, #e11d48 100%)",
              boxShadow:
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(225, 29, 72, 0.35), 0 10px 30px rgba(225, 29, 72, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <X
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Main Action Button - Connect */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-emerald-400 relative overflow-hidden z-10"
            onClick={(e) => {
              // For networking cards, trigger handshake animation instead of immediate swipe
              if (card.type === "networking" && !handshakeAnimating) {
                // Premium check for middle button functionality
                if (!user?.premiumAccess) {
                  setShowPremiumDialog(true);
                  return;
                }

                setHandshakeHidden(true);
                setHandshakeAnimating(true);
                console.log(
                  "[HANDSHAKE-ANIMATION] Started handshake flight animation for networking card",
                );

                // Get button position for animation starting point
                const buttonRect = e.currentTarget.getBoundingClientRect();
                const buttonCenterX = buttonRect.left + buttonRect.width / 2;
                const buttonCenterY = buttonRect.top + buttonRect.height / 2;

                // Create flying handshake element
                const flyingHandshake = document.createElement("div");
                flyingHandshake.className = "handshake-flying";
                flyingHandshake.style.left = `${buttonCenterX - 20}px`;
                flyingHandshake.style.top = `${buttonCenterY - 20}px`;
                flyingHandshake.style.fontSize = "40px";
                flyingHandshake.textContent = "🤝🏼";
                document.body.appendChild(flyingHandshake);

                // Get actual percentage badge position for precise targeting
                const cardElement = e.currentTarget.closest(".swipe-card");
                if (cardElement) {
                  const percentageBadge = cardElement.querySelector(
                    ".percentage-badge-container",
                  );
                  let badgeX, badgeY;

                  if (percentageBadge) {
                    // Use actual badge position for precise targeting
                    const badgeRect = percentageBadge.getBoundingClientRect();
                    badgeX = badgeRect.left + badgeRect.width / 2;
                    badgeY = badgeRect.top + badgeRect.height / 2;
                  } else {
                    // Fallback to card-based approximation if badge not found
                    const cardRect = cardElement.getBoundingClientRect();
                    badgeX = cardRect.right - 50;
                    badgeY = cardRect.top + 30;
                  }

                  // Animate the handshake flying to the exact badge position
                  const deltaX = badgeX - buttonCenterX;
                  const deltaY = badgeY - buttonCenterY;

                  flyingHandshake.style.setProperty(
                    "--target-x",
                    `${deltaX}px`,
                  );
                  flyingHandshake.style.setProperty(
                    "--target-y",
                    `${deltaY}px`,
                  );
                  flyingHandshake.style.animation =
                    "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

                  // Trigger padlock unlock and percentage badge hit animation after flight delay
                  setTimeout(() => {
                    const percentageBadge = cardElement.querySelector(
                      ".percentage-badge-container",
                    );
                    if (percentageBadge) {
                      // Start padlock unlock animation
                      const padlock =
                        percentageBadge.querySelector(".padlock-overlay");
                      if (padlock) {
                        padlock.classList.add("padlock-unlock");
                        setTimeout(() => {
                          setNetworkingPadlockUnlocked(true);
                        }, 400);
                      }

                      // Badge hit animation
                      percentageBadge.classList.add("percentage-badge-hit");
                      setTimeout(() => {
                        percentageBadge.classList.remove(
                          "percentage-badge-hit",
                        );
                      }, 600);

                      // Add unlock glow effect
                      percentageBadge.classList.add("badge-unlock-glow");
                      setTimeout(() => {
                        percentageBadge.classList.remove("badge-unlock-glow");
                      }, 1000);
                    }

                    // Create beautiful sparkle effect
                    const sparkle = document.createElement("div");
                    sparkle.className = "unlock-sparkle";
                    sparkle.textContent = "✨";
                    sparkle.style.left = `${badgeX}px`;
                    sparkle.style.top = `${badgeY}px`;
                    document.body.appendChild(sparkle);

                    setTimeout(() => {
                      if (sparkle.parentNode) {
                        sparkle.parentNode.removeChild(sparkle);
                      }
                    }, 800);

                    // Create confetti explosion at badge position
                    const confettiContainer = document.createElement("div");
                    confettiContainer.className = "confetti-container";
                    confettiContainer.style.left = `${badgeX}px`;
                    confettiContainer.style.top = `${badgeY}px`;

                    // Add confetti particles
                    for (let i = 1; i <= 5; i++) {
                      const particle = document.createElement("div");
                      particle.className = `confetti-particle confetti-particle-${i}`;
                      confettiContainer.appendChild(particle);
                    }

                    document.body.appendChild(confettiContainer);

                    // Clean up confetti after animation
                    setTimeout(() => {
                      if (confettiContainer.parentNode) {
                        confettiContainer.parentNode.removeChild(
                          confettiContainer,
                        );
                      }
                    }, 1000);
                  }, 1500); // Start confetti after handshake flight completes
                }

                // Clean up flying handshake after animation
                setTimeout(() => {
                  if (flyingHandshake.parentNode) {
                    flyingHandshake.parentNode.removeChild(flyingHandshake);
                  }
                }, 1500);

                // Reset animation after completion (1.5s flight + 0.8s confetti)
                setTimeout(() => {
                  setHandshakeAnimating(false);
                  console.log("[HANDSHAKE-ANIMATION] Animation completed");
                }, 2300);
              } else {
                // For non-networking cards, use normal behavior
                handleApply(card);
              }
            }}
            style={{
              background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
              boxShadow:
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            {!handshakeHidden && (
              <span
                className="text-4xl"
                style={{
                  filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                  animation: "spin3d 2s linear infinite",
                }}
              >
                🤝🏼
              </span>
            )}
          </button>

          {/* Accept Button */}
          <button
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-emerald-400 relative overflow-hidden z-10"
            {...createButtonHandler(handleLikeButtonClick)}
            style={{
              background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)",
              boxShadow:
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <Heart
              className="w-6 h-6 text-white"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            />
          </button>

          {/* Message Button */}
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-sky-400 relative overflow-hidden z-10"
            onClick={() => handleMessage(card)}
            style={{
              background: "linear-gradient(140deg, #7dd3fc 0%, #0ea5e9 100%)",
              boxShadow:
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
              transform: "perspective(500px) rotateX(10deg)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(5deg) scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 6px 10px rgba(14, 165, 233, 0.35), 0 10px 30px rgba(14, 165, 233, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform =
                "perspective(500px) rotateX(10deg)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(14, 165, 233, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </Card>
    </div>
  );

  const renderCard = (card: SuiteCard) => {
    console.log("renderCard called with card:", card);
    switch (card.type) {
      case "job":
        console.log("Rendering job card");
        return renderJobCard(card);
      case "mentorship":
        console.log("Rendering mentorship card");
        return renderMentorshipCard(card);
      case "networking":
        console.log("Rendering networking card");
        return renderNetworkingCard(card);
    }
  };

  return (
    <>
      <AppHeader />

      <div
        className={`relative border-t pb-14 overflow-hidden ${
          darkMode
            ? "border-slate-700/30 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"
            : "border-gray-200 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"
        }`}
      >
        {/* Ambient lighting effects - conditional based on dark mode */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            darkMode
              ? "bg-gradient-to-t from-indigo-900/20 via-transparent to-blue-900/10"
              : "bg-gradient-to-t from-blue-100/40 via-transparent to-purple-100/20"
          }`}
        ></div>
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            darkMode ? "bg-blue-500/5" : "bg-blue-400/20"
          }`}
        ></div>
        <div
          className={`absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
            darkMode ? "bg-indigo-500/5" : "bg-purple-400/20"
          }`}
        ></div>

        {/* Card Type Selector - Conditional Design */}
        <div
          className={`shadow-2xl border-b px-3 py-2 backdrop-blur-xl ${
            darkMode
              ? "bg-gradient-to-r from-slate-800/60 via-slate-700/70 to-slate-800/60 border-slate-600/30"
              : "bg-gradient-to-r from-white/80 via-blue-50/90 to-white/80 border-gray-200/50"
          }`}
        >
          <div className="flex gap-2 max-w-sm mx-auto">
            {/* Jobs tab (hidden for under-18) */}
            {!(user && isUnder18(user.dateOfBirth)) && (
              <button
                className={`
                flex-1 relative overflow-hidden rounded-lg px-3 py-2 
                transition-all duration-300 ease-out transform
                ${
                  cardType === "job"
                    ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-500/30 scale-105 border-blue-400/40"
                    : darkMode
                      ? "bg-gradient-to-r from-slate-700/70 via-slate-600/80 to-slate-700/70 text-slate-300 hover:from-blue-900/60 hover:via-blue-800/70 hover:to-indigo-900/60 hover:text-blue-200 shadow-md hover:shadow-lg hover:shadow-blue-500/20"
                      : "bg-gradient-to-r from-white/80 via-gray-50/90 to-white/80 text-gray-700 hover:from-blue-100/80 hover:via-blue-50/90 hover:to-indigo-100/80 hover:text-blue-700 shadow-md hover:shadow-lg hover:shadow-blue-500/20"
                }
                border ${darkMode ? "border-slate-600/40" : "border-gray-300/40"} backdrop-blur-sm
                hover:scale-102 active:scale-98
              `}
                onClick={() => {
                  setCardType("job");
                  setCurrentCardIndex(0);
                  // Update URL to reflect tab change
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set("tab", "job");
                  window.history.replaceState({}, "", newUrl.toString());
                }}
              >
                {/* Animated background effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${cardType === "job" ? "from-blue-400/20 to-cyan-400/20" : "from-transparent to-transparent hover:from-blue-400/10 hover:to-cyan-400/10"} transition-all duration-300`}
                ></div>

                {/* Content */}
                <div className="relative flex items-center justify-center gap-1.5 font-medium">
                  <Briefcase
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      cardType === "job"
                        ? "text-blue-100"
                        : darkMode
                          ? "text-slate-500"
                          : "text-gray-500"
                    }`}
                  />
                  <span className="text-xs font-semibold tracking-wide">
                    {t("navigation.jobs")}
                  </span>
                </div>

                {/* Active indicator */}
                {cardType === "job" && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full"></div>
                )}
              </button>
            )}

            <button
              className={`
                flex-1 relative overflow-hidden rounded-lg px-3 py-2 
                transition-all duration-300 ease-out transform
                ${
                  cardType === "mentorship"
                    ? "bg-gradient-to-r from-purple-600 via-purple-700 to-pink-700 text-white shadow-lg shadow-purple-500/30 scale-105 border-purple-400/40"
                    : darkMode
                      ? "bg-gradient-to-r from-slate-700/70 via-slate-600/80 to-slate-700/70 text-slate-300 hover:from-purple-900/60 hover:via-purple-800/70 hover:to-pink-900/60 hover:text-purple-200 shadow-md hover:shadow-lg hover:shadow-purple-500/20"
                      : "bg-gradient-to-r from-white/80 via-gray-50/90 to-white/80 text-gray-700 hover:from-purple-100/80 hover:via-purple-50/90 hover:to-pink-100/80 hover:text-purple-700 shadow-md hover:shadow-lg hover:shadow-purple-500/20"
                }
                border ${darkMode ? "border-slate-600/40" : "border-gray-300/40"} backdrop-blur-sm
                hover:scale-102 active:scale-98
              `}
              onClick={() => {
                setCardType("mentorship");
                setCurrentCardIndex(0);
                // Update URL to reflect tab change
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("tab", "mentorship");
                window.history.replaceState({}, "", newUrl.toString());
              }}
            >
              {/* Animated background effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${cardType === "mentorship" ? "from-purple-400/20 to-pink-400/20" : "from-transparent to-transparent hover:from-purple-400/10 hover:to-pink-400/10"} transition-all duration-300`}
              ></div>

              {/* Content */}
              <div className="relative flex items-center justify-center gap-1.5 font-medium">
                <GraduationCap
                  className={`w-3.5 h-3.5 transition-all duration-300 ${
                    cardType === "mentorship"
                      ? "text-purple-100"
                      : darkMode
                        ? "text-slate-500"
                        : "text-gray-500"
                  }`}
                />
                <span className="text-xs font-semibold tracking-wide">
                  {t("navigation.mentorship")}
                </span>
              </div>

              {/* Active indicator */}
              {cardType === "mentorship" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent rounded-full"></div>
              )}
            </button>

            <button
              className={`
                flex-1 relative overflow-hidden rounded-lg px-3 py-2 
                transition-all duration-300 ease-out transform
                ${
                  cardType === "networking"
                    ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-lg shadow-emerald-500/30 scale-105 border-emerald-400/40"
                    : darkMode
                      ? "bg-gradient-to-r from-slate-700/70 via-slate-600/80 to-slate-700/70 text-slate-300 hover:from-emerald-900/60 hover:via-emerald-800/70 hover:to-teal-900/60 hover:text-emerald-200 shadow-md hover:shadow-lg hover:shadow-emerald-500/20"
                      : "bg-gradient-to-r from-white/80 via-gray-50/90 to-white/80 text-gray-700 hover:from-emerald-100/80 hover:via-emerald-50/90 hover:to-teal-100/80 hover:text-emerald-700 shadow-md hover:shadow-lg hover:shadow-emerald-500/20"
                }
                border ${darkMode ? "border-slate-600/40" : "border-gray-300/40"} backdrop-blur-sm
                hover:scale-102 active:scale-98
              `}
              onClick={() => {
                setCardType("networking");
                setCurrentCardIndex(0);
                // Update URL to reflect tab change
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("tab", "networking");
                window.history.replaceState({}, "", newUrl.toString());
              }}
            >
              {/* Animated background effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${cardType === "networking" ? "from-emerald-400/20 to-teal-400/20" : "from-transparent to-transparent hover:from-emerald-400/10 hover:to-teal-400/10"} transition-all duration-300`}
              ></div>

              {/* Content */}
              <div className="relative flex items-center justify-center gap-1.5 font-medium">
                <Users
                  className={`w-3.5 h-3.5 transition-all duration-300 ${
                    cardType === "networking"
                      ? "text-emerald-100"
                      : darkMode
                        ? "text-slate-500"
                        : "text-gray-500"
                  }`}
                />
                <span className="text-xs font-semibold tracking-wide">
                  {t("navigation.network")}
                </span>
              </div>

              {/* Active indicator */}
              {cardType === "networking" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent rounded-full"></div>
              )}
            </button>
          </div>

          {/* Subtle tech grid pattern overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
        </div>

        {/* Main Card Area - Optimized for full card visibility with dual-card support */}
        <div
          className="flex items-center justify-center px-3 py-1 overflow-hidden relative"
          style={{ height: "calc(100vh - 160px)" }}
        >
          {/* Previous Card - renders behind during synchronized animation */}
          {previousCard && previousCardEntering && (
            <div
              className="w-full max-w-lg absolute z-10"
              style={{ height: "calc(100vh - 170px)", maxHeight: "900px" }}
            >
              {renderCard(previousCard)}
            </div>
          )}

          {/* Current Card - main card display */}
          {currentCard ? (
            <div
              className="w-full max-w-lg relative z-20"
              style={{ height: "calc(100vh - 170px)", maxHeight: "900px" }}
            >
              {renderCard(currentCard)}
            </div>
          ) : (
            <div className="text-center p-8">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 relative transform transition-all duration-500 hover:scale-110 ${
                  darkMode
                    ? "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 border border-slate-500/50"
                    : "bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 border border-gray-400/50"
                }`}
                style={{
                  boxShadow: darkMode
                    ? `
                      0 8px 16px rgba(0, 0, 0, 0.4),
                      0 4px 8px rgba(0, 0, 0, 0.3),
                      inset 0 2px 4px rgba(255, 255, 255, 0.1),
                      inset 0 -3px 6px rgba(0, 0, 0, 0.3)
                    `
                    : `
                      0 8px 16px rgba(0, 0, 0, 0.15),
                      0 4px 8px rgba(0, 0, 0, 0.1),
                      inset 0 2px 4px rgba(255, 255, 255, 0.8),
                      inset 0 -3px 6px rgba(0, 0, 0, 0.1)
                    `,
                  transform: "perspective(1000px) rotateX(10deg)",
                }}
              >
                {cardType === "mentorship" ? (
                  <GraduationCap
                    className={`w-12 h-12 transform transition-all duration-300 ${
                      darkMode ? "text-slate-300" : "text-gray-700"
                    }`}
                    style={{
                      filter: darkMode
                        ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))"
                        : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                      transform: "translateZ(8px)",
                    }}
                  />
                ) : cardType === "networking" ? (
                  <Users
                    className={`w-12 h-12 transform transition-all duration-300 ${
                      darkMode ? "text-slate-300" : "text-gray-700"
                    }`}
                    style={{
                      filter: darkMode
                        ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))"
                        : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                      transform: "translateZ(8px)",
                    }}
                  />
                ) : (
                  <Briefcase
                    className={`w-12 h-12 transform transition-all duration-300 ${
                      darkMode ? "text-slate-300" : "text-gray-700"
                    }`}
                    style={{
                      filter: darkMode
                        ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))"
                        : "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                      transform: "translateZ(8px)",
                    }}
                  />
                )}
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  darkMode ? "text-slate-300" : "text-gray-800"
                }`}
              >
                {t(
                  `profile.emptyStates.noMore${cardType.charAt(0).toUpperCase() + cardType.slice(1)}Cards`,
                )}
              </h3>
              <p className={`${darkMode ? "text-slate-400" : "text-gray-600"}`}>
                {t("profile.emptyStates.checkBackLater")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Networking Profile Validation Popup */}
      {showNetworkingProfilePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-emerald-200/30 backdrop-blur-sm animate-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-lg"></div>

            <div className="relative text-center">
              {/* Icon with modern styling */}
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Users className="w-7 h-7 text-white drop-shadow-sm" />
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur opacity-30 -z-10"></div>
              </div>

              {/* Title with better typography */}
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2 leading-tight">
                {t("auth.createNetworkingProfileTitle")}
              </h3>

              {/* Subtitle with improved readability */}
              <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xs mx-auto font-medium">
                {t("auth.createNetworkingProfileDescription")}
              </p>

              {/* Modern button styling */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowNetworkingProfilePrompt(false);
                    setLocation("/profile?openNetworking=true");
                  }}
                  className="group relative py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("auth.createProfile")}
                  </span>
                </button>

                <button
                  onClick={() => setShowNetworkingProfilePrompt(false)}
                  className="py-2.5 px-6 text-slate-500 hover:text-slate-700 font-medium transition-colors duration-200 hover:bg-slate-100/50 rounded-xl"
                >
                  {t("auth.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mentorship Profile Validation Popup */}
      {showMentorshipProfilePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/40 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-purple-200/30 backdrop-blur-sm animate-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-lg"></div>

            <div className="relative text-center">
              {/* Icon with modern styling */}
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <GraduationCap className="w-7 h-7 text-white drop-shadow-sm" />
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-2xl blur opacity-30 -z-10"></div>
              </div>

              {/* Title with better typography */}
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-purple-700 to-indigo-700 bg-clip-text text-transparent mb-2 leading-tight">
                {t("auth.createMentorshipProfileTitle")}
              </h3>

              {/* Subtitle with improved readability */}
              <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xs mx-auto font-medium">
                {t("auth.createMentorshipProfileDescription")}
              </p>

              {/* Modern button styling */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowMentorshipProfilePrompt(false);
                    setLocation("/profile?openMentorship=true");
                  }}
                  className="group relative py-3.5 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {t("auth.createProfile")}
                  </span>
                </button>

                <button
                  onClick={() => setShowMentorshipProfilePrompt(false)}
                  className="py-2.5 px-6 text-slate-500 hover:text-slate-700 font-medium transition-colors duration-200 hover:bg-slate-100/50 rounded-xl"
                >
                  {t("auth.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Profile Validation Popup */}
      {showJobProfilePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/40 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-blue-200/30 backdrop-blur-sm animate-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-lg"></div>

            <div className="relative text-center">
              {/* Icon with modern styling */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Briefcase className="w-7 h-7 text-white drop-shadow-sm" />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur opacity-30 -z-10"></div>
              </div>

              {/* Title with better typography */}
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-cyan-700 bg-clip-text text-transparent mb-2 leading-tight">
                {t("auth.createJobProfileTitle")}
              </h3>

              {/* Subtitle with improved readability */}
              <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xs mx-auto font-medium">
                {t("auth.createJobProfileDescription")}
              </p>

              {/* Modern button styling */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowJobProfilePrompt(false);
                    setLocation("/profile?openJob=true");
                  }}
                  className="group relative py-3.5 px-6 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {t("auth.createProfile")}
                  </span>
                </button>

                <button
                  onClick={() => setShowJobProfilePrompt(false)}
                  className="py-2.5 px-6 text-slate-500 hover:text-slate-700 font-medium transition-colors duration-200 hover:bg-slate-100/50 rounded-xl"
                >
                  {t("auth.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Networking Profile Modal */}
      {showCreateNetworkingProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-emerald-200/30 backdrop-blur-sm animate-in zoom-in-95 duration-300 slide-in-from-bottom-8">
            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-lg"></div>

            <div className="relative text-center">
              {/* Icon with modern styling */}
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Users className="w-7 h-7 text-white drop-shadow-sm" />
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur opacity-30 -z-10"></div>
              </div>

              {/* Title with better typography */}
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2 leading-tight">
                {t("auth.createNetworkingProfileTitle")}
              </h3>

              {/* Subtitle with improved readability */}
              <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xs mx-auto font-medium">
                {t("auth.createNetworkingProfileDescription")}
              </p>

              {/* Modern button styling */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowCreateNetworkingProfileModal(false);
                    setLocation("/profile?openNetworking=true");
                  }}
                  className="group relative py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("auth.createProfile")}
                  </span>
                </button>

                <button
                  onClick={() => setShowCreateNetworkingProfileModal(false)}
                  className="py-2.5 px-6 text-slate-500 hover:text-slate-700 font-medium transition-colors duration-200 hover:bg-slate-100/50 rounded-xl"
                >
                  {t("auth.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Dialog */}
      <PremiumUpgradeDialog
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
      />

      <BottomNavigation />
    </>
  );
}
