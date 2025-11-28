// tk_suggest.js – "Tämä saattaisi kiinnostaa sinua" -kerros

// 1) KONFIGURAATIO: mistä sanasta / ilmauksesta vihje syntyy
// id = tunniste (yleensä canonical), phrase = mitä etsitään tekstistä.
window.TK_SUGGESTIONS = {

  // ================================
  //        MI1–MI3 (R-K-M ytimet)
  // ================================

  "julkinen_talous": {
    phrase: "julkisen talouden",
    title: "Julkisen talouden rakenne",
    text: "MI1: miten julkisen talouden koneisto toimii – tulot, menot, rakenteet, instituutiot.",
    target: { type:"map", mode:"2d" }
  },

  "kestävyysvaje": {
    phrase: "kestävyysvaje",
    title: "Kestävyysvajeen logiikka",
    text: "MI2: laskennallinen mittari, joka ohjaa politiikan priorisointeja.",
    target: { type:"map", mode:"3d" }
  },

  "työmarkkinat": {
    phrase: "työmarkkina",
    title: "Työmarkkinarakenteet",
    text: "MI3: työn tarjonta, kysyntä, väestörakenne ja työvoiman rakenteellinen ristipaine.",
    target: { type:"map", mode:"2d" }
  },


  // ================================
  //   MI4–MI6 (Mistä / millä / mihin)
  // ================================

  "väestörakenne": {
    phrase: "väestörakenne",
    title: "Väestörakenteen vinouma",
    text: "MI4: syntyvyys, ikääntyminen, muuttoliike ja huoltosuhde.",
    target: { type:"image", src:"images/vaestorakenne.png" }
  },

  "hoivavelka": {
    phrase: "hoivavelka",
    title: "Hoivavelka",
    text: "MI5: kasautuva hoivan kysyntä, jota nykyiset rakenteet eivät kata.",
    target: { type:"map", mode:"3d" }
  },

  "syrjäytymisen_kierre": {
    phrase: "syrjäytymisen kierre",
    title: "Syrjäytymisen mekanismi",
    text: "MI6: pitkäaikaisia vaikutuksia palveluihin, työmarkkinoihin ja talouteen.",
    target: { type:"map", mode:"2d" }
  },


  // ================================
  //       MI7–MI9 (Missä / miltä / minne)
  // ================================

  "luottamus": {
    phrase: "luottamus",
    title: "Luottamuksen paradoksi",
    text: "MI7: Suomi on korkean luottamuksen maa, mutta instituutioluottamus murenee.",
    target: { type:"map", mode:"3d" }
  },

  "aluerakenne": {
    phrase: "aluerakenne",
    title: "Alueellinen eriytyminen",
    text: "MI8: kasvukeskukset vs. hiipuvat alueet, muuttoliikkeen kahtiajako.",
    target: { type:"image", src:"images/aluerakenne.png" }
  },

  "maahanmuutto": {
    phrase: "maahanmuutto",
    title: "Maahanmuutto ja työvoha",
    text: "MI9: demografinen paikkaaja, mutta poliittisesti jännitteinen teema.",
    target: { type:"map", mode:"2d" }
  },


  // ================================
  //         MI10–MI12 (paino / suunta / kohde)
  // ================================

  "talouspolitiikan_raamit": {
    phrase: "talouspolitiikan raamit",
    title: "Sääntöpohjainen talouspolitiikka",
    text: "MI10: kehysohjaus, menokatto ja niiden vaikutus tulevaisuustyöhön.",
    target: { type:"map", mode:"3d" }
  },

  "verorakenne": {
    phrase: "verorakenne",
    title: "Verotuksen rakenteellinen muutos",
    text: "MI11: työn verotus, kulutuksen verotus ja kestävyys.",
    target: { type:"map", mode:"2d" }
  },

  "investointitalous": {
    phrase: "investointitalous",
    title: "Investointitalouden periaate",
    text: "MI12: kulutusvelasta kohti tulevaisuusinvestointeja.",
    target: { type:"image", src:"images/investointitalous.png" }
  },


  // ============================================
  //       SUPERCLUSTERS / Analyysin isot rungot
  // ============================================

  "velkatalous": {
    phrase: "velka",
    title: "Velkatalouden anatomia",
    text: "Miten velka toimii rakenteissa ja miksi velka voi olla sekä hyödyllistä että vaarallista.",
    target: { type:"map", mode:"3d" }
  },

  "rakenteellinen_eriarvoisuus": {
    phrase: "rakenteellinen eriarvoisuus",
    title: "Rakenteellisen eriarvoisuuden koneisto",
    text: "Eriarvoisuus syntyy instituutioista, ei yksilöistä.",
    target: { type:"map", mode:"2d" }
  },

  "politiikan_mittarit": {
    phrase: "mittarit",
    title: "Mittareiden politiikka",
    text: "Se mitä mitataan, ohjaa sitä mitä tehdään.",
    target: { type:"image", src:"images/mittarit.png" }
  },

  "osallisuus": {
    phrase: "osallisuus",
    title: "Osallisuuden ekologia",
    text: "Osallisuus syntyy yhteisöistä, ei palveluista.",
    target: { type:"map", mode:"2d" }
  },

  "yhteisollisyys": {
    phrase: "yhteisöllisyys",
    title: "Yhteisöllinen kiinnittyminen",
    text: "Yhteisön vetovoima määrittää palveluihin ja työelämään kiinnittymistä.",
    target: { type:"map", mode:"2d" }
  },

  "kansalaisyhteiskunta": {
    phrase: "kansalaisyhteiskunta",
    title: "Kansalaisyhteiskunnan rooli",
    text: "Vapaaehtoistyö ja yhteisötoiminta ylläpitävät yhteiskunnan vakautta.",
    target: { type:"image", src:"images/kansalaisyhteiskunta.png" }
  },

  "palveluohjaus": {
    phrase: "palveluohjaus",
    title: "Osallistava palveluohjaus",
    text: "Yhteisölähtöinen malli ratkaisee juurisyitä, ei vain kompensoi.",
    target: { type:"map", mode:"2d" }
  },

  "kompensaatiotalous": {
    phrase: "kompensaatiotalous",
    title: "Kompensaatiotalous",
    text: "Julkinen raha paikkaa rakenteiden murtumia – mutta ei korjaa niitä.",
    target: { type:"image", src:"images/kompensaatiotalous.png" }
  },

  "kansalaisrahasto": {
    phrase: "kansalaisrahasto",
    title: "Kansalaisrahasto",
    text: "Uuden ajan yhteiskunnallinen investointimalli.",
    target: { type:"image", src:"images/kansalaisrahasto.png" }
  },

  "hoiva_suomi": {
    phrase: "hoivajärjestelmä",
    title: "Hoiva-Suomen rakenne",
    text: "Vanheneva väestö + hoivavelka + työvoimapula → rakenteellinen yhtälö.",
    target: { type:"map", mode:"3d" }
  },

  "valtarakenne": {
    phrase: "vallankäyttö",
    title: "Poliittisen vallan kolmitaso",
    text: "Näkyvä valta – rakenteellinen valta – näkymätön valta.",
    target: { type:"image", src:"images/valtarakenne.png" }
  },

  "tuhlaajapojan_syndrooma": {
    phrase: "onnellisuus velaksi",
    title: "Tuhlaajapojan syndrooma",
    text: "Onnellisuusvelka + rakenteellinen eriarvoisuus = pitkän aikavälin riski.",
    target: { type:"image", src:"images/tuhlaajapoika.png" }
  },

  "mittaritalous": {
    phrase: "mittaritalous",
    title: "Mittaritalous",
    text: "Kun mittarit ohjaavat todellisuutta – ei päinvastoin.",
    target: { type:"map", mode:"3d" }
  }

};


