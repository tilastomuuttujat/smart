/* ============================================================
   starfield-module.js – KOGNITIIVINEN AGENTTI (V6.3)
   Korjaus: Lisätty null-tarkistukset canvakselle.
============================================================ */

const StarfieldModule = {
    id: "starfield",
    title: "Kognitiivinen kenttä",
    host: null,
    canvas: null,
    ctx: null,
    concepts: [],
    active: false,
    
    scrollEnergy: 0,
    tensionLevel: 0,

    isAvailable(view) { return true; }, // Aina valmiudessa

    render() {
        if (this.canvas) return this.canvas;
        
        this.canvas = document.createElement("canvas");
        this.canvas.id = "starfield-canvas";
        // Varmistetaan, että se on aina pohjalla
        this.canvas.style.cssText = "position:fixed; inset:0; z-index:0; pointer-events:none; opacity:0.6;";
        
        this.ctx = this.canvas.getContext("2d");
        this.resize(); // Asetetaan koko heti kun canvas on luotu
        return this.canvas;
    },

    init() {
        // 1. BONGAUS: Skrollaus
        window.EventBus?.on("readingStateChanged", (state) => {
            this.scrollEnergy = state.scrollEnergy || 0;
            if (this.scrollEnergy > 0.8) this.triggerTension(0.1);
        });

        // 2. BONGAUS: Luvun vaihto
        window.EventBus?.on("chapter:change", ({ chapterId }) => {
            const ch = window.TextEngine?.getChapterMeta(chapterId);
            if (ch) this.scrambleField(ch);
        });

        // 3. Resizen turvallinen kytkentä
        window.addEventListener("resize", () => {
            if (this.canvas) this.resize();
        });

        console.log("🌌 Starfield-agentti: Tarkkailu aloitettu.");
    },

    /* ===================== ÄLYKÄS LOGIIKKA ===================== */

    scrambleField(chapterData) {
        const tags = chapterData.tags || ["rakenne", "eetos", "valta"];
        this.concepts = tags.map((tag, i) => ({
            label: tag,
            x: Math.random(),
            y: Math.random(),
            targetX: 0.15 + (i / tags.length) * 0.7,
            targetY: 0.3 + Math.random() * 0.4,
            size: 3 + Math.random() * 4,
            opacity: 0
        }));
        this.tensionLevel = 0.2;
    },

    triggerTension(amount) {
        this.tensionLevel = Math.min(1.5, this.tensionLevel + amount);
        if (this.tensionLevel > 1.2) {
            window.EventBus?.emit("shakeStarfield", { intensity: this.tensionLevel });
        }
    },

    /* ===================== PIIRTO-LOOP ===================== */

    draw() {
        if (!this.ctx || !this.canvas) return;
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        const globalTension = this.tensionLevel + (this.scrollEnergy * 0.5);

        this.concepts.forEach((c) => {
            const jitter = globalTension * 5;
            c.x += (c.targetX - c.x) * 0.02 + (Math.random() - 0.5) * jitter * 0.001;
            c.y += (c.targetY - c.y) * 0.02 + (Math.random() - 0.5) * jitter * 0.001;
            c.opacity += (1 - c.opacity) * 0.01;

            const px = c.x * w;
            const py = c.y * h;
            
            this.ctx.beginPath();
            this.ctx.arc(px, py, c.size + globalTension * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = globalTension > 1 ? `rgba(255,100,100,${c.opacity})` : `rgba(208,180,140,${c.opacity})`;
            this.ctx.shadowBlur = 10 + globalTension * 20;
            this.ctx.shadowColor = globalTension > 1 ? "#ff0000" : "#d0b48c";
            this.ctx.fill();

            this.ctx.font = `${10 + globalTension * 2}px Inter, sans-serif`;
            this.ctx.fillStyle = `rgba(255,255,255,${0.4 * c.opacity})`;
            this.ctx.fillText(c.label.toUpperCase(), px + 15, py + 5);
        });

        this.tensionLevel *= 0.99;
    },

    animate() {
        if (!this.active) return;
        this.draw();
        requestAnimationFrame(() => this.animate());
    },

    resize() {
        // TURVATARKISTUS: Ei tehdä mitään, jos render() ei ole vielä luonut canvasta
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    activate() { 
        this.active = true; 
        // Varmistetaan että canvas on olemassa ennen animointia
        if (!this.canvas) this.render();
        this.animate(); 
    },
    
    deactivate() { this.active = false; }
};

window.StarfieldModule = StarfieldModule;
if (window.ModuleRegistry) window.ModuleRegistry.register(StarfieldModule);