// taivaskartta.js
// 3D MI-taivaskartta valojuovineen + ohjauspaneeli.
// Lukee entities_mi.json ja essays_mi.json samasta hakemistosta kuin book.html.
// Vaatii importmapissa "three" ja OrbitControls-moduulin URL:n.

import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js";

// ---------------------------------------------
// 1. Asetukset
// ---------------------------------------------
const ENTITIES_MI_URL = "entities_mi.json";
const ESSAYS_MI_URL   = "essays_mi.json";

// Koordinaattivalinta kuten sammalkartassa
let coordMode = "embedding"; // embedding | xyz | pca | umap | tsne

// ---------------------------------------------
// 2. Aputoiminnot
// ---------------------------------------------
function canonicalEssayId(id){
  const s = String(id || "").trim();
  const m = s.match(/^(\d{3})/);
  return m ? m[1] : s;
}
function normLabel(s){
  return (s || "").toLowerCase().trim();
}
function groupKeyFromSlot(slotIndex){
  if (slotIndex <= 2) return "g1";  // MI1–3
  if (slotIndex <= 5) return "g2";  // MI4–6
  if (slotIndex <= 8) return "g3";  // MI7–9
  return "g4";                      // MI10–12
}

const LAYER_RADIUS = {
  core:   40,
  mantle: 80,
  shell:  120
};

function rkmBaseDir(rkm){
  if (rkm === "R") return new THREE.Vector3( 1.0, 0.2, 0.0);
  if (rkm === "K") return new THREE.Vector3(-0.6, 0.4, 0.7);
  if (rkm === "M") return new THREE.Vector3(-0.5,-0.6,-0.7);
  return new THREE.Vector3(0.0, 0.0, 1.0);
}
function rkmColor3D(rkm){
  if (rkm === "R") return new THREE.Color(0x9fb8ff);
  if (rkm === "K") return new THREE.Color(0xff8a7a);
  if (rkm === "M") return new THREE.Color(0x7ee6b8);
  return new THREE.Color(0xc0c0b4);
}
function layerRingColor(layer){
  if (layer === "core")   return 0xffd166;
  if (layer === "mantle") return 0x06d6a0;
  return 0xf5f5e8;
}

// MI-numero sprite (pieni keltainen "pilleri")
function createNumberSprite3D(number){
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, 2*Math.PI);
  ctx.fillStyle = "rgba(8,5,3,0.96)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,227,176,0.95)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgb(255,236,197)";
  ctx.font = "bold 28px system-ui, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), 32, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(12, 12, 1);
  sprite.renderOrder = 100;
  sprite.userData.__numberSprite = true;
  sprite.userData.__miNumber = number;
  return sprite;
}

// Koordinaattien valinta (sama idea kuin sammalkartassa)
function getCoords3D(d){
  const safe = (v, fallback) => (Number.isFinite(v) ? v : fallback);
  const base = {
    x: Number.isFinite(d.x) ? d.x : 0,
    y: Number.isFinite(d.y) ? d.y : 0,
    z: Number.isFinite(d.z) ? d.z : 0
  };
  switch (coordMode){
    case "pca":
      return {
        x: safe(d.x_pca,  base.x),
        y: safe(d.y_pca,  base.y),
        z: safe(d.z_pca,  base.z)
      };
    case "umap":
      return {
        x: safe(d.x_umap, base.x),
        y: safe(d.y_umap, base.y),
        z: safe(d.z_umap, base.z)
      };
    case "tsne":
      return {
        x: safe(d.x_tsne, base.x),
        y: safe(d.y_tsne, base.y),
        z: safe(d.z_tsne, base.z)
      };
    case "xyz":
      return base;
    case "embedding":
    default:
      return base;
  }
}

// ---------------------------------------------
// 3. Data: ESSAYS + MI-entiteetit
// ---------------------------------------------
let DATA_LOADED = false;
let MI_ENTITIES = [];
let MI_BY_CANON = new Map();
let ESSAYS_BY_ID = {};
let ESSAYS_BY_CANON = {};
let currentEssayId = null;
let PENDING_ESSAY_ID = null;

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
      miSlots.push({ canonical: String(v).trim(), slotIndex });
    });

    const miVals = miSlots.map(s => s.canonical);
    out.push({
      id: fullId,
      essayId,
      canonId,
      title,
      summary,
      miSlots,
      miNormSet: new Set(miVals.map(normLabel))
    });
  });
  return out;
}

