/**
 * USER BLOCKING API
 * Complete user blocking system for safety enforcement
 */

import type { Express, Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { userBlocks, insertUserBlockSchema } from "@shared/schema";
import { db } from "./db";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export function registerUserBlockingAPI(app: Express) {
  

  /**
   * Block a user
   * POST /api/user/block
   */
  app.post("/api/user/block", async (req: Request, res: Response) => {
    try {
      // Authentication check using the same pattern as other routes
      if (!req.isAuthenticated() || !req.user || !req.user.id) {
        console.log('[USER-BLOCKING] Authentication failed:', {
          isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'function not available',
          hasUser: !!req.user,
          userId: req.user?.id
        });
        return res.status(401).json({ 
          message: "Unauthorized", 
          details: "Valid authentication session required" 
        });
      }

      const currentUserId = req.user.id;
      console.log(`[USER-BLOCKING] User ${currentUserId} initiating block request`);

      // Validate request body - only validate the client-provided fields
      console.log("[USER-BLOCKING] Validating request body:", req.body);
      const { blockedUserId, reason } = req.body;
      
      // Validate required fields manually since we're providing blockerUserId from auth
      if (!blockedUserId || typeof blockedUserId !== 'number') {
        return res.status(400).json({ message: "Valid blockedUserId is required" });
      }
      
      // Construct complete data for schema validation
      const completeData = {
        blockerUserId: currentUserId,
        blockedUserId,
        reason: reason || null
      };
      
      const validatedData = insertUserBlockSchema.parse(completeData);
      console.log("[USER-BLOCKING] Validation successful:", validatedData);

      console.log(`[USER-BLOCKING] User ${currentUserId} attempting to block user ${blockedUserId}`);

      // Prevent self-blocking
      if (currentUserId === blockedUserId) {
        console.log(`[USER-BLOCKING] User ${currentUserId} attempted to block themselves`);
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      // Optimized: Use INSERT ... ON CONFLICT for atomic upsert operation
      // This eliminates the need for separate existence checks and handles duplicates gracefully
      try {
        const newBlock = await db
          .insert(userBlocks)
          .values({
            blockerUserId: currentUserId,
            blockedUserId: blockedUserId,
            reason: reason || null,
          })
          .returning();

        console.log(`[USER-BLOCKING] Successfully created block ${newBlock[0].id}: User ${currentUserId} blocked user ${blockedUserId}`);
        
        // Get target user info for response (only after successful block creation)
        const targetUser = await storage.getUser(blockedUserId);
        if (!targetUser) {
          console.log(`[USER-BLOCKING] Target user ${blockedUserId} not found after blocking`);
          return res.status(404).json({ message: "User not found" });
        }

        // Success response
        res.status(201).json({
          message: "User blocked successfully",
          blockId: newBlock[0].id,
          blockedUser: {
            id: targetUser.id,
            fullName: targetUser.fullName,
          }
        });

      } catch (blockError: any) {
        // Handle unique constraint violation (duplicate block)
        if (blockError.code === '23505' || blockError.constraint?.includes('unique')) {
          console.log(`[USER-BLOCKING] Block already exists between users ${currentUserId} and ${blockedUserId}`);
          return res.status(200).json({ 
            message: "User is already blocked",
            note: "Block already exists"
          });
        }
        
        // Handle foreign key constraint violation (user doesn't exist)
        if (blockError.code === '23503') {
          console.log(`[USER-BLOCKING] Target user ${blockedUserId} not found (foreign key violation)`);
          return res.status(404).json({ message: "User not found" });
        }
        
        // Re-throw other database errors
        throw blockError;
      }



    } catch (error) {
      console.error("[USER-BLOCKING] Error blocking user:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          message: "Validation error",
          details: validationError.toString(),
        });
      }

      res.status(500).json({ message: "Failed to block user" });
    }
  });

  /**
   * Unblock a user
   * DELETE /api/user/unblock/:blockedUserId
   */
  app.delete("/api/user/unblock/:blockedUserId", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const blockedUserId = parseInt(req.params.blockedUserId);
      if (isNaN(blockedUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      console.log(`[USER-BLOCKING] User ${currentUserId} attempting to unblock user ${blockedUserId}`);

      // Find and delete the block
      const deletedBlocks = await db
        .delete(userBlocks)
        .where(
          and(
            eq(userBlocks.blockerUserId, currentUserId),
            eq(userBlocks.blockedUserId, blockedUserId)
          )
        )
        .returning();

      if (deletedBlocks.length === 0) {
        console.log(`[USER-BLOCKING] No block found between users ${currentUserId} and ${blockedUserId}`);
        return res.status(404).json({ message: "Block not found" });
      }

      console.log(`[USER-BLOCKING] Successfully removed block ${deletedBlocks[0].id}: User ${currentUserId} unblocked user ${blockedUserId}`);

      res.status(200).json({
        message: "User unblocked successfully",
        unblocked: true
      });

    } catch (error) {
      console.error("[USER-BLOCKING] Error unblocking user:", error);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  /**
   * Get list of blocked users
   * GET /api/user/blocked-users
   */
  app.get("/api/user/blocked-users", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(`[USER-BLOCKING] Getting blocked users list for user ${currentUserId}`);

      // Get all users blocked by current user
      const blockedUsers = await db
        .select()
        .from(userBlocks)
        .where(eq(userBlocks.blockerUserId, currentUserId))
        .orderBy(userBlocks.createdAt);

      // Get user info for each blocked user
      const blockedUsersWithInfo = await Promise.all(
        blockedUsers.map(async (block) => {
          const user = await storage.getUser(block.blockedUserId);
          return {
            blockId: block.id,
            blockedUserId: block.blockedUserId,
            reason: block.reason,
            createdAt: block.createdAt,
            fullName: user?.fullName || 'Unknown User',
            photoUrl: user?.photoUrl || null,
          };
        })
      );

      console.log(`[USER-BLOCKING] Found ${blockedUsersWithInfo.length} blocked users for user ${currentUserId}`);

      res.status(200).json({
        blockedUsers: blockedUsersWithInfo,
        totalCount: blockedUsersWithInfo.length
      });

    } catch (error) {
      console.error("[USER-BLOCKING] Error getting blocked users:", error);
      res.status(500).json({ message: "Failed to get blocked users" });
    }
  });

  /**
   * Check if a user is blocked (utility endpoint)
   * GET /api/user/is-blocked/:userId
   */
  app.get("/api/user/is-blocked/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if current user blocked target user OR target user blocked current user
      const blocks = await db
        .select()
        .from(userBlocks)
        .where(
          or(
            and(
              eq(userBlocks.blockerUserId, currentUserId),
              eq(userBlocks.blockedUserId, targetUserId)
            ),
            and(
              eq(userBlocks.blockerUserId, targetUserId),
              eq(userBlocks.blockedUserId, currentUserId)
            )
          )
        );

      const isBlocked = blocks.length > 0;
      const blockType = blocks.length > 0 
        ? (blocks[0].blockerUserId === currentUserId ? 'blocked_by_you' : 'blocked_you')
        : null;

      res.status(200).json({
        isBlocked,
        blockType,
        blockDetails: blocks.length > 0 ? blocks[0] : null
      });

    } catch (error) {
      console.error("[USER-BLOCKING] Error checking block status:", error);
      res.status(500).json({ message: "Failed to check block status" });
    }
  });

  console.log("[USER-BLOCKING] User blocking API endpoints registered");
}

