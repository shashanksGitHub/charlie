import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info, Shield, Users, FileText } from "lucide-react";
import { t } from "@/hooks/use-language";

interface LegalDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegalDocumentsDialog({
  open,
  onOpenChange,
}: LegalDocumentsDialogProps) {
  const legalDocuments = [
    {
      title: t("auth.termsOfService"),
      description: t("auth.termsOfServiceDescription"),
      icon: <Info className="h-5 w-5 text-indigo-400" />,
      url: "/assets/terms-of-service-enhanced.html",
      color: "indigo",
      highlightKeys: "termsOfService"
    },
    {
      title: t("auth.privacyPolicyTitle"), 
      description: t("auth.privacyPolicySubtitle"),
      icon: <Shield className="h-5 w-5 text-purple-400" />,
      url: "/assets/privacy-policy-enhanced.html",
      color: "purple",
      highlightKeys: "privacyPolicy"
    },
    {
      title: t("auth.communityGuidelines"),
      description: t("auth.communityGuidelinesDescription"),
      icon: <Users className="h-5 w-5 text-emerald-400" />,
      url: "/assets/community-guidelines.html", 
      color: "emerald",
      highlightKeys: "communityGuidelines"
    },
    {
      title: t("auth.legalReviewReport"),
      description: t("auth.legalReviewReportDescription"),
      icon: <FileText className="h-5 w-5 text-amber-400" />,
      url: "/assets/CHARLEY_Legal_Review_Report.md",
      color: "amber",
      highlightKeys: "legalReviewReport"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[700px] max-h-[85vh] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-t-xl"></div>
        <DialogHeader className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <DialogTitle className="text-xl font-bold tracking-tight">{t("auth.legalDocuments")}</DialogTitle>
          </div>
          <DialogDescription className="text-white/70 pt-2">
{t("auth.enhancedLegalDocuments")} | {t("auth.lastUpdated")} July 14, 2025
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-4 pr-4 max-h-[60vh]">
          <div className="space-y-4">
            {legalDocuments.map((doc, index) => (
              <div 
                key={index}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {doc.icon}
                    <div>
                      <h3 className="text-lg font-semibold text-white">{doc.title}</h3>
                      <p className="text-white/70 text-sm mt-1">{doc.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`border-${doc.color}-500/30 bg-${doc.color}-500/10 text-${doc.color}-300 hover:bg-${doc.color}-500/20 hover:text-white transition-colors`}
                    onClick={() => {
                      window.open(doc.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t("auth.openDocument")}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-white/60 text-xs font-medium">{t("auth.keyFeatures")}:</p>
                  <ul className="space-y-1">
                    {[0, 1, 2].map((highlightIndex) => (
                      <li key={highlightIndex} className="text-white/70 text-xs flex items-start gap-2">
                        <span className={`text-${doc.color}-400 mt-1`}>•</span>
                        {t(`auth.legalDocumentHighlights.${doc.highlightKeys}.${highlightIndex}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-300 mt-0.5" />
              <div>
                <h4 className="text-blue-200 font-medium text-sm mb-2">{t("auth.legalEnhancementComplete")}</h4>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  {t("auth.legalEnhancementDescription")}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}