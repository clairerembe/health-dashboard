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
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:8px;}
.card{background:#fff;border-radius:12px;padding:1rem 1.25rem;border:0.5px solid #e8e8e8;}
.label{font-size:12px;color:#888;margin-bottom:4px;}
.value{font-size:22px;font-weight:500;}
.unit{font-size:13px;color:#aaa;margin-left:2px;}
.chart-wrap{background:#fff;border-radius:12px;border:0.5px solid #e8e8e8;padding:1.25rem;margin-bottom:8px;}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid #f0f0f0;font-size:13px;}
.row:last-child{border-bottom:none;}
.good{color:#1D9E75;}
.footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
</style>
</head>
<body>
<h1>Claire's Health Dashboard</h1>
<p class="sub">Updated ${new Date().toLocaleString('en-US',{dateStyle:'full',timeStyle:'short'})}</p>

<div class="section">Oura Ring — Latest</div>
<div class="grid">
  <div class="card"><div class="label">Readiness</div><div class="value" style="color:${scoreColor(r && r.score)}">${r && r.score ? r.score : '—'}<span class="unit">/100</span></div></div>
  <div class="card"><div class="label">Sleep score</div><div class="value" style="color:${scoreColor(s && s.score)}">${s && s.score ? s.score : '—'}<span class="unit">/100</span></div></div>
  <div class="card"><div class="label">HRV</div><div class="value">${s && s.contributors && s.contributors.hrv_balance ? s.contributors.hrv_balance : '—'}<span class="unit">ms</span></div></div>
  <div class="card"><div class="label">Resting HR</div><div class="value">${s && s.contributors && s.contributors.resting_heart_rate ? s.contributors.resting_heart_rate : '—'}<span class="unit">bpm</span></div></div>
  <div class="card"><div class="label">Steps</div><div class="value">${a && a.steps ? a.steps.toLocaleString() : '—'}</div></div>
  <div class="card"><div class="label">Active cal</div><div class="value">${a && a.active_calories ? a.active_calories : '—'}<span class="unit">kcal</span></div></div>
</div>

<div class="section">Body Fat % — InBody History</div>
<div class="chart-wrap"><canvas id="fatChart" height="80"></canvas></div>

<div class="section">InBody Comparison</div>
<div class="chart-wrap">
  <div class="row"><span style="color:#888">Body fat %</span><span>30.5% → <b>27.7%</b> <span class="good">-2.8%</span></span></div>
  <div class="row"><span style="color:#888">Muscle mass</span><span>46.5 → <b>49.2 lb</b> <span class="good">+2.7</span></span></div>
  <div class="row"><span style="color:#888">Body fat mass</span><span>37.3 → <b>34.1 lb</b> <span class="good">-3.2</span></span></div>
  <div class="row"><span style="color:#888">Lean body mass</span><span>84.9 → <b>89.3 lb</b> <span class="good">+4.4</span></span></div>
  <div class="row"><span style="color:#888">Visceral fat</span><span>67.6 → <b>61.8 cm²</b> <span class="good">-5.8</span></span></div>
  <div class="row"><span style="color:#888">BMR</span><span>1,202 → <b>1,244 kcal</b> <span class="good">+42</span></span></div>
  <div class="row"><span style="color:#888">Next scan</span><span><b>~May 10</b> (Mother's Day weekend)</span></div>
</div>

<div class="section">Arboleaf — Weekly Weight 2026</div>
<div class="chart-wrap"><canvas id="weightChart" height="80"></canvas></div>

<p class="footer">Refresh for live Oura data · Weight logged every Thursday · InBody tracked each scan</p>

<script>
new Chart(document.getElementById('fatChart'),{type:'line',data:{labels:['Dec 29, 2025','Apr 3, 2026','May ~10, 2026'],datasets:[{label:'Body fat %',data:[30.5,27.7,null],borderColor:'#1D9E75',backgroundColor:'rgba(29,158,117,0.08)',tension:0.3,pointRadius:6,pointBackgroundColor:'#1D9E75',fill:true,spanGaps:false}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:20,max:35,ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}}}});
var wL=${wLabels};var wV=${wVals};var ptC=${ptColors};
new Chart(document.getElementById('weightChart'),{type:'line',data:{labels:wL,datasets:[{label:'Weight',data:wV,borderColor:'#378ADD',backgroundColor:'rgba(55,138,221,0.07)',tension:0
