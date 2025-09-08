import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface SuiteMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  matchedUser: {
    id: number;
    fullName: string;
    photoUrl?: string;
    profession?: string;
    location?: string;
  } | null;
  matchType: "networking" | "mentorship" | "jobs";
  onSendMessage: () => void;
}

export function SuiteMatchDialog({
  isOpen,
  onClose,
  matchedUser,
  matchType,
  onSendMessage,
}: SuiteMatchDialogProps) {
  const [, setLocation] = useLocation();
  const [isClosing, setIsClosing] = useState(false);

  const handleContinueSwiping = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleSendMessage = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      onSendMessage();
      setIsClosing(false);
    }, 300);
  };

  console.log("[SUITE-MATCH-DIALOG] Received props:", { 
    isOpen, 
    matchedUser, 
    matchType 
  });

  if (!matchedUser) return null;

  const matchTitle = matchType === "networking" 
    ? "It's a Connection!" 
    : matchType === "mentorship" 
    ? "Mentorship Match!" 
    : "Job Match!";
  
  const matchIcon = matchType === "networking" 
    ? "🤝" 
    : matchType === "mentorship" 
    ? "🎓" 
    : "💼";
    
  const gradientColors = matchType === "networking" 
    ? "from-emerald-400 via-teal-500 to-cyan-600"
    : matchType === "mentorship"
    ? "from-purple-400 via-pink-500 to-red-500"
    : "from-blue-400 via-indigo-500 to-purple-600";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md p-0 bg-transparent border-none shadow-none overflow-hidden">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ 
                scale: isClosing ? 0.8 : 1, 
                opacity: isClosing ? 0 : 1, 
                rotateY: 0 
              }}
              exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                duration: 0.6 
              }}
              className="relative"
            >
              {/* Animated Background Effects */}
              <div className="absolute inset-0 -z-10">
                {/* Floating Hearts/Stars */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ 
                      opacity: 0, 
                      scale: 0,
                      x: Math.random() * 300 - 150,
                      y: Math.random() * 400 - 200
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      rotate: [0, 360],
                      y: [0, -100]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 3
                    }}
                  >
                    {i % 3 === 0 ? (
                      <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
                    ) : i % 3 === 1 ? (
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-purple-400" fill="currentColor" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Main Dialog Content */}
              <div className={`relative bg-gradient-to-br ${gradientColors} rounded-3xl p-8 shadow-2xl border-4 border-white/30 backdrop-blur-xl`}>
                
                {/* Celebration Header */}
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="text-center mb-6"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="text-6xl mb-2"
                  >
                    {matchIcon}
                  </motion.div>
                  
                  <motion.h1
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className="text-3xl font-black text-white mb-1"
                    style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.5)' }}
                  >
                    {matchTitle}
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/90 font-medium"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    You both want to connect!
                  </motion.p>
                </motion.div>

                {/* User Profiles */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="flex items-center justify-center gap-4 mb-8"
                >
                  {/* Current User Placeholder */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                        You
                      </div>
                    </div>
                  </div>



                  {/* Matched User */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-white/50 overflow-hidden backdrop-blur-sm">
                      {matchedUser.photoUrl ? (
                        <img
                          src={matchedUser.photoUrl}
                          alt={matchedUser.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                          {matchedUser.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Matched User Info */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-2xl font-black text-white mb-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    {matchedUser.fullName}
                  </h2>

                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={handleSendMessage}
                    className="w-full py-4 bg-white text-gray-800 hover:bg-gray-100 font-black text-lg rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <MessageCircle className="w-6 h-6 mr-2" />
                    Send Message
                  </Button>
                  
                  <Button
                    onClick={handleContinueSwiping}
                    variant="outline"
                    className="w-full py-3 bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 font-bold rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105"
                  >
                    Continue Swiping
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}