import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CityInput } from "@/components/ui/city-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Users,
  Network,
  Plus,
  Eye,
  Edit,
  Save,
  X,
  CheckCircle,
  ArrowLeft,
  Camera,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface SuiteProfileBuilderProps {
  userId: number;
  onBack?: () => void;
}

type ProfileType = "job" | "mentorship" | "networking";

// Field visibility interfaces for mentorship and networking profiles
interface JobFieldVisibility {
  showProfilePhoto: boolean;
  jobTitle: boolean;
  company: boolean;
  description: boolean;
  compensation: boolean;
  requirements: boolean;
  location: boolean;
  workType: boolean;
  jobType: boolean;
  experienceLevel: boolean;
  whyItMatters: boolean;
  whoShouldApply: boolean;
  culturalFit: boolean;
  industryTags: boolean;
  skillTags: boolean;
  applicationUrl: boolean;
  applicationEmail: boolean;
  applicationInstructions: boolean;
  [key: string]: boolean;
}

interface MentorshipFieldVisibility {
  showProfilePhoto: boolean;
  role: boolean;
  areasOfExpertise: boolean;
  learningGoals: boolean;
  currentLevel: boolean;
  mentorshipStyle: boolean;
  preferredFormat: boolean;
  communicationStyle: boolean;
  availability: boolean;
  timeCommitment: boolean;
  location: boolean;
  successStories: boolean;
  whyMentor: boolean;
  whySeekMentorship: boolean;
  preferredMenteeLevel: boolean;
  preferredMentorExperience: boolean;
  preferredIndustries: boolean;
  highSchool: boolean;
  collegeUniversity: boolean;
  maxMentees: boolean;
}

interface NetworkingFieldVisibility {
  showProfilePhoto: boolean;
  professionalTagline: boolean;
  currentRole: boolean;
  currentCompany: boolean;
  industry: boolean;
  experienceYears: boolean;
  networkingGoals: boolean;
  lookingFor: boolean;
  canOffer: boolean;
  professionalInterests: boolean;
  causesIPassionate: boolean;
  collaborationTypes: boolean;
  workingStyle: boolean;
  lightUpWhenTalking: boolean;
  wantToMeetSomeone: boolean;
  currentProjects: boolean;
  dreamCollaboration: boolean;
  preferredMeetingStyle: boolean;
  openToRemote: boolean;
  preferredLocations: boolean;
  highSchool: boolean;
  collegeUniversity: boolean;
  lookingForOpportunities: boolean;
}

interface ProfileFormData {
  // Job Profile Fields
  jobTitle?: string;
  company?: string;
  description?: string;
  compensation?: string;
  requirements?: string;
  location?: string;
  workType?: "Remote" | "In-person" | "Hybrid";
  jobType?: "Full-time" | "Part-time" | "Contract" | "Internship";
  experienceLevel?: "Entry" | "Mid" | "Senior" | "Executive";
  whyItMatters?: string;
  whoShouldApply?: string;
  culturalFit?: string;
  industryTags?: string[];
  skillTags?: string[];
  applicationUrl?: string;
  applicationEmail?: string;
  applicationInstructions?: string;

  // Mentorship Profile Fields
  role?: "mentor" | "mentee";
  areasOfExpertise?: string[];
  learningGoals?: string[];
  currentLevel?: "Beginner" | "Intermediate" | "Advanced";
  mentorshipStyle?: string;
  preferredFormat?: string[];
  communicationStyle?: string[];
  availability?: string;
  timeCommitment?:
    | "Light (1-2 hrs/month)"
    | "Regular (3-5 hrs/month)"
    | "Intensive (5+ hrs/month)";
  timezone?: string;
  successStories?: string;
  whyMentor?: string;
  whySeekMentorship?: string;
  preferredMenteeLevel?: string;
  preferredMentorExperience?: string;
  preferredIndustries?: string[];
  highSchool?: string;
  collegeUniversity?: string;
  maxMentees?: number;

  // Networking Profile Fields
  professionalTagline?: string;
  currentRole?: string;
  currentCompany?: string;
  industry?: string;
  experienceYears?: number;
  networkingGoals?: string[];
  lookingFor?: string;
  canOffer?: string;
  professionalInterests?: string[];
  causesIPassionate?: string[];
  collaborationTypes?: string[];
  workingStyle?: "Remote-first" | "In-person" | "Flexible";
  lightUpWhenTalking?: string;
  wantToMeetSomeone?: string;
  currentProjects?: string[];
  dreamCollaboration?: string;
  preferredMeetingStyle?: string[];
  openToRemote?: boolean;
  preferredLocations?: string[];
  lookingForOpportunities?: boolean;

  // For networking profile visibility preferences
  visibilityPreferences?: string;
}

