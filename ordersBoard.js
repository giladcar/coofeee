import {
  db,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "./firebase.js";

// \u05de\u05e9\u05ea\u05e0\u05d9 \u05de\u05e6\u05d1 (\u05de\u05d5\u05d2\u05d3\u05e8\u05d9\u05dd \u05d1\u05e8\u05d0\u05e9 \u05d4\u05e7\u05d5\u05d1\u05e5)
let listenersInitialized = false;
let allOrders = [];
let noShowsMap = {};
let clientLatesMap = {};
let currentFilter = "active";
let selectedDate = new Date().toISOString().split("T")[0];

// \u05e9\u05e2\u05d5\u05df \u05d7\u05d9
setInterval(() => {
  const clockEl = document.getElementById("live-clock");
  if (clockEl) {
    const now = new Date();
    clockEl.textContent =
      now.toLocaleDateString("he-IL") +
      " | " +
      now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
}, 1000);

// \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05e2\u05dd \u05e1\u05d9\u05e1\u05de\u05d4 \u05d1\u05dc\u05d1\u05d3
const ADMIN_PASS = "!@#$%^&*12345678";
const loginScreen = document.getElementById("login-screen");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("login-error");

function checkAdminSession() {
  if (localStorage.getItem("coffee_admin_auth") === "true") {
    loginScreen?.classList.add("hidden");
    adminApp?.classList.remove("hidden");
    initRealtimeListeners();
  } else {
    loginScreen?.classList.remove("hidden");
    adminApp?.classList.add("hidden");
  }
}

checkAdminSession();

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  loginError?.classList.add("hidden");
  const password = document.getElementById("admin-password").value;
  if (password === ADMIN_PASS) {
    localStorage.setItem("coffee_admin_auth", "true");
    checkAdminSession();
  } else {
    if (loginError) {
      loginError.textContent = "\u05e1\u05d9\u05e1\u05de\u05d4 \u05e9\u05d2\u05d5\u05d9\u05d4, \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1.";
      loginError.classList.remove("hidden");
    }
  }
});

document.getElementById("logout-btn")?.addEventListener("click", () => {
  if (confirm("\u05dc\u05d4\u05ea\u05e0\u05ea\u05e7 \u05de\u05e4\u05d0\u05e0\u05dc \u05d4\u05e0\u05d9\u05d4\u05d5\u05dc?")) {
    localStorage.removeItem("coffee_admin_auth");
    location.reload();
  }
});

// \u05de\u05e2\u05d1\u05e8 \u05d1\u05d9\u05df \u05dc\u05e9\u05d5\u05e0\u05d9\u05d5\u05ea
export function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  document.querySelectorAll(".tab-content").forEach((sec) => {
    sec.classList.add("hidden");
  });
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove("hidden");
}
window.switchTab = switchTab;

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn && btn.dataset.tab) {
    e.preventDefault();
    switchTab(btn.dataset.tab);
  }
});

// \u05e1\u05d9\u05e0\u05d5\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea
const dateInput = document.getElementById("orders-date-filter");
if (dateInput) {
  dateInput.value = selectedDate;
  dateInput.addEventListener("change", (e) => {
    selectedDate = e.target.value;
    currentFilter = "date";
    renderOrders();
  });
}

document.querySelectorAll(".order-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".order-filter-btn").forEach((b) => {
      b.classList.remove("bg-amber-600", "text-white");
      b.classList.add("bg-stone-800", "text-stone-300");
    });
    btn.classList.add("bg-amber-600", "text-white");
    btn.classList.remove("bg-stone-800", "text-stone-300");
    currentFilter = btn.dataset.filter;
    renderOrders();
  });
});

function initRealtimeListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  const qOrders = query(collection(db, "orders"), orderBy("pickupTime", "asc"));
  onSnapshot(qOrders, (snapshot) => {
    allOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderOrders();
  });

  onSnapshot(collection(db, "arrival_alerts"), (snapshot) => {
    const container = document.getElementById("arrival-alerts-container");
    const list = document.getElementById("arrival-alerts-list");
    if (!container || !list) return;

    const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (alerts.length === 0) {
      container.classList.add("hidden");
      return;
    }

    container.classList.remove("hidden");
    list.innerHTML = alerts
      .map(
        (a) => `
      <div class="bg-stone-900 border border-amber-500/50 rounded-xl p-3 flex items-center justify-between gap-2">
        <div class="text-xs">
          <span class="font-bold text-amber-300">${escapeHtml(a.firstName || "\u05dc\u05e7\u05d5\u05d7")}</span>
          <span class="text-stone-300">(${escapeHtml(a.pickupTime || "")}): </span>
          <span class="text-white font-semibold">${escapeHtml(a.message || `\u05de\u05ea\u05e2\u05db\u05d1 \u05d1-${a.delayMinutes || 5} \u05d3\u05e7'`)}</span>
        </div>
        <button data-dismiss-alert="${a.id}" class="text-xs bg-stone-800 hover:bg-stone-700 px-2 py-1 rounded text-stone-300 cursor-pointer">\u2713</button>
      </div>
    `
      )
      .join("");

    list.querySelectorAll("[data-dismiss-alert]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "arrival_alerts", btn.dataset.dismissAlert));
      });
    });
  });

  onSnapshot(doc(db, "config", "no_shows"), (snap) => {
    noShowsMap = snap.exists() ? snap.data().counts || {} : {};
    renderOrders();
  });

  onSnapshot(doc(db, "config", "client_lates"), (snap) => {
    clientLatesMap = snap.exists() ? snap.data().counts || {} : {};
    renderOrders();
  });

  onSnapshot(doc(db, "config", "settings"), (snap) => {
    const badge = document.getElementById("cart-status-badge");
    if (!badge || !snap.exists()) return;
    const isClosed = snap.data().isCartClosed === true;
    if (isClosed) {
      badge.className = "px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-700";
      badge.textContent = "\ud83d\udd34 \u05d4\u05e2\u05d2\u05dc\u05d4 \u05e1\u05d2\u05d5\u05e8\u05d4 \u05db\u05e8\u05d2\u05e2";
    } else {
      badge.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700";
      badge.textContent = "\ud83d\udfe2 \u05d4\u05e2\u05d2\u05dc\u05d4 \u05e4\u05ea\u05d5\u05d7\u05d4 \u05dc\u05d4\u05d6\u05de\u05e0\u05d5\u05ea";
    }
  });
}

function renderOrders() {
  const grid = document.getElementById("orders-grid");
  if (!grid) return;

  const todayStr = new Date().toISOString().split("T")[0];
  let filtered = [...allOrders];

  if (currentFilter === "active") {
    filtered = filtered.filter(
      (o) => o.date === todayStr && ["pending", "preparing", "ready"].includes(o.status)
    );
  } else if (currentFilter === "today") {
    filtered = filtered.filter((o) => o.date === todayStr);
  } else if (currentFilter === "date") {
    filtered = filtered.filter((o) => o.date === selectedDate);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 bg-stone-900/50 rounded-2xl border border-stone-800 text-stone-400">\u05d0\u05d9\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05dc\u05d4\u05e6\u05d2\u05d4 \u05d1\u05d7\u05ea\u05da \u05d6\u05d4 \u2615</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((order) => {
      const key = order.userEmail || order.phone || "";
      const noShows = noShowsMap[key] || 0;
      const lates = clientLatesMap[key] || 0;

      const statusBadge = getStatusBadge(order.status);
      const itemsHtml = (order.items || [])
        .map(
          (item) => `
      <div class="flex justify-between items-start py-1.5 border-b border-stone-800/80 last:border-0 text-sm">
        <div>
          <span class="font-bold text-amber-300">${item.quantity || 1}x</span>
          <span class="font-semibold text-white">${escapeHtml(item.name)}</span>
          ${item.customizations ? `<div class="text-xs text-stone-400">${escapeHtml(item.customizations)}</div>` : ""}
          ${item.notes ? `<div class="text-xs text-amber-200/80 italic">"\u05d4\u05e2\u05e8\u05d4: ${escapeHtml(item.notes)}"</div>` : ""}
        </div>
        <span class="text-stone-300 font-mono">\u20aa${(item.price || 0) * (item.quantity || 1)}</span>
      </div>
    `
        )
        .join("");

      const waPhone = formatPhoneForWA(order.phone);
      const waText = encodeURIComponent(
        `\u05d4\u05d9\u05d9 ${order.firstName || ""}, \u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05e9\u05dc\u05da \u05de\u05e2\u05d2\u05dc\u05ea \u05d4\u05e7\u05e4\u05d4 \u05de\u05d5\u05db\u05e0\u05d4 \u05dc\u05d0\u05d9\u05e1\u05d5\u05e3! \u2615`
      );

      return `
      <div class="bg-stone-900 border ${order.status === "ready" ? "border-emerald-500" : order.status === "preparing" ? "border-amber-500" : "border-stone-800"} rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl font-black text-amber-400 font-mono">${escapeHtml(order.pickupTime || "--:--")}</span>
                <span class="text-xs text-stone-500">${escapeHtml(order.date || "")}</span>
              </div>
              <h3 class="font-bold text-lg text-white mt-0.5">${escapeHtml(order.firstName || "")} ${escapeHtml(order.lastName || "")}</h3>
              <p class="text-xs text-stone-400">${escapeHtml(order.phone || "")}</p>
            </div>
            ${statusBadge}
          </div>

          ${
            noShows > 0 || lates > 0
              ? `
            <div class="flex flex-wrap gap-1.5 mb-3">
              ${noShows > 0 ? `<span class="text-xs bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">\u26a0\ufe0f \u05dc\u05d0 \u05d0\u05e1\u05e3: ${noShows}</span>` : ""}
              ${lates > 0 ? `<span class="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">\u23f0 \u05d0\u05d9\u05d7\u05e8: ${lates}</span>` : ""}
            </div>
          `
              : ""
          }

          <div class="bg-stone-950/70 rounded-xl p-3 mb-3 border border-stone-800/80">
            ${itemsHtml}
            <div class="flex justify-between items-center pt-2 mt-2 border-t border-stone-700 font-bold text-base">
              <span>\u05e1\u05d4"\u05db \u05dc\u05ea\u05e9\u05dc\u05d5\u05dd:</span>
              <span class="text-amber-400">\u20aa${order.totalPrice || 0}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-2">
          ${renderStatusButtons(order)}
          <div class="flex gap-2">
            ${
              waPhone
                ? `
              <a href="https://wa.me/${waPhone}?text=${waText}" target="_blank"
                class="flex-1 text-center bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 text-xs font-bold py-2 rounded-xl transition">
                WhatsApp \ud83d\udcac
              </a>
            `
                : ""
            }
            ${
              order.status !== "canceled_by_admin" && order.status !== "completed"
                ? `
              <button data-cancel-order="${order.id}"
                class="px-3 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold py-2 rounded-xl transition cursor-pointer">
                \u05d1\u05d8\u05dc \u05d4\u05d6\u05de\u05e0\u05d4
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  grid.querySelectorAll("[data-next-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.orderId;
      const nextStatus = btn.dataset.nextStatus;
      await updateDoc(doc(db, "orders", id), { status: nextStatus });
    });
  });

  grid.querySelectorAll("[data-cancel-order]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (
        confirm(
          "\u05dc\u05d1\u05d8\u05dc \u05d4\u05d6\u05de\u05e0\u05d4 \u05d6\u05d5? \u05d4\u05dc\u05e7\u05d5\u05d7 \u05d9\u05e7\u05d1\u05dc \u05d4\u05ea\u05e8\u05d0\u05d4."
        )
      ) {
        await updateDoc(doc(db, "orders", btn.dataset.cancelOrder), {
          status: "canceled_by_admin"
        });
      }
    });
  });
}

function getStatusBadge(status) {
  switch (status) {
    case "pending":
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-800 text-amber-300 border border-amber-500/40">\u23f3 \u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d4\u05db\u05e0\u05d4</span>`;
    case "preparing":
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white animate-pulse">\u2615 \u05d1\u05d4\u05db\u05e0\u05d4 \u05db\u05e8\u05d2\u05e2</span>`;
    case "ready":
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">\u2705 \u05de\u05d5\u05db\u05df \u05dc\u05d0\u05d9\u05e1\u05d5\u05e3!</span>`;
    case "completed":
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-800 text-stone-400">\u05e0\u05de\u05e1\u05e8</span>`;
    case "canceled_by_admin":
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">\u05d1\u05d5\u05d8\u05dc</span>`;
    default:
      return `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-800 text-stone-300">${escapeHtml(status || "")}</span>`;
  }
}

function renderStatusButtons(order) {
  if (order.status === "pending") {
    return `<button data-order-id="${order.id}" data-next-status="preparing"
      class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
      \u2615 \u05d4\u05ea\u05d7\u05dc \u05d4\u05db\u05e0\u05d4
    </button>`;
  }
  if (order.status === "preparing") {
    return `<button data-order-id="${order.id}" data-next-status="ready"
      class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
      \u2705 \u05de\u05d5\u05db\u05df \u05dc\u05d0\u05d9\u05e1\u05d5\u05e3 (\u05e2\u05d3\u05db\u05df \u05dc\u05e7\u05d5\u05d7)
    </button>`;
  }
  if (order.status === "ready") {
    return `<button data-order-id="${order.id}" data-next-status="completed"
      class="w-full bg-stone-700 hover:bg-stone-600 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">
      \ud83e\udd1d \u05e1\u05de\u05df \u05db\u05e0\u05de\u05e1\u05e8 \u05dc\u05dc\u05e7\u05d5\u05d7
    </button>`;
  }
  return "";
}

function formatPhoneForWA(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}