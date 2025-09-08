import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Camera, X, Video, StopCircle, Image, 
  FlipHorizontal, CameraIcon, Sparkles, 
  Aperture, Hexagon, Maximize2, Minimize2
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (blob: Blob, type: "image" | "video") => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const { translate } = useLanguage();
  const [activeMode, setActiveMode] = useState<"photo" | "video">("photo");
  const [isCameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string;
    blob: Blob | null;
    type: "image" | "video";
  } | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [overlayEffect, setOverlayEffect] = useState<"none" | "grid" | "focus">("none");
  
  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get camera access on mount
  useEffect(() => {
    // Load available camera devices
    const loadDevices = async () => {
      try {
        // Need to request permissions first to see devices
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDeviceList(videoDevices);
        
        // Set first device as default
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error enumerating devices:", error);
        setErrorMessage("Could not access camera devices. Please check your permissions.");
      }
    };
    
    loadDevices();
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera when device is selected
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Start new stream with selected device
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode
          },
          audio: activeMode === "video"
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
          setErrorMessage(null);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setCameraReady(false);
        setErrorMessage("Could not access camera. Please check your permissions.");
      }
    };
    
    startCamera();
  }, [selectedDeviceId, activeMode, facingMode]);
  
  // Toggle facing mode (front/back camera)
  const toggleFacingMode = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };
  
  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Handle overlay effect change
  const toggleOverlayEffect = () => {
    setOverlayEffect(prev => {
      if (prev === "none") return "grid";
      if (prev === "grid") return "focus";
      return "none";
    });
  };

  // Handle camera mode change
  const handleModeChange = (mode: "photo" | "video") => {
    if (isRecording) return; // Don't switch while recording
    
    // Restart camera with new mode
    setActiveMode(mode);
    if (capturedMedia) {
      setCapturedMedia(null);
    }
  };

  // Handle device change
  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(event.target.value);
  };

  // Take photo
  const takePhoto = () => {
    if (countdown !== null) return; // Already counting down
    
    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture photo after countdown
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedMedia({
            url,
            blob,
            type: "image"
          });
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error("Error capturing photo:", error);
      setErrorMessage("Failed to capture photo.");
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Start video recording
  const startRecording = () => {
    if (!streamRef.current || isRecording || !videoRef.current) return;
    
    try {
      // Reset recording time
      setRecordingTime(0);
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCapturedMedia({
          url,
          blob,
          type: "video"
        });
        setIsRecording(false);
        
        // Clear timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start(1000); // Save a chunk every second
      setIsRecording(true);
      setErrorMessage(null);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Failed to start recording.");
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Send the captured media
  const handleSendMedia = () => {
    if (capturedMedia?.blob) {
      onCapture(capturedMedia.blob, capturedMedia.type);
    }
  };

  // Retake photo or video
  const handleRetake = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "w-full max-w-3xl mx-auto overflow-hidden transition-all duration-300",
        isDarkMode 
          ? "bg-gray-900/95 border border-gray-800/50 shadow-xl shadow-purple-900/20 rounded-xl" 
          : "bg-gray-50/95 border border-gray-200/50 shadow-xl shadow-purple-500/10 rounded-xl",
        isFullscreen ? "max-w-none rounded-none" : ""
      )}
    >
      {/* Header with gradient border */}
      <div className={cn(
        "px-4 py-3 flex justify-between items-center border-b relative",
        isDarkMode 
          ? "border-gray-800/70 bg-gray-900/80" 
          : "border-gray-200/70 bg-gray-100/80"
      )}>
        {/* Gradient border effect */}
        <div className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        
        <h2 className={cn(
          "text-lg font-medium flex items-center",
          isDarkMode ? "text-gray-100" : "text-gray-800"
        )}>
          <Aperture className={cn(
            "mr-2 h-5 w-5",
            isDarkMode ? "text-purple-400" : "text-purple-500"
          )} />
          {activeMode === "photo" 
            ? translate("chat.captureImage") 
            : translate("chat.captureVideo")}
        </h2>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFullscreen}
            className={cn(
              "p-2 rounded-full hover:bg-gray-200/20 transition-colors",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className={cn(
              "p-2 rounded-full hover:bg-gray-200/20 transition-colors",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
      
      {errorMessage && (
        <div className={cn(
          "p-3 text-sm flex items-center border-b",
          isDarkMode 
            ? "bg-red-900/20 text-red-400 border-red-900/30" 
            : "bg-red-100/90 text-red-700 border-red-200/50"
        )}>
          <Hexagon className="h-4 w-4 mr-2 text-red-500" />
          {errorMessage}
        </div>
      )}
      
      <Tabs defaultValue="photo" value={activeMode} onValueChange={(v) => handleModeChange(v as "photo" | "video")} className="h-full">
        <div className={cn(
          "px-4 py-3 border-b",
          isDarkMode 
            ? "border-gray-800/70 bg-gray-900/40" 
            : "border-gray-200/70 bg-gray-100/40"
        )}>
          <TabsList className={cn(
            "w-full h-10 p-1 rounded-full",
            isDarkMode 
              ? "bg-gray-800/90 border border-gray-700/60" 
              : "bg-gray-200/80 border border-gray-300/30"
          )}>
            <TabsTrigger 
              value="photo" 
              disabled={isRecording} 
              className={cn(
                "flex-1 h-full rounded-full data-[state=active]:shadow-md transition-all duration-300 border",
                isDarkMode 
                  ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-700 data-[state=active]:to-purple-700 data-[state=active]:border-indigo-600/40 data-[state=active]:text-white hover:text-gray-200 border-transparent"
                  : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:border-indigo-400/30 hover:text-gray-700 border-transparent"
              )}
            >
              <Camera className="h-4 w-4 mr-2" />
              {translate("chat.photo")}
            </TabsTrigger>
            <TabsTrigger 
              value="video" 
              disabled={isRecording} 
              className={cn(
                "flex-1 h-full rounded-full data-[state=active]:shadow-md transition-all duration-300 border",
                isDarkMode 
                  ? "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-700 data-[state=active]:to-orange-700 data-[state=active]:border-pink-600/40 data-[state=active]:text-white hover:text-gray-200 border-transparent"
                  : "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:border-pink-400/30 hover:text-gray-700 border-transparent"
              )}
            >
              <Video className="h-4 w-4 mr-2" />
              {translate("chat.video")}
            </TabsTrigger>
          </TabsList>
        </div>
        
        {deviceList.length > 1 && (
          <div className={cn(
            "p-3 flex items-center gap-2 border-b",
            isDarkMode 
              ? "border-gray-800/70 bg-gray-900/70" 
              : "border-gray-200/50 bg-white/50"
          )}>
            <FlipHorizontal className={cn(
              "h-4 w-4 flex-shrink-0",
              isDarkMode ? "text-purple-400" : "text-purple-500"
            )} />
            <select 
              className={cn(
                "flex-grow p-2 rounded-md border focus:outline-none focus:ring-2 transition-all",
                isDarkMode 
                  ? "bg-gray-800 text-gray-200 border-gray-700/70 focus:ring-purple-500/30 focus:border-purple-500/50" 
                  : "bg-white text-gray-800 border-gray-200/70 focus:ring-purple-500/20 focus:border-purple-500/40"
              )}
              value={selectedDeviceId || ''}
              onChange={handleDeviceChange}
              disabled={isRecording}
            >
              {deviceList.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${deviceList.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="relative">
          {/* Main camera preview area */}
          <div className={cn(
            "relative aspect-[16/9] overflow-hidden",
            !isFullscreen && (
              isDarkMode 
                ? "border-x border-gray-800/50" 
                : "border-x border-gray-200/50"
            )
          )}>
            {/* Video preview */}
            {!capturedMedia ? (
              <div className="relative w-full h-full">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                
                {/* Camera overlay effects */}
                <div className={cn(
                  "absolute inset-0 pointer-events-none",
                  overlayEffect === "none" ? "opacity-0" : "opacity-100",
                  "transition-opacity duration-300"
                )}>
                  {overlayEffect === "grid" && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
                      <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="border border-white/20" />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {overlayEffect === "focus" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[300px] h-[300px] rounded-full border-2 border-purple-500/40 flex items-center justify-center">
                        <div className="w-[150px] h-[150px] rounded-full border border-purple-500/60" />
                      </div>
                      <div className="absolute top-1/2 w-full h-[1px] bg-white/20" />
                      <div className="absolute left-1/2 w-[1px] h-full bg-white/20" />
                    </div>
                  )}
                </div>
                
                {/* Countdown overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"
                    >
                      <motion.div
                        key={countdown}
                        initial={{ scale: 2, opacity: 0.3 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.8, type: "spring" }}
                        className="relative"
                      >
                        <div className="absolute -inset-10 rounded-full bg-purple-500/10 blur-2xl animate-pulse" />
                        <span className="text-7xl text-white font-bold relative">{countdown}</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Recording indicator */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute top-3 left-3 flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-red-500/30"
                    >
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <div className="absolute -inset-1 rounded-full bg-red-500/30 animate-ping opacity-75"></div>
                      </div>
                      <span className="text-sm text-white font-medium">{formatRecordingTime(recordingTime)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Camera controls */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleFacingMode}
                    disabled={isRecording}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border shadow-md",
                      isDarkMode 
                        ? "bg-gray-900/70 border-gray-700/50 hover:bg-gray-800/70 text-gray-300 shadow-black/30" 
                        : "bg-white/70 border-gray-200/50 hover:bg-gray-50/70 text-gray-700 shadow-black/10",
                      isRecording && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <FlipHorizontal className="h-5 w-5" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleOverlayEffect}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border shadow-md",
                      isDarkMode 
                        ? "bg-gray-900/70 border-gray-700/50 hover:bg-gray-800/70 shadow-black/30" 
                        : "bg-white/70 border-gray-200/50 hover:bg-gray-50/70 shadow-black/10",
                      overlayEffect !== "none"
                        ? isDarkMode 
                          ? "text-purple-400 border-purple-600/40" 
                          : "text-purple-600 border-purple-400/40"
                        : isDarkMode
                          ? "text-gray-300" 
                          : "text-gray-700"
                    )}
                  >
                    {overlayEffect === "none" && <Sparkles className="h-5 w-5" />}
                    {overlayEffect === "grid" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 3H3V9H9V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 3H15V9H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 15H15V21H21V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 15H3V21H9V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>}
                    {overlayEffect === "focus" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>}
                  </motion.button>
                </div>
              </div>
            ) : (
              // Captured media preview
              <div className="relative w-full h-full bg-black">
                {/* Background gradient for captured media */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20" />
                
                {capturedMedia.type === "image" ? (
                  <>
                    <img 
                      src={capturedMedia.url} 
                      alt="Captured" 
                      className="w-full h-full object-contain relative z-10"
                    />
                    {/* Decorative corner elements */}
                    <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-purple-500/60" />
                    <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-purple-500/60" />
                    <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-purple-500/60" />
                    <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-purple-500/60" />
                  </>
                ) : (
                  <>
                    <video 
                      src={capturedMedia.url} 
                      controls 
                      className="w-full h-full object-contain relative z-10"
                    />
                    {/* Video player decorative elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Canvas for photo capturing (hidden) */}
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          {/* Camera controls bar */}
          <div className={cn(
            "p-4 flex justify-center items-center",
            isDarkMode 
              ? "bg-gray-900/90 border-t border-gray-800/70" 
              : "bg-gray-50/90 border-t border-gray-200/60"
          )}>
            {!capturedMedia ? (
              activeMode === "photo" ? (
                <div className="flex items-center justify-center space-x-4">
                  {/* Photo capture button */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={takePhoto} 
                      disabled={!isCameraReady || countdown !== null}
                      className={cn(
                        "h-14 w-14 rounded-full p-0 relative overflow-hidden",
                        isDarkMode
                          ? "bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-indigo-500/30 hover:from-indigo-700 hover:to-purple-800"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-indigo-400/30 hover:from-indigo-600 hover:to-purple-700"
                      )}
                    >
                      {/* Inner circle effect */}
                      <div className="absolute inset-1.5 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full border-2 border-white/80" />
                      </div>
                      
                      {/* Glowing effect */}
                      {isCameraReady && (
                        <motion.div 
                          className="absolute inset-0 rounded-full bg-purple-500/20 blur-md"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </Button>
                  </motion.div>
                </div>
              ) : (
                isRecording ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={stopRecording}
                      className={cn(
                        "h-14 px-6 rounded-full relative overflow-hidden",
                        "bg-gradient-to-br from-red-600 to-orange-600 border-2 border-red-500/30 hover:from-red-700 hover:to-orange-700"
                      )}
                    >
                      <StopCircle className="h-5 w-5 mr-2" />
                      {translate("chat.stopRecording")}
                      
                      {/* Pulsing recording indicator */}
                      <motion.div 
                        className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={startRecording} 
                      disabled={!isCameraReady}
                      className={cn(
                        "h-14 w-14 rounded-full p-0 relative overflow-hidden",
                        isDarkMode
                          ? "bg-gradient-to-br from-pink-600 to-red-700 border-2 border-pink-500/30 hover:from-pink-700 hover:to-red-800"
                          : "bg-gradient-to-br from-pink-500 to-red-600 border-2 border-pink-400/30 hover:from-pink-600 hover:to-red-700"
                      )}
                    >
                      {/* Inner circle effect */}
                      <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-5 h-5 rounded-sm bg-red-500/90" />
                      </div>
                      
                      {/* Glowing effect */}
                      {isCameraReady && (
                        <motion.div 
                          className="absolute inset-0 rounded-full bg-red-500/20 blur-md"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </Button>
                  </motion.div>
                )
              )
            ) : (
              <div className="flex items-center justify-center space-x-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={handleRetake}
                    className={cn(
                      "h-12 px-5 rounded-full border-2 shadow-md",
                      isDarkMode
                        ? "bg-gray-800/80 border-gray-700/60 text-gray-200 hover:bg-gray-700/80"
                        : "bg-white/80 border-gray-200/60 text-gray-700 hover:bg-gray-50/80"
                    )}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {translate("chat.retake")}
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={handleSendMedia}
                    className={cn(
                      "h-12 px-5 rounded-full shadow-md",
                      capturedMedia.type === "image" 
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-2 border-indigo-400/30"
                        : "bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 border-2 border-pink-400/30"
                    )}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    {translate("chat.send")}
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </motion.div>
  );
}