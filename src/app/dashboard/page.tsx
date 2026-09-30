import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SystemControlService } from "@/lib/security/system-control";
import {
  ShieldCheck,
  Keyboard,
  Move,
  Gauge,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Activity,
  Settings,
  Wallet as WalletIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletSection } from "@/components/wallet/WalletSection";
import { PatternRegistrationPanel } from "@/components/dashboard/PatternRegistrationPanel";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export default async function DashboardPage() {
  // Check application lock state
  const isLocked = await SystemControlService.isApplicationLocked();
  if (isLocked) {
    redirect("/locked");
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    include: {
      typingProfile: true,
      swipeProfile: true,
      biometricPressureProfile: true,
      wallets: {
        orderBy: { createdAt: "desc" },
      },
      authenticationAttempts: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const hasTyping = !!user.typingProfile;
  const hasSwipe = !!user.swipeProfile;
  const hasPressure = !!user.biometricPressureProfile;
  const allPatternsCompleted = hasTyping && hasSwipe && hasPressure;

  const lastSuccessfulAttempt = user.authenticationAttempts.find((a) => a.success);
  const failedAttempts = user.authenticationAttempts.filter((a) => !a.success);

  const serializedWallets = user.wallets.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    fileName: w.fileName,
    fileSize: w.fileSize,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Header Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-indigo-900">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="AI Guardian X Logo" className="h-7 w-7 rounded object-contain" />
            <Badge className="bg-indigo-700 text-indigo-100 border-none">AI Guardian X Protected Session</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pt-1">Welcome back, {user.name}!</h1>
          <p className="text-indigo-200 text-sm">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/security">
            <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-xs sm:text-sm">
              <Activity className="h-4 w-4" /> Audit Log
            </Button>
          </Link>
          <Link href="/settings">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs sm:text-sm">
              <Settings className="h-4 w-4" /> Settings
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Security Platform</CardTitle>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">AI Guardian X</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-modal zero-trust verification active
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pattern Status</CardTitle>
            <CheckCircle2 className={`h-5 w-5 ${allPatternsCompleted ? "text-emerald-500" : "text-amber-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {[hasTyping, hasSwipe, hasPressure].filter(Boolean).length} / 3 Registered
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {allPatternsCompleted ? "All 3 patterns stored in DB ✓" : "Registration pending"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Registered Wallets</CardTitle>
            <WalletIcon className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{user.wallets.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {allPatternsCompleted ? "Portfolio unlocked" : "Complete patterns to unlock"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Security Audits</CardTitle>
            <Activity className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{user.authenticationAttempts.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Logged verification logs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* REQUIREMENT 2 & 3: Pattern Registration Section (Typing, Swipe, Fingerprint Pressure) */}
      <div className="pt-2">
        <PatternRegistrationPanel
          hasTyping={hasTyping}
          hasSwipe={hasSwipe}
          hasPressure={hasPressure}
        />
      </div>

      {/* REQUIREMENT 3 & 4: Add Wallet & Registered Wallets Section */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <WalletSection
          initialWallets={serializedWallets}
          isUnlocked={allPatternsCompleted}
        />
      </div>
    </div>
  );
}
