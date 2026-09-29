"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gauge, RefreshCw, AlertTriangle, Fingerprint } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getBiometricProvider, BiometricPressureData } from "@/lib/biometrics/biometric-provider";

interface PressureVerificationCardProps {
  onSuccessRedirect?: string;
}

export function PressureVerificationCard({ onSuccessRedirect = "/authenticate/result" }: PressureVerificationCardProps) {
  const router = useRouter();

  const [livePressure, setLivePressure] = useState<number>(0);
  const [isPressing, setIsPressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const provider = getBiometricProvider();
    if (!padRef.current) return;

    const unbind = provider.startCapture(
      padRef.current,
      (sample) => {
        setLivePressure(sample.pressure);
        setIsPressing(true);
      },
      (data) => {
        setIsPressing(false);
        setLivePressure(0);

        if (data.sampleCount < 2) {
          setErrorMsg("Hold your finger firmly on the sensor area to complete pressure verification.");
          return;
        }

        verifyPressure(data);
      }
    );

    cleanupRef.current = unbind;
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const verifyPressure = async (sampleData: BiometricPressureData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/security/verify/pressure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveSample: sampleData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Biometric pressure verification failed.");
      }

      router.push(onSuccessRedirect);
    } catch (err: any) {
      setErrorMsg(err.message || "Finger pressure does not match registered profile.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Gauge className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Finger Pressure Verification</CardTitle>
        <CardDescription>
          Press and hold your finger on the sensor area to verify your biometric pressure characteristic.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div
          ref={padRef}
          className={`relative h-64 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer select-none touch-none transition-all duration-200 ${
            isPressing
              ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-inner scale-[0.99]"
              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          }`}
        >
          <div className="text-center space-y-3 pointer-events-none">
            <Fingerprint className={`h-16 w-16 mx-auto transition-transform ${isPressing ? "scale-110 text-indigo-600" : "text-slate-400"}`} />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isPressing ? "Verifying Finger Pressure..." : "Press and hold your finger firmly here"}
            </p>

            <div className="w-48 mx-auto space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Live Pressure</span>
                <span>{Math.round(livePressure * 100)}%</span>
              </div>
              <Progress value={livePressure * 100} className="h-2" />
            </div>
          </div>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Pressure Verification Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Matching pressure dynamics against baseline profile...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
