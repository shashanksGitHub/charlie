import { useState, useRef, useEffect } from 'react';
import { Pause, Play, Volume2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAppMode } from '@/hooks/use-app-mode';
import { motion } from 'framer-motion';

interface AudioMessageProps {
  audioUrl: string;
  audioDuration: number;
  messageId?: number;
  className?: string;
  isOutgoing?: boolean;
}

export function AudioMessage({ audioUrl, audioDuration, messageId, className, isOutgoing = false }: AudioMessageProps) {
  const { currentMode } = useAppMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actualAudioUrl, setActualAudioUrl] = useState(audioUrl);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  
  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // Try to retrieve the cached audio URL
  useEffect(() => {
    // If the audioUrl is already a valid data URL, use it directly
    if (audioUrl && audioUrl.startsWith('data:audio/') && audioUrl.length > 100) {
      console.log('Using provided data URL directly');
      setActualAudioUrl(audioUrl);
      return;
    }
    
    // If messageId is provided, try to retrieve cached audio
    if (messageId) {
      try {
        // Try multiple storage formats to find the audio data
        
        // First check the standard audio message format
        const cachedAudio = localStorage.getItem(`${currentMode}_audio_message_${messageId}`);
        if (cachedAudio && cachedAudio.length > 100) {  // Only use if it's a substantial data URL
          console.log(`Found cached audio for message ${messageId}`);
          setActualAudioUrl(cachedAudio);
          return;
        }
        
        // Next check the audio data format (which contains the base64 data)
        const cachedAudioData = localStorage.getItem(`${currentMode}_audio_data_${messageId}`);
        if (cachedAudioData && cachedAudioData.startsWith('data:audio/')) {
          console.log(`Found cached audio data for message ${messageId}`);
          setActualAudioUrl(cachedAudioData);
          return;
        }
        
        // For audio messages with blob URL or placeholder URL, try to find in temporary storage
        if (!audioUrl.startsWith('data:') || audioUrl.length < 50) {
          console.log('Searching for cached audio in localStorage');
          
          // Look for any keys that might have our audio data
          const possibleKeys = [
            `${currentMode}_audio_message_${messageId}`,
            `${currentMode}_audio_data_${messageId}`,
            `MEET_audio_message_${messageId}`,  // Try without current mode
            `HEAT_audio_message_${messageId}`,  // Try other app modes
            `SUITE_audio_message_${messageId}`
          ];
          
          // Try each possible key
          for (const key of possibleKeys) {
            const value = localStorage.getItem(key);
            if (value && value.startsWith('data:audio/')) {
              console.log(`Found audio data in key ${key}`);
              setActualAudioUrl(value);
              return;
            }
          }
          
          // If still not found, try broader search
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('audio_message_') || key.includes('audio_data_'))) {
              const value = localStorage.getItem(key);
              if (value && value.startsWith('data:audio/')) {
                console.log(`Found potential cached audio in key ${key}`);
                setActualAudioUrl(value);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error retrieving cached audio:", error);
      }
    }
  }, [messageId, audioUrl, currentMode]);
  
  // Create audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      
      // Set up event listeners before setting src to avoid race conditions
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        

      };
      
      audio.onloadedmetadata = () => {
        setIsLoaded(true);
        setIsLoading(false);
        console.log(`Audio loaded: duration=${audio.duration}s`);
      };
      
      audio.onloadeddata = () => {
        setIsLoaded(true);
        setIsLoading(false);
        console.log("Audio data loaded");
      };
      
      audio.oncanplaythrough = () => {
        setIsLoaded(true);
        setIsLoading(false);
        console.log("Audio can play through");
      };
      
      audio.onerror = (e) => {
        console.error("Error loading audio:", e);
        setIsLoaded(false);
        setIsLoading(false);
        
        // If the audio fails to load, try using the original URL
        if (actualAudioUrl !== audioUrl) {
          console.log("Falling back to original audio URL");
          setActualAudioUrl(audioUrl);
        } else {
          // If we're already using the original URL and it failed,
          // try one last attempt at finding any audio data in localStorage
          if (messageId) {
            console.log("Attempting emergency audio recovery for message", messageId);
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.includes('audio_message_')) {
                const value = localStorage.getItem(key);
                if (value && value.startsWith('data:audio/')) {
                  console.log(`Emergency audio recovery - found potential audio data in key ${key}`);
                  setActualAudioUrl(value);
                  break;
                }
              }
            }
          }
        }
      };
      
      // Now set src and load the audio
      audio.src = actualAudioUrl;
      audio.load();
      
      audioRef.current = audio;
    } else if (audioRef.current.src !== actualAudioUrl) {
      // Handle case when audio element exists but URL changed
      console.log("Audio URL changed, updating source");
      audioRef.current.src = actualAudioUrl;
      audioRef.current.load();
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      

    };
  }, [actualAudioUrl, messageId, audioUrl]);
  
  const togglePlayback = async () => {
    if (!audioRef.current) {
      console.log("No audio element available");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      

    } else {
      console.log("Attempting to play audio, current state:", {
        isLoaded,
        readyState: audioRef.current.readyState,
        src: audioRef.current.src,
        duration: audioRef.current.duration
      });

      // Make sure we're using the correct source
      if (audioRef.current.src !== actualAudioUrl) {
        console.log("Setting audio source:", actualAudioUrl);
        audioRef.current.src = actualAudioUrl;
        audioRef.current.load();
      }
      
      // Wait for audio to be ready if it's not loaded yet
      if (audioRef.current.readyState < 2) {
        console.log("Audio not ready, waiting for loading...");
        setIsLoading(true);
        
        // Create a promise that resolves when audio is ready to play
        const waitForReady = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            setIsLoading(false);
            reject(new Error("Audio loading timeout"));
          }, 5000); // 5 second timeout
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            setIsLoading(false);
            resolve();
          };
          
          const onError = (e: Event) => {
            clearTimeout(timeout);
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            setIsLoading(false);
            reject(e);
          };
          
          audioRef.current?.addEventListener('canplay', onCanPlay);
          audioRef.current?.addEventListener('error', onError);
        });
        
        try {
          await waitForReady;
          console.log("Audio is now ready to play");
        } catch (error) {
          console.error("Error waiting for audio to load:", error);
          return;
        }
      }
      
      // Now try to play the audio
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          
          console.log("Audio started playing successfully");
          setIsPlaying(true);
          
          // Start progress tracking
          const interval = setInterval(() => {
            if (audioRef.current) {
              const current = audioRef.current.currentTime;
              const duration = audioRef.current.duration || audioDuration;
              const progressPercentage = (current / duration) * 100;
              
              setProgress(progressPercentage);
              setCurrentTime(current);
            }
          }, 100);
          
          progressIntervalRef.current = interval;
        }
      } catch (error) {
        console.error("Error playing audio:", error);
        // Try reloading the audio and playing again
        audioRef.current.load();
        setTimeout(async () => {
          try {
            const retryPromise = audioRef.current?.play();
            if (retryPromise) {
              await retryPromise;
              setIsPlaying(true);
            }
          } catch (retryError) {
            console.error("Retry play failed:", retryError);
          }
        }, 500);
      }
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  

  
  return (
    <motion.div 
      initial={{ opacity: 0.8, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl p-4 w-full backdrop-blur-sm bg-opacity-20 transition-all",
        isOutgoing 
          ? "max-w-[60vw] sm:max-w-[65vw] md:max-w-[70vw] min-w-[240px]" 
          : "max-w-[70vw] min-w-[260px]",
        isOutgoing 
          ? "bg-transparent border border-purple-300/10" 
          : "bg-transparent border border-gray-300/10",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2 relative">
        <div className="flex items-center">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={togglePlayback}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-md",
              isPlaying 
                ? "shadow-purple-500/20"
                : "shadow-blue-500/10",
              isOutgoing 
                ? isPlaying
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white border border-purple-400/30" 
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-400/30"
                : isPlaying
                  ? isDarkMode
                    ? "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100 border border-gray-600/30"
                    : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 border border-gray-200/50"
                  : isDarkMode
                    ? "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100 border border-gray-700/30"
                    : "bg-gradient-to-br from-gray-100 to-white text-gray-700 border border-gray-200/50"
            )}
          >
            {isLoading ? 
              <Loader2 className="h-4 w-4 animate-spin" /> :
              isPlaying ? 
                <Pause className="h-4 w-4" /> : 
                <Play className="h-4 w-4 ml-0.5" />
            }
            {isPlaying && (
              <motion.div 
                animate={{ opacity: [0.5, 0.3, 0.5] }} 
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-purple-400/10"
              />
            )}
          </motion.button>
          
          <div className="ml-2 flex flex-col">
            <span className={`text-xs ${
              isOutgoing 
                ? isDarkMode ? 'text-purple-300/70' : 'text-purple-500/70'
                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {formatTime(audioDuration)}
            </span>
          </div>
        </div>
        
        <Volume2 className={`h-3.5 w-3.5 opacity-60 ${
          isOutgoing 
            ? isDarkMode ? 'text-purple-200' : 'text-purple-600'
            : isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`} />
      </div>
      

      
      {/* Playback progress */}
      <div className="mt-2">
        <Progress 
          value={progress} 
          className={cn(
            "h-1.5 rounded-full",
            isDarkMode ? "bg-gray-700/50" : "bg-gray-200/70"
          )}
          indicatorClassName={cn(
            "rounded-full transition-all",
            isOutgoing 
              ? "bg-gradient-to-r from-purple-500 to-indigo-500" 
              : isDarkMode ? "bg-gray-400" : "bg-gray-500"
          )}
        />
      </div>
    </motion.div>
  );
}