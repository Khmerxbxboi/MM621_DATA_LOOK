// SEA Happiness — responsive p5 sketch with CSV + About overlay
// ---------------------------------------------------------------------
// Mobile: donut top, metric pill under, FULL-WIDTH horizontal bars below
// Desktop: donut left, vertical bars right, toolbar bottom
// Title follows the selected metric (e.g., “Happiness by Anti-Corruption”)
// 'About' overlay: click the ⓘ badge near the title
// Note: Anti-Corruption = 1 − perceived corruption (higher is better)

//////////////////////// Fallback Data (replaced by CSV if found)
let SEA_DATA = [
  { country:"Myanmar",     score:4.360, gdp:0.710, support:1.181, health:0.555, freedom:0.525, generosity:0.566, corruption:0.172 },
  { country:"Cambodia",    score:4.476, gdp:0.603, support:1.184, health:0.633, freedom:0.605, generosity:0.287, corruption:0.046 },
  { country:"Vietnam",     score:5.175, gdp:0.748, support:1.419, health:0.871, freedom:0.505, generosity:0.165, corruption:0.076 },
  { country:"Indonesia",   score:5.196, gdp:0.940, support:1.159, health:0.637, freedom:0.513, generosity:0.297, corruption:0.038 },
  { country:"Laos",        score:5.203, gdp:0.528, support:1.042, health:0.449, freedom:0.449, generosity:0.228, corruption:0.183 },
  { country:"Philippines", score:5.631, gdp:0.812, support:1.209, health:0.614, freedom:0.662, generosity:0.300, corruption:0.120 },
  { country:"Thailand",    score:6.008, gdp:1.050, support:1.408, health:0.760, freedom:0.520, generosity:0.357, corruption:0.055 },
  { country:"Malaysia",    score:6.088, gdp:1.156, support:1.258, health:0.766, freedom:0.407, generosity:0.291, corruption:0.041 },
  { country:"Singapore",   score:6.262, gdp:1.574, support:1.306, health:1.141, freedom:0.549, generosity:0.271, corruption:0.464 }
];

const FLAG  = {"Myanmar":"🇲🇲","Cambodia":"🇰🇭","Vietnam":"🇻🇳","Indonesia":"🇮🇩","Laos":"🇱🇦","Philippines":"🇵🇭","Thailand":"🇹🇭","Malaysia":"🇲🇾","Singapore":"🇸🇬"};
const BLUES = ["#0CAFFF","#1E92E0","#36A8FF","#2B8BD1","#56B7FF","#2F7FBF","#4AB6FF","#2B7AB5","#88D5FF"];
const ACCENT = [6,182,255];
const INK = { primary:[245,245,245], secondary:[205,213,224], muted:[165,174,188] };

//////////////////////// Metrics (Anti-Corruption returns 1 − corruption)
const METRICS = [
  { key:"score",      label:"Score",           domain:[4.3,6.4],  val:d=>d.score,        fmt:d=>nf(d.score,1,3) },
  { key:"gdp",        label:"GDP",             domain:[0.5,1.6],  val:d=>d.gdp,          fmt:d=>nf(d.gdp,1,3) },
  { key:"support",    label:"Support",         domain:[1.0,1.45], val:d=>d.support,      fmt:d=>nf(d.support,1,3) },
  { key:"health",     label:"Health",          domain:[0.44,1.2], val:d=>d.health,       fmt:d=>nf(d.health,1,3) },
  { key:"freedom",    label:"Freedom",         domain:[0.4,0.7],  val:d=>d.freedom,      fmt:d=>nf(d.freedom,1,3) },
  { key:"generosity", label:"Generosity",      domain:[0.16,0.57],val:d=>d.generosity,   fmt:d=>nf(d.generosity,1,3) },
  { key:"antiCorr",   label:"Anti-Corruption", domain:[0.50,0.97],val:d=>1-d.corruption, fmt:d=>nf(1-d.corruption,1,3) }
];

//////////////////////// State / layout
let isMobile=false, currentMetric="score";
let donut={cx:260,cy:320,r:160,ir:98};
let bars={baselineY:0, barW:56, spacing:86, startX:0, leftMargin:520};
let rightPanel={x:0,y:0,w:0,h:0,rowH:20,gap:8,pad:10};
let barAnim=[], startMs=0;
let selected=-1, hoverBar=-1, hoverSlice=-1;
let detailAlpha=0, detailScale=0.96, detailOpenMs=0;
let pill={bounds:{x:0,y:0,w:0,h:0}, prev:{x:0,y:0,r:0}, next:{x:0,y:0,r:0}};
let metricButtons=[];

