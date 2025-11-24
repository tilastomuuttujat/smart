// book.js – yksinkertainen, rauhallinen lukukokemus
// - lataa chapters.json
// - scroll ylös/alas vaihtaa kirjoitusta
// - markdown: ## otsikot, **lihavoitu**
// - ei sivuttaisheiluntaa, ei animaatioita

(function() {
  const CHAPTERS_URL = "chapters.json";

  // -------------------------
  // DOM viittaukset (turvallisesti)
  // -------------------------
  const scrollContainer   = document.getElementById("scrollContainer");
  const chapterTitleEl    = document.getElementById("chapterTitle");
  const chapterMetaEl     = document.getElementById("chapterMeta");
  const chapterBodyEl     = document.getElementById("chapterBody");
  const pageIndicatorEl   = document.getElementById("pageIndicator");

  const contextMenu       = document.getElementById("contextMenu");
  const tocOverlay        = document.getElementById("tocOverlay");
  const tocListEl         = document.getElementById("tocList");
  const figureOverlay     = document.getElementById("figureOverlay");
  const figureImgEl       = document.getElementById("figureImg");
  const sammalPanelEl     = document.getElementById("sammalPanel");
  const sammalPanelBodyEl = document.getElementById("sammalPanelBody");
  const searchOverlay     = document.getElementById("searchOverlay");
  const searchInputEl     = document.getElementById("searchInput");
  const searchResultsEl   = document.getElementById("searchResults");

  // -------------------------
  // Tilamuuttujat
  // -------------------------
  let chapters = [];
  let currentChapterIndex = 0;

  let isChangingChapter = false;
  let lastScrollTop = 0;

  // -------------------------
  // Yksinkertainen markdown-renderöinti
  // -------------------------
  function renderMarkdownBasic(md) {
    if (!md) return "";

    let html = String(md);

    // Otsikot rivin alussa
    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm,  "<h1>$1</h1>");

    // Lihavointi **teksti**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Kappalejako: tyhjät rivit erottavat kappaleet
    const blocks = html
      .split(/\n{2,}/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    html = blocks.map(b => {
      if (/^<h[1-3]>/.test(b)) return b; // otsikot sellaisenaan
      return `<p>${b}</p>`;
    }).join("\n");

    return html;
  }

  // -------------------------
  // Data normalisointi
  // -------------------------
  function normalizeChapters(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((row, i) => {
        const id = String(
          row.id ||
          row.chapter_id ||
          (i + 1).toString().padStart(3, "0")
        );

        const part = Number(row.part || row.section || 1);
        const order = Number(
          row.order ||
          row.index ||
          i
        );

        return {
          id,
          part,
          order,
          title: row.title || "",
          subtitle: row.subtitle || "",
          body_md: row.body_md || row.body || "",
        };
      })
      .sort((a, b) => {
        if (a.part !== b.part) return a.part - b.part;
        return a.order - b.order;
      });
  }

  // -------------------------
  // Kirjoituksen renderöinti
  // -------------------------
  function renderCurrentChapter() {
    if (!chapters.length) return;

    const ch = chapters[currentChapterIndex];

    if (chapterTitleEl) {
      chapterTitleEl.textContent = ch.title || "";
    }
    if (chapterMetaEl) {
      const partLabel = ch.part ? `Osa ${ch.part}` : "";
      const pageLabel = `${currentChapterIndex + 1} / ${chapters.length}`;
      chapterMetaEl.textContent = [partLabel, pageLabel].filter(Boolean).join(" · ");
    }
    if (chapterBodyEl) {
      chapterBodyEl.innerHTML = renderMarkdownBasic(ch.body_md);
    }
    if (pageIndicatorEl) {
      pageIndicatorEl.textContent = `${currentChapterIndex + 1} / ${chapters.length}`;
    }

    // vieritä alkuun
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      lastScrollTop = 0;
    }

    // Sammalkartta-hook (turvallinen, ei pakollinen)
    const activeId = ch.id;
    if (window.sammalkarttaSetActiveChapter &&
        typeof window.sammalkarttaSetActiveChapter === "function") {
      try {
        window.sammalkarttaSetActiveChapter(activeId);
      } catch (err) {
        console.warn("sammalkarttaSetActiveChapter virhe:", err);
      }
    }
  }

  function goToChapter(idx) {
    if (idx < 0 || idx >= chapters.length) return;
    currentChapterIndex = idx;
    isChangingChapter = true;
    renderCurrentChapter();
    setTimeout(() => { isChangingChapter = false; }, 150);
  }

  function goToNextChapter() {
    if (currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  }

  function goToPrevChapter() {
    if (currentChapterIndex > 0) {
      goToChapter(currentChapterIndex - 1);
      // halutessasi voit hypätä heti lopun tuntumaan, mutta pidetään tämä nyt yksinkertaisena:
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        });
      }
    }
  }

  // -------------------------
  // Scroll ylös/alas -> vaihda kirjoitusta
  // -------------------------
  function setupScrollPaging() {
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", () => {
      if (isChangingChapter || !chapters.length) return;

      const el = scrollContainer;
      const scrollTop  = el.scrollTop;
      const viewHeight = el.clientHeight;
      const fullHeight = el.scrollHeight;

      const atTop    = scrollTop <= 0;
      const atBottom = scrollTop + viewHeight >= fullHeight - 4;

      const goingDown = scrollTop > lastScrollTop;
      const goingUp   = scrollTop < lastScrollTop;

      lastScrollTop = scrollTop;

      // Alhaalla ja vielä alas -> seuraava kirjoitus
      if (goingDown && atBottom && currentChapterIndex < chapters.length - 1) {
        goToNextChapter();
        return;
      }

      // Ylhäällä ja vielä ylös -> edellinen kirjoitus
      if (goingUp && atTop && currentChapterIndex > 0) {
        goToPrevChapter();
        return;
      }
    }, { passive: true });
  }

  // -------------------------
  // Swipe vasen/oikea – vaihda kirjoitusta
  // -------------------------
  function setupHorizontalSwipe() {
    if (!scrollContainer) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let tracking = false;

    scrollContainer.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      tracking = true;
    }, { passive: true });

    scrollContainer.addEventListener("touchmove", e => {
      if (!tracking) return;
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;

      // Jos pystysuuntainen liike on suurempi, tulkitaan normaaliksi skrolliksi
      if (Math.abs(dy) > Math.abs(dx) * 1.5) {
        tracking = false;
        return;
      }
      // Emme estä oletus-scrollia, vain luemme arvon
    }, { passive: true });

    scrollContainer.addEventListener("touchend", e => {
      if (!tracking) return;
      tracking = false;
      if (e.changedTouches.length !== 1) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;

      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) {
        return; // liian pieni tai liian pystyliike
      }

      if (dx < 0) {
        // swipe vasemmalle -> seuraava
        goToNextChapter();
      } else {
        // swipe oikealle -> edellinen
        goToPrevChapter();
      }
    }, { passive: true });
  }

  // -------------------------
  // TOC / haku / kuvat / sammalkartta – kevyet kuoret
  // (eivät haittaa lukemista, jos elementtejä ei ole)
  // -------------------------

  function openToc() {
    if (!tocOverlay || !tocListEl) return;
    tocListEl.innerHTML = "";
    chapters.forEach((ch, idx) => {
      const li = document.createElement("li");
      li.textContent = `${ch.id} – ${ch.title || "Nimetön"}`;
      li.className = "toc-item";
      if (idx === currentChapterIndex) li.classList.add("active");
      li.addEventListener("click", () => {
        goToChapter(idx);
        closeToc();
      });
      tocListEl.appendChild(li);
    });
    tocOverlay.style.display = "flex";
  }

  function closeToc() {
    if (!tocOverlay) return;
    tocOverlay.style.display = "none";
  }

  function openFigureForCurrent() {
    if (!figureOverlay || !figureImgEl || !chapters.length) return;
    const ch = chapters[currentChapterIndex];
    const base = ch.id || (currentChapterIndex + 1).toString().padStart(3, "0");
    // yritetään png:tä; jos käytät jpg:tä, vaihdat tähän
    figureImgEl.src = `images/${base}.png`;
    figureOverlay.style.display = "flex";
  }

  function closeFigureOverlay() {
    if (!figureOverlay) return;
    figureOverlay.style.display = "none";
  }

  function openSammalPanel(mode) {
    if (!sammalPanelEl || !sammalPanelBodyEl || !chapters.length) return;
    sammalPanelEl.style.display = "flex";

    const ch = chapters[currentChapterIndex];
    const activeId = ch.id;

    // Host-API sammalkartalle (turvallinen)
    if (window.setViewModeFromHost && typeof window.setViewModeFromHost === "function") {
      window.setViewModeFromHost(mode === "3d" ? "3d" : "2d");
    }
    if (window.setActiveEssayFromHost && typeof window.setActiveEssayFromHost === "function") {
      window.setActiveEssayFromHost(activeId);
    }
  }

  function closeSammalPanel() {
    if (!sammalPanelEl) return;
    sammalPanelEl.style.display = "none";
  }

  function openSearchOverlay() {
    if (!searchOverlay || !searchInputEl || !searchResultsEl) return;
    searchOverlay.style.display = "flex";
    searchInputEl.value = "";
    searchResultsEl.innerHTML = "";
    searchInputEl.focus();
  }

  function closeSearchOverlay() {
    if (!searchOverlay) return;
    searchOverlay.style.display = "none";
  }

  function performSearch(query) {
    if (!chapters.length || !searchResultsEl) return;
    const q = query.trim().toLowerCase();
    searchResultsEl.innerHTML = "";

    if (!q) return;

    chapters.forEach((ch, idx) => {
      const text = `${ch.title} \n ${ch.body_md}`.toLowerCase();
      if (text.includes(q)) {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = `${ch.id} – ${ch.title || "Nimetön"}`;
        item.addEventListener("click", () => {
          goToChapter(idx);
          closeSearchOverlay();
        });
        searchResultsEl.appendChild(item);
      }
    });
  }

  // -------------------------
  // Kontekstivalikko – vain napit (ei long press / double tap tässä vaiheessa)
  // -------------------------

  function closeContextMenuSafe() {
    if (contextMenu) {
      contextMenu.style.display = "none";
    }
  }

  function setupContextMenuButtons() {
    if (!contextMenu) return;
    contextMenu.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      closeContextMenuSafe();
      switch (action) {
        case "toc":
          openToc();
          break;
        case "search":
          openSearchOverlay();
          break;
        case "figure":
          openFigureForCurrent();
          break;
        case "sammal2d":
          openSammalPanel("2d");
          break;
        case "sammal3d":
          openSammalPanel("3d");
          break;
        case "cancel":
        default:
          break;
      }
    });
  }

  // -------------------------
  // Lataus
  // -------------------------
  async function loadChapters() {
    try {
      const res = await fetch(CHAPTERS_URL);
      if (!res.ok) {
        console.error("chapters.json HTTP virhe:", res.status);
        return;
      }
      const data = await res.json();
      chapters = normalizeChapters(data);
      if (!chapters.length) {
        console.warn("Ei yhtään kirjoitusta chapters.json:ssä");
        return;
      }
      currentChapterIndex = 0;
      renderCurrentChapter();
    } catch (err) {
      console.error("chapters.json latausvirhe:", err);
    }
  }

  // -------------------------
  // Init
  // -------------------------
  document.addEventListener("DOMContentLoaded", () => {
    if (!scrollContainer) {
      console.warn("scrollContainer-elementti puuttuu – book.js ei voi aktivoitua.");
      return;
    }

    setupScrollPaging();
    setupHorizontalSwipe();
    setupContextMenuButtons();

    if (searchInputEl) {
      searchInputEl.addEventListener("input", () => {
        performSearch(searchInputEl.value || "");
      });
    }

    // Suljen overlayt taustaklikistä jos halutaan (turvallisesti)
    if (tocOverlay) {
      tocOverlay.addEventListener("click", e => {
        if (e.target === tocOverlay) closeToc();
      });
    }
    if (figureOverlay) {
      figureOverlay.addEventListener("click", e => {
        if (e.target === figureOverlay) closeFigureOverlay();
      });
    }
    if (sammalPanelEl) {
      sammalPanelEl.addEventListener("click", e => {
        if (e.target === sammalPanelEl) closeSammalPanel();
      });
    }
    if (searchOverlay) {
      searchOverlay.addEventListener("click", e => {
        if (e.target === searchOverlay) closeSearchOverlay();
      });
    }

    loadChapters();
  });

  // -------------------------
  // Pieni host-API ulkomaailmalle (tarvittaessa)
  // -------------------------
  window.BookHost = {
    goToChapterIndex: idx => goToChapter(idx),
    getCurrentChapterId: () =>
      chapters[currentChapterIndex] ? chapters[currentChapterIndex].id : null,
    openToc,
    openSearchOverlay,
    openFigureForCurrent,
    openSammalPanel,
    closeSammalPanel
  };

})();
