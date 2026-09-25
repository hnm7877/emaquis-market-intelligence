'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Download, Check } from 'lucide-react';

export default function ReportsPage() {
  const [partnerName, setPartnerName] = useState('Brasserie Partenaire FMCG');
  const [territory, setTerritory] = useState('Abidjan (Cocody & Yopougon)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-orange-500" />
            Générateur de Rapports Marché Personnalisés
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Production automatisée d\'études et synthèses exécutives avec mentions méthodologiques certifiées.
          </p>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-6 max-w-2xl space-y-4">
        <div>
          <CardTitle className="text-base font-semibold">Paramétrer le Rapport Partenaire</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sélectionnez les dimensions à inclure dans le livrable PDF / Excel.
          </CardDescription>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">Nom du Partenaire Destinataire :</label>
            <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="h-8 text-xs bg-background/80" />
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">Territoire analysé :</label>
            <Input value={territory} onChange={(e) => setTerritory(e.target.value)} className="h-8 text-xs bg-background/80" />
          </div>

          <div className="p-3 rounded-lg bg-accent/40 border border-border/60 text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground block">Sections incluses par défaut :</span>
            <p>• Résumé exécutif & KPIs clés</p>
            <p>• Évolution des volumes et parts de marché</p>
            <p>• Top 10 produits & analyse par brasserie</p>
            <p>• Cartographie de pénétration par commune</p>
            <p>• Analyse d\'impact promotionnel & alertes de stock</p>
            <p>• Notice méthodologique E-Maquis (57 744 transactions certifiées)</p>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full text-xs font-semibold gap-2 bg-primary text-primary-foreground">
          {success ? (
            <>
              <Check className="size-4 text-white" />
              <span>Rapport E-MAQUIS MARKET REPORT généré avec succès !</span>
            </>
          ) : isGenerating ? (
            <span>Compilation des données en cours...</span>
          ) : (
            <>
              <Download className="size-4" />
              <span>Générer et Exporter le Rapport PDF</span>
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
