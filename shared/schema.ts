import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// User model
// Blocked phone numbers table for age compliance
export const blockedPhoneNumbers = pgTable("blocked_phone_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  fullName: text("full_name"), // User's full name when blocked
  email: text("email"), // User's email when blocked
  reason: text("reason").notNull(), // e.g., "under_14_age_restriction", "user_reports"
  blockedAt: timestamp("blocked_at").defaultNow(),
  metadata: text("metadata"), // Additional info as JSON string
});

// User report strikes table for moderation system
export const userReportStrikes = pgTable("user_report_strikes", {
  id: serial("id").primaryKey(),
  reportedUserId: integer("reported_user_id").notNull(), // User being reported
  reporterUserId: integer("reporter_user_id").notNull(), // User making the report
  reason: text("reason").notNull(), // Reason for report
  description: text("description"), // Additional details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  matchId: integer("match_id"), // Associated match that was unmatched
});

// User blocking system table for safety enforcement
export const userBlocks = pgTable(
  "user_blocks",
  {
    id: serial("id").primaryKey(),
    blockerUserId: integer("blocker_user_id")
      .notNull()
      .references(() => users.id), // User who is blocking
    blockedUserId: integer("blocked_user_id")
      .notNull()
      .references(() => users.id), // User being blocked
    reason: text("reason"), // Optional reason for blocking
    createdAt: timestamp("created_at").defaultNow(),
    // Prevent duplicate blocks and self-blocking
  },
  (table) => ({
    uniqueBlock: unique().on(table.blockerUserId, table.blockedUserId),
  }),
);

// Password reset codes table for 7-digit email verification
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  resetCode: text("reset_code").notNull(), // 7-digit code
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 10 minutes expiry
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").unique(),
  gender: text("gender").notNull(),
  location: text("location").notNull(), // 'Ghana' or 'Diaspora'
  countryOfOrigin: text("country_of_origin"), // User's primary country of origin
  secondaryCountryOfOrigin: text("secondary_country_of_origin"), // User's secondary country of origin (dual citizenship)
  bio: text("bio"),
  profession: text("profession"),
  ethnicity: text("ethnicity"), // Primary tribe
  secondaryTribe: text("secondary_tribe"), // Secondary tribe
  religion: text("religion"),
  photoUrl: text("photo_url"),
  // Avatar system
  avatarPhoto: text("avatar_photo"),
  showAvatar: boolean("show_avatar").default(false),
  showProfilePhoto: boolean("show_profile_photo").default(true), // Toggle to show/hide profile picture
  dateOfBirth: timestamp("date_of_birth"),
  relationshipStatus: text("relationship_status"), // User's current relationship status
  relationshipGoal: text("relationship_goal"), // What they're looking for
  highSchool: text("high_school"), // User's high school name
  collegeUniversity: text("college_university"), // User's college/university name
  interests: text("interests"), // Stored as JSON string of user's interests
  visibilityPreferences: text("visibility_preferences"), // Stored as JSON string of field visibility preferences
  // New fields for matching algorithm
  bodyType: text("body_type"), // User's actual body type
  height: integer("height"), // User's height in centimeters
  smoking: text("smoking"), // User's smoking habits: "yes", "no", "occasionally"
  drinking: text("drinking"), // User's drinking habits: "yes", "no", "occasionally", "socially"
  hasChildren: text("has_children"), // "yes", "no", or null
  wantsChildren: text("wants_children"), // "yes", "no", or null
  educationLevel: text("education_level"), // User's actual education level
  matchingPriorities: text("matching_priorities"), // JSON array of user's matching priorities
  verifiedByPhone: boolean("verified_by_phone").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(true), // Default to true for security
  profileHidden: boolean("profile_hidden").default(true), // Hide profile from discovery (default true for new users)
  hasActivatedProfile: boolean("has_activated_profile").default(false), // Tracks if user has ever activated their profile
  ghostMode: boolean("ghost_mode").default(false), // Hide online status and typing indicators
  hideAge: boolean("hide_age").default(false), // Hide age from swipecard display
  isOnline: boolean("is_online").default(false),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  showAppModeSelection: boolean("show_app_mode_selection").default(true), // Show app selection screen after login
  showNationalitySelection: boolean("show_nationality_selection").default(true), // Show nationality selection screen
  lastUsedApp: text("last_used_app"),
  premiumAccess: boolean("premium_access").default(false), // Premium subscription status
  stripeCustomerId: text("stripe_customer_id").unique(), // Stripe customer ID for payment processing
  stripeSubscriptionId: text("stripe_subscription_id").unique(), // Active Stripe subscription ID
  subscriptionStatus: text("subscription_status"), // 'active', 'canceled', 'past_due', 'unpaid'
  subscriptionExpiresAt: timestamp("subscription_expires_at"), // When current subscription period ends
  subscriptionCanceledAt: timestamp("subscription_canceled_at"), // When user requested cancellation
  idVerificationPhoto: text("id_verification_photo"), // Government ID photo for verification
  liveVerificationPhoto: text("live_verification_photo"), // Live selfie photo for verification
  isVerified: boolean("is_verified").default(false), // Manual verification status - shows verification badge
  isSuspended: boolean("is_suspended").default(false), // Account suspension status
  suspendedAt: timestamp("suspended_at"), // When account was suspended
  suspensionExpiresAt: timestamp("suspension_expires_at"), // When suspension expires
  preferredLanguage: text("preferred_language").default("en"), // User's preferred language for cross-device sync
  // Godmodel personality system: stores progress + final responses JSON
  personalityRecords: text("personality_records"),
  personalityTestCompleted: boolean("personality_test_completed").default(
    false,
  ), // Tracks if user has completed the full personality test
  // Big 5 personality analysis results
  big5Profile: text("big5_profile"), // JSON with computed Big 5 traits, aspects, and percentiles
  big5ComputedAt: timestamp("big5_computed_at"), // When Big 5 analysis was last computed
  personalityModelVersion: text("personality_model_version"), // Version of scoring model used
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  locationPreference: text("location_preference"), // 'Ghana', 'Diaspora', or 'Both'
  poolCountry: text("pool_country"), // Legacy single pool country field (for migration compatibility)
  meetPoolCountry: text("meet_pool_country"), // MEET app specific: "WHERE SHOULD LOVE COME FROM?"
  suitePoolCountry: text("suite_pool_country"), // SUITE app specific: "WHERE SHOULD CONNECTION COME FROM?"
  ethnicityPreference: text("ethnicity_preference"), // Can be JSON array of preferred tribes
  religionPreference: text("religion_preference"), // Can be JSON array of preferred religions
  relationshipGoalPreference: text("relationship_goal_preference"),
  distancePreference: integer("distance_preference"), // Maximum distance in kilometers
  educationLevelPreference: text("education_level_preference"), // Can be JSON array of education levels
  hasChildrenPreference: text("has_children_preference"), // 'yes', 'no', 'any'
  wantsChildrenPreference: text("wants_children_preference"), // 'yes', 'no', 'any'
  minHeightPreference: integer("min_height_preference"), // in cm
  maxHeightPreference: integer("max_height_preference"), // in cm
  bodyTypePreference: text("body_type_preference"), // Can be JSON array of body types
  dealBreakers: text("deal_breakers"), // Can be JSON array of deal breakers
  interestPreferences: text("interest_preferences"), // Can be JSON array of preferred interests
  matchingPriorities: text("matching_priorities"), // JSON array of matching priorities in order of importance
  smokingPreference: text("smoking_preference"), // 'no', 'occasionally', 'yes', 'any'
  drinkingPreference: text("drinking_preference"), // 'no', 'socially', 'occasionally', 'yes', 'any'
  highSchoolPreference: text("high_school_preference"), // Can be JSON array of preferred high schools (for users under 18)
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  userId1: integer("user_id_1")
    .notNull()
    .references(() => users.id),
  userId2: integer("user_id_2")
    .notNull()
    .references(() => users.id),
  matched: boolean("matched").notNull().default(false),
  isDislike: boolean("is_dislike").notNull().default(false), // True if this is a dislike (userId1 dislikes userId2)
  hasUnreadMessages1: boolean("has_unread_messages_1").notNull().default(false), // User 1 has unread messages
  hasUnreadMessages2: boolean("has_unread_messages_2").notNull().default(false), // User 2 has unread messages
  notifiedUser1: boolean("notified_user_1").notNull().default(false), // User 1 has been notified of match
  notifiedUser2: boolean("notified_user_2").notNull().default(false), // User 2 has been notified of match
  lastMessageAt: timestamp("last_message_at"),
  metadata: text("metadata"), // JSON string for additional match data like suiteType
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  encryptedContent: text("encrypted_content"),
  iv: text("initialization_vector"),
  messageType: text("message_type").default("text"), // "text", "audio", "image", etc.
  audioUrl: text("audio_url"),
  audioDuration: integer("audio_duration"), // Duration in seconds
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Reply functionality
  replyToMessageId: integer("reply_to_message_id"),
  replyToContent: text("reply_to_content"),
  replyToSenderName: text("reply_to_sender_name"),
  replyToIsCurrentUser: boolean("reply_to_is_current_user"),
  // Auto-delete functionality
  autoDeleteScheduledAt: timestamp("auto_delete_scheduled_at"),
  autoDeleteModeWhenSent: text("auto_delete_mode_when_sent").default("never"),
  deletedForUserId: integer("deleted_for_user_id").references(() => users.id),
});

