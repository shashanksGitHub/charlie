import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
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
  PieChart,
  CheckCircle,
  Calculator,
  BarChart3,
  Briefcase,
  Handshake,
  ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CompatibilityScore {
  synergyScore: number;
  networkValueScore: number;
  collaborationScore: number;
  exchangeScore: number;
  geographicFit: number;
  culturalAlignment: number;
  overallStarRating: number;
  computedAt: string;
  lastUpdated: string;
}

interface CompatibilityDashboardData {
  score: CompatibilityScore;
  currentUser: {
    id: number;
    fullName: string;
    photoUrl?: string;
    networkingPhotoUrl?: string;
  };
  targetUser: {
    profile: {
      id: number;
      fullName: string;
      professionalTagline: string;
      currentRole: string;
      industry: string;
      location: string;
      countryOfOrigin: string;
      photoUrl?: string;
    };
  };
  insights: string[];
  suggestedActions: string[];
  breakdown: {
    industryAlignment: number;
    goalsSynergy: number;
    skillComplementarity: number;
    locationAdvantage: number;
    experienceMatch: number;
  };
  cached: boolean;
}

export default function SuiteCompatibilityPage() {
  const { targetProfileId } = useParams();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dark mode detection for dramatic styling - Exact MEET implementation
  const [darkMode, setDarkMode] = useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Expandable sections state matching MEET dashboard
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "professional-overview": false,
    "compatibility-insights": false,
    "suggested-actions": false,
    "detailed-breakdown": false
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[sectionId];

      if (isCurrentlyExpanded) {
        return { ...prev, [sectionId]: false };
      }

      const currentlyExpandedSection = Object.keys(prev).find(key => prev[key]);
      const updates: Record<string, boolean> = { [sectionId]: true };

      if (currentlyExpandedSection && currentlyExpandedSection !== sectionId) {
        updates[currentlyExpandedSection] = false;
      }

      return { ...prev, ...updates };
    });
  };

  // Expandable section component matching MEET dashboard style
  const DropdownSection = ({ 
    id, 
    title, 
    icon: Icon, 
    isExpanded, 
    onToggle, 
    children 
  }: {
    id: string;
    title: string;
    icon: React.ComponentType<any>;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
  }) => (
    <motion.div
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:bg-white/15"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <motion.button
        onClick={() => onToggle(id)}
        className="w-full p-4 flex items-center justify-between transition-colors duration-200 hover:bg-white/5"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2 rounded-xl bg-white/10 text-white"
            whileHover={{ 
              scale: 1.1,
              backgroundColor: "rgba(255, 255, 255, 0.2)"
            }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          <span className="font-semibold text-white">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 p-4 space-y-4 bg-black/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Fetch compatibility data
  const { data: compatibilityData, isLoading, error } = useQuery<CompatibilityDashboardData>({
    queryKey: ["suite-compatibility-dashboard", targetProfileId],
    queryFn: async () => {
      const response = await fetch(`/api/suite/compatibility/dashboard/${targetProfileId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Compatibility dashboard error:", response.status, errorText);
        throw new Error(`Failed to fetch compatibility data: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: !!targetProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleBack = () => {
    setLocation("/suite/network");
  };

  const renderStarRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 10 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-5 h-5 text-gray-300 fill-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
          </div>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300 fill-gray-300" />
        ))}
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-emerald-500";
    if (score >= 6) return "bg-blue-500";
    if (score >= 4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const scoringMetrics = [
    {
      key: "synergyScore",
      label: "Synergy Index",
      icon: TrendingUp,
      description: "Professional goals and industry alignment",
      color: "emerald"
    },
    {
      key: "networkValueScore", 
      label: "Network Value",
      icon: Users,
      description: "Professional influence and reach potential",
      color: "blue"
    },
    {
      key: "collaborationScore",
      label: "Collaboration Potential",
      icon: Handshake,
      description: "Working style and project compatibility",
      color: "purple"
    },
    {
      key: "exchangeScore",
      label: "Mutual Exchange",
      icon: ArrowLeftRight,
      description: "Knowledge and skill exchange potential",
      color: "indigo"
    },
    {
      key: "geographicFit",
      label: "Geographic Advantage",
      icon: Globe,
      description: "Location and timezone compatibility",
      color: "orange"
    },
    {
      key: "culturalAlignment",
      label: "Cultural Synergy",
      icon: Heart,
      description: "Cross-cultural networking potential",
      color: "pink"
    }
  ] as const;

  if (error) {
    return (
      <div className={cn(
        "min-h-screen p-4 transition-colors duration-500",
        darkMode 
          ? "bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900" 
          : "bg-gradient-to-br from-purple-50 to-indigo-100"
      )}>
        <div className="max-w-md mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={cn(
              "shadow-lg",
              darkMode ? "bg-gray-900/90 border-gray-700" : "bg-white"
            )}>
              <CardHeader>
                <CardTitle className={cn(
                  "flex items-center gap-2",
                  darkMode ? "text-red-400" : "text-red-600"
                )}>
                  <Zap className="w-5 h-5" />
                  Error Loading Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "mb-4",
                  darkMode ? "text-gray-300" : "text-gray-600"
                )}>
                  Unable to load compatibility analysis. Please try again.
                </p>
                <Button onClick={handleBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Discover
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(
        "min-h-screen p-4 transition-colors duration-500",
        darkMode 
          ? "bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900" 
          : "bg-gradient-to-br from-purple-50 to-indigo-100"
      )}>
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-96"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-500/30 rounded-full animate-spin border-t-emerald-500" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-teal-500/30 rounded-full animate-spin border-t-teal-500" 
                   style={{ animationDirection: 'reverse', animationDelay: '0.2s' }} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <h3 className={cn(
                "text-xl font-semibold mb-2",
                darkMode ? "text-white" : "text-gray-900"
              )}>
                Analyzing Professional Compatibility
              </h3>
              <p className={cn(darkMode ? "text-gray-400" : "text-gray-600")}>
                AI is processing relationship dynamics...
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 relative overflow-hidden">
      {/* Enhanced animated background particles with networking theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 4 === 0 
                ? "w-2 h-2 bg-emerald-400/30" 
                : i % 4 === 1
                ? "w-1.5 h-1.5 bg-teal-300/40"
                : i % 4 === 2
                ? "w-1 h-1 bg-emerald-200/50"
                : "w-0.5 h-0.5 bg-white/60"
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: "blur(0.5px)",
            }}
            animate={{
              y: [0, -120, 0],
              x: [0, Math.sin(i) * 30, 0],
              opacity: [0, 0.8, 0],
              scale: [0, 1.2, 0],
              rotate: [0, 360, 720],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Additional floating orbs for depth */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute w-8 h-8 bg-gradient-to-br from-emerald-400/10 via-teal-300/15 to-emerald-500/10 rounded-full backdrop-blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -200, 0],
              x: [0, Math.sin(i * 2) * 50, 0],
              opacity: [0, 0.3, 0],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-4 min-h-screen">
        {/* Back button - positioned in top left corner */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-1 left-1 z-50"
        >
          <Button
            onClick={handleBack}
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </Button>
        </motion.div>
        
        {compatibilityData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header with profile pictures - Only show on Overview tab */}
            <AnimatePresence>
              {activeTab === "overview" && (
                <motion.div 
                  className="relative w-full -mt-8"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    transition: { duration: 0.8, ease: "easeInOut" },
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative flex items-start justify-center mb-4 min-h-[180px] pt-4 gap-8 px-2"
                  >
                    {/* Current user profile picture - MEET-Style Effects */}
                    <div className="flex-shrink-0 relative">
                      <motion.div
                        className="relative"
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                      >
                        {/* Dual Background Glow System */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-full blur-2xl opacity-40 animate-pulse scale-110"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-300 to-teal-400 rounded-full blur-lg opacity-60 animate-pulse scale-105"></div>

                        <motion.div
                          className="relative"
                          animate={{
                            boxShadow: [
                              "0 0 20px rgba(16, 185, 129, 0.3)",
                              "0 0 40px rgba(16, 185, 129, 0.5)",
                              "0 0 20px rgba(16, 185, 129, 0.3)",
                            ],
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <div className="relative h-32 w-32 border-4 border-white/90 shadow-2xl ring-4 ring-emerald-400/30 backdrop-blur-sm rounded-full overflow-hidden">
                            <img 
                              src={compatibilityData.currentUser?.networkingPhotoUrl || compatibilityData.currentUser?.photoUrl || "/default-current-user.png"} 
                              alt="You"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Floating particles around user avatar */}
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={`user-particle-${i}`}
                              className="absolute w-2 h-2 bg-emerald-300 rounded-full opacity-60"
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
                    </div>

                    {/* Central compatibility score - Premium design with golden star */}
                    <div className="flex flex-col items-center justify-center z-20 relative">
                      <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, duration: 1, type: "spring", stiffness: 100 }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="relative group"
                      >
                        {/* Magical sparkles around score */}
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={`sparkle-${i}`}
                            className="absolute w-1 h-1 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full opacity-80"
                            style={{
                              top: `${15 + Math.sin((i * Math.PI) / 6) * 45}px`,
                              left: `${15 + Math.cos((i * Math.PI) / 6) * 45}px`,
                            }}
                            animate={{
                              scale: [0, 1.5, 0],
                              opacity: [0, 1, 0],
                              rotate: [0, 360],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}

                        {/* MEET-Style SVG Progress Circle */}
                        <div className="relative w-24 h-24">
                          <svg
                            className="w-full h-full transform -rotate-90"
                            viewBox="0 0 100 100"
                          >
                            <defs>
                              {/* Background gradient for base ring */}
                              <linearGradient
                                id="networkingBackgroundGradient"
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
                                id="networkingCentralGradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="100%"
                              >
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="50%" stopColor="#14B8A6" />
                                <stop offset="100%" stopColor="#06B6D4" />
                              </linearGradient>

                              {/* Glow filter */}
                              <filter id="networkingGlow">
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
                              stroke="url(#networkingBackgroundGradient)"
                              strokeWidth="2"
                            />

                            {/* Progress ring based on compatibility */}
                            <motion.circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="url(#networkingCentralGradient)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              filter="url(#networkingGlow)"
                              strokeDasharray="251.2"
                              initial={{ strokeDashoffset: 251.2 }}
                              animate={{
                                strokeDashoffset: 251.2 - (251.2 * (compatibilityData.score.overallStarRating * 10)) / 100,
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
                              <div className="text-sm font-bold text-emerald-200">
                                {(compatibilityData.score.overallStarRating * 10).toFixed(0)}%
                              </div>
                              <div className="text-xs text-white/60">Match</div>
                            </motion.div>
                          </div>
                        </div>


                      </motion.div>
                    </div>

                    {/* Target user profile picture - MEET-Style Effects */}
                    <div className="flex-shrink-0 relative">
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
                            <img 
                              src={compatibilityData.targetUser.profile.photoUrl || "/default-avatar.png"} 
                              alt="Target"
                              className="w-full h-full object-cover"
                            />
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
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* "You & Name" header - Only show on Overview tab */}
            <AnimatePresence>
              {activeTab === "overview" && (
                <motion.div
                  className="w-full max-w-full mx-auto px-1 sm:px-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    transition: { duration: 0.8, ease: "easeInOut" },
                  }}
                  transition={{
                    delay: 1,
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100,
                  }}
                >
                  <motion.h1
                    className={`relative font-black text-center mb-4 leading-none whitespace-nowrap ${
                      // Dynamic text sizing based on total title length (You + & + professional name)
                      (() => {
                        const professionalName = compatibilityData.targetUser?.profile?.fullName?.split(' ')[0] || 'Professional';
                        const totalLength = "You".length + professionalName.length + 3; // +3 for " & "
                        
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
                    {/* "You" */}
                    <motion.span
                      className="inline-block"
                      whileHover={{ scale: 1.05, y: -2 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <motion.span
                        className="bg-gradient-to-r from-emerald-200 via-teal-300 to-emerald-400 bg-clip-text text-transparent font-extrabold tracking-tight"
                        animate={{
                          backgroundPosition: [
                            "0% 50%",
                            "100% 50%",
                            "0% 50%",
                          ],
                          textShadow: [
                            "0 0 20px rgba(16, 185, 129, 0.3)",
                            "0 0 40px rgba(16, 185, 129, 0.5)",
                            "0 0 20px rgba(16, 185, 129, 0.3)",
                          ],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "easeInOut",
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
                          ease: "easeInOut",
                        }}
                      >
                        {compatibilityData.targetUser?.profile?.fullName?.split(' ')[0] || 'Professional'}
                      </motion.span>
                    </motion.span>
                  </motion.h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Tabs Section - Exact MEET Match Dashboard Implementation */}
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
                paddingTop: { duration: 1.8, ease: "easeInOut" },
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
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                >
                  <TabsList className={`grid w-full grid-cols-3 backdrop-blur-xl p-0.5 sm:p-1 rounded-lg shadow-lg min-h-[32px] sm:min-h-[36px] gap-0.5 sm:gap-1 transition-all duration-700 ${
                    darkMode 
                      ? 'bg-gray-800/60 border border-emerald-600/30 shadow-emerald-900/40' 
                      : 'bg-white/80 border border-emerald-400/40 shadow-emerald-200/20'
                  }`}>
                    <TabsTrigger
                      value="overview"
                      className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                        darkMode 
                          ? 'text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20' 
                          : 'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="breakdown"
                      className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                        darkMode 
                          ? 'text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20' 
                          : 'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger
                      value="insights"
                      className={`rounded text-xs font-medium py-1 px-1 sm:py-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] transition-all duration-300 ${
                        darkMode 
                          ? 'text-gray-300 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg hover:text-white hover:bg-gray-700/20' 
                          : 'text-white/70 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Insights
                    </TabsTrigger>
                  </TabsList>
                </motion.div>

                <AnimatePresence mode="wait">
                  <TabsContent value="overview" className="mt-6">
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >


                      {/* Expandable sections - MEET style */}
                      <DropdownSection
                        id="professional-overview"
                        title="Professional Compatibility Metrics"
                        icon={PieChart}
                        isExpanded={expandedSections["professional-overview"]}
                        onToggle={toggleSection}
                      >
                        <div className="space-y-4">
                          {scoringMetrics.map((metric, index) => {
                            const score = compatibilityData.score[metric.key as keyof typeof compatibilityData.score] as number;
                            const percentage = Math.round(score * 10);
                            
                            return (
                              <motion.div 
                                key={metric.key}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gradient-to-br from-white/10 via-emerald-500/5 to-white/5 backdrop-blur-xl border border-emerald-300/20 rounded-2xl p-5 shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 transition-all duration-500 hover:scale-[1.02]"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-300/30 shadow-lg">
                                      <metric.icon className="w-5 h-5 text-emerald-100" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm text-white">
                                        {metric.label}
                                      </h4>
                                      <p className="text-xs text-white/70">
                                        {metric.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-lg font-bold text-white">
                                    {percentage}%
                                  </div>
                                </div>
                                <div className="relative">
                                  <div className="h-3 rounded-full overflow-hidden bg-white/20 shadow-inner">
                                    <motion.div 
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-lg relative overflow-hidden"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 1.5, delay: index * 0.2, ease: "easeOut" }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-pulse" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </DropdownSection>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="insights" className="mt-6">
                    <motion.div
                      key="insights"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Key Insights - MEET style */}
                      <DropdownSection
                        id="compatibility-insights"
                        title="Key Professional Insights"
                        icon={Lightbulb}
                        isExpanded={expandedSections["compatibility-insights"]}
                        onToggle={toggleSection}
                      >
                        <div className="space-y-4">
                          {compatibilityData.insights.map((insight, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                            >
                              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                              <p className="text-sm leading-relaxed text-white/90">
                                {insight}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </DropdownSection>

                      {/* Recommended Actions - MEET style */}
                      <DropdownSection
                        id="suggested-actions"
                        title="Recommended Actions"
                        icon={Target}
                        isExpanded={expandedSections["suggested-actions"]}
                        onToggle={toggleSection}
                      >
                        <div className="space-y-4">
                          {compatibilityData.suggestedActions.map((action, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer group hover:bg-white/10 transition-all duration-200"
                            >
                              <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                              <p className="text-sm leading-relaxed text-white/90 flex-1">
                                {action}
                              </p>
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                            </motion.div>
                          ))}
                        </div>
                      </DropdownSection>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="breakdown" className="mt-6">
                    <motion.div
                      key="breakdown"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Detailed breakdown - MEET style */}
                      <DropdownSection
                        id="detailed-breakdown"
                        title="Detailed Score Breakdown"
                        icon={Award}
                        isExpanded={expandedSections["detailed-breakdown"]}
                        onToggle={toggleSection}
                      >
                        <div className="space-y-4">
                          {Object.entries(compatibilityData.breakdown || {}).map(([key, score], index) => {
                            const labels: Record<string, string> = {
                              industryAlignment: "Industry Alignment",
                              goalsSynergy: "Goals Synergy", 
                              skillComplementarity: "Skill Complementarity",
                              locationAdvantage: "Location Advantage",
                              experienceMatch: "Experience Match"
                            };
                            
                            return (
                              <motion.div 
                                key={key}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gradient-to-br from-white/10 via-emerald-500/5 to-white/5 backdrop-blur-xl border border-emerald-300/20 rounded-2xl p-5 shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 transition-all duration-500 hover:scale-[1.02]"
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-medium text-white">
                                    {labels[key]}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-white">
                                      {score}/10
                                    </span>
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                  </div>
                                </div>
                                <div className="relative">
                                  <div className="h-3 rounded-full overflow-hidden bg-white/20 shadow-inner">
                                    <motion.div 
                                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 rounded-full shadow-lg relative overflow-hidden"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(score / 10) * 100}%` }}
                                      transition={{ duration: 1.5, delay: index * 0.2, ease: "easeOut" }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 animate-pulse" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
                                    </motion.div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </DropdownSection>
                    </motion.div>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}