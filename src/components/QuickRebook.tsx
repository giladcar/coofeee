"use client";

import React from "react";

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: string;
  notes?: string;
}

interface QuickRebookProps {
  lastOrderItems: CartItem[] | null;
  onQuickRebook: (items: CartItem[]) => void;
}

export default function QuickRebook({ lastOrderItems, onQuickRebook }: QuickRebookProps) {
  if (!lastOrderItems || lastOrderItems.length === 0) return null;

  const summary = lastOrderItems
    .map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.name}`)
    .join(" + ");

  return (
    <div className="bg-gradient-to-l from-amber-950/70 to-stone-900 border border-amber-500/40 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div>
        <div className="text-xs font-bold text-amber-400">⚡ הזמן שוב את הקבוע שלך:</div>
        <div className="text-sm font-bold text-white mt-0.5">{summary}</div>
      </div>
      <button
        onClick={() => onQuickRebook(lastOrderItems)}
        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition cursor-pointer shadow"
      >
        בחר שעת איסוף מיד ☕
      </button>
    </div>
  );
}