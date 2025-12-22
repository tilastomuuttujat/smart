/* ============================================================
tiedosto: framework-filter-engine.js
   FrameworkFilterEngine
   Vastuu: Älykäs suodatus luvun anatomian perusteella.
   Muokkaa valikon "jokaiselle jotakin" -periaatteen mukaan.
   ============================================================ */

const FrameworkFilterEngine = (() => {
  const FRAMEWORK_METADATA = {
    "structural": { keywords: ["järjestelmä", "rakenne", "yhteiskunta", "hallinto", "tasapaino", "kudos"] },
    "epistemic":  { keywords: ["mittari", "tieto", "data", "valta", "oecd", "tilasto"] },
    "human":      { keywords: ["ihminen", "uupumus", "kokemus", "yksilö", "luottamus"] },
    "temporal":   { keywords: ["aika", "tulevaisuus", "rytmi", "sukupolvi"] }
  };

  function scoreFramework(fw, analysis) {
    if (!analysis || !analysis.anatomy) return 0;
    let score = 0;
    const meta = FRAMEWORK_METADATA[fw.id];
    
    // Yhdistetään luvun tekstit hakumassaksi
    const context = (
      analysis.anatomy.main_thesis + " " +
      (analysis.anatomy.sub_theses || []).join(" ") + " " +
      (analysis.anatomy.evidence?.factual || []).join(" ")
    ).toLowerCase();

    if (meta) {
      meta.keywords.forEach(kw => {
        if (context.includes(kw.toLowerCase())) score += 5;
      });
    }
    // Bonus jos kehyksen nimi on tekstissä
    if (context.includes((fw.title || "").toLowerCase())) score += 10;
    
    return score;
  }

  return {
    getAvailableFrameworks(analysis) {
      // TÄRKEÄÄ: Haetaan kehykset suoraan FrameworkEnginestä
      const all = FrameworkEngine.getFrameworks();
      if (!all || all.length === 0) return [];
      if (!analysis) return all.slice(0, 3);

      const scored = all.map(fw => ({ ...fw, relevance: scoreFramework(fw, analysis) }));
      const filtered = scored.filter(fw => fw.relevance > 0);

      // Jos osumia on, palautetaan ne. Jos ei, palautetaan 3 ensimmäistä (fallback).
      return filtered.length > 0 
        ? filtered.sort((a, b) => b.relevance - a.relevance).slice(0, 3)
        : all.slice(0, 3);
    }
  };
})();