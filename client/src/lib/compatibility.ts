import { User } from "@shared/schema";

// Advanced Big 5 Personality Compatibility Algorithm
// Based on scientifically-grounded trait scoring with weighted importance
function calculateBig5TraitCompatibility(
  trait1: number | null,
  trait2: number | null,
  traitType: string,
): number {
  if (
    trait1 === null ||
    trait2 === null ||
    trait1 === undefined ||
    trait2 === undefined
  ) {
    return 75; // Default when data missing
  }

  const diff = Math.abs(trait1 - trait2);
  const avg = (trait1 + trait2) / 2;

  switch (traitType) {
    case "Agreeableness":
      // High similarity crucial for relationship harmony
      // Research shows agreeable couples have better satisfaction
      const agreeabilityBonus = Math.min(trait1, trait2) * 0.3; // Bonus for both being agreeable
      return Math.min(100, Math.max(20, 100 - diff * 1.2 + agreeabilityBonus));

    case "Conscientiousness":
      // Moderate similarity works well, some structure differences okay
      // Balance between organization and spontaneity
      if (diff <= 15) return 95; // Very compatible when similar
      if (diff <= 30) return Math.max(75, 100 - diff * 0.8); // Good compatibility
      return Math.max(50, 100 - diff * 1.1); // Challenging but workable

    case "Extraversion":
      // Most tolerant of differences - complementarity can work
      // Introverts and extraverts can balance each other
      if (diff <= 20) return 95; // Similar energy levels
      if (diff >= 40 && diff <= 60) return 85; // Classic introvert-extravert pairing
      return Math.max(70, 100 - diff * 0.6); // Generally adaptable

    case "Neuroticism":
      // Lower is better for both - emotional stability crucial
      // High neuroticism in either partner creates challenges
      const maxNeuroticism = Math.max(trait1, trait2);
      const minNeuroticism = Math.min(trait1, trait2);

      // Penalty for high neuroticism
      const stabilityBonus = (100 - maxNeuroticism) * 0.4;
      // Penalty for big differences in emotional stability
      const differencesPenalty = diff * 0.8;

      return Math.min(
        100,
        Math.max(30, 85 + stabilityBonus - differencesPenalty),
      );

    case "Openness":
      // Moderate differences can be stimulating
      // Too similar = boring, too different = disconnect
      if (diff <= 10) return 80; // Very similar might lack stimulation
      if (diff >= 15 && diff <= 35) return 95; // Sweet spot for growth
      if (diff >= 40 && diff <= 55) return 85; // Some intellectual challenge
      return Math.max(45, 100 - diff * 1.1); // Too different creates disconnect

    default:
      return Math.max(50, 100 - diff);
  }
}

// Unified Big 5 Personality Compatibility Calculator
// This replaces the old demographic-based algorithm and provides scientific personality matching
export function calculateCompatibility(
  user1: User | null | undefined,
  user2: User,
): number | null {
  if (!user1) {
    // No authenticated baseline – do not fabricate a percentage
    return null;
  }

  // Try to parse Big 5 data for both users
  let user1Big5 = null;
  let user2Big5 = null;

  try {
    if (user1.big5Profile) {
      user1Big5 = JSON.parse(user1.big5Profile);
    }
  } catch (error) {
    console.error("Failed to parse user1 Big 5 profile:", error);
  }

  try {
    if (user2.big5Profile) {
      user2Big5 = JSON.parse(user2.big5Profile);
    }
  } catch (error) {
    console.error("Failed to parse user2 Big 5 profile:", error);
  }

  // If we have Big 5 data for both users, use the scientific algorithm
  if (user1Big5?.traitPercentiles && user2Big5?.traitPercentiles) {
    const user1Traits = user1Big5.traitPercentiles;
    const user2Traits = user2Big5.traitPercentiles;

    // Calculate compatibility for each Big 5 trait
    const traits = [
      "Openness",
      "Conscientiousness",
      "Extraversion",
      "Agreeableness",
      "Neuroticism",
    ];
    const weights = [0.15, 0.2, 0.2, 0.25, 0.2]; // Agreeableness and emotional stability matter most

    let totalWeightedScore = 0;
    let totalWeight = 0;

    traits.forEach((traitName, index) => {
      const score = calculateBig5TraitCompatibility(
        user1Traits[traitName] || 0,
        user2Traits[traitName] || 0,
        traitName,
      );
      totalWeightedScore += score * weights[index];
      totalWeight += weights[index];
    });

    return Math.round(totalWeightedScore / totalWeight);
  }

  // No Big 5 on one or both sides -> no percentage until assessments are complete
  return null;
}

// Individual trait compatibility scores for detailed analysis
export function getTraitCompatibilityScores(
  user1: User | null | undefined,
  user2: User,
) {
  if (!user1) {
    return null;
  }

  // Try to parse Big 5 data for both users
  let user1Big5 = null;
  let user2Big5 = null;

  try {
    if (user1.big5Profile) {
      user1Big5 = JSON.parse(user1.big5Profile);
    }
  } catch (error) {
    console.error("Failed to parse user1 Big 5 profile:", error);
    return null;
  }

  try {
    if (user2.big5Profile) {
      user2Big5 = JSON.parse(user2.big5Profile);
    }
  } catch (error) {
    console.error("Failed to parse user2 Big 5 profile:", error);
    return null;
  }

  if (!user1Big5?.traitPercentiles || !user2Big5?.traitPercentiles) {
    return null;
  }

  const user1Traits = user1Big5.traitPercentiles;
  const user2Traits = user2Big5.traitPercentiles;

  return {
    openness: {
      score: calculateBig5TraitCompatibility(
        user1Traits.Openness || 0,
        user2Traits.Openness || 0,
        "Openness",
      ),
      user1Score: user1Traits.Openness || 0,
      user2Score: user2Traits.Openness || 0,
    },
    conscientiousness: {
      score: calculateBig5TraitCompatibility(
        user1Traits.Conscientiousness || 0,
        user2Traits.Conscientiousness || 0,
        "Conscientiousness",
      ),
      user1Score: user1Traits.Conscientiousness || 0,
      user2Score: user2Traits.Conscientiousness || 0,
    },
    extraversion: {
      score: calculateBig5TraitCompatibility(
        user1Traits.Extraversion || 0,
        user2Traits.Extraversion || 0,
        "Extraversion",
      ),
      user1Score: user1Traits.Extraversion || 0,
      user2Score: user2Traits.Extraversion || 0,
    },
    agreeableness: {
      score: calculateBig5TraitCompatibility(
        user1Traits.Agreeableness || 0,
        user2Traits.Agreeableness || 0,
        "Agreeableness",
      ),
      user1Score: user1Traits.Agreeableness || 0,
      user2Score: user2Traits.Agreeableness || 0,
    },
    neuroticism: {
      score: calculateBig5TraitCompatibility(
        user1Traits.Neuroticism || 0,
        user2Traits.Neuroticism || 0,
        "Neuroticism",
      ),
      user1Score: user1Traits.Neuroticism || 0,
      user2Score: user2Traits.Neuroticism || 0,
    },
  };
}
