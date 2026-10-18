'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Zap,
  Play,
  RotateCw,
  Sliders,
  ShieldAlert,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface AgentDirective {
  id: string;
  label: string;
  prompt: string;
  icon: React.ElementType;
  badge: string;
}

const PRESET_DIRECTIVES: AgentDirective[] = [
  {
    id: 'war',
    label: 'Guerre des Marques (Solibra vs Brassivoire)',
    prompt: 'Agent, restructure le tableau pour analyser le duel direct entre Solibra (Bock/Beaufort) et Brassivoire (Heineken/Ivoire).',
    icon: Zap,
    badge: 'Choc des Titres',
  },
  {
    id: 'yopougon',
    label: 'Focus Hyper-Consommation (Yopougon)',
    prompt: 'Agent, focalise toute la spatialisation 3D et le ladder boursier sur les maquis de Yopougon (Rue Princesse, Niangon).',
    icon: Sparkles,
    badge: 'Hyper-Volume',
  },
  {
    id: 'premium',
    label: 'Max Marge & Lounges (Cocody / Marcory)',
    prompt: 'Agent, réordonne les widgets pour valoriser les segments haute marge : bières premium, champagnes et spiritueux.',
    icon: Layers,
    badge: 'Rentabilité',
  },
  {
    id: 'stock',
    label: 'Alerte Ruptures & Tensions Logistiques',
    prompt: 'Agent, projette les points de rupture pour le week-end et surligne les références à réapprovisionner d\'urgence.',
    icon: ShieldAlert,
    badge: 'Supply Chain',
  },
];

export const AgentHudConsole: React.FC<{
  onApplyDirective?: (directive: AgentDirective) => void;
  isBuilding?: boolean;
}> = ({ onApplyDirective, isBuilding = false }) => {
  const [activeDirective, setActiveDirective] = useState<AgentDirective>(PRESET_DIRECTIVES[0]);
  const [logs, setLogs] = useState<string[]>([
    '🤖 [AUTONOMOUS AGENT DEERFLOW v2.4] Initialisation du moteur de modélisation...',
    '📡 [RÉSEAU TERRAIN] Synchronisation de 1 420 débits de boissons actifs (E-Maquis POS & Hubs)...',
    '📈 [TRADING ENGINE] Calibrage des cours intrajournaliers et vélocités horaire...',
    '🌐 [3D SPATIAL VGPU] Rendu des 4 pôles territoriaux (Abidjan, Bouaké, San Pedro, Yamoussoukro)...',
    '✅ [CONSTRUCTION COMPLÈTE] Tableau de bord autonome assemblé avec succès.',
  ]);
  const [customInput, setCustomInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectDirective = (directive: AgentDirective) => {
    setActiveDirective(directive);
    setIsProcessing(true);

    const newLogs = [
      `🎯 [NOUVELLE DIRECTIVE REÇUE] "${directive.label}"`,
      `🧠 [RAISONNEMENT IA] Reconfiguration autonome des widgets et des flux de données...`,
      `📊 [RÉAGENCEMENT] Ajustement dynamique de la course boursière et de la pyramide géographique...`,
      `✨ [DÉPLOIEMENT] Nouveaux paramètres actifs pour l'équipe exécutive C-Level.`,
    ];

    setLogs((prev) => [...newLogs, ...prev.slice(0, 10)]);
    setTimeout(() => {
      setIsProcessing(false);
      onApplyDirective?.(directive);
    }, 800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const customDirective: AgentDirective = {
      id: `custom_${Date.now()}`,
      label: customInput.substring(0, 30),
      prompt: customInput,
      icon: Terminal,
      badge: 'Personnalisé',
    };

    handleSelectDirective(customDirective);
    setCustomInput('');
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl p-5 shadow-2xl space-y-4">
      {/* Top Status & Autonomous Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="size-4 text-orange-400" />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Agent IA DeerFlow • Pilote Autonome de Tableau de Bord</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
                {isProcessing ? 'SYNTHÈSE EN COURS...' : 'AUTONOME & LIVE'}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              L'agent modèle, agence et reconfigure ce cockpit exécutif selon vos orientations stratégiques
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 hidden md:inline">Confiance Modèle :</span>
          <span className="text-cyan-400 font-bold">99.4%</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 hidden md:inline">Cycle :</span>
          <span className="text-emerald-400 font-bold">Temps Réel</span>
        </div>
      </div>

      {/* Preset Directives Buttons */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400">
          DIRECTIVES EXÉCUTIVES PRÉDÉFINIES (RECONFIGURER LE DASHBOARD EN 1 CLIC) :
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESET_DIRECTIVES.map((directive) => {
            const isSelected = activeDirective.id === directive.id;
            const Icon = directive.icon;
            return (
              <button
                key={directive.id}
                onClick={() => handleSelectDirective(directive)}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-orange-500/80 bg-orange-500/15 shadow-md shadow-orange-500/10'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span className="font-mono text-xs font-bold text-foreground line-clamp-1">
                      {directive.label}
                    </span>
                  </div>
                </div>

                <Badge variant="outline" className={`text-[9px] w-fit font-mono ${
                  isSelected ? 'border-orange-500/40 text-orange-300' : 'border-slate-800 text-slate-400'
                }`}>
                  {directive.badge}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Agent Reasoning Terminal / Stream */}
      <div className="rounded-xl border border-slate-800 bg-black/60 p-3 font-mono text-[11px] space-y-1">
        <div className="flex items-center justify-between text-slate-500 text-[10px] pb-1 border-b border-slate-900">
          <span className="flex items-center gap-1.5">
            <Terminal className="size-3 text-cyan-400" />
            FLUX DE RAISONNEMENT DE L'AGENT EN DIRECT (AUDIT NEURAL)
          </span>
          <span className="text-emerald-400">CONNECTÉ AU CORE IA</span>
        </div>
        <div className="space-y-1 max-h-[75px] overflow-y-auto pt-1 text-slate-300">
          {logs.slice(0, 4).map((log, index) => (
            <div key={index} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-slate-600 select-none">&gt;</span>
              <span className={index === 0 ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom directive input prompt */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Ex: 'Agent, montre le volume de Beaufort vs Guinness à Yopougon Niangon'..."
          className="h-9 bg-slate-900 border-slate-800 text-xs font-mono text-foreground placeholder:text-slate-600"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!customInput.trim() || isProcessing}
          className="h-9 px-4 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs gap-1.5 shrink-0"
        >
          <Send className="size-3.5" />
          Piloter
        </Button>
      </form>
    </div>
  );
};
