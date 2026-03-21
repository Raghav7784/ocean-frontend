import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import './App.css';

const API = 'http://127.0.0.1:8000/api';

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#111827', borderRadius: 12, padding: '20px 24px', border: '1px solid #1f2937' }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function App() {
  const [stats, setStats] = useState(null);
  const [buoys, setBuoys] = useState([]);
  const [selectedBuoy, setSelectedBuoy] = useState('42001');
  const [readings, setReadings] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [sensor, setSensor] = useState('WTMP');
  const [loading, setLoading] = useState(true);
  const [buoyStats, setBuoyStats] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchReadings(); }, [selectedBuoy, sensor]);

  async function fetchAll() {
    try {
      const s = await fetch(`${API}/stats`).then(r => r.json());
      const b = await fetch(`${API}/buoys`).then(r => r.json());
      const a = await fetch(`${API}/anomalies?limit=50`).then(r => r.json());
      const bs = await fetch(`${API}/buoy_stats`).then(r => r.json());
      const hm = await fetch(`${API}/heatmap`).then(r => r.json());
      setStats(s);
      setBuoys(b.buoys || []);
      setAnomalies(a.anomalies || []);
      setBuoyStats(bs.buoy_stats || []);
      setHeatmap(hm.heatmap || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function fetchReadings() {
    try {
      const r = await fetch(`${API}/readings/${selectedBuoy}?limit=200`).then(r => r.json());
      const data = (r.readings || [])
        .filter(d => d[sensor] != null)
        .map(d => ({
          time: new Date(d.timestamp).toLocaleDateString(),
          value: parseFloat(d[sensor]).toFixed(2),
          anomaly: d.is_anomaly === -1,
        }))
        .reverse();
      setReadings(data);
    } catch (e) { console.error(e); }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0f1e', color: '#00d4ff', fontSize: 24 }}>
      Loading Ocean Data...
    </div>
  );

  const HOURS = ['12am','2am','4am','6am','8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'];

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'sans-serif', padding: 24 }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#00d4ff', margin: 0, fontSize: 28 }}>Ocean Anomaly Detection</h1>
        <p style={{ color: '#888', margin: '4px 0 0' }}>Live NOAA buoy monitoring powered by Isolation Forest and MongoDB</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Readings" value={stats?.total_readings?.toLocaleString()} color="#00d4ff" />
        <StatCard label="Anomalies Flagged" value={stats?.total_anomalies?.toLocaleString()} color="#ff4757" />
        <StatCard label="Buoys Monitored" value={stats?.buoys_monitored} color="#2ed573" />
      </div>

      {/* Anomaly rate bar chart per buoy */}
      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>Anomaly rate per buoy (%)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={buoyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="buoy_id" tick={{ fill: '#888', fontSize: 12 }} />
            <YAxis tick={{ fill: '#888', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }} />
            <Bar dataKey="anomaly_pct" radius={[4, 4, 0, 0]}>
              {buoyStats.map((entry, i) => (
                <Cell key={i} fill={entry.anomaly_pct > 10 ? '#ff4757' : entry.anomaly_pct > 5 ? '#ffa502' : '#2ed573'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly heatmap by hour */}
      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>Anomaly heatmap — hour of day</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
          {heatmap.map((h, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                height: 48, borderRadius: 6,
                background: `rgba(255, 71, 87, ${Math.min(h.count / 50, 1)})`,
                border: '1px solid #1f2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff'
              }}>{h.count}</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{HOURS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time series */}
      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Buoy</label>
            <select value={selectedBuoy} onChange={e => setSelectedBuoy(e.target.value)}
              style={{ background: '#1f2937', color: '#e0e0e0', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px' }}>
              {buoys.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Sensor</label>
            <select value={sensor} onChange={e => setSensor(e.target.value)}
              style={{ background: '#1f2937', color: '#e0e0e0', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px' }}>
              {['WTMP', 'ATMP', 'PRES', 'WSPD', 'WVHT'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff' }}>Buoy {selectedBuoy} — {sensor} readings</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={readings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 11 }} interval={20} />
            <YAxis tick={{ fill: '#888', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" stroke="#00d4ff" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alert feed */}
      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#ff4757' }}>Recent anomaly alerts</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Buoy</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Timestamp</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Water Temp</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Pressure</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Wind Speed</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Anomaly Score</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.slice(0, 15).map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '10px 12px', color: '#00d4ff' }}>{a.buoy_id}</td>
                <td style={{ padding: '10px 12px', color: '#888' }}>{new Date(a.timestamp).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>{a.WTMP ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{a.PRES ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{a.WSPD ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: '#ff4757' }}>{a.anomaly_score?.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default App;