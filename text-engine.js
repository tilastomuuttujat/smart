/* ============================================================
   text-engine.js – KORJATTU JA HARMONISOITU VERSIO (V5.0)
   ============================================================ */
import { NarrativeModules } from './narrative-modules.js';
import { AnalysisModules } from './analysis-modules.js';
import { ReflectionModules } from './reflection-modules.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(function () {
    // 1. TILAMUUTTUJAT
    let chapters = [];
    let filteredIds = [];
    let activeIndex = 0;
    let currentView = "narrative";
    let searchQuery = "";
    let dwellTimer = null;
    let container = null;
    const containerId = "textArea";

    const keywords = {
        'kustannus': { economy: 80 },
        'tehokkuus': { economy: 90 },
        'sielu': { ethics: 80 },
        'ihminen': { ethics: 70 }
    };

    /* ===================== ALUSTUSLOGIIKKA ===================== */

    async function init() {
        container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "<div class='loading-state'><p>Ladataan sisältöä...</p></div>";

        try {
            await loadChaptersFromFirebase();
            if (!chapters.length) {
                container.innerHTML = "<p>Tietokanta on tyhjä.</p>";
                return;
            }

            render();
            setupCognitiveTracking();
            setupNarrativeScroll();
            setupButtons();
            
            dispatchReady();
            dispatchChapterChange();

        } catch (err) {
            console.error("TextEngine Error:", err);
            container.innerHTML = `<div class='error-state'><p>Lataus epäonnistui.</p></div>`;
        }
    }

    /* ===================== DATAN LATAUS ===================== */

    async function loadChaptersFromFirebase() {
        try {
            if (!window.db) throw new Error("Firestore-yhteyttä ei löydy.");

            console.log("📥 Haetaan lukuja Firebasesta...");
            const esseetRef = collection(window.db, "esseet");
            const q = query(esseetRef, orderBy("id"));

            const querySnapshot = await getDocs(q);
            const rawData = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.id) data.id = doc.id; 
                rawData.push(data);
            });

            console.log(`✅ Vastaanotettiin ${rawData.length} raakaa dokumenttia.`);
            chapters = rawData.map(normalizeChapter).filter(Boolean);
            filteredIds = chapters.map(c => c.id);

            console.log(`📚 TextEngine valmis: ${chapters.length} lukua käsitelty.`);
        } catch (err) {
            console.error("❌ Virhe ladattaessa lukuja Firebasesta:", err);
            throw err;
        }
    }

    function normalizeChapter(c) {
        if (!c || c.id === undefined || c.id === null) return null;

        const standardizedId = String(c.id).padStart(3, "0");

        return {
            ...c,
            id: standardizedId,
            title: c.meta?.title || c.title || `Luku ${c.id}`,
            tags: Array.isArray(c.tags) ? c.tags : (Array.isArray(c.meta?.tags) ? c.meta.tags : []),
            versions: {
                narrative: c.views?.narrative?.body_md 
                    ? { body_md: c.views.narrative.body_md } 
                    : (c.content ? { body_md: c.content } : null),
                analysis: c.views?.analysis?.body_md 
                    ? { body_md: c.views.analysis.body_md } 
                    : null,
                reflection: c.views?.reflection?.body_md 
                    ? { body_md: c.views.reflection.body_md } 
                    : null
            }
        };
    }

    /* ===================== RENDERÖINTI ===================== */

