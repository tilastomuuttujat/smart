/* ============================================================
   wordcloud-module.js – DYNAAMINEN AGENTTI-VERSIO
   Vastuu: Sanapilven renderöinti ja dynaaminen sijoittelu.
   ============================================================ */

export const WordCloudModule = {
    id: "wordcloud",
    title: "Sanapilvi",
    host: null,
    active: false,
    unsubscribeMI: null,

    /* ===================== 🧠 DYNAAMINEN SIJOITTUMINEN ===================== */

    getPreferredPanel(viewMode) {
        // Sanapilvi on monikäyttöinen:
        // Analyysinäkymässä se on pääroolissa, Narratiivissa se on Mosaicin alla.
        if (viewMode === "analysis") return "analysisPanel";
        if (viewMode === "narrative") return "narrativePanel";
        return null;
    },

    mount(targetEl) {
        if (!targetEl || this.host === targetEl) return;
        
        console.log(`☁️ WordCloud: Kiinnitetään isäntään: ${targetEl.id}`);
        this.host = targetEl;

        // Luodaan dynaaminen säiliö
        const cloudContainer = document.createElement("div");
        cloudContainer.className = "dynamic-wordcloud-container";
        cloudContainer.style.cssText = `
            position: relative;
            padding: 20px;
            margin-top: 20px;
            user-select: none;
            transition: all 0.5s ease;
            min-height: 150px;
            text-align: center;
        `;
        
        this.host.appendChild(cloudContainer);
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        document.addEventListener('contextUpdate', (e) => {
            if (this.active) this.highlightContextualTerms(e.detail);
        });
        console.log("☁️ WordCloud: Agentti valmiudessa.");
    },

    activate() {
        if (!this.host) return;
        this.active = true;

        if (window.MIEngine) {
            this.unsubscribeMI = window.MIEngine.subscribe(payload => {
                this.render(payload.items || []);
            });
            this.render(window.MIEngine.getRankedItems());
        }
    },

    deactivate() {
        this.active = false;
        if (this.unsubscribeMI) {
            this.unsubscribeMI();
            this.unsubscribeMI = null;
        }
        if (this.host) {
            this.host.innerHTML = ''; // Siivotaan dynaaminen sisältö
        }
        this.host = null;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    highlightContextualTerms(stateData) {
        if (!this.host) return;
        const { lastInsight, systemMode } = stateData;
        const terms = this.host.querySelectorAll(".cloud-term");

        terms.forEach(el => {
            if (lastInsight && el.textContent.toLowerCase().includes(lastInsight.toLowerCase())) {
                el.style.color = systemMode === 'tension' ? "#ff4d4d" : "#ffd700";
                el.style.transform = "scale(1.3)";
                el.style.zIndex = "10";
            } else {
                el.style.color = "rgba(208,180,140,0.6)";
                el.style.transform = "scale(1)";
                el.style.zIndex = "1";
            }
        });
    },

    render(items) {
        const container = this.host?.querySelector(".dynamic-wordcloud-container");
        if (!container) return;
        
        container.innerHTML = "";
        if (!items || !items.length) return;

        const maxScore = Math.max(...items.map(i => i.score || 0)) || 1;

        items.forEach(item => {
            const termEl = document.createElement("span");
            termEl.textContent = item.term;
            termEl.className = "cloud-term";

            const scoreNorm = (item.score || 0) / maxScore;
            const size = 12 + scoreNorm * 22;

            Object.assign(termEl.style, {
                fontSize: size + "px",
                margin: "6px 10px",
                display: "inline-block",
                cursor: "pointer",
                transition: "all 0.4s ease",
                color: "rgba(208,180,140,0.95)"
            });

            termEl.onclick = (e) => {
                e.stopPropagation();
                if (window.MIEngine) window.MIEngine.focusTerm(item.term);
            };

            container.appendChild(termEl);
        });
    }
};

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(WordCloudModule);
}