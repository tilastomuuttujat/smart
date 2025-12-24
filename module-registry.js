/* ============================================================
   module-registry.js – KOGNITIIVINEN REITITIN (V3.2)
   Vastuu:
   - Moduulien elinkaari ja dynaaminen pinoaminen
   - Älykäs viestien välitys (Dispatch)
   - KORJAUS: Estää turhat tyhjennykset (välähdys-korjaus)
============================================================ */

(function () {
  const modules = new Map();
  let currentView = null; // Seurataan aktiivista näkymää

  const VIEW_TARGETS = {
    narrative: "moduleStack",
    analysis: "moduleStack",
    reflection: "moduleStack"
  };

  /* ===================== 1. REKISTERÖINTI ===================== */

  function register(definition) {
    if (!definition?.id) return;
    if (modules.has(definition.id)) return;

    const mod = {
      ...definition,
      initialized: false,
      active: false,
      host: null,
      el: null,
      category: definition.category || "general" 
    };

    modules.set(mod.id, mod);
    if (document.readyState !== "loading") initModule(mod);
  }

  /* ===================== 2. ÄLYKÄS DISPATCH ===================== */

  function dispatch(criteria, action, payload) {
    modules.forEach(mod => {
      const isTarget = !criteria || Object.keys(criteria).every(key => mod[key] === criteria[key]);
      if (isTarget && mod.active && typeof mod[action] === 'function') {
        try {
          mod[action](payload);
        } catch (e) {
          console.error(`❌ ModuleRegistry: Dispatch epäonnistui kohteelle ${mod.id}`, e);
        }
      }
    });
  }

  /* ===================== 3. SIJOITTELU (KORJATTU VÄLÄHDYS) ===================== */

  function resolvePlacement(view) {
    const targetId = VIEW_TARGETS[view];
    const target = targetId ? document.getElementById(targetId) : null;

    // 🧠 KORJAUS: Tyhjennetään paneeli vain, jos näkymä todella VAIHTUU.
    // Jos ollaan jo 'analysis'-näkymässä, ei tuhota DOMia uudestaan.
    if (currentView !== view) {
        if (target) target.innerHTML = "";
        currentView = view;
    }

    if (!target) {
      modules.forEach(mod => { if (mod.active) deactivate(mod); });
      return;
    }

    // Luodaan lista aktivoitavista moduuleista porrastusta varten
    const toActivate = [];

    modules.forEach(mod => {
      // 1. Tarkistetaan saatavuus
      if (typeof mod.isAvailable === "function" && !mod.isAvailable(view)) {
        if (mod.active) deactivate(mod);
        return;
      }

      // 2. Alustetaan jos tarpeen
      if (!mod.initialized) initModule(mod);

      // 3. Renderöidään elementti kerran
      if (!mod.el && typeof mod.render === "function") {
        mod.el = mod.render();
      }

      if (!mod.el) return;

      // 4. Kiinnitetään isäntään jos se on muuttunut
      if (mod.host !== target) {
        target.appendChild(mod.el);
        mod.host = target;
      }

      toActivate.push(mod);
    });

    // 5. Aktivoidaan moduulit porrastetusti (staggered animation)
    toActivate.forEach((mod, index) => {
      setTimeout(() => {
        activate(mod, { view });
      }, index * 50); // 50ms viive per moduuli luo orgaanisen nousun
    });
  }

  /* ===================== 4. ELINKAARI ===================== */

  function initModule(mod) {
    if (mod.initialized) return;
    try {
      if (typeof mod.init === "function") mod.init();
      mod.initialized = true;
    } catch (e) { console.error(`❌ ModuleRegistry: Init virhe (${mod.id})`, e); }
  }

  function activate(mod, ctx = {}) {
    if (mod.active) return;
    try {
      if (typeof mod.activate === "function") mod.activate(ctx);
      mod.active = true;
    } catch (e) { console.error(`❌ ModuleRegistry: Activate virhe (${mod.id})`, e); }
  }

  function deactivate(mod) {
    if (!mod.active) return;
    try {
      if (typeof mod.deactivate === "function") mod.deactivate();
      mod.active = false;
      mod.host = null; // Resetoidaan isäntä deaktivoitaessa
    } catch (e) { console.error(`❌ ModuleRegistry: Deactivate virhe (${mod.id})`, e); }
  }

  /* ===================== 5. INTERVENTIOT ===================== */

  function requestIntervention(moduleId, type, payload) {
    const mod = modules.get(moduleId);
    if (!mod || !mod.active) return;

    switch (type) {
      case "VIEW_CHANGE":
        window.EventBus?.emit("ui:viewChange", { view: payload.view });
        break;
      case "NAVIGATE":
        window.EventBus?.emit("chapter:change", { chapterId: payload.chapterId });
        break;
      case "SHAKE":
        window.EventBus?.emit("shakeStarfield", { intensity: payload.intensity || 1.0 });
        break;
    }
  }

  /* ===================== JULKINEN API ===================== */

  window.ModuleRegistry = {
    register,
    resolvePlacement,
    requestIntervention,
    dispatch,
    get: id => modules.get(id),
    list: () => Array.from(modules.values())
  };

  window.addEventListener("DOMContentLoaded", () => {
    modules.forEach(initModule);
  });
})();