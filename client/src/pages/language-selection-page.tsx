import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Check,
  Globe,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

// Multilingual translations of "LANGUAGE"
const languageTranslations = [
  { text: "LANGUAGE", lang: "English" },
  { text: "LANGUE", lang: "French" },
  { text: "IDIOMA", lang: "Spanish" },
  { text: "SPRACHE", lang: "German" },
  { text: "LINGUA", lang: "Italian" },
  { text: "LÍNGUA", lang: "Portuguese" },
  { text: "ЯЗЫК", lang: "Russian" },
  { text: "语言", lang: "Chinese" },
  { text: "言語", lang: "Japanese" },
  { text: "언어", lang: "Korean" },
  { text: "لغة", lang: "Arabic" },
  { text: "भाषा", lang: "Hindi" },
  { text: "ভাষা", lang: "Bengali" },
  { text: "ਭਾਸ਼ਾ", lang: "Punjabi" },
  { text: "BASA", lang: "Javanese" },
  { text: "భాష", lang: "Telugu" },
  { text: "भाषा", lang: "Marathi" },
  { text: "மொழி", lang: "Tamil" },
  { text: "زبان", lang: "Urdu" },
  { text: "ગુજરાતી", lang: "Gujarati" },
  { text: "ಭಾಷೆ", lang: "Kannada" },
  { text: "ഭാഷ", lang: "Malayalam" },
  { text: "زبان", lang: "Persian" },
  { text: "ภาษา", lang: "Thai" },
  { text: "DİL", lang: "Turkish" },
  { text: "TAAL", lang: "Dutch" },
  { text: "SPRÅK", lang: "Swedish" },
  { text: "SPROG", lang: "Danish" },
  { text: "SPRÅK", lang: "Norwegian" },
  { text: "KIELI", lang: "Finnish" },
  { text: "JĘZYK", lang: "Polish" },
  { text: "МОВА", lang: "Ukrainian" },
  { text: "JAZYK", lang: "Czech" },
  { text: "NYELV", lang: "Hungarian" },
  { text: "ΓΛΩΣΣΑ", lang: "Greek" },
  { text: "ЕЗИК", lang: "Bulgarian" },
  { text: "LIMBĂ", lang: "Romanian" },
  { text: "BAHASA", lang: "Indonesian" },
  { text: "BAHASA", lang: "Malay" },
  { text: "NGÔN NGỮ", lang: "Vietnamese" },
  { text: "ភាសា", lang: "Khmer" },
  { text: "שפה", lang: "Hebrew" },
  { text: "ቋንቋ", lang: "Amharic" },
  { text: "LUGHA", lang: "Swahili" },
  { text: "HARSHE", lang: "Hausa" },
  { text: "ÈDÈ", lang: "Yoruba" },
  { text: "ASỤSỤ", lang: "Igbo" },
  { text: "KASA", lang: "Akan" },
  { text: "GBEGBE", lang: "Ewe" },
  { text: "GBE", lang: "Gã" },
  { text: "YEL", lang: "Dagbani" },
  { text: "KASA", lang: "Twi" },
];

// Carousel configuration
const ITEMS_PER_VIEW = 8; // Show 8 language cards per section
const CARD_WIDTH = 160; // Width of each language card
const CARD_GAP = 12; // Gap between cards

