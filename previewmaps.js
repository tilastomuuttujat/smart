// previewmaps.js – staattiset minikartat luvun alkuun
// Käyttää vain entities_mi.json-tiedostoa (ei koske isoja karttoja).

(function(){

  let ENTITIES = null;
  let loadingPromise = null;

  function loadEntities(){
    if (ENTITIES) return Promise.resolve(ENTITIES);
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch("entities_mi.json")
      .then(r => {
        if (!r.ok) throw new Error("previewmaps: entities_mi.json HTTP " + r.status);
        return r.json();
      })
      .then(data => {
        ENTITIES = Array.isArray(data) ? data : [];
        return ENTITIES;
      })
      .catch(err => {
        console.error("previewmaps: datavirhe", err);
        ENTITIES = [];
        return ENTITIES;
      });

    return loadingPromise;
  }

  // ------------------ 2D sammalkartta (UMAP 2D) ------------------

  function getUmap2DPoints(){
    if (!ENTITIES) return [];
    return ENTITIES.map(e => {
      const src = e.umap_2d || e.umap || e.pca || e.tsne || [];
      const x = Number(src[0]);
      const y = Number(src[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        x,
        y,
        rkm:   (e.rkm || "").toUpperCase(),
        layer: e.layer || "shell"
      };
    }).filter(Boolean);
  }

  function drawSammalPreview(canvas){
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    const pts = getUmap2DPoints();
    if (!pts.length) return;

    const pad = 6;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    pts.forEach(p=>{
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const sx = x => pad + ((x - minX) / spanX) * (w - 2*pad);
    const sy = y => h - pad - ((y - minY) / spanY) * (h - 2*pad);

    // tausta
    ctx.fillStyle = "rgba(8,6,4,0.65)";
    ctx.fillRect(0,0,w,h);

    pts.forEach(p=>{
      let color = "#f0e0c8";
      if (p.rkm === "R")      color = "#f0c68a";
      else if (p.rkm === "K") color = "#9bd9a2";
      else if (p.rkm === "M") color = "#d2a7f0";

      const r = p.layer === "core"   ? 1.7 :
                p.layer === "mantle" ? 1.4 : 1.2;

      const x = sx(p.x);
      const y = sy(p.y);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    });
  }

  // ------------------ 3D taivaskartta projisoituna 2D:ksi ---------

  function get3DPoints(){
    if (!ENTITIES) return [];
    return ENTITIES.map(e => {
      const src = e.umap_3d || e.tsne || e.pca || [];
      let x = Number(src[0]);
      let y = Number(src[1]);
      let z = Number(src[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
      return {
        x,y,z,
        rkm:   (e.rkm || "").toUpperCase(),
        layer: e.layer || "shell"
      };
    }).filter(Boolean);
  }

  function drawTaivasPreview(canvas){
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    const pts = get3DPoints();
    if (!pts.length) return;

    const pad = 8;
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,minY=Infinity,maxY=-Infinity;
    pts.forEach(p=>{
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    const spanX = maxX - minX || 1;
    const spanZ = maxZ - minZ || 1;
    const spanY = maxY - minY || 1;

    const sx = x => pad + ((x - minX) / spanX) * (w - 2*pad);
    const sy = z => h - pad - ((z - minZ) / spanZ) * (h - 2*pad);

    // taustagradientti
    const grad = ctx.createRadialGradient(
      w*0.5, h*0.1, 0,
      w*0.5, h*0.0, h*0.9
    );
    grad.addColorStop(0, "#20212a");
    grad.addColorStop(1, "#050609");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    // pisteet (x,z), kirkkaus y:n mukaan
    pts.forEach(p=>{
      const x = sx(p.x);
      const y = sy(p.z);
      const relY = (p.y - minY) / spanY;   // 0..1
      const alpha = 0.35 + 0.55 * relY;

      let rgb = "255,228,178";
      if (p.rkm === "R")      rgb = "240,198,138";
      else if (p.rkm === "K") rgb = "155,217,162";
      else if (p.rkm === "M") rgb = "210,167,240";

      const r = p.layer === "core"   ? 1.9 :
                p.layer === "mantle" ? 1.6 : 1.3;

      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    });
  }

  // ------------------ Julkinen API: BookCore_AddPreviewImages -----

  function BookCore_AddPreviewImages(){
    loadEntities().then(()=>{

      // Sammalkartta-slotit
      document.querySelectorAll(".visual-sammalkartta").forEach(slot => {
        slot.innerHTML = "";
        const rect = slot.getBoundingClientRect();
        const w = Math.max(40, rect.width  || 160);
        const h = Math.max(40, rect.height || 110);

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = "100%";
        canvas.style.height = "100%";

        slot.appendChild(canvas);
        drawSammalPreview(canvas);
      });

      // Taivaskartta-slotit
      document.querySelectorAll(".visual-taivaskartta").forEach(slot => {
        slot.innerHTML = "";
        const rect = slot.getBoundingClientRect();
        const w = Math.max(40, rect.width  || 160);
        const h = Math.max(40, rect.height || 110);

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = "100%";
        canvas.style.height = "100%";

        slot.appendChild(canvas);
        drawTaivasPreview(canvas);
      });

    });
  }

  window.BookCore_AddPreviewImages = BookCore_AddPreviewImages;

})();
