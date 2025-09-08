import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAppMode } from "@/hooks/use-app-mode";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { UserPicture } from "@/components/ui/user-picture";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* This is an updated file where:
1. Avatar, AvatarImage, AvatarFallback imports were replaced with UserPicture
2. For the chat header (around line 813), modified to:
     <div className="relative">
       <div className="border-2 border-primary/20 rounded-full overflow-hidden shadow-sm">
         <UserPicture
           imageUrl={otherUser.photoUrl || undefined}
           fallbackInitials={getInitials(otherUser.fullName)}
           className="h-10 w-10"
         />
       </div>
       {isOtherUserActive && (
         <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
       )}
     </div>

3. For the message bubbles with other user avatar (around line 949), modified to:
     {message.senderId !== user?.id && (
       <div className="h-8 w-8 mt-0.5 hidden sm:block opacity-75">
         <UserPicture
           imageUrl={otherUser.photoUrl || undefined}
           fallbackInitials={getInitials(otherUser.fullName)}
           className="h-8 w-8"
         />
       </div>
     )}

4. For the message bubbles with current user avatar (around line 1056), modified to:
     {message.senderId === user?.id && (
       <div className="h-8 w-8 mt-0.5 hidden sm:block opacity-75">
         <UserPicture
           imageUrl={user.photoUrl || undefined}
           fallbackInitials={getInitials(user.fullName)}
           className="h-8 w-8"
         />
       </div>
     )}
*/