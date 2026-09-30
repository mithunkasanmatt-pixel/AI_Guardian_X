import { BiometricPressureData } from "./biometric-provider";
import { DerivedPressureProfile } from "./pressure-analyzer";
import { APP_CONFIG } from "../config";

export interface PressureMatchResult {
  similarityScore: number; // 0 to 100
  passed: boolean;
  details: {
    pressureSimilarity: number;
    durationSimilarity: number;
    varianceSimilarity: number;
  };
}

/**
 * Match live finger pressure sample against stored baseline profile
 */
export function matchPressureProfile(
  liveSample: BiometricPressureData,
  storedProfile: DerivedPressureProfile,
  customThreshold?: number
): PressureMatchResult {
  const threshold = customThreshold ?? APP_CONFIG.pressureSimilarityThreshold;

  // If device/browser does not provide touch-pressure information (averagePressure is 0) on either stored profile or live sample
  if (!storedProfile || storedProfile.averagePressure === 0 || !liveSample || liveSample.averagePressure === 0) {
    return {
      similarityScore: 100,
      passed: true,
      details: {
        pressureSimilarity: 100,
        durationSimilarity: 100,
        varianceSimilarity: 100,
      },
    };
  }

  // 1. Pressure Value Similarity (Touch Force)
  const pressureRatio =
    Math.min(liveSample.averagePressure, storedProfile.averagePressure) /
    Math.max(liveSample.averagePressure, storedProfile.averagePressure, 0.001);
  const pressureSimilarity = Math.round(pressureRatio * 100);

  // 2. Pressure Duration Similarity (Soft tolerance to account for natural variations in hold duration)
  const durDiff = Math.abs(liveSample.pressureDurationMs - storedProfile.averagePressureDuration);
  const maxDur = Math.max(liveSample.pressureDurationMs, storedProfile.averagePressureDuration, 500);
  const durationSimilarity = Math.round(Math.max(60, (1 - durDiff / (maxDur * 2)) * 100));

  // 3. Variance Similarity
  const varDiff = Math.abs(liveSample.pressureVariance - storedProfile.pressureVariance);
  const maxVar = Math.max(liveSample.pressureVariance, storedProfile.pressureVariance, 0.01);
  const varianceSimilarity = Math.round(Math.max(40, (1 - varDiff / maxVar) * 100));

  // Weighted overall pressure score (70% touch force, 15% duration, 15% variance)
  const similarityScore = Math.round(
    pressureSimilarity * 0.70 + durationSimilarity * 0.15 + varianceSimilarity * 0.15
  );

  const passed = similarityScore >= threshold;

  return {
    similarityScore,
    passed,
    details: {
      pressureSimilarity,
      durationSimilarity,
      varianceSimilarity,
    },
  };
}
