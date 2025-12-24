/* ============================================================
   narrative-modules.js – DYNAAMINEN ARKKITEHTUURI (V7.0)
   Vastuu: 
   - Tekstisisällön renderöinti ja asiantuntija-ankkurien hallinta
   - Bongaus-viestien koordinointi Registryn kautta
   ============================================================ */

const NarrativeModules = {
    
    /**
     * Renderöi luvun leipätekstin.
     * Lisää kappaleisiin data-ankkurit, joita asiantuntija-moduulit bongaavat.
     */
    renderChapter(ch, view, searchQuery, highlightFn) {
        if (!ch) return document.createElement("div");
        
        const section = document.createElement("section");
        section.className = `chapter anim-fade-in view-${view}`;
        section.dataset.chapterId = ch.id;

        // 1. Otsikko
        const h1 = document.createElement("h1");
        h1.innerHTML = highlightFn(ch.title || `Luku ${ch.id}`, searchQuery);
        section.appendChild(h1);

        // 2. Sisältöversio
        const content = this.resolveContent(ch, view);
        
        if (content && content.body_md) {
            const paragraphs = content.body_md.split(/\r?\n\n/).filter(Boolean);
            paragraphs.forEach((para, index) => {
                const p = document.createElement("p");
                p.innerHTML = highlightFn(para.trim(), searchQuery);
                
                // 🧠 BONGATTAVUUS: Lisätään kappaleindeksi navigointibongausta varten
                p.dataset.paraIndex = index;
                
                // Jos luvulla on määritelty ankkureita, liitetään ne DOMiin
                if (ch.anchors && ch.anchors[index]) {
                    p.dataset.anchorType = ch.anchors[index].type;
                    p.classList.add("expert-anchor");
                }

                section.appendChild(p);
            });
        }
        return section;
    },

    /**
     * Valitsee tekstiversion fallback-logiikalla.
     */
    resolveContent(ch, view) {
        if (!ch.versions) return null;
        if (view === "analysis") return ch.versions.analysis;
        if (view === "reflection") return ch.versions.reflection || ch.versions.analysis;
        return ch.versions.narrative;
    },

    /**
     * Päivittää moduulipinon.
     * Huom: Moduulit reagoivat asiantuntijoina tässä vaiheessa resolvePlacement-kutsulla.
     */
    updateSidePanel(ch, viewMode) {
        if (!ch) return;

        const targetPanel = document.getElementById("moduleStack");
        if (targetPanel) {
            targetPanel.innerHTML = ''; 
            if (window.ModuleRegistry) {
                // Registry hoitaa asiantuntijoiden pinoamisen ja herättämisen
                window.ModuleRegistry.resolvePlacement(viewMode);
            }
        }
    }
};

window.NarrativeModules = NarrativeModules;

/* ===================== REKISTERÖINTI ===================== */

if (window.ModuleRegistry) {
    window.ModuleRegistry.register({
        id: "narrative_controller",
        category: "core",
        init: () => {
            console.log("📖 Narrative: Bongaus-valmius alustettu.");
            
            // 🧠 BONGAUS-REITITYS: 
            // Kun BehaviorTracker huomaa lukijan liikkuvan, NarrativeModules
            // auttaa reitittämään asiantuntijapyynnöt ankkurien perusteella.
            window.EventBus?.on("readingStateChanged", (state) => {
                const ch = window.TextEngine?.getChapterMeta(state.chapterId);
                const anchor = ch?.anchors?.[state.paragraphIndex];
                
                if (anchor && window.ModuleRegistry) {
                    // Registry välittää (dispatch) tiedon vain sille asiantuntijalle, 
                    // jota ankkuri koskee (esim. anatomy tai ethics)
                    window.ModuleRegistry.dispatch({ category: anchor.type }, 'onBongattu', {
                        id: anchor.id,
                        reason: "Lukija saavutti asiantuntija-ankkurin."
                    });
                }
            });
        },
        isAvailable: () => true
    });
}