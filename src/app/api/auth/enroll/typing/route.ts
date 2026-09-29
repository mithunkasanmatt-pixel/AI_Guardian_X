import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState, getCurrentUser } from "@/lib/auth/session";
import { buildNormalizedProfile } from "@/lib/typing/typing-analyzer";
import { compareEnrollmentAttempts } from "@/lib/typing/typing-matcher";
import { logAuditEvent } from "@/lib/security/audit-logger";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    const flowState = await getFlowState();
    const userId = sessionUser?.userId || flowState?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized session for typing enrollment. Please sign in or start again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { attempt1, attempt2 } = body;

    if (!attempt1 || !attempt2) {
      return NextResponse.json(
        { error: "Both typing attempts are required for enrollment." },
        { status: 400 }
      );
    }

    // Verify consistency between the two attempts
    const check = compareEnrollmentAttempts(attempt1, attempt2);
    if (!check.isConsistent) {
      return NextResponse.json(
        { error: check.reason || "Typing attempts were too inconsistent. Please retry." },
        { status: 400 }
      );
    }

    // Calculate baseline normalized TypingProfile
    const normalizedProfile = buildNormalizedProfile(attempt1, attempt2);

    await prisma.typingBehaviorProfile.upsert({
      where: { userId },
      create: {
        userId,
        sampleCount: 2,
        averageWpm: Math.round(normalizedProfile.averageTypingSpeed / 5),
        averageTypingDuration: attempt1.totalDurationMs,
        averageInterKeyTime: normalizedProfile.averageKeyInterval,
        typingVariance: normalizedProfile.timingVariance,
        tolerance: 25.0,
        averageTypingSpeed: normalizedProfile.averageTypingSpeed,
        averageKeyInterval: normalizedProfile.averageKeyInterval,
        averagePauseDuration: normalizedProfile.averagePauseDuration,
        backspaceRate: normalizedProfile.backspaceRate,
        consistencyScore: normalizedProfile.consistencyScore,
        timingPatternJson: normalizedProfile.timingPatternJson,
      },
      update: {
        sampleCount: 2,
        averageWpm: Math.round(normalizedProfile.averageTypingSpeed / 5),
        averageTypingDuration: attempt1.totalDurationMs,
        averageInterKeyTime: normalizedProfile.averageKeyInterval,
        typingVariance: normalizedProfile.timingVariance,
        tolerance: 25.0,
        averageTypingSpeed: normalizedProfile.averageTypingSpeed,
        averageKeyInterval: normalizedProfile.averageKeyInterval,
        averagePauseDuration: normalizedProfile.averagePauseDuration,
        backspaceRate: normalizedProfile.backspaceRate,
        consistencyScore: normalizedProfile.consistencyScore,
        timingPatternJson: normalizedProfile.timingPatternJson,
      },
    });

    await logAuditEvent({
      userId,
      eventType: "TYPING_ENROLLMENT",
      success: true,
    });

    // Update flow state if present
    if (flowState) {
      const completedSteps = Array.from(new Set([...(flowState.completedSteps || []), "typing"]));
      await setFlowState({
        ...flowState,
        completedSteps,
      });
    }

    return NextResponse.json({ success: true, nextStep: "/register/swipe" });
  } catch (err: any) {
    console.error("Typing Enrollment Error:", err);
    return NextResponse.json(
      { error: "Failed to process typing enrollment profile." },
      { status: 500 }
    );
  }
}
