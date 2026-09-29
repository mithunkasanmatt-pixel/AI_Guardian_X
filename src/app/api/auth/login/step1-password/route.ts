import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, setFlowState, setSessionCookie, clearSessionCookie, clearFlowState } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { APP_CONFIG } from "@/lib/config";
import { logAuditEvent } from "@/lib/security/audit-logger";
import { matchTypingProfile } from "@/lib/typing/typing-matcher";
import { matchSwipeProfile } from "@/lib/swipe/swipe-matcher";
import { matchPressureProfile } from "@/lib/biometrics/pressure-matcher";
import { evaluateMultiModalAuth } from "@/lib/security/verification-service";

const loginStep1Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  typingAttempt: z.any().optional(),
  swipeAttempt: z.any().optional(),
  pressureAttempt: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginStep1Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid credentials format" },
        { status: 400 }
      );
    }

    const { email, password, typingAttempt, swipeAttempt, pressureAttempt } = parsed.data;
    const lowerEmail = email.toLowerCase();

    // Rate limiting check
    const rateCheck = checkRateLimit(
      lowerEmail,
      APP_CONFIG.maxLoginAttempts,
      APP_CONFIG.rateLimitMinutes * 60 * 1000
    );

    if (!rateCheck.allowed) {
      const minutesRemaining = Math.ceil(rateCheck.resetTimeMs / 60000);
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${minutesRemaining} minutes.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
      include: {
        typingProfile: true,
        swipeProfile: true,
        biometricPressureProfile: true,
      },
    });

    if (!user) {
      await logAuditEvent({
        eventType: "LOGIN_FAILURE",
        success: false,
        failureReason: "Invalid email or user not found",
      });
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      await logAuditEvent({
        userId: user.id,
        eventType: "LOGIN_FAILURE",
        success: false,
        failureReason: "Invalid password hash match",
      });
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    // Success! Establish authenticated user session directly on email + password login
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await logAuditEvent({
      userId: user.id,
      eventType: "LOGIN_SUCCESS",
      success: true,
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      nextStep: "/dashboard",
    });
  } catch (err: any) {
    console.error("Login Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
