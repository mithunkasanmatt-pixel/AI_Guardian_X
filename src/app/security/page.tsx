import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";
import { Shield, Activity, Sliders, CheckCircle2, XCircle, Smartphone, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SecurityPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    include: {
      authenticationAttempts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      webAuthnCredentials: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Security & Audit Center</h1>
        <p className="text-sm text-slate-500">
          Inspect similarity thresholds, rate limit policies, WebAuthn RP parameters, and complete authentication audit logs.
        </p>
      </div>

      {/* Security Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Typing Threshold</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{APP_CONFIG.typingSimilarityThreshold}%</p>
            <p className="text-[11px] text-slate-500">Configurable similarity pass threshold</p>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Swipe Threshold</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{APP_CONFIG.swipeSimilarityThreshold}%</p>
            <p className="text-[11px] text-slate-500">Normalized distance & gesture similarity</p>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">Max Login Attempts</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{APP_CONFIG.maxLoginAttempts} Attempts</p>
            <p className="text-[11px] text-slate-500">{APP_CONFIG.rateLimitMinutes} min window rate limit</p>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase">WebAuthn RP ID</p>
            <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 truncate">
              {APP_CONFIG.rpId}
            </p>
            <p className="text-[11px] text-slate-500">Origin: {APP_CONFIG.origin}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Authentication Attempt Audit History
          </CardTitle>
          <CardDescription>Comprehensive immutable log of multi-factor login attempts</CardDescription>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {user.authenticationAttempts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No authentication attempts recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Typing Score</th>
                  <th className="p-3">Swipe Score</th>
                  <th className="p-3">Biometric</th>
                  <th className="p-3">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {user.authenticationAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap" suppressHydrationWarning>
                      {new Date(attempt.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {attempt.success ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 font-semibold">
                      {attempt.typingScore !== null ? `${Math.round(attempt.typingScore)}%` : "N/A"}
                    </td>
                    <td className="p-3 font-semibold">
                      {attempt.swipeScore !== null ? `${Math.round(attempt.swipeScore)}%` : "N/A"}
                    </td>
                    <td className="p-3">
                      {attempt.biometricVerified ? (
                        <span className="text-emerald-600 font-semibold">Verified ✓</span>
                      ) : (
                        <span className="text-slate-400">Not Used</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {attempt.userAgent || "Unknown Device"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
