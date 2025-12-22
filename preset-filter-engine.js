/* ============================================================
tiedosto: preset-filter-engine.js
   PresetFilterEngine (Synkronoitu presets.json-rakenteeseen)
   Vastuu: Älykäs suodatus focus- ja sdof-kenttien perusteella.
   ============================================================ */

function scorePreset(preset, analysis) {
  if (!analysis || !analysis.mi_series) return 0;
  
  let score = 0;
  // Luvun 001 MI-tasot (varmistetaan tyyppi)
  const activeLevels = Object.keys(analysis.mi_series.levels || {});
  
  // JSON-kenttä on "focus" (esim. ["MI1", "MI3"])
  if (preset.focus && Array.isArray(preset.focus)) {
    const matches = preset.focus.filter(f => activeLevels.includes(f));
    score += matches.length * 10; // 10 pistettä per osuma
  }

  // Systeemidynamiikka (kenttä "sdof")
  const activeSdof = Object.keys(analysis.sdof || {});
  if (preset.sdof && Array.isArray(preset.sdof)) {
    const sdofMatches = preset.sdof.filter(s => activeSdof.includes(s));
    score += sdofMatches.length * 5;
  }

  return score;
}
const PresetFilterEngine = (() => {
  function scorePreset(preset, analysis) {
    if (!analysis) return 0;
    let score = 0;

    // Haetaan analyysin MI-tasot (esim. ["MI1", "MI3"])
    const activeLevels = analysis.mi_series?.levels ? Object.keys(analysis.mi_series.levels) : [];
    
    // 1. MI-osumat (JSON-kenttä on "focus")
    if (preset.focus && Array.isArray(preset.focus)) {
      const matches = preset.focus.filter(f => activeLevels.includes(f)).length;
      score += matches * 10; // Voimakas painotus
    }

    // 2. SDOF-osumat
    const activeSdof = analysis.sdof ? Object.keys(analysis.sdof) : [];
    if (preset.sdof && Array.isArray(preset.sdof)) {
      const sdofMatches = preset.sdof.filter(s => activeSdof.includes(s)).length;
      score += sdofMatches * 5;
    }

    return score;
  }

  return {
    getAvailablePresets(analysis) {
      const allRaw = PresetEngine.getPresets();
      // Varmistetaan että käsitellään core_presets-sisältöä
      const source = allRaw.core_presets || allRaw;
      
      const presetList = Object.entries(source).map(([id, data]) => ({
        ...data,
        id: id
      }));

      if (!analysis) return presetList;

      const scored = presetList.map(p => ({
        ...p,
        relevance: scorePreset(p, analysis)
      }));

      // Suodatetaan: Jos on yksikin piste, se on relevantti
      const filtered = scored.filter(p => p.relevance > 0);

      // Palautetaan top 3. Jos ei osumia, palautetaan 2 ensimmäistä mutta ilman console.warnia
      if (filtered.length === 0) return presetList.slice(0, 2);
      
      return filtered
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);
    }
  };
})();