import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { idVerificationSchema, type IdVerificationValues } from "@/lib/auth-validation";
import { LivePhotoCapture } from "@/components/verification/live-photo-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Camera, CheckCircle, Shield, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

export default function VerifyIdPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { translate } = useLanguage();
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const form = useForm<IdVerificationValues>({
    resolver: zodResolver(idVerificationSchema),
    defaultValues: {
      idVerificationPhoto: "",
      liveVerificationPhoto: "",
      skipVerification: false,
    },
  });

  // Watch form values for dynamic button text
  const idPhoto = form.watch("idVerificationPhoto");
  const livePhoto = form.watch("liveVerificationPhoto");
  const hasPhotos = idPhoto && livePhoto;

  // File upload handler for ID photo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: translate("idVerification.fileTooLarge"),
          description: translate("idVerification.fileTooLargeDescription"),
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("idVerificationPhoto", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: IdVerificationValues) => {
      const response = await apiRequest("/api/user/verify-id", {
        method: "PATCH",
        data: {
          idVerificationPhoto: data.idVerificationPhoto,
          liveVerificationPhoto: data.liveVerificationPhoto,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      setShowSuccessSplash(true);
      setTimeout(() => {
        // Add a graceful exit before navigation
        setShowSuccessSplash(false);
        setTimeout(() => {
          setLocation("/settings");
        }, 300); // Small delay for exit animation
      }, 2200); // Slightly longer display time
    },
    onError: (error: any) => {
      toast({
        title: translate("idVerification.verificationFailed"),
        description: error.message || translate("idVerification.verificationFailedDescription"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: IdVerificationValues) => {
    if (!data.idVerificationPhoto || !data.liveVerificationPhoto) {
      toast({
        title: translate("idVerification.missingPhotos"),
        description: translate("idVerification.missingPhotosDescription"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate(data);
  };



  return (
    <AnimatePresence mode="wait">
      {showSuccessSplash ? (
        <motion.div
          key="success-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.1
            }}
            className="text-center px-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 15,
                delay: 0.3
              }}
              className="w-24 h-24 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2"
            >
{translate("idVerification.verificationSubmitted")}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-emerald-600 dark:text-emerald-300"
            >
{translate("idVerification.verificationSubmittedDescription")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
              className="mt-6"
            >
              <div className="w-8 h-1 bg-emerald-500 rounded-full mx-auto animate-pulse" />
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="main-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="min-h-screen bg-gray-50 dark:bg-gray-950"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  className="mr-3 text-white/90 hover:text-white transition-colors"
                  onClick={() => setLocation("/settings")}
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="font-bold text-lg text-white tracking-tight">
{translate("idVerification.title")}
                </h1>
              </div>
            </div>
          </div>

      {/* Content */}
      <div className="p-4 max-w-lg mx-auto">
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center pb-3">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
{translate("idVerification.verifyYourIdentity")}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
{translate("idVerification.description")}
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Government ID Photo */}
                <FormField
                  control={form.control}
                  name="idVerificationPhoto"
                  render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
{translate("idVerification.governmentIdPhoto")}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {value ? (
                            <div className="relative aspect-[3/2] rounded-lg overflow-hidden border-2 border-emerald-500">
                              <img
                                src={value}
                                alt={translate("idVerification.governmentIdPhoto")}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => onChange("")}
                                  className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                  title={translate("idVerification.removePhoto")}
                                >
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                {...fieldProps}
                              />
                              <div className="aspect-[3/2] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div className="text-center">
                                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
{translate("idVerification.uploadGovernmentId")}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
{translate("idVerification.acceptedDocuments")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Live Verification Photo */}
                <FormField
                  control={form.control}
                  name="liveVerificationPhoto"
                  render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
{translate("idVerification.liveVerificationPhoto")}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {value ? (
                            <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-emerald-500">
                              <img
                                src={value}
                                alt={translate("idVerification.liveVerificationPhoto")}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => onChange("")}
                                  className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 p-1.5 rounded-full shadow-sm transition-all"
                                  title={translate("idVerification.removePhoto")}
                                >
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowLiveCamera(true)}
                                className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <div className="text-center">
                                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
{translate("idVerification.takeLivePhoto")}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
{translate("idVerification.selfieForVerification")}
                                  </p>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !hasPhotos}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
{translate("idVerification.submitting")}
                    </div>
                  ) : hasPhotos ? (
                    translate("idVerification.submitVerification")
                  ) : (
                    translate("idVerification.uploadBothPhotos")
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Live Photo Capture Modal */}
      <AnimatePresence>
        {showLiveCamera && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
            <LivePhotoCapture
              onCapture={(blob) => {
                // Convert blob to data URL
                const reader = new FileReader();
                reader.onloadend = () => {
                  const dataUrl = reader.result as string;
                  form.setValue("liveVerificationPhoto", dataUrl);
                  setShowLiveCamera(false);
                };
                reader.readAsDataURL(blob);
              }}
              onCancel={() => setShowLiveCamera(false)}
            />
          </div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}