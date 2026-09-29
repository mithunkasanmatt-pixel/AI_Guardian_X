"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCw, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FactorStatus {
  passwordVerified: boolean;
  typingVerified: boolean;
  swipeVerified: boolean;
  biometricVerified: boolean;
  overallSuccess: boolean;
}

export function AuthResultCard() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<FactorStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    finalizeAuth();
  }, []);

  const finalizeAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/finalize-login", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.redirect) {
          router.push(data.redirect);
          return;
        }
        setResult({
          passwordVerified: data.details?.passwordVerified ?? false,
          typingVerified: data.details?.typingVerified ?? false,
          swipeVerified: data.details?.swipeVerified ?? false,
          biometricVerified: data.details?.biometricVerified ?? false,
          overallSuccess: false,
        });
        setErrorMessage("ACCESS DENIED. Behavioral verification failed.");
      } else {
        setResult({
          passwordVerified: true,
          typingVerified: data.details?.typingVerified ?? true,
          swipeVerified: data.details?.swipeVerified ?? true,
          biometricVerified: data.details?.biometricVerified ?? true,
          overallSuccess: true,
        });
      }
    } catch (err: any) {
      router.push("/locked");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    if (result?.overallSuccess) {
      router.push("/dashboard");
    } else {
      router.push("/locked");
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center">
        <div className="space-y-4">
          <RefreshCw className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
          <h3 className="text-xl font-bold">Evaluating Behavioral Biometrics...</h3>
          <p className="text-sm text-slate-500 font-mono">Calculating multi-modal verification decision matrix...</p>
        </div>
      </Card>
    );
  }

  const isSuccess = result?.overallSuccess;

  return (
    <Card className="w-full max-w-xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div
          className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-2 shadow-md ${
            isSuccess
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              : "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
          }`}
        >
          {isSuccess ? <ShieldCheck className="h-10 w-10" /> : <ShieldAlert className="h-10 w-10" />}
        </div>
        <CardTitle className="text-2xl font-bold">
          {isSuccess ? "Identity Verified" : "Authentication Failed"}
        </CardTitle>
        <CardDescription>
          {isSuccess
            ? "Multi-modal behavioral biometric authentication passed successfully."
            : errorMessage || "ACCESS DENIED. Behavioral verification failed."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Authentication Factor Verification Summary
          </p>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Account Password</span>
              {result?.passwordVerified ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Unverified
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Typing Behavior</span>
              {result?.typingVerified ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Unverified
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Swipe Pattern</span>
              {result?.swipeVerified ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Unverified
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">Finger Pressure Biometric</span>
              {result?.biometricVerified ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Unverified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button
          size="lg"
          onClick={handleProceed}
          variant={isSuccess ? "emerald" : "default"}
          className="w-full sm:w-auto gap-2 min-w-[200px]"
        >
          {isSuccess ? (
            <>
              Enter Dashboard <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            "Return to Login"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
