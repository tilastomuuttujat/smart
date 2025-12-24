/* ============================================================
   valueScale-module.js – EETTISET TARKASTELIJA (V7.0)
   Vastuu: 
   - Arvovaa'an visualisointi ja eettinen ohjaus
   - Reagointi ModuleRegistryn dispatch-viesteihin (esim. Deep Focus)
   - Autonomiset interventiot arvovinoumien perusteella
   ============================================================ */

const ValueScaleModule = {
  id: "valueScale",
  title: "Arvovaaka",
  category: "ethics", // 🧠 Tyypitys ModuleRegistrylle
  active: false,
  el: null,
  driftHandled: false,

  /* ===================== 🧠 SIJOITTELULOGIIKKA ===================== */

  isAvailable(viewMode) {
    // Arvovaaka on läsnä reflektio- ja analyysinäkymissä
    return viewMode === "reflection" || viewMode === "analysis";
  },

  render() {
    if (this.el) return this.el;

    this.el = document.createElement("div");
    this.el.className = "module-card value-scale-module";
    this.el.style.cssText = `
        padding: 24px;
        background: rgba(15, 15, 15, 0.4);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
    `;

    this.el.innerHTML = `
      <h3 style="margin-bottom: 20px;">${this.title}</h3>
      <div id="scale-visual-root"></div>
    `;

    return this.el;
  },

  /* ===================== 🤖 ÄLYKÄS DISPATCH-REAKTIOT ===================== */

  /**
   * Reagoi ModuleRegistryn kautta tuleviin asiantuntijaviesteihin.
   */
  onBongattu(payload) {
    if (!this.active || !this.el) return;
    console.log(`⚖️ ValueScale: Bongattu asiantuntija-heräte: ${payload.reason}`);
    
    // Korostetaan moduulia visuaalisesti
    this.el.style.boxShadow = "0 0 15px var(--accent-soft)";
    setTimeout(() => { 
        if(this.el) this.el.style.boxShadow = "none"; 
    }, 2000);
  },

  /**
   * Bongaa lukijan syvän keskittymisen eettisesti latautuneessa kohdassa.
   */
  onDeepFocus(payload) {
    if (!this.active) return;
    console.log("⚖️ ValueScale: Syvä keskittyminen havaittu. Päivitetään analyysi.");
    this.updateUI();
  },

  /* ===================== ELINKAARI ===================== */

  init() {
    window.EventBus?.on("chapter:change", ({ chapterId }) => {
      this.driftHandled = false;
      if (this.active) this.updateUI();
    });

    document.addEventListener('reflectionReady', () => {
      if (this.active) this.updateUI();
    });

    console.log("⚖️ ValueScale: Eettinen tarkastelija valmiudessa.");
  },

  activate() {
    this.active = true;
    this.updateUI();
  },

  deactivate() {
    this.active = false;
  },

  /* ===================== VISUAALINEN JA LOGISET METODIT ===================== */

  updateUI() {
    const root = this.el?.querySelector("#scale-visual-root");
    if (!root) return;

    const state = window.AppState?.data?.reflection ?? {
        readerValues: { economy: 50, ethics: 50 },
        systemMode: "stable"
    };

    const { economy, ethics } = state.readerValues;
    this.checkEthicalDrift(economy, ethics);

    root.innerHTML = `
      <div class="value-scale-container ${state.systemMode === 'tension' ? 'conflict-shimmer' : ''}">
        <div class="scale-bar" style="height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; position: relative; overflow: hidden; margin: 15px 0;">
          <div class="scale-fill ethics" style="width: ${ethics}%; height: 100%; background: var(--accent); position: absolute; left: 0; transition: width 0.8s ease;"></div>
          <div class="scale-fill economy" style="width: ${economy}%; height: 100%; background: rgba(255,255,255,0.2); position: absolute; right: 0; transition: width 0.8s ease;"></div>
        </div>
        <div class="scale-labels" style="display: flex; justify-content: space-between; font-size: 11px; text-transform: uppercase; color: #aaa;">
          <span>Inhimillisyys: ${ethics}%</span>
          <span>Rakenteet: ${economy}%</span>
        </div>
        <p class="scale-hint" style="margin-top: 20px; font-size: 13px; font-style: italic; color: var(--accent-gold);">
          ${this.getHintText(state)}
        </p>
      </div>
    `;
  },

  checkEthicalDrift(economy, ethics) {
    if (economy > 85 && !this.driftHandled) {
      this.driftHandled = true;
      
      // Pyydetään interventiota Registryn kautta
      window.ModuleRegistry?.requestIntervention(this.id, 'NAVIGATE', { 
          chapterId: '008' 
      });
      
      window.ModuleRegistry?.requestIntervention(this.id, 'VIEW_CHANGE', { 
          view: 'analysis' 
      });
    }
  },

  getHintText(state) {
    if (state.systemMode === "tension") return "Järjestelmä havaitsee arvoristiriidan painotuksissasi.";
    if (state.readerValues.economy > 70) return "Painotuksesi siirtyy kohti järjestelmälogiikkaa.";
    return "Arvovaaka on vakaassa tasapainossa.";
  }
};

/* ===================== REKISTERÖINTI ===================== */

window.ValueScaleModule = ValueScaleModule;
if (window.ModuleRegistry) {
  window.ModuleRegistry.register(ValueScaleModule);
}