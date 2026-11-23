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
} from "./firebase.js?v=45";

let allReviews = [];
let currentAnnouncement = "";
let showPublicRating = false;
let unsubSettings = null;
let unsubReviews = null;

function getAverageRating() {
  if (allReviews.length === 0) return "0.0";
  const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  return (sum / allReviews.length).toFixed(1);
}

function startListeners() {
  if (unsubSettings) unsubSettings();
  if (unsubReviews) unsubReviews();

  unsubSettings = onSnapshot(
    doc(db, "config", "settings"),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        currentAnnouncement = data.announcement || "";
        showPublicRating = Boolean(data.showPublicRating);
        renderReviewsTab();
      }
    },
    (err) => {
      renderError(`שגיאה בטעינת הגדרות: ${err.message}`);
    }
  );

  unsubReviews = onSnapshot(
    collection(db, "reviews"),
    async (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      allReviews = list;
      renderReviewsTab();

      try {
        await setDoc(
          doc(db, "config", "settings"),
          {
            publicRatingAverage: getAverageRating(),
            publicRatingCount: allReviews.length,
          },
          { merge: true }
        );
      } catch (e) {
        // התעלמות משגיאת הרשאה זמנית
      }
    },
    (err) => {
      renderError(`שגיאה בטעינת משובים (${err.code}): ${err.message}`);
    }
  );
}

function renderError(msg) {
  const container = document.getElementById("tab-reviews");
  if (!container) return;
  container.innerHTML = `
    <div class="bg-red-950/70 border border-red-600 rounded-2xl p-5 text-red-200 text-sm font-bold text-center">
      ⚠️ ${msg}
    </div>
  `;
}

function renderReviewsTab() {
  const container = document.getElementById("tab-reviews");
  if (!container) return;

  const avg = getAverageRating();
  const publishedCount = allReviews.filter((r) => r.isPublished).length;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div>
            <h3 class="font-bold text-amber-400 text-base">⭐ פרסום דירוג הלקוחות באתר</h3>
            <p class="text-xs text-stone-400 mt-1">
              מציג ללקוחות בלובי את הציון הממוצע של כל המדרגים ואת התגובות שבחרת לפרסם.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800">
                <span class="text-amber-400 text-xl font-black">★ ${avg}</span>
                <span class="text-xs text-stone-400">מתוך 5 (${allReviews.length} דירוגים)</span>
              </div>
              <span class="text-xs px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-bold">
                📢 ${publishedCount} תגובות מפורסמות בלובי
              </span>
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
                ? "✅ הבאנר מפורסם כרגע ללקוחות (לחץ להסתרה)"
                : "🚀 פרסם דירוג ותגובות ללקוחות"
            }
          </button>
        </div>
      </div>

      <div class="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold text-white text-base">💬 משובים ודירוגים שהתקבלו (${allReviews.length})</h3>
          ${
            allReviews.length > 0
              ? `<button id="publish-all-reviews-btn" type="button"
                  class="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/40 text-xs font-black transition cursor-pointer">
                  ✨ פרסם את כל המשובים בלובי
                </button>`
              : ""
          }
        </div>

        ${
          allReviews.length === 0
            ? `<div class="text-center text-stone-400 text-sm py-8">עדיין לא התקבלו דירוגים מלקוחות ⭐</div>`
            : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                ${allReviews
                  .map((rev) => {
                    const stars = Number(rev.rating) || 5;
                    const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
                    const isPub = Boolean(rev.isPublished);
                    const dateStr = rev.createdAt
                      ? new Date(rev.createdAt).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    return `
                      <div class="bg-stone-950 border ${
                        isPub ? "border-emerald-500/60" : "border-stone-800"
                      } rounded-2xl p-4 flex flex-col justify-between gap-3">
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
                        <div class="flex items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
                          <button type="button" data-toggle-publish="${rev.id}" data-current="${isPub}"
                            class="flex-1 text-xs font-black py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
                              isPub
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-stone-950"
                            }">
                            ${isPub ? "✅ מפורסם בלובי (הסתר)" : "📢 פרסם תגובה בלובי"}
                          </button>
                          <button type="button" data-delete-review="${rev.id}"
                            class="text-[11px] text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-xl bg-red-950/40 cursor-pointer">
                            🗑 מחק
                          </button>
                        </div>
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

  document.getElementById("publish-all-reviews-btn")?.addEventListener("click", async () => {
    await Promise.all(
      allReviews.map((rev) => updateDoc(doc(db, "reviews", rev.id), { isPublished: true }))
    );
    await setDoc(
      doc(db, "config", "settings"),
      { showPublicRating: true, publicRatingAverage: avg, publicRatingCount: allReviews.length },
      { merge: true }
    );
  });

  container.querySelectorAll("button[data-toggle-publish]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-toggle-publish");
      const isCurrentlyPub = btn.getAttribute("data-current") === "true";
      if (!id) return;
      await updateDoc(doc(db, "reviews", id), { isPublished: !isCurrentlyPub });
      if (!isCurrentlyPub && !showPublicRating) {
        await setDoc(doc(db, "config", "settings"), { showPublicRating: true }, { merge: true });
      }
    });
  });

  container.querySelectorAll("button[data-delete-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-review");
      if (!id || !confirm("למחוק משוב זה?")) return;
      await deleteDoc(doc(db, "reviews", id));
    });
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    startListeners();
  }
});