// 2) KLIKKAUSLOGIIKKA – avaa / sulkee pienen kuplan sanan viereen
(function(){
  const SUGGS = window.TK_SUGGESTIONS || {};
  let popoverEl = null;
  let currentId = null;

  function closePopover(){
    if (popoverEl && popoverEl.parentNode){
      popoverEl.parentNode.removeChild(popoverEl);
    }
    popoverEl = null;
    currentId = null;
  }

  function openPopoverForSpan(span){
    const id = span.dataset.suggestId;
    const cfg = SUGGS[id];
    if (!cfg) return;

    // jos sama span uudestaan → sulje
    if (currentId === id && popoverEl){
      closePopover();
      return;
    }

    closePopover();

    const rect = span.getBoundingClientRect();

    popoverEl = document.createElement("div");
    popoverEl.id = "tk-suggest-popover";

    const title = cfg.title || id.replace(/_/g," ");
    const text  = cfg.text  || "";
    const html  = cfg.html  || "";

    popoverEl.innerHTML = `
      <h4>${title}</h4>
      <div class="tk-suggest-body">${text}</div>
      ${html ? `<div class="tk-suggest-extra">${html}</div>` : ""}
      <div class="tk-suggest-actions">
        <button type="button" data-action="open-panel">Avaa lisänäkymä</button>
        <button type="button" data-action="close">Sulje</button>
      </div>
    `;

    document.body.appendChild(popoverEl);

    // Pientä sijoittelua: yläpuolelle jos tilaa, muuten alle
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popRect = popoverEl.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 8;

    if (x + popRect.width > vw - 16){
      x = vw - popRect.width - 16;
    }
    if (y + popRect.height > vh - 8){
      y = rect.top - popRect.height - 8;
    }
    if (y < 6) y = 6;

    popoverEl.style.left = `${x}px`;
    popoverEl.style.top  = `${y}px`;

    currentId = id;

    // Napit kuplassa
    popoverEl.addEventListener("click", (e)=>{
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "close"){
        closePopover();
      } else if (action === "open-panel"){
        // Tässä ohjataan varsinaiseen lisänäkymään
        if (cfg.target){
          const t = cfg.target;
          if (t.type === "map" && window.BookCore_OpenMapSheet){
            // avaa kartta-arkin ja vaihda 2d/3d näkymään
            BookCore_OpenMapSheet(t.mode || "2d");
          } else if (t.type === "image" && window.BookCore_InsertInfographicForSuggestion){
            // nosta infografiikka luvun alkuun
            const src = t.src || "";
            BookCore_InsertInfographicForSuggestion(id, src, span);
          }
        }
        closePopover();
      }
    });
  }

  // Delegoitu klikkaus kuuntelija koko dokumentille
  document.addEventListener("click", (e)=>{
    const span = e.target.closest(".tk-suggest-word");
    if (!span){
      // jos klikataan kuplan ulkopuolelle → sulje
      if (popoverEl && !e.target.closest("#tk-suggest-popover")){
        closePopover();
      }
      return;
    }
    openPopoverForSpan(span);
  });

  // Jos ikkuna skrollaa / resize, kupla kiinni (ettei jää väärään paikkaan)
  window.addEventListener("scroll", closePopover, { passive:true });
  window.addEventListener("resize", closePopover, { passive:true });
})();
