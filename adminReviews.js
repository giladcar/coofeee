import { db, collection, onSnapshot } from "./firebase.js";

onSnapshot(collection(db, "orders"), (snapshot) => {
  const container = document.getElementById("tab-reviews");
  if (!container) return;

  const ratedOrders = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((o) => typeof o.rating === "number" && o.rating >= 1)
    .sort((a, b) => (b.ratedAt || "").localeCompare(a.ratedAt || ""));

  const avg = ratedOrders.length > 0
    ? (ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length).toFixed(1)
    : "0.0";

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-amber-400">\u2b50 \u05d3\u05d9\u05e8\u05d5\u05d2\u05d9\u05dd \u05d5\u05de\u05e9\u05d5\u05d1\u05d9 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea</h2>
          <p class="text-xs text-stone-400">\u05e1\u05d4"\u05db ${ratedOrders.length} \u05d3\u05d9\u05e8\u05d5\u05d2\u05d9\u05dd \u05d4\u05ea\u05e7\u05d1\u05dc\u05d5</p>
        </div>
        <div class="text-left">
          <div class="text-3xl font-black text-amber-400">${avg} \u2b50</div>
          <div class="text-xs text-stone-400">\u05de\u05de\u05d5\u05e6\u05e2 \u05db\u05dc\u05dc\u05d9</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${ratedOrders.length === 0 ? `<div class="col-span-full text-center py-10 text-stone-400 bg-stone-900/50 rounded-2xl border border-stone-800">\u05e2\u05d3\u05d9\u05d9\u05df \u05dc\u05d0 \u05d4\u05ea\u05e7\u05d1\u05dc\u05d5 \u05d3\u05d9\u05e8\u05d5\u05d2\u05d9\u05dd \u2615</div>` : ""}
        ${ratedOrders.map((o) => `
          <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white">${escapeHtml(o.firstName || "\u05dc\u05e7\u05d5\u05d7")} ${escapeHtml(o.lastName || "")}</span>
              <span class="text-amber-400 font-bold">${"\u2b50".repeat(o.rating)}</span>
            </div>
            ${o.reviewComment ? `<p class="text-sm text-stone-200 bg-stone-950 p-3 rounded-xl border border-stone-800">"${escapeHtml(o.reviewComment)}"</p>` : ""}
            <div class="text-xs text-stone-500">${escapeHtml(o.date || "")} \u2022 ${(o.items || []).map((i) => i.name).join(", ")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
});

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}