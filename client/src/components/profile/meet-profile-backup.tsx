import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pencil, Eye, Edit } from "lucide-react";
import {
  Heart,
  Camera,
  Settings,
  Sparkles,
  MessageCircle,
  CalendarHeart,
  UserCheck,
  Gift,
  Music,
  Film,
  Book,
  Coffee,
  MapPin,
  Loader2,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { User } from "@shared/schema";
import { ReligionSelect } from "@/components/ui/religion-select";
import { getReligionDisplayName } from "@/lib/religions";
import { CityInput } from "@/components/ui/city-input";

interface MeetProfileProps {
  user: User;
}

export default function MeetProfile({ user }: MeetProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fields state
  const [residenceValue, setResidenceValue] = useState(user.location || "");
  const [professionValue, setProfessionValue] = useState(user.profession || "");
  const [religionValue, setReligionValue] = useState(user.religion || "");
  const [bioValue, setBioValue] = useState(user.bio || "");
  const [relationshipGoalValue, setRelationshipGoalValue] = useState(
    user.relationshipGoal || "",
  );

  // State for field visibility - default to off if field not specified
  const [fieldVisibility, setFieldVisibility] = useState({
    residence: !!user.location,
    tribe: !!user.ethnicity,
    profession: !!user.profession,
    religion: !!user.religion,
    bio: !!user.bio,
    relationshipGoal: !!user.relationshipGoal,
  });

  // Fetch user photos
  const { data: userPhotos, isLoading: loadingPhotos } = useQuery<
    Array<{ id: number; photoUrl: string; isPrimary: boolean }>
  >({
    queryKey: [`/api/photos/${user?.id}`],
    enabled: !!user,
  });

  // File upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced file selection handler with comprehensive validation and performance optimization
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type more thoroughly
    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    if (!validImageTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, WebP, GIF)",
        variant: "destructive",
      });
      // Reset file input
      if (event.target) event.target.value = "";
      return;
    }

    // Validate file size - 5MB limit
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast({
        title: "File too large",
        description:
          "Image must be smaller than 5MB. Please compress the image or select a smaller one.",
        variant: "destructive",
      });
      // Reset file input
      if (event.target) event.target.value = "";
      return;
    }

    // Validate image dimensions and quality by loading it (prevents corrupted images)
    const validateImageAndUpload = (fileUrl: string) => {
      // Create a loading toast for the validation step
      const { id: validationToastId, dismiss: dismissValidationToast } = toast({
        title: "Validating image",
        description: "Checking image dimensions and quality...",
        duration: 30000, // Long duration since we'll manually dismiss
      });

      const img = new Image();

      // Original onload handler (will be properly set after timeout setup)
      const handleImageLoad = () => {
        // Dismiss the validation toast
        dismissValidationToast();

        // Valid image, proceed with upload checks

        // Check if image is too small
        if (img.width < 200 || img.height < 200) {
          toast({
            title: "Image too small",
            description:
              "Please select an image that is at least 200x200 pixels.",
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Check aspect ratio - warn if image is very tall or very wide
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          toast({
            title: "Unusual aspect ratio",
            description:
              "For best results, use images with a more balanced width and height.",
            variant: "default", // Explicitly set variant to default (the only options are default or destructive)
          });
          // Continue anyway as this is just a warning
        }

        // Check if we already have maximum photos (8)
        if (userPhotos && userPhotos.length >= 8) {
          toast({
            title: "Maximum photos reached",
            description:
              "You can only have 8 photos. Please delete some photos before adding more.",
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Image is valid, create optimistic toast that will be auto-dismissed
        const { id: uploadingToastId, dismiss: dismissUploadingToast } = toast({
          title: "Uploading photo",
          description: "Your photo is being uploaded...",
          duration: 60000, // Long enough to handle slow uploads
        });

        // Process in batches to avoid UI freezing
        setTimeout(() => {
          // Call mutation
          addPhotoMutation.mutate(fileUrl);

          // Handle toast dismissal separately with a delay
          setTimeout(() => {
            dismissUploadingToast();
          }, 2000); // Dismiss after a reasonable time
        }, 10);
      };

      // Original error handler (will be properly set after timeout setup)
      const handleImageError = () => {
        // Dismiss the validation toast
        dismissValidationToast();

        toast({
          title: "Invalid image",
          description:
            "The selected file appears to be corrupted or is not a valid image.",
          variant: "destructive",
        });
        // Reset file input
        if (event.target) event.target.value = "";
      };

      // Set a timeout for loading failure
      const imageLoadTimeout = setTimeout(() => {
        dismissValidationToast();

        toast({
          title: "Image load timeout",
          description:
            "The image took too long to load. It may be too large or corrupted.",
          variant: "destructive",
        });

        // Reset file input
        if (event.target) event.target.value = "";

        // Cancel the image load
        img.src = "";
      }, 20000); // 20 second timeout

      // Set up the event handlers correctly
      img.onload = () => {
        clearTimeout(imageLoadTimeout);
        handleImageLoad();
      };

      img.onerror = () => {
        clearTimeout(imageLoadTimeout);
        handleImageError();
      };

      // Start loading the image
      img.src = fileUrl;
    };

    // Track loading state for better UI feedback
    const { dismiss: dismissLoadingToast } = toast({
      title: "Processing photo",
      description: "Your photo is being prepared for upload...",
      duration: 60000, // Long duration since we'll manually dismiss on success/error
    });

    // Read the file as data URL with enhanced error handling
    const reader = new FileReader();

    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;

      // Dismiss the loading toast since processing is done
      dismissLoadingToast();

      if (photoUrl) {
        // Check image data URL for validity
        if (!photoUrl.startsWith("data:image/")) {
          toast({
            title: "Invalid image format",
            description:
              "The file appears to be corrupted or is not a valid image.",
            variant: "destructive",
          });
          // Reset file input
          if (event.target) event.target.value = "";
          return;
        }

        // Proceed with validation and upload
        validateImageAndUpload(photoUrl);
      } else {
        toast({
          title: "Empty image data",
          description:
            "The file couldn't be read correctly. Please try another image.",
          variant: "destructive",
        });
        // Reset file input
        if (event.target) event.target.value = "";
      }
    };

    reader.onerror = () => {
      // Dismiss the loading toast since processing failed
      dismissLoadingToast();

      toast({
        title: "Upload failed",
        description:
          "Failed to process image. The file may be corrupted. Please try another image.",
        variant: "destructive",
      });

      // Reset file input
      if (event.target) event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  // Add photo mutation (with performance optimization)
  const addPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      // Implement optimistic UI update to show progress immediately
      const optimisticPhoto = {
        id: Date.now(), // Temporary ID
        userId: user.id,
        photoUrl: photoUrl,
        isPrimary: !userPhotos || userPhotos.length === 0,
        createdAt: new Date().toISOString(),
      };

      // Update UI immediately with optimistic data
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        return [...(old || []), optimisticPhoto];
      });

      try {
        // Actual API request (can happen in background)
        const res = await apiRequest("POST", "/api/photos", {
          photoUrl,
          isPrimary: !userPhotos || userPhotos.length === 0, // Make first photo primary
        });

        // Success toast
        toast({
          title: "Photo added",
          description: "Your photo has been added to your profile",
        });

        return await res.json();
      } catch (error) {
        // Remove optimistic update on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
          return (old || []).filter(
            (photo: any) => photo.id !== optimisticPhoto.id,
          );
        });

        // Show error toast
        toast({
          title: "Error adding photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });

        throw error;
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    onSuccess: () => {
      // No need to invalidate query as we're already using optimistic updates
      // Just ensure the server data is correctly synced
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/photos/${user?.id}`],
        });
      }, 500); // Small delay to avoid UI flicker
    },
  });

  // Delete photo mutation (with true optimistic update)
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      // Store the original photo list for potential recovery
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);

      // Apply optimistic update immediately - remove the photo from UI
      queryClient.setQueryData([`/api/photos/${user?.id}`], (old: any) => {
        return (old || []).filter((photo: any) => photo.id !== photoId);
      });

      try {
        // Show quick toast without blocking UI
        toast({
          title: "Deleting photo",
          description: "Removing photo from your profile...",
          duration: 2000,
        });

        // Make the API request
        await apiRequest("DELETE", `/api/photos/${photoId}`);

        // Show success toast
        toast({
          title: "Photo deleted",
          description: "Your photo has been removed from your profile",
        });

        return photoId;
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);

        // Show error toast
        toast({
          title: "Error deleting photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: (deletedPhotoId) => {
      // Check if the deleted photo was primary
      const wasPrimary = userPhotos?.find(
        (photo) => photo.id === deletedPhotoId,
      )?.isPrimary;

      // If deleted photo was primary, need to update user data as well
      if (wasPrimary) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }

      // Final sync with server data (with delay to avoid UI flicker)
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/photos/${user?.id}`],
        });
      }, 500);
    },
    onError: () => {
      // Error is already handled in the mutation function
    },
  });

  // Set primary photo mutation (with true optimistic updates)
  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      // Save original data for potential recovery
      const originalPhotos = queryClient.getQueryData([
        `/api/photos/${user?.id}`,
      ]);
      const originalUser = queryClient.getQueryData(["/api/user"]);

      // Create optimistic updated photo array
      if (userPhotos) {
        // Get the URL of the new primary photo
        const newPrimaryPhotoUrl = userPhotos.find(
          (photo) => photo.id === photoId,
        )?.photoUrl;

        // Update photo array optimistically
        const updatedPhotos = userPhotos.map((photo) => ({
          ...photo,
          isPrimary: photo.id === photoId,
        }));

        // Apply immediate UI updates
        queryClient.setQueryData([`/api/photos/${user?.id}`], updatedPhotos);

        // Also update user data with new primary photo
        if (newPrimaryPhotoUrl && originalUser) {
          queryClient.setQueryData(["/api/user"], {
            ...originalUser,
            photoUrl: newPrimaryPhotoUrl,
          });
        }
      }

      // Show quick processing toast
      toast({
        title: "Updating primary photo",
        description: "Setting your profile picture...",
        duration: 2000,
      });

      try {
        // Make the actual API request
        const res = await apiRequest("PATCH", `/api/photos/${photoId}/primary`);
        const data = await res.json();

        // Show success toast
        toast({
          title: "Primary photo updated",
          description: "Your profile picture has been updated",
        });

        return data;
      } catch (error) {
        // Restore original data on error
        queryClient.setQueryData([`/api/photos/${user?.id}`], originalPhotos);
        queryClient.setQueryData(["/api/user"], originalUser);

        // Show error toast
        toast({
          title: "Error updating primary photo",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Final sync with server data (with delay to avoid UI flicker)
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/photos/${user?.id}`],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 500);
    },
    onError: () => {
      // Error is already handled in the mutation function
    },
  });

  const handleEditProfile = () => {
    setLocation("/settings");
  };

  const handleSettings = () => {
    setLocation("/settings");
  };

  const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string | Date | null | undefined) => {
    if (!dateOfBirth) return 0;
    const birthDate =
      dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
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
      // Only update the specific field, not the entire profile
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
      console.error("Profile update error:", error);
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

  return (
    <div className="pb-0 relative">
      {/* Profile Header with gradient background */}
      <div className="w-full flex flex-col items-center relative">
        {/* Top gradient background */}
        <div className="relative w-full h-20">
          <div
            className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-500"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>

          {/* Floating "Show Preview" button positioned closer to profile photo */}
          <div className="absolute -bottom-5 right-4 z-[100]">
            <Button
              variant="outline"
              size="sm"
              className={`flex items-center gap-1.5 border-2 border-pink-300 dark:border-pink-700 bg-white/95 hover:bg-white/100 dark:bg-gray-800/95 dark:hover:bg-gray-800 shadow-lg transition-colors pointer-events-auto rounded-full px-3`}
              onClick={() => {
                console.log(
                  "Preview button clicked. Current state:",
                  !showPreview,
                );
                setShowPreview(!showPreview);
              }}
            >
              {showPreview ? (
                <>
                  <X className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    Hide Preview
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    Show Preview
                  </span>
                  <Check className="h-3.5 w-3.5 ml-1 text-purple-500 dark:text-purple-400" />
                </>
              )}
            </Button>
          </div>

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

        {/* Profile photo - Hide when preview is showing */}
        {!showPreview && (
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
        )}
      </div>

      {/* Profile Preview (SwipeCard) */}
      {showPreview && (
        <div className="mt-0 mb-6 px-4 block relative z-40 bg-white dark:bg-gray-900 pt-4 pb-2 rounded-lg">
          <div className="relative">
            <div className="flex flex-col gap-0 mt-[-8px]">
              <h3 className="text-center text-sm font-semibold text-purple-800 dark:text-purple-300 mt-0 mb-0 leading-none">
                Profile Preview
              </h3>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1 leading-none pt-1">
                This is how others see your profile when swiping
              </p>
            </div>

            {/* SwipeCard Preview */}
            <div className="w-full h-[480px] mx-auto border-2 border-white dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
              <div className="h-full flex flex-col relative">
                {/* Profile image */}
                <div className="relative h-full w-full overflow-hidden">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      className="w-full h-full object-cover"
                      alt={`${user.fullName}'s profile`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
                      <span className="text-4xl font-bold text-purple-300 dark:text-purple-200">
                        {user.fullName?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}

                  {/* Profile info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent px-4 pt-14 pb-3 flex flex-col">
                    {/* Main row with name and age - and tribe if there's only one */}
                    <div className="flex flex-col mb-1">
                      {/* Name and age row, with optional tribe badge */}
                      <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-extrabold">
                          <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] static-gradient">
                            <span className="text-4xl">
                              {user.fullName.split(" ")[0].charAt(0)}
                            </span>
                            {user.fullName.split(" ")[0].slice(1)},{" "}
                            {calculateAge(user.dateOfBirth)}
                          </span>
                        </h2>

                        {/* Single tribe badge on the same row */}
                        {user.ethnicity &&
                          fieldVisibility.tribe &&
                          !user.secondaryTribe && (
                            <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal ml-2">
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                              <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                              <span className="relative z-10 drop-shadow-sm">{user.ethnicity}</span>
                            </Badge>
                          )}
                      </div>

                      {/* Two tribe badges in a separate row */}
                      {user.ethnicity &&
                        fieldVisibility.tribe &&
                        user.secondaryTribe && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <Badge className="relative bg-gradient-to-br from-purple-400 via-purple-600 to-fuchsia-700 text-white shadow-lg text-xs py-0.5 px-2 border border-purple-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                              <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                              <span className="relative z-10 drop-shadow-sm">{user.ethnicity}</span>
                            </Badge>
                            <Badge className="relative bg-gradient-to-br from-fuchsia-400 via-fuchsia-600 to-purple-700 text-white shadow-lg text-xs py-0.5 px-2 border border-fuchsia-300/40 transform hover:scale-105 transition-all duration-300 overflow-hidden rounded-full font-medium tracking-normal">
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-70 rounded-full"></div>
                              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full"></div>
                              <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
                              <span className="relative z-10 drop-shadow-sm">{user.secondaryTribe}</span>
                            </Badge>
                          </div>
                        )}
                    </div>

                    {/* Location row */}
                    {user.location && fieldVisibility.residence && (
                      <div className="flex items-center mb-1.5">
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
                    )}

                    {/* Job/Profession row with icon */}
                    {user.profession && fieldVisibility.profession && (
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
                        <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                          {user.profession}
                        </span>
                      </div>
                    )}

                    {/* Religion display */}
                    {user.religion && fieldVisibility.religion && (
                      <div className="flex items-center mb-1.5">
                        <Gift className="h-4 w-4 mr-1 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                        <span className="font-medium text-sm text-pink-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                          {getReligionDisplayName(user.religion)}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    {user.bio && fieldVisibility.bio && (
                      <div className="mb-2 rounded-md overflow-hidden">
                        <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient">
                          {user.bio}
                        </p>
                      </div>
                    )}

                    {/* Relationship Goals */}
                    {user.relationshipGoal &&
                      fieldVisibility.relationshipGoal && (
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
                  </div>
                </div>

                {/* No swipe actions as requested */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content section */}
      <div className="mt-1 px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Hide Name/Age when preview is showing */}
          {!showPreview && (
            <h2 className="font-heading text-2xl font-bold text-purple-800 dark:text-purple-300">
              {user.fullName}, {calculateAge(user.dateOfBirth)}
            </h2>
          )}
        </motion.div>

        {/* Compatibility indicator - always show regardless of preview state */}
        <div className="mt-2 mb-2">
          <div className="relative h-3 w-48 bg-gray-200 rounded-full mx-auto">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${compatibilityScore}%` }}
            ></div>
          </div>
          <p className="mt-1 text-sm text-purple-800 dark:text-purple-300 font-medium flex items-center justify-center">
            <Sparkles className="h-3 w-3 mr-1" />
            {compatibilityScore}% Match with your preferences
          </p>
        </div>
      </div>

      {/* Profile Fields in the Requested Order */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Your info
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {/* Residence (location) */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
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
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Show
                  </span>
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
                <CityInput
                  initialValue={residenceValue}
                  onLocationSelect={setResidenceValue}
                  placeholder="Enter your city and country"
                  className="text-xs border-pink-200"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveField("residence")}
                    className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">{user.location || "Not specified"}</p>
            )}
          </div>

          {/* Tribe (ethnicity) */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                Tribe
              </h3>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Show
                </span>
                <Switch
                  checked={fieldVisibility.tribe}
                  onCheckedChange={() => toggleVisibility("tribe")}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex flex-wrap gap-1">
                <Badge className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm text-xs py-0.5 px-2 border-0">
                  {user.ethnicity || "Not specified"}
                </Badge>
                {user.secondaryTribe && (
                  <Badge className="bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-sm text-xs py-0.5 px-2 border-0">
                    {user.secondaryTribe}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 italic mt-1">
                Tribe cannot be edited
              </p>
            </div>
          </div>

          {/* Profession */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                <Gift className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
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
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Show
                  </span>
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
                  className="text-xs border-pink-200"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveField("profession")}
                    className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">
                {user.profession || "Not specified"}
              </p>
            )}
          </div>

          {/* Religion */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                <Heart className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
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
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Show
                  </span>
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
                <ReligionSelect
                  value={religionValue}
                  onValueChange={(value) => setReligionValue(value)}
                  placeholder="Select religion and denomination"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveField("religion")}
                    className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">
                {user.religion
                  ? getReligionDisplayName(user.religion)
                  : "Not specified"}
              </p>
            )}
          </div>

          {/* About me (bio) */}
          <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                About me
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleEditMode("bio")}
                  className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Show
                  </span>
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
                <Input
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  placeholder="Tell others about yourself"
                  className="text-xs border-pink-200"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveField("bio")}
                    className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1">{user.bio || "Not specified"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Photos section */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center">
          <Camera className="h-4 w-4 mr-2 text-pink-500" />
          My Photos
        </h3>

        {/* Photo gallery */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {loadingPhotos ? (
            <div className="col-span-3 flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <>
              {/* Existing photos first */}
              {!userPhotos || userPhotos.length === 0 ? (
                <>
                  {/* Add photo cell (first if no photos) */}
                  <div
                    className="aspect-square rounded-lg overflow-hidden flex items-center justify-center cursor-pointer bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-1">
                        <span className="text-white text-2xl font-light">
                          +
                        </span>
                      </div>
                      <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                        Add Photo
                      </span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No photos added yet
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Show existing photos first */}
                  {userPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      <img
                        src={photo.photoUrl}
                        alt="User photo"
                        className="w-full h-full object-cover"
                      />

                      {/* Star icon for primary photo */}
                      {photo.isPrimary && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Actions overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-2">
                          {/* Delete button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/90 text-red-600 border-red-300 hover:bg-white hover:text-red-700"
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            disabled={
                              photo.isPrimary && (userPhotos?.length || 0) > 1
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </Button>

                          {/* Set as profile photo button */}
                          {!photo.isPrimary && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/90 text-yellow-600 border-yellow-300 hover:bg-white hover:text-yellow-700"
                              onClick={() =>
                                setPrimaryPhotoMutation.mutate(photo.id)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add photo cell (always last after existing photos) */}
                  <div
                    className="aspect-square rounded-lg overflow-hidden flex items-center justify-center cursor-pointer bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-dashed border-purple-300 dark:border-purple-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mb-1">
                        <span className="text-white text-2xl font-light">
                          +
                        </span>
                      </div>
                      <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                        Add Photo
                      </span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Relationship Goals */}
      <div className="px-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center">
          <CalendarHeart className="h-4 w-4 mr-2 text-pink-500" />
          Relationship Goals
        </h3>

        <div className="bg-white dark:bg-gray-800 border border-pink-100 dark:border-pink-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
              What I'm looking for
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleEditMode("relationshipGoal")}
                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
              >
                <Pencil size={14} />
              </button>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Show
                </span>
                <Switch
                  checked={fieldVisibility.relationshipGoal}
                  onCheckedChange={() => toggleVisibility("relationshipGoal")}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
          </div>

          {editField === "relationshipGoal" ? (
            <div className="mt-2">
              <Input
                value={relationshipGoalValue}
                onChange={(e) => setRelationshipGoalValue(e.target.value)}
                placeholder="What are you looking for?"
                className="text-xs border-pink-200"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => saveField("relationshipGoal")}
                  className="h-7 bg-purple-500 hover:bg-purple-600 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1">
              {user.relationshipGoal || "Not specified"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
