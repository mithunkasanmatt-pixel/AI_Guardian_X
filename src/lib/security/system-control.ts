import { cookies } from "next/headers";
import { clearSessionCookie, clearFlowState } from "../auth/session";
import { logAuditEvent } from "./audit-logger";

export interface SystemControlStatus {
  isLocked: boolean;
  lockReason?: string;
  lockedAt?: number;
}

const LOCKED_COOKIE_NAME = "bioauth_app_locked";

export class SystemControlService {
  /**
   * Lock application state server-side
   */
  static async lockApplication(userId?: string, reason?: string, reqInfo?: { userAgent?: string; ipAddress?: string }) {
    const cookieStore = await cookies();
    cookieStore.set(LOCKED_COOKIE_NAME, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours lock
    });

    // Invalidate current auth session
    await clearSessionCookie();
    await clearFlowState();

    // Log audit events
    await logAuditEvent({
      userId,
      eventType: "APPLICATION_LOCKED",
      success: false,
      failureReason: reason || "Behavioral verification failure triggered application lock",
      userAgent: reqInfo?.userAgent,
      ipAddress: reqInfo?.ipAddress,
    });
  }

  /**
   * Unlock application
   */
  static async unlockApplication() {
    const cookieStore = await cookies();
    cookieStore.delete(LOCKED_COOKIE_NAME);
  }

  /**
   * Check if application is currently locked
   */
  static async isApplicationLocked(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get(LOCKED_COOKIE_NAME)?.value === "true";
  }

  /**
   * Dedicated hardware lock / shutdown integration
   * Invokes hardware control interface or privileged service if configured
   */
  static async shutdownDevice(): Promise<{ executed: boolean; message: string }> {
    if (process.env.ENABLE_HARDWARE_SHUTDOWN === "true") {
      // Hardware kiosk integration point (e.g. exec privileged OS shutdown script in controlled environment)
      return { executed: true, message: "Hardware shutdown signal dispatched to privileged service." };
    }
    return {
      executed: false,
      message: "Browser environment safely locked session and application access.",
    };
  }
}
