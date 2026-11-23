import { db } from "./firebase.js";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allReviews = [];
let currentAnnouncement = "";
let showPublicRating = false;

function initAdminReviews() {
  const container = document.getElementById("tab-reviews");
  if (!container) return;

  onSnapshot(doc(db, "config", "settings"), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      currentAnnouncement = data.announcement || "";
      showPublicRating = Boolean(data.showPublicRating);
      renderReviewsTab();
    }
  });

  onSnapshot(collection(db, "reviews"), async (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    allReviews = list;
    renderReviewsTab();

    // מסנכרן אוטומטית את הממוצע והכמות למסמך ההגדרות בזמן אמת
    await setDoc(
      doc(db, "config", "settings"),
      {
        publicRatingAverage: getAverageRating(),
        publicRatingCount: allReviews.length,
      },
      { merge: true }
    );
  });

function getAverageRating() {
  if (allReviews.length === 0) return "0.0";
  const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  return (sum / allReviews.length).toFixed(1);
}

function renderReviewsTab() {
  const container = document.getElementById("tab-reviews");
  if (!container) return;

  const avg = getAverageRating();

  container.innerHTML = `
    <div class="space-y-6">
      <!-- כרטיס ניהול פרסום הודעה ודירוג ללקוחות -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- פרסום הודעה רצה ללקוחות -->
        <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
          <h3 class="font-bold text-amber-400 text-base">📢 פרסום הודעה בראש אתר הלקוחות</h3>
          <p class="text-xs text-stone-400">ההודעה תופיע בבאנר בולט בראש המסך של כל הלקוחות בזמן אמת.</p>
          <input id="admin-announcement-input" type="text" placeholder="לדוגמה: היום מאפים חמים מהתנור עד 14:00!" value="${currentAnnouncement.replace(/"/g, "&quot;")}"
            class="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" />
          <div class="flex gap-2">
            <button id="publish-announcement-btn" type="button"
              class="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-2.5 rounded-xl text-xs cursor-pointer">
              📢 פרסם הודעה
            </button>
            ${
              currentAnnouncement
                ? `<button id="clear-announcement-btn" type="button"
                    class="px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 font-bold text-xs cursor-pointer">
                    הסר הודעה
                  </button>`
                : ""
            }
          </div>
        </div>

        <!-- פרסום דירוג ממוצע של כולם ללקוחות -->
        <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div>
            <h3 class="font-bold text-amber-400 text-base">⭐ פרסום דירוג הלקוחות באתר</h3>
            <p class="text-xs text-stone-400 mt-1">
              מציג ללקוחות בלובי את הציון הממוצע של כל המדרגים ואת הביקורות האחרונות.
            </p>
            <div class="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800">
              <span class="text-amber-400 text-xl font-black">★ ${avg}</span>
              <span class="text-xs text-stone-400">מתוך 5 (${allReviews.length} דירוגים)</span>
            </div>
          </div>

          <button id="toggle-public-rating-btn" type="button"
            class="w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              showPublicRating
                ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950"
                : "bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-amber-400 border border-amber-500/40"
            }">
            ${
              showPublicRating
                ? "✅ הדירוג מפורסם כרגע ללקוחות (לחץ להסתרה)"
                : "🚀 פרסם דירוג ממוצע ללקוחות"
            }
          </button>
        </div>
      </div>

      <!-- רשימת כל המשובים שהתקבלו -->
      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-white text-base">💬 משובים ודירוגים שהתקבלו (${allReviews.length})</h3>
        </div>

        ${
          allReviews.length === 0
            ? `<div class="text-center text-stone-400 text-sm py-8">עדיין לא התקבלו דירוגים מלקוחות ⭐</div>`
            : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                ${allReviews
                  .map((rev) => {
                    const stars = Number(rev.rating) || 5;
                    const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
                    const dateStr = rev.createdAt
                      ? new Date(rev.createdAt).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    return `
                      <div class="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between gap-2">
                        <div>
                          <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-sm text-white">${rev.firstName || "לקוח"} ${rev.lastName || ""}</span>
                            <span class="text-amber-400 text-sm tracking-wider">${starsStr}</span>
                          </div>
                          <div class="text-[11px] text-stone-500 mt-0.5">${dateStr}</div>
                          ${
                            rev.comment
                              ? `<p class="text-xs text-stone-300 mt-2 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800/70">"${rev.comment}"</p>`
                              : `<p class="text-[11px] text-stone-500 mt-2 italic">ללא הערה כתובה</p>`
                          }
                        </div>
                        <button type="button" data-delete-review="${rev.id}"
                          class="self-end text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/40 cursor-pointer">
                          🗑 מחק משוב
                        </button>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
        }
      </div>
    </div>
  `;

  document.getElementById("publish-announcement-btn")?.addEventListener("click", async () => {
    const val = document.getElementById("admin-announcement-input")?.value.trim() || "";
    await setDoc(doc(db, "config", "settings"), { announcement: val }, { merge: true });
    alert(val ? "ההודעה פורסמה מיד אצל כל הלקוחות!" : "ההודעה הוסרה.");
  });

  document.getElementById("clear-announcement-btn")?.addEventListener("click", async () => {
    await setDoc(doc(db, "config", "settings"), { announcement: "" }, { merge: true });
  });

  document.getElementById("toggle-public-rating-btn")?.addEventListener("click", async () => {
    const nextState = !showPublicRating;
    await setDoc(
      doc(db, "config", "settings"),
      {
        showPublicRating: nextState,
        publicRatingAverage: avg,
        publicRatingCount: allReviews.length,
      },
      { merge: true }
    );
  });

  container.querySelectorAll("button[data-delete-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-review");
      if (!id || !confirm("למחוק משוב זה?")) return;
      await deleteDoc(doc(db, "reviews", id));
	  const remaining = allReviews.filter((r) => r.id !== id);
const nextCount = remaining.length;
const nextAvg =
  nextCount > 0
    ? (remaining.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / nextCount).toFixed(1)
    : "0.0";
await setDoc(
  doc(db, "config", "settings"),
  {
    publicRatingAverage: nextAvg,
    publicRatingCount: nextCount,
  },
  { merge: true }
);
    });
  });
}

initAdminReviews();