import { BiometricPressureData } from "./biometric-provider";

export interface DerivedPressureProfile {
  sampleCount: number;
  averagePressure: number;
  minimumPressure: number;
  maximumPressure: number;
  averagePressureDuration: number;
  pressureVariance: number;
  tolerance: number;
  sensorType: string;
  pressurePatternJson: string;
}

/**
 * Combine 2 enrollment samples into a baseline normalized BiometricPressureProfile
 */
export function buildNormalizedPressureProfile(
  attempt1: BiometricPressureData,
  attempt2: BiometricPressureData
): DerivedPressureProfile {
  const avgPressure = (attempt1.averagePressure + attempt2.averagePressure) / 2;
  const minPressure = Math.min(attempt1.minPressure, attempt2.minPressure);
  const maxPressure = Math.max(attempt1.maxPressure, attempt2.maxPressure);
  const avgDuration = (attempt1.pressureDurationMs + attempt2.pressureDurationMs) / 2;
  const avgVariance = (attempt1.pressureVariance + attempt2.pressureVariance) / 2;

  // Combine sampled pressure curves into a normalized vector (max 20 points)
  const p1 = attempt1.samples.map((s) => s.pressure);
  const p2 = attempt2.samples.map((s) => s.pressure);
  const maxLen = Math.max(p1.length, p2.length);

  const combinedCurve: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const v1 = p1[i] ?? p2[i] ?? avgPressure;
    const v2 = p2[i] ?? p1[i] ?? avgPressure;
    combinedCurve.push(Number(((v1 + v2) / 2).toFixed(4)));
  }

  return {
    sampleCount: 2,
    averagePressure: Number(avgPressure.toFixed(4)),
    minimumPressure: Number(minPressure.toFixed(4)),
    maximumPressure: Number(maxPressure.toFixed(4)),
    averagePressureDuration: Number(avgDuration.toFixed(2)),
    pressureVariance: Number(avgVariance.toFixed(6)),
    tolerance: 25.0, // Default 25% tolerance
    sensorType: attempt1.sensorIdentifier || "PointerEvent_Pressure",
    pressurePatternJson: JSON.stringify(combinedCurve),
  };
}

/**
 * Verify consistency between two enrollment pressure attempts
 */
export function comparePressureEnrollmentAttempts(
  attempt1: BiometricPressureData,
  attempt2: BiometricPressureData
): { isConsistent: boolean; similarityScore: number; reason?: string } {
  // Compare average pressure difference
  const pressureRatio =
    Math.min(attempt1.averagePressure, attempt2.averagePressure) /
    Math.max(attempt1.averagePressure, attempt2.averagePressure, 0.001);

  // Compare duration difference
  const durationRatio =
    Math.min(attempt1.pressureDurationMs, attempt2.pressureDurationMs) /
    Math.max(attempt1.pressureDurationMs, attempt2.pressureDurationMs, 1);

  const similarityScore = Math.round((pressureRatio * 0.6 + durationRatio * 0.4) * 100);

  if (similarityScore < 40) {
    return {
      isConsistent: false,
      similarityScore,
      reason: "Pressure sensor measurements differed significantly between the two attempts. Please press at your natural steady force.",
    };
  }

  return { isConsistent: true, similarityScore };
}
