/* ============================================================
   module-registry.js – KOGNITIIVINEN REITITIN (V3.5 - THIS-FIX)
   Korjaukset:
   - Kutsuu moduulien metodeja aina moduuliobjektin kontekstissa (call)
   - Estää "Init virhe" -tilanteet, joissa this === undefined
============================================================ */

(function () {

  const modules = new Map();
  let currentView = null;
  let currentContext = {};

  /* ===================== NÄKYMÄT ===================== */

  const VIEWS = ["narrative", "analysis", "reflection"];


  /* ===================== 1. REKISTERÖINTI ===================== */

  function register(definition) {
    if (!definition?.id) {
      console.warn("⚠️ ModuleRegistry: moduulilla ei ole id:tä", definition);
      return;
    }
    if (modules.has(definition.id)) return;

    const views =
      Array.isArray(definition.views) && definition.views.length
        ? definition.views
        : VIEWS;

    const mod = {
      id: definition.id,
      title: definition.title || definition.id,
      category: definition.category || "general",

      /* 🧠 näkymäkohtaisuus */
      views,

      /* 🧠 entry_focus-äly */
      focus: definition.focus || null,
      minScore: definition.minScore ?? 0,

      /* toteutus: säilytetään alkuperäinen moduuliobjekti */
      impl: definition,

      /* sisäinen tila */
      initialized: false,
      active: false,
      host: null,
      el: null
    };

    modules.set(mod.id, mod);

    // Jos DOM on jo valmis, voidaan initata heti
    if (document.readyState !== "loading") {
      initModule(mod);
    }
  }

  /* ===================== 2. KONTEKSTI ===================== */

  function setContext(ctx = {}) {
    currentContext = ctx || {};
    // Haluttaessa voidaan päivittää aktiiviset moduulit kontekstin vaihtuessa
    // (ei pakollinen tässä, mutta hyödyllinen)
  }

  /* ===================== 3. RELEVANSSI ===================== */

  function isModuleRelevant(mod, view) {
    // 1) näkymä
    if (!mod.views.includes(view)) return false;

    const impl = mod.impl;

    // 2) moduulin oma saatavuuslogiikka
    if (typeof impl.isAvailable === "function") {
      try {
        if (!impl.isAvailable.call(impl, view, currentContext)) return false;
      } catch (e) {
        console.error(`❌ isAvailable virhe (${mod.id})`, e);
        return false;
      }
    }

    // 3) entry_focus
    if (mod.focus && currentContext.entry_focus) {
      const score = currentContext.entry_focus[mod.focus] ?? 0;
      if (score < mod.minScore) return false;
    }

    return true;
  }

  /* ===================== 4. DISPATCH ===================== */

  function dispatch(criteria, action, payload) {
    modules.forEach(mod => {
      const match =
        !criteria ||
        Object.keys(criteria).every(key => mod[key] === criteria[key]);

      if (!match || !mod.active) return;

      const impl = mod.impl;
      const fn = impl?.[action];

      if (typeof fn === "function") {
        try {
          fn.call(impl, payload, currentContext);
        } catch (e) {
          console.error(`❌ Dispatch virhe (${mod.id}:${action})`, e);
        }
      }
    });
  }


function mount(selectedModules) {
  const target = document.getElementById("moduleStack");
  if (!target) return;

  target.innerHTML = "";

  selectedModules.forEach(mod => {
    if (!mod.el && typeof mod.render === "function") {
      mod.el = mod.render();
    }
    if (!mod.el) return;

    target.appendChild(mod.el);

    if (typeof mod.activate === "function") {
      mod.activate();
    }
  });
}


  /* ===================== 5. SIJOITTELU ===================== */

  function resolvePlacement(view) {
  const target = document.getElementById("moduleStack");
  if (!target) return;

  // ei tyhjennystä ellei näkymä vaihdu
  if (currentView !== view) {
    target.innerHTML = "";
    currentView = view;
  }

  const toActivate = [];


    modules.forEach(mod => {
      // Relevanssi
      if (!isModuleRelevant(mod, view)) {
        if (mod.active) deactivate(mod);
        return;
      }

      // Init
      if (!mod.initialized) initModule(mod);

      // Render (vain kerran)
      if (!mod.el) {
        const impl = mod.impl;
        if (typeof impl.render === "function") {
          try {
            const el = impl.render.call(impl, currentContext);
            if (el) {
              mod.el = el;
              mod.el.classList.add("module", `module-${mod.id}`);
              // Synkronoidaan myös impl.el, jos moduuli haluaa käyttää sitä
              impl.el = mod.el;
            }
          } catch (e) {
            console.error(`❌ Render virhe (${mod.id})`, e);
          }
        }
      }

      if (!mod.el) return;

      // Kiinnitys
      if (mod.host !== target) {
        target.appendChild(mod.el);
        mod.host = target;
      }

      toActivate.push(mod);
    });

    // Porrastettu aktivointi
    toActivate.forEach((mod, index) => {
      setTimeout(() => {
        activate(mod, { view, context: currentContext });
      }, index * 50);
    });
  }
  

  /* ===================== 6. ELINKAARI ===================== */

  function initModule(mod) {
    if (mod.initialized) return;

    const impl = mod.impl;

    try {
      if (typeof impl.init === "function") {
        impl.init.call(impl, currentContext);
      }
      mod.initialized = true;
    } catch (e) {
      console.error(`❌ Init virhe (${mod.id})`, e);
    }
  }

  function activate(mod, ctx) {
    if (mod.active) return;

    const impl = mod.impl;

    try {
      if (mod.el) mod.el.classList.add("is-active");
      if (typeof impl.activate === "function") {
        impl.activate.call(impl, ctx);
      }
      mod.active = true;
    } catch (e) {
      console.error(`❌ Activate virhe (${mod.id})`, e);
    }
  }

  function deactivate(mod) {
    if (!mod.active) return;

    const impl = mod.impl;

    try {
      if (mod.el) mod.el.classList.remove("is-active");
      if (typeof impl.deactivate === "function") {
        impl.deactivate.call(impl);
      }
      mod.active = false;
      mod.host = null;
    } catch (e) {
      console.error(`❌ Deactivate virhe (${mod.id})`, e);
    }
  }

  /* ===================== 7. JULKINEN API ===================== */

  window.ModuleRegistry = {
  /* ===================== PERUS ===================== */

  register,
  resolvePlacement,   // ← tämä puuttui ja aiheutti virheen
  setContext,
  dispatch,
  mount,

  /* ===================== HAKU ===================== */

  // Palauttaa varsinaisen moduuliobjektin (impl)
  get: id => modules.get(id)?.impl,

  // Palauttaa KAIKKI moduulien impl-objektit (vanha käytös)
  list: () => Array.from(modules.values()).map(m => m.impl),

  // 🔑 UUSI: palauttaa wrapperit (älyjakaja tarvitsee tätä)
  listWrappers: () => Array.from(modules.values())
};



})();
