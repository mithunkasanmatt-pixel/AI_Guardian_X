import { APP_CONFIG } from "../config";

export interface VerificationScores {
  typingScore: number;
  swipeScore: number;
  pressureScore: number;
}

export interface VerificationDecision {
  allow: boolean;
  combinedScore: number;
  threshold: number;
  weights: { typing: number; swipe: number; pressure: number };
  modalityResults: {
    typingPassed: boolean;
    swipePassed: boolean;
    pressurePassed: boolean;
  };
  reason?: string;
}

/**
 * Multi-Modal Authentication Decision Service
 *
 * Formula:
 * Combined Score = (TypingScore * WeightTyping) + (SwipeScore * WeightSwipe) + (PressureScore * WeightPressure)
 *
 * Evaluation:
 * 1. Evaluates individual critical modality minimum requirements
 * 2. Compares combined weighted score against combined verification threshold
 */
export function evaluateMultiModalAuth(scores: VerificationScores): VerificationDecision {
  const weights = APP_CONFIG.weights; // { typing: 0.35, swipe: 0.35, pressure: 0.30 }
  const threshold = APP_CONFIG.combinedSimilarityThreshold; // default 60%

  const combinedScore = Math.round(
    scores.typingScore * weights.typing +
    scores.swipeScore * weights.swipe +
    scores.pressureScore * weights.pressure
  );

  const typingPassed = scores.typingScore >= APP_CONFIG.typingSimilarityThreshold;
  const swipePassed = scores.swipeScore >= APP_CONFIG.swipeSimilarityThreshold;
  const pressurePassed = scores.pressureScore >= APP_CONFIG.pressureSimilarityThreshold;

  // Individual critical minimum score check (no single modality can drop below 35%)
  const minRequiredModalityScore = 35;
  const criticalFail =
    scores.typingScore < minRequiredModalityScore ||
    scores.swipeScore < minRequiredModalityScore ||
    scores.pressureScore < minRequiredModalityScore;

  const allow = combinedScore >= threshold && !criticalFail;

  return {
    allow,
    combinedScore,
    threshold,
    weights,
    modalityResults: {
      typingPassed,
      swipePassed,
      pressurePassed,
    },
    reason: allow
      ? "Behavioral characteristics match enrolled user baseline."
      : "Behavioral verification threshold or critical modality constraint failed.",
  };
}
