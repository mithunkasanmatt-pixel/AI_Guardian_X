import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { APP_CONFIG } from "../config";
import { prisma } from "../db";

/**
 * Generate WebAuthn Registration options for a user
 */
export async function getWebAuthnRegisterOptions(userId: string, userEmail: string, userName: string) {
  // Existing credentials to exclude
  const existingCreds = await prisma.webAuthnCredential.findMany({
    where: { userId },
  });

  const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
    rpName: APP_CONFIG.rpName,
    rpID: APP_CONFIG.rpId,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: "none", // Privacy-preserving attestation
    excludeCredentials: existingCreds.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform", // Fingerprint, Face ID, Windows Hello
    },
  });

  return options;
}

/**
 * Verify WebAuthn Registration response & save credential metadata
 */
export async function verifyWebAuthnRegistration(
  userId: string,
  response: any,
  expectedChallenge: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: APP_CONFIG.origin,
      expectedRPID: APP_CONFIG.rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "WebAuthn verification failed." };
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;

    // Save credential in PostgreSQL (Public key & credential ID only, NO raw biometric data!)
    const savedCred = await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        transports: response.response.transports ? JSON.stringify(response.response.transports) : null,
      },
    });

    return { success: true, credentialId: savedCred.credentialId };
  } catch (err: any) {
    console.error("WebAuthn Registration Verification Error:", err);
    return { success: false, error: err?.message || "Failed to verify device biometric passkey." };
  }
}

/**
 * Generate WebAuthn Authentication options for a user
 */
export async function getWebAuthnAuthOptions(userId: string) {
  const userCreds = await prisma.webAuthnCredential.findMany({
    where: { userId },
  });

  if (userCreds.length === 0) {
    throw new Error("No registered WebAuthn credentials found for this user.");
  }

  const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
    rpID: APP_CONFIG.rpId,
    userVerification: "preferred",
    allowCredentials: userCreds.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
  });

  return options;
}

/**
 * Verify WebAuthn Authentication assertion
 */
export async function verifyWebAuthnAuth(
  userId: string,
  response: any,
  expectedChallenge: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const credential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: response.id },
    });

    if (!credential || credential.userId !== userId) {
      return { success: false, error: "WebAuthn credential not found or mismatched user." };
    }

    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: APP_CONFIG.origin,
      expectedRPID: APP_CONFIG.rpId,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64")),
        counter: Number(credential.counter),
      },
    });

    if (!verification.verified) {
      return { success: false, error: "Device biometric authentication assertion invalid." };
    }

    // Update lastUsedAt and counter
    await prisma.webAuthnCredential.update({
      where: { credentialId: credential.credentialId },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("WebAuthn Authentication Verification Error:", err);
    return { success: false, error: err?.message || "Failed to verify biometric assertion." };
  }
}
