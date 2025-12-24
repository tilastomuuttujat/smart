/* ============================================================
   behavior-tracker.js – KOGNITIIVINEN ANALYYTIKKO (V6.0)
   Vastuu:
   - Lukijan kognitiivinen profilointi ja tyypitys
   - Keskitetty "bongaus-reititys" ModuleRegistryn kautta
   - Viipymän (dwell time) muuntaminen moduulikäskyiksi
   ============================================================ */

const BehaviorTracker = {
    id: "tracker",
    title: "Analytiikka-ajuri",
    logs: [],
    sessionStart: Date.now(),
    lastLogTime: Date.now(),
    
    userId: localStorage.getItem("tulkintakone_user_id") || 
            "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36),

    targetUrl: "https://script.google.com/macros/s/AKfycbyrtFHU2E6QcyplYnOGOJWBzbBDERrNkXsbXgCSHXWUD7FtArslNMKUh8d_nvKI4Qs/exec",

    init() {
        localStorage.setItem("tulkintakone_user_id", this.userId);
        console.log(`📊 Tracker: Kognitiivinen analyysi aktivoitu. ID: ${this.userId}`);

        // 1. BONGAUS: Lukutilan muutokset (Skrollaus & Kappaleet)
        window.EventBus?.on("readingStateChanged", (state) => {
            this.analyzeDwellTime(state);
        });

        // 2. BONGAUS: Luvun vaihto ja tyypitys
        document.addEventListener("chapterChange", (e) => {
            const duration = this.getDurationSinceLast();
            const chapterId = e.detail.chapterId;
            const view = e.detail.view || window.AppState?.ui?.view || "narrative";
            
            // Tyypitetään luku ja välitetään asiantuntijuus-pyynnöt
            this.processChapterExpertise(chapterId);

            this.log("NAVIGATE", { 
                chapterId: chapterId,
                durationSeconds: duration,
                currentView: view
            });

            this.updateInterestProfile(chapterId, duration);
            this.dispatchData();
        });

        // 3. BONGAUS: Eettiset valinnat
        window.EventBus?.on("reflection:insightSaved", (data) => {
            this.log("ETHICAL_ACTION", {
                chapterId: data.chapterId,
                currentValues: window.AppState?.data?.reflection?.readerValues
            });
            this.dispatchData();
        });
    },

    /**
     * 🤖 ASIANTUNTIJUUDEN REITYTYS
     * Jakaa luvun parametrit moduuleille näkökulmakysymyksinä.
     */
    processChapterExpertise(chapterId) {
        const meta = window.TextEngine?.getChapterMeta(chapterId);
        if (!meta) return;

        // Määritellään luvun painopisteet (esim. tyypitys datasta)
        const scores = meta.scores || { ethics: 0.5, economy: 0.5, complexity: 0.5 };

        console.log(`🧠 Tracker: Reititetään asiantuntijuus luvulle ${chapterId}`, scores);

        // Välitetään pyynnöt ModuleRegistryn kautta kategorioittain
        if (scores.ethics > 0.7) {
            window.ModuleRegistry?.dispatch({ category: 'ethics' }, 'onBongattu', { 
                type: 'high_tension', 
                reason: 'Eettinen lataus korkea' 
            });
        }

        if (scores.complexity > 0.7) {
            window.ModuleRegistry?.dispatch({ id: 'starfield' }, 'triggerTension', 0.3);
        }
    },

    /**
     * ⏱️ VIIPYMÄANALYYSI (Dwell Time)
     * Bongaa, jos lukija pysähtyy tärkeään kohtaan.
     */
    analyzeDwellTime(state) {
        // Jos lukija on pysähtynyt (scrollEnergy on nolla)
        if (state.scrollEnergy === 0) {
            const now = Date.now();
            const dwell = now - this.lastLogTime;

            // Jos viipymä ylittää 7 sekuntia tietyssä kappaleessa
            if (dwell > 7000) {
                window.ModuleRegistry?.dispatch(null, 'onDeepFocus', { 
                    paragraphIndex: state.paragraphIndex,
                    chapterId: state.chapterId
                });
            }
        }
    },

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

    async dispatchData() {
        const logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        if (logs.length === 0 || this.targetUrl.includes("SINUN_GOOGLE")) return;

        const report = {
            userId: this.userId, 
            timestamp: new Date().toISOString(),
            summary: this.getSessionSummary(),
            fullLogs: logs 
        };

        try {
            fetch(this.targetUrl, {
                method: "POST",
                mode: "no-cors", 
                keepalive: true,
                body: JSON.stringify(report)
            });
            if (logs.length > 50) localStorage.setItem("tulkintakone_logs", "[]");
        } catch (e) { console.warn("❌ Tracker: Lähetysvirhe."); }
    },

    getDurationSinceLast() {
        const now = Date.now();
        const diff = Math.round((now - this.lastLogTime) / 1000);
        this.lastLogTime = now;
        return diff;
    },

    log(type, payload) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: type,
            data: payload,
            context: {
                view: window.AppState?.ui?.view || "narrative",
                chapter: window.AppState?.ui?.activeChapterId
            }
        };
        this.persist(entry);
    },

    persist(entry) {
        const existing = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
        existing.push(entry);
        localStorage.setItem("tulkintakone_logs", JSON.stringify(existing.slice(-100)));
    },

    getSessionSummary() {
        const interestProfile = JSON.parse(localStorage.getItem("tulkintakone_interest_profile") || "{}");
        return {
            totalTimeSeconds: Math.round((Date.now() - this.sessionStart) / 1000),
            topInterests: interestProfile
        };
    }
};

window.BehaviorTracker = BehaviorTracker;
BehaviorTracker.init();