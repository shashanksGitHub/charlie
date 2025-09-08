import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, Mail, MessageSquare, Star, Book, FileQuestion, LifeBuoy, Phone, Send, ChevronDown, Heart, Camera, Shield, AlertTriangle, Users, Settings, Eye, Lock, MapPin, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/hooks/use-language";

interface HelpSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedUserInfo?: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  defaultTab?: "faq" | "guides" | "contact";
}

export function HelpSupportDialog({ open, onOpenChange, blockedUserInfo, defaultTab = "faq" }: HelpSupportDialogProps) {
  const [contactMessage, setContactMessage] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // Fetch current user data
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    enabled: open, // Only fetch when dialog is open
  });

  const contactMutation = useMutation({
    mutationFn: async (data: { message: string, name?: string, email?: string, phoneNumber?: string }) => {
      return apiRequest("/api/contact/send", {
        method: "POST",
        data: {
          name: data.name || blockedUserInfo?.fullName || user?.fullName || 'Anonymous User',
          email: data.email || blockedUserInfo?.email || user?.email || 'noreply@example.com',
          phoneNumber: data.phoneNumber || blockedUserInfo?.phoneNumber || user?.phoneNumber || 'Not provided',
          message: data.message
        }
      });
    },
    onSuccess: () => {
      toast({
        title: t("auth.messageSentSuccessfully"),
        description: t("auth.messageSentDescription"),
      });
      setContactMessage("");
      setShowFeedback(true);
    },
    onError: (error: any) => {
      toast({
        title: t("auth.failedToSendMessage"),
        description: error?.message || "Please try again later or contact us directly.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactMessage.trim()) {
      toast({
        title: t("auth.pleaseFillMessage"),
        description: t("auth.messageRequired"),
        variant: "destructive",
      });
      return;
    }

    // Allow anonymous contact form submissions - no authentication required

    contactMutation.mutate({
      message: contactMessage.trim()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[650px] max-h-[85vh] overflow-hidden border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-xl"></div>
        <DialogHeader className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-400" />
            <DialogTitle className="text-xl font-bold tracking-tight">{t("auth.helpAndSupport")}</DialogTitle>
          </div>
          <DialogDescription className="text-white/70 pt-2">
            {t("auth.helpAndSupportDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 rounded-md mb-4">
            <TabsTrigger 
              value="faq" 
              className="text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-white"
            >
              {t("auth.faqs")}
            </TabsTrigger>
            <TabsTrigger 
              value="guides" 
              className="text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-white"
            >
              {t("auth.guides")}
            </TabsTrigger>
            <TabsTrigger 
              value="contact" 
              className="text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-white"
            >
              {t("auth.contactUs")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="focus:outline-none">
            <ScrollArea className="pr-4 h-[50vh] overflow-y-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/90 hover:no-underline py-4">
                    {t("auth.faqQuestions.resetPassword")}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    <p>{t("auth.faqAnswers.resetPasswordAnswer")}</p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>{t("auth.faqAnswers.resetPasswordSteps.0")}</li>
                      <li>{t("auth.faqAnswers.resetPasswordSteps.1")}</li>
                      <li>{t("auth.faqAnswers.resetPasswordSteps.2")}</li>
                      <li>{t("auth.faqAnswers.resetPasswordSteps.3")}</li>
                    </ol>
                    <p className="mt-2">{t("auth.faqAnswers.resetPasswordNote")}</p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/90 hover:no-underline py-4">
                    {t("auth.faqQuestions.matchingAlgorithm")}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    {t("auth.faqAnswers.matchingAlgorithmAnswer")}
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>{t("auth.faqAnswers.matchingAlgorithmFactors.0")}</li>
                      <li>{t("auth.faqAnswers.matchingAlgorithmFactors.1")}</li>
                      <li>{t("auth.faqAnswers.matchingAlgorithmFactors.2")}</li>
                      <li>{t("auth.faqAnswers.matchingAlgorithmFactors.3")}</li>
                    </ul>
                    <p className="mt-2">{t("auth.faqAnswers.matchingAlgorithmNote")}</p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/90 hover:no-underline py-4">
                    {t("auth.faqQuestions.updateLocation")}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    <p>{t("auth.faqAnswers.updateLocationAnswer")}</p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>{t("auth.faqAnswers.updateLocationSteps.0")}</li>
                      <li>{t("auth.faqAnswers.updateLocationSteps.1")}</li>
                      <li>{t("auth.faqAnswers.updateLocationSteps.2")}</li>
                      <li>{t("auth.faqAnswers.updateLocationSteps.3")}</li>
                    </ol>
                    <p className="mt-2">{t("auth.faqAnswers.updateLocationNote")}</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/90 hover:no-underline py-4">
                    {t("auth.faqQuestions.reportBehavior")}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    <p>{t("auth.faqAnswers.reportBehaviorAnswer")}</p>
                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                      <li>{t("auth.faqAnswers.reportBehaviorSteps.0")}</li>
                      <li>{t("auth.faqAnswers.reportBehaviorSteps.1")}</li>
                      <li>{t("auth.faqAnswers.reportBehaviorSteps.2")}</li>
                      <li>{t("auth.faqAnswers.reportBehaviorSteps.3")}</li>
                    </ol>
                    <p className="mt-2">{t("auth.faqAnswers.reportBehaviorNote")}</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-white/10">
                  <AccordionTrigger className="text-white hover:text-white/90 hover:no-underline py-4">
                    {t("auth.faqQuestions.premiumBenefits")}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70">
                    <p>{t("auth.faqAnswers.premiumBenefitsAnswer")}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>{t("auth.faqAnswers.premiumBenefitsList.0")}</li>
                      <li>{t("auth.faqAnswers.premiumBenefitsList.1")}</li>
                      <li>{t("auth.faqAnswers.premiumBenefitsList.2")}</li>
                      <li>{t("auth.faqAnswers.premiumBenefitsList.3")}</li>
                      <li>{t("auth.faqAnswers.premiumBenefitsList.4")}</li>
                      <li>{t("auth.faqAnswers.premiumBenefitsList.5")}</li>
                    </ul>
                    <p className="mt-2">{t("auth.faqAnswers.premiumBenefitsNote")}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="guides" className="focus:outline-none">
            <ScrollArea className="pr-4 h-[50vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Getting Started Guide */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <button 
                    className="w-full hover:bg-white/10 transition-colors p-4 text-left flex items-center justify-between group"
                    onClick={() => setExpandedGuide(expandedGuide === "getting-started" ? null : "getting-started")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Star className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t("auth.guides.gettingStarted")}</h3>
                        <p className="text-xs text-white/70">{t("auth.guides.gettingStartedSubtitle")}</p>
                      </div>
                    </div>
                    {expandedGuide === "getting-started" ? (
                      <ChevronDown className="h-5 w-5 text-white/80 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                    )}
                  </button>
                  
                  {expandedGuide === "getting-started" && (
                    <div className="px-4 pb-4 text-white/80 text-sm space-y-4">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          {t("auth.guides.threePowerfulApps")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• <span className="text-pink-400 font-medium">{t("auth.guideContent.meetApp")}</span> {t("auth.guideContent.meetDescription")}</li>
                          <li>• <span className="text-purple-400 font-medium">{t("auth.guideContent.heatApp")}</span> {t("auth.guideContent.heatDescription")}</li>
                          <li>• <span className="text-green-400 font-medium">{t("auth.guideContent.suiteApp")}</span> {t("auth.guideContent.suiteDescription")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          {t("auth.guides.quickSetup")}
                        </h4>
                        <ol className="space-y-2 text-xs list-decimal list-inside">
                          <li>{t("auth.guideContent.quickSetupSteps.0")}</li>
                          <li>{t("auth.guideContent.quickSetupSteps.1")}</li>
                          <li>{t("auth.guideContent.quickSetupSteps.2")}</li>
                          <li>{t("auth.guideContent.quickSetupSteps.3")}</li>
                          <li>{t("auth.guideContent.quickSetupSteps.4")}</li>
                        </ol>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-400" />
                          {t("auth.guides.essentialFeatures")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.essentialFeaturesList.0")}</li>
                          <li>• {t("auth.guideContent.essentialFeaturesList.1")}</li>
                          <li>• {t("auth.guideContent.essentialFeaturesList.2")}</li>
                          <li>• {t("auth.guideContent.essentialFeaturesList.3")}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messaging Tips & Features */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <button 
                    className="w-full hover:bg-white/10 transition-colors p-4 text-left flex items-center justify-between group"
                    onClick={() => setExpandedGuide(expandedGuide === "messaging" ? null : "messaging")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500/20 p-2 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t("auth.guides.messagingTips")}</h3>
                        <p className="text-xs text-white/70">{t("auth.guides.messagingTipsSubtitle")}</p>
                      </div>
                    </div>
                    {expandedGuide === "messaging" ? (
                      <ChevronDown className="h-5 w-5 text-white/80 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                    )}
                  </button>
                  
                  {expandedGuide === "messaging" && (
                    <div className="px-4 pb-4 text-white/80 text-sm space-y-4">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-400" />
                          {t("auth.guides.greatFirstMessages")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.firstMessageTips.0")}</li>
                          <li>• {t("auth.guideContent.firstMessageTips.1")}</li>
                          <li>• {t("auth.guideContent.firstMessageTips.2")}</li>
                          <li>• {t("auth.guideContent.firstMessageTips.3")}</li>
                          <li>• {t("auth.guideContent.firstMessageTips.4")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          {t("auth.guides.advancedFeatures")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.advancedFeaturesList.0")}</li>
                          <li>• {t("auth.guideContent.advancedFeaturesList.1")}</li>
                          <li>• {t("auth.guideContent.advancedFeaturesList.2")}</li>
                          <li>• {t("auth.guideContent.advancedFeaturesList.3")}</li>
                          <li>• {t("auth.guideContent.advancedFeaturesList.4")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-400" />
                          {t("auth.guides.conversationDosAndDonts")}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-medium text-green-400 mb-1">{t("auth.guides.doLabel")}</p>
                            <ul className="space-y-1">
                              <li>• {t("auth.guideContent.conversationDos.0")}</li>
                              <li>• {t("auth.guideContent.conversationDos.1")}</li>
                              <li>• {t("auth.guideContent.conversationDos.2")}</li>
                              <li>• {t("auth.guideContent.conversationDos.3")}</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium text-red-400 mb-1">{t("auth.guides.dontLabel")}</p>
                            <ul className="space-y-1">
                              <li>• {t("auth.guideContent.conversationDonts.0")}</li>
                              <li>• {t("auth.guideContent.conversationDonts.1")}</li>
                              <li>• {t("auth.guideContent.conversationDonts.2")}</li>
                              <li>• {t("auth.guideContent.conversationDonts.3")}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Optimization */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <button 
                    className="w-full hover:bg-white/10 transition-colors p-4 text-left flex items-center justify-between group"
                    onClick={() => setExpandedGuide(expandedGuide === "profile" ? null : "profile")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-pink-500/20 p-2 rounded-lg">
                        <Camera className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t("auth.guides.profileOptimization")}</h3>
                        <p className="text-xs text-white/70">{t("auth.guides.profileOptimizationSubtitle")}</p>
                      </div>
                    </div>
                    {expandedGuide === "profile" ? (
                      <ChevronDown className="h-5 w-5 text-white/80 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                    )}
                  </button>
                  
                  {expandedGuide === "profile" && (
                    <div className="px-4 pb-4 text-white/80 text-sm space-y-4">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Camera className="h-4 w-4 text-pink-400" />
                          {t("auth.guides.perfectPhotoStrategy")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.photoTips.0")}</li>
                          <li>• {t("auth.guideContent.photoTips.1")}</li>
                          <li>• {t("auth.guideContent.photoTips.2")}</li>
                          <li>• {t("auth.guideContent.photoTips.3")}</li>
                          <li>• {t("auth.guideContent.photoTips.4")}</li>
                          <li>• {t("auth.guideContent.photoTips.5")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Book className="h-4 w-4 text-blue-400" />
                          {t("auth.guides.compellingBioWriting")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.bioTips.0")}</li>
                          <li>• {t("auth.guideContent.bioTips.1")}</li>
                          <li>• {t("auth.guideContent.bioTips.2")}</li>
                          <li>• {t("auth.guideContent.bioTips.3")}</li>
                          <li>• {t("auth.guideContent.bioTips.4")}</li>
                          <li>• {t("auth.guideContent.bioTips.5")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-400" />
                          {t("auth.guides.profileCompletionTips")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.guideContent.profileCompletionList.0")}</li>
                          <li>• {t("auth.guideContent.profileCompletionList.1")}</li>
                          <li>• {t("auth.guideContent.profileCompletionList.2")}</li>
                          <li>• {t("auth.guideContent.profileCompletionList.3")}</li>
                          <li>• {t("auth.guideContent.profileCompletionList.4")}</li>
                          <li>• Use profile verification for trustworthiness</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Safety & Privacy Guide */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <button 
                    className="w-full hover:bg-white/10 transition-colors p-4 text-left flex items-center justify-between group"
                    onClick={() => setExpandedGuide(expandedGuide === "safety" ? null : "safety")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Shield className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t("auth.safetyGuide.safetyPrivacyGuide")}</h3>
                        <p className="text-xs text-white/70">{t("auth.safetyGuide.safetyPrivacySubtitle")}</p>
                      </div>
                    </div>
                    {expandedGuide === "safety" ? (
                      <ChevronDown className="h-5 w-5 text-white/80 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                    )}
                  </button>
                  
                  {expandedGuide === "safety" && (
                    <div className="px-4 pb-4 text-white/80 text-sm space-y-4">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-400" />
                          {t("auth.safetyGuide.privacyControlsTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.safetyGuide.privacyControls.0")}</li>
                          <li>• {t("auth.safetyGuide.privacyControls.1")}</li>
                          <li>• {t("auth.safetyGuide.privacyControls.2")}</li>
                          <li>• {t("auth.safetyGuide.privacyControls.3")}</li>
                          <li>• {t("auth.safetyGuide.privacyControls.4")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-400" />
                          {t("auth.safetyGuide.redFlagsTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.safetyGuide.redFlags.0")}</li>
                          <li>• {t("auth.safetyGuide.redFlags.1")}</li>
                          <li>• {t("auth.safetyGuide.redFlags.2")}</li>
                          <li>• {t("auth.safetyGuide.redFlags.3")}</li>
                          <li>• {t("auth.safetyGuide.redFlags.4")}</li>
                          <li>• {t("auth.safetyGuide.redFlags.5")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-400" />
                          {t("auth.safetyGuide.safeMeetingTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.safetyGuide.safeMeeting.0")}</li>
                          <li>• {t("auth.safetyGuide.safeMeeting.1")}</li>
                          <li>• {t("auth.safetyGuide.safeMeeting.2")}</li>
                          <li>• {t("auth.safetyGuide.safeMeeting.3")}</li>
                          <li>• {t("auth.safetyGuide.safeMeeting.4")}</li>
                          <li>• {t("auth.safetyGuide.safeMeeting.5")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-400" />
                          {t("auth.safetyGuide.reportingTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.safetyGuide.reporting.0")}</li>
                          <li>• {t("auth.safetyGuide.reporting.1")}</li>
                          <li>• {t("auth.safetyGuide.reporting.2")}</li>
                          <li>• {t("auth.safetyGuide.reporting.3")}</li>
                          <li>• {t("auth.safetyGuide.reporting.4")}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Troubleshooting Common Issues */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <button 
                    className="w-full hover:bg-white/10 transition-colors p-4 text-left flex items-center justify-between group"
                    onClick={() => setExpandedGuide(expandedGuide === "troubleshooting" ? null : "troubleshooting")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded-lg">
                        <LifeBuoy className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t("auth.troubleshooting.title")}</h3>
                        <p className="text-xs text-white/70">{t("auth.troubleshooting.subtitle")}</p>
                      </div>
                    </div>
                    {expandedGuide === "troubleshooting" ? (
                      <ChevronDown className="h-5 w-5 text-white/80 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white/80 transition-colors" />
                    )}
                  </button>
                  
                  {expandedGuide === "troubleshooting" && (
                    <div className="px-4 pb-4 text-white/80 text-sm space-y-4">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          {t("auth.troubleshooting.appPerformanceTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.troubleshooting.appPerformance.0")}</li>
                          <li>• {t("auth.troubleshooting.appPerformance.1")}</li>
                          <li>• {t("auth.troubleshooting.appPerformance.2")}</li>
                          <li>• {t("auth.troubleshooting.appPerformance.3")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          {t("auth.troubleshooting.matchingTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.troubleshooting.matching.0")}</li>
                          <li>• {t("auth.troubleshooting.matching.1")}</li>
                          <li>• {t("auth.troubleshooting.matching.2")}</li>
                          <li>• {t("auth.troubleshooting.matching.3")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-purple-400" />
                          {t("auth.troubleshooting.messagingTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.troubleshooting.messaging.0")}</li>
                          <li>• {t("auth.troubleshooting.messaging.1")}</li>
                          <li>• {t("auth.troubleshooting.messaging.2")}</li>
                          <li>• {t("auth.troubleshooting.messaging.3")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-400" />
                          {t("auth.troubleshooting.accountTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.troubleshooting.account.0")}</li>
                          <li>• {t("auth.troubleshooting.account.1")}</li>
                          <li>• {t("auth.troubleshooting.account.2")}</li>
                          <li>• {t("auth.troubleshooting.account.3")}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-400" />
                          {t("auth.troubleshooting.contactSupportTitle")}
                        </h4>
                        <ul className="space-y-2 text-xs">
                          <li>• {t("auth.troubleshooting.contactSupport.0")}</li>
                          <li>• {t("auth.troubleshooting.contactSupport.1")}</li>
                          <li>• {t("auth.troubleshooting.contactSupport.2")}</li>
                          <li>• {t("auth.troubleshooting.contactSupport.3")}</li>
                          <li>• {t("auth.troubleshooting.contactSupport.4")}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contact" className="focus:outline-none">
            <ScrollArea className="pr-4 h-[50vh] overflow-y-auto">
              {!showFeedback ? (
                <form onSubmit={handleSubmitContact}>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-1.5">
                      <label htmlFor="message" className="text-sm font-medium text-white/80">
                        {t("auth.contactForm.howCanWeHelp")}
                      </label>
                      <Textarea 
                        id="message" 
                        placeholder={t("auth.contactForm.describeYourIssue")} 
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        required
                        className="bg-white/10 border-white/10 text-white placeholder:text-white/50 focus:border-primary resize-none"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={contactMutation.isPending}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {contactMutation.isPending ? t("auth.contactForm.sending") : t("auth.contactForm.sendMessage")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <Send className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                  <p className="text-white/70 mb-6 max-w-md">
                    Thank you for reaching out. Our support team will review your message and respond within 24 hours.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-white/30 hover:bg-white/10 text-gray-900 bg-white/90 hover:text-gray-800 font-medium"
                    onClick={() => setShowFeedback(false)}
                  >
                    Send Another Message
                  </Button>
                </div>
              )}

              <div className="mt-8 space-y-4">
                <h3 className="font-medium text-white/90">{t("auth.contactForm.otherWaysToContact")}:</h3>
                
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="bg-blue-500/20 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("auth.contactForm.emailSupport")}</p>
                    <p className="text-xs text-white/70">admin@kronogon.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="bg-purple-500/20 p-2 rounded-full">
                    <Phone className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("auth.contactForm.phoneSupport")}</p>
                    <p className="text-xs text-white/70">{t("auth.contactForm.availableMonFri")}</p>
                    <p className="text-xs text-white/70">+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-white/10 mt-6 flex justify-center">
          <a 
            href="mailto:admin@kronogon.com"
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            <span>Contact via Email</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}