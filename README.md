export default async function handler(req, res) {
  const token = process.env.OURA_TOKEN;
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const weightData = [
    {date:'Jan 1',w:120.2},{date:'Jan 8',w:118.2},{date:'Jan 15',w:118.8},{date:'Jan 22',w:117.0},
    {date:'Jan 29',w:116.8},{date:'Feb 5',w:117.6},{date:'Feb 12',w:118.8},{date:'Feb 19',w:117.0},
    {date:'Feb 26',w:119.4},{date:'Mar 5',w:120.6},{date:'Mar 12',w:119.6},{date:'Mar 19',w:119.2},
    {date:'Mar 26',w:121.6},{date:'Apr 2',w:121.2}
  ];

  const inbodyScans = [
    {date:'Dec 29, 2025', fatPct:30.5, muscleMass:46.5, fatMass:37.3, leanMass:84.9, visceralFat:67.6, bmr:1202},
    {date:'Apr 3, 2026', fatPct:27.7, muscleMass:49.2, fatMass:34.1, leanMass:89.3, visceralFat:61.8, bmr:1244},
  ];

  try {
    const [readiness, sleep, activity] = await Promise.all([
      fetch('https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=' + thirtyDaysAgo + '&end_date=' + today, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
      fetch('https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=' + thirtyDaysAgo + '&end_date=' + today, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
      fetch('https://api.ouraring.com/v2/usercollection/daily_activity?start_date=' + thirtyDaysAgo + '&end_date=' + today, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
    ]);

    const r = readiness.data && readiness.data[readiness.data.length - 1];
    const s = sleep.data && sleep.data[sleep.data.length - 1];
    const a = activity.data && activity.data[activity.data.length - 1];

    const scoreColor = (v) => v >= 80 ? '#1D9E75' : v >= 60 ? '#BA7517' : '#E24B4A';
    const wLabels = JSON.stringify(weightData.map(d => d.date));
    const wVals = JSON.stringify(weightData.map(d => d.w));
    const minW = Math.min(...weightData.map(d => d.w));
    const maxW = Math.max(...weightData.map(d => d.w));
    const ptColors = JSON.stringify(weightData.map(d => d.w === minW ? '#1D9E75' : d.w === maxW ? '#E24B4A' : '#378ADD'));
    const fatLabels = JSON.stringify(inbodyScans.map(d => d.date));
    const fatVals = JSON.stringify(inbodyScans.map(d => d.fatPct));

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Claire Health Dashboard</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f7f7f5;padding:2rem;color:#111;}
h1{font-size:22px;font-weight:500;margin-bottom:4px;}
.sub{font-size:13px;color:#888;margin-bottom:24px;}
.section{font-size:11px;font-weight:500;color:#999;text-transform:uppercase;letter-spacing:0.06em;margin:24px 0 10px;}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px;}
.card{background:#fff;border-radius:12px;padding:1rem 1.25rem;border:0.5px solid #e8e8e8;}
.label{font-size:12px;color:#888;margin-bottom:4px;}
.value{font-size:22px;font-weight:500;}
.unit{font-size:13px;color:#aaa;margin-left:2px;}
.chart-wrap{background:#fff;border-radius:12px;border:0.5px solid #e8e8e8;padding:1.25rem;margin-bottom:12px;}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid #f0f0f0;font-size:13px;}
.row:last-child{border-bottom:none;}
.good{color:#1D9E75;}
.warn{color:#BA7517;}
.tabs{display:flex;gap:8px;margin-bottom:16px;}
.tab{font-size:13px;padding:6px 16px;border-radius:8px;border:0.5px solid #e0e0e0;background:transparent;cursor:pointer;color:#888;}
.tab.active{background:#e8f4ff;color:#185FA5;border-color:transparent;font-weight:500;}
.panel{display:none;}
.panel.active{display:block;}
.water-row{display:flex;align-items:center;gap:12px;margin:10px 0;}
.water-btn{font-size:20px;padding:4px 10px;border-radius:8px;border:0.5px solid #e0e0e0;background:transparent;cursor:pointer;}
.prog-bg{background:#f0f0f0;border-radius:99px;height:6px;flex:1;}
.prog-fill{height:6px;border-radius:99px;background:#378ADD;}
.food-input{display:flex;gap:8px;margin-top:10px;}
.food-input input{flex:1;font-size:13px;padding:6px 10px;border-radius:8px;border:0.5px solid #ddd;background:#f7f7f5;}
.food-input button{font-size:13px;padding:6px 14px;border-radius:8px;border:0.5px solid #ddd;background:transparent;cursor:pointer;}
.food-item{font-size:13px;padding:5px 0;border-bottom:0.5px solid #f0f0f0;color:#444;}
.food-item:last-child{border-bottom:none;}
.badge{display:inline-block;font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px;margin-left:6px;}
.badge-scan{background:#e8f4ff;color:#185FA5;}
.badge-low{background:#e8f8f2;color:#1D9E75;}
.badge-high{background:#fdeaea;color:#A32D2D;}
.footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
</style>
</head>
<body>
<h1>Claire's Health Dashboard</h1>
<p class="sub">Updated ${new Date().toLocaleString('en-US',{dateStyle:'full',timeStyle:'short'})}</p>

<div class="tabs">
  <button class="tab active" onclick="showTab('oura')">Oura Ring</button>
  <button class="tab" onclick="showTab('inbody')">InBody</button>
  <button class="tab" onclick="showTab('weight')">Weight</button>
  <button class="tab" onclick="showTab('food')">Food & Water</button>
</div>

<div id="oura" class="panel active">
  <div class="section">Oura Ring — Latest</div>
  <div class="grid">
    <div class="card"><div class="label">Readiness</div><div class="value" style="color:${scoreColor(r && r.score)}">${r && r.score ? r.score : '—'}<span class="unit">/100</span></div></div>
    <div class="card"><div class="label">Sleep score</div><div class="value" style="color:${scoreColor(s && s.score)}">${s && s.score ? s.score : '—'}<span class="unit">/100</span></div></div>
    <div class="card"><div class="label">HRV</div><div class="value">${s && s.contributors && s.contributors.hrv_balance ? s.contributors.hrv_balance : '—'}<span class="unit">ms</span></div></div>
    <div class="card"><div class="label">Resting HR</div><div class="value">${s && s.contributors && s.contributors.resting_heart_rate ? s.contributors.resting_heart_rate : '—'}<span class="unit">bpm</span></div></div>
    <div class="card"><div class="label">Steps</div><div class="value">${a && a.steps ? a.steps.toLocaleString() : '—'}</div></div>
    <div class="card"><div class="label">Active cal</div><div class="value">${a && a.active_calories ? a.active_calories : '—'}<span class="unit">kcal</span></div></div>
  </div>
</div>

<div id="inbody" class="panel">
  <div class="section">Body Fat % — InBody History</div>
  <div class="chart-wrap"><canvas id="fatChart" height="80"></canvas></div>
  <div class="section">Scan Comparison</div>
  <div class="chart-wrap">
    <div class="row"><span style="color:#888">Body fat %</span><span>30.5% → <b>27.7%</b> <span class="good">-2.8%</span></span></div>
    <div class="row"><span style="color:#888">Muscle mass</span><span>46.5 → <b>49.2 lb</b> <span class="good">+2.7</span></span></div>
    <div class="row"><span style="color:#888">Body fat mass</span><span>37.3 → <b>34.1 lb</b> <span class="good">-3.2</span></span></div>
    <div class="row"><span style="color:#888">Lean body mass</span><span>84.9 → <b>89.3 lb</b> <span class="good">+4.4</span></span></div>
    <div class="row"><span style="color:#888">Visceral fat</span><span>67.6 → <b>61.8 cm²</b> <span class="good">-5.8</span></span></div>
    <div class="row"><span style="color:#888">BMR</span><span>1,202 → <b>1,244 kcal</b> <span class="good">+42</span></span></div>
    <div class="row"><span style="color:#888">Next scan</span><span><b>~May 10</b> (Mother's Day weekend)</span></div>
  </div>
</div>

<div id="weight" class="panel">
  <div class="section">Arboleaf — Weekly Weight 2026</div>
  <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">
    <div class="card"><div class="label">Latest (Apr 2)</div><div class="value">121.2<span class="unit">lb</span></div></div>
    <div class="card"><div class="label">All-time low</div><div class="value good">116.8<span class="unit">lb</span></div><div style="font-size:11px;color:#888;margin-top:2px;">Jan 29</div></div>
    <div class="card"><div class="label">Since Jan 1</div><div class="value warn">+1.0<span class="unit">lb</span></div></div>
  </div>
  <div class="chart-wrap"><canvas id="weightChart" height="100"></canvas></div>
  <div class="section">Full log</div>
  <div class="chart-wrap" id="weightLog"></div>
</div>

<div id="food" class="panel">
  <div class="section">Water intake today</div>
  <div class="chart-wrap">
    <div class="water-row">
      <button class="water-btn" onclick="changeWater(-8)">−</button>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px;"><span id="waterLabel">0 oz</span><span>Goal: 80 oz</span></div>
        <div class="prog-bg"><div class="prog-fill" id="waterBar" style="width:0%"></div></div>
      </div>
      <button class="water-btn" onclick="changeWater(8)">+</button>
    </div>
    <div style="font-size:11px;color:#aaa;">Each tap = 8 oz (1 cup)</div>
  </div>
  <div class="section">Food log — today</div>
  <div class="chart-wrap">
    <div id="foodList"><div style="font-size:13px;color:#aaa;">No food logged yet today.</div></div>
    <div class="food-input">
      <input type="text" id="foodInput" placeholder="e.g. chicken salad, 2 eggs, protein shake..." />
      <button onclick="addFood()">Add</button>
    </div>
  </div>
  <div class="section">Protein goal</div>
  <div class="chart-wrap">
    <div class="row"><span style="color:#888">Daily protein goal</span><span><b>90–110g</b></span></div>
    <div class="row"><span style="color:#888">Logged today</span><span id="proteinCount"><b>0g</b> <span style="color:#aaa;font-size:12px;">— add foods above</span></span></div>
  </div>
