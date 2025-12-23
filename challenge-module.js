/* ============================================================
   challenge-module.js – DIALOGI-VERSIO (P2P)
   Vastuu: Aktivoi haasteet ja reagoi muiden moduulien tilaan.
   ============================================================ */

export const ChallengeModule = {
    id: "challenge",
    title: "Lukuhaaste",
    container: null,
    active: false,
    currentIntensity: 0,

    /* ===================== ELINKAARI ===================== */

    init() {
        this.container = document.getElementById("challenge-target");
        if (!this.container) {
            const rPanel = document.getElementById("reflectionPanel");
            if (rPanel) {
                this.container = document.createElement("div");
                this.container.id = "challenge-target";
                rPanel.appendChild(this.container);
            }
        }

        // 🧠 MODUULIEN VÄLINEN DIALOGI (Peer-to-Peer)
        // Kuunnellaan Starfieldin ilmoitusta korkeasta jännityksestä
        document.addEventListener('starfieldIntervention', (e) => {
            if (!this.active) return;
            console.log("💬 ChallengeModule: Vastaanotettu signaali Starfieldiltä.");
            this.currentIntensity = e.detail.intensityScore;
            this.render(true); // Pakotetaan renderöinti intensiivisessä tilassa
        });
    },

    activate(ctx) {
        this.active = true;
        if (this.container) this.container.style.display = "block";

        // Haetaan alkutilanne istuntomuistista
        const session = window.AppState?.data?.session;
        const economyHits = session?.keywordHits?.['kustannus'] || 0;
        const ethicsHits = session?.keywordHits?.['sielu'] || session?.keywordHits?.['ihminen'] || 0;

        this.render(false, economyHits, ethicsHits);
    },

    deactivate() {
        this.active = false;
        this.currentIntensity = 0;
        if (this.container) {
            this.container.style.display = "none";
            this.container.innerHTML = "";
        }
    },

    /* ===================== RENDERÖINTI ===================== */

    render(isHighIntensity = false, economyHits = 0, ethicsHits = 0) {
        if (!this.active || !this.container) return;

        const chId = window.TextEngine?.getActiveChapterId();
        const ch = window.TextEngine?.getChapterMeta(chId);
        const challengeData = ch?.reflection?.challenge;

        if (!challengeData) {
            this.container.innerHTML = "";
            return;
        }

        // 🤖 DIALOGI-LOGIIKKA: Mukautetaan teksti Starfieldin tilan mukaan
        const title = isHighIntensity ? "⚠️ Kriittinen havainto" : (challengeData.title || "Lukuhaaste");
        const cardClass = isHighIntensity ? "challenge-card intensity-alert" : "challenge-card";

        // Muistijälki (jos ei olla korkeassa intensiteetissä)
        let memoryNote = "";
        if (!isHighIntensity) {
            if (economyHits > 3) memoryNote = `<div class="memory-note">Talouspainotus havaittu aiemmissa luvuissa...</div>`;
            else if (ethicsHits > 3) memoryNote = `<div class="memory-note">Eettinen polkusi vahvistuu...</div>`;
        }

        this.container.innerHTML = `
            <div class="${cardClass}">
                <div class="challenge-badge">${isHighIntensity ? 'JÄRJESTELMÄN JÄNNITE' : 'POHDINTA'}</div>
                ${memoryNote}
                <h4>${title}</h4>
                <p>${challengeData.question || "Pysähdy hetkeksi ja mieti tätä lukua."}</p>
                
                ${isHighIntensity ? `
                    <div class="intensity-context">
                        Visualisointi kiihtyi kognitiivisen kuorman vuoksi. 
                        Tämä kysymys on nyt ratkaiseva.
                    </div>
                ` : ''}

                <div class="challenge-action">
                    <button class="insight-btn" data-chapter="${chId}">
                        ${isHighIntensity ? 'TALLENNA KRIITTINEN OIVALLUS' : 'Kirjaa oivallus'}
                    </button>
                </div>
            </div>
        `;

        this.setupButton(chId);
    },

    setupButton(chId) {
        const btn = this.container.querySelector(".insight-btn");
        if (btn) {
            btn.onclick = () => {
                window.EventBus?.emit("reflection:insightSaved", {
                    chapterId: chId,
                    intensityLevel: this.currentIntensity,
                    type: "challenge_completed"
                });
                btn.textContent = "✓ Tallennettu";
                btn.disabled = true;
            };
        }
    }
};

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(ChallengeModule);
}