import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Users, GraduationCap, BookOpen, Lightbulb, Target } from "lucide-react";

interface MentorshipSplashProps {
  currentUser: {
    fullName: string;
    photoUrl?: string;
  };
  targetUser: {
    fullName: string;
    photoUrl?: string;
  };
  onComplete: () => void;
  duration?: number;
}

export default function MentorshipSplash({
  currentUser,
  targetUser,
  onComplete,
  duration = 3000,
}: MentorshipSplashProps) {
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
      { delay: 800, step: 1 },
      { delay: 1600, step: 2 },
      { delay: 2400, step: 3 },
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
    "Initiating mentorship connection...",
    `Connecting you with ${targetUser.fullName}...`,
    "Preparing your mentorship journey...",
    "Ready to grow together!",
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Animated Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)",
        }}
      >
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

        {/* Floating Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 bg-white/20 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center text-white px-8 max-w-md">
        {/* Profile Pictures with Connection Animation */}
        <div className="relative flex items-center justify-center mb-12">
          {/* Current User */}
          <motion.div
            initial={{ x: -120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-3 border-white/40 flex items-center justify-center overflow-hidden shadow-lg">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-10 h-10 text-white" />
              )}
            </div>
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-white/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          </motion.div>

          {/* Connection Line with Pulse */}
          <motion.div
            className="flex items-center mx-6"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <motion.div
              className="h-1 bg-gradient-to-r from-white/60 to-purple-300/60 flex-1 rounded"
              style={{ width: "80px" }}
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="mx-3"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <GraduationCap className="w-6 h-6 text-purple-200 drop-shadow-lg" />
            </motion.div>
            <motion.div
              className="h-1 bg-gradient-to-r from-purple-300/60 to-white/60 flex-1 rounded"
              style={{ width: "80px" }}
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.05, 1],
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
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-3 border-white/40 flex items-center justify-center overflow-hidden shadow-lg">
              {targetUser.photoUrl ? (
                <img
                  src={targetUser.photoUrl}
                  alt={targetUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-10 h-10 text-white" />
              )}
            </div>
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-white/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
            />
          </motion.div>
        </div>

        {/* Main Icon with Pulse Animation */}
        <motion.div
          className="mb-8"
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative mx-auto w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-xl">
            <MessageCircle className="w-12 h-12 text-white drop-shadow-lg" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/50"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30"
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.3,
              }}
            />
          </div>
        </motion.div>

        {/* Congratulatory Message */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
            <BookOpen className="w-7 h-7 text-purple-200 drop-shadow-lg" />
            Mentorship Match!
            <Lightbulb className="w-7 h-7 text-purple-200 drop-shadow-lg" />
          </h1>
          <p className="text-white/95 text-xl leading-relaxed">
            Begin your mentorship journey with{" "}
            <span className="font-semibold text-purple-200 drop-shadow">{targetUser.fullName}</span>
          </p>
        </motion.div>

        {/* Progress Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-3 text-white/90 mb-10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Target className="w-5 h-5 drop-shadow" />
            </motion.div>
            <span className="text-lg font-medium">{messages[currentStep]}</span>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <motion.div
          className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-purple-300 via-white to-purple-300 rounded-full shadow-lg"
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
              left: `${15 + (i * 10)}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -40, 0],
              rotate: [0, 180, 360],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 5 + (i * 0.5),
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            {i % 2 === 0 ? (
              <BookOpen className="w-5 h-5 text-white/40 drop-shadow" />
            ) : (
              <Lightbulb className="w-5 h-5 text-white/40 drop-shadow" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}