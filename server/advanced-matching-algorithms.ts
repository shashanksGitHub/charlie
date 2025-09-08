/**
 * Advanced Matching Algorithms for CHARLEY
 * 
 * Implements sophisticated algorithms mentioned in the research document:
 * - Matrix Factorization (SVD, ALS)
 * - Cosine Similarity
 * - TF-IDF for textual analysis
 * - Diversity injection
 * - Neural collaborative filtering foundations
 */

import type { User, UserPreference } from "@shared/schema";
import { geocodingService } from "./geocoding-service.ts";

export interface AdvancedMatchScore {
  userId: number;
  contentScore: number;
  collaborativeScore: number;
  contextScore: number;
  diversityBonus: number;
  reciprocityScore: number;
  finalScore: number;
  algorithmVersion: string;
  reasons: string[];
}

export interface UserVector {
  userId: number;
  ageNormalized: number;
  heightCompatibility: number; // NEW: Height compatibility score
  locationVector: number[];
  interestVector: number[];
  religionVector: number[];
  ethnicityVector: number[];
  profileCompleteness: number;
  activityScore: number;
}

export interface InteractionMatrix {
  userIds: number[];
  interactions: number[][]; // Sparse matrix representation
  profileVectors: Map<number, UserVector>;
}

export class AdvancedMatchingEngine {
  private interactionCache: Map<number, number[]> = new Map();
  private vectorCache: Map<number, UserVector> = new Map();
  private diversityThreshold = 0.15; // Minimum diversity injection percentage

  /**
   * Enhanced content scoring using multiple similarity algorithms
   */
  calculateAdvancedContentScore(
    user: User,
    candidate: User,
    userPreferences: UserPreference | null,
    candidatePreferences?: UserPreference | null
  ): { score: number; details: any } {
    const userVector = this.createUserVector(user, userPreferences || undefined);
    const candidateVector = this.createUserVector(candidate, candidatePreferences || undefined);

    // Cosine similarity for numerical features
    const cosineSim = this.calculateCosineSimilarity(userVector, candidateVector);
    
    // Jaccard similarity for categorical features (bidirectional with both users' preferences)
    const jaccardSim = this.calculateJaccardSimilarity(user, candidate, userPreferences || undefined, candidatePreferences || undefined);
    
    // TF-IDF similarity for textual content (bio, profession)
    const tfidfSim = this.calculateTFIDFSimilarity(user, candidate);
    
    // Preference alignment score (user's preferences vs candidate)
    const preferenceScore = this.calculatePreferenceAlignment(candidate, userPreferences);

    // Weighted combination of similarity scores
    const finalScore = (
      cosineSim * 0.3 +
      jaccardSim * 0.25 +
      tfidfSim * 0.2 +
      preferenceScore * 0.25
    );

    return {
      score: Math.min(finalScore, 1.0),
      details: {
        cosine: cosineSim,
        jaccard: jaccardSim,
        tfidf: tfidfSim,
        preference: preferenceScore
      }
    };
  }

