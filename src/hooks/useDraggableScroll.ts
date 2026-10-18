'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Position tracking
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScrollability = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollability]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Vitesse de défilement fluide
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScrollability();
  }, [isDragging, checkScrollability]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // Si l'utilisateur a tiré / draggé la souris, on bloque le clic accidentel sur le bouton
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  const scrollBy = useCallback((distance: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: distance, behavior: 'smooth' });
    setTimeout(checkScrollability, 300);
  }, [checkScrollability]);

  return {
    ref,
    isDragging,
    canScrollLeft,
    canScrollRight,
    scrollLeft: () => scrollBy(-260),
    scrollRight: () => scrollBy(260),
    props: {
      ref,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onClickCapture,
      onScroll: checkScrollability,
      className: `cursor-grab active:cursor-grabbing select-none overflow-x-auto no-scrollbar scroll-smooth ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`,
    },
  };
}
