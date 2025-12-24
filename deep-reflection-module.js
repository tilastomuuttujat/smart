/* ============================================================
   deep-reflection-module.js – EETTISET TARKASTELIJA (V7.1)
   KORJAUS: Vikasietoinen tilan päivitys
   ============================================================ */

const DeepReflectionModule = {
    // ... (alku kuten aiemmin) ...
    id: "deep_reflection",
    category: "ethics",
    title: "Syväluotaus",
    active: false,
    el: null,

    // ... (isAvailable, render, onDeepFocus, init, activate, deactivate, updateUI, resolvePrompt säilyvät ennallaan) ...
    // Kopioidaan tähän vain muuttuneet osat selkeyden vuoksi:

    bindSliders(container) {
        container.querySelectorAll(".value-slider").forEach(slider => {
            slider.oninput = (e) => {
                const type = e.target.dataset.type;
                const val = parseInt(e.target.value);
                
                // Päivitetään numeerinen näyttö heti (UI-vaste)
                const tag = container.querySelector(`#val-${type}`);
                if (tag) tag.textContent = `${val}%`;

                // 🧠 VIKASIETOINEN PÄIVITYS
                // Jos AppState-metodia ei ole, yritetään suoraa päivitystä tai lokitusta
                if (typeof window.AppState?.updateReflection === "function") {
                    window.AppState.updateReflection({ readerValues: { [type]: val } });
                } else {
                    // Fallback: Päivitetään suoraan dataan jos mahdollista
                    if (window.AppState?.data?.reflection?.readerValues) {
                        window.AppState.data.reflection.readerValues[type] = val;
                    }
                }

                // Ilmoitetaan muille agentille (esim. Starfield värähtää kun arvoja säädetään)
                window.EventBus?.emit("reflection:valueAdjusted", { 
                    type, 
                    value: val,
                    chapterId: window.TextEngine?.getActiveChapterId()
                });
            };
        });
    }
};

// Varmistetaan render-metodin ja muiden sijoittuminen
DeepReflectionModule.isAvailable = function(view) { return view === "reflection" || view === "analysis"; };
DeepReflectionModule.render = function() {
    if (this.el) return this.el;
    this.el = document.createElement("div");
    this.el.className = "module-card reflection-card anim-fade-in";
    this.el.style.cssText = "transition: all 0.5s ease; border-left: 3px solid var(--accent);";
    return this.el;
};

// ... (loppuun rekisteröinti kuten aiemmin) ...
window.DeepReflectionModule = DeepReflectionModule;
if (window.ModuleRegistry) window.ModuleRegistry.register(DeepReflectionModule);