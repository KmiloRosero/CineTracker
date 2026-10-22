import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IconSpinner } from './Icons';
import { useToast } from './Toast';
import { unwrap } from '../utils/ai';
import { formatDayMonth } from '../utils/labels';

const KIND = {
  all:    { label: 'Títulos',   one: 'título',   many: 'títulos' },
  movie:  { label: 'Películas', one: 'película', many: 'películas' },
  series: { label: 'Series',    one: 'serie',    many: 'series' },
};

const EASE = [0.16, 1, 0.3, 1];

function GoalForm({ initial, onSave, onCancel, saving }) {
  const [goal, setGoal] = useState(initial?.goal ?? 50);
  const [kind, setKind] = useState(initial?.kind ?? 'movie');
  return (
    <form className="challenge__form" onSubmit={(e) => { e.preventDefault(); onSave({ goal: Number(goal), kind }); }}>
      <div className="form-group">
        <label htmlFor="challenge-goal">Meta</label>
        <input id="challenge-goal" type="number" min="1" max="1000" value={goal} onChange={(e) => setGoal(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="challenge-kind">De</label>
        <select id="challenge-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(KIND).map(([value, k]) => <option key={value} value={value}>{k.label}</option>)}
        </select>
      </div>
      <div className="challenge__form-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving && <IconSpinner />}{initial?.goal ? 'Guardar meta' : 'Crear reto'}</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

function paceText(c) {
  const k = KIND[c.kind];
  if (c.done) return `¡Reto cumplido! Llevas ${c.progress} de ${c.goal} ${k.many}.`;
  if (c.over) return `El año terminó con ${c.progress} de ${c.goal} ${k.many}.`;
  const per = c.perWeek >= 1 ? `unas ${Math.ceil(c.perWeek)} por semana` : 'menos de una por semana';
  if (c.ahead > 0) return `Vas ${c.ahead} por delante del ritmo. A este paso cerrarías el año con ${c.projected}.`;
  if (c.ahead === 0) return `Vas justo al ritmo: te faltan ${c.remaining}, ${per}.`;
  return `Vas ${-c.ahead} por detrás del ritmo: te faltan ${c.remaining}, ${per} hasta diciembre.`;
}

/** "Reto 2026": the yearly goal, progress against the calendar, editable in place. */
export function ChallengePanel() {
  const showToast = useToast();
  const reduceMotion = useReducedMotion();
  const [c, setC] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.electronAPI.getChallenge().then(unwrap).then(setC).catch(() => {});
  }, []);

  async function save(input) {
    setSaving(true);
    try {
      setC(unwrap(await window.electronAPI.setChallenge({ year: c.year, ...input })));
      setEditing(false);
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!c) return <div className="panel panel--skeleton skeleton" />;
  const share = c.goal ? Math.min(1, c.progress / c.goal) : 0;
  const pace = c.goal ? Math.min(1, c.expected / c.goal) : 0;

  return (
    <section className="panel challenge" aria-labelledby="challenge-title">
      <header className="panel__header">
        <h2 className="panel__title" id="challenge-title">Reto {c.year}</h2>
        {c.goal && !editing && <span className="panel__sub">{KIND[c.kind].label}</span>}
      </header>

      {!c.goal && !editing && (
        <div className="challenge__empty">
          <p className="panel__empty">¿Cuántas películas o series quieres ver este año? Llevas {c.progress} {c.progress === 1 ? 'título terminado' : 'títulos terminados'} en {c.year}.</p>
          <button className="btn btn--primary" onClick={() => setEditing(true)}>Ponerme un reto</button>
        </div>
      )}

      {editing && <GoalForm initial={c.goal ? c : null} saving={saving} onSave={save} onCancel={() => setEditing(false)} />}

      {c.goal && !editing && (
        <>
          <p className="challenge__score">
            <span className="challenge__done">{c.progress}</span>
            <span className="challenge__goal">/ {c.goal}</span>
          </p>
          <div className="challenge__bar" role="progressbar" aria-label={`Progreso del reto ${c.year}`} aria-valuemin={0} aria-valuemax={c.goal} aria-valuenow={c.progress}>
            <motion.span
              className={`challenge__fill${c.done ? ' is-done' : ''}`}
              initial={{ scaleX: reduceMotion ? share : 0 }}
              animate={{ scaleX: share, transition: { duration: 0.7, ease: EASE } }}
            />
            {!c.done && !c.over && <span className="challenge__pace" style={{ left: `${pace * 100}%` }} title="Donde deberías ir hoy" />}
          </div>
          <p className="challenge__text">{paceText(c)}</p>
          <div className="challenge__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Cambiar meta</button>
            <button className="btn btn--ghost btn--sm" onClick={() => save({ goal: null })}>Quitar reto</button>
          </div>
        </>
      )}
    </section>
  );
}

const STATE_TEXT = {
  'active':  (s) => `Esta semana ya sumaste ${s.thisWeek}. Sigue así.`,
  'at-risk': () => 'Aún no ves nada esta semana: mira algo antes del domingo para no perderla.',
  'none':    () => 'Mira algo esta semana para empezar una racha.',
};


/** "Tu racha": consecutive weeks with something watched, and the last 26 weeks as a strip. */
export function StreakPanel() {
  const [s, setS] = useState(null);
  useEffect(() => {
    window.electronAPI.getStreaks().then(unwrap).then(setS).catch(() => {});
  }, []);
  if (!s) return <div className="panel panel--skeleton skeleton" />;
  const max = Math.max(1, ...s.weeks.map((w) => w.n));

  return (
    <section className="panel streak" aria-labelledby="streak-title">
      <header className="panel__header">
        <h2 className="panel__title" id="streak-title">Tu racha</h2>
        <span className="panel__sub">Mejor racha: {s.best} {s.best === 1 ? 'semana' : 'semanas'}</span>
      </header>
      <p className="challenge__score">
        <span className={`challenge__done${s.state === 'at-risk' ? ' is-risk' : ''}`}>{s.current}</span>
        <span className="challenge__goal">{s.current === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
      </p>
      <p className="challenge__text">{STATE_TEXT[s.state](s)}</p>
      <ol className="streak__strip" aria-label="Actividad de las últimas 26 semanas">
        {s.weeks.map((w, i) => (
          <li
            key={w.start}
            className={`streak__week${w.n ? ' is-on' : ''}${i === s.weeks.length - 1 ? ' is-now' : ''}`}
            style={w.n ? { '--level': 0.35 + 0.65 * (w.n / max) } : undefined}
            title={`Semana del ${formatDayMonth(w.start)}: ${w.n} ${w.n === 1 ? 'cosa vista' : 'cosas vistas'}`}
          >
            <span className="sr-only">Semana del {formatDayMonth(w.start)}: {w.n}</span>
          </li>
        ))}
      </ol>
      <div className="streak__axis" aria-hidden="true">
        <span>{formatDayMonth(s.weeks[0].start)}</span>
        <span>Esta semana</span>
      </div>
    </section>
  );
}
