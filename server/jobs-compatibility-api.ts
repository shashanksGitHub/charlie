import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertProfessionalReviewSchema,
  type InsertProfessionalReview,
  type ProfessionalReview 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * JOBS COMPATIBILITY API
 * 
 * This API handles professional reviews and compatibility analysis for jobs.
 * When users click percentage badges on jobs profiles, it creates professional 
 * review records in the database, similar to how networking compatibility works.
 */

export function registerJobsCompatibilityAPI(app: Express) {
  
  // Get or create professional review when viewing jobs compatibility
  app.get("/api/jobs/compatibility/:targetUserId", async (req: Request, res: Response) => {
    try {
      // Authentication handling with fallback for testing
      let currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        currentUserId = 2; // Test user fallback - Ato Kwamena
      }

      const targetUserId = parseInt(req.params.targetUserId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid target user ID" });
      }

      // Prevent users from reviewing themselves
      if (targetUserId === currentUserId) {
        return res.status(400).json({ 
          message: "Cannot create professional review for yourself" 
        });
      }

      // Check if we already have a review from this user for the target
      const existingReview = await storage.getExistingReview(targetUserId, currentUserId, "overall");
      
      if (existingReview) {
        // Return existing review if found
        return res.status(200).json({
          review: existingReview,
          created: false,
          cached: true
        });
      }

      // Get target user to validate they exist
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      // Get current user data for review creation
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(400).json({ message: "Current user not found" });
      }

      // Create a new professional review record when percentage badge is clicked
      const reviewData: InsertProfessionalReview = {
        reviewedUserId: targetUserId,
        reviewerUserId: currentUserId,
        rating: 1, // Default minimum rating (constraint requires 1-5)
        reviewText: "Review pending", // Placeholder text - user will update this
        category: "overall",
        isAnonymous: false
      };

      // Create the professional review
      const newReview = await storage.createProfessionalReview(reviewData);

      res.status(200).json({
        review: newReview,
        created: true,
        cached: false,
        message: "Professional review record created successfully"
      });

    } catch (error) {
      console.error("Error in jobs compatibility API:", error);
      res.status(500).json({ 
        message: "Server error in jobs compatibility processing" 
      });
    }
  });

  // Get jobs compatibility dashboard data with review creation
  app.get("/api/jobs/compatibility/dashboard/:targetUserId", async (req: Request, res: Response) => {
    try {
      // Authentication handling with fallback for testing
      let currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        currentUserId = 2; // Test user fallback - Ato Kwamena
      }

      const targetUserId = parseInt(req.params.targetUserId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid target user ID" });
      }

      // Prevent users from reviewing themselves
      if (targetUserId === currentUserId) {
        return res.status(400).json({ 
          message: "Cannot view jobs compatibility dashboard for yourself" 
        });
      }

      // Get target user data
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      // Get current user data
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser) {
        return res.status(400).json({ message: "Current user not found" });
      }

      // Check for existing review and create one if it doesn't exist
      let existingReview = await storage.getExistingReview(targetUserId, currentUserId, "overall");
      let reviewCreated = false;

      if (!existingReview) {
        // Create a new professional review record
        const reviewData: InsertProfessionalReview = {
          reviewedUserId: targetUserId,
          reviewerUserId: currentUserId,
          rating: 1, // Default minimum rating (constraint requires 1-5)
          reviewText: "Review pending", // Placeholder text - user will update this
          category: "overall",
          isAnonymous: false
        };

        existingReview = await storage.createProfessionalReview(reviewData);
        reviewCreated = true;
      }

      // Get all reviews and stats for the target user
      const reviewsData = await storage.getProfessionalReviewsForUser(targetUserId);
      const reviewStats = await storage.getProfessionalReviewStats(targetUserId);

      // Get job-specific photo for target user
      const jobPhotos = await storage.getUserPhotos(targetUserId);
      const jobPrimaryPhoto = jobPhotos.find(photo => (photo as any).isPrimaryForJob);

      // Prepare dashboard response
      const dashboardData = {
        currentUser: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          photoUrl: currentUser.photoUrl
        },
        targetUser: {
          id: targetUser.id,
          fullName: targetUser.fullName,
          photoUrl: jobPrimaryPhoto?.photoUrl || targetUser.photoUrl,
          profession: targetUser.profession,
          location: targetUser.location
        },
        currentReview: existingReview,
        allReviews: reviewsData,
        stats: reviewStats,
        reviewCreated,
        cached: !reviewCreated
      };

      res.status(200).json(dashboardData);

    } catch (error) {
      console.error("Error in jobs compatibility dashboard API:", error);
      res.status(500).json({ 
        message: "Server error in jobs compatibility dashboard" 
      });
    }
  });
}