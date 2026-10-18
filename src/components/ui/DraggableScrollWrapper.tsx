'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

interface DraggableScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  showHint?: boolean;
}

export const DraggableScrollWrapper: React.FC<DraggableScrollWrapperProps> = ({
  children,
  className = '',
  showArrows = true,
  showHint = false,
}) => {
  const { ref, props, canScrollLeft, canScrollRight, scrollLeft, scrollRight, isDragging } =
    useDraggableScroll<HTMLDivElement>();

  return (
    <div className={`relative group/drag ${className}`}>
      {/* Flèche gauche */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollLeft();
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-slate-950/90 border border-slate-700/80 shadow-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-900 transition-all backdrop-blur-md"
          title="Défiler vers la gauche"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Conteneur Draggable avec la main qui attrape et tire */}
      <div
        {...props}
        className={`flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth select-none ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>

      {/* Flèche droite */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollRight();
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-slate-950/90 border border-slate-700/80 shadow-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-900 transition-all backdrop-blur-md"
          title="Défiler vers la droite"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      {/* Indication visuelle main qui attrape au survol */}
      {showHint && canScrollRight && !isDragging && (
        <div className="absolute right-2 -bottom-5 z-10 pointer-events-none flex items-center gap-1 text-[10px] font-mono text-cyan-400 opacity-70 group-hover/drag:opacity-100 transition-opacity">
          <Hand className="size-3 animate-pulse" />
          <span>Attraper &amp; glisser</span>
        </div>
      )}
    </div>
  );
};
