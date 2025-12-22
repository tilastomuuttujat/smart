/* ============================================================
   starfield-module.js
   Analyysiin sidottu Tilannekuva-moduuli
   ============================================================ */

ModuleRegistry.register({
  id: "starfield",
  title: "Tilannekuva",

  container: null,
  active: false,
  labelTimeout: null,

  /* ============================================================
     INIT
  ============================================================ */

  init() {
  this.container = document.getElementById("starfield");
  if (!this.container) return;

  this.container.style.position = "relative";
  this.container.style.overflow = "hidden";
  this.container.style.display = "none";

  /* Reagoi analyysin vaihtumiseen */
  document.addEventListener("evaluationChanged", () => {
    if (this.active) this.render();
  });

  /* 🔑 OIKEA event + oikea this */
  document.addEventListener("panelModeChange", (e) => {
    const mode = e.detail?.mode;
    if (mode === "analysis") {
      this.activate();
    } else {
      this.deactivate();
    }
  });
},

  /* ============================================================
     AKTIVOINTI
  ============================================================ */

  activate() {
    if (this.active) return;
    this.active = true;
    if (this.container) this.container.style.display = "block";
    this.render();
  },

  deactivate() {
    if (!this.active) return;
    this.active = false;

    if (this.container) {
      this.container.style.display = "none";
      this.container.innerHTML = "";
      this.container.classList.remove("labels-visible");
    }

    clearTimeout(this.labelTimeout);
  },

  /* ============================================================
     RENDER
     ============================================================ */

  render() {
    if (!this.container || !this.active) return;

    // Tyhjennetään säiliö ja nollataan tilat uutta renderöintiä varten
    this.container.innerHTML = "";
    this.container.classList.remove("labels-visible");
    clearTimeout(this.labelTimeout);

    // 🔑 KORJAUS: Haetaan aktiivinen data EvaluationEngineltä
    const evalData = EvaluationEngine.getActive();

    // 🔑 KORJAUS: Navigoidaan syvälle rakenteeseen: versions -> analysis -> anatomy -> evidence -> factual
    // Tuetaan sekä TextEnginen normalisoitua rakennetta että suoraa analyysiobjektia
    const analysis = evalData?.versions?.analysis || evalData;
    const facts = analysis?.anatomy?.evidence?.factual || [];

    // DEBUG: Diagnostiikka konsoliin datavirran varmistamiseksi
    console.log("Starfield render - Faktat:", facts);

    if (!facts || facts.length === 0) {
      this.renderEmptyState();
      return;
    }

    /* 1. Luo tähdet alkuasentoon (yleensä keskelle 50%/50%) */
    facts.forEach((fact, index) => {
      this.createStar(fact, index);
    });

    /* 2. Käynnistä "tehosekoitin" siirtämällä tähdet tavoitepaikkoihin.
       Käytetään requestAnimationFramea varmistamaan, että DOM on päivittynyt ennen animaatiota. */
    requestAnimationFrame(() => {
      const wrappers = this.container.querySelectorAll(".star-wrapper");
      wrappers.forEach(wrapper => {
        // dataset-targetX ja Y on asetettu createStar-metodissa
        if (wrapper.dataset.targetX && wrapper.dataset.targetY) {
          wrapper.style.left = `${wrapper.dataset.targetX}%`;
          wrapper.style.top  = `${wrapper.dataset.targetY}%`;
          wrapper.style.opacity = "1";
        }
      });
    });

    /* 3. Viivästetyt nimet: etiketti-laatikot tulevat näkyviin, kun tähdet ovat asettuneet paikoilleen */
    this.labelTimeout = setTimeout(() => {
      if (this.active && this.container) {
        this.container.classList.add("labels-visible");
      }
    }, 1800);
  },

  /* ============================================================
     YKSITTÄINEN TÄHTI
  ============================================================ */

  createStar(text, index) {
    const starWrapper = document.createElement("div");
    starWrapper.className = "star-wrapper";

    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;

    Object.assign(starWrapper.style, {
      left: "50%",
      top: "50%",
      opacity: "0",
      position: "absolute",
      transition: "all 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    });

    const dot = document.createElement("div");
    dot.className = "star-dot";

    const label = document.createElement("div");
    label.className = "star-label-box";
    label.textContent = text;

    starWrapper.appendChild(dot);
    starWrapper.appendChild(label);

    /* Klikkaus: avaa/sulje etiketti */
    starWrapper.onclick = (e) => {
      e.stopPropagation();
      const isActive = starWrapper.classList.toggle("label-active");
      if (isActive) this.ensureLabelInBounds(label);
    };

    starWrapper.dataset.targetX = x;
    starWrapper.dataset.targetY = y;

    this.container.appendChild(starWrapper);
  },

  /* ============================================================
     TYHJÄ TILA
  ============================================================ */

  renderEmptyState() {
    const msg = document.createElement("div");
    msg.style.cssText = `
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      opacity:.6;
      font-size:.85rem;
    `;
    msg.textContent = "Ei faktapohjaista aineistoa analyysissä.";
    this.container.appendChild(msg);
  },

  /* ============================================================
     ÄLYKÄS RAJOITIN
  ============================================================ */

  ensureLabelInBounds(label) {
    const rect = label.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    if (rect.right > containerRect.right) {
      label.style.left = "auto";
      label.style.right = "15px";
    }
    if (rect.left < containerRect.left) {
      label.style.left = "15px";
      label.style.right = "auto";
    }
    if (rect.bottom > containerRect.bottom) {
      label.style.top = "auto";
      label.style.bottom = "15px";
    }
  }
});
