import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        securityEnrollmentCompleted: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        typingProfile: {
          select: {
            id: true,
            averageWpm: true,
            averageTypingSpeed: true,
            averageKeyInterval: true,
            consistencyScore: true,
            updatedAt: true,
          },
        },
        swipeProfile: {
          select: {
            id: true,
            gestureSequence: true,
            averageDuration: true,
            consistencyScore: true,
            updatedAt: true,
          },
        },
        biometricPressureProfile: {
          select: {
            id: true,
            averagePressure: true,
            sensorType: true,
            updatedAt: true,
          },
        },
        webAuthnCredentials: {
          select: {
            id: true,
            credentialId: true,
            deviceType: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
        authenticationAttempts: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            typingScore: true,
            swipeScore: true,
            pressureScore: true,
            biometricVerified: true,
            success: true,
            userAgent: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("Fetch User API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
