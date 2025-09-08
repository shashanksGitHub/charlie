import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useSuiteConnectionCount } from "@/hooks/use-suite-connection-count";
import { useLocation } from "wouter";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  GraduationCap,
  Briefcase,
  Heart,
  X,
  MessageCircle,
  Clock,
  CheckCircle,
  Building,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
  Shield,
  Award,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ExpandableSwipeCardModal } from "@/components/ui/expandable-swipe-card-modal";
import { PremiumUpgradeDialog } from "@/components/settings/premium-upgrade-dialog";
import { isUnder18 } from "@/lib/age-utils";

interface SuiteConnection {
  id: number;
  userId: number;
  targetProfileId: number;
  targetUserId: number;
  action: "like" | "pass";
  matched: boolean;
  createdAt: string;
  mentorshipPrimaryPhotoUrl?: string;
  networkingPrimaryPhotoUrl?: string;
  fieldVisibility?: any;
  targetProfile: {
    id: number;
    professionalTagline?: string;
    currentRole?: string;
    industry?: string;
    lookingFor?: string;
    canOffer?: string;
    field?: string;
    role?: string;
    areasOfExpertise?: string[];
    learningGoals?: string[];
  };
  targetUser: {
    id: number;
    fullName: string;
    photoUrl?: string;
    profession?: string;
    location?: string;
    isVerified?: boolean;
  };
}

interface ConnectionCounts {
  networking: {
    matches: number;
    pending: number;
    total: number;
  };
  mentorship: {
    matches: number;
    pending: number;
    total: number;
  };
  jobs: {
    applications: number;
    pending: number;
    total: number;
  };
}

// Networking Compatibility Badge Component
interface NetworkingCompatibilityBadgeProps {
  targetProfileId: number;
  targetUserId: number;
  isPremium: boolean;
  onPremiumUpgradeClick: () => void;
}

