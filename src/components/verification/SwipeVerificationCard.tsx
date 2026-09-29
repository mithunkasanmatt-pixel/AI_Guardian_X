"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Move, RefreshCw, AlertTriangle, Hand } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { analyzeGesture, Point } from "@/lib/swipe/swipe-analyzer";
import { APP_CONFIG } from "@/lib/config";

interface SwipeVerificationCardProps {
  onSuccessRedirect?: string;
}

export function SwipeVerificationCard({ onSuccessRedirect = "/authenticate/biometric" }: SwipeVerificationCardProps) {
  const router = useRouter();
  const expectedSequence = APP_CONFIG.defaultSwipeSequence;

  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#6366f1";
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
    setPoints((prev) => [...prev, { x: clientX - rect.left, y: clientY - rect.top, time: performance.now() }]);
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDrawing(true);
    setPoints([]);
    setErrorMsg(null);
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

    const liveFeatures = analyzeGesture(points, rect.width, rect.height);
    if (liveFeatures.gestureSequence.length === 0) {
      setErrorMsg("Swipe gesture was too short. Please perform the complete gesture.");
      return;
    }

    verifySwipeBehavior(liveFeatures);
  };

  const verifySwipeBehavior = async (features: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveAttempt: features }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Swipe gesture verification failed.");
      }

      router.push(onSuccessRedirect);
    } catch (err: any) {
      setErrorMsg(err.message || "Swipe gesture does not match registered profile.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPoints([]);
    setErrorMsg(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Move className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Swipe Pattern Verification</CardTitle>
        <CardDescription>
          Perform your registered swipe pattern once to verify identity.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Registered Sequence</p>
          <div className="flex items-center justify-center space-x-2 font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
            {expectedSequence.map((dir, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {dir}
                </span>
                {idx < expectedSequence.length - 1 && <span className="text-slate-400">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

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
            </div>
          )}
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Gesture Failure</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Matching live swipe dynamics against baseline profile...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Clear Gesture
        </Button>
      </CardFooter>
    </Card>
  );
}
