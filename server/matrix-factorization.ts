/**
 * MATRIX FACTORIZATION (SIMPLIFIED SVD) FOR COLLABORATIVE FILTERING
 * 
 * Advanced recommendation system using Singular Value Decomposition
 * to generate user and item embeddings from interaction data
 */

import { storage } from "./storage";

export interface UserItemInteraction {
  userId: number;
  itemId: number;
  rating: number; // -1 (dislike), 0 (no interaction), +1 (like), +2 (match)
  timestamp: Date;
}

export interface UserEmbedding {
  userId: number;
  factors: number[];
  bias: number;
  interactionCount: number;
}

export interface ItemEmbedding {
  itemId: number;
  factors: number[];
  bias: number;
  popularityScore: number;
}

export interface MatrixFactorizationModel {
  userEmbeddings: Map<number, UserEmbedding>;
  itemEmbeddings: Map<number, ItemEmbedding>;
  globalBias: number;
  numFactors: number;
  learningRate: number;
  regularization: number;
  trained: boolean;
}

export class MatrixFactorization {
  private model: MatrixFactorizationModel;
  private readonly NUM_FACTORS = 50; // Latent factors for embeddings
  private readonly LEARNING_RATE = 0.01;
  private readonly REGULARIZATION = 0.01;
  private readonly MAX_ITERATIONS = 100;
  private readonly MIN_IMPROVEMENT = 0.001;

  constructor() {
    this.model = {
      userEmbeddings: new Map(),
      itemEmbeddings: new Map(),
      globalBias: 0,
      numFactors: this.NUM_FACTORS,
      learningRate: this.LEARNING_RATE,
      regularization: this.REGULARIZATION,
      trained: false
    };
  }

  /**
   * Build user-item interaction matrix from matches and swipe history
   */
  async buildInteractionMatrix(): Promise<UserItemInteraction[]> {
    try {
      console.log('[MATRIX-FACTORIZATION] Building user-item interaction matrix...');
      const interactions: UserItemInteraction[] = [];

      // Get all matches data
      const allMatches = await this.getAllMatches();
      console.log(`[MATRIX-FACTORIZATION] Found ${allMatches.length} match interactions`);

      // Process matches: +2 for successful match, -1 for explicit dislike
      for (const match of allMatches) {
        const rating = match.matched ? 2 : (match.isDislike ? -1 : 0);
        if (rating !== 0) {
          interactions.push({
            userId: match.userId1,
            itemId: match.userId2,
            rating,
            timestamp: match.createdAt || new Date()
          });
          
          // Add bidirectional interaction for matches
          interactions.push({
            userId: match.userId2,
            itemId: match.userId1,
            rating,
            timestamp: match.createdAt || new Date()
          });
        }
      }

      // Get all swipe history data
      const allSwipes = await this.getAllSwipeHistory();
      console.log(`[MATRIX-FACTORIZATION] Found ${allSwipes.length} swipe interactions`);

      // Process swipes: +1 for like/star, -1 for dislike
      for (const swipe of allSwipes) {
        let rating = 0;
        if (swipe.action === 'like') rating = 1;
        else if (swipe.action === 'star') rating = 2; // Stars are stronger signals
        else if (swipe.action === 'dislike') rating = -1;

        if (rating !== 0) {
          interactions.push({
            userId: swipe.userId,
            itemId: swipe.targetUserId,
            rating,
            timestamp: swipe.timestamp || new Date()
          });
        }
      }

      console.log(`[MATRIX-FACTORIZATION] Built interaction matrix with ${interactions.length} interactions`);
      
      // Deduplicate interactions (keep most recent/strongest rating)
      const deduplicatedInteractions = this.deduplicateInteractions(interactions);
      console.log(`[MATRIX-FACTORIZATION] After deduplication: ${deduplicatedInteractions.length} unique interactions`);
      
      return deduplicatedInteractions;

    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error building interaction matrix:', error);
      return [];
    }
  }

