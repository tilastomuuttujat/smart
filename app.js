/* ============================================================
   app.js – SYNKRONOITU KOGNITIIVINEN OHJAIN (V8.1)
   Vastuu:
   - Keskitetty EventBus ja AppState
   - Lukutilan orkestrointi
   - Näkymien ja paneelien deterministinen hallinta
   - TOC-tilan yksiselitteinen ohjaus (ei päällekkäisyyksiä)
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

/* app.js – Kohta 4: NÄKYMÄN VAIHTO (VAKAUTETTU) */
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

    /* 3. Varmistetaan data ennen moduulien sijoittelua */
    if (window.AppState?.data?.ready) {
        window.ModuleRegistry?.resolvePlacement(view);
        window.TextEngine?.setView(view);
    } else {
        console.warn("⏳ App: Data ei valmiina, odotetaan textEngineReady-tapahtumaa...");
    }

    EventBus.emit("app:viewUpdated", { view, chapterId: AppState.ui.activeChapterId });
});
  /* ===================== 5. BOOTSTRAP ===================== */

  async function bootstrap() {
    console.log("🚀 App: Kognitiivinen tila käynnistyy");

    if (window.TextEngine) {
      await window.TextEngine.init();
      AppState.data.chapters = window.TextEngine.getAllChapters() || [];
      AppState.ui.activeChapterId = window.TextEngine.getActiveChapterId();
      AppState.data.reading.chapterId = AppState.ui.activeChapterId;
    }

    window.BehaviorTracker?.init();

    bindUIEvents();
    initTOCLogic();

    /* Alkunäkymä */
    EventBus.emit("ui:viewChange", { view: AppState.ui.view });

    AppState.data.ready = true;
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

  /* ===================== 7. TOC-LOGIIKKA (AINOA PAIKKA) ===================== */

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
