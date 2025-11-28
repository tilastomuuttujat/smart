/* ============================================================
   MAP CONTROLLER – sammalkartta, maasto, 3D-taivas + paneli
   ============================================================ */

window.MapController = (function () {

  // DOM-viitteet
  let sheet, overlay, zone;
  let btn2d, btnMaasto, btn3d, btnPanel;
  let sammalLayer, maastoLayer, taivasLayer;
  let panelEl;
  let textScroll;

  // tila
  let currentMode = "2d";   // "2d" | "maasto" | "3d"
  let sheetOpen = false;

  let state = {
    essayId: null,
    coordMode: "umap",       // "umap" | "pca" | "tsne"
    rkm: { R: true, K: true, M: true },
    layer: { core: true, mantle: true, shell: true }
  };

  // alustukset karttoihin on tehty?
  let sammalInited = false;
  let maastoInited = false;
  let taivasInited = false;

  /* ----------------------------------------------
     MOUNT – kutsutaan book.html:stä
  ---------------------------------------------- */
  function mount(opts) {
    sheet   = opts.sheet;
    overlay = opts.overlay;
    zone    = opts.zone;

    btn2d     = opts.btn2d;
    btnMaasto = opts.btnMaasto;
    btn3d     = opts.btn3d;
    btnPanel  = opts.panelBtn;

    sammalLayer = opts.sammal;
    maastoLayer = opts.maasto;
    taivasLayer = opts.taivas;

    panelEl = opts.panelContainer;
    textScroll = opts.textScrollContainer;

    if (!sheet || !overlay || !zone) {
      console.error("MapController: sheet/overlay/zone puuttuu");
    }

    bindButtons();
    renderPanel();
    updateModeButtons();
    updateLayersVisibility();
  }

  /* ----------------------------------------------
     KÄYTTÖLIITTYMÄ – napit
  ---------------------------------------------- */
  function bindButtons() {
    if (btn2d) {
      btn2d.addEventListener("click", () => {
        switchTo("2d");
      });
    }
    if (btnMaasto) {
      btnMaasto.addEventListener("click", () => {
        switchTo("maasto");
      });
    }
    if (btn3d) {
      btn3d.addEventListener("click", () => {
        switchTo("3d");
      });
    }
    if (btnPanel) {
      btnPanel.addEventListener("click", () => {
        togglePanel();
      });
    }
  }

function togglePanel() {
  if (!panelEl) return;
  const visible = panelEl.style.display === "block";
  const nowOpen = !visible;

  panelEl.style.display = nowOpen ? "block" : "none";

  // kerro CSS:lle, että paneli on auki
  if (zone) {
    zone.classList.toggle("panel-open", nowOpen);
  }

  // pyydä karttoja reagoimaan uuteen kokoon
  if (window.Sammal2D_Refresh) {
    window.Sammal2D_Refresh();
  }
  if (window.Maasto_Refresh) {
    window.Maasto_Refresh();
  }
  if (window.Taivas3D_Refresh) {
    window.Taivas3D_Refresh();
  }
}


  function updateModeButtons() {
    if (btn2d) {
      btn2d.classList.toggle("active", currentMode === "2d");
    }
    if (btnMaasto) {
      btnMaasto.classList.toggle("active", currentMode === "maasto");
    }
    if (btn3d) {
      btn3d.classList.toggle("active", currentMode === "3d");
    }
  }

  function updateLayersVisibility() {
    if (sammalLayer) {
      sammalLayer.style.display = (currentMode === "2d") ? "block" : "none";
    }
    if (maastoLayer) {
      maastoLayer.style.display = (currentMode === "maasto") ? "block" : "none";
    }
    if (taivasLayer) {
      taivasLayer.style.display = (currentMode === "3d") ? "block" : "none";
    }
  }

  /* ----------------------------------------------
     JULKINEN: vaihtaa karttamuotoa
  ---------------------------------------------- */
  function switchTo(mode) {
    if (!mode) return;
    if (!["2d","maasto","3d"].includes(mode)) return;

    currentMode = mode;
    updateModeButtons();
    initCurrentIfNeeded();
    updateLayersVisibility();

    // varmista että asetukset päivittyvät myös uuden kartan puolelle
    pushSettingsToMaps();
    pushEssayToMaps();
  }

  /* ----------------------------------------------
     JULKINEN: sulje arkki (kutsutaan book.html:stä)
  ---------------------------------------------- */
  function close() {
    if (!sheet || !overlay) return;
    sheet.classList.remove("open");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 250);
    sheetOpen = false;
  }

  /* ----------------------------------------------
     JULKINEN: kun kirja vaihtaa esseetä
     (BookModule.onChapterChange → MapController.setEssay)
  ---------------------------------------------- */
  function setEssay(essayId) {
    state.essayId = essayId || null;
    renderPanel();          // päivitys paneliin
    pushEssayToMaps();      // sammalkartta, maasto, taivas
  }

  /* ----------------------------------------------
     ASETUKSET – coordMode, R/K/M, layer
     panelista → state → karttoihin
  ---------------------------------------------- */
  function setCoordMode(mode) {
    if (!["umap","pca","tsne"].includes(mode)) return;
    state.coordMode = mode;
    renderPanel();
    pushSettingsToMaps();
  }

  function toggleRKM(code) {
    if (!state.rkm.hasOwnProperty(code)) return;
    state.rkm[code] = !state.rkm[code];
    renderPanel();
    pushSettingsToMaps();
  }

  function toggleLayer(layerName) {
    if (!state.layer.hasOwnProperty(layerName)) return;
    state.layer[layerName] = !state.layer[layerName];
    renderPanel();
    pushSettingsToMaps();
  }

  function getSettingsForMaps() {
    return {
      coordMode: state.coordMode,
      rkm: { ...state.rkm },
      layer: { ...state.layer }
    };
  }

  function pushSettingsToMaps() {
    const settings = getSettingsForMaps();

    if (window.Sammal2D_SetSettings) {
      window.Sammal2D_SetSettings(settings);
    }
    if (window.Maasto_SetSettings) {
      window.Maasto_SetSettings(settings);
    }
    if (window.Taivas3D_SetSettings) {
      window.Taivas3D_SetSettings(settings);
    } else if (window.Taivas_SetSettings) {
      window.Taivas_SetSettings(settings);
    }
  }

  function pushEssayToMaps() {
    const id = state.essayId;
    if (!id) return;

    if (window.Sammal2D_SetEssay) {
      window.Sammal2D_SetEssay(id);
    }
    if (window.Maasto_SetEssay) {
      window.Maasto_SetEssay(id);
    }
    if (window.Taivas3D_SetEssay) {
      window.Taivas3D_SetEssay(id);
    } else if (window.Taivas_SetEssay) {
      window.Taivas_SetEssay(id);
    }
  }

  /* ----------------------------------------------
     Karttojen init – laukaistaan vasta kun tarvitaan
  ---------------------------------------------- */
  function initCurrentIfNeeded() {
    if (currentMode === "2d") {
      if (!sammalInited && window.Sammal2D_Init && sammalLayer) {
        sammalInited = true;
        window.Sammal2D_Init(sammalLayer);
      }
    } else if (currentMode === "maasto") {
      if (!maastoInited && window.Maasto_Init && maastoLayer) {
        maastoInited = true;
        window.Maasto_Init(maastoLayer);
      }
    } else if (currentMode === "3d") {
      if (!taivasInited && (window.Taivas3D_Init || window.Taivas_Init) && taivasLayer) {
        taivasInited = true;
        if (window.Taivas3D_Init) window.Taivas3D_Init(taivasLayer);
        else if (window.Taivas_Init) window.Taivas_Init(taivasLayer);
      }
    }
  }

  /* ----------------------------------------------
     Panelin renderöinti
  ---------------------------------------------- */
  function renderPanel() {
    if (!panelEl) return;

    const eId = state.essayId ? state.essayId : "–";

    const coordOptions = [
      { id: "umap", label: "UMAP" },
      { id: "pca",  label: "PCA"  },
      { id: "tsne", label: "t-SNE"}
    ];

    panelEl.innerHTML = `
      <h3>Kartta-asetukset</h3>

      <div class="panel-section">
        <strong>Nykyinen essee</strong>
        <div style="font-size:12px;margin-top:2px;">ID: ${eId}</div>
        <div style="font-size:11px;color:#777;">Kartat seuraavat kirjan scrollausta.</div>
      </div>

      <div class="panel-section">
        <strong>Koordinaatit</strong>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
          ${coordOptions.map(c => `
            <button
              type="button"
              data-role="coord"
              data-id="${c.id}"
              style="
                flex:1;
                min-width:60px;
                padding:4px 6px;
                border-radius:999px;
                border:1px solid ${state.coordMode === c.id ? '#d0b48c' : '#ccc'};
                background:${state.coordMode === c.id ? '#f6ece0' : '#fff'};
                font-size:11px;
              ">
              ${c.label}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="panel-section">
        <strong>R / K / M</strong>
        <div style="display:flex;gap:6px;margin-top:4px;">
          ${["R","K","M"].map(code => `
            <button
              type="button"
              data-role="rkm"
              data-id="${code}"
              style="
                flex:1;
                padding:4px 0;
                border-radius:999px;
                border:1px solid ${state.rkm[code] ? '#d0b48c' : '#ccc'};
                background:${state.rkm[code] ? '#f6ece0' : '#fff'};
                font-size:11px;
              ">
              ${code}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="panel-section">
        <strong>Kerros</strong>
        <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
          ${["core","mantle","shell"].map(layer => `
            <button
              type="button"
              data-role="layer"
              data-id="${layer}"
              style="
                flex:1;
                min-width:70px;
                padding:4px 6px;
                border-radius:999px;
                border:1px solid ${state.layer[layer] ? '#d0b48c' : '#ccc'};
                background:${state.layer[layer] ? '#f6ece0' : '#fff'};
                font-size:11px;
                text-transform:capitalize;
              ">
              ${layer}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="panel-section" style="font-size:11px;color:#666;margin-top:6px;">
        <strong>Parametrit nyt</strong>
        <ul class="panel-list">
          <li>Mode: ${currentMode}</li>
          <li>coordMode: ${state.coordMode}</li>
          <li>RKM: R=${state.rkm.R ? "on" : "off"}, K=${state.rkm.K ? "on" : "off"}, M=${state.rkm.M ? "on" : "off"}</li>
          <li>Layer: core=${state.layer.core ? "on" : "off"},
              mantle=${state.layer.mantle ? "on" : "off"},
              shell=${state.layer.shell ? "on" : "off"}</li>
        </ul>
      </div>
    `;

    // tapahtumakytkennät panelin sisällä
    panelEl.querySelectorAll("button[data-role='coord']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        setCoordMode(id);
      });
    });

    panelEl.querySelectorAll("button[data-role='rkm']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleRKM(id);
      });
    });

    panelEl.querySelectorAll("button[data-role='layer']").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleLayer(id);
      });
    });
  }

  /* ----------------------------------------------
     JULKINEN API
  ---------------------------------------------- */
  return {
    mount,
    setEssay,
    switchTo,
    close
  };

})();
