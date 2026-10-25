'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface MeshZone {
  zone: string;
  city: string;
  latitude: number;
  longitude: number;
  value: number;
  label: string;
}

interface ZoneMesh3DProps {
  zones: MeshZone[];
  activeZone?: string;
  color: string;
  autoRotate: boolean;
  onSelect?: (zone: string) => void;
}

/**
 * Vue 3D des communes : une colonne par commune, placée selon ses coordonnées et haute
 * selon la métrique choisie. Glisser pour tourner, molette pour zoomer, clic pour choisir.
 * Three.js est chargé à la demande (seulement si cette vue est ouverte).
 */
export function ZoneMesh3D({ zones, activeZone, color, autoRotate, onSelect }: ZoneMesh3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; w: number; zone: MeshZone } | null>(null);
  const [ready, setReady] = useState(false);
  // Valeurs lues par la boucle d'animation sans recréer la scène
  const live = useRef({ autoRotate, activeZone, onSelect });
  useEffect(() => {
    live.current = { autoRotate, activeZone, onSelect };
  }, [autoRotate, activeZone, onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !zones.length) return;
    let disposed = false;
    let cleanup = () => {};

    import('three').then((THREE) => {
      if (disposed || !hostRef.current) return;
      const width = host.clientWidth || 600;
      const height = host.clientHeight || 320;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(8, 14, 6);
      scene.add(sun);

      // Projection des coordonnées sur un plateau de 20 unités
      const lats = zones.map((z) => z.latitude);
      const lngs = zones.map((z) => z.longitude);
      const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs), 0.02);
      const scale = 18 / span;
      const maxValue = Math.max(...zones.map((z) => z.value), 1);

      const grid = new THREE.GridHelper(24, 24, 0x334155, 0x1e293b);
      scene.add(grid);

      const base = new THREE.Color(color);
      const highlight = new THREE.Color('#fbbf24');
      const geometry = new THREE.BoxGeometry(0.7, 1, 0.7);
      const bars: { mesh: InstanceType<typeof THREE.Mesh>; zone: MeshZone; target: number }[] = [];

      zones.forEach((z) => {
        const material = new THREE.MeshStandardMaterial({ color: base.clone(), roughness: 0.35, metalness: 0.25, emissive: base.clone(), emissiveIntensity: 0.15 });
        const mesh = new THREE.Mesh(geometry, material);
        const target = 0.25 + (z.value / maxValue) * 8;
        mesh.position.set((z.longitude - cLng) * scale, 0, -(z.latitude - cLat) * scale);
        mesh.scale.y = reduceMotion ? target : 0.01;
        mesh.userData.zone = z.zone;
        scene.add(mesh);
        bars.push({ mesh, zone: z, target });
      });

      // Orbite manuelle (glisser / molette), sans dépendance supplémentaire
      let theta = Math.PI / 4;
      let phi = 0.95;
      let radius = 30;
      let dragging = false;
      let moved = false;
      let lastX = 0;
      let lastY = 0;
      const placeCamera = () => {
        camera.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
        camera.lookAt(0, 1.5, 0);
      };
      placeCamera();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = (ev: PointerEvent) => {
        const r = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(bars.map((b) => b.mesh))[0];
        return hit ? { bar: bars.find((b) => b.mesh === hit.object)!, x: ev.clientX - r.left, y: ev.clientY - r.top } : null;
      };

      const onDown = (ev: PointerEvent) => {
        dragging = true;
        moved = false;
        lastX = ev.clientX;
        lastY = ev.clientY;
      };
      const onMove = (ev: PointerEvent) => {
        if (dragging) {
          const dx = ev.clientX - lastX;
          const dy = ev.clientY - lastY;
          if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
          theta += dx * 0.008;
          phi = Math.min(1.45, Math.max(0.25, phi - dy * 0.006));
          lastX = ev.clientX;
          lastY = ev.clientY;
          placeCamera();
          return;
        }
        const hit = pick(ev);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        setHover(hit ? { x: hit.x, y: hit.y, w: host.clientWidth, zone: hit.bar.zone } : null);
      };
      const onUp = (ev: PointerEvent) => {
        if (dragging && !moved) {
          const hit = pick(ev);
          if (hit) live.current.onSelect?.(hit.bar.zone.zone);
        }
        dragging = false;
      };
      const onLeave = () => {
        dragging = false;
        setHover(null);
      };
      const onWheel = (ev: WheelEvent) => {
        ev.preventDefault();
        radius = Math.min(60, Math.max(12, radius + ev.deltaY * 0.02));
        placeCamera();
      };
      const el = renderer.domElement;
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointerleave', onLeave);
      el.addEventListener('wheel', onWheel, { passive: false });

      const resize = new ResizeObserver(() => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      resize.observe(host);

      // Rendu uniquement quand l'onglet est visible
      let frame = 0;
      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (document.hidden) return;
        const { autoRotate: spin, activeZone: active } = live.current;
        if (spin && !dragging && !reduceMotion) {
          theta += 0.0025;
          placeCamera();
        }
        for (const b of bars) {
          const isActive = active?.toLowerCase() === b.zone.zone.toLowerCase();
          b.mesh.scale.y += (b.target - b.mesh.scale.y) * 0.08;
          b.mesh.position.y = b.mesh.scale.y / 2;
          const mat = b.mesh.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          mat.color.lerp(isActive ? highlight : base, 0.15);
          mat.emissive.lerp(isActive ? highlight : base, 0.15);
          mat.emissiveIntensity = isActive ? 0.45 : 0.15;
        }
        renderer.render(scene, camera);
      };
      tick();
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('wheel', onWheel);
        bars.forEach((b) => (b.mesh.material as InstanceType<typeof THREE.Material>).dispose());
        geometry.dispose();
        grid.geometry.dispose();
        renderer.dispose();
        el.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [zones, color]);

  return (
    <div className="relative size-full">
      <div ref={hostRef} className="absolute inset-0 touch-none" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Chargement de la vue 3D…</div>
      )}
      {!zones.length && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Aucune commune localisée pour ces filtres.</div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/15 bg-slate-950/95 px-3 py-2 text-[11px] text-white shadow-xl"
          style={{ left: Math.min(hover.x + 12, hover.w - 180), top: Math.max(hover.y - 50, 4) }}
        >
          <div className="font-semibold">{hover.zone.zone}</div>
          <div className="text-slate-400">{hover.zone.city}</div>
          <div className="mt-0.5 font-mono text-amber-300">{hover.zone.label}</div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400">
        Glisser pour tourner · molette pour zoomer · clic pour choisir
      </div>
    </div>
  );
}
