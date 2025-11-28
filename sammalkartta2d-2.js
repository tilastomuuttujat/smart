// sammalkartta2d.js – TähtiKirja 2025
// D3-pohjainen 2D-sammalkartta: contourDensity + pisteet + MI-pillerit.
// Integroituu MapControlleriin: Sammal2D_Init / SetEssay / SetSettings / Refresh.
// Lisätty riskitaso (lasketaan skriptissä, ei koske JSON-dataan).

(function() {
  const ENTITIES_MI_URL = "entities_mi.json";
  const ESSAYS_MI_URL   = "essays_mi.json";

  // ---------------------------------------------
  // D3-lataus
  // ---------------------------------------------
  let d3Promise = null;
  function ensureD3() {
    if (window.d3) return Promise.resolve(window.d3);
    if (d3Promise) return d3Promise;
    d3Promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js";
      s.onload = () => resolve(window.d3);
      s.onerror = () => reject(new Error("d3.min.js lataus epäonnistui"));
      document.head.appendChild(s);
    });
    return d3Promise;
  }

  function debug(msg) {
    const box = document.getElementById("debug-box");
    if (box) box.textContent = "debug: " + msg;
  }

  // ---------------------------------------------
  // Data
  // ---------------------------------------------
  let DATA_LOADED = false;
  let dataPromise = null;
  let MI_ENTITIES = [];
  let MI_BY_CANON = new Map();
  let ESSAYS = [];
  let ESSAYS_BY_ID = {};
  let ESSAYS_BY_CANON = {};

  function normLabel(s) {
    return (s || "").toString().toLowerCase().trim();
  }

  function canonicalEssayId(id) {
    const s = (id || "").toString().trim();
    const m = s.match(/^(\d{3})/);
    return m ? m[1] : s;
  }

  function parseEssaysMiJSON(data) {
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
          slotIndex   // 0–11 → kartalla +1 näyttää 1–12
        });
      });
      const miVals = miSlots.map(s => s.canonical);
      out.push({
        id: fullId,
        essayId,
        canonId,
        title,
        summary,
        miSlots,
        miVals,
        miNormSet: new Set(miVals.map(normLabel))
      });
    });
    return out;
  }

  // ---------------------------------------------
  // Riskitason laskenta (vain skriptissä)
  // ---------------------------------------------
  function computeRiskLevels() {
    // Käytetään UMAP-2D koordinaatteja tiheyden proxyyn.
    const pts = MI_ENTITIES
      .map((e, i) => {
        const x = e.x_umap;
        const y = e.y_umap;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { i, x, y };
      })
      .filter(Boolean);

    if (!pts.length) return;

    const dists = new Array(pts.length).fill(0);

    // Lasketaan karkeasti: etäisyys lähimpään naapuriin
    for (let a = 0; a < pts.length; a++) {
      let best = Infinity;
      const ax = pts[a].x;
      const ay = pts[a].y;
      for (let b = 0; b < pts.length; b++) {
        if (a === b) continue;
        const dx = pts[b].x - ax;
        const dy = pts[b].y - ay;
        const d2 = dx*dx + dy*dy;
        if (d2 < best) best = d2;
      }
      dists[a] = Math.sqrt(best);
    }

    const valid = dists.filter(d => Number.isFinite(d) && d > 0);
    if (!valid.length) {
      // Ei järkevää skaalaa → jätetään riskit nollaan
      MI_ENTITIES.forEach(e => e.__riskLevel = 0.5);
      return;
    }

    const minD = Math.min(...valid);
    const maxD = Math.max(...valid);
    const span = maxD - minD || 1;

    // Pieni etäisyys = korkea tiheys = matala riski
    // iso etäisyys = harva alue = korkea riski / outlier
    pts.forEach((p, idx) => {
      const d = dists[idx];
      let r = (d - minD) / span;     // 0...1 (0=tiheä, 1=harva)
      r = Math.max(0, Math.min(1, r));
      MI_ENTITIES[p.i].__riskLevel = r;
    });

    // Fallback kaikille muille
    MI_ENTITIES.forEach(e => {
      if (typeof e.__riskLevel !== "number") e.__riskLevel = 0.5;
    });
  }

  function riskColor(r) {
    // 0 = vihreä, 0.5 = keltainen, 1 = punainen
    if (r <= 0.33) return "#7adf91";   // matala riski / mahdollisuus
    if (r <= 0.66) return "#ffd86b";   // keskitason jännite
    return "#ff7777";                  // korkea riski / reuna-alue
  }

  // ---------------------------------------------
  // Data lataus
  // ---------------------------------------------
  function loadData() {
    if (dataPromise) return dataPromise;
    dataPromise = ensureD3()
      .then(() => Promise.all([
        fetch(ENTITIES_MI_URL).then(r => {
          if (!r.ok) throw new Error("entities_mi.json HTTP " + r.status);
          return r.json();
        }),
        fetch(ESSAYS_MI_URL).then(r => {
          if (!r.ok) throw new Error("essays_mi.json HTTP " + r.status);
          return r.json();
        })
      ]))
      .then(([entitiesRaw, essaysRaw]) => {
        const toNum = v => {
          if (v === null || v === undefined || v === "") return NaN;
          const n = Number(v);
          return Number.isFinite(n) ? n : NaN;
        };

        MI_ENTITIES = (entitiesRaw || []).map(e => {
          const canonical = e.canonical || e.label || "";
          const key = normLabel(canonical || e.label || "");
          let rkm = (e.rkm || "").toString().trim().toUpperCase();
          if (!["R","K","M"].includes(rkm)) rkm = "R";
          const layer = e.layer || "shell";
          const clusterId = (e.cluster_id !== undefined && e.cluster_id !== null && e.cluster_id !== "")
            ? Number(e.cluster_id) : null;

          const umap2d = e.umap_2d || [];
          const umap3d = e.umap_3d || [];
          const pca    = e.pca     || [];
          const tsne   = e.tsne    || [];

          return {
            id:        String(e.canonical || e.id || ""),
            label:     String(e.label || e.canonical || ""),
            canonical: canonical,
            key,
            rkm,
            layer,
            group:        e.group || "",
            cluster_id:   clusterId,
            cluster_name: e.cluster_name || "",
            x_umap: umap2d.length >= 2 ? toNum(umap2d[0]) : (e.umap && e.umap.x ? toNum(e.umap.x) : 0),
            y_umap: umap2d.length >= 2 ? toNum(umap2d[1]) : (e.umap && e.umap.y ? toNum(e.umap.y) : 0),
            z_umap: umap3d.length >= 3 ? toNum(umap3d[2]) : (e.umap && e.umap.z ? toNum(e.umap.z) : 0),
            x_pca:  pca.length   >= 2 ? toNum(pca[0])    : (e.pca  && e.pca.x  ? toNum(e.pca.x)  : 0),
            y_pca:  pca.length   >= 2 ? toNum(pca[1])    : (e.pca  && e.pca.y  ? toNum(e.pca.y)  : 0),
            x_tsne: tsne.length  >= 2 ? toNum(tsne[0])   : (e.tsne && e.tsne.x ? toNum(e.tsne.x) : 0),
            y_tsne: tsne.length  >= 2 ? toNum(tsne[1])   : (e.tsne && e.tsne.y ? toNum(e.tsne.y) : 0),
            mi_slots: e.mi_slots || [],
            occurrences: e.occurrences || [],
            supercluster_id: e.supercluster_id || null,
            supercluster_name: e.supercluster_name || "",
            __riskLevel: 0.5 // alustetaan
          };
        });

        // Riskitasot (käytetään UMAP-koordinaatteja)
        computeRiskLevels();

        MI_BY_CANON = new Map();
        MI_ENTITIES.forEach(e => {
          if (e.key) MI_BY_CANON.set(e.key, e);
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

        // MI-slotit ulos muille (kirjalle, highlighterille)
        window.Sammal2D_GetMiSlotsForEssay = function(essayId){
          if (!essayId) return null;
          const es =
            ESSAYS_BY_ID[essayId] ||
            ESSAYS_BY_CANON[canonicalEssayId(essayId)];
          if (!es || !Array.isArray(es.miSlots)) return null;
          return es.miSlots;
        };

        DATA_LOADED = true;
        debug("data OK: entiteetit " + MI_ENTITIES.length + ", esseet " + ESSAYS.length);
      })
      .catch(err => {
        console.error("Sammalkartan datavirhe:", err);
        debug("datavirhe");
        throw err;
      });

    return dataPromise;
  }

  // ---------------------------------------------
  // SammalkarttaInstance (D3-SVG)
  // ---------------------------------------------
  class SammalkarttaInstance {
    constructor(container) {
      this.container = container;
      this.svg = null;
      this.rootG = null;
      this.heatLayer = null;
      this.pointsLayer = null;
      this.haloLayer = null;
      this.labelLayer = null;
      this.xScale = null;
      this.yScale = null;
      this.currentEssayId = null;
      this.inited = false;
      this.zoom = null;
      this.zoomTransform = null;
      this.settings = null;   // R/K/M, layer, coordMode
    }

    attachTo(container) {
      this.container = container;
      if (!this.svg) return;
      this.container.innerHTML = "";
      this.container.appendChild(this.svg.node());
      this.resize();
      this.renderBackground();
      this.updateSelection(this.currentEssayId);
    }

    async init(options) {
      await loadData();
      this.buildBaseSvg();
      this.renderBackground();
      this.updateSelection(options && options.essayId ? options.essayId : null);
      this.inited = true;

      window.addEventListener("resize", () => {
        this.resize();
        this.renderBackground();
        this.updateSelection(this.currentEssayId);
      });
    }

    buildBaseSvg() {
      const d3 = window.d3;
      if (!d3) return;
      this.container.innerHTML = "";

      const rect = this.container.getBoundingClientRect();
      const width  = rect.width  || 600;
      const height = rect.height || 400;

      this.svg = d3.select(this.container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("background", "none");

      const g = this.svg.append("g");
      this.rootG = g;
      
      this.heatLayer   = g.append("g").attr("class", "sammal-heat");
      this.pointsLayer = g.append("g").attr("class", "sammal-points");
      this.haloLayer   = g.append("g").attr("class", "sammal-halos");
      this.labelLayer  = g.append("g").attr("class", "sammal-labels");

      const zoom = d3.zoom()
        .filter(event => {
          if (event.type === "wheel") return true;
          if (event.type.startsWith("touch")) {
            return event.touches && event.touches.length === 2;
          }
          return false;
        })
        .scaleExtent([0.8, 4])
        .on("zoom", (event) => {
          this.zoomTransform = event.transform;
          if (this.rootG) {
            this.rootG.attr("transform", this.zoomTransform);
          }
        });

      this.svg.call(zoom);
      this.zoom = zoom;
      this.zoomTransform = d3.zoomIdentity;

      this.computeScales();
    }

    resize() {
      if (!this.svg) return;
      const rect = this.container.getBoundingClientRect();
      const width  = rect.width  || 600;
      const height = rect.height || 400;
      this.svg.attr("viewBox", `0 0 ${width} ${height}`);
      this.computeScales();
    }

    // Koordinaattien valinta settings.coordMode:n mukaan
    getXY(d) {
      const mode = (this.settings && this.settings.coordMode) || "umap";
      if (mode === "pca")  return { x: d.x_pca,  y: d.y_pca  };
      if (mode === "tsne") return { x: d.x_tsne, y: d.y_tsne };
      // oletus: umap
      return { x: d.x_umap, y: d.y_umap };
    }

    computeScales() {
      const d3 = window.d3;
      if (!d3 || !MI_ENTITIES.length) return;
      const rect = this.container.getBoundingClientRect();
      const width  = rect.width  || 600;
      const height = rect.height || 400;
      const padding = 32;

      const filtered = MI_ENTITIES.filter(d => {
        if (this.settings) {
          if (this.settings.rkm && this.settings.rkm[d.rkm] === false) return false;
          const layer = d.layer || "shell";
          if (this.settings.layer && this.settings.layer[layer] === false) return false;
        }
        return true;
      });

      const validEntities = filtered.filter(d => {
        const {x,y} = this.getXY(d);
        return Number.isFinite(x) && Number.isFinite(y);
      });

      if (!validEntities.length) return;

      const xs = validEntities.map(d => this.getXY(d).x);
      const ys = validEntities.map(d => this.getXY(d).y);
      const xDomain = d3.extent(xs);
      const yDomain = d3.extent(ys);

      this.xScale = d3.scaleLinear()
        .domain(xDomain)
        .nice()
        .range([padding, width - padding]);

      this.yScale = d3.scaleLinear()
        .domain(yDomain)
        .nice()
        .range([height - padding, padding]);
    }

    renderBackground() {
      const d3 = window.d3;
      if (!d3 || !MI_ENTITIES.length || !this.xScale || !this.yScale) return;

      const rect = this.container.getBoundingClientRect();
      const width  = rect.width  || 600;
      const height = rect.height || 400;

      this.heatLayer.selectAll("*").remove();
      this.pointsLayer.selectAll("*").remove();

      const filtered = MI_ENTITIES.filter(d => {
        if (this.settings) {
          if (this.settings.rkm && this.settings.rkm[d.rkm] === false) return false;
          const layer = d.layer || "shell";
          if (this.settings.layer && this.settings.layer[layer] === false) return false;
        }
        return true;
      });

      const validEntities = filtered.filter(d => {
        const {x,y} = this.getXY(d);
        return Number.isFinite(x) && Number.isFinite(y);
      });

      if (validEntities.length === 0) {
        console.warn("Ei kelvollisia koordinaatteja");
        return;
      }

      const density = d3.contourDensity()
        .x(d => this.xScale(this.getXY(d).x))
        .y(d => this.yScale(this.getXY(d).y))
        .size([width, height])
        .bandwidth(25)
        .thresholds(30)(validEntities);

      const maxVal = d3.max(density, d => d.value) || 1;
      const colorScale = d3.scaleSequential(d3.interpolatePlasma)
        .domain([0, maxVal * 0.7]);

      this.heatLayer.selectAll("path")
        .data(density)
        .join("path")
        .attr("d", d3.geoPath())
        .attr("fill", d => colorScale(d.value || 0))
        .attr("fill-opacity", 0.55)
        .attr("stroke", "rgba(255,255,255,0.2)")
        .attr("stroke-width", 0.4);

      this.pointsLayer.selectAll("circle")
        .data(validEntities)
        .join("circle")
        .attr("cx", d => this.xScale(this.getXY(d).x))
        .attr("cy", d => this.yScale(this.getXY(d).y))
        .attr("r", d => {
          if (d.layer === "core")   return 2.8;
          if (d.layer === "mantle") return 2.2;
          return 1.8;
        })
        .attr("fill", d => {
          if (d.rkm === "R") return "#f0c68a";
          if (d.rkm === "K") return "#9bd9a2";
          if (d.rkm === "M") return "#d2a7f0";
          return "#f0e0c8";
        })
        .attr("fill-opacity", 0.9)
        .attr("stroke", "#120d08")
        .attr("stroke-width", 0.7);
    }

    updateSelection(essayId) {
      this.currentEssayId = essayId;
      if (!this.svg || !DATA_LOADED) return;

      const d3 = window.d3;
      if (!d3) return;

      this.haloLayer.selectAll("*").remove();
      this.labelLayer.selectAll("*").remove();

      if (!essayId) return;

      const es =
        ESSAYS_BY_ID[essayId] ||
        ESSAYS_BY_CANON[canonicalEssayId(essayId)];

      if (!es || !es.miSlots || !es.miSlots.length) {
        debug("halo: ei esseetä tai MI-slotit puuttuvat (" + essayId + ")");
        return;
      }

      const selected = [];
      es.miSlots.forEach(({canonical, slotIndex}) => {
        const key = normLabel(canonical);
        const ent = MI_BY_CANON.get(key);
        if (!ent) return;

        if (this.settings) {
          if (this.settings.rkm && this.settings.rkm[ent.rkm] === false) return;
          const layer = ent.layer || "shell";
          if (this.settings.layer && this.settings.layer[layer] === false) return;
        }

        selected.push({ ent, slotIndex });
      });

      if (!selected.length) {
        debug("halo: ei yhteensopivia entiteettejä esseelle " + es.id);
        return;
      }

      const labelG = this.labelLayer.selectAll("g.mi-label")
        .data(selected, d => d.slotIndex);

      labelG.exit().remove();

      const labelGEnter = labelG.enter()
        .append("g")
        .attr("class", "mi-label");

      const labelMerged = labelGEnter.merge(labelG);

      labelMerged.selectAll("*").remove();

      labelMerged
        .attr("transform", d => {
          const xy = this.getXY(d.ent);
          const x = this.xScale(xy.x);
          const y = this.yScale(xy.y);
          return `translate(${x},${y})`;
        });

      labelMerged.each(function(d) {
        const g = d3.select(this);
        const ent = d.ent;
        const risk = typeof ent.__riskLevel === "number" ? ent.__riskLevel : 0.5;
        const strokeCol = riskColor(risk);

        // Taustaympyrä + riskireuna
        g.append("circle")
          .attr("r", 11)
          .attr("fill", "rgba(8,5,3,0.96)")
          .attr("stroke", strokeCol)
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 0.95);

        // MI-numero (0–11 → 1–12)
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "2")
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .attr("fill", "#ffecc5")
          .text((d.slotIndex ?? 0) + 1);
      });
    }

    // host-kutsut
    setEssay(essayId) {
      if (!DATA_LOADED) {
        this.currentEssayId = essayId;
        return;
      }
      this.updateSelection(essayId);
    }

    setSettings(settings) {
      this.settings = settings || null;
      this.computeScales();
      this.renderBackground();
      this.updateSelection(this.currentEssayId);
    }

    refresh() {
      this.resize();
      this.renderBackground();
      this.updateSelection(this.currentEssayId);
    }
  }

  // ---------------------------------------------
  // Yksi instanssi + host-silta
  // ---------------------------------------------
  let currentInstance = null;
  let pendingEssayId = null;
  let pendingSettings = null;

  window.Sammal2D_Init = function(container){
    debug("Sammal2D_Init");
    if (!container) {
      console.error("Sammal2D_Init: container puuttuu");
      return;
    }

    if (!currentInstance) {
      currentInstance = new SammalkarttaInstance(container);
      currentInstance.init({ essayId: pendingEssayId }).catch(err => {
        console.error("Sammalkartan init-virhe:", err);
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

  window.Sammal2D_SetEssay = function(essayId){
    pendingEssayId = essayId;
    debug("SetEssay " + essayId);
    if (currentInstance && currentInstance.inited) {
      currentInstance.setEssay(essayId);
    }
  };

  window.Sammal2D_SetSettings = function(settings){
    pendingSettings = settings || null;
    if (currentInstance && currentInstance.inited) {
      currentInstance.setSettings(settings);
    }
  };

  window.Sammal2D_Refresh = function(){
    if (currentInstance && currentInstance.inited) {
      currentInstance.refresh();
    }
  };

  // Preload-funktio: voidaan kutsua heti sivun latauksessa (book.html)
  window.Sammal2D_Preload = function(){
    loadData().catch(err => {
      console.error("Sammal2D preload error:", err);
    });
  };

  console.log("sammalkartta2d.js ladattu – Sammal2D_* -API + riskitasot valmiina");
})();




