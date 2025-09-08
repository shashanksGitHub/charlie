import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ProfileImageDialog from './profile-image-dialog';
import { uploadProfilePhoto } from '@/services/profile-service';

interface ProfilePhotoButtonProps {
  userId: number;
  photoId?: number;  // Add photoId parameter for updating existing photos
  currentPhotoUrl?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function ProfilePhotoButton({
  userId,
  photoId,
  currentPhotoUrl,
  variant = 'outline',
  size = 'default',
  className = '',
  children,
  skipInitialDialog = false,
}: ProfilePhotoButtonProps & { skipInitialDialog?: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle saving the cropped image
  const handleSaveImage = async (imageData: string) => {
    try {
      // Upload the image to the server with photoId for update if available
      await uploadProfilePhoto(imageData, photoId);
      
      // Invalidate queries to refetch user data with the new photo
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${userId}`] });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving profile photo:', error);
      toast({
        title: 'Error saving profile photo',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
      
      return Promise.reject(error);
    }
  };
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={className}
        aria-label="Edit profile photo"
      >
        {children || (
          <>
            <Camera className="h-4 w-4 mr-2" />
            <span>Change Photo</span>
          </>
        )}
      </Button>
      
      <ProfileImageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentImageUrl={currentPhotoUrl}
        onImageSave={handleSaveImage}
        userId={userId}
        skipToEdit={skipInitialDialog}
        photoId={photoId}
      />
    </>
  );
}

export function ProfilePhotoEditButton({
  userId,
  photoId,
  currentPhotoUrl,
  className = '',
  useCamera = false,
}: {
  userId: number;
  photoId?: number;
  currentPhotoUrl?: string | null;
  className?: string;
  useCamera?: boolean;
}) {
  return (
    <ProfilePhotoButton
      userId={userId}
      photoId={photoId}
      currentPhotoUrl={currentPhotoUrl}
      variant="ghost"
      size="icon"
      className={`absolute bottom-0 right-0 rounded-full bg-white/90 dark:bg-gray-800/90 p-1.5 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 z-30 ${className}`}
      skipInitialDialog={true}
    >
      {useCamera ? (
        <Camera className="h-4 w-4 text-white" />
      ) : (
        <Pencil className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      )}
    </ProfilePhotoButton>
  );
}

export default ProfilePhotoButton;