import { NextResponse } from "next/server";
import { getFlowState, setFlowState, getCurrentUser } from "@/lib/auth/session";
import { verifyWebAuthnRegistration } from "@/lib/webauthn/webauthn-server";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    const flowState = await getFlowState();
    const userId = sessionUser?.userId || flowState?.userId;

    if (!userId || !flowState?.webauthnChallenge) {
      return NextResponse.json(
        { error: "Invalid WebAuthn challenge session. Please restart enrollment." },
        { status: 401 }
      );
    }

    const { response } = await req.json();
    if (!response) {
      return NextResponse.json({ error: "Missing WebAuthn registration response." }, { status: 400 });
    }

    const verification = await verifyWebAuthnRegistration(
      userId,
      response,
      flowState.webauthnChallenge
    );

    if (!verification.success) {
      return NextResponse.json({ error: verification.error || "WebAuthn registration failed." }, { status: 400 });
    }

    const completedSteps = Array.from(new Set([...(flowState.completedSteps || []), "biometric"]));
    await setFlowState({
      ...flowState,
      completedSteps,
      biometricVerified: true,
      webauthnChallenge: undefined,
    });

    return NextResponse.json({ success: true, nextStep: "/register/success" });
  } catch (err: any) {
    console.error("WebAuthn Register Verify Error:", err);
    return NextResponse.json(
      { error: "Failed to verify device biometric passkey." },
      { status: 500 }
    );
  }
}
