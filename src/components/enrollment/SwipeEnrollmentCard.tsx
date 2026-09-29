"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Move, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Hand } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { analyzeGesture, DerivedSwipeFeatures, Point } from "@/lib/swipe/swipe-analyzer";
import { compareSwipeEnrollmentAttempts } from "@/lib/swipe/swipe-matcher";
import { APP_CONFIG } from "@/lib/config";

interface SwipeEnrollmentCardProps {
  onSuccessRedirect?: string;
  onSuccess?: () => void;
}

export function SwipeEnrollmentCard({ onSuccessRedirect = "/register/biometric", onSuccess }: SwipeEnrollmentCardProps) {
  const router = useRouter();
  const expectedSequence = APP_CONFIG.defaultSwipeSequence; // ["Left", "Right", "Down", "Right"]

  const [currentAttemptNum, setCurrentAttemptNum] = useState<1 | 2>(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [attempt1Features, setAttempt1Features] = useState<DerivedSwipeFeatures | null>(null);
  const [attempt2Features, setAttempt2Features] = useState<DerivedSwipeFeatures | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<"idle" | "drawing" | "completed" | "inconsistent">("idle");

  const padRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clear or redraw canvas line when points change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#6366f1"; // Indigo-500
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
  }, [points]);

  const addPoint = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setPoints((prev) => [...prev, { x, y, time: performance.now() }]);
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDrawing(true);
    setPoints([]);
    setErrorMsg(null);
    setAttemptStatus("drawing");
    addPoint(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawing) return;
    addPoint(clientX, clientY);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();

    const features = analyzeGesture(points, rect.width, rect.height);

    if (features.gestureSequence.length === 0) {
      setErrorMsg("Swipe movement was too short. Please perform a clear swipe across the pad.");
      setAttemptStatus("idle");
      return;
    }

    if (currentAttemptNum === 1) {
      setAttempt1Features(features);
      setCurrentAttemptNum(2);
      setPoints([]);
      setAttemptStatus("idle");
    } else if (currentAttemptNum === 2) {
      setAttempt2Features(features);
      if (attempt1Features) {
        const check = compareSwipeEnrollmentAttempts(attempt1Features, features);
        if (!check.isConsistent) {
          setAttemptStatus("inconsistent");
          setErrorMsg(check.reason || "Swipe attempts were inconsistent. Please repeat enrollment.");
        } else {
          setAttemptStatus("completed");
          submitSwipeProfile(attempt1Features, features);
        }
      }
    }
  };

  const submitSwipeProfile = async (a1: DerivedSwipeFeatures, a2: DerivedSwipeFeatures) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/enroll/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt1: a1, attempt2: a2 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save swipe gesture profile.");
      }

      if (onSuccess) onSuccess();
      if (onSuccessRedirect && onSuccessRedirect !== "#") {
        router.push(onSuccessRedirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save swipe profile.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentAttemptNum(1);
    setPoints([]);
    setAttempt1Features(null);
    setAttempt2Features(null);
    setAttemptStatus("idle");
    setErrorMsg(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Move className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Swipe Pattern Enrollment</CardTitle>
        <CardDescription>
          Perform your registered gesture pattern <span className="font-semibold text-slate-800 dark:text-slate-200">two times</span> on the gesture pad below.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Header & Target Pattern Guide */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Badge variant={attempt1Features ? "success" : currentAttemptNum === 1 ? "default" : "secondary"}>
              Attempt 1 {attempt1Features && "✓"}
            </Badge>
            <Badge variant={attempt2Features ? "success" : currentAttemptNum === 2 ? "default" : "secondary"}>
              Attempt 2 {attempt2Features && "✓"}
            </Badge>
          </div>
          <span className="text-xs font-semibold text-slate-500">Step {currentAttemptNum} of 2</span>
        </div>

        {/* Expected Sequence Guide */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Required Gesture Sequence</p>
          <div className="flex items-center justify-center space-x-2 font-mono font-bold text-slate-800 dark:text-slate-100 text-base">
            {expectedSequence.map((dir, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {dir}
                </span>
                {idx < expectedSequence.length - 1 && <span className="text-slate-400">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Interactive Gesture Canvas Pad */}
        <div
          ref={padRef}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleEnd}
          className="relative h-64 w-full rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center cursor-crosshair select-none touch-none overflow-hidden shadow-inner"
        >
          <canvas
            ref={canvasRef}
            width={500}
            height={256}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {points.length === 0 && (
            <div className="pointer-events-none text-center p-4 space-y-2 text-slate-400 dark:text-slate-600">
              <Hand className="h-8 w-8 mx-auto animate-pulse text-indigo-400" />
              <p className="text-sm font-medium">Swipe your finger or mouse across the pad</p>
              <p className="text-xs">
                (Left → Right → Down → Right)
              </p>
            </div>
          )}
        </div>

        {/* Captured Attempt 1 Info if complete */}
        {attempt1Features && (
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Attempt 1 Sequence:</span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{attempt1Features.sequenceString || "Detected"}</span>
            </div>
            <div>
              <span className="text-slate-500">Duration:</span>{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{attempt1Features.totalDurationMs} ms</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Gesture Verification</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing swipe gesture profile...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reset Gesture
        </Button>

        {attemptStatus === "inconsistent" && (
          <Button size="sm" onClick={handleReset}>
            Retry Swipe
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
