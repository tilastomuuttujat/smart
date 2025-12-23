/* ============================================================
   anatomy-module.js – DYNAAMINEN AGENTTI-VERSIO
   Vastuu: Tekstin rakenteellinen purku (teesit, päätelmät).
   ============================================================ */

export const AnatomyModule = {
    id: "anatomy",
    title: "Tekstin anatomia",
    host: null,
    active: false,

    /* ===================== 🧠 DYNAAMINEN SIJOITTUMINEN ===================== */

    getPreferredPanel(viewMode) {
        // Anatomia on analyysinäkymän ydin, mutta voi tarvittaessa
        // nousta esiin reflektiossa, jos lukija kaipaa faktoja.
        if (viewMode === "analysis") return "analysisPanel";
        if (viewMode === "reflection") return "reflectionPanel";
        return null;
    },

    mount(targetEl) {
        if (!targetEl || this.host === targetEl) return;
        
        console.log(`🧬 Anatomy: Kiinnitetään isäntään: ${targetEl.id}`);
        this.host = targetEl;

        // Luodaan dynaaminen säiliö anatomian korostuksille
        const anatomyTarget = document.createElement("div");
        anatomyTarget.id = "anatomy-target";
        anatomyTarget.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            border-left: 1px solid rgba(255,255,255,0.1);
            animation: fadeIn 0.5s ease-out;
        `;
        
        // Sijoitetaan paneelin alkuun (prepend), jotta se on näkyvissä heti
        this.host.prepend(anatomyTarget);
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Kuunnellaan luvun vaihtumista, jotta anatomia päivittyy lennosta
        document.addEventListener("chapterChange", () => {
            if (this.active) this.render();
        });
        console.log("🧬 Anatomy: Agentti valmiudessa.");
    },

    activate(ctx) {
        this.active = true;
        this.render(ctx?.framework, ctx?.mode || "describe");
    },

    deactivate() {
        this.active = false;
        if (this.host) {
            this.host.innerHTML = ''; 
        }
        this.host = null;
    },

    onModeChange(mode, framework) {
        if (this.active) this.render(framework, mode);
    },

    /* ===================== RENDERÖINTI ===================== */

    render(framework, mode = "describe") {
        const container = this.host?.querySelector("#anatomy-target");
        if (!container) return;

        const activeChapter = window.TextEngine ? 
            window.TextEngine.getChapterMeta(window.TextEngine.getActiveChapterId()) : null;
        const anatomy = activeChapter?.anatomy;

        if (!anatomy) {
            container.innerHTML = "";
            return;
        }

        let label = "";
        let content = "";

        // Valitaan sisältö analyysitilan mukaan
        switch(mode) {
            case "interpret":
                label = "Johtopäätös";
                content = anatomy.conclusions?.explicit?.[0] || "Ei eksplisiittistä johtopäätöstä.";
                break;
            case "hypothesis":
                label = "Piilevä vaikutus";
                content = anatomy.conclusions?.implicit?.[0] || "Ei tunnistettua implisiittistä vaikutusta.";
                break;
            default: // "describe"
                label = "Keskeinen teesi";
                content = anatomy.main_thesis;
        }

        if (content) {
            container.innerHTML = `
                <div class="anatomy-highlight-box" style="
                    background: rgba(255, 255, 255, 0.05);
                    padding: 12px;
                    border-radius: 4px;
                ">
                    <div class="anatomy-label" style="
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #d0b48c;
                        margin-bottom: 5px;
                    ">${label}</div>
                    <div class="anatomy-content" style="
                        font-size: 14px;
                        line-height: 1.4;
                        color: rgba(255,255,255,0.9);
                    ">${content}</div>
                </div>
            `;
        }
    }
};

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(AnatomyModule);
}