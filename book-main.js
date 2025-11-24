// book-main.js
import { initSammalkarttaModule } from './sammalkartta.js';
import { initBookContent } from './book-content.js';

const ESSAYS_MI_URL = 'essays_mi.json';
const CHAPTERS_URL  = 'chapters.json';

/**
 * Normalisoi kirjoitus-ID:n muotoon "001", "002", …
 */
function canonicalEssayId(id){
  const s = String(id || '').trim();
  const m = s.match(/^(\d{3})/);
  return m ? m[1] : s;
}

/**
 * Lataa essays_mi.json ja rakentaa yhtenäisen ESSAYS-listan.
 */
async function loadEssays(){
  const res = await fetch(ESSAYS_MI_URL);
  if(!res.ok) throw new Error("essays_mi.json HTTP " + res.status);

  const json = await res.json();

  // MI1–MI12 -kanoniset kentät
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

  json.forEach((row, idx)=>{
    if(!row) return;

    const essayIdRaw = row.essay_id || row.essayId || row.id || String(idx+1).padStart(3,"0");
    const textIdRaw  = row.text_id  || row.textId  || "";
    const essayId    = String(essayIdRaw || "").trim();
    const textId     = String(textIdRaw  || "").trim();

    // Yksi "master ID": textId > essayId > juokseva
    const fullId  = textId || essayId || String(idx+1).padStart(3,"0");
    const canonId = canonicalEssayId(fullId);

    const title   = row.title   || "";
    const summary = row.summary || "";

    // MI-slotit 1–12
    const miSlots = [];
    MI_CANON_FIELDS.forEach((fieldName, slotIndex)=>{
      const v = row[fieldName];
      if(!v) return;
      miSlots.push({
        canonical: String(v).trim(),
        slotIndex // 0 = MI1, 1 = MI2, …, 11 = MI12
      });
    });

    const miVals = miSlots.map(s => s.canonical);
    const miNormSet = new Set(miVals.map(v => String(v).toLowerCase().trim()));

    out.push({
      id:       fullId,
      essayId,  // alkuperäinen essay_id
      textId,   // mahdollinen text_id
      canonId,  // 3-numeroa
      title,
      summary,
      mi: miVals,
      miSlots,
      miNormSet
    });
  });

  return out;
}

/**
 * Lataa chapters.json ja mapittaa sen essay_id / canonId -avaimiin.
 */
async function loadChapters(){
  const res = await fetch(CHAPTERS_URL);
  if(!res.ok) throw new Error("chapters.json HTTP " + res.status);

  const data = await res.json();
  if(!Array.isArray(data)) throw new Error("chapters.json ei ole lista");

  return data.map((ch, idx)=>{
    const essayIdRaw = ch.essay_id || ch.essayId || ch.id || String(idx+1).padStart(3,"0");
    const essayId    = String(essayIdRaw || "").trim();

    return {
      essay_id: essayId,
      canonId:  canonicalEssayId(essayId),
      id:       ch.id || String(idx+1).padStart(3,"0"),
      part:     ch.part != null ? ch.part : 1,
      body_md:  ch.body_md || ch.body || "",
      title:    ch.title || ""
    };
  });
}

/**
 * Pää-Init: lataa datat, rakentaa hakemistot ja käynnistää moduulit.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const statusBarEl  = document.getElementById('statusBar');
  const textStatusEl = document.getElementById('textStatus');

  // Pieni varmistus, ettei tule null-virheitä jos elementtejä ei ole
  const safeSetText = (el, txt) => {
    if (el) el.textContent = txt;
  };

  try{
    safeSetText(statusBarEl,  "Ladataan essays_mi.json…");
    safeSetText(textStatusEl, "Ladataan kirjoitusdataa…");

    const essays   = await loadEssays();

    safeSetText(statusBarEl, "Ladataan chapters.json…");
    const chapters = await loadChapters();

    // ---------- Hakemistot: ESSAYS ----------
    const ESSAYS_BY_ID    = {};
    const ESSAYS_BY_CANON = {};

    essays.forEach(es=>{
      // Pääavain
      ESSAYS_BY_ID[es.id] = es;

      // Mahdolliset alias-ID:t samaan objektiin:
      if(es.essayId && es.essayId !== es.id){
        ESSAYS_BY_ID[es.essayId] = es;
      }
      if(es.textId && es.textId !== es.id){
        ESSAYS_BY_ID[es.textId] = es;
      }

      // Kanoniset 3-numeroiset ID:t
      ESSAYS_BY_CANON[es.canonId] = es;
      if(es.essayId){
        ESSAYS_BY_CANON[canonicalEssayId(es.essayId)] = es;
      }
      if(es.textId){
        ESSAYS_BY_CANON[canonicalEssayId(es.textId)] = es;
      }
    });

    // ---------- Hakemistot: CHAPTERS ----------
    const CHAPTERS_BY_ESSAY_ID    = {};
    const CHAPTERS_BY_ESSAY_CANON = {};

    chapters.forEach(ch=>{
      CHAPTERS_BY_ESSAY_ID[ch.essay_id] = ch;
      CHAPTERS_BY_ESSAY_CANON[ch.canonId] = ch;
    });

    // ---------- Yhteinen "GLOBAL"-objekti ----------
    const GLOBAL = {
      essays,
      chapters,
      ESSAYS_BY_ID,
      ESSAYS_BY_CANON,
      CHAPTERS_BY_ESSAY_ID,
      CHAPTERS_BY_ESSAY_CANON,
      canonicalEssayId
    };

    // Halutessasi voit laittaa tämän debugia varten näkyviin:
     window.BOOK_GLOBAL = GLOBAL;

    // ---------- Käynnistä kirjan sisältömoduuli ----------
    initBookContent(GLOBAL);

    // ---------- Käynnistä sammalkartta-moduuli ----------
    // (moduuli voi käyttää GLOBAL:ia, tai vaihtoehtoisesti hakea vain
    //  valitun kirjoituksen book-contentin kautta setSammalkarttaEssay-kutsun avulla)
    initSammalkarttaModule(GLOBAL);

    safeSetText(
      statusBarEl,
      `Kirjoituksia: ${essays.length} · Tekstejä chapters.jsonissa: ${chapters.length}`
    );
    safeSetText(textStatusEl, "Valitse kirjoitus vasemmalta.");

  }catch(err){
    console.error(err);
    safeSetText(statusBarEl,  "Lataus epäonnistui.");
    safeSetText(
      textStatusEl,
      "Virhe datan latauksessa: " + (err.message || String(err))
    );
  }
});
