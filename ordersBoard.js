import { db } from "./firebase.js";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allOrders = [];
let activeOrdersSubTab = "active"; // "active" | "completed"
let openCustomNoteOrderId = null;

export function initOrdersBoard() {
  const container = document.getElementById("orders-container");
  if (!container) return;

  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      return ord.status || "";
  }
}

function renderOrdersBoard() {
  const container = document.getElementById("orders-container");
  if (!container) return;

  const activeList = allOrders.filter((o) =>
    ["pending", "preparing", "ready", "out_for_delivery", "custom"].includes(o.status)
  );
  const completedList = allOrders.filter((o) => o.status === "completed");

  const listToShow = activeOrdersSubTab === "active" ? activeList : completedList;

  container.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
      <button id="tab-active-orders" style="padding:10px 18px; border-radius:12px; font-weight:800; border:1px solid ${
        activeOrdersSubTab === "active" ? "#f59e0b" : "#3f3f46"
      }; background:${
    activeOrdersSubTab === "active" ? "#f59e0b" : "#18181b"
  }; color:${activeOrdersSubTab === "active" ? "#09090b" : "#f4f4f5"}; cursor:pointer;">
        🔥 הזמנות פעילות (${activeList.length})
      </button>
      <button id="tab-completed-orders" style="padding:10px 18px; border-radius:12px; font-weight:800; border:1px solid ${
        activeOrdersSubTab === "completed" ? "#10b981" : "#3f3f46"
      }; background:${
    activeOrdersSubTab === "completed" ? "#10b981" : "#18181b"
  }; color:${activeOrdersSubTab === "completed" ? "#09090b" : "#f4f4f5"}; cursor:pointer;">
        📦 הוכנו והוזמנו (${completedList.length})
      </button>
    </div>

    ${
      listToShow.length === 0
        ? `<div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:32px; text-align:center; color:#a1a1aa;">
            ${
              activeOrdersSubTab === "active"
                ? "אין הזמנות פעילות כרגע ☕"
                : "תיקיית 'הוכנו והוזמנו' ריקה עדיין 📦"
            }
          </div>`
        : `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">
            ${listToShow.map((ord) => renderOrderCard(ord)).join("")}
          </div>`
    }
  `;

  document.getElementById("tab-active-orders")?.addEventListener("click", () => {
    activeOrdersSubTab = "active";
    renderOrdersBoard();
  });

  document.getElementById("tab-completed-orders")?.addEventListener("click", () => {
    activeOrdersSubTab = "completed";
    renderOrdersBoard();
  });

  bindOrderCardEvents(listToShow);
}

function renderOrderCard(ord) {
  const isDelivery = ord.orderType === "delivery";
  const itemsHtml = (ord.items || [])
    .map(
      (it) => `
      <div style="padding:4px 0; border-bottom:1px solid #27272a;">
        <strong style="color:#fbbf24;">${it.quantity}x</strong> ${it.name}
        ${it.customizations ? `<span style="color:#a1a1aa; font-size:12px;"> (${it.customizations})</span>` : ""}
        ${it.notes ? `<div style="color:#fcd34d; font-size:12px;">📝 ${it.notes}</div>` : ""}
      </div>`
    )
    .join("");

  const isCompleted = ord.status === "completed";

  return `
    <div style="background:#18181b; border:1px solid ${
      ord.status === "ready" || ord.status === "out_for_delivery" ? "#10b981" : "#27272a"
    }; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div>
          <strong style="font-size:16px; color:#fff;">${ord.firstName || ""} ${ord.lastName || ""}</strong>
          <div style="font-size:12px; color:#a1a1aa;">📞 ${ord.phone || ""} | ⏰ ${ord.pickupTime || ""}</div>
        </div>
        <span style="padding:4px 10px; border-radius:999px; font-size:12px; font-weight:800; background:#27272a; color:#fbbf24;">
          ${getStatusLabel(ord)}
        </span>
      </div>

      <div style="padding:8px 10px; border-radius:10px; font-size:12px; font-weight:700; background:${
        isDelivery ? "rgba(245, 158, 11, 0.15)" : "rgba(63, 63, 70, 0.4)"
      }; color:${isDelivery ? "#fcd34d" : "#e4e4e7"};">
        ${
          isDelivery
            ? `🛵 משלוח לכתובת: ${ord.deliveryAddress || "לא צוינה כתובת"}`
            : "☕ לקחת במקום"
        }
      </div>

      <div style="font-size:13px; color:#f4f4f5;">
        ${itemsHtml}
      </div>

      <div style="font-weight:900; color:#fbbf24; font-size:14px;">
        סה״כ: ₪${ord.totalPrice || 0}
      </div>

      ${
        !isCompleted
          ? `
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-top:4px;">
          <button data-action="preparing" data-id="${ord.id}" style="padding:8px; border-radius:10px; border:1px solid #3f3f46; background:#27272a; color:#fff; font-weight:700; font-size:12px; cursor:pointer;">
            ☕ בהכנה
          </button>
          <button data-action="ready" data-id="${ord.id}" style="padding:8px; border-radius:10px; border:1px solid #10b981; background:rgba(16,185,129,0.2); color:#6ee7b7; font-weight:700; font-size:12px; cursor:pointer;">
            ✅ מוכן
          </button>
          <button data-action="delivery" data-id="${ord.id}" style="padding:8px; border-radius:10px; border:1px solid #3b82f6; background:rgba(59,130,246,0.2); color:#93c5fd; font-weight:700; font-size:12px; cursor:pointer;">
            🛵 להזמין שליח
          </button>
          <button data-action="toggle-custom" data-id="${ord.id}" style="padding:8px; border-radius:10px; border:1px solid #a855f7; background:rgba(168,85,247,0.2); color:#d8b4fe; font-weight:700; font-size:12px; cursor:pointer;">
            ✏️ אחר
          </button>
        </div>

        ${
          openCustomNoteOrderId === ord.id
            ? `
          <div style="display:flex; gap:6px; margin-top:4px;">
            <input id="custom-msg-${ord.id}" type="text" placeholder="כתוב הודעה ללקוח..." value="${
                ord.customStatusMessage || ""
              }" style="flex:1; padding:8px 10px; border-radius:10px; border:1px solid #52525b; background:#09090b; color:#fff; font-size:12px;" />
            <button data-action="save-custom" data-id="${ord.id}" style="padding:8px 12px; border-radius:10px; background:#a855f7; color:#fff; font-weight:800; border:none; font-size:12px; cursor:pointer;">
              שלח
            </button>
          </div>
        `
            : ""
        }

        <div style="display:flex; gap:6px; margin-top:6px; border-top:1px solid #27272a; padding-top:8px;">
          <button data-action="complete" data-id="${ord.id}" style="flex:1; padding:9px; border-radius:10px; background:#10b981; color:#09090b; font-weight:900; border:none; font-size:13px; cursor:pointer;">
            ✔ העבר להוכנו והוזמנו
          </button>
          <button data-action="cancel" data-id="${ord.id}" style="padding:9px 12px; border-radius:10px; background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid #7f1d1d; font-weight:700; font-size:12px; cursor:pointer;">
            ✕ ביטול
          </button>
        </div>
      `
          : `
        <div style="display:flex; gap:6px; margin-top:4px; border-top:1px solid #27272a; padding-top:8px;">
          <button data-action="restore" data-id="${ord.id}" style="flex:1; padding:8px; border-radius:10px; background:#27272a; color:#e4e4e7; border:1px solid #3f3f46; font-weight:700; font-size:12px; cursor:pointer;">
            ↩ החזר לפעילות
          </button>
          <button data-action="delete-permanent" data-id="${ord.id}" style="padding:8px 12px; border-radius:10px; background:rgba(239,68,68,0.15); color:#fca5a5; border:1px solid #7f1d1d; font-size:12px; cursor:pointer;">
            🗑
          </button>
        </div>
      `
      }
    </div>
  `;
}

function bindOrderCardEvents(orders) {
  const container = document.getElementById("orders-container");
  if (!container) return;

  container.querySelectorAll("button[data-action]").forEach((btn) => {
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
        // לחיצה על ה-V מעבירה לתיקיית "הוכנו והוזמנו" במקום למחוק!
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