export const userInterests = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  interest: text("interest").notNull(),
  showOnProfile: boolean("show_on_profile").default(true),
});

// Global interests database shared across all users
export const globalInterests = pgTable("global_interests", {
  id: serial("id").primaryKey(),
  interest: text("interest").notNull().unique(),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Global deal breakers database shared across all users
export const globalDealBreakers = pgTable("global_deal_breakers", {
  id: serial("id").primaryKey(),
  dealBreaker: text("deal_breaker").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global tribes database shared across all users
export const globalTribes = pgTable("global_tribes", {
  id: serial("id").primaryKey(),
  tribe: text("tribe").notNull().unique(),
  category: text("category"), // For grouping tribes by ethnicity (e.g., "Akan", "Ga-Adangbe", etc.)
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global religions database shared across all users
export const globalReligions = pgTable("global_religions", {
  id: serial("id").primaryKey(),
  religion: text("religion").notNull().unique(),
  category: text("category"), // For grouping religions (e.g., "Christianity", "Islam", etc.)
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profile views tracking for reciprocity & engagement scoring
export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewerId: integer("viewer_id")
    .notNull()
    .references(() => users.id),
  viewedId: integer("viewed_id")
    .notNull()
    .references(() => users.id),
  viewCount: integer("view_count").notNull().default(1),
  firstViewedAt: timestamp("first_viewed_at").defaultNow(),
  lastViewedAt: timestamp("last_viewed_at").defaultNow(),
  totalViewDuration: integer("total_view_duration").default(0), // Total seconds spent viewing
  appMode: text("app_mode").notNull().default("MEET"), // "MEET", "HEAT", "SUITE_NETWORKING", etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message engagement metrics for quality analysis
export const messageEngagementMetrics = pgTable("message_engagement_metrics", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id),
  messageLength: integer("message_length").notNull(),
  hasQuestion: boolean("has_question").notNull().default(false),
  hasExclamation: boolean("has_exclamation").notNull().default(false),
  wordCount: integer("word_count").notNull(),
  sentimentScore: integer("sentiment_score").default(0), // -100 to 100 sentiment analysis (scaled)
  readTime: integer("read_time"), // Seconds to read message
  responseTime: integer("response_time"), // Seconds until response
  engagementScore: integer("engagement_score").default(50), // 0-100 calculated engagement score
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversation thread analysis for response rate tracking
export const conversationThreads = pgTable("conversation_threads", {
  id: serial("id").primaryKey(),
  participantOneId: integer("participant_one_id")
    .notNull()
    .references(() => users.id),
  participantTwoId: integer("participant_two_id")
    .notNull()
    .references(() => users.id),
  threadId: text("thread_id").notNull().unique(), // Format: "userId1-userId2" (lower ID first)
  totalMessages: integer("total_messages").notNull().default(0),
  messagesFromOne: integer("messages_from_one").notNull().default(0),
  messagesFromTwo: integer("messages_from_two").notNull().default(0),
  averageResponseTime: integer("average_response_time").default(0), // Minutes (scaled from hours)
  conversationDepth: integer("conversation_depth").default(0), // Number of back-and-forth exchanges
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  appMode: text("app_mode").notNull().default("MEET"), // "MEET", "HEAT", "SUITE"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Typing status
export const typingStatus = pgTable("typing_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  isTyping: boolean("is_typing").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video calls
export const videoCalls = pgTable("video_calls", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  initiatorId: integer("initiator_id")
    .notNull()
    .references(() => users.id),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id),
  roomName: text("room_name").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, active, completed, declined
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compatibility Analysis table for Match Dashboard
export const compatibilityAnalysis = pgTable("compatibility_analysis", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id")
    .notNull()
    .references(() => users.id),
  user2Id: integer("user2_id")
    .notNull()
    .references(() => users.id),
  compatibilityData: text("compatibility_data").notNull(), // JSON string containing all compatibility analysis
  overallScore: integer("overall_score").notNull(), // Overall compatibility percentage (0-100)
  version: text("version").notNull().default("1.0"), // Version for future compatibility data format changes
  computedAt: timestamp("computed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true), // For soft deletion when user dislikes
});

// SUITE Professional Compatibility Scores - For networking star system
export const suiteCompatibilityScores = pgTable(
  "suite_compatibility_scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id), // Always store smaller user ID first to prevent duplicates
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id), // Always store larger user ID second to prevent duplicates
    targetProfileId: integer("target_profile_id")
      .notNull()
      .references(() => suiteNetworkingProfiles.id), // Specific networking profile
    // Multi-dimensional scoring system
    synergyScore: integer("synergy_score").notNull(), // Industry/goals alignment (1-10)
    networkValueScore: integer("network_value_score").notNull(), // Professional influence potential (1-10)
    collaborationScore: integer("collaboration_score").notNull(), // Project partnership likelihood (1-10)
    exchangeScore: integer("exchange_score").notNull(), // Mutual benefit potential (1-10)
    overallStarRating: integer("overall_star_rating").notNull(), // Final star rating (1-10)
    // Detailed analysis data
    analysisData: text("analysis_data").notNull(), // JSON with breakdown details
    insights: text("insights").notNull(), // JSON array of key insights
    suggestedActions: text("suggested_actions").notNull(), // JSON array of conversation starters
    // Geographic and cultural intelligence
    geographicFit: integer("geographic_fit").notNull(), // Location/timezone compatibility (1-10)
    culturalAlignment: integer("cultural_alignment").notNull(), // Cross-cultural networking potential (1-10)
    // Metadata
    computedAt: timestamp("computed_at").defaultNow(),
    lastUpdated: timestamp("last_updated").defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => {
    return {
      // Ensure one score per unique user pair (bidirectional constraint)
      uniqueUserPair: unique().on(table.userId, table.targetUserId),
    };
  },
);

// Verification codes for phone login
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User photos model for MEET dating app and SUITE sections
export const userPhotos = pgTable("user_photos", {
  id: serial("id").primaryKey(), // TODO: Will migrate to bigserial to support larger IDs
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  isPrimary: boolean("is_primary").default(false), // Legacy primary photo (for backwards compatibility)
  // Section-specific primary photo flags
  isPrimaryForMeet: boolean("is_primary_for_meet").default(false),
  isPrimaryForJob: boolean("is_primary_for_job").default(false),
  isPrimaryForMentorship: boolean("is_primary_for_mentorship").default(false),
  isPrimaryForNetworking: boolean("is_primary_for_networking").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message reactions table for emoji reactions
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User match settings for auto-delete functionality
export const userMatchSettings = pgTable(
  "user_match_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    autoDeleteMode: text("auto_delete_mode").default("never"), // 'never', 'always', 'custom'
    autoDeleteValue: integer("auto_delete_value").default(5),
    autoDeleteUnit: text("auto_delete_unit").default("minutes"), // 'minutes', 'hours', 'days'
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userMatchUnique: unique().on(table.userId, table.matchId),
  }),
);

// SUITE Profile System Tables - Dynamic profiles for Jobs, Mentorship, and Networking

// Suite Job Profiles - For users posting or seeking jobs
export const suiteJobProfiles = pgTable("suite_job_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // User role
  role: text("role"), // 'job-seeker', 'recruiter'
  // Basic job information
  jobTitle: text("job_title").notNull(),
  company: text("company"),
  description: text("description").notNull(),
  compensation: text("compensation"),
  compensationCurrency: text("compensation_currency"),
  compensationPeriod: text("compensation_period"),
  salary: text("salary"),
  salaryCurrency: text("salary_currency"),
  salaryPeriod: text("salary_period"),
  requirements: text("requirements"), // JSON array of requirements
  location: text("location"),
  workType: text("work_type").notNull(), // 'Remote', 'In-person', 'Hybrid'
  jobType: text("job_type").notNull(), // 'Full-time', 'Part-time', 'Contract', 'Internship'
  experienceLevel: text("experience_level"), // 'Entry', 'Mid', 'Senior', 'Executive'
  // Emotional and cultural context
  whyItMatters: text("why_it_matters"),
  whoShouldApply: text("who_should_apply"),
  culturalFit: text("cultural_fit"),
  areasOfExpertise: text("areas_of_expertise"),
  industryTags: text("industry_tags"), // JSON array of industry tags
  skillTags: text("skill_tags"), // JSON array of required skills
  // Application settings
  applicationUrl: text("application_url"),
  applicationEmail: text("application_email"),
  applicationInstructions: text("application_instructions"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  // Field visibility preferences (JSON string)
  visibilityPreferences: text("visibility_preferences"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suite Mentorship Profiles - For mentors and mentees
export const suiteMentorshipProfiles = pgTable("suite_mentorship_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // Role and basic info
  role: text("role").notNull(), // 'mentor' or 'mentee'
  areasOfExpertise: text("areas_of_expertise").array(), // Array for mentors
  learningGoals: text("learning_goals").array(), // Array for mentees
  languagesSpoken: text("languages_spoken").array(), // Array of languages
  industriesOrDomains: text("industries_or_domains").array(), // Array of industries
  // Mentorship details
  mentorshipStyle: text("mentorship_style"),
  preferredFormat: text("preferred_format"), // JSON array: ['1-on-1', 'Group', 'Workshop', 'Peer']
  communicationStyle: text("communication_style"), // JSON array: ['Chat', 'Video', 'In-person', 'Async']
  // Availability
  availability: text("availability"), // JSON object with schedule
  timeCommitment: text("time_commitment"), // 'Light (1-2 hrs/month)', 'Regular (3-5 hrs/month)', 'Intensive (5+ hrs/month)'
  location: text("location"), // User's location, defaults from registration
  // Goals and experience
  successStories: text("success_stories"),
  whyMentor: text("why_mentor"), // For mentors: why they want to mentor
  whySeekMentorship: text("why_seek_mentorship"), // For mentees: what they hope to gain
  // Mentee-specific fields
  preferredMentorshipStyle: text("preferred_mentorship_style"), // For mentees: preferred mentorship style
  industryAspiration: text("industry_aspiration"), // For mentees: industry they want to work in
  // Matching preferences
  preferredMenteeLevel: text("preferred_mentee_level"), // For mentors
  preferredMentorExperience: text("preferred_mentor_experience"), // For mentees
  preferredIndustries: text("preferred_industries"), // JSON array
  // Education fields
  highSchool: text("high_school"), // User's high school name
  collegeUniversity: text("college_university"), // User's college/university name
  // Status
  isActive: boolean("is_active").default(true),
  maxMentees: integer("max_mentees"), // For mentors
  currentMentees: integer("current_mentees").default(0), // For mentors
  // Field visibility preferences (JSON string)
  visibilityPreferences: text("visibility_preferences"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suite Networking Profiles - For professional networking and collaboration
export const suiteNetworkingProfiles = pgTable("suite_networking_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // Professional identity
  professionalTagline: text("professional_tagline"),
  currentRole: text("current_role"),
  currentCompany: text("current_company"),
  industry: text("industry"),
  experienceYears: integer("experience_years"),
  // Networking goals
  networkingGoals: text("networking_goals"), // JSON array of goals
  lookingFor: text("looking_for"), // What they're seeking: collaboration, advice, partnerships, etc.
  canOffer: text("can_offer"), // What they can provide to others
  // Interests and causes
  professionalInterests: text("professional_interests"), // JSON array
  causesIPassionate: text("causes_passionate"), // JSON array of causes they care about
  // Collaboration preferences
  collaborationTypes: text("collaboration_types"), // JSON array: ['Projects', 'Startups', 'Research', 'Volunteering']
  workingStyle: text("working_style"), // 'Remote-first', 'In-person', 'Flexible'
  timeCommitment: text("time_commitment"), // How much time they can dedicate
  // Fun and personal
  lightUpWhenTalking: text("light_up_when_talking"), // Fun prompt response
  wantToMeetSomeone: text("want_to_meet_someone"), // "I'd love to meet someone who..."
  currentProjects: text("current_projects"), // JSON array of current projects
  dreamCollaboration: text("dream_collaboration"),
  // Availability and contact
  preferredMeetingStyle: text("preferred_meeting_style"), // JSON array: ['Coffee chat', 'Virtual call', 'Coworking', 'Events']
  availability: text("availability"), // General availability
  // Geographic preferences
  location: text("location"),
  openToRemote: boolean("open_to_remote").default(true),
  preferredLocations: text("preferred_locations"), // JSON array for in-person meetups
  // Education fields
  highSchool: text("high_school"), // User's high school name
  collegeUniversity: text("college_university"), // User's college/university name
  // Status and visibility
  isActive: boolean("is_active").default(true),
  lookingForOpportunities: boolean("looking_for_opportunities").default(true),
  // Field visibility preferences (JSON string)
  visibilityPreferences: text("visibility_preferences"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suite Profile Visibility Settings - Controls which profiles are active and visible
export const suiteProfileSettings = pgTable("suite_profile_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  // Profile activation status
  jobProfileActive: boolean("job_profile_active").default(false),
  mentorshipProfileActive: boolean("mentorship_profile_active").default(false),
  networkingProfileActive: boolean("networking_profile_active").default(false),
  // Discovery preferences (consistent with profile_hidden logic: false = visible, true = hidden)
  // NEW USERS START HIDDEN: All discovery toggles default to true (hidden) for new users
  hiddenInJobDiscovery: boolean("hidden_in_job_discovery").default(true),
  hiddenInMentorshipDiscovery: boolean(
    "hidden_in_mentorship_discovery",
  ).default(true),
  hiddenInNetworkingDiscovery: boolean(
    "hidden_in_networking_discovery",
  ).default(true),
  // Primary profile preference
  primaryProfileType: text("primary_profile_type"), // 'job', 'mentorship', 'networking'
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suite Field Visibility - Controls field visibility for each profile type
export const suiteFieldVisibility = pgTable(
  "suite_field_visibility",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    profileType: text("profile_type")
      .notNull()
      .$type<"job" | "mentorship" | "networking">(),
    fieldName: text("field_name").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueUserProfileField: unique().on(
      table.userId,
      table.profileType,
      table.fieldName,
    ),
  }),
);

// Connections Preferences - User discovery and matching preferences
export const connectionsPreferences = pgTable("connections_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),

  // Mentorship Preferences
  mentorshipLookingFor: text("mentorship_looking_for").array(), // ['mentors', 'mentees', 'both']
  mentorshipExperienceLevel: text("mentorship_experience_level").array(), // ['junior', 'mid', 'senior', 'executive']
  mentorshipIndustries: text("mentorship_industries").array(),
  mentorshipAreasOfExpertise: text("mentorship_areas_of_expertise").array(), // ['software-development', 'data-science', 'marketing', etc.]
  mentorshipEducationLevel: text("mentorship_education_level").array(), // ['high-school', 'bachelor', 'master', 'phd', 'other']
  mentorshipSkills: text("mentorship_skills").array(), // ['python', 'javascript', 'leadership', etc.]
  mentorshipTopics: text("mentorship_topics").array(), // Learning/teaching topics
  mentorshipFormat: text("mentorship_format").array(), // ['one-on-one', 'group', 'virtual', 'in-person']
  mentorshipTimeCommitment: text("mentorship_time_commitment"), // ['flexible', 'weekly', 'monthly', 'project-based']
  mentorshipLocationPreference: text("mentorship_location_preference"), // ['local', 'regional', 'national', 'international']
  mentorshipWeights: text("mentorship_weights"), // JSON string of preference weights

  // Networking Preferences
  networkingPurpose: text("networking_purpose").array(), // ['partnerships', 'opportunities', 'knowledge', 'insights']
  networkingCompanySize: text("networking_company_size").array(), // ['startup', 'sme', 'enterprise', 'nonprofit']
  networkingSeniority: text("networking_seniority").array(), // ['individual', 'manager', 'director', 'executive']
  networkingIndustries: text("networking_industries").array(),
  networkingAreasOfExpertise: text("networking_areas_of_expertise").array(), // ['software-development', 'data-science', 'marketing', etc.]
  networkingEducationLevel: text("networking_education_level").array(), // ['high-school', 'bachelor', 'master', 'phd', 'other']
  networkingSkills: text("networking_skills").array(), // ['python', 'javascript', 'leadership', etc.]
  networkingFunctionalAreas: text("networking_functional_areas").array(), // ['sales', 'marketing', 'engineering', etc.]
  networkingLocationPreference: text("networking_location_preference"), // 'local', 'regional', 'national', 'international'
  networkingEventPreference: text("networking_event_preference").array(), // ['virtual', 'in-person', 'conferences', 'casual']
  networkingWeights: text("networking_weights"), // JSON string of preference weights

  // Jobs Preferences
  jobsTypes: text("jobs_types").array(), // ['full-time', 'part-time', 'contract', 'freelance']
  jobsSalaryRange: text("jobs_salary_range").array(), // ['0-30k', '30k-50k', '50k-75k', etc.]
  jobsSalaryCurrency: text("jobs_salary_currency"), // 'USD', 'EUR', 'GHS', etc.
  jobsSalaryMin: integer("jobs_salary_min"), // Minimum salary amount
  jobsSalaryMax: integer("jobs_salary_max"), // Maximum salary amount
  jobsSalaryPeriod: text("jobs_salary_period"), // '/hour', '/day', '/month', '/year'
  jobsWorkArrangement: text("jobs_work_arrangement").array(), // ['remote', 'hybrid', 'on-site']
  jobsCompanySize: text("jobs_company_size").array(), // ['startup', 'sme', 'enterprise']
  jobsIndustries: text("jobs_industries").array(),
  jobsEducationLevel: text("jobs_education_level").array(), // ['high-school', 'bachelor', 'master', 'phd', 'other']
  jobsSkills: text("jobs_skills").array(), // ['python', 'javascript', 'leadership', etc.]
  jobsExperienceLevel: text("jobs_experience_level").array(), // ['entry', 'mid', 'senior', 'lead', 'executive']
  jobsFunctionalAreas: text("jobs_functional_areas").array(),
  jobsWorkLocation: text("jobs_work_location"), // ['local', 'regional', 'national', 'international']
  jobsWeights: text("jobs_weights"), // JSON string of preference weights

  // Global Settings
  dealBreakers: text("deal_breakers").array(), // Global deal breakers across all types
  preferenceProfiles: text("preference_profiles"), // JSON string of saved preference sets

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema for user registration
// Schema for user registration with phone number as primary identifier
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  gender: true,
  location: true,
  dateOfBirth: true,
  ethnicity: true,
  secondaryTribe: true,
  photoUrl: true,
  verifiedByPhone: true,
});

// Schema for user profile creation/update
export const userProfileSchema = createInsertSchema(users)
  .pick({
    email: true,
    ethnicity: true,
    secondaryTribe: true,
    photoUrl: true,
    showProfilePhoto: true,
    dateOfBirth: true,
    phoneNumber: true,
    twoFactorEnabled: true,
    profileHidden: true,
    ghostMode: true,
    interests: true,
    showAppModeSelection: true,
    showNationalitySelection: true,
    lastUsedApp: true,
    isSuspended: true,
    suspendedAt: true,
    suspensionExpiresAt: true,
  })
  .extend({
    // Override fields to make them nullable during updates (the fields we want to be able to clear)
    location: z.string().nullable(),
    bio: z.string().nullable(),
    profession: z.string().nullable(),
    religion: z.string().nullable(),
    relationshipGoal: z.string().nullable(),
    // New fields added to the schema
    countryOfOrigin: z.string().nullable(),
    secondaryCountryOfOrigin: z.string().nullable(),
    relationshipStatus: z.string().nullable(),
    // Education fields
    highSchool: z.string().nullable(),
    collegeUniversity: z.string().nullable(),
    // New matching algorithm fields
    bodyType: z.string().nullable(),
    height: z.number().nullable(),
    hasChildren: z.string().nullable(),
    wantsChildren: z.string().nullable(),
    educationLevel: z.string().nullable(),
    matchingPriorities: z.string().nullable(),
    // Smoking and drinking preferences
    smoking: z.string().nullable(),
    drinking: z.string().nullable(),
    // Special flags for update operations (not stored in database)
    clearingFields: z.boolean().optional(),
    visibilityPreferences: z.string().optional(),
    // App flow control toggles
    showAppModeSelection: z.boolean().optional(),
    showNationalitySelection: z.boolean().optional(),
    lastUsedApp: z.string().optional(),
    // Language preference for cross-device sync
    preferredLanguage: z.string().optional(),
    // Avatar toggle (optional in updates)
    showAvatar: z.boolean().optional(),
  });

// Schema for blocked phone numbers
export const insertBlockedPhoneNumberSchema = createInsertSchema(
  blockedPhoneNumbers,
).pick({
  phoneNumber: true,
  reason: true,
  metadata: true,
});

// Schema for user report strikes
export const insertUserReportStrikeSchema = createInsertSchema(
  userReportStrikes,
).pick({
  reportedUserId: true,
  reporterUserId: true,
  reason: true,
  description: true,
  matchId: true,
});

// Schema for user preferences
export const userPreferencesSchema = createInsertSchema(userPreferences).pick({
  minAge: true,
  maxAge: true,
  locationPreference: true,
  poolCountry: true, // Legacy field maintained for compatibility
  meetPoolCountry: true, // MEET app specific pool country
  suitePoolCountry: true, // SUITE app specific pool country
  ethnicityPreference: true,
  religionPreference: true,
  relationshipGoalPreference: true,
  distancePreference: true,
  educationLevelPreference: true,
  hasChildrenPreference: true,
  wantsChildrenPreference: true,
  minHeightPreference: true,
  maxHeightPreference: true,
  bodyTypePreference: true,
  dealBreakers: true,
  interestPreferences: true,
  matchingPriorities: true,
  smokingPreference: true,
  drinkingPreference: true,
  highSchoolPreference: true,
});

// Schema for creating a match
export const insertMatchSchema = createInsertSchema(matches).pick({
  userId1: true,
  userId2: true,
  matched: true,
  isDislike: true,
});

// Schema for creating a message
export const insertMessageSchema = createInsertSchema(messages).pick({
  matchId: true,
  senderId: true,
  receiverId: true,
  content: true,
  messageType: true,
  audioUrl: true,
  audioDuration: true,
  replyToMessageId: true,
  replyToContent: true,
  replyToSenderName: true,
  replyToIsCurrentUser: true,
});

// Schema for adding user interests
export const insertUserInterestSchema = createInsertSchema(userInterests).pick({
  userId: true,
  interest: true,
  showOnProfile: true,
});

// Schema for adding global interests
export const insertGlobalInterestSchema = createInsertSchema(
  globalInterests,
).pick({
  interest: true,
  category: true,
  createdBy: true,
});

// Schema for adding global deal breakers
export const insertGlobalDealBreakerSchema = createInsertSchema(
  globalDealBreakers,
).pick({
  dealBreaker: true,
  createdBy: true,
});

// Schema for adding global tribes
export const insertGlobalTribeSchema = createInsertSchema(globalTribes).pick({
  tribe: true,
  category: true,
  createdBy: true,
});

// Schema for adding global religions
export const insertGlobalReligionSchema = createInsertSchema(
  globalReligions,
).pick({
  religion: true,
  category: true,
  createdBy: true,
});

// Schema for typing status
export const insertTypingStatusSchema = createInsertSchema(typingStatus).pick({
  userId: true,
  matchId: true,
  isTyping: true,
});

// Schema for video calls
export const insertVideoCallSchema = createInsertSchema(videoCalls).pick({
  matchId: true,
  initiatorId: true,
  receiverId: true,
  roomName: true,
  status: true,
});

// Schema for verification codes
export const insertVerificationCodeSchema = createInsertSchema(
  verificationCodes,
).pick({
  phoneNumber: true,
  code: true,
  expiresAt: true,
});

// Schema for user photos (MEET dating app and SUITE sections)
export const insertUserPhotoSchema = createInsertSchema(userPhotos).omit({
  id: true,
  createdAt: true,
});

// Schema for updating user photo primary status for specific sections
export const updateUserPhotoPrimarySchema = createInsertSchema(userPhotos).pick(
  {
    isPrimary: true,
    isPrimaryForMeet: true,
    isPrimaryForJob: true,
    isPrimaryForMentorship: true,
    isPrimaryForNetworking: true,
  },
);

// Schema for message reactions
export const insertMessageReactionSchema = createInsertSchema(
  messageReactions,
).pick({
  messageId: true,
  userId: true,
  emoji: true,
});

// Schema for user match settings
export const insertUserMatchSettingsSchema = createInsertSchema(
  userMatchSettings,
).pick({
  userId: true,
  matchId: true,
  autoDeleteMode: true,
  autoDeleteValue: true,
  autoDeleteUnit: true,
});

// Schema for compatibility analysis
export const insertCompatibilityAnalysisSchema = createInsertSchema(
  compatibilityAnalysis,
).pick({
  user1Id: true,
  user2Id: true,
  compatibilityData: true,
  overallScore: true,
  version: true,
  isActive: true,
});

// Schema for SUITE compatibility scores
export const insertSuiteCompatibilityScoreSchema = createInsertSchema(
  suiteCompatibilityScores,
).pick({
  userId: true,
  targetUserId: true,
  targetProfileId: true,
  synergyScore: true,
  networkValueScore: true,
  collaborationScore: true,
  exchangeScore: true,
  overallStarRating: true,
  analysisData: true,
  insights: true,
  suggestedActions: true,
  geographicFit: true,
  culturalAlignment: true,
  isActive: true,
});

// Schema for user blocking system
export const insertUserBlockSchema = createInsertSchema(userBlocks).pick({
  blockerUserId: true,
  blockedUserId: true,
  reason: true,
});

// Placeholder schemas for archived tables (not implemented yet)
export const insertArchivedMatchSchema = insertMatchSchema;
export const insertArchivedMessageSchema = insertMessageSchema;
export const insertArchivedUserSchema = insertUserSchema;

// Schema for Suite Job Profiles
export const insertSuiteJobProfileSchema = createInsertSchema(
  suiteJobProfiles,
).pick({
  userId: true,
  jobTitle: true,
  company: true,
  description: true,
  compensation: true,
  requirements: true,
  location: true,
  workType: true,
  jobType: true,
  experienceLevel: true,
  whyItMatters: true,
  whoShouldApply: true,
  culturalFit: true,
  industryTags: true,
  skillTags: true,
  applicationUrl: true,
  applicationEmail: true,
  applicationInstructions: true,
  isActive: true,
  expiresAt: true,
});

// Schema for Suite Mentorship Profiles
export const insertSuiteMentorshipProfileSchema = createInsertSchema(
  suiteMentorshipProfiles,
).pick({
  userId: true,
  role: true,
  areasOfExpertise: true,
  learningGoals: true,
  mentorshipStyle: true,
  preferredFormat: true,
  communicationStyle: true,
  availability: true,
  timeCommitment: true,
  location: true,
  successStories: true,
  whyMentor: true,
  whySeekMentorship: true,
  preferredMentorshipStyle: true,
  industryAspiration: true,
  preferredMenteeLevel: true,
  preferredMentorExperience: true,
  preferredIndustries: true,
  highSchool: true,
  collegeUniversity: true,
  isActive: true,
  maxMentees: true,
  currentMentees: true,
});

// Schema for Suite Networking Profiles
export const insertSuiteNetworkingProfileSchema = createInsertSchema(
  suiteNetworkingProfiles,
).pick({
  userId: true,
  professionalTagline: true,
  currentRole: true,
  currentCompany: true,
  industry: true,
  experienceYears: true,
  networkingGoals: true,
  lookingFor: true,
  canOffer: true,
  professionalInterests: true,
  causesIPassionate: true,
  collaborationTypes: true,
  workingStyle: true,
  timeCommitment: true,
  lightUpWhenTalking: true,
  wantToMeetSomeone: true,
  currentProjects: true,
  dreamCollaboration: true,
  preferredMeetingStyle: true,
  availability: true,
  location: true,
  openToRemote: true,
  preferredLocations: true,
  highSchool: true,
  collegeUniversity: true,
  isActive: true,
  lookingForOpportunities: true,
  visibilityPreferences: true,
});

// Schema for Suite Profile Settings
export const insertSuiteProfileSettingsSchema = createInsertSchema(
  suiteProfileSettings,
).pick({
  userId: true,
  jobProfileActive: true,
  mentorshipProfileActive: true,
  networkingProfileActive: true,
  hiddenInJobDiscovery: true,
  hiddenInMentorshipDiscovery: true,
  hiddenInNetworkingDiscovery: true,
  primaryProfileType: true,
});

// Schema for Suite Field Visibility
export const insertSuiteFieldVisibilitySchema = createInsertSchema(
  suiteFieldVisibility,
).pick({
  userId: true,
  profileType: true,
  fieldName: true,
  isVisible: true,
});

// Types for ORM
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertBlockedPhoneNumber = z.infer<
  typeof insertBlockedPhoneNumberSchema
>;
export type InsertUserReportStrike = z.infer<
  typeof insertUserReportStrikeSchema
>;
export type InsertUserInterest = z.infer<typeof insertUserInterestSchema>;
export type InsertGlobalInterest = z.infer<typeof insertGlobalInterestSchema>;
export type InsertGlobalDealBreaker = z.infer<
  typeof insertGlobalDealBreakerSchema
>;
export type InsertGlobalTribe = z.infer<typeof insertGlobalTribeSchema>;
export type InsertGlobalReligion = z.infer<typeof insertGlobalReligionSchema>;
export type InsertTypingStatus = z.infer<typeof insertTypingStatusSchema>;
export type InsertVideoCall = z.infer<typeof insertVideoCallSchema>;
export type InsertVerificationCode = z.infer<
  typeof insertVerificationCodeSchema
>;
export type InsertUserPhoto = z.infer<typeof insertUserPhotoSchema>;
export type UpdateUserPhotoPrimary = z.infer<
  typeof updateUserPhotoPrimarySchema
>;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type InsertUserMatchSettings = z.infer<
  typeof insertUserMatchSettingsSchema
>;

export type InsertCompatibilityAnalysis = z.infer<
  typeof insertCompatibilityAnalysisSchema
>;
export type InsertSuiteCompatibilityScore = z.infer<
  typeof insertSuiteCompatibilityScoreSchema
>;

// Archive Types
export type InsertArchivedMatch = z.infer<typeof insertArchivedMatchSchema>;
export type InsertArchivedMessage = z.infer<typeof insertArchivedMessageSchema>;
export type InsertArchivedUser = z.infer<typeof insertArchivedUserSchema>;

// SUITE Profile System Types
export type InsertSuiteJobProfile = z.infer<typeof insertSuiteJobProfileSchema>;
export type InsertSuiteMentorshipProfile = z.infer<
  typeof insertSuiteMentorshipProfileSchema
>;
export type InsertSuiteNetworkingProfile = z.infer<
  typeof insertSuiteNetworkingProfileSchema
>;
export type InsertSuiteProfileSettings = z.infer<
  typeof insertSuiteProfileSettingsSchema
>;
export type InsertSuiteFieldVisibility = z.infer<
  typeof insertSuiteFieldVisibilitySchema
>;
export type InsertSwipeHistory = z.infer<typeof insertSwipeHistorySchema>;
export type InsertSuiteJobApplication = z.infer<
  typeof insertSuiteJobApplicationSchema
>;
export type InsertProfessionalReview = z.infer<
  typeof insertProfessionalReviewSchema
>;

export type User = typeof users.$inferSelect;
export type BlockedPhoneNumber = typeof blockedPhoneNumbers.$inferSelect;
export type UserReportStrike = typeof userReportStrikes.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type UserInterest = typeof userInterests.$inferSelect;
export type GlobalInterest = typeof globalInterests.$inferSelect;
export type GlobalDealBreaker = typeof globalDealBreakers.$inferSelect;
export type GlobalTribe = typeof globalTribes.$inferSelect;
export type GlobalReligion = typeof globalReligions.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type TypingStatus = typeof typingStatus.$inferSelect;
export type VideoCall = typeof videoCalls.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type UserPhoto = typeof userPhotos.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type UserMatchSettings = typeof userMatchSettings.$inferSelect;
export type CompatibilityAnalysis = typeof compatibilityAnalysis.$inferSelect;
export type SuiteCompatibilityScore =
  typeof suiteCompatibilityScores.$inferSelect;

// SUITE Profile System Inferred Types
export type SuiteJobProfile = typeof suiteJobProfiles.$inferSelect;
export type SuiteMentorshipProfile =
  typeof suiteMentorshipProfiles.$inferSelect;
export type SuiteNetworkingProfile =
  typeof suiteNetworkingProfiles.$inferSelect;
export type SuiteProfileSettings = typeof suiteProfileSettings.$inferSelect;
export type SuiteFieldVisibility = typeof suiteFieldVisibility.$inferSelect;
export type SuiteJobApplication = typeof suiteJobApplications.$inferSelect;
export type ProfessionalReview = typeof professionalReviews.$inferSelect;

// SWIPE HISTORY SYSTEM - Persistent Undo Functionality
// Stores swipe actions for cross-session undo capability
export const swipeHistory = pgTable("swipe_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetUserId: integer("target_user_id").notNull(),
  action: text("action").notNull(), // 'like', 'dislike', 'message'
  appMode: text("app_mode").notNull(), // 'MEET', 'SUITE'
  timestamp: timestamp("timestamp").defaultNow(),
});

// Schema for Swipe History
export const insertSwipeHistorySchema = createInsertSchema(swipeHistory).pick({
  userId: true,
  targetUserId: true,
  action: true,
  appMode: true,
});

// ARCHIVE SYSTEM - Security & Audit Trail
// Archived matches table for security and historical records
export const archivedMatches = pgTable("archived_matches", {
  id: serial("id").primaryKey(),
  originalMatchId: integer("original_match_id").notNull(), // Original match ID before deletion
  userId1: integer("user_id_1").notNull(), // User IDs (not FK since users might be deleted)
  userId2: integer("user_id_2").notNull(),
  matched: boolean("matched").notNull(),
  isDislike: boolean("is_dislike").notNull(),
  hasUnreadMessages1: boolean("has_unread_messages_1").notNull(),
  hasUnreadMessages2: boolean("has_unread_messages_2").notNull(),
  notifiedUser1: boolean("notified_user_1").notNull(),
  notifiedUser2: boolean("notified_user_2").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  matchCreatedAt: timestamp("match_created_at").notNull(), // Original match creation time
  archivedAt: timestamp("archived_at").defaultNow(), // When archived
  archivedReason: text("archived_reason").notNull(), // 'unmatch', 'user_deletion', 'admin_action'
  archivedByUserId: integer("archived_by_user_id"), // Who triggered the archival
  messageCount: integer("message_count").default(0), // Total messages in this match
});

// Archived messages table for security and historical records
export const archivedMessages = pgTable("archived_messages", {
  id: serial("id").primaryKey(),
  originalMessageId: integer("original_message_id").notNull(), // Original message ID before deletion
  originalMatchId: integer("original_match_id").notNull(), // Original match ID
  archivedMatchId: integer("archived_match_id")
    .notNull()
    .references(() => archivedMatches.id), // Reference to archived match
  senderId: integer("sender_id").notNull(), // User IDs (not FK since users might be deleted)
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  encryptedContent: text("encrypted_content"),
  iv: text("initialization_vector"),
  messageType: text("message_type").default("text"),
  audioUrl: text("audio_url"),
  audioDuration: integer("audio_duration"),
  read: boolean("read").notNull(),
  readAt: timestamp("read_at"),
  messageCreatedAt: timestamp("message_created_at").notNull(), // Original message creation time
  archivedAt: timestamp("archived_at").defaultNow(), // When archived
  archivedReason: text("archived_reason").notNull(), // 'unmatch', 'user_deletion', 'admin_action'
  // Reply functionality preserved
  replyToMessageId: integer("reply_to_message_id"),
  replyToContent: text("reply_to_content"),
  replyToSenderName: text("reply_to_sender_name"),
  replyToIsCurrentUser: boolean("reply_to_is_current_user"),
  // Auto-delete functionality preserved
  autoDeleteScheduledAt: timestamp("auto_delete_scheduled_at"),
  autoDeleteModeWhenSent: text("auto_delete_mode_when_sent"),
  deletedForUserId: integer("deleted_for_user_id"),
});

// Archived users table for security purposes - backup of all CHARLEY users
export const archivedUsers = pgTable("archived_users", {
  id: serial("id").primaryKey(),
  originalUserId: integer("original_user_id").notNull(), // Original user ID before deletion
  username: text("username").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  gender: text("gender").notNull(),
  location: text("location").notNull(),
  countryOfOrigin: text("country_of_origin"),
  bio: text("bio"),
  profession: text("profession"),
  ethnicity: text("ethnicity"),
  secondaryTribe: text("secondary_tribe"),
  religion: text("religion"),
  photoUrl: text("photo_url"),
  showProfilePhoto: boolean("show_profile_photo"),
  dateOfBirth: timestamp("date_of_birth"),
  relationshipStatus: text("relationship_status"),
  relationshipGoal: text("relationship_goal"),
  interests: text("interests"),
  visibilityPreferences: text("visibility_preferences"),
  verifiedByPhone: boolean("verified_by_phone"),
  twoFactorEnabled: boolean("two_factor_enabled"),
  profileHidden: boolean("profile_hidden"),
  ghostMode: boolean("ghost_mode"),
  isOnline: boolean("is_online"),
  lastActive: timestamp("last_active"),
  userCreatedAt: timestamp("user_created_at").notNull(), // Original user creation time
  archivedAt: timestamp("archived_at").defaultNow(), // When archived
  archivedReason: text("archived_reason").notNull(), // 'account_deletion', 'admin_action', 'policy_violation'
  archivedByUserId: integer("archived_by_user_id"), // Who triggered the archival (admin or self)
  totalMatches: integer("total_matches").default(0), // Historical match count
  totalMessages: integer("total_messages").default(0), // Historical message count
  ipAddress: text("ip_address"), // Last known IP for security
  userAgent: text("user_agent"), // Last known user agent for security
});

// SUITE Networking Connections - for networking swipe actions and matches
export const suiteNetworkingConnections = pgTable(
  "suite_networking_connections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id), // User who performed the action
    targetProfileId: integer("target_profile_id")
      .notNull()
      .references(() => suiteNetworkingProfiles.id), // Target networking profile
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id), // Owner of the target profile
    action: text("action").notNull(), // 'like' or 'pass'
    matched: boolean("matched").notNull().default(false), // True if mutual like
    isDislike: boolean("is_dislike").notNull().default(false), // True if this is a dislike (pass action)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      // Ensure one action per user-profile combination
      uniqueUserProfile: unique().on(table.userId, table.targetProfileId),
    };
  },
);

// SUITE Mentorship Connections - for mentorship swipe actions and matches
export const suiteMentorshipConnections = pgTable(
  "suite_mentorship_connections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id), // User who performed the action
    targetProfileId: integer("target_profile_id")
      .notNull()
      .references(() => suiteMentorshipProfiles.id), // Target mentorship profile
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id), // Owner of the target profile
    action: text("action").notNull(), // 'like' or 'pass'
    matched: boolean("matched").notNull().default(false), // True if mutual like
    isDislike: boolean("is_dislike").notNull().default(false), // True if this is a dislike (pass action)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      // Ensure one action per user-profile combination
      uniqueUserProfile: unique().on(table.userId, table.targetProfileId),
    };
  },
);

// SUITE Job Applications - for job swipe actions
export const suiteJobApplications = pgTable(
  "suite_job_applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id), // User who applied
    targetProfileId: integer("target_profile_id")
      .notNull()
      .references(() => suiteJobProfiles.id), // Target job profile
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id), // Job poster
    action: text("action").notNull(), // 'like' or 'pass'
    applicationStatus: text("application_status").default("pending"), // 'pending', 'accepted', 'rejected', 'matched'
    matched: boolean("matched").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      // Ensure one application per user-job combination
      uniqueUserJob: unique().on(table.userId, table.targetProfileId),
    };
  },
);

// Professional reviews table for Jobs compatibility system
export const professionalReviews = pgTable(
  "professional_reviews",
  {
    id: serial("id").primaryKey(),
    reviewedUserId: integer("reviewed_user_id")
      .notNull()
      .references(() => users.id), // User being reviewed
    reviewerUserId: integer("reviewer_user_id")
      .notNull()
      .references(() => users.id), // User writing the review
    rating: integer("rating").notNull(), // 1-5 star rating
    reviewText: text("review_text").notNull(), // Review comment
    isAnonymous: boolean("is_anonymous").default(false), // Whether reviewer wants to stay anonymous
    category: text("category").notNull().default("general"), // 'general', 'reliability', 'communication', 'skills'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Ensure one review per user pair per category
    uniqueReview: unique().on(
      table.reviewedUserId,
      table.reviewerUserId,
      table.category,
    ),
  }),
);

// Insert schemas for SUITE connections
export const insertSuiteNetworkingConnectionSchema = createInsertSchema(
  suiteNetworkingConnections,
).pick({
  userId: true,
  targetProfileId: true,
  targetUserId: true,
  action: true,
  matched: true,
  isDislike: true,
});

export const insertSuiteMentorshipConnectionSchema = createInsertSchema(
  suiteMentorshipConnections,
).pick({
  userId: true,
  targetProfileId: true,
  targetUserId: true,
  action: true,
  matched: true,
  isDislike: true,
});

export const insertSuiteJobApplicationSchema = createInsertSchema(
  suiteJobApplications,
).pick({
  userId: true,
  targetProfileId: true,
  targetUserId: true,
  action: true,
  applicationStatus: true,
  matched: true,
});

// Professional reviews schema
export const insertProfessionalReviewSchema = createInsertSchema(
  professionalReviews,
).pick({
  reviewedUserId: true,
  reviewerUserId: true,
  rating: true,
  reviewText: true,
  isAnonymous: true,
  category: true,
});

// Insert types for SUITE connections
export type InsertSuiteNetworkingConnection = z.infer<
  typeof insertSuiteNetworkingConnectionSchema
>;
export type InsertSuiteMentorshipConnection = z.infer<
  typeof insertSuiteMentorshipConnectionSchema
>;

// PAYMENT SYSTEM TABLES
// Subscriptions table - Core subscription management
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(), // 'stripe', 'flutterwave', 'paystack'
  subscriptionId: text("subscription_id").notNull(), // External subscription ID from provider
  planType: text("plan_type").notNull(), // 'premium_monthly', 'premium_yearly', 'premium_quarterly'
  status: text("status").notNull(), // 'active', 'cancelled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  currency: text("currency").notNull().default("USD"), // 'USD', 'GHS', 'EUR', 'GBP'
  amount: integer("amount").notNull(), // Amount in cents (e.g., $9.99 = 999)
  paymentMethod: text("payment_method").notNull(), // 'card', 'mobile_money', 'bank_transfer', 'digital_wallet'
  region: text("region").notNull(), // 'ghana', 'diaspora', 'africa', 'global'
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Methods table - Store user's saved payment methods
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(), // 'stripe', 'flutterwave', 'paystack'
  externalId: text("external_id").notNull(), // Provider's payment method ID
  type: text("type").notNull(), // 'card', 'mobile_money', 'bank_transfer', 'digital_wallet'
  isDefault: boolean("is_default").default(false),
  metadata: text("metadata"), // JSON string containing payment method details (last4, mobile number, bank name, etc.)
  // Billing Address Information
  billingName: text("billing_name"), // Full name for billing
  billingEmail: text("billing_email"), // Email address for billing
  billingPhone: text("billing_phone"), // Phone number for billing
  billingAddress: text("billing_address"), // Street address
  billingCity: text("billing_city"), // City
  billingState: text("billing_state"), // State/Province
  billingPostalCode: text("billing_postal_code"), // Postal/ZIP code
  billingCountry: text("billing_country"), // Country
  nickname: text("nickname"), // User-friendly name for the payment method
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment History table - Track all payment transactions
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(), // 'stripe', 'flutterwave', 'paystack'
  providerTransactionId: text("provider_transaction_id").notNull(), // External transaction ID
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull(), // 'USD', 'GHS', 'EUR', 'GBP'
  status: text("status").notNull(), // 'succeeded', 'pending', 'failed', 'cancelled', 'refunded'
  paymentMethod: text("payment_method").notNull(), // 'card', 'mobile_money', 'bank_transfer'
  paymentMethodId: integer("payment_method_id").references(
    () => paymentMethods.id,
  ),
  failureReason: text("failure_reason"), // Reason if payment failed
  refundAmount: integer("refund_amount"), // Refund amount in cents if applicable
  metadata: text("metadata"), // JSON string for additional transaction details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Events table - Track subscription lifecycle events
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  eventType: text("event_type").notNull(), // 'created', 'updated', 'cancelled', 'reactivated', 'payment_failed', 'payment_succeeded'
  provider: text("provider").notNull(), // 'stripe', 'flutterwave', 'paystack'
  providerEventId: text("provider_event_id"), // External event ID from webhook
  oldStatus: text("old_status"), // Previous subscription status
  newStatus: text("new_status"), // New subscription status
  metadata: text("metadata"), // JSON string for event details
  createdAt: timestamp("created_at").defaultNow(),
});

// Regional Pricing table - Store different prices for different regions
export const regionalPricing = pgTable("regional_pricing", {
  id: serial("id").primaryKey(),
  planType: text("plan_type").notNull(), // 'premium_monthly', 'premium_yearly', 'premium_quarterly'
  region: text("region").notNull(), // 'ghana', 'diaspora', 'nigeria', 'kenya', 'south_africa', 'global'
  currency: text("currency").notNull(), // 'USD', 'GHS', 'NGN', 'KES', 'ZAR', 'EUR', 'GBP'
  amount: integer("amount").notNull(), // Amount in cents
  discountPercentage: integer("discount_percentage").default(0), // Discount from base price
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promotional Codes table - Manage discount codes and referrals
export const promotionalCodes = pgTable("promotional_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Promo code (e.g., 'WELCOME20', 'STUDENT50')
  type: text("type").notNull(), // 'percentage', 'fixed_amount', 'free_trial'
  value: integer("value").notNull(), // Discount value (percentage or amount in cents)
  currency: text("currency"), // Currency for fixed amount discounts
  planTypes: text("plan_types"), // JSON array of applicable plan types
  regions: text("regions"), // JSON array of applicable regions
  maxUses: integer("max_uses"), // Maximum number of uses (null = unlimited)
  currentUses: integer("current_uses").default(0),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  metadata: text("metadata"), // JSON string for additional promo details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promotional Code Usage table - Track usage of promotional codes
export const promotionalCodeUsage = pgTable("promotional_code_usage", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id")
    .notNull()
    .references(() => promotionalCodes.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  discountAmount: integer("discount_amount").notNull(), // Actual discount applied in cents
  currency: text("currency").notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

// Insert schemas for payment system
export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  provider: true,
  subscriptionId: true,
  planType: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  cancelledAt: true,
  currency: true,
  amount: true,
  paymentMethod: true,
  region: true,
  trialEnd: true,
});

export const insertPaymentMethodSchema = createInsertSchema(
  paymentMethods,
).pick({
  userId: true,
  provider: true,
  externalId: true,
  type: true,
  isDefault: true,
  metadata: true,
  billingName: true,
  billingEmail: true,
  billingPhone: true,
  billingAddress: true,
  billingCity: true,
  billingState: true,
  billingPostalCode: true,
  billingCountry: true,
  nickname: true,
  isActive: true,
});

export const insertPaymentHistorySchema = createInsertSchema(
  paymentHistory,
).pick({
  subscriptionId: true,
  userId: true,
  provider: true,
  providerTransactionId: true,
  amount: true,
  currency: true,
  status: true,
  paymentMethod: true,
  paymentMethodId: true,
  failureReason: true,
  refundAmount: true,
  metadata: true,
});

export const insertSubscriptionEventSchema = createInsertSchema(
  subscriptionEvents,
).pick({
  subscriptionId: true,
  userId: true,
  eventType: true,
  provider: true,
  providerEventId: true,
  oldStatus: true,
  newStatus: true,
  metadata: true,
});

export const insertRegionalPricingSchema = createInsertSchema(
  regionalPricing,
).pick({
  planType: true,
  region: true,
  currency: true,
  amount: true,
  discountPercentage: true,
  isActive: true,
  validFrom: true,
  validUntil: true,
});

export const insertPromotionalCodeSchema = createInsertSchema(
  promotionalCodes,
).pick({
  code: true,
  type: true,
  value: true,
  currency: true,
  planTypes: true,
  regions: true,
  maxUses: true,
  currentUses: true,
  validFrom: true,
  validUntil: true,
  isActive: true,
  createdByUserId: true,
  metadata: true,
});

export const insertPromotionalCodeUsageSchema = createInsertSchema(
  promotionalCodeUsage,
).pick({
  promoCodeId: true,
  userId: true,
  subscriptionId: true,
  discountAmount: true,
  currency: true,
});

// Payment System Types
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type InsertSubscriptionEvent = z.infer<
  typeof insertSubscriptionEventSchema
>;
export type InsertRegionalPricing = z.infer<typeof insertRegionalPricingSchema>;
export type InsertPromotionalCode = z.infer<typeof insertPromotionalCodeSchema>;
export type InsertPromotionalCodeUsage = z.infer<
  typeof insertPromotionalCodeUsageSchema
>;

export type Subscription = typeof subscriptions.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type RegionalPricing = typeof regionalPricing.$inferSelect;
export type PromotionalCode = typeof promotionalCodes.$inferSelect;
export type PromotionalCodeUsage = typeof promotionalCodeUsage.$inferSelect;

// SUITE Mentorship Compatibility Scores - For mentorship matching system
export const suiteMentorshipCompatibilityScores = pgTable(
  "suite_mentorship_compatibility_scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id), // Always store smaller user ID first to prevent duplicates
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id), // Always store larger user ID second to prevent duplicates
    targetProfileId: integer("target_profile_id")
      .notNull()
      .references(() => suiteMentorshipProfiles.id), // Specific mentorship profile
    // 6D Mentorship Compatibility Model
    expertiseRelevance: integer("expertise_relevance").notNull(), // Mentor expertise to mentee goals match (1-10)
    mentorshipStyleFit: integer("mentorship_style_fit").notNull(), // Teaching/learning style compatibility (1-10)
    timeSynergy: integer("time_synergy").notNull(), // Time commitment and availability alignment (1-10)
    communicationFit: integer("communication_fit").notNull(), // Communication style and channel match (1-10)
    contextualAlignment: integer("contextual_alignment").notNull(), // Geographic, linguistic, cultural fit (1-10)
    growthGapPotential: integer("growth_gap_potential").notNull(), // Optimal experience delta (1-10)
    overallCompatibilityScore: integer("overall_compatibility_score").notNull(), // Final percentage score (1-100)
    // Success prediction metrics
    successProbability: integer("success_probability").notNull(), // 90-day success likelihood (1-100)
    breakthroughMomentPrediction: integer(
      "breakthrough_moment_prediction",
    ).notNull(), // When insights typically occur (weeks)
    plateauRiskAssessment: integer("plateau_risk_assessment").notNull(), // Stagnation risk level (1-10)
    // Detailed analysis data
    analysisData: text("analysis_data").notNull(), // JSON with comprehensive breakdown
    insights: text("insights").notNull(), // JSON array of key insights
    conversationStarters: text("conversation_starters").notNull(), // JSON array of AI-generated talking points
    mentorshipRoadmap: text("mentorship_roadmap").notNull(), // JSON with projected learning journey
    milestonePathway: text("milestone_pathway").notNull(), // JSON with predicted progress markers
    skillGapForecast: text("skill_gap_forecast").notNull(), // JSON with what mentee can learn
    // Metadata
    computedAt: timestamp("computed_at").defaultNow().notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => {
    return {
      // Ensure one score per unique user pair (bidirectional constraint)
      uniqueUserPair: unique().on(table.userId, table.targetUserId),
    };
  },
);

export const insertSuiteMentorshipCompatibilityScoreSchema = createInsertSchema(
  suiteMentorshipCompatibilityScores,
).pick({
  userId: true,
  targetUserId: true,
  targetProfileId: true,
  expertiseRelevance: true,
  mentorshipStyleFit: true,
  timeSynergy: true,
  communicationFit: true,
  contextualAlignment: true,
  growthGapPotential: true,
  overallCompatibilityScore: true,
  successProbability: true,
  breakthroughMomentPrediction: true,
  plateauRiskAssessment: true,
  analysisData: true,
  insights: true,
  conversationStarters: true,
  mentorshipRoadmap: true,
  milestonePathway: true,
  skillGapForecast: true,
  isActive: true,
});

// Inferred types for SUITE connections
export type SuiteNetworkingConnection =
  typeof suiteNetworkingConnections.$inferSelect;
export type SuiteMentorshipConnection =
  typeof suiteMentorshipConnections.$inferSelect;

export type InsertSuiteMentorshipCompatibilityScore = z.infer<
  typeof insertSuiteMentorshipCompatibilityScoreSchema
>;
export type SuiteMentorshipCompatibilityScore =
  typeof suiteMentorshipCompatibilityScores.$inferSelect;

// Swipe History types
export type SwipeHistory = typeof swipeHistory.$inferSelect;

// Connections Preferences Schema and Types
export const insertConnectionsPreferencesSchema = createInsertSchema(
  connectionsPreferences,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConnectionsPreferences = z.infer<
  typeof insertConnectionsPreferencesSchema
>;
export type ConnectionsPreferences = typeof connectionsPreferences.$inferSelect;

// KWAME AI Conversation History Table
export const kwameConversations = pgTable("kwame_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  context: text("context"), // JSON string with additional context
  appMode: text("app_mode"), // 'MEET', 'SUITE', 'HEAT'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KWAME AI Conversation schemas and types
export const insertKwameConversationSchema = createInsertSchema(
  kwameConversations,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KwameConversation = typeof kwameConversations.$inferSelect;
export type InsertKwameConversation = z.infer<
  typeof insertKwameConversationSchema
>;
