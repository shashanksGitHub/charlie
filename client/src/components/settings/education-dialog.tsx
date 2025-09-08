import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Check, X } from "lucide-react";
import { useLanguage, t } from "@/hooks/use-language";

interface EducationOption {
  value: string;
  label: string;
}

interface EducationDialogProps {
  educationLevel: string[];
  onChange: (newEducationLevel: string[]) => void;
  educationOptions: EducationOption[];
}

export function EducationDialog({ educationLevel, onChange, educationOptions }: EducationDialogProps) {
  return (
    <div className="p-4 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 text-base">
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 mr-3 shadow-sm">
            <GraduationCap className="h-5 w-5 text-purple-500" />
          </div>
          {t('datingPreferences.fields.educationLevel')}
        </Label>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-purple-200 bg-white hover:bg-purple-50 text-purple-700 dark:bg-gray-800 dark:border-gray-700 dark:text-purple-400 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4 mr-1" /> {t('datingPreferences.labels.selectEducation')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px] max-h-[80vh] rounded-3xl bg-gradient-to-br from-slate-900 to-pink-950 dark:from-gray-950 dark:to-pink-950 border-none shadow-xl overflow-hidden text-white" hideCloseButton>
            {/* Animated background elements - more vibrant for futuristic look */}
            <div className="absolute inset-0 overflow-hidden opacity-40">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700 rounded-full animate-blob blur-2xl mix-blend-overlay"></div>
              <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-gradient-to-tr from-violet-400 to-fuchsia-500 dark:from-violet-600 dark:to-fuchsia-700 rounded-full animate-blob animation-delay-2000 blur-2xl mix-blend-overlay"></div>
              <div className="absolute top-1/3 -left-16 w-48 h-48 bg-gradient-to-tr from-pink-400 to-rose-500 dark:from-pink-600 dark:to-rose-700 rounded-full animate-blob animation-delay-4000 blur-2xl mix-blend-overlay"></div>
            </div>
            
            <div className="relative z-10 backdrop-blur-sm flex flex-col h-full max-h-[70vh]">
              {/* Custom close button - more visible and accessible */}
              <DialogClose asChild>
                <button 
                  className="absolute top-3 right-3 rounded-full w-8 h-8 bg-white/25 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-all shadow-md border border-white/30 z-50 hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            
              <DialogHeader className="pb-0 flex-shrink-0 pt-3">
                <div className="w-12 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mx-auto mb-2 glow-sm"></div>
                <DialogTitle className="text-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-base glow-sm">
                  {t('datingPreferences.labels.selectEducation')}
                </DialogTitle>
              </DialogHeader>
              
              <div className="relative px-2 flex-1 overflow-hidden flex flex-col">
                <p className="text-xs text-center text-gray-300 mb-2 px-2 flex-shrink-0">
                  {t('datingPreferences.descriptions.educationLevelsDescription')}
                </p>
                
                {/* Scrollable container for education options */}
                <div className="relative rounded-2xl p-2 bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner flex-1 overflow-y-auto custom-scrollbar mb-3">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {educationOptions.map((option) => {
                      const isSelected = educationLevel.includes(option.value);
                      return (
                        <Badge 
                          key={option.value}
                          className={`cursor-pointer px-2 py-0.5 transition-all border-0 shadow-sm text-xs rounded-full ${
                            isSelected 
                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md glow-sm" 
                              : "border border-white/5 hover:border-pink-500/30 bg-black/20 backdrop-blur-xl hover:bg-black/30 text-gray-300"
                          }`}
                          onClick={() => {
                            const newEducation = isSelected
                              ? educationLevel.filter(e => e !== option.value)
                              : [...educationLevel, option.value];
                            onChange(newEducation);
                          }}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 mr-0.5 inline-block" />}
                          {option.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Display selected education levels */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-purple-100 dark:border-purple-900/30 p-4 shadow-sm">
        {educationLevel.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {educationLevel.map((eduValue, index) => {
                const eduOption = educationOptions.find(o => o.value === eduValue);
                
                // Different gradients for visual variety
                const gradients = [
                  "from-purple-500 to-pink-500",
                  "from-pink-500 to-rose-500",
                  "from-fuchsia-500 to-purple-500",
                  "from-violet-500 to-purple-500",
                  "from-purple-600 to-violet-600"
                ];
                
                // Pick a gradient based on index (cycle through them)
                const gradientClass = gradients[index % gradients.length];
                
                return (
                  <Badge
                    key={eduValue}
                    className={`bg-gradient-to-r ${gradientClass} hover:shadow-md px-2.5 py-1 text-xs text-white shadow-sm flex-shrink-0 dating-preferences-font transition-all duration-200 border-0 rounded-full`}
                    onClick={() => {
                      const newEducationLevel = educationLevel.filter(e => e !== eduValue);
                      onChange(newEducationLevel);
                    }}
                  >
                    {eduOption ? eduOption.label : eduValue}
                    <X className="h-3 w-3 ml-1 inline-block" />
                  </Badge>
                );
              })}
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
          <p className="text-gray-500 text-sm text-center italic">
            {t('datingPreferences.descriptions.educationLevelsHelper')}
          </p>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mt-2 italic px-1">
        {t('datingPreferences.descriptions.educationLevelsDescription')}
      </div>
    </div>
  );
}