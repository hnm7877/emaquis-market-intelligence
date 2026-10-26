'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, FileText, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReportStore, type ReportTemplate } from '@/stores/useReportStore';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS: { template: ReportTemplate; label: string; hint: string; icon: React.ElementType }[] = [
  { template: 'market', label: 'Synthèse marché', hint: 'Ventes, marques, produits, communes, horaires', icon: FileText },
  { template: 'brand', label: 'Rapport marque', hint: 'Vos marques : ventes, stock, promotions', icon: FileText },
  { template: 'stock', label: 'Stock & ruptures', hint: 'Disponibilité et ruptures', icon: FileSpreadsheet },
  { template: 'promo', label: 'Bilan promotions', hint: 'Effet des remises', icon: FileSpreadsheet },
];

/** Raccourci d'export : ouvre le générateur de rapports sur le modèle choisi (PDF ou Excel) */
export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const router = useRouter();
  const go = (t: ReportTemplate) => {
    useReportStore.getState().applyTemplate(t);
    onOpenChange(false);
    router.push('/reports');
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Exporter un rapport</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choisissez un modèle : le rapport s&apos;ouvre avec les filtres actuels, prêt à être exporté en PDF ou en Excel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 py-2">
          {SHORTCUTS.map(({ template, label, hint, icon: Icon }) => (
            <button key={template} onClick={() => go(template)} className="p-3 rounded-xl border border-border/70 hover:bg-accent/40 text-left flex items-center gap-3 transition-colors">
              <Icon className="size-5 text-orange-500 shrink-0" />
              <span>
                <span className="text-xs font-semibold block text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-500" /> Chaque export est enregistré dans le journal d&apos;audit.</p>
      </DialogContent>
    </Dialog>
  );
}
