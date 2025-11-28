/* ============================================================
   BOOKCORE.JS -- yhdistetty kirjamoduli
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
      scroll: opts.scrollContainer,
      chapterHost: opts.chapterContainer,
      tocScroll: opts.tocScrollContainer
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

  // HUOM: täällä oli aiemmin sulkuvirhe -> nyt ehjä
async function loadChapters(url){
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error("chapters.json status " + res.status);

    chapters = await res.json();

    // Luo luvut DOMiin
    renderAllChapters();
    buildRawHtml();

    // Nyt kun luvut ovat DOMissa, lisää kolmen ikkunan kuvat
    //if (window.BookCore_AddPreviewImages) {
      BookCore_AddPreviewImages();
    //}

    // (valinnainen – jos käytät myöhemmin canvas-pienoiskarttoja)
    if (window.BookCore_InitPreviews) {
      BookCore_InitPreviews();
    }

    // Aseta ensimmäinen luku aktiiviseksi
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

    return `
      <article class="chapter-block" data-id="${id}" data-index="${idx}">
        <div class="chapter-meta">LUKU ${id}</div>
        <h1 class="chapter-title">${ch.title || `Luku ${id}`}</h1>

        <div class="chapter-body" id="chapterBody-${id}">
          <div class="chapter-visuals" data-id="${id}">
            <div class="visual-slot visual-infografiikka"
                 data-label="Infografiikka"
                 data-chapter-id="${id}">
              Infografiikka
            </div>
            <div class="visual-slot visual-sammalkartta"
                 data-label="Sammalkartta"
                 data-chapter-id="${id}">
              <!-- tähän laitetaan myöhemmin kuva -->
            </div>
            <div class="visual-slot visual-taivaskartta"
                 data-label="Taivaskartta"
                 data-chapter-id="${id}">
              <!-- tähän laitetaan myöhemmin kuva -->
            </div>
          </div>

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
        listEl = opts.listEl;
        previewEl = opts.previewEl;
        book = opts.book;

        if(!listEl) console.error("TocModule: listEl puuttuu.");
        if(!previewEl) console.error("TocModule: previewEl puuttuu.");
        if(!book) console.error("TocModule: book-module puuttuu.");

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

// --- Kolmen ikkunan rivit luvun alkuun -----------------------

function injectChapterVisuals() {
  // Tässä käytetään kirjan oikeaa luokkaa: .chapter-block
  const chapters = document.querySelectorAll('.chapter-block');

  chapters.forEach(ch => {
    // estetään tuplat, jos funktio ajetaan uudestaan
    if (ch.querySelector('.chapter-visuals')) return;

    // BookModule tekee data-id:n -> käytetään sitä
    const chapterId = ch.getAttribute('data-id') || '';

    const wrapper = document.createElement('div');
    wrapper.className = 'chapter-visuals';

    const infoSlot = document.createElement('div');
    infoSlot.className = 'visual-slot visual-infografiikka';
    infoSlot.dataset.label = 'Infografiikka';
    infoSlot.dataset.chapterId = chapterId;
    infoSlot.textContent = 'Infografiikka';

    const sammalSlot = document.createElement('div');
    sammalSlot.className = 'visual-slot visual-sammalkartta';
    sammalSlot.dataset.label = 'Sammalkartta';
    sammalSlot.dataset.chapterId = chapterId;
    sammalSlot.textContent = 'Sammalkartta';

    const taivasSlot = document.createElement('div');
    taivasSlot.className = 'visual-slot visual-taivaskartta';
    taivasSlot.dataset.label = 'Taivaskartta';
    taivasSlot.dataset.chapterId = chapterId;
    taivasSlot.textContent = 'Taivaskartta';

    wrapper.appendChild(infoSlot);
    wrapper.appendChild(sammalSlot);
    wrapper.appendChild(taivasSlot);

    // lisätään aivan luvun alkuun (ennen meta + otsikkoa)
    ch.insertBefore(wrapper, ch.firstChild);
  });
}

// viedään BookCore-nimiavaruuteen
window.BookCore = window.BookCore || {};
window.BookCore.injectChapterVisuals = injectChapterVisuals;

// ==========================================================
// PIENET SAMMAL- JA TAIVASKARTAT LUVUN ALKUUN (PREVIEW)
// ==========================================================

window.BookCore_InitPreviews = function(){

  // --- Sammalkartta (2D preview) -------------------------
  document.querySelectorAll(".sammal-preview").forEach(div => {
    if (div.__inited) return;  // älä tee kahta kertaa
    div.__inited = true;

    const canvas = document.createElement("canvas");
    canvas.width = div.clientWidth;
    canvas.height = div.clientHeight;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    div.appendChild(canvas);

    // Kevyt 2D-piirto olemassa olevasta Sammal2D-moduulista:
    if (window.Sammal2D_DrawPreview) {
      Sammal2D_DrawPreview(canvas);
    }
  });

  // --- Taivaskartta (3D preview) -------------------------
  document.querySelectorAll(".taivas-preview").forEach(div => {
    if (div.__inited) return;
    div.__inited = true;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    div.appendChild(canvas);

    if (window.Taivas3D_DrawPreview) {
      Taivas3D_DrawPreview(canvas);
    }
  });
};

// ======================================================
// Laita sammalkartan ja taivaskartan kuvat slotteihin
// ======================================================
(function(){
  // Aja, kun DOM on valmis ja luvut on renderöity
  document.addEventListener("DOMContentLoaded", ()=>{
    // Sammalkartta-slotit
    document.querySelectorAll(".visual-sammalkartta").forEach(slot => {
      // Tyhjennetään vanha sisältö (varmuuden vuoksi)
      slot.innerHTML = "";

      const id = slot.getAttribute("data-chapter-id") || "";
      const img = document.createElement("img");

      // YKSI YHTEINEN KUVA KAIKILLE LUVUILLE:
      img.src = "sammalkartta_preview.png";

      // Jos haluat luvun mukaisen kuvan, käytä vaikka:
      // img.src = `previews/${id}_sammalkartta.png`;

      img.alt = "Sammalkartta";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      slot.appendChild(img);
    });

    // Taivaskartta-slotit
    document.querySelectorAll(".visual-taivaskartta").forEach(slot => {
      slot.innerHTML = "";

      const id = slot.getAttribute("data-chapter-id") || "";
      const img = document.createElement("img");

      // YKSI YHTEINEN KUVA KAIKILLE LUVUILLE:
      img.src = "taivaskartta_preview.png";

      // Tai luvun mukaan:
      // img.src = `previews/${id}_taivaskartta.png`;

      img.alt = "Taivaskartta";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      slot.appendChild(img);
    });
  });
})();

// ======================================================
// Lisää kuvat kolmen ikkunan slotteihin luvun latauksen jälkeen
// ======================================================
window.BookCore_AddPreviewImages = function() {

  // 1) Jos data ei ole valmis – odota
  if (!window.MI_DATA_READY) {
    setTimeout(BookCore_AddPreviewImages, 100);
    return;
  }

  // 2) PIIRRÄ 2D SAMMALKARTTA
  document.querySelectorAll(".visual-sammalkartta").forEach(slot => {
    slot.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = slot.clientWidth;
    canvas.height = slot.clientHeight;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    slot.appendChild(canvas);

    if (window.Sammal2D_DrawPreview) {
      Sammal2D_DrawPreview(canvas);
    }
  });

  // 3) PIIRRÄ 3D TAIVASKARTTA
  document.querySelectorAll(".visual-taivaskartta").forEach(slot => {
    slot.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = slot.clientWidth;
    canvas.height = slot.clientHeight;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    slot.appendChild(canvas);

    if (window.Taivas3D_DrawPreview) {
      Taivas3D_DrawPreview(canvas);
    }
  });
};



