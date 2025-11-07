/*
  SEA Happiness · 2025 (p5.js)
  - Mobile (<700px): donut centered at top, metric pill under it, FULL-WIDTH horizontal bars BELOW the donut
  - Desktop: donut left, vertical bars right; wrapped toolbar with gutter label
  - Opaque modal; modal handles clicks/taps before toolbar/pill
  - Single setup() + responsive reflow
*/

// ---------- Data ----------
let SEA_DATA = [
  { country: "Myanmar",     score: 4.360, gdp: 0.710, support: 1.181, health: 0.555, freedom: 0.525, generosity: 0.566, corruption: 0.172 },
  { country: "Cambodia",    score: 4.476, gdp: 0.603, support: 1.184, health: 0.633, freedom: 0.605, generosity: 0.287, corruption: 0.046 },
  { country: "Vietnam",     score: 5.175, gdp: 0.748, support: 1.419, health: 0.871, freedom: 0.505, generosity: 0.165, corruption: 0.076 },
  { country: "Indonesia",   score: 5.196, gdp: 0.940, support: 1.159, health: 0.637, freedom: 0.513, generosity: 0.297, corruption: 0.038 },
  { country: "Laos",        score: 5.203, gdp: 0.528, support: 1.042, health: 0.449, freedom: 0.449, generosity: 0.228, corruption: 0.183 },
  { country: "Philippines", score: 5.631, gdp: 0.812, support: 1.209, health: 0.614, freedom: 0.662, generosity: 0.300, corruption: 0.120 },
  { country: "Thailand",    score: 6.008, gdp: 1.050, support: 1.408, health: 0.760, freedom: 0.520, generosity: 0.357, corruption: 0.055 },
  { country: "Malaysia",    score: 6.088, gdp: 1.156, support: 1.258, health: 0.766, freedom: 0.407, generosity: 0.291, corruption: 0.041 },
  { country: "Singapore",   score: 6.262, gdp: 1.574, support: 1.306, health: 1.141, freedom: 0.549, generosity: 0.271, corruption: 0.464 }
];

// ---------- Palette ----------
const SODARO = { accent:[6,182,255], dark:[26,30,38] };
const colors = {
  barBase: 48,
  accent:  SODARO.accent,
  textPrimary:   [245,245,245],
  textSecondary: [205,213,224],
  textMuted:     [165,174,188]
};
const BLUES_HEX = ["#0CAFFF","#1E92E0","#36A8FF","#2B8BD1","#56B7FF","#2F7FBF","#4AB6FF","#2B7AB5","#88D5FF"];

// ---------- Flags ----------
const FLAG = {"Myanmar":"🇲🇲","Cambodia":"🇰🇭","Vietnam":"🇻🇳","Indonesia":"🇮🇩","Laos":"🇱🇦","Philippines":"🇵🇭","Thailand":"🇹🇭","Malaysia":"🇲🇾","Singapore":"🇸🇬"};

// ---------- Metrics ----------
const METRICS = [
  { key: "score",      label: "Score",          explain: d => nf(d.score,1,3) },
  { key: "gdp",        label: "GDP",            explain: d => nf(d.gdp,1,3) },
  { key: "support",    label: "Support",        explain: d => nf(d.support,1,3) },
  { key: "health",     label: "Health",         explain: d => nf(d.health,1,3) },
  { key: "freedom",    label: "Freedom",        explain: d => nf(d.freedom,1,3) },
  { key: "generosity", label: "Generosity",     explain: d => nf(d.generosity,1,3) },
  { key: "antiCorr",   label: "Anti-Corruption",explain: d => nf(1 - d.corruption,1,3) }
];
let currentMetric = "score";
let metricButtons = [];     // desktop chips
let metricLabelGutter = 0;

// ---------- Layout/State ----------
let bgImg, logoImg;
let isMobile = false;

// desktop bars layout
const chart = { baselineY: 0, barW: 56, spacing: 86, startX: 0, leftMargin: 520 };

// donut (always left/top area)
const donut = { cx: 260, cy: 320, r: 160, ir: 98 };

// MOBILE bars panel (now BELOW the donut, full width)
const rightPanel = { x: 0, y: 0, w: 0, h: 0, rowH: 20, gap: 8, pad: 10 };

let barStates = [];
let selectedIndex = -1;
let hoverBarIndex = -1;
let hoverDonutIndex = -1;
let startTime = 0;
const ENTER_STAGGER = 70, ENTER_DUR = 700;

// Modal animation
let detailAlpha = 0;
let detailScale = 0.96;
let detailOpenMs = 0;
const DETAIL_FADE_SPEED = 0.2;
const DETAIL_POP_DURATION = 260;

