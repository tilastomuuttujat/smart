/* ============================================================
   analysis-modules.js – NÄKYMÄ-OHJAAJA (V7.1)
   Vastuu: 
   - Analyysinäkymän elinkaaren koordinointi
   - Datasignaalit Starfieldille luvun analyysidatasta
   - Toimii siltana TextEnginen ja dynaamisten moduulien välillä
   ============================================================ */

const AnalysisModules = {
    id: "analysis_controller",
    category: "core", // Ohjaimet kuuluvat core-kategoriaan

    /**
     * Ilmoittaa Registrylle, että tämä ohjain on aktiivinen vain analyysissä.
     */
    isAvailable(view) {
        return view === "analysis";
    },

    /**
     * PÄIVITYS: Kutsutaan luvun vaihtuessa TAI näkymän vaihtuessa.
     * Huom: Ei tyhjennä innerHTML:ää, antaa Registryn hallita DOM-pinoamista.
     */
    updatePanel(ch, viewMode) {
        if (!ch || viewMode !== "analysis") return;

        console.log("📊 AnalysisController: Päivitetään asiantuntijadata luvulle:", ch.id);

        // 1. Pyydetään Registryä sijoittamaan/päivittämään moduulipino
        // Registry huolehtii, että Anatomy, CognitiveProfile jne. ovat paikoillaan.
        if (window.ModuleRegistry) {
            window.ModuleRegistry.resolvePlacement(viewMode);
        }

        // 2. Välitetään faktuaalinen data Starfield-agentille
        // Tämä data muuttaa tähtikuvion muotoa luvun todisteiden mukaan.
        const factualData = ch.views?.analysis?.data || ch.anatomy?.evidence?.factual;
        if (factualData && window.EventBus) {
            window.EventBus.emit("updateStarfield", { 
                data: factualData,
                chapterId: ch.id 
            });
        }
    },

    /**
     * Ohjain voi myös "bongata" tapahtumia ja välittää ne eteenpäin 
     * dynaamisille alimoduuleille.
     */
    onBongattu(payload) {
        if (payload.type === 'high_tension') {
            console.log("📊 AnalysisController: Huomioitu jännite, ohjataan painopistettä.");
        }
    }
};

// Viedään globaaliksi
window.AnalysisModules = AnalysisModules;

// Rekisteröidään ModuleRegistryyn asiantuntija-agentiksi
if (window.ModuleRegistry) {
    window.ModuleRegistry.register(AnalysisModules);
}