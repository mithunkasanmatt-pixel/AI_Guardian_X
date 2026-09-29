"use client";

import React, { useState, useEffect } from "react";
import { Wallet as WalletIcon, Plus, ShieldCheck, FileCode, Clock, CheckCircle2, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function WalletSection({ initialWallets, isUnlocked = true }: WalletSectionProps) {
  const [wallets, setWallets] = useState<WalletItem[]>(initialWallets);
  const [showAddForm, setShowAddForm] = useState(false);

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
            Protected by multi-modal behavioral biometric authentication
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
          title={!isUnlocked ? "Complete Typing, Swipe & Fingerprint Pressure Registration above to unlock Add Wallet" : ""}
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

      {/* Add Wallet Form Modal / Section */}
      {showAddForm && (
        <div className="transition-all duration-300">
          <AddWalletCard onSuccess={handleSuccess} />
        </div>
      )}

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <Card className="border border-dashed border-slate-300 dark:border-slate-800 text-center py-10 bg-slate-50/50 dark:bg-slate-900/40">
          <CardContent className="space-y-3">
            <WalletIcon className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Wallets Registered Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click <span className="font-semibold text-indigo-600">"Add Wallet"</span> above to securely register your crypto keystore file with behavioral biometric verification.
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
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Registered: {new Date(wallet.createdAt).toLocaleDateString()}
                  </span>
                  <span>{wallet.fileSize ? `${wallet.fileSize} B` : "Encrypted"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