// Modal geometry
const cardRect = { x:0,y:0,w:720,h:340 };
let closeBtn = { x:0,y:0,w:28,h:28 };

// Mobile metric pill hit areas
let pillBounds = { x:0, y:0, w:0, h:0 };
let pillPrev  = { x:0, y:0, r:0 };
let pillNext  = { x:0, y:0, r:0 };

// ---------- Preload ----------
function preload(){
  bgImg = loadImage("image_b701a4.jpg", ()=>{}, ()=>{ bgImg = null; });
  logoImg = loadImage("sodaro_logo.png", ()=>{}, ()=>{ logoImg = null; });
}

// ---------- Setup / Resize ----------
function setup(){
  const hDesk = min(windowHeight * 0.8, 820);
  const hMob  = max(560, windowHeight * 0.98); // use more of the screen on phones
  const c = createCanvas(windowWidth * 0.98, (windowWidth < 700) ? hMob : hDesk);
  c.parent('stage') || c.parent(document.body);
  textFont("system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");

  reflow();
  initBars();
  buildMetricButtons();
  startTime = millis(); frameRate(60);
}

function windowResized(){
  const hDesk = min(windowHeight * 0.8, 820);
  const hMob  = max(560, windowHeight * 0.98);
  resizeCanvas(windowWidth * 0.98, (windowWidth < 700) ? hMob : hDesk);
  reflow();
  buildMetricButtons();
}

function reflow(){
  isMobile = (width < 700);

  if (isMobile){
    // --- Mobile layout: donut at top (full-left), pill below, bars full-width UNDER donut ---
    const padX = 12;
    const topY = 78; // leave space for title/subtitle

    // Donut sizing — keep it a bit smaller to guarantee room for bars
    donut.r  = min(150, width * 0.34, height * 0.28);
    donut.ir = donut.r * 0.62;
    donut.cx = width * 0.36;                        // slight left bias so center looks nice with full-width bars
    donut.cy = min(topY + donut.r + 6, height * 0.38);

    // Place metric pill just under donut
    layoutMetricPill(); // sets pillBounds based on donut

    // Bars panel spans full width under pill
    rightPanel.x   = padX;
    rightPanel.w   = width - padX*2;
    rightPanel.y   = pillBounds.y + pillBounds.h + 12;            // under pill
    rightPanel.h   = max(120, height - rightPanel.y - 16);        // ensure visible
    rightPanel.rowH= 18;
    rightPanel.gap = 7;
    rightPanel.pad = 10;

    chart.leftMargin = 0; // desktop not used
  } else {
    // --- Desktop classic: donut left, bars right ---
    chart.leftMargin = min(520, max(380, width * 0.36));
    const rightW = width - chart.leftMargin - 36;
    const N = SEA_DATA.length, pad = 40;
    const spacing = (rightW - pad*2) / N;
    chart.spacing = constrain(spacing, 60, 110);
    chart.barW = min(56, spacing * 0.60);
    const total = N * chart.spacing;
    chart.startX = chart.leftMargin + pad + chart.spacing/2 + (rightW - pad*2 - total)/2;
    chart.baselineY = height - 120;

    donut.cx = chart.leftMargin * 0.5;
    donut.cy = min(320, height * 0.48);
    donut.r = min(180, chart.leftMargin * 0.42);
    donut.ir = donut.r * 0.61;

    // Pill not used on desktop, but compute to keep code tidy
    layoutMetricPill();
  }
}

function initBars(){
  barStates = [];
  for (let i=0;i<SEA_DATA.length;i++){
    const baseH = valueToBarHeight(getMetricValue(SEA_DATA[i], currentMetric));
    const x = chart.startX + i*chart.spacing;
    barStates[i] = { x, tx:x, h:0, th:baseH, delay:i*ENTER_STAGGER, alphaMul:0 };
  }
}

