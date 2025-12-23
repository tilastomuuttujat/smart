/* ============================================================
   mosaic-module.js – DYNAAMINEN AGENTTI-VERSIO
   Vastuu: Infografiikoiden dynaaminen haku ja injektio.
   ============================================================ */

export const MosaicModule = {
    id: "mosaic",
    title: "Infografiikka",
    host: null,
    surface: null,
    active: false,
    currentChapter: null,
    extensions: ['svg', 'png', 'jpg', 'SVG', 'PNG', 'JPG'],

    /* ===================== 🧠 DYNAAMINEN SIJOITTUMINEN ===================== */

    getPreferredPanel(viewMode) {
        // Mosaic viihtyy ensisijaisesti narratiivipaneelissa tuomassa visuaalisuutta
        if (viewMode === "narrative") return "narrativePanel";
        // Voi näkyä myös analyysissä, jos tilaa on
        if (viewMode === "analysis") return "analysisPanel";
        return null;
    },

    mount(targetEl) {
        if (!targetEl || this.host === targetEl) return;
        
        console.log(`🖼️ Mosaic: Kiinnitetään isäntään: ${targetEl.id}`);
        this.host = targetEl;

        // Luodaan tarvittava HTML-rakenne isännän sisälle
        // Huom: Käytetään wrapperia, jotta ei ylikirjoiteta koko paneelia jos siellä on muuta
        const wrapper = document.createElement("div");
        wrapper.id = "mosaic-container";
        wrapper.style.width = "100%";
        wrapper.style.height = "300px"; // Oletuskorkeus
        wrapper.style.position = "relative";
        wrapper.style.overflow = "hidden";
        
        const s = document.createElement("div");
        s.className = "mosaic-image-surface";
        s.style.cssText = `
            width: 100%;
            height: 100%;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            transition: all 0.5s ease-in-out;
        `;
        
        wrapper.appendChild(s);
        this.host.appendChild(wrapper);
        this.surface = s;
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Älykäs hermoverkko-reaktio (kuunnellaan jännitettä)
        document.addEventListener('contextUpdate', (e) => {
            if (!this.active || !this.surface) return;
            const { systemMode } = e.detail;
            
            if (systemMode === 'tension') {
                this.surface.style.filter = 'sepia(0.8) hue-rotate(-30deg) saturate(1.5) blur(0.5px)';
            } else {
                this.surface.style.filter = 'none';
            }
        });

        // Kuunnellaan luvun vaihtumista
        document.addEventListener("chapterChange", (e) => {
            if (this.active) this.updateImage(e.detail.chapterId);
        });
    },

    activate() {
        this.active = true;
        const currentId = window.TextEngine?.getActiveChapterId();
        if (currentId) this.updateImage(currentId);
    },

    deactivate() {
        this.active = false;
        if (this.host) {
            this.host.innerHTML = ''; // Siivotaan dynaaminen sisältö
        }
        this.surface = null;
        this.host = null;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    async updateImage(chapterId) {
        if (this.currentChapter === chapterId || !this.surface) return;
        this.currentChapter = chapterId;

        this.surface.style.opacity = "0";
        this.surface.style.transform = "scale(0.95)";

        const foundUrl = await this.findValidImage(chapterId);

        setTimeout(() => {
            if (foundUrl && this.surface) {
                this.surface.style.backgroundImage = `url('${foundUrl}')`;
                this.surface.style.opacity = "1";
                this.surface.style.transform = "scale(1)";
            }
        }, 300);
    },

    async findValidImage(id) {
        const chapterId = String(id).padStart(3, "0");
        for (const ext of this.extensions) {
            const url = `images/${chapterId}.${ext}`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) return url;
            } catch (e) { continue; }
        }
        return null;
    }
};

if (window.ModuleRegistry) {
    window.ModuleRegistry.register(MosaicModule);
}