import { DerivedTypingFeatures, TypingProfileData } from "./typing-analyzer";
import { APP_CONFIG } from "../config";

export interface TypingMatchResult {
  similarityScore: number; // 0 to 100
  passed: boolean;
  details: {
    speedSimilarity: number;
    intervalSimilarity: number;
    pauseSimilarity: number;
    consistencySimilarity: number;
    patternSimilarity: number;
  };
}

/**
 * Compare two typing attempts during enrollment to ensure user typed consistently
 */
export function compareEnrollmentAttempts(
  attempt1: DerivedTypingFeatures,
  attempt2: DerivedTypingFeatures
): { isConsistent: boolean; similarityScore: number; reason?: string } {
  const speedRatio =
    Math.min(attempt1.averageTypingSpeedCPM, attempt2.averageTypingSpeedCPM) /
    Math.max(attempt1.averageTypingSpeedCPM, attempt2.averageTypingSpeedCPM, 1);

  const intervalRatio =
    Math.min(attempt1.averageKeyIntervalMs, attempt2.averageKeyIntervalMs) /
    Math.max(attempt1.averageKeyIntervalMs, attempt2.averageKeyIntervalMs, 1);

  const similarityScore = Math.round((speedRatio * 0.5 + intervalRatio * 0.5) * 100);

  if (similarityScore < 45) {
    return {
      isConsistent: false,
      similarityScore,
      reason: "The typing speeds in your two attempts differed significantly. Please try typing at your natural steady pace.",
    };
  }

  return { isConsistent: true, similarityScore };
}

/**
 * Compare live login attempt against registered stored profile
 */
export function matchTypingProfile(
  liveAttempt: DerivedTypingFeatures,
  storedProfile: {
    averageTypingSpeed: number;
    averageKeyInterval: number;
    averagePauseDuration: number;
    backspaceRate: number;
    consistencyScore: number;
    timingPatternJson: string;
  },
  customThreshold?: number
): TypingMatchResult {
  const threshold = customThreshold ?? APP_CONFIG.typingSimilarityThreshold;

  // 1. Speed Similarity (CPM)
  const speedRatio =
    Math.min(liveAttempt.averageTypingSpeedCPM, storedProfile.averageTypingSpeed) /
    Math.max(liveAttempt.averageTypingSpeedCPM, storedProfile.averageTypingSpeed, 1);
  const speedSimilarity = Math.round(speedRatio * 100);

  // 2. Interval Similarity (ms)
  const intervalRatio =
    Math.min(liveAttempt.averageKeyIntervalMs, storedProfile.averageKeyInterval) /
    Math.max(liveAttempt.averageKeyIntervalMs, storedProfile.averageKeyInterval, 1);
  const intervalSimilarity = Math.round(intervalRatio * 100);

  // 3. Pause Duration Similarity
  const pauseDiff = Math.abs(liveAttempt.averagePauseDurationMs - storedProfile.averagePauseDuration);
  const maxPause = Math.max(liveAttempt.averagePauseDurationMs, storedProfile.averagePauseDuration, 500);
  const pauseSimilarity = Math.round(Math.max(0, 1 - pauseDiff / maxPause) * 100);

  // 4. Consistency Score Similarity
  const constDiff = Math.abs(liveAttempt.consistencyScore - storedProfile.consistencyScore);
  const consistencySimilarity = Math.round(Math.max(0, 100 - constDiff));

  // 5. Pattern Similarity (vector comparison)
  let patternSimilarity = 70;
  try {
    const storedPattern: number[] = JSON.parse(storedProfile.timingPatternJson || "[]");
    const livePattern = liveAttempt.interKeyTimings;

    if (storedPattern.length > 0 && livePattern.length > 0) {
      const minLen = Math.min(storedPattern.length, livePattern.length);
      let matchSum = 0;
      for (let i = 0; i < minLen; i++) {
        const r = Math.min(storedPattern[i], livePattern[i]) / Math.max(storedPattern[i], livePattern[i], 1);
        matchSum += r;
      }
      patternSimilarity = Math.round((matchSum / minLen) * 100);
    }
  } catch {
    patternSimilarity = 70;
  }

  const similarityScore = Math.round(
    speedSimilarity * 0.35 +
    intervalSimilarity * 0.35 +
    pauseSimilarity * 0.1 +
    consistencySimilarity * 0.1 +
    patternSimilarity * 0.1
  );

  const passed = similarityScore >= threshold;

  return {
    similarityScore,
    passed,
    details: {
      speedSimilarity,
      intervalSimilarity,
      pauseSimilarity,
      consistencySimilarity,
      patternSimilarity,
    },
  };
}
