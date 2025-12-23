/* ============================================================
   EvaluationEngine – KORJATTU JA SYNKRONOITU
   Vastuu:
   - Pitää kirjaa aktiivisesta analyysidatasta
   - Välittää tiedon Starfield-moduulille (evaluationChanged-event)
   - Synkronoitu TextEnginen normalizeChapter-rakenteen kanssa
============================================================ */

const EvaluationEngine = (() => {
  let evaluations = [];
  let activeIndex = -1;

  /**
   * Ladataan analyysidata. 
   * Jos käytössä on integroitu JSON, tämä kutsutaan TextEnginen lataamilla luvuilla.
   */
  function load(data) {
    evaluations = Array.isArray(data) ? data : (data.chapters || data.evaluations || []);
    console.log("EvaluationEngine: Valmiudessa", evaluations.length, "lukua.");
  }


// evaluation-engine.js – Varmistetaan kommunikaatio
document.addEventListener("chapterChange", e => {
  const chapterId = e.detail?.chapterId;
  if (chapterId) {
    const data = EvaluationEngine.setActiveByChapterId(chapterId); 
    
    // Lähetetään Starfieldille spesifi päivityskäsky, jos dataa löytyi
    if (data) {
      document.dispatchEvent(new CustomEvent("updateStarfield", { 
        detail: { data: data.anatomy?.evidence?.factual || data.data } 
      }));
    }
  }
});

/**
   * Aktivoi analyysin luvun ID:n perusteella.
   * Laukaisee "evaluationChanged" -tapahtuman, jota Starfield-moduuli kuuntelee.
   */
  function setActiveByChapterId(chapterId) {
  const targetId = String(chapterId).padStart(3, '0');
  const idx = evaluations.findIndex(e => String(e.id).padStart(3, '0') === targetId);
  
  if (idx !== -1) {
    activeIndex = idx;
    // Poimitaan analyysiversio, jossa anatomy sijaitsee
    const analysisData = evaluations[activeIndex].versions?.analysis || evaluations[activeIndex];
    
    document.dispatchEvent(new CustomEvent("evaluationChanged", { 
      detail: analysisData 
    }));
    
    return analysisData;
  }
  return null;
}

  /**
   * Palauttaa tämänhetkisen aktiivisen analyysin.
   */
  function getActive() {
    if (activeIndex >= 0 && activeIndex < evaluations.length) {
      const data = evaluations[activeIndex];
      // Palautetaan ensisijaisesti analyysiversio
      return data.versions?.analysis || data;
    }
    return null;
  }

  return { load, setActiveByChapterId, getActive };
})();