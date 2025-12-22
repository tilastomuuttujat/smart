/* ============================================================
   framework-engine.js – KORJATTU JA YHTEENSOPIVA
   Vastuu:
   - Lataa tulkintakehykset (frameworks.json)
   - Hallitsee aktiivista kehystä ja moodia
   - Synkronoi tekstin, paneelit ja moduulit
============================================================ */

const FrameworkEngine = (() => {

  /* ===================== SISÄINEN TILA ===================== */

  let frameworks = [];
  let activeFramework = null;
  let activeMode = null;
  let activeChapterId = null;

  const subscribers = new Set();

  /* ===================== LATAUS ===================== */

  async function loadFrameworks(url = "frameworks.json") {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`FrameworkEngine: HTTP ${res.status} (${url})`);
    }

    const json = await res.json();

    frameworks = Array.isArray(json.core_frameworks)
      ? json.core_frameworks
      : [];

    if (!frameworks.length) {
      console.warn("FrameworkEngine: core_frameworks tyhjä");
    }

    return frameworks;
  }

  /* ===================== AKTIVOINTI ===================== */

  function activateFramework(id) {
    const fw = frameworks.find(f => f.id === id);
    if (!fw) {
      console.warn(`FrameworkEngine: kehystä ei löydy: ${id}`);
      return null;
    }

    // 🔑 KRITTIINEN: säilytetään KOKO framework-olio (ml. modules)
    activeFramework = { ...fw };

    activeMode = activeFramework.modes?.[0] || null;

    document.body.dataset.framework = activeFramework.id;
    if (activeMode) {
      document.body.dataset.mode = activeMode;
    }

    applyTextFocus();
    notify();

    return activeFramework;
  }

  function setMode(mode) {
    if (!activeFramework) return;
    if (!activeFramework.modes?.includes(mode)) return;

    activeMode = mode;
    document.body.dataset.mode = mode;

    applyTextFocus();
    notify();
  }

  /* ===================== TEKSTIN PAINOTUS ===================== */

  function applyTextFocus() {
    if (!activeFramework || !activeMode) return;

    const allowedClasses =
      activeFramework.textMap?.[activeMode] || [];

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
      const isActive = allowedClasses.some(cls =>
        p.classList.contains(cls)
      );

      p.style.opacity = isActive ? "1" : "0.25";
      p.style.filter = isActive ? "none" : "grayscale(40%)";
      p.classList.toggle("fw-active", isActive);
    });
  }

  /* ===================== MODUULIT ===================== */

  function isModuleEnabled(moduleId) {
    return !!activeFramework?.modules?.includes(moduleId);
  }

  /* ===================== GETTERIT ===================== */

  function getFrameworks() {
    return frameworks;
  }

  function getActiveFramework() {
    return activeFramework;
  }

  function getActiveMode() {
    return activeMode;
  }

  function getActiveChapter() {
    return activeChapterId;
  }

  /* ===================== TILAUKSET ===================== */

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function notify() {
    subscribers.forEach(fn => {
      try {
        fn({
          framework: activeFramework,
          mode: activeMode,
          chapterId: activeChapterId
        });
      } catch (e) {
        console.error("FrameworkEngine subscriber error", e);
      }
    });
  }

  /* ===================== JULKINEN API ===================== */

  return {
    loadFrameworks,
    activateFramework,
    setMode,

    getFrameworks,
    getActiveFramework,
    getActiveMode,
    getActiveChapter,

    isModuleEnabled,
    subscribe
  };

})();
