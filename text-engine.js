/* ============================================================
   text-engine.js – HARMONISOITU LUKUTILA (V5.3)
   Vastuu:
   - Sisällön lataus ja renderöinti
   - Hakukorostus
   - Lukutilan tulkinta (scroll → merkitys)
   - Teemakohtainen suodatus (setFilter)
============================================================ */

import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(function () {

    /* ===================== TILA ===================== */

    let chapters = [];
    let filteredIds = []; // 🔑 Ohjaa mitä lukuja narratiivissa näytetään
    let activeIndex = 0;
    let currentView = "narrative";
    let searchQuery = "";

    let container = null;
    const containerId = "textArea";

    // Lukutila
    let lastScrollTop = 0;
    let lastScrollTime = performance.now();
    let scrollEnergy = 0;
    let activeParagraphIndex = 0;

    let dwellTimer = null;

    const keywords = {
        'kustannus': { economy: 80 },
        'tehokkuus': { economy: 90 },
        'sielu': { ethics: 80 },
        'ihminen': { ethics: 70 }
    };

    /* ===================== INIT ===================== */

async function init() {
    container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "<div class='loading-state'><p>Ladataan sisältöä...</p></div>";

    try {
        // 🔑 ODOTETAAN OIKEASTI FIRESTOREA
        await waitForFirestore();

        await loadChaptersFromFirebase();

        if (!chapters.length) {
            container.innerHTML = "<p>Tietokanta on tyhjä.</p>";
            return;
        }

        render();
        setupScrollTracking();
        setupCognitiveTracking();
        setupButtons();

        dispatchReady();
        dispatchChapterChange();

    } catch (err) {
        // 🔥 TÄRKEÄ: tulosta oikea virhe
        console.error("❌ TextEngine Error:", err?.message || err);
        console.error(err);

        container.innerHTML = `
            <div class="error-state">
                <p>Lataus epäonnistui.</p>
                <pre style="opacity:.6">${err?.message || "Tuntematon virhe"}</pre>
            </div>
        `;
    }
}


    /* ===================== DATA ===================== */

    async function loadChaptersFromFirebase() {
        if (!window.db) throw new Error("Firestore-yhteyttä ei löydy.");

        const ref = collection(window.db, "esseet");
        const q = query(ref, orderBy("id"));
        const snap = await getDocs(q);

        const raw = [];
        snap.forEach(doc => {
            const d = doc.data();
            raw.push({ ...d, id: d.id ?? doc.id });
        });

        chapters = raw.map(normalizeChapter).filter(Boolean);
        filteredIds = chapters.map(c => c.id);

        console.log(`📚 TextEngine: ${chapters.length} lukua ladattu.`);
    }

    function normalizeChapter(c) {
        if (!c || c.id == null) return null;

        const id = String(c.id).padStart(3, "0");
        return {
            ...c,
            id,
            title: c.meta?.title || c.title || `Luku ${id}`,
            tags: c.tags || c.meta?.tags || [],
            versions: {
                narrative: c.views?.narrative?.body_md || c.content || "",
                analysis: c.views?.analysis || null,
                reflection: c.views?.reflection || null
            }
        };
    }
    
    function waitForFirestore(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = performance.now();

        const tick = () => {
            if (window.db) {
                resolve(window.db);
                return;
            }
            if (performance.now() - start > timeout) {
                reject(new Error("Firestore ei alustunut ajoissa"));
                return;
            }
            requestAnimationFrame(tick);
        };

        tick();
    });
}

    
    function updateActiveChapterFromScroll() {
    const articles = container.querySelectorAll("article.chapter-container");
    if (!articles.length) return;

    const viewportMid = container.getBoundingClientRect().top + container.clientHeight * 0.35;

    let closest = null;
    let minDist = Infinity;

    articles.forEach(article => {
        const rect = article.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(mid - viewportMid);

        if (dist < minDist) {
            minDist = dist;
            closest = article;
        }
    });

    if (!closest) return;

    const chapterId = closest.dataset.chapterId;
    const newIndex = chapters.findIndex(c => c.id === chapterId);

    if (newIndex !== -1 && newIndex !== activeIndex) {
        activeIndex = newIndex;
        dispatchChapterChange();
    }
}


    /* ===================== RENDER ===================== */

    function render() {
        if (!container) return;
        container.innerHTML = "";

        // Päätetään näytettävät luvut: Narratiivissa koko polku/suodatus, muissa vain aktiivinen
        const items = currentView === "narrative" 
            ? chapters.filter(ch => filteredIds.includes(ch.id)) 
            : [chapters[activeIndex]];

        items.forEach(ch => {
            if (!ch) return;

            const raw = ch.versions[currentView] || ch.versions.narrative || "";
            const text = typeof raw === "string" ? raw : raw.body_md || "";

            const article = document.createElement("article");
            article.className = `chapter-container view-${currentView}`;
            article.dataset.chapterId = ch.id;

            const h1 = document.createElement("h1");
            h1.innerHTML = highlightText(ch.title, searchQuery);
            article.appendChild(h1);

            const body = document.createElement("div");
            body.className = "chapter-body";

            const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
            paragraphs.forEach((p, i) => {
                const el = document.createElement("p");
                el.innerHTML = highlightText(p.trim(), searchQuery);
                el.dataset.index = i;

                if (i === 0) el.classList.add("paragraph--opening");
                else if (i === paragraphs.length - 1) el.classList.add("paragraph--echo");
                else el.classList.add("paragraph--core");

                body.appendChild(el);
            });

            article.appendChild(body);
            container.appendChild(article);
        });

        if (searchQuery.length > 1) {
            const firstHit = container.querySelector("mark");
            if (firstHit) firstHit.scrollIntoView({ behavior: "smooth", block: "center" });

            window.EventBus?.emit("text:searchComplete", {
                query: searchQuery,
                hits: container.querySelectorAll("mark").length
            });
        }
    }

    function highlightText(text, query) {
        if (!query || query.trim().length < 2) return text;
        const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${esc})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /* ===================== LUKUTILA ===================== */

