import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { matchTypingProfile } from "@/lib/typing/typing-matcher";

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
    const { typingAttempt } = body;

    if (!typingAttempt) {
      return NextResponse.json(
        { error: "Typing behavior sample is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      include: { typingProfile: true },
    });

    if (!user || !user.typingProfile) {
      return NextResponse.json(
        { error: "No typing reference pattern found. Please register your typing pattern on the Dashboard first." },
        { status: 400 }
      );
    }

    const match = matchTypingProfile(typingAttempt, user.typingProfile);

    if (!match.passed) {
      return NextResponse.json(
        {
          success: false,
          error: "Typing pattern does not match your reference pattern.",
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
    console.error("Wallet Typing Verification Error:", err);
    return NextResponse.json(
      { error: "Server error during typing verification." },
      { status: 500 }
    );
  }
}
