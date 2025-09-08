# CHARLéY - AI-Powered Dating & Professional Networking Platform

## Overview
CHARLéY is a comprehensive relationship and networking platform combining AI-powered matching with professional connections. It features four main sections: MEET (dating), HEAT (premium dating), Networking, and Mentorship, all unified under a single ecosystem while maintaining independent interaction contexts. The platform aims to provide a global-first experience, supporting dual nationalities and diverse professional backgrounds. Key capabilities include AI-powered matching, real-time communication, and comprehensive profile management, designed to foster meaningful personal and professional connections.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router for client-side navigation
- **Real-time**: WebSocket connections for live messaging and notifications
- **UI/UX Decisions**:
    - Elegant serif typography for education fields.
    - Consistent gradient color schemes across different sections (e.g., pink/magenta for MEET, emerald/green for Networking, amber/orange for Mentorship, indigo/blue for Jobs).
    - Smooth, physics-based swipe mechanics with natural finger-following movement and visual feedback.
    - Compact, mobile-optimized designs for dialogs and forms.
    - Glassmorphism design elements (backdrop-blur, translucent containers).
    - Futuristic aesthetic with animated background orbs and subtle glow effects for certain dialogs.
    - Streamlined UI by removing redundant elements, confirmation dialogs for common actions, and excessive toast notifications.
    - Emphasis on immediate visual feedback and optimistic UI updates for responsiveness.
    - Graceful cushioning animations on authentication page buttons with smooth scale transitions and shadow effects for enhanced user interaction feedback (2025-08-01).

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Session Management**: express-session with PostgreSQL store
- **Authentication**: Passport.js with local strategy
- **Real-time**: WebSocket server for instant messaging
- **File Processing**: Multer for image uploads
- **System Design Choices**:
    - **Independent Connection System**: Each platform section (MEET, Networking, Mentorship, Jobs) maintains separate interaction contexts in dedicated database tables, allowing users to be discoverable across all sections regardless of existing matches in other contexts.
    - **Real-time Messaging System**: Utilizes WebSockets for instant message delivery, context-aware message streams, and sophisticated unread count management.
    - **AI-Enhanced Features**: Includes AI-powered matching algorithms, AI avatar generation, and content processing for relationship insights.
    - **Swipe Card System**: Features a 5-button action system for MEET and simplified actions for SUITE apps, with bidirectional filtering to prevent seeing previously rejected profiles.
    - **User Blocking System**: Comprehensive, high-priority safety filter at FILTER 0, ensuring bidirectional blocking prevents interaction and visibility across discovery and messages.
    - **Hard Filters Architecture**: A multi-layered system (Filter 0-5) applied *before* the matching algorithm, prioritizing account status, deal breakers, age/distance limits, children compatibility, and country pool enforcement.
    - **Hybrid Matching Engine**: Combines Content-Based Filtering (40%), Collaborative Filtering (35%), and Context-Aware Re-ranking (25%) for personalized recommendations, with surgical precision diversity injection.
    - **Data Flow**: Structured authentication, matching, and message processing flows, emphasizing clear separation of concerns and robust data handling.
    - **Performance Optimizations**: Extensive caching (user session, query results), N+1 query elimination, optimized WebSocket reconnection, and database indexing for sub-2ms response times for critical operations.
    - **Age-Appropriate Content Filtering**: Conditional logic to hide/exclude adult-oriented fields and features (e.g., Physical Attraction, Deal Breakers) for users under 18, promoting a friendship-focused experience.
    - **Unified Education Search**: Standardized searchable dropdowns for universities and high schools across all profile creation areas using comprehensive databases.
    - **Profile Completion Tracking**: Dynamic health bar calculation that adapts to age and nationality, with conditional field inclusion/exclusion.
    - **Account Deactivation/Reset**: Comprehensive reset of all profile and dating preference fields to NULL upon deactivation for a complete fresh start.
    - **Mentorship Compatibility Integrity**: Fixed bidirectional duplicate record creation in mentorship compatibility scoring system. Added validation to prevent users from creating compatibility scores with their own profiles, implemented unique database constraints, and ensured proper unidirectional relationship evaluation (2025-08-01).
    - **Networking Compatibility Integrity**: Completely redesigned networking compatibility system to match mentorship behavior. Fixed self-evaluation prevention, removed automatic batch processing that was creating unwanted records, and ensured compatibility scores are only created when users intentionally click percentage badges. System now works identically to mentorship with proper validation and clean data integrity (2025-08-01).
    - **SUITE Connections Percentage Badge Implementation**: Successfully implemented networking compatibility percentage badges on SUITE Connections page with complete database integration. Fixed authentication fallbacks, TypeScript interface alignment with API responses, and validated end-to-end functionality from badge click to compatibility dashboard navigation. System creates records in suite_compatibility_scores table and provides detailed multi-dimensional compatibility analysis (2025-08-01).
    - **Age-Appropriate Email System**: Implemented comprehensive age-based email system with three distinct email templates: users under 14 receive professional apology emails explaining minimum age requirements; users aged 14-17 receive dedicated teenage welcome emails emphasizing friendship, safety, and mentorship; users 18+ receive standard adult welcome emails focusing on dating and professional networking. System includes accurate age calculation, proper email routing based on user age compliance status, and age-appropriate content customization throughout the platform (2025-08-02).
    - **Email Uniqueness Enforcement**: Implemented comprehensive email uniqueness validation system to prevent duplicate accounts. Each email address can only be associated with one account regardless of phone number changes. System includes multi-layer validation (client-side pre-checks, password step validation, final pre-submission validation), email normalization (lowercase and trimming), detailed logging for security monitoring, and enhanced error messaging to guide users toward existing account recovery. Prevents users from creating multiple accounts with same email using different phone numbers (2025-08-02).
    - **Cross-System Email Uniqueness**: Enhanced email uniqueness validation to check both active users table and blocked phone numbers table, preventing blocked users from creating new accounts with the same email address using different phone numbers. System provides specific error messages based on the source of duplication (active account vs blocked account) and comprehensive logging for security monitoring. This addresses the critical security vulnerability where blocked users could bypass restrictions by registering with the same email using different phone numbers (2025-08-02).
