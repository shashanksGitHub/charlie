import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { useLanguage } from "@/hooks/use-language";
import { useAppMode } from "@/hooks/use-app-mode";
import {
  safeStorageSet,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSetObject,
  safeStorageGetObject,
  cleanupStorage,
} from "@/lib/storage-utils";

// Declare global types for duplicate tracking
declare global {
  interface Window {
    __lastKnownDuplicateMessageId?: number;
  }
}

// Define fallback translations for any missing keys
const fallbackTranslations: Record<string, string> = {
  "chat.errorLoading": "Error loading messages",
  "common.retry": "Try Again",
  "chat.autoDelete": "Auto-Delete Messages",
  "chat.autoDeleteNever": "Never",
  "chat.autoDeleteAlways": "Always",
  "chat.autoDeleteCustom": "Custom",
  "chat.autoDeleteMinutes": "Minutes",
  "chat.autoDeleteHours": "Hours",
  "chat.autoDeleteDays": "Days",
  "chat.autoDeleteWeeks": "Weeks",
  "chat.autoDeleteMonths": "Months",
  "messages.typing": "Typing...",
  "messages.sendMessage": "Send message",
  "chat.settingsTitle": "Chat Settings",
  "chat.defaultAutoDelete": "Default Auto Delete",
  "chat.customAutoDelete": "Custom Auto Delete",
  "common.yes": "Yes",
  "common.no": "No",
};
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";

import { UserPicture } from "@/components/ui/user-picture";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserProfilePreviewPopup } from "@/components/ui/user-profile-preview-popup";
import { FloatingIconsBackground } from "@/components/ui/floating-icons-background";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Smile,
  Send,
  Video,
  Phone,
  MoreHorizontal,
  Settings,
  UserMinus,
  Clock,
  CheckCheck,
  Check,
  ArrowLeft,
  MessageSquare,
  FileImage,
  Flag,
  Camera,
  Mic,
  Trash2,
  Timer,
  Loader2,
  Square,
  Play,
  Pause,
  UserCircle,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Users,
  Briefcase,
  GraduationCap,
  Heart,
  UserX,
} from "lucide-react";
import { AudioMessage } from "@/components/messaging/audio-message";
import { PhoneOutgoing, PhoneMissed } from "lucide-react";
import { AudioRecorder } from "@/components/messaging/audio-recorder";
import { MessageActions } from "@/components/messaging/message-actions";
import {
  ReplyMessage,
  ReplyContext,
} from "@/components/messaging/reply-message";
import {
  UserPresenceIndicator,
  TypingWithPresenceIndicator,
} from "@/components/messaging/user-presence-indicator";
import { SimpleCameraCapture } from "@/components/messaging/simple-camera-capture";
import { ReportUserDialog } from "@/components/messaging/report-user-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EmojiPicker from "@/components/ui/emoji-picker";
import { CallLauncher } from "@/components/messaging/call-launcher";

// Message interface
interface Message {
  id: number;
  matchId: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType?: string; // 'text', 'audio', 'image', etc.
  audioUrl?: string;
  audioDuration?: number;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

// User interface
interface User {
  id: number;
  fullName: string;
  photoUrl?: string;
  isOnline?: boolean;
  lastActive?: string;
  city?: string;
  country?: string;
  age?: number;
}

// Match interface
interface Match {
  id: number;
  userId1: number;
  userId2: number;
  createdAt: string;
  matched: boolean;
  user: User;
  metadata?: string | { origin?: string; suiteType?: string; context?: string };
}

// Emoji Reaction interface
interface EmojiReaction {
  emoji: string;
  count: number;
  users: string[];
}

// Extended Message with UI state and reactions
interface MessageWithReactions extends Message {
  reactions?: EmojiReaction[];
  sending?: boolean; // For optimistic updates
  error?: boolean; // For failed messages
  retryCount?: number; // Track number of retry attempts
  // Properties added for duplicate message prevention
  _isDuplicatePrevention?: boolean;
  _sessionId?: string;
  _fixedCreatedAt?: boolean;
  // Reply functionality - includes both database fields and reconstructed objects
  replyToMessageId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  replyToIsCurrentUser?: boolean;
  replyToMessage?: {
    id: number;
    content: string;
    senderName: string;
    isCurrentUser: boolean;
  };
}

// Message group by date
interface MessageGroup {
  date: string;
  formattedDate: string;
  messages: MessageWithReactions[];
}

// Origin metadata interface
interface OriginMetadata {
  origin: string;
  suiteType?: string;
  context?: string;
}

// Helper function to parse match metadata
const parseMatchMetadata = (
  metadata?: string | object,
): OriginMetadata | null => {
  if (!metadata) return null;

  try {
    if (typeof metadata === "string") {
      return JSON.parse(metadata) as OriginMetadata;
    }
    return metadata as OriginMetadata;
  } catch (error) {
    console.error("Failed to parse match metadata:", error);
    return null;
  }
};

// Origin Badge Component
const OriginBadge: React.FC<{ metadata?: string | object }> = ({
  metadata,
}) => {
  const originData = parseMatchMetadata(metadata);

  if (!originData || !originData.origin) {
    return null;
  }

  // MEET origin
  if (originData.origin === "MEET") {
    return (
      <div
        className="inline-block px-1 py-0.5 rounded bg-gradient-to-b from-pink-200 to-pink-300 dark:from-pink-800 dark:to-pink-900 text-pink-800 dark:text-pink-200 text-[8px] font-medium w-fit shadow-lg shadow-pink-500/50 dark:shadow-pink-700/50 border border-pink-300/50 dark:border-pink-600/50"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          boxShadow:
            "0 4px 8px rgba(236, 72, 153, 0.3), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)",
        }}
      >
        via MEET
      </div>
    );
  }

  // SUITE origins
  if (originData.origin === "SUITE" && originData.suiteType) {
    let icon = <Users className="w-3 h-3" />;
    let color = "text-blue-700 dark:text-blue-300";
    let bgColor = "bg-blue-100 dark:bg-blue-900/30";
    let label = "via SUITE";

    switch (originData.suiteType) {
      case "networking":
        icon = <Users className="w-3 h-3" />;
        color = "text-emerald-700 dark:text-emerald-300";
        bgColor = "bg-emerald-100 dark:bg-emerald-900/30";
        label = "via Networking";
        break;
      case "mentorship":
        icon = <GraduationCap className="w-3 h-3" />;
        color = "text-amber-700 dark:text-amber-300";
        bgColor = "bg-amber-100 dark:bg-amber-900/30";
        label = "via Mentorship";
        break;
      case "jobs":
        icon = <Briefcase className="w-3 h-3" />;
        color = "text-indigo-700 dark:text-indigo-300";
        bgColor = "bg-indigo-100 dark:bg-indigo-900/30";
        label = "via Jobs";
        break;
    }

    // Convert flat colors to 3D gradient backgrounds
    const gradientBg = bgColor.includes("emerald")
      ? "bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 shadow-lg shadow-emerald-500/50 dark:shadow-emerald-700/50 border border-emerald-300/50 dark:border-emerald-600/50"
      : bgColor.includes("amber")
        ? "bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-900 shadow-lg shadow-amber-500/50 dark:shadow-amber-700/50 border border-amber-300/50 dark:border-amber-600/50"
        : "bg-gradient-to-b from-indigo-200 to-indigo-300 dark:from-indigo-800 dark:to-indigo-900 shadow-lg shadow-indigo-500/50 dark:shadow-indigo-700/50 border border-indigo-300/50 dark:border-indigo-600/50";

    const shadowColor = bgColor.includes("emerald")
      ? "rgba(16, 185, 129, 0.3)"
      : bgColor.includes("amber")
        ? "rgba(245, 158, 11, 0.3)"
        : "rgba(99, 102, 241, 0.3)";

    return (
      <div
        className={`inline-block px-1 py-0.5 rounded ${gradientBg} ${color} text-[8px] font-medium w-fit`}
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          boxShadow: `0 4px 8px ${shadowColor}, inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)`,
        }}
      >
        {label}
      </div>
    );
  }

  return null;
};

