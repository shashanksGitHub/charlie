import { User, UserInterest, UserPhoto } from "@shared/schema";
import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Pencil,
  MapPin,
  UserCheck,
  Gift,
  Camera,
  Loader2,
  Sparkles,
  Coffee,
  Book,
  Film,
  Music,
  Edit,
} from "lucide-react";

interface MeetProfileProps {
  user: User;
}

export default function MeetProfile({ user }: MeetProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newInterest, setNewInterest] = useState("");
  const [photoExpanded, setPhotoExpanded] = useState(false);

  // State for field editing
  const [editField, setEditField] = useState<string | null>(null);
  const [residenceValue, setResidenceValue] = useState(user.location || "");
  const [professionValue, setProfessionValue] = useState(user.profession || "");
  const [religionValue, setReligionValue] = useState(user.religion || "");
  const [bioValue, setBioValue] = useState(user.bio || "");
  const [relationshipGoalValue, setRelationshipGoalValue] = useState(
    user.relationshipGoal || "",
  );

  // State for preview mode
  const [previewMode, setPreviewMode] = useState(false);

  // State for field visibility - default to off if field not specified
  const [fieldVisibility, setFieldVisibility] = useState({
    residence: !!user.location,
    tribe: !!user.ethnicity,
    profession: !!user.profession,
    religion: !!user.religion,
    bio: !!user.bio,
    relationshipGoal: !!user.relationshipGoal,
  });

  // Fetch user interests
  const { data: userInterests, isLoading: loadingInterests } = useQuery<
    Array<{ interest: string }>
  >({
    queryKey: ["/api/interests", user?.id],
    enabled: !!user,
  });

  // Fetch user photos
  const { data: userPhotos, isLoading: loadingPhotos } = useQuery<
    Array<{ id: number; photoUrl: string; isPrimary: boolean }>
  >({
    queryKey: [`/api/photos/${user?.id}`],
    enabled: !!user,
  });

  // Format user interests
  const interests = userInterests || [];
  const interestList =
    interests.length > 0 ? interests.map((interest) => interest.interest) : [];

  // Add interest mutation
  const addInterestMutation = useMutation({
    mutationFn: async (interest: string) => {
      const res = await apiRequest("POST", "/api/interests", {
        interest,
        userId: user.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interests", user?.id] });
      setNewInterest("");
      toast({
        title: "Interest added",
        description: "Your interest has been added to your profile",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding interest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast({
        title: "File too large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;
      if (photoUrl) {
        addPhotoMutation.mutate(photoUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      const res = await apiRequest("POST", "/api/photos", {
        photoUrl,
        isPrimary: !userPhotos || userPhotos.length === 0, // Make first photo primary
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${user?.id}`] });
      toast({
        title: "Photo added",
        description: "Your photo has been added to your profile",
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast({
        title: "Error adding photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest("DELETE", `/api/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${user?.id}`] });
      toast({
        title: "Photo deleted",
        description: "Your photo has been removed from your profile",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set primary photo mutation
  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await apiRequest("PATCH", `/api/photos/${photoId}/primary`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Primary photo updated",
        description: "Your profile picture has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating primary photo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInterest.trim()) {
      addInterestMutation.mutate(newInterest.trim());
    }
  };

  const handleEditProfile = () => {
    setLocation("/settings");
  };

  const handleSettings = () => {
    setLocation("/settings");
  };

  const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Toggle edit mode for a field
  const toggleEditMode = (fieldName: string) => {
    setEditField(editField === fieldName ? null : fieldName);
  };

  // Toggle visibility for a field
  const toggleVisibility = (fieldName: string) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName as keyof typeof prev],
    }));
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<any>) => {
      const res = await apiRequest("PATCH", `/api/profile/${user.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save edited field
  const saveField = (fieldName: string) => {
    let value = "";
    let updateData: Partial<any> = {};

    switch (fieldName) {
      case "residence":
        value = residenceValue;
        updateData = { location: value };
        break;
      case "profession":
        value = professionValue;
        updateData = { profession: value };
        break;
      case "religion":
        value = religionValue;
        updateData = { religion: value };
        break;
      case "bio":
        value = bioValue;
        updateData = { bio: value };
        break;
      case "relationshipGoal":
        value = relationshipGoalValue;
        updateData = { relationshipGoal: value };
        break;
    }

    // Update in database
    updateProfileMutation.mutate({
      ...updateData,
      // Also send visibility preferences
      visibilityPreferences: JSON.stringify(fieldVisibility),
    });

    setEditField(null);
  };

  // Calculate compatibility with matches
  const compatibilityScore = getRandomInt(78, 95);

  // Function to get user's displayed interests
  const getUserInterests = () => {
    return interestList.slice(0, 3);
  };

  return (
    <div className="pb-0">
      {previewMode ? (
        /* SwipeCard Preview */
        <div className="h-[650px] mt-4 mb-10 px-4">
          <h3 className="text-lg font-semibold text-purple-800 text-center mb-2">
            Card Preview
          </h3>
          <div className="text-xs text-center text-gray-500 mb-4">
            This is how others will see your profile when swiping
          </div>

          <div className="w-full h-[570px] mx-auto rounded-2xl overflow-hidden shadow-xl border-2 border-white">
            <div
              className="h-full flex flex-col rounded-xl overflow-hidden
              drop-shadow-[0_0_20px_rgba(168,85,247,0.2)]
              shadow-[0_0_15px_rgba(168,85,247,0.15),inset_0_1px_3px_rgba(255,255,255,0.7)]"
            >
              {/* Profile image - increased height */}
              <div className="relative h-[90%] overflow-hidden">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    className="w-full h-full object-cover"
                    alt={`${user.fullName}'s profile`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-purple-50 to-amber-50">
                    <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-md">
                      <span className="text-xl bg-gradient-to-r from-purple-600 to-amber-500 text-transparent bg-clip-text font-bold">
                        No Photo Available
                      </span>
                    </div>
                  </div>
                )}

                {/* Compatibility score with gradient and animation */}
                <div className="absolute top-2 right-4 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl backdrop-blur-sm">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      backgroundImage: `conic-gradient(#a855f7 0%, #a855f7 ${compatibilityScore}%, #f59e0b ${compatibilityScore}%, #f59e0b 100%)`,
                    }}
                  >
                    <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-inner">
                      <span className="text-lg font-extrabold">
                        {compatibilityScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* User info overlay at bottom of image with transparent gradient background */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent px-4 pt-14 pb-3 flex flex-col">
                  {/* Main row with name, age, and ethnicity */}
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-3xl font-extrabold flex items-center">
                      <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                        <span className="text-4xl">
                          {user.fullName.split(" ")[0].charAt(0)}
                        </span>
                        {user.fullName.split(" ")[0].slice(1)},{" "}
                        {calculateAge(user.dateOfBirth)}
                      </span>
                    </h2>
                    {fieldVisibility.tribe && user.ethnicity && (
                      <div className="px-3 py-1 bg-gradient-to-r from-purple-600/90 to-fuchsia-600/90 text-white text-sm rounded-full shadow-md">
                        {user.ethnicity}
                      </div>
                    )}
                  </div>

                  {/* Location row */}
                  {fieldVisibility.residence && user.location && (
                    <div className="flex items-center mb-1.5">
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="font-medium text-sm text-orange-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          {user.location}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Job/Profession row with icon */}
                  {fieldVisibility.profession && user.profession && (
                    <div className="flex items-center mb-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        {user.profession}
                      </span>
                    </div>
                  )}

                  {/* Religion display */}
                  {fieldVisibility.religion && user.religion && (
                    <div className="flex items-center mb-1.5">
                      <Gift className="h-4 w-4 mr-1 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                      <span className="font-medium text-sm text-pink-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        {user.religion}
                      </span>
                    </div>
                  )}

                  {/* Bio with enhanced visibility */}
                  {fieldVisibility.bio && user.bio && (
                    <div className="mb-2 rounded-md overflow-hidden">
                      <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Relationship goal if visible */}
                  {fieldVisibility.relationshipGoal &&
                    user.relationshipGoal && (
                      <div className="flex items-center mb-2">
                        <Heart
                          className="h-4 w-4 mr-1 text-rose-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                          fill="currentColor"
                        />
                        <span className="bg-gradient-to-r from-rose-300 to-red-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          Looking for: {user.relationshipGoal}
                        </span>
                      </div>
                    )}

                  {/* Interests with colorful badges */}
                  {getUserInterests().length > 0 && (
                    <div>
                      <span className="font-semibold text-white bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                        Top Interests:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {getUserInterests().map(
                          (interest: string, index: number) => {
                            // Dynamic colorful badges with alternating gradients
                            const gradientClasses = [
                              "from-purple-500/90 to-fuchsia-500/90",
                              "from-amber-500/90 to-orange-500/90",
                              "from-teal-500/90 to-cyan-500/90",
                            ];
                            const gradientClass =
                              gradientClasses[index % gradientClasses.length];

                            return (
                              <Badge
                                key={`interest-${index}`}
                                className={`relative bg-gradient-to-br ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border border-white/30 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                                <span className="relative z-10 drop-shadow-sm">{interest}</span>
                              </Badge>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancel and Like button preview */}
              <div className="py-2 px-5 flex justify-around bg-white">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-r from-red-300 to-red-500 text-white shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-yellow-300 to-yellow-500 text-black shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-9 w-9"
                    viewBox="0 0 24 24"
                    fill="black"
                    stroke="black"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-r from-green-300 to-green-500 text-white shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="white"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setPreviewMode(false)}
              variant="default"
              className="bg-purple-600 hover:bg-purple-700 text-sm"
            >
              Back to Profile
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Profile Header with gradient background */}
          <div className="w-full flex flex-col items-center">
            {/* Top gradient background */}
            <div className="relative w-full h-36">
              <div
                className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>

              {/* Floating hearts animation */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-white opacity-30"
                    initial={{
                      x: `${Math.random() * 100}%`,
                      y: "100%",
                      scale: 0.3 + Math.random() * 0.7,
                    }}
                    animate={{
                      y: "-20%",
                      rotate: Math.random() * 360,
                      transition: {
                        repeat: Infinity,
                        duration: 10 + Math.random() * 20,
                        delay: Math.random() * 5,
                        ease: "linear",
                      },
                    }}
                  >
                    <Heart
                      fill={Math.random() > 0.5 ? "#fff" : "none"}
                      size={20 + Math.random() * 20}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Preview toggle button */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center bg-white/90 backdrop-blur-sm shadow-md px-3 py-1 rounded-full border border-pink-200">
                <span className="text-xs text-purple-800 font-medium mr-2">
                  Preview Card
                </span>
                <Switch
                  checked={previewMode}
                  onCheckedChange={setPreviewMode}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>

            {/* Profile photo - Moved to top of page */}
            <div className="relative -mt-14">
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => setPhotoExpanded(!photoExpanded)}
                className="cursor-pointer"
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                    alt="User profile"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-white text-4xl font-light">
                      {user.fullName?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Main content */}
          <div className="mt-1 px-5 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="font-heading text-2xl font-bold text-purple-800">
                {user.fullName}, {calculateAge(user.dateOfBirth)}
              </h2>
              {user.profession && (
                <p className="text-gray-600 mb-1">{user.profession}</p>
              )}
            </motion.div>

            {/* Compatibility indicator */}
            <div className="mt-2 mb-2">
              <div className="relative h-3 w-48 bg-gray-200 rounded-full mx-auto">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${compatibilityScore}%` }}
                ></div>
              </div>
              <p className="mt-1 text-sm text-purple-800 font-medium flex items-center justify-center">
                <Sparkles className="h-3 w-3 mr-1" />
                {compatibilityScore}% Match with your preferences
              </p>
            </div>
          </div>

          {/* Profile Fields in the Requested Order */}
          <div className="px-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Your info
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {/* Residence (location) */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    Residence
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("residence")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.residence}
                        onCheckedChange={() => toggleVisibility("residence")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "residence" ? (
                  <div className="mt-2">
                    <Input
                      value={residenceValue}
                      onChange={(e) => setResidenceValue(e.target.value)}
                      placeholder="Enter your city and country"
                      className="text-xs border-pink-200 focus:border-purple-500 h-7"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => saveField("residence")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 mt-1">
                    {user.location || "Not specified"}
                  </p>
                )}
              </div>

              {/* Tribe (Ethnicity) - Cannot be edited */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <UserCheck className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    Tribe
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-500 text-xs px-2 py-0"
                    >
                      Cannot be edited
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.tribe}
                        onCheckedChange={() => toggleVisibility("tribe")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mt-1">
                  {user.ethnicity || "Not specified"}
                </p>
              </div>

              {/* Profession */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 mr-1.5 text-pink-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="2"
                        y="7"
                        width="20"
                        height="14"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    Profession
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("profession")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.profession}
                        onCheckedChange={() => toggleVisibility("profession")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "profession" ? (
                  <div className="mt-2">
                    <Input
                      value={professionValue}
                      onChange={(e) => setProfessionValue(e.target.value)}
                      placeholder="Enter your profession"
                      className="text-xs border-pink-200 focus:border-purple-500 h-7"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => saveField("profession")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 mt-1">
                    {user.profession || "Not specified"}
                  </p>
                )}
              </div>

              {/* Religion */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <Gift className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    Religion
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("religion")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.religion}
                        onCheckedChange={() => toggleVisibility("religion")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "religion" ? (
                  <div className="mt-2">
                    <Input
                      value={religionValue}
                      onChange={(e) => setReligionValue(e.target.value)}
                      placeholder="Enter your religion"
                      className="text-xs border-pink-200 focus:border-purple-500 h-7"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => saveField("religion")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 mt-1">
                    {user.religion || "Not specified"}
                  </p>
                )}
              </div>

              {/* About Me */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <span className="h-3.5 w-3.5 mr-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
                    About Me
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("bio")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.bio}
                        onCheckedChange={() => toggleVisibility("bio")}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "bio" ? (
                  <div className="mt-2">
                    <textarea
                      value={bioValue}
                      onChange={(e) => setBioValue(e.target.value)}
                      placeholder="Tell others about yourself..."
                      className="w-full text-xs border-pink-200 focus:border-purple-500 rounded-md min-h-[70px] p-2"
                    />
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => saveField("bio")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                    {user.bio || "No bio provided yet"}
                  </p>
                )}
              </div>

              {/* Relationship Goals */}
              <div className="bg-white border border-pink-100 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-purple-800 flex items-center">
                    <Heart
                      className="h-3.5 w-3.5 mr-1.5 text-pink-500"
                      fill="currentColor"
                    />
                    Relationship Goals
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleEditMode("relationshipGoal")}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Show</span>
                      <Switch
                        checked={fieldVisibility.relationshipGoal}
                        onCheckedChange={() =>
                          toggleVisibility("relationshipGoal")
                        }
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {editField === "relationshipGoal" ? (
                  <div className="mt-2">
                    <div className="grid grid-cols-3 gap-2">
                      {["Friendship", "Marriage", "Relationship Mentor"].map(
                        (goal) => (
                          <button
                            key={goal}
                            className={`text-xs p-2 rounded border text-center ${
                              relationshipGoalValue === goal
                                ? "bg-purple-100 border-purple-300 text-purple-700"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-purple-50"
                            }`}
                            onClick={() => setRelationshipGoalValue(goal)}
                          >
                            {goal}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        onClick={() => saveField("relationshipGoal")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="flex items-center">
                      <p className="text-xs text-gray-700">
                        {user.relationshipGoal || "Not specified"}
                      </p>
                      {user.relationshipGoal && (
                        <Badge
                          variant="outline"
                          className="ml-2 bg-green-50 border-green-200 text-green-700 text-xs"
                        >
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Options: Friendship, Marriage, Relationship Mentor
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photos gallery with add/remove functionality */}
          <div className="px-5 mb-6">
            <h3 className="font-medium text-purple-800 mb-2 flex items-center">
              <div className="flex items-center">
                <Camera className="h-4 w-4 mr-2 text-pink-500" />
                My Photos
              </div>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {loadingPhotos ? (
                <div className="col-span-3 py-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : userPhotos && userPhotos.length > 0 ? (
                // Display all user photos
                userPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => window.open(photo.photoUrl, "_blank")}
                  >
                    <img
                      src={photo.photoUrl}
                      className="w-full h-full object-cover"
                      alt="User photo"
                    />
                    {/* Badge for primary photo */}
                    {photo.isPrimary && (
                      <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        Primary
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-between p-2">
                      {!photo.isPrimary && (
                        <Button
                          variant="ghost"
                          className="bg-white/20 text-white hover:bg-white/40 h-7 w-7 p-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryPhotoMutation.mutate(photo.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"></path>
                          </svg>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="bg-white/20 text-white hover:bg-white/40 hover:text-red-500 h-7 w-7 p-0 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Only allow deletion if it's not the only photo or it's not the primary photo
                          if (userPhotos.length > 1 && !photo.isPrimary) {
                            deletePhotoMutation.mutate(photo.id);
                          } else if (photo.isPrimary) {
                            toast({
                              title: "Cannot Delete",
                              description:
                                "You cannot delete your primary photo. Set another photo as primary first.",
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: "Cannot Delete",
                              description:
                                "You must have at least one photo on your profile.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : null}

              {/* Hidden file input for photo upload */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />

              {/* Add photo button - single "+" button instead of multiple placeholders */}
              {(!userPhotos || userPhotos.length < 6) && (
                <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-purple-200">
                  <Button
                    variant="ghost"
                    className="h-full w-full rounded-lg text-purple-500 flex flex-col"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    <span className="text-xs mt-1">Add Photo</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Interests section with InterestSelector */}
          <div className="px-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-purple-800 flex items-center">
                <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
                  <BookType className="h-5 w-5 text-pink-500" />
                </div>
                Interests
              </h3>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit Interests
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[380px] rounded-3xl bg-gradient-to-b from-gray-900/95 via-purple-950/90 to-gray-900/95 border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)] overflow-hidden backdrop-blur-xl">
                  {/* Animated background elements */}
                  <div className="absolute inset-0 overflow-hidden opacity-20">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-fuchsia-500 to-purple-600 dark:from-fuchsia-600 dark:to-purple-700 rounded-full animate-pulse blur-3xl mix-blend-overlay"></div>
                    <div className="absolute -bottom-32 -left-16 w-56 h-56 bg-gradient-to-tr from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 rounded-full animate-pulse animation-delay-2000 blur-3xl mix-blend-overlay"></div>
                    <div className="absolute top-1/3 -right-16 w-48 h-48 bg-gradient-to-tr from-pink-500 to-rose-600 dark:from-pink-600 dark:to-rose-700 rounded-full animate-pulse animation-delay-4000 blur-3xl mix-blend-overlay"></div>
                  </div>

                  {/* Close button */}
                  <DialogClose className="absolute top-4 right-4 rounded-full w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors shadow-md border border-white/20 z-50">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </DialogClose>

                  {/* Glowing border effect */}
                  <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

                  <div className="relative z-10 backdrop-blur-md">
                    <DialogHeader className="pb-0">
                      <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
                      <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                        Select Your Interests
                      </DialogTitle>
                    </DialogHeader>

                    <div className="relative py-3 px-1 flex flex-col items-center">
                      <p className="text-xs text-center text-gray-200 mb-2">
                        Add interests to find better matches
                      </p>

                      {/* Use the InterestSelector component with scrollable container */}
                      <div className="relative rounded-xl p-2 bg-black/30 backdrop-blur-xl border border-purple-500/20 shadow-inner max-w-[350px]">
                        <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                          <InterestSelector
                            selectedInterests={interestList}
                            onSelectInterest={(interest) => {
                              addInterestMutation.mutate(interest);
                            }}
                            onRemoveInterest={(interest) => {
                              const newInterests = interestList.filter(
                                (i) => i !== interest,
                              );
                              // TODO: Add remove interest mutation
                            }}
                            maxInterests={10}
                            horizontalCategories={false}
                            darkMode={true}
                            compactLayout={true}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Display selected interests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
              {interestList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interestList.map((interest, index) => {
                    // Dynamic colorful badges with alternating gradients
                    const gradientClasses = [
                      "from-purple-500/90 to-fuchsia-500/90",
                      "from-amber-500/90 to-orange-500/90",
                      "from-teal-500/90 to-cyan-500/90",
                    ];
                    const gradientClass =
                      gradientClasses[index % gradientClasses.length];

                    return (
                      <Badge
                        key={`${interest}-${index}`}
                        className={`bg-gradient-to-r ${gradientClass} text-white shadow-md text-xs py-1 px-3 border-0`}
                      >
                        {interest}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookType className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm italic">
                    Add interests to find better matches
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Premium feature section - Last item with no whitespace */}
          <div className="px-5 mb-0 pb-0">
            <div className="relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-90"></div>
              <div className="relative p-6 text-white">
                <h3 className="font-bold text-xl mb-2">Upgrade to Premium</h3>
                <p className="text-white/80 text-sm mb-4">
                  Get 5x more matches and see who likes your profile
                </p>
                <Button className="w-full bg-white text-purple-700 hover:bg-gray-100 font-semibold">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Premium
                </Button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-3 right-3 w-16 h-16 rounded-full bg-white opacity-10"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full bg-white opacity-10"></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to calculate age from date of birth
function calculateAge(dob: Date | null): string {
  if (!dob) return "";

  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age.toString();
}
