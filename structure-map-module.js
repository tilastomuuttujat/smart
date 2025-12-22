/* ============================================================
   structure-map-module.js
   Vastuu:
   - Visualisoi rakenteelliset suhteet (valta, vastuu, mittarit)
   - Näyttää kasaumat, pullonkaulat ja etäisyydet
   - Mahdollistaa termi- ja tekstikohdistuksen
   ============================================================ */

ModuleRegistry.register({

  /* ===================== PERUSTIEDOT ===================== */

  id: "structure_map",
  title: "Rakenteiden kartta",

  /* ===================== INIT ===================== */

  init() {
    this.container = document.getElementById("structureMap");
    if (!this.container) {
      console.warn("structure_map: container puuttuu");
      return;
    }

    this.container.style.display = "none";
    this.container.style.position = "relative";
  },

  /* ===================== AKTIVOINTI ===================== */

  activate({ framework, mode }) {
    if (!this.container) return;

    this.container.style.display = "block";
    this.render(framework, mode);
  },

  deactivate() {
    if (!this.container) return;

    this.container.style.display = "none";
    this.container.innerHTML = "";
  },

  onModeChange(mode, framework) {
    this.render(framework, mode);
  },

  /* ===================== RENDER ===================== */

  render(framework, mode) {
    if (!this.container || !framework) return;

    this.container.innerHTML = "";

    const title = document.createElement("h4");
    title.textContent = "Rakenteellinen kartta";
    title.style.marginTop = "0";

    const nodes = this.getStructureNodes(framework, mode);
    const edges = this.getStructureEdges(framework, mode);

    if (!nodes.length) {
      const empty = document.createElement("p");
      empty.textContent =
        "Tässä tarkastelussa rakenteellisia suhteita ei ole määritelty.";
      empty.style.opacity = "0.7";
      this.container.append(title, empty);
      return;
    }

    const map = document.createElement("div");
    map.className = "structure-map";

    nodes.forEach(node => {
      const el = document.createElement("div");
      el.className = "structure-node";
      el.textContent = node.label;

      el.style.left = node.x + "%";
      el.style.top = node.y + "%";

      if (node.term) {
        el.style.cursor = "pointer";
        el.addEventListener("click", e => {
          e.stopPropagation();
          MIEngine.focusTerm(node.term);
        });
      }

      map.appendChild(el);
    });

    edges.forEach(edge => {
      const line = document.createElement("div");
      line.className = "structure-edge";

      line.style.left = edge.x1 + "%";
      line.style.top = edge.y1 + "%";
      line.style.width = edge.length + "%";
      line.style.transform = `rotate(${edge.angle}deg)`;

      map.appendChild(line);
    });

    this.container.append(title, map);
  },

  /* ===================== DATA ===================== */

  getStructureNodes(framework, mode) {
    /*
      frameworks.json voi sisältää:

      structure_map: {
        describe: {
          nodes: [
            { label: "Valtio", x: 20, y: 30, term: "julkinen valta" }
          ],
          edges: [...]
        }
      }
    */

    if (!framework.structure_map) return [];

    return framework.structure_map[mode]?.nodes || [];
  },

  getStructureEdges(framework, mode) {
    if (!framework.structure_map) return [];

    return framework.structure_map[mode]?.edges || [];
  }

});