async function loadData(){
  if (DATA_LOADED) return;

  const resMi = await fetch(ENTITIES_MI_URL);
  if (!resMi.ok) throw new Error("entities_mi.json HTTP " + resMi.status);
  const rawEntities = await resMi.json();

  const toNum = v => {
    if (v === null || v === undefined || v === "") return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  MI_ENTITIES = rawEntities.map(e => {
    const emb  = e.embedding || {};
    const pca  = e.pca       || {};
    const umap = e.umap      || {};
    const tsne = e.tsne      || {};

    let rkm = (e.rkm || "").toString().trim().toUpperCase();
    if (rkm.length > 1) rkm = rkm[0];
    if (!["R","K","M"].includes(rkm)) rkm = "R";
    const layer = e.layer || "shell";
    const canonical = e.canonical || e.label || "";
    const key = normLabel(canonical || e.label || "");

    return {
      id:        String(e.id),
      label:     String(e.label || ""),
      canonical,
      key,
      rkm,
      layer,
      group:        e.group || "",
      cluster_id:   (e.cluster_id !== undefined && e.cluster_id !== null && e.cluster_id !== "") ? Number(e.cluster_id) : null,
      cluster_name: e.cluster_name || "",
      x: toNum(emb.x  ?? e.x),
      y: toNum(emb.y  ?? e.y),
      z: toNum(emb.z  ?? e.z),
      x_pca:  toNum(pca.x  ?? e.x_pca),
      y_pca:  toNum(pca.y  ?? e.y_pca),
      z_pca:  toNum(pca.z  ?? e.z_pca),
      x_umap: toNum(umap.x ?? e.x_umap),
      y_umap: toNum(umap.y ?? e.y_umap),
      z_umap: toNum(umap.z ?? e.z_umap),
      x_tsne: toNum(tsne.x ?? e.x_tsne),
      y_tsne: toNum(tsne.y ?? e.y_tsne),
      z_tsne: toNum(tsne.z ?? e.z_tsne),
      __isSelected: false,
      __miSlotIndex: null,
      __pos3d: null
    };
  });

  MI_BY_CANON = new Map();
  MI_ENTITIES.forEach(e => {
    if (e.key) MI_BY_CANON.set(e.key, e);
  });

  const resE = await fetch(ESSAYS_MI_URL);
  if (!resE.ok) throw new Error("essays_mi.json HTTP " + resE.status);
  const jsonE = await resE.json();
  const essays = parseEssaysMiJSON(jsonE);

  ESSAYS_BY_ID = {};
  ESSAYS_BY_CANON = {};
  essays.forEach(es => {
    ESSAYS_BY_ID[es.id] = es;
    if (es.essayId && es.essayId !== es.id) {
      ESSAYS_BY_ID[es.essayId] = es;
    }
    ESSAYS_BY_CANON[es.canonId] = es;
    if (es.essayId) {
      ESSAYS_BY_CANON[canonicalEssayId(es.essayId)] = es;
    }
  });

  assign3DPositions();
  DATA_LOADED = true;
}

// ---------------------------------------------
// 4. 3D-globaali näkymä & filtterit
// ---------------------------------------------
let containerEl = null;
let overlayInfoEl = null;
let statusBarEl = null;

let threeScene = null;
let threeCamera = null;
let threeRenderer = null;
let threeControls = null;
let threePoints = null;
let threeHaloPoints = null;
let threePositions = null;
let threeColors = null;
let threeHaloPositions = null;
let threeHaloColors = null;
let threeInited = false;
let taivasFlowGroups = [];

let onlyEssaySpecific = true;
let rkmFilter = { R:true, K:true, M:true };
let layerFilter = { core:true, mantle:true, shell:true };
let miGroupFilter = { g1:true, g2:true, g3:true, g4:true };

// ---------------------------------------------
// 5. 3D-paikat + taustaelementit
// ---------------------------------------------
function assign3DPositions(){
  if (!MI_ENTITIES.length) return;
  MI_ENTITIES.forEach(e => {
    const c0 = getCoords3D(e);
    const baseCoord = new THREE.Vector3(
      Number.isFinite(c0.x) ? c0.x : 0,
      Number.isFinite(c0.y) ? c0.y : 0,
      Number.isFinite(c0.z) ? c0.z : 0
    );
    let v = baseCoord.clone();
    if (v.lengthSq() === 0) {
      v.copy(rkmBaseDir(e.rkm));
    }
    v.normalize();
    const baseDir = rkmBaseDir(e.rkm).clone().normalize();
    const mix = 0.75;
    const dir = v.multiplyScalar(mix).add(baseDir.multiplyScalar(1-mix)).normalize();
    let radius = LAYER_RADIUS.shell;
    if (e.layer === "core") radius = LAYER_RADIUS.core;
    else if (e.layer === "mantle") radius = LAYER_RADIUS.mantle;
    e.__pos3d = dir.multiplyScalar(radius);
  });
}

function buildStarfield(scene){
  const N = 1000;
  const pos = new Float32Array(N*3);
  for (let i=0;i<N;i++){
    pos[i*3]   = (Math.random()-0.5)*1700;
    pos[i*3+1] = (Math.random()-0.5)*1700;
    pos[i*3+2] = (Math.random()-0.5)*1700;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos,3));
  const m = new THREE.PointsMaterial({
    size: 1.0,
    color: 0x9ea7c0,
    transparent:true,
    opacity:0.3,
    depthWrite:false
  });
  const stars = new THREE.Points(g,m);
  stars.renderOrder = 0;
  scene.add(stars);
}

