/* ============================================================
   module-registry.js – PÄIVITETTY (MOSAIC-TUKI)
   Vastuu:
   - Moduulien elinkaaren hallinta (init, activate, deactivate)
   - Synkronointi FrameworkEnginen ja UI-näkymien välillä
============================================================ */

const ModuleRegistry = (() => {

  const modules = new Map();

  /* ===================== REKISTERÖINTI ===================== */

  function register(definition) {
    if (!definition?.id) {
      throw new Error("ModuleRegistry: moduulilta puuttuu id");
    }

    if (modules.has(definition.id)) return;

    const mod = {
      ...definition,
      initialized: false,
      active: false
    };

    modules.set(mod.id, mod);

    // Jos DOM on jo valmis → init heti
    if (document.readyState !== "loading") {
      initModule(mod);
    }
  }

  function initModule(mod) {
    if (mod.initialized) return;
    if (typeof mod.init === "function") {
      mod.init();
    }
    mod.initialized = true;
  }

  /* ===================== ELINKAARI ===================== */

  function initAll() {
    modules.forEach(initModule);

    // 🔑 Synkronointi FrameworkEngineen
    if (window.FrameworkEngine) {
      FrameworkEngine.subscribe(syncWithFramework);
    }
  }

  function syncWithFramework({ framework, mode }) {
    if (!framework) return;

    modules.forEach(mod => {
      const enabled = framework.modules?.includes(mod.id);

      if (enabled && !mod.active) {
        activate(mod, { framework, mode });
      }

      if (!enabled && mod.active) {
        deactivate(mod);
      }

      if (enabled && mod.active && typeof mod.onModeChange === "function") {
        mod.onModeChange(mode, framework);
      }
    });
  }

  function activate(mod, ctx) {
    try {
      if (typeof mod.activate === "function") {
        mod.activate(ctx);
      }
      mod.active = true;
    } catch (e) {
      console.error(`ModuleRegistry: activate failed (${mod.id})`, e);
    }
  }

  function deactivate(mod) {
    try {
      if (typeof mod.deactivate === "function") {
        mod.deactivate();
      }
      mod.active = false;
    } catch (e) {
      console.error(`ModuleRegistry: deactivate failed (${mod.id})`, e);
    }
  }

  /* ===================== PANEL MODE SYNC ===================== */

// module-registry.js
document.addEventListener("panelModeChange", e => {
  const mode = e.detail?.mode; // narrative | analysis | reflection

  modules.forEach(mod => {
    const shouldBeActive =
      (mode === "narrative" && mod.id === "mosaic") || // Mosaic aktivoituu narratiivissa
      (mode === "analysis" && mod.id === "starfield") ||
      (mode === "reflection" && mod.id === "reflection");

    if (shouldBeActive && !mod.active) {
      activate(mod, {});
    }

    if (!shouldBeActive && mod.active) {
      deactivate(mod);
    }
  });
});
  /* ===================== API ===================== */

  return {
    register,
    initAll,
    get(id) {
      return modules.get(id);
    },
    list() {
      return Array.from(modules.values());
    }
  };

})();

/* ===================== AUTOSTART ===================== */

document.addEventListener("DOMContentLoaded", () => {
  ModuleRegistry.initAll();
});