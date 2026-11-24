import {
  db,
  auth,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  onAuthStateChanged,
} from "./firebase.js?v=55";

let allOrders = [];
let activeOrdersSubTab = "active"; // "active" | "completed"
let openCustomNoteOrderId = null;
let paymentSettings = { bitLink: "", payboxLink: "" };
let knownOrderIds = new Set();
let isFirstOrdersLoad = true;
let clockInterval = null;
let unsubSettings = null;
let unsubOrders = null;

function triggerAdminNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

// --- 1. אתחול לוח הבקרה לאחר זיהוי המנהל ב-Firebase Auth ---
function initAdminDashboard() {
  startClock();
  startOrdersListener();
}

function startClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;
  if (clockInterval) clearInterval(clockInterval);
  const update = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleString("he-IL", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  update();
  clockInterval = setInterval(update, 1000);
}

// --- 2. האזנה לכל ההזמנות וקישורי התשלום בזמן אמת ---
function startOrdersListener() {
  if (unsubSettings) unsubSettings();
  if (unsubOrders) unsubOrders();

  unsubSettings = onSnapshot(doc(db, "config", "settings"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      paymentSettings.bitLink = data.bitLink || "";
      paymentSettings.payboxLink = data.payboxLink || "";

      const badge = document.getElementById("cart-status-badge");
      if (badge) {
        if (data.isCartClosed) {
          badge.textContent = "🔴 העגלה סגורה להזמנות";
          badge.className =
            "px-3 py-1 rounded-full text-xs font-bold bg-red-900/60 text-red-300 border border-red-700";
        } else {
          badge.textContent = "🟢 העגלה פתוחה להזמנות";
          badge.className =
            "px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700";
        }
      }
      renderOrdersBoard();
    }
  });

  // טוען את כל המסמכים באוסף orders וממיין בצד הלקוח כדי לא לפספס אף הזמנה
  unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) =>
      String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || ""))
    );
    allOrders = list;

    if (isFirstOrdersLoad) {
      snap.docs.forEach((d) => knownOrderIds.add(d.id));
      isFirstOrdersLoad = false;
    } else {
      snap.docs.forEach((d) => {
        if (!knownOrderIds.has(d.id)) {
          knownOrderIds.add(d.id);
          const ord = d.data();
          const typeLabel = ord.orderType === "delivery" ? "משלוח" : "איסוף במקום";
          triggerAdminNotification(
            "☕ הזמנה חדשה התקבלה!",
            `${ord.firstName || "לקוח"} • ${typeLabel} • ₪${ord.totalPrice || 0}`
          );
        }
      });
    }

    renderOrdersBoard();
  });
}

function getStatusLabel(ord) {
  if (ord.status === "custom" && ord.customStatusMessage) {
    return `💬 ${ord.customStatusMessage}`;
  }
  switch (ord.status) {
    case "pending":
      return "⏳ ממתינה להכנה";
    case "preparing":
      return "☕ בהכנה";
    case "ready":
      return "✅ מוכן";
    case "out_for_delivery":
      return "🛵 שליח הוזמן / בדרך";
    case "completed":
      return "📦 הוכן והוזמן";
    case "canceled_by_admin":
      return "❌ בוטל ע״י אדמין";
    case "canceled":
      return "בוטל ע״י לקוח";
    default:
      return ord.status || "⏳ ממתינה";
  }
}

