import { db, doc, onSnapshot, setDoc } from "./firebase.js";

const DAYS_OF_WEEK = [
  { key: "0", label: "\u05d9\u05d5\u05dd \u05e8\u05d0\u05e9\u05d5\u05df" },
  { key: "1", label: "\u05d9\u05d5\u05dd \u05e9\u05e0\u05d9" },
  { key: "2", label: "\u05d9\u05d5\u05dd \u05e9\u05dc\u05d9\u05e9\u05d9" },
  { key: "3", label: "\u05d9\u05d5\u05dd \u05e8\u05d1\u05d9\u05e2\u05d9" },
  { key: "4", label: "\u05d9\u05d5\u05dd \u05d7\u05de\u05d9\u05e9\u05d9" },
  { key: "5", label: "\u05d9\u05d5\u05dd \u05e9\u05d9\u05e9\u05d9" },
  { key: "6", label: "\u05e9\u05d1\u05ea" }
];

const defaultWeeklyHours = {
  "0": { isOpen: true, open: "07:30", close: "15:00" },
  "1": { isOpen: true, open: "07:30", close: "15:00" },
  "2": { isOpen: true, open: "07:30", close: "15:00" },
  "3": { isOpen: true, open: "07:30", close: "15:00" },
  "4": { isOpen: true, open: "07:30", close: "15:00" },
  "5": { isOpen: true, open: "08:00", close: "14:00" },
  "6": { isOpen: false, open: "08:00", close: "14:00" }
};

let currentSettings = {
  isCartClosed: false,
  weeklyHours: { ...defaultWeeklyHours },
  cartPhone: "",
  wazeLink: "",
  announcement: "",
  categories: []
};

let activeCategoryId = null;
let pendingImageBase64 = "";

// \u05e8\u05d9\u05e0\u05d3\u05d5\u05e8 \u05de\u05d9\u05d9\u05d3\u05d9 \u05db\u05d3\u05d9 \u05e9\u05d4\u05de\u05e1\u05da \u05dc\u05e2\u05d5\u05dc\u05dd \u05dc\u05d0 \u05d9\u05d4\u05d9\u05d4 \u05e8\u05d9\u05e7
renderMenuTab();

onSnapshot(
  doc(db, "config", "settings"),
  (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      currentSettings = {
        ...currentSettings,
        ...data,
        weeklyHours: { ...defaultWeeklyHours, ...(data.weeklyHours || {}) },
        categories: Array.isArray(data.categories) ? data.categories : []
      };
    }
    renderMenuTab();
  },
  (err) => {
    console.error("Firestore settings error:", err);
    renderMenuTab();
  }
);

function getCategoryPath(catId) {
  const path = [];
  let curr = currentSettings.categories.find((c) => c.id === catId);
  while (curr) {
    path.unshift(curr);
    curr = curr.parentId
      ? currentSettings.categories.find((c) => c.id === curr.parentId)
      : null;
  }
  return path;
}

