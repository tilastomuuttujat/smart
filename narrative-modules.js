/* ============================================================
   narrative-modules.js – KORJATTU (Quote siirretty paneeliin)
   ============================================================ */
import { MosaicModule } from './mosaic-module.js';

export const NarrativeModules = {
    
    // 1. Renderöidään vain teksti TextAreaan
    renderChapter(ch, view, searchQuery, highlightFn) {
        if (!ch) return document.createElement("div");
        const section = document.createElement("section");
        section.className = "chapter";
        section.dataset.chapterId = ch.id;

        const h1 = document.createElement("h1");
        h1.innerHTML = highlightFn(ch.title || "Nimetön luku", searchQuery);
        section.appendChild(h1);

        const content = this.resolveContent(ch, view);
        if (content?.body_md) {
            // Jaetaan teksti kappaleisiin
            const paragraphs = content.body_md.split(/\r?\n\n/).filter(Boolean);

            paragraphs.forEach((para) => {
                const p = document.createElement("p");
                p.innerHTML = highlightFn(para.trim(), searchQuery);
                section.appendChild(p);
                // 🔑 Quote-nosto poistettu tästä, jotta se ei tule tekstin väliin
            });
        }
        return section;
    },

    resolveContent(ch, view) {
        if (view === "analysis") return ch.versions?.analysis;
        if (view === "reflection") return ch.versions?.reflection || ch.versions?.analysis;
        return ch.versions?.narrative;
    },

    // 2. Päivitetään oikeanpuoleinen paneeli (Mosaic + Quote)
    updateSidePanel(ch) {
        if (!ch) return;

        // Etsitään narratiivipaneeli (aside-elementin sisältä)
        const nPanel = document.getElementById("narrativePanel");
        if (!nPanel) return;

        // Haetaan luvun quote
        const quoteText = ch.quote || ch.views?.quote;

        // Rakennetaan paneelin sisältö: pidetään mosaic-container ja lisätään quote sen alle
        let sideContent = `<div id="mosaic-container"><div class="mosaic-placeholder"></div></div>`;
        
        if (quoteText) {
            sideContent += `
                <div class="aside-quote-box">
                    <blockquote class="aside-pull-quote">${quoteText}</blockquote>
                    <cite class="aside-quote-source">-- ${ch.title}</cite>
                </div>
            `;
        }

        nPanel.innerHTML = sideContent;

        // 3. Hallitaan visuaalisia moduuleja
        const primaryModule = ch.config?.primary_module || "mosaic";
        if (primaryModule === "mosaic" && typeof MosaicModule !== 'undefined' && MosaicModule) {
            // Mosaic-init täytyy kutsua uudestaan, koska innerHTML nollasi containerin
            MosaicModule.init(); 
            MosaicModule.activate();
        } else if (typeof MosaicModule !== 'undefined' && MosaicModule) {
            MosaicModule.deactivate();
        }
    }
};