/* ============================================================
   behavior-tracker.js – ÄLYKÄS ANALYYTIKKO-AGENTTI (V4)
   Vastuu: 
   - Käyttäytymisdatan kerääminen
   - Mielenkiintoprofiilin laskenta
   - Datan lähetys Google Sheetsiin
   ============================================================ */

export const BehaviorTracker = {
    id: "tracker",
    title: "Analytiikka-ajuri",
    logs: [],
    sessionStart: Date.now(),
    
    // Google Apps Script Web App URL - LIITÄ TÄHÄN OMASI
    targetUrl: "https://script.google.com/macros/s/AKfycbwZj8fsyMdGwpmjjtdzpaSNhDXPHnKVTyfGov3Clw2IM9SyjihXQETXLj2BMbb7rPgn/exec",

    async dispatchData() {
        const logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        // Jos osoite on vielä oletus, ei lähetetä
        if (logs.length === 0 || this.targetUrl.includes("SINUN_GOOGLE")) return;

        const report = {
            origin: window.location.origin,
            timestamp: new Date().toISOString(),
            summary: this.getSessionSummary(),
            fullLogs: logs 
        };

        // Lähetetään data Googlelle
        fetch(this.targetUrl, {
            method: "POST",
            mode: "no-cors", // Tärkeä Sheetsin kanssa
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(report)
        });



    getPreferredPanel() { return null; },
    mount() { return; },

    init() {
        console.log("📊 Tracker: Analytiikka ja lähetysvalmius aktivoitu.");

        // 1. NAVIGOINTI JA VIIPYMÄ
        document.addEventListener("chapterChange", (e) => {
            const duration = this.getDurationSinceLast();
            const chapterId = e.detail.chapterId;
            
            this.log("NAVIGATE", { 
                chapterId: chapterId,
                durationSeconds: duration
            });

            // Päivitetään mielenkiintoprofiili viipymän perusteella
            this.updateInterestProfile(chapterId, duration);
        });

        // 2. KOGNITIIVINEN KUORMA
        window.EventBus?.on("ui:interventionStarted", (data) => {
            this.log("COGNITIVE_OVERLOAD", { 
                type: data.type, 
                intensity: data.score 
            });
        });

        // 3. EETTISET VALINNAT
        window.EventBus?.on("reflection:insightSaved", (data) => {
            this.log("ETHICAL_ACTION", {
                chapterId: data.chapterId,
                currentValues: window.AppState?.data?.reflection?.readerValues
            });
        });

        // 4. HAKUKÄYTTÄYTYMISTÄ
        window.EventBus?.on("ui:searchPerformed", (data) => {
            this.log("SEARCH", { query: data.query });
        });
    },

    /* ===================== MIELENKIINNON PROFILOINTI ===================== */

    updateInterestProfile(chapterId, duration) {
        const meta = window.TextEngine?.getChapterMeta(chapterId);
        if (!meta || !meta.tags) return;

        let profile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        
        meta.tags.forEach(tag => {
            // Lisätään pisteitä viipymän mukaan (max 5 pistettä per luku)
            const score = Math.min(duration / 30, 5); 
            profile[tag] = (profile[tag] || 0) + score;
        });

        localStorage.setItem("tulkintakone_interest_profile", JSON.stringify(profile));
    },

    /* ===================== LÄHETYS-LOGIIKKA ===================== */

    async dispatchData() {
        const logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        if (logs.length === 0 || this.targetUrl.includes("SINUN_GOOGLE")) return;

        const report = {
            origin: window.location.origin,
            timestamp: new Date().toISOString(),
            summary: this.getSessionSummary(),
            fullLogs: logs 
        };

        try {
            // Käytetään keepalive: true, jotta lähetys ei keskeydy sivun sulkeutuessa
            await fetch(this.targetUrl, {
                method: "POST",
                mode: "no-cors", 
                keepalive: true,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(report)
            });
            
            console.log("📊 Analytiikka lähetetty pilveen.");
            localStorage.setItem("tulkintakone_logs", "[]");
        } catch (e) {
            console.warn("Tracker: Lähetys epäonnistui.", e);
        }
    },

    /* ===================== APUFUNKTIOT ===================== */

    lastLogTime: Date.now(),
    getDurationSinceLast() {
        const now = Date.now();
        const diff = Math.round((now - this.lastLogTime) / 1000);
        this.lastLogTime = now;
        return diff;
    },

    log(type, payload) {
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: type,
            data: payload,
            context: {
                framework: window.FrameworkEngine?.getActiveFramework()?.id,
                mode: window.FrameworkEngine?.getActiveMode()
            }
        };
        this.logs.push(entry);
        this.persist(entry);
    },

    persist(entry) {
        const existing = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        existing.push(entry);
        localStorage.setItem("tulkintakone_logs", JSON.stringify(existing.slice(-500)));
    },

    getSessionSummary() {
        const navLogs = this.logs.filter(l => l.type === "NAVIGATE");
        const interestProfile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        
        return {
            totalChaptersRead: navLogs.length,
            totalTimeSeconds: Math.round((Date.now() - this.sessionStart) / 1000),
            topInterests: interestProfile,
            finalValues: window.AppState?.data?.reflection?.readerValues
        };
    }
};

if (window.ModuleRegistry) window.ModuleRegistry.register(BehaviorTracker);