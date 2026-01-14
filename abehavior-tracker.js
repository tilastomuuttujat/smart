/* ============================================================================
   behavior-tracker.js – SUODATTAVA ANALYYTIKKO (V8.1 – TURVALLINEN)
============================================================================ */

const BehaviorTracker = {
  id: "tracker",
  sessionStart: Date.now(),
  lastTick: Date.now(),

  lastChapter: null,
  lastView: null,

  userId:
    localStorage.getItem("tulkintakone_user_id") ||
    `user_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`,

  targetUrl:
    "https://script.google.com/macros/s/AKfycbxQ9BqWOQ5kwtbz__-KQAfD_c6Ajy132SSS0dxP39Ch3RvnsULbfu5Pe_oBsb7vsbTa/exec",

  /* ===================== INIT ===================== */

  init() {
    localStorage.setItem("tulkintakone_user_id", this.userId);
    console.log(`📊 Tracker V8.1: alustetaan (${this.userId})`);

    this.onReadingState = this.onReadingState.bind(this);
    this.onChapterChange = this.onChapterChange.bind(this);
    this.onReflection = this.onReflection.bind(this);

    this.bindWhenReady();
  },

  /* ===================== TURVALLINEN SIDONTA ===================== */

  bindWhenReady() {
    if (window.EventBus && window.ModuleRegistry && window.AppState) {
      console.log("📊 Tracker: EventBus valmis – sidotaan tapahtumat");

      EventBus.on("readingStateChanged", this.onReadingState);
      EventBus.on("chapter:change", this.onChapterChange);
      EventBus.on("state:reflectionUpdated", this.onReflection);

      return;
    }

    // Odotetaan seuraavaa tickiä
    setTimeout(() => this.bindWhenReady(), 50);
  },

  /* ===================== TAPAHTUMAT ===================== */

  onReadingState(state) {
    if (!state) return;

    const now = Date.now();
    const dwellMs = now - this.lastTick;
    this.lastTick = now;

    if (state.scrollEnergy === 0 && dwellMs > 8000) {
      ModuleRegistry?.dispatch(
        null,
        "onDeepFocus",
        {
          chapterId: state.chapterId,
          paragraphIndex: state.paragraphIndex,
          dwellMs
        }
      );

      this.log("DEEP_FOCUS", {
        chapterId: state.chapterId,
        paragraphIndex: state.paragraphIndex,
        dwellMs
      });
    }
  },

  onChapterChange({ chapterId }) {
    if (!chapterId) return;

    const duration = this.getDuration();
    const view = AppState?.ui?.view || "narrative";

    if (chapterId === this.lastChapter && view === this.lastView && duration < 2) {
      return;
    }

    this.lastChapter = chapterId;
    this.lastView = view;

    this.log("NAVIGATE", {
      chapterId,
      durationSeconds: duration,
      view
    });

    this.dispatchData();
  },

  onReflection(reflectionState) {
    if (!reflectionState) return;

    this.log("REFLECTION_UPDATE", {
      values: reflectionState.readerValues,
      mode: reflectionState.systemMode
    });

    ModuleRegistry?.dispatch(
      { category: "reflective" },
      "onReflectionShift",
      reflectionState
    );
  },

  /* ===================== LOKITUS ===================== */

  log(type, payload) {
    const entry = {
      ts: new Date().toISOString(),
      type,
      payload,
      context: {
        view: AppState?.ui?.view,
        chapter: AppState?.ui?.activeChapterId
      }
    };

    this.persist(entry);
  },

  persist(entry) {
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
    } catch (_) {
      logs = [];
    }

    logs.push(entry);
    localStorage.setItem(
      "tulkintakone_logs",
      JSON.stringify(logs.slice(-120))
    );
  },

  /* ===================== LÄHETYS ===================== */

  async dispatchData() {
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem("tulkintakone_logs") || "[]");
    } catch (_) {
      logs = [];
    }

    if (!logs.length || this.targetUrl.includes("SINUN_GOOGLE")) return;

    const packet = {
      userId: this.userId,
      sentAt: new Date().toISOString(),
      events: logs
    };

    localStorage.setItem("tulkintakone_logs", "[]");

    try {
      fetch(this.targetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(packet),
        keepalive: true
      });
      console.log(`🚀 Tracker: lähetetty ${logs.length} tapahtumaa`);
    } catch (e) {
      console.warn("❌ Tracker: lähetys epäonnistui", e);
    }
  },

  /* ===================== APU ===================== */

  getDuration() {
    const now = Date.now();
    const sec = Math.round((now - this.lastTick) / 1000);
    this.lastTick = now;
    return sec;
  }
};

window.BehaviorTracker = BehaviorTracker;
BehaviorTracker.init();
