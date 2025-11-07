// Chart animated for p5.js (SEA from 2019.csv)
// Based on Jerome Mercier's Bar/Pie classes

let easing = 0.05;
let bar1, pie1;

// ---- CSV bits ----
let table = null;
let dataError = null;

// Keep only these SEA countries (and this order for bars)
const SEA_ORDER = [
  'Myanmar','Cambodia','Vietnam','Indonesia','Laos',
  'Philippines','Thailand','Malaysia','Singapore'
];
const SEA_SET = new Set(SEA_ORDER);

// Exact column headers from your CSV
const H_COUNTRY = 'Country or region';
const H_SCORE   = 'Score';

// Parsed arrays for charts
let barValues = [];   // raw scores (one per country in SEA_ORDER)
let piePercents = []; // percent share per country (sum to ~100)

function preload(){
  // 2019.csv must be in the same folder as index.html
  table = loadTable('2019.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, 800);
  textFont('sans-serif');

  // Build arrays from CSV
  buildSEAData();

  // Fallback if nothing loaded
  if (barValues.length === 0) {
    dataError = dataError || 'No SEA rows found in 2019.csv';
    // Provide harmless demo values so the sketch still renders
    barValues = [200,300,200,56,78,23];
    piePercents = [20,20,20,10,10,20];
  }

  // Create charts
  bar1 = new Bar(
    520, 240,                              // total bars area width, max height for tallest bar
    createVector(width/2, 620),            // position
    easing,
    barValues.slice(),                     // copy (class mutates for map)
    color(298,81,70)                       // HSB color
  );

  pie1 = new Pie(
    220,                                   // diameter
    createVector(width/2, 240),            // position
    easing,
    piePercents.slice(),                   // copy (percents)
    color(201,86,80)                       // HSB color
  );
}

function draw() {
  background("#BCE8F7");
  noStroke();

  // Status banner if CSV had issues
  if (dataError){
    fill(200, 0, 0);
    textSize(12);
    textAlign(LEFT, TOP);
    text(`CSV issue: ${dataError}`, 12, 12);
  } else {
    fill(0, 80);
    textSize(14);
    textAlign(LEFT, TOP);
    text('Southeast Asia — World Happiness Report 2019 (Score & % of SEA total)', 12, 12);
  }

  bar1.display();
  pie1.display();
}

function windowResized(){
  resizeCanvas(windowWidth, 800);
  // Recenter charts on resize
  bar1.position = createVector(width/2, 620);
  pie1.position = createVector(width/2, 240);
}

// ---- CSV → arrays ----
function buildSEAData(){
  try{
    if (!table) throw new Error('CSV did not load (check path & server).');

    // Name normalization for odd cases (not needed for your paste but harmless)
    const NAME_FIX = new Map([
      ["lao people's democratic republic", 'Laos'],
      ['viet nam', 'Vietnam'],
    ]);

    // Collect SEA scores in the target order
    const rows = table.getRows();
    const dict = new Map(); // country -> score
    rows.forEach(r => {
      const raw = (r.getString(H_COUNTRY) || '').trim();
      const key = raw.toLowerCase();
      const name = NAME_FIX.get(key) || raw;
      if (!SEA_SET.has(name)) return;
      const score = r.getNum(H_SCORE);
      if (Number.isFinite(score)) dict.set(name, score);
    });

    // Fill arrays by SEA_ORDER
    barValues = [];
    SEA_ORDER.forEach(name => {
      if (dict.has(name)) barValues.push(dict.get(name));
    });

    // Compute pie as percentage of total score across SEA countries
    const total = barValues.reduce((a,b)=>a+b, 0);
    piePercents = (total > 0)
      ? barValues.map(v => (v/total) * 100)
      : [];

    // Sanity
    if (barValues.length === 0) {
      throw new Error('No SEA countries found in CSV.');
    }
  } catch (e){
    dataError = e.message || String(e);
  }
}

// ------------- Classes (unchanged except tiny bug fix) -------------
class Bar{
  constructor(bsWidth,hMax,position,easing,vals,color){
    colorMode(HSB);
    this.position = position;
    this.bsWidth = bsWidth;
    this.col = color;
    this.nbSet = vals.length;
    this.labels = []; // text labels (rounded)
    this.posLabels = [];
    this.vals = vals; // will be mapped to pixel heights
    this.hMax = hMax;
    this.shiftx = 5;
    this.barheights=[];
    this.bWidth = 0;
    this.parseColor();
    this.calcWidths(this.bsWidth);
    this.initBar();
    this.label();
    this.mapVals();
  }
  initBar(){
    for(let i=0;i<this.nbSet;i++) this.barheights[i] = 0;
  }
  parseColor(){
    this.h = hue(this.col);
    this.s = saturation(this.col);
    this.b = brightness(this.col);
  }
  calcWidths(){
    this.bWidth = this.bsWidth/this.nbSet;
    return this.bWidth;
  }
  mapVals(){
    const maxVal = max(this.vals);
    for(let i=0;i<this.nbSet;i++){
      this.vals[i] = map(this.vals[i], 0, maxVal, 0, this.hMax);
    }
  }
  label(){
    for(let i=0;i<this.nbSet;i++){
      this.labels[i] = round(this.vals[i]); // displaying pixel height; fine for demo
    }
  }
  update(){
    for(let i=0;i<this.nbSet;i++){
      this.barheights[i] += (this.vals[i]-this.barheights[i])*easing;
    }
  }
  display(){
    textAlign(CENTER,CENTER);
    push();
    translate(this.position.x-(this.bsWidth/2), this.position.y);
    this.update();
    for(let i=0;i<this.nbSet;i++){
      fill(this.h,this.s,this.b-((this.b/this.nbSet)*i));
      rect((i*this.bWidth)+(this.shiftx*i)/2, 0, this.bWidth, -this.barheights[i]);
      textSize(this.bWidth/4);
      text(this.labels[i], ((i*this.bWidth)+(this.shiftx*i))+(this.bWidth/2)-(this.shiftx*i/2), -this.barheights[i]-16);
    }
    pop();
  }
}

class Pie{
  constructor(radius,position,easing,vals,col){
    angleMode(DEGREES);
    colorMode(HSB);
    this.radius = radius;
    this.easing = easing;
    this.vals = vals; // percents
    this.col = col;
    this.position = position;
    this.degrees = [];
    this.labels = [];
    this.posLabels = [];
    this.angles = vals.slice(); // current animated angles
    this.nbSet = vals.length;
    this.percnt2deg();
    this.parseColor();
    this.label();
  }
  percnt2deg(){
    for(let i=0;i<this.nbSet;i++){
      if(i>=1){
        this.degrees[i] = this.degrees[i-1] + (360*this.vals[i])/100;
        this.posLabels[i]= (((360*this.vals[i])/100)/2) + (this.degrees[i-1]);
      } else {
        this.posLabels[i]= ((360*this.vals[i])/100)/2;
        this.degrees[i]  = (360*this.vals[i])/100;
      }
    }
  }
  parseColor(){
    this.h = hue(this.col);
    this.s = saturation(this.col);
    this.b = brightness(this.col);
  }
  label(){
    for(let i=0;i<this.nbSet;i++){
      this.labels[i] = nf(this.vals[i], 1, 1) + '%';
    }
  }
  update(){
    for(let i=0;i<this.nbSet;i++){
      this.angles[i] += (this.degrees[i]-this.angles[i])*easing;
    }
  }
  display(){
    textAlign(CENTER,CENTER);
    ellipseMode(CENTER);
    push();
    translate(this.position.x, this.position.y);
    this.update();

    // BUGFIX: start at nbSet-1, not nbSet (avoid out-of-bounds)
    for(let i=this.nbSet-1;i>=0;i--){
      const x = cos(this.posLabels[i]) * this.radius/3;
      const y = sin(this.posLabels[i]) * this.radius/3;
      fill(this.h,this.s,this.b-((this.b/this.nbSet)*i));
      arc(0,0,this.radius,this.radius, i===0?0:this.degrees[i-1], this.angles[i]);
      textSize(this.radius/8);
      text(this.labels[i], x, y);
    }
    pop();
  }
}