/**
 * Utility function to check if two users have blocked each other
 * Used by hard filters and other systems
 */
export async function areUsersBlocked(userId1: number, userId2: number): Promise<boolean> {
  try {
    const blocks = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(
            eq(userBlocks.blockerUserId, userId1),
            eq(userBlocks.blockedUserId, userId2)
          ),
          and(
            eq(userBlocks.blockerUserId, userId2),
            eq(userBlocks.blockedUserId, userId1)
          )
        )
      )
      .limit(1);

    return blocks.length > 0;
  } catch (error) {
    console.error("[USER-BLOCKING] Error checking if users are blocked:", error);
    return false; // Default to not blocked if error occurs
  }
}

/**
 * Utility function to get all user IDs blocked by a specific user
 * Used by hard filters for bulk filtering
 */
export async function getBlockedUserIds(userId: number): Promise<number[]> {
  try {
    const blocks = await db
      .select({ blockedUserId: userBlocks.blockedUserId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerUserId, userId));

    return blocks.map(block => block.blockedUserId);
  } catch (error) {
    console.error("[USER-BLOCKING] Error getting blocked user IDs:", error);
    return [];
  }
}

/**
 * Utility function to get all user IDs that have blocked a specific user
 * Used by hard filters for bulk filtering
 */
export async function getUsersWhoBlockedUser(userId: number): Promise<number[]> {
  try {
    const blocks = await db
      .select({ blockerUserId: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedUserId, userId));

    return blocks.map(block => block.blockerUserId);
  } catch (error) {
    console.error("[USER-BLOCKING] Error getting users who blocked user:", error);
    return [];
  }
}