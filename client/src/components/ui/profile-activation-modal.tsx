import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, Eye, Shield, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNationalityAwareTranslate } from "@/hooks/use-nationality-aware-translate";

interface ProfileActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: () => void;
}

export function ProfileActivationModal({ isOpen, onClose, onActivate }: ProfileActivationModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { translate } = useNationalityAwareTranslate();

  const activateProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/user/activate-profile", {
        method: "POST",
      });
    },
    onSuccess: () => {
      // Invalidate user data to reflect the change
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onActivate();
    },
    onError: (error: any) => {
      toast({
        title: translate("auth.activationFailed"),
        description: error.message || translate("auth.activationFailedDescription"),
        variant: "destructive",
      });
    },
  });

  const handleActivate = () => {
    // Start activation and close modal immediately for faster UX
    activateProfileMutation.mutate();
    onClose(); // Close modal immediately instead of waiting for API
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[85vw] max-w-[350px] max-h-[75vh] mx-auto p-0 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 border-0 overflow-hidden rounded-2xl"
        hideCloseButton
      >
        <div className="relative p-6 text-center">
          {/* Floating elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  rotate: [0, 360],
                  y: [0, -50]
                }}
                transition={{ 
                  duration: 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2
                }}
              >
                {i % 4 === 0 ? (
                  <Heart className="w-4 h-4 text-white/60" fill="currentColor" />
                ) : i % 4 === 1 ? (
                  <Sparkles className="w-4 h-4 text-yellow-200/60" fill="currentColor" />
                ) : i % 4 === 2 ? (
                  <Eye className="w-4 h-4 text-blue-200/60" fill="currentColor" />
                ) : (
                  <Shield className="w-4 h-4 text-green-200/60" fill="currentColor" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10"
          >


            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-black text-white mb-3"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
            >
              {translate("auth.activateProfileTitle")}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 mb-4 leading-relaxed text-sm"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              {translate("auth.activateProfileDescription")}
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 mb-5"
            >
              <div className="flex items-center justify-center gap-3 text-white/90">
                <Heart className="w-5 h-5 text-pink-200" fill="currentColor" />
                <span className="text-sm font-medium">{translate("auth.discoverMatches")}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-white/90">
                <Eye className="w-5 h-5 text-blue-200" fill="currentColor" />
                <span className="text-sm font-medium">{translate("auth.becomeVisible")}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-white/90">
                <Sparkles className="w-5 h-5 text-yellow-200" fill="currentColor" />
                <span className="text-sm font-medium">{translate("auth.startConnections")}</span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <Button
                onClick={handleActivate}
                className="w-full py-3 bg-white text-gray-800 hover:bg-gray-100 font-black text-base rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <Eye className="w-6 h-6 mr-2" />
                {translate("auth.activateProfile")}
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full py-3 bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 font-bold rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                {translate("auth.maybeLater")}
              </Button>
            </motion.div>

            {/* Privacy note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-white/70 mt-4"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              {translate("auth.privacyNote")}
            </motion.p>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}