/**
 * DEMOGRAPHIC CLUSTERING FOR COLLABORATIVE FILTERING
 * 
 * Enhanced user similarity detection through demographic clustering
 * Part of the CHARLEY Hybrid Matching Engine's Collaborative Filtering component
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Lazy database connection to prevent startup crashes
let sql: any = null;
function getSql() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL!);
  }
  return sql;
}

export interface DemographicProfile {
  userId: number;
  ageGroup: string;           // '18-20', '21-24', '25-29', '30-34', '35-39', '40-44', '45+'
  locationCluster: string;    // 'Spain', 'USA', 'Ghana', 'UK', 'Other'
  educationLevel: string;     // 'High School', 'University', 'Graduate', 'Professional'
  professionCategory: string; // 'Creative', 'Sports', 'Technology', 'Healthcare', 'Education', 'Business'
  relationshipGoal: string;   // 'Long-term', 'Casual', 'Friendship', 'Open to possibilities'
}

export interface ClusterSimilarity {
  userId: number;
  similarityScore: number;    // 0-1, higher = more demographically similar
  commonClusters: string[];   // Which demographic categories match
  demographicProfile: DemographicProfile;
}

export class DemographicClustering {

  /**
   * Generate comprehensive demographic profile for a user
   */
  async generateDemographicProfile(userId: number): Promise<DemographicProfile> {
    try {
      console.log(`[DEMOGRAPHIC-CLUSTERING] Generating profile for user ${userId}`);

      const userDemographics = await getSql()`
        SELECT 
          id,
          date_of_birth,
          location,
          country_of_origin,
          education_level,
          high_school,
          college_university,
          profession,
          relationship_goal
        FROM users 
        WHERE id = ${userId}
      `;

      if (userDemographics.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const user = userDemographics[0];

      // Calculate age group
      const ageGroup = this.calculateAgeGroup(user.date_of_birth);
      
      // Determine location cluster
      const locationCluster = this.calculateLocationCluster(user.location, user.country_of_origin);
      
      // Determine education level
      const educationLevel = this.calculateEducationLevel(user.education_level, user.college_university, user.high_school);
      
      // Categorize profession
      const professionCategory = this.categorizeProfession(user.profession);
      
      // Categorize relationship goal
      const relationshipGoal = this.categorizeRelationshipGoal(user.relationship_goal);

      const profile: DemographicProfile = {
        userId,
        ageGroup,
        locationCluster,
        educationLevel,
        professionCategory,
        relationshipGoal
      };

      console.log(`[DEMOGRAPHIC-CLUSTERING] Profile for user ${userId}:`, {
        age: ageGroup,
        location: locationCluster,
        education: educationLevel,
        profession: professionCategory,
        relationship: relationshipGoal
      });

      return profile;

    } catch (error) {
      console.error(`[DEMOGRAPHIC-CLUSTERING] Error generating profile for user ${userId}:`, error);
      
      // Return neutral profile as fallback
      return {
        userId,
        ageGroup: 'Unknown',
        locationCluster: 'Unknown',
        educationLevel: 'Unknown',
        professionCategory: 'Unknown',
        relationshipGoal: 'Unknown'
      };
    }
  }

  /**
   * Calculate age group from date of birth
   */
  private calculateAgeGroup(dateOfBirth: string | null): string {
    if (!dateOfBirth) return 'Unknown';

    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      // Adjust for birthday not yet occurred this year
      const adjustedAge = (today.getMonth() < birthDate.getMonth() || 
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) 
        ? age - 1 : age;

      if (adjustedAge < 21) return '18-20';
      if (adjustedAge < 25) return '21-24';
      if (adjustedAge < 30) return '25-29';
      if (adjustedAge < 35) return '30-34';
      if (adjustedAge < 40) return '35-39';
      if (adjustedAge < 45) return '40-44';
      return '45+';

    } catch (error) {
      console.error('[DEMOGRAPHIC-CLUSTERING] Error calculating age:', error);
      return 'Unknown';
    }
  }

  /**
   * Determine location cluster from location and country data
   */
  private calculateLocationCluster(location: string | null, countryOfOrigin: string | null): string {
    const locationStr = (location || countryOfOrigin || '').toLowerCase();

    if (locationStr.includes('spain') || locationStr.includes('madrid')) return 'Spain';
    if (locationStr.includes('usa') || locationStr.includes('texas') || locationStr.includes(' tx')) return 'USA';
    if (locationStr.includes('ghana') || locationStr.includes('accra')) return 'Ghana';
    if (locationStr.includes('uk') || locationStr.includes('london') || locationStr.includes('britain')) return 'UK';
    if (locationStr.includes('france') || locationStr.includes('paris')) return 'France';
    if (locationStr.includes('germany') || locationStr.includes('berlin')) return 'Germany';
    if (locationStr.includes('canada') || locationStr.includes('toronto')) return 'Canada';
    
    return locationStr ? 'Other' : 'Unknown';
  }

  /**
   * Determine education level from multiple education fields
   */
  private calculateEducationLevel(educationLevel: string | null, collegeUniversity: string | null, highSchool: string | null): string {
    if (educationLevel) {
      const level = educationLevel.toLowerCase();
      if (level.includes('phd') || level.includes('doctorate')) return 'Doctorate';
      if (level.includes('masters') || level.includes('graduate')) return 'Masters';
      if (level.includes('bachelors') || level.includes('university')) return 'Bachelors';
      if (level.includes('high_school') || level.includes('secondary')) return 'High School';
      return 'Other';
    }

    if (collegeUniversity) return 'University';
    if (highSchool) return 'High School';
    
    return 'Unknown';
  }

  /**
   * Categorize profession into major career categories
   */
  /**
   * Enhanced comprehensive profession categorization for global diversity
   * Covers wide range of careers from all walks of life worldwide
   */
  private categorizeProfession(profession: string | null): string {
    if (!profession) return 'Other';
    
    const professionLower = profession.toLowerCase().trim();
    
    // CREATIVE & ARTS
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
    
    // TECHNOLOGY & ENGINEERING
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
    
    // HEALTHCARE & MEDICAL
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
    
    // BUSINESS & FINANCE
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
    
    // EDUCATION & RESEARCH
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
    
    // TRADES & SKILLED LABOR
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
    
    // SPORTS & FITNESS
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
    
    // LAW & PUBLIC SERVICE
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
    
    // HOSPITALITY & TOURISM
    if (this.matchesProfessionKeywords(professionLower, [
      'hotel manager', 'hospitality', 'tourism', 'travel agent', 'tour guide',
      'flight attendant', 'pilot', 'airline', 'cruise', 'resort',
      'restaurant manager', 'waiter', 'waitress', 'server', 'bartender',
      'event planner', 'wedding planner', 'catering'
    ])) {
      return 'Hospitality & Tourism';
    }
    
    // RETAIL & CUSTOMER SERVICE
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
   * Categorize relationship goals into major intent categories
   */
  private categorizeRelationshipGoal(relationshipGoal: string | null): string {
    if (!relationshipGoal) return 'Unknown';

    const goal = relationshipGoal.toLowerCase();

    if (goal.includes('long') || goal.includes('serious') || goal.includes('marriage') || 
        goal.includes('committed') || goal.includes('settle')) {
      return 'Long-term';
    }

    if (goal.includes('casual') || goal.includes('fun') || goal.includes('dating') || goal.includes('hook')) {
      return 'Casual';
    }

    if (goal.includes('friend') || goal.includes('networking') || goal.includes('social')) {
      return 'Friendship';
    }

    if (goal.includes('open') || goal.includes('explore') || goal.includes('see') || goal.includes('figure')) {
      return 'Open to possibilities';
    }

    if (goal.includes('love') || goal.includes('romance') || goal.includes('relationship')) {
      return 'Romance';
    }

    return 'Other';
  }

  /**
   * Calculate demographic similarity between two users
   */
  calculateDemographicSimilarity(profile1: DemographicProfile, profile2: DemographicProfile): ClusterSimilarity {
    try {
      const commonClusters: string[] = [];
      let similarityScore = 0;
      const totalCategories = 5;

      // Age group similarity (weight: 0.15)
      if (profile1.ageGroup === profile2.ageGroup && profile1.ageGroup !== 'Unknown') {
        commonClusters.push('age');
        similarityScore += 0.15;
      }

      // Location cluster similarity (weight: 0.25) - higher weight for cultural compatibility
      if (profile1.locationCluster === profile2.locationCluster && profile1.locationCluster !== 'Unknown') {
        commonClusters.push('location');
        similarityScore += 0.25;
      }

      // Education level similarity (weight: 0.20)
      if (profile1.educationLevel === profile2.educationLevel && profile1.educationLevel !== 'Unknown') {
        commonClusters.push('education');
        similarityScore += 0.20;
      }

      // Profession category similarity (weight: 0.20)
      if (profile1.professionCategory === profile2.professionCategory && profile1.professionCategory !== 'Unknown') {
        commonClusters.push('profession');
        similarityScore += 0.20;
      }

      // Relationship goal similarity (weight: 0.20) - critical for compatibility
      if (profile1.relationshipGoal === profile2.relationshipGoal && profile1.relationshipGoal !== 'Unknown') {
        commonClusters.push('relationshipGoal');
        similarityScore += 0.20;
      }

      return {
        userId: profile2.userId,
        similarityScore: Math.max(0, Math.min(1, similarityScore)),
        commonClusters,
        demographicProfile: profile2
      };

    } catch (error) {
      console.error('[DEMOGRAPHIC-CLUSTERING] Error calculating similarity:', error);
      
      return {
        userId: profile2.userId,
        similarityScore: 0.5, // Neutral fallback
        commonClusters: [],
        demographicProfile: profile2
      };
    }
  }

  /**
   * Find users with similar demographic profiles
   * For enhanced collaborative filtering
   */
  async findSimilarDemographicUsers(targetUserId: number, limit: number = 10): Promise<ClusterSimilarity[]> {
    try {
      console.log(`[DEMOGRAPHIC-CLUSTERING] Finding similar users for ${targetUserId}`);

      const targetProfile = await this.generateDemographicProfile(targetUserId);

      // Get candidate users from database (active users only)
      const candidateUsers = await getSql()`
        SELECT DISTINCT u.id
        FROM users u
        WHERE u.id != ${targetUserId}
          AND (
            EXISTS (SELECT 1 FROM swipe_history sh WHERE sh.user_id = u.id AND sh.timestamp >= NOW() - INTERVAL '90 days')
            OR EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id AND m.created_at >= NOW() - INTERVAL '90 days')
          )
        ORDER BY RANDOM()
        LIMIT ${limit * 2}
      `;

      const similarUsers: ClusterSimilarity[] = [];

      for (const candidate of candidateUsers) {
        const candidateProfile = await this.generateDemographicProfile(candidate.id);
        const similarity = this.calculateDemographicSimilarity(targetProfile, candidateProfile);
        
        similarUsers.push(similarity);
      }

      // Sort by similarity and return top matches
      const topSimilarUsers = similarUsers
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      console.log(`[DEMOGRAPHIC-CLUSTERING] Found ${topSimilarUsers.length} similar users for ${targetUserId}`);

      return topSimilarUsers;

    } catch (error) {
      console.error(`[DEMOGRAPHIC-CLUSTERING] Error finding similar users for ${targetUserId}:`, error);
      return [];
    }
  }

  /**
   * Get users in the same demographic cluster
   * Useful for cold start problems
   */
  async getUsersInSameCluster(targetUserId: number, clusterType: 'age' | 'location' | 'education' | 'profession' | 'relationship'): Promise<number[]> {
    try {
      const targetProfile = await this.generateDemographicProfile(targetUserId);
      
      let clusterValue: string;
      switch (clusterType) {
        case 'age':
          clusterValue = targetProfile.ageGroup;
          break;
        case 'location':
          clusterValue = targetProfile.locationCluster;
          break;
        case 'education':
          clusterValue = targetProfile.educationLevel;
          break;
        case 'profession':
          clusterValue = targetProfile.professionCategory;
          break;
        case 'relationship':
          clusterValue = targetProfile.relationshipGoal;
          break;
        default:
          return [];
      }

      if (clusterValue === 'Unknown') {
        return [];
      }

      // Find other users in the same cluster
      const clusterUsers = await getSql()`
        SELECT DISTINCT u.id
        FROM users u
        WHERE u.id != ${targetUserId}
          AND (
            EXISTS (SELECT 1 FROM swipe_history sh WHERE sh.user_id = u.id)
            OR EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id)
          )
      `;

      const sameClusterUsers: number[] = [];

      for (const user of clusterUsers) {
        const userProfile = await this.generateDemographicProfile(user.id);
        
        let userClusterValue: string;
        switch (clusterType) {
          case 'age':
            userClusterValue = userProfile.ageGroup;
            break;
          case 'location':
            userClusterValue = userProfile.locationCluster;
            break;
          case 'education':
            userClusterValue = userProfile.educationLevel;
            break;
          case 'profession':
            userClusterValue = userProfile.professionCategory;
            break;
          case 'relationship':
            userClusterValue = userProfile.relationshipGoal;
            break;
          default:
            continue;
        }

        if (userClusterValue === clusterValue) {
          sameClusterUsers.push(user.id);
        }
      }

      console.log(`[DEMOGRAPHIC-CLUSTERING] Found ${sameClusterUsers.length} users in same ${clusterType} cluster as user ${targetUserId}`);

      return sameClusterUsers;

    } catch (error) {
      console.error(`[DEMOGRAPHIC-CLUSTERING] Error finding cluster users:`, error);
      return [];
    }
  }

  /**
   * Generate cluster statistics for analytics
   */
  async generateClusterStatistics(): Promise<Record<string, any>> {
    try {
      console.log('[DEMOGRAPHIC-CLUSTERING] Generating cluster statistics');

      const activeUsers = await getSql()`
        SELECT DISTINCT u.id
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM swipe_history sh WHERE sh.user_id = u.id 
          UNION 
          SELECT 1 FROM messages m WHERE m.sender_id = u.id
        )
        LIMIT 50
      `;

      const statistics = {
        totalActiveUsers: activeUsers.length,
        ageClusters: {} as Record<string, number>,
        locationClusters: {} as Record<string, number>,
        educationClusters: {} as Record<string, number>,
        professionClusters: {} as Record<string, number>,
        relationshipClusters: {} as Record<string, number>
      };

      for (const user of activeUsers) {
        const profile = await this.generateDemographicProfile(user.id);
        
        // Count age clusters
        statistics.ageClusters[profile.ageGroup] = (statistics.ageClusters[profile.ageGroup] || 0) + 1;
        
        // Count location clusters
        statistics.locationClusters[profile.locationCluster] = (statistics.locationClusters[profile.locationCluster] || 0) + 1;
        
        // Count education clusters
        statistics.educationClusters[profile.educationLevel] = (statistics.educationClusters[profile.educationLevel] || 0) + 1;
        
        // Count profession clusters
        statistics.professionClusters[profile.professionCategory] = (statistics.professionClusters[profile.professionCategory] || 0) + 1;
        
        // Count relationship clusters
        statistics.relationshipClusters[profile.relationshipGoal] = (statistics.relationshipClusters[profile.relationshipGoal] || 0) + 1;
      }

      console.log('[DEMOGRAPHIC-CLUSTERING] Cluster statistics generated:', statistics);

      return statistics;

    } catch (error) {
      console.error('[DEMOGRAPHIC-CLUSTERING] Error generating statistics:', error);
      return {};
    }
  }
}

// Export singleton instance
export const demographicClustering = new DemographicClustering();