function renderOrdersBoard() {
  const grid = document.getElementById("orders-grid");
  if (!grid) return;

  grid.className = "space-y-4";

  const activeList = allOrders.filter((o) =>
    ["pending", "preparing", "ready", "out_for_delivery", "custom"].includes(o.status || "pending")
  );
  const completedList = allOrders.filter((o) => o.status === "completed");
  const listToShow = activeOrdersSubTab === "active" ? activeList : completedList;

  const notifGranted =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";

  grid.innerHTML = `
    <!-- הגדרת קישורי Bit ו-PayBox -->
    <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4">
      <div class="font-bold text-amber-400 text-sm mb-2.5">
        💳 קישורי תשלום ללקוחות (Bit / PayBox)
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <input id="admin-bit-link" type="url" dir="ltr" placeholder="הדבק קישור לתשלום ב-Bit..." value="${paymentSettings.bitLink}"
          class="bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
        <input id="admin-paybox-link" type="url" dir="ltr" placeholder="הדבק קישור לתשלום ב-PayBox..." value="${paymentSettings.payboxLink}"
          class="bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
        <button id="save-payment-links-btn" type="button"
          class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl px-4 py-2 text-sm transition cursor-pointer">
          💾 שמור קישורי תשלום
        </button>
      </div>
    </div>

    <!-- לשוניות: הזמנות פעילות / הוכנו והוזמנו + כפתור התראות לטלפון -->
    <div class="flex flex-wrap items-center gap-2">
      <button id="tab-active-orders" type="button"
        class="px-4 py-2.5 rounded-xl text-sm font-black border transition cursor-pointer ${
          activeOrdersSubTab === "active"
            ? "bg-amber-500 text-stone-950 border-amber-400"
            : "bg-stone-900 text-stone-300 border-stone-800"
        }">
        🔥 הזמנות פעילות (${activeList.length})
      </button>
      <button id="tab-completed-orders" type="button"
        class="px-4 py-2.5 rounded-xl text-sm font-black border transition cursor-pointer ${
          activeOrdersSubTab === "completed"
            ? "bg-emerald-500 text-stone-950 border-emerald-400"
            : "bg-stone-900 text-stone-300 border-stone-800"
        }">
        📦 הוכנו והוזמנו (${completedList.length})
      </button>
      <button id="enable-admin-notifs-btn" type="button"
        class="mr-auto px-4 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
          notifGranted
            ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
            : "bg-stone-900 text-amber-400 border-amber-500/40 hover:bg-amber-500/20"
        }">
        ${notifGranted ? "🔔 התראות פעילות" : "🔕 הפעל התראות לטלפון"}
      </button>
    </div>

    ${
      listToShow.length === 0
        ? `<div class="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center text-stone-400">
            ${
              activeOrdersSubTab === "active"
                ? "אין הזמנות פעילות כרגע ☕"
                : "תיקיית 'הוכנו והוזמנו' ריקה עדיין 📦"
            }
          </div>`
        : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${listToShow.map((ord) => renderOrderCard(ord)).join("")}
          </div>`
    }
  `;

  document.getElementById("save-payment-links-btn")?.addEventListener("click", async () => {
    const bitVal = document.getElementById("admin-bit-link")?.value.trim() || "";
    const payboxVal = document.getElementById("admin-paybox-link")?.value.trim() || "";
    await setDoc(
      doc(db, "config", "settings"),
      { bitLink: bitVal, payboxLink: payboxVal },
      { merge: true }
    );
    alert("קישורי Bit ו-PayBox נשמרו בהצלחה ומופיעים אצל הלקוחות!");
  });

  document.getElementById("tab-active-orders")?.addEventListener("click", () => {
    activeOrdersSubTab = "active";
    renderOrdersBoard();
  });

  document.getElementById("tab-completed-orders")?.addEventListener("click", () => {
    activeOrdersSubTab = "completed";
    renderOrdersBoard();
  });

  document.getElementById("enable-admin-notifs-btn")?.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("הדפדפן לא תומך בהתראות קופצות.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      triggerAdminNotification("☕ פאנל בריסטה", "התראות הופעלו! תקבל התראה וצליל על כל הזמנה חדשה.");
      renderOrdersBoard();
    }
  });

  bindOrderCardEvents();
}

function renderOrderCard(ord) {
  const isDelivery = ord.orderType === "delivery";
  const itemsHtml = (ord.items || [])
    .map(
      (it) => `
      <div class="py-1 border-b border-stone-800/80 text-sm">
        <strong class="text-amber-400">${it.quantity}x</strong> ${it.name}
        ${it.customizations ? `<span class="text-stone-400 text-xs"> (${it.customizations})</span>` : ""}
        ${it.notes ? `<div class="text-amber-300 text-xs">📝 ${it.notes}</div>` : ""}
      </div>`
    )
    .join("");

  const isCompleted = ord.status === "completed";

  return `
    <div class="bg-stone-900 border ${
      ord.status === "ready" || ord.status === "out_for_delivery"
        ? "border-emerald-500"
        : "border-stone-800"
    } rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg">
      <div class="space-y-2.5">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="font-bold text-base text-white">${ord.firstName || ""} ${ord.lastName || ""}</div>
            <div class="text-xs text-stone-400">📞 ${ord.phone || ""} ${ord.pickupTime ? `| ⏰ ${ord.pickupTime}` : ""}</div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-black bg-stone-800 text-amber-400">
            ${getStatusLabel(ord)}
          </span>
        </div>

        <div class="p-2.5 rounded-xl text-xs font-bold ${
          isDelivery
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
            : "bg-stone-800/70 text-stone-200"
        }">
          ${
            isDelivery
              ? `🛵 משלוח לכתובת: ${ord.deliveryAddress || "לא צוינה כתובת"}`
              : "☕ לקחת במקום"
          }
        </div>

        <div>${itemsHtml}</div>
        <div class="font-black text-amber-400 text-sm">סה״כ: ₪${ord.totalPrice || 0}</div>
      </div>

      ${
        !isCompleted
          ? `
        <div class="space-y-2 pt-2 border-t border-stone-800">
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" data-action="preparing" data-id="${ord.id}" class="py-2 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer">
              ☕ בהכנה
            </button>
            <button type="button" data-action="ready" data-id="${ord.id}" class="py-2 px-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-bold text-xs cursor-pointer">
              ✅ מוכן
            </button>
            <button type="button" data-action="delivery" data-id="${ord.id}" class="py-2 px-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700/60 font-bold text-xs cursor-pointer">
              🛵 להזמין שליח
            </button>
            <button type="button" data-action="toggle-custom" data-id="${ord.id}" class="py-2 px-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/60 font-bold text-xs cursor-pointer">
              ✏️ אחר
            </button>
          </div>

          ${
            openCustomNoteOrderId === ord.id
              ? `
            <div class="flex gap-1.5">
              <input id="custom-msg-${ord.id}" type="text" placeholder="כתוב הודעה ללקוח..." value="${
                  ord.customStatusMessage || ""
                }" class="flex-1 px-3 py-1.5 rounded-xl border border-stone-600 bg-stone-950 text-white text-xs" />
              <button type="button" data-action="save-custom" data-id="${ord.id}" class="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer">
                שלח
              </button>
            </div>
          `
              : ""
          }

          <div class="flex gap-1.5">
            <button type="button" data-action="complete" data-id="${ord.id}" class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs cursor-pointer">
              ✔ העבר להוכנו והוזמנו
            </button>
            <button type="button" data-action="cancel" data-id="${ord.id}" class="px-3 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 text-xs font-bold cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      `
          : `
        <div class="flex gap-1.5 pt-2 border-t border-stone-800">
          <button type="button" data-action="restore" data-id="${ord.id}" class="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer">
            ↩ החזר לפעילות
          </button>
          <button type="button" data-action="delete-permanent" data-id="${ord.id}" class="px-3 py-2 rounded-xl bg-red-950/60 text-red-300 text-xs cursor-pointer">
            🗑
          </button>
        </div>
      `
      }
    </div>
  `;
}

function bindOrderCardEvents() {
  const grid = document.getElementById("orders-grid");
  if (!grid) return;

  grid.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      if (!id) return;

      const orderRef = doc(db, "orders", id);

      if (action === "preparing") {
        await updateDoc(orderRef, { status: "preparing" });
      } else if (action === "ready") {
        await updateDoc(orderRef, { status: "ready" });
      } else if (action === "delivery") {
        await updateDoc(orderRef, { status: "out_for_delivery" });
      } else if (action === "toggle-custom") {
        openCustomNoteOrderId = openCustomNoteOrderId === id ? null : id;
        renderOrdersBoard();
      } else if (action === "save-custom") {
        const input = document.getElementById(`custom-msg-${id}`);
        const msg = input ? input.value.trim() : "";
        if (!msg) return;
        await updateDoc(orderRef, {
          status: "custom",
          customStatusMessage: msg,
        });
        openCustomNoteOrderId = null;
      } else if (action === "complete") {
        await updateDoc(orderRef, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
      } else if (action === "restore") {
        await updateDoc(orderRef, { status: "preparing" });
      } else if (action === "cancel") {
        if (!confirm("לבטל הזמנה זו?")) return;
        await updateDoc(orderRef, { status: "canceled_by_admin" });
      } else if (action === "delete-permanent") {
        if (!confirm("למחוק לצמיתות מההיסטוריה?")) return;
        await deleteDoc(orderRef);
      }
    });
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    initAdminDashboard();
  }
});