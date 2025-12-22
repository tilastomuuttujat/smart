/* ============================================================
   TOC ENGINE – KANONINEN JA VAKAA (KORJATTU)
   Vastuu:
   - Lataa toc-narrative.json ja rakentaa näkymät
   - Ohjaa TextEnginen suodatusta (Haku & Setit)
   - Synkronoi aktiivisen luvun korostuksen
============================================================ */

(function () {

  const TOC_URL = "toc-narrative.json";
  const DEFAULT_TOC_SET = "publish_order";

  let tocData = null;
  let activeSetId = DEFAULT_TOC_SET;

  let containerEl = null;
  let selectorTargetEl = null;
  let searchInputEl = null;

  let bootstrapped = false;

  /* ===================== INIT ===================== */

  async function init(options = {}) {
    const {
      containerId = "tocContainer",
      selectorId = "tocSelectorTarget",
      searchId = "tocSearch"
    } = options;

    containerEl = document.getElementById(containerId);
    selectorTargetEl = document.getElementById(selectorId);
    searchInputEl = document.getElementById(searchId);

    if (!containerEl) return;

    try {
      await loadData();
    } catch {
      containerEl.innerHTML =
        "<p style='padding:15px;opacity:.7'>TOC ei latautunut.</p>";
      return;
    }

    buildSetSelector();
    bindSearch();
    waitForTextEngine();

    // Reagoidaan tekstin vaihtumiseen (esim. skrollaus tai painikkeet)
    document.addEventListener("chapterChange", e => {
      setActiveItem(e.detail?.chapterId);
    });
  }

  /* ===================== DATA ===================== */

  async function loadData() {
    const res = await fetch(TOC_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("TOC JSON ei latautunut");
    tocData = await res.json();
  }

  function getActiveSet() {
    return tocData?.tocSets?.find(s => s.id === activeSetId) || null;
  }

  /* ===================== TEXTENGINE SYNC ===================== */

  function waitForTextEngine() {
    if (window.TextEngine?.getAllChapters?.()?.length) {
      bootstrapAndRender();
    } else {
      document.addEventListener("textEngineReady", bootstrapAndRender, { once: true });
    }
  }

  function bootstrapAndRender() {
    if (bootstrapped) return;
    bootstrapped = true;

    if (window.TOCBootstrap?.run && tocData) {
      tocData = TOCBootstrap.run(tocData);
    }

    render();
  }

  /* ===================== PUBLISH ORDER ===================== */

  function buildPublishOrderSections() {
    const chapters = window.TextEngine?.getAllChapters?.();
    if (!Array.isArray(chapters) || chapters.length === 0) return [];

    const dated = chapters
      .filter(ch => typeof ch.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(ch.date))
      .map(ch => ({
        id: ch.id,
        ym: ch.date.slice(0, 7),
        date: ch.date
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (dated.length > 0) {
      const groups = {};
      dated.forEach(ch => {
        if (!groups[ch.ym]) groups[ch.ym] = [];
        groups[ch.ym].push(ch.id);
      });

      return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(key => ({
          title: key.replace("-", " / "),
          chapters: groups[key]
        }));
    }

    return [{
      title: "Kaikki esseet",
      chapters: chapters.map(ch => ch.id)
    }];
  }

  /* ===================== RENDER ===================== */

  function render() {
    if (!tocData || !containerEl) return;

    const set = getActiveSet();
    if (!set) {
      containerEl.innerHTML = "<p style='padding:15px;opacity:.7'>Ei sisältöä.</p>";
      return;
    }

    const sections = set.id === "publish_order"
      ? buildPublishOrderSections()
      : (Array.isArray(set.sections) ? set.sections : []);

    if (!sections.length) {
      containerEl.innerHTML = "<p style='padding:15px;opacity:.7'>Ei lukuja.</p>";
      return;
    }

    containerEl.innerHTML = "";
    const activeIds = []; // Kerätään sallitut ID:t TextEnginelle

    sections.forEach(section => {
      if (section.title) {
        const h = document.createElement("h6");
        h.className = "toc-section-title";
        h.textContent = section.title;
        containerEl.appendChild(h);
      }

      section.chapters.forEach(id => {
        const item = buildItem(id);
        if (item) {
          containerEl.appendChild(item);
          activeIds.push(id);
        }
      });
    });

    // 🔑 SYNKRONOINTI: Päivitetään TextEnginen suodatus vastaamaan valittua settiä
    window.TextEngine?.setFilter(activeIds);
    
    // Varmistetaan että nykyinen luku on korostettu
    setActiveItem(window.TextEngine?.getActiveChapterId());
  }

  function buildItem(chapterId) {
    const meta = window.TextEngine?.getChapterMeta?.(chapterId);
    if (!meta) return null;

    const item = document.createElement("div");
    item.className = "toc-item";
    item.dataset.chapter = chapterId;

    const num = document.createElement("div");
    num.className = "toc-num";
    num.textContent = chapterId;

    const label = document.createElement("div");
    label.className = "toc-label";
    label.textContent = meta.title || `Luku ${chapterId}`;

    item.appendChild(num);
    item.appendChild(label);

    item.addEventListener("click", () => {
      window.TextEngine?.loadChapter?.(chapterId);
    });

    return item;
  }

  /* ===================== UI & SEARCH ===================== */

  function buildSetSelector() {
    if (!selectorTargetEl || !tocData?.tocSets) return;

    const select = document.createElement("select");
    select.className = "toc-set-selector";

    tocData.tocSets.forEach(set => {
      const opt = document.createElement("option");
      opt.value = set.id;
      opt.textContent = set.title;
      if (set.id === activeSetId) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", e => {
      activeSetId = e.target.value;
      if (searchInputEl) searchInputEl.value = ""; // Nollataan haku vaihdon yhteydessä
      render();
    });

    selectorTargetEl.innerHTML = "";
    selectorTargetEl.appendChild(select);
  }

  function setActiveItem(chapterId) {
    if (!containerEl || !chapterId) return;
    const targetId = String(chapterId).padStart(3, "0");
    containerEl.querySelectorAll(".toc-item").forEach(el => {
      el.classList.toggle("active", el.dataset.chapter === targetId);
    });
  }

  function bindSearch() {
    if (!searchInputEl) return;
    searchInputEl.addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      const visibleIds = [];

      containerEl.querySelectorAll(".toc-item").forEach(item => {
        const isMatch = item.textContent.toLowerCase().includes(q);
        item.style.display = isMatch ? "" : "none";
        
        // Piilotetaan myös tyhjät otsikot (h6) myöhemmässä vaiheessa jos tarpeen
        if (isMatch) visibleIds.push(item.dataset.chapter);
      });

      // 🔑 SYNKRONOINTI: Rajoitetaan TextEnginen navigointi vain haun tuloksiin
      window.TextEngine?.setFilter(visibleIds);
    });
  }

  /* ===================== API ===================== */

  window.TOCEngine = {
    init,
    render,
    setActiveItem
  };

  window.TOC = window.TOCEngine;

})();