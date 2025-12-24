/* ============================================================
   behavior-tracker.js – SUODATTAVA ANALYYTIKKO (V7.0)
   Vastuu:
   - Kognitiivinen profilointi ja tyypitys
   - Tuplalokien ja nollatapahtumien suodatus (V7 päivitys)
   - Viipymän (dwell time) muuntaminen moduulikäskyiksi
   ============================================================ */

const BehaviorTracker = {
    id: "tracker",
    title: "Analytiikka-ajuri",
    sessionStart: Date.now(),
    lastLogTime: Date.now(),
    
    // Suodatusmuistit tuplien estoon
    lastSentChapter: null,
    lastSentView: null,
    
    userId: localStorage.getItem("tulkintakone_user_id") || 
            "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36),

    targetUrl: "https://script.google.com/macros/s/AKfycbxQ9BqWOQ5kwtbz__-KQAfD_c6Ajy132SSS0dxP39Ch3RvnsULbfu5Pe_oBsb7vsbTa/exec",

    init() {
        localStorage.setItem("tulkintakone_user_id", this.userId);
        console.log(`📊 Tracker V7.0: Suodattava analyysi aktivoitu. ID: ${this.userId}`);

        // 1. BONGAUS: Lukutilan muutokset
        window.EventBus?.on("readingStateChanged", (state) => {
            this.analyzeDwellTime(state);
        });

        // 2. BONGAUS: Luvun vaihto (Suodattava malli)
        document.addEventListener("chapterChange", (e) => {
            const duration = this.getDurationSinceLast();
            const chapterId = e.detail.chapterId;
            const view = e.detail.view || window.AppState?.ui?.view || "narrative";
            
            // 🧠 ÄLYKÄS SUODATUS: Estetään tuplalokit ja nollakestot samassa näkymässä
            if (chapterId === this.lastSentChapter && view === this.lastSentView && duration < 1) {
                return; 
            }

            this.lastSentChapter = chapterId;
            this.lastSentView = view;

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
     */
    processChapterExpertise(chapterId) {
        const meta = window.TextEngine?.getChapterMeta(chapterId);
        if (!meta) return;

        const scores = meta.scores || { ethics: 0.5, economy: 0.5, complexity: 0.5 };

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
     * Välittää herätteen moduuleille, kun lukija pysähtyy.
     */
    analyzeDwellTime(state) {
        if (state.scrollEnergy === 0) {
            const now = Date.now();
            const dwell = now - this.lastLogTime;

            // Kynnysarvo: 7 sekunnin staattinen tila
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

        const dataToSend = {
            userId: this.userId,
            timestamp: new Date().toISOString(),
            fullLogs: logs
        };
        
        // Tyhjennetään heti estämään kilpajuoksu
        localStorage.setItem("tulkintakone_logs", "[]");

        try {
            fetch(this.targetUrl, {
                method: "POST",
                mode: "no-cors", 
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(dataToSend),
                keepalive: true
            });
            console.log(`🚀 Tracker: Lähetetty ${logs.length} tapahtumaa.`);
        } catch (e) {
            console.warn("❌ Tracker: Lähetys epäonnistui, palautetaan puskuriin.", e);
            const currentLogs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
            localStorage.setItem("tulkintakone_logs", JSON.stringify([...logs, ...currentLogs]));
        }
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
    }
};

window.BehaviorTracker = BehaviorTracker;
BehaviorTracker.init();