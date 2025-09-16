import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isUnder14 } from "@/lib/age-utils";
import { AgeRestrictionBlock } from "@/components/auth/age-restriction-block";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
// Optimized imports - import only what's needed
import {
  Phone,
  ArrowRight,
  ArrowLeft,
  Camera,
  Calendar,
  User as UserIcon,
  Mail,
  Flag,
  MapPin,
  Lock,
  Info,
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  IdCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import adinkraSymbol from "../assets/Charley.png";
import { PhoneInput } from "@/components/ui/phone-input";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@/hooks/use-language";
import { useNationalityAwareTranslate } from "@/hooks/use-nationality-aware-translate";
import { useAppMode } from "@/hooks/use-app-mode";
// Import auth validation schemas and utilities
import {
  phoneSchema,
  verificationSchema,
  passwordSchema,
  emailSchema,
  profileStep1Schema,
  profileStep2Schema,
  profileStep3Schema,
  idVerificationSchema,
  forgotPasswordSchema,
  resetCodeSchema,
  resetPasswordSchema,
  checkEmailExists,
  formatDateString,
  generateUsername,
  type PhoneFormValues,
  type VerificationFormValues,
  type PasswordFormValues,
  type EmailFormValues,
  type ProfileStep1Values,
  type ProfileStep2Values,
  type ProfileStep3Values,
  type IdVerificationValues,
  type ForgotPasswordValues,
  type ResetCodeValues,
  type ResetPasswordValues,
} from "@/lib/auth-validation";

// Avatar has been removed, import only terms component
import { TermsAndConditions } from "@/components/auth/terms-and-conditions";
import { PrivacyPolicyDialog } from "@/components/settings/privacy-policy-dialog";
import { TermsOfServiceDialog } from "@/components/settings/terms-of-service-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { insertUserSchema } from "@shared/schema";
import { CityInput } from "@/components/ui/city-input";
import { TribeSelect } from "@/components/ui/tribe-select";
import { LivePhotoCapture } from "@/components/verification/live-photo-capture";

// Schema definitions moved to auth-validation.ts module

// Helper function to translate form errors
const translateFormError = (
  error: string,
  translate: (key: string) => string,
): string => {
  const errorMap: Record<string, string> = {
    "Password must be at least 8 characters": translate(
      "auth.passwordMinEightChars",
    ),
    "Passwords don't match": translate("auth.passwordsDontMatchValidation"),
    "Please enter a valid phone number": translate(
      "auth.pleaseEnterPhoneNumber",
    ),
    "Phone number must include country code (e.g., +1...)": translate(
      "auth.invalidCountryCode",
    ),
    "Verification code must be 7 digits": translate(
      "auth.verificationCodeMustBeSeven",
    ),
    "Please enter a valid email format": translate(
      "auth.pleaseEnterValidEmail",
    ),
    "This email address does not exist or cannot receive emails": translate(
      "auth.enterValidDeliverableEmail",
    ),
    "Please enter a valid email address": translate(
      "auth.pleaseEnterValidEmail",
    ),
    "Reset code must be 7 digits": translate("auth.resetCodeMustBeSeven"),
    "Full name is required": translate("auth.fullNameRequired"),
    "Date of birth is required": translate("auth.dateOfBirthRequired"),
    "Please enter a valid date": translate("auth.pleaseEnterValidDate"),
    "Gender is required": translate("auth.genderRequired"),
    "City and country are required": translate("auth.cityAndCountryRequired"),
    "Please upload at least one photo": translate("auth.pleaseUploadPhoto"),
  };

  return errorMap[error] || error;
};

// Lightweight strength evaluation to avoid heavy work on each keystroke
function getPasswordStrengthLevel(password: string): 1 | 2 | 3 | 4 {
  if (!password) return 1;
  let level: 1 | 2 | 3 | 4 = 1;
  if (password.length >= 8) level = 2;
  if (password.length >= 10) level = 3;
  if (password.length >= 12) level = 4;
  return level;
}

const PasswordStrengthBar = memo(function PasswordStrengthBar({
  value,
}: {
  value: string;
}) {
  const level = getPasswordStrengthLevel(value);
  const widthClass =
    level === 1
      ? "w-1/4 bg-red-500"
      : level === 2
        ? "w-2/4 bg-yellow-500"
        : level === 3
          ? "w-3/4 bg-blue-500"
          : "w-full bg-green-500";
  return (
    <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-200 ${widthClass}`}
      />
    </div>
  );
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { translate } = useNationalityAwareTranslate();
  // Use translate function from nationality-aware hook

  // Interactive parallax for hero mesh
  const handleHeroPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.setProperty("--mx", String(mx));
    e.currentTarget.style.setProperty("--my", String(my));
  };
  const resetHeroParallax = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };

  // Get translated gender values at component level to avoid hook call in event handlers
  const maleText = translate("auth.male");
  const femaleText = translate("auth.female");

  // States for phone verification flow
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [phoneSendingCode, setPhoneSendingCode] = useState(false);
  const [phoneVerifyingCode, setPhoneVerifyingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [phoneBlockedMessage, setPhoneBlockedMessage] = useState<string | null>(
    null,
  );

  // States for profile creation flow
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userIsNew, setUserIsNew] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [profileStep, setProfileStep] = useState(1);
  const [profileData, setProfileData] = useState<Record<string, any>>({});

  // States for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // State to force re-renders for tribe selection
  const [immediateRender, setImmediateRender] = useState(0);

  // States for password reset flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetPasswordSending, setResetPasswordSending] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // States for email verification
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerificationResult, setEmailVerificationResult] = useState<{
    isValid: boolean;
    reason?: string;
    confidence: "high" | "medium" | "low";
  } | null>(null);

  // States for 7-digit code password reset flow
  const [showResetCodeEntry, setShowResetCodeEntry] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetCodeVerifying, setResetCodeVerifying] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [sentResetCode, setSentResetCode] = useState<string | null>(null);

  // State for login button processing
  const [isSigningIn, setIsSigningIn] = useState(false);

  // States for legal dialogs matching settings page functionality
  const [privacyPolicyDialogOpen, setPrivacyPolicyDialogOpen] = useState(false);
  const [termsOfServiceDialogOpen, setTermsOfServiceDialogOpen] =
    useState(false);

  // State for live camera capture
  const [showLiveCamera, setShowLiveCamera] = useState(false);

  // State for age restriction blocking
  const [showAgeRestrictionBlock, setShowAgeRestrictionBlock] = useState(false);
  const [blockedPhoneNumber, setBlockedPhoneNumber] = useState<string>("");
  const [blockedUserFullName, setBlockedUserFullName] = useState<string>("");
  const [blockedUserEmail, setBlockedUserEmail] = useState<string>("");

  // Avatar functionality removed from auth page

  // Redirect if user is already logged in
  useEffect(() => {
    // Don't immediately redirect if direct redirect flag is set
    // This prevents conflicts with the setLocation('/app-selection') call
    const directRedirect = sessionStorage.getItem("directRedirect");

    if (user && !showProfileCreation && !directRedirect) {
      setLocation("/app-selection");
    }
  }, [user, setLocation, showProfileCreation]);

  // Phone verification form
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  // Verification code form
  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  // Password form with real-time validation
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur", // Validate on blur to reduce per-keystroke work
    defaultValues: {
      password: "",
      ...(typeof window !== "undefined" &&
        window.location.pathname === "/auth" && { confirmPassword: "" }),
    },
  });

  // Email form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Re-use the imported function
  // No need to redefine checkEmailExists as we imported it from auth-validation.ts

  // Profile step 1 form
  const profileStep1Form = useForm<ProfileStep1Values>({
    resolver: zodResolver(profileStep1Schema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  // Profile step 2 form
  const profileStep2Form = useForm<ProfileStep2Values>({
    resolver: zodResolver(profileStep2Schema),
    defaultValues: {
      residence: "",
      tribe: "",
      secondaryTribe: "",
    },
  });

  // Profile step 3 form
  const profileStep3Form = useForm<ProfileStep3Values>({
    resolver: zodResolver(profileStep3Schema),
    defaultValues: {
      photoUrl: "",
      photoUrl2: "",
    },
  });

  // Keep Step 3 primary photo in sync with server/user primary when step loads
  useEffect(() => {
    if (profileStep !== 3) return;
    const cachedUser: any = queryClient.getQueryData(["/api/user"]);
    const cachedPhotos: any[] | undefined = queryClient.getQueryData([
      `/api/photos/${cachedUser?.id}`,
    ]) as any;
    const serverPrimary =
      cachedPhotos?.find((p: any) => p.isPrimary)?.photoUrl ||
      cachedUser?.photoUrl;
    if (serverPrimary) {
      profileStep3Form.setValue("photoUrl", serverPrimary, {
        shouldDirty: false,
      });
    }
  }, [profileStep]);

  // ID Verification form - Step 4 (optional)
  const idVerificationForm = useForm<IdVerificationValues>({
    resolver: zodResolver(idVerificationSchema),
    defaultValues: {
      idVerificationPhoto: "",
      liveVerificationPhoto: "",
      skipVerification: false,
    },
  });

  // Avatar Creation step has been removed

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Reset code verification form
  const resetCodeForm = useForm<ResetCodeValues>({
    resolver: zodResolver(resetCodeSchema),
    defaultValues: {
      resetCode: "",
    },
  });

  // Reset password form with real-time validation
  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    try {
      setPhoneSendingCode(true);
      setPhoneNumber(data.phoneNumber);
      setPhoneBlockedMessage(null); // Clear any previous blocked messages

      const response = await apiRequest("/api/verify/phone/send", {
        method: "POST",
        data: data,
      });
      const responseData = await response.json();

      // Check if the server indicated to skip verification (two-factor auth disabled)
      if (responseData.skipVerification) {
        // Handle returning user with 2FA disabled - go directly to password step
        setUserIsNew(false); // Mark as returning user
        setShowPasswordStep(true);

        // Save returned user for later use after password verification
        setProfileData({
          ...profileData,
          userId: responseData.user.id,
          username: responseData.user.username,
        });

        // Removed disruptive "Phone Number Recognized" toast for smoother UX
      } else {
        // Save the verification code to display it (in development only)
        setVerificationCode(responseData.code);

        setPhoneVerificationSent(true);

        // Switch to verification code form
        verificationForm.reset({ code: "" });

        toast({
          title: translate("auth.verificationCodeSent"),
          description: translate("auth.checkCodeBelow"),
        });
      }
    } catch (error) {
      // Check if this is a blocked phone number error
      if (
        error instanceof Error &&
        error.message.includes(
          "This phone number cannot be used for registration",
        )
      ) {
        setPhoneBlockedMessage(error.message);
      } else {
        toast({
          title: translate("auth.errorSendingCode"),
          description:
            error instanceof Error
              ? error.message
              : translate("common.unknownError"),
          variant: "destructive",
        });
      }
    } finally {
      setPhoneSendingCode(false);
    }
  };

  const onVerificationSubmit = async (data: VerificationFormValues) => {
    try {
      setPhoneVerifyingCode(true);
      const phoneNumberValue = phoneForm.getValues().phoneNumber;

      const response = await apiRequest("/api/verify/phone/check", {
        method: "POST",
        data: {
          phoneNumber: phoneNumberValue,
          code: data.code,
        },
      });

      const responseData = await response.json();

      if (responseData.user) {
        // Store the user temporarily (don't log in yet)
        // Need password verification first
        setPhoneNumber(phoneForm.getValues().phoneNumber);
        setUserIsNew(false); // Mark as returning user
        setShowPasswordStep(true);
        setVerificationCode(null);
        setPhoneVerificationSent(false);

        // Save returned user for later use after password verification
        setProfileData({
          ...profileData,
          userId: responseData.user.id,
          username: responseData.user.username,
        });

        // Removed disruptive verification toast for smoother UX
      } else {
        // New user - route to password creation
        setUserIsNew(true);
        setShowPasswordStep(true);
        setVerificationCode(null);
        setPhoneVerificationSent(false);

        // Removed disruptive verification toast for smoother UX
      }
    } catch (error) {
      toast({
        title: translate("auth.invalidVerificationCode"),
        description:
          error instanceof Error
            ? error.message
            : translate("auth.pleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setPhoneVerifyingCode(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      // Set processing state for returning users
      if (!userIsNew) {
        setIsSigningIn(true);
      }

      // Different behavior based on whether this is a new or returning user
      if (userIsNew) {
        // Check if there are errors in the email form
        const email = emailForm.getValues().email;

        if (!email) {
          emailForm.setError("email", {
            type: "required",
            message: "Email is required",
          });
          return;
        }

        // Check if the email is valid using a proper email regex
        // This regex is more accurate than simple validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          emailForm.setError("email", {
            type: "manual",
            message: "Please enter a valid email address",
          });
          toast({
            title: "Invalid email",
            description: "Please provide a valid email address",
            variant: "destructive",
          });
          return;
        }

        // Clear any previous validation errors since the email format is valid
        emailForm.clearErrors("email");

        // Check if email already exists - only if the email format is valid
        const normalizedEmail = email.trim().toLowerCase();
        try {
          const emailExists = await checkEmailExists(normalizedEmail);
          if (emailExists) {
            emailForm.setError("email", {
              type: "manual",
              message:
                "This email is already registered with another account. Please use a different email or sign in with your existing account.",
            });
            toast({
              title: "Email already in use",
              description:
                "This email is already registered. Please use a different email or sign in with your existing account.",
              variant: "destructive",
            });
            return;
          }

          // Update form with normalized email
          emailForm.setValue("email", normalizedEmail);
        } catch (error) {
          console.error("Error checking email:", error);
          toast({
            title: "Unable to verify email",
            description: "Please check your internet connection and try again.",
            variant: "destructive",
          });
          return; // Block the flow if we can't verify email uniqueness
        }

        // New user - Save password and continue to profile creation
        setProfileData({
          ...profileData,
          password: data.password,
          phoneNumber,
        });

        // Move to email step
        setShowPasswordStep(false);
        setShowProfileCreation(true);
        setProfileStep(1);
      } else {
        // Set a direct redirect flag for a smooth transition
        sessionStorage.setItem("directRedirect", "true");

        // Returning user - Try to login with phone number and password
        const response = await apiRequest("/api/login", {
          method: "POST",
          data: {
            email: phoneNumber, // Use the phone number that was verified
            password: data.password,
          },
        });

        const userData = await response.json();

        // Login successful - removed debug logging for performance

        // Login successful - update user in context
        queryClient.setQueryData(["/api/user"], userData);

        // Removed disruptive welcome back toast for smoother UX

        // Apply immediate fade-out animation before redirecting
        const passwordContainer = document.querySelector(
          ".password-step-container",
        );
        if (passwordContainer) {
          passwordContainer.classList.add("animate-fade-out");
        }

        // CRITICAL FIX: Wait for React Query cache to fully update before routing decisions
        // This prevents race conditions where userData might be incomplete
        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        // Get the fully updated user data from cache after invalidation
        const completeUserData = await queryClient.fetchQuery({
          queryKey: ["/api/user"],
          queryFn: async () => {
            const response = await apiRequest("/api/user");
            return response.json();
          },
          staleTime: 0, // Force fresh fetch
        });

        // Removed excessive debug logging for performance optimization

        // Check if nationality selection should be shown after login
        const showNationalitySelection =
          localStorage.getItem(
            `show_nationality_selection_${completeUserData.id}`,
          ) === "true";

        // Set a special flag to indicate we're coming from login if nationality selection is enabled
        if (showNationalitySelection) {
          sessionStorage.removeItem("nationalitySelectionCompleted");
          sessionStorage.setItem("showingNationalityAfterLogin", "true");
        }

        // Use optimized routing with immediate navigation - removed artificial delays
        if (
          !completeUserData?.showAppModeSelection &&
          completeUserData?.showNationalitySelection
        ) {
          setLocation("/nationality");
        } else if (completeUserData?.showAppModeSelection) {
          setLocation("/app-selection");
        } else if (
          !completeUserData?.showAppModeSelection &&
          !completeUserData?.showNationalitySelection
        ) {
          // Both toggles are false, use lastUsedApp from DB
          try {
            sessionStorage.setItem("directAppRedirect", "true");
          } catch (e) {
            // Silent fail for storage issues
          }

          const lastUsedApp = completeUserData.lastUsedApp || "MEET";
          let targetUrl = "/";
          switch (lastUsedApp.toUpperCase()) {
            case "MEET":
              targetUrl = "/";
              break;
            case "HEAT":
              targetUrl = "/heat";
              break;
            case "SUITE":
              targetUrl = "/suite";
              break;
            default:
              targetUrl = "/";
          }
          setLocation(targetUrl);
        } else {
          // Fallback to app selection
          setLocation("/app-selection");
        }

        // Clean up session flags immediately
        sessionStorage.removeItem("directRedirect");
        sessionStorage.removeItem("directAppRedirect");
      }
    } catch (error) {
      // Clear direct redirect flag if login fails
      sessionStorage.removeItem("directRedirect");

      // Reset signing in state
      setIsSigningIn(false);

      // Handle login error
      toast({
        title: "Authentication failed",
        description: "Invalid password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onProfileStep1Submit = async (data: ProfileStep1Values) => {
    // Save data and move to next step
    // Normalize gender to language-agnostic keys for backend (M/F)
    const normalizedGender = (() => {
      const val = (data.gender || "").toLowerCase().trim();
      if (
        val === "m" ||
        val === "male" ||
        val === (maleText || "").toLowerCase().trim()
      )
        return "M";
      if (
        val === "f" ||
        val === "female" ||
        val === (femaleText || "").toLowerCase().trim()
      )
        return "F";
      return ""; // keep empty to trigger validation if somehow unmapped
    })();

    setProfileData({
      ...profileData,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      gender: normalizedGender,
    });

    // Optimized transition - removed animation delays for faster UX
    setProfileStep(2);
  };

  const onProfileStep2Submit = async (data: ProfileStep2Values) => {
    // Save data and move to next step
    setProfileData({
      ...profileData,
      location: data.residence,
      ethnicity: data.tribe,
      secondaryTribe: data.secondaryTribe || "",
    });

    // Optimized transition - removed animation delays for faster UX
    setProfileStep(3);
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordValues) => {
    try {
      setResetPasswordSending(true);

      // Make API request to send 7-digit reset code
      const response = await apiRequest("/api/password/send-reset-code", {
        method: "POST",
        data: {
          email: data.email,
        },
      });

      const responseData = await response.json();

      if (responseData.success) {
        // Store email for code verification
        setForgotPasswordEmail(data.email);
        setResetCodeSent(true);
        setShowResetCodeEntry(true);
        setShowForgotPassword(false);

        toast({
          title: "Reset Code Sent",
          description: "Please check your email for the 7-digit reset code.",
        });
      } else {
        toast({
          title: "Error",
          description: responseData.message || "Failed to send reset code",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetPasswordSending(false);
    }
  };

  const onResetCodeSubmit = async (data: ResetCodeValues) => {
    try {
      setResetCodeVerifying(true);

      // Verify the 7-digit reset code
      const response = await apiRequest("/api/password/verify-reset-code", {
        method: "POST",
        data: {
          email: forgotPasswordEmail,
          resetCode: data.resetCode,
        },
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.success) {
          // Code verified, save the reset code and proceed to password reset
          setSentResetCode(data.resetCode); // Save the verified reset code
          setShowResetCodeEntry(false);
          setShowPasswordStep(false); // Ensure main password step is hidden
          setShowForgotPassword(false); // Ensure forgot password is hidden
          setShowResetPasswordForm(true);

          toast({
            title: "Code Verified",
            description: "Please enter your new password.",
          });
        } else {
          toast({
            title: "Invalid Code",
            description:
              responseData.message || "The reset code is invalid or expired.",
            variant: "destructive",
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Invalid Code",
          description:
            errorData.message || "The reset code is invalid or expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Reset code verification error:", error);
      toast({
        title: "Error",
        description: "Failed to verify reset code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetCodeVerifying(false);
    }
  };

  const onResetPasswordSubmit = async (data: ResetPasswordValues) => {
    try {
      // Make API request to reset password with verified code
      const response = await apiRequest("/api/password/reset-with-code", {
        method: "POST",
        data: {
          email: forgotPasswordEmail,
          resetCode: sentResetCode,
          newPassword: data.password,
        },
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.success) {
          // Reset all the password reset states
          setShowResetPasswordForm(false);
          setResetCodeSent(false);
          setShowResetCodeEntry(false);
          setForgotPasswordEmail("");
          setSentResetCode(null); // Clear the saved reset code

          toast({
            title: "Password Reset Successfully",
            description: "Your password has been updated. Please log in.",
          });

          // Clear forms
          forgotPasswordForm.reset();
          resetPasswordForm.reset();
          resetCodeForm.reset();

          // Show the phone verification step again
          setShowPasswordStep(false);
          setPhoneVerificationSent(true);
        } else {
          toast({
            title: "Password Reset Failed",
            description: responseData.message || "Failed to reset password",
            variant: "destructive",
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Error Resetting Password",
          description: errorData.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: translate("auth.errorResettingPassword"),
        description:
          error instanceof Error
            ? error.message
            : translate("common.unknownError"),
        variant: "destructive",
      });
    }
  };

  // State to track submission loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Avatar creation step has been removed

  // Handler for terms and conditions acceptance (final step)
  const handleTermsComplete = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) return;

    // Start loading state
    setIsSubmitting(true);

    try {
      // Apply fade-out animation before submitting
      const stepContainer = document.querySelector(".profile-step-container");
      if (stepContainer) {
        stepContainer.classList.add("animate-fade-out");
      }

      // Create a separate object without the dateOfBirth field for safer processing
      const { dateOfBirth: rawDateOfBirth, ...otherProfileData } = profileData;

      // Simplified date handling - directly format raw date string
      let dateOfBirthString = undefined;
      if (rawDateOfBirth && rawDateOfBirth.trim() !== "") {
        // Simpler date string creation - avoids expensive Date object operations
        dateOfBirthString = `${rawDateOfBirth.trim()}T00:00:00.000Z`;
      }

      // Check age restriction BEFORE creating account
      if (dateOfBirthString && isUnder14(dateOfBirthString)) {
        // Get user information for blocking
        const phoneNumber = phoneForm.getValues().phoneNumber;
        const fullName = profileStep1Form.getValues().fullName;
        const email = emailForm.getValues().email;
        setBlockedPhoneNumber(phoneNumber);
        setBlockedUserFullName(fullName);
        setBlockedUserEmail(email);

        console.log(
          `[AGE-COMPLIANCE] User under 14 detected, blocking phone number: ${phoneNumber} for ${fullName}`,
        );

        try {
          // Block the phone number immediately with user information
          await apiRequest("/api/phone/block", {
            method: "POST",
            data: {
              phoneNumber: phoneNumber,
              fullName: fullName,
              email: email,
              reason: "User under 14 years old - age verification failed",
              metadata: JSON.stringify({
                dateOfBirth: dateOfBirthString,
                blockedAt: new Date().toISOString(),
                userAgent: navigator.userAgent,
              }),
            },
          });

          console.log(
            `[AGE-COMPLIANCE] Successfully blocked phone number: ${phoneNumber}`,
          );
        } catch (blockError) {
          console.error(
            `[AGE-COMPLIANCE] Failed to block phone number: ${phoneNumber}`,
            blockError,
          );
          // Continue with age restriction screen even if blocking fails
        }

        // Show age restriction block screen
        setShowAgeRestrictionBlock(true);
        setIsSubmitting(false);
        return;
      }

      // CRITICAL: Final email uniqueness check before account creation
      const email = emailForm.getValues().email.trim().toLowerCase();
      try {
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          toast({
            title: "Email already registered",
            description:
              "This email is already registered with another account. Please go back and use a different email address.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error("Critical error during final email check:", error);
        toast({
          title: "Unable to verify email",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create the user data object with minimal processing
      const finalUserData = {
        ...otherProfileData,
        username: `user_${Date.now().toString(36)}`, // More efficient random username
        email: email,
        verifiedByPhone: true,
        // Avatar fields have been removed
        ...(dateOfBirthString ? { dateOfBirth: dateOfBirthString } : {}),
      };

      // Create new user with complete profile
      console.log(
        "[PROFILE-COMPLETION] Sending registration request with data:",
        {
          ...finalUserData,
          password: "[REDACTED]", // Don't log password
        },
      );

      const response = await apiRequest("/api/register", {
        method: "POST",
        data: finalUserData,
      });

      console.log(
        "[PROFILE-COMPLETION] Registration response status:",
        response.status,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[PROFILE-COMPLETION] Registration failed with status:",
          response.status,
          "Error:",
          errorText,
        );
        throw new Error(
          `Registration failed: ${response.status} - ${errorText}`,
        );
      }

      const userData = await response.json();
      console.log(
        "[PROFILE-COMPLETION] Registration successful for user:",
        userData.id,
      );

      // Update the authenticated user in React Query cache
      queryClient.setQueryData(["/api/user"], userData);

      // Send welcome email asynchronously (non-blocking)
      apiRequest("/api/welcome/send", {
        method: "POST",
        data: {
          name: userData.fullName,
          email: userData.email,
          dateOfBirth: userData.dateOfBirth,
        },
      })
        .then((emailResponse) => {
          if (emailResponse.ok) {
            console.log("[WELCOME-EMAIL] Welcome email sent successfully");
          } else {
            console.warn(
              "[WELCOME-EMAIL] Failed to send welcome email, but user registration completed",
            );
          }
        })
        .catch((emailError) => {
          console.warn(
            "[WELCOME-EMAIL] Error sending welcome email (non-blocking):",
            emailError,
          );
        });

      // Redirect efficiently without toast notification

      // Set transition flag and navigate immediately for faster UX
      sessionStorage.setItem("profileCompleted", "true");
      setLocation("/app-selection");
    } catch (error) {
      console.error("Profile creation error:", error);
      toast({
        title: translate("auth.errorCreatingProfile"),
        description:
          error instanceof Error
            ? error.message
            : translate("common.unknownError"),
        variant: "destructive",
      });
    } finally {
      // Reset loading state
      setIsSubmitting(false);
    }
  };

  // Optimized profile submission function
  const onProfileStep3Submit = async (data: ProfileStep3Values) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;

    // Start loading state
    setIsSubmitting(true);

    // Save photo data and move to terms and conditions (avatar step removed)
    try {
      // Validate photo submission
      if (!data.photoUrl) {
        toast({
          title: translate("auth.photoRequired"),
          description: translate("auth.uploadPhotoToContinue"),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Update profile data with photos
      setProfileData({
        ...profileData,
        photoUrl: data.photoUrl,
        photoUrl2: data.photoUrl2 || "",
      });

      // Persist primary photo server-side and sync caches so MEET page matches
      try {
        const cachedUser: any = queryClient.getQueryData(["/api/user"]);
        // Fetch photos if not cached
        let cachedPhotos: any[] | undefined = queryClient.getQueryData([
          `/api/photos/${cachedUser?.id}`,
        ]) as any;
        if (!cachedPhotos) {
          const resp = await apiRequest(`/api/photos/${cachedUser?.id}`);
          cachedPhotos = await resp.json();
        }
        const safePhotos: any[] = Array.isArray(cachedPhotos)
          ? cachedPhotos
          : [];
        const primaryRecord = safePhotos.find(
          (p: any) => p.photoUrl === data.photoUrl,
        );
        if (primaryRecord?.id) {
          await apiRequest(`/api/photos/${primaryRecord.id}/primary`, {
            method: "PATCH",
          });
          queryClient.setQueryData(
            [`/api/photos/${cachedUser?.id}`],
            safePhotos.map((p: any) => ({
              ...p,
              isPrimary: p.id === primaryRecord.id,
            })),
          );
          queryClient.setQueryData(["/api/user"], {
            ...(cachedUser || {}),
            photoUrl: data.photoUrl,
          });
        }
      } catch (_) {
        // Non-blocking failure; UI continues
      }

      // Optimized transition - removed animation delays for faster UX
      setProfileStep(4); // Move to ID verification step

      setIsSubmitting(false);
      return;
    } catch (error) {
      toast({
        title: "Error saving photo",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // This code will not be reached in the modified flow
    // but kept for reference during development
    /* 
    const { dateOfBirth: rawDateOfBirth, ...otherProfileData } = profileData;

    // Simplified date handling - directly format raw date string
    let dateOfBirthString = undefined;
    if (rawDateOfBirth && rawDateOfBirth.trim() !== '') {
      // Simpler date string creation - avoids expensive Date object operations
      dateOfBirthString = `${rawDateOfBirth.trim()}T00:00:00.000Z`;
    }

    // Create the user data object with minimal processing
    const finalUserData = {
      ...otherProfileData,
      photoUrl: data.photoUrl,
      photoUrl2: data.photoUrl2 || undefined,
      username: `user_${Date.now().toString(36)}`, // More efficient random username
      email: emailForm.getValues().email,
      verifiedByPhone: true,
      ...(dateOfBirthString ? { dateOfBirth: dateOfBirthString } : {})
    };

    // Create user in the background (don't await logging)
    if (process.env.NODE_ENV !== 'production') {
      console.log("Sending profile data");
    }

    // Create new user with complete profile
    const response = await apiRequest("/api/register", {
      method: "POST",
      data: finalUserData
    });
    const userData = await response.json();

    // Update the authenticated user in React Query cache
    queryClient.setQueryData(["/api/user"], userData);

    // Apply immediate fade-out animation for visual feedback
    const profileContainer = document.querySelector('.profile-step-container');
    if (profileContainer) {
      profileContainer.classList.add('animate-fade-out');
    }

    // Show toast and redirect more efficiently
    toast({
      title: "Profile created successfully!",
      description: "Welcome to CHARLEY",
    });

    // Set a transition flag for immediate visual feedback
    sessionStorage.setItem('profileCompleted', 'true');

    // Use a minimal timeout to allow the fade-out animation to start
    // This creates a smoother visual experience
    setTimeout(() => {
      // Redirect to app selection page instead of home page
      setLocation("/app-selection");
    }, 50);
    */
  };

  // ID Verification step submit handler - Step 4 (optional)
  const onIdVerificationSubmit = async (data: IdVerificationValues) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;

    // Start loading state
    setIsSubmitting(true);

    try {
      // Save ID verification data and move to terms and conditions
      setProfileData({
        ...profileData,
        idVerificationPhoto: data.idVerificationPhoto || null,
        liveVerificationPhoto: data.liveVerificationPhoto || null,
        skipVerification: data.skipVerification || false,
      });

      // Optimized transition - removed animation delays for faster UX
      setProfileStep(5); // Move to terms and conditions step

      setIsSubmitting(false);
      return;
    } catch (error) {
      toast({
        title: "Error saving ID verification",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
  };

  // Early return for age restriction block
  if (showAgeRestrictionBlock) {
    return (
      <AgeRestrictionBlock
        phoneNumber={blockedPhoneNumber}
        fullName={blockedUserFullName}
        email={blockedUserEmail}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom, #7e22ce, #9333EA 40%, #fb923c 80%, white 120%)",
      }}
    >
      {/* Hero section with CHARLEY branding */}
      <div
        className="pt-6 pb-20 flex-1 flex items-center justify-center relative overflow-hidden"
        onMouseMove={handleHeroPointerMove}
        onMouseLeave={resetHeroParallax}
      >
        {/* Starfield (behind mesh layers) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mobile-safe-blend"
          style={{
            maskImage:
              "linear-gradient(to bottom, black 0%, black 42%, transparent 60%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 42%, transparent 60%)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[48%]"
            style={{
              backgroundImage:
                "radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.35) 50%, transparent 51%),\
                 radial-gradient(1.5px 1.5px at 30% 35%, rgba(255,255,255,0.35) 50%, transparent 51%),\
                 radial-gradient(1.2px 1.2px at 55% 15%, rgba(255,255,255,0.3) 50%, transparent 51%),\
                 radial-gradient(1.8px 1.8px at 80% 28%, rgba(255,255,255,0.35) 50%, transparent 51%),\
                 radial-gradient(1.4px 1.4px at 65% 40%, rgba(255,255,255,0.3) 50%, transparent 51%),\
                 radial-gradient(1.6px 1.6px at 20% 8%, rgba(255,255,255,0.35) 50%, transparent 51%)",
              animation: "star-drift 40s linear infinite",
              opacity: 0.5,
            }}
          />
        </div>
        {/* Back-compat handler name alias (avoid refactor elsewhere) */}
        {false && handleHeroPointerMove}
        {/* Subtle animated mesh overlay (only in purple band) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "linear-gradient(to bottom, black 0%, black 42%, transparent 60%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 42%, transparent 60%)",
          }}
        >
          {/* Horizontal lines */}
          <div
            className="absolute inset-x-0 top-0 h-[48%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient( to bottom, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.0) 1px, rgba(255,255,255,0.0) 12px )",
              transform:
                "translate3d(calc(var(--mx,0)*10px), calc(var(--my,0)*4px), 0)",
            }}
          />
          {/* Vertical lines with gentle drift */}
          <div
            className="absolute inset-x-0 top-0 h-[48%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient( to right, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.0) 1px, rgba(255,255,255,0.0) 12px )",
              animation: "mesh-drift 16s linear infinite",
              transform:
                "translate3d(calc(var(--mx,0)*-8px), calc(var(--my,0)*6px), 0)",
            }}
          />
          {/* Diagonal mesh layer for added depth */}
          <div
            className="absolute inset-x-0 top-0 h-[50%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.0) 1px, rgba(255,255,255,0.0) 14px)",
              mixBlendMode: "overlay",
              animation: "mesh-sway 18s ease-in-out infinite",
              transform:
                "translate3d(calc(var(--mx,0)*6px), calc(var(--my,0)*-6px), 0)",
            }}
          />
          {/* Soft glow nodes at grid intersections */}
          <div className="absolute inset-0 h-[48%]">
            <div
              className="absolute w-24 h-24 rounded-full bg-white/10 blur-0 sm:blur-3xl sm:animate-[sparkle_3.5s_ease-in-out_infinite]"
              style={{ top: "12%", left: "18%", animationDelay: "0.2s" }}
            />
            <div
              className="absolute w-28 h-28 rounded-full bg-fuchsia-300/20 blur-0 sm:blur-3xl sm:animate-[sparkle_4.2s_ease-in-out_infinite]"
              style={{ top: "22%", left: "68%", animationDelay: "0.9s" }}
            />
            <div
              className="absolute w-20 h-20 rounded-full bg-amber-200/20 blur-0 sm:blur-3xl sm:animate-[sparkle_5s_ease-in-out_infinite]"
              style={{ top: "34%", left: "42%", animationDelay: "0.5s" }}
            />
            <div
              className="absolute w-16 h-16 rounded-full bg-cyan-200/20 blur-0 sm:blur-3xl sm:animate-[sparkle_4.8s_ease-in-out_infinite]"
              style={{ top: "8%", left: "50%", animationDelay: "1.2s" }}
            />
          </div>
        </div>

        <div className="text-center z-10 max-w-[90vw]">
          <div className="flex flex-col items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 sm:w-24 sm:h-24 shadow-md rounded-full gpu">
              <img
                src={adinkraSymbol}
                alt="CHARLEY Logo"
                className="w-full h-full object-contain gpu"
                style={{
                  animation: "logo-spin 4s linear infinite",
                }}
              />
            </div>
            <div
              className="app-title max-w-full px-2 mx-auto flex justify-center gpu"
              style={{
                maxWidth: "90%",
                lineHeight: "1.1",
                paddingBottom: "clamp(12px, 3vw, 24px)",
                transform: "translateX(-4px)",
              }}
            >
              {/* Background gradient carrier to avoid animating background-position on glyphs */}
              <span
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{ display: "none" }}
              />
              {"CHARLEY".split("").map((letter, i) => (
                <span
                  key={i}
                  className="font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl inline-block"
                  style={{
                    fontFamily: "'Arial Black', sans-serif",
                    letterSpacing: "-2px",
                    background:
                      "linear-gradient(to bottom, #fff2cc, #ffd700, #ff8c42, #cc7a00, #8b4513)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "400% 400%",
                    /* Only transform animation on letters for mobile stability */
                    animation: `letter-bounce 2s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s, ${i * 0.15}s`,
                    textShadow: `
                      1px 1px 0 #cc9900,
                      2px 2px 0 #b88600,
                      3px 3px 0 #a67300,
                      4px 4px 0 #946000,
                      5px 5px 0 #824d00,
                      6px 6px 0 #703a00,
                      7px 7px 0 #5e2700,
                      8px 8px 15px rgba(0,0,0,0.6),
                      10px 10px 25px rgba(255,140,66,0.4),
                      0 0 30px rgba(255,215,0,0.6),
                      0 0 50px rgba(255,140,66,0.3)
                    `,
                    /* Reduce filter load on mobile; text-shadow already provides glow */
                    filter: "none",
                    transform: "perspective(500px) rotateX(15deg)",
                    transformOrigin: "center bottom",
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
          <p
            className="text-white text-xl sm:text-2xl font-bold mb-2"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
          >
            {translate("app.slogan")}
          </p>
        </div>
      </div>

      {/* Main content container - Sign in or Profile Creation */}
      <div className="px-4 pt-6 pb-6 flex flex-col content-container -mt-8 rounded-t-3xl z-10 bg-white bg-opacity-95">
        {/* App mode selection is now handled by the AppSelectionPage that appears after password verification */}

        {/* Initial Phone Login Button */}
        {!phoneVerificationSent &&
          !showPasswordStep &&
          !showProfileCreation && (
            <div className="flex flex-col items-center justify-center py-6">
              <Button
                onClick={() => setPhoneVerificationSent(true)}
                className="text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg"
                style={{
                  background: "linear-gradient(to right, #7e22ce, #fb923c)",
                  transition: "transform 0.2s",
                }}
              >
                <Phone className="h-5 w-5 mr-2" />
                {translate("auth.signInWithPhoneNumber")}
              </Button>

              <p className="text-xs text-gray-500 mt-6 text-center max-w-[320px]">
                {translate("auth.byTappingSignIn")}{" "}
                <button
                  onClick={() => setTermsOfServiceDialogOpen(true)}
                  className="text-orange-500 hover:text-purple-700 underline bg-transparent border-none cursor-pointer p-0"
                >
                  {translate("auth.terms")}
                </button>
                {translate("auth.learnHowWeProcess")}{" "}
                <button
                  onClick={() => setPrivacyPolicyDialogOpen(true)}
                  className="text-orange-500 hover:text-purple-700 underline bg-transparent border-none cursor-pointer p-0"
                >
                  {translate("auth.privacyPolicy")}
                </button>{" "}
                {translate("auth.and")}{" "}
                <button
                  onClick={() => setPrivacyPolicyDialogOpen(true)}
                  className="text-orange-500 hover:text-purple-700 underline bg-transparent border-none cursor-pointer p-0"
                >
                  {translate("auth.cookiePolicy")}
                </button>
                .
              </p>
            </div>
          )}

        {/* Authentication Steps */}
        <AnimatePresence mode="wait">
          {/* Phone Number Input Form */}
          {phoneVerificationSent &&
            !showPasswordStep &&
            !showProfileCreation &&
            !showForgotPassword &&
            !showResetCodeEntry &&
            !showResetPasswordForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Form {...phoneForm}>
                  <form
                    onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={phoneForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate("auth.phoneNumber")}</FormLabel>
                          <FormControl>
                            <PhoneInput
                              placeholder="123456789"
                              value={field.value}
                              onChange={field.onChange}
                              defaultCountry="us"
                            />
                          </FormControl>
                          {phoneForm.formState.errors.phoneNumber && (
                            <p className="text-sm font-medium text-destructive">
                              {translateFormError(
                                phoneForm.formState.errors.phoneNumber
                                  .message || "",
                                t,
                              )}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Blocked phone number message */}
                    {phoneBlockedMessage && (
                      <div className="text-center text-red-600 text-xs px-4 py-2">
                        {phoneBlockedMessage}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full text-white shadow-md"
                      style={{
                        background:
                          "linear-gradient(to right, #7e22ce, #fb923c)",
                      }}
                      disabled={phoneSendingCode}
                    >
                      {phoneSendingCode
                        ? translate("common.processing")
                        : translate("auth.nextAuthentication")}
                    </Button>
                  </form>
                </Form>

                {/* Verification Code Dialog */}
                {verificationCode && (
                  <Dialog
                    open={!!verificationCode}
                    onOpenChange={(open) => {
                      if (!open) {
                        setVerificationCode(null);
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-0">
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-amber-500">
                          {translate("auth.verificationCode")}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          {translate("auth.enterCodeSentToPhone")}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-2">
                        <div className="bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-100 rounded-lg p-4 mb-4">
                          <p className="text-center text-sm text-purple-900 mb-1">
                            {translate("auth.yourVerificationCodeIs")}
                          </p>
                          <p className="text-center font-mono font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-amber-600">
                            {verificationCode}
                          </p>
                          <p className="text-center text-xs text-gray-500 mt-2">
                            {translate("auth.realAppSmsNote")}
                          </p>
                        </div>

                        <Form {...verificationForm}>
                          <form
                            onSubmit={verificationForm.handleSubmit(
                              onVerificationSubmit,
                            )}
                            className="space-y-3"
                          >
                            <FormField
                              control={verificationForm.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem className="mx-auto">
                                  <FormLabel className="text-center block">
                                    {translate("auth.enterVerificationCode")}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex justify-center">
                                      <InputOTP maxLength={7} {...field}>
                                        <InputOTPGroup>
                                          <InputOTPSlot index={0} />
                                          <InputOTPSlot index={1} />
                                          <InputOTPSlot index={2} />
                                          <InputOTPSlot index={3} />
                                          <InputOTPSlot index={4} />
                                          <InputOTPSlot index={5} />
                                          <InputOTPSlot index={6} />
                                        </InputOTPGroup>
                                      </InputOTP>
                                    </div>
                                  </FormControl>
                                  {verificationForm.formState.errors.code && (
                                    <p className="text-sm font-medium text-destructive text-center">
                                      {translateFormError(
                                        verificationForm.formState.errors.code
                                          .message || "",
                                        t,
                                      )}
                                    </p>
                                  )}
                                </FormItem>
                              )}
                            />
                            <Button
                              type="submit"
                              className="w-full text-white shadow-md"
                              style={{
                                background:
                                  "linear-gradient(to right, #7e22ce, #fb923c)",
                              }}
                              disabled={phoneVerifyingCode}
                            >
                              {phoneVerifyingCode
                                ? translate("auth.verifyingCode")
                                : translate("auth.verifyCode")}
                            </Button>
                          </form>
                        </Form>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <div className="mt-4 text-center">
                  <button
                    className="text-orange-500 hover:text-purple-700 text-sm font-medium hover:underline"
                    onClick={() => {
                      setPhoneVerificationSent(false);
                      setVerificationCode(null);
                    }}
                  >
                    {translate("common.cancel")}
                  </button>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Password Step */}
        <AnimatePresence mode="wait">
          {showPasswordStep &&
            !showProfileCreation &&
            !showForgotPassword &&
            !showResetPasswordForm &&
            !showResetCodeEntry && (
              <motion.div
                className="max-w-md mx-auto w-full password-step-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="auth-title mb-4 text-center">
                  {userIsNew
                    ? translate("auth.createPassword")
                    : translate("auth.enterPassword")}
                </h2>

                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.password")}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder={
                                  userIsNew
                                    ? translate(
                                        "auth.createPasswordPlaceholder",
                                      )
                                    : translate("auth.enterPasswordPlaceholder")
                                }
                                {...field}
                                className={`border-purple-200 focus:border-purple-500 pr-10 ${
                                  userIsNew &&
                                  passwordForm.getValues().confirmPassword &&
                                  field.value &&
                                  passwordForm.getValues().confirmPassword ===
                                    field.value
                                    ? "border-green-500"
                                    : ""
                                }`}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Removed forced confirmPassword re-render to improve typing performance
                                }}
                              />
                              <div
                                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </FormControl>
                          {passwordForm.formState.errors.password && (
                            <p className="text-sm font-medium text-destructive">
                              {translateFormError(
                                passwordForm.formState.errors.password
                                  .message || "",
                                t,
                              )}
                            </p>
                          )}
                          {userIsNew && field.value && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-1 mb-1">
                                <div className="text-xs text-gray-600 font-medium">
                                  {translate("auth.passwordStrength")}:
                                </div>
                                <PasswordStrengthBar value={field.value} />
                                <div className="text-xs font-medium">
                                  {field.value.length < 8
                                    ? translate("auth.passwordWeak")
                                    : field.value.length < 10
                                      ? translate("auth.passwordFair")
                                      : field.value.length < 12
                                        ? translate("auth.passwordGood")
                                        : translate("auth.passwordStrong")}
                                </div>
                              </div>
                              <div className="mt-1 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 pt-0.5">
                                    <i className="h-3 w-3 text-blue-300">ℹ️</i>
                                  </div>
                                  <div className="ml-1.5">
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {translate("auth.passwordStrengthTip")}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Confirm password field - only shown for new users */}
                    {userIsNew && (
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => {
                          const passwordValue =
                            passwordForm.getValues("password");
                          const confirmValue = field.value || "";
                          const passwordsMatch =
                            Boolean(passwordValue) &&
                            confirmValue === passwordValue;
                          const hasConfirmValue = confirmValue.length > 0;

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <Lock className="h-4 w-4 mr-2 text-purple-700" />
                                {translate("auth.confirmPassword")}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    placeholder={translate(
                                      "auth.confirmPasswordPlaceholder",
                                    )}
                                    value={confirmValue}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    disabled={field.disabled}
                                    name={field.name}
                                    ref={field.ref}
                                    className={`border-purple-200 focus:border-purple-500 pr-10 transition-all duration-200 ${
                                      hasConfirmValue
                                        ? passwordsMatch
                                          ? "border-green-500 bg-green-50 ring-1 ring-green-200"
                                          : "border-red-500 bg-red-50 ring-1 ring-red-200"
                                        : ""
                                    }`}
                                  />
                                  <div
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-600"
                                    onClick={() =>
                                      setShowConfirmPassword(
                                        !showConfirmPassword,
                                      )
                                    }
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-5 w-5" />
                                    ) : (
                                      <Eye className="h-5 w-5" />
                                    )}
                                  </div>
                                </div>
                              </FormControl>
                              {/* Real-time visual indicator for password match status */}
                              {hasConfirmValue && (
                                <div className="mt-1 text-xs transition-all duration-200">
                                  {passwordsMatch ? (
                                    <div className="text-green-600 flex items-center animate-in fade-in-0 duration-200">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      {translate("auth.passwordsMatch")}
                                    </div>
                                  ) : (
                                    <div className="text-red-600 flex items-center animate-in fade-in-0 duration-200">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                      </svg>
                                      {translate("auth.passwordsDontMatch")}
                                    </div>
                                  )}
                                </div>
                              )}
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    {/* Only show email field for new users */}
                    {userIsNew && (
                      <Form {...emailForm}>
                        <FormField
                          control={emailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-purple-700" />
                                {translate("auth.email")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder={translate("auth.enterYourEmail")}
                                  {...field}
                                  className="border-purple-200 focus:border-purple-500"
                                  onBlur={field.onBlur}
                                />
                              </FormControl>
                              {emailForm.formState.errors.email && (
                                <p className="text-sm font-medium text-destructive">
                                  {translateFormError(
                                    emailForm.formState.errors.email.message ||
                                      "",
                                    t,
                                  )}
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      </Form>
                    )}

                    <div className="flex gap-4 mt-3">
                      <Button
                        type="button"
                        onClick={() => {
                          setShowPasswordStep(false);
                          setPhoneVerificationSent(true);
                        }}
                        className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md active:shadow-sm"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {translate("auth.goBack")}
                      </Button>

                      <Button
                        type="submit"
                        className="flex-1 text-white font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg active:shadow-md"
                        style={{
                          background:
                            "linear-gradient(to right, #7e22ce, #fb923c)",
                        }}
                        disabled={!userIsNew && isSigningIn}
                      >
                        {userIsNew
                          ? translate("common.continue")
                          : isSigningIn
                            ? translate("common.processing")
                            : translate("auth.signIn")}
                        {userIsNew ? (
                          <ArrowRight className="ml-2 h-4 w-4" />
                        ) : isSigningIn ? null : (
                          <LogIn className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                <div className="mt-4 text-center flex flex-col space-y-2">
                  {!userIsNew && (
                    <button
                      className="text-purple-700 hover:text-orange-500 text-sm font-medium hover:underline"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      {translate("auth.forgotPassword")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
        {/* Forgot Password Form */}
        <AnimatePresence mode="wait">
          {showForgotPassword &&
            !showResetCodeEntry &&
            !showResetPasswordForm && (
              <motion.div
                className="max-w-md mx-auto w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="auth-title mb-4 text-center">
                  {translate("auth.resetPassword")}
                </h2>
                <p className="auth-subtitle text-center mb-5">
                  {translate("auth.resetPasswordInstruction")}
                </p>

                <Form {...forgotPasswordForm}>
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(
                      onForgotPasswordSubmit,
                    )}
                    className="space-y-3"
                  >
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.email")}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="email"
                                placeholder={translate("auth.enterYourEmail")}
                                {...field}
                                className="border-purple-200 focus:border-purple-500"
                                onChange={field.onChange}
                              />
                              {emailVerifying && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                </div>
                              )}
                            </div>
                          </FormControl>

                          {/* Email verification feedback */}
                          {emailVerificationResult && !emailVerifying && (
                            <div
                              className={`text-xs mt-1 flex items-center ${
                                emailVerificationResult.isValid
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {emailVerificationResult.isValid ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {translate("auth.emailVerifiedReady")}
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {emailVerificationResult.reason ||
                                    translate("auth.emailAddressNotFound")}
                                </>
                              )}
                              <span className="ml-2 text-gray-400">
                                ({emailVerificationResult.confidence}{" "}
                                confidence)
                              </span>
                            </div>
                          )}

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full text-white font-semibold py-4"
                      style={{
                        background:
                          "linear-gradient(to right, #7e22ce, #fb923c)",
                      }}
                      disabled={resetPasswordSending}
                    >
                      {resetPasswordSending
                        ? translate("auth.sending")
                        : translate("auth.sendResetCode")}
                      <KeyRound className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 text-center">
                  <button
                    className="text-orange-500 hover:text-purple-700 text-sm font-medium hover:underline"
                    onClick={() => {
                      setShowForgotPassword(false);
                    }}
                  >
                    {translate("common.back")}
                  </button>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Reset Code Verification Form */}
        <AnimatePresence mode="wait">
          {showResetCodeEntry && !showResetPasswordForm && (
            <motion.div
              className="max-w-md mx-auto w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="auth-title mb-4 text-center">
                {translate("auth.enterResetCode")}
              </h2>
              <p className="auth-subtitle text-center mb-5">
                {translate("auth.resetCodeSentInstruction").replace(
                  "{{email}}",
                  forgotPasswordEmail,
                )}
              </p>

              <Form {...resetCodeForm}>
                <form
                  onSubmit={resetCodeForm.handleSubmit(onResetCodeSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={resetCodeForm.control}
                    name="resetCode"
                    render={({ field }) => (
                      <FormItem className="mx-auto">
                        <FormLabel className="text-center block">
                          {translate("auth.resetCode")}
                        </FormLabel>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP maxLength={7} {...field}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                                <InputOTPSlot index={6} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full text-white font-semibold py-4"
                    style={{
                      background: "linear-gradient(to right, #7e22ce, #fb923c)",
                    }}
                    disabled={resetCodeVerifying}
                  >
                    {resetCodeVerifying
                      ? translate("auth.verifying")
                      : translate("auth.verifyCode")}
                    <KeyRound className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <button
                  className="text-orange-500 hover:text-purple-700 text-sm font-medium hover:underline"
                  onClick={() => {
                    setShowResetCodeEntry(false);
                    setShowForgotPassword(true);
                    setResetCodeSent(false);
                  }}
                >
                  {translate("auth.backToEmail")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Password Form */}
        <AnimatePresence mode="wait">
          {showResetPasswordForm &&
            !showPasswordStep &&
            !showForgotPassword &&
            !showResetCodeEntry && (
              <motion.div
                className="max-w-md mx-auto w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="auth-title mb-4 text-center">
                  {translate("auth.createNewPassword")}
                </h2>

                <Form {...resetPasswordForm}>
                  <form
                    onSubmit={resetPasswordForm.handleSubmit(
                      onResetPasswordSubmit,
                    )}
                    className="space-y-3"
                  >
                    <FormField
                      control={resetPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.newPassword")}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showResetPassword ? "text" : "password"}
                                placeholder={translate("auth.enterNewPassword")}
                                {...field}
                                className="border-purple-200 focus:border-purple-500 pr-10"
                              />
                              <div
                                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-600"
                                onClick={() =>
                                  setShowResetPassword(!showResetPassword)
                                }
                              >
                                {showResetPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => {
                        const passwordValue =
                          resetPasswordForm.watch("password");
                        const confirmValue = field.value || "";
                        const passwordsMatch =
                          passwordValue &&
                          confirmValue &&
                          passwordValue === confirmValue;
                        const hasConfirmValue = confirmValue.length > 0;

                        return (
                          <FormItem>
                            <FormLabel className="auth-label flex items-center">
                              <Lock className="h-4 w-4 mr-2 text-purple-700" />
                              {translate("auth.confirmPassword")}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder={translate(
                                    "auth.confirmNewPassword",
                                  )}
                                  value={confirmValue}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Trigger immediate validation by forcing form revalidation
                                    resetPasswordForm.trigger(
                                      "confirmPassword",
                                    );
                                  }}
                                  onBlur={field.onBlur}
                                  disabled={field.disabled}
                                  name={field.name}
                                  ref={field.ref}
                                  className={`border-purple-200 focus:border-purple-500 pr-10 transition-all duration-200 ${
                                    hasConfirmValue
                                      ? passwordsMatch
                                        ? "border-green-500 bg-green-50 ring-1 ring-green-200"
                                        : "border-red-500 bg-red-50 ring-1 ring-red-200"
                                      : ""
                                  }`}
                                />
                                <div
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-600"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                  ) : (
                                    <Eye className="h-5 w-5" />
                                  )}
                                </div>
                              </div>
                            </FormControl>
                            {/* Real-time visual indicator for password match status */}
                            {hasConfirmValue && (
                              <div className="mt-1 text-xs transition-all duration-200">
                                {passwordsMatch ? (
                                  <div className="text-green-600 flex items-center animate-in fade-in-0 duration-200">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    {translate("auth.passwordsMatch")}
                                  </div>
                                ) : (
                                  <div className="text-red-600 flex items-center animate-in fade-in-0 duration-200">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                      />
                                    </svg>
                                    {translate("auth.passwordsDontMatch")}
                                  </div>
                                )}
                              </div>
                            )}
                          </FormItem>
                        );
                      }}
                    />

                    <Button
                      type="submit"
                      className="w-full text-white font-semibold py-4"
                      style={{
                        background:
                          "linear-gradient(to right, #7e22ce, #fb923c)",
                      }}
                    >
                      {translate("auth.resetPassword")}
                      <KeyRound className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 text-center">
                  <button
                    className="text-orange-500 hover:text-purple-700 text-sm font-medium hover:underline"
                    onClick={() => {
                      setShowResetPasswordForm(false);
                      setResetPasswordSent(false);
                      setShowForgotPassword(false);
                      setPhoneVerificationSent(true);
                    }}
                  >
                    {translate("common.cancel")}
                  </button>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Profile Creation - Multi-Step Form */}
        <AnimatePresence mode="wait">
          {showProfileCreation && (
            <motion.div
              className="max-w-md mx-auto w-full profile-step-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="auth-title text-center">
                  {profileStep === 1
                    ? translate("auth.basicInfo")
                    : profileStep === 2
                      ? translate("auth.location")
                      : profileStep === 3
                        ? translate("auth.addPhotos")
                        : profileStep === 4
                          ? translate("auth.idVerification")
                          : translate("auth.termsAndConditions")}
                </h2>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        profileStep === step
                          ? "bg-gradient-to-r from-purple-600 to-orange-500"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step 1: Basic Info */}
              {profileStep === 1 && (
                <Form {...profileStep1Form}>
                  <form
                    onSubmit={profileStep1Form.handleSubmit(
                      onProfileStep1Submit,
                    )}
                    className="space-y-3"
                  >
                    <FormField
                      control={profileStep1Form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <UserIcon className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.fullName")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={translate(
                                "auth.fullNamePlaceholder",
                              )}
                              {...field}
                              className="border-purple-200 focus:border-purple-500 auth-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileStep1Form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.dateOfBirth")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className="border-purple-200 focus:border-purple-500 auth-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileStep1Form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <UserIcon className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.gender")}
                          </FormLabel>
                          <div className="flex gap-3 mt-1">
                            <div
                              className={`flex-1 border rounded-lg p-2 cursor-pointer transition-all ${
                                field.value === maleText
                                  ? "border-purple-500 bg-purple-50 shadow-sm"
                                  : "border-gray-200 hover:border-purple-300"
                              }`}
                              onClick={() => field.onChange(maleText)}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border ${field.value === maleText ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}
                                >
                                  {field.value === maleText && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5"></div>
                                  )}
                                </div>
                                <span
                                  className={`text-sm font-medium ${field.value === maleText ? "text-purple-700" : "text-gray-600"}`}
                                >
                                  {maleText}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`flex-1 border rounded-lg p-2 cursor-pointer transition-all ${
                                field.value === femaleText
                                  ? "border-purple-500 bg-purple-50 shadow-sm"
                                  : "border-gray-200 hover:border-purple-300"
                              }`}
                              onClick={() => field.onChange(femaleText)}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border ${field.value === femaleText ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}
                                >
                                  {field.value === femaleText && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-0.5"></div>
                                  )}
                                </div>
                                <span
                                  className={`text-sm font-medium ${field.value === femaleText ? "text-purple-700" : "text-gray-600"}`}
                                >
                                  {femaleText}
                                </span>
                              </div>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4 mt-3">
                      <Button
                        type="button"
                        onClick={() => {
                          setShowProfileCreation(false);
                          setShowPasswordStep(true);
                        }}
                        className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md active:shadow-sm"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {translate("auth.goBack")}
                      </Button>

                      <Button
                        type="submit"
                        className="flex-1 text-white font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                        style={{
                          background:
                            "linear-gradient(to right, #7e22ce, #fb923c)",
                        }}
                        disabled={!profileStep1Form.formState.isValid}
                      >
                        {translate("auth.continue")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 2: Location */}
              {profileStep === 2 && (
                <Form {...profileStep2Form}>
                  <form
                    onSubmit={profileStep2Form.handleSubmit(
                      onProfileStep2Submit,
                    )}
                    className="space-y-3"
                  >
                    <FormField
                      control={profileStep2Form.control}
                      name="residence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="auth-label flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-purple-700" />
                            {translate("auth.residence")}
                          </FormLabel>
                          <FormControl>
                            <CityInput
                              initialValue={field.value}
                              onLocationSelect={field.onChange}
                              placeholder={translate(
                                "auth.residencePlaceholder",
                              )}
                              className="border-purple-200 focus:border-purple-500 auth-input"
                            />
                          </FormControl>
                          {/* Removed city suggestion text */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tribe Selection moved to Profile page */}

                    <div className="flex gap-4 mt-3">
                      <Button
                        type="button"
                        onClick={() => setProfileStep(1)}
                        className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md active:shadow-sm"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {translate("auth.goBack")}
                      </Button>

                      <Button
                        type="submit"
                        className="flex-1 text-white font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg active:shadow-md"
                        style={{
                          background:
                            "linear-gradient(to right, #7e22ce, #fb923c)",
                        }}
                      >
                        {translate("auth.continue")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 3: Photos */}
              {profileStep === 3 && (
                <Form {...profileStep3Form}>
                  <form
                    onSubmit={profileStep3Form.handleSubmit(
                      onProfileStep3Submit,
                    )}
                    className="space-y-3"
                  >
                    <div className="mb-3">
                      <h3 className="auth-label flex items-center mb-1">
                        <Camera className="h-4 w-4 mr-2 text-pink-500" />
                        {translate("auth.myPhotos")}
                      </h3>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Primary Photo */}
                        <FormField
                          control={profileStep3Form.control}
                          name="photoUrl"
                          render={({
                            field: { value, onChange, ...fieldProps },
                          }) => (
                            <FormItem className="col-span-1">
                              <FormControl>
                                {value ? (
                                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-500">
                                    <img
                                      src={value}
                                      alt="Primary photo"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://via.placeholder.com/150?text=Profile";
                                      }}
                                    />
                                    <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                                      Primary
                                    </div>
                                    {/* Avatar badge removed */}

                                    {/* Action buttons - always visible */}
                                    <div className="absolute top-1 right-1 flex flex-col gap-1">
                                      <label
                                        htmlFor="change-primary-photo"
                                        className="bg-white bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full cursor-pointer shadow-sm transition-all"
                                        title="Change photo"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 text-gray-600"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                          />
                                        </svg>
                                        <input
                                          id="change-primary-photo"
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                const newPhotoUrl =
                                                  reader.result as string;
                                                onChange(newPhotoUrl);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => onChange("")}
                                        className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                        title="Remove photo"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                      {profileStep3Form.getValues()
                                        .photoUrl2 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const secondaryPhoto =
                                              profileStep3Form.getValues()
                                                .photoUrl2;
                                            profileStep3Form.setValue(
                                              "photoUrl2",
                                              value,
                                            );
                                            onChange(secondaryPhoto);
                                          }}
                                          className="bg-purple-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                          title="Swap with secondary photo"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-3 w-3 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                            />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-purple-500">
                                    <label
                                      htmlFor="dropzone-file-1"
                                      className="h-full w-full rounded-lg text-purple-500 flex flex-col items-center justify-center cursor-pointer"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M12 5v14M5 12h14"></path>
                                      </svg>
                                      <span className="text-xs mt-1">
                                        {translate("auth.primaryPhoto")}
                                      </span>
                                      <span className="text-xs text-red-500 mt-1">
                                        ({translate("auth.required")})
                                      </span>
                                      <input
                                        id="dropzone-file-1"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              const newPhotoUrl =
                                                reader.result as string;
                                              onChange(newPhotoUrl);

                                              // Store as original primary for potential restore
                                              // Removed dependency on originalPrimaryPhoto state
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        {...fieldProps}
                                      />
                                    </label>
                                  </div>
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Secondary Photo */}
                        <FormField
                          control={profileStep3Form.control}
                          name="photoUrl2"
                          render={({
                            field: { value, onChange, ...fieldProps },
                          }) => (
                            <FormItem className="col-span-1">
                              <FormControl>
                                {value ? (
                                  <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300">
                                    <img
                                      src={value}
                                      alt="Additional photo"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://via.placeholder.com/150?text=Profile";
                                      }}
                                    />

                                    {/* Action buttons - always visible */}
                                    <div className="absolute top-1 right-1 flex flex-col gap-1">
                                      <label
                                        htmlFor="change-secondary-photo"
                                        className="bg-white bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full cursor-pointer shadow-sm transition-all"
                                        title="Change photo"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 text-gray-600"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                          />
                                        </svg>
                                        <input
                                          id="change-secondary-photo"
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                onChange(
                                                  reader.result as string,
                                                );
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => onChange("")}
                                        className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                        title="Remove photo"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const primaryPhoto =
                                            profileStep3Form.getValues()
                                              .photoUrl;
                                          profileStep3Form.setValue(
                                            "photoUrl",
                                            value,
                                          );
                                          onChange(primaryPhoto);
                                        }}
                                        className="bg-purple-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                        title="Make primary photo"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-purple-200">
                                    <label
                                      htmlFor="dropzone-file-2"
                                      className="h-full w-full rounded-lg text-purple-500 flex flex-col items-center justify-center cursor-pointer"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M12 5v14M5 12h14"></path>
                                      </svg>
                                      <span className="text-xs mt-1">
                                        {translate("auth.addPhoto")}
                                      </span>
                                      <input
                                        id="dropzone-file-2"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              onChange(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        {...fieldProps}
                                      />
                                    </label>
                                  </div>
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Photo management notice */}
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div>
                            <p className="text-xs text-purple-800 font-medium">
                              {translate("auth.photoTips")}
                            </p>
                            <p className="text-xs text-purple-700 mt-1">
                              {translate("auth.photoTipsDescription")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-3">
                      <Button
                        type="button"
                        onClick={() => setProfileStep(2)}
                        className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md active:shadow-sm"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {translate("common.back")}
                      </Button>

                      <Button
                        type="submit"
                        className="flex-1 text-white font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg active:shadow-md disabled:transform-none disabled:hover:scale-100"
                        style={{
                          background:
                            "linear-gradient(to right, #7e22ce, #fb923c)",
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {translate("auth.creatingProfile")}
                          </>
                        ) : (
                          <>
                            {translate("auth.continue")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 4: ID Verification (Optional) */}
              {profileStep === 4 && (
                <Form {...idVerificationForm}>
                  <form
                    onSubmit={idVerificationForm.handleSubmit(
                      onIdVerificationSubmit,
                    )}
                    className="space-y-3"
                  >
                    <div className="mb-2">
                      <p className="text-xs text-gray-600"></p>
                    </div>

                    {/* Government ID Photo */}
                    <FormField
                      control={idVerificationForm.control}
                      name="idVerificationPhoto"
                      render={({
                        field: { onChange, value, ...fieldProps },
                      }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            {translate("auth.governmentIdPhoto")}
                          </FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 gap-4">
                              {value ? (
                                <div className="relative aspect-[3/2] rounded-lg overflow-hidden border-2 border-blue-500">
                                  <img
                                    src={value}
                                    alt="Government ID"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onChange("")}
                                      className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                      title="Remove photo"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-blue-500 p-6 sm:p-8">
                                  <label
                                    htmlFor="dropzone-id-photo"
                                    className="h-full w-full rounded-lg text-blue-500 flex flex-col items-center justify-center cursor-pointer"
                                  >
                                    <IdCard className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">
                                      {translate("auth.uploadGovernmentId")}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">
                                      {translate("auth.governmentIdTypes")}
                                    </span>
                                    <input
                                      id="dropzone-id-photo"
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            onChange(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      {...fieldProps}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Live Verification Photo */}
                    <FormField
                      control={idVerificationForm.control}
                      name="liveVerificationPhoto"
                      render={({
                        field: { onChange, value, ...fieldProps },
                      }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            {translate("auth.liveVerificationPhoto")}
                          </FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 gap-4">
                              {value ? (
                                <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-500">
                                  <img
                                    src={value}
                                    alt="Live verification"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onChange("")}
                                      className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                      title="Remove photo"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-blue-500 p-6 sm:p-8">
                                  <button
                                    type="button"
                                    onClick={() => setShowLiveCamera(true)}
                                    className="h-full w-full rounded-lg text-blue-500 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                                  >
                                    <Camera className="h-8 w-8 mb-2" />
                                    <span className="text-sm font-medium">
                                      {translate("auth.takeLivePhoto")}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">
                                      {translate("auth.selfieForVerification")}
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Buttons */}
                    <div className="flex gap-2 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setProfileStep(3)}
                        className="flex-1 py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-md active:shadow-sm"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {translate("common.back")}
                      </Button>

                      <Button
                        type="submit"
                        className="flex-1 text-white font-semibold py-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg active:shadow-md disabled:transform-none disabled:hover:scale-100"
                        style={{
                          background:
                            "linear-gradient(to right, #7e22ce, #fb923c)",
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {translate("common.processing")}
                          </>
                        ) : idVerificationForm.getValues(
                            "idVerificationPhoto",
                          ) &&
                          idVerificationForm.getValues(
                            "liveVerificationPhoto",
                          ) ? (
                          <>
                            {translate("auth.continue")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>Skip for Later</>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 5: Terms and Conditions */}
              {profileStep === 5 && (
                <div className="auth-content profile-step-container">
                  <div className="profile-step-container">
                    <TermsAndConditions
                      onBack={() => setProfileStep(3)}
                      onComplete={handleTermsComplete}
                      isLoading={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legal Dialogs - matching settings page functionality exactly */}
      <PrivacyPolicyDialog
        open={privacyPolicyDialogOpen}
        onOpenChange={setPrivacyPolicyDialogOpen}
      />

      <TermsOfServiceDialog
        open={termsOfServiceDialogOpen}
        onOpenChange={setTermsOfServiceDialogOpen}
      />

      {/* Live Photo Capture Modal */}
      {showLiveCamera && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <LivePhotoCapture
            onCapture={(blob) => {
              // Convert blob to data URL
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                idVerificationForm.setValue("liveVerificationPhoto", dataUrl);
                setShowLiveCamera(false);
              };
              reader.readAsDataURL(blob);
            }}
            onCancel={() => setShowLiveCamera(false)}
          />
        </div>
      )}
    </div>
  );
}
