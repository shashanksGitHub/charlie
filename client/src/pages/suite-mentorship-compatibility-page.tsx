import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Brain,
  Users,
  Clock,
  MessageSquare,
  Globe,
  TrendingUp,
  Target,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface MentorshipCompatibilityDashboardData {
  score: {
    expertiseRelevance: number;
    mentorshipStyleFit: number;
    timeSynergy: number;
    communicationFit: number;
    contextualAlignment: number;
    growthGapPotential: number;
    overallCompatibilityScore: number;
    successProbability: number;
    breakthroughMomentPrediction: number;
    plateauRiskAssessment: number;
    insights: string;
    conversationStarters: string;
    mentorshipRoadmap: string;
    milestonePathway: string;
    skillGapForecast: string;
    analysisData: string;
  };
  analysis: {
    breakdown: {
      expertiseAlignment: number;
      learningGoalsMatch: number;
      availabilitySync: number;
      communicationStyleMatch: number;
      culturalFit: number;
      experienceGap: number;
    };
    insights: string[];
    conversationStarters: string[];
    mentorshipRoadmap: any[];
    milestonePathway: any[];
    skillGapForecast: any[];
  };
  targetProfile: any;
  cached: boolean;
}

// Animated Particles Component
const AnimatedParticles = () => {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number; duration: number }>
  >([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        duration: Math.random() * 20 + 10,
      }));
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/10"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Floating Orbs Component
const FloatingOrbs = () => {
  const orbs = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: Math.random() * 200 + 100,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${
              [
                "rgba(147, 51, 234, 0.15)",
                "rgba(168, 85, 247, 0.15)",
                "rgba(139, 69, 244, 0.15)",
                "rgba(124, 58, 237, 0.15)",
                "rgba(109, 40, 217, 0.15)",
                "rgba(99, 102, 241, 0.15)",
                "rgba(79, 70, 229, 0.15)",
                "rgba(67, 56, 202, 0.15)",
              ][orb.id % 8]
            } 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 50, -20, 0],
            scale: [1, 1.2, 0.8, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default function SuiteMentorshipCompatibilityPage() {
  const { targetProfileId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

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

  // Dropdown state management for collapsible sections - MEET Match Dashboard Implementation
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    // All sections start collapsed
    "mentorship-overview": false,
    "compatibility-insights": false,
    "conversation-starters": false,
    "roadmap-breakdown": false,
    "milestone-pathway": false,
    "skill-forecast": false,
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

  // Fetch compatibility data
  const {
    data: compatibilityData,
    isLoading,
    error,
  } = useQuery<MentorshipCompatibilityDashboardData>({
    queryKey: ["suite-mentorship-compatibility-dashboard", targetProfileId],
    queryFn: async () => {
      const response = await fetch(
        `/api/suite/mentorship/compatibility/dashboard/${targetProfileId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Mentorship compatibility dashboard error:",
          response.status,
          errorText,
        );
        throw new Error(
          `Failed to fetch mentorship compatibility data: ${response.status}`,
        );
      }
      const data = await response.json();
      return data;
    },
    enabled: !!targetProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch current user data for profile photo
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  const handleBack = () => {
    setLocation("/suite/network");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        <FloatingOrbs />
        <AnimatedParticles />
        <div className="relative z-10 text-center space-y-4">
          <motion.div
            className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="text-xl font-medium text-white/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Analyzing mentorship compatibility...
          </motion.p>
        </div>
      </div>
    );
  }

  if (error || !compatibilityData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        <FloatingOrbs />
        <AnimatedParticles />
        <motion.div
          className="relative z-10 text-center space-y-6 p-8 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-6xl">⚠️</div>
          <h2 className="text-3xl font-bold text-white">
            Analysis Unavailable
          </h2>
          <p className="text-white/70 max-w-md text-lg">
            Unable to load mentorship compatibility data. Please try again
            later.
          </p>
          <Button
            onClick={handleBack}
            className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Discover
          </Button>
        </motion.div>
      </div>
    );
  }

  const { score, analysis, targetProfile } = compatibilityData;

  // Extract overall score for profile circles
  const overallScore = score.overallCompatibilityScore || 0;

  // Parse JSON fields safely
  const safeJsonParse = (jsonString: string, defaultValue: any) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  };

  const insights = safeJsonParse(score.insights, analysis.insights || []);
  const conversationStarters = safeJsonParse(
    score.conversationStarters,
    analysis.conversationStarters || [],
  );
  const mentorshipRoadmap = safeJsonParse(
    score.mentorshipRoadmap,
    analysis.mentorshipRoadmap || [],
  );
  const milestonePathway = safeJsonParse(
    score.milestonePathway,
    analysis.milestonePathway || [],
  );
  const skillGapForecast = safeJsonParse(
    score.skillGapForecast,
    analysis.skillGapForecast || [],
  );

  // Render circular score component
  const renderCircularScore = (
    score: number,
    label: string,
    icon: React.ReactNode,
    maxScore = 10,
  ) => {
    const percentage = (score / maxScore) * 100;
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getScoreColor = (score: number, maxScore: number) => {
      const normalizedScore = (score / maxScore) * 100;
      if (normalizedScore >= 80) return "#10B981"; // Green
      if (normalizedScore >= 60) return "#F59E0B"; // Yellow
      return "#EF4444"; // Red
    };

    return (
      <motion.div
        className="flex flex-col items-center space-y-3"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke={getScoreColor(score, maxScore)}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {maxScore === 100 ? `${score}%` : score}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {label}
          </span>
        </div>
      </motion.div>
    );
  };

  // Reusable Dropdown Section Component - Exact MEET Match Dashboard Implementation
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900 relative overflow-hidden">
      <FloatingOrbs />
      <AnimatedParticles />

      {/* Back Button */}
      <motion.button
        onClick={handleBack}
        className="absolute top-1 left-1 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-300 shadow-lg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 px-6">
        {/* Enhanced Profile Photos & Compatibility Section */}
        <motion.div
          className="flex items-center justify-center mb-4 space-x-6 relative px-2 max-w-3xl mx-auto -ml-6 mt-1"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Connecting Line Animation */}
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.2, duration: 1.5 }}
          />

          {/* Current User Photo with MEET-Style Effects */}
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            {/* Dual Background Glow System */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-violet-500 to-purple-600 rounded-full blur-2xl opacity-40 animate-pulse scale-110"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-violet-400 rounded-full blur-lg opacity-60 animate-pulse scale-105"></div>

            <motion.div
              className="relative"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(168, 85, 247, 0.3)",
                  "0 0 40px rgba(168, 85, 247, 0.5)",
                  "0 0 20px rgba(168, 85, 247, 0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="relative h-32 w-32 border-4 border-white/90 shadow-2xl ring-4 ring-purple-400/30 backdrop-blur-sm rounded-full overflow-hidden">
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.fullName || "You"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {currentUser?.fullName?.charAt(0) || "Y"}
                  </div>
                )}
              </div>

              {/* Floating particles around user avatar */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`user-particle-${i}`}
                  className="absolute w-2 h-2 bg-purple-300 rounded-full opacity-60"
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

          {/* MEET-Style Center Compatibility Circle */}
          <motion.div
            className="relative flex-shrink-0"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.6,
              duration: 1,
              type: "spring",
              bounce: 0.3,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative w-24 h-24">
              {/* SVG Progress Circle */}
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <defs>
                  {/* Background gradient for base ring */}
                  <linearGradient
                    id="mentorshipBackgroundGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                  </linearGradient>

                  {/* Central gradient for progress ring */}
                  <linearGradient
                    id="mentorshipCentralGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#A855F7" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>

                  {/* Glow filter */}
                  <filter id="mentorshipGlow">
                    <feGaussianBlur stdDeviation="3" result="scoreBlur" />
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
                  stroke="url(#mentorshipBackgroundGradient)"
                  strokeWidth="2"
                />

                {/* Progress ring based on compatibility */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#mentorshipCentralGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#mentorshipGlow)"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{
                    strokeDashoffset: 251.2 - (251.2 * overallScore) / 100,
                  }}
                  transition={{
                    delay: 1.5,
                    duration: 2,
                    ease: "easeOut",
                  }}
                />
              </svg>

              {/* Center score display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2, type: "spring" }}
                  className="text-center bg-black/20 backdrop-blur-sm rounded-full w-14 h-14 flex flex-col items-center justify-center border border-white/20"
                >
                  <div className="text-sm font-bold text-violet-200">
                    {overallScore}%
                  </div>
                  <div className="text-xs text-white/60">Match</div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Target User Photo with MEET-Style Effects */}
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: 180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
            whileHover={{ scale: 1.05, rotate: -5 }}
          >
            {/* Dual Background Glow System */}
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
              <div className="relative h-32 w-32 border-4 border-white/90 shadow-2xl ring-4 ring-cyan-400/30 backdrop-blur-sm rounded-full overflow-hidden">
                {targetProfile?.primaryPhotoUrl ? (
                  <img
                    src={targetProfile.primaryPhotoUrl}
                    alt={targetProfile?.user?.fullName || "Professional"}
                    className="w-full h-full object-cover"
                  />
                ) : targetProfile?.user?.photoUrl ? (
                  <img
                    src={targetProfile.user.photoUrl}
                    alt={targetProfile?.user?.fullName || "Professional"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {targetProfile?.user?.fullName?.charAt(0) || "P"}
                  </div>
                )}
              </div>

              {/* Floating particles around target avatar */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`target-particle-${i}`}
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
        </motion.div>

        {/* You & User Title - Enhanced with Professional Gradient Styling */}
        <motion.div
          className="text-center mb-12 relative overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {/* Background Glow Effects */}
          <div className="absolute inset-0 flex justify-center items-center">
            <motion.div
              className="absolute w-96 h-24 bg-gradient-to-r from-violet-500/20 via-purple-500/30 to-indigo-500/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-80 h-20 bg-gradient-to-r from-indigo-400/30 via-violet-400/40 to-purple-400/30 rounded-full blur-2xl"
              animate={{
                scale: [1.1, 0.9, 1.1],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />
          </div>

          {/* Main Title with MEET App Dynamic Responsive Sizing */}
          <div className="w-full max-w-full mx-auto px-1 sm:px-2">
            <motion.h1
              className={`relative font-black text-center mb-4 leading-none whitespace-nowrap ${
                // Dynamic text sizing based on total title length (You + & + mentor name)
                (() => {
                  const mentorName = targetProfile?.user?.fullName?.split(' ')[0] || 'Mentor';
                  const totalLength = "You".length + mentorName.length + 3; // +3 for " & "
                  
                  if (totalLength > 18)
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
              {/* "You" with Professional Violet Gradient */}
              <motion.span
                className="inline-block"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.span
                  className="bg-gradient-to-r from-violet-200 via-purple-300 to-violet-400 bg-clip-text text-transparent font-extrabold tracking-tight"
                  animate={{
                    backgroundPosition: [
                      "0% 50%",
                      "100% 50%",
                      "0% 50%",
                    ],
                    textShadow: [
                      "0 0 20px rgba(139, 69, 244, 0.3)",
                      "0 0 40px rgba(139, 69, 244, 0.5)",
                      "0 0 20px rgba(139, 69, 244, 0.3)",
                    ],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                    filter: "drop-shadow(0 0 15px rgba(139, 69, 244, 0.4))",
                  }}
                >
                  You
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

              {/* Mentor Name */}
              <motion.span
                className="inline-block"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.span
                  className="bg-gradient-to-r from-indigo-200 via-violet-300 to-purple-400 bg-clip-text text-transparent font-extrabold tracking-tight"
                  animate={{
                    backgroundPosition: [
                      "0% 50%",
                      "100% 50%",
                      "0% 50%",
                    ],
                    textShadow: [
                      "0 0 20px rgba(99, 102, 241, 0.3)",
                      "0 0 40px rgba(99, 102, 241, 0.5)",
                      "0 0 20px rgba(99, 102, 241, 0.3)",
                    ],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3,
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                    filter: "drop-shadow(0 0 15px rgba(99, 102, 241, 0.4))",
                  }}
                >
                  {targetProfile?.user?.fullName?.split(' ')[0] || 'Mentor'}
                </motion.span>
              </motion.span>
            </motion.h1>
          </div>

          {/* Enhanced Decorative Line */}
          <motion.div 
            className="w-32 h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 mx-auto rounded-full shadow-lg"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          />
        </motion.div>
      </div>

      {/* MEET-Style Navigation Tabs */}
      <div className="px-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="max-w-6xl mx-auto"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="relative z-20 mb-2"
          >
            <TabsList className={`grid w-full grid-cols-4 backdrop-blur-xl p-0.5 sm:p-1 rounded-lg shadow-lg min-h-[32px] sm:min-h-[36px] gap-0.5 sm:gap-1 transition-all duration-700 mb-8 ${
              'bg-white/80 border border-violet-400/40 shadow-violet-200/20'
            }`}>
              <TabsTrigger
                value="overview"
                className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                  'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                }`}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="breakdown"
                className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                  'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                }`}
              >
                Analysis
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                  'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                }`}
              >
                Roadmap
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                  'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                }`}
              >
                Insights
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent
            value="overview"
            className="space-y-8 animate-in fade-in-50 duration-500"
          >
            {/* Compatibility Summary Section */}
            <DropdownSection
              id="compatibility-summary"
              title="Compatibility Summary"
              icon={<Target className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-8">
                {/* Enhanced Key Scores Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {/* Overall Match Circle */}
                  <motion.div
                    className="relative flex flex-col items-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    <div className="relative w-32 h-32 mb-4">
                      {/* Outer glow ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/30 to-purple-500/30 blur-lg animate-pulse"></div>
                      
                      {/* Main circle container */}
                      <div className="relative w-full h-full">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#violetGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={251.2}
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - (score.overallCompatibilityScore / 100) * 251.2 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                          />
                          <defs>
                            <linearGradient id="violetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Target className="w-5 h-5 text-violet-400 mb-1" />
                          <motion.span
                            className="text-xl font-bold text-white"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                          >
                            {score.overallCompatibilityScore}%
                          </motion.span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-medium text-base mb-1">Overall Match</h4>
                      <p className="text-violet-200/70 text-xs">Comprehensive compatibility</p>
                    </div>
                  </motion.div>

                  {/* Success Probability Circle */}
                  <motion.div
                    className="relative flex flex-col items-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <div className="relative w-32 h-32 mb-4">
                      {/* Outer glow ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 to-green-500/30 blur-lg animate-pulse"></div>
                      
                      {/* Main circle container */}
                      <div className="relative w-full h-full">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#emeraldGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={251.2}
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - (score.successProbability / 100) * 251.2 }}
                            transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
                          />
                          <defs>
                            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
                          <motion.span
                            className="text-xl font-bold text-white"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.8, duration: 0.5 }}
                          >
                            {score.successProbability}%
                          </motion.span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-medium text-base mb-1">Success Rate</h4>
                      <p className="text-emerald-200/70 text-xs">Predicted outcome likelihood</p>
                    </div>
                  </motion.div>

                  {/* Growth Potential Circle */}
                  <motion.div
                    className="relative flex flex-col items-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <div className="relative w-32 h-32 mb-4">
                      {/* Outer glow ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/30 blur-lg animate-pulse"></div>
                      
                      {/* Main circle container */}
                      <div className="relative w-full h-full">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="url(#amberGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={251.2}
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - ((11 - score.plateauRiskAssessment) / 10) * 251.2 }}
                            transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
                          />
                          <defs>
                            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Lightbulb className="w-5 h-5 text-amber-400 mb-1" />
                          <motion.span
                            className="text-xl font-bold text-white"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 2.1, duration: 0.5 }}
                          >
                            {Math.round(((11 - score.plateauRiskAssessment) / 10) * 100)}%
                          </motion.span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="text-white font-medium text-base mb-1">Growth Potential</h4>
                      <p className="text-amber-200/70 text-xs">Development capacity</p>
                    </div>
                  </motion.div>
                </div>


              </div>
            </DropdownSection>

            {/* 6D Compatibility Analysis - MEET Style DropdownSection */}
            <DropdownSection
              id="6d-analysis"
              title="6D Compatibility Analysis"
              icon={<TrendingUp className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-3">
                <motion.div
                  className="bg-gradient-to-r from-purple-500/15 to-purple-600/20 rounded-xl p-4 border border-purple-400/30 backdrop-blur-sm hover:border-purple-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/30">
                      <Brain className="w-4 h-4 text-purple-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Expertise Relevance</h5>
                      <p className="text-purple-200/70 text-sm">Domain knowledge alignment</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-blue-500/15 to-blue-600/20 rounded-xl p-4 border border-blue-400/30 backdrop-blur-sm hover:border-blue-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/30">
                      <Users className="w-4 h-4 text-blue-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Style Compatibility</h5>
                      <p className="text-blue-200/70 text-sm">Mentoring approach fit</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-green-500/15 to-green-600/20 rounded-xl p-4 border border-green-400/30 backdrop-blur-sm hover:border-green-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/30">
                      <Clock className="w-4 h-4 text-green-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Time Synergy</h5>
                      <p className="text-green-200/70 text-sm">Schedule compatibility</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-orange-500/15 to-orange-600/20 rounded-xl p-4 border border-orange-400/30 backdrop-blur-sm hover:border-orange-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/30">
                      <MessageSquare className="w-4 h-4 text-orange-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Communication Fit</h5>
                      <p className="text-orange-200/70 text-sm">Interaction effectiveness</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-teal-500/15 to-teal-600/20 rounded-xl p-4 border border-teal-400/30 backdrop-blur-sm hover:border-teal-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/30">
                      <Globe className="w-4 h-4 text-teal-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Cultural Alignment</h5>
                      <p className="text-teal-200/70 text-sm">Environmental fit</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-r from-rose-500/15 to-rose-600/20 rounded-xl p-4 border border-rose-400/30 backdrop-blur-sm hover:border-rose-300/50 transition-all duration-300"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/30">
                      <Target className="w-4 h-4 text-rose-200" />
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Growth Potential</h5>
                      <p className="text-rose-200/70 text-sm">Development capacity</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </DropdownSection>
          </TabsContent>

          <TabsContent
            value="breakdown"
            className="space-y-8 animate-in fade-in-50 duration-500"
          >
            <DropdownSection
              id="mentorship-overview"
              title="Detailed Compatibility Analysis"
              icon={<Brain className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-8">
                {/* Success Metrics Cards */}
                <div>
                  <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    Success Predictions
                  </h4>
                  <div className="space-y-4">
                    <motion.div 
                      className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-500/20 rounded-xl">
                            <Target className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Success Rate</h5>
                            <p className="text-white/70 text-sm">High probability of achieving your mentorship goals</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-green-400">
                          {score.successProbability}%
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-gradient-to-r from-blue-500/20 to-cyan-600/20 border border-blue-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Clock className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Breakthrough</h5>
                            <p className="text-white/70 text-sm">Expected timeline for significant progress</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-blue-400">
                          {score.breakthroughMomentPrediction} <span className="text-lg text-white/80">weeks</span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-gradient-to-r from-purple-500/20 to-violet-600/20 border border-purple-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Lightbulb className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Growth</h5>
                            <p className="text-white/70 text-sm">Potential for sustained learning and development</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-purple-400">
                          {11 - score.plateauRiskAssessment}<span className="text-lg text-white/80">/10</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Compatibility Breakdown */}
                <div>
                  <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Users className="w-6 h-6 text-yellow-400" />
                    Compatibility Breakdown
                  </h4>
                  <div className="space-y-4">
                    <motion.div 
                      className="bg-gradient-to-r from-yellow-500/20 to-orange-600/20 border border-yellow-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Brain className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Expertise Match</h5>
                            <p className="text-white/70 text-sm">Domain knowledge alignment with your growth areas</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-yellow-400">
                          {analysis.breakdown.expertiseAlignment}<span className="text-lg text-white/80">/10</span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-cyan-500/20 rounded-xl">
                            <Target className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Learning Alignment</h5>
                            <p className="text-white/70 text-sm">How well your learning goals match their expertise</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-cyan-400">
                          {analysis.breakdown.learningGoalsMatch}<span className="text-lg text-white/80">/10</span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-2xl p-6 backdrop-blur-sm"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <Globe className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h5 className="font-semibold text-white text-lg">Cultural Fit</h5>
                            <p className="text-white/70 text-sm">Shared values and working style compatibility</p>
                          </div>
                        </div>
                        <div className="text-4xl font-bold text-emerald-400">
                          {analysis.breakdown.culturalFit}<span className="text-lg text-white/80">/10</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </DropdownSection>
          </TabsContent>

          <TabsContent
            value="roadmap"
            className="space-y-8 animate-in fade-in-50 duration-500"
          >
            <DropdownSection
              id="roadmap-breakdown"
              title="Strategic Mentorship Roadmap"
              icon={<BookOpen className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-8">
                {/* Roadmap Header */}
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-white mb-3">Your Personalized Growth Journey</h4>
                  <p className="text-white/80 text-lg max-w-2xl mx-auto">
                    A structured pathway designed to maximize your potential through targeted mentorship phases
                  </p>
                </div>

                {/* Roadmap Timeline */}
                <div className="relative">
                  {/* Connecting Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-400 via-purple-400 to-indigo-400"></div>
                  
                  <div className="space-y-8">
                    {mentorshipRoadmap.map((phase: any, index: number) => (
                      <motion.div
                        key={index}
                        className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 ml-12 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        {/* Phase Number Circle */}
                        <div className="absolute -left-12 top-6 w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white/20">
                          <span className="text-white font-bold text-lg">{index + 1}</span>
                        </div>

                        {/* Phase Content */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <h4 className="text-xl font-bold text-white">{phase.phase}</h4>
                            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                              <Clock className="w-4 h-4 text-violet-400" />
                              <span className="text-white/90 font-medium text-sm">{phase.duration}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4 text-violet-400" />
                                Focus Areas
                              </h5>
                              <ul className="space-y-2">
                                {phase.focusAreas?.map(
                                  (area: string, areaIndex: number) => (
                                    <li
                                      key={areaIndex}
                                      className="text-white/80 text-sm flex items-center gap-2"
                                    >
                                      <div className="w-2 h-2 bg-violet-400 rounded-full flex-shrink-0"></div>
                                      {area}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-emerald-400" />
                                Expected Outcomes
                              </h5>
                              <ul className="space-y-2">
                                {phase.expectedOutcomes?.map(
                                  (outcome: string, outcomeIndex: number) => (
                                    <li
                                      key={outcomeIndex}
                                      className="text-white/80 text-sm flex items-center gap-2"
                                    >
                                      <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                                      {outcome}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </DropdownSection>

            <DropdownSection
              id="milestone-pathway"
              title="Key Milestones & Progress Tracker"
              icon={<Target className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h4 className="text-xl font-bold text-white mb-2">Achievement Timeline</h4>
                  <p className="text-white/80">Track your mentorship progress with data-driven milestones</p>
                </div>

                <div className="grid gap-6">
                  {milestonePathway.map((milestone: any, index: number) => (
                    <motion.div
                      key={index}
                      className="relative bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:from-white/10 hover:to-white/15 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-6">
                        {/* Timeline Badge */}
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                              <div className="text-center">
                                <div className="text-lg font-bold text-white">
                                  W{milestone.week}
                                </div>
                              </div>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                              {milestone.probability}%
                            </div>
                          </div>
                        </div>

                        {/* Milestone Content */}
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            {milestone.milestone}
                          </h4>
                          <p className="text-white/80 text-sm leading-relaxed mb-3">
                            {milestone.description}
                          </p>
                          
                          {/* Progress Indicator */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white/20 rounded-full h-2">
                              <motion.div
                                className="bg-gradient-to-r from-emerald-400 to-green-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${milestone.probability}%` }}
                                transition={{ delay: index * 0.2 + 0.5, duration: 1 }}
                              />
                            </div>
                            <span className="text-emerald-400 font-semibold text-sm">
                              Success Rate: {milestone.probability}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </DropdownSection>
          </TabsContent>

          <TabsContent
            value="insights"
            className="space-y-8 animate-in fade-in-50 duration-500"
          >
            {/* Key Insights */}
            <DropdownSection
              id="key-insights"
              title="Strategic Mentorship Insights"
              icon={<Lightbulb className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">AI-Powered Analysis</h4>
                  <p className="text-white/80">Discover actionable insights to maximize your mentorship potential</p>
                </div>

                <div className="grid gap-4">
                  {insights.map((insight: string, index: number) => (
                    <motion.div 
                      key={index} 
                      className="bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-xl p-5 backdrop-blur-sm hover:from-white/10 hover:to-white/15 transition-all duration-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white/95 leading-relaxed">{insight}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </DropdownSection>


            <DropdownSection
              id="skill-forecast"
              title="Advanced Skill Development Forecast"
              icon={<TrendingUp className="w-5 h-5 text-white" />}
              className="from-violet-500/20 to-purple-600/20 border-violet-400/30"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-white mb-2">Growth Trajectory Analysis</h4>
                  <p className="text-white/80">Data-driven predictions for your skill development journey</p>
                </div>

                <div className="grid gap-6">
                  {skillGapForecast.map((skill: any, index: number) => (
                    <motion.div
                      key={index}
                      className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <Brain className="w-5 h-5 text-violet-400" />
                          {skill.skill}
                        </h4>
                        <div className="flex items-center gap-2 bg-emerald-500/20 rounded-full px-3 py-1">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span className="text-emerald-400 font-semibold text-sm">
                            {skill.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 mb-4">
                        <div className="text-center">
                          <span className="text-white/70 text-sm font-medium block mb-1">Current Level</span>
                          <div className="text-white font-bold text-lg">{skill.currentLevel}</div>
                        </div>
                        <div className="text-center">
                          <span className="text-white/70 text-sm font-medium block mb-1">Target Level</span>
                          <div className="text-white font-bold text-lg">{skill.targetLevel}</div>
                        </div>
                        <div className="text-center">
                          <span className="text-white/70 text-sm font-medium block mb-1">Timeline</span>
                          <div className="text-white font-bold text-lg">{skill.timeToAchieve}</div>
                        </div>
                      </div>

                      {/* Progress visualization */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/80 text-sm">Development Progress</span>
                          <span className="text-violet-400 text-sm font-medium">{skill.confidence}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                          <motion.div
                            className="bg-gradient-to-r from-violet-400 to-purple-500 h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.confidence}%` }}
                            transition={{ delay: index * 0.2 + 0.5, duration: 1.5 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                ))}
                </div>
              </div>
            </DropdownSection>
          </TabsContent>
        </Tabs>
      </div>

      {/* No Footer */}
    </div>
  );
}
