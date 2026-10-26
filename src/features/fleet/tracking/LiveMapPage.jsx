import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { Pause, Play } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PageHeader from '@/components/ui/PageHeader';
import { fmtDateTime, fmtRange } from '@/lib/format';
import { BUS_TYPE, MISSION_STATUS } from '../shared/status';
import { useLive, useTrack } from './hooks';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; contributeurs OpenStreetMap';

const STATE = {
  moving:      { label: 'En route',      cls: 'ok' },
  idle:        { label: "À l'arrêt",     cls: 'gold' },
  alert:       { label: 'Alerte',        cls: 'bad' },
  offline:     { label: 'Signal perdu',  cls: 'warn' },
  no_position: { label: 'Aucun signal',  cls: 'muted' },
};
const FILTERS = [['all', 'Tous'], ['moving', 'En route'], ['idle', "À l'arrêt"], ['alert', 'Alerte'], ['offline', 'Sans signal']];
const matches = (b, f) => f === 'all' || (f === 'offline' ? b.state === 'offline' || b.state === 'no_position' : b.state === f);

const agoText = (s) => {
  if (s == null) return 'jamais';
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Les icônes sont mises en cache : même identité d'une actualisation à l'autre, donc pas de clignotement
const iconCache = new Map();
const busIcon = (b, selected) => {
  const heading = Math.round((b.heading ?? 0) / 5) * 5;
  const key = `${b.code}|${b.state}|${heading}|${selected}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'bm-wrap',
      html: `<div class="bm ${b.state}${selected ? ' sel' : ''}"><span class="bm-arrow" style="transform:rotate(${heading}deg)"></span><span class="bm-dot"></span><span class="bm-code">${esc(b.code)}</span></div>`,
      iconSize: [56, 46],
      iconAnchor: [28, 13],
    }));
  }
  return iconCache.get(key);
};

function FitOnce({ points }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 12 });
  }, [points, map]);
  return null;
}

function Focus({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.pos, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function LiveMapPage() {
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [hours, setHours] = useState(0);
  const [focus, setFocus] = useState(null);

  const { data, error, dataUpdatedAt } = useLive(auto);
  const buses = data?.buses ?? [];
  const summary = data?.summary;
  const sinceFetch = dataUpdatedAt ? Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000)) : 0;
  const age = (b) => (b.age_seconds == null ? null : b.age_seconds + sinceFetch);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return buses.filter((b) => matches(b, filter)
      && (!t || [b.code, b.plate_number, b.driver?.name].filter(Boolean).some((x) => x.toLowerCase().includes(t))));
  }, [buses, filter, q]);

  const allPoints = useMemo(() => buses.filter((b) => b.lat != null).map((b) => [b.lat, b.lng]), [buses]);
  const selected = buses.find((b) => b.id === selectedId) ?? null;
  const track = useTrack(selected?.id, hours);
  const trackPoints = (track.data ?? []).map((p) => [p.lat, p.lng]);

  const select = (b) => {
    setSelectedId(b.id);
    if (b.lat != null) setFocus({ pos: [b.lat, b.lng], key: Date.now() });
  };

  const counts = { all: summary?.total, moving: summary?.moving, idle: summary?.idle, alert: summary?.alert,
    offline: (summary?.offline ?? 0) + (summary?.no_position ?? 0) };

  return (
    <>
      <PageHeader title="Suivi en direct" action={(
        <div className="row-tools">
          <span className="muted">{error ? 'Connexion perdue' : dataUpdatedAt ? `Actualisé ${agoText(sinceFetch)}` : ''}</span>
          <button className="btn ghost" onClick={() => setAuto(!auto)}>
            {auto ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Reprendre</>}
          </button>
        </div>
      )} />

      {error && <div className="alert bad">Impossible de joindre le serveur : {error.message}. Nouvelle tentative automatique.</div>}

      <div className="live-layout">
        <aside className="live-side">
          <input placeholder="Bus, immatriculation, chauffeur…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg live-chips">
            {FILTERS.map(([k, label]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label} {counts[k] != null ? `(${counts[k]})` : ''}</button>
            ))}
          </div>

          <div className="live-list">
            {shown.map((b) => (
              <button key={b.id} className={`live-item ${b.id === selectedId ? 'sel' : ''}`} onClick={() => select(b)}>
                <span className="live-row">
                  <strong>{b.code}</strong>
                  <span className={`badge ${BUS_TYPE[b.bus_type]?.cls}`}>{BUS_TYPE[b.bus_type]?.label}</span>
                  <span className={`badge ${STATE[b.state].cls}`} style={{ marginLeft: 'auto' }}>{STATE[b.state].label}</span>
                </span>
                <span className="muted">{b.driver?.name ?? 'Sans chauffeur'}{b.mission ? ` · ${b.mission.title}` : ''}</span>
                <small className="muted">
                  {b.lat == null ? 'Aucune position reçue' : `${Math.round(b.speed_kmh ?? 0)} km/h · ${agoText(age(b))}`}
                  {b.alerts.total > 0 && <span className="live-alerts"> · {b.alerts.total} alerte(s)</span>}
                </small>
              </button>
            ))}
            {data && shown.length === 0 && <p className="muted">Aucun bus pour ce filtre.</p>}
          </div>

          {selected && (
            <div className="card live-detail">
              <div className="title-row">
                <strong style={{ fontSize: 16 }}>{selected.code}</strong>
                <span className="muted">{selected.plate_number} · {selected.seats} places</span>
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedId(null); setHours(0); }}>Fermer</button>
              </div>

              {selected.driver ? (
                <div className="person" style={{ margin: '10px 0' }}>
                  <Avatar src={selected.driver.photo} name={selected.driver.name} size={38} />
                  <div><strong>{selected.driver.name}</strong><br />
                    {selected.driver.phone && <a href={`tel:${selected.driver.phone}`}>{selected.driver.phone}</a>}</div>
                </div>
              ) : <p className="muted">Aucun chauffeur attitré.</p>}

              {selected.mission && (
                <div className="note-box" style={{ marginBottom: 10 }}>
                  <strong>{selected.mission.title}</strong> <span className={`badge ${MISSION_STATUS[selected.mission.status]?.cls}`}>{MISSION_STATUS[selected.mission.status]?.label}</span><br />
                  <small className="muted">{fmtRange(selected.mission.starts_at, selected.mission.ends_at)}</small><br />
                  <small>{[selected.mission.pickup_place, selected.mission.destination].filter(Boolean).join(' → ') || '—'}{selected.mission.pax ? ` · ${selected.mission.pax} pers.` : ''}</small>
                </div>
              )}

              {selected.lat != null ? (
                <p className="kv" style={{ margin: '0 0 10px' }}>
                  Vitesse : <strong>{Math.round(selected.speed_kmh ?? 0)} km/h</strong><br />
                  Dernier signal : {agoText(age(selected))} <small className="muted">({fmtDateTime(selected.recorded_at)})</small><br />
                  <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>
                </p>
              ) : <p className="muted">Ce bus n'a encore transmis aucune position.</p>}

              {selected.lat != null && (
                <div className="seg" style={{ marginBottom: 10 }}>
                  {[[0, 'Sans trajet'], [2, '2 h'], [6, '6 h'], [24, '24 h']].map(([h, label]) => (
                    <button key={h} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>{label}</button>
                  ))}
                </div>
              )}
              {hours > 0 && track.isSuccess && trackPoints.length === 0 && <small className="muted">Aucune position enregistrée sur cette période.</small>}

              <div className="row-tools">
                {selected.alerts.total > 0 && <Link className="btn ghost sm" to="/fleet/alerts">Voir les alertes ({selected.alerts.total})</Link>}
                <Link className="btn ghost sm" to="/fleet/missions">Missions</Link>
              </div>
            </div>
          )}
        </aside>

        <div className="live-map">
          <MapContainer center={[35.8, 10.6]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
            <FitOnce points={allPoints} />
            <Focus target={focus} />
            {hours > 0 && trackPoints.length > 1 && <Polyline positions={trackPoints} pathOptions={{ color: '#0b6479', weight: 4, opacity: 0.8 }} />}
            {shown.filter((b) => b.lat != null).map((b) => (
              <Marker key={b.id} position={[b.lat, b.lng]} icon={busIcon(b, b.id === selectedId)}
                      zIndexOffset={b.id === selectedId ? 1000 : 0} eventHandlers={{ click: () => select(b) }} />
            ))}
          </MapContainer>
        </div>
      </div>
    </>
  );
}