function build3DLayerRings(){
  if (!threeScene) return;
  const toRemove = [];
  threeScene.traverse(obj=>{
    if (obj.userData && obj.userData.__layerRing) toRemove.push(obj);
  });
  toRemove.forEach(o => threeScene.remove(o));

  ["core","mantle","shell"].forEach(layer => {
    const r = LAYER_RADIUS[layer];
    const g = new THREE.SphereGeometry(r, 40, 30);
    const c = layerRingColor(layer);
    const m = new THREE.MeshBasicMaterial({
      color: c,
      transparent:true,
      opacity: layer==="core" ? 0.16 : (layer==="mantle" ? 0.10 : 0.05),
      wireframe:true,
      depthWrite:false
    });
    const s = new THREE.Mesh(g,m);
    s.userData.__layerRing = true;
    s.renderOrder = 1;
    threeScene.add(s);
  });
}

function build3DPointCloud(){
  const n = MI_ENTITIES.length;
  threePositions = new Float32Array(n*3);
  threeColors    = new Float32Array(n*3);
  threeHaloPositions = new Float32Array(n*3);
  threeHaloColors    = new Float32Array(n*3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(threePositions,3));
  geo.setAttribute("color", new THREE.BufferAttribute(threeColors,3));
  const mat = new THREE.PointsMaterial({
    size: 4,
    vertexColors:true,
    transparent:true,
    opacity:0.97
  });
  threePoints = new THREE.Points(geo, mat);
  threePoints.renderOrder = 3;
  threeScene.add(threePoints);

  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute("position", new THREE.BufferAttribute(threeHaloPositions,3));
  haloGeo.setAttribute("color", new THREE.BufferAttribute(threeHaloColors,3));
  const haloMat = new THREE.PointsMaterial({
    size:10,
    vertexColors:true,
    transparent:true,
    opacity:0.25,
    depthTest:false,
    depthWrite:false,
    blending:THREE.AdditiveBlending
  });
  threeHaloPoints = new THREE.Points(haloGeo, haloMat);
  threeHaloPoints.renderOrder = 8;
  threeScene.add(threeHaloPoints);
}

