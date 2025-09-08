import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  Send, 
  ArrowLeft, 
  Brain, 
  Zap, 
  Shield, 
  Eye, 
  EyeOff,
  Users,
  TrendingUp,
  Clock,
  Award,
  Sparkles,
  Target,
  ChevronDown,
  User,
  MapPin,
  Briefcase,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  fullName: string;
  photoUrl?: string;
  profession?: string;
  location?: string;
}

interface ProfessionalReview {
  id: number;
  reviewedUserId: number;
  reviewerUserId: number;
  rating: number;
  reviewText: string;
  isAnonymous: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
  reviewer: User | null;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

const CATEGORIES = [
  { id: "overall", label: "Overall Performance", icon: Award, color: "from-purple-500 to-indigo-600" },
  { id: "reliability", label: "Reliability & Trust", icon: Shield, color: "from-blue-500 to-cyan-600" },
  { id: "communication", label: "Communication Skills", icon: Users, color: "from-green-500 to-emerald-600" },
  { id: "technical", label: "Technical Skills", icon: Brain, color: "from-orange-500 to-red-600" },
];

export default function JobsCompatibilityReview() {
  const { userId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState("overall");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showSubmitAnimation, setShowSubmitAnimation] = useState(false);

  const targetUserId = parseInt(userId || "0");

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch target user data
  const { data: targetUser } = useQuery<User>({
    queryKey: [`/api/users/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Fetch target user's job-specific primary photo
  const { data: jobPhotosData } = useQuery<Array<{ id: number; photoUrl: string; isPrimaryForJob: boolean; }>>({
    queryKey: [`/api/photos/${targetUserId}`],
    enabled: !!targetUserId,
  });

  // Get job-specific primary photo URL
  const jobPrimaryPhotoUrl = useMemo(() => {
    console.log("🔍 [JOB-PHOTO-DEBUG] Photos data:", jobPhotosData);
    if (!jobPhotosData || !Array.isArray(jobPhotosData)) {
      console.log("🔍 [JOB-PHOTO-DEBUG] No photos data available");
      return null;
    }
    console.log("🔍 [JOB-PHOTO-DEBUG] All photos:", jobPhotosData);
    const primaryJobPhoto = jobPhotosData.find(photo => photo.isPrimaryForJob);
    console.log("🔍 [JOB-PHOTO-DEBUG] Primary job photo found:", primaryJobPhoto);
    const photoUrl = primaryJobPhoto?.photoUrl || null;
    console.log("🔍 [JOB-PHOTO-DEBUG] Final photo URL:", photoUrl);
    return photoUrl;
  }, [jobPhotosData]);

  // Fetch reviews and stats
  const { data: reviewData, isLoading: reviewsLoading } = useQuery<{
    reviews: ProfessionalReview[];
    stats: ReviewStats;
    success: boolean;
  }>({
    queryKey: [`/api/professional-reviews/${targetUserId}`],
    enabled: !!targetUserId,
    refetchInterval: 30000, // Background updates every 30 seconds (instant updates handled by mutations)
  });

  // Fetch existing review from current user
  const { data: existingReviewData } = useQuery<{
    review: ProfessionalReview | null;
    success: boolean;
  }>({
    queryKey: [`/api/professional-reviews/${targetUserId}/user/${currentUser?.id}`, selectedCategory],
    enabled: !!(targetUserId && currentUser?.id),
    select: useCallback((data: any) => data, []),
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: {
      reviewedUserId: number;
      rating: number;
      reviewText: string;
      isAnonymous: boolean;
      category: string;
    }) => {
      return apiRequest("/api/professional-reviews", {
        method: "POST",
        data: reviewData,
      });
    },
    onSuccess: async () => {
      setShowSubmitAnimation(true);
      setTimeout(() => setShowSubmitAnimation(false), 2000);
      
      // Reset form
      setRating(0);
      setReviewText("");
      
      // Force immediate invalidation and refetch to update UI instantly
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: [`/api/professional-reviews/${targetUserId}`],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: [`/api/professional-reviews/${targetUserId}/user/${currentUser?.id}`],
          refetchType: 'active'
        })
      ]);
      
      // Force immediate refetch to ensure instant update
      await queryClient.refetchQueries({ 
        queryKey: [`/api/professional-reviews/${targetUserId}`]
      });
      
      toast({
        title: "Review Submitted Successfully",
        description: "Your professional review has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Review Submission Failed",
        description: error?.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      return apiRequest(`/api/professional-reviews/${reviewId}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      // Force immediate invalidation and refetch for instant UI update
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: [`/api/professional-reviews/${targetUserId}`],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: [`/api/professional-reviews/${targetUserId}/user/${currentUser?.id}`],
          refetchType: 'active'
        })
      ]);
      
