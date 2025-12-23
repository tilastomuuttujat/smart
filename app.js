/* ============================================================
   app.js – TESTIJAKSO-VERSIO (V5)
   Vastuu: 
   - Vuorovaikutteinen tila pakotettu päälle
   - Tilanhallinta ja tapahtumaväylä
   - Google Sheets -datansiirto
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
      // 🚀 TESTIJAKSO: Pakotetaan vuorovaikutteisuus päälle
      interactive: true,
      readingModeKnown: true
    }
  };

  /* ===================== 2. TILAN PALAUTUS ===================== */
  (function restoreState() {
    try {
      const savedMemory = localStorage.getItem("readerMemory");
      if (savedMemory) AppState.data.session = { ...AppState.data.session, ...JSON.parse(savedMemory) };
      
      // Huom: Emme enää lue interactiveEnabled-arvoa, koska se on pakotettu
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
    const stats = r.history;

    if ((stats.visitedKeywords['kustannus'] || 0) > 5 && ethics > 70) {
        r.systemMode = "conflict";
    } else {
        r.systemMode = Math.abs(economy - ethics) > 40 ? "tension" : "stable";
    }

    EventBus.emit("reflection:update", { reflection: r, chapterId: this.ui.activeChapterId });
    EventBus.emit("reflection:insightSaved", { 
        chapterId: this.ui.activeChapterId,
        values: r.readerValues
    });
  };

  /* ===================== 4. NÄKYMÄN JA LUVUN VAIHTO ===================== */
  EventBus.on("ui:viewChange", ({ view }) => {
    if (AppState.ui.view === view) return;
    AppState.ui.view = view;

    document.body.className = document.body.className.replace(/view-\w+/, "");
    document.body.classList.add(`view-${view}`);

    if (window.ModuleRegistry) window.ModuleRegistry.resolvePlacement(view);
    EventBus.emit("app:viewUpdated", { view, chapterId: AppState.ui.activeChapterId });
  });

  EventBus.on("chapter:change", ({ chapterId }) => {
    if (AppState.ui.activeChapterId === chapterId) return;
    AppState.ui.activeChapterId = chapterId;

    const visited = AppState.data.session.chaptersVisited;
    if (!visited.includes(chapterId)) visited.push(chapterId);

    document.dispatchEvent(new CustomEvent("chapterChange", { detail: { chapterId } }));
    EventBus.emit("app:chapterUpdated", { chapterId, view: AppState.ui.view });
  });

  /* ===================== 5. BOOTSTRAP JA KÄYNNISTYS ===================== */
  async function bootstrap() {
    // 🚀 TESTIJAKSO: showReadingModeChooser on poistettu, mennään suoraan starttiin
    startApp();
  }

  async function startApp() {
    // Pakotetaan CSS-luokka heti
    document.body.classList.add("interactive-enabled");
    
    const chapters = await TextEngine.init();
    AppState.data.chapters = chapters || [];
    AppState.data.ready = true;
    AppState.ui.activeChapterId = chapters?.[0]?.id || null;

    // 📊 Analytiikka-agentin käynnistys
    if (window.ModuleRegistry) {
        const tracker = window.ModuleRegistry.get("tracker");
        if (tracker && typeof tracker.init === "function") tracker.init();
    }

    EventBus.emit("app:ready", {
      view: AppState.ui.view,
      chapterId: AppState.ui.activeChapterId,
      interactive: true
    });
  }

  /* ===================== 6. UI-VIHJEET ===================== */
  EventBus.on("reflection:update", ({ reflection }) => {
    const el = document.getElementById("readerMemoryHint");
    if (!el || !reflection.lastInsight) return;
    el.textContent = `Muistijälki: ${reflection.lastInsight}`;
    el.style.opacity = "0.7";
    setTimeout(() => el.style.opacity = "0", 3000);
  });

  /* ===================== 7. LOPETUS JA DATAN LÄHETYS ===================== */
  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem("readerMemory", JSON.stringify(AppState.data.session));
    } catch (e) {}

    const tracker = window.ModuleRegistry?.get("tracker");
    if (tracker && typeof tracker.dispatchData === "function") {
        tracker.dispatchData();
    }
  });

  // Init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();