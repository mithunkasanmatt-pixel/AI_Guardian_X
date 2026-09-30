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
  fileName: z.string().min(1, "Wallet File is required"),
  fileData: z.string().optional(),
  fileSize: z.number().optional(),
  typingAttempt: z.any().optional(),
  swipeAttempt: z.any().optional(),
  pressureAttempt: z.any().optional(),
  terminateSession: z.boolean().optional(),
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

    // If client requested session termination due to 3 failed attempts
    if (body.terminateSession) {
      await clearSessionCookie();
      await clearFlowState();
      await logAuditEvent({
        userId: sessionUser.userId,
        eventType: "VERIFICATION_FAILURE",
        success: false,
        failureReason: "Wallet verification failed 3 consecutive times. Session terminated.",
      });
      return NextResponse.json({
        success: false,
        terminateSession: true,
        error: "3 failed verification attempts reached. Session terminated.",
      });
    }

    const parsed = walletRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid wallet registration payload" },
        { status: 400 }
      );
    }

    const { name, type, fileName, fileData, fileSize, typingAttempt, swipeAttempt, pressureAttempt } = parsed.data;

    // Requirement 8: Validate file extension (PDF and DOC/DOCX files only)
    const lowerFileName = fileName.toLowerCase();
    const isValidFileType = lowerFileName.endsWith(".pdf") || lowerFileName.endsWith(".doc") || lowerFileName.endsWith(".docx");

    if (!isValidFileType) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOC/DOCX files are allowed." },
        { status: 400 }
      );
    }

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
        { error: "Missing registered behavioral biometric profiles for this account. Please register all 3 patterns on the Dashboard." },
        { status: 400 }
      );
    }

    if (!typingAttempt || !swipeAttempt || !pressureAttempt) {
      return NextResponse.json(
        { error: "Complete behavioral biometric verification (typing, swipe, pressure) is required before creating wallet." },
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
          failureReason: `Wallet creation pressure/biometric mismatch (Typing: ${typingMatch.similarityScore}%, Swipe: ${swipeMatch.similarityScore}%, Pressure: ${pressureMatch.similarityScore}%)`,
        },
      });

      await logAuditEvent({
        userId: user.id,
        eventType: "VERIFICATION_FAILURE",
        success: false,
        failureReason: `Wallet creation pressure/biometric mismatch`,
      });

      let failedStepMessage = "Verification failed.";
      if (!pressureMatch.passed) {
        failedStepMessage = "Finger pressure pattern does not match your reference pattern.";
      } else if (!swipeMatch.passed) {
        failedStepMessage = "Swipe pattern does not match your reference pattern.";
      } else if (!typingMatch.passed) {
        failedStepMessage = "Typing pattern does not match your reference pattern.";
      }

      return NextResponse.json(
        {
          success: false,
          error: failedStepMessage,
          scores: {
            typing: typingMatch.similarityScore,
            swipe: swipeMatch.similarityScore,
            pressure: pressureMatch.similarityScore,
          },
        },
        { status: 400 }
      );
    }

    // All patterns matched & file valid! Store wallet information in database
    const safeFileData = fileData ? fileData.replace(/\0/g, "").slice(0, 1024) : undefined;

    const newWallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        name,
        type,
        fileName: fileName,
        fileData: safeFileData,
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
      message: `Wallet "${name}" successfully verified and created!`,
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
      { error: "Server error during wallet creation & behavioral verification." },
      { status: 500 }
    );
  }
}
