import { prisma } from "../db";

export type AuditEventType =
  | "REGISTRATION"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "TYPING_ENROLLMENT"
  | "SWIPE_ENROLLMENT"
  | "BIOMETRIC_ENROLLMENT"
  | "VERIFICATION_SUCCESS"
  | "VERIFICATION_FAILURE"
  | "APPLICATION_LOCKED"
  | "LOGOUT"
  | "PROFILE_REENROLLED";

export interface LogAuditParams {
  userId?: string | null;
  eventType: AuditEventType;
  success: boolean;
  failureReason?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export async function logAuditEvent({
  userId,
  eventType,
  success,
  failureReason,
  userAgent,
  ipAddress,
  metadata,
}: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        eventType,
        success,
        failureReason: failureReason || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error("Audit Logging Error:", err);
  }
}
