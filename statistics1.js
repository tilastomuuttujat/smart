(function () {

  const STATFIN_ENDPOINT =
    "https://pxdata.stat.fi:443/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px";

  const SOURCE_LABEL = "Tilastokeskus";
  const STAT_NAME = "Huoltosuhde (väestöllinen)";

  const QUERY = {
    query: [
      {
        code: "Alue",
        selection: {
          filter: "agg:_- Hyvinvointialueet 2025.agg",
          values: [
            "SSS",
            "HVA01","HVA02","HVA03","HVA04","HVA05","HVA06",
            "HVA07","HVA08","HVA09","HVA10","HVA11","HVA12",
            "HVA13","HVA14","HVA15","HVA16","HVA17","HVA18",
            "HVA19","HVA20","HVA21"
          ]
        }
      },
      {
        code: "Tiedot",
        selection: {
          filter: "item",
          values: ["dem_huoltos"]
        }
      }
    ],
    response: { format: "json-stat2" }
  };

  window.renderDemographicDependencyChart = async function (container) {
    if (!container) return;
    const json = await fetchStatFin();
    const model = extractMultiSeries(json);
    drawMultiLineChart(container, model);
  };

  async function fetchStatFin() {
    const res = await fetch(STATFIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(QUERY)
    });
    if (!res.ok) throw new Error("StatFin fetch failed");
    return await res.json();
  }

  function extractMultiSeries(jsonstat) {
    const dataset = jsonstat.dataset || jsonstat;
    const dims = dataset.dimension;
    const values = dataset.value;

    const years = Object.values(dims.Vuosi.category.label);
    const areaLabels = dims.Alue.category.label;
    const areaIndex = dims.Alue.category.index;

    const yearCount = years.length;
    const seriesByArea = {};

    Object.keys(areaIndex).forEach(areaCode => {
      const aIdx = areaIndex[areaCode];
      const series = [];
      for (let y = 0; y < yearCount; y++) {
        const idx = aIdx * yearCount + y;
        const v = values[idx];
        if (typeof v === "number") series.push(v);
      }
      if (series.length) seriesByArea[areaCode] = series;
    });

    return { years, seriesByArea, areaLabels };
  }

  function drawMultiLineChart(container, { years, seriesByArea, areaLabels }) {

    const w = 620;
    const h = 320;
    const pad = { t: 24, r: 30, b: 44, l: 56 };

    const allValues = Object.values(seriesByArea).flat();
    let min = Math.min(...allValues);
    let max = Math.max(...allValues);
    if (min === max) { min -= 1; max += 1; }

    const sx = i =>
      pad.l + i * ((w - pad.l - pad.r) / (years.length - 1));

    const sy = v =>
      h - pad.b - ((v - min) / (max - min)) * (h - pad.t - pad.b);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.style.width = "100%";
    svg.style.display = "block";

    const axisColor = "rgba(255,255,255,0.35)";
    const labelColor = "rgba(255,255,255,0.55)";

    svg.appendChild(line(pad.l, pad.t, pad.l, h - pad.b, axisColor));
    svg.appendChild(line(pad.l, h - pad.b, w - pad.r, h - pad.b, axisColor));

    /* ===== vertical title & source ===== */

    const vg = document.createElementNS(svg.namespaceURI, "g");
    vg.setAttribute(
      "transform",
      `translate(${pad.l - 46}, ${(pad.t + h - pad.b) / 2}) rotate(-90)`
    );

    vg.appendChild(vText(STAT_NAME, 0, 0, 14, 0.28, true));
    vg.appendChild(vText(SOURCE_LABEL, 0, 18, 11, 0.22));

    svg.appendChild(vg);

    for (let i = 0; i <= 5; i++) {
      const v = min + (i / 5) * (max - min);
      const y = sy(v);
      svg.appendChild(line(pad.l - 4, y, pad.l, y, axisColor));
      svg.appendChild(text(pad.l - 8, y + 4, v.toFixed(0), "end", labelColor));
    }

    years.forEach((yr, i) => {
      if (i % 5 !== 0) return;
      const x = sx(i);
      svg.appendChild(line(x, h - pad.b, x, h - pad.b + 4, axisColor));
      svg.appendChild(text(x, h - pad.b + 16, yr, "middle", labelColor));
    });

    /* ===== last year labels (initial state) ===== */

    const lastIndex = years.length - 1;
    let lastMax = -Infinity, lastMin = Infinity;
    let lastMaxArea = null, lastMinArea = null;

    Object.entries(seriesByArea).forEach(([code, vals]) => {
      if (code === "SSS") return;
      const v = vals[lastIndex];
      if (v > lastMax) { lastMax = v; lastMaxArea = code; }
      if (v < lastMin) { lastMin = v; lastMinArea = code; }
    });

    const initialLabels = document.createElementNS(svg.namespaceURI, "g");
    svg.appendChild(initialLabels);

    const lx = sx(lastIndex);

    function endLabel(txt, v, dy = 0) {
      const t = document.createElementNS(svg.namespaceURI, "text");
      t.setAttribute("x", lx - 6);
      t.setAttribute("y", sy(v) + dy);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("font-size", "11");
      t.setAttribute("fill", "rgba(255,255,255,0.75)");
      t.textContent = txt;
      initialLabels.appendChild(t);
    }

    if (seriesByArea.SSS) {
      endLabel(`Koko maa: ${seriesByArea.SSS[lastIndex].toFixed(1)}`,
        seriesByArea.SSS[lastIndex], -6);
    }

    if (lastMaxArea) {
      endLabel(
        `MAX ${areaLabels[lastMaxArea]}: ${lastMax.toFixed(1)}`,
        lastMax,
        -6
      );
    }

    if (lastMinArea) {
      endLabel(
        `MIN ${areaLabels[lastMinArea]}: ${lastMin.toFixed(1)}`,
        lastMin,
        14
      );
    }

    /* ===== tooltip ===== */

    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(15,20,32,0.96);
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      color: #e5e7eb;
    `;
    container.style.position = "relative";
    container.appendChild(tooltip);

    let focusDot = null;

    /* ===== lines ===== */

    Object.entries(seriesByArea).forEach(([areaCode, values]) => {

      const d = values.map((v, i) =>
        `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`
      ).join(" ");

      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#7aa2c7");
      path.setAttribute("stroke-width", areaCode === "SSS" ? "2.8" : "1");
      path.setAttribute("opacity", areaCode === "SSS" ? "1" : "0.18");

      svg.appendChild(path);

      path.onclick = evt => {

        initialLabels.remove();

        const pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        const step = (w - pad.l - pad.r) / (years.length - 1);
        let i = Math.round((svgP.x - pad.l) / step);
        i = Math.max(0, Math.min(i, years.length - 1));

        if (focusDot) focusDot.remove();

        focusDot = document.createElementNS(svg.namespaceURI, "circle");
        focusDot.setAttribute("cx", sx(i));
        focusDot.setAttribute("cy", sy(values[i]));
        focusDot.setAttribute("r", "4.5");
        focusDot.setAttribute("fill", "#ffffff");
        svg.appendChild(focusDot);

        tooltip.innerHTML = `
          <div style="font-size:11px; opacity:0.7;">
            ${areaLabels[areaCode]}
          </div>
          <div style="font-weight:600;">${years[i]}</div>
          <div style="font-size:16px; font-weight:700;">
            ${values[i].toFixed(1)}
          </div>
        `;
        tooltip.style.left = `${sx(i)}px`;
        tooltip.style.top = `${sy(values[i]) - 36}px`;
        tooltip.style.opacity = "1";
      };
    });

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      margin-top: 12px;
      padding: 14px;
      border-radius: 12px;
      background: linear-gradient(180deg, #171c28, #0f1420);
      border: 1px solid rgba(255,255,255,0.08);
    `;

    wrapper.appendChild(svg);
    container.appendChild(wrapper);
  }

  function line(x1, y1, x2, y2, stroke) {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", x1);
    l.setAttribute("y1", y1);
    l.setAttribute("x2", x2);
    l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke);
    return l;
  }

  function text(x, y, txt, anchor, color) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor);
    t.setAttribute("font-size", "10");
    t.setAttribute("fill", color);
    t.textContent = txt;
    return t;
  }

  function vText(txt, x, y, size, opacity, bold = false) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", size);
    t.setAttribute("fill", `rgba(255,255,255,${opacity})`);
    if (bold) t.setAttribute("font-weight", "600");
    t.textContent = txt;
    return t;
  }

})();
