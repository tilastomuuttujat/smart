/* ============================================================
   behavior-tracker.js – ÄLYKÄS ANALYYTIKKO-AGENTTI (V5.2)
   Optimointi: Uniikki käyttäjä-ID + Dynaaminen näkymäseuranta
   ============================================================ */

const BehaviorTracker = {
    id: "tracker",
    title: "Analytiikka-ajuri",
    logs: [],
    sessionStart: Date.now(),
    
    // Luodaan tai palautetaan pysyvä uniikki ID tälle selaimelle
    userId: localStorage.getItem("tulkintakone_user_id") || 
            "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36),

    // Google Apps Script Web App URL
    targetUrl: "https://script.google.com/macros/s/AKfycbyrtFHU2E6QcyplYnOGOJWBzbBDERrNkXsbXgCSHXWUD7FtArslNMKUh8d_nvKI4Qs/exec",

    init() {
        // Tallennetaan ID heti muistiin
        localStorage.setItem("tulkintakone_user_id", this.userId);
        
        console.log(`📊 Tracker: Aktivoitu. Käyttäjä-ID: ${this.userId}`);

        // 1. NAVIGOINTI JA VIIPYMÄ
        document.addEventListener("chapterChange", (e) => {
            const duration = this.getDurationSinceLast();
            const chapterId = e.detail.chapterId;
            
            console.log(`📖 Luku vaihtui: ${chapterId} (viipymä: ${duration}s)`);

            this.log("NAVIGATE", { 
                chapterId: chapterId,
                durationSeconds: duration,
                currentView: e.detail.view || "narrative"
            });

            this.updateInterestProfile(chapterId, duration);

            // Lähetetään päivitys Sheetsiin heti kun luku vaihtuu
            this.dispatchData();
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
            // Lähetetään heti, jotta eettinen painotus päivittyy Sheetsiin
            this.dispatchData();
        });
    },

    /* ===================== MIELENKIINNON PROFILOINTI ===================== */

    updateInterestProfile(chapterId, duration) {
        const meta = window.TextEngine?.getChapterMeta(chapterId);
        if (!meta || !meta.tags) return;

        let profile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        
        meta.tags.forEach(tag => {
            const score = Math.min(duration / 30, 5); 
            profile[tag] = (profile[tag] || 0) + score;
        });

        localStorage.setItem("tulkintakone_interest_profile", JSON.stringify(profile));
    },

    /* ===================== LÄHETYS-LOGIIKKA ===================== */

async dispatchData() {
    const logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
    if (logs.length === 0 || this.targetUrl.includes("SINUN_GOOGLE")) return;

    const currentView = window.AppState?.ui?.view || "narrative";
    
    // 🔑 LUODAAN NÄKYMÄKOHTAINEN ID
    // Näin Google Sheets päivittää narratiivi-rivin kun olet narratiivissa 
    // ja analyysi-rivin kun olet analyysissä.
    const viewSpecificId = `${this.userId}_${currentView}`;

    const report = {
        userId: viewSpecificId, 
        origin: window.location.origin,
        timestamp: new Date().toISOString(),
        currentView: currentView,
        summary: this.getSessionSummary(),
        fullLogs: logs 
    };

    try {
        // Käytetään standardia lähetystä, mutta napataan virhe hiljaa jos se on vain CORS-ilmoitus
        fetch(this.targetUrl, {
            method: "POST",
            mode: "no-cors", 
            keepalive: true,
            body: JSON.stringify(report)
        }).then(() => {
            console.log(`✅ Analytiikka (${currentView}) päivitetty.`);
        }).catch(e => {
            // Safari saattaa herjata tästä, vaikka data menee perille
            console.debug("Verkkokutsu lähti matkaan.");
        });

        if (logs.length > 200) localStorage.setItem("tulkintakone_logs", "[]");
        
    } catch (e) {
        console.warn("❌ Tracker: Kriittinen virhe lähetyksessä.", e);
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
                mode: window.AppState?.ui?.view || "narrative"
            }
        };
        this.logs.push(entry);
        this.persist(entry);
    },

    persist(entry) {
        const existing = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        existing.push(entry);
        localStorage.setItem("tulkintakone_logs", JSON.stringify(existing.slice(-300)));
    },

    getSessionSummary() {
        const navLogs = JSON.parse(localStorage.getItem("tulkintakone_logs") || []).filter(l => l.type === "NAVIGATE");
        const interestProfile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        const readerValues = window.AppState?.data?.reflection?.readerValues || { ethics: 50, economy: 50 };
        
        return {
            totalChaptersRead: navLogs.length,
            totalTimeSeconds: Math.round((Date.now() - this.sessionStart) / 1000),
            topInterests: interestProfile,
            finalValues: readerValues
        };
    }
};

window.BehaviorTracker = BehaviorTracker;
BehaviorTracker.init();