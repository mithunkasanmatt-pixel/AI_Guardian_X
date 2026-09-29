"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Move, Fingerprint, CheckCircle2, Lock, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypingEnrollmentCard } from "@/components/enrollment/TypingEnrollmentCard";
import { SwipeEnrollmentCard } from "@/components/enrollment/SwipeEnrollmentCard";
import { PressureEnrollmentCard } from "@/components/enrollment/PressureEnrollmentCard";

interface PatternRegistrationPanelProps {
  hasTyping: boolean;
  hasSwipe: boolean;
  hasPressure: boolean;
  onPatternCompleted?: () => void;
}

export function PatternRegistrationPanel({
  hasTyping: initialHasTyping,
  hasSwipe: initialHasSwipe,
  hasPressure: initialHasPressure,
  onPatternCompleted,
}: PatternRegistrationPanelProps) {
  const router = useRouter();
  const [hasTyping, setHasTyping] = useState(initialHasTyping);
  const [hasSwipe, setHasSwipe] = useState(initialHasSwipe);
  const [hasPressure, setHasPressure] = useState(initialHasPressure);

  const [activeTab, setActiveTab] = useState<"typing" | "swipe" | "pressure">(
    !initialHasTyping ? "typing" : !initialHasSwipe ? "swipe" : "pressure"
  );

  const allCompleted = hasTyping && hasSwipe && hasPressure;

  const handleTypingSuccess = () => {
    setHasTyping(true);
    if (!hasSwipe) setActiveTab("swipe");
    else if (!hasPressure) setActiveTab("pressure");
    router.refresh();
    onPatternCompleted?.();
  };

  const handleSwipeSuccess = () => {
    setHasSwipe(true);
    if (!hasPressure) setActiveTab("pressure");
    router.refresh();
    onPatternCompleted?.();
  };

  const handlePressureSuccess = () => {
    setHasPressure(true);
    router.refresh();
    onPatternCompleted?.();
  };

  return (
    <div className="space-y-6">
      {/* Overview & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/40">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Pattern Verification & Registration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete all three behavioral biometric pattern registrations to unlock wallet creation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {allCompleted ? (
            <Badge variant="success" className="py-1.5 px-3 text-xs gap-1.5 font-bold shadow-sm">
              <CheckCircle2 className="h-4 w-4" /> All 3 Patterns Registered ✓
            </Badge>
          ) : (
            <Badge variant="outline" className="py-1.5 px-3 text-xs gap-1.5 font-semibold text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800">
              <Lock className="h-3.5 w-3.5" /> {[hasTyping, hasSwipe, hasPressure].filter(Boolean).length} / 3 Patterns Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Pattern Tabs selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tab A: Typing */}
        <button
          type="button"
          onClick={() => setActiveTab("typing")}
          className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
            activeTab === "typing"
              ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">A. Typing Pattern</p>
              <p className="text-xs text-slate-500">Speed, duration & style</p>
            </div>
          </div>
          <Badge variant={hasTyping ? "success" : "secondary"}>
            {hasTyping ? "Registered ✓" : "Pending"}
          </Badge>
        </button>

        {/* Tab B: Swipe */}
        <button
          type="button"
          onClick={() => setActiveTab("swipe")}
          className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
            activeTab === "swipe"
              ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
              <Move className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">B. Swipe Pattern</p>
              <p className="text-xs text-slate-500">Up, Down, Left, Right</p>
            </div>
          </div>
          <Badge variant={hasSwipe ? "success" : "secondary"}>
            {hasSwipe ? "Registered ✓" : "Pending"}
          </Badge>
        </button>

        {/* Tab C: Fingerprint Pressure */}
        <button
          type="button"
          onClick={() => setActiveTab("pressure")}
          className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
            activeTab === "pressure"
              ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">C. Fingerprint Pressure</p>
              <p className="text-xs text-slate-500">Hold force & dynamics</p>
            </div>
          </div>
          <Badge variant={hasPressure ? "success" : "secondary"}>
            {hasPressure ? "Registered ✓" : "Pending"}
          </Badge>
        </button>
      </div>

      {/* Active Registration Card View */}
      <div className="pt-2">
        {activeTab === "typing" && (
          <div className="space-y-4">
            {hasTyping && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Typing behavior pattern successfully stored in database.</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setHasTyping(false)} className="text-xs h-8">
                  Re-enroll Typing
                </Button>
              </div>
            )}
            {!hasTyping && (
              <TypingEnrollmentCard onSuccessRedirect="#" onSuccess={handleTypingSuccess} />
            )}
          </div>
        )}

        {activeTab === "swipe" && (
          <div className="space-y-4">
            {hasSwipe && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Swipe directional pattern successfully stored in database.</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setHasSwipe(false)} className="text-xs h-8">
                  Re-enroll Swipe
                </Button>
              </div>
            )}
            {!hasSwipe && (
              <SwipeEnrollmentCard onSuccessRedirect="#" onSuccess={handleSwipeSuccess} />
            )}
          </div>
        )}

        {activeTab === "pressure" && (
          <div className="space-y-4">
            {hasPressure && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Fingerprint pressure pattern successfully stored in database.</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setHasPressure(false)} className="text-xs h-8">
                  Re-enroll Pressure
                </Button>
              </div>
            )}
            {!hasPressure && (
              <PressureEnrollmentCard onSuccessRedirect="#" onSuccess={handlePressureSuccess} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
