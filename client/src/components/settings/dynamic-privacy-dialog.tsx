import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useAppMode, AppMode } from "@/hooks/use-app-mode";
import { useLanguage } from "@/hooks/use-language";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Shield,
  EyeOff,
  Users,
  X,
  AlertCircle,
  Trash2,
  UserX,
  UserCircle,
  Heart,
  Flame,
  Briefcase,
  Network,
  GraduationCap,
  Info,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface PrivacyOption {
  id: string;
  title: string;
  description: string;
  value: boolean;
  icon: React.ReactNode;
  premium?: boolean;
  disabled?: boolean;
}

interface DynamicPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  isPremium?: boolean;
  onPremiumUpgradeClick?: () => void;
}

interface SuiteProfileSettings {
  hiddenInJobDiscovery?: boolean;
  hiddenInMentorshipDiscovery?: boolean;
  hiddenInNetworkingDiscovery?: boolean;
  jobProfileActive?: boolean;
  mentorshipProfileActive?: boolean;
  networkingProfileActive?: boolean;
  [key: string]: any; // Allow additional fields
}

export function DynamicPrivacyDialog({
  open,
  onOpenChange,
  user,
  isPremium = false,
  onPremiumUpgradeClick,
}: DynamicPrivacyDialogProps) {
  const { currentMode } = useAppMode();
  const { translate: t } = useLanguage();
  const [showAllApps, setShowAllApps] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // State for SUITE profile settings
  const [suiteSettings, setSuiteSettings] = useState<SuiteProfileSettings>({});

  // Fetch SUITE profile settings
  const { data: suiteProfileSettings } = useQuery({
    queryKey: ["/api/suite/profile-settings"],
    enabled: open,
  });

  useEffect(() => {
    if (suiteProfileSettings) {
      setSuiteSettings(suiteProfileSettings);
    }
  }, [suiteProfileSettings]);

  const privacyOptions = useMemo((): PrivacyOption[] => {
    // Check if user has activated their MEET profile (can re-enable hiding requires premium)
    const hasActivatedMeet = user.hasActivatedProfile || false;
    
    // Create all possible profile options
    const meetOption = hasActivatedMeet ? {
      id: "hideMeetProfile",
      title: t("settings.hideMeetProfile"),
      description: !isPremium 
        ? t("settings.requiresPremiumToHideMeetProfile")
        : "Your profile won't appear in MEET discovery, but existing matches remain active",
      value: user.profileHidden || false,
      icon: <Heart className="h-4 w-4 text-purple-500" />,
      premium: true, // Always requires premium for Hide MEET Profile toggle
      disabled: false, // Always clickable, premium check handled in toggle function
    } : null;

    const jobsOption = suiteSettings.jobProfileActive ? {
      id: "hideJobsDiscovery",
      title: t("settings.hideJobsProfile"),
      description: suiteSettings.jobProfileActive && !isPremium
        ? t("settings.requiresPremiumAfterActivation")
        : t("settings.jobProfileDiscoveryDescription"),
      value: suiteSettings.hiddenInJobDiscovery || false,
      icon: <Briefcase className="h-4 w-4 text-blue-500" />,
      premium: suiteSettings.jobProfileActive, // Requires premium if profile is active
      disabled: false, // Always clickable, premium check handled in toggle function
    } : null;

    const mentorshipOption = suiteSettings.mentorshipProfileActive ? {
      id: "hideMentorshipDiscovery", 
      title: t("settings.hideMentorshipProfile"),
      description: suiteSettings.mentorshipProfileActive && !isPremium
        ? t("settings.requiresPremiumAfterActivation")
        : t("settings.mentorshipProfileDiscoveryDescription"),
      value: suiteSettings.hiddenInMentorshipDiscovery || false,
      icon: <GraduationCap className="h-4 w-4 text-violet-500" />,
      premium: suiteSettings.mentorshipProfileActive, // Requires premium if profile is active
      disabled: false, // Always clickable, premium check handled in toggle function
    } : null;

    const networkingOption = suiteSettings.networkingProfileActive ? {
      id: "hideNetworkingDiscovery",
      title: t("settings.hideNetworkingProfile"), 
      description: suiteSettings.networkingProfileActive && !isPremium
        ? t("settings.requiresPremiumAfterActivation")
        : t("settings.networkingProfileDiscoveryDescription"),
      value: suiteSettings.hiddenInNetworkingDiscovery || false,
      icon: <Network className="h-4 w-4 text-emerald-500" />,
      premium: suiteSettings.networkingProfileActive, // Requires premium if profile is active
      disabled: false, // Always clickable, premium check handled in toggle function
    } : null;

    const ghostModeOption = {
      id: "ghostMode",
      title: t("settings.ghostMode"),
      description: t("settings.ghostModeDescription"),
      value: user.ghostMode || false,
      icon: <EyeOff className="h-4 w-4 text-gray-500" />,
      premium: true,
      disabled: false, // Ghost Mode is always available to premium users
    };

    const hideAgeOption = {
      id: "hideAge",
      title: t("settings.hideMyAge"),
      description: !isPremium && !hasActivatedMeet
        ? t("settings.ageProfileDescription")
        : !isPremium && hasActivatedMeet
        ? t("settings.requiresPremiumToHideAge")
        : t("settings.ageProfileDescription"),
      value: !isPremium && !hasActivatedMeet
        ? true // Enabled by default for users without active profile
        : !isPremium && hasActivatedMeet
        ? false // Disabled for users with active profile but no premium
        : user.hideAge || false, // Premium users can control it, default to false
      icon: <UserCircle className="h-4 w-4 text-indigo-500" />,
      premium: hasActivatedMeet, // Only shows premium badge when profile is activated
      disabled: false, // Always clickable
    };

    // Determine which option should be shown as current app's priority
    const lastUsedApp = user.lastUsedApp || currentMode;
    
    // Get the last used SUITE tab to determine which specific profile to prioritize
    let lastSuiteTab = null;
    try {
      lastSuiteTab = localStorage.getItem(`suite_network_last_tab_${user.id}`);
    } catch (error) {
      console.warn('Failed to get last SUITE tab:', error);
    }
    
    let primaryOption = null;
    
    // Determine primary option based on last used app/section
    if (lastUsedApp === 'MEET') {
      primaryOption = meetOption;
    } else if (lastUsedApp === 'SUITE') {
      if (lastSuiteTab === 'networking' && networkingOption) {
        primaryOption = networkingOption;
      } else if (lastSuiteTab === 'mentorship' && mentorshipOption) {
        primaryOption = mentorshipOption;
      } else if (lastSuiteTab === 'job' && jobsOption) {
        primaryOption = jobsOption;
      } else {
        // Fallback: prioritize based on which profiles are active
        primaryOption = networkingOption || mentorshipOption || jobsOption || meetOption;
      }
    }

    if (showAllApps) {
      // Show all options when expanded
      const allOptions: PrivacyOption[] = [];
      if (meetOption) allOptions.push(meetOption);
      [jobsOption, mentorshipOption, networkingOption].forEach(option => {
        if (option) allOptions.push(option);
      });
      allOptions.push(ghostModeOption);
      allOptions.push(hideAgeOption);
      return allOptions;
    } else {
      // Show only primary option and Ghost Mode when collapsed
      const collapsedOptions: PrivacyOption[] = [];
      if (primaryOption) collapsedOptions.push(primaryOption);
      collapsedOptions.push(ghostModeOption);
      return collapsedOptions;
    }
  }, [user, isPremium, suiteSettings, currentMode, showAllApps]);

  // Calculate additional options count for collapsed vs expanded view
  const getAdditionalOptionsCount = useMemo(() => {
    if (showAllApps) {
      return 0; // Already showing all
    }
    
    // Count total available options
    let totalOptions = 0;
    if (user.hasActivatedProfile) totalOptions++; // MEET option only if profile activated
    if (suiteSettings.jobProfileActive) totalOptions++;
    if (suiteSettings.mentorshipProfileActive) totalOptions++;
    if (suiteSettings.networkingProfileActive) totalOptions++;
    // Ghost Mode and Hide Age are always shown, so don't count them as hidden
    
    // Currently showing: 1 primary option + Ghost Mode = 2 options
    // So hidden options = total - 1 (since Ghost Mode is always visible)
    return Math.max(0, totalOptions - 1);
  }, [showAllApps, user.hasActivatedProfile, suiteSettings.jobProfileActive, suiteSettings.mentorshipProfileActive, suiteSettings.networkingProfileActive]);

  // Optimized mutations for instant UI response
  const profileVisibilityMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: boolean }) => {
      if (fieldName === 'profileHidden') {
        return await apiRequest(`/api/profile/${user.id}`, {
          method: "PATCH",
          data: { [fieldName]: value },
        });
      } else {
        return await apiRequest("/api/suite/profile-settings", {
          method: "PUT",
          data: { [fieldName]: value },
        });
      }
    },
    onMutate: async ({ fieldName, value }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      if (fieldName === 'profileHidden') {
        await queryClient.cancelQueries({ queryKey: ["/api/user"] });
        
        // Snapshot previous value for rollback
        const previousUser = queryClient.getQueryData(["/api/user"]);
        
        // Optimistically update user data
        queryClient.setQueryData(["/api/user"], (old: any) => ({
          ...old,
          [fieldName]: value,
        }));
        
        return { previousUser };
      } else {
        await queryClient.cancelQueries({ queryKey: ["/api/suite/profile-settings"] });
        
        // Update SUITE settings optimistically
        setSuiteSettings(prev => ({ ...prev, [fieldName]: value }));
        
        return { previousSuiteSettings: suiteSettings };
      }
    },
    onError: (error, { fieldName, value }, context) => {
      // Rollback optimistic updates on error
      if (fieldName === 'profileHidden' && context?.previousUser) {
        queryClient.setQueryData(["/api/user"], context.previousUser);
      } else if (context?.previousSuiteSettings) {
        setSuiteSettings(context.previousSuiteSettings);
      }
      
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, { fieldName }) => {
      // Refetch to ensure sync with server state
      if (fieldName === 'profileHidden') {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/suite/profile-settings"] });
      }
    },
  });

  const otherTogglesMutation = useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: boolean }) => {
      return await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH", 
        data: { [fieldName]: value },
      });
    },
    onMutate: async ({ fieldName, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/user"] });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData(["/api/user"]);
      
      // Optimistically update user data immediately
      queryClient.setQueryData(["/api/user"], (old: any) => ({
        ...old,
        [fieldName]: value,
      }));
      
      return { previousUser };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user"], context.previousUser);
      }
      
      toast({
        title: "Error",
        description: "Failed to update privacy setting. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  // Handle profile visibility toggles with premium check and instant optimistic updates
  const handleProfileVisibilityToggle = useCallback((fieldName: string, value: boolean) => {
    // Check if premium is required for any profile visibility action
    const requiresPremium = (fieldName: string, value: boolean) => {
      switch (fieldName) {
        case 'profileHidden':
          // Hide MEET Profile toggle ALWAYS requires premium (both hiding and unhiding)
          return true;
        case 'hiddenInJobDiscovery':
          // SUITE toggles require premium for hiding after activation
          if (!value) return false; // Unhiding never requires premium
          return suiteSettings.jobProfileActive || false;
        case 'hiddenInMentorshipDiscovery':
          if (!value) return false; // Unhiding never requires premium
          return suiteSettings.mentorshipProfileActive || false;
        case 'hiddenInNetworkingDiscovery':
          if (!value) return false; // Unhiding never requires premium
          return suiteSettings.networkingProfileActive || false;
        default:
          return false;
      }
    };

    // If premium is required and user doesn't have it, show upgrade prompt
    if (requiresPremium(fieldName, value) && !isPremium) {
      onPremiumUpgradeClick?.();
      return;
    }

    // Execute optimistic mutation for instant UI response
    profileVisibilityMutation.mutate({ fieldName, value });
  }, [isPremium, suiteSettings, onPremiumUpgradeClick, profileVisibilityMutation]);

  // Handle other toggles (Ghost Mode, Hide Age, etc.) with premium check and instant optimistic updates
  const handleOtherToggles = useCallback((fieldName: string, value: boolean) => {
    // Check if premium is required for this action
    if (fieldName === "ghostMode" && !isPremium) {
      onPremiumUpgradeClick?.();
      return;
    }
    
    // Hide My Age conditional logic
    if (fieldName === "hideAge") {
      const hasActivatedMeet = user.hasActivatedProfile || false;
      
      // Non-premium users with no active profile: prevent switching (should remain enabled)
      if (!isPremium && !hasActivatedMeet) {
        onPremiumUpgradeClick?.();
        return;
      }
      
      // Non-premium users with active profile: require premium to enable
      if (!isPremium && hasActivatedMeet) {
        onPremiumUpgradeClick?.();
        return;
      }
      
      // Premium users: allow full control (handled by optimistic mutation below)
    }

    // Execute optimistic mutation for instant UI response
    otherTogglesMutation.mutate({ fieldName, value });
  }, [isPremium, user.hasActivatedProfile, onPremiumUpgradeClick, otherTogglesMutation]);

  const handleToggleChange = useCallback((optionId: string, value: boolean) => {
    switch (optionId) {
      case "hideMeetProfile":
        handleProfileVisibilityToggle("profileHidden", value);
        break;
      case "hideJobsDiscovery":
        handleProfileVisibilityToggle("hiddenInJobDiscovery", value);
        break;
      case "hideMentorshipDiscovery":
        handleProfileVisibilityToggle("hiddenInMentorshipDiscovery", value);
        break;
      case "hideNetworkingDiscovery":
        handleProfileVisibilityToggle("hiddenInNetworkingDiscovery", value);
        break;
      case "ghostMode":
        handleOtherToggles("ghostMode", value);
        break;
      case "hideAge":
        handleOtherToggles("hideAge", value);
        break;
      default:
        console.log(`Toggle for ${optionId} not implemented yet`);
    }
  }, [handleProfileVisibilityToggle, handleOtherToggles]);

  const handleAccountDeletion = async () => {
    // Clear any previous error messages
    setPasswordError("");
    
    if (!deletePassword.trim()) {
      setPasswordError("Please enter your password to confirm account deletion.");
      return;
    }

    try {
      setIsDeleting(true);
      
      // Use non-blocking request for better performance
      const deletionPromise = apiRequest("/api/user/delete", {
        method: "POST",
        data: { password: deletePassword },
      });

      // Close dialog immediately for better UX
      onOpenChange(false);

      const response = await deletionPromise;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Show inline error instead of toast
        if (errorData.message && errorData.message.includes("Password verification failed")) {
          setPasswordError("Incorrect password. Please try again.");
        } else {
          setPasswordError("Unable to delete account. Please try again later.");
        }
        
        // Reopen dialog to show error
        onOpenChange(true);
        setIsDeleting(false);
        return;
      }

      // Clear all local and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Show farewell screen that transitions to auth screen
      const farewellDiv = document.createElement("div");
      farewellDiv.className =
        "fixed inset-0 bg-black flex flex-col items-center justify-center z-50";
      farewellDiv.id = "farewell-screen";
      farewellDiv.innerHTML = `
        <div class="text-center p-8 max-w-md farewell-content">
          <h1 class="text-3xl font-bold text-white mb-4">We're sad to see you go</h1>
          <p class="text-lg text-gray-300 mb-8">Your CHARLéY account has been deleted.</p>
          <div class="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-1 w-32 mx-auto mb-8"></div>
          <p class="text-sm text-gray-400">Redirecting you shortly...</p>
        </div>

        <div class="auth-content" style="opacity: 0; position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: black; transform: translateY(20px); transition: opacity 1s ease, transform 1s ease;">
          <div style="text-align: center;">
            <div style="margin-bottom: 1rem;">
              <span style="font-family: 'Arial Black', sans-serif; font-size: 3.5rem; font-weight: bold; letter-spacing: 2px; background: linear-gradient(to right, #9333EA, #FB923C); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                CHARLéY
              </span>
            </div>
            <div style="color: white; font-size: 1.25rem; margin-top: 0.5rem;">
              Connect. Engage. Elevate.
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(farewellDiv);

      // Add style for transition
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);

      // Show farewell message for 3 seconds, then animate transition to auth screen
      setTimeout(() => {
        const farewellContent = document.querySelector(
          ".farewell-content",
        ) as HTMLElement;
        const authContent = document.querySelector(
          ".auth-content",
        ) as HTMLElement;

        if (farewellContent) {
          farewellContent.style.animation = "fadeOut 1s forwards";
        }

        if (authContent) {
          authContent.style.opacity = "1";
          authContent.style.transform = "translateY(0)";
        }

        // Redirect to login page after the transition animation completes
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
      }, 2500);

    } catch (error) {
      console.error("Account deletion error:", error);
      setPasswordError("Unable to delete account. Please try again later.");
      
      // Reopen dialog to show error
      onOpenChange(true);
      setIsDeleting(false);
    }
  };

  // Get app mode display info
  const appInfo = useMemo(() => {
    switch (currentMode) {
      case 'MEET':
        return {
          name: 'MEET',
          icon: <Heart className="h-5 w-5 text-purple-500" fill="currentColor" />,
          color: 'from-purple-500 to-pink-500',
        };
      case 'HEAT':
        return {
          name: 'HEAT',
          icon: <Flame className="h-5 w-5 text-orange-500" fill="currentColor" />,
          color: 'from-orange-500 to-yellow-500',
        };
      case 'SUITE':
        return {
          name: 'SUITE',
          icon: <Briefcase className="h-5 w-5 text-blue-500" />,
          color: 'from-blue-500 to-indigo-500',
        };
      default:
        return { name: 'Unknown', icon: null, color: 'from-gray-500 to-gray-600' };
    }
  }, [currentMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[480px] max-h-[85vh] overflow-y-auto flex flex-col border-none bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-t-xl"></div>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 text-white/80 hover:text-white rounded-full p-1 bg-white/10 hover:bg-white/20 transition-all duration-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="absolute -z-10 inset-0 overflow-hidden rounded-xl">
          <div className="absolute -inset-[10px] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 blur-3xl opacity-40"></div>
          <div className="absolute bottom-10 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-5 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <DialogHeader className="pt-6 pb-2 border-b border-white/10 mb-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 mr-2 text-purple-400" />
            <DialogTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              {t("settings.privacyAndDiscoveryControls")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pb-8">
          <div className="space-y-4">
            {/* Privacy Controls Section */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              {/* Section Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-semibold text-sm sm:text-base text-white whitespace-nowrap">{t("settings.privacyControls")}</span>
                        {isPremium && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white w-fit mt-1 sm:mt-0">
                            PREMIUM
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllApps(!showAllApps)}
                    className="text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-1.5 relative"
                  >
                    {showAllApps ? (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        {t("settings.currentOnly")}
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        {t("settings.showAll")}
                        {getAdditionalOptionsCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full text-[8px] flex items-center justify-center font-medium">
                            {getAdditionalOptionsCount}
                          </div>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Privacy Options */}
              {privacyOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active profiles found</p>
                  <p className="text-xs">Create profiles to control their visibility</p>
                </div>
              ) : (
                privacyOptions.map((option, index) => (
                  <div
                    key={option.id}
                    className={`${index < privacyOptions.length - 1 ? "pb-2 mb-2 border-b border-white/10" : ""}`}
                  >
                    <div className="flex flex-row items-center justify-between mb-1">
                      <div className="flex items-center">
                        {option.icon}
                        <Label htmlFor={option.id} className="ml-2 font-medium text-white">
                          {option.title}
                        </Label>
                      </div>
                      <Switch
                        id={option.id}
                        checked={option.value}
                        onCheckedChange={(value) => handleToggleChange(option.id, value)}
                        disabled={option.disabled}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-300 mt-1 pl-8">
                        {option.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>



            {/* Account Deletion Section */}
            <div className="border border-red-500/30 rounded-lg p-4 bg-gradient-to-r from-red-900/20 to-pink-900/20">
              <div className="flex items-center mb-2">
                <Trash2 className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-md font-medium text-white">
                  {t("settings.deleteYourCharleyAccount")}
                </h3>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                {t("settings.deleteAccountWarning")}
              </p>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder={t("settings.enterPasswordToConfirm")}
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    // Clear error when user starts typing
                    if (passwordError) setPasswordError("");
                  }}
                  className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 ${
                    passwordError ? "border-red-500/50 focus:border-red-500" : ""
                  }`}
                />
                {passwordError && (
                  <p className="text-red-400 text-xs mt-1 px-1">
                    {passwordError}
                  </p>
                )}
                <Button
                  onClick={handleAccountDeletion}
                  disabled={isDeleting || !deletePassword.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? "Deleting Account..." : t("settings.deleteAccount")}
                </Button>
              </div>
            </div>

            {/* Information Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium">{t("settings.privacyControlsExplained")}</p>
                  <p className="mt-1 text-xs">
                    {t("settings.privacyControlsDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}