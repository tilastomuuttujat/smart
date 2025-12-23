/* ============================================================
   ui-bindings.js – VAKAA YHDISTETTY NÄKYMÄOHJAUS (KORJATTU)
   - Käyttää globaalia EventBusia viestintään
   - Etsii elementit vasta init-vaiheessa (varmistaa löytymisen)
============================================================ */

(function () {
  // Muuttujat elementeille (alustetaan initissä)
  let BODY, VIEW_BUTTONS, PREV_BTN, NEXT_BTN, TOC_EDGE_BTN, TEXT_AREA;
  let PANELS = {};
  let ALL_PANELS = [];

  /* ============================================================
     APUTOIMINNOT
  ============================================================ */

  function setActiveViewButton(view) {
    VIEW_BUTTONS.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function hideAllContextPanels() {
    ALL_PANELS.forEach(p => { if(p) p.style.display = "none"; });
  }

  function showContextPanel(view) {
    const panel = PANELS[view];
    if (panel) panel.style.display = "flex";
  }

  function requestViewChange(view) {
    if (!["narrative", "analysis", "reflection"].includes(view)) return;
    console.log(`🚀 UI: Pyydetään näkymää: ${view}`);
    // Käytetään ikkunatason EventBusia
    window.EventBus?.emit("ui:viewChange", { view });
  }

  /* ============================================================
     ALUSTUS – KUTSUTAAN KUN DOM ON VALMIS
  ============================================================ */

  function init() {
    console.log("🎮 UIBindings: Alustetaan kytkennät...");

    // 1. Etsitään elementit (nyt ne ovat varmasti DOMissa)
    BODY = document.body;
    VIEW_BUTTONS = document.querySelectorAll(".view-btn");
    PREV_BTN = document.getElementById("prevBtn");
    NEXT_BTN = document.getElementById("nextBtn");
    TOC_EDGE_BTN = document.getElementById("tocEdgeToggle");
    TEXT_AREA = document.getElementById("textArea");

    PANELS = {
      narrative: document.getElementById("tocPanel"),
      analysis: document.getElementById("analysisPanel"),
      reflection: document.getElementById("reflectionPanel")
    };
    ALL_PANELS = Object.values(PANELS).filter(Boolean);

    // 2. Tapahtumakuuntelijat (Näkymän vaihto)
    VIEW_BUTTONS.forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        requestViewChange(btn.dataset.view);
      });
    });
    
      /* SISÄLLYSLUETTELON PAINIKE */
  
  const tocEdgeToggle = document.getElementById("tocEdgeToggle");

tocEdgeToggle.addEventListener("click", () => {
  document.body.classList.toggle("hide-toc");
});

    // 3. Navigointi
    PREV_BTN?.addEventListener("click", e => {
      e.preventDefault();
      window.TextEngine?.prevChapter?.();
    });

    NEXT_BTN?.addEventListener("click", e => {
      e.preventDefault();
      window.TextEngine?.nextChapter?.();
    });

    // 4. Sisällysluettelon toggle
    TOC_EDGE_BTN?.addEventListener("click", () => {
      BODY.classList.toggle("hide-toc");
    });

    // 5. REAKTIIVINEN PÄIVITYS (EventBus-kuuntelija)
    // Tämä varmistaa, että kun app.js vaihtaa näkymää, UI päivittyy
    window.EventBus?.on("app:viewUpdated", ({ view }) => {
      console.log(`📱 UI-päivitys: ${view}`);
      setActiveViewButton(view);
      hideAllContextPanels();
      showContextPanel(view);

      if (view === "narrative") {
        window.TextEngine?.scrollToActive?.();
      } else if (TEXT_AREA) {
        TEXT_AREA.scrollTop = 0;
      }
    });

    // Asetetaan alkutila
    const currentView = BODY.classList.contains("view-analysis") ? "analysis" : 
                       BODY.classList.contains("view-reflection") ? "reflection" : "narrative";
    
    setActiveViewButton(currentView);
    hideAllContextPanels();
    showContextPanel(currentView);
  }

  // Julkaistaan globaalisti
  window.UI = { init };

})();

// Käynnistetään kun kaikki skriptit ja DOM on ladattu
window.addEventListener("load", () => {
  if (window.UI && typeof window.UI.init === "function") {
    window.UI.init();
  }
});