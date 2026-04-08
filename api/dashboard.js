export default async function handler(req, res) {
  const token = process.env.OURA_TOKEN;
  
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const [readiness, sleep, activity] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${thirtyDaysAgo}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${thirtyDaysAgo}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${thirtyDaysAgo}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
    ]);

    const latestReadiness = readiness.data?.[readiness.data.length - 1];
    const latestSleep = sleep.data?.[sleep.data.length - 1];
    const latestActivity = activity.data?.[activity.data.length - 1];

    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Claire's Health Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 2rem; }
    h1 { font-size: 22px; font-weight: 500; margin-bottom: 6px; }
    .sub { font-size: 14px; color: #888; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: white; border-radius: 12px; padding: 1rem 1.25rem; border: 0.5px solid #e5e5e5; }
    .label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .value { font-size: 24px; font-weight: 500; color: #111; }
    .unit { font-size: 14px; color: #888; margin-left: 2px; }
    .section { font-size: 13px; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; margin-top: 24px; }
    .refresh { font-size: 13px; color: #888; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Claire's Health Dashboard</h1>
  <p class="sub">Last updated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>

  <div class="section">Oura — Today</div>
  <div class="grid">
    <div class="card">
      <div class="label">Readiness</div>
      <div class="value">${latestReadiness?.score ?? '—'}<span class="unit">/100</span></div>
    </div>
    <div class="card">
      <div class="label">Sleep score</div>
      <div class="value">${latestSleep?.score ?? '—'}<span class="unit">/100</span></div>
    </div>
    <div class="card">
      <div class="label">HRV</div>
      <div class="value">${latestSleep?.contributors?.hrv_balance ?? '—'}<span class="unit">ms</span></div>
    </div>
    <div class="card">
      <div class="label">Steps</div>
      <div class="value">${latestActivity?.steps?.toLocaleString() ?? '—'}</div>
    </div>
    <div class="card">
      <div class="label">Active calories</div>
      <div class="value">${latestActivity?.active_calories ?? '—'}<span class="unit">kcal</span></div>
    </div>
    <div class="card">
      <div class="label">Resting HR</div>
      <div class="value">${latestSleep?.contributors?.resting_heart_rate ?? '—'}<span class="unit">bpm</span></div>
    </div>
  </div>

  <div class="section">InBody — Last scan (Apr 3, 2026)</div>
  <div class="grid">
    <div class="card">
      <div class="label">Body fat %</div>
      <div class="value">27.7<span class="unit">%</span></div>
    </div>
    <div class="card">
      <div class="label">Muscle mass</div>
      <div class="value">49.2<span class="unit">lb</span></div>
    </div>
    <div class="card">
      <div class="label">Visceral fat</div>
      <div class="value">61.8</div>
    </div>
    <div class="card">
      <div class="label">BMR</div>
      <div class="value">1244<span class="unit">kcal</span></div>
    </div>
  </div>

  <p class="refresh">Refresh this page anytime for live Oura data.</p>
</body>
</html>
    `);
  } catch (err) {
    res.status(500).send('Error fetching Oura data: ' + err.message);
  }
}