// ---------- Draw ----------
function draw(){
  drawBackgroundCover();

  // Title / subtitle
  noStroke(); fill(...colors.textPrimary); textAlign(LEFT,TOP);
  textSize(isMobile ? 18 : 20); textStyle(BOLD);
  text("Southeast Asia — Happiness (2019)", 16, 16);
  textSize(isMobile ? 11 : 12); textStyle(NORMAL); fill(...colors.textSecondary);
  text(isMobile ? "Tap slices/bars • Use ◀ ▶ or pill to change metric"
                : "Hover bars or slices • Click to open Score Detail • Use toolbar to change metric",
      16, isMobile ? 40 : 44);

  // Hovers
  hoverDonutIndex = donutHitIndex(mouseX, mouseY);
  hoverBarIndex = isMobile ? barHitIndexMobile(mouseX, mouseY)
                           : barHitIndex(mouseX, mouseY);

  const visualHoverIndex = (hoverBarIndex >= 0) ? hoverBarIndex :
                           (selectedIndex < 0 ? hoverDonutIndex : -1);

  // Donut first (top)
  drawDonutSynced(visualHoverIndex);

  // Bars: mobile (below donut) or desktop (right)
  if (isMobile) drawBarsMobileHorizontal(visualHoverIndex);
  else          drawBarsDesktop(visualHoverIndex);

  // Logo (desktop only)
  drawLogoTopRight();

  // Metric UI
  if (isMobile) drawMetricPill(); else drawMetricToolbar();

  // Desktop hint
  if (!isMobile && selectedIndex < 0) drawClickHint();

  // Modal animation
  const targetAlpha = (selectedIndex >= 0) ? 1 : 0;
  detailAlpha = lerp(detailAlpha, targetAlpha, DETAIL_FADE_SPEED);
  const popElapsed = max(0, millis() - detailOpenMs);
  const popT = constrain(popElapsed / DETAIL_POP_DURATION, 0, 1);
  const popEase = 1 - pow(1 - popT, 3);
  const targetScale = (selectedIndex >= 0) ? 1.0 : 0.96;
  detailScale = lerp(0.96, targetScale, popEase);
  if(detailAlpha > 0.01) drawScoreDetailCentered(selectedIndex, detailAlpha, detailScale);
}

// ---------- Background ----------
function drawBackgroundCover(){
  if (!bgImg) { background(12); return; }
  const imgAR = bgImg.width / bgImg.height;
  const canAR = width / height;
  let w,h,x,y;
  if (canAR > imgAR){ w = width; h = width / imgAR; x = 0; y = (height - h)/2; }
  else { h = height; w = height * imgAR; x = (width - w)/2; y = 0; }
  image(bgImg, x, y, w, h);

  noStroke(); fill(0,0,0,110); rect(0,0,width,height);
  noFill(); stroke(255,200,120,22); strokeWeight(2);
  rect(8,8,width-16,height-16,16);
}

// ---------- Metric funcs ----------
function getMetricValue(d, metric){
  switch(metric){
    case "score": return d.score;
    case "gdp": return d.gdp;
    case "support": return d.support;
    case "health": return d.health;
    case "freedom": return d.freedom;
    case "generosity": return d.generosity;
    case "antiCorr": return 1 - d.corruption;
    default: return d.score;
  }
}

function metricDomain(metric){
  switch(metric){
    case "score":      return { min: 4.3,  max: 6.4 };
    case "gdp":        return { min: 0.50, max: 1.60 };
    case "support":    return { min: 1.00, max: 1.45 };
    case "health":     return { min: 0.44, max: 1.20 };
    case "freedom":    return { min: 0.40, max: 0.70 };
    case "generosity": return { min: 0.16, max: 0.57 };
    case "antiCorr":   return { min: 0.50, max: 0.97 };
    default:           return { min: 0,    max: 1 };
  }
}

function valueToBarHeight(val){
  const dom = metricDomain(currentMetric);
  const minH = 80;
  const maxH = isMobile ? (height * 0.36) : 520;
  return map(val, dom.min, dom.max, minH, maxH, true);
}

function metricIndex(){ return METRICS.findIndex(m=>m.key===currentMetric); }
function nextMetric(){ const i=metricIndex(); currentMetric = METRICS[(i+1)%METRICS.length].key; }
function prevMetric(){ const i=metricIndex(); currentMetric = METRICS[(i-1+METRICS.length)%METRICS.length].key; }
function metricLabel(key){ const found = METRICS.find(m => m.key === key); return found ? found.label : "Score"; }
function metricExplain(d, key){ const found = METRICS.find(m => m.key === key); return found ? found.explain(d) : nf(d.score,1,3); }

