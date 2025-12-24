/* ============================================================
   mosaic-module.js – DYNAAMINEN AGENTTI-VERSIO (V6.1)
   Vastuu: Infografiikoiden dynaaminen haku ja injektio.
   ============================================================ */

const MosaicModule = {
    id: "mosaic",
    title: "Infografiikka",
    active: false,
    currentChapter: null,
    el: null, // Pysyvä elementti
    surface: null,
    extensions: ['svg', 'png', 'jpg', 'SVG', 'PNG', 'JPG'],

    /* ===================== 🧠 SIJOITTELULOGIIKKA ===================== */

    isAvailable(viewMode) {
        // Mosaic näytetään narratiivi- ja analyysinäkymissä
        return viewMode === "narrative" || viewMode === "analysis";
    },

    /**
     * ModuleRegistry V2.3 vaatii render-metodin, joka palauttaa moduulin elementin.
     */
    render() {
        if (this.el) return this.el;

        // Luodaan moduulikortti
        this.el = document.createElement("div");
        this.el.className = "module-card mosaic-module-container";
        this.el.style.cssText = `
            width: 100%;
            min-height: 200px;
            position: relative;
            overflow: hidden;
            background: rgba(15, 15, 15, 0.4);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 15px;
        `;

        // Otsikko
        const header = document.createElement("h3");
        header.textContent = this.title;
        header.style.marginBottom = "15px";
        this.el.appendChild(header);
        
        // Kuvan pinta
        this.surface = document.createElement("div");
        this.surface.className = "mosaic-image-surface";
        this.surface.style.cssText = `
            width: 100%;
            height: 250px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
            opacity: 0;
        `;
        
        this.el.appendChild(this.surface);
        return this.el;
    },

    /* ===================== ELINKAARI ===================== */

    init() {
        // Hermoverkko-reaktio jännitteeseen (tension)
        document.addEventListener('contextUpdate', (e) => {
            if (!this.active || !this.surface) return;
            const { systemMode } = e.detail;
            
            this.surface.style.filter = (systemMode === 'tension') 
                ? 'sepia(0.8) hue-rotate(-30deg) saturate(1.5) contrast(1.1)' 
                : 'none';
        });

        // Kuunnellaan luvun vaihtumista EventBusin kautta
        window.EventBus?.on("chapter:change", ({ chapterId }) => {
            if (this.active) this.updateImage(chapterId);
        });
        
        console.log("🖼️ Mosaic: Agentti valmiudessa.");
    },

    activate() {
        this.active = true;
        const currentId = window.TextEngine?.getActiveChapterId();
        if (currentId) this.updateImage(currentId);
    },

    deactivate() {
        this.active = false;
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    async updateImage(chapterId) {
        if (this.currentChapter === chapterId || !this.surface) return;
        this.currentChapter = chapterId;

        // Häivytys ennen uutta kuvaa
        this.surface.style.opacity = "0";
        this.surface.style.transform = "scale(0.97)";

        const foundUrl = await this.findValidImage(chapterId);

        setTimeout(() => {
            if (foundUrl && this.surface) {
                this.surface.style.backgroundImage = `url('${foundUrl}')`;
                this.surface.style.opacity = "1";
                this.surface.style.transform = "scale(1)";
            } else if (this.surface) {
                // Jos kuvaa ei löydy, piilotetaan moduuli kortteineen
                this.el.style.display = "none";
            }
        }, 300);
    },

    async findValidImage(id) {
        const chapterId = String(id).padStart(3, "0");
        for (const ext of this.extensions) {
            const url = `images/${chapterId}.${ext}`;
            try {
                // Tarkistetaan tiedoston olemassaolo ilman koko latausta
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) return url;
            } catch (e) { continue; }
        }
        return null;
    }
};

// Varmistetaan globaali näkyvyys iPad-ympäristössä
window.MosaicModule = MosaicModule;

// Rekisteröidään moduuli keskitettyyn rekisteriin
if (window.ModuleRegistry) {
    window.ModuleRegistry.register(MosaicModule);
}