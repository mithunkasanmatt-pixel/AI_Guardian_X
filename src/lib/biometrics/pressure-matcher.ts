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

  // 1. Pressure Value Similarity
  const pressureRatio =
    Math.min(liveSample.averagePressure, storedProfile.averagePressure) /
    Math.max(liveSample.averagePressure, storedProfile.averagePressure, 0.001);
  const pressureSimilarity = Math.round(pressureRatio * 100);

  // 2. Pressure Duration Similarity
  const durationRatio =
    Math.min(liveSample.pressureDurationMs, storedProfile.averagePressureDuration) /
    Math.max(liveSample.pressureDurationMs, storedProfile.averagePressureDuration, 1);
  const durationSimilarity = Math.round(durationRatio * 100);

  // 3. Variance Similarity
  const varDiff = Math.abs(liveSample.pressureVariance - storedProfile.pressureVariance);
  const maxVar = Math.max(liveSample.pressureVariance, storedProfile.pressureVariance, 0.01);
  const varianceSimilarity = Math.round(Math.max(0, 1 - varDiff / maxVar) * 100);

  // Weighted overall pressure score
  const similarityScore = Math.round(
    pressureSimilarity * 0.5 + durationSimilarity * 0.3 + varianceSimilarity * 0.2
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