function renderMenuTab() {
  const container = document.getElementById("tab-menu");
  if (!container) return;

  const activeCat = activeCategoryId
    ? currentSettings.categories.find((c) => c.id === activeCategoryId)
    : null;
  if (activeCategoryId && !activeCat) {
    activeCategoryId = null;
  }

  const subCategories = currentSettings.categories.filter(
    (c) => (c.parentId || null) === (activeCategoryId || null)
  );
  const breadcrumbPath = activeCategoryId ? getCategoryPath(activeCategoryId) : [];

  container.innerHTML = `
    <div class="space-y-6">

      <!-- 1. \u05e0\u05d9\u05d4\u05d5\u05dc \u05ea\u05e4\u05e8\u05d9\u05d8 \u05d5\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea \u05d7\u05d5\u05e4\u05e9\u05d9\u05d5\u05ea -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <h2 class="text-lg font-bold text-amber-400">\ud83c\udf7d\ufe0f \u05e0\u05d9\u05d4\u05d5\u05dc \u05ea\u05e4\u05e8\u05d9\u05d8, \u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea \u05d5\u05de\u05d5\u05e6\u05e8\u05d9\u05dd</h2>
            <p class="text-xs text-stone-400">\u05d4\u05e7\u05dc\u05d3 \u05e1\u05d5\u05d2\u05d9\u05dd \u05d1\u05d7\u05d5\u05e4\u05e9\u05d9\u05d5\u05ea (\u05de\u05e9\u05e7\u05d0\u05d5\u05ea, \u05d0\u05d5\u05db\u05dc, \u05e7\u05d9\u05e0\u05d5\u05d7\u05d9\u05dd...) \u05d5\u05d4\u05d9\u05db\u05e0\u05e1 \u05e4\u05e0\u05d9\u05de\u05d4 \u05dc\u05d4\u05d5\u05e1\u05e4\u05ea \u05ea\u05ea-\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea \u05d0\u05d5 \u05de\u05d5\u05e6\u05e8\u05d9\u05dd</p>
          </div>
        </div>

        <!-- \u05e9\u05d5\u05e8\u05ea \u05e0\u05d9\u05d5\u05d5\u05d8 (Breadcrumbs) -->
        <div class="flex flex-wrap items-center gap-2 bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-800 text-xs">
          <button type="button" data-nav-cat="" class="font-bold ${!activeCategoryId ? "text-amber-400" : "text-stone-300 hover:text-white"} cursor-pointer">
            \ud83c\udfe0 \u05db\u05dc \u05d4\u05e1\u05d5\u05d2\u05d9\u05dd \u05d4\u05e8\u05d0\u05e9\u05d9\u05d9\u05dd
          </button>
          ${breadcrumbPath
            .map(
              (c) => `
            <span class="text-stone-600">/</span>
            <button type="button" data-nav-cat="${c.id}" class="font-bold ${c.id === activeCategoryId ? "text-amber-400" : "text-stone-300 hover:text-white"} cursor-pointer">
              ${escapeHtml(c.name)}
            </button>
          `
            )
            .join("")}
        </div>

        <!-- \u05d4\u05d5\u05e1\u05e4\u05ea \u05e1\u05d5\u05d2 / \u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4 (\u05d1\u05d4\u05e7\u05dc\u05d3\u05d4 \u05d7\u05d5\u05e4\u05e9\u05d9\u05ea) -->
        <form id="add-category-form" class="flex flex-wrap sm:flex-nowrap gap-2">
          <input type="text" id="new-category-name" required
            placeholder="${activeCategoryId ? `\u05d4\u05d5\u05e1\u05e3 \u05ea\u05ea-\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4 \u05d1\u05ea\u05d5\u05da "${escapeHtml(activeCat.name)}"...` : "\u05d4\u05e7\u05dc\u05d3 \u05e9\u05dd \u05e1\u05d5\u05d2 \u05d7\u05d3\u05e9 (\u05dc\u05de\u05e9\u05dc: \u05de\u05e9\u05e7\u05d0\u05d5\u05ea, \u05d0\u05d5\u05db\u05dc, \u05e7\u05d9\u05e0\u05d5\u05d7\u05d9\u05dd)..."}"
            class="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" />
          <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer shrink-0">
            \u2795 ${activeCategoryId ? "\u05d4\u05d5\u05e1\u05e3 \u05ea\u05ea-\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4" : "\u05d4\u05d5\u05e1\u05e3 \u05e1\u05d5\u05d2"}
          </button>
        </form>

        <!-- \u05e8\u05e9\u05d9\u05de\u05ea \u05d4\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea \u05d1\u05e8\u05de\u05d4 \u05d4\u05e0\u05d5\u05db\u05d7\u05d9\u05ea -->
        ${
          subCategories.length > 0
            ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${subCategories
              .map(
                (cat) => `
              <div class="bg-stone-950 border border-stone-800 hover:border-amber-500/70 rounded-2xl p-4 flex items-center justify-between gap-2 transition">
                <button type="button" data-open-cat="${cat.id}" class="flex-1 text-right cursor-pointer">
                  <div class="font-bold text-base text-white">\ud83d\udcc1 ${escapeHtml(cat.name)}</div>
                  <div class="text-xs text-amber-400 mt-0.5">\u05dc\u05d7\u05e5 \u05dc\u05db\u05e0\u05d9\u05e1\u05d4 \u05d5\u05e0\u05d9\u05d4\u05d5\u05dc \u2190</div>
                </button>
                <button type="button" data-delete-cat="${cat.id}" title="\u05de\u05d7\u05e7 \u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4"
                  class="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-red-900 text-stone-400 hover:text-white text-xs cursor-pointer">
                  \ud83d\uddd1\ufe0f
                </button>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : !activeCategoryId
            ? `<div class="text-center py-8 text-stone-400 text-sm bg-stone-950/60 rounded-2xl border border-stone-800">\u05e2\u05d3\u05d9\u05d9\u05df \u05dc\u05d0 \u05d4\u05d5\u05e1\u05e4\u05ea \u05e1\u05d5\u05d2\u05d9\u05dd. \u05d4\u05e7\u05dc\u05d3 \u05dc\u05de\u05e2\u05dc\u05d4 (\u05dc\u05de\u05e9\u05dc: "\u05de\u05e9\u05e7\u05d0\u05d5\u05ea") \u05d5\u05dc\u05d7\u05e5 \u05d4\u05d5\u05e1\u05e3!</div>`
            : ""
        }

        <!-- \u05d1\u05ea\u05d5\u05da \u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4: \u05d8\u05d5\u05e4\u05e1 \u05d4\u05d5\u05e1\u05e4\u05ea \u05de\u05d5\u05e6\u05e8 \u05dc\u05d4\u05d6\u05de\u05e0\u05d4 + \u05e8\u05e9\u05d9\u05de\u05ea \u05d4\u05de\u05d5\u05e6\u05e8\u05d9\u05dd -->
        ${
          activeCat
            ? `
          <div class="pt-4 border-t border-stone-800 space-y-5">
            <div class="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3">
              <h3 class="font-bold text-amber-400 text-sm">\u2795 \u05d4\u05d5\u05e1\u05e3 \u05de\u05e9\u05d4\u05d5 \u05dc\u05d4\u05d6\u05de\u05d9\u05df \u05d1\u05ea\u05d5\u05da "${escapeHtml(activeCat.name)}"</h3>
              <form id="add-item-in-cat-form" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-stone-400 mb-1">1. \u05e9\u05dd \u05d4\u05de\u05d5\u05e6\u05e8 *</label>
                  <input type="text" id="item-name" required placeholder="\u05dc\u05de\u05e9\u05dc: \u05e7\u05e4\u05d5\u05e6'\u05d9\u05e0\u05d5 / \u05e7\u05e8\u05d5\u05d0\u05e1\u05d5\u05df \u05e9\u05e7\u05d3\u05d9\u05dd"
                    class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label class="block text-xs text-stone-400 mb-1">4. \u05de\u05d7\u05d9\u05e8 (\u20aa) *</label>
                  <input type="number" id="item-price" required min="0" step="0.5" placeholder="14"
                    class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-stone-400 mb-1">2. \u05ea\u05d9\u05d0\u05d5\u05e8 \u05d4\u05de\u05d5\u05e6\u05e8</label>
                  <input type="text" id="item-desc" placeholder="\u05dc\u05de\u05e9\u05dc: \u05d0\u05e1\u05e4\u05e8\u05e1\u05d5 \u05db\u05e4\u05d5\u05dc \u05e2\u05dd \u05d7\u05dc\u05d1 \u05de\u05d5\u05e7\u05e6\u05e3 \u05e7\u05d8\u05d9\u05e4\u05ea\u05d9"
                    class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-stone-400 mb-1">3. \u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05dc\u05d1\u05d7\u05d9\u05e8\u05d4 (\u05d4\u05e7\u05dc\u05d3 \u05de\u05d5\u05e4\u05e8\u05d3 \u05d1\u05e4\u05e1\u05d9\u05e7\u05d9\u05dd, \u05d0\u05d5 \u05d4\u05e9\u05d0\u05e8 \u05e8\u05d9\u05e7 \u05dc\u05dc\u05d0 \u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea)</label>
                  <input type="text" id="item-options" placeholder="\u05dc\u05de\u05e9\u05dc: \u05e2\u05dd \u05d7\u05dc\u05d1 \u05e8\u05d2\u05d9\u05dc, \u05d7\u05dc\u05d1 \u05e9\u05d9\u05d1\u05d5\u05dc\u05ea, \u05d1\u05dc\u05d9 \u05d7\u05dc\u05d1"
                    class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div class="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div class="flex items-center gap-3">
                    <label for="item-image-upload" class="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-bold text-amber-300 cursor-pointer">
                      \ud83d\udcf7 \u05d4\u05e2\u05dc\u05d4 \u05ea\u05de\u05d5\u05e0\u05d4 \u05de\u05d4\u05d2\u05dc\u05e8\u05d9\u05d4 (Upload)
                    </label>
                    <input type="file" id="item-image-upload" accept="image/*" class="hidden" />
                    <span id="upload-preview-status" class="text-xs text-stone-400"></span>
                  </div>
                  <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer">
                    \u2705 \u05e9\u05de\u05d5\u05e8 \u05de\u05d5\u05e6\u05e8
                  </button>
                </div>
              </form>
            </div>

            <!-- \u05de\u05d5\u05e6\u05e8\u05d9\u05dd \u05d1\u05ea\u05d5\u05da \u05d4\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${(activeCat.items || [])
                .map(
                  (item, idx) => `
                <div class="bg-stone-950 border ${item.inStock === false ? "border-red-900/60 opacity-70" : "border-stone-800"} rounded-2xl p-3.5 flex gap-3 justify-between items-start">
                  <div class="flex gap-3">
                    ${
                      item.imageUrl
                        ? `<img src="${item.imageUrl}" alt="" class="w-16 h-16 rounded-xl object-cover border border-stone-700 shrink-0" />`
                        : ""
                    }
                    <div>
                      <div class="font-bold text-white">${escapeHtml(item.name)} <span class="text-amber-400 font-mono">(\u20aa${item.price})</span></div>
                      ${item.description ? `<p class="text-xs text-stone-400 mt-0.5">${escapeHtml(item.description)}</p>` : ""}
                      ${item.optionsText ? `<div class="text-[11px] text-amber-300/80 mt-1">\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea: ${escapeHtml(item.optionsText)}</div>` : ""}
                    </div>
                  </div>
                  <div class="flex flex-col gap-1.5 shrink-0">
                    <button type="button" data-toggle-cat-item="${idx}" class="px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${item.inStock === false ? "bg-red-900 text-red-200" : "bg-emerald-900/60 text-emerald-300"}">
                      ${item.inStock === false ? "\u05d0\u05d6\u05dc" : "\u05d1\u05de\u05dc\u05d0\u05d9"}
                    </button>
                    <button type="button" data-delete-cat-item="${idx}" class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-red-900 text-stone-300 text-xs cursor-pointer">
                      \ud83d\uddd1\ufe0f
                    </button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>

      <!-- 2. \u05e9\u05e2\u05d5\u05ea \u05e4\u05ea\u05d9\u05d7\u05d4 \u05d5\u05e1\u05d2\u05d9\u05e8\u05d4 \u05dc\u05db\u05dc \u05d9\u05d5\u05dd \u05d1\u05e0\u05e4\u05e8\u05d3 + \u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e2\u05d2\u05dc\u05d4 -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-amber-400">\u23f0 \u05e9\u05e2\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea \u05dc\u05db\u05dc \u05d9\u05d5\u05dd \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05db\u05dc\u05dc\u05d9\u05d5\u05ea</h2>
            <p class="text-xs text-stone-400">\u05d4\u05d2\u05d3\u05e8 \u05e9\u05e2\u05d5\u05ea \u05e4\u05ea\u05d9\u05d7\u05d4 \u05d5\u05e1\u05d2\u05d9\u05e8\u05d4 \u05dc\u05db\u05dc \u05d9\u05d5\u05dd \u05d1\u05e9\u05d1\u05d5\u05e2 \u05d0\u05d5 \u05db\u05d1\u05d4 \u05d9\u05d5\u05dd \u05e1\u05e4\u05e6\u05d9\u05e4\u05d9</p>
          </div>
          <button type="button" id="toggle-cart-open-btn"
            class="px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${currentSettings.isCartClosed ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"}">
            ${currentSettings.isCartClosed ? "\ud83d\udfe2 \u05e4\u05ea\u05d7 \u05d0\u05ea \u05d4\u05e2\u05d2\u05dc\u05d4 \u05db\u05e2\u05ea" : "\ud83d\udd34 \u05e1\u05d2\u05d5\u05e8 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d6\u05de\u05e0\u05d9\u05ea"}
          </button>
        </div>

        <form id="settings-form" class="space-y-5">
          <div class="space-y-2">
            ${DAYS_OF_WEEK.map((d) => {
              const dayCfg = currentSettings.weeklyHours[d.key] || {
                isOpen: true,
                open: "07:30",
                close: "15:00"
              };
              return `
                <div class="flex flex-wrap items-center justify-between gap-3 bg-stone-950 border ${dayCfg.isOpen ? "border-stone-800" : "border-red-950/60 opacity-65"} rounded-xl px-4 py-2.5">
                  <label class="flex items-center gap-2.5 cursor-pointer min-w-[120px]">
                    <input type="checkbox" id="day-open-${d.key}" ${dayCfg.isOpen ? "checked" : ""} class="w-4 h-4 accent-amber-500" />
                    <span class="font-bold text-sm text-white">${d.label}</span>
                  </label>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="text-stone-400">\u05e4\u05ea\u05d9\u05d7\u05d4:</span>
                    <input type="time" id="day-start-${d.key}" value="${dayCfg.open}" class="bg-stone-800 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white" />
                    <span class="text-stone-400">\u05e1\u05d2\u05d9\u05e8\u05d4:</span>
                    <input type="time" id="day-end-${d.key}" value="${dayCfg.close}" class="bg-stone-800 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white" />
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-stone-800">
            <div>
              <label class="block text-xs text-stone-400 mb-1">\u05d8\u05dc\u05e4\u05d5\u05df / WhatsApp \u05d4\u05e2\u05d2\u05dc\u05d4</label>
              <input type="text" id="set-phone" value="${escapeHtml(currentSettings.cartPhone || "")}" placeholder="050-0000000" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-stone-400 mb-1">\u05e7\u05d9\u05e9\u05d5\u05e8 \u05e0\u05d9\u05d5\u05d5\u05d8 (Waze / Maps)</label>
              <input type="url" id="set-waze" value="${escapeHtml(currentSettings.wazeLink || "")}" placeholder="https://waze.com/ul/..." class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label class="block text-xs text-stone-400 mb-1">\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e8\u05e6\u05d4 \u05d1\u05e8\u05d0\u05e9 \u05d4\u05d0\u05ea\u05e8</label>
              <input type="text" id="set-announcement" value="${escapeHtml(currentSettings.announcement || "")}" placeholder="\u05d4\u05d9\u05d5\u05dd \u05d9\u05e9 \u05e7\u05e8\u05d5\u05d0\u05e1\u05d5\u05df \u05e4\u05d9\u05e1\u05d8\u05d5\u05e7 \u05d7\u05dd!" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer">
              \ud83d\udcbe \u05e9\u05de\u05d5\u05e8 \u05e9\u05e2\u05d5\u05ea \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea
            </button>
          </div>
        </form>
      </div>

    </div>
  `;

  container.querySelectorAll("[data-nav-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategoryId = btn.dataset.navCat || null;
      pendingImageBase64 = "";
      renderMenuTab();
    });
  });

  container.querySelectorAll("[data-open-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategoryId = btn.dataset.openCat;
      pendingImageBase64 = "";
      renderMenuTab();
    });
  });

  document.getElementById("add-category-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("new-category-name");
    const name = input.value.trim();
    if (!name) return;

    const newCat = {
      id: "cat_" + Date.now(),
      name,
      parentId: activeCategoryId || null,
      items: []
    };
    const updated = [...currentSettings.categories, newCat];
    currentSettings.categories = updated;
    renderMenuTab();
    await setDoc(doc(db, "config", "settings"), { categories: updated }, { merge: true });
  });

  container.querySelectorAll("[data-delete-cat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("\u05dc\u05de\u05d7\u05d5\u05e7 \u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d4 \u05d6\u05d5 \u05d5\u05d0\u05ea \u05db\u05dc \u05d4\u05de\u05d5\u05e6\u05e8\u05d9\u05dd \u05e9\u05d1\u05ea\u05d5\u05db\u05d4?")) return;
      const targetId = btn.dataset.deleteCat;
      const updated = currentSettings.categories.filter(
        (c) => c.id !== targetId && c.parentId !== targetId
      );
      currentSettings.categories = updated;
      renderMenuTab();
      await setDoc(doc(db, "config", "settings"), { categories: updated }, { merge: true });
    });
  });

  document.getElementById("item-image-upload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const statusEl = document.getElementById("upload-preview-status");
    if (statusEl) statusEl.textContent = "\u05de\u05e2\u05d1\u05d3 \u05ea\u05de\u05d5\u05e0\u05d4...";

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingImageBase64 = canvas.toDataURL("image/jpeg", 0.8);
        if (statusEl) statusEl.textContent = "\u2705 \u05d4\u05ea\u05de\u05d5\u05e0\u05d4 \u05de\u05d5\u05db\u05e0\u05d4 \u05dc\u05e9\u05de\u05d9\u05e8\u05d4!";
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("add-item-in-cat-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCategoryId) return;

    const newItem = {
      id: "item_" + Date.now(),
      name: document.getElementById("item-name").value.trim(),
      description: document.getElementById("item-desc").value.trim(),
      optionsText: document.getElementById("item-options").value.trim(),
      price: Number(document.getElementById("item-price").value) || 0,
      imageUrl: pendingImageBase64 || "",
      inStock: true
    };

    const updatedCats = currentSettings.categories.map((c) => {
      if (c.id !== activeCategoryId) return c;
      return { ...c, items: [...(c.items || []), newItem] };
    });

    pendingImageBase64 = "";
    currentSettings.categories = updatedCats;
    renderMenuTab();
    await setDoc(doc(db, "config", "settings"), { categories: updatedCats }, { merge: true });
  });

  container.querySelectorAll("[data-toggle-cat-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.toggleCatItem);
      const updatedCats = currentSettings.categories.map((c) => {
        if (c.id !== activeCategoryId) return c;
        const items = [...(c.items || [])];
        items[idx].inStock = items[idx].inStock === false ? true : false;
        return { ...c, items };
      });
      currentSettings.categories = updatedCats;
      renderMenuTab();
      await setDoc(doc(db, "config", "settings"), { categories: updatedCats }, { merge: true });
    });
  });

  container.querySelectorAll("[data-delete-cat-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("\u05dc\u05de\u05d7\u05d5\u05e7 \u05de\u05d5\u05e6\u05e8 \u05d6\u05d4?")) return;
      const idx = Number(btn.dataset.deleteCatItem);
      const updatedCats = currentSettings.categories.map((c) => {
        if (c.id !== activeCategoryId) return c;
        const items = (c.items || []).filter((_, i) => i !== idx);
        return { ...c, items };
      });
      currentSettings.categories = updatedCats;
      renderMenuTab();
      await setDoc(doc(db, "config", "settings"), { categories: updatedCats }, { merge: true });
    });
  });

  document.getElementById("toggle-cart-open-btn")?.addEventListener("click", async () => {
    const nextState = !currentSettings.isCartClosed;
    currentSettings.isCartClosed = nextState;
    renderMenuTab();
    await setDoc(
      doc(db, "config", "settings"),
      { isCartClosed: nextState },
      { merge: true }
    );
  });

  document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newWeekly = {};
    DAYS_OF_WEEK.forEach((d) => {
      newWeekly[d.key] = {
        isOpen: document.getElementById(`day-open-${d.key}`).checked,
        open: document.getElementById(`day-start-${d.key}`).value,
        close: document.getElementById(`day-end-${d.key}`).value
      };
    });

    await setDoc(
      doc(db, "config", "settings"),
      {
        weeklyHours: newWeekly,
        cartPhone: document.getElementById("set-phone").value.trim(),
        wazeLink: document.getElementById("set-waze").value.trim(),
        announcement: document.getElementById("set-announcement").value.trim()
      },
      { merge: true }
    );
    alert("\u05e9\u05e2\u05d5\u05ea \u05d4\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea \u05d5\u05d4\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e0\u05e9\u05de\u05e8\u05d5!");
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}