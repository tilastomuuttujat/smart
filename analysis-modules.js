/* ============================================================
   analysis-modules.js – DYNAAMINEN ANALYYSI-OHJAAJA
   Vastuu: Analyysitekstin renderöinti ja datan välitys agenteille.
   ============================================================ */

export const AnalysisModules = {
    id: "analysis_controller",
    initialized: false,

    /**
     * PÄIVITYS: Kutsutaan luvun vaihtuessa.
     * Hoitaa tekstin renderöinnin ja käskee Registryä neuvottelemaan paikoista.
     */
    updatePanel(ch, viewMode) {
        if (!ch) return;
        const aPanel = document.getElementById("analysisPanel");
        if (!aPanel) return;

        if (!this.initialized) this.init();

        // 1. TYHJENNETÄÄN PANEELI JA PYYDETÄÄN AGENTIT PAIKALLEEN
        // Registry hoitaa Anatomy- ja Starfield-moduulien mounttauksen
        aPanel.innerHTML = ''; 
        if (window.ModuleRegistry) {
            window.ModuleRegistry.resolvePlacement(viewMode);
        }

        // 2. ANALYYSI-TEKSTIN RENDERÖINTI
        // Luodaan säiliö tekstille, joka sijoittuu agenttien (kuten Anatomy) jälkeen
        const textContainer = document.createElement("div");
        textContainer.id = "analysisTextTarget";
        textContainer.style.cssText = "margin-top: 20px; animation: fadeIn 0.8s ease;";
        
        textContainer.innerHTML = `<h3>${ch.title} – Analyysi</h3>`;

        const analysisBody = ch.versions?.analysis?.body_md;
        if (analysisBody) {
            const paragraphs = analysisBody.split(/\r?\n\n/).filter(Boolean);
            
            paragraphs.forEach(para => {
                const p = document.createElement("p");
                p.className = "analysis-paragraph";
                p.style.cursor = "pointer";
                p.textContent = para.trim();

                // 🌪️ TEHOSEKOITIN: Kappaleen klikkaus lähettää viestin väylään
                p.onclick = () => {
                    p.classList.add("analysis-active-hit");
                    // Lähetetään signaali, johon Starfield-agentti osaa reagoida
                    document.dispatchEvent(new CustomEvent("shakeStarfield", {
                        detail: { intensity: 1.5 }
                    }));
                    setTimeout(() => p.classList.remove("analysis-active-hit"), 400);
                };

                textContainer.appendChild(p);
            });
        }

        aPanel.appendChild(textContainer);

        // 3. DATAN VÄLITYS AGENTEILLE
        // Lähetetään luvun faktadata väylään – Starfield poimii tämän itsenäisesti
        const factualData = ch.views?.analysis?.data || ch.anatomy?.evidence?.factual;
        if (factualData) {
            document.dispatchEvent(new CustomEvent("updateStarfield", { 
                detail: { data: factualData } 
            }));
        }
    },

    init() {
        if (this.initialized) return;

        // Globaali tyylitys analyysiosioille
        const style = document.createElement('style');
        style.textContent = `
            .analysis-active-hit { 
                color: #d0b48c !important; 
                transform: translateX(5px); 
                transition: all 0.2s ease;
            }
            .analysis-paragraph { transition: color 0.3s ease; }
            .analysis-paragraph:hover { color: rgba(208, 180, 140, 0.8); }
        `;
        document.head.appendChild(style);

        this.initialized = true;
    }
};

window.AnalysisModules = AnalysisModules;