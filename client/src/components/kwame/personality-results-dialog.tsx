import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Target, TrendingUp, Zap, Eye, Heart, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import TraitAnalysisDialog from "./trait-analysis-dialog";

interface Big5Trait {
  name: string;
  value: number;
  description: string;
  color: string;
  icon: React.ComponentType<any>;
  secondaryColor: string;
  glowColor: string;
}

interface PersonalityData {
  big5Profile: {
    traitPercentiles: {
      Openness: number;
      Conscientiousness: number;
      Extraversion: number;
      Agreeableness: number;
      Neuroticism: number;
    };
    narrative: {
      summary: string;
      traits: {
        Openness: string;
        Conscientiousness: string;
        Extraversion: string;
        Agreeableness: string;
        Neuroticism: string;
      };
      strengths: string[];
      growthAreas: string[];
    };
    metadata: {
      computedAt: string;
      totalResponses: number;
    };
  };
  computedAt: string;
  modelVersion: string;
}

interface PersonalityResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Futuristic floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-30"
          animate={{
            x: [0, Math.random() * 400 - 200],
            y: [0, Math.random() * 600 - 300],
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

// Animated background orbs
const BackgroundOrbs = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-r from-cyan-500/15 to-blue-600/15 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-full blur-2xl"
        animate={{
          x: [-50, 50, -50],
          y: [-30, 30, -30],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Futuristic circular progress component
const CircularProgress = ({ value, color, glowColor }: { value: number; color: string; glowColor: string }) => {
  const circumference = 2 * Math.PI * 34;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24" width="96" height="96">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Background circle */}
        <circle
          cx="48"
          cy="48"
          r="34"
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-gray-800/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx="48"
          cy="48"
          r="34"
          stroke={`url(#gradient-${color})`}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={`url(#glow-${color})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-lg font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {Math.round(value)}%
        </motion.span>
      </div>
    </div>
  );
};

export default function PersonalityResultsDialog({
  isOpen,
  onClose,
}: PersonalityResultsDialogProps) {
  const [personalityData, setPersonalityData] = useState<PersonalityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [isTraitAnalysisOpen, setIsTraitAnalysisOpen] = useState(false);

  useEffect(() => {
    if (isOpen && !personalityData) {
      fetchPersonalityResults();
    }
  }, [isOpen]);

  const fetchPersonalityResults = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/kwame/personality/results");
      if (!response.ok) {
        throw new Error("Failed to fetch personality results");
      }
      
      const data = await response.json();
      setPersonalityData(data);
    } catch (err) {
      setError("Failed to load your personality results. Please try again.");
      console.error("Failed to fetch personality results:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTraitData = (data: PersonalityData): Big5Trait[] => {
    const profile = data.big5Profile;
    return [
      {
        name: "Openness",
        value: profile.traitPercentiles.Openness,
        description: profile.narrative.traits.Openness,
        color: "#8B5CF6",
        secondaryColor: "#EC4899", 
        glowColor: "#A855F7",
        icon: Eye
      },
      {
        name: "Conscientiousness", 
        value: profile.traitPercentiles.Conscientiousness,
        description: profile.narrative.traits.Conscientiousness,
        color: "#3B82F6",
        secondaryColor: "#6366F1",
        glowColor: "#60A5FA",
        icon: Target
      },
      {
        name: "Extraversion",
        value: profile.traitPercentiles.Extraversion,
        description: profile.narrative.traits.Extraversion,
        color: "#F59E0B",
        secondaryColor: "#EF4444",
        glowColor: "#FBBF24",
        icon: Zap
      },
      {
        name: "Agreeableness",
        value: profile.traitPercentiles.Agreeableness,
        description: profile.narrative.traits.Agreeableness,
        color: "#10B981",
        secondaryColor: "#059669",
        glowColor: "#34D399",
        icon: Heart
      },
      {
        name: "Neuroticism",
        value: profile.traitPercentiles.Neuroticism,
        description: profile.narrative.traits.Neuroticism,
        color: "#06B6D4",
        secondaryColor: "#0891B2",
        glowColor: "#22D3EE",
        icon: Shield
      }
    ];
  };

  const getTraitLevel = (value: number): { label: string; color: string } => {
    if (value >= 70) return { label: "HIGH", color: "text-emerald-400" };
    if (value >= 30) return { label: "MODERATE", color: "text-cyan-400" };
    return { label: "LOW", color: "text-amber-400" };
  };

  const handleTraitClick = (traitName: string) => {
    setSelectedTrait(traitName);
    setIsTraitAnalysisOpen(true);
  };

  const handleTraitAnalysisClose = () => {
    setIsTraitAnalysisOpen(false);
    setSelectedTrait(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex sm:items-center sm:justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-full sm:max-w-4xl sm:h-[95vh]"
          >
            {/* Futuristic glassmorphism container */}
            <div className="relative w-full h-full bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 
                          backdrop-blur-xl border border-gray-700/50 rounded-none sm:rounded-3xl
                          shadow-2xl shadow-purple-500/10 overflow-y-auto overflow-x-hidden">
              
              {/* Animated background elements */}
              <BackgroundOrbs />
              <FloatingParticles />
              
              {/* Matrix-style grid overlay */}
              <div className="absolute inset-0 opacity-5 pointer-events-none"
                   style={{
                     backgroundImage: `linear-gradient(rgba(129, 140, 248, 0.3) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(129, 140, 248, 0.3) 1px, transparent 1px)`,
                     backgroundSize: '20px 20px'
                   }}>
              </div>


              {/* Content */}
              <div className="relative z-10 p-8 space-y-12">
                {isLoading && (
                  <motion.div 
                    className="flex flex-col items-center justify-center py-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-16 h-16 border-4 border-transparent border-t-cyan-400 border-r-purple-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.span 
                      className="mt-6 text-xl text-cyan-400 font-mono tracking-wider"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      PROCESSING NEURAL PATTERNS...
                    </motion.span>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    className="text-center py-20"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="text-red-400 text-xl mb-6 font-mono">{error}</div>
                    <Button 
                      onClick={fetchPersonalityResults} 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                               text-white font-bold py-3 px-8 rounded-xl border-0 shadow-lg shadow-purple-500/30"
                    >
                      RETRY ANALYSIS
                    </Button>
                  </motion.div>
                )}

                {personalityData && (
                  <motion.div 
                    className="space-y-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                  >

                    {/* Big 5 Traits Grid */}
                    <div>
                      <motion.h3 
                        className="text-xl font-bold text-white mb-6 text-center tracking-wider"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        PERSONALITY TRAIT MATRIX
                      </motion.h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {formatTraitData(personalityData).map((trait, index) => {
                          const level = getTraitLevel(trait.value);
                          const IconComponent = trait.icon;
                          
                          return (
                            <motion.div
                              key={trait.name}
                              initial={{ opacity: 0, y: 50, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ 
                                delay: 0.6 + index * 0.1,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                              }}
                              whileHover={{ 
                                scale: 1.05,
                                transition: { type: "spring", stiffness: 300 }
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTraitClick(trait.name)}
                              className="group relative p-4 rounded-2xl bg-gradient-to-br from-gray-800/60 via-gray-900/60 to-gray-800/60 
                                       border border-gray-600/30 hover:border-purple-400/50 
                                       backdrop-blur-sm transition-all duration-500 cursor-pointer"
                            >
                              {/* Animated border glow */}
                              <motion.div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{
                                  background: `linear-gradient(45deg, ${trait.color}20, ${trait.secondaryColor}20)`,
                                  filter: 'blur(10px)',
                                }}
                              />
                              
                              <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                                {/* Trait Name */}
                                <h4 className="text-sm font-bold text-white tracking-wider">
                                  {trait.name.toUpperCase()}
                                </h4>

                                {/* Circular Progress */}
                                <CircularProgress 
                                  value={trait.value} 
                                  color={trait.color}
                                  glowColor={trait.glowColor}
                                />

                                {/* Level Badge */}
                                <motion.div
                                  className={`px-4 py-2 rounded-full font-bold text-sm tracking-wider ${level.color} 
                                           bg-gray-800/50 border border-gray-600/30`}
                                  whileHover={{ scale: 1.1 }}
                                >
                                  {level.label}
                                </motion.div>

                                {/* Description */}
                                <p className="text-gray-400 leading-relaxed text-xs">
                                  {trait.description}
                                </p>

                                {/* Click indicator */}
                                <motion.div
                                  className="mt-3 text-center text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  initial={{ y: 10 }}
                                  animate={{ y: 0 }}
                                >
                                  Click for detailed analysis
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>


                    {/* Metadata Footer */}
                    <motion.div 
                      className="text-center text-gray-500 border-t border-gray-700/30 pt-8 font-mono"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 }}
                    >
                      <div className="flex justify-center items-center space-x-8 text-sm">
                        <span>ANALYSIS DATE: {new Date(personalityData.computedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>DATA POINTS: {personalityData.big5Profile.metadata.totalResponses}</span>
                        <span>•</span>
                        <span>MODEL: {personalityData.modelVersion || 'BIG5-NEURAL-V2'}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Trait Analysis Dialog */}
      <TraitAnalysisDialog
        isOpen={isTraitAnalysisOpen}
        onClose={handleTraitAnalysisClose}
        traitName={selectedTrait}
      />
    </AnimatePresence>
  );
}