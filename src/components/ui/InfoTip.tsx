'use client';

import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';

/**
 * Petite icône « i » avec une explication au survol, au focus clavier ou au toucher.
 * Le texte s'affiche dans une bulle (fixe à l'écran pour ne jamais être coupée par le tableau).
 */
export function InfoTip({ text, title }: { text: string; title?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const id = useId();
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140), y: r.bottom + 8 });
  };
  return (
    <span className="inline-flex align-middle">
      <span
        role="button"
        tabIndex={0}
        aria-label={title ? `Explication : ${title}` : 'Explication'}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setPos(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setPos(null)}
        onClick={(e) => {
          // Toucher (mobile) : ouvre / ferme sans déclencher le tri de la colonne
          e.stopPropagation();
          if (pos) setPos(null);
          else show(e.currentTarget);
        }}
        className="ml-1 inline-flex cursor-help rounded-full text-muted-foreground/70 outline-none transition-colors hover:text-amber-400 focus-visible:text-amber-400"
      >
        <Info className="size-3" />
      </span>
      <AnimatePresence>
        {pos && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            style={{ left: pos.x, top: pos.y }}
            className="pointer-events-none fixed z-[100] w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-200 shadow-xl"
          >
            {title && <b className="mb-0.5 block text-[11px] text-white">{title}</b>}
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
