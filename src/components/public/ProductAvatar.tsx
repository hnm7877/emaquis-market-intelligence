import React from 'react';
import Image from 'next/image';
import { getBrandLogo } from '@/utils/brandLogos';

const PALETTE = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#14b8a6', '#eab308', '#f97316'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Logo de la marque quand il est connu, sinon initiales sur une couleur stable */
export function ProductAvatar({ name, brand, size = 30 }: { name: string; brand?: string | null; size?: number }) {
  const logo = getBrandLogo(brand || name);
  if (logo) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" style={{ width: size, height: size }}>
        <Image src={logo} alt="" width={size - 6} height={size - 6} className="object-contain" />
      </span>
    );
  }
  const initials = name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-black/80"
      style={{ width: size, height: size, backgroundColor: PALETTE[hash(name) % PALETTE.length] }}
    >
      {initials}
    </span>
  );
}
