import React, { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import {
  Shield,
  EyeOff,
  Users,
  X,
  AlertCircle,
  Trash2,
  UserX,
  UserCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface PrivacyOption {
  id: string;
  title: string;
  description: string;
  value: boolean;
  icon: React.ReactNode;
  premium?: boolean;
}

interface PrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function PrivacyDialog({
  open,
  onOpenChange,
  user,
}: PrivacyDialogProps) {
  // Local storage key prefix for privacy settings
  const storagePrefix = `privacy_${user?.id}_`;
  const queryClient = useQueryClient();

  // Location precision and security-related state variables removed

  // Initialize enhanced privacy settings
  const [visibilitySettings, setVisibilitySettings] = useState<PrivacyOption[]>(
    [
      {
        id: "hide_profile",
        title: "Hide My Profile",
        description: "Hidden from Discover/Browse",
        value: user?.profileHidden || false,
        icon: <UserX className="h-5 w-5 text-red-500" />,
      },
      {
        id: "ghost_mode",
        title: "Ghost Mode",
        description: "Hide online status & typing",
        value: user?.ghostMode || false,
        icon: <UserCircle className="h-5 w-5 text-gray-500" />,
      },
      {
        id: "incognito_swiping",
        title: "Incognito Swiping",
        description: "Browse invisibly (24h)",
        value:
          localStorage.getItem(`${storagePrefix}incognito_swiping`) === "true",
        icon: <EyeOff className="h-5 w-5 text-purple-500" />,
      },
      {
        id: "read_receipts",
        title: "Read Receipts",
        description: "Show when messages read",
        value:
          localStorage.getItem(`${storagePrefix}read_receipts`) !== "false",
        icon: <Users className="h-5 w-5 text-blue-500" />,
      },
    ],
  );

  // Security settings removed

  // For data export/delete functionality
  const [dataAction, setDataAction] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [accountDeleteProgress, setAccountDeleteProgress] = useState(0);

  // Toggle a visibility setting and save immediately
  const toggleVisibilitySetting = async (id: string) => {
    if (id === "hide_profile" || id === "ghost_mode") {
      // Handle profile hidden and ghost mode toggles with API call
      try {
        const newValue = !visibilitySettings.find((s) => s.id === id)?.value;

        const updateData =
          id === "hide_profile"
            ? { profileHidden: newValue }
            : { ghostMode: newValue };

        const response = await fetch(`/api/profile/${user.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to update ${id === "hide_profile" ? "profile visibility" : "ghost mode"}`,
          );
        }

        // Update local state
        setVisibilitySettings((settings) =>
          settings.map((setting) =>
            setting.id === id ? { ...setting, value: newValue } : setting,
          ),
        );

        // Update the user cache
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        const settingName =
          id === "hide_profile" ? "Profile visibility" : "Ghost Mode";
        const description =
          id === "hide_profile"
            ? `Your profile is now ${newValue ? "hidden from" : "visible in"} discovery.`
            : `You will now ${newValue ? "appear offline" : "show your online status"} to other users.`;

        toast({
          title: `${settingName} updated`,
          description: description,
        });
      } catch (error) {
        console.error(`Error updating ${id}:`, error);
        const settingName =
          id === "hide_profile" ? "profile visibility" : "ghost mode";
        toast({
          title: "Update failed",
          description: `Failed to update ${settingName}. Please try again.`,
          variant: "destructive",
        });
      }
    } else {
      // Handle other toggles with localStorage
      setVisibilitySettings((settings) => {
        const newSettings = settings.map((setting) =>
          setting.id === id ? { ...setting, value: !setting.value } : setting,
        );

        // Save the updated setting to localStorage
        const updatedSetting = newSettings.find((s) => s.id === id);
        if (updatedSetting) {
          localStorage.setItem(
            `${storagePrefix}${id}`,
            updatedSetting.value.toString(),
          );
          // Show success toast
          toast({
            title: "Setting updated",
            description: `${updatedSetting.title} has been ${updatedSetting.value ? "enabled" : "disabled"}.`,
          });
        }

        return newSettings;
      });
    }
  };

  // Data setting toggle function removed

  // Security setting toggle function removed

  // Location precision functions removed

  // Message timer and encryption functions removed

  // Data export function removed

  // Handle account deletion with password verification
  const handleDeleteAccount = async () => {
    if (!confirmCode) {
      toast({
        title: "Verification failed",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDataAction("delete");

      // Start the progress bar animation
      const interval = setInterval(() => {
        setAccountDeleteProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95; // Hold at 95% until API call completes
          }
          return prev + 5;
        });
      }, 200);

      // Call the API to delete the account with password verification
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          password: confirmCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        clearInterval(interval);
        setDataAction(null);
        setAccountDeleteProgress(0);

        toast({
          title: "Account deletion failed",
          description:
            errorData.message ||
            "Password verification failed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Set progress to 100% when API call completes successfully
      setAccountDeleteProgress(100);

      // Show farewell screen that transitions directly to auth screen
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
      setDataAction(null);
      setAccountDeleteProgress(0);
    }
  };

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
              Privacy & Data Controls
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pb-8">
          <div className="space-y-4">
            {/* Visibility Settings */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              {visibilitySettings.map((setting, index) => (
                <div
                  key={setting.id}
                  className={`${index < visibilitySettings.length - 1 ? "pb-2 mb-2 border-b border-white/10" : ""}`}
                >
                  <div className="flex flex-row items-center justify-between mb-1">
                    <div className="flex items-center">
                      {setting.icon}
                      <Label htmlFor={setting.id} className="ml-2 font-medium">
                        {setting.title}
                        {setting.premium && (
                          <Badge className="ml-2 bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-[10px] py-0 px-1.5">
                            PREMIUM
                          </Badge>
                        )}
                      </Label>
                    </div>
                    <Switch
                      id={setting.id}
                      checked={setting.value}
                      onCheckedChange={() =>
                        toggleVisibilitySetting(setting.id)
                      }
                      className="data-[state=checked]:bg-indigo-600 flex-shrink-0"
                      disabled={setting.premium ?? false}
                    />
                  </div>
                  <p className="text-xs text-white/70 ml-7 line-clamp-2">
                    {setting.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Account Deletion Section */}
            <div className="border border-red-500/30 rounded-lg p-4 bg-gradient-to-r from-red-900/20 to-pink-900/20">
              <div className="flex items-center mb-2">
                <Trash2 className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-md font-medium">
                  Delete Your CHARLéY Account
                </h3>
              </div>

              {dataAction === "delete" ? (
                <div className="space-y-2">
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-red-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${accountDeleteProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-white/70">
                    Deleting account data... {accountDeleteProgress}%
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      className="w-full bg-black/30 border border-red-500/30 rounded-md px-3 py-2 text-xs sm:text-sm text-white placeholder:text-white/40"
                      placeholder="Enter password to confirm"
                    />
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-xs sm:text-sm"
                    onClick={handleDeleteAccount}
                    disabled={!confirmCode}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Permanently Delete Account
                  </Button>
                </>
              )}
            </div>

            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="ml-2">
                  <h4 className="text-sm font-medium text-red-300">
                    Important
                  </h4>
                  <p className="text-xs text-white/70 mt-1">
                    Account deletion is permanent. All your data including
                    messages, matches, and profile information will be
                    completely removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-4"></div>
      </DialogContent>
    </Dialog>
  );
}
