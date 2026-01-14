/* ============================================================
   QuestionFlowRenderer
   Genesis Ultimate Engine δ
   Aktivoituu vain narrative.view_type === "question_flow"
   ============================================================ */

/* ============================================================
   PARSER – VÄLTTÄMÄTÖN, MUUTEN KLIKKAUKSET EIVÄT TOIMI
   ============================================================ */
function parseQuestionBlocks(md = "") {
  const lines = md.split("\n");
  const blocks = [];
  let current = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // UUSI KYSYMYS
    if (line.startsWith("?")) {
      if (current) blocks.push(current);
      current = {
        question: line.replace(/^\?\s*/, ""),
        description: "",
        choices: []
      };
      continue;
    }

    // JAKOVIIVA
    if (line === "---") continue;

    // VALINTA
    if (line.startsWith("-")) {
      const [left, right] = line
        .replace(/^-/, "")
        .split("::")
        .map(s => s.trim());

      current?.choices.push({
        title: left,
        desc: right || "",
        next: null
      });
      continue;
    }

    // KUVAUS
    if (current) {
      current.description +=
        (current.description ? " " : "") + line;
    }
  }

  if (current) blocks.push(current);

  // AUTOMAATTINEN ETENEMINEN
  blocks.forEach((b, i) => {
    if (!b.choices.length) {
      b.choices.push({
        title: "Jatka",
        desc: "",
        next: i + 1 < blocks.length ? i + 1 : null
      });
    } else {
      b.choices.forEach(c => {
        if (c.next === null) {
          c.next = i + 1 < blocks.length ? i + 1 : null;
        }
      });
    }
  });

  return blocks;
}

/* ============================================================
   RENDERER
   ============================================================ */

window.QuestionFlowRenderer = function QuestionFlowRenderer({
  source,
  essay,
  docId
}) {
  const root = document.createElement("div");
  root.className = "question-flow-root";
  root.dataset.docId = docId;
  root.dataset.view = "question_flow";

  Object.assign(root.style, {
    maxWidth: "820px",
    margin: "0 auto",
    padding: "48px 20px 72px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    pointerEvents: "auto" // ⬅️ KRIITTINEN
  });

  const blocks = parseQuestionBlocks(source || "");
  let index = 0;

  if (!blocks.length) {
    root.innerHTML = "<p>Ei kysymyksiä.</p>";
    return root;
  }

  const stage = document.createElement("div");
  stage.style.pointerEvents = "auto";
  root.appendChild(stage);

  renderStage();

  function renderStage() {
    stage.innerHTML = "";
    const block = blocks[index];
    if (!block) return;

    const h = document.createElement("h2");
    h.textContent = block.question;
    Object.assign(h.style, {
      fontSize: "36px",
      lineHeight: "1.15"
    });
    stage.appendChild(h);

    if (block.description) {
      const p = document.createElement("div");
      p.textContent = block.description;
      Object.assign(p.style, {
        fontSize: "18px",
        lineHeight: "1.7",
        opacity: "0.85"
      });
      stage.appendChild(p);
    }

    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "16px",
      marginTop: "24px"
    });

    block.choices.forEach(choice => {
      const card = document.createElement("div");
      Object.assign(card.style, {
        border: "1px solid rgba(0,0,0,0.15)",
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        transition: "transform .2s ease, box-shadow .2s ease",
        pointerEvents: "auto"
      });

      card.onmouseenter = () => {
        card.style.transform = "translateY(-3px)";
        card.style.boxShadow = "0 8px 24px rgba(0,0,0,.08)";
      };
      card.onmouseleave = () => {
        card.style.transform = "none";
        card.style.boxShadow = "none";
      };

      const t = document.createElement("div");
      t.textContent = choice.title;
      t.style.fontWeight = "600";

      const d = document.createElement("div");
      d.textContent = choice.desc || "";
      d.style.opacity = "0.7";
      d.style.fontSize = "14px";

      card.append(t, d);

      card.addEventListener("click", () => advance(choice));

      grid.appendChild(card);
    });

    stage.appendChild(grid);

    const footer = document.createElement("div");
    footer.textContent =
      "Et ole ratkaisemassa ongelmaa. Olet estämässä sen pahenemista.";
    footer.style.opacity = "0.6";
    footer.style.fontSize = "13px";
    footer.style.marginTop = "40px";
    stage.appendChild(footer);
  }

  function advance(choice) {
    // 1. Linkki esseeseen
    if (choice.openEssayId && window.openModal) {
      const target = findEssay?.(choice.openEssayId);
      if (target) {
        window.openModal(target, target.id);
        return;
      }
    }

    // 2. Seuraava kysymys
    if (typeof choice.next === "number") {
      index = choice.next;
    } else if (index < blocks.length - 1) {
      index++;
    } else {
      document.getElementById("overlay")?.classList.remove("active");
      document.body.style.overflow = "auto";
      return;
    }

    renderStage();
  }

  return root;
};
