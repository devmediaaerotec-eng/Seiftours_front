import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { fmtAmount, MONTHS, MONTHS_SHORT } from '../model';

export const METHOD_COLORS = { transfer: 'var(--m-transfer)', cheque: 'var(--m-cheque)', cash: 'var(--m-cash)', other: 'var(--m-other)' };
const NAMES = { transfer: 'Virements', cheque: 'Chèques', cash: 'Espèces', other: 'Autres' };

function useCountUp(target) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return; }
    const start = performance.now(), a = from.current, d = 750;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / d), e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

export default function Overview({ year, month, onMonth, method, onMethod, summary, loading }) {
  const shown = useCountUp(summary.total);
  const byMonth = summary.by_month;
  const totals = MONTHS.map((_, i) => byMonth[`${year}-${String(i + 1).padStart(2, '0')}`]?.total ?? 0);
  const max = Math.max(...totals, 1);
  const yearTotal = totals.reduce((a, b) => a + b, 0);
  const methods = Object.keys(NAMES).filter((m) => summary.by_method[m]);
  const sum = methods.reduce((a, m) => a + summary.by_method[m].total, 0) || 1;
  const scope = month ? `${MONTHS[month - 1].toLowerCase()} ${year}` : `l'année ${year}`;

  return (
    <section className="sp-hero" aria-label="Vue d'ensemble">
      {/* --- Total --- */}
      <div className="sp-hero-total">
        <span className="sp-hero-eyebrow">
          <TrendingUp size={13} /> Réglé en {scope}
        </span>
        <div className="big" aria-live="polite">
          {fmtAmount(shown)}<i>TND</i>
        </div>
        <p>
          {loading ? 'Chargement…' : summary.count === 0 ? 'Aucun règlement pour cette sélection.'
            : <>
                <b>{summary.count}</b> règlement{summary.count > 1 ? 's' : ''}
               </>}
        </p>
      </div>

      {/* --- Barres mensuelles --- */}
      <div className="sp-bars" role="group" aria-label={`Total par mois en ${year}`}>
        {totals.map((t, i) => {
          const active = month === i + 1;
          return (
            <button key={i} type="button"
              className={`sp-bar-col ${active ? 'on' : ''} ${t ? '' : 'zero'}`}
              style={{ '--h': `${Math.max(4, (t / max) * 100)}%`, '--i': i }}
              aria-pressed={active}
              title={`${MONTHS[i]} : ${fmtAmount(t)} TND`}
              onClick={() => onMonth(active ? 0 : i + 1)}>
              <div className="col" />
              <span>{MONTHS_SHORT[i]}</span>
            </button>
          );
        })}
      </div>

       {methods.length > 0 && (
        <div className="sp-split">
          <div className="sp-split-head">
            <small>Répartition par mode</small>
            {method && (
              <button type="button" className="sp-split-reset" onClick={() => onMethod('')}>
                Tout afficher
              </button>
            )}
          </div>
          <div className="sp-split-bar" aria-hidden="true">
            {methods.map((m) => (
              <i key={m} style={{ flexGrow: summary.by_method[m].total / sum * 100, background: METHOD_COLORS[m] }} />
            ))}
          </div>
          <div className="sp-split-legend">
            {methods.map((m) => (
              <button key={m} type="button"
                className={method === m ? 'on' : ''}
                style={{ '--c': METHOD_COLORS[m] }}
                aria-pressed={method === m}
                onClick={() => onMethod(method === m ? '' : m)}>
                <span className="sp-dot" style={{ background: METHOD_COLORS[m] }} />
                {NAMES[m]}
                <b>{fmtAmount(summary.by_method[m].total)}</b>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}