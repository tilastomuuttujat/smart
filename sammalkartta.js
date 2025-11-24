// sammalkartta.js
// Kevyt 2D-UMAP-sammalkartta, host-API-synkalla kirjan kanssa.
// Vaatii entities_mi.json ja essays_mi.json samasta hakemistosta.

(function() {
  const ENTITIES_MI_URL = "entities_mi.json";
  const ESSAYS_MI_URL   = "essays_mi.json";

  // --- D3-lataus ---
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

  // --- Data ---
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
          slotIndex
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
          const rkm = (e.rkm || "").toString().trim().toUpperCase() || "R";
          const layer = e.layer || "shell";
          const clusterId = (e.cluster_id !== undefined && e.cluster_id !== null && e.cluster_id !== "")
            ? Number(e.cluster_id) : null;

          return {
            id:        String(e.id),
            label:     String(e.label || ""),
            canonical: canonical,
            key,
            rkm,
            layer,
            group:        e.group || "",
            cluster_id:   clusterId,
            cluster_name: e.cluster_name || "",
            x_umap: toNum(e.x_umap ?? (e.umap && e.umap.x)),
            y_umap: toNum(e.y_umap ?? (e.umap && e.umap.y))
          };
        });

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

        DATA_LOADED = true;
      })
      .catch(err => {
        console.error("Sammalkartan datavirhe:", err);
        throw err;
      });

    return dataPromise;
  }

  // --- Sammalkartta-instanssi 2D ---
  class SammalkarttaInstance {
    constructor(container) {
      this.container = container;
      this.svg = null;
      this.rootG = null;          // zoomattava ryhmä
      this.heatLayer = null;
      this.pointsLayer = null;
      this.haloLayer = null;
      this.labelLayer = null;
      this.xScale = null;
      this.yScale = null;
      this.currentEssayId = null;
      this.viewMode = "2d";
      this.inited = false;
      this.zoom = null;
      this.zoomTransform = null;
    }

    attachTo(container) {
      this.container = container;
      if (!this.svg) return;
      this.container.innerHTML = "";
      this.container.appendChild(this.svg.node());
      this.resize();
      this.updateSelection(this.currentEssayId);
    }

    async init(options) {
      await loadData();
      this.buildBaseSvg();
      this.renderBackground();
      this.updateSelection(options && options.essayId ? options.essayId : null);
      this.setViewMode(options && options.viewMode ? options.viewMode : "2d");
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

      const vbPad = 20;
      this.svg = d3.select(this.container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `${-vbPad} ${-vbPad} ${width + vbPad*2} ${height + vbPad*2}`)
        .style("display", "block")
        .style("background", "none");

      const g = this.svg.append("g");
      this.rootG = g;
      this.heatLayer   = g.append("g").attr("class", "sammal-heat");
      this.pointsLayer = g.append("g").attr("class", "sammal-points");
      this.haloLayer   = g.append("g").attr("class", "sammal-halos");
      this.labelLayer  = g.append("g").attr("class", "sammal-labels");

      // zoom: hiiren rulla + 2-sorminen pinch
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

    computeScales() {
      const d3 = window.d3;
      if (!d3 || !MI_ENTITIES.length) return;
      const rect = this.container.getBoundingClientRect();
      const width  = rect.width  || 600;
      const height = rect.height || 400;
      const padding = 32;
      const xs = MI_ENTITIES.map(d => d.x_umap);
      const ys = MI_ENTITIES.map(d => d.y_umap);
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

      const density = d3.contourDensity()
        .x(d => this.xScale(d.x_umap))
        .y(d => this.yScale(d.y_umap))
        .size([width, height])
        .bandwidth(25)
        .thresholds(30)(MI_ENTITIES);

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
        .data(MI_ENTITIES)
        .join("circle")
        .attr("cx", d => this.xScale(d.x_umap))
        .attr("cy", d => this.yScale(d.y_umap))
        .attr("r", d => {
          if (d.layer === "core") return 2.8;
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

      if (!es || !es.miSlots || !es.miSlots.length) return;

      const selected = [];
      es.miSlots.forEach(({canonical, slotIndex}) => {
        const key = normLabel(canonical);
        const ent = MI_BY_CANON.get(key);
        if (!ent) return;
        selected.push({ ent, slotIndex });
      });

      if (!selected.length) return;

      this.haloLayer.selectAll("circle")
        .data(selected)
        .join("circle")
        .attr("cx", d => this.xScale(d.ent.x_umap))
        .attr("cy", d => this.yScale(d.ent.y_umap))
        .attr("r", 14)
        .attr("fill", "none")
        .attr("stroke", "#ffe3b0")
        .attr("stroke-width", 2.2)
        .attr("stroke-opacity", 0.9);

      const labelG = this.labelLayer.selectAll("g.mi-label")
        .data(selected)
        .join("g")
        .attr("class", "mi-label")
        .attr("transform", d => {
          const x = this.xScale(d.ent.x_umap);
          const y = this.yScale(d.ent.y_umap);
          return `translate(${x},${y})`;
        });

      labelG.append("rect")
        .attr("x", -12)
        .attr("y", -11)
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("width", 24)
        .attr("height", 22)
        .attr("fill", "rgba(8,5,3,0.96)")
        .attr("stroke", "#ffe3b0")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.95);

      labelG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "2")
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "#ffecc5")
        .text(d => d.slotIndex + 1);
    }

    setEssay(essayId) {
      if (!DATA_LOADED) {
        this.currentEssayId = essayId;
        return;
      }
      this.updateSelection(essayId);
    }

    setViewMode(mode) {
      this.viewMode = (mode === "3d" ? "3d" : "2d");
      // 2D-näkymä ei muutu vielä tämän mukaan,
      // 3D tulee erillisestä toteutuksesta.
    }
  }

  let currentInstance = null;
  let pendingEssayId = null;
  let pendingViewMode = "2d";

  window.mountSammalkarttaInline = function(container, options) {
    if (!container) return;

    if (!currentInstance) {
      currentInstance = new SammalkarttaInstance(container);
      const initOptions = Object.assign(
        { essayId: pendingEssayId, viewMode: pendingViewMode },
        options || {}
      );
      currentInstance.init(initOptions).catch(err => {
        console.error("Sammalkartan init-virhe:", err);
      });
    } else {
      currentInstance.attachTo(container);
      const mode = (options && options.viewMode) || pendingViewMode;
      const eid  = (options && options.essayId) || pendingEssayId;
      if (mode) currentInstance.setViewMode(mode);
      if (eid)  currentInstance.setEssay(eid);
    }
  };

  window.setActiveEssayFromHost = function(essayId) {
    pendingEssayId = essayId;
    if (currentInstance && currentInstance.inited) {
      currentInstance.setEssay(essayId);
    }
  };

  window.setViewModeFromHost = function(mode) {
    pendingViewMode = (mode === "3d" ? "3d" : "2d");
    if (currentInstance && currentInstance.inited) {
      currentInstance.setViewMode(pendingViewMode);
    }
  };

})();

