/* ============================================================
   text-engine.js – HARMONISOITU HERMOVERKKO-VERSIO
   ============================================================ */
import { NarrativeModules } from './narrative-modules.js';
import { AnalysisModules } from './analysis-modules.js';
import { ReflectionModules } from './reflection-modules.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



(function () {
    let chapters = [];
    let filteredIds = [];
    let activeIndex = 0;
    let currentView = "narrative";
    
    let lastActivePara = null;
let lastInsightKey = null;

    let searchQuery = "";
    const containerId = "textArea";
    let container = null;


const keywords = {
        'kustannus': { economy: 80 },
        'tehokkuus': { economy: 90 },
        'sielu': { ethics: 80 },
        'ihminen': { ethics: 70 }
    };


/* text-engine.js – KOGNITIIVINEN LAAJENNUS */

let dwellTimer = null;
let currentDwellTime = 0;

function setupCognitiveTracking() {
    container.addEventListener("scroll", () => {
        // Resetoidaan viipymisajastin skrollatessa
        clearTimeout(dwellTimer);
        
        dwellTimer = setTimeout(() => {
            const activePara = getCurrentActiveParagraph();
            if (activePara) {
                const keywordsFound = findKeywords(activePara.textContent);
                
                // Päivitetään AppStateen "Dwell-aika" (syventyminen)
                keywordsFound.forEach(key => {
                    window.AppState.updateReflection({
                        lastInsight: key,
                        // Nostetaan intensityScorea viipymisen perusteella
                        intensityBoost: 5 
                    });
                });
                
                // Laukaistaan hienovarainen visuaalinen vahvistus (Starfield hohtaa)
                document.dispatchEvent(new CustomEvent("starfieldPulse", { 
                    detail: { color: keywordsFound.length > 0 ? 'gold' : 'white' } 
                }));
            }
        }, 3000); // 3 sekuntia pysähdyksissä = kiinnostus herännyt
    });
}


async function init() {
    container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "<div class='loading-state'><p>Ladataan sisältöä...</p></div>";

    try {
        await loadChaptersFromFirebase();
        if (!chapters.length) {
            container.innerHTML = "<p>Tietokanta on tyhjä.</p>";
            dispatchReady();
            return;
        }

        render();
        setupNarrativeScroll();
        setupButtons();
        setupCommentGestures();
        scrollToActive();
        
        if (chapters[activeIndex]) {
            NarrativeModules.updateSidePanel(chapters[activeIndex]);
        }

        /* =====================================================
           🔑 UUSI: Reflektiotilan reaktiivinen kuuntelu
           – EI riko TOC:ia
           – EI laukaise uutta renderöintiä
           – Päivittää vain oikean paneelin
        ===================================================== */
        window.EventBus?.on("reflection:updated", ({ reflection }) => {
            if (currentView !== "reflection") return;
            const ch = chapters[activeIndex];
            if (!ch) return;

            ReflectionModules.updatePanel(ch, window.AppState);
        });

        dispatchReady(); 

    } catch (err) {
        console.error("TextEngine Error:", err);
        container.innerHTML =
            `<div class='error-state'><p>Lataus epäonnistui.</p></div>`;
    }
}

    async function loadChaptersFromFirebase() {
        if (!window.db) throw new Error("Firestore-yhteyttä ei löydy.");
        const esseetRef = collection(window.db, "esseet");
        const q = query(esseetRef, orderBy("id"));
        const querySnapshot = await getDocs(q);
        const rawData = [];
        querySnapshot.forEach((doc) => rawData.push(doc.data()));
        chapters = rawData.map(normalizeChapter).filter(Boolean);
        filteredIds = chapters.map(c => c.id);
    }

    function normalizeChapter(c) {
        if (!c || c.id == null) return null;
        return {
            ...c,
            id: String(c.id).padStart(3, "0"),
            title: c?.meta?.title || `Luku ${c.id}`,
            config: c.config || { enabled_modules: [] },
            versions: {
                narrative: c?.views?.narrative?.body_md ? { body_md: c.views.narrative.body_md } : null,
                analysis: c?.views?.analysis?.body_md ? { body_md: c.views.analysis.body_md } : null,
                reflection: c?.views?.reflection?.body_md ? { body_md: c.views.reflection.body_md } : null
            }
        };
    }

// text-engine.js – Korjattu render-logiikka
// text-engine-16.js – Korjattu render-logiikka
function render() {
    if (!container) return;
    
    if (currentView === "narrative") {
        const existingChapters = container.querySelectorAll('.chapter');
        
        // Jos lukuja ei ole vielä luotu, luodaan ne
        if (existingChapters.length === 0) {
            container.innerHTML = "";
            chapters.forEach((ch) => {
                if (filteredIds.includes(ch.id)) {
                    container.appendChild(NarrativeModules.renderChapter(ch, currentView, searchQuery, highlightText));
                }
            });
        } else {
            // JOS luvut ovat jo olemassa, päivitetään vain niiden tekstisisältö (korostukset)
            // Tämä estää välkyntää ja skrollausvirheitä
            updateHighlightsInExistingChapters();
        }
        
        container.querySelectorAll('.chapter').forEach(el => el.style.display = "block");
    } else {
        // Analyysi- tai Reflektio-näkymässä näytetään VAIN aktiivinen luku
        const activeCh = chapters[activeIndex];
        container.querySelectorAll('.chapter').forEach(el => {
            el.style.display = (el.dataset.chapterId === activeCh?.id) ? "block" : "none";
        });
    }
}

// Uusi apufunktio korostusten päivittämiseen olemassa olevaan tekstiin
function updateHighlightsInExistingChapters() {
    const chapterEls = container.querySelectorAll('.chapter');
    chapterEls.forEach(chapterEl => {
        const chId = chapterEl.dataset.chapterId;
        const chapterData = chapters.find(c => c.id === chId);
        if (!chapterData) return;

        // Päivitetään otsikko
        const h1 = chapterEl.querySelector('h1');
        if (h1) h1.innerHTML = highlightText(chapterData.title, searchQuery);

        // Päivitetään kappaleet
        const paragraphs = chapterEl.querySelectorAll('p');
        const bodyMd = chapterData.versions?.[currentView]?.body_md;
        if (bodyMd) {
            const rawParas = bodyMd.split(/\r?\n\n/).filter(Boolean);
            paragraphs.forEach((p, idx) => {
                if (rawParas[idx]) {
                    p.innerHTML = highlightText(rawParas[idx].trim(), searchQuery);
                }
            });
        }
    });
}
function highlightText(text, query) {
    if (!query || query.length < 2) return text; 
    
    // Suojataan regex-erikoismerkit
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    // Suoritetaan korvaus
    return text.replace(regex, '<mark class="highlight">$1</mark>');
}

    function clearSelection() {
        if (selectedParagraph) selectedParagraph.classList.remove("p-selected-quote");
        if (currentBox) currentBox.remove();
        currentBox = null;
        selectedParagraph = null;
    }

    function createCommentBox(p) {
        const box = document.createElement("div");
        box.className = "inline-comment-box";
        const quoteText = p.textContent.trim();
        const currentChapter = chapters[activeIndex];

        box.innerHTML = `
            <div class="ic-area-wrapper">
                <textarea id="ic-text" placeholder="Kommentoi tätä kappaletta…"></textarea>
            </div>
            <input id="ic-email" type="email" placeholder="Sähköpostisi (valinnainen)">
            <div class="inline-comment-actions">
                <button class="fb-share-btn">Jaa FB</button>
                <button class="cancel">Peruuta</button>
                <button class="send">Lähetä</button>
            </div>`;

        box.querySelector(".fb-share-btn").onclick = () => {
            const shareUrl = window.location.href;
            const textToShare = `Lainaus luvusta ${currentChapter?.title || 'Tähtikirja'}: "${quoteText}"`;
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(textToShare)}`;
            window.open(fbUrl, 'fb-share-dialog', 'width=626,height=436');
        };

        box.querySelector(".cancel").onclick = clearSelection;
        box.querySelector(".send").onclick = async () => {
            const msg = box.querySelector("#ic-text").value.trim();
            const email = box.querySelector("#ic-email").value.trim();
            if (!msg) return;
            const success = await sendFeedbackToGoogle(quoteText, msg, email);
            if (success) {
                const thanks = document.createElement("div");
                thanks.className = "ic-inline-thanks show";
                thanks.textContent = "✓ Kiitos palautteesta!";
                p.insertAdjacentElement("afterend", thanks);
                setTimeout(() => thanks.remove(), 3000);
                clearSelection();
            }
        };
        return box;
    }

    async function sendFeedbackToGoogle(quote, message, email) {
        const url = "https://script.google.com/macros/s/AKfycbxR-F3qMEHGnRNuFjaPNMtA_iL4VleMOxqTFFymqDce_XMxdGY1nAB5GiF42oXEQhgI/exec";
        try {
            await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote, message, email, url: window.location.href })
            });
            return true;
        } catch (e) { return false; }
    }

    function setupCommentGestures() {
        let startX = 0, startY = 0, tracking = false;
        container.addEventListener("pointerdown", e => {
            const p = e.target.closest("p");
            if (!p) return;
            tracking = true;
            startX = e.clientX; startY = e.clientY;
        }, { passive: true });

        container.addEventListener("pointerup", e => {
            if (!tracking) return;
            tracking = false;
            const p = e.target.closest("p");
            if (!p) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dy) > 35) return; 
            if (dx > 60) {
                clearSelection();
                selectedParagraph = p;
                p.classList.add("p-selected-quote");
                currentBox = createCommentBox(p);
                p.insertAdjacentElement("afterend", currentBox);
            } else if (dx < -60) {
                clearSelection();
            }
        }, { passive: true });
    }

    function dispatchReady() {
        document.dispatchEvent(new CustomEvent("textEngineReady", { detail: { count: chapters.length } }));
    }

/*
function dispatchChapterChange() {
    const ch = chapters[activeIndex];
    if (!ch) return;


    const history = window.AppState?.data?.reflection?.history;
    if (history?.chapterFocus) {
        history.chapterFocus.push(ch.id);
    }


    NarrativeModules.updateSidePanel(ch);


    if (currentView === "analysis" && window.AnalysisModules?.updatePanel) {
        window.AnalysisModules.updatePanel(ch);
    }


    if (currentView === "reflection" && window.ReflectionModules?.updatePanel) {
        ReflectionModules.updatePanel(ch, window.AppState);
    }

    document.dispatchEvent(
        new CustomEvent("chapterChange", {
            detail: {
                chapterId: ch.id,
                view: currentView,
                config: ch.config
            }
        })
    );
}
*/

function dispatchChapterChange() {
    const ch = chapters[activeIndex];
    if (!ch) return;

    /* ============================================================
       🔑 LUKIJAN POLKU – KIRJATAAN LUVUN KÄYNTI
       (turvallinen optional chaining, ei kaada jos AppState puuttuu)
    ============================================================ */
    const reflectionHistory = window.AppState?.data?.reflection?.history;
    if (reflectionHistory?.chapterFocus) {
        reflectionHistory.chapterFocus.push(ch.id);
        // Voit halutessasi laskea myös intensityScorea täällä myöhemmin
    }

    /* ============================================================
       SIVUPANEELIEN PÄIVITYS NYKYISEN NÄKYMÄN MUKAAN
    ============================================================ */

    // Narratiivi-näkymä: aina Mosaic, WordCloud ja mahdollinen lainaus
    if (currentView === "narrative") {
        NarrativeModules.updateSidePanel(ch);
    }

    // Analyysi-näkymä: kehykset, starfield jne.
    else if (currentView === "analysis" && typeof window.AnalysisModules?.updatePanel === "function") {
        window.AnalysisModules.updatePanel(ch);
    }

    // Reflektio-näkymä: arvomittari, älykäs kysymys, haaste
    else if (currentView === "reflection" && typeof window.ReflectionModules?.updatePanel === "function") {
        ReflectionModules.updatePanel(ch, window.AppState);
    }

    /* ============================================================
       TAPAHTUMAT MUULLE JÄRJESTELMÄLLE (YHTENÄINEN EVENTBUS)
       – Käytetään app.js:n määrittelemiä virallisia eventtejä
    ============================================================ */
    


    // 1. Virallinen luvunvaihto (käytössä mm. TOC:ssa)
    window.EventBus?.emit("chapter:change", { chapterId: ch.id });

    // 2. Tarkempi päivitys koko sovellukselle (UI, paneelit jne.)
    window.EventBus?.emit("app:chapterUpdated", {
        chapterId: ch.id,
        view: currentView
    });

    // 3. Vanha DOM-eventti säilytetään taaksepäin yhteensopivuuden takia
    //    (esim. toc-engine.js kuuntelee edelleen "chapterChange")
    document.dispatchEvent(
        new CustomEvent("chapterChange", {
            detail: {
                chapterId: ch.id,
                view: currentView,
                config: ch.config || {}
            }
        })
    );
}


function setupNarrativeScroll() {
  container.addEventListener("scroll", () => {
    if (currentView !== "narrative") return;
    
    const focusY = container.getBoundingClientRect().top + 150;
    const elementsAtPoint = document.elementsFromPoint(window.innerWidth / 2, focusY);
    const activePara = elementsAtPoint.find(el => el.tagName === 'P');

    if (!activePara) return;

    // 🔑 ESTÄ TURHA TOISTO
    if (activePara === lastActivePara) return;
    lastActivePara = activePara;

    const text = activePara.textContent.toLowerCase();

    Object.keys(keywords).forEach(key => {
      if (!text.includes(key)) return;
      if (key === lastInsightKey) return; // 🔑 sama teema, ei uudelleen

      lastInsightKey = key;

      const update = { lastInsight: key };

      if (
        typeof keywords[key].economy === "number" ||
        typeof keywords[key].ethics === "number"
      ) {
        update.readerValues = {};
        if (keywords[key].economy != null) {
          update.readerValues.economy = keywords[key].economy;
        }
        if (keywords[key].ethics != null) {
          update.readerValues.ethics = keywords[key].ethics;
        }
      }

      window.AppState?.updateReflection?.(update);
    });
  }, { passive: true });
}



    function setupButtons() {
        const nextBtn = document.getElementById("nextBtn");
        const prevBtn = document.getElementById("prevBtn");
        if (nextBtn) nextBtn.onclick = () => window.TextEngine.nextChapter();
        if (prevBtn) prevBtn.onclick = () => window.TextEngine.prevChapter();
    }

    function scrollToActive() {
        const activeChapter = chapters[activeIndex];
        if (!activeChapter) return;
        const el = container.querySelector(`.chapter[data-chapter-id="${activeChapter.id}"]`);
        if (el) {
            const containerRect = container.getBoundingClientRect();
            const chapterRect = el.getBoundingClientRect();
            const delta = chapterRect.top - containerRect.top + container.scrollTop - 40;
            container.scrollTo({ top: delta, behavior: "smooth" });
        }
    }


    /* ===================== PUBLIC API ===================== */

    window.TextEngine = {
        init,
        // 🔑 TÄMÄ RIVI KORJAA VIRHEEN:
        scrollToActive: () => scrollToActive(), 

        nextChapter: () => {
            const currentId = chapters[activeIndex]?.id;
            const fIdx = filteredIds.indexOf(currentId);
            if (fIdx !== -1 && fIdx < filteredIds.length - 1) {
                window.TextEngine.loadChapter(filteredIds[fIdx + 1]);
            }
        },
        prevChapter: () => {
            const currentId = chapters[activeIndex]?.id;
            const fIdx = filteredIds.indexOf(currentId);
            if (fIdx > 0) {
                window.TextEngine.loadChapter(filteredIds[fIdx - 1]);
            }
        },
        loadChapter: (id) => {
            const targetId = String(id).padStart(3, "0");
            const idx = chapters.findIndex(c => c.id === targetId);
            if (idx !== -1) {
                activeIndex = idx;
                render();
                // Käytetään sisäistä funktiota suoraan
                setTimeout(() => scrollToActive(), 15);
                dispatchChapterChange();
            }
        },
        setView: (view) => {
        currentView = view;
        


        render();
        
        // Varmistetaan skrollaus takaisin oikeaan kohtaan
        setTimeout(() => {
            if (typeof scrollToActive === 'function') scrollToActive();
        }, 60);

        dispatchChapterChange();
    },
        setFilter: (ids) => {
            filteredIds = ids.map(id => String(id).padStart(3, "0"));
            render();
            if (window.TOCEngine && window.TOCEngine.setFilter) {
                window.TOCEngine.setFilter(filteredIds);
            }
        },
setSearchQuery: (q) => {
    // Päivitetään haku
    searchQuery = q.toLowerCase().trim();
    
    // Pidetään kaikki luvut näkyvissä (jos haluat korostuksen ilman piilottamista)
    // filteredIds = chapters.map(c => c.id); 

    // TAI jos haluat että haku suodattaa JA korostaa:
    if (searchQuery === "") {
        filteredIds = chapters.map(c => c.id);
    } else {
        filteredIds = chapters.filter(ch => {
            const inTitle = (ch.title || "").toLowerCase().includes(searchQuery);
            const inNarrative = (ch.versions?.narrative?.body_md || "").toLowerCase().includes(searchQuery);
            return inTitle || inNarrative;
        }).map(ch => ch.id);
    }

    // Pakotetaan täysi uudelleenrenderöinti jos haku suodattaa lukuja
    container.innerHTML = ""; 
    render();

    // Päivitetään TOC
    if (window.TOCEngine && window.TOCEngine.setFilter) {
        window.TOCEngine.setFilter(filteredIds);
    }
},
        
        getAllChapters: () => chapters,
        getActiveChapterId: () => chapters[activeIndex]?.id || "001",
        getChapterMeta: (id) => chapters.find(c => c.id === String(id).padStart(3, "0"))
    };



    // Käynnistetään alustus
    init();
})();