// ---------- Bars: Desktop vertical ----------
function drawBarsDesktop(visualHoverIndex){
  const t = millis() - startTime; textAlign(CENTER,BOTTOM);

  for (let i=0;i<SEA_DATA.length;i++){
    const d = SEA_DATA[i], s = barStates[i];
    const local = max(0, t - s.delay), prog = constrain(local/ENTER_DUR, 0, 1);
    const ease = 1 - pow(1 - prog, 3);
    s.alphaMul = ease; s.x = lerp(s.x, s.tx, 0.14);

    const baseH = valueToBarHeight(getMetricValue(d, currentMetric));
    const isSel = i===selectedIndex, isHov = i===visualHoverIndex;
    const growth = isSel ? 72 : (isHov ? 38 : 0);
    const th = baseH*ease + growth;
    s.h = lerp(s.h, th, 0.17);

    let alpha = 220;
    if (selectedIndex>=0) alpha = isSel ? 255 : 70;
    else if (visualHoverIndex>=0) alpha = (isHov ? 255 : 110);
    alpha *= s.alphaMul;

    const barX = s.x - chart.barW/2, barY = chart.baselineY - s.h;

    if (isSel || isHov){ noStroke(); fill(colors.accent[0], colors.accent[1], colors.accent[2], alpha); }
    else { stroke(70, alpha); fill(colors.barBase, alpha); }
    rect(barX, barY, chart.barW, s.h, 6);

    noStroke();
    fill(...(isSel || isHov ? colors.textPrimary : colors.textSecondary));
    textSize(12); text(d.country, s.x, barY - 10);
  }
}

// ---------- Bars: Mobile horizontal (BELOW donut, full width) ----------
function drawBarsMobileHorizontal(visualHoverIndex){
  // panel box backdrop
  noStroke(); fill(0, 90);
  rect(rightPanel.x - 2, rightPanel.y - 6, rightPanel.w + 4, rightPanel.h + 12, 10);

  // compute row geometry
  const rows = SEA_DATA.length;
  const totalH = rows * rightPanel.rowH + (rows - 1) * rightPanel.gap;
  // center rows within panel height (so even if panel is short, you see multiple rows)
  const topStart = rightPanel.y + max(0, (rightPanel.h - totalH)/2);

  // metric domain for bar length mapping
  const dom = metricDomain(currentMetric);
  const innerPad = rightPanel.pad;
  const barMaxW = rightPanel.w - innerPad*2 - 50; // space for label/value

  textAlign(LEFT, CENTER);
  for (let i=0; i<rows; i++){
    const d = SEA_DATA[i];
    const rowY = topStart + i * (rightPanel.rowH + rightPanel.gap);

    // if row would be below panel, stop early (saves drawing on very short screens)
    if (rowY > rightPanel.y + rightPanel.h + 30) break;

    // hit bounds for bar row
    const rowX = rightPanel.x;
    const rowW = rightPanel.w;
    const rowH = rightPanel.rowH;

    // row background (hover/selected)
    const isSel = (i === selectedIndex);
    const isHov = (i === visualHoverIndex);
    const bgAlpha = isSel ? 120 : (isHov ? 80 : 40);
    noStroke(); fill(20,24,30, bgAlpha);
    rect(rowX+3, rowY- rowH/2 + 2, rowW-6, rowH, 6);

    // label
    fill(...(isSel || isHov ? colors.textPrimary : colors.textSecondary));
    textSize(11);
    text(d.country, rowX + innerPad, rowY);

    // horizontal bar
    const val = getMetricValue(d, currentMetric);
    const wBar = map(val, dom.min, dom.max, 0, barMaxW, true);
    const bx = rowX + innerPad + 78; // after label
    const by = rowY - 6;
    noStroke();
    fill(26,28,34, 180); rect(bx, by, barMaxW, 12, 6);
    if (isSel || isHov) fill(colors.accent[0], colors.accent[1], colors.accent[2], 235);
    else fill(120, 170);
    rect(bx, by, wBar, 12, 6);

    // value
    textAlign(RIGHT, CENTER);
    fill(...colors.textMuted);
    textSize(10.5);
    const valStr = metricExplain(d, currentMetric);
    text(valStr, rowX + rightPanel.w - innerPad, rowY);

    textAlign(LEFT, CENTER); // reset
  }
}

