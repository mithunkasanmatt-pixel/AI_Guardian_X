import { DerivedSwipeFeatures } from "./swipe-analyzer";
import { APP_CONFIG } from "../config";

export interface SwipeMatchResult {
  similarityScore: number; // 0 to 100
  sequenceMatch: boolean;
  passed: boolean;
  details: {
    sequenceSimilarity: number;
    durationSimilarity: number;
    speedSimilarity: number;
    consistencySimilarity: number;
  };
}

/**
 * Check consistency between 2 enrollment swipe attempts
 */
export function compareSwipeEnrollmentAttempts(
  attempt1: DerivedSwipeFeatures,
  attempt2: DerivedSwipeFeatures
): { isConsistent: boolean; similarityScore: number; reason?: string } {
  // Check gesture sequence match
  if (attempt1.sequenceString !== attempt2.sequenceString) {
    return {
      isConsistent: false,
      similarityScore: 30,
      reason: `Gesture sequences differed: Attempt 1 was "${attempt1.sequenceString || 'None'}", while Attempt 2 was "${attempt2.sequenceString || 'None'}". Please repeat the expected gesture sequence.`,
    };
  }

  // Duration ratio
  const durationRatio =
    Math.min(attempt1.totalDurationMs, attempt2.totalDurationMs) /
    Math.max(attempt1.totalDurationMs, attempt2.totalDurationMs, 1);

  const similarityScore = Math.round(durationRatio * 100);

  if (similarityScore < 40) {
    return {
      isConsistent: false,
      similarityScore,
      reason: "Swipe timing was too inconsistent between attempts. Please perform the gesture at your natural fluid speed.",
    };
  }

  return { isConsistent: true, similarityScore };
}

/**
 * Match live swipe attempt against stored profile
 */
export function matchSwipeProfile(
  liveAttempt: DerivedSwipeFeatures,
  storedProfile: {
    gestureSequence: string;
    normalizedDistancePatternJson: string;
    averageGestureDuration?: number;
    averageDuration?: number;
    movementSpeedProfileJson: string;
    directionPattern?: string;
    directionProfile?: string;
    consistencyScore: number;
  },
  customThreshold?: number
): SwipeMatchResult {
  const threshold = customThreshold ?? APP_CONFIG.swipeSimilarityThreshold;
  const avgDuration = storedProfile.averageGestureDuration ?? storedProfile.averageDuration ?? 1000;

  // 1. Sequence match
  const sequenceMatch = liveAttempt.sequenceString === storedProfile.gestureSequence;
  const sequenceSimilarity = sequenceMatch ? 100 : (liveAttempt.gestureSequence.length > 0 ? 40 : 0);

  // 2. Duration Similarity
  const durationRatio =
    Math.min(liveAttempt.totalDurationMs, avgDuration) /
    Math.max(liveAttempt.totalDurationMs, avgDuration, 1);
  const durationSimilarity = Math.round(durationRatio * 100);

  // 3. Speed Profile Similarity
  let speedSimilarity = 70;
  try {
    const storedSpeeds: number[] = JSON.parse(storedProfile.movementSpeedProfileJson || "[]");
    const liveSpeeds = liveAttempt.movementSpeedProfile;

    if (storedSpeeds.length > 0 && liveSpeeds.length > 0) {
      const minLen = Math.min(storedSpeeds.length, liveSpeeds.length);
      let speedSum = 0;
      for (let i = 0; i < minLen; i++) {
        const ratio = Math.min(storedSpeeds[i], liveSpeeds[i]) / Math.max(storedSpeeds[i], liveSpeeds[i], 0.0001);
        speedSum += ratio;
      }
      speedSimilarity = Math.round((speedSum / minLen) * 100);
    }
  } catch {
    speedSimilarity = 70;
  }

  // 4. Consistency Similarity
  const constDiff = Math.abs(liveAttempt.consistencyScore - storedProfile.consistencyScore);
  const consistencySimilarity = Math.round(Math.max(0, 100 - constDiff));

  // If sequence does not match at all, heavily penalize total similarity score
  let similarityScore: number;
  if (!sequenceMatch) {
    similarityScore = Math.round(sequenceSimilarity * 0.4);
  } else {
    similarityScore = Math.round(
      sequenceSimilarity * 0.4 +
      durationSimilarity * 0.3 +
      speedSimilarity * 0.2 +
      consistencySimilarity * 0.1
    );
  }

  const passed = similarityScore >= threshold && sequenceMatch;

  return {
    similarityScore,
    sequenceMatch,
    passed,
    details: {
      sequenceSimilarity,
      durationSimilarity,
      speedSimilarity,
      consistencySimilarity,
    },
  };
}