//////////////////////// About overlay state
let aboutOpen=false, aboutAlpha=0, aboutScale=0.96;
let infoBtn={x:0,y:0,w:26,h:26}; // ⓘ badge next to title

//////////////////////// CSV
let table2019 = null;
function preload(){
  table2019 = loadTable('2019.csv','csv','header'); // same folder as HTML/sketch
}

//////////////////////// Setup / resize
function setup(){
  const hDesk=min(windowHeight*0.8,820), hMob=max(560, windowHeight*0.98);
  const c = createCanvas(windowWidth*0.98, (windowWidth<700)?hMob:hDesk);
  const appEl=document.getElementById('app'); const stageEl=document.getElementById('stage');
  if (appEl) c.parent(appEl); else if (stageEl) c.parent(stageEl); else c.parent(document.body);

  textFont("system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  applySEAFrom2019(table2019);    // swap in CSV data if available
  reflow(); initBars(); buildButtons();
  startMs=millis(); frameRate(60);
}
function windowResized(){
  const hDesk=min(windowHeight*0.8,820), hMob=max(560, windowHeight*0.98);
  resizeCanvas(windowWidth*0.98, (windowWidth<700)?hMob:hDesk);
  reflow(); buildButtons();
}

//////////////////////// CSV -> SEA_DATA
function applySEAFrom2019(tbl){
  try{
    if (!tbl || tbl.getRowCount() === 0) return;
    const H = {
      country:    ["Country","country","Country name","nation","Nation"],
      score:      ["Ladder score","Life Ladder","score","Score","happiness_score"],
      gdp:        ["Logged GDP per capita","GDP per capita","gdp","GDP","gdp_per_capita"],
      support:    ["Social support","social_support","support","Support"],
      health:     ["Healthy life expectancy","Healthy life expectancy at birth","health","Health","healthy_life"],
      freedom:    ["Freedom to make life choices","freedom_to_make_life_choices","freedom","Freedom"],
      generosity: ["Generosity","generosity"],
      corruption: ["Perceptions of corruption","perceptions_of_corruption","corruption","Corruption"]
    };
    const pickStr = (row, hs)=>{ for(const h of hs){ const v=row.get(h); if(v!==undefined&&v!==null&&v!=="") return String(v);} return ""; };
    const pickNum = (row, hs)=>{ for(const h of hs){ const v=row.get(h); if(v!==undefined&&v!==null&&v!=="") return parseFloat(v);} return NaN; };

    const ALLOW = new Set(["Myanmar","Cambodia","Vietnam","Indonesia","Laos","Philippines","Thailand","Malaysia","Singapore"]);
    const rows = tbl.getRows(), parsed=[];
    for (let i=0;i<rows.length;i++){
      const r=rows[i], country=(pickStr(r,H.country)||"").trim();
      if(!country || !ALLOW.has(country)) continue;
      const obj = {
        country,
        score:pickNum(r,H.score), gdp:pickNum(r,H.gdp), support:pickNum(r,H.support),
        health:pickNum(r,H.health), freedom:pickNum(r,H.freedom),
        generosity:pickNum(r,H.generosity), corruption:pickNum(r,H.corruption)
      };
      const ok = Object.keys(obj).every(k=>k==="country"||Number.isFinite(obj[k]));
      if(ok) parsed.push(obj);
    }
    if(parsed.length) SEA_DATA = parsed;
  }catch(e){ /* keep fallback */ }
}

//////////////////////// Layout helpers
function reflow(){
  isMobile = (width<700);

  if(isMobile){
    // Donut top, pill under, full-width bars below
    const padX = 12;
    const topY = 78;

    donut.r  = min(150, width * 0.34, height * 0.28);
    donut.ir = donut.r * 0.62;
    donut.cx = width * 0.36;
    donut.cy = min(topY + donut.r + 6, height * 0.38);

    layoutPill();
    rightPanel.x   = padX;
    rightPanel.w   = width - padX*2;
    rightPanel.y   = pill.bounds.y + pill.bounds.h + 12;
    rightPanel.h   = max(120, height - rightPanel.y - 16);
    rightPanel.rowH= 18;
    rightPanel.gap = 7;
    rightPanel.pad = 10;

    bars.leftMargin = 0;
  }else{
    bars.leftMargin = min(520, max(380, width*0.36));
    const rightW = width - bars.leftMargin - 36, N = SEA_DATA.length, pad=40;
    const spacing = (rightW - pad*2) / N;
    bars.spacing = constrain(spacing, 60, 110);
    bars.barW = min(56, spacing*0.60);
    const total = N*bars.spacing;
    bars.startX = bars.leftMargin + pad + bars.spacing/2 + (rightW - pad*2 - total)/2;
    bars.baselineY = height - 120;

    donut.cx = bars.leftMargin * 0.5;
    donut.cy = min(320, height * 0.48);
    donut.r  = min(180, bars.leftMargin * 0.42);
    donut.ir = donut.r * 0.61;

    layoutPill(); // computed but not drawn on desktop
  }
  // position info badge near the title
  infoBtn.x = 16 + textWidth(isMobile? "" : "");
  infoBtn.y = 16 + (isMobile? 18 : 20) + 8; // roughly under main title line; we refine in draw
}

function initBars(){
  barAnim = SEA_DATA.map((d,i)=>({ x: (isMobile?0:bars.startX) + i*bars.spacing, h:0, alpha:0, delay:i*60 }));
}

//////////////////////// Metric utils
const M = key => METRICS.find(m=>m.key===key);
const mVal  = (d,key=currentMetric)=> M(key).val(d);
const mDom  = (key=currentMetric)=> M(key).domain;
const mLabel= (key=currentMetric)=> M(key).label;
const mFmt  = (d,key=currentMetric)=> M(key).fmt(d);
function valueToH(v){
  const [mn,mx] = mDom();
  const minH=80, maxH = isMobile? (height*0.36) : 520;
  return map(v,mn,mx,minH,maxH,true);
}

//////////////////////// Draw
function draw(){
  // soft gradient background strip (subtle “dashboard” feel)
  for(let y=0;y<height;y++){
    const a = map(y,0,height,28,8);
    stroke(8,12,18,a); line(0,y,width,y);
  }

  // Dynamic title follows metric + hint clarifying Anti-Corruption
  const titleMetric = mLabel();
  const suffix = (currentMetric==="antiCorr") ? " (1 − perceived corruption)" : "";
  const title = `Southeast Asia — Happiness by ${titleMetric}${suffix} (2019)`;
  noStroke(); fill(...INK.primary); textAlign(LEFT,TOP);
  textSize(isMobile?18:20); textStyle(BOLD);
  text(title, 16, 16);

  // ⓘ info badge next to title
  const badgeX = 16 + textWidth(title) + 10;
  drawInfoBadge(badgeX, 18);

  textSize(isMobile?11:12); textStyle(NORMAL); fill(...INK.secondary);
  text(isMobile? "Tap slices/bars • ◀ ▶ or pill to change metric"
               : "Hover bars/slices • Click to open detail • Toolbar to change metric",
       16, isMobile?40:44);

  // Hovers
  hoverSlice = donutHit(mouseX,mouseY);
  hoverBar   = isMobile ? barHitMobile(mouseX,mouseY) : barHitDesktop(mouseX,mouseY);
  const hover = (hoverBar>=0)? hoverBar : (selected<0 ? hoverSlice : -1);

  // Viz
  drawDonut(hover);
  if(isMobile) drawBarsMobile(hover); else drawBarsDesktop(hover);
  if(isMobile) drawPill(); else drawToolbar();

  // Detail modal
  const targetAlpha = (selected>=0)?1:0;
  detailAlpha = lerp(detailAlpha, targetAlpha, 0.2);
  const t = constrain((millis()-detailOpenMs)/260,0,1);
  detailScale = lerp(0.96, selected>=0?1:0.96, 1 - pow(1-t,3));
  if(detailAlpha>0.01) drawModal(selected, detailAlpha, detailScale);

  // About overlay
  const aTarget = aboutOpen? 1 : 0;
  aboutAlpha = lerp(aboutAlpha, aTarget, 0.22);
  aboutScale = lerp(0.96, aboutOpen?1:0.96, 0.25);
  if(aboutAlpha>0.02) drawAbout(aboutAlpha, aboutScale);

  // footer chip (subtle)
  drawFooterChip();
}

//////////////////////// Donut
function drawDonut(hover){
  const vals = SEA_DATA.map(d=>max(0.0001, mVal(d)));
  const total = vals.reduce((a,b)=>a+b,0);

  let a0 = -HALF_PI;
  noStroke(); fill(0, 90); ellipse(donut.cx+2, donut.cy+5, donut.r*2.06, donut.r*2.06);

  for(let i=0;i<SEA_DATA.length;i++){
    const a = (vals[i]/total)*TWO_PI;
    const active = (selected>=0? i===selected : i===hover);
    const col = active? color(...ACCENT) : color(BLUES[i%BLUES.length]);
    col.setAlpha(active?255:(hover>=0||selected>=0?110:225));
    const expand = active? (selected>=0?10:7) : 0;
    noStroke(); fill(col);
    ringSlice(donut.cx, donut.cy, donut.r+expand, donut.ir, a0, a0+a);
    a0 += a;
  }

  noStroke(); fill(0,165); ellipse(donut.cx, donut.cy, donut.ir*1.46, donut.ir*1.46);
  const idx = (selected>=0)? selected : (hover>=0?hover:-1);
  const title = (idx>=0) ? SEA_DATA[idx].country : mLabel().toUpperCase();
  const sub   = (idx>=0) ? `${mLabel()}: ${mFmt(SEA_DATA[idx])}` : "distribution";
  fill(...INK.primary); textAlign(CENTER,CENTER); textStyle(BOLD); textSize(isMobile?12:14);
  text(title, donut.cx, donut.cy-8);
  textStyle(NORMAL); fill(...INK.secondary); textSize(isMobile?10.5:12);
  text(sub, donut.cx, donut.cy+12);
}
function ringSlice(cx,cy,or,ir,a,b){
  beginShape();
  for(let t=a;t<=b;t+=radians(4)) vertex(cx+cos(t)*or, cy+sin(t)*or);
  vertex(cx+cos(b)*or, cy+sin(b)*or);
  for(let t=b;t>=a;t-=radians(4)) vertex(cx+cos(t)*ir, cy+sin(t)*ir);
  vertex(cx+cos(a)*ir, cy+sin(a)*ir);
  endShape(CLOSE);
}

//////////////////////// Bars — Desktop (vertical)
function drawBarsDesktop(hover){
  const t=millis()-startMs; textAlign(CENTER,BOTTOM);
  for(let i=0;i<SEA_DATA.length;i++){
    const d=SEA_DATA[i];
    if(!barAnim[i]) barAnim[i]={x:bars.startX+i*bars.spacing,h:0,alpha:0,delay:i*60};
    const s=barAnim[i];
    s.x = bars.startX + i*bars.spacing;

    const prog = constrain(max(0,t-s.delay)/700,0,1); const ease = 1-pow(1-prog,3);
    s.alpha=ease;
    const baseH = valueToH(mVal(d));
    const grow = (i===selected)?72 : (i===hover?38:0);
    s.h = lerp(s.h, baseH*ease + grow, 0.17);

    const x = s.x - bars.barW/2, y = bars.baselineY - s.h;
    const dim = (selected>=0 && i!==selected) || (hover>=0 && i!==hover);
    noStroke();
    if(i===selected || i===hover) fill(...ACCENT, 235);
    else fill(48, dim?110:220);
    rect(x,y,bars.barW,s.h,6);

    fill(...(i===selected||i===hover ? INK.primary : INK.secondary));
    textSize(12); text(d.country, s.x, y-10);
  }
}

//////////////////////// Bars — Mobile (horizontal, full width below donut)
function drawBarsMobile(hover){
  noStroke(); fill(0, 90);
  rect(rightPanel.x - 2, rightPanel.y - 6, rightPanel.w + 4, rightPanel.h + 12, 10);

  const rows = SEA_DATA.length;
  const totalH = rows * rightPanel.rowH + (rows - 1) * rightPanel.gap;
  const top = rightPanel.y + max(0, (rightPanel.h - totalH)/2);

  const [mn,mx]=mDom();
  const innerPad = rightPanel.pad;
  const barMaxW = rightPanel.w - innerPad*2 - 50;

  textAlign(LEFT, CENTER);
  for (let i=0; i<rows; i++){
    const d = SEA_DATA[i];
    const rowY = top + i * (rightPanel.rowH + rightPanel.gap);
    if (rowY > rightPanel.y + rightPanel.h + 30) break;

    const isSel = (i===selected);
    const isHov = (i===hover);
    const bgAlpha = isSel ? 120 : (isHov ? 80 : 40);
    noStroke(); fill(20,24,30, bgAlpha);
    rect(rightPanel.x+3, rowY- rightPanel.rowH/2 + 2, rightPanel.w-6, rightPanel.rowH, 6);

    fill(...(isSel || isHov ? INK.primary : INK.secondary));
    textSize(11);
    text(d.country, rightPanel.x + innerPad, rowY);

    const val = mVal(d);
    const wBar = map(val, mn, mx, 0, barMaxW, true);
    const bx = rightPanel.x + innerPad + 78;
    const by = rowY - 6;
    noStroke();
    fill(26,28,34, 180); rect(bx, by, barMaxW, 12, 6);
    if (isSel || isHov) fill(...ACCENT, 235);
    else fill(120, 170);
    rect(bx, by, wBar, 12, 6);

    textAlign(RIGHT, CENTER);
    fill(...INK.muted);
    textSize(10.5);
    text(mFmt(d), rightPanel.x + rightPanel.w - innerPad, rowY);

    textAlign(LEFT, CENTER);
  }
}

//////////////////////// Toolbar / Pill
function buildButtons(){
  metricButtons.length=0; if(isMobile) return;
  const barX = bars.leftMargin + 10, barW = width - bars.leftMargin - 56, barY=height-78, barH=56;
  textSize(12); const startX = barX + max(72, textWidth("Metric")+28);
  let x=startX, y=barY+(barH-28)/2;
  for(const m of METRICS){
    const w=textWidth(m.label)+24;
    if(x+w>barX+barW-12) x=startX;
    metricButtons.push({key:m.key, label:m.label, x, y, w, h:28});
    x+=w+8;
  }
}
function drawToolbar(){
  const barX = bars.leftMargin + 10, barW = width - bars.leftMargin - 56, barY=height-78, barH=56;
  noStroke(); fill(14,18,26,200); rect(barX,barY,barW,barH,10);
  stroke(255,255,255,30); noFill(); rect(barX,barY,barW,barH,10);
  noStroke(); fill(...INK.muted); textAlign(LEFT,CENTER); textSize(12);
  text("Metric", barX+14, barY+barH/2);

  const divX = barX + max(72, textWidth("Metric")+28);
  stroke(255,255,255,24); line(divX, barY+10, divX, barY+barH-10);

  for(const b of metricButtons){
    const active = b.key===currentMetric;
    const hov = mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h;
    noStroke();
    if(active){ fill(34,36,42); rect(b.x,b.y,b.w,b.h,8); stroke(...ACCENT,180); noFill(); rect(b.x,b.y,b.w,b.h,8); noStroke(); fill(240); }
    else if(hov){ fill(30,34,44); rect(b.x,b.y,b.w,b.h,8); fill(225); }
    else { fill(26,28,34); rect(b.x,b.y,b.w,b.h,8); fill(200); }
    textAlign(CENTER,CENTER); textSize(12); text(b.label, b.x+b.w/2, b.y+b.h/2+0.5);
  }
}
function layoutPill(){
  if(!isMobile){ pill={bounds:{x:0,y:0,w:0,h:0},prev:{x:0,y:0,r:0},next:{x:0,y:0,r:0}}; return; }
  const w=min(280,width*0.7), h=32, x=donut.cx-w/2, y=donut.cy+donut.r+12;
  pill.bounds={x,y,w,h}; pill.prev={x:x-18,y:y+h/2,r:12}; pill.next={x:x+w+18,y:y+h/2,r:12};
}
function drawPill(){
  layoutPill();
  noStroke(); fill(34,36,42,230); rect(pill.bounds.x,pill.bounds.y,pill.bounds.w,pill.bounds.h,999);
  stroke(...ACCENT,160); noFill(); rect(pill.bounds.x,pill.bounds.y,pill.bounds.w,pill.bounds.h,999);
  noStroke(); fill(...INK.primary); textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD);
  text(mLabel(), pill.bounds.x+pill.bounds.w/2, pill.bounds.y+pill.bounds.h/2+0.5);
  // arrows
  noStroke(); fill(34,36,42,230);
  circle(pill.prev.x,pill.prev.y,pill.prev.r*2); circle(pill.next.x,pill.next.y,pill.next.r*2);
  stroke(255,255,255,200); strokeWeight(1.6);
  line(pill.prev.x+3,pill.prev.y-4, pill.prev.x-3,pill.prev.y);
  line(pill.prev.x+3,pill.prev.y+4, pill.prev.x-3,pill.prev.y);
  line(pill.next.x-3,pill.next.y-4, pill.next.x+3,pill.next.y);
  line(pill.next.x-3,pill.next.y+4, pill.next.x+3,pill.next.y);
}

