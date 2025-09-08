import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Search, Check, X, Plus } from "lucide-react";
import highSchoolData from "../../data/highschool.json";

interface HighSchoolDialogProps {
  highSchoolPreferences: string[];
  onChange: (newHighSchoolPreferences: string[]) => void;
}

export const HighSchoolDialog: React.FC<HighSchoolDialogProps> = ({
  highSchoolPreferences,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customHighSchool, setCustomHighSchool] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ghanaian high schools from extracted data
  const commonHighSchools = [...highSchoolData.ghanaian_high_schools];

  // Filter high schools based on search
  const filteredHighSchools = commonHighSchools.filter(
    (school) =>
      school.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !highSchoolPreferences.includes(school),
  );

  // Separate "ANY SCHOOL" from other schools for special styling
  const anywhereOption = filteredHighSchools.find(school => school === "ANY SCHOOL");
  const otherSchools = filteredHighSchools.filter(school => school !== "ANY SCHOOL");

  // Focus search input when dialog opens
  useEffect(() => {
    if (isDialogOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isDialogOpen]);

  const handleAddHighSchool = (school: string) => {
    if (!highSchoolPreferences.includes(school)) {
      // If "ANY SCHOOL" is selected, clear all other selections and only keep "ANY SCHOOL"
      if (school === "ANY SCHOOL") {
        onChange(["ANY SCHOOL"]);
      }
      // If user selects any other school while "ANY SCHOOL" is already selected, replace "ANY SCHOOL" with the new selection
      else if (highSchoolPreferences.includes("ANY SCHOOL")) {
        onChange([school]);
      }
      // Normal behavior: add to existing selections
      else {
        onChange([...highSchoolPreferences, school]);
      }
    }
  };

  const handleRemoveHighSchool = (school: string) => {
    onChange(highSchoolPreferences.filter((s) => s !== school));
  };

  const handleAddCustomHighSchool = () => {
    const trimmedSchool = customHighSchool.trim();
    if (trimmedSchool && !highSchoolPreferences.includes(trimmedSchool)) {
      // If user adds a custom school while "ANY SCHOOL" is selected, replace "ANY SCHOOL"
      if (highSchoolPreferences.includes("ANY SCHOOL")) {
        onChange([trimmedSchool]);
      }
      // Normal behavior: add to existing selections
      else {
        onChange([...highSchoolPreferences, trimmedSchool]);
      }
      setCustomHighSchool("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customHighSchool.trim()) {
      handleAddCustomHighSchool();
    }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50/30 dark:from-gray-900 dark:to-pink-950/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-400 dark:to-purple-400 text-base">
          <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30 mr-3 shadow-sm">
            <GraduationCap className="h-5 w-5 text-pink-500" />
          </div>
          High School Preferences
        </Label>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-pink-200 bg-white hover:bg-pink-50 text-pink-700 dark:bg-gray-800 dark:border-gray-700 dark:text-pink-400 dark:hover:bg-gray-700"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Schools
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none bg-transparent">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <DialogClose className="absolute top-4 right-4 z-50 p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>

              {/* Glowing border effect */}
              <div className="absolute inset-0 border border-purple-500/40 rounded-3xl glow-effect"></div>

              <div className="relative z-10 backdrop-blur-md">
                <DialogHeader className="pb-0">
                  <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-3 glow-sm"></div>
                  <DialogTitle className="text-center font-semibold text-white text-base tracking-wider">
                    High School Preferences
                  </DialogTitle>
                </DialogHeader>

                <div className="relative py-4 px-6 flex flex-col items-center">
                  <p className="text-xs text-center text-gray-300 mb-4 px-3">
                    Select high schools you'd like to connect with alumni from
                  </p>

                  {/* Search input */}
                  <div className="relative w-full mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search for high schools..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-pink-400 focus:ring-pink-400"
                    />
                  </div>

                  {/* Add custom high school */}
                  <div className="w-full mb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom high school..."
                        value={customHighSchool}
                        onChange={(e) => setCustomHighSchool(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-pink-400 focus:ring-pink-400"
                      />
                      <Button
                        onClick={handleAddCustomHighSchool}
                        disabled={!customHighSchool.trim()}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* High school selection */}
                  <div className="relative rounded-2xl py-3 px-2 bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner w-full max-h-[350px] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                      {/* Show "ANY SCHOOL" option with special styling */}
                      {anywhereOption && (
                        <Badge
                          key="ANY SCHOOL"
                          className="cursor-pointer text-xs py-3 px-4 transition-all bg-gradient-to-r from-blue-500/20 to-green-500/20 text-blue-200 hover:from-blue-500/30 hover:to-green-500/30 hover:text-blue-100 backdrop-blur-md border border-blue-400/30 hover:border-blue-400/60 justify-center font-semibold"
                          onClick={() => handleAddHighSchool("ANY SCHOOL")}
                        >
                          🎓 ANY SCHOOL
                          <Plus className="h-3 w-3 ml-2 opacity-80" />
                        </Badge>
                      )}

                      {/* Show other schools with normal styling */}
                      {otherSchools.map((school) => (
                        <Badge
                          key={school}
                          className="cursor-pointer text-xs py-2 px-3 transition-all bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10 hover:border-pink-400/50 justify-start"
                          onClick={() => handleAddHighSchool(school)}
                        >
                          {school}
                          <Plus className="h-3 w-3 ml-auto opacity-60" />
                        </Badge>
                      ))}

                      {filteredHighSchools.length === 0 && searchTerm && (
                        <div className="text-center text-gray-400 py-4 text-sm">
                          No schools found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display selected high schools */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-pink-100 dark:border-pink-900/30 p-4">
        {highSchoolPreferences.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {highSchoolPreferences.map((school) => (
                <Badge
                  key={school}
                  className={`px-2.5 py-1 text-xs shadow-sm text-white flex items-center cursor-pointer ${
                    school === "ANY SCHOOL"
                      ? "bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 font-semibold"
                      : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  }`}
                  onClick={() => handleRemoveHighSchool(school)}
                >
                  {school === "ANY SCHOOL" ? "🎓 ANY SCHOOL" : school}
                  <X className="h-3 w-3 ml-1.5" />
                </Badge>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChange([])}
                className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center"
              >
                <X className="h-3.5 w-3.5 mr-1 text-gray-500" />
                Clear All
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
            No high school preferences selected
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic text-center">
        Connect with people who attended similar schools
      </div>
    </div>
  );
};