// Multiple Origin Badges Component (Shows ALL connection types between two users)
const MultipleOriginBadges: React.FC<{ otherUserId: number }> = ({
  otherUserId,
}) => {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { user: currentUser } = useAuth();

  const { data: allMatches, isLoading } = useQuery({
    queryKey: [`/api/matches/between/${otherUserId}`],
    enabled: !!otherUserId,
    refetchInterval: 2000, // Refresh every 2 seconds for instant badge updates
  });

  // Fetch SUITE profile IDs for the user to get correct profile IDs for compatibility URLs
  const { data: networkingProfile } = useQuery({
    queryKey: [`/api/suite/networking-profile/${otherUserId}`],
    enabled: !!otherUserId,
  });

  const { data: mentorshipProfile } = useQuery({
    queryKey: [`/api/suite/mentorship-profile/${otherUserId}`],
    enabled: !!otherUserId,
  });

  const { data: jobsProfile } = useQuery({
    queryKey: [`/api/suite/job-profile/${otherUserId}`],
    enabled: !!otherUserId,
  });

  // Invalidate cache when matches change to get instant updates
  useEffect(() => {
    const invalidateCache = () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/matches/between/${otherUserId}`],
      });
    };

    // Listen for WebSocket match events for instant updates
    const handleMatchEvent = () => {
      invalidateCache();
    };

    // Invalidate cache when the component mounts (first load)
    invalidateCache();

    return () => {
      // Cleanup if needed
    };
  }, [otherUserId, queryClient]);

  if (isLoading || !allMatches || allMatches.length === 0) {
    return null;
  }


  // Extract unique origins from all matches and combined metadata
  const origins = new Set<string>();
  const originData: { [key: string]: any } = {};

  allMatches.forEach((match: any) => {
    const metadata = parseMatchMetadata(match.metadata);
    if (metadata && metadata.origin) {
      if (metadata.origin === "MEET") {
        origins.add("MEET");
        originData["MEET"] = metadata;

        // CRITICAL FIX: Check for additional connections in MEET matches too
        if (
          metadata.additionalConnections &&
          Array.isArray(metadata.additionalConnections)
        ) {
          metadata.additionalConnections.forEach((connection: string) => {
            if (connection === "MEET") {
              // Already added above
            } else {
              origins.add(connection);
              originData[connection] = {
                origin: "SUITE",
                suiteType: connection,
              };
            }
          });
        }
      } else if (metadata.origin === "SUITE" && metadata.suiteType) {
        origins.add(metadata.suiteType);
        originData[metadata.suiteType] = metadata;

        // Check for additional connections in SUITE matches
        if (
          metadata.additionalConnections &&
          Array.isArray(metadata.additionalConnections)
        ) {
          metadata.additionalConnections.forEach((connection: string) => {
            if (connection === "MEET") {
              origins.add("MEET");
              originData["MEET"] = { origin: "MEET" };
            } else {
              origins.add(connection);
              originData[connection] = { ...metadata, suiteType: connection };
            }
          });
        }
      }
    }
  });

  if (origins.size === 0) {
    return null;
  }

  // Helper function to render clickable badge
  const renderBadge = (origin: string) => {
    const handleBadgeClick = (badgeType: string) => {

      // Navigate to the same URLs as percentage badges
      if (badgeType === "networking") {
        setLocation(
          networkingProfile?.id
            ? `/suite/compatibility/${networkingProfile.id}`
            : "/suite/network",
        );
      } else if (badgeType === "mentorship") {
        setLocation(
          mentorshipProfile?.id
            ? `/suite/mentorship/compatibility/${mentorshipProfile.id}`
            : "/suite/mentorship",
        );
      } else if (badgeType === "jobs") {
        setLocation(
          jobsProfile?.id
            ? `/suite/jobs/compatibility/${jobsProfile.id}`
            : "/suite/jobs",
        );
      } else if (badgeType === "MEET") {
        setLocation(
          `/match-dashboard/users/${currentUser?.id || otherUserId}/${otherUserId}`,
        ); // Navigate to MEET dashboard
      }
    };

    if (origin === "MEET") {
      return (
        <button
          key="MEET"
          onClick={() => handleBadgeClick("MEET")}
          className="inline-block px-1 py-0.5 rounded bg-gradient-to-b from-pink-200 to-pink-300 dark:from-pink-800 dark:to-pink-900 text-pink-800 dark:text-pink-200 text-[8px] font-medium shadow-lg shadow-pink-500/50 dark:shadow-pink-700/50 border border-pink-300/50 dark:border-pink-600/50 hover:scale-105 transition-transform cursor-pointer"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            boxShadow:
              "0 4px 8px rgba(236, 72, 153, 0.3), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)",
          }}
          title="View MEET compatibility"
        >
          via MEET
        </button>
      );
    }

    if (origin === "networking") {
      return (
        <button
          key="networking"
          onClick={() => handleBadgeClick("networking")}
          className="inline-block px-1 py-0.5 rounded bg-gradient-to-b from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-900 text-emerald-800 dark:text-emerald-200 text-[8px] font-medium shadow-lg shadow-emerald-500/50 dark:shadow-emerald-700/50 border border-emerald-300/50 dark:border-emerald-600/50 hover:scale-105 transition-transform cursor-pointer"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            boxShadow:
              "0 4px 8px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)",
          }}
          title="View Networking compatibility"
        >
          via Networking
        </button>
      );
    }

    if (origin === "mentorship") {
      return (
        <button
          key="mentorship"
          onClick={() => handleBadgeClick("mentorship")}
          className="inline-block px-1 py-0.5 rounded bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-900 text-amber-800 dark:text-amber-200 text-[8px] font-medium shadow-lg shadow-amber-500/50 dark:shadow-amber-700/50 border border-amber-300/50 dark:border-amber-600/50 hover:scale-105 transition-transform cursor-pointer"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            boxShadow:
              "0 4px 8px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)",
          }}
          title="View Mentorship compatibility"
        >
          via Mentorship
        </button>
      );
    }

    if (origin === "jobs") {
      return (
        <button
          key="jobs"
          onClick={() => handleBadgeClick("jobs")}
          className="inline-block px-1 py-0.5 rounded bg-gradient-to-b from-indigo-200 to-indigo-300 dark:from-indigo-800 dark:to-indigo-900 text-indigo-800 dark:text-indigo-200 text-[8px] font-medium shadow-lg shadow-indigo-500/50 dark:shadow-indigo-700/50 border border-indigo-300/50 dark:border-indigo-600/50 hover:scale-105 transition-transform cursor-pointer"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            boxShadow:
              "0 4px 8px rgba(99, 102, 241, 0.3), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)",
          }}
          title="View Jobs compatibility"
        >
          via Jobs
        </button>
      );
    }

    return null;
  };

  // Render all unique badges in a row
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from(origins).map(renderBadge)}
    </div>
  );
};
export function RealTimeChat({ matchId }: { matchId: number }) {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  // Call state management
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAudioCallActive, setIsAudioCallActive] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState<number | undefined>();
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const { translate: originalTranslate } = useLanguage();
  const { toast } = useToast();
  const { currentMode, setAppMode } = useAppMode(); // Add app mode awareness

  // Enhanced translate function with fallbacks
  const translate = useCallback(
    (key: string, replacements?: Record<string, string>): string => {
      const translatedText = originalTranslate(key, replacements);
      // If we got back the original key, try our fallbacks
      if (translatedText === key && fallbackTranslations[key]) {
        return fallbackTranslations[key];
      }
      return translatedText;
    },
    [originalTranslate],
  );
  const queryClient = useQueryClient();
  const [path, navigate] = useLocation();
  // Helper: navigate to messages of the last-used app
  const goToLastAppMessages = () => {
    try {
      const last = localStorage.getItem("last_app_page") || "";
      const origin = localStorage.getItem("origin_app_page") || "";
      const page = last || origin || "";
      let mode: "HEAT" | "MEET" | "SUITE" = "MEET";
      if (page.startsWith("/heat")) mode = "HEAT";
      else if (page.startsWith("/suite")) mode = "SUITE";
      else if (page.startsWith("/meet")) mode = "MEET";
      else mode = (currentMode as any) || "MEET";
      setAppMode(mode);
      navigate("/messages");
    } catch {
      setAppMode("MEET");
      navigate("/messages");
    }
  };
  const {
    sendMessage: wsSendMessage,
    updateTypingStatus,
    setActiveChatStatus,
    isConnected,
    activeChats,
    onlineUsers,
  } = useWebSocket();

  // Force invalidate matches cache to ensure fresh metadata is loaded
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
  }, [matchId, queryClient]);

  // Local state
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerSide, setEmojiPickerSide] = useState<
    "top" | "bottom" | "left" | "right"
  >("top");
  const [emojiPickerAlign, setEmojiPickerAlign] = useState<
    "start" | "center" | "end"
  >("center");
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [localTypingState, setLocalTypingState] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [blockConfirmDialogOpen, setBlockConfirmDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousMessagesLengthRef = useRef(0);
  const remoteMessagesRef = useRef<MessageWithReactions[]>([]);

  // Chat scroll position persistence for instant restoration
  const [isRestoringScrollPosition, setIsRestoringScrollPosition] =
    useState(true);
  const [isPreparingMessages, setIsPreparingMessages] = useState(true); // Hide messages until scroll is ready
  const [isChatInitialized, setIsChatInitialized] = useState(false); // Overall initialization state
  const scrollPositionKey = `chat_scroll_position_${matchId}`;
  const hasRestoredScrollRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ENHANCED: Save scroll position with visible message tracking
  const saveScrollPosition = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Only save if user is not at the bottom (within 50px)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      if (!isAtBottom) {
        // Find the currently visible message
        let lastVisibleMessageId = null;
        const messageElements = container.querySelectorAll("[data-message-id]");

        for (const element of Array.from(messageElements)) {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          // Check if message is visible in the viewport
          if (
            rect.top >= containerRect.top &&
            rect.top <= containerRect.bottom
          ) {
            lastVisibleMessageId = element.getAttribute("data-message-id");
            break;
          }
        }

        const scrollData = {
          scrollTop,
          timestamp: Date.now(),
          lastVisibleMessageId,
        };

        try {
          localStorage.setItem(scrollPositionKey, JSON.stringify(scrollData));
          console.log(
            `[SCROLL-RESTORE] Saved scroll position: ${scrollTop}px, visible message: ${lastVisibleMessageId} for match ${matchId}`,
          );
        } catch (e) {
          // If localStorage fails, use sessionStorage as fallback
          try {
            sessionStorage.setItem(
              scrollPositionKey,
              JSON.stringify(scrollData),
            );
            console.log(
              `[SCROLL-RESTORE] Saved to sessionStorage due to localStorage failure`,
            );
          } catch (sessionError) {
            console.warn(
              `[SCROLL-RESTORE] Failed to save scroll position:`,
              sessionError,
            );
          }
        }
      } else {
        // User is at bottom, remove saved position to ensure natural bottom scroll
        localStorage.removeItem(scrollPositionKey);
        sessionStorage.removeItem(scrollPositionKey);
        console.log(
          `[SCROLL-RESTORE] User at bottom, cleared saved position for match ${matchId}`,
        );
      }
    }
  };

  // ENHANCED: Restore scroll position instantly with message-based positioning and sessionStorage fallback
  const restoreScrollPosition = () => {
    if (hasRestoredScrollRef.current || !messagesContainerRef.current)
      return false;

    try {
      // Try localStorage first, then sessionStorage as fallback
      let savedPositionData = localStorage.getItem(scrollPositionKey);
      if (!savedPositionData) {
        savedPositionData = sessionStorage.getItem(scrollPositionKey);
      }

      if (savedPositionData) {
        const { scrollTop, timestamp, lastVisibleMessageId } =
          JSON.parse(savedPositionData);

        // Only restore if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          // METHOD 1: Try to restore by specific message if available
          if (lastVisibleMessageId) {
            const targetMessage = messagesContainerRef.current.querySelector(
              `[data-message-id="${lastVisibleMessageId}"]`,
            );
            if (targetMessage) {
              // Scroll to the exact message that was visible - NO ANIMATION
              targetMessage.scrollIntoView({
                behavior: "auto",
                block: "start",
              });
              console.log(
                `[SCROLL-RESTORE] ✅ Restored to visible message ${lastVisibleMessageId} for match ${matchId}`,
              );
              hasRestoredScrollRef.current = true;
              setIsRestoringScrollPosition(false);
              return true;
            }
          }

          // METHOD 2: Fallback to exact scroll position - NO ANIMATION
          messagesContainerRef.current.scrollTop = scrollTop;
          console.log(
            `[SCROLL-RESTORE] ✅ Instantly restored scroll position: ${scrollTop}px for match ${matchId}`,
          );
          hasRestoredScrollRef.current = true;
          setIsRestoringScrollPosition(false);
          return true;
        } else {
          // Expired - clean up both storages
          localStorage.removeItem(scrollPositionKey);
          sessionStorage.removeItem(scrollPositionKey);
          console.log(
            `[SCROLL-RESTORE] ⏰ Expired scroll position data removed for match ${matchId}`,
          );
        }
      } else {
        console.log(
          `[SCROLL-RESTORE] 📭 No saved scroll position found for match ${matchId}`,
        );
      }
    } catch (error) {
      console.error("[SCROLL-RESTORE] ❌ Error restoring position:", error);
      // Clean up corrupted data
      localStorage.removeItem(scrollPositionKey);
      sessionStorage.removeItem(scrollPositionKey);
    }

    hasRestoredScrollRef.current = true;
    setIsRestoringScrollPosition(false);
    return false;
  };

  // Save scroll position when navigating away from chat
  useEffect(() => {
    const handleBeforeUnload = () => saveScrollPosition();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveScrollPosition();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveScrollPosition(); // Save on component unmount
    };
  }, [matchId]);

  // Media recording states
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);

  // Image viewer modal states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Message actions states
  const [replyToMessage, setReplyToMessage] = useState<{
    id: number;
    content: string;
    senderName: string;
    isCurrentUser: boolean;
  } | null>(null);

  // Scroll to message functionality
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    number | null
  >(null);

  // Handle audio recording start
  const handleStartRecording = () => {
    setShowAudioRecorder(true);
  };

  // Handle camera capture start
  const handleStartCamera = () => {
    setShowCameraCapture(true);
  };

  // Handle media capture from camera
  const handleMediaCapture = (blob: Blob, type: "image" | "video") => {
    // Close camera UI
    setShowCameraCapture(false);

    if (type === "image") {
      // Handle image capture (similar to file upload)
      handleCapturedImage(blob);
    } else {
      // Handle video capture
      handleCapturedVideo(blob);
    }
  };

  // Process captured image
  const handleCapturedImage = async (blob: Blob) => {
    try {
      // Convert image blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Create a special message format for images
      const imageMessage = `_!_IMAGE_!_${base64}`;

      // Send the image message
      await sendMessage({ content: imageMessage });

      toast({
        title: "Image sent",
        description: "Your camera photo has been sent successfully",
      });
    } catch (error) {
      console.error("Failed to send camera photo:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send camera photo",
        variant: "destructive",
      });
    }
  };

  // Process captured video
  const handleCapturedVideo = async (blob: Blob) => {
    try {
      // Convert video blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Create a special message format for videos
      const videoMessage = `_!_VIDEO_!_${base64}`;

      // Send the video message
      await sendMessage({ content: videoMessage });

      toast({
        title: "Video sent",
        description: "Your video has been sent successfully",
      });
    } catch (error) {
      console.error("Failed to send video:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to send video",
        variant: "destructive",
      });
    }
  };

  // Simplified emoji picker positioning - center screen with high z-index
  const calculateEmojiPickerPosition = () => {
    if (!emojiTriggerRef.current)
      return { side: "top" as const, align: "center" as const };

    const trigger = emojiTriggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Estimated dimensions of emoji picker (320px width, 280px height)
    const pickerHeight = 280;
    const safeMargin = 32; // Increased safe margin for better spacing

    // Calculate available space above and below
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    console.log(
      `🎯 [EMOJI-PICKER-POSITION] Simplified center positioning for emoji picker`,
    );
    console.log(
      `📐 Available space - Above: ${spaceAbove}px, Below: ${spaceBelow}px`,
    );

    // Choose top or bottom based on available space, but always center horizontally
    let optimalSide: "top" | "bottom" = "top";

    if (spaceAbove >= pickerHeight + safeMargin) {
      optimalSide = "top";
      console.log(
        `✅ [EMOJI-PICKER-POSITION] Positioning above with center alignment`,
      );
    } else if (spaceBelow >= pickerHeight + safeMargin) {
      optimalSide = "bottom";
      console.log(
        `✅ [EMOJI-PICKER-POSITION] Positioning below with center alignment`,
      );
    } else {
      // Choose the side with more space
      optimalSide = spaceAbove > spaceBelow ? "top" : "bottom";
      console.log(
        `✅ [EMOJI-PICKER-POSITION] Limited space, using ${optimalSide} with center alignment`,
      );
    }

    // Always center align with collision avoidance
    const optimalAlign: "start" | "center" | "end" = "center";

    console.log(
      `✅ [EMOJI-PICKER-POSITION] Final position: side=${optimalSide}, align=${optimalAlign} (center-focused)`,
    );

    return { side: optimalSide, align: optimalAlign };
  };

  // Handle audio message send
  const handleSendAudioMessage = (
    blob: Blob,
    duration: number,
    url: string,
  ) => {
    // CRITICAL FIX: Add a check to prevent duplicate submissions of the same audio message
    const lastSentKey = `${currentMode}_last_sent_audio_${matchId}`;
    const lastSentObject = safeStorageGetObject<{ time: number }>(lastSentKey);
    let lastSentTime = lastSentObject?.time || 0;

    // If an audio message was sent in the last 5 seconds, don't send it again
    // This prevents duplicate audio recordings when navigating back and forth
    const now = Date.now();
    const isDuplicate = now - lastSentTime < 5000;

    if (isDuplicate) {
      console.log(
        `[DUPLICATE PREVENTION] Blocking duplicate send of audio message (sent ${(now - lastSentTime) / 1000}s ago)`,
      );
      toast({
        title: "Audio already sent",
        description:
          "Please wait a moment before sending another audio message.",
        variant: "default",
      });
      return;
    }

    // Track this audio message as the last sent one
    safeStorageSetObject(lastSentKey, { time: now });

    // Force deduplication before adding a new audio message
    dedupeTriggerRef.current = true;

    // Create a temporary message for UI feedback before sending
    const tempId = -Math.floor(Math.random() * 1000000);
    const tempMessage: MessageWithReactions = {
      id: tempId,
      matchId,
      senderId: user!.id,
      receiverId: otherUser.id,
      content: `Audio message (${Math.floor(duration)} seconds)`,
      messageType: "audio",
      audioUrl: url,
      audioDuration: duration,
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
      sending: true,
    };

    // Add temporary message to the UI immediately
    queryClient.setQueryData<MessageWithReactions[]>(
      ["/api/messages", matchId],
      (old) => [...(old || []), tempMessage],
    );

    // Also update our local state to force immediate UI refresh
    setRemoteMessages((prev) => [...prev, tempMessage]);
    console.log(
      "[UI UPDATE] Added audio message to remoteMessages state:",
      tempMessage.id,
    );

    // Store audio URL in local storage for persistent playback
    safeStorageSet(`${currentMode}_audio_message_${tempId}`, url);

    // Now attempt to send the message
    try {
      // Convert blob to base64 for sending to server
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;

        // Send the audio message
        if (base64data.includes("test-fail-audio")) {
          console.log("Simulating audio message failure for testing");

          // Wait a bit then mark the temp message as failed
          setTimeout(() => {
            queryClient.setQueryData<MessageWithReactions[]>(
              ["/api/messages", matchId],
              (old) =>
                (old || []).map((msg) =>
                  msg.id === tempMessage.id
                    ? { ...msg, sending: false, error: true }
                    : msg,
                ),
            );

            toast({
              title: "Failed to send audio",
              description:
                "Simulated failure for testing. Try the retry button.",
              variant: "destructive",
            });
          }, 2000);
        } else {
          // Store both URL formats to ensure reliable playback
          // For immediate playback in the UI, use the blob URL
          safeStorageSet(`${currentMode}_audio_message_${tempMessage.id}`, url);

          // But also store the base64 data which is more reliable for persistence
          safeStorageSet(
            `${currentMode}_audio_data_${tempMessage.id}`,
            base64data,
          );

          // Mark this temporary message for tracking
          safeStorageSet(
            `${currentMode}_temp_message_${tempMessage.id}`,
            "pending",
          );

          // Normal flow: Send the audio message with the base64 data
          sendMessage({
            content: `Audio message (${Math.floor(duration)} seconds)`,
            messageType: "audio",
            audioUrl: base64data,
            audioDuration: duration,
          });
        }
      };
    } catch (error) {
      console.error("Error sending audio message:", error);
      // Message will be marked as failed by the mutation error handler
    }

    // Hide the audio recorder
    setShowAudioRecorder(false);
  };

  // Handle audio recording cancel
  const handleCancelRecording = () => {
    setShowAudioRecorder(false);
  };

  // Handle image viewer functions
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

  const handleDownloadImage = async () => {
    if (!selectedImage) return;

    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = selectedImage;
      link.download = `charley-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Image is being downloaded to your device",
      });
    } catch (error) {
      console.error("Failed to download image:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the image",
        variant: "destructive",
      });
    }
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImage(null);
  };

  // Handle video viewer functions
  const handleVideoClick = (videoUrl: string) => {
    setSelectedVideo(videoUrl);
    setShowVideoViewer(true);
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
    setSelectedVideo(null);
  };

  // Handle scroll to message functionality
  const handleScrollToMessage = useCallback((messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement && messagesContainerRef.current) {
      // Highlight the message
      setHighlightedMessageId(messageId);

      // Scroll to the message with smooth animation
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  }, []);

  // Chat settings with mode-specific storage keys and fallback via storage utils
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(() => {
    return (
      safeStorageGet(`${currentMode}_chat_read_receipts_${matchId}`) !== "false"
    );
  });

  // Auto-delete settings
  type AutoDeleteMode = "never" | "always" | "custom";
  type AutoDeleteDuration = "minutes" | "hours" | "days" | "weeks" | "months";

  // Auto-delete settings with stronger type validation and defaults - mode-specific
  const [autoDeleteMode, setAutoDeleteMode] = useState<AutoDeleteMode>(() => {
    try {
      const savedMode = safeStorageGet(
        `${currentMode}_chat_auto_delete_mode_${matchId}`,
      );

      if (
        savedMode === "always" ||
        savedMode === "custom" ||
        savedMode === "never"
      ) {
        return savedMode as AutoDeleteMode;
      }
      return "never"; // Default to 'never' if not set or invalid
    } catch (e) {
      console.error("[Setting Error] Failed to get auto-delete mode:", e);
      return "never";
    }
  });

  const [autoDeleteValue, setAutoDeleteValue] = useState<number>(() => {
    try {
      const savedValue = safeStorageGet(
        `${currentMode}_chat_auto_delete_value_${matchId}`,
      );

      if (savedValue) {
        const parsedValue = parseInt(savedValue, 10);
        return !isNaN(parsedValue) && parsedValue > 0 ? parsedValue : 5;
      }
      return 5; // Default value
    } catch (e) {
      console.error("[Setting Error] Failed to get auto-delete value:", e);
      return 5;
    }
  });

  const [autoDeleteUnit, setAutoDeleteUnit] = useState<AutoDeleteDuration>(
    () => {
      try {
        const savedUnit = safeStorageGet(
          `${currentMode}_chat_auto_delete_unit_${matchId}`,
        );

        if (
          savedUnit === "minutes" ||
          savedUnit === "hours" ||
          savedUnit === "days" ||
          savedUnit === "weeks" ||
          savedUnit === "months"
        ) {
          return savedUnit as AutoDeleteDuration;
        }
        return "minutes"; // Default unit
      } catch (e) {
        console.error("[Setting Error] Failed to get auto-delete unit:", e);
        return "minutes";
      }
    },
  );

  // Helper function to calculate expiration time based on duration and unit
  const calculateExpirationTime = (
    value: number,
    unit: AutoDeleteDuration,
  ): number => {
    const now = Date.now();
    switch (unit) {
      case "minutes":
        return now + value * 60 * 1000;
      case "hours":
        return now + value * 60 * 60 * 1000;
      case "days":
        return now + value * 24 * 60 * 60 * 1000;
      case "weeks":
        return now + value * 7 * 24 * 60 * 60 * 1000;
      case "months":
        return now + value * 30 * 24 * 60 * 60 * 1000; // approximate
      default:
        return now + value * 60 * 60 * 1000; // default to hours
    }
  };

  // Load auto-delete settings from backend on component mount
  useEffect(() => {
    if (!matchId || !user) return;

    const loadAutoDeleteSettings = async () => {
      try {
        const response = (await apiRequest(
          `/api/matches/${matchId}/auto-delete-settings`,
        )) as any;
        if (response && response.settings) {
          const {
            autoDeleteMode: backendMode,
            autoDeleteValue: backendValue,
            autoDeleteUnit: backendUnit,
          } = response.settings;

          // Update state if backend settings differ from localStorage
          if (backendMode && backendMode !== autoDeleteMode) {
            setAutoDeleteMode(backendMode);
            localStorage.setItem(
              `${currentMode}_chat_auto_delete_mode_${matchId}`,
              backendMode,
            );
          }

          if (backendValue && backendValue !== autoDeleteValue) {
            setAutoDeleteValue(backendValue);
            localStorage.setItem(
              `${currentMode}_chat_auto_delete_value_${matchId}`,
              backendValue.toString(),
            );
          }

          if (backendUnit && backendUnit !== autoDeleteUnit) {
            setAutoDeleteUnit(backendUnit);
            localStorage.setItem(
              `${currentMode}_chat_auto_delete_unit_${matchId}`,
              backendUnit,
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to load auto-delete settings from backend:",
          error,
        );
        // Continue with localStorage settings if backend fails
      }
    };

    loadAutoDeleteSettings();
  }, [matchId, user, currentMode]);

  // WebSocket channel for this match
  const matchChannel = `match:${matchId}`;

  // Get match details
  const {
    data: matches = [],
    isLoading: isLoadingMatches,
    isError: isMatchError,
  } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    staleTime: 0, // Force fresh data to get updated metadata
  });
  const currentMatch = matches.find((m) => m.id === matchId);
  // CRITICAL FIX: Try to recover match data from localStorage if not found in API response
  // First declare our working variable for the match
  let recoveredMatch = currentMatch;

  if (!recoveredMatch) {
    console.log(
      "⚠️ Match not found in API response, attempting to recover from storage",
    );
    try {
      // First try sessionStorage which is more reliable during navigation
      let backupMatchData = null;
      try {
        backupMatchData = sessionStorage.getItem(`match_data_${matchId}`);
      } catch (e) {
        console.warn(
          `[STORAGE] Error accessing sessionStorage directly for match data: ${e}`,
        );
      }

      // If not found in sessionStorage, use safeStorageGet (which tries localStorage)
      if (!backupMatchData) {
        backupMatchData = safeStorageGet(`match_data_${matchId}`);
      }

      if (backupMatchData) {
        const parsedMatch = JSON.parse(backupMatchData);
        if (parsedMatch && parsedMatch.id === matchId) {
          console.log("✅ Successfully recovered match data from storage");
          recoveredMatch = parsedMatch;

          // Update the query cache with this data so future renders use it
          const existingMatches =
            queryClient.getQueryData<Match[]>(["/api/matches"]) || [];
          // Only add if not already present (by ID)
          if (!existingMatches.some((m) => m.id === parsedMatch.id)) {
            queryClient.setQueryData(
              ["/api/matches"],
              [...existingMatches, parsedMatch],
            );
          }

          // Also trigger a background refresh for next time
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
          }, 2000);

          // Store in both storages for redundancy
          safeStorageSet(`match_data_${matchId}`, JSON.stringify(parsedMatch));
          // Also explicitly try sessionStorage for redundancy
          try {
            sessionStorage.setItem(
              `match_data_${matchId}`,
              JSON.stringify(parsedMatch),
            );
          } catch (e) {
            console.warn(
              `[STORAGE] Failed to save match data to sessionStorage: ${e}`,
            );
          }
        }
      }
    } catch (e) {
      console.error("Error recovering match data from storage:", e);
    }
  }

  // Create a stable reference to track message restoration
  const hasRestoredMessagesRef = useRef(false);
  const hasSetInitialMessagesRef = useRef(false);
  const cachedMessagesRef = useRef<MessageWithReactions[]>([]);
  const mergeInProgressRef = useRef(false);
  const dedupeTriggerRef = useRef(false);

  // CRITICAL FIX: Restore messages with multi-storage strategy
  useEffect(() => {
    if (!matchId || hasRestoredMessagesRef.current) return;

    // CRITICAL BUG FIX: Always set flag immediately at the start of restoration
    // This prevents the loading state from showing when navigating between chats
    hasSetInitialMessagesRef.current = true;

    console.log(
      `[FIX] Attempting to restore messages for match ${matchId} in mode ${currentMode} with improved strategy`,
    );

    // CRITICAL FIX: Check navigation-safe storage first
    try {
      const navigationSafeKey = `navigation_safe_messages_${matchId}`;
      let navigationSafeData = null;

      try {
        navigationSafeData = sessionStorage.getItem(navigationSafeKey);
      } catch (e) {
        console.warn(`[STORAGE] Error accessing navigation-safe storage: ${e}`);
      }

      if (navigationSafeData) {
        try {
          const data = JSON.parse(navigationSafeData);

          if (
            data &&
            data.messages &&
            Array.isArray(data.messages) &&
            data.messages.length > 0
          ) {
            console.log(
              `[CRITICAL FIX] Found ${data.messages.length} messages in navigation-safe storage! This should fix disappearing messages.`,
            );

            // REPLY FIX: Reconstruct reply objects for stored messages that might be missing them
            const messagesWithReplyData = data.messages.map(
              (msg: MessageWithReactions) => {
                // If message has reply fields but no replyToMessage object, reconstruct it
                if (
                  msg.replyToMessageId &&
                  msg.replyToContent &&
                  !msg.replyToMessage
                ) {
                  return {
                    ...msg,
                    replyToMessage: {
                      id: msg.replyToMessageId,
                      content: msg.replyToContent,
                      senderName: msg.replyToSenderName || "Unknown",
                      isCurrentUser: msg.replyToIsCurrentUser || false,
                    },
                  };
                }
                return msg;
              },
            );

            console.log(
              "[REPLY-FIX] Reconstructed reply data for restored messages",
            );

            // Set these messages to the cache immediately
            cachedMessagesRef.current = messagesWithReplyData;
            queryClient.setQueryData(
              ["/api/messages", matchId],
              messagesWithReplyData,
            );

            // Also update our local state
            setRemoteMessages(messagesWithReplyData);

            // Mark as restored
            hasRestoredMessagesRef.current = true;
            hasSetInitialMessagesRef.current = true;

            // No automatic scroll - position will be restored by scroll position system
            console.log(
              "[CRITICAL FIX] Successfully restored messages from navigation-safe storage",
            );
            return;
          }
        } catch (parseError) {
          console.error(
            "[ERROR] Failed to parse navigation-safe data:",
            parseError,
          );
        }
      }
    } catch (navigationError) {
      console.warn(
        "[WARNING] Error accessing navigation-safe storage:",
        navigationError,
      );
    }

    // Second, check standard sessionStorage
    try {
      const sessionKey = `${currentMode}_session_messages_${matchId}`;
      let sessionData = null;
      try {
        sessionData = sessionStorage.getItem(sessionKey);
      } catch (e) {
        console.warn(`[STORAGE] Error accessing sessionStorage directly: ${e}`);
      }

      if (sessionData) {
        try {
          const data = JSON.parse(sessionData);

          if (
            data &&
            data.messages &&
            Array.isArray(data.messages) &&
            data.messages.length > 0
          ) {
            console.log(
              `[FIX] Found ${data.messages.length} messages in sessionStorage! This should fix disappearing messages.`,
            );

            // Set these messages to the cache immediately
            cachedMessagesRef.current = data.messages;
            queryClient.setQueryData(["/api/messages", matchId], data.messages);

            // Also update our local state
            setRemoteMessages(data.messages);

            // Mark as restored
            hasRestoredMessagesRef.current = true;
            hasSetInitialMessagesRef.current = true;

            // No automatic scroll - position will be restored by scroll position system
            console.log(
              "[FIX] Successfully restored messages from sessionStorage",
            );
            return;
          }
        } catch (parseError) {
          console.error("[ERROR] Failed to parse session data:", parseError);
        }
      }

      console.log(
        "[FIX] No session data found or session data invalid, falling back to localStorage",
      );
    } catch (sessionError) {
      console.warn("[WARNING] Error accessing sessionStorage:", sessionError);
    }

    // Fallback to localStorage if sessionStorage didn't work
    try {
      const storageKey = `${currentMode}_chat_messages_${matchId}`;
      const storedData = safeStorageGet(storageKey);

      if (!storedData) {
        console.log(
          `[FIX] No saved messages found in localStorage for match ${matchId} in mode ${currentMode}`,
        );
        hasRestoredMessagesRef.current = true;
        return;
      }

      // Parse the data with error handling
      try {
        const data = JSON.parse(storedData);

        // Basic validation of structure
        if (!data || !data.messages || !Array.isArray(data.messages)) {
          console.log("[DEBUG] Invalid message data structure in localStorage");
          localStorage.removeItem(storageKey);
          hasRestoredMessagesRef.current = true;
          return;
        }

        const savedMessages = data.messages;
        const expiresAt = data.expiresAt;

        // Handle message expiration and preservation flags
        const originalAutoDeleteMode = data.originalAutoDeleteMode;
        const preservedFromDelete = data.preservedFromDelete;

        // Case 1: If messages were preserved from 'always' mode during navigation
        if (
          preservedFromDelete &&
          originalAutoDeleteMode === "always" &&
          autoDeleteMode === "always"
        ) {
          console.log(
            "[DEBUG] Found messages preserved from always mode - respecting current mode selection",
          );
          // We'll still restore them but user's preference is still 'always'
        }
        // Case 2: Handle expiration for custom mode
        else if (
          autoDeleteMode === "custom" &&
          expiresAt &&
          Date.now() > expiresAt
        ) {
          console.log("[DEBUG] Cached messages expired, removing");
          localStorage.removeItem(storageKey);
          hasRestoredMessagesRef.current = true;
          return;
        }

        // Process and validate messages
        const validMessages = savedMessages
          .filter(
            (msg: any) =>
              msg &&
              typeof msg === "object" &&
              msg.id &&
              msg.matchId === matchId,
          )
          .map((msg: any) => {
            // Fix invalid timestamps
            if (!msg.createdAt || isNaN(new Date(msg.createdAt).getTime())) {
              return {
                ...msg,
                createdAt: new Date().toISOString(),
                _fixedCreatedAt: true,
              };
            }
            return msg;
          });

        if (validMessages.length === 0) {
          console.log("[DEBUG] No valid messages after filtering");
          hasRestoredMessagesRef.current = true;
          return;
        }

        console.log(
          `[DEBUG] Successfully loaded ${validMessages.length} messages from localStorage for match ${matchId}`,
        );

        // Store in our stable ref to use later
        cachedMessagesRef.current = validMessages;

        // Set messages to the cache immediately, before API call
        queryClient.setQueryData(["/api/messages", matchId], validMessages);

        // Mark as properly restored
        hasRestoredMessagesRef.current = true;
        hasSetInitialMessagesRef.current = true;

        // No automatic scroll - position will be restored by scroll position system
      } catch (error) {
        console.error("[ERROR] Failed to parse stored messages:", error);
        localStorage.removeItem(storageKey);
        hasRestoredMessagesRef.current = true;
      }
    } catch (error) {
      console.error(
        "[ERROR] Failed to restore messages from localStorage:",
        error,
      );
      hasRestoredMessagesRef.current = true;
    }
  }, [matchId, currentMode, autoDeleteMode, queryClient]);
  // Add event listener for real-time message updates
  useEffect(() => {
    if (!matchId) return;

    // Function to handle new messages from WebSocket
    const handleNewMessage = async (event: Event) => {
      // Cast to CustomEvent to get the detail property
      const customEvent = event as CustomEvent;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const message = customEvent.detail.message;
      const isForRecipient = customEvent.detail.for === "recipient";
      const eventId =
        customEvent.detail.eventId || `fallback_${message.id}_${Date.now()}`;

      // Critical Debug for Double Counting Issue
      console.log(
        `[DEBUG-DOUBLE-COUNT] Processing event for match=${matchId}, message=${message.id}, eventId=${eventId}`,
      );

      // FLICKER FIX: For sender messages, check if this might conflict with optimistic updates
      if (user && message.senderId === user.id) {
        // Check if this message was recently sent by the current user
        const recentSentKey = `recent_sent_${message.matchId}_${user.id}`;
        const recentSentData = sessionStorage.getItem(recentSentKey);

        if (recentSentData) {
          try {
            const parsed = JSON.parse(recentSentData);
            const timeDiff = Date.now() - parsed.timestamp;

            // If this message matches recent sending activity within 5 seconds, it might be causing flicker
            if (timeDiff < 5000 && parsed.content === message.content) {
              console.log(
                `[FLICKER-FIX] Detected potential flicker-causing message from sender ${user.id}, using gentle merge`,
              );

              // Use a gentle approach - just update the message if it exists, don't add duplicates
              setRemoteMessages((prevMessages) => {
                const messageExists = prevMessages.some(
                  (m) => m.id === message.id,
                );
                if (messageExists) {
                  return prevMessages.map((m) =>
                    m.id === message.id ? { ...message, sending: false } : m,
                  );
                } else {
                  // Remove any temporary sending messages with matching content
                  const filtered = prevMessages.filter(
                    (m) =>
                      !(
                        m.sending &&
                        m.content === message.content &&
                        m.senderId === user.id
                      ),
                  );
                  return [...filtered, { ...message, sending: false }];
                }
              });
              return; // Exit early to prevent flicker
            }
          } catch (e) {
            // Continue with normal processing if parsing fails
          }
        }
      }

      // FIX FOR DOUBLE-COUNTING: Check if we've already processed this specific event instance
      const instanceKey = `event_instance_${eventId}_${matchId}`;
      if (sessionStorage.getItem(instanceKey)) {
        console.log(
          `[DUPLICATE EVENT] Already processed event ${eventId} for match ${matchId}`,
        );
        return;
      }

      // Mark this specific event instance as processed for this match
      sessionStorage.setItem(instanceKey, "processed");

      // CRITICAL DECISION POINT - Skip if this is not meant for the recipient view
      // This prevents duplicate display of messages across the sender/recipient boundary
      if (!isForRecipient && user && message.senderId === user.id) {
        console.log(
          `[DUPLICATE PREVENTION] Skipping sender message display in recipient flow`,
        );
        return;
      }

      // Verify this message is for our match
      if (message.matchId !== matchId) {
        console.log(
          `[MATCH MISMATCH] Message for match ${message.matchId}, we're viewing ${matchId}`,
        );
        return;
      }

      // Verify user is involved in the message
      if (
        !user ||
        (message.senderId !== user.id && message.receiverId !== user.id)
      ) {
        console.log(`[USER MISMATCH] Message not for current user ${user?.id}`);
        return;
      }

      console.log(
        `[REAL-TIME EVENT] Processing message event for matchId=${matchId}, message ID=${message.id}`,
      );

      try {
        // GLOBAL DEDUPLICATION: Use our global system to check for duplicates
        // Dynamically import to avoid circular dependencies
        const messageDedupeModule = await import("@/lib/message-deduplication");

        // Check if this message is a duplicate using the global system
        const isDuplicate = messageDedupeModule.isMessageDuplicate(
          message.id,
          message.content || "",
          message.senderId,
          message.matchId,
        );

        if (isDuplicate) {
          console.log(
            `[GLOBAL-DEDUP] Message ${message.id} detected as duplicate by global system, skipping`,
          );
          return;
        }

        console.log(
          `[GLOBAL-DEDUP] Message ${message.id} verified as unique by global system`,
        );

        // For backward compatibility, also update legacy fingerprinting
        const messageContent = message.content || "";
        const contentFingerprint = `${message.senderId}_${message.matchId}_${messageContent.substring(0, 50)}`;
        const contentFingerprintKey = `content_fingerprint_${contentFingerprint}`;

        // Store the fingerprint in both session and local storage for robustness
        sessionStorage.setItem(contentFingerprintKey, Date.now().toString());
        try {
          localStorage.setItem(
            `permanent_${contentFingerprintKey}`,
            Date.now().toString(),
          );
        } catch (e) {
          // Ignore storage errors
        }

        // Create a more specific tracking key that considers the component instance
        // This helps when multiple chat components might be rendered at once
        const messageInstanceKey = `message_instance_${matchId}_${message.id}`;

        // Mark this specific instance as having displayed the message
        sessionStorage.setItem(messageInstanceKey, Date.now().toString());

        // For legacy compatibility, also check global display status
        const messageGlobalKey = `message_global_${message.id}`;
        if (!sessionStorage.getItem(messageGlobalKey)) {
          sessionStorage.setItem(messageGlobalKey, Date.now().toString());

          console.log(
            `[REAL-TIME] Displaying new message ID ${message.id} in UI for match ${matchId}`,
          );

          // Update local state with the new message, with enhanced duplicate checking
          setRemoteMessages((prevMessages) => {
            // Advanced duplicate checking - check both ID and content
            const isDuplicate = prevMessages.some(
              (m) =>
                // Check by ID
                m.id === message.id ||
                // Check by content for same sender in same match
                (m.senderId === message.senderId &&
                  m.matchId === message.matchId &&
                  m.content === message.content &&
                  // Only compare messages sent within last 60 seconds to avoid false positives
                  Math.abs(
                    new Date(m.createdAt).getTime() -
                      new Date(message.createdAt).getTime(),
                  ) < 60000),
            );

            if (isDuplicate) {
              console.log(
                `[ENHANCED DEDUP] Message already exists in state with same ID or content, not adding again`,
              );
              return prevMessages;
            }

            // Add to deduplication cache for future reference
            if (eventHandlersRef.current.messageDeduplicationCache) {
              eventHandlersRef.current.messageDeduplicationCache.add(
                message.id,
              );
            }

            // Safe to add message - store a permanent record of this content fingerprint
            localStorage.setItem(
              `permanent_${contentFingerprintKey}`,
              Date.now().toString(),
            );

            const newMessages = [...prevMessages, message].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );

            // Schedule scroll to bottom
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);

            return newMessages;
          });
        } else {
          console.log(
            `[DUPLICATE] Message ${message.id} already displayed globally, skipping`,
          );
        }
      } catch (error) {
        console.error("[GLOBAL-DEDUP] Error in global deduplication:", error);

        // Fallback to legacy deduplication if global system fails
        console.log(
          "[GLOBAL-DEDUP] Falling back to legacy deduplication system",
        );

        // Create a more specific tracking key that considers the component instance
        const messageInstanceKey = `message_instance_${matchId}_${message.id}`;

        // Check if this specific component instance has already displayed this message
        if (sessionStorage.getItem(messageInstanceKey)) {
          console.log(
            `[DUPLICATE] Message ${message.id} already displayed in this instance, skipping`,
          );
          return;
        }
      }
    };

    // CRITICAL FIX FOR RE-ENTRY DUPLICATION:
    // 1. Store reference to handler in ref for proper cleanup between renders
    // 2. Save unique ID of this component instance to detect event duplicates

    // Store the handler directly in the ref to ensure proper cleanup
    // Cast to unknown first to avoid TypeScript errors when using async handlers with event listeners
    eventHandlersRef.current.handleNewMessageEvent =
      handleNewMessage as unknown as EventListener;

    // Generate unique ID for this component instance if not already set
    const chatInstanceKey = `chat_instance_${matchId}_${Date.now()}`;
    sessionStorage.setItem(`active_chat_${matchId}`, chatInstanceKey);
    console.log(
      `[DUPLICATION FIX] Registered chat instance: ${chatInstanceKey}`,
    );

    // Handler for unmatch notifications from WebSocket
    const handleUnmatch = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;

      const { matchId: unmatchedId, unmatchedBy, timestamp } = event.detail;

      // Only handle if this event is for the current match
      if (unmatchedId === matchId) {
        console.log(
          `🔥 Unmatch notification received for current match ${unmatchedId}, unmatchedBy: ${unmatchedBy}, at ${timestamp}`,
        );

        // No toast notification - seamless unmatch experience
        console.log(
          "[UNMATCH-PERFORMANCE] WebSocket unmatch notification handled silently",
        );

        // Save any pending messages or state before redirecting
        try {
          const existingMessages = queryClient.getQueryData<
            MessageWithReactions[]
          >(["/api/messages", matchId]);
          if (existingMessages && existingMessages.length > 0) {
            const uniqueMessages = deduplicateMessages(existingMessages);
            sessionStorage.setItem(
              `unmatch_messages_backup_${matchId}`,
              JSON.stringify(uniqueMessages),
            );
            console.log(
              `[UNMATCH] Saved ${uniqueMessages.length} messages before redirect`,
            );
          }
        } catch (err) {
          console.error("[UNMATCH] Failed to backup messages:", err);
        }

        // Parallel cache optimization for better performance
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/matches"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] }),
          queryClient.removeQueries({ queryKey: ["/api/messages", matchId] }),
        ]).catch((error) => {
          console.warn(
            "[UNMATCH-PERFORMANCE] WebSocket cache operation error:",
            error,
          );
        });

        // Redirect to messages page
        console.log(
          `[UNMATCH] Redirecting to messages page after unmatch of match ${unmatchedId}`,
        );
        // Use the setLocation function passed to the component
        goToLastAppMessages();
      }
    };

    // Handle message deletion events from WebSocket
    const handleMessageDeleted = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;

      const { messageId, matchId: deletedMatchId, deletedBy } = event.detail;

      // Only handle if this event is for the current match
      if (deletedMatchId === matchId) {
        console.log(
          `📡 WebSocket: Message deletion notification received for message ${messageId} in match ${deletedMatchId}, deleted by user ${deletedBy}`,
        );

        // Check if this is our own deletion (to avoid conflicts with optimistic updates)
        if (deletedBy === user?.id) {
          console.log(
            `📡 WebSocket: Ignoring self-deletion event for message ${messageId} - already handled by optimistic update`,
          );
          return;
        }

        // Check if message still exists before processing deletion
        const currentMessages = queryClient.getQueryData<
          MessageWithReactions[]
        >(["/api/messages", matchId]);
        const messageExists = currentMessages?.find(
          (msg) => msg.id === messageId,
        );

        if (!messageExists) {
          console.log(
            `📡 WebSocket: Message ${messageId} already removed from local state - skipping duplicate deletion`,
          );
          return;
        }

        console.log(
          `📡 WebSocket: Processing deletion for message ${messageId} from other user`,
        );

        // Remove message from local state immediately
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) => {
            const filtered = (old || []).filter((msg) => msg.id !== messageId);
            console.log(
              `📡 WebSocket: Removed message ${messageId} from cache via WebSocket. Messages remaining:`,
              filtered.length,
            );
            return filtered;
          },
        );

        // Clear from local storage as well
        try {
          const storageKey = `${currentMode}_messages_${matchId}`;
          const storedMessages = safeStorageGet(storageKey);
          if (storedMessages) {
            const parsed = JSON.parse(storedMessages);
            const filtered = parsed.filter((msg: any) => msg.id !== messageId);
            safeStorageSet(storageKey, JSON.stringify(filtered));
            console.log(
              `📡 WebSocket: Cleared message ${messageId} from local storage`,
            );
          }
        } catch (storageError) {
          console.warn(
            "Could not clear deleted message from local storage:",
            storageError,
          );
        }

        // Show notification since the message was deleted by the other user
        toast({
          title: "Message removed",
          description: "A message was unsent by the sender",
          variant: "default",
        });

        // Optional: Force refresh after a delay to ensure consistency
        setTimeout(() => {
          console.log(
            `📡 WebSocket: Force refreshing cache for match ${matchId} after WebSocket deletion`,
          );
          queryClient.invalidateQueries({
            queryKey: ["/api/messages", matchId],
          });
        }, 1000);
      }
    };

    // Handle reaction events from WebSocket
    const handleReactionAdded = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;

      const {
        messageId,
        userId,
        emoji,
        matchId: reactionMatchId,
        reaction,
        isReplacement,
      } = event.detail;

      // Only handle if this event is for the current match
      if (reactionMatchId === matchId) {
        console.log(
          `🎉 Reaction added notification received for message ${messageId} in match ${reactionMatchId}`,
        );

        // Update the message with the new reaction
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) =>
            (old || []).map((msg) => {
              if (msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                const existingReaction = existingReactions.find(
                  (r) => r.emoji === emoji,
                );

                // 🎯 SURGICAL FIX: First remove any existing reactions from this user
                const reactionUserName = reaction.userName || "Someone";
                console.log(
                  `🔄 [CLIENT-DEBUG] Processing reaction from ${reactionUserName}, emoji: ${emoji}, messageId: ${messageId}`,
                );
                console.log(
                  `🔍 [CLIENT-DEBUG] Existing reactions before removal:`,
                  existingReactions,
                );

                const reactionsWithoutUserReactions = existingReactions
                  .map((r) => ({
                    ...r,
                    count: Math.max(
                      0,
                      r.count - (r.users.includes(reactionUserName) ? 1 : 0),
                    ),
                    users: r.users.filter((u) => u !== reactionUserName),
                  }))
                  .filter((r) => r.count > 0); // Remove empty reactions

                console.log(
                  `🧹 [CLIENT-DEBUG] Reactions after removing user ${reactionUserName}:`,
                  reactionsWithoutUserReactions,
                );

                // Now add the new reaction
                const existingEmojiReaction =
                  reactionsWithoutUserReactions.find((r) => r.emoji === emoji);

                console.log(
                  `🔍 [CLIENT-DEBUG] Found existing emoji reaction for ${emoji}:`,
                  existingEmojiReaction,
                );

                if (existingEmojiReaction) {
                  // Add user to existing emoji reaction
                  return {
                    ...msg,
                    reactions: reactionsWithoutUserReactions.map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            count: r.count + 1,
                            users: [...r.users, reactionUserName],
                          }
                        : r,
                    ),
                  };
                } else {
                  // Create new emoji reaction
                  return {
                    ...msg,
                    reactions: [
                      ...reactionsWithoutUserReactions,
                      {
                        emoji,
                        count: 1,
                        users: [reactionUserName],
                      },
                    ],
                  };
                }
              }
              return msg;
            }),
        );
      }
    };

    const handleReactionRemoved = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;

      const {
        messageId,
        userId,
        emoji,
        matchId: reactionMatchId,
        userName,
      } = event.detail;

      // Only handle if this event is for the current match
      if (reactionMatchId === matchId) {
        console.log(
          `🗑️ Reaction removed notification received for message ${messageId} in match ${reactionMatchId}`,
        );

        // Update the message by removing the reaction
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) =>
            (old || []).map((msg) => {
              if (msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                return {
                  ...msg,
                  reactions: existingReactions
                    .map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            count: Math.max(0, r.count - 1),
                            users: r.users.filter(
                              (u) =>
                                u !== (userName || user?.fullName || "You"),
                            ),
                          }
                        : r,
                    )
                    .filter((r) => r.count > 0), // Remove reactions with 0 count
                };
              }
              return msg;
            }),
        );
      }
    };

    // Use the handlers directly to register the event listeners
    // Cast to unknown first to avoid TypeScript errors when using async handlers with event listeners
    window.addEventListener(
      "message:new",
      handleNewMessage as unknown as EventListener,
    );
    window.addEventListener(
      "match:unmatch",
      handleUnmatch as unknown as EventListener,
    );
    window.addEventListener(
      "message:deleted",
      handleMessageDeleted as unknown as EventListener,
    );
    window.addEventListener(
      "reaction:added",
      handleReactionAdded as unknown as EventListener,
    );
    window.addEventListener(
      "reaction:removed",
      handleReactionRemoved as unknown as EventListener,
    );

    // Store the handlers in the ref to ensure proper cleanup
    eventHandlersRef.current.handleUnmatchEvent =
      handleUnmatch as unknown as EventListener;
    eventHandlersRef.current.handleMessageDeletedEvent =
      handleMessageDeleted as unknown as EventListener;
    eventHandlersRef.current.handleReactionAddedEvent =
      handleReactionAdded as unknown as EventListener;
    eventHandlersRef.current.handleReactionRemovedEvent =
      handleReactionRemoved as unknown as EventListener;

    // ENHANCED CLEANUP: Save message state and clean up listeners properly
    return () => {
      // Remove message event listener using stored reference from ref
      if (eventHandlersRef.current.handleNewMessageEvent) {
        window.removeEventListener(
          "message:new",
          eventHandlersRef.current.handleNewMessageEvent,
        );
        console.log(
          `[CLEANUP] Removed message:new event listener for match ${matchId}`,
        );
      }

      // Remove unmatch event listener using stored reference from ref
      if (eventHandlersRef.current.handleUnmatchEvent) {
        window.removeEventListener(
          "match:unmatch",
          eventHandlersRef.current.handleUnmatchEvent,
        );
        console.log(
          `[CLEANUP] Removed match:unmatch event listener for match ${matchId}`,
        );
      }

      // Remove message deleted event listener using stored reference from ref
      if (eventHandlersRef.current.handleMessageDeletedEvent) {
        window.removeEventListener(
          "message:deleted",
          eventHandlersRef.current.handleMessageDeletedEvent,
        );
        console.log(
          `[CLEANUP] Removed message:deleted event listener for match ${matchId}`,
        );
      }

      // Remove reaction event listeners using stored references from ref
      if (eventHandlersRef.current.handleReactionAddedEvent) {
        window.removeEventListener(
          "reaction:added",
          eventHandlersRef.current.handleReactionAddedEvent,
        );
        console.log(
          `[CLEANUP] Removed reaction:added event listener for match ${matchId}`,
        );
      }

      if (eventHandlersRef.current.handleReactionRemovedEvent) {
        window.removeEventListener(
          "reaction:removed",
          eventHandlersRef.current.handleReactionRemovedEvent,
        );
        console.log(
          `[CLEANUP] Removed reaction:removed event listener for match ${matchId}`,
        );
      }

      // Save our current message state to persist across navigation
      try {
        const existingMessages = queryClient.getQueryData<
          MessageWithReactions[]
        >(["/api/messages", matchId]);
        if (existingMessages && existingMessages.length > 0) {
          // Use our deduplication function before storing
          const uniqueMessages = deduplicateMessages(existingMessages);
          sessionStorage.setItem(
            `chat_messages_${matchId}`,
            JSON.stringify(uniqueMessages),
          );
          console.log(
            `[CLEANUP] Saved ${uniqueMessages.length} deduplicated messages to session storage`,
          );
        }
      } catch (e) {
        console.error("[CLEANUP] Error saving message state:", e);
      }

      // Remove our instance ID from active chats
      sessionStorage.removeItem(`active_chat_${matchId}`);
    };
  }, [matchId, user, queryClient]);

  // ACTIVE CHAT STATUS TRACKING - Explicit effect to manage user's "in chat" status
  // This is critical for showing the "In Chat" indicator to the other user in real-time
  useEffect(() => {
    if (isConnected && matchId) {
      // Tell the server that the user is actively viewing this chat
      console.log(
        `[PRESENCE] Setting active chat status to TRUE for match ${matchId}`,
      );
      setActiveChatStatus(matchId, true);

      // Store the current viewing state to prevent auto-deletion
      // when navigating within the app (only delete when app is closed)
      safeStorageSet(`${currentMode}_chat_viewing_${matchId}`, "true");

      // Return cleanup function to tell server user left this chat
      return () => {
        console.log(
          `[PRESENCE] Setting active chat status to FALSE for match ${matchId}`,
        );
        setActiveChatStatus(matchId, false);

        // Clear viewing state when component unmounts
        safeStorageSet(`${currentMode}_chat_viewing_${matchId}`, "false");
      };
    }
  }, [isConnected, matchId, setActiveChatStatus, currentMode]);
  // CRITICAL MOUNT/UNMOUNT LOGIC FOR MESSAGE PERSISTENCE
  useEffect(() => {
    console.log(
      `[COMPONENT-LIFECYCLE] RealTimeChat MOUNTED for match ${matchId}`,
    );

    // CRITICAL FIX: Reset message session ID when changing matches to prevent cross-match duplicate detection
    const messageSessionKey = `${currentMode}_message_session_id`;
    const oldSessionId = safeStorageGet(messageSessionKey);

    const newSessionId =
      Date.now().toString() + Math.random().toString(36).substring(2, 15);

    // Store with safe utilities
    safeStorageSet(messageSessionKey, newSessionId);

    // Add enhanced logging to track session changes
    if (oldSessionId) {
      console.log(
        `[ENHANCED DUPLICATE] Changed session ID from ${oldSessionId.substring(0, 8)}... to ${newSessionId.substring(0, 8)}...`,
      );
    } else {
      console.log(
        `[ENHANCED DUPLICATE] Created new match-specific session ID: ${newSessionId.substring(0, 8)}...`,
      );
    }

    // Add global tracking of all sessions for additional debugging
    try {
      const allSessionsKey = `${currentMode}_all_sessions`;
      const existingData = safeStorageGet(allSessionsKey);

      let sessions = [];

      if (existingData) {
        sessions = JSON.parse(existingData);
      }

      sessions.push({
        matchId: matchId,
        sessionId: newSessionId,
        timestamp: Date.now(),
        previousSessionId: oldSessionId || null,
      });

      // Keep only the last 10 sessions to prevent storage bloat
      if (sessions.length > 10) {
        sessions = sessions.slice(-10);
      }

      // Store in storage with fallback
      safeStorageSet(allSessionsKey, JSON.stringify(sessions));
    } catch (e) {
      console.error(
        "[ENHANCED DUPLICATE] Error storing session tracking data:",
        e,
      );
    }

    // SIMPLE DIRECT SOLUTION: Trigger an immediate refetch to bypass all caches
    console.log(
      "[SERVER-FETCH] Triggering immediate message refetch to ensure fresh data",
    );

    // Simplified approach: Just trigger the refetch we set up in the useQuery above
    // The useQuery is configured to always bypass caches
    refetchMessages();

    // Keep this as a backup system in case the refetch fails or is delayed
    const forcedLoadTimer = setTimeout(() => {
      console.log("[DOUBLE-CHECK] Verifying messages were properly loaded");

      // Get current messages after the refetch attempt
      const currentMessages = queryClient.getQueryData<MessageWithReactions[]>([
        "/api/messages",
        matchId,
      ]);

      // If we don't have messages or match data shows we should have more, force a reload
      const shouldForceReload =
        !currentMessages ||
        currentMessages.length === 0 ||
        // Also check if we have the right number of messages based on message properties
        (currentMessages &&
          currentMessages.length > 0 &&
          !currentMessages[0].matchId);

      if (shouldForceReload) {
        console.log(
          "[FORCE-LOAD] " +
            (!currentMessages || currentMessages.length === 0
              ? "No messages found in cache"
              : "Messages may be incomplete or corrupted") +
            ", attempting direct server fetch",
        );

        // Perform a direct fetch with the correct match-specific endpoint
        fetch(`/api/messages/${matchId}?_=${Date.now()}`, {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })
          .then((response) => {
            if (response.ok) return response.json();
            throw new Error(`Server returned ${response.status}`);
          })
          .then((data) => {
            // The API returns messages directly for this match, not wrapped in an array
            if (Array.isArray(data) && data.length > 0) {
              console.log(
                `[FORCE-LOAD] Successfully fetched ${data.length} messages from server`,
              );

              // Update the query cache
              queryClient.setQueryData(["/api/messages", matchId], data);

              // Update our local state
              setRemoteMessages(data);

              // Store in our permanent storage - critically important for persistence
              const storageKey = `${currentMode}_chat_messages_${matchId}`;
              const sessionKey = `${currentMode}_session_messages_${matchId}`;

              const dataToStore = JSON.stringify({
                messages: data,
                savedAt: Date.now(),
                matchId,
                source: "force-load",
              });

              try {
                // Save to both storages for maximum persistence
                localStorage.setItem(storageKey, dataToStore);
                sessionStorage.setItem(sessionKey, dataToStore);
                console.log(
                  `[FORCE-LOAD] Saved ${data.length} messages to both storage types`,
                );

                // Update our cached messages reference for potential future use
                cachedMessagesRef.current = data;
              } catch (e) {
                console.error(
                  "[FORCE-LOAD] Failed to save server messages:",
                  e,
                );
                // Try a reduced set if storage quota is an issue
                try {
                  const reducedMessages = data.slice(-50); // Keep only last 50 messages
                  const reducedData = JSON.stringify({
                    messages: reducedMessages,
                    savedAt: Date.now(),
                    matchId,
                    source: "force-load-reduced",
                  });
                  localStorage.setItem(storageKey, reducedData);
                  sessionStorage.setItem(sessionKey, reducedData);
                } catch (e2) {
                  console.error(
                    "[FORCE-LOAD] Failed to save even reduced messages:",
                    e2,
                  );
                }
              }
            }
          })
          .catch((error) => {
            console.error("[FORCE-LOAD] Failed to fetch messages:", error);

            // Recovery strategy on API failure: try to use stored messages from any source
            try {
              // First look for any matches in localStorage
              const localStorageKeys = Object.keys(localStorage).filter(
                (k) => k.includes(`${matchId}`) && k.includes("messages"),
              );

              for (const key of localStorageKeys) {
                try {
                  const data = localStorage.getItem(key);
                  if (data) {
                    const parsed = JSON.parse(data);
                    const messages = Array.isArray(parsed)
                      ? parsed
                      : parsed.messages || [];

                    if (
                      Array.isArray(messages) &&
                      messages.length > 0 &&
                      messages[0].matchId === matchId
                    ) {
                      console.log(
                        `[RECOVERY] Found ${messages.length} messages in localStorage at ${key}`,
                      );

                      // Update React Query cache
                      queryClient.setQueryData(
                        ["/api/messages", matchId],
                        messages,
                      );

                      // Update component state
                      setRemoteMessages(messages);
                      return;
                    }
                  }
                } catch (e) {
                  console.warn(
                    `[RECOVERY] Failed to parse localStorage key ${key}:`,
                    e,
                  );
                }
              }

              // Then try sessionStorage as a last resort
              const sessionStorageKeys = Object.keys(sessionStorage).filter(
                (k) => k.includes(`${matchId}`) && k.includes("messages"),
              );

              for (const key of sessionStorageKeys) {
                try {
                  const data = sessionStorage.getItem(key);
                  if (data) {
                    const parsed = JSON.parse(data);
                    const messages = Array.isArray(parsed)
                      ? parsed
                      : parsed.messages || [];

                    if (
                      Array.isArray(messages) &&
                      messages.length > 0 &&
                      messages[0].matchId === matchId
                    ) {
                      console.log(
                        `[RECOVERY] Found ${messages.length} messages in sessionStorage at ${key}`,
                      );

                      // Update React Query cache
                      queryClient.setQueryData(
                        ["/api/messages", matchId],
                        messages,
                      );

                      // Update component state
                      setRemoteMessages(messages);
                      return;
                    }
                  }
                } catch (e) {
                  console.warn(
                    `[RECOVERY] Failed to parse sessionStorage key ${key}:`,
                    e,
                  );
                }
              }

              console.error(
                "[RECOVERY] No valid messages found in any storage after API failure",
              );
            } catch (recoveryError) {
              console.error(
                "[RECOVERY] Error during recovery attempt:",
                recoveryError,
              );
            }
          });
      } else {
        console.log(
          `[MOUNT-CHECK] Found ${currentMessages.length} messages in cache on mount`,
        );
      }
    }, 1000); // Allow the normal initialData to run first

    // Cleanup function
    return () => {
      clearTimeout(forcedLoadTimer);
      console.log(
        `[COMPONENT-LIFECYCLE] RealTimeChat UNMOUNTED for match ${matchId}`,
      );

      // CRITICAL: Make sure we save messages on unmount as final backup
      try {
        const messagesAtUnmount = queryClient.getQueryData<
          MessageWithReactions[]
        >(["/api/messages", matchId]);
        if (messagesAtUnmount && messagesAtUnmount.length > 0) {
          // Save to both storage types with a special key
          const unmountData = JSON.stringify({
            messages: messagesAtUnmount,
            timestamp: Date.now(),
            unmount: true,
          });

          // Use safer storage to prevent quota issues at critical unmount time

          // 1. Primary key - use standard key with safe storage utilities
          const primaryKey = `${currentMode}_chat_messages_${matchId}`;
          safeStorageSet(primaryKey, unmountData);

          // 2. Backup key - use unique timestamp key that won't be overwritten
          const unmountKey = `meet_unmount_${matchId}_${Date.now()}`;
          safeStorageSet(unmountKey, unmountData);

          console.log(
            `[UNMOUNT] Saved ${messagesAtUnmount.length} messages with primary and backup keys`,
          );
        }
      } catch (e) {
        console.error("[UNMOUNT] Failed to save final message backup:", e);
      }
    };
  }, [matchId, queryClient]);

  // Create ref for event handlers to ensure we can clean them up properly
  const eventHandlersRef = useRef<{
    handleNewMessageEvent?: EventListener;
    handleMessageSentEvent?: EventListener;
    handleUserTypingEvent?: EventListener;
    handleChatActiveEvent?: EventListener;
    handleUnmatchEvent?: EventListener;
    handleMessageDeletedEvent?: EventListener;
    handleReactionAddedEvent?: EventListener;
    handleReactionRemovedEvent?: EventListener;
    messageDeduplicationCache?: Set<number>;
  }>({
    // Initialize with an empty Set for message deduplication
    messageDeduplicationCache: new Set<number>(),
  });

  // ADVANCED DEDUPLICATION: Eliminate both WebSocket and API duplicates
  // This is the critical fix for messages appearing twice in the chat
  const deduplicateMessages = useCallback(
    (messages: MessageWithReactions[]) => {
      if (!messages || messages.length === 0) return [];

      console.log(`[ADVANCED-DEDUP] Deduplicating ${messages.length} messages`);

      // Create a Map for strict deduplication by message content and ID
      const uniqueMap = new Map<string, MessageWithReactions>();

      // Make a defensive copy and sort chronologically
      const sorted = [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      // Track duplicates for debugging
      const duplicatesFound: number[] = [];
      const contentFingerprints = new Set<string>();

      // Process in order (earlier messages first)
      sorted.forEach((message) => {
        // Skip any invalid messages
        if (!message || !message.id || message.id <= 0) return;

        // ENHANCED SOLUTION: Create multiple fingerprints for more robust deduplication
        const idKey = `id-${message.id}`;
        const contentFingerprint = `${message.senderId}_${message.matchId}_${(message.content || "").substring(0, 50)}`;
        const timestampKey = `time-${message.senderId}-${new Date(message.createdAt).getTime()}`;

        // Check if we already have this exact message by ID
        if (uniqueMap.has(idKey)) {
          duplicatesFound.push(message.id);
          console.log(`[ENHANCED-DEDUP] Found duplicate by ID: ${message.id}`);
          return; // Skip this message
        }

        // Check by content fingerprint - more fuzzy matching
        if (contentFingerprints.has(contentFingerprint)) {
          duplicatesFound.push(message.id);
          console.log(
            `[ENHANCED-DEDUP] Found duplicate by content fingerprint: "${(message.content || "").substring(0, 20)}..."`,
          );
          return; // Skip this message
        }

        // Most sophisticated check: look for nearly identical messages from same sender within a time window
        const contentMatches = Array.from(uniqueMap.values()).some((m) => {
          // Only compare messages from the same sender in the same match
          if (m.senderId !== message.senderId || m.matchId !== message.matchId)
            return false;

          // Check if content is identical
          const contentMatches = m.content === message.content;

          // Check if timestamps are close (within 5 seconds)
          const timeA = new Date(m.createdAt).getTime();
          const timeB = new Date(message.createdAt).getTime();
          const timeMatches = Math.abs(timeA - timeB) < 5000; // 5 second window

          // Return true if both content and time match
          return contentMatches && timeMatches;
        });

        if (contentMatches) {
          console.log(
            `[ENHANCED-DEDUP] Found sophisticated duplicate: "${(message.content || "").substring(0, 20)}..." sent within 5s window`,
          );
          duplicatesFound.push(message.id);
          return; // Skip this message
        }

        // If we reach here, the message is unique - record its fingerprints
        uniqueMap.set(idKey, message);
        contentFingerprints.add(contentFingerprint);

        // Save to sessionStorage for cross-component deduplication
        try {
          const contentFingerprintKey = `content_fingerprint_${contentFingerprint}`;
          sessionStorage.setItem(contentFingerprintKey, Date.now().toString());
        } catch (e) {
          // Ignore storage errors
        }
      });

      if (duplicatesFound.length > 0) {
        console.log(
          `[ENHANCED-DEDUP] Removed ${duplicatesFound.length} duplicate messages using advanced detection`,
        );
      }

      // Convert back to array and sort for display
      const deduplicated = Array.from(uniqueMap.values()).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      console.log(
        `[ENHANCED-DEDUP] Returning ${deduplicated.length} unique messages after comprehensive deduplication`,
      );
      return deduplicated;
    },
    [],
  );

  // RELIABLE SOLUTION: Always force fetch from server on every mount
  const {
    data: apiResponse = [],
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["/api/messages", matchId],
    enabled: !!matchId,
    // CRITICAL FIX: Force stale data so we always refetch
    staleTime: 0,
    // CRITICAL FIX: Always refetch on mount - never use cached data
    refetchOnMount: true,
    // CRITICAL FIX: Always refetch on window focus
    refetchOnWindowFocus: true,
    // Keep unused data for 5 minutes max
    gcTime: 1000 * 60 * 5,
    // Critical fix for re-entry duplication: Add select function to deduplicate messages
    select: deduplicateMessages,
    // CRITICAL FIX: Add custom queryFn to guarantee fresh data from server
    queryFn: async () => {
      console.log(
        `[ALWAYS-FRESH] Directly fetching messages for match ${matchId} from server`,
      );

      // Dynamic import the deduplication module to ensure it's available
      const messageDeduplication = await import("@/lib/message-deduplication");

      const response = await fetch(
        `/api/messages/${matchId}?fresh=true&_=${Date.now()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const serverMessages = await response.json();
      console.log(
        `[ALWAYS-FRESH] Retrieved ${serverMessages.length} messages from server`,
      );

      // Fetch reactions for this match
      try {
        const reactionsResponse = await fetch(
          `/api/matches/${matchId}/reactions`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          },
        );

        if (reactionsResponse.ok) {
          const { reactions } = await reactionsResponse.json();
          console.log(
            `[REACTIONS] Retrieved ${reactions.length} reactions for match ${matchId}`,
          );

          // Group reactions by messageId
          const reactionsByMessage = reactions.reduce(
            (acc: Record<number, any[]>, reaction: any) => {
              if (!acc[reaction.messageId]) {
                acc[reaction.messageId] = [];
              }
              acc[reaction.messageId].push(reaction);
              return acc;
            },
            {},
          );

          // Add reactions to messages
          serverMessages.forEach((message: any) => {
            const messageReactions = reactionsByMessage[message.id] || [];

            // Group reactions by emoji and count users
            const groupedReactions = messageReactions.reduce(
              (acc: Record<string, any>, reaction: any) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    users: [],
                  };
                }
                acc[reaction.emoji].count++;
                acc[reaction.emoji].users.push(reaction.userName || "Someone");
                return acc;
              },
              {},
            );

            message.reactions = Object.values(groupedReactions);
          });

          console.log(
            `[REACTIONS] Added reactions to ${serverMessages.length} messages`,
          );
        } else {
          console.warn(
            `[REACTIONS] Failed to fetch reactions: ${reactionsResponse.status}`,
          );
        }
      } catch (error) {
        console.error("[REACTIONS] Error fetching reactions:", error);
      }

      // Record all messages in the global deduplication system
      // This ensures WebSocket events with the same content will be caught as duplicates
      if (serverMessages && serverMessages.length > 0) {
        console.log(
          `[DEDUP] Recording ${serverMessages.length} messages from API in deduplication system`,
        );

        for (const msg of serverMessages) {
          if (msg && msg.id) {
            // Import deduplication module dynamically
            import("@/lib/message-deduplication")
              .then((dedupeModule) => {
                // Record the message in the deduplication system
                dedupeModule.recordMessageInDeduplicationSystem(
                  msg.id,
                  msg.content || "",
                  msg.senderId,
                  msg.matchId,
                );
              })
              .catch((err) =>
                console.error(
                  "[DEDUP-ERROR] Failed to import deduplication module:",
                  err,
                ),
              );
          }
        }
      }

      // Save to localStorage and sessionStorage for persistence
      try {
        const storageKey = `${currentMode}_chat_messages_${matchId}`;
        const sessionKey = `${currentMode}_session_messages_${matchId}`;

        const dataToStore = JSON.stringify({
          messages: serverMessages,
          timestamp: Date.now(),
          matchId,
          source: "always-fresh-query",
        });

        localStorage.setItem(storageKey, dataToStore);
        sessionStorage.setItem(sessionKey, dataToStore);
        console.log(
          `[ALWAYS-FRESH] Saved ${serverMessages.length} messages to storage`,
        );
      } catch (storageError) {
        console.error(
          "[ALWAYS-FRESH] Failed to save messages to storage:",
          storageError,
        );
      }

      return serverMessages;
    },
    // CRITICAL CHANGE: Do NOT use initialData option to force fetch from server
    // This is intentional - we want to always fetch fresh data from the server
  }) as {
    data: MessageWithReactions[];
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<any>;
  };

  // Define type for server response format
  interface ServerMatchMessages {
    matchId: number;
    messages: MessageWithReactions[];
    hasUnreadMessages?: boolean;
    lastMessageAt?: string;
  }

  // EXTRACT MESSAGES FROM SERVER RESPONSE
  // This is the critical fix for the disappearing messages issue
  // The server returns [{ matchId: X, messages: [...] }] but we need [...] directly
  // CRITICAL FIX: Convert from useMemo to useState so we can update it directly for immediate UI updates
  const [remoteMessages, setRemoteMessages] = useState<MessageWithReactions[]>(
    [],
  );
  // Process server response and update our state
  useEffect(() => {
    console.log(
      `[TRACE] Processing API response for match ${matchId}, data length: ${apiResponse?.length || 0}`,
    );

    // Add debug message for duplicate prevention verification
    const messageSessionKey = `${currentMode}_message_session_id`;
    const currentSessionId = localStorage.getItem(messageSessionKey);
    console.log(
      `[ENHANCED DUPLICATE] Current session ID for match ${matchId}: ${currentSessionId?.substring(0, 8) || "none"}...`,
    );

    // CRITICAL BUG FIX: Always mark as initialized immediately at the start of processing
    // This prevents the loading state from showing when navigating between chats
    // We'll later update messages when we have them
    if (!hasSetInitialMessagesRef.current) {
      console.log(
        `[CRITICAL FIX] Setting initialization flag for match ${matchId} in API effect, remoteMessages.length=${remoteMessages.length}`,
      );
      hasSetInitialMessagesRef.current = true;
    }

    // CRITICAL FIX: Only clear messages if absolutely necessary
    if (
      !apiResponse ||
      !Array.isArray(apiResponse) ||
      apiResponse.length === 0
    ) {
      // CRITICAL TRACE: Log if we're clearing messages
      if (remoteMessages.length > 0) {
        console.log(
          `[TRACE-WARNING] Clearing ${remoteMessages.length} messages because API response is empty/invalid for match ${matchId}`,
        );
        console.log(`[TRACE-WARNING] Stack trace:`, new Error().stack);
      }

      // Only clear if we don't have a current cache that's viable
      const preserveExistingMessages =
        remoteMessages.length > 0 && remoteMessages[0]?.matchId === matchId;

      if (preserveExistingMessages) {
        console.log(
          `[CRITICAL FIX] Prevented clearing ${remoteMessages.length} valid messages for match ${matchId}`,
        );
      } else {
        console.log(
          `[TRACE] Setting empty messages array (safe - either empty already or wrong match)`,
        );
        setRemoteMessages([]);
      }
      return;
    }

    // Check if we have the nested format [{ matchId, messages: [...] }]
    if (
      apiResponse[0] &&
      "matchId" in apiResponse[0] &&
      "messages" in apiResponse[0]
    ) {
      // This is the server's nested format - extract the messages array
      console.log(
        "[PRIVACY FIX] Detected nested server format, applying strict match filtering",
      );

      // Find the object with our match ID
      const matchData = apiResponse.find((item) => item.matchId === matchId) as
        | ServerMatchMessages
        | undefined;

      if (matchData && Array.isArray(matchData.messages)) {
        console.log(
          `[PRIVACY FIX] Extracted ${matchData.messages.length} messages for match ${matchId}`,
        );

        // ENHANCED PRIVACY FIX: Triple-check message integrity to prevent leakage between conversations
        // 1. Verify matchId is correct
        // 2. Verify the current user is either the sender or recipient
        // 3. Log detailed privacy violations for debugging
        const validMessages = matchData.messages.filter((msg) => {
          // Check 1: Verify message belongs to the current match
          const correctMatch = msg.matchId === matchId;

          // Check 2: Verify current user is actually involved in this message
          const userInvolved =
            user && (msg.senderId === user.id || msg.receiverId === user.id);

          // Log privacy violations in detail for debugging
          if (!correctMatch) {
            console.error(
              `[PRIVACY VIOLATION] Message ${msg.id} has incorrect matchId: ${msg.matchId}, expected: ${matchId}`,
            );
          }

          if (!userInvolved) {
            console.error(
              `[PRIVACY VIOLATION] Message ${msg.id} does not involve current user ${user?.id}. Sender: ${msg.senderId}, Recipient: ${msg.receiverId}`,
            );
          }

          // Only return true if both checks pass
          return correctMatch && userInvolved === true;
        });

        if (validMessages.length !== matchData.messages.length) {
          console.warn(
            `[PRIVACY ALERT] Filtered out ${matchData.messages.length - validMessages.length} unauthorized messages`,
          );
        }

        // Update remote messages state and set initialization flag
        setRemoteMessages(validMessages);
        // CRITICAL FIX: Mark messages as initialized to prevent empty state flash
        hasSetInitialMessagesRef.current = true;
        return;
      } else {
        console.log("[PRIVACY FIX] No messages found in nested format");

        // CRITICAL FIX: Only clear messages if we don't already have valid messages for this match
        if (
          remoteMessages.length > 0 &&
          remoteMessages[0]?.matchId === matchId
        ) {
          console.log(
            `[CRITICAL FIX] Prevented clearing ${remoteMessages.length} valid messages for match ${matchId} in nested format handling`,
          );
        } else {
          console.log(
            `[TRACE] Setting empty messages array (safe - no valid messages in current format)`,
          );
          setRemoteMessages([]);
        }
        return;
      }
    }

    // If we already have the direct format (like from cache), use it as is - BUT FILTER FOR SAFETY
    if (
      apiResponse.length > 0 &&
      "id" in apiResponse[0] &&
      "matchId" in apiResponse[0]
    ) {
      console.log(
        "[PRIVACY FIX] Using direct message array format with strict filtering",
      );

      // ENHANCED PRIVACY FIX: Comprehensive filter to ensure privacy and security
      const directMessages = apiResponse as MessageWithReactions[];

      // Apply the same multi-level validation as above
      const validMessages = directMessages.filter((msg) => {
        // Check 1: Verify correct match
        const correctMatch = msg.matchId === matchId;

        // Check 2: Verify current user is part of the conversation
        const userInvolved =
          user && (msg.senderId === user.id || msg.receiverId === user.id);

        // Log detailed privacy violations
        if (!correctMatch) {
          console.error(
            `[PRIVACY VIOLATION] Message ${msg.id} has incorrect matchId: ${msg.matchId}, expected: ${matchId}`,
          );
        }

        if (!userInvolved) {
          console.error(
            `[PRIVACY VIOLATION] Message ${msg.id} does not involve current user ${user?.id}. Sender: ${msg.senderId}, Recipient: ${msg.receiverId}`,
          );
        }

        // Only return messages that pass ALL checks
        return correctMatch && userInvolved === true;
      });

      if (validMessages.length !== directMessages.length) {
        console.warn(
          `[PRIVACY ALERT] Filtered out ${directMessages.length - validMessages.length} unauthorized messages`,
        );
      }

      // Update remote messages state and set initialization flag
      setRemoteMessages(validMessages);
      // CRITICAL FIX: Mark messages as initialized to prevent empty state flash
      hasSetInitialMessagesRef.current = true;
      return;
    }

    console.warn("[PRIVACY FIX] Unknown data format:", apiResponse);
    setRemoteMessages([]);
    // Even in the empty case, mark messages as initialized so we show "No Messages" instead of loading
    hasSetInitialMessagesRef.current = true;
  }, [apiResponse, matchId, user]);

  // Log message count for debugging
  useEffect(() => {
    console.log(
      `[DATA STRUCTURE FIX] Working with ${remoteMessages ? remoteMessages.length : 0} messages`,
    );
  }, [remoteMessages]);

  // COMPLETE REWRITE: Message deduplication logic with strict content checking and ID tracking
  // This fixes the duplicate messages issue when navigating back to a chat
  useEffect(() => {
    // Debounce/throttle our processing to prevent excessive runs
    // Only run once per component mount, when matchId changes, or when specific API action triggers it
    if (mergeInProgressRef.current) return;

    // Special flag to track if we're deliberately running this effect
    const isInitialLoad = !hasSetInitialMessagesRef.current;
    const forcedDeduplication = dedupeTriggerRef.current;

    // Skip unless this is initial load or forced deduplication
    if (!isInitialLoad && !forcedDeduplication && !remoteMessages.length)
      return;

    // Reset trigger if it was set
    dedupeTriggerRef.current = false;

    // Mark as processing to prevent concurrent runs
    mergeInProgressRef.current = true;

    try {
      console.log(
        `[STRICT-DEDUPLICATION] Running strict message deduplication ${isInitialLoad ? "(initial load)" : "(update)"}`,
      );

      // Get all possible message sources to ensure complete deduplication

      // 1. Get messages from query cache
      const queryMessages =
        queryClient.getQueryData<MessageWithReactions[]>([
          "/api/messages",
          matchId,
        ]) || [];

      // 2. Get messages from current state
      const stateMessages = remoteMessages || [];

      // 3. Get any messages from sessionStorage for this match
      let sessionMessages: MessageWithReactions[] = [];
      try {
        const sessionData = sessionStorage.getItem(
          `${currentMode}_session_messages_${matchId}`,
        );
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
            sessionMessages = parsed.messages;
          }
        }
      } catch (e) {
        console.error("[DEDUPLICATION] Failed to parse session storage:", e);
      }

      // 4. Get any messages from localStorage for this match
      let localMessages: MessageWithReactions[] = [];
      try {
        const localData = localStorage.getItem(
          `${currentMode}_chat_messages_${matchId}`,
        );
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
            localMessages = parsed.messages;
          }
        }
      } catch (e) {
        console.error("[DEDUPLICATION] Failed to parse local storage:", e);
      }

      console.log(
        `[DEDUPLICATION] Found messages from all sources: query(${queryMessages.length}), state(${stateMessages.length}), session(${sessionMessages.length}), local(${localMessages.length})`,
      );

      // CRITICAL FIX: Multi-level deduplication strategy with privacy check
      // Phase 0: Security check for all messages to prevent privacy violations
      const isValidMessage = (msg: MessageWithReactions) => {
        if (!msg) return false;

        // Verify matchId is correct
        const correctMatch = msg.matchId === matchId;

        // Verify current user is part of this conversation
        const userInvolved =
          user && (msg.senderId === user.id || msg.receiverId === user.id);

        if (!correctMatch || !userInvolved) {
          console.error(
            `[PRIVACY VIOLATION] Removed unauthorized message during deduplication. User: ${user?.id}, Match: ${matchId}, Message: ${msg.id}`,
          );
          return false;
        }

        return true;
      };

      // Phase 1: Deduplicate based on message ID (exact match)
      const messageByIdMap = new Map<number, MessageWithReactions>();

      // Combine all possible sources, prioritizing server (API) messages
      // We handle negative IDs (temporary messages) separately,
      // and apply privacy check to all messages first
      const allMessagesWithPositiveIds = [
        ...queryMessages,
        ...stateMessages,
        ...sessionMessages,
        ...localMessages,
      ].filter((msg) => msg && msg.id > 0 && isValidMessage(msg));

      // First pass: deduplicate by ID
      allMessagesWithPositiveIds.forEach((msg) => {
        // Only replace if we're getting a message with more data
        // (e.g., readAt exists, or newer reaction data)
        if (
          !messageByIdMap.has(msg.id) ||
          (msg.readAt && !messageByIdMap.get(msg.id)?.readAt) ||
          (msg.reactions &&
            msg.reactions.length >
              (messageByIdMap.get(msg.id)?.reactions?.length || 0))
        ) {
          messageByIdMap.set(msg.id, msg);
        }
      });

      console.log(
        `[DEDUPLICATION] After ID-based deduplication: ${messageByIdMap.size} messages`,
      );

      // Phase 2: Strict content-based deduplication for any remaining messages
      // This catches duplicates with different IDs that might happen due to new API calls or refreshes
      const contentMap = new Map<string, MessageWithReactions>();

      // For each message (already deduplicated by ID), generate a compound content key
      messageByIdMap.forEach((msg) => {
        // Create an extremely specific content key that captures almost all message properties
        // This should catch true duplicates even if they have different IDs
        const contentKey = `${msg.senderId}:${msg.receiverId}:${msg.content}:${new Date(msg.createdAt).getTime()}`;

        // Only keep the message with the highest (most recent) ID if content matches perfectly
        if (
          !contentMap.has(contentKey) ||
          contentMap.get(contentKey)!.id < msg.id
        ) {
          contentMap.set(contentKey, msg);
        }
      });

      // Handle any temporary messages (negative IDs) separately - these are messages still being sent
      const tempMessages = [...stateMessages, ...queryMessages].filter(
        (msg) => msg && msg.id < 0,
      );

      // Convert content map back to array and add temporary messages
      const contentMapArray = Array.from(contentMap.values());
      const strictlyDeduplicatedMessages = [
        ...contentMapArray,
        ...tempMessages,
      ];

      // Phase 3: Sort messages chronologically
      strictlyDeduplicatedMessages.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });

      // Log summary of what we've found and fixed
      const originalCount =
        queryMessages.length +
        stateMessages.length +
        sessionMessages.length +
        localMessages.length;
      const duplicatesRemoved =
        originalCount - strictlyDeduplicatedMessages.length;

      console.log(
        `[DEDUPLICATION] Strictly deduplicated messages: ${strictlyDeduplicatedMessages.length} (removed ${duplicatesRemoved} duplicates)`,
      );

      // Only update if we have actual changes to avoid unnecessary re-renders
      const hasChanges =
        JSON.stringify(
          queryClient
            .getQueryData<MessageWithReactions[]>(["/api/messages", matchId])
            ?.map((m) => m.id),
        ) !== JSON.stringify(strictlyDeduplicatedMessages.map((m) => m.id));

      if (hasChanges || isInitialLoad) {
        console.log(
          "[STRICT-DEDUPLICATION] Updating with deduplicated messages",
        );

        // 1. Update all refs first
        cachedMessagesRef.current = strictlyDeduplicatedMessages;
        remoteMessagesRef.current = strictlyDeduplicatedMessages;
        hasSetInitialMessagesRef.current = true;

        // 2. Update query cache (doesn't trigger renders)
        queryClient.setQueryData(
          ["/api/messages", matchId],
          strictlyDeduplicatedMessages,
        );

        // 3. Save to storage with version tracking to avoid loading old messages
        if (strictlyDeduplicatedMessages.length > 0) {
          try {
            const storageData = {
              messages: strictlyDeduplicatedMessages,
              savedAt: Date.now(),
              version: 2, // Versioning to track storage format
              matchId,
              appMode: currentMode,
              source: "strict-deduplication",
            };

            // Clear any old format storage first
            sessionStorage.removeItem(`meet_messages_${matchId}`);
            localStorage.removeItem(`meet_messages_${matchId}`);

            // Now save with new format and keys
            sessionStorage.setItem(
              `${currentMode}_session_messages_${matchId}`,
              JSON.stringify(storageData),
            );
            localStorage.setItem(
              `${currentMode}_chat_messages_${matchId}`,
              JSON.stringify(storageData),
            );

            console.log(
              `[DEDUPLICATION] Saved ${strictlyDeduplicatedMessages.length} strictly deduplicated messages`,
            );
          } catch (error) {
            console.error(
              "[ERROR] Failed to save strictly deduplicated messages:",
              error,
            );
          }
        }

        // 4. Finally update state (this causes a re-render)
        console.log(
          "[DEDUPLICATION] Updating state with deduplicated messages",
        );
        setRemoteMessages(strictlyDeduplicatedMessages);

        // 5. Only scroll for new incoming messages, not during restoration
        if (!isRestoringScrollPosition) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      } else {
        console.log(
          "[STRICT-DEDUPLICATION] No changes after deduplication, skipping update",
        );
      }
    } catch (error) {
      console.error("[ERROR] Failed in strict deduplication process:", error);
    } finally {
      // Always reset processing flag when done
      mergeInProgressRef.current = false;
    }
  }, [matchId, queryClient, currentMode, user]);

  /**
   * PRIVACY PROTECTION SYSTEM
   *
   * This component implements a multi-layer privacy protection system to ensure that:
   *
   * 1. Users can only see messages in conversations they are part of
   * 2. Messages are strictly filtered based on match ID to prevent cross-conversation leakage
   * 3. Each user can only see messages where they are either the sender or intended recipient
   * 4. Privacy checks are applied at all layers: API, WebSocket, component, and storage levels
   *
   * The privacy checks include:
   * - Initial filtering of API responses by matchId
   * - Secondary filtering based on user involvement (sender or recipient)
   * - Privacy validation during message deduplication
   * - Security checks when storing messages to prevent persistence of unauthorized messages
   * - Detailed logging of any potential privacy violations for immediate detection
   */

  // CRITICAL FIX: Derive the other user from cached or API data
  const otherUser: User = useMemo(() => {
    // First try to get from recoveredMatch (cached data)
    if (recoveredMatch?.user?.fullName) {
      return recoveredMatch.user;
    }

    // Then try from currentMatch (API data)
    if (currentMatch?.user?.fullName) {
      return currentMatch.user;
    }

    // Try to get from stored match data in session/localStorage
    try {
      const sessionData = sessionStorage.getItem(`match_data_${matchId}`);
      const localData = localStorage.getItem(`match_data_${matchId}`);
      const storedData = sessionData || localData;

      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.user?.fullName) {
          return parsed.user;
        }
      }
    } catch (error) {
      console.log("[HEADER-FIX] Could not parse stored match data:", error);
    }

    // Fallback to empty user (no "Unknown User" text)
    return {
      id: 0,
      fullName: "",
    };
  }, [recoveredMatch?.user, currentMatch?.user, matchId]);

  // CRITICAL FLICKER FIX: Initialization coordination using useLayoutEffect
  // This ensures messages only appear when everything is ready
  useLayoutEffect(() => {
    console.log("[INIT] Coordinating chat initialization for match", matchId);

    // Only proceed if we have messages and essential data
    const hasMessages = remoteMessages.length > 0;
    const hasOtherUser = otherUser.fullName && otherUser.fullName !== "";
    const messagesInitialized = hasSetInitialMessagesRef.current;

    console.log("[INIT] Status check:", {
      hasMessages,
      hasOtherUser,
      messagesInitialized,
      currentState: {
        isChatInitialized,
        isRestoringScrollPosition,
        isPreparingMessages,
      },
    });

    // If everything is ready, initialize the chat
    if (hasMessages && hasOtherUser && messagesInitialized) {
      console.log("[INIT] All prerequisites met, initializing chat");

      // Use enhanced scroll restoration system for both saved and fresh chats
      if (!hasRestoredScrollRef.current && messagesContainerRef.current) {
        const wasRestored = restoreScrollPosition();
        if (!wasRestored) {
          // No saved position, scroll to bottom instantly
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
          console.log("[INIT] 📭 No saved position, scrolled to bottom");
          hasRestoredScrollRef.current = true;
          setIsRestoringScrollPosition(false);
        }
      }

      // Mark everything as ready - this will make the chat visible
      setIsRestoringScrollPosition(false);
      setIsPreparingMessages(false);
      setIsChatInitialized(true);

      console.log(
        "[INIT] Chat initialization complete - should be visible now",
      );
    } else {
      console.log("[INIT] Not ready yet, keeping chat hidden");
      // Keep chat hidden while waiting for data
      setIsChatInitialized(false);
    }
  }, [
    remoteMessages.length,
    otherUser.fullName,
    hasSetInitialMessagesRef.current,
    matchId,
    scrollPositionKey,
  ]);

  // No encryption or message expiration functionality

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (blockedUserId: number) => {
      return await apiRequest("/api/user/block", {
        method: "POST",
        data: {
          blockedUserId,
          reason: "User blocked from chat",
        },
      });
    },
    onSuccess: () => {
      // No toast notification - seamless blocking experience

      // Parallel cache invalidation for optimal performance
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/home-page-data"] }),
        // Clear current chat messages from cache immediately
        queryClient.removeQueries({ queryKey: ["/api/messages", matchId] }),
      ]).catch((error) => {
        console.warn("[BLOCK-PERFORMANCE] Cache invalidation error:", error);
      });

      // Navigate immediately without waiting for cache operations
      goToLastAppMessages();
    },
    onError: (error) => {
      toast({
        title: "Failed to block user",
        description: "There was an error blocking this user. Please try again.",
        variant: "destructive",
      });
      console.error("Block user error:", error);
    },
  });

  // Handle block user function
  const handleBlockUser = () => {
    if (!currentMatch || !user) return;
    setBlockConfirmDialogOpen(true);
  };

  // Confirm block user function
  const confirmBlockUser = () => {
    if (!currentMatch || !user) return;

    // Close dialog immediately for instant feedback
    setBlockConfirmDialogOpen(false);

    const blockedUserId =
      currentMatch.userId1 === user.id
        ? currentMatch.userId2
        : currentMatch.userId1;
    console.log("[BLOCK-PERFORMANCE] Initiating optimized blocking process");

    // Start blocking process with performance optimizations
    blockUserMutation.mutate(blockedUserId);
  };
  // Send message mutation
  const { mutate: sendMessage } = useMutation<
    MessageWithReactions,
    Error,
    {
      content: string;
      messageType?: string;
      audioUrl?: string;
      audioDuration?: number;
      replyToMessageId?: number;
      replyToMessage?: {
        id: number;
        content: string;
        senderName: string;
        isCurrentUser: boolean;
      };
    },
    { optimisticMsg?: MessageWithReactions }
  >({
    mutationFn: async (message: {
      content: string;
      messageType?: string;
      audioUrl?: string;
      audioDuration?: number;
      replyToMessageId?: number;
      replyToMessage?: {
        id: number;
        content: string;
        senderName: string;
        isCurrentUser: boolean;
      };
    }): Promise<MessageWithReactions> => {
      // Validate message content client-side
      if (!message.content || message.content.trim().length === 0) {
        throw new Error("Message content cannot be empty");
      }

      // ENHANCED DUPLICATE PREVENTION - Fix "Message appears twice when navigating" issue
      // Check if this exact message was recently sent to prevent duplicate API calls
      const sentMessagesKey = `${currentMode}_sent_messages_${matchId}`;
      const messageSessionKey = `${currentMode}_message_session_id`;
      const sessionId =
        localStorage.getItem(messageSessionKey) ||
        Date.now().toString() + Math.random().toString(36).substring(2, 15);

      // Store the session ID if it's new
      if (!localStorage.getItem(messageSessionKey)) {
        localStorage.setItem(messageSessionKey, sessionId);
        console.log(
          `[ENHANCED DUPLICATE] Created new message session ID: ${sessionId}`,
        );
      }

      try {
        // First check exact matching message content from this session
        const sentMessagesData = localStorage.getItem(sentMessagesKey);
        if (sentMessagesData) {
          const sentMessages = JSON.parse(sentMessagesData);

          // Look for this exact message in the recently sent messages
          // This enhanced check includes session-specific and global checks
          const now = Date.now();
          const recentMessages = sentMessages.filter((sent: any) => {
            // First check for exact message content match in the last 60 seconds
            const isContentMatch =
              now - sent.time < 60000 &&
              sent.content === message.content &&
              sent.messageType === (message.messageType || "text");

            // For session-specific matches, check session ID
            if (
              sent.sessionId &&
              sent.sessionId === sessionId &&
              isContentMatch
            ) {
              console.log(
                "[ENHANCED DUPLICATE] Found exact session-specific match for message",
              );
              return true;
            }

            // For very recent messages (within 10 seconds), also consider cross-session matches
            // to prevent accidental double-sends during navigation events
            if (now - sent.time < 10000 && isContentMatch) {
              console.log(
                "[ENHANCED DUPLICATE] Found cross-session match for very recent message",
              );
              return true;
            }

            return false;
          });

          if (recentMessages.length > 0) {
            console.log(
              `[ENHANCED DUPLICATE PREVENTION] Blocking duplicate API send of message: "${message.content.substring(0, 20)}..."`,
            );
            console.log(
              `[ENHANCED DUPLICATE] This message was already sent ${((now - recentMessages[0].time) / 1000).toFixed(1)}s ago`,
            );

            // Return the first matching message to prevent sending a duplicate API request
            const recentMessage = recentMessages[0];

            // Notify state that we've detected a duplicate to avoid visual duplication
            (window as any).__lastKnownDuplicateMessageId =
              recentMessage.messageId;

            // Instead of throwing an error, return a promise that resolves with the existing message
            // This makes the mutation appear successful, but doesn't trigger a new API call
            return Promise.resolve({
              id: recentMessage.messageId,
              matchId,
              senderId: user!.id,
              receiverId: otherUser.id,
              content: message.content,
              messageType: message.messageType || "text",
              audioUrl: message.audioUrl,
              audioDuration: message.audioDuration,
              createdAt: new Date(recentMessage.time).toISOString(),
              read: false,
              readAt: null,
              _isDuplicatePrevention: true,
              _sessionId: sessionId,
            });
          }
        }
      } catch (e) {
        console.error("[ENHANCED DUPLICATE] Error checking sent messages:", e);
        // Continue with sending even if the check fails
      }

      // Use message content directly (no encryption processing)
      const processedContent = message.content;

      console.log("Sending message:", {
        length: processedContent.length,
        preview:
          processedContent.substring(0, 20) +
          (processedContent.length > 20 ? "..." : ""),
      });

      // Create fallback message in case of network issues
      const fallbackMessage: MessageWithReactions = {
        id: Math.floor(Math.random() * -1000000),
        matchId,
        senderId: user!.id,
        receiverId: otherUser.id,
        content: message.content,
        createdAt: new Date().toISOString(),
        read: false,
        readAt: null,
        error: true,
      };

      try {
        // First make sure we have a valid session
        const sessionCheckResponse = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!sessionCheckResponse.ok) {
          console.log(
            "Session check failed before sending message, attempting to refresh",
          );
          // Try to refresh the session with proper endpoint
          await fetch("/api/session/refresh", {
            method: "POST",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          });
        }

        // Now proceed with the message send
        console.log("Making API request to send message:", {
          url: `/api/messages/${matchId}`,
          content: processedContent.substring(0, 50),
          receiverId: otherUser.id,
        });

        const response = await apiRequest(`/api/messages/${matchId}`, {
          method: "POST",
          data: {
            content: processedContent,
            receiverId: otherUser.id,
            messageType: message.messageType || "text",
            audioUrl: message.audioUrl,
            audioDuration: message.audioDuration,
            replyToMessageId: message.replyToMessageId,
            replyToMessage: message.replyToMessage,
          },
        });

        console.log("API request completed, checking response:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorText = await response.clone().text();
          console.error("Server returned error:", errorText);
          throw new Error("Server error: " + response.statusText);
        }

        // Parse the response
        const responseData = await response.json();

        console.log("Successfully parsed response data:", {
          messageId: responseData.id,
          content: responseData.content?.substring(0, 50),
        });

        if (!responseData || !responseData.id) {
          console.error("Invalid response data:", responseData);
          return fallbackMessage; // Return fallback on invalid data
        }

        console.log("Message sent successfully:", {
          messageId: responseData.id,
        });
        return responseData as MessageWithReactions;
      } catch (error) {
        console.error("Error sending message:", error);
        return fallbackMessage; // Return fallback message on any error
      }
    },
    onMutate: async () => {
      // We're no longer using this for optimistic updates
      // All optimistic updates are handled directly in the handleSubmit function
      return {};
    },
    onError: (err, newMessage) => {
      // Find any sending messages with matching content and mark as error
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        (old) => {
          if (!old || old.length === 0) return [];

          return old.map((msg) => {
            // Find temporary messages that are still sending with this content
            if (
              msg.sending &&
              msg.content === newMessage.content &&
              msg.senderId === user!.id
            ) {
              // For audio messages, ensure we preserve the audio URL
              if (msg.messageType === "audio" && msg.id < 0) {
                try {
                  localStorage.setItem(
                    `${currentMode}_temp_message_${msg.id}`,
                    "error",
                  );
                } catch (error) {
                  console.error(
                    "Error marking temp audio message as error:",
                    error,
                  );
                }
              }

              return {
                ...msg,
                sending: false,
                error: true,
              };
            }
            return msg;
          });
        },
      );

      // FIXED: Clear replyToMessage in onError callback as well
      setReplyToMessage(null);

      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: (response: MessageWithReactions, sentMessage) => {
      console.log("Message sent successfully with ID:", response.id);

      // CRITICAL FIX: Add this message to the sent messages tracking
      // to prevent duplicate sends when navigating away and back
      if (!(response as any)._isDuplicatePrevention) {
        const sentMessagesKey = `${currentMode}_sent_messages_${matchId}`;
        try {
          let sentMessages = [];
          const existingData = localStorage.getItem(sentMessagesKey);

          if (existingData) {
            sentMessages = JSON.parse(existingData);
          }

          // Get the current session ID
          const messageSessionKey = `${currentMode}_message_session_id`;
          const sessionId =
            localStorage.getItem(messageSessionKey) ||
            Date.now().toString() + Math.random().toString(36).substring(2, 15);

          // Add this message to the tracking list with session ID for cross-navigation deduplication
          sentMessages.push({
            messageId: response.id,
            content: sentMessage.content,
            messageType: sentMessage.messageType,
            sessionId: sessionId,
            time: Date.now(),
          });

          // Keep only the last 20 messages to prevent storage bloat
          if (sentMessages.length > 20) {
            sentMessages = sentMessages.slice(-20);
          }

          // Save the updated tracking list
          localStorage.setItem(sentMessagesKey, JSON.stringify(sentMessages));
          console.log(
            `[DUPLICATE PREVENTION] Tracked message with ID ${response.id} to prevent future duplicates`,
          );
        } catch (e) {
          console.error("Error storing sent message tracking data:", e);
        }
      }

      // For audio messages, ensure we store both the audio data correctly
      if (sentMessage.messageType === "audio" && sentMessage.audioUrl) {
        try {
          // First, explicitly store the audio data with the real message ID
          // This ensures the sender can always play their own messages
          localStorage.setItem(
            `${currentMode}_audio_message_${response.id}`,
            sentMessage.audioUrl,
          );
          localStorage.setItem(
            `${currentMode}_audio_data_${response.id}`,
            sentMessage.audioUrl,
          );
          console.log(
            `Directly stored audio data for message ID ${response.id} in both formats`,
          );

          // Also check for any pending temporary messages to map them
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${currentMode}_temp_message_`)) {
              const tempId = key.replace(`${currentMode}_temp_message_`, "");
              const status = localStorage.getItem(key);

              if (status === "pending" || status === "retry") {
                // Look for all potential audio-related data for this temp message
                const formats = [
                  // Standard format
                  {
                    source: `${currentMode}_audio_message_${tempId}`,
                    target: `${currentMode}_audio_message_${response.id}`,
                  },
                  // Data format
                  {
                    source: `${currentMode}_audio_data_${tempId}`,
                    target: `${currentMode}_audio_data_${response.id}`,
                  },
                ];

                // Transfer data from temp ID to permanent ID
                let foundAnyData = false;
                for (const format of formats) {
                  const cachedData = localStorage.getItem(format.source);
                  if (cachedData && cachedData.startsWith("data:audio/")) {
                    // Save with permanent ID and mark as found
                    localStorage.setItem(format.target, cachedData);
                    foundAnyData = true;
                    console.log(
                      `Copied audio data from ${format.source} to ${format.target}`,
                    );
                  }
                }

                if (foundAnyData) {
                  // Clean up temp status entry
                  localStorage.removeItem(key);

                  // Now safely remove temp audio data since we've copied it
                  for (const format of formats) {
                    try {
                      localStorage.removeItem(format.source);
                    } catch (e) {
                      // Ignore errors during cleanup
                    }
                  }

                  console.log(
                    `Mapped and cleaned up temporary audio message ${tempId} to real ID ${response.id}`,
                  );
                  break; // Only map the first pending message
                }
              }
            }
          }
        } catch (error) {
          console.error("Error updating audio message mapping:", error);
        }
      }

      // COMPLETELY NEW APPROACH: Update the local state and then use it as source of truth
      setRemoteMessages((prevMessages) => {
        // First remove any temporary sending messages that match this sent message
        const filtered = prevMessages.filter(
          (msg) =>
            !(
              msg.sending &&
              msg.content === sentMessage.content &&
              msg.senderId === user?.id
            ),
        );

        // CRITICAL FIX: Check if this message already exists to prevent duplicates
        const messageExists = filtered.some((msg) => msg.id === response.id);

        let updatedMessages;
        if (messageExists) {
          console.log(
            "[DUPLICATE PREVENTION] Message already exists, not adding duplicate",
          );
          updatedMessages = filtered;
        } else {
          // REPLY FIX: Ensure reply information is preserved from server response
          // The server reconstructs the replyToMessage object, so we need to preserve it
          const messageWithReply = {
            ...response,
            // If server didn't reconstruct replyToMessage but we have reply data, reconstruct it
            replyToMessage:
              response.replyToMessage ||
              (response.replyToMessageId && response.replyToContent
                ? {
                    id: response.replyToMessageId,
                    content: response.replyToContent,
                    senderName: response.replyToSenderName || "Unknown",
                    isCurrentUser: response.replyToIsCurrentUser || false,
                  }
                : undefined),
          };

          console.log("[REPLY-FIX] Adding confirmed message with reply data:", {
            messageId: response.id,
            hasReplyData: !!messageWithReply.replyToMessage,
            replyToContent: messageWithReply.replyToMessage?.content,
          });

          // Add the confirmed message from the server with preserved reply info
          updatedMessages = [...filtered, messageWithReply];
        }

        // Synchronize this state to the query cache
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          updatedMessages,
        );

        console.log("[NEW APPROACH] Message confirmed with ID:", response.id);

        // Save to storage immediately to ensure persistence - CRITICAL FIX
        try {
          // Use multiple storage keys for maximum reliability
          const messageData = {
            messages: updatedMessages,
            savedAt: Date.now(),
            matchId,
            source: "message_confirmed",
          };

          // Save to sessionStorage (most reliable during navigation)
          sessionStorage.setItem(
            `${currentMode}_session_messages_${matchId}`,
            JSON.stringify(messageData),
          );

          // Also save to localStorage as backup
          localStorage.setItem(
            `${currentMode}_chat_messages_${matchId}`,
            JSON.stringify(messageData),
          );

          // NAVIGATION FIX: Save with a special navigation-resistant key
          sessionStorage.setItem(
            `navigation_safe_messages_${matchId}`,
            JSON.stringify(messageData),
          );

          console.log(
            `[CRITICAL FIX] Saved ${updatedMessages.length} messages to multiple storage locations`,
          );
        } catch (e) {
          console.warn("Failed to save to session storage:", e);
        }

        // Return updated messages for state update
        return updatedMessages;
      });

      // Use WebSocket to send message for real-time delivery
      wsSendMessage(matchId, otherUser.id, response.content);

      // Scroll to latest message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // FIXED: Clear replyToMessage in onSuccess callback
      setReplyToMessage(null);
    },
  });

  // Mark messages as read
  useEffect(() => {
    const unreadMessages = remoteMessages.filter(
      (msg: MessageWithReactions) => !msg.read && msg.senderId !== user?.id,
    );

    if (unreadMessages.length > 0) {
      apiRequest(`/api/messages/${matchId}/read`, {
        method: "POST",
      })
        .then(() => {
          // Update local state to avoid extra requests
          queryClient.setQueryData<MessageWithReactions[]>(
            ["/api/messages", matchId],
            (old) =>
              (old || []).map((msg: MessageWithReactions) => ({
                ...msg,
                read: msg.senderId === user?.id ? msg.read : true,
                readAt:
                  msg.senderId === user?.id
                    ? msg.readAt
                    : new Date().toISOString(),
              })),
          );

          // Dispatch a custom event to notify other components about read status changes
          // This helps ensure consistent message status indicators across the app
          window.dispatchEvent(
            new CustomEvent("message:status:updated", {
              detail: {
                matchId,
                messageIds: unreadMessages.map((msg) => msg.id),
                status: "read",
                timestamp: new Date().toISOString(),
              },
            }),
          );

          // Also invalidate matches query to update the message list status indicators
          queryClient.invalidateQueries({
            queryKey: ["/api/matches"],
            refetchType: "all",
          });

          // Send WebSocket message to notify the other user that messages were read
          // ONLY if read receipts are enabled - this prevents the other user from knowing you've read their messages
          if (
            window.chatSocket &&
            window.chatSocket.readyState === WebSocket.OPEN &&
            unreadMessages.length > 0 &&
            readReceiptsEnabled
          ) {
            // Only send if read receipts are enabled
            try {
              const messageReadNotification = {
                type: "message_read",
                matchId: matchId,
                messageIds: unreadMessages.map((msg) => msg.id),
                userId: user?.id,
                timestamp: new Date().toISOString(),
              };

              window.chatSocket.send(JSON.stringify(messageReadNotification));
              console.log(
                "📤 Sent message read notification via WebSocket:",
                messageReadNotification,
              );
            } catch (error) {
              console.error(
                "Failed to send message read notification via WebSocket:",
                error,
              );
            }
          }
        })
        .catch((err) => {
          console.error("Failed to mark messages as read", err);
        });
    }
  }, [remoteMessages, matchId, user?.id, queryClient]);

  // Check if other user is actively in this chat
  const isOtherUserInChat = useCallback(() => {
    if (!activeChats || !otherUser.id) return false;
    const userChatSet = activeChats.get(otherUser.id);
    return !!userChatSet && userChatSet.has(matchId);
  }, [activeChats, otherUser.id, matchId]);

  // Determine online status - show green dot only when online but NOT actively in chat
  // When actively in chat, the purple "In Chat" indicator takes priority
  const isOtherUserActive = useMemo(() => {
    const isOnline = onlineUsers.has(otherUser.id);
    const isInChat = isOtherUserInChat();
    // Show green dot only when online but NOT in this specific chat
    // This prevents dual indicators (green + purple)
    return isOnline && !isInChat;
  }, [onlineUsers, otherUser.id, isOtherUserInChat]);

  // Use WebSocket connection status
  useEffect(() => {
    // Auto-refresh messages when the connection is established
    if (isConnected) {
      refetchMessages();
    }
  }, [isConnected, refetchMessages]);
  // Improved message auto-save logic with robust error handling
  const saveMessages = useCallback(() => {
    if (!matchId) return;

    try {
      // Define storage key for this chat in current app mode
      const storageKey = `${currentMode}_chat_messages_${matchId}`;

      // Get messages directly from query cache to ensure we have the most up-to-date set
      // This includes both API and optimistic updates
      const currentMessages =
        queryClient.getQueryData<MessageWithReactions[]>([
          "/api/messages",
          matchId,
        ]) || [];

      // Skip if no messages to save
      if (currentMessages.length === 0) {
        console.log("[DEBUG] No messages to save for match", matchId);
        return;
      }

      console.log(
        `[FIX] Auto-saving ${currentMessages.length} messages for match ${matchId} in mode ${currentMode}`,
      );

      // CRITICAL FIX: Also save to sessionStorage for better cross-navigation persistence
      try {
        // SessionStorage is cleared less frequently than localStorage quota errors
        const sessionKey = `${currentMode}_session_messages_${matchId}`;
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            messages: currentMessages,
            savedAt: Date.now(),
            matchId,
          }),
        );
        console.log(
          `[FIX] Saved ${currentMessages.length} messages to sessionStorage`,
        );
      } catch (e) {
        console.warn("[WARNING] Failed to save to sessionStorage:", e);
      }

      // CRITICAL FIX: Always save messages regardless of auto-delete mode
      // This ensures messages are preserved when navigating, even with "always" delete mode
      // The actual deletion will happen only when specifically triggered, not on navigation

      // Validate messages before saving
      const validatedMessages = currentMessages.map((msg) => {
        // Fix any message missing createdAt
        if (!msg.createdAt || isNaN(new Date(msg.createdAt).getTime())) {
          return {
            ...msg,
            createdAt: new Date().toISOString(),
            _fixedTimestamp: true,
          };
        }
        return msg;
      });

      // Limit number of saved messages when there are too many
      const messagesToStore =
        validatedMessages.length > 200
          ? validatedMessages.slice(-200) // Keep only last 200 messages if there are many
          : validatedMessages;

      // Calculate expiration time if in custom mode
      let expirationTime = 0;
      if (autoDeleteMode === "custom") {
        expirationTime = calculateExpirationTime(
          autoDeleteValue,
          autoDeleteUnit,
        );
      }

      // Prepare data to store with improved metadata
      const storageData = JSON.stringify({
        messages: messagesToStore,
        // Important: For "always" mode, we still save but mark as the current mode
        // This ensures data isn't lost on navigation but can be handled correctly later
        expiresAt: autoDeleteMode === "custom" ? expirationTime : null,
        savedAt: Date.now(),
        appMode: currentMode,
        autoDeleteMode: autoDeleteMode,
        messageCount: messagesToStore.length,
        totalCount: validatedMessages.length,
        truncated: validatedMessages.length > messagesToStore.length,
        matchId, // Add match ID for extra validation
      });

      // Save with proper error handling for storage quota
      try {
        localStorage.setItem(storageKey, storageData);
        console.log(
          `[DEBUG] Successfully saved ${messagesToStore.length} messages for match ${matchId}`,
        );

        // Update our cached messages reference for potential future use
        cachedMessagesRef.current = messagesToStore;

        // Also persist the auto-delete settings separately
        localStorage.setItem(
          `${currentMode}_chat_auto_delete_mode_${matchId}`,
          autoDeleteMode,
        );
        if (autoDeleteMode === "custom") {
          localStorage.setItem(
            `${currentMode}_chat_auto_delete_value_${matchId}`,
            String(autoDeleteValue),
          );
          localStorage.setItem(
            `${currentMode}_chat_auto_delete_unit_${matchId}`,
            autoDeleteUnit,
          );
        }
      } catch (storageError) {
        console.error(
          "[ERROR] Storage quota exceeded while saving messages",
          storageError,
        );

        if (messagesToStore.length <= 20) {
          console.error(
            "[ERROR] Already at minimum message count, cannot reduce further",
          );
          return; // Can't reduce any more
        }

        // Reduce message count by 75% and try again (emergency fallback)
        try {
          // Keep only the most recent messages (25% of current count)
          const reducedMessages = messagesToStore.slice(
            -Math.min(50, Math.floor(messagesToStore.length * 0.25)),
          );

          const reducedStorageData = JSON.stringify({
            messages: reducedMessages,
            expiresAt: autoDeleteMode === "custom" ? expirationTime : null,
            savedAt: Date.now(),
            appMode: currentMode,
            autoDeleteMode: autoDeleteMode,
            messageCount: reducedMessages.length,
            totalCount: validatedMessages.length,
            truncated: true,
            matchId,
          });

          try {
            localStorage.setItem(storageKey, reducedStorageData);
            console.log(
              `[DEBUG] Saved reduced set of ${reducedMessages.length} messages after quota error`,
            );

            // Update our cached messages reference with reduced set
            cachedMessagesRef.current = reducedMessages;
          } catch (err) {
            // If even that fails, just save message IDs to maintain read status
            console.error(
              "[ERROR] Failed to save even reduced message set, saving only IDs",
            );
            try {
              const messageIds = validatedMessages.map((m) => m.id);
              localStorage.setItem(
                `${currentMode}_chat_message_ids_${matchId}`,
                JSON.stringify(messageIds),
              );
            } catch (idErr) {
              console.error("[ERROR] Failed to save even message IDs");
            }
          }
        } catch (err) {
          console.error(
            "[ERROR] Unexpected error in fallback message saving:",
            err,
          );
        }
      }
    } catch (error) {
      console.error("[ERROR] Unexpected error in message saving logic:", error);
    }
  }, [
    matchId,
    autoDeleteMode,
    autoDeleteValue,
    autoDeleteUnit,
    calculateExpirationTime,
    currentMode,
    queryClient,
  ]);

  // CRITICAL FIX: Clean up stale data to prevent storage quota issues
  const cleanupOldStorageData = useCallback(() => {
    try {
      console.log(
        "[FIX] Running enhanced storage cleanup to prevent quota issues",
      );

      // Use the centralized cleanupStorage utility function for temporary errors and audio files
      cleanupStorage({
        keyPattern: "_error_|_temp_",
        deleteAll: true,
      });

      // Clean up old chat messages (over 7 days)
      cleanupStorage({
        keyPattern: `${currentMode}_chat_messages_`,
        olderThan: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxItems: 20, // Keep only most recent 20 chats
      });

      // ADVANCED DEDUPLICATION CLEANUP: Also clean up old fingerprint data
      // Clean content fingerprints older than 24 hours (we don't need them long-term)
      cleanupStorage({
        keyPattern: "content_fingerprint_|permanent_content_fingerprint_",
        olderThan: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Clean up old message instance tracking (keep 500 most recent)
      // Force use of sessionStorage
      try {
        // We need to directly access sessionStorage for this specific operation
        const sessionStorageKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) sessionStorageKeys.push(key);
        }

        // Filter keys that match the pattern
        const keys = sessionStorageKeys.filter((key) =>
          key.match(/message_instance_|message_global_/),
        );

        // If we have more than 500, sort by date and remove oldest
        if (keys.length > 500) {
          const keysWithDates = keys.map((key) => {
            const value = sessionStorage.getItem(key) || "0";
            return { key, date: parseInt(value) || 0 };
          });

          // Sort by date (most recent first)
          keysWithDates.sort((a, b) => b.date - a.date);

          // Remove oldest items beyond 500
          keysWithDates.slice(500).forEach((item) => {
            sessionStorage.removeItem(item.key);
          });

          console.log(
            `[CLEANUP] Removed ${keysWithDates.length - 500} old message instance keys`,
          );
        }
      } catch (e) {
        console.warn(`[CLEANUP] Failed to clean up sessionStorage: ${e}`);
      }

      // Also clean up fingerprints in session storage (with direct access)
      try {
        const sessionStorageKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.includes("content_fingerprint_")) {
            sessionStorageKeys.push(key);
          }
        }

        // Clean up old fingerprints (older than 4 hours)
        const fourHours = 4 * 60 * 60 * 1000;
        const now = Date.now();
        let cleaned = 0;

        sessionStorageKeys.forEach((key) => {
          const value = sessionStorage.getItem(key);
          if (value) {
            const timestamp = parseInt(value);
            if (!isNaN(timestamp) && now - timestamp > fourHours) {
              sessionStorage.removeItem(key);
              cleaned++;
            }
          }
        });

        console.log(
          `[CLEANUP] Removed ${cleaned} old fingerprint keys from sessionStorage`,
        );
      } catch (e) {
        console.warn(
          `[CLEANUP] Failed to clean up sessionStorage fingerprints: ${e}`,
        );
      }

      // Get all localStorage keys
      const localStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) localStorageKeys.push(key);
      }

      // Find chat message data that's over 7 days old
      const now = Date.now();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

      localStorageKeys.forEach((key) => {
        if (key.includes("_chat_messages_")) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsedData = JSON.parse(data);
              if (parsedData && parsedData.savedAt) {
                const age = now - parsedData.savedAt;
                if (age > ONE_WEEK) {
                  console.log(
                    `[CLEANUP] Removing old chat data: ${key} (${Math.round(age / 86400000)} days old)`,
                  );
                  localStorage.removeItem(key);
                }
              }
            }
          } catch (e) {
            // If we can't parse it, it might be corrupted - remove it
            localStorage.removeItem(key);
          }
        }
      });

      // Limit the number of matches with stored data to 10
      const matchStorageKeys = localStorageKeys.filter((key) =>
        key.includes("_chat_messages_"),
      );
      if (matchStorageKeys.length > 10) {
        // Sort by saved date if possible
        const keyData = matchStorageKeys
          .map((key) => {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                const parsedData = JSON.parse(data);
                return {
                  key,
                  savedAt: parsedData?.savedAt || 0,
                };
              }
              return { key, savedAt: 0 }; // Default when no data found
            } catch (e) {
              // Return with age 0 if can't parse
              return { key, savedAt: 0 };
            }
          })
          .filter((item) => item !== undefined); // Filter out any undefined items

        // Sort oldest first (with proper type safety)
        keyData.sort((a, b) => {
          // Since we filtered out undefined values above, we can safely assert these are defined
          const savedAtA = a ? a.savedAt || 0 : 0;
          const savedAtB = b ? b.savedAt || 0 : 0;
          return savedAtA - savedAtB;
        });

        // Remove oldest keys beyond the limit of 10
        if (keyData.length > 10) {
          const keysToRemove = keyData.slice(0, keyData.length - 10);
          keysToRemove.forEach((item) => {
            if (item && item.key) {
              console.log(`[CLEANUP] Removing excess chat data: ${item.key}`);
              localStorage.removeItem(item.key);
            }
          });
        }
      }
    } catch (e) {
      console.error("[ERROR] Failed during storage cleanup:", e);
    }
  }, []);

  // Run auto-save periodically and on important state changes
  useEffect(() => {
    if (!matchId) return;

    // Skip initial auto-saves until messages are properly restored
    if (remoteMessages.length === 0 && !hasRestoredMessagesRef.current) {
      return;
    }

    // Run cleanup on component mount - this will free up space
    cleanupOldStorageData();

    // Run initial save after restoration
    const initialSaveTimeout = setTimeout(() => {
      if (hasRestoredMessagesRef.current) {
        console.log(
          `[DEBUG] Running initial message save for match ${matchId}`,
        );
        saveMessages();
      }
    }, 1000);

    // Set up interval for periodic saves
    const saveInterval = setInterval(() => {
      saveMessages();
    }, 5000); // Save every 5 seconds

    // Set up event listener for page navigation/unload
    const handleBeforeUnload = () => {
      console.log(
        `[DEBUG] Page unload detected - saving messages for match ${matchId}`,
      );
      saveMessages();

      // Handle auto-delete for "always" mode when user exits chat
      if (autoDeleteMode === "always" && user) {
        // Use navigator.sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({
          autoDeleteMode: "always",
          autoDeleteValue: autoDeleteValue,
          autoDeleteUnit: autoDeleteUnit,
        });

        try {
          // CRITICAL FIX: Prevent duplicate auto-delete triggers
          const autoDeleteKey = `auto_delete_triggered_${matchId}_${user.id}`;
          const lastTriggered = sessionStorage.getItem(autoDeleteKey);
          const now = Date.now();

          // Only trigger if not triggered in the last 2 seconds
          if (!lastTriggered || now - parseInt(lastTriggered) > 2000) {
            console.log("[AUTO-DELETE] Triggering auto-delete on page unload");

            // Mark as triggered to prevent duplicates
            sessionStorage.setItem(autoDeleteKey, now.toString());

            // Trigger deletion of messages sent/received after "always" mode was activated
            fetch(`/api/matches/${matchId}/trigger-auto-delete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId: user.id }),
              keepalive: true,
            }).catch((error) => {
              console.error(
                "Failed to trigger auto-delete on page unload:",
                error,
              );
            });
          } else {
            console.log(
              `[AUTO-DELETE] Skipping duplicate auto-delete trigger on unload (last triggered ${now - parseInt(lastTriggered)}ms ago)`,
            );
          }
        } catch (error) {
          console.error("Failed to trigger auto-delete on page unload:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(initialSaveTimeout);
      clearInterval(saveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // CRITICAL FIX: Run a final guaranteed save on cleanup
      // This ensures messages are saved before component unmounts during navigation
      console.log(
        `[DEBUG] Component unmounting - final save for match ${matchId}`,
      );

      try {
        // Get the very latest messages from the cache
        const finalMessages =
          queryClient.getQueryData<MessageWithReactions[]>([
            "/api/messages",
            matchId,
          ]) || [];

        if (finalMessages.length > 0) {
          // CRITICAL FIX: Use both sessionStorage and localStorage for redundancy

          // First try sessionStorage which usually has less quota issues
          try {
            const sessionKey = `${currentMode}_session_messages_${matchId}`;
            sessionStorage.setItem(
              sessionKey,
              JSON.stringify({
                messages: finalMessages,
                savedAt: Date.now(),
                matchId,
                cleanupSave: true,
                navigationSave: true,
              }),
            );

            // Also set a special flag that this session has message data
            sessionStorage.setItem(
              `${currentMode}_has_messages_${matchId}`,
              "true",
            );
            sessionStorage.setItem(
              `${currentMode}_message_count_${matchId}`,
              String(finalMessages.length),
            );
          } catch (sessionError) {
            console.warn(
              "[WARNING] Failed to save to sessionStorage during cleanup:",
              sessionError,
            );
          }

          // Also try localStorage as backup
          try {
            // Generate the storage key
            const storageKey = `${currentMode}_chat_messages_${matchId}`;

            // Persist messages with a special flag indicating this was a cleanup save
            const storageData = JSON.stringify({
              messages: finalMessages,
              expiresAt: null, // Never expire these messages
              savedAt: Date.now(),
              appMode: currentMode,
              autoDeleteMode: "never", // Always save as 'never' to preserve messages
              originalAutoDeleteMode: autoDeleteMode, // Keep track of the original setting
              messageCount: finalMessages.length,
              cleanupSave: true,
              matchId,
            });

            // Store with a synchronous call to ensure it completes
            localStorage.setItem(storageKey, storageData);
          } catch (localError) {
            console.error(
              "[ERROR] Failed localStorage save during cleanup - but sessionStorage might have worked:",
              localError,
            );
          }
        }
      } catch (error) {
        console.error("[ERROR] Failed during final cleanup save:", error);
      }
    };
  }, [
    matchId,
    remoteMessages.length,
    hasRestoredMessagesRef.current,
    saveMessages,
    queryClient,
    currentMode,
    autoDeleteMode,
    cleanupOldStorageData,
  ]);
  // Notify server when user opens or leaves this chat and handle auto-delete
  useEffect(() => {
    if (isConnected && matchId) {
      // Tell server user is viewing this chat
      setActiveChatStatus(matchId, true);

      // Return cleanup function to tell server user left this chat
      return () => {
        setActiveChatStatus(matchId, false);

        // Get current messages before leaving
        const currentMessages =
          queryClient.getQueryData<MessageWithReactions[]>([
            "/api/messages",
            matchId,
          ]) || [];

        if (currentMessages.length === 0) {
          return; // No messages to save
        }

        // Define the mode-specific storage key
        const storageKey = `${currentMode}_chat_messages_${matchId}`;

        // Handle different auto-delete modes when leaving chat
        // Handle auto-delete for "always" mode when leaving chat
        if (autoDeleteMode === "always") {
          // CRITICAL FIX: Prevent duplicate auto-delete triggers
          const autoDeleteKey = `auto_delete_triggered_${matchId}_${user?.id}`;
          const lastTriggered = sessionStorage.getItem(autoDeleteKey);
          const now = Date.now();

          // Only trigger if not triggered in the last 2 seconds
          if (!lastTriggered || now - parseInt(lastTriggered) > 2000) {
            console.log(
              `[AUTO-DELETE] Triggering immediate auto-delete for always mode when leaving chat`,
            );

            // Mark as triggered to prevent duplicates
            sessionStorage.setItem(autoDeleteKey, now.toString());

            // Trigger auto-delete on the server
            fetch(`/api/matches/${matchId}/trigger-auto-delete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({}),
              keepalive: true,
            })
              .then((response) => {
                if (response.ok) {
                  console.log(
                    `[AUTO-DELETE] Successfully triggered auto-delete for match ${matchId}`,
                  );

                  // Force immediate cache invalidation
                  setTimeout(() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/matches"],
                    });
                    console.log(
                      `[AUTO-DELETE] Forced matches cache invalidation`,
                    );
                  }, 100);
                } else {
                  console.error(
                    `[AUTO-DELETE] Failed to trigger auto-delete: ${response.status}`,
                  );
                }
              })
              .catch((error) => {
                console.error(
                  "[AUTO-DELETE] Error triggering auto-delete:",
                  error,
                );
              });

            // Clear messages from local storage immediately
            try {
              const storageKey = `${currentMode}_messages_${matchId}`;
              const chatStorageKey = `${currentMode}_chat_messages_${matchId}`;
              safeStorageRemove(storageKey);
              safeStorageRemove(chatStorageKey);
              console.log(
                `[AUTO-DELETE] Cleared local storage for match ${matchId}`,
              );
            } catch (storageError) {
              console.warn(
                "Could not clear messages from local storage:",
                storageError,
              );
            }
          } else {
            console.log(
              `[AUTO-DELETE] Skipping duplicate auto-delete trigger for match ${matchId} (last triggered ${now - parseInt(lastTriggered)}ms ago)`,
            );
          }
        } else if (autoDeleteMode === "custom") {
          // For custom auto-delete, store messages with expiration time
          const expirationTime = calculateExpirationTime(
            autoDeleteValue,
            autoDeleteUnit,
          );

          // Validate messages before saving on exit
          const validatedMessages = currentMessages.map((msg) => {
            // Fix any message missing a valid createdAt timestamp
            if (!msg.createdAt || isNaN(new Date(msg.createdAt).getTime())) {
              console.log(
                "Fixing message with missing createdAt on exit:",
                msg.id,
              );
              return {
                ...msg,
                createdAt: new Date().toISOString(),
                _fixedCreatedAt: true,
              };
            }
            return msg;
          });

          // Limit the number of messages stored to prevent exceeding localStorage quota
          const messagesToStore =
            validatedMessages.length > 100
              ? validatedMessages.slice(-50) // Keep only last 50 messages if there are many
              : validatedMessages;

          // Save with additional metadata
          const storageData = JSON.stringify({
            messages: messagesToStore,
            expiresAt: expirationTime,
            savedAt: Date.now(),
            appMode: currentMode,
            autoDeleteMode: "custom",
            messageCount: messagesToStore.length,
            totalCount: validatedMessages.length,
            truncated: validatedMessages.length > 100,
          });

          // Try to save with error handling for storage quota
          try {
            localStorage.setItem(storageKey, storageData);
            console.log(
              `${messagesToStore.length} of ${currentMessages.length} messages saved with expiration in ${autoDeleteValue} ${autoDeleteUnit} for mode ${currentMode}`,
              { expiresAt: new Date(expirationTime).toLocaleString() },
            );
          } catch (storageError) {
            console.error(
              `Error saving messages on exit in "custom" mode for ${currentMode}:`,
              storageError,
            );

            // If we still have many messages, try with even fewer (just 20)
            if (messagesToStore.length > 20) {
              const reducedMessages = validatedMessages.slice(-20);
              const reducedStorageData = JSON.stringify({
                messages: reducedMessages,
                expiresAt: expirationTime,
                savedAt: Date.now(),
                appMode: currentMode,
                autoDeleteMode: "custom",
                messageCount: reducedMessages.length,
                totalCount: validatedMessages.length,
                truncated: true,
              });

              try {
                localStorage.setItem(storageKey, reducedStorageData);
                console.log(
                  `Saved reduced set of ${reducedMessages.length} messages for mode ${currentMode} after quota error on exit`,
                );
              } catch (err) {
                console.error(
                  `Failed to save even reduced message set on exit for mode ${currentMode}`,
                );
              }
            }
          }
        } else if (autoDeleteMode === "never") {
          // Using the mode-specific storage key already defined above

          // Validate messages before saving (never mode)
          const validatedMessages = currentMessages.map((msg) => {
            if (!msg.createdAt || isNaN(new Date(msg.createdAt).getTime())) {
              console.log(
                "Fixing message with missing createdAt on exit (never mode):",
                msg.id,
              );
              return {
                ...msg,
                createdAt: new Date().toISOString(),
                _fixedCreatedAt: true,
              };
            }
            return msg;
          });

          // Limit the number of messages stored to prevent exceeding localStorage quota
          const messagesToStore =
            validatedMessages.length > 100
              ? validatedMessages.slice(-50) // Keep only last 50 messages if there are many
              : validatedMessages;

          // For 'never' mode, store messages indefinitely with explicit metadata
          const saveData = JSON.stringify({
            messages: messagesToStore,
            expiresAt: null,
            savedAt: Date.now(),
            autoDeleteMode: "never",
            messageCount: messagesToStore.length,
            totalCount: validatedMessages.length,
            truncated: validatedMessages.length > 100,
          });

          // Keep track of auto-delete setting explicitly
          safeStorageSet(
            `${currentMode}_chat_auto_delete_mode_${matchId}`,
            "never",
          );

          try {
            // Save the messages - need to clear storage first in case of corruption
            safeStorageRemove(storageKey);
            safeStorageSet(storageKey, saveData);

            // Verify the data was saved correctly
            const saved = safeStorageGet(storageKey);
            if (saved) {
              try {
                const data = JSON.parse(saved);
                if (
                  data &&
                  Array.isArray(data.messages) &&
                  data.messages.length > 0
                ) {
                  console.log(
                    `${data.messages.length} messages saved permanently in "never" mode - verified`,
                  );
                } else {
                  console.error("Saved data structure invalid:", data);
                }
              } catch (error) {
                console.error("Error parsing saved data:", error);
              }
            } else {
              // If storage is full, try to clear some space by removing non-essential data
              console.error(
                "Failed to save messages - storage may be full, trying to clear space",
              );

              // Emergency fallback: save just the latest 10 messages if there are too many
              if (currentMessages.length > 20) {
                // Get latest messages and ensure they have valid timestamps
                const latestMessages = currentMessages.slice(-10).map((msg) => {
                  if (
                    !msg.createdAt ||
                    isNaN(new Date(msg.createdAt).getTime())
                  ) {
                    return {
                      ...msg,
                      createdAt: new Date().toISOString(),
                      _fixedCreatedAt: true,
                      _emergency: true,
                    };
                  }
                  return msg;
                });

                safeStorageSet(
                  storageKey,
                  JSON.stringify({
                    messages: latestMessages,
                    expiresAt: null,
                    savedAt: Date.now(),
                    autoDeleteMode: "never",
                    truncated: true,
                  }),
                );
                console.log("Saved latest 10 messages as fallback");
              }
            }
          } catch (error) {
            console.error('Error saving messages in "never" mode:', error);
          }
        }
      };
    }
  }, [
    isConnected,
    matchId,
    setActiveChatStatus,
    autoDeleteMode,
    autoDeleteValue,
    autoDeleteUnit,
    calculateExpirationTime,
    queryClient,
    currentMode,
  ]);

  // Show notifications for new messages
  useEffect(() => {
    if (!("Notification" in window)) return;

    // Check if any new messages arrived from the other user
    if (remoteMessages.length > previousMessagesLengthRef.current) {
      const newMessages = remoteMessages.slice(
        previousMessagesLengthRef.current,
      );
      const otherUserMessages = newMessages.filter(
        (msg: MessageWithReactions) => msg.senderId === otherUser.id,
      );

      if (
        otherUserMessages.length > 0 &&
        Notification.permission === "granted"
      ) {
        // Don't show notifications if the user is already in the chat
        if (document.visibilityState === "visible") return;

        // Create notification
        const latestMessage = otherUserMessages[otherUserMessages.length - 1];
        const notifTitle = `${otherUser.fullName}`;
        const notifOptions = {
          body:
            latestMessage.content.length > 50
              ? latestMessage.content.substring(0, 47) + "..."
              : latestMessage.content,
          icon: otherUser.photoUrl || undefined,
        };

        try {
          const notification = new Notification(notifTitle, notifOptions);

          // When notification is clicked, focus the window and scroll to latest message
          notification.onclick = function () {
            window.focus();
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            notification.close();
          };

          // Auto close after 5 seconds
          setTimeout(() => notification.close(), 5000);
        } catch (error) {
          console.error("Error showing notification:", error);
        }
      }
    }
  }, [remoteMessages.length, otherUser]);

  // CRITICAL FIX FOR MESSAGE DISAPPEARANCE
  useEffect(() => {
    // This effect manages message persistence for navigation
    if (!matchId || !remoteMessages.length) return;

    // Get the React Query cache data to persist
    const currentMessages = queryClient.getQueryData<MessageWithReactions[]>([
      "/api/messages",
      matchId,
    ]);

    if (!currentMessages || currentMessages.length === 0) return;

    console.log(
      `[CRITICAL FIX] Persist ${currentMessages.length} messages for match ${matchId}`,
    );

    // Use a more reliable key format that will resist navigation issues
    const storageKey = `meet_messages_${matchId}`;

    // Store the data with reliable persistence
    try {
      // Store in sessionStorage as primary storage with fallback to localStorage
      // But optimize storage usage to prevent quota errors
      const dataToStore = JSON.stringify({
        messages: currentMessages,
        timestamp: Date.now(),
      });

      // Use safe storage utilities that handle quota issues and fallbacks automatically
      try {
        if (currentMessages.length > 100) {
          // For large message count, store only the 50 most recent messages
          const recentMessages = currentMessages.slice(-50);
          const reducedData = JSON.stringify({
            messages: recentMessages,
            timestamp: Date.now(),
            truncated: true,
            originalCount: currentMessages.length,
          });
          safeStorageSet(storageKey, reducedData);
        } else {
          safeStorageSet(storageKey, dataToStore);
        }
      } catch (e) {
        console.warn("[WARNING] Safe storage save failed:", e);
      }

      console.log(
        `[CRITICAL FIX] Successfully persisted ${currentMessages.length} messages for match ${matchId}`,
      );
    } catch (e) {
      console.error("[ERROR] All persistence attempts failed:", e);
    }

    // Register cleanup function for reliable persistence
    return () => {
      try {
        // On cleanup, perform one final save to ensure latest messages are stored
        // But use storage optimization to prevent quota errors
        const finalMessages = queryClient.getQueryData<MessageWithReactions[]>([
          "/api/messages",
          matchId,
        ]);
        if (finalMessages && finalMessages.length > 0) {
          const unmountKey = `meet_final_${matchId}`;

          // Prepare data for storage
          const finalData = JSON.stringify({
            messages: finalMessages,
            timestamp: Date.now(),
            unmountSave: true,
          });

          try {
            // Use safe storage utilities that handle all storage types and quota issues
            if (finalMessages.length > 100) {
              // For large message count, store only the 50 most recent messages
              const recentMessages = finalMessages.slice(-50);
              const reducedData = JSON.stringify({
                messages: recentMessages,
                timestamp: Date.now(),
                unmountSave: true,
                truncated: true,
                originalCount: finalMessages.length,
              });
              safeStorageSet(unmountKey, reducedData);
            } else {
              safeStorageSet(unmountKey, finalData);
            }
          } catch (error) {
            console.warn("[WARNING] Safe storage unmount save failed:", error);
          }

          console.log(
            `[UNMOUNT] Saved ${finalMessages.length} messages on unmount for match ${matchId}`,
          );
        }
      } catch (e) {
        console.error("[ERROR] Failed to save on unmount:", e);
      }
    };
  }, [matchId, currentMode, remoteMessages, queryClient]);

  // Scroll to bottom on new messages (only for new incoming messages, not initial load)
  useEffect(() => {
    if (
      messagesEndRef.current &&
      remoteMessages.length > previousMessagesLengthRef.current &&
      !isRestoringScrollPosition &&
      hasRestoredScrollRef.current // Only after scroll position has been handled
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    previousMessagesLengthRef.current = remoteMessages.length;
  }, [remoteMessages.length, isRestoringScrollPosition]);

  // ENHANCED: Restore scroll position immediately when messages are loaded with proper bottom scrolling
  useEffect(() => {
    if (remoteMessages.length > 0 && !hasRestoredScrollRef.current) {
      // Use requestAnimationFrame to restore position in next paint cycle
      requestAnimationFrame(() => {
        const wasRestored = restoreScrollPosition();
        if (!wasRestored) {
          // No saved position - scroll to bottom instantly without animation
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
            console.log(
              `[SCROLL-RESTORE] 📭 No saved position - scrolled to bottom for match ${matchId}`,
            );
          }
          hasRestoredScrollRef.current = true;
          setIsRestoringScrollPosition(false);
        }
        // Show messages after scroll position is restored
        setIsPreparingMessages(false);
        setIsRestoringScrollPosition(false);
      });
    }
  }, [remoteMessages.length]);

  // Handle emoji picker open with position calculation
  const handleEmojiPickerOpenChange = (open: boolean) => {
    if (open) {
      // Calculate optimal position before opening
      const { side, align } = calculateEmojiPickerPosition();
      setEmojiPickerSide(side);
      setEmojiPickerAlign(align as "start" | "center" | "end");
      console.log(
        `🎯 [EMOJI-PICKER] Opening with side=${side}, align=${align}`,
      );
    }
    setShowEmojiPicker(open);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size validation removed - now accepting files of any size

    try {
      setIsUploading(true);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Create a special message format for images
      const imageMessage = `_!_IMAGE_!_${base64}`;

      // Send the image message
      await sendMessage({ content: imageMessage });

      // Clear the file input
      if (e.target) {
        e.target.value = "";
      }

      toast({
        title: "Image sent",
        description: "Your image has been sent successfully",
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle message input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value;
    setMessageText(newMessage);

    // Handle typing indicator
    if (isConnected) {
      // Only emit if state changes
      if (!localTypingState) {
        setLocalTypingState(true);
        updateTypingStatus(matchId, true);
      }

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout
      const newTimeout = setTimeout(() => {
        setLocalTypingState(false);
        if (isConnected) {
          updateTypingStatus(matchId, false);
        }
      }, 2000);

      setTypingTimeout(newTimeout as NodeJS.Timeout);
    }
  };

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = messageText.trim();
    if (trimmedMessage.length === 0) return;

    // Store the message content in a variable before clearing the input
    const messageContent = trimmedMessage;

    // Clear the input immediately to improve UX
    setMessageText("");
    // FIXED: Don't clear replyToMessage here - let it persist until server confirms
    // setReplyToMessage(null);

    // CRITICAL FIX: Add a check to prevent duplicate submissions of the same message
    // Use both local storage and component state to track the last sent message
    const lastSentKey = `${currentMode}_last_sent_message_${matchId}`;
    const lastSentData = safeStorageGet(lastSentKey);
    let lastSentMessage = "";
    let lastSentTime = 0;
    let lastSentSessionId = "";

    // Get the current session ID for this conversation
    const messageSessionKey = `${currentMode}_message_session_id`;
    const currentSessionId =
      safeStorageGet(messageSessionKey) ||
      Date.now().toString() + Math.random().toString(36).substring(2, 15);

    try {
      if (lastSentData) {
        const parsed = JSON.parse(lastSentData);
        lastSentMessage = parsed.content || "";
        lastSentTime = parsed.time || 0;
        lastSentSessionId = parsed.sessionId || "";
      }
    } catch (e) {
      console.error("Error parsing last sent message:", e);
    }

    // If this exact message was sent in the last 10 seconds, don't send it again
    const now = Date.now();
    // Check for exact matches within the same session and also very recent messages across sessions
    const isDuplicate =
      (lastSentMessage === messageContent &&
        lastSentSessionId === currentSessionId &&
        now - lastSentTime < 30000) ||
      (lastSentMessage === messageContent && now - lastSentTime < 5000);

    if (isDuplicate) {
      console.log(
        `[DUPLICATE PREVENTION] Blocking duplicate send of "${messageContent}" (sent ${(now - lastSentTime) / 1000}s ago)`,
      );
      toast({
        title: "Message already sent",
        description:
          "Please wait a moment before sending the same message again.",
        variant: "default",
      });
      return;
    }

    // Track this message as the last sent one with session ID
    try {
      safeStorageSet(
        lastSentKey,
        JSON.stringify({
          content: messageContent,
          time: now,
          sessionId: currentSessionId,
        }),
      );
    } catch (e) {
      console.error("Error saving last sent message:", e);
    }

    // Force deduplication before adding new messages to ensure we have clean state
    dedupeTriggerRef.current = true;

    // COMPLETELY RESTRUCTURED APPROACH:
    // Generate a temporary ID that will be used for deduplication
    const tempId = -Math.floor(Math.random() * 1000000);

    // Create a temporary message for UI feedback before sending
    const tempMessage: MessageWithReactions = {
      id: tempId,
      matchId,
      senderId: user!.id,
      receiverId: otherUser.id,
      content: messageContent,
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
      sending: true,
      replyToMessageId: replyToMessage?.id,
      replyToMessage: replyToMessage || undefined,
    };

    // CRITICAL FIX: Instead of manipulating both state sources independently,
    // update local state first, then sync to cache from the state
    setRemoteMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, tempMessage];

      // Now synchronize this state to the query cache
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        updatedMessages,
      );

      // Return the updated messages for state update
      return updatedMessages;
    });

    console.log(
      "[NEW APPROACH] Single-source-of-truth message added, temp ID:",
      tempId,
    );

    // Now attempt to send the message
    try {
      // Debug: Allow simulating failures for testing with special content
      if (messageContent === "test-fail") {
        console.log("Simulating message failure for testing");

        // Wait a bit then mark the temp message as failed
        setTimeout(() => {
          queryClient.setQueryData<MessageWithReactions[]>(
            ["/api/messages", matchId],
            (old) =>
              (old || []).map((msg) =>
                msg.id === tempId
                  ? { ...msg, sending: false, error: true }
                  : msg,
              ),
          );

          toast({
            title: "Failed to send message",
            description: "Simulated failure for testing. Try the retry button.",
            variant: "destructive",
          });
        }, 2000);
      } else {
        // Normal flow: Send the message with reply data if applicable
        sendMessage({
          content: messageContent,
          replyToMessageId: replyToMessage?.id,
          replyToMessage: replyToMessage || undefined,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Message will be marked as failed by the mutation error handler
    }

    // Clear typing state
    if (isConnected && localTypingState) {
      setLocalTypingState(false);
      updateTypingStatus(matchId, false);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }

    // Scroll to bottom to show the new message (user-initiated action)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Handle message long press (for reactions)
  const handleMessageLongPress = (msg: MessageWithReactions) => {
    // Implement reaction UI in the future
    toast({
      title: "Coming Soon",
      description: "Message reactions will be available soon",
    });
  };

  // Handle retry for failed messages
  // Message action handlers
  const handleReply = (messageId: number, content: string) => {
    const message = queryClient
      .getQueryData<MessageWithReactions[]>(["/api/messages", matchId])
      ?.find((m) => m.id === messageId);

    if (message) {
      setReplyToMessage({
        id: messageId,
        content: content,
        senderName:
          message.senderId === user?.id ? user.fullName : otherUser.fullName, // Store actual name, not "You"
        isCurrentUser: message.senderId === user?.id,
      });

      // Focus the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleCopy = (content: string) => {
    toast({
      title: "Copied to clipboard",
      description: "Message text has been copied to your clipboard",
    });
  };
  const handleUnsend = async (messageId: number) => {
    try {
      console.log(`🗑️ Starting unsend process for message ${messageId}`);

      // First, mark the message as being deleted (to prevent double-clicks)
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        (old) =>
          (old || []).map((msg) =>
            msg.id === messageId
              ? { ...msg, sending: true, content: "Removing..." } // Visual indicator
              : msg,
          ),
      );

      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to unsend message";
        let shouldPreserveMatch = false;

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;

            // Handle "Message not found" case gracefully
            if (
              errorMessage.includes("Message not found") ||
              response.status === 404
            ) {
              console.log(
                `Message ${messageId} not found - likely already deleted`,
              );

              // Force remove from cache immediately
              queryClient.setQueryData<MessageWithReactions[]>(
                ["/api/messages", matchId],
                (old) => (old || []).filter((msg) => msg.id !== messageId),
              );

              toast({
                title: "Message removed",
                description: "Message was already unsent",
                variant: "default",
              });
              return;
            }

            // CRITICAL FIX: Handle "Match not found" errors without causing confusion
            if (errorMessage.includes("Match not found")) {
              shouldPreserveMatch = true;
              errorMessage =
                "Temporary connection issue. Your match is safe - please try again.";

              // Log this as a potential issue for investigation
              console.warn(
                `⚠️ MATCH LOOKUP FAILED during message deletion for match ${matchId}. This should not happen.`,
              );

              // Show specific guidance for this error
              toast({
                title: "Connection Issue",
                description:
                  "Don't worry - your match is still there. Please refresh and try again.",
                variant: "default",
              });

              // Revert the loading state without aggressive cache clearing
              queryClient.setQueryData<MessageWithReactions[]>(
                ["/api/messages", matchId],
                (old) =>
                  (old || []).map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          sending: false,
                          content:
                            msg.content === "Removing..." ? "" : msg.content,
                        }
                      : msg,
                  ),
              );

              return; // Exit early to avoid further error handling
            }
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
          }
        } else {
          if (response.status === 401) {
            errorMessage = "You need to log in again to perform this action";
          } else if (response.status >= 500) {
            // Server errors shouldn't affect match state
            shouldPreserveMatch = true;
            errorMessage =
              "Server temporarily unavailable. Your match is safe - please try again.";
          } else {
            errorMessage = `Connection issue (${response.status}). Your match is safe - please try again.`;
            shouldPreserveMatch = true;
          }
        }

        // MOBILE-FRIENDLY: Revert the loading state without aggressive cache invalidation
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) =>
            (old || []).map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    sending: false,
                    content: msg.content === "Removing..." ? "" : msg.content,
                  }
                : msg,
            ),
        );

        // Show user-friendly error message
        if (shouldPreserveMatch) {
          console.log(
            `🛡️ Preserving match state despite error: ${errorMessage}`,
          );
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(
        `✅ Message ${messageId} successfully deleted from server:`,
        result,
      );

      // MOBILE-FRIENDLY: Less aggressive cache removal to prevent match disappearing
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        (old) => {
          const filtered = (old || []).filter((msg) => msg.id !== messageId);
          console.log(
            `🔄 Removed message ${messageId} from cache. Messages remaining:`,
            filtered.length,
          );
          return filtered;
        },
      );

      // Clear from storage layers with error resilience
      try {
        // Clear from localStorage
        const storageKey = `${currentMode}_messages_${matchId}`;
        const storedMessages = safeStorageGet(storageKey);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages);
          const filtered = parsed.filter((msg: any) => msg.id !== messageId);
          safeStorageSet(storageKey, JSON.stringify(filtered));
          console.log(`🧹 Cleared message ${messageId} from localStorage`);
        }

        // Clear from sessionStorage
        const sessionKey = `${currentMode}_session_messages_${matchId}`;
        const sessionData = sessionStorage.getItem(sessionKey);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.messages) {
            parsed.messages = parsed.messages.filter(
              (msg: any) => msg.id !== messageId,
            );
            sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
            console.log(`🧹 Cleared message ${messageId} from sessionStorage`);
          }
        }

        // Clear from any chat-specific caches
        const chatStorageKey = `${currentMode}_chat_messages_${matchId}`;
        const chatData = safeStorageGet(chatStorageKey);
        if (chatData) {
          const parsed = JSON.parse(chatData);
          if (parsed.messages) {
            parsed.messages = parsed.messages.filter(
              (msg: any) => msg.id !== messageId,
            );
            safeStorageSet(chatStorageKey, JSON.stringify(parsed));
            console.log(`🧹 Cleared message ${messageId} from chat storage`);
          }
        }
      } catch (storageError) {
        console.warn("Could not clear message from storage:", storageError);
        // Continue execution - don't fail the entire operation for storage issues
      }

      // Update component state
      setRemoteMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId),
      );

      // GENTLE cache refresh (don't force aggressive invalidation)
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", matchId],
        refetchType: "none", // Don't force immediate refetch
      });

      toast({
        title: "Message unsent",
        description: "The message has been permanently removed",
      });
    } catch (error) {
      console.error("Failed to unsend message:", error);

      // Gentle revert of loading states
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        (old) =>
          (old || []).map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  sending: false,
                  content: msg.content === "Removing..." ? "" : msg.content,
                }
              : msg,
          ),
      );

      // Show user-friendly error message
      const isTemporaryError =
        error instanceof Error &&
        (error.message.includes("connection") ||
          error.message.includes("temporarily") ||
          error.message.includes("safe"));

      toast({
        title: isTemporaryError ? "Temporary Issue" : "Failed to unsend",
        description:
          error instanceof Error
            ? error.message
            : "Could not remove the message. Please try again.",
        variant: isTemporaryError ? "default" : "destructive",
      });
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      console.log(
        `🗑️ Starting delete process for message ${messageId} (recipient-side)`,
      );

      // Optimistic update: Remove message from UI immediately
      queryClient.setQueryData<MessageWithReactions[]>(
        ["/api/messages", matchId],
        (old) => (old || []).filter((msg) => msg.id !== messageId),
      );

      const response = await fetch(`/api/messages/${messageId}/recipient`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete message";

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
          }
        } else {
          if (response.status === 401) {
            errorMessage = "You need to log in again to perform this action";
          } else {
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }

        // Revert the optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["/api/messages", matchId] });

        throw new Error(errorMessage);
      }

      // Clear from local storage as well
      try {
        const storageKey = `${currentMode}_messages_${matchId}`;
        const storedMessages = safeStorageGet(storageKey);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages);
          const filtered = parsed.filter((msg: any) => msg.id !== messageId);
          safeStorageSet(storageKey, JSON.stringify(filtered));
          console.log(`🧹 Cleared message ${messageId} from local storage`);
        }
      } catch (storageError) {
        console.warn(
          "Could not clear message from local storage:",
          storageError,
        );
      }

      console.log(
        `✅ Message ${messageId} successfully deleted from recipient view`,
      );

      toast({
        title: "Message deleted",
        description: "The message has been removed from your view",
      });
    } catch (error) {
      console.error("Failed to delete message:", error);

      toast({
        title: "Failed to delete",
        description:
          error instanceof Error
            ? error.message
            : "Could not delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmojiReact = async (messageId: number, emoji: string) => {
    console.log(
      `🎯 handleEmojiReact called with messageId: ${messageId}, emoji: ${emoji}`,
    );
    try {
      // Check if user already reacted with this emoji
      const currentMessage = queryClient
        .getQueryData<MessageWithReactions[]>(["/api/messages", matchId])
        ?.find((msg) => msg.id === messageId);

      console.log(`📝 Current message found:`, currentMessage);

      const existingReaction = currentMessage?.reactions?.find(
        (r) => r.emoji === emoji,
      );
      const userAlreadyReacted = existingReaction?.users.includes(
        user?.fullName || "You",
      );

      // Check if user has ANY other reaction on this message (different emoji)
      const userOtherReaction = currentMessage?.reactions?.find(
        (r) => r.emoji !== emoji && r.users.includes(user?.fullName || "You"),
      );

      console.log(`🔍 Existing reaction with same emoji:`, existingReaction);
      console.log(
        `👤 User already reacted with same emoji:`,
        userAlreadyReacted,
      );
      console.log(`🔄 User has other reaction:`, userOtherReaction);

      if (userAlreadyReacted) {
        // Remove reaction
        console.log(
          `🗑️ Removing reaction for message ${messageId} with emoji ${emoji}`,
        );
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emoji }),
        });

        console.log(`📡 DELETE response status:`, response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ DELETE failed:`, errorText);
          throw new Error(
            `Failed to remove reaction: ${response.status} ${errorText}`,
          );
        }

        // Update local state optimistically
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) =>
            (old || []).map((msg) => {
              if (msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                return {
                  ...msg,
                  reactions: existingReactions
                    .map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            count: Math.max(0, r.count - 1),
                            users: r.users.filter(
                              (u) => u !== (user?.fullName || "You"),
                            ),
                          }
                        : r,
                    )
                    .filter((r) => r.count > 0), // Remove reactions with 0 count
                };
              }
              return msg;
            }),
        );

        toast({
          title: "Reaction removed",
          description: `Removed ${emoji} reaction`,
        });
      } else {
        // If user has a different reaction, remove it first
        if (userOtherReaction) {
          console.log(
            `🔄 Removing user's previous reaction: ${userOtherReaction.emoji}`,
          );
          const removeResponse = await fetch(
            `/api/messages/${messageId}/reactions`,
            {
              method: "DELETE",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ emoji: userOtherReaction.emoji }),
            },
          );

          console.log(
            `📡 DELETE previous reaction response status:`,
            removeResponse.status,
          );
          if (!removeResponse.ok) {
            const errorText = await removeResponse.text();
            console.error(`❌ DELETE previous reaction failed:`, errorText);
            throw new Error(
              `Failed to remove previous reaction: ${removeResponse.status} ${errorText}`,
            );
          }

          // Update local state to remove the previous reaction
          queryClient.setQueryData<MessageWithReactions[]>(
            ["/api/messages", matchId],
            (old) =>
              (old || []).map((msg) => {
                if (msg.id === messageId) {
                  const existingReactions = msg.reactions || [];
                  return {
                    ...msg,
                    reactions: existingReactions
                      .map((r) =>
                        r.emoji === userOtherReaction.emoji
                          ? {
                              ...r,
                              count: Math.max(0, r.count - 1),
                              users: r.users.filter(
                                (u) => u !== (user?.fullName || "You"),
                              ),
                            }
                          : r,
                      )
                      .filter((r) => r.count > 0), // Remove reactions with 0 count
                  };
                }
                return msg;
              }),
          );
        }

        // Add new reaction
        console.log(
          `➕ Adding reaction for message ${messageId} with emoji ${emoji}`,
        );
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emoji }),
        });

        console.log(`📡 POST response status:`, response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ POST failed:`, errorText);
          throw new Error(
            `Failed to add reaction: ${response.status} ${errorText}`,
          );
        }

        // Update local state optimistically
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) =>
            (old || []).map((msg) => {
              if (msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                const existingReaction = existingReactions.find(
                  (r) => r.emoji === emoji,
                );

                if (existingReaction) {
                  // Update existing reaction
                  return {
                    ...msg,
                    reactions: existingReactions.map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            count: r.count + 1,
                            users: [...r.users, user?.fullName || "You"],
                          }
                        : r,
                    ),
                  };
                } else {
                  // Add new reaction
                  return {
                    ...msg,
                    reactions: [
                      ...existingReactions,
                      {
                        emoji,
                        count: 1,
                        users: [user?.fullName || "You"],
                      },
                    ],
                  };
                }
              }
              return msg;
            }),
        );

        toast({
          title: userOtherReaction ? "Reaction changed" : "Reaction added",
          description: userOtherReaction
            ? `Changed reaction to ${emoji}`
            : `Reacted with ${emoji}`,
        });
      }
    } catch (error) {
      console.error("Failed to handle reaction:", error);
      toast({
        title: "Failed to react",
        description: "Could not handle reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRetryMessage = (msg: MessageWithReactions) => {
    if (!msg.error) return;

    // Get the current session ID for this conversation
    const messageSessionKey = `${currentMode}_message_session_id`;
    const currentSessionId =
      safeStorageGet(messageSessionKey) ||
      Date.now().toString() + Math.random().toString(36).substring(2, 15);

    // CRITICAL FIX: Add a check to prevent duplicate retries of the same message
    const lastRetryKey = `${currentMode}_last_retry_message_${matchId}_${msg.id}`;
    const lastRetryData = safeStorageGet(lastRetryKey);
    let lastRetryTime = 0;
    let lastRetrySessionId = "";

    try {
      if (lastRetryData) {
        const parsed = JSON.parse(lastRetryData);
        lastRetryTime = parsed.time || 0;
        lastRetrySessionId = parsed.sessionId || "";
      }
    } catch (e) {
      console.error("Error parsing last retry data:", e);
    }

    // If this message was retried in the last 5 seconds, don't retry it again
    const now = Date.now();
    // Enhanced check looks at session ID and time
    const isDuplicate =
      (lastRetrySessionId === currentSessionId &&
        now - lastRetryTime < 15000) ||
      now - lastRetryTime < 5000;

    if (isDuplicate) {
      console.log(
        `[ENHANCED DUPLICATE] Blocking duplicate retry of message (retried ${(now - lastRetryTime) / 1000}s ago, session match: ${lastRetrySessionId === currentSessionId})`,
      );
      return;
    }

    // Track this retry as the last one for this message with session ID
    try {
      safeStorageSet(
        lastRetryKey,
        JSON.stringify({
          time: now,
          sessionId: currentSessionId,
          content: msg.content,
          messageType: msg.messageType || "text",
        }),
      );
      console.log(
        `[ENHANCED DUPLICATE] Tracking retry with session ID: ${currentSessionId.substring(0, 8)}...`,
      );
    } catch (e) {
      console.error("Error saving last retry time:", e);
    }

    // Update message to show it's being retried
    queryClient.setQueryData<MessageWithReactions[]>(
      ["/api/messages", matchId],
      (old) =>
        (old || []).map((m) =>
          m.id === msg.id
            ? {
                ...m,
                sending: true,
                error: false,
                retryCount: (m.retryCount || 0) + 1,
              }
            : m,
        ),
    );

    // Small delay before sending to allow UI to update
    setTimeout(() => {
      // Create a temporary reference to the retrying message
      const retryingMessage = {
        ...msg,
        sending: true,
        error: false,
        retryCount: (msg.retryCount || 0) + 1,
      };

      // Save temp ID reference if it's an audio message
      if (msg.messageType === "audio" && msg.audioUrl) {
        try {
          // Store the audio URL with the new temporary ID for immediate playback
          if (msg.id !== retryingMessage.id) {
            const originalAudioUrl = safeStorageGet(
              `${currentMode}_audio_message_${msg.id}`,
            );
            if (originalAudioUrl) {
              safeStorageSet(
                `${currentMode}_audio_message_${retryingMessage.id}`,
                originalAudioUrl,
              );
              safeStorageSet(
                `${currentMode}_temp_message_${retryingMessage.id}`,
                "retry",
              );
            }
          }
        } catch (error) {
          console.error(
            "Error updating audio message mapping for retry:",
            error,
          );
        }
      }

      // Resend with original content
      sendMessage({
        content: msg.content,
        messageType: msg.messageType,
        audioUrl: msg.audioUrl,
        audioDuration: msg.audioDuration,
      });

      // After a short time, if the message is still pending, remove it
      // This prevents old retry messages from lingering
      setTimeout(() => {
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old) => (old || []).filter((m) => !(m.id === msg.id && m.sending)),
        );
      }, 10000); // Remove after 10 seconds if still sending
    }, 300);
  };

  // Format message time
  const formatMessageTime = (dateStr: string) => {
    try {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return format(date, "h:mm a");
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "";
    }
  };

  // Group messages by date
  const groupMessagesByDate = useCallback(
    (messages: MessageWithReactions[]): MessageGroup[] => {
      try {
        const groups: Record<string, MessageWithReactions[]> = {};

        messages.forEach((msg) => {
          try {
            if (!msg.createdAt) {
              console.warn("Message missing createdAt:", msg);
              return;
            }

            const date = new Date(msg.createdAt);
            if (isNaN(date.getTime())) {
              console.warn("Invalid date in message:", msg);
              return;
            }

            const dateStr = date.toISOString().split("T")[0];
            if (!groups[dateStr]) {
              groups[dateStr] = [];
            }
            groups[dateStr].push(msg);
          } catch (e) {
            console.error("Error processing message:", e, msg);
          }
        });

        return Object.entries(groups)
          .map(([date, messages]) => {
            const msgDate = new Date(date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let formattedDate;
            if (date === today.toISOString().split("T")[0]) {
              formattedDate = "Today";
            } else if (date === yesterday.toISOString().split("T")[0]) {
              formattedDate = "Yesterday";
            } else {
              formattedDate = format(msgDate, "MMMM d, yyyy");
            }

            return {
              date,
              formattedDate,
              messages: messages.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              ),
            };
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
      } catch (error) {
        console.error("Error grouping messages:", error);
        return [];
      }
    },
    [],
  );
  // Register WebSocket event listeners for message deletion
  useMessageDeletionListener(matchId, queryClient, currentMode, user, toast);

  // Group messages by date for display
  const messageGroups = groupMessagesByDate(remoteMessages);

  // CRITICAL FIX: Check for cached data to prevent unnecessary loading states
  const hasCachedData = useMemo(() => {
    try {
      const sessionKey = `${currentMode}_session_messages_${matchId}`;
      const localKey = `${currentMode}_chat_messages_${matchId}`;
      const sessionData = sessionStorage.getItem(sessionKey);
      const localData = localStorage.getItem(localKey);
      return !!(sessionData || localData);
    } catch {
      return false;
    }
  }, [matchId, currentMode]);
  // CRITICAL FIX: Never show loading state for instant chat experience
  // Always render chat interface immediately without any intermediate screens
  const shouldShowLoading = false;
  // Attempt to restore messages from any cache source before showing loading
  useEffect(() => {
    if (shouldShowLoading && matchId) {
      console.log(
        `[CRITICAL FIX] Attempting to restore messages for match ${matchId} during loading state`,
      );

      // Try to get messages from any possible cache source
      try {
        // Check session storage first (most recent)
        const sessionKey = `${currentMode}_session_messages_${matchId}`;
        let sessionData = null;
        try {
          // Manually try sessionStorage first
          sessionData = sessionStorage.getItem(sessionKey);
        } catch (e) {
          console.warn(
            `[STORAGE] Error accessing sessionStorage directly: ${e}`,
          );
        }

        if (sessionData) {
          try {
            const parsed = JSON.parse(sessionData);
            if (
              parsed &&
              parsed.messages &&
              Array.isArray(parsed.messages) &&
              parsed.messages.length > 0
            ) {
              console.log(
                `[REHYDRATION] Restored ${parsed.messages.length} messages from session storage during loading`,
              );
              setRemoteMessages(parsed.messages);
              hasSetInitialMessagesRef.current = true;
              return;
            }
          } catch (e) {
            console.error(
              "[REHYDRATION] Failed to parse session storage during loading:",
              e,
            );
          }
        }

        // Next try local storage (longer term persistence)
        const localKey = `${currentMode}_chat_messages_${matchId}`;
        const localData = safeStorageGet(localKey); // Use safeStorageGet which tries localStorage first

        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (
              parsed &&
              parsed.messages &&
              Array.isArray(parsed.messages) &&
              parsed.messages.length > 0
            ) {
              console.log(
                `[REHYDRATION] Restored ${parsed.messages.length} messages from local storage during loading`,
              );
              setRemoteMessages(parsed.messages);
              hasSetInitialMessagesRef.current = true;
              return;
            }
          } catch (e) {
            console.error(
              "[REHYDRATION] Failed to parse local storage during loading:",
              e,
            );
          }
        }
      } catch (e) {
        console.error(
          "[REHYDRATION] Error during message restoration in loading state:",
          e,
        );
      }
    }
  }, [shouldShowLoading, matchId, currentMode]);

  // CRITICAL FIX: Removed loading state return to ensure instant chat rendering

  // CRITICAL FIX: Skip all error states and blank screens - render chat directly

  return (
    <div
      className={`h-full flex flex-col relative ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800"
          : "bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30"
      }`}
    >
      {/* Floating icons background that shows up behind all content */}
      <FloatingIconsBackground
        count={32}
        opacityRange={[0.05, 0.15]}
        sizeRange={[16, 30]}
        speedRange={[25, 45]}
        color={
          isDarkMode ? "rgba(139, 92, 246, 0.5)" : "rgba(124, 58, 237, 0.5)"
        }
        className="z-0"
      />
      {/* Enhanced Chat Header with Modern Design */}
      <div
        className={`px-3 py-3 border-b flex items-center sticky top-0 z-20 backdrop-blur-xl ${
          isDarkMode
            ? "bg-gradient-to-r from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30 shadow-xl shadow-purple-500/5"
            : "bg-gradient-to-r from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30 shadow-xl shadow-purple-500/10"
        }`}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-full transition-all duration-200 ${
              isDarkMode
                ? "text-gray-300 hover:text-white hover:bg-gray-800/60 hover:shadow-lg"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 hover:shadow-lg"
            } hover:scale-105`}
            onClick={() => goToLastAppMessages()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="relative group">
            <UserProfilePreviewPopup user={otherUser}>
              <div className="cursor-pointer transition-all duration-300 ease-out group-hover:scale-105">
                <div className="relative">
                  <div
                    className={`absolute -inset-1 rounded-full opacity-75 group-hover:opacity-100 transition duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 blur-sm"
                        : "bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 blur-sm"
                    }`}
                  ></div>
                  <UserPicture
                    imageUrl={otherUser.photoUrl}
                    fallbackInitials={otherUser.fullName.charAt(0)}
                    className={`h-10 w-10 relative z-10 ring-2 ring-white/20 shadow-lg ${
                      isDarkMode ? "shadow-gray-900/30" : "shadow-gray-200/50"
                    } transition-all duration-300`}
                  />
                </div>
              </div>
            </UserProfilePreviewPopup>
          </div>

          <div className="flex-1 min-w-0 relative">
            <div className="flex flex-col">
              <h3
                className={`font-bold text-base leading-tight ${
                  isDarkMode ? "text-white" : "text-gray-900"
                } truncate`}
              >
                {otherUser.fullName}
              </h3>
              {otherUser && (
                <div className="absolute left-0 top-full mt-0.5 z-50 w-max max-w-xs">
                  <MultipleOriginBadges otherUserId={otherUser.id} />
                </div>
              )}
            </div>
            <UserPresenceIndicator
              userId={otherUser.id}
              matchId={matchId}
              showDetailedStatus={true}
              className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } mt-0.5`}
            />
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full h-9 w-9 sm:h-11 sm:w-11 transition-all duration-200 ${
              isDarkMode
                ? "text-gray-300 hover:text-white hover:bg-gradient-to-br from-green-500/20 to-green-600/30 hover:shadow-lg hover:shadow-green-500/20"
                : "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-br from-green-500/10 to-green-600/20 hover:shadow-lg hover:shadow-green-500/20"
            } hover:scale-105 group`}
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
          </Button>

          <CallLauncher
            matchId={matchId}
            userId={user?.id as number}
            receiverId={otherUser.id}
            isDarkMode={isDarkMode}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full h-9 w-9 sm:h-11 sm:w-11 transition-all duration-200 ${
                  isDarkMode
                    ? "text-gray-300 hover:text-white hover:bg-gradient-to-br from-purple-500/20 to-purple-600/30 hover:shadow-lg hover:shadow-purple-500/20"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-br from-purple-500/10 to-purple-600/20 hover:shadow-lg hover:shadow-purple-500/20"
                } hover:scale-105 group`}
              >
                <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={`${
                isDarkMode
                  ? "bg-gray-900/95 border-gray-700/50 backdrop-blur-xl"
                  : "bg-white/95 border-gray-200/50 backdrop-blur-xl"
              } shadow-xl rounded-xl`}
            >
              <DropdownMenuItem
                onClick={() => {
                  // Create an ultra-modern, sci-fi inspired dialog for chat options
                  const dialog = document.createElement("div");
                  dialog.className =
                    "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg p-4";

                  // Advanced animation wrapper
                  const animWrapper = document.createElement("div");
                  animWrapper.className =
                    "animate-in zoom-in-95 fade-in duration-500 relative";

                  // Create hyper-modern glass-like dialog content
                  const dialogContent = document.createElement("div");
                  dialogContent.className =
                    "bg-transparent dark:bg-gray-900/80 rounded-[24px] shadow-[0_10px_50px_rgba(124,58,237,0.15)] backdrop-blur-xl p-6 max-w-xs w-full relative border border-gray-200/20 dark:border-gray-700/30 overflow-y-auto max-h-[85vh]";

                  // Add multiple gradient effects for enhanced visual appeal
                  const gradientAccent = document.createElement("div");
                  gradientAccent.className =
                    "absolute -inset-[1px] bg-gradient-to-tr from-purple-500/30 via-indigo-500/20 to-pink-500/30 rounded-[24px] -z-10 blur-sm opacity-80";

                  // Add animated glow effect
                  const glowEffect = document.createElement("div");
                  glowEffect.className =
                    "absolute -inset-[4px] bg-gradient-to-r from-purple-600/20 via-indigo-500/5 to-pink-600/20 rounded-[28px] -z-20 blur-xl opacity-70 animate-pulse";

                  // Create inner highlight for 3D effect
                  const innerHighlight = document.createElement("div");
                  innerHighlight.className =
                    "absolute inset-[1px] bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 rounded-[22px] z-10 pointer-events-none";

                  dialogContent.appendChild(gradientAccent);
                  dialogContent.appendChild(glowEffect);
                  dialogContent.appendChild(innerHighlight);

                  // Add subtle noise texture for futuristic feel
                  const noiseTexture = document.createElement("div");
                  noiseTexture.className =
                    "absolute inset-0 opacity-20 rounded-[24px] z-0 pointer-events-none";
                  noiseTexture.style.backgroundImage =
                    "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')";
                  dialogContent.appendChild(noiseTexture);

                  animWrapper.appendChild(dialogContent);

                  dialog.appendChild(animWrapper);

                  // Add futuristic header with animated gradient and close button
                  const header = document.createElement("div");
                  header.className = "flex items-center justify-between mb-5";

                  // Create title with gradient text
                  const headerTitle = document.createElement("h3");
                  headerTitle.className =
                    "text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400";
                  headerTitle.textContent = "Chat Options";

                  // Create title wrapper with subtle animation
                  const titleWrapper = document.createElement("div");
                  titleWrapper.className = "relative flex items-center";
                  titleWrapper.appendChild(headerTitle);

                  // Add small accent dot
                  const accentDot = document.createElement("div");
                  accentDot.className =
                    "absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse";
                  titleWrapper.appendChild(accentDot);

                  header.appendChild(titleWrapper);

                  // Modern close button with hover effect
                  const closeButton = document.createElement("button");
                  closeButton.className =
                    "rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors";
                  closeButton.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                `;
                  header.appendChild(closeButton);

                  dialogContent.appendChild(header);

                  // Add options section with card style
                  const options = document.createElement("div");
                  options.className = "space-y-5 mb-2";
                  dialogContent.appendChild(options);

                  // Notification toggle removed as requested

                  // Create read receipts toggle with the same advanced sci-fi styling
                  const readRow = document.createElement("div");
                  readRow.className =
                    "flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-gray-50/90 to-gray-100/50 dark:from-gray-900/60 dark:to-gray-800/40 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-sm";

                  // Add subtle hover effect
                  readRow.style.transition = "all 0.3s ease";
                  readRow.addEventListener("mouseenter", () => {
                    readRow.style.boxShadow =
                      "0 4px 20px -2px rgba(124, 58, 237, 0.15)";
                    readRow.style.borderColor = "rgba(124, 58, 237, 0.2)";
                  });
                  readRow.addEventListener("mouseleave", () => {
                    readRow.style.boxShadow = "";
                    readRow.style.borderColor = "";
                  });

                  const readLabel = document.createElement("div");
                  readLabel.className = "flex items-center";

                  // Add enhanced icon with glow effect for read receipts
                  const readIconWrapper = document.createElement("div");
                  readIconWrapper.className = "relative mr-3";

                  const readIconGlow = document.createElement("div");
                  readIconGlow.className =
                    "absolute inset-0 rounded-full bg-purple-500/20 blur-sm -z-10 scale-125 opacity-0 transition-opacity duration-300";
                  readIconWrapper.appendChild(readIconGlow);

                  const readIcon = document.createElement("span");
                  readIcon.className =
                    "flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400";
                  readIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
                  readIconWrapper.appendChild(readIcon);

                  // Add hover effect to icon
                  readIconWrapper.addEventListener("mouseenter", () => {
                    readIconGlow.style.opacity = "1";
                  });
                  readIconWrapper.addEventListener("mouseleave", () => {
                    readIconGlow.style.opacity = "0";
                  });

                  readLabel.appendChild(readIconWrapper);

                  const readText = document.createElement("div");
                  readText.className = "flex flex-col";

                  const readTitle = document.createElement("span");
                  readTitle.className =
                    "text-sm font-medium text-gray-700 dark:text-gray-200";
                  readTitle.textContent = "Read Receipts";

                  const readDescription = document.createElement("span");
                  readDescription.className =
                    "text-xs text-gray-500 dark:text-gray-400 mt-0.5";
                  readDescription.textContent = "Show when messages are seen";

                  readText.appendChild(readTitle);
                  readText.appendChild(readDescription);
                  readLabel.appendChild(readText);

                  readRow.appendChild(readLabel);

                  const readSwitch = document.createElement("div");
                  readSwitch.className =
                    "relative inline-flex items-center cursor-pointer";
                  const readInput = document.createElement("input");
                  readInput.type = "checkbox";
                  readInput.className = "sr-only peer";
                  readInput.checked = readReceiptsEnabled;
                  readInput.id = "read-toggle";

                  const readSlider = document.createElement("div");
                  // Enhanced futuristic slider style with glowing effect and advanced transitions
                  readSlider.className = `w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer 
                  ${readReceiptsEnabled ? "peer-checked:after:translate-x-full after:translate-x-full peer-checked:bg-gradient-to-r from-purple-500 to-indigo-600 bg-gradient-to-r from-purple-500 to-indigo-600" : ""} 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
                  after:bg-white after:shadow-md after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                  after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 transition-all duration-300`;

                  // Add glow effect when enabled
                  if (readReceiptsEnabled) {
                    const glowEffect = document.createElement("div");
                    glowEffect.className =
                      "absolute inset-0 rounded-full bg-purple-500/20 blur-md -z-10 opacity-70";
                    readSlider.appendChild(glowEffect);
                  }

                  readSwitch.appendChild(readInput);
                  readSwitch.appendChild(readSlider);

                  // Add click handler to toggle read receipts with auto-save
                  readSwitch.addEventListener("click", () => {
                    readInput.checked = !readInput.checked;
                    if (readInput.checked) {
                      readSlider.classList.add(
                        "from-purple-500",
                        "to-indigo-500",
                        "bg-gradient-to-r",
                      );
                      readSlider.classList.add("after:translate-x-full");
                      readRow.classList.add(
                        "bg-gradient-to-br",
                        "from-purple-50/40",
                        "to-indigo-50/40",
                      );
                      readRow.classList.remove(
                        "bg-gray-50/80",
                        "dark:bg-gray-800/50",
                      );
                    } else {
                      readSlider.classList.remove(
                        "from-purple-500",
                        "to-indigo-500",
                        "bg-gradient-to-r",
                      );
                      readSlider.classList.remove("after:translate-x-full");
                      readRow.classList.remove(
                        "bg-gradient-to-br",
                        "from-purple-50/40",
                        "to-indigo-50/40",
                      );
                      readRow.classList.add(
                        "bg-gray-50/80",
                        "dark:bg-gray-800/50",
                      );
                    }

                    // Auto-save on toggle with current app mode
                    localStorage.setItem(
                      `${currentMode}_chat_read_receipts_${matchId}`,
                      readInput.checked.toString(),
                    );
                    setReadReceiptsEnabled(readInput.checked);
                  });

                  readRow.appendChild(readSwitch);
                  options.appendChild(readRow);

                  // Encryption toggle removed as per requirements

                  // AutoDelete settings UI removed entirely per request

                  // Create divider with futuristic style
                  const divider = document.createElement("div");
                  divider.className = "relative flex py-3 items-center my-4";

                  const dividerLine = document.createElement("div");
                  dividerLine.className =
                    "flex-grow border-t border-gray-300/30 dark:border-gray-700/30";
                  divider.appendChild(dividerLine);

                  // Create animated badge to separate sections
                  const dividerBadge = document.createElement("span");
                  dividerBadge.className =
                    "flex-shrink-0 mx-2 text-xs text-gray-500 dark:text-gray-400";
                  dividerBadge.textContent = "DANGER ZONE";
                  divider.appendChild(dividerBadge);

                  const dividerLine2 = document.createElement("div");
                  dividerLine2.className =
                    "flex-grow border-t border-gray-300/30 dark:border-gray-700/30";
                  divider.appendChild(dividerLine2);

                  dialogContent.appendChild(divider);

                  // Add unmatch button below divider with cyberpunk styling
                  const unmatchContainer = document.createElement("div");
                  unmatchContainer.className = "relative";

                  // Create pulsing danger effect
                  const dangerGlow = document.createElement("div");
                  dangerGlow.className =
                    "absolute -inset-1 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg blur-sm opacity-30 group-hover:opacity-100 transition-all duration-300";
                  unmatchContainer.appendChild(dangerGlow);

                  const unmatchButton = document.createElement("button");
                  unmatchButton.className =
                    "relative w-full py-3 px-4 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg flex items-center justify-center shadow-sm shadow-red-500/20 transition-all duration-300 overflow-hidden group z-10";

                  // Create futuristic button effects
                  const buttonOverlay = document.createElement("div");
                  buttonOverlay.className = "absolute inset-0 w-full h-full";

                  // Subtle noise texture
                  buttonOverlay.style.backgroundImage =
                    "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')";
                  buttonOverlay.style.opacity = "0.1";

                  // Add button highlight effect
                  const buttonHighlight = document.createElement("div");
                  buttonHighlight.className =
                    "absolute top-0 -inset-full h-full w-1/3 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:duration-700 group-hover:animate-shine";

                  unmatchButton.appendChild(buttonOverlay);
                  unmatchButton.appendChild(buttonHighlight);

                  const unmatchInner = document.createElement("div");
                  unmatchInner.className = "flex items-center relative z-10";

                  const userMinusIcon = document.createElement("span");
                  userMinusIcon.className = "mr-2 text-white/90";
                  userMinusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" x2="22" y1="11" y2="11"></line></svg>`;

                  const unmatchText = document.createElement("span");
                  unmatchText.textContent = translate("chat.unmatch");
                  unmatchText.className = "relative"; // For text animation effect

                  unmatchInner.appendChild(userMinusIcon);
                  unmatchInner.appendChild(unmatchText);
                  unmatchButton.appendChild(unmatchInner);

                  unmatchContainer.appendChild(unmatchButton);
                  dialogContent.appendChild(unmatchContainer);

                  document.body.appendChild(dialog);

                  // Event listeners for the close (X) button
                  closeButton.addEventListener("click", () => {
                    // Get current values before closing
                    const newReadReceiptsEnabled = readInput.checked;

                    // Close dialog then check if we should navigate back
                    document.body.removeChild(dialog);

                    // If we're in the chat page and there was an unmatch, navigate back to messages
                    if (
                      path &&
                      typeof path === "string" &&
                      path.startsWith(`/chat/${matchId}`) &&
                      !currentMatch
                    ) {
                      goToLastAppMessages();
                      return;
                    }

                    // Update state
                    setReadReceiptsEnabled(newReadReceiptsEnabled);

                    // Save to localStorage
                    localStorage.setItem(
                      `chat_read_receipts_${matchId}`,
                      newReadReceiptsEnabled.toString(),
                    );

                    // Dialog has already been removed above
                  });
                  // Add unmatch button click handler
                  unmatchButton.addEventListener("click", () => {
                    // Create a futuristic confirmation dialog
                    const confirmDialog = document.createElement("div");
                    confirmDialog.className =
                      "fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200";

                    confirmDialog.innerHTML = `
                    <div class="bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-md p-5 max-w-sm w-full relative border border-gray-200/30 dark:border-gray-700/30 animate-in zoom-in-95 duration-200">
                      <div class="absolute -inset-[1px] bg-gradient-to-tr from-red-500/20 to-orange-500/20 rounded-2xl -z-10 blur-sm opacity-60"></div>

                      <div class="flex items-center mb-3">
                        <span class="mr-2 text-red-500 dark:text-red-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </span>
                        <h3 class="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">Are you sure?</h3>
                      </div>

                      <p class="text-gray-600 dark:text-gray-300 text-sm mb-5 pl-7">
                        This will delete the conversation and remove <span class="font-medium">${otherUser.fullName}</span> from your matches. This action cannot be undone.
                      </p>

                      <div class="flex justify-end space-x-3 mt-6">
                        <button class="cancel-unmatch-btn px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/90 dark:text-gray-200 dark:bg-gray-800/50 dark:hover:bg-gray-700/60 rounded-lg transition-colors">
                          Cancel
                        </button>
                        <button class="confirm-unmatch-btn px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg transition-colors shadow-sm shadow-red-500/20">
                          Unmatch
                        </button>
                      </div>
                    </div>
                  `;

                    document.body.appendChild(confirmDialog);

                    const cancelUnmatchBtn = confirmDialog.querySelector(
                      ".cancel-unmatch-btn",
                    );
                    const confirmUnmatchBtn = confirmDialog.querySelector(
                      ".confirm-unmatch-btn",
                    );

                    cancelUnmatchBtn?.addEventListener("click", () => {
                      document.body.removeChild(confirmDialog);
                    });

                    confirmUnmatchBtn?.addEventListener("click", () => {
                      // Close confirmation dialog immediately for instant feedback
                      try {
                        document.body.removeChild(confirmDialog);
                        document.body.removeChild(dialog);
                      } catch (e) {
                        console.warn(
                          "[UNMATCH-PERFORMANCE] Dialog cleanup warning:",
                          e,
                        );
                      }

                      console.log(
                        "[UNMATCH-PERFORMANCE] Initiating optimized unmatch process",
                      );

                      // Call unmatch API with optimized flow
                      apiRequest(`/api/matches/${matchId}/unmatch`, {
                        method: "POST",
                      })
                        .then(() => {
                          // No toast notification - seamless unmatch experience
                          console.log(
                            "[UNMATCH-PERFORMANCE] Optimized unmatch completed successfully",
                          );

                          // Parallel cache operations for optimal performance
                          Promise.all([
                            // Update matches cache immediately
                            queryClient.setQueryData<Match[]>(
                              ["/api/matches"],
                              (old) =>
                                (old || []).filter((m) => m.id !== matchId),
                            ),
                            // Invalidate related caches
                            queryClient.invalidateQueries({
                              queryKey: ["/api/matches/counts"],
                            }),
                            queryClient.removeQueries({
                              queryKey: ["/api/messages", matchId],
                            }),
                          ]).catch((error) => {
                            console.warn(
                              "[UNMATCH-PERFORMANCE] Cache operation error:",
                              error,
                            );
                          });

                          // Dialogs already removed for instant feedback

                          // Navigate immediately without waiting for cache operations
                          goToLastAppMessages();
                        })
                        .catch((err) => {
                          toast({
                            title: "Error",
                            description: "Failed to unmatch. Please try again.",
                            variant: "destructive",
                          });

                          document.body.removeChild(confirmDialog);
                          // Keep the Options dialog open so user can retry or close it
                        });
                    });
                  });

                  // Notification toggle removed as requested

                  readInput.addEventListener("change", () => {
                    const newValue = readInput.checked;
                    setReadReceiptsEnabled(newValue);
                    localStorage.setItem(
                      `${currentMode}_chat_read_receipts_${matchId}`,
                      newValue.toString(),
                    );
                  });

                  // Auto-save when radio buttons change - functionality moved to enhanced radio buttons
                  // Auto-save when duration changes
                  // durationInput.addEventListener("change", () => {
                  //   let newValue = parseInt(durationInput.value);
                  //   if (isNaN(newValue) || newValue < 1) {
                  //     newValue = 1;
                  //     durationInput.value = "1";
                  //   }

                  //   setAutoDeleteValue(newValue);
                  //   localStorage.setItem(
                  //     `${currentMode}_chat_auto_delete_value_${matchId}`,
                  //     newValue.toString(),
                  //   );
                  // });

                  // durationSelect.addEventListener("change", () => {
                  //   const newUnit = durationSelect.value as AutoDeleteDuration;
                  //   setAutoDeleteUnit(newUnit);
                  //   localStorage.setItem(
                  //     `${currentMode}_chat_auto_delete_unit_${matchId}`,
                  //     newUnit,
                  //   );
                  // });
                }}
              >
                <div className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  {translate("chat.options")}
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator
                className={isDarkMode ? "bg-gray-700/50" : "bg-gray-200/50"}
              />

              <DropdownMenuItem
                onClick={() => handleBlockUser()}
                className={`text-orange-600 dark:text-orange-400 focus:text-orange-700 dark:focus:text-orange-300 ${
                  isDarkMode ? "focus:bg-orange-500/10" : "focus:bg-orange-50"
                }`}
              >
                <div className="flex items-center">
                  <UserX className="h-4 w-4 mr-2" />
                  Block User
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setReportDialogOpen(true)}
                className={`text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300 ${
                  isDarkMode ? "focus:bg-red-500/10" : "focus:bg-red-50"
                }`}
              >
                <div className="flex items-center">
                  <Flag className="h-4 w-4 mr-2" />
                  Report User
                </div>
              </DropdownMenuItem>

              {/* Save Messages menu item removed as per requirements */}
              {/* Translate Messages menu item removed as per requirements */}
              {/* Unmatch menu item moved to Options dialog */}
              {/* Auto-delete menu item moved to Options dialog */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - expanded area for more content */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto pt-2 px-3 pb-2 backdrop-blur-sm ${
          isDarkMode
            ? "bg-gradient-to-b from-transparent to-gray-900/20"
            : "bg-gradient-to-b from-transparent to-purple-50/20"
        }`}
        style={{
          visibility: isChatInitialized ? "visible" : "hidden",
          opacity: isChatInitialized ? 1 : 0,
          transition: "opacity 0.1s ease-in-out",
        }}
      >
        {/* CRITICAL FIX FOR DISAPPEARING MESSAGES: 
            Only show "No Messages" state if we're 100% sure there are no messages
            1. Check if messages are currently loading from API
            2. Check if we're restoring messages from cache/storage
            3. Add a short delay before showing "No Messages" to prevent flashing
        */}

        {/* CRITICAL BUG FIX: Set flag before rendering - this is a simple helper function */}
        {(() => {
          // This is executed during render but doesn't render anything
          if (remoteMessages.length > 0 && !hasSetInitialMessagesRef.current) {
            hasSetInitialMessagesRef.current = true;
            console.log(
              `[CRITICAL FIX] Force setting initialization flag for match ${matchId} - have ${remoteMessages.length} messages`,
            );
          }
          return null; // Return null for React rendering
        })()}
        <div
          style={{ display: "none" }}
          id="message-sync-helper"
          data-matchid={matchId}
        ></div>

        {/* Enhanced Message Display with Modern Empty State */}
        {messageGroups.length > 0 ? (
          <>
            {messageGroups.map((group, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-center mb-2">
                  <div
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      isDarkMode
                        ? "bg-gray-800/80 text-gray-400 backdrop-blur-sm"
                        : "bg-gray-100/70 text-gray-500 backdrop-blur-sm"
                    }`}
                  >
                    {group.formattedDate}
                  </div>
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg, j) => {
                    const isCurrentUser = msg.senderId === user?.id;
                    const isConsecutive =
                      j > 0 && group.messages[j - 1].senderId === msg.senderId;

                    // Handle swipe gestures manually without using the hook inside map
                    const handleTouchStart = (e: React.TouchEvent) => {
                      const touchY = e.touches[0].clientX;
                      (e.currentTarget as any)._touchStart = touchY;
                    };

                    const handleTouchMove = (e: React.TouchEvent) => {
                      const touchStart = (e.currentTarget as any)._touchStart;
                      if (!touchStart) return;

                      const touchEnd = e.touches[0].clientX;
                      const distance = touchStart - touchEnd;
                      const threshold = 50;

                      if (Math.abs(distance) > threshold) {
                        handleReply(msg.id, msg.content);
                        (e.currentTarget as any)._touchStart = null;
                      }
                    };

                    const handleTouchEnd = () => {
                      // Clean up
                    };

                    return (
                      <div
                        key={j}
                        data-message-id={msg.id}
                        className={`flex ${
                          // For audio messages, always align to the left to prevent horizontal scrolling
                          msg.messageType === "audio"
                            ? "justify-start"
                            : isCurrentUser
                              ? "justify-end"
                              : "justify-start"
                        }`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div
                          className={`flex items-center ${
                            // For audio messages, differentiate positioning between sent and received
                            msg.messageType === "audio"
                              ? isCurrentUser
                                ? "max-w-[80%] ml-10 sm:ml-12"
                                : "max-w-[80%] ml-0 sm:ml-1"
                              : isCurrentUser
                                ? "max-w-[70%] sm:max-w-[75%] mr-2 sm:mr-4"
                                : "max-w-[80%]"
                          }`}
                        >
                          {/* Message Actions for current user - positioned on the left */}
                          {isCurrentUser && (
                            <div className="flex items-center mr-2 flex-shrink-0">
                              <MessageActions
                                messageId={msg.id}
                                messageContent={msg.content}
                                isCurrentUser={isCurrentUser}
                                onReply={handleReply}
                                onCopy={handleCopy}
                                onUnsend={handleUnsend}
                                onDelete={handleDelete}
                                onEmojiReact={handleEmojiReact}
                                className=""
                              />
                            </div>
                          )}

                          {!isCurrentUser && !isConsecutive && (
                            <div className="relative mr-2 flex-shrink-0">
                              <UserProfilePreviewPopup user={otherUser}>
                                <div className="cursor-pointer hover:scale-105 transition-transform duration-200 ease-in-out">
                                  <UserPicture
                                    imageUrl={otherUser.photoUrl}
                                    fallbackInitials={otherUser.fullName.charAt(
                                      0,
                                    )}
                                    className="h-8 w-8"
                                    style={{ display: "none" }}
                                  />
                                </div>
                              </UserProfilePreviewPopup>
                            </div>
                          )}

                          <div
                            className="relative group"
                            id={`message-${msg.id}`}
                          >
                            <div
                              className={`rounded-lg p-2.5 text-sm backdrop-blur-sm transition-all duration-300 ${
                                highlightedMessageId === msg.id
                                  ? "ring-2 ring-purple-400 shadow-purple-400/50 shadow-lg transform scale-[1.02]"
                                  : ""
                              } ${
                                // Special styling for audio, image, and video messages - transparent background
                                (msg.content &&
                                  typeof msg.content === "string" &&
                                  (msg.content.startsWith("_!_IMAGE_!_") ||
                                    msg.content.startsWith("_!_VIDEO_!_"))) ||
                                (msg.messageType === "audio" && msg.audioUrl)
                                  ? "bg-transparent backdrop-blur-0 border-0 shadow-none p-1" // Transparent styling for media
                                  : // Add special styling for error messages
                                    isCurrentUser && msg.error
                                    ? isDarkMode
                                      ? "bg-gradient-to-br from-red-700 to-red-900 text-white rounded-br-none border border-red-600/40 shadow-red-900/30 shadow-lg"
                                      : "bg-gradient-to-r from-red-500 to-red-600 text-white rounded-br-none border border-red-400/50 shadow-red-500/30 shadow-lg"
                                    : // Enhanced modern message styling for sender
                                      isCurrentUser
                                      ? isDarkMode
                                        ? "bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white rounded-br-none shadow-lg shadow-purple-500/25 border border-purple-400/20"
                                        : "bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white rounded-br-none shadow-lg shadow-purple-500/25 border border-purple-300/20"
                                      : // Enhanced styling for receiver messages
                                        isDarkMode
                                        ? "bg-gradient-to-r from-gray-700 via-slate-700 to-gray-600 text-gray-100 rounded-bl-none shadow-lg shadow-gray-900/30 border border-gray-600/30"
                                        : "bg-gradient-to-r from-white via-purple-50/30 to-pink-50/30 text-gray-900 rounded-bl-none shadow-lg shadow-purple-200/20 border border-purple-200/40 backdrop-blur-sm"
                              } ${
                                isConsecutive
                                  ? isCurrentUser
                                    ? "rounded-tr-md"
                                    : "rounded-tl-md"
                                  : ""
                              } ${
                                // Add subtle animation for error messages
                                isCurrentUser && msg.error
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            >
                              {/* Reply context */}
                              {msg.replyToMessage && (
                                <ReplyContext
                                  originalMessage={msg.replyToMessage}
                                  className="mb-2"
                                  onScrollToMessage={handleScrollToMessage}
                                />
                              )}

                              <div className="whitespace-pre-wrap leading-normal">
                                {/* Media content rendering */}
                                {msg.messageType === "audio" &&
                                msg.audioUrl &&
                                msg.audioDuration ? (
                                  <AudioMessage
                                    audioUrl={msg.audioUrl}
                                    audioDuration={msg.audioDuration}
                                    messageId={msg.id}
                                    isOutgoing={isCurrentUser}
                                  />
                                ) : msg.content &&
                                  typeof msg.content === "string" &&
                                  msg.content.startsWith("_!_IMAGE_!_") ? (
                                  <div className="image-message">
                                    <OptimizedImage
                                      src={
                                        msg.content &&
                                        typeof msg.content === "string"
                                          ? msg.content.replace(
                                              "_!_IMAGE_!_",
                                              "",
                                            )
                                          : ""
                                      }
                                      alt="Shared image"
                                      className="rounded-md max-w-full max-h-60 object-contain hover:opacity-90 transition-opacity duration-200"
                                      onClick={() => {
                                        if (
                                          msg.content &&
                                          typeof msg.content === "string"
                                        ) {
                                          handleImageClick(
                                            msg.content.replace(
                                              "_!_IMAGE_!_",
                                              "",
                                            ),
                                          );
                                        }
                                      }}
                                      messageId={msg.id}
                                    />
                                  </div>
                                ) : msg.content &&
                                  typeof msg.content === "string" &&
                                  msg.content.startsWith("_!_VIDEO_!_") ? (
                                  <div
                                    className="video-message cursor-pointer relative"
                                    onClick={() =>
                                      handleVideoClick(
                                        msg.content.replace("_!_VIDEO_!_", ""),
                                      )
                                    }
                                  >
                                    <OptimizedVideo
                                      src={msg.content.replace(
                                        "_!_VIDEO_!_",
                                        "",
                                      )}
                                      className="rounded-md max-w-full max-h-60 object-contain hover:opacity-80 transition-opacity"
                                      onClick={() =>
                                        handleVideoClick(
                                          msg.content.replace(
                                            "_!_VIDEO_!_",
                                            "",
                                          ),
                                        )
                                      }
                                    />
                                    {/* Play overlay to indicate it's clickable */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-md">
                                      <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <svg
                                          className="w-6 h-6 text-black ml-1"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* Text and call-system messages */
                                  <div className="flex flex-wrap justify-between items-end gap-2">
                                    <span className="mr-2">
                                      {msg.messageType === "call" &&
                                      typeof msg.content === "string" &&
                                      msg.content === "_CALL:NO_ANSWER" ? (
                                        <span className="inline-flex items-center gap-2">
                                          {isCurrentUser ? (
                                            <>
                                              <PhoneOutgoing className="h-4 w-4" />
                                              <span>
                                                Voice call • No answer
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <PhoneMissed className="h-4 w-4 text-red-500" />
                                              <span className="text-red-600 dark:text-red-400">
                                                Missed voice call
                                              </span>
                                            </>
                                          )}
                                        </span>
                                      ) : (
                                        msg.content
                                      )}
                                    </span>
                                    <span
                                      className={`text-[10px] flex-shrink-0 ${
                                        isCurrentUser
                                          ? "text-white/80"
                                          : isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                      }`}
                                    >
                                      {formatMessageTime(msg.createdAt)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-end mt-1 space-x-1">
                                {/* Only show timestamp separately for media messages */}
                                {(msg.messageType === "audio" ||
                                  (msg.content &&
                                    typeof msg.content === "string" &&
                                    (msg.content.startsWith("_!_IMAGE_!_") ||
                                      msg.content.startsWith(
                                        "_!_VIDEO_!_",
                                      )))) && (
                                  <span
                                    className={`text-[10px] ${
                                      msg.content &&
                                      typeof msg.content === "string" &&
                                      msg.content.startsWith("_!_IMAGE_!_")
                                        ? isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-700" // Better visibility for image timestamps
                                        : isCurrentUser
                                          ? "text-white/80"
                                          : isDarkMode
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                    }`}
                                  >
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                )}

                                {/* Status indicators for sent messages */}
                                {isCurrentUser && (
                                  <>
                                    {msg.sending && (
                                      <Clock className="h-3 w-3 text-white text-opacity-70" />
                                    )}
                                    {msg.error && (
                                      <div
                                        onClick={() => handleRetryMessage(msg)}
                                        className="flex items-center cursor-pointer text-red-500 hover:text-red-600"
                                        title={
                                          msg.retryCount
                                            ? `Failed to send (${msg.retryCount} attempts). Click to try again`
                                            : "Click to retry sending this message"
                                        }
                                      >
                                        <div className="bg-red-500 rounded-full h-3 w-3 flex items-center justify-center mr-1">
                                          <ArrowLeft className="h-2 w-2 text-white" />
                                        </div>
                                        <span className="text-[10px] font-medium">
                                          {msg.retryCount
                                            ? `retry (${msg.retryCount}x)`
                                            : "retry"}
                                        </span>
                                      </div>
                                    )}
                                    {/* Show double check mark (CheckCheck) for read messages ONLY when read receipts are enabled */}
                                    {!msg.sending &&
                                      !msg.error &&
                                      msg.read &&
                                      readReceiptsEnabled && (
                                        <CheckCheck
                                          className={`h-3 w-3 ${
                                            msg.content &&
                                            typeof msg.content === "string" &&
                                            msg.content.startsWith(
                                              "_!_IMAGE_!_",
                                            )
                                              ? isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-700" // For image messages
                                              : "text-white text-opacity-70"
                                          }`}
                                        />
                                      )}
                                    {/* Show single check mark (Check) for delivered but unread messages ONLY when read receipts are enabled */}
                                    {!msg.sending &&
                                      !msg.error &&
                                      !msg.read &&
                                      readReceiptsEnabled && (
                                        <Check
                                          className={`h-3 w-3 ${
                                            msg.content &&
                                            typeof msg.content === "string" &&
                                            msg.content.startsWith(
                                              "_!_IMAGE_!_",
                                            )
                                              ? isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-700" // For image messages
                                              : "text-white text-opacity-70"
                                          }`}
                                        />
                                      )}
                                    {/* Show text "seen" for read receipts when enabled */}
                                    {!msg.sending &&
                                      !msg.error &&
                                      msg.read &&
                                      readReceiptsEnabled && (
                                        <span
                                          className={`text-[10px] ml-0.5 ${
                                            msg.content &&
                                            typeof msg.content === "string" &&
                                            msg.content.startsWith(
                                              "_!_IMAGE_!_",
                                            )
                                              ? isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-700" // For image messages
                                              : "text-white/80"
                                          }`}
                                        >
                                          seen
                                        </span>
                                      )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Enhanced message reactions with improved visual styling */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div
                                className={`absolute ${isCurrentUser ? "left-0" : "right-0"} bottom-0 -mb-2 -ml-1 
                                bg-gradient-to-r from-gray-50/90 to-gray-100/90 
                                dark:bg-gradient-to-r dark:from-gray-800/90 dark:to-gray-700/90 
                                rounded-full px-2 py-0.5 border border-gray-200/30 dark:border-gray-700/30 
                                backdrop-blur-md flex items-center space-x-1 shadow-sm transition-all duration-200 hover:shadow-md`}
                              >
                                {msg.reactions.map((reaction, i) => (
                                  <div key={i} className="flex items-center">
                                    <span className="text-xs">
                                      {reaction.emoji}
                                    </span>
                                    {reaction.count > 1 && (
                                      <span className="text-[10px] ml-0.5 font-medium text-gray-600 dark:text-gray-300">
                                        {reaction.count}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Message Actions for received messages - positioned on the right */}
                          {!isCurrentUser && (
                            <div className="flex items-center justify-end mt-1">
                              <MessageActions
                                messageId={msg.id}
                                messageContent={msg.content}
                                isCurrentUser={isCurrentUser}
                                onReply={handleReply}
                                onCopy={handleCopy}
                                onUnsend={handleUnsend}
                                onDelete={handleDelete}
                                onEmojiReact={handleEmojiReact}
                                className=""
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : (
          /* Modern Empty State Design */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center relative">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 -z-10">
                <div
                  className={`absolute top-4 left-8 w-16 h-16 rounded-full ${
                    isDarkMode ? "bg-purple-900/20" : "bg-purple-100/60"
                  } animate-pulse`}
                ></div>
                <div
                  className={`absolute bottom-8 right-4 w-12 h-12 rounded-full ${
                    isDarkMode ? "bg-pink-900/20" : "bg-pink-100/60"
                  } animate-pulse delay-1000`}
                ></div>
                <div
                  className={`absolute top-16 right-12 w-8 h-8 rounded-full ${
                    isDarkMode ? "bg-indigo-900/20" : "bg-indigo-100/60"
                  } animate-pulse delay-500`}
                ></div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 max-w-sm mx-auto">
                {/* Enhanced Avatar with Gradient Ring */}
                <div className="mb-6 relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full opacity-30 blur-sm animate-pulse"></div>
                  <div className="relative">
                    <UserPicture
                      imageUrl={otherUser.photoUrl}
                      fallbackInitials={otherUser.fullName.charAt(0)}
                      className="h-20 w-20 mx-auto shadow-xl border-4 border-white dark:border-gray-800"
                    />
                  </div>
                </div>

                {/* Enhanced Text Content */}
                <div className="space-y-3">
                  <h3
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Start chatting with {otherUser.fullName}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Send your first message to begin this conversation. Your
                    messages are private and secure.
                  </p>
                </div>

                {/* Modern Action Button */}
                <div className="mt-8">
                  <button
                    onClick={() => inputRef.current?.focus()}
                    className={`group relative px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 shadow-lg shadow-purple-500/25"
                    } hover:scale-105 hover:shadow-xl transform`}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Say Hello</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified typing indicator using the UserPresence system */}
        <TypingWithPresenceIndicator
          matchId={matchId}
          userId={otherUser.id}
          className="ml-4 mb-2"
        />

        {/* Dummy div to scroll to bottom */}
        <div ref={messagesEndRef} />

        {/* Space to prevent content from being hidden behind fixed footer */}
        <div className="h-14"></div>
      </div>

      {/* Enhanced message input with modernized design */}
      <div
        className={`py-3 px-4 border-t fixed bottom-0 left-0 right-0 z-30 md:w-[calc(100%-280px)] w-full backdrop-blur-xl ${
          isDarkMode
            ? "bg-gradient-to-r from-gray-800/95 via-slate-800/95 to-gray-700/95 border-gray-600/30 shadow-xl shadow-purple-500/5"
            : "bg-gradient-to-r from-white/95 via-purple-50/80 to-pink-50/80 border-purple-200/30 shadow-xl shadow-purple-500/10"
        }`}
      >
        {/* Reply message preview */}
        {replyToMessage && (
          <ReplyMessage
            originalMessage={replyToMessage}
            onCancel={() => setReplyToMessage(null)}
            className="mb-2"
          />
        )}
        {/* Message input form with integrated audio recorder */}
        {showAudioRecorder ? (
          /* Enhanced in-message audio recorder */
          <div className="w-full">
            <AudioRecorder
              onSend={handleSendAudioMessage}
              onCancel={handleCancelRecording}
            />
          </div>
        ) : (
          /* Regular message input form with inline icons - Instagram style */
          <form onSubmit={handleSubmit} className="flex items-center">
            {/* Enhanced Emoji picker with custom modal */}
            <button
              ref={emojiTriggerRef}
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isDarkMode
                  ? "text-gray-300 hover:text-white hover:bg-gradient-to-br from-yellow-500/20 to-orange-500/30 hover:shadow-lg hover:shadow-yellow-500/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-br from-yellow-500/10 to-orange-500/20 hover:shadow-lg hover:shadow-yellow-500/20"
              } hover:scale-105 group`}
            >
              <Smile className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Custom centered emoji picker modal */}
            {showEmojiPicker && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                  onClick={() => setShowEmojiPicker(false)}
                />

                {/* Centered emoji picker container */}
                <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
                  <div
                    className={`w-[calc(100vw-32px)] max-w-[320px] pointer-events-auto ${
                      isDarkMode
                        ? "bg-gray-900/95 border-gray-700/50 backdrop-blur-xl"
                        : "bg-white/95 border-gray-200/50 backdrop-blur-xl"
                    } shadow-2xl rounded-xl border animate-in fade-in-0 zoom-in-95 duration-200`}
                  >
                    <EmojiPicker onSelect={handleEmojiSelect} />
                  </div>
                </div>
              </>
            )}

            {/* Enhanced input field with modern styling */}
            <div className="flex-grow mx-2 relative">
              <input
                type="text"
                ref={inputRef}
                value={messageText}
                onChange={handleInputChange}
                placeholder={translate("chat.typeMessage")}
                className={`w-full px-5 py-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all duration-300 shadow-lg ${
                  isDarkMode
                    ? "bg-gradient-to-r from-gray-700/80 via-slate-700/80 to-gray-600/80 text-white placeholder-gray-400 border border-gray-600/30 shadow-gray-900/30 backdrop-blur-sm"
                    : "bg-gradient-to-r from-white/80 via-purple-50/50 to-pink-50/50 text-gray-900 placeholder-gray-500 border border-purple-200/40 shadow-purple-200/20 backdrop-blur-sm"
                } hover:shadow-xl focus:shadow-2xl hover:scale-[1.01]`}
              />
              {/* Subtle glow effect on focus */}
              <div
                className={`absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ${
                  isDarkMode
                    ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                    : "bg-gradient-to-r from-purple-500/5 to-pink-500/5"
                } pointer-events-none`}
              ></div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center">
              {!messageText.trim() && (
                <>
                  <input
                    type="file"
                    id="photo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-gray-800/60 hover:shadow-lg"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 hover:shadow-lg"
                    } hover:scale-105 group`}
                    onClick={() =>
                      document.getElementById("photo-upload")?.click()
                    }
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileImage className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    )}
                  </button>

                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-gray-800/60 hover:shadow-lg"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 hover:shadow-lg"
                    } hover:scale-105 group`}
                    onClick={handleStartCamera}
                  >
                    <Camera className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-gradient-to-br from-red-500/20 to-red-600/30 hover:shadow-lg hover:shadow-red-500/20"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gradient-to-br from-red-500/10 to-red-600/20 hover:shadow-lg hover:shadow-red-500/20"
                    } hover:scale-105 group relative`}
                    onClick={handleStartRecording}
                  >
                    <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></span>
                  </button>
                </>
              )}

              {messageText.trim() && (
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-400 hover:from-purple-600 hover:via-violet-600 hover:to-purple-500 text-white shadow-lg 
                  hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 border border-purple-400/20 hover:scale-105 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Send className="h-5 w-5 relative z-10 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Camera capture overlay */}
      {showCameraCapture && (
        <SimpleCameraCapture
          onCapture={handleMediaCapture}
          onCancel={() => setShowCameraCapture(false)}
        />
      )}

      {/* Image Viewer Modal */}
      <Dialog open={showImageViewer} onOpenChange={handleCloseImageViewer}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/95 border-0"
          hideCloseButton={true}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Enhanced Close button - more visible */}
            <button
              onClick={handleCloseImageViewer}
              className="absolute top-4 right-10 z-20 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
              title="Close image viewer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Enhanced Download button */}
            <button
              onClick={handleDownloadImage}
              className="absolute top-4 left-6 z-20 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
              title="Download image"
            >
              <Download className="h-6 w-6" />
            </button>

            {/* Image display */}
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Expanded view"
                className="max-w-full max-h-full object-contain"
                style={{
                  maxHeight: "calc(90vh - 2rem)",
                  maxWidth: "calc(100vw - 2rem)",
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Video Viewer Modal */}
      <Dialog open={showVideoViewer} onOpenChange={handleCloseVideoViewer}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/95 border-0"
          hideCloseButton={true}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Enhanced Close button - more visible */}
            <button
              onClick={handleCloseVideoViewer}
              className="absolute top-4 right-10 z-20 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
              title="Close video viewer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Video display */}
            {selectedVideo && (
              <video
                src={selectedVideo}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxHeight: "calc(90vh - 2rem)",
                  maxWidth: "calc(100vw - 2rem)",
                }}
                controls
                autoPlay
                preload="metadata"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Removed full-screen audio recorder overlay - now integrated in the typing box */}

      {/* Report User Dialog */}
      <ReportUserDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        reportedUserId={
          currentMatch?.userId1 === user?.id
            ? currentMatch?.userId2 || 0
            : currentMatch?.userId1 || 0
        }
        reportedUserName={otherUser?.fullName || "Unknown User"}
        matchId={matchId}
      />

      {/* Block User Confirmation Dialog */}
      <AlertDialog
        open={blockConfirmDialogOpen}
        onOpenChange={setBlockConfirmDialogOpen}
      >
        <AlertDialogTrigger asChild>
          <div style={{ display: "none" }} />
        </AlertDialogTrigger>
        <AlertDialogContent
          className="max-w-sm border-0"
          style={{
            padding: "18px",
            background:
              "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #3b82f6 100%)",
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            color: "white",
          }}
        >
          <AlertDialogHeader style={{ marginBottom: "16px" }}>
            <AlertDialogTitle
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "white",
                margin: 0,
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              Block User
            </AlertDialogTitle>

            <AlertDialogDescription
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.8)",
                lineHeight: "1.4",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              Block <strong>{otherUser?.fullName}</strong> to prevent them from
              contacting you or seeing your profile. This action will
              immediately unmatch you from this user.
            </AlertDialogDescription>

            {/* Safety Notice Card */}
            <div
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "12px",
                padding: "12px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "rgba(59, 130, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    background: "#3b82f6",
                    borderRadius: "50%",
                  }}
                ></div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "white",
                    marginBottom: "3px",
                  }}
                >
                  Your Safety Matters
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.7)",
                    lineHeight: "1.3",
                  }}
                >
                  Blocking will prevent all future contact and they won't be
                  notified. You can unblock users in your settings if needed.
                </div>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter
            style={{ display: "flex", gap: "10px", margin: 0 }}
          >
            <AlertDialogCancel
              className="flex-1 font-medium m-0"
              style={{
                height: "40px",
                borderRadius: "20px",
                border: "2px solid rgba(124, 58, 237, 0.4)",
                background: "rgba(124, 58, 237, 0.1)",
                color: "white",
                fontSize: "14px",
                transition: "all 0.2s ease",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(124, 58, 237, 0.2)";
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(124, 58, 237, 0.1)";
                e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.4)";
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBlockUser}
              className="flex-1 font-medium m-0"
              style={{
                height: "40px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "none",
                fontSize: "14px",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(239, 68, 68, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(239, 68, 68, 0.4)";
              }}
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Optimized Image Component with Caching and Compression
const OptimizedImage = ({
  src,
  alt,
  className,
  onClick,
  messageId,
}: {
  src: string;
  alt: string;
  className: string;
  onClick: () => void;
  messageId: number;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const optimizeAndCacheImage = async () => {
      try {
        // Check if already cached
        const cacheKey = `optimized_img_${messageId}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached && cached.length < 50000) {
          // Only use cache if reasonable size
          setOptimizedSrc(cached);
          setIsLoading(false);
          return;
        }

        // Optimize the image
        if (src.startsWith("data:image/")) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();

          img.onload = () => {
            // Calculate optimal dimensions (max 800px width, maintain aspect ratio)
            const maxWidth = 800;
            const scale = Math.min(1, maxWidth / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // Draw and compress
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const optimized = canvas.toDataURL("image/jpeg", 0.7); // 70% quality

            // Cache if reasonable size
            if (optimized.length < 100000) {
              // Only cache if under 100KB
              try {
                sessionStorage.setItem(cacheKey, optimized);
              } catch (e) {
                // Storage full, continue without caching
              }
            }

            setOptimizedSrc(optimized);
            setIsLoading(false);
          };

          img.onerror = () => {
            setHasError(true);
            setIsLoading(false);
          };

          img.src = src;
        } else {
          // Regular URL, use as-is
          setOptimizedSrc(src);
          setIsLoading(false);
        }
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    optimizeAndCacheImage();
  }, [src, messageId]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-md">
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={optimizedSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      loading="lazy"
      style={{ cursor: "pointer" }}
    />
  );
};

