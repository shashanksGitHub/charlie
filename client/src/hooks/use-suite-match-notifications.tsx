import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SuiteMatchDialog } from "@/components/ui/suite-match-dialog";

interface MatchNotification {
  id: string;
  matchedUser: {
    id: number;
    fullName: string;
    photoUrl?: string;
    profession?: string;
    location?: string;
  };
  matchType: "networking" | "mentorship" | "jobs";
  timestamp: string;
  chatId?: string | number;
}

interface SuiteMatchContextType {
  showMatch: (notification: MatchNotification) => void;
  hideMatch: () => void;
}

const SuiteMatchContext = createContext<SuiteMatchContextType | undefined>(
  undefined,
);

export function SuiteMatchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentMatch, setCurrentMatch] = useState<MatchNotification | null>(
    null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Listen for WebSocket match notifications
  useEffect(() => {
    if (!user) return;

    console.log(
      "[SUITE-MATCH-DEBUG] Setting up WebSocket listener for user:",
      user.id,
    );

    const handleMatchNotification = (event: any) => {
      const data = event.detail;
      console.log("[SUITE-MATCH] Received match notification:", data);
      console.log("[SUITE-MATCH] Raw event object:", event);

      // Check if this is a SUITE match notification
      // CRITICAL FIX: Some match notifications might not have isMatch=true explicitly set
      const isSuiteMatch =
        data.type === "networking_match" ||
        data.type === "mentorship_match" ||
        data.type === "job_match";

      console.log("[SUITE-MATCH-DEBUG] Match type check:", {
        dataType: data.type,
        isSuiteMatch,
        isMatch: data.isMatch,
        hasUser: !!user,
        userId: user?.id,
      });

      if (isSuiteMatch) {
        console.log("[SUITE-MATCH] SUITE match detected, processing...", {
          type: data.type,
          isMatch: data.isMatch,
          hasMatchedUserName: !!data.matchedUserName,
        });
        console.log(
          "[SUITE-MATCH-DEBUG] Raw WebSocket data received:",
          JSON.stringify(data, null, 2),
        );

        const matchType =
          data.type === "networking_match"
            ? "networking"
            : data.type === "mentorship_match"
              ? "mentorship"
              : "jobs";

        // For the current user, determine who they matched with
        let matchedUserId,
          matchedUserName,
          matchedUserPhoto,
          matchedUserProfession,
          matchedUserLocation;
        let connectionId;

        if (data.type === "job_match") {
          // Job matches have different structure: data.application instead of data.connection
          if (data.acceptedBy === user.id) {
            // Current user is the one who accepted, so the matched user is the applicant
            matchedUserId = data.application.userId;
          } else {
            // Current user is the applicant, so the matched user is the accepter
            matchedUserId = data.acceptedBy;
          }
          connectionId = data.application.id;
        } else {
          // Networking and mentorship matches
          if (data.acceptedBy === user.id) {
            // Current user is the one who accepted, so the matched user is the requester
            matchedUserId = data.connection.userId;
          } else {
            // Current user is the requester, so the matched user is the accepter
            matchedUserId = data.acceptedBy;
          }
          connectionId = data.connection.id;
        }

        // CRITICAL FIX: Always use the server-provided matched user data first
        // The server correctly sends this data for all match types including jobs
        matchedUserName = data.matchedUserName || "Connection";
        matchedUserPhoto = data.matchedUserPhoto;
        matchedUserProfession = data.matchedUserProfession;
        matchedUserLocation = data.matchedUserLocation;

        console.log("[SUITE-MATCH-DEBUG] Extracted match data:", {
          matchedUserId,
          matchedUserName,
          connectionId,
          matchType,
        });

        const matchedUser = {
          id: matchedUserId,
          fullName: matchedUserName,
          photoUrl: matchedUserPhoto,
          profession: matchedUserProfession,
          location: matchedUserLocation,
        };

        const notification: MatchNotification = {
          id: `${matchType}_${connectionId}_${Date.now()}`,
          matchedUser,
          matchType,
          timestamp: data.timestamp,
          chatId: data.chatId, // Include chat ID from WebSocket data
        };

        console.log(
          "[SUITE-MATCH-DEBUG] Created notification object:",
          notification,
        );

        // Remove the connection card from Connections page when match dialog appears
        window.dispatchEvent(
          new CustomEvent("connectionCardRemoval", {
            detail: {
              connectionId: connectionId,
              isMatch: true,
            },
          }),
        );

        console.log("[SUITE-MATCH-DEBUG] About to call showMatch...");
        showMatch(notification);
      } else {
        console.log(
          "[SUITE-MATCH-DEBUG] Not a SUITE match, ignoring:",
          data.type,
        );
      }
    };

    // Listen for global WebSocket events
    console.log("[SUITE-MATCH-DEBUG] Adding websocket-message listener");
    window.addEventListener("websocket-message", handleMatchNotification);

    return () => {
      console.log("[SUITE-MATCH-DEBUG] Removing websocket-message listener");
      window.removeEventListener("websocket-message", handleMatchNotification);
    };
  }, [user]);

  const showMatch = (notification: MatchNotification) => {
    console.log("[SUITE-MATCH] Showing match dialog:", notification);
    console.log("[SUITE-MATCH] Dialog state before:", {
      currentMatch,
      isDialogOpen,
    });

    // Play match notification sound (same as MEET)
    try {
      // Create and play a celebratory sound
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Play a pleasant notification sound
      oscillator.type = "sine";
      oscillator.frequency.value = 587.33; // D5
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Play first note then stop
      setTimeout(() => {
        oscillator.frequency.value = 659.25; // E5
        setTimeout(() => {
          oscillator.frequency.value = 783.99; // G5
          setTimeout(() => {
            oscillator.stop();
          }, 200);
        }, 200);
      }, 200);
    } catch (e) {
      console.log(
        "SUITE match audio notification failed, but match popup still shown",
      );
    }

    setCurrentMatch(notification);
    setIsDialogOpen(true);

    console.log("[SUITE-MATCH] Dialog state after:", {
      currentMatch: notification,
      isDialogOpen: true,
      matchedUserName: notification.matchedUser.fullName,
    });
  };

  const hideMatch = () => {
    console.log("[SUITE-MATCH] Hiding match dialog");
    setIsDialogOpen(false);

    setTimeout(() => {
      setCurrentMatch(null);
    }, 300);
  };

  const handleSendMessage = async () => {
    if (currentMatch) {
      // If we have a chat ID from the notification, use it directly
      if (currentMatch.chatId) {
        console.log(`[SUITE-MATCH] Navigating to chat ${currentMatch.chatId}`);
        setLocation(`/chat/${currentMatch.chatId}`);
        return;
      }

      // Fallback: Find the match ID by looking up the match between users
      try {
        console.log(
          `[SUITE-MATCH] Looking up match between current user and ${currentMatch.matchedUser.id}`,
        );
        const response = await fetch("/api/matches");
        if (response.ok) {
          const matches = await response.json();
          // Find the match with the other user
          const match = matches.find(
            (m: any) =>
              m.userId1 === currentMatch.matchedUser.id ||
              m.userId2 === currentMatch.matchedUser.id,
          );

          if (match) {
            console.log(
              `[SUITE-MATCH] Found match ${match.id}, navigating to chat`,
            );
            setLocation(`/chat/${match.id}`);
          } else {
            console.error("[SUITE-MATCH] No match found between users");
            // Fallback to SUITE messages page
            setLocation(`/suite/messages`);
          }
        } else {
          console.error("[SUITE-MATCH] Failed to fetch matches");
          setLocation(`/suite/messages`);
        }
      } catch (error) {
        console.error("[SUITE-MATCH] Error fetching match:", error);
        setLocation(`/suite/messages`);
      }
    }
  };

  console.log("[SUITE-MATCH-DEBUG] Rendering provider with:", {
    currentMatch: !!currentMatch,
    isDialogOpen,
    matchedUserName: currentMatch?.matchedUser?.fullName,
  });

  return (
    <SuiteMatchContext.Provider value={{ showMatch, hideMatch }}>
      {children}

      {/* Global Match Dialog */}
      {currentMatch && (
        <SuiteMatchDialog
          isOpen={isDialogOpen}
          onClose={hideMatch}
          matchedUser={currentMatch.matchedUser}
          matchType={currentMatch.matchType}
          onSendMessage={handleSendMessage}
        />
      )}
    </SuiteMatchContext.Provider>
  );
}

export function useSuiteMatch() {
  const context = useContext(SuiteMatchContext);
  if (context === undefined) {
    throw new Error("useSuiteMatch must be used within a SuiteMatchProvider");
  }
  return context;
}
