import React from "react";
import { GHANA_TRIBES, TRIBE_GROUPS } from "@/lib/tribes";
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
import { Home, Plus, Check, X } from "lucide-react";

interface TribesDialogProps {
  tribes: string[];
  onChange: (newTribes: string[]) => void;
}

export function TribesDialog({ tribes, onChange }: TribesDialogProps) {
  return (
    <div className="p-4 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-white to-indigo-50/30 dark:from-gray-900 dark:to-indigo-950/10 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Label className="font-semibold flex items-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 text-base">
          <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mr-3 shadow-sm">
            <Home className="h-5 w-5 text-indigo-500" />
          </div>
          Ghanaian Tribes (optional)
        </Label>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 dark:bg-gray-800 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Select Tribes
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px] max-h-[80vh] rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-gray-950 dark:to-indigo-950 border-none shadow-xl overflow-hidden text-white" hideCloseButton>
            {/* Animated background elements - more vibrant for futuristic look */}
            <div className="absolute inset-0 overflow-hidden opacity-40">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-400 to-blue-500 dark:from-indigo-600 dark:to-blue-700 rounded-full animate-blob blur-2xl mix-blend-overlay"></div>
              <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-gradient-to-tr from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700 rounded-full animate-blob animation-delay-2000 blur-2xl mix-blend-overlay"></div>
              <div className="absolute top-1/3 -left-16 w-48 h-48 bg-gradient-to-tr from-blue-400 to-cyan-500 dark:from-blue-600 dark:to-cyan-700 rounded-full animate-blob animation-delay-4000 blur-2xl mix-blend-overlay"></div>
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
                <div className="w-12 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mx-auto mb-2 glow-sm"></div>
                <DialogTitle className="text-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 text-base glow-sm">
                  Select Tribes
                </DialogTitle>
              </DialogHeader>
              
              <div className="relative px-2 flex-1 overflow-hidden flex flex-col">
                <p className="text-xs text-center text-gray-300 mb-2 px-2 flex-shrink-0">
                  Choose the Ghanaian tribes you're interested in connecting with
                </p>
                
                {/* Scrollable container for tribes */}
                <div className="relative rounded-2xl p-2 bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner flex-1 overflow-y-auto custom-scrollbar mb-3">
                  {TRIBE_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3">
                      <h4 className="text-xs font-medium mb-1 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 px-1">
                        {group.label}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {group.options.map((tribe) => {
                          const isSelected = tribes.includes(tribe.value);
                          return (
                            <Badge 
                              key={tribe.value}
                              className={`cursor-pointer px-2 py-0.5 transition-all border-0 shadow-sm text-xs rounded-full ${
                                isSelected 
                                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md glow-sm" 
                                  : "border border-white/5 hover:border-purple-500/30 bg-black/20 backdrop-blur-xl hover:bg-black/30 text-gray-300"
                              }`}
                              onClick={() => {
                                const newTribes = isSelected
                                  ? tribes.filter(t => t !== tribe.value)
                                  : [...tribes, tribe.value];
                                onChange(newTribes);
                              }}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 mr-0.5 inline-block" />}
                              {tribe.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Display selected tribes */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-indigo-100 dark:border-indigo-900/30 p-4 shadow-sm">
        {tribes.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {tribes.map((tribeValue, index) => {
                const tribe = GHANA_TRIBES.find(t => t.value === tribeValue);
                
                // Different gradients for visual variety
                const gradients = [
                  "from-indigo-500 to-blue-500",
                  "from-blue-500 to-cyan-500",
                  "from-cyan-500 to-teal-500",
                  "from-purple-500 to-indigo-500",
                  "from-blue-600 to-indigo-600"
                ];
                
                // Pick a gradient based on index (cycle through them)
                const gradientClass = gradients[index % gradients.length];
                
                return (
                  <Badge
                    key={tribeValue}
                    className={`bg-gradient-to-r ${gradientClass} hover:shadow-md px-2.5 py-1 text-xs text-white shadow-sm flex-shrink-0 dating-preferences-font transition-all duration-200 border-0 rounded-full`}
                    onClick={() => {
                      const newTribes = tribes.filter(t => t !== tribeValue);
                      onChange(newTribes);
                    }}
                  >
                    {tribe ? tribe.label : tribeValue}
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
            Select tribes to find better matches
          </p>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mt-2 italic px-1">
        Select one or more tribes that you're interested in
      </div>
    </div>
  );
}