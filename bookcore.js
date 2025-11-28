/* ============================================================
   BOOKCORE.JS -- yhdistetty kirjamoduli (TähtiKirja 2025)
   ------------------------------------------------------------
   Sisältää kolme osaa:
   1) BookModule   -- lukeminen, scrollaus, luvun hallinta
   2) TocModule    -- hakemisto + esikatselu
   3) SearchModule -- tekstihaku + korostukset
   ============================================================ */

///////////////////////////////////////////////////////////////
// 1) BOOK MODULE
///////////////////////////////////////////////////////////////

window.BookModule = (function(){

  let chapters = [];
  let containers = {};
  let onChapterChange = null;
  let currentIndex = 0;
  let rawHtml = [];

  function mount(opts){
    containers = {
      scroll:       opts.scrollContainer,
      chapterHost:  opts.chapterContainer,
      tocScroll:    opts.tocScrollContainer
    };

    if(!containers.scroll)      console.error("BookModule: scrollContainer puuttuu.");
    if(!containers.chapterHost) console.error("BookModule: chapterContainer puuttuu.");

    onChapterChange = opts.onChapterChange || function(){};

    bindScroll();
    loadChapters(opts.file || "chapters.json");
  }

  // Apufunktio: hae MI-slotit sammalkartalta (jos funktio on olemassa)
  function getMiSlotsFor(essayId){
    if (window.Sammal2D_GetMiSlotsForEssay) {
      try {
        return window.Sammal2D_GetMiSlotsForEssay(essayId) || null;
      } catch(e){
        console.warn("MI-slot haku epäonnistui esseelle", essayId, e);
      }
    }
    return null;
  }

  function gotoChapter(idx){
    idx = Math.max(0, Math.min(chapters.length-1, idx));
    currentIndex = idx;

    const block = containers.chapterHost.querySelector(
      `.chapter-block[data-index="${idx}"]`
    );
    if(block){
      containers.scroll.scrollTo({
        top: block.offsetTop,
        behavior: "smooth"
      });
    }

    const essayId = chapters[idx].id;
    const miSlots = getMiSlotsFor(essayId);
    onChapterChange(essayId, miSlots);
  }

  function getCurrentChapter(){
    return chapters[currentIndex];
  }

  // Lataa luvut ja piirtää ne DOMiin
    // HUOM: tällä pidetään kaikki olemassa oleva logiikka, mutta lisätään
  // BookCore_ApplySuggestions väliin.
  async function loadChapters(url){
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error("chapters.json status " + res.status);

      chapters = await res.json();

      // 1) Luvut DOMiin
      renderAllChapters();

      // 2) Käytä "tämä saattaisi kiinnostaa" -vihjeiden automaattista käärettä
      if (window.BookCore_ApplySuggestions){
        window.BookCore_ApplySuggestions();
      }

      // 3) Tallenna "alkuperäinen" HTML hakua varten
      buildRawHtml();

      // 4) Pienoiskartat / preview-kuvat yms. (kuten aiemmin)
      if (window.BookCore_AddPreviewImages){
        window.BookCore_AddPreviewImages();
      }

      if (window.BookCore_InitPreviews){
        window.BookCore_InitPreviews();
      }

      // 5) Ensimmäinen luku aktiiviseksi
      if (chapters.length){
        const firstId = chapters[0].id;
        const miSlots = getMiSlotsFor(firstId);
        onChapterChange(firstId, miSlots);
      }

    } catch(err){
      console.error("BookModule: lukuvirhe:", err);
    }
  }


  function renderAllChapters(){
    const list = chapters.map((ch, idx)=>{
      ch.id = ch.id || String(idx+1).padStart(3,"0");
      const id   = ch.id;
      const html = mdToHtml(ch.body_md || "");

      ch.index = idx;

      // Huom: kolmen ikkunan rivi on suoraan luvun alussa
      return `
        <article class="chapter-block" data-id="${id}" data-index="${idx}">
          <div class="chapter-visuals" data-id="${id}">
            <div class="visual-slot visual-infografiikka"
                 data-label="Infografiikka"
                 data-chapter-id="${id}">
              Infografiikka
            </div>
            <div class="visual-slot visual-sammalkartta"
                 data-label="Sammalkartta"
                 data-chapter-id="${id}">
              <!-- tähän canvas sammalkartalle -->
            </div>
            <div class="visual-slot visual-taivaskartta"
                 data-label="Taivaskartta"
                 data-chapter-id="${id}">
              <!-- tähän canvas taivaskartalle -->
            </div>
          </div>

          <div class="chapter-meta">LUKU ${id}</div>
          <h1 class="chapter-title">${ch.title || `Luku ${id}`}</h1>

          <div class="chapter-body" id="chapterBody-${id}">
            ${html}
          </div>
        </article>`;
    });

    containers.chapterHost.innerHTML = list.join("\n");
  }

  function mdToHtml(md){
    if(!md) return "";
    let t = md.replace(/\r\n/g,"\n");

    t = t.replace(/^## (.*)$/gm, (_, title)=> `<h2>${title}</h2>`);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    t = t.split(/\n{2,}/)
      .map(b=>{
        if(/^<h2>/.test(b)) return b;
        return `<p>${b.trim()}</p>`;
      })
      .join("\n");

    return t;
  }

  function buildRawHtml(){
    rawHtml = [];
    chapters.forEach(ch=>{
      const id = ch.id;
      const el = document.getElementById(`chapterBody-${id}`);
      if (el) rawHtml.push(el.innerHTML);
      else    rawHtml.push("");
    });
  }

  function bindScroll(){
    if(!containers.scroll) return;

    containers.scroll.addEventListener("scroll", ()=>{
      let best = 0;
      let bestDist = Infinity;

      const blocks = containers.chapterHost.querySelectorAll(".chapter-block");
      const top = containers.scroll.getBoundingClientRect().top;

      blocks.forEach(el=>{
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top - top);
        if(d < bestDist){
          bestDist = d;
          best = parseInt(el.dataset.index);
        }
      });

      if(best !== currentIndex){
        currentIndex = best;
        const essayId = chapters[best].id;
        const miSlots = getMiSlotsFor(essayId);
        onChapterChange(essayId, miSlots);
      }
    }, { passive:true });
  }

  return {
    mount,
    gotoChapter,
    getCurrentChapter,
    rawHtml: ()=> rawHtml,
    _getChapters: ()=> chapters
  };

})();

