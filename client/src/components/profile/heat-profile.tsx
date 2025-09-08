import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Flame,
  Camera,
  Share2,
  Users,
  MapPin,
  Sparkles,
  Globe,
  Image,
  Bookmark,
  Bell,
  MessageCircle,
  User,
  FileText,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { User as UserType } from "@shared/schema";

interface HeatProfileProps {
  user: UserType;
}

export default function HeatProfile({ user }: HeatProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showGallery, setShowGallery] = useState(false);

  // Fetch user interests
  const { data: userInterests, isLoading: loadingInterests } = useQuery<
    Array<{ interest: string }>
  >({
    queryKey: ["/api/interests", user?.id],
    enabled: !!user,
  });

  // Format user interests
  const interests = userInterests || [];
  const interestList =
    interests.length > 0 ? interests.map((interest) => interest.interest) : [];

  const handleEditProfile = () => {
    setLocation("/settings");
  };

  // Random stats for social profile
  const followers = Math.floor(Math.random() * 700) + 200;
  const following = Math.floor(Math.random() * 300) + 100;
  const posts = Math.floor(Math.random() * 50) + 5;

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Profile Header with gradient background - orange theme for HEAT */}
      <div className="relative h-36">
        <div
          className="w-full h-full bg-gradient-to-r from-orange-500 to-amber-400"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>

        {/* Floating flame animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white opacity-30"
              initial={{
                x: Math.random() * 100 + "%",
                y: "100%",
                scale: 0.3 + Math.random() * 0.7,
              }}
              animate={{
                y: "-20%",
                rotate: Math.random() * 60 - 30,
                transition: {
                  repeat: Infinity,
                  duration: 8 + Math.random() * 15,
                  delay: Math.random() * 5,
                  ease: "easeInOut",
                },
              }}
            >
              <Flame fill="currentColor" size={20 + Math.random() * 20} />
            </motion.div>
          ))}
        </div>

        {/* Profile photo with social stats */}
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
          <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                alt="User profile"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-r from-orange-300 to-amber-300 border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-white text-4xl font-light">
                  {user.fullName?.charAt(0) || "U"}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-8 px-5">
        <div className="text-center mb-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-heading text-2xl font-bold text-orange-600">
              {user.fullName || "User"}
              {user.verifiedByPhone && (
                <Badge className="ml-2 bg-blue-500 text-white">
                  <span className="text-xs">✓</span>
                </Badge>
              )}
            </h2>
          </motion.div>

          {/* Social Media Stats */}
          <div className="flex justify-center space-x-8 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{posts}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{followers}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">{following}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>
        </div>

        {/* Bio Section removed for HEAT profile per request */}

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center p-3 h-auto"
            >
              <Image className="h-5 w-5 mb-1 text-orange-500" />
              <span className="text-xs text-gray-600">Photos</span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center p-3 h-auto"
            >
              <FileText className="h-5 w-5 mb-1 text-orange-500" />
              <span className="text-xs text-gray-600">Stories</span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center p-3 h-auto"
            >
              <Bookmark className="h-5 w-5 mb-1 text-orange-500" />
              <span className="text-xs text-gray-600">Saved</span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center p-3 h-auto"
            >
              <Share2 className="h-5 w-5 mb-1 text-orange-500" />
              <span className="text-xs text-gray-600">Share</span>
            </Button>
          </div>
        </div>

        {/* Photos gallery with social media style */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 flex items-center">
              <Camera className="h-4 w-4 mr-2 text-orange-500" />
              My Photos
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-500 text-xs h-8"
              onClick={() => setShowGallery(!showGallery)}
            >
              {showGallery ? "Show less" : "View all"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {user.photoUrl ? (
              <motion.div
                className="relative aspect-square rounded-lg overflow-hidden"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src={user.photoUrl || ""}
                  className="w-full h-full object-cover"
                  alt="User gallery"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <div className="flex items-center text-white text-xs">
                    <Flame className="h-3 w-3 mr-1" fill="currentColor" />
                    <span>42</span>
                  </div>
                  <div className="flex items-center text-white text-xs">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    <span>6</span>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Example gallery items */}
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className={`aspect-square rounded-lg bg-gray-100 flex items-center justify-center ${!showGallery && index > 1 ? "hidden" : ""}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-full w-full rounded-lg text-orange-500 flex flex-col"
                >
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-xs">Add</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Interests section for social networking */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 flex items-center">
              <Flame className="h-4 w-4 mr-2 text-orange-500" />
              Interests
            </h3>
          </div>

          <div className="bg-white border border-orange-100 rounded-lg p-4 shadow-sm">
            {loadingInterests ? (
              <div className="w-full py-2 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              </div>
            ) : interestList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {interestList.map((interest: string, index: number) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200 px-3 py-1"
                  >
                    #{interest.toLowerCase().replace(/\s+/g, "")}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">
                  No interests added yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-200"
                  onClick={handleEditProfile}
                >
                  Add Interests
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Friend suggestions section */}
        <div className="mb-8">
          <Card className="overflow-hidden border-orange-100 shadow-sm">
            <div className="bg-gradient-to-r from-orange-100 to-amber-50 px-4 py-3 border-b border-orange-100">
              <h3 className="font-medium text-orange-800 flex items-center">
                <Users className="h-4 w-4 mr-2 text-orange-500" />
                People You May Know
              </h3>
            </div>
            <CardContent className="p-4">
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-20">
                    <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-xs text-center mt-1 font-medium">
                      User {index + 1}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 text-orange-500 h-7 text-xs"
                    >
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Promotional widget removed as requested */}
      </div>
    </div>
  );
}
