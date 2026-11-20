"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface BanGuardProps {
  userEmail: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function BanGuard({ userEmail, onLogout, children }: BanGuardProps) {
  const [banInfo, setBanInfo] = useState<{ reason?: string } | null>(null);

  useEffect(() => {
    if (!userEmail) return;
    const unsub = onSnapshot(doc(db, "blocked_users", userEmail), (snap) => {
      if (snap.exists()) {
        setBanInfo(snap.data());
      } else {
        setBanInfo(null);
      }
    });
    return () => unsub();
  }, [userEmail]);

  if (banInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-950 text-stone-100">
        <div className="max-w-md w-full bg-stone-900 border border-red-700 rounded-3xl p-8 text-center space-y-4">
          <div className="text-5xl">🚫</div>
          <h2 className="text-2xl font-black text-red-400">הגישה לחשבון נחסמה</h2>
          <p className="text-stone-300 text-sm">
            לא ניתן לבצע הזמנות חדשות מחשבון זה ({userEmail}).
          </p>
          {banInfo.reason && (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-3 text-xs text-red-200">
              סיבה: {banInfo.reason}
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm cursor-pointer"
          >
            יציאה מהחשבון
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}