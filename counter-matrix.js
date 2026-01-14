/* ============================================================
   counter-matrix.js – KONTRAMATRIISI (V1.3 / MI-kytketty)
   Rooli:
   - Näyttää, mitkä MI-tasot (MI1–MI12) on rajattu pois
   - Erottaa tietoiset rajaukset ja aidot sokeat pisteet
============================================================ */

(function () {

  /* ===================== MI-MÄÄRITYKSET ===================== */

  const MI_LABELS = {
    MI1: "Kuvaus",
    MI2: "Syy",
    MI3: "Mekanismi",
    MI4: "Alkuperä",
    MI5: "Välineet",
    MI6: "Seuraus",
    MI7: "Konteksti",
    MI8: "Kokemus",
    MI9: "Ajautuma",
    MI10: "Jännite",
    MI11: "Suunta",
    MI12: "Vastuu"
  };

  const MI_BLINDSPOT_TEXT = {
    MI1: "Ilmiötä ei rajata eksplisiittisesti; lukija kokoaa kokonaiskuvaa itse.",
    MI2: "Syitä ei eritellä, jolloin tapahtumat näyttäytyvät annettuina.",
    MI3: "Toimintalogiikka jää piiloon; nähdään mitä tapahtuu, ei miksi.",
    MI4: "Historiallinen tai rakenteellinen alkuperä jää nimeämättä.",
    MI5: "Käytetyt välineet ja politiikkakeinot jäävät implisiittisiksi.",
    MI6: "Seuraukset jäävät auki tai oletetuiksi.",
    MI7: "Laajempi yhteys järjestelmään tai aikaan puuttuu.",
    MI8: "Kokemuksellinen näkökulma jää taka-alalle.",
    MI9: "Ajautumisen tai inertian logiikka ei tule näkyväksi.",
    MI10: "Keskeisiä jännitteitä ei tehdä eksplisiittisiksi.",
    MI11: "Tulevaisuussuunta jää avoimeksi tai implisiittiseksi.",
    MI12: "Vastuu ei paikannu toimijoihin tai rakenteisiin."
  };

  const ALL_MI = Object.keys(MI_LABELS);

  /* ===================== LOGIIKKA ===================== */

  function classifyMissingMI(mi, ctx) {
    const role = ctx.system_classification?.system_role;
    const ef = ctx.entry_focus || {};

    // Täydellinen orientaatio / ROM
    if (role === "core-analysis" && Object.values(ef).every(v => v === 0)) {
      return "deliberate";
    }

    // Kokemus rajattu pois
    if (mi === "MI8" && ef.experience === 0) {
      return "deliberate";
    }

    // Suunta rajattu pois
    if (mi === "MI11" && ef.change === 0) {
      return "deliberate";
    }

    return "blind";
  }

  function resolveCounterTitle(ctx) {
    if (ctx.system_classification?.system_role === "core-analysis") {
      return "Mitä tämä analyysi rajaa ulkopuolelle";
    }
    if (Object.values(ctx.entry_focus || {}).every(v => v === 0)) {
      return "Miksi kaikkia tasoja ei ole tarkoitus käsitellä";
    }
    return "Mitä tässä ei tarkastella";
  }

  function contextualizeText(mi, ctx) {
    const base = MI_BLINDSPOT_TEXT[mi] || "";
    if (ctx.system_classification?.system_role === "core-analysis") {
      return base.replace(/\.$/, ", koska tarkastelu kohdistuu rajattuun analyysitasoon.");
    }
    return base;
  }

  /* ===================== RENDER ===================== */

  function renderCounterMatrix(container, ctx) {
    const root = document.createElement("section");
    root.className = "module module-counter-matrix";
    root.style.cssText = `
      margin-top: 56px;
      padding-top: 28px;
      border-top: 1px solid rgba(208,180,140,0.25);
    `;

    const h = document.createElement("h3");
    h.textContent = resolveCounterTitle(ctx);
    h.style.cssText = `
      font-size: 14px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 18px;
    `;
    root.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "counter-grid";
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    `;
    root.appendChild(grid);

    const miProfile = ctx?.mi_profile || {};
    const present = new Set(miProfile.present_levels || []);

    const missing = Array.isArray(miProfile.missing_levels)
      ? miProfile.missing_levels
      : ALL_MI.filter(mi => !present.has(mi));

    if (!missing.length) {
      const ok = document.createElement("div");
      ok.textContent = "MI-tasot muodostavat eheän kokonaisuuden.";
      ok.style.cssText = "opacity:0.6;font-size:13px;";
      grid.appendChild(ok);
      return root;
    }

    const MAX_ITEMS = ctx.entry_focus?.structure >= 2 ? 4 : 3;

    missing.slice(0, MAX_ITEMS).forEach(mi => {
      const kind = classifyMissingMI(mi, ctx);

      const card = document.createElement("div");
      card.dataset.kind = kind;
      card.style.cssText = `
        padding: 16px 14px;
        border-radius: 12px;
        background: rgba(0,0,0,0.55);
        border: 1px ${kind === "deliberate" ? "solid" : "dashed"} rgba(255,255,255,0.18);
        opacity: ${kind === "deliberate" ? 0.6 : 1};
      `;

      const t = document.createElement("div");
      t.textContent = `${mi} – ${MI_LABELS[mi] || ""}`;
      t.style.cssText = `
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 6px;
        opacity: 0.9;
      `;

      const p = document.createElement("div");
      p.textContent = contextualizeText(mi, ctx);
      p.style.cssText = `
        font-size: 13px;
        line-height: 1.45;
        opacity: 0.75;
      `;

      card.appendChild(t);
      card.appendChild(p);
      grid.appendChild(card);
    });

    if (missing.length > MAX_ITEMS) {
      const note = document.createElement("div");
      note.textContent = "Kaikkia rajauksia ei ole tarkoituksenmukaista tehdä näkyviksi samanaikaisesti.";
      note.style.cssText = `
        grid-column: 1 / -1;
        opacity: 0.5;
        font-size: 12px;
        margin-top: 8px;
      `;
      grid.appendChild(note);
    }

    return root;
  }

  /* ===================== MODUULIREKISTERÖINTI ===================== */

  ModuleRegistry.register({
    id: "counter_matrix",
    role: "blind_spot",
    blind_spot_level: "primary",

    priority: 0.6,
    weight: ctx => ctx.entry_focus?.structure ? 1 : 0,

    when: ctx =>
      ctx.view === "analysis" &&
      Boolean(ctx?.mi_profile),

    render(container, ctx) {
      const el = renderCounterMatrix(container, ctx);
      container.appendChild(el);
      this._root = el;
    },

    destroy() {
      if (this._root?.parentNode) {
        this._root.parentNode.removeChild(this._root);
      }
      this._root = null;
    }
  });

})();
