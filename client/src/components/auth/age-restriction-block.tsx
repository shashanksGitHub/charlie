import { motion } from "framer-motion";
import { AlertCircle, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpSupportDialog } from "@/components/settings/help-support-dialog";
import { useState } from "react";

interface AgeRestrictionBlockProps {
  phoneNumber?: string;
  fullName?: string;
  email?: string;
}

export function AgeRestrictionBlock({ phoneNumber, fullName, email }: AgeRestrictionBlockProps) {
  const [helpSupportOpen, setHelpSupportOpen] = useState(false);

  const handleContactSupport = () => {
    setHelpSupportOpen(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-orange-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30"
            >
              <AlertCircle className="w-8 h-8 text-white" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Restricted
            </h1>
            <p className="text-white/90 text-sm">
              Age verification required
            </p>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            <div className="space-y-3">
              <p className="text-gray-800 font-medium">
                Sorry, CHARLéY is only available for users 14 years and older.
              </p>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                Your account has been permanently blocked based on the age information provided during registration. This is to ensure compliance with our terms of service and applicable laws.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <p className="text-red-800 font-medium mb-2">
                  Account Status: Permanently Blocked
                </p>
                <p className="text-red-700">
                  Phone number: {phoneNumber ? `${phoneNumber.slice(0, 6)}****` : "****"} has been permanently blocked from creating new accounts.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-800 flex items-center justify-center">
                <Mail className="w-4 h-4 mr-2" />
                Need Help?
              </h3>
              
              <p className="text-gray-600 text-sm">
                If you believe this is an error or need to verify your age, please contact our support team:
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center text-sm">
                  <Mail className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="font-medium text-blue-600">admin@kronogon.com</span>
                </div>
                
                <Button
                  onClick={handleContactSupport}
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Contact Support Team
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Thank you for your understanding. We're committed to providing a safe environment for all users.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Help & Support Dialog */}
      <HelpSupportDialog 
        open={helpSupportOpen} 
        onOpenChange={setHelpSupportOpen} 
        blockedUserInfo={
          fullName && email && phoneNumber 
            ? { fullName, email, phoneNumber }
            : undefined
        }
        defaultTab="contact"
      />
    </div>
  );
}