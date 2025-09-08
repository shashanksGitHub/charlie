import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SwipeCard } from "@/components/ui/swipe-card";
import { User } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useSuiteMatch } from "@/hooks/use-suite-match-notifications";
import {
  Users,
  Briefcase,
  Building2,
  MapPin,
  Undo,
  X,
  Heart,
  MessageCircle,
  GraduationCap,
  BookOpen,
  Star,
  Target,
  Clock,
  Calendar,
  Zap,
  Shield,
} from "lucide-react";
import "@/components/ui/padlock-animation.css";

interface ExpandableSwipeCardModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "MEET" | "SUITE";
  profileId?: number; // For SUITE connections
  profileType?: "networking" | "mentorship" | "jobs"; // For SUITE connections
  additionalData?: any; // For SUITE profile data
  isConnectionResponse?: boolean; // True when responding to connection request
  requesterUserId?: number; // ID of user who made the connection request
  isPremium?: boolean; // Premium feature controls
  onPremiumUpgradeClick?: () => void; // Premium upgrade callback
  isFromSuiteProfile?: boolean; // True when opened from SUITE Profile page
  disableSwipe?: boolean; // True to disable swipe functionality entirely
}

export function ExpandableSwipeCardModal({
  user,
  isOpen,
  onClose,
  mode,
  profileId,
  profileType = "networking",
  additionalData,
  isConnectionResponse = false,
  requesterUserId,
  isPremium = false,
  onPremiumUpgradeClick,
  isFromSuiteProfile = false,
  disableSwipe = false,
}: ExpandableSwipeCardModalProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { showMatch } = useSuiteMatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right" | null
  >(null);

  // Padlock unlock states for SUITE cards - separate state for each badge type (matches discover page functionality)
  const [jobsPadlockUnlocked, setJobsPadlockUnlocked] = useState(false);
  const [networkingPadlockUnlocked, setNetworkingPadlockUnlocked] =
    useState(false);
  const [mentorshipPadlockUnlocked, setMentorshipPadlockUnlocked] =
    useState(false);

  // Arrow guide system for padlock unlock - matches discover page functionality
  const [showArrowGuide, setShowArrowGuide] = useState(false);
  const [arrowGuideType, setArrowGuideType] = useState<
    "job" | "mentorship" | "networking" | null
  >(null);

  // Emoji hiding state for flying animations - matches discover page functionality
  const [emojiHidden, setEmojiHidden] = useState(false);

  // Swipe physics state for SUITE cards
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentTransform = useRef({ x: 0, y: 0, rotation: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0, time: 0 });
  const animationId = useRef<number | null>(null);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [cursorState, setCursorState] = useState<"grab" | "grabbing">("grab");

  // Tinder-style physics constants
  const SWIPE_THRESHOLD = 100; // pixels to trigger swipe
  const MAX_ROTATION = 15; // maximum rotation in degrees
  const ROTATION_STRENGTH = 0.1; // how much rotation per pixel
  const FRICTION = 0.95; // velocity decay
  const SPRING_STRENGTH = 0.15; // snap-back force
  const VELOCITY_THRESHOLD = 0.8; // minimum velocity for fling

  // Get pointer position from mouse or touch event
  const getPointerPosition = (
    e: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return {
      x: (e as React.MouseEvent).clientX,
      y: (e as React.MouseEvent).clientY,
    };
  };

  // Update card transform with smooth CSS transitions
  const updateCardTransform = (
    x: number,
    y: number,
    rotation: number,
    transition = false,
  ) => {
    if (!cardRef.current) return;

    const card = cardRef.current;

    // Apply CSS transform
    card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    card.style.transition = transition
      ? "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "none";

    // Update visual feedback based on position
    updateVisualFeedback(x, y, rotation);

    // Store current transform
    currentTransform.current = { x, y, rotation };
  };

  // Update visual feedback (indicators, shadows, etc.)
  const updateVisualFeedback = (x: number, y: number, rotation: number) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const swipeProgress = Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1);

    // Update swipe indicators
    const leftIndicator = document.querySelector(
      ".suite-left-indicator",
    ) as HTMLElement;
    const rightIndicator = document.querySelector(
      ".suite-right-indicator",
    ) as HTMLElement;

    if (x > 30) {
      // Right swipe (like) feedback
      card.style.boxShadow = `0 0 ${20 + swipeProgress * 30}px rgba(16, 185, 129, ${0.3 + swipeProgress * 0.4})`;
      if (rightIndicator)
        rightIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (leftIndicator) leftIndicator.style.opacity = "0";
    } else if (x < -30) {
      // Left swipe (dislike) feedback
      card.style.boxShadow = `0 0 ${20 + swipeProgress * 30}px rgba(225, 29, 72, ${0.3 + swipeProgress * 0.4})`;
      if (leftIndicator)
        leftIndicator.style.opacity = (swipeProgress * 0.9).toString();
      if (rightIndicator) rightIndicator.style.opacity = "0";
    } else {
      // Neutral state
      card.style.boxShadow =
        "0 0 25px rgba(168, 85, 247, 0.35), inset 0 1px 3px rgba(255, 255, 255, 0.9)";
      if (leftIndicator) leftIndicator.style.opacity = "0";
      if (rightIndicator) rightIndicator.style.opacity = "0";
    }
  };

  // Start drag interaction
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSwipeAnimating || disableSwipe) return; // Don't allow dragging during animations

    const pos = getPointerPosition(e);
    isDragging.current = true;
    setCursorState("grabbing");
    dragStart.current = pos;
    lastPosition.current = { ...pos, time: Date.now() };

    // Reset any existing transitions
    if (cardRef.current) {
      cardRef.current.style.transition = "none";
    }

    // Prevent default to avoid scrolling on mobile
    e.preventDefault();
  };

  // Handle drag movement with real-time updates
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || isSwipeAnimating || disableSwipe) return;

    const pos = getPointerPosition(e);
    const deltaX = pos.x - dragStart.current.x;
    const deltaY = pos.y - dragStart.current.y;

    // Calculate rotation based on horizontal movement (Tinder-style)
    const rotation = Math.max(
      -MAX_ROTATION,
      Math.min(MAX_ROTATION, deltaX * ROTATION_STRENGTH),
    );

    // Update card position and rotation
    updateCardTransform(deltaX, deltaY, rotation);

    // Track velocity for momentum calculation
    const now = Date.now();
    const timeDelta = now - lastPosition.current.time;
    if (timeDelta > 0) {
      velocity.current.x = (pos.x - lastPosition.current.x) / timeDelta;
      velocity.current.y = (pos.y - lastPosition.current.y) / timeDelta;
    }
    lastPosition.current = { ...pos, time: now };

    e.preventDefault();
  };

  // Handle drag end with threshold-based decision
  const handleDragEnd = () => {
    if (!isDragging.current || isSwipeAnimating || disableSwipe) return;

    isDragging.current = false;
    setCursorState("grab");
    const { x, y } = currentTransform.current;
    const velocityMagnitude = Math.sqrt(
      velocity.current.x ** 2 + velocity.current.y ** 2,
    );

    // Determine if we should swipe off or snap back
    const shouldSwipeOff =
      Math.abs(x) > SWIPE_THRESHOLD || velocityMagnitude > VELOCITY_THRESHOLD;

    if (shouldSwipeOff) {
      // Trigger swipe animation
      const direction = x > 0 ? "right" : "left";
      animateSwipeOff(direction);
    } else {
      // Snap back to center
      animateSnapBack();
    }
  };

  // Animate card flying off screen
  const animateSwipeOff = (direction: "left" | "right") => {
    if (!cardRef.current) return;

    setIsSwipeAnimating(true);
    const card = cardRef.current;

    // Calculate final position (off-screen)
    const windowWidth = window.innerWidth;
    const finalX =
      direction === "right" ? windowWidth + 200 : -windowWidth - 200;
    const finalY = currentTransform.current.y + velocity.current.y * 300; // Add some momentum
    const finalRotation = direction === "right" ? 30 : -30;

    // Apply final transform with transition
    card.style.transition =
      "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    card.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${finalRotation}deg)`;

    // Clear indicators
    setTimeout(() => {
      const leftIndicator = document.querySelector(
        ".suite-left-indicator",
      ) as HTMLElement;
      const rightIndicator = document.querySelector(
        ".suite-right-indicator",
      ) as HTMLElement;
      if (leftIndicator) leftIndicator.style.opacity = "0";
      if (rightIndicator) rightIndicator.style.opacity = "0";
    }, 100);

    // Trigger the appropriate action
    setTimeout(() => {
      if (direction === "right") {
        handleSwipeRight();
      } else {
        handleSwipeLeft();
      }
      setIsSwipeAnimating(false);
    }, 300); // Trigger action mid-animation for responsiveness
  };

  // Animate card snapping back to center
  const animateSnapBack = () => {
    if (!cardRef.current) return;

    setIsSwipeAnimating(true);

    // Smooth spring animation back to center
    const startTime = Date.now();
    const startTransform = { ...currentTransform.current };

    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const duration = 400; // ms
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (elastic out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const x = startTransform.x * (1 - eased);
      const y = startTransform.y * (1 - eased);
      const rotation = startTransform.rotation * (1 - eased);

      updateCardTransform(x, y, rotation);

      if (progress < 1) {
        animationId.current = requestAnimationFrame(animateFrame);
      } else {
        setIsSwipeAnimating(false);
        // Reset to exact center
        updateCardTransform(0, 0, 0);
      }
    };

    animationId.current = requestAnimationFrame(animateFrame);
  };

  // Button-triggered swipe animations
  const triggerButtonSwipe = (direction: "left" | "right") => {
    if (isSwipeAnimating || disableSwipe) return;

    // Start from center and animate to off-screen
    currentTransform.current = { x: 0, y: 0, rotation: 0 };
    velocity.current = { x: direction === "right" ? 2 : -2, y: 0 };
    animateSwipeOff(direction);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) {
      return;
    }

    handleDragStart(e);

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e as any);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  // Reset states when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setEmojiHidden(false);
    }
  }, [isOpen]);

  // Reset padlock states only when user changes, not when modal reopens
  useEffect(() => {
    setJobsPadlockUnlocked(false);
    setNetworkingPadlockUnlocked(false);
    setMentorshipPadlockUnlocked(false);
    setEmojiHidden(false);
  }, [user?.id]);

  // Function to trigger padlock unlock animation - matches discover page functionality
  const triggerPadlockUnlock = (
    badgeType: "jobs" | "networking" | "mentorship" = profileType,
  ) => {
    // Get the current padlock state for the specific badge type
    const currentPadlockState =
      badgeType === "jobs"
        ? jobsPadlockUnlocked
        : badgeType === "networking"
          ? networkingPadlockUnlocked
          : mentorshipPadlockUnlocked;

    console.log(
      `[PADLOCK-UNLOCK] triggerPadlockUnlock called for ${badgeType}, current state:`,
      currentPadlockState,
    );
    if (currentPadlockState) {
      console.log(
        `[PADLOCK-UNLOCK] ${badgeType} padlock already unlocked, skipping`,
      );
      return; // Already unlocked
    }

    console.log(
      "[PADLOCK-UNLOCK] Starting emoji flight animation, padlock will unlock when emoji reaches badge",
    );

    // Hide the emoji from the button immediately (matches discover page behavior)
    setEmojiHidden(true);

    // Create flying emoji animation from action button to percentage badge
    const actionButton = document.querySelector(".action-button-expandable");
    const percentageBadge = document.querySelector(
      ".percentage-badge-container",
    );

    if (actionButton && percentageBadge) {
      // Get positions for flying animation
      const buttonRect = actionButton.getBoundingClientRect();
      const badgeRect = percentageBadge.getBoundingClientRect();

      // Create flying emoji element
      const flyingEmoji = document.createElement("div");
      flyingEmoji.textContent =
        profileType === "networking"
          ? "💼"
          : profileType === "mentorship"
            ? "🤝"
            : "💼";
      flyingEmoji.className = "flying-emoji";
      flyingEmoji.style.cssText = `
        position: fixed;
        z-index: 9999;
        font-size: 1.5rem;
        left: ${buttonRect.left + buttonRect.width / 2}px;
        top: ${buttonRect.top + buttonRect.height / 2}px;
        pointer-events: none;
        transform: translate(-50%, -50%);
      `;

      document.body.appendChild(flyingEmoji);

      // Animate to badge position
      setTimeout(() => {
        flyingEmoji.style.cssText += `
          transition: all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          left: ${badgeRect.left + badgeRect.width / 2}px;
          top: ${badgeRect.top + badgeRect.height / 2}px;
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0.8;
        `;

        // Trigger padlock unlock and effects after flight delay
        setTimeout(() => {
          console.log(
            `[PADLOCK-UNLOCK] Emoji reached badge, unlocking ${badgeType} padlock now`,
          );
          // Set padlock unlocked state when emoji reaches the badge (matches discover page timing)
          if (badgeType === "jobs") {
            setJobsPadlockUnlocked(true);
          } else if (badgeType === "networking") {
            setNetworkingPadlockUnlocked(true);
          } else if (badgeType === "mentorship") {
            setMentorshipPadlockUnlocked(true);
          }

          const padlock = percentageBadge.querySelector(".padlock-overlay");
          if (padlock) {
            padlock.classList.add("padlock-unlock");
          }

          // Badge hit animation
          percentageBadge.classList.add("percentage-badge-hit");
          setTimeout(() => {
            percentageBadge.classList.remove("percentage-badge-hit");
          }, 600);

          // Add unlock glow effect
          percentageBadge.classList.add("badge-unlock-glow");
          setTimeout(() => {
            percentageBadge.classList.remove("badge-unlock-glow");
          }, 1000);

          // Create sparkle effect
          const sparkle = document.createElement("div");
          sparkle.className = "unlock-sparkle";
          sparkle.textContent = "✨";
          sparkle.style.left = `${badgeRect.left + badgeRect.width / 2}px`;
          sparkle.style.top = `${badgeRect.top + badgeRect.height / 2}px`;
          document.body.appendChild(sparkle);

          setTimeout(() => {
            if (sparkle.parentNode) {
              sparkle.parentNode.removeChild(sparkle);
            }
          }, 800);

          // Create confetti effect
          const confettiContainer = document.createElement("div");
          confettiContainer.className = "confetti-container";
          confettiContainer.style.left = `${badgeRect.left + badgeRect.width / 2}px`;
          confettiContainer.style.top = `${badgeRect.top + badgeRect.height / 2}px`;
          document.body.appendChild(confettiContainer);

          for (let i = 0; i < 5; i++) {
            const particle = document.createElement("div");
            particle.className = `confetti-particle confetti-particle-${i + 1}`;
            particle.style.left = `${Math.random() * 40 - 20}px`;
            particle.style.top = `${Math.random() * 40 - 20}px`;
            confettiContainer.appendChild(particle);
          }

          setTimeout(() => {
            if (confettiContainer.parentNode) {
              confettiContainer.parentNode.removeChild(confettiContainer);
            }
          }, 1000);
        }, 1500);

        // Remove flying emoji
        setTimeout(() => {
          if (flyingEmoji.parentNode) {
            flyingEmoji.parentNode.removeChild(flyingEmoji);
          }
        }, 200);
      }, 50);
    }
  };

  // Close modal immediately when animation starts to prevent reappearance
  useEffect(() => {
    if (animationDirection) {
      // Close modal immediately when animation starts
      onClose();

      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setAnimationDirection(null);
      }, 800); // Animation duration is 0.8s

      return () => clearTimeout(timer);
    }
  }, [animationDirection, onClose]);

  // MEET swipe mutation
  const meetSwipeMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      action: "like" | "dislike" | "message";
    }) => {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // First check if there's already a pending match
      const existingMatchesResponse = await apiRequest("/api/matches");
      if (!existingMatchesResponse.ok) {
        throw new Error("Failed to check existing matches");
      }
      const existingMatches = await existingMatchesResponse.json();

      // Check if there's a pending match where the other user liked us
      const pendingMatch = existingMatches.find(
        (match: any) =>
          (match.userId1 === data.userId &&
            match.userId2 === currentUser.id &&
            !match.matched &&
            !match.isDislike) ||
          (match.userId1 === currentUser.id &&
            match.userId2 === data.userId &&
            !match.matched &&
            !match.isDislike),
      );

      // If there's a pending match and we're liking back, this should be a mutual match
      const shouldBeMatch = pendingMatch && data.action === "like";

      const response = await apiRequest("/api/matches", {
        method: "POST",
        data: {
          userId1: currentUser.id,
          userId2: data.userId,
          matched: shouldBeMatch, // Set to true if this creates a mutual match
          isDislike: data.action === "dislike",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to record swipe action");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.isMatch) {
        toast({
          title: "It's a Match! 🎉",
          description: `You and ${user?.fullName} liked each other!`,
        });
      }
      // Refresh matches data
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discover-users"] });
      // Don't close modal here - animation will handle it
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process action",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // SUITE swipe mutations
  const suiteNetworkingSwipeMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
      requesterUserId?: number;
    }) => {
      // Use different endpoint for connection responses vs new swipes
      const endpoint = isConnectionResponse
        ? "/api/suite/connections/networking/respond"
        : "/api/suite/networking/swipe";

      const requestData = isConnectionResponse
        ? {
            requesterUserId: data.requesterUserId,
            targetProfileId: data.profileId,
            action: data.action === "like" ? "accept" : "decline",
          }
        : data;

      const response = await apiRequest(endpoint, {
        method: "POST",
        data: requestData,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for networking");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record networking swipe action");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const isMatch = data.isMatch;

      // Trigger padlock unlock animation on successful like/accept action
      if (data.action === "like" || data.action === "accept") {
        triggerPadlockUnlock("networking");
      }

      if (isMatch) {
        // Trigger SUITE Match Dialog instead of basic toast
        showMatch({
          id: `networking-match-${user?.id}-${Date.now()}`,
          matchedUser: {
            id: user?.id || 0,
            fullName: user?.fullName || "",
            photoUrl: user?.photoUrl || undefined,
            profession: user?.profession || undefined,
            location: user?.location || undefined,
          },
          matchType: "networking",
          timestamp: new Date().toISOString(),
          chatId: data.chatId || data.matchId, // Use chatId from API response
        });

        // Immediately remove the connection card when a match occurs
        if (additionalData?.connectionId) {
          // Dispatch custom event to notify connections page to remove the card
          window.dispatchEvent(
            new CustomEvent("connectionCardRemoval", {
              detail: {
                connectionId: additionalData.connectionId,
                isMatch: true,
              },
            }),
          );
        }
      } else if (data.action === "like" || data.action === "accept") {
        // SEAMLESS UX: Removed disruptive "Connection Sent!" toast notification
        // Networking connection requests now submit instantly without blocking popup interruptions
      }

      // For decline/pass, also remove the card immediately
      if (
        isConnectionResponse &&
        (data.action === "decline" || data.action === "pass") &&
        additionalData?.connectionId
      ) {
        window.dispatchEvent(
          new CustomEvent("connectionCardRemoval", {
            detail: {
              connectionId: additionalData.connectionId,
              isMatch: false,
            },
          }),
        );
      }

      // Refresh connections data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/networking"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      // Don't close modal immediately - animation will handle it
    },
    onError: (error: any) => {
      // Check if this is a profile validation error
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        onClose(); // Close current modal first
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process action",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const suiteMentorshipSwipeMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
      requesterUserId?: number;
    }) => {
      // Use different endpoint for connection responses vs new swipes
      const endpoint = isConnectionResponse
        ? "/api/suite/connections/mentorship/respond"
        : "/api/suite/mentorship/swipe";

      const requestData = isConnectionResponse
        ? {
            requesterUserId: data.requesterUserId,
            targetProfileId: data.profileId,
            action: data.action === "like" ? "accept" : "decline",
          }
        : data;

      const response = await apiRequest(endpoint, {
        method: "POST",
        data: requestData,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for mentorship");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record mentorship swipe action");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const isMatch = data.isMatch;

      // Trigger padlock unlock animation on successful like/accept action
      if (data.action === "like" || data.action === "accept") {
        triggerPadlockUnlock("mentorship");
      }

      // Check for matches and trigger SUITE Match Dialog
      if (isMatch) {
        // Trigger SUITE Match Dialog for mentorship matches
        showMatch({
          id: `mentorship-match-${user?.id}-${Date.now()}`,
          matchedUser: {
            id: user?.id || 0,
            fullName: user?.fullName || "",
            photoUrl: user?.photoUrl || undefined,
            profession: user?.profession || undefined,
            location: user?.location || undefined,
          },
          matchType: "mentorship",
          timestamp: new Date().toISOString(),
          chatId: data.chatId || data.matchId, // Use chatId from API response
        });

        // Immediately remove the connection card when a match occurs
        if (additionalData?.connectionId) {
          // Dispatch custom event to notify connections page to remove the card
          window.dispatchEvent(
            new CustomEvent("connectionCardRemoval", {
              detail: {
                connectionId: additionalData.connectionId,
                isMatch: true,
              },
            }),
          );
        }
      }

      // SEAMLESS UX: Removed disruptive mentorship toast notifications
      // "Mentorship Match!" and "Request Sent!" toasts eliminated for instant application flow

      // Refresh connections data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/mentorship"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      // Don't close modal immediately - animation will handle it

      // For decline/pass, also remove the card immediately
      if (
        isConnectionResponse &&
        (data.action === "decline" || data.action === "pass") &&
        additionalData?.connectionId
      ) {
        window.dispatchEvent(
          new CustomEvent("connectionCardRemoval", {
            detail: {
              connectionId: additionalData.connectionId,
              isMatch: false,
            },
          }),
        );
      }

      // For connection responses with decline/pass action, refresh the connections
      if (
        isConnectionResponse &&
        (data.action === "decline" || data.action === "pass")
      ) {
        // Invalidate queries to trigger refresh and remove the declined connection
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/networking"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/mentorship"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
    },
    onError: (error: any) => {
      // Check if this is a profile validation error for mentorship
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        onClose(); // Close current modal first
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process action",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const suiteJobSwipeMutation = useMutation({
    mutationFn: async (data: {
      profileId: number;
      action: "like" | "pass";
      requesterUserId?: number;
      applicationId?: number;
    }) => {
      // Use different endpoint for connection responses vs new swipes
      const endpoint = isConnectionResponse
        ? `/api/suite/connections/jobs/${data.applicationId}/respond`
        : "/api/suite/job/swipe";

      const requestData = isConnectionResponse
        ? {
            action: data.action === "like" ? "accept" : "decline",
          }
        : data;

      const response = await apiRequest(endpoint, {
        method: "POST",
        data: requestData,
      });
      if (!response.ok) {
        // Handle profile validation errors (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.action === "create_profile" && errorData.profileType) {
            const error = new Error("Profile required for jobs");
            (error as any).profileValidationError = {
              profileType: errorData.profileType,
              action: errorData.action,
            };
            throw error;
          }
        }
        throw new Error("Failed to record job application");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Trigger padlock unlock animation on successful like/accept action
      if (data.action === "like" || data.action === "accept") {
        triggerPadlockUnlock("jobs");
      }

      if (data.isMatch) {
        // Trigger SUITE Match Dialog for job matches
        showMatch({
          id: `jobs-match-${user?.id}-${Date.now()}`,
          matchedUser: {
            id: user?.id || 0,
            fullName: user?.fullName || "",
            photoUrl: user?.photoUrl || undefined,
            profession: user?.profession || undefined,
            location: user?.location || undefined,
          },
          matchType: "jobs",
          timestamp: new Date().toISOString(),
          chatId: data.chatId || data.matchId, // Use chatId from API response
        });

        // Immediately remove the connection card when a match occurs
        if (additionalData?.connectionId) {
          // Dispatch custom event to notify connections page to remove the card
          window.dispatchEvent(
            new CustomEvent("connectionCardRemoval", {
              detail: {
                connectionId: additionalData.connectionId,
                isMatch: true,
              },
            }),
          );
        }

        // SEAMLESS UX: Removed disruptive "Interview Scheduled!" toast notification
        // Job matches now occur instantly without blocking popup interruptions
      }
      // SEAMLESS UX: Removed disruptive "Application Sent" toast notification
      // Job applications now submit instantly without blocking popup interruptions

      // Refresh connections data
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/job"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/suite/connections/counts"],
      });

      // Don't close modal immediately - animation will handle it

      // For decline/pass, also remove the card immediately
      if (
        isConnectionResponse &&
        (data.action === "decline" || data.action === "pass") &&
        additionalData?.connectionId
      ) {
        window.dispatchEvent(
          new CustomEvent("connectionCardRemoval", {
            detail: {
              connectionId: additionalData.connectionId,
              isMatch: false,
            },
          }),
        );
      }

      // For connection responses with decline/pass action, refresh the connections
      if (
        isConnectionResponse &&
        (data.action === "decline" || data.action === "pass")
      ) {
        // Invalidate queries to trigger refresh and remove the declined connection
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/networking"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/mentorship"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/job"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/suite/connections/counts"],
        });
      }
    },
    onError: (error: any) => {
      // Check if this is a profile validation error for jobs
      if (error?.profileValidationError) {
        const { profileType } = error.profileValidationError;
        const sectionParam =
          profileType === "jobs"
            ? "openJob"
            : profileType === "mentorship"
              ? "openMentorship"
              : "openNetworking";
        onClose(); // Close current modal first
        window.location.href = `/profile?${sectionParam}=true`;
        return;
      }

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process job application",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleSwipeLeft = () => {
    if (!user || isProcessing || disableSwipe) return;
    setIsProcessing(true);

    // For SUITE cards, use the new animation system
    if (mode === "SUITE") {
      // Delay the API call to allow animation to start
      setTimeout(() => {
        if (profileId) {
          if (profileType === "networking") {
            suiteNetworkingSwipeMutation.mutate({
              profileId,
              action: "pass",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
            });
          } else if (profileType === "mentorship") {
            suiteMentorshipSwipeMutation.mutate({
              profileId,
              action: "pass",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
            });
          } else if (profileType === "jobs") {
            suiteJobSwipeMutation.mutate({
              profileId,
              action: "pass",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
              applicationId: isConnectionResponse
                ? additionalData?.connectionId
                : undefined,
            });
          }
        }
      }, 100);
    } else {
      // For MEET cards, use original animation
      setAnimationDirection("left");
      setTimeout(() => {
        meetSwipeMutation.mutate({ userId: user.id, action: "dislike" });
      }, 100);
    }
  };

  const handleSwipeRight = () => {
    if (!user || isProcessing || disableSwipe) return;
    setIsProcessing(true);

    // For SUITE cards, use the new animation system
    if (mode === "SUITE") {
      // Delay the API call to allow animation to start
      setTimeout(() => {
        if (profileId) {
          if (profileType === "networking") {
            suiteNetworkingSwipeMutation.mutate({
              profileId,
              action: "like",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
            });
          } else if (profileType === "mentorship") {
            suiteMentorshipSwipeMutation.mutate({
              profileId,
              action: "like",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
            });
          } else if (profileType === "jobs") {
            suiteJobSwipeMutation.mutate({
              profileId,
              action: "like",
              requesterUserId: isConnectionResponse
                ? requesterUserId
                : undefined,
              applicationId: isConnectionResponse
                ? additionalData?.connectionId
                : undefined,
            });
          }
        }
      }, 100);
    } else {
      // For MEET cards, use original animation
      setAnimationDirection("right");
      setTimeout(() => {
        meetSwipeMutation.mutate({ userId: user.id, action: "like" });
      }, 100);
    }
  };

  // Button click handlers with swipe animation for SUITE cards
  const handleDislikeButtonClick = () => {
    if (mode === "SUITE" && !disableSwipe) {
      triggerButtonSwipe("left");
    } else {
      handleSwipeLeft();
    }
  };

  const handleLikeButtonClick = () => {
    if (mode === "SUITE" && !disableSwipe) {
      triggerButtonSwipe("right");
    } else {
      handleSwipeRight();
    }
  };

  const handleMatchFound = (matchedUser: User) => {
    // This is handled in the mutation success callbacks
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] max-w-md max-h-[95vh] p-0 bg-transparent border-none shadow-none"
        hideCloseButton={true}
      >
        <DialogTitle className="sr-only">Profile Details</DialogTitle>
        <div className="h-[calc(100vh-110px)] relative p-4">
          {mode === "SUITE" &&
          (profileType === "networking" ||
            profileType === "mentorship" ||
            profileType === "jobs") &&
          !isFromSuiteProfile ? (
            <div className="h-full flex flex-col">
              {/* Swipe Indicators for SUITE cards */}
              <div className="absolute inset-0 z-50 pointer-events-none opacity-0 transition-opacity duration-200 flex items-center justify-start pl-8 suite-left-indicator">
                <div className="bg-rose-500/80 text-white text-xl font-bold py-2 px-6 rounded-lg transform -rotate-12 backdrop-blur-sm">
                  PASS
                </div>
              </div>
              <div className="absolute inset-0 z-50 pointer-events-none opacity-0 transition-opacity duration-200 flex items-center justify-end pr-8 suite-right-indicator">
                <div className="bg-emerald-500/80 text-white text-xl font-bold py-2 px-6 rounded-lg transform rotate-12 backdrop-blur-sm">
                  CONNECT
                </div>
              </div>

              {/* SUITE Profile Card with Shadow and Sparklight Effects */}
              <div
                ref={cardRef}
                className={`flex-1 relative rounded-xl bg-white ${
                  animationDirection === "left"
                    ? profileType === "networking"
                      ? "animate-networking-swipe-left"
                      : profileType === "mentorship"
                        ? "animate-mentorship-swipe-left"
                        : "animate-job-swipe-left"
                    : animationDirection === "right"
                      ? profileType === "networking"
                        ? "animate-networking-swipe-right"
                        : profileType === "mentorship"
                          ? "animate-mentorship-swipe-right"
                          : "animate-job-swipe-right"
                      : ""
                }`}
                style={{
                  boxShadow:
                    profileType === "networking"
                      ? "0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(34, 197, 94, 0.4), 0 0 75px rgba(34, 197, 94, 0.3), 0 0 100px rgba(34, 197, 94, 0.2), 0 10px 30px rgba(0, 0, 0, 0.15)"
                      : profileType === "mentorship"
                        ? "0 0 25px rgba(168, 85, 247, 0.6), 0 0 50px rgba(168, 85, 247, 0.4), 0 0 75px rgba(168, 85, 247, 0.3), 0 0 100px rgba(168, 85, 247, 0.2), 0 10px 30px rgba(0, 0, 0, 0.15)"
                        : "0 0 25px rgba(59, 130, 246, 0.6), 0 0 50px rgba(59, 130, 246, 0.4), 0 0 75px rgba(59, 130, 246, 0.3), 0 0 100px rgba(59, 130, 246, 0.2), 0 10px 30px rgba(0, 0, 0, 0.15)",
                  cursor: cursorState,
                  willChange: "transform",
                  transform: "translateZ(0)", // Force GPU acceleration
                }}
                onMouseDown={disableSwipe ? undefined : handleMouseDown}
                onTouchStart={disableSwipe ? undefined : handleTouchStart}
                onTouchMove={disableSwipe ? undefined : handleTouchMove}
                onTouchEnd={disableSwipe ? undefined : handleTouchEnd}
              >
                {/* Shooting sparklight around card edges */}
                <div className="absolute inset-0 pointer-events-none z-50 rounded-xl overflow-hidden">
                  <div
                    className={`absolute w-1.5 h-8 bg-gradient-to-b from-transparent via-white to-transparent opacity-100 animate-spark-shoot ${
                      profileType === "networking"
                        ? "shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8),0_0_45px_rgba(34,197,94,0.7),0_0_60px_rgba(34,197,94,0.4)]"
                        : profileType === "mentorship"
                          ? "shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8),0_0_45px_rgba(168,85,247,0.7),0_0_60px_rgba(168,85,247,0.4)]"
                          : "shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8),0_0_45px_rgba(59,130,246,0.7),0_0_60px_rgba(59,130,246,0.4)]"
                    }`}
                  />
                </div>
                {/* Profile Image */}
                <div className="relative h-[87%] overflow-hidden rounded-t-xl">
                  {(() => {
                    // Check if professional photo should be shown based on visibility preferences
                    let showProfilePhoto = true;

                    // Parse visibility preferences to check showProfilePhoto setting
                    if (
                      additionalData &&
                      (additionalData.fieldVisibility ||
                        additionalData.visibilityPreferences)
                    ) {
                      try {
                        const visibilityData =
                          additionalData.fieldVisibility ||
                          additionalData.visibilityPreferences;
                        let parsedVisibility: any = {};

                        if (typeof visibilityData === "string") {
                          parsedVisibility = JSON.parse(visibilityData);
                        } else if (typeof visibilityData === "object") {
                          parsedVisibility = visibilityData;
                        }

                        // Check if showProfilePhoto is explicitly set to false
                        if (parsedVisibility.showProfilePhoto === false) {
                          showProfilePhoto = false;
                        }

                        console.log("EXPANDED MODAL PHOTO VISIBILITY CHECK:", {
                          profileType,
                          visibilityData,
                          parsedVisibility,
                          showProfilePhoto,
                        });
                      } catch (error) {
                        console.error(
                          "Error parsing photo visibility preferences:",
                          error,
                        );
                        // Default to showing photo if parsing fails
                      }
                    }

                    // Use section-specific primary photo for SUITE mode
                    // This ensures expanded modal photo matches the section's actual photo, not MEET avatar
                    let photoUrl = additionalData?.currentPrimaryPhoto;

                    // Fallback to section-specific photo URLs if currentPrimaryPhoto is not available
                    if (!photoUrl) {
                      if (profileType === "networking") {
                        photoUrl = additionalData?.networkingPrimaryPhotoUrl;
                      } else if (profileType === "mentorship") {
                        photoUrl = additionalData?.mentorshipPrimaryPhotoUrl;
                      } else if (profileType === "jobs") {
                        // Accept both legacy and current key names
                        photoUrl =
                          additionalData?.jobPrimaryPhotoUrl ||
                          additionalData?.jobsPrimaryPhotoUrl;
                      }
                    }

                    // Only use user.photoUrl (MEET avatar) as last resort if no SUITE photos exist
                    if (!photoUrl) {
                      photoUrl = user.photoUrl;
                    }

                    console.log("EXPANDED MODAL PHOTO DEBUG:", {
                      profileType,
                      currentPrimaryPhoto: additionalData?.currentPrimaryPhoto,
                      networkingPrimaryPhotoUrl:
                        additionalData?.networkingPrimaryPhotoUrl,
                      mentorshipPrimaryPhotoUrl:
                        additionalData?.mentorshipPrimaryPhotoUrl,
                      jobPrimaryPhotoUrl:
                        additionalData?.jobPrimaryPhotoUrl ||
                        additionalData?.jobsPrimaryPhotoUrl,
                      userPhotoUrl: user.photoUrl,
                      finalPhotoUrl: photoUrl,
                      showProfilePhoto,
                    });

                    // If showProfilePhoto is false, don't display any photo
                    return showProfilePhoto && photoUrl ? (
                      <img
                        src={photoUrl}
                        className="w-full h-full object-cover"
                        alt={`${user.fullName} photo`}
                        loading="eager"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          profileType === "networking"
                            ? "bg-gradient-to-br from-emerald-50 via-teal-100 to-green-50"
                            : profileType === "mentorship"
                              ? "bg-gradient-to-br from-purple-50 via-pink-100 to-indigo-50"
                              : "bg-gradient-to-br from-blue-50 via-indigo-100 to-cyan-50"
                        }`}
                      >
                        <div className="bg-white/80 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-lg">
                          <div
                            className={`w-16 h-16 ${
                              profileType === "networking"
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                                : "bg-gradient-to-r from-purple-600 to-pink-600"
                            } rounded-xl flex items-center justify-center mb-3 mx-auto`}
                          >
                            {profileType === "networking" ? (
                              <Users className="w-8 h-8 text-white" />
                            ) : (
                              <GraduationCap className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <span
                            className={`text-lg ${
                              profileType === "networking"
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                                : "bg-gradient-to-r from-purple-600 to-pink-600"
                            } text-transparent bg-clip-text font-bold block text-center`}
                          >
                            {user.fullName}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mentor/Mentee Badge for Mentorship profiles */}
                  {profileType === "mentorship" && additionalData?.role && (
                    <div className="absolute top-4 left-4 z-30">
                      <Badge className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900 font-bold shadow-lg border-0 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                        <span className="relative z-10">
                          {additionalData.role === "mentor"
                            ? "Mentor"
                            : "Mentee"}
                        </span>
                      </Badge>
                    </div>
                  )}

                  {/* Spark Indicator with Padlock */}
                  <div className="absolute top-4 right-4 z-30 percentage-badge-container">
                    <button
                      onClick={async () => {
                        // Get the current padlock state for the specific badge type
                        const currentPadlockState =
                          profileType === "jobs"
                            ? jobsPadlockUnlocked
                            : profileType === "networking"
                              ? networkingPadlockUnlocked
                              : mentorshipPadlockUnlocked;

                        console.log(
                          `[PERCENTAGE-BADGE] Clicked! ${profileType} padlock state:`,
                          currentPadlockState,
                        );
                        console.log(
                          "[PERCENTAGE-BADGE] Profile type:",
                          profileType,
                        );
                        console.log(
                          "[PERCENTAGE-BADGE] Profile ID:",
                          profileId,
                        );

                        // If padlock is unlocked, create record and navigate to compatibility page
                        if (currentPadlockState) {
                          console.log(
                            "[PERCENTAGE-BADGE] Padlock unlocked! Creating record and navigating to compatibility page",
                          );

                          if (currentUser && user && profileId) {
                            // Self-compatibility check - prevent users from viewing their own compatibility
                            if (currentUser.id === user.id) {
                              toast({
                                title: "Cannot View Own Compatibility",
                                description:
                                  "You cannot view compatibility analysis for your own profile.",
                                variant: "destructive",
                              });
                              return;
                            }

                            // Create compatibility record based on profile type
                            if (profileType === "networking") {
                              try {
                                console.log(
                                  "[PERCENTAGE-BADGE] Creating networking compatibility record",
                                );
                                const response = await fetch(
                                  `/api/suite/compatibility/user/${user.id}`,
                                  {
                                    method: "GET",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                  },
                                );

                                if (response.ok) {
                                  console.log(
                                    `[PERCENTAGE-BADGE] Networking compatibility record created/updated for user ${user.id}`,
                                  );
                                  const data = await response.json();

                                  if (
                                    data.score &&
                                    data.score.targetProfileId
                                  ) {
                                    console.log(
                                      "[PERCENTAGE-BADGE] Navigating to networking compatibility using targetProfileId:",
                                      data.score.targetProfileId,
                                    );
                                    setLocation(
                                      `/suite/compatibility/${data.score.targetProfileId}`,
                                    );
                                    return;
                                  }
                                } else {
                                  const errorData = await response
                                    .json()
                                    .catch(() => ({}));
                                  console.warn(
                                    `[PERCENTAGE-BADGE] Failed to create networking compatibility record for user ${user.id}:`,
                                    response.status,
                                    errorData,
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  `[PERCENTAGE-BADGE] Error calling networking compatibility API for user ${user.id}:`,
                                  error,
                                );
                              }

                              console.log(
                                "[PERCENTAGE-BADGE] Fallback navigation to networking compatibility using profileId:",
                                profileId,
                              );
                              setLocation(`/suite/compatibility/${profileId}`);
                            } else if (profileType === "mentorship") {
                              try {
                                console.log(
                                  "[PERCENTAGE-BADGE] Creating mentorship compatibility record",
                                );
                                const response = await fetch(
                                  `/api/suite/mentorship/compatibility/user/${user.id}`,
                                  {
                                    method: "GET",
                                    credentials: "include",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                  },
                                );

                                if (response.ok) {
                                  const data = await response.json();
                                  console.log(
                                    `[PERCENTAGE-BADGE] Mentorship compatibility record created/updated for user ${user.id}`,
                                    data,
                                  );

                                  // Navigate using the target_profile_id from the response
                                  if (data.targetProfileId) {
                                    console.log(
                                      "[PERCENTAGE-BADGE] Navigating to mentorship compatibility with target profile ID:",
                                      data.targetProfileId,
                                    );
                                    setLocation(
                                      `/suite/mentorship/compatibility/${data.targetProfileId}`,
                                    );
                                  } else {
                                    // Fallback to using the profileId
                                    console.log(
                                      "[PERCENTAGE-BADGE] No targetProfileId in response, using profileId:",
                                      profileId,
                                    );
                                    setLocation(
                                      `/suite/mentorship/compatibility/${profileId}`,
                                    );
                                  }
                                } else {
                                  const errorData = await response
                                    .json()
                                    .catch(() => ({}));
                                  console.warn(
                                    `[PERCENTAGE-BADGE] Failed to create mentorship compatibility record for user ${user.id}:`,
                                    response.status,
                                    errorData,
                                  );

                                  // Show user-friendly error message
                                  if (response.status === 404) {
                                    toast({
                                      title: "Mentorship Profile Not Found",
                                      description:
                                        "This user doesn't have a mentorship profile yet.",
                                      variant: "destructive",
                                    });
                                  } else {
                                    // Still navigate on other failures as fallback
                                    console.log(
                                      "[PERCENTAGE-BADGE] Navigating to mentorship compatibility despite API error",
                                    );
                                    setLocation(
                                      `/suite/mentorship/compatibility/${profileId}`,
                                    );
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  `[PERCENTAGE-BADGE] Error calling mentorship compatibility API for user ${user.id}:`,
                                  error,
                                );

                                // Still navigate on error as fallback
                                console.log(
                                  "[PERCENTAGE-BADGE] Navigating to mentorship compatibility despite API error",
                                );
                                setLocation(
                                  `/suite/mentorship/compatibility/${profileId}`,
                                );
                              }
                            } else if (profileType === "jobs") {
                              console.log(
                                "[PERCENTAGE-BADGE] Navigating to jobs review",
                              );
                              // For jobs, use target_user_id instead of target_profile_id
                              setLocation(`/suite/jobs/review/${user.id}`);
                            }
                          }
                          return;
                        }

                        // If padlock is still locked, show arrow guide
                        console.log(
                          "[PERCENTAGE-BADGE] Padlock still locked, showing arrow guide",
                        );
                        setShowArrowGuide(true);
                        setArrowGuideType(
                          profileType === "jobs"
                            ? "job"
                            : (profileType as "networking" | "mentorship"),
                        );
                        // Hide arrow after 2 seconds
                        setTimeout(() => {
                          setShowArrowGuide(false);
                          setArrowGuideType(null);
                        }, 2000);
                      }}
                      className={`relative ${
                        profileType === "networking"
                          ? "bg-gradient-to-r from-emerald-500/90 to-teal-600/90"
                          : profileType === "mentorship"
                            ? "bg-gradient-to-r from-purple-500/90 to-pink-600/90"
                            : "bg-gradient-to-r from-blue-500/90 to-indigo-600/90"
                      } backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg cursor-pointer percentage-badge-container`}
                      title="View detailed compatibility analysis"
                    >
                      <div className="w-[3.1rem] h-[3.1rem] rounded-full bg-white flex items-center justify-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.3)] transform transition-transform duration-300 hover:scale-105">
                        <div className="relative flex items-center justify-center">
                          <span
                            className={`text-lg font-extrabold ${
                              profileType === "networking"
                                ? "bg-gradient-to-b from-emerald-600 to-teal-600"
                                : profileType === "mentorship"
                                  ? "bg-gradient-to-b from-purple-600 to-pink-600"
                                  : "bg-gradient-to-b from-blue-600 to-indigo-600"
                            } text-transparent bg-clip-text drop-shadow-sm ${"percentage-blurred"}`}
                          >
                            {profileType === "networking"
                              ? "95%"
                              : profileType === "mentorship"
                                ? "92%"
                                : "88%"}
                          </span>
                        </div>
                      </div>
                      {/* Interactive Padlock overlay - matches discover page behavior */}
                      {!(profileType === "jobs"
                        ? jobsPadlockUnlocked
                        : profileType === "networking"
                          ? networkingPadlockUnlocked
                          : mentorshipPadlockUnlocked) && (
                        <div
                          className={`padlock-overlay ${
                            profileType === "networking"
                              ? "padlock-networking"
                              : profileType === "mentorship"
                                ? "padlock-mentorship"
                                : "padlock-jobs"
                          }`}
                        >
                          🔒
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Verification Badge - positioned below percentage badge with 3D shiny styling */}
                  {user.isVerified && (
                    <div className="absolute top-24 right-4 z-30">
                      <div className="relative inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-white text-[10px] font-bold shadow-[0_3px_12px_rgba(34,197,94,0.4),0_1px_6px_rgba(34,197,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden border border-emerald-300/50 transform hover:scale-105 transition-all duration-200">
                        <Shield className="h-2.5 w-2.5 drop-shadow-sm" />
                        <span className="drop-shadow-sm tracking-wide">
                          Verified
                        </span>
                        {/* Metallic shine overlay */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transform -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  )}

                  {/* Professional Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 pt-16 pb-3 flex flex-col">
                    <div className="mb-2">
                      {/* Name and badge on same line for mentorship */}
                      {profileType === "mentorship" ? (
                        <div className="flex items-center justify-between mb-1">
                          <h2 className="text-3xl font-extrabold">
                            <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                              <span className="text-4xl">
                                {user.fullName?.split(" ")[0]?.charAt(0) || "U"}
                              </span>
                              {user.fullName?.split(" ")[0]?.slice(1) || "ser"}
                            </span>
                          </h2>
                          {/* Industry Aspiration badge for mentees, Industries/Domains for mentors */}
                          {(() => {
                            // Parse visibility preferences
                            let parsedVisibility: any = {};
                            try {
                              const visibilityData =
                                additionalData?.fieldVisibility ||
                                additionalData?.visibilityPreferences;
                              if (
                                visibilityData &&
                                typeof visibilityData === "string"
                              ) {
                                parsedVisibility = JSON.parse(visibilityData);
                              } else if (
                                visibilityData &&
                                typeof visibilityData === "object"
                              ) {
                                parsedVisibility = visibilityData;
                              }
                            } catch (error) {
                              // If parsing fails, show the field by default
                            }

                            if (
                              additionalData?.role === "mentee" &&
                              additionalData.industryAspiration &&
                              parsedVisibility?.industryAspiration !== false
                            ) {
                              return (
                                <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                                  <span className="relative z-10 text-xs">
                                    {additionalData.industryAspiration}
                                  </span>
                                </Badge>
                              );
                            }

                            if (
                              additionalData?.role === "mentor" &&
                              additionalData.industriesOrDomains &&
                              additionalData.industriesOrDomains.length > 0 &&
                              parsedVisibility?.industriesOrDomains !== false
                            ) {
                              return (
                                <Badge className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white border-0 w-fit shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-skew-x-12 before:animate-[shimmer_2s_infinite]">
                                  <span className="relative z-10 text-xs">
                                    {additionalData.industriesOrDomains[0]}
                                  </span>
                                </Badge>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="mb-2 flex items-center justify-between">
                          <h2 className="text-3xl font-extrabold">
                            <span className="bg-gradient-to-r from-amber-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]">
                              <span className="text-4xl">
                                {user.fullName?.split(" ")[0]?.charAt(0) || "U"}
                              </span>
                              {user.fullName?.split(" ")[0]?.slice(1) || "ser"}
                            </span>
                          </h2>

                          {/* Industry Badge for networking profiles */}
                          {profileType === "networking" &&
                            additionalData?.industry &&
                            (() => {
                              // Parse visibility preferences
                              let fieldVisibility = { industry: true };
                              if (additionalData.visibilityPreferences) {
                                try {
                                  fieldVisibility = JSON.parse(
                                    additionalData.visibilityPreferences,
                                  );
                                } catch (e) {
                                  console.warn(
                                    "Failed to parse visibility preferences:",
                                    e,
                                  );
                                }
                              }
                              return fieldVisibility.industry;
                            })() && (
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg border border-white/20 backdrop-blur-sm">
                                  <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1.5 animate-pulse"></span>
                                  {additionalData.industry}
                                </span>
                              </div>
                            )}

                          {/* Salary Badge for jobs profiles */}
                          {profileType === "jobs" &&
                            (additionalData?.salary ||
                              (additionalData?.salaryCurrency &&
                                additionalData?.salaryPeriod)) &&
                            (() => {
                              // Parse visibility preferences
                              let parsedVisibility: any = {};
                              try {
                                const visibilityData =
                                  additionalData?.fieldVisibility ||
                                  additionalData?.visibilityPreferences;
                                if (typeof visibilityData === "string") {
                                  parsedVisibility = JSON.parse(visibilityData);
                                } else if (typeof visibilityData === "object") {
                                  parsedVisibility = visibilityData;
                                }
                              } catch (error) {
                                // Default to showing salary if parsing fails
                              }

                              return parsedVisibility?.salary !== false;
                            })() && (
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border border-white/20 backdrop-blur-sm">
                                  <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mr-1.5 animate-pulse"></span>
                                  {additionalData.salaryCurrency || "$"}{" "}
                                  {additionalData.salary}
                                  {additionalData.salaryPeriod &&
                                    `/${additionalData.salaryPeriod}`}
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Location for mentorship profiles - right after name */}
                    {profileType === "mentorship" &&
                      additionalData &&
                      additionalData.location &&
                      additionalData.location.trim() !== "" &&
                      (() => {
                        // Parse visibility preferences to check if location should be shown
                        let parsedVisibility: any = {};
                        try {
                          const visibilityData =
                            additionalData.fieldVisibility ||
                            additionalData.visibilityPreferences;
                          if (
                            visibilityData &&
                            typeof visibilityData === "string"
                          ) {
                            parsedVisibility = JSON.parse(visibilityData);
                          } else if (
                            visibilityData &&
                            typeof visibilityData === "object"
                          ) {
                            parsedVisibility = visibilityData;
                          }
                        } catch (error) {
                          // If parsing fails, show the field by default
                        }

                        return parsedVisibility?.location !== false ? (
                          <div className="flex items-center mb-2">
                            <MapPin className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                            <span className="text-blue-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                              {additionalData.location}
                            </span>
                          </div>
                        ) : null;
                      })()}

                    {/* Networking profile fields with visibility preferences */}
                    {profileType === "networking" &&
                      additionalData &&
                      (() => {
                        // Parse visibility preferences from the networking profile data
                        let fieldVisibility = {
                          currentRole: true,
                          currentCompany: true,
                          industry: true,
                          location: true,
                          professionalTagline: true,
                          lookingFor: true,
                          canOffer: true,
                          professionalInterests: true,
                          experienceYears: true,
                          workplace: true,
                          workingStyle: true,
                          highSchool: true,
                          collegeUniversity: true,
                        }; // defaults

                        if (additionalData.visibilityPreferences) {
                          try {
                            fieldVisibility = JSON.parse(
                              additionalData.visibilityPreferences,
                            );
                          } catch (e) {
                            console.warn(
                              "Failed to parse networking visibility preferences:",
                              e,
                            );
                          }
                        }

                        return (
                          <>
                            {/* Education Fields - High School */}
                            {(additionalData.highSchool ||
                              additionalData.userHighSchool) &&
                              fieldVisibility.highSchool && (
                                <div className="flex items-center mb-2">
                                  <BookOpen className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="font-serif bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                                    {additionalData.highSchool ||
                                      additionalData.userHighSchool}
                                  </span>
                                </div>
                              )}

                            {/* Education Fields - College/University */}
                            {(additionalData.collegeUniversity ||
                              additionalData.userCollegeUniversity) &&
                              fieldVisibility.collegeUniversity && (
                                <div className="flex items-center mb-2">
                                  <GraduationCap className="h-4 w-4 mr-2 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="font-serif bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                                    {additionalData.collegeUniversity ||
                                      additionalData.userCollegeUniversity}
                                  </span>
                                </div>
                              )}

                            {/* Current Role and Company - Enhanced to match Discovery cards */}
                            {((additionalData.currentRole &&
                              fieldVisibility.currentRole) ||
                              (additionalData.currentCompany &&
                                fieldVisibility.currentCompany)) && (
                              <div className="flex items-center mb-2">
                                <Briefcase className="h-4 w-4 mr-2 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                <span className="text-teal-400 font-medium text-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                  {additionalData.currentRole &&
                                  fieldVisibility.currentRole &&
                                  additionalData.currentCompany &&
                                  fieldVisibility.currentCompany
                                    ? `${additionalData.currentRole} @ ${additionalData.currentCompany}`
                                    : additionalData.currentRole &&
                                        fieldVisibility.currentRole
                                      ? additionalData.currentRole
                                      : additionalData.currentCompany &&
                                          fieldVisibility.currentCompany
                                        ? additionalData.currentCompany
                                        : ""}
                                </span>
                                {additionalData.experienceYears &&
                                  fieldVisibility.experienceYears && (
                                    <span className="text-teal-100 text-sm ml-1 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      • {additionalData.experienceYears}
                                    </span>
                                  )}
                              </div>
                            )}

                            {/* Workplace */}
                            {additionalData.workplace &&
                              fieldVisibility.workplace && (
                                <div className="flex items-center mb-1.5">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-1 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                  <span className="font-medium text-sm text-orange-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    {additionalData.workplace}
                                  </span>
                                </div>
                              )}

                            {/* Location - Enhanced to match Discovery cards */}
                            {additionalData.location &&
                              fieldVisibility.location && (
                                <div className="flex items-center mb-2">
                                  <MapPin className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="text-blue-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    {additionalData.location}
                                  </span>
                                </div>
                              )}

                            {/* Working Style */}
                            {additionalData.workingStyle &&
                              fieldVisibility.workingStyle && (
                                <div className="flex items-center mb-1.5">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                  </svg>
                                  <span className="font-medium text-sm text-cyan-100 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    {additionalData.workingStyle}
                                  </span>
                                </div>
                              )}

                            {/* Professional Tagline */}
                            {additionalData.professionalTagline &&
                              fieldVisibility.professionalTagline && (
                                <div className="mb-2 rounded-md overflow-hidden">
                                  <p className="text-white/95 leading-tight text-xs font-medium bg-gradient-to-r from-black/15 to-purple-900/15 p-2 rounded-md drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] italic">
                                    "{additionalData.professionalTagline}"
                                  </p>
                                </div>
                              )}

                            {/* Looking For */}
                            {additionalData.lookingFor &&
                              fieldVisibility.lookingFor && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="11" cy="11" r="8" />
                                      <path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Looking for:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.lookingFor}
                                  </p>
                                </div>
                              )}

                            {/* Can Offer */}
                            {additionalData.canOffer &&
                              fieldVisibility.canOffer && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                      <path d="m2 17 10 5 10-5" />
                                      <path d="m2 12 10 5 10-5" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Can offer:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.canOffer}
                                  </p>
                                </div>
                              )}

                            {/* Professional Interests */}
                            {additionalData.professionalInterests &&
                              additionalData.professionalInterests.length > 0 &&
                              fieldVisibility.professionalInterests && (
                                <div className="mb-2">
                                  <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    Interests:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {Array.isArray(
                                      additionalData.professionalInterests,
                                    ) &&
                                      additionalData.professionalInterests
                                        .slice(0, 2)
                                        .map(
                                          (interest: string, index: number) => {
                                            const gradientClasses = [
                                              "from-purple-500/90 to-fuchsia-500/90",
                                              "from-amber-500/90 to-orange-500/90",
                                            ];
                                            const gradientClass =
                                              gradientClasses[
                                                index % gradientClasses.length
                                              ];

                                            return (
                                              <span
                                                key={`networking-interest-${index}`}
                                                className={`inline-block bg-gradient-to-r ${gradientClass} text-white shadow-lg text-xs py-0 px-2.5 border-0 rounded-full`}
                                              >
                                                {interest}
                                              </span>
                                            );
                                          },
                                        )}
                                    {Array.isArray(
                                      additionalData.professionalInterests,
                                    ) &&
                                      additionalData.professionalInterests
                                        .length > 2 && (
                                        <span className="inline-block bg-white/20 text-white text-xs py-0 px-2.5 border-0 rounded-full">
                                          +
                                          {additionalData.professionalInterests
                                            .length - 2}
                                        </span>
                                      )}
                                  </div>
                                </div>
                              )}

                            {/* Networking Goals */}
                            {additionalData.networkingGoals &&
                              (fieldVisibility as any).networkingGoals && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                      <path d="m2 17 10 5 10-5" />
                                      <path d="m2 12 10 5 10-5" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Networking goals:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.networkingGoals}
                                  </p>
                                </div>
                              )}

                            {/* Working Style */}
                            {additionalData.workingStyle &&
                              fieldVisibility.workingStyle && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-purple-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                                      <rect
                                        x="2"
                                        y="9"
                                        width="20"
                                        height="12"
                                        rx="2"
                                        ry="2"
                                      />
                                      <circle cx="12" cy="15" r="1" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Working style:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.workingStyle}
                                  </p>
                                </div>
                              )}

                            {/* Light Up When Talking */}
                            {additionalData.lightUpWhenTalking &&
                              (fieldVisibility as any).lightUpWhenTalking && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      I light up when talking about:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.lightUpWhenTalking}
                                  </p>
                                </div>
                              )}

                            {/* Current Projects */}
                            {additionalData.currentProjects &&
                              (fieldVisibility as any).currentProjects && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                      <circle cx="12" cy="13" r="3" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Current projects:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.currentProjects}
                                  </p>
                                </div>
                              )}

                            {/* Open to Collaborate On */}
                            {additionalData.openToCollaborateOn &&
                              (fieldVisibility as any).openToCollaborateOn && (
                                <div className="mb-1.5">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                      <circle cx="9" cy="7" r="4" />
                                      <path d="m22 21-3.3-3.3a4.95 4.95 0 0 0 0-7.4L22 7" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Open to collaborate on:
                                    </span>
                                  </div>
                                  <p className="text-white/90 text-xs leading-tight ml-5 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.openToCollaborateOn}
                                  </p>
                                </div>
                              )}
                          </>
                        );
                      })()}

                    {/* Mentorship-specific fields with visibility preferences */}
                    {profileType === "mentorship" &&
                      additionalData &&
                      (() => {
                        // Parse visibility preferences from JSON string (same as discovery swipe cards)
                        let parsedVisibility: any = {};
                        console.log(
                          "EXPANDED MODAL: Raw fieldVisibility data:",
                          additionalData.fieldVisibility,
                        );
                        console.log(
                          "EXPANDED MODAL: fieldVisibility type:",
                          typeof additionalData.fieldVisibility,
                        );
                        console.log(
                          "EXPANDED MODAL: Full additionalData:",
                          additionalData,
                        );

                        try {
                          // Check for fieldVisibility first, then fall back to visibilityPreferences
                          const visibilityData =
                            additionalData.fieldVisibility ||
                            additionalData.visibilityPreferences;

                          if (
                            visibilityData &&
                            typeof visibilityData === "string"
                          ) {
                            parsedVisibility = JSON.parse(visibilityData);
                            console.log(
                              "EXPANDED MODAL: Successfully parsed visibility preferences:",
                              parsedVisibility,
                            );
                          } else if (
                            visibilityData &&
                            typeof visibilityData === "object"
                          ) {
                            parsedVisibility = visibilityData;
                            console.log(
                              "EXPANDED MODAL: Using visibility object directly:",
                              parsedVisibility,
                            );
                          } else {
                            console.log(
                              "EXPANDED MODAL: No visibility preferences found, showing all fields",
                            );
                            parsedVisibility = {}; // Show all fields by default
                          }
                        } catch (error) {
                          console.error(
                            "EXPANDED MODAL: Error parsing visibility preferences:",
                            error,
                          );
                          parsedVisibility = {}; // Default to showing all fields if parsing fails
                        }

                        console.log(
                          "EXPANDED MODAL: Final parsed visibility:",
                          parsedVisibility,
                        );

                        return (
                          <>
                            {/* Education Fields - High School */}
                            {additionalData.highSchool &&
                              parsedVisibility?.highSchool !== false && (
                                <div className="flex items-center mb-2">
                                  <BookOpen className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="font-serif bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                                    {additionalData.highSchool}
                                  </span>
                                </div>
                              )}

                            {/* Education Fields - College/University */}
                            {additionalData.collegeUniversity &&
                              parsedVisibility?.collegeUniversity !== false && (
                                <div className="flex items-center mb-2">
                                  <GraduationCap className="h-4 w-4 mr-2 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="font-serif bg-gradient-to-r from-indigo-200 via-purple-300 to-violet-400 bg-clip-text text-transparent text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] static-gradient tracking-wide italic font-semibold">
                                    {additionalData.collegeUniversity}
                                  </span>
                                </div>
                              )}

                            {/* Areas of Expertise for Mentors */}
                            {additionalData.role === "mentor" &&
                              additionalData.areasOfExpertise &&
                              additionalData.areasOfExpertise.length > 0 &&
                              parsedVisibility?.areasOfExpertise !== false && (
                                <div className="flex items-center mb-2">
                                  <Star className="h-4 w-4 mr-2 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Areas of Expertise:
                                    </span>
                                    <div className="text-emerald-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {Array.isArray(
                                        additionalData.areasOfExpertise,
                                      )
                                        ? additionalData.areasOfExpertise.join(
                                            ", ",
                                          )
                                        : additionalData.areasOfExpertise}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Fallback message when profile is incomplete */}
                            {(!additionalData.areasOfExpertise ||
                              additionalData.areasOfExpertise.length === 0) &&
                              (!additionalData.learningGoals ||
                                additionalData.learningGoals.length === 0) &&
                              !additionalData.timeCommitment &&
                              !additionalData.availability &&
                              (!additionalData.languagesSpoken ||
                                additionalData.languagesSpoken.length === 0) &&
                              !additionalData.mentorshipStyle &&
                              !additionalData.whyMentor &&
                              !additionalData.whySeekMentorship &&
                              !additionalData.preferredMentorshipStyle && (
                                <div className="flex items-center mb-2">
                                  <MessageCircle className="h-4 w-4 mr-2 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="text-amber-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    Profile setup in progress
                                  </span>
                                </div>
                              )}

                            {/* Learning Goals for Mentees */}
                            {additionalData.role === "mentee" &&
                              additionalData.learningGoals &&
                              additionalData.learningGoals.length > 0 &&
                              parsedVisibility?.learningGoals !== false && (
                                <div className="flex items-center mb-2">
                                  <Target className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Learning Goals:
                                    </span>
                                    <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {Array.isArray(
                                        additionalData.learningGoals,
                                      )
                                        ? additionalData.learningGoals.join(
                                            ", ",
                                          )
                                        : additionalData.learningGoals}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Time Commitment */}
                            {additionalData.timeCommitment &&
                              additionalData.timeCommitment.trim() !== "" &&
                              parsedVisibility?.timeCommitment !== false && (
                                <div className="flex items-center mb-2">
                                  <Clock className="h-4 w-4 mr-2 text-orange-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Time Commitment:
                                    </span>
                                    <div className="text-orange-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {additionalData.timeCommitment}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Availability */}
                            {additionalData.availability &&
                              additionalData.availability.trim() !== "" &&
                              parsedVisibility?.availability !== false && (
                                <div className="flex items-center mb-2">
                                  <Calendar className="h-4 w-4 mr-2 text-green-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="text-green-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    {additionalData.availability}
                                  </span>
                                </div>
                              )}

                            {/* Languages Spoken */}
                            {additionalData.languagesSpoken &&
                              additionalData.languagesSpoken.length > 0 &&
                              parsedVisibility?.languagesSpoken !== false && (
                                <div className="flex items-center mb-2">
                                  <MessageCircle className="h-4 w-4 mr-2 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div className="flex flex-wrap gap-1">
                                    {additionalData.languagesSpoken
                                      .slice(0, 3)
                                      .map(
                                        (language: string, index: number) => (
                                          <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]"
                                          >
                                            {language}
                                          </span>
                                        ),
                                      )}
                                    {additionalData.languagesSpoken.length >
                                      3 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 backdrop-blur-sm drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                        +
                                        {additionalData.languagesSpoken.length -
                                          3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Mentorship Style for Mentors */}
                            {additionalData.role === "mentor" &&
                              additionalData.mentorshipStyle &&
                              parsedVisibility?.mentorshipStyle !== false && (
                                <div className="flex items-center mb-2">
                                  <Zap className="h-4 w-4 mr-2 text-yellow-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Mentorship Style:
                                    </span>
                                    <div className="text-yellow-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {additionalData.mentorshipStyle}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Why I Mentor for Mentors */}
                            {additionalData.role === "mentor" &&
                              additionalData.whyMentor &&
                              parsedVisibility?.whyMentor !== false && (
                                <div className="flex items-center mb-2">
                                  <Heart className="h-4 w-4 mr-2 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Why I Mentor:
                                    </span>
                                    <div className="text-pink-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {additionalData.whyMentor.length > 60
                                        ? `${additionalData.whyMentor.substring(0, 60)}...`
                                        : additionalData.whyMentor}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Why I Seek Mentorship for Mentees */}
                            {additionalData.role === "mentee" &&
                              additionalData.whySeekMentorship &&
                              parsedVisibility?.whySeekMentorship !== false && (
                                <div className="flex items-center mb-2">
                                  <Heart className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Why I Seek Mentorship:
                                    </span>
                                    <div className="text-blue-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {additionalData.whySeekMentorship.length >
                                      60
                                        ? `${additionalData.whySeekMentorship.substring(0, 60)}...`
                                        : additionalData.whySeekMentorship}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Preferred Mentorship Style for Mentees */}
                            {additionalData.role === "mentee" &&
                              additionalData.preferredMentorshipStyle &&
                              parsedVisibility?.preferredMentorshipStyle !==
                                false && (
                                <div className="flex items-center mb-2">
                                  <Zap className="h-4 w-4 mr-2 text-teal-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Preferred Style:
                                    </span>
                                    <div className="text-teal-200 text-xs font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      {additionalData.preferredMentorshipStyle}
                                    </div>
                                  </div>
                                </div>
                              )}
                          </>
                        );
                      })()}

                    {/* Jobs-specific fields with visibility preferences */}
                    {profileType === "jobs" &&
                      additionalData &&
                      (() => {
                        // Parse visibility preferences from JSON string
                        let parsedVisibility: any = {};
                        console.log(
                          "EXPANDED MODAL: Raw Jobs fieldVisibility data:",
                          additionalData.fieldVisibility,
                        );
                        console.log(
                          "EXPANDED MODAL: Jobs fieldVisibility type:",
                          typeof additionalData.fieldVisibility,
                        );
                        console.log(
                          "EXPANDED MODAL: Full Jobs additionalData:",
                          additionalData,
                        );

                        try {
                          // Check for fieldVisibility first, then fall back to visibilityPreferences
                          const visibilityData =
                            additionalData.fieldVisibility ||
                            additionalData.visibilityPreferences;

                          if (
                            visibilityData &&
                            typeof visibilityData === "string"
                          ) {
                            parsedVisibility = JSON.parse(visibilityData);
                            console.log(
                              "EXPANDED MODAL: Successfully parsed Jobs visibility preferences:",
                              parsedVisibility,
                            );
                          } else if (
                            visibilityData &&
                            typeof visibilityData === "object"
                          ) {
                            parsedVisibility = visibilityData;
                            console.log(
                              "EXPANDED MODAL: Using Jobs visibility object directly:",
                              parsedVisibility,
                            );
                          } else {
                            console.log(
                              "EXPANDED MODAL: No Jobs visibility preferences found, showing all fields",
                            );
                            parsedVisibility = {}; // Show all fields by default
                          }
                        } catch (error) {
                          console.error(
                            "EXPANDED MODAL: Error parsing Jobs visibility preferences:",
                            error,
                          );
                          parsedVisibility = {}; // Default to showing all fields if parsing fails
                        }

                        console.log(
                          "EXPANDED MODAL: Final parsed Jobs visibility:",
                          parsedVisibility,
                        );

                        return (
                          <>
                            {/* Job Title */}
                            {additionalData.jobTitle &&
                              parsedVisibility?.jobTitle !== false && (
                                <div className="flex items-center mb-2">
                                  <Star className="h-4 w-4 mr-2 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Job Title:
                                    </span>
                                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                                      {additionalData.jobTitle}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Work Style (Work Type + Job Type) */}
                            {(additionalData.workType ||
                              additionalData.jobType) &&
                              (parsedVisibility?.workType !== false ||
                                parsedVisibility?.jobType !== false) && (
                                <div className="flex items-center mb-2">
                                  <Clock className="h-4 w-4 mr-2 text-blue-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Work Style:
                                    </span>
                                    <span className="bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                                      {[
                                        additionalData.workType,
                                        additionalData.jobType,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Required Level (experienceLevel in schema) */}
                            {(additionalData.experienceLevel ||
                              additionalData.requiredLevel) &&
                              parsedVisibility?.experienceLevel !== false &&
                              parsedVisibility?.requiredLevel !== false && (
                                <div className="flex items-center mb-2">
                                  <Target className="h-4 w-4 mr-2 text-emerald-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Required Level:
                                    </span>
                                    <span className="bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                                      {additionalData.experienceLevel ||
                                        additionalData.requiredLevel}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Job Description */}
                            {additionalData.description &&
                              parsedVisibility?.description !== false && (
                                <div className="mb-2">
                                  <div className="flex items-center mb-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-2 text-purple-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                                      <rect
                                        x="2"
                                        y="9"
                                        width="20"
                                        height="12"
                                        rx="2"
                                        ry="2"
                                      />
                                      <circle cx="12" cy="15" r="1" />
                                    </svg>
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Job Description:
                                    </span>
                                  </div>
                                  <p className="text-purple-200 text-xs leading-tight ml-6 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.description}
                                  </p>
                                </div>
                              )}

                            {/* Who Should Apply */}
                            {additionalData.whoShouldApply &&
                              parsedVisibility?.whoShouldApply !== false && (
                                <div className="mb-2">
                                  <div className="flex items-center mb-1">
                                    <Users className="h-4 w-4 mr-2 text-indigo-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                    <span className="font-semibold text-white text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Who Should Apply:
                                    </span>
                                  </div>
                                  <p className="text-indigo-200 text-xs leading-tight ml-6 drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] line-clamp-2">
                                    {additionalData.whoShouldApply}
                                  </p>
                                </div>
                              )}

                            {/* Apply URL (applicationUrl in schema) */}
                            {(additionalData.applicationUrl ||
                              additionalData.applyUrl) &&
                              parsedVisibility?.applicationUrl !== false &&
                              parsedVisibility?.applyUrl !== false && (
                                <div className="flex items-center mb-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2 text-cyan-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                  </svg>
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Apply:
                                    </span>
                                    <span className="bg-gradient-to-r from-cyan-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                                      {additionalData.applicationUrl ||
                                        additionalData.applyUrl}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Contact Email (applicationEmail in schema) */}
                            {(additionalData.applicationEmail ||
                              additionalData.contactEmail) &&
                              parsedVisibility?.applicationEmail !== false &&
                              parsedVisibility?.contactEmail !== false && (
                                <div className="flex items-center mb-2">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2 text-pink-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                  </svg>
                                  <div>
                                    <span className="text-white text-xs font-semibold drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                      Email:
                                    </span>
                                    <span className="bg-gradient-to-r from-pink-200 via-rose-300 to-pink-400 bg-clip-text text-transparent font-medium text-xs drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)] ml-1">
                                      {additionalData.applicationEmail ||
                                        additionalData.contactEmail}
                                    </span>
                                  </div>
                                </div>
                              )}

                            {/* Fallback message when job profile is incomplete */}
                            {!additionalData.jobTitle &&
                              !additionalData.description &&
                              !additionalData.workType &&
                              !additionalData.jobType &&
                              !additionalData.requiredLevel &&
                              !additionalData.whoShouldApply &&
                              !additionalData.applyUrl &&
                              !additionalData.contactEmail && (
                                <div className="flex items-center mb-2">
                                  <MessageCircle className="h-4 w-4 mr-2 text-amber-400 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]" />
                                  <span className="text-amber-200 text-sm font-medium drop-shadow-[0_1.8px_1.8px_rgba(0,0,0,0.95)]">
                                    Job profile setup in progress
                                  </span>
                                </div>
                              )}
                          </>
                        );
                      })()}
                  </div>
                </div>

                {/* SUITE Action Buttons */}
                {!disableSwipe && (
                  <div className="py-2 px-6 flex justify-around items-center relative overflow-hidden backdrop-blur-md button-container rounded-b-xl">
                    {/* Enhanced background with professional theme */}
                    <div
                      className={`absolute inset-0 ${
                        profileType === "networking"
                          ? "bg-gradient-to-r from-emerald-200/80 via-teal-100/90 to-green-200/80"
                          : profileType === "mentorship"
                            ? "bg-gradient-to-r from-purple-200/80 via-pink-100/90 to-indigo-200/80"
                            : "bg-gradient-to-r from-blue-200/80 via-indigo-100/90 to-cyan-200/80"
                      } z-0`}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-80 mix-blend-soft-light"></div>

                    {/* Decorative elements */}
                    <div
                      className={`absolute -top-2 left-[15%] w-3 h-3 rounded-full ${
                        profileType === "networking"
                          ? "bg-emerald-300/70"
                          : profileType === "mentorship"
                            ? "bg-purple-300/70"
                            : "bg-blue-300/70"
                      } blur-[2px] animate-pulse`}
                    ></div>
                    <div
                      className={`absolute -bottom-1 right-[15%] w-2.5 h-2.5 rounded-full ${
                        profileType === "networking"
                          ? "bg-teal-300/70"
                          : profileType === "mentorship"
                            ? "bg-pink-300/70"
                            : "bg-cyan-300/70"
                      } blur-[2px] animate-pulse`}
                      style={{ animationDelay: "1.5s" }}
                    ></div>

                    {/* Pass Button */}
                    <button
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 border border-rose-400 relative overflow-hidden z-10"
                      onClick={handleDislikeButtonClick}
                      disabled={isProcessing}
                      style={{
                        background:
                          "linear-gradient(140deg, #fda4af 0%, #e11d48 100%)",
                        boxShadow:
                          "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
                        transform: "perspective(500px) rotateX(10deg)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(5deg) scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          "0 6px 10px rgba(225, 29, 72, 0.35), 0 10px 30px rgba(225, 29, 72, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(10deg)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px rgba(225, 29, 72, 0.25), 0 8px 24px rgba(225, 29, 72, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <X
                        className="w-6 h-6 text-white"
                        style={{
                          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                        }}
                      />
                    </button>

                    {/* Main Action Button - Connect/Apply */}
                    <button
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 ${
                        profileType === "networking"
                          ? "border border-emerald-400"
                          : profileType === "mentorship"
                            ? "border border-purple-400"
                            : "border border-blue-400"
                      } relative overflow-hidden z-10`}
                      onClick={(e) => {
                        console.log(
                          "[STAR-BUTTON] Clicked! Triggering padlock unlock",
                        );

                        // CRITICAL FIX: Don't call triggerPadlockUnlock() as it would create duplicate emoji
                        // The middle button handles its own emoji animation below

                        // Hide the emoji from the button immediately (matches discover page behavior)
                        setEmojiHidden(true);

                        // First trigger the emoji animation
                        const button = e.currentTarget;

                        // Create flying emoji
                        const flyingEmoji = document.createElement("div");
                        flyingEmoji.innerHTML =
                          profileType === "networking"
                            ? "🤝🏼"
                            : profileType === "mentorship"
                              ? "🎓"
                              : "💼";
                        flyingEmoji.className =
                          profileType === "networking"
                            ? "handshake-flying"
                            : profileType === "mentorship"
                              ? "gradcap-flying"
                              : "briefcase-flying";
                        flyingEmoji.style.position = "fixed";
                        flyingEmoji.style.zIndex = "9999";
                        flyingEmoji.style.fontSize = "2rem";
                        flyingEmoji.style.pointerEvents = "none";

                        // Get button position
                        const buttonRect = button.getBoundingClientRect();
                        flyingEmoji.style.left = `${buttonRect.left + buttonRect.width / 2 - 16}px`;
                        flyingEmoji.style.top = `${buttonRect.top + buttonRect.height / 2 - 16}px`;

                        // Add to document
                        document.body.appendChild(flyingEmoji);

                        // Get percentage badge position for precise targeting
                        const modalElement =
                          e.currentTarget.closest('[role="dialog"]');
                        if (modalElement) {
                          let badgeX, badgeY;

                          // Find the percentage badge in the expanded modal
                          const percentageBadge = modalElement.querySelector(
                            ".percentage-badge-container",
                          );
                          if (percentageBadge) {
                            const badgeRect =
                              percentageBadge.getBoundingClientRect();
                            badgeX = badgeRect.left + badgeRect.width / 2;
                            badgeY = badgeRect.top + badgeRect.height / 2;
                          } else {
                            // Fallback to modal-based approximation if badge not found
                            const modalRect =
                              modalElement.getBoundingClientRect();
                            badgeX = modalRect.right - 50;
                            badgeY = modalRect.top + 50;
                          }

                          // Calculate precise trajectory from button center to badge center
                          const buttonCenterX =
                            buttonRect.left + buttonRect.width / 2;
                          const buttonCenterY =
                            buttonRect.top + buttonRect.height / 2;
                          const deltaX = badgeX - buttonCenterX;
                          const deltaY = badgeY - buttonCenterY;

                          // Set CSS custom properties for dynamic targeting
                          flyingEmoji.style.setProperty(
                            "--target-x",
                            `${deltaX}px`,
                          );
                          flyingEmoji.style.setProperty(
                            "--target-y",
                            `${deltaY}px`,
                          );
                          flyingEmoji.style.animation =
                            "emoji-fly-to-target 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

                          // Trigger padlock unlock and percentage badge hit animation after flight delay
                          setTimeout(() => {
                            const percentageBadge = modalElement.querySelector(
                              ".percentage-badge-container",
                            );
                            if (percentageBadge) {
                              // Start padlock unlock animation
                              const padlock =
                                percentageBadge.querySelector(
                                  ".padlock-overlay",
                                );
                              if (padlock) {
                                padlock.classList.add("padlock-unlock");
                              }

                              // CRITICAL FIX: Set padlock state to unlocked for this profile type
                              if (profileType === "jobs") {
                                setJobsPadlockUnlocked(true);
                              } else if (profileType === "networking") {
                                setNetworkingPadlockUnlocked(true);
                              } else if (profileType === "mentorship") {
                                setMentorshipPadlockUnlocked(true);
                              }

                              // Add badge hit animation
                              percentageBadge.classList.add(
                                "percentage-badge-hit",
                              );
                              setTimeout(() => {
                                percentageBadge.classList.remove(
                                  "percentage-badge-hit",
                                );
                              }, 600);

                              // Add unlock glow
                              percentageBadge.classList.add(
                                "badge-unlock-glow",
                              );
                              setTimeout(() => {
                                percentageBadge.classList.remove(
                                  "badge-unlock-glow",
                                );
                              }, 1000);
                            }

                            // Remove flying emoji
                            setTimeout(() => {
                              if (flyingEmoji.parentNode) {
                                flyingEmoji.parentNode.removeChild(flyingEmoji);
                              }
                            }, 200);
                          }, 1500);
                        }
                      }}
                      disabled={isProcessing}
                      style={{
                        background:
                          profileType === "networking"
                            ? "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)"
                            : profileType === "mentorship"
                              ? "linear-gradient(140deg, #c084fc 0%, #8b5cf6 100%)"
                              : "linear-gradient(140deg, #60a5fa 0%, #3b82f6 100%)",
                        boxShadow:
                          profileType === "networking"
                            ? "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
                        transform: "perspective(500px) rotateX(10deg)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(5deg) scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          profileType === "networking"
                            ? "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 6px 10px rgba(139, 92, 246, 0.35), 0 10px 30px rgba(139, 92, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 6px 10px rgba(59, 130, 246, 0.35), 0 10px 30px rgba(59, 130, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(10deg)";
                        e.currentTarget.style.boxShadow =
                          profileType === "networking"
                            ? "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      {!emojiHidden &&
                        (profileType === "networking" ? (
                          <span
                            className="text-4xl"
                            style={{
                              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                              animation: "spin3d 2s linear infinite",
                            }}
                          >
                            🤝🏼
                          </span>
                        ) : profileType === "mentorship" ? (
                          <span
                            className="text-4xl"
                            style={{
                              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                              animation: "spin3d 2s linear infinite",
                            }}
                          >
                            🎓
                          </span>
                        ) : (
                          <span
                            className="text-4xl"
                            style={{
                              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                              animation: "spin3d 2s linear infinite",
                            }}
                          >
                            💼
                          </span>
                        ))}
                    </button>

                    {/* Like Button */}
                    <button
                      className={`action-button-expandable w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all transform hover:scale-110 ${
                        profileType === "networking"
                          ? "border border-emerald-400"
                          : profileType === "mentorship"
                            ? "border border-purple-400"
                            : "border border-blue-400"
                      } relative overflow-hidden z-10`}
                      onClick={handleLikeButtonClick}
                      disabled={isProcessing}
                      style={{
                        background:
                          profileType === "networking"
                            ? "linear-gradient(140deg, #6ee7b7 0%, #10b981 100%)"
                            : profileType === "mentorship"
                              ? "linear-gradient(140deg, #c084fc 0%, #8b5cf6 100%)"
                              : "linear-gradient(140deg, #60a5fa 0%, #3b82f6 100%)",
                        boxShadow:
                          profileType === "networking"
                            ? "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)",
                        transform: "perspective(500px) rotateX(10deg)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(5deg) scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          profileType === "networking"
                            ? "0 6px 10px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(16, 185, 129, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 6px 10px rgba(139, 92, 246, 0.35), 0 10px 30px rgba(139, 92, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 6px 10px rgba(59, 130, 246, 0.35), 0 10px 30px rgba(59, 130, 246, 0.3), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform =
                          "perspective(500px) rotateX(10deg)";
                        e.currentTarget.style.boxShadow =
                          profileType === "networking"
                            ? "0 4px 6px rgba(16, 185, 129, 0.25), 0 8px 24px rgba(16, 185, 129, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                            : profileType === "mentorship"
                              ? "0 4px 6px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(139, 92, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)"
                              : "0 4px 6px rgba(59, 130, 246, 0.25), 0 8px 24px rgba(59, 130, 246, 0.2), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 10px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <Heart
                        className="w-6 h-6 text-white"
                        style={{
                          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                        }}
                      />
                    </button>
                  </div>
                )}

                {/* Arrow Guide for SUITE Padlock Unlock - matches discover page functionality */}
                {showArrowGuide && arrowGuideType && (
                  <div className={`unlock-guide-arrow arrow-${arrowGuideType}`}>
                    <div className="unlock-guide-text">
                      {arrowGuideType === "job" && "Click 💼 to unlock"}
                      {arrowGuideType === "networking" && "Click 🤝 to unlock"}
                      {arrowGuideType === "mentorship" && "Click 👩‍🏫 to unlock"}
                    </div>
                    <div className="arrow-line-container">
                      <div className="arrow-line"></div>
                      <div className="arrow-head"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Default MEET SwipeCard */
            <div
              className={`h-full ${
                animationDirection === "left"
                  ? "animate-meet-swipe-left"
                  : animationDirection === "right"
                    ? "animate-meet-swipe-right"
                    : ""
              }`}
              style={{
                boxShadow:
                  "0 0 25px rgba(168, 85, 247, 0.6), 0 0 50px rgba(168, 85, 247, 0.4), 0 0 75px rgba(168, 85, 247, 0.3), 0 0 100px rgba(168, 85, 247, 0.2), 0 10px 30px rgba(0, 0, 0, 0.15)",
                borderRadius: "0.75rem",
              }}
            >
              <SwipeCard
                user={
                  isFromSuiteProfile && additionalData?.currentPrimaryPhoto
                    ? {
                        ...user,
                        photoUrl: additionalData.currentPrimaryPhoto,
                      }
                    : user
                }
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onMatchFound={handleMatchFound}
                mode="match"
                isPremium={isPremium}
                onPremiumUpgradeClick={onPremiumUpgradeClick}
                isFromSuiteProfile={isFromSuiteProfile}
                disableSwipe={disableSwipe}
                onClose={disableSwipe ? onClose : undefined}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
