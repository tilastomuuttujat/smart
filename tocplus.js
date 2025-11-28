// tocplus.js – TähtiKirja 2025
// Yhdistetty hakemisto: luvut, MI-slotit, entiteetit, haku, karttalinkit.

window.TocPlusModule = (function(){

  let overlayEl, panelEl;
  let book = null;

  let essaysMi = null;
  let entitiesMi = null;
  let dataLoaded = false;
  let dataPromise = null;

  // Aktiivinen välilehti + järjestys karusellia varten
  let activeTab = "chapters";
  const TAB_ORDER = ["chapters","mi","entities","search","map"];

  function debug(msg){
    const box = document.getElementById("debug-box");
    if (box) box.textContent = "debug: " + msg;
  }

  // --------------------------------------------------
  // Mount
  // --------------------------------------------------
  function mount(opts){
    overlayEl = opts.overlayEl;
    panelEl   = opts.panelEl;
    book      = opts.book;

    if (!overlayEl || !panelEl || !book){
      console.error("TocPlus: mount missing overlay/panel/book");
      return;
    }

    // ensimmäinen renderöinti (tyhjä sisältö, tabit)
    renderShell();
    switchTab("chapters");

    // esilataa dataa (essays_mi + entities_mi)
    loadData().catch(err => console.error("TocPlus data error:", err));
  }

  // --------------------------------------------------
  // Data
  // --------------------------------------------------
  function loadData(){
    if (dataPromise) return dataPromise;

    dataPromise = Promise.all([
      fetch("essays_mi.json").then(r=>{
        if (!r.ok) throw new Error("essays_mi.json HTTP "+r.status);
        return r.json();
      }),
      fetch("entities_mi.json").then(r=>{
        if (!r.ok) throw new Error("entities_mi.json HTTP "+r.status);
        return r.json();
      })
    ])
    .then(([essaysRaw, entitiesRaw])=>{
      essaysMi   = Array.isArray(essaysRaw)   ? essaysRaw   : [];
      entitiesMi = Array.isArray(entitiesRaw) ? entitiesRaw : [];
      dataLoaded = true;
      debug("tocplus: data OK");
    })
    .catch(err=>{
      console.error("TocPlus data load error:", err);
      debug("tocplus datavirhe");
      throw err;
    });

    return dataPromise;
  }

  // --------------------------------------------------
  // Ulkoinen käyttö
  // --------------------------------------------------
  function open(tab){
    if (tab) activeTab = tab;
    if (overlayEl){
      overlayEl.classList.add("toc-visible");
    }
    renderShell();
    renderActiveTab();
  }

  function close(){
    if (overlayEl){
      overlayEl.classList.remove("toc-visible");
    }
  }

  function switchTab(tabId){
    activeTab = tabId;
    renderShell();
    renderActiveTab();
  }

  function nextTab(){
    const idx = TAB_ORDER.indexOf(activeTab);
    const next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
    switchTab(next);
  }

  function prevTab(){
    const idx = TAB_ORDER.indexOf(activeTab);
    const prev = TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    switchTab(prev);
  }

  // --------------------------------------------------
  // UI: shell (otsikko + tabit + content-slot)
  // --------------------------------------------------
  function renderShell(){
    if (!panelEl) return;

    const tabs = [
      { id:"chapters", label:"Luvut" },
      { id:"mi",       label:"MI-hakemisto" },
      { id:"entities", label:"Entiteetit" },
      { id:"search",   label:"Haku" },
      { id:"map",      label:"Kartta" }
    ];

    panelEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;">
          Hakemisto
        </div>
        <button type="button"
                id="tocplus-close-btn"
                style="border:none;background:transparent;font-size:16px;line-height:1;cursor:pointer;">
          ✕
        </button>
      </div>

      <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;">
        ${tabs.map(t => `
          <button type="button"
                  data-role="tocplus-tab"
                  data-id="${t.id}"
                  style="
                    flex:1;
                    min-width:70px;
                    padding:4px 6px;
                    border-radius:999px;
                    border:1px solid ${activeTab === t.id ? '#d0b48c' : '#ccc'};
                    background:${activeTab === t.id ? '#f6ece0' : '#fff'};
                    font-size:11px;
                  ">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <div id="tocplus-content"
           style="flex:1;overflow:auto;border-top:1px solid rgba(0,0,0,0.08);padding-top:6px;font-size:13px;">
      </div>
    `;

    // tab-napit
    panelEl.querySelectorAll("button[data-role='tocplus-tab']").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        switchTab(id);
      });
    });

    // X-nappi
    const closeBtn = panelEl.querySelector("#tocplus-close-btn");
    if (closeBtn){
      closeBtn.addEventListener("click", ()=> close());
    }

    // HUOM: ei overlayEl.click-sulkemista → sulkeminen vain:
    // - X-napilla
    // - pyyhkäisylogiikalla (scrollContainer touch)
  }

  function getCurrentEssayId(){
    const ch = book && book.getCurrentChapter ? book.getCurrentChapter() : null;
    return ch && ch.id ? ch.id : null;
  }

  // --------------------------------------------------
  // Tabien sisältö
  // --------------------------------------------------
  function renderActiveTab(){
    const content = document.getElementById("tocplus-content");
    if (!content) return;

    if (activeTab === "chapters"){
      renderChaptersTab(content);
    } else if (activeTab === "mi"){
      renderMiTab(content);
    } else if (activeTab === "entities"){
      renderEntitiesTab(content);
    } else if (activeTab === "search"){
      renderSearchTab(content);
    } else if (activeTab === "map"){
      renderMapTab(content);
    }
  }

  // 1) Luvut
  function renderChaptersTab(content){
    const chs = (book && book._getChapters) ? book._getChapters() : [];
    if (!chs.length){
      content.innerHTML = `<div>Ei lukuja ladattuna.</div>`;
      return;
    }

    const curr = book.getCurrentChapter ? book.getCurrentChapter() : null;
    const currId = curr && curr.id;

    content.innerHTML = `
      <div style="margin-bottom:6px;font-size:11px;color:#666;">
        Perinteinen luvut-hakemisto (chapters.json)
      </div>
      <ul style="list-style:none;margin:0;padding:0;">
        ${chs.map((ch, idx)=>{
          const active = ch.id === currId;
          const title = ch.title || ("Luku " + ch.id);
          return `
            <li data-role="tocplus-chapter"
                data-index="${idx}"
                style="
                  padding:5px 6px;
                  margin-bottom:3px;
                  border-radius:8px;
                  cursor:pointer;
                  background:${active ? 'rgba(208,180,140,0.15)' : 'transparent'};
                ">
              <div style="font-size:12px;font-weight:600;">
                ${ch.id} – ${title}
              </div>
              ${ch.summary ? `<div style="font-size:11px;color:#555;margin-top:2px;">${ch.summary}</div>` : ""}
            </li>
          `;
        }).join("")}
      </ul>
    `;

    content.querySelectorAll("[data-role='tocplus-chapter']").forEach(li=>{
      li.addEventListener("click", ()=>{
        const idx = parseInt(li.getAttribute("data-index"), 10);
        if (!isNaN(idx) && book.gotoChapter){
          book.gotoChapter(idx);
          close();
        }
      });
    });
  }

  // 2) MI-hakemisto
  function renderMiTab(content){
    if (!dataLoaded){
      content.innerHTML = `<div>Ladataan MI-tietoja…</div>`;
      loadData().then(()=>renderMiTab(content)).catch(()=>{});
      return;
    }

    const miIndex = new Map(); // slotIndex -> Map(canonical -> Set(essayId))
    const labelBySlot = {
      0: "MI1 – mitä",
      1: "MI2 – miksi",
      2: "MI3 – miten",
      3: "MI4 – mistä",
      4: "MI5 – millä",
      5: "MI6 – mihin",
      6: "MI7 – missä",
      7: "MI8 – miltä",
      8: "MI9 – minne",
      9: "MI10 – missäpäin",
      10:"MI11 – minnepäin",
      11:"MI12 – mille"
    };

    const MI_FIELDS = [
      "MI1_mita_canonical",
      "MI2_miksi_canonical",
      "MI3_miten_canonical",
      "MI4_mista_canonical",
      "MI5_milla_canonical",
      "MI6_mihin_canonical",
      "MI7_missa_canonical",
      "MI8_milta_canonical",
      "MI9_minne_canonical",
      "MI10_missapain_canonical",
      "MI11_minnepain_canonical",
      "MI12_mille_canonical"
    ];

    essaysMi.forEach(row=>{
      const essayId = (row.essay_id || row.essayId || row.id || "").toString().trim();
      if (!essayId) return;
      MI_FIELDS.forEach((fieldName, slotIndex)=>{
        const v = row[fieldName];
        if (!v) return;
        const canonical = String(v).trim();
        if (!canonical) return;

        if (!miIndex.has(slotIndex)){
          miIndex.set(slotIndex, new Map());
        }
        const slotMap = miIndex.get(slotIndex);
        if (!slotMap.has(canonical)){
          slotMap.set(canonical, new Set());
        }
        slotMap.get(canonical).add(essayId);
      });
    });

    const currentEssayId = getCurrentEssayId();

    let html = `
      <div style="margin-bottom:6px;font-size:11px;color:#666;">
        MI-slotteihin perustuva hakemisto (essays_mi.json). Klikkaa käsitettä nähdäksesi luvut.
      </div>
    `;

    MI_FIELDS.forEach((fieldName, slotIndex)=>{
      const slotMap = miIndex.get(slotIndex);
      if (!slotMap || !slotMap.size) return;

      const title = labelBySlot[slotIndex] || ("MI"+(slotIndex+1));

      html += `
        <div style="margin-bottom:6px;">
          <div style="font-weight:600;font-size:12px;margin-bottom:2px;">
            ${title}
          </div>
          <ul style="list-style:none;margin:0;padding-left:6px;">
            ${Array.from(slotMap.entries()).map(([canonical,set])=>{
              const essays = Array.from(set).sort();
              const hitsHere = currentEssayId && essays.includes(currentEssayId);
              return `
                <li data-role="tocplus-mi-item"
                    data-slot="${slotIndex}"
                    data-canonical="${encodeURIComponent(canonical)}"
                    style="
                      margin-bottom:2px;
                      padding:2px 4px;
                      border-radius:6px;
                      cursor:pointer;
                      background:${hitsHere ? 'rgba(208,180,140,0.18)' : 'transparent'};
                    ">
                  <div>${canonical.replace(/_/g," ")}</div>
                  <div style="font-size:11px;color:#666;">
                    Luvut: ${essays.join(", ")}
                  </div>
                </li>
              `;
            }).join("")}
          </ul>
        </div>
      `;
    });

    content.innerHTML = html || `<div>Ei MI-dataa.</div>`;

    content.querySelectorAll("[data-role='tocplus-mi-item']").forEach(li=>{
      li.addEventListener("click", ()=>{
        const slotIndex = parseInt(li.getAttribute("data-slot"),10);
        const canonical = decodeURIComponent(li.getAttribute("data-canonical") || "");
        if (!canonical) return;

        const essays = [];
        essaysMi.forEach(row=>{
          const eid = (row.essay_id || row.essayId || row.id || "").toString().trim();
          if (!eid) return;
          const fieldName = MI_FIELDS[slotIndex];
          if (row[fieldName] && String(row[fieldName]).trim() === canonical){
            essays.push(eid);
          }
        });
        if (!essays.length) return;

        jumpToChapterById(essays[0]);
        close();
      });
    });
  }

  // 3) Entiteettihakemisto
  function renderEntitiesTab(content){
    if (!dataLoaded){
      content.innerHTML = `<div>Ladataan entiteettejä…</div>`;
      loadData().then(()=>renderEntitiesTab(content)).catch(()=>{});
      return;
    }

    const clusters = new Map(); // cluster_name → [entity,...]
    entitiesMi.forEach(e=>{
      const cname = (e.cluster_name || "Muut").toString();
      if (!clusters.has(cname)){
        clusters.set(cname, []);
      }
      clusters.get(cname).push(e);
    });

    const currentEssayId = getCurrentEssayId();

    let html = `
      <div style="margin-bottom:6px;font-size:11px;color:#666;">
        Entiteettihakemisto (entities_mi.json), ryhmitelty cluster_name:n mukaan.
      </div>
    `;

    Array.from(clusters.entries()).forEach(([clusterName, ents])=>{
      ents.sort((a,b)=> (a.label || a.canonical || "").localeCompare(b.label || b.canonical || ""));
      html += `
        <div style="margin-bottom:8px;">
          <div style="font-weight:600;font-size:12px;margin-bottom:2px;">
            ${clusterName || "Muut"}
          </div>
          <ul style="list-style:none;margin:0;padding-left:6px;">
            ${ents.map(e=>{
              const canon = e.canonical || e.label || "";
              const label = e.label || e.canonical || "";
              const occ   = Array.isArray(e.occurrences) ? e.occurrences : [];
              const hitsHere = currentEssayId && occ.includes(currentEssayId);
              return `
                <li data-role="tocplus-entity-item"
                    data-canonical="${encodeURIComponent(canon)}"
                    data-occ="${encodeURIComponent(JSON.stringify(occ))}"
                    style="
                      margin-bottom:2px;
                      padding:2px 4px;
                      border-radius:6px;
                      cursor:pointer;
                      background:${hitsHere ? 'rgba(208,180,140,0.18)' : 'transparent'};
                    ">
                  <div>${label}</div>
                  <div style="font-size:11px;color:#666;">
                    MI: ${e.rkm || "-"} / ${e.layer || "-"} – Luvut: ${occ.join(", ")}
                  </div>
                </li>
              `;
            }).join("")}
          </ul>
        </div>
      `;
    });

    content.innerHTML = html || `<div>Ei entiteettejä.</div>`;

    content.querySelectorAll("[data-role='tocplus-entity-item']").forEach(li=>{
      li.addEventListener("click", ()=>{
        const occStr = li.getAttribute("data-occ") || "[]";
        let occ = [];
        try{ occ = JSON.parse(decodeURIComponent(occStr)); }catch(e){}
        if (!Array.isArray(occ) || !occ.length) return;
        jumpToChapterById(occ[0]);
        close();
      });
    });
  }

  // 4) Haku-tab (yksinkertainen luku/otsikko/summary haku)
  function renderSearchTab(content){
    const chs = (book && book._getChapters) ? book._getChapters() : [];
    if (!chs.length){
      content.innerHTML = `<div>Ei lukuja ladattuna.</div>`;
      return;
    }

    content.innerHTML = `
      <div style="margin-bottom:4px;font-size:11px;color:#666;">
        Haku luvun otsikosta ja yhteenvedosta. (Tekstikappalehaku hoitaa SearchModule.)
      </div>
      <input type="text"
             id="tocplus-search-input"
             placeholder="Hae otsikoista ja tiivistelmistä..."
             style="width:100%;box-sizing:border-box;padding:4px 6px;margin-bottom:6px;
                    border-radius:6px;border:1px solid #ccc;font-size:12px;" />
      <div id="tocplus-search-results" style="max-height:260px;overflow:auto;"></div>
    `;

    const input = content.querySelector("#tocplus-search-input");
    const resultsEl = content.querySelector("#tocplus-search-results");

    function doSearch(){
      const term = (input.value || "").trim().toLowerCase();
      if (!term){
        resultsEl.innerHTML = `<div style="font-size:11px;color:#666;">Kirjoita hakusana.</div>`;
        return;
      }
      const hits = [];
      chs.forEach((ch, idx)=>{
        const hayTitle   = (ch.title   || "").toLowerCase();
        const haySummary = (ch.summary || "").toLowerCase();
        if (hayTitle.includes(term) || haySummary.includes(term)){
          hits.push({ ch, idx });
        }
      });
      if (!hits.length){
        resultsEl.innerHTML = `<div style="font-size:11px;color:#666;">Ei osumia.</div>`;
        return;
      }
      resultsEl.innerHTML = `
        <ul style="list-style:none;margin:0;padding:0;">
          ${hits.map(h => `
            <li data-role="tocplus-search-hit"
                data-index="${h.idx}"
                style="padding:4px 4px;margin-bottom:3px;border-radius:6px;cursor:pointer;
                       background:rgba(0,0,0,0.03);">
              <div style="font-size:12px;font-weight:600;">
                ${h.ch.id} – ${h.ch.title || ("Luku "+h.ch.id)}
              </div>
              ${h.ch.summary ? `<div style="font-size:11px;color:#555;margin-top:2px;">${h.ch.summary}</div>` : ""}
            </li>
          `).join("")}
        </ul>
      `;

      resultsEl.querySelectorAll("[data-role='tocplus-search-hit']").forEach(li=>{
        li.addEventListener("click", ()=>{
          const idx = parseInt(li.getAttribute("data-index"),10);
          if (!isNaN(idx) && book.gotoChapter){
            book.gotoChapter(idx);
            close();
          }
        });
      });
    }

    input.addEventListener("input", doSearch);
    doSearch();
  }

  // 5) Kartta-tab (graafinen hakemisto)
  function renderMapTab(content){
    const curr  = book && book.getCurrentChapter ? book.getCurrentChapter() : null;
    const id    = curr && curr.id    ? curr.id    : "–";
    const title = curr && curr.title ? curr.title : "";

    content.innerHTML = `
      <div style="margin-bottom:6px;font-size:11px;color:#666;">
        Graafinen hakemisto: käytä MI-karttoja (2D, maasto, 3D) navigointiin nykyisen esseen kautta.
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-size:12px;font-weight:600;">Nykyinen essee:</div>
        <div style="font-size:12px;">ID: ${id}</div>
        ${title ? `<div style="font-size:12px;">${title}</div>` : ""}
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;">
        <button type="button"
                data-role="tocplus-open-map"
                data-mode="2d"
                style="padding:6px 8px;border-radius:8px;border:1px solid #d0b48c;
                       background:#f6ece0;font-size:12px;text-align:left;">
          Avaa 2D-sammalkartta tälle esseelle
        </button>

        <button type="button"
                data-role="tocplus-open-map"
                data-mode="maasto"
                style="padding:6px 8px;border-radius:8px;border:1px solid #d0b48c;
                       background:#fff;font-size:12px;text-align:left;">
          Avaa maastokartta tälle esseelle
        </button>

        <button type="button"
                data-role="tocplus-open-map"
                data-mode="3d"
                style="padding:6px 8px;border-radius:8px;border:1px solid #d0b48c;
                       background:#fff;font-size:12px;text-align:left;">
          Avaa 3D-taivaskartta tälle esseelle
        </button>
      </div>

      <div style="margin-top:8px;font-size:11px;color:#666;">
        Vihje: kartassa voit rajata R/K/M ja kerrokset panelista, kaksoisnapautus tekstialueella
        avaa ja sulkee kartta-arkin.
      </div>
    `;

    content.querySelectorAll("[data-role='tocplus-open-map']").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const mode = btn.getAttribute("data-mode");
        openMapForCurrentEssay(mode);
        close();
      });
    });
  }

  // --------------------------------------------------
  // Hyppy lukuun ID:n perusteella (esim "012" tai "012_xyz")
  // --------------------------------------------------
  function jumpToChapterById(essayId){
    if (!book || !book._getChapters) return;
    const chs = book._getChapters();
    if (!chs || !chs.length) return;

    const canon = (essayId || "").toString().trim();
    const m = canon.match(/^(\d{3})/);
    const prefix = m ? m[1] : canon;

    let targetIdx = -1;
    chs.forEach((ch, idx)=>{
      const id = (ch.id || "").toString().trim();
      if (!id) return;
      if (id === canon || id.startsWith(prefix)){
        if (targetIdx === -1) targetIdx = idx;
      }
    });

    if (targetIdx >= 0 && book.gotoChapter){
      book.gotoChapter(targetIdx);
    }
  }

  // --------------------------------------------------
  // Kartta-overlay käyttö
  // --------------------------------------------------
  function openMapForCurrentEssay(mode){
    const essayId = getCurrentEssayId();
    if (!essayId) return;

    const overlay = document.getElementById("map-overlay");
    const sheet   = document.getElementById("map-sheet");
    if (overlay && sheet){
      overlay.style.display = "block";
      requestAnimationFrame(()=> sheet.classList.add("open"));
    }

    if (window.MapController){
      MapController.setEssay(essayId);
      if (MapController.switchTo){
        MapController.switchTo(mode || "2d");
      }
    }
  }

  return {
    mount,
    open,
    close,
    switchTab,
    nextTab,
    prevTab
  };

})();
