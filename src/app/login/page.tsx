"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectReason = searchParams.get("reason");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    redirectReason === "wallet_verification_failed"
      ? "Session terminated: Behavioral verification failed during wallet creation."
      : redirectReason === "session_terminated"
      ? "Session terminated due to security mismatch."
      : null
  );

  useEffect(() => {
    if (redirectReason) {
      window.history.replaceState(null, "", "/login");
    }
  }, [redirectReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login/step1-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email address or password.");
      }

      router.push(data.nextStep || "/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email address or password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <img src="/logo.png" alt="AI Guardian X Logo" className="h-12 w-12 mx-auto rounded-xl shadow-md object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign In to AI Guardian X</CardTitle>
          <CardDescription>
            Enter your registered email and password to access your Dashboard.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button type="submit" size="lg" className="w-full gap-2 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
