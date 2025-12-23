/* ============================================================
   module-registry.js – DYNAAMINEN AGENTTI-VERSIO (V2.1)
   Vastuu: Moduulien elinkaari, dynaaminen sijoittelu ja neuvottelu.
   ============================================================ */

const ModuleRegistry = (() => {
    const modules = new Map();

    /**
     * Rekisteröi uuden agentin/moduulin järjestelmään.
     */
    function register(definition) {
        if (!definition?.id) {
            console.error("ModuleRegistry: Rekisteröinti epäonnistui.", definition);
            return;
        }
        
        if (modules.has(definition.id)) return;

        const mod = {
            ...definition,
            initialized: false,
            active: false
        };

        modules.set(mod.id, mod);
        
        // Jos sivu on jo latautunut, alustetaan moduuli heti
        if (document.readyState === "complete") {
            initModule(mod);
        }
    }

    /* ===================== 🧠 NEUVOTTELULOGIIKKA ===================== */

    /**
     * 🔑 TÄRKEÄ METODI: Käy läpi moduulit ja sijoittaa ne oikeisiin paneeleihin.
     */
    function resolvePlacement(viewMode) {
        console.log(`🧠 ModuleRegistry: Neuvotellaan sijoittelusta tilalle: ${viewMode}`);
        
        modules.forEach(mod => {
            // 1. Kysytään moduulilta itseltään, missä se haluaa näkyä
            const targetPanelId = (typeof mod.getPreferredPanel === "function") 
                ? mod.getPreferredPanel(viewMode) 
                : getDefaultPanel(mod.id, viewMode);

            if (targetPanelId) {
                const targetEl = document.getElementById(targetPanelId);
                if (targetEl) {
                    // Jos moduuli on jo aktiivinen muualla, deaktivoidaan se siirtoa varten
                    if (mod.active && mod.host !== targetEl) {
                        deactivate(mod);
                    }

                    // Injektoidaan moduuli isäntään
                    if (typeof mod.mount === "function") {
                        mod.mount(targetEl);
                    }
                    
                    activate(mod, { mode: viewMode });
                }
            } else if (mod.active) {
                // Jos moduulilla ei ole paikkaa tässä näkymässä, deaktivoidaan se
                deactivate(mod);
            }
        });
    }

    /**
     * Varajärjestelmä moduulien sijoittelulle.
     */
    function getDefaultPanel(id, viewMode) {
        const mapping = {
            narrative: ["mosaic", "wordcloud", "blockquote"],
            analysis: ["starfield", "anatomy", "wordcloud"],
            reflection: ["challenge", "valuescale"]
        };
        return mapping[viewMode]?.includes(id) ? `${viewMode}Panel` : null;
    }

    /* ===================== ELINKAARIHALLINTA ===================== */

    function initModule(mod) {
        if (mod.initialized) return;
        try {
            if (typeof mod.init === "function") {
                mod.init();
            }
            mod.initialized = true;
            console.log(`📦 Moduuli alustettu: ${mod.id}`);
        } catch (e) {
            console.error(`❌ ModuleRegistry: init failed (${mod.id})`, e);
        }
    }

    function activate(mod, ctx = {}) {
        if (!mod.initialized) initModule(mod);
        if (mod.active) return;
        try {
            if (typeof mod.activate === "function") mod.activate(ctx);
            mod.active = true;
        } catch (e) {
            console.error(`❌ ModuleRegistry: activate failed (${mod.id})`, e);
        }
    }

    function deactivate(mod) {
        if (!mod || !mod.active) return;
        try {
            if (typeof mod.deactivate === "function") mod.deactivate();
            mod.active = false;
            // Siivotaan isäntäpaneeli
            if (mod.host) {
                mod.host.innerHTML = '';
                mod.host = null;
            }
        } catch (e) {
            console.error(`❌ ModuleRegistry: deactivate failed (${mod.id})`, e);
        }
    }

    /* ===================== 🧠 INTERVENTIOT ===================== */

    function requestIntervention(moduleId, type, payload) {
        const mod = modules.get(moduleId);
        if (!mod || !mod.active) return;

        updateInterventionDashboard(moduleId, type, payload);

        switch (type) {
            case 'VIEW_CHANGE':
                window.EventBus?.emit("ui:viewChange", { view: payload.view });
                break;
            case 'NAVIGATE':
                window.EventBus?.emit("chapter:change", { chapterId: payload.chapterId });
                break;
            case 'VISUAL_EFFECT':
                if (payload.target === 'body') {
                    document.body.style.filter = payload.filter || "none";
                    document.body.style.transition = payload.transition || "all 0.5s ease";
                }
                break;
        }
    }

    function updateInterventionDashboard(moduleId, type, payload) {
        const container = document.getElementById("intervention-status");
        if (!container) return;
        
        const badge = document.createElement("div");
        badge.style.cssText = `background:rgba(20,20,20,0.9);color:#d0b48c;padding:6px 12px;margin-bottom:8px;border-left:3px solid #d0b48c;font-size:10px;text-transform:uppercase;animation:fadeIn 0.3s ease;`;
        badge.innerHTML = `<strong>${moduleId}</strong>: ${type}`;
        container.appendChild(badge);

        setTimeout(() => {
            badge.style.opacity = "0";
            setTimeout(() => badge.remove(), 600);
        }, 3000);
    }

    /* ===================== JULKINEN API ===================== */

    return {
        register,
        resolvePlacement, // 👈 TÄMÄ PUUTTUI: Nyt metodi on saatavilla ulkopuolelta!
        requestIntervention,
        initAll: () => modules.forEach(initModule),
        get: (id) => modules.get(id),
        list: () => Array.from(modules.values())
    };
})();

window.ModuleRegistry = ModuleRegistry;

// Alustetaan kaikki moduulit heti kun sivu on valmis
window.addEventListener("load", () => ModuleRegistry.initAll());