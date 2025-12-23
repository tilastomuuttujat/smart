/* ============================================================
   starfield-module.js – DYNAAMINEN AGENTTI-VERSIO
   Vastuu: Itsenäinen visualisointi ja dynaaminen sijoittuminen.
   ============================================================ */

export const StarfieldModule = {
    id: "starfield",
    title: "Tähtikenttä",
    host: null,
    canvas: null,
    ctx: null,
    stars: [],
    active: false,
    intensity: 1,
    interventionActive: false,

    // 🧠 1. ILMOITTAA PREFERENSSIN (Missä moduuli haluaa näkyä)
    getPreferredPanel(viewMode) {
        // Jos jännite on äärimmäisen korkea, Starfield haluaa dominoida narratiivia
        const score = window.AppState?.data?.reflection?.history?.intensityScore || 0;
        if (score > 120 && viewMode === "narrative") return "narrativePanel";
        
        // Oletuspaikka analyysinäkymässä
        if (viewMode === "analysis") return "analysisPanel";
        
        return null; // Muissa tapauksissa moduuli pysyy piilossa
    },

    // 🧠 2. MOUNT-METODI (Injektoidaan annettuun paneeliin)
    mount(targetEl) {
        if (!targetEl || this.host === targetEl) return;
        
        console.log(`⭐ Starfield: Kiinnitetään isäntään: ${targetEl.id}`);
        this.host = targetEl;
        
        // Luodaan canvas dynaamisesti isännän sisälle
        this.host.innerHTML = ''; // Tyhjennetään isäntä
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.display = "block";
        this.host.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext("2d");
        this.resize();
    },

    init() {
        document.addEventListener('contextUpdate', (e) => {
            if (this.active) this.processIntelligence(e.detail);
        });
        
        window.addEventListener('resize', () => this.resize());
        console.log("⭐ Starfield: Agentti alustettu.");
    },

    activate() {
        if (!this.canvas) return;
        this.active = true;
        if (this.stars.length === 0) this.createStars();
        this.animate();
    },

    deactivate() {
        this.active = false;
        this.handleIntervention(false);
        if (this.host) this.host.innerHTML = ''; // Siivotaan jäljet
        this.canvas = null;
        this.host = null;
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.host.clientWidth;
        this.canvas.height = this.host.clientHeight;
        this.createStars();
    },

    processIntelligence(state) {
        const score = state.history?.intensityScore || 0;
        this.intensity = 1 + (score / 25);
        
        if (score > 90 && !this.interventionActive) {
            this.handleIntervention(true);
        } else if (score < 70 && this.interventionActive) {
            this.handleIntervention(false);
        }
    },

    handleIntervention(start) {
        this.interventionActive = start;
        window.ModuleRegistry?.requestIntervention(this.id, 'VISUAL_EFFECT', {
            target: 'body',
            filter: start ? 'blur(1.2px) saturate(0.8)' : 'none',
            transition: 'filter 2s ease'
        });
    },

    createStars() {
        if (!this.canvas) return;
        const count = 200;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.stars = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            z: Math.random() * w,
            o: Math.random()
        }));
    },

    animate() {
        if (!this.active) return;
        this.draw();
        requestAnimationFrame(() => this.animate());
    },

    draw() {
        if (!this.ctx || !this.canvas) return;
        const { width, height } = this.canvas;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(0, 0, width, height);

        this.stars.forEach(s => {
            s.z -= this.intensity * 2;
            if (s.z <= 0) s.z = width;
            const sx = (s.x - width / 2) * (width / s.z) + width / 2;
            const sy = (s.y - height / 2) * (width / s.z) + height / 2;
            const size = (1 - s.z / width) * 3;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${s.o})`;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
};

if (window.ModuleRegistry) window.ModuleRegistry.register(StarfieldModule);