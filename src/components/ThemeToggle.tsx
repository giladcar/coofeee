"use client";

import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("coffee_theme");
    if (saved === "light") {
      document.documentElement.classList.add("coffee-light");
      setIsLight(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.classList.remove("coffee-light");
      localStorage.setItem("coffee_theme", "dark");
      setIsLight(false);
    } else {
      document.documentElement.classList.add("coffee-light");
      localStorage.setItem("coffee_theme", "light");
      setIsLight(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? "עבור למצב כהה" : "עבור למצב בהיר"}
      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-sm font-bold transition cursor-pointer"
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}