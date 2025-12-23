/* ============================================================
   reflection-modules.js – DYNAAMINEN ORKESTROIJA
   Vastuu: Reflektio-pohjan valmistelu ja agenttien kutsuminen.
   ============================================================ */

/* ============================================================
   ÄLYKÄS KYSYMYSLOGIIKKA (Kontekstuaalinen analyysi)
============================================================ */
function resolvePrompt(state, ch) {
  const history = state.history || {};
  const hits = history.visitedKeywords || {};

  if (state.systemMode === "tension" && (hits.kustannus || 0) > 2) {
    return "Olet kohdannut kustannuslogiikan useasti. Onko se alkanut tuntua luonnolliselta?";
  }

  if ((history.chapterFocus || []).length > 3) {
    return "Tämä teema näyttää pysäyttäneen sinut. Mikä siinä resonoi?";
  }

  return ch.reflection?.prompt || "Miten tämä luku resonoi arvojesi kanssa?";
}

/* ============================================================
   REFLECTION MODULE
============================================================ */
export const ReflectionModules = {
  
  /**
   * Päivittää paneelin tilan luvun vaihtuessa.
   */
  updatePanel(ch, appState) {
    const rPanel = document.getElementById("reflectionPanel");
    if (!rPanel || !ch) return;

    // 1. TURVALLINEN TILA
    const state = appState?.data?.reflection ?? {
      systemMode: "stable",
      readerValues: { economy: 50, ethics: 50 },
      history: { visitedKeywords: {}, chapterFocus: [] }
    };

    // 2. TYHJENNETÄÄN PANEELI JA PYYDETÄÄN AGENTIT
    // Registry hoitaa ValueScale- ja Challenge-moduulien mounttauksen
    rPanel.innerHTML = ''; 

    if (window.ModuleRegistry) {
      window.ModuleRegistry.resolvePlacement("reflection");
    }

    // 3. RAKENNETAAN SISÄLTÖRUNKO (Agentit asettuvat omiin kohtiinsa)
    const card = document.createElement("div");
    card.className = `reflection-card ${state.systemMode === "tension" ? "tension-glow" : ""}`;
    
    // Älykäs kysymys injektoidaan staattisena elementtinä agenttien väliin
    const logicPrompt = resolvePrompt(state, ch);

    card.innerHTML = `
      <h3>Syväluotaus: ${ch.title}</h3>
      <div id="agent-host-valuescale"></div> <p class="smart-prompt" style="
        margin: 20px 0; 
        font-style: italic; 
        color: #d0b48c;
        border-left: 2px solid rgba(208, 180, 140, 0.3);
        padding-left: 15px;
      ">${logicPrompt}</p>
      <div id="agent-host-challenge"></div> `;

    rPanel.appendChild(card);
    
    // 4. DATAN VÄLITYS
    // Ilmoitetaan muille moduuleille, että reflektioympäristö on valmis
    document.dispatchEvent(new CustomEvent('reflectionReady', { 
        detail: { chapterId: ch.id, state: state } 
    }));
  }
};