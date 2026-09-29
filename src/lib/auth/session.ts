import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "super-secret-auth-key-change-this-in-production-min-32-chars"
);

const SESSION_COOKIE_NAME = "bioauth_session";
const FLOW_COOKIE_NAME = "bioauth_flow_state";

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
}

export interface FlowStatePayload {
  flowType: "registration" | "login";
  userId: string;
  email?: string;
  completedSteps: string[];
  typingVerified?: boolean;
  typingScore?: number;
  swipeVerified?: boolean;
  swipeScore?: number;
  biometricVerified?: boolean;
  webauthnChallenge?: string;
}

/**
 * Hash plain password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify plain password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create JWT session token
 */
export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

/**
 * Verify JWT session token
 */
export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as UserSessionPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Get current session user from HTTP-only cookie
 */
export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Set HTTP-only session cookie
 */
export async function setSessionCookie(payload: UserSessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(FLOW_COOKIE_NAME);
}

/**
 * Flow state cookie helpers for step-by-step registration/authentication
 */
export async function setFlowState(state: FlowStatePayload) {
  const token = await new SignJWT({ ...state })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(FLOW_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour for flow completion
  });
}

export async function getFlowState(): Promise<FlowStatePayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(FLOW_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as unknown as FlowStatePayload;
  } catch {
    return null;
  }
}

export async function clearFlowState() {
  const cookieStore = await cookies();
  cookieStore.delete(FLOW_COOKIE_NAME);
}
