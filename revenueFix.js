import { db, collection, onSnapshot } from "./firebase.js";

onSnapshot(collection(db, "orders"), (snapshot) => {
  const container = document.getElementById("revenue-container");
  if (!container) return;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // \u05d7\u05d9\u05e9\u05d5\u05d1 \u05ea\u05d7\u05d9\u05dc\u05ea \u05e9\u05d1\u05d5\u05e2 (\u05d9\u05d5\u05dd \u05e8\u05d0\u05e9\u05d5\u05df)
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekStartStr = startOfWeek.toISOString().split("T")[0];

  // \u05d7\u05d9\u05e9\u05d5\u05d1 \u05ea\u05d7\u05d9\u05dc\u05ea \u05d7\u05d5\u05d3\u05e9
  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM

  let todaySum = 0;
  let todayCount = 0;
  let weekSum = 0;
  let monthSum = 0;

  snapshot.docs.forEach((docSnap) => {
    const order = docSnap.data();
    if (order.status === "canceled_by_admin" || order.status === "canceled") return;

    const price = Number(order.totalPrice) || 0;
    const dateStr = order.date || "";

    if (dateStr === todayStr) {
      todaySum += price;
      todayCount++;
    }
    if (dateStr >= weekStartStr && dateStr <= todayStr) {
      weekSum += price;
    }
    if (dateStr.startsWith(monthPrefix)) {
      monthSum += price;
    }
  });

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow">
        <div class="text-xs text-stone-400 mb-1">\ud83d\udcb0 \u05d4\u05db\u05e0\u05e1\u05d5\u05ea \u05d4\u05d9\u05d5\u05dd (${todayCount} \u05d4\u05d6\u05de\u05e0\u05d5\u05ea)</div>
        <div class="text-2xl font-black text-amber-400">\u20aa${todaySum.toLocaleString()}</div>
      </div>
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow">
        <div class="text-xs text-stone-400 mb-1">\ud83d\udcc5 \u05d4\u05db\u05e0\u05e1\u05d5\u05ea \u05d4\u05e9\u05d1\u05d5\u05e2 (\u05d0'-\u05e9')</div>
        <div class="text-2xl font-black text-emerald-400">\u20aa${weekSum.toLocaleString()}</div>
      </div>
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow">
        <div class="text-xs text-stone-400 mb-1">\ud83d\udcc8 \u05d4\u05db\u05e0\u05e1\u05d5\u05ea \u05d4\u05d7\u05d5\u05d3\u05e9</div>
        <div class="text-2xl font-black text-white">\u20aa${monthSum.toLocaleString()}</div>
      </div>
    </div>
  `;
});