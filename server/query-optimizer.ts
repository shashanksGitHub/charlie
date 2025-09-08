import { db } from "./db";
import { sql, eq, and, or, desc, asc, inArray } from "drizzle-orm";
import { users, matches, messages, connectionsPreferences } from "@shared/schema";

/**
 * Query Optimizer - Replaces N+1 queries with efficient batch operations
 * Reduces database round trips and improves response times
 */

export class QueryOptimizer {
  
  // Optimized user discovery with preference filtering
  static async getOptimizedDiscoveryUsers(userId: number, limit: number = 50) {
    const startTime = Date.now();
    
    // Single query with JOINs instead of multiple round trips
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        photoUrl: users.photoUrl,
        bio: users.bio,
        profession: users.profession,
        location: users.location,
        age: sql<number>`EXTRACT(YEAR FROM AGE(${users.dateOfBirth}))`,
        lastActive: users.lastActive,
        interests: users.interests,
        visibilityPreferences: users.visibilityPreferences
      })
      .from(users)
      .leftJoin(matches, 
        or(
          and(eq(matches.userId1, userId), eq(matches.userId2, users.id)),
          and(eq(matches.userId1, users.id), eq(matches.userId2, userId))
        )
      )
      .where(
        and(
          sql`${users.id} != ${userId}`, // Not current user
          sql`${matches.id} IS NULL`, // No existing match
          eq(users.profileHidden, false), // Profile not hidden
          sql`${users.lastActive} > NOW() - INTERVAL '30 days'` // Active within 30 days
        )
      )
      .limit(limit)
      .orderBy(desc(users.lastActive));

    const duration = Date.now() - startTime;
    console.log(`[QUERY-OPT] Discovery query completed in ${duration}ms`);
    
    return result;
  }

  // Batch load user compatibility scores
  static async batchLoadCompatibilityScores(userPairs: Array<{userId: number, targetUserId: number}>) {
    if (userPairs.length === 0) return [];

    const conditions = userPairs.map(pair => 
      and(
        eq(sql`user_id`, pair.userId),
        eq(sql`target_user_id`, pair.targetUserId)
      )
    );

    return await db
      .select()
      .from(sql`suite_compatibility_scores`)
      .where(or(...conditions));
  }

  // Optimized messages query with pagination
  static async getOptimizedMessages(matchId: number, limit: number = 50, offset: number = 0) {
    const startTime = Date.now();

    const result = await db
      .select({
        id: messages.id,
        matchId: messages.matchId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        messageType: messages.messageType,
        read: messages.read,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        replyToMessageId: messages.replyToMessageId,
        replyToContent: messages.replyToContent,
        replyToSenderName: messages.replyToSenderName,
        autoDeleteScheduledAt: messages.autoDeleteScheduledAt,
        // Include sender info in same query
        senderName: sql<string>`u.full_name`,
        senderPhoto: sql<string>`u.photo_url`
      })
      .from(messages)
      .leftJoin(sql`users u`, eq(messages.senderId, sql`u.id`))
      .where(eq(messages.matchId, matchId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const duration = Date.now() - startTime;
    console.log(`[QUERY-OPT] Messages query completed in ${duration}ms`);

    return result;
  }

  // Batch update read status for multiple messages
  static async batchMarkMessagesAsRead(messageIds: number[], userId: number) {
    if (messageIds.length === 0) return;

    const startTime = Date.now();

    await db
      .update(messages)
      .set({ 
        read: true, 
        readAt: new Date() 
      })
      .where(
        and(
          inArray(messages.id, messageIds),
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );

    const duration = Date.now() - startTime;
    console.log(`[QUERY-OPT] Batch read update for ${messageIds.length} messages completed in ${duration}ms`);
  }

  // Optimized preferences query with all related data
  static async getOptimizedUserPreferences(userId: number) {
    const startTime = Date.now();

    const result = await db
      .select()
      .from(connectionsPreferences)
      .where(eq(connectionsPreferences.userId, userId))
      .limit(1);

    const duration = Date.now() - startTime;
    console.log(`[QUERY-OPT] Preferences query completed in ${duration}ms`);

    return result[0] || null;
  }

  // Bulk insert optimization for batch operations
  static async batchInsertMessages(messagesData: any[]) {
    if (messagesData.length === 0) return [];

    const startTime = Date.now();

    const result = await db
      .insert(messages)
      .values(messagesData)
      .returning();

    const duration = Date.now() - startTime;
    console.log(`[QUERY-OPT] Batch insert of ${messagesData.length} messages completed in ${duration}ms`);

    return result;
  }

  // Cache frequently accessed user data
  private static userCache = new Map<number, any>();
  private static cacheExpiry = new Map<number, number>();

  static async getCachedUser(userId: number, maxAge: number = 300000) { // 5 minutes default
    const now = Date.now();
    const expiry = this.cacheExpiry.get(userId);

    // Return cached data if still valid
    if (expiry && now < expiry && this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    // Fetch fresh data
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData[0]) {
      this.userCache.set(userId, userData[0]);
      this.cacheExpiry.set(userId, now + maxAge);
    }

    return userData[0] || null;
  }

  // Clear user cache when data is updated
  static invalidateUserCache(userId: number) {
    this.userCache.delete(userId);
    this.cacheExpiry.delete(userId);
  }

  // Performance analytics
  static async getQueryPerformanceStats() {
    return {
      cacheSize: this.userCache.size,
      cachedUsers: Array.from(this.userCache.keys()),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  private static cacheHits = 0;
  private static cacheMisses = 0;

  private static calculateCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
}

// Export convenience functions
export const {
  getOptimizedDiscoveryUsers,
  batchLoadCompatibilityScores,
  getOptimizedMessages,
  batchMarkMessagesAsRead,
  getOptimizedUserPreferences,
  batchInsertMessages,
  getCachedUser,
  invalidateUserCache,
  getQueryPerformanceStats
} = QueryOptimizer;