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
        { error: "Unauthorized session for security enrollment." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { attempt1, attempt2 } = body;

    if (!attempt1 || !attempt2) {
      return NextResponse.json(
        { error: "Both typing attempts are required for baseline enrollment." },
        { status: 400 }
      );
    }

    const check = compareEnrollmentAttempts(attempt1, attempt2);
    if (!check.isConsistent) {
      return NextResponse.json(
        { error: check.reason || "Typing attempts were too inconsistent. Please retry." },
        { status: 400 }
      );
    }

    const normalized = buildNormalizedProfile(attempt1, attempt2);

    await prisma.typingBehaviorProfile.upsert({
      where: { userId },
      create: {
        userId,
        sampleCount: 2,
        averageWpm: Math.round(normalized.averageTypingSpeed / 5),
        averageTypingDuration: attempt1.totalDurationMs,
        averageInterKeyTime: normalized.averageKeyInterval,
        typingVariance: normalized.timingVariance,
        tolerance: 25.0,
        averageTypingSpeed: normalized.averageTypingSpeed,
        averageKeyInterval: normalized.averageKeyInterval,
        averagePauseDuration: normalized.averagePauseDuration,
        backspaceRate: normalized.backspaceRate,
        consistencyScore: normalized.consistencyScore,
        timingPatternJson: normalized.timingPatternJson,
      },
      update: {
        sampleCount: 2,
        averageWpm: Math.round(normalized.averageTypingSpeed / 5),
        averageTypingDuration: attempt1.totalDurationMs,
        averageInterKeyTime: normalized.averageKeyInterval,
        typingVariance: normalized.timingVariance,
        tolerance: 25.0,
        averageTypingSpeed: normalized.averageTypingSpeed,
        averageKeyInterval: normalized.averageKeyInterval,
        averagePauseDuration: normalized.averagePauseDuration,
        backspaceRate: normalized.backspaceRate,
        consistencyScore: normalized.consistencyScore,
        timingPatternJson: normalized.timingPatternJson,
      },
    });

    await logAuditEvent({
      userId,
      eventType: "TYPING_ENROLLMENT",
      success: true,
    });

    if (flowState) {
      const completedSteps = Array.from(new Set([...flowState.completedSteps, "typing"]));
      await setFlowState({ ...flowState, completedSteps });
    }

    return NextResponse.json({ success: true, nextStep: "/security-enrollment?step=swipe" });
  } catch (err: any) {
    console.error("Typing Security Enrollment Error:", err);
    return NextResponse.json(
      { error: "Failed to save typing baseline profile." },
      { status: 500 }
    );
  }
}
