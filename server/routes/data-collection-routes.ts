/**
 * DATA COLLECTION ROUTES FOR RECIPROCITY & ENGAGEMENT SCORING
 * 
 * API routes for tracking profile views, message engagement, and reciprocity metrics
 */

import { Router } from 'express';
import {
  trackProfileView,
  getProfileViewAnalytics,
  getMessageEngagementAnalytics,
  getReciprocityScore,
  getDataCollectionStatus,
  backfillEngagementMetrics
} from '../data-collection-api';

const router = Router();

// ===============================
// PROFILE VIEW TRACKING ROUTES
// ===============================

// Track profile view
router.post('/profile-view', trackProfileView);

// Get profile view analytics
router.get('/profile-views/:userId', getProfileViewAnalytics);

// ===============================
// MESSAGE ENGAGEMENT ROUTES
// ===============================

// Get message engagement analytics between two users
router.get('/message-engagement/:userId/:targetUserId', getMessageEngagementAnalytics);

// ===============================
// RECIPROCITY SCORING ROUTES
// ===============================

// Get reciprocity score for two users
router.get('/reciprocity-score/:userId/:targetUserId', getReciprocityScore);

// ===============================
// DATA COLLECTION STATUS ROUTES
// ===============================

// Get data collection readiness status
router.get('/readiness-status', getDataCollectionStatus);

// Backfill engagement metrics for existing messages
router.post('/backfill-engagement', backfillEngagementMetrics);

export default router;