// ---------------------------------------------
// 6. Valojuovat
// ---------------------------------------------
function makeFlowPath(start, end, colorHex = 0xcc3333) {
  const samples = [];
  const dist = start.distanceTo(end);
  const steps = Math.max(8, Math.floor(dist / 4));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    samples.push(p);
  }
  if (samples.length < 2) return new THREE.Group();

  const pos = new Float32Array(samples.length * 3);
  const alongArr = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const k = i * 3;
    pos[k]     = p.x;
    pos[k + 1] = p.y;
    pos[k + 2] = p.z;
    alongArr[i] = i / (samples.length - 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("along", new THREE.BufferAttribute(alongArr, 1));

  const col = new THREE.Color(colorHex);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:    { value: 0 },
      uSpeed:   { value: 0.35 },
      uWidth:   { value: 0.48 },
      uOpacity: { value: 0.9 },
      uSize:    { value: 6.0 },
      uColor:   { value: new THREE.Vector3(col.r, col.g, col.b) }
    },
    vertexShader: `
      attribute float along;
      varying float vAlong;
      uniform float uSize;
      void main(){
        vAlong = along;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlong;
      uniform float uTime, uSpeed, uWidth, uOpacity;
      uniform vec3 uColor;

      void main(){
        float head = fract(uTime * uSpeed);
        float d = abs(vAlong - head);
        d = min(d, 1.0 - d);

        float core = smoothstep(uWidth, 0.0, d);
        float halo = smoothstep(0.25, 0.0, d) * 0.4;
        float alpha = clamp(core + halo, 0.0, 1.0) * uOpacity;

        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float r = dot(uv, uv);
        float mask = smoothstep(1.0, 0.2, r);

        gl_FragColor = vec4(uColor, alpha * mask);
      }
    `
  });

  const flowPts = new THREE.Points(geom, mat);
  flowPts.renderOrder = 15;

  const baseGeom = geom.clone();
  const baseMat = new THREE.PointsMaterial({
    size: 1.8,
    color: colorHex,
    transparent: true,
    opacity: 0.15,
    depthTest: false
  });
  const basePts = new THREE.Points(baseGeom, baseMat);
  basePts.renderOrder = 9;

  const group = new THREE.Group();
  group.add(basePts, flowPts);

  group.userData.animate = (dt) => {
    mat.uniforms.uTime.value += dt;
  };

  return group;
}

function buildFlowLinesForSelected(selectedEntities) {
  if (!threeScene) return;

  taivasFlowGroups.forEach(group => {
    threeScene.remove(group);
    group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material && child.material.dispose) child.material.dispose();
    });
  });
  taivasFlowGroups = [];

  if (!selectedEntities || selectedEntities.length < 2) return;

  const sorted = [...selectedEntities].sort((a, b) => {
    const ai = a.__miSlotIndex ?? 0;
    const bi = b.__miSlotIndex ?? 0;
    return ai - bi;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const eA = sorted[i];
    const eB = sorted[i + 1];
    if (!eA.__pos3d || !eB.__pos3d) continue;

    const start = eA.__pos3d.clone();
    const end   = eB.__pos3d.clone();

    const flowGroup = makeFlowPath(start, end, 0xcc3333);
    threeScene.add(flowGroup);
    taivasFlowGroups.push(flowGroup);
  }
}

// ---------------------------------------------
// 7. 3D-näkyvyys & päivitys
// ---------------------------------------------
function update3DVisible(){
  if (!threeInited || !threePoints) return;

  const hasSelection = MI_ENTITIES.some(e => e.__isSelected);
  const visibleEntities = MI_ENTITIES.filter(e => {
    if (!rkmFilter[e.rkm]) return false;
    const layer = e.layer || "shell";
    if (!layerFilter[layer]) return false;
    if (onlyEssaySpecific && hasSelection) {
      return !!e.__isSelected;
    }
    return true;
  });

  const n = visibleEntities.length;
  for (let i=0;i<n;i++){
    const e = visibleEntities[i];
    const p = e.__pos3d || new THREE.Vector3();
    threePositions[i*3]   = p.x;
    threePositions[i*3+1] = p.y;
    threePositions[i*3+2] = p.z;

    const c = rkmColor3D(e.rkm);
    threeColors[i*3]   = c.r;
    threeColors[i*3+1] = c.g;
    threeColors[i*3+2] = c.b;

    threeHaloPositions[i*3]   = p.x;
    threeHaloPositions[i*3+1] = p.y;
    threeHaloPositions[i*3+2] = p.z;
    threeHaloColors[i*3]   = c.r;
    threeHaloColors[i*3+1] = c.g;
    threeHaloColors[i*3+2] = c.b;
  }

  threePoints.geometry.setDrawRange(0, n);
  threePoints.geometry.attributes.position.needsUpdate = true;
  threePoints.geometry.attributes.color.needsUpdate = true;
  threePoints.geometry.computeBoundingSphere();

  threeHaloPoints.geometry.setDrawRange(0, n);
  threeHaloPoints.geometry.attributes.position.needsUpdate = true;
  threeHaloPoints.geometry.attributes.color.needsUpdate = true;

  if (statusBarEl){
    statusBarEl.textContent =
      `3D MI-avaruus (${coordMode.toUpperCase()}) · entiteetit: ${MI_ENTITIES.length} · näkyvissä: ${visibleEntities.length}`;
  }
}

