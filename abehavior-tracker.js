/* ============================================================================
   behavior-tracker.js – ESSEEKORTTI-ANALYYTIKKO (Penna V1.0)
   – passiivinen, turvallinen, ei oletuksia arkkitehtuurista
============================================================================ */

const BehaviorTracker = {
  id: "penna-tracker",
  sessionStart: Date.now(),
  lastTick: Date.now(),

  activeEssayId: null,
  essayOpenAt: null,

  userId:
    localStorage.getItem("penna_user_id") ||
    `user_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`,

  targetUrl:
    "https://script.google.com/macros/s/AKfycbxQ9BqWOQ5kwtbz__-KQAfD_c6Ajy132SSS0dxP39Ch3RvnsULbfu5Pe_oBsb7vsbTa/exec",

  /* ===================== INIT ===================== */

  init() {
    localStorage.setItem("penna_user_id", this.userId);
    console.log(`📊 Penna Tracker: init (${this.userId})`);

    this.bind();
  },

  /* ===================== SIDONTA ===================== */

  bind() {
    // Esseen avaus (modal)
    document.addEventListener("penna:essayOpened", e => {
      const { essayId } = e.detail || {};
      if (!essayId) return;
      this.onEssayOpen(essayId);
    });

    // Esseen sulkeminen
    document.addEventListener("penna:essayClosed", () => {
      this.onEssayClose();
    });

    // Jako / kopiointi
    document.addEventListener("penna:share", e => {
      const { essayId, method } = e.detail || {};
      if (!essayId) return;
      this.onShare(essayId, method);
    });
  },

  /* ===================== TAPAHTUMAT ===================== */

  onEssayOpen(essayId) {
    // Jos edellinen jäi auki, päätetään se
    if (this.activeEssayId) {
      this.onEssayClose();
    }

    this.activeEssayId = essayId;
    this.essayOpenAt = Date.now();
    this.lastTick = Date.now();

    this.log("ESSAY_OPEN", {
      essayId
    });
  },

  onEssayClose() {
    if (!this.activeEssayId || !this.essayOpenAt) return;

    const durationMs = Date.now() - this.essayOpenAt;
    const durationSec = Math.round(durationMs / 1000);

    // Suodatetaan hyvin lyhyet avaukset
    if (durationSec >= 3) {
      this.log("ESSAY_READ", {
        essayId: this.activeEssayId,
        durationSeconds: durationSec
      });
    }

    this.activeEssayId = null;
    this.essayOpenAt = null;

    this.dispatchData();
  },

  onShare(essayId, method = "unknown") {
    this.log("ESSAY_SHARE", {
      essayId,
      method
    });
  },

  /* ===================== LOKITUS ===================== */

  log(type, payload) {
    const entry = {
      ts: new Date().toISOString(),
      type,
      payload
    };

    this.persist(entry);
  },

  persist(entry) {
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem("penna_logs") || "[]");
    } catch {
      logs = [];
    }

    logs.push(entry);
    localStorage.setItem(
      "penna_logs",
      JSON.stringify(logs.slice(-120))
    );
  },

  /* ===================== LÄHETYS ===================== */

  async dispatchData() {
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem("penna_logs") || "[]");
    } catch {
      logs = [];
    }

    if (!logs.length || this.targetUrl.includes("SINUN_GOOGLE")) return;

    const packet = {
      userId: this.userId,
      sentAt: new Date().toISOString(),
      events: logs
    };

    localStorage.setItem("penna_logs", "[]");

    try {
      fetch(this.targetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(packet),
        keepalive: true
      });
      console.log(`🚀 Penna Tracker: lähetetty ${logs.length} tapahtumaa`);
    } catch (e) {
      console.warn("❌ Penna Tracker: lähetys epäonnistui", e);
    }
  }
};

window.BehaviorTracker = BehaviorTracker;
BehaviorTracker.init();