//////////////////////// Modal (detail per country)
function drawModal(idx, alpha, scaleAmt){
  if(idx<0) return;
  const d=SEA_DATA[idx];
  noStroke(); fill(0, 255*alpha); rect(0,0,width,height);

  const W = isMobile? min(380,width-32) : min(740,width-64);
  const H = isMobile? 360 : 340;
  push(); translate(width/2,height/2); scale(scaleAmt); translate(-W/2,-H/2);

  noStroke(); fill(14,18,26,255*alpha); rect(0,0,W,H,16);
  stroke(255,255,255,36*alpha); noFill(); rect(0,0,W,H,16);

  const cx=W-36, cy=12, cw=24,ch=24;
  noStroke(); fill(34,36,42,255*alpha); rect(cx,cy,cw,ch,6);
  stroke(255,255,255,200*alpha); strokeWeight(1.5);
  line(cx+7,cy+7,cx+17,cy+17); line(cx+17,cy+7,cx+7,cy+17);

  const title=`${FLAG[d.country]||"🏳️"}  ${d.country}`;
  textAlign(CENTER,TOP); textStyle(BOLD); fill(...INK.primary,255*alpha); textSize(isMobile?20:22); text(title,W/2,18);
  drawBadge((W-(isMobile?W-48:220))/2, isMobile?48:52, isMobile?W-48:220, 30, `${mLabel()}: ${mFmt(d)}`, alpha);

  textStyle(NORMAL); fill(...INK.secondary,255*alpha); textSize(isMobile?12:13); textAlign(LEFT,TOP);
  const blurb = explain(d);
  if(isMobile){
    text(blurb, 18, 90, W-36, 90);
    const y=180;
    metricsKV(18,y+0,"GDP per capita",nf(d.gdp,1,3),alpha);
    metricsKV(18,y+24,"Social support",nf(d.support,1,3),alpha);
    metricsKV(18,y+48,"Healthy life",nf(d.health,1,3),alpha);
    metricsKV(18,y+72,"Freedom",nf(d.freedom,1,3),alpha);
    metricsKV(18,y+96,"Generosity",nf(d.generosity,1,3),alpha);
    metricsKV(18,y+120,"Anti-corruption",nf(1-d.corruption,1,3),alpha);
  }else{
    text(blurb, 24, 96, W/2-36, 90);
    const rx=W/2+12, ry=96;
    metricsKV(rx,ry+0,"GDP per capita",nf(d.gdp,1,3),alpha);
    metricsKV(rx,ry+28,"Social support",nf(d.support,1,3),alpha);
    metricsKV(rx,ry+56,"Healthy life",nf(d.health,1,3),alpha);
    metricsKV(rx,ry+84,"Freedom",nf(d.freedom,1,3),alpha);
    metricsKV(rx,ry+112,"Generosity",nf(d.generosity,1,3),alpha);
    metricsKV(rx,ry+140,"Anti-corruption",nf(1-d.corruption,1,3),alpha);
  }

  textAlign(RIGHT,BOTTOM); textSize(11); fill(...INK.muted,220*alpha);
  text(isMobile? "Tap outside, press ESC, or × to close" : "Click background, press ESC, or × to close", W-16, H-12);
  pop();
}
function drawBadge(x,y,w,h,txt,alpha){
  noStroke(); fill(34,36,42,230*alpha); rect(x,y,w,h,999);
  stroke(...ACCENT,180*alpha); noFill(); rect(x,y,w,h,999);
  fill(...INK.primary,255*alpha); textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD); text(txt, x+w/2, y+h/2+1);
}
function metricsKV(x,y,label,val,alpha){
  textAlign(LEFT,CENTER); textSize(12); fill(225,225,225,255*alpha); text(label,x,y);
  const dotsStart = x + textWidth(label) + 8, dotsEnd = x + 260;
  stroke(255,255,255,60*alpha); strokeWeight(1);
  for(let xx=dotsStart; xx<dotsEnd; xx+=4) line(xx,y,min(xx+2,dotsEnd),y);
  noStroke(); textAlign(RIGHT,CENTER); textStyle(BOLD); fill(...INK.primary,255*alpha); text(val,dotsEnd,y);
}
function explain(d){
  const arr=[
    {k:"gdp",v:d.gdp,l:"GDP per capita"},
    {k:"support",v:d.support,l:"social support"},
    {k:"health",v:d.health,l:"healthy life expectancy"},
    {k:"freedom",v:d.freedom,l:"freedom to choose"},
    {k:"generosity",v:d.generosity,l:"generosity"}
  ].sort((a,b)=>b.v-a.v);
  const a=arr[0].l, b=arr[1].l;
  const note = (1-d.corruption)>=0.85 ? "with very high anti-corruption"
            : (1-d.corruption)>=0.70 ? "with good anti-corruption"
            : "despite lower anti-corruption";
  return `Strong ${a} and solid ${b}, ${note}, help drive the overall score.`;
}

