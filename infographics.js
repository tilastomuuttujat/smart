// infographics.js – luvun infografiikka-slotin hallinta

(function(){
  // Tästä saat myöhemmin myös keskitetyn "mihin ID → mikä kuva" -logiikan,
  // jos et halua kirjoittaa src-arvoja TK_SUGGESTIONS:iin.
  const DEFAULT_BASE = "images/";

  /**
   * Avaa / päivittää luvun infografiikka-slotin annetulle suggestion-id:lle.
   *
   * @param {string} suggestId   esim. "hyvinvointivaltion_portaat"
   * @param {string} src         kuvan polku; jos tyhjä → käytä DEFAULT_BASE + suggestId + ".png"
   * @param {HTMLElement} sourceSpan   se .tk-suggest-word -span, jota klikattiin
   */
  function insertInfographic(suggestId, src, sourceSpan){
    // Jos src ei ole annettu → oletuspolku
    const imgSrc = src && src.trim()
      ? src.trim()
      : (DEFAULT_BASE + suggestId + ".png");

    // Etsi lähin chapter-block (sen sisällä on chapter-visuals)
    const chapter = sourceSpan.closest(".chapter-block");
    if (!chapter) return;

    const slot = chapter.querySelector(".visual-infografiikka");
    if (!slot) return;

    // Tyhjennä vanha sisältö ja lisää uusi kuva
    slot.innerHTML = "";

    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = suggestId.replace(/_/g," ");
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.loading = "lazy";

    slot.appendChild(img);

    // Pieni korostus että "tämä aktivoitui nyt"
    slot.style.outline = "2px solid rgba(208,180,140,0.8)";
    slot.style.outlineOffset = "2px";
    setTimeout(()=>{
      slot.style.outline = "none";
    }, 1600);

    // Vieritä slot näkyviin, mutta mahdollisimman pehmeästi
    slot.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  // Viedään ulos BookCore-nimiavaruuteen:
  window.BookCore_InsertInfographicForSuggestion = insertInfographic;
})();
