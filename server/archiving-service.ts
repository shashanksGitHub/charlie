/**
 * Comprehensive Archiving Service for CHARLEY
 * 
 * This service handles:
 * - Match archiving during unmatch operations
 * - Message archiving to preserve conversation history
 * - User archiving for security and audit purposes
 * - Complete audit trail maintenance
 */

import { db } from "./db";
import { 
  matches as matchesTable, 
  messages as messagesTable, 
  users as usersTable,
  archivedMatches,
  archivedMessages,
  archivedUsers,
  type InsertArchivedMatch,
  type InsertArchivedMessage,
  type InsertArchivedUser
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class ArchivingService {
  /**
   * Archive a match and all its associated messages when users unmatch
   */
  static async archiveMatchWithMessages(
    matchId: number,
    archivedByUserId: number,
    reason: 'unmatch' | 'user_deletion' | 'admin_action'
  ): Promise<{ archivedMatchId: number; messageCount: number }> {
    try {
      console.log(`[ARCHIVE] Starting archival of match ${matchId} by user ${archivedByUserId}, reason: ${reason}`);
      
      // Step 1: Get the match data before deletion
      const matchData = await db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.id, matchId))
        .limit(1);
      
      if (matchData.length === 0) {
        throw new Error(`Match ${matchId} not found`);
      }
      
      const match = matchData[0];
      
      // Step 2: Get all messages for this match
      const messages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.matchId, matchId));
      
      console.log(`[ARCHIVE] Found ${messages.length} messages to archive for match ${matchId}`);
      
      // Step 3: Archive the match first
      const archivedMatchData: InsertArchivedMatch = {
        originalMatchId: match.id,
        userId1: match.userId1,
        userId2: match.userId2,
        matched: match.matched,
        isDislike: match.isDislike,
        hasUnreadMessages1: match.hasUnreadMessages1,
        hasUnreadMessages2: match.hasUnreadMessages2,
        notifiedUser1: match.notifiedUser1,
        notifiedUser2: match.notifiedUser2,
        lastMessageAt: match.lastMessageAt,
        matchCreatedAt: match.createdAt,
        archivedReason: reason,
        archivedByUserId: archivedByUserId,
        messageCount: messages.length
      };
      
      const archivedMatchResult = await db
        .insert(archivedMatches)
        .values(archivedMatchData)
        .returning({ id: archivedMatches.id });
      
      const archivedMatchId = archivedMatchResult[0].id;
      console.log(`[ARCHIVE] Created archived match record ${archivedMatchId}`);
      
      // Step 4: Archive all messages
      if (messages.length > 0) {
        const archivedMessagesData: InsertArchivedMessage[] = messages.map(message => ({
          originalMessageId: message.id,
          originalMatchId: matchId,
          archivedMatchId: archivedMatchId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          encryptedContent: message.encryptedContent || undefined,
          iv: message.iv || undefined,
          messageType: message.messageType || 'text',
          audioUrl: message.audioUrl || undefined,
          audioDuration: message.audioDuration || undefined,
          read: message.read,
          readAt: message.readAt,
          messageCreatedAt: message.createdAt,
          archivedReason: reason,
          replyToMessageId: message.replyToMessageId || undefined,
          replyToContent: message.replyToContent || undefined,
          replyToSenderName: message.replyToSenderName || undefined,
          replyToIsCurrentUser: message.replyToIsCurrentUser || undefined,
          autoDeleteScheduledAt: message.autoDeleteScheduledAt,
          autoDeleteModeWhenSent: message.autoDeleteModeWhenSent || undefined,
          deletedForUserId: message.deletedForUserId || undefined
        }));
        
        await db().insert(archivedMessages).values(archivedMessagesData);
        console.log(`[ARCHIVE] Archived ${messages.length} messages`);
      }
      
      console.log(`[ARCHIVE] Successfully archived match ${matchId} with ${messages.length} messages`);
      
      return {
        archivedMatchId: archivedMatchId,
        messageCount: messages.length
      };
      
    } catch (error) {
      console.error(`[ARCHIVE] Failed to archive match ${matchId}:`, error);
      throw error;
    }
  }
  
  /**
   * Archive a user account when they delete their account or for security purposes
   */
  static async archiveUser(
    userId: number,
    reason: 'account_deletion' | 'admin_action' | 'policy_violation',
    archivedByUserId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ archivedUserId: number; totalMatches: number; totalMessages: number }> {
    try {
      console.log(`[ARCHIVE] Starting user archival for user ${userId}, reason: ${reason}`);
      
      // Step 1: Get user data
      const userData = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      
      if (userData.length === 0) {
        throw new Error(`User ${userId} not found`);
      }
      
      const user = userData[0];
      
      // Step 2: Calculate historical statistics
      const matchCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(matchesTable)
        .where(
          and(
            sql`(${matchesTable.userId1} = ${userId} OR ${matchesTable.userId2} = ${userId})`,
            eq(matchesTable.matched, true)
          )
        );
      
      const messageCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(messagesTable)
        .where(eq(messagesTable.senderId, userId));
      
      const totalMatches = matchCount[0]?.count || 0;
      const totalMessages = messageCount[0]?.count || 0;
      
      console.log(`[ARCHIVE] User ${userId} statistics: ${totalMatches} matches, ${totalMessages} messages`);
      
      // Step 3: Archive the user
      const archivedUserData: InsertArchivedUser = {
        originalUserId: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        gender: user.gender,
        location: user.location,
        countryOfOrigin: user.countryOfOrigin || undefined,
        bio: user.bio || undefined,
        profession: user.profession || undefined,
        ethnicity: user.ethnicity || undefined,
        secondaryTribe: user.secondaryTribe || undefined,
        religion: user.religion || undefined,
        photoUrl: user.photoUrl || undefined,
        showProfilePhoto: user.showProfilePhoto || false,
        dateOfBirth: user.dateOfBirth,
        relationshipStatus: user.relationshipStatus || undefined,
        relationshipGoal: user.relationshipGoal || undefined,
        interests: user.interests || undefined,
        visibilityPreferences: user.visibilityPreferences || undefined,
        verifiedByPhone: user.verifiedByPhone || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        profileHidden: user.profileHidden || false,
        ghostMode: user.ghostMode || false,
        isOnline: user.isOnline || false,
        lastActive: user.lastActive,
        userCreatedAt: user.createdAt,
        archivedReason: reason,
        archivedByUserId: archivedByUserId || userId,
        totalMatches: totalMatches,
        totalMessages: totalMessages,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined
      };
      
      const archivedUserResult = await db
        .insert(archivedUsers)
        .values(archivedUserData)
        .returning({ id: archivedUsers.id });
      
      const archivedUserId = archivedUserResult[0].id;
      
      console.log(`[ARCHIVE] Successfully archived user ${userId} as record ${archivedUserId}`);
      
      return {
        archivedUserId: archivedUserId,
        totalMatches: totalMatches,
        totalMessages: totalMessages
      };
      
    } catch (error) {
      console.error(`[ARCHIVE] Failed to archive user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get archived match history for a user (admin/support function)
   */
  static async getArchivedMatchHistory(userId: number): Promise<any[]> {
    try {
      const archivedMatchHistory = await db
        .select()
        .from(archivedMatches)
        .where(
          sql`(${archivedMatches.userId1} = ${userId} OR ${archivedMatches.userId2} = ${userId})`
        )
        .orderBy(sql`${archivedMatches.archivedAt} DESC`);
      
      return archivedMatchHistory;
    } catch (error) {
      console.error(`[ARCHIVE] Failed to get archived match history for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get archived user record (admin/support function)
   */
  static async getArchivedUser(originalUserId: number): Promise<any | null> {
    try {
      const archivedUser = await db
        .select()
        .from(archivedUsers)
        .where(eq(archivedUsers.originalUserId, originalUserId))
        .orderBy(sql`${archivedUsers.archivedAt} DESC`)
        .limit(1);
      
      return archivedUser[0] || null;
    } catch (error) {
      console.error(`[ARCHIVE] Failed to get archived user for ID ${originalUserId}:`, error);
      throw error;
    }
  }
  
  /**
   * Clean up archived data older than specified retention period (admin function)
   */
  static async cleanupOldArchives(retentionDays: number = 2555): Promise<{ deletedMatches: number; deletedMessages: number; deletedUsers: number }> {
    try {
      console.log(`[ARCHIVE] Starting cleanup of archives older than ${retentionDays} days`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // Delete old archived messages first (due to foreign key constraints)
      const deletedMessages = await db
        .delete(archivedMessages)
        .where(sql`${archivedMessages.archivedAt} < ${cutoffDate}`);
      
      // Delete old archived matches
      const deletedMatches = await db
        .delete(archivedMatches)
        .where(sql`${archivedMatches.archivedAt} < ${cutoffDate}`);
      
      // Delete old archived users (be very careful with this)
      const deletedUsers = await db
        .delete(archivedUsers)
        .where(sql`${archivedUsers.archivedAt} < ${cutoffDate}`);
      
      console.log(`[ARCHIVE] Cleanup completed: ${deletedMatches} matches, ${deletedMessages} messages, ${deletedUsers} users`);
      
      return {
        deletedMatches: deletedMatches.rowCount || 0,
        deletedMessages: deletedMessages.rowCount || 0,
        deletedUsers: deletedUsers.rowCount || 0
      };
      
    } catch (error) {
      console.error(`[ARCHIVE] Failed to cleanup old archives:`, error);
      throw error;
    }
  }
}

export default ArchivingService;