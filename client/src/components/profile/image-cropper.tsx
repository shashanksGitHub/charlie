import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/hooks/use-language';

interface ImageCropperProps {
  image: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
  originalImage?: string; // Optional original image URL for reset functionality
}

const ImageCropper = ({ image, onSave, onCancel, originalImage }: ImageCropperProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetHovered, setIsResetHovered] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [cropperKey, setCropperKey] = useState(Date.now());
  
  // Restart the cropper when image changes
  useEffect(() => {
    setCropperKey(Date.now());
  }, [image]);

  // This function is called when the user stops dragging or zooming
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Function to create the cropped image
  const createCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return null;
      
      setIsSaving(true);
      
      // Create an image element
      const img = document.createElement('img');
      img.src = image;
      
      // Wait for the image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Create a canvas with the desired size
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set the size of the canvas to our desired output size
      const maxSize = 512; // Max dimension for profile picture
      canvas.width = maxSize;
      canvas.height = maxSize;
      
      // Create a canvas to handle the rotation if needed
      let sourceImg = img;
      let sourceWidth = img.naturalWidth;
      let sourceHeight = img.naturalHeight;
      
      if (rotation !== 0) {
        const rotationCanvas = document.createElement('canvas');
        const rotationCtx = rotationCanvas.getContext('2d');
        
        if (!rotationCtx) {
          throw new Error('Could not get rotation canvas context');
        }
        
        // Calculate the size needed to fit the rotated image
        const radians = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        const rotatedWidth = img.naturalWidth * cos + img.naturalHeight * sin;
        const rotatedHeight = img.naturalWidth * sin + img.naturalHeight * cos;
        
        rotationCanvas.width = rotatedWidth;
        rotationCanvas.height = rotatedHeight;
        
        // Move to center and rotate
        rotationCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        rotationCtx.rotate(radians);
        
        // Draw the image centered
        rotationCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
        
        // Create a new image from the rotated canvas
        const rotatedImage = new Image();
        rotatedImage.src = rotationCanvas.toDataURL();
        
        // Wait for the rotated image to load
        await new Promise((resolve) => {
          rotatedImage.onload = resolve;
        });
        
        sourceImg = rotatedImage;
        sourceWidth = rotatedWidth;
        sourceHeight = rotatedHeight;
      }
      
      // The croppedAreaPixels from react-easy-crop are already in the correct coordinate system
      // for the source image, but we need to ensure they're correctly scaled for our source image dimensions
      // 
      // Note: react-easy-crop automatically handles the coordinate transformation between display and natural coordinates
      // So we can use croppedAreaPixels directly, but we need to account for rotation scaling if applied
      
      // Draw the cropped image to our output canvas
      // Use croppedAreaPixels directly as react-easy-crop provides coordinates in natural image space
      ctx.drawImage(
        sourceImg,
        croppedAreaPixels.x, // Source X
        croppedAreaPixels.y, // Source Y
        croppedAreaPixels.width, // Source Width
        croppedAreaPixels.height, // Source Height
        0, // Destination X
        0, // Destination Y
        maxSize, // Destination Width
        maxSize, // Destination Height
      );
      
      // Convert the canvas to a data URL
      const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.92); // JPEG with 92% quality
      
      setIsSaving(false);
      
      return croppedImageUrl;
    } catch (error) {
      console.error('Error creating cropped image:', error);
      setIsSaving(false);
      return null;
    }
  }, [croppedAreaPixels, image, rotation]);

  // Handle save button click
  const handleSave = useCallback(async () => {
    const croppedImage = await createCroppedImage();
    if (croppedImage) {
      onSave(croppedImage);
    }
  }, [createCroppedImage, onSave]);

  return (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Crop Area */}
      <div className="relative w-full h-72 sm:h-80 bg-gradient-to-b from-purple-900/30 to-black overflow-hidden rounded-lg border border-purple-500/20">
        <Cropper
          key={cropperKey}
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropSize={{ width: 280, height: 280 }}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
          showGrid={true}
          cropShape="round"
          classes={{
            containerClassName: "rounded-lg",
            cropAreaClassName: "border-2 border-purple-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]",
          }}
        />
        
        {/* Cropping guide overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-center">
          <div className="text-xs text-white bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 font-medium shadow-md border border-purple-500/20">
            <span>{t('profile.photoEditing.dragZoomAdjust')}</span>
          </div>
        </div>
      </div>
      
      {/* Controls Panel */}
      <motion.div 
        className="p-4 space-y-5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 rounded-b-lg shadow-inner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {/* Zoom Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{t('profile.photoEditing.zoom')}</span>
              <div className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                {Math.round(zoom * 100)}%
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                disabled={zoom <= 1}
              >
                <ZoomOut className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </Button>
            </div>
          </div>
          <Slider
            value={[zoom * 50]} 
            min={50}
            max={150}
            step={1}
            onValueChange={(value) => setZoom(value[0] / 50)}
            aria-label="Zoom"
            className="[&>span]:bg-purple-500"
          />
        </div>
        
        {/* Rotation Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{t('profile.photoEditing.rotation')}</span>
              <div className="ml-2 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                {rotation}°
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              onClick={() => setRotation((rotation + 90) % 360)}
            >
              <RotateCw className="h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-purple-700 dark:text-purple-300">{t('profile.photoEditing.rotate90')}</span>
            </Button>
          </div>
          <Slider
            value={[rotation]}
            min={0}
            max={360}
            step={1}
            onValueChange={(value) => setRotation(value[0])}
            aria-label="Rotation"
            className="[&>span]:bg-purple-500"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-2">
          {/* Add Reset to Original button if originalImage is available */}
          {originalImage && (
            <Button 
              variant="outline" 
              className="w-full relative overflow-hidden border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              onClick={() => onSave(originalImage)}
              disabled={isSaving}
              onMouseEnter={() => setIsResetHovered(true)}
              onMouseLeave={() => setIsResetHovered(false)}
            >
              <AnimatePresence>
                {isResetHovered && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-pink-100/50 dark:from-purple-900/20 dark:to-pink-900/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
              <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
              {t('profile.photoEditing.resetToOriginal')}
            </Button>
          )}
          
          <div className="flex justify-between space-x-3">
            <Button 
              variant="outline" 
              className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-1" />
              {t('profile.photoEditing.cancel')}
            </Button>
            <Button 
              variant="default" 
              className="flex-1 relative overflow-hidden"
              onClick={handleSave}
              disabled={isSaving}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-colors" />
              <div className="relative flex items-center justify-center">
                {isSaving ? (
                  <>
                    <motion.div 
                      className="h-4 w-4 border-2 border-t-transparent border-white rounded-full mr-1"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>{t('profile.photoEditing.saving')}</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                    </motion.div>
                    <span>{t('profile.photoEditing.savePhoto')}</span>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ImageCropper;