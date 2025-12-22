/* ============================================================
   text-engine.js – HARMONISOITU VERSIO + KOMMENTOINTI & FB-JAKO
   ============================================================ */
import { NarrativeModules } from './narrative-modules.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(function () {
    let chapters = [];
    let filteredIds = [];
    let activeIndex = 0;
    let currentView = "narrative";
    let searchQuery = "";
    const containerId = "textArea";
    let container = null;

    // Kommentointitila
    let selectedParagraph = null;
    let currentBox = null;

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
            setupCommentGestures(); // 🔑 Aktivoidaan kommentointi ja swipe-eleet
            scrollToActive();
            
            if (chapters[activeIndex]) {
                NarrativeModules.updateSidePanel(chapters[activeIndex]);
            }

            dispatchReady(); 

        } catch (err) {
            console.error("TextEngine Error:", err);
            container.innerHTML = `<div class='error-state'><p>Lataus epäonnistui.</p></div>`;
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

    function render() {
        if (!container) return;
        clearSelection(); 
        container.innerHTML = "";

        if (currentView === "narrative") {
            chapters.forEach((ch) => {
                if (filteredIds.includes(ch.id)) {
                    container.appendChild(NarrativeModules.renderChapter(ch, currentView, searchQuery, highlightText));
                }
            });
        } else {
            const activeCh = chapters[activeIndex];
            if (activeCh) {
                container.appendChild(NarrativeModules.renderChapter(activeCh, currentView, searchQuery, highlightText));
            }
        }
    }

    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }

    /* ===================== KOMMENTOINTI & FB-JAKO ===================== */

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

        // Facebook-jako
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
            await fetch(url, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
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

            if (dx > 60) { // Oikealle -> Kommentoi
                clearSelection();
                selectedParagraph = p;
                p.classList.add("p-selected-quote");
                currentBox = createCommentBox(p);
                p.insertAdjacentElement("afterend", currentBox);
            } else if (dx < -60) { // Vasemmalle -> Sulje
                clearSelection();
            }
        }, { passive: true });
    }

    /* ===================== NAVIGOINTI JA SYNKRONOINTI ===================== */

    function dispatchReady() {
        document.dispatchEvent(new CustomEvent("textEngineReady", { detail: { count: chapters.length } }));
    }

    function dispatchChapterChange() {
        const ch = chapters[activeIndex];
        if (ch) {
            NarrativeModules.updateSidePanel(ch);
            document.dispatchEvent(new CustomEvent("chapterChange", {
                detail: { chapterId: ch.id, view: currentView, config: ch.config }
            }));
        }
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

    function setupNarrativeScroll() {
        container.addEventListener("scroll", () => {
            if (currentView !== "narrative") return;
            const chaptersEls = container.querySelectorAll(".chapter");
            const focusY = container.getBoundingClientRect().top + 120;
            for (const el of chaptersEls) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= focusY && rect.bottom >= focusY) {
                    const idx = chapters.findIndex(c => c.id === el.dataset.chapterId);
                    if (idx !== -1 && idx !== activeIndex) {
                        activeIndex = idx;
                        dispatchChapterChange();
                    }
                    break;
                }
            }
        });
    }

    /* ===================== PUBLIC API ===================== */

    window.TextEngine = {
        init,
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
                setTimeout(scrollToActive, 15);
                dispatchChapterChange();
            }
        },
        setView: (view) => {
            currentView = view;
            render();
            setTimeout(scrollToActive, 15);
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
            searchQuery = q.toLowerCase().trim();
            if (searchQuery === "") {
                filteredIds = chapters.map(c => c.id);
            } else {
                filteredIds = chapters.filter(ch => {
                    const inTitle = (ch.title || "").toLowerCase().includes(searchQuery);
                    const inNarrative = (ch.versions?.narrative?.body_md || "").toLowerCase().includes(searchQuery);
                    const inAnalysis = (ch.versions?.analysis?.body_md || "").toLowerCase().includes(searchQuery);
                    return inTitle || inNarrative || inAnalysis;
                }).map(ch => ch.id);
            }
            render();
            if (window.TOCEngine) {
                if (window.TOCEngine.setFilter) window.TOCEngine.setFilter(filteredIds);
                else if (window.TOCEngine.render) window.TOCEngine.render(chapters.filter(c => filteredIds.includes(c.id)));
            }
        },
        getAllChapters: () => chapters,
        getActiveChapterId: () => chapters[activeIndex]?.id || "001",
        getChapterMeta: (id) => chapters.find(c => c.id === String(id).padStart(3, "0"))
    };

    init();
})();