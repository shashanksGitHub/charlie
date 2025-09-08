import { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPicture } from '@/components/ui/user-picture';
import { Camera, Upload, User, Sparkles, X } from 'lucide-react';
import ImageCropper from './image-cropper';
import { useToast } from '@/hooks/use-toast';
import { getPhotoById } from '@/services/profile-service';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/hooks/use-language';

/**
 * Format a file size in bytes to a human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface ProfileImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string | null;
  onImageSave: (imageData: string) => Promise<void>;
  userId: number;
  skipToEdit?: boolean;
  photoId?: number; // Add photoId for identifying which photo to update
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 5MB in bytes
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export function ProfileImageDialog({
  open,
  onOpenChange,
  currentImageUrl,
  onImageSave,
  userId,
  skipToEdit = false,
  photoId,
}: ProfileImageDialogProps) {
  const { toast } = useToast();
  // Remove unused useLanguage hook
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(skipToEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // Fetch the original photo when in edit mode
  const { data: photoData } = useQuery({
    queryKey: [`/api/photos/single/${photoId}`],
    queryFn: () => photoId ? getPhotoById(photoId) : Promise.resolve(null),
    enabled: !!photoId && open && skipToEdit, // Only run when photoId exists and dialog is in edit mode
    staleTime: Infinity, // No need to refetch
  });
  
  // Set the original photo URL
  useEffect(() => {
    if (photoData && photoData.photoUrl) {
      setOriginalPhotoUrl(photoData.photoUrl);
    }
  }, [photoData]);
  
  // Reset states when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUploadedImage(null);
      // Don't reset isCropping if skipToEdit is true to preserve the skipToEdit state
      if (!skipToEdit) {
        setIsCropping(false);
      }
    } else if (open && skipToEdit) {
      // When opening and skipToEdit is true, ensure we're in cropping mode
      setIsCropping(true);
    }
    onOpenChange(open);
  };
  
  // Set up the imageUrl when in edit mode
  useEffect(() => {
    if (open && skipToEdit && currentImageUrl && !uploadedImage) {
      setUploadedImage(currentImageUrl);
    }
  }, [open, skipToEdit, currentImageUrl, uploadedImage]);
  
  // Handle file input change
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t('common.fileTooLarge'),
        description: t('common.maxFileSizeMessage', { maxSize: MAX_FILE_SIZE_MB, fileSize: formatFileSize(file.size) }),
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: t('common.invalidFileType'),
        description: t('common.pleaseUploadValidImage'),
        variant: 'destructive',
      });
      return;
    }
    
    // Read the file and set the image
    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setIsCropping(true);
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast({
        title: t('common.errorReadingFile'),
        description: t('common.tryDifferentImage'),
        variant: 'destructive',
      });
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
    
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };
  
  // Handle saving the cropped image
  const handleSaveCroppedImage = async (croppedImageData: string) => {
    try {
      setIsSaving(true);
      
      // Call the provided save function
      await onImageSave(croppedImageData);
      
      // Clean up and close dialog
      setUploadedImage(null);
      // Don't reset isCropping if skipToEdit is enabled so it remains in edit mode next time
      if (!skipToEdit) {
        setIsCropping(false);
      }
      handleOpenChange(false);
      
      toast({
        title: t('common.profilePictureUpdated'),
        description: t('common.newProfilePictureSaved'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast({
        title: t('common.errorSavingImage'),
        description: t('common.pleaseTryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel cropping
  const handleCancelCrop = () => {
    setUploadedImage(null);
    // Only reset isCropping if we're not in skipToEdit mode
    if (!skipToEdit) {
      setIsCropping(false);
    } else {
      // If in skipToEdit mode, close the dialog entirely instead of showing the upload screen
      handleOpenChange(false);
    }
  };

  // Generate random sparkle positions
  const sparklePositions = Array.from({ length: 8 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: 0.5 + Math.random() * 1.5
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] rounded-xl overflow-hidden border-0 shadow-2xl p-0 backdrop-blur-sm bg-white/95 dark:bg-gray-950/95">
        {/* Close button with custom styling */}
        <motion.button 
          className="absolute right-3 top-3 z-50 rounded-full w-7 h-7 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-800/60 flex items-center justify-center transition-all duration-200"
          onClick={() => handleOpenChange(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </motion.button>
        
        <div className="relative w-full">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/10 to-pink-500/5 dark:from-purple-900/20 dark:via-fuchsia-900/30 dark:to-pink-900/20 -z-10 opacity-80"></div>
          
          {/* Animated sparkles */}
          <AnimatePresence>
            {sparklePositions.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute z-10 text-yellow-400 opacity-70 dark:opacity-50"
                style={{ 
                  top: `${pos.y}%`, 
                  left: `${pos.x}%`,
                  fontSize: `${pos.size}rem`
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: [0.2, 0.8, 0.2], 
                  scale: [0.7, 1.2, 0.7],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 3,
                  delay: pos.delay,
                  repeat: Infinity,
                  repeatType: "mirror" 
                }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
            ))}
          </AnimatePresence>
          
          <DialogHeader className="pt-6 px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {isCropping ? t('profile.photoEditing.perfectYourPhoto') : t('profile.photoEditing.yourProfileImage')}
              </DialogTitle>
              {!isCropping && (
                <DialogDescription className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('profile.photoEditing.greatFirstImpression')}
                </DialogDescription>
              )}
              {isCropping && (
                <DialogDescription className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1 hidden">
                  Adjust your photo
                </DialogDescription>
              )}
            </motion.div>
          </DialogHeader>
        </div>
        
        {/* Show cropper if an image is being edited */}
        {isCropping && uploadedImage ? (
          <ImageCropper
            image={uploadedImage}
            onSave={handleSaveCroppedImage}
            onCancel={handleCancelCrop}
            originalImage={skipToEdit && originalPhotoUrl ? originalPhotoUrl : undefined}
          />
        ) : (
          <motion.div 
            className="flex flex-col items-center space-y-6 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Current profile picture display */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative"
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
            >
              <div className="relative">
                <UserPicture 
                  imageUrl={currentImageUrl || undefined}
                  className="border-2 border-purple-300 dark:border-purple-700 shadow-xl"
                  size="xl"
                />
                
                {/* Gradient rings animation on hover */}
                <AnimatePresence>
                  {isHovering && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 -m-2 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 dark:from-purple-700 dark:via-pink-700 dark:to-purple-800 p-0.5 animate-pulse"
                      style={{ zIndex: -1 }}
                    ></motion.div>
                  )}
                </AnimatePresence>
                
                {/* Light glow */}
                <div className="absolute -inset-1 rounded-full blur-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-700/20 dark:to-pink-700/20" style={{ zIndex: -2 }}></div>
              </div>
            </motion.div>
            
            {/* Upload new picture button */}
            <div className="flex flex-col space-y-4 w-full">
              <label htmlFor="profile-photo-upload" className="w-full relative">
                <Button
                  variant="default"
                  className="w-full h-12 relative overflow-hidden"
                  disabled={isUploading}
                  asChild
                >
                  <div>
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300"></div>
                    
                    {/* Glass effect */}
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/10"></div>
                    
                    {/* Light stripe effect */}
                    <motion.div 
                      className="absolute inset-y-0 w-20 bg-white/20 -skew-x-30 opacity-50 h-full"
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 5 }}
                    ></motion.div>
                    
                    {/* Button content */}
                    <div className="relative flex items-center justify-center">
                      {isUploading ? (
                        <>
                          <motion.div 
                            className="h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          ></motion.div>
                          <span className="font-medium">{t("common.processing")}</span>
                        </>
                      ) : (
                        <>
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Upload className="h-5 w-5 mr-2" />
                          </motion.div>
                          <span className="font-medium">{t('profile.photoEditing.uploadNewPhoto')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Button>
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              
              {currentImageUrl && (
                <Button 
                  variant="outline" 
                  onClick={handleOpenChange.bind(null, false)}
                  className="relative overflow-hidden border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 to-pink-100/30 dark:from-purple-900/10 dark:to-pink-900/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative">{t('profile.photoEditing.keepCurrentPhoto')}</span>
                </Button>
              )}
            </div>
            
            {/* File size information */}
            <div className="flex items-center justify-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 bg-gray-100/50 dark:bg-gray-800/50 px-3 py-2 rounded-full backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {t('profile.photoEditing.maxSizeFormats', { maxSize: MAX_FILE_SIZE_MB })}
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProfileImageDialog;