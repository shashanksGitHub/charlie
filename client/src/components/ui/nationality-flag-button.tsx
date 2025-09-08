import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNationality } from "@/hooks/use-nationality";
import { countryCodes } from "@/lib/country-codes";
import { getCountryNationality } from "@/lib/nationality-map";

interface NationalityFlagButtonProps {
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function NationalityFlagButton({
  onClick,
  size = "md",
  showLabel = false,
}: NationalityFlagButtonProps) {
  const { country } = useNationality();
  const [countryFlag, setCountryFlag] = useState(() => {
    // Initialize with correct flag based on country
    return country === "ANYWHERE" ? "🌍" : "🇬🇭";
  });
  const [countryInfo, setCountryInfo] = useState<{name: string, flag: string, nationality: string} | null>(() => {
    // Initialize with correct info based on country
    if (country === "ANYWHERE") {
      return {
        name: "ANYWHERE",
        flag: "🌍",
        nationality: "Global"
      };
    }
    return null;
  });
  
  // Update flag when country changes
  useEffect(() => {
    console.log("[NATIONALITY-FLAG-BUTTON] Country changed to:", country);
    
    // Handle special "ANYWHERE" case first
    if (country === "ANYWHERE") {
      console.log("[NATIONALITY-FLAG-BUTTON] Setting ANYWHERE flag to globe emoji");
      setCountryFlag("🌍");
      setCountryInfo({
        name: "ANYWHERE",
        flag: "🌍",
        nationality: "Global"
      });
      return;
    }
    
    // Find the country data
    const foundCountry = countryCodes.find(
      (c) => c.name === country
    );
    
    console.log("[NATIONALITY-FLAG-BUTTON] Found country:", foundCountry);
    
    if (foundCountry) {
      setCountryFlag(foundCountry.flag);
      const nationality = getCountryNationality(foundCountry.name);
      setCountryInfo({
        name: foundCountry.name,
        flag: foundCountry.flag,
        nationality
      });
    } else {
      // Fallback if country not found
      console.log("[NATIONALITY-FLAG-BUTTON] Country not found, using default");
      setCountryFlag("🇬🇭");
      setCountryInfo({
        name: "Ghana",
        flag: "🇬🇭",
        nationality: "Ghanaian"
      });
    }
  }, [country]);
  
  return (
    <div 
      className="cursor-pointer" 
      onClick={onClick}
      title={`Select nationality (currently ${countryInfo?.name || 'ANYWHERE'})`}
    >
      {country === "ANYWHERE" ? (
        <motion.span 
          className="text-3xl" 
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            rotateY: [0, 3, -2, 4, -1, 0],
            rotateX: [0, 1, -1, 2, 0],
            y: [0, -0.5, 0.5, -0.3, 0],
            x: [0, 0.3, -0.2, 0.4, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ 
            display: 'inline-block',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d'
          }}
        >
          🌍
        </motion.span>
      ) : (
        <motion.span 
          className="text-3xl" 
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            rotateY: [0, 5, -3, 6, -2, 0],
            rotateX: [0, 2, -2, 3, -1, 0],
            y: [0, -0.8, 0.6, -0.4, 0],
            x: [0, 0.4, -0.3, 0.5, 0],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ 
            display: 'inline-block',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d'
          }}
        >
          {countryFlag}
        </motion.span>
      )}
      
      {showLabel && (
        <AnimatePresence>
          <motion.span
            className="ml-2 text-xs font-medium"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
          >
            {countryInfo?.nationality || "Global"}
          </motion.span>
        </AnimatePresence>
      )}
    </div>
  );
}