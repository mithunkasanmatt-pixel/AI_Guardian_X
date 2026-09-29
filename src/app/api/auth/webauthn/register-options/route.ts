import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFlowState, setFlowState, getCurrentUser } from "@/lib/auth/session";
import { getWebAuthnRegisterOptions } from "@/lib/webauthn/webauthn-server";

export async function POST() {
  try {
    const sessionUser = await getCurrentUser();
    const flowState = await getFlowState();
    const userId = sessionUser?.userId || flowState?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid session for WebAuthn enrollment. Please sign in again." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User record not found." }, { status: 404 });
    }

    const options = await getWebAuthnRegisterOptions(user.id, user.email, user.name);

    // Save challenge in flow state for verification step
    if (flowState) {
      await setFlowState({
        ...flowState,
        webauthnChallenge: options.challenge,
      });
    } else {
      await setFlowState({
        flowType: "login",
        userId: user.id,
        email: user.email,
        completedSteps: [],
        webauthnChallenge: options.challenge,
      });
    }

    return NextResponse.json({ options });
  } catch (err: any) {
    console.error("WebAuthn Register Options Error:", err);
    return NextResponse.json(
      { error: "Failed to generate WebAuthn registration options." },
      { status: 500 }
    );
  }
}
