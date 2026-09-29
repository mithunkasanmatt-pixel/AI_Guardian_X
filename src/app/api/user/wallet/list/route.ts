import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId: sessionUser.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, wallets });
  } catch (err: any) {
    console.error("Fetch Wallets Error:", err);
    return NextResponse.json({ error: "Failed to fetch wallets list" }, { status: 500 });
  }
}
