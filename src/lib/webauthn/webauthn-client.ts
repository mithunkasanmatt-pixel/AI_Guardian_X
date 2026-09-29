import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn, platformAuthenticatorIsAvailable };

export async function registerPasskeyClient(options: any) {
  if (!browserSupportsWebAuthn()) {
    throw new Error("WebAuthn / Passkeys are not supported in this browser.");
  }
  return await startRegistration({ optionsJSON: options });
}

export async function authenticatePasskeyClient(options: any) {
  if (!browserSupportsWebAuthn()) {
    throw new Error("WebAuthn / Passkeys are not supported in this browser.");
  }
  return await startAuthentication({ optionsJSON: options });
}
