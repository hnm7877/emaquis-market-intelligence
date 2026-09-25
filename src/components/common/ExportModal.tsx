'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Check, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onOpenChange(false);
      }, 1200);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Exporter un Rapport de Marché</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Générez un rapport exécutif certifié basé sur l'échantillon consolidé d'E-Maquis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selection */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                selectedFormat === 'pdf'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border/70 hover:bg-accent/40'
              }`}
            >
              <FileText className="size-5 text-red-500" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Rapport PDF</span>
                <span className="text-[10px] text-muted-foreground">Graphiques & Exécutif</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('excel')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                selectedFormat === 'excel'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border/70 hover:bg-accent/40'
              }`}
            >
              <FileSpreadsheet className="size-5 text-emerald-500" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Excel (.xlsx)</span>
                <span className="text-[10px] text-muted-foreground">Tableaux & Métriques</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('csv')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                selectedFormat === 'csv'
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border/70 hover:bg-accent/40'
              }`}
            >
              <Download className="size-5 text-blue-500" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Data CSV</span>
                <span className="text-[10px] text-muted-foreground">Données brutes agrégées</span>
              </div>
            </button>
          </div>

          {/* Legal / Transparency Disclaimer */}
          <div className="p-3 rounded-lg bg-accent/40 border border-border/60 text-[11px] text-muted-foreground flex gap-2">
            <ShieldCheck className="size-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice méthodologique :</strong> Les données exportées représentent les ventes observées dans le réseau E-Maquis (57 744 transactions réelles). Les données individuelles des consommateurs et établissements restent strictement anonymisées.
            </p>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isDone}
            className="text-xs gap-2 bg-primary text-primary-foreground font-semibold"
          >
            {isDone ? (
              <>
                <Check className="size-3.5 text-white" />
                <span>Téléchargement lancé</span>
              </>
            ) : isExporting ? (
              <span>Génération en cours...</span>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>Générer et Télécharger</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
