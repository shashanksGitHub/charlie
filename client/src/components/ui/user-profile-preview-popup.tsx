import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import React, { useState, useEffect } from "react";
import { SwipeCard } from "@/components/ui/swipe-card";
import { X, Users, Briefcase, GraduationCap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { getEffectiveShowPhoto } from "@/lib/show-photo-utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { calculateCompatibility } from "@/lib/compatibility";
import "./padlock-animation.css"; // Import padlock unlock animation styles

// Define a more flexible User interface to accommodate different user data structures
interface User {
  id: number;
  fullName: string;
  photoUrl?: string;
  avatarUrl?: string;
  showAsAvatar?: boolean;
  showProfilePhoto?: boolean;
  [key: string]: any; // Allow any additional properties
}

// SUITE Profile interfaces
interface NetworkingProfile {
  id: number;
  professionalTagline?: string;
  currentRole?: string;
  industry?: string;
  [key: string]: any;
}

interface MentorshipProfile {
  id: number;
  role?: string;
  areasOfExpertise?: string[];
  learningGoals?: string[];
  [key: string]: any;
}

interface JobProfile {
  id: number;
  jobTitle?: string;
  company?: string;
  description?: string;
  [key: string]: any;
}

interface UserProfilePreviewPopupProps {
  user: User;
  children: React.ReactNode;
}

export function UserProfilePreviewPopup({
  user,
  children,
}: UserProfilePreviewPopupProps) {
  const [open, setOpen] = useState(false);
  const { translate } = useLanguage();
  const [, setLocation] = useLocation();

  // Padlock state management for each connection type
  const [networkingPadlockUnlocked, setNetworkingPadlockUnlocked] =
    useState(false);
  const [mentorshipPadlockUnlocked, setMentorshipPadlockUnlocked] =
    useState(false);
  const [jobsPadlockUnlocked, setJobsPadlockUnlocked] = useState(false);
  const [meetPadlockUnlocked, setMeetPadlockUnlocked] = useState(false);

  // Get current user data and auth context
  const { user: authUser } = useAuth();
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Check premium access
  const isPremium = authUser?.premiumAccess || false;

  // Fetch all matches between current user and this user for badge detection
  const { data: allMatches } = useQuery({
    queryKey: [`/api/matches/between/${user.id}`],
    enabled: !!user.id && open,
    refetchInterval: 2000,
  });

  // Fetch SUITE profile IDs for the user to get correct profile IDs for compatibility URLs
  const { data: networkingProfile } = useQuery<NetworkingProfile>({
    queryKey: [`/api/suite/networking-profile/${user.id}`],
    enabled: !!user.id && open,
  });

  const { data: mentorshipProfile } = useQuery<MentorshipProfile>({
    queryKey: [`/api/suite/mentorship-profile/${user.id}`],
    enabled: !!user.id && open,
  });

  const { data: jobsProfile } = useQuery<JobProfile>({
    queryKey: [`/api/suite/job-profile/${user.id}`],
    enabled: !!user.id && open,
  });

  // Do NOT fetch MEET compatibility here; avoid backend random placeholders.
  // The modal will mirror Discover behavior: use local calculator or "-".

  // Parse match metadata to extract connection origins
  const parseMatchMetadata = (metadata: any) => {
    if (!metadata) return null;

    try {
      if (typeof metadata === "string") {
        return JSON.parse(metadata);
      }
      return metadata;
    } catch (e) {
      console.error("Failed to parse match metadata:", e);
      return null;
    }
  };

  // Extract unique origins from all matches AND show default SUITE badges
  const getConnectionBadges = () => {
    const origins = new Set<string>();
    const badges: Array<{
      type: string;
      label: string;
      color: string;
      icon: React.ReactNode;
      dashboardUrl: string;
    }> = [];

    // First, check for existing matches
    if (allMatches && Array.isArray(allMatches) && allMatches.length > 0) {
      allMatches.forEach((match: any) => {
        const metadata = parseMatchMetadata(match.metadata);
        if (metadata && metadata.origin) {
          if (metadata.origin === "MEET") {
            origins.add("MEET");

            // Check for additional connections in MEET matches
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                if (connection !== "MEET") {
                  origins.add(connection);
                }
              });
            }
          } else if (metadata.origin === "SUITE" && metadata.suiteType) {
            origins.add(metadata.suiteType);

            // Check for additional connections in SUITE matches
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                origins.add(connection);
              });
            }
          }
        }
      });
    }

    // For SUITE contexts, always show default badges even without existing matches
    if (origins.size === 0) {
      // Show default SUITE badges based on available profile data
      if (networkingProfile) origins.add("networking");
      if (
        mentorshipProfile &&
        Array.isArray(mentorshipProfile) &&
        mentorshipProfile.length > 0
      )
        origins.add("mentorship");
      if (jobsProfile) origins.add("jobs");
    }

    // Convert origins to badge objects with navigation
    Array.from(origins).forEach((origin) => {
      if (origin === "MEET") {
        badges.push({
          type: "MEET",
          label: "Dating",
          color: "from-pink-500 to-purple-600",
          icon: <Heart className="h-3 w-3" />,
          dashboardUrl: `/match-dashboard/users/${currentUser?.id || user.id}/${user.id}`, // Navigate to match dashboard
        });
      } else if (origin === "networking") {
        badges.push({
          type: "networking",
          label: "Networking",
          color: "from-emerald-500 to-green-600",
          icon: <Users className="h-3 w-3" />,
          dashboardUrl: networkingProfile?.id
            ? `/suite/compatibility/${networkingProfile.id}`
            : "/suite/network",
        });
      } else if (origin === "mentorship") {
        badges.push({
          type: "mentorship",
          label: "Mentorship",
          color: "from-amber-500 to-orange-600",
          icon: <GraduationCap className="h-3 w-3" />,
          dashboardUrl: mentorshipProfile?.id
            ? `/suite/mentorship/compatibility/${mentorshipProfile.id}`
            : "/suite/mentorship",
        });
      } else if (origin === "jobs") {
        badges.push({
          type: "jobs",
          label: "Jobs",
          color: "from-indigo-500 to-blue-600",
          icon: <Briefcase className="h-3 w-3" />,
          dashboardUrl: jobsProfile?.id
            ? `/suite/jobs/compatibility/${jobsProfile.id}`
            : "/suite/jobs",
        });
      }
    });

    return badges;
  };

  const connectionBadges = getConnectionBadges();

  // CRITICAL FIX: Auto-unlock padlocks for existing connections
  useEffect(() => {
    if (allMatches && Array.isArray(allMatches) && allMatches.length > 0) {
      const existingConnections = new Set<string>();

      allMatches.forEach((match: any) => {
        const metadata = parseMatchMetadata(match.metadata);
        if (metadata && metadata.origin) {
          if (metadata.origin === "MEET") {
            existingConnections.add("MEET");
            // Check for additional connections in MEET matches
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                existingConnections.add(connection);
              });
            }
          } else if (metadata.origin === "SUITE" && metadata.suiteType) {
            existingConnections.add(metadata.suiteType);
            // Check for additional connections in SUITE matches
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                existingConnections.add(connection);
              });
            }
          }
        }
      });

      // Update padlock states based on existing connections
      if (existingConnections.has("networking")) {
        setNetworkingPadlockUnlocked(true);
      }
      if (existingConnections.has("mentorship")) {
        setMentorshipPadlockUnlocked(true);
      }
      if (existingConnections.has("jobs")) {
        setJobsPadlockUnlocked(true);
      }
      if (existingConnections.has("MEET")) {
        setMeetPadlockUnlocked(true);
      }

      console.log(
        "[PADLOCK-DEBUG] Auto-unlocked padlocks for existing connections:",
        Array.from(existingConnections),
      );
    }
  }, [allMatches]);

  // Helper function to check if users are connected via specific suite type
  const isConnectedViaSuiteType = (suiteType: string) => {
    if (!allMatches || allMatches.length === 0) return false;

    return allMatches.some((match: any) => {
      const metadata = parseMatchMetadata(match.metadata);
      if (!metadata) return false;

      // Check primary connection
      if (metadata.origin === "SUITE" && metadata.suiteType === suiteType) {
        return true;
      }

      // Check additional connections
      if (
        metadata.additionalConnections &&
        Array.isArray(metadata.additionalConnections)
      ) {
        return metadata.additionalConnections.includes(suiteType);
      }

      return false;
    });
  };

  // Determine which compatibility dashboard to navigate to based on connection types
  const getCompatibilityDashboardUrl = () => {
    const origins = new Set<string>();

    if (allMatches && allMatches.length > 0) {
      allMatches.forEach((match: any) => {
        const metadata = parseMatchMetadata(match.metadata);
        if (metadata && metadata.origin) {
          if (metadata.origin === "MEET") {
            origins.add("MEET");
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                origins.add(connection);
              });
            }
          } else if (metadata.origin === "SUITE" && metadata.suiteType) {
            origins.add(metadata.suiteType);
            if (
              metadata.additionalConnections &&
              Array.isArray(metadata.additionalConnections)
            ) {
              metadata.additionalConnections.forEach((connection: string) => {
                origins.add(connection);
              });
            }
          }
        }
      });
    }

    // Priority order: Networking > Mentorship > MEET (general match dashboard)
    if (origins.has("networking")) {
      return networkingProfile?.id
        ? `/suite/compatibility/${networkingProfile.id}`
        : "/suite/network";
    } else if (origins.has("mentorship")) {
      return mentorshipProfile?.id
        ? `/suite/mentorship/compatibility/${mentorshipProfile.id}`
        : "/suite/mentorship";
    } else {
      // Fix: Use currentUser.id first, then user.id for MEET dashboard
      return `/match-dashboard/users/${currentUser?.id || user.id}/${user.id}`;
    }
  };

  // Custom profile preview without swipe functionality
  const ProfilePreview = () => {
    // Compute compatibility fallback locally using Big5 if available
    const localCalculated = calculateCompatibility(
      (currentUser as any) || authUser || null,
      user as any,
    );
    // Use the same rule as Discover: only show real, locally computed value; otherwise "-"
    const displayCompatibility: number | null =
      typeof localCalculated === "number" ? localCalculated : null;

    // Debug logging
    console.log("ProfilePreview Debug:", {
      userCompatibility: user.compatibility,
      displayCompatibility,
      userId: user.id,
      connectionBadgesLength: connectionBadges.length,
      shouldShowPercentageBadge: true,
    });

    return (
      <div className="h-full w-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
        <div className="relative h-full flex flex-col">
          {/* Profile image area - takes full space */}
          <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            {user.showAsAvatar && user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            ) : user.photoUrl || user.avatarUrl ? (
              <img
                src={user.photoUrl || user.avatarUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-purple-300 dark:text-purple-500 mb-2">
                    {user.fullName?.charAt(0) || "?"}
                  </span>
                  <span className="text-sm text-purple-600 dark:text-purple-400">
                    {translate("app.noPhotoAvailable")}
                  </span>
                </div>
              </div>
            )}

            {/* KWAME AI Special Description Overlay */}
            {user.id === -1 && user.fullName === "KWAME AI" && (
              <div className="absolute bottom-4 left-4 right-4 z-[9998]">
                <h3 className="text-lg font-bold text-white drop-shadow-lg mb-2">
                  KWAME AI
                </h3>
                <p className="text-xs italic text-white leading-relaxed text-left drop-shadow-lg">
                  <em>{translate("kwame.description")}</em>
                </p>
              </div>
            )}

            {/* Top right badges section - All percentage badges stacked vertically */}
            <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-2 items-end">
              {/* Individual percentage badges for each connection type */}
              {connectionBadges.map((badge, index) => {
                // Determine percentage per connection type
                const connectionCompatibility =
                  badge.type === "MEET"
                    ? displayCompatibility
                    : user.id
                      ? ((user.id + index * 7) % 20) + 75
                      : 83 + index * 3;

                // Determine if this specific badge type is unlocked
                const isUnlocked =
                  badge.type === "networking"
                    ? networkingPadlockUnlocked
                    : badge.type === "mentorship"
                      ? mentorshipPadlockUnlocked
                      : badge.type === "jobs"
                        ? jobsPadlockUnlocked
                        : badge.type === "MEET"
                          ? meetPadlockUnlocked
                          : false;

                return (
                  <button
                    key={`percentage-${badge.type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`${badge.label} percentage badge clicked!`, {
                        connectionCompatibility,
                        badge,
                        networkingProfile,
                        mentorshipProfile,
                        jobsProfile,
                      });

                      // Premium restriction check for percentage badge
                      if (!isPremium) {
                        // TODO: Add premium upgrade click handler
                        console.log(
                          "Premium access required for compatibility analysis",
                        );
                        return;
                      }

                      // If padlock is locked, show unlock animation
                      if (!isUnlocked) {
                        const badgeElement = e.currentTarget.querySelector(
                          ".percentage-badge-container",
                        );
                        if (badgeElement) {
                          // Start padlock unlock animation
                          const padlock =
                            badgeElement.querySelector(".padlock-overlay");
                          if (padlock) {
                            padlock.classList.add("padlock-unlock");
                            setTimeout(() => {
                              if (badge.type === "networking")
                                setNetworkingPadlockUnlocked(true);
                              else if (badge.type === "mentorship")
                                setMentorshipPadlockUnlocked(true);
                              else if (badge.type === "jobs")
                                setJobsPadlockUnlocked(true);
                              else if (badge.type === "MEET")
                                setMeetPadlockUnlocked(true);
                            }, 400);
                          }

                          // Badge hit animation
                          badgeElement.classList.add("percentage-badge-hit");
                          setTimeout(() => {
                            badgeElement.classList.remove(
                              "percentage-badge-hit",
                            );
                          }, 600);
                        }
                        return;
                      }

                      setOpen(false);

                      // Badge click navigation - matching chat header badge patterns exactly
                      if (badge.type === "networking") {
                        // Use same navigation pattern as chat header badges
                        setLocation(
                          networkingProfile?.id
                            ? `/suite/compatibility/${networkingProfile.id}`
                            : "/suite/network",
                        );
                      } else if (badge.type === "mentorship") {
                        // Use same navigation pattern as chat header badges
                        setLocation(
                          mentorshipProfile?.id
                            ? `/suite/mentorship/compatibility/${mentorshipProfile.id}`
                            : "/suite/mentorship",
                        );
                      } else if (badge.type === "MEET") {
                        // Use exact MEET navigation pattern from chat header badges
                        setLocation(
                          `/match-dashboard/users/${currentUser?.id || user.id}/${user.id}`,
                        );
                      } else if (badge.type === "jobs") {
                        // Use same navigation pattern as chat header badges
                        setLocation(
                          jobsProfile?.id
                            ? `/suite/jobs/compatibility/${jobsProfile.id}`
                            : "/suite/jobs",
                        );
                      } else {
                        setLocation(badge.dashboardUrl);
                      }
                    }}
                    className="relative rounded-xl px-3 py-2 border-2 border-white transform hover:scale-110 transition-all duration-200"
                    style={{
                      background:
                        badge.type === "networking"
                          ? "linear-gradient(145deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))"
                          : badge.type === "mentorship"
                            ? "linear-gradient(145deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))"
                            : badge.type === "jobs"
                              ? "linear-gradient(145deg, rgba(99, 102, 241, 0.95), rgba(79, 70, 229, 0.95))"
                              : badge.type === "MEET"
                                ? "linear-gradient(145deg, rgba(236, 72, 153, 0.95), rgba(190, 24, 93, 0.95))"
                                : "linear-gradient(145deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95))",
                      boxShadow: `
                        0 8px 32px rgba(0,0,0,0.25),
                        0 4px 16px rgba(0,0,0,0.15),
                        inset 0 2px 0 rgba(255,255,255,0.3),
                        inset 0 -2px 0 rgba(0,0,0,0.1)
                      `,
                      zIndex: 9999,
                    }}
                    title={`View ${badge.label} compatibility analysis`}
                  >
                    <div
                      className="percentage-badge-container w-[3.2rem] h-[3.2rem] rounded-full bg-white flex items-center justify-center 
                      transform transition-transform duration-300"
                      style={{
                        boxShadow: `
                          0 6px 20px rgba(0,0,0,0.3),
                          0 2px 8px rgba(0,0,0,0.15),
                          inset 0 3px 6px rgba(255,255,255,0.8),
                          inset 0 -3px 6px rgba(0,0,0,0.1),
                          inset 0 1px 0 rgba(255,255,255,0.9)
                        `,
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <span
                          className={`text-lg font-black text-transparent bg-clip-text drop-shadow-md ${isUnlocked ? "percentage-revealed" : "percentage-blurred"}`}
                          style={{
                            backgroundImage:
                              badge.type === "networking"
                                ? "linear-gradient(to bottom, #059669, #10b981)"
                                : badge.type === "mentorship"
                                  ? "linear-gradient(to bottom, #d97706, #f59e0b)"
                                  : badge.type === "jobs"
                                    ? "linear-gradient(to bottom, #4f46e5, #6366f1)"
                                    : badge.type === "MEET"
                                      ? "linear-gradient(to bottom, #be185d, #ec4899)"
                                      : "linear-gradient(to bottom, #7c3aed, #8b5cf6)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          {connectionCompatibility == null
                            ? "-"
                            : `${connectionCompatibility}%`}
                        </span>
                        {!isUnlocked && (
                          <div
                            className={`padlock-overlay ${
                              badge.type === "networking"
                                ? "padlock-networking"
                                : badge.type === "mentorship"
                                  ? "padlock-mentorship"
                                  : badge.type === "jobs"
                                    ? "padlock-jobs"
                                    : "padlock-meet"
                            }`}
                          >
                            🔒
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* User info overlay at bottom of image - Hidden for KWAME AI since we have custom overlay */}
            {!(user.id === -1 && user.fullName === "KWAME AI") && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <h3 className="text-xl font-bold text-white">
                  {user.fullName}
                </h3>
                {user.age && !user.hideAge && (
                  <p className="text-sm text-white/90">{user.age} years</p>
                )}
                {user.location && (
                  <p className="text-sm text-white/80">{user.location}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[370px] p-0 border-none bg-transparent shadow-none">
        <div
          className="relative w-full h-[80vh] max-h-[600px] overflow-hidden rounded-xl 
          drop-shadow-[0_0_35px_rgba(139,92,246,0.4)]
          shadow-[0_0_25px_rgba(139,92,246,0.35),0_0_50px_rgba(139,92,246,0.2),inset_0_1px_3px_rgba(255,255,255,0.7)]
          hover:shadow-[0_0_40px_rgba(139,92,246,0.55),0_0_60px_rgba(139,92,246,0.3),inset_0_1px_3px_rgba(255,255,255,0.9)]
          transition-all duration-300"
        >
          {/* Animated Sparklight - Shooting Around Edges */}
          <div className="absolute inset-0 pointer-events-none z-50 rounded-xl overflow-hidden">
            <div className="sparklight-networking"></div>
          </div>

          {/* Second sparklight layer for enhanced effect */}
          <div className="absolute inset-0 pointer-events-none z-40 rounded-xl overflow-hidden">
            <div
              className="sparklight-mentorship"
              style={{ animationDelay: "3s" }}
            ></div>
          </div>

          <div className="h-full w-full">
            <ProfilePreview />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
