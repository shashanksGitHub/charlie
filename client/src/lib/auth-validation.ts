import { z } from "zod";
import { apiRequest } from "./queryClient";

// Password schema with conditional confirmPassword field
export const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(),
}).refine(data => {
  // Only validate password matching if confirmPassword is provided 
  if (data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Phone verification schema
export const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Please enter a valid phone number").refine((val) => /^\+\d{10,15}$/.test(val), {
    message: "Phone number must include country code (e.g., +1...)",
  }),
});

// Verification code schema
export const verificationSchema = z.object({
  code: z.string().length(7, "Verification code must be 7 digits"),
});

// Advanced email verification function
export const verifyEmailExistence = async (email: string): Promise<{
  isValid: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}> => {
  try {
    const response = await apiRequest("/api/email/verify", {
      method: "POST",
      data: { email }
    });
    const data = await response.json();
    return {
      isValid: data.isValid,
      reason: data.reason,
      confidence: data.confidence
    };
  } catch (error) {
    console.error("Email verification service error:", error);
    // Fallback to basic validation if service is unavailable
    return {
      isValid: true, // Allow registration to proceed if service is down
      reason: "Verification service unavailable",
      confidence: 'low'
    };
  }
};

// PERFORMANCE OPTIMIZATION: Simplified email schema - remove slow SMTP verification
export const emailSchema = z.object({
  email: z.string()
    .email("Please enter a valid email format"),
});

// Enhanced forgot password schema with SMTP verification
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .refine(async (email) => {
      const result = await verifyEmailExistence(email);
      return result.isValid;
    }, {
      message: "This email address does not exist or cannot receive emails"
    }),
});

// Reset code verification schema for 7-digit code verification
export const resetCodeSchema = z.object({
  resetCode: z.string().length(7, "Reset code must be 7 digits"),
});

// Reset password schema for password reset flow
export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Basic profile schema - Step 1
export const profileStep1Schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required")
    .refine(val => {
      try {
        // Make sure the date is valid
        const date = new Date(val);
        return !isNaN(date.getTime());
      } catch (e) {
        return false;
      }
    }, {
      message: "Please enter a valid date"
    })
    .refine(val => {
      try {
        const selectedDate = new Date(val);
        const today = new Date();
        
        // Set both dates to midnight for accurate comparison
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Date must be before today (not today or future)
        return selectedDate < today;
      } catch (e) {
        return false;
      }
    }, {
      message: "Please select a date before today"
    }),
  gender: z.string().min(1, "Gender is required"),
});

// Location schema - Step 2
export const profileStep2Schema = z.object({
  residence: z.string().min(1, "City and country are required"),
  tribe: z.string().optional(),
  secondaryTribe: z.string().optional(),
});

// Photos schema - Step 3
export const profileStep3Schema = z.object({
  photoUrl: z.string().min(10, "Please upload at least one photo"),
  photoUrl2: z.string().optional(),
});

// Types for forms
export type PasswordFormValues = z.infer<typeof passwordSchema>;
export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type VerificationFormValues = z.infer<typeof verificationSchema>;
export type EmailFormValues = z.infer<typeof emailSchema>;
export type ProfileStep1Values = z.infer<typeof profileStep1Schema>;
export type ProfileStep2Values = z.infer<typeof profileStep2Schema>;
export type ProfileStep3Values = z.infer<typeof profileStep3Schema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetCodeValues = z.infer<typeof resetCodeSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// Utility functions
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const response = await apiRequest("/api/check-email", {
      method: "POST",
      data: { email }
    });
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};

// Safely format date string without expensive Date object operations
export const formatDateString = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') return '';
  return `${dateString.trim()}T00:00:00.000Z`;
};

// Generate efficient random username
export const generateUsername = (): string => {
  return `user_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
};

// ID Verification schema - Step 4 (optional)
export const idVerificationSchema = z.object({
  idVerificationPhoto: z.string().optional(),
  liveVerificationPhoto: z.string().optional(),
  skipVerification: z.boolean().default(false),
});

// Type definitions
export type IdVerificationValues = z.infer<typeof idVerificationSchema>;