  /**
   * Train the matrix factorization model using gradient descent
   */
  async trainModel(): Promise<boolean> {
    try {
      console.log('[MATRIX-FACTORIZATION] Starting model training...');
      
      const interactions = await this.buildInteractionMatrix();
      if (interactions.length === 0) {
        console.log('[MATRIX-FACTORIZATION] No interactions available for training');
        return false;
      }

      // Initialize embeddings
      this.initializeEmbeddings(interactions);
      
      // Calculate global bias (mean rating)
      this.model.globalBias = interactions.reduce((sum, i) => sum + i.rating, 0) / interactions.length;
      console.log(`[MATRIX-FACTORIZATION] Global bias: ${this.model.globalBias.toFixed(3)}`);

      let previousError = Infinity;
      let improvementCount = 0;

      // Gradient descent training
      for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
        let totalError = 0;
        let trainingCount = 0;

        // Shuffle interactions for better convergence
        const shuffledInteractions = this.shuffleArray([...interactions]);

        for (const interaction of shuffledInteractions) {
          const error = this.performGradientDescentStep(interaction);
          totalError += error * error;
          trainingCount++;
        }

        const rmse = Math.sqrt(totalError / trainingCount);
        const improvement = previousError - rmse;

        if (iteration % 10 === 0) {
          console.log(`[MATRIX-FACTORIZATION] Iteration ${iteration}: RMSE = ${rmse.toFixed(4)}, Improvement = ${improvement.toFixed(4)}`);
        }

        // Check for convergence
        if (improvement < this.MIN_IMPROVEMENT) {
          improvementCount++;
          if (improvementCount >= 3) {
            console.log(`[MATRIX-FACTORIZATION] Converged at iteration ${iteration}`);
            break;
          }
        } else {
          improvementCount = 0;
        }

        previousError = rmse;
      }

      this.model.trained = true;
      console.log(`[MATRIX-FACTORIZATION] Training completed. Model ready for predictions.`);
      console.log(`[MATRIX-FACTORIZATION] User embeddings: ${this.model.userEmbeddings.size}, Item embeddings: ${this.model.itemEmbeddings.size}`);
      
      return true;

    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error training model:', error);
      return false;
    }
  }

  /**
   * Predict user-item rating using trained embeddings
   */
  predictRating(userId: number, itemId: number): number {
    if (!this.model.trained) {
      return 0.5; // Neutral score for untrained model
    }

    const userEmbedding = this.model.userEmbeddings.get(userId);
    const itemEmbedding = this.model.itemEmbeddings.get(itemId);

    if (!userEmbedding || !itemEmbedding) {
      return this.model.globalBias; // Use global bias for unknown users/items
    }

    // Calculate dot product of user and item factors
    let dotProduct = 0;
    for (let f = 0; f < this.NUM_FACTORS; f++) {
      dotProduct += userEmbedding.factors[f] * itemEmbedding.factors[f];
    }

    // Prediction = global_bias + user_bias + item_bias + dot_product
    const prediction = this.model.globalBias + userEmbedding.bias + itemEmbedding.bias + dotProduct;
    
    // Normalize to [0, 1] range
    return Math.max(0, Math.min(1, (prediction + 2) / 4)); // Map [-2, 2] to [0, 1]
  }

  /**
   * Find users with similar embeddings
   */
  findSimilarUsers(userId: number, topK: number = 10): number[] {
    if (!this.model.trained) return [];

    const userEmbedding = this.model.userEmbeddings.get(userId);
    if (!userEmbedding) return [];

    const similarities: { userId: number; similarity: number }[] = [];

    for (const [otherUserId, otherEmbedding] of this.model.userEmbeddings) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateEmbeddingSimilarity(userEmbedding.factors, otherEmbedding.factors);
      similarities.push({ userId: otherUserId, similarity });
    }

    return similarities
      .filter(s => s.similarity > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(s => s.userId);
  }

  /**
   * Get collaborative filtering score for user-candidate pair
   */
  getCollaborativeScore(userId: number, candidateId: number): number {
    try {
      // Direct prediction from matrix factorization
      const directScore = this.predictRating(userId, candidateId);
      
      // Enhance with similar users' preferences
      const similarUsers = this.findSimilarUsers(userId, 5);
      let similarityBoost = 0;
      
      if (similarUsers.length > 0) {
        let positiveVotes = 0;
        for (const similarUserId of similarUsers) {
          const similarUserScore = this.predictRating(similarUserId, candidateId);
          if (similarUserScore > 0.6) {
            positiveVotes++;
          }
        }
        similarityBoost = (positiveVotes / similarUsers.length) * 0.2; // Max 20% boost
      }

      const finalScore = Math.min(1.0, directScore + similarityBoost);
      
      console.log(`[MATRIX-FACTORIZATION] User ${userId} → User ${candidateId}: Direct=${directScore.toFixed(3)}, Boost=${similarityBoost.toFixed(3)}, Final=${finalScore.toFixed(3)}`);
      
      return finalScore;

    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error calculating collaborative score:', error);
      return 0.5; // Neutral fallback
    }
  }

  // Private helper methods

  private async getAllMatches(): Promise<any[]> {
    try {
      // Get matches for all users - this is a simplified approach
      // In production, you might want to implement a more efficient batch query
      const matches: any[] = [];
      
      // Query matches table directly via storage
      // Since we need all matches, we'll implement a helper method
      const allMatches = await storage.getAllMatches();
      return allMatches || [];
      
    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error getting all matches:', error);
      return [];
    }
  }

  private async getAllSwipeHistory(): Promise<any[]> {
    try {
      // Get all swipe history - similar approach
      const allSwipes = await storage.getAllSwipeHistory();
      return allSwipes || [];
      
    } catch (error) {
      console.error('[MATRIX-FACTORIZATION] Error getting all swipe history:', error);
      return [];
    }
  }

  private deduplicateInteractions(interactions: UserItemInteraction[]): UserItemInteraction[] {
    const interactionMap = new Map<string, UserItemInteraction>();
    
    for (const interaction of interactions) {
      const key = `${interaction.userId}-${interaction.itemId}`;
      const existing = interactionMap.get(key);
      
      if (!existing || Math.abs(interaction.rating) > Math.abs(existing.rating) || 
          interaction.timestamp > existing.timestamp) {
        interactionMap.set(key, interaction);
      }
    }
    
    return Array.from(interactionMap.values());
  }

  private initializeEmbeddings(interactions: UserItemInteraction[]): void {
    const users = new Set<number>();
    const items = new Set<number>();
    
    // Collect all unique users and items
    for (const interaction of interactions) {
      users.add(interaction.userId);
      items.add(interaction.itemId);
    }

    console.log(`[MATRIX-FACTORIZATION] Initializing embeddings for ${users.size} users and ${items.size} items`);

    // Initialize user embeddings
    for (const userId of users) {
      const factors = Array(this.NUM_FACTORS).fill(0).map(() => (Math.random() - 0.5) * 0.1);
      this.model.userEmbeddings.set(userId, {
        userId,
        factors,
        bias: 0,
        interactionCount: interactions.filter(i => i.userId === userId).length
      });
    }

    // Initialize item embeddings
    for (const itemId of items) {
      const factors = Array(this.NUM_FACTORS).fill(0).map(() => (Math.random() - 0.5) * 0.1);
      const itemInteractions = interactions.filter(i => i.itemId === itemId);
      const popularity = itemInteractions.length;
      
      this.model.itemEmbeddings.set(itemId, {
        itemId,
        factors,
        bias: 0,
        popularityScore: popularity
      });
    }
  }

  private performGradientDescentStep(interaction: UserItemInteraction): number {
    const userEmbedding = this.model.userEmbeddings.get(interaction.userId);
    const itemEmbedding = this.model.itemEmbeddings.get(interaction.itemId);
    
    if (!userEmbedding || !itemEmbedding) return 0;

    // Current prediction
    let prediction = this.model.globalBias + userEmbedding.bias + itemEmbedding.bias;
    for (let f = 0; f < this.NUM_FACTORS; f++) {
      prediction += userEmbedding.factors[f] * itemEmbedding.factors[f];
    }

    // Calculate error
    const error = interaction.rating - prediction;

    // Update biases
    const userBiasOld = userEmbedding.bias;
    const itemBiasOld = itemEmbedding.bias;
    
    userEmbedding.bias += this.LEARNING_RATE * (error - this.REGULARIZATION * userBiasOld);
    itemEmbedding.bias += this.LEARNING_RATE * (error - this.REGULARIZATION * itemBiasOld);

    // Update factors
    for (let f = 0; f < this.NUM_FACTORS; f++) {
      const userFactorOld = userEmbedding.factors[f];
      const itemFactorOld = itemEmbedding.factors[f];
      
      userEmbedding.factors[f] += this.LEARNING_RATE * 
        (error * itemFactorOld - this.REGULARIZATION * userFactorOld);
      itemEmbedding.factors[f] += this.LEARNING_RATE * 
        (error * userFactorOld - this.REGULARIZATION * itemFactorOld);
    }

    return error;
  }

  private calculateEmbeddingSimilarity(factors1: number[], factors2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < factors1.length; i++) {
      dotProduct += factors1[i] * factors2[i];
      norm1 += factors1[i] * factors1[i];
      norm2 += factors2[i] * factors2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const matrixFactorization = new MatrixFactorization();