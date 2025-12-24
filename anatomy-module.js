/* ============================================================
   anatomy-module.js – RAKENTEELLINEN ASIANTUNTIJA (V7.0)
   Vastuu: 
   - Tekstin rakenteellinen purku (teesit, päätelmät)
   - Reagointi ModuleRegistryn dispatch-käskyihin
   - Kognitiivisen viipymän (Deep Focus) visualisointi
   ============================================================ */

const AnatomyModule = {
    id: "anatomy",
    title: "Tekstin anatomia",
    category: "structure", // 🧠 Tyypitys ModuleRegistrylle
    active: false,
    el: null,
    currentMode: "describe",

    /* ===================== 🧠 SIJOITTELU ===================== */

    isAvailable(viewMode) {
        // Asiantuntija on saatavilla analyysi- ja reflektio-näkymissä
        return viewMode === "analysis" || viewMode === "reflection";
    },

    render() {
        if (this.el) return this.el;

        this.el = document.createElement("div");
        this.el.id = "anatomy-module-root";
        this.el.className = "module-card anatomy-container";
        this.el.style.cssText = `
            margin-bottom: 20px;
            padding: 20px;
            border-left: 3px solid var(--accent);
            background: rgba(255, 255, 255, 0.03);
            transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
            display: none;
        `;

        return this.el;
    },

    /* ===================== 🤖 ÄLYKÄS DISPATCH-REAKTIOT ===================== */

    /**
     * Bongaa lukijan syvän keskittymisen.
     * Kutsutaan ModuleRegistry.dispatch() kautta.
     */
    onDeepFocus(payload) {
        if (!this.active || !this.el) return;
        
        console.log(`🧬 Anatomy: Bongattu syvä keskittyminen kappaleessa ${payload.paragraphIndex}`);
        
        // Korostetaan moduulia asiantuntijana
        this.el.style.borderColor = "var(--accent-gold)";
        this.el.style.background = "rgba(208, 180, 140, 0.08)";
        this.el.style.transform = "scale(1.03)";
        
        // Palautetaan tila pienen viiveen jälkeen
        setTimeout(() => {
            if (this.el) {
                this.el.style.transform = "scale(1)";
                this.el.style.background = "rgba(255, 255, 255, 0.03)";
            }
        }, 3000);
    },

    /**
     * Vastaa yleiseen bongauspyyntöön.
     */
    onBongattu(data) {
        console.log("🧬 Anatomy: Vastaanotettu asiantuntija-heräte:", data.reason);
        this.updateUI("interpret"); // Vaihdetaan asiantuntijatilaan automaattisesti
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Luvun vaihtumisen seuranta lennosta tapahtuvaan päivitykseen
        window.EventBus?.on("chapter:change", () => {
            if (this.active) this.updateUI();
        });
        
        console.log("🧬 Anatomy: Rakenteellinen asiantuntija valmiudessa.");
    },

    activate(ctx) {
        this.active = true;
        this.currentMode = ctx?.mode || "describe";
        this.updateUI();
    },

    deactivate() {
        this.active = false;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    updateUI(mode = null) {
        if (mode) this.currentMode = mode;
        if (!this.el) return;

        const activeId = window.TextEngine?.getActiveChapterId();
        const activeChapter = window.TextEngine?.getChapterMeta(activeId);
        const anatomy = activeChapter?.anatomy;

        if (!anatomy) {
            this.el.style.display = "none";
            return;
        }

        this.el.style.display = "block";
        let label = "";
        let content = "";

        // Valitaan sisältö analyysitilan mukaan
        switch(this.currentMode) {
            case "interpret":
                label = "Asiantuntijan johtopäätös";
                content = anatomy.conclusions?.explicit?.[0] || "Ei eksplisiittistä johtopäätöstä.";
                break;
            case "hypothesis":
                label = "Piilevä vaikutus";
                content = anatomy.conclusions?.implicit?.[0] || "Ei tunnistettua implisiittistä vaikutusta.";
                break;
            default:
                label = "Keskeinen teesi";
                content = anatomy.main_thesis;
        }

        this.el.innerHTML = `
            <div class="anatomy-content-wrapper anim-fade-in">
                <div class="anatomy-label" style="
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: var(--accent);
                    margin-bottom: 8px;
                    font-weight: bold;
                ">${label}</div>
                <div class="anatomy-body" style="
                    font-size: 14px;
                    line-height: 1.5;
                    color: rgba(255,255,255,0.9);
                ">${content}</div>
            </div>
        `;
    }
};

// Varmistetaan globaali näkyvyys
window.AnatomyModule = AnatomyModule;

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(AnatomyModule);
}