//////////////////////// About overlay (definition + factors)
function drawInfoBadge(x,y){
  // rounded chip with ⓘ
  const r=12;
  infoBtn={x:x,y:y,w:26,h:26};
  noStroke(); fill(20,24,30,220); rect(x,y,26,26,8);
  stroke(255,255,255,30); noFill(); rect(x,y,26,26,8);
  noStroke(); fill(...INK.primary);
  textAlign(CENTER,CENTER); textSize(14); textStyle(BOLD);
  text("i", x+13, y+13.2);
  // hover ring
  if(mouseX>=x&&mouseX<=x+26&&mouseY>=y&&mouseY<=y+26){
    noFill(); stroke(...ACCENT,180); rect(x-1,y-1,28,28,9);
  }
}

function drawAbout(alpha, scaleAmt){
  // dark backdrop
  noStroke(); fill(0, 200*alpha); rect(0,0,width,height);

  const W = isMobile? min(420, width-28) : min(760, width-64);
  const H = isMobile? min(560, height-48) : min(520, height-80);
  push(); translate(width/2,height/2); scale(scaleAmt); translate(-W/2,-H/2);

  // card
  noStroke(); fill(16,20,28, 255*alpha); rect(0,0,W,H,16);
  stroke(255,255,255, 36*alpha); noFill(); rect(0,0,W,H,16);

  // title
  textAlign(LEFT,TOP); textStyle(BOLD); fill(...INK.primary, 255*alpha);
  textSize(isMobile?18:20);
  text("About: How This Dashboard Defines Happiness", 20, 18);

  // short subtitle
  textStyle(NORMAL); textSize(isMobile?12:13); fill(...INK.secondary, 230*alpha);
  text("World Happiness Report (2019) — national averages of life satisfaction using the Cantril Ladder (0–10).", 20, 48, W-40);

  // sections
  let y = 84;
  drawSection(W, y, "What is measured?",
    "People are asked: “On a ladder from 0 (worst possible life) to 10 (best possible life), which step are you on today?” Each country’s average becomes its Happiness Score.",
    alpha); y+=86;

  drawSection(W, y, "Why these factors?",
    "Six drivers correlate strongly with how people rate their lives:",
    alpha); y+=64;

  // bullets
  const bullets = [
    ["GDP per capita", "Material prosperity and ability to meet needs."],
    ["Social support", "Friends/family to rely on boosts resilience."],
    ["Healthy life expectancy", "More healthy years → more well-being."],
    ["Freedom to make life choices", "Autonomy to shape one’s life."],
    ["Generosity", "Giving/volunteering builds trust and connection."],
    ["Anti-Corruption", "Defined as 1 − perceived corruption; higher means more trust in institutions."]
  ];
  const colW = W-40;
  const bx = 28, bw = colW-8;
  textAlign(LEFT,TOP); textSize(isMobile?12:13);
  for(const [k,v] of bullets){
    // dot
    noStroke(); fill(...ACCENT, 220*alpha); circle(bx, y+8, 6);
    // label+desc
    fill(...INK.primary, 255*alpha); textStyle(BOLD); text(k, bx+12, y);
    textStyle(NORMAL); fill(...INK.secondary, 230*alpha); text(v, bx+12, y+18, bw);
    y += 48;
    if (y > H-92) break; // avoid overflow on small screens
  }

  // close hint
  textAlign(RIGHT,BOTTOM); textSize(11); fill(...INK.muted, 220*alpha);
  text(isMobile? "Tap outside or press ESC to close" : "Click outside or press ESC to close", W-14, H-12);

  pop();
}

