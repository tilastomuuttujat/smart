/* ============================================================
   session-engine.js – AGENTTI-YHTEENSOPIVA VERSIO
   Vastuu: Istunnon pysyvyys (Persistence) dynaamisessa ympäristössä.
   ============================================================ */

const SessionEngine = (() => {

  const STORAGE_KEY = "tulkintakone.session.v2";

  /* ===================== TALLENNUS ===================== */

  function collectSessionState() {
    // Haetaan perustilat moottoreista
    const framework = window.FrameworkEngine?.getActiveFramework();
    const mode = window.FrameworkEngine?.getActiveMode();
    const chapterId = window.TextEngine?.getActiveChapterId();

    return {
      timestamp: new Date().toISOString(),
      frameworkId: framework ? framework.id : null,
      mode,
      chapterId,
      // 🧠 Tallennetaan lukijan arvoprofiili, jotta agentit muistavat sen
      readerValues: window.AppState?.data?.reflection?.readerValues || { economy: 50, ethics: 50 }
    };
  }

  function save() {
    try {
      const state = collectSessionState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // console.info("💾 Istunto tallennettu");
    } catch (e) {
      console.error("Session save failed", e);
    }
  }

  /* ===================== PALAUTUS ===================== */

  async function restore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
      const state = JSON.parse(raw);
      console.log("🔄 Palautetaan istuntoa...", state);

      // 1. Palautetaan luku (TextEngine)
      if (state.chapterId && window.TextEngine) {
        await window.TextEngine.loadChapter(state.chapterId);
      }

      // 2. Aktivoidaan kehys (FrameworkEngine)
      if (state.frameworkId && window.FrameworkEngine) {
        await window.FrameworkEngine.activateFramework(state.frameworkId);
      }

      // 3. Asetetaan analyysimoodi
      if (state.mode && window.FrameworkEngine) {
        window.FrameworkEngine.setMode(state.mode);
      }

      // 4. 🧠 Palautetaan agenttien muisti (AppState)
      if (state.readerValues && window.AppState) {
        window.AppState.data.reflection.readerValues = state.readerValues;
      }

      // 5. Käsketään moduuleja neuvottelemaan paikoista palautuksen jälkeen
      const currentView = window.AppState?.ui?.view || "narrative";
      window.ModuleRegistry?.resolvePlacement(currentView);

      return true;
    } catch (e) {
      console.error("Session restore failed", e);
      return false;
    }
  }

  /* ===================== AUTOMAATTINEN TALLENNUS ===================== */

  function enableAutoSave() {
    // Tallennetaan aina kun kehys tai moodi muuttuu
    window.FrameworkEngine?.subscribe(() => save());

    // Tallennetaan kun luku vaihtuu
    document.addEventListener("chapterChange", () => save());

    // Tallennetaan kun lukija tekee arvovalintoja (agenttien muisti)
    window.EventBus?.on("reflection:insightSaved", () => save());
  }

  return {
    save,
    restore,
    enableAutoSave,
    clear: () => localStorage.removeItem(STORAGE_KEY)
  };

})();

window.SessionEngine = SessionEngine;