import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot
} from "./firebase.js";

// \u05d4\u05d6\u05e8\u05e7\u05ea \u05db\u05e4\u05ea\u05d5\u05e8 \u05dc\u05e1\u05e8\u05d2\u05dc \u05d4\u05e2\u05dc\u05d9\u05d5\u05df
const navbar = document.getElementById("admin-navbar");
const logoutBtn = document.getElementById("logout-btn");
if (navbar && logoutBtn && !document.querySelector('[data-tab="clients"]')) {
  const btn = document.createElement("button");
  btn.dataset.tab = "clients";
  btn.className = "tab-btn px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-sm font-bold transition cursor-pointer";
  btn.textContent = "\ud83d\udc65 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d5\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc\u05d9\u05dd";
  navbar.insertBefore(btn, logoutBtn);
}

let usersData = {};
let ordersList = [];
let blockedMap = {};
let noShowsMap = {};
let latesMap = {};
let searchTerm = "";

onSnapshot(collection(db, "coffee_users"), (snap) => {
  usersData = {};
  snap.docs.forEach((d) => { usersData[d.id] = d.data(); });
  renderClientsTab();
});

onSnapshot(collection(db, "orders"), (snap) => {
  ordersList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderClientsTab();
});

onSnapshot(collection(db, "blocked_users"), (snap) => {
  blockedMap = {};
  snap.docs.forEach((d) => { blockedMap[d.id] = d.data(); });
  renderClientsTab();
});

onSnapshot(doc(db, "config", "no_shows"), (snap) => {
  noShowsMap = snap.exists() ? (snap.data().counts || {}) : {};
  renderClientsTab();
});

onSnapshot(doc(db, "config", "client_lates"), (snap) => {
  latesMap = snap.exists() ? (snap.data().counts || {}) : {};
  renderClientsTab();
});

