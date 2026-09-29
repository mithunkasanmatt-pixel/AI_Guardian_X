import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState } from "@/lib/auth/session";
import { matchSwipeProfile } from "@/lib/swipe/swipe-matcher";

export async function POST(req: Request) {
  try {
    const flowState = await getFlowState();
    if (!flowState || flowState.flowType !== "login" || !flowState.userId) {
      return NextResponse.json(
        { error: "Invalid authentication session. Please restart login." },
        { status: 401 }
      );
    }

    const { liveAttempt } = await req.json();
    if (!liveAttempt) {
      return NextResponse.json({ error: "Missing live swipe attempt data." }, { status: 400 });
    }

    const profile = await prisma.swipeBehaviorProfile.findUnique({
      where: { userId: flowState.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "No registered swipe profile found for this user account." },
        { status: 404 }
      );
    }

    const match = matchSwipeProfile(liveAttempt, profile);

    const completedSteps = Array.from(new Set([...flowState.completedSteps, "swipe"]));
    await setFlowState({
      ...flowState,
      completedSteps,
      swipeVerified: match.passed,
      swipeScore: match.similarityScore,
    });

    if (!match.passed) {
      return NextResponse.json(
        { error: "Swipe behavior does not match registered profile.", similarityScore: match.similarityScore },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      similarityScore: match.similarityScore,
      nextStep: "/authenticate/biometric",
    });
  } catch (err: any) {
    console.error("Swipe Verification API Error:", err);
    return NextResponse.json(
      { error: "Server error during swipe verification." },
      { status: 500 }
    );
  }
}
