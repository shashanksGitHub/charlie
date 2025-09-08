import { useState } from "react";
import { Star, Sparkles, TrendingUp, Users, Globe, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SuiteStarButtonProps {
  targetProfileId: number;
  targetUser: {
    id: number;
    fullName: string;
    location: string;
    photoUrl?: string;
  };
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "prominent";
  className?: string;
  isPremium?: boolean; // Premium feature controls
  onPremiumUpgradeClick?: () => void; // Premium upgrade callback
  onCreateProfileClick?: () => void; // Create profile modal callback
}

export function SuiteStarButton({
  targetProfileId,
  targetUser,
  size = "md",
  variant = "default",
  className,
  isPremium = false,
  onPremiumUpgradeClick,
  onCreateProfileClick,
}: SuiteStarButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [, setLocation] = useLocation();

  // Check if user has active networking profile
  const { data: userProfile } = useQuery({
    queryKey: ["/api/suite/networking-profile"],
    queryFn: async () => {
      const response = await fetch("/api/suite/networking-profile", {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to check if user has active networking profile
  const hasActiveNetworkingProfile = () => {
    return userProfile && userProfile.id && userProfile.isActive;
  };

  // Fetch compatibility rating
  const { data: compatibilityData } = useQuery({
    queryKey: ["suite-compatibility-rating", targetProfileId],
    queryFn: async () => {
      const response = await fetch(
        `/api/suite/compatibility/dashboard/${targetProfileId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Size configurations - Refined for optimal balance
  const sizeConfig = {
    sm: {
      button: "w-16 h-16",
      star: "w-4 h-4",
      sparkle: "w-3 h-3",
    },
    md: {
      button: "w-19 h-19",
      star: "w-5 h-5",
      sparkle: "w-4 h-4",
    },
    lg: {
      button: "w-21 h-21",
      star: "w-6 h-6",
      sparkle: "w-5 h-5",
    },
  };

  // Detect context for theme-appropriate colors
  const isNetworkingContext =
    window.location.pathname.includes("/suite/network") ||
    window.location.pathname.includes("/suite/compatibility");

  // Variant configurations - Enhanced 3D effects with context-aware themes
  const variantConfig = {
    default: {
      base: isNetworkingContext
        ? "bg-gradient-to-br from-emerald-500/90 via-emerald-600/90 to-teal-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20"
        : "bg-gradient-to-br from-purple-500/90 via-purple-600/90 to-pink-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20",
      hover: isNetworkingContext
        ? "hover:from-emerald-600/90 hover:via-teal-600/90 hover:to-emerald-700/90"
        : "hover:from-purple-600/90 hover:via-pink-600/90 hover:to-purple-700/90",
      shadow: isNetworkingContext
        ? "shadow-[0_8px_25px_rgba(16,185,129,0.3),0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]"
        : "shadow-[0_8px_25px_rgba(139,69,199,0.3),0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]",
      hoverShadow: isNetworkingContext
        ? "hover:shadow-[0_12px_35px_rgba(16,185,129,0.4),0_6px_18px_rgba(0,0,0,0.25),inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.15)]"
        : "hover:shadow-[0_12px_35px_rgba(139,69,199,0.4),0_6px_18px_rgba(0,0,0,0.25),inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.15)]",
    },
    minimal: {
      base: "bg-gradient-to-br from-white via-gray-50 to-white border-gray-200",
      hover:
        "hover:from-purple-50 hover:via-white hover:to-purple-25 hover:border-purple-200",
      shadow:
        "shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
      hoverShadow:
        "hover:shadow-[0_6px_24px_rgba(168,85,247,0.2),inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(168,85,247,0.1)]",
    },
    prominent: {
      base: "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 border-purple-300",
      hover:
        "hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 hover:border-purple-400",
      shadow:
        "shadow-[0_8px_32px_rgba(147,51,234,0.4),0_4px_16px_rgba(147,51,234,0.3),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)]",
      hoverShadow:
        "hover:shadow-[0_12px_40px_rgba(147,51,234,0.5),0_6px_20px_rgba(147,51,234,0.4),inset_0_3px_6px_rgba(255,255,255,0.4),inset_0_-3px_6px_rgba(0,0,0,0.15)]",
    },
  };

  const config = {
    size: sizeConfig[size],
    variant: variantConfig[variant],
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check premium access first
    if (!isPremium && onPremiumUpgradeClick) {
      onPremiumUpgradeClick();
      return;
    }
    
    // For premium users, check if they have an active networking profile
    if (isPremium && !hasActiveNetworkingProfile() && onCreateProfileClick) {
      onCreateProfileClick();
      return;
    }
    
    // Navigate to compatibility dashboard if user has profile or is non-premium
    setLocation(`/suite/compatibility/${targetProfileId}`);
  };

  return (
    <>
      {/* Star Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          // Base styles - Perfect 3D circular button
          "relative rounded-full border-2 flex items-center justify-center backdrop-blur-sm",
          "transition-all duration-300 cursor-pointer group active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2",
          "transform-gpu perspective-1000",
          // Add percentage badge container class for handshake animation targeting
          "percentage-badge-container",

          // Size
          config.size.button,

          // Variant styles with enhanced 3D effects
          config.variant.base,
          config.variant.hover,
          config.variant.shadow,
          config.variant.hoverShadow,

          // 3D Transform effects
          "hover:translate-y-[-2px] active:translate-y-[1px]",
          "hover:scale-105 active:scale-95",

          // Custom className
          className,
        )}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        title="View Professional Compatibility Analysis"
        aria-label={`View compatibility analysis for ${targetUser.fullName}`}
      >
        {/* Continuous circular outward effect */}
        <div
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: isNetworkingContext
              ? "rgba(16, 185, 129, 0.3)"
              : "rgba(168, 85, 247, 0.3)",
            animation: "expand-circle 2s ease-out infinite",
          }}
        />

        {/* Enhanced ripple effect */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-ping opacity-0"
          style={{
            borderColor: isNetworkingContext
              ? "rgba(20, 184, 166, 0.6)"
              : "rgba(168, 85, 247, 0.6)",
            animation: "ripple 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />

        {/* 3D Inner Button Container - Refined size */}
        <div
          className="w-[2.8rem] h-[2.8rem] rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center 
                     shadow-[inset_0_1px_4px_rgba(0,0,0,0.08),inset_0_-1px_3px_rgba(255,255,255,0.9),0_2px_5px_rgba(0,0,0,0.14),0_1px_2px_rgba(0,0,0,0.18)]
                     transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5
                     relative z-10 border border-white/65"
          style={{
            transformStyle: "preserve-3d",
            transform: "translateZ(4px)",
            boxShadow: isNetworkingContext
              ? "inset 0 1px 4px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(255,255,255,0.9), 0 2px 5px rgba(16,185,129,0.14), 0 1px 2px rgba(0,0,0,0.18)"
              : "inset 0 1px 4px rgba(0,0,0,0.08), inset 0 -1px 3px rgba(255,255,255,0.9), 0 2px 5px rgba(139,69,199,0.14), 0 1px 2px rgba(0,0,0,0.18)",
          }}
        >
          {/* 3D Text with Enhanced Depth - Balanced size */}
          {compatibilityData?.score?.overallStarRating && (
            <div
              className="relative flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Text Shadow Layer */}
              <span
                className="absolute text-lg font-bold transform translate-x-0.5 translate-y-0.5 blur-[0.4px]"
                style={{
                  color: isNetworkingContext
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(139, 69, 199, 0.2)",
                }}
              >
                {(compatibilityData.score.overallStarRating * 10).toFixed(0)}%
              </span>
              {/* Main Text */}
              <span
                className="relative text-lg font-bold text-transparent bg-clip-text transform transition-all duration-300 group-hover:scale-105"
                style={{
                  backgroundImage: isNetworkingContext
                    ? "linear-gradient(to bottom, #10B981, #059669, #047857)"
                    : "linear-gradient(to bottom, #8B5CF6, #7C3AED, #6D28D9)",
                  textShadow: isNetworkingContext
                    ? "0 0.5px 2px rgba(16,185,129,0.3), 0 0 6px rgba(16,185,129,0.2)"
                    : "0 0.5px 2px rgba(139,69,199,0.3), 0 0 6px rgba(139,69,199,0.2)",
                  transform: "translateZ(3px)",
                  dropShadow: "0 0.5px 1px rgba(0,0,0,0.3)",
                }}
              >
                {(compatibilityData.score.overallStarRating * 10).toFixed(0)}%
              </span>
              {/* Highlight Layer */}
              <span className="absolute text-lg font-bold bg-gradient-to-t from-transparent to-white/25 text-transparent bg-clip-text transform -translate-y-0.5 scale-95">
                {(compatibilityData.score.overallStarRating * 10).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Additional pulse effect on hover */}
        {isHovered && (
          <div
            className={cn(
              "absolute inset-[-2px] rounded-full border border-purple-300/40",
              "animate-pulse",
            )}
          />
        )}
      </button>
    </>
  );
}
