import Link from "next/link";
import { Shield, Keyboard, Move, Fingerprint, Lock, ArrowRight, CheckCircle2, Zap, Smartphone, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="AI Guardian X Logo" className="h-16 w-16 rounded-2xl shadow-xl object-contain" />
        </div>
        <Badge variant="default" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-indigo-600 text-white">
          AI Guardian X Security Platform
        </Badge>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Next-Generation Security Powered by <span className="text-indigo-600 dark:text-indigo-400">AI Guardian X</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Multi-modal zero-trust security analyzing user keystroke timing dynamics, swipe gestures, and fingerprint pressure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button size="lg" className="gap-2 w-full sm:w-auto text-base bg-indigo-600 hover:bg-indigo-500 text-white">
              Get Started with AI Guardian X <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
              Sign In Existing Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
              <Keyboard className="h-6 w-6" />
            </div>
            <CardTitle>1. Typing Speed Dynamics</CardTitle>
            <CardDescription>
              Captures inter-key intervals, hold times, characters per minute, pause frequency, and typing consistency across 2 enrollment attempts.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
              <Move className="h-6 w-6" />
            </div>
            <CardTitle>2. Swipe Pattern Enrollment</CardTitle>
            <CardDescription>
              Analyzes normalized coordinate direction sequences, relative distance vectors, and gesture timing so screen resolution doesn't matter.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
              <Fingerprint className="h-6 w-6" />
            </div>
            <CardTitle>3. WebAuthn Passkeys</CardTitle>
            <CardDescription>
              Leverages browser platform authenticators (Android Fingerprint, iPhone Face ID, Windows Hello). Zero raw biometric secrets ever stored on server.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Architecture Highlights */}
      <section className="bg-indigo-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
        <div className="max-w-3xl space-y-3">
          <Badge className="bg-indigo-700 text-indigo-100 border-none">
            Privacy & Security First Architecture
          </Badge>
          <h2 className="text-3xl font-bold">Built for Maximum Security & Zero Data Leakage</h2>
          <p className="text-indigo-200">
            Complies strictly with modern zero-trust security principles. All behavioral templates are securely derived on the server, while device biometrics remain inside your hardware enclave.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" /> PostgreSQL & Prisma
            </h4>
            <p className="text-xs text-indigo-200">Relational schema storing normalized derived features only.</p>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" /> HTTP-Only Cookies
            </h4>
            <p className="text-xs text-indigo-200">Encrypted JWT sessions protected against XSS and CSRF.</p>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" /> PWA Standalone
            </h4>
            <p className="text-xs text-indigo-200">Installable native experience on mobile and desktop browsers.</p>
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" /> Vercel Ready
            </h4>
            <p className="text-xs text-indigo-200">Serverless API routes with fast cold starts and Neon database integration.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
