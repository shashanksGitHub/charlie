import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLanguage, t } from "@/hooks/use-language";
import { DynamicPrivacyDialog } from "@/components/settings/dynamic-privacy-dialog";
import { PrivacyPolicyDialog } from "@/components/settings/privacy-policy-dialog";
import { TermsOfServiceDialog } from "@/components/settings/terms-of-service-dialog";
import { HelpSupportDialog } from "@/components/settings/help-support-dialog";
import { LegalDocumentsDialog } from "@/components/settings/legal-documents-dialog";
import { PremiumUpgradeDialog } from "@/components/settings/premium-upgrade-dialog";
import { Fireworks } from "@/components/ui/fireworks";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageRemove,
} from "@/lib/storage-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPicture } from "@/components/ui/user-picture";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FileText,
  Fingerprint,
  Globe,
  Heart,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Phone,
  Shield,
  ToggleLeft,
  User,
  Users,
  X,
  Search,
  Crown,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sun,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { countryCodes } from "@/lib/country-codes";
import { languages, getLanguageDisplay, type Language } from "@/lib/languages";
import DatingPreferences from "@/components/settings/dating-preferences";
import { safeParseJson, handleApiResponse } from "@/lib/api-helpers";
import { User as SelectUser } from "@shared/schema";

// Define the type for user preferences for TypeScript
interface UserPreferences {
  // Notification preferences removed
  showAppModeSelection?: boolean;
  showNationalitySelection?: boolean;
  visibilityPreferences?: string;
  twoFactorEnabled?: boolean;
  [key: string]: any; // Allow for additional preferences
}

