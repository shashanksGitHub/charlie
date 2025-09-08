import { Express, Request, Response } from "express";
import { storage } from "./storage";
import {
  insertSuiteNetworkingConnectionSchema,
  insertSuiteMentorshipConnectionSchema,
  insertSuiteJobApplicationSchema,
} from "@shared/schema";
import { z } from "zod";

let connectedUsers: Map<number, any> = new Map();

/**
 * Set WebSocket connections map - shared with main routes
 */
export function setSuiteWebSocketConnections(connections: Map<number, any>) {
  connectedUsers = connections;
}

/**
 * Register SUITE connection API endpoints
 * Handles networking, mentorship, and job connections with real-time notifications
 * Implements independent connection system where each context maintains separate interactions
 */
export function registerSuiteConnectionAPI(app: Express) {
  // ===== UNIFIED MESSAGE ENDPOINT FOR ALL SUITE CONTEXTS =====

  // Create instant match via message button (works for all SUITE contexts)
  app.post(
    "/api/suite/connections/message",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const { targetUserId, connectionType, profileId } = req.body;

        if (!connectionType || !profileId) {
          return res.status(400).json({
            message: "Missing required fields: connectionType, profileId",
          });
        }

        console.log(
          `Creating instant match via message for user ${userId} -> profile ${profileId} (${connectionType})`,
        );

        let newConnection;
        let isMatch = true; // Message button always creates instant match
        let actualTargetUserId = targetUserId;

        // Get the actual user ID for the profile based on connection type
        switch (connectionType) {
          case "networking":
            // Get the user ID from the networking profile
            const networkingProfile =
              await storage.getSuiteNetworkingProfileById(parseInt(profileId));
            if (!networkingProfile) {
              return res
                .status(404)
                .json({ message: "Networking profile not found" });
            }
            actualTargetUserId = networkingProfile.userId;

            // Check if connection already exists
            const existingNetworking =
              await storage.getSuiteNetworkingConnection(
                userId,
                parseInt(profileId),
              );
            if (existingNetworking) {
              return res.status(409).json({
                message: "Connection already exists",
                connection: existingNetworking,
              });
            }

            newConnection = await storage.createSuiteNetworkingConnection({
              userId,
              targetUserId: actualTargetUserId,
              targetProfileId: parseInt(profileId),
              action: "like",
              matched: true, // Instant match via message
            });
            break;

          case "mentorship":
            // Get the user ID from the mentorship profile
            const mentorshipProfile =
              await storage.getSuiteMentorshipProfileById(parseInt(profileId));
            if (!mentorshipProfile) {
              return res
                .status(404)
                .json({ message: "Mentorship profile not found" });
            }
            actualTargetUserId = mentorshipProfile.userId;

            const existingMentorship =
              await storage.getSuiteMentorshipConnection(
                userId,
                parseInt(profileId),
              );
            if (existingMentorship) {
              return res.status(409).json({
                message: "Connection already exists",
                connection: existingMentorship,
              });
            }

            newConnection = await storage.createSuiteMentorshipConnection({
              userId,
              targetUserId: actualTargetUserId,
              targetProfileId: parseInt(profileId),
              action: "like",
              matched: true, // Instant match via message
            });
            break;

          case "jobs":
            // Get the user ID from the job profile
            const jobProfile = await storage.getSuiteJobProfileById(
              parseInt(profileId),
            );
            if (!jobProfile) {
              return res.status(404).json({ message: "Job profile not found" });
            }
            actualTargetUserId = jobProfile.userId;

            const existingJob = await storage.getSuiteJobApplication(
              userId,
              parseInt(profileId),
            );
            if (existingJob) {
              return res.status(409).json({
                message: "Application already exists",
                application: existingJob,
              });
            }

            newConnection = await storage.createSuiteJobApplication({
              userId,
              targetUserId: actualTargetUserId,
              targetProfileId: parseInt(profileId),
              action: "like",
              applicationStatus: "accepted", // Instant acceptance via message
              matched: true, // Instant match via message
            });
            break;

          default:
            return res.status(400).json({ message: "Invalid connection type" });
        }

        // Send real-time notification to target user
        const targetUserWs = connectedUsers.get(actualTargetUserId);
        if (targetUserWs && targetUserWs.readyState === 1) {
          const notificationData = {
            type: "suite_message_match",
            connectionType,
            fromUserId: userId,
            isMatch: true,
            timestamp: new Date().toISOString(),
          };

          try {
            targetUserWs.send(JSON.stringify(notificationData));
            console.log(
              `✅ Message match notification sent to user ${actualTargetUserId} for ${connectionType}`,
            );
          } catch (error) {
            console.error(
              `❌ Failed to send message match notification:`,
              error,
            );
          }
        }

        // Create a chat thread in the main messaging system for seamless integration
        try {
          // Check if a match already exists between these users
          let existingMatch = await storage.getMatchBetweenUsers(
            userId,
            actualTargetUserId,
          );
          let chatData;

          if (existingMatch) {
            // Use existing match and update to matched=true if needed
            if (!existingMatch.matched) {
              chatData = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: connectionType,
                  context: "professional",
                }),
              });
            } else {
              // Handle existing match with potential metadata update for additional connections
              let metadata;

              if (!existingMatch.metadata) {
                // No existing metadata, create new
                metadata = {
                  origin: "SUITE",
                  suiteType: connectionType,
                  context: "professional",
                };
              } else {
                // Parse existing metadata to check for additional connections
                try {
                  metadata =
                    typeof existingMatch.metadata === "string"
                      ? JSON.parse(existingMatch.metadata)
                      : existingMatch.metadata;

                  // Check if this is a new connection type (SUITE-to-SUITE or MEET-to-SUITE)
                  if (
                    (metadata.origin === "SUITE" &&
                      metadata.suiteType !== connectionType) ||
                    metadata.origin === "MEET"
                  ) {
                    // Add to additionalConnections if not already present
                    if (!metadata.additionalConnections) {
                      metadata.additionalConnections = [];
                    }

                    if (
                      !metadata.additionalConnections.includes(connectionType)
                    ) {
                      metadata.additionalConnections.push(connectionType);
                      console.log(
                        `🔗 Adding ${connectionType} to additionalConnections for existing match ${existingMatch.id} via direct message`,
                      );

                      // Update match with enhanced metadata
                      chatData = await storage.updateMatch(existingMatch.id, {
                        metadata: JSON.stringify(metadata),
                      });
                    } else {
                      chatData = existingMatch;
                    }
                  } else {
                    chatData = existingMatch;
                  }
                } catch (parseError) {
                  console.error(
                    "Failed to parse existing metadata:",
                    parseError,
                  );
                  // Fallback to new metadata
                  metadata = {
                    origin: "SUITE",
                    suiteType: connectionType,
                    context: "professional",
                  };
                  chatData = await storage.updateMatch(existingMatch.id, {
                    metadata: JSON.stringify(metadata),
                  });
                }
              }

              // If no update was made above, ensure we have the existing match
              if (!chatData) {
                chatData = existingMatch;
              }
            }
          } else {
            // Create a new match with matched=true for instant messaging and proper metadata
            chatData = await storage.createMatch({
              userId1: userId,
              userId2: actualTargetUserId,
              matched: true,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: connectionType,
                context: "professional",
              }),
            });
          }

          console.log(
            `✅ Chat thread created for SUITE ${connectionType} connection:`,
            chatData.id,
          );

          // CRITICAL: Cleanup SUITE swipe history for instant matches
          console.log(
            `[SWIPE-CLEANUP] Starting cleanup for SUITE instant match between users ${userId} and ${actualTargetUserId} (${connectionType})`,
          );
          try {
            await storage.removeMatchedUsersFromSwipeHistory(
              userId,
              actualTargetUserId,
              `SUITE_${connectionType.toUpperCase()}`,
            );
          } catch (cleanupError) {
            console.error(
              `[SWIPE-CLEANUP] Failed for SUITE ${connectionType} instant match:`,
              cleanupError,
            );
          }

          res.status(201).json({
            connection: newConnection,
            isMatch: true,
            chatId: chatData.id,
            message: `Instant ${connectionType} match created via message!`,
          });
        } catch (chatError) {
          console.error(`❌ Failed to create chat thread:`, chatError);
          // Still return success for connection, but without chat integration
          res.status(201).json({
            connection: newConnection,
            isMatch: true,
            message: `${connectionType} connection created`,
          });
        }
      } catch (error) {
        console.error("Error creating message match:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== NETWORKING CONNECTIONS =====

  // Create networking connection (like/pass)
  app.post(
    "/api/suite/connections/networking",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const validatedData = insertSuiteNetworkingConnectionSchema.parse(
          req.body,
        );

        console.log(
          `Creating networking connection for user ${userId}:`,
          validatedData,
        );

        // Verify user is authorized to create this connection
        if (validatedData.userId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to create this connection" });
        }

        // Check if connection already exists
        const existingConnection = await storage.getSuiteNetworkingConnection(
          userId,
          validatedData.targetProfileId,
        );

        let connection;
        if (existingConnection) {
          // If connection has the same state, return conflict
          const isDislike = validatedData.action === "pass";
          if (
            existingConnection.action === validatedData.action &&
            existingConnection.isDislike === isDislike
          ) {
            return res.status(409).json({
              message: "Connection already exists with this state",
              connection: existingConnection,
            });
          }

          // Update existing connection with new action
          connection = await storage.updateSuiteNetworkingConnection(
            existingConnection.id,
            {
              action: validatedData.action,
              isDislike: isDislike,
              matched: false, // Reset match status when action changes
            },
          );
          console.log(
            `Updated existing networking connection ${existingConnection.id} with new action: ${validatedData.action}`,
          );
        } else {
          // Create new connection with isDislike field
          const connectionData = {
            ...validatedData,
            isDislike: validatedData.action === "pass",
          };
          connection =
            await storage.createSuiteNetworkingConnection(connectionData);
          console.log(
            `Created new networking connection with action: ${validatedData.action}, isDislike: ${connectionData.isDislike}`,
          );
        }

        // Check for mutual connection (match)
        const userProfileId = await getUserNetworkingProfileId(userId);
        let reciprocalConnection = null;
        if (userProfileId !== null) {
          reciprocalConnection = await storage.getSuiteNetworkingConnection(
            validatedData.targetUserId,
            userProfileId,
          );
        }

        let isMatch = false;
        if (
          reciprocalConnection &&
          reciprocalConnection.action === "like" &&
          validatedData.action === "like" &&
          !reciprocalConnection.isDislike
        ) {
          // Update both connections to matched status
          await storage.updateSuiteNetworkingConnection(connection.id, {
            matched: true,
          });
          await storage.updateSuiteNetworkingConnection(
            reciprocalConnection.id,
            { matched: true },
          );
          isMatch = true;
          console.log(
            `Created networking match between users ${userId} and ${validatedData.targetUserId}`,
          );

          // AUTOMATIC ADDITIONAL CONNECTION DETECTION: Check for existing matches and add networking as additional connection
          try {
            const existingMatch = await storage.getMatchBetweenUsers(
              userId,
              validatedData.targetUserId,
            );

            if (existingMatch && existingMatch.metadata) {
              // Parse existing metadata
              const existingMetadata =
                typeof existingMatch.metadata === "string"
                  ? JSON.parse(existingMatch.metadata)
                  : existingMatch.metadata;

              // Check if this is a different connection type
              if (
                existingMetadata &&
                (existingMetadata.origin === "MEET" ||
                  (existingMetadata.origin === "SUITE" &&
                    existingMetadata.suiteType !== "networking"))
              ) {
                // Add networking as additional connection
                if (!existingMetadata.additionalConnections) {
                  existingMetadata.additionalConnections = [];
                }

                if (
                  !existingMetadata.additionalConnections.includes("networking")
                ) {
                  existingMetadata.additionalConnections.push("networking");
                  console.log(
                    `🔗 Adding networking to additionalConnections for existing match ${existingMatch.id} between users ${userId} and ${validatedData.targetUserId}`,
                  );

                  // Update existing match metadata
                  await storage.updateMatch(existingMatch.id, {
                    metadata: JSON.stringify(existingMetadata),
                  });
                }
              }
            } else if (!existingMatch) {
              // Create new match for chat functionality with networking metadata
              await storage.createMatch({
                userId1: userId,
                userId2: validatedData.targetUserId,
                matched: true,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "networking",
                  context: "professional",
                }),
              });
              console.log(
                `🔗 Created new match for networking connection between users ${userId} and ${validatedData.targetUserId}`,
              );
            }
          } catch (metadataError) {
            console.error(
              "Failed to process additional connection metadata for networking match:",
              metadataError,
            );
            // Don't fail the match if metadata update fails
          }

          // CRITICAL: Remove swipe history records for matched users to protect match integrity
          // This prevents either user from undoing their swipe and destroying the networking match
          try {
            await storage.removeMatchedUsersFromSwipeHistory(
              userId,
              validatedData.targetUserId,
            );
            console.log(
              `[NETWORKING-MATCH] Cleaned up swipe history for matched users: ${userId} ↔ ${validatedData.targetUserId}`,
            );
          } catch (historyError) {
            console.error(
              "Error cleaning up networking swipe history for matched users:",
              historyError,
            );
            // Don't fail the match if cleanup fails, but log it for debugging
          }
        }

        // Send WebSocket notification to target user with complete data
        console.log(
          `[WEBSOCKET DEBUG] Checking for WebSocket connection for user ${validatedData.targetUserId}`,
        );
        console.log(
          `[WEBSOCKET DEBUG] Connected users count: ${connectedUsers.size}`,
        );
        console.log(
          `[WEBSOCKET DEBUG] Connected user IDs:`,
          Array.from(connectedUsers.keys()),
        );

        const targetUserWs = connectedUsers.get(validatedData.targetUserId);

        if (targetUserWs) {
          console.log(
            `[WEBSOCKET DEBUG] Found WebSocket for user ${validatedData.targetUserId}, readyState: ${targetUserWs.readyState}`,
          );

          if (targetUserWs.readyState === 1) {
            // WebSocket.OPEN = 1
            // Get complete user and profile data for the notification
            const fromUser = await storage.getUser(userId);
            const fromNetworkingProfile =
              await storage.getSuiteNetworkingProfile(userId);

            const notificationData = {
              type: isMatch ? "networking_match" : "networking_like",
              targetUserId: validatedData.targetUserId, // CRITICAL: Add targetUserId for notification filtering
              connection: {
                ...connection,
                targetUser: fromUser,
                targetProfile: fromNetworkingProfile,
              },
              fromUserId: userId,
              fromUser,
              fromNetworkingProfile,
              isMatch,
              timestamp: new Date().toISOString(),
            };

            try {
              targetUserWs.send(JSON.stringify(notificationData));
              console.log(
                `✅ [WEBSOCKET SUCCESS] Notification sent to user ${validatedData.targetUserId} for networking connection from user ${userId}`,
              );
              console.log(
                `[WEBSOCKET DATA]`,
                JSON.stringify(notificationData, null, 2),
              );
            } catch (error) {
              console.error(
                `❌ [WEBSOCKET ERROR] Failed to send notification:`,
                error,
              );
            }
          } else {
            console.log(
              `❌ [WEBSOCKET ERROR] WebSocket for user ${validatedData.targetUserId} is not open (readyState: ${targetUserWs.readyState})`,
            );
          }
        } else {
          console.log(
            `❌ [WEBSOCKET ERROR] No WebSocket connection found for user ${validatedData.targetUserId}`,
          );
          console.log(
            `[WEBSOCKET DEBUG] User may not be currently connected or on a different page`,
          );
        }

        res.status(201).json({
          connection: connection,
          isMatch,
          action: validatedData.action,
          message: isMatch
            ? "It's a professional match!"
            : validatedData.action === "like"
              ? "Connection request sent"
              : "Profile passed",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid request data", errors: error.errors });
        }
        console.error("Error creating networking connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get user's networking connections
  app.get(
    "/api/suite/connections/networking",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const connections = await storage.getUserNetworkingConnections(userId);

        res.json(connections);
      } catch (error) {
        console.error("Error fetching networking connections:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== MENTORSHIP CONNECTIONS =====

  // Create mentorship connection (like/pass)
  app.post(
    "/api/suite/connections/mentorship",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const validatedData = insertSuiteMentorshipConnectionSchema.parse(
          req.body,
        );

        console.log(
          `Creating mentorship connection for user ${userId}:`,
          validatedData,
        );

        // Verify user is authorized to create this connection
        if (validatedData.userId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to create this connection" });
        }

        // Check if connection already exists
        const existingConnection = await storage.getSuiteMentorshipConnection(
          userId,
          validatedData.targetProfileId,
        );

        let connection;
        if (existingConnection) {
          // If connection has the same state, return conflict
          const isDislike = validatedData.action === "pass";
          if (
            existingConnection.action === validatedData.action &&
            existingConnection.isDislike === isDislike
          ) {
            return res.status(409).json({
              message: "Connection already exists with this state",
              connection: existingConnection,
            });
          }

          // Update existing connection with new action
          connection = await storage.updateSuiteMentorshipConnection(
            existingConnection.id,
            {
              action: validatedData.action,
              isDislike: isDislike,
              matched: false, // Reset match status when action changes
            },
          );
          console.log(
            `Updated existing mentorship connection ${existingConnection.id} with new action: ${validatedData.action}`,
          );
        } else {
          // Create new connection with isDislike field
          const connectionData = {
            ...validatedData,
            isDislike: validatedData.action === "pass",
          };
          connection =
            await storage.createSuiteMentorshipConnection(connectionData);
          console.log(
            `Created new mentorship connection with action: ${validatedData.action}, isDislike: ${connectionData.isDislike}`,
          );
        }

        // Check for mutual connection (match)
        const userProfileId = await getUserMentorshipProfileId(userId);
        let reciprocalConnection = null;
        if (userProfileId !== null) {
          reciprocalConnection = await storage.getSuiteMentorshipConnection(
            validatedData.targetUserId,
            userProfileId,
          );
        }

        let isMatch = false;
        if (
          reciprocalConnection &&
          reciprocalConnection.action === "like" &&
          validatedData.action === "like" &&
          !reciprocalConnection.isDislike
        ) {
          // Update both connections to matched status
          await storage.updateSuiteMentorshipConnection(connection.id, {
            matched: true,
          });
          await storage.updateSuiteMentorshipConnection(
            reciprocalConnection.id,
            { matched: true },
          );
          isMatch = true;
          console.log(
            `Created mentorship match between users ${userId} and ${validatedData.targetUserId}`,
          );

          // AUTOMATIC ADDITIONAL CONNECTION DETECTION: Check for existing matches and add mentorship as additional connection
          try {
            const existingMatch = await storage.getMatchBetweenUsers(
              userId,
              validatedData.targetUserId,
            );

            if (existingMatch && existingMatch.metadata) {
              // Parse existing metadata
              const existingMetadata =
                typeof existingMatch.metadata === "string"
                  ? JSON.parse(existingMatch.metadata)
                  : existingMatch.metadata;

              // Check if this is a different connection type
              if (
                existingMetadata &&
                (existingMetadata.origin === "MEET" ||
                  (existingMetadata.origin === "SUITE" &&
                    existingMetadata.suiteType !== "mentorship"))
              ) {
                // Add mentorship as additional connection
                if (!existingMetadata.additionalConnections) {
                  existingMetadata.additionalConnections = [];
                }

                if (
                  !existingMetadata.additionalConnections.includes("mentorship")
                ) {
                  existingMetadata.additionalConnections.push("mentorship");
                  console.log(
                    `🔗 Adding mentorship to additionalConnections for existing match ${existingMatch.id} between users ${userId} and ${validatedData.targetUserId}`,
                  );

                  // Update existing match metadata
                  await storage.updateMatch(existingMatch.id, {
                    metadata: JSON.stringify(existingMetadata),
                  });
                }
              }
            } else if (!existingMatch) {
              // Create new match for chat functionality with mentorship metadata
              await storage.createMatch({
                userId1: userId,
                userId2: validatedData.targetUserId,
                matched: true,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "mentorship",
                  context: "professional",
                }),
              });
              console.log(
                `🔗 Created new match for mentorship connection between users ${userId} and ${validatedData.targetUserId}`,
              );
            }
          } catch (metadataError) {
            console.error(
              "Failed to process additional connection metadata for mentorship match:",
              metadataError,
            );
            // Don't fail the match if metadata update fails
          }

          // CRITICAL: Remove swipe history records for matched users to protect match integrity
          // This prevents either user from undoing their swipe and destroying the mentorship match
          try {
            await storage.removeMatchedUsersFromSwipeHistory(
              userId,
              validatedData.targetUserId,
            );
            console.log(
              `[MENTORSHIP-MATCH] Cleaned up swipe history for matched users: ${userId} ↔ ${validatedData.targetUserId}`,
            );
          } catch (historyError) {
            console.error(
              "Error cleaning up mentorship swipe history for matched users:",
              historyError,
            );
            // Don't fail the match if cleanup fails, but log it for debugging
          }
        }

        // Send WebSocket notification to target user
        const targetUserWs = connectedUsers.get(validatedData.targetUserId);
        if (targetUserWs && targetUserWs.readyState === 1) {
          // WebSocket.OPEN = 1
          const notificationData = {
            type: isMatch ? "mentorship_match" : "mentorship_like",
            targetUserId: validatedData.targetUserId, // CRITICAL: Add targetUserId for notification filtering
            connection: connection,
            fromUserId: userId,
            isMatch,
            timestamp: new Date().toISOString(),
          };

          targetUserWs.send(JSON.stringify(notificationData));
          console.log(
            `WebSocket notification sent to user ${validatedData.targetUserId} for mentorship connection`,
          );
        }

        res.status(201).json({
          connection: connection,
          isMatch,
          action: validatedData.action,
          message: isMatch
            ? "It's a mentorship match!"
            : validatedData.action === "like"
              ? "Connection request sent"
              : "Profile passed",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid request data", errors: error.errors });
        }
        console.error("Error creating mentorship connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get user's mentorship connections
  app.get(
    "/api/suite/connections/mentorship",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const connections = await storage.getUserMentorshipConnections(userId);

        res.json(connections);
      } catch (error) {
        console.error("Error fetching mentorship connections:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== JOB APPLICATIONS =====

  // Create job application
  app.post(
    "/api/suite/connections/jobs",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const validatedData = insertSuiteJobApplicationSchema.parse(req.body);

        console.log(
          `Creating job application for user ${userId}:`,
          validatedData,
        );

        // Verify user is authorized to create this application
        if (validatedData.userId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to create this application" });
        }

        // Check if application already exists
        const existingApplication = await storage.getSuiteJobApplication(
          userId,
          validatedData.targetProfileId,
        );

        if (existingApplication) {
          return res.status(409).json({
            message: "Application already exists",
            application: existingApplication,
          });
        }

        // Create the application
        const newApplication =
          await storage.createSuiteJobApplication(validatedData);

        // Send WebSocket notification to job poster
        const targetUserWs = connectedUsers.get(validatedData.targetUserId);
        if (targetUserWs && targetUserWs.readyState === 1) {
          // WebSocket.OPEN = 1
          const notificationData = {
            type: "job_application",
            targetUserId: validatedData.targetUserId, // CRITICAL: Add targetUserId for notification filtering
            application: newApplication,
            fromUserId: userId,
            timestamp: new Date().toISOString(),
          };

          targetUserWs.send(JSON.stringify(notificationData));
          console.log(
            `WebSocket notification sent to user ${validatedData.targetUserId} for job application`,
          );
        }

        res.status(201).json({
          application: newApplication,
          message: "Application submitted successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid request data", errors: error.errors });
        }
        console.error("Error creating job application:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get user's job applications
  app.get(
    "/api/suite/connections/jobs",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const applications = await storage.getUserJobApplications(userId);

        res.json(applications);
      } catch (error) {
        console.error("Error fetching job applications:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== CONNECTION RESPONSES =====

  // Handle networking connection response (accept/decline)
  app.post(
    "/api/suite/connections/networking/:connectionId/respond",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const connectionId = parseInt(req.params.connectionId);
        const { action } = req.body;

        if (!["accept", "decline"].includes(action)) {
          return res.status(400).json({ message: "Invalid action" });
        }

        // Get the connection
        const connection =
          await storage.getSuiteNetworkingConnectionById(connectionId);
        if (!connection) {
          return res.status(404).json({ message: "Connection not found" });
        }

        // Verify the target user is the current user
        if (connection.targetUserId !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this connection" });
        }

        let isMatch = false;
        if (action === "accept") {
          // Update connection to matched
          await storage.updateSuiteNetworkingConnection(connectionId, {
            matched: true,
          });

          // Also update the original connection from the other user
          const reciprocalConnection =
            await storage.getSuiteNetworkingConnection(
              connection.userId,
              connection.targetProfileId,
            );
          if (reciprocalConnection) {
            await storage.updateSuiteNetworkingConnection(
              reciprocalConnection.id,
              { matched: true },
            );
          }

          isMatch = true;

          // Fetch user data for both users in the match
          const acceptedByUser = await storage.getUser(userId);
          const requesterUser = await storage.getUser(connection.userId);

          // Send WebSocket notification to BOTH users in the match
          const timestamp = new Date().toISOString();

          // Send notification to the original requester
          const requesterWs = connectedUsers.get(connection.userId);
          if (requesterWs && requesterWs.readyState === 1) {
            const notificationData = {
              type: "networking_match",
              connection: connection,
              acceptedBy: userId,
              isMatch: true,
              timestamp: timestamp,
              matchedUserName: acceptedByUser?.fullName,
              matchedUserPhoto: acceptedByUser?.photoUrl,
              matchedUserProfession: acceptedByUser?.profession,
              matchedUserLocation: acceptedByUser?.location,
            };
            requesterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-MATCH] Sent networking match notification to requester (User ${connection.userId})`,
            );
          }

          // Send notification to the user who accepted (current user)
          const accepterWs = connectedUsers.get(userId);
          if (accepterWs && accepterWs.readyState === 1) {
            const notificationData = {
              type: "networking_match",
              connection: connection,
              acceptedBy: userId,
              isMatch: true,
              timestamp: timestamp,
              matchedUserName: requesterUser?.fullName,
              matchedUserPhoto: requesterUser?.photoUrl,
              matchedUserProfession: requesterUser?.profession,
              matchedUserLocation: requesterUser?.location,
            };
            accepterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-MATCH] Sent networking match notification to accepter (User ${userId})`,
            );
          }
        } else {
          // For decline, delete the connection
          await storage.deleteSuiteNetworkingConnectionById(connectionId);
        }

        res.json({
          success: true,
          isMatch,
          message:
            action === "accept" ? "Connection accepted" : "Connection declined",
        });
      } catch (error) {
        console.error("Error responding to networking connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Handle mentorship connection response (accept/decline)
  app.post(
    "/api/suite/connections/mentorship/:connectionId/respond",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const connectionId = parseInt(req.params.connectionId);
        const { action } = req.body;

        if (!["accept", "decline"].includes(action)) {
          return res.status(400).json({ message: "Invalid action" });
        }

        // Get the connection
        const connection =
          await storage.getSuiteMentorshipConnectionById(connectionId);
        if (!connection) {
          return res.status(404).json({ message: "Connection not found" });
        }

        // Verify the target user is the current user
        if (connection.targetUserId !== userId) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this connection" });
        }

        let isMatch = false;
        if (action === "accept") {
          // Update connection to matched
          await storage.updateSuiteMentorshipConnection(connectionId, {
            matched: true,
          });

          // Also update the original connection from the other user
          const reciprocalConnection =
            await storage.getSuiteMentorshipConnection(
              connection.userId,
              connection.targetProfileId,
            );
          if (reciprocalConnection) {
            await storage.updateSuiteMentorshipConnection(
              reciprocalConnection.id,
              { matched: true },
            );
          }

          isMatch = true;

          // Send WebSocket notification to BOTH users in the match
          const timestamp = new Date().toISOString();

          // Send notification to the original requester
          const requesterWs = connectedUsers.get(connection.userId);
          if (requesterWs && requesterWs.readyState === 1) {
            const notificationData = {
              type: "mentorship_match",
              connection: connection,
              acceptedBy: userId,
              isMatch: true,
              timestamp: timestamp,
            };
            requesterWs.send(JSON.stringify(notificationData));
            console.log(
              `WebSocket mentorship match notification sent to requester ${connection.userId}`,
            );
          }

          // Send notification to the user who accepted (current user)
          const accepterWs = connectedUsers.get(userId);
          if (accepterWs && accepterWs.readyState === 1) {
            const notificationData = {
              type: "mentorship_match",
              connection: connection,
              acceptedBy: userId,
              isMatch: true,
              timestamp: timestamp,
            };
            accepterWs.send(JSON.stringify(notificationData));
            console.log(
              `WebSocket mentorship match notification sent to accepter ${userId}`,
            );
          }
        } else {
          // For decline, delete the connection
          await storage.deleteSuiteMentorshipConnectionById(connectionId);
        }

        res.json({
          success: true,
          isMatch,
          message:
            action === "accept" ? "Connection accepted" : "Connection declined",
        });
      } catch (error) {
        console.error("Error responding to mentorship connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== EXPANDABLE MODAL RESPONSE ENDPOINTS =====

  // Handle expandable modal responses for networking connections
  app.post(
    "/api/suite/connections/networking/respond",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const currentUserId = req.user.id;
        const { requesterUserId, targetProfileId, action } = req.body;

        if (
          !requesterUserId ||
          !targetProfileId ||
          !["accept", "decline"].includes(action)
        ) {
          return res.status(400).json({ message: "Invalid request data" });
        }

        // Find the existing connection from the requester
        const existingConnection = await storage.getSuiteNetworkingConnection(
          requesterUserId,
          targetProfileId,
        );

        if (!existingConnection) {
          return res
            .status(404)
            .json({ message: "Connection request not found" });
        }

        // Verify the current user is the target of this connection
        if (existingConnection.targetUserId !== currentUserId) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this connection" });
        }

        let isMatch = false;
        if (action === "accept") {
          // Update the existing connection to matched
          await storage.updateSuiteNetworkingConnection(existingConnection.id, {
            matched: true,
          });
          isMatch = true;

          // AUTOMATIC ADDITIONAL CONNECTION DETECTION: Enhanced logic for networking response endpoint
          console.log(
            `🔍 [NETWORKING-RESPONSE] Checking for existing matches between users ${currentUserId} and ${requesterUserId}`,
          );
          const existingMatch = await storage.getMatchBetweenUsers(
            currentUserId,
            requesterUserId,
          );

          if (existingMatch && existingMatch.metadata) {
            console.log(
              `🔍 [NETWORKING-RESPONSE] Found existing match ${existingMatch.id}, checking metadata`,
            );
            // Parse existing metadata
            const existingMetadata =
              typeof existingMatch.metadata === "string"
                ? JSON.parse(existingMatch.metadata)
                : existingMatch.metadata;

            console.log(
              `🔍 [NETWORKING-RESPONSE] Current metadata: ${JSON.stringify(existingMetadata)}`,
            );

            // Check if this is a different connection type
            if (
              existingMetadata &&
              (existingMetadata.origin === "MEET" ||
                (existingMetadata.origin === "SUITE" &&
                  existingMetadata.suiteType !== "networking"))
            ) {
              console.log(
                `🔗 [NETWORKING-RESPONSE] Found different connection type, adding networking as additional connection`,
              );

              // Add networking as additional connection
              if (!existingMetadata.additionalConnections) {
                existingMetadata.additionalConnections = [];
              }

              if (
                !existingMetadata.additionalConnections.includes("networking")
              ) {
                existingMetadata.additionalConnections.push("networking");
                console.log(
                  `🔗 [NETWORKING-RESPONSE] Adding networking to additionalConnections for existing match ${existingMatch.id} between users ${currentUserId} and ${requesterUserId}`,
                );
                console.log(
                  `🔗 [NETWORKING-RESPONSE] New additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`,
                );

                // Update existing match metadata
                await storage.updateMatch(existingMatch.id, {
                  metadata: JSON.stringify(existingMetadata),
                });
                console.log(
                  `🔗 [NETWORKING-RESPONSE] Successfully updated existing match metadata`,
                );
              } else {
                console.log(
                  `🔗 [NETWORKING-RESPONSE] Networking already exists in additionalConnections`,
                );
              }
            } else {
              console.log(
                `🔗 [NETWORKING-RESPONSE] Same connection type or no metadata, no additional connection needed`,
              );
            }
          } else if (!existingMatch) {
            console.log(
              `🔗 [NETWORKING-RESPONSE] No existing match found, creating new match entry for messaging system`,
            );
            // Create a match entry for messaging system
            const matchData = {
              userId1: Math.min(currentUserId, requesterUserId),
              userId2: Math.max(currentUserId, requesterUserId),
              matched: true,
              isDislike: false,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: "networking",
                context: "professional",
              }),
            };
            const newMatch = await storage.createMatch(matchData);
            console.log(
              `🔗 [NETWORKING-RESPONSE] Created new match for networking connection:`,
              {
                id: newMatch.id,
                userId1: newMatch.userId1,
                userId2: newMatch.userId2,
                matched: newMatch.matched,
                metadata: newMatch.metadata,
              },
            );
          } else if (existingMatch && !existingMatch.matched) {
            // CRITICAL FIX: Update existing unmatched record to be a proper SUITE match
            console.log(
              `🔗 [NETWORKING-RESPONSE] Found existing unmatched record, updating to SUITE networking match`,
            );
            await storage.updateMatch(existingMatch.id, {
              matched: true,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: "networking",
                context: "professional",
              }),
            });
            console.log(
              `🔗 [NETWORKING-RESPONSE] Updated existing match ${existingMatch.id} for networking connection`,
            );
          } else {
            console.log(
              `🔍 [NETWORKING-RESPONSE] Existing matched record found, using existing match`,
            );
          }

          // Get user details for match notification
          const acceptedByUser = await storage.getUser(currentUserId);
          const requesterUser = await storage.getUser(requesterUserId);

          // Send WebSocket notification to the requester
          const requesterWs = connectedUsers.get(requesterUserId);
          if (requesterWs && requesterWs.readyState === 1) {
            const notificationData = {
              type: "networking_match",
              connection: {
                id: existingConnection.id,
                userId: existingConnection.userId,
                targetUserId: existingConnection.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: acceptedByUser?.fullName,
              matchedUserPhoto: acceptedByUser?.photoUrl,
              matchedUserProfession: acceptedByUser?.profession,
              matchedUserLocation: acceptedByUser?.location,
            };
            requesterWs.send(JSON.stringify(notificationData));
          }

          // Send WebSocket notification to the current user (accepter)
          const accepterWs = connectedUsers.get(currentUserId);
          if (accepterWs && accepterWs.readyState === 1) {
            const notificationData = {
              type: "networking_match",
              connection: {
                id: existingConnection.id,
                userId: existingConnection.userId,
                targetUserId: existingConnection.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: requesterUser?.fullName,
              matchedUserPhoto: requesterUser?.photoUrl,
              matchedUserProfession: requesterUser?.profession,
              matchedUserLocation: requesterUser?.location,
            };
            accepterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-MATCH] Sent networking match notification to accepter (User ${currentUserId})`,
            );
          }
        } else {
          // For decline, update the existing connection to pass/dislike
          await storage.updateSuiteNetworkingConnection(existingConnection.id, {
            action: "pass",
            isDislike: true,
            matched: false,
          });
        }

        res.json({
          success: true,
          isMatch,
          action,
          message:
            action === "accept" ? "Connection accepted" : "Connection declined",
        });
      } catch (error) {
        console.error("Error responding to networking connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Handle expandable modal responses for mentorship connections
  app.post(
    "/api/suite/connections/mentorship/respond",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const currentUserId = req.user.id;
        const { requesterUserId, targetProfileId, action } = req.body;

        if (
          !requesterUserId ||
          !targetProfileId ||
          !["accept", "decline"].includes(action)
        ) {
          return res.status(400).json({ message: "Invalid request data" });
        }

        // Find the existing connection from the requester
        const existingConnection = await storage.getSuiteMentorshipConnection(
          requesterUserId,
          targetProfileId,
        );

        if (!existingConnection) {
          return res
            .status(404)
            .json({ message: "Connection request not found" });
        }

        // Verify the current user is the target of this connection
        if (existingConnection.targetUserId !== currentUserId) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this connection" });
        }

        let isMatch = false;
        if (action === "accept") {
          // Update the existing connection to matched
          await storage.updateSuiteMentorshipConnection(existingConnection.id, {
            matched: true,
          });
          isMatch = true;

          // AUTOMATIC ADDITIONAL CONNECTION DETECTION: Check for existing matches and add mentorship as additional connection
          const existingMatch = await storage.getMatchBetweenUsers(
            currentUserId,
            requesterUserId,
          );
          let finalMatch;

          if (existingMatch) {
            // Parse existing metadata to check for additional connections
            try {
              let existingMetadata;

              if (existingMatch.metadata) {
                existingMetadata =
                  typeof existingMatch.metadata === "string"
                    ? JSON.parse(existingMatch.metadata)
                    : existingMatch.metadata;
              }

              if (existingMetadata) {
                // Check if this is a new connection type (SUITE-to-SUITE or MEET-to-SUITE)
                if (
                  (existingMetadata.origin === "SUITE" &&
                    existingMetadata.suiteType !== "mentorship") ||
                  existingMetadata.origin === "MEET"
                ) {
                  // Add to additionalConnections if not already present
                  if (!existingMetadata.additionalConnections) {
                    existingMetadata.additionalConnections = [];
                  }

                  if (
                    !existingMetadata.additionalConnections.includes(
                      "mentorship",
                    )
                  ) {
                    existingMetadata.additionalConnections.push("mentorship");
                    console.log(
                      `🔗 Adding mentorship to additionalConnections for existing match ${existingMatch.id} between users ${currentUserId} and ${requesterUserId}`,
                    );
                  }

                  // Update existing match with enhanced metadata
                  finalMatch = await storage.updateMatch(existingMatch.id, {
                    matched: true,
                    metadata: JSON.stringify(existingMetadata),
                  });
                } else {
                  // Update existing match with mentorship metadata (same origin or no existing metadata)
                  finalMatch = await storage.updateMatch(existingMatch.id, {
                    matched: true,
                    metadata: JSON.stringify({
                      origin: "SUITE",
                      suiteType: "mentorship",
                      context: "professional",
                    }),
                  });
                  console.log(
                    `🔗 Updated existing match ${existingMatch.id} with mentorship metadata`,
                  );
                }
              } else {
                // No existing metadata, add mentorship metadata
                finalMatch = await storage.updateMatch(existingMatch.id, {
                  matched: true,
                  metadata: JSON.stringify({
                    origin: "SUITE",
                    suiteType: "mentorship",
                    context: "professional",
                  }),
                });
                console.log(
                  `🔗 Added mentorship metadata to existing match ${existingMatch.id}`,
                );
              }
            } catch (parseError) {
              console.error("Failed to parse existing metadata:", parseError);
              // Fallback to updating with new mentorship metadata
              finalMatch = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "mentorship",
                  context: "professional",
                }),
              });
            }
          } else {
            // Create new match record for messaging system
            const matchData = {
              userId1: Math.min(currentUserId, requesterUserId),
              userId2: Math.max(currentUserId, requesterUserId),
              matched: true,
              isDislike: false,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: "mentorship",
                context: "professional",
              }),
            };
            finalMatch = await storage.createMatch(matchData);
            console.log(
              `🔗 Created new mentorship match between users ${currentUserId} and ${requesterUserId}`,
            );
          }

          // Get user details for match notification
          const acceptedByUser = await storage.getUser(currentUserId);
          const requesterUser = await storage.getUser(requesterUserId);

          // Send WebSocket notification to the requester
          const requesterWs = connectedUsers.get(requesterUserId);
          if (requesterWs && requesterWs.readyState === 1) {
            const notificationData = {
              type: "mentorship_match",
              connection: {
                id: existingConnection.id,
                userId: existingConnection.userId,
                targetUserId: existingConnection.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: acceptedByUser?.fullName,
              matchedUserPhoto: acceptedByUser?.photoUrl,
              matchedUserProfession: acceptedByUser?.profession,
              matchedUserLocation: acceptedByUser?.location,
            };
            requesterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-MATCH] Sent mentorship match notification to requester (User ${requesterUserId})`,
            );
          }

          // Send WebSocket notification to the current user (accepter)
          const accepterWs = connectedUsers.get(currentUserId);
          if (accepterWs && accepterWs.readyState === 1) {
            const notificationData = {
              type: "mentorship_match",
              connection: {
                id: existingConnection.id,
                userId: existingConnection.userId,
                targetUserId: existingConnection.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: requesterUser?.fullName,
              matchedUserPhoto: requesterUser?.photoUrl,
              matchedUserProfession: requesterUser?.profession,
              matchedUserLocation: requesterUser?.location,
            };
            accepterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-MATCH] Sent mentorship match notification to accepter (User ${currentUserId})`,
            );
          }
        } else {
          // For decline, update the existing connection to pass/dislike
          await storage.updateSuiteMentorshipConnection(existingConnection.id, {
            action: "pass",
            isDislike: true,
            matched: false,
          });
        }

        res.json({
          success: true,
          isMatch,
          action,
          message:
            action === "accept" ? "Connection accepted" : "Connection declined",
        });
      } catch (error) {
        console.error("Error responding to mentorship connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== CONNECTION COUNTS =====

  // Get connection counts for user
  app.get(
    "/api/suite/connections/counts",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

        // Get all connection types
        const [networkingConnections, mentorshipConnections, jobApplications] =
          await Promise.all([
            storage.getUserNetworkingConnections(userId),
            storage.getUserMentorshipConnections(userId),
            storage.getUserJobApplications(userId),
          ]);

        // Count matches and pending
        const networkingMatches = networkingConnections.filter(
          (c) => c.matched,
        ).length;
        const networkingPending = networkingConnections.filter(
          (c) => !c.matched && c.action === "like",
        ).length;

        const mentorshipMatches = mentorshipConnections.filter(
          (c) => c.matched,
        ).length;
        const mentorshipPending = mentorshipConnections.filter(
          (c) => !c.matched && c.action === "like",
        ).length;

        const jobApplicationsCount = jobApplications.length;
        const jobApplicationsPending = jobApplications.length; // Since we don't have status column yet

        res.json({
          networking: {
            matches: networkingMatches,
            pending: networkingPending,
            total: networkingConnections.length,
          },
          mentorship: {
            matches: mentorshipMatches,
            pending: mentorshipPending,
            total: mentorshipConnections.length,
          },
          jobs: {
            applications: jobApplicationsCount,
            pending: jobApplicationsPending,
            total: jobApplications.length,
          },
        });
      } catch (error) {
        console.error("Error fetching connection counts:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );
}

/**
 * Helper function to get user's networking profile ID
 */
async function getUserNetworkingProfileId(
  userId: number,
): Promise<number | null> {
  try {
    const profile = await storage.getSuiteNetworkingProfile(userId);
    return profile?.id || null;
  } catch (error) {
    console.error("Error getting user networking profile ID:", error);
    return null;
  }
}

/**
 * Helper function to get user's mentorship profile ID
 */
async function getUserMentorshipProfileId(
  userId: number,
): Promise<number | null> {
  try {
    const profile = await storage.getSuiteMentorshipProfile(userId);
    return profile?.id || null;
  } catch (error) {
    console.error("Error getting user mentorship profile ID:", error);
    return null;
  }
}