function update3DForEssay(essayId){
  if (!threeInited || !MI_ENTITIES.length) return;

  currentEssayId = essayId;

  const toRemove = [];
  threeScene.traverse(obj=>{
    if (obj.userData && obj.userData.__numberSprite) toRemove.push(obj);
  });
  toRemove.forEach(o => threeScene.remove(o));

  MI_ENTITIES.forEach(e => {
    e.__isSelected = false;
    e.__miSlotIndex = null;
  });

  if (!essayId){
    if (overlayInfoEl) overlayInfoEl.textContent = "Ei valittua kirjoitusta.";
    update3DVisible();
    buildFlowLinesForSelected([]);
    return;
  }

  const es =
    ESSAYS_BY_ID[essayId] ||
    ESSAYS_BY_CANON[canonicalEssayId(essayId)];

  if (!es){
    if (overlayInfoEl) overlayInfoEl.textContent = `Kirjoitusta ${essayId} ei löytynyt.`;
    update3DVisible();
    buildFlowLinesForSelected([]);
    return;
  }

  if (overlayInfoEl){
    overlayInfoEl.textContent = `${es.id} – ${es.title || "(otsikko puuttuu)"}`;
  }

  const selectedEntities = [];
  if (es.miSlots && es.miSlots.length){
    es.miSlots.forEach(({canonical, slotIndex}) => {
      const groupKey = groupKeyFromSlot(slotIndex);
      if (!miGroupFilter[groupKey]) return;
      const key = normLabel(canonical);
      const ent = MI_BY_CANON.get(key);
      if (!ent) return;

      if (!rkmFilter[ent.rkm]) return;
      const layer = ent.layer || "shell";
      if (!layerFilter[layer]) return;

      ent.__isSelected = true;
      ent.__miSlotIndex = slotIndex;
      selectedEntities.push(ent);

      const miNumber = slotIndex + 1;
      const sprite = createNumberSprite3D(miNumber);
      if (ent.__pos3d){
        sprite.position.copy(ent.__pos3d);
        sprite.position.y += 8;
      }
      threeScene.add(sprite);
    });
  }

  update3DVisible();
  buildFlowLinesForSelected(selectedEntities);
}

// ---------------------------------------------
// 8. Paneeli (RKM, kerrokset, MI-ryhmät, koordinaatit)
// ---------------------------------------------
let panelEl = null;

