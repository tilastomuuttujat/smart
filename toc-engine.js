/* ============================================================
   TOC ENGINE – KANONINEN JA VAKAA (DATA-POHJAINEN HAKU)
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

  /* ===== DATA INDEX ===== */

  let tocIndex = [];              // [{ id, title, section }]
  let currentFilterKey = "__ALL__";

  /* ===================== UTIL ===================== */

  function normalizeId(id) {
    return String(id).padStart(3, "0");
  }

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

    await loadData();
    buildSetSelector();
    bindSearch();
    waitForTextEngine();

    document.addEventListener("chapterChange", e => {
      setActiveItem(e.detail?.chapterId);
    });
  }

  /* ===================== DATA ===================== */

  async function loadData() {
    const res = await fetch(TOC_URL, { cache: "no-store" });
    const raw = await res.json();
    tocData = transformTOCData(raw);
  }

  function transformTOCData(data) {
    if (!data?.paths) return data;

    const tocSets = [{
      id: "publish_order",
      title: "Julkaisujärjestys",
      sections: []
    }];

    data.paths.forEach(p => {
      tocSets.push({
        id: p.id,
        title: p.title,
        sections: [{
          title: p.description || p.title,
          chapters: (p.chapters || []).map(normalizeId)
        }]
      });
    });

    return { tocSets };
  }

  function getActiveSet() {
    return tocData.tocSets.find(s => s.id === activeSetId);
  }

  /* ===================== TEXTENGINE SYNC ===================== */

  function waitForTextEngine() {
    if (window.TextEngine?.getAllChapters?.().length) {
      bootstrapAndRender();
    } else {
      document.addEventListener("textEngineReady", bootstrapAndRender, { once: true });
    }
  }

  function bootstrapAndRender() {
    if (bootstrapped) return;
    bootstrapped = true;
    render(null); // ei hakua
  }

  /* ===================== PUBLISH ORDER ===================== */

  function buildPublishOrderSections() {
    const chapters = window.TextEngine?.getAllChapters?.() || [];
    return [{
      title: "Kaikki esseet",
      chapters: chapters.map(ch => normalizeId(ch.id))
    }];
  }

  /* ===================== RENDER ===================== */

  function render(filteredIds) {
    const set = getActiveSet();
    if (!set) return;

    const sections = set.id === "publish_order"
      ? buildPublishOrderSections()
      : set.sections || [];

    containerEl.innerHTML = "";
    tocIndex = [];

    sections.forEach(section => {
      const visibleChapters = (section.chapters || [])
        .map(normalizeId)
        .filter(id => !filteredIds || filteredIds.includes(id));

      if (!visibleChapters.length) return;

      if (section.title) {
        const h = document.createElement("h6");
        h.className = "toc-section-title";
        h.textContent = section.title;
        containerEl.appendChild(h);
      }

      visibleChapters.forEach(id => {
        const meta = window.TextEngine?.getChapterMeta?.(id);
        if (!meta) return;

        tocIndex.push({
          id,
          title: meta.title || "",
          section: section.title || ""
        });

        const item = buildItem(id, meta);
        if (item) containerEl.appendChild(item);
      });
    });

    setActiveItem(window.TextEngine?.getActiveChapterId());
  }

  function buildItem(id, meta) {
    const item = document.createElement("div");
    item.className = "toc-item";
    item.dataset.chapter = id;

    const num = document.createElement("div");
    num.className = "toc-num";
    num.textContent = id;

    const label = document.createElement("div");
    label.className = "toc-label";
    label.textContent = meta.title || `Luku ${id}`;

    item.appendChild(num);
    item.appendChild(label);

    item.addEventListener("click", () => {
      window.TextEngine?.loadChapter?.(id);
      if (window.innerWidth < 768) document.body.classList.remove("toc-open");
    });

    return item;
  }

  /* ===================== DATA-POHJAINEN SEARCH ===================== */

  function bindSearch() {
    if (!searchInputEl) return;

    let debounceTimer = null;

    searchInputEl.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {

        let visibleIds = null;

        if (q) {
          visibleIds = tocIndex
            .filter(row =>
              row.title.toLowerCase().includes(q) ||
              row.section.toLowerCase().includes(q)
            )
            .map(row => row.id);
        }

        const key = visibleIds ? visibleIds.join(",") : "__ALL__";
        if (key === currentFilterKey) return;
        currentFilterKey = key;

        render(visibleIds);

        if (visibleIds === null) {
          window.TextEngine?.setFilter(null);
        } else {
          window.TextEngine?.setFilter(visibleIds);
        }

      }, 200);
    });
  }

  /* ===================== SELECTOR ===================== */

  function buildSetSelector() {
    if (!selectorTargetEl) return;

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
      if (searchInputEl) searchInputEl.value = "";
      currentFilterKey = "__ALL__";
      render(null);
      window.TextEngine?.setFilter(null);
    });

    selectorTargetEl.innerHTML = "";
    selectorTargetEl.appendChild(select);
  }

  /* ===================== ACTIVE ===================== */

function setActiveItem(chapterId) {
  if (!chapterId || !containerEl) return;

  const id = normalizeId(chapterId);
  let activeEl = null;

  containerEl.querySelectorAll(".toc-item").forEach(el => {
    const isActive = el.dataset.chapter === id;
    el.classList.toggle("active", isActive);
    if (isActive) activeEl = el;
  });

  // 🔑 PIDÄ AKTIIVINEN KOHTA NÄKYVISSÄ
  if (activeEl) {
    const panel = containerEl.closest("#tocPanel");
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();

    const isAbove = itemRect.top < panelRect.top + 40;
    const isBelow = itemRect.bottom > panelRect.bottom - 40;

    if (isAbove || isBelow) {
      activeEl.scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
    }
  }
}


  /* ===================== API ===================== */

  window.TOCEngine = { init, render, setActiveItem };

})();
