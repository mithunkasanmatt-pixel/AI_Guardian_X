"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { browserSupportsWebAuthn, authenticatePasskeyClient } from "@/lib/webauthn/webauthn-client";

interface BiometricVerificationCardProps {
  onSuccessRedirect?: string;
}

export function BiometricVerificationCard({ onSuccessRedirect = "/authenticate/result" }: BiometricVerificationCardProps) {
  const router = useRouter();

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  const handleVerifyBiometric = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch WebAuthn authentication options from server
      const optRes = await fetch("/api/auth/webauthn/auth-options", {
        method: "POST",
      });

      const optData = await optRes.json();
      if (!optRes.ok) {
        throw new Error(optData.error || "Failed to initialize WebAuthn passkey assertion.");
      }

      // 2. Trigger browser passkey prompt (Fingerprint / Face ID / Windows Hello)
      const assertionResponse = await authenticatePasskeyClient(optData.options);

      // 3. Send assertion response to server for cryptographic verification
      const verifyRes = await fetch("/api/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertionResponse }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Biometric authentication assertion invalid.");
      }

      router.push(onSuccessRedirect);
    } catch (err: any) {
      console.error("Biometric Verification Error:", err);
      setErrorMsg(err.message || "Failed to verify device biometric passkey.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 shadow-inner">
          <Fingerprint className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold">Device Biometric Verification</CardTitle>
        <CardDescription>
          Verify your fingerprint, Face ID, Windows Hello, or device PIN passkey.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-center">
          <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Hardware-backed Passkey Verification
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your device will prompt you to confirm your identity using your configured biometric hardware.
          </p>
        </div>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Biometric Verification Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 py-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Waiting for device biometric response...</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(onSuccessRedirect)}
          disabled={isLoading}
        >
          Skip Biometric Verification
        </Button>

        <Button
          size="lg"
          onClick={handleVerifyBiometric}
          disabled={isLoading || isSupported === false}
          className="gap-2"
        >
          <Fingerprint className="h-5 w-5" />
          {isLoading ? "Verifying..." : "Authenticate with Biometric"}
        </Button>
      </CardFooter>
    </Card>
  );
}
