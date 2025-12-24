/* ============================================================
   wordcloud-module.js – DYNAAMINEN AGENTTI-VERSIO (V6.1)
   Vastuu: Sanapilven renderöinti ja dynaaminen sijoittelu.
   ============================================================ */

const WordCloudModule = {
    id: "wordcloud",
    title: "Sanapilvi",
    host: null,
    active: false,
    unsubscribeMI: null,
    el: null, // Säilytetään elementti uudelleenkäyttöä varten

    /* ===================== 🧠 SIJOITTELULOGIIKKA ===================== */

    isAvailable(view) {
        // Sanapilvi on käytössä analyysi- ja narratiivi-näkymissä
        return view === "analysis" || view === "narrative";
    },

    /**
     * UUSI: ModuleRegistry V2.3 vaatii render-metodin, joka palauttaa 
     * moduulin pysyvän elementin.
     */
    render() {
        if (this.el) return this.el;

        this.el = document.createElement("div");
        this.el.className = "module-card dynamic-wordcloud-container";
        this.el.style.cssText = `
            position: relative;
            padding: 20px;
            user-select: none;
            transition: all 0.5s ease;
            min-height: 120px;
            text-align: center;
        `;
        
        // Lisätään otsikko moduulikortin tyyliin
        const header = document.createElement("h3");
        header.textContent = this.title;
        this.el.appendChild(header);

        // Säiliö sanoille
        const cloudArea = document.createElement("div");
        cloudArea.id = "wordcloud-items";
        this.el.appendChild(cloudArea);

        return this.el;
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Kuunnellaan kognitiivisia päivityksiä AppStatesta
        document.addEventListener('contextUpdate', (e) => {
            if (this.active) this.highlightContextualTerms(e.detail);
        });
        console.log("☁️ WordCloud: Agentti valmiudessa.");
    },

    activate() {
        this.active = true;

        if (window.MIEngine) {
            this.unsubscribeMI = window.MIEngine.subscribe(payload => {
                this.updateCloud(payload.items || []);
            });
            this.updateCloud(window.MIEngine.getRankedItems());
        }
    },

    deactivate() {
        this.active = false;
        if (this.unsubscribeMI) {
            this.unsubscribeMI();
            this.unsubscribeMI = null;
        }
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    highlightContextualTerms(stateData) {
        if (!this.el) return;
        const { lastInsight, systemMode } = stateData;
        const terms = this.el.querySelectorAll(".cloud-term");

        terms.forEach(el => {
            if (lastInsight && el.textContent.toLowerCase().includes(lastInsight.toLowerCase())) {
                el.style.color = systemMode === 'tension' ? "#ff4d4d" : "var(--accent)";
                el.style.transform = "scale(1.2)";
                el.style.opacity = "1";
            } else {
                el.style.color = "rgba(255,255,255,0.6)";
                el.style.transform = "scale(1)";
                el.style.opacity = "0.7";
            }
        });
    },

    updateCloud(items) {
        const cloudArea = this.el?.querySelector("#wordcloud-items");
        if (!cloudArea) return;
        
        cloudArea.innerHTML = "";
        if (!items || !items.length) return;

        const maxScore = Math.max(...items.map(i => i.score || 0)) || 1;

        items.forEach(item => {
            const termEl = document.createElement("span");
            termEl.textContent = item.term;
            termEl.className = "cloud-term";

            const scoreNorm = (item.score || 0) / maxScore;
            const size = 11 + scoreNorm * 18;

            Object.assign(termEl.style, {
                fontSize: size + "px",
                margin: "4px 8px",
                display: "inline-block",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)",
                color: "rgba(255,255,255,0.85)"
            });

            termEl.onclick = (e) => {
                e.stopPropagation();
                if (window.MIEngine) window.MIEngine.focusTerm(item.term);
            };

            cloudArea.appendChild(termEl);
        });
    }
};

// Varmistetaan globaali näkyvyys ja rekisteröinti
window.WordCloudModule = WordCloudModule;
if (window.ModuleRegistry) {
    window.ModuleRegistry.register(WordCloudModule);
}