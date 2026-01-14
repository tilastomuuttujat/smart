/* ============================================================
   module-loader.js – DYNAAMINEN MODUULILATAAJA (V1.2 – FIXED)
   Vastuu:
   - Moduulien saatavuus (manifesti)
   - Dynaaminen lataus (import)
   - EI rekisteröi moduuleja
   - Odottaa ModuleRegistryä
============================================================ */

(function () {

  const loaded = new Set();
  let registryReady = false;

  /* ============================================================
     🧠 AINOA PAIKKA, JOSSA MODUULIEN OLEMASSAOLO TIEDETÄÄN
  ============================================================ */
  const MANIFEST = {};
/*
  const MANIFEST = {
    starfield: {
      src: "./astarfield-module.js",
      when: ctx => ctx?.entry_focus?.structure >= 1
    },

    spatial: {
      src: "./aspatialObserver-module.js",
      when: ctx => ctx?.entry_focus?.structure >= 1
      
    },

    counter_matrix: {
      src: "./counter-matrix.js",
      when: ctx => ctx?.entry_focus?.structure >= 1
    }
  };
*/
  /* ============================================================
     YDIN: MODUULIEN LATAUS
  ============================================================ */

  async function load(id, context = {}) {
    if (loaded.has(id)) return;

    const def = MANIFEST[id];
    if (!def) return;

    if (typeof def.when === "function" && !def.when(context)) {
      return;
    }

    try {
      await import(def.src);
      loaded.add(id);
      console.log(`📦 ModuleLoader: ladattu ${id}`);
    } catch (e) {
      console.error(`❌ ModuleLoader: virhe ladattaessa ${id}`, e);
    }
  }

  async function resolve(context = {}) {
    if (!registryReady) return;

    for (const id of Object.keys(MANIFEST)) {
      await load(id, context);
    }
  }

  /* ============================================================
     ODOTA MODULE REGISTRYÄ
  ============================================================ */

  function waitForRegistry() {
    if (window.ModuleRegistry) {
      registryReady = true;
      console.log("🧩 ModuleLoader: ModuleRegistry valmis");
    } else {
      setTimeout(waitForRegistry, 25);
    }
  }

  waitForRegistry();

  /* ============================================================
     JULKINEN API
  ============================================================ */

  window.ModuleLoader = {
    resolve,
    load,
    list: () => Object.keys(MANIFEST),
    loaded: () => Array.from(loaded)
  };

})();
