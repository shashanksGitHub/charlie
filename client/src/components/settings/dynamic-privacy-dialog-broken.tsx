import React, { useState, useEffect } from "react";
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
}: DynamicPrivacyDialogProps) {
  const { currentMode } = useAppMode();
  const [showAllApps, setShowAllApps] = useState(false);

  // Fetch SUITE profile settings for visibility controls
  const { data: suiteSettings, isLoading: isLoadingSuiteSettings } = useQuery({
    queryKey: ["/api/suite/profile-settings"],
    enabled: !!user?.id && open,
  });

  // Local privacy states
  const [meetProfileHidden, setMeetProfileHidden] = useState(user?.profileHidden || false);
  const [jobDiscoveryHidden, setJobDiscoveryHidden] = useState(false);
  const [mentorshipDiscoveryHidden, setMentorshipDiscoveryHidden] = useState(false);
  const [networkingDiscoveryHidden, setNetworkingDiscoveryHidden] = useState(false);
  const [ghostMode, setGhostMode] = useState(user?.ghostMode || false);
  const [incognitoSwiping, setIncognitoSwiping] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [deletePassword, setDeletePassword] = useState("");

  // Initialize SUITE visibility states from fetched data
  useEffect(() => {
    if (suiteSettings) {
      setJobDiscoveryHidden((suiteSettings as any).hiddenInJobDiscovery || false);
      setMentorshipDiscoveryHidden((suiteSettings as any).hiddenInMentorshipDiscovery || false);
      setNetworkingDiscoveryHidden((suiteSettings as any).hiddenInNetworkingDiscovery || false);
    }
  }, [suiteSettings]);

  // Update MEET profile visibility
  const updateMeetProfileMutation = useMutation({
    mutationFn: async (hidden: boolean) => {
      const response = await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: { profileHidden: hidden },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Privacy Updated",
        description: `Your MEET profile is now ${meetProfileHidden ? 'hidden' : 'visible'} to others.`,
      });
    },
    onError: (error) => {
      console.error("Error updating MEET profile visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update MEET profile visibility. Please try again.",
        variant: "destructive",
      });
      // Revert local state on error
      setMeetProfileHidden(user?.profileHidden || false);
    },
  });

  // Update SUITE profile visibilities
  const updateSuiteVisibilityMutation = useMutation({
    mutationFn: async (visibilityUpdates: Partial<SuiteProfileSettings>) => {
      const response = await apiRequest("/api/suite/profile-settings", {
        method: "PUT",
        data: visibilityUpdates,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suite/profile-settings"] });
      toast({
        title: "Privacy Updated",
        description: "Your SUITE discovery visibility has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating SUITE visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update SUITE visibility settings. Please try again.",
        variant: "destructive",
      });
      // Revert local states on error
      if (suiteSettings) {
        setJobDiscoveryHidden((suiteSettings as any).hiddenInJobDiscovery);
        setMentorshipDiscoveryHidden((suiteSettings as any).hiddenInMentorshipDiscovery);
        setNetworkingDiscoveryHidden((suiteSettings as any).hiddenInNetworkingDiscovery);
      }
    },
  });

  // Update Ghost Mode
  const updateGhostModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest(`/api/profile/${user.id}`, {
        method: "PATCH",
        data: { ghostMode: enabled },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Ghost Mode Updated",
        description: `Ghost Mode is now ${ghostMode ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error) => {
      console.error("Error updating Ghost Mode:", error);
      toast({
        title: "Error",
        description: "Failed to update Ghost Mode. Please try again.",
        variant: "destructive",
      });
      setGhostMode(user?.ghostMode || false);
    },
  });

  // Handle MEET profile visibility toggle
  const handleMeetProfileToggle = (hidden: boolean) => {
    setMeetProfileHidden(hidden);
    updateMeetProfileMutation.mutate(hidden);
  };

  // Handle SUITE visibility toggles
  const handleJobDiscoveryToggle = (hidden: boolean) => {
    setJobDiscoveryHidden(hidden);
    updateSuiteVisibilityMutation.mutate({ hiddenInJobDiscovery: hidden });
  };

  const handleMentorshipDiscoveryToggle = (hidden: boolean) => {
    setMentorshipDiscoveryHidden(hidden);
    updateSuiteVisibilityMutation.mutate({ hiddenInMentorshipDiscovery: hidden });
  };

  const handleNetworkingDiscoveryToggle = (hidden: boolean) => {
    setNetworkingDiscoveryHidden(hidden);
    updateSuiteVisibilityMutation.mutate({ hiddenInNetworkingDiscovery: hidden });
  };

  // Handle Ghost Mode toggle
  const handleGhostModeToggle = (enabled: boolean) => {
    setGhostMode(enabled);
    updateGhostModeMutation.mutate(enabled);
  };

  const handleIncognitoSwipingToggle = (enabled: boolean) => {
    setIncognitoSwiping(enabled);
    // TODO: Implement incognito swiping API call
    toast({
      title: "Feature Coming Soon",
      description: "Incognito swiping will be available in a future update.",
      variant: "default",
    });
  };

  const handleReadReceiptsToggle = (enabled: boolean) => {
    setReadReceipts(enabled);
    // TODO: Implement read receipts API call
    toast({
      title: "Feature Coming Soon", 
      description: "Read receipts control will be available in a future update.",
      variant: "default",
    });
  };

  const handleAccountDeletion = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the API to delete the account with password verification
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          password: deletePassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Account deletion failed",
          description:
            errorData.message ||
            "Password verification failed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Close dialog first
      onOpenChange(false);

      // Show farewell screen that transitions to auth screen
      setTimeout(() => {
        // Clear all local and session storage
        localStorage.clear();
        sessionStorage.clear();

        // Show full-screen farewell message with auth transition
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
      }, 500);

    } catch (error) {
      console.error("Account deletion error:", error);
      toast({
        title: "Something went wrong",
        description: "Unable to delete account. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Get app-specific privacy options based on current mode or show all
  const getPrivacyOptions = (): PrivacyOption[] => {
    const allOptions: PrivacyOption[] = [];

    // MEET options
    if (currentMode === 'MEET' || showAllApps) {
      allOptions.push({
        id: "meetProfileHidden",
        title: "Hide MEET Profile",
        description: "Your profile won't appear in MEET discovery",
        value: meetProfileHidden,
        icon: <Heart className="h-4 w-4" />,
      });
    }

    // HEAT options (if implemented in future)
    if (currentMode === 'HEAT' || showAllApps) {
      allOptions.push({
        id: "heatProfileHidden",
        title: "Hide HEAT Profile",
        description: "Your profile won't appear in HEAT discovery",
        value: false, // Placeholder for future implementation
        icon: <Flame className="h-4 w-4" />,
        disabled: true,
      });
    }

    // SUITE options
    if (currentMode === 'SUITE' || showAllApps) {
      if ((suiteSettings as any)?.jobProfileActive) {
        allOptions.push({
          id: "jobDiscoveryHidden",
          title: "Hide from Job Discovery",
          description: "Your job profile won't appear in job searches",
          value: jobDiscoveryHidden,
          icon: <Briefcase className="h-4 w-4" />,
        });
      }

      if ((suiteSettings as any)?.mentorshipProfileActive) {
        allOptions.push({
          id: "mentorshipDiscoveryHidden",
          title: "Hide from Mentorship Discovery",
          description: "Your mentorship profile won't appear in mentorship searches",
          value: mentorshipDiscoveryHidden,
          icon: <GraduationCap className="h-4 w-4" />,
        });
      }

      if ((suiteSettings as any)?.networkingProfileActive) {
        allOptions.push({
          id: "networkingDiscoveryHidden",
          title: "Hide from Networking Discovery",
          description: "Your networking profile won't appear in networking searches",
          value: networkingDiscoveryHidden,
          icon: <Network className="h-4 w-4" />,
        });
      }
    }

    // Global options (always shown)
    allOptions.push({
      id: "ghostMode",
      title: "Ghost Mode",
      description: "Hide online status & typing",
      value: ghostMode,
      icon: <UserX className="h-4 w-4" />,
      premium: true,
    });

    allOptions.push({
      id: "incognitoSwiping",
      title: "Incognito Swiping",
      description: "Browse invisibly (24h)",
      value: incognitoSwiping,
      icon: <Eye className="h-4 w-4" />,
      premium: true,
    });

    allOptions.push({
      id: "readReceipts",
      title: "Read Receipts",
      description: "Show when messages read",
      value: readReceipts,
      icon: <MessageCircle className="h-4 w-4" />,
    });

    return allOptions;
  };

  const handleToggleChange = (optionId: string, value: boolean) => {
    switch (optionId) {
      case "meetProfileHidden":
        handleMeetProfileToggle(value);
        break;
      case "jobDiscoveryHidden":
        handleJobDiscoveryToggle(value);
        break;
      case "mentorshipDiscoveryHidden":
        handleMentorshipDiscoveryToggle(value);
        break;
      case "networkingDiscoveryHidden":
        handleNetworkingDiscoveryToggle(value);
        break;
      case "ghostMode":
        handleGhostModeToggle(value);
        break;
      case "incognitoSwiping":
        handleIncognitoSwipingToggle(value);
        break;
      case "readReceipts":
        handleReadReceiptsToggle(value);
        break;
      default:
        console.log(`Toggle for ${optionId} not implemented yet`);
    }
  };

  const privacyOptions = getPrivacyOptions();

  // Get app mode display info
  const getAppModeInfo = () => {
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
  };

  const appInfo = getAppModeInfo();

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
              Privacy & Discovery Controls
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pb-8">
          <div className="space-y-4">
            {/* Current App Mode Indicator */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                {appInfo.icon}
                <div>
                  <div className="font-medium text-sm text-white">Current App: {appInfo.name}</div>
                  <div className="text-xs text-gray-300">
                    {showAllApps ? 'Showing all app controls' : 'Showing app-specific controls'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllApps(!showAllApps)}
                  className="text-xs bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  {showAllApps ? 'Show Current Only' : 'Show All Apps'}
                </Button>
              </div>
            </div>

            {/* Privacy Options */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
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
                          {option.premium && (
                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-2">
                              Premium
                            </Badge>
                          )}
                          {option.disabled && (
                            <Badge variant="outline" className="text-xs text-gray-300 border-gray-400 ml-2">
                              Coming Soon
                            </Badge>
                          )}
                        </Label>
                      </div>
                      <Switch
                        id={option.id}
                        checked={option.value}
                        onCheckedChange={(value) => handleToggleChange(option.id, value)}
                        disabled={option.disabled || isLoadingSuiteSettings}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-300 mt-1 pl-8">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Information Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Privacy Controls Explained</p>
                <p className="mt-1 text-xs">
                  These controls manage your visibility in discovery feeds. 
                  When hidden, your profile won't appear to others, but existing 
                  matches and conversations remain active.
                </p>
              </div>
            </div>
          </div>

          {/* Account Deletion Section */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="h-4 w-4 text-red-600" />
              <h3 className="font-medium text-red-800">Delete Your CHARLéY Account</h3>
            </div>
            
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="Enter password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="bg-white border-red-300 focus:border-red-500"
              />
              
              <Button
                variant="destructive"
                onClick={handleAccountDeletion}
                disabled={!deletePassword.trim()}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Permanently Delete Account
              </Button>
              
              <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-800">
                  <p className="font-medium">Important</p>
                  <p>Account deletion is permanent. All your data including messages, matches, and profile information will be completely removed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}