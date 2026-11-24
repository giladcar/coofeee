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
} from "./firebase.js?v=65";

let allOrders = [];
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
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // התעלמות מחסימת אודיו לפני אינטראקציה
  }
}

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

// שליחת עדכון סטטוס מותאם אישית ללקוח
window.sendCustomOrderStatus = async (orderId) => {
  const input = document.getElementById(`custom-msg-${orderId}`);
  const msg = input ? input.value.trim() : "";
  if (!msg) {
    alert("נא להקליד הודעה קצרה ללקוח לפני השליחה.");
    return;
  }
  await updateDoc(doc(db, "orders", orderId), {
    status: "custom",
    customStatusMessage: msg,
  });
  openCustomNoteOrderId = null;
};

// שינוי סטטוס הזמנה
window.changeOrderStatus = async (orderId, newStatus) => {
  if (newStatus === "canceled_by_admin") {
    if (!confirm("לבטל הזמנה זו? הלקוח יקבל על כך התראה.")) return;
  }
  await updateDoc(doc(db, "orders", orderId), {
    status: newStatus,
    ...(newStatus !== "custom" ? { customStatusMessage: "" } : {}),
    ...(newStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
  });
};

// החלפת מצב תשלום (שולם / לא שולם) בהזמנות שהושלמו/בוטלו
window.toggleOrderPaidStatus = async (orderId, currentIsPaid) => {
  await updateDoc(doc(db, "orders", orderId), {
    isPaid: !currentIsPaid,
  });
};

// מחיקת הזמנה לצמיתות
window.deleteOrderDoc = async (orderId) => {
  if (!confirm("למחוק את ההזמנה לצמיתות?")) return;
  await deleteDoc(doc(db, "orders", orderId));
};

function renderOrdersBoard() {
  const grid = document.getElementById("orders-grid");
  if (!grid) return;

  const activeStatuses = ["pending", "preparing", "ready", "out_for_delivery", "custom"];
  const activeOrders = allOrders.filter((o) => activeStatuses.includes(o.status || "pending"));
  const archiveOrders = allOrders.filter((o) => !activeStatuses.includes(o.status || "pending")).slice(0, 20);

  const notifGranted =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";

  const renderCard = (ord, isArchive = false) => {
    const isDelivery = ord.orderType === "delivery";
    const isPaid = Boolean(ord.isPaid);

    const itemsHtml = (ord.items || [])
      .map(
        (it) => `
        <div class="flex justify-between items-start text-sm bg-stone-950/80 px-3 py-2 rounded-xl border border-stone-800/80">
          <div>
            <span class="font-black text-amber-400">${it.quantity}x</span>
            <span class="font-bold text-white">${it.name}</span>
            ${it.customizations ? `<div class="text-xs text-stone-400">• ${it.customizations}</div>` : ""}
            ${it.notes ? `<div class="text-xs text-amber-300">📝 ${it.notes}</div>` : ""}
          </div>
          <span class="font-mono text-xs text-stone-400">₪${it.price * it.quantity}</span>
        </div>
      `
      )
      .join("");

    let statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300">⏳ ממתינה להכנה</span>`;
    if (ord.status === "preparing") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">☕ בהכנה</span>`;
    } else if (ord.status === "ready") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">✅ מוכנה</span>`;
    } else if (ord.status === "out_for_delivery") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300">🛵 יצאה למשלוח</span>`;
    } else if (ord.status === "custom") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300">💬 ${ord.customStatusMessage || "הודעה מותאמת"}</span>`;
    } else if (ord.status === "completed") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-800 text-stone-400">🤝 הושלמה</span>`;
    } else if (ord.status === "canceled_by_admin" || ord.status === "canceled") {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300">❌ בוטלה</span>`;
    }

    const paidBadge = isArchive
      ? isPaid
        ? `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">💵 שולם</span>`
        : `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">⏳ לא שולם</span>`
      : "";

    const controlsHtml = isArchive
      ? `
        <!-- בארכיון: רק שולם/לא שולם + החזר לפעילות -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
          <button type="button" onclick="window.toggleOrderPaidStatus('${ord.id}', ${isPaid})"
            class="py-2.5 px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
              isPaid
                ? "bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/50"
                : "bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border-amber-500/40"
            }">
            ${isPaid ? "✅ שולם (לחץ לביטול)" : "💵 סמן כשולם"}
          </button>
          <button type="button" onclick="window.changeOrderStatus('${ord.id}', 'preparing')"
            class="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-black transition cursor-pointer">
            ↩ החזר לפעילות
          </button>
        </div>
      `
      : `
        <!-- בהזמנות פעילות: כל כפתורי הניהול ושליחת הודעה -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800">
          <button type="button" onclick="window.changeOrderStatus('${ord.id}', 'preparing')"
            class="py-2 px-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold cursor-pointer">
            ☕ בהכנה
          </button>
          <button type="button" onclick="window.changeOrderStatus('${ord.id}', 'ready')"
            class="py-2 px-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold cursor-pointer">
            ✅ מוכן
          </button>
          ${
            isDelivery
              ? `<button type="button" onclick="window.changeOrderStatus('${ord.id}', 'out_for_delivery')"
                  class="py-2 px-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold cursor-pointer">
                  🛵 יצא למשלוח
                </button>`
              : `<button type="button" onclick="window.changeOrderStatus('${ord.id}', 'completed')"
                  class="py-2 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer">
                  🤝 נמסר / הושלם
                </button>`
          }
          <button type="button" onclick="window.changeOrderStatus('${ord.id}', 'canceled_by_admin')"
            class="py-2 px-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold cursor-pointer">
            ❌ בטל הזמנה
          </button>
        </div>

        ${
          isDelivery
            ? `<button type="button" onclick="window.changeOrderStatus('${ord.id}', 'completed')"
                class="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer">
                🤝 סמן משלוח כהושלם
              </button>`
            : ""
        }

        <div class="flex gap-2 pt-1">
          <input id="custom-msg-${ord.id}" type="text" placeholder="הודעה אישית ללקוח (למשל: בעוד 5 דקות מוכן)..."
            value="${(ord.customStatusMessage || "").replace(/"/g, "&quot;")}"
            class="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500" />
          <button type="button" onclick="window.sendCustomOrderStatus('${ord.id}')"
            class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer">
            שלח עדכון
          </button>
        </div>
      `;

    return `
      <div class="bg-stone-900 border ${
        !isArchive && ord.status === "pending" ? "border-amber-500/70" : "border-stone-800"
      } rounded-2xl p-4 space-y-3 shadow-lg">
        <div class="flex flex-wrap items-start justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-base text-white">${ord.firstName || ""} ${ord.lastName || ""}</span>
              <span class="text-xs px-2 py-0.5 rounded-md font-bold ${
                isDelivery ? "bg-purple-950 text-purple-300 border border-purple-700/50" : "bg-stone-800 text-amber-300"
              }">
                ${isDelivery ? "🛵 משלוח" : "☕ במקום"}
              </span>
            </div>
            <div class="text-xs text-stone-400 mt-1 flex flex-wrap gap-3">
              <span>📞 <a href="tel:${ord.phone || ""}" class="underline hover:text-amber-400">${ord.phone || "ללא טלפון"}</a></span>
              <span>🕒 ${ord.pickupTime || ""} (${ord.date || ""})</span>
            </div>
            ${
              isDelivery && ord.deliveryAddress
                ? `<div class="text-xs text-purple-300 font-bold mt-1">📍 כתובת: ${ord.deliveryAddress}</div>`
                : ""
            }
          </div>
          <div class="text-left space-y-1">
            <div class="flex flex-wrap items-center justify-end gap-1.5">
              ${paidBadge}
              ${statusBadge}
            </div>
            <div class="font-mono font-black text-amber-400 text-base">₪${ord.totalPrice || 0}</div>
          </div>
        </div>

        <div class="space-y-1.5">${itemsHtml}</div>

        ${controlsHtml}
      </div>
    `;
  };

  grid.innerHTML = `
    <!-- הגדרת קישורי Bit ו-PayBox + כפתור התראות -->
    <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="font-bold text-amber-400 text-sm">
          💳 קישורי תשלום ללקוחות (Bit / PayBox)
        </span>
        <button id="enable-admin-notifs-btn" type="button"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
            notifGranted
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
              : "bg-stone-950 text-amber-400 border-amber-500/40 hover:bg-amber-500/20"
          }">
          ${notifGranted ? "🔔 התראות לטלפון פעילות" : "🔕 הפעל התראות לטלפון"}
        </button>
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

    <!-- הזמנות פעילות -->
    <div class="space-y-4">
      <h2 class="text-lg font-black text-amber-400">🔥 הזמנות פעילות (${activeOrders.length})</h2>
      ${
        activeOrders.length === 0
          ? `<div class="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center text-stone-400 text-sm">אין הזמנות פעילות כרגע ☕</div>`
          : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${activeOrders.map((o) => renderCard(o, false)).join("")}</div>`
      }
    </div>

    <!-- ארכיון: הזמנות אחרונות שהושלמו / בוטלו -->
    ${
      archiveOrders.length > 0
        ? `
      <div class="space-y-4 pt-6 border-t border-stone-800">
        <h2 class="text-base font-bold text-stone-400">📜 הזמנות אחרונות שהושלמו / בוטלו (${archiveOrders.length})</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${archiveOrders.map((o) => renderCard(o, true)).join("")}</div>
      </div>
    `
        : ""
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
}

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

  unsubOrders = onSnapshot(
    collection(db, "orders"),
    (snap) => {
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
    },
    (err) => {
      const grid = document.getElementById("orders-grid");
      if (grid) {
        grid.innerHTML = `<div class="bg-red-950/70 border border-red-600 rounded-2xl p-5 text-red-200 text-sm font-bold text-center">⚠️ שגיאה בטעינת הזמנות (${err.code}): ${err.message}</div>`;
      }
    }
  );
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    initAdminDashboard();
  }
});