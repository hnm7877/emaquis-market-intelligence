'use client';

import React, { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/** Nombre qui glisse vers sa nouvelle valeur (apparition puis chaque mise à jour poussée) */
export function AnimatedNumber({ value, format, fromZero = false }: { value: number; format: (n: number) => string; fromZero?: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(fromZero ? 0 : value);
  const text = useTransform(mv, (n) => format(n));
  const first = useRef(!fromZero);
  useEffect(() => {
    if (first.current || reduce) {
      first.current = false;
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [value, mv, reduce]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}