// Optimized Video Component with Lazy Loading
const OptimizedVideo = ({
  src,
  className,
  onClick,
}: {
  src: string;
  className: string;
  onClick: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-md">
        <span className="text-gray-500 text-sm">Failed to load video</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse">
          <span className="text-gray-500 text-sm">Loading video...</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        className={className}
        onClick={onClick}
        onLoadedData={handleLoadedData}
        onError={handleError}
        preload="metadata"
        muted
        style={{
          cursor: "pointer",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
    </div>
  );
};

// Add the missing useEffect to register WebSocket event listeners for message deletion
// This needs to be added right before the component ends
const useMessageDeletionListener = (
  matchId: number,
  queryClient: any,
  currentMode: string,
  user: any,
  toast: any,
) => {
  useEffect(() => {
    // Handler for message deletion events from WebSocket
    const handleMessageDeleted = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) return;

      const { messageId, matchId: deletedMatchId, deletedBy } = event.detail;

      // Only handle if this event is for the current match
      if (deletedMatchId === matchId) {
        console.log(
          `📡 WebSocket: Message deletion notification received for message ${messageId} in match ${deletedMatchId}, deleted by user ${deletedBy}`,
        );

        // Check if this is our own deletion (to avoid conflicts with optimistic updates)
        if (deletedBy === user?.id) {
          console.log(
            `📡 WebSocket: Ignoring self-deletion event for message ${messageId} - already handled by optimistic update`,
          );
          return;
        }

        // Check if message still exists before processing deletion
        const currentMessages = queryClient.getQueryData<
          MessageWithReactions[]
        >(["/api/messages", matchId]);
        const messageExists = currentMessages?.find(
          (msg: MessageWithReactions) => msg.id === messageId,
        );

        if (!messageExists) {
          console.log(
            `📡 WebSocket: Message ${messageId} already removed from local state - skipping duplicate deletion`,
          );
          return;
        }

        console.log(
          `📡 WebSocket: Processing deletion for message ${messageId} from other user`,
        );

        // Remove message from local state immediately
        queryClient.setQueryData<MessageWithReactions[]>(
          ["/api/messages", matchId],
          (old: MessageWithReactions[] | undefined) => {
            const filtered = (old || []).filter(
              (msg: MessageWithReactions) => msg.id !== messageId,
            );
            return filtered;
          },
        );

        // Clear from local storage as well
        try {
          const storageKey = `${currentMode}_messages_${matchId}`;
          const storedMessages = localStorage.getItem(storageKey);
          if (storedMessages) {
            const parsed = JSON.parse(storedMessages);
            const filtered = parsed.filter((msg: any) => msg.id !== messageId);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
          }
        } catch (storageError) {
          console.warn(
            "Could not clear deleted message from local storage:",
            storageError,
          );
        }

        // Show notification since the message was deleted by the other user
        toast({
          title: "Message removed",
          description: "A message was unsent by the sender",
          variant: "default",
        });

        // Optional: Force refresh after a delay to ensure consistency
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["/api/messages", matchId],
          });
        }, 1000);
      }
    };

    // Register event listeners
    window.addEventListener("message:deleted", handleMessageDeleted);

    return () => {
      // Cleanup event listeners
      window.removeEventListener("message:deleted", handleMessageDeleted);
    };
  }, [matchId, queryClient, currentMode, user, toast]);
};
