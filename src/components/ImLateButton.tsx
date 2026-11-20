"use client";

import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ImLateButtonProps {
  orderId: string;
  firstName: string;
  pickupTime: string;
}

export default function ImLateButton({ orderId, firstName, pickupTime }: ImLateButtonProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const sendAlert = async (message: string, delayMinutes: number) => {
    await addDoc(collection(db, "arrival_alerts"), {
      orderId,
      firstName,
      pickupTime,
      delayMinutes,
      message,
      createdAt: new Date().toISOString(),
    });
    setSent(true);
    setOpen(false);
  };

  if (sent) {
    return (
      <div className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 rounded-xl px-3 py-2 text-center font-bold">
        ✅ העדכון נשלח לבריסטה!
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/60 text-amber-300 text-xs font-bold transition cursor-pointer"
        >
          ⏱️ עדכן הגעה / מתעכב — עדכן את הבריסטה
        </button>
      ) : (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5 space-y-2">
          <div className="text-xs text-stone-300 font-bold text-center">בחר סטטוס הגעה:</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => sendAlert("אני ליד העגלה! תוציאו לדרך ☕", 0)}
              className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              🏃‍♂️ הגעתי לעגלה!
            </button>
            <button
              onClick={() => sendAlert("מתעכב ב-5 דקות", 5)}
              className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold cursor-pointer"
            >
              מתעכב 5 דק׳
            </button>
            <button
              onClick={() => sendAlert("מתעכב ב-10 דקות", 10)}
              className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold cursor-pointer"
            >
              מתעכב 10 דק׳
            </button>
            <button
              onClick={() => sendAlert("מתעכב ב-15 דקות", 15)}
              className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold cursor-pointer"
            >
              מתעכב 15 דק׳
            </button>
          </div>
          <button onClick={() => setOpen(false)} className="w-full text-[11px] text-stone-400 cursor-pointer">
            ביטול
          </button>
        </div>
      )}
    </div>
  );
}