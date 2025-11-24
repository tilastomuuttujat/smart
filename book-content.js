// book-content.js

export function initBookContent(GLOBAL){
  const essaySearchEl   = document.getElementById('essaySearch');
  const essayListEl     = document.getElementById('essayList');
  const textStatusEl    = document.getElementById('textStatus');
  const textContentEl   = document.getElementById('textContent');
  const readHeaderMain  = document.getElementById('readHeaderMain');
  const readHeaderSub   = document.getElementById('readHeaderSub');
  const themeSelectEl   = document.getElementById('themeSelect');
  const appRoot         = document.getElementById('appRoot');
  const resizeHandle    = document.getElementById('resizeHandle');
  const leftPane        = document.getElementById('leftPane');

  let currentEssayId   = null;
  let filteredEssays   = [];

  /* ---------------------------------
     Infografiikka-tyylit
  --------------------------------- */

  function injectInfographicStyles(){
    if (document.getElementById('infographicStyles')) return;
    const style = document.createElement('style');
    style.id = 'infographicStyles';
    style.textContent = `
      .infographic-wrap{
        margin: 1.8em 0 0;
        padding: 0.8em 0.9em;
        border-radius: 12px;
        background: rgba(248, 240, 228, 0.04);
        border: 1px solid rgba(248, 240, 228, 0.16);
      }
      .infographic-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }
      .infographic-toggle{
        border:none;
        background:transparent;
        padding:0;
        cursor:pointer;
      }
      .infographic-toggle-label{
        font-size:10px;
        letter-spacing:0.06em;
        text-transform:uppercase;
        color:rgba(248,240,228,0.72);
      }
      .infographic-toggle-label strong{
        font-weight:600;
        color:rgba(248,240,228,0.95);
      }
      .infographic-toggle.open .infographic-toggle-label{
        color:rgba(248,240,228,1);
      }
      .infographic-header .view-toggle{
        display:inline-flex;
        border-radius:999px;
        border:1px solid rgba(248,240,228,0.45);
        overflow:hidden;
        background:rgba(0,0,0,0.45);
      }
      .infographic-header .view-btn{
        border:none;
        padding:3px 8px;
        font-size:10px;
        cursor:pointer;
        background:transparent;
        color:#f5ede0;
      }
      .infographic-header .view-btn.active{
        background:rgba(248,240,228,0.9);
        color:#15110a;
        font-weight:600;
      }
      .infographic-body{
        margin-top:10px;
      }
      .infographic-img{
        max-width:100%;
        border-radius:9px;
        display:block;
        box-shadow:0 8px 26px rgba(0,0,0,0.45);
      }
      .infographic-caption{
        font-size:10px;
        color:rgba(248, 240, 228, 0.80);
        margin-bottom:5px;
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------------------------------
     Aputoiminnot
  --------------------------------- */

  function canonicalEssayId(id){
    const s = String(id || '').trim();
    const m = s.match(/^(\d{3})/);
    return m ? m[1] : s;
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function markdownToHtml(md){
    if(!md) return "";
    let text = String(md);

    text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    text = text.replace(/(^|\n)([-*]) (.*)/g, (match,p1,p2,p3)=>`${p1}<li>${p3}</li>`);
    text = text.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

    const blocks = text.split(/\n{2,}/).map(block=>{
      const trimmed = block.trim();
      if(!trimmed) return "";
      if(trimmed.startsWith("<h") || trimmed.startsWith("<ul>")){
        return block;
      }
      const escaped = escapeHtml(block).replace(/\n/g,"<br>");
      return `<p>${escaped}</p>`;
    });
    return blocks.join("");
  }

  function findEssayById(essayId){
    return GLOBAL.ESSAYS_BY_ID[essayId] ||
           GLOBAL.ESSAYS_BY_CANON[canonicalEssayId(essayId)];
  }

  function findChapterForEssay(es){
    if(!es) return null;
    return GLOBAL.CHAPTERS_BY_ESSAY_ID[es.id] ||
           GLOBAL.CHAPTERS_BY_ESSAY_CANON[canonicalEssayId(es.id)];
  }

  /* ---------------------------------
     Infografiikka-blokki
  --------------------------------- */

  function infographicBlock(shortId){
    const label = `Infografiikka (images/${shortId}.png)`;
    return `
      <div class="infographic-wrap" data-short-id="${escapeHtml(shortId)}">
        <div class="infographic-header">
          <button type="button"
                  class="infographic-toggle"
                  data-state="closed"
                  aria-expanded="false">
            <span class="infographic-toggle-label">
              avaa <strong>infografiikka</strong>
            </span>
          </button>
          <div class="view-toggle">
            <button type="button"
                    class="view-btn infographic-mode-btn active"
                    data-mode="2d">2D</button>
            <button type="button"
                    class="view-btn infographic-mode-btn"
                    data-mode="3d">3D</button>
          </div>
        </div>
        <div class="infographic-body" hidden>
          <div class="infographic-caption">${escapeHtml(label)}</div>
          <img class="infographic-img"
               src="images/${escapeHtml(shortId)}.png"
               alt="Infografiikka ${escapeHtml(shortId)}">
        </div>
      </div>
    `;
  }

  /* ---------------------------------
     Jatkuva lukutila (oletus)
  --------------------------------- */

  function renderContinuousView(currentId){
    if(!filteredEssays.length){
      readHeaderMain.textContent = "Jatkuva lukutila";
      readHeaderSub.textContent  = "Ei kirjoituksia hakuehdolla.";
      textStatusEl.textContent   = "";
      textContentEl.innerHTML    = "<p>Ei kirjoituksia, jotka täsmäävät hakusanaan.</p>";
      return;
    }

    const total = filteredEssays.length;
    const q     = (essaySearchEl.value || "").trim();
    readHeaderMain.textContent = `Jatkuva lukutila (${total} kirjoitusta)`;
    readHeaderSub.textContent  = q ? `Suodatus: "${q}"` : "Ei suodatusta";

    let htmlAll = "";
    filteredEssays.forEach(es => {
      const ch = findChapterForEssay(es);
      const title    = (ch && ch.title) || es.title || "";
      const bodyHtml = ch ? markdownToHtml(ch.body_md || "") : "";
      const shortId  = es.id.length >= 3 ? es.id.slice(0,3) : es.id;

      htmlAll += `
        <article id="essay-${escapeHtml(es.id)}" style="margin-bottom:3em;">
          <div class="text-title">${escapeHtml(es.id)}${title ? " – "+escapeHtml(title) : ""}</div>
          ${es.summary ? `<div class="text-meta">${escapeHtml(es.summary)}</div>` : ""}
          ${bodyHtml || "<p><em>Ei tekstiä chapters.jsonissa.</em></p>"}
          ${infographicBlock(shortId)}
        </article>
      `;
    });

    textStatusEl.textContent = "";
    textContentEl.innerHTML  = htmlAll;

    const targetId = currentId || (filteredEssays[0] && filteredEssays[0].id);
    if(targetId){
      const el = document.getElementById(`essay-${targetId}`);
      if(el){
        el.scrollIntoView({block:"start"});
      } else {
        textContentEl.scrollTop = 0;
      }
    }else{
      textContentEl.scrollTop = 0;
    }
  }

  /* ---------------------------------
     Kirjoituslista
  --------------------------------- */

  function buildEssayList(filter=""){
    const q = (filter || "").toLowerCase().trim();
    essayListEl.innerHTML = "";

    const sorted = [...GLOBAL.essays].sort((a,b)=>a.id.localeCompare(b.id,'fi'));

    filteredEssays = sorted.filter(es=>{
      if(!q) return true;
      const hay = (es.id + " " + es.title + " " + (es.summary || "")).toLowerCase();
      return hay.includes(q);
    });

    filteredEssays.forEach(es=>{
      const item = document.createElement('div');
      item.className = "essay-item";
      if(es.id === currentEssayId) item.classList.add('active');
      const niceId = es.id.length>=3 ? es.id.slice(0,3) : es.id;
      const shortTitle = es.title && es.title.length>60 ? es.title.slice(0,57)+"…" : (es.title || "");
      item.innerHTML = `
        <div class="essay-id">${escapeHtml(niceId)}</div>
        <div class="essay-main">
          <div class="essay-title">${escapeHtml(shortTitle || "(otsikko puuttuu)")}</div>
          <div class="essay-summary">${escapeHtml(es.summary || "")}</div>
        </div>
      `;
      item.title = es.id + (es.title ? " – " + es.title : "");
      item.addEventListener('click', ()=>{
        currentEssayId = es.id;
        buildEssayList(essaySearchEl.value);
        renderContinuousView(currentEssayId);
        // scrollataan vielä varmuuden vuoksi oikeaan artikkeliin
        const el = document.getElementById(`essay-${es.id}`);
        if(el){
          el.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
      essayListEl.appendChild(item);
    });
  }

  essaySearchEl.addEventListener('input', ()=>{
    buildEssayList(essaySearchEl.value);
    // pidä nykyinen id jos mahdollista, muuten ensimmäinen
    if(filteredEssays.length){
      if(!currentEssayId || !filteredEssays.some(es => es.id === currentEssayId)){
        currentEssayId = filteredEssays[0].id;
      }
    }else{
      currentEssayId = null;
    }
    renderContinuousView(currentEssayId);
  });

  /* ---------------------------------
     Lukuteema
  --------------------------------- */

  function applyTheme(theme){
    const body = document.body;
    body.classList.remove('theme-sand','theme-sepia','theme-night');
    if(theme === 'sepia') body.classList.add('theme-sepia');
    else if(theme === 'night') body.classList.add('theme-night');
    else body.classList.add('theme-sand');
  }

  themeSelectEl.addEventListener('change', ()=>{
    applyTheme(themeSelectEl.value);
  });

  /* ---------------------------------
     Vasemman palstan koon säätö
  --------------------------------- */

  function setupResizeHandle(){
    if(!resizeHandle || !leftPane) return;
    let isResizing = false;
    function startResize(e){
      isResizing = true;
      resizeHandle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    }
    function duringResize(e){
      if(!isResizing) return;
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const min = 260;
      const max = 520;
      const newWidth = Math.max(min, Math.min(max, clientX));
      leftPane.style.width = `${newWidth}px`;
    }
    function stopResize(){
      isResizing = false;
      resizeHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', duringResize);
    document.addEventListener('mouseup', stopResize);
    resizeHandle.addEventListener('touchstart', startResize, {passive:false});
    document.addEventListener('touchmove', duringResize, {passive:false});
    document.addEventListener('touchend', stopResize);
  }
  setupResizeHandle();

  /* ---------------------------------
     Infografiikka-eventit
  --------------------------------- */

  textContentEl.addEventListener('click', (e)=>{
    // avaa/sulje infografiikka
    const toggleBtn = e.target.closest('.infographic-toggle');
    if(toggleBtn){
      const wrap = toggleBtn.closest('.infographic-wrap');
      if(!wrap) return;
      const body = wrap.querySelector('.infographic-body');
      if(!body) return;
      const labelEl = toggleBtn.querySelector('.infographic-toggle-label');

      const isOpen = toggleBtn.dataset.state === 'open';
      if(isOpen){
        body.setAttribute('hidden','hidden');
        toggleBtn.dataset.state = 'closed';
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded','false');
        if(labelEl){
          labelEl.innerHTML = 'avaa <strong>infografiikka</strong>';
        }
      }else{
        body.removeAttribute('hidden');
        toggleBtn.dataset.state = 'open';
        toggleBtn.classList.add('open');
        toggleBtn.setAttribute('aria-expanded','true');
        if(labelEl){
          labelEl.innerHTML = 'sulje <strong>infografiikka</strong>';
        }
      }
      return;
    }

    // 2D / 3D -painikkeet (ulkoinen ulkoasu, ei pakollista logiikkaa vielä)
    const modeBtn = e.target.closest('.infographic-mode-btn');
    if(modeBtn){
      const header = modeBtn.closest('.infographic-header');
      if(!header) return;
      const all = header.querySelectorAll('.infographic-mode-btn');
      all.forEach(b => b.classList.remove('active'));
      modeBtn.classList.add('active');
      // tähän voi myöhemmin lisätä logiikkaa 2D/3D vaihtoon
    }
  });

  /* ---------------------------------
     Init
  --------------------------------- */

  injectInfographicStyles();
  applyTheme('sand');

  if(GLOBAL.essays && GLOBAL.essays.length){
    currentEssayId = GLOBAL.essays[0].id;
    buildEssayList("");
    renderContinuousView(currentEssayId);
  }else{
    textStatusEl.textContent = "Ei kirjoituksia.";
  }
}
