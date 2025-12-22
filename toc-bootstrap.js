/* ============================================================
   toc-bootstrap.js
   - Rakentaa kuukausittaisen TOC-setin kerran
   - Ei renderöi mitään
============================================================ */

(function () {

  function buildMonthlyToc(tocData, chapters) {
    if (!tocData || !Array.isArray(chapters)) return tocData;

    const groups = {};

    chapters.forEach(ch => {
      if (!ch.date) return;
      const ym = ch.date.slice(0, 7); // YYYY-MM
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(ch.id);
    });

    const sections = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(ym => ({
        id: ym,
        title: ym.replace("-", " / "),
        chapters: groups[ym].sort()
      }));

    const monthlySet = {
      id: "publish_monthly",
      title: "Julkaisu kuukausittain",
      type: "temporal",
      description: "Esseet ryhmitelty vuosi–kuukausi-pohjaisesti.",
      sections
    };

    // Poista vanha jos olemassa
    tocData.tocSets = tocData.tocSets.filter(s => s.id !== "publish_monthly");

    // Lisää alkuun (kanoninen narratiivi)
    tocData.tocSets.unshift(monthlySet);

    return tocData;
  }

  // Julkinen API
  window.TOCBootstrap = {
    run(tocData) {
      const chapters = window.TextEngine?.getAllChapters?.();
      if (!chapters || !chapters.length) return tocData;
      return buildMonthlyToc(tocData, chapters);
    }
  };

})();