// ======================================================
//  3D-SAMMALKARTTA – ERILLINEN TOTEUTUS (UUSI VERSIO)
//  mountSammalkartta3DInline(container, {essayId})
// ======================================================
(function(){

  const TSV_URL = "entities_mi_rkm_clustered.tsv";

  // Yksinkertainen TSV-parsi
  function parseEntitiesTsv(text){
    const lines = text.trim().split(/\r?\n/);
    if(lines.length < 2) return [];

    const header = lines[0].split("\t");
    const idx = (name) => header.indexOf(name);

    const ixX       = idx("x");
    const ixY       = idx("y");
    const ixZ       = idx("z");
    const ixCluster = idx("cluster_id");
    const ixLabel   = idx("label");

    if(ixX === -1 || ixY === -1 || ixZ === -1){
      throw new Error("x, y, z -sarakkeita ei löytynyt entities_mi_rkm_clustered.tsv:stä");
    }

    const out = [];
    for(let i=1; i<lines.length; i++){
      const row = lines[i].split("\t");
      if(row.length < header.length) continue;

      const x = parseFloat(row[ixX] || "0");
      const y = parseFloat(row[ixY] || "0");
      const z = parseFloat(row[ixZ] || "0");
      if(!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

      const clusterId = (ixCluster >= 0)
        ? parseInt(row[ixCluster] || "0", 10)
        : 0;

      const label = (ixLabel >= 0) ? row[ixLabel] : "";

      out.push({
        x, y, z,
        clusterId: isNaN(clusterId) ? 0 : clusterId,
        label
      });
    }
    return out;
  }

  // Normaaliointi [-1,1] kuutioon
  function normalizeEntities3D(entities){
    if(!entities.length) return;

    let minX=Infinity, maxX=-Infinity;
    let minY=Infinity, maxY=-Infinity;
    let minZ=Infinity, maxZ=-Infinity;

    entities.forEach(e=>{
      if(e.x < minX) minX = e.x;
      if(e.x > maxX) maxX = e.x;
      if(e.y < minY) minY = e.y;
      if(e.y > maxY) maxY = e.y;
      if(e.z < minZ) minZ = e.z;
      if(e.z > maxZ) maxZ = e.z;
    });

    const spanX = (maxX - minX) || 1;
    const spanY = (maxY - minY) || 1;
    const spanZ = (maxZ - minZ) || 1;
    const span  = Math.max(spanX, spanY, spanZ) || 1;

    entities.forEach(e=>{
      e.nx = ((e.x - minX) / span - 0.5) * 2.0;
      e.ny = ((e.y - minY) / span - 0.5) * 2.0;
      e.nz = ((e.z - minZ) / span - 0.5) * 2.0;
    });
  }

  // Klusteri-värit
  const CLUSTER_COLORS = [
    0xffc107, // keltainen
    0x4caf50, // vihreä
    0x03a9f4, // sininen
    0xe91e63, // pinkki
    0x9c27b0, // violetti
    0xff9800, // oranssi
    0x795548, // ruskea
    0x00bcd4, // turkoosi
    0x8bc34a, // lime
    0xf44336  // punainen
  ];

    function buildScene(container, entities){
    if(typeof THREE === "undefined"){
      container.innerHTML = "<p style='color:#fdd;font-size:14px;padding:8px;'>Three.js puuttuu (THREE ei määritelty).</p>";
      return;
    }

    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);

    const camera = new THREE.PerspectiveCamera(55,width/height,0.1,1000);
    camera.position.set(0,0,5);

    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width,height);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff,0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff,0.6);
    dir.position.set(3,5,2);
    scene.add(dir);

    const N = entities.length;
    const positions = new Float32Array(N*3);
    const colors    = new Float32Array(N*3);

    for(let i=0;i<N;i++){
      const e = entities[i];
      positions[i*3+0] = e.nx * 3.0;
      positions[i*3+1] = e.ny * 3.0;
      positions[i*3+2] = e.nz * 3.0;

      const col = CLUSTER_COLORS[(e.clusterId||0) % CLUSTER_COLORS.length] || 0xffffff;
      const r = ((col>>16)&255)/255;
      const g = ((col>>8)&255)/255;
      const b = (col&255)/255;

      colors[i*3+0] = r;
      colors[i*3+1] = g;
      colors[i*3+2] = b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
    geometry.setAttribute("color",    new THREE.BufferAttribute(colors,3));

    const material = new THREE.PointsMaterial({
      size:0.035,
      vertexColors:true
    });

    const points = new THREE.Points(geometry,material);
    scene.add(points);

    // --- VEDOT (hiiri + kosketus) ---

    let dragging = false;
    let prevX = 0, prevY = 0;

    renderer.domElement.style.cursor = "grab";

    function applyDrag(dx, dy){
      scene.rotation.y += dx * 0.005;
      scene.rotation.x += dy * 0.005;
    }

    // Hiiri
    renderer.domElement.addEventListener("mousedown", e=>{
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", ()=>{
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    });

    window.addEventListener("mousemove", e=>{
      if(!dragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      applyDrag(dx, dy);
    });

    // Kosketus (iPad)
    renderer.domElement.addEventListener("touchstart", e=>{
      if(e.touches.length !== 1) return;
      dragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
      renderer.domElement.style.cursor = "grabbing";
    }, {passive:false});

    window.addEventListener("touchend", e=>{
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    }, {passive:false});

    window.addEventListener("touchmove", e=>{
      if(!dragging || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - prevX;
      const dy = t.clientY - prevY;
      prevX = t.clientX;
      prevY = t.clientY;
      applyDrag(dx, dy);
      e.preventDefault();
    }, {passive:false});

    // --- Resize ---
    function onResize(){
      const w = container.clientWidth  || 800;
      const h = container.clientHeight || 600;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h);
    }
    window.addEventListener("resize", onResize);

    // --- ANIMAATIO: jatkuva hidas pyörintä ---
    function animate(){
      requestAnimationFrame(animate);

      // aina pyörii vähän, riippumatta siitä raahaako käyttäjä vai ei
      scene.rotation.y += 0.003;

      renderer.render(scene,camera);
    }
    animate();
  }


  // Host-funktio, jota Book.html kutsuu
  window.mountSammalkartta3DInline = async function(container, opts){
    container.innerHTML =
      "<p style='color:#ccc;font-size:13px;padding:8px;'>Ladataan 3D-sammalkarttaa…</p>";

    if(typeof THREE === "undefined"){
      container.innerHTML =
        "<p style='color:#fdd;font-size:14px;'>Three.js ei ole ladattu. Varmista &lt;script src=&quot;https://unpkg.com/three@0.160.0/build/three.min.js&quot;&gt; headissä.</p>";
      return;
    }

    try{
      const res = await fetch(TSV_URL);
      if(!res.ok){
        throw new Error("HTTP " + res.status + " – " + TSV_URL);
      }
      const text = await res.text();
      const entities = parseEntitiesTsv(text);
      if(!entities.length){
        throw new Error("Tiedosto on tyhjä tai sarakeotsikot puuttuvat.");
      }

      normalizeEntities3D(entities);

      container.innerHTML = "";
      build3DScene(container, entities);
      console.log("3D-sammalkartta avattu. EssayId:",
        opts && opts.essayId);

    }catch(err){
      console.error("3D-sammalkartta-virhe:", err);
      container.innerHTML =
        "<p style='color:#fdd;font-size:14px;'>3D-datan lataus epäonnistui: "
        + (err.message || String(err))
        + "</p>";
    }
  };

})();

