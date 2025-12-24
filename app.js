/* ============================================================
   app.js – SYNKRONOITU KOGNITIIVINEN OHJAIN (V8.2)
   Vastuu:
   - Keskitetty EventBus ja AppState (Sisältää update-metodit)
   - Lukutilan orkestrointi ja TOC-tila
   - KORJAUS: Lisätty updateReflection-metodi agentteja varten
============================================================ */

(function () {

  /* ===================== 0. EVENTBUS ===================== */
  if (!window.EventBus) {
    window.EventBus = {
      emit(type, detail = {}) {
        document.dispatchEvent(new CustomEvent(type, { detail }));
      },
      on(type, handler) {
        document.addEventListener(type, e => handler(e.detail));
      }
    };
  }

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
        history: {
          visitedKeywords: {},
          chapterFocus: [],
          intensityScore: 0
        }
      },
      reading: {
        chapterId: null,
        paragraphIndex: 0,
        scrollEnergy: 0
      }
    },
    ui: {
      view: "narrative",
      activeChapterId: null
    },

    /* 🧠 AGENTTI-METODIT: Mahdollistavat moduulien välisen tilanpäivityksen */
    
    updateReflection(update) {
      if (!update) return;
      
      // Päivitetään arvot (esim. liukusäätimet)
      if (update.readerValues) {
        this.data.reflection.readerValues = {
          ...this.data.reflection.readerValues,
          ...update.readerValues
        };
      }
      
      // Päivitetään tila (esim. 'tension' tai 'stable')
      if (update.systemMode) this.data.reflection.systemMode = update.systemMode;
      
      // Ilmoitetaan muutos muille (esim. Starfield kuuntelee tätä)
      window.EventBus.emit("state:reflectionUpdated", this.data.reflection);
    }
  };

  /* ===================== 2. LUKUTILAN SYNKRONOINTI ===================== */

  EventBus.on("readingStateChanged", (state) => {
    if (!state) return;

    AppState.data.reading = {
      chapterId: state.chapterId ?? AppState.data.reading.chapterId,
      paragraphIndex: state.paragraphIndex ?? 0,
      scrollEnergy: state.scrollEnergy ?? 0
    };

    AppState.data.reflection.history.intensityScore = Math.min(
      100,
      AppState.data.reflection.history.intensityScore + state.scrollEnergy * 2
    );
  });

  /* ===================== 3. LUVUN VAIHTO ===================== */

  document.addEventListener("chapterChange", (e) => {
    const chapterId = e.detail?.chapterId;
    if (!chapterId) return;

    AppState.ui.activeChapterId = chapterId;
    AppState.data.reading.chapterId = chapterId;

    if (!AppState.data.session.chaptersVisited.includes(chapterId)) {
      AppState.data.session.chaptersVisited.push(chapterId);
    }
  });

  /* ===================== 4. NÄKYMÄN VAIHTO (VAKAUTETTU) ===================== */

  EventBus.on("ui:viewChange", ({ view }) => {
    if (!view || view === AppState.ui.view) return;
    
    console.log("🔄 Vaihdetaan näkymää:", view);
    AppState.ui.view = view;

    /* 1. Body-luokat */
    document.body.classList.remove("view-narrative", "view-analysis", "view-reflection");
    document.body.classList.add(`view-${view}`);

    /* 2. Moduulipalkin hallinta */
    const moduleColumn = document.getElementById("moduleColumn");
    if (moduleColumn) {
        moduleColumn.style.display = (view === "narrative") ? "none" : "block";
    }

    /* 3. Moduulien sijoittelu Registryn kautta */
    if (window.ModuleRegistry) {
        window.ModuleRegistry.resolvePlacement(view);
    }
    
    if (window.TextEngine?.setView) {
        window.TextEngine.setView(view);
    }

    EventBus.emit("app:viewUpdated", { view, chapterId: AppState.ui.activeChapterId });
  });

  /* ===================== 5. BOOTSTRAP ===================== */

  async function bootstrap() {
    console.log("🚀 App: Kognitiivinen tila käynnistyy");

    if (window.TextEngine) {
      try {
        await window.TextEngine.init();
        AppState.data.chapters = window.TextEngine.getAllChapters() || [];
        AppState.ui.activeChapterId = window.TextEngine.getActiveChapterId();
        AppState.data.reading.chapterId = AppState.ui.activeChapterId;
      } catch (e) {
        console.error("❌ App: TextEngine init epäonnistui", e);
      }
    }

    // Herätetään seuranta
    window.BehaviorTracker?.init();

    bindUIEvents();
    initTOCLogic();

    /* Alkunäkymä - pakotetaan resolvePlacement ekalla kerralla */
    AppState.data.ready = true;
    window.ModuleRegistry?.resolvePlacement(AppState.ui.view);
  }

  /* ===================== 6. UI-SIDONNAT ===================== */

  function bindUIEvents() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;

      EventBus.emit("ui:viewChange", { view: btn.dataset.view });

      document
        .querySelectorAll("[data-view]")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  }

  /* ===================== 7. TOC-LOGIIKKA ===================== */

  function initTOCLogic() {
    const body = document.body;
    const edgeBtn = document.getElementById("tocEdgeToggle");
    const textArea = document.getElementById("textArea");

    if (!edgeBtn) return;

    edgeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      body.classList.toggle("toc-open");

      edgeBtn.textContent = body.classList.contains("toc-open")
        ? "SULJE"
        : "SISÄLLYS";
    });

    if (textArea) {
      textArea.addEventListener("click", () => {
        if (body.classList.contains("toc-open")) {
          body.classList.remove("toc-open");
          edgeBtn.textContent = "SISÄLLYS";
        }
      });
    }
  }

  /* ===================== 8. PERSISTENSSI ===================== */

  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem(
        "readerMemory",
        JSON.stringify(AppState.data.session)
      );
    } catch (_) {}

    window.BehaviorTracker?.dispatchData();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();