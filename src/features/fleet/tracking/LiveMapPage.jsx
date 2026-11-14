import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Gauge, MapPin, Maximize2, Phone,
  Route as RouteIcon, Search, User, X,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { assetUrl, fmtRange } from '@/lib/format';
import { BUS_TYPE, MISSION_STATUS } from '../shared/status';
import { useBusStats, useDayStats, useLive, useTrack } from './hooks';
import './live.css';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = import.meta.env.VITE_TILE_ATTRIBUTION || '&copy; contributeurs OpenStreetMap';

const STATE = {
  moving: 'En route', speeding: 'Excès de vitesse', idle: 'Au ralenti', parked: 'Garé',
  alert: 'Alerte', offline: 'Signal perdu', no_position: 'Aucun signal',
};
const FILTERS = [
  ['all', 'Tous'], ['moving', 'En route'], ['idle', 'Ralenti'], ['parked', 'Garés'], ['alert', 'Alertes'], ['offline', 'Sans signal'],
];
const matches = (b, f) => {
  if (f === 'all') return true;
  if (f === 'moving') return b.state === 'moving' || b.state === 'speeding';
  if (f === 'alert') return b.state === 'alert' || b.state === 'speeding';
  if (f === 'offline') return b.state === 'offline' || b.state === 'no_position';
  return b.state === f;
};