- **MEET Profile Deactivation Dating Preferences Bug Fix**: Fixed critical bug where dating preferences in user_preferences table were not being cleared when users deleted their MEET profiles. The issue was in the deactivation endpoint calling `updateUserPreferences(userId, ...)` instead of `updateUserPreferences(preferences.id, ...)`. The storage method expects the preference record ID, not the user ID. Fix ensures complete preference reset for fresh start when users reactivate profiles, maintaining data integrity and user experience consistency (2025-08-02).
- **Age Range N/A Display Fix for Unactivated MEET Profiles**: Fixed issue where Age Range field showed "18 - 35 years" instead of "N/A" for users who haven't activated their MEET profiles yet. Root cause was hardcoded default values (minAge: 18, maxAge: 35) in updateUserLocationPreference and updateUserPoolCountry storage methods. These methods now create preferences with NULL age values, ensuring UI correctly displays "N/A" for unactivated profiles. Also reset existing preferences for unactivated users to NULL, maintaining consistent user experience where preferences appear empty until users actively make choices (2025-08-02).
- **Comprehensive Archival System for Security and Audit Compliance**: Implemented complete automated archival system using PostgreSQL triggers and stored procedures for permanent record-keeping and security compliance. System automatically copies all user registrations, profile updates, match creations/deletions, and message activities to dedicated archived tables (archived_users, archived_matches, archived_messages). Features include: automatic triggers on INSERT/UPDATE/DELETE operations, comprehensive data integrity verification functions, archival statistics reporting, and forensic audit capabilities. Successfully archived 10 existing users and tested real-time archival of profile updates. System ensures immutable audit trail for legal compliance, security investigations, and data recovery while maintaining optimal performance through indexed queries and conflict resolution (2025-08-05).
- **Mobile Touch Event Bug Fix for MEET Swipe Cards**: Fixed critical issue where tapping the dislike button on mobile devices would sometimes accidentally trigger the "Upgrade to Premium" dialog due to event bubbling and double firing between touch and click events. Implemented unified button event handler system with touchHandledRef to prevent conflicts, using onTouchEnd instead of onTouchStart to avoid timing issues, and proper preventDefault/stopPropagation for all action buttons (dislike, star, like). Enhanced CSS with touch-action: manipulation and mobile-specific optimizations for better responsiveness and proper touch targets (min 44px) (2025-08-10).
- **Welcome Email Leadership Message Consolidation**: Streamlined welcome email communication by consolidating separate CEO and CTO messages into a unified "Message from The Leadership Team" section. The consolidated message combines key insights from both executives into a cohesive, consultant-refined narrative that presents strategic leadership vision without individual attribution. Updated both text and HTML email versions with enhanced styling featuring purple gradient design and "HT" logo representing Kronogon. This creates a more professional, unified voice while maintaining the substantive content about technology serving human connection and the science of relationship building (2025-08-11).

## External Dependencies
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit**: Development and deployment platform.
- **WebSocket**: Real-time communication protocol for instant messaging and notifications.
- **Replicate API**: Used for AI avatar generation and image processing.
- **YouTube API**: Utilized for video content processing, likely for AI training or content analysis.
- **MetaPerson**: Integrated for 3D avatar creation.
- **Google Places API**: Used for enhanced location autocomplete and real-time geocoding for distance calculations.
- **Google Timezone API**: For accurate timezone detection and compatibility scoring.
- **SendGrid**: Email service for automated notifications (e.g., welcome emails, security alerts).
- **Stripe**: Payment processing gateway for premium subscriptions, handling secure transactions and billing.
- **SMS Provider**: Configured for phone number verification (specific provider not named).