function render() {
    if (!container) return;
    
    // 1. TYHJENNETÄÄN KAIKKI VANHA
    container.innerHTML = "";
    
    console.log("Renderöidään näkymää:", currentView);

    // 2. VALITAAN NÄYTETTÄVÄT LUVUT
    // Narratiivissa kaikki suodatetut, muuten vain aktiivinen luku
    const itemsToRender = (currentView === "narrative") 
        ? chapters.filter(ch => filteredIds.includes(ch.id))
        : [chapters[activeIndex]];

    itemsToRender.forEach((ch) => {
        if (!ch) return;

        // 3. HAETAAN VERSIODATA (varmistetaan fallback narratiiviin jos puuttuu)
        const versionData = ch.versions[currentView] || ch.versions.narrative;
        const bodyContent = versionData ? versionData.body_md : "Ei sisältöä.";

        // 4. LUODAAN ELEMENTTI
        // Käytetään moduulia pohjana, mutta luodaan puhdas versio
        const chapterEl = document.createElement('article');
        chapterEl.className = `chapter-container view-${currentView}`;
        chapterEl.dataset.chapterId = ch.id;

        // Otsikko
        const header = document.createElement('h1');
        header.innerHTML = highlightText(ch.title, searchQuery);
        chapterEl.appendChild(header);

        // Tekstisisältö
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'chapter-body';
        
        // Jaetaan kappaleisiin ja piirretään
        const paragraphs = bodyContent.split(/\r?\n\n/).filter(Boolean);
        bodyDiv.innerHTML = paragraphs
            .map(p => `<p>${highlightText(p.trim(), searchQuery)}</p>`)
            .join("");
        
        chapterEl.appendChild(bodyDiv);

        // 5. LISÄTÄÄN ELEMENTTI SÄILIÖÖN
        container.appendChild(chapterEl);
    });

    // 6. SKROLLATAAN AKTIIVISEEN LUKUUN
    if (currentView !== "narrative") {
        container.scrollTop = 0; // Analyysissä ja reflektiossa aina alkuun
    }
}

    function highlightText(text, query) {
        if (!query || query.length < 2) return text;
        const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }

    /* ===================== SEURANTA JA PAINIKKEET ===================== */

    function setupCognitiveTracking() {
        container.addEventListener("scroll", () => {
            clearTimeout(dwellTimer);
            dwellTimer = setTimeout(() => {
                const focusY = container.getBoundingClientRect().top + 150;
                const elements = document.elementsFromPoint(window.innerWidth / 2, focusY);
                const el = elements.find(e => e.tagName === 'P');
                if (el) {
                    const text = el.textContent.toLowerCase();
                    Object.keys(keywords).forEach(key => {
                        if (text.includes(key)) {
                            window.AppState?.updateReflection({ lastInsight: key });
                        }
                    });
                }
            }, 3000);
        }, { passive: true });
    }

    function setupNarrativeScroll() {
        container.addEventListener("scroll", () => {
            if (currentView !== "narrative") return;
        }, { passive: true });
    }

    function setupButtons() {
        const nextBtn = document.getElementById("nextBtn");
        const prevBtn = document.getElementById("prevBtn");

        if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); window.TextEngine.nextChapter(); };
        if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); window.TextEngine.prevChapter(); };
    }

    /* ===================== JULKINEN API ===================== */

    function dispatchChapterChange() {
        const ch = chapters[activeIndex];
        if (!ch) return;

        // Päivitetään sivupaneelit
        if (currentView === "narrative") NarrativeModules.updateSidePanel(ch);
        else if (currentView === "analysis") AnalysisModules.updatePanel?.(ch);
        else if (currentView === "reflection") ReflectionModules.updatePanel?.(ch, window.AppState);

        // 🔑 ILMOITUS ANALYTIIKALLE (BehaviorTracker kuuntelee tätä)
        document.dispatchEvent(new CustomEvent("chapterChange", {
            detail: { chapterId: ch.id, view: currentView }
        }));

        window.EventBus?.emit("chapter:change", { chapterId: ch.id });
    }

    function dispatchReady() {
        document.dispatchEvent(new CustomEvent("textEngineReady", { detail: { count: chapters.length } }));
    }

    window.TextEngine = {
        init,
        nextChapter: () => {
            const currentId = chapters[activeIndex]?.id;
            const currentInFilteredIdx = filteredIds.indexOf(currentId);
            if (currentInFilteredIdx !== -1 && currentInFilteredIdx < filteredIds.length - 1) {
                window.TextEngine.loadChapter(filteredIds[currentInFilteredIdx + 1]);
            }
        },
        prevChapter: () => {
            const currentId = chapters[activeIndex]?.id;
            const currentInFilteredIdx = filteredIds.indexOf(currentId);
            if (currentInFilteredIdx > 0) {
                window.TextEngine.loadChapter(filteredIds[currentInFilteredIdx - 1]);
            }
        },
        loadChapter: (id) => {
            const targetId = String(id).padStart(3, "0");
            const idx = chapters.findIndex(c => c.id === targetId);
            if (idx !== -1) {
                activeIndex = idx;
                render();
                dispatchChapterChange();
                const el = container.querySelector(`[data-chapter-id="${targetId}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },
        setView: (view) => {
            currentView = view;
            render();
            dispatchChapterChange();
        },
        setSearchQuery: (q) => {
            searchQuery = q;
            render();
        },
        getAllChapters: () => chapters,
        getActiveChapterId: () => chapters[activeIndex]?.id || "001",
        getChapterMeta: (id) => chapters.find(c => c.id === String(id).padStart(3, "0"))
    };

    init();

})();