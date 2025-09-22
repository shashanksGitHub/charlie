import {
  users,
  userPreferences,
  matches,
  messages,
  userInterests,
  globalInterests,
  globalDealBreakers,
  globalTribes,
  globalReligions,
  typingStatus,
  videoCalls,
  verificationCodes,
  userPhotos,
  messageReactions,
  userMatchSettings,
  suiteJobProfiles,
  suiteMentorshipProfiles,
  suiteNetworkingProfiles,
  suiteProfileSettings,
  suiteFieldVisibility,
  suiteNetworkingConnections,
  suiteMentorshipConnections,
  suiteJobApplications,
  suiteCompatibilityScores,
  suiteMentorshipCompatibilityScores,
  swipeHistory,
  professionalReviews,
  connectionsPreferences,
  blockedPhoneNumbers,
  userReportStrikes,
  userBlocks,
  subscriptions,
  paymentMethods,
  paymentHistory,
  regionalPricing,
  promotionalCodes,
  promotionalCodeUsage,
  kwameConversations,
  type User,
  type UserPreference,
  type Match,
  type Message,
  type UserInterest,
  type GlobalInterest,
  type GlobalDealBreaker,
  type GlobalTribe,
  type GlobalReligion,
  type VideoCall,
  type TypingStatus,
  type VerificationCode,
  type UserPhoto,
  type MessageReaction,
  type UserMatchSettings,
  type InsertUser,
  type InsertGlobalInterest,
  type InsertGlobalDealBreaker,
  type InsertGlobalTribe,
  type InsertGlobalReligion,
  type UserProfile,
  type UserPreferences,
  type InsertMatch,
  type InsertMessage,
  type InsertUserInterest,
  type InsertTypingStatus,
  type InsertVideoCall,
  type InsertVerificationCode,
  type InsertUserPhoto,
  type InsertMessageReaction,
  type InsertUserMatchSettings,
  type SuiteProfileSettings,
  type SuiteJobProfile,
  type SuiteMentorshipProfile,
  type SuiteNetworkingProfile,
  type InsertSuiteProfileSettings,
  type InsertSuiteJobProfile,
  type InsertSuiteMentorshipProfile,
  type InsertSuiteNetworkingProfile,
  type SuiteFieldVisibility,
  type InsertSuiteFieldVisibility,
  type SuiteNetworkingConnection,
  type SuiteMentorshipConnection,
  type SuiteJobApplication,
  type InsertSuiteNetworkingConnection,
  type InsertSuiteMentorshipConnection,
  type InsertSuiteJobApplication,
  type SwipeHistory,
  type InsertSwipeHistory,
  type ConnectionsPreferences,
  type InsertConnectionsPreferences,
  type KwameConversation,
  type InsertKwameConversation,
  type BlockedPhoneNumber,
  type InsertBlockedPhoneNumber,
  type UserReportStrike,
  type InsertUserReportStrike,
  type Subscription,
  type PaymentMethod,
  type PaymentHistory,
  type RegionalPricing,
  type PromotionalCode,
  type PromotionalCodeUsage,
  type InsertSubscription,
  type InsertPaymentMethod,
  type InsertPaymentHistory,
  type InsertRegionalPricing,
  type InsertPromotionalCode,
  type InsertPromotionalCodeUsage,
  type ProfessionalReview,
  type InsertProfessionalReview,
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import {
  eq,
  and,
  or,
  ne,
  desc,
  asc,
  lt,
  sql,
  count,
  notInArray,
  inArray,
  isNull,
  notExists,
} from "drizzle-orm";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

// Storage interface definition
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserProfile(
    id: number,
    profile: Partial<UserProfile>,
  ): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  cleanAllUsers(): Promise<void>;

  // User photos operations
  getUserPhotos(userId: number): Promise<UserPhoto[]>;
  addUserPhoto(photo: InsertUserPhoto): Promise<UserPhoto>;
  deleteUserPhoto(id: number): Promise<void>;

  // Phone verification
  createVerificationCode(
    verificationData: InsertVerificationCode,
  ): Promise<VerificationCode>;
  getVerificationCode(
    phoneNumber: string,
    code: string,
  ): Promise<VerificationCode | undefined>;
  deleteVerificationCode(id: number): Promise<void>;
  deleteExpiredVerificationCodes(): Promise<void>;

  // Blocked phone numbers for age compliance
  addBlockedPhoneNumber(
    phoneNumber: string,
    reason: string,
    metadata?: string,
  ): Promise<BlockedPhoneNumber>;
  isPhoneNumberBlocked(phoneNumber: string): Promise<boolean>;
  getBlockedPhoneNumber(
    phoneNumber: string,
  ): Promise<BlockedPhoneNumber | undefined>;
  isEmailInBlockedPhoneNumbers(
    email: string,
  ): Promise<BlockedPhoneNumber | undefined>;

  // Preferences operations
  getUserPreferences(userId: number): Promise<UserPreference | undefined>;
  batchGetUserPreferences(userIds: number[]): Promise<UserPreference[]>;
  createUserPreferences(
    preferences: UserPreferences & { userId: number },
  ): Promise<UserPreference>;
  updateUserPreferences(
    id: number,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreference | undefined>;
  updateUserLocationPreference(userId: number, location: string): Promise<void>;
  updateUserPoolCountry(
    userId: number,
    poolCountry: string,
  ): Promise<UserPreference | undefined>;

  // Match operations
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchById(id: number): Promise<Match | undefined>;
  getMatchesByUserId(userId: number): Promise<Match[]>;
  getMeetMatchesByUserId(userId: number): Promise<Match[]>; // Get only MEET matches (excludes SUITE)
  getMatchesSince(userId: number, since: Date): Promise<Match[]>; // New method to get matches since a timestamp
  updateMatch(
    id: number,
    updates: Partial<{ matched: boolean; isDislike: boolean }>,
  ): Promise<Match | undefined>;
  deleteMatch(id: number): Promise<void>;
  removeLikeOrDislike(userId: number, targetUserId: number): Promise<void>; // New method for undo swipe functionality
  getMatchBetweenUsers(
    userId1: number,
    userId2: number,
  ): Promise<Match | undefined>; // Get match between two users
  getAllMatchesBetweenUsers(userId1: number, userId2: number): Promise<Match[]>; // Get ALL matches between two users (for multiple badges)
  updateMatchStatus(
    matchId: number,
    matched: boolean,
  ): Promise<Match | undefined>; // Update match status
  getUnreadMessageCount(userId: number): Promise<number>;
  getUnreadConversationsCount(userId: number): Promise<number>;
  markMatchUnread(
    matchId: number,
    receiverId: number,
  ): Promise<Match | undefined>;
  markMatchRead(matchId: number, userId: number): Promise<Match | undefined>;
  markMatchNotified(
    matchId: number,
    userId: number,
  ): Promise<Match | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessageById(id: number): Promise<Message | undefined>;
  getMessagesByMatchId(matchId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  findRecentDuplicateMessages(params: {
    matchId: number;
    senderId: number;
    content: string;
    messageType: string;
    since: string;
  }): Promise<Message[]>;
  getMessageCountForMatch(matchId: number): Promise<number>;
  // Temporarily removed to fix type errors
  // findCaseInsensitiveDuplicates(params: { matchId: number; senderId: number; content: string; messageType: string; since: string }): Promise<Message[]>;

  // User interests operations
  addUserInterest(interest: InsertUserInterest): Promise<UserInterest>;
  getUserInterests(userId: number): Promise<UserInterest[]>;
  deleteAllUserInterests(userId: number): Promise<void>;
  updateUserInterestsVisibility(
    userId: number,
    showOnProfile: boolean,
  ): Promise<void>;

  // Global interests operations
  addGlobalInterest(interest: InsertGlobalInterest): Promise<GlobalInterest>;
  getAllGlobalInterests(): Promise<GlobalInterest[]>;
  getGlobalInterestByName(
    interest: string,
  ): Promise<GlobalInterest | undefined>;

  // Global deal breakers operations
  addGlobalDealBreaker(
    dealBreaker: InsertGlobalDealBreaker,
  ): Promise<GlobalDealBreaker>;
  getAllGlobalDealBreakers(): Promise<GlobalDealBreaker[]>;
  getGlobalDealBreakerByName(
    dealBreaker: string,
  ): Promise<GlobalDealBreaker | undefined>;

  // Global tribes operations
  addGlobalTribe(tribe: InsertGlobalTribe): Promise<GlobalTribe>;
  getAllGlobalTribes(): Promise<GlobalTribe[]>;
  getGlobalTribeByName(tribe: string): Promise<GlobalTribe | undefined>;

  // Global religions operations
  addGlobalReligion(religion: InsertGlobalReligion): Promise<GlobalReligion>;
  getAllGlobalReligions(): Promise<GlobalReligion[]>;
  getGlobalReligionByName(
    religion: string,
  ): Promise<GlobalReligion | undefined>;

  // User photos operations for MEET dating app
  addUserPhoto(photo: InsertUserPhoto): Promise<UserPhoto>;
  getUserPhotos(userId: number): Promise<UserPhoto[]>;
  getUserPhotoById(id: number): Promise<UserPhoto | undefined>;
  updateUserPhoto(
    id: number,
    updates: { photoUrl?: string },
  ): Promise<UserPhoto | undefined>;
  deleteUserPhoto(id: number): Promise<void>;
  setPrimaryPhoto(id: number, userId: number): Promise<UserPhoto>;

  // Section-specific primary photo operations
  updateSectionPrimaryPhoto(
    userId: number,
    photoId: number,
    section: string,
  ): Promise<{ success: boolean; error?: string }>;
  getUserPhotosWithSectionPrimary(
    userId: number,
    section: string,
  ): Promise<UserPhoto[]>;
  getSectionPrimaryPhoto(
    userId: number,
    section: string,
  ): Promise<UserPhoto | undefined>;

  // Discover page - Get all users except current user
  getDiscoverUsers(userId: number): Promise<User[]>;

  // Potential matches
  getPotentialMatches(userId: number): Promise<User[]>;

  // User online status
  updateUserOnlineStatus(
    userId: number | null,
    isOnline: boolean,
  ): Promise<User | undefined>;
  getUserOnlineStatus(userId: number | null): Promise<boolean>;
  getUserLastActive(userId: number | null): Promise<Date | null>;

  // Chat presence status
  updateActiveChatStatus(
    userId: number,
    matchId: number,
    isActive: boolean,
  ): Promise<boolean>;
  getActiveChatStatus(userId: number, matchId: number): Promise<boolean>;
  getUsersInActiveChat(matchId: number): Promise<number[]>;

  // Typing status
  updateTypingStatus(
    userId: number,
    matchId: number,
    isTyping: boolean,
  ): Promise<TypingStatus>;
  getTypingStatus(matchId: number): Promise<TypingStatus[]>;

  // Mark messages as read
  markMessageAsReadWithTimestamp(id: number): Promise<Message | undefined>;

  // Video calls
  createVideoCall(videoCall: InsertVideoCall): Promise<VideoCall>;
  getVideoCallById(id: number): Promise<VideoCall | undefined>;
  updateVideoCallStatus(
    id: number,
    updates: { status: string; startedAt?: Date; endedAt?: Date },
  ): Promise<VideoCall | undefined>;
  getVideoCallsByUserId(userId: number): Promise<VideoCall[]>;

  // Message reactions
  addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeMessageReaction(
    messageId: number,
    userId: number,
    emoji: string,
  ): Promise<void>;
  getMessageReactions(messageId: number): Promise<MessageReaction[]>;
  getMessageReactionsByMatch(matchId: number): Promise<MessageReaction[]>;

  // Auto-delete functionality
  getUserMatchSettings(
    userId: number,
    matchId: number,
  ): Promise<UserMatchSettings | undefined>;
  updateUserMatchSettings(
    userId: number,
    matchId: number,
    settings: Partial<InsertUserMatchSettings>,
  ): Promise<UserMatchSettings>;
  deleteMessagesForUser(userId: number, matchId: number): Promise<void>;
  scheduleMessageDeletion(
    messageId: number,
    deleteAt: Date,
    mode: string,
  ): Promise<void>;
  processAutoDeleteMessages(): Promise<void>;

  // Session store
  sessionStore: any; // Using any type for session store to avoid typing issues

  // ===================================
  // SUITE PROFILE SYSTEM METHODS
  // ===================================

  // ===== SUITE PROFILE SETTINGS =====
  getSuiteProfileSettings(
    userId: number,
  ): Promise<SuiteProfileSettings | undefined>;
  updateSuiteProfileSettings(
    userId: number,
    settings: Partial<InsertSuiteProfileSettings>,
  ): Promise<SuiteProfileSettings>;

  // ===== JOB PROFILE METHODS =====
  getSuiteJobProfile(userId: number): Promise<SuiteJobProfile | undefined>;
  getSuiteJobProfileById(
    profileId: number,
  ): Promise<SuiteJobProfile | undefined>;
  getSuiteJobProfileByUserId(
    userId: number,
  ): Promise<SuiteJobProfile | undefined>;
  createOrUpdateSuiteJobProfile(
    userId: number,
    jobProfileData: Partial<InsertSuiteJobProfile>,
  ): Promise<SuiteJobProfile>;
  deleteSuiteJobProfile(userId: number): Promise<void>;
  getDiscoveryJobProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Array<SuiteJobProfile & { user: User }>>;

  // ===== MENTORSHIP PROFILE METHODS =====
  getSuiteMentorshipProfile(
    userId: number,
    role?: string,
  ): Promise<SuiteMentorshipProfile | undefined>;
  getSuiteMentorshipProfileById(
    profileId: number,
  ): Promise<SuiteMentorshipProfile | undefined>;
  getSuiteMentorshipProfileByRole(
    userId: number,
    role: string,
  ): Promise<SuiteMentorshipProfile | undefined>;
  getSuiteMentorshipProfiles(userId: number): Promise<SuiteMentorshipProfile[]>;
  createOrUpdateSuiteMentorshipProfile(
    userId: number,
    mentorshipProfileData: Partial<InsertSuiteMentorshipProfile>,
  ): Promise<SuiteMentorshipProfile>;
  deleteSuiteMentorshipProfile(userId: number, role?: string): Promise<void>;
  getDiscoveryMentorshipProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Array<SuiteMentorshipProfile & { user: User }>>;

  // ===== NETWORKING PROFILE METHODS =====
  getSuiteNetworkingProfile(
    userId: number,
  ): Promise<SuiteNetworkingProfile | undefined>;
  getSuiteNetworkingProfileById(
    profileId: number,
  ): Promise<SuiteNetworkingProfile | undefined>;
  createOrUpdateSuiteNetworkingProfile(
    userId: number,
    networkingProfileData: Partial<InsertSuiteNetworkingProfile>,
  ): Promise<SuiteNetworkingProfile>;
  deleteSuiteNetworkingProfile(userId: number): Promise<void>;
  getDiscoveryNetworkingProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Array<SuiteNetworkingProfile & { user: User }>>;

  // Field visibility operations
  getFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
  ): Promise<SuiteFieldVisibility[]>;
  updateFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
    fieldName: string,
    isVisible: boolean,
  ): Promise<SuiteFieldVisibility>;
  updateMultipleFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
    visibilityData: Record<string, boolean>,
  ): Promise<void>;

  // ===== SUITE CONNECTION METHODS =====
  // Networking connections
  createSuiteNetworkingConnection(
    connectionData: InsertSuiteNetworkingConnection,
  ): Promise<SuiteNetworkingConnection>;
  getSuiteNetworkingConnection(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteNetworkingConnection | undefined>;
  updateSuiteNetworkingConnection(
    id: number,
    updates: Partial<SuiteNetworkingConnection>,
  ): Promise<SuiteNetworkingConnection | undefined>;
  getUserNetworkingConnections(userId: number): Promise<
    Array<
      SuiteNetworkingConnection & {
        targetProfile: SuiteNetworkingProfile;
        targetUser: User;
      }
    >
  >;

  // Mentorship connections
  createSuiteMentorshipConnection(
    connectionData: InsertSuiteMentorshipConnection,
  ): Promise<SuiteMentorshipConnection>;
  getSuiteMentorshipConnection(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteMentorshipConnection | undefined>;
  updateSuiteMentorshipConnection(
    id: number,
    updates: Partial<SuiteMentorshipConnection>,
  ): Promise<SuiteMentorshipConnection | undefined>;
  getUserMentorshipConnections(userId: number): Promise<
    Array<
      SuiteMentorshipConnection & {
        targetProfile: SuiteMentorshipProfile;
        targetUser: User;
      }
    >
  >;

  // Job applications
  createSuiteJobApplication(
    applicationData: InsertSuiteJobApplication,
  ): Promise<SuiteJobApplication>;
  getSuiteJobApplication(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteJobApplication | undefined>;
  updateSuiteJobApplication(
    id: number,
    updates: Partial<SuiteJobApplication>,
  ): Promise<SuiteJobApplication | undefined>;
  deleteSuiteJobApplicationById(id: number): Promise<void>;
  getUserJobApplications(
    userId: number,
  ): Promise<
    Array<
      SuiteJobApplication & { targetProfile: SuiteJobProfile; targetUser: User }
    >
  >;

  // Connection management by ID (for delete operations)
  getSuiteNetworkingConnectionById(
    id: number,
  ): Promise<SuiteNetworkingConnection | undefined>;
  getSuiteMentorshipConnectionById(
    id: number,
  ): Promise<SuiteMentorshipConnection | undefined>;
  deleteSuiteNetworkingConnectionById(id: number): Promise<void>;
  deleteSuiteMentorshipConnectionById(id: number): Promise<void>;

  // ===== SUITE COMPATIBILITY SCORING METHODS =====
  createSuiteCompatibilityScore(
    scoreData: InsertSuiteCompatibilityScore,
  ): Promise<SuiteCompatibilityScore>;
  getSuiteCompatibilityScore(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteCompatibilityScore | undefined>;
  updateSuiteCompatibilityScore(
    id: number,
    updates: Partial<SuiteCompatibilityScore>,
  ): Promise<SuiteCompatibilityScore>;
  getUserByNetworkingProfileId(profileId: number): Promise<User | undefined>;

  // Swipe history operations
  addSwipeHistory(swipeData: InsertSwipeHistory): Promise<SwipeHistory>;
  getUserSwipeHistory(
    userId: number,
    appMode: string,
    limit?: number,
  ): Promise<SwipeHistory[]>;
  removeSwipeHistory(id: number): Promise<void>;
  clearUserSwipeHistory(userId: number, appMode: string): Promise<void>;
  removeMatchedUsersFromSwipeHistory(
    userId1: number,
    userId2: number,
    appMode?: string,
  ): Promise<void>;

  // User report strikes operations
  createUserReportStrike(
    reportStrike: InsertUserReportStrike,
  ): Promise<UserReportStrike>;
  getUserReportStrikes(reportedUserId: number): Promise<UserReportStrike[]>;
  getUserReportStrikeCount(reportedUserId: number): Promise<number>;
  getReportStrikesInLast24Hours(
    reportedUserId: number,
  ): Promise<UserReportStrike[]>;

  // ===== PAYMENT SYSTEM METHODS =====
  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscriptionById(id: number): Promise<Subscription | undefined>;
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  getUserActiveSubscription(userId: number): Promise<Subscription | undefined>;
  updateSubscription(
    id: number,
    updates: Partial<Subscription>,
  ): Promise<Subscription | undefined>;
  cancelSubscription(id: number): Promise<Subscription | undefined>;
  getExpiredSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByProvider(provider: string): Promise<Subscription[]>;
  getUserSubscriptionHistory(userId: number): Promise<Subscription[]>;

  // Payment method operations
  createPaymentMethod(
    paymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod>;
  getPaymentMethodById(id: number): Promise<PaymentMethod | undefined>;
  getUserPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  getUserDefaultPaymentMethod(
    userId: number,
  ): Promise<PaymentMethod | undefined>;
  updatePaymentMethod(
    id: number,
    updates: Partial<PaymentMethod>,
  ): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<void>;
  setDefaultPaymentMethod(
    userId: number,
    paymentMethodId: number,
  ): Promise<PaymentMethod | undefined>;

  // Payment history operations
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistoryById(id: number): Promise<PaymentHistory | undefined>;
  getUserPaymentHistory(userId: number): Promise<PaymentHistory[]>;
  getSubscriptionPaymentHistory(
    subscriptionId: number,
  ): Promise<PaymentHistory[]>;
  getPaymentHistoryByProvider(provider: string): Promise<PaymentHistory[]>;
  getFailedPayments(userId?: number): Promise<PaymentHistory[]>;
  updatePaymentStatus(
    id: number,
    status: string,
    metadata?: string,
  ): Promise<PaymentHistory | undefined>;

  // Subscription events operations
  createSubscriptionEvent(
    event: InsertSubscriptionEvent,
  ): Promise<SubscriptionEvent>;
  getSubscriptionEvents(subscriptionId: number): Promise<SubscriptionEvent[]>;
  getUserSubscriptionEvents(userId: number): Promise<SubscriptionEvent[]>;

  // Regional pricing operations
  createRegionalPricing(
    pricing: InsertRegionalPricing,
  ): Promise<RegionalPricing>;
  getRegionalPricing(
    planType: string,
    region: string,
    currency: string,
  ): Promise<RegionalPricing | undefined>;
  getActivePricingForRegion(region: string): Promise<RegionalPricing[]>;
  updateRegionalPricing(
    id: number,
    updates: Partial<RegionalPricing>,
  ): Promise<RegionalPricing | undefined>;
  getDefaultPricing(planType: string): Promise<RegionalPricing | undefined>;

  // Promotional code operations
  createPromotionalCode(
    promoCode: InsertPromotionalCode,
  ): Promise<PromotionalCode>;
  getPromotionalCodeByCode(code: string): Promise<PromotionalCode | undefined>;
  validatePromotionalCode(
    code: string,
    userId: number,
    planType: string,
    region: string,
  ): Promise<{ valid: boolean; discount?: number; error?: string }>;
  usePromotionalCode(
    usage: InsertPromotionalCodeUsage,
  ): Promise<PromotionalCodeUsage>;
  getPromotionalCodeUsage(userId: number): Promise<PromotionalCodeUsage[]>;
  getUserPromotionalCodeUsage(
    userId: number,
    promoCodeId: number,
  ): Promise<PromotionalCodeUsage | undefined>;
  incrementPromotionalCodeUsage(
    promoCodeId: number,
  ): Promise<PromotionalCode | undefined>;

  // Payment analytics and reporting
  getRevenueByRegion(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ region: string; revenue: number; currency: string }>>;
  getSubscriptionStats(): Promise<{
    active: number;
    cancelled: number;
    total: number;
  }>;
  getPaymentFailureRate(provider?: string): Promise<number>;
  getMostUsedPaymentMethods(): Promise<Array<{ type: string; count: number }>>;

  // Unified API performance optimization methods
  getSwipeHistory(
    userId: number,
    appMode: string,
    limit: number,
  ): Promise<any[]>;
  getPremiumStatus(
    userId: number,
  ): Promise<{ premiumAccess: boolean; subscriptionStatus?: string }>;
  getMatchCounts(
    userId: number,
  ): Promise<{ confirmed: number; pending: number; total: number }>;
  getUnreadMessageCount(userId: number, mode: string): Promise<number>;
  getSuiteConnectionCounts(userId: number): Promise<any>;
  getMatches(userId: number): Promise<Match[]>;

  // KWAME AI Conversation methods
  createKwameConversation(
    conversation: InsertKwameConversation,
  ): Promise<KwameConversation>;
  getKwameConversationHistory(
    userId: number,
    limit?: number,
  ): Promise<KwameConversation[]>;
  getRecentKwameContext(
    userId: number,
    limit?: number,
  ): Promise<KwameConversation[]>;
  clearKwameConversationHistory(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // TEMPORARY FIX: Use in-memory session store to avoid pg-pool connection issues
    // The PostgreSQL session store was causing ETIMEDOUT errors with connect-pg-simple
    // after switching to Neon HTTP driver. In-memory sessions work fine for now.
    console.log("[STORAGE] Using in-memory session store (faster, no DB connection issues)");
    
    // @ts-expect-error memorystore has loose typings for constructor options
    this.sessionStore = new MemoryStore({
      // prune expired entries daily
      checkPeriod: 24 * 60 * 60 * 1000,
      // Keep sessions for 24 hours in memory
      ttl: 24 * 60 * 60 * 1000,
      // Store up to 10,000 sessions in memory (should be plenty)
      max: 10000,
    });

    console.log("[STORAGE] ✅ In-memory session store initialized (no database connection pool issues)");

    // TODO: Later we can implement a custom session store that uses our Neon HTTP connection
    // instead of the problematic pg-pool connection from connect-pg-simple
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Fetch all users and filter by case-insensitive username match
    const allUsers = await this.getAllUsers();
    return allUsers.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Fetch all users and filter by case-insensitive email match
    const allUsers = await this.getAllUsers();
    return allUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getUserByPhoneNumber(
    phoneNumber: string | null | undefined,
  ): Promise<User | undefined> {
    // If phoneNumber is null or undefined, return undefined immediately
    if (!phoneNumber) {
      return undefined;
    }

    // PERFORMANCE FIX: Use direct database query instead of downloading all users
    const matchingUsers = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber));

    if (matchingUsers.length > 1) {
      console.warn(
        `WARNING: Found ${matchingUsers.length} users with the same phone number: ${phoneNumber}`,
      );
      console.warn(
        `Matching user IDs: ${matchingUsers.map((u) => u.id).join(", ")}`,
      );
      // Return the most recently created user as a temporary fix
      matchingUsers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
      return matchingUsers[0];
    }

    return matchingUsers[0]; // Returns undefined if no matches
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Phone verification methods
  async createVerificationCode(
    verificationData: InsertVerificationCode,
  ): Promise<VerificationCode> {
    const [code] = await db
      .insert(verificationCodes)
      .values(verificationData)
      .returning();
    return code;
  }

  async getVerificationCode(
    phoneNumber: string,
    code: string,
  ): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phoneNumber, phoneNumber),
          eq(verificationCodes.code, code),
        ),
      );
    return verificationCode;
  }

  async deleteVerificationCode(id: number): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.id, id));
  }

  async deleteExpiredVerificationCodes(): Promise<void> {
    const now = new Date();
    await db.delete(verificationCodes).where(
      // Using raw SQL to compare dates
      sql`${verificationCodes.expiresAt} < ${now}`,
    );
  }

  // Blocked phone numbers for age compliance
  async addBlockedPhoneNumber(
    phoneNumber: string,
    reason: string,
    fullName?: string,
    email?: string,
    metadata?: string,
  ): Promise<BlockedPhoneNumber> {
    const [blocked] = await db
      .insert(blockedPhoneNumbers)
      .values({ phoneNumber, reason, fullName, email, metadata })
      .returning();
    return blocked;
  }

  async isPhoneNumberBlocked(phoneNumber: string): Promise<boolean> {
    const blocked = await db
      .select()
      .from(blockedPhoneNumbers)
      .where(eq(blockedPhoneNumbers.phoneNumber, phoneNumber))
      .limit(1);
    return blocked.length > 0;
  }

  async getBlockedPhoneNumber(
    phoneNumber: string,
  ): Promise<BlockedPhoneNumber | undefined> {
    const blocked = await db
      .select()
      .from(blockedPhoneNumbers)
      .where(eq(blockedPhoneNumbers.phoneNumber, phoneNumber))
      .limit(1);
    return blocked[0];
  }

  async isEmailInBlockedPhoneNumbers(
    email: string,
  ): Promise<BlockedPhoneNumber | undefined> {
    const normalized = email.trim().toLowerCase();
    const blocked = await db
      .select()
      .from(blockedPhoneNumbers)
      .where(eq(blockedPhoneNumbers.email, normalized))
      .limit(1);
    return blocked[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Create a clean object for insertion
    let userData: any = {
      ...insertUser,
      createdAt: new Date(),
    };

    // Handle date of birth properly
    if (userData.dateOfBirth) {
      try {
        // If it's already a Date object, keep it
        if (userData.dateOfBirth instanceof Date) {
          console.log("Date object already provided");
        }
        // If it's a string, convert it to a Date
        else if (typeof userData.dateOfBirth === "string") {
          userData.dateOfBirth = new Date(userData.dateOfBirth);
          console.log("Converted string to Date:", userData.dateOfBirth);
        }
        // Otherwise, delete the field
        else {
          console.log(
            "Invalid date type, removing:",
            typeof userData.dateOfBirth,
          );
          delete userData.dateOfBirth;
        }

        // Check if the date is valid
        if (userData.dateOfBirth && isNaN(userData.dateOfBirth.getTime())) {
          console.log("Invalid date, removing field");
          delete userData.dateOfBirth;
        }
      } catch (err) {
        console.error("Error parsing date:", err);
        delete userData.dateOfBirth;
      }
    }

    console.log("Final user data for DB:", userData);

    // Set profileHidden to true and premiumAccess to false by default for new users
    // New users start hidden until they activate their profiles
    userData.profileHidden = true;
    userData.premiumAccess = false;

    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserProfile(
    id: number,
    profile: Partial<UserProfile>,
  ): Promise<User | undefined> {
    try {
      // Check if the user exists first
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Check if profile object is empty
      if (Object.keys(profile).length === 0) {
        throw new Error("No values to set");
      }

      // Special handling for visibility preferences only updates
      const isVisibilityPreferencesOnlyUpdate =
        Object.keys(profile).length === 1 && "visibilityPreferences" in profile;

      if (isVisibilityPreferencesOnlyUpdate && profile.visibilityPreferences) {
        console.log("Special handling for visibilityPreferences-only update");

        try {
          // Use raw SQL for this specific update to avoid any syntax issues
          await db.execute(sql`
            UPDATE users 
            SET visibility_preferences = ${profile.visibilityPreferences}
            WHERE id = ${id}
          `);

          // Return the updated user
          return await this.getUser(id);
        } catch (directUpdateError) {
          console.error(
            "Error in direct visibility preferences update:",
            directUpdateError,
          );
          throw new Error(
            `Database error: ${(directUpdateError as Error)?.message || "Unknown database error"}`,
          );
        }
      }

      // Continue with normal update flow for other fields
      // Check for special clearing operations flag
      const isClearingFields = profile.clearingFields === true;
      console.log("Profile update with clearingFields flag:", isClearingFields);

      // Remove the internal flag we added for explicit field clearing operations
      delete profile.clearingFields;

      // Special handling for visibilityPreferences
      let visibilityPreferences;
      if ("visibilityPreferences" in profile) {
        visibilityPreferences = profile.visibilityPreferences;
        delete profile.visibilityPreferences;
      }

      // Clean profile data for database update
      const cleanProfile: Record<string, any> = {};

      // Process each field
      for (const [key, value] of Object.entries(profile)) {
        // Always accept explicit null values (field clearing)
        if (value === null) {
          cleanProfile[key] = null;
          continue;
        }

        // Handle empty strings
        if (value === "") {
          // When explicitly clearing fields, convert empty strings to null
          if (isClearingFields) {
            cleanProfile[key] = null;
          }
          // Otherwise skip empty strings in normal mode
          continue;
        }

        // Handle non-empty values (both clearing mode and normal mode)
        if (value !== undefined) {
          cleanProfile[key] = value;
        }
      }

      // Re-add visibilityPreferences if it was present
      if (visibilityPreferences) {
        cleanProfile.visibilityPreferences = visibilityPreferences;
      }

      // Log the cleaned profile for debugging
      console.log("Clean profile data for update:", cleanProfile);

      // If we're explicitly clearing fields but ended up with no values,
      // allow the operation to proceed with a null value for the specified field
      if (Object.keys(cleanProfile).length === 0) {
        if (isClearingFields) {
          // Determine which field was being cleared based on keys in the original profile
          const originalKeys = Object.keys(profile);
          if (originalKeys.length > 0) {
            // Use the first field as the one being cleared
            const fieldToClear = originalKeys[0];
            cleanProfile[fieldToClear] = null;
            console.log(
              `Explicitly clearing field "${fieldToClear}" with null value`,
            );
          } else {
            throw new Error("No fields specified for clearing operation");
          }
        } else {
          throw new Error("No valid values to set after filtering");
        }
      }

      // Log what we're updating
      console.log("Updating user profile with clean data:", cleanProfile);

      try {
        // Perform the update
        const [updatedUser] = await db
          .update(users)
          .set(cleanProfile)
          .where(eq(users.id, id))
          .returning();
        return updatedUser;
      } catch (dbError) {
        console.error(`Database error updating user ${id}:`, dbError);
        throw new Error(
          `Database error: ${(dbError as Error)?.message || "Unknown database error"}`,
        );
      }
    } catch (error) {
      console.error(`Error updating user profile for user ${id}:`, error);
      throw error;
    }
  }

  async updateUser(
    id: number,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      console.log(`User ${id} updated successfully`);
      return updatedUser;
    } catch (error: unknown) {
      console.error(`Error updating user ${id}:`, error);
      if (error instanceof Error) {
        throw new Error(`Database error: ${error.message}`);
      } else {
        throw new Error("Unknown database error");
      }
    }
  }

  async updateUserPassword(
    userId: number,
    hashedPassword: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    console.log(`Starting complete user deletion for user ${userId}...`);

    try {
      // Use raw SQL for comprehensive deletion to handle all foreign key constraints
      await db.transaction(async (tx) => {
        // Get user info first for phone number cleanup
        const userResult = await tx.execute(
          sql`SELECT phone_number FROM users WHERE id = ${userId}`,
        );
        const userPhone = userResult.rows[0]?.phone_number;

        console.log(`Deleting all dependent records for user ${userId}...`);

        // Delete all records that reference this user (in order to avoid FK violations)
        // Using raw SQL to ensure we catch all tables

        // Payment and subscription related (delete payment_history first due to subscription FK)
        await tx.execute(
          sql`DELETE FROM payment_history WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM payment_methods WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM subscriptions WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM promotional_code_usage WHERE user_id = ${userId}`,
        );

        // Message and communication related
        await tx.execute(
          sql`DELETE FROM message_reactions WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM messages WHERE sender_id = ${userId} OR receiver_id = ${userId} OR deleted_for_user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM typing_status WHERE user_id = ${userId}`,
        );

        // Video calls
        await tx.execute(
          sql`DELETE FROM video_calls WHERE initiator_id = ${userId} OR receiver_id = ${userId}`,
        );

        // Matches and swipe history
        await tx.execute(
          sql`DELETE FROM matches WHERE user_id_1 = ${userId} OR user_id_2 = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM swipe_history WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );

        // Compatibility analysis and scores
        await tx.execute(
          sql`DELETE FROM compatibility_analysis WHERE user1_id = ${userId} OR user2_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_compatibility_scores WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_mentorship_compatibility_scores WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );

        // SUITE connections
        await tx.execute(
          sql`DELETE FROM suite_networking_connections WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_mentorship_connections WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_job_applications WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );

        // SUITE messages and reactions
        await tx.execute(
          sql`DELETE FROM suite_message_reactions WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_messages WHERE sender_id = ${userId} OR receiver_id = ${userId}`,
        );

        // Professional reviews and reports
        await tx.execute(
          sql`DELETE FROM professional_reviews WHERE user_id = ${userId} OR target_user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM user_report_strikes WHERE reporter_user_id = ${userId} OR reported_user_id = ${userId}`,
        );

        // User preferences and settings
        await tx.execute(
          sql`DELETE FROM user_photos WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM user_preferences WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM user_interests WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM user_match_settings WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM user_auto_delete_settings WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM connections_preferences WHERE user_id = ${userId}`,
        );

        // SUITE profiles and settings
        await tx.execute(
          sql`DELETE FROM suite_job_profiles WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_mentorship_profiles WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_networking_profiles WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_profile_settings WHERE user_id = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM suite_field_visibility WHERE user_id = ${userId}`,
        );

        // Global interests and deal breakers created by user
        await tx.execute(
          sql`DELETE FROM global_interests WHERE created_by = ${userId}`,
        );
        await tx.execute(
          sql`DELETE FROM global_deal_breakers WHERE created_by = ${userId}`,
        );

        // Verification codes by phone number
        if (userPhone) {
          await tx.execute(
            sql`DELETE FROM verification_codes WHERE phone_number = ${userPhone}`,
          );
        }

        // Finally, delete the user record
        await tx.execute(sql`DELETE FROM users WHERE id = ${userId}`);

        console.log(
          `Successfully deleted user ${userId} and all related data using comprehensive SQL approach`,
        );
      });
    } catch (error: unknown) {
      console.error(`Failed to delete user ${userId}:`, error);
      // Instead of throwing, let's try a simplified approach
      try {
        console.log(`Attempting simplified deletion for user ${userId}...`);

        // Simple approach: delete user directly and let cascade handle dependencies
        await db.delete(users).where(eq(users.id, userId));
        console.log(`Successfully deleted user ${userId} with cascade`);
      } catch (simpleError: unknown) {
        console.error(
          `Both deletion methods failed for user ${userId}:`,
          simpleError,
        );
        throw new Error(
          `Cannot delete user: Database constraints prevent deletion`,
        );
      }
    }
  }

  async cleanAllUsers(): Promise<void> {
    // Delete all users and dependent data
    await db.delete(messages);
    await db.delete(matches);
    await db.delete(userPreferences);
    await db.delete(userInterests);
    await db.delete(typingStatus);
    await db.delete(videoCalls);
    await db.delete(verificationCodes);
    await db.delete(userPhotos);
    await db.delete(globalInterests);
    await db.delete(users);
    console.log(
      "All users and related data have been deleted from the database",
    );
  }

  // Preferences operations
  async getUserPreferences(
    userId: number,
  ): Promise<UserPreference | undefined> {
    try {
      const [preference] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      return preference;
    } catch (error) {
      console.error(`Error getting preferences for user ${userId}:`, error);
      return undefined;
    }
  }

  // 🚀 PERFORMANCE OPTIMIZATION: Batch load user preferences
  async batchGetUserPreferences(userIds: number[]): Promise<UserPreference[]> {
    try {
      if (userIds.length === 0) return [];

      const startTime = Date.now();
      const preferences = await db
        .select()
        .from(userPreferences)
        .where(inArray(userPreferences.userId, userIds));

      const duration = Date.now() - startTime;
      console.log(
        `[BATCH-PERFORMANCE] Loaded ${preferences.length} preferences for ${userIds.length} users in ${duration}ms`,
      );

      return preferences;
    } catch (error) {
      console.error(
        `Error batch getting preferences for users ${userIds}:`,
        error,
      );
      return [];
    }
  }

  async createUserPreferences(
    preferences: UserPreferences & { userId: number },
  ): Promise<UserPreference> {
    const [userPreference] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    return userPreference;
  }

  async updateUserPreferences(
    id: number,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreference | undefined> {
    const [updatedPreference] = await db
      .update(userPreferences)
      .set(preferences)
      .where(eq(userPreferences.id, id))
      .returning();
    return updatedPreference;
  }

  async updateUserLocationPreference(
    userId: number,
    location: string,
  ): Promise<void> {
    // Get or create user preferences
    let userPrefs = await this.getUserPreferences(userId);

    if (userPrefs) {
      // Update existing preferences
      await this.updateUserPreferences(userPrefs.id, {
        locationPreference: location,
      });
    } else {
      // Create new preferences with the location
      // CRITICAL FIX: Use null for age preferences so UI shows "N/A" for unactivated MEET profiles
      await this.createUserPreferences({
        userId: userId,
        locationPreference: location,
        minAge: null,
        maxAge: null,
        distancePreference: null,
      });
    }
  }

  async updateUserPoolCountry(
    userId: number,
    poolCountry: string,
  ): Promise<UserPreference | undefined> {
    // Get or create user preferences
    let userPrefs = await this.getUserPreferences(userId);

    if (userPrefs) {
      // Update existing preferences (legacy method)
      return await this.updateUserPreferences(userPrefs.id, {
        poolCountry: poolCountry,
      });
    } else {
      // Create new preferences with the pool country
      // CRITICAL FIX: Use null for age preferences so UI shows "N/A" for unactivated MEET profiles
      return await this.createUserPreferences({
        userId: userId,
        poolCountry: poolCountry,
        minAge: null,
        maxAge: null,
        distancePreference: null,
      });
    }
  }

  async updateUserAppSpecificPoolCountry(
    userId: number,
    poolCountry: string,
    appMode: "MEET" | "SUITE",
  ): Promise<UserPreference | undefined> {
    // Get or create user preferences
    let userPrefs = await this.getUserPreferences(userId);

    // Determine which field to update based on app mode
    const updateData: Partial<UserPreferences> = {};
    if (appMode === "MEET") {
      updateData.meetPoolCountry = poolCountry;
    } else {
      updateData.suitePoolCountry = poolCountry;
    }

    if (userPrefs) {
      // Update existing preferences with app-specific field
      return await this.updateUserPreferences(userPrefs.id, updateData);
    } else {
      // Create new preferences with the app-specific pool country
      // IMPORTANT: Keep age range and distance unset (NULL) so UI shows N/A until the user chooses
      return await this.createUserPreferences({
        userId: userId,
        minAge: null,
        maxAge: null,
        distancePreference: null,
        meetPoolCountry: appMode === "MEET" ? poolCountry : "ANYWHERE",
        suitePoolCountry: appMode === "SUITE" ? poolCountry : "ANYWHERE",
        poolCountry: poolCountry, // Also set legacy field for compatibility
      });
    }
  }

  // Match operations
  async createMatch(match: InsertMatch): Promise<Match> {
    console.log(
      `[CREATE-MATCH-DEBUG] Attempting to create match between users ${match.userId1} and ${match.userId2}`,
    );

    // Check if a match already exists between these users
    const existingMatch = await this.getMatchBetweenUsers(
      match.userId1,
      match.userId2,
    );

    if (existingMatch) {
      console.log(
        `[CREATE-MATCH-DEBUG] Found existing match ${existingMatch.id}, matched: ${existingMatch.matched}, metadata: ${existingMatch.metadata}`,
      );
      return existingMatch;
    }

    const [newMatch] = await db
      .insert(matches)
      .values({
        ...match,
        matched: match.matched ?? false,
        hasUnreadMessages1: false,
        hasUnreadMessages2: false,
        notifiedUser1: false,
        notifiedUser2: false,
        metadata: match.metadata || null,
        createdAt: new Date(),
      })
      .returning();

    console.log(`[CREATE-MATCH-DEBUG] Successfully created new match:`, {
      id: newMatch.id,
      userId1: newMatch.userId1,
      userId2: newMatch.userId2,
      matched: newMatch.matched,
      metadata: newMatch.metadata,
    });

    // CRITICAL: Cleanup swipe history when match is created
    if (newMatch.matched) {
      console.log(
        `[SWIPE-CLEANUP] Starting cleanup for CREATED match between users ${newMatch.userId1} and ${newMatch.userId2}`,
      );
      try {
        await this.removeMatchedUsersFromSwipeHistory(
          newMatch.userId1,
          newMatch.userId2,
        );
      } catch (cleanupError) {
        console.error(
          `[SWIPE-CLEANUP] Failed for CREATED match ${newMatch.id}:`,
          cleanupError,
        );
      }
    }

    return newMatch;
  }

  async getMatchById(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchesByUserId(userId: number): Promise<Match[]> {
    // Get matches excluding blocked users (bidirectional blocking)
    return await db
      .select()
      .from(matches)
      .where(
        and(
          // User is in the match
          or(eq(matches.userId1, userId), eq(matches.userId2, userId)),

          // No blocking exists between users (bidirectional check)
          notExists(
            db
              .select()
              .from(userBlocks)
              .where(
                or(
                  // Current user hasn't blocked the other user
                  and(
                    eq(userBlocks.blockerUserId, userId),
                    or(
                      eq(userBlocks.blockedUserId, matches.userId1),
                      eq(userBlocks.blockedUserId, matches.userId2),
                    ),
                  ),
                  // Other user hasn't blocked current user
                  and(
                    or(
                      eq(userBlocks.blockerUserId, matches.userId1),
                      eq(userBlocks.blockerUserId, matches.userId2),
                    ),
                    eq(userBlocks.blockedUserId, userId),
                  ),
                ),
              ),
          ),
        ),
      );
  }

  // Removed broken optimization function - using working getUserMatches instead

  // Get only MEET-originated matches (excludes SUITE matches) and blocked users
  async getMeetMatchesByUserId(userId: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.userId1, userId), eq(matches.userId2, userId)),
          or(
            isNull(matches.metadata), // Legacy MEET matches without metadata
            sql`${matches.metadata}::jsonb->>'suiteType' IS NULL`, // Explicit MEET matches
          ),

          // No blocking exists between users (bidirectional check)
          notExists(
            db
              .select()
              .from(userBlocks)
              .where(
                or(
                  // Current user hasn't blocked the other user
                  and(
                    eq(userBlocks.blockerUserId, userId),
                    or(
                      eq(userBlocks.blockedUserId, matches.userId1),
                      eq(userBlocks.blockedUserId, matches.userId2),
                    ),
                  ),
                  // Other user hasn't blocked current user
                  and(
                    or(
                      eq(userBlocks.blockerUserId, matches.userId1),
                      eq(userBlocks.blockerUserId, matches.userId2),
                    ),
                    eq(userBlocks.blockedUserId, userId),
                  ),
                ),
              ),
          ),
        ),
      );
  }

  async getMatchBetweenUsers(
    userId1: number,
    userId2: number,
  ): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        or(
          and(eq(matches.userId1, userId1), eq(matches.userId2, userId2)),
          and(eq(matches.userId1, userId2), eq(matches.userId2, userId1)),
        ),
      );
    return match;
  }

  async getAllMatchesBetweenUsers(
    userId1: number,
    userId2: number,
  ): Promise<Match[]> {
    const allMatches = await db
      .select()
      .from(matches)
      .where(
        or(
          and(eq(matches.userId1, userId1), eq(matches.userId2, userId2)),
          and(eq(matches.userId1, userId2), eq(matches.userId2, userId1)),
        ),
      )
      .orderBy(desc(matches.id)); // Order by newest first

    return allMatches;
  }

  async updateMatchStatus(
    matchId: number,
    matched: boolean,
  ): Promise<Match | undefined> {
    const [updatedMatch] = await db
      .update(matches)
      .set({
        matched,
        // Reset notification flags when updating match status
        notifiedUser1: false,
        notifiedUser2: false,
      })
      .where(eq(matches.id, matchId))
      .returning();
    return updatedMatch;
  }

  async removeLikeOrDislike(
    userId: number,
    targetUserId: number,
  ): Promise<void> {
    // Find the match between these users
    const match = await this.getMatchBetweenUsers(userId, targetUserId);

    if (match) {
      // Delete the match to undo the like or dislike
      await db.delete(matches).where(eq(matches.id, match.id));

      console.log(
        `Removed match ${match.id} between users ${userId} and ${targetUserId}`,
      );
    } else {
      console.log(
        `No match found between users ${userId} and ${targetUserId} to remove`,
      );
    }
  }

  // Get matches created after a specific timestamp for a user
  async getMatchesSince(userId: number, since: Date): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.userId1, userId), eq(matches.userId2, userId)),
          sql`${matches.createdAt} > ${since}`,
        ),
      )
      .orderBy(desc(matches.createdAt)); // Order by most recent first
  }

  // Get count of unread message notifications for a user (total unread messages)
  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      console.log(
        `[UNREAD-OPTIMIZED] User ${userId}: Starting optimized unread count query`,
      );
      const startTime = Date.now();

      // Optimized: Single SQL query with JOIN instead of multiple queries + loops
      const [result] = await db
        .select({
          unreadCount: sql<number>`COUNT(*)`,
        })
        .from(messages)
        .innerJoin(matches, eq(messages.matchId, matches.id))
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.read, false),
            or(
              and(
                eq(matches.userId1, userId),
                eq(matches.hasUnreadMessages1, true),
              ),
              and(
                eq(matches.userId2, userId),
                eq(matches.hasUnreadMessages2, true),
              ),
            ),
          ),
        );

      const duration = Date.now() - startTime;
      const unreadCount = Number(result?.unreadCount) || 0;
      console.log(
        `[UNREAD-OPTIMIZED] User ${userId}: Query completed in ${duration}ms, found ${unreadCount} unread messages`,
      );

      return unreadCount;
    } catch (error) {
      console.error("Error getting unread message count:", error);
      return 0;
    }
  }

  // Get count of conversations with unread messages for navigation badge - OPTIMIZED VERSION
  async getUnreadConversationsCount(userId: number): Promise<number> {
    try {
      // OPTIMIZED: Using a single SQL query with DISTINCT to get conversation count directly
      // This avoids the potential for double-counting messages and is far more efficient
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT msg.match_id) AS unread_conversation_count
        FROM messages msg
        JOIN matches m ON msg.match_id = m.id
        WHERE msg.receiver_id = ${userId}
          AND msg.sender_id <> ${userId}
          AND msg.read = FALSE
          AND ((m.user_id_1 = ${userId} AND m.has_unread_messages_1 = TRUE)
            OR (m.user_id_2 = ${userId} AND m.has_unread_messages_2 = TRUE))
      `);

      // Extract the count from the result
      const rows = result.rows as Array<{
        unread_conversation_count: string | number;
      }>;
      if (
        rows &&
        rows.length > 0 &&
        rows[0].unread_conversation_count !== undefined
      ) {
        return Number(rows[0].unread_conversation_count);
      }

      // Fallback to the original implementation if the query doesn't work as expected
      console.log(
        "Falling back to original unread conversations count implementation",
      );

      // Get all matches for the user
      const userMatches = await this.getMatchesByUserId(userId);
      let conversationsWithUnread = 0;

      // Count each conversation that has at least one unread message
      for (const match of userMatches) {
        // Only check matches that have the unread flag set
        if (
          (match.userId1 === userId && match.hasUnreadMessages1) ||
          (match.userId2 === userId && match.hasUnreadMessages2)
        ) {
          // Get all messages for this match
          const matchMessages = await this.getMessagesByMatchId(match.id);

          // Check if there's at least one unread message from the other user
          const hasUnreadFromOther = matchMessages.some(
            (message) =>
              message.receiverId === userId &&
              message.senderId !== userId &&
              !message.read,
          );

          // If there's at least one unread message from the other user, count this conversation
          if (hasUnreadFromOther) {
            conversationsWithUnread++;
          }
        }
      }

      return conversationsWithUnread;
    } catch (error) {
      console.error("Error getting unread conversations count:", error);
      return 0; // Default to 0 on error
    }
  }

  // Mark a match as having unread messages for the receiver
  async markMatchUnread(
    matchId: number,
    receiverId: number,
  ): Promise<Match | undefined> {
    const match = await this.getMatchById(matchId);
    if (!match) return undefined;

    // Determine which user flag to update based on receiverId
    let updateFields = {};
    if (match.userId1 === receiverId) {
      updateFields = { hasUnreadMessages1: true, lastMessageAt: new Date() };
    } else if (match.userId2 === receiverId) {
      updateFields = { hasUnreadMessages2: true, lastMessageAt: new Date() };
    }

    const [updatedMatch] = await db
      .update(matches)
      .set(updateFields)
      .where(eq(matches.id, matchId))
      .returning();

    return updatedMatch;
  }

  // Mark a match as read for a specific user
  async markMatchRead(
    matchId: number,
    userId: number,
  ): Promise<Match | undefined> {
    const match = await this.getMatchById(matchId);
    if (!match) return undefined;

    // Determine which user flag to update based on userId
    let updateFields = {};
    if (match.userId1 === userId) {
      updateFields = { hasUnreadMessages1: false };
    } else if (match.userId2 === userId) {
      updateFields = { hasUnreadMessages2: false };
    }

    const [updatedMatch] = await db
      .update(matches)
      .set(updateFields)
      .where(eq(matches.id, matchId))
      .returning();

    return updatedMatch;
  }

  // Mark match notification as delivered for a user
  async markMatchNotified(
    matchId: number,
    userId: number,
  ): Promise<Match | undefined> {
    const match = await this.getMatchById(matchId);
    if (!match) return undefined;

    // Determine which notification flag to update
    let updateFields = {};
    if (match.userId1 === userId) {
      updateFields = { notifiedUser1: true };
    } else if (match.userId2 === userId) {
      updateFields = { notifiedUser2: true };
    }

    const [updatedMatch] = await db
      .update(matches)
      .set(updateFields)
      .where(eq(matches.id, matchId))
      .returning();

    return updatedMatch;
  }

  async updateMatch(
    id: number,
    updates: Partial<{
      matched: boolean;
      isDislike: boolean;
      metadata: string;
    }>,
  ): Promise<Match | undefined> {
    // Get the update fields based on whether we're confirming a match or changing like/dislike status
    const updateFields: any = {
      ...updates,
      // When a match is confirmed, reset notification status
      ...(updates.matched
        ? {
            notifiedUser1: false,
            notifiedUser2: false,
            hasUnreadMessages1: true, // Set unread for both users to show notification badge
            hasUnreadMessages2: true,
            isDislike: false, // A confirmed match can't be a dislike
          }
        : {}),
    };

    // Include metadata if provided in updates
    if (updates.metadata !== undefined) {
      updateFields.metadata = updates.metadata;
    }

    const [updatedMatch] = await db
      .update(matches)
      .set(updateFields)
      .where(eq(matches.id, id))
      .returning();

    // CRITICAL: Cleanup swipe history when match is confirmed via update
    if (updatedMatch && updates.matched) {
      console.log(
        `[SWIPE-CLEANUP] Starting cleanup for UPDATED match ${updatedMatch.id} between users ${updatedMatch.userId1} and ${updatedMatch.userId2}`,
      );
      try {
        await this.removeMatchedUsersFromSwipeHistory(
          updatedMatch.userId1,
          updatedMatch.userId2,
        );
      } catch (cleanupError) {
        console.error(
          `[SWIPE-CLEANUP] Failed for UPDATED match ${updatedMatch.id}:`,
          cleanupError,
        );
      }
    }

    return updatedMatch;
  }

  async deleteMatch(id: number): Promise<void> {
    // Delete all messages associated with this match
    await db.delete(messages).where(eq(messages.matchId, id));

    // Delete the match
    await db.delete(matches).where(eq(matches.id, id));
  }

  // Message operations with duplicate prevention
  async createMessage(message: InsertMessage): Promise<Message> {
    // CRITICAL FIX: First check for very recent identical messages (within 2 seconds)
    // This prevents the exact same message from being inserted twice during WebSocket/HTTP race conditions
    const recentTime = new Date();
    recentTime.setSeconds(recentTime.getSeconds() - 2); // Check 2 seconds into the past

    try {
      // Look for identical messages from same sender to same receiver with identical content
      const existingMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.matchId, message.matchId),
            eq(messages.senderId, message.senderId),
            eq(messages.receiverId, message.receiverId),
            eq(messages.content, message.content),
            sql`${messages.createdAt} >= ${recentTime.toISOString()}`,
          ),
        )
        .limit(1);

      // If an identical message was just inserted, return it instead of creating a new one
      if (existingMessages.length > 0) {
        console.log(
          `[DOUBLE-PREVENTION] Prevented duplicate message: ${message.content} (already exists as ID ${existingMessages[0].id})`,
        );

        // Still mark as unread to ensure notification state is correct
        // We don't want to skip this step even if we're reusing a message
        await this.markMatchUnread(message.matchId, message.receiverId);

        return existingMessages[0];
      }
    } catch (error) {
      // Log but continue - if the check fails, we'll still create the message
      console.error("Error checking for duplicate messages:", error);
    }

    // Create the new message with appropriate defaults (only if no duplicate found)
    const [newMessage] = await db
      .insert(messages)
      .values({
        ...message,
        messageType: message.messageType || "text", // Default to text if not specified
        read: false,
        createdAt: new Date(),
      })
      .returning();

    // Mark the match as having unread messages for the receiver
    await this.markMatchUnread(message.matchId, message.receiverId);

    return newMessage;
  }

  /**
   * Gets a single message by its unique ID
   * Used for security validation in message operations
   */
  async getMessageById(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  /**
   * Retrieves messages for a specific match, with additional security validation
   * to ensure messages are only accessible to users who are part of the match
   * Also filters out messages that have been auto-deleted for the requesting user
   */
  async getMessagesByMatchId(
    matchId: number,
    userId?: number,
  ): Promise<Message[]> {
    // If userId is provided, verify the user is part of this match
    if (userId) {
      const match = await this.getMatchById(matchId);

      // If no match found or user is not part of this match, return empty array
      if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
        console.warn(
          `Security: User ${userId} attempted to access messages for match ${matchId} they're not part of`,
        );
        return [];
      }
    }

    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(asc(messages.createdAt));

    // Filter out messages that have been deleted for this specific user
    let filteredMessages = allMessages;
    if (userId) {
      filteredMessages = allMessages.filter((message) => {
        // If message is marked as deleted for this user, don't show it
        if (message.deletedForUserId === userId) {
          return false;
        }

        // If the user has 'always' auto-delete mode and they sent this message,
        // check if they've exited the chat since sending it
        // For now, we'll rely on the deletedForUserId field being set when they exit

        return true;
      });
    }

    // CRITICAL FIX: Transform the FILTERED messages to include replyToMessage object for client compatibility
    const transformedMessages = filteredMessages.map((message) => {
      const transformedMessage: any = { ...message };

      // If this message has reply data, reconstruct the replyToMessage object
      if (
        message.replyToMessageId &&
        message.replyToContent &&
        message.replyToSenderName
      ) {
        // CRITICAL FIX: Calculate isCurrentUser based on who is viewing the message
        // We need to check if the original message sender is the same as the current viewer
        let isCurrentUser = false;
        if (userId && message.replyToMessageId) {
          // Find the original message that was replied to (search in ALL messages, not just filtered)
          const originalMessage = allMessages.find(
            (m) => m.id === message.replyToMessageId,
          );
          if (originalMessage) {
            isCurrentUser = originalMessage.senderId === userId;

            // DETAILED LOGGING for debugging
            console.log(
              `🔄 [REPLY-TRANSFORM] Message ${message.id} "${message.content}"`,
            );
            console.log(
              `   📧 Replying to message ${message.replyToMessageId} "${message.replyToContent}"`,
            );
            console.log(
              `   👤 Original message sender: ${originalMessage.senderId}, Current viewer: ${userId}`,
            );
            console.log(
              `   🎯 isCurrentUser = ${isCurrentUser} (should show "${isCurrentUser ? "You" : message.replyToSenderName}")`,
            );
            console.log(
              `   📝 Stored senderName: "${message.replyToSenderName}"`,
            );
          } else {
            console.log(
              `⚠️ [REPLY-TRANSFORM] Could not find original message ${message.replyToMessageId} for reply`,
            );
          }
        }

        transformedMessage.replyToMessage = {
          id: message.replyToMessageId,
          content: message.replyToContent,
          senderName: message.replyToSenderName,
          isCurrentUser: isCurrentUser, // Now correctly calculated from viewer's perspective
        };
      }

      return transformedMessage;
    });

    return transformedMessages;
  }

  /**
   * Get the count of messages for a specific match
   * Used to determine if a match can be deleted during undo operations
   */
  async getMessageCountForMatch(matchId: number): Promise<number> {
    const messageCount = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.matchId, matchId));

    return messageCount[0]?.count || 0;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    // Mark the message as read
    const [updatedMessage] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
      .returning();

    if (updatedMessage) {
      // Also mark the match as read for the user who is reading the message
      const match = await this.getMatchById(updatedMessage.matchId);
      if (match) {
        // If the reader is userId1, update hasUnreadMessages1, otherwise update hasUnreadMessages2
        if (match.userId1 === updatedMessage.receiverId) {
          await this.markMatchRead(match.id, match.userId1);
        } else if (match.userId2 === updatedMessage.receiverId) {
          await this.markMatchRead(match.id, match.userId2);
        }
      }
    }

    return updatedMessage;
  }

  // Find recent duplicate messages to prevent re-sending the same message multiple times
  async findRecentDuplicateMessages(params: {
    matchId: number;
    senderId: number;
    content: string;
    messageType: string;
    since: string;
    caseInsensitive?: boolean; // Optional parameter to perform case-insensitive matching
  }): Promise<Message[]> {
    const {
      matchId,
      senderId,
      content,
      messageType,
      since,
      caseInsensitive = false,
    } = params;

    try {
      // Get all messages in this match from this sender within the time window
      let messagesQuery = db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.matchId, matchId),
            eq(messages.senderId, senderId),
            eq(messages.messageType, messageType || "text"),
            sql`${messages.createdAt} >= ${since}`,
          ),
        )
        .orderBy(desc(messages.createdAt));

      const allMessages = await messagesQuery;

      if (caseInsensitive) {
        // For case-insensitive matching, we need to do the comparison in JS
        console.log(
          `[CASE-INSENSITIVE] Checking for duplicates of "${content}" with case-insensitive matching`,
        );
        const trimmedLowerContent = content.trim().toLowerCase();
        const duplicates = allMessages.filter((msg) => {
          const msgContent = msg.content.trim().toLowerCase();
          return msgContent === trimmedLowerContent;
        });

        console.log(
          `[CASE-INSENSITIVE] Found ${duplicates.length} case-insensitive matches for "${content}"`,
        );
        return duplicates;
      } else {
        // For case-sensitive matching, filter in JS (we already have the messages)
        return allMessages.filter((msg) => msg.content === content);
      }
    } catch (error) {
      console.error("Error finding duplicate messages:", error);
      return [];
    }
  }

  // Case-insensitive functionality has been merged into findRecentDuplicateMessages with the caseInsensitive parameter

  async markMessageAsReadWithTimestamp(
    id: number,
  ): Promise<Message | undefined> {
    // Mark the message as read with a timestamp of when it was read
    const [updatedMessage] = await db
      .update(messages)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning();

    if (updatedMessage) {
      // Also mark the match as read for the user who is reading the message
      const match = await this.getMatchById(updatedMessage.matchId);
      if (match) {
        // If the reader is userId1, update hasUnreadMessages1, otherwise update hasUnreadMessages2
        if (match.userId1 === updatedMessage.receiverId) {
          await this.markMatchRead(match.id, match.userId1);
        } else if (match.userId2 === updatedMessage.receiverId) {
          await this.markMatchRead(match.id, match.userId2);
        }
      }
    }

    return updatedMessage;
  }

  // User interests operations
  async addUserInterest(interest: InsertUserInterest): Promise<UserInterest> {
    // Set default value for showOnProfile if not provided
    const interestWithDefaults = {
      ...interest,
      showOnProfile:
        interest.showOnProfile !== undefined ? interest.showOnProfile : true,
    };

    const [userInterest] = await db
      .insert(userInterests)
      .values(interestWithDefaults)
      .returning();

    // Also update the interests column in users table as JSON
    await this.updateUserInterestsJson(interest.userId);

    return userInterest;
  }

  // Helper method to sync interests to users table JSON column
  async updateUserInterestsJson(userId: number): Promise<void> {
    // Get all current interests for the user
    const userInterestsList = await this.getUserInterests(userId);
    const interestNames = userInterestsList.map((ui) => ui.interest);

    // Update the interests column in users table with JSON array
    await db
      .update(users)
      .set({ interests: JSON.stringify(interestNames) })
      .where(eq(users.id, userId));
  }

  async getUserInterests(userId: number): Promise<UserInterest[]> {
    return await db
      .select()
      .from(userInterests)
      .where(eq(userInterests.userId, userId));
  }

  async deleteAllUserInterests(userId: number): Promise<void> {
    await db.delete(userInterests).where(eq(userInterests.userId, userId));
    // Also update the interests column in users table
    await this.updateUserInterestsJson(userId);
  }

  async deleteUserInterest(userId: number, interest: string): Promise<void> {
    await db
      .delete(userInterests)
      .where(
        and(
          eq(userInterests.userId, userId),
          eq(userInterests.interest, interest),
        ),
      );
    // Also update the interests column in users table
    await this.updateUserInterestsJson(userId);
  }

  async updateUserInterestsVisibility(
    userId: number,
    showOnProfile: boolean,
  ): Promise<void> {
    await db
      .update(userInterests)
      .set({ showOnProfile })
      .where(eq(userInterests.userId, userId));
  }

  // Global interests operations
  async addGlobalInterest(
    interest: InsertGlobalInterest,
  ): Promise<GlobalInterest> {
    const [globalInterest] = await db
      .insert(globalInterests)
      .values({
        ...interest,
        createdAt: new Date(),
      })
      .returning();
    return globalInterest;
  }

  async getAllGlobalInterests(): Promise<GlobalInterest[]> {
    return await db
      .select()
      .from(globalInterests)
      .orderBy(asc(globalInterests.interest));
  }

  async getGlobalInterestByName(
    interest: string,
  ): Promise<GlobalInterest | undefined> {
    const [globalInterest] = await db
      .select()
      .from(globalInterests)
      .where(eq(globalInterests.interest, interest));
    return globalInterest;
  }

  // Global deal breakers operations
  async addGlobalDealBreaker(
    dealBreaker: InsertGlobalDealBreaker,
  ): Promise<GlobalDealBreaker> {
    const [globalDealBreaker] = await db
      .insert(globalDealBreakers)
      .values({
        ...dealBreaker,
        createdAt: new Date(),
      })
      .returning();
    return globalDealBreaker;
  }

  async getAllGlobalDealBreakers(): Promise<GlobalDealBreaker[]> {
    return await db
      .select()
      .from(globalDealBreakers)
      .orderBy(asc(globalDealBreakers.dealBreaker));
  }

  async getGlobalDealBreakerByName(
    dealBreaker: string,
  ): Promise<GlobalDealBreaker | undefined> {
    const [globalDealBreaker] = await db
      .select()
      .from(globalDealBreakers)
      .where(eq(globalDealBreakers.dealBreaker, dealBreaker));
    return globalDealBreaker;
  }

  // Global tribes operations
  async addGlobalTribe(tribe: InsertGlobalTribe): Promise<GlobalTribe> {
    const [globalTribe] = await db
      .insert(globalTribes)
      .values({
        ...tribe,
        createdAt: new Date(),
      })
      .returning();
    return globalTribe;
  }

  async getAllGlobalTribes(): Promise<GlobalTribe[]> {
    return await db
      .select()
      .from(globalTribes)
      .orderBy(asc(globalTribes.tribe));
  }

  async getGlobalTribeByName(tribe: string): Promise<GlobalTribe | undefined> {
    const [globalTribe] = await db
      .select()
      .from(globalTribes)
      .where(eq(globalTribes.tribe, tribe));
    return globalTribe;
  }

  // Global religions operations
  async addGlobalReligion(
    religion: InsertGlobalReligion,
  ): Promise<GlobalReligion> {
    const [globalReligion] = await db
      .insert(globalReligions)
      .values({
        ...religion,
        createdAt: new Date(),
      })
      .returning();
    return globalReligion;
  }

  async getAllGlobalReligions(): Promise<GlobalReligion[]> {
    return await db
      .select()
      .from(globalReligions)
      .orderBy(asc(globalReligions.religion));
  }

  async getGlobalReligionByName(
    religion: string,
  ): Promise<GlobalReligion | undefined> {
    const [globalReligion] = await db
      .select()
      .from(globalReligions)
      .where(eq(globalReligions.religion, religion));
    return globalReligion;
  }

  // Get all users for discover page (optimized approach - faster queries, separate interests fetch)
  async getDiscoverUsers(userId: number): Promise<User[]> {
    try {
      const startTime = Date.now();

      // Step 1: Get users who already have MEET interactions (matches or swipes) - fast subquery
      const existingInteractions = await db
        .select({ targetUserId: matches.userId2 })
        .from(matches)
        .where(
          and(
            eq(matches.userId1, userId),
            or(
              isNull(matches.metadata), // Legacy MEET matches
              sql`${matches.metadata}::jsonb->>'suiteType' IS NULL`, // Explicit MEET matches
              sql`${matches.metadata}::jsonb->'additionalConnections' ? 'MEET'`, // SUITE matches with MEET added
            ),
          ),
        )
        .union(
          db
            .select({ targetUserId: matches.userId1 })
            .from(matches)
            .where(
              and(
                eq(matches.userId2, userId),
                or(
                  isNull(matches.metadata),
                  sql`${matches.metadata}::jsonb->>'suiteType' IS NULL`,
                  sql`${matches.metadata}::jsonb->'additionalConnections' ? 'MEET'`,
                ),
              ),
            ),
        );

      const excludeUserIds = existingInteractions.map(
        (row) => row.targetUserId,
      );
      excludeUserIds.push(userId); // Also exclude current user

      // Step 2: Get users from MEET swipe history to exclude
      const swipeHistoryUsers = await db
        .select({ targetUserId: swipeHistory.targetUserId })
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.appMode, "MEET"),
          ),
        );

      // Add swipe history user IDs to exclusion list
      const swipeHistoryUserIds = swipeHistoryUsers.map(
        (row) => row.targetUserId,
      );
      excludeUserIds.push(...swipeHistoryUserIds);

      // Step 2: Get users not in exclude list - simple and fast
      const discoverUsers = await db
        .select()
        .from(users)
        .where(
          and(
            notInArray(
              users.id,
              excludeUserIds.length > 0 ? excludeUserIds : [0],
            ), // Exclude users with MEET interactions
            eq(users.profileHidden, false), // Only visible profiles
          ),
        )
        .orderBy(desc(users.lastActive))
        .limit(50);

      // Skip interests for speed - can be loaded separately
      const usersWithoutPasswords = discoverUsers.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          visibleInterests: [], // Empty for speed
        } as User;
      });

      const duration = Date.now() - startTime;
      console.log(
        `[DISCOVER-FILTERED] User ${userId}: Query completed in ${duration}ms, excluded ${excludeUserIds.length} users, returning ${usersWithoutPasswords.length} users`,
      );

      return usersWithoutPasswords;
    } catch (error) {
      console.error("Error in filtered getDiscoverUsers:", error);
      return [];
    }
  }

  // Potential matches
  async getPotentialMatches(userId: number): Promise<User[]> {
    // CROSS-CONTAMINATION FIX: Only consider MEET matches, exclude SUITE matches
    const userMatches = await this.getMeetMatchesByUserId(userId);
    const matchedUserIds = userMatches.map((match) =>
      match.userId1 === userId ? match.userId2 : match.userId1,
    );

    // Get users from the database
    let potentialUsers: User[] = [];
    if (matchedUserIds.length > 0) {
      // Build a set of conditions to exclude all matched users
      const conditions = matchedUserIds.map((matchId) => ne(users.id, matchId));
      // Add a condition to exclude the current user
      conditions.push(ne(users.id, userId));

      // Run the query with all conditions combined with AND
      potentialUsers = await db
        .select()
        .from(users)
        .where(and(...conditions));
    } else {
      // Simpler query if no matches exist yet
      potentialUsers = await db
        .select()
        .from(users)
        .where(ne(users.id, userId));
    }

    // If we have real users from the database, return them
    if (potentialUsers.length > 0) {
      return potentialUsers;
    }

    // Otherwise, create test users for swiping
    const currentTime = new Date();
    const testUsers: User[] = [
      {
        id: 1001,
        username: "kofi_accra",
        password: "hashed_password", // Not a real password since it's just for display
        fullName: "Kofi Mensah",
        email: "kofi.mensah@example.com",
        phoneNumber: "+233501234567",
        gender: "Male",
        location: "Accra, Ghana",
        countryOfOrigin: "Ghana",
        bio: "Software developer passionate about creating technologies that unite the Ghanaian diaspora. Love exploring coastal towns on weekends.",
        profession: "Software Engineer",
        ethnicity: "Ashanti",
        secondaryTribe: "Ga",
        religion: "Christian",
        photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        showProfilePhoto: true,
        dateOfBirth: new Date(1992, 5, 15),
        relationshipStatus: "Single",
        relationshipGoal: "Long-term relationship",
        interests: JSON.stringify([
          "Technology",
          "Coastal towns",
          "Software development",
        ]),
        visibilityPreferences: JSON.stringify({
          residence: true,
          countryOfOrigin: true,
          tribe: true,
          profession: true,
          religion: true,
          bio: true,
          relationshipStatus: true,
          relationshipGoal: true,
          interests: true,
        }),
        verifiedByPhone: true,
        twoFactorEnabled: true,
        profileHidden: false,
        ghostMode: false,
        isOnline: true,
        lastActive: currentTime,
        createdAt: currentTime,
        showAppModeSelection: true,
        showNationalitySelection: true,
        lastUsedApp: "dating",
      },
      {
        id: 1002,
        username: "abenaa_london",
        password: "hashed_password",
        fullName: "Abena Osei",
        email: "abena.osei@example.com",
        phoneNumber: "+447912345678",
        gender: "Female",
        location: "London, UK",
        countryOfOrigin: "Ghana",
        bio: "Medical doctor in London with roots in Ghana. Love cooking traditional Ghanaian meals and bringing people together through culture and food.",
        profession: "Medical Doctor",
        ethnicity: "Fante",
        secondaryTribe: "Ashanti",
        religion: "Christian",
        photoUrl: "https://randomuser.me/api/portraits/women/67.jpg",
        showProfilePhoto: true,
        dateOfBirth: new Date(1990, 2, 3),
        relationshipStatus: "Single",
        relationshipGoal: "Long-term relationship",
        interests: JSON.stringify(["Medicine", "Cooking", "Culture", "Food"]),
        visibilityPreferences: JSON.stringify({
          residence: true,
          countryOfOrigin: true,
          tribe: true,
          profession: true,
          religion: true,
          bio: true,
          relationshipStatus: true,
          relationshipGoal: true,
          interests: true,
        }),
        verifiedByPhone: true,
        twoFactorEnabled: true,
        profileHidden: false,
        ghostMode: false,
        isOnline: false,
        lastActive: new Date(currentTime.getTime() - 60 * 60 * 1000), // 1 hour ago
        createdAt: currentTime,
        showAppModeSelection: true,
        showNationalitySelection: true,
        lastUsedApp: "dating",
      },
      {
        id: 1003,
        username: "kwame_ny",
        password: "hashed_password",
        fullName: "Kwame Boateng",
        email: "kwame.boateng@example.com",
        phoneNumber: "+12125551234",
        gender: "Male",
        location: "New York, USA",
        countryOfOrigin: "Ghana",
        bio: "Fintech entrepreneur connecting Africa to global markets. Passionate about Ghanaian art and supporting talent from the motherland.",
        profession: "Entrepreneur",
        ethnicity: "Ga",
        secondaryTribe: "Ewe",
        religion: "Spiritual",
        photoUrl: "https://randomuser.me/api/portraits/men/59.jpg",
        showProfilePhoto: true,
        dateOfBirth: new Date(1988, 8, 22),
        relationshipStatus: "Single",
        relationshipGoal: "Serious dating",
        interests: JSON.stringify([
          "Fintech",
          "African art",
          "Entrepreneurship",
        ]),
        visibilityPreferences: JSON.stringify({
          residence: true,
          countryOfOrigin: true,
          tribe: true,
          profession: true,
          religion: true,
          bio: true,
          relationshipStatus: true,
          relationshipGoal: true,
          interests: true,
        }),
        verifiedByPhone: true,
        twoFactorEnabled: true,
        profileHidden: false,
        ghostMode: false,
        isOnline: true,
        lastActive: currentTime,
        createdAt: currentTime,
        showAppModeSelection: true,
        showNationalitySelection: true,
        lastUsedApp: "dating",
      },
      {
        id: 1004,
        username: "adwoa_kumasi",
        password: "hashed_password",
        fullName: "Adwoa Asamoah",
        email: "adwoa.asamoah@example.com",
        phoneNumber: "+233261234567",
        gender: "Female",
        location: "Kumasi, Ghana",
        countryOfOrigin: "Ghana",
        bio: "Fashion designer blending traditional Kente with modern styles. Looking for someone who appreciates both tradition and innovation.",
        profession: "Fashion Designer",
        ethnicity: "Ashanti",
        secondaryTribe: "Fante",
        religion: "Christian",
        photoUrl: "https://randomuser.me/api/portraits/women/16.jpg",
        showProfilePhoto: true,
        dateOfBirth: new Date(1993, 11, 5),
        relationshipStatus: "Single",
        relationshipGoal: "Long-term relationship",
        interests: JSON.stringify(["Fashion", "Kente", "Design", "Tradition"]),
        visibilityPreferences: JSON.stringify({
          residence: true,
          countryOfOrigin: true,
          tribe: true,
          profession: true,
          religion: true,
          bio: true,
          relationshipStatus: true,
          relationshipGoal: true,
          interests: true,
        }),
        verifiedByPhone: true,
        twoFactorEnabled: true,
        profileHidden: false,
        ghostMode: false,
        isOnline: true,
        lastActive: currentTime,
        createdAt: currentTime,
        showAppModeSelection: true,
        showNationalitySelection: true,
        lastUsedApp: "dating",
      },
      {
        id: 1005,
        username: "kwesi_toronto",
        password: "hashed_password",
        fullName: "Kwesi Adjei",
        email: "kwesi.adjei@example.com",
        phoneNumber: "+14165551234",
        gender: "Male",
        location: "Toronto, Canada",
        countryOfOrigin: "Ghana",
        bio: "University professor specializing in African diaspora studies. Love jazz music, contemporary art, and staying connected to my Ghanaian heritage.",
        profession: "Professor",
        ethnicity: "Ewe",
        secondaryTribe: "Ga",
        religion: "Spiritual",
        photoUrl: "https://randomuser.me/api/portraits/men/85.jpg",
        showProfilePhoto: true,
        dateOfBirth: new Date(1985, 3, 18),
        relationshipStatus: "Single",
        relationshipGoal: "Serious dating",
        interests: JSON.stringify([
          "Jazz",
          "Art",
          "African diaspora",
          "Academia",
        ]),
        visibilityPreferences: JSON.stringify({
          residence: true,
          countryOfOrigin: true,
          tribe: true,
          profession: true,
          religion: true,
          bio: true,
          relationshipStatus: true,
          relationshipGoal: true,
          interests: true,
        }),
        verifiedByPhone: true,
        twoFactorEnabled: true,
        profileHidden: false,
        ghostMode: false,
        isOnline: false,
        lastActive: new Date(currentTime.getTime() - 120 * 60 * 1000), // 2 hours ago
        createdAt: currentTime,
        showAppModeSelection: true,
        showNationalitySelection: true,
        lastUsedApp: "dating",
      },
    ];

    return testUsers;
  }

  // User online status
  async updateUserOnlineStatus(
    userId: number | null,
    isOnline: boolean,
  ): Promise<User | undefined> {
    if (userId === null) return undefined;

    // Get user to check Ghost Mode status
    const user = await this.getUser(userId);
    if (!user) return undefined;

    // If user has Ghost Mode enabled, always set isOnline to false for others to see
    // But still update lastActive for internal tracking
    const visibleOnlineStatus = user.ghostMode ? false : isOnline;

    const updateData = {
      isOnline: visibleOnlineStatus,
      lastActive: new Date(),
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserOnlineStatus(userId: number | null): Promise<boolean> {
    if (userId === null) return false;

    const user = await this.getUser(userId);
    if (!user) return false;

    // If user has Ghost Mode enabled, always return false (appear offline)
    if (user.ghostMode) return false;

    return user.isOnline || false;
  }

  // Typing status
  async updateTypingStatus(
    userId: number,
    matchId: number,
    isTyping: boolean,
  ): Promise<TypingStatus> {
    // Get user to check Ghost Mode status
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // If user has Ghost Mode enabled, never show typing indicators to others
    const visibleTypingStatus = user.ghostMode ? false : isTyping;

    // First check if a typing status record exists
    const existingStatus = await db
      .select()
      .from(typingStatus)
      .where(
        and(eq(typingStatus.userId, userId), eq(typingStatus.matchId, matchId)),
      );

    if (existingStatus.length > 0) {
      // Update existing record
      const [updatedStatus] = await db
        .update(typingStatus)
        .set({
          isTyping: visibleTypingStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(typingStatus.userId, userId),
            eq(typingStatus.matchId, matchId),
          ),
        )
        .returning();
      return updatedStatus;
    } else {
      // Create new record
      const [newStatus] = await db
        .insert(typingStatus)
        .values({
          userId,
          matchId,
          isTyping: visibleTypingStatus,
          updatedAt: new Date(),
        })
        .returning();
      return newStatus;
    }
  }

  async getTypingStatus(matchId: number): Promise<TypingStatus[]> {
    return await db
      .select()
      .from(typingStatus)
      .where(eq(typingStatus.matchId, matchId));
  }

  // Video call operations
  async createVideoCall(videoCall: InsertVideoCall): Promise<VideoCall> {
    const [newVideoCall] = await db
      .insert(videoCalls)
      .values({
        ...videoCall,
        status: videoCall.status || "pending",
        createdAt: new Date(),
      })
      .returning();
    return newVideoCall;
  }

  async getVideoCallById(id: number): Promise<VideoCall | undefined> {
    const [videoCall] = await db
      .select()
      .from(videoCalls)
      .where(eq(videoCalls.id, id));
    return videoCall;
  }

  async updateVideoCallStatus(
    id: number,
    updates: { status: string; startedAt?: Date; endedAt?: Date },
  ): Promise<VideoCall | undefined> {
    const [updatedVideoCall] = await db
      .update(videoCalls)
      .set(updates)
      .where(eq(videoCalls.id, id))
      .returning();
    return updatedVideoCall;
  }

  async getVideoCallsByUserId(userId: number): Promise<VideoCall[]> {
    return await db
      .select()
      .from(videoCalls)
      .where(
        or(
          eq(videoCalls.initiatorId, userId),
          eq(videoCalls.receiverId, userId),
        ),
      );
  }

  // User photos operations for MEET dating app
  async addUserPhoto(photo: InsertUserPhoto): Promise<UserPhoto> {
    // If this is the first photo or marked as primary, make sure it's the only primary
    if (photo.isPrimary) {
      // Reset all existing primary photos for this user
      await db
        .update(userPhotos)
        .set({ isPrimary: false })
        .where(eq(userPhotos.userId, photo.userId));
    }

    // Check if this is the first photo for the user
    const userPhotosCount = await db
      .select({ count: count() })
      .from(userPhotos)
      .where(eq(userPhotos.userId, photo.userId));

    const isFirstPhoto =
      userPhotosCount.length === 0 || userPhotosCount[0].count === 0;

    // If it's the first photo, make it primary regardless of input
    const photoToInsert = {
      ...photo,
      isPrimary: isFirstPhoto ? true : photo.isPrimary,
    };

    const [newPhoto] = await db
      .insert(userPhotos)
      .values(photoToInsert)
      .returning();

    // If this is the first photo or marked as primary, update the user's main photo
    if (newPhoto.isPrimary) {
      await this.updateUserProfile(photo.userId, {
        photoUrl: newPhoto.photoUrl,
      });
    }

    return newPhoto;
  }

  async getUserPhotos(userId: number): Promise<UserPhoto[]> {
    return await db
      .select()
      .from(userPhotos)
      .where(eq(userPhotos.userId, userId))
      .orderBy(desc(userPhotos.isPrimary), asc(userPhotos.createdAt));
  }

  async getUserPhotoById(id: number): Promise<UserPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(userPhotos)
      .where(eq(userPhotos.id, id));
    return photo;
  }

  async updateUserPhoto(
    id: number,
    updates: { photoUrl?: string },
  ): Promise<UserPhoto | undefined> {
    try {
      // Get the photo first to check if it exists
      const photo = await this.getUserPhotoById(id);
      if (!photo) return undefined;

      // Update the photo
      const [updatedPhoto] = await db
        .update(userPhotos)
        .set({ photoUrl: updates.photoUrl })
        .where(eq(userPhotos.id, id))
        .returning();

      // If this is a primary photo, also update the user's profile photoUrl
      if (updatedPhoto.isPrimary) {
        await this.updateUserProfile(updatedPhoto.userId, {
          photoUrl: updates.photoUrl,
        });
      }

      return updatedPhoto;
    } catch (error) {
      console.error(`Error updating photo ${id}:`, error);
      return undefined;
    }
  }

  // Note: Primary implementation of addUserPhoto is already defined above

  async deleteUserPhoto(id: number): Promise<void> {
    // Get the photo to check if it's primary
    const [photo] = await db
      .select()
      .from(userPhotos)
      .where(eq(userPhotos.id, id));

    if (!photo) return;

    // Delete the photo
    await db.delete(userPhotos).where(eq(userPhotos.id, id));

    // If this was the primary photo, set another photo as primary
    if (photo.isPrimary) {
      // Find another photo for this user
      const [anotherPhoto] = await db
        .select()
        .from(userPhotos)
        .where(eq(userPhotos.userId, photo.userId))
        .limit(1);

      if (anotherPhoto) {
        // Set as primary
        await this.setPrimaryPhoto(anotherPhoto.id, photo.userId);
      } else {
        // No more photos, clear the user's main photo
        await this.updateUserProfile(photo.userId, { photoUrl: null });
      }
    }
  }

  async setPrimaryPhoto(id: number, userId: number): Promise<UserPhoto> {
    try {
      // First verify that the photo exists and belongs to the user
      const [photo] = await db
        .select()
        .from(userPhotos)
        .where(and(eq(userPhotos.id, id), eq(userPhotos.userId, userId)));

      if (!photo) {
        throw new Error("Photo not found or does not belong to the user");
      }

      // Reset all primary photos for this user
      await db
        .update(userPhotos)
        .set({ isPrimary: false })
        .where(eq(userPhotos.userId, userId));

      // Set the selected photo as primary
      const [updatedPhoto] = await db
        .update(userPhotos)
        .set({ isPrimary: true })
        .where(eq(userPhotos.id, id))
        .returning();

      // Update the user's main photo URL
      if (updatedPhoto) {
        await this.updateUserProfile(userId, {
          photoUrl: updatedPhoto.photoUrl,
        });
      }

      return updatedPhoto;
    } catch (error) {
      console.error(
        `Error setting primary photo (id: ${id} for user: ${userId}):`,
        error,
      );
      throw error;
    }
  }

  // Section-specific primary photo management
  async updateSectionPrimaryPhoto(
    userId: number,
    photoId: number,
    section: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify photo belongs to user
      const [photo] = await db
        .select()
        .from(userPhotos)
        .where(and(eq(userPhotos.id, photoId), eq(userPhotos.userId, userId)));

      if (!photo) {
        return {
          success: false,
          error: "Photo not found or doesn't belong to user",
        };
      }

      // Build update object based on section
      const sectionFieldMap: Record<string, string> = {
        meet: "isPrimaryForMeet",
        job: "isPrimaryForJob",
        mentorship: "isPrimaryForMentorship",
        networking: "isPrimaryForNetworking",
      };

      const fieldName = sectionFieldMap[section];
      if (!fieldName) {
        return { success: false, error: "Invalid section" };
      }

      // Reset all primary photos for this section for this user
      const resetUpdate: any = {};
      resetUpdate[fieldName] = false;

      await db
        .update(userPhotos)
        .set(resetUpdate)
        .where(eq(userPhotos.userId, userId));

      // Set the selected photo as primary for this section
      const setPrimaryUpdate: any = {};
      setPrimaryUpdate[fieldName] = true;

      await db
        .update(userPhotos)
        .set(setPrimaryUpdate)
        .where(eq(userPhotos.id, photoId));

      return { success: true };
    } catch (error) {
      console.error(`Error updating section primary photo:`, error);
      return { success: false, error: "Database error occurred" };
    }
  }

  async getUserPhotosWithSectionPrimary(
    userId: number,
    section: string,
  ): Promise<UserPhoto[]> {
    return await db
      .select()
      .from(userPhotos)
      .where(eq(userPhotos.userId, userId))
      .orderBy(asc(userPhotos.createdAt));
  }

  async getSectionPrimaryPhoto(
    userId: number,
    section: string,
  ): Promise<UserPhoto | undefined> {
    const sectionFieldMap: Record<string, any> = {
      meet: userPhotos.isPrimaryForMeet,
      job: userPhotos.isPrimaryForJob,
      mentorship: userPhotos.isPrimaryForMentorship,
      networking: userPhotos.isPrimaryForNetworking,
    };

    const field = sectionFieldMap[section];
    if (!field) return undefined;

    const [photo] = await db
      .select()
      .from(userPhotos)
      .where(and(eq(userPhotos.userId, userId), eq(field, true)))
      .limit(1);

    return photo;
  }

  // Get the lastActive timestamp for a user
  async getUserLastActive(userId: number | null): Promise<Date | null> {
    if (userId === null) return null;

    const user = await this.getUser(userId);
    return user?.lastActive || null;
  }

  // Methods for chat activity status
  async updateActiveChatStatus(
    userId: number,
    matchId: number,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      if (isActive) {
        // Check if a record already exists
        const result = await db.execute(
          sql`INSERT INTO active_chats (user_id, match_id, is_active, updated_at) 
              VALUES (${userId}, ${matchId}, ${isActive}, NOW()) 
              ON CONFLICT (user_id, match_id) 
              DO UPDATE SET is_active = ${isActive}, updated_at = NOW()`,
        );
      } else {
        // Just update the existing record to inactive
        await db.execute(
          sql`UPDATE active_chats 
              SET is_active = ${isActive}, updated_at = NOW() 
              WHERE user_id = ${userId} AND match_id = ${matchId}`,
        );
      }
      return true;
    } catch (error) {
      console.error(
        `Error updating active chat status for user ${userId} in match ${matchId}:`,
        error,
      );
      return false;
    }
  }

  async getActiveChatStatus(userId: number, matchId: number): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT is_active FROM active_chats 
            WHERE user_id = ${userId} AND match_id = ${matchId} 
            AND is_active = true 
            AND updated_at > NOW() - INTERVAL '5 minutes'`,
      );

      // If there's a result and it's active, return true
      return result.rows.length > 0;
    } catch (error) {
      console.error(
        `Error getting active chat status for user ${userId} in match ${matchId}:`,
        error,
      );
      return false;
    }
  }

  async getUsersInActiveChat(matchId: number): Promise<number[]> {
    try {
      const result = await db.execute(
        sql`SELECT user_id FROM active_chats 
            WHERE match_id = ${matchId} 
            AND is_active = true 
            AND updated_at > NOW() - INTERVAL '5 minutes'`,
      );

      // Extract user IDs from the result
      return result.rows.map((row) => Number(row.user_id));
    } catch (error) {
      console.error(
        `Error getting users in active chat for match ${matchId}:`,
        error,
      );
      return [];
    }
  }

  // Message reactions methods
  async addMessageReaction(
    reaction: InsertMessageReaction,
  ): Promise<MessageReaction> {
    try {
      // 🎯 SURGICAL FIX: First remove any existing reaction from the same user on the same message
      // This ensures users can only have ONE reaction per message (replacement behavior)
      console.log(
        `🔄 [REACTION-DEBUG] Checking for existing reactions from user ${reaction.userId} on message ${reaction.messageId} with emoji ${reaction.emoji}`,
      );

      const existingReactions = await db
        .select()
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, reaction.messageId),
            eq(messageReactions.userId, reaction.userId),
          ),
        );

      console.log(
        `🔍 [REACTION-DEBUG] Found ${existingReactions.length} existing reactions:`,
        existingReactions.map((r) => `${r.emoji} (id: ${r.id})`),
      );

      // If user already has a reaction on this message, remove it first
      if (existingReactions.length > 0) {
        console.log(
          `🗑️ [REACTION-DEBUG] Removing ${existingReactions.length} existing reaction(s) from user ${reaction.userId} on message ${reaction.messageId}`,
        );

        const deleteResult = await db
          .delete(messageReactions)
          .where(
            and(
              eq(messageReactions.messageId, reaction.messageId),
              eq(messageReactions.userId, reaction.userId),
            ),
          )
          .returning();

        console.log(
          `✅ [REACTION-DEBUG] Successfully removed ${deleteResult.length} reaction(s). Now adding new reaction: ${reaction.emoji}`,
        );
      } else {
        console.log(
          `➕ [REACTION-DEBUG] No existing reactions found. Adding first reaction: ${reaction.emoji}`,
        );
      }

      // Now add the new reaction (this will be the user's ONLY reaction on this message)
      const [newReaction] = await db
        .insert(messageReactions)
        .values(reaction)
        .returning();

      if (!newReaction) {
        throw new Error("Failed to insert new reaction");
      }

      console.log(
        `🎉 Successfully added reaction ${reaction.emoji} for user ${reaction.userId} on message ${reaction.messageId}`,
      );
      return newReaction;
    } catch (error) {
      console.error("Error adding message reaction:", error);
      throw error;
    }
  }

  async removeMessageReaction(
    messageId: number,
    userId: number,
    emoji: string,
  ): Promise<void> {
    try {
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.emoji, emoji),
          ),
        );
    } catch (error) {
      console.error("Error removing message reaction:", error);
      throw error;
    }
  }

  async getMessageReactions(messageId: number): Promise<MessageReaction[]> {
    try {
      return await db
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, messageId))
        .orderBy(asc(messageReactions.createdAt));
    } catch (error) {
      console.error("Error getting message reactions:", error);
      return [];
    }
  }

  async getMessageReactionsByMatch(
    matchId: number,
  ): Promise<MessageReaction[]> {
    try {
      return await db
        .select({
          id: messageReactions.id,
          messageId: messageReactions.messageId,
          userId: messageReactions.userId,
          emoji: messageReactions.emoji,
          createdAt: messageReactions.createdAt,
        })
        .from(messageReactions)
        .innerJoin(messages, eq(messageReactions.messageId, messages.id))
        .where(eq(messages.matchId, matchId))
        .orderBy(asc(messageReactions.createdAt));
    } catch (error) {
      console.error("Error getting message reactions by match:", error);
      return [];
    }
  }

  // Auto-delete functionality methods
  async getUserMatchSettings(
    userId: number,
    matchId: number,
  ): Promise<UserMatchSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(userMatchSettings)
        .where(
          and(
            eq(userMatchSettings.userId, userId),
            eq(userMatchSettings.matchId, matchId),
          ),
        );
      return settings;
    } catch (error) {
      console.error("Error getting user match settings:", error);
      return undefined;
    }
  }

  async updateUserMatchSettings(
    userId: number,
    matchId: number,
    settings: Partial<InsertUserMatchSettings>,
  ): Promise<UserMatchSettings> {
    try {
      // Use upsert to insert or update settings
      const [updatedSettings] = await db
        .insert(userMatchSettings)
        .values({
          userId,
          matchId,
          ...settings,
        })
        .onConflictDoUpdate({
          target: [userMatchSettings.userId, userMatchSettings.matchId],
          set: {
            ...settings,
          },
        })
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error("Error updating user match settings:", error);
      throw error;
    }
  }

  async deleteMessagesForUser(userId: number, matchId: number): Promise<void> {
    try {
      // Get the user's auto-delete settings to check when "always" mode was activated
      const settings = await this.getUserMatchSettings(userId, matchId);

      if (!settings || settings.autoDeleteMode !== "always") {
        console.log(
          `No "always" mode deletion needed for user ${userId} in match ${matchId}`,
        );
        return;
      }

      // Delete all messages for this user in this match when in "always" mode
      console.log(
        `Deleting messages for user ${userId} in match ${matchId} in "always" mode`,
      );

      await db
        .update(messages)
        .set({ deletedForUserId: userId })
        .where(
          and(
            eq(messages.matchId, matchId),
            or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
          ),
        );

      console.log(
        `Successfully marked messages as deleted for user ${userId} in match ${matchId}`,
      );
    } catch (error) {
      console.error("Error deleting messages for user:", error);
      throw error;
    }
  }

  async scheduleMessageDeletion(
    messageId: number,
    deleteAt: Date,
    mode: string,
  ): Promise<void> {
    try {
      await db
        .update(messages)
        .set({
          autoDeleteScheduledAt: deleteAt,
          autoDeleteModeWhenSent: mode,
        })
        .where(eq(messages.id, messageId));
    } catch (error) {
      console.error("Error scheduling message deletion:", error);
      throw error;
    }
  }

  async processAutoDeleteMessages(): Promise<void> {
    try {
      const now = new Date();

      // Find messages that are scheduled for deletion and past their deletion time
      const messagesToDelete = await db
        .select()
        .from(messages)
        .where(
          and(
            sql`${messages.autoDeleteScheduledAt} IS NOT NULL`,
            sql`${messages.autoDeleteScheduledAt} <= ${now.toISOString()}`,
          ),
        );

      for (const message of messagesToDelete) {
        if (message.autoDeleteModeWhenSent === "always") {
          // For 'always' mode, hard delete the message
          await db.delete(messages).where(eq(messages.id, message.id));
        } else {
          // For other modes, mark as deleted for the sender
          await db
            .update(messages)
            .set({ deletedForUserId: message.senderId })
            .where(eq(messages.id, message.id));
        }
      }

      console.log(`Processed ${messagesToDelete.length} auto-delete messages`);
    } catch (error) {
      console.error("Error processing auto-delete messages:", error);
    }
  }

  /**
   * Mark a message as deleted for a specific user (recipient-side deletion)
   * This allows recipients to hide messages from their view without affecting the sender
   */
  async markMessageAsDeletedForUser(
    messageId: number,
    userId: number,
  ): Promise<void> {
    try {
      await db
        .update(messages)
        .set({ deletedForUserId: userId })
        .where(eq(messages.id, messageId));

      console.log(`Message ${messageId} marked as deleted for user ${userId}`);
    } catch (error) {
      console.error("Error marking message as deleted for user:", error);
      throw error;
    }
  }

  // ===================================
  // SUITE PROFILE SYSTEM METHODS
  // ===================================

  // ===== SUITE PROFILE SETTINGS =====
  async getSuiteProfileSettings(
    userId: number,
  ): Promise<SuiteProfileSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(suiteProfileSettings)
        .where(eq(suiteProfileSettings.userId, userId));
      return settings;
    } catch (error) {
      console.error("Error getting SUITE profile settings:", error);
      return undefined;
    }
  }

  async updateSuiteProfileSettings(
    userId: number,
    settings: Partial<InsertSuiteProfileSettings>,
  ): Promise<SuiteProfileSettings> {
    try {
      const [updatedSettings] = await db
        .insert(suiteProfileSettings)
        .values({
          userId,
          ...settings,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [suiteProfileSettings.userId],
          set: {
            ...settings,
            updatedAt: new Date(),
          },
        })
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error("Error updating SUITE profile settings:", error);
      throw error;
    }
  }

  // ===== JOB PROFILE METHODS =====
  async getSuiteJobProfile(
    userId: number,
  ): Promise<SuiteJobProfile | undefined> {
    try {
      const [jobProfile] = await db
        .select()
        .from(suiteJobProfiles)
        .where(
          and(
            eq(suiteJobProfiles.userId, userId),
            eq(suiteJobProfiles.isActive, true),
          ),
        );
      return jobProfile;
    } catch (error) {
      console.error("Error getting job profile:", error);
      return undefined;
    }
  }

  async createOrUpdateSuiteJobProfile(
    userId: number,
    jobProfileData: Partial<InsertSuiteJobProfile>,
  ): Promise<SuiteJobProfile> {
    try {
      console.log("Creating/updating job profile for user:", userId);
      console.log("Job profile data:", jobProfileData);

      // First, deactivate any existing job profile
      await db
        .update(suiteJobProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(suiteJobProfiles.userId, userId));

      // Check if there's any existing job profile (active or inactive) to update
      const [existingProfile] = await db
        .select()
        .from(suiteJobProfiles)
        .where(eq(suiteJobProfiles.userId, userId))
        .orderBy(sql`${suiteJobProfiles.createdAt} DESC`)
        .limit(1);

      if (existingProfile) {
        // Update the most recent job profile - PRESERVE existing fields and only update provided ones
        const cleanData = { ...jobProfileData };
        delete (cleanData as any).createdAt;
        delete (cleanData as any).updatedAt;
        delete (cleanData as any).id;

        // Build update object that only includes non-null/non-undefined fields
        const updateObject: any = {
          isActive: true, // Reactivate this profile
          updatedAt: new Date(),
        };

        // Only include fields that are explicitly provided (not null/undefined)
        Object.entries(cleanData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            updateObject[key] = value;
          }
        });

        console.log(
          "Storage layer: Updating most recent job profile with:",
          Object.keys(updateObject),
        );
        console.log("Storage layer: Update object:", updateObject);

        const [updatedProfile] = await db
          .update(suiteJobProfiles)
          .set(updateObject)
          .where(eq(suiteJobProfiles.id, existingProfile.id))
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when they change in job profile
        if (
          updateObject.highSchool !== undefined ||
          updateObject.collegeUniversity !== undefined
        ) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from job profile",
          );
          const userUpdateData: any = {};

          if (updateObject.highSchool !== undefined) {
            userUpdateData.highSchool = updateObject.highSchool;
          }
          if (updateObject.collegeUniversity !== undefined) {
            userUpdateData.collegeUniversity = updateObject.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        console.log("Updated job profile:", updatedProfile);
        return updatedProfile;
      } else {
        // Create new job profile with proper defaults
        const defaultVisibilityPreferences = JSON.stringify({
          showProfilePhoto: true,
          jobTitle: true,
          location: true,
          workType: true,
          jobType: true,
          experienceLevel: true,
          skills: true,
          company: true,
          compensation: true,
          description: true,
          requirements: true,
          whyItMatters: true,
          whoShouldApply: true,
          culturalFit: true,
          areasOfExpertise: true,
          industryTags: true,
          applicationUrl: true,
          applicationEmail: true,
          applicationInstructions: true,
        });

        const profileToInsert = {
          userId,
          role: jobProfileData.role,
          jobTitle: jobProfileData.jobTitle,
          description: jobProfileData.description,
          workType: jobProfileData.workType,
          jobType: jobProfileData.jobType,
          company: jobProfileData.company,
          compensation: jobProfileData.compensation,
          compensationCurrency: jobProfileData.compensationCurrency,
          compensationPeriod: jobProfileData.compensationPeriod,
          salary: jobProfileData.salary,
          salaryCurrency: jobProfileData.salaryCurrency,
          salaryPeriod: jobProfileData.salaryPeriod,
          requirements: jobProfileData.requirements,
          location: jobProfileData.location,
          experienceLevel: jobProfileData.experienceLevel,
          whyItMatters: jobProfileData.whyItMatters,
          whoShouldApply: jobProfileData.whoShouldApply,
          culturalFit: jobProfileData.culturalFit,
          areasOfExpertise: jobProfileData.areasOfExpertise,
          industryTags: jobProfileData.industryTags,
          skillTags: jobProfileData.skillTags,
          applicationUrl: jobProfileData.applicationUrl,
          applicationEmail: jobProfileData.applicationEmail,
          applicationInstructions: jobProfileData.applicationInstructions,
          expiresAt: jobProfileData.expiresAt,
          visibilityPreferences:
            jobProfileData.visibilityPreferences ||
            defaultVisibilityPreferences,
          isActive: true,
        };

        const [newProfile] = await db
          .insert(suiteJobProfiles)
          .values(profileToInsert)
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when they exist in new job profile
        if (profileToInsert.highSchool || profileToInsert.collegeUniversity) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from new job profile",
          );
          const userUpdateData: any = {};

          if (profileToInsert.highSchool) {
            userUpdateData.highSchool = profileToInsert.highSchool;
          }
          if (profileToInsert.collegeUniversity) {
            userUpdateData.collegeUniversity =
              profileToInsert.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        console.log("Created new job profile:", newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error("Error creating/updating job profile:", error);
      console.error("Error details:", (error as Error).message);
      throw error;
    }
  }

  async getDiscoveryJobProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Array<SuiteJobProfile & { user: User }>> {
    try {
      const jobProfiles = await db
        .select({
          // Job profile fields
          id: suiteJobProfiles.id,
          userId: suiteJobProfiles.userId,
          role: suiteJobProfiles.role,
          jobTitle: suiteJobProfiles.jobTitle,
          company: suiteJobProfiles.company,
          description: suiteJobProfiles.description,
          compensation: suiteJobProfiles.compensation,
          salary: suiteJobProfiles.salary, // Add missing salary field
          requirements: suiteJobProfiles.requirements,
          location: suiteJobProfiles.location,
          workType: suiteJobProfiles.workType,
          jobType: suiteJobProfiles.jobType,
          experienceLevel: suiteJobProfiles.experienceLevel,
          whyItMatters: suiteJobProfiles.whyItMatters,
          whoShouldApply: suiteJobProfiles.whoShouldApply,
          culturalFit: suiteJobProfiles.culturalFit,
          industryTags: suiteJobProfiles.industryTags,
          skillTags: suiteJobProfiles.skillTags,
          applicationUrl: suiteJobProfiles.applicationUrl,
          applicationEmail: suiteJobProfiles.applicationEmail,
          applicationInstructions: suiteJobProfiles.applicationInstructions,
          visibilityPreferences: suiteJobProfiles.visibilityPreferences, // Add missing visibility field
          isActive: suiteJobProfiles.isActive,
          expiresAt: suiteJobProfiles.expiresAt,
          createdAt: suiteJobProfiles.createdAt,
          updatedAt: suiteJobProfiles.updatedAt,
          // User fields
          user: {
            id: users.id,
            fullName: users.fullName,
            photoUrl: users.photoUrl,
            profession: users.profession,
            location: users.location,
            isVerified: users.isVerified,
          },
        })
        .from(suiteJobProfiles)
        .innerJoin(users, eq(suiteJobProfiles.userId, users.id))
        .innerJoin(
          suiteProfileSettings,
          eq(users.id, suiteProfileSettings.userId),
        )
        .where(
          and(
            ne(suiteJobProfiles.userId, userId), // Exclude current user
            eq(suiteJobProfiles.isActive, true),
            eq(suiteProfileSettings.hiddenInJobDiscovery, false),
            // COMPLETE BIDIRECTIONAL FILTERING: Use efficient SQL NOT EXISTS clauses like networking/mentorship
            // 1. Exclude profiles current user has already swiped on
            sql`NOT EXISTS (
              SELECT 1 FROM suite_job_applications sja1
              WHERE sja1.user_id = ${userId} 
              AND sja1.target_profile_id = suite_job_profiles.id
            )`,
            // 2. Exclude profiles owned by users who have already swiped on current user's profile
            sql`NOT EXISTS (
              SELECT 1 FROM suite_job_applications sja2
              WHERE sja2.user_id = suite_job_profiles.user_id 
              AND sja2.target_user_id = ${userId}
            )`,
            // 3. Exclude profiles for users in swipe history for SUITE_JOBS
            sql`NOT EXISTS (
              SELECT 1 FROM swipe_history sh
              WHERE sh.user_id = ${userId} 
              AND sh.target_user_id = suite_job_profiles.user_id
              AND sh.app_mode = 'SUITE_JOBS'
            )`,
            or(
              sql`${suiteJobProfiles.expiresAt} IS NULL`,
              sql`${suiteJobProfiles.expiresAt} > NOW()`,
            ),
          ),
        )
        .orderBy(desc(suiteJobProfiles.createdAt))
        .limit(limit)
        .offset(offset);

      // Transform profiles to include job-specific primary photos and field visibility
      const transformedProfiles = await Promise.all(
        jobProfiles.map(async (profile) => {
          // Parse field visibility preferences
          let fieldVisibility: any = {};
          if (profile.visibilityPreferences) {
            try {
              fieldVisibility = JSON.parse(profile.visibilityPreferences);
            } catch (error) {
              console.error(
                `Error parsing job visibility preferences for user ${profile.userId}:`,
                error,
              );
            }
          }

          // Fetch job-specific primary photo
          let jobPrimaryPhotoUrl: string | null = null;
          try {
            const jobPhotos = await db
              .select()
              .from(userPhotos)
              .where(
                and(
                  eq(userPhotos.userId, profile.userId),
                  eq(userPhotos.isPrimaryForJob, true),
                ),
              )
              .limit(1);

            if (jobPhotos.length > 0) {
              jobPrimaryPhotoUrl = jobPhotos[0].photoUrl;
            }
          } catch (error) {
            console.error(
              `Error fetching job primary photo for user ${profile.userId}:`,
              error,
            );
          }

          return {
            ...profile,
            fieldVisibility,
            jobPrimaryPhotoUrl,
          };
        }),
      );

      return transformedProfiles as Array<
        SuiteJobProfile & {
          user: User;
          fieldVisibility: any;
          jobPrimaryPhotoUrl: string | null;
        }
      >;
    } catch (error) {
      console.error("Error getting discovery job profiles:", error);
      return [];
    }
  }

  async getSuiteJobProfileById(
    profileId: number,
  ): Promise<SuiteJobProfile | undefined> {
    try {
      const [jobProfile] = await db
        .select()
        .from(suiteJobProfiles)
        .where(
          and(
            eq(suiteJobProfiles.id, profileId),
            eq(suiteJobProfiles.isActive, true),
          ),
        );
      return jobProfile;
    } catch (error) {
      console.error("Error getting job profile by ID:", error);
      return undefined;
    }
  }

  async getSuiteJobProfileByUserId(
    userId: number,
  ): Promise<SuiteJobProfile | undefined> {
    try {
      const [jobProfile] = await db
        .select()
        .from(suiteJobProfiles)
        .where(
          and(
            eq(suiteJobProfiles.userId, userId),
            eq(suiteJobProfiles.isActive, true),
          ),
        );
      return jobProfile;
    } catch (error) {
      console.error("Error getting job profile by user ID:", error);
      return undefined;
    }
  }

  async updateSuiteJobProfileVisibility(
    userId: number,
    visibilityPreferences: string,
  ): Promise<SuiteJobProfile | undefined> {
    try {
      const [updatedProfile] = await db
        .update(suiteJobProfiles)
        .set({
          visibilityPreferences,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(suiteJobProfiles.userId, userId),
            eq(suiteJobProfiles.isActive, true),
          ),
        )
        .returning();

      return updatedProfile;
    } catch (error) {
      console.error("Error updating job profile visibility:", error);
      throw error;
    }
  }

  async deleteSuiteJobProfile(userId: number): Promise<void> {
    try {
      // Actually delete the record from the database
      await db
        .delete(suiteJobProfiles)
        .where(eq(suiteJobProfiles.userId, userId));

      console.log("Job profile deleted successfully for user:", userId);
    } catch (error) {
      console.error("Error deleting job profile:", error);
      throw error;
    }
  }

  // ===== MENTORSHIP PROFILE METHODS =====
  async getSuiteMentorshipProfile(
    userId: number,
    role?: string,
  ): Promise<SuiteMentorshipProfile | undefined> {
    try {
      const conditions = [
        eq(suiteMentorshipProfiles.userId, userId),
        eq(suiteMentorshipProfiles.isActive, true),
      ];

      if (role) {
        conditions.push(eq(suiteMentorshipProfiles.role, role));
      }

      // Join with users table to get education fields
      const [result] = await db
        .select({
          // Include all mentorship profile fields
          ...suiteMentorshipProfiles,
          // Override education fields with data from users table for sync
          userHighSchool: users.highSchool,
          userCollegeUniversity: users.collegeUniversity,
        })
        .from(suiteMentorshipProfiles)
        .innerJoin(users, eq(users.id, suiteMentorshipProfiles.userId))
        .where(and(...conditions));

      if (!result) {
        return undefined;
      }

      // Merge user education fields into the profile
      const mentorshipProfile = {
        ...result,
        // Use education fields from users table if available, fallback to profile fields
        highSchool: result.userHighSchool || result.highSchool,
        collegeUniversity:
          result.userCollegeUniversity || result.collegeUniversity,
        // Remove the temporary fields
        userHighSchool: undefined,
        userCollegeUniversity: undefined,
      };

      return mentorshipProfile;
    } catch (error) {
      console.error("Error getting mentorship profile:", error);
      return undefined;
    }
  }

  async getSuiteMentorshipProfileById(
    profileId: number,
  ): Promise<SuiteMentorshipProfile | undefined> {
    try {
      const [mentorshipProfile] = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(
          and(
            eq(suiteMentorshipProfiles.id, profileId),
            eq(suiteMentorshipProfiles.isActive, true),
          ),
        );
      return mentorshipProfile;
    } catch (error) {
      console.error("Error getting mentorship profile by ID:", error);
      return undefined;
    }
  }

  async getSuiteMentorshipProfileByRole(
    userId: number,
    role: string,
  ): Promise<SuiteMentorshipProfile | undefined> {
    try {
      const [mentorshipProfile] = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(
          and(
            eq(suiteMentorshipProfiles.userId, userId),
            eq(suiteMentorshipProfiles.role, role),
            eq(suiteMentorshipProfiles.isActive, true),
          ),
        );
      return mentorshipProfile;
    } catch (error) {
      console.error("Error getting mentorship profile by role:", error);
      return undefined;
    }
  }

  async getSuiteMentorshipProfiles(
    userId: number,
  ): Promise<SuiteMentorshipProfile[]> {
    try {
      const mentorshipProfiles = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(
          and(
            eq(suiteMentorshipProfiles.userId, userId),
            eq(suiteMentorshipProfiles.isActive, true),
          ),
        );
      return mentorshipProfiles;
    } catch (error) {
      console.error("Error getting mentorship profiles:", error);
      return [];
    }
  }

  async deleteSuiteMentorshipProfile(
    userId: number,
    role?: string,
  ): Promise<void> {
    try {
      const conditions = [eq(suiteMentorshipProfiles.userId, userId)];

      if (role) {
        conditions.push(eq(suiteMentorshipProfiles.role, role));
      }

      // Actually delete the record from the database
      await db.delete(suiteMentorshipProfiles).where(and(...conditions));

      console.log(
        `Mentorship profile${role ? ` (${role})` : "s"} permanently deleted for user:`,
        userId,
      );
    } catch (error) {
      console.error("Error deleting mentorship profile:", error);
      throw error;
    }
  }

  async createOrUpdateSuiteMentorshipProfile(
    userId: number,
    mentorshipProfileData: Partial<InsertSuiteMentorshipProfile>,
  ): Promise<SuiteMentorshipProfile> {
    try {
      console.log("Creating/updating mentorship profile for user:", userId);
      console.log("Mentorship profile data:", mentorshipProfileData);

      const role = mentorshipProfileData.role || "mentor";

      // First, deactivate existing profile for this specific role
      await db
        .update(suiteMentorshipProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(suiteMentorshipProfiles.userId, userId),
            eq(suiteMentorshipProfiles.role, role),
          ),
        );

      // Check if there's any existing profile for this role (active or inactive) to update
      const [existingProfile] = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(
          and(
            eq(suiteMentorshipProfiles.userId, userId),
            eq(suiteMentorshipProfiles.role, role),
          ),
        )
        .orderBy(sql`${suiteMentorshipProfiles.createdAt} DESC`)
        .limit(1);

      if (existingProfile) {
        // Update the most recent profile for this role - PRESERVE existing fields and only update provided ones
        const cleanData = { ...mentorshipProfileData };
        delete (cleanData as any).createdAt;
        delete (cleanData as any).updatedAt;
        delete (cleanData as any).id;

        // Build update object that only includes non-null/non-undefined fields
        const updateObject: any = {
          isActive: true, // Reactivate this profile
          updatedAt: new Date(),
        };

        // Only include fields that are explicitly provided (not null/undefined)
        Object.entries(cleanData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            updateObject[key] = value;
          }
        });

        console.log(
          `Storage layer: Updating most recent ${role} mentorship profile with:`,
          Object.keys(updateObject),
        );
        console.log("Storage layer: Update object:", updateObject);

        const [updatedProfile] = await db
          .update(suiteMentorshipProfiles)
          .set(updateObject)
          .where(eq(suiteMentorshipProfiles.id, existingProfile.id))
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when they change in mentorship profile
        if (
          updateObject.highSchool !== undefined ||
          updateObject.collegeUniversity !== undefined
        ) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from mentorship profile",
          );
          const userUpdateData: any = {};

          if (updateObject.highSchool !== undefined) {
            userUpdateData.highSchool = updateObject.highSchool;
          }
          if (updateObject.collegeUniversity !== undefined) {
            userUpdateData.collegeUniversity = updateObject.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        console.log(`Updated ${role} mentorship profile:`, updatedProfile);
        return updatedProfile;
      } else {
        // Create new mentorship profile with proper defaults
        const profileToInsert = {
          userId,
          role: role,
          areasOfExpertise: mentorshipProfileData.areasOfExpertise,
          learningGoals: mentorshipProfileData.learningGoals,
          languagesSpoken: mentorshipProfileData.languagesSpoken,
          industriesOrDomains: mentorshipProfileData.industriesOrDomains,
          mentorshipStyle: mentorshipProfileData.mentorshipStyle,
          preferredFormat: mentorshipProfileData.preferredFormat,
          communicationStyle: mentorshipProfileData.communicationStyle,
          availability: mentorshipProfileData.availability,
          timeCommitment: mentorshipProfileData.timeCommitment,
          location: mentorshipProfileData.location,
          successStories: mentorshipProfileData.successStories,
          whyMentor: mentorshipProfileData.whyMentor,
          whySeekMentorship: mentorshipProfileData.whySeekMentorship,
          preferredMentorshipStyle:
            mentorshipProfileData.preferredMentorshipStyle,
          industryAspiration: mentorshipProfileData.industryAspiration,
          preferredMenteeLevel: mentorshipProfileData.preferredMenteeLevel,
          preferredMentorExperience:
            mentorshipProfileData.preferredMentorExperience,
          preferredIndustries: mentorshipProfileData.preferredIndustries,
          highSchool: mentorshipProfileData.highSchool,
          collegeUniversity: mentorshipProfileData.collegeUniversity,
          maxMentees: mentorshipProfileData.maxMentees,
          currentMentees: mentorshipProfileData.currentMentees || 0,
          visibilityPreferences:
            mentorshipProfileData.visibilityPreferences || null,
          isActive: true,
        };

        const [newProfile] = await db
          .insert(suiteMentorshipProfiles)
          .values(profileToInsert)
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when creating new mentorship profile
        if (profileToInsert.highSchool || profileToInsert.collegeUniversity) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from new mentorship profile",
          );
          const userUpdateData: any = {};

          if (profileToInsert.highSchool) {
            userUpdateData.highSchool = profileToInsert.highSchool;
          }
          if (profileToInsert.collegeUniversity) {
            userUpdateData.collegeUniversity =
              profileToInsert.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        console.log(`Created new ${role} mentorship profile:`, newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error("Error creating/updating mentorship profile:", error);
      console.error("Error details:", (error as Error).message);
      throw error;
    }
  }

  async getDiscoveryMentorshipProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<Array<SuiteMentorshipProfile & { user: User }>> {
    try {
      // Optimized query using LEFT JOINs instead of slow NOT IN subqueries
      const mentorshipProfiles = await db
        .select({
          // Mentorship profile fields
          id: suiteMentorshipProfiles.id,
          userId: suiteMentorshipProfiles.userId,
          role: suiteMentorshipProfiles.role,
          areasOfExpertise: suiteMentorshipProfiles.areasOfExpertise,
          learningGoals: suiteMentorshipProfiles.learningGoals,
          languagesSpoken: suiteMentorshipProfiles.languagesSpoken,
          industriesOrDomains: suiteMentorshipProfiles.industriesOrDomains,
          mentorshipStyle: suiteMentorshipProfiles.mentorshipStyle,
          preferredFormat: suiteMentorshipProfiles.preferredFormat,
          communicationStyle: suiteMentorshipProfiles.communicationStyle,
          availability: suiteMentorshipProfiles.availability,
          timeCommitment: suiteMentorshipProfiles.timeCommitment,
          location: suiteMentorshipProfiles.location,
          successStories: suiteMentorshipProfiles.successStories,
          whyMentor: suiteMentorshipProfiles.whyMentor,
          whySeekMentorship: suiteMentorshipProfiles.whySeekMentorship,
          preferredMenteeLevel: suiteMentorshipProfiles.preferredMenteeLevel,
          preferredMentorExperience:
            suiteMentorshipProfiles.preferredMentorExperience,
          preferredIndustries: suiteMentorshipProfiles.preferredIndustries,
          isActive: suiteMentorshipProfiles.isActive,
          maxMentees: suiteMentorshipProfiles.maxMentees,
          currentMentees: suiteMentorshipProfiles.currentMentees,
          createdAt: suiteMentorshipProfiles.createdAt,
          updatedAt: suiteMentorshipProfiles.updatedAt,
          // Add missing fields from database
          visibilityPreferences: suiteMentorshipProfiles.visibilityPreferences,
          preferredMentorshipStyle:
            suiteMentorshipProfiles.preferredMentorshipStyle,
          industryAspiration: suiteMentorshipProfiles.industryAspiration,
          // Add education fields
          highSchool: suiteMentorshipProfiles.highSchool,
          collegeUniversity: suiteMentorshipProfiles.collegeUniversity,
          // User fields
          user: {
            id: users.id,
            fullName: users.fullName,
            photoUrl: users.photoUrl,
            profession: users.profession,
            location: users.location,
            isVerified: users.isVerified,
          },
        })
        .from(suiteMentorshipProfiles)
        .innerJoin(users, eq(suiteMentorshipProfiles.userId, users.id))
        .innerJoin(
          suiteProfileSettings,
          eq(users.id, suiteProfileSettings.userId),
        )
        .where(
          and(
            ne(suiteMentorshipProfiles.userId, userId), // Exclude current user
            eq(suiteMentorshipProfiles.isActive, true),
            eq(suiteProfileSettings.hiddenInMentorshipDiscovery, false),
            // Optimized bidirectional filtering using efficient table aliases and indexed lookups
            sql`NOT EXISTS (
              SELECT 1 FROM suite_mentorship_connections smc1
              WHERE smc1.user_id = ${userId} 
              AND smc1.target_profile_id = suite_mentorship_profiles.id
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM suite_mentorship_connections smc2
              WHERE smc2.user_id = suite_mentorship_profiles.user_id 
              AND smc2.target_user_id = ${userId}
            )`,
            // 3. Exclude profiles for users in swipe history for SUITE_MENTORSHIP
            sql`NOT EXISTS (
              SELECT 1 FROM swipe_history sh
              WHERE sh.user_id = ${userId} 
              AND sh.target_user_id = suite_mentorship_profiles.user_id
              AND sh.app_mode = 'SUITE_MENTORSHIP'
            )`,
          ),
        )
        .orderBy(desc(suiteMentorshipProfiles.createdAt))
        .limit(limit)
        .offset(offset);

      // Transform profiles to include mentorship-specific primary photos and field visibility
      const transformedProfiles = await Promise.all(
        mentorshipProfiles.map(async (profile) => {
          // Parse field visibility preferences
          let fieldVisibility: any = {};
          if (profile.visibilityPreferences) {
            try {
              fieldVisibility = JSON.parse(profile.visibilityPreferences);
            } catch (error) {
              console.error(
                `Error parsing mentorship visibility preferences for user ${profile.userId}:`,
                error,
              );
            }
          }

          // Fetch mentorship-specific primary photo
          let mentorshipPrimaryPhotoUrl: string | null = null;
          try {
            const mentorshipPhotos = await db
              .select()
              .from(userPhotos)
              .where(
                and(
                  eq(userPhotos.userId, profile.userId),
                  eq(userPhotos.isPrimaryForMentorship, true),
                ),
              )
              .limit(1);

            if (mentorshipPhotos.length > 0) {
              mentorshipPrimaryPhotoUrl = mentorshipPhotos[0].photoUrl;
            }
          } catch (error) {
            console.error(
              `Error fetching mentorship primary photo for user ${profile.userId}:`,
              error,
            );
          }

          return {
            ...profile,
            fieldVisibility,
            mentorshipPrimaryPhotoUrl,
          };
        }),
      );

      return transformedProfiles as Array<
        SuiteMentorshipProfile & {
          user: User;
          fieldVisibility: any;
          mentorshipPrimaryPhotoUrl: string | null;
        }
      >;
    } catch (error) {
      console.error("Error getting discovery mentorship profiles:", error);
      return [];
    }
  }

  // ===== NETWORKING PROFILE METHODS =====
  async getSuiteNetworkingProfile(
    userId: number,
  ): Promise<SuiteNetworkingProfile | undefined> {
    try {
      // Join with users table to get education fields
      const [result] = await db
        .select({
          // Include all networking profile fields
          ...suiteNetworkingProfiles,
          // Override education fields with data from users table for sync
          userHighSchool: users.highSchool,
          userCollegeUniversity: users.collegeUniversity,
        })
        .from(suiteNetworkingProfiles)
        .innerJoin(users, eq(users.id, suiteNetworkingProfiles.userId))
        .where(
          and(
            eq(suiteNetworkingProfiles.userId, userId),
            eq(suiteNetworkingProfiles.isActive, true),
          ),
        );

      if (!result) {
        return undefined;
      }

      // Merge user education fields into the profile
      const networkingProfile = {
        ...result,
        // Use education fields from users table if available, fallback to profile fields
        highSchool: result.userHighSchool || result.highSchool,
        collegeUniversity:
          result.userCollegeUniversity || result.collegeUniversity,
        // Remove the temporary fields
        userHighSchool: undefined,
        userCollegeUniversity: undefined,
      };

      return networkingProfile;
    } catch (error) {
      console.error("Error getting networking profile:", error);
      return undefined;
    }
  }

  async getSuiteNetworkingProfileById(
    profileId: number,
  ): Promise<SuiteNetworkingProfile | undefined> {
    try {
      const [networkingProfile] = await db
        .select()
        .from(suiteNetworkingProfiles)
        .where(
          and(
            eq(suiteNetworkingProfiles.id, profileId),
            eq(suiteNetworkingProfiles.isActive, true),
          ),
        );
      return networkingProfile;
    } catch (error) {
      console.error("Error getting networking profile by ID:", error);
      return undefined;
    }
  }

  async deleteSuiteNetworkingProfile(userId: number): Promise<void> {
    try {
      // Actually delete the record from the database
      await db
        .delete(suiteNetworkingProfiles)
        .where(eq(suiteNetworkingProfiles.userId, userId));

      console.log("Networking profile permanently deleted for user:", userId);
    } catch (error) {
      console.error("Error deleting networking profile:", error);
      throw error;
    }
  }

  async createOrUpdateSuiteNetworkingProfile(
    userId: number,
    networkingProfileData: Partial<InsertSuiteNetworkingProfile>,
  ): Promise<SuiteNetworkingProfile> {
    try {
      console.log("Creating/updating networking profile for user:", userId);
      console.log("Profile data received:", networkingProfileData);

      // First, deactivate all existing profiles for this user
      await db
        .update(suiteNetworkingProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(suiteNetworkingProfiles.userId, userId));

      // Check if there's any existing profile (active or inactive) to update
      const [existingProfile] = await db
        .select()
        .from(suiteNetworkingProfiles)
        .where(eq(suiteNetworkingProfiles.userId, userId))
        .orderBy(sql`${suiteNetworkingProfiles.createdAt} DESC`)
        .limit(1);

      if (existingProfile) {
        // Update the most recent profile - PRESERVE existing fields and only update provided ones
        const cleanData = { ...networkingProfileData };
        delete (cleanData as any).createdAt;
        delete (cleanData as any).updatedAt;
        delete (cleanData as any).id;

        // Build update object that only includes non-null/non-undefined fields
        const updateObject: any = {
          isActive: true, // Reactivate this profile
          updatedAt: new Date(),
        };

        // Only include fields that are explicitly provided (not null/undefined)
        Object.entries(cleanData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            updateObject[key] = value;
          }
        });

        console.log(
          "Storage layer: Updating most recent profile with:",
          Object.keys(updateObject),
        );
        console.log("Storage layer: Update object:", updateObject);

        const [updatedProfile] = await db
          .update(suiteNetworkingProfiles)
          .set(updateObject)
          .where(eq(suiteNetworkingProfiles.id, existingProfile.id))
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when they change in networking profile
        if (
          updateObject.highSchool !== undefined ||
          updateObject.collegeUniversity !== undefined
        ) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from networking profile",
          );
          const userUpdateData: any = {};

          if (updateObject.highSchool !== undefined) {
            userUpdateData.highSchool = updateObject.highSchool;
          }
          if (updateObject.collegeUniversity !== undefined) {
            userUpdateData.collegeUniversity = updateObject.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        return updatedProfile;
      } else {
        // Create new networking profile with proper defaults
        const profileToInsert = {
          userId,
          professionalTagline:
            networkingProfileData.professionalTagline || null,
          currentRole: networkingProfileData.currentRole || null,
          currentCompany: networkingProfileData.currentCompany || null,
          industry: networkingProfileData.industry || null,
          experienceYears: networkingProfileData.experienceYears || null,
          networkingGoals: networkingProfileData.networkingGoals || null,
          lookingFor: networkingProfileData.lookingFor || null,
          canOffer: networkingProfileData.canOffer || null,
          professionalInterests:
            networkingProfileData.professionalInterests || null,
          causesIPassionate: networkingProfileData.causesIPassionate || null,
          collaborationTypes: networkingProfileData.collaborationTypes || null,
          workingStyle: networkingProfileData.workingStyle || null,
          timeCommitment: networkingProfileData.timeCommitment || null,
          lightUpWhenTalking: networkingProfileData.lightUpWhenTalking || null,
          wantToMeetSomeone: networkingProfileData.wantToMeetSomeone || null,
          currentProjects: networkingProfileData.currentProjects || null,
          dreamCollaboration: networkingProfileData.dreamCollaboration || null,
          preferredMeetingStyle:
            networkingProfileData.preferredMeetingStyle || null,
          availability: networkingProfileData.availability || null,
          location: networkingProfileData.location || null,
          openToRemote: networkingProfileData.openToRemote ?? true,
          preferredLocations: networkingProfileData.preferredLocations || null,
          highSchool: networkingProfileData.highSchool || null,
          collegeUniversity: networkingProfileData.collegeUniversity || null,
          isActive: true,
          lookingForOpportunities:
            networkingProfileData.lookingForOpportunities ?? true,
          visibilityPreferences:
            networkingProfileData.visibilityPreferences || null,
        };

        console.log("Inserting new networking profile:", profileToInsert);

        const [networkingProfile] = await db
          .insert(suiteNetworkingProfiles)
          .values(profileToInsert)
          .returning();

        // 🎓 EDUCATION SYNC: Update education fields in users table when creating new networking profile
        if (profileToInsert.highSchool || profileToInsert.collegeUniversity) {
          console.log(
            "📚 [EDUCATION-SYNC] Syncing education fields to users table from new networking profile",
          );
          const userUpdateData: any = {};

          if (profileToInsert.highSchool) {
            userUpdateData.highSchool = profileToInsert.highSchool;
          }
          if (profileToInsert.collegeUniversity) {
            userUpdateData.collegeUniversity =
              profileToInsert.collegeUniversity;
          }

          try {
            await db
              .update(users)
              .set(userUpdateData)
              .where(eq(users.id, userId));
            console.log(
              "📚 [EDUCATION-SYNC] Successfully updated education fields in users table:",
              userUpdateData,
            );
          } catch (syncError) {
            console.error(
              "📚 [EDUCATION-SYNC] Failed to sync education fields to users table:",
              syncError,
            );
          }
        }

        console.log("Created networking profile:", networkingProfile);
        return networkingProfile;
      }
    } catch (error: any) {
      console.error("Error creating/updating networking profile:", error);
      console.error("Error details:", error?.message);
      console.error("Stack trace:", error?.stack);
      throw error;
    }
  }

  async getDiscoveryNetworkingProfiles(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<
    Array<
      SuiteNetworkingProfile & {
        user: User;
        fieldVisibility?: any;
        networkingPrimaryPhotoUrl?: string;
      }
    >
  > {
    try {
      const networkingProfiles = await db
        .select({
          // Networking profile fields
          id: suiteNetworkingProfiles.id,
          userId: suiteNetworkingProfiles.userId,
          professionalTagline: suiteNetworkingProfiles.professionalTagline,
          currentRole: suiteNetworkingProfiles.currentRole,
          currentCompany: suiteNetworkingProfiles.currentCompany,
          industry: suiteNetworkingProfiles.industry,
          experienceYears: suiteNetworkingProfiles.experienceYears,
          networkingGoals: suiteNetworkingProfiles.networkingGoals,
          lookingFor: suiteNetworkingProfiles.lookingFor,
          canOffer: suiteNetworkingProfiles.canOffer,
          professionalInterests: suiteNetworkingProfiles.professionalInterests,
          causesIPassionate: suiteNetworkingProfiles.causesIPassionate,
          collaborationTypes: suiteNetworkingProfiles.collaborationTypes,
          workingStyle: suiteNetworkingProfiles.workingStyle,
          timeCommitment: suiteNetworkingProfiles.timeCommitment,
          lightUpWhenTalking: suiteNetworkingProfiles.lightUpWhenTalking,
          wantToMeetSomeone: suiteNetworkingProfiles.wantToMeetSomeone,
          currentProjects: suiteNetworkingProfiles.currentProjects,
          dreamCollaboration: suiteNetworkingProfiles.dreamCollaboration,
          preferredMeetingStyle: suiteNetworkingProfiles.preferredMeetingStyle,
          availability: suiteNetworkingProfiles.availability,
          location: suiteNetworkingProfiles.location,
          openToRemote: suiteNetworkingProfiles.openToRemote,
          preferredLocations: suiteNetworkingProfiles.preferredLocations,
          isActive: suiteNetworkingProfiles.isActive,
          lookingForOpportunities:
            suiteNetworkingProfiles.lookingForOpportunities,
          visibilityPreferences: suiteNetworkingProfiles.visibilityPreferences,
          // Add education fields for swipe card display
          highSchool: suiteNetworkingProfiles.highSchool,
          collegeUniversity: suiteNetworkingProfiles.collegeUniversity,
          createdAt: suiteNetworkingProfiles.createdAt,
          updatedAt: suiteNetworkingProfiles.updatedAt,
          // User fields
          user: {
            id: users.id,
            fullName: users.fullName,
            photoUrl: users.photoUrl,
            profession: users.profession,
            location: users.location,
            isVerified: users.isVerified,
          },
        })
        .from(suiteNetworkingProfiles)
        .innerJoin(users, eq(suiteNetworkingProfiles.userId, users.id))
        .innerJoin(
          suiteProfileSettings,
          eq(users.id, suiteProfileSettings.userId),
        )
        .where(
          and(
            ne(suiteNetworkingProfiles.userId, userId), // Exclude current user
            eq(suiteNetworkingProfiles.isActive, true),
            eq(suiteProfileSettings.hiddenInNetworkingDiscovery, false),
            eq(suiteNetworkingProfiles.lookingForOpportunities, true),
            // Optimized bidirectional filtering using efficient EXISTS clauses instead of slow NOT IN
            sql`NOT EXISTS (
              SELECT 1 FROM suite_networking_connections snc1
              WHERE snc1.user_id = ${userId} 
              AND snc1.target_profile_id = suite_networking_profiles.id
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM suite_networking_connections snc2
              WHERE snc2.user_id = suite_networking_profiles.user_id 
              AND snc2.target_user_id = ${userId}
            )`,
            // 3. Exclude profiles for users in swipe history for SUITE_NETWORKING
            sql`NOT EXISTS (
              SELECT 1 FROM swipe_history sh
              WHERE sh.user_id = ${userId} 
              AND sh.target_user_id = suite_networking_profiles.user_id
              AND sh.app_mode = 'SUITE_NETWORKING'
            )`,
          ),
        )
        .orderBy(desc(suiteNetworkingProfiles.createdAt))
        .limit(limit)
        .offset(offset);

      // Parse visibility preferences and fetch networking primary photos
      const profilesWithVisibilityAndPhotos = await Promise.all(
        networkingProfiles.map(async (profile) => {
          let fieldVisibility: any = {
            // Default visibility settings that match the preview dialog
            showProfilePhoto: false,
            showNetworkingPhotos: true,
            professionalTagline: true,
            currentRole: true,
            industry: true,
            workplace: true,
            experienceYears: true,
            lookingFor: true,
            canOffer: true,
            workingStyle: true,
            professionalInterests: true,
            networkingGoals: true,
            lightUpWhenTalking: true,
            languagesSpoken: true,
            openToCollaborateOn: true,
            preferredNetworkingFormat: true,
            signatureAchievement: true,
            timezone: true,
            location: true,
          };

          // Parse the visibility preferences JSON column if it exists
          if (profile.visibilityPreferences) {
            try {
              const visibilityData =
                typeof profile.visibilityPreferences === "string"
                  ? JSON.parse(profile.visibilityPreferences)
                  : profile.visibilityPreferences;

              // Override defaults with user's actual settings
              fieldVisibility = { ...fieldVisibility, ...visibilityData };
            } catch (error) {
              console.error(
                `Error parsing visibility preferences for user ${profile.userId}:`,
                error,
              );
            }
          }

          // Fetch networking-specific primary photo
          let networkingPrimaryPhotoUrl: string | null = null;
          try {
            const networkingPhotos = await db
              .select()
              .from(userPhotos)
              .where(
                and(
                  eq(userPhotos.userId, profile.userId),
                  eq(userPhotos.isPrimaryForNetworking, true),
                ),
              )
              .limit(1);

            if (networkingPhotos.length > 0) {
              networkingPrimaryPhotoUrl = networkingPhotos[0].photoUrl;
            }
          } catch (error) {
            console.error(
              `Error fetching networking primary photo for user ${profile.userId}:`,
              error,
            );
          }

          return {
            ...profile,
            fieldVisibility,
            networkingPrimaryPhotoUrl,
          };
        }),
      );

      return profilesWithVisibilityAndPhotos as Array<
        SuiteNetworkingProfile & {
          user: User;
          fieldVisibility?: any;
          networkingPrimaryPhotoUrl?: string;
        }
      >;
    } catch (error) {
      console.error("Error getting discovery networking profiles:", error);
      return [];
    }
  }

  // ===== FIELD VISIBILITY METHODS =====
  async getFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
  ): Promise<SuiteFieldVisibility[]> {
    try {
      const visibilitySettings = await db
        .select()
        .from(suiteFieldVisibility)
        .where(
          and(
            eq(suiteFieldVisibility.userId, userId),
            eq(suiteFieldVisibility.profileType, profileType),
          ),
        );
      return visibilitySettings;
    } catch (error) {
      console.error("Error getting field visibility:", error);
      return [];
    }
  }

  async updateFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
    fieldName: string,
    isVisible: boolean,
  ): Promise<SuiteFieldVisibility> {
    try {
      const [visibility] = await db
        .insert(suiteFieldVisibility)
        .values({
          userId,
          profileType,
          fieldName,
          isVisible,
        })
        .onConflictDoUpdate({
          target: [
            suiteFieldVisibility.userId,
            suiteFieldVisibility.profileType,
            suiteFieldVisibility.fieldName,
          ],
          set: {
            isVisible,
            updatedAt: sql`NOW()`,
          },
        })
        .returning();
      return visibility;
    } catch (error) {
      console.error("Error updating field visibility:", error);
      throw error;
    }
  }

  async updateMultipleFieldVisibility(
    userId: number,
    profileType: "job" | "mentorship" | "networking",
    visibilityData: Record<string, boolean>,
  ): Promise<void> {
    try {
      // Update each field visibility setting
      await Promise.all(
        Object.entries(visibilityData).map(([fieldName, isVisible]) =>
          this.updateFieldVisibility(userId, profileType, fieldName, isVisible),
        ),
      );
    } catch (error) {
      console.error("Error updating multiple field visibility:", error);
      throw error;
    }
  }

  // ===== SUITE CONNECTION STORAGE IMPLEMENTATIONS =====

  // Networking connections
  async createSuiteNetworkingConnection(
    connectionData: InsertSuiteNetworkingConnection,
  ): Promise<SuiteNetworkingConnection> {
    try {
      const [connection] = await db
        .insert(suiteNetworkingConnections)
        .values(connectionData)
        .returning();
      return connection;
    } catch (error) {
      console.error("Error creating networking connection:", error);
      throw error;
    }
  }

  async getSuiteNetworkingConnection(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteNetworkingConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(suiteNetworkingConnections)
        .where(
          and(
            eq(suiteNetworkingConnections.userId, userId),
            eq(suiteNetworkingConnections.targetProfileId, targetProfileId),
          ),
        );
      return connection || undefined;
    } catch (error) {
      console.error("Error getting networking connection:", error);
      throw error;
    }
  }

  async updateSuiteNetworkingConnection(
    id: number,
    updates: Partial<SuiteNetworkingConnection>,
  ): Promise<SuiteNetworkingConnection | undefined> {
    try {
      const [connection] = await db
        .update(suiteNetworkingConnections)
        .set(updates)
        .where(eq(suiteNetworkingConnections.id, id))
        .returning();
      return connection || undefined;
    } catch (error) {
      console.error("Error updating networking connection:", error);
      throw error;
    }
  }

  async getUserNetworkingConnections(userId: number): Promise<
    Array<
      SuiteNetworkingConnection & {
        targetProfile: SuiteNetworkingProfile;
        targetUser: User;
        fieldVisibility?: any;
        networkingPrimaryPhotoUrl?: string;
      }
    >
  > {
    try {
      // Enhanced: Get incoming connections with complete profile data including field visibility
      // This ensures User A doesn't see their own card when they like User B
      // Only User B sees User A's card in their Connections page
      const incomingConnections = await db
        .select({
          id: suiteNetworkingConnections.id,
          userId: suiteNetworkingConnections.userId,
          targetProfileId: suiteNetworkingConnections.targetProfileId,
          targetUserId: suiteNetworkingConnections.targetUserId,
          action: suiteNetworkingConnections.action,
          matched: suiteNetworkingConnections.matched,
          createdAt: suiteNetworkingConnections.createdAt,
          // Get the LIKER's profile data (the person who liked this user)
          targetProfile: suiteNetworkingProfiles,
          targetUser: users,
        })
        .from(suiteNetworkingConnections)
        .leftJoin(
          suiteNetworkingProfiles,
          eq(suiteNetworkingConnections.userId, suiteNetworkingProfiles.userId),
        )
        .leftJoin(users, eq(suiteNetworkingConnections.userId, users.id))
        .where(
          and(
            eq(suiteNetworkingConnections.targetUserId, userId),
            eq(suiteNetworkingConnections.action, "like"),
            eq(suiteNetworkingConnections.matched, false), // Only show unmatched connections
          ),
        );

      // Fetch networking primary photos for each connection
      const enrichedConnections = await Promise.all(
        incomingConnections.map(async (conn) => {
          // Get networking primary photo from user_photos table
          let networkingPrimaryPhotoUrl = null;
          if (conn.userId) {
            const [networkingPhoto] = await db
              .select({
                photoUrl: userPhotos.photoUrl,
              })
              .from(userPhotos)
              .where(
                and(
                  eq(userPhotos.userId, conn.userId),
                  eq(userPhotos.isPrimaryForNetworking, true),
                ),
              );
            networkingPrimaryPhotoUrl = networkingPhoto?.photoUrl || null;
          }

          return {
            ...conn,
            fieldVisibility: conn.targetProfile?.visibilityPreferences,
            networkingPrimaryPhotoUrl,
          };
        }),
      );

      return enrichedConnections as Array<
        SuiteNetworkingConnection & {
          targetProfile: SuiteNetworkingProfile;
          targetUser: User;
          fieldVisibility?: any;
          networkingPrimaryPhotoUrl?: string;
        }
      >;
    } catch (error) {
      console.error("Error getting user networking connections:", error);
      throw error;
    }
  }

  // Mentorship connections
  async createSuiteMentorshipConnection(
    connectionData: InsertSuiteMentorshipConnection,
  ): Promise<SuiteMentorshipConnection> {
    try {
      const [connection] = await db
        .insert(suiteMentorshipConnections)
        .values(connectionData)
        .returning();
      return connection;
    } catch (error) {
      console.error("Error creating mentorship connection:", error);
      throw error;
    }
  }

  async getSuiteMentorshipConnection(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteMentorshipConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(suiteMentorshipConnections)
        .where(
          and(
            eq(suiteMentorshipConnections.userId, userId),
            eq(suiteMentorshipConnections.targetProfileId, targetProfileId),
          ),
        );
      return connection || undefined;
    } catch (error) {
      console.error("Error getting mentorship connection:", error);
      throw error;
    }
  }

  async updateSuiteMentorshipConnection(
    id: number,
    updates: Partial<SuiteMentorshipConnection>,
  ): Promise<SuiteMentorshipConnection | undefined> {
    try {
      const [connection] = await db
        .update(suiteMentorshipConnections)
        .set(updates)
        .where(eq(suiteMentorshipConnections.id, id))
        .returning();
      return connection || undefined;
    } catch (error) {
      console.error("Error updating mentorship connection:", error);
      throw error;
    }
  }

  async getUserMentorshipConnections(userId: number): Promise<
    Array<
      SuiteMentorshipConnection & {
        targetProfile: SuiteMentorshipProfile;
        targetUser: User;
        mentorshipPrimaryPhotoUrl: string | null;
      }
    >
  > {
    try {
      // FIXED: Only get incoming connections (where others liked this user's mentorship profile)
      // This ensures User A doesn't see their own card when they like User B
      // Only User B sees User A's card in their Mentorship Connections tab
      const incomingConnections = await db
        .select({
          id: suiteMentorshipConnections.id,
          userId: suiteMentorshipConnections.userId,
          targetProfileId: suiteMentorshipConnections.targetProfileId,
          targetUserId: suiteMentorshipConnections.targetUserId,
          action: suiteMentorshipConnections.action,
          matched: suiteMentorshipConnections.matched,
          createdAt: suiteMentorshipConnections.createdAt,
          // Get the LIKER's profile data (the person who liked this user)
          targetProfile: suiteMentorshipProfiles,
          targetUser: users,
        })
        .from(suiteMentorshipConnections)
        .leftJoin(
          suiteMentorshipProfiles,
          eq(suiteMentorshipConnections.userId, suiteMentorshipProfiles.userId),
        )
        .leftJoin(users, eq(suiteMentorshipConnections.userId, users.id))
        .where(
          and(
            eq(suiteMentorshipConnections.targetUserId, userId),
            eq(suiteMentorshipConnections.action, "like"),
            eq(suiteMentorshipConnections.matched, false), // Only show unmatched connections
          ),
        );

      // Transform profiles to match discovery format for consistent field visibility handling
      const transformedConnections = await Promise.all(
        incomingConnections.map(async (connection) => {
          if (connection.targetProfile) {
            // Transform visibilityPreferences to fieldVisibility for consistency with discovery system
            let fieldVisibility: any = {};
            if (connection.targetProfile.visibilityPreferences) {
              try {
                fieldVisibility = JSON.parse(
                  connection.targetProfile.visibilityPreferences,
                );
              } catch (error) {
                console.error(
                  `Error parsing mentorship visibility preferences for connection ${connection.id}:`,
                  error,
                );
              }
            }

            // Fetch mentorship-specific primary photo
            let mentorshipPrimaryPhotoUrl: string | null = null;
            try {
              const mentorshipPhotos = await db
                .select()
                .from(userPhotos)
                .where(
                  and(
                    eq(userPhotos.userId, connection.userId),
                    eq(userPhotos.isPrimaryForMentorship, true),
                  ),
                )
                .limit(1);

              if (mentorshipPhotos.length > 0) {
                mentorshipPrimaryPhotoUrl = mentorshipPhotos[0].photoUrl;
              }
            } catch (error) {
              console.error(
                `Error fetching mentorship primary photo for user ${connection.userId}:`,
                error,
              );
            }

            // Add fieldVisibility to targetProfile for consistency with expanded modal expectations
            connection.targetProfile = {
              ...connection.targetProfile,
              fieldVisibility: JSON.stringify(fieldVisibility),
            };

            // Add mentorship primary photo URL and fieldVisibility to the connection
            return {
              ...connection,
              mentorshipPrimaryPhotoUrl,
              fieldVisibility: JSON.stringify(fieldVisibility),
            };
          }
          return connection;
        }),
      );

      return transformedConnections as Array<
        SuiteMentorshipConnection & {
          targetProfile: SuiteMentorshipProfile;
          targetUser: User;
          mentorshipPrimaryPhotoUrl: string | null;
        }
      >;
    } catch (error) {
      console.error("Error getting user mentorship connections:", error);
      throw error;
    }
  }

  // Job applications
  async createSuiteJobApplication(
    applicationData: InsertSuiteJobApplication,
  ): Promise<SuiteJobApplication> {
    try {
      const [application] = await db
        .insert(suiteJobApplications)
        .values(applicationData)
        .returning();
      return application;
    } catch (error) {
      console.error("Error creating job application:", error);
      throw error;
    }
  }

  async getSuiteJobApplication(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteJobApplication | undefined> {
    try {
      const [application] = await db
        .select()
        .from(suiteJobApplications)
        .where(
          and(
            eq(suiteJobApplications.userId, userId),
            eq(suiteJobApplications.targetProfileId, targetProfileId),
          ),
        );
      return application || undefined;
    } catch (error) {
      console.error("Error getting job application:", error);
      throw error;
    }
  }

  async updateSuiteJobApplication(
    id: number,
    updates: Partial<SuiteJobApplication>,
  ): Promise<SuiteJobApplication | undefined> {
    try {
      const [application] = await db
        .update(suiteJobApplications)
        .set(updates)
        .where(eq(suiteJobApplications.id, id))
        .returning();
      return application || undefined;
    } catch (error) {
      console.error("Error updating job application:", error);
      throw error;
    }
  }

  async getSuiteJobApplicationById(
    id: number,
  ): Promise<SuiteJobApplication | undefined> {
    try {
      const [application] = await db
        .select()
        .from(suiteJobApplications)
        .where(eq(suiteJobApplications.id, id));
      return application || undefined;
    } catch (error) {
      console.error("Error getting job application by ID:", error);
      throw error;
    }
  }

  async getSuiteJobApplicationByUsers(
    userId: number,
    targetUserId: number,
  ): Promise<SuiteJobApplication | undefined> {
    try {
      const [application] = await db
        .select()
        .from(suiteJobApplications)
        .where(
          and(
            eq(suiteJobApplications.userId, userId),
            eq(suiteJobApplications.targetUserId, targetUserId),
          ),
        );
      return application || undefined;
    } catch (error) {
      console.error("Error getting job application by users:", error);
      throw error;
    }
  }

  async getUserJobApplications(
    userId: number,
  ): Promise<
    Array<
      SuiteJobApplication & { targetProfile: SuiteJobProfile; targetUser: User }
    >
  > {
    try {
      // Get job applications where this user is the target (job poster receiving applications)
      // This shows incoming job applications that the user can accept/reject
      const incomingApplications = await db
        .select({
          id: suiteJobApplications.id,
          userId: suiteJobApplications.userId,
          targetProfileId: suiteJobApplications.targetProfileId,
          targetUserId: suiteJobApplications.targetUserId,
          action: suiteJobApplications.action,
          applicationStatus: suiteJobApplications.applicationStatus,
          matched: suiteJobApplications.matched,
          createdAt: suiteJobApplications.createdAt,
          // Get the APPLICANT's user data (the person who applied)
          applicantName: users.fullName,
          applicantPhoto: users.photoUrl,
          applicantProfession: users.profession,
          applicantLocation: users.location,
          applicantIsVerified: users.isVerified,
        })
        .from(suiteJobApplications)
        .leftJoin(users, eq(suiteJobApplications.userId, users.id))
        .where(
          and(
            eq(suiteJobApplications.targetUserId, userId),
            eq(suiteJobApplications.action, "like"),
            eq(suiteJobApplications.matched, false), // Only show unmatched applications
          ),
        );

      return incomingApplications.map((app) => ({
        ...app,
        targetProfile: null, // Not needed for job applications display
        targetUser: {
          id: app.userId,
          fullName: app.applicantName,
          photoUrl: app.applicantPhoto,
          profession: app.applicantProfession,
          location: app.applicantLocation,
          isVerified: app.applicantIsVerified,
        } as User,
      })) as Array<
        SuiteJobApplication & {
          targetProfile: SuiteJobProfile;
          targetUser: User;
        }
      >;
    } catch (error) {
      console.error("Error getting user job applications:", error);
      throw error;
    }
  }

  // Connection management by ID methods
  async getSuiteNetworkingConnectionById(
    id: number,
  ): Promise<SuiteNetworkingConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(suiteNetworkingConnections)
        .where(eq(suiteNetworkingConnections.id, id));
      return connection || undefined;
    } catch (error) {
      console.error("Error getting networking connection by ID:", error);
      throw error;
    }
  }

  async getSuiteMentorshipConnectionById(
    id: number,
  ): Promise<SuiteMentorshipConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(suiteMentorshipConnections)
        .where(eq(suiteMentorshipConnections.id, id));
      return connection || undefined;
    } catch (error) {
      console.error("Error getting mentorship connection by ID:", error);
      throw error;
    }
  }

  async deleteSuiteNetworkingConnectionById(id: number): Promise<void> {
    try {
      await db
        .delete(suiteNetworkingConnections)
        .where(eq(suiteNetworkingConnections.id, id));
    } catch (error) {
      console.error("Error deleting networking connection by ID:", error);
      throw error;
    }
  }

  async deleteSuiteMentorshipConnectionById(id: number): Promise<void> {
    try {
      await db
        .delete(suiteMentorshipConnections)
        .where(eq(suiteMentorshipConnections.id, id));
    } catch (error) {
      console.error("Error deleting mentorship connection by ID:", error);
      throw error;
    }
  }

  async deleteSuiteJobApplicationById(id: number): Promise<void> {
    try {
      await db
        .delete(suiteJobApplications)
        .where(eq(suiteJobApplications.id, id));
    } catch (error) {
      console.error("Error deleting job application by ID:", error);
      throw error;
    }
  }

  // Clear all networking connections for testing
  async clearAllNetworkingConnections(): Promise<void> {
    try {
      await db.delete(suiteNetworkingConnections);
      console.log("All networking connections cleared");
    } catch (error) {
      console.error("Error clearing networking connections:", error);
      throw error;
    }
  }

  // ===== SUITE COMPATIBILITY SCORING METHODS =====

  // Helper function to order user IDs consistently to prevent duplicates
  private orderUserIds(
    userId1: number,
    userId2: number,
  ): { smallerId: number; largerId: number } {
    return userId1 < userId2
      ? { smallerId: userId1, largerId: userId2 }
      : { smallerId: userId2, largerId: userId1 };
  }

  async createSuiteCompatibilityScore(
    scoreData: InsertSuiteCompatibilityScore,
  ): Promise<SuiteCompatibilityScore> {
    try {
      // Ensure consistent user ID ordering to prevent duplicates
      const { smallerId, largerId } = this.orderUserIds(
        scoreData.userId,
        scoreData.targetUserId,
      );

      const orderedScoreData = {
        ...scoreData,
        userId: smallerId,
        targetUserId: largerId,
      };

      const [score] = await db
        .insert(suiteCompatibilityScores)
        .values(orderedScoreData)
        .returning();
      return score;
    } catch (error) {
      console.error("Error creating suite compatibility score:", error);
      throw error;
    }
  }

  async getSuiteCompatibilityScore(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteCompatibilityScore | undefined> {
    try {
      // First get the target user ID from the profile
      const targetProfile = await db
        .select({ userId: suiteNetworkingProfiles.userId })
        .from(suiteNetworkingProfiles)
        .where(eq(suiteNetworkingProfiles.id, targetProfileId));

      if (!targetProfile.length) return undefined;

      const targetUserId = targetProfile[0].userId;
      const { smallerId, largerId } = this.orderUserIds(userId, targetUserId);

      // Look for compatibility score with consistent ordering
      const [score] = await db
        .select()
        .from(suiteCompatibilityScores)
        .where(
          and(
            eq(suiteCompatibilityScores.userId, smallerId),
            eq(suiteCompatibilityScores.targetUserId, largerId),
            eq(suiteCompatibilityScores.targetProfileId, targetProfileId),
            eq(suiteCompatibilityScores.isActive, true),
          ),
        );
      return score || undefined;
    } catch (error) {
      console.error("Error getting suite compatibility score:", error);
      throw error;
    }
  }

  async updateSuiteCompatibilityScore(
    id: number,
    updates: Partial<SuiteCompatibilityScore>,
  ): Promise<SuiteCompatibilityScore> {
    try {
      // If updating user IDs, ensure consistent ordering
      let orderedUpdates = updates;
      if (updates.userId && updates.targetUserId) {
        const { smallerId, largerId } = this.orderUserIds(
          updates.userId,
          updates.targetUserId,
        );
        orderedUpdates = {
          ...updates,
          userId: smallerId,
          targetUserId: largerId,
        };
      }

      const [score] = await db
        .update(suiteCompatibilityScores)
        .set({
          ...orderedUpdates,
          lastUpdated: new Date(),
        })
        .where(eq(suiteCompatibilityScores.id, id))
        .returning();
      return score;
    } catch (error) {
      console.error("Error updating suite compatibility score:", error);
      throw error;
    }
  }

  // ===== MENTORSHIP COMPATIBILITY SCORE METHODS =====
  async createSuiteMentorshipCompatibilityScore(
    scoreData: InsertSuiteMentorshipCompatibilityScore,
  ): Promise<SuiteMentorshipCompatibilityScore> {
    try {
      // Ensure consistent user ID ordering to prevent duplicates
      const { smallerId, largerId } = this.orderUserIds(
        scoreData.userId,
        scoreData.targetUserId,
      );

      const orderedScoreData = {
        ...scoreData,
        userId: smallerId,
        targetUserId: largerId,
      };

      const [score] = await db
        .insert(suiteMentorshipCompatibilityScores)
        .values(orderedScoreData)
        .returning();
      return score;
    } catch (error) {
      console.error("Error creating mentorship compatibility score:", error);
      throw error;
    }
  }

  async getSuiteMentorshipCompatibilityScore(
    userId: number,
    targetProfileId: number,
  ): Promise<SuiteMentorshipCompatibilityScore | undefined> {
    try {
      // First get the target user ID from the profile
      const targetProfile = await db
        .select({ userId: suiteMentorshipProfiles.userId })
        .from(suiteMentorshipProfiles)
        .where(eq(suiteMentorshipProfiles.id, targetProfileId));

      if (!targetProfile.length) return undefined;

      const targetUserId = targetProfile[0].userId;
      const { smallerId, largerId } = this.orderUserIds(userId, targetUserId);

      // Look for compatibility score with consistent ordering
      const [score] = await db
        .select()
        .from(suiteMentorshipCompatibilityScores)
        .where(
          and(
            eq(suiteMentorshipCompatibilityScores.userId, smallerId),
            eq(suiteMentorshipCompatibilityScores.targetUserId, largerId),
            eq(
              suiteMentorshipCompatibilityScores.targetProfileId,
              targetProfileId,
            ),
            eq(suiteMentorshipCompatibilityScores.isActive, true),
          ),
        );
      return score || undefined;
    } catch (error) {
      console.error("Error getting mentorship compatibility score:", error);
      throw error;
    }
  }

  async updateSuiteMentorshipCompatibilityScore(
    id: number,
    updates: Partial<SuiteMentorshipCompatibilityScore>,
  ): Promise<SuiteMentorshipCompatibilityScore> {
    try {
      // If updating user IDs, ensure consistent ordering
      let orderedUpdates = updates;
      if (updates.userId && updates.targetUserId) {
        const { smallerId, largerId } = this.orderUserIds(
          updates.userId,
          updates.targetUserId,
        );
        orderedUpdates = {
          ...updates,
          userId: smallerId,
          targetUserId: largerId,
        };
      }

      const [score] = await db
        .update(suiteMentorshipCompatibilityScores)
        .set({
          ...orderedUpdates,
          lastUpdated: new Date(),
        })
        .where(eq(suiteMentorshipCompatibilityScores.id, id))
        .returning();
      return score;
    } catch (error) {
      console.error("Error updating mentorship compatibility score:", error);
      throw error;
    }
  }

  async deleteSuiteMentorshipCompatibilityScore(id: number): Promise<void> {
    try {
      await db
        .delete(suiteMentorshipCompatibilityScores)
        .where(eq(suiteMentorshipCompatibilityScores.id, id));
    } catch (error) {
      console.error("Error deleting mentorship compatibility score:", error);
      throw error;
    }
  }

  async deleteSuiteCompatibilityScore(id: number): Promise<void> {
    try {
      await db
        .delete(suiteCompatibilityScores)
        .where(eq(suiteCompatibilityScores.id, id));
    } catch (error) {
      console.error("Error deleting suite compatibility score:", error);
      throw error;
    }
  }

  async getUserByMentorshipProfileId(
    profileId: number,
  ): Promise<User | undefined> {
    try {
      const [result] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          photoUrl: users.photoUrl,
          profession: users.profession,
          location: users.location,
          email: users.email,
        })
        .from(users)
        .innerJoin(
          suiteMentorshipProfiles,
          eq(users.id, suiteMentorshipProfiles.userId),
        )
        .where(eq(suiteMentorshipProfiles.id, profileId));

      return result || undefined;
    } catch (error) {
      console.error("Error getting user by mentorship profile ID:", error);
      throw error;
    }
  }

  async getSuiteMentorshipProfileByUserId(
    userId: number,
  ): Promise<SuiteMentorshipProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(
          and(
            eq(suiteMentorshipProfiles.userId, userId),
            eq(suiteMentorshipProfiles.isActive, true),
          ),
        );
      return profile || undefined;
    } catch (error) {
      console.error("Error getting mentorship profile by user ID:", error);
      throw error;
    }
  }

  async getSuiteMentorshipProfileById(
    profileId: number,
  ): Promise<SuiteMentorshipProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(suiteMentorshipProfiles)
        .where(eq(suiteMentorshipProfiles.id, profileId));
      return profile || undefined;
    } catch (error) {
      console.error("Error getting mentorship profile by ID:", error);
      throw error;
    }
  }

  async getUserByNetworkingProfileId(
    profileId: number,
  ): Promise<User | undefined> {
    try {
      const [profile] = await db
        .select({
          user: users,
        })
        .from(suiteNetworkingProfiles)
        .innerJoin(users, eq(suiteNetworkingProfiles.userId, users.id))
        .where(eq(suiteNetworkingProfiles.id, profileId));

      return profile?.user || undefined;
    } catch (error) {
      console.error("Error getting user by networking profile ID:", error);
      throw error;
    }
  }

  // Professional Reviews System
  async createProfessionalReview(
    reviewData: InsertProfessionalReview,
  ): Promise<ProfessionalReview> {
    try {
      // Using raw SQL due to column name mismatch between schema and database
      const result = await db.execute(sql`
        INSERT INTO professional_reviews (
          user_id, target_user_id, rating, review_text, category, is_anonymous, created_at, updated_at
        ) VALUES (
          ${reviewData.reviewerUserId}, 
          ${reviewData.reviewedUserId}, 
          ${reviewData.rating}, 
          ${reviewData.reviewText}, 
          ${reviewData.category || "overall"},
          ${reviewData.isAnonymous || false},
          NOW(),
          NOW()
        ) RETURNING *
      `);

      const review = result.rows[0] as any;
      return {
        id: review.id,
        reviewedUserId: review.target_user_id,
        reviewerUserId: review.user_id,
        rating: review.rating,
        reviewText: review.review_text,
        isAnonymous: reviewData.isAnonymous || false,
        category: review.category,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      };
    } catch (error) {
      console.error("Error creating professional review:", error);
      throw error;
    }
  }

  async getProfessionalReviewsForUser(
    reviewedUserId: number,
  ): Promise<Array<ProfessionalReview & { reviewer: User | null }>> {
    try {
      // Using raw SQL due to column name mismatch between schema and database
      const reviews = await db.execute(sql`
        SELECT 
          pr.id,
          pr.target_user_id as reviewed_user_id,
          pr.user_id as reviewer_user_id,
          pr.rating,
          pr.review_text,
          pr.category,
          pr.is_anonymous,
          pr.created_at,
          pr.updated_at,
          u.id as reviewer_id,
          u.full_name as reviewer_full_name,
          u.photo_url as reviewer_photo_url,
          u.profession as reviewer_profession
        FROM professional_reviews pr
        LEFT JOIN users u ON pr.user_id = u.id
        WHERE pr.target_user_id = ${reviewedUserId}
        ORDER BY pr.created_at DESC
      `);

      return reviews.rows.map((r: any) => ({
        id: r.id,
        reviewedUserId: r.reviewed_user_id,
        reviewerUserId: r.reviewer_user_id,
        rating: r.rating,
        reviewText: r.review_text,
        isAnonymous: r.is_anonymous || false,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        reviewer: r.reviewer_id
          ? ({
              id: r.reviewer_id,
              fullName: r.reviewer_full_name,
              photoUrl: r.reviewer_photo_url,
              profession: r.reviewer_profession,
            } as User)
          : null,
      })) as Array<ProfessionalReview & { reviewer: User | null }>;
    } catch (error) {
      console.error("Error getting professional reviews for user:", error);
      throw error;
    }
  }

  async getProfessionalReviewStats(reviewedUserId: number): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      const reviews = await db.execute(sql`
        SELECT rating 
        FROM professional_reviews 
        WHERE target_user_id = ${reviewedUserId}
      `);

      if (reviews.rows.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const totalReviews = reviews.rows.length;
      const averageRating =
        reviews.rows.reduce((sum: number, r: any) => sum + r.rating, 0) /
        totalReviews;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.rows.forEach((r: any) => {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      console.error("Error getting professional review stats:", error);
      throw error;
    }
  }

  async getExistingReview(
    reviewedUserId: number,
    reviewerUserId: number,
    category: string = "overall",
  ): Promise<ProfessionalReview | undefined> {
    try {
      const review = await db.execute(sql`
        SELECT * FROM professional_reviews 
        WHERE target_user_id = ${reviewedUserId} 
        AND user_id = ${reviewerUserId} 
        AND category = ${category}
        LIMIT 1
      `);

      if (review.rows.length === 0) return undefined;

      const r = review.rows[0] as any;
      return {
        id: r.id,
        reviewedUserId: r.target_user_id,
        reviewerUserId: r.user_id,
        rating: r.rating,
        reviewText: r.review_text,
        isAnonymous: r.is_anonymous || false,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as ProfessionalReview;
    } catch (error) {
      console.error("Error getting existing review:", error);
      throw error;
    }
  }

  async deleteProfessionalReview(
    reviewId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      // Using raw SQL to delete review, ensuring only the review author can delete it
      const result = await db.execute(sql`
        DELETE FROM professional_reviews 
        WHERE id = ${reviewId} AND user_id = ${userId}
        RETURNING id
      `);

      return result.rows.length > 0;
    } catch (error) {
      console.error("Error deleting professional review:", error);
      throw error;
    }
  }

  async updateProfessionalReview(
    id: number,
    updates: Partial<ProfessionalReview>,
  ): Promise<ProfessionalReview | undefined> {
    try {
      // Using raw SQL due to column name mismatch between schema and database
      const result = await db.execute(sql`
        UPDATE professional_reviews 
        SET 
          rating = ${updates.rating}, 
          review_text = ${updates.reviewText}, 
          is_anonymous = ${updates.isAnonymous || false},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      if (result.rows.length === 0) return undefined;

      const r = result.rows[0] as any;
      return {
        id: r.id,
        reviewedUserId: r.target_user_id,
        reviewerUserId: r.user_id,
        rating: r.rating,
        reviewText: r.review_text,
        isAnonymous: updates.isAnonymous || false,
        category: r.category,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as ProfessionalReview;
    } catch (error) {
      console.error("Error updating professional review:", error);
      throw error;
    }
  }

  async recordJobApplication(applicationData: {
    userId: number;
    jobProfileId: number;
    action: string;
  }): Promise<any> {
    try {
      // First get the target user ID from the job profile
      const jobProfile = await this.getSuiteJobProfileById(
        applicationData.jobProfileId,
      );
      if (!jobProfile) {
        throw new Error("Job profile not found");
      }

      const result = await db.execute(sql`
        INSERT INTO suite_job_applications (user_id, target_profile_id, target_user_id, action, application_status, matched) 
        VALUES (${applicationData.userId}, ${applicationData.jobProfileId}, ${jobProfile.userId}, ${applicationData.action}, ${applicationData.action === "like" ? "pending" : "rejected"}, false)
        ON CONFLICT (user_id, target_profile_id) 
        DO UPDATE SET action = ${applicationData.action}, application_status = ${applicationData.action === "like" ? "pending" : "rejected"}, created_at = CURRENT_TIMESTAMP
        RETURNING *
      `);

      return result.rows[0];
    } catch (error) {
      console.error("Error recording job application:", error);
      throw error;
    }
  }

  // Swipe history operations for persistent undo functionality
  async addSwipeHistory(swipeData: InsertSwipeHistory): Promise<SwipeHistory> {
    try {
      const [history] = await db
        .insert(swipeHistory)
        .values(swipeData)
        .returning();
      return history;
    } catch (error) {
      console.error("Error adding swipe history:", error);
      throw error;
    }
  }

  async getUserSwipeHistory(
    userId: number,
    appMode: string,
    limit = 10,
  ): Promise<any[]> {
    try {
      // PERFORMANCE OPTIMIZATION: Only select essential fields for undo functionality
      // Removed expensive JOIN with full users table to fix 400-700ms query delays
      const history = await db
        .select({
          id: swipeHistory.id,
          userId: swipeHistory.userId,
          targetUserId: swipeHistory.targetUserId,
          action: swipeHistory.action,
          appMode: swipeHistory.appMode,
          timestamp: swipeHistory.timestamp,
        })
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.appMode, appMode),
          ),
        )
        .orderBy(desc(swipeHistory.timestamp))
        .limit(limit);
      return history;
    } catch (error) {
      console.error("Error getting swipe history:", error);
      throw error;
    }
  }

  async removeSwipeHistory(id: number): Promise<void> {
    try {
      await db.delete(swipeHistory).where(eq(swipeHistory.id, id));
    } catch (error) {
      console.error("Error removing swipe history:", error);
      throw error;
    }
  }

  async clearUserSwipeHistory(userId: number, appMode: string): Promise<void> {
    try {
      await db
        .delete(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.appMode, appMode),
          ),
        );
    } catch (error) {
      console.error("Error clearing swipe history:", error);
      throw error;
    }
  }

  async removeSwipeFromHistory(
    userId: number,
    targetUserId: number,
  ): Promise<void> {
    try {
      // Remove the most recent swipe for this specific user pair
      const [latestSwipe] = await db
        .select()
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.targetUserId, targetUserId),
          ),
        )
        .orderBy(desc(swipeHistory.timestamp))
        .limit(1);

      if (latestSwipe) {
        await db
          .delete(swipeHistory)
          .where(eq(swipeHistory.id, latestSwipe.id));
        console.log(
          `Removed swipe history record ${latestSwipe.id} for user ${userId} -> ${targetUserId}`,
        );
      }
    } catch (error) {
      console.error("Error removing swipe from history:", error);
      throw error;
    }
  }

  async removeMatchedUsersFromSwipeHistory(
    userId1: number,
    userId2: number,
    appMode?: string,
  ): Promise<void> {
    try {
      // Remove BOTH users' swipe records for each other from swipe_history
      // This prevents either user from undoing their swipe and destroying the match
      let whereCondition = or(
        and(
          eq(swipeHistory.userId, userId1),
          eq(swipeHistory.targetUserId, userId2),
        ),
        and(
          eq(swipeHistory.userId, userId2),
          eq(swipeHistory.targetUserId, userId1),
        ),
      );

      // If app mode is specified, also filter by app mode
      if (appMode) {
        whereCondition = and(whereCondition, eq(swipeHistory.appMode, appMode));
      }

      const result = await db.delete(swipeHistory).where(whereCondition);

      const modeText = appMode ? ` (${appMode})` : "";
      console.log(
        `[SWIPE-CLEANUP] Removed swipe history records for matched users ${userId1} ↔ ${userId2}${modeText} to protect match integrity`,
      );
    } catch (error) {
      console.error("Error removing matched users from swipe history:", error);
      throw error;
    }
  }

  // Connections Preferences Methods
  async getConnectionsPreferences(
    userId: number,
  ): Promise<ConnectionsPreferences | null> {
    try {
      const [preferences] = await db
        .select()
        .from(connectionsPreferences)
        .where(eq(connectionsPreferences.userId, userId));

      return preferences || null;
    } catch (error) {
      console.error("Error getting connections preferences:", error);
      throw error;
    }
  }

  async saveConnectionsPreferences(
    userId: number,
    data: any,
  ): Promise<ConnectionsPreferences> {
    try {
      // Clean the data - remove timestamp fields that should be auto-managed
      const cleanData = { ...data };
      delete cleanData.id;
      delete cleanData.createdAt;
      delete cleanData.updatedAt;
      delete cleanData.userId;

      console.log("Saving connections preferences for user:", userId);
      console.log("🔧 RAW DATA RECEIVED:", JSON.stringify(data, null, 2));

      // Note: No manual JSON.stringify needed - database columns are JSON type and Drizzle handles serialization automatically

      // Check if preferences already exist
      const existing = await this.getConnectionsPreferences(userId);

      if (existing) {
        // Update existing preferences
        console.log("CRITICAL DEBUG: About to update with data:", cleanData);
        console.log(
          "CRITICAL DEBUG: jobs_education_level value:",
          cleanData.jobs_education_level,
          typeof cleanData.jobs_education_level,
        );
        console.log(
          "CRITICAL DEBUG: jobs_salary_range value:",
          cleanData.jobs_salary_range,
          typeof cleanData.jobs_salary_range,
        );

        // CRITICAL FIX: Convert JavaScript arrays to PostgreSQL arrays for proper storage
        const processedData = { ...cleanData };

        // Convert all array fields to proper PostgreSQL array format
        const arrayFields = [
          "mentorship_looking_for",
          "mentorship_experience_level",
          "mentorship_industries",
          "mentorship_areas_of_expertise",
          "mentorship_education_level",
          "mentorship_skills",
          "mentorship_topics",
          "mentorship_format",
          "networking_purpose",
          "networking_company_size",
          "networking_seniority",
          "networking_industries",
          "networking_areas_of_expertise",
          "networking_education_level",
          "networking_skills",
          "networking_functional_areas",
          "networking_event_preference",
          "jobs_types",
          "jobs_salary_range",
          "jobs_work_arrangement",
          "jobs_company_size",
          "jobs_industries",
          "jobs_education_level",
          "jobs_skills",
          "jobs_experience_level",
          "jobs_functional_areas",
          "deal_breakers",
        ];

        arrayFields.forEach((field) => {
          if (processedData[field] && Array.isArray(processedData[field])) {
            // Keep as JavaScript array - Drizzle should handle this correctly
            console.log(
              `ARRAY-FIX: Converting ${field}:`,
              processedData[field],
            );
          }
        });

        console.log("ARRAY-FIX: Final processed data:", processedData);

        // CRITICAL FIX: Handle array fields with proper PostgreSQL array conversion
        const arrayFieldsToProcess = [
          "mentorship_looking_for",
          "mentorship_experience_level",
          "mentorship_industries",
          "mentorship_areas_of_expertise",
          "mentorship_education_level",
          "mentorship_skills",
          "mentorship_topics",
          "mentorship_format",
          "networking_purpose",
          "networking_company_size",
          "networking_seniority",
          "networking_industries",
          "networking_areas_of_expertise",
          "networking_education_level",
          "networking_skills",
          "networking_functional_areas",
          "networking_event_preference",
          "jobs_types",
          "jobs_salary_range",
          "jobs_work_arrangement",
          "jobs_company_size",
          "jobs_industries",
          "jobs_education_level",
          "jobs_skills",
          "jobs_experience_level",
          "jobs_functional_areas",
          "deal_breakers",
        ];

        // Process each array field individually with raw SQL
        for (const field of arrayFieldsToProcess) {
          if (processedData[field] && Array.isArray(processedData[field])) {
            console.log(
              `ARRAY-FIX: Processing ${field}:`,
              processedData[field],
            );
            try {
              // Convert JavaScript array to PostgreSQL array format
              const arrayValue = `{${processedData[field].map((item) => `"${item}"`).join(",")}}`;
              console.log(
                `ARRAY-FIX: PostgreSQL array format for ${field}:`,
                arrayValue,
              );

              await db.execute(
                sql.raw(`UPDATE connections_preferences 
                SET ${field} = '${arrayValue}'::text[], 
                    updated_at = NOW() 
                WHERE user_id = ${userId}`),
              );
              console.log(`ARRAY-FIX: Successfully updated ${field}`);
            } catch (sqlError) {
              console.error(`ARRAY-FIX: Failed to update ${field}:`, sqlError);
            }
          }
        }

        // CRITICAL FIX: Handle JSON fields properly and preserve single-value fields
        const finalUpdateData = { ...processedData };

        // WEIGHTS HANDLING: Remove auto-stringify since we handle weights with direct SQL
        // The weights fields will be handled by direct SQL updates below, not through Drizzle

        // CRITICAL FIX: Ensure single-value fields are preserved correctly from ORIGINAL data
        // Use original data to bypass any processing issues in cleanData
        if (data.networking_location_preference !== undefined) {
          finalUpdateData.networking_location_preference =
            data.networking_location_preference;
          console.log(
            "🔧 SINGLE-FIELD FIX: Using original networking_location_preference:",
            data.networking_location_preference,
          );
        }
        if (data.mentorship_location_preference !== undefined) {
          finalUpdateData.mentorship_location_preference =
            data.mentorship_location_preference;
        }
        if (data.jobs_work_location !== undefined) {
          finalUpdateData.jobs_work_location = data.jobs_work_location;
        }
        if (data.mentorship_time_commitment !== undefined) {
          finalUpdateData.mentorship_time_commitment =
            data.mentorship_time_commitment;
        }
        if (data.jobs_weights !== undefined) {
          finalUpdateData.jobs_weights = data.jobs_weights;
        }
        if (data.mentorship_weights !== undefined) {
          finalUpdateData.mentorship_weights = data.mentorship_weights;
        }
        if (data.networking_weights !== undefined) {
          finalUpdateData.networking_weights = data.networking_weights;
        }

        const updateData = {
          ...finalUpdateData,
          updatedAt: new Date(),
        };

        // CRITICAL FIX: Direct SQL update for location preference fields to bypass Drizzle issues
        if (updateData.networking_location_preference !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET networking_location_preference = ${updateData.networking_location_preference}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated networking_location_preference to:",
            updateData.networking_location_preference,
          );
        }

        if (updateData.mentorship_location_preference !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET mentorship_location_preference = ${updateData.mentorship_location_preference}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated mentorship_location_preference to:",
            updateData.mentorship_location_preference,
          );
        }

        if (updateData.jobs_work_location !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_work_location = ${updateData.jobs_work_location}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated jobs_work_location to:",
            updateData.jobs_work_location,
          );
        }

        // CRITICAL FIX: Direct SQL update for weights fields (JSON objects)
        if (data.jobs_weights !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_weights = ${JSON.stringify(data.jobs_weights)}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated jobs_weights to:",
            data.jobs_weights,
          );
        }

        // SALARY FIELDS: Direct updates for new dynamic salary fields
        if (data.jobs_salary_currency !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_salary_currency = ${data.jobs_salary_currency}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 SALARY: Updated jobs_salary_currency to:",
            data.jobs_salary_currency,
          );
        }

        if (data.jobs_salary_min !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_salary_min = ${data.jobs_salary_min}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 SALARY: Updated jobs_salary_min to:",
            data.jobs_salary_min,
          );
        }

        if (data.jobs_salary_max !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_salary_max = ${data.jobs_salary_max}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 SALARY: Updated jobs_salary_max to:",
            data.jobs_salary_max,
          );
        }

        if (data.jobs_salary_period !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET jobs_salary_period = ${data.jobs_salary_period}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 SALARY: Updated jobs_salary_period to:",
            data.jobs_salary_period,
          );
        }

        if (data.mentorship_weights !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET mentorship_weights = ${JSON.stringify(data.mentorship_weights)}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated mentorship_weights to:",
            data.mentorship_weights,
          );
        }

        if (data.networking_weights !== undefined) {
          await db.execute(sql`
            UPDATE connections_preferences 
            SET networking_weights = ${JSON.stringify(data.networking_weights)}, 
                updated_at = ${updateData.updatedAt}
            WHERE user_id = ${userId}
          `);
          console.log(
            "🔧 DIRECT SQL: Updated networking_weights to:",
            data.networking_weights,
          );
        }

        const [updated] = await db
          .update(connectionsPreferences)
          .set(updateData)
          .where(eq(connectionsPreferences.userId, userId))
          .returning();

        console.log(
          "Connections preferences updated successfully for user:",
          userId,
        );
        return updated;
      } else {
        // Create new preferences
        const [created] = await db
          .insert(connectionsPreferences)
          .values({
            ...cleanData,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return created;
      }
    } catch (error) {
      console.error("Error saving connections preferences:", error);
      throw error;
    }
  }

  // ===================================
  // USER REPORT STRIKES METHODS
  // ===================================

  async createUserReportStrike(
    reportStrike: InsertUserReportStrike,
  ): Promise<UserReportStrike> {
    const [strike] = await db
      .insert(userReportStrikes)
      .values({
        ...reportStrike,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return strike;
  }

  async getUserReportStrikes(
    reportedUserId: number,
  ): Promise<UserReportStrike[]> {
    return await db
      .select()
      .from(userReportStrikes)
      .where(eq(userReportStrikes.reportedUserId, reportedUserId))
      .orderBy(desc(userReportStrikes.createdAt));
  }

  async getUserReportStrikeCount(reportedUserId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(userReportStrikes)
      .where(eq(userReportStrikes.reportedUserId, reportedUserId));
    return result[0]?.count || 0;
  }

  async getReportStrikesInLast24Hours(
    reportedUserId: number,
  ): Promise<UserReportStrike[]> {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    return await db
      .select()
      .from(userReportStrikes)
      .where(
        and(
          eq(userReportStrikes.reportedUserId, reportedUserId),
          sql`${userReportStrikes.createdAt} >= ${yesterday}`,
        ),
      )
      .orderBy(desc(userReportStrikes.createdAt));
  }

  // ===== PAYMENT SYSTEM IMPLEMENTATION =====
  // Subscription operations
  async createSubscription(
    subscription: InsertSubscription,
  ): Promise<Subscription> {
    try {
      const [result] = await db
        .insert(subscriptions)
        .values(subscription)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  async getSubscriptionById(id: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, id));
      return subscription || undefined;
    } catch (error) {
      console.error("Error getting subscription by ID:", error);
      throw error;
    }
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      return subscription || undefined;
    } catch (error) {
      console.error("Error getting user subscription:", error);
      throw error;
    }
  }

  async getUserActiveSubscription(
    userId: number,
  ): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active"),
            sql`${subscriptions.currentPeriodEnd} > NOW()`,
          ),
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      return subscription || undefined;
    } catch (error) {
      console.error("Error getting user active subscription:", error);
      throw error;
    }
  }

  async updateSubscription(
    id: number,
    updates: Partial<Subscription>,
  ): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .update(subscriptions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(subscriptions.id, id))
        .returning();
      return subscription || undefined;
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  async cancelSubscription(id: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();
      return subscription || undefined;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  async getExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      return await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active"),
            sql`${subscriptions.currentPeriodEnd} < NOW()`,
          ),
        );
    } catch (error) {
      console.error("Error getting expired subscriptions:", error);
      throw error;
    }
  }

  async getSubscriptionsByProvider(provider: string): Promise<Subscription[]> {
    try {
      return await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.provider, provider))
        .orderBy(desc(subscriptions.createdAt));
    } catch (error) {
      console.error("Error getting subscriptions by provider:", error);
      throw error;
    }
  }

  async getUserSubscriptionHistory(userId: number): Promise<Subscription[]> {
    try {
      return await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt));
    } catch (error) {
      console.error("Error getting user subscription history:", error);
      throw error;
    }
  }

  // Payment method operations
  async createPaymentMethod(
    paymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod> {
    try {
      const [result] = await db
        .insert(paymentMethods)
        .values(paymentMethod)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating payment method:", error);
      throw error;
    }
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, id));
      return paymentMethod || undefined;
    } catch (error) {
      console.error("Error getting payment method by ID:", error);
      throw error;
    }
  }

  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    try {
      return await db
        .select()
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.userId, userId),
            eq(paymentMethods.isActive, true),
          ),
        )
        .orderBy(
          desc(paymentMethods.isDefault),
          desc(paymentMethods.createdAt),
        );
    } catch (error) {
      console.error("Error getting user payment methods:", error);
      throw error;
    }
  }

  async getUserDefaultPaymentMethod(
    userId: number,
  ): Promise<PaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.userId, userId),
            eq(paymentMethods.isDefault, true),
            eq(paymentMethods.isActive, true),
          ),
        )
        .limit(1);
      return paymentMethod || undefined;
    } catch (error) {
      console.error("Error getting user default payment method:", error);
      throw error;
    }
  }

  async updatePaymentMethod(
    id: number,
    updates: Partial<PaymentMethod>,
  ): Promise<PaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .update(paymentMethods)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(paymentMethods.id, id))
        .returning();
      return paymentMethod || undefined;
    } catch (error) {
      console.error("Error updating payment method:", error);
      throw error;
    }
  }

  async deletePaymentMethod(id: number): Promise<void> {
    try {
      await db
        .update(paymentMethods)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(paymentMethods.id, id));
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    userId: number,
    paymentMethodId: number,
  ): Promise<PaymentMethod | undefined> {
    try {
      // First, unset all existing default payment methods for the user
      await db
        .update(paymentMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(paymentMethods.userId, userId));

      // Then set the specified payment method as default
      const [paymentMethod] = await db
        .update(paymentMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(paymentMethods.id, paymentMethodId),
            eq(paymentMethods.userId, userId),
          ),
        )
        .returning();
      return paymentMethod || undefined;
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error;
    }
  }

  // Payment history operations
  async createPaymentHistory(
    payment: InsertPaymentHistory,
  ): Promise<PaymentHistory> {
    try {
      const [result] = await db
        .insert(paymentHistory)
        .values(payment)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating payment history:", error);
      throw error;
    }
  }

  async getPaymentHistoryById(id: number): Promise<PaymentHistory | undefined> {
    try {
      const [payment] = await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.id, id));
      return payment || undefined;
    } catch (error) {
      console.error("Error getting payment history by ID:", error);
      throw error;
    }
  }

  async getUserPaymentHistory(userId: number): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.userId, userId))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting user payment history:", error);
      throw error;
    }
  }

  async getSubscriptionPaymentHistory(
    subscriptionId: number,
  ): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.subscriptionId, subscriptionId))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting subscription payment history:", error);
      throw error;
    }
  }

  async getPaymentHistoryByProvider(
    provider: string,
  ): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.provider, provider))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting payment history by provider:", error);
      throw error;
    }
  }

  async getFailedPayments(userId?: number): Promise<PaymentHistory[]> {
    try {
      const conditions = [eq(paymentHistory.status, "failed")];
      if (userId) {
        conditions.push(eq(paymentHistory.userId, userId));
      }

      return await db
        .select()
        .from(paymentHistory)
        .where(and(...conditions))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting failed payments:", error);
      throw error;
    }
  }

  async updatePaymentStatus(
    id: number,
    status: string,
    metadata?: string,
  ): Promise<PaymentHistory | undefined> {
    try {
      const updates: Partial<PaymentHistory> = {
        status,
        updatedAt: new Date(),
      };
      if (metadata) {
        updates.metadata = metadata;
      }

      const [payment] = await db
        .update(paymentHistory)
        .set(updates)
        .where(eq(paymentHistory.id, id))
        .returning();
      return payment || undefined;
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  }

  // Subscription events operations
  async createSubscriptionEvent(
    event: InsertSubscriptionEvent,
  ): Promise<SubscriptionEvent> {
    try {
      const [result] = await db
        .insert(subscriptionEvents)
        .values(event)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating subscription event:", error);
      throw error;
    }
  }

  async getSubscriptionEvents(
    subscriptionId: number,
  ): Promise<SubscriptionEvent[]> {
    try {
      return await db
        .select()
        .from(subscriptionEvents)
        .where(eq(subscriptionEvents.subscriptionId, subscriptionId))
        .orderBy(desc(subscriptionEvents.createdAt));
    } catch (error) {
      console.error("Error getting subscription events:", error);
      throw error;
    }
  }

  async getUserSubscriptionEvents(
    userId: number,
  ): Promise<SubscriptionEvent[]> {
    try {
      return await db
        .select()
        .from(subscriptionEvents)
        .where(eq(subscriptionEvents.userId, userId))
        .orderBy(desc(subscriptionEvents.createdAt));
    } catch (error) {
      console.error("Error getting user subscription events:", error);
      throw error;
    }
  }

  // Regional pricing operations
  async createRegionalPricing(
    pricing: InsertRegionalPricing,
  ): Promise<RegionalPricing> {
    try {
      const [result] = await db
        .insert(regionalPricing)
        .values(pricing)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating regional pricing:", error);
      throw error;
    }
  }

  async getRegionalPricing(
    planType: string,
    region: string,
    currency: string,
  ): Promise<RegionalPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(regionalPricing)
        .where(
          and(
            eq(regionalPricing.planType, planType),
            eq(regionalPricing.region, region),
            eq(regionalPricing.currency, currency),
            eq(regionalPricing.isActive, true),
            or(
              eq(regionalPricing.validUntil, null),
              sql`${regionalPricing.validUntil} > NOW()`,
            ),
          ),
        )
        .orderBy(desc(regionalPricing.createdAt))
        .limit(1);
      return pricing || undefined;
    } catch (error) {
      console.error("Error getting regional pricing:", error);
      throw error;
    }
  }

  async getActivePricingForRegion(region: string): Promise<RegionalPricing[]> {
    try {
      return await db
        .select()
        .from(regionalPricing)
        .where(
          and(
            eq(regionalPricing.region, region),
            eq(regionalPricing.isActive, true),
            or(
              eq(regionalPricing.validUntil, null),
              sql`${regionalPricing.validUntil} > NOW()`,
            ),
          ),
        )
        .orderBy(regionalPricing.planType, desc(regionalPricing.createdAt));
    } catch (error) {
      console.error("Error getting active pricing for region:", error);
      throw error;
    }
  }

  async updateRegionalPricing(
    id: number,
    updates: Partial<RegionalPricing>,
  ): Promise<RegionalPricing | undefined> {
    try {
      const [pricing] = await db
        .update(regionalPricing)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(regionalPricing.id, id))
        .returning();
      return pricing || undefined;
    } catch (error) {
      console.error("Error updating regional pricing:", error);
      throw error;
    }
  }

  async getDefaultPricing(
    planType: string,
  ): Promise<RegionalPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(regionalPricing)
        .where(
          and(
            eq(regionalPricing.planType, planType),
            eq(regionalPricing.region, "global"),
            eq(regionalPricing.isActive, true),
            or(
              eq(regionalPricing.validUntil, null),
              sql`${regionalPricing.validUntil} > NOW()`,
            ),
          ),
        )
        .orderBy(desc(regionalPricing.createdAt))
        .limit(1);
      return pricing || undefined;
    } catch (error) {
      console.error("Error getting default pricing:", error);
      throw error;
    }
  }

  // Promotional code operations
  async createPromotionalCode(
    promoCode: InsertPromotionalCode,
  ): Promise<PromotionalCode> {
    try {
      const [result] = await db
        .insert(promotionalCodes)
        .values(promoCode)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating promotional code:", error);
      throw error;
    }
  }

  async getPromotionalCodeByCode(
    code: string,
  ): Promise<PromotionalCode | undefined> {
    try {
      const [promoCode] = await db
        .select()
        .from(promotionalCodes)
        .where(
          and(
            eq(promotionalCodes.code, code),
            eq(promotionalCodes.isActive, true),
            sql`${promotionalCodes.validFrom} <= NOW()`,
            or(
              eq(promotionalCodes.validUntil, null),
              sql`${promotionalCodes.validUntil} > NOW()`,
            ),
          ),
        );
      return promoCode || undefined;
    } catch (error) {
      console.error("Error getting promotional code by code:", error);
      throw error;
    }
  }

  async validatePromotionalCode(
    code: string,
    userId: number,
    planType: string,
    region: string,
  ): Promise<{ valid: boolean; discount?: number; error?: string }> {
    try {
      const promoCode = await this.getPromotionalCodeByCode(code);

      if (!promoCode) {
        return { valid: false, error: "Invalid or expired promotional code" };
      }

      // Check if user has already used this code
      const existingUsage = await this.getUserPromotionalCodeUsage(
        userId,
        promoCode.id,
      );
      if (existingUsage) {
        return { valid: false, error: "Promotional code already used" };
      }

      // Check usage limits
      if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
        return { valid: false, error: "Promotional code usage limit reached" };
      }

      // Check plan type restrictions
      if (promoCode.planTypes) {
        const allowedPlanTypes = JSON.parse(promoCode.planTypes);
        if (!allowedPlanTypes.includes(planType)) {
          return {
            valid: false,
            error: "Promotional code not valid for this plan",
          };
        }
      }

      // Check region restrictions
      if (promoCode.regions) {
        const allowedRegions = JSON.parse(promoCode.regions);
        if (!allowedRegions.includes(region)) {
          return {
            valid: false,
            error: "Promotional code not valid for this region",
          };
        }
      }

      return { valid: true, discount: promoCode.value };
    } catch (error) {
      console.error("Error validating promotional code:", error);
      return { valid: false, error: "Error validating promotional code" };
    }
  }

  async usePromotionalCode(
    usage: InsertPromotionalCodeUsage,
  ): Promise<PromotionalCodeUsage> {
    try {
      const [result] = await db
        .insert(promotionalCodeUsage)
        .values(usage)
        .returning();

      // Increment usage count
      await this.incrementPromotionalCodeUsage(usage.promoCodeId);

      return result;
    } catch (error) {
      console.error("Error using promotional code:", error);
      throw error;
    }
  }

  async getPromotionalCodeUsage(
    userId: number,
  ): Promise<PromotionalCodeUsage[]> {
    try {
      return await db
        .select()
        .from(promotionalCodeUsage)
        .where(eq(promotionalCodeUsage.userId, userId))
        .orderBy(desc(promotionalCodeUsage.usedAt));
    } catch (error) {
      console.error("Error getting promotional code usage:", error);
      throw error;
    }
  }

  async getUserPromotionalCodeUsage(
    userId: number,
    promoCodeId: number,
  ): Promise<PromotionalCodeUsage | undefined> {
    try {
      const [usage] = await db
        .select()
        .from(promotionalCodeUsage)
        .where(
          and(
            eq(promotionalCodeUsage.userId, userId),
            eq(promotionalCodeUsage.promoCodeId, promoCodeId),
          ),
        );
      return usage || undefined;
    } catch (error) {
      console.error("Error getting user promotional code usage:", error);
      throw error;
    }
  }

  async incrementPromotionalCodeUsage(
    promoCodeId: number,
  ): Promise<PromotionalCode | undefined> {
    try {
      const [promoCode] = await db
        .update(promotionalCodes)
        .set({
          currentUses: sql`${promotionalCodes.currentUses} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(promotionalCodes.id, promoCodeId))
        .returning();
      return promoCode || undefined;
    } catch (error) {
      console.error("Error incrementing promotional code usage:", error);
      throw error;
    }
  }

  // Payment analytics and reporting
  async getRevenueByRegion(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ region: string; revenue: number; currency: string }>> {
    try {
      const conditions = [eq(paymentHistory.status, "succeeded")];

      if (startDate) {
        conditions.push(sql`${paymentHistory.createdAt} >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(sql`${paymentHistory.createdAt} <= ${endDate}`);
      }

      const results = await db
        .select({
          region: subscriptions.region,
          revenue: sql<number>`SUM(${paymentHistory.amount})`,
          currency: paymentHistory.currency,
        })
        .from(paymentHistory)
        .innerJoin(
          subscriptions,
          eq(paymentHistory.subscriptionId, subscriptions.id),
        )
        .where(and(...conditions))
        .groupBy(subscriptions.region, paymentHistory.currency)
        .orderBy(desc(sql`SUM(${paymentHistory.amount})`));

      return results;
    } catch (error) {
      console.error("Error getting revenue by region:", error);
      throw error;
    }
  }

  async getSubscriptionStats(): Promise<{
    active: number;
    cancelled: number;
    total: number;
  }> {
    try {
      const [activeCount] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"));

      const [cancelledCount] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, "cancelled"));

      const [totalCount] = await db
        .select({ count: count() })
        .from(subscriptions);

      return {
        active: activeCount.count,
        cancelled: cancelledCount.count,
        total: totalCount.count,
      };
    } catch (error) {
      console.error("Error getting subscription stats:", error);
      throw error;
    }
  }

  async getPaymentFailureRate(provider?: string): Promise<number> {
    try {
      const conditions = [];
      if (provider) {
        conditions.push(eq(paymentHistory.provider, provider));
      }

      const [totalPayments] = await db
        .select({ count: count() })
        .from(paymentHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const failedConditions = [
        ...conditions,
        eq(paymentHistory.status, "failed"),
      ];
      const [failedPayments] = await db
        .select({ count: count() })
        .from(paymentHistory)
        .where(and(...failedConditions));

      if (totalPayments.count === 0) return 0;
      return (failedPayments.count / totalPayments.count) * 100;
    } catch (error) {
      console.error("Error getting payment failure rate:", error);
      throw error;
    }
  }

  async getMostUsedPaymentMethods(): Promise<
    Array<{ type: string; count: number }>
  > {
    try {
      const results = await db
        .select({
          type: paymentHistory.paymentMethod,
          count: sql<number>`COUNT(*)`,
        })
        .from(paymentHistory)
        .where(eq(paymentHistory.status, "succeeded"))
        .groupBy(paymentHistory.paymentMethod)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      return results;
    } catch (error) {
      console.error("Error getting most used payment methods:", error);
      throw error;
    }
  }

  // ===================================
  // SUBSCRIPTION IMPLEMENTATION METHODS
  // ===================================

  async createSubscription(
    subscription: InsertSubscription,
  ): Promise<Subscription> {
    try {
      const [created] = await db
        .insert(subscriptions)
        .values(subscription)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, id));
      return subscription;
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw error;
    }
  }

  async getSubscriptionByUser(
    userId: number,
  ): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));
      return subscription;
    } catch (error) {
      console.error("Error getting subscription by user:", error);
      throw error;
    }
  }

  async getSubscriptionByStripeId(
    subscriptionId: string,
  ): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.subscriptionId, subscriptionId));
      return subscription;
    } catch (error) {
      console.error("Error getting subscription by Stripe ID:", error);
      throw error;
    }
  }

  async updateSubscription(
    id: number,
    updates: Partial<Subscription>,
  ): Promise<Subscription | undefined> {
    try {
      const [updated] = await db
        .update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  async cancelSubscription(id: number): Promise<Subscription | undefined> {
    try {
      const [cancelled] = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();
      return cancelled;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  async createPaymentMethod(
    paymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod> {
    try {
      const [created] = await db
        .insert(paymentMethods)
        .values(paymentMethod)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating payment method:", error);
      throw error;
    }
  }

  async getPaymentMethodsByUser(userId: number): Promise<PaymentMethod[]> {
    try {
      return await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, userId));
    } catch (error) {
      console.error("Error getting payment methods by user:", error);
      throw error;
    }
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    try {
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, id));
      return paymentMethod;
    } catch (error) {
      console.error("Error getting payment method:", error);
      throw error;
    }
  }

  async updatePaymentMethod(
    id: number,
    updates: Partial<PaymentMethod>,
  ): Promise<PaymentMethod | undefined> {
    try {
      const [updated] = await db
        .update(paymentMethods)
        .set(updates)
        .where(eq(paymentMethods.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating payment method:", error);
      throw error;
    }
  }

  async deletePaymentMethod(id: number): Promise<void> {
    try {
      await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error;
    }
  }

  async createPaymentHistory(
    payment: InsertPaymentHistory,
  ): Promise<PaymentHistory> {
    try {
      const [created] = await db
        .insert(paymentHistory)
        .values(payment)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating payment history:", error);
      throw error;
    }
  }

  async getPaymentHistoryByUser(userId: number): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.userId, userId))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting payment history by user:", error);
      throw error;
    }
  }

  async getPaymentHistoryBySubscription(
    subscriptionId: number,
  ): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.subscriptionId, subscriptionId))
        .orderBy(desc(paymentHistory.createdAt));
    } catch (error) {
      console.error("Error getting payment history by subscription:", error);
      throw error;
    }
  }

  async getRegionalPricing(
    region: string,
    planType?: string,
  ): Promise<RegionalPricing[]> {
    try {
      const conditions = [
        eq(regionalPricing.region, region),
        eq(regionalPricing.isActive, true),
      ];
      if (planType) {
        conditions.push(eq(regionalPricing.planType, planType));
      }

      return await db
        .select()
        .from(regionalPricing)
        .where(and(...conditions))
        .orderBy(regionalPricing.planType);
    } catch (error) {
      console.error("Error getting regional pricing:", error);
      throw error;
    }
  }

  async getRegionalPricingByRegion(region: string): Promise<RegionalPricing[]> {
    try {
      return await db
        .select()
        .from(regionalPricing)
        .where(
          and(
            eq(regionalPricing.region, region),
            eq(regionalPricing.isActive, true),
            or(
              eq(regionalPricing.validUntil, null),
              sql`${regionalPricing.validUntil} > NOW()`,
            ),
          ),
        )
        .orderBy(regionalPricing.planType);
    } catch (error) {
      console.error("Error getting regional pricing by region:", error);
      throw error;
    }
  }

  async createRegionalPricing(
    pricing: InsertRegionalPricing,
  ): Promise<RegionalPricing> {
    try {
      const [created] = await db
        .insert(regionalPricing)
        .values(pricing)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating regional pricing:", error);
      throw error;
    }
  }

  async getPromotionalCode(code: string): Promise<PromotionalCode | undefined> {
    try {
      const [promo] = await db
        .select()
        .from(promotionalCodes)
        .where(eq(promotionalCodes.code, code));
      return promo;
    } catch (error) {
      console.error("Error getting promotional code:", error);
      throw error;
    }
  }

  async validatePromotionalCode(
    code: string,
    userId: number,
    region: string,
  ): Promise<{ valid: boolean; discount?: number; error?: string }> {
    try {
      const promoCode = await this.getPromotionalCode(code);

      if (!promoCode) {
        return { valid: false, error: "Promotional code not found" };
      }

      // Check if code is active
      if (!promoCode.isActive) {
        return { valid: false, error: "Promotional code is no longer active" };
      }

      // Check expiration
      if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
        return { valid: false, error: "Promotional code has expired" };
      }

      // Check usage limits
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return { valid: false, error: "Promotional code usage limit reached" };
      }

      // Check if user has already used this code
      const existingUsage = await this.getUserPromotionalCodeUsage(
        userId,
        promoCode.id,
      );
      if (existingUsage) {
        return {
          valid: false,
          error: "You have already used this promotional code",
        };
      }

      return { valid: true, discount: promoCode.discountPercentage };
    } catch (error) {
      console.error("Error validating promotional code:", error);
      return { valid: false, error: "Error validating promotional code" };
    }
  }

  async createPromotionalCodeUsage(
    usage: InsertPromotionalCodeUsage,
  ): Promise<PromotionalCodeUsage> {
    try {
      const [created] = await db
        .insert(promotionalCodeUsage)
        .values(usage)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating promotional code usage:", error);
      throw error;
    }
  }

  // Unified API performance optimization methods
  async getSwipeHistory(
    userId: number,
    appMode: string,
    limit: number,
  ): Promise<any[]> {
    try {
      const startTime = Date.now();

      // Fast query to get recent swipe history
      const history = await db
        .select()
        .from(swipeHistory)
        .where(
          and(
            eq(swipeHistory.userId, userId),
            eq(swipeHistory.appMode, appMode),
          ),
        )
        .orderBy(desc(swipeHistory.timestamp))
        .limit(limit);

      const duration = Date.now() - startTime;
      console.log(
        `[SWIPE-HISTORY-FAST] User ${userId}: Query completed in ${duration}ms, returning ${history.length} items`,
      );

      return history;
    } catch (error) {
      console.error("Error fetching swipe history:", error);
      return [];
    }
  }

  // Matrix Factorization helper methods
  async getAllMatches(): Promise<any[]> {
    try {
      const allMatches = await db
        .select({
          id: matches.id,
          userId1: matches.userId1,
          userId2: matches.userId2,
          matched: matches.matched,
          isDislike: matches.isDislike,
          createdAt: matches.createdAt,
          metadata: matches.metadata,
        })
        .from(matches);

      console.log(
        `[STORAGE] Retrieved ${allMatches.length} matches for matrix factorization`,
      );
      return allMatches;
    } catch (error) {
      console.error("Error fetching all matches:", error);
      return [];
    }
  }

  async getAllSwipeHistory(): Promise<any[]> {
    try {
      const allSwipes = await db
        .select({
          id: swipeHistory.id,
          userId: swipeHistory.userId,
          targetUserId: swipeHistory.targetUserId,
          action: swipeHistory.action,
          appMode: swipeHistory.appMode,
          timestamp: swipeHistory.timestamp,
        })
        .from(swipeHistory);

      console.log(
        `[STORAGE] Retrieved ${allSwipes.length} swipe history records for matrix factorization`,
      );
      return allSwipes;
    } catch (error) {
      console.error("Error fetching all swipe history:", error);
      return [];
    }
  }

  async getPremiumStatus(
    userId: number,
  ): Promise<{ premiumAccess: boolean; subscriptionStatus?: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { premiumAccess: false };
      }

      // Check subscription status
      const subscription = await this.getUserActiveSubscription(userId);
      return {
        premiumAccess: user.premiumAccess || false,
        subscriptionStatus: subscription?.status || "none",
      };
    } catch (error) {
      console.error("Error fetching premium status:", error);
      return { premiumAccess: false };
    }
  }

  async getMatchCounts(
    userId: number,
  ): Promise<{ confirmed: number; pending: number; total: number }> {
    try {
      console.log(
        `[MATCH-COUNTS-OPTIMIZED] User ${userId}: Starting optimized match count query`,
      );
      const startTime = Date.now();

      // Optimized: Single SQL aggregation query instead of fetching all matches
      const [result] = await db
        .select({
          confirmed: sql<number>`COUNT(CASE WHEN matched = true THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN matched = false AND is_dislike = false THEN 1 END)`,
          total: sql<number>`COUNT(*)`,
        })
        .from(matches)
        .where(or(eq(matches.userId1, userId), eq(matches.userId2, userId)));

      const duration = Date.now() - startTime;
      console.log(
        `[MATCH-COUNTS-OPTIMIZED] User ${userId}: Query completed in ${duration}ms`,
      );

      return {
        confirmed: Number(result?.confirmed) || 0,
        pending: Number(result?.pending) || 0,
        total: Number(result?.total) || 0,
      };
    } catch (error) {
      console.error("Error fetching match counts:", error);
      return { confirmed: 0, pending: 0, total: 0 };
    }
  }

  async getMatches(userId: number): Promise<Match[]> {
    try {
      // CRITICAL FIX: Include SUITE matches in main matches endpoint
      // Use getMatchesByUserId (includes SUITE) instead of getMeetMatchesByUserId (MEET only)
      const matches = await this.getMatchesByUserId(userId);
      console.log(
        `[MATCH-DEBUG] getMatches for user ${userId}: Found ${matches.length} matches`,
      );
      if (matches.length > 0) {
        console.log(
          `[MATCH-DEBUG] Match details:`,
          matches.map((m) => ({
            id: m.id,
            userId1: m.userId1,
            userId2: m.userId2,
            matched: m.matched,
            metadata: m.metadata,
          })),
        );
      }
      return matches;
    } catch (error) {
      console.error("Error fetching matches:", error);
      return [];
    }
  }

  async getSuiteConnectionCounts(userId: number): Promise<any> {
    try {
      console.log(
        `[SUITE-COUNTS-OPTIMIZED] User ${userId}: Starting optimized count queries`,
      );
      const startTime = Date.now();

      // Optimized: Use SQL aggregations with correct column names
      const [networkingResult] = await db
        .select({
          confirmed: sql<number>`COUNT(CASE WHEN matched = true THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN matched = false AND is_dislike = false THEN 1 END)`,
        })
        .from(suiteNetworkingConnections)
        .where(eq(suiteNetworkingConnections.userId, userId));

      const [mentorshipResult] = await db
        .select({
          confirmed: sql<number>`COUNT(CASE WHEN matched = true THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN matched = false AND is_dislike = false THEN 1 END)`,
        })
        .from(suiteMentorshipConnections)
        .where(eq(suiteMentorshipConnections.userId, userId));

      const [jobsResult] = await db
        .select({
          accepted: sql<number>`COUNT(CASE WHEN action = 'accepted' THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN action = 'pending' THEN 1 END)`,
        })
        .from(suiteJobApplications)
        .where(eq(suiteJobApplications.userId, userId));

      const duration = Date.now() - startTime;
      console.log(
        `[SUITE-COUNTS-OPTIMIZED] User ${userId}: Query completed in ${duration}ms`,
      );

      return {
        networking: {
          matches: Number(networkingResult?.confirmed) || 0,
          pending: Number(networkingResult?.pending) || 0,
        },
        mentorship: {
          matches: Number(mentorshipResult?.confirmed) || 0,
          pending: Number(mentorshipResult?.pending) || 0,
        },
        jobs: {
          matches: Number(jobsResult?.accepted) || 0,
          pending: Number(jobsResult?.pending) || 0,
        },
      };
    } catch (error) {
      console.error("Error fetching suite connection counts:", error);
      return {
        networking: { matches: 0, pending: 0 },
        mentorship: { matches: 0, pending: 0 },
        jobs: { matches: 0, pending: 0 },
      };
    }
  }

  // KWAME AI Conversation methods
  async createKwameConversation(
    conversation: InsertKwameConversation,
  ): Promise<KwameConversation> {
    const [newConversation] = await db
      .insert(kwameConversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getKwameConversationHistory(
    userId: number,
    limit: number = 500,
  ): Promise<KwameConversation[]> {
    const conversations = await db
      .select()
      .from(kwameConversations)
      .where(eq(kwameConversations.userId, userId))
      .orderBy(desc(kwameConversations.createdAt))
      .limit(limit);

    // Return in chronological order (oldest first) for context
    return conversations.reverse();
  }

  async getRecentKwameContext(
    userId: number,
    limit: number = 20,
  ): Promise<KwameConversation[]> {
    const conversations = await db
      .select()
      .from(kwameConversations)
      .where(eq(kwameConversations.userId, userId))
      .orderBy(desc(kwameConversations.createdAt))
      .limit(limit);

    // Return in chronological order for context building
    return conversations.reverse();
  }

  async clearKwameConversationHistory(userId: number): Promise<void> {
    await db
      .delete(kwameConversations)
      .where(eq(kwameConversations.userId, userId));
  }
}

export const storage = new DatabaseStorage();
