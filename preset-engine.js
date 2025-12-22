/* ============================================================
   preset-engine.js
   Vastuu:
   - Tulkitsijan avaimen presetien hallinta
   - Kehyskohtaiset oletuspresetit
   - Preset-tilan tarjoaminen muille moottoreille
============================================================ */

const PresetEngine = (() => {

  /* ===================== SISÄINEN TILA ===================== */

  let presets = {};                 // { presetId: presetObject }
  let activePresetId = null;        // aktiivinen preset-id
  let frameworkDefaults = {};       // kehys → preset-id

  const subscribers = new Set();

  /* ===================== LATAUS ===================== */

  function loadPresets(presetData = {}) {
    presets = presetData.core_presets
      ? presetData.core_presets
      : presetData;

    if (typeof presets !== "object" || presets === null) {
      presets = {};
    }

    notify();
  }

  function loadFrameworkDefaults(map = {}) {
    frameworkDefaults = map || {};
  }

  /* ===================== AKTIVOINTI ===================== */

  function setActivePreset(id) {
    if (!id || !presets[id]) {
      console.warn(`PresetEngine: preset puuttuu: ${id}`);
      return;
    }

    activePresetId = id;

    // kytke MIEngineen, jos olemassa
    if (
      typeof MIEngine !== "undefined" &&
      typeof MIEngine.setActivePreset === "function"
    ) {
      MIEngine.setActivePreset(id);
    }

    document.body.dataset.preset = id;
    notify();
  }

  function getActivePreset() {
    return activePresetId;
  }

  function getActivePresetObject() {
    if (!activePresetId) return null;
    return presets[activePresetId] || null;
  }

  /* ===================== KEHYSREAKTIO (KORJATTU) ===================== */

  function onFrameworkChange(state) {
    if (!state || !state.framework) {
      return;
    }

    const framework = state.framework;

    const defaultPreset =
      frameworkDefaults[framework.id] ||
      framework.default_preset ||
      null;

    if (defaultPreset && defaultPreset !== activePresetId) {
      setActivePreset(defaultPreset);
    }
  }

  /* ===================== DATA ===================== */

  function getPresets() {
    return presets;
  }

  function getPreset(id) {
    return presets[id] || null;
  }

  /* ===================== TAPAHTUMAT ===================== */

  function subscribe(fn) {
    if (typeof fn === "function") {
      subscribers.add(fn);
    }
    return () => subscribers.delete(fn);
  }

  function notify() {
    subscribers.forEach(fn => {
      try {
        fn({
          presets,
          activePresetId,
          preset: getActivePresetObject()
        });
      } catch (e) {
        console.error("PresetEngine subscriber error", e);
      }
    });
  }

  /* ===================== JULKINEN API ===================== */

  return {
    loadPresets,
    loadFrameworkDefaults,

    setActivePreset,
    getActivePreset,
    getActivePresetObject,

    getPresets,
    getPreset,

    onFrameworkChange,
    subscribe
  };

})();
