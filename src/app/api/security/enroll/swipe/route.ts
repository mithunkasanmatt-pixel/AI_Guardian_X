import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState, getCurrentUser } from "@/lib/auth/session";
import { buildNormalizedSwipeProfile } from "@/lib/swipe/swipe-analyzer";
import { compareSwipeEnrollmentAttempts } from "@/lib/swipe/swipe-matcher";
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
        { error: "Both swipe attempts are required for baseline enrollment." },
        { status: 400 }
      );
    }

    const check = compareSwipeEnrollmentAttempts(attempt1, attempt2);
    if (!check.isConsistent) {
      return NextResponse.json(
        { error: check.reason || "Swipe attempts were inconsistent. Please retry." },
        { status: 400 }
      );
    }

    const normalized = buildNormalizedSwipeProfile(attempt1, attempt2);
    const avgDist = (attempt1.normalizedDistancePattern || []).reduce((acc: number, item: any) => acc + (item.dist || 0), 0);

    await prisma.swipeBehaviorProfile.upsert({
      where: { userId },
      create: {
        userId,
        sampleCount: 2,
        averageDuration: normalized.averageGestureDuration,
        averageDistance: Number(avgDist.toFixed(4)),
        averageVelocity: attempt1.averageSpeed,
        directionProfile: normalized.directionPattern,
        variance: 15.0,
        tolerance: 25.0,
        gestureSequence: normalized.gestureSequence,
        normalizedDistancePatternJson: normalized.normalizedDistancePatternJson,
        movementSpeedProfileJson: normalized.movementSpeedProfileJson,
        consistencyScore: normalized.consistencyScore,
      },
      update: {
        sampleCount: 2,
        averageDuration: normalized.averageGestureDuration,
        averageDistance: Number(avgDist.toFixed(4)),
        averageVelocity: attempt1.averageSpeed,
        directionProfile: normalized.directionPattern,
        variance: 15.0,
        tolerance: 25.0,
        gestureSequence: normalized.gestureSequence,
        normalizedDistancePatternJson: normalized.normalizedDistancePatternJson,
        movementSpeedProfileJson: normalized.movementSpeedProfileJson,
        consistencyScore: normalized.consistencyScore,
      },
    });

    await logAuditEvent({
      userId,
      eventType: "SWIPE_ENROLLMENT",
      success: true,
    });

    if (flowState) {
      const completedSteps = Array.from(new Set([...flowState.completedSteps, "swipe"]));
      await setFlowState({ ...flowState, completedSteps });
    }

    return NextResponse.json({ success: true, nextStep: "/security-enrollment?step=pressure" });
  } catch (err: any) {
    console.error("Swipe Security Enrollment Error:", err);
    return NextResponse.json(
      { error: "Failed to save swipe baseline profile." },
      { status: 500 }
    );
  }
}
