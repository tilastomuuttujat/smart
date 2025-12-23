/* ============================================================
   valueScale-module.js – AUTONOMINEN NAVIGOINTI-AGENTTI
   Vastuu: Arvovaa'an visualisointi ja eettinen ohjaus.
   ============================================================ */

export const ValueScaleModule = {
  id: "valueScale",
  driftHandled: false, // Estetään toistuvat interventiot samassa luvussa

  render(targetEl, appState) {
    if (!targetEl) return;

    // 1. TURVALLINEN TILA (Synkronoitu AppStaten kanssa)
    const reflection = appState?.data?.reflection || appState?.data?.reflectionState;
    const state = reflection ?? {
        readerValues: { economy: 50, ethics: 50 },
        systemMode: "stable"
    };

    const { economy, ethics } = state.readerValues;

    // 2. 🧠 AUTONOMINEN PÄÄTÖKSENTEKO (Interventio)
    this.checkEthicalDrift(economy, ethics);

    // 3. VISUALISOINTI
    targetEl.innerHTML += `
      <div class="value-scale-container ${state.internalConflict ? 'conflict-shimmer' : ''}">
        <label>Arvovaaka: Järjestelmä vs. Ihminen</label>
        <div class="scale-bar">
          <div class="scale-fill ethics" style="width: ${ethics}%"></div>
          <div class="scale-fill economy" style="width: ${economy}%"></div>
        </div>
        <div class="scale-labels">
          <span>Etiikka: ${ethics}%</span>
          <span>Talous: ${economy}%</span>
        </div>
        <p class="scale-hint">
          ${this.getHintText(state)}
        </p>
      </div>
    `;
  },

  /**
   * 🤖 Tunnistaa lukijan arvovinouman ja pyytää navigointia.
   */
  checkEthicalDrift(economy, ethics) {
    // Jos lukija on valunut ääripäähän (esim. Talous > 85%)
    if (economy > 85 && !this.driftHandled) {
      this.driftHandled = true;
      console.log("🚀 ValueScale: Havaitun talousvinouman vuoksi ehdotetaan haastetta.");
      
      // Pyydetään interventiota: Ohjataan lukija lukuun 008 (esimerkki vastapainosta)
      window.ModuleRegistry?.requestIntervention(this.id, 'NAVIGATE', { 
          chapterId: '008' 
      });
      
      // Samalla voidaan vaihtaa näkymä Analyysiin, jotta lukija näkee faktat
      window.ModuleRegistry?.requestIntervention(this.id, 'VIEW_CHANGE', { 
          view: 'analysis' 
      });
    }
  },

  getHintText(state) {
    if (state.internalConflict) return "Järjestelmä havaitsee arvoristiriidan.";
    if (state.systemMode === "tension") return "Jännite on kriittinen.";
    return "Järjestelmä on vakaassa tilassa.";
  }
};