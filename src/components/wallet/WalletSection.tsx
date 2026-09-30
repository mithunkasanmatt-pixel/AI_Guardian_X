"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Wallet as WalletIcon,
  Plus,
  ShieldCheck,
  FileCode,
  Clock,
  CheckCircle2,
  ChevronUp,
  Unlock,
  Lock,
  Keyboard,
  Move,
  AlertTriangle,
  X,
  Hand,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { analyzeKeystrokes, KeystrokeEvent } from "@/lib/typing/typing-analyzer";
import { analyzeGesture, Point } from "@/lib/swipe/swipe-analyzer";
import { AddWalletCard } from "./AddWalletCard";

interface WalletItem {
  id: string;
  name: string;
  type: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface WalletSectionProps {
  initialWallets: WalletItem[];
  isUnlocked?: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WalletSection({ initialWallets, isUnlocked = true }: WalletSectionProps) {
  const [wallets, setWallets] = useState<WalletItem[]>(initialWallets);
  const [showAddForm, setShowAddForm] = useState(false);

  // Wallet Opening & Verification State
  const [selectedWalletForOpening, setSelectedWalletForOpening] = useState<WalletItem | null>(null);
  const [openedWallet, setOpenedWallet] = useState<WalletItem | null>(null);

  const [typingInput, setTypingInput] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);

  const [swipePoints, setSwipePoints] = useState<Point[]>([]);
  const [isDrawingSwipe, setIsDrawingSwipe] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const swipePadRef = useRef<HTMLDivElement>(null);
  const swipeCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchWallets = async () => {
    try {
      const res = await fetch("/api/user/wallet/list");
      const data = await res.json();
      if (data.success) {
        setWallets(data.wallets);
      }
    } catch (err) {
      console.error("Failed to refresh wallets list:", err);
    }
  };

  const handleSuccess = () => {
    fetchWallets();
    setShowAddForm(false);
  };

  // Canvas drawing for Swipe Pad in Open Wallet Modal
  useEffect(() => {
    if (!selectedWalletForOpening) return;
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
  }, [swipePoints, selectedWalletForOpening]);

  // Keystroke listeners for typing pattern verification during wallet opening
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

  // Swipe gesture handlers for swipe pattern verification during wallet opening
  const addSwipePoint = (clientX: number, clientY: number) => {
    if (!swipePadRef.current) return;
    const rect = swipePadRef.current.getBoundingClientRect();
    setSwipePoints((prev) => [
      ...prev,
      { x: clientX - rect.left, y: clientY - rect.top, time: performance.now() },
    ]);
  };

  const handleSwipeStart = (clientX: number, clientY: number) => {
    setIsDrawingSwipe(true);
    setSwipePoints([]);
    addSwipePoint(clientX, clientY);
  };

  const handleSwipeMove = (clientX: number, clientY: number) => {
    if (!isDrawingSwipe) return;
    addSwipePoint(clientX, clientY);
  };

  const handleSwipeEnd = () => {
    if (!isDrawingSwipe) return;
    setIsDrawingSwipe(false);
  };

  const handleStartOpenWallet = (wallet: WalletItem) => {
    setSelectedWalletForOpening(wallet);
    setOpenedWallet(null);
    setTypingInput("");
    setKeystrokes([]);
    setSwipePoints([]);
    setErrorMsg(null);
  };

  // VERIFY BOTH TYPING AND SWIPE PATTERNS WHEN OPENING WALLET
  const handleVerifyAndOpenWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForOpening) return;

    setErrorMsg(null);

    if (!typingInput || typingInput.trim().length < 2 || keystrokes.length < 2) {
      setErrorMsg("Please type the wallet name to capture your typing pattern.");
      return;
    }

    if (swipePoints.length < 2 || !swipePadRef.current) {
      setErrorMsg("Please perform your registered swipe gesture on the pad.");
      return;
    }

    setIsVerifying(true);

