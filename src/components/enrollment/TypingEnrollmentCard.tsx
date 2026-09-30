"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeKeystrokes, DerivedTypingFeatures, KeystrokeEvent } from "@/lib/typing/typing-analyzer";
import { compareEnrollmentAttempts } from "@/lib/typing/typing-matcher";
import { APP_CONFIG } from "@/lib/config";

interface TypingEnrollmentCardProps {
  onSuccessRedirect?: string;
  onSuccess?: () => void;
}

export function TypingEnrollmentCard({ onSuccessRedirect = "/register/swipe", onSuccess }: TypingEnrollmentCardProps) {
  const router = useRouter();

  // Requirement 2: Use different texts for Attempt 1 and Attempt 2
  const sentenceAttempt1 = APP_CONFIG.typingSentences[0] || "The quick brown fox jumps over the lazy dog.";
  const sentenceAttempt2 = APP_CONFIG.typingSentences[1] || "Pack my box with five dozen liquor jugs.";

  const [currentAttemptNum, setCurrentAttemptNum] = useState<1 | 2>(1);
  const [typedText, setTypedText] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [attempt1Features, setAttempt1Features] = useState<DerivedTypingFeatures | null>(null);
  const [attempt2Features, setAttempt2Features] = useState<DerivedTypingFeatures | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<"idle" | "typing" | "completed" | "inconsistent">("idle");

  const inputRef = useRef<HTMLInputElement>(null);

  const targetText = currentAttemptNum === 1 ? sentenceAttempt1 : sentenceAttempt2;

  // Focus input on mount or attempt change
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentAttemptNum]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;

    const newEvent: KeystrokeEvent = {
      key: e.key,
      code: e.code,
      downTime: performance.now(),
    };

    setKeystrokes((prev) => [...prev, newEvent]);
    if (attemptStatus !== "typing") setAttemptStatus("typing");
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    setKeystrokes((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].key === e.key && !prev[i].upTime) {
          const updated = [...prev];
          updated[i] = { ...updated[i], upTime: now };
          return updated;
        }
      }
      return prev;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedText(val);

    // When the sentence for current attempt is typed completely
    if (val === targetText) {
      const features = analyzeKeystrokes(keystrokes, targetText);

      if (currentAttemptNum === 1) {
        setAttempt1Features(features);
        setCurrentAttemptNum(2);
        setTypedText("");
        setKeystrokes([]);
        setAttemptStatus("idle");
        setErrorMsg(null);
      } else if (currentAttemptNum === 2) {
        setAttempt2Features(features);
        if (attempt1Features) {
          // Compare attempt 1 and attempt 2 for consistency
          const check = compareEnrollmentAttempts(attempt1Features, features);
          if (!check.isConsistent) {
            setAttemptStatus("inconsistent");
            setErrorMsg(check.reason || "Your typing pattern was too inconsistent between the two attempts. Please repeat enrollment.");
          } else {
            setAttemptStatus("completed");
            setErrorMsg(null);
            submitTypingProfile(attempt1Features, features);
          }
        }
      }
    }
  };

  const submitTypingProfile = async (a1: DerivedTypingFeatures, a2: DerivedTypingFeatures) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/enroll/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt1: a1, attempt2: a2 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save typing enrollment profile.");
      }

      if (onSuccess) onSuccess();
      if (onSuccessRedirect && onSuccessRedirect !== "#") {
        router.push(onSuccessRedirect);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save typing profile.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentAttemptNum(1);
    setTypedText("");
    setKeystrokes([]);
    setAttempt1Features(null);
    setAttempt2Features(null);
    setAttemptStatus("idle");
    setErrorMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const progressPercent = Math.min(100, Math.round((typedText.length / targetText.length) * 100));

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      <CardHeader className="text-center pb-4 px-4 sm:px-6">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Keyboard className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold">Typing Speed Enrollment</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Type the <span className="font-semibold text-slate-800 dark:text-slate-200">2 different sentences</span> shown below at your natural typing speed to build your reference profile.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-4 sm:px-6">
        {/* Progress header & Attempts indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Badge variant={attempt1Features ? "success" : currentAttemptNum === 1 ? "default" : "secondary"} className="text-xs">
              Attempt 1 {attempt1Features && "✓"}
            </Badge>
            <Badge variant={attempt2Features ? "success" : currentAttemptNum === 2 ? "default" : "secondary"} className="text-xs">
              Attempt 2 {attempt2Features && "✓"}
            </Badge>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Step {currentAttemptNum} of 2 (Different Text)
          </span>
        </div>

        {/* Target Sentence Box */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
            Target Sentence for Attempt {currentAttemptNum}
          </p>
          <p className="text-base sm:text-lg font-mono font-medium text-slate-800 dark:text-slate-100 tracking-wide select-none break-words">
            "{targetText}"
          </p>
        </div>

        {/* Live typing input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Type here naturally:</span>
            <span>{typedText.length} / {targetText.length} chars</span>
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={typedText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              disabled={isSubmitting || attemptStatus === "completed" || attemptStatus === "inconsistent"}
              placeholder="Start typing the sentence..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full h-12 px-3.5 sm:px-4 font-mono text-sm sm:text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
          <Progress value={progressPercent} className="h-1.5 mt-2" />
        </div>

        {/* Attempt 1 Summary metrics if captured */}
        {attempt1Features && (
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-3 gap-1.5 text-center text-xs">
            <div>
              <p className="text-slate-500 text-[11px]">Attempt 1 Speed</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{attempt1Features.averageTypingSpeedCPM} CPM</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px]">Key Interval</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{attempt1Features.averageKeyIntervalMs} ms</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px]">Consistency</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{attempt1Features.consistencyScore}%</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Enrollment Attention Needed</AlertTitle>
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Status indicator */}
        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing derived typing profile...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 px-4 sm:px-6">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting} className="text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reset Attempts
        </Button>

        {attemptStatus === "inconsistent" && (
          <Button size="sm" onClick={handleReset} className="text-xs">
            Retry Enrollment
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
