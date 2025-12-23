/* ============================================================
   narrative-modules.js – DYNAAMINEN ARKKITEHTUURI
   Vastuu: Tekstisisällön renderöinti. 
   Moduulien hallinta delegoitu ModuleRegistrylle.
   ============================================================ */

export const NarrativeModules = {
    
    /**
     * Renderöi luvun leipätekstin ja otsikon.
     */
    renderChapter(ch, view, searchQuery, highlightFn) {
        if (!ch) return document.createElement("div");
        
        const section = document.createElement("section");
        section.className = "chapter";
        section.dataset.chapterId = ch.id;

        // Otsikko
        const h1 = document.createElement("h1");
        h1.innerHTML = highlightFn(ch.title || "Nimetön luku", searchQuery);
        section.appendChild(h1);

        // Sisältöversio (narrative/analysis/reflection)
        const content = this.resolveContent(ch, view);
        
        if (content?.body_md) {
            const paragraphs = content.body_md.split(/\r?\n\n/).filter(Boolean);
            paragraphs.forEach((para) => {
                const p = document.createElement("p");
                p.innerHTML = highlightFn(para.trim(), searchQuery);
                section.appendChild(p);
            });
        }
        return section;
    },

    /**
     * Valitsee oikean tekstiversion luvusta.
     */
    resolveContent(ch, view) {
        if (view === "analysis") return ch.versions?.analysis;
        if (view === "reflection") return ch.versions?.reflection || ch.versions?.analysis;
        return ch.versions?.narrative;
    },

    /**
     * Päivittää paneelin tilan. 
     * HUOM: Uudessa arkkitehtuurissa tämä vain tyhjentää host-paneelin.
     * ModuleRegistry täyttää sen dynaamisesti resolvePlacement-kutsulla.
     */
    updateSidePanel(ch, viewMode) {
        if (!ch) return;

        // Etsitään tämänhetkinen host-paneeli (esim. narrativePanel)
        const panelId = `${viewMode}Panel`;
        const targetPanel = document.getElementById(panelId);

        if (targetPanel) {
            // Tyhjennetään paneeli, jotta uudet moduulit voivat "asettua taloksi"
            targetPanel.innerHTML = ''; 
            
            // 🧠 Pyydetään ModuleRegistryä neuvottelemaan moduulien paikat.
            // Registry kutsuu moduulien mount() ja activate() metodeja.
            if (window.ModuleRegistry) {
                window.ModuleRegistry.resolvePlacement(viewMode);
            }
        }
    }
};