function injectPanelCSS(){
  if (document.getElementById("taivaskartta-panel-style")) return;
  const style = document.createElement("style");
  style.id = "taivaskartta-panel-style";
  style.textContent = `
    .taivaskartta-overlay-info{
      position:absolute;
      right:12px;
      top:10px;
      font-size:11px;
      color:#f1e6cf;
      text-shadow:0 1px 2px rgba(0,0,0,.9);
      max-width:30ch;
      pointer-events:none;
    }
    .taivaskartta-status{
      position:absolute;
      left:12px;
      bottom:10px;
      font-size:11px;
      color:#d0c9bd;
      text-shadow:0 1px 2px rgba(0,0,0,.9);
      pointer-events:none;
    }
    .taivaskartta-panel{
      position:absolute;
      top:12px;
      left:12px;
      width:260px;
      max-width:60vw;
      background:rgba(10,8,6,0.95);
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.18);
      box-shadow:0 14px 30px rgba(0,0,0,0.8);
      color:#f3ecdd;
      font-size:11px;
      z-index:10;
      backdrop-filter:blur(6px);
    }
    .taivaskartta-panel-header{
      padding:6px 9px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.12);
      cursor:move;
      user-select:none;
    }
    .taivaskartta-panel-title{
      font-weight:600;
      text-transform:uppercase;
      letter-spacing:.3px;
      font-size:10px;
      color:#f7ecdb;
    }
    .taivaskartta-panel-close{
      border:none;
      background:transparent;
      color:#f0e2cf;
      font-size:15px;
      cursor:pointer;
      padding:0 4px;
    }
    .taivaskartta-panel-body{
      padding:7px 9px 8px;
      display:grid;
      grid-template-columns:1fr 1fr;
      column-gap:10px;
      row-gap:6px;
    }
    .taivaskartta-panel-section-title{
      font-weight:600;
      text-transform:uppercase;
      letter-spacing:.25px;
      font-size:10px;
      color:#e9ddc7;
      margin-bottom:4px;
    }
    .taivaskartta-panel-section label{
      display:block;
      margin-bottom:2px;
      cursor:pointer;
    }
    .taivaskartta-panel-section input[type="checkbox"],
    .taivaskartta-panel-section input[type="radio"]{
      margin-right:4px;
    }
    .taivaskartta-panel-toggle-btn{
      position:absolute;
      top:10px;
      left:10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.35);
      background:rgba(20,18,14,0.9);
      color:#f0e6d8;
      padding:3px 10px;
      font-size:10px;
      cursor:pointer;
      z-index:11;
    }
    .taivaskartta-panel-toggle-btn:hover{
      background:rgba(208,180,140,0.25);
    }
  `;
  document.head.appendChild(style);
}

function buildPanel(){
  injectPanelCSS();
  if (!containerEl) return;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "taivaskartta-panel-toggle-btn";
  toggleBtn.textContent = "MI-paneli 3D";
  containerEl.appendChild(toggleBtn);

  panelEl = document.createElement("div");
  panelEl.className = "taivaskartta-panel";
  panelEl.innerHTML = `
    <div class="taivaskartta-panel-header">
      <div class="taivaskartta-panel-title">Taivaskartta – MI 3D</div>
      <button class="taivaskartta-panel-close" aria-label="Sulje paneli">&times;</button>
    </div>
    <div class="taivaskartta-panel-body">
      <div class="taivaskartta-panel-section">
        <div class="taivaskartta-panel-section-title">Näkyvyys</div>
        <label><input type="checkbox" id="tk-only-essay" checked> Vain valitun kirjoituksen pisteet</label>
      </div>
      <div class="taivaskartta-panel-section">
        <div class="taivaskartta-panel-section-title">RKM</div>
        <label><input type="checkbox" class="tk-rkm" data-rkm="R" checked> R – Rakenne</label>
        <label><input type="checkbox" class="tk-rkm" data-rkm="K" checked> K – Käytäntö</label>
        <label><input type="checkbox" class="tk-rkm" data-rkm="M" checked> M – Merkitys</label>
      </div>
      <div class="taivaskartta-panel-section">
        <div class="taivaskartta-panel-section-title">Kerrokset</div>
        <label><input type="checkbox" class="tk-layer" data-layer="core" checked> Core</label>
        <label><input type="checkbox" class="tk-layer" data-layer="mantle" checked> Mantle</label>
        <label><input type="checkbox" class="tk-layer" data-layer="shell" checked> Shell</label>
      </div>
      <div class="taivaskartta-panel-section">
        <div class="taivaskartta-panel-section-title">MI-ryhmät</div>
        <label><input type="checkbox" class="tk-mi-group" data-group="g1" checked> MI1–3</label>
        <label><input type="checkbox" class="tk-mi-group" data-group="g2" checked> MI4–6</label>
        <label><input type="checkbox" class="tk-mi-group" data-group="g3" checked> MI7–9</label>
        <label><input type="checkbox" class="tk-mi-group" data-group="g4" checked> MI10–12</label>
      </div>
      <div class="taivaskartta-panel-section">
        <div class="taivaskartta-panel-section-title">Koordinaatit</div>
        <label><input type="radio" name="tk-coord" value="embedding" checked> Embedding</label>
        <label><input type="radio" name="tk-coord" value="xyz"> XYZ</label>
        <label><input type="radio" name="tk-coord" value="pca"> PCA</label>
        <label><input type="radio" name="tk-coord" value="umap"> UMAP</label>
        <label><input type="radio" name="tk-coord" value="tsne"> t-SNE</label>
      </div>
    </div>
  `;
  containerEl.appendChild(panelEl);

  // Paneli piilossa oletuksena
  panelEl.style.display = "none";

  toggleBtn.addEventListener("click", () => {
    panelEl.style.display = (panelEl.style.display === "none" ? "block" : "none");
  });

  const closeBtn = panelEl.querySelector(".taivaskartta-panel-close");
  closeBtn.addEventListener("click", () => {
    panelEl.style.display = "none";
  });

  const header = panelEl.querySelector(".taivaskartta-panel-header");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  header.addEventListener("mousedown", e => {
    isDragging = true;
    const rect = panelEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    panelEl.style.left = x + "px";
    panelEl.style.top  = y + "px";
    panelEl.style.right = "auto";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
  });

  const onlyCb = panelEl.querySelector("#tk-only-essay");
  onlyCb.addEventListener("change", () => {
    onlyEssaySpecific = !!onlyCb.checked;
    update3DVisible();
    update3DForEssay(currentEssayId);
  });

  panelEl.querySelectorAll(".tk-rkm").forEach(inp => {
    inp.addEventListener("change", () => {
      const rkm = inp.dataset.rkm;
      rkmFilter[rkm] = !!inp.checked;
      assign3DPositions();
      update3DVisible();
      update3DForEssay(currentEssayId);
    });
  });

  panelEl.querySelectorAll(".tk-layer").forEach(inp => {
    inp.addEventListener("change", () => {
      const layer = inp.dataset.layer;
      layerFilter[layer] = !!inp.checked;
      assign3DPositions();
      update3DVisible();
      update3DForEssay(currentEssayId);
    });
  });

  panelEl.querySelectorAll(".tk-mi-group").forEach(inp => {
    inp.addEventListener("change", () => {
      const g = inp.dataset.group;
      miGroupFilter[g] = !!inp.checked;
      update3DForEssay(currentEssayId);
    });
  });

  const coordRadios = panelEl.querySelectorAll('input[name="tk-coord"]');
  coordRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      coordMode = radio.value || "embedding";
      assign3DPositions();
      update3DVisible();
      update3DForEssay(currentEssayId);
    });
  });
}

