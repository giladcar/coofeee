import { db, doc, onSnapshot, setDoc } from "./firebase.js";

let currentSettings = {
  isCartClosed: false,
  startTime: "07:30",
  endTime: "15:00",
  interval: 10,
  maxOrdersPerSlot: 4,
  cartPhone: "",
  wazeLink: "",
  announcement: "",
  menuItems: []
};

onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    currentSettings = { ...currentSettings, ...snap.data() };
  }
  renderMenuTab();
});

function renderMenuTab() {
  const container = document.getElementById("tab-menu");
  if (!container) return;

  const items = currentSettings.menuItems || [];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- \u05e9\u05dc\u05d9\u05d8\u05d4 \u05de\u05d4\u05d9\u05e8\u05d4 \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e2\u05d2\u05dc\u05d4 -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-stone-800">
          <div>
            <h2 class="text-lg font-bold text-amber-400">\u2699\ufe0f \u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e2\u05d2\u05dc\u05d4 \u05d5\u05e9\u05e2\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea</h2>
            <p class="text-xs text-stone-400">\u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05db\u05d0\u05df \u05de\u05ea\u05e2\u05d3\u05db\u05e0\u05d9\u05dd \u05de\u05d9\u05d3 \u05d0\u05e6\u05dc \u05d4\u05dc\u05e7\u05d5\u05d7\u05d5\u05ea</p>
          </div>
          <button id="toggle-cart-open-btn"
            class="px-4 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${currentSettings.isCartClosed ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"}">
            ${currentSettings.isCartClosed ? "\ud83d\udfe2 \u05e4\u05ea\u05d7 \u05d0\u05ea \u05d4\u05e2\u05d2\u05dc\u05d4 \u05dc\u05d4\u05d6\u05de\u05e0\u05d5\u05ea" : "\ud83d\udd34 \u05e1\u05d2\u05d5\u05e8 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d6\u05de\u05e0\u05d9\u05ea"}
          </button>
        </div>

        <form id="settings-form" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs text-stone-400 mb-1">\u05e9\u05e2\u05ea \u05e4\u05ea\u05d9\u05d7\u05d4</label>
            <input type="time" id="set-start" value="${currentSettings.startTime || "07:30"}" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-stone-400 mb-1">\u05e9\u05e2\u05ea \u05e1\u05d2\u05d9\u05e8\u05d4</label>
            <input type="time" id="set-end" value="${currentSettings.endTime || "15:00"}" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label class="block text-xs text-stone-400 mb-1">\u05de\u05e7\u05e1\u05d9\u05de\u05d5\u05dd \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05dc\u05db\u05dc 10 \u05d3\u05e7'</label>
            <input type="number" id="set-max-slot" min="1" max="30" value="${currentSettings.maxOrdersPerSlot || 4}" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
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
            <input type="text" id="set-announcement" value="${escapeHtml(currentSettings.announcement || "")}" placeholder="\u05d4\u05d9\u05d5\u05dd \u05d9\u05e9 \u05e7\u05e8\u05d5\u05d0\u05e1\u05d5\u05df \u05e4\u05d9\u05e1\u05d8\u05d5\u05e7 \u05d7\u05dd \u05de\u05d4\u05ea\u05e0\u05d5\u05e8!" class="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div class="md:col-span-3 flex justify-end">
            <button type="submit" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer">
              \ud83d\udcbe \u05e9\u05de\u05d5\u05e8 \u05d4\u05d2\u05d3\u05e8\u05d5\u05ea
            </button>
          </div>
        </form>
      </div>

      <!-- \u05d4\u05d5\u05e1\u05e4\u05ea \u05e4\u05e8\u05d9\u05d8 \u05d7\u05d3\u05e9 \u05dc\u05ea\u05e4\u05e8\u05d9\u05d8 -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <h2 class="text-lg font-bold text-amber-400 mb-3">\u2795 \u05d4\u05d5\u05e1\u05e4\u05ea \u05de\u05d5\u05e6\u05e8 \u05dc\u05ea\u05e4\u05e8\u05d9\u05d8</h2>
        <form id="add-menu-item-form" class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" id="new-item-name" required placeholder="\u05e9\u05dd \u05d4\u05de\u05d5\u05e6\u05e8 (\u05dc\u05de\u05e9\u05dc: \u05e7\u05e4\u05d5\u05e6'\u05d9\u05e0\u05d5)" class="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          <select id="new-item-category" class="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white">
            <option value="hot_coffee">\u2615 \u05e7\u05e4\u05d4 \u05d7\u05dd</option>
            <option value="cold_coffee">\ud83e\uddca \u05e7\u05e4\u05d4 \u05e7\u05e8 \u05d5\u05de\u05e8\u05e2\u05e0\u05df</option>
            <option value="pastries">\ud83e\udd50 \u05de\u05d0\u05e4\u05d9\u05dd \u05d5\u05e2\u05d5\u05d2\u05d5\u05ea</option>
            <option value="sandwiches">\ud83e\udd6a \u05db\u05e8\u05d9\u05db\u05d9\u05dd</option>
          </select>
          <input type="number" id="new-item-price" required min="1" placeholder="\u05de\u05d7\u05d9\u05e8 (\u20aa)" class="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white" />
          <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-2 text-sm transition cursor-pointer">
            \u05d4\u05d5\u05e1\u05e3 \u05dc\u05ea\u05e4\u05e8\u05d9\u05d8
          </button>
          <div class="sm:col-span-4 flex items-center gap-2 text-xs text-stone-300">
            <input type="checkbox" id="new-item-milk" checked class="rounded" />
            <label for="new-item-milk">\u05d0\u05e4\u05e9\u05e8 \u05d1\u05d7\u05d9\u05e8\u05ea \u05e1\u05d5\u05d2 \u05d7\u05dc\u05d1 (\u05e8\u05d2\u05d9\u05dc / \u05e9\u05d9\u05d1\u05d5\u05dc\u05ea / \u05e1\u05d5\u05d9\u05d4 / \u05e9\u05e7\u05d3\u05d9\u05dd)</label>
          </div>
        </form>
      </div>

      <!-- \u05e8\u05e9\u05d9\u05de\u05ea \u05d4\u05ea\u05e4\u05e8\u05d9\u05d8 \u05d5\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05dc\u05d0\u05d9 -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <h2 class="text-lg font-bold text-amber-400 mb-3">\ud83d\udccb \u05ea\u05e4\u05e8\u05d9\u05d8 \u05e7\u05d9\u05d9\u05dd \u05d5\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05dc\u05d0\u05d9 (${items.length})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${items.length === 0 ? `<p class="text-stone-400 text-sm col-span-full">\u05e2\u05d3\u05d9\u05d9\u05df \u05d0\u05d9\u05df \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d1\u05ea\u05e4\u05e8\u05d9\u05d8. \u05d4\u05d5\u05e1\u05e3 \u05dc\u05de\u05e2\u05dc\u05d4!</p>` : ""}
          ${items.map((item, idx) => `
            <div class="flex items-center justify-between gap-3 p-3 rounded-xl border ${item.inStock === false ? "bg-red-950/20 border-red-900/50 opacity-75" : "bg-stone-950/70 border-stone-800"}">
              <div>
                <div class="font-bold text-white">${escapeHtml(item.name)} <span class="text-amber-400 font-mono text-sm">(\u20aa${item.price})</span></div>
                <div class="text-xs text-stone-400">${getCategoryLabel(item.category)} ${item.hasMilkOption ? "\u2022 \u05db\u05d5\u05dc\u05dc \u05d1\u05d7\u05d9\u05e8\u05ea \u05d7\u05dc\u05d1" : ""}</div>
              </div>
              <div class="flex items-center gap-2">
                <button data-toggle-stock="${idx}" class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${item.inStock === false ? "bg-red-900 text-red-200" : "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"}">
                  ${item.inStock === false ? "\u274c \u05d0\u05d6\u05dc \u05de\u05d4\u05de\u05dc\u05d0\u05d9" : "\u2705 \u05d1\u05de\u05dc\u05d0\u05d9"}
                </button>
                <button data-delete-item="${idx}" class="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-red-900 text-stone-300 hover:text-white text-xs cursor-pointer">\ud83d\uddd1\ufe0f</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  // \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd
  document.getElementById("toggle-cart-open-btn")?.addEventListener("click", async () => {
    await setDoc(doc(db, "config", "settings"), { isCartClosed: !currentSettings.isCartClosed }, { merge: true });
  });

  document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "config", "settings"), {
      startTime: document.getElementById("set-start").value,
      endTime: document.getElementById("set-end").value,
      maxOrdersPerSlot: Number(document.getElementById("set-max-slot").value) || 4,
      cartPhone: document.getElementById("set-phone").value.trim(),
      wazeLink: document.getElementById("set-waze").value.trim(),
      announcement: document.getElementById("set-announcement").value.trim()
    }, { merge: true });
    alert("\u05d4\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05e0\u05e9\u05de\u05e8\u05d5 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4!");
  });

  document.getElementById("add-menu-item-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newItem = {
      id: "item_" + Date.now(),
      name: document.getElementById("new-item-name").value.trim(),
      category: document.getElementById("new-item-category").value,
      price: Number(document.getElementById("new-item-price").value),
      hasMilkOption: document.getElementById("new-item-milk").checked,
      inStock: true
    };
    const updated = [...(currentSettings.menuItems || []), newItem];
    await setDoc(doc(db, "config", "settings"), { menuItems: updated }, { merge: true });
  });

  container.querySelectorAll("[data-toggle-stock]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.toggleStock);
      const updated = [...(currentSettings.menuItems || [])];
      updated[idx].inStock = updated[idx].inStock === false ? true : false;
      await setDoc(doc(db, "config", "settings"), { menuItems: updated }, { merge: true });
    });
  });

  container.querySelectorAll("[data-delete-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("\u05dc\u05de\u05d7\u05d5\u05e7 \u05de\u05d5\u05e6\u05e8 \u05d6\u05d4 \u05de\u05d4\u05ea\u05e4\u05e8\u05d9\u05d8?")) return;
      const idx = Number(btn.dataset.deleteItem);
      const updated = (currentSettings.menuItems || []).filter((_, i) => i !== idx);
      await setDoc(doc(db, "config", "settings"), { menuItems: updated }, { merge: true });
    });
  });
}

function getCategoryLabel(cat) {
  const map = {
    hot_coffee: "\u2615 \u05e7\u05e4\u05d4 \u05d7\u05dd",
    cold_coffee: "\ud83e\uddca \u05e7\u05e4\u05d4 \u05e7\u05e8",
    pastries: "\ud83e\udd50 \u05de\u05d0\u05e4\u05d9\u05dd",
    sandwiches: "\ud83e\udd6a \u05db\u05e8\u05d9\u05db\u05d9\u05dd"
  };
  return map[cat] || cat;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}