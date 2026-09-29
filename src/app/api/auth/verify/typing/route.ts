import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState } from "@/lib/auth/session";
import { matchTypingProfile } from "@/lib/typing/typing-matcher";

export async function POST(req: Request) {
  try {
    const flowState = await getFlowState();
    if (!flowState || flowState.flowType !== "login" || !flowState.userId) {
      return NextResponse.json(
        { error: "Invalid authentication session. Please start login again." },
        { status: 401 }
      );
    }

    const { liveAttempt } = await req.json();
    if (!liveAttempt) {
      return NextResponse.json({ error: "Missing live typing attempt data." }, { status: 400 });
    }

    // Retrieve registered profile
    const profile = await prisma.typingBehaviorProfile.findUnique({
      where: { userId: flowState.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "No registered typing profile found for this user account." },
        { status: 404 }
      );
    }

    // Match live attempt vs stored baseline
    const match = matchTypingProfile(liveAttempt, profile);

    const completedSteps = Array.from(new Set([...flowState.completedSteps, "typing"]));
    await setFlowState({
      ...flowState,
      completedSteps,
      typingVerified: match.passed,
      typingScore: match.similarityScore,
    });

    if (!match.passed) {
      return NextResponse.json(
        { error: "Typing behavior does not match registered profile.", similarityScore: match.similarityScore },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      similarityScore: match.similarityScore,
      nextStep: "/authenticate/swipe",
    });
  } catch (err: any) {
    console.error("Typing Verification API Error:", err);
    return NextResponse.json(
      { error: "Server error during typing verification." },
      { status: 500 }
    );
  }
}
