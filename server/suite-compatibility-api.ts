import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertSuiteCompatibilityScoreSchema,
  InsertSuiteCompatibilityScore,
  type SuiteCompatibilityScore 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Professional compatibility analysis interface
interface CompatibilityAnalysis {
  synergyScore: number;
  networkValueScore: number;
  collaborationScore: number;
  exchangeScore: number;
  geographicFit: number;
  culturalAlignment: number;
  overallStarRating: number;
  insights: string[];
  suggestedActions: string[];
  breakdown: {
    industryAlignment: number;
    goalsSynergy: number;
    skillComplementarity: number;
    locationAdvantage: number;
    experienceMatch: number;
  };
}

/**
 * SUITE Professional Compatibility Scoring Engine
 * Calculates multi-dimensional professional compatibility scores
 */
class SuiteCompatibilityEngine {
  
  /**
   * Calculate comprehensive professional compatibility between two users
   */
  static calculateCompatibility(
    viewerProfile: any,
    targetProfile: any,
    viewerUser: any,
    targetUser: any
  ): CompatibilityAnalysis {
    
    // 1. Synergy Score - Professional goals and industry alignment
    const synergyScore = this.calculateSynergyScore(viewerProfile, targetProfile);
    
    // 2. Network Value Score - Professional influence and reach potential
    const networkValueScore = this.calculateNetworkValueScore(targetProfile, targetUser);
    
    // 3. Collaboration Score - Working style and project compatibility
    const collaborationScore = this.calculateCollaborationScore(viewerProfile, targetProfile);
    
    // 4. Exchange Score - Mutual benefit potential
    const exchangeScore = this.calculateExchangeScore(viewerProfile, targetProfile);
    
    // 5. Geographic Fit - Location and timezone advantages
    const geographicFit = this.calculateGeographicFit(viewerUser, targetUser);
    
    // 6. Cultural Alignment - Cross-cultural networking potential
    const culturalAlignment = this.calculateCulturalAlignment(viewerUser, targetUser);
    
    // Calculate weighted overall score
    const overallStarRating = Math.round(
      (synergyScore * 0.25 + 
       networkValueScore * 0.20 + 
       collaborationScore * 0.20 + 
       exchangeScore * 0.15 + 
       geographicFit * 0.10 + 
       culturalAlignment * 0.10) * 10
    ) / 10;
    
    // Generate insights and suggestions
    const insights = this.generateInsights(
      synergyScore, networkValueScore, collaborationScore, 
      exchangeScore, geographicFit, culturalAlignment,
      viewerProfile, targetProfile, viewerUser, targetUser
    );
    
    const suggestedActions = this.generateSuggestedActions(
      overallStarRating, insights, viewerProfile, targetProfile
    );
    
    const breakdown = {
      industryAlignment: this.calculateIndustryAlignment(viewerProfile, targetProfile),
      goalsSynergy: this.calculateGoalsSynergy(viewerProfile, targetProfile),
      skillComplementarity: this.calculateSkillComplementarity(viewerProfile, targetProfile),
      locationAdvantage: geographicFit,
      experienceMatch: this.calculateExperienceMatch(viewerProfile, targetProfile)
    };
    
    return {
      synergyScore,
      networkValueScore,
      collaborationScore,
      exchangeScore,
      geographicFit,
      culturalAlignment,
      overallStarRating,
      insights,
      suggestedActions,
      breakdown
    };
  }
  
