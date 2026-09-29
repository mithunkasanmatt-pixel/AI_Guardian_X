import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getFlowState, setSessionCookie, clearFlowState } from "@/lib/auth/session";
import { evaluateMultiModalAuth } from "@/lib/security/verification-service";
import { SystemControlService } from "@/lib/security/system-control";
import { logAuditEvent } from "@/lib/security/audit-logger";

export async function POST() {
  try {
    const flowState = await getFlowState();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || undefined;

    if (!flowState || flowState.flowType !== "login" || !flowState.userId) {
      await SystemControlService.lockApplication(undefined, "Invalid authentication session state", { userAgent, ipAddress });
      return NextResponse.json(
        { success: false, error: "ACCESS DENIED. Behavioral verification failed.", redirect: "/locked" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: flowState.userId },
      include: {
        typingProfile: true,
        swipeProfile: true,
        biometricPressureProfile: true,
      },
    });

    if (!user) {
      await SystemControlService.lockApplication(flowState.userId, "User account not found during verification", { userAgent, ipAddress });
      return NextResponse.json(
        { success: false, error: "ACCESS DENIED. Behavioral verification failed.", redirect: "/locked" },
        { status: 401 }
      );
    }

    // Scores from verification steps
    const scores = {
      typingScore: flowState.typingScore ?? (user.typingProfile ? 85 : 0),
      swipeScore: flowState.swipeScore ?? (user.swipeProfile ? 85 : 0),
      pressureScore: flowState.biometricVerified ? 90 : 70,
    };

    // Evaluate multi-modal decision engine
    const decision = evaluateMultiModalAuth(scores);

    // Record authentication attempt log in database
    await prisma.authenticationAttempt.create({
      data: {
        userId: user.id,
        typingScore: scores.typingScore,
        swipeScore: scores.swipeScore,
        pressureScore: scores.pressureScore,
        biometricVerified: flowState.biometricVerified || false,
        success: decision.allow,
        userAgent,
        ipAddress,
        failureReason: decision.allow ? null : decision.reason,
      },
    });

    if (!decision.allow) {
      // Lock application, invalidate session, log audit event
      await SystemControlService.lockApplication(user.id, decision.reason, { userAgent, ipAddress });
      await logAuditEvent({
        userId: user.id,
        eventType: "VERIFICATION_FAILURE",
        success: false,
        failureReason: decision.reason,
        userAgent,
        ipAddress,
        metadata: { scores, decision },
      });

      return NextResponse.json(
        { success: false, error: "ACCESS DENIED. Behavioral verification failed.", redirect: "/locked" },
        { status: 403 }
      );
    }

    // Success: Issue session cookie and clear flow state
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    await clearFlowState();

    await logAuditEvent({
      userId: user.id,
      eventType: "VERIFICATION_SUCCESS",
      success: true,
      userAgent,
      ipAddress,
      metadata: { scores, combinedScore: decision.combinedScore },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      details: {
        combinedScore: decision.combinedScore,
        typingVerified: decision.modalityResults.typingPassed,
        swipeVerified: decision.modalityResults.swipePassed,
        pressureVerified: decision.modalityResults.pressurePassed,
      },
    });
  } catch (err: any) {
    console.error("Finalize Login Verification Error:", err);
    return NextResponse.json(
      { success: false, error: "ACCESS DENIED. Behavioral verification failed.", redirect: "/locked" },
      { status: 500 }
    );
  }
}
