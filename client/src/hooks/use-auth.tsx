import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  insertUserSchema,
  User as SelectUser,
  InsertUser,
} from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  checkOfflineMatches,
  markMatchCheckNeeded,
  recordLogoutTime,
} from "@/lib/offline-match-checker";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes - authentication doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on every window focus
    refetchOnMount: false, // Don't refetch on every component mount
    retry: 2, // Reduce retry attempts for faster failure detection
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("/api/login", {
        method: "POST",
        data: credentials,
      });
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      // Update the user data in the cache first
      queryClient.setQueryData(["/api/user"], user);

      // Immediately refetch user data to ensure cache is up-to-date
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Immediately prefetch matches data to avoid requiring a refresh
      queryClient.prefetchQuery({
        queryKey: ["/api/matches"],
        staleTime: 0,
      });

      // Also prefetch match counts to update badges correctly
      queryClient.prefetchQuery({
        queryKey: ["/api/matches/counts"],
        staleTime: 0,
      });

      // CRITICAL FEATURE: Check for matches that occurred while the user was away
      // This will trigger the "It's a Match!" popup immediately after login
      if (user && user.id) {
        try {
          console.log("Checking for new matches immediately after login");

          // Force match check by setting the needed flag to ensure it runs
          // This ensures we always check for matches on login, even for users who
          // didn't properly logout before or are logging in for the first time
          markMatchCheckNeeded();

          // Always run the match check on login
          await checkOfflineMatches(user.id);
        } catch (error) {
          console.error("Error checking for new matches on login:", error);
          // Non-blocking - we continue with login flow even if this fails
        }
      }

      // Show a success toast
      toast({
        title: "Login successful",
        description: "Welcome back to CHARLEY!",
      });

      // Get the user's app selection preference directly - always check this on login
      const showAppSelection = user?.id
        ? localStorage.getItem(`show_app_mode_selection_${user.id}`) !== "false"
        : true; // Default to true (showing app selection) if not set

      console.log(
        "Login successful. Show app selection preference:",
        showAppSelection,
      );

      if (showAppSelection) {
        // If the setting is ON, always show the app selection page after login
        // Clear any previous app mode selection flag to ensure we start fresh
        sessionStorage.removeItem("appModeSelected");

        // Set a flag to show we're in the login-to-app-selection transition
        sessionStorage.setItem("loginTransition", "true");

        // Navigate to app selection page
        console.log("Redirecting to app selection page");
        window.location.href = "/app-selection";
      } else {
        // If the setting is OFF, go directly to their last used app
        const lastUsedApp =
          localStorage.getItem(`last_used_app_${user.id}`) || "meet";

        // Set as selected to prevent redirect loops
        sessionStorage.setItem("appModeSelected", "true");

        // Redirect to the appropriate app page
        console.log("Direct navigation to app:", lastUsedApp);
        window.location.href = lastUsedApp === "meet" ? "/" : `/${lastUsedApp}`;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("/api/register", {
        method: "POST",
        data: credentials,
      });
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: "Welcome to CHARLEY! Let's get started.",
      });
      // Redirect to app selection page after registration
      setLocation("/app-selection");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL FEATURE: Record logout time for offline match detection
      // This saves the current timestamp when the user logs out
      try {
        recordLogoutTime();
        markMatchCheckNeeded();
        console.log("[AUTH] Recorded logout time for offline match detection");
      } catch (e) {
        console.error("[AUTH] Failed to record logout time:", e);
      }

      // Proceed with the logout API call (non-blocking)
      apiRequest("/api/logout", {
        method: "POST",
      }).catch((error) => {
        console.error("[AUTH] Logout API call failed:", error);
        // Continue with client-side logout even if API fails
      });
    },
    onSuccess: () => {
      // Clear user data immediately for instant UI response
      queryClient.setQueryData(["/api/user"], null);

      // Navigate to auth page immediately
      setLocation("/auth");

      // Clear all caches and storage in background (non-blocking)
      Promise.resolve().then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

        // Clear storage data in background
        try {
          // Clear session-specific storage items
          const messageKeys = Object.keys(sessionStorage).filter(
            (k) =>
              k.includes("chat_") ||
              k.includes("message_") ||
              k.includes("_session_") ||
              k.includes("content_fingerprint_"),
          );

          messageKeys.forEach((key) => {
            sessionStorage.removeItem(key);
          });

          console.log(
            `[AUTH] Cleared ${messageKeys.length} message related items from session storage`,
          );
        } catch (e) {
          console.error("[AUTH] Error during final cleanup:", e);
        }

        // Clear all localStorage as well
        try {
          localStorage.clear();
          console.log("[AUTH] Cleared all localStorage on logout");
        } catch (e) {
          console.error("[AUTH] Error clearing localStorage:", e);
        }
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