export default function LanguageSelectionPage() {
  const [, setLocation] = useLocation();
  const { currentLanguage, setLanguage, allLanguages } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    currentLanguage?.code || "en",
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Low-power mode detection
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(
    typeof document !== "undefined" ? !document.hidden : true,
  );
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false,
  );

  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    let mql: MediaQueryList | null = null;
    const onPointerChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (typeof window !== "undefined") {
      mql = window.matchMedia("(pointer: coarse)");
      try {
        mql.addEventListener("change", onPointerChange);
      } catch {
        // Safari fallback
        // @ts-ignore
        mql.addListener(onPointerChange);
      }
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (mql) {
        try {
          mql.removeEventListener("change", onPointerChange);
        } catch {
          // Safari fallback
          // @ts-ignore
          mql.removeListener(onPointerChange);
        }
      }
    };
  }, []);

  const shouldAnimate = isVisible && !prefersReducedMotion;
  const particleCount = shouldAnimate ? (isMobile ? 16 : 50) : 0;

  // Filter and search languages
  const filteredLanguages = useMemo(() => {
    if (!allLanguages) return [];

    if (!searchQuery.trim()) {
      return allLanguages;
    }

    const query = searchQuery.toLowerCase().trim();
    return allLanguages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query),
    );
  }, [allLanguages, searchQuery]);

  // Calculate total pages for carousel
  const totalPages = Math.ceil(filteredLanguages.length / ITEMS_PER_VIEW);
  const maxIndex = Math.max(0, totalPages - 1);

  // Create dynamic particle system
  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
    setTimeout(() => setIsLoaded(true), 300);
  }, [particleCount]);

  // Memoize line seeds for neural network lines
  const lineCount = shouldAnimate ? (isMobile ? 4 : 8) : 0;
  const lineSeeds = useMemo(
    () =>
      Array.from({ length: lineCount }, () => ({
        x1: Math.random() * 100,
        y1: Math.random() * 100,
        x2: Math.random() * 100,
        y2: Math.random() * 100,
      })),
    [lineCount],
  );

  // Mouse tracking for interactive effects
  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleContinue = async () => {
    setIsAnimating(true);
    setIsExiting(true);

    // Set the selected language (now async)
    await setLanguage(selectedLanguage);

    // Mark that language selection has been completed
    localStorage.setItem("charley_language_selection_completed", "true");
    localStorage.setItem("charley_selected_app_language", selectedLanguage);

    // Enhanced transition with beautiful exit animation
    setTimeout(() => {
      setLocation("/auth");
    }, 1500); // Longer delay for smooth exit animation
  };

  // Check if we should skip this page
  useEffect(() => {
    const hasCompletedSelection = localStorage.getItem(
      "charley_language_selection_completed",
    );
    if (hasCompletedSelection === "true") {
      // User has already selected language, redirect to auth
      setLocation("/auth");
    }
  }, [setLocation]);

  return (
    <div
      ref={containerRef}
      onMouseMove={shouldAnimate ? handleMouseMove : undefined}
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%),
          linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 100%)
        `,
      }}
    >
      {/* Advanced Particle System */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          duration: isExiting ? 0.8 : 0,
          ease: "easeOut",
        }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              opacity: isExiting ? 0 : shouldAnimate ? [0, 1, 0] : 1,
              scale: isExiting ? 0 : shouldAnimate ? [0, 1, 0] : 1,
              y: isExiting ? -50 : shouldAnimate ? [0, -100, -200] : 0,
            }}
            transition={{
              duration: isExiting ? 1 : shouldAnimate ? 6 : 0,
              repeat: isExiting ? 0 : shouldAnimate ? Infinity : 0,
              delay: isExiting ? particle.delay * 0.1 : particle.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </motion.div>

      {/* Holographic Grid Background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          duration: isExiting ? 1 : 0,
          ease: "easeOut",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: shouldAnimate ? "grid-move 20s linear infinite" : "none",
          }}
        />
      </motion.div>

      {/* Floating Energy Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{
          x: isExiting ? -200 : [0, 100, -50, 0],
          y: isExiting ? -100 : [0, -80, 60, 0],
          scale: isExiting ? 0 : [1, 1.2, 0.8, 1],
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          duration: isExiting ? 1.2 : shouldAnimate ? 12 : 0,
          repeat: isExiting ? 0 : shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 0, 255, 0.15) 0%, transparent 70%)",
          filter: "blur(25px)",
        }}
        animate={{
          x: isExiting ? 150 : [0, -120, 80, 0],
          y: isExiting ? -80 : [0, 70, -90, 0],
          scale: isExiting ? 0 : [1, 0.7, 1.3, 1],
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          duration: isExiting ? 1.5 : shouldAnimate ? 15 : 0,
          repeat: isExiting ? 0 : shouldAnimate ? Infinity : 0,
          ease: "easeInOut",
          delay: isExiting ? 0.2 : 2,
        }}
      />

      {/* Dynamic Neural Network Lines */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
        animate={{
          opacity: isExiting ? 0 : 1,
        }}
        transition={{
          duration: isExiting ? 0.8 : 0,
          ease: "easeOut",
        }}
      >
        <defs>
          <linearGradient
            id="line-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(0, 255, 255, 0.3)" />
            <stop offset="50%" stopColor="rgba(255, 0, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(0, 255, 255, 0.3)" />
          </linearGradient>
        </defs>
        {lineSeeds.map((seed, i) => (
          <motion.line
            key={i}
            x1={`${seed.x1}%`}
            y1={`${seed.y1}%`}
            x2={`${seed.x2}%`}
            y2={`${seed.y2}%`}
            stroke="url(#line-gradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: isExiting ? 0 : shouldAnimate ? [0, 1, 0] : 1,
              opacity: isExiting ? 0 : shouldAnimate ? [0, 0.6, 0] : 0.4,
            }}
            transition={{
              duration: isExiting ? 0.5 : shouldAnimate ? 10 : 0,
              repeat: isExiting ? 0 : shouldAnimate ? Infinity : 0,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.svg>

      {/* Animated Language Translations - Top (3 Layers) */}
      <motion.div
        className="absolute top-8 left-0 w-full h-24 overflow-hidden z-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 0.6 : 0 }}
        transition={{ duration: 1, delay: 1 }}
      >
        {/* Top Layer 1 - moving right to left */}
        <motion.div
          className="absolute top-0 flex items-center space-x-16 whitespace-nowrap"
          animate={shouldAnimate ? { x: [0, -3000] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 60 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
          }}
        >
          {languageTranslations.slice(0, 20).map((item, index) => (
            <motion.div
              key={`top-1-${index}`}
              className="text-transparent bg-gradient-to-r from-cyan-400/50 via-purple-400/70 to-cyan-400/50 bg-clip-text font-bold text-xl tracking-wider"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.3, 0.9, 0.3],
                scale: [0.9, 1.2, 0.9],
              }}
              transition={{
                duration: shouldAnimate ? 4 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Top Layer 2 - moving left to right */}
        <motion.div
          className="absolute top-6 flex items-center space-x-12 whitespace-nowrap"
          animate={shouldAnimate ? { x: [-2500, 500] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 50 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
            delay: 1,
          }}
        >
          {languageTranslations.slice(20, 40).map((item, index) => (
            <motion.div
              key={`top-2-${index}`}
              className="text-transparent bg-gradient-to-r from-purple-300/40 via-cyan-300/60 to-purple-300/40 bg-clip-text font-bold text-lg tracking-wide"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.2, 0.7, 0.2],
                scale: [0.8, 1.1, 0.8],
                rotateY: [0, 15, 0],
              }}
              transition={{
                duration: shouldAnimate ? 5 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.25,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Top Layer 3 - moving right to left (slower) */}
        <motion.div
          className="absolute top-12 flex items-center space-x-20 whitespace-nowrap"
          animate={shouldAnimate ? { x: [200, -2800] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 70 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
            delay: 2,
          }}
        >
          {languageTranslations.slice(40).map((item, index) => (
            <motion.div
              key={`top-3-${index}`}
              className="text-transparent bg-gradient-to-r from-cyan-200/30 via-purple-200/50 to-cyan-200/30 bg-clip-text font-bold text-base tracking-widest"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.1, 0.6, 0.1],
                scale: [0.9, 1.05, 0.9],
                y: [0, -3, 0],
              }}
              transition={{
                duration: shouldAnimate ? 3 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.3,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Main Container with Advanced Glass Effect */}
      <motion.div
        className="relative z-10 w-full max-w-lg lg:max-w-4xl xl:max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 100, rotateX: -15 }}
        animate={{
          opacity: isExiting ? 0 : isLoaded ? 1 : 0,
          y: isExiting ? -300 : isLoaded ? 0 : 100,
          rotateX: isExiting ? 20 : isLoaded ? 0 : -15,
          scale: isExiting ? 0.7 : 1,
          filter: isExiting ? "blur(10px)" : "blur(0px)",
        }}
        transition={{
          duration: isExiting ? 1.5 : 1.2,
          ease: isExiting ? [0.76, 0, 0.24, 1] : [0.23, 1, 0.32, 1],
          delay: isExiting ? 0 : 0.2,
        }}
      >
        {/* Holographic Border Effect */}
        <div className="absolute inset-0 rounded-3xl">
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: `conic-gradient(from 0deg, 
                rgba(0, 255, 255, 0.5) 0deg, 
                rgba(255, 0, 255, 0.5) 120deg, 
                rgba(255, 255, 0, 0.5) 240deg, 
                rgba(0, 255, 255, 0.5) 360deg)`,
              padding: "2px",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "xor",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              animation: shouldAnimate
                ? "border-spin 6s linear infinite"
                : "none",
            }}
          />
        </div>

        {/* Main Glass Container */}
        <div className="relative bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Inner Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-purple-400/5 rounded-3xl" />

          {/* Scanning Lines Effect */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: shouldAnimate
                ? [
                    "linear-gradient(0deg, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)",
                    "linear-gradient(180deg, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)",
                    "linear-gradient(0deg, transparent 0%, rgba(0, 255, 255, 0.1) 50%, transparent 100%)",
                  ]
                : undefined,
            }}
            transition={{
              duration: shouldAnimate ? 4 : 0,
              repeat: shouldAnimate ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          <div className="relative p-4 lg:p-8 xl:p-12 z-10">
            {/* Compact Header */}
            <motion.div
              className="text-center mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.h1
                className="text-xl lg:text-4xl xl:text-5xl font-bold mb-2 lg:mb-6 bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent"
                style={{ letterSpacing: "0.05em" }}
              >
                SELECT LANGUAGE
              </motion.h1>

              <motion.p
                className="text-gray-400 text-xs lg:text-lg xl:text-xl font-light mb-2 lg:mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                Choose your preferred language
              </motion.p>
            </motion.div>

            {/* Compact Search Bar */}
            <motion.div
              className="mb-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 15 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="relative max-w-xs lg:max-w-md xl:max-w-lg mx-auto">
                <div className="relative bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-center px-3 py-2 lg:px-4 lg:py-3">
                    <Search className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search languages..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentIndex(0);
                      }}
                      className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-xs lg:text-sm"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Compact Language Carousel */}
            <motion.div
              className="relative mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              {/* Compact Navigation */}
              <div className="flex items-center justify-center mb-2">
                <motion.button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-1.5 rounded-full bg-black/40 border border-white/10 mr-3 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft className="w-3 h-3 text-cyan-400" />
                </motion.button>

                <span className="text-[10px] text-gray-400 mx-3 min-w-[50px] text-center">
                  {currentIndex + 1} / {totalPages}
                </span>

                <motion.button
                  onClick={() =>
                    setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
                  }
                  disabled={currentIndex >= maxIndex}
                  className="p-1.5 rounded-full bg-black/40 border border-white/10 ml-3 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronRight className="w-3 h-3 text-cyan-400" />
                </motion.button>
              </div>

              {/* Enhanced Grid Layout - More languages on desktop */}
              <div className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-3 lg:gap-x-4 lg:gap-y-4 justify-center overflow-hidden">
                {filteredLanguages
                  .slice(
                    currentIndex * ITEMS_PER_VIEW,
                    (currentIndex + 1) * ITEMS_PER_VIEW,
                  )
                  .map((language: any, index: number) => (
                    <motion.div
                      key={language.code}
                      className="relative group min-w-0"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.8 + index * 0.05,
                        ease: "easeOut",
                      }}
                    >
                      {/* Holographic Border */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div
                          className="absolute inset-0 rounded-2xl animate-pulse"
                          style={{
                            background:
                              selectedLanguage === language.code
                                ? "linear-gradient(45deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.3))"
                                : "linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
                            padding: "1px",
                          }}
                        />
                      </div>

                      <motion.button
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`relative w-full p-2 lg:p-4 xl:p-5 rounded-lg lg:rounded-xl transition-all duration-300 overflow-hidden text-center ${
                          selectedLanguage === language.code
                            ? "bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-400/50 lg:border-2"
                            : "bg-black/30 border border-white/10 hover:bg-white/5 hover:border-white/20 lg:hover:border-white/30"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Dynamic Background Effect */}
                        {selectedLanguage === language.code && (
                          <motion.div
                            className="absolute inset-0 opacity-30"
                            animate={{
                              background: [
                                "radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.2) 0%, transparent 50%)",
                                "radial-gradient(circle at 100% 100%, rgba(255, 0, 255, 0.2) 0%, transparent 50%)",
                                "radial-gradient(circle at 0% 0%, rgba(0, 255, 255, 0.2) 0%, transparent 50%)",
                              ],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        )}

                        {/* Particle Stream Effect */}
                        {selectedLanguage === language.code && (
                          <div className="absolute inset-0">
                            {[...Array(10)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                  opacity: [0, 1, 0],
                                  scale: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  delay: i * 0.2,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <div className="relative flex flex-col items-center z-10 space-y-1">
                          {/* Language Flag */}
                          <motion.div
                            className="text-lg lg:text-2xl xl:text-3xl"
                            animate={
                              selectedLanguage === language.code
                                ? {
                                    scale: [1, 1.1, 1],
                                  }
                                : {}
                            }
                            transition={{
                              duration: 1,
                              repeat:
                                selectedLanguage === language.code
                                  ? Infinity
                                  : 0,
                              ease: "easeInOut",
                            }}
                          >
                            {language.flag}
                          </motion.div>

                          {/* Language Name - Compact */}
                          <div className="text-center">
                            <div
                              className={`font-semibold text-[10px] lg:text-xs xl:text-sm leading-tight ${
                                selectedLanguage === language.code
                                  ? "text-transparent bg-gradient-to-r from-cyan-400 to-white bg-clip-text"
                                  : "text-white"
                              }`}
                            >
                              {language.name}
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          {selectedLanguage === language.code && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3, ease: "backOut" }}
                            >
                              <Check className="h-2 w-2 lg:h-3 lg:w-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    </motion.div>
                  ))}
              </div>

              {/* Compact Progress Dots */}
              <div className="flex justify-center mt-3 space-x-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                      i === currentIndex
                        ? "bg-cyan-400"
                        : "bg-white/20 hover:bg-white/40"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Compact Continue Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <motion.button
                onClick={handleContinue}
                disabled={isAnimating}
                className="relative w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-semibold text-sm rounded-xl overflow-hidden group disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Animated Background Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: shouldAnimate ? ["-100%", "200%"] : undefined,
                  }}
                  transition={{
                    duration: shouldAnimate ? 3 : 0,
                    repeat: shouldAnimate ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />

                {/* Energy Pulse Ring */}
                <motion.div
                  className="absolute inset-0 border-2 border-cyan-400/50 rounded-2xl"
                  animate={{
                    scale: shouldAnimate ? [1, 1.05, 1] : 1,
                    opacity: shouldAnimate ? [0.5, 0.8, 0.5] : 0.8,
                  }}
                  transition={{
                    duration: shouldAnimate ? 2 : 0,
                    repeat: shouldAnimate ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                />

                {/* Button Content */}
                <motion.div
                  className="relative flex items-center justify-center gap-3 z-10"
                  animate={
                    isAnimating
                      ? {
                          x: [0, 10, 0],
                          opacity: [1, 0.7, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.8,
                    repeat: isAnimating && shouldAnimate ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                >
                  {isAnimating ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={shouldAnimate ? { rotate: 360 } : undefined}
                        transition={{
                          duration: shouldAnimate ? 1 : 0,
                          repeat: shouldAnimate ? Infinity : 0,
                          ease: "linear",
                        }}
                      />
                      <span className="text-lg tracking-wider">
                        INITIALIZING...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg lg:text-xl xl:text-2xl font-black tracking-wider">
                        CONTINUE
                      </span>
                      <motion.div
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className="h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                      </motion.div>
                    </>
                  )}
                </motion.div>

                {/* Particle Trail on Hover */}
                <div className="absolute inset-0 overflow-hidden group-hover:block hidden">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        opacity: shouldAnimate ? [0, 1, 0] : 0.8,
                        scale: shouldAnimate ? [0, 1, 0] : 1,
                        y: shouldAnimate ? [0, -20] : 0,
                      }}
                      transition={{
                        duration: shouldAnimate ? 1.5 : 0,
                        repeat: shouldAnimate ? Infinity : 0,
                        delay: i * 0.1,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </div>
              </motion.button>
            </motion.div>

            {/* Futuristic Footer */}
            <motion.div
              className="text-center mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 1, delay: 2 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <motion.div
                  className="w-1 h-1 bg-cyan-400 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="w-1 h-1 bg-purple-400 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3,
                  }}
                />
                <motion.div
                  className="w-1 h-1 bg-cyan-400 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6,
                  }}
                />
              </div>
              <p className="text-gray-400 text-xs lg:text-sm xl:text-base font-light tracking-wide">
                Customizable in Settings
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Animated Language Translations - Bottom (3 Layers) */}
      <motion.div
        className="absolute bottom-8 left-0 w-full h-24 overflow-hidden z-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 0.6 : 0 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        {/* Bottom Layer 1 - moving left to right */}
        <motion.div
          className="absolute bottom-0 flex items-center space-x-14 whitespace-nowrap"
          animate={shouldAnimate ? { x: [-3000, 500] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 55 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
          }}
        >
          {languageTranslations.slice(0, 20).map((item, index) => (
            <motion.div
              key={`bottom-1-${index}`}
              className="text-transparent bg-gradient-to-r from-purple-400/60 via-cyan-400/80 to-purple-400/60 bg-clip-text font-bold text-xl tracking-widest"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.4, 1.0, 0.4],
                scale: [0.8, 1.3, 0.8],
                rotateX: [0, -10, 0],
              }}
              transition={{
                duration: shouldAnimate ? 4.5 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.15,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Layer 2 - moving right to left */}
        <motion.div
          className="absolute bottom-6 flex items-center space-x-18 whitespace-nowrap"
          animate={shouldAnimate ? { x: [300, -2800] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 65 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
            delay: 1.5,
          }}
        >
          {languageTranslations.slice(20, 40).map((item, index) => (
            <motion.div
              key={`bottom-2-${index}`}
              className="text-transparent bg-gradient-to-r from-cyan-300/45 via-purple-300/65 to-cyan-300/45 bg-clip-text font-bold text-lg tracking-wide"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.9, 1.15, 0.9],
                rotateZ: [0, 5, 0],
              }}
              transition={{
                duration: shouldAnimate ? 5.5 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.2,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Layer 3 - moving left to right (fastest) */}
        <motion.div
          className="absolute bottom-12 flex items-center space-x-10 whitespace-nowrap"
          animate={shouldAnimate ? { x: [-2200, 800] } : { x: 0 }}
          transition={{
            duration: shouldAnimate ? 45 : 0,
            repeat: shouldAnimate ? Infinity : 0,
            ease: "linear",
            delay: 3,
          }}
        >
          {languageTranslations.slice(40).map((item, index) => (
            <motion.div
              key={`bottom-3-${index}`}
              className="text-transparent bg-gradient-to-r from-purple-200/35 via-cyan-200/55 to-purple-200/35 bg-clip-text font-bold text-base tracking-wider"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: [0.2, 0.75, 0.2],
                scale: [0.95, 1.08, 0.95],
                y: [0, 4, 0],
              }}
              transition={{
                duration: shouldAnimate ? 3.2 : 0,
                repeat: shouldAnimate ? Infinity : 0,
                delay: index * 0.18,
                ease: "easeInOut",
              }}
            >
              {item.text}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* CSS Animations */}
      <style>{`
        @keyframes border-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
}
