import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, User, Briefcase, Heart, TrendingUp, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AspectAnalysis {
  name: string;
  percentile: number;
  level: string;
  levelLabel: string;
  description: string;
  characteristics: string[];
  advantages: string[];
  challenges: string[];
  relationshipStyle: string;
  careerImplications: string;
}

interface TraitAnalysis {
  name: string;
  percentile: number;
  level: string;
  levelLabel: string;
  overview: string;
  aspects: [AspectAnalysis, AspectAnalysis];
  genderNotes?: string;
  politicalTendencies?: string;
}

interface TraitAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  traitName: string | null;
}

// Animated background orbs for consistency with personality results dialog
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
    </div>
  );
};

// Floating particles for futuristic effect
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-30"
          animate={{
            x: [0, Math.random() * 300 - 150],
            y: [0, Math.random() * 400 - 200],
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
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

// Collapsible section component
const CollapsibleSection = ({ 
  title, 
  children, 
  icon: Icon, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  icon: React.ComponentType<any>; 
  defaultOpen?: boolean; 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      className="border border-gray-600/30 rounded-xl overflow-hidden bg-gray-800/40 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-600/50 hover:to-gray-700/50 transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-white">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Get trait color scheme
const getTraitColor = (traitName: string) => {
  const colors = {
    'Openness': { primary: '#8B5CF6', secondary: '#EC4899', glow: '#A855F7' },
    'Agreeableness': { primary: '#10B981', secondary: '#059669', glow: '#34D399' },
    'Conscientiousness': { primary: '#3B82F6', secondary: '#6366F1', glow: '#60A5FA' },
    'Extraversion': { primary: '#F59E0B', secondary: '#EF4444', glow: '#FBBF24' },
    'Neuroticism': { primary: '#06B6D4', secondary: '#0891B2', glow: '#22D3EE' }
  };
  return colors[traitName as keyof typeof colors] || colors['Openness'];
};

export default function TraitAnalysisDialog({
  isOpen,
  onClose,
  traitName,
}: TraitAnalysisDialogProps) {
  const [traitData, setTraitData] = useState<TraitAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && traitName) {
      fetchTraitAnalysis();
    }
  }, [isOpen, traitName]);

  const fetchTraitAnalysis = async () => {
    if (!traitName) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/kwame/personality/trait-analysis/${traitName}`);
      if (!response.ok) {
        throw new Error("Failed to fetch trait analysis");
      }
      
      const data = await response.json();
      setTraitData(data.traitAnalysis);
    } catch (err) {
      setError("Failed to load trait analysis. Please try again.");
      console.error("Failed to fetch trait analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const traitColors = traitName ? getTraitColor(traitName) : { primary: '#8B5CF6', secondary: '#EC4899', glow: '#A855F7' };

  return (
    <AnimatePresence>
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

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700/80 
                       border border-gray-600/50 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 text-gray-300" />
            </motion.button>

            {/* Content */}
            <div className="relative z-10 p-8 space-y-8">
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
                    ANALYZING {traitName?.toUpperCase()} TRAIT...
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
                    onClick={fetchTraitAnalysis} 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 
                             text-white font-bold py-3 px-8 rounded-xl border-0 shadow-lg shadow-purple-500/30"
                  >
                    RETRY ANALYSIS
                  </Button>
                </motion.div>
              )}

              {traitData && (
                <motion.div 
                  className="space-y-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  {/* Header */}
                  <motion.div
                    className="text-center"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.h1 
                      className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent mb-4"
                      style={{
                        textShadow: `0 0 20px ${traitColors.glow}40`
                      }}
                    >
                      {traitData.name.toUpperCase()} ANALYSIS
                    </motion.h1>
                    <div className="flex items-center justify-center space-x-4 text-sm font-mono">
                      <span className="text-gray-400">PERCENTILE:</span>
                      <motion.span 
                        className="text-2xl font-bold"
                        style={{ color: traitColors.primary }}
                        animate={{ 
                          textShadow: [`0 0 10px ${traitColors.glow}`, `0 0 20px ${traitColors.glow}`, `0 0 10px ${traitColors.glow}`]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {Math.round(traitData.percentile)}%
                      </motion.span>
                      <span className="text-gray-400">•</span>
                      <span 
                        className="px-3 py-1 rounded-full font-bold text-sm border"
                        style={{ 
                          color: traitColors.primary,
                          borderColor: `${traitColors.primary}40`,
                          backgroundColor: `${traitColors.primary}10`
                        }}
                      >
                        {traitData.levelLabel}
                      </span>
                    </div>
                  </motion.div>

                  {/* Overview */}
                  <motion.div
                    className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/60 to-gray-900/60 border border-gray-600/30"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-lg font-bold text-white mb-4">
                      TRAIT OVERVIEW
                    </h2>
                    <p className="text-gray-300 leading-relaxed text-sm">{traitData.overview}</p>
                  </motion.div>

                  {/* Aspects Analysis */}
                  <div className="space-y-6">
                    <motion.h2 
                      className="text-lg font-bold text-center text-white tracking-wider"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      DETAILED ASPECT ANALYSIS
                    </motion.h2>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                      {traitData.aspects.map((aspect, index) => (
                        <motion.div
                          key={aspect.name}
                          className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600/30"
                          initial={{ y: 30, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.8 + index * 0.2 }}
                        >
                          {/* Aspect Header */}
                          <div className="mb-6">
                            <h3 className="text-lg font-bold text-white mb-2">{aspect.name}</h3>
                            <div className="flex items-center space-x-3 mb-3">
                              <span className="text-lg font-bold text-cyan-400">{Math.round(aspect.percentile)}%</span>
                              <span 
                                className="px-3 py-1 rounded-full text-sm font-bold"
                                style={{ 
                                  color: traitColors.primary,
                                  backgroundColor: `${traitColors.primary}20`
                                }}
                              >
                                {aspect.levelLabel}
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed">{aspect.description}</p>
                          </div>

                          {/* Aspect Details */}
                          <div className="space-y-4">
                            <CollapsibleSection 
                              title="Characteristics" 
                              icon={User}
                              defaultOpen={true}
                            >
                              <ul className="space-y-2">
                                {aspect.characteristics.map((char, i) => (
                                  <motion.li 
                                    key={i} 
                                    className="flex items-center text-gray-300 text-sm"
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                  >
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3 flex-shrink-0" />
                                    {char}
                                  </motion.li>
                                ))}
                              </ul>
                            </CollapsibleSection>

                            <CollapsibleSection title="Strengths" icon={CheckCircle}>
                              <ul className="space-y-2">
                                {aspect.advantages.map((advantage, i) => (
                                  <motion.li 
                                    key={i} 
                                    className="flex items-center text-green-300 text-sm"
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                  >
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3 flex-shrink-0" />
                                    {advantage}
                                  </motion.li>
                                ))}
                              </ul>
                            </CollapsibleSection>

                            <CollapsibleSection title="Growth Areas" icon={TrendingUp}>
                              <ul className="space-y-2">
                                {aspect.challenges.map((challenge, i) => (
                                  <motion.li 
                                    key={i} 
                                    className="flex items-center text-amber-300 text-sm"
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * i }}
                                  >
                                    <div className="w-2 h-2 bg-amber-400 rounded-full mr-3 flex-shrink-0" />
                                    {challenge}
                                  </motion.li>
                                ))}
                              </ul>
                            </CollapsibleSection>

                            <CollapsibleSection title="Relationship Style" icon={Heart}>
                              <p className="text-gray-300 text-xs leading-relaxed">{aspect.relationshipStyle}</p>
                            </CollapsibleSection>

                            <CollapsibleSection title="Career Implications" icon={Briefcase}>
                              <p className="text-gray-300 text-xs leading-relaxed">{aspect.careerImplications}</p>
                            </CollapsibleSection>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Insights */}
                  {(traitData.genderNotes || traitData.politicalTendencies) && (
                    <motion.div
                      className="space-y-4"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.2 }}
                    >
                      <h3 className="text-lg font-bold text-white text-center">ADDITIONAL INSIGHTS</h3>
                      
                      {traitData.genderNotes && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30">
                          <h4 className="font-semibold text-purple-300 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Gender Patterns
                          </h4>
                          <p className="text-gray-300 text-sm">{traitData.genderNotes}</p>
                        </div>
                      )}
                      
                      {traitData.politicalTendencies && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30">
                          <h4 className="font-semibold text-blue-300 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Political Tendencies
                          </h4>
                          <p className="text-gray-300 text-sm">{traitData.politicalTendencies}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}