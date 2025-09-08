import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { WebSocket } from "ws";

// Map to reference WebSocket connections by user ID
let connectedUsers: Map<number, WebSocket> | null = null;

/**
 * Sets up a new match between two users and notifies them
 * This function no longer creates automated welcome messages
 * but still ensures both users get proper notifications
 *
 * @param matchId The ID of the match
 * @param user1Id The ID of the first user
 * @param user2Id The ID of the second user
 */
async function setupMatchAndNotify(
  matchId: number,
  user1Id: number,
  user2Id: number,
) {
  try {
    console.log(
      `Setting up match ${matchId} between users ${user1Id} and ${user2Id} (without automated welcome messages)`,
    );

    // Get the user names for personalized welcome messages
    const user1 = await storage.getUser(user1Id);
    const user2 = await storage.getUser(user2Id);

    if (!user1 || !user2) {
      console.error(`Could not find users for match ${matchId}`);
      return;
    }

    // CRITICAL FIX: Ensure the match is marked as matched=true for both users
    await storage.updateMatch(matchId, { matched: true });

    // No welcome messages are created, as per user request
    
    console.log(
      `Successfully set up match ${matchId} without automated welcome messages`,
    );

    // Send WebSocket events to both users to immediately update their chat list
    if (connectedUsers) {
      // For user1
      const user1Socket = connectedUsers.get(user1Id);
      if (user1Socket && user1Socket.readyState === WebSocket.OPEN) {
        // No need to send new_message notification since we don't create messages anymore

        // CRITICAL FIX: Also send explicit matches:refresh event
        user1Socket.send(
          JSON.stringify({
            type: "matches:refresh",
            matchId: matchId,
            reason: "new_match",
            timestamp: new Date().toISOString(),
          }),
        );

        // CRITICAL FIX: Send match_notification event with user info
        user1Socket.send(
          JSON.stringify({
            type: "match_notification",
            match: {
              id: matchId,
              userId1: user1Id,
              userId2: user2Id,
              matched: true,
            },
            fromUserInfo: {
              id: user2Id,
              fullName: user2.fullName,
              photoUrl: user2.photoUrl,
            },
            matchId: matchId,
            isMatch: true,
            forceDisplay: true,
          }),
        );
      }

      // For user2
      const user2Socket = connectedUsers.get(user2Id);
      if (user2Socket && user2Socket.readyState === WebSocket.OPEN) {
        // No need to send new_message notification since we don't create messages anymore

        // CRITICAL FIX: Also send explicit matches:refresh event
        user2Socket.send(
          JSON.stringify({
            type: "matches:refresh",
            matchId: matchId,
            reason: "new_match",
            timestamp: new Date().toISOString(),
          }),
        );

        // CRITICAL FIX: Send match_notification event with user info
        user2Socket.send(
          JSON.stringify({
            type: "match_notification",
            match: {
              id: matchId,
              userId1: user1Id,
              userId2: user2Id,
              matched: true,
            },
            fromUserInfo: {
              id: user1Id,
              fullName: user1.fullName,
              photoUrl: user1.photoUrl,
            },
            matchId: matchId,
            isMatch: true,
            forceDisplay: true,
          }),
        );
      }

      console.log(`Sent real-time updates to both users for match ${matchId}`);
    }

    // CRITICAL FIX: Store match data in database with last message time for both users
    await storage.updateMatch(matchId, {
      matched: true,
    });

    // Update lastMessageAt separately using direct database access
    try {
      const db = await import("./db").then((module) => module.db);
      const matches = await import("@shared/schema").then(
        (module) => module.matches,
      );
      const { eq } = await import("drizzle-orm");

      await db
        .update(matches)
        .set({ lastMessageAt: new Date() })
        .where(eq(matches.id, matchId));

      console.log(`Updated lastMessageAt for match ${matchId}`);
    } catch (dbError) {
      console.error(
        `Error updating lastMessageAt for match ${matchId}:`,
        dbError,
      );
    }
  } catch (error) {
    console.error(
      `Error setting up match ${matchId}:`,
      error,
    );
  }
}

/**
 * Sets the WebSocket connections map to be used for real-time notifications
 * @param connections The map of user IDs to WebSocket connections
 */
export function setWebSocketConnections(connections: Map<number, WebSocket>) {
  connectedUsers = connections;
}

/**
 * Send a notification to a user about a new like or match
 * @param userId The ID of the user to notify
 * @param matchData The data about the match/like
 * @param fromUserId The ID of the user who created the like/match
 */
