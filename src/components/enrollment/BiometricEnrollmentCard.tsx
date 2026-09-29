"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, CheckCircle2, AlertTriangle, ShieldCheck, Cpu, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { browserSupportsWebAuthn, registerPasskeyClient } from "@/lib/webauthn/webauthn-client";

interface BiometricEnrollmentCardProps {
  onSuccessRedirect?: string;
}

export function BiometricEnrollmentCard({ onSuccessRedirect = "/register/success" }: BiometricEnrollmentCardProps) {
  const router = useRouter();

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  const handleRegisterBiometric = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch WebAuthn registration options from server
      const optRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
      });

      const optData = await optRes.json();
      if (!optRes.ok) {
        throw new Error(optData.error || "Failed to initialize WebAuthn passkey registration.");
      }

      // 2. Trigger browser platform authenticator (Fingerprint / Face ID / Windows Hello)
      const credentialResponse = await registerPasskeyClient(optData.options);

      // 3. Send WebAuthn assertion/credential to server for cryptographic verification
      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: credentialResponse }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "WebAuthn passkey registration verification failed.");
      }

      setIsEnrolled(true);
      setTimeout(() => {
        router.push(onSuccessRedirect);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to complete device biometric registration. Please verify your platform settings."
      );
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 shadow-inner">
          <Fingerprint className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold">Device Biometric / Passkey Enrollment</CardTitle>
        <CardDescription>
          Use your fingerprint, Face ID, Windows Hello, or device security method to register this device securely.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Security Notice Box */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Zero-Knowledge Biometric Privacy</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your actual fingerprint images, Face ID templates, or sensor data are <span className="font-semibold text-slate-700 dark:text-slate-300">never sent to or stored in our database</span>. The authentication is performed securely on your device via standard W3C WebAuthn Passkeys.
          </p>
        </div>

        {/* Device support banner */}
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Platform Authenticator</p>
              <p className="text-xs text-slate-500">Android Fingerprint, iPhone Face ID, Windows Hello</p>
            </div>
          </div>
          <Badge variant={isSupported ? "success" : "destructive"}>
            {isSupported === null ? "Checking..." : isSupported ? "Supported" : "Not Supported"}
          </Badge>
        </div>

        {/* Success Banner if enrolled */}
        {isEnrolled && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Passkey Registered Successfully</AlertTitle>
            <AlertDescription>
              Your device biometric passkey has been linked. Redirecting to registration completion...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>WebAuthn Registration Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isSupported === false && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>WebAuthn Not Supported</AlertTitle>
            <AlertDescription>
              Your current browser does not support WebAuthn Passkeys. You can proceed with password, typing dynamics, and swipe authentication.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(onSuccessRedirect)}
          disabled={isLoading}
        >
          Skip / Continue
        </Button>

        <Button
          size="lg"
          onClick={handleRegisterBiometric}
          disabled={isLoading || isSupported === false || isEnrolled}
          className="gap-2"
        >
          <Fingerprint className="h-5 w-5" />
          {isLoading ? "Enrolling Device..." : "Register Biometric Passkey"}
        </Button>
      </CardFooter>
    </Card>
  );
}
