/* ============================================================
   app.js – VAKAA BOOTSTRAP (KORJATTU)
   Vastuu:
   - Moottoreiden käynnistysjärjestys
   - Datan kytkeminen TextEnginen ja EvaluationEnginen välillä
   - Käyttöliittymän alustus
============================================================ */

(function () {

  async function bootstrap() {
    console.log("App: Käynnistetään bootstrap...");

    /* ----------------------------------------------------------
       0. Perusnäkymä: narratiivi + TOC näkyviin
    ---------------------------------------------------------- */
    document.body.classList.add("view-narrative");
    document.body.classList.remove("hide-toc");

    /* ----------------------------------------------------------
       1. Varmista tekstikohde
    ---------------------------------------------------------- */
    const textArea = document.getElementById("textArea");
    if (!textArea) {
      document.body.insertAdjacentHTML(
        "afterbegin",
        `<div style="padding:12px;background:#300;color:#fff;z-index:9999;position:relative;">
          ❌ #textArea puuttuu DOMista - sovellusta ei voida ladata.
        </div>`
      );
      return;
    }

    /* ----------------------------------------------------------
       2. TextEngine (Pakollinen datalähde)
    ---------------------------------------------------------- */
    if (window.TextEngine && typeof TextEngine.init === "function") {
      try {
        // Odotetaan, että tekstit ladataan ennen muiden alustusta
        await TextEngine.init();
        console.log("App: TextEngine valmis.");
      } catch (e) {
        textArea.innerHTML = `<p style="color:#900">Virhe tekstien latauksessa: ${e.message}</p>`;
        return;
      }
    } else {
      textArea.innerHTML = `<p style="color:#900">Kriittinen virhe: TextEngine puuttuu.</p>`;
      return;
    }

    /* ----------------------------------------------------------
       3. Data-kytkentä: EvaluationEngine
    ---------------------------------------------------------- */
    const chapters = window.TextEngine.getAllChapters?.();
    if (window.EvaluationEngine && chapters?.length > 0) {
      // Syötetään ladattu data analyysimoottorille
      window.EvaluationEngine.load(chapters);
      console.log("App: Data kytketty EvaluationEngineen.");
    }

    /* ----------------------------------------------------------
       4. TOC (Sisällysluettelo)
    ---------------------------------------------------------- */
    if (window.TOC && typeof TOC.init === "function") {
      try {
        await TOC.init();
        // Varmistetaan näkyvyys narratiivissa
        document.body.classList.remove("hide-toc");
      } catch (e) {
        console.warn("TOC ei käynnistynyt:", e);
        document.body.insertAdjacentHTML(
          "afterbegin",
          `<div style="padding:8px;background:#552;color:#fff;position:relative;z-index:9998;">
            ⚠️ Sisällysluetteloa ei voitu ladata.
          </div>`
        );
      }
    }

    /* ----------------------------------------------------------
       5. Muut moottorit ja moduulit
    ---------------------------------------------------------- */
    if (window.FrameworkEngine?.init) FrameworkEngine.init();
    if (window.PresetEngine?.init) PresetEngine.init();
    
    // Moduulien (Starfield jne.) alustus
    if (window.ModuleRegistry?.initAll) {
      ModuleRegistry.initAll();
    } else if (window.ModuleRegistry?.init) {
      ModuleRegistry.init();
    }

    /* ----------------------------------------------------------
       6. UI-Bindings (Viimeisenä)
    ---------------------------------------------------------- */
    if (window.UI && typeof UI.init === "function") {
      UI.init();
      console.log("App: UI alustettu.");
    }

    console.info("App: Bootstrap suoritettu onnistuneesti.");
  }

  // Käynnistys kun DOM on valmis
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();