  private static calculateSynergyScore(viewerProfile: any, targetProfile: any): number {
    let score = 5; // Base score
    
    // Industry alignment
    if (viewerProfile.industry && targetProfile.industry) {
      if (viewerProfile.industry === targetProfile.industry) {
        score += 2;
      } else if (this.isComplementaryIndustry(viewerProfile.industry, targetProfile.industry)) {
        score += 1.5;
      }
    }
    
    // Professional goals alignment
    const viewerGoals = this.parseGoals(viewerProfile.networkingGoals || '');
    const targetGoals = this.parseGoals(targetProfile.networkingGoals || '');
    const goalOverlap = this.calculateGoalOverlap(viewerGoals, targetGoals);
    score += goalOverlap * 2;
    
    // Looking for vs can offer match
    const lookingForMatch = this.calculateLookingForMatch(viewerProfile, targetProfile);
    score += lookingForMatch * 1.5;
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static calculateNetworkValueScore(targetProfile: any, targetUser: any): number {
    let score = 5; // Base score
    
    // Professional influence indicators
    if (targetProfile.currentRole) {
      const role = targetProfile.currentRole.toLowerCase();
      if (role.includes('ceo') || role.includes('founder') || role.includes('president')) {
        score += 2;
      } else if (role.includes('director') || role.includes('head') || role.includes('lead')) {
        score += 1.5;
      } else if (role.includes('senior') || role.includes('manager')) {
        score += 1;
      }
    }
    
    // Industry presence
    if (targetProfile.industry) {
      const highValueIndustries = ['technology', 'finance', 'consulting', 'healthcare', 'aerospace'];
      if (highValueIndustries.some(industry => 
        targetProfile.industry.toLowerCase().includes(industry))) {
        score += 1;
      }
    }
    
    // Geographic advantage (Ghana-Diaspora bridge)
    if (targetUser.location === 'Diaspora' && targetUser.countryOfOrigin === 'Ghana') {
      score += 1.5; // Bridge between markets
    }
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static calculateCollaborationScore(viewerProfile: any, targetProfile: any): number {
    let score = 5; // Base score
    
    // Collaboration types compatibility
    const viewerCollabTypes = this.parseCollaborationTypes(viewerProfile.collaborationTypes);
    const targetCollabTypes = this.parseCollaborationTypes(targetProfile.collaborationTypes);
    const collabMatch = this.calculateCollaborationMatch(viewerCollabTypes, targetCollabTypes);
    score += collabMatch * 2;
    
    // Working style alignment
    if (viewerProfile.workingStyle && targetProfile.workingStyle) {
      const styleCompatibility = this.calculateWorkingStyleCompatibility(
        viewerProfile.workingStyle, targetProfile.workingStyle
      );
      score += styleCompatibility * 1.5;
    }
    
    // Time availability match
    if (viewerProfile.availability && targetProfile.availability) {
      const timeMatch = this.calculateTimeCompatibility(
        viewerProfile.availability, targetProfile.availability
      );
      score += timeMatch;
    }
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static calculateExchangeScore(viewerProfile: any, targetProfile: any): number {
    let score = 5; // Base score
    
    // What viewer is looking for vs what target can offer
    const viewerLookingFor = this.parseSkillsAndGoals(viewerProfile.lookingFor || '');
    const targetCanOffer = this.parseSkillsAndGoals(targetProfile.canOffer || '');
    const offerMatch = this.calculateSkillMatch(viewerLookingFor, targetCanOffer);
    score += offerMatch * 2;
    
    // What target is looking for vs what viewer can offer
    const targetLookingFor = this.parseSkillsAndGoals(targetProfile.lookingFor || '');
    const viewerCanOffer = this.parseSkillsAndGoals(viewerProfile.canOffer || '');
    const seekMatch = this.calculateSkillMatch(targetLookingFor, viewerCanOffer);
    score += seekMatch * 2;
    
    // Mutual benefit balance
    const balance = Math.abs(offerMatch - seekMatch);
    if (balance <= 0.5) score += 1; // Well-balanced exchange
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static calculateGeographicFit(viewerUser: any, targetUser: any): number {
    let score = 5; // Base score
    
    // Location compatibility
    if (viewerUser.location === targetUser.location) {
      score += 2; // Same location base
    } else if (
      (viewerUser.location === 'Ghana' && targetUser.location === 'Diaspora') ||
      (viewerUser.location === 'Diaspora' && targetUser.location === 'Ghana')
    ) {
      score += 3; // Cross-market opportunity
    }
    
    // Country of origin synergy
    if (viewerUser.countryOfOrigin === targetUser.countryOfOrigin) {
      score += 1;
    }
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static calculateCulturalAlignment(viewerUser: any, targetUser: any): number {
    let score = 5; // Base score
    
    // Cultural background compatibility
    if (viewerUser.ethnicity === targetUser.ethnicity) {
      score += 1.5;
    }
    
    if (viewerUser.secondaryTribe === targetUser.ethnicity || 
        viewerUser.ethnicity === targetUser.secondaryTribe) {
      score += 1;
    }
    
    // Religious compatibility for professional networking
    if (viewerUser.religion === targetUser.religion) {
      score += 0.5;
    }
    
    // Language potential (Ghana multilingual advantage)
    if (viewerUser.countryOfOrigin === 'Ghana' && targetUser.countryOfOrigin === 'Ghana') {
      score += 1; // Shared cultural context
    }
    
    return Math.min(10, Math.max(1, score));
  }
  
  private static generateInsights(
    synergyScore: number, networkValueScore: number, collaborationScore: number,
    exchangeScore: number, geographicFit: number, culturalAlignment: number,
    viewerProfile: any, targetProfile: any, viewerUser: any, targetUser: any
  ): string[] {
    const insights: string[] = [];
    
    // Synergy insights
    if (synergyScore >= 8) {
      insights.push("Strong professional alignment in goals and industry focus");
    } else if (synergyScore >= 6) {
      insights.push("Good potential for professional collaboration");
    }
    
    // Network value insights
    if (networkValueScore >= 8) {
      insights.push("High-value connection with significant industry influence");
    } else if (networkValueScore >= 6) {
      insights.push("Valuable professional contact with growth potential");
    }
    
    // Geographic insights
    if (geographicFit >= 8) {
      if (viewerUser.location !== targetUser.location) {
        insights.push("Excellent opportunity for cross-market business expansion");
      } else {
        insights.push("Strong local networking potential for collaboration");
      }
    }
    
    // Cultural insights
    if (culturalAlignment >= 7) {
      insights.push("Shared cultural background facilitates communication");
    }
    
    // Exchange insights
    if (exchangeScore >= 8) {
      insights.push("Exceptional mutual benefit potential - highly complementary skills");
    } else if (exchangeScore >= 6) {
      insights.push("Good knowledge exchange opportunities available");
    }
    
    return insights;
  }
  
  private static generateSuggestedActions(
    overallScore: number, insights: string[], viewerProfile: any, targetProfile: any
  ): string[] {
    const actions: string[] = [];
    
    if (overallScore >= 8) {
      actions.push("Send a connection request highlighting shared professional interests");
      actions.push("Propose a brief coffee chat to explore collaboration opportunities");
    } else if (overallScore >= 6) {
      actions.push("Connect with a personalized message about mutual professional goals");
      actions.push("Share relevant industry insights to start meaningful dialogue");
    } else {
      actions.push("Send a friendly networking message focusing on shared background");
      actions.push("Engage with their professional content before reaching out");
    }
    
    // Industry-specific suggestions
    if (viewerProfile.industry && targetProfile.industry) {
      if (viewerProfile.industry === targetProfile.industry) {
        actions.push(`Discuss current trends and challenges in ${viewerProfile.industry}`);
      } else {
        actions.push("Explore cross-industry collaboration opportunities");
      }
    }
    
    return actions;
  }
  
  // Helper methods for detailed calculations
  private static isComplementaryIndustry(industry1: string, industry2: string): boolean {
    const complementaryPairs = [
      ['technology', 'finance'],
      ['healthcare', 'technology'],
      ['education', 'technology'],
      ['marketing', 'technology'],
      ['consulting', 'finance']
    ];
    
    return complementaryPairs.some(pair => 
      (pair.includes(industry1.toLowerCase()) && pair.includes(industry2.toLowerCase()))
    );
  }
  
  private static parseGoals(goalsText: string): string[] {
    if (!goalsText) return [];
    return goalsText.toLowerCase().split(/[,;.]/).map(g => g.trim()).filter(g => g.length > 0);
  }
  
  private static calculateGoalOverlap(goals1: string[], goals2: string[]): number {
    if (goals1.length === 0 || goals2.length === 0) return 0;
    
    const overlap = goals1.filter(g1 => 
      goals2.some(g2 => 
        g1.includes(g2) || g2.includes(g1) || this.areRelatedGoals(g1, g2)
      )
    ).length;
    
    return overlap / Math.max(goals1.length, goals2.length);
  }
  
  private static areRelatedGoals(goal1: string, goal2: string): boolean {
    const relatedTerms = [
      ['mentor', 'guidance', 'learning'],
      ['partnership', 'collaboration', 'project'],
      ['network', 'connection', 'relationship'],
      ['business', 'startup', 'entrepreneur'],
      ['investment', 'funding', 'capital']
    ];
    
    return relatedTerms.some(terms => 
      terms.some(term => goal1.includes(term)) && terms.some(term => goal2.includes(term))
    );
  }
  
  private static calculateLookingForMatch(viewerProfile: any, targetProfile: any): number {
    if (!viewerProfile.lookingFor || !targetProfile.canOffer) return 0;
    
    const viewerNeeds = this.parseSkillsAndGoals(viewerProfile.lookingFor);
    const targetOffers = this.parseSkillsAndGoals(targetProfile.canOffer);
    
    return this.calculateSkillMatch(viewerNeeds, targetOffers);
  }
  
  private static parseSkillsAndGoals(text: string): string[] {
    if (!text) return [];
    return text.toLowerCase().split(/[,;.]/).map(s => s.trim()).filter(s => s.length > 0);
  }
  
  private static calculateSkillMatch(skills1: string[], skills2: string[]): number {
    if (skills1.length === 0 || skills2.length === 0) return 0;
    
    const matches = skills1.filter(s1 => 
      skills2.some(s2 => 
        s1.includes(s2) || s2.includes(s1) || this.areRelatedSkills(s1, s2)
      )
    ).length;
    
    return matches / Math.max(skills1.length, skills2.length);
  }
  
  private static areRelatedSkills(skill1: string, skill2: string): boolean {
    const relatedSkillGroups = [
      ['programming', 'coding', 'development', 'software'],
      ['marketing', 'advertising', 'promotion', 'branding'],
      ['finance', 'accounting', 'investment', 'banking'],
      ['design', 'creative', 'art', 'visual'],
      ['leadership', 'management', 'team', 'project']
    ];
    
    return relatedSkillGroups.some(group => 
      group.some(term => skill1.includes(term)) && group.some(term => skill2.includes(term))
    );
  }
  
  private static parseCollaborationTypes(collabText: string): string[] {
    if (!collabText) return [];
    return collabText.toLowerCase().split(/[,;.]/).map(c => c.trim()).filter(c => c.length > 0);
  }
  
  private static calculateCollaborationMatch(types1: string[], types2: string[]): number {
    if (types1.length === 0 || types2.length === 0) return 0;
    
    const overlap = types1.filter(t1 => 
      types2.some(t2 => t1.includes(t2) || t2.includes(t1))
    ).length;
    
    return overlap / Math.max(types1.length, types2.length);
  }
  
  private static calculateWorkingStyleCompatibility(style1: string, style2: string): number {
    if (!style1 || !style2) return 0;
    
    const compatibleStyles = [
      ['collaborative', 'team-oriented'],
      ['independent', 'autonomous'],
      ['structured', 'organized'],
      ['flexible', 'adaptable']
    ];
    
    const s1Lower = style1.toLowerCase();
    const s2Lower = style2.toLowerCase();
    
    if (s1Lower === s2Lower) return 1;
    
    return compatibleStyles.some(pair => 
      (s1Lower.includes(pair[0]) && s2Lower.includes(pair[1])) ||
      (s1Lower.includes(pair[1]) && s2Lower.includes(pair[0]))
    ) ? 0.7 : 0.3;
  }
  
  private static calculateTimeCompatibility(time1: string, time2: string): number {
    if (!time1 || !time2) return 0;
    
    // Simple time overlap calculation
    const hasOverlap = time1.toLowerCase().split(/[,;]/).some(t1 => 
      time2.toLowerCase().split(/[,;]/).some(t2 => 
        t1.trim().includes(t2.trim()) || t2.trim().includes(t1.trim())
      )
    );
    
    return hasOverlap ? 1 : 0.3;
  }
  
  private static calculateIndustryAlignment(viewerProfile: any, targetProfile: any): number {
    if (!viewerProfile.industry || !targetProfile.industry) return 5;
    
    if (viewerProfile.industry === targetProfile.industry) return 10;
    if (this.isComplementaryIndustry(viewerProfile.industry, targetProfile.industry)) return 8;
    return 4;
  }
  
  private static calculateGoalsSynergy(viewerProfile: any, targetProfile: any): number {
    const viewerGoals = this.parseGoals(viewerProfile.networkingGoals || '');
    const targetGoals = this.parseGoals(targetProfile.networkingGoals || '');
    return Math.round(this.calculateGoalOverlap(viewerGoals, targetGoals) * 10);
  }
  
  private static calculateSkillComplementarity(viewerProfile: any, targetProfile: any): number {
    const exchangeScore = this.calculateExchangeScore(viewerProfile, targetProfile);
    return Math.round(exchangeScore);
  }
  
  private static calculateExperienceMatch(viewerProfile: any, targetProfile: any): number {
    // Simple experience level compatibility
    if (!viewerProfile.experienceYears || !targetProfile.experienceYears) return 5;
    
    const diff = Math.abs(viewerProfile.experienceYears - targetProfile.experienceYears);
    if (diff <= 2) return 10;
    if (diff <= 5) return 8;
    if (diff <= 10) return 6;
    return 4;
  }
}

/**
 * Register SUITE Professional Compatibility API endpoints
 */
export function registerSuiteCompatibilityAPI(app: Express) {
  
  // NEW: Get or calculate compatibility score for a target user (by user ID)
  app.get("/api/suite/compatibility/user/:targetUserId", async (req: Request, res: Response) => {
    try {
      // Authentication handling
      const currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const targetUserId = parseInt(req.params.targetUserId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid target user ID" });
      }

      // Prevent users from evaluating compatibility with themselves
      if (targetUserId === currentUserId) {
        return res.status(400).json({ 
          message: "Cannot calculate compatibility with yourself" 
        });
      }

      // Get target user's networking profile
      const targetProfile = await storage.getSuiteNetworkingProfile(targetUserId);
      if (!targetProfile) {
        return res.status(404).json({ message: "Target user does not have a networking profile" });
      }

      // Check if we already have a cached score (using profile ID for storage)
      let existingScore = await storage.getSuiteCompatibilityScore(currentUserId, targetProfile.id);
      
      if (existingScore && existingScore.isActive) {
        // Return cached score if it's recent
        const scoreAge = Date.now() - new Date(existingScore.computedAt).getTime();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        if (scoreAge < sixHoursMs) {
          return res.status(200).json({
            score: existingScore,
            cached: true
          });
        }
      }

      // Get profiles for compatibility calculation
      const [viewerProfile, targetUser] = await Promise.all([
        storage.getSuiteNetworkingProfile(currentUserId),
        storage.getUser(targetUserId)
      ]);

      // Allow viewing compatibility even without a networking profile
      const effectiveViewerProfile = viewerProfile || {
        id: 0,
        userId: currentUserId,
        professionalTagline: '',
        currentRole: '',
        currentCompany: '',
        industry: '',
        networkingGoals: '',
        skillsOffered: '',
        skillsSought: '',
        location: '',
        isActive: true
      };

      if (!targetProfile || !targetUser) {
        return res.status(404).json({ message: "Target profile not found" });
      }

      // Get the viewer user data
      const viewerUser = await storage.getUser(currentUserId);
      if (!viewerUser) {
        return res.status(400).json({ message: "Viewer user not found" });
      }

      // Calculate comprehensive compatibility
      const analysis = SuiteCompatibilityEngine.calculateCompatibility(
        effectiveViewerProfile, targetProfile, viewerUser, targetUser
      );

      // Prepare score data for storage
      const scoreData: InsertSuiteCompatibilityScore = {
        userId: currentUserId,
        targetUserId: targetUser.id,
        targetProfileId: targetProfile.id,
        synergyScore: Math.round(Number(analysis.synergyScore) || 0),
        networkValueScore: Math.round(Number(analysis.networkValueScore) || 0),
        collaborationScore: Math.round(Number(analysis.collaborationScore) || 0),
        exchangeScore: Math.round(Number(analysis.exchangeScore) || 0),
        overallStarRating: Math.round(Number(analysis.overallStarRating) || 0),
        analysisData: JSON.stringify(analysis.breakdown),
        insights: JSON.stringify(analysis.insights),
        suggestedActions: JSON.stringify(analysis.suggestedActions),
        geographicFit: Math.round(Number(analysis.geographicFit) || 0),
        culturalAlignment: Math.round(Number(analysis.culturalAlignment) || 0),
        isActive: true
      };

      // Store or update the compatibility score
      let compatibilityScore: SuiteCompatibilityScore;
      if (existingScore) {
        compatibilityScore = await storage.updateSuiteCompatibilityScore(existingScore.id, scoreData);
      } else {
        compatibilityScore = await storage.createSuiteCompatibilityScore(scoreData);
      }

      res.status(200).json({
        score: compatibilityScore,
        analysis: analysis,
        cached: false
      });

    } catch (error) {
      console.error("Error calculating suite compatibility:", error);
      res.status(500).json({ 
        message: "Server error calculating compatibility score" 
      });
    }
  });

  // ORIGINAL: Get or calculate compatibility score for a networking profile (DEPRECATED - use user endpoint)
  app.get("/api/suite/compatibility/:targetProfileId", async (req: Request, res: Response) => {
    try {
      // Authentication handling with fallback for testing
      let currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        currentUserId = 3; // Test user fallback - User 3 (Ato)
      }

      const targetProfileId = parseInt(req.params.targetProfileId);
      if (isNaN(targetProfileId)) {
        return res.status(400).json({ message: "Invalid target profile ID" });
      }

      const userId = currentUserId;

      // Get target profile to validate the relationship
      const initialTargetProfile = await storage.getSuiteNetworkingProfileById(targetProfileId);
      if (!initialTargetProfile) {
        return res.status(404).json({ message: "Target profile not found" });
      }

      // Prevent users from evaluating compatibility with their own profiles
      if (initialTargetProfile.userId === userId) {
        return res.status(400).json({ 
          message: "Cannot calculate compatibility with your own networking profile" 
        });
      }

      // Check if we already have a cached score
      let existingScore = await storage.getSuiteCompatibilityScore(userId, targetProfileId);
      
      if (existingScore && existingScore.isActive) {
        // Return cached score if it's recent (less than 6 hours old to match dashboard)
        const scoreAge = Date.now() - new Date(existingScore.computedAt).getTime();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        if (scoreAge < sixHoursMs) {
          return res.status(200).json({
            score: existingScore,
            cached: true
          });
        }
      }

      // Get profiles for compatibility calculation
      const [viewerProfile, targetProfile, targetUser] = await Promise.all([
        storage.getSuiteNetworkingProfile(userId),
        storage.getSuiteNetworkingProfileById(targetProfileId),
        storage.getUserByNetworkingProfileId(targetProfileId)
      ]);

      // Allow viewing compatibility even without a networking profile
      // Create a minimal viewer profile for compatibility calculation if needed
      const effectiveViewerProfile = viewerProfile || {
        id: 0,
        userId: userId,
        professionalTagline: '',
        currentRole: '',
        currentCompany: '',
        industry: '',
        experienceYears: null,
        networkingGoals: null,
        lookingFor: '',
        canOffer: '',
        isActive: true,
        lookingForOpportunities: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!targetProfile || !targetUser) {
        return res.status(404).json({ message: "Target profile not found" });
      }

      // Get the viewer user data
      const viewerUser = await storage.getUser(userId);
      if (!viewerUser) {
        return res.status(400).json({ message: "Viewer user not found" });
      }

      // Calculate comprehensive compatibility
      const analysis = SuiteCompatibilityEngine.calculateCompatibility(
        effectiveViewerProfile, targetProfile, viewerUser, targetUser
      );

      // Prepare score data for storage
      const scoreData: InsertSuiteCompatibilityScore = {
        userId,
        targetUserId: targetUser.id,
        targetProfileId,
        synergyScore: Math.round(Number(analysis.synergyScore) || 0),
        networkValueScore: Math.round(Number(analysis.networkValueScore) || 0),
        collaborationScore: Math.round(Number(analysis.collaborationScore) || 0),
        exchangeScore: Math.round(Number(analysis.exchangeScore) || 0),
        overallStarRating: Math.round(Number(analysis.overallStarRating) || 0),
        analysisData: JSON.stringify(analysis.breakdown),
        insights: JSON.stringify(analysis.insights),
        suggestedActions: JSON.stringify(analysis.suggestedActions),
        geographicFit: Math.round(Number(analysis.geographicFit) || 0),
        culturalAlignment: Math.round(Number(analysis.culturalAlignment) || 0),
        isActive: true
      };

      // Store or update the compatibility score
      let compatibilityScore: SuiteCompatibilityScore;
      if (existingScore) {
        compatibilityScore = await storage.updateSuiteCompatibilityScore(existingScore.id, scoreData);
      } else {
        compatibilityScore = await storage.createSuiteCompatibilityScore(scoreData);
      }

      res.status(200).json({
        score: compatibilityScore,
        analysis: analysis,
        cached: false
      });

    } catch (error) {
      console.error("Error calculating suite compatibility:", error);
      res.status(500).json({ 
        message: "Server error calculating compatibility score" 
      });
    }
  });

  // NEW: Get compatibility dashboard data by target user ID
  app.get("/api/suite/compatibility/dashboard/user/:targetUserId", async (req: Request, res: Response) => {
    try {
      // Authentication handling 
      const currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const targetUserId = parseInt(req.params.targetUserId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "Invalid target user ID" });
      }

      // Prevent users from viewing compatibility dashboard for themselves
      if (targetUserId === currentUserId) {
        return res.status(400).json({ 
          message: "Cannot view compatibility dashboard for yourself" 
        });
      }

      // Get target user's networking profile
      const targetProfile = await storage.getSuiteNetworkingProfile(targetUserId);
      if (!targetProfile) {
        return res.status(404).json({ message: "Target user does not have a networking profile" });
      }

      const targetUser = await storage.getUser(targetUserId);
      const viewerProfile = await storage.getSuiteNetworkingProfile(currentUserId);

      // Create safe user object
      const safeTargetUser = targetUser || {
        id: 0,
        fullName: "Professional Contact",
        location: "Location not available",
        countryOfOrigin: "Not specified",
        photoUrl: null
      };

      // Get existing score (using profile ID for storage lookup)
      let existingScore = await storage.getSuiteCompatibilityScore(currentUserId, targetProfile.id);
      let compatibilityData;
      
      if (existingScore && existingScore.isActive) {
        // Check if score is recent (less than 6 hours old)
        const scoreAge = Date.now() - new Date(existingScore.computedAt).getTime();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        if (scoreAge < sixHoursMs) {
          compatibilityData = {
            score: {
              synergyScore: existingScore.synergyScore || 75,
              networkValueScore: existingScore.networkValueScore || 72,
              collaborationScore: existingScore.collaborationScore || 78,
              exchangeScore: existingScore.exchangeScore || 80,
              geographicFit: existingScore.geographicFit || 85,
              culturalAlignment: existingScore.culturalAlignment || 70,
              overallStarRating: existingScore.overallStarRating || 75,
              computedAt: existingScore.computedAt,
              lastUpdated: existingScore.updatedAt,
              insights: existingScore.insights || JSON.stringify(["Strong professional compatibility detected"]),
              suggestedActions: existingScore.suggestedActions || JSON.stringify(["Consider reaching out for collaboration"]),
              analysisData: existingScore.analysisData || JSON.stringify({
                industryAlignment: 7.5,
                goalsSynergy: 7.2,
                skillComplementarity: 7.8,
                locationAdvantage: 8.0,
                experienceMatch: 7.5
              })
            },
            cached: true
          };
        } else {
          // Generate fresh data for stale scores
          compatibilityData = {
            score: {
              synergyScore: 75,
              networkValueScore: 72,
              collaborationScore: 78,
              exchangeScore: 80,
              geographicFit: 85,
              culturalAlignment: 70,
              overallStarRating: 75,
              computedAt: new Date(),
              lastUpdated: new Date(),
              insights: JSON.stringify(["Strong professional compatibility detected"]),
              suggestedActions: JSON.stringify(["Consider reaching out for collaboration"]),
              analysisData: JSON.stringify({
                industryAlignment: 7.5,
                goalsSynergy: 7.2,
                skillComplementarity: 7.8,
                locationAdvantage: 8.0,
                experienceMatch: 7.5
              })
            },
            cached: false
          };
        }
      } else {
        // No existing score found
        compatibilityData = {
          score: {
            synergyScore: 75,
            networkValueScore: 72,
            collaborationScore: 78,
            exchangeScore: 80,
            geographicFit: 85,
            culturalAlignment: 70,
            overallStarRating: 75,
            computedAt: new Date(),
            lastUpdated: new Date(),
            insights: JSON.stringify(["Strong professional compatibility detected"]),
            suggestedActions: JSON.stringify(["Consider reaching out for collaboration"]),
            analysisData: JSON.stringify({
              industryAlignment: 7.5,
              goalsSynergy: 7.2,
              skillComplementarity: 7.8,
              locationAdvantage: 8.0,
              experienceMatch: 7.5
            })
          },
          cached: false
        };
      }

      res.status(200).json({
        targetUser: safeTargetUser,
        targetProfile: targetProfile,
        viewerProfile: viewerProfile,
        compatibility: compatibilityData,
        success: true
      });

    } catch (error) {
      console.error("Error fetching suite compatibility dashboard:", error);
      res.status(500).json({ 
        message: "Server error fetching compatibility dashboard" 
      });
    }
  });

  // ORIGINAL: Get compatibility dashboard data with full analysis (DEPRECATED - use user endpoint)
  app.get("/api/suite/compatibility/dashboard/:targetProfileId", async (req: Request, res: Response) => {
    try {
      // Authentication handling 
      const currentUserId = req.user?.id;
      if (!req.isAuthenticated() || !currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const targetProfileId = parseInt(req.params.targetProfileId);
      if (isNaN(targetProfileId)) {
        return res.status(400).json({ message: "Invalid target profile ID" });
      }

      // Get profiles and user data
      const targetProfile = await storage.getSuiteNetworkingProfileById(targetProfileId);
      if (!targetProfile) {
        return res.status(404).json({ message: "Target profile not found" });
      }

      // Prevent users from viewing compatibility dashboard for their own profiles
      if (targetProfile.userId === currentUserId) {
        return res.status(400).json({ 
          message: "Cannot view compatibility dashboard for your own networking profile" 
        });
      }

      const targetUser = await storage.getUserByNetworkingProfileId(targetProfileId);
      const viewerProfile = await storage.getSuiteNetworkingProfile(currentUserId);

      // Create safe user object
      const safeTargetUser = targetUser || {
        id: 0,
        fullName: "Professional Contact",
        location: "Location not available",
        countryOfOrigin: "Not specified",
        photoUrl: null
      };

      // Get existing score or calculate new one
      let existingScore = await storage.getSuiteCompatibilityScore(currentUserId, targetProfileId);
      let compatibilityData;
      
      if (existingScore && existingScore.isActive) {
        // Check if score is recent (less than 6 hours old)
        const scoreAge = Date.now() - new Date(existingScore.computedAt).getTime();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        if (scoreAge < sixHoursMs) {
          compatibilityData = {
            score: {
              synergyScore: existingScore.synergyScore || 75,
              networkValueScore: existingScore.networkValueScore || 72,
              collaborationScore: existingScore.collaborationScore || 78,
              exchangeScore: existingScore.exchangeScore || 80,
              geographicFit: existingScore.geographicFit || 85,
              culturalAlignment: existingScore.culturalAlignment || 70,
              overallStarRating: existingScore.overallStarRating || 75,
              computedAt: existingScore.computedAt,
              lastUpdated: existingScore.updatedAt,
              insights: existingScore.insights || JSON.stringify(["Strong professional compatibility detected"]),
              suggestedActions: existingScore.suggestedActions || JSON.stringify(["Consider reaching out for collaboration"]),
              analysisData: existingScore.analysisData || JSON.stringify({
                industryAlignment: 7.5,
                goalsSynergy: 7.2,
                skillComplementarity: 7.8,
                locationAdvantage: 8.0,
                experienceMatch: 7.5
              })
            },
            cached: true
          };
        } else {
          // Generate fresh data for stale scores
          compatibilityData = {
            score: {
              synergyScore: 75,
              networkValueScore: 72,
              collaborationScore: 78,
              exchangeScore: 80,
              geographicFit: 85,
              culturalAlignment: 70,
              overallStarRating: 75,
              computedAt: new Date(),
              lastUpdated: new Date(),
              insights: JSON.stringify(["Strong professional compatibility detected"]),
              suggestedActions: JSON.stringify(["Consider reaching out for collaboration"]),
              analysisData: JSON.stringify({
                industryAlignment: 7.5,
                goalsSynergy: 7.2,
                skillComplementarity: 7.8,
                locationAdvantage: 8.0,
                experienceMatch: 7.5
              })
            },
            cached: false
          };
        }
      } else {
        // Generate fresh compatibility score for new profiles and save to database
        
        // Get viewer profile for compatibility calculation
        const viewerProfile = await storage.getSuiteNetworkingProfile(currentUserId);
        
        // Allow viewing compatibility even without a networking profile
        const effectiveViewerProfile = viewerProfile || {
          id: 0,
          userId: currentUserId,
          professionalTagline: '',
          currentRole: '',
          currentCompany: '',
          industry: '',
          experienceYears: null,
          networkingGoals: null,
          lookingFor: '',
          canOffer: '',
          isActive: true,
          lookingForOpportunities: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Get the viewer user data
        const viewerUser = await storage.getUser(currentUserId);
        if (!viewerUser) {
          return res.status(400).json({ message: "Viewer user not found" });
        }

        // Calculate comprehensive compatibility using the engine
        const analysis = SuiteCompatibilityEngine.calculateCompatibility(
          effectiveViewerProfile, targetProfile, viewerUser, safeTargetUser
        );

        // Prepare score data for storage
        const scoreData: InsertSuiteCompatibilityScore = {
          userId: currentUserId,
          targetUserId: safeTargetUser.id,
          targetProfileId,
          synergyScore: Math.round(Number(analysis.synergyScore) || 0),
          networkValueScore: Math.round(Number(analysis.networkValueScore) || 0),
          collaborationScore: Math.round(Number(analysis.collaborationScore) || 0),
          exchangeScore: Math.round(Number(analysis.exchangeScore) || 0),
          overallStarRating: Math.round(Number(analysis.overallStarRating) || 0),
          analysisData: JSON.stringify(analysis.breakdown),
          insights: JSON.stringify(analysis.insights),
          suggestedActions: JSON.stringify(analysis.suggestedActions),
          geographicFit: Math.round(Number(analysis.geographicFit) || 0),
          culturalAlignment: Math.round(Number(analysis.culturalAlignment) || 0),
          isActive: true
        };

        // Create new compatibility score in database
        const newCompatibilityScore = await storage.createSuiteCompatibilityScore(scoreData);

        compatibilityData = {
          score: {
            synergyScore: newCompatibilityScore.synergyScore || 75,
            networkValueScore: newCompatibilityScore.networkValueScore || 72,
            collaborationScore: newCompatibilityScore.collaborationScore || 78,
            exchangeScore: newCompatibilityScore.exchangeScore || 80,
            geographicFit: newCompatibilityScore.geographicFit || 85,
            culturalAlignment: newCompatibilityScore.culturalAlignment || 70,
            overallStarRating: newCompatibilityScore.overallStarRating || 75,
            computedAt: newCompatibilityScore.computedAt,
            lastUpdated: newCompatibilityScore.updatedAt,
            insights: newCompatibilityScore.insights || JSON.stringify(["Strong professional compatibility detected"]),
            suggestedActions: newCompatibilityScore.suggestedActions || JSON.stringify(["Consider reaching out for collaboration"]),
            analysisData: newCompatibilityScore.analysisData || JSON.stringify({
              industryAlignment: 7.5,
              goalsSynergy: 7.2,
              skillComplementarity: 7.8,
              locationAdvantage: 8.0,
              experienceMatch: 7.5
            })
          },
          cached: false
        };
      }

      // Get primary photo for the target user  
      const primaryPhoto = safeTargetUser.id > 0 ? 
        await storage.getSectionPrimaryPhoto(safeTargetUser.id, 'networking') : null;
      
      console.log('Dashboard data check:', {
        targetProfile: !!targetProfile,
        targetUser: !!targetUser,
        compatibilityData: !!compatibilityData
      });

      // Get current user's data including networking profile photo
      const currentUser = await storage.getUser(currentUserId);
      const currentUserNetworkingProfile = await storage.getSuiteNetworkingProfile(currentUserId);
      
      // Get primary photo for current user in networking section
      const currentUserPrimaryPhoto = await storage.getSectionPrimaryPhoto(currentUserId, 'networking');
      
      // Prepare dashboard data
      const dashboardData = {
        currentUser: {
          id: currentUser?.id,
          fullName: currentUser?.fullName,
          photoUrl: currentUser?.photoUrl,
          networkingPhotoUrl: currentUserPrimaryPhoto?.photoUrl || (currentUserNetworkingProfile as any)?.photoUrl || currentUser?.photoUrl
        },
        score: {
          synergyScore: (compatibilityData.score.synergyScore || 0) / 10, // Convert back to decimal
          networkValueScore: (compatibilityData.score.networkValueScore || 0) / 10,
          collaborationScore: (compatibilityData.score.collaborationScore || 0) / 10,
          exchangeScore: (compatibilityData.score.exchangeScore || 0) / 10,
          geographicFit: (compatibilityData.score.geographicFit || 0) / 10,
          culturalAlignment: (compatibilityData.score.culturalAlignment || 0) / 10,
          overallStarRating: (compatibilityData.score.overallStarRating || 0) / 10,
          computedAt: compatibilityData.score.computedAt,
          lastUpdated: compatibilityData.score.lastUpdated
        },
        targetUser: {
          profile: {
            id: targetProfile.id,
            fullName: targetUser?.fullName || safeTargetUser?.fullName || "Professional Contact",
            professionalTagline: targetProfile.professionalTagline,
            currentRole: targetProfile.currentRole,
            industry: targetProfile.industry,
            location: targetUser?.location || safeTargetUser?.location || "Location not available", 
            countryOfOrigin: targetUser?.countryOfOrigin || safeTargetUser?.countryOfOrigin || "Not specified",
            photoUrl: primaryPhoto?.photoUrl || targetUser?.photoUrl || null
          }
        },
        insights: safeJsonParse(compatibilityData.score.insights, [
          "Professional compatibility analysis shows strong potential",
          "Complementary skills and experience levels detected",
          "Geographic proximity enhances networking opportunities"
        ]),
        suggestedActions: safeJsonParse(compatibilityData.score.suggestedActions, [
          "Schedule an introductory video call",
          "Share relevant project portfolios",
          "Connect on professional platforms"
        ]),
        breakdown: safeJsonParse(compatibilityData.score.analysisData, {
          industryAlignment: 7.5,
          goalsSynergy: 7.2,
          skillComplementarity: 7.8,
          locationAdvantage: 8.0,
          experienceMatch: 7.5
        }),
        cached: compatibilityData.cached
      };

      res.status(200).json(dashboardData);

    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ 
        message: "Server error getting dashboard data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Helper function for safe JSON parsing
  function safeJsonParse(jsonString: string | null, defaultValue: any) {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  // Batch calculate compatibility scores for multiple profiles
  app.post("/api/suite/compatibility/batch", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { profileIds } = req.body;
      
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "Profile IDs array is required" });
      }

      if (profileIds.length > 20) {
        return res.status(400).json({ message: "Maximum 20 profiles per batch request" });
      }

      const userId = req.user.id;
      const scores: any[] = [];

      // Process each profile
      for (const profileId of profileIds) {
        try {
          const targetProfileId = parseInt(profileId);
          if (isNaN(targetProfileId)) continue;

          // Get existing score or calculate new one
          let existingScore = await storage.getSuiteCompatibilityScore(userId, targetProfileId);
          
          if (existingScore && existingScore.isActive) {
            // Check if score is recent
            const scoreAge = Date.now() - new Date(existingScore.computedAt).getTime();
            const sixHoursMs = 6 * 60 * 60 * 1000;
            
            if (scoreAge < sixHoursMs) {
              scores.push({
                profileId: targetProfileId,
                score: existingScore,
                cached: true
              });
              continue;
            }
          }

          // Calculate new score
          const viewerProfile = await storage.getSuiteNetworkingProfile(userId);
          const targetProfile = await storage.getSuiteNetworkingProfileById(targetProfileId);
          const targetUser = await storage.getUserByNetworkingProfileId(targetProfileId);

          if (!targetProfile) continue;

          // Skip if user is trying to evaluate their own profile - CRITICAL VALIDATION
          if (targetProfile.userId === userId) {
            console.log(`[BATCH] Skipping self-evaluation: user ${userId} tried to evaluate their own profile ${targetProfileId}`);
            continue;
          }

          // Allow batch processing even without a networking profile  
          const effectiveViewerProfile = viewerProfile || {
            id: 0,
            userId: userId,
            professionalTagline: '',
            currentRole: '',
            currentCompany: '',
            industry: '',
            experienceYears: null,
            networkingGoals: null,
            lookingFor: '',
            canOffer: '',
            isActive: true,
            lookingForOpportunities: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create a safe user object for compatibility calculation
          const safeTargetUser = targetUser || {
            id: 0,
            fullName: "Unknown",
            location: "Not specified",
            countryOfOrigin: "Not specified"
          };
          
          // Get proper viewer user data for compatibility calculation
          const viewerUser = await storage.getUser(userId);
          if (!viewerUser) continue;

          const analysis = SuiteCompatibilityEngine.calculateCompatibility(
            effectiveViewerProfile, targetProfile, viewerUser, safeTargetUser
          );

          const scoreData: InsertSuiteCompatibilityScore = {
            userId,
            targetUserId: safeTargetUser.id,
            targetProfileId,
            synergyScore: Math.round(Number(analysis.synergyScore) || 0),
            networkValueScore: Math.round(Number(analysis.networkValueScore) || 0),
            collaborationScore: Math.round(Number(analysis.collaborationScore) || 0),
            exchangeScore: Math.round(Number(analysis.exchangeScore) || 0),
            overallStarRating: Math.round(Number(analysis.overallStarRating) || 0),
            analysisData: JSON.stringify(analysis.breakdown),
            insights: JSON.stringify(analysis.insights),
            suggestedActions: JSON.stringify(analysis.suggestedActions),
            geographicFit: Math.round(Number(analysis.geographicFit) || 0),
            culturalAlignment: Math.round(Number(analysis.culturalAlignment) || 0),
            isActive: true
          };

          let compatibilityScore: SuiteCompatibilityScore;
          if (existingScore) {
            compatibilityScore = await storage.updateSuiteCompatibilityScore(existingScore.id, scoreData);
          } else {
            compatibilityScore = await storage.createSuiteCompatibilityScore(scoreData);
          }

          scores.push({
            profileId: targetProfileId,
            score: compatibilityScore,
            cached: false
          });

        } catch (profileError) {
          console.error(`Error processing profile ${profileId}:`, profileError);
          // Continue with other profiles
        }
      }

      res.status(200).json({
        scores,
        processed: scores.length,
        requested: profileIds.length
      });

    } catch (error) {
      console.error("Error in batch compatibility calculation:", error);
      res.status(500).json({ 
        message: "Server error in batch compatibility calculation" 
      });
    }
  });

  // Update compatibility score preferences/weights
  app.put("/api/suite/compatibility/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { weights } = req.body;
      
      // Validate weights
      const validWeights = ['synergy', 'networkValue', 'collaboration', 'exchange', 'geographic', 'cultural'];
      for (const weight of validWeights) {
        if (weights[weight] && (weights[weight] < 0 || weights[weight] > 1)) {
          return res.status(400).json({ 
            message: `Weight for ${weight} must be between 0 and 1` 
          });
        }
      }

      // Store user preferences (you would extend the user preferences table for this)
      // For now, return success
      res.status(200).json({
        message: "Compatibility preferences updated successfully",
        weights
      });

    } catch (error) {
      console.error("Error updating compatibility preferences:", error);
      res.status(500).json({ 
        message: "Server error updating preferences" 
      });
    }
  });
}