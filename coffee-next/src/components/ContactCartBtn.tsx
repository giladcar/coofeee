"use client";

import React, { useState } from "react";

export default function ContactCartBtn({ phone }: { phone?: string }) {
  const [open, setOpen] = useState(false);

  if (!phone) return null;

  const cleanDigits = phone.replace(/\D/g, "");
  const waPhone = cleanDigits.startsWith("0") ? "972" + cleanDigits.slice(1) : cleanDigits;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs sm:text-sm font-bold transition cursor-pointer"
      >
        📞 צור קשר
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-amber-400 text-center">דבר עם הבריסטה ☕</h3>
            <p className="text-xs text-stone-400 text-center">שאלה דחופה על הזמנה או מיקום העגלה?</p>
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent("היי! פונה אליך דרך אפליקציית עגלת הקפה ☕")}`}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
            >
              💬 שלח הודעת WhatsApp
            </a>
            <a
              href={`tel:${phone}`}
              className="block w-full text-center py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700"
            >
              📱 חיוג טלפוני ({phone})
            </a>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-2 text-xs text-stone-400 hover:text-white cursor-pointer"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </>
  );
}