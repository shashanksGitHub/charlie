import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DatingPreferences from "@/components/settings/dating-preferences";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { isUnder18 } from "@/lib/age-utils";
import { useLanguage, t } from "@/hooks/use-language";

export default function DatingPreferencesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleBack = () => {
    // Use window.history to go back to the previous page the user was on
    window.history.back();
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const contentVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Header with gradient - fixed position with higher z-index */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 to-pink-500 text-white flex-shrink-0 shadow-md">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              className="mr-3 p-2 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 transform hover:scale-105 active:scale-95 transition-all duration-200 text-white" 
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight">
              {isUnder18(user?.dateOfBirth) ? t('datingPreferences.friendshipTitle') : t('datingPreferences.title')}
            </h2>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-3 flex-grow flex flex-col">
        <motion.div 
          variants={contentVariants}
          className="relative"
        >
          <DatingPreferences />
        </motion.div>
      </div>
    </motion.div>
  );
}