// ---------------------------------------------
// 9. 3D-init & animaatio
// ---------------------------------------------
function init3DScene(){
  if (threeInited) return;
  threeInited = true;

  // Kontti täyttää oman mi-view -alueensa
  if (containerEl) {
    containerEl.style.position = "absolute";
    containerEl.style.left = "0";
    containerEl.style.top = "0";
    containerEl.style.right = "0";
    containerEl.style.bottom = "0";
    containerEl.style.width = "100%";
    containerEl.style.height = "100%";
  }

  // Käytetään containerin todellista kokoa
  const rect = containerEl.getBoundingClientRect();
  const width  = rect.width  || window.innerWidth  || 800;
  const height = rect.height || window.innerHeight || 600;

  threeScene = new THREE.Scene();
  threeScene.fog = new THREE.FogExp2(0x18191b, 0.0025);

  threeCamera = new THREE.PerspectiveCamera(55, width / height, 0.1, 4000);
  threeCamera.position.set(0, 120, 360);

  threeRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  threeRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  threeRenderer.setSize(width, height); // tämä määrää sekä canvasin resoluution että CSS-px

  // tyhjennetään taivaskartta-section ja täytetään se canvasilla
  containerEl.innerHTML = "";

  const canvas = threeRenderer.domElement;
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.right = "0";
  canvas.style.bottom = "0";
  // HUOM: EI aseteta canvas.style.width/height = "100%" -> ei venytystä

  containerEl.appendChild(canvas);

  // overlay-tekstit
  overlayInfoEl = document.createElement("div");
  overlayInfoEl.className = "taivaskartta-overlay-info";
  overlayInfoEl.textContent = "Ladataan MI-dataa…";
  containerEl.appendChild(overlayInfoEl);

  statusBarEl = document.createElement("div");
  statusBarEl.className = "taivaskartta-status";
  statusBarEl.textContent = "";
  containerEl.appendChild(statusBarEl);

  // MI-paneli (kelluva)
  buildPanel();

  threeControls = new OrbitControls(threeCamera, threeRenderer.domElement);
  threeControls.enableDamping = true;
  threeControls.dampingFactor = 0.05;
  threeControls.minDistance = 80;
  threeControls.maxDistance = 1200;

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  threeScene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(40, 60, 20);
  threeScene.add(dir);

  buildStarfield(threeScene);
  build3DPointCloud();
  build3DLayerRings();
  update3DVisible();

  // pitää pallon pyöreänä myös ikkunan / mi-sectionin koon muuttuessa
  window.addEventListener("resize", () => {
    if (!threeRenderer || !threeCamera || !containerEl) return;
    const r = containerEl.getBoundingClientRect();
    const w = r.width  || window.innerWidth  || 800;
    const h = r.height || window.innerHeight || 600;

    threeCamera.aspect = w / h;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w, h);
  });

  let lastTime = performance.now();

  function animate3D(){
    requestAnimationFrame(animate3D);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    taivasFlowGroups.forEach(group => {
      if (group.userData && typeof group.userData.animate === "function") {
        group.userData.animate(dt);
      }
    });

    if (threeControls) threeControls.update();
    if (threeRenderer && threeScene && threeCamera) {
      threeRenderer.render(threeScene, threeCamera);
    }
  }

  animate3D();
}