export default function SuiteProfileBuilder({
  userId,
  onBack,
}: SuiteProfileBuilderProps) {
  const [activeProfile, setActiveProfile] = useState<ProfileType>("job");
  const [formData, setFormData] = useState<ProfileFormData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Field visibility states
  const [jobFieldVisibility, setJobFieldVisibility] =
    useState<JobFieldVisibility>(() => {
      return {
        showProfilePhoto: false,
        jobTitle: true,
        company: true,
        description: true,
        compensation: true,
        requirements: false,
        location: true,
        workType: true,
        jobType: true,
        experienceLevel: true,
        whyItMatters: true,
        whoShouldApply: true,
        culturalFit: false,
        industryTags: true,
        skillTags: true,
        applicationUrl: false,
        applicationEmail: false,
        applicationInstructions: false,
      };
    });

  const [mentorshipFieldVisibility, setMentorshipFieldVisibility] =
    useState<MentorshipFieldVisibility>(() => {
      return {
        showProfilePhoto: false,
        role: true,
        areasOfExpertise: true,
        learningGoals: true,
        currentLevel: true,
        mentorshipStyle: false,
        preferredFormat: true,
        communicationStyle: true,
        availability: false,
        timeCommitment: true,
        location: true,
        successStories: false,
        whyMentor: true,
        whySeekMentorship: true,
        preferredMenteeLevel: false,
        preferredMentorExperience: false,
        preferredIndustries: false,
        highSchool: true,
        collegeUniversity: true,
        maxMentees: true,
      };
    });

  const [networkingFieldVisibility, setNetworkingFieldVisibility] =
    useState<NetworkingFieldVisibility>(() => {
      return {
        showProfilePhoto: false,
        professionalTagline: true,
        currentRole: true,
        industry: true,
        experienceYears: true,
        networkingGoals: false,
        lookingFor: true,
        canOffer: true,
        professionalInterests: true,
        causesIPassionate: true,
        collaborationTypes: false,
        workingStyle: true,
        lightUpWhenTalking: true,
        wantToMeetSomeone: true,
        currentProjects: false,
        dreamCollaboration: true,
        preferredMeetingStyle: false,
        openToRemote: true,
        preferredLocations: false,
        highSchool: true,
        collegeUniversity: true,
        lookingForOpportunities: true,
      };
    });

  // Fetch SUITE profile settings
  const { data: profileSettings } = useQuery({
    queryKey: ["/api/suite/profile-settings"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suite/profile-settings");
        return await response.json();
      } catch (error) {
        console.warn("No SUITE profile settings found", error);
        return null;
      }
    },
  });

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await apiRequest("/api/user");
      return await response.json();
    },
  });

  // Fetch specific profile data based on active profile type
  const { data: profileData, isLoading } = useQuery({
    queryKey: [`/api/suite/${activeProfile}-profile`],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          `/api/suite/${activeProfile}-profile`,
        );
        return await response.json();
      } catch (error) {
        console.warn(`No ${activeProfile} profile found`, error);
        return null;
      }
    },
  });

  // Fetch field visibility settings for active profile type
  const { data: fieldVisibilityData } = useQuery({
    queryKey: [`/api/suite/field-visibility/${activeProfile}`],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          `/api/suite/field-visibility/${activeProfile}`,
        );
        return await response.json();
      } catch (error) {
        console.warn(
          `No field visibility settings found for ${activeProfile}`,
          error,
        );
        return {};
      }
    },
  });

  // Enhanced mutation for saving profile with cross-SUITE education field synchronization
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      console.log("Save profile mutation called with data:", data);

      // Save the SUITE profile (backend will automatically sync education fields to users table)
      const response = await apiRequest(`/api/suite/${activeProfile}-profile`, {
        method: "POST",
        data,
      });
      return await response.json();
    },
    onSuccess: (result, variables) => {
      toast({
        title: "Profile Saved!",
        description: `Your ${activeProfile} profile has been updated successfully.`,
      });
      setIsEditing(false);
      
      // Always invalidate current profile cache
      queryClient.invalidateQueries({
        queryKey: [`/api/suite/${activeProfile}-profile`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/profile-settings"],
      });
      
      // 📚 EDUCATION SYNC: If education fields were updated, invalidate ALL SUITE profile caches 
      // so other dialogs pick up the synced education data from users table
      if (variables.highSchool !== undefined || variables.collegeUniversity !== undefined) {
        console.log("📚 [EDUCATION-SYNC] Invalidating all SUITE profile caches for cross-profile education synchronization");
        
        // Invalidate all SUITE profile types for cross-synchronization
        ["networking", "mentorship", "job"].forEach(profileType => {
          queryClient.invalidateQueries({
            queryKey: [`/api/suite/${profileType}-profile`],
          });
        });
        
        // Also invalidate user data for MEET profile synchronization
        queryClient.invalidateQueries({
          queryKey: ["/api/user"],
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving field visibility
  const saveFieldVisibilityMutation = useMutation({
    mutationFn: async (visibilityData: Record<string, boolean>) => {
      const response = await apiRequest(
        `/api/suite/field-visibility/${activeProfile}`,
        {
          method: "POST",
          data: visibilityData,
        },
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/suite/field-visibility/${activeProfile}`],
      });
    },
    onError: (error: any) => {
      console.error("Error saving field visibility:", error);
      toast({
        title: "Error saving field visibility",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving networking visibility preferences immediately (like MEET Profile)
  const saveNetworkingVisibilityMutation = useMutation({
    mutationFn: async (data: { visibilityPreferences: string }) => {
      console.log("Saving networking visibility preferences:", data);
      const response = await apiRequest(`/api/suite/networking-profile`, {
        method: "PATCH",
        data,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/networking-profile"],
      });
      console.log("Networking visibility preferences saved successfully");
    },
    onError: (error: any) => {
      console.error("Error saving networking visibility:", error);
      toast({
        title: "Error saving visibility preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for saving job visibility preferences immediately (like MEET Profile)
  const saveJobVisibilityMutation = useMutation({
    mutationFn: async (data: { visibilityPreferences: string }) => {
      console.log("Saving job visibility preferences:", data);
      const response = await apiRequest(`/api/suite/job-profile`, {
        method: "PATCH",
        data,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/job-profile"],
      });
      console.log("Job visibility preferences saved successfully");
    },
    onError: (error: any) => {
      console.error("Error saving job visibility:", error);
      toast({
        title: "Error saving visibility preferences",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load profile data when it changes
  useEffect(() => {
    if (profileData) {
      const formData = { ...profileData };

      // Prefill location from user's authentication data if not already set
      if (!formData.location && user?.location) {
        formData.location = user.location;
      }

      setFormData(formData);
    } else if (user) {
      // 📚 EDUCATION SYNC: When creating a new profile, pre-populate education fields from user data
      console.log("📚 [EDUCATION-SYNC] Pre-populating education fields from user data for new", activeProfile, "profile");
      console.log("📚 [EDUCATION-SYNC] User education data:", { highSchool: user.highSchool, collegeUniversity: user.collegeUniversity });
      
      const newFormData: ProfileFormData = {};
      
      // Pre-populate education fields if they exist in user data
      if (user.highSchool) {
        newFormData.highSchool = user.highSchool;
        console.log("📚 [EDUCATION-SYNC] Pre-populated highSchool:", user.highSchool);
      }
      if (user.collegeUniversity) {
        newFormData.collegeUniversity = user.collegeUniversity;
        console.log("📚 [EDUCATION-SYNC] Pre-populated collegeUniversity:", user.collegeUniversity);
      }
      
      // Also prefill location from user's authentication data
      if (user.location) {
        newFormData.location = user.location;
      }
      
      setFormData(newFormData);
    }

    // For networking profile, load visibility preferences from JSON or set defaults
    if (activeProfile === "networking" && profileData) {
      console.log("Loading networking profile data:", profileData);
      console.log(
        "visibilityPreferences field:",
        profileData.visibilityPreferences,
      );

      if (profileData.visibilityPreferences) {
          try {
            const savedVisibility = JSON.parse(
              profileData.visibilityPreferences,
            );
            console.log("Parsed visibility preferences:", savedVisibility);
            setNetworkingFieldVisibility(savedVisibility);
          } catch (error) {
            console.error(
              "Error parsing networking visibility preferences:",
              error,
            );
            // Reset to defaults if parsing fails
            setNetworkingFieldVisibility({
              showProfilePhoto: false,
              professionalTagline: true,
              currentRole: true,
              currentCompany: true,
              industry: true,
              experienceYears: true,
              networkingGoals: false,
              lookingFor: true,
              canOffer: true,
              professionalInterests: true,
              causesIPassionate: true,
              collaborationTypes: false,
              workingStyle: true,
              lightUpWhenTalking: true,
              wantToMeetSomeone: true,
              currentProjects: false,
              dreamCollaboration: true,
              preferredMeetingStyle: false,
              openToRemote: true,
              preferredLocations: false,
              highSchool: true,
              collegeUniversity: true,
              lookingForOpportunities: true,
            });
          }
        } else {
          // Set default visibility for new networking profiles
          setNetworkingFieldVisibility({
            showProfilePhoto: false,
            professionalTagline: true,
            currentRole: true,
            industry: true,
            experienceYears: true,
            networkingGoals: false,
            lookingFor: true,
            canOffer: true,
            professionalInterests: true,
            causesIPassionate: true,
            collaborationTypes: false,
            workingStyle: true,
            lightUpWhenTalking: true,
            wantToMeetSomeone: true,
            currentProjects: false,
            dreamCollaboration: true,
            preferredMeetingStyle: false,
            openToRemote: true,
            preferredLocations: false,
            highSchool: true,
            collegeUniversity: true,
            lookingForOpportunities: true,
          });
        }
      }

    // For mentorship profile, load visibility preferences from JSON or set defaults
    if (activeProfile === "mentorship" && profileData) {
      console.log("Loading mentorship profile data:", profileData);
      console.log(
        "visibilityPreferences field:",
        profileData.visibilityPreferences,
      );

      if (profileData.visibilityPreferences) {
        try {
          const savedVisibility = JSON.parse(
            profileData.visibilityPreferences,
          );
          console.log(
            "Parsed mentorship visibility preferences:",
            savedVisibility,
          );
          setMentorshipFieldVisibility(savedVisibility);
        } catch (error) {
          console.error(
            "Error parsing mentorship visibility preferences:",
            error,
          );
          // Reset to defaults if parsing fails with location: true
          setMentorshipFieldVisibility({
            showProfilePhoto: false,
            role: true,
            areasOfExpertise: true,
            learningGoals: true,
            currentLevel: true,
            mentorshipStyle: false,
            preferredFormat: true,
            communicationStyle: true,
            availability: false,
            timeCommitment: true,
            location: true, // Fixed: Set to true by default
            successStories: false,
            whyMentor: true,
            whySeekMentorship: true,
            preferredMenteeLevel: false,
            preferredMentorExperience: false,
            preferredIndustries: false,
            highSchool: true,
            collegeUniversity: true,
            maxMentees: true,
          });
        }
      } else {
        // Set default visibility for new mentorship profiles with location: true
        setMentorshipFieldVisibility({
          showProfilePhoto: false,
          role: true,
          areasOfExpertise: true,
          learningGoals: true,
          currentLevel: true,
          mentorshipStyle: false,
          preferredFormat: true,
          communicationStyle: true,
          availability: false,
          timeCommitment: true,
          location: true, // Fixed: Set to true by default
          successStories: false,
          whyMentor: true,
          whySeekMentorship: true,
          preferredMenteeLevel: false,
          preferredMentorExperience: false,
          preferredIndustries: false,
          highSchool: true,
          collegeUniversity: true,
          maxMentees: true,
        });
      }
    }

    // For job profile, load visibility preferences from JSON or set defaults
    if (activeProfile === "job" && profileData) {
      console.log("Loading job profile data:", profileData);
      console.log(
        "visibilityPreferences field:",
        profileData.visibilityPreferences,
      );

      if (profileData.visibilityPreferences) {
        try {
          const savedVisibility = JSON.parse(
            profileData.visibilityPreferences,
          );
          console.log("Parsed job visibility preferences:", savedVisibility);
          setJobFieldVisibility(savedVisibility);
        } catch (error) {
          console.error(
            "Error parsing job visibility preferences:",
            error,
          );
          // Reset to defaults if parsing fails
          setJobFieldVisibility({
            showProfilePhoto: false,
            jobTitle: true,
            company: true,
            description: true,
            compensation: true,
            requirements: true,
            location: true,
            workType: true,
            jobType: true,
            experienceLevel: true,
            whyItMatters: true,
            whoShouldApply: true,
            culturalFit: true,
            industryTags: true,
            skillTags: true,
            applicationUrl: true,
            applicationEmail: true,
            applicationInstructions: true,
          });
        }
      } else {
        // Set default visibility for new job profiles
        setJobFieldVisibility({
          showProfilePhoto: false,
          jobTitle: true,
          company: true,
          description: true,
          compensation: true,
          requirements: true,
          location: true,
          workType: true,
          jobType: true,
          experienceLevel: true,
          whyItMatters: true,
          whoShouldApply: true,
          culturalFit: true,
          industryTags: true,
          skillTags: true,
          applicationUrl: true,
          applicationEmail: true,
          applicationInstructions: true,
        });
      }
    }
  }, [profileData, activeProfile, user]);

  // Load field visibility data when it changes (legacy system - not used for job profiles)
  useEffect(() => {
    if (fieldVisibilityData && Object.keys(fieldVisibilityData).length > 0) {
      // Note: Job profiles now use JSON-based persistence like mentorship and networking
      // This effect is kept for any legacy functionality that might still depend on it
      // but Job profiles are excluded to prevent conflicts with JSON-based system
    }
  }, [fieldVisibilityData, activeProfile]);

  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayInput = (field: keyof ProfileFormData, value: string) => {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, [field]: items }));
  };

  const handleSave = () => {
    // For all profile types, include visibility preferences as JSON
    if (activeProfile === "networking") {
      const dataWithVisibility = {
        ...formData,
        visibilityPreferences: JSON.stringify(networkingFieldVisibility),
      };
      saveProfileMutation.mutate(dataWithVisibility);
    } else if (activeProfile === "mentorship") {
      const dataWithVisibility = {
        ...formData,
        visibilityPreferences: JSON.stringify(mentorshipFieldVisibility),
      };
      saveProfileMutation.mutate(dataWithVisibility);
    } else if (activeProfile === "job") {
      const dataWithVisibility = {
        ...formData,
        visibilityPreferences: JSON.stringify(jobFieldVisibility),
      };
      saveProfileMutation.mutate(dataWithVisibility);
    } else {
      saveProfileMutation.mutate(formData);
    }
  };

  // Toggle functions for field visibility with database persistence
  const toggleJobFieldVisibility = (field: keyof JobFieldVisibility) => {
    setJobFieldVisibility((prev) => {
      const updated = { ...prev, [field]: !prev[field] };

      // Save immediately to database using JSON approach like mentorship profiles
      if (activeProfile === "job") {
        console.log(
          "SUITE-PROFILE-BUILDER: Saving job visibility preferences:",
          updated,
        );
        console.log("SUITE-PROFILE-BUILDER: Data to save:", JSON.stringify(updated));
        
        try {
          saveJobVisibilityMutation.mutate({
            visibilityPreferences: JSON.stringify(updated),
          });
          console.log("SUITE-PROFILE-BUILDER: Job visibility mutation triggered successfully");
        } catch (error) {
          console.error("SUITE-PROFILE-BUILDER: Error triggering job visibility mutation:", error);
        }
      }

      return updated;
    });
  };

  const toggleMentorshipFieldVisibility = (
    field: keyof MentorshipFieldVisibility,
  ) => {
    setMentorshipFieldVisibility((prev) => {
      const updated = { ...prev, [field]: !prev[field] };

      // Save to profile directly using JSON column like networking profiles
      if (activeProfile === "mentorship") {
        console.log(
          "SUITE-PROFILE-BUILDER: Saving mentorship visibility preferences:",
          updated,
        );
        // We'll save this when the profile is saved - no separate mutation needed
        // The visibility preferences will be included in the profile save
      }

      return updated;
    });
  };

  const toggleNetworkingFieldVisibility = (
    field: keyof NetworkingFieldVisibility,
  ) => {
    console.log(
      "SUITE-PROFILE-BUILDER: toggleNetworkingFieldVisibility function called with field:",
      field,
    );
    setNetworkingFieldVisibility((prev) => {
      const updated = { ...prev, [field]: !prev[field] };

      console.log(
        `SUITE-PROFILE-BUILDER: Toggling networking field visibility for ${field} to ${!prev[field]}`,
      );
      console.log(
        "SUITE-PROFILE-BUILDER: Updated networking visibility preferences:",
        updated,
      );

      // Save immediately to database like MEET Profile approach
      console.log(
        "SUITE-PROFILE-BUILDER: About to trigger saveNetworkingVisibilityMutation",
      );
      console.log(
        "SUITE-PROFILE-BUILDER: Mutation function exists:",
        typeof saveNetworkingVisibilityMutation,
      );

      saveNetworkingVisibilityMutation.mutate({
        visibilityPreferences: JSON.stringify(updated),
      });

      return updated;
    });
  };

  const profileTypes = [
    {
      id: "job" as ProfileType,
      title: "Job Opportunities",
      icon: Briefcase,
      description: "Post jobs or seek opportunities",
      color: "from-blue-500 to-blue-600",
      active: profileSettings?.jobProfileActive || false,
    },
    {
      id: "mentorship" as ProfileType,
      title: "Mentorship",
      icon: Users,
      description: "Find mentors or become one",
      color: "from-green-500 to-green-600",
      active: profileSettings?.mentorshipProfileActive || false,
    },
    {
      id: "networking" as ProfileType,
      title: "Networking",
      icon: Network,
      description: "Connect and collaborate",
      color: "from-purple-500 to-purple-600",
      active: profileSettings?.networkingProfileActive || false,
    },
  ];

  const renderJobProfileForm = () => (
    <div className="space-y-6">
      {/* Show Profile Photo Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-gray-600" />
            <label className="block text-sm font-medium">
              Show Profile Photo
            </label>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={jobFieldVisibility.showProfilePhoto}
              onCheckedChange={() =>
                toggleJobFieldVisibility("showProfilePhoto")
              }
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Control whether your profile photo appears on your job profile card
        </p>
        {user && jobFieldVisibility.showProfilePhoto && (
          <div className="mt-3 flex items-center space-x-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Profile preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <span className="text-gray-500 text-sm font-medium">
                  {user.fullName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600">
              Preview of your profile photo
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Job Title *
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.jobTitle}
                onCheckedChange={() => toggleJobFieldVisibility("jobTitle")}
              />
            </div>
          </div>
          <Input
            value={formData.jobTitle || ""}
            onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            placeholder="e.g., Senior Software Engineer"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">Company</label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.company}
                onCheckedChange={() => toggleJobFieldVisibility("company")}
              />
            </div>
          </div>
          <Input
            value={formData.company || ""}
            onChange={(e) => handleInputChange("company", e.target.value)}
            placeholder="e.g., TechCorp Ghana"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">
            Job Description *
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={jobFieldVisibility.description}
              onCheckedChange={() => toggleJobFieldVisibility("description")}
            />
          </div>
        </div>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Describe what this role involves..."
          rows={4}
          disabled={!isEditing}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Work Type *
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.workType}
                onCheckedChange={() => toggleJobFieldVisibility("workType")}
              />
            </div>
          </div>
          <Select
            value={formData.workType || ""}
            onValueChange={(value) => handleInputChange("workType", value)}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select work type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Remote">Remote</SelectItem>
              <SelectItem value="In-person">In-person</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">Job Type *</label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.jobType}
                onCheckedChange={() => toggleJobFieldVisibility("jobType")}
              />
            </div>
          </div>
          <Select
            value={formData.jobType || ""}
            onValueChange={(value) => handleInputChange("jobType", value)}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Experience Level
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.experienceLevel}
                onCheckedChange={() =>
                  toggleJobFieldVisibility("experienceLevel")
                }
              />
            </div>
          </div>
          <Select
            value={formData.experienceLevel || ""}
            onValueChange={(value) =>
              handleInputChange("experienceLevel", value)
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Entry">Entry</SelectItem>
              <SelectItem value="Mid">Mid</SelectItem>
              <SelectItem value="Senior">Senior</SelectItem>
              <SelectItem value="Executive">Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">Location</label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.location}
                onCheckedChange={() => toggleJobFieldVisibility("location")}
              />
            </div>
          </div>
          <CityInput
            value={formData.location || ""}
            onLocationSelect={(location) => handleInputChange("location", location)}
            initialValue={formData.location || ""}
            placeholder="e.g., Accra, Ghana"
            disabled={!isEditing}
            showIcon={false}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Compensation
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.compensation}
                onCheckedChange={() => toggleJobFieldVisibility("compensation")}
              />
            </div>
          </div>
          <Input
            value={formData.compensation || ""}
            onChange={(e) => handleInputChange("compensation", e.target.value)}
            placeholder="e.g., GHS 5,000 - 8,000/month"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">
            Why This Job Matters
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={jobFieldVisibility.whyItMatters}
              onCheckedChange={() => toggleJobFieldVisibility("whyItMatters")}
            />
          </div>
        </div>
        <Textarea
          value={formData.whyItMatters || ""}
          onChange={(e) => handleInputChange("whyItMatters", e.target.value)}
          placeholder="Explain the impact and importance of this role..."
          rows={3}
          disabled={!isEditing}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">
            Who Should Apply
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={jobFieldVisibility.whoShouldApply}
              onCheckedChange={() => toggleJobFieldVisibility("whoShouldApply")}
            />
          </div>
        </div>
        <Textarea
          value={formData.whoShouldApply || ""}
          onChange={(e) => handleInputChange("whoShouldApply", e.target.value)}
          placeholder="Describe your ideal candidate..."
          rows={3}
          disabled={!isEditing}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Industry Tags (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.industryTags}
                onCheckedChange={() => toggleJobFieldVisibility("industryTags")}
              />
            </div>
          </div>
          <Input
            value={formData.industryTags?.join(", ") || ""}
            onChange={(e) => handleArrayInput("industryTags", e.target.value)}
            placeholder="e.g., Technology, Finance, Healthcare"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Skill Tags (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.skillTags}
                onCheckedChange={() => toggleJobFieldVisibility("skillTags")}
              />
            </div>
          </div>
          <Input
            value={formData.skillTags?.join(", ") || ""}
            onChange={(e) => handleArrayInput("skillTags", e.target.value)}
            placeholder="e.g., React, Node.js, Python"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Application URL
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.applicationUrl}
                onCheckedChange={() =>
                  toggleJobFieldVisibility("applicationUrl")
                }
              />
            </div>
          </div>
          <Input
            value={formData.applicationUrl || ""}
            onChange={(e) =>
              handleInputChange("applicationUrl", e.target.value)
            }
            placeholder="https://company.com/apply"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Application Email
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={jobFieldVisibility.applicationEmail}
                onCheckedChange={() =>
                  toggleJobFieldVisibility("applicationEmail")
                }
              />
            </div>
          </div>
          <Input
            value={formData.applicationEmail || ""}
            onChange={(e) =>
              handleInputChange("applicationEmail", e.target.value)
            }
            placeholder="careers@company.com"
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );

  const renderMentorshipProfileForm = () => (
    <div className="space-y-6">
      {/* Show Profile Photo Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-gray-600" />
            <label className="block text-sm font-medium">
              Show Profile Photo
            </label>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={mentorshipFieldVisibility.showProfilePhoto}
              onCheckedChange={() =>
                toggleMentorshipFieldVisibility("showProfilePhoto")
              }
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Control whether your profile photo appears on your mentorship profile
          card
        </p>
        {user && mentorshipFieldVisibility.showProfilePhoto && (
          <div className="mt-3 flex items-center space-x-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Profile preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <span className="text-gray-500 text-sm font-medium">
                  {user.fullName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600">
              Preview of your profile photo
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">Role *</label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={mentorshipFieldVisibility.role}
                onCheckedChange={() => toggleMentorshipFieldVisibility("role")}
              />
            </div>
          </div>
          <Select
            value={formData.role || ""}
            onValueChange={(value) => handleInputChange("role", value)}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mentor">Mentor</SelectItem>
              <SelectItem value="mentee">Mentee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Mentorship Style
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={mentorshipFieldVisibility.mentorshipStyle}
                onCheckedChange={() =>
                  toggleMentorshipFieldVisibility("mentorshipStyle")
                }
              />
            </div>
          </div>
          <Input
            value={formData.mentorshipStyle || ""}
            onChange={(e) =>
              handleInputChange("mentorshipStyle", e.target.value)
            }
            placeholder="e.g., Hands-on, Advisory, Structured"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Availability
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={mentorshipFieldVisibility.availability}
                onCheckedChange={() =>
                  toggleMentorshipFieldVisibility("availability")
                }
              />
            </div>
          </div>
          <Select
            value={formData.availability || ""}
            onValueChange={(value) => {
              if (value === "custom") {
                const customValue = prompt("Enter your availability:");
                if (customValue) {
                  handleInputChange("availability", customValue);
                }
              } else {
                handleInputChange("availability", value);
              }
            }}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Prefer not to say">
                Prefer not to say
              </SelectItem>
              <SelectItem value="Weekday Mornings">Weekday Mornings</SelectItem>
              <SelectItem value="Weekday Afternoons">
                Weekday Afternoons
              </SelectItem>
              <SelectItem value="Weekday Evenings">Weekday Evenings</SelectItem>
              <SelectItem value="Weekend Mornings">Weekend Mornings</SelectItem>
              <SelectItem value="Weekend Afternoons">
                Weekend Afternoons
              </SelectItem>
              <SelectItem value="Weekend Evenings">Weekend Evenings</SelectItem>
              <SelectItem value="Flexible Weekdays">
                Flexible Weekdays
              </SelectItem>
              <SelectItem value="Flexible Weekends">
                Flexible Weekends
              </SelectItem>
              <SelectItem value="Very Flexible">Very Flexible</SelectItem>
              <SelectItem value="Business Hours Only">
                Business Hours Only
              </SelectItem>
              <SelectItem value="custom">Add Custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">Location</label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={mentorshipFieldVisibility.location}
              onCheckedChange={() =>
                toggleMentorshipFieldVisibility("location")
              }
            />
          </div>
        </div>
        <CityInput
          value={formData.location || ""}
          onLocationSelect={(location) => handleInputChange("location", location)}
          initialValue={formData.location || ""}
          placeholder="e.g., Accra, Ghana"
          disabled={!isEditing}
          showIcon={false}
        />
      </div>

      {formData.role === "mentor" && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Areas of Expertise (comma-separated)
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.areasOfExpertise}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("areasOfExpertise")
                  }
                />
              </div>
            </div>
            <Input
              value={formData.areasOfExpertise?.join(", ") || ""}
              onChange={(e) =>
                handleArrayInput("areasOfExpertise", e.target.value)
              }
              placeholder="e.g., Software Development, Leadership, Entrepreneurship"
              disabled={!isEditing}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Why I Want to Mentor
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.whyMentor}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("whyMentor")
                  }
                />
              </div>
            </div>
            <Textarea
              value={formData.whyMentor || ""}
              onChange={(e) => handleInputChange("whyMentor", e.target.value)}
              placeholder="Share your motivation for mentoring..."
              rows={3}
              disabled={!isEditing}
            />
          </div>

          {/* Education Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>High School</span>
                </label>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Show</span>
                  <Switch
                    checked={mentorshipFieldVisibility.highSchool}
                    onCheckedChange={() =>
                      toggleMentorshipFieldVisibility("highSchool")
                    }
                  />
                </div>
              </div>
              <Input
                value={formData.highSchool || ""}
                onChange={(e) => handleInputChange("highSchool", e.target.value)}
                placeholder="Enter your high school"
                disabled={!isEditing}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Vocational/College/University</span>
                </label>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Show</span>
                  <Switch
                    checked={mentorshipFieldVisibility.collegeUniversity}
                    onCheckedChange={() =>
                      toggleMentorshipFieldVisibility("collegeUniversity")
                    }
                  />
                </div>
              </div>
              <Input
                value={formData.collegeUniversity || ""}
                onChange={(e) => handleInputChange("collegeUniversity", e.target.value)}
                placeholder="Enter your vocational school, college, or university"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-2">
                  Maximum Mentees
                </label>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Show</span>
                  <Switch
                    checked={mentorshipFieldVisibility.maxMentees}
                    onCheckedChange={() =>
                      toggleMentorshipFieldVisibility("maxMentees")
                    }
                  />
                </div>
              </div>
              <Input
                type="number"
                value={formData.maxMentees || ""}
                onChange={(e) =>
                  handleInputChange("maxMentees", parseInt(e.target.value))
                }
                placeholder="e.g., 3"
                disabled={!isEditing}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-2">
                  Preferred Mentee Level
                </label>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Show</span>
                  <Switch
                    checked={mentorshipFieldVisibility.preferredMenteeLevel}
                    onCheckedChange={() =>
                      toggleMentorshipFieldVisibility("preferredMenteeLevel")
                    }
                  />
                </div>
              </div>
              <Input
                value={formData.preferredMenteeLevel || ""}
                onChange={(e) =>
                  handleInputChange("preferredMenteeLevel", e.target.value)
                }
                placeholder="e.g., Beginner, Intermediate"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Preferred Industries (comma-separated)
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.preferredIndustries}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("preferredIndustries")
                  }
                />
              </div>
            </div>
            <Input
              value={formData.preferredIndustries?.join(", ") || ""}
              onChange={(e) =>
                handleArrayInput("preferredIndustries", e.target.value)
              }
              placeholder="e.g., Technology, Finance, Healthcare"
              disabled={!isEditing}
            />
          </div>
        </>
      )}

      {formData.role === "mentee" && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Learning Goals (comma-separated)
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.learningGoals}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("learningGoals")
                  }
                />
              </div>
            </div>
            <Input
              value={formData.learningGoals?.join(", ") || ""}
              onChange={(e) =>
                handleArrayInput("learningGoals", e.target.value)
              }
              placeholder="e.g., Career advancement, Technical skills, Leadership"
              disabled={!isEditing}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Why I Seek Mentorship
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.whySeekMentorship}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("whySeekMentorship")
                  }
                />
              </div>
            </div>
            <Textarea
              value={formData.whySeekMentorship || ""}
              onChange={(e) =>
                handleInputChange("whySeekMentorship", e.target.value)
              }
              placeholder="Explain what you hope to gain from mentorship..."
              rows={3}
              disabled={!isEditing}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">
                Preferred Mentor Experience
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Show</span>
                <Switch
                  checked={mentorshipFieldVisibility.preferredMentorExperience}
                  onCheckedChange={() =>
                    toggleMentorshipFieldVisibility("preferredMentorExperience")
                  }
                />
              </div>
            </div>
            <Input
              value={formData.preferredMentorExperience || ""}
              onChange={(e) =>
                handleInputChange("preferredMentorExperience", e.target.value)
              }
              placeholder="e.g., 5+ years in industry, C-level executive"
              disabled={!isEditing}
            />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">
            Time Commitment
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={mentorshipFieldVisibility.timeCommitment}
              onCheckedChange={() =>
                toggleMentorshipFieldVisibility("timeCommitment")
              }
            />
          </div>
        </div>
        <Select
          value={formData.timeCommitment || ""}
          onValueChange={(value) => handleInputChange("timeCommitment", value)}
          disabled={!isEditing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select commitment level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Light (1-2 hrs/month)">
              Light (1-2 hrs/month)
            </SelectItem>
            <SelectItem value="Regular (3-5 hrs/month)">
              Regular (3-5 hrs/month)
            </SelectItem>
            <SelectItem value="Intensive (5+ hrs/month)">
              Intensive (5+ hrs/month)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Preferred Format (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={mentorshipFieldVisibility.preferredFormat}
                onCheckedChange={() =>
                  toggleMentorshipFieldVisibility("preferredFormat")
                }
              />
            </div>
          </div>
          <Input
            value={formData.preferredFormat?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("preferredFormat", e.target.value)
            }
            placeholder="e.g., 1-on-1, Group, Workshop"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2">
              Communication Style (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Show</span>
              <Switch
                checked={mentorshipFieldVisibility.communicationStyle}
                onCheckedChange={() =>
                  toggleMentorshipFieldVisibility("communicationStyle")
                }
              />
            </div>
          </div>
          <Input
            value={formData.communicationStyle?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("communicationStyle", e.target.value)
            }
            placeholder="e.g., Chat, Video, In-person"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2">
            Success Stories
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Show</span>
            <Switch
              checked={mentorshipFieldVisibility.successStories}
              onCheckedChange={() =>
                toggleMentorshipFieldVisibility("successStories")
              }
            />
          </div>
        </div>
        <Textarea
          value={formData.successStories || ""}
          onChange={(e) => handleInputChange("successStories", e.target.value)}
          placeholder="Share your mentorship experiences or achievements..."
          rows={3}
          disabled={!isEditing}
        />
      </div>
    </div>
  );

  const renderNetworkingProfileForm = () => (
    <div className="space-y-6">
      {/* Show Profile Photo Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-gray-600" />
            <label className="block text-sm font-medium">
              Show Profile Photo
            </label>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.showProfilePhoto}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("showProfilePhoto")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <p className="text-xs text-emerald-600 mt-1">
          Control whether your profile photo appears on your networking profile
          card
        </p>
        {user && networkingFieldVisibility.showProfilePhoto && (
          <div className="mt-3 flex items-center space-x-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Profile preview"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <span className="text-gray-500 text-sm font-medium">
                  {user.fullName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-600">
              Preview of your profile photo
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            Professional Tagline
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.professionalTagline}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("professionalTagline")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Input
          value={formData.professionalTagline || ""}
          onChange={(e) =>
            handleInputChange("professionalTagline", e.target.value)
          }
          placeholder="e.g., Passionate about connecting African talent globally"
          disabled={!isEditing}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Current Role
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.currentRole}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("currentRole")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.currentRole || ""}
            onChange={(e) => handleInputChange("currentRole", e.target.value)}
            placeholder="e.g., Product Manager"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Current Company
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.currentCompany}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("currentCompany")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.currentCompany || ""}
            onChange={(e) => handleInputChange("currentCompany", e.target.value)}
            placeholder="e.g., Apple, Microsoft, Startups Inc."
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">Industry</label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.industry}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("industry")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.industry || ""}
            onChange={(e) => handleInputChange("industry", e.target.value)}
            placeholder="e.g., Technology"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Years of Experience
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.experienceYears}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("experienceYears")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            type="number"
            value={formData.experienceYears || ""}
            onChange={(e) =>
              handleInputChange("experienceYears", parseInt(e.target.value))
            }
            placeholder="e.g., 5"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            Networking Goals (comma-separated)
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.networkingGoals}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("networkingGoals")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Input
          value={formData.networkingGoals?.join(", ") || ""}
          onChange={(e) => handleArrayInput("networkingGoals", e.target.value)}
          placeholder="e.g., Find collaborators, Expand network, Learn new skills"
          disabled={!isEditing}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            What I'm Looking For
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.lookingFor}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("lookingFor")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Textarea
          value={formData.lookingFor || ""}
          onChange={(e) => handleInputChange("lookingFor", e.target.value)}
          placeholder="Describe what kind of connections or collaborations you're seeking..."
          rows={3}
          disabled={!isEditing}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            What I Can Offer
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.canOffer}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("canOffer")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Textarea
          value={formData.canOffer || ""}
          onChange={(e) => handleInputChange("canOffer", e.target.value)}
          placeholder="Describe what value you can provide to others..."
          rows={3}
          disabled={!isEditing}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Collaboration Types (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.collaborationTypes}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("collaborationTypes")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.collaborationTypes?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("collaborationTypes", e.target.value)
            }
            placeholder="e.g., Joint ventures, Knowledge sharing, Research"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Current Projects (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.currentProjects}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("currentProjects")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.currentProjects?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("currentProjects", e.target.value)
            }
            placeholder="e.g., Mobile app development, Community initiative"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            I Light Up When Talking About
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.lightUpWhenTalking}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("lightUpWhenTalking")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Input
          value={formData.lightUpWhenTalking || ""}
          onChange={(e) =>
            handleInputChange("lightUpWhenTalking", e.target.value)
          }
          placeholder="e.g., Sustainable technology for Africa"
          disabled={!isEditing}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            I'd Love to Meet Someone Who
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.wantToMeetSomeone}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("wantToMeetSomeone")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Input
          value={formData.wantToMeetSomeone || ""}
          onChange={(e) =>
            handleInputChange("wantToMeetSomeone", e.target.value)
          }
          placeholder="e.g., Shares my passion for education reform"
          disabled={!isEditing}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            Dream Collaboration
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.dreamCollaboration}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("dreamCollaboration")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Textarea
          value={formData.dreamCollaboration || ""}
          onChange={(e) =>
            handleInputChange("dreamCollaboration", e.target.value)
          }
          placeholder="Describe your ideal collaboration project..."
          rows={3}
          disabled={!isEditing}
        />
      </div>

      {/* Education Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 flex items-center space-x-2 text-emerald-800">
              <BookOpen className="h-4 w-4" />
              <span>High School</span>
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.highSchool}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("highSchool")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.highSchool || ""}
            onChange={(e) => handleInputChange("highSchool", e.target.value)}
            placeholder="Enter your high school"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 flex items-center space-x-2 text-emerald-800">
              <GraduationCap className="h-4 w-4" />
              <span>Vocational/College/University</span>
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.collegeUniversity}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("collegeUniversity")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.collegeUniversity || ""}
            onChange={(e) => handleInputChange("collegeUniversity", e.target.value)}
            placeholder="Enter your vocational school, college, or university"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Working Style
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.workingStyle}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("workingStyle")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Select
            value={formData.workingStyle || ""}
            onValueChange={(value) => handleInputChange("workingStyle", value)}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select working style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Remote-first">Remote-first</SelectItem>
              <SelectItem value="In-person">In-person</SelectItem>
              <SelectItem value="Flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Preferred Meeting Style (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.preferredMeetingStyle}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("preferredMeetingStyle")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.preferredMeetingStyle?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("preferredMeetingStyle", e.target.value)
            }
            placeholder="e.g., Coffee chats, Virtual calls, Events"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-emerald-800">
              Open to Remote Collaboration
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.openToRemote}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("openToRemote")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.openToRemote || false}
              onCheckedChange={(checked) =>
                handleInputChange("openToRemote", checked)
              }
              disabled={!isEditing}
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
            <span className="text-sm text-emerald-700">
              Yes, I'm open to remote collaboration
            </span>
          </div>
        </div>
        <div className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-emerald-800">
              Looking for Opportunities
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.lookingForOpportunities}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("lookingForOpportunities")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.lookingForOpportunities || false}
              onCheckedChange={(checked) =>
                handleInputChange("lookingForOpportunities", checked)
              }
              disabled={!isEditing}
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
            <span className="text-sm text-emerald-700">
              Yes, I'm actively looking for opportunities
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Professional Interests (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.professionalInterests}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("professionalInterests")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.professionalInterests?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("professionalInterests", e.target.value)
            }
            placeholder="e.g., AI, Sustainability, EdTech"
            disabled={!isEditing}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium mb-2 text-emerald-800">
              Causes I'm Passionate About (comma-separated)
            </label>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-emerald-600">Show</span>
              <Switch
                checked={networkingFieldVisibility.causesIPassionate}
                onCheckedChange={() =>
                  toggleNetworkingFieldVisibility("causesIPassionate")
                }
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
              />
            </div>
          </div>
          <Input
            value={formData.causesIPassionate?.join(", ") || ""}
            onChange={(e) =>
              handleArrayInput("causesIPassionate", e.target.value)
            }
            placeholder="e.g., Education, Climate change, Youth empowerment"
            disabled={!isEditing}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-2 text-emerald-800">
            Preferred Locations (comma-separated)
          </label>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-emerald-600">Show</span>
            <Switch
              checked={networkingFieldVisibility.preferredLocations}
              onCheckedChange={() =>
                toggleNetworkingFieldVisibility("preferredLocations")
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </div>
        <Input
          value={formData.preferredLocations?.join(", ") || ""}
          onChange={(e) =>
            handleArrayInput("preferredLocations", e.target.value)
          }
          placeholder="e.g., Accra, Lagos, Nairobi, Remote"
          disabled={!isEditing}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">SUITE Profile Builder</h1>
            <p className="text-gray-600">
              Create your professional identity across three dimensions
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveProfileMutation.isPending}
              >
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </>
          )}
          {!isEditing && profileData && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Profile Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {profileTypes.map((type) => {
          const Icon = type.icon;
          return (
            <motion.div
              key={type.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 ${
                  activeProfile === type.id
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : "hover:shadow-md"
                }`}
                onClick={() => setActiveProfile(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${type.color}`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{type.title}</h3>
                      <p className="text-xs text-gray-600">
                        {type.description}
                      </p>
                    </div>
                    {type.active && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {activeProfile === "job" && <Briefcase className="h-5 w-5" />}
            {activeProfile === "mentorship" && <Users className="h-5 w-5" />}
            {activeProfile === "networking" && <Network className="h-5 w-5" />}
            <span className="capitalize">{activeProfile} Profile</span>
            {!isEditing && !profileData && (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="ml-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Profile
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profileData && !isEditing ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                You haven't created a {activeProfile} profile yet.
              </div>
              <Button onClick={() => setIsEditing(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create{" "}
                {activeProfile.charAt(0).toUpperCase() +
                  activeProfile.slice(1)}{" "}
                Profile
              </Button>
            </div>
          ) : (
            <>
              {activeProfile === "job" && renderJobProfileForm()}
              {activeProfile === "mentorship" && renderMentorshipProfileForm()}
              {activeProfile === "networking" && renderNetworkingProfileForm()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {profileData && !isEditing && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Your {activeProfile} profile is active and visible to others!
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
