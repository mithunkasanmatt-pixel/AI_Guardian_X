export const APP_CONFIG = {
  name: "AI Guardian X",
  title: "AI Guardian X — Behavioral Biometric Authentication System",
  description: "Next-gen zero-trust authentication combining typing dynamics, swipe gestures, and biometric finger pressure.",
  rpId: process.env.WEBAUTHN_RP_ID || "localhost",
  rpName: process.env.WEBAUTHN_RP_NAME || "AI Guardian X",
  origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:3000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Predefined enrollment parameters
  defaultTypingSentence: "The quick brown fox jumps over the lazy dog.",
  typingSentences: [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "Sphinx of black quartz, judge my vow.",
    "How vexingly quick waft zephyrs jump bright."
  ],
  defaultSwipeSequence: ["Left", "Right", "Down", "Right"] as const,

  // Behavioral similarity thresholds (%)
  typingSimilarityThreshold: Number(process.env.TYPING_SIMILARITY_THRESHOLD || 60),
  swipeSimilarityThreshold: Number(process.env.SWIPE_SIMILARITY_THRESHOLD || 60),
  pressureSimilarityThreshold: Number(process.env.PRESSURE_SIMILARITY_THRESHOLD || 60),
  combinedSimilarityThreshold: Number(process.env.COMBINED_SIMILARITY_THRESHOLD || 60),

  // Modality weights for multi-modal verification decision engine
  weights: {
    typing: Number(process.env.TYPING_WEIGHT || 0.35),
    swipe: Number(process.env.SWIPE_WEIGHT || 0.35),
    pressure: Number(process.env.PRESSURE_WEIGHT || 0.30),
  },

  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
  rateLimitMinutes: Number(process.env.RATE_LIMIT_DURATION_MINUTES || 15),
  sessionDurationHours: Number(process.env.SESSION_EXPIRATION_HOURS || 24),
};