// ---------------------------------------------
// 10. Julkiset funktiot
// ---------------------------------------------
async function initTaivaskartta(containerOrId, opts = {}){
  const el = (typeof containerOrId === "string")
    ? document.getElementById(containerOrId)
    : containerOrId;
  if (!el){
    console.error("initTaivaskartta: containeria ei löytynyt:", containerOrId);
    return;
  }
  containerEl = el;

  // Varmistetaan että kontti täyttää mi-alueen
  containerEl.style.position = "absolute";
  containerEl.style.left = "0";
  containerEl.style.top = "0";
  containerEl.style.right = "0";
  containerEl.style.bottom = "0";
  containerEl.style.width = "100%";
  containerEl.style.height = "100%";

  try{
    await loadData();
  }catch(err){
    console.error("Taivaskartan data-virhe:", err);
    containerEl.textContent = "Taivaskartan dataa ei voitu ladata: " + (err.message || String(err));
    return;
  }

  init3DScene();

  if (opts.essayId){
    PENDING_ESSAY_ID = opts.essayId;
  }

  if (PENDING_ESSAY_ID){
    update3DForEssay(PENDING_ESSAY_ID);
    PENDING_ESSAY_ID = null;
  }else{
    update3DForEssay(null);
  }
}

function setTaivaskarttaEssay(essayId){
  if (!essayId) {
    update3DForEssay(null);
    return;
  }
  if (!DATA_LOADED || !threeInited){
    PENDING_ESSAY_ID = essayId;
  }else{
    update3DForEssay(essayId);
  }
}

// Paneli ulkoa ohjattavaksi (book.html:n nappi tms.)
function toggleTaivaskarttaPanel(){
  if (!panelEl) return;
  panelEl.style.display = (panelEl.style.display === "none" ? "block" : "none");
}

window.initTaivaskartta = initTaivaskartta;
window.setTaivaskarttaEssay = setTaivaskarttaEssay;
window.toggleTaivaskarttaPanel = toggleTaivaskarttaPanel;

// ---------------------------------------------
// 11. Silta kirjan setActiveEssayFromHost-kutsuun
// ---------------------------------------------
(function(){
  const prev = window.setActiveEssayFromHost;
  if (typeof prev === "function" && !prev.__taivaskarttaPatched){
    const bridged = function(essayId){
      try { prev(essayId); } catch(e){ console.error(e); }
      window.setTaivaskarttaEssay(essayId);
    };
    bridged.__taivaskarttaPatched = true;
    window.setActiveEssayFromHost = bridged;
  } else if (typeof prev !== "function") {
    const bridged = function(essayId){
      window.setTaivaskarttaEssay(essayId);
    };
    bridged.__taivaskarttaPatched = true;
    window.setActiveEssayFromHost = bridged;
  }
})();
