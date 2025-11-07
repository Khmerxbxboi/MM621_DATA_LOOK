// SEA Happiness (2019) — compact p5 sketch

// ---------- Data ----------
const SEA_DATA = [
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

const FLAG = {"Myanmar":"🇲🇲","Cambodia":"🇰🇭","Vietnam":"🇻🇳","Indonesia":"🇮🇩","Laos":"🇱🇦","Philippines":"🇵🇭","Thailand":"🇹🇭","Malaysia":"🇲🇾","Singapore":"🇸🇬"};
const BLUES = ["#0CAFFF","#1E92E0","#36A8FF","#2B8BD1","#56B7FF","#2F7FBF","#4AB6FF","#2B7AB5","#88D5FF"];
const ACCENT = [6,182,255];
const INK = { primary:[245,245,245], secondary:[205,213,224], muted:[165,174,188] };

const METRICS = [
  { key:"score",      label:"Score",           domain:[4.3,6.4],  val:d=>d.score,        fmt:d=>nf(d.score,1,3) },
  { key:"gdp",        label:"GDP",             domain:[0.5,1.6],  val:d=>d.gdp,          fmt:d=>nf(d.gdp,1,3) },
  { key:"support",    label:"Support",         domain:[1.0,1.45], val:d=>d.support,      fmt:d=>nf(d.support,1,3) },
  { key:"health",     label:"Health",          domain:[0.44,1.2], val:d=>d.health,       fmt:d=>nf(d.health,1,3) },
  { key:"freedom",    label:"Freedom",         domain:[0.4,0.7],  val:d=>d.freedom,      fmt:d=>nf(d.freedom,1,3) },
  { key:"generosity", label:"Generosity",      domain:[0.16,0.57],val:d=>d.generosity,   fmt:d=>nf(d.generosity,1,3) },
  { key:"antiCorr",   label:"Anti-Corruption", domain:[0.5,0.97], val:d=>1-d.corruption, fmt:d=>nf(1-d.corruption,1,3) }
];

// ---------- State / Layout ----------
let isMobile=false, currentMetric="score";
let donut={cx:260,cy:320,r:160,ir:98};
let bars={baselineY:0, barW:56, spacing:86, startX:0, leftMargin:520};
let rightPanel={x:0,y:0,w:0,h:0,rowH:20,gap:8,pad:10};
let barAnim=[], startMs=0;
let selected=-1, hoverBar=-1, hoverSlice=-1;
let detailAlpha=0, detailScale=0.96, detailOpenMs=0;
let pill={bounds:{x:0,y:0,w:0,h:0}, prev:{x:0,y:0,r:0}, next:{x:0,y:0,r:0}};
let metricButtons=[];

// ---------- Setup ----------
function setup(){
  const hDesk=min(windowHeight*0.8,820), hMob=max(560, windowHeight*0.9);
  const c = createCanvas(windowWidth*0.98, (windowWidth<700)?hMob:hDesk);
  // parent to #app if present, else #stage, else body
  const appEl=document.getElementById('app'); const stageEl=document.getElementById('stage');
  if (appEl) c.parent(appEl); else if (stageEl) c.parent(stageEl); else c.parent(document.body);

  textFont("system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  reflow(); initBars(); buildButtons();
  startMs=millis(); frameRate(60);
}
function windowResized(){
  const hDesk=min(windowHeight*0.8,820), hMob=max(560, windowHeight*0.9);
  resizeCanvas(windowWidth*0.98, (windowWidth<700)?hMob:hDesk);
  reflow(); buildButtons();
}

// ---------- Layout helpers ----------
function reflow(){
  isMobile = (width<700);

  if(isMobile){
    const sideW = constrain(width*0.42,180,240), gap=12, leftX=12;
    rightPanel = { x:width-sideW-gap, y:90, w:sideW, h:height-90-140, rowH:18, gap:7, pad:10 };
    const leftW = width - sideW - gap - leftX - 12;
    donut.r = min(160, leftW*0.42, height*0.28);
    donut.ir = donut.r*0.62;
    donut.cx = leftX+leftW/2; donut.cy = min(0.44*height, 210 + donut.r*0.1);
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
    donut.cx = bars.leftMargin*0.5; donut.cy = min(320, height*0.48);
    donut.r = min(180, bars.leftMargin*0.42); donut.ir = donut.r*0.61;
  }
  layoutPill();
}
function initBars(){
  barAnim = SEA_DATA.map((d,i)=>({ x: bars.startX + i*bars.spacing, h: 0, alpha:0, delay:i*60 }));
}

// ---------- Metric utilities ----------
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

// ---------- Draw ----------
function draw(){
  background(12);

  // Header
  noStroke(); fill(...INK.primary); textAlign(LEFT,TOP);
  textSize(isMobile?18:20); textStyle(BOLD);
  text("Southeast Asia — Happiness (2019)", 16, 16);
  textSize(isMobile?11:12); textStyle(NORMAL); fill(...INK.secondary);
  text(isMobile? "Tap bars/slices • ◀ ▶ or pill to change metric"
               : "Hover bars/slices • Click to open detail • Toolbar to change metric",
       16, isMobile?40:44);

  // Hover targets
  hoverSlice = donutHit(mouseX,mouseY);
  hoverBar = isMobile ? barHitMobile(mouseX,mouseY) : barHitDesktop(mouseX,mouseY);
  const hover = (hoverBar>=0)? hoverBar : (selected<0 ? hoverSlice : -1);

  // Viz
  drawDonut(hover);
  isMobile ? drawBarsMobile(hover) : drawBarsDesktop(hover);
  isMobile ? drawPill() : drawToolbar();

  // Modal animation
  const targetAlpha = (selected>=0)?1:0;
  detailAlpha = lerp(detailAlpha, targetAlpha, 0.2);
  const t = constrain((millis()-detailOpenMs)/260,0,1);
  detailScale = lerp(0.96, selected>=0?1:0.96, 1 - pow(1-t,3));
  if(detailAlpha>0.01) drawModal(selected, detailAlpha, detailScale);
}

// ---------- Donut ----------
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

// ---------- Bars ----------
function drawBarsDesktop(hover){
  const t=millis()-startMs; textAlign(CENTER,BOTTOM);
  for(let i=0;i<SEA_DATA.length;i++){
    const d=SEA_DATA[i], s=barAnim[i];
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
function drawBarsMobile(hover){
  noStroke(); fill(0,90); rect(rightPanel.x-2, rightPanel.y-6, rightPanel.w+4, rightPanel.h+12, 10);

  const rows=SEA_DATA.length;
  const totalH = rows*rightPanel.rowH + (rows-1)*rightPanel.gap;
  const top = rightPanel.y + (rightPanel.h-totalH)/2;
  const [mn,mx]=mDom(); const maxW = rightPanel.w - rightPanel.pad*2 - 50;

  textAlign(LEFT,CENTER);
  for(let i=0;i<rows;i++){
    const d=SEA_DATA[i], y=top+i*(rightPanel.rowH+rightPanel.gap);
    const isSel=i===selected, isHov=i===hover;
    const bgA = isSel?120:(isHov?80:40);
    noStroke(); fill(20,24,30,bgA); rect(rightPanel.x+3, y-rightPanel.rowH/2+2, rightPanel.w-6, rightPanel.rowH, 6);

    fill(...(isSel||isHov? INK.primary : INK.secondary)); textSize(11);
    text(d.country, rightPanel.x + rightPanel.pad, y);

    const val=mVal(d), w=map(val,mn,mx,0,maxW,true), bx=rightPanel.x+rightPanel.pad+78;
    noStroke(); fill(26,28,34,180); rect(bx,y-6,maxW,12,6);
    // accent when active, muted gray otherwise
    if (isSel||isHov) fill(...ACCENT,235); else fill(120,170);
    rect(bx,y-6,w,12,6);

    textAlign(RIGHT,CENTER); fill(...INK.muted); textSize(10.5);
    text(mFmt(d), rightPanel.x+rightPanel.w-rightPanel.pad, y);
    textAlign(LEFT,CENTER);
  }
}

// ---------- Toolbar / Pill ----------
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
  const w=min(280,width*0.7), h=32, x=donut.cx-w/2, y=donut.cy+donut.r+16;
  pill.bounds={x,y,w,h}; pill.prev={x:x-18,y:y+h/2,r:12}; pill.next={x:x+w+18,y:y+h/2,r:12};
}
function drawPill(){
  layoutPill();
  noStroke(); fill(34,36,42,230); rect(pill.bounds.x,pill.bounds.y,pill.bounds.w,pill.bounds.h,999);
  stroke(...ACCENT,160); noFill(); rect(pill.bounds.x,pill.bounds.y,pill.bounds.w,pill.bounds.h,999);
  noStroke(); fill(...INK.primary); textAlign(CENTER,CENTER); textSize(12); textStyle(BOLD);
  text(mLabel(), pill.bounds.x+pill.bounds.w/2, pill.bounds.y+pill.bounds.h/2+0.5);
  // arrows
  noStroke(); fill(34,36,42,230); circle(pill.prev.x,pill.prev.y,pill.prev.r*2); circle(pill.next.x,pill.next.y,pill.next.r*2);
  stroke(255,255,255,200); strokeWeight(1.6);
  line(pill.prev.x+3,pill.prev.y, pill.prev.x-1,pill.prev.y-4); line(pill.prev.x+3,pill.prev.y, pill.prev.x-1,pill.prev.y+4);
  line(pill.next.x-3,pill.next.y, pill.next.x+1,pill.next.y-4); line(pill.next.x-3,pill.next.y, pill.next.x+1,pill.next.y+4);
}

// ---------- Modal ----------
function drawModal(idx, alpha, scaleAmt){
  if(idx<0) return;
  const d=SEA_DATA[idx];
  noStroke(); fill(0, 255*alpha); rect(0,0,width,height);

  const W = isMobile? min(380,width-32) : min(740,width-64);
  const H = isMobile? 360 : 340;
  push(); translate(width/2,height/2); scale(scaleAmt); translate(-W/2,-H/2);

  // card
  noStroke(); fill(14,18,26,255*alpha); rect(0,0,W,H,16);
  stroke(255,255,255,36*alpha); noFill(); rect(0,0,W,H,16);

  // close
  const cx=W-36, cy=12, cw=24,ch=24;
  noStroke(); fill(34,36,42,255*alpha); rect(cx,cy,cw,ch,6);
  stroke(255,255,255,200*alpha); strokeWeight(1.5);
  line(cx+7,cy+7,cx+17,cy+17); line(cx+17,cy+7,cx+7,cy+17);

  // title + badge
  const title=`${FLAG[d.country]||"🏳️"}  ${d.country}`;
  textAlign(CENTER,TOP); textStyle(BOLD); fill(...INK.primary,255*alpha); textSize(isMobile?20:22); text(title,W/2,18);
  drawBadge((W-(isMobile?W-48:220))/2, isMobile?48:52, isMobile?W-48:220, 30, `${mLabel()}: ${mFmt(d)}`, alpha);

  // content
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
  const corr = d.corruption<=0.08 ? "with low perceived corruption"
             : d.corruption<=0.15 ? "with moderate corruption concerns"
             : "despite higher perceived corruption";
  return `Strong ${a} and solid ${b} ${corr} help drive the overall score.`;
}

// ---------- Interaction ----------
function mousePressed(){
  // Modal first
  if(detailAlpha>0.9 && selected>=0){
    const W=isMobile?min(380,width-32):min(740,width-64), H=isMobile?360:340;
    const cx=width/2-W/2, cy=height/2-H/2;
    const inside = mouseX>=cx && mouseX<=cx+W && mouseY>=cy && mouseY<=cy+H;
    const closeX=cx+W-36, closeY=cy+12;
    if(mouseX>closeX && mouseX<closeX+24 && mouseY>closeY && mouseY<closeY+24){ selected=-1; return; }
    if(!inside){ selected=-1; } return;
  }

  // Mobile pill
  if(isMobile){
    if(dist(mouseX,mouseY,pill.prev.x,pill.prev.y)<=pill.prev.r){ cycleMetric(-1); return; }
    if(dist(mouseX,mouseY,pill.next.x,pill.next.y)<=pill.next.r){ cycleMetric(1); return; }
    if(hitRect(pill.bounds,mouseX,mouseY)){ cycleMetric(1); return; }
  }else{
    // Toolbar chips
    for(const b of metricButtons){
      if(hitRect({x:b.x,y:b.y,w:b.w,h:b.h},mouseX,mouseY)){
        if(currentMetric!==b.key){ currentMetric=b.key; selected=-1; }
        return;
      }
    }
  }

  // Bars or donut
  const bi = isMobile ? barHitMobile(mouseX,mouseY) : barHitDesktop(mouseX,mouseY);
  if(bi>=0){ toggleSelect(bi); return; }
  const di = donutHit(mouseX,mouseY);
  if(di>=0){ toggleSelect(di); return; }
}
function keyPressed(){ if(keyCode===ESCAPE && selected>=0) selected=-1; }
function touchStarted(){ mousePressed(); return false; }

function toggleSelect(i){ selected = (selected===i)? -1 : i; if(selected>=0) detailOpenMs=millis(); }
function cycleMetric(dir){
  const idx = METRICS.findIndex(m=>m.key===currentMetric);
  currentMetric = METRICS[(idx+dir+METRICS.length)%METRICS.length].key; selected=-1;
}

// ---------- Hit tests ----------
function barHitDesktop(mx,my){
  if(mx<bars.leftMargin) return -1;
  for(let i=0;i<SEA_DATA.length;i++){
    const s=barAnim[i], x=s.x-bars.barW/2, y=bars.baselineY - s.h;
    if(mx>x && mx<x+bars.barW && my>y && my<bars.baselineY) return i;
  }
  return -1;
}
function barHitMobile(mx,my){
  const rows=SEA_DATA.length;
  const totalH = rows*rightPanel.rowH + (rows-1)*rightPanel.gap;
  const top = rightPanel.y + (rightPanel.h-totalH)/2;
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
