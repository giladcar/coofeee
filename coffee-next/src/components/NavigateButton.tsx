"use client";

import React from "react";

export default function NavigateButton({ wazeLink }: { wazeLink?: string }) {
  if (!wazeLink) return null;

  return (
    <a
      href={wazeLink}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs sm:text-sm font-bold transition"
    >
      📍 ניווט
    </a>
  );
}