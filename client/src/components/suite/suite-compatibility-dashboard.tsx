import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Star,
  TrendingUp,
  Users,
  Handshake,
  ArrowLeftRight,
  Globe,
  Heart,
  Lightbulb,
  MessageCircle,
  Sparkles,
  MapPin,
  Briefcase,
  Target,
  Award,
  Clock,
  Send,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompatibilityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  targetProfileId: number;
  targetUser: {
    id: number;
    fullName: string;
    location: string;
    photoUrl?: string;
  };
}

interface CompatibilityData {
  score: {
    synergyScore: number;
    networkValueScore: number;
    collaborationScore: number;
    exchangeScore: number;
    geographicFit: number;
    culturalAlignment: number;
    overallStarRating: number;
    insights: string;
    suggestedActions: string;
    analysisData: string;
  };
  analysis: {
    breakdown: {
      industryAlignment: number;
      goalsSynergy: number;
      skillComplementarity: number;
      locationAdvantage: number;
      experienceMatch: number;
    };
    insights: string[];
    suggestedActions: string[];
  };
  targetProfile: any;
  cached: boolean;
}

export function SuiteCompatibilityDashboard({
  isOpen,
  onClose,
  targetProfileId,
  targetUser
}: CompatibilityDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "insights">("overview");

  // Fetch compatibility data
  const { data: compatibilityData, isLoading, error } = useQuery<CompatibilityData>({
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
      console.log("Dashboard data received:", data);
      return data;
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!isOpen) return null;

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
        <span className="ml-2 text-sm font-medium text-gray-600">
          {rating.toFixed(1)}/10
        </span>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 6) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 4) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  const getProgressColor = (score: number) => {
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              Error Loading Analysis
            </DialogTitle>
            <DialogDescription>
              Unable to load compatibility analysis. Please try again.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Professional Compatibility Analysis
              </div>
              {compatibilityData?.cached && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Cached
                </Badge>
              )}
            </DialogTitle>
          </div>

          {/* Target User Profile Header */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
            <Avatar className="w-16 h-16 border-2 border-white shadow-md">
              <AvatarImage src={compatibilityData?.targetUser?.profile?.photoUrl} alt={targetUser?.fullName || "User"} />
              <AvatarFallback className="text-lg font-bold bg-purple-100 text-purple-700">
                {targetUser?.fullName ? targetUser.fullName.split(' ').map(n => n[0]).join('') : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{targetUser?.fullName || compatibilityData?.targetUser?.profile?.professionalTagline || "Professional Contact"}</h3>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{targetUser?.location || compatibilityData?.targetUser?.profile?.location || "Location not available"}</span>
              </div>
              {isLoading ? (
                <div className="mt-2 w-48 h-6 bg-gray-200 rounded animate-pulse" />
              ) : compatibilityData && (
                <div className="mt-2">
                  {renderStarRating(compatibilityData.score.overallStarRating)}
                </div>
              )}
            </div>
            {!isLoading && compatibilityData && (
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {compatibilityData.score.overallStarRating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Overall Rating</div>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {/* Loading skeleton */}
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ) : compatibilityData ? (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { id: "overview", label: "Overview", icon: Star },
                { id: "breakdown", label: "Detailed Analysis", icon: Award },
                { id: "insights", label: "Insights & Actions", icon: Lightbulb }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Scoring Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {scoringMetrics.map((metric) => {
                    const score = compatibilityData.score[metric.key as keyof typeof compatibilityData.score] as number;
                    const IconComponent = metric.icon;
                    
                    return (
                      <Card key={metric.key} className="relative overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <IconComponent className="w-4 h-4 text-gray-600" />
                            {metric.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{score.toFixed(1)}</span>
                            <Badge className={getScoreColor(score)}>
                              {score >= 8 ? "Excellent" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Limited"}
                            </Badge>
                          </div>
                          <Progress 
                            value={(score / 10) * 100} 
                            className="h-2"
                            // TODO: Add custom progress colors based on score
                          />
                          <p className="text-xs text-gray-500">{metric.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "breakdown" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Detailed Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(compatibilityData.breakdown || {}).map(([key, score]) => {
                      const labels: Record<string, string> = {
                        industryAlignment: "Industry Alignment",
                        goalsSynergy: "Goals Synergy", 
                        skillComplementarity: "Skill Complementarity",
                        locationAdvantage: "Location Advantage",
                        experienceMatch: "Experience Match"
                      };
                      
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{labels[key]}</span>
                            <span className="text-lg font-bold">{score}/10</span>
                          </div>
                          <Progress value={(score / 10) * 100} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-6">
                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {compatibilityData.insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Sparkles className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Suggested Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {compatibilityData.suggestedActions.map((action, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-gray-500">
                Analysis computed with {scoringMetrics.length} professional compatibility factors
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Connection Request
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}