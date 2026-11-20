"use client";

import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function ReviewWidget({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateDoc(doc(db, "orders", orderId), {
      rating,
      reviewComment: comment.trim(),
      ratedAt: new Date().toISOString(),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-stone-950 border border-amber-500/40 rounded-xl p-3 space-y-2 mt-2">
      <div className="text-xs font-bold text-amber-400">איך היה הקפה? דרג את ההזמנה:</div>
      <div className="flex gap-1 text-xl">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`cursor-pointer transition ${star <= rating ? "opacity-100 scale-110" : "opacity-30"}`}
          >
            ⭐
          </button>
        ))}
      </div>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="הוסף מילה טובה לבריסטה (לא חובה)..."
        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer"
      >
        {saving ? "שולח..." : "שלח דירוג ⭐"}
      </button>
    </form>
  );
}