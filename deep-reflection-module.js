/* ============================================================
   deep-reflection-module.js – EETTISET TARKASTELIJA (V7.0)
   Vastuu: 
   - Eettisen puntarin visualisointi (liukusäätimet)
   - Älykäs kontekstuaalinen kysymysasettelu
   - Bongaa lukijan syventymisen (onDeepFocus)
   ============================================================ */

const DeepReflectionModule = {
    id: "deep_reflection",
    category: "ethics",
    title: "Syväluotaus",
    active: false,
    el: null,

    isAvailable(view) {
        // Syväluotaus on saatavilla reflektio- ja analyysinäkymissä
        return view === "reflection" || view === "analysis";
    },

    render() {
        if (this.el) return this.el;
        this.el = document.createElement("div");
        this.el.className = "module-card reflection-card anim-fade-in";
        this.el.style.cssText = "transition: all 0.5s ease; border-left: 3px solid var(--accent);";
        return this.el;
    },

    /* 🤖 ÄLYKKÄÄT BONGAUKSET */

    onDeepFocus(payload) {
        if (!this.active || !this.el) return;
        // Kun lukija pysähtyy, korostetaan kysymystä hehkulla
        const prompt = this.el.querySelector(".smart-prompt");
        if (prompt) {
            prompt.style.color = "var(--accent-gold)";
            prompt.style.transform = "translateX(5px)";
            setTimeout(() => {
                prompt.style.color = "var(--accent)";
                prompt.style.transform = "translateX(0)";
            }, 2000);
        }
    },

    init() {
        // Kuunnellaan luvun vaihtumista
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
        
        const activeId = window.TextEngine?.getActiveChapterId();
        const ch = window.TextEngine?.getChapterMeta(activeId);
        const state = window.AppState?.data?.reflection || {
            readerValues: { economy: 50, ethics: 50 },
            systemMode: "stable",
            history: { visitedKeywords: {} }
        };

        if (!ch) return;

        const values = state.readerValues;
        const logicPrompt = this.resolvePrompt(state, ch);

        this.el.innerHTML = `
            <h3>${this.title}: ${ch.title}</h3>
            
            <div class="slider-group" style="margin: 1.5rem 0;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#aaa; margin-bottom:8px;">
                    <span>Talous & Tehokkuus</span>
                    <span id="val-economy" style="color:var(--accent); font-weight:bold;">${values.economy}%</span>
                </div>
                <input type="range" min="0" max="100" value="${values.economy}" 
                    class="value-slider" data-type="economy" style="width:100%;">
            </div>

            <div class="slider-group" style="margin: 1.5rem 0;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#aaa; margin-bottom:8px;">
                    <span>Etiikka & Ihmisarvo</span>
                    <span id="val-ethics" style="color:var(--accent); font-weight:bold;">${values.ethics}%</span>
                </div>
                <input type="range" min="0" max="100" value="${values.ethics}" 
                    class="value-slider" data-type="ethics" style="width:100%;">
            </div>

            <p class="smart-prompt" style="margin:25px 0; font-style:italic; color:var(--accent); border-left:2px solid var(--accent-soft); padding-left:15px;">
                ${logicPrompt}
            </p>

            <div class="memory-traces" style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
                <label style="font-size:0.65rem; text-transform:uppercase; color:#666;">Poimittuja käsitteitä:</label>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                    ${Object.keys(state.history?.visitedKeywords || {}).slice(-5).map(k => `
                        <span style="font-size:0.7rem; background:rgba(208,180,140,0.1); color:var(--accent); padding:3px 8px; border-radius:4px;">${k}</span>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindSliders(this.el);
    },

    resolvePrompt(state, ch) {
        const hits = state.history?.visitedKeywords || {};
        if (state.systemMode === "tension" && (hits.kustannus || 0) > 2) {
            return "Olet kohdannut kustannuslogiikan useasti. Onko se alkanut tuntua luonnolliselta?";
        }
        return ch.reflection?.prompt || "Miten tämä luku resonoi arvojesi kanssa?";
    },

    bindSliders(container) {
        container.querySelectorAll(".value-slider").forEach(slider => {
            slider.oninput = (e) => {
                const type = e.target.dataset.type;
                const val = parseInt(e.target.value);
                window.AppState?.updateReflection({ readerValues: { [type]: val } });
                const tag = container.querySelector(`#val-${type}`);
                if (tag) tag.textContent = `${val}%`;
            };
        });
    }
};

window.DeepReflectionModule = DeepReflectionModule;
if (window.ModuleRegistry) window.ModuleRegistry.register(DeepReflectionModule);