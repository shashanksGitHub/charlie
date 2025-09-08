import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Send, Camera, Video, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SimpleCameraCaptureProps {
  onCapture: (blob: Blob, type: "image" | "video") => void;
  onCancel: () => void;
}

export function SimpleCameraCapture({ onCapture, onCancel }: SimpleCameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string;
    blob: Blob;
    type: "image" | "video";
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [holdStartTime, setHoldStartTime] = useState<number | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera with device selection
  const initializeCamera = useCallback(async () => {
    try {
      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log("Available video devices:", videoDevices);
      
      // Filter out virtual cameras and camera software
      const physicalCameras = videoDevices.filter(device => {
        const label = device.label.toLowerCase();
        return !label.includes('obs') && 
               !label.includes('virtual') && 
               !label.includes('screen') &&
               !label.includes('capture') &&
               !label.includes('imaging edge') &&
               !label.includes('ecamm') &&
               !label.includes('streamlabs') &&
               !label.includes('wirecast') &&
               !label.includes('manycam') &&
               !label.includes('camtasia') &&
               !label.includes('snapcamera') &&
               !label.includes('mmhmm') &&
               !label.includes('camo') &&
               !label.includes('reincubate') &&
               !label.includes('nvidia broadcast');
      });
      
      console.log("Physical cameras found:", physicalCameras);
      
      let constraints: MediaStreamConstraints;
      
      if (physicalCameras.length > 0) {
        // Use specific device ID to avoid OBS
        let selectedDevice;
        if (facingMode === "user") {
          // Try to find front camera
          selectedDevice = physicalCameras.find(device => 
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user') ||
            device.label.toLowerCase().includes('facetime')
          ) || physicalCameras[0];
        } else {
          // Try to find back camera
          selectedDevice = physicalCameras.find(device => 
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          ) || physicalCameras[physicalCameras.length - 1];
        }
        
        constraints = {
          video: {
            deviceId: { exact: selectedDevice.deviceId },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: true
        };
        
        console.log("Using specific camera:", selectedDevice.label);
      } else {
        // Fallback to facingMode if no physical cameras detected
        constraints = {
          video: {
            facingMode,
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 }
          },
          audio: true
        };
        
        console.log("Using facingMode fallback:", facingMode);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      console.log("Camera initialized successfully");
    } catch (error) {
      console.error("Camera access error:", error);
      
      // Try fallback without device restrictions
      try {
        const fallbackConstraints = {
          video: {
            facingMode,
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 }
          },
          audio: true
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        
        console.log("Camera initialized with fallback constraints");
      } catch (fallbackError) {
        console.error("Fallback camera access failed:", fallbackError);
      }
    }
  }, [facingMode]);

  // Switch camera
  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedMedia({ url, blob, type: "image" });
      }
    }, "image/jpeg", 0.9);
  };

  // Start video recording
  const startRecording = () => {
    console.log("startRecording called, stream available:", !!stream);
    if (!stream) {
      console.error("No stream available for recording");
      return;
    }

    recordedChunksRef.current = [];
    
    try {
      // Check supported MIME types
      const supportedTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8", 
        "video/webm",
        "video/mp4"
      ];
      
      let selectedType = "video/webm";
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          console.log("Using MIME type:", selectedType);
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedType
      });
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available event, size:", event.data.size);
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("Recording stopped, chunks:", recordedChunksRef.current.length);
        const blob = new Blob(recordedChunksRef.current, { type: selectedType });
        console.log("Created blob, size:", blob.size);
        const url = URL.createObjectURL(blob);
        setCapturedMedia({ url, blob, type: "video" });
        setIsRecording(false);
        setRecordingTime(0);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };
      
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      console.log("Recording started successfully");
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Handle mouse/touch events for click-and-hold
  const handleCaptureStart = () => {
    console.log("Capture start - setting hold state");
    setIsHolding(true);
    setHoldStartTime(Date.now());
    
    // Start hold timeout for video recording (500ms)
    holdTimeoutRef.current = setTimeout(() => {
      console.log("Hold timeout reached - starting video recording");
      startRecording();
    }, 500);
  };

  const handleCaptureEnd = () => {
    console.log("Capture end - clearing hold state");
    setIsHolding(false);
    const holdDuration = holdStartTime ? Date.now() - holdStartTime : 0;
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      console.log("Cleared hold timeout");
    }
    
    if (isRecording) {
      console.log("Stopping video recording");
      stopRecording();
    } else if (holdDuration < 500) {
      // Quick tap = photo
      console.log("Quick tap detected - taking photo");
      capturePhoto();
    }
    
    setHoldStartTime(null);
  };

  // Handle send
  const handleSend = () => {
    if (capturedMedia) {
      onCapture(capturedMedia.blob, capturedMedia.type);
    }
  };

  // Handle retake
  const handleRetake = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
    }
  };

  // Cleanup
  useEffect(() => {
    initializeCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (capturedMedia) {
        URL.revokeObjectURL(capturedMedia.url);
      }
    };
  }, []);

  // Update camera when facing mode changes
  useEffect(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      initializeCamera();
    }
  }, [facingMode, initializeCamera]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-400">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="text-white hover:bg-white/10"
        >
          <SwitchCamera className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {capturedMedia ? (
          // Preview captured media
          <div className="w-full h-full bg-black flex items-center justify-center">
            {capturedMedia.type === "image" ? (
              <img
                src={capturedMedia.url}
                alt="Captured"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={capturedMedia.url}
                controls
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        ) : (
          // Live camera feed
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Hold indicator overlay */}
            <AnimatePresence>
              {isHolding && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/30 flex items-center justify-center"
                >
                  <div className="text-white text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">Hold for video...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50 backdrop-blur-sm">
        {capturedMedia ? (
          // Preview controls
          <div className="flex items-center justify-center space-x-6">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetake}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            
            <Button
              size="lg"
              onClick={handleSend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8"
            >
              <Send className="h-5 w-5 mr-2" />
              Send
            </Button>
          </div>
        ) : (
          // Capture controls
          <div className="flex items-center justify-center">
            <div className="text-center">
              {/* Instruction text */}
              <p className="text-white/70 text-sm mb-4">
                Tap for photo • Hold for video
              </p>
              
              {/* Capture button */}
              <motion.button
                onMouseDown={handleCaptureStart}
                onMouseUp={handleCaptureEnd}
                onMouseLeave={handleCaptureEnd}
                onTouchStart={handleCaptureStart}
                onTouchEnd={handleCaptureEnd}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
                  isRecording ? "bg-red-500" : isHolding ? "bg-white/30" : "bg-white/10",
                  "hover:bg-white/20 active:bg-white/30"
                )}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded-sm" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}