function NetworkingCompatibilityBadge({
  targetProfileId,
  targetUserId,
  isPremium,
  onPremiumUpgradeClick,
}: NetworkingCompatibilityBadgeProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate compatibility percentage (simple fallback like discover page)
  const compatibility = 75 + (targetProfileId % 20);

  const handleClick = async () => {
    // Self-compatibility check - prevent users from viewing their own compatibility
    if (user && targetUserId === user.id) {
      toast({
        title: "Cannot View Own Compatibility",
        description:
          "You cannot view compatibility analysis for your own profile.",
        variant: "destructive",
      });
      return;
    }

    // Premium restriction check for SUITE percentage badges - EXACT COPY FROM DISCOVER PAGE
    if (!isPremium && onPremiumUpgradeClick) {
      onPremiumUpgradeClick();
      return;
    }

    // First call the compatibility API to create the record in suite_compatibility_scores table
    try {
      const response = await fetch(
        `/api/suite/compatibility/user/${targetUserId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Successfully created/updated compatibility score record
        console.log(
          `[SUITE-CONNECTIONS] Compatibility score created/updated for user ${targetUserId}`,
        );
        const data = await response.json();

        if (data.score && data.score.targetProfileId) {
          // Navigate using target profile ID from API response
          setLocation(`/suite/compatibility/${data.score.targetProfileId}`);
          return;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          `[SUITE-CONNECTIONS] Failed to create compatibility score for user ${targetUserId}:`,
          response.status,
          errorData,
        );

        // Show user-friendly error for self-compatibility attempts
        if (
          response.status === 400 &&
          (errorData.message?.includes("yourself") ||
            errorData.message?.includes("own"))
        ) {
          toast({
            title: "Cannot View Own Compatibility",
            description:
              "You cannot view compatibility analysis for your own profile.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error(
        `[SUITE-CONNECTIONS] Error calling compatibility API for user ${targetUserId}:`,
        error,
      );
    }

    // Fallback navigation using target profile ID
    setLocation(`/suite/compatibility/${targetProfileId}`);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-3 right-16 w-[3.5rem] h-[3.5rem] rounded-full bg-gradient-to-br from-emerald-100 to-white flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.4),0_2px_4px_rgba(16,185,129,0.3),inset_0_2px_3px_rgba(255,255,255,0.7)] backdrop-blur-sm compatibility-score hover:shadow-[0_6px_20px_rgba(16,185,129,0.5),0_4px_8px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer percentage-badge-container relative z-20"
      title="View detailed networking compatibility analysis"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center no-animation relative overflow-hidden"
        style={{
          boxShadow:
            "inset 0 0 15px rgba(16, 185, 129, 0.2), 0 2px 8px rgba(16, 185, 129, 0.15)",
          background:
            compatibility >= 90
              ? `conic-gradient(#10b981 0%, #10b981 ${compatibility}%, #f59e0b ${compatibility}%, #f59e0b 100%)`
              : compatibility >= 75
                ? `conic-gradient(#059669 0%, #059669 ${compatibility}%, #f59e0b ${compatibility}%, #f59e0b 100%)`
                : `conic-gradient(#047857 0%, #047857 ${compatibility}%, #f59e0b ${compatibility}%, #f59e0b 100%)`,
        }}
      >
        <div className="w-[2.4rem] h-[2.4rem] rounded-full bg-white flex items-center justify-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm">
          <span className="text-xs font-black text-emerald-600 drop-shadow-sm">
            {compatibility}%
          </span>
        </div>
      </div>
    </button>
  );
}

export default function SuiteConnectionsPage() {
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const { toast } = useToast();
  const { translate } = useLanguage();
  const queryClient = useQueryClient();
  const { networkingCount, mentorshipCount, jobsCount } =
    useSuiteConnectionCount();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState("networking");
  const [selectedConnection, setSelectedConnection] =
    useState<SuiteConnection | null>(null);
  const [realtimeConnections, setRealtimeConnections] = useState<
    SuiteConnection[]
  >([]);
  const [realtimeMentorshipConnections, setRealtimeMentorshipConnections] =
    useState<SuiteConnection[]>([]);
  const [realtimeCounts, setRealtimeCounts] = useState<ConnectionCounts | null>(
    null,
  );
  const [removedConnectionIds, setRemovedConnectionIds] = useState<Set<number>>(
    new Set(),
  );

  // State for expandable swipe card modal
  const [expandableModalOpen, setExpandableModalOpen] = useState(false);
  const [expandableModalUser, setExpandableModalUser] = useState<any>(null);
  const [expandableModalProfileId, setExpandableModalProfileId] = useState<
    number | undefined
  >(undefined);
  const [expandableModalProfileType, setExpandableModalProfileType] = useState<
    "networking" | "mentorship" | "jobs"
  >("networking");
  const [expandableModalAdditionalData, setExpandableModalAdditionalData] =
    useState<any>(null);
  const [
    expandableModalIsConnectionResponse,
    setExpandableModalIsConnectionResponse,
  ] = useState(false);

  // Premium upgrade dialog state
  const [premiumUpgradeDialogOpen, setPremiumUpgradeDialogOpen] =
    useState(false);
  const [expandableModalRequesterUserId, setExpandableModalRequesterUserId] =
    useState<number | undefined>(undefined);

  // Function to handle opening expandable card modal
  // Enhanced click handler that checks premium status
  const handleConnectionCardClick = (
    connection: SuiteConnection,
    type: "networking" | "mentorship" | "jobs",
  ) => {
    console.log(
      "[CONNECTIONS-PAGE] Card clicked, checking premium access for user:",
      user?.premiumAccess,
    );

    // For non-premium users, show premium upgrade dialog
    if (!user?.premiumAccess) {
      console.log(
        "[CONNECTIONS-PAGE] Non-premium user clicked blurred card, showing upgrade dialog",
      );
      setPremiumUpgradeDialogOpen(true);
      return;
    }

    // For premium users, open the card normally
    console.log(
      "[CONNECTIONS-PAGE] Premium user clicked card, opening expandable modal",
    );
    handleOpenExpandableCard(connection, type);
  };

  const handleOpenExpandableCard = async (
    connection: SuiteConnection,
    type: "networking" | "mentorship" | "jobs",
  ) => {
    try {
      console.log(
        "Opening expandable swipe card for:",
        connection.targetUser.fullName,
      );

      // Handle different data structures for different connection types
      let profession = "";
      let profileData = {};

      if (type === "jobs") {
        // Jobs connections have different structure - targetProfile is null
        // Need to fetch job profile data from API
        profession = connection.targetUser.profession || "Professional";

        // CRITICAL FIX: For job applications, connection.userId is the APPLICANT, connection.targetUserId is the job poster
        // When the job poster (Kay) views the connection, she should see the applicant's (Obed's) job profile
        const applicantUserId = connection.userId;
        try {
          console.log(
            `[JOBS-PROFILE] FIXED: Fetching APPLICANT's job profile for user ${applicantUserId} (was incorrectly using targetUserId ${connection.targetUserId})`,
          );
          const jobProfileResponse = await fetch(
            `/api/suite/job-profile/${applicantUserId}`,
            {
              credentials: "include",
            },
          );

          if (jobProfileResponse.ok) {
            const jobProfileData = await jobProfileResponse.json();
            console.log(
              `[JOBS-PROFILE] Successfully fetched job profile:`,
              jobProfileData,
            );
            console.log(
              `[JOBS-PROFILE] Raw job profile fields:`,
              Object.keys(jobProfileData),
            );
            console.log(`[JOBS-PROFILE] Job title:`, jobProfileData.jobTitle);
            console.log(
              `[JOBS-PROFILE] Description:`,
              jobProfileData.description,
            );
            console.log(
              `[JOBS-PROFILE] Who should apply:`,
              jobProfileData.whoShouldApply,
            );
            console.log(`[JOBS-PROFILE] Apply URL:`, jobProfileData.applyUrl);
            console.log(
              `[JOBS-PROFILE] Contact email:`,
              jobProfileData.contactEmail,
            );
            console.log(
              `[JOBS-PROFILE] Visibility preferences:`,
              jobProfileData.visibilityPreferences,
            );
            profileData = {
              ...jobProfileData,
              mentorshipPrimaryPhotoUrl: connection.mentorshipPrimaryPhotoUrl,
              networkingPrimaryPhotoUrl: connection.networkingPrimaryPhotoUrl,
              fieldVisibility: connection.fieldVisibility,
            };
          } else {
            console.log(
              `[JOBS-PROFILE] Job profile not found for applicant user ${applicantUserId}, using empty profile`,
            );
            profileData = {};
          }
        } catch (error) {
          console.error(
            `[JOBS-PROFILE] Error fetching job profile for applicant user ${applicantUserId}:`,
            error,
          );
          profileData = {};
        }
      } else {
        // Networking and Mentorship connections have targetProfile data
        profession =
          connection.targetUser.profession ||
          connection.targetProfile?.currentRole ||
          "Professional";
        profileData = {
          ...connection.targetProfile,
          mentorshipPrimaryPhotoUrl: connection.mentorshipPrimaryPhotoUrl,
          networkingPrimaryPhotoUrl: connection.networkingPrimaryPhotoUrl,
          fieldVisibility: connection.fieldVisibility,
        };
      }

      // Convert SuiteConnection to User format for the expandable modal
      // For Jobs connections, we want to show the applicant's data, not the target's data
      // For Mentorship/Networking connections, we want to show the liker's data (connection.userId)
      const userId = connection.userId;
      const convertedUser = {
        id: userId,
        fullName: connection.targetUser.fullName,
        photoUrl: connection.targetUser.photoUrl,
        profession: profession,
        location: connection.targetUser.location,
        bio: "", // We don't have bio in SuiteConnection, will fetch from API if needed
        interests: "[]", // Default empty interests
        countryOfOrigin: "", // Will be filled from API
        relationshipStatus: "", // Not applicable for SUITE
        // Add other required User fields with defaults
        username: "",
        email: "",
        phoneNumber: "",
        gender: "",
        ethnicity: null,
        secondaryTribe: null,
        religion: "",
        dateOfBirth: null,
        showProfilePhoto: true,
        isVerified: connection.targetUser.isVerified || false, // CRITICAL FIX: Add verification status
        createdAt: new Date(),
      };

      setExpandableModalUser(convertedUser);
      setExpandableModalProfileId(connection.targetProfileId);
      setExpandableModalProfileType(type);

      // Set additional data with connection ID for removal tracking
      setExpandableModalAdditionalData({
        ...profileData,
        connectionId: connection.id, // Add the connection ID for removal tracking
      });

      // Set connection response mode - this is responding to an existing connection request
      setExpandableModalIsConnectionResponse(true);
      setExpandableModalRequesterUserId(connection.userId); // The user who made the original connection request

      setExpandableModalOpen(true);
    } catch (error) {
      console.error("Error opening expandable card:", error);
      toast({
        title: "Error",
        description: "Failed to open card details",
        variant: "destructive",
      });
    }
  };

  // Load tab preference when user is available
  useEffect(() => {
    if (user?.id) {
      try {
        const savedTab = localStorage.getItem(
          `suite_connections_last_tab_${user.id}`,
        );
        const under18 = isUnder18(user.dateOfBirth);
        if (
          savedTab &&
          ["jobs", "mentorship", "networking"].includes(savedTab)
        ) {
          setActiveTab(
            under18 && savedTab === "jobs" ? "networking" : savedTab,
          );
        }
      } catch (error) {
        console.warn("Failed to load tab preference:", error);
      }
    }
  }, [user?.id]);

  // Save tab preference whenever activeTab changes
  useEffect(() => {
    if (user?.id) {
      try {
        const under18 = isUnder18(user.dateOfBirth);
        const toSave =
          under18 && activeTab === "jobs" ? "networking" : activeTab;
        localStorage.setItem(`suite_connections_last_tab_${user.id}`, toSave);
      } catch (error) {
        console.warn("Failed to save tab preference:", error);
      }
    }
  }, [activeTab, user?.id]);

  // Listen for connection card removal events
  useEffect(() => {
    const handleConnectionCardRemoval = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { connectionId, isMatch } = customEvent.detail;
      console.log(
        `[CONNECTIONS-PAGE] Removing connection card ${connectionId}, isMatch: ${isMatch}`,
      );

      // Add to removed connections set to immediately hide the card
      setRemovedConnectionIds((prev) => new Set([...prev, connectionId]));
    };

    window.addEventListener(
      "connectionCardRemoval",
      handleConnectionCardRemoval as EventListener,
    );

    return () => {
      window.removeEventListener(
        "connectionCardRemoval",
        handleConnectionCardRemoval as EventListener,
      );
    };
  }, []);

  // Real-time networking notification listener with aggressive refresh system
  useEffect(() => {
    if (!user) return;

    const handleNetworkingNotification = (event: CustomEvent) => {
      const data = event.detail;
      console.log(
        "[CONNECTIONS-PAGE] Received networking notification via global handler:",
        data,
      );

      // INSTANT STATE UPDATE: Create new connection object for immediate display
      const newConnection: SuiteConnection = {
        id: data.connection.id,
        userId: data.fromUserId,
        targetProfileId: data.targetProfileId,
        targetUserId: user.id,
        action: data.connection.action,
        matched: data.isMatch,
        createdAt: data.timestamp,
        targetProfile: {
          id: data.targetProfileId,
          professionalTagline: "New Professional Connection",
          currentRole: "Professional",
        },
        targetUser: {
          id: data.fromUserId,
          fullName: data.fromUserInfo.fullName,
          photoUrl: undefined,
        },
      };

      // Update local state immediately for instant UI update
      setRealtimeConnections((prev) => [newConnection, ...prev]);

      // Update counts immediately
      if (realtimeCounts) {
        setRealtimeCounts((prev) => ({
          ...prev!,
          networking: {
            ...prev!.networking,
            pending: prev!.networking.pending + 1,
            total: prev!.networking.total + 1,
          },
        }));
      }

      // AGGRESSIVE REFRESH: Force immediate refetch with no cache
      queryClient.refetchQueries({
        queryKey: ["/api/suite/connections/networking"],
        type: "active",
      });

      // Force immediate count refresh
      queryClient.refetchQueries({
        queryKey: ["/api/suite/connections/counts"],
        type: "active",
      });

      // Also invalidate cache to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/networking"],
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      // Show immediate toast notification
      if (data.isMatch) {
        toast({
          title: "Professional Match!",
          description: "You've made a new professional connection!",
        });
      } else {
        toast({
          title: "New Professional Like",
          description: "Someone liked your networking profile!",
        });
      }

      console.log(
        "[CONNECTIONS-PAGE] INSTANT UI UPDATE + Forced data refresh triggered",
      );
    };

    // Listen for global networking notification events
    document.addEventListener(
      "networkingNotification",
      handleNetworkingNotification as EventListener,
    );
    console.log(
      "[CONNECTIONS-PAGE] Global networking notification listener attached",
    );

    // Listen for global mentorship notification events
    const handleMentorshipNotification = (event: CustomEvent) => {
      const data = event.detail;
      console.log(
        "[CONNECTIONS-PAGE] Received mentorship notification via global handler:",
        data,
      );

      // INSTANT STATE UPDATE: Create new mentorship connection object for immediate display
      const newMentorshipConnection: SuiteConnection = {
        id: data.connection.id,
        userId: data.fromUserId,
        targetProfileId: data.targetProfileId,
        targetUserId: user?.id || 0,
        action: data.connection.action,
        matched: data.isMatch,
        createdAt: data.timestamp,
        targetProfile: {
          id: data.targetProfileId,
          role: "Mentor/Mentee",
          field: "Professional Development",
        },
        targetUser: {
          id: data.fromUserId,
          fullName: data.fromUserInfo?.fullName || "New Connection",
          photoUrl: data.fromUserInfo?.photoUrl,
        },
      };

      // Update local state immediately for instant UI update
      setRealtimeMentorshipConnections((prev) => [
        newMentorshipConnection,
        ...prev,
      ]);

      // Update counts immediately
      if (realtimeCounts) {
        setRealtimeCounts((prev) => ({
          ...prev!,
          mentorship: {
            ...prev!.mentorship,
            pending: prev!.mentorship.pending + 1,
            total: prev!.mentorship.total + 1,
          },
        }));
      }

      // Force immediate refetch with no cache
      queryClient.refetchQueries({
        queryKey: ["/api/suite/connections/mentorship"],
        type: "active",
      });

      queryClient.refetchQueries({
        queryKey: ["/api/suite/connections/counts"],
        type: "active",
      });

      // Also invalidate cache to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/mentorship"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      // Show immediate toast notification
      if (data.isMatch) {
        toast({
          title: "Mentorship Match!",
          description: "You've made a new mentorship connection!",
        });
      } else {
        toast({
          title: "New Mentorship Request",
          description: "Someone is interested in mentorship with you!",
        });
      }

      console.log(
        "[CONNECTIONS-PAGE] INSTANT MENTORSHIP UI UPDATE + Forced data refresh triggered",
      );
    };

    document.addEventListener(
      "mentorshipNotification",
      handleMentorshipNotification as EventListener,
    );
    console.log(
      "[CONNECTIONS-PAGE] Global mentorship notification listener attached",
    );

    // INTERNAL REFRESHER: Reduced polling to prevent mobile overheating
    const aggressiveRefreshInterval = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        activeTab === "networking"
      ) {
        // Force refresh every 30 seconds to reduce mobile battery drain
        queryClient.refetchQueries({
          queryKey: ["/api/suite/connections/networking"],
          type: "active",
        });
        console.log(
          "[CONNECTIONS-PAGE] Refresh cycle - checking for new connections",
        );
      }
    }, 30000);

    // WebSocket status monitoring - reduced frequency
    const statusInterval = setInterval(() => {
      if (
        window.chatSocket &&
        window.chatSocket.readyState === WebSocket.OPEN
      ) {
        console.log(
          "[CONNECTIONS-PAGE] WebSocket ACTIVE - Ready for instant notifications",
        );
      } else {
        console.log(
          "[CONNECTIONS-PAGE] WebSocket INACTIVE - Notifications may be delayed",
        );
      }
    }, 60000);

    console.log(
      "[CONNECTIONS-PAGE] Aggressive notification system initialized",
    );

    // Cleanup
    return () => {
      clearInterval(aggressiveRefreshInterval);
      clearInterval(statusInterval);
      document.removeEventListener(
        "networkingNotification",
        handleNetworkingNotification as EventListener,
      );
      document.removeEventListener(
        "mentorshipNotification",
        handleMentorshipNotification as EventListener,
      );
      console.log(
        "[CONNECTIONS-PAGE] Aggressive notification system cleaned up",
      );
    };
  }, [user, queryClient, toast, activeTab]);

  // Fetch connection counts with aggressive real-time settings
  const { data: connectionCounts } = useQuery<ConnectionCounts>({
    queryKey: ["/api/suite/connections/counts"],
    enabled: !!user,
    staleTime: 0, // Always consider data stale for instant updates
    gcTime: 0, // Don't cache for long
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000, // Poll every 30 seconds to prevent mobile overheating
    refetchIntervalInBackground: false,
  });

  // Fetch networking connections with instant refresh settings
  const { data: networkingConnections = [], isLoading: loadingNetworking } =
    useQuery<SuiteConnection[]>({
      queryKey: ["/api/suite/connections/networking"],
      enabled: !!user && activeTab === "networking",
      staleTime: 0, // Always fetch fresh data
      gcTime: 0, // No caching delay
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: activeTab === "networking" ? 30000 : false, // Reduced polling to prevent overheating
      refetchIntervalInBackground: false,
    });

  // Fetch mentorship connections with instant refresh settings
  const { data: mentorshipConnections = [], isLoading: loadingMentorship } =
    useQuery<SuiteConnection[]>({
      queryKey: ["/api/suite/connections/mentorship"],
      enabled: !!user && activeTab === "mentorship",
      staleTime: 0, // Always fetch fresh data
      gcTime: 0, // No caching delay
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: activeTab === "mentorship" ? 30000 : false, // Reduced polling to prevent overheating
      refetchIntervalInBackground: false,
    });

  // Combine API data with real-time updates for instant display, excluding removed connections
  const displayNetworkingConnections = [
    ...realtimeConnections,
    ...networkingConnections.filter(
      (conn) =>
        !realtimeConnections.some((rtConn) => rtConn.id === conn.id) &&
        !removedConnectionIds.has(conn.id),
    ),
  ].filter((conn) => !removedConnectionIds.has(conn.id));

  const displayConnectionCounts = realtimeCounts || connectionCounts;

  // Sync real-time data with API data and clear stale data
  useEffect(() => {
    if (connectionCounts && !realtimeCounts) {
      setRealtimeCounts(connectionCounts);
    }

    // Clear real-time connections when API returns empty data
    if (networkingConnections.length === 0 && realtimeConnections.length > 0) {
      console.log(
        "[CONNECTIONS-PAGE] Clearing stale networking real-time connections",
      );
      setRealtimeConnections([]);
    }

    if (
      mentorshipConnections.length === 0 &&
      realtimeMentorshipConnections.length > 0
    ) {
      console.log(
        "[CONNECTIONS-PAGE] Clearing stale mentorship real-time connections",
      );
      setRealtimeMentorshipConnections([]);
    }
  }, [
    connectionCounts,
    networkingConnections,
    mentorshipConnections,
    realtimeConnections.length,
    realtimeMentorshipConnections.length,
  ]);

  // Combine API data with real-time updates for instant mentorship display, excluding removed connections
  const displayMentorshipConnections = [
    ...realtimeMentorshipConnections,
    ...mentorshipConnections.filter(
      (conn) =>
        !realtimeMentorshipConnections.some(
          (rtConn) => rtConn.id === conn.id,
        ) && !removedConnectionIds.has(conn.id),
    ),
  ].filter((conn) => !removedConnectionIds.has(conn.id));

  // Fetch job applications with instant refresh settings
  const { data: jobApplications = [], isLoading: loadingJobs } = useQuery<
    SuiteConnection[]
  >({
    queryKey: ["/api/suite/connections/jobs"],
    enabled: !!user && activeTab === "jobs",
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // No caching delay
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: activeTab === "jobs" ? 30000 : false, // Reduced polling to prevent overheating
    refetchIntervalInBackground: false,
  });

  // Handle connection response (accept/decline)
  const respondToConnectionMutation = useMutation({
    mutationFn: async ({
      connectionId,
      action,
      type,
    }: {
      connectionId: number;
      action: "accept" | "decline";
      type: "networking" | "mentorship";
    }) => {
      const endpoint =
        type === "networking"
          ? `/api/suite/connections/networking/${connectionId}/respond`
          : `/api/suite/connections/mentorship/${connectionId}/respond`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Failed to respond to connection");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      const { type, action } = variables;

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [`/api/suite/connections/${type}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      toast({
        title:
          action === "accept" ? "Connection Accepted!" : "Connection Declined",
        description:
          action === "accept"
            ? "You can now message this professional contact."
            : "Connection request has been declined.",
      });

      if (data.isMatch && action === "accept") {
        // Show match notification
        toast({
          title: "It's a Professional Match!",
          description: "Both of you have connected. Start networking!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to respond to connection request.",
        variant: "destructive",
      });
    },
  });

  // Listen for real-time connection notifications
  useEffect(() => {
    const handleNetworkingConnection = (event: Event) => {
      if (event instanceof CustomEvent) {
        const data = event.detail;
        console.log("🔔 Received networking connection event:", data);

        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/networking"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });

        // Show different toast based on match or like
        if (data.isMatch) {
          toast({
            title: "🎉 Professional Match!",
            description: `You matched with ${data.fromUserInfo?.fullName || "someone"}! Start networking now.`,
          });
        } else {
          toast({
            title: "💼 New Professional Like!",
            description: `${data.fromUserInfo?.fullName || "Someone"} has liked your networking profile!`,
          });
        }
      }
    };

    const handleMentorshipConnection = (event: Event) => {
      if (event instanceof CustomEvent) {
        const data = event.detail;
        console.log("🔔 Received mentorship connection event:", data);

        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/mentorship"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });

        // Show different toast based on match or like
        if (data.isMatch) {
          toast({
            title: "🎉 Mentorship Match!",
            description: `You matched with ${data.fromUserInfo?.fullName || "someone"}! Start your mentorship journey now.`,
          });
        } else {
          toast({
            title: "💡 New Mentorship Interest!",
            description: `${data.fromUserInfo?.fullName || "Someone"} is interested in mentorship with you!`,
          });
        }
      }
    };

    const handleJobApplication = (event: Event) => {
      if (event instanceof CustomEvent) {
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/jobs"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });

        toast({
          title: "New Job Application!",
          description: "Someone has applied to your job posting.",
        });
      }
    };

    // Listen for global notification events (dispatched by websocket-init.ts)
    document.addEventListener(
      "networkingNotification",
      handleNetworkingConnection,
    );
    document.addEventListener(
      "mentorshipNotification",
      handleMentorshipConnection,
    );
    window.addEventListener("job_application_received", handleJobApplication);

    // Legacy event listeners for compatibility
    window.addEventListener(
      "networking:connection",
      handleNetworkingConnection,
    );
    window.addEventListener(
      "networking_connection_request",
      handleNetworkingConnection,
    );
    window.addEventListener("networking_match", handleNetworkingConnection);
    window.addEventListener(
      "mentorship_connection_request",
      handleMentorshipConnection,
    );
    window.addEventListener("mentorship_match", handleMentorshipConnection);

    return () => {
      document.removeEventListener(
        "networkingNotification",
        handleNetworkingConnection,
      );
      document.removeEventListener(
        "mentorshipNotification",
        handleMentorshipConnection,
      );
      window.removeEventListener(
        "job_application_received",
        handleJobApplication,
      );

      // Legacy cleanup
      window.removeEventListener(
        "networking:connection",
        handleNetworkingConnection,
      );
      window.removeEventListener(
        "networking_connection_request",
        handleNetworkingConnection,
      );
      window.removeEventListener(
        "networking_match",
        handleNetworkingConnection,
      );
      window.removeEventListener(
        "mentorship_connection_request",
        handleMentorshipConnection,
      );
      window.removeEventListener(
        "mentorship_match",
        handleMentorshipConnection,
      );
    };
  }, [queryClient, toast]);

  const renderConnectionCard = (
    connection: SuiteConnection,
    type: "networking" | "mentorship" | "jobs",
  ) => {
    const isMatched = connection.matched;
    const isPending = !isMatched && connection.action === "like";
    const isJobApplication = type === "jobs";

    const getTypeColors = (type: string) => {
      switch (type) {
        case "networking":
          return {
            gradient: "from-blue-500/10 to-cyan-500/10",
            border: "border-blue-500/20",
            accent: "text-blue-400",
            bg: "bg-blue-500/20",
          };
        case "mentorship":
          return {
            gradient: "from-emerald-500/10 to-teal-500/10",
            border: "border-emerald-500/20",
            accent: "text-emerald-400",
            bg: "bg-emerald-500/20",
          };
        case "jobs":
          return {
            gradient: "from-purple-500/10 to-pink-500/10",
            border: "border-purple-500/20",
            accent: "text-purple-400",
            bg: "bg-purple-500/20",
          };
        default:
          return {
            gradient: "from-slate-500/10 to-gray-500/10",
            border: "border-slate-500/20",
            accent: "text-slate-400",
            bg: "bg-slate-500/20",
          };
      }
    };

    const colors = getTypeColors(type);

    return (
      <motion.div
        key={connection.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{
          type: "tween",
          duration: 0.2,
          ease: "easeOut",
        }}
        className="w-full group cursor-pointer transform-gpu will-change-transform"
        onClick={() => {
          handleConnectionCardClick(connection, type);
        }}
        data-connection-id={connection.id}
        style={{
          contain: "layout style paint",
          transform: "translateZ(0)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl transform-gpu will-change-transform shadow-lg"
          style={{
            transition: "none",
            contain: "layout style paint",
          }}
        >
          {/* Background Photo */}
          <div className="absolute inset-0">
            {(() => {
              // Check if professional photo should be shown based on visibility preferences
              let showProfilePhoto = true;

              // Parse visibility preferences to check showProfilePhoto setting
              if (connection.fieldVisibility) {
                try {
                  let parsedVisibility: any = {};

                  if (typeof connection.fieldVisibility === "string") {
                    parsedVisibility = JSON.parse(connection.fieldVisibility);
                  } else if (typeof connection.fieldVisibility === "object") {
                    parsedVisibility = connection.fieldVisibility;
                  }

                  // Check if showProfilePhoto is explicitly set to false
                  if (parsedVisibility.showProfilePhoto === false) {
                    showProfilePhoto = false;
                  }

                  console.log("SMALL CARD PHOTO VISIBILITY CHECK:", {
                    type,
                    connectionId: connection.id,
                    fieldVisibility: connection.fieldVisibility,
                    parsedVisibility,
                    showProfilePhoto,
                  });
                } catch (error) {
                  console.error(
                    "Error parsing photo visibility preferences:",
                    error,
                  );
                }
              }

              // Only show photo if visibility allows it
              if (!showProfilePhoto) {
                return (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${colors.gradient}`}
                  />
                );
              }

              // For networking connections, use networking primary photo
              // For mentorship connections, use mentorship primary photo
              // Fallback to user's main photo
              let photoUrl = connection.targetUser.photoUrl;

              if (
                type === "networking" &&
                connection.networkingPrimaryPhotoUrl
              ) {
                photoUrl = connection.networkingPrimaryPhotoUrl;
              } else if (
                type === "mentorship" &&
                connection.mentorshipPrimaryPhotoUrl
              ) {
                photoUrl = connection.mentorshipPrimaryPhotoUrl;
              }

              return photoUrl ? (
                <img
                  src={photoUrl}
                  alt={connection.targetUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${colors.gradient}`}
                />
              );
            })()}
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div
              className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-60`}
            />

            {/* Premium Blur Overlay for Non-Premium Users */}
            {!user?.premiumAccess && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-20 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="mx-auto mb-3 flex items-center justify-center">
                    <span className="text-4xl">👑</span>
                  </div>
                  <p className="text-white text-sm font-semibold">
                    Premium Required
                  </p>
                  <p className="text-white/80 text-xs mt-1">
                    Upgrade to view connections
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="absolute top-3 right-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-white flex items-center justify-center z-10">
            {isMatched ? (
              <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
            ) : isPending ? (
              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
            ) : (
              <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
            )}
          </div>

          {/* Networking Percentage Badge - Only for networking connections */}
          {type === "networking" && (
            <NetworkingCompatibilityBadge
              targetProfileId={connection.targetProfileId}
              targetUserId={connection.targetUserId}
              isPremium={user?.premiumAccess || false}
              onPremiumUpgradeClick={() => setPremiumUpgradeDialogOpen(true)}
            />
          )}

          {/* Mentor/Mentee Badge for Mentorship Cards */}
          {type === "mentorship" && (
            <div className="absolute top-3 left-3 z-10">
              <motion.div
                className="inline-flex items-center px-2 py-1 rounded-lg bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 border border-yellow-300 text-black backdrop-blur-sm shadow-lg"
                style={{
                  boxShadow:
                    "0 4px 8px rgba(251, 191, 36, 0.4), 0 0 16px rgba(251, 191, 36, 0.2)",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-xs font-bold">
                  {connection.targetProfile.role === "mentor"
                    ? "Mentor"
                    : "Mentee"}
                </span>
              </motion.div>
            </div>
          )}

          {/* Status Badge - Only for Connected Users */}
          {isMatched && type !== "mentorship" && (
            <div className="absolute top-3 left-3 z-10">
              <motion.div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/90 border border-green-400 text-white backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
              >
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-semibold">Connected</span>
              </motion.div>
            </div>
          )}

          {/* Connected Badge for Mentorship - positioned differently to avoid overlap */}
          {isMatched && type === "mentorship" && (
            <div className="absolute top-3 right-12 z-10">
              <motion.div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/90 border border-green-400 text-white backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
              >
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-semibold">Connected</span>
              </motion.div>
            </div>
          )}

          <div className="relative p-3 sm:p-4 h-48 flex flex-col">
            <div className="flex flex-col h-full">
              {/* Enhanced Content - Lower Third */}
              <div className="flex-1"></div>
              <div className="pb-1">
                <h3
                  className="text-white text-3xl sm:text-4xl font-black truncate mb-1"
                  style={{
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    contain: "layout style paint",
                  }}
                >
                  {connection.targetUser.fullName.split(" ")[0]}
                </h3>

                {/* Location under name */}
                {connection.targetUser.location && (
                  <div
                    className="flex items-center gap-1"
                    style={{ contain: "layout style paint" }}
                  >
                    <MapPin className="w-3 h-3 text-yellow-400 drop-shadow-sm" />
                    <span
                      className="text-xs font-medium text-white"
                      style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      {connection.targetUser.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Message Button for Connected Users */}
              {isMatched && (
                <div className="pb-3">
                  <motion.button
                    className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-black flex items-center justify-center gap-2 shadow-2xl border-2 border-white/40 backdrop-blur-md"
                    whileHover={{
                      scale: 1.1,
                      y: -3,
                      background:
                        "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-black">Message</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEmptyState = (type: string) => {
    const getEmptyStateConfig = (type: string) => {
      switch (type) {
        case "networking":
          return {
            title: translate("suiteConnections.noNetworkingConnectionsYet"),
            subtitle: translate(
              "suiteConnections.noNetworkingConnectionsSubtitle",
            ),
            buttonText: translate("suiteConnections.startNetworking"),
            route: "/suite/network",
          };
        case "mentorship":
          return {
            title: translate("suiteConnections.noMentorshipConnectionsYet"),
            subtitle: translate(
              "suiteConnections.noMentorshipConnectionsSubtitle",
            ),
            buttonText: translate("suiteConnections.findMentors"),
            route: "/suite/network",
          };
        case "jobs":
          return {
            title: translate("suiteConnections.noJobApplicationsYet"),
            subtitle: translate("suiteConnections.noJobApplicationsSubtitle"),
            buttonText: translate("suiteConnections.browseJobs"),
            route: "/suite/jobs",
          };
        default:
          return {
            title: "Ready to connect?",
            subtitle: "Start building your professional network today",
            buttonText: "Get Started",
            route: "/suite/network",
          };
      }
    };

    const config = getEmptyStateConfig(type);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="text-center py-16 px-6"
      >
        <div className="max-w-sm mx-auto space-y-4">
          <h3
            className={`text-xl font-semibold leading-tight ${
              darkMode ? "text-slate-200" : "text-gray-800"
            }`}
          >
            {config.title}
          </h3>
          <p
            className={`text-sm leading-relaxed font-light ${
              darkMode ? "text-slate-400" : "text-gray-600"
            }`}
          >
            {config.subtitle}
          </p>
          <motion.button
            onClick={() => {
              if (type === "mentorship") {
                setLocation("/suite/network?tab=mentorship");
              } else if (type === "jobs") {
                setLocation("/suite/network?tab=job");
              } else {
                setLocation("/suite/network?tab=networking");
              }
            }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm rounded-xl hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {config.buttonText}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        darkMode
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"
          : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50"
      }`}
    >
      {/* Ambient lighting effects - conditional based on dark mode */}
      <div className="absolute inset-0">
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

        {/* Optimized background orbs for mobile performance */}
        <div
          className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-2xl transform-gpu"
          style={{
            transform: "translate3d(0, 0, 0)",
            animation: "float1 20s ease-in-out infinite",
            contain: "layout style paint",
          }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-2xl transform-gpu"
          style={{
            transform: "translate3d(0, 0, 0)",
            animation: "float2 25s ease-in-out infinite",
            contain: "layout style paint",
          }}
        />
      </div>

      <AppHeader />

      <div className="relative z-10 flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Elegant Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <div
              className={`relative backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl ${
                darkMode
                  ? "bg-gradient-to-r from-slate-800/80 via-blue-900/30 to-slate-800/80 border border-slate-600/40"
                  : "bg-gradient-to-r from-white/95 via-blue-50/80 to-white/95 border border-gray-200/60"
              }`}
            >
              <div className="grid grid-cols-3 gap-1">
                {(user && isUnder18(user.dateOfBirth)
                  ? [
                      {
                        id: "mentorship",
                        icon: GraduationCap,
                        label: translate("suiteConnections.mentorshipTab"),
                        gradient: "from-purple-500 to-pink-500",
                      },
                      {
                        id: "networking",
                        icon: Users,
                        label: translate("suiteConnections.networkTab"),
                        gradient: "from-emerald-500 to-teal-500",
                      },
                    ]
                  : [
                      {
                        id: "jobs",
                        icon: Briefcase,
                        label: translate("suiteConnections.jobsTab"),
                        gradient: "from-blue-500 to-cyan-500",
                      },
                      {
                        id: "mentorship",
                        icon: GraduationCap,
                        label: translate("suiteConnections.mentorshipTab"),
                        gradient: "from-purple-500 to-pink-500",
                      },
                      {
                        id: "networking",
                        icon: Users,
                        label: translate("suiteConnections.networkTab"),
                        gradient: "from-emerald-500 to-teal-500",
                      },
                    ]
                ).map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative p-2.5 rounded-xl font-semibold transform-gpu will-change-transform ${
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg scale-105`
                        : darkMode
                          ? "text-slate-300 hover:text-white"
                          : "text-gray-600 hover:text-gray-800"
                    }`}
                    style={{
                      transition:
                        "background-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
                      contain: "layout style paint",
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative">
                        <tab.icon className="w-4 h-4" />
                        <NotificationBadge
                          count={
                            tab.id === "jobs"
                              ? jobsCount
                              : tab.id === "mentorship"
                                ? mentorshipCount
                                : tab.id === "networking"
                                  ? networkingCount
                                  : 0
                          }
                          className="top-[-6px] right-[-6px]"
                        />
                      </div>
                      <span className="text-xs font-medium">{tab.label}</span>
                    </div>

                    {activeTab === tab.id && (
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl"
                        style={{
                          transition: "opacity 0.3s ease",
                          contain: "layout style paint",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tab Content with Enhanced Styling */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {!(user && isUnder18(user.dateOfBirth)) && (
              <TabsContent value="jobs" className="mt-6">
                <AnimatePresence mode="wait">
                  {loadingJobs ? (
                    <div className="text-center py-8 text-slate-400">
                      Loading applications...
                    </div>
                  ) : jobApplications.length === 0 ? (
                    renderEmptyState("jobs")
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {jobApplications.map((application) =>
                        renderConnectionCard(application, "jobs"),
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </TabsContent>
            )}

            <TabsContent value="mentorship" className="mt-6">
              <AnimatePresence mode="wait">
                {loadingMentorship ? (
                  <div className="text-center py-8 text-slate-400">
                    Loading connections...
                  </div>
                ) : displayMentorshipConnections.length === 0 ? (
                  renderEmptyState("mentorship")
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {displayMentorshipConnections.map((connection) =>
                      renderConnectionCard(connection, "mentorship"),
                    )}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="networking" className="mt-6">
              <AnimatePresence mode="wait">
                {loadingNetworking ? (
                  <div className="text-center py-8 text-slate-400">
                    Loading connections...
                  </div>
                ) : displayNetworkingConnections.length === 0 ? (
                  renderEmptyState("networking")
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {displayNetworkingConnections.map((connection) =>
                      renderConnectionCard(connection, "networking"),
                    )}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNavigation />

      {/* Networking Connection Modal */}
      {selectedConnection && (
        <Dialog
          open={!!selectedConnection}
          onOpenChange={() => setSelectedConnection(null)}
        >
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-2 border-white/30 shadow-2xl rounded-2xl">
            <div className="relative overflow-hidden">
              {/* Background Animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              </div>

              <div className="relative p-6">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedConnection(null)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Profile Header */}
                <div className="flex items-start space-x-6 mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center">
                      {selectedConnection.targetUser.photoUrl ? (
                        <img
                          src={selectedConnection.targetUser.photoUrl}
                          alt={selectedConnection.targetUser.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-12 h-12 text-blue-400" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center">
                      <Heart className="w-3 h-3 text-white" fill="white" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {selectedConnection.targetUser.fullName}
                    </h2>
                    <p className="text-blue-300 text-lg mb-2">
                      {selectedConnection.targetProfile.currentRole}
                    </p>
                    {selectedConnection.targetProfile.industry && (
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-slate-300" />
                        <span className="text-slate-300">
                          {selectedConnection.targetProfile.industry}
                        </span>
                      </div>
                    )}
                    {selectedConnection.targetUser.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-300" />
                        <span className="text-slate-300">
                          {selectedConnection.targetUser.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Tagline */}
                {selectedConnection.targetProfile.professionalTagline && (
                  <div className="mb-6 p-4 rounded-xl bg-white/10 border border-white/20">
                    <p className="text-white italic text-center">
                      "{selectedConnection.targetProfile.professionalTagline}"
                    </p>
                  </div>
                )}

                {/* What They're Looking For */}
                {selectedConnection.targetProfile.lookingFor && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Looking For
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedConnection.targetProfile.lookingFor}
                    </p>
                  </div>
                )}

                {/* What They Can Offer */}
                {selectedConnection.targetProfile.canOffer && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      Can Offer
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedConnection.targetProfile.canOffer}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {selectedConnection.matched ? (
                    <motion.button
                      className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-2xl transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Start Conversation</span>
                    </motion.button>
                  ) : selectedConnection.action === "like" &&
                    selectedConnection.userId !== user?.id ? (
                    <div className="flex gap-3 w-full">
                      <motion.button
                        onClick={() => {
                          respondToConnectionMutation.mutate({
                            connectionId: selectedConnection.id,
                            action: "accept",
                            type: "networking",
                          });
                          setSelectedConnection(null);
                        }}
                        disabled={respondToConnectionMutation.isPending}
                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Heart className="w-5 h-5" />
                        <span>Accept</span>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          respondToConnectionMutation.mutate({
                            connectionId: selectedConnection.id,
                            action: "decline",
                            type: "networking",
                          });
                          setSelectedConnection(null);
                        }}
                        disabled={respondToConnectionMutation.isPending}
                        className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 font-medium flex items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <X className="w-5 h-5" />
                        <span>Decline</span>
                      </motion.button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Expandable Swipe Card Modal */}
      <ExpandableSwipeCardModal
        user={expandableModalUser}
        isOpen={expandableModalOpen}
        onClose={() => setExpandableModalOpen(false)}
        mode="SUITE"
        profileId={expandableModalProfileId}
        profileType={expandableModalProfileType}
        additionalData={expandableModalAdditionalData}
        isConnectionResponse={expandableModalIsConnectionResponse}
        requesterUserId={expandableModalRequesterUserId}
        isPremium={user?.premiumAccess || false}
        onPremiumUpgradeClick={() => setPremiumUpgradeDialogOpen(true)}
      />

      {/* Premium Upgrade Dialog */}
      <PremiumUpgradeDialog
        open={premiumUpgradeDialogOpen}
        onOpenChange={setPremiumUpgradeDialogOpen}
      />
    </div>
  );
}
