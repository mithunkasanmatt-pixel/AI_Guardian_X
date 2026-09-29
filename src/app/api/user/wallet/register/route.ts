import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, clearSessionCookie, clearFlowState } from "@/lib/auth/session";
import { matchTypingProfile } from "@/lib/typing/typing-matcher";
import { matchSwipeProfile } from "@/lib/swipe/swipe-matcher";
import { matchPressureProfile } from "@/lib/biometrics/pressure-matcher";
import { evaluateMultiModalAuth } from "@/lib/security/verification-service";
import { logAuditEvent } from "@/lib/security/audit-logger";

const walletRegistrationSchema = z.object({
  name: z.string().min(2, "Wallet Name must be at least 2 characters"),
  type: z.string().min(1, "Wallet Type is required"),
  fileName: z.string().optional(),
  fileData: z.string().optional(),
  fileSize: z.number().optional(),
  typingAttempt: z.any().optional(),
  swipeAttempt: z.any().optional(),
  pressureAttempt: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized session. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = walletRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid wallet registration payload" },
        { status: 400 }
      );
    }

    const { name, type, fileName, fileData, fileSize, typingAttempt, swipeAttempt, pressureAttempt } = parsed.data;

    // Fetch user with enrolled behavioral profiles
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      include: {
        typingProfile: true,
        swipeProfile: true,
        biometricPressureProfile: true,
      },
    });

    if (!user || !user.typingProfile || !user.swipeProfile || !user.biometricPressureProfile) {
      return NextResponse.json(
        { error: "Missing registered behavioral biometric profiles for this account." },
        { status: 400 }
      );
    }

    if (!typingAttempt || !swipeAttempt || !pressureAttempt) {
      return NextResponse.json(
        { error: "Complete behavioral capture (typing, swipe, pressure) is required before adding wallet." },
        { status: 400 }
      );
    }

    // Match live behavioral samples against registered baselines
    const typingMatch = matchTypingProfile(typingAttempt, user.typingProfile);
    const swipeMatch = matchSwipeProfile(swipeAttempt, user.swipeProfile);
    const pressureMatch = matchPressureProfile(pressureAttempt, user.biometricPressureProfile);

    const decision = evaluateMultiModalAuth({
      typingScore: typingMatch.similarityScore,
      swipeScore: swipeMatch.similarityScore,
      pressureScore: pressureMatch.similarityScore,
    });

    const allPassed = typingMatch.passed && swipeMatch.passed && pressureMatch.passed && decision.allow;

    if (!allPassed) {
      // Record failed authentication attempt & audit log
      await prisma.authenticationAttempt.create({
        data: {
          userId: user.id,
          typingScore: typingMatch.similarityScore,
          swipeScore: swipeMatch.similarityScore,
          pressureScore: pressureMatch.similarityScore,
          biometricVerified: false,
          success: false,
          failureReason: `Wallet registration behavioral mismatch (Typing: ${typingMatch.similarityScore}%, Swipe: ${swipeMatch.similarityScore}%, Pressure: ${pressureMatch.similarityScore}%)`,
        },
      });

      await logAuditEvent({
        userId: user.id,
        eventType: "VERIFICATION_FAILURE",
        success: false,
        failureReason: `Wallet registration behavioral mismatch`,
      });

      // REQUIREMENT 3: Automatically terminate session and exit/redirect user
      await clearSessionCookie();
      await clearFlowState();

      return NextResponse.json(
        {
          error: "Wallet Registration Denied: Behavioral verification failed. Patterns did not match registered baseline. Session has been terminated.",
          terminateSession: true,
          scores: {
            typing: typingMatch.similarityScore,
            swipe: swipeMatch.similarityScore,
            pressure: pressureMatch.similarityScore,
          },
        },
        { status: 401 }
      );
    }

    // All patterns matched! Store wallet information securely
    const newWallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        name,
        type,
        fileName: fileName || "keystore-wallet.json",
        fileData: fileData ? fileData.slice(0, 1024) : undefined, // Store payload excerpt securely
        fileSize: fileSize || (fileData ? fileData.length : 0),
      },
    });

    await prisma.authenticationAttempt.create({
      data: {
        userId: user.id,
        typingScore: typingMatch.similarityScore,
        swipeScore: swipeMatch.similarityScore,
        pressureScore: pressureMatch.similarityScore,
        biometricVerified: true,
        success: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      eventType: "PROFILE_REENROLLED",
      success: true,
      metadata: { walletId: newWallet.id, walletName: name, walletType: type },
    });

    return NextResponse.json({
      success: true,
      message: `Wallet "${name}" successfully authenticated and registered!`,
      wallet: newWallet,
      scores: {
        typing: typingMatch.similarityScore,
        swipe: swipeMatch.similarityScore,
        pressure: pressureMatch.similarityScore,
      },
    });
  } catch (err: any) {
    console.error("Wallet Registration API Error:", err);
    return NextResponse.json(
      { error: "Server error during wallet registration & behavioral verification." },
      { status: 500 }
    );
  }
}
