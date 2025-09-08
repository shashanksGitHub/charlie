import * as React from "react"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"

export interface UserPictureProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  allowRotate?: boolean; // Kept for backward compatibility but no longer used
}

export const UserPicture = React.forwardRef<
  HTMLDivElement,
  UserPictureProps
>(({ 
  className, 
  imageUrl, 
  fallbackInitials, 
  size = "md",
  allowRotate = false, // Not used but kept for API compatibility
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-36 w-36 text-2xl"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="User picture"
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white">
          {fallbackInitials || <User className={cn({
            "h-4 w-4": size === "sm",
            "h-5 w-5": size === "md",
            "h-7 w-7": size === "lg",
            "h-16 w-16": size === "xl",
          })} />}
        </div>
      )}
    </div>
  )
})

UserPicture.displayName = "UserPicture"