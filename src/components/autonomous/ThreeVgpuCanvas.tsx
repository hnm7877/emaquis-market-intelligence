'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Sparkles, Maximize2, RotateCcw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface RealHub {
  name: string;
  share: string;
  volume?: number;
}

interface ThreeVgpuCanvasProps {
  activeNode?: string;
  onNodeSelect?: (nodeName: string) => void;
  intensity?: number;
  realHubs?: RealHub[];
}

export const ThreeVgpuCanvas: React.FC<ThreeVgpuCanvasProps> = ({
  activeNode = 'Abidjan',
  onNodeSelect,
  intensity = 1.0,
  realHubs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 340;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with antialias and alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Group for all elements
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 5. Central Neural Sphere (Wireframe & Glowing points)
    const coreGeometry = new THREE.IcosahedronGeometry(4.2, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    mainGroup.add(coreMesh);

    // 6. Inner Glowing Pulse Core
    const innerGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    mainGroup.add(innerMesh);

    // 7. VGPU-style Vector Field Particles (Simulating GPU Compute Particles)
    const particleCount = 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const initialRadii = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);

    const color1 = new THREE.Color(0xf97316); // Orange E-Maquis
    const color2 = new THREE.Color(0x38bdf8); // Cyan Liquid
    const color3 = new THREE.Color(0x10b981); // Emerald Sales
    const color4 = new THREE.Color(0xa855f7); // Violet AI

    for (let i = 0; i < particleCount; i++) {
      const radius = 5 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const heightVal = (Math.random() - 0.5) * 8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = heightVal;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      initialRadii[i] = radius;
      angles[i] = angle;
      speeds[i] = (0.2 + Math.random() * 0.8) * 0.015;

      // Color interpolation
      const mixRatio = Math.random();
      let pColor: THREE.Color;
      if (mixRatio < 0.35) {
        pColor = color1;
      } else if (mixRatio < 0.65) {
        pColor = color2;
      } else if (mixRatio < 0.85) {
        pColor = color3;
      } else {
        pColor = color4;
      }

      colors[i * 3] = pColor.r;
      colors[i * 3 + 1] = pColor.g;
      colors[i * 3 + 2] = pColor.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    mainGroup.add(particleSystem);

    // 8. Territorial Hub Nodes (Abidjan, Bouaké, San Pedro, Yamoussoukro, Korhogo)
    const hubs = [
      { name: 'Abidjan', angle: 0, radius: 5.5, size: 0.65, color: 0xf97316, volume: '68%' },
      { name: 'Bouaké', angle: (Math.PI * 2) / 4, radius: 6.2, size: 0.45, color: 0x10b981, volume: '14%' },
      { name: 'San Pedro', angle: (Math.PI * 2 * 2) / 4, radius: 5.8, size: 0.4, color: 0x38bdf8, volume: '9%' },
      { name: 'Yamoussoukro', angle: (Math.PI * 2 * 3) / 4, radius: 6.5, size: 0.38, color: 0xa855f7, volume: '6%' },
    ];

    const hubMeshes: { mesh: THREE.Mesh; hub: typeof hubs[0] }[] = [];

    hubs.forEach((hub) => {
      const hubGeo = new THREE.SphereGeometry(hub.size, 16, 16);
      const hubMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        wireframe: false,
      });
      const hubMesh = new THREE.Mesh(hubGeo, hubMat);

      const x = Math.cos(hub.angle) * hub.radius;
      const z = Math.sin(hub.angle) * hub.radius;
      hubMesh.position.set(x, 0, z);

      // Glow halo ring
      const haloGeo = new THREE.RingGeometry(hub.size * 1.3, hub.size * 1.6, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      hubMesh.add(haloMesh);

      mainGroup.add(hubMesh);
      hubMeshes.push({ mesh: hubMesh, hub });
    });

    // 9. Connecting Arcs (Flow lines between hubs)
    const curvePoints: THREE.Vector3[] = [];
    hubs.forEach((hub) => {
      curvePoints.push(new THREE.Vector3(Math.cos(hub.angle) * hub.radius, 0, Math.sin(hub.angle) * hub.radius));
    });
    curvePoints.push(curvePoints[0]); // Loop back

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.05, 8, true);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    mainGroup.add(tubeMesh);

    // 10. Mouse interaction (Orbit and Raycasting)
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.2;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouseX = x;
      mouseY = y;
      targetRotationY = x * 0.6;
      targetRotationX = y * 0.4 + 0.2;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 340;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 11. Animation Loop
    let clock = new THREE.Clock();
    let frameCount = 0;
    let lastTime = performance.now();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      frameCount++;

      // FPS calculation
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      // Rotation & Physics
      if (isRotating) {
        mainGroup.rotation.y += 0.005 * intensity;
      }
      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.05;

      // Pulse Cores
      const coreScale = 1 + Math.sin(elapsedTime * 2) * 0.04;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      const innerScale = 1 + Math.cos(elapsedTime * 3) * 0.08;
      innerMesh.scale.set(innerScale, innerScale, innerScale);

      // Particle simulation (VGPU field)
      const posAttr = particleGeometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        angles[i] += speeds[i] * intensity;
        const radius = initialRadii[i] + Math.sin(elapsedTime + i) * 0.3;

        posArray[i * 3] = Math.cos(angles[i]) * radius;
        posArray[i * 3 + 2] = Math.sin(angles[i]) * radius;
        posArray[i * 3 + 1] += Math.sin(elapsedTime * 2 + i) * 0.005;
      }
      posAttr.needsUpdate = true;

      // Hub node animations
      hubMeshes.forEach(({ mesh, hub }) => {
        mesh.rotation.y += 0.02;
        const pulse = 1 + Math.sin(elapsedTime * 4 + hub.angle) * 0.15;
        mesh.scale.set(pulse, pulse, pulse);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
    };
  }, [intensity, isRotating]);

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl overflow-hidden border border-border/80 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-4 shadow-2xl flex flex-col justify-between">
      {/* Visual background grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.12),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header HUD overlay */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Activity className="size-3.5" />
            3D VGPU Spatial Engine • Live Mesh
          </span>
          <Badge variant="outline" className="text-[10px] bg-slate-800/80 text-cyan-300 border-cyan-500/30 font-mono">
            {fps} FPS
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsRotating((prev) => !prev)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-800/60"
            title={isRotating ? 'Pause rotation' : 'Reprendre rotation'}
          >
            <RotateCcw className={`size-3.5 mr-1 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            {isRotating ? 'Auto-Orbit' : 'Manuel'}
          </Button>
          <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-mono">
            Réseau E-Maquis Global
          </Badge>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Bottom Hub Cards overlay */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <Sparkles className="size-3.5 text-orange-400" />
          <span>Hubs Territoriaux Détectés :</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(realHubs && realHubs.length > 0
            ? realHubs.map((h, i) => ({
                name: h.name,
                share: h.share,
                color: i === 0 ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' : i === 1 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : i === 2 ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' : 'border-purple-500/40 text-purple-400 bg-purple-500/10'
              }))
            : [
                { name: 'Abidjan', share: '68.2%', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
                { name: 'Bouaké', share: '14.1%', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
                { name: 'San Pedro', share: '9.4%', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
                { name: 'Yamoussoukro', share: '5.8%', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
              ]
          ).map((hub) => (
            <button
              key={hub.name}
              onClick={() => onNodeSelect?.(hub.name)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-all hover:scale-105 ${hub.color} ${
                activeNode === hub.name ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-slate-950 font-bold' : ''
              }`}
            >
              {hub.name} <span className="opacity-75">({hub.share})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
