import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Sphere, Html } from "@react-three/drei";
import { Activity, CalendarDays, Database, Layers3, MapPin, Waves, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const VARIABLE_META = {
  temperature: { label: "Temperature", unit: "°C", min: -2, max: 35 },
  salinity: { label: "Salinity", unit: "PSU", min: 30, max: 37 },
  currents: { label: "Currents", unit: "m/s", min: 0, max: 2 },
  ssh: { label: "Sea Surface Height", unit: "cm", min: -100, max: 100 },
};

function Globe({ markers, selected }) {
  return (
    <div className="globe-wrap">
      <Canvas camera={{ position: [0, 0, 3.4], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 3, 5]} intensity={2.2} />
        <Stars radius={80} depth={35} count={1600} factor={2} fade speed={0.25} />
        <Sphere args={[1, 64, 64]}>
          <meshStandardMaterial color="#0b4968" roughness={0.82} metalness={0.08} />
        </Sphere>
        <Sphere args={[1.008, 64, 64]}>
          <meshBasicMaterial color="#20b8e8" transparent opacity={0.11} wireframe />
        </Sphere>
        {markers.map((m, i) => {
          const lat = (m.lat * Math.PI) / 180;
          const lon = (m.lon * Math.PI) / 180;
          const r = 1.035;
          const x = r * Math.cos(lat) * Math.sin(lon);
          const y = r * Math.sin(lat);
          const z = r * Math.cos(lat) * Math.cos(lon);
          return (
            <Html key={m.platform_number || i} position={[x, y, z]} center>
              <div className="argo-dot" title={`Argo ${m.platform_number}`} />
            </Html>
          );
        })}
        {selected && (
          <Html position={[0, 0, 1.08]} center>
            <div className="globe-label">Selected point</div>
          </Html>
        )}
        <OrbitControls enablePan={false} minDistance={2.2} maxDistance={5} />
      </Canvas>
    </div>
  );
}

function App() {
  const [variable, setVariable] = useState("temperature");
  const [depth, setDepth] = useState(0);
  const [date, setDate] = useState("2026-09-20");
  const [lat, setLat] = useState(15);
  const [lon, setLon] = useState(85);
  const [point, setPoint] = useState(null);
  const [profile, setProfile] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Ready");

  const meta = VARIABLE_META[variable];

  const fetchData = async () => {
    setLoading(true);
    setMessage("Fetching live ocean data…");
    try {
      const pointUrl = `${API}/api/point?lat=${lat}&lon=${lon}&variable=${variable}&depth=${depth}&date=${date}`;
      const profileUrl = `${API}/api/profile?lat=${lat}&lon=${lon}&date=${date}`;
      const obsUrl = `${API}/api/observations?lat=${lat}&lon=${lon}&radius_km=500&date_from=${date}&date_to=${date}&limit=20`;

      const [pointRes, profileRes, obsRes] = await Promise.all([
        fetch(pointUrl),
        fetch(profileUrl),
        fetch(obsUrl),
      ]);

      if (!pointRes.ok) throw new Error(`Point API returned ${pointRes.status}`);
      const pointJson = await pointRes.json();
      setPoint(pointJson);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (obsRes.ok) setObservations(await obsRes.json());

      setMessage("Live data loaded");
    } catch (err) {
      console.error(err);
      setMessage("Could not reach the backend. Is FastAPI running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!profile) return [];
    return profile.depths.map((d, i) => ({
      depth: d,
      temperature: profile.temperature?.[i],
      salinity: profile.salinity?.[i],
    }));
  }, [profile]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Waves size={21} /></div>
          <div>
            <div className="brand-name">OceanVista <span>3D</span></div>
            <div className="brand-sub">Ocean intelligence platform</div>
          </div>
        </div>
        <div className="live-status"><span /> LIVE COPERNICUS + ARGO</div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">INDIAN OCEAN • BAY OF BENGAL</p>
            <h1>Explore the ocean in <em>space, time & depth.</em></h1>
            <p className="hero-copy">Interactive 3D exploration of numerical ocean models and real Argo observations.</p>
          </div>
          <button className="refresh" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {loading ? "Loading" : "Refresh data"}
          </button>
        </section>

        <section className="control-panel card">
          <div className="control-group variable-control">
            <label><Layers3 size={15} /> Variable</label>
            <select value={variable} onChange={(e) => setVariable(e.target.value)}>
              {Object.entries(VARIABLE_META).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          <div className="control-group depth-control">
            <label><span>Depth</span><strong>{depth} m</strong></label>
            <input type="range" min="0" max="1000" step="10" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
            <div className="range-labels"><span>Surface</span><span>1000 m</span></div>
          </div>

          <div className="control-group">
            <label><CalendarDays size={15} /> Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="control-group coords">
            <label><MapPin size={15} /> Location</label>
            <div className="coord-inputs">
              <input type="number" value={lat} min="-90" max="90" step="0.1" onChange={(e) => setLat(e.target.value)} />
              <input type="number" value={lon} min="-180" max="180" step="0.1" onChange={(e) => setLon(e.target.value)} />
            </div>
          </div>

          <button className="apply" onClick={fetchData}>Explore</button>
        </section>

        <section className="main-grid">
          <div className="card globe-card">
            <div className="card-header">
              <div>
                <div className="section-title">3D Ocean View</div>
                <div className="muted">Drag to rotate • scroll to zoom</div>
              </div>
              <div className="source-pill"><Database size={13} /> Copernicus Marine</div>
            </div>
            <Globe markers={observations} selected={point} />
          </div>

          <aside className="side-column">
            <div className="card value-card">
              <div className="card-header">
                <div className="section-title">{meta.label}</div>
                <Activity size={17} />
              </div>
              {point ? (
                <>
                  <div className="big-value">{Number(point.value).toFixed(2)} <small>{point.unit}</small></div>
                  <div className="value-meta">
                    <span>Lat {Number(point.lat).toFixed(2)}°</span>
                    <span>Lon {Number(point.lon).toFixed(2)}°</span>
                    <span>{point.depth} m</span>
                  </div>
                </>
              ) : <div className="empty">No point data yet.</div>}
              <div className="status-line"><span /> {message}</div>
            </div>

            <div className="card stats-card">
              <div className="section-title">Argo observations</div>
              <div className="argo-stat"><strong>{observations.length}</strong><span>profiles nearby</span></div>
              <div className="mini-list">
                {observations.slice(0, 4).map((o) => (
                  <div className="mini-row" key={o.platform_number}>
                    <div><span className="dot" />{o.platform_number}</div>
                    <span>{Number(o.lat).toFixed(2)}°, {Number(o.lon).toFixed(2)}°</span>
                  </div>
                ))}
                {!observations.length && <div className="muted">No profiles found for this date.</div>}
              </div>
            </div>
          </aside>
        </section>

        <section className="card profile-card">
          <div className="card-header">
            <div>
              <div className="section-title">Water-column profile</div>
              <div className="muted">Model temperature and salinity at the selected location</div>
            </div>
            <div className="source-pill">0–1000 m</div>
          </div>
          <div className="chart">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="depth" label={{ value: "Depth (m)", position: "insideBottom", offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke="#25b7e6" strokeWidth={2.5} dot={false} name="Temperature °C" />
                  <Line type="monotone" dataKey="salinity" stroke="#a78bfa" strokeWidth={2.5} dot={false} name="Salinity PSU" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="empty">Profile data will appear here after loading.</div>}
          </div>
        </section>

        <footer>
          <span>OceanVista 3D</span>
          <span>Data: Copernicus Marine • Argo</span>
          <span>Backend: FastAPI</span>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
