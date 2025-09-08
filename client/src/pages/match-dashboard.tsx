import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateCompatibility,
  getTraitCompatibilityScores,
} from "@/lib/compatibility";
import {
  ArrowLeft,
  Heart,
  Brain,
  Target,
  MessageCircle,
  Globe,
  Calendar,
  Zap,
  Star,
  Users,
  MapPin,
  BookOpen,
  Coffee,
  Music,
  Palette,
  Sparkles,
  TrendingUp,
  Award,
  Activity,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  Shield,
  Camera,
  Gamepad2,
  Plane,
  GraduationCap,
  Lightbulb,
  Clock,
  X,
  PieChart,
  CheckCircle,
  Calculator,
  BarChart3,
  Lock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CompatibilityData {
  overallScore: number;
  categories: {
    personality: number;
    lifestyle: number;
    values: number;
    interests: number;
    communication: number;
  };
  insights: {
    strengths: string[];
    growthAreas: string[];
    recommendations: string[];
  };
  profiles: {
    user: {
      name: string;
      age: number;
      location: string;
      photo: string;
      bio: string;
    };
    match: {
      name: string;
      age: number;
      location: string;
      photo: string;
      bio: string;
    };
  };
}

const MatchDashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const { matchId, userId1, userId2 } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    caption: string;
  } | null>(null);
  const [hasOpenedPhotoModal, setHasOpenedPhotoModal] = useState(false);

  // Dark mode detection for dramatic styling
  const [darkMode, setDarkMode] = useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(isDark);
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", checkDarkMode);
    };
  }, []);

  // Dropdown state management for collapsible sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    // All sections start collapsed
    "big5-personality": false,
    "compatibility-radar": false,
    "relationship-strengths": false,
    "growth-opportunities": false,
    "personalized-recommendations": false,
    "relationship-timeline": false,
    "quick-actions": false,
    "conversation-starters": false,
    "date-ideas": false,
    "communication-tips": false,
    "gallery-overview": false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[sectionId];

      // If clicking on an already expanded section, just collapse it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [sectionId]: false,
        };
      }

      // Otherwise, find the currently expanded section (if any) and collapse it,
      // then expand the clicked section
      const currentlyExpandedSection = Object.keys(prev).find(
        (key) => prev[key],
      );
      const updates: Record<string, boolean> = {
        [sectionId]: true,
      };

      // Only add the collapsed section to updates if there was one expanded
      if (currentlyExpandedSection && currentlyExpandedSection !== sectionId) {
        updates[currentlyExpandedSection] = false;
      }

      return {
        ...prev,
        ...updates,
      };
    });
  };

  // Fetch compatibility data - either from match or direct user comparison
  const {
    data: matchData,
    isLoading,
    error,
  } = useQuery({
    queryKey:
      userId1 && userId2
        ? [`/api/compatibility/${userId1}/${userId2}`]
        : [`/api/match-dashboard/${matchId}`],
    enabled: !!(matchId || (userId1 && userId2)), // Enable when either matchId or both userIds are available
    retry: 2, // Retry failed requests
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Fetch match status between the two users
  const { data: matchStatus } = useQuery({
    queryKey: [`/api/matches/between/${userId2}`],
    enabled: !!(userId1 && userId2), // Only fetch when we have both user IDs
    retry: 2,
    staleTime: 30000,
  });

  // Fetch messages to determine first conversation date
  const { data: messagesData } = useQuery({
    queryKey: [`/api/messages`],
    enabled: !!(userId1 && userId2),
    retry: 2,
    staleTime: 30000,
  });

  // Enhanced fallback: Fetch user data directly for better user experience
  const { data: userData } = useQuery<any>({
    queryKey: [`/api/profile/${userId2}`],
    enabled: !!userId2, // Always try to fetch user data when userId2 is available
    retry: 2,
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch current user's profile data for their photo and info
  const { data: currentUserData } = useQuery<any>({
    queryKey: [`/api/profile/${userId1}`],
    enabled: !!userId1, // Fetch current user data when userId1 is available
    retry: 2,
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch match user's photos directly (this is what we need!)
  const { data: matchUserPhotos } = useQuery({
    queryKey: [`/api/photos/${userId2}`],
    enabled: !!userId2, // Fetch photos when userId2 is available
    retry: 2,
    staleTime: 60000, // Cache for 1 minute
  });

  // Use real data from API or fallback to mock data for demonstration
  // Handle both match-dashboard API (nested) and direct compatibility API (flat) responses
  const apiData =
    (matchData as any)?.compatibility?.compatibilityData ||
    (matchData as any)?.compatibilityData;

  // Full Screen Photo Modal Component
  const PhotoModal = ({
    photo,
    onClose,
  }: {
    photo: { url: string; caption: string } | null;
    onClose: () => void;
  }) => {
    if (!photo) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-60 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <X className="h-6 w-6 text-white" />
          </motion.button>

          {/* Photo container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                width: "auto",
                height: "auto",
              }}
            />

            {/* Caption - only show if caption exists and is not empty */}
            {photo.caption && photo.caption.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg"
              >
                <p className="text-white text-center font-medium">
                  {photo.caption}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Calculate actual Big 5 compatibility for header
  const actualCompatibilityScore = React.useMemo(() => {
    if (!currentUserData || !userData) return null;
    const score = calculateCompatibility(currentUserData, userData);
    return score === null ? null : Math.round(score);
  }, [currentUserData, userData]);

  // Determine readiness of personalized insights for production
  const bothHaveBig5 = Boolean(
    (currentUserData as any)?.big5Profile && (userData as any)?.big5Profile,
  );
  const insightsData = bothHaveBig5 ? apiData?.insights : undefined;
  const showInsights = Boolean(
    bothHaveBig5 &&
      insightsData &&
      (Array.isArray(insightsData.strengths)
        ? insightsData.strengths.length
        : 0) +
        (Array.isArray(insightsData.growthAreas)
          ? insightsData.growthAreas.length
          : 0) +
        (Array.isArray(insightsData.recommendations)
          ? insightsData.recommendations.length
          : 0) >
        0,
  );

  // Structured view model with no fabricated insight fallbacks
  const mockData: CompatibilityData = {
    overallScore:
      apiData?.overallScore ??
      (typeof actualCompatibilityScore === "number"
        ? actualCompatibilityScore
        : 0),
    categories: {
      personality: apiData?.categories?.personality || 0,
      lifestyle: apiData?.categories?.lifestyle || 0,
      values: apiData?.categories?.values || 0,
      interests: apiData?.categories?.interests || 0,
      communication: apiData?.categories?.communication || 0,
    },
    insights: {
      strengths: Array.isArray(apiData?.insights?.strengths)
        ? apiData!.insights!.strengths
        : [],
      growthAreas: Array.isArray(apiData?.insights?.growthAreas)
        ? apiData!.insights!.growthAreas
        : [],
      recommendations: Array.isArray(apiData?.insights?.recommendations)
        ? apiData!.insights!.recommendations
        : [],
    },
    profiles: {
      user: {
        name: "You",
        age: (currentUserData as any)?.dateOfBirth
          ? Math.floor(
              (Date.now() -
                new Date((currentUserData as any).dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : 28,
        location: (currentUserData as any)?.location || "New York, NY",
        photo: (currentUserData as any)?.photoUrl || "",
        bio:
          (currentUserData as any)?.bio ||
          "Adventure seeker with a passion for photography and travel",
      },
      match: {
        name:
          (
            apiData?.profiles?.match?.name ||
            (userData as any)?.fullName ||
            (userId2 ? `User ${userId2}` : "Your Match")
          )?.split(" ")[0] || "Your Match",
        age:
          apiData?.profiles?.match?.age ||
          ((userData as any)?.dateOfBirth
            ? Math.floor(
                (Date.now() -
                  new Date((userData as any).dateOfBirth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )
            : 26),
        location:
          apiData?.profiles?.match?.location ||
          (userData as any)?.location ||
          "Unknown Location",
        photo:
          apiData?.profiles?.match?.photo || (userData as any)?.photoUrl || "",
        bio:
          apiData?.profiles?.match?.bio ||
          (userData as any)?.bio ||
          "Getting to know each other...",
      },
    },
  };

  // Fetch interests for both users
  const { data: currentUserInterests = [] } = useQuery({
    queryKey: [`/api/interests/${userId1}`],
    enabled: !!userId1,
    retry: 2,
    staleTime: 60000,
  });

  const { data: matchUserInterests = [] } = useQuery({
    queryKey: [`/api/interests/${userId2}`],
    enabled: !!userId2,
    retry: 2,
    staleTime: 60000,
  });

  // Function to calculate interest compatibility and relationships
  const processUserInterests = () => {
    // Ensure we have arrays to work with
    const currentInterests = Array.isArray(currentUserInterests)
      ? currentUserInterests
      : [];
    const matchInterests = Array.isArray(matchUserInterests)
      ? matchUserInterests
      : [];

    // Extract interest names
    const currentInterestNames = currentInterests.map((i) => i.interest);
    const matchInterestNames = matchInterests.map((i) => i.interest);

    // Find exact matches
    const exactMatches = currentInterestNames.filter((interest) =>
      matchInterestNames.includes(interest),
    );

    // Define interest categories for similarity matching
    const interestCategories: Record<string, string[]> = {
      adventure: [
        "Travel",
        "Hiking",
        "Adventure",
        "Outdoor Activities",
        "Camping",
        "Safari",
        "Mountain Climbing",
        "Rock Climbing",
        "Backpacking",
      ],
      creative: [
        "Photography",
        "Art",
        "Painting",
        "Drawing",
        "Creative Writing",
        "Arts & Design",
        "Digital Art",
        "Sculpture",
        "Crafts",
      ],
      culture: [
        "Art Museums",
        "Museums",
        "Cultural Heritage",
        "History",
        "Theatre",
        "Opera",
        "Classical Music",
        "Literature",
        "Poetry",
      ],
      lifestyle: [
        "Coffee",
        "Cooking",
        "Food",
        "Wine",
        "Health & Wellness",
        "Fitness",
        "Yoga",
        "Meditation",
        "Fashion",
      ],
      entertainment: [
        "Live Music",
        "Concerts",
        "Movies",
        "Dancing",
        "Comedy",
        "Theatre",
        "Music",
        "Entertainment",
        "Parties",
      ],
      food: [
        "Cooking",
        "Food",
        "Local Cuisine",
        "Jollof Rice",
        "Traditional Cooking",
        "Street Food",
        "Coffee",
        "Wine Tasting",
      ],
      music: [
        "Music",
        "Live Music",
        "Concerts",
        "Dancing",
        "Singing",
        "Highlife Music",
        "Gospel Music",
        "Afrobeats",
        "Traditional Drumming",
      ],
      sports: [
        "Football",
        "Basketball",
        "Sports",
        "Athletics",
        "Swimming",
        "Boxing",
        "Running",
        "Gym",
        "Tennis",
      ],
      tech: [
        "Technology",
        "Programming",
        "Tech",
        "AI",
        "Coding",
        "Web Development",
        "Gaming",
        "Gadgets",
      ],
      social: [
        "Networking",
        "Community Service",
        "Volunteer Work",
        "Social Events",
        "Family",
        "Friends",
      ],
    };

    // Find similar interests (same category but different names)
    const findSimilarInterests = (
      userInterests: string[],
      otherInterests: string[],
    ): Array<{
      yours: string;
      theirs: string;
      category: string;
      match: number;
    }> => {
      const similar: Array<{
        yours: string;
        theirs: string;
        category: string;
        match: number;
      }> = [];

      userInterests.forEach((userInterest: string) => {
        // Skip if it's an exact match
        if (otherInterests.includes(userInterest)) return;

        // Find category of user's interest
        const userCategory = Object.keys(interestCategories).find(
          (category: string) =>
            interestCategories[category].some(
              (catInterest: string) =>
                catInterest
                  .toLowerCase()
                  .includes(userInterest.toLowerCase()) ||
                userInterest.toLowerCase().includes(catInterest.toLowerCase()),
            ),
        );

        if (userCategory) {
          // Find interests from other user in same category
          otherInterests.forEach((otherInterest: string) => {
            if (
              interestCategories[userCategory].some(
                (catInterest: string) =>
                  catInterest
                    .toLowerCase()
                    .includes(otherInterest.toLowerCase()) ||
                  otherInterest
                    .toLowerCase()
                    .includes(catInterest.toLowerCase()),
              )
            ) {
              similar.push({
                yours: userInterest,
                theirs: otherInterest,
                category: userCategory,
                match: 70 + Math.floor(Math.random() * 25), // 70-95% similarity
              });
            }
          });
        }
      });

      return similar;
    };

    const similarInterests = findSimilarInterests(
      currentInterestNames,
      matchInterestNames,
    );

    // Get icons for interests
    const getInterestIcon = (interest: string): string => {
      const iconMap: Record<string, string> = {
        // Adventure
        Travel: "✈️",
        Hiking: "🥾",
        Adventure: "🏔️",
        "Outdoor Activities": "🏕️",
        Camping: "⛺",
        Safari: "🦁",
        "Mountain Climbing": "🧗",
        "Rock Climbing": "🧗‍♀️",
        Backpacking: "🎒",
        // Creative
        Photography: "📸",
        Art: "🎨",
        Painting: "🖼️",
        Drawing: "✏️",
        "Creative Writing": "✍️",
        "Arts & Design": "🎭",
        "Digital Art": "💻",
        Sculpture: "🗿",
        Crafts: "🧵",
        // Culture
        "Art Museums": "🏛️",
        Museums: "🏛️",
        "Cultural Heritage": "🛕",
        History: "📚",
        Theatre: "🎭",
        Opera: "🎭",
        "Classical Music": "🎼",
        Literature: "📖",
        Poetry: "📝",
        // Lifestyle
        Coffee: "☕",
        Cooking: "👨‍🍳",
        Food: "🍽️",
        Wine: "🍷",
        "Health & Wellness": "💪",
        Fitness: "🏋️",
        Yoga: "🧘",
        Meditation: "🧘‍♀️",
        Fashion: "👗",
        // Entertainment
        "Live Music": "🎵",
        Concerts: "🎤",
        Movies: "🎬",
        Dancing: "💃",
        Comedy: "😂",
        Music: "🎶",
        Entertainment: "🎪",
        Parties: "🎉",
        // Food
        "Local Cuisine": "🍲",
        "Jollof Rice": "🍚",
        "Traditional Cooking": "🥘",
        "Street Food": "🌮",
        "Wine Tasting": "🍾",
        // Ghana-specific
        "Highlife Music": "🎵",
        "Gospel Music": "🎼",
        Afrobeats: "🎶",
        "Traditional Drumming": "🥁",
        "Kente Weaving": "🧵",
        "Cultural Festivals": "🎪",
        // Sports
        Football: "⚽",
        Basketball: "🏀",
        Sports: "🏃",
        Athletics: "🏃‍♀️",
        Swimming: "🏊",
        Boxing: "🥊",
        Running: "🏃",
        Gym: "💪",
        Tennis: "🎾",
        // Tech
        Technology: "💻",
        Programming: "👨‍💻",
        Tech: "📱",
        AI: "🤖",
        Coding: "💻",
        "Web Development": "🌐",
        Gaming: "🎮",
        Gadgets: "📱",
        // Social
        Networking: "🤝",
        "Community Service": "🤝",
        "Volunteer Work": "❤️",
        "Social Events": "🎊",
        Family: "👨‍👩‍👧‍👦",
        Friends: "👥",
      };

      // Return exact match or try partial match
      if (iconMap[interest]) return iconMap[interest];

      // Try to find partial match
      for (const [key, icon] of Object.entries(iconMap)) {
        if (
          key.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(key.toLowerCase())
        ) {
          return icon;
        }
      }

      return "💫"; // Default icon
    };

    // Format shared interests for display
    const formattedSharedInterests: Array<{
      name: string;
      match: number;
      icon: string;
      category: string;
      type: string;
      yours?: string;
      theirs?: string;
    }> = [
      // Exact matches (100% compatibility)
      ...exactMatches.map((interest) => ({
        name: interest,
        match: 100,
        icon: getInterestIcon(interest),
        category: "exact",
        type: "shared",
      })),
      // Similar interests
      ...similarInterests.slice(0, 6).map((similar) => ({
        name: `${similar.yours} / ${similar.theirs}`,
        match: similar.match,
        icon: getInterestIcon(similar.yours),
        category: similar.category,
        type: "similar",
        yours: similar.yours,
        theirs: similar.theirs,
      })),
    ];

    // Add unique interests from each user (if there are fewer than 6 shared/similar)
    if (formattedSharedInterests.length < 6) {
      const remainingSlots = 6 - formattedSharedInterests.length;
      const usedInterests = new Set([
        ...exactMatches,
        ...similarInterests.map((s) => s.yours),
        ...similarInterests.map((s) => s.theirs),
      ]);

      // Add unique interests from current user
      const uniqueCurrentInterests = currentInterestNames
        .filter((interest) => !usedInterests.has(interest))
        .slice(0, Math.ceil(remainingSlots / 2))
        .map((interest) => ({
          name: interest,
          match: 0,
          icon: getInterestIcon(interest),
          category: "unique",
          type: "yours",
        }));

      // Add unique interests from match user
      const uniqueMatchInterests = matchInterestNames
        .filter((interest) => !usedInterests.has(interest))
        .slice(0, Math.floor(remainingSlots / 2))
        .map((interest) => ({
          name: interest,
          match: 0,
          icon: getInterestIcon(interest),
          category: "unique",
          type: "theirs",
        }));

      formattedSharedInterests.push(
        ...uniqueCurrentInterests,
        ...uniqueMatchInterests,
      );
    }

    return {
      sharedInterests: formattedSharedInterests.slice(0, 6),
      totalShared: exactMatches.length,
      totalSimilar: similarInterests.length,
      totalUnique: formattedSharedInterests.filter(
        (interest) => interest.type === "yours" || interest.type === "theirs",
      ).length,
      yourInterests: currentInterestNames,
      theirInterests: matchInterestNames,
    };
  };

  const interestData = processUserInterests();

  // Enhanced debug logging
  console.log("Match Dashboard Debug:", {
    userId1,
    userId2,
    matchId,
    isLoading,
    error: error?.message,
    matchData,
    userData,
    currentUserData,
    currentUserInterests,
    matchUserInterests,
    hasApiData: !!matchData,
    hasUserData: !!userData,
    hasCurrentUserData: !!currentUserData,
    finalUserName:
      (
        apiData?.profiles?.match?.name ||
        (userData as any)?.fullName ||
        (userId2 ? `User ${userId2}` : "Your Match")
      )?.split(" ")[0] || "Your Match",
    currentUserPhoto: (currentUserData as any)?.photoUrl,
    interestProcessingResult: interestData,
  });

  // Enhanced data for new features
  const enhancedData = {
    sharedInterests:
      interestData.sharedInterests.length > 0
        ? interestData.sharedInterests
        : [
            {
              name: "Travel",
              match: 95,
              icon: "✈️",
              category: "adventure",
              type: "fallback",
            },
            {
              name: "Photography",
              match: 88,
              icon: "📸",
              category: "creative",
              type: "fallback",
            },
            {
              name: "Coffee",
              match: 92,
              icon: "☕",
              category: "lifestyle",
              type: "fallback",
            },
            {
              name: "Art Museums",
              match: 85,
              icon: "🎨",
              category: "culture",
              type: "fallback",
            },
            {
              name: "Hiking",
              match: 78,
              icon: "🥾",
              category: "outdoor",
              type: "fallback",
            },
            {
              name: "Live Music",
              match: 82,
              icon: "🎵",
              category: "entertainment",
              type: "fallback",
            },
          ],
    conversationStarters: [
      "Ask about her latest art project",
      "Share your favorite travel destination",
      "Discuss the best coffee shops in NYC",
      "Plan a photography walk together",
    ],
    mutualConnections: 3,
    compatibilityTrend: [65, 72, 78, 83, 85], // Over time
    achievements: [
      {
        name: "Perfect Match",
        icon: "🎯",
        unlocked: true,
        description: "High compatibility score",
      },
      {
        name: "Shared Passions",
        icon: "❤️",
        unlocked: true,
        description: "5+ common interests",
      },
      {
        name: "Great Communicator",
        icon: "💬",
        unlocked: true,
        description: "Strong communication match",
      },
      {
        name: "Adventure Buddy",
        icon: "🏔️",
        unlocked: false,
        description: "Plan your first trip together",
      },
    ],
    personalityRadar: {
      you: [88, 75, 82, 90, 85, 78], // Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism, Adventurousness
      them: [85, 82, 88, 85, 72, 92],
      labels: [
        "Openness",
        "Conscientiousness",
        "Extraversion",
        "Agreeableness",
        "Emotional Stability",
        "Adventurousness",
      ],
    },
    nextSteps: [
      { action: "Send a message", confidence: 95, icon: MessageCircle },
      { action: "Suggest a coffee date", confidence: 88, icon: Coffee },
      { action: "Share a photo", confidence: 82, icon: Camera },
      { action: "Plan an adventure", confidence: 90, icon: Plane },
    ],
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return "from-emerald-500 to-teal-500";
    if (score >= 70) return "from-blue-500 to-cyan-500";
    if (score >= 60) return "from-amber-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  // Helper functions to determine match and conversation status
  const getMatchStatus = () => {
    if (
      !matchStatus ||
      !Array.isArray(matchStatus) ||
      matchStatus.length === 0
    ) {
      return { isMatched: false, matchDate: null };
    }

    // Check if there's a confirmed match between the users
    const confirmedMatch = matchStatus.find((match) => match.matched === true);
    if (confirmedMatch) {
      return {
        isMatched: true,
        matchDate:
          confirmedMatch.createdAt ||
          confirmedMatch.matchedAt ||
          new Date().toISOString(),
      };
    }

    return { isMatched: false, matchDate: null };
  };

  const getFirstConversationDate = () => {
    if (
      !messagesData ||
      !Array.isArray(messagesData) ||
      messagesData.length === 0
    ) {
      return null;
    }

    // Find messages between the two users and get the earliest one
    const relevantMessages = messagesData.filter(
      (message: any) =>
        (message.senderId === parseInt(userId1 || "0") &&
          message.receiverId === parseInt(userId2 || "0")) ||
        (message.senderId === parseInt(userId2 || "0") &&
          message.receiverId === parseInt(userId1 || "0")),
    );

    if (relevantMessages.length === 0) {
      return null;
    }

    // Sort by timestamp and get the first message
    const sortedMessages = relevantMessages.sort(
      (a: any, b: any) =>
        new Date(a.timestamp || a.createdAt).getTime() -
        new Date(b.timestamp || b.createdAt).getTime(),
    );

    return sortedMessages[0].timestamp || sortedMessages[0].createdAt;
  };

  const matchInfo = getMatchStatus();
  const firstConversationDate = getFirstConversationDate();

  // Enhanced loading state with dramatic dark mode styling
  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-all duration-700 ${
          darkMode
            ? "bg-gradient-to-br from-slate-900/95 via-gray-900/90 to-black/95"
            : "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"
        }`}
      >
        <div className="text-center">
          <div
            className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 transition-all duration-700 ${
              darkMode
                ? "border-purple-400 shadow-lg shadow-purple-500/30"
                : "border-pink-400"
            }`}
          ></div>
          <p
            className={`text-lg transition-all duration-700 ${
              darkMode ? "text-white drop-shadow-lg" : "text-white"
            }`}
          >
            Loading compatibility analysis...
          </p>
          {userId1 && userId2 && (
            <p
              className={`text-sm mt-2 transition-all duration-700 ${
                darkMode ? "text-white/70 drop-shadow-md" : "text-white/60"
              }`}
            >
              Analyzing compatibility between users...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state but continue with mock data
  if (error) {
    console.warn("API Error, using mock data:", error.message);
  }

  // Reusable Dropdown Section Component
  const DropdownSection = React.memo(
    ({
      id,
      title,
      icon,
      badge,
      children,
      className = "",
      delay = 0,
    }: {
      id: string;
      title: string;
      icon: React.ReactNode;
      badge?: { text: string; color: string };
      children: React.ReactNode;
      className?: string;
      delay?: number;
    }) => {
      const isExpanded = expandedSections[id];

      return (
        <div
          className={`bg-gradient-to-br backdrop-blur-xl border rounded-2xl overflow-hidden ${className}`}
        >
          {/* Dropdown Header */}
          <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors duration-200"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm">
                {icon}
              </div>
              <h3 className="font-bold text-white">{title}</h3>
              {badge && (
                <Badge
                  className={`${badge.color} text-white px-2 py-0.5 text-xs`}
                >
                  {badge.text}
                </Badge>
              )}
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center"
            >
              <ChevronDown className="h-4 w-4 text-white/80" />
            </motion.div>
          </button>

          {/* Dropdown Content */}
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                key={`${id}-content`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0">{children}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    },
  );

  const CategoryCard = ({
    title,
    score,
    icon,
    description,
  }: {
    title: string;
    score: number;
    icon: React.ReactNode;
    description: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
      className="group"
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <Card className="relative h-full border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl overflow-hidden group-hover:border-white/40">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>

          <CardContent className="relative p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <motion.div
                  className="relative p-4 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/30"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-2xl blur-sm"></div>
                  <div className="relative text-white">{icon}</div>
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1 drop-shadow-lg">
                    {title}
                  </h3>
                  <p className="text-xs text-white/60 font-medium">
                    {description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <motion.div
                  className={`text-2xl font-bold bg-gradient-to-r ${getScoreGradient(score)} bg-clip-text text-transparent drop-shadow-lg`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                >
                  {score}
                </motion.div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Simplified Progress Bar */}
              <div className="relative">
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getScoreGradient(score)} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Simple Score Badge */}
              <div className="flex justify-center">
                {score >= 85 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="flex items-center space-x-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-2 py-1 backdrop-blur-sm"
                  >
                    <Star className="h-3 w-3 text-emerald-300" />
                    <span className="text-xs font-medium text-emerald-200">
                      Excellent
                    </span>
                  </motion.div>
                )}
                {score >= 70 && score < 85 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="flex items-center space-x-1 bg-blue-500/20 border border-blue-400/30 rounded-full px-2 py-1 backdrop-blur-sm"
                  >
                    <ThumbsUp className="h-3 w-3 text-blue-300" />
                    <span className="text-xs font-medium text-blue-200">
                      Great
                    </span>
                  </motion.div>
                )}
                {score >= 60 && score < 70 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="flex items-center space-x-1 bg-amber-500/20 border border-amber-400/30 rounded-full px-2 py-1 backdrop-blur-sm"
                  >
                    <TrendingUp className="h-3 w-3 text-amber-300" />
                    <span className="text-xs font-medium text-amber-200">
                      Good
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  const InsightCard = ({
    title,
    items,
    icon,
    type,
  }: {
    title: string;
    items: string[];
    icon: React.ReactNode;
    type: "strength" | "growth" | "recommendation";
  }) => {
    const getCardStyle = () => {
      switch (type) {
        case "strength":
          return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20";
        case "growth":
          return "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20";
        case "recommendation":
          return "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20";
        default:
          return "border-gray-200 bg-white dark:bg-gray-800";
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`${getCardStyle()} border shadow-sm hover:shadow-md transition-all duration-300`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              {icon}
              <span>{title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm"
                >
                  <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Back Button - Top Left Corner */}
      <Button
        onClick={() => setLocation("/")}
        variant="ghost"
        size="sm"
        className="absolute top-1 left-1 z-50 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all duration-300 rounded-full p-2 w-10 h-10"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Enhanced Animated Background with Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>

        {/* Enhanced Dynamic Light Beams with dramatic dark mode */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`beam-${i}`}
            className={`absolute w-px h-full transition-all duration-700 ${
              darkMode
                ? "bg-gradient-to-b from-transparent via-purple-400/15 to-transparent shadow-lg shadow-purple-500/20"
                : "bg-gradient-to-b from-transparent via-purple-300/30 to-transparent shadow-sm shadow-purple-200/20"
            }`}
            style={{
              left: `${20 + i * 20}%`,
              transformOrigin: "top",
            }}
            animate={{
              scaleY: [0.5, 1.2, 0.5],
              opacity: darkMode ? [0.1, 0.3, 0.1] : [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1,
            }}
          />
        ))}
      </div>

      <motion.div
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          darkMode ? "backdrop-blur-sm" : ""
        }`}
        animate={{
          paddingTop: activeTab === "overview" ? "0.25rem" : "0rem",
          paddingBottom: "1rem",
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      >
        {/* Hero Section */}
        <AnimatePresence>
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0,
                transition: { duration: 0.8, ease: "easeInOut" },
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-3 sm:mb-6 pt-1 sm:pt-4"
            >
              <div className="text-center mb-4">
                {/* Enhanced Profile Section */}
                <div className="relative flex flex-col items-center mb-2">
                  {/* Main Compatibility Display */}
                  <div className="relative flex justify-center items-center mb-8">
                    {/* User Avatar with Enhanced Glow */}
                    <motion.div
                      className="relative"
                      initial={{ scale: 0, rotate: -180, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-500 to-purple-600 rounded-full blur-2xl opacity-40 animate-pulse scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-purple-400 rounded-full blur-lg opacity-60 animate-pulse scale-105"></div>

                      <motion.div
                        className="relative"
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(236, 72, 153, 0.3)",
                            "0 0 40px rgba(236, 72, 153, 0.5)",
                            "0 0 20px rgba(236, 72, 153, 0.3)",
                          ],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Avatar className="relative h-32 w-32 border-4 border-white/90 shadow-2xl ring-4 ring-pink-400/30 backdrop-blur-sm">
                          <AvatarImage
                            src={mockData.profiles.user.photo}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 text-white text-2xl font-bold">
                            Y
                          </AvatarFallback>
                        </Avatar>

                        {/* Floating particles around user avatar */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={`user-particle-${i}`}
                            className="absolute w-2 h-2 bg-pink-300 rounded-full opacity-60"
                            style={{
                              top: `${20 + i * 10}%`,
                              left: `${10 + i * 15}%`,
                            }}
                            animate={{
                              y: [-5, -15, -5],
                              opacity: [0.3, 0.8, 0.3],
                              scale: [0.8, 1.2, 0.8],
                            }}
                            transition={{
                              duration: 2 + i * 0.3,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </motion.div>
                    </motion.div>

                    {/* Connection Lines */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {/* Left connection line */}
                      <motion.div
                        className="absolute left-[25%] sm:left-[22%] md:left-[20%] w-[10%] sm:w-[13%] md:w-[15%] h-px bg-gradient-to-r from-pink-300/60 to-transparent"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 1.8, duration: 1 }}
                        style={{ transformOrigin: "left" }}
                      />
                      {/* Right connection line */}
                      <motion.div
                        className="absolute right-[25%] sm:right-[22%] md:right-[20%] w-[10%] sm:w-[13%] md:w-[15%] h-px bg-gradient-to-l from-cyan-300/60 to-transparent"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 1.8, duration: 1 }}
                        style={{ transformOrigin: "right" }}
                      />
                    </div>

                    {/* Enhanced Central Compatibility Ring */}
                    <motion.div
                      className="relative mx-4 sm:mx-8 md:mx-12"
                      initial={{ scale: 0, rotateY: 180 }}
                      animate={{ scale: 1, rotateY: 0 }}
                      transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
                    >
                      <div className="relative w-32 h-32">
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse scale-110"></div>

                        <svg
                          className="w-full h-full transform -rotate-90"
                          viewBox="0 0 100 100"
                        >
                          <defs>
                            <linearGradient
                              id="centralGradient"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="20%" stopColor="#F59E0B" />
                              <stop offset="40%" stopColor="#F472B6" />
                              <stop offset="60%" stopColor="#8B5CF6" />
                              <stop offset="80%" stopColor="#06B6D4" />
                              <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient
                              id="backgroundGradient"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <stop
                                offset="0%"
                                stopColor="rgba(255,255,255,0.1)"
                              />
                              <stop
                                offset="100%"
                                stopColor="rgba(255,255,255,0.05)"
                              />
                            </linearGradient>
                            <filter id="centralGlow">
                              <feGaussianBlur
                                stdDeviation="4"
                                result="coloredBlur"
                              />
                              <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                            <filter id="scoreGlow">
                              <feGaussianBlur
                                stdDeviation="2"
                                result="scoreBlur"
                              />
                              <feMerge>
                                <feMergeNode in="scoreBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Background ring */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#backgroundGradient)"
                            strokeWidth="2"
                          />

                          {/* Progress ring based on compatibility */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#centralGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            filter="url(#centralGlow)"
                            strokeDasharray="251.2"
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{
                              strokeDashoffset:
                                251.2 - (251.2 * mockData.overallScore) / 100,
                            }}
                            transition={{
                              delay: 0.8,
                              duration: 2,
                              ease: "easeOut",
                            }}
                          />

                          {/* Animated accent ring */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="url(#centralGradient)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeDasharray="40 180"
                            animate={{ rotate: [0, 360] }}
                            transition={{
                              duration: 12,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            opacity="0.6"
                          />
                        </svg>

                        {/* Enhanced Center Score Display */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: 1.2,
                              duration: 0.8,
                              type: "spring",
                            }}
                            className="text-center relative"
                          >
                            {/* Score percentage */}
                            <motion.div
                              className="text-3xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl filter blur-none"
                              animate={{
                                filter: [
                                  "drop-shadow(0 0 10px rgba(251, 191, 36, 0.5))",
                                  "drop-shadow(0 0 20px rgba(244, 114, 182, 0.7))",
                                  "drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))",
                                ],
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            >
                              {mockData.overallScore}%
                            </motion.div>

                            {/* Match status */}
                            <motion.div
                              className="text-xs font-semibold text-white/80 mt-1 tracking-wider uppercase"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.5 }}
                            >
                              {actualCompatibilityScore === null
                                ? "Complete Big 5 to unlock"
                                : mockData.overallScore >= 80
                                  ? "Excellent Match"
                                  : mockData.overallScore >= 60
                                    ? "Great Match"
                                    : "Good Match"}
                            </motion.div>
                          </motion.div>

                          {/* Floating heart icon */}
                          <motion.div
                            className="absolute -top-6"
                            animate={{
                              y: [-2, -8, -2],
                              scale: [0.8, 1.1, 0.8],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <Heart className="h-4 w-4 text-pink-300 fill-pink-300/60" />
                          </motion.div>
                        </div>

                        {/* Orbiting elements */}
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={`orbit-${i}`}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                            style={{
                              top: "50%",
                              left: "50%",
                              transformOrigin: `${45 + i * 3}px 0px`,
                            }}
                            animate={{ rotate: [0, 360] }}
                            transition={{
                              duration: 8 + i * 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {/* Match Avatar with Enhanced Effects */}
                    <motion.div
                      className="relative"
                      initial={{ scale: 0, rotate: 180, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                      whileHover={{ scale: 1.05, rotate: -5 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-cyan-500 to-cyan-600 rounded-full blur-2xl opacity-40 animate-pulse scale-110"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-cyan-400 rounded-full blur-lg opacity-60 animate-pulse scale-105"></div>

                      <motion.div
                        className="relative"
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(6, 182, 212, 0.3)",
                            "0 0 40px rgba(6, 182, 212, 0.5)",
                            "0 0 20px rgba(6, 182, 212, 0.3)",
                          ],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: 1.5,
                        }}
                      >
                        <Avatar className="relative h-32 w-32 border-4 border-white/90 shadow-2xl ring-4 ring-cyan-400/30 backdrop-blur-sm">
                          <AvatarImage
                            src={mockData.profiles.match.photo}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 text-white text-2xl font-bold">
                            {mockData.profiles.match.name
                              ? mockData.profiles.match.name
                                  .charAt(0)
                                  .toUpperCase()
                              : "M"}
                          </AvatarFallback>
                        </Avatar>

                        {/* Floating particles around match avatar */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={`match-particle-${i}`}
                            className="absolute w-2 h-2 bg-cyan-300 rounded-full opacity-60"
                            style={{
                              top: `${25 + i * 8}%`,
                              right: `${15 + i * 12}%`,
                            }}
                            animate={{
                              y: [-3, -12, -3],
                              opacity: [0.4, 0.9, 0.4],
                              scale: [0.9, 1.3, 0.9],
                            }}
                            transition={{
                              duration: 2.5 + i * 0.2,
                              repeat: Infinity,
                              delay: i * 0.3,
                            }}
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Stunning Enhanced Title Section */}
                <motion.div
                  className="relative mb-4 max-w-full overflow-hidden"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  {/* Background Glow Effects */}
                  <div className="absolute inset-0 flex justify-center items-center">
                    <motion.div
                      className="absolute w-96 h-24 bg-gradient-to-r from-pink-500/20 via-purple-500/30 to-cyan-500/20 rounded-full blur-3xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute w-80 h-20 bg-gradient-to-r from-cyan-400/30 via-pink-400/40 to-purple-400/30 rounded-full blur-2xl"
                      animate={{
                        scale: [1.1, 0.9, 1.1],
                        rotate: [0, 180, 360],
                      }}
                      transition={{ duration: 8, repeat: Infinity }}
                    />
                  </div>

                  {/* CTA below the three circles */}
                  {actualCompatibilityScore === null && (
                    <div className="w-full flex justify-center mt-3">
                      <Button
                        onClick={() =>
                          setLocation("/kwame-chat?open=big5_assessment")
                        }
                        className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-lg px-5 py-3 text-sm rounded-full"
                      >
                        Click Here to Complete Personality Analysis
                      </Button>
                    </div>
                  )}

                  {/* Main Title */}
                  <div className="w-full max-w-full mx-auto px-1 sm:px-2">
                    <motion.h1
                      className={`relative font-black text-center mb-4 leading-none whitespace-nowrap ${
                        // Dynamic text sizing based on total title length (You + & + Match name)
                        (() => {
                          const totalLength =
                            (mockData.profiles.user.name || "You").length +
                            (mockData.profiles.match.name || "Your Match")
                              .length +
                            3; // +3 for " & "

                          if (totalLength > 25)
                            return "text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl";
                          if (totalLength > 20)
                            return "text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl";
                          if (totalLength > 15)
                            return "text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl";
                          if (totalLength > 12)
                            return "text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl";
                          if (totalLength > 8)
                            return "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl";
                          return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
                        })()
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 1,
                        duration: 0.8,
                        type: "spring",
                        stiffness: 100,
                      }}
                      style={{
                        wordBreak: "keep-all",
                        overflowWrap: "normal",
                      }}
                    >
                      {/* You */}
                      <motion.span
                        className="inline-block"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <motion.span
                          className="bg-gradient-to-r from-pink-200 via-rose-300 to-pink-400 bg-clip-text text-transparent font-extrabold tracking-tight"
                          animate={{
                            backgroundPosition: [
                              "0% 50%",
                              "100% 50%",
                              "0% 50%",
                            ],
                            textShadow: [
                              "0 0 20px rgba(244, 114, 182, 0.3)",
                              "0 0 40px rgba(244, 114, 182, 0.5)",
                              "0 0 20px rgba(244, 114, 182, 0.3)",
                            ],
                          }}
                          transition={{ duration: 6, repeat: Infinity }}
                          style={{
                            backgroundSize: "200% 200%",
                            filter:
                              "drop-shadow(0 0 15px rgba(244, 114, 182, 0.4))",
                          }}
                        >
                          {mockData.profiles.user.name}
                        </motion.span>
                      </motion.span>

                      {/* Enhanced & Symbol */}
                      <motion.span
                        className="inline-block mx-2 sm:mx-3 md:mx-4"
                        animate={{
                          scale: [1, 1.1, 1],
                          textShadow: [
                            "0 0 15px rgba(255, 255, 255, 0.5)",
                            "0 0 25px rgba(255, 255, 255, 0.7)",
                            "0 0 15px rgba(255, 255, 255, 0.5)",
                          ],
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        whileHover={{ scale: 1.2 }}
                      >
                        <span className="text-white font-bold">&</span>
                      </motion.span>

                      {/* Match Name */}
                      <motion.span
                        className="inline-block"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <motion.span
                          className="bg-gradient-to-r from-cyan-200 via-blue-300 to-cyan-400 bg-clip-text text-transparent font-extrabold tracking-tight"
                          animate={{
                            backgroundPosition: [
                              "0% 50%",
                              "100% 50%",
                              "0% 50%",
                            ],
                            textShadow: [
                              "0 0 20px rgba(6, 182, 212, 0.3)",
                              "0 0 40px rgba(6, 182, 212, 0.5)",
                              "0 0 20px rgba(6, 182, 212, 0.3)",
                            ],
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            delay: 3,
                          }}
                          style={{
                            backgroundSize: "200% 200%",
                            filter:
                              "drop-shadow(0 0 15px rgba(6, 182, 212, 0.4))",
                          }}
                        >
                          {mockData.profiles.match.name || "Your Match"}
                        </motion.span>
                      </motion.span>
                    </motion.h1>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sprinkle Animation for Hero Section */}
        {activeTab !== "overview" && (
          <div className="fixed inset-0 pointer-events-none z-40">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={`sprinkle-${i}`}
                className="absolute w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 40}%`,
                }}
                initial={{
                  scale: 1,
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                animate={{
                  scale: [1, 0.5, 0],
                  opacity: [1, 0.8, 0],
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200 + 100,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeOut",
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        )}

        {/* Enhanced Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: 1,
            y: 0,
            paddingTop: activeTab === "overview" ? undefined : "2rem",
          }}
          transition={{
            delay: activeTab === "overview" ? 1.4 : 0.3,
            duration: 0.6,
            paddingTop: { duration: 1.2, ease: "easeInOut" },
          }}
          className={activeTab !== "overview" ? "pt-8" : ""}
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <motion.div
              className="relative z-20 mb-2"
              animate={{
                marginTop: activeTab === "overview" ? "0.5rem" : "0.25rem",
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <TabsList
                className={`grid w-full grid-cols-3 backdrop-blur-xl p-0.5 sm:p-1 rounded-lg shadow-lg min-h-[32px] sm:min-h-[36px] gap-0.5 sm:gap-1 transition-all duration-700 ${
                  darkMode
                    ? "bg-gray-800/60 border border-gray-600/30 shadow-black/40"
                    : "bg-white/70 border border-purple-200/50 shadow-purple-100/40"
                }`}
              >
                <TabsTrigger
                  value="overview"
                  className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                    darkMode
                      ? "text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20"
                      : "text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10"
                  }`}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="interests"
                  className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                    darkMode
                      ? "text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20"
                      : "text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10"
                  }`}
                >
                  Analysis
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                    darkMode
                      ? "text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20"
                      : "text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10"
                  }`}
                >
                  Insights
                </TabsTrigger>
              </TabsList>
            </motion.div>

            <AnimatePresence mode="wait">
              <TabsContent
                value="overview"
                className="space-y-3 md:space-y-8 mt-6"
              >
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 md:space-y-8"
                >
                  {/* Enhanced Compatibility Journey */}
                  <DropdownSection
                    id="compatibility-journey-overview"
                    title="Compatibility Journey"
                    icon={
                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500/60 via-purple-500/60 to-cyan-500/60 rounded-full flex items-center justify-center border border-white/30 shadow-lg shadow-pink-500/40 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent rounded-full"></div>
                        <TrendingUp className="h-4 w-4 text-white relative z-10 drop-shadow-lg" />
                      </div>
                    }
                    className="from-pink-500/20 via-purple-600/30 to-cyan-500/25 border-pink-400/50"
                    delay={0.4}
                  >
                    <div className="relative">
                      {/* Floating romantic elements */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-4 right-8 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-rose-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div
                          className="absolute bottom-6 left-6 w-20 h-20 bg-gradient-to-br from-purple-400/15 to-cyan-400/15 rounded-full blur-2xl animate-pulse"
                          style={{ animationDelay: "1s" }}
                        ></div>
                        <div
                          className="absolute top-1/2 right-1/4 w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-purple-500/20 rounded-full blur-lg animate-pulse"
                          style={{ animationDelay: "2s" }}
                        ></div>
                      </div>

                      {/* Detailed Timeline */}
                      <div className="space-y-4 mb-6">
                        <div className="relative bg-gradient-to-r from-pink-600/20 via-purple-600/25 to-cyan-600/20 rounded-xl p-4 border border-pink-400/30 backdrop-blur-sm">
                          {/* Timeline line */}
                          <div className="absolute left-8 top-6 bottom-6 w-px bg-gradient-to-b from-cyan-500/60 via-purple-500/60 to-pink-500/60"></div>

                          <div className="space-y-6">
                            {(() => {
                              const timeline = [];

                              // Dynamic match status
                              if (matchInfo.isMatched) {
                                const matchDate = new Date(matchInfo.matchDate);
                                timeline.push({
                                  date: matchDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }),
                                  time: matchDate.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }),
                                  title: "Matched",
                                  description:
                                    "Initial compatibility established",
                                  icon: Heart,
                                  color: "text-pink-400/90",
                                  bgColor: "bg-pink-600/30",
                                  borderColor: "border-pink-500/40",
                                  status: "completed",
                                });
                              } else {
                                timeline.push({
                                  date: "",
                                  time: "",
                                  title: "Unmatched",
                                  description: "No match established yet",
                                  icon: Heart,
                                  color: "text-red-400/90",
                                  bgColor: "bg-red-600/30",
                                  borderColor: "border-red-500/40",
                                  status: "pending",
                                });
                              }

                              // Dynamic first conversation status
                              if (firstConversationDate) {
                                const conversationDate = new Date(
                                  firstConversationDate,
                                );
                                timeline.push({
                                  date: conversationDate.toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  ),
                                  time: conversationDate.toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    },
                                  ),
                                  title: "First Conversation",
                                  description: "Started chatting",
                                  icon: MessageCircle,
                                  color: "text-blue-400/90",
                                  bgColor: "bg-blue-600/30",
                                  borderColor: "border-blue-500/40",
                                  status: "completed",
                                });
                              } else if (matchInfo.isMatched) {
                                timeline.push({
                                  date: "",
                                  time: "",
                                  title: "First Conversation",
                                  description: "No messages yet",
                                  icon: MessageCircle,
                                  color: "text-gray-400/90",
                                  bgColor: "bg-gray-600/30",
                                  borderColor: "border-gray-500/40",
                                  status: "pending",
                                });
                              }

                              // First Date - always upcoming/planned
                              if (
                                matchInfo.isMatched &&
                                firstConversationDate
                              ) {
                                timeline.push({
                                  date: "Future",
                                  time: "Planned",
                                  title: "First Date",
                                  description: "Planning to meet in person",
                                  icon: Calendar,
                                  color: "text-amber-400/90",
                                  bgColor: "bg-amber-600/30",
                                  borderColor: "border-amber-500/40",
                                  status: "upcoming",
                                });
                              }

                              return timeline;
                            })().map((milestone, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.0 + index * 0.1 }}
                                className="relative flex items-start space-x-4"
                              >
                                {/* Timeline dot */}
                                <div
                                  className={`relative z-10 w-10 h-10 ${milestone.bgColor} rounded-full flex items-center justify-center border ${milestone.borderColor} shadow-md backdrop-blur-sm flex-shrink-0`}
                                >
                                  <milestone.icon
                                    className={`h-4 w-4 ${milestone.color}`}
                                  />
                                  {milestone.status === "upcoming" && (
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500/80 rounded-full animate-pulse"></div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-white/95 font-semibold text-sm">
                                      {milestone.title}
                                    </h5>
                                    <div className="flex items-center space-x-2">
                                      {milestone.status === "completed" && (
                                        <div className="w-2 h-2 bg-emerald-500/80 rounded-full"></div>
                                      )}
                                      {milestone.status === "upcoming" && (
                                        <div className="w-2 h-2 bg-amber-500/80 rounded-full animate-pulse"></div>
                                      )}
                                      {milestone.status === "pending" && (
                                        <div className="w-2 h-2 bg-red-500/80 rounded-full"></div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-white/50 mb-2 font-medium">
                                    {milestone.date} • {milestone.time}
                                  </div>
                                  <p className="text-white/75 text-xs leading-relaxed mb-3">
                                    {milestone.description}
                                  </p>

                                  {/* Progress bar */}
                                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-pink-400/20">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-pink-500/80 via-purple-500/80 to-cyan-500/80 rounded-full shadow-sm"
                                      initial={{ width: 0 }}
                                      animate={{ width: `100%` }}
                                      transition={{
                                        delay: 1.2 + index * 0.1,
                                        duration: 1,
                                      }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DropdownSection>

                  {/* Shared Interests */}
                  <DropdownSection
                    id="shared-interests-overview"
                    title="Shared Interests"
                    icon={<Heart className="h-4 w-4 text-pink-300" />}
                    className="from-pink-900/80 via-purple-900/30 to-indigo-900/60 border-pink-400/40"
                    delay={0.6}
                  >
                    <div className="space-y-4">
                      {/* Perfect Matches */}
                      {interestData.totalShared > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 }}
                        >
                          <h4 className="text-emerald-200 text-sm font-bold mb-2 flex items-center">
                            <Heart className="h-3 w-3 mr-2 text-emerald-400" />
                            Perfect Matches ({interestData.totalShared})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {enhancedData.sharedInterests
                              .filter((interest) => interest.type === "shared")
                              .map((interest, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.0 + index * 0.05 }}
                                  className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-500/20 text-emerald-100 text-xs rounded-full border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors duration-200"
                                >
                                  <span>{interest.icon}</span>
                                  <span>{interest.name}</span>
                                </motion.span>
                              ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Similar Interests */}
                      {interestData.totalSimilar > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.2 }}
                        >
                          <h4 className="text-blue-200 text-sm font-bold mb-2 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-2 text-blue-400" />
                            Similar Vibes ({interestData.totalSimilar})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {enhancedData.sharedInterests
                              .filter((interest) => interest.type === "similar")
                              .map((interest, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.4 + index * 0.05 }}
                                  className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-100 text-xs rounded-full border border-blue-400/30 hover:bg-blue-500/30 transition-colors duration-200"
                                  title={`You: ${interest.yours} • Them: ${interest.theirs} • ${interest.match}% match`}
                                >
                                  <span>{interest.icon}</span>
                                  <span>
                                    {interest.yours}/{interest.theirs}
                                  </span>
                                  <span className="text-blue-300 font-medium">
                                    {interest.match}%
                                  </span>
                                </motion.span>
                              ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Your Interests vs Their Interests */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Your Interests */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.6 }}
                        >
                          <h4 className="text-pink-200 text-sm font-bold mb-2 flex items-center">
                            <Users className="h-3 w-3 mr-2 text-pink-400" />
                            Your Interests
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {enhancedData.sharedInterests
                              .filter((interest) => interest.type === "yours")
                              .slice(0, 8)
                              .map((interest, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.8 + index * 0.03 }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 bg-pink-500/15 text-pink-100 text-xs rounded-full border border-pink-400/20 hover:bg-pink-500/25 transition-colors duration-200"
                                >
                                  <span className="text-xs">
                                    {interest.icon}
                                  </span>
                                  <span>{interest.name}</span>
                                </motion.span>
                              ))}

                            {/* Additional interests from profile */}
                            {interestData.yourInterests
                              .filter(
                                (interest) =>
                                  !enhancedData.sharedInterests.some(
                                    (shared) =>
                                      shared.name === interest ||
                                      shared.yours === interest,
                                  ),
                              )
                              .slice(0, 4)
                              .map((interest, index) => (
                                <motion.span
                                  key={`extra-yours-${index}`}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 2.0 + index * 0.03 }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 bg-pink-500/10 text-pink-100/80 text-xs rounded-full border border-pink-400/15 hover:bg-pink-500/20 transition-colors duration-200"
                                >
                                  <span className="text-xs">💫</span>
                                  <span>{interest}</span>
                                </motion.span>
                              ))}
                          </div>
                        </motion.div>

                        {/* Their Interests */}
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.6 }}
                        >
                          <h4 className="text-purple-200 text-sm font-bold mb-2 flex items-center">
                            <Sparkles className="h-3 w-3 mr-2 text-purple-400" />
                            {mockData.profiles.match.name?.split(" ")[0]
                              ? `${mockData.profiles.match.name.split(" ")[0]}'s`
                              : "Their"}{" "}
                            Interests
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {enhancedData.sharedInterests
                              .filter((interest) => interest.type === "theirs")
                              .slice(0, 8)
                              .map((interest, index) => (
                                <motion.span
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.8 + index * 0.03 }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-500/15 text-purple-100 text-xs rounded-full border border-purple-400/20 hover:bg-purple-500/25 transition-colors duration-200"
                                >
                                  <span className="text-xs">
                                    {interest.icon}
                                  </span>
                                  <span>{interest.name}</span>
                                </motion.span>
                              ))}

                            {/* Additional interests from profile */}
                            {interestData.theirInterests
                              .filter(
                                (interest) =>
                                  !enhancedData.sharedInterests.some(
                                    (shared) =>
                                      shared.name === interest ||
                                      shared.theirs === interest,
                                  ),
                              )
                              .slice(0, 4)
                              .map((interest, index) => (
                                <motion.span
                                  key={`extra-theirs-${index}`}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 2.0 + index * 0.03 }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-500/10 text-purple-100/80 text-xs rounded-full border border-purple-400/15 hover:bg-purple-500/20 transition-colors duration-200"
                                >
                                  <span className="text-xs">✨</span>
                                  <span>{interest}</span>
                                </motion.span>
                              ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </DropdownSection>

                  {/* Gallery Section */}
                  {(() => {
                    // Get match user's photos - use the direct photos API first (most reliable)
                    let userPhotos = [];

                    // PRIMARY SOURCE: Direct photos API - this is what we need!
                    if (
                      matchUserPhotos &&
                      Array.isArray(matchUserPhotos) &&
                      matchUserPhotos.length > 0
                    ) {
                      userPhotos = matchUserPhotos.map((photo: any) => ({
                        id: photo.id,
                        url: photo.photoUrl,
                        photoUrl: photo.photoUrl,
                        caption: photo.caption || `Photo ${photo.id}`,
                        isPrimary: photo.isPrimary,
                      }));
                    }
                    // SECONDARY: Try to get photos from matchData compatibility API
                    else if (apiData?.profiles?.match?.photos) {
                      userPhotos = apiData.profiles.match.photos;
                    }
                    // TERTIARY: Try userData profile API (less likely to have photos)
                    else if ((userData as any)?.photos) {
                      userPhotos = (userData as any).photos;
                    } else if ((userData as any)?.profilePhotos) {
                      userPhotos = (userData as any).profilePhotos;
                    }
                    // FALLBACK: Only if no photos found but user exists, show profile photo
                    else if (
                      (userData || apiData?.profiles?.match) &&
                      ((userData as any)?.photoUrl ||
                        apiData?.profiles?.match?.photo ||
                        mockData.profiles.match.photo)
                    ) {
                      userPhotos = [
                        {
                          id: 1,
                          url:
                            (userData as any)?.photoUrl ||
                            apiData?.profiles?.match?.photo ||
                            mockData.profiles.match.photo,
                          photoUrl:
                            (userData as any)?.photoUrl ||
                            apiData?.profiles?.match?.photo ||
                            mockData.profiles.match.photo,
                          caption: "Profile Photo",
                          isPrimary: true,
                        },
                      ];
                    }

                    const hasPhotos = userPhotos && userPhotos.length > 0;
                    const initialDisplayCount = 6;

                    const photosToShow = showAllPhotos
                      ? userPhotos
                      : userPhotos.slice(0, initialDisplayCount);
                    const shouldShowViewAllButton =
                      userPhotos.length > initialDisplayCount;

                    if (!hasPhotos) {
                      return null; // Don't show Gallery section if no photos
                    }

                    return (
                      <DropdownSection
                        id="gallery-overview"
                        title="Gallery"
                        icon={<Camera className="h-4 w-4 text-cyan-300" />}
                        badge={{
                          text: `${userPhotos.length} Photo${userPhotos.length !== 1 ? "s" : ""}`,
                          color: "bg-black/20 border-white/20",
                        }}
                        className="from-gray-900/80 via-blue-900/30 to-cyan-900/60 border-cyan-400/40"
                        delay={0.8}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {photosToShow.map((photo: any, index: number) => (
                            <motion.div
                              key={photo.id || index}
                              initial={
                                hasOpenedPhotoModal
                                  ? false
                                  : { scale: 0, opacity: 0 }
                              }
                              animate={{ scale: 1, opacity: 1 }}
                              transition={
                                hasOpenedPhotoModal
                                  ? {}
                                  : { delay: 1.0 + index * 0.1, type: "spring" }
                              }
                              className="relative group cursor-pointer overflow-hidden rounded-xl"
                              whileHover={{ scale: 1.03 }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling to DropdownSection header
                                setHasOpenedPhotoModal(true); // Mark that a photo modal has been opened
                                // Filter out generic "Photo X" captions
                                const rawCaption =
                                  photo.caption || photo.description || "";
                                const isGenericCaption = /^Photo \d+$/i.test(
                                  rawCaption.trim(),
                                );
                                setSelectedPhoto({
                                  url: photo.url || photo.photoUrl,
                                  caption: isGenericCaption ? "" : rawCaption,
                                });
                              }}
                            >
                              <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-800/60 via-cyan-900/20 to-blue-900/40 rounded-xl overflow-hidden border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300">
                                {/* Actual photo */}
                                {photo.url || photo.photoUrl ? (
                                  <img
                                    src={photo.url || photo.photoUrl}
                                    alt={photo.caption || "Gallery photo"}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <>
                                    {/* Fallback gradient background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>

                                    {/* Photo icon overlay - only for fallback */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                        <Camera className="h-6 w-6 text-white/60" />
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                {/* Hover overlay with caption only - only show if caption exists and is not generic */}
                                {(() => {
                                  const rawCaption =
                                    photo.caption || photo.description || "";
                                  const isGenericCaption = /^Photo \d+$/i.test(
                                    rawCaption.trim(),
                                  );
                                  const showCaption =
                                    rawCaption && !isGenericCaption;

                                  return showCaption ? (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-white text-xs font-medium">
                                          {rawCaption}
                                        </p>
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                              </div>

                              {/* Glow effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                            </motion.div>
                          ))}
                        </div>

                        {/* View All Button - Only show if there are more photos than initial display */}
                        {shouldShowViewAllButton && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.6 }}
                            className="mt-4 text-center"
                          >
                            <Button
                              onClick={() => setShowAllPhotos(!showAllPhotos)}
                              className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-200 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 text-xs px-4 py-2"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              {showAllPhotos
                                ? `Show Less (${initialDisplayCount})`
                                : `View All Photos (${userPhotos.length})`}
                            </Button>
                          </motion.div>
                        )}
                      </DropdownSection>
                    );
                  })()}
                </motion.div>
              </TabsContent>

              <TabsContent value="interests" className="space-y-8 mt-6">
                <motion.div
                  key="interests"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Big 5 Personality Analysis */}
                  <DropdownSection
                    id="big5-personality"
                    title="Big 5 Personality Match"
                    icon={<Brain className="h-5 w-5 text-cyan-400" />}
                    className="from-gray-900/80 via-purple-900/30 to-blue-900/60 border-cyan-400/40 shadow-2xl shadow-cyan-500/20"
                    delay={0.4}
                  >
                    {(() => {
                      // Parse Big 5 data for both users at the top level
                      let currentUserBig5 = null;
                      let otherUserBig5 = null;

                      try {
                        if (currentUserData?.big5Profile) {
                          currentUserBig5 = JSON.parse(
                            currentUserData.big5Profile,
                          );
                        }
                      } catch (error) {
                        console.error(
                          "Failed to parse current user Big 5 profile:",
                          error,
                        );
                      }

                      try {
                        if (userData?.big5Profile) {
                          otherUserBig5 = JSON.parse(userData.big5Profile);
                        }
                      } catch (error) {
                        console.error(
                          "Failed to parse other user Big 5 profile:",
                          error,
                        );
                      }

                      // Extract trait percentiles
                      const currentTraitPercentiles =
                        currentUserBig5?.traitPercentiles || {};
                      const otherTraitPercentiles =
                        otherUserBig5?.traitPercentiles || {};
                      const hasOtherUserData = !!otherUserBig5;

                      // Create user objects for compatibility calculation
                      const user1ForCompatibility = currentUserData
                        ? (currentUserData as any)
                        : null;

                      const user2ForCompatibility = userData
                        ? (userData as any)
                        : null;

                      return (
                        <div className="space-y-4">
                          <div className="text-center mb-6">
                            {hasOtherUserData &&
                              user2ForCompatibility &&
                              (() => {
                                const overallScore = calculateCompatibility(
                                  user1ForCompatibility,
                                  user2ForCompatibility,
                                );
                                if (overallScore === null) {
                                  return (
                                    <div className="mt-2">
                                      <div className="text-sm text-cyan-100/90 mb-2">
                                        Complete the Big 5 assessment to see
                                        your scientific compatibility.
                                      </div>
                                      <Button
                                        onClick={() =>
                                          setLocation(
                                            "/kwame-chat?open=big5_assessment",
                                          )
                                        }
                                        className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                                      >
                                        Click Here to Complete Personality
                                        Analysis
                                      </Button>
                                    </div>
                                  );
                                }
                                return (
                                  <>
                                    <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent mb-1">
                                      {overallScore}% Overall Match
                                    </div>
                                    <p className="text-cyan-100 text-sm">
                                      {overallScore >= 85
                                        ? "Exceptional compatibility"
                                        : overallScore >= 75
                                          ? "Strong compatibility"
                                          : overallScore >= 65
                                            ? "Good potential with effort"
                                            : "Significant differences to navigate"}
                                    </p>
                                  </>
                                );
                              })()}
                            {!otherUserBig5 || !currentUserBig5 ? (
                              <>
                                <div className="text-xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent mb-2">
                                  Partial Analysis Available
                                </div>
                                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-lg p-4 mb-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="text-2xl">🔓</div>
                                    <div className="text-left">
                                      <p className="text-amber-200 text-sm font-medium mb-1">
                                        Unlock Full Compatibility Analysis
                                      </p>
                                      <p className="text-amber-100/80 text-xs">
                                        {userData?.fullName?.split(" ")[0] ||
                                          "Your match"}{" "}
                                        needs to complete their personality
                                        assessment to reveal complete
                                        compatibility insights
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="text-xs text-amber-200/60">
                                      Analysis Completion:{" "}
                                      <span className="font-bold">50%</span>
                                    </div>
                                    <Button className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/40 hover:border-amber-400/60 text-xs px-3 py-1 h-7">
                                      Send Reminder
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-cyan-100 text-sm mb-2">
                                  Your personality insights available below
                                </p>
                                <div className="flex justify-center">
                                  <Button
                                    onClick={() =>
                                      setLocation(
                                        "/kwame-chat?open=big5_assessment",
                                      )
                                    }
                                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                                  >
                                    Start Personality Analysis with KWAME
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </div>

                          {/* Big 5 Traits Analysis */}
                          <div className="space-y-6">
                            {(() => {
                              // Get trait compatibility scores using centralized function
                              const traitScores =
                                hasOtherUserData && user2ForCompatibility
                                  ? getTraitCompatibilityScores(
                                      user1ForCompatibility as any,
                                      user2ForCompatibility as any,
                                    )
                                  : null;

                              const traitsData = [
                                {
                                  trait: "Openness to Experience",
                                  yours: Math.round(
                                    currentTraitPercentiles.Openness || 0,
                                  ),
                                  theirs: hasOtherUserData
                                    ? Math.round(
                                        otherTraitPercentiles.Openness || 0,
                                      )
                                    : null,
                                  compatibility: traitScores
                                    ? Math.round(
                                        (traitScores as any).openness.score,
                                      )
                                    : null,
                                  description:
                                    "Love for new experiences, creativity, and intellectual curiosity",
                                  icon: "🎨",
                                  color: "from-purple-400 to-purple-600",
                                },
                                {
                                  trait: "Conscientiousness",
                                  yours: Math.round(
                                    currentTraitPercentiles.Conscientiousness ||
                                      0,
                                  ),
                                  theirs: hasOtherUserData
                                    ? Math.round(
                                        otherTraitPercentiles.Conscientiousness ||
                                          0,
                                      )
                                    : null,
                                  compatibility: traitScores
                                    ? Math.round(
                                        (traitScores as any).conscientiousness
                                          .score,
                                      )
                                    : null,
                                  description:
                                    "Organization, self-discipline, and goal-oriented behavior",
                                  icon: "📋",
                                  color: "from-blue-400 to-blue-600",
                                },
                                {
                                  trait: "Extraversion",
                                  yours: Math.round(
                                    currentTraitPercentiles.Extraversion || 0,
                                  ),
                                  theirs: hasOtherUserData
                                    ? Math.round(
                                        otherTraitPercentiles.Extraversion || 0,
                                      )
                                    : null,
                                  compatibility: traitScores
                                    ? Math.round(
                                        (traitScores as any).extraversion.score,
                                      )
                                    : null,
                                  description:
                                    "Social energy, assertiveness, and positive emotions",
                                  icon: "🎉",
                                  color: "from-pink-400 to-pink-600",
                                },
                                {
                                  trait: "Agreeableness",
                                  yours: Math.round(
                                    currentTraitPercentiles.Agreeableness || 0,
                                  ),
                                  theirs: hasOtherUserData
                                    ? Math.round(
                                        otherTraitPercentiles.Agreeableness ||
                                          0,
                                      )
                                    : null,
                                  compatibility: traitScores
                                    ? Math.round(
                                        (traitScores as any).agreeableness
                                          .score,
                                      )
                                    : null,
                                  description:
                                    "Compassion, cooperation, and trust in relationships",
                                  icon: "🤝",
                                  color: "from-emerald-400 to-emerald-600",
                                },
                                {
                                  trait: "Neuroticism",
                                  yours: Math.round(
                                    currentTraitPercentiles.Neuroticism || 0,
                                  ),
                                  theirs: hasOtherUserData
                                    ? Math.round(
                                        otherTraitPercentiles.Neuroticism || 0,
                                      )
                                    : null,
                                  compatibility: traitScores
                                    ? Math.round(
                                        (traitScores as any).neuroticism.score,
                                      )
                                    : null,
                                  description:
                                    "Emotional stability and stress management (lower is better)",
                                  icon: "🧘",
                                  color: "from-cyan-400 to-cyan-600",
                                },
                              ];

                              return traitsData.map((trait, index) => (
                                <motion.div
                                  key={trait.trait}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.8 + index * 0.1 }}
                                  className="bg-gradient-to-r from-gray-800/60 via-purple-900/20 to-blue-900/40 rounded-xl p-4 border border-purple-400/30 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
                                >
                                  {/* Trait Header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-2xl">
                                        {trait.icon}
                                      </span>
                                      <div>
                                        <h4 className="text-white font-bold">
                                          {trait.trait}
                                        </h4>
                                        <p className="text-cyan-100 text-xs">
                                          {trait.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-lg font-bold bg-gradient-to-r ${trait.color} bg-clip-text text-transparent`}
                                      >
                                        {trait.compatibility}%
                                      </div>
                                      <div className="text-xs text-purple-300">
                                        Match
                                      </div>
                                    </div>
                                  </div>

                                  {/* Comparison Bars */}
                                  <div className="space-y-3">
                                    {/* Your Score */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-pink-300">
                                          You
                                        </span>
                                        <span className="text-pink-300 font-medium">
                                          {trait.yours}%
                                        </span>
                                      </div>
                                      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                          className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${trait.yours}%` }}
                                          transition={{
                                            delay: 1 + index * 0.1,
                                            duration: 1,
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Their Score */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-cyan-300">
                                          {(
                                            userData?.fullName || "Match"
                                          )?.split(" ")[0] || "Match"}
                                        </span>
                                        <span className="text-cyan-300 font-medium">
                                          {trait.theirs !== null
                                            ? `${trait.theirs}%`
                                            : "Pending"}
                                        </span>
                                      </div>
                                      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                                        {trait.theirs !== null ? (
                                          <motion.div
                                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{
                                              width: `${trait.theirs}%`,
                                            }}
                                            transition={{
                                              delay: 1.2 + index * 0.1,
                                              duration: 1,
                                            }}
                                          />
                                        ) : (
                                          <div className="h-full bg-gradient-to-r from-gray-600/50 to-gray-500/50 rounded-full flex items-center justify-center">
                                            <div className="text-[10px] text-gray-300 font-medium px-2 truncate">
                                              Assessment Needed
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Compatibility Score */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-cyan-200">
                                          Compatibility
                                        </span>
                                        <span className="text-white font-bold">
                                          {trait.theirs !== null
                                            ? `${trait.compatibility}%`
                                            : "Pending"}
                                        </span>
                                      </div>
                                      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                                        {trait.theirs !== null ? (
                                          <motion.div
                                            className={`h-full bg-gradient-to-r ${trait.color} rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{
                                              width: `${trait.compatibility}%`,
                                            }}
                                            transition={{
                                              delay: 1.4 + index * 0.1,
                                              duration: 1,
                                            }}
                                          />
                                        ) : (
                                          <div className="h-full bg-gradient-to-r from-gray-600/40 to-gray-500/40 rounded-full flex items-center justify-center">
                                            <div className="text-[10px] text-gray-300 font-medium px-2 truncate">
                                              Complete to unlock
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Compatibility Insight */}
                                  <div className="mt-3 pt-3 border-t border-purple-500/30">
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                                          trait.theirs !== null
                                            ? trait.color
                                            : "from-gray-500 to-gray-600"
                                        } shadow-sm`}
                                      ></div>
                                      <span className="text-xs text-cyan-100">
                                        {trait.theirs !== null ? (
                                          (() => {
                                            const diff = Math.abs(
                                              trait.yours - trait.theirs,
                                            );
                                            const avgScore =
                                              (trait.yours + trait.theirs) / 2;

                                            // Intelligent insights based on trait type and actual scores
                                            let insight = "";

                                            if (
                                              trait.compatibility !== null &&
                                              trait.compatibility >= 90
                                            ) {
                                              insight =
                                                "Exceptional compatibility";
                                            } else if (
                                              trait.compatibility !== null &&
                                              trait.compatibility >= 80
                                            ) {
                                              insight = "Strong compatibility";
                                            } else if (
                                              trait.compatibility !== null &&
                                              trait.compatibility >= 70
                                            ) {
                                              insight = "Good balance";
                                            } else if (
                                              trait.compatibility !== null &&
                                              trait.compatibility >= 60
                                            ) {
                                              insight = "Workable differences";
                                            } else {
                                              insight =
                                                "Significant differences";
                                            }

                                            // Add specific trait insights
                                            if (trait.trait === "Neuroticism") {
                                              if (
                                                Math.max(
                                                  trait.yours,
                                                  trait.theirs,
                                                ) > 70
                                              ) {
                                                insight +=
                                                  " - Emotional support needed";
                                              } else if (
                                                Math.max(
                                                  trait.yours,
                                                  trait.theirs,
                                                ) < 30
                                              ) {
                                                insight +=
                                                  " - Both emotionally stable";
                                              } else {
                                                insight +=
                                                  " - Mixed emotional stability";
                                              }
                                            } else if (
                                              trait.trait === "Agreeableness"
                                            ) {
                                              if (diff < 10) {
                                                insight +=
                                                  " - Harmonious cooperation";
                                              } else if (diff > 30) {
                                                insight +=
                                                  " - Different conflict styles";
                                              } else {
                                                insight +=
                                                  " - Manageable differences";
                                              }
                                            } else if (
                                              trait.trait === "Extraversion"
                                            ) {
                                              if (diff > 40) {
                                                insight +=
                                                  " - Introvert-extravert dynamic";
                                              } else if (diff < 15) {
                                                insight +=
                                                  " - Similar energy levels";
                                              } else {
                                                insight +=
                                                  " - Balanced social needs";
                                              }
                                            } else {
                                              if (diff < 15) {
                                                insight +=
                                                  " - Similar approaches";
                                              } else if (diff > 30) {
                                                insight +=
                                                  " - Complementary strengths";
                                              } else {
                                                insight +=
                                                  " - Balanced differences";
                                              }
                                            }

                                            return insight;
                                          })()
                                        ) : (
                                          <>
                                            Ask{" "}
                                            {userData?.fullName?.split(
                                              " ",
                                            )[0] || "them"}{" "}
                                            to complete their personality
                                            assessment to unlock full analysis
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              ));
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </DropdownSection>

                  {/* Compatibility Radar Dropdown */}
                  <DropdownSection
                    id="compatibility-radar-interests"
                    title="Compatibility Radar"
                    icon={<Target className="h-4 w-4 text-violet-300" />}
                    className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
                    delay={0.5}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-violet-200">
                          {mockData.overallScore}%
                        </div>
                        <div className="text-xs text-violet-300">
                          {actualCompatibilityScore === null
                            ? "Complete Big 5"
                            : "Overall Match"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Radar Chart */}
                      <div className="flex justify-center">
                        <div className="relative w-80 h-80">
                          <svg viewBox="0 0 200 200" className="w-full h-full">
                            <defs>
                              <radialGradient
                                id="radarGradientInterests"
                                cx="50%"
                                cy="50%"
                                r="50%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="rgba(139, 92, 246, 0.1)"
                                />
                                <stop
                                  offset="50%"
                                  stopColor="rgba(139, 92, 246, 0.05)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="rgba(139, 92, 246, 0)"
                                />
                              </radialGradient>
                              <filter id="radarGlowInterests">
                                <feGaussianBlur
                                  stdDeviation="2"
                                  result="coloredBlur"
                                />
                                <feMerge>
                                  <feMergeNode in="coloredBlur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Background circles */}
                            {[20, 40, 60, 80].map((radius, index) => (
                              <circle
                                key={radius}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="1"
                                opacity={0.6 - index * 0.1}
                              />
                            ))}

                            {/* Radar lines */}
                            {[
                              { angle: 0, label: "Personality" },
                              { angle: 60, label: "Values" },
                              { angle: 120, label: "Communication" },
                              { angle: 180, label: "Lifestyle" },
                              { angle: 240, label: "Interests" },
                              { angle: 300, label: "Adventure" },
                            ].map((dimension, index) => {
                              const radian = (dimension.angle * Math.PI) / 180;
                              const x2 = 100 + 80 * Math.cos(radian);
                              const y2 = 100 + 80 * Math.sin(radian);
                              return (
                                <line
                                  key={dimension.label}
                                  x1="100"
                                  y1="100"
                                  x2={x2}
                                  y2={y2}
                                  stroke="rgba(255, 255, 255, 0.2)"
                                  strokeWidth="1"
                                />
                              );
                            })}

                            {/* Compatibility polygon */}
                            <motion.polygon
                              points={[
                                mockData.categories.personality,
                                mockData.categories.values,
                                mockData.categories.communication,
                                mockData.categories.lifestyle,
                                mockData.categories.interests,
                                92, // Adventure score
                              ]
                                .map((score, index) => {
                                  const angle = index * 60;
                                  const radian = (angle * Math.PI) / 180;
                                  const radius = (score / 100) * 80;
                                  const x = 100 + radius * Math.cos(radian);
                                  const y = 100 + radius * Math.sin(radian);
                                  return `${x},${y}`;
                                })
                                .join(" ")}
                              fill="url(#radarGradientInterests)"
                              stroke="url(#violetGradient)"
                              strokeWidth="2"
                              filter="url(#radarGlowInterests)"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 1,
                                duration: 1.5,
                                type: "spring",
                              }}
                            />

                            {/* Data points */}
                            {[
                              {
                                score: mockData.categories.personality,
                                angle: 0,
                                color: "#8B5CF6",
                              },
                              {
                                score: mockData.categories.values,
                                angle: 60,
                                color: "#EC4899",
                              },
                              {
                                score: mockData.categories.communication,
                                angle: 120,
                                color: "#06B6D4",
                              },
                              {
                                score: mockData.categories.lifestyle,
                                angle: 180,
                                color: "#10B981",
                              },
                              {
                                score: mockData.categories.interests,
                                angle: 240,
                                color: "#F59E0B",
                              },
                              { score: 92, angle: 300, color: "#EF4444" },
                            ].map((point, index) => {
                              const radian = (point.angle * Math.PI) / 180;
                              const radius = (point.score / 100) * 80;
                              const x = 100 + radius * Math.cos(radian);
                              const y = 100 + radius * Math.sin(radian);
                              return (
                                <motion.circle
                                  key={index}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill={point.color}
                                  stroke="white"
                                  strokeWidth="2"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{
                                    delay: 1.2 + index * 0.1,
                                    type: "spring",
                                  }}
                                  whileHover={{ scale: 1.5 }}
                                />
                              );
                            })}

                            {/* Labels */}
                            {[
                              {
                                label: "Personality",
                                angle: 0,
                                score: mockData.categories.personality,
                              },
                              {
                                label: "Values",
                                angle: 60,
                                score: mockData.categories.values,
                              },
                              {
                                label: "Communication",
                                angle: 120,
                                score: mockData.categories.communication,
                              },
                              {
                                label: "Lifestyle",
                                angle: 180,
                                score: mockData.categories.lifestyle,
                              },
                              {
                                label: "Interests",
                                angle: 240,
                                score: mockData.categories.interests,
                              },
                              { label: "Adventure", angle: 300, score: 92 },
                            ].map((dimension, index) => {
                              const radian = (dimension.angle * Math.PI) / 180;
                              let labelRadius = 90;

                              // Special positioning for Lifestyle and Personality labels
                              if (
                                dimension.label === "Lifestyle" ||
                                dimension.label === "Personality"
                              ) {
                                labelRadius = 98; // Move further away from radar
                              }

                              let x = 100 + labelRadius * Math.cos(radian);
                              let y = 100 + labelRadius * Math.sin(radian);

                              // Additional vertical adjustment for better positioning
                              if (
                                dimension.label === "Lifestyle" ||
                                dimension.label === "Personality"
                              ) {
                                y = y - 8; // Move up by 8 pixels
                              }

                              // Adjust text anchor based on position to prevent overflow
                              let textAnchor = "middle";
                              if (x < 30) textAnchor = "start";
                              if (x > 170) textAnchor = "end";

                              return (
                                <motion.g
                                  key={dimension.label}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 1.5 + index * 0.1 }}
                                >
                                  <text
                                    x={x}
                                    y={y}
                                    textAnchor={textAnchor}
                                    dominantBaseline="middle"
                                    className="text-[6px] sm:text-[7px] md:text-[8px] font-medium fill-white/80"
                                  >
                                    {dimension.label}
                                  </text>
                                  <text
                                    x={x}
                                    y={y + 8}
                                    textAnchor={textAnchor}
                                    dominantBaseline="middle"
                                    className="text-[6px] sm:text-[7px] md:text-[8px] font-bold fill-violet-300"
                                  >
                                    {dimension.score}
                                  </text>
                                </motion.g>
                              );
                            })}

                            <defs>
                              <linearGradient
                                id="violetGradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="100%"
                              >
                                <stop offset="0%" stopColor="#8B5CF6" />
                                <stop offset="50%" stopColor="#EC4899" />
                                <stop offset="100%" stopColor="#06B6D4" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Center score */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 2, type: "spring" }}
                              className="text-center bg-black/20 backdrop-blur-sm rounded-full w-14 h-14 flex flex-col items-center justify-center border border-white/20"
                            >
                              <div className="text-sm font-bold text-violet-200">
                                {mockData.overallScore}%
                              </div>
                              <div className="text-xs text-white/60">Match</div>
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      {/* Compatibility Breakdown */}
                      <div className="space-y-4">
                        <div className="text-center">
                          <h4 className="text-base font-bold text-white mb-2">
                            Detailed Compatibility Analysis
                          </h4>
                          <p className="text-sm text-white/60">
                            Explore each dimension of your connection
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {[
                            {
                              category: "Personality Match",
                              score: mockData.categories.personality,
                              icon: "🧠",
                              description:
                                "Your personality traits complement each other beautifully. You both bring different strengths to the relationship while maintaining core compatibility.",
                              details:
                                "Strong complementary traits, balanced introversion/extraversion, similar emotional intelligence levels",
                              color: "from-purple-500 to-purple-600",
                              bgColor: "from-purple-500/10 to-purple-600/10",
                              borderColor: "border-purple-400/30",
                            },
                            {
                              category: "Core Values Alignment",
                              score: mockData.categories.values,
                              icon: "❤️",
                              description:
                                "Exceptional alignment in fundamental life principles and beliefs. You share similar perspectives on what matters most in life.",
                              details:
                                "Family values, career priorities, ethical standards, life philosophy, relationship goals",
                              color: "from-pink-500 to-pink-600",
                              bgColor: "from-pink-500/10 to-pink-600/10",
                              borderColor: "border-pink-400/30",
                            },
                            {
                              category: "Communication Style",
                              score: mockData.categories.communication,
                              icon: "💬",
                              description:
                                "Great potential for meaningful, deep conversations. Your communication styles are highly compatible with mutual understanding.",
                              details:
                                "Active listening skills, emotional expression, conflict resolution, humor compatibility",
                              color: "from-cyan-500 to-cyan-600",
                              bgColor: "from-cyan-500/10 to-cyan-600/10",
                              borderColor: "border-cyan-400/30",
                            },
                            {
                              category: "Lifestyle Compatibility",
                              score: mockData.categories.lifestyle,
                              icon: "🌟",
                              description:
                                "Your daily routines, habits, and lifestyle preferences align well, creating a harmonious living dynamic.",
                              details:
                                "Sleep schedules, social preferences, work-life balance, health habits, living arrangements",
                              color: "from-emerald-500 to-emerald-600",
                              bgColor: "from-emerald-500/10 to-emerald-600/10",
                              borderColor: "border-emerald-400/30",
                            },
                            {
                              category: "Shared Interests",
                              score: mockData.categories.interests,
                              icon: "🎯",
                              description:
                                "Multiple shared hobbies and activities provide excellent foundation for quality time together and mutual growth.",
                              details:
                                "Travel enthusiasm, creative pursuits, sports activities, cultural interests, learning goals",
                              color: "from-amber-500 to-amber-600",
                              bgColor: "from-amber-500/10 to-amber-600/10",
                              borderColor: "border-amber-400/30",
                            },
                            {
                              category: "Adventure Compatibility",
                              score: 92,
                              icon: "✈️",
                              description:
                                "Perfect match for exploration and adventure! You both share a strong desire for new experiences and discoveries.",
                              details:
                                "Travel goals, risk tolerance, spontaneity levels, exploration interests, bucket list alignment",
                              color: "from-red-500 to-red-600",
                              bgColor: "from-red-500/10 to-red-600/10",
                              borderColor: "border-red-400/30",
                            },
                          ].map((item, index) => (
                            <motion.div
                              key={item.category}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 2.2 + index * 0.15,
                                type: "spring",
                              }}
                              className={`relative p-4 bg-gradient-to-br ${item.bgColor} backdrop-blur-xl border ${item.borderColor} rounded-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group overflow-hidden`}
                            >
                              {/* Background decoration */}
                              <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                                <div
                                  className={`w-full h-full bg-gradient-to-br ${item.color} rounded-full blur-xl`}
                                ></div>
                              </div>

                              <div className="relative z-10">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                                      <span className="text-lg">
                                        {item.icon}
                                      </span>
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-bold text-white group-hover:text-white/90 transition-colors">
                                        {item.category}
                                      </h5>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <div className="text-lg font-bold text-white">
                                          {item.score}
                                        </div>
                                        <Badge
                                          className={`bg-gradient-to-r ${item.color} text-white border-0 px-2 py-0.5 text-xs`}
                                        >
                                          {item.score >= 90
                                            ? "Outstanding"
                                            : item.score >= 85
                                              ? "Excellent"
                                              : item.score >= 70
                                                ? "Great"
                                                : "Good"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-sm text-white/90 leading-relaxed">
                                    {item.description}
                                  </p>
                                  <div className="p-2 bg-black/20 rounded-lg backdrop-blur-sm">
                                    <p className="text-xs text-white/70 font-medium mb-1">
                                      Key Areas:
                                    </p>
                                    <p className="text-xs text-white/60">
                                      {item.details}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                                    <span>Compatibility Score</span>
                                    <span>{item.score}</span>
                                  </div>
                                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full bg-gradient-to-r ${item.color} rounded-full relative overflow-hidden`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${item.score}%` }}
                                      transition={{
                                        delay: 2.8 + index * 0.1,
                                        duration: 1.2,
                                        ease: "easeOut",
                                      }}
                                    >
                                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DropdownSection>
                </motion.div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-6 mt-6">
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Relationship Strengths Dropdown */}
                  <DropdownSection
                    id="relationship-strengths"
                    title="Relationship Strengths"
                    icon={<ThumbsUp className="h-4 w-4 text-emerald-300" />}
                    className="from-emerald-500/20 to-green-600/20 border-emerald-400/30"
                    delay={0.1}
                  >
                    {showInsights &&
                    Array.isArray(insightsData?.strengths) &&
                    insightsData.strengths.length > 0 ? (
                      <div className="space-y-2">
                        {insightsData?.strengths?.map(
                          (strength: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + index * 0.1 }}
                              className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/15 transition-colors w-full group cursor-pointer"
                            >
                              <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                              <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors flex-1 text-sm">
                                {strength}
                              </p>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                  <ThumbsUp className="h-3 w-3 text-emerald-300" />
                                </div>
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-emerald-300" />
                          </div>
                          <div>
                            <div className="text-white/90 text-sm font-medium">
                              Locked
                            </div>
                            <div className="text-white/60 text-xs">
                              Complete Big 5 for both profiles to unlock
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            setLocation("/kwame-chat?open=big5_assessment")
                          }
                          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                        >
                          Start assessment
                        </Button>
                      </div>
                    )}
                  </DropdownSection>

                  {/* Growth Opportunities Dropdown */}
                  <DropdownSection
                    id="growth-opportunities"
                    title="Growth Opportunities"
                    icon={<TrendingUp className="h-4 w-4 text-amber-300" />}
                    className="from-amber-500/20 to-orange-600/20 border-amber-400/30"
                    delay={0.2}
                  >
                    {showInsights &&
                    Array.isArray(insightsData?.growthAreas) &&
                    insightsData.growthAreas.length > 0 ? (
                      <div className="space-y-2">
                        {insightsData?.growthAreas?.map(
                          (area: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + index * 0.1 }}
                              className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/15 transition-colors w-full group cursor-pointer"
                            >
                              <div className="w-6 h-6 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <span className="text-amber-300 font-semibold text-sm">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors text-sm">
                                  {area}
                                </p>
                                <div className="mt-1 text-xs text-amber-200/60">
                                  💡 Tip: Focus on open communication and mutual
                                  understanding
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                  <TrendingUp className="h-3 w-3 text-amber-300" />
                                </div>
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-amber-300" />
                          </div>
                          <div>
                            <div className="text-white/90 text-sm font-medium">
                              Locked
                            </div>
                            <div className="text-white/60 text-xs">
                              Complete Big 5 for both profiles to unlock
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            setLocation("/kwame-chat?open=big5_assessment")
                          }
                          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                        >
                          Start assessment
                        </Button>
                      </div>
                    )}
                  </DropdownSection>

                  {/* Personalized Recommendations Dropdown */}
                  <DropdownSection
                    id="personalized-recommendations"
                    title="Personalized Recommendations"
                    icon={<Award className="h-4 w-4 text-blue-300" />}
                    className="from-blue-500/20 to-indigo-600/20 border-blue-400/30"
                    delay={0.3}
                  >
                    {showInsights &&
                    Array.isArray(insightsData?.recommendations) &&
                    insightsData.recommendations.length > 0 ? (
                      <div className="space-y-2">
                        {insightsData?.recommendations?.map(
                          (recommendation: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 + index * 0.1 }}
                              className="relative p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-lg backdrop-blur-sm border border-white/20 hover:border-blue-400/50 transition-all duration-300 group cursor-pointer w-full"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Lightbulb className="h-4 w-4 text-blue-300" />
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-400" />
                                    <span className="text-xs font-semibold text-blue-200">
                                      Tip #{index + 1}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-white/90 leading-relaxed group-hover:text-white transition-colors text-sm">
                                    {recommendation}
                                  </p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <Award className="h-3 w-3 text-blue-300" />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-blue-300" />
                          </div>
                          <div>
                            <div className="text-white/90 text-sm font-medium">
                              Locked
                            </div>
                            <div className="text-white/60 text-xs">
                              Complete Big 5 for both profiles to unlock
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            setLocation("/kwame-chat?open=big5_assessment")
                          }
                          className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                        >
                          Start assessment
                        </Button>
                      </div>
                    )}
                  </DropdownSection>

                  {/* Empty state when insights are not available (Insights tab only) */}
                  {!showInsights && (
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-white/80">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            Personalized insights are locked
                          </div>
                          <div className="text-sm text-white/60">
                            Complete the Big 5 personality assessment for both
                            profiles to unlock strengths, growth areas and
                            recommendations.
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              setLocation("/kwame-chat?open=big5_assessment")
                            }
                            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 shadow-md text-xs px-3 py-2"
                          >
                            Start assessment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>

        {/* Enhanced Particle System with dramatic dark mode */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className={`absolute w-1 h-1 rounded-full transition-all duration-700 ${
                darkMode
                  ? "bg-purple-400/30 shadow-sm shadow-purple-500/20"
                  : "bg-purple-300/50 shadow-sm shadow-purple-200/30"
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.random() * 50 - 25, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};

export default MatchDashboard;