// ---------- Donut ----------
function drawDonutSynced(visualHoverIndex){
  const values = SEA_DATA.map(d => max(0.0001, getMetricValue(d, currentMetric)));
  const total  = values.reduce((a,b)=>a+b, 0);

  const donutHover = donutHitIndex(mouseX, mouseY);
  const activeFromHover = (visualHoverIndex >= 0) ? visualHoverIndex : donutHover;
  const activeIdx = (selectedIndex >= 0) ? selectedIndex : activeFromHover;

  noStroke(); fill(0, 90);
  ellipse(donut.cx + 2, donut.cy + 5, donut.r*2.06, donut.r*2.06);

  let cur = -HALF_PI;
  for (let i=0;i<SEA_DATA.length;i++){
    const a = (values[i]/total)*TWO_PI;

    let col = color(BLUES_HEX[i % BLUES_HEX.length]);
    let alpha = (activeIdx >= 0 && i !== activeIdx) ? 110 : 225;
    let expand = 0;

    if (i === activeIdx){ col = color(SODARO.accent[0], SODARO.accent[1], SODARO.accent[2]); alpha = 255; expand = (selectedIndex >= 0) ? 10 : 7; }

    noStroke(); col.setAlpha(alpha); fill(col);
    ringSlice(donut.cx, donut.cy, donut.r + expand, donut.ir, cur, cur + a);

    cur += a;
  }

  noStroke(); fill(0,165); ellipse(donut.cx, donut.cy, donut.ir*1.46, donut.ir*1.46);
  const labelIdx = (selectedIndex>=0) ? selectedIndex : activeIdx;
  const title = (labelIdx>=0) ? SEA_DATA[labelIdx].country : metricLabel(currentMetric).toUpperCase();
  const sub   = (labelIdx>=0)
    ? `${metricLabel(currentMetric)}: ${metricExplain(SEA_DATA[labelIdx], currentMetric)}`
    : "distribution";
  fill(...colors.textPrimary); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(isMobile ? 12 : 14);
  text(title, donut.cx, donut.cy-8);
  textStyle(NORMAL); fill(...colors.textSecondary); textSize(isMobile ? 10.5 : 12);
  text(sub, donut.cx, donut.cy+12);
}

function ringSlice(cx,cy,or,ir,a,b){
  beginShape();
  const step = radians(4);
  for (let ang=a; ang<=b; ang+=step) vertex(cx+cos(ang)*or, cy+sin(ang)*or);
  vertex(cx+cos(b)*or, cy+sin(b)*or);
  for (let ang=b; ang>=a; ang-=step) vertex(cx+cos(ang)*ir, cy+sin(ang)*ir);
  vertex(cx+cos(a)*ir, cy+sin(a)*ir);
  endShape(CLOSE);
}

// ---------- Desktop toolbar ----------
function buildMetricButtons(){
  metricButtons.length = 0;
  if (isMobile) return;

  const barX = chart.leftMargin + 10;
  const barW = width - chart.leftMargin - 36 - 20;
  const barY = height - 78;
  const barH = 56;

  textSize(12);
  const label = "Metric";
  const labelW = textWidth(label) + 16;
  metricLabelGutter = max(72, labelW + 12);

  const startX = barX + metricLabelGutter + 14;
  const y = barY + (barH - 28)/2;

  let x = startX;
  for (let i=0; i<METRICS.length; i++){
    const txt = METRICS[i].label;
    const w = textWidth(txt) + 24;
    const h = 28;
    if (x + w > barX + barW - 12){
      x = startX;
    }
    metricButtons.push({ key: METRICS[i].key, label: txt, x, y, w, h });
    x += w + 8;
  }
}

function drawMetricToolbar(){
  if (isMobile) return;

  const barX = chart.leftMargin + 10;
  const barW = width - chart.leftMargin - 36 - 20;
  const barY = height - 78;
  const barH = 56;

  noStroke(); fill(14,18,26, 200); rect(barX, barY, barW, barH, 10);
  stroke(255,255,255, 30); noFill(); rect(barX, barY, barW, barH, 10);

  const labelX = barX + 14;
  const labelY = barY + barH/2;
  noStroke(); fill(...colors.textMuted); textAlign(LEFT,CENTER); textSize(12);
  text("Metric", labelX, labelY);

  stroke(255,255,255,24);
  const divX = barX + metricLabelGutter;
  line(divX, barY + 10, divX, barY + barH - 10);

  for (const b of metricButtons){
    const active = (b.key === currentMetric);
    const hov = mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h;

    if (active){
      noStroke(); fill(34,36,42); rect(b.x, b.y, b.w, b.h, 8);
      stroke(SODARO.accent[0], SODARO.accent[1], SODARO.accent[2], 180); noFill();
      rect(b.x, b.y, b.w, b.h, 8);
      noStroke(); fill(240);
    } else if (hov){
      noStroke(); fill(30,34,44); rect(b.x, b.y, b.w, b.h, 8);
      fill(225);
    } else {
      noStroke(); fill(26,28,34); rect(b.x, b.y, b.w, b.h, 8);
      fill(200);
    }
    textAlign(CENTER,CENTER); textSize(12);
    text(b.label, b.x + b.w/2, b.y + b.h/2 + 0.5);
  }
}

