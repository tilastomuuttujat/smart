/* ============================================================
   reflection-modules.js – NÄKYMÄ-OHJAAJA (V7.0)
   Vastuu: 
   - Reflektionäkymän koordinointi ja tilan välitys
   ============================================================ */

const ReflectionModules = {
    id: "reflection_controller",

    isAvailable(view) {
        return view === "reflection";
    },

    /**
     * Päivittää reflektionäkymän (Kutsutaan luvun vaihtuessa)
     */
    updatePanel(ch, appState) {
        if (!ch) return;

        // 1. Pyydetään Registryä pinoamaan moduulit (DeepReflection, CognitiveProfile jne.)
        if (window.ModuleRegistry) {
            window.ModuleRegistry.resolvePlacement("reflection");
        }

        // 2. Ilmoitetaan muille moduuleille, että reflektio-tila on päivittynyt
        document.dispatchEvent(new CustomEvent('reflectionReady', { 
            detail: { chapterId: ch.id, state: appState?.data?.reflection } 
        }));
        
        console.log("🕯️ ReflectionController: Näkymäohjaus suoritettu.");
    }
};

window.ReflectionModules = ReflectionModules;
if (window.ModuleRegistry) window.ModuleRegistry.register(ReflectionModules);