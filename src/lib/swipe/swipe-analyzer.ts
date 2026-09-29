export interface Point {
  x: number;
  y: number;
  time: number;
}

export type Direction = "Left" | "Right" | "Up" | "Down";

export interface DerivedSwipeFeatures {
  gestureSequence: Direction[];
  sequenceString: string;
  totalDurationMs: number;
  normalizedDistancePattern: { dx: number; dy: number; dist: number }[];
  movementSpeedProfile: number[]; // normalized speed at segments
  averageSpeed: number; // relative distance per ms
  directionChangesCount: number;
  consistencyScore: number; // 0 to 100
  pointCount: number;
}

export interface SwipeProfileData {
  gestureSequence: string; // e.g. "Left->Right->Down->Right"
  normalizedDistancePatternJson: string;
  averageGestureDuration: number;
  movementSpeedProfileJson: string;
  directionPattern: string;
  consistencyScore: number;
}

/**
 * Process a series of raw touch/mouse coordinates inside a container of containerWidth x containerHeight
 */
export function analyzeGesture(
  points: Point[],
  containerWidth: number = 300,
  containerHeight: number = 300
): DerivedSwipeFeatures {
  if (points.length < 3) {
    return {
      gestureSequence: [],
      sequenceString: "",
      totalDurationMs: 0,
      normalizedDistancePattern: [],
      movementSpeedProfile: [],
      averageSpeed: 0,
      directionChangesCount: 0,
      consistencyScore: 0,
      pointCount: points.length,
    };
  }

  const sorted = [...points].sort((a, b) => a.time - b.time);
  const startTime = sorted[0].time;
  const endTime = sorted[sorted.length - 1].time;
  const totalDurationMs = Math.max(1, endTime - startTime);

  // Normalize points to 0.0 - 1.0 range based on container size
  const w = Math.max(1, containerWidth);
  const h = Math.max(1, containerHeight);

  const normalizedPoints = sorted.map((p) => ({
    x: p.x / w,
    y: p.y / h,
    time: p.time - startTime,
  }));

  // Detect directional segments (sub-swipes)
  const directions: Direction[] = [];
  const distances: { dx: number; dy: number; dist: number }[] = [];
  const speeds: number[] = [];

  // Minimum threshold in normalized units (5% of screen width/height) to trigger a segment
  const minDistThreshold = 0.05;

  let segmentStartIdx = 0;

  for (let i = 1; i < normalizedPoints.length; i++) {
    const p1 = normalizedPoints[segmentStartIdx];
    const p2 = normalizedPoints[i];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= minDistThreshold || i === normalizedPoints.length - 1) {
      const dt = Math.max(1, p2.time - p1.time);
      const speed = dist / dt;

      // Determine dominant direction
      let dir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? "Right" : "Left";
      } else {
        dir = dy > 0 ? "Down" : "Up";
      }

      // Add direction if it's the first or different from last direction
      if (directions.length === 0 || directions[directions.length - 1] !== dir) {
        directions.push(dir);
        distances.push({ dx: Number(dx.toFixed(4)), dy: Number(dy.toFixed(4)), dist: Number(dist.toFixed(4)) });
        speeds.push(Number((speed * 1000).toFixed(4))); // relative distance per second
        segmentStartIdx = i;
      }
    }
  }

  const sequenceString = directions.join("->");
  const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const directionChangesCount = Math.max(0, directions.length - 1);

  // Speed variance for consistency score
  const speedVariance = speeds.length > 0
    ? speeds.reduce((acc, s) => acc + Math.pow(s - averageSpeed, 2), 0) / speeds.length
    : 0;
  const speedStdDev = Math.sqrt(speedVariance);
  const cv = averageSpeed > 0 ? speedStdDev / averageSpeed : 1;
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1, cv)))));

  return {
    gestureSequence: directions,
    sequenceString,
    totalDurationMs: Math.round(totalDurationMs),
    normalizedDistancePattern: distances,
    movementSpeedProfile: speeds,
    averageSpeed: Number(averageSpeed.toFixed(4)),
    directionChangesCount,
    consistencyScore,
    pointCount: points.length,
  };
}

/**
 * Build baseline normalized SwipeProfile from 2 successful attempts
 */
export function buildNormalizedSwipeProfile(
  attempt1: DerivedSwipeFeatures,
  attempt2: DerivedSwipeFeatures
): SwipeProfileData {
  const avgDuration = (attempt1.totalDurationMs + attempt2.totalDurationMs) / 2;
  const avgConsistency = (attempt1.consistencyScore + attempt2.consistencyScore) / 2;

  // Combine speeds
  const maxLen = Math.max(attempt1.movementSpeedProfile.length, attempt2.movementSpeedProfile.length);
  const combinedSpeeds: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const s1 = attempt1.movementSpeedProfile[i] ?? attempt2.movementSpeedProfile[i] ?? 0;
    const s2 = attempt2.movementSpeedProfile[i] ?? attempt1.movementSpeedProfile[i] ?? 0;
    combinedSpeeds.push(Number(((s1 + s2) / 2).toFixed(4)));
  }

  return {
    gestureSequence: attempt1.sequenceString || attempt2.sequenceString,
    normalizedDistancePatternJson: JSON.stringify(attempt1.normalizedDistancePattern),
    averageGestureDuration: Number(avgDuration.toFixed(2)),
    movementSpeedProfileJson: JSON.stringify(combinedSpeeds),
    directionPattern: attempt1.gestureSequence.join(","),
    consistencyScore: Number(avgConsistency.toFixed(2)),
  };
}
