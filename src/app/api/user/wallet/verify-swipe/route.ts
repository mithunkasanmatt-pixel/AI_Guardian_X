import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { matchSwipeProfile } from "@/lib/swipe/swipe-matcher";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized session. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { swipeAttempt } = body;

    if (!swipeAttempt) {
      return NextResponse.json(
        { error: "Swipe behavior sample is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      include: { swipeProfile: true },
    });

    if (!user || !user.swipeProfile) {
      return NextResponse.json(
        { error: "No swipe reference pattern found. Please register your swipe pattern on the Dashboard first." },
        { status: 400 }
      );
    }

    const match = matchSwipeProfile(swipeAttempt, user.swipeProfile);

    if (!match.passed) {
      return NextResponse.json(
        {
          success: false,
          error: "Swipe pattern does not match your reference pattern.",
          similarityScore: match.similarityScore,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      similarityScore: match.similarityScore,
    });
  } catch (err: any) {
    console.error("Wallet Swipe Verification Error:", err);
    return NextResponse.json(
      { error: "Server error during swipe verification." },
      { status: 500 }
    );
  }
}