///////////////////////////////////////////////////////////////
// 2) TOC MODULE
///////////////////////////////////////////////////////////////

window.TocModule = (function(){

  let listEl, previewEl, book;

  function mount(opts){
    listEl   = opts.listEl;
    previewEl= opts.previewEl;
    book     = opts.book;

    if(!listEl)   console.error("TocModule: listEl puuttuu.");
    if(!previewEl)console.error("TocModule: previewEl puuttuu.");
    if(!book)     console.error("TocModule: book-module puuttuu.");

    build();
  }

  function build(){
    const chapters = book._getChapters ? book._getChapters() : [];

    listEl.innerHTML = "";
    chapters.forEach((ch, idx)=>{
      const li = document.createElement("li");
      li.textContent = `${ch.id} -- ${ch.title}`;
      li.dataset.index = idx;

      li.onclick = ()=>{
        book.gotoChapter(idx);
        highlight(idx);
        previewEl.innerHTML = ch.summary || "";
      };
      listEl.appendChild(li);
    });
  }

  function highlight(idx){
    listEl.querySelectorAll("li").forEach(li=>{
      li.classList.toggle("active", li.dataset.index == idx);
    });
  }

  return { mount, highlight };

})();

///////////////////////////////////////////////////////////////
// 3) SEARCH MODULE – tekstikorostus + tarkka scrollaus
///////////////////////////////////////////////////////////////

