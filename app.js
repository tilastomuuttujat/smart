/* ============================================================
   app.js – KORJATTU JA SYNKRONOITU (V5.1)
   Vastuu: 
   - Tilanhallinta ja EventBus-viestintä
   - Näkymänvaihdon välitys TextEnginelle
   - Analytiikka-agentin hallinta
============================================================ */

(function () {

  /* ===================== 0. EVENTBUS ===================== */
  window.EventBus = {
    emit(type, detail = {}) {
      document.dispatchEvent(new CustomEvent(type, { detail }));
    },
    on(type, handler) {
      document.addEventListener(type, e => handler(e.detail));
    }
  };

  /* ===================== 1. YHTEINEN TILA ===================== */
  window.AppState = {
    data: {
      chapters: [],
      ready: false,
      session: {
        startedAt: Date.now(),
        chaptersVisited: [],
        keywordHits: {}
      },
      reflection: {
        readerValues: { economy: 50, ethics: 50 },
        lastInsight: null,
        systemMode: "stable",
        history: { visitedKeywords: {}, chapterFocus: [], intensityScore: 0 }
      }
    },
    ui: {
      view: "narrative",
      activeChapterId: null,
      interactive: true,
      readingModeKnown: true
    }
  };

  /* ===================== 2. TILAN PALAUTUS ===================== */
  (function restoreState() {
    try {
      const savedMemory = localStorage.getItem("readerMemory");
      if (savedMemory) AppState.data.session = { ...AppState.data.session, ...JSON.parse(savedMemory) };
    } catch (e) {
      console.warn("AppState: Palautus epäonnistui.");
    }
  })();

  /* ===================== 3. REFLEKTIOMIDDLEWARE ===================== */
  AppState.updateReflection = function (payload = {}) {
    const r = this.data.reflection;

    if (payload.readerValues) r.readerValues = { ...r.readerValues, ...payload.readerValues };
    if (payload.lastInsight) {
        r.lastInsight = payload.lastInsight;
        r.history.visitedKeywords[payload.lastInsight] = (r.history.visitedKeywords[payload.lastInsight] || 0) + 1;
        AppState.data.session.keywordHits[payload.lastInsight] = (AppState.data.session.keywordHits[payload.lastInsight] || 0) + 1;
    }

    const { economy, ethics } = r.readerValues;
    r.systemMode = Math.abs(economy - ethics) > 40 ? "tension" : "stable";

    window.EventBus.emit("reflection:update", { reflection: r, chapterId: this.ui.activeChapterId });
    window.EventBus.emit("reflection:insightSaved", { 
        chapterId: this.ui.activeChapterId,
        values: r.readerValues
    });
  };

  /* ===================== 4. NÄKYMÄN JA LUVUN VAIHTO ===================== */

  // Tämä kuuntelee painikkeilta tulevaa viestiä
  window.EventBus.on("ui:viewChange", ({ view }) => {
    if (!view) return;
    
    console.log("App: Näkymän vaihto ->", view);
    AppState.ui.view = view;

    // Vaihdetaan body-luokka CSS-ohjausta varten
    document.body.className = document.body.className.replace(/view-\w+/, "");
    document.body.classList.add(`view-${view}`);

    // 🔑 KORJAUS: Kutsutaan TextEnginen oikeaa metodia (setView)
    if (window.TextEngine && typeof window.TextEngine.setView === "function") {
        window.TextEngine.setView(view); 
    }

    if (window.ModuleRegistry) window.ModuleRegistry.resolvePlacement(view);
    window.EventBus.emit("app:viewUpdated", { view, chapterId: AppState.ui.activeChapterId });
  });

  /* ===================== 5. BOOTSTRAP JA KÄYNNISTYS ===================== */
  async function bootstrap() {
    console.log("🚀 App: Käynnistetään bootstrap...");
    
    // Pakotetaan CSS-luokka
    document.body.classList.add("interactive-enabled");
    
    // Alustetaan TextEngine
    if (window.TextEngine) {
        await window.TextEngine.init();
        const chapters = window.TextEngine.getAllChapters();
        AppState.data.chapters = chapters || [];
        AppState.data.ready = true;
        AppState.ui.activeChapterId = window.TextEngine.getActiveChapterId();
    }

    // Analytiikka-agentin käynnistys
    if (window.BehaviorTracker) {
        window.BehaviorTracker.init();
    }

    // Kytketään HTML-painikkeet
    bindUIEvents();

    window.EventBus.emit("app:ready", {
      view: AppState.ui.view,
      chapterId: AppState.ui.activeChapterId,
      interactive: true
    });
  }

  /* ===================== 6. UI-KYTKENTÄ ===================== */
  function bindUIEvents() {
    // Kuunnellaan klikkauksia koko dokumentin tasolla (delegointi)
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-view]");
        if (btn) {
            const targetView = btn.getAttribute("data-view");
            window.EventBus.emit("ui:viewChange", { view: targetView });
            
            // Päivitetään painikkeiden aktiivinen tila
            document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        }
    });
  }

  /* ===================== 7. LOPETUS JA DATAN LÄHETYS ===================== */
  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem("readerMemory", JSON.stringify(AppState.data.session));
    } catch (e) {}

    if (window.BehaviorTracker) {
        window.BehaviorTracker.dispatchData();
    }
  });

  // Init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();