    const padRect = swipePadRef.current.getBoundingClientRect();
    const typingAttempt = analyzeKeystrokes(keystrokes, typingInput);
    const swipeAttempt = analyzeGesture(swipePoints, padRect.width, padRect.height);

    try {
      // Verify Typing Pattern
      const typingRes = await fetch("/api/user/wallet/verify-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typingAttempt }),
      });
      const typingData = await typingRes.json();

      // Verify Swipe Pattern
      const swipeRes = await fetch("/api/user/wallet/verify-swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipeAttempt }),
      });
      const swipeData = await swipeRes.json();

      setIsVerifying(false);

      const typingMatched = typingRes.ok && typingData.success;
      const swipeMatched = swipeRes.ok && swipeData.success;

      // REQUIREMENT: Open wallet ONLY IF BOTH typing pattern AND swipe pattern match registered patterns.
      // IF EITHER PATTERN DOES NOT MATCH, EXIT/CLOSE IMMEDIATELY!
      if (typingMatched && swipeMatched) {
        setOpenedWallet(selectedWalletForOpening);
        setSelectedWalletForOpening(null);
        setTypingInput("");
        setKeystrokes([]);
        setSwipePoints([]);
        setErrorMsg(null);
      } else {
        let failureReason = "Wallet pattern verification failed.";
        if (!typingMatched && !swipeMatched) {
          failureReason = "Typing pattern and swipe pattern both failed to match.";
        } else if (!typingMatched) {
          failureReason = "Typing pattern did not match registered pattern.";
        } else {
          failureReason = "Swipe pattern did not match registered pattern.";
        }

        setErrorMsg(`${failureReason} Exiting system immediately...`);

        // Immediately exit/close system
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}

        setTimeout(() => {
          window.location.href = "/login?reason=wallet_verification_failed";
        }, 1200);
      }
    } catch (err: any) {
      setIsVerifying(false);
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/login?reason=wallet_verification_failed";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with Add Wallet toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Registered Crypto Wallets ({wallets.length})
          </h2>
          <p className="text-xs text-slate-500">
            Protected by typing pattern & swipe pattern behavioral biometric verification
          </p>
        </div>

        <Button
          onClick={() => {
            if (!isUnlocked) return;
            setShowAddForm((prev) => !prev);
          }}
          disabled={!isUnlocked}
          className={`${
            isUnlocked
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
              : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
          } gap-1.5`}
          title={!isUnlocked ? "Complete Pattern Registrations above to unlock Add Wallet" : ""}
        >
          {showAddForm ? (
            <>
              <ChevronUp className="h-4 w-4" /> Close Form
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {isUnlocked ? "Add Wallet" : "Add Wallet (Locked)"}
            </>
          )}
        </Button>
      </div>

      {/* Add Wallet Form Section */}
      {showAddForm && (
        <div className="transition-all duration-300">
          <AddWalletCard onSuccess={handleSuccess} />
        </div>
      )}

      {/* OPENED WALLET MODAL / VIEW (When both typing and swipe patterns match) */}
      {openedWallet && (
        <Card className="border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300">
                  <Unlock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Wallet Opened: {openedWallet.name}
                  </CardTitle>
                  <CardDescription className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Verified & Unlocked with Typing Pattern & Swipe Pattern Match ✓
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenedWallet(null)}
                className="gap-1 text-xs"
              >
                <X className="h-4 w-4" /> Close Wallet
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block">Wallet Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{openedWallet.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">File Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{openedWallet.fileName || "keystore.json"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Registered Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200" suppressHydrationWarning>{formatDate(openedWallet.createdAt)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Decrypted Keystore File Status:</p>
                <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                  {`{\n  "walletName": "${openedWallet.name}",\n  "type": "${openedWallet.type}",\n  "status": "UNLOCKED_AND_VERIFIED",\n  "typingPatternMatch": true,\n  "swipePatternMatch": true,\n  "accessGrantedAt": "${new Date().toISOString()}"\n}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OPEN WALLET VERIFICATION MODAL */}
      {selectedWalletForOpening && (
        <Card className="border-2 border-indigo-500 shadow-2xl bg-white dark:bg-slate-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Open Wallet Verification</CardTitle>
                  <CardDescription>
                    Verify both <span className="font-semibold text-indigo-600">Typing Pattern</span> and{" "}
                    <span className="font-semibold text-indigo-600">Swipe Pattern</span> to open "{selectedWalletForOpening.name}".
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWalletForOpening(null)}
                disabled={isVerifying}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerifyAndOpenWallet} className="space-y-6">
              {errorMsg && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Verification Error</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Requirement 1: Verify Typing Pattern */}
              <div className="space-y-2 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <Label htmlFor="open-typing-input" className="font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-300">
                  <Keyboard className="h-4 w-4 text-indigo-600" /> Step 1: Verify Typing Pattern
                </Label>
                <p className="text-xs text-slate-500">
                  Type the wallet name (<span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedWalletForOpening.name}</span>) to measure your typing speed and timing dynamics.
                </p>
                <Input
                  id="open-typing-input"
                  type="text"
                  required
                  placeholder={`Type "${selectedWalletForOpening.name}" here...`}
                  value={typingInput}
                  onChange={(e) => setTypingInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  className="font-mono text-sm"
                  disabled={isVerifying}
                />
                <div className="text-[11px] font-mono text-slate-500">
                  Keystrokes recorded: {keystrokes.length}
                </div>
              </div>

              {/* Requirement 2: Verify Swipe Pattern */}
              <div className="space-y-2 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between">
                  <Label className="font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-300">
                    <Move className="h-4 w-4 text-indigo-600" /> Step 2: Verify Swipe Pattern
                  </Label>
                  <span className="text-[11px] font-mono text-indigo-600">Left → Right → Down → Right</span>
                </div>
                <p className="text-xs text-slate-500">
                  Perform your registered swipe pattern gesture on the pad below.
                </p>

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
                  className="relative h-32 w-full rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center cursor-crosshair select-none touch-none overflow-hidden"
                >
                  <canvas
                    ref={swipeCanvasRef}
                    width={500}
                    height={128}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />

                  {swipePoints.length === 0 && (
                    <div className="pointer-events-none text-center p-2 space-y-1 text-slate-400 dark:text-slate-600">
                      <Hand className="h-5 w-5 mx-auto text-indigo-400 animate-pulse" />
                      <p className="text-xs font-medium">Swipe your finger or mouse across the pad</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                Both patterns must match your registered patterns. If either pattern fails to match, the system will exit immediately.
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedWalletForOpening(null)}
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold"
                  disabled={isVerifying || keystrokes.length < 2 || swipePoints.length < 2}
                >
                  {isVerifying ? "Verifying Patterns..." : "Verify & Open Wallet"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <Card className="border border-dashed border-slate-300 dark:border-slate-800 text-center py-10 bg-slate-50/50 dark:bg-slate-900/40">
          <CardContent className="space-y-3">
            <WalletIcon className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Wallets Registered Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click <span className="font-semibold text-indigo-600">"Add Wallet"</span> above to securely register your crypto keystore file.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1 mt-2">
              <Plus className="h-4 w-4" /> Add Your First Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wallets.map((wallet) => (
            <Card key={wallet.id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{wallet.name}</h3>
                      <Badge variant="outline" className="text-xs border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {wallet.type}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <FileCode className="h-3.5 w-3.5 text-slate-400" /> {wallet.fileName || "keystore-wallet.json"}
                    </p>
                  </div>
                  <Badge variant="success" className="gap-1 text-[11px]">
                    <ShieldCheck className="h-3 w-3" /> Protected
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                  <span className="flex items-center gap-1" suppressHydrationWarning>
                    <Clock className="h-3 w-3" /> Registered: {formatDate(wallet.createdAt)}
                  </span>
                  <span>{wallet.fileSize ? `${wallet.fileSize} B` : "Encrypted"}</span>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleStartOpenWallet(wallet)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold"
                  >
                    <Unlock className="h-3.5 w-3.5" /> Open Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
