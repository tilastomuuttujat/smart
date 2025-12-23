/* ============================================================
   framework-engine.js – DYNAAMINEN TILAOHJAAJA
   Vastuu: 
   - Tulkintakehysten hallinta
   - Analyysimoodien synkronointi (Kuvaile/Tulkitse/Hypotesoi)
   - Tila-ilmoitusten lähetys ModuleRegistrylle
   ============================================================ */

const FrameworkEngine = (() => {

  let frameworks = [];
  let activeFramework = null;
  let activeMode = null;
  let activeChapterId = null;

  const subscribers = new Set();

  /* ===================== LATAUS ===================== */

  async function loadFrameworks(url = "frameworks.json") {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      frameworks = Array.isArray(json.core_frameworks) ? json.core_frameworks : [];
      return frameworks;
    } catch (e) {
      console.error("FrameworkEngine: Latausvirhe", e);
      return [];
    }
  }

  /* ===================== AKTIVOINTI ===================== */

  function activateFramework(id) {
    const fw = frameworks.find(f => f.id === id);
    if (!fw) return null;

    activeFramework = { ...fw };
    activeMode = activeFramework.modes?.[0] || null;

    // Päivitetään DOM-tila
    document.body.dataset.framework = activeFramework.id;
    if (activeMode) document.body.dataset.mode = activeMode;

    // 🧠 SYNKRONOINTI MODUULIEN KANSSA
    // Ilmoitetaan ModuleRegistrylle, että moduulien sallittu joukko on muuttunut
    if (window.ModuleRegistry) {
      window.ModuleRegistry.syncWithFramework({
        framework: activeFramework,
        mode: activeMode
      });
    }

    applyTextFocus();
    notify();

    return activeFramework;
  }

  function setMode(mode) {
    if (!activeFramework || !activeFramework.modes?.includes(mode)) return;

    activeMode = mode;
    document.body.dataset.mode = mode;

    // 🧠 PÄIVITETÄÄN AGENTIT
    // Esim. AnatomyModule reagoi tähän vaihtamalla teeseistä hypoteeseihin
    if (window.ModuleRegistry) {
        // Lähetetään tieto kaikille aktiivisille moduuleille
        window.ModuleRegistry.list().forEach(mod => {
            if (mod.active && typeof mod.onModeChange === "function") {
                mod.onModeChange(activeMode, activeFramework);
            }
        });
    }

    applyTextFocus();
    notify();
  }

  /* ===================== TEKSTIN PAINOTUS ===================== */

  function applyTextFocus() {
    if (!activeFramework || !activeMode) return;

    const allowedClasses = activeFramework.textMap?.[activeMode] || [];
    const paragraphs = document.querySelectorAll("#textArea p");

    if (!allowedClasses.length) {
      document.body.classList.remove("focus");
      paragraphs.forEach(p => {
        p.style.opacity = "";
        p.style.filter = "";
        p.classList.remove("fw-active");
      });
      return;
    }

    document.body.classList.add("focus");
    paragraphs.forEach(p => {
      const isActive = allowedClasses.some(cls => p.classList.contains(cls));
      p.style.opacity = isActive ? "1" : "0.25";
      p.style.filter = isActive ? "none" : "grayscale(40%)";
      p.classList.toggle("fw-active", isActive);
    });
  }

  /* ===================== TILAUKSET & ILMOITUKSET ===================== */

  function subscribe(fn) {
    if (typeof fn === "function") subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function notify() {
    const state = {
        framework: activeFramework,
        mode: activeMode,
        chapterId: activeChapterId
    };
    subscribers.forEach(fn => fn(state));
  }

  return {
    loadFrameworks,
    activateFramework,
    setMode,
    getFrameworks: () => frameworks,
    getActiveFramework: () => activeFramework,
    getActiveMode: () => activeMode,
    subscribe
  };

})();

window.FrameworkEngine = FrameworkEngine;