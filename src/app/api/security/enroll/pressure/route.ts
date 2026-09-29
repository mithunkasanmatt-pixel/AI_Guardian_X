import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState, getCurrentUser } from "@/lib/auth/session";
import { buildNormalizedPressureProfile, comparePressureEnrollmentAttempts } from "@/lib/biometrics/pressure-analyzer";
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
        { error: "Both biometric pressure attempts are required for baseline enrollment." },
        { status: 400 }
      );
    }

    const check = comparePressureEnrollmentAttempts(attempt1, attempt2);
    if (!check.isConsistent) {
      return NextResponse.json(
        { error: check.reason || "Pressure measurements were inconsistent. Please retry." },
        { status: 400 }
      );
    }

    const normalized = buildNormalizedPressureProfile(attempt1, attempt2);

    await prisma.biometricPressureProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...normalized,
      },
      update: {
        ...normalized,
      },
    });

    // Mark security enrollment complete on User model!
    await prisma.user.update({
      where: { id: userId },
      data: {
        securityEnrollmentCompleted: true,
        accountStatus: "ACTIVE",
      },
    });

    await logAuditEvent({
      userId,
      eventType: "BIOMETRIC_ENROLLMENT",
      success: true,
    });

    if (flowState) {
      const completedSteps = Array.from(new Set([...flowState.completedSteps, "pressure", "complete"]));
      await setFlowState({ ...flowState, completedSteps, biometricVerified: true });
    }

    return NextResponse.json({ success: true, nextStep: "/dashboard" });
  } catch (err: any) {
    console.error("Pressure Security Enrollment Error:", err);
    return NextResponse.json(
      { error: "Failed to save biometric pressure baseline profile." },
      { status: 500 }
    );
  }
}
