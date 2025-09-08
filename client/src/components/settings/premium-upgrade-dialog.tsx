import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Shield, Sparkles, Star, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";

interface PremiumUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumUpgradeDialog({ open, onOpenChange }: PremiumUpgradeDialogProps) {
  const [location, setLocation] = useLocation();
  const { translate: t } = useLanguage();
  
  const handleUpgrade = () => {
    // Close the dialog first
    onOpenChange(false);
    // Navigate to the payment page
    setLocation('/payment');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] max-w-[350px] sm:max-w-[425px] max-h-[85vh] border-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden flex flex-col">
        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="text-center space-y-2 pb-2 flex-shrink-0">
            <div className="mx-auto w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t("settings.upgradeToPremium")}
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-xs">
              {t("settings.unlockAdvancedPrivacy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 flex-1 min-h-0 overflow-y-auto">
            {/* Premium Features */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 p-2 bg-white/5 backdrop-blur-sm rounded-lg">
                <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{t("settings.advancedPrivacyControls")}</p>
                  <p className="text-gray-400 text-xs">{t("settings.hideProfilesGhostMode")}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-white/5 backdrop-blur-sm rounded-lg">
                <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{t("settings.unlimitedMatches")}</p>
                  <p className="text-gray-400 text-xs">{t("settings.noDailyLimits")}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-white/5 backdrop-blur-sm rounded-lg">
                <div className="w-7 h-7 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{t("settings.prioritySupport")}</p>
                  <p className="text-gray-400 text-xs">{t("settings.fastResponseTimes")}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-white/5 backdrop-blur-sm rounded-lg">
                <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{t("settings.advancedFilters")}</p>
                  <p className="text-gray-400 text-xs">{t("settings.findExactlyWhatLookingFor")}</p>
                </div>
              </div>
            </div>


          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 flex-shrink-0 border-t border-white/10 mt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto bg-transparent border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpgrade}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              {t("settings.getStarted")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}