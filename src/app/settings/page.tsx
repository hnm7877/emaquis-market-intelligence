'use client';

import React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Settings, History } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="size-5 text-orange-500" />
            Paramètres & Journal d'Audit (Audit Log)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Traçabilité des consultations et respect des règles de confidentialité.
          </p>
        </div>
      </div>

      <Card className="p-6 border border-border/80 bg-card/70 space-y-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="size-4 text-emerald-500" />
          Derniers accès aux données de marché (Audit Log)
        </CardTitle>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 flex justify-between">
            <span>25/09/2026 01:15 — Requête : <strong>Abidjan / Bières / 30j</strong></span>
            <span className="text-muted-foreground font-mono">Status: AUTORISÉ (RBAC Partenaire)</span>
          </div>
          <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 flex justify-between">
            <span>24/09/2026 22:40 — Export rapport : <strong>Yopougon_Bieres_Q3.pdf</strong></span>
            <span className="text-muted-foreground font-mono">Status: SUCCÈS</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
