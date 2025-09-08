import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Sparkles, Users, Zap } from "lucide-react";

interface MessageSplashScreenProps {
  currentUser: {
    fullName: string;
    photoUrl?: string;
  };
  targetUser: {
    fullName: string;
    photoUrl?: string;
  };
  onComplete: () => void;
  duration?: number; // Duration in milliseconds
}

export default function MessageSplashScreen({
  currentUser,
  targetUser,
  onComplete,
  duration = 2500,
}: MessageSplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    const particleArray = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(particleArray);
  }, []);

  // Step progression
  useEffect(() => {
    const steps = [
      { delay: 0, step: 0 },
      { delay: 600, step: 1 },
      { delay: 1200, step: 2 },
      { delay: 1800, step: 3 },
    ];

    const timeouts = steps.map(({ delay, step }) =>
      setTimeout(() => setCurrentStep(step), delay)
    );

    const completeTimeout = setTimeout(onComplete, duration);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(completeTimeout);
    };
  }, [duration, onComplete]);

  const messages = [
    "Establishing connection...",
    `Connecting you with ${targetUser.fullName}...`,
    "Preparing your conversation...",
    "Almost ready!",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      }}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <motion.div
              key={i}
              className="border border-white/20"
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: (i % 12) * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center text-white px-8 max-w-md">
        {/* Profile Pictures with Connection Animation */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Current User */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
          </motion.div>

          {/* Connection Line with Pulse */}
          <motion.div
            className="flex items-center mx-4"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <motion.div
              className="h-0.5 bg-gradient-to-r from-white/60 to-pink-300/60 flex-1"
              style={{ width: "60px" }}
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="mx-2"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Heart className="w-5 h-5 text-pink-300 fill-current" />
            </motion.div>
            <motion.div
              className="h-0.5 bg-gradient-to-r from-pink-300/60 to-white/60 flex-1"
              style={{ width: "60px" }}
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.75,
              }}
            />
          </motion.div>

          {/* Target User */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden">
              {targetUser.photoUrl ? (
                <img
                  src={targetUser.photoUrl}
                  alt={targetUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
          </motion.div>
        </div>

        {/* Main Icon with Pulse Animation */}
        <motion.div
          className="mb-6"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative mx-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <MessageCircle className="w-10 h-10 text-white" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/50"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </div>
        </motion.div>

        {/* Congratulatory Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            Great Choice!
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </h1>
          <p className="text-white/90 text-lg">
            You're about to start an amazing conversation with{" "}
            <span className="font-semibold text-pink-200">{targetUser.fullName}</span>
          </p>
        </motion.div>

        {/* Progress Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-2 text-white/80"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Zap className="w-4 h-4" />
            </motion.div>
            <span className="text-sm font-medium">{messages[currentStep]}</span>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <motion.div
          className="mt-8 w-full h-1 bg-white/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-pink-300 to-white rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: duration / 1000,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 180, 360],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 4 + (i * 0.5),
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            <Sparkles className="w-4 h-4 text-white/40" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}