function drawSection(W, y, title, body, alpha){
  textAlign(LEFT,TOP);
  textStyle(BOLD); fill(...INK.primary, 255*alpha); textSize(isMobile?14:15);
  text(title, 20, y);
  textStyle(NORMAL); fill(...INK.secondary, 230*alpha); textSize(isMobile?12:13);
  text(body, 20, y+20, W-40);
}

//////////////////////// Footer
function drawFooterChip(){
  const txt = "Data: World Happiness Report 2019 • Anti-Corruption = 1 − perceived corruption";
  const tw = textWidth(txt) + 24;
  const w = constrain(tw, 260, width-32);
  const h = 26;
  const x = 16, y = height - h - 14;
  noStroke(); fill(14,18,26,200); rect(x,y,w,h,10);
  stroke(255,255,255,22); noFill(); rect(x,y,w,h,10);
  noStroke(); fill(...INK.secondary); textAlign(LEFT,CENTER); textSize(11);
  text(txt, x+12, y+h/2+0.5);
}

//////////////////////// Interaction
function mousePressed(){
  // About overlay first
  if(aboutAlpha>0.9 && aboutOpen){
    // clicking outside closes
    aboutOpen = false; return;
  }
  // Detail modal next
  if(detailAlpha>0.9 && selected>=0){
    const W=isMobile?min(380,width-32):min(740,width-64), H=isMobile?360:340;
    const cx=width/2-W/2, cy=height/2-H/2;
    const inside = mouseX>=cx && mouseX<=cx+W && mouseY>=cy && mouseY<=cy+H;
    const closeX=cx+W-36, closeY=cy+12;
    if(mouseX>closeX && mouseX<closeX+24 && mouseY>closeY && mouseY<closeY+24){ selected=-1; return; }
    if(!inside){ selected=-1; } return;
  }

  // Info badge
  if(mouseX>=infoBtn.x&&mouseX<=infoBtn.x+infoBtn.w&&mouseY>=infoBtn.y&&mouseY<=infoBtn.y+infoBtn.h){
    aboutOpen = true; return;
  }

  if(isMobile){
    if(dist(mouseX,mouseY,pill.prev.x,pill.prev.y)<=pill.prev.r){ cycleMetric(-1); return; }
    if(dist(mouseX,mouseY,pill.next.x,pill.next.y)<=pill.next.r){ cycleMetric(1); return; }
    if(hitRect(pill.bounds,mouseX,mouseY)){ cycleMetric(1); return; }
  }else{
    for(const b of metricButtons){
      if(hitRect({x:b.x,y:b.y,w:b.w,h:b.h},mouseX,mouseY)){
        if(currentMetric!==b.key){ currentMetric=b.key; selected=-1; }
        return;
      }
    }
  }

  const bi = isMobile ? barHitMobile(mouseX,mouseY) : barHitDesktop(mouseX,mouseY);
  if(bi>=0){ toggleSelect(bi); return; }
  const di = donutHit(mouseX,mouseY);
  if(di>=0){ toggleSelect(di); return; }
}
function keyPressed(){
  if(keyCode===ESCAPE){
    if(aboutOpen) aboutOpen=false;
    else if(selected>=0) selected=-1;
  }
}
function touchStarted(){ mousePressed(); return false; }