const agoText = (s) => {
  if (s == null) return 'jamais';
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
};
const fmtKm = (n) => (n == null ? '—' : `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`);
const fmtMin = (m) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
/** recorded_at arrive de MySQL en UTC, sans fuseau : on l'interprète comme UTC et on affiche l'heure de Tunis */
const utcDate = (s) => {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtUtc = (s) => {
  const d = utcDate(s);
  return d ? d.toLocaleString('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'medium' }) : '—';
};
const fmtClock = (s) => {
  const d = utcDate(s);
  return d ? d.toLocaleTimeString('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' }) : '—';
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const firstName = (n) => (n ? String(n).trim().split(/\s+/)[0] : '');
const tripText = (m) => [m?.pickup_place, m?.destination].filter(Boolean);

const BUS_PATH = 'M4 16c0 .9.4 1.7 1 2.2V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.8c.6-.5 1-1.3 1-2.2V6c0-3-3.1-4-8-4S4 3 4 6v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z';

/** Petit bus de profil, utilisé en vignette et dans la fiche */
function BusArt({ color = '#0a7c95' }) {
  return (
    <svg viewBox="0 0 160 80" role="img" aria-label="Bus">
      <ellipse cx="80" cy="73" rx="62" ry="4" fill="rgba(6,48,58,.12)" />
      <rect x="8" y="10" width="144" height="54" rx="14" fill={color} />
      <rect x="8" y="44" width="144" height="8" fill="rgba(0,0,0,.14)" />
      {[18, 48, 78, 108].map((x) => <rect key={x} x={x} y="18" width="24" height="20" rx="4" fill="#dff3f8" />)}
      <rect x="136" y="18" width="12" height="26" rx="4" fill="#dff3f8" />
      <rect x="8" y="56" width="144" height="4" fill="#f2b705" />
      {[36, 118].map((x) => (
        <g key={x}><circle cx={x} cy="64" r="10" fill="#06303a" /><circle cx={x} cy="64" r="4" fill="#cfd9dc" /></g>
      ))}
    </svg>
  );
}

/** Photo réelle du bus (image_url, comme sur la page Bus) ; dessin de secours si absente ou introuvable */
function BusImage({ b, large }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [b.image_url]);
  if (!b.image_url || failed) return <BusArt />;
  return (
    <img className={large ? 'lm-photo lg' : 'lm-photo'} src={assetUrl(b.image_url)} alt={`Bus ${b.code}`}
         loading="lazy" onError={() => setFailed(true)} />
  );
}

// Icônes mises en cache : même identité d'une actualisation à l'autre, pas de clignotement
const iconCache = new Map();
const busIcon = (b, selected) => {
  const heading = Math.round((b.heading ?? 0) / 5) * 5;
  const label = [b.code, firstName(b.driver?.name)].filter(Boolean).join(' · ');
  const key = `${label}|${b.state}|${heading}|${selected}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'lm-wrap',
      html: `<div class="lm-mk ${b.state}${selected ? ' sel' : ''}"><div class="lm-mk-disc"><span class="lm-mk-arrow" style="transform:rotate(${heading}deg)"></span><svg viewBox="0 0 24 24" fill="currentColor"><path d="${BUS_PATH}"/></svg></div><span class="lm-mk-label">${esc(label)}</span></div>`,
      iconSize: [120, 64],
      iconAnchor: [60, 20],
    }));
  }
  return iconCache.get(key);
};

/** Cadre la carte sur la flotte au premier chargement, puis à chaque clic sur « Toute la flotte » (trigger) */
function Fit({ points, trigger }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 12 });
  }, [points, map]);
  useEffect(() => {
    if (trigger > 0 && points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}
function Focus({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.pos, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [target, map]);
  return null;
}
/** Le conteneur change de taille à la sélection : Leaflet doit le recalculer */
function Resize({ dep }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 60); return () => clearTimeout(t); }, [dep, map]);
  return null;
}

/** Bandeau d'indicateurs du jour */
function Kpis({ summary, totals }) {
  const running = (summary?.moving ?? 0) + (summary?.speeding ?? 0);
  const speedingNow = summary?.speeding ?? 0;
  const anomalies = summary?.anomalies ?? 0;
  const items = [
    { icon: Activity, label: 'En circulation', value: summary ? `${running} / ${summary.total}` : '—',
      sub: summary ? `${summary.parked ?? 0} garé(s) · ${summary.idle ?? 0} au ralenti` : '' },
    { icon: RouteIcon, label: "Distance aujourd'hui", value: fmtKm(totals?.distance_km),
      sub: totals ? `${fmtMin(totals.moving_minutes)} de conduite cumulée` : '' },
    { icon: Gauge, label: 'Excès de vitesse', value: String(totals?.speeding_count ?? 0),
      sub: speedingNow > 0 ? `${speedingNow} en cours` : "aujourd'hui", warn: speedingNow > 0 },
    { icon: AlertTriangle, label: 'Anomalies', value: String(anomalies),
      sub: anomalies > 0 ? 'à vérifier' : 'tout est normal', warn: anomalies > 0 },
  ];
  return (
    <div className="lm-kpis">
      {items.map(({ icon: Icon, label, value, sub, warn }) => (
        <div key={label} className={`lm-kpi ${warn ? 'warn' : ''}`}>
          <Icon aria-hidden="true" />
          <div><small>{label}</small><b>{value}</b><em>{sub}</em></div>
        </div>
      ))}
    </div>
  );
}

function BusCard({ b, selected, onSelect, age, km }) {
  const trip = tripText(b.mission);
  const n = b.anomalies?.length ?? 0;
  return (
    <button className={`lm-card ${selected ? 'sel' : ''}`} onClick={() => onSelect(b)} aria-pressed={selected}>
      <span className="lm-thumb"><BusImage b={b} />{b.plate_number}</span>
      <span>
        <span className="lm-top">
          <strong>{b.code}</strong>
          <span className={`lm-st ${b.state}`}>{STATE[b.state]}</span>
        </span>
        <span className="lm-meta">
          <span><Gauge size={14} />{b.lat == null ? '—' : `${Math.round(b.speed_kmh ?? 0)} km/h`}</span>
          <span><Clock size={14} />{b.lat == null ? 'Aucun signal' : agoText(age(b))}</span>
        </span>
      </span>
      <span className={`lm-driver ${b.driver ? '' : 'none'}`}>
        <User size={15} /><span>{b.driver?.name ?? 'Sans chauffeur'}</span>
      </span>
      {(km != null || n > 0) && (
        <span className="lm-extra">
          {km != null && <span><RouteIcon size={13} />{fmtKm(km)} aujourd'hui</span>}
          {n > 0 && <span className="lm-flag"><AlertTriangle size={13} />{n} anomalie{n > 1 ? 's' : ''}</span>}
        </span>
      )}
      {trip.length > 0 && (
        <span className="lm-route"><em>Trajet</em><span>{trip[0]}</span>{trip[1] && <><ArrowRight size={13} /><span>{trip[1]}</span></>}</span>
      )}
    </button>
  );
}

function Panel({ b, onClose, hours, setHours, track, trackCount, age, stats }) {
  if (!b) {
    return (
      <div className="lm-ph">
        <BusArt />
        <strong style={{ color: 'var(--ink)' }}>Détails du véhicule</strong>
        <span>Sélectionnez un bus dans la liste ou sur la carte pour voir sa vitesse, ses statistiques du jour et ses anomalies.</span>
      </div>
    );
  }
  const m = b.mission;
  const trip = tripText(m);
  const t = stats?.today;
  const ms = stats?.mission;
  const speed = Math.round(b.speed_kmh ?? 0);
  const limit = b.speed_limit_kmh ?? 90;
  const scale = limit * 1.4;
  const ign = b.ignition == null ? '—' : b.ignition ? 'Allumé' : 'Coupé';

  return (
    <>
      <button className="lm-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
      <h2>Détails du véhicule</h2>
      <div className="lm-hero"><BusImage b={b} large /></div>

      <div className="lm-box" style={{ marginTop: 0 }}>
        <h3>Chauffeur</h3>
        {b.driver ? (
          <div className="lm-person">
            <Avatar src={b.driver.photo} name={b.driver.name} size={44} />
            <div><strong>{b.driver.name}</strong><small style={{ color: 'var(--mute)' }}>{b.driver.phone || 'Téléphone non renseigné'}</small></div>
            {b.driver.phone && <a className="lm-call" href={`tel:${b.driver.phone}`}><Phone size={14} /> Appeler</a>}
          </div>
        ) : <span style={{ color: 'var(--mute)' }}>Aucun chauffeur attitré.</span>}
      </div>

      <div className="lm-box">
        <h3>État actuel</h3>
        {b.lat != null ? (
          <>
            <div className="lm-speed">
              <strong>{speed}<small>km/h</small></strong>
              <span className={`lm-st ${b.state}`}>{STATE[b.state]}</span>
            </div>
            <div className="lm-bar" aria-hidden="true">
              <i className={speed > limit ? 'over' : ''} style={{ width: `${Math.min(100, (speed / scale) * 100)}%` }} />
              <s style={{ left: `${(limit / scale) * 100}%` }} />
            </div>
            <small style={{ color: 'var(--mute)' }}>Limite : {limit} km/h</small>
            <dl className="lm-kv" style={{ marginTop: 10 }}>
              <dt>Contact</dt><dd>{ign}</dd>
              <dt>Dernier signal</dt><dd>{agoText(age(b))}</dd>
              <dt>Date et heure</dt><dd>{fmtUtc(b.recorded_at)}</dd>
              <dt>Kilométrage total</dt><dd>{fmtKm(b.odometer_km)}</dd>
            </dl>
            {b.state === 'offline' && <small className="lm-warn">Moteur allumé mais plus de données reçues : la dernière position connue est affichée.</small>}
            <div className="lm-seg" role="group" aria-label="Trajet parcouru">
              {[[0, 'Sans trajet'], [2, '2 h'], [6, '6 h'], [24, '24 h']].map(([h, label]) => (
                <button key={h} className={hours === h ? 'on' : ''} aria-pressed={hours === h} onClick={() => setHours(h)}>{label}</button>
              ))}
            </div>
            {hours > 0 && track.isSuccess && trackCount === 0 && <small style={{ color: 'var(--mute)', display: 'block', marginTop: 8 }}>Aucune position enregistrée sur cette période.</small>}
          </>
        ) : <span style={{ color: 'var(--mute)' }}>Ce bus n'a encore transmis aucune position.</span>}
      </div>

      <div className="lm-box">
        <h3>Anomalies</h3>
        {b.anomalies?.length > 0 ? (
          <ul className="lm-anom">
            {b.anomalies.map((a) => <li key={a.type}><AlertTriangle size={15} />{a.label}</li>)}
          </ul>
        ) : <span className="lm-ok"><CheckCircle2 size={16} />Aucune anomalie détectée</span>}
      </div>

      <div className="lm-box">
        <h3>Aujourd'hui</h3>
        {t ? (
          <dl className="lm-kv">
            <dt>Distance parcourue</dt><dd>{fmtKm(t.distance_km)}</dd>
            <dt>Premier départ</dt><dd>{fmtClock(t.first_move_at)}</dd>
            <dt>Temps de conduite</dt><dd>{fmtMin(t.moving_minutes)}</dd>
            <dt>Ralenti (moteur allumé)</dt><dd>{fmtMin(t.idle_minutes)}</dd>
            <dt>Vitesse maximale</dt><dd>{t.max_speed_kmh} km/h</dd>
            <dt>Vitesse moyenne</dt><dd>{t.avg_speed_kmh != null ? `${t.avg_speed_kmh} km/h` : '—'}</dd>
            <dt>Excès de vitesse</dt><dd className={t.speeding_count > 0 ? 'bad' : ''}>{t.speeding_count}</dd>
          </dl>
        ) : <span style={{ color: 'var(--mute)' }}>Chargement…</span>}
      </div>

      {m && (
        <div className="lm-box">
          <h3>Mission en cours</h3>
          <dl className="lm-kv">
            <dt>Intitulé</dt><dd>{m.title}</dd>
            <dt>Statut</dt><dd>{MISSION_STATUS[m.status]?.label ?? m.status}</dd>
            <dt>Trajet</dt><dd>{trip.join(' → ') || '—'}</dd>
            <dt>Période</dt><dd>{fmtRange(m.starts_at, m.ends_at)}</dd>
            {m.pax ? <><dt>Passagers</dt><dd>{m.pax}</dd></> : null}
            {ms ? <><dt>Distance depuis le départ</dt><dd>{fmtKm(ms.distance_km)}</dd></> : null}
          </dl>
        </div>
      )}

    
    </>
  );
}

export default function LiveMapPage() {
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [hours, setHours] = useState(0);
  const [focus, setFocus] = useState(null);
  const [fitKey, setFitKey] = useState(0);

  const { data, error, dataUpdatedAt } = useLive(auto);
  const day = useDayStats();
  const dayBuses = day.data?.buses ?? {};
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
  const busStats = useBusStats(selected?.id);
  const trackPoints = (track.data ?? []).map((p) => [p.lat, p.lng]);

  const select = (b) => {
    setSelectedId(b.id);
    setHours(b.lat != null ? 2 : 0);                 // le trajet des 2 dernières heures s'affiche d'emblée
    if (b.lat != null) setFocus({ pos: [b.lat, b.lng], key: Date.now() });
  };
  const close = () => { setSelectedId(null); setHours(0); };

  const counts = {
    all: summary?.total,
    moving: (summary?.moving ?? 0) + (summary?.speeding ?? 0),
    idle: summary?.idle,
    parked: summary?.parked,
    alert: (summary?.alert ?? 0) + (summary?.speeding ?? 0),
    offline: (summary?.offline ?? 0) + (summary?.no_position ?? 0),
  };
  const kmOf = (b) => (day.data ? (dayBuses[b.id]?.distance_km ?? 0) : null);

  return (
    <>
      {error && <div className="alert bad">Impossible de joindre le serveur : {error.message}. Nouvelle tentative automatique.</div>}

      <Kpis summary={summary} totals={day.data?.totals} />

      <div className={`lm ${selected ? 'has-sel' : ''}`}>
        <aside className="lm-side">
          <div className="lm-tools">
            <label className="lm-search">
              <Search size={17} aria-hidden="true" />
              <input placeholder="Bus, immatriculation, chauffeur…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un bus" />
            </label>
            <div className="lm-chips" role="group" aria-label="Filtrer par état">
              {FILTERS.map(([k, label]) => (
                <button key={k} className={`lm-chip ${filter === k ? 'on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {label}{counts[k] != null ? ` (${counts[k]})` : ''}
                </button>
              ))}
            </div>
            <div className="lm-count"><span>Bus affichés<b>{shown.length}</b></span><span>Aujourd'hui</span></div>
          </div>
          <div className="lm-list lm-thin">
            {shown.map((b) => <BusCard key={b.id} b={b} selected={b.id === selectedId} onSelect={select} age={age} km={kmOf(b)} />)}
            {data && shown.length === 0 && <p className="lm-empty">Aucun bus pour ce filtre.</p>}
            {!data && !error && <p className="lm-empty">Chargement des bus…</p>}
          </div>
        </aside>

        <div className="lm-map">
          <div className="lm-live">
            <button className={`lm-pill ${error || !auto ? 'off' : ''}`} onClick={() => setAuto(!auto)}
                    title={auto ? 'Cliquer pour mettre en pause' : 'Cliquer pour reprendre'}>
              <i />{error ? 'Connexion perdue' : auto ? 'En direct' : 'En pause'}
            </button>
            {dataUpdatedAt > 0 && !error && <span className="lm-pill lm-upd"><Clock size={13} />Actualisé {agoText(sinceFetch)}</span>}
            <button className="lm-pill" onClick={() => setFitKey((k) => k + 1)} disabled={allPoints.length === 0}>
              <Maximize2 size={13} />Toute la flotte
            </button>
          </div>
          <MapContainer center={[35.8, 10.6]} zoom={8} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
            <Fit points={allPoints} trigger={fitKey} />
            <Focus target={focus} />
            <Resize dep={selectedId} />
            {hours > 0 && trackPoints.length > 1 && (
              <>
                <Polyline positions={trackPoints} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                <Polyline positions={trackPoints} pathOptions={{ color: '#f28c0f', weight: 4, opacity: 1 }} />
              </>
            )}
            {shown.filter((b) => b.lat != null).map((b) => (
              <Marker key={b.id} position={[b.lat, b.lng]} icon={busIcon(b, b.id === selectedId)}
                      zIndexOffset={b.id === selectedId ? 1000 : 0} eventHandlers={{ click: () => select(b) }} />
            ))}
          </MapContainer>
        </div>

        <aside className="lm-panel lm-thin" aria-live="polite">
          <Panel b={selected} onClose={close} hours={hours} setHours={setHours} track={track}
                 trackCount={trackPoints.length} age={age} stats={busStats.data} />
        </aside>
      </div>
    </>
  );
}