// ---------- Mobile metric pill ----------
function layoutMetricPill(){
  if (!isMobile){
    pillBounds = {x:0,y:0,w:0,h:0};
    pillPrev = {x:0,y:0,r:0}; pillNext = {x:0,y:0,r:0};
    return;
  }
  const w = min(280, width * 0.7);
  const h = 32;
  const x = donut.cx - w/2;
  const y = donut.cy + donut.r + 12; // tucked tight to save space
  pillBounds = { x, y, w, h };
  pillPrev  = { x: x - 18,   y: y + h/2, r: 12 };     // left button
  pillNext  = { x: x + w + 18, y: y + h/2, r: 12 };   // right button
}

function drawMetricPill(){
  layoutMetricPill(); // ensure aligned if donut moved due to resize

  // pill
  noStroke(); fill(34,36,42, 230); rect(pillBounds.x, pillBounds.y, pillBounds.w, pillBounds.h, 999);
  stroke(SODARO.accent[0], SODARO.accent[1], SODARO.accent[2], 160); noFill();
  rect(pillBounds.x, pillBounds.y, pillBounds.w, pillBounds.h, 999);

  // label
  noStroke(); fill(...colors.textPrimary);
  textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD);
  text(`${metricLabel(currentMetric)}`, pillBounds.x + pillBounds.w/2, pillBounds.y + pillBounds.h/2 + 0.5);

  // arrow buttons
  noStroke(); fill(34,36,42, 230);
  circle(pillPrev.x, pillPrev.y, pillPrev.r*2);
  circle(pillNext.x, pillNext.y, pillNext.r*2);

  // '<' on left, '>' on right
  stroke(255,255,255, 200); strokeWeight(1.6);
  line(pillPrev.x + 3, pillPrev.y - 4, pillPrev.x - 3, pillPrev.y);
  line(pillPrev.x + 3, pillPrev.y + 4, pillPrev.x - 3, pillPrev.y);
  line(pillNext.x - 3, pillNext.y - 4, pillNext.x + 3, pillNext.y);
  line(pillNext.x - 3, pillNext.y + 4, pillNext.x + 3, pillNext.y);
}

// ---------- Modal (CENTERED, responsive) ----------
function drawScoreDetailCentered(idx, alpha, scaleAmt){
  if (idx < 0) return;
  const d = SEA_DATA[idx];

  // Opaque backdrop
  noStroke(); fill(0, 255 * alpha); rect(0,0,width,height);

  // Responsive card size
  cardRect.w = isMobile ? min(380, width - 32) : min(740, width - 64);
  cardRect.h = isMobile ? 360 : 340;

  const cx = width/2, cy = height/2;
  cardRect.x = cx - cardRect.w/2;
  cardRect.y = cy - cardRect.h/2;

  push();
  translate(cx, cy);
  scale(scaleAmt);
  translate(-cardRect.w/2, -cardRect.h/2);

  noStroke(); fill(14,18,26, 255 * alpha); rect(0,0,cardRect.w,cardRect.h,16);
  stroke(255,255,255, 36 * alpha); noFill(); rect(0,0,cardRect.w,cardRect.h,16);

  // Close button
  closeBtn.x = cardRect.w - 36; closeBtn.y = 12; closeBtn.w = 24; closeBtn.h = 24;
  noStroke(); fill(34,36,42, 255*alpha); rect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 6);
  stroke(255,255,255, 200*alpha); strokeWeight(1.5);
  line(closeBtn.x+7,  closeBtn.y+7,  closeBtn.x+17, closeBtn.y+17);
  line(closeBtn.x+17, closeBtn.y+7,  closeBtn.x+7,  closeBtn.y+17);

  // Title
  const flag = FLAG[d.country] || "🏳️";
  const title = `${flag}  ${d.country}`;
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  fill(...colors.textPrimary, 255*alpha);
  textSize(isMobile ? 20 : 22);
  text(title, cardRect.w/2, 18);

  // metric badge
  const badgeW = isMobile ? cardRect.w - 48 : 220;
  const badgeX = (cardRect.w - badgeW)/2;
  drawScoreBadge(badgeX, isMobile ? 48 : 52, badgeW, 30, `${metricLabel(currentMetric)}: ${metricExplain(d, currentMetric)}`, alpha);

  // content
  textStyle(NORMAL); fill(...colors.textSecondary, 255*alpha);

  if (isMobile){
    textSize(12);
    textAlign(LEFT, TOP);
    const leftX = 18, leftY = 90, leftW = cardRect.w - 36;
    text(explainWhyHappy(d), leftX, leftY, leftW, 72);

    const baseY = leftY + 90;
    drawKV(leftX, baseY +   0, "GDP per capita",  nf(d.gdp,1,3), alpha);
    drawKV(leftX, baseY +  24, "Social support",   nf(d.support,1,3), alpha);
    drawKV(leftX, baseY +  48, "Healthy life",     nf(d.health,1,3), alpha);
    drawKV(leftX, baseY +  72, "Freedom",          nf(d.freedom,1,3), alpha);
    drawKV(leftX, baseY +  96, "Generosity",       nf(d.generosity,1,3), alpha);
    drawKV(leftX, baseY + 120, "Anti-corruption",  nf(1 - d.corruption,1,3), alpha);
  } else {
    textSize(13);
    textAlign(LEFT, TOP);
    const leftX = 24, leftY = 96, leftW = cardRect.w/2 - 36;
    text(explainWhyHappy(d), leftX, leftY, leftW, 90);

    const rx = cardRect.w/2 + 12, ry = 96;
    drawKV(rx, ry +   0, "GDP per capita",  nf(d.gdp,1,3), alpha);
    drawKV(rx, ry +  28, "Social support",   nf(d.support,1,3), alpha);
    drawKV(rx, ry +  56, "Healthy life",     nf(d.health,1,3), alpha);
    drawKV(rx, ry +  84, "Freedom",          nf(d.freedom,1,3), alpha);
    drawKV(rx, ry + 112, "Generosity",       nf(d.generosity,1,3), alpha);
    drawKV(rx, ry + 140, "Anti-corruption",  nf(1 - d.corruption,1,3), alpha);
  }

  // hint
  textAlign(RIGHT,BOTTOM); textSize(11); fill(...colors.textMuted, 220*alpha);
  text(isMobile ? "Tap outside, press ESC, or × to close" : "Click background, press ESC, or × to close",
       cardRect.w - 16, cardRect.h - 12);

  pop();
}

