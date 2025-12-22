/* ============================================================
    mosaic-module.js – MODULARISOITU VERSIO
    Vastuu: Infografiikoiden haku, sovitus ikkunaan ja siirtymäefektit
   ============================================================ */

export const MosaicModule = {
    id: "mosaic",
    title: "Infografiikka",

    container: null,
    surface: null, // Erillinen taso kuvalle Starfield-tyyliin
    active: false,
    currentChapter: null,
    extensions: ['svg', 'png', 'jpg', 'SVG', 'PNG', 'JPG'],

    /* ===================== INIT ===================== */

    init() {
        this.container = document.getElementById("mosaic-container");
        if (!this.container) return;

        // Luodaan kuvapinta dynaamisesti, jos sitä ei ole valmiina
        if (!this.container.querySelector(".mosaic-image-surface")) {
            const s = document.createElement("div");
            s.className = "mosaic-image-surface";
            this.container.appendChild(s);
        }
        this.surface = this.container.querySelector(".mosaic-image-surface");

        // 1. Kuunnellaan luvun virallista vaihtumista
        document.addEventListener("chapterChange", (e) => {
            if (this.active) this.updateImage(e.detail.chapterId);
        });

        // 2. Kuunnellaan lähestymistä (progressiivinen sumennus)
        document.addEventListener("chapterApproaching", (e) => {
            if (this.active) this.handleApproach(e.detail.progress);
        });

        // Rekisteröidään itsensä globaaliin rekisteriin yhteensopivuuden vuoksi, jos tarpeen
        if (window.ModuleRegistry && typeof window.ModuleRegistry.register === 'function') {
            window.ModuleRegistry.register(this.id, this);
        }
        
        console.log("MosaicModule alustettu.");
    },

    /* ===================== ELINKAARI ===================== */

    activate() {
        this.active = true;
        if (this.container) {
            this.container.style.display = "flex"; 
            this.container.style.opacity = "1";
            const currentId = window.TextEngine?.getActiveChapterId();
            if (currentId) this.updateImage(currentId);
        }
    },

    deactivate() {
        this.active = false;
        if (this.container) {
            this.container.style.display = "none";
            this.container.style.opacity = "0";
            if (this.surface) this.surface.style.filter = "";
        }
    },

    /* ===================== VISUAALINEN LOGIIKKA ===================== */

    handleApproach(progress) {
        if (!this.surface) return;
        // Mitä lähempänä vaihto on, sitä enemmän sumentuu (max 15px)
        const blurAmount = progress * 15;
        this.surface.style.filter = `blur(${blurAmount}px)`;
        this.surface.style.opacity = 1 - (progress * 0.3);
    },

    async updateImage(chapterId) {
        if (this.currentChapter === chapterId) return;
        this.currentChapter = chapterId;

        const meta = window.TextEngine?.getChapterMeta?.(chapterId);
        const placeholder = this.container.querySelector(".mosaic-placeholder");

        // 1. Visuaalinen "lukitus" siirtymän ajaksi
        if (this.surface) this.surface.classList.add("transitioning");

        // 2. Etsitään tiedosto
        const foundUrl = await this.findValidImage(chapterId);

        // 3. Suoritetaan vaihto viiveellä
        setTimeout(() => {
            if (foundUrl && this.surface) {
                this.surface.style.backgroundImage = `url('${foundUrl}')`;
                this.surface.style.display = "block";
                this.container.classList.remove("no-image");
                if (placeholder) placeholder.innerHTML = "";
            } else {
                if (this.surface) this.surface.style.display = "none";
                this.container.classList.add("no-image");
                
                if (placeholder) {
                    placeholder.innerHTML = `
                        <div style="font-size: 1.1rem; font-weight: bold;">Luku ${chapterId}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7; margin: 8px 0;">${meta?.title || ""}</div>
                        <div style="font-size: 0.65rem; opacity: 0.4; letter-spacing: 1.5px; margin-top: 15px;">EI INFOGRAFIIKKAA</div>
                    `;
                }
            }
            
            // 4. Palautetaan terävyys
            if (this.surface) {
                this.surface.classList.remove("transitioning");
                this.surface.style.filter = "blur(0px)";
                this.surface.style.opacity = "1";
            }
        }, 450);
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

// Automaattinen alustus kun moduuli ladataan
MosaicModule.init();