export async function sendLikeNotification(
  userId: number,
  matchData: any,
  fromUserId: number,
) {
  try {
    // Ensure the connections map is initialized
    if (!connectedUsers) {
      console.warn(
        "WebSocket connections map not initialized. Notifications won't be sent.",
      );
      return;
    }

    // Check if the user is online
    const userSocket = connectedUsers.get(userId);
    if (!userSocket || userSocket.readyState !== WebSocket.OPEN) {
      console.log(
        `Cannot send notification to user ${userId}: not connected or socket not ready`,
      );
      return;
    }

    try {
      // Get all matches for this user for accurate count information
      const allUserMatches = await storage.getMatchesByUserId(userId);

      // Calculate fresh counts for immediate UI updates
      const confirmedMatches = allUserMatches.filter((match) => match.matched);
      const pendingLikes = allUserMatches.filter(
        (match) =>
          !match.matched &&
          !match.isDislike &&
          match.userId1 !== userId &&
          match.userId2 === userId,
      );

      // Get information about the user who sent the like
      const fromUser = await storage.getUser(fromUserId);
      let fromUserInfo = null;

      if (fromUser) {
        // Creating a sanitized version without password
        const { password, ...userWithoutPassword } = fromUser;
        fromUserInfo = userWithoutPassword;
      }

      // Determine if this is a match or just a like
      const isMatch = matchData.matched === true;
      const notificationType = isMatch ? "new_match" : "new_like";

      // CRITICAL FIX: Enhanced guaranteed match popup notification
      console.log(
        `🔥 CRITICAL FIX: Sending guaranteed match popup notification to user ${userId} from user ${fromUserId}`,
      );

      // First, send a pre-notification to prepare the client for the match popup
      if (isMatch) {
        userSocket.send(
          JSON.stringify({
            type: "match_popup_prepare",
            fromUserInfo,
            matchId: matchData.id,
            timestamp: Date.now(),
          }),
        );

        // Small delay to ensure order of events
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Send the main notification with all info
      // For matches, send both 'new_like' for backward compatibility and 'match_notification' for explicit handling
      userSocket.send(
        JSON.stringify({
          type: isMatch ? "match_notification" : "new_like",
          match: matchData,
          fromUserId,
          fromUserInfo, // Include user profile information
          counts: {
            confirmed: confirmedMatches.length,
            pending: pendingLikes.length,
            total: pendingLikes.length, // FIXED: Only count pending likes in the total, not confirmed matches
          },
          isMatch,
          matchId: matchData.id, // Explicitly include matchId for easier handling
          timestamp: Date.now(),
          // CRITICAL: Add multiple flags to guarantee popup display
          priority: isMatch ? "critical" : "normal",
          guaranteed_match_popup: isMatch,
          forceDisplay: isMatch,
        }),
      );

      console.log(`WebSocket notification sent successfully to user ${userId}`);
    } catch (error) {
      console.error(`Error preparing enhanced notification data:`, error);

      // Determine if this is a match within the catch block scope
      const fallbackIsMatch = matchData.matched === true;

      // Fallback to basic notification if enhanced fails
      // Still use match_notification type if it's a match
      userSocket.send(
        JSON.stringify({
          type: fallbackIsMatch ? "match_notification" : "new_like",
          match: matchData,
          matchId: matchData.id,
          fromUserId,
          isMatch: fallbackIsMatch,
          timestamp: Date.now(),
          forceDisplay: fallbackIsMatch,
        }),
      );
    }
  } catch (error) {
    console.error(`Error sending like notification to user ${userId}:`, error);
  }
}

/**
 * Send an unmatch notification to a user
 * This allows the other user's UI to immediately react to being unmatched
 * 
 * @param userId The ID of the user to notify
 * @param matchId The ID of the match that was removed
 * @param unmatchedByUserId The ID of the user who initiated the unmatch
 */
export async function sendUnmatchNotification(
  userId: number,
  matchId: number,
  unmatchedByUserId: number
) {
  try {
    // Ensure the connections map is initialized
    if (!connectedUsers) {
      console.warn(
        "WebSocket connections map not initialized. Unmatch notification won't be sent."
      );
      return;
    }

    // Check if the user is online
    const userSocket = connectedUsers.get(userId);
    if (!userSocket || userSocket.readyState !== WebSocket.OPEN) {
      console.log(
        `Cannot send unmatch notification to user ${userId}: not connected or socket not ready`
      );
      return;
    }

    // Send a notification to redirect the user immediately to messages page
    userSocket.send(
      JSON.stringify({
        type: "unmatch_notification",
        matchId: matchId,
        unmatchedBy: unmatchedByUserId,
        timestamp: new Date().toISOString(),
        // Add an action flag to instruct client to redirect to messages page
        action: "redirect_to_messages"
      })
    );

    // Also refresh the matches list to remove the unmatched user
    userSocket.send(
      JSON.stringify({
        type: "matches:refresh",
        reason: "unmatch",
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`Unmatch notification sent successfully to user ${userId}`);
  } catch (error) {
    console.error(`Error sending unmatch notification to user ${userId}:`, error);
  }
}

/**
 * Register match-related API endpoints
 * This module provides dedicated API endpoints for match functionality
 */
export function registerMatchAPI(app: Express) {
  // Create a new match/like (with WebSocket notifications)
  app.post("/api/matches", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        console.log("User not authenticated when creating a match/like");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      console.log(
        `Creating new match/like initiated by user ${userId}:`,
        req.body,
      );

      // Validate incoming data
      const { userId1, userId2, matched = false, isDislike = false } = req.body;

      if (!userId1 || !userId2) {
        return res.status(400).json({ message: "Both user IDs are required" });
      }

      // Prevent users from matching with themselves
      if (userId1 === userId2) {
        console.log(`User ${userId} attempted to match with themselves`);
        return res.status(400).json({ message: "Users cannot match with themselves" });
      }

      // Verify that the current user is one of the users in the match
      if (userId1 !== userId && userId2 !== userId) {
        console.log(
          `User ${userId} not authorized to create match between ${userId1} and ${userId2}`,
        );
        return res
          .status(403)
          .json({ message: "Not authorized to create this match" });
      }

      // Check if a match already exists between these users
      console.log(
        `🔍 [MEET-FIX] Checking if match exists between users ${userId1} and ${userId2}`,
      );
      const allMatchesBetweenUsers = await storage.getAllMatchesBetweenUsers(userId1, userId2);
      console.log(`🔍 [MEET-FIX] Found ${allMatchesBetweenUsers.length} existing matches between users`);
      
      if (allMatchesBetweenUsers.length > 0) {
        allMatchesBetweenUsers.forEach((match, index) => {
          console.log(`🔍 [MEET-FIX] Match ${index + 1}: ID=${match.id}, metadata=${match.metadata}`);
        });
      }
      
      const existingMatch = allMatchesBetweenUsers.length > 0 ? allMatchesBetweenUsers[0] : null;

      if (existingMatch) {
        console.log(
          `Match already exists (ID: ${existingMatch.id}) between users ${existingMatch.userId1} and ${existingMatch.userId2}`,
        );

        // If the match has the same state, still check if we need to add MEET as additional connection
        if (
          existingMatch.matched === matched &&
          existingMatch.isDislike === isDislike
        ) {
          // Check if we need to add MEET as additional connection even for existing same-state matches
          if (existingMatch.metadata) {
            try {
              const existingMetadata = typeof existingMatch.metadata === 'string' 
                ? JSON.parse(existingMatch.metadata) 
                : existingMatch.metadata;
              
              if (existingMetadata && existingMetadata.origin === 'SUITE') {
                console.log(`🔗 [MEET-FIX] Found SUITE match with origin: ${existingMetadata.origin}, suiteType: ${existingMetadata.suiteType}`);
                console.log(`🔗 [MEET-FIX] Current additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`);
                
                // Add MEET as additional connection to existing SUITE match
                if (!existingMetadata.additionalConnections) {
                  existingMetadata.additionalConnections = [];
                  console.log(`🔗 [MEET-FIX] Initialized additionalConnections array`);
                }
                
                if (!existingMetadata.additionalConnections.includes('MEET')) {
                  existingMetadata.additionalConnections.push('MEET');
                  console.log(`🔗 [MEET-FIX] Adding MEET to additionalConnections for same-state match ${existingMatch.id}`);
                  console.log(`🔗 [MEET-FIX] New additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`);
                  
                  // Update the match with the new metadata
                  const updatedMatch = await storage.updateMatch(existingMatch.id, {
                    metadata: JSON.stringify(existingMetadata)
                  });
                  
                  console.log(`🔗 [MEET-FIX] Successfully added MEET to additionalConnections for existing SUITE match ${existingMatch.id}`);
                  console.log(`🔗 [MEET-FIX] Final updated metadata: ${updatedMatch?.metadata}`);
                  
                  return res.status(200).json({
                    message: "MEET added as additional connection to existing SUITE match",
                    match: updatedMatch,
                  });
                } else {
                  console.log(`🔗 [MEET-FIX] MEET already exists in additionalConnections, no update needed`);
                }
              }
            } catch (parseError) {
              console.error('Failed to parse existing metadata during same-state check:', parseError);
            }
          }
          
          return res.status(409).json({
            message: "Match already exists with this state",
            existingMatch,
          });
        }

        // If the state is different, update the match
        // Also check if we need to add MEET as additional connection
        let finalMetadata = existingMatch.metadata;
        if (existingMatch.metadata) {
          try {
            const existingMetadata = typeof existingMatch.metadata === 'string' 
              ? JSON.parse(existingMatch.metadata) 
              : existingMatch.metadata;
            
            if (existingMetadata && existingMetadata.origin === 'SUITE') {
              // Add MEET as additional connection to existing SUITE match
              if (!existingMetadata.additionalConnections) {
                existingMetadata.additionalConnections = [];
              }
              
              if (!existingMetadata.additionalConnections.includes('MEET')) {
                existingMetadata.additionalConnections.push('MEET');
                console.log(`🔗 Adding MEET to additionalConnections for existing match ${existingMatch.id}`);
              }
              
              finalMetadata = JSON.stringify(existingMetadata);
            }
          } catch (parseError) {
            console.error('Failed to parse existing metadata during update:', parseError);
          }
        }
        
        const updatedMatch = await storage.updateMatch(existingMatch.id, {
          matched,
          isDislike,
          metadata: finalMetadata
        });

        // Check if this is a new mutual match (both users liked each other)
        if (matched && !existingMatch.matched && updatedMatch) {
          // Send WebSocket notification to BOTH users when it's a match
          const otherUserId = userId1 === userId ? userId2 : userId1;

          // Set up match and notify both users
          await setupMatchAndNotify(
            updatedMatch.id,
            userId,
            otherUserId,
          );

          // Send match notification to the other user with current user's info
          sendLikeNotification(otherUserId, updatedMatch, userId);

          // FIXED: Send match notification to the current user with the OTHER user's info
          // This ensures both users see the match popup simultaneously with correct info
          sendLikeNotification(userId, updatedMatch, otherUserId);

          // Also send direct WebSocket messages to refresh match lists immediately
          // This ensures chat tabs appear without having to refresh the page
          if (connectedUsers) {
            // For user1
            const user1Socket = connectedUsers.get(userId);
            if (user1Socket && user1Socket.readyState === WebSocket.OPEN) {
              user1Socket.send(
                JSON.stringify({
                  type: "matches:refresh",
                  matchId: updatedMatch.id,
                  reason: "new_match",
                  timestamp: new Date().toISOString(),
                }),
              );
            }

            // For user2
            const user2Socket = connectedUsers.get(otherUserId);
            if (user2Socket && user2Socket.readyState === WebSocket.OPEN) {
              user2Socket.send(
                JSON.stringify({
                  type: "matches:refresh",
                  matchId: updatedMatch.id,
                  reason: "new_match",
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          }
        }

        return res.status(200).json(updatedMatch);
      }

      // No existing match found, create new match with MEET metadata
      const newMatch = await storage.createMatch({
        userId1,
        userId2,
        matched,
        isDislike,
        metadata: JSON.stringify({ origin: "MEET" })
      });
      console.log(`🔗 Created new MEET match between users ${userId1} and ${userId2}`);

      console.log(
        `New match created (ID: ${newMatch.id}) between users ${newMatch.userId1} and ${newMatch.userId2}`,
      );

      const otherUserId = userId1 === userId ? userId2 : userId1;

      // If this is a direct match (matched=true), send notifications to both users
      if (matched) {
        // Set up match and notify both users
        await setupMatchAndNotify(newMatch.id, userId, otherUserId);

        // Send match notification to the other user with current user's info
        sendLikeNotification(otherUserId, newMatch, userId);

        // FIXED: Send match notification to the current user with the OTHER user's info
        sendLikeNotification(userId, newMatch, otherUserId);

        // Also send direct WebSocket messages to refresh match lists immediately
        // This ensures chat tabs appear without having to refresh the page
        if (connectedUsers) {
          // For user1
          const user1Socket = connectedUsers.get(userId);
          if (user1Socket && user1Socket.readyState === WebSocket.OPEN) {
            user1Socket.send(
              JSON.stringify({
                type: "matches:refresh",
                matchId: newMatch.id,
                reason: "new_match",
                timestamp: new Date().toISOString(),
              }),
            );
          }

          // For user2
          const user2Socket = connectedUsers.get(otherUserId);
          if (user2Socket && user2Socket.readyState === WebSocket.OPEN) {
            user2Socket.send(
              JSON.stringify({
                type: "matches:refresh",
                matchId: newMatch.id,
                reason: "new_match",
                timestamp: new Date().toISOString(),
              }),
            );
          }
        }
      } else {
        // For regular likes, just notify the other user
        sendLikeNotification(otherUserId, newMatch, userId);
      }

      return res.status(201).json(newMatch);
    } catch (error) {
      console.error("Error creating match:", error);
      return res.status(500).json({ message: "Server error creating match" });
    }
  });

  // Dedicated endpoint for match counts (optimized for real-time notifications)
  app.get("/api/matches/counts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get the current user ID
      const userId = req.user.id;

      // Get all matches for this user
      const matches = await storage.getMatchesByUserId(userId);

      // Get stored clicked match IDs from the query parameter
      const clickedIdsParam = req.query.clicked || "[]";
      let clickedMatchIds: number[] = [];

      try {
        clickedMatchIds = JSON.parse(clickedIdsParam as string);
        // Ensure it's an array
        if (!Array.isArray(clickedMatchIds)) {
          clickedMatchIds = [];
        }
      } catch (e) {
        console.error("Error parsing clicked match IDs:", e);
        clickedMatchIds = [];
      }

      // Calculate counts exactly as shown in the UI
      const confirmedMatches = matches.filter((match) => match.matched);
      const pendingLikes = matches.filter(
        (match) =>
          !match.matched &&
          !match.isDislike &&
          match.userId1 !== userId &&
          match.userId2 === userId,
      );

      // Filter out clicked matches
      const visibleConfirmedMatches = confirmedMatches.filter(
        (match) => !clickedMatchIds.includes(match.id),
      );
      const visiblePendingLikes = pendingLikes.filter(
        (match) => !clickedMatchIds.includes(match.id),
      );

      console.log(
        `Match counts for user ${userId}: Confirmed=${visibleConfirmedMatches.length}, Pending=${visiblePendingLikes.length}`,
      );

      // Return the counts
      // FIXED: Only pending likes should count toward the heart icon notification (not confirmed matches)
      return res.json({
        confirmed: visibleConfirmedMatches.length,
        pending: visiblePendingLikes.length,
        total: visiblePendingLikes.length, // FIXED: Only pending likes count in the total for notifications
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error fetching match counts:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint to get matches created since a specific timestamp
  app.get(
    "/api/matches/since/:timestamp",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        // Try to parse the timestamp - support both ISO string and numeric timestamps
        let since: Date;
        const timestampParam = req.params.timestamp;

        // Check if it's an ISO string (contains - or T characters)
        if (timestampParam.includes("-") || timestampParam.includes("T")) {
          since = new Date(timestampParam);
        } else {
          // Try to parse as a numeric timestamp
          const timestamp = parseInt(timestampParam, 10);
          if (isNaN(timestamp)) {
            return res
              .status(400)
              .json({ message: "Invalid timestamp format" });
          }
          since = new Date(timestamp);
        }

        // Validate the resulting date
        if (isNaN(since.getTime())) {
          return res
            .status(400)
            .json({ message: "Invalid date from timestamp" });
        }

        const userId = req.user.id;

        // Get all matches created after the timestamp
        const matches = await storage.getMatchesSince(userId, since);

        console.log(
          `🔥 MATCH-CHECKER: Found ${matches.length} matches for user ${userId} since ${since.toISOString()}`,
        );

        // If there are matches, enhance them with user details for the match popup
        if (matches.length > 0) {
          // Get detailed info for each match to show in the popup
          const enhancedMatches = await Promise.all(
            matches.map(async (match) => {
              try {
                // Determine which user ID is NOT the current user
                const otherUserId =
                  match.userId1 === userId ? match.userId2 : match.userId1;

                // Get the other user's info
                const otherUser = await storage.getUser(otherUserId);

                // Don't include sensitive information like password
                if (otherUser) {
                  const { password, ...userInfo } = otherUser;

                  // Return enhanced match with user info
                  return {
                    ...match,
                    userInfo,
                    // Include these properties for compatibility with showMatchPopup function
                    matchedUser: userInfo,
                    user: userInfo,
                  };
                }

                return match;
              } catch (err) {
                console.error(
                  `Error enhancing match ${match.id} with user details:`,
                  err,
                );
                return match;
              }
            }),
          );

          res.json(enhancedMatches);
        } else {
          res.json(matches);
        }
      } catch (error) {
        console.error("Error getting matches since timestamp:", error);
        res.status(500).json({ message: "Server error getting matches" });
      }
    },
  );
}
