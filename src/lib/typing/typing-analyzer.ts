export interface KeystrokeEvent {
  key: string;
  code: string;
  downTime: number; // performance.now() timestamp
  upTime?: number;
}

export interface DerivedTypingFeatures {
  totalDurationMs: number;
  charCount: number;
  averageTypingSpeedCPM: number;
  averageTypingSpeedWPM: number;
  averageKeyIntervalMs: number;
  averageHoldTimeMs: number;
  timingVarianceMs2: number;
  pauseFrequency: number;
  averagePauseDurationMs: number;
  backspaceCount: number;
  backspaceRate: number;
  consistencyScore: number; // 0 to 100
  interKeyTimings: number[]; // normalized timing gaps between keydowns
}

export interface TypingProfileData {
  averageTypingSpeed: number; // CPM
  averageKeyInterval: number; // ms
  timingVariance: number;
  averagePauseDuration: number;
  backspaceRate: number;
  consistencyScore: number;
  timingPatternJson: string;
}

/**
 * Process a sequence of raw keystroke events into derived features
 */
export function analyzeKeystrokes(
  events: KeystrokeEvent[],
  targetText: string
): DerivedTypingFeatures {
  if (events.length < 2) {
    return {
      totalDurationMs: 0,
      charCount: 0,
      averageTypingSpeedCPM: 0,
      averageTypingSpeedWPM: 0,
      averageKeyIntervalMs: 0,
      averageHoldTimeMs: 0,
      timingVarianceMs2: 0,
      pauseFrequency: 0,
      averagePauseDurationMs: 0,
      backspaceCount: 0,
      backspaceRate: 0,
      consistencyScore: 0,
      interKeyTimings: [],
    };
  }

  // Sort events by downTime
  const sorted = [...events].sort((a, b) => a.downTime - b.downTime);
  const firstEvent = sorted[0];
  const lastEvent = sorted[sorted.length - 1];

  const totalDurationMs = Math.max(1, lastEvent.upTime ? lastEvent.upTime - firstEvent.downTime : lastEvent.downTime - firstEvent.downTime);
  const durationMinutes = totalDurationMs / 60000;

  const charCount = targetText.length;
  const averageTypingSpeedCPM = Math.round(charCount / Math.max(0.01, durationMinutes));
  const averageTypingSpeedWPM = Math.round(averageTypingSpeedCPM / 5);

  // Key intervals (down-to-down) & hold times (down-to-up)
  const intervals: number[] = [];
  const holdTimes: number[] = [];
  let backspaceCount = 0;
  let pauseCount = 0;
  let totalPauseTime = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    if (ev.key === "Backspace") {
      backspaceCount++;
    }

    if (ev.upTime && ev.upTime >= ev.downTime) {
      holdTimes.push(ev.upTime - ev.downTime);
    }

    if (i > 0) {
      const interval = ev.downTime - sorted[i - 1].downTime;
      // Filter out huge delays (> 5s) or negative values
      if (interval >= 0 && interval < 5000) {
        intervals.push(interval);
        if (interval > 400) {
          pauseCount++;
          totalPauseTime += interval;
        }
      }
    }
  }

  const averageKeyIntervalMs = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0;

  const averageHoldTimeMs = holdTimes.length > 0
    ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length
    : 0;

  // Variance & Standard Deviation
  const variance = intervals.length > 0
    ? intervals.reduce((acc, val) => acc + Math.pow(val - averageKeyIntervalMs, 2), 0) / intervals.length
    : 0;

  const stdDev = Math.sqrt(variance);
  const cv = averageKeyIntervalMs > 0 ? stdDev / averageKeyIntervalMs : 1;
  // Consistency score: lower coefficient of variation -> higher consistency (0 to 100)
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1, cv)))));

  const averagePauseDurationMs = pauseCount > 0 ? totalPauseTime / pauseCount : 0;
  const backspaceRate = sorted.length > 0 ? backspaceCount / sorted.length : 0;

  // Normalize inter-key timing array (capped to max 50 points)
  const maxPoints = 50;
  const interKeyTimings: number[] = [];
  const step = Math.max(1, Math.floor(intervals.length / maxPoints));
  for (let i = 0; i < intervals.length; i += step) {
    interKeyTimings.push(Math.round(intervals[i]));
  }

  return {
    totalDurationMs: Math.round(totalDurationMs),
    charCount,
    averageTypingSpeedCPM,
    averageTypingSpeedWPM,
    averageKeyIntervalMs: Math.round(averageKeyIntervalMs),
    averageHoldTimeMs: Math.round(averageHoldTimeMs),
    timingVarianceMs2: Math.round(variance),
    pauseFrequency: pauseCount,
    averagePauseDurationMs: Math.round(averagePauseDurationMs),
    backspaceCount,
    backspaceRate: Number(backspaceRate.toFixed(4)),
    consistencyScore,
    interKeyTimings,
  };
}

/**
 * Combine two enrollment attempts into a single normalized baseline TypingProfile
 */
export function buildNormalizedProfile(
  attempt1: DerivedTypingFeatures,
  attempt2: DerivedTypingFeatures
): TypingProfileData {
  const avgSpeed = (attempt1.averageTypingSpeedCPM + attempt2.averageTypingSpeedCPM) / 2;
  const avgInterval = (attempt1.averageKeyIntervalMs + attempt2.averageKeyIntervalMs) / 2;
  const avgVariance = (attempt1.timingVarianceMs2 + attempt2.timingVarianceMs2) / 2;
  const avgPauseDuration = (attempt1.averagePauseDurationMs + attempt2.averagePauseDurationMs) / 2;
  const avgBackspaceRate = (attempt1.backspaceRate + attempt2.backspaceRate) / 2;
  const avgConsistency = (attempt1.consistencyScore + attempt2.consistencyScore) / 2;

  // Combine interKeyTimings vectors by averaging aligned indices
  const len = Math.min(attempt1.interKeyTimings.length, attempt2.interKeyTimings.length);
  const combinedPattern: number[] = [];
  for (let i = 0; i < len; i++) {
    combinedPattern.push(Math.round((attempt1.interKeyTimings[i] + attempt2.interKeyTimings[i]) / 2));
  }

  return {
    averageTypingSpeed: Number(avgSpeed.toFixed(2)),
    averageKeyInterval: Number(avgInterval.toFixed(2)),
    timingVariance: Number(avgVariance.toFixed(2)),
    averagePauseDuration: Number(avgPauseDuration.toFixed(2)),
    backspaceRate: Number(avgBackspaceRate.toFixed(4)),
    consistencyScore: Number(avgConsistency.toFixed(2)),
    timingPatternJson: JSON.stringify(combinedPattern),
  };
}
