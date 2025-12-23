/* ============================================================
   blockQuote-module.js – DYNAAMINEN AGENTTI-VERSIO
   Vastuu: Tekstinostojen dynaaminen renderöinti ja tyylittely.
   ============================================================ */

export const BlockQuoteModule = {
    id: "blockquote",
    title: "Nosto",
    host: null,
    active: false,
    currentChapter: null,

    /* ===================== 🧠 DYNAAMINEN SIJOITTUMINEN ===================== */

    getPreferredPanel(viewMode) {
        // Nosto on ensisijaisesti osa Narratiivi-kokemusta
        if (viewMode === "narrative") return "narrativePanel";
        // Voidaan näyttää myös reflektiossa syventävänä elementtinä
        if (viewMode === "reflection") return "reflectionPanel";
        return null;
    },

    mount(targetEl) {
        if (!targetEl || this.host === targetEl) return;
        
        console.log(`📜 BlockQuote: Kiinnitetään isäntään: ${targetEl.id}`);
        this.host = targetEl;

        // Luodaan dynaaminen wrapperi, jotta moduuli on itsenäinen
        const wrapper = document.createElement("div");
        wrapper.className = "lincoln-style-wrapper";
        wrapper.style.cssText = `
            opacity: 0;
            transition: all 0.8s ease;
            margin: 20px 0;
            padding: 20px;
            border-left: 2px solid rgba(250, 200, 130, 0.4);
            background: rgba(255, 255, 255, 0.03);
            font-style: italic;
        `;
        
        this.host.appendChild(wrapper);
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Kuunnellaan hermoverkon contextUpdate-viestejä
        document.addEventListener('contextUpdate', (e) => {
            if (this.active) this.reactToContext(e.detail);
        });

        // Kuunnellaan luvun vaihtumista
        document.addEventListener("chapterChange", (e) => {
            if (this.active) this.updateQuote(e.detail.chapterId);
        });
    },

    activate() {
        this.active = true;
        const currentId = window.TextEngine?.getActiveChapterId();
        if (currentId) this.updateQuote(currentId);
    },

    deactivate() {
        this.active = false;
        if (this.host) {
            this.host.innerHTML = ''; // Siivotaan dynaaminen sisältö
        }
        this.host = null;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    updateQuote(chapterId) {
        if (!this.host) return;
        const wrapper = this.host.querySelector('.lincoln-style-wrapper');
        if (!wrapper) return;

        const ch = window.TextEngine?.getChapterMeta(chapterId);
        const quoteText = ch?.quote || ch?.views?.quote || "";

        if (!quoteText) {
            wrapper.style.display = "none";
            return;
        }

        wrapper.style.opacity = "0";
        
        setTimeout(() => {
            wrapper.style.display = "block";
            wrapper.innerHTML = `<blockquote class="dynamic-typography" style="color: rgba(250, 200, 130, 0.8); margin: 0;">
                "${quoteText}"
            </blockquote>`;
            wrapper.style.opacity = "1";
        }, 150);
    },

    // 🧠 ÄLYKÄS REAKTIO: Muuttaa noston ilmettä lennosta
    reactToContext(stateData) {
        if (!this.host) return;
        const wrapper = this.host.querySelector('.lincoln-style-wrapper');
        const quoteText = this.host.querySelector('.dynamic-typography');
        
        if (!wrapper || !quoteText) return;

        if (stateData.systemMode === 'tension') {
            wrapper.style.boxShadow = "0 0 30px rgba(255, 0, 0, 0.15)";
            wrapper.style.borderColor = "rgba(255, 100, 100, 0.5)";
            quoteText.style.color = "#ff9999";
        } else {
            wrapper.style.boxShadow = "none";
            wrapper.style.borderColor = "rgba(250, 200, 130, 0.4)";
            quoteText.style.color = "rgba(250, 200, 130, 0.8)";
        }
    }
};

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(BlockQuoteModule);
}