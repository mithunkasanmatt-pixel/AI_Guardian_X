import { NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/security/audit-logger";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAuditEvent({
      userId: user.userId,
      eventType: "LOGOUT",
      success: true,
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
