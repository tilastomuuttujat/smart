/* ============================================================
   statistics-module.js – Orkestroitu liitemoduuli (V1.1)
============================================================ */

ModuleRegistry.register({
  id: "statistics",
  role: "support",
  priority: 0.15, // matala – ei dominoi näkymää

  /* =========================
     GATE: käynnistyy vain jos eksplisiittisesti pyydetty
     ========================= */
  when: ctx => {
    const raw =
      ctx.modules ??        // runtime-konteksti
      ctx.meta?.modules;    // fallback: JSON

    const modules =
      Array.isArray(raw)
        ? raw
        : typeof raw === "string"
          ? [raw]
          : [];

    return modules.includes("statistics");
  },

  /* =========================
     RENDER
     ========================= */
  render(container, ctx) {
    const stats = extractStatistics(ctx);
    if (!stats.length) return;

    const root = document.createElement("section");
    root.className = "module module-statistics";
    root.style.cssText = `
      margin-top: 32px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 0.85rem;
      line-height: 1.4;
      opacity: 0.9;
    `;

    const title = document.createElement("div");
    title.textContent = "Tilastollinen viite";
    title.style.cssText = `
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.6;
      margin-bottom: 8px;
    `;
    root.appendChild(title);

    const list = document.createElement("ul");
    list.style.cssText = `
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
    `;

    stats.forEach(item => {
      const li = document.createElement("li");
      li.textContent = formatStat(item);
      li.style.fontVariantNumeric = "tabular-nums";
      list.appendChild(li);
    });

    root.appendChild(list);
    container.appendChild(root);

    orchestrateSubmodules(root, ctx);
  }
});

/* ============================================================
   ORKESTROINTI
   ============================================================ */

function orchestrateSubmodules(root, ctx) {
  const enableDemographic =
    ctx.meta?.tags?.includes("huoltosuhde") ||
    ctx.entry_focus?.cost >= 2;

  if (
    enableDemographic &&
    typeof window.renderDemographicDependencyChart === "function"
  ) {
    const mount = document.createElement("div");
mount.style.cssText = `
  margin-top: 14px;
  width: 100%;
  min-height: 360px;
`;
root.appendChild(mount);

window.renderDemographicDependencyChart(mount, ctx);

  }
}

/* ===================== DATA ===================== */

function extractStatistics(ctx) {
  const out = [];

  if (ctx.entry_focus?.cost >= 2) {
    out.push({
      label: "Näkymättömät kustannukset",
      value: "kasautuvat pitkällä aikavälillä"
    });
  }

  if (Array.isArray(ctx.sdof?.outcomes)) {
    ctx.sdof.outcomes.slice(0, 2).forEach(o => {
      out.push({ label: "Vaikutus", value: o });
    });
  }

  return out;
}

/* ===================== MUOTOILU ===================== */

function formatStat(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (item.label && item.value) return `${item.label}: ${item.value}`;
  return JSON.stringify(item);
}
