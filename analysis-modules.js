/* ============================================================
   analysis-modules.js – NÄKYMÄ-OHJAAJA (V7.0)
   Vastuu: 
   - Analyysinäkymän koordinointi (vrt. NarrativeModules)
   - Datasignaalit Starfieldille
   ============================================================ */

const AnalysisModules = {
    id: "analysis_controller",
    
    isAvailable(view) {
        return view === "analysis";
    },

    /**
     * Päivittää analyysinäkymän tilan (Kutsutaan luvun vaihtuessa)
     */
    updatePanel(ch, viewMode) {
        if (!ch || viewMode !== "analysis") return;

        // 1. Pyydetään Registryä sijoittamaan moduulit (mukaan lukien uusi CognitiveProfile)
        if (window.ModuleRegistry) {
            window.ModuleRegistry.resolvePlacement(viewMode);
        }

        // 2. Välitetään faktuaalinen data Starfieldille
        const factualData = ch.views?.analysis?.data || ch.anatomy?.evidence?.factual;
        if (factualData) {
            window.EventBus?.emit("updateStarfield", { data: factualData });
        }
        
        console.log("📊 AnalysisController: Näkymä ja moduulipino päivitetty.");
    }
};

window.AnalysisModules = AnalysisModules;
if (window.ModuleRegistry) window.ModuleRegistry.register(AnalysisModules);