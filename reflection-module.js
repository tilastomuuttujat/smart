/* ============================================================
   reflection-module.js (Dynaaminen Anatomy-versio)
   Vastuu: Näyttää AI-analyysin anatomian ja kehyskohtaisen ohjeen
   ============================================================ */

ModuleRegistry.register({
  id: "reflection",
  title: "Reflektio",

  init() {
    this.container = document.getElementById("reflection");
    if (!this.container) return;
    this.container.style.display = "none";

    // Kuunnellaan analyysin vaihtumista
    document.addEventListener("evaluationChanged", (e) => {
      this.refresh();
    });
  },

  activate({ framework, mode }) {
    if (!this.container) return;
    this.container.style.display = "block";
    this.refresh();
  },

  onModeChange(mode, framework) {
    this.refresh();
  },

  refresh() {
    const fw = FrameworkEngine.getActiveFramework();
    const mode = FrameworkEngine.getActiveMode();
    if (fw && mode) this.render(fw, mode);
  },

  render(framework, mode) {
    if (!this.container || !framework) return;
    this.container.innerHTML = "";

    const evalData = EvaluationEngine.getActive();

    // 1. NÄYTETÄÄN ANATOMIASTA NOUTETTU SISÄLTÖ (Dynaaminen)
    if (evalData && evalData.anatomy) {
      this.renderAnatomySection(evalData.anatomy, mode);
    } 
    // Fallback: vanha body_md jos anatomiaa ei ole
    else if (evalData && evalData.body_md) {
      const p = document.createElement("p");
      p.style.fontStyle = "italic";
      p.textContent = evalData.body_md.slice(0, 200) + "...";
      this.container.appendChild(p);
    }

    // 2. NÄYTETÄÄN KEHYSOHJE (Staattinen frameworks.jsonista)
    const title = document.createElement("h4");
    title.textContent = "Tulkintaohje";
    title.style.marginTop = "15px";

    const text = framework.reflection?.[mode] || "Pysähdy tarkastelemaan tekstiä valitun moodin kautta.";
    const p = document.createElement("p");
    p.textContent = text;

    this.container.append(title, p);
  },

  renderAnatomySection(anatomy, mode) {
    const box = document.createElement("div");
    box.className = "anatomy-highlight";
    box.style.borderLeft = "3px solid var(--accent)";
    box.style.paddingLeft = "10px";
    box.style.marginBottom = "15px";

    let content = "";
    let label = "";

    // Valitaan anatomian osa moodin mukaan
    if (mode === "describe") {
      label = "Keskeinen teesi:";
      content = anatomy.main_thesis;
    } else if (mode === "interpret") {
      label = "Johtopäätös:";
      content = anatomy.conclusions?.explicit?.[0] || "";
    } else if (mode === "hypothesis") {
      label = "Piilevä vaikutus:";
      content = anatomy.conclusions?.implicit?.[0] || "";
    }

    if (content) {
      const b = document.createElement("b");
      b.textContent = label;
      b.style.display = "block";
      b.style.fontSize = "11px";
      b.style.textTransform = "uppercase";
      b.style.opacity = "0.7";
      
      const txt = document.createElement("span");
      txt.textContent = content;
      
      box.append(b, txt);
      this.container.appendChild(box);
    }
  }
});