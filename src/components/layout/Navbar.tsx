"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, LogOut, Key, Settings, Menu, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  user?: { name: string; email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="AI Guardian X Logo" className="h-9 w-9 rounded-lg shadow-md" />
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                AI Guardian <span className="text-indigo-600 dark:text-indigo-400">X</span>
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5 font-normal">
                v1.0
              </Badge>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/security"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Security Log
                </Link>
                <Link
                  href="/settings"
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Settings
                </Link>

                {deferredPrompt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstallClick}
                    className="gap-1.5 text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-900"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install App
                  </Button>
                )}

                <div className="flex items-center space-x-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none">
                      {user.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                    <LogOut className="h-4 w-4 text-slate-500 hover:text-red-600" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {deferredPrompt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstallClick}
                    className="gap-1.5 text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-900"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install PWA
                  </Button>
                )}
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {deferredPrompt && (
              <Button variant="outline" size="sm" onClick={handleInstallClick} className="p-2">
                <Download className="h-4 w-4" />
              </Button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-2 pb-4 space-y-3">
          {user ? (
            <>
              <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-900">
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium py-1 text-slate-700 dark:text-slate-200"
              >
                Dashboard
              </Link>
              <Link
                href="/security"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium py-1 text-slate-700 dark:text-slate-200"
              >
                Security Activity
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium py-1 text-slate-700 dark:text-slate-200"
              >
                Settings
              </Link>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full mt-2 gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="block w-full">
                <Button className="w-full">Create Account</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
