import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck, WifiOff, Users, Search, Star, History, Play, Layers, Tv, Sparkles, BarChart3, ListPlus,
  ArrowRight, ArrowLeft,
} from 'lucide-react';
import LiquidMetalShader from '@/components/ui/liquid-metal-shader';
import Wordmark from './Wordmark';

const EASE = [0.16, 1, 0.3, 1];

// What the app is for, then its features in the order a viewer meets them.
const STEPS = [
  {
    key: 'welcome',
    tag: 'Bienvenida',
    title: 'Tu cine, narrado como un partido',
    text: 'CineTracker es tu cartelera personal: guarda las películas y series que ves, califícalas del 1 al 10 y descubre qué ver después.',
    points: [
      [ShieldCheck, 'Tus datos se quedan en este computador, sin redes sociales ni anuncios.'],
      [WifiOff, 'Lo que ya guardaste, con sus pósters, funciona sin internet.'],
      [Users, 'Varias cuentas en el mismo equipo, cada una con lo suyo.'],
    ],
  },
  {
    key: 'catalog',
    tag: 'Tu catálogo',
    title: 'Arma tu catálogo en segundos',
    text: 'Escribe el nombre de una película o serie y agrégala con su póster, sinopsis, géneros y reparto en español.',
    points: [
      [Search, 'Búsqueda en TMDB mientras escribes, también con el teclado.'],
      [Star, 'Calificación del 1 al 10 y estado: pendiente, viendo, completado o abandonado.'],
      [History, 'Historial de cada vez que la ves, con su fecha.'],
    ],
  },
  {
    key: 'title',
    tag: 'Cada título',
    title: 'Todo sobre lo que vas a ver',
    text: 'Cada película o serie tiene su ficha completa, con lo que necesitas para decidir y lo que viene después.',
    points: [
      [Play, 'El tráiler, en español cuando existe, sin salir de la app.'],
      [Layers, 'La saga en orden y las temporadas: qué sigue y qué está por estrenarse.'],
      [Tv, 'Dónde verla legalmente en Colombia: suscripción, gratis, alquiler o compra.'],
    ],
  },
  {
    key: 'you',
    tag: 'Para ti',
    title: 'Te decimos qué ver después',
    text: 'Mientras más calificas, mejor te conoce: recomendaciones de tu propia lista y tus números del mes.',
    points: [
      [Sparkles, 'Recomendaciones explicadas una por una, escritas por IA si agregas una clave de Gemini.'],
      [BarChart3, 'Estadísticas: horas vistas, actividad de cada mes y tus géneros favoritos.'],
      [ListPlus, 'Listas para una noche de películas, un maratón o lo que quieras.'],
    ],
  },
];

/**
 * Presentation shown the first time the app opens: what CineTracker is for
 * and its features in four centred steps over pitch-green liquid metal.
 * Skip, back, next, the progress bar and the keyboard (arrows, Escape)
 * all work; Perfil can show it again.
 */
export default function Intro({ onDone }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const primaryRef = useRef(null);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = useCallback(() => onDone(), [onDone]);
  const go = useCallback((next) => {
    if (next < 0 || next >= STEPS.length) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  useEffect(() => { primaryRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(step + 1);
      else if (e.key === 'ArrowLeft') go(step - 1);
      else if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, finish, step]);

  const slide = {
    initial: (dir) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: 48 * dir }),
    animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
    exit: (dir) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 * dir, transition: { duration: 0.2 } }),
  };

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <LiquidMetalShader
        className="intro__metal"
        baseColor="#062417"
        metalColor="#0b7a4c"
        highlightColor="#b8f5d6"
        speed={0.45}
        distortion={0.7}
        scale={1}
        pixelRatio={1}
      />
      <div className="intro__shade" aria-hidden="true" />

      <header className="intro__top">
        <Wordmark size="lg" />
        <button type="button" className="intro__skip" onClick={finish}>Saltar presentación</button>
      </header>

      <main className="intro__stage">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={current.key}
            className="intro__copy"
            custom={direction}
            variants={slide}
            initial="initial"
            animate="animate"
            exit="exit"
            aria-live="polite"
          >
            <div className="lower-third intro__tag">
              <span className="lower-third__label"><span>{current.tag}</span></span>
              <span className="lower-third__meta"><span>{step + 1} de {STEPS.length}</span></span>
            </div>
            <h1 className="intro__title" id="intro-title">{current.title}</h1>
            <p className="intro__text">{current.text}</p>
            <ul className="intro__points">
              {current.points.map(([Icon, text], i) => (
                <motion.li
                  key={text}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE, delay: 0.14 + i * 0.08 } }}
                >
                  <span className="intro__icon" aria-hidden="true"><Icon size={24} /></span>
                  <span className="intro__point">{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="intro__bottom">
        <div className="intro__progress" role="group" aria-label="Pasos de la presentación">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`intro__dot${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
              onClick={() => go(i)}
              aria-label={`Paso ${i + 1}: ${s.tag}`}
              aria-current={i === step ? 'step' : undefined}
            />
          ))}
        </div>

        <div className="intro__actions">
          <button type="button" className="btn btn--ghost btn--lg intro__back" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft size={18} aria-hidden="true" /> Atrás
          </button>
          <button
            ref={primaryRef}
            type="button"
            className="btn btn--primary btn--lg intro__next"
            onClick={() => (last ? finish() : go(step + 1))}
          >
            {last ? 'Entrar a CineTracker' : 'Siguiente'} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
