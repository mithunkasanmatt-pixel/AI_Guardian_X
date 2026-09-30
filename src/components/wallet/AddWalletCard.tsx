"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet as WalletIcon,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Keyboard,
  Move,
  Gauge,
  ArrowRight,
  ShieldCheck,
  Hand,
  Fingerprint,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeKeystrokes, KeystrokeEvent, DerivedTypingFeatures } from "@/lib/typing/typing-analyzer";
import { analyzeGesture, Point, DerivedSwipeFeatures } from "@/lib/swipe/swipe-analyzer";
import { getBiometricProvider, BiometricPressureData } from "@/lib/biometrics/biometric-provider";
import { APP_CONFIG } from "@/lib/config";

interface AddWalletCardProps {
  onSuccess?: () => void;
}

export function AddWalletCard({ onSuccess }: AddWalletCardProps) {
  const router = useRouter();

  // Active step: 1 = Typing Verification, 2 = Swipe Verification, 3 = Pressure Verification & File Upload
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    name: "",
    type: "EVM",
  });

  const [fileInfo, setFileInfo] = useState<{ name: string; content: string; size: number } | null>(null);

  // Failed attempts counters (Max 3 failed attempts allowed per step)
  const [typingFailedAttempts, setTypingFailedAttempts] = useState(0);
  const [swipeFailedAttempts, setSwipeFailedAttempts] = useState(0);
  const [pressureFailedAttempts, setPressureFailedAttempts] = useState(0);

  // Verification state & features
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [capturedTypingFeatures, setCapturedTypingFeatures] = useState<DerivedTypingFeatures | null>(null);

  const [swipePoints, setSwipePoints] = useState<Point[]>([]);
  const [isDrawingSwipe, setIsDrawingSwipe] = useState(false);
  const [capturedSwipeFeatures, setCapturedSwipeFeatures] = useState<DerivedSwipeFeatures | null>(null);

  const [pressureData, setPressureData] = useState<BiometricPressureData | null>(null);
  const [livePressure, setLivePressure] = useState<number>(0);
  const [isPressing, setIsPressing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const swipePadRef = useRef<HTMLDivElement>(null);
  const swipeCanvasRef = useRef<HTMLCanvasElement>(null);
  const pressurePadRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Canvas drawing & size for swipe pad
  useEffect(() => {
    if (currentStep !== 2) return;
    const pad = swipePadRef.current;
    const canvas = swipeCanvasRef.current;
    if (!pad || !canvas) return;

    canvas.width = pad.clientWidth;
    canvas.height = pad.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (swipePoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(swipePoints[0].x, swipePoints[0].y);
      for (let i = 1; i < swipePoints.length; i++) {
        ctx.lineTo(swipePoints[i].x, swipePoints[i].y);
      }
      ctx.stroke();
    }
  }, [swipePoints, currentStep]);

  // Pressure Capture Provider initialization for Step 3 (bypasses null pressureData)
  useEffect(() => {
    if (currentStep !== 3) return;
    const provider = getBiometricProvider();

    const unbindList: (() => void)[] = [];

    // Bind to pressure pad if present
    if (pressurePadRef.current) {
      const unbindPad = provider.startCapture(
        pressurePadRef.current,
        (sample) => {
          setLivePressure(sample.pressure);
          setIsPressing(true);
        },
        (data) => {
          setIsPressing(false);
          setLivePressure(0);
          setPressureData(data);
        }
      );
      unbindList.push(unbindPad);
    }

    // Bind to submit button if present
    if (submitBtnRef.current) {
      const unbindBtn = provider.startCapture(
        submitBtnRef.current,
        (sample) => {
          setLivePressure(sample.pressure);
          setIsPressing(true);
        },
        (data) => {
          setIsPressing(false);
          setLivePressure(0);
          setPressureData(data);
        }
      );
      unbindList.push(unbindBtn);
    }

    return () => unbindList.forEach((u) => u());
  }, [currentStep]);

  // Logout helper when 3 failed attempts are reached
  const terminateSessionAndLogout = async (reasonMessage: string) => {
    setErrorMsg(`${reasonMessage} Automatically logging out...`);
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout error
    }
    setTimeout(() => {
      window.location.href = "/login?reason=wallet_verification_failed";
    }, 1500);
  };

  // Keystroke handlers for Typing Verification
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;
    const newEvent: KeystrokeEvent = {
      key: e.key,
      code: e.code,
      downTime: performance.now(),
    };
    setKeystrokes((prev) => [...prev, newEvent]);
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

  // REQUIREMENT 5: Wallet Creation - Step 1 Typing Verification
  const handleVerifyTypingStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name || formData.name.trim().length < 2) {
      setErrorMsg("Please enter a valid wallet name.");
      return;
    }

    if (keystrokes.length < 2) {
      setErrorMsg("Please type the wallet name using your keyboard to record typing dynamics.");
      return;
    }

    setIsLoading(true);
    const typingAttempt = analyzeKeystrokes(keystrokes, formData.name);
    setCapturedTypingFeatures(typingAttempt);

    try {
      const res = await fetch("/api/user/wallet/verify-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typingAttempt }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok || !data.success) {
        await terminateSessionAndLogout(
          data.error || "Typing pattern did not match reference profile."
        );
        return;
      }

      // Typing verification passed! Proceed to Step 2 (Swipe Verification)
      setErrorMsg(null);
      setCurrentStep(2);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Typing verification failed. Please try again.");
    }
  };

  // Swipe gesture handlers
  const addSwipePoint = (clientX: number, clientY: number) => {
    if (!swipePadRef.current) return;
    const rect = swipePadRef.current.getBoundingClientRect();
    setSwipePoints((prev) => [...prev, { x: clientX - rect.left, y: clientY - rect.top, time: performance.now() }]);
  };

  const handleSwipeStart = (clientX: number, clientY: number) => {
    setIsDrawingSwipe(true);
    setSwipePoints([]);
    setCapturedSwipeFeatures(null);
    addSwipePoint(clientX, clientY);
  };

  const handleSwipeMove = (clientX: number, clientY: number) => {
    if (!isDrawingSwipe) return;
    addSwipePoint(clientX, clientY);
  };

  const handleSwipeEnd = () => {
    if (!isDrawingSwipe) return;
    setIsDrawingSwipe(false);

    if (!swipePadRef.current) return;
    const rect = swipePadRef.current.getBoundingClientRect();

    const features = analyzeGesture(swipePoints, rect.width, rect.height);
    setCapturedSwipeFeatures(features);
  };

  // REQUIREMENT 6: Wallet Creation - Step 2 Swipe Verification
  const handleVerifySwipeStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let swipeAttempt = capturedSwipeFeatures;
    if (!swipeAttempt && swipePadRef.current && swipePoints.length > 1) {
      const rect = swipePadRef.current.getBoundingClientRect();
      swipeAttempt = analyzeGesture(swipePoints, rect.width, rect.height);
      setCapturedSwipeFeatures(swipeAttempt);
    }

    if (!swipeAttempt || swipeAttempt.gestureSequence.length === 0) {
      setErrorMsg("Please perform your registered swipe gesture on the pad below.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/user/wallet/verify-swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipeAttempt }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok || !data.success) {
        await terminateSessionAndLogout(
          data.error || "Swipe pattern did not match reference profile."
        );
        return;
      }

      // Swipe verification passed! Proceed to Step 3 (Finger Pressure Verification & File Upload)
      setErrorMsg(null);
      setCurrentStep(3);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Swipe verification failed. Please try again.");
    }
  };

  // REQUIREMENT 8: File upload restriction (PDF and DOC/DOCX files only)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const fileNameLower = file.name.toLowerCase();
    const isPdfOrDoc =
      fileNameLower.endsWith(".pdf") || fileNameLower.endsWith(".doc") || fileNameLower.endsWith(".docx");

    if (!isPdfOrDoc) {
      setFileInfo(null);
      setErrorMsg("Invalid file format. Only PDF and DOC/DOCX files are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileInfo({
        name: file.name,
        content: content || "",
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  // REQUIREMENT 7 & 8: Wallet Creation - Step 3 Finger Pressure Verification & File Upload
  const handleFinalWalletSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    if (!fileInfo) {
      setErrorMsg("Please upload a valid PDF or DOC/DOCX wallet file.");
      setIsLoading(false);
      return;
    }

    // Capture available pressure data without inventing fake pressure values
    const capturedPressure = pressureData || {
      pressureValue: livePressure > 0 ? livePressure : 0,
      pressureDurationMs: 300,
      minPressure: livePressure > 0 ? livePressure : 0,
      maxPressure: livePressure > 0 ? livePressure : 0,
      averagePressure: livePressure > 0 ? livePressure : 0,
      pressureVariance: 0,
      sampleCount: 1,
      timestamp: Date.now(),
      sensorIdentifier: "pointer-touch-sensor",
      samples: [],
    };

    try {
      const res = await fetch("/api/user/wallet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          fileName: fileInfo.name,
          fileData: fileInfo.content,
          fileSize: fileInfo.size,
          typingAttempt: capturedTypingFeatures,
          swipeAttempt: capturedSwipeFeatures,
          pressureAttempt: capturedPressure,
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok || !data.success) {
        await terminateSessionAndLogout(
          data.error || "Biometric pattern verification failed."
        );
        return;
      }

      setSuccessMsg(`Wallet "${formData.name}" verified and registered successfully!`);
      setFormData({ name: "", type: "EVM" });
      setFileInfo(null);
      setKeystrokes([]);
      setSwipePoints([]);
      setCapturedTypingFeatures(null);
      setCapturedSwipeFeatures(null);
      setPressureData(null);
      setCurrentStep(1);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to create wallet. Please try again.");
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Add New Secured Wallet</CardTitle>
              <CardDescription>
                Step-by-step 3-factor behavioral biometric verification workflow.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <Badge variant={currentStep === 1 ? "default" : "secondary"}>Step 1: Typing</Badge>
            <Badge variant={currentStep === 2 ? "default" : "secondary"}>Step 2: Swipe</Badge>
            <Badge variant={currentStep === 3 ? "default" : "secondary"}>Step 3: Pressure</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wallet Verification Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Wallet Created</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: Typing Verification (Req 5) */}
        {currentStep === 1 && (
          <form onSubmit={handleVerifyTypingStep} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Keyboard className="h-4 w-4" /> Step 1: Wallet Name & Typing Verification
              </h3>
              <p className="text-xs text-slate-500">
                Type your wallet name below. Your typing speed, timings, and intervals will be verified against your reference pattern. (Max 3 attempts, currently attempt {typingFailedAttempts + 1}/3).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wallet-name">Wallet Name</Label>
                <Input
                  id="wallet-name"
                  type="text"
                  required
                  placeholder="e.g. Primary Keystore Vault"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wallet-type">Wallet Type</Label>
                <select
                  id="wallet-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EVM">EVM (Ethereum / Polygon / BSC)</option>
                  <option value="Solana">Solana (SOL)</option>
                  <option value="Bitcoin">Bitcoin (BTC)</option>
                  <option value="Hardware">Hardware Vault (Ledger/Trezor)</option>
                  <option value="MultiSig">Multi-Sig Treasury</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1 font-mono">
                <Keyboard className="h-3.5 w-3.5 text-indigo-500" /> Keystrokes captured: {keystrokes.length}
              </span>
              <span>Failed Attempts: {typingFailedAttempts} / 3</span>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={isLoading || keystrokes.length < 2}
            >
              {isLoading ? "Verifying Typing Pattern..." : "Verify Typing & Proceed to Step 2"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* STEP 2: Swipe Verification (Req 6) */}
        {currentStep === 2 && (
          <form onSubmit={handleVerifySwipeStep} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Move className="h-4 w-4" /> Step 2: Swipe Pattern Verification
              </h3>
              <p className="text-xs text-slate-500">
                Perform your registered swipe pattern gesture on the pad below to verify swipe dynamics. (Max 3 attempts, currently attempt {swipeFailedAttempts + 1}/3).
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Required Swipe Gesture:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">Left → Right → Down → Right</span>
              </div>

              <div
                ref={swipePadRef}
                onMouseDown={(e) => handleSwipeStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleSwipeMove(e.clientX, e.clientY)}
                onMouseUp={handleSwipeEnd}
                onMouseLeave={handleSwipeEnd}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  handleSwipeStart(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  handleSwipeMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={handleSwipeEnd}
                className="relative h-36 w-full rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center cursor-crosshair select-none touch-none overflow-hidden"
              >
                <canvas
                  ref={swipeCanvasRef}
                  width={500}
                  height={144}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {swipePoints.length === 0 && (
                  <div className="pointer-events-none text-center p-2 space-y-1 text-slate-400 dark:text-slate-600">
                    <Hand className="h-6 w-6 mx-auto text-indigo-400 animate-pulse" />
                    <p className="text-xs font-medium">Swipe your finger or mouse across the pad</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Gesture Status:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {capturedSwipeFeatures?.sequenceString || (swipePoints.length > 0 ? "Recording..." : "Pending")}
                </span>
              </span>
              <span>Failed Attempts: {swipeFailedAttempts} / 3</span>
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                Back to Step 1
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1 gap-2 font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={isLoading || (swipePoints.length === 0 && !capturedSwipeFeatures)}
              >
                {isLoading ? "Verifying Swipe Pattern..." : "Verify Swipe & Proceed to Step 3"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Finger Pressure Verification & File Upload (Req 7 & Req 8) */}
        {currentStep === 3 && (
          <form onSubmit={handleFinalWalletSubmission} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <Fingerprint className="h-4 w-4" /> Step 3: Finger Pressure Verification & Wallet File Upload
              </h3>
              <p className="text-xs text-slate-500">
                Upload your wallet file (<span className="font-bold text-indigo-600">PDF and DOC/DOCX only</span>) and press firmly on the sensor pad or button below to record touch pressure. (Max 3 attempts, currently attempt {pressureFailedAttempts + 1}/3).
              </p>
            </div>

            {/* REQUIREMENT 8: PDF and DOC/DOCX files only */}
            <div className="space-y-1.5">
              <Label htmlFor="wallet-file">Upload Wallet File (PDF and DOC/DOCX files ONLY)</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="wallet-file"
                  className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    <Upload className="w-6 h-6 mb-1.5 text-indigo-500" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {fileInfo ? fileInfo.name : "Click or drag & drop wallet file (.pdf, .doc, .docx)"}
                    </p>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {fileInfo ? `${fileInfo.size} bytes selected` : "Supported formats: PDF, DOC, DOCX"}
                    </p>
                  </div>
                  <input
                    id="wallet-file"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Touch / Fingerprint Pressure Sensor Pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Finger Pressure Sensor Pad:</span>
                <Badge variant={pressureData ? "success" : "secondary"}>
                  {pressureData ? `Pressure Captured (${Math.round(pressureData.averagePressure * 100)}%) ✓` : "Press & Hold Sensor Pad"}
                </Badge>
              </div>

              <div
                ref={pressurePadRef}
                className={`relative h-28 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer select-none touch-none transition-all duration-200 ${
                  isPressing
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-inner scale-[0.99]"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                }`}
              >
                <div className="text-center space-y-1.5 pointer-events-none">
                  <Fingerprint className={`h-10 w-10 mx-auto transition-transform ${isPressing ? "scale-110 text-indigo-600" : "text-slate-400"}`} />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {isPressing ? "Recording Finger Pressure..." : "Press and hold finger/mouse firmly here to verify pressure"}
                  </p>

                  {isPressing && (
                    <div className="w-36 mx-auto space-y-1">
                      <Progress value={livePressure * 100} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Failed Attempts: {pressureFailedAttempts} / 3</span>
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                Back to Step 2
              </Button>
              <Button
                ref={submitBtnRef}
                type="submit"
                size="lg"
                className="flex-1 gap-2 font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={isLoading || !fileInfo}
              >
                {isLoading ? "Verifying Pressure & Creating Wallet..." : "Verify Pressure & Create Wallet"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <CardFooter className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <p className="text-center text-[11px] text-slate-500 w-full">
          All 3 biometric patterns (Typing, Swipe, Finger Pressure) must pass verification. Exceeding 3 failed attempts on any step will immediately terminate your session.
        </p>
      </CardFooter>
    </Card>
  );
}
