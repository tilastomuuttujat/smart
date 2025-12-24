/* ============================================================
   blockQuote-module.js – DYNAAMINEN AGENTTI-VERSIO (V6.1)
   Vastuu: Tekstinostojen dynaaminen renderöinti ja tyylittely.
   ============================================================ */

const BlockQuoteModule = {
    id: "blockquote",
    title: "Nosto",
    active: false,
    el: null, // Säilytetään elementti uudelleenkäyttöä varten

    /* ===================== 🧠 SIJOITTELULOGIIKKA ===================== */

    isAvailable(viewMode) {
        // Nosto on käytössä narratiivi- ja reflektio-näkymissä
        return viewMode === "narrative" || viewMode === "reflection";
    },

    /**
     * ModuleRegistry V2.3 vaatii render-metodin, joka palauttaa 
     * moduulin pysyvän elementin.
     */
    render() {
        if (this.el) return this.el;

        this.el = document.createElement("div");
        this.el.className = "module-card quote-module-container";
        this.el.style.cssText = `
            opacity: 1;
            transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            margin: 10px 0;
            padding: 24px;
            border-left: 3px solid var(--accent);
            background: rgba(255, 255, 255, 0.03);
            font-style: italic;
        `;
        
        // Luodaan sisäelementti tekstille
        const quoteEl = document.createElement("blockquote");
        quoteEl.id = "blockquote-text";
        quoteEl.className = "dynamic-typography";
        quoteEl.style.cssText = "color: var(--accent-gold); margin: 0; font-size: 1.1rem; line-height: 1.5;";
        
        this.el.appendChild(quoteEl);
        return this.el;
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Kuunnellaan kognitiivisen tilan muutoksia
        document.addEventListener('contextUpdate', (e) => {
            if (this.active) this.reactToContext(e.detail);
        });

        // Kuunnellaan luvun vaihtumista (tehosekoitin-efektin synkronointi)
        window.EventBus?.on("chapter:change", ({ chapterId }) => {
            if (this.active) this.updateQuote(chapterId);
        });
        
        console.log("📜 BlockQuote: Agentti valmiudessa.");
    },

    activate() {
        this.active = true;
        const currentId = window.TextEngine?.getActiveChapterId();
        if (currentId) this.updateQuote(currentId);
    },

    deactivate() {
        this.active = false;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    updateQuote(chapterId) {
        if (!this.el) return;
        const quoteEl = this.el.querySelector('#blockquote-text');
        if (!quoteEl) return;

        const ch = window.TextEngine?.getChapterMeta(chapterId);
        // Haetaan nostoteksti eri mahdollisista datalähteistä
        const quoteText = ch?.quote || ch?.views?.quote || ch?.meta?.quote || "";

        if (!quoteText) {
            this.el.style.display = "none";
            return;
        }

        // Animoidaan tekstin vaihto
        this.el.style.opacity = "0";
        this.el.style.transform = "translateX(10px)";
        
        setTimeout(() => {
            this.el.style.display = "block";
            quoteEl.innerHTML = `"${quoteText}"`;
            this.el.style.opacity = "1";
            this.el.style.transform = "translateX(0)";
        }, 200);
    },

    // 🧠 ÄLYKÄS REAKTIO: Muuttaa noston ilmettä järjestelmän jännite-tilan mukaan
    reactToContext(stateData) {
        if (!this.el) return;
        const quoteEl = this.el.querySelector('#blockquote-text');
        
        if (stateData.systemMode === 'tension') {
            this.el.style.boxShadow = "inset 0 0 20px rgba(255, 100, 100, 0.1)";
            this.el.style.borderColor = "#ff6b6b";
            if (quoteEl) quoteEl.style.color = "#ff9999";
        } else {
            this.el.style.boxShadow = "none";
            this.el.style.borderColor = "var(--accent)";
            if (quoteEl) quoteEl.style.color = "var(--accent-gold)";
        }
    }
};

// Tehdään moduuli saavutettavaksi globaalisti iPad-ympäristössä
window.BlockQuoteModule = BlockQuoteModule;

// Rekisteröidään moduuli
if (window.ModuleRegistry) {
    window.ModuleRegistry.register(BlockQuoteModule);
}