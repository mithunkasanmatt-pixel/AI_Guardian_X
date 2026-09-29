"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, ArrowRight, UserCheck, Keyboard, Move, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { StepProgressIndicator, REGISTRATION_STEPS } from "@/components/layout/StepProgressIndicator";

export default function RegisterSuccessPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepProgressIndicator
        steps={REGISTRATION_STEPS}
        currentStepIndex={4}
        completedStepIndices={[0, 1, 2, 3, 4]}
        title="Enrollment Complete!"
        description="Step 5 of 5: Profile successfully generated"
      />

      <Card className="border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-md">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
            Authentication Profile Created
          </CardTitle>
          <CardDescription>
            Your behavioral biometric profile has been successfully registered and encrypted.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Security Factors
            </p>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="font-medium">Account Credentials Created</span>
              </div>

              <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="font-medium">Typing Profile Enrolled</span>
              </div>

              <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="font-medium">Swipe Profile Enrolled</span>
              </div>

              <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="font-medium">Device Biometric / Passkey Enrolled</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link href="/login" className="w-full">
            <Button size="lg" className="w-full gap-2 text-base">
              Sign In to Access Dashboard <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
