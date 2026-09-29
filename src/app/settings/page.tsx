import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { User, Mail, Shield, Bell, Key, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile, biometric enrollment preferences, and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Navigation */}
        <div className="space-y-1">
          <Button variant="secondary" className="w-full justify-start gap-2 font-semibold">
            <User className="h-4 w-4" /> Account Profile
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2">
            <Shield className="h-4 w-4" /> Biometric Preferences
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2">
            <Smartphone className="h-4 w-4" /> Device Passkeys
          </Button>
        </div>

        {/* Right Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Your account identity information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input defaultValue={user.name} disabled />
              </div>

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input defaultValue={user.email} disabled />
              </div>

              <div className="space-y-1.5">
                <Label>Account Created</Label>
                <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                  {new Date(user.createdAt).toUTCString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Biometric Behavioral Re-enrollment</CardTitle>
              <CardDescription>Update your baseline typing or swipe characteristics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                If your typing style or primary device changes significantly, re-enroll your behavioral profiles to maintain high similarity scores.
              </p>
              <div className="flex items-center space-x-3 pt-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Key className="h-4 w-4" /> Re-enroll Typing Profile
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Smartphone className="h-4 w-4" /> Re-enroll Swipe Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
