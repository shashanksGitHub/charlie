import { useState, useRef, useEffect } from 'react';

// Define the hook interface
interface AudioRecorderHook {
  isRecording: boolean;
  recordingDuration: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  isPlaying: boolean;
  playbackProgress: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  playAudio: () => void;
  pauseAudio: () => void;
  resetAudio: () => void;
  formatDuration: (seconds: number) => string;
}

// Export the hook as a named constant for Fast Refresh compatibility
export const useAudioRecorder = (): AudioRecorderHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up resources when the component unmounts
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  // Start recording function
  const startRecording = async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setPlaybackProgress(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create and set up the MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create a blob from all the chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Clear the recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start a timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Cancel recording function
  const cancelRecording = () => {
    // If we're still recording, stop the media recorder
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        
        // Also stop all tracks to ensure microphone is released
        mediaRecorderRef.current.stream?.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (error) {
        console.error("Error stopping media recorder:", error);
      }
    }
    
    // Stop any playing audio
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch (error) {
        console.error("Error cleaning up audio element:", error);
      }
    }
    
    // Reset all state
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    setPlaybackProgress(0);
    
    // Safely revoke any object URLs to prevent memory leaks
    setAudioUrl(prev => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch (error) {
          console.error("Error revoking object URL:", error);
        }
      }
      return null;
    });
    
    // Clear all timers
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };
  
  // Play audio function
  const playAudio = () => {
    if (!audioUrl) return;
    
    try {
      if (!audioRef.current) {
        // Create a new audio element
        const audio = new Audio();
        
        // Setup event handlers before setting src
        audio.onended = () => {
          setIsPlaying(false);
          setPlaybackProgress(0);
          
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
        };
        
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
        };
        
        // Now set the source and assign to ref
        audio.src = audioUrl;
        audioRef.current = audio;
      } else if (audioRef.current.src !== audioUrl) {
        // If URL has changed, update the source
        audioRef.current.src = audioUrl;
      }
      
      // Play the audio with promise-based error handling
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            
            // Start a timer to update playback progress
            const interval = setInterval(() => {
              if (audioRef.current) {
                const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                setPlaybackProgress(progress);
              }
            }, 100);
            
            if (playbackTimerRef.current) {
              clearInterval(playbackTimerRef.current);
            }
            playbackTimerRef.current = interval;
          })
          .catch(error => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
          });
      }
    } catch (error) {
      console.error("Unexpected audio playback error:", error);
      setIsPlaying(false);
    }
  };
  
  // Pause audio function
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      
      // Clear the playback timer
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }
  };
  
  // Reset audio function
  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsPlaying(false);
    setPlaybackProgress(0);
    
    // Clear the playback timer
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };
  
  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return {
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
    resetAudio,
    formatDuration
  };
}