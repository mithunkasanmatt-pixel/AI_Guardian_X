import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { SystemControlService } from "@/lib/security/system-control";
import { getFlowState } from "@/lib/auth/session";

export async function POST() {
  try {
    const flowState = await getFlowState();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || undefined;

    await SystemControlService.lockApplication(flowState?.userId, "Manual or automated security lock trigger", {
      userAgent,
      ipAddress,
    });

    return NextResponse.json({ success: true, locked: true, redirect: "/locked" });
  } catch (err: any) {
    console.error("Lock Application API Error:", err);
    return NextResponse.json({ error: "Failed to lock application state." }, { status: 500 });
  }
}
