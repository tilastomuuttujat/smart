/* ============================================================
   ui-bindings.js – VAKAA YHDISTETTY NÄKYMÄOHJAUS
   - Ei riko olemassa olevaa
   - Tukee sidePanel + vanha TOC-malli
   - Layout ei muutu, vain sisältö
============================================================ */

(function () {

  const BODY = document.body;

  const VIEW_BUTTONS = document.querySelectorAll(".view-btn");
  const PREV_BTN = document.getElementById("prevBtn");
  const NEXT_BTN = document.getElementById("nextBtn");
  const TOC_EDGE_BTN = document.getElementById("tocEdgeToggle");
  const TOC_TOP_BTN = document.getElementById("tocToggleBtn");
  const TEXT_AREA = document.getElementById("textArea");

  /* ===== OIKEA PANEELI (jos olemassa) ===== */
  const PANELS = {
    narrative: document.getElementById("tocPanel"),
    analysis: document.getElementById("analysisPanel"),
    reflection: document.getElementById("reflectionPanel")
  };

  const ALL_PANELS = Object.values(PANELS).filter(Boolean);

  let CURRENT_VIEW = "narrative";

  /* ============================================================
     APUTOIMINNOT
  ============================================================ */

  function setBodyViewClass(view) {
    BODY.classList.remove("view-narrative", "view-analysis", "view-reflection");
    BODY.classList.add(`view-${view}`);
  }

  function setActiveViewButton(view) {
    VIEW_BUTTONS.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function hideAllContextPanels() {
    ALL_PANELS.forEach(p => p.style.display = "none");
  }

  function showContextPanel(view) {
    const panel = PANELS[view];
    if (panel) panel.style.display = "flex";
  }

  function notifyTextEngine(view) {
    if (window.TextEngine && typeof window.TextEngine.setView === "function") {
      window.TextEngine.setView(view);
    }
  }

  function notifyPanelMode(view) {
    let mode = "narrative";
    if (view === "analysis") mode = "analysis";
    if (view === "reflection") mode = "reflection";

    document.dispatchEvent(
      new CustomEvent("panelModeChange", {
        detail: { mode }
      })
    );
  }

  function resetScroll() {
    if (TEXT_AREA) TEXT_AREA.scrollTop = 0;
  }

  /* ============================================================
     NÄKYMÄN VAIHTO
  ============================================================ */

  /**
   * Vaihtaa sovelluksen pääasiallista näkymää (Narratiivi / Analyysi / Reflektio).
   * Varmistaa, että aktiivinen luku pysyy synkronoituna näkymien välillä.
   */
  function setView(view) {
    if (!["narrative", "analysis", "reflection"].includes(view)) return;
    if (view === CURRENT_VIEW) return;

    CURRENT_VIEW = view;

    // 1. Päivitetään visuaaliset luokat ja painikkeet
    setBodyViewClass(view);
    setActiveViewButton(view);

    // 2. TOC-paneelin hallinta: näkyvissä vain narratiivissa
    if (view === "narrative") {
      BODY.classList.remove("hide-toc");
    } else {
      BODY.classList.add("hide-toc");
    }

    // 3. Kontekstipaneelien (oikea reuna) vaihto
    if (ALL_PANELS.length) {
      hideAllContextPanels();
      showContextPanel(view);
    }

    // 4. Ilmoitetaan TextEnginelle näkymän muutoksesta
    if (window.TextEngine && typeof window.TextEngine.setView === "function") {
      window.TextEngine.setView(view);
      
      // 🔑 SYNKRONOINTI: Jos palataan narratiiviin, varmistetaan skrollaus oikeaan kohtaan
      if (view === "narrative") {
        window.TextEngine.scrollToActive();
      }
    }

    // 5. Ilmoitetaan moduuleille (kuten Starfield) uusi tila
    notifyPanelMode(view);
    
    // 6. Nollataan skrollaus (analyysi/reflektio alkavat ylhäältä)
    resetScroll();
  }
  
  /* SISÄLLYSLUETTELON PAINIKE */
  
  const tocEdgeToggle = document.getElementById("tocEdgeToggle");

tocEdgeToggle.addEventListener("click", () => {
  document.body.classList.toggle("hide-toc");
});

  /* ============================================================
     NAPIT
  ============================================================ */

  VIEW_BUTTONS.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      setView(btn.dataset.view);
    });
  });

  if (PREV_BTN) {
    PREV_BTN.addEventListener("click", e => {
      e.preventDefault();
      window.TextEngine?.prevChapter();
    });
  }

  if (NEXT_BTN) {
    NEXT_BTN.addEventListener("click", e => {
      e.preventDefault();
      window.TextEngine?.nextChapter();
    });
  }

  /* ---- TOC-reunapainike: vain narratiivissa ---- */
  if (TOC_EDGE_BTN) {
    TOC_EDGE_BTN.addEventListener("click", () => {
      if (BODY.classList.contains("view-narrative")) {
        BODY.classList.toggle("hide-toc");
      }
    });
  }

  /* ---- TOC-yläpalkin nappi (jos olemassa) ---- */
  if (TOC_TOP_BTN) {
    TOC_TOP_BTN.addEventListener("click", e => {
      e.preventDefault();
      if (!BODY.classList.contains("view-narrative")) return;

      const hidden = BODY.classList.toggle("hide-toc");
      TOC_TOP_BTN.textContent = hidden
        ? "Näytä sisällysluettelo"
        : "Piilota sisällysluettelo";
    });
  }

  /* ============================================================
     ALUSTUS
  ============================================================ */

  function init() {
    /* varmista oletusnäkymä */
    setActiveViewButton("narrative");
    setBodyViewClass("narrative");

    if (ALL_PANELS.length) {
      hideAllContextPanels();
      showContextPanel("narrative");
    }

    notifyTextEngine("narrative");
    notifyPanelMode("narrative");
  }

  window.UI = { init };

  document.addEventListener("DOMContentLoaded", init);

})();
