import React from "react";
import Link from "next/link";
import { Lock, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function LockedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 border-red-200 dark:border-red-950 shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mb-3 shadow-lg animate-pulse">
            <Lock className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">
            ACCESS DENIED
          </CardTitle>
          <CardDescription className="text-base text-slate-700 dark:text-slate-300 font-medium mt-1">
            Behavioral verification failed.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive" className="border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-base font-bold">Application Security Lock Activated</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed mt-1">
              The current session has been invalidated and protected application features have been locked for security.
            </AlertDescription>
          </Alert>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Why am I seeing this screen?</p>
            <p>
              Our zero-trust security engine detected that the current interaction dynamics did not match the registered user baseline. Please re-authenticate to verify identity.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link href="/login" className="w-full">
            <Button variant="destructive" size="lg" className="w-full gap-2 text-base font-semibold">
              Authenticate Again <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
