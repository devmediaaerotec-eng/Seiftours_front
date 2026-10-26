export default function BarChart({ data, format = String, height = 180 }) {
  const w = 720;
  const pad = { l: 6, r: 6, t: 10, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (w - pad.l - pad.r) / data.length;
  const ih = height - pad.t - pad.b;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="bar-chart" role="img" aria-label="Évolution sur 30 jours">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + ih - f * ih} y2={pad.t + ih - f * ih} className="grid-line" />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * ih;
        const last = i === data.length - 1;
        return (
          <g key={d.key}>
            <rect x={pad.l + i * bw + 2} y={pad.t + ih - h} width={Math.max(2, bw - 4)} height={d.value > 0 ? Math.max(2, h) : 0}
                  rx="2" className={last ? 'bar today' : 'bar'}>
              <title>{`${d.label} : ${format(d.value)}`}</title>
            </rect>
            {i % 5 === 0 && <text x={pad.l + i * bw + bw / 2} y={height - 7} textAnchor="middle">{d.short}</text>}
          </g>
        );
      })}
    </svg>
  );
}