// Extended User type that includes preferences
type ExtendedUser = SelectUser & UserPreferences;

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  // Safely cast the user to include preferences
  const extendedUser = user as ExtendedUser;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const {
    darkMode,
    toggleDarkMode,
    isAutomaticMode,
    enableAutomaticMode,
    disableAutomaticMode,
    daylightStatus,
    refreshDaylight,
  } = useDarkMode();

  // Tab state management for URL parameters
  const [activeTab, setActiveTab] = useState("account");

  // Track navigation stack when Settings page loads
  useEffect(() => {
    // Always refresh the navigation stack based on current state
    // This ensures we use the most recent app page information

    const lastAppPage = localStorage.getItem("last_app_page");
    const originAppPage = localStorage.getItem("origin_app_page");

    // Use the most recent valid app page as our navigation origin
    // Note: MEET app uses root path '/' not '/home'
    const validAppPages = ["/", "/heat", "/suite/network", "/suite/jobs"];
    let navigationOrigin = "/"; // default fallback to MEET app root

    // Priority: use last_app_page first (most recent), then origin_app_page
    if (lastAppPage && validAppPages.includes(lastAppPage)) {
      navigationOrigin = lastAppPage;
      console.log(
        "[SETTINGS-INIT] Using last app page as origin:",
        lastAppPage,
      );
    } else if (originAppPage && validAppPages.includes(originAppPage)) {
      navigationOrigin = originAppPage;
      console.log(
        "[SETTINGS-INIT] Using origin app page as fallback:",
        originAppPage,
      );
    }

    // Always update the navigation stack with current information
    const stack = {
      originPage: navigationOrigin,
      timestamp: Date.now(),
      source: lastAppPage
        ? "last_app_page"
        : originAppPage
          ? "origin_app_page"
          : "default",
    };

    localStorage.setItem("settings_navigation_stack", JSON.stringify(stack));
    console.log("[SETTINGS-INIT] Updated navigation stack:", stack);
    console.log(
      "[SETTINGS-INIT] Available pages - last:",
      lastAppPage,
      "origin:",
      originAppPage,
    );
  }, []);

  // Check for URL parameters on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && ["account", "app", "subscription"].includes(tabParam)) {
      setActiveTab(tabParam);
      // Clean up URL parameter after setting tab
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  // Dialog states
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [privacyPolicyDialogOpen, setPrivacyPolicyDialogOpen] = useState(false);
  const [termsOfServiceDialogOpen, setTermsOfServiceDialogOpen] =
    useState(false);
  const [legalDocumentsDialogOpen, setLegalDocumentsDialogOpen] =
    useState(false);
  const [helpSupportDialogOpen, setHelpSupportDialogOpen] = useState(false);
  const [premiumUpgradeDialogOpen, setPremiumUpgradeDialogOpen] =
    useState(false);
  const [changeSubscriptionDialogOpen, setChangeSubscriptionDialogOpen] =
    useState(false);

  // Premium state management with React Query
  const { data: premiumStatus, isLoading: premiumLoading } = useQuery({
    queryKey: ["/api/premium/status"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  const isPremium = (premiumStatus as any)?.premiumAccess || false;
  const gracePeriodActive = (premiumStatus as any)?.gracePeriodActive || false;
  const subscriptionStatus = (premiumStatus as any)?.subscriptionStatus;
  const subscriptionExpiresAt = (premiumStatus as any)?.subscriptionExpiresAt;

  // Verification Access state management
  const isVerified = user?.isVerified || false;

  // Get the language context
  const { currentLanguage, setLanguage, allLanguages } = useLanguage();

  // Debug: Log current language state
  console.log(
    "Settings page - Current language:",
    currentLanguage?.code,
    currentLanguage?.name,
  );
  console.log("Settings page - Available languages:", allLanguages?.length);

  // Test critical translation keys immediately
  console.log("🔍 CRITICAL TRANSLATION TEST:");
  console.log("🔍 securityAndPrivacy:", t("settings.securityAndPrivacy"));
  console.log("🔍 twoFactorAuth:", t("settings.twoFactorAuth"));
  console.log("🔍 accountPrivacy:", t("settings.accountPrivacy"));

  // Form values
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1"); // Default to United States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Email verification states
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerificationResult, setEmailVerificationResult] = useState<{
    isValid: boolean;
    reason?: string;
    confidence: "high" | "medium" | "low";
  } | null>(null);

  // Notification state variables removed

  // Optimistic state for instant UI responsiveness
  const [optimisticTwoFactor, setOptimisticTwoFactor] = useState<
    boolean | null
  >(null);
  const [optimisticAppModeSelection, setOptimisticAppModeSelection] = useState<
    boolean | null
  >(null);
  const [optimisticNationalitySelection, setOptimisticNationalitySelection] =
    useState<boolean | null>(null);

  // Keep these state variables for backward compatibility with the help text
  // but they're not used directly with the toggle controls anymore
  const [showAppModeSelectionEnabled, setShowAppModeSelectionEnabled] =
    useState(true);
  const [showNationalitySelectionEnabled, setShowNationalitySelectionEnabled] =
    useState(true);

  // Fireworks celebration state
  const [showFireworks, setShowFireworks] = useState(false);

  // Downgrade confirmation dialog state
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  // Downgrade loading state
  const [isDowngrading, setIsDowngrading] = useState(false);

  // Reset email verification when dialog opens
  useEffect(() => {
    if (emailDialogOpen) {
      setEmail(user?.email || "");
      setEmailVerificationResult(null);
      setEmailVerifying(false);
    }
  }, [emailDialogOpen, user?.email]);

  // Check for celebration trigger from payment flow
  useEffect(() => {
    const shouldCelebrate = localStorage.getItem("charley_trigger_celebration");
    if (shouldCelebrate === "true") {
      console.log(
        "🎆 SETTINGS: Detected celebration trigger from payment, starting fireworks",
      );

      // Clear the trigger immediately to prevent repeated celebrations
      localStorage.removeItem("charley_trigger_celebration");

      // Trigger fireworks celebration
      setShowFireworks(true);

      // Show premium activation toast
      toast({
        title: "🎉 Premium Features Unlocked!",
        description:
          "Welcome to CHARLEY Premium! Enjoy 5 seconds of fireworks with paparazzi camera flashes!",
      });
    }
  }, []); // Run once on component mount

  // Initial load effect to sync local variables with user object
  useEffect(() => {
    if (user) {
      // Update the state variables when user data changes
      setShowAppModeSelectionEnabled(user.showAppModeSelection !== false);
      setShowNationalitySelectionEnabled(
        user.showNationalitySelection !== false,
      );

      // Only reset optimistic state if it matches the server state (no conflict)
      if (
        optimisticTwoFactor !== null &&
        optimisticTwoFactor === (user.twoFactorEnabled || false)
      ) {
        setOptimisticTwoFactor(null);
      }
      if (
        optimisticAppModeSelection !== null &&
        optimisticAppModeSelection === (user.showAppModeSelection !== false)
      ) {
        setOptimisticAppModeSelection(null);
      }
      if (
        optimisticNationalitySelection !== null &&
        optimisticNationalitySelection ===
          (user.showNationalitySelection !== false)
      ) {
        setOptimisticNationalitySelection(null);
      }
    }
  }, [
    user,
    optimisticTwoFactor,
    optimisticAppModeSelection,
    optimisticNationalitySelection,
  ]);

  // Add a state to track whether initial user data has been loaded and processed
  const [userDataProcessed, setUserDataProcessed] = useState(false);

  // Back navigation that takes user to original app page across multiple intermediate pages
  const handleBack = () => {
    // Always check current state and provide detailed debugging
    const navigationStack = localStorage.getItem("settings_navigation_stack");
    const lastAppPage = localStorage.getItem("last_app_page");
    const originAppPage = localStorage.getItem("origin_app_page");

    console.log("[SETTINGS-BACK] === NAVIGATION DEBUG START ===");
    console.log("[SETTINGS-BACK] Navigation stack:", navigationStack);
    console.log("[SETTINGS-BACK] Last app page:", lastAppPage);
    console.log("[SETTINGS-BACK] Origin app page:", originAppPage);

    if (navigationStack) {
      try {
        const stack = JSON.parse(navigationStack);
        const targetPage = stack.originPage;

        console.log("[SETTINGS-BACK] Parsed stack:", stack);
        console.log("[SETTINGS-BACK] Target page from stack:", targetPage);
        console.log("[SETTINGS-BACK] Stack source:", stack.source);

        // Validate the target page
        const validAppPages = ["/", "/heat", "/suite/network", "/suite/jobs"];
        if (validAppPages.includes(targetPage)) {
          console.log(
            "[SETTINGS-BACK] ✓ Valid target page, navigating to:",
            targetPage,
          );

          // Clear the navigation stack since we're using it
          localStorage.removeItem("settings_navigation_stack");

          setLocation(targetPage);
          return;
        } else {
          console.log("[SETTINGS-BACK] ✗ Invalid target page:", targetPage);
        }
      } catch (error) {
        console.error(
          "[SETTINGS-BACK] Failed to parse navigation stack:",
          error,
        );
      }
    } else {
      console.log("[SETTINGS-BACK] No navigation stack found");
    }

    // FALLBACK: Use existing logic if no navigation stack
    console.log("[SETTINGS-BACK] === FALLBACK LOGIC ===");

    // Valid app pages (excluding payment, settings, and other intermediate pages)
    // Note: MEET app uses root path '/' not '/home'
    const validAppPages = ["/", "/heat", "/suite/network", "/suite/jobs"];

    console.log("[SETTINGS-BACK] Fallback - Origin app page:", originAppPage);
    console.log("[SETTINGS-BACK] Fallback - Last app page:", lastAppPage);

    // Priority 1: Use preserved origin page if it exists and is valid
    if (originAppPage && validAppPages.includes(originAppPage)) {
      console.log("[SETTINGS-BACK] Using origin page fallback:", originAppPage);
      setLocation(originAppPage);
      return;
    }

    // Priority 2: Use last app page if it's valid
    if (lastAppPage && validAppPages.includes(lastAppPage)) {
      console.log("[SETTINGS-BACK] Using last app page fallback:", lastAppPage);
      setLocation(lastAppPage);
      return;
    }

    // Priority 3: Use app mode fallback
    console.log("[SETTINGS-BACK] Using app mode fallback");
    const currentAppMode =
      localStorage.getItem(`last_used_app_${user?.id}`) ||
      sessionStorage.getItem(`last_used_app_${user?.id}`);

    let fallbackPage = "/"; // Default fallback to MEET app root

    if (currentAppMode === "heat") {
      fallbackPage = "/heat";
    } else if (currentAppMode === "suite") {
      fallbackPage = "/suite/network";
    }

    console.log("[SETTINGS-BACK] Final fallback page:", fallbackPage);
    setLocation(fallbackPage);
  };

  // Two-factor authentication mutation with optimistic updates
  const toggleTwoFactorAuthMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) {
        throw new Error("You must be logged in to change settings");
      }

      const res = await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: {
          twoFactorEnabled: enabled,
        },
      });

      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update 2FA settings:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to update two-factor authentication settings");
      }
    },
    onSuccess: (data) => {
      // Don't clear optimistic state here - let useEffect handle it when server data matches
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Removed disruptive "Two-Factor Authentication Enabled" toast notification for seamless user experience
    },
    onError: (error) => {
      // Rollback optimistic state on error
      setOptimisticTwoFactor(null);

      toast({
        title: "Failed to update 2FA settings",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const toggleTwoFactorAuth = (enabled: boolean) => {
    // Instantly update UI (optimistic update)
    setOptimisticTwoFactor(enabled);

    // Make API call in background
    toggleTwoFactorAuthMutation.mutate(enabled);
  };

  // App Mode Selection mutation with optimistic updates
  const toggleAppModeSelectionMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) {
        throw new Error("You must be logged in to change app mode settings");
      }

      const res = await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: {
          showAppModeSelection: enabled,
        },
      });
      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update app mode selection setting:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to update app mode selection setting");
      }
    },
    onSuccess: (data) => {
      // Don't clear optimistic state here - let useEffect handle it when server data matches
      setShowAppModeSelectionEnabled(data.showAppModeSelection !== false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Removed disruptive "Auto App Login Enabled" toast notification for seamless user experience
    },
    onError: (error) => {
      // Rollback optimistic state on error
      setOptimisticAppModeSelection(null);

      toast({
        title: "Failed to update app selection setting",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const toggleAppModeSelection = (enabled: boolean) => {
    // Instantly update UI (optimistic update)
    setOptimisticAppModeSelection(enabled);
    setShowAppModeSelectionEnabled(enabled);

    // Make API call in background
    toggleAppModeSelectionMutation.mutate(enabled);
  };

  // Nationality Selection mutation with optimistic updates
  const toggleNationalitySelectionMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) {
        throw new Error("You must be logged in to change nationality settings");
      }

      const res = await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: {
          showNationalitySelection: enabled,
        },
      });
      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update nationality selection setting:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to update nationality selection setting");
      }
    },
    onSuccess: (data) => {
      // Don't clear optimistic state here - let useEffect handle it when server data matches
      setShowNationalitySelectionEnabled(
        data.showNationalitySelection !== false,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Removed disruptive "Nationality Selection Disabled" toast notification for seamless user experience
    },
    onError: (error) => {
      // Rollback optimistic state on error
      setOptimisticNationalitySelection(null);

      toast({
        title: "Failed to update nationality selection setting",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const toggleNationalitySelection = (enabled: boolean) => {
    // Instantly update UI (optimistic update)
    setOptimisticNationalitySelection(enabled);
    setShowNationalitySelectionEnabled(enabled);

    // Make API call in background
    toggleNationalitySelectionMutation.mutate(enabled);
  };

  // Phone number mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      console.log("Sending phone update with data:", data);

      // Ensure it has a proper format: +XXX...
      if (!data.phoneNumber || !data.phoneNumber.startsWith("+")) {
        throw new Error(
          "Phone number must include country code starting with '+'",
        );
      }

      // Validate phone number format more carefully
      // Check if it starts with + and has enough digits
      const phoneDigitsOnly = data.phoneNumber.substring(1); // Remove +
      if (phoneDigitsOnly.length < 8) {
        // At least 1 digit for country code + 7 for number
        throw new Error(
          "Phone number must have at least 7 digits after country code",
        );
      }

      // Check if all characters after + are digits
      if (!/^\d+$/.test(phoneDigitsOnly)) {
        throw new Error(
          "Phone number must contain only digits after the + sign",
        );
      }

      const res = await apiRequest(`/api/profile/${user?.id}`, {
        method: "PATCH",
        data,
      });

      // Use handleApiResponse for consistent API response handling
      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update phone number:", error);
        throw error instanceof Error
          ? error
          : new Error(`Server error (${res.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setPhoneDialogOpen(false);

      toast({
        title: "Phone Number Updated",
        description: "Your phone number has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Email mutation with optimistic updates
  const updateEmailMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      console.log("Sending email update with data:", data);

      if (!data.email || data.email === "") {
        throw new Error("Email cannot be empty");
      }

      const res = await apiRequest(`/api/profile/${user?.id}`, {
        method: "PATCH",
        data,
      });

      // Use handleApiResponse for consistent API response handling
      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update email:", error);
        throw error instanceof Error
          ? error
          : new Error(`Server error (${res.status})`);
      }
    },
    onMutate: async (data: { email: string }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/user"] });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["/api/user"]);

      // Optimistically update the user data
      queryClient.setQueryData(["/api/user"], (old: any) => {
        if (!old) return old;
        return { ...old, email: data.email };
      });

      return { previousUser };
    },
    onSuccess: () => {
      setEmailDialogOpen(false);

      // Clear verification states
      setEmail("");
      setEmailVerificationResult(null);
      setEmailVerifying(false);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user"], context.previousUser);
      }

      // Show error toast
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  // Password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const res = await apiRequest("/api/password/change", {
        method: "POST",
        data,
      });

      // Use handleApiResponse for consistent API response handling
      try {
        const result = await handleApiResponse(res);
        return result;
      } catch (error) {
        console.error("Failed to update password:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to update password");
      }
    },
    onSuccess: (result) => {
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Check if the server requires re-login due to session invalidation
      if (result?.requiresRelogin) {
        // Clear all query cache and invalidate user session immediately
        queryClient.clear();
        queryClient.setQueryData(["/api/user"], null);

        // Navigate smoothly to login page immediately
        setLocation("/auth");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    toggleDarkMode();

    // Also save the preference to the API for cross-device sync
    if (user?.id) {
      apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: { darkMode: enabled },
      })
        .then((res) => {
          return handleApiResponse(res);
        })
        .then((data) => {
          // Invalidate and refetch user data to ensure we have latest state
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        })
        .catch((error) => {
          console.error("Failed to update dark mode setting:", error);
        });
    }

    // Removed disruptive "Light mode activated" toast notification for seamless user experience
  };

  const handleAutomaticModeToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableAutomaticMode();
      // Removed disruptive "Automatic mode enabled" toast notification for seamless user experience
    } else {
      disableAutomaticMode();
      // Removed disruptive "Automatic mode disabled" toast notification for seamless user experience
    }
  };

  const handleRefreshDaylight = async () => {
    try {
      await refreshDaylight();
      toast({
        title: "Daylight status refreshed",
        description: "Updated dark mode based on current time and location",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not get current daylight status",
        variant: "destructive",
      });
    }
  };

  // Event handlers for updating values
  const handleUpdatePhone = () => {
    // Debug to see what's happening with the phone inputs
    console.log("Phone update attempt:", {
      phoneCountryCode,
      phoneNumber,
      isEmpty: !phoneNumber.trim(),
      phoneCountryCodeExists: !!phoneCountryCode,
      phoneCountryCodeStartsWithPlus: phoneCountryCode.startsWith("+"),
    });

    // Validate if phone number is not empty
    if (!phoneNumber.trim()) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate country code
    if (!phoneCountryCode || !phoneCountryCode.startsWith("+")) {
      toast({
        title: "Invalid Country Code",
        description: "Please select a valid country code",
        variant: "destructive",
      });
      return;
    }

    // Remove any leading zeros and spaces from the number portion
    let cleanNumber = phoneNumber.trim();
    while (cleanNumber.startsWith("0")) {
      cleanNumber = cleanNumber.substring(1);
    }

    // Remove any non-digit characters except for the leading +
    cleanNumber = cleanNumber.replace(/[^\d]/g, "");

    // Check if number is too short after cleaning
    if (cleanNumber.length < 7) {
      toast({
        title: "Invalid Phone Number",
        description:
          "Phone number must have at least 7 digits after country code",
        variant: "destructive",
      });
      return;
    }

    // Check if country code is valid (1-4 digits)
    const countryCodeDigits = phoneCountryCode.substring(1); // Remove the + sign
    if (!/^\d{1,4}$/.test(countryCodeDigits)) {
      toast({
        title: "Invalid Country Code",
        description: "Please select a valid country code",
        variant: "destructive",
      });
      return;
    }

    // Format the phone number with country code
    const formattedPhoneNumber = `${phoneCountryCode}${cleanNumber}`;

    console.log("Updating phone number to:", formattedPhoneNumber);

    // Send the update
    updatePhoneMutation.mutate({ phoneNumber: formattedPhoneNumber });
  };

  const handleUpdateEmail = () => {
    if (!email.trim() || !email.includes("@")) {
      toast({
        title: t("settings.invalidEmail"),
        description: t("settings.pleaseEnterValidEmail"),
        variant: "destructive",
      });
      return;
    }

    // Check email verification status if verification was performed
    if (emailVerificationResult && !emailVerificationResult.isValid) {
      toast({
        title: t("settings.emailVerificationFailed"),
        description:
          emailVerificationResult.reason ||
          t("settings.enterValidDeliverableEmail"),
        variant: "destructive",
      });
      return;
    }

    // Warn if email hasn't been verified yet but allow update
    if (email.trim() && !emailVerificationResult && !emailVerifying) {
      toast({
        title: t("settings.emailNotVerified"),
        description: t("settings.recommendVerifyEmailBeforeUpdate"),
        variant: "default",
      });
    }

    // Ensure we're sending a non-empty object with the email field
    updateEmailMutation.mutate({ email: email.trim() });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast({
        title: t("settings.currentPasswordRequired"),
        description: t("settings.pleaseEnterCurrentPassword"),
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: t("settings.invalidNewPassword"),
        description: t("settings.newPasswordMinSix"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("settings.passwordsDontMatch"),
        description: t("settings.passwordsMustMatch"),
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await setLanguage(languageCode);
      setLanguageDialogOpen(false);

      // Removed disruptive "Language Updated" toast notification for seamless user experience
    } catch (error) {
      console.error("Failed to change language:", error);
      // Keep dialog open on error so user can try again
    }
  };

  // Premium toggle mutation with optimistic updates for instant response
  const togglePremiumMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("/api/premium/toggle", {
        method: "POST",
        data: { premiumAccess: enabled },
      });
      return res;
    },
    onMutate: async (enabled) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/premium/status"] });
      await queryClient.cancelQueries({ queryKey: ["/api/user"] });

      // Snapshot previous values for rollback
      const previousPremiumStatus = queryClient.getQueryData([
        "/api/premium/status",
      ]);
      const previousUser = queryClient.getQueryData(["/api/user"]);

      // Optimistically update premium status immediately
      queryClient.setQueryData(["/api/premium/status"], (old: any) => ({
        ...old,
        premiumAccess: enabled,
      }));

      // Optimistically update user data immediately
      queryClient.setQueryData(["/api/user"], (old: any) => ({
        ...old,
        premiumAccess: enabled,
      }));

      return { previousPremiumStatus, previousUser };
    },
    onSuccess: (data, enabled) => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      if (enabled) {
        // Trigger fireworks celebration for 3 seconds
        setShowFireworks(true);

        // Removed disruptive "Premium Features Enabled" toast notification for seamless user experience
        // Fireworks celebration provides sufficient visual feedback for premium activation
      }

      // Removed disruptive "Premium Features Disabled" toast notification for seamless user experience
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousPremiumStatus) {
        queryClient.setQueryData(
          ["/api/premium/status"],
          context.previousPremiumStatus,
        );
      }
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user"], context.previousUser);
      }

      toast({
        title: "Failed to update premium access",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Premium toggle handler
  const handlePremiumToggle = (enabled: boolean) => {
    togglePremiumMutation.mutate(enabled);
  };

  // Verification Access toggle mutation with optimistic updates for instant response
  const toggleVerificationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("/api/user/verification-status", {
        method: "POST",
        data: {
          userId: user?.id,
          isVerified: enabled,
        },
      });
      return res;
    },
    onMutate: async (enabled) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/user"] });

      // Snapshot previous user data for rollback
      const previousUser = queryClient.getQueryData(["/api/user"]);

      // Optimistically update user verification status immediately
      queryClient.setQueryData(["/api/user"], (old: any) => ({
        ...old,
        isVerified: enabled,
      }));

      return { previousUser };
    },
    onSuccess: (data, enabled) => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Removed ALL disruptive toast notifications for seamless user experience
      // Verification toggle now provides instant visual feedback without popup interruptions
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user"], context.previousUser);
      }

      toast({
        title: "Failed to update verification status",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Verification toggle handler
  const handleVerificationToggle = (enabled: boolean) => {
    toggleVerificationMutation.mutate(enabled);
  };

  // Initialize values on component mount
  useEffect(() => {
    // Initialize phone number and email with user values if available
    if (user) {
      console.log("Initializing user data in settings:", user);

      if (user.phoneNumber) {
        console.log("Found phone number:", user.phoneNumber);

        // Extract country code and number
        const match = user.phoneNumber.match(/^(\+\d{1,4})(.*)$/);
        if (match) {
          console.log("Extracted phone parts:", {
            countryCode: match[1],
            phoneNumber: match[2],
          });

          setPhoneCountryCode(match[1]);

          // Clean the phone number part - remove any non-digit characters
          const cleanPhoneNumber = match[2].replace(/[^\d]/g, "");
          setPhoneNumber(cleanPhoneNumber);
        } else {
          console.log(
            "Phone number format didn't match expected pattern, using defaults",
          );
          // If no match found, try to use a default country code
          const defaultCountry = countryCodes.find(
            (c: { code: string }) => c.code === "US",
          );
          if (defaultCountry) {
            setPhoneCountryCode(defaultCountry.dialCode);
            // Assume the whole number is just digits
            const digits = user.phoneNumber.replace(/[^\d]/g, "");
            setPhoneNumber(digits);
          }
        }
      }

      if (user.email) {
        setEmail(user.email);
      }
    }
  }, [user]);

  // Get the first name and first letter for the avatar
  const firstName = user?.fullName?.split(" ")[0] || "";
  const firstLetter = firstName ? firstName[0] : "";

  // New: This effect updates settings from the API when user data changes
  useEffect(() => {
    if (user) {
      console.log("User data loaded for settings:", user);

      // Check if any toggle state is stored on the user object from API
      const userData = user as any; // Use type assertion to safely check properties

      if (userData.twoFactorEnabled !== undefined) {
        console.log("2FA status from API:", userData.twoFactorEnabled);
        // No need to update state since the toggle reads directly from user object
      }

      // Notification settings removed

      // App mode and nationality selection may also be in the API
      if (userData.showAppModeSelection !== undefined) {
        setShowAppModeSelectionEnabled(userData.showAppModeSelection);
      }

      if (userData.showNationalitySelection !== undefined) {
        setShowNationalitySelectionEnabled(userData.showNationalitySelection);
      }

      // Mark that we've processed the user data
      setUserDataProcessed(true);
    }
  }, [user]); // Include user as dependency to run when it changes

  // Ensure we have the latest data when the component mounts or after login
  useEffect(() => {
    // If user exists but we haven't processed data yet, force a refresh
    if (user && !userDataProcessed) {
      console.log("Force refreshing user data on settings page mount");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  }, [user, userDataProcessed]);

  return (
    <div
      key={`settings-${currentLanguage.code}`}
      className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
    >
      {/* Header with gradient - fixed position with higher z-index */}
      <div
        className={`sticky top-0 z-50 text-white flex-shrink-0 shadow-md ${
          isPremium
            ? "bg-gradient-to-r from-yellow-500 to-orange-500"
            : "bg-gradient-to-r from-purple-600 to-pink-500"
        }`}
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <button
              className="mr-2 text-white/90 hover:text-white transition-colors"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight">
              {t("common.settings")}
            </h2>
          </div>
        </div>
      </div>

      {/* Content area - takes full height */}
      <div className="p-3 flex-grow flex flex-col">
        {/* User profile card */}
        <Card className="mb-3 overflow-hidden border-none shadow-md flex-shrink-0">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-3">
            <div className="flex items-center">
              <UserPicture
                imageUrl={user?.photoUrl || undefined}
                fallbackInitials={firstLetter}
                className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white shadow-md"
                size="lg"
              />
              <div className="ml-4">
                <h3 className="text-sm sm:text-base font-semibold font-sans tracking-tight">
                  {user?.fullName}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-light">
                  {user?.email}
                </p>
                <Badge
                  className={`mt-1.5 text-xs sm:text-sm px-2.5 py-0.5 ${
                    isPremium
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  }`}
                >
                  {isPremium ? "Premium" : t("settings.freeAccount")}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-3 flex-grow flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3 bg-purple-50 dark:bg-gray-800 rounded-lg p-0.5 flex-shrink-0">
            <TabsTrigger
              value="account"
              className="text-xs font-medium tracking-tight sm:text-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              {t("common.account")}
            </TabsTrigger>
            <TabsTrigger
              value="app"
              className="text-xs font-medium tracking-tight sm:text-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              {t("common.app")}
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="text-xs font-medium tracking-tight sm:text-sm data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              {t("common.subscription")}
            </TabsTrigger>
          </TabsList>

          {/* Account Settings Tab */}
          <TabsContent
            value="account"
            className="mt-2 space-y-2 overflow-auto flex-1"
          >
            <Card className="border-none shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center font-medium tracking-tight">
                  <div className="flex items-center bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-300 bg-clip-text text-transparent">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm sm:text-base">
                      {t("settings.accountInformation")}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t("settings.managePersonalInfo")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setPhoneDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <div className="w-full text-left">
                      <span className="block text-sm sm:text-base font-medium">
                        {t("settings.phoneNumber")}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        {user?.phoneNumber || t("settings.notAdded")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <div className="w-full text-left">
                      <span className="block text-sm sm:text-base font-medium">
                        {t("settings.email")}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        {user?.email || t("settings.notAdded")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.changePassword")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center font-medium tracking-tight">
                  <div className="flex items-center bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-500 dark:from-purple-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm sm:text-base">
                      {t("settings.securityAndPrivacy")}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t("settings.manageSecuritySettings")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center">
                    <Fingerprint className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.twoFactorAuth")}
                    </span>
                  </div>
                  <Switch
                    checked={
                      optimisticTwoFactor !== null
                        ? optimisticTwoFactor
                        : user?.twoFactorEnabled || false
                    }
                    className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-400"
                    onCheckedChange={toggleTwoFactorAuth}
                  />
                </div>
                <button
                  className="w-full p-3 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setPrivacyDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.accountPrivacy")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Settings Tab */}
          <TabsContent
            value="app"
            className="mt-2 space-y-2 overflow-auto flex-1"
          >
            {/* Notifications section removed */}

            {/* App Mode Selection Section */}
            <Card className="border-none shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center font-medium tracking-tight">
                  <div className="flex items-center bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 dark:from-green-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    <ToggleLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm sm:text-base">
                      {t("settings.appModeSettings")}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-3 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center">
                    <span className="text-sm sm:text-base font-medium ml-3">
                      {t("settings.showAppSelectionScreen")}
                    </span>
                  </div>
                  <Switch
                    checked={
                      optimisticAppModeSelection !== null
                        ? optimisticAppModeSelection
                        : user?.showAppModeSelection !== false
                    }
                    className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-400"
                    onCheckedChange={toggleAppModeSelection}
                  />
                </div>
                <div className="px-3 pb-3 pt-1 text-xs text-gray-500">
                  {user?.showAppModeSelection !== false
                    ? t("settings.whenTurnedOnYoullBeAsked")
                    : t("settings.whenTurnedOffDirectLogin")}
                </div>

                <div className="mt-1 p-3 border-t border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center">
                    <span className="text-sm sm:text-base font-medium ml-3">
                      {t("settings.showNationalitySelectionScreen")}
                    </span>
                  </div>
                  <Switch
                    checked={
                      optimisticNationalitySelection !== null
                        ? optimisticNationalitySelection
                        : user?.showNationalitySelection !== false
                    }
                    className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-400"
                    onCheckedChange={toggleNationalitySelection}
                  />
                </div>
                <div className="px-3 pb-3 pt-1 text-xs text-gray-500">
                  {user?.showNationalitySelection !== false
                    ? t("settings.whenTurnedOnReturningUsers")
                    : t("settings.whenTurnedOffSkipNationality")}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center font-medium tracking-tight">
                  <div className="flex items-center bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm sm:text-base">
                      {t("settings.regionalSettings")}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t("settings.customizeAppExperience")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setLanguageDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.language")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs sm:text-sm text-gray-600 mr-2">
                      {currentLanguage.name}
                    </span>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                </button>
                {/* Manual Dark Mode Toggle */}
                <div className="p-3 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center">
                    {darkMode ? (
                      <Moon className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    ) : (
                      <Sun className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    )}
                    <div>
                      <span className="text-sm sm:text-base font-medium">
                        {t("settings.darkMode")}
                      </span>
                      {isAutomaticMode && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t("settings.basedOnLocation", {
                            location:
                              daylightStatus?.location ||
                              t("settings.yourLocation"),
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={handleDarkModeToggle}
                    className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-400"
                  />
                </div>

                {/* Automatic Mode Toggle - HIDDEN */}
                {false && (
                  <div className="p-3 border-t border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                      <div>
                        <span className="text-sm sm:text-base font-medium">
                          Automatic Dark Mode
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isAutomaticMode
                            ? "Adjusts based on local daylight"
                            : "Manual control enabled"}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isAutomaticMode}
                      onCheckedChange={handleAutomaticModeToggle}
                      className="data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-400"
                    />
                  </div>
                )}

                {/* Daylight Status & Refresh Button (only when automatic mode is enabled) - HIDDEN */}
                {false && isAutomaticMode && daylightStatus && (
                  <div className="p-3 border-t border-gray-100 bg-purple-50/30 dark:bg-purple-900/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${daylightStatus.isDark ? "bg-indigo-500" : "bg-yellow-500"}`}
                        ></div>
                        <span>
                          {daylightStatus.isDark ? "Dark time" : "Light time"} •
                          Last checked:{" "}
                          {new Date(
                            daylightStatus.lastChecked,
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshDaylight}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                    {daylightStatus.nextSunrise &&
                      daylightStatus.nextSunset && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Next:{" "}
                          {daylightStatus.isDark
                            ? `Sunrise ${daylightStatus.nextSunrise}`
                            : `Sunset ${daylightStatus.nextSunset}`}
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent
            value="subscription"
            className="mt-2 space-y-2 overflow-auto flex-1"
          >
            <Card className="border-none shadow-sm overflow-hidden">
              <div
                className={`py-4 px-4 text-white ${
                  isPremium
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                }`}
              >
                <h3 className="font-bold text-sm sm:text-base mb-1 tracking-tight">
                  {isPremium ? "CHARLEY Premium" : t("settings.charleyFree")}
                </h3>
                <p className="text-white/80 text-xs sm:text-sm mb-2 font-light">
                  {t("settings.yourCurrentPlan")}
                </p>
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {isPremium
                      ? t("settings.allFeaturesUnlocked")
                      : t("settings.limitedFeatures")}
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-3 font-light">
                  {isPremium
                    ? `${t("settings.youHaveAccess")} ${t("settings.ghostMode")}, ${t("settings.hideMyAge")} ${t("settings.enhancedPrivacyControls")}.`
                    : t("settings.upgradeForUnlimited")}
                </p>

                {/* Grace Period Warning */}
                {gracePeriodActive && subscriptionExpiresAt && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg
                        className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">
                          {t("settings.subscriptionCanceled")}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          {t("settings.premiumAccessContinues", {
                            date: new Date(
                              subscriptionExpiresAt,
                            ).toLocaleDateString(),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!isPremium && (
                  <Link href="/payment">
                    <Button className="w-full py-3 font-medium text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-sm transition-all hover:shadow">
                      <Crown className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {t("settings.upgradeToPremium")}
                    </Button>
                  </Link>
                )}
                {isPremium && (
                  <>
                    {/* Show subscription management if user has a real subscription */}
                    {gracePeriodActive ||
                    (subscriptionStatus && subscriptionStatus !== "expired") ? (
                      <Button
                        className={`w-full py-3 font-medium text-sm sm:text-base shadow-sm transition-all hover:shadow ${
                          gracePeriodActive
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                            : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                        }`}
                        onClick={() => setChangeSubscriptionDialogOpen(true)}
                      >
                        <Crown className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        {gracePeriodActive
                          ? t("settings.changeSubscription")
                          : t("settings.manageSubscription")}
                      </Button>
                    ) : (
                      /* Show upgrade option for test/toggle premium users */
                      <Link href="/payment">
                        <Button className="w-full py-3 font-medium text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-sm transition-all hover:shadow">
                          <Crown className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          {t("settings.upgradeToPremiumSubscription")}
                        </Button>
                      </Link>
                    )}
                  </>
                )}

                {/* Premium Toggle for Testing */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {t("settings.premiumAccess")}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t("settings.enablePremiumFeatures")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isPremium}
                      onCheckedChange={handlePremiumToggle}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500"
                    />
                  </div>
                </div>

                {/* Verification Access Toggle */}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {t("settings.verificationAccess")}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t("settings.showVerificationBadge")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isVerified}
                      onCheckedChange={handleVerificationToggle}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-500"
                    />
                  </div>
                </div>

                {/* Verify Me Button */}
                <div className="mt-3">
                  {(() => {
                    // Check if user has submitted verification photos
                    const hasSubmittedVerification =
                      user?.idVerificationPhoto && user?.liveVerificationPhoto;

                    if (isVerified) {
                      // Verification Access toggle is ON - show "Verified" button
                      return (
                        <Button
                          disabled
                          className="w-full py-3 bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 hover:from-green-500 hover:via-green-600 hover:to-emerald-600 text-white font-medium text-sm sm:text-base shadow-[0_8px_16px_rgba(34,197,94,0.3),0_4px_8px_rgba(16,185,129,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] border border-green-400/30 transition-all duration-300 flex items-center justify-center relative overflow-hidden cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background:
                              "linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 50%, #059669 75%, #10b981 100%)",
                            boxShadow:
                              "0 8px 16px rgba(34, 197, 94, 0.3), 0 4px 8px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          {/* Shine overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shimmer_2s_ease-in-out_infinite] opacity-60" />
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-400/30 to-green-400/20 blur-sm" />
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 relative z-10 drop-shadow-lg animate-pulse" />
                          <span className="relative z-10 drop-shadow-lg font-semibold tracking-wide">
                            {t("settings.verified")}
                          </span>
                        </Button>
                      );
                    } else if (hasSubmittedVerification) {
                      // User has submitted verification but toggle is OFF
                      return (
                        <Button
                          disabled
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium text-sm sm:text-base shadow-sm transition-all flex items-center justify-center opacity-80 cursor-not-allowed"
                        >
                          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          {t("settings.submittedVerification")}
                        </Button>
                      );
                    } else {
                      // Default state - show "Verify Me" button
                      return (
                        <Link href="/verify-id">
                          <Button className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium text-sm sm:text-base shadow-sm transition-all hover:shadow flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            {t("settings.verifyMe")}
                          </Button>
                        </Link>
                      );
                    }
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center font-medium tracking-tight">
                  <div className="flex items-center bg-gradient-to-r from-gray-700 via-purple-500 to-blue-500 dark:from-gray-300 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500 dark:text-purple-400" />
                    <span className="text-sm sm:text-base">
                      {t("settings.legalAndSupport")}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t("settings.termsAndResources")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setLegalDocumentsDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.legalDocuments")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setPrivacyPolicyDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.privacyPolicy")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setTermsOfServiceDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.termsOfService")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 border-b border-gray-100 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => {
                    // Open Community Guidelines document in new browser window
                    window.open(
                      "/assets/community-guidelines.html",
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <div className="flex items-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.communityGuidelines")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
                <button
                  className="w-full p-3 flex justify-between items-center hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  onClick={() => setHelpSupportDialogOpen(true)}
                >
                  <div className="flex items-center">
                    <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-3 text-purple-500" />
                    <span className="text-sm sm:text-base font-medium">
                      {t("settings.helpAndSupport")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-auto pt-2 flex-shrink-0">
          <Button
            variant="outline"
            className="w-full py-3 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm sm:text-base font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 flex items-center justify-center transition-all"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            {logoutMutation.isPending
              ? t("settings.loggingOut")
              : t("settings.logOut")}
          </Button>

          <div className="text-center text-xs sm:text-sm text-gray-500 mt-3 font-medium tracking-tight">
            CHARLEY App v1.0.0
          </div>
        </div>
      </div>

      {/* Phone Number Update Dialog - Modern & Futuristic Design */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[425px] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-t-xl"></div>

          <button
            onClick={() => setPhoneDialogOpen(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute -z-10 inset-0 overflow-hidden rounded-xl">
            <div className="absolute -inset-[10px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-40"></div>
            <div className="absolute top-40 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl"></div>
          </div>

          <DialogHeader className="pt-6 pb-2 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                  {t("settings.updatePhoneNumber")}
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1">
                  {t("settings.securelyUpdateContact")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-white/80 ml-1"
              >
                {t("settings.phoneNumber")}
              </Label>

              <PhoneInput
                value={`${phoneCountryCode}${phoneNumber}`}
                onChange={(value) => {
                  // Extract the country code and phone number
                  console.log("PhoneInput onChange value:", value);

                  // Modify the pattern to more explicitly separate the country code
                  const match = value.match(/^(\+\d{1,4})(.*)$/);
                  if (match) {
                    const [_, dialCode, phoneNum] = match;
                    console.log("Extracted: ", { dialCode, phoneNum });
                    setPhoneCountryCode(dialCode);

                    // Ensure we only store clean digits for the phone part
                    const cleanPhoneNum = phoneNum.replace(/[^\d]/g, "");
                    setPhoneNumber(cleanPhoneNum);
                  } else if (value.startsWith("+")) {
                    // If only a country code is selected
                    setPhoneCountryCode(value);
                    setPhoneNumber("");
                  }
                }}
                darkMode={true}
                placeholder={t("settings.enterPhoneNumber")}
              />

              <p className="text-xs text-white/50 ml-1 mt-1">
                {t("settings.verificationCodeSent")}
              </p>
            </div>
          </div>

          <div className="pt-2 pb-1 flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setPhoneDialogOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 font-medium"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdatePhone}
              disabled={updatePhoneMutation.isPending}
              className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-[0_0_15px_rgba(168,85,247,0.4)] rounded-lg px-5 py-2 font-medium"
            >
              {updatePhoneMutation.isPending ? (
                <div className="flex items-center">
                  <span className="mr-2 animate-pulse">
                    {t("settings.updating")}
                  </span>
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce"></div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="relative z-10">
                    {t("settings.updateNumber")}
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600/0 via-purple-600/40 to-purple-600/0 -translate-x-full animate-shimmer"></div>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Update Dialog - Modern & Futuristic Design */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[425px] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl"></div>

          <button
            onClick={() => setEmailDialogOpen(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute -z-10 inset-0 overflow-hidden rounded-xl">
            <div className="absolute -inset-[10px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-40"></div>
            <div className="absolute bottom-20 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute top-10 right-10 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl"></div>
          </div>

          <DialogHeader className="pt-6 pb-2 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                  {t("settings.updateEmail")}
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1">
                  {t("settings.securelyUpdateEmail")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-white/80 ml-1"
              >
                {t("settings.emailAddress")}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={email}
                  onChange={async (e) => {
                    setEmail(e.target.value);
                    const emailValue = e.target.value.trim();

                    // Reset verification state when field is cleared
                    if (!emailValue) {
                      setEmailVerificationResult(null);
                      return;
                    }

                    // Only verify if email looks valid
                    if (
                      emailValue &&
                      emailValue.includes("@") &&
                      emailValue.includes(".")
                    ) {
                      setEmailVerifying(true);
                      try {
                        const { verifyEmailExistence } = await import(
                          "@/lib/auth-validation"
                        );
                        const result = await verifyEmailExistence(emailValue);
                        setEmailVerificationResult(result);
                      } catch (error) {
                        console.error("Email verification error:", error);
                        setEmailVerificationResult(null);
                      } finally {
                        setEmailVerifying(false);
                      }
                    }
                  }}
                  className="bg-white/10 border-0 text-white focus:ring-2 focus:ring-purple-500/40 pl-10 pr-12 rounded-lg h-11"
                  placeholder={t("settings.enterEmailAddress")}
                  type="email"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-purple-400" />
                </div>
                {emailVerifying && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                  </div>
                )}
              </div>
              {/* Email verification status display */}
              {email && emailVerificationResult && (
                <div
                  className={`flex items-center ml-1 mt-1 text-xs ${
                    emailVerificationResult.isValid
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {emailVerificationResult.isValid ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span>
                        {t("settings.emailVerified")} (
                        {emailVerificationResult.confidence}{" "}
                        {t("settings.confidence")})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      <span>
                        {emailVerificationResult.reason ||
                          t("settings.emailVerificationFailed")}
                      </span>
                    </>
                  )}
                </div>
              )}
              <p className="text-xs text-white/50 ml-1 mt-1">
                {t("settings.verificationLinkNote")}
              </p>
            </div>

            <div className="mt-2 px-2 py-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-6 w-6 rounded-full bg-indigo-500/30 flex items-center justify-center">
                    <Info className="h-3.5 w-3.5 text-indigo-300" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs text-white/80 leading-relaxed">
                    {t("settings.emailImportantNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 pb-1 flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setEmailDialogOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 font-medium"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdateEmail}
              disabled={updateEmailMutation.isPending}
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-[0_0_15px_rgba(129,140,248,0.4)] rounded-lg px-5 py-2 font-medium"
            >
              {updateEmailMutation.isPending ? (
                <div className="flex items-center">
                  <span className="mr-2 animate-pulse">
                    {t("settings.updating")}
                  </span>
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce"></div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="relative z-10">
                    {t("settings.updateEmail")}
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-indigo-600/0 via-indigo-600/40 to-indigo-600/0 -translate-x-full animate-shimmer"></div>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Update Dialog - Modern & Futuristic Design */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[425px] max-h-[85vh] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-3xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-t-3xl"></div>

          <button
            onClick={() => setPasswordDialogOpen(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute -z-10 inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -inset-[10px] bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-40"></div>
            <div className="absolute top-40 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div className="absolute top-10 right-16 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
          </div>

          <DialogHeader className="pt-4 pb-2 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                  {t("settings.changePassword")}
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1">
                  {t("settings.updatePasswordSecurity")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="currentPassword"
                className="text-sm font-medium text-white/80 ml-1"
              >
                {t("settings.currentPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-white/10 border-0 text-white focus:ring-2 focus:ring-purple-500/40 pl-10 rounded-2xl h-10"
                  placeholder={t("settings.enterCurrentPasswordPlaceholder")}
                  type="password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>

            <div className="space-y-1.5">
              <Label
                htmlFor="newPassword"
                className="text-sm font-medium text-white/80 ml-1"
              >
                {t("settings.newPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/10 border-0 text-white focus:ring-2 focus:ring-purple-500/40 pl-10 rounded-2xl h-10"
                  placeholder={t("settings.createNewPasswordPlaceholder")}
                  type="password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Fingerprint className="h-4 w-4 text-cyan-400" />
                </div>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">
                      {t("settings.passwordStrength")}
                    </span>
                    <span className="text-xs font-medium text-cyan-400">
                      {newPassword.length < 6
                        ? t("settings.weak")
                        : newPassword.length < 10
                          ? t("settings.medium")
                          : t("settings.strong")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        newPassword.length < 6
                          ? "bg-red-500 w-1/4"
                          : newPassword.length < 10
                            ? "bg-yellow-500 w-2/4"
                            : "bg-green-500 w-full"
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-white/80 ml-1"
              >
                {t("settings.confirmPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`bg-white/10 border-0 text-white focus:ring-2 focus:ring-purple-500/40 pl-10 rounded-2xl h-10 ${
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-red-500 ring-1 ring-red-500"
                      : ""
                  }`}
                  placeholder={t("settings.confirmNewPasswordPlaceholder")}
                  type="password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-cyan-400" />
                </div>
              </div>

              {/* Password match indicator */}
              {confirmPassword && (
                <div className="flex items-center mt-1 ml-1">
                  {newPassword === confirmPassword ? (
                    <div className="flex items-center text-xs text-green-400">
                      <div className="h-3.5 w-3.5 rounded-full bg-green-500/20 flex items-center justify-center mr-1.5">
                        <svg
                          className="h-2 w-2 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {t("settings.passwordsMustMatch")}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-red-400">
                      <div className="h-3.5 w-3.5 rounded-full bg-red-500/20 flex items-center justify-center mr-1.5">
                        <svg
                          className="h-2 w-2 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {t("settings.passwordsDontMatch")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 px-2 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-5 w-5 rounded-full bg-cyan-500/30 flex items-center justify-center">
                    <Info className="h-3 w-3 text-cyan-300" />
                  </div>
                </div>
                <div className="ml-2.5">
                  <p className="text-xs text-white/80 leading-relaxed">
                    {t("settings.strongPasswordsInclude")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1 pb-1 flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setPasswordDialogOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 font-medium"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={
                updatePasswordMutation.isPending ||
                (confirmPassword && newPassword !== confirmPassword) ||
                !newPassword ||
                !currentPassword
              }
              className="relative overflow-hidden bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:from-cyan-700 hover:to-purple-700 shadow-[0_0_15px_rgba(34,211,238,0.4)] rounded-2xl px-5 py-2 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {updatePasswordMutation.isPending ? (
                <div className="flex items-center">
                  <span className="mr-2 animate-pulse">
                    {t("settings.updating")}
                  </span>
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-bounce"></div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="relative z-10">
                    {t("settings.updatePasswordButton")}
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-cyan-600/0 via-cyan-600/40 to-cyan-600/0 -translate-x-full animate-shimmer"></div>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Selection Dialog - Modern & Futuristic Design */}
      <Dialog open={languageDialogOpen} onOpenChange={setLanguageDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[425px] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 via-blue-500 to-indigo-500 rounded-t-xl"></div>

          <button
            onClick={() => setLanguageDialogOpen(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute -z-10 inset-0 overflow-hidden rounded-xl">
            <div className="absolute -inset-[10px] bg-gradient-to-r from-green-500/10 via-blue-500/10 to-indigo-500/10 blur-3xl opacity-40"></div>
            <div className="absolute bottom-10 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute top-40 right-5 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl"></div>
          </div>

          <DialogHeader className="pt-6 pb-2 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                  {t("settings.language")}
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1">
                  {t("settings.customizeAppExperience")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <div className="absolute inset-0 flex justify-center">
                <div className="w-px h-full bg-gradient-to-b from-transparent via-blue-500/30 to-transparent"></div>
              </div>

              <div className="max-h-[300px] overflow-y-auto px-2 pb-1 relative">
                <div className="grid grid-cols-1 gap-0.5">
                  {allLanguages.map((language) => (
                    <button
                      key={language.code}
                      className={`group relative flex items-center justify-between p-3 rounded-lg transition-all duration-200 
                        ${
                          currentLanguage.code === language.code
                            ? "bg-gradient-to-r from-indigo-600/40 to-blue-600/40 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            : "hover:bg-indigo-500/10 text-white/90 hover:text-white"
                        }`}
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <div className="flex items-center">
                        {currentLanguage.code === language.code && (
                          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-r-full"></div>
                        )}
                        <span className="relative font-medium">
                          {language.flag} {language.name}{" "}
                          {language.nativeName !== language.name && (
                            <span className="text-gray-400 text-xs">
                              ({language.nativeName})
                            </span>
                          )}
                          {currentLanguage.code === language.code && (
                            <span className="absolute -bottom-0.5 left-0 w-full h-px bg-gradient-to-r from-indigo-400 to-blue-400"></span>
                          )}
                        </span>
                      </div>

                      {currentLanguage.code === language.code ? (
                        <div className="h-5 w-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 px-3 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-6 w-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <Info className="h-3.5 w-3.5 text-blue-300" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs text-white/80 leading-relaxed">
                    Changing the language will affect all text throughout the
                    application. Some translated content may take a moment to
                    load.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 pb-1 flex gap-2 justify-end border-t border-white/10">
            <Button
              variant="ghost"
              onClick={() => setLanguageDialogOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setLanguageDialogOpen(false)}
              className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-[0_0_15px_rgba(37,99,235,0.4)] rounded-lg px-5 py-2 font-medium"
            >
              <span className="relative z-10">Close</span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-600/0 via-blue-600/40 to-blue-600/0 -translate-x-full animate-shimmer"></div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy & Data Controls Dialog */}
      {user && (
        <DynamicPrivacyDialog
          open={privacyDialogOpen}
          onOpenChange={setPrivacyDialogOpen}
          user={user}
          isPremium={isPremium}
          onPremiumUpgradeClick={() => setPremiumUpgradeDialogOpen(true)}
        />
      )}

      {/* Privacy Policy Dialog */}
      <PrivacyPolicyDialog
        open={privacyPolicyDialogOpen}
        onOpenChange={setPrivacyPolicyDialogOpen}
      />

      {/* Terms of Service Dialog */}
      <TermsOfServiceDialog
        open={termsOfServiceDialogOpen}
        onOpenChange={setTermsOfServiceDialogOpen}
      />

      {/* Legal Documents Dialog */}
      <LegalDocumentsDialog
        open={legalDocumentsDialogOpen}
        onOpenChange={setLegalDocumentsDialogOpen}
      />

      {/* Help & Support Dialog */}
      <HelpSupportDialog
        open={helpSupportDialogOpen}
        onOpenChange={setHelpSupportDialogOpen}
      />

      {/* Premium Upgrade Dialog */}
      <PremiumUpgradeDialog
        open={premiumUpgradeDialogOpen}
        onOpenChange={setPremiumUpgradeDialogOpen}
      />

      {/* Fireworks Celebration */}
      <Fireworks
        isActive={showFireworks}
        duration={5000}
        onComplete={() => setShowFireworks(false)}
      />

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog
        open={showDowngradeDialog}
        onOpenChange={setShowDowngradeDialog}
      >
        <AlertDialogContent className="w-[85vw] max-w-sm ml-0 mr-8 border-0 bg-gradient-to-br from-white via-red-50/40 to-pink-50/60 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.15)] rounded-3xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 rounded-t-3xl"></div>

          <div className="absolute -z-10 inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -inset-[10px] bg-gradient-to-r from-red-500/5 via-pink-500/5 to-rose-500/5 blur-3xl"></div>
            <div className="absolute top-20 -left-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
            <div className="absolute top-8 right-12 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl"></div>
          </div>

          <AlertDialogHeader className="pt-6 pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
            <AlertDialogTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 leading-tight">
              {t("settings.downgradeConfirmation")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 space-y-4 text-sm mt-4">
              <p className="font-medium text-gray-800">
                {t("settings.loseAccessPremium")}
              </p>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-red-100">
                <ul className="space-y-3 text-xs">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t("settings.hideMyAgeFeature")}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t("settings.advancedMatchingAlgorithms")}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t("settings.priorityDiscoveryQueue")}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t("settings.enhancedProfileVisibility")}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t("settings.premiumCustomerSupport")}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  {t("settings.upgradeLaterNote")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-2 pb-6 flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel className="w-full bg-white/70 border-gray-200 text-gray-700 hover:bg-white/90 hover:text-gray-800 rounded-xl font-medium">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDowngradeDialog(false);
                handlePremiumToggle(false);
              }}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white border-0 rounded-xl font-medium shadow-lg"
            >
              {togglePremiumMutation.isPending
                ? t("settings.downgrading")
                : t("settings.yesDowngrade")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Subscription Dialog - Futuristic Design */}
      <AlertDialog
        open={changeSubscriptionDialogOpen}
        onOpenChange={setChangeSubscriptionDialogOpen}
      >
        <AlertDialogContent className="w-[85vw] max-w-sm border-0 shadow-2xl rounded-3xl overflow-hidden relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* Animated Border Glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-75 animate-pulse"></div>
          <div className="absolute inset-[2px] rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>

          {/* Floating Particles Animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 left-4 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
            <div
              className="absolute top-8 right-6 w-1 h-1 bg-purple-400 rounded-full animate-ping"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div
              className="absolute bottom-8 left-6 w-1 h-1 bg-pink-400 rounded-full animate-ping"
              style={{ animationDelay: "1s" }}
            ></div>
            <div
              className="absolute bottom-4 right-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{ animationDelay: "1.5s" }}
            ></div>
          </div>

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
              `,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>

          <AlertDialogHeader className="relative text-center space-y-2 pt-4 z-10">
            {/* Holographic Crown Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50 animate-pulse">
                  <Crown className="h-7 w-7 text-white drop-shadow-lg" />
                </div>
                {/* Rotating Ring */}
                <div
                  className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-spin"
                  style={{ animationDuration: "3s" }}
                ></div>
                <div
                  className="absolute inset-2 border border-purple-400/20 rounded-full animate-spin"
                  style={{
                    animationDuration: "2s",
                    animationDirection: "reverse",
                  }}
                ></div>
              </div>
            </div>

            <AlertDialogTitle className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
              Current Subscription Status
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="relative space-y-3 px-2 z-10">
            {/* Current Plan Info - Dynamic Status Display */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-3 border border-cyan-400/30 shadow-xl">
                <div className="text-center space-y-2">
                  <div className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    CHARLEY Premium
                  </div>
                  <div className="text-xs text-gray-300">
                    Status:{" "}
                    <span
                      className={`font-semibold glow-text ${
                        gracePeriodActive
                          ? "text-amber-400"
                          : subscriptionStatus &&
                              subscriptionStatus !== "expired"
                            ? "text-emerald-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {gracePeriodActive
                        ? "Canceled"
                        : subscriptionStatus && subscriptionStatus !== "expired"
                          ? "Active"
                          : "Active"}
                    </span>
                  </div>
                  {gracePeriodActive ? (
                    <>
                      <div className="text-xs text-gray-300">
                        Access continues until:
                      </div>
                      <div className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {subscriptionExpiresAt
                          ? new Date(subscriptionExpiresAt).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "Wed, Aug 6, 2025"}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-300">
                      All premium features unlocked
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Status - Dynamic Display */}
            <div className="relative group">
              <div
                className={`absolute inset-0 rounded-xl blur-sm group-hover:blur-none transition-all duration-300 ${
                  gracePeriodActive
                    ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20"
                    : "bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20"
                }`}
              ></div>
              <div
                className={`relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-3 border ${
                  gracePeriodActive
                    ? "border-amber-400/30"
                    : "border-emerald-400/30"
                }`}
              >
                <div className="text-xs text-gray-300">
                  <div
                    className={`font-semibold mb-2 flex items-center ${
                      gracePeriodActive ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${
                        gracePeriodActive ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    ></div>
                    System Status:
                  </div>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center text-gray-400">
                      <div
                        className={`w-1 h-1 rounded-full mr-2 ${
                          gracePeriodActive ? "bg-green-400" : "bg-red-400"
                        }`}
                      ></div>
                      Termination:{" "}
                      {gracePeriodActive ? "Processed" : "Not processed"}
                    </li>
                    <li className="flex items-center text-gray-400">
                      <div className="w-1 h-1 bg-cyan-400 rounded-full mr-2"></div>
                      Features:{" "}
                      {gracePeriodActive ? "Active until expiry" : "Active"}
                    </li>
                    <li className="flex items-center text-gray-400">
                      <div
                        className={`w-1 h-1 rounded-full mr-2 ${
                          gracePeriodActive ? "bg-purple-400" : "bg-emerald-400"
                        }`}
                      ></div>
                      Billing: {gracePeriodActive ? "Terminated" : "Active"}
                    </li>
                    <li className="flex items-center text-gray-400">
                      <div
                        className={`w-1 h-1 rounded-full mr-2 ${
                          gracePeriodActive ? "bg-pink-400" : "bg-gray-400"
                        }`}
                      ></div>
                      Reactivation:{" "}
                      {gracePeriodActive ? "Available" : "Not needed"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="relative pt-3 z-10">
            <div className="flex flex-col gap-2 w-full">
              <AlertDialogCancel className="w-full bg-slate-700/80 backdrop-blur-sm border-slate-600 text-gray-300 hover:bg-slate-600/80 hover:text-white transition-all duration-300 rounded-xl h-8 text-sm">
                Close
              </AlertDialogCancel>

              {/* Show Choose Premium Package for premium toggle users */}
              {!gracePeriodActive &&
                (!subscriptionStatus || subscriptionStatus === "expired") && (
                  <Button
                    onClick={() => {
                      setChangeSubscriptionDialogOpen(false);
                      setLocation("/payment");
                    }}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:via-pink-500 hover:to-purple-600 text-white border-0 shadow-2xl shadow-purple-500/50 transition-all duration-300 rounded-xl font-semibold group h-8 text-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="relative">Choose Premium Package</span>
                  </Button>
                )}

              {/* Show Change Subscription for grace period users */}
              {gracePeriodActive && (
                <Button
                  onClick={() => {
                    setChangeSubscriptionDialogOpen(false);
                    setLocation("/payment");
                  }}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:via-orange-400 hover:to-yellow-400 text-white border-0 shadow-2xl shadow-amber-500/50 transition-all duration-300 rounded-xl font-semibold group h-8 text-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative">Change Subscription</span>
                </Button>
              )}

              {/* Show Change Subscription for active subscription users */}
              {!gracePeriodActive &&
                subscriptionStatus &&
                subscriptionStatus !== "expired" && (
                  <Button
                    onClick={() => {
                      setChangeSubscriptionDialogOpen(false);
                      setLocation("/payment");
                    }}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:via-green-400 hover:to-teal-400 text-white border-0 shadow-2xl shadow-emerald-500/50 transition-all duration-300 rounded-xl font-semibold group h-8 text-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="relative">Change Subscription</span>
                  </Button>
                )}

              {/* Show Downgrade to Freemium for active premium users */}
              {!gracePeriodActive && (
                <Button
                  onClick={async () => {
                    console.log(
                      "[DOWNGRADE] Button clicked, calling subscription cancellation endpoint",
                    );
                    try {
                      setIsDowngrading(true);

                      // Call the subscription cancellation endpoint
                      const response = await fetch("/api/subscription/cancel", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                      });

                      if (response.ok) {
                        const result = await response.json();
                        console.log(
                          "[DOWNGRADE] Subscription cancelled successfully:",
                          result,
                        );

                        // Show success message based on whether grace period is active
                        toast({
                          title: result.gracePeriod
                            ? "Subscription Cancelled"
                            : "Downgraded to Freemium",
                          description: result.message,
                        });

                        // Invalidate queries to refresh the UI
                        queryClient.invalidateQueries({
                          queryKey: ["/api/premium/status"],
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["/api/user"],
                        });

                        setChangeSubscriptionDialogOpen(false);
                      } else {
                        const error = await response.json();
                        console.error("[DOWNGRADE] Error response:", error);

                        toast({
                          title: "Cancellation Failed",
                          description:
                            error.message || "Failed to cancel subscription",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error(
                        "[DOWNGRADE] Error cancelling subscription:",
                        error,
                      );

                      toast({
                        title: "Cancellation Error",
                        description:
                          "There was an error cancelling your subscription",
                        variant: "destructive",
                      });
                    } finally {
                      setIsDowngrading(false);
                    }
                  }}
                  disabled={isDowngrading}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 text-white border-0 shadow-2xl shadow-gray-500/50 transition-all duration-300 rounded-xl font-semibold group h-8 text-sm disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative">
                    {isDowngrading ? "Cancelling..." : "Downgrade to Freemium"}
                  </span>
                </Button>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
