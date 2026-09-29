import { NextResponse } from "next/server";
import { getFlowState, setFlowState } from "@/lib/auth/session";
import { verifyWebAuthnAuth } from "@/lib/webauthn/webauthn-server";

export async function POST(req: Request) {
  try {
    const flowState = await getFlowState();
    if (!flowState || flowState.flowType !== "login" || !flowState.userId || !flowState.webauthnChallenge) {
      return NextResponse.json(
        { error: "Invalid WebAuthn assertion challenge state." },
        { status: 401 }
      );
    }

    const { response } = await req.json();
    if (!response) {
      return NextResponse.json({ error: "Missing WebAuthn assertion response." }, { status: 400 });
    }

    const verification = await verifyWebAuthnAuth(flowState.userId, response, flowState.webauthnChallenge);

    if (!verification.success) {
      await setFlowState({
        ...flowState,
        biometricVerified: false,
      });
      return NextResponse.json({ error: verification.error || "Biometric authentication failed." }, { status: 400 });
    }

    const completedSteps = Array.from(new Set([...flowState.completedSteps, "biometric"]));
    await setFlowState({
      ...flowState,
      completedSteps,
      biometricVerified: true,
      webauthnChallenge: undefined,
    });

    return NextResponse.json({ success: true, nextStep: "/authenticate/result" });
  } catch (err: any) {
    console.error("WebAuthn Auth Verify Error:", err);
    return NextResponse.json(
      { error: "Failed to verify device biometric passkey." },
      { status: 500 }
    );
  }
}