      // Force immediate refetch
      await queryClient.refetchQueries({ 
        queryKey: [`/api/professional-reviews/${targetUserId}`]
      });
      
      // Reset form
      setRating(0);
      setReviewText("");
      setIsAnonymous(false);
      
      toast({
        title: "Review Deleted",
        description: "Your review has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Load existing review when category changes
  useEffect(() => {
    if (existingReviewData?.review) {
      setRating(existingReviewData.review.rating);
      setReviewText(existingReviewData.review.reviewText);
      setIsAnonymous(existingReviewData.review.isAnonymous);
    } else {
      setRating(0);
      setReviewText("");
      setIsAnonymous(false);
    }
  }, [existingReviewData, selectedCategory]);

  const handleSubmitReview = useCallback(() => {
    if (!targetUserId || !currentUser || rating === 0 || !reviewText.trim()) {
      toast({
        title: "Incomplete Review",
        description: "Please provide a rating and review text.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      reviewedUserId: targetUserId,
      rating,
      reviewText: reviewText.trim(),
      isAnonymous,
      category: selectedCategory,
    });
  }, [targetUserId, currentUser, rating, reviewText, isAnonymous, selectedCategory, submitReviewMutation, toast]);

  const handleStarClick = useCallback((starValue: number) => {
    setRating(starValue);
  }, []);

  const handleBack = useCallback(() => {
    setLocation("/suite/network");
  }, [setLocation]);

  const handleDeleteReview = useCallback((reviewId: number) => {
    deleteReviewMutation.mutate(reviewId);
  }, [deleteReviewMutation]);

  // Memoized calculations
  const categoryData = useMemo(() => 
    CATEGORIES.find(cat => cat.id === selectedCategory) || CATEGORIES[0]
  , [selectedCategory]);

  const filteredReviews = useMemo(() => 
    reviewData?.reviews?.filter(review => review.category === selectedCategory) || []
  , [reviewData?.reviews, selectedCategory]);

  const categoryStats = useMemo(() => {
    if (!filteredReviews.length) {
      return { averageRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    
    const totalReviews = filteredReviews.length;
    const averageRating = filteredReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    filteredReviews.forEach(r => {
      ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }, [filteredReviews]);

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg">Loading Professional Review System...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Matrix-style grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 h-full">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="border-r border-cyan-500 h-full"></div>
          ))}
        </div>
        <div className="absolute inset-0 grid grid-rows-12 h-full">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="border-b border-cyan-500 w-full"></div>
          ))}
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Profile in Top Right */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <Button
            onClick={handleBack}
            variant="outline"
            className="bg-black/20 border-cyan-500/30 text-white hover:bg-cyan-500/10 backdrop-blur-sm p-2 h-10 w-10 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Compact Square Star Rating Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="mx-4"
          >
            <div className="relative w-20 h-20">
              {/* Glowing background container */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-400/20 to-red-400/20 rounded-xl blur-lg"></div>
              
              {/* Main rating container - Square */}
              <div className="relative w-full h-full bg-black/40 backdrop-blur-xl border border-yellow-400/30 rounded-xl p-2 shadow-xl flex flex-col items-center justify-center">
                {/* Compact star row */}
                <div className="flex items-center space-x-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isLit = star <= Math.round(reviewData?.stats?.averageRating || 0);
                    const isPartial = star === Math.ceil(reviewData?.stats?.averageRating || 0) && 
                                     (reviewData?.stats?.averageRating || 0) % 1 > 0;
                    
                    return (
                      <motion.div
                        key={star}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + star * 0.05 }}
                        className="relative"
                      >
                        <motion.div
                          animate={isLit ? {
                            scale: [1, 1.1, 1],
                          } : {}}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: star * 0.1,
                          }}
                        >
                          <Star
                            className={`w-3 h-3 transition-all duration-300 ${
                              isLit
                                ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
                                : "text-gray-600 fill-transparent"
                            }`}
                          />
                        </motion.div>
                        
                        {/* Partial fill for decimal ratings */}
                        {isPartial && (
                          <div 
                            className="absolute inset-0 overflow-hidden"
                            style={{ width: `${((reviewData?.stats?.averageRating || 0) % 1) * 100}%` }}
                          >
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Compact rating number */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-center"
                >
                  <motion.div
                    key={reviewData?.stats?.averageRating || 0}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent leading-none"
                  >
                    {reviewData?.stats?.averageRating ? reviewData.stats.averageRating.toFixed(1) : "0.0"}
                  </motion.div>
                  
                  {/* Compact review count */}
                  <motion.p
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-[10px] text-cyan-400 font-medium leading-none"
                  >
                    {reviewData?.stats?.totalReviews || 0} review{(reviewData?.stats?.totalReviews || 0) !== 1 ? 's' : ''}
                  </motion.p>
                </motion.div>
                
                {/* Minimal sparkle effects */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-0.5 h-0.5 bg-yellow-400 rounded-full"
                      style={{
                        left: `${25 + Math.random() * 50}%`,
                        top: `${25 + Math.random() * 50}%`,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced User Profile - Top Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="ml-4"
          >
            {/* Enhanced Profile Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                {/* Extra Large Profile Picture */}
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500 via-cyan-500 to-indigo-500 p-1 shadow-xl shadow-cyan-500/25">
                  <div className="w-full h-full rounded-xl bg-black flex items-center justify-center overflow-hidden">
                    {jobPrimaryPhotoUrl ? (
                      <img 
                        src={jobPrimaryPhotoUrl} 
                        alt={`${targetUser?.fullName} - Job Profile`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : targetUser?.photoUrl ? (
                      <img 
                        src={targetUser.photoUrl} 
                        alt={targetUser.fullName}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* User Information */}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  {targetUser.fullName}
                </h3>
                <p className="text-cyan-400 font-medium text-lg">{targetUser.profession}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Vertical Layout - Stacked Sections */}
        <div className="space-y-8">

          {/* Second Section - Review Categories Accordion */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="categories" className="border-none">
                  <AccordionTrigger className="px-6 py-3 text-white hover:no-underline hover:bg-black/20">
                    <div className="flex items-center text-base">
                      <Target className="w-4 h-4 mr-2 text-cyan-400" />
                      Review Categories
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-3">
                      {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isSelected = selectedCategory === category.id;
                        
                        return (
                          <motion.button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full p-3 rounded-lg border transition-all duration-300 ${
                              isSelected
                                ? "bg-gradient-to-r " + category.color + " border-white/20 shadow-lg shadow-purple-500/25"
                                : "bg-black/20 border-gray-600/30 hover:border-cyan-500/50"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isSelected ? "bg-white/20" : "bg-gray-700"
                              }`}>
                                <Icon className={`w-3 h-3 ${isSelected ? "text-white" : "text-gray-400"}`} />
                              </div>
                              <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-300"}`}>
                                {category.label}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </motion.div>

          {/* Third Section - Overall Performance Stats Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="stats" className="border-none">
                  <AccordionTrigger className="px-6 py-3 text-white hover:no-underline hover:bg-black/20">
                    <div className="flex items-center text-base">
                      <TrendingUp className="w-4 h-4 mr-2 text-cyan-400" />
                      {categoryData.label} Stats
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                      {/* Average Rating */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white mb-2">
                          {categoryStats.averageRating.toFixed(1)}
                        </div>
                        <div className="flex justify-center space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(categoryStats.averageRating)
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-400 text-xs">
                          Based on {categoryStats.totalReviews} reviews
                        </p>
                      </div>

                      {/* Rating Distribution */}
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = categoryStats.ratingDistribution[rating] || 0;
                          const percentage = categoryStats.totalReviews > 0 
                            ? (count / categoryStats.totalReviews) * 100 
                            : 0;
                          
                          return (
                            <div key={rating} className="flex items-center space-x-3">
                              <span className="text-white text-sm w-4">{rating}</span>
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <div className="flex-1 bg-gray-700 rounded-full h-2">
                                <motion.div
                                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8, delay: rating * 0.1 }}
                                />
                              </div>
                              <span className="text-gray-400 text-sm w-8">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </motion.div>

          {/* Fourth Section - Recent Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center text-base">
                  <Users className="w-4 h-4 mr-2 text-cyan-400" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-4">
                <AnimatePresence>
                  {filteredReviews.length > 0 ? (
                    filteredReviews.slice(0, 5).map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-black/20 rounded-lg p-4 border border-gray-600/20"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 p-0.5">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                              {review.isAnonymous ? (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              ) : review.reviewer?.photoUrl ? (
                                <img 
                                  src={review.reviewer.photoUrl} 
                                  alt="Reviewer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-medium text-xs">
                                {review.isAnonymous ? "Anonymous Reviewer" : review.reviewer?.fullName || "Unknown"}
                              </span>
                              <div className="flex items-center space-x-2">
                                <div className="flex flex-col items-end space-y-1">
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= review.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-600"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex items-center text-gray-500 text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                {/* Delete button - only show for current user's reviews */}
                                {currentUser && review.reviewerUserId === currentUser.id && (
                                  <motion.button
                                    onClick={() => handleDeleteReview(review.id)}
                                    disabled={deleteReviewMutation.isPending}
                                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Delete your review"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed mt-2">
                              {review.reviewText}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Eye className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No reviews in this category yet</p>
                      <p className="text-gray-500 text-xs">Be the first to share your experience!</p>
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fifth Section - Write Review Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center text-base">
                  <Send className="w-4 h-4 mr-2 text-cyan-400" />
                  Write Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Star Rating */}
                <div>
                  <label className="text-white text-xs font-medium mb-2 block">
                    Rate this professional
                  </label>
                  <div className="flex space-x-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-110"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= (hoveredStar || rating)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-600 hover:text-yellow-200"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-cyan-400 text-xs mt-1"
                    >
                      {rating === 1 && "Poor"}
                      {rating === 2 && "Fair"}
                      {rating === 3 && "Good"}
                      {rating === 4 && "Very Good"}
                      {rating === 5 && "Excellent"}
                    </motion.p>
                  )}
                </div>

                {/* Review Text */}
                <div>
                  <label className="text-white text-xs font-medium mb-2 block">
                    Share your experience
                  </label>
                  <Textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={`Describe your experience with ${targetUser.fullName} in ${categoryData.label.toLowerCase()}...`}
                    className="bg-black/20 border-gray-600/30 text-white placeholder-gray-500 resize-none h-32 focus:border-cyan-500/50"
                  />
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isAnonymous ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-cyan-400" />
                    )}
                    <span className="text-white text-sm">
                      Submit anonymously
                    </span>
                  </div>
                  <Switch
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>

                {/* Submit Button */}
                <motion.div className="relative">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || !reviewText.trim() || submitReviewMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-0 h-12 relative overflow-hidden"
                  >
                    <AnimatePresence>
                      {submitReviewMutation.isPending ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center space-x-2"
                        >
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>
                            {existingReviewData?.review ? "Update Review" : "Submit Review"}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                  
                  {/* Submit Animation */}
                  <AnimatePresence>
                    {showSubmitAnimation && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center"
                      >
                        <div className="flex items-center space-x-2">
                          <Award className="w-5 h-5 text-white" />
                          <span className="text-white font-medium">Success!</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>


              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}