function renderClientsTab() {
  const container = document.getElementById("tab-clients");
  if (!container) return;

  // \u05d0\u05d9\u05d7\u05d5\u05d3 \u05e4\u05e8\u05d5\u05e4\u05d9\u05dc\u05d9\u05dd \u05de-coffee_users \u05d5\u05de-orders
  const clientsMap = new Map();

  Object.entries(usersData).forEach(([email, info]) => {
    clientsMap.set(email, {
      key: email,
      email,
      firstName: info.firstName || "",
      lastName: info.lastName || "",
      phone: info.phone || "",
      totalOrders: 0,
      itemsCount: {}
    });
  });

  ordersList.forEach((order) => {
    const key = order.userEmail || order.phone;
    if (!key) return;
    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        key,
        email: order.userEmail || "",
        firstName: order.firstName || "",
        lastName: order.lastName || "",
        phone: order.phone || "",
        totalOrders: 0,
        itemsCount: {}
      });
    }
    const c = clientsMap.get(key);
    if (!c.firstName && order.firstName) c.firstName = order.firstName;
    if (!c.lastName && order.lastName) c.lastName = order.lastName;
    if (!c.phone && order.phone) c.phone = order.phone;

    if (order.status !== "canceled_by_admin") {
      c.totalOrders++;
      (order.items || []).forEach((it) => {
        c.itemsCount[it.name] = (c.itemsCount[it.name] || 0) + (it.quantity || 1);
      });
    }
  });

  const term = searchTerm.toLowerCase().trim();
  const clients = Array.from(clientsMap.values()).filter((c) => {
    if (!term) return true;
    const full = `${c.firstName} ${c.lastName} ${c.phone} ${c.email}`.toLowerCase();
    return full.includes(term);
  });

  // \u05e9\u05de\u05d9\u05e8\u05ea \u05de\u05d9\u05e7\u05d5\u05d3 \u05d1\u05ea\u05d9\u05d1\u05ea \u05d4\u05d7\u05d9\u05e4\u05d5\u05e9
  const activeInput = document.getElementById("clients-search-input");
  const hadFocus = document.activeElement === activeInput;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-amber-400">\ud83d\udc65 \u05dc\u05e7\u05d5\u05d7\u05d5\u05ea \u05d5\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc\u05d9\u05dd (${clients.length})</h2>
          <p class="text-xs text-stone-400">\u05de\u05e2\u05e7\u05d1 \u05d4\u05d6\u05de\u05e0\u05d5\u05ea, \u05d0\u05d9-\u05d0\u05d9\u05e1\u05d5\u05e3 \u05d5\u05d7\u05e1\u05d9\u05de\u05d5\u05ea</p>
        </div>
        <input type="text" id="clients-search-input" value="${escapeHtml(searchTerm)}"
          placeholder="\ud83d\udd0d \u05d7\u05e4\u05e9 \u05dc\u05e4\u05d9 \u05e9\u05dd, \u05d8\u05dc\u05e4\u05d5\u05df \u05d0\u05d5 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc..."
          class="w-full sm:w-80 bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${clients.map((c) => {
          const isBlocked = Boolean(blockedMap[c.key]);
          const noShows = noShowsMap[c.key] || 0;
          const lates = latesMap[c.key] || 0;
          const itemsBadges = Object.entries(c.itemsCount)
            .map(([name, qty]) => `<span class="text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded-lg">${escapeHtml(name)}: ${qty}</span>`)
            .join(" ");

          return `
            <div class="bg-stone-900 border ${isBlocked ? "border-red-600" : "border-stone-800"} rounded-2xl p-4 shadow space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-bold text-white text-base">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)} ${isBlocked ? `<span class="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full mr-1">\u05d7\u05e1\u05d5\u05dd</span>` : ""}</h3>
                  <div class="text-xs text-stone-400">${escapeHtml(c.phone)} ${c.email ? `\u2022 ${escapeHtml(c.email)}` : ""}</div>
                </div>
                <span class="bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  \u05e1\u05d4"\u05db: ${c.totalOrders}
                </span>
              </div>

              ${itemsBadges ? `<div class="flex flex-wrap gap-1.5">${itemsBadges}</div>` : ""}

              <!-- \u05de\u05d5\u05e0\u05d9 \u05d0\u05d9-\u05d0\u05d9\u05e1\u05d5\u05e3 \u05d5\u05d0\u05d9\u05d7\u05d5\u05e8\u05d9\u05dd -->
              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-xs">
                <div class="bg-stone-950 p-2 rounded-xl flex items-center justify-between">
                  <span class="text-stone-300">\u26a0\ufe0f \u05dc\u05d0 \u05d0\u05e1\u05e3: <strong class="text-red-400">${noShows}</strong></span>
                  <div class="flex gap-1">
                    <button data-counter="no_shows" data-delta="-1" data-key="${escapeHtml(c.key)}" class="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded cursor-pointer">-1</button>
                    <button data-counter="no_shows" data-delta="1" data-key="${escapeHtml(c.key)}" class="px-2 py-0.5 bg-red-950 hover:bg-red-900 text-red-200 rounded cursor-pointer">+1</button>
                  </div>
                </div>
                <div class="bg-stone-950 p-2 rounded-xl flex items-center justify-between">
                  <span class="text-stone-300">\u23f0 \u05d0\u05d9\u05d7\u05d5\u05e8\u05d9\u05dd: <strong class="text-amber-400">${lates}</strong></span>
                  <div class="flex gap-1">
                    <button data-counter="client_lates" data-delta="-1" data-key="${escapeHtml(c.key)}" class="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded cursor-pointer">-1</button>
                    <button data-counter="client_lates" data-delta="1" data-key="${escapeHtml(c.key)}" class="px-2 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-200 rounded cursor-pointer">+1</button>
                  </div>
                </div>
              </div>

              <!-- \u05db\u05e4\u05ea\u05d5\u05e8 \u05d1\u05d0\u05df / \u05d4\u05ea\u05e8\u05ea \u05d7\u05e1\u05d9\u05de\u05d4 -->
              <div>
                ${isBlocked ? `
                  <button data-unban="${escapeHtml(c.key)}" class="w-full py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-xs font-bold cursor-pointer">
                    \u2705 \u05d4\u05ea\u05e8 \u05d7\u05e1\u05d9\u05de\u05d4 (Unban)
                  </button>
                ` : `
                  <button data-ban="${escapeHtml(c.key)}" data-name="${escapeHtml(c.firstName + " " + c.lastName)}" data-phone="${escapeHtml(c.phone)}"
                    class="w-full py-2 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold cursor-pointer">
                    \ud83d\udeab \u05ea\u05df \u05d1\u05d0\u05df (\u05d7\u05e1\u05d5\u05dd \u05dc\u05e7\u05d5\u05d7)
                  </button>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  const newSearchInput = document.getElementById("clients-search-input");
  if (newSearchInput) {
    if (hadFocus) {
      newSearchInput.focus();
      newSearchInput.setSelectionRange(searchTerm.length, searchTerm.length);
    }
    newSearchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      renderClientsTab();
    });
  }

  // \u05e2\u05d3\u05db\u05d5\u05df \u05de\u05d5\u05e0\u05d9\u05dd
  container.querySelectorAll("[data-counter]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetDoc = btn.dataset.counter;
      const delta = Number(btn.dataset.delta);
      const key = btn.dataset.key;
      const currentMap = targetDoc === "no_shows" ? { ...noShowsMap } : { ...latesMap };
      const nextVal = Math.max(0, (currentMap[key] || 0) + delta);
      currentMap[key] = nextVal;
      await setDoc(doc(db, "config", targetDoc), { counts: currentMap }, { merge: true });
    });
  });

  // \u05d7\u05e1\u05d9\u05de\u05ea \u05dc\u05e7\u05d5\u05d7 + \u05d1\u05d9\u05d8\u05d5\u05dc \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea
  container.querySelectorAll("[data-ban]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.ban;
      const reason = prompt("\u05e1\u05d9\u05d1\u05ea \u05d4\u05d7\u05e1\u05d9\u05de\u05d4 (\u05dc\u05de\u05e9\u05dc: \u05d4\u05d6\u05de\u05d9\u05df \u05d5\u05dc\u05d0 \u05d4\u05d2\u05d9\u05e2 \u05dc\u05d0\u05e1\u05d5\u05e3):") || "\u05d7\u05e1\u05d5\u05dd \u05e2\u05dc \u05d9\u05d3\u05d9 \u05d4\u05de\u05e0\u05d4\u05dc";
      await setDoc(doc(db, "blocked_users", key), {
        email: key.includes("@") ? key : "",
        phone: btn.dataset.phone || "",
        fullName: btn.dataset.name || "",
        reason,
        blockedAt: new Date().toISOString()
      });

      // \u05d1\u05d9\u05d8\u05d5\u05dc \u05d0\u05d5\u05d8\u05d5\u05de\u05d8\u05d9 \u05e9\u05dc \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05e4\u05e2\u05d9\u05dc\u05d5\u05ea
      const activeToCancel = ordersList.filter(
        (o) => (o.userEmail === key || o.phone === key) && ["pending", "preparing", "ready"].includes(o.status)
      );
      for (const ord of activeToCancel) {
        await updateDoc(doc(db, "orders", ord.id), { status: "canceled_by_admin" });
      }
    });
  });

  // \u05d4\u05ea\u05e8\u05ea \u05d7\u05e1\u05d9\u05de\u05d4
  container.querySelectorAll("[data-unban]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "blocked_users", btn.dataset.unban));
    });
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}