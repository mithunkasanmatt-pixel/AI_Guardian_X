import { NextResponse } from "next/server";
import { getFlowState, setFlowState } from "@/lib/auth/session";
import { getWebAuthnAuthOptions } from "@/lib/webauthn/webauthn-server";

export async function POST() {
  try {
    const flowState = await getFlowState();
    if (!flowState || flowState.flowType !== "login" || !flowState.userId) {
      return NextResponse.json(
        { error: "Invalid login session for WebAuthn passkey assertion." },
        { status: 401 }
      );
    }

    const options = await getWebAuthnAuthOptions(flowState.userId);

    await setFlowState({
      ...flowState,
      webauthnChallenge: options.challenge,
    });

    return NextResponse.json({ options });
  } catch (err: any) {
    console.error("WebAuthn Auth Options Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate WebAuthn authentication options." },
      { status: 500 }
    );
  }
}
