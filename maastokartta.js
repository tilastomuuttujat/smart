// maastokartta.js – TähtiKirja 2025
// "Maasto" = pehmeä korkeuskartta MI-avaruudesta + esseen MI-huiput.
// Integroituu MapControlleriin: Maasto_Init / Maasto_SetEssay / Maasto_SetSettings / Maasto_Refresh.

(function(){
  const ENTITIES_MI_URL = "entities_mi.json";
  const ESSAYS_MI_URL   = "essays_mi.json";

  let DATA_LOADED = false;
  let dataPromise = null;

  let ENTITIES = [];
  let ESSAYS = [];
  let ESSAYS_BY_ID = {};
  let ESSAYS_BY_CANON = {};

  function debug(msg){
    const box = document.getElementById("debug-box");
    if (box) box.textContent = "debug: " + msg;
  }

  function normLabel(s){
    return (s || "").toString().trim().toLowerCase();
  }

  function canonicalEssayId(id){
    const s = (id || "").toString().trim();
    const m = s.match(/^(\d{3})/);
    return m ? m[1] : s;
  }

  function parseEssaysMiJSON(data){
    if (!Array.isArray(data)) return [];
    const MI_CANON_FIELDS = [
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
    const out = [];
    data.forEach((row, idx) => {
      if (!row) return;
      const essayIdRaw = row.essay_id || row.essayId || row.id || String(idx+1).padStart(3,"0");
      const essayId    = String(essayIdRaw || "").trim();
      const fullId  = essayId || String(idx+1).padStart(3,"0");
      const canonId = canonicalEssayId(fullId);
      const title   = row.title   || "";
      const summary = row.summary || "";
      const miSlots = [];
      MI_CANON_FIELDS.forEach((fieldName, slotIndex) => {
        const v = row[fieldName];
        if (!v) return;
        miSlots.push({
          canonical: String(v).trim(),
          slotIndex // 0–11 → näytettäessä +1
        });
      });
      out.push({
        id: fullId,
        essayId,
        canonId,
        title,
        summary,
        miSlots
      });
    });
    return out;
  }

  function loadData(){
    if (dataPromise) return dataPromise;

    dataPromise = Promise.all([
      fetch(ENTITIES_MI_URL).then(r => {
        if (!r.ok) throw new Error("maasto: entities_mi.json HTTP "+r.status);
        return r.json();
      }),
      fetch(ESSAYS_MI_URL).then(r => {
        if (!r.ok) throw new Error("maasto: essays_mi.json HTTP "+r.status);
        return r.json();
      })
    ])
    .then(([entitiesRaw, essaysRaw]) => {
      const toNum = v => {
        if (v === null || v === undefined || v === "") return NaN;
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      ENTITIES = (entitiesRaw || []).map(e => {
        const umap2d = e.umap_2d || [];
        const pca    = e.pca     || [];
        const tsne   = e.tsne    || [];
        return {
          canonical: e.canonical || e.label || "",
          label:     e.label || e.canonical || "",
          rkm:       (e.rkm || "").toString().trim().toUpperCase(),
          layer:     e.layer || "shell",
          x_umap: umap2d.length >= 2 ? toNum(umap2d[0]) : (e.umap && e.umap.x ? toNum(e.umap.x) : 0),
          y_umap: umap2d.length >= 2 ? toNum(umap2d[1]) : (e.umap && e.umap.y ? toNum(e.umap.y) : 0),
          x_pca:  pca.length   >= 2 ? toNum(pca[0])    : (e.pca  && e.pca.x  ? toNum(e.pca.x)  : 0),
          y_pca:  pca.length   >= 2 ? toNum(pca[1])    : (e.pca  && e.pca.y  ? toNum(e.pca.y)  : 0),
          x_tsne: tsne.length  >= 2 ? toNum(tsne[0])   : (e.tsne && e.tsne.x ? toNum(e.tsne.x) : 0),
          y_tsne: tsne.length  >= 2 ? toNum(tsne[1])   : (e.tsne && e.tsne.y ? toNum(e.tsne.y) : 0)
        };
      });

      ESSAYS = parseEssaysMiJSON(essaysRaw || []);
      ESSAYS_BY_ID = {};
      ESSAYS_BY_CANON = {};
      ESSAYS.forEach(es => {
        ESSAYS_BY_ID[es.id] = es;
        if (es.essayId && es.essayId !== es.id) {
          ESSAYS_BY_ID[es.essayId] = es;
        }
        ESSAYS_BY_CANON[es.canonId] = es;
        if (es.essayId) {
          ESSAYS_BY_CANON[canonicalEssayId(es.essayId)] = es;
        }
      });

      DATA_LOADED = true;
      debug("maasto: data OK – entiteetit " + ENTITIES.length + ", esseet "+ESSAYS.length);
    })
    .catch(err => {
      console.error("maastokartta datavirhe:", err);
      debug("maasto datavirhe");
      throw err;
    });

    return dataPromise;
  }

  // ---------------------------------------
  // MaastoInstance – canvas-renderöinti
  // ---------------------------------------
  class MaastoInstance {
    constructor(container){
      this.container = container;
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.settings = { coordMode: "umap", rkm: null, layer: null };
      this.currentEssayId = null;
      this.inited = false;
    }

    attachTo(container){
      this.container = container;
      if (!this.canvas) return;
      this.container.innerHTML = "";
      this.container.appendChild(this.canvas);
      this.resize();
      this.draw();
    }

    async init(opts){
      await loadData();
      this.buildCanvas();
      this.currentEssayId = (opts && opts.essayId) || null;
      this.inited = true;
      this.draw();

      window.addEventListener("resize", () => {
        this.resize();
        this.draw();
      });
    }

    buildCanvas(){
      this.container.innerHTML = "";
      this.canvas = document.createElement("canvas");
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.display = "block";
      this.canvas.style.background = "none";
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.resize();
    }

    resize(){
      if (!this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(10, rect.width || 600);
      const h = Math.max(10, rect.height || 400);
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = w+"px";
      this.canvas.style.height = h+"px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
    }

    getXY(e){
      const mode = (this.settings && this.settings.coordMode) || "umap";
      if (mode === "pca")  return { x: e.x_pca,  y: e.y_pca  };
      if (mode === "tsne") return { x: e.x_tsne, y: e.y_tsne };
      return { x: e.x_umap, y: e.y_umap };
    }

    getFilteredEntities(){
      const filtered = ENTITIES.filter(e => {
        if (this.settings && this.settings.rkm && this.settings.rkm[e.rkm] === false) return false;
        const layer = e.layer || "shell";
        if (this.settings && this.settings.layer && this.settings.layer[layer] === false) return false;
        const {x,y} = this.getXY(e);
        return Number.isFinite(x) && Number.isFinite(y);
      });
      return filtered;
    }

    computeBounds(entities){
      if (!entities.length) return null;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      entities.forEach(e => {
        const {x,y} = this.getXY(e);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
      const padX = (maxX - minX) * 0.08 || 1;
      const padY = (maxY - minY) * 0.08 || 1;
      return {
        minX: minX - padX,
        maxX: maxX + padX,
        minY: minY - padY,
        maxY: maxY + padY
      };
    }

    project(bounds, x, y){
      const {minX,maxX,minY,maxY} = bounds;
      const sx = (x - minX) / (maxX - minX || 1);
      const sy = (y - minY) / (maxY - minY || 1);
      const px = sx * this.width;
      const py = this.height - sy * this.height;
      return { x: px, y: py };
    }

    getEssayMiSlots(essayId){
      if (!essayId) return [];
      const es =
        ESSAYS_BY_ID[essayId] ||
        ESSAYS_BY_CANON[canonicalEssayId(essayId)];
      if (!es || !Array.isArray(es.miSlots)) return [];
      return es.miSlots;
    }

    draw(){
      if (!this.ctx || !DATA_LOADED) return;

      const ctx = this.ctx;
      ctx.clearRect(0,0,this.width,this.height);

      // taustagradientti
      const g = ctx.createLinearGradient(0,0,0,this.height);
      g.addColorStop(0,   "#151313");
      g.addColorStop(0.4, "#262018");
      g.addColorStop(1,   "#101418");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,this.width,this.height);

      const entities = this.getFilteredEntities();
      if (!entities.length) {
        debug("maasto: ei entiteettejä");
        return;
      }

      const bounds = this.computeBounds(entities);
      if (!bounds) return;

      // "korkeuskenttä": pehmeät blobit
      ctx.save();
      ctx.globalAlpha = 0.12;
      entities.forEach(e => {
        const {x,y} = this.getXY(e);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const p = this.project(bounds, x, y);
        const rBase = 24;
        const r = (e.layer === "core") ? rBase*1.3 :
                  (e.layer === "mantle") ? rBase :
                  rBase*0.8;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        // hieman eri sävyjä rkm:n mukaan
        if (e.rkm === "R") {
          grad.addColorStop(0, "rgba(255,220,160,0.9)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        } else if (e.rkm === "K") {
          grad.addColorStop(0, "rgba(170,230,180,0.9)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        } else { // M
          grad.addColorStop(0, "rgba(210,180,250,0.9)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.restore();

      // kevyt "routa"/kohina, ettei näytä liian tasaiselta
      ctx.save();
      const noiseDensity = Math.round((this.width * this.height) / 9000);
      ctx.globalAlpha = 0.07;
      for (let i=0; i<noiseDensity; i++){
        const x = Math.random()*this.width;
        const y = Math.random()*this.height;
        const r = 1 + Math.random()*1.5;
        ctx.fillStyle = "rgba(0,0,0,"+(0.3+Math.random()*0.3)+")";
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // tämän esseen MI-huiput
      const slots = this.getEssayMiSlots(this.currentEssayId);
      if (slots.length){
        ctx.save();
        ctx.globalAlpha = 1.0;
        slots.forEach(slot => {
          const canonical = (slot.canonical || "").toString().trim();
          if (!canonical) return;
          const key = normLabel(canonical);
          const ent = entities.find(e => normLabel(e.canonical) === key);
          if (!ent) return;
          const {x,y} = this.getXY(ent);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          const p = this.project(bounds, x, y);

          // kirkas huippu
          const r = 10;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, "rgba(255,245,210,0.95)");
          grad.addColorStop(0.7, "rgba(255,215,150,0.15)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI*2);
          ctx.fill();

          // MI-numero keskelle
          const n = (slot.slotIndex ?? 0) + 1;
          ctx.fillStyle = "rgba(10,6,3,0.95)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7, 0, Math.PI*2);
          ctx.fill();

          ctx.fillStyle = "#ffecc5";
          ctx.font = "10px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(n), p.x, p.y+0.5);
        });
        ctx.restore();
      }
    }

    setEssay(essayId){
      this.currentEssayId = essayId;
      if (!this.inited) return;
      this.draw();
    }

    setSettings(settings){
      this.settings = settings || this.settings;
      if (!this.inited) return;
      this.draw();
    }

    refresh(){
      if (!this.inited) return;
      this.resize();
      this.draw();
    }
  }

  // ---------------------------------------
  // Yksi instanssi + host-API
  // ---------------------------------------
  let currentInstance = null;
  let pendingEssayId = null;
  let pendingSettings = null;

  window.Maasto_Init = function(container){
    debug("Maasto_Init");
    if (!container) {
      console.error("Maasto_Init: container puuttuu");
      return;
    }

    if (!currentInstance){
      currentInstance = new MaastoInstance(container);
      currentInstance.init({ essayId: pendingEssayId }).catch(err => {
        console.error("Maasto init-virhe:", err);
      });
    } else {
      currentInstance.attachTo(container);
      if (pendingEssayId) {
        currentInstance.setEssay(pendingEssayId);
      }
      if (pendingSettings) {
        currentInstance.setSettings(pendingSettings);
      }
    }
  };

  window.Maasto_SetEssay = function(essayId){
    pendingEssayId = essayId;
    if (currentInstance && currentInstance.inited){
      currentInstance.setEssay(essayId);
    }
  };

  window.Maasto_SetSettings = function(settings){
    pendingSettings = settings || null;
    if (currentInstance && currentInstance.inited){
      currentInstance.setSettings(settings);
    }
  };

  window.Maasto_Refresh = function(){
    if (currentInstance && currentInstance.inited){
      currentInstance.refresh();
    }
  };

  console.log("maastokartta.js ladattu – Maasto_* -API valmiina");
})();
