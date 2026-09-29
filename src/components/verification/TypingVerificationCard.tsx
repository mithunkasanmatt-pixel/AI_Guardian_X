"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { analyzeKeystrokes, KeystrokeEvent } from "@/lib/typing/typing-analyzer";
import { APP_CONFIG } from "@/lib/config";

interface TypingVerificationCardProps {
  onSuccessRedirect?: string;
}

export function TypingVerificationCard({ onSuccessRedirect = "/authenticate/swipe" }: TypingVerificationCardProps) {
  const router = useRouter();
  const targetText = APP_CONFIG.defaultTypingSentence;

  const [typedText, setTypedText] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;

    setKeystrokes((prev) => [
      ...prev,
      {
        key: e.key,
        code: e.code,
        downTime: performance.now(),
      },
    ]);
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

    if (val === targetText) {
      const liveFeatures = analyzeKeystrokes(keystrokes, targetText);
      verifyTypingBehavior(liveFeatures);
    }
  };

  const verifyTypingBehavior = async (features: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveAttempt: features }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Typing verification failed.");
      }

      router.push(onSuccessRedirect);
    } catch (err: any) {
      setErrorMsg(err.message || "Typing behavior verification failed.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTypedText("");
    setKeystrokes([]);
    setErrorMsg(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const progressPercent = Math.min(100, Math.round((typedText.length / targetText.length) * 100));

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
          <Keyboard className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Typing Behavior Verification</CardTitle>
        <CardDescription>
          Type the security sentence once at your natural pace to verify your behavioral characteristic.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Target Sentence</p>
          <p className="text-lg font-mono font-medium text-slate-800 dark:text-slate-100 tracking-wide select-none">
            "{targetText}"
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Type here to verify:</span>
            <span>{typedText.length} / {targetText.length} chars</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            disabled={isSubmitting}
            placeholder="Type the sentence naturally..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full h-12 px-4 font-mono text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100 disabled:opacity-50"
          />
          <Progress value={progressPercent} className="h-1.5 mt-2" />
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Failure</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verifying typing dynamics against baseline profile...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Clear & Retry
        </Button>
      </CardFooter>
    </Card>
  );
}
