import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { userProfileSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Heart,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { CityInput } from "@/components/ui/city-input";
import { ReligionSelect } from "@/components/ui/religion-select";
import { TribeSelect } from "@/components/ui/tribe-select";
import { motion } from "framer-motion";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend the profile schema to ensure validation works on the client
const profileSchema = userProfileSchema.extend({
  dateOfBirth: z.string().min(1, "Date of birth is required"), // client-side as string
  secondaryTribe: z.string().optional(), // optional secondary tribe
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileCreationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Form for profile creation
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profession: "",
      ethnicity: "",
      secondaryTribe: "",
      religion: "",
      photoUrl: "",
      dateOfBirth: "",
      relationshipGoal: "",
      location: "",
    },
    mode: "onChange", // Enable validation on change for better UX
  });

  // Watch form fields for debugging
  const formValues = form.watch();

  // Log form errors to console for debugging
  useEffect(() => {
    console.log("Form errors:", form.formState.errors);
  }, [form.formState.errors]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Validate the date string is in YYYY-MM-DD format
      try {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.dateOfBirth)) {
          throw new Error("Date must be in YYYY-MM-DD format");
        }

        // Create an ISO string for the date which Drizzle/Zod can properly handle
        // This ensures the date is sent correctly without timezone issues
        const dateString = `${data.dateOfBirth}T00:00:00.000Z`;

        const formattedData = {
          ...data,
          dateOfBirth: dateString,
        };

        console.log("Sending profile data:", formattedData);
        const res = await apiRequest(
          "PATCH",
          `/api/profile/${user!.id}`,
          formattedData,
        );
        return await res.json();
      } catch (error) {
        console.error("Date parsing error:", error);
        throw new Error("Invalid date format. Please use YYYY-MM-DD format.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated successfully",
        description: "Your profile has been created!",
      });
      // Redirect to app selection page instead of home page
      setLocation("/app-selection");
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = (data: ProfileFormValues) => {
    console.log("Form data:", data);

    // For step 1, validate required fields
    if (step === 1) {
      if (!data.photoUrl || !data.bio || !data.profession) {
        form.setError("bio", {
          message: "Please complete all required fields",
        });
        toast({
          title: "Missing information",
          description: "Please fill out all required fields before proceeding.",
          variant: "destructive",
        });
        return;
      }
    }

    // For step 2, validate required fields
    if (step === 2) {
      if (
        !data.dateOfBirth ||
        !data.ethnicity ||
        !data.religion ||
        !data.location
      ) {
        toast({
          title: "Missing information",
          description: "Please fill out all required fields before proceeding.",
          variant: "destructive",
        });
        return;
      }
    }

    // For step 3, validate required fields
    if (step === 3) {
      if (!data.relationshipGoal) {
        toast({
          title: "Missing information",
          description: "Please select a relationship goal before completing.",
          variant: "destructive",
        });
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      updateProfileMutation.mutate(data);
    }
  };

  // Add touch event handlers for swipe navigation
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX;

      // Right to left swipe (next)
      if (diff > 50 && step < totalSteps) {
        // Directly call onSubmit with current form values
        onSubmit(form.getValues());
      }

      // Left to right swipe (back)
      if (diff < -50 && step > 1) {
        handleBack();
      }

      touchStartX.current = null;
    };

    const formElement = formRef.current;
    if (formElement) {
      formElement.addEventListener("touchstart", handleTouchStart);
      formElement.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      if (formElement) {
        formElement.removeEventListener("touchstart", handleTouchStart);
        formElement.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [step, totalSteps, form]);

  // Variants for form step animations
  const formVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  // Render the appropriate form step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={formVariants}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="mb-6">
              <FormLabel className="block font-medium text-gray-700 mb-2">
                Profile Photo
              </FormLabel>
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col items-center">
                        {value && (
                          <div className="relative w-32 h-32 rounded-full overflow-hidden mb-3">
                            <img
                              src={value}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/150?text=Profile";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="dropzone-file"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg
                                className="w-8 h-8 mb-2 text-gray-500"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 20 16"
                              >
                                <path
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                                />
                              </svg>
                              <p className="mb-1 text-sm text-gray-500">
                                Click to upload
                              </p>
                              <p className="text-xs text-gray-500">
                                SVG, PNG, JPG or GIF
                              </p>
                            </div>
                            <input
                              id="dropzone-file"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // For now just store the image as a data URL
                                  // In a real app, we'd upload to a storage service
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    onChange(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              {...fieldProps}
                            />
                          </label>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.aboutMe")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("profileCreation.aboutMePlaceholder")}
                      className="resize-none"
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.profession")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("profileCreation.professionPlaceholder")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={formVariants}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.dateOfBirth")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.residence")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <CityInput
                        initialValue={value}
                        onLocationSelect={(location) => onChange(location)}
                        className="flex-1"
                        {...rest}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tribe Selection */}
            <FormField
              control={form.control}
              name="ethnicity"
              render={({ field }) => {
                // Convert single value to array for TribeSelect
                const tribeValues = field.value ? [field.value] : [];
                const handleTribesChange = (values: string[]) => {
                  // Set primary tribe as the first value in the array
                  field.onChange(values[0] || "");

                  // Set secondary tribe as the second value in the array
                  const secondaryTribe = values[1] || "";
                  form.setValue("secondaryTribe", secondaryTribe);
                };

                return (
                  <FormItem>
                    <FormLabel>{t("profileCreation.ethnicityTribe")}</FormLabel>
                    <FormControl>
                      <div>
                        <TribeSelect
                          value={
                            [
                              ...tribeValues,
                              form.getValues().secondaryTribe,
                            ].filter(Boolean) as string[]
                          }
                          onChange={handleTribesChange}
                          maxSelections={2}
                          placeholder={t(
                            "profileCreation.tribeSelectionMultiple",
                          )}
                        />
                      </div>
                    </FormControl>
                    <div className="text-xs text-gray-500 mt-1">
                      Select your tribe(s). If you have mixed heritage, you can
                      select up to two tribes.
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.religion")}</FormLabel>
                  <FormControl>
                    <ReligionSelect
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      placeholder={t(
                        "profileCreation.selectReligionDenomination",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={formVariants}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="relationshipGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profileCreation.relationshipGoal")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "profileCreation.relationshipGoalPlaceholder",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Marriage">Marriage</SelectItem>
                      <SelectItem value="Long-term relationship">
                        Long-term relationship
                      </SelectItem>
                      <SelectItem value="Casual dating">
                        Casual dating
                      </SelectItem>
                      <SelectItem value="Friendship">Friendship</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-primary bg-opacity-10 rounded-lg p-4 text-sm text-gray-800">
              <p>
                <strong></strong> After completing your profile, you'll be able
                to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Browse potential matches</li>
                <li>Get AI-powered compatibility recommendations</li>
                <li>Connect worldwide</li>
              </ul>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col bg-gradient-to-br from-purple-50 to-orange-50">
      <div className="flex items-center mb-6">
        <div className="flex items-center">
          <Heart className="h-7 w-7 text-primary mr-2 animate-pulse" />
          <h1 className="font-heading text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-transparent bg-clip-text">
            {t("profileCreation.createProfileButton")}
          </h1>
        </div>
        <div className="ml-auto px-4 py-2 rounded-full bg-white/80 shadow-sm">
          <div className="text-sm font-medium text-primary">
            Step {step}/{totalSteps}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 flex-1 flex flex-col bg-white rounded-xl shadow-lg p-6 backdrop-blur-sm bg-opacity-90 md:max-w-xl md:mx-auto w-full"
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float text-primary/10"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${20 + Math.random() * 20}s`,
                }}
              >
                {i % 3 === 0 ? (
                  <Heart size={32} />
                ) : i % 3 === 1 ? (
                  <Sparkles size={28} />
                ) : (
                  <Camera size={24} />
                )}
              </div>
            ))}
          </div>

          {/* Render the current step */}
          {renderStepContent()}

          {/* Step dots navigation */}
          <div className="flex justify-center space-x-2 my-6">
            {[...Array(totalSteps)].map((_, i) => (
              <button
                key={i}
                type="button"
                className={`w-3 h-3 rounded-full transition-all ${
                  step === i + 1
                    ? "bg-[hsl(263,90%,30%)] scale-125"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                onClick={() => {
                  // Allow clicking on any step
                  setStep(i + 1);
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="mt-auto">
            <div className="flex gap-4 relative">
              {/* Left swipe area */}
              <div
                className="absolute left-0 top-0 w-1/4 h-full"
                style={{ zIndex: 5 }}
                onClick={step > 1 ? handleBack : undefined}
              />

              {/* Right swipe area */}
              <div
                className="absolute right-0 top-0 w-1/4 h-full"
                style={{ zIndex: 5 }}
                onClick={() => {
                  if (step < totalSteps) {
                    // Directly call onSubmit with current form values
                    onSubmit(form.getValues());
                  }
                }}
              />

              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 group"
                  onClick={handleBack}
                >
                  <ChevronLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
              )}
              <Button
                type={step < totalSteps ? "button" : "submit"}
                className="flex-1 bg-[hsl(263,90%,30%)] hover:bg-[hsl(263,90%,25%)] text-white group"
                disabled={updateProfileMutation.isPending}
                onClick={() => {
                  if (step < totalSteps) {
                    // Directly call onSubmit with current form values instead of using form.handleSubmit
                    onSubmit(form.getValues());
                  }
                }}
              >
                {step < totalSteps ? (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : updateProfileMutation.isPending ? (
                  "Saving..."
                ) : (
                  "Get In There"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