function drawKV(x,y,label,value,alpha){
  textAlign(LEFT,CENTER); textStyle(NORMAL); textSize(12);
  fill(225,225,225, 255*alpha);
  text(label, x, y);
  const padR = 120;
  const dotsStart = x + textWidth(label) + 8;
  const dotsEnd = x + padR + (isMobile ? 140 : 200);
  stroke(255,255,255, 60*alpha); strokeWeight(1);
  for (let xx = dotsStart; xx < dotsEnd; xx += 4) line(xx, y, min(xx+2, dotsEnd), y);
  noStroke();
  textAlign(RIGHT,CENTER); textStyle(BOLD);
  fill(...colors.textPrimary, 255*alpha);
  text(value, dotsEnd, y);
}

function drawScoreBadge(x,y,w,h,textVal,alpha){
  noStroke(); fill(34,36,42, 230*alpha); rect(x,y,w,h,999);
  stroke(SODARO.accent[0], SODARO.accent[1], SODARO.accent[2], 180*alpha); noFill(); rect(x,y,w,h,999);
  fill(...colors.textPrimary, 255*alpha); textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD);
  text(textVal, x+w/2, y+h/2+1);
}

// ---------- Logo ----------
function drawLogoTopRight(){
  if (!logoImg || isMobile) return;
  const pad = 14;
  const size = 48;
  noStroke(); fill(14,18,26, 180);
  rect(width - size - pad - 8, pad, size + 8, size + 8, 10);
  stroke(255,255,255, 26); noFill();
  rect(width - size - pad - 8, pad, size + 8, size + 8, 10);
  image(logoImg, width - size - pad - 4, pad + 4, size, size);
}

// ---------- Hint (desktop only) ----------
function drawClickHint() {
  const txt = "Click a bar or donut slice to open details • Use toolbar to change metric";
  textSize(12);
  const tw = textWidth(txt) + 24;
  const w = constrain(tw, 320, 620);
  const h = 28;
  const radius = 10;
  const x = width - w - 24;
  const y = height - h - 90;

  noStroke(); fill(14, 18, 26, 220); rect(x, y, w, h, radius);
  fill(...colors.textSecondary);
  textAlign(CENTER, CENTER);
  text(txt, x + w / 2, y + h / 2 + 0.5);
}

// ---------- Explain ----------
function explainWhyHappy(d){
  const positives = [
    {k:"gdp", v:d.gdp, label:"GDP per capita"},
    {k:"support", v:d.support, label:"social support"},
    {k:"health", v:d.health, label:"healthy life expectancy"},
    {k:"freedom", v:d.freedom, label:"freedom to choose"},
    {k:"generosity", v:d.generosity, label:"generosity"}
  ].sort((a,b)=>b.v-a.v);
  const a = positives[0].label, b = positives[1].label;
  const corr = d.corruption <= 0.08 ? "with low perceived corruption" :
               d.corruption <= 0.15 ? "with moderate corruption concerns" : "despite higher perceived corruption";
  return `Strong ${a} and solid ${b} ${corr} help drive the overall score.`;
}