  /**
   * Matrix Factorization using simplified SVD approach
   */
  async calculateMatrixFactorizationScore(
    userId: number,
    candidateId: number,
    interactionMatrix: InteractionMatrix
  ): Promise<number> {
    try {
      // Find user and candidate indices in matrix
      const userIndex = interactionMatrix.userIds.indexOf(userId);
      const candidateIndex = interactionMatrix.userIds.indexOf(candidateId);

      if (userIndex === -1 || candidateIndex === -1) {
        return 0.5; // Neutral score for new users
      }

      // Simplified matrix factorization using user similarity
      const userInteractions = interactionMatrix.interactions[userIndex];
      const candidateProfile = interactionMatrix.profileVectors.get(candidateId);

      if (!candidateProfile) return 0.5;

      // Calculate predicted rating using collaborative filtering
      const similarUsers = this.findSimilarUsersMatrix(userId, interactionMatrix);
      let weightedSum = 0;
      let totalWeight = 0;

      for (const { userId: simUserId, similarity } of similarUsers) {
        const simUserIndex = interactionMatrix.userIds.indexOf(simUserId);
        if (simUserIndex !== -1) {
          const simUserInteraction = interactionMatrix.interactions[simUserIndex][candidateIndex];
          if (simUserInteraction > 0) {
            weightedSum += similarity * simUserInteraction;
            totalWeight += Math.abs(similarity);
          }
        }
      }

      return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1.0) : 0.5;

    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error:', error);
      return 0.5;
    }
  }

  /**
   * Advanced context scoring with reciprocity analysis
   */
  calculateAdvancedContextScore(
    candidate: User,
    context: any,
    reciprocityData: { responseRate: number; averageResponseTime: number }
  ): { score: number; details: any } {
    let score = 0.5; // Base score
    const details: any = {};

    // Recent activity scoring (exponential decay)
    if (candidate.lastActive) {
      const hoursSinceActive = (context.currentTime.getTime() - candidate.lastActive.getTime()) / (1000 * 60 * 60);
      const activityScore = Math.exp(-hoursSinceActive / 24); // 24-hour half-life
      score += activityScore * 0.3;
      details.activity = activityScore;
    }

    // Online status boost
    if (candidate.isOnline) {
      score += 0.2;
      details.online = true;
    }

    // Profile completeness with diminishing returns
    const completeness = this.calculateProfileCompleteness(candidate);
    const completenessBonus = Math.sqrt(completeness) * 0.25;
    score += completenessBonus;
    details.completeness = completeness;

    // Reciprocity scoring based on historical responsiveness
    const reciprocityScore = this.calculateReciprocityScore(reciprocityData);
    score += reciprocityScore * 0.25;
    details.reciprocity = reciprocityScore;

    return {
      score: Math.min(score, 1.0),
      details
    };
  }

  /**
   * ENHANCED DEMOGRAPHIC DIVERSITY INJECTION & FILTER BUBBLE PREVENTION
   * 
   * Implements all 5 demographic diversity categories:
   * 1. Age range expansion beyond preferences
   * 2. Ethnicity and secondaryTribe variety  
   * 3. Education level diversity
   * 4. Profession category mixing
   * 5. Location geographic diversity
   */
  injectDemographicDiversity(
    rankedCandidates: AdvancedMatchScore[],
    allCandidates: User[],
    currentUser: User,
    userPreferences: UserPreference | null,
    diversityPercentage: number = 0.15
  ): AdvancedMatchScore[] {
    console.log(`[DEMOGRAPHIC-DIVERSITY] 🎯 Starting diversity injection for user ${currentUser.id}`);
    console.log(`[DEMOGRAPHIC-DIVERSITY] Total candidates: ${allCandidates.length}, Top results: ${rankedCandidates.length}`);
    
    const totalResults = rankedCandidates.length;
    const diversityCount = Math.floor(totalResults * diversityPercentage);
    
    if (diversityCount === 0 || allCandidates.length <= rankedCandidates.length) {
      console.log(`[DEMOGRAPHIC-DIVERSITY] ⚠️ Skipping diversity injection (insufficient candidates)`);
      return rankedCandidates;
    }

    // Find candidates not in top rankings
    const topCandidateIds = new Set(rankedCandidates.map(r => r.userId));
    const diversityCandidates = allCandidates.filter(c => !topCandidateIds.has(c.id));
    
    console.log(`[DEMOGRAPHIC-DIVERSITY] Available diversity candidates: ${diversityCandidates.length}`);

    // DEMOGRAPHIC DIVERSITY CATEGORY 1: AGE RANGE EXPANSION
    const ageExpandedCandidates = this.expandAgeRangeDiversity(diversityCandidates, currentUser, userPreferences);
    
    // DEMOGRAPHIC DIVERSITY CATEGORY 2: ETHNICITY & SECONDARY TRIBE VARIETY
    const ethnicityDiverseCandidates = this.injectEthnicityDiversity(diversityCandidates, currentUser);
    
    // DEMOGRAPHIC DIVERSITY CATEGORY 3: EDUCATION LEVEL DIVERSITY
    const educationDiverseCandidates = this.injectEducationDiversity(diversityCandidates, currentUser);
    
    // DEMOGRAPHIC DIVERSITY CATEGORY 4: PROFESSION CATEGORY MIXING
    const professionDiverseCandidates = this.injectProfessionDiversity(diversityCandidates, currentUser);
    
    // DEMOGRAPHIC DIVERSITY CATEGORY 5: GEOGRAPHIC DIVERSITY (already implemented in Context-Aware Re-ranking)
    const geographicDiverseCandidates = this.injectGeographicDiversity(diversityCandidates, currentUser);

    // Combine all diversity candidates with scoring
    const allDiversityCandidates = [
      ...ageExpandedCandidates,
      ...ethnicityDiverseCandidates,
      ...educationDiverseCandidates,
      ...professionDiverseCandidates,
      ...geographicDiverseCandidates
    ];

    // Remove duplicates and score diversity candidates
    const uniqueDiversityCandidates = Array.from(
      new Map(allDiversityCandidates.map(c => [c.id, c])).values()
    ).slice(0, diversityCount * 2);

    console.log(`[DEMOGRAPHIC-DIVERSITY] Selected ${uniqueDiversityCandidates.length} unique diversity candidates`);

    // Create diversity match scores
    const diverseResults: AdvancedMatchScore[] = [];
    
    for (let i = 0; i < Math.min(diversityCount, uniqueDiversityCandidates.length); i++) {
      const candidate = uniqueDiversityCandidates[i];
      const diversityScore = this.calculateDiversityScore(candidate, currentUser);
      
      diverseResults.push({
        userId: candidate.id,
        contentScore: 0.4,
        collaborativeScore: 0.3,
        contextScore: 0.5,
        diversityBonus: diversityScore, // Calculated diversity boost
        reciprocityScore: 0.5,
        finalScore: 0.5 + (diversityScore * 0.3), // Base score + diversity bonus
        algorithmVersion: 'advanced-v1.0-demographic-diversity',
        reasons: ['Demographic diversity', 'Filter bubble prevention', 'Serendipitous match']
      });
    }

    console.log(`[DEMOGRAPHIC-DIVERSITY] ✅ Created ${diverseResults.length} diversity recommendations`);

    // Inject diversity candidates at strategic positions
    const result = [...rankedCandidates];
    const injectionInterval = Math.floor(totalResults / diversityCount);
    
    for (let i = 0; i < diverseResults.length; i++) {
      const insertPosition = (i + 1) * injectionInterval;
      if (insertPosition < result.length) {
        result.splice(insertPosition + i, 0, diverseResults[i]);
      } else {
        result.push(diverseResults[i]);
      }
    }

    console.log(`[DEMOGRAPHIC-DIVERSITY] 🎯 Final results: ${result.length} total matches (${diverseResults.length} diversity injected)`);
    return result;
  }

  /**
   * DEMOGRAPHIC DIVERSITY CATEGORY 1: AGE RANGE EXPANSION
   * Includes users slightly outside age preferences for diversity
   */
  public expandAgeRangeDiversity(candidates: User[], currentUser: User, preferences: UserPreference | null): User[] {
    if (!preferences || !currentUser.dateOfBirth) return [];
    
    const userAge = this.calculateAge(currentUser.dateOfBirth);
    const minAge = preferences.minAge || 18;
    const maxAge = preferences.maxAge || 45;
    
    // Expand age range by 3-5 years for diversity
    const expandedMinAge = Math.max(18, minAge - 4);
    const expandedMaxAge = Math.min(50, maxAge + 4);
    
    const ageDiverseCandidates = candidates.filter(candidate => {
      if (!candidate.dateOfBirth) return false;
      const candidateAge = this.calculateAge(candidate.dateOfBirth);
      
      // Include users in expanded range but outside original preferences
      const inExpandedRange = candidateAge >= expandedMinAge && candidateAge <= expandedMaxAge;
      const outsideOriginalPrefs = candidateAge < minAge || candidateAge > maxAge;
      
      return inExpandedRange && outsideOriginalPrefs;
    });
    
    // FEATURE 4: Apply new user priority boosting to age-diverse candidates
    const boostedCandidates = ageDiverseCandidates
      .map(candidate => ({
        candidate,
        newUserBoost: this.calculateNewUserBoost(candidate)
      }))
      .sort((a, b) => b.newUserBoost - a.newUserBoost)
      .map(item => item.candidate);
    
    console.log(`[AGE-DIVERSITY] Found ${ageDiverseCandidates.length} candidates outside age prefs (${minAge}-${maxAge} → ${expandedMinAge}-${expandedMaxAge}) with new user boosts applied`);
    return boostedCandidates.slice(0, 3);
  }

  /**
   * DEMOGRAPHIC DIVERSITY CATEGORY 2: ETHNICITY & SECONDARY TRIBE VARIETY
   * Introduces ethnic diversity beyond user's typical preferences
   */
  private injectEthnicityDiversity(candidates: User[], currentUser: User): User[] {
    const currentEthnicity = currentUser.ethnicity;
    const currentSecondaryTribe = currentUser.secondaryTribe;
    
    const ethnicityDiverseCandidates = candidates.filter(candidate => {
      // Include users with different ethnic backgrounds for diversity
      const differentEthnicity = candidate.ethnicity && candidate.ethnicity !== currentEthnicity;
      const differentSecondaryTribe = candidate.secondaryTribe && candidate.secondaryTribe !== currentSecondaryTribe;
      
      return differentEthnicity || differentSecondaryTribe;
    });
    
    console.log(`[ETHNICITY-DIVERSITY] Found ${ethnicityDiverseCandidates.length} candidates with different ethnic backgrounds`);
    return ethnicityDiverseCandidates.slice(0, 3);
  }

  /**
   * DEMOGRAPHIC DIVERSITY CATEGORY 3: EDUCATION LEVEL DIVERSITY
   * Mixes different education levels for broader perspectives
   */
  private injectEducationDiversity(candidates: User[], currentUser: User): User[] {
    const currentEducation = currentUser.educationLevel;
    
    const educationDiverseCandidates = candidates.filter(candidate => {
      // Include users with different education levels
      return candidate.educationLevel && candidate.educationLevel !== currentEducation;
    });
    
    console.log(`[EDUCATION-DIVERSITY] Found ${educationDiverseCandidates.length} candidates with different education levels`);
    return educationDiverseCandidates.slice(0, 3);
  }

  /**
   * DEMOGRAPHIC DIVERSITY CATEGORY 4: PROFESSION CATEGORY MIXING
   * Introduces professional diversity across categories
   */
  private injectProfessionDiversity(candidates: User[], currentUser: User): User[] {
    const currentProfession = currentUser.profession;
    const currentCategory = this.categorizeProfession(currentProfession || null);
    
    const professionDiverseCandidates = candidates.filter(candidate => {
      if (!candidate.profession) return false;
      
      const candidateCategory = this.categorizeProfession(candidate.profession || null);
      // Include users from different professional categories
      return candidateCategory !== currentCategory;
    });
    
    console.log(`[PROFESSION-DIVERSITY] Found ${professionDiverseCandidates.length} candidates from different profession categories`);
    return professionDiverseCandidates.slice(0, 3);
  }

  /**
   * DEMOGRAPHIC DIVERSITY CATEGORY 5: GEOGRAPHIC DIVERSITY
   * Introduces location diversity beyond typical preferences
   */
  private injectGeographicDiversity(candidates: User[], currentUser: User): User[] {
    const currentLocation = currentUser.location;
    
    const geographicDiverseCandidates = candidates.filter(candidate => {
      // Include users from different geographic regions
      return candidate.location && candidate.location !== currentLocation;
    });
    
    console.log(`[GEOGRAPHIC-DIVERSITY] Found ${geographicDiverseCandidates.length} candidates from different locations`);
    return geographicDiverseCandidates.slice(0, 3);
  }



  /**
   * Calculate comprehensive diversity score for a candidate
   */
  private calculateDiversityScore(candidate: User, currentUser: User): number {
    let diversityScore = 0;
    let factors = 0;
    
    // Age diversity factor
    if (candidate.dateOfBirth && currentUser.dateOfBirth) {
      const ageGap = Math.abs(this.calculateAge(candidate.dateOfBirth) - this.calculateAge(currentUser.dateOfBirth));
      diversityScore += Math.min(ageGap / 10, 0.3); // Max 0.3 for age diversity
      factors++;
    }
    
    // Ethnicity diversity factor
    if (candidate.ethnicity !== currentUser.ethnicity) {
      diversityScore += 0.25;
      factors++;
    }
    
    // Education diversity factor
    if (candidate.educationLevel !== currentUser.educationLevel) {
      diversityScore += 0.2;
      factors++;
    }
    
    // Profession diversity factor
    const currentProfessionCategory = this.categorizeProfession(currentUser.profession || null);
    const candidateProfessionCategory = this.categorizeProfession(candidate.profession || null);
    if (candidateProfessionCategory !== currentProfessionCategory) {
      diversityScore += 0.2;
      factors++;
    }
    
    // Geographic diversity factor
    if (candidate.location !== currentUser.location) {
      diversityScore += 0.15;
      factors++;
    }
    
    return factors > 0 ? Math.min(diversityScore / factors, 1.0) : 0.3;
  }

  /**
   * Categorize profession for diversity analysis
   */
  /**
   * Enhanced comprehensive profession categorization for global diversity
   * Covers wide range of careers from all walks of life worldwide
   */
  private categorizeProfession(profession: string | null): string {
    if (!profession) return 'Other';
    
    const professionLower = profession.toLowerCase().trim();
    
    // CREATIVE & ARTS - Expanded creative professions
    if (this.matchesProfessionKeywords(professionLower, [
      'author', 'writer', 'journalist', 'blogger', 'copywriter', 'editor', 'poet', 'content creator',
      'artist', 'painter', 'sculptor', 'illustrator', 'graphic designer', 'web designer', 'interior designer', 'fashion designer', 'architect',
      'musician', 'singer', 'composer', 'producer', 'dj', 'sound engineer', 'audio',
      'photographer', 'videographer', 'filmmaker', 'director', 'cinematographer', 'video editor',
      'actor', 'actress', 'performer', 'dancer', 'choreographer', 'theater', 'drama',
      'animator', 'game designer', 'ux designer', 'ui designer', 'creative director', 'influencer'
    ])) {
      return 'Creative & Arts';
    }
    
    // TECHNOLOGY & ENGINEERING - Comprehensive tech fields
    if (this.matchesProfessionKeywords(professionLower, [
      'software engineer', 'developer', 'programmer', 'coder', 'full stack', 'frontend', 'backend',
      'data scientist', 'data analyst', 'machine learning', 'ai engineer', 'data engineer', 'analyst',
      'cybersecurity', 'security analyst', 'network engineer', 'system administrator', 'devops',
      'mobile developer', 'ios developer', 'android developer', 'web developer',
      'engineer', 'mechanical engineer', 'electrical engineer', 'civil engineer', 'chemical engineer',
      'aerospace engineer', 'biomedical engineer', 'environmental engineer', 'industrial engineer',
      'it specialist', 'tech support', 'system analyst', 'database administrator', 'cloud engineer'
    ])) {
      return 'Technology & Engineering';
    }
    
    // HEALTHCARE & MEDICAL - All medical professionals
    if (this.matchesProfessionKeywords(professionLower, [
      'doctor', 'physician', 'surgeon', 'specialist', 'cardiologist', 'neurologist', 'pediatrician',
      'nurse', 'registered nurse', 'nurse practitioner', 'nursing', 'midwife',
      'dentist', 'orthodontist', 'dental hygienist', 'oral surgeon',
      'pharmacist', 'pharmacy technician', 'pharmaceutical',
      'therapist', 'physical therapist', 'occupational therapist', 'speech therapist', 'psychologist', 'psychiatrist',
      'medical technician', 'radiologist', 'lab technician', 'medical assistant',
      'veterinarian', 'vet tech', 'animal doctor', 'veterinary',
      'paramedic', 'emt', 'emergency medical', 'first aid',
      'optometrist', 'chiropractor', 'nutritionist', 'dietitian'
    ])) {
      return 'Healthcare & Medical';
    }
    
    // BUSINESS & FINANCE - All business roles
    if (this.matchesProfessionKeywords(professionLower, [
      'manager', 'director', 'executive', 'ceo', 'cfo', 'coo', 'president', 'vice president',
      'business analyst', 'consultant', 'strategy consultant', 'management consultant',
      'entrepreneur', 'founder', 'startup', 'business owner', 'small business',
      'accountant', 'bookkeeper', 'financial analyst', 'investment banker', 'financial advisor',
      'banker', 'loan officer', 'credit analyst', 'insurance agent', 'real estate agent',
      'sales', 'sales representative', 'account manager', 'business development',
      'marketing', 'digital marketing', 'marketing manager', 'brand manager', 'social media manager',
      'hr', 'human resources', 'recruiter', 'talent acquisition', 'hr manager',
      'project manager', 'product manager', 'operations manager', 'general manager'
    ])) {
      return 'Business & Finance';
    }
    
    // EDUCATION & RESEARCH - All educational roles
    if (this.matchesProfessionKeywords(professionLower, [
      'teacher', 'educator', 'instructor', 'tutor', 'professor', 'lecturer',
      'principal', 'school administrator', 'academic', 'researcher',
      'teaching assistant', 'substitute teacher', 'kindergarten teacher', 'elementary teacher',
      'high school teacher', 'college professor', 'university professor',
      'librarian', 'school counselor', 'education coordinator',
      'scientist', 'research scientist', 'lab researcher', 'research assistant',
      'curriculum developer', 'instructional designer', 'educational consultant'
    ])) {
      return 'Education & Research';
    }
    
    // TRADES & SKILLED LABOR - Manual and skilled trades
    if (this.matchesProfessionKeywords(professionLower, [
      'carpenter', 'electrician', 'plumber', 'hvac technician', 'mechanic', 'auto mechanic',
      'construction worker', 'builder', 'contractor', 'roofer', 'painter', 'welder',
      'machinist', 'technician', 'maintenance', 'repair technician', 'handyman',
      'truck driver', 'delivery driver', 'courier', 'logistics', 'warehouse worker',
      'factory worker', 'manufacturing', 'assembly line', 'production worker',
      'chef', 'cook', 'baker', 'culinary', 'restaurant', 'food service',
      'barber', 'hairstylist', 'beautician', 'cosmetologist', 'nail technician'
    ])) {
      return 'Trades & Skilled Labor';
    }
    
    // SPORTS & FITNESS - Athletic and fitness professionals
    if (this.matchesProfessionKeywords(professionLower, [
      'athlete', 'soccer player', 'football player', 'basketball player', 'tennis player',
      'baseball player', 'rugby player', 'cricket player', 'volleyball player',
      'coach', 'sports coach', 'fitness coach', 'personal trainer', 'gym instructor',
      'sports analyst', 'sports journalist', 'sports photographer', 'sports medicine',
      'referee', 'umpire', 'sports official', 'athletic trainer',
      'yoga instructor', 'pilates instructor', 'dance instructor', 'martial arts instructor'
    ])) {
      return 'Sports & Fitness';
    }
    
    // LAW & PUBLIC SERVICE - Legal and government roles
    if (this.matchesProfessionKeywords(professionLower, [
      'lawyer', 'attorney', 'legal counsel', 'paralegal', 'legal assistant', 'judge',
      'police officer', 'detective', 'security guard', 'law enforcement',
      'firefighter', 'paramedic', 'emergency services', 'first responder',
      'government', 'civil servant', 'public administrator', 'diplomat', 'politician',
      'social worker', 'case worker', 'community organizer', 'nonprofit',
      'military', 'soldier', 'navy', 'air force', 'marine', 'veteran'
    ])) {
      return 'Law & Public Service';
    }
    
    // HOSPITALITY & TOURISM - Service industry
    if (this.matchesProfessionKeywords(professionLower, [
      'hotel manager', 'hospitality', 'tourism', 'travel agent', 'tour guide',
      'flight attendant', 'pilot', 'airline', 'cruise', 'resort',
      'restaurant manager', 'waiter', 'waitress', 'server', 'bartender',
      'event planner', 'wedding planner', 'catering'
    ])) {
      return 'Hospitality & Tourism';
    }
    
    // RETAIL & CUSTOMER SERVICE - Retail and service roles
    if (this.matchesProfessionKeywords(professionLower, [
      'retail', 'sales associate', 'cashier', 'store manager', 'customer service',
      'call center', 'support representative', 'shop assistant', 'merchandiser'
    ])) {
      return 'Retail & Customer Service';
    }
    
    return 'Other';
  }

  /**
   * Helper method to match profession keywords efficiently
   */
  private matchesProfessionKeywords(profession: string, keywords: string[]): boolean {
    return keywords.some(keyword => profession.includes(keyword));
  }

  /**
   * Legacy diversity injection method (keeping for backwards compatibility)
   */
  injectDiversity(
    rankedCandidates: AdvancedMatchScore[],
    allCandidates: User[],
    diversityPercentage: number = 0.15
  ): AdvancedMatchScore[] {
    // Fallback to basic diversity injection if demographic diversity data unavailable
    console.log(`[DIVERSITY] Using legacy diversity injection (${diversityPercentage * 100}%)`);
    
    const totalResults = rankedCandidates.length;
    const diversityCount = Math.floor(totalResults * diversityPercentage);
    
    if (diversityCount === 0 || allCandidates.length <= rankedCandidates.length) {
      return rankedCandidates;
    }

    // Find candidates not in top rankings
    const topCandidateIds = new Set(rankedCandidates.map(r => r.userId));
    const diversityCandidates = allCandidates
      .filter(c => !topCandidateIds.has(c.id))
      .slice(0, diversityCount * 2);

    // Select diverse candidates using basic criteria
    const diverseResults: AdvancedMatchScore[] = [];
    
    for (let i = 0; i < Math.min(diversityCount, diversityCandidates.length); i++) {
      const candidate = diversityCandidates[i];
      diverseResults.push({
        userId: candidate.id,
        contentScore: 0.4,
        collaborativeScore: 0.3,
        contextScore: 0.5,
        diversityBonus: 0.3,
        reciprocityScore: 0.5,
        finalScore: 0.6,
        algorithmVersion: 'advanced-v1.0-basic-diversity',
        reasons: ['Basic diversity', 'Serendipitous match']
      });
    }

    // Inject diversity candidates at strategic positions
    const result = [...rankedCandidates];
    const injectionInterval = Math.floor(totalResults / diversityCount);
    
    for (let i = 0; i < diverseResults.length; i++) {
      const insertPosition = (i + 1) * injectionInterval;
      if (insertPosition < result.length) {
        result.splice(insertPosition + i, 0, diverseResults[i]);
      } else {
        result.push(diverseResults[i]);
      }
    }

    return result;
  }

  /**
   * Cosine similarity calculation for user vectors
   */
  private calculateCosineSimilarity(vector1: UserVector, vector2: UserVector): number {
    try {
      // Combine all numerical features into single vectors
      const v1 = [
        vector1.ageNormalized,
        vector1.heightCompatibility || 0.5, // NEW: Height compatibility
        vector1.profileCompleteness,
        vector1.activityScore,
        ...vector1.locationVector,
        ...vector1.interestVector
      ];

      const v2 = [
        vector2.ageNormalized,
        vector2.heightCompatibility || 0.5, // NEW: Height compatibility
        vector2.profileCompleteness,
        vector2.activityScore,
        ...vector2.locationVector,
        ...vector2.interestVector
      ];

      // Ensure vectors are same length
      const maxLength = Math.max(v1.length, v2.length);
      while (v1.length < maxLength) v1.push(0);
      while (v2.length < maxLength) v2.push(0);

      // Calculate cosine similarity
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < maxLength; i++) {
        dotProduct += v1[i] * v2[i];
        norm1 += v1[i] * v1[i];
        norm2 += v2[i] * v2[i];
      }

      const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
      return denominator === 0 ? 0 : dotProduct / denominator;

    } catch (error) {
      console.error('[COSINE-SIMILARITY] Error:', error);
      return 0;
    }
  }

  /**
   * Enhanced TF-IDF similarity for comprehensive textual content analysis
   * Includes: bio, profession, interests (parsed), relationshipGoal, education fields
   */
  private calculateTFIDFSimilarity(user1: User, user2: User): number {
    try {
      console.log(`[TFIDF-SIMILARITY] Analyzing textual content for user ${user1.id} vs user ${user2.id}`);
      
      // Enhanced textual content combination with all available fields
      const text1 = this.createEnhancedTextualContent(user1);
      const text2 = this.createEnhancedTextualContent(user2);

      console.log(`[TFIDF-SIMILARITY] User ${user1.id} content length: ${text1.length} characters`);
      console.log(`[TFIDF-SIMILARITY] User ${user2.id} content length: ${text2.length} characters`);

      if (!text1.trim() || !text2.trim()) {
        console.log('[TFIDF-SIMILARITY] Empty text content, returning 0');
        return 0;
      }

      // Advanced tokenization with preprocessing
      const tokens1 = this.tokenize(text1);
      const tokens2 = this.tokenize(text2);

      console.log(`[TFIDF-SIMILARITY] User ${user1.id} tokens: ${tokens1.length}, User ${user2.id} tokens: ${tokens2.length}`);

      // Calculate TF-IDF vectors with enhanced corpus analysis
      const allTokens = new Set([...tokens1, ...tokens2]);
      const vector1: number[] = [];
      const vector2: number[] = [];

      let commonTokens = 0;
      for (const token of allTokens) {
        const tf1 = this.calculateTF(token, tokens1);
        const tf2 = this.calculateTF(token, tokens2);
        
        // Enhanced IDF calculation with better corpus modeling
        const documentsWithTerm = (tf1 > 0 ? 1 : 0) + (tf2 > 0 ? 1 : 0);
        const idf = Math.log(2 / (1 + documentsWithTerm));
        
        vector1.push(tf1 * idf);
        vector2.push(tf2 * idf);
        
        if (tf1 > 0 && tf2 > 0) commonTokens++;
      }

      // Calculate cosine similarity of TF-IDF vectors
      const similarity = this.calculateVectorCosineSimilarity(vector1, vector2);
      
      console.log(`[TFIDF-SIMILARITY] Common tokens: ${commonTokens}/${allTokens.size}, Final similarity: ${similarity.toFixed(4)}`);
      return similarity;

    } catch (error) {
      console.error('[TFIDF-SIMILARITY] Error:', error);
      return 0;
    }
  }

  /**
   * Create enhanced textual content combining all available fields
   */
  private createEnhancedTextualContent(user: User): string {
    const contentParts: string[] = [];
    
    // Primary biographical content
    if (user.bio?.trim()) {
      contentParts.push(user.bio.trim());
    }
    
    // Professional information
    if (user.profession?.trim()) {
      contentParts.push(user.profession.trim());
    }
    
    // Parse and include interests properly
    if (user.interests?.trim()) {
      try {
        // Try to parse as JSON array first
        const interestsArray = JSON.parse(user.interests);
        if (Array.isArray(interestsArray)) {
          contentParts.push(interestsArray.join(' '));
        } else {
          // Fallback to raw string if not an array
          contentParts.push(user.interests.trim());
        }
      } catch (e) {
        // If JSON parsing fails, treat as plain text
        contentParts.push(user.interests.trim());
      }
    }
    
    // Relationship goals and intentions
    if (user.relationshipGoal?.trim()) {
      contentParts.push(user.relationshipGoal.trim());
    }
    
    // Educational background
    if (user.highSchool?.trim()) {
      contentParts.push(user.highSchool.trim());
    }
    
    if (user.collegeUniversity?.trim()) {
      contentParts.push(user.collegeUniversity.trim());
    }
    
    // Combine all content with space separation and normalize
    const combinedContent = contentParts.join(' ').toLowerCase();
    
    console.log(`[TFIDF-CONTENT] User ${user.id} enhanced content: "${combinedContent.substring(0, 100)}${combinedContent.length > 100 ? '...' : ''}"`);
    
    return combinedContent;
  }

  /**
   * Create comprehensive user vector for mathematical operations
   */
  private createUserVector(user: User, preferences?: UserPreference): UserVector {
    // Normalize age (assuming range 18-80)
    const ageNormalized = user.dateOfBirth 
      ? Math.min((this.calculateAge(user.dateOfBirth) - 18) / 62, 1)
      : 0.5;

    // Calculate height compatibility score
    const heightCompatibility = this.calculateHeightCompatibility(user, preferences);

    // Location vector (simplified - would be more complex with geolocation)
    const locationVector = this.createLocationVector(user.location);

    // Interest vector using one-hot encoding
    const interestVector = this.createInterestVector(user.interests);

    // Religion vector
    const religionVector = this.createCategoricalVector(user.religion, ['Christian', 'Muslim', 'Traditional', 'Other']);

    // Ethnicity vector  
    const ethnicityVector = this.createCategoricalVector(user.ethnicity, ['Akan', 'Ewe', 'Ga', 'Dagbani', 'Other']);

    return {
      userId: user.id,
      ageNormalized,
      heightCompatibility, // NEW: Added height compatibility score
      locationVector,
      interestVector,
      religionVector,
      ethnicityVector,
      profileCompleteness: this.calculateProfileCompleteness(user),
      activityScore: user.isOnline ? 1.0 : (user.lastActive ? 0.5 : 0.1)
    };
  }

  /**
   * Helper methods
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  private calculateProfileCompleteness(user: User): number {
    const fields = [
      user.bio, user.profession, user.interests, 
      user.photoUrl, user.religion, user.ethnicity,
      user.dateOfBirth, user.relationshipGoal
    ];
    const completedFields = fields.filter(field => field && field.toString().trim().length > 0);
    return completedFields.length / fields.length;
  }

  /**
   * Calculate height compatibility score between user and preferences
   */
  private calculateHeightCompatibility(candidate: User, preferences?: UserPreference): number {
    // If no preferences or no height data, return neutral score
    if (!preferences || !candidate.height) return 0.5;
    
    const { minHeightPreference, maxHeightPreference } = preferences;
    
    // If no height preferences set, return neutral
    if (!minHeightPreference && !maxHeightPreference) return 0.5;
    
    const candidateHeight = candidate.height;
    
    // Perfect match within range
    if (minHeightPreference && maxHeightPreference) {
      if (candidateHeight >= minHeightPreference && candidateHeight <= maxHeightPreference) {
        return 1.0; // Perfect match
      }
      // Calculate distance penalty for outside range
      const minDistance = Math.max(0, minHeightPreference - candidateHeight);
      const maxDistance = Math.max(0, candidateHeight - maxHeightPreference);
      const totalDistance = minDistance + maxDistance;
      
      // Penalty decreases compatibility (max penalty of 20cm = 0 compatibility)
      return Math.max(0, 1 - (totalDistance / 20));
    }
    
    // Only minimum height preference
    if (minHeightPreference && !maxHeightPreference) {
      return candidateHeight >= minHeightPreference ? 1.0 : Math.max(0, 1 - (minHeightPreference - candidateHeight) / 20);
    }
    
    // Only maximum height preference  
    if (!minHeightPreference && maxHeightPreference) {
      return candidateHeight <= maxHeightPreference ? 1.0 : Math.max(0, 1 - (candidateHeight - maxHeightPreference) / 20);
    }
    
    return 0.5; // Fallback
  }

  private createLocationVector(location: string | null): number[] {
    const locations = ['Ghana', 'Diaspora', 'Other'];
    return locations.map(loc => location === loc ? 1 : 0);
  }

  private createInterestVector(interests: string | null): number[] {
    if (!interests) return new Array(20).fill(0); // Default vector size

    try {
      const userInterests = JSON.parse(interests);
      const commonInterests = [
        'music', 'sports', 'travel', 'food', 'movies', 'reading',
        'fitness', 'art', 'technology', 'cooking', 'dancing', 'gaming',
        'fashion', 'photography', 'hiking', 'swimming', 'business', 'education',
        'politics', 'religion'
      ];
      
      return commonInterests.map(interest => 
        userInterests.some((ui: string) => ui.toLowerCase().includes(interest)) ? 1 : 0
      );
    } catch {
      return new Array(20).fill(0);
    }
  }

  private createCategoricalVector(category: string | null, categories: string[]): number[] {
    return categories.map(cat => category === cat ? 1 : 0);
  }

  /**
   * COMPREHENSIVE JACCARD SIMILARITY ALGORITHM FOR CATEGORICAL FEATURES
   * Implements all 8 categorical features identified in the technical audit:
   * 1. ethnicity + secondaryTribe vs ethnicityPreference
   * 2. religion vs religionPreference  
   * 3. bodyType vs bodyTypePreference
   * 4. educationLevel vs educationLevelPreference
   * 5. hasChildren vs hasChildrenPreference
   * 6. wantsChildren vs wantsChildrenPreference
   * 7. relationshipGoal vs relationshipGoalPreference (text-based)
   * 8. location/countryOfOrigin vs locationPreference/poolCountry
   */
  private calculateJaccardSimilarity(user1: User, user2: User, user1Preferences?: UserPreference, user2Preferences?: UserPreference): number {
    try {
      console.log(`[JACCARD-SIMILARITY] Analyzing user ${user1.id} vs user ${user2.id}`);
      
      const features: Array<{ name: string; score: number; weight: number }> = [];
      
      // FEATURE 1: Ethnicity + Secondary Tribe vs Ethnicity Preference
      const ethnicityScore = this.calculateEthnicityJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'ethnicity', score: ethnicityScore, weight: 0.15 });
      
      // FEATURE 2: Religion vs Religion Preference
      const religionScore = this.calculateReligionJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'religion', score: religionScore, weight: 0.20 });
      
      // FEATURE 3: Body Type vs Body Type Preference
      const bodyTypeScore = this.calculateBodyTypeJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'bodyType', score: bodyTypeScore, weight: 0.10 });
      
      // FEATURE 4: Education Level vs Education Level Preference
      const educationScore = this.calculateEducationJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'education', score: educationScore, weight: 0.15 });
      
      // FEATURE 5: Has Children vs Has Children Preference
      const hasChildrenScore = this.calculateChildrenJaccard(user1, user2, 'has', user1Preferences, user2Preferences);
      features.push({ name: 'hasChildren', score: hasChildrenScore, weight: 0.15 });
      
      // FEATURE 6: Wants Children vs Wants Children Preference
      const wantsChildrenScore = this.calculateChildrenJaccard(user1, user2, 'wants', user1Preferences, user2Preferences);
      features.push({ name: 'wantsChildren', score: wantsChildrenScore, weight: 0.15 });
      
      // FEATURE 7: Relationship Goal vs Relationship Goal Preference (text-based)
      const relationshipGoalScore = this.calculateRelationshipGoalJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'relationshipGoal', score: relationshipGoalScore, weight: 0.10 });
      
      // FEATURE 8: Location/Country of Origin vs Location/Pool Country Preference
      const locationScore = this.calculateLocationJaccard(user1, user2, user1Preferences, user2Preferences);
      features.push({ name: 'location', score: locationScore, weight: 0.10 });
      
      // Calculate weighted average
      const totalWeight = features.reduce((sum, f) => sum + f.weight, 0);
      const weightedSum = features.reduce((sum, f) => sum + (f.score * f.weight), 0);
      const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
      
      console.log(`[JACCARD-SIMILARITY] Final score: ${finalScore.toFixed(4)}`);
      features.forEach(f => console.log(`  ${f.name}: ${f.score.toFixed(3)} (weight: ${f.weight})`));
      
      return Math.min(Math.max(finalScore, 0), 1);
      
    } catch (error) {
      console.error('[JACCARD-SIMILARITY] Error:', error);
      return 0.5; // Neutral score on error
    }
  }

  /**
   * FEATURE 1: Ethnicity + Secondary Tribe Jaccard Similarity
   */
  private calculateEthnicityJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      // Get user ethnic identities
      const user1Ethnicities = new Set<string>();
      if (user1.ethnicity) user1Ethnicities.add(user1.ethnicity);
      if (user1.secondaryTribe) user1Ethnicities.add(user1.secondaryTribe);
      
      const user2Ethnicities = new Set<string>();
      if (user2.ethnicity) user2Ethnicities.add(user2.ethnicity);
      if (user2.secondaryTribe) user2Ethnicities.add(user2.secondaryTribe);
      
      // Get ethnicity preferences
      let user1EthnicityPrefs = new Set<string>();
      let user2EthnicityPrefs = new Set<string>();
      
      try {
        if (user1Prefs?.ethnicityPreference) {
          const prefs = JSON.parse(user1Prefs.ethnicityPreference);
          user1EthnicityPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
        if (user2Prefs?.ethnicityPreference) {
          const prefs = JSON.parse(user2Prefs.ethnicityPreference);
          user2EthnicityPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
      } catch (e) {
        console.log('[JACCARD-ETHNICITY] JSON parse error for preferences');
      }
      
      // If no user data, return neutral score
      if (user1Ethnicities.size === 0 && user2Ethnicities.size === 0) {
        return 0.5;
      }
      
      // Calculate bidirectional compatibility
      let score1 = 0.5; // user1's ethnicity matching user2's preferences
      let score2 = 0.5; // user2's ethnicity matching user1's preferences
      
      if (user2EthnicityPrefs.size > 0 && user1Ethnicities.size > 0) {
        const intersection1 = [...user1Ethnicities].filter(e => user2EthnicityPrefs.has(e));
        score1 = intersection1.length > 0 ? 1.0 : 0.0;
      }
      
      if (user1EthnicityPrefs.size > 0 && user2Ethnicities.size > 0) {
        const intersection2 = [...user2Ethnicities].filter(e => user1EthnicityPrefs.has(e));
        score2 = intersection2.length > 0 ? 1.0 : 0.0;
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[JACCARD-ETHNICITY] Error:', error);
      return 0.5;
    }
  }

  /**
   * FEATURE 2: Religion Jaccard Similarity
   */
  private calculateReligionJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      const user1Religion = user1.religion;
      const user2Religion = user2.religion;
      
      if (!user1Religion || !user2Religion) return 0.5;
      
      let user1ReligionPrefs = new Set<string>();
      let user2ReligionPrefs = new Set<string>();
      
      try {
        if (user1Prefs?.religionPreference) {
          const prefs = JSON.parse(user1Prefs.religionPreference);
          user1ReligionPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
        if (user2Prefs?.religionPreference) {
          const prefs = JSON.parse(user2Prefs.religionPreference);
          user2ReligionPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
      } catch (e) {
        console.log('[JACCARD-RELIGION] JSON parse error for preferences');
      }
      
      // Calculate bidirectional compatibility
      let score1 = 0.5;
      let score2 = 0.5;
      
      if (user2ReligionPrefs.size > 0) {
        score1 = user2ReligionPrefs.has(user1Religion) ? 1.0 : 0.0;
      }
      
      if (user1ReligionPrefs.size > 0) {
        score2 = user1ReligionPrefs.has(user2Religion) ? 1.0 : 0.0;
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[JACCARD-RELIGION] Error:', error);
      return 0.5;
    }
  }

  /**
   * FEATURE 3: Body Type Jaccard Similarity
   */
  private calculateBodyTypeJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      const user1BodyType = user1.bodyType;
      const user2BodyType = user2.bodyType;
      
      if (!user1BodyType || !user2BodyType) return 0.5;
      
      let user1BodyTypePrefs = new Set<string>();
      let user2BodyTypePrefs = new Set<string>();
      
      try {
        if (user1Prefs?.bodyTypePreference) {
          const prefs = JSON.parse(user1Prefs.bodyTypePreference);
          user1BodyTypePrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
        if (user2Prefs?.bodyTypePreference) {
          const prefs = JSON.parse(user2Prefs.bodyTypePreference);
          user2BodyTypePrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
      } catch (e) {
        console.log('[JACCARD-BODYTYPE] JSON parse error for preferences');
      }
      
      // Calculate bidirectional compatibility
      let score1 = 0.5;
      let score2 = 0.5;
      
      if (user2BodyTypePrefs.size > 0) {
        score1 = user2BodyTypePrefs.has(user1BodyType) ? 1.0 : 0.0;
      }
      
      if (user1BodyTypePrefs.size > 0) {
        score2 = user1BodyTypePrefs.has(user2BodyType) ? 1.0 : 0.0;
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[JACCARD-BODYTYPE] Error:', error);
      return 0.5;
    }
  }

  /**
   * FEATURE 4: Education Level Jaccard Similarity
   */
  private calculateEducationJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      const user1Education = user1.educationLevel;
      const user2Education = user2.educationLevel;
      
      if (!user1Education || !user2Education) return 0.5;
      
      let user1EducationPrefs = new Set<string>();
      let user2EducationPrefs = new Set<string>();
      
      try {
        if (user1Prefs?.educationLevelPreference) {
          const prefs = JSON.parse(user1Prefs.educationLevelPreference);
          user1EducationPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
        if (user2Prefs?.educationLevelPreference) {
          const prefs = JSON.parse(user2Prefs.educationLevelPreference);
          user2EducationPrefs = new Set(Array.isArray(prefs) ? prefs : []);
        }
      } catch (e) {
        console.log('[JACCARD-EDUCATION] JSON parse error for preferences');
      }
      
      // Calculate bidirectional compatibility
      let score1 = 0.5;
      let score2 = 0.5;
      
      if (user2EducationPrefs.size > 0) {
        score1 = user2EducationPrefs.has(user1Education) ? 1.0 : 0.0;
      }
      
      if (user1EducationPrefs.size > 0) {
        score2 = user1EducationPrefs.has(user2Education) ? 1.0 : 0.0;
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[JACCARD-EDUCATION] Error:', error);
      return 0.5;
    }
  }

  /**
   * FEATURE 5 & 6: Children Jaccard Similarity (has/wants)
   */
  private calculateChildrenJaccard(user1: User, user2: User, type: 'has' | 'wants', user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      const user1Children = type === 'has' ? user1.hasChildren : user1.wantsChildren;
      const user2Children = type === 'has' ? user2.hasChildren : user2.wantsChildren;
      
      if (!user1Children || !user2Children) return 0.5;
      
      const user1ChildrenPref = type === 'has' ? user1Prefs?.hasChildrenPreference : user1Prefs?.wantsChildrenPreference;
      const user2ChildrenPref = type === 'has' ? user2Prefs?.hasChildrenPreference : user2Prefs?.wantsChildrenPreference;
      
      // Convert boolean preferences to string format
      const convertPref = (pref: any): string | null => {
        if (pref === 'true' || pref === true) return 'yes';
        if (pref === 'false' || pref === false) return 'no';
        if (pref === 'any') return 'any';
        return null;
      };
      
      const user1PrefConverted = convertPref(user1ChildrenPref);
      const user2PrefConverted = convertPref(user2ChildrenPref);
      
      // Calculate bidirectional compatibility
      let score1 = 0.5;
      let score2 = 0.5;
      
      if (user2PrefConverted) {
        if (user2PrefConverted === 'any') {
          score1 = 1.0;
        } else {
          score1 = (user1Children === user2PrefConverted) ? 1.0 : 0.0;
        }
      }
      
      if (user1PrefConverted) {
        if (user1PrefConverted === 'any') {
          score2 = 1.0;
        } else {
          score2 = (user2Children === user1PrefConverted) ? 1.0 : 0.0;
        }
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error(`[JACCARD-CHILDREN-${type.toUpperCase()}] Error:`, error);
      return 0.5;
    }
  }

  /**
   * FEATURE 7: Relationship Goal Jaccard Similarity (text-based)
   */
  private calculateRelationshipGoalJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      const user1Goal = user1.relationshipGoal;
      const user2Goal = user2.relationshipGoal;
      
      const user1GoalPref = user1Prefs?.relationshipGoalPreference;
      const user2GoalPref = user2Prefs?.relationshipGoalPreference;
      
      if (!user1Goal || !user2Goal) return 0.5;
      
      // Tokenize for semantic similarity
      const tokenize = (text: string): Set<string> => {
        return new Set(text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(token => token.length > 2));
      };
      
      const user1GoalTokens = tokenize(user1Goal);
      const user2GoalTokens = tokenize(user2Goal);
      
      let user1PrefTokens = new Set<string>();
      let user2PrefTokens = new Set<string>();
      
      if (user1GoalPref) user1PrefTokens = tokenize(user1GoalPref);
      if (user2GoalPref) user2PrefTokens = tokenize(user2GoalPref);
      
      // Calculate semantic similarity scores
      let score1 = 0.5;
      let score2 = 0.5;
      
      if (user2PrefTokens.size > 0) {
        const intersection1 = [...user1GoalTokens].filter(token => user2PrefTokens.has(token));
        const union1 = new Set([...user1GoalTokens, ...user2PrefTokens]);
        score1 = union1.size > 0 ? intersection1.length / union1.size : 0;
      }
      
      if (user1PrefTokens.size > 0) {
        const intersection2 = [...user2GoalTokens].filter(token => user1PrefTokens.has(token));
        const union2 = new Set([...user2GoalTokens, ...user1PrefTokens]);
        score2 = union2.size > 0 ? intersection2.length / union2.size : 0;
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[JACCARD-RELATIONSHIP-GOAL] Error:', error);
      return 0.5;
    }
  }

  /**
   * FEATURE 8: Enhanced Location/Country of Origin Cultural Alignment
   * Now includes comprehensive cultural distance calculations and country-of-origin similarity
   */
  private calculateLocationJaccard(user1: User, user2: User, user1Prefs?: UserPreference, user2Prefs?: UserPreference): number {
    try {
      console.log(`[CULTURAL-ALIGNMENT] Analyzing cultural compatibility for user ${user1.id} vs user ${user2.id}`);
      
      // Extract location information with enhanced country detection
      const extractCountry = (location: string): string => {
        const locationLower = location.toLowerCase();
        if (locationLower.includes('usa') || locationLower.includes('united states') || locationLower.includes('america')) return 'USA';
        if (locationLower.includes('spain')) return 'Spain';
        if (locationLower.includes('ghana')) return 'Ghana';
        if (locationLower.includes('germany')) return 'Germany';
        if (locationLower.includes('nigeria')) return 'Nigeria';
        if (locationLower.includes('uk') || locationLower.includes('united kingdom') || locationLower.includes('england')) return 'UK';
        if (locationLower.includes('canada')) return 'Canada';
        if (locationLower.includes('france')) return 'France';
        if (locationLower.includes('italy')) return 'Italy';
        if (locationLower.includes('netherlands')) return 'Netherlands';
        return location;
      };
      
      const user1Location = user1.location ? extractCountry(user1.location) : null;
      const user2Location = user2.location ? extractCountry(user2.location) : null;
      
      const user1Country = user1.countryOfOrigin;
      const user2Country = user2.countryOfOrigin;
      const user1SecondaryCountry = user1.secondaryCountryOfOrigin;
      const user2SecondaryCountry = user2.secondaryCountryOfOrigin;
      
      // Get location preferences
      const user1PoolCountry = user1Prefs?.poolCountry;
      const user2PoolCountry = user2Prefs?.poolCountry;
      
      console.log(`[CULTURAL-ALIGNMENT] User ${user1.id}: Location=${user1Location}, Origin=${user1Country}, Secondary=${user1SecondaryCountry}, PoolPref=${user1PoolCountry}`);
      console.log(`[CULTURAL-ALIGNMENT] User ${user2.id}: Location=${user2Location}, Origin=${user2Country}, Secondary=${user2SecondaryCountry}, PoolPref=${user2PoolCountry}`);
      
      // Create comprehensive cultural identity sets for each user
      const user1CulturalIdentities = new Set<string>();
      if (user1Location) user1CulturalIdentities.add(user1Location);
      if (user1Country) user1CulturalIdentities.add(user1Country);
      if (user1SecondaryCountry) user1CulturalIdentities.add(user1SecondaryCountry);
      
      const user2CulturalIdentities = new Set<string>();
      if (user2Location) user2CulturalIdentities.add(user2Location);
      if (user2Country) user2CulturalIdentities.add(user2Country);
      if (user2SecondaryCountry) user2CulturalIdentities.add(user2SecondaryCountry);
      
      if (user1CulturalIdentities.size === 0 || user2CulturalIdentities.size === 0) {
        console.log('[CULTURAL-ALIGNMENT] Insufficient cultural data, returning neutral score');
        return 0.5;
      }
      
      // ENHANCED CULTURAL SCORING SYSTEM
      let totalScore = 0;
      let componentCount = 0;
      
      // COMPONENT 1: Geographic Location Preferences (40% weight)
      const locationScore = this.calculateLocationPreferenceScore(user1CulturalIdentities, user2CulturalIdentities, user1PoolCountry || undefined, user2PoolCountry || undefined);
      totalScore += locationScore * 0.4;
      componentCount++;
      console.log(`[CULTURAL-ALIGNMENT] Location preference score: ${locationScore.toFixed(3)} (weight: 0.4)`);
      
      // COMPONENT 2: Country of Origin Similarity (35% weight)
      const originScore = this.calculateCountryOfOriginScore(user1Country || undefined, user2Country || undefined, user1SecondaryCountry || undefined, user2SecondaryCountry || undefined);
      totalScore += originScore * 0.35;
      componentCount++;
      console.log(`[CULTURAL-ALIGNMENT] Country of origin score: ${originScore.toFixed(3)} (weight: 0.35)`);
      
      // COMPONENT 3: Cultural Distance Analysis (25% weight)
      const culturalDistanceScore = this.calculateCulturalDistance(user1CulturalIdentities, user2CulturalIdentities);
      totalScore += culturalDistanceScore * 0.25;
      componentCount++;
      console.log(`[CULTURAL-ALIGNMENT] Cultural distance score: ${culturalDistanceScore.toFixed(3)} (weight: 0.25)`);
      
      const finalScore = componentCount > 0 ? totalScore : 0.5;
      console.log(`[CULTURAL-ALIGNMENT] Final cultural alignment score: ${finalScore.toFixed(3)}`);
      
      return Math.min(Math.max(finalScore, 0), 1);
      
    } catch (error) {
      console.error('[CULTURAL-ALIGNMENT] Error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate location preference scoring based on pool country preferences
   */
  private calculateLocationPreferenceScore(user1Identities: Set<string>, user2Identities: Set<string>, user1PoolCountry?: string, user2PoolCountry?: string): number {
    try {
      let score1 = 0.5;
      let score2 = 0.5;
      
      // Check if user1's identities match user2's pool preferences
      if (user2PoolCountry) {
        if (user2PoolCountry === 'ANYWHERE') {
          score1 = 1.0;
        } else {
          score1 = [...user1Identities].some(identity => 
            identity.toLowerCase().includes(user2PoolCountry.toLowerCase()) ||
            user2PoolCountry.toLowerCase().includes(identity.toLowerCase())
          ) ? 1.0 : 0.3; // Partial score for geographic mismatch
        }
      }
      
      // Check if user2's identities match user1's pool preferences
      if (user1PoolCountry) {
        if (user1PoolCountry === 'ANYWHERE') {
          score2 = 1.0;
        } else {
          score2 = [...user2Identities].some(identity => 
            identity.toLowerCase().includes(user1PoolCountry.toLowerCase()) ||
            user1PoolCountry.toLowerCase().includes(identity.toLowerCase())
          ) ? 1.0 : 0.3; // Partial score for geographic mismatch
        }
      }
      
      return (score1 + score2) / 2;
      
    } catch (error) {
      console.error('[LOCATION-PREFERENCE] Error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate country of origin similarity with multi-cultural background bonus
   */
  private calculateCountryOfOriginScore(user1Country?: string, user2Country?: string, user1SecondaryCountry?: string, user2SecondaryCountry?: string): number {
    try {
      if (!user1Country && !user2Country) return 0.5;
      if (!user1Country || !user2Country) return 0.3; // Partial score for missing data
      
      // Create origin sets for comprehensive matching
      const user1Origins = new Set<string>();
      if (user1Country) user1Origins.add(user1Country.toLowerCase());
      if (user1SecondaryCountry) user1Origins.add(user1SecondaryCountry.toLowerCase());
      
      const user2Origins = new Set<string>();
      if (user2Country) user2Origins.add(user2Country.toLowerCase());
      if (user2SecondaryCountry) user2Origins.add(user2SecondaryCountry.toLowerCase());
      
      // Calculate intersection and union for Jaccard-style similarity
      const intersection = [...user1Origins].filter(origin => user2Origins.has(origin));
      const union = new Set([...user1Origins, ...user2Origins]);
      
      if (intersection.length === 0) {
        // No direct match - check for cultural/regional similarities
        return this.calculateRegionalCulturalSimilarity(user1Origins, user2Origins);
      }
      
      // Direct country match with multi-cultural bonus
      let score = intersection.length / union.size;
      
      // Bonus for multi-cultural backgrounds (dual citizenship alignment)
      if (user1SecondaryCountry && user2SecondaryCountry) {
        score += 0.1; // Bonus for both having multi-cultural backgrounds
      }
      
      return Math.min(score, 1.0);
      
    } catch (error) {
      console.error('[COUNTRY-ORIGIN] Error:', error);
      return 0.5;
    }
  }

  /**
   * Calculate regional cultural similarity for non-matching countries
   */
  private calculateRegionalCulturalSimilarity(user1Origins: Set<string>, user2Origins: Set<string>): number {
    try {
      // Define cultural/regional clusters with similarity scores
      const culturalClusters = {
        // West African cultural cluster
        westAfrica: {
          countries: ['nigeria', 'ghana', 'senegal', 'ivory coast', 'burkina faso', 'togo', 'benin'],
          similarity: 0.7
        },
        // European cultural cluster  
        europe: {
          countries: ['germany', 'france', 'spain', 'italy', 'netherlands', 'uk', 'belgium'],
          similarity: 0.5
        },
        // North American cultural cluster
        northAmerica: {
          countries: ['usa', 'canada'],
          similarity: 0.8
        },
        // Former British colonies (shared colonial history)
        britishColonies: {
          countries: ['nigeria', 'ghana', 'uk', 'usa', 'canada', 'australia'],
          similarity: 0.4
        },
        // French-influenced regions
        francophone: {
          countries: ['france', 'ivory coast', 'senegal', 'burkina faso', 'canada'],
          similarity: 0.4
        }
      };
      
      let maxSimilarity = 0;
      
      // Check each cultural cluster for matches
      for (const cluster of Object.values(culturalClusters)) {
        const user1Match = [...user1Origins].some(origin => 
          cluster.countries.some(country => origin.includes(country) || country.includes(origin))
        );
        const user2Match = [...user2Origins].some(origin => 
          cluster.countries.some(country => origin.includes(country) || country.includes(origin))
        );
        
        if (user1Match && user2Match) {
          maxSimilarity = Math.max(maxSimilarity, cluster.similarity);
        }
      }
      
      return maxSimilarity;
      
    } catch (error) {
      console.error('[REGIONAL-CULTURAL] Error:', error);
      return 0.2; // Minimal similarity for error cases
    }
  }

  /**
   * Calculate cultural distance based on comprehensive cultural identities
   */
  private calculateCulturalDistance(user1Identities: Set<string>, user2Identities: Set<string>): number {
    try {
      // Direct cultural overlap calculation
      const intersection = [...user1Identities].filter(identity => 
        [...user2Identities].some(otherIdentity => 
          identity.toLowerCase() === otherIdentity.toLowerCase() ||
          identity.toLowerCase().includes(otherIdentity.toLowerCase()) ||
          otherIdentity.toLowerCase().includes(identity.toLowerCase())
        )
      );
      
      const union = new Set([...user1Identities, ...user2Identities]);
      
      if (intersection.length === 0) return 0.2; // Minimal score for no cultural overlap
      
      // Jaccard similarity with cultural context bonus
      const jaccardScore = intersection.length / union.size;
      
      // Bonus for comprehensive cultural data (more identities = richer cultural profile)
      const dataRichnessBonus = Math.min((user1Identities.size + user2Identities.size) / 10, 0.1);
      
      return Math.min(jaccardScore + dataRichnessBonus, 1.0);
      
    } catch (error) {
      console.error('[CULTURAL-DISTANCE] Error:', error);
      return 0.5;
    }
  }



  /**
   * Create comprehensive location sets for cultural analysis
   */
  private createUserCulturalIdentities(user: User): Set<string> {
    const identities = new Set<string>();
    
    if (user.location) {
      // Extract country from location
      const locationLower = user.location.toLowerCase();
      if (locationLower.includes('usa') || locationLower.includes('united states')) identities.add('USA');
      else if (locationLower.includes('spain')) identities.add('Spain');
      else if (locationLower.includes('ghana')) identities.add('Ghana');
      else if (locationLower.includes('germany')) identities.add('Germany');
      else if (locationLower.includes('nigeria')) identities.add('Nigeria');
      else identities.add(user.location);
    }
    
    if (user.countryOfOrigin) identities.add(user.countryOfOrigin);
    if (user.secondaryCountryOfOrigin) identities.add(user.secondaryCountryOfOrigin);
    
    return identities;
  }

  /**
   * FACTOR 3: Distance Calculations - Comprehensive distance-based compatibility scoring
   * 
   * Calculates compatibility based on geographic distance between users and their distance preferences.
   * Uses Haversine formula for accurate distance calculations and provides weighted scoring.
   */
  private async calculateDistanceCompatibility(user: User, candidate: User, userPreferences: UserPreference | null): Promise<number> {
    try {
      console.log(`[DISTANCE-COMPATIBILITY] Analyzing distance between user ${user.id} and candidate ${candidate.id}`);
      
      // Extract user locations
      const userLocation = user.location;
      const candidateLocation = candidate.location;
      
      if (!userLocation || !candidateLocation) {
        console.log(`[DISTANCE-COMPATIBILITY] Missing location data - user: ${!!userLocation}, candidate: ${!!candidateLocation}`);
        return 0.5; // Neutral score for missing location data
      }
      
      // Get user's distance preference (default to 100km if not set)
      const maxDistanceKm = userPreferences?.distancePreference || 100;
      console.log(`[DISTANCE-COMPATIBILITY] User ${user.id} distance preference: ${maxDistanceKm}km`);
      
      // Calculate distance compatibility using geocoding service
      const compatibilityResult = await geocodingService.analyzeLocationCompatibility(
        userLocation,
        candidateLocation,
        maxDistanceKm
      );
      
      console.log(`[DISTANCE-COMPATIBILITY] Distance analysis: ${compatibilityResult.distance}km, score: ${compatibilityResult.score.toFixed(3)}, confidence: ${compatibilityResult.confidence.toFixed(3)}`);
      console.log(`[DISTANCE-COMPATIBILITY] Analysis: ${compatibilityResult.analysis}`);
      
      // Return weighted score based on confidence
      const finalScore = compatibilityResult.score;
      
      console.log(`[DISTANCE-COMPATIBILITY] Final distance compatibility score: ${finalScore.toFixed(3)}`);
      return Math.min(Math.max(finalScore, 0), 1);
      
    } catch (error) {
      console.error('[DISTANCE-COMPATIBILITY] Error calculating distance compatibility:', error);
      return 0.5; // Return neutral score on error
    }
  }

  /**
   * Enhanced preference alignment considering user's matching priorities with weighted importance
   */
  private calculatePreferenceAlignment(candidate: User, preferences: UserPreference | null): number {
    if (!preferences) return 0.5;

    // Get user's matching priorities (ordered by importance)
    let userPriorities: string[] = [];
    try {
      if (preferences.matchingPriorities) {
        userPriorities = JSON.parse(preferences.matchingPriorities);
      }
    } catch (e) {
      console.log('[PREFERENCE-ALIGNMENT] Error parsing matching priorities');
    }

    if (userPriorities.length === 0) {
      // Fallback to basic alignment if no priorities set
      return this.calculateBasicPreferenceAlignment(candidate, preferences);
    }

    console.log(`[PREFERENCE-ALIGNMENT] User priorities: [${userPriorities.join(', ')}]`);

    let totalScore = 0;
    let totalWeight = 0;

    // Priority weighting system (1st = 40%, 2nd = 30%, 3rd = 20%, others = 10%)
    const priorityWeights = [0.40, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10];

    userPriorities.forEach((priority, index) => {
      const weight = priorityWeights[index] || 0.05; // Diminishing returns for priorities beyond 7th
      const categoryScore = this.calculateCategoryScore(priority, candidate, preferences);
      
      totalScore += categoryScore * weight;
      totalWeight += weight;
      
      console.log(`[PREFERENCE-ALIGNMENT] ${priority} (priority ${index + 1}): ${categoryScore.toFixed(3)} (weight: ${weight})`);
    });

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;
    console.log(`[PREFERENCE-ALIGNMENT] Final weighted score: ${finalScore.toFixed(4)}`);
    
    return Math.min(Math.max(finalScore, 0), 1);
  }

  /**
   * Calculate score for individual matching priority category
   */
  private calculateCategoryScore(category: string, candidate: User, preferences: UserPreference | null): number {
    switch (category) {
      case 'values':
        return this.calculateValuesScore(candidate, preferences);
      case 'personality':
        return this.calculatePersonalityScore(candidate, preferences);
      case 'looks':
        return this.calculateLooksScore(candidate, preferences);
      case 'career':
        return this.calculateCareerScore(candidate, preferences);
      case 'religion':
        return this.calculateReligionScore(candidate, preferences);
      case 'tribe':
        return this.calculateTribeScore(candidate, preferences);
      case 'intellect':
        return this.calculateIntellectScore(candidate, preferences);
      default:
        console.log(`[PREFERENCE-ALIGNMENT] Unknown category: ${category}`);
        return 0.5;
    }
  }

  /**
   * VALUES: Interests + Religion + Relationship Goals compatibility
   */
  private calculateValuesScore(candidate: User, preferences: UserPreference | null): number {
    let score = 0;
    let factors = 0;

    // 1. ENHANCED INTERESTS ALIGNMENT: Includes Feature 1 (Interest Diversity)
    if (candidate.interests && preferences?.interestPreferences) {
      try {
        const candidateInterests = new Set(JSON.parse(candidate.interests));
        const preferredInterests = new Set(JSON.parse(preferences.interestPreferences));
        
        const commonInterests = [...candidateInterests].filter(interest => preferredInterests.has(interest));
        const totalUniqueInterests = new Set([...candidateInterests, ...preferredInterests]).size;
        
        if (totalUniqueInterests > 0) {
          // Traditional overlap score (70% weight)
          const overlapScore = commonInterests.length / Math.min(candidateInterests.size, preferredInterests.size);
          
          // FEATURE 1: Interest diversity for complementary interests (30% weight)
          const diversityScore = this.calculateInterestDiversity(candidate, preferences.userId ? candidate : candidate, preferences);
          
          // Balanced scoring combining overlap and diversity
          const combinedScore = (overlapScore * 0.7) + (diversityScore * 0.3);
          
          score += combinedScore;
          factors++;
          
          console.log(`[VALUES-SCORE] Interest combination: ${overlapScore.toFixed(3)} overlap + ${diversityScore.toFixed(3)} diversity = ${combinedScore.toFixed(3)}`);
        }
      } catch (e) {
        console.log('[VALUES-SCORE] Interest parsing error');
      }
    }

    // 2. Religion alignment (if religion is important to user)
    if (candidate.religion && preferences?.religionPreference) {
      try {
        const religionPrefs = new Set(JSON.parse(preferences.religionPreference));
        score += religionPrefs.has(candidate.religion) ? 1 : 0;
        factors++;
      } catch (e) {
        if (preferences.religionPreference === candidate.religion) {
          score += 1;
          factors++;
        }
      }
    }

    // 3. Relationship goals compatibility
    if (candidate.relationshipGoal && preferences?.relationshipGoalPreference) {
      const goalSimilarity = this.calculateTextSimilarity(
        candidate.relationshipGoal.toLowerCase(),
        preferences.relationshipGoalPreference.toLowerCase()
      );
      score += goalSimilarity;
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * PERSONALITY: Bio analysis + Shared interests
   */
  private calculatePersonalityScore(candidate: User, preferences: UserPreference | null): number {
    let score = 0;
    let factors = 0;

    // 1. Bio text analysis (if both users have bios)
    if (candidate.bio && preferences && 'bio' in preferences) {
      // This would require getting the requesting user's bio, simplified for now
      score += 0.7; // Placeholder - would need enhanced text analysis
      factors++;
    }

    // 2. Shared interests as personality indicator
    if (candidate.interests && preferences?.interestPreferences) {
      try {
        const candidateInterests = new Set(JSON.parse(candidate.interests));
        const preferredInterests = new Set(JSON.parse(preferences.interestPreferences));
        
        const overlap = [...candidateInterests].filter(i => preferredInterests.has(i)).length;
        const union = new Set([...candidateInterests, ...preferredInterests]).size;
        
        if (union > 0) {
          score += overlap / union; // Jaccard coefficient
          factors++;
        }
      } catch (e) {
        console.log('[PERSONALITY-SCORE] Interest parsing error');
      }
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * LOOKS: Enhanced body type + Height preferences with range expansion (Feature 3)
   */
  public calculateLooksScore(candidate: User, preferences: UserPreference | null): number {
    let score = 0;
    let factors = 0;

    // 1. Enhanced body type compatibility with range expansion
    if (candidate.bodyType && preferences?.bodyTypePreference) {
      try {
        const bodyTypePrefs = new Set(JSON.parse(preferences.bodyTypePreference));
        
        // Exact match gets highest score
        if (bodyTypePrefs.has(candidate.bodyType)) {
          console.log(`[BODY-TYPE-EXPANSION] Exact body type match: ${candidate.bodyType}`);
          score += 1.0;
        } else {
          // BODY TYPE RANGE EXPANSION: Apply expansion for diversity
          const expansionScore = this.calculateBodyTypeRangeExpansion(candidate.bodyType, bodyTypePrefs as Set<string>);
          console.log(`[BODY-TYPE-EXPANSION] Expanding range for ${candidate.bodyType}: ${expansionScore.toFixed(3)}`);
          score += expansionScore;
        }
        factors++;
      } catch (e) {
        // Fallback to simple string comparison with expansion
        if (preferences.bodyTypePreference === candidate.bodyType) {
          score += 1.0;
        } else {
          // Apply basic expansion
          const expansionScore = this.calculateBasicBodyTypeExpansion(candidate.bodyType, preferences.bodyTypePreference);
          score += expansionScore;
        }
        factors++;
      }
    }

    // 2. Height compatibility
    if (candidate.height && preferences?.minHeightPreference && preferences?.maxHeightPreference) {
      const inRange = candidate.height >= preferences.minHeightPreference && 
                     candidate.height <= preferences.maxHeightPreference;
      score += inRange ? 1 : 0;
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * CAREER: Profession + Education level compatibility
   */
  private calculateCareerScore(candidate: User, preferences: UserPreference | null): number {
    let score = 0;
    let factors = 0;

    // 1. Education level compatibility
    if (candidate.educationLevel && preferences?.educationLevelPreference) {
      try {
        const educationPrefs = new Set(JSON.parse(preferences.educationLevelPreference));
        score += educationPrefs.has(candidate.educationLevel) ? 1 : 0;
        factors++;
      } catch (e) {
        if (preferences.educationLevelPreference === candidate.educationLevel) {
          score += 1;
          factors++;
        }
      }
    }

    // 2. Profession similarity (simplified text matching)
    if (candidate.profession && preferences && 'profession' in preferences) {
      // Would need profession compatibility matrix, simplified for now
      score += 0.6; // Placeholder
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * RELIGION: Enhanced religion matching with tolerance expansion (Feature 2)
   * Expands religion preferences when religion is not in user's deal breakers
   */
  public calculateReligionScore(candidate: User, preferences: UserPreference | null): number {
    if (!candidate.religion || !preferences?.religionPreference) return 0.5;

    try {
      const religionPrefs = new Set(JSON.parse(preferences.religionPreference));
      
      // Exact match gets highest score
      if (religionPrefs.has(candidate.religion)) {
        console.log(`[RELIGION-TOLERANCE] Exact religion match: ${candidate.religion}`);
        return 1.0;
      }
      
      // Check if religion is in deal breakers - if so, strict matching only
      // NOTE: "different_religion" deal breaker is now handled in hard filters as true hard filter
      // Candidates with incompatible religion groups are filtered out before reaching this algorithm
      const isReligionDealBreaker = this.isReligionDealBreaker(preferences);
      if (isReligionDealBreaker) {
        console.log(`[RELIGION-TOLERANCE] Religion is deal breaker - but hard filtering should have handled this already`);
        // Still apply strict matching as fallback, but this should rarely be reached
        return 0.1; // Small score instead of 0.0 since hard filters should handle complete filtering
      }
      
      // RELIGION TOLERANCE EXPANSION: Apply tolerance when not a deal breaker
      const toleranceScore = this.calculateReligionTolerance(candidate.religion, religionPrefs as Set<string>);
      console.log(`[RELIGION-TOLERANCE] Applying tolerance for ${candidate.religion}: ${toleranceScore.toFixed(3)}`);
      
      return toleranceScore;
      
    } catch (e) {
      // Fallback to simple string comparison with tolerance
      const exactMatch = preferences.religionPreference === candidate.religion;
      if (exactMatch) return 1.0;
      
      const isReligionDealBreaker = this.isReligionDealBreaker(preferences);
      if (isReligionDealBreaker) return 0.1; // Fallback - hard filters should handle this
      
      // Apply basic tolerance for string-based preferences
      return this.calculateBasicReligionTolerance(candidate.religion, preferences.religionPreference);
    }
  }

  /**
   * TRIBE: Ethnicity + Secondary tribe matching
   */
  private calculateTribeScore(candidate: User, preferences: UserPreference | null): number {
    if (!preferences?.ethnicityPreference) return 0.5;

    try {
      const ethnicityPrefs = new Set(JSON.parse(preferences.ethnicityPreference));
      
      let matches = 0;
      let total = 0;
      
      if (candidate.ethnicity) {
        matches += ethnicityPrefs.has(candidate.ethnicity) ? 1 : 0;
        total++;
      }
      
      if (candidate.secondaryTribe) {
        matches += ethnicityPrefs.has(candidate.secondaryTribe) ? 1 : 0;
        total++;
      }
      
      return total > 0 ? matches / total : 0.5;
    } catch (e) {
      // Direct string comparison fallback
      const hasEthnicityMatch = preferences.ethnicityPreference === candidate.ethnicity;
      const hasSecondaryMatch = preferences.ethnicityPreference === candidate.secondaryTribe;
      return (hasEthnicityMatch || hasSecondaryMatch) ? 1 : 0;
    }
  }

  /**
   * INTELLECT: Education level + University + Profession analysis
   */
  private calculateIntellectScore(candidate: User, preferences: UserPreference | null): number {
    let score = 0;
    let factors = 0;

    // 1. Education level as intellect indicator
    if (candidate.educationLevel && preferences?.educationLevelPreference) {
      const educationHierarchy = {
        'high_school': 1,
        'some_college': 2,
        'bachelors': 3,
        'masters': 4,
        'doctorate': 5
      };
      
      try {
        const educationPrefs = JSON.parse(preferences.educationLevelPreference);
        const candidateLevel = educationHierarchy[candidate.educationLevel as keyof typeof educationHierarchy] || 0;
        const hasCompatibleEducation = educationPrefs.some((pref: string) => 
          educationHierarchy[pref as keyof typeof educationHierarchy] === candidateLevel
        );
        
        score += hasCompatibleEducation ? 1 : 0;
        factors++;
      } catch (e) {
        score += preferences.educationLevelPreference === candidate.educationLevel ? 1 : 0;
        factors++;
      }
    }

    // 2. University prestige (simplified)
    if (candidate.collegeUniversity) {
      score += 0.7; // Would need university ranking system
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Basic preference alignment for users without matching priorities
   */
  private calculateBasicPreferenceAlignment(candidate: User, preferences: UserPreference | null): number {
    if (!preferences) return 0.5;

    let score = 0;
    let factors = 0;

    // Age alignment
    if (preferences.minAge && preferences.maxAge && candidate.dateOfBirth) {
      const candidateAge = this.calculateAge(candidate.dateOfBirth);
      if (candidateAge >= preferences.minAge && candidateAge <= preferences.maxAge) {
        score += 1;
      }
      factors++;
    }

    // Location alignment
    if (preferences.locationPreference && candidate.location) {
      if (preferences.locationPreference === 'Both' || 
          preferences.locationPreference === candidate.location) {
        score += 1;
      }
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Simple text similarity for relationship goals
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  private findSimilarUsersMatrix(userId: number, matrix: InteractionMatrix): Array<{userId: number, similarity: number}> {
    // Simplified similarity calculation for matrix factorization
    const userIndex = matrix.userIds.indexOf(userId);
    if (userIndex === -1) return [];

    const similarities: Array<{userId: number, similarity: number}> = [];
    const userInteractions = matrix.interactions[userIndex];

    for (let i = 0; i < matrix.userIds.length; i++) {
      if (i === userIndex) continue;

      const otherUserId = matrix.userIds[i];
      const otherInteractions = matrix.interactions[i];
      
      const similarity = this.calculateInteractionSimilarity(userInteractions, otherInteractions);
      if (similarity > 0.3) {
        similarities.push({ userId: otherUserId, similarity });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  private calculateInteractionSimilarity(interactions1: number[], interactions2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < Math.min(interactions1.length, interactions2.length); i++) {
      dotProduct += interactions1[i] * interactions2[i];
      norm1 += interactions1[i] * interactions1[i];
      norm2 += interactions2[i] * interactions2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private calculateReciprocityScore(reciprocityData: { responseRate: number; averageResponseTime: number }): number {
    // Higher response rate and faster response time = higher score
    const responseScore = reciprocityData.responseRate;
    const timeScore = Math.exp(-reciprocityData.averageResponseTime / 3600); // 1-hour half-life
    return (responseScore + timeScore) / 2;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private calculateTF(term: string, tokens: string[]): number {
    const count = tokens.filter(token => token === term).length;
    return count / tokens.length;
  }

  private calculateVectorCosineSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < Math.min(vector1.length, vector2.length); i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * ============================================================================
   * PREFERENCE EXPANSION FEATURES - COMPLETE IMPLEMENTATION
   * ============================================================================
   */

  /**
   * FEATURE 2: Religion Tolerance Expansion
   * Check if religion is marked as a deal breaker in user preferences
   */
  public isReligionDealBreaker(preferences: UserPreference | null): boolean {
    if (!preferences?.dealBreakers) return false;
    
    try {
      const dealBreakers = JSON.parse(preferences.dealBreakers);
      return dealBreakers.includes('religion') || dealBreakers.includes('Religion');
    } catch (e) {
      // Fallback to string-based check
      return preferences.dealBreakers.toLowerCase().includes('religion');
    }
  }

  /**
   * FEATURE 2: Calculate religion tolerance when not a deal breaker
   */
  public calculateReligionTolerance(candidateReligion: string, preferredReligions: Set<string>): number {
    const religion = candidateReligion.toLowerCase();
    
    // Religion compatibility matrix for tolerance expansion
    const religionCompatibilityMap: Record<string, Record<string, number>> = {
      'christian': {
        'christian': 1.0,
        'catholic': 0.8,
        'protestant': 0.8,
        'orthodox': 0.7,
        'spiritual': 0.6,
        'other': 0.4,
        'muslim': 0.3,
        'traditional': 0.2,
        'atheist': 0.1
      },
      'muslim': {
        'muslim': 1.0,
        'spiritual': 0.6,
        'christian': 0.3,
        'traditional': 0.3,
        'other': 0.4,
        'atheist': 0.1
      },
      'traditional': {
        'traditional': 1.0,
        'spiritual': 0.7,
        'other': 0.5,
        'christian': 0.3,
        'muslim': 0.3,
        'atheist': 0.2
      },
      'spiritual': {
        'spiritual': 1.0,
        'christian': 0.6,
        'muslim': 0.6,
        'traditional': 0.7,
        'other': 0.6,
        'atheist': 0.3
      },
      'other': {
        'other': 1.0,
        'spiritual': 0.6,
        'traditional': 0.5,
        'christian': 0.4,
        'muslim': 0.4,
        'atheist': 0.4
      },
      'atheist': {
        'atheist': 1.0,
        'spiritual': 0.3,
        'other': 0.4,
        'christian': 0.1,
        'muslim': 0.1,
        'traditional': 0.2
      }
    };

    let maxToleranceScore = 0;
    
    for (const preferredReligion of preferredReligions) {
      const preferred = preferredReligion.toLowerCase();
      const toleranceScore = religionCompatibilityMap[preferred]?.[religion] || 0.2;
      maxToleranceScore = Math.max(maxToleranceScore, toleranceScore);
    }
    
    console.log(`[RELIGION-TOLERANCE] ${candidateReligion} tolerance with preferences [${Array.from(preferredReligions).join(', ')}]: ${maxToleranceScore.toFixed(3)}`);
    return maxToleranceScore;
  }

  /**
   * FEATURE 2: Basic religion tolerance for string-based preferences
   */
  private calculateBasicReligionTolerance(candidateReligion: string, preferredReligion: string): number {
    const fakeSet = new Set([preferredReligion]);
    return this.calculateReligionTolerance(candidateReligion, fakeSet);
  }

  /**
   * FEATURE 3: Body Type Range Expansion
   * Expand body type preferences for diversity
   */
  public calculateBodyTypeRangeExpansion(candidateBodyType: string, preferredBodyTypes: Set<string>): number {
    const bodyType = candidateBodyType.toLowerCase();
    
    // Body type compatibility matrix for range expansion
    const bodyTypeCompatibilityMap: Record<string, Record<string, number>> = {
      'slim': {
        'slim': 1.0,
        'athletic': 0.8,
        'average': 0.7,
        'curvy': 0.5,
        'thick': 0.4,
        'plus size': 0.3,
        'other': 0.5
      },
      'athletic': {
        'athletic': 1.0,
        'slim': 0.8,
        'toned': 0.9,
        'average': 0.7,
        'muscular': 0.8,
        'curvy': 0.6,
        'thick': 0.5,
        'other': 0.5
      },
      'average': {
        'average': 1.0,
        'slim': 0.7,
        'athletic': 0.7,
        'curvy': 0.8,
        'thick': 0.7,
        'plus size': 0.6,
        'other': 0.6
      },
      'curvy': {
        'curvy': 1.0,
        'thick': 0.8,
        'average': 0.8,
        'plus size': 0.7,
        'athletic': 0.6,
        'slim': 0.5,
        'other': 0.6
      },
      'thick': {
        'thick': 1.0,
        'curvy': 0.8,
        'plus size': 0.8,
        'average': 0.7,
        'athletic': 0.5,
        'slim': 0.4,
        'other': 0.6
      },
      'plus size': {
        'plus size': 1.0,
        'thick': 0.8,
        'curvy': 0.7,
        'average': 0.6,
        'athletic': 0.4,
        'slim': 0.3,
        'other': 0.5
      },
      'muscular': {
        'muscular': 1.0,
        'athletic': 0.8,
        'toned': 0.8,
        'average': 0.6,
        'thick': 0.5,
        'slim': 0.5,
        'other': 0.5
      },
      'toned': {
        'toned': 1.0,
        'athletic': 0.9,
        'muscular': 0.8,
        'slim': 0.7,
        'average': 0.6,
        'curvy': 0.6,
        'other': 0.5
      }
    };

    let maxExpansionScore = 0;
    
    for (const preferredBodyType of preferredBodyTypes) {
      const preferred = preferredBodyType.toLowerCase();
      const expansionScore = bodyTypeCompatibilityMap[preferred]?.[bodyType] || 0.3;
      maxExpansionScore = Math.max(maxExpansionScore, expansionScore);
    }
    
    console.log(`[BODY-TYPE-EXPANSION] ${candidateBodyType} expansion with preferences [${Array.from(preferredBodyTypes).join(', ')}]: ${maxExpansionScore.toFixed(3)}`);
    return maxExpansionScore;
  }

  /**
   * FEATURE 3: Basic body type expansion for string-based preferences
   */
  public calculateBasicBodyTypeExpansion(candidateBodyType: string, preferredBodyType: string): number {
    const fakeSet = new Set([preferredBodyType]);
    return this.calculateBodyTypeRangeExpansion(candidateBodyType, fakeSet);
  }

  /**
   * FEATURE 4: New User Priority Boosting
   * Boost priority for new users to improve their visibility
   */
  public calculateNewUserBoost(candidate: User): number {
    // Use correct field name from User schema
    const createdAt = candidate.createdAt;
    if (!createdAt) return 0;
    
    const createdDate = new Date(createdAt);
    const now = new Date();
    const daysSinceJoined = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // New user boost decreases over time
    if (daysSinceJoined <= 7) {
      // First week: maximum boost (0.3)
      const boost = 0.3 * (1 - daysSinceJoined / 7);
      console.log(`[NEW-USER-BOOST] User ${candidate.id} joined ${daysSinceJoined.toFixed(1)} days ago, boost: ${boost.toFixed(3)}`);
      return boost;
    } else if (daysSinceJoined <= 30) {
      // First month: moderate boost (0.1)
      const boost = 0.1 * (1 - (daysSinceJoined - 7) / 23);
      console.log(`[NEW-USER-BOOST] User ${candidate.id} joined ${daysSinceJoined.toFixed(1)} days ago, boost: ${boost.toFixed(3)}`);
      return boost;
    } else {
      // No boost after 30 days
      return 0;
    }
  }

  /**
   * FEATURE 1: Enhanced Interest Diversity Analysis
   * Calculate complementary vs. overlapping interests for better diversity
   */
  public calculateInterestDiversity(candidate: User, currentUser: User, preferences: UserPreference | null): number {
    if (!candidate.interests || !currentUser.interests) {
      console.log(`[INTEREST-DIVERSITY] User ${candidate.id}: Missing interests data, returning neutral 0.5`);
      return 0.5;
    }
    
    try {
      const candidateInterests = new Set(JSON.parse(candidate.interests));
      const currentUserInterests = new Set(JSON.parse(currentUser.interests));
      
      if (candidateInterests.size === 0 || currentUserInterests.size === 0) {
        console.log(`[INTEREST-DIVERSITY] User ${candidate.id}: Empty interests, returning neutral 0.5`);
        return 0.5;
      }
      
      // Calculate overlap (common interests)
      const commonInterests = [...candidateInterests].filter(interest => currentUserInterests.has(interest));
      const overlapRatio = commonInterests.length / Math.min(candidateInterests.size, currentUserInterests.size);
      
      // Calculate complementary interests (unique to candidate)
      const uniqueCandidateInterests = [...candidateInterests].filter(interest => !currentUserInterests.has(interest));
      const complementaryRatio = uniqueCandidateInterests.length / candidateInterests.size;
      
      // Balanced scoring: 60% overlap + 40% complementary
      const diversityScore = (overlapRatio * 0.6) + (complementaryRatio * 0.4);
      
      console.log(`[INTEREST-DIVERSITY] User ${candidate.id}: ${overlapRatio.toFixed(2)} overlap + ${complementaryRatio.toFixed(2)} complementary = ${diversityScore.toFixed(3)} diversity`);
      
      return Math.min(diversityScore, 1.0);
      
    } catch (e) {
      console.log('[INTEREST-DIVERSITY] Error parsing interests');
      return 0.5;
    }
  }
}

// Export singleton instance
export const advancedMatchingEngine = new AdvancedMatchingEngine();