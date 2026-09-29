"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gauge, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Fingerprint } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getBiometricProvider, BiometricPressureData, SensorInfo } from "@/lib/biometrics/biometric-provider";
import { comparePressureEnrollmentAttempts } from "@/lib/biometrics/pressure-analyzer";

interface PressureEnrollmentCardProps {
  onSuccessRedirect?: string;
  onSuccess?: () => void;
}

export function PressureEnrollmentCard({ onSuccessRedirect = "/dashboard", onSuccess }: PressureEnrollmentCardProps) {
  const router = useRouter();

  const [currentAttemptNum, setCurrentAttemptNum] = useState<1 | 2>(1);
  const [livePressure, setLivePressure] = useState<number>(0);
  const [isPressing, setIsPressing] = useState(false);
  
  const [attempt1Data, setAttempt1Data] = useState<BiometricPressureData | null>(null);
  const [attempt2Data, setAttempt2Data] = useState<BiometricPressureData | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sensorInfo, setSensorInfo] = useState<SensorInfo | null>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const provider = getBiometricProvider();
    setSensorInfo(provider.getSensorInfo());

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
          setErrorMsg("Hold your finger firmly on the sensor area to record pressure samples.");
          return;
        }

        if (currentAttemptNum === 1) {
          setAttempt1Data(data);
          setCurrentAttemptNum(2);
          setErrorMsg(null);
        } else if (currentAttemptNum === 2) {
          setAttempt2Data(data);
          if (attempt1Data) {
            const check = comparePressureEnrollmentAttempts(attempt1Data, data);
            if (!check.isConsistent) {
              setErrorMsg(check.reason || "Pressure measurements were inconsistent. Please retry.");
            } else {
              setErrorMsg(null);
              submitPressureProfile(attempt1Data, data);
            }
          }
        }
      }
    );

    cleanupRef.current = unbind;
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [currentAttemptNum, attempt1Data]);

  const submitPressureProfile = async (a1: BiometricPressureData, a2: BiometricPressureData) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/security/enroll/pressure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt1: a1, attempt2: a2 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save biometric pressure profile.");
      }

      if (onSuccess) onSuccess();
      if (onSuccessRedirect && onSuccessRedirect !== "#") {
        router.push(onSuccessRedirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save pressure profile.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentAttemptNum(1);
    setAttempt1Data(null);
    setAttempt2Data(null);
    setLivePressure(0);
    setErrorMsg(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Gauge className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Biometric Finger Pressure Enrollment</CardTitle>
        <CardDescription>
          Press your finger on the sensor area below <span className="font-semibold text-slate-800 dark:text-slate-200">two times</span> to record your unique pressure signature.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sensor info & Attempt badges */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Badge variant={attempt1Data ? "success" : currentAttemptNum === 1 ? "default" : "secondary"}>
              Attempt 1 {attempt1Data && "✓"}
            </Badge>
            <Badge variant={attempt2Data ? "success" : currentAttemptNum === 2 ? "default" : "secondary"}>
              Attempt 2 {attempt2Data && "✓"}
            </Badge>
          </div>

          {sensorInfo && (
            <Badge variant={sensorInfo.isMock ? "warning" : "outline"} className="text-xs">
              {sensorInfo.isMock ? "Dev Mock Sensor" : sensorInfo.name}
            </Badge>
          )}
        </div>

        {/* Live Pressure Sensor Pad */}
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
              {isPressing ? "Recording Finger Pressure..." : "Press and hold your finger firmly here"}
            </p>

            {/* Live Pressure Gauge Bar */}
            <div className="w-48 mx-auto space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Pressure</span>
                <span>{Math.round(livePressure * 100)}%</span>
              </div>
              <Progress value={livePressure * 100} className="h-2" />
            </div>
          </div>
        </div>

        {/* Attempt 1 Summary */}
        {attempt1Data && (
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Attempt 1 Avg Pressure:</span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{Math.round(attempt1Data.averagePressure * 100)}%</span>
            </div>
            <div>
              <span className="text-slate-500">Hold Duration:</span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{attempt1Data.pressureDurationMs} ms</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Biometric Pressure Attention</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing biometric pressure profile...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reset Attempts
        </Button>
      </CardFooter>
    </Card>
  );
}
