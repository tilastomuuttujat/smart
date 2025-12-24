/* ============================================================
   module-registry.js – KOGNITIIVINEN REITITIN (V3.0)
   Vastuu:
   - Moduulien elinkaari ja dynaaminen pinoaminen
   - Älykäs viestien välitys (Dispatch)
   - Behavior-Trackerin ja moduulien välinen orkestraatio
============================================================ */

(function () {
  const modules = new Map();

  const VIEW_TARGETS = {
    narrative: null,
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
      // Oletuskategoria, jos ei määritelty
      category: definition.category || "general" 
    };

    modules.set(mod.id, mod);
    if (document.readyState !== "loading") initModule(mod);
  }

  /* ===================== 2. ÄLYKÄS DISPATCH (UUSI) ===================== */

  /**
   * 🤖 KESKITETTY VIESTINVÄLITYS
   * Mahdollistaa täsmäviestit kymmenille moduuleille ilman EventBus-ruuhkaa.
   * @param {Object} criteria - Esim. { category: 'ethics' } tai { id: 'anatomy' }
   * @param {String} action - Metodi, jota kutsutaan (esim. 'onBongattu')
   * @param {Object} payload - Data (esim. ankkurin tiedot)
   */
  function dispatch(criteria, action, payload) {
    modules.forEach(mod => {
      // 1. Tarkistetaan täsmääkö kriteeri (id, kategoria jne.)
      const isTarget = !criteria || Object.keys(criteria).every(key => mod[key] === criteria[key]);
      
      // 2. Välitetään viesti vain aktiivisille ja toiminnallisille moduuleille
      if (isTarget && mod.active && typeof mod[action] === 'function') {
        try {
          mod[action](payload);
        } catch (e) {
          console.error(`❌ ModuleRegistry: Dispatch epäonnistui kohteelle ${mod.id}`, e);
        }
      }
    });
  }

  /* ===================== 3. SIJOITTELU JA PINOTTAMINEN ===================== */

  function resolvePlacement(view) {
    const targetId = VIEW_TARGETS[view];
    const target = targetId ? document.getElementById(targetId) : null;

    if (target) target.innerHTML = "";

    modules.forEach(mod => {
      // Moduuli päättää itse isAvailable-metodillaan näkyvyydestään
      if (typeof mod.isAvailable === "function" && !mod.isAvailable(view)) {
        if (mod.active) deactivate(mod);
        return;
      }

      if (!target) {
        if (mod.active) deactivate(mod);
        return;
      }

      if (!mod.initialized) initModule(mod);

      // Renderöinti kerran
      if (!mod.el && typeof mod.render === "function") {
        mod.el = mod.render();
      }

      if (!mod.el) return;

      // Pinotaan moduulit isäntään
      if (mod.host !== target) {
        if (mod.active) deactivate(mod);
        target.appendChild(mod.el);
        mod.host = target;
      }

      activate(mod, { view });
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
    } catch (e) { console.error(`❌ ModuleRegistry: Deactivate virhe (${mod.id})`, e); }
  }

  /* ===================== 5. INTERVENTIO-REITITYS ===================== */

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
    dispatch, // 👈 Uusi älykäs viestinvälityskonunkti
    get: id => modules.get(id),
    list: () => Array.from(modules.values())
  };

  window.addEventListener("DOMContentLoaded", () => {
    modules.forEach(initModule);
  });
})();