window.SearchModule = (function(){

  let input, countEl, book, scrollContainer;
  let hits = [];      // { chapterIdx, el }
  let activeIndex = -1;

  function mount(opts){
    input           = opts.input;
    countEl         = opts.countEl;
    book            = opts.book;
    scrollContainer = opts.scrollContainer;

    if (!input || !countEl || !book){
      console.error("SearchModule: mount puuttuu input/countEl/book");
      return;
    }

    input.addEventListener("input", doSearch);
  }

  function escapeRegExp(str){
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Palauttaa alkuperäisen HTML:n BookModulelta
  function restoreOriginalHtml(){
    if (!book || !book._getChapters || !book.rawHtml) return;

    const chapters  = book._getChapters();
    const originals = book.rawHtml();  // tämä pidetään BookModulessa alkuperäisenä

    chapters.forEach((ch, idx)=>{
      const bodyId = `chapterBody-${ch.id}`;
      const el = document.getElementById(bodyId);
      if (el && originals[idx] != null){
        el.innerHTML = originals[idx];
      }
    });
  }

  function highlightAll(term){
    if (!book || !book._getChapters || !book.rawHtml) return;

    const chapters  = book._getChapters();
    const originals = book.rawHtml();
    const re        = new RegExp(escapeRegExp(term), "gi");

    hits = [];
    activeIndex = -1;

    chapters.forEach((ch, idx)=>{
      const bodyId = `chapterBody-${ch.id}`;
      const el = document.getElementById(bodyId);
      if (!el) return;

      const html = originals[idx] || "";
      if (!html.toLowerCase().includes(term.toLowerCase())){
        el.innerHTML = html;
        return;
      }

      // korvaa kaikki osumat <mark>-tageilla
      const newHtml = html.replace(re, match => `<mark class="search-hit">${match}</mark>`);
      el.innerHTML = newHtml;

      const marks = el.querySelectorAll("mark.search-hit");
      marks.forEach(m => {
        hits.push({ chapterIdx: idx, el: m });
      });
    });
  }

  function doSearch(){
    const term = (input.value || "").trim();
    clearAll();  // palauttaa alkuperäisen HTML:n + nollaa laskurin
    if (term.length < 2){
      if (countEl) countEl.textContent = "0/0";
      return;
    }

    highlightAll(term);
    if (!hits.length){
      if (countEl) countEl.textContent = "0/0";
      return;
    }

    if (countEl) countEl.textContent = `1/${hits.length}`;
    jumpTo(0);
  }

  function scrollHitIntoView(hit){
    if (!scrollContainer || !hit || !hit.el) return;

    const el       = hit.el;
    const scRect   = scrollContainer.getBoundingClientRect();
    const markRect = el.getBoundingClientRect();

    const bar      = document.getElementById("searchBar");
    let offset = 20;
    if (bar){
      const barRect = bar.getBoundingClientRect();
      offset = (barRect.bottom - scRect.top) + 12;  // hakupalkin alle pieni väli
    }

    const deltaY = (markRect.top - scRect.top) - offset;

    scrollContainer.scrollBy({
      top: deltaY,
      behavior: "smooth"
    });
  }

  function updateActiveHighlight(){
    document.querySelectorAll("mark.search-hit-active").forEach(m=>{
      m.classList.remove("search-hit-active");
    });

    if (activeIndex < 0 || activeIndex >= hits.length) return;
    const hit = hits[activeIndex];
    if (hit && hit.el){
      hit.el.classList.add("search-hit-active");
    }
  }

  function jumpTo(i){
    if (!hits.length) return;
    if (i < 0) i = hits.length - 1;
    activeIndex = i % hits.length;

    const hit = hits[activeIndex];
    if (!hit) return;

    if (book && book.gotoChapter){
      book.gotoChapter(hit.chapterIdx);
    }

    setTimeout(()=>{
      updateActiveHighlight();
      scrollHitIntoView(hit);
    }, 50);

    if (countEl){
      countEl.textContent = `${activeIndex+1}/${hits.length}`;
    }
  }

  function clearAll(){
    restoreOriginalHtml();
    hits = [];
    activeIndex = -1;
    if (countEl){
      countEl.textContent = "0/0";
    }
  }

  return {
    mount,
    next: ()=> jumpTo(activeIndex+1),
    prev: ()=> jumpTo(activeIndex-1),
    clearAll
  };

})();

// varmista, että BookCore-nimiavaruus on olemassa (jos haluat myöhemmin lisätä sinne muuta)
window.BookCore = window.BookCore || {};


// ==========================================================
// BookCore_ApplySuggestions
// Käärii automaattisesti tietyt fraasit .tk-suggest-word -spaneihin,
// jos niitä vastaavat merkinnät löytyvät TK_SUGGESTIONS-objektista.
// ==========================================================
window.BookCore_ApplySuggestions = function(){
  const root = document.getElementById("chapterContainer");
  if (!root) return;
  if (!window.TK_SUGGESTIONS) return;

  const configs = window.TK_SUGGESTIONS;
  const entries = Object.entries(configs)
    .map(([id, cfg]) => {
      const raw =
        (cfg.phrase || cfg.phraseText || cfg.canonical || id || "")
          .toString();
      const phrase = raw.replace(/_/g, " ").toLowerCase().trim();
      return { id, phrase };
    })
    .filter(e => e.phrase.length > 1);

  if (!entries.length) return;

  // Jokaiselle luvulle (chapter-block) tehdään oma etsintä,
  // jotta sama suggestion voi esiintyä useassa luvussa.
  const chapters = root.querySelectorAll(".chapter-block");
  chapters.forEach(ch => {
    entries.forEach(entry => {
      wrapPhraseOncePerChapter(ch, entry.phrase, entry.id);
    });
  });

  // -------- Aputoiminnot --------

  // Etsi fraasi kerran tässä luvussa ja kääri se .tk-suggest-word -spaniin
  function wrapPhraseOncePerChapter(chapterEl, phrase, suggestId){
    let found = false;

    const walker = document.createTreeWalker(
      chapterEl,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node){
          if (!node.textContent || !node.textContent.trim()){
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE"){
            return NodeFilter.FILTER_REJECT;
          }

          // Älä koske, jos ollaan jo tk-suggest-wordin sisällä
          if (parent.closest && parent.closest(".tk-suggest-word")){
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while((node = walker.nextNode())){
      if (wrapInNode(node, phrase, suggestId)){
        found = true;
        break; // vain yksi osuma per luku / suggestion-id
      }
    }
    return found;
  }

  function wrapInNode(textNode, phrase, suggestId){
    const text = textNode.textContent;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(phrase);
    if (idx === -1) return false;

    const before = text.slice(0, idx);
    const match  = text.slice(idx, idx + phrase.length);
    const after  = text.slice(idx + phrase.length);

    const parent = textNode.parentNode;
    if (!parent) return false;

    const span = document.createElement("span");
    span.className = "tk-suggest-word";
    span.dataset.suggestId = suggestId;
    span.textContent = match;

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(span);
    if (after)  frag.appendChild(document.createTextNode(after));

    parent.replaceChild(frag, textNode);
    return true;
  }
};
