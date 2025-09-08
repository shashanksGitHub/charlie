import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LivePhotoCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export function LivePhotoCapture({ onCapture, onCancel }: LivePhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<{
    url: string;
    blob: Blob;
  } | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isReady, setIsReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera for selfie verification
  const initializeCamera = useCallback(async () => {
    try {
      console.log("Initializing camera...");
      
      // For verification, always prefer front camera (user) for selfies
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false // No audio needed for photos
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        // Set new stream
        videoRef.current.srcObject = mediaStream;
        
        // Ensure video plays and handle ready state
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsReady(true);
            console.log("Camera ready and playing");
          } catch (playError) {
            console.error("Video play error:", playError);
          }
        };
      }
      
      console.log("Live photo camera initialized successfully");
    } catch (error) {
      console.error("Camera access error:", error);
      setIsReady(false);
    }
  }, [facingMode]);



  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedPhoto({ url, blob });
      }
    }, "image/jpeg", 0.9);
  };

  // Handle confirm capture
  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto.blob);
    }
  };

  // Handle retake - completely reset camera
  const handleRetake = useCallback(() => {
    // Clear captured photo
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
      setCapturedPhoto(null);
    }
    
    // Stop existing stream completely
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    // Reset video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset ready state and reinitialize
    setIsReady(false);
    
    // Small delay to ensure cleanup, then restart camera
    setTimeout(() => {
      initializeCamera();
    }, 100);
  }, [capturedPhoto, stream, initializeCamera]);

  // Cleanup
  useEffect(() => {
    initializeCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto.url);
      }
    };
  }, []);

  // Update camera when facing mode changes
  useEffect(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setIsReady(false);
      initializeCamera();
    }
  }, [facingMode, initializeCamera]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-md w-full mx-auto"
    >
      {/* Minimal Header - Close Button Only */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera/Preview Area */}
      <div className="relative aspect-square bg-black">
        {capturedPhoto ? (
          // Show captured photo
          <img
            src={capturedPhoto.url}
            alt="Captured verification photo"
            className="w-full h-full object-cover"
          />
        ) : (
          // Show live camera feed
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                !isReady && "opacity-0"
              )}
            />
            
            {/* Loading overlay */}
            {!isReady && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <p className="text-sm">Preparing camera...</p>
                </div>
              </div>
            )}



            {/* Guide overlay */}
            {isReady && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Face guide oval */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-80 border-2 border-white/50 rounded-full border-dashed">
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-white dark:bg-gray-900">
        {capturedPhoto ? (
          // Preview controls - sleek minimal design
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 
                         transition-all duration-200 font-medium"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Retake</span>
            </button>
            
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl 
                         bg-emerald-600 hover:bg-emerald-700 text-white 
                         transition-all duration-200 font-medium shadow-lg shadow-emerald-600/25"
            >
              <Check className="h-5 w-5" />
              <span>Use Photo</span>
            </button>
          </div>
        ) : (
          // Capture controls - elegant capture button
          <div className="text-center">
            <button
              onClick={capturePhoto}
              disabled={!isReady}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400
                         text-white font-semibold text-lg transition-all duration-200 
                         shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30
                         disabled:shadow-none disabled:cursor-not-allowed"
            >
              Take Photo
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}