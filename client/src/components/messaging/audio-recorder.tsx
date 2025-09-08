import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Square, Trash2, Pause, Play, Send, Mic, Volume2, Sparkles } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface AudioRecorderProps {
  onSend: (blob: Blob, duration: number, url: string) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const {
    isRecording,
    recordingDuration,
    audioUrl,
    audioBlob,
    isPlaying,
    playbackProgress,
    startRecording,
    stopRecording,
    cancelRecording,
    playAudio,
    pauseAudio,
    formatDuration
  } = useAudioRecorder();

  // Generate visualizer bars for animation
  const [visualizerValues, setVisualizerValues] = useState<number[]>(
    Array.from({ length: 30 }, () => Math.random() * 60 + 5)
  );
  
  const visualizerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start recording immediately when component mounts
  useEffect(() => {
    startRecording();
    
    // Animate visualizer during recording
    if (isRecording && !visualizerRef.current) {
      visualizerRef.current = setInterval(() => {
        setVisualizerValues(
          Array.from({ length: 30 }, () => Math.random() * 60 + 5)
        );
      }, 100);
    }
    
    return () => {
      if (visualizerRef.current) {
        clearInterval(visualizerRef.current);
        visualizerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Update visualizer based on recording state
  useEffect(() => {
    if (isRecording && !visualizerRef.current) {
      visualizerRef.current = setInterval(() => {
        setVisualizerValues(
          Array.from({ length: 30 }, () => Math.random() * 60 + 5)
        );
      }, 100);
    } else if (!isRecording && visualizerRef.current) {
      clearInterval(visualizerRef.current);
      visualizerRef.current = null;
      
      // Reset visualizer to calm state
      setVisualizerValues(
        Array.from({ length: 30 }, () => Math.random() * 20 + 5)
      );
    }
    
    return () => {
      if (visualizerRef.current) {
        clearInterval(visualizerRef.current);
        visualizerRef.current = null;
      }
    };
  }, [isRecording]);
  
  // Handle send button click
  const handleSend = () => {
    if (audioBlob && audioUrl) {
      onSend(audioBlob, recordingDuration, audioUrl);
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  // Dark mode detection (simplified assumption)
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return (
    <AnimatePresence>
      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {isRecording ? (
          /* Futuristic recording interface */
          <div className={cn(
            "rounded-xl relative overflow-hidden",
            "transition-all duration-300 py-2 px-3",
            isDarkMode 
              ? "bg-gray-900/70 border border-gray-800/70 shadow-lg shadow-purple-900/10"
              : "bg-white/70 border border-gray-200/50 shadow-lg shadow-purple-500/5"
          )}>
            {/* Visualizer */}
            <div className="absolute inset-0 flex items-center justify-center z-0 overflow-hidden opacity-30">
              <div className="flex items-end justify-center h-20 gap-[1px] w-full">
                {visualizerValues.map((height, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className={cn(
                      "w-1 rounded-full",
                      isDarkMode 
                        ? "bg-gradient-to-t from-red-500/70 via-purple-500/70 to-indigo-500/70"
                        : "bg-gradient-to-t from-red-400/70 via-purple-400/70 to-indigo-400/70"
                    )}
                  />
                ))}
              </div>
            </div>
            
            {/* Main UI Layer */}
            <div className="relative z-10 flex flex-col space-y-3">
              {/* Recording indicator and timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-red-500"
                    />
                    <div className="absolute w-5 h-5 rounded-full bg-red-500/20 animate-ping" />
                  </div>
                  <motion.span 
                    animate={{ opacity: [1, 0.8, 1] }} 
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`text-sm font-medium ${isDarkMode ? "text-red-400" : "text-red-500"}`}
                  >
                    Recording
                  </motion.span>
                </div>
                
                <div className={`text-lg font-semibold tracking-wider ${
                  isDarkMode ? "text-gray-100" : "text-gray-700"
                }`}>
                  {formatDuration(recordingDuration)}
                </div>
              </div>
              
              {/* Futuristic waveform placeholder */}
              <div className="h-12 relative rounded-lg overflow-hidden mx-3 my-1">
                <div className={cn(
                  "absolute inset-0 opacity-10 rounded-lg",
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                )} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      opacity: [0.7, 1, 0.7],
                      scale: [0.99, 1.01, 0.99] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center justify-center"
                  >
                    <Mic className={`h-5 w-5 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
                    <span className={`ml-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Voice being captured
                    </span>
                  </motion.div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancel}
                  className={cn(
                    "h-9 px-4 rounded-full transition-all border",
                    isDarkMode
                      ? "bg-gray-800/80 hover:bg-gray-700 text-gray-200 border-gray-700/70"
                      : "bg-gray-100/80 hover:bg-gray-200 text-gray-700 border-gray-200/70"
                  )}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={stopRecording}
                    className={cn(
                      "h-9 rounded-full shadow-md border bg-gradient-to-r",
                      isDarkMode
                        ? "from-red-600 to-red-700 text-white border-red-500/30 shadow-red-500/20"
                        : "from-red-500 to-red-600 text-white border-red-400/30 shadow-red-400/20"
                    )}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        ) : audioUrl ? (
          /* Futuristic playback interface */
          <div className={cn(
            "rounded-xl relative overflow-hidden",
            "transition-all duration-300 py-3 px-4",
            isDarkMode
              ? "bg-gradient-to-r from-gray-900/70 to-gray-900/70 border border-indigo-900/20 shadow-lg shadow-indigo-900/5"
              : "bg-gradient-to-r from-white/70 to-white/70 border border-indigo-100/30 shadow-lg shadow-indigo-500/5"
          )}>
            {/* Background glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 z-0 blur-xl opacity-50" />
            
            {/* Top section with playback controls and duration */}
            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={isPlaying ? pauseAudio : playAudio}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all border",
                    isPlaying
                      ? isDarkMode
                        ? "bg-gradient-to-br from-indigo-600 to-purple-700 border-indigo-500/30 shadow-indigo-500/20"
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/30 shadow-indigo-400/20"
                      : isDarkMode
                        ? "bg-gradient-to-br from-purple-600 to-indigo-700 border-purple-500/30 shadow-purple-500/20"
                        : "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400/30 shadow-purple-400/20"
                  )}
                >
                  {isPlaying ? 
                    <Pause className="h-4 w-4 text-white" /> : 
                    <Play className="h-4 w-4 ml-0.5 text-white" />
                  }
                  {isPlaying && (
                    <motion.div 
                      animate={{ opacity: [0.8, 0.3, 0.8] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-indigo-400/20 blur-sm"
                    />
                  )}
                </motion.button>
                
                <div className="ml-3">
                  <div className="flex items-center">
                    <Volume2 className={`h-3.5 w-3.5 ${
                      isDarkMode ? "text-indigo-300" : "text-indigo-500"
                    }`} />
                    <span className={`ml-1.5 text-sm font-semibold ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}>
                      Audio Message
                    </span>
                  </div>
                  <span className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {formatDuration(recordingDuration)} total length
                  </span>
                </div>
              </div>
              
              {/* Playback indicators */}
              <div className={`flex items-center justify-center rounded-full w-8 h-8 ${
                isPlaying 
                  ? isDarkMode ? "bg-indigo-900/30" : "bg-indigo-100/50" 
                  : ""
              }`}>
                {isPlaying && (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className={`h-4 w-4 ${
                      isDarkMode ? "text-indigo-300" : "text-indigo-500"
                    }`} />
                  </motion.div>
                )}
              </div>
            </div>
            
            {/* Enhanced playback progress */}
            <div className="relative z-10 mb-3">
              <div className="relative">
                <Progress 
                  value={playbackProgress} 
                  className={cn(
                    "h-2 rounded-full",
                    isDarkMode ? "bg-gray-800/90" : "bg-gray-200/90"
                  )}
                  indicatorClassName={cn(
                    "bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all",
                  )}
                />
                
                {/* Playback handle */}
                <motion.div 
                  className="absolute top-0 rounded-full w-4 h-4 bg-white border-2 border-indigo-500 shadow-md z-20 -mt-1"
                  style={{ 
                    left: `calc(${playbackProgress}% - 8px)` 
                  }}
                  animate={{
                    scale: isPlaying ? [1, 1.05, 1] : 1
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="relative z-10 flex items-center justify-end space-x-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className={cn(
                  "h-9 rounded-full px-3 transition-colors border",
                  isDarkMode
                    ? "bg-gray-800/70 hover:bg-gray-700/90 text-gray-300 border-gray-700/50"
                    : "bg-gray-200/70 hover:bg-gray-300/70 text-gray-700 border-gray-200/50"
                )}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Discard
              </Button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleSend}
                  className="h-9 rounded-full px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-none shadow-md shadow-purple-500/20"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Send Audio
                </Button>
              </motion.div>
            </div>
          </div>
        ) : (
          /* Loading state */
          <div className="flex flex-col items-center justify-center h-20">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotateZ: [0, 180, 360] 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "linear" 
              }}
            >
              <Mic className="h-6 w-6 text-purple-500" />
            </motion.div>
            <span className="mt-2 text-xs text-gray-500">Initializing audio...</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}