function toggleSelect(i){ selected = (selected===i)? -1 : i; if(selected>=0) detailOpenMs=millis(); }
function cycleMetric(dir){
  const idx = METRICS.findIndex(m=>m.key===currentMetric);
  currentMetric = METRICS[(idx+dir+METRICS.length)%METRICS.length].key; selected=-1;
}

//////////////////////// Hit tests
function barHitDesktop(mx,my){
  if(mx<bars.leftMargin) return -1;
  for(let i=0;i<SEA_DATA.length;i++){
    const s=barAnim[i] || {x:bars.startX+i*bars.spacing,h:0};
    const x=s.x-bars.barW/2, y=bars.baselineY - s.h;
    if(mx>x && mx<x+bars.barW && my>y && my<bars.baselineY) return i;
  }
  return -1;
}
function barHitMobile(mx,my){
  const rows=SEA_DATA.length;
  const totalH = rows*rightPanel.rowH + (rows-1)*rightPanel.gap;
  const top = rightPanel.y + max(0, (rightPanel.h - totalH)/2);
  for(let i=0;i<rows;i++){
    const x=rightPanel.x, y=top + i*(rightPanel.rowH+rightPanel.gap) - rightPanel.rowH/2 + 2;
    if(mx>=x && mx<=x+rightPanel.w && my>=y && my<=y+rightPanel.rowH) return i;
  }
  return -1;
}
function donutHit(mx,my){
  const dx=mx-donut.cx, dy=my-donut.cy, r=sqrt(dx*dx+dy*dy);
  if(r<donut.ir || r>donut.r+10) return -1;
  const vals=SEA_DATA.map(d=>max(0.0001,mVal(d))), total=vals.reduce((a,b)=>a+b,0);
  let a0=-HALF_PI, ang=atan2(dy,dx); if(ang<-HALF_PI) ang+=TWO_PI;
  for(let i=0;i<vals.length;i++){
    const a=(vals[i]/total)*TWO_PI, a1=a0+a;
    let m=ang; if(m<a0) m+=TWO_PI; const wrap=(a1<a0)? a1+TWO_PI : a1;
    if(m>=a0 && m<wrap) return i; a0=a1;
  } return -1;
}
function hitRect(r,mx,my){ return mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h; }
