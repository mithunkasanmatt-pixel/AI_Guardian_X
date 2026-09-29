import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState } from "@/lib/auth/session";
import { matchPressureProfile } from "@/lib/biometrics/pressure-matcher";

export async function POST(req: Request) {
  try {
    const flowState = await getFlowState();
    if (!flowState || flowState.flowType !== "login" || !flowState.userId) {
      return NextResponse.json(
        { error: "Invalid authentication session. Please restart login." },
        { status: 401 }
      );
    }

    const { liveSample } = await req.json();
    if (!liveSample) {
      return NextResponse.json({ error: "Missing live pressure sample data." }, { status: 400 });
    }

    const profile = await prisma.biometricPressureProfile.findUnique({
      where: { userId: flowState.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "No registered pressure profile found for this account." },
        { status: 404 }
      );
    }

    const match = matchPressureProfile(liveSample, profile);

    const completedSteps = Array.from(new Set([...flowState.completedSteps, "biometric"]));
    await setFlowState({
      ...flowState,
      completedSteps,
      biometricVerified: match.passed,
    });

    if (!match.passed) {
      return NextResponse.json(
        { error: "Finger pressure does not match registered profile.", similarityScore: match.similarityScore },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      similarityScore: match.similarityScore,
      nextStep: "/authenticate/result",
    });
  } catch (err: any) {
    console.error("Pressure Verification API Error:", err);
    return NextResponse.json(
      { error: "Server error during pressure verification." },
      { status: 500 }
    );
  }
}
