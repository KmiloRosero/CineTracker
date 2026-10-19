import React from 'react';
import { motion } from 'framer-motion';
import { gridVariants } from './cardAnimations';

/** A titled row of fixture cards; `empty` replaces the grid (loading, error or nothing to show). */
export default function Rail({ title, sub, action, note, children, empty, className = '' }) {
  return (
    <section className={`rail ${className}`} aria-label={title}>
      <header className="rail__header">
        <h2 className="rail__title">{title}</h2>
        {sub && <span className="rail__tag">{sub}</span>}
        {action && <div className="rail__action">{action}</div>}
      </header>
      {note && <p className="rail__note" role="status">{note}</p>}
      {empty ?? (
        <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible">
          {children}
        </motion.div>
      )}
    </section>
  );
}

export function RailEmpty({ children }) {
  return <div className="rail__empty" role="status">{children}</div>;
}