function setupScrollTracking() {
    container.addEventListener("scroll", () => {
        if (currentView !== "narrative") return;

        const now = performance.now();
        const top = container.scrollTop;

        const dy = Math.abs(top - lastScrollTop);
        const dt = Math.max(now - lastScrollTime, 16);

        const velocity = dy / dt;
        scrollEnergy = Math.min(1, velocity * 8);

        lastScrollTop = top;
        lastScrollTime = now;

        updateActiveParagraph();
        updateActiveChapterFromScroll(); // 🔑 TÄMÄ PUUTTUI

        window.EventBus?.emit("readingStateChanged", {
            chapterId: chapters[activeIndex]?.id,
            paragraphIndex: activeParagraphIndex,
            scrollEnergy
        });

    }, { passive: true });
}

    function updateActiveParagraph() {
        const midY = container.getBoundingClientRect().top + container.clientHeight * 0.4;
        const els = document.elementsFromPoint(window.innerWidth / 2, midY);
        const p = els.find(e => e.tagName === "P");

        if (p?.dataset.index) {
            activeParagraphIndex = Number(p.dataset.index);
        }
    }

    function setupCognitiveTracking() {
        container.addEventListener("scroll", () => {
            clearTimeout(dwellTimer);
            dwellTimer = setTimeout(() => {
                const els = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
                const p = els.find(e => e.tagName === "P");
                if (!p) return;

                const t = p.textContent.toLowerCase();
                Object.keys(keywords).forEach(k => {
                    if (t.includes(k)) {
                        window.AppState?.updateReflection({ lastInsight: k });
                    }
                });
            }, 3000);
        }, { passive: true });
    }

    /* ===================== NAVIGAATIO ===================== */

    function setupButtons() {
        document.getElementById("nextBtn")?.addEventListener("click", e => {
            e.preventDefault();
            window.TextEngine.nextChapter();
        });
        document.getElementById("prevBtn")?.addEventListener("click", e => {
            e.preventDefault();
            window.TextEngine.prevChapter();
        });
    }


function dispatchReady() {
    document.dispatchEvent(new CustomEvent("textEngineReady", {
        detail: {
            count: chapters.length
        }
    }));
}


/* text-engine.js – KORJATTU JA VARMISTETTU FUNKTIO */
function dispatchChapterChange() {
    const ch = chapters[activeIndex];
    if (!ch) return;

    // 🔑 Päivitetään älykkäät moduulit globaalin window-objektin kautta
    // Käytetään setTimeoutia (0ms), jotta varmistetaan näkymän vaihdon (DOM) valmistuminen
    setTimeout(() => {
        if (currentView === "analysis" && window.AnalysisModules) {
            console.log("📊 Päivitetään analyysimoduuli luvulle:", ch.id);
            window.AnalysisModules.updatePanel(ch, currentView);
        } 
        else if (currentView === "reflection" && window.ReflectionModules) {
            console.log("💭 Päivitetään reflektiomoduuli luvulle:", ch.id);
            window.ReflectionModules.updatePanel(ch, window.AppState);
        }
    }, 0);

    // Ilmoitetaan järjestelmälle luvun vaihtumisesta (mm. BehaviorTracker kuuntelee tätä)
    document.dispatchEvent(new CustomEvent("chapterChange", {
        detail: { chapterId: ch.id, view: currentView }
    }));

    // Ilmoitetaan EventBusin kautta (mm. Starfield-käsitekartta kuuntelee tätä)
    window.EventBus?.emit("chapter:change", { chapterId: ch.id });
}
    /* ===================== PUBLIC API ===================== */

    window.TextEngine = {
        init,
        nextChapter() {
            const id = chapters[activeIndex]?.id;
            const i = filteredIds.indexOf(id);
            if (i < filteredIds.length - 1) this.loadChapter(filteredIds[i + 1]);
        },
        prevChapter() {
            const id = chapters[activeIndex]?.id;
            const i = filteredIds.indexOf(id);
            if (i > 0) this.loadChapter(filteredIds[i - 1]);
        },
        loadChapter(id) {
            const tid = String(id).padStart(3, "0");
            const i = chapters.findIndex(c => c.id === tid);
            if (i !== -1) {
                activeIndex = i;
                render();
                dispatchChapterChange();
                container.querySelector(`[data-chapter-id="${tid}"]`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },
        // 🔑 TOCEngine tarvitsee tätä suodattamaan polut (teemat/haku)
        setFilter(ids) {
            if (Array.isArray(ids) && ids.length > 0) {
                filteredIds = ids.map(id => String(id).padStart(3, "0"));
            } else {
                filteredIds = chapters.map(c => c.id);
            }
            render();
        },
        setView(view) {
            currentView = view;
            render();
            dispatchChapterChange();
        },
        setSearchQuery(q) {
            searchQuery = q;
            render();
        },
        getAllChapters: () => chapters,
        getActiveChapterId: () => chapters[activeIndex]?.id,
        getChapterMeta: (id) => {
            const cid = String(id).padStart(3, "0");
            return chapters.find(c => c.id === cid) || null;
        }
    };

    init();
})();