// ---------- Interactions ----------
function mousePressed(){
  // Modal first
  if (detailAlpha > 0.9 && selectedIndex >= 0){
    const insideCard =
      mouseX >= cardRect.x && mouseX <= cardRect.x + cardRect.w &&
      mouseY >= cardRect.y && mouseY <= cardRect.y + cardRect.h;

    // Close button
    const mx = mouseX - cardRect.x, my = mouseY - cardRect.y;
    if (mx > closeBtn.x && mx < closeBtn.x + closeBtn.w &&
        my > closeBtn.y && my < closeBtn.y + closeBtn.h){
      selectedIndex = -1; return;
    }
    if (!insideCard){ selectedIndex = -1; }
    return;
  }

  // Mobile metric pill taps
  if (isMobile){
    // arrows
    if (dist(mouseX, mouseY, pillPrev.x, pillPrev.y) <= pillPrev.r){ prevMetric(); selectedIndex = -1; return; }
    if (dist(mouseX, mouseY, pillNext.x, pillNext.y) <= pillNext.r){ nextMetric(); selectedIndex = -1; return; }
    // tap pill to advance
    if (mouseX>=pillBounds.x && mouseX<=pillBounds.x+pillBounds.w &&
        mouseY>=pillBounds.y && mouseY<=pillBounds.y+pillBounds.h){
      nextMetric(); selectedIndex = -1; return;
    }
  } else {
    // Desktop toolbar chips
    for (const b of metricButtons){
      if (mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h){
        if (currentMetric !== b.key){
          currentMetric = b.key;
          for (let i=0;i<SEA_DATA.length;i++){
            const d = SEA_DATA[i], s = barStates[i];
            s.th = valueToBarHeight(getMetricValue(d, currentMetric));
          }
          selectedIndex = -1;
        }
        return;
      }
    }
  }

  // Bars
  const bi = isMobile ? barHitIndexMobile(mouseX, mouseY) : barHitIndex(mouseX, mouseY);
  if (bi >= 0){ selectedIndex = (selectedIndex === bi) ? -1 : bi; if (selectedIndex >= 0) detailOpenMs = millis(); return; }

  // Donut
  const di = donutHitIndex(mouseX, mouseY);
  if (di >= 0){ selectedIndex = (selectedIndex === di) ? -1 : di; if (selectedIndex >= 0) detailOpenMs = millis(); return; }
}

function touchStarted(){ mousePressed(); return false; }
function keyPressed(){ if (keyCode === ESCAPE && selectedIndex >= 0){ selectedIndex = -1; } }

// ---------- Hit Tests ----------
function barHitIndex(mx,my){
  if (mx < chart.leftMargin) return -1;
  for (let i=0;i<SEA_DATA.length;i++){
    const s = barStates[i];
    const x = s.x - chart.barW/2, y = chart.baselineY - s.h;
    if (mx>x && mx<x+chart.barW && my>y && my<chart.baselineY) return i;
  }
  return -1;
}

function barHitIndexMobile(mx,my){
  const rows = SEA_DATA.length;
  const totalH = rows * rightPanel.rowH + (rows - 1) * rightPanel.gap;
  const topStart = rightPanel.y + max(0, (rightPanel.h - totalH)/2);

  for (let i=0; i<rows; i++){
    const rowY = topStart + i * (rightPanel.rowH + rightPanel.gap);
    const x = rightPanel.x, y = rowY - rightPanel.rowH/2 + 2;
    const w = rightPanel.w, h = rightPanel.rowH;
    if (mx>=x && mx<=x+w && my>=y && my<=y+h) return i;
  }
  return -1;
}

function donutHitIndex(mx,my){
  const dx = mx - donut.cx, dy = my - donut.cy;
  const distR = sqrt(dx*dx + dy*dy);
  const inside = distR >= donut.ir && distR <= donut.r + 10;
  if (!inside) return -1;

  const values = SEA_DATA.map(d => max(0.0001, getMetricValue(d, currentMetric)));
  const total  = values.reduce((a,b)=>a+b, 0);
  let angleM = atan2(dy, dx); if (angleM < -HALF_PI) angleM += TWO_PI;

  let s = -HALF_PI;
  for (let i=0;i<values.length;i++){
    const a = (values[i]/total)*TWO_PI, e = s + a;
    let am = angleM; if (am < s) am += TWO_PI;
    const wrap = (e < s) ? e + TWO_PI : e;
    if (am >= s && am < wrap) return i;
    s = e;
  }
  return -1;
}
