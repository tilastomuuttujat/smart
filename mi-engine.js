/* ============================================================
   mi-engine.js
   Vastuu:
   - MI-relevanssilaskenta (α β γ δ)
   - Kehys- ja preset-riippuvainen painotus
   - Termikohtainen pisteytys
============================================================ */

const MIEngine = (() => {

  /* ===================== SISÄINEN TILA ===================== */

  let items = [];          
  let presets = {};        
  let activePresetId = null;
  let activeFramework = null;

  const subscribers = new Set();

  /* ===================== DATASETIT ===================== */

  function loadItems(data = []) {
    items = Array.isArray(data) ? data : [];
    notify();
  }

  /**
   * Ladataan presetit atomisesti. 
   * Varmistaa, ettei järjestelmä jää tilaan, jossa ID on mutta data puuttuu.
   */
  function loadPresets(presetData) {
    console.log("MIEngine: Ladataan presetit...", presetData);

    // 1. Puretaan uusi data heti
    const newPresets = presetData.core_presets || presetData || {};
    const keys = Object.keys(newPresets);

    // 2. Päivitetään kokoelma kerralla (estetään "undefined" välitila)
    presets = newPresets;

    // 3. Korjataan aktiivinen ID ennen ilmoitusta muille
    if (keys.length > 0) {
      // Jos vanhaa ID:tä ei ole uudessa setissä, otetaan ensimmäinen tarjolla oleva
      if (!activePresetId || !presets[activePresetId]) {
        activePresetId = keys[0];
        console.log("MIEngine: Aktiivinen preset synkronoitu ->", activePresetId);
      }
    } else {
      activePresetId = null;
    }

    notify();
  }

  /**
   * Turvallinen haku aktiiviselle datalle
   */
  function getActivePresetData() {
    if (!activePresetId || !presets[activePresetId]) {
      // Palautetaan neutraali fallback-objekti kaatumisen estämiseksi
      return { title: "Ei valintaa", focus: [], sdof: [], weights: { alpha: 0, beta: 0, gamma: 0, delta: 0 } };
    }
    return presets[activePresetId];
  }

  function setActivePreset(id) {
    if (!presets[id]) {
      console.warn(`MIEngine: Yritettiin asettaa puuttuva preset: ${id}`);
      return;
    }
    activePresetId = id;
    console.log("MIEngine: Aktiivinen preset asetettu:", id);
    notify();
  }

  /* ===================== KEHYSKYTKENTÄ ===================== */

  function onFrameworkChange({ framework }) {
    activeFramework = framework;
    notify();
  }

  /* ===================== LASKENTA ===================== */

  /**
   * Laskee yksittäisen termin relevanssipisteet.
   * Sisältää vikasietoisuuden puuttuville painotuksille.
   */
  function calculateScore(item) {
    const preset = presets[activePresetId];
    // Jos presetiä ei löydy, pisteet ovat 0
    if (!preset || !preset.weights) return 0;

    const { alpha = 0, beta = 0, gamma = 0, delta = 0 } = preset.weights;

    // Lasketaan painotettu summa (MI-relevanssi)
    return (
      alpha * (item.stats ?? 0) +
      beta  * (item.textPower ?? 0) +
      gamma * (item.embedding ?? 0) +
      delta * (item.miFit ?? 0)
    );
  }

  function getRankedItems() {
    // Jos itemeitä ei ole ladattu, palautetaan tyhjä
    if (!items.length) return [];

    return items
      .map(item => ({
        ...item,
        score: calculateScore(item)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /* ===================== KOHDISTUS ===================== */

  function focusTerm(term) {
    const item = items.find(i => i.term === term);
    if (!item) return;

    if (typeof TextEngine !== "undefined" && TextEngine.focusTerm) {
      TextEngine.focusTerm(term);
    }
    notify({ focused: item });
  }

  function clearFocus() {
    if (typeof TextEngine !== "undefined" && TextEngine.clearTermFocus) {
      TextEngine.clearTermFocus();
    }
    notify({ focused: null });
  }

  /* ===================== TAPAHTUMAJÄRJESTELMÄ ===================== */

  function subscribe(fn) {
    if (typeof fn === "function") {
      subscribers.add(fn);
      // Lähetetään heti nykyinen tila tilaajalle
      fn(getCurrentPayload());
    }
    return () => subscribers.delete(fn);
  }

  function getCurrentPayload(extra = {}) {
    return {
      framework: activeFramework,
      presets: presets, 
      activePresetId: activePresetId,
      items: getRankedItems(),
      ...extra
    };
  }

  function notify(extra = {}) {
    const payload = getCurrentPayload(extra);

    subscribers.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {
        console.error("MIEngine: Virhe tilaajan päivityksessä", e);
      }
    });
  }

  /* ===================== JULKINEN API ===================== */

  return {
    loadItems,
    loadPresets,
    setActivePreset,
    onFrameworkChange,
    calculateScore,
    getRankedItems,
    focusTerm,
    clearFocus,
    subscribe,
    getActivePresetId: () => activePresetId,
    getActivePresetData // Hyödyllinen muille moduuleille
  };

})();

/* ============================================================
   KYTKENTÄ FrameworkEngineen
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof FrameworkEngine !== "undefined") {
    FrameworkEngine.subscribe(({ framework }) => {
      MIEngine.onFrameworkChange({ framework }); 
    });
  }
});