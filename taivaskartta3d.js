// taivaskartta3d.js – TähtiKirja 2025
// 3D MI-taivas: pistepilvi koko MI-avaruudesta + esseen MI-huiput.
// Integroituu MapControlleriin: Taivas3D_Init / Taivas3D_SetEssay / Taivas3D_SetSettings / Taivas3D_Refresh.

(function(){
  const ENTITIES_MI_URL = "entities_mi.json";

  let DATA_LOADED = false;
  let dataPromise = null;

  let ENTITIES = [];
  let ENTITIES_BY_CANON = new Map();

  function debug(msg){
    const box = document.getElementById("debug-box");
    if (box) box.textContent = "debug: " + msg;
  }

  function normLabel(s){
    return (s || "").toString().trim().toLowerCase();
  }

  function ensureThree(){
    if (window.THREE) return true;
    console.error("Taivaskartta: THREE.js puuttuu");
    debug("Taivas: THREE.js puuttuu");
    return false;
  }

  function loadData(){
    if (dataPromise) return dataPromise;
    dataPromise = fetch(ENTITIES_MI_URL)
      .then(r => {
        if (!r.ok) throw new Error("taivas: entities_mi.json HTTP "+r.status);
        return r.json();
      })
      .then(raw => {
        const toNum = v => {
          if (v === null || v === undefined || v === "") return NaN;
          const n = Number(v);
          return Number.isFinite(n) ? n : NaN;
        };

        ENTITIES = (raw || []).map(e => {
          const emb   = e.embedding || {};
          const umap3 = e.umap_3d || [];
          const pca   = e.pca     || [];
          const tsne  = e.tsne    || [];

          const embedding = [
            toNum(emb.x ?? (Array.isArray(emb) && emb[0])),
            toNum(emb.y ?? (Array.isArray(emb) && emb[1])),
            toNum(emb.z ?? (Array.isArray(emb) && emb[2]))
          ];

          const umap = [
            umap3.length >= 3 ? toNum(umap3[0]) : NaN,
            umap3.length >= 3 ? toNum(umap3[1]) : NaN,
            umap3.length >= 3 ? toNum(umap3[2]) : NaN
          ];

          const pca3 = [
            pca.length >= 3 ? toNum(pca[0]) : NaN,
            pca.length >= 3 ? toNum(pca[1]) : NaN,
            pca.length >= 3 ? toNum(pca[2]) : NaN
          ];

          const tsne3 = [
            tsne.length >= 3 ? toNum(tsne[0]) : NaN,
            tsne.length >= 3 ? toNum(tsne[1]) : NaN,
            tsne.length >= 3 ? toNum(tsne[2]) : NaN
          ];

          const rec = {
            canonical: e.canonical || e.label || "",
            label:     e.label || e.canonical || "",
            rkm:       (e.rkm || "").toString().trim().toUpperCase(),
            layer:     e.layer || "shell",
            embedding,
            umap,
            pca:  pca3,
            tsne: tsne3
          };
          rec.key = normLabel(rec.canonical);
          return rec;
        });

        ENTITIES_BY_CANON = new Map();
        ENTITIES.forEach(e => {
          if (e.key) ENTITIES_BY_CANON.set(e.key, e);
        });

        DATA_LOADED = true;
        debug("Taivas: entiteetit " + ENTITIES.length);
      })
      .catch(err => {
        console.error("taivaskartta datavirhe:", err);
        debug("Taivas datavirhe");
        throw err;
      });

    return dataPromise;
  }

  // -----------------------------------------------------
  // 3D Taivas -instanssi
  // -----------------------------------------------------
  class Taivas3DInstance {
    constructor(container){
      this.container = container;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.starGroup = null;
      this.highlightGroup = null;

      this.width = 0;
      this.height = 0;

      this.coordMode = "umap";       // "umap" | "pca" | "tsne" (embedding fallback)
      this.rkmFilter = { R:true, K:true, M:true };
      this.layerFilter = { core:true, mantle:true, shell:true };

      this.currentEssayId = null;
      this.inited = false;

      this._animId = null;
      this._dragging = false;
      this._lastX = 0;
      this._lastY = 0;
      this._rotationY = 0;
      this._rotationX = 0;
    }

    attachTo(container){
      this.container = container;
      if (!this.renderer) return;
      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);
      this.resize();
    }

    async init(opts){
      if (!ensureThree()) return;
      await loadData();

      this.buildScene();
      this.currentEssayId = opts && opts.essayId ? opts.essayId : null;
      this.inited = true;

      this.updateStarCloud();
      this.updateSelection(this.currentEssayId);

      this.animate();
      window.addEventListener("resize", () => this.resize());
    }

    buildScene(){
      const THREE = window.THREE;
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || 600;
      const h = rect.height || 400;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x050609);

      const fov = 55;
      const aspect = w / h;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
      this.camera.position.set(0, 0, 180);

      const amb = new THREE.AmbientLight(0xffffff, 0.7);
      this.scene.add(amb);
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(100, 150, 120);
      this.scene.add(dir);

      this.starGroup = new THREE.Group();
      this.highlightGroup = new THREE.Group();
      this.scene.add(this.starGroup);
      this.scene.add(this.highlightGroup);

      this.renderer = new THREE.WebGLRenderer({ antialias:true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setSize(w, h, false);
      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      this.width = w;
      this.height = h;

      this.bindPointerEvents();
    }

    bindPointerEvents(){
      const dom = this.renderer.domElement;
      dom.style.touchAction = "none";

      const onDown = (e) => {
        this._dragging = true;
        this._lastX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
        this._lastY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
      };
      const onMove = (e) => {
        if (!this._dragging) return;
        const x = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
        const y = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
        const dx = x - this._lastX;
        const dy = y - this._lastY;
        this._lastX = x;
        this._lastY = y;

        this._rotationY += dx * 0.005;
        this._rotationX += dy * 0.005;
      };
      const onUp = () => { this._dragging = false; };

      dom.addEventListener("pointerdown", onDown);
      dom.addEventListener("pointermove", onMove);
      dom.addEventListener("pointerup", onUp);
      dom.addEventListener("pointerleave", onUp);
      dom.addEventListener("pointercancel", onUp);

      // pientä zoomia rullalla
      dom.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (!this.camera) return;
        const delta = e.deltaY * 0.0025;
        const z = this.camera.position.z + delta * 60;
        this.camera.position.z = Math.max(60, Math.min(400, z));
      }, { passive:false });
    }

    resize(){
      if (!this.renderer || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || 600;
      const h = rect.height || 400;
      this.width = w;
      this.height = h;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    getCoords(e){
      const mode = this.coordMode || "umap";
      let [x,y,z] = [0,0,0];
      if (mode === "pca" && e.pca)  [x,y,z] = e.pca;
      else if (mode === "tsne" && e.tsne) [x,y,z] = e.tsne;
      else if (mode === "umap" && e.umap) [x,y,z] = e.umap;
      else if (e.embedding) [x,y,z] = e.embedding;

      if (!Number.isFinite(x)) x = 0;
      if (!Number.isFinite(y)) y = 0;
      if (!Number.isFinite(z)) z = 0;

      return { x, y, z };
    }

    getFilteredEntities(){
      return ENTITIES.filter(e => {
        if (this.rkmFilter && this.rkmFilter[e.rkm] === false) return false;
        const layer = e.layer || "shell";
        if (this.layerFilter && this.layerFilter[layer] === false) return false;
        const {x,y,z} = this.getCoords(e);
        return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
      });
    }

    normalizeToSphere(entities){
      if (!entities.length) return [];

      let minX=Infinity, maxX=-Infinity;
      let minY=Infinity, maxY=-Infinity;
      let minZ=Infinity, maxZ=-Infinity;

      entities.forEach(e => {
        const {x,y,z} = this.getCoords(e);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      });

      const spanX = (maxX - minX) || 1;
      const spanY = (maxY - minY) || 1;
      const spanZ = (maxZ - minZ) || 1;

      const radius = 80;

      return entities.map(e => {
        const {x,y,z} = this.getCoords(e);
        const nx = ((x - minX)/spanX - 0.5) * 2;
        const ny = ((y - minY)/spanY - 0.5) * 2;
        const nz = ((z - minZ)/spanZ - 0.5) * 2;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        return {
          ent: e,
          x: (nx/len) * radius,
          y: (ny/len) * radius,
          z: (nz/len) * radius
        };
      });
    }

    updateStarCloud(){
      if (!this.scene || !window.THREE) return;
      const THREE = window.THREE;

      if (this.starGroup) {
        while(this.starGroup.children.length) {
          this.starGroup.remove(this.starGroup.children[0]);
        }
      }

      const filtered = this.getFilteredEntities();
      if (!filtered.length) {
        debug("Taivas: ei entiteettejä näkymässä");
        return;
      }

      const mapped = this.normalizeToSphere(filtered);

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(mapped.length * 3);
      const colors    = new Float32Array(mapped.length * 3);

      const colorR = new THREE.Color(0xf0c68a);
      const colorK = new THREE.Color(0x9bd9a2);
      const colorM = new THREE.Color(0xd2a7f0);
      const colorDefault = new THREE.Color(0xf0e0c8);

      mapped.forEach((p, i) => {
        positions[i*3+0] = p.x;
        positions[i*3+1] = p.y;
        positions[i*3+2] = p.z;

        let col;
        if (p.ent.rkm === "R") col = colorR;
        else if (p.ent.rkm === "K") col = colorK;
        else if (p.ent.rkm === "M") col = colorM;
        else col = colorDefault;

        colors[i*3+0] = col.r;
        colors[i*3+1] = col.g;
        colors[i*3+2] = col.b;

        // talletetaan koordinaatit entille, jotta valot voidaan asettaa samoille paikoille
        p.ent.__pos3d = { x:p.x, y:p.y, z:p.z };
      });

      geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
      geometry.setAttribute("color",    new THREE.BufferAttribute(colors,3));

      const material = new THREE.PointsMaterial({
        size: 1.8,
        vertexColors:true,
        transparent:true,
        opacity:0.9
      });

      const points = new THREE.Points(geometry, material);
      this.starGroup.add(points);
    }

    getMiSlotsForEssay(essayId){
      if (!essayId) return [];
      if (window.Sammal2D_GetMiSlotsForEssay) {
        const slots = window.Sammal2D_GetMiSlotsForEssay(essayId) || [];
        return Array.isArray(slots) ? slots : [];
      }
      // fallback: ei esseiden JSON-parsimista tässä, jos helper puuttuu
      return [];
    }

    updateSelection(essayId){
      if (!this.highlightGroup) return;
      this.currentEssayId = essayId || null;

      while(this.highlightGroup.children.length){
        this.highlightGroup.remove(this.highlightGroup.children[0]);
      }

      if (!this.currentEssayId || !ensureThree()) return;
      const THREE = window.THREE;

      const slots = this.getMiSlotsForEssay(this.currentEssayId);
      if (!slots.length) {
        debug("Taivas: ei MI-slotit esseelle "+this.currentEssayId);
        return;
      }

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffe4b2,
        transparent:true,
        opacity:0.2
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfff5dd
      });

      const haloGeom = new THREE.SphereGeometry(5, 20, 20);
      const coreGeom = new THREE.SphereGeometry(1.8, 16, 16);

      const labelSprites = [];

      slots.forEach(slot => {
        const canonical = (slot.canonical || "").toString().trim();
        if (!canonical) return;
        const key = normLabel(canonical);
        const ent = ENTITIES_BY_CANON.get(key);
        if (!ent || !ent.__pos3d) return;

        const pos = ent.__pos3d;

        const halo = new THREE.Mesh(haloGeom, haloMat.clone());
        halo.position.set(pos.x, pos.y, pos.z);
        this.highlightGroup.add(halo);

        const core = new THREE.Mesh(coreGeom, coreMat.clone());
        core.position.set(pos.x, pos.y, pos.z);
        this.highlightGroup.add(core);

        // yksinkertainen label "MI-n"
        const n = (slot.slotIndex ?? 0) + 1;
        const label = this.makeLabelSprite("MI "+n);
        label.position.set(pos.x * 1.04, pos.y * 1.04, pos.z * 1.04);
        this.highlightGroup.add(label);
        labelSprites.push(label);
      });

      // optionaalinen "valojuova" keskukseen
      if (slots.length >= 2) {
        const points = [];
        slots.forEach(slot => {
          const canonical = (slot.canonical || "").toString().trim();
          const key = normLabel(canonical);
          const ent = ENTITIES_BY_CANON.get(key);
          if (!ent || !ent.__pos3d) return;
          points.push(new THREE.Vector3(ent.__pos3d.x, ent.__pos3d.y, ent.__pos3d.z));
        });
        if (points.length >= 2) {
          const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xffe0aa,
            transparent:true,
            opacity:0.6
          });
          const line = new THREE.Line(lineGeom, lineMat);
          this.highlightGroup.add(line);
        }
      }
    }

    makeLabelSprite(text){
      const THREE = window.THREE;
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0,0,size,size);

      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.fillRect(0,0,size,size);

      ctx.fillStyle = "#ffecc5";
      ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(text, size/2, size/2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent:true
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(14, 14, 1);
      return sprite;
    }

    setEssay(essayId){
      this.currentEssayId = essayId || null;
      if (!this.inited) return;
      this.updateSelection(this.currentEssayId);
    }

    setSettings(settings){
      settings = settings || {};
      if (settings.coordMode) {
        // MapController käyttää "umap|pca|tsne"
        this.coordMode = settings.coordMode;
      }
      if (settings.rkm) {
        this.rkmFilter = { ...this.rkmFilter, ...settings.rkm };
      }
      if (settings.layer) {
        this.layerFilter = { ...this.layerFilter, ...settings.layer };
      }

      if (!this.inited) return;
      this.updateStarCloud();
      this.updateSelection(this.currentEssayId);
    }

    refresh(){
      if (!this.inited) return;
      this.resize();
    }

    animate(){
      if (!this.renderer || !this.scene || !this.camera) return;
      const loop = () => {
        this._animId = requestAnimationFrame(loop);

        // pieni automaattinen kierto
        if (!this._dragging) {
          this._rotationY += 0.0008;
        }
        this.starGroup.rotation.y = this._rotationY;
        this.starGroup.rotation.x = this._rotationX * 0.7;
        this.highlightGroup.rotation.y = this._rotationY;
        this.highlightGroup.rotation.x = this._rotationX * 0.7;

        this.renderer.render(this.scene, this.camera);
      };
      loop();
    }
  }

  // -----------------------------------------------------
  // Yksi instanssi + globaalit API-funktiot
  // -----------------------------------------------------
  let currentInstance = null;
  let pendingEssayId = null;
  let pendingSettings = null;

  window.Taivas3D_Init = function(container){
    debug("Taivas3D_Init");
    if (!container) {
      console.error("Taivas3D_Init: container puuttuu");
      return;
    }
    if (!currentInstance) {
      currentInstance = new Taivas3DInstance(container);
      currentInstance.init({ essayId: pendingEssayId }).catch(err => {
        console.error("Taivas3D init-virhe:", err);
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

  window.Taivas3D_SetEssay = function(essayId){
    pendingEssayId = essayId || null;
    if (currentInstance && currentInstance.inited) {
      currentInstance.setEssay(essayId);
    }
  };

  window.Taivas3D_SetSettings = function(settings){
    pendingSettings = settings || null;
    if (currentInstance && currentInstance.inited) {
      currentInstance.setSettings(settings);
    }
  };

  window.Taivas3D_Refresh = function(){
    if (currentInstance && currentInstance.inited) {
      currentInstance.refresh();
    }
  };

  console.log("taivaskartta3d.js ladattu – Taivas3D_* -API valmiina");
})();



