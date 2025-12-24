/* ============================================================
   cognitive-profile-module.js – ITSENÄINEN AGENTTI (V7.0)
   Vastuu: 
   - Kognitiivisen profiilin (KRM) visualisointi ja tulkinta
   - Itsenäinen lukijan bongaus (Behavior-perusteinen)
   ============================================================ */

const CognitiveProfileModule = {
    id: "cognitive_profile",
    category: "analysis",
    title: "Kognitiivinen profiili",
    active: false,
    el: null,

    isAvailable(view) {
        // Profiili seuraa lukijaa analyysissä ja reflektiossa
        return view === "analysis" || view === "reflection";
    },

    render() {
        if (this.el) return this.el;
        this.el = document.createElement("div");
        this.el.className = "module-card interest-card anim-fade-in";
        this.el.style.cssText = "transition: all 0.5s ease; border-left: 3px solid var(--accent);";
        return this.el;
    },

    /* 🤖 ÄLYKKÄÄT BONGAUKSET */

    onDeepFocus(payload) {
        if (!this.active || !this.el) return;
        this.el.style.boxShadow = "0 0 20px var(--accent-soft)";
        this.updateUI();
        setTimeout(() => { if(this.el) this.el.style.boxShadow = "none"; }, 3000);
    },

    onBongattu(data) {
        if (this.active) this.updateUI();
    },

    init() {
        window.EventBus?.on("chapter:change", () => {
            if (this.active) this.updateUI();
        });
    },

    activate() {
        this.active = true;
        this.updateUI();
    },

    deactivate() { this.active = false; },

    updateUI() {
        if (!this.el) return;
        const profile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        const sortedTags = Object.entries(profile).sort(([, a], [, b]) => b - a).slice(0, 4);
        
        if (sortedTags.length === 0) {
            this.el.innerHTML = `<h4>${this.title}</h4><p class="small-hint">Lue tekstiä kerryttääksesi profiilia...</p>`;
            return;
        }

        const maxVal = Math.max(...Object.values(profile));
        const interpretation = this.getInterpretation(profile);

        this.el.innerHTML = `
            <h4>${this.title}</h4>
            <div class="interpretation-box"><p><em>"${interpretation}"</em></p></div>
            <div class="interest-bars">
                ${sortedTags.map(([tag, val]) => `
                    <div class="interest-row">
                        <div class="interest-info"><span>${tag}</span><span>${Math.round((val/maxVal)*100)}%</span></div>
                        <div class="bar-bg"><div class="bar-fill" style="width: ${(val/maxVal)*100}%"></div></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    getInterpretation(profile) {
        const topTag = Object.entries(profile).sort(([, a], [, b]) => b - a)[0][0];
        if (topTag === "luottamus") return "Painotat järjestelmän eettistä ja inhimillistä kestävyyttä.";
        if (topTag === "velka") return "Analyysisi keskittyy taloudellisiin realiteetteihin ja riskeihin.";
        return `Keskityt tällä hetkellä vahvimmin teemaan ${topTag}.`;
    }
};

window.CognitiveProfileModule = CognitiveProfileModule;
if (window.ModuleRegistry) window.ModuleRegistry.register(CognitiveProfileModule);