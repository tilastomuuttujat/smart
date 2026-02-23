/* ==========================================================
   elink-charts.js
   Indikaattorikaaviot elink.json-sijoitusten mukaan.

   Riippuvuudet (oletetaan globaaleiksi clakirja-standalone.html:stä):
     svgEl, svgText, niceYTicks, formatAxisVal, getCSSVar,
     createSmoothPath, chartRenderers, esc, S_COLORS

   Lataamatta jättäminen ei tuota virheitä — pääsivussa on stubit.
   ========================================================== */


// ── Jaetut SVG-apufunktiot (myös createSmoothPath on pääsivulla) ──
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function svgText(x, y, txt, attrs = {}) {
  const t = svgEl("text", { x, y, ...attrs });
  t.textContent = txt;
  return t;
}

function niceYTicks(min, max, count = 5) {
  const range = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(range / count)));
  const nice = [1, 2, 2.5, 5, 10].map(m => m * step);
  const s = nice.find(s => range / s <= count + 1) || step;
  const lo = Math.floor(min / s) * s;
  const hi = Math.ceil(max / s) * s;
  const ticks = [];
  for (let v = lo; v <= hi + s * 0.001; v += s) ticks.push(+v.toPrecision(6));
  return ticks;
}

function formatAxisVal(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  if (Number.isInteger(v)) return String(v);
  return v.toPrecision(3).replace(/\.?0+$/, '');
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Yksittäisten kaavioiden piirtimet (elink-fallback) ───
const S_COLORS = [
  "hsl(20,60%,42%)", "hsl(200,55%,45%)", "hsl(38,70%,52%)",
  "hsl(155,45%,40%)", "hsl(280,40%,52%)", "hsl(14,70%,52%)",
];

function drawBar(svg, data) {
  const w = 520, h = 240, pad = { t: 20, r: 20, b: 44, l: 52 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const bottom = pad.t + innerH;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const vals = data.map(d => d.value);
  const yTicks = niceYTicks(Math.min(0, ...vals), Math.max(...vals), 5);
  const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1], yRange = yMax - yMin || 1;
  const sy = v => bottom - ((v - yMin) / yRange) * innerH;
  const bw = (innerW / data.length) * 0.7;
  const gap = innerW / data.length;
  const muted = getCSSVar('--muted'), hairline = getCSSVar('--hairline'), ink = getCSSVar('--ink');
  yTicks.forEach(v => {
    const y = sy(v);
    svg.appendChild(svgEl('line', { x1: pad.l, y1: y, x2: pad.l + innerW, y2: y, stroke: hairline, 'stroke-dasharray': '4 3' }));
    const t = svgEl('text', { x: pad.l - 4, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: muted });
    t.textContent = formatAxisVal(v);
    svg.appendChild(t);
  });
  svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('line', { x1: pad.l, y1: bottom, x2: pad.l + innerW, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
  data.forEach((d, i) => {
    const x = pad.l + i * gap + (gap - bw) / 2;
    const y0 = sy(0), y1 = sy(d.value), barH = Math.abs(y0 - y1);
    svg.appendChild(svgEl('rect', { x, y: Math.min(y0, y1), width: bw, height: barH || 1,
      fill: S_COLORS[i % S_COLORS.length], rx: 2, opacity: 0.88 }));
    if (data.length <= 12) {
      const t = svgEl('text', { x: x + bw / 2, y: bottom + 13, 'text-anchor': 'middle', 'font-size': 9, fill: muted });
      t.textContent = d.label;
      svg.appendChild(t);
    }
  });
}

function drawLine(svg, data) {
  const w = 520, h = 240, pad = { t: 20, r: 20, b: 44, l: 52 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const bottom = pad.t + innerH;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const vals = data.map(d => d.value);
  const yTicks = niceYTicks(Math.min(...vals), Math.max(...vals), 5);
  const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1], yRange = yMax - yMin || 1;
  const sx = i => pad.l + i * (innerW / (data.length - 1 || 1));
  const sy = v => bottom - ((v - yMin) / yRange) * innerH;
  const copper = getCSSVar('--copper'), muted = getCSSVar('--muted'), hairline = getCSSVar('--hairline'), ink = getCSSVar('--ink');
  yTicks.forEach(v => {
    const y = sy(v);
    svg.appendChild(svgEl('line', { x1: pad.l, y1: y, x2: pad.l + innerW, y2: y, stroke: hairline, 'stroke-dasharray': '4 3' }));
    const t = svgEl('text', { x: pad.l - 4, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: muted });
    t.textContent = formatAxisVal(v);
    svg.appendChild(t);
  });
  svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('line', { x1: pad.l, y1: bottom, x2: pad.l + innerW, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
  const stride = Math.max(1, Math.ceil(data.length / 8));
  data.forEach((d, i) => {
    if (i % stride !== 0 && i !== data.length - 1) return;
    const t = svgEl('text', { x: sx(i), y: bottom + 13, 'text-anchor': 'middle', 'font-size': 9, fill: muted });
    t.textContent = d.label;
    svg.appendChild(t);
  });
  const pts = data.map((d, i) => ({ x: sx(i), y: sy(d.value) }));
  svg.appendChild(svgEl('path', { d: createSmoothPath(pts), fill: 'none', stroke: copper, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
}

const chartRenderers = {
  bar:  drawBar,
  line: drawLine,
};

async function loadIndicators(){
  EDATA = await fetch("edata.json").then(r=>r.json());
  ELINK = await fetch("elink.json").then(r=>r.json());
}

function buildPlacementMap(){
  placementMap = {};

  ELINK.placements.forEach(p=>{
    const key = p.chapter + ":" + p.afterParagraph;
    if(!placementMap[key]) placementMap[key] = [];
    placementMap[key].push(p.module);
  });
}

/* ══════════════════════════════════════════════════════════
   ELINK-KAAVIOT  –  indikaattorit elink.json-sijoitusten mukaan
   ══════════════════════════════════════════════════════════ */

/**
 * Piirtää kahden aikasarjan vertailukaavion (erotusaluevärein).
 * Vastaava logiikka kuin test-indi.html:n drawGrowthChart,
 * mutta käyttää kirjan teemavärejä CSS-muuttujista.
 */
function drawElinkGrowthChart(container, seriesA, seriesB, labelA, labelB) {

  let step = 5;

  // Vaihtonapit (1v / 5v / 10v)
  const controls = document.createElement('div');
  controls.className = 'chart-toggle';
  controls.innerHTML = `
    <button data-step="1">1v</button>
    <button data-step="5" class="active">5v</button>
    <button data-step="10">10v</button>
  `;
  container.appendChild(controls);

  const svgWrap = document.createElement('div');
  container.appendChild(svgWrap);

  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = `
    <span class="legend-item">
      <span class="legend-swatch" style="background:var(--copper)"></span>${esc(labelA)}
    </span>
    <span class="legend-item">
      <span class="legend-swatch" style="background:hsl(200,55%,45%)"></span>${esc(labelB)}
    </span>
    <span class="legend-item">
      <span class="legend-swatch" style="background:hsl(200,65%,68%);opacity:0.8"></span>Tuottavuus vetää
    </span>
    <span class="legend-item">
      <span class="legend-swatch" style="background:hsl(5,65%,68%);opacity:0.8"></span>Työpanos vetää
    </span>
  `;
  container.appendChild(legend);

  function sampleSeries(series, step) {
    const entries = Object.entries(series);
    return step === 1 ? entries : entries.filter((_, i) => i % step === 0);
  }

  function render() {
    svgWrap.innerHTML = '';

    const dataA = sampleSeries(seriesA, step);
    const dataB = sampleSeries(seriesB, step);

    const years = dataA.map(d => d[0]);
    const A = dataA.map(d => +d[1]);
    const B = dataB.map(d => +d[1]);

    const w = 520, h = 260;
    const pad = { t: 28, r: 20, b: 44, l: 52 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const bottom = pad.t + innerH;

    const allVals = [...A, ...B];
    const yTicks = niceYTicks(Math.min(...allVals), Math.max(...allVals), 5);
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const yRange = yMax - yMin || 1;

    const sx = i => pad.l + i * (innerW / (years.length - 1 || 1));
    const sy = v => pad.t + innerH - ((v - yMin) / yRange) * innerH;

    const copper  = getCSSVar('--copper');
    const muted   = getCSSVar('--muted');
    const hairline= getCSSVar('--hairline');
    const ink     = getCSSVar('--ink');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgWrap.appendChild(svg);

    // Y-ruudukko
    yTicks.forEach(val => {
      const y = sy(val);
      svg.appendChild(svgEl('line', {
        x1: pad.l, y1: y, x2: pad.l + innerW, y2: y,
        stroke: hairline, 'stroke-width': 1, 'stroke-dasharray': '4 3'
      }));
      const t = svgEl('text', { x: pad.l - 5, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: muted });
      t.textContent = formatAxisVal(val);
      svg.appendChild(t);
    });

    // Akselit
    svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
    svg.appendChild(svgEl('line', { x1: pad.l, y1: bottom, x2: pad.l + innerW, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));

    // X-vuosimerkinnät
    const stride = Math.max(1, Math.ceil(years.length / 8));
    years.forEach((yr, i) => {
      if (i % stride !== 0 && i !== years.length - 1) return;
      const t = svgEl('text', { x: sx(i), y: bottom + 14, 'text-anchor': 'middle', 'font-size': 9, fill: muted });
      t.textContent = yr;
      svg.appendChild(t);
    });

    // Erotusalue värillä (A > B → sininen, B > A → punainen)
    for (let i = 0; i < A.length - 1; i++) {
      const fillColor = (A[i] + A[i+1]) > (B[i] + B[i+1])
        ? 'hsl(200,65%,62%)'
        : 'hsl(5,65%,62%)';
      svg.appendChild(svgEl('path', {
        d: `M ${sx(i)} ${sy(A[i])} L ${sx(i+1)} ${sy(A[i+1])} L ${sx(i+1)} ${sy(B[i+1])} L ${sx(i)} ${sy(B[i])} Z`,
        fill: fillColor, opacity: 0.22
      }));
    }

    // Nollaviiva
    if (yMin < 0 && yMax > 0) {
      svg.appendChild(svgEl('line', {
        x1: pad.l, y1: sy(0), x2: pad.l + innerW, y2: sy(0),
        stroke: muted, 'stroke-width': 1, 'stroke-dasharray': '6 3', opacity: 0.7
      }));
    }

    // Käyrät
    const ptsA = A.map((v, i) => ({ x: sx(i), y: sy(v) }));
    const ptsB = B.map((v, i) => ({ x: sx(i), y: sy(v) }));

    svg.appendChild(svgEl('path', {
      d: createSmoothPath(ptsA), fill: 'none',
      stroke: copper, 'stroke-width': 2.5, 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: createSmoothPath(ptsB), fill: 'none',
      stroke: 'hsl(200,55%,45%)', 'stroke-width': 2.5, 'stroke-linecap': 'round'
    }));
  }

  controls.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      step = parseInt(btn.dataset.step);
      render();
    };
  });

  render();
}

/**
 * Palauttaa HTML-merkkijonon yhdelle tai useammalle elink-moduulille.
 * Kaksi samassa kohdassa olevaa line-kaaviota yhdistetään
 * kasvuvertailukaavioksi (drawElinkGrowthChart).
 */

/**
 * Hajontakaavio (scatter): X = alijaama/ylijäämä, Y = velka.
 * Pisteet merkitty vuosiluvuilla, väri muuttuu ajan myötä.
 */
function drawElinkScatter(container, seriesX, seriesY, labelX, labelY) {

  let step = 1;

  const controls = document.createElement('div');
  controls.className = 'chart-toggle';
  controls.innerHTML = `
    <button data-step="1" class="active">1v</button>
    <button data-step="2">2v</button>
    <button data-step="5">5v</button>
  `;
  container.appendChild(controls);

  const svgWrap = document.createElement('div');
  container.appendChild(svgWrap);

  const legendDiv = document.createElement('div');
  legendDiv.className = 'chart-legend';
  legendDiv.innerHTML = `
    <span class="legend-item">
      <span class="legend-swatch" style="background:linear-gradient(90deg,hsl(200,55%,65%),var(--copper))"></span>
      Pisteet ajassa vanhemmasta (sininen) uudempaan (oranssi)
    </span>`;
  container.appendChild(legendDiv);

  function sampleSeries(series, step) {
    const entries = Object.entries(series);
    return step === 1 ? entries : entries.filter((_, i) => i % step === 0);
  }

  function render() {
    svgWrap.innerHTML = '';

    const sampX = sampleSeries(seriesX, step);
    const sampY = sampleSeries(seriesY, step);

    // Yhdistetään yhteisillä vuosilla
    const mapY = Object.fromEntries(sampY);
    const pts = sampX
      .filter(([yr]) => mapY[yr] !== undefined)
      .map(([yr, xv]) => ({ yr, x: +xv, y: +mapY[yr] }));

    if (!pts.length) return;

    const w = 520, h = 300;
    const pad = { t: 20, r: 20, b: 50, l: 56 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const bottom = pad.t + innerH;

    const allX = pts.map(p => p.x);
    const allY = pts.map(p => p.y);
    const xTicks = niceYTicks(Math.min(...allX), Math.max(...allX), 5);
    const yTicks = niceYTicks(Math.min(...allY), Math.max(...allY), 5);
    const xMin = xTicks[0], xMax = xTicks[xTicks.length - 1];
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];

    const sx = v => pad.l + (v - xMin) / (xMax - xMin) * innerW;
    const sy = v => bottom - (v - yMin) / (yMax - yMin) * innerH;

    const copper   = getCSSVar('--copper');
    const muted    = getCSSVar('--muted');
    const hairline = getCSSVar('--hairline');
    const ink      = getCSSVar('--ink');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgWrap.appendChild(svg);

    // Ruudukko
    xTicks.forEach(v => {
      const x = sx(v);
      svg.appendChild(svgEl('line', { x1: x, y1: pad.t, x2: x, y2: bottom,
        stroke: hairline, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
      const t = svgEl('text', { x, y: bottom + 14, 'text-anchor': 'middle', 'font-size': 9, fill: muted });
      t.textContent = formatAxisVal(v);
      svg.appendChild(t);
    });
    yTicks.forEach(v => {
      const y = sy(v);
      svg.appendChild(svgEl('line', { x1: pad.l, y1: y, x2: pad.l + innerW, y2: y,
        stroke: hairline, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
      const t = svgEl('text', { x: pad.l - 5, y: y + 3, 'text-anchor': 'end', 'font-size': 9, fill: muted });
      t.textContent = formatAxisVal(v);
      svg.appendChild(t);
    });

    // Akselit
    svg.appendChild(svgEl('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));
    svg.appendChild(svgEl('line', { x1: pad.l, y1: bottom, x2: pad.l + innerW, y2: bottom, stroke: ink, 'stroke-width': 1.5 }));

    // Nollaviiva x-akselilla jos negatiivisia arvoja
    if (xMin < 0 && xMax > 0) {
      const zx = sx(0);
      svg.appendChild(svgEl('line', { x1: zx, y1: pad.t, x2: zx, y2: bottom,
        stroke: muted, 'stroke-width': 1, 'stroke-dasharray': '6 3', opacity: 0.6 }));
    }

    // Akseliotsikot
    const xLabel = svgEl('text', { x: pad.l + innerW / 2, y: h - 4,
      'text-anchor': 'middle', 'font-size': 10, fill: muted });
    xLabel.textContent = labelX;
    svg.appendChild(xLabel);

    const yLabel = svgEl('text', {
      transform: `rotate(-90)`,
      x: -(pad.t + innerH / 2),
      y: 14,
      'text-anchor': 'middle', 'font-size': 10, fill: muted
    });
    yLabel.textContent = labelY;
    svg.appendChild(yLabel);

    // Pisteet – väri interpoloituu vanhin=sininen → uusin=copper
    const n = pts.length;
    pts.forEach((p, i) => {
      const t = n > 1 ? i / (n - 1) : 1;
      // Interpoloi hsl(200,55%,55%) → copper hsl(20,60%,42%)
      const hue  = Math.round(200 - t * 180);
      const sat  = Math.round(55  + t * 5);
      const lig  = Math.round(55  - t * 13);
      const color = `hsl(${hue},${sat}%,${lig}%)`;

      const cx = sx(p.x), cy = sy(p.y);

      svg.appendChild(svgEl('circle', { cx, cy, r: 4, fill: color, opacity: 0.85 }));

      // Vuosiluku vain joka N:nnes piste ruuhkan välttämiseksi
      const stride = Math.max(1, Math.ceil(n / 12));
      if (i % stride === 0 || i === n - 1) {
        const lbl = svgEl('text', { x: cx + 5, y: cy - 5,
          'font-size': 9, fill: muted });
        lbl.textContent = p.yr;
        svg.appendChild(lbl);
      }
    });
  }

  controls.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      step = parseInt(btn.dataset.step);
      render();
    };
  });

  render();
}


/**
 * Lämpökartta: N riviä (yksi per dataset), X-akseli = vuodet.
 * Väri interpoloituu kirjan teemaväreillä (kulta → kupari).
 */
function drawElinkHeatmap(container, datasets) {

  let step = 5;

  // Yhteinen vuosijoukko (ensimmäisen datasarjan avaimet)
  const allYears = Object.keys(datasets[0].series);

  const controls = document.createElement('div');
  controls.className = 'chart-toggle';
  controls.innerHTML = `
    <button data-step="2">2v</button>
    <button data-step="5" class="active">5v</button>
    <button data-step="10">10v</button>
  `;
  container.appendChild(controls);

  const svgWrap = document.createElement('div');
  svgWrap.style.overflowX = 'auto';
  container.appendChild(svgWrap);

  function sampleYears(arr, step) {
    return step === 1 ? arr : arr.filter((_, i) => i % step === 0);
  }

  function render() {
    svgWrap.innerHTML = '';

    const yrs  = sampleYears(allYears, step);
    const cell = 28;
    const labelW = 160;
    const topH   = 36;
    const rowH   = cell + 4;

    const W = labelW + yrs.length * cell;
    const H = topH + datasets.length * rowH + 8;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svgWrap.appendChild(svg);

    // Globaalit min/max kaikista riveistä
    const allVals = datasets.flatMap(ds => yrs.map(y => ds.series[y]).filter(v => v != null));
    const vMin = Math.min(...allVals);
    const vMax = Math.max(...allVals);

    // Väri: kulta (keltainen) → kupari (tumma oranssi) teeman mukaan
    const colorCell = v => {
      const t = vMax === vMin ? 0.5 : (v - vMin) / (vMax - vMin);
      // hsl(42,70%,78%) → hsl(20,60%,40%)
      const hue = Math.round(42 - t * 22);
      const sat = Math.round(70 - t * 10);
      const lig = Math.round(78 - t * 38);
      return `hsl(${hue},${sat}%,${lig}%)`;
    };

    const muted = getCSSVar('--muted');
    const ink   = getCSSVar('--ink');
    const bg    = getCSSVar('--bg-card');

    // Vuosiotsikot
    yrs.forEach((yr, i) => {
      const t = svgEl('text', {
        x: labelW + i * cell + cell / 2,
        y: topH - 6,
        'text-anchor': 'middle',
        'font-size': 9,
        fill: muted
      });
      t.textContent = yr;
      svg.appendChild(t);
    });

    // Rivit
    datasets.forEach((ds, r) => {
      const y0 = topH + r * rowH;

      // Rivioltsikko
      const lbl = svgEl('text', {
        x: labelW - 6,
        y: y0 + cell / 2 + 4,
        'text-anchor': 'end',
        'font-size': 10,
        fill: ink
      });
      lbl.textContent = ds.label;
      svg.appendChild(lbl);

      // Solut
      yrs.forEach((yr, c) => {
        const val = ds.series[yr];
        if (val == null) return;

        const rect = svgEl('rect', {
          x: labelW + c * cell + 2,
          y: y0 + 2,
          width:  cell - 4,
          height: cell - 4,
          rx: 5,
          fill: colorCell(val)
        });
        svg.appendChild(rect);
      });
    });
  }

  controls.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      step = parseInt(btn.dataset.step);
      render();
    };
  });

  render();
}

function renderElinkModules(modules) {
  if (!EDATA || !modules || !modules.length) return '';

  // ── Apufunktio: rakentaa toggle-blokki ──────────────────
  function makeElinkBlock(title, renderFn, iconType) {
    const bid    = 'elink_' + Math.random().toString(36).slice(2);
    const bodyId = bid + '_body';
    const btnId  = bid + '_btn';

    let rendered = false;

    requestAnimationFrame(() => {
      const btn  = document.getElementById(btnId);
      const body = document.getElementById(bodyId);
      if (!btn || !body) return;

      btn.onclick = () => {
        const isOpen = body.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
        if (isOpen && !rendered) {
          renderFn(body);
          rendered = true;
        }
      };
    });

    // Ikoni kaaviotyypin mukaan
    const icons = {
      line:    `<svg viewBox="0 0 24 24"><path d="M3 17 L9 11 L13 15 L21 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      scatter: `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="7" width="3" height="11" rx="1"/><rect x="18" y="4" width="3" height="14" rx="1"/></svg>`,
      heatmap: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    };
    const icon = icons[iconType] || icons.line;

    return `
      <div class="elink-block">
        <div class="elink-header">
          <span class="elink-title">${esc(title)}</span>
          <button class="elink-btn" id="${btnId}" aria-expanded="false" title="Näytä / piilota kaavio">
            ${icon}
          </button>
        </div>
        <div class="elink-body" id="${bodyId}"></div>
      </div>`;
  }

  // N heatmap-kaaviota → lämpökartta
  if (modules.every(m => m.chartType === 'heatmap')) {
    const datasets = modules
      .map(m => EDATA[m.dataset])
      .filter(Boolean)
      .map(ds => ({ label: ds.description || ds.title || ds.id, series: ds.series }));
    if (!datasets.length) return '';
    const title = EDATA[modules[0].dataset]?.group || 'Tulot';
    return makeElinkBlock(title, (container) => {
      drawElinkHeatmap(container, datasets);
    }, 'heatmap');
  }

  // Kaksi scatter-kaaviota → hajontakaavio
  if (
    modules.length === 2 &&
    modules.some(m => m.chartType === 'scatter')
  ) {
    const mX = modules.find(m => m.role === 'x') || modules[0];
    const mY = modules.find(m => m.role === 'y') || modules[1];
    const dsX = EDATA[mX.dataset];
    const dsY = EDATA[mY.dataset];
    if (!dsX || !dsY) return '';

    const title = dsX.group || dsX.title || mX.dataset;
    return makeElinkBlock(title, (container) => {
      drawElinkScatter(
        container,
        dsX.series, dsY.series,
        dsX.title || mX.dataset,
        dsY.title || mY.dataset
      );
    }, 'scatter');
  }

  // Kaksi viivakaaviota → vertailukaavio
  if (
    modules.length === 2 &&
    modules.every(m => m.type === 'chart' && m.chartType === 'line')
  ) {
    const dsA = EDATA[modules[0].dataset];
    const dsB = EDATA[modules[1].dataset];
    if (!dsA || !dsB) return '';

    const title = dsA.group || dsA.title || modules[0].dataset;
    return makeElinkBlock(title, (container) => {
      drawElinkGrowthChart(
        container,
        dsA.series, dsB.series,
        dsA.title || modules[0].dataset,
        dsB.title || modules[1].dataset
      );
    }, 'line');
  }

  // Yksi viiva- tai aluekaavio
  if (modules.length === 1 && modules[0].type === 'chart') {
    const m  = modules[0];
    const ds = EDATA[m.dataset];
    if (!ds) return '';

    const mode = m.chartType === 'line' ? 'line' : m.chartType === 'area' ? 'area' : 'bar';
    return makeElinkBlock(ds.title || m.dataset, (container) => {
      const data = Object.entries(ds.series).map(([label, value]) => ({ label, value: +value }));
      const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);
      (chartRenderers[mode] ?? chartRenderers.line)(svg, data);
    }, 'line');
  }

  return '';
}
