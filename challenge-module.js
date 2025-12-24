/* ============================================================
   challenge-module.js – DIALOGI-VERSIO (P2P) V6.1
   Vastuu: Aktivoi haasteet ja reagoi muiden moduulien tilaan.
   ============================================================ */

const ChallengeModule = {
    id: "challenge",
    title: "Lukuhaaste",
    active: false,
    currentIntensity: 0,
    el: null,

    /* ===================== 🧠 SIJOITTELULOGIIKKA ===================== */

    isAvailable(viewMode) {
        // Haasteet näkyvät reflektiossa ja analyysissä
        return viewMode === "reflection" || viewMode === "analysis";
    },

    /**
     * ModuleRegistry V2.3 vaatii render-metodin elementin palauttamiseksi.
     */
    render() {
        if (this.el) return this.el;

        this.el = document.createElement("div");
        this.el.id = "challenge-module-root";
        this.el.className = "module-card challenge-container";
        this.el.style.cssText = `
            transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            border-left: 3px solid var(--accent);
            padding: 20px;
        `;

        return this.el;
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // 🧠 MODUULIEN VÄLINEN DIALOGI
        // Kuunnellaan EventBusin kautta tulevia jännitesignaaleja
        window.EventBus?.on("shakeStarfield", (detail) => {
            if (!this.active) return;
            console.log("💬 Challenge: Korkea intensiteetti havaittu.");
            this.currentIntensity = detail.intensity || 1.0;
            this.updateUI(true); 
        });

        // Kuunnellaan luvun vaihtumista
        window.EventBus?.on("chapter:change", ({ chapterId }) => {
            if (this.active) this.updateUI(false);
        });

        console.log("💬 Challenge: Agentti valmiudessa.");
    },

    activate() {
        this.active = true;
        this.updateUI();
    },

    deactivate() {
        this.active = false;
        this.currentIntensity = 0;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    updateUI(isHighIntensity = false) {
        if (!this.el || !this.active) return;

        const chId = window.TextEngine?.getActiveChapterId();
        const ch = window.TextEngine?.getChapterMeta(chId);
        const challengeData = ch?.reflection?.challenge || ch?.challenge;

        if (!challengeData) {
            this.el.style.display = "none";
            return;
        }

        this.el.style.display = "block";

        // Haetaan tila globaalista AppStatesta
        const session = window.AppState?.data?.session;
        const economyHits = session?.keywordHits?.['kustannus'] || 0;
        const ethicsHits = session?.keywordHits?.['sielu'] || 0;

        const title = isHighIntensity ? "⚠️ Kriittinen havainto" : (this.title);
        const cardStyle = isHighIntensity ? "border-color: #ff4d4d; background: rgba(255, 77, 77, 0.05);" : "";

        // Muistijälki
        let memoryNote = "";
        if (!isHighIntensity) {
            if (economyHits > 3) memoryNote = `<div style="font-size:10px; color:var(--accent); margin-bottom:10px;">Talouspainotus havaittu aiemmin...</div>`;
            else if (ethicsHits > 3) memoryNote = `<div style="font-size:10px; color:var(--accent); margin-bottom:10px;">Eettinen polkusi vahvistuu...</div>`;
        }

        this.el.style.cssText += cardStyle;
        this.el.innerHTML = `
            <div class="challenge-content">
                <div style="font-size: 9px; letter-spacing: 1px; color: var(--accent); margin-bottom: 12px; text-transform: uppercase;">
                    ${isHighIntensity ? 'Järjestelmän jännite' : 'Pohdinta'}
                </div>
                ${memoryNote}
                <h4 style="margin-bottom: 15px; color: var(--accent-gold);">${title}</h4>
                <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                    ${challengeData.question || "Miten tämä luku resonoi arvojesi kanssa?"}
                </p>
                
                ${isHighIntensity ? `
                    <div style="font-size: 12px; font-style: italic; margin-bottom: 20px; color: #ff9999;">
                        Kognitiivinen kuorma on kasvanut. Tämä oivallus on nyt ratkaiseva.
                    </div>
                ` : ''}

                <button class="insight-btn" style="
                    width: 100%;
                    padding: 12px;
                    background: var(--accent);
                    color: #000;
                    border: none;
                    border-radius: 4px;
                    font-weight: bold;
                    cursor: pointer;
                ">
                    ${isHighIntensity ? 'TALLENNA KRIITTINEN OIVALLUS' : 'Kirjaa oivallus'}
                </button>
            </div>
        `;

        this.setupButton(chId);
    },

    setupButton(chId) {
        const btn = this.el.querySelector(".insight-btn");
        if (btn) {
            btn.onclick = () => {
                window.EventBus?.emit("reflection:insightSaved", {
                    chapterId: chId,
                    intensityLevel: this.currentIntensity,
                    type: "challenge_completed"
                });
                btn.textContent = "✓ Oivallus tallennettu";
                btn.style.background = "rgba(255,255,255,0.1)";
                btn.style.color = "var(--accent)";
                btn.disabled = true;
            };
        }
    }
};

/* ===================== REKISTERÖINTI ===================== */

window.ChallengeModule = ChallengeModule;
if (window.ModuleRegistry) {
    window.ModuleRegistry.register(ChallengeModule);
}