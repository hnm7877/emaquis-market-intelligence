const fs = require('fs');
const path = require('path');

function write(p, content) {
  const fullPath = path.join(__dirname, p);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf-8');
  console.log(`✓ ${p}`);
}

// 1. APP LAYOUT
write('src/app/layout.tsx', `
import type { Metadata } from 'next';
import './globals.css';
import { ClientAppShell } from '@/components/layout/ClientAppShell';

export const metadata: Metadata = {
  title: 'E-Maquis Market Intelligence | Plateforme B2B de Business Intelligence',
  description:
    'Plateforme ivoirienne de Market Intelligence analysant les données réelles de consommation hors domicile (maquis, bars, restaurants) en Côte d\\\'Ivoire.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-orange-500 selection:text-white">
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
`);

// 2. CLIENT APP SHELL
write('src/components/layout/ClientAppShell.tsx', `
'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AiChatDrawer } from '@/components/common/AiChatDrawer';
import { ExportModal } from '@/components/common/ExportModal';

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenAiChat={() => setAiChatOpen(true)}
          onOpenExport={() => setExportOpen(true)}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <AiChatDrawer open={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
`);

// 3. OVERVIEW PAGE (src/app/page.tsx)
write('src/app/page.tsx', `
'use client';

import React, { useState } from 'react';
import {
  KPIS_DATA,
  PRODUCTS_DATA,
  BRANDS_DATA,
  GEOGRAPHY_DATA,
  ALERTS_DATA,
} from '@/data/mockMarketData';
import { FilterState } from '@/types/market';
import { FilterBar } from '@/components/layout/FilterBar';
import { KpiCard } from '@/components/common/KpiCard';
import { SalesEvolutionChart } from '@/components/charts/SalesEvolutionChart';
import { CategoryDistributionChart } from '@/components/charts/CategoryDistributionChart';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Flame,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function MarketOverviewPage() {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '30d',
    city: 'Abidjan',
    commune: 'Toutes les communes',
    category: 'Toutes catégories',
    brand: 'Toutes marques',
    posType: 'Tous types',
  });

  const handleFilterChange = (key: keyof FilterState, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setFilters({
      dateRange: '30d',
      city: 'Abidjan',
      commune: 'Toutes les communes',
      category: 'Toutes catégories',
      brand: 'Toutes marques',
      posType: 'Tous types',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Market Overview — Côte d'Ivoire
            </h1>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              Échantillon E-Maquis V2
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tableau de bord consolidé de la consommation de boissons et PGC sur le terrain.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link href="/data-coverage">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/80">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Transparence & Couverture</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary font-semibold text-primary-foreground">
              <Sparkles className="size-3.5" />
              <span>Générer Rapport</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Interactive Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* 8 Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {KPIS_DATA.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesEvolutionChart />
        </div>
        <div>
          <CategoryDistributionChart />
        </div>
      </div>

      {/* Secondary Row: Geography & Top Products Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeographicBarChart />

        {/* Top Products Leaderboard */}
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Top Produits & Vélocité Marché
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Classement par volume de ventes et vitesse de rotation
              </CardDescription>
            </div>
            <Link href="/products" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <span>Voir tout</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {PRODUCTS_DATA.slice(0, 5).map((p, idx) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/40 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground font-bold w-4">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-foreground block">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {p.brand} • {p.format} • Rotation {p.rotationRate}x/sem.
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-foreground block font-mono">
                      {p.volumeSales.toLocaleString()} cols
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-500">
                      +{p.growthPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Market Alerts & Brand Competition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Market Alerts */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Alertes & Signaux Faibles du Marché
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Anomalies de demande, hausses soudaines et risques de rupture détectés automatiquement
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {ALERTS_DATA.length} alertes
              </Badge>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {ALERTS_DATA.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 rounded-lg border border-border/60 bg-background/50 hover:border-amber-500/40 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-xs">{alt.title}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {alt.confidence}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-orange-500">
                      {alt.variation}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {alt.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                    <span>Zone : <strong>{alt.zone}</strong></span>
                    <span>Échantillon : {alt.samplePosCount} établissements observés</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Brand Shares Summary */}
        <div>
          <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Parts de Marché par Brasserie
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Volume relatif dans le réseau E-Maquis
                </CardDescription>
              </div>
              <Link href="/brands" className="text-xs text-primary font-medium hover:underline">
                Détail
              </Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {BRANDS_DATA.map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{b.name}</span>
                    <span className="font-mono font-bold text-foreground">{b.marketShare}%</span>
                  </div>
                  <div className="h-2 w-full bg-accent/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: \`\${b.marketShare}%\` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Croissance : +{b.growthPercent}%</span>
                    <span>Taux pénétration : {b.penetrationRate}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
`);

// 4. GEOGRAPHY PAGE
write('src/app/geography/page.tsx', `
'use client';

import React, { useState } from 'react';
import { GEOGRAPHY_DATA } from '@/data/mockMarketData';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ArrowUpRight, TrendingUp, Building } from 'lucide-react';

export default function GeographyPage() {
  const [search, setSearch] = useState('');

  const filtered = GEOGRAPHY_DATA.filter((g) =>
    g.commune.toLowerCase().includes(search.toLowerCase()) ||
    g.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MapPin className="size-5 text-orange-500" />
            Intelligence Géographique & Zonale
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cartographie et analyse des volumes, dynamiques et indices de demande par ville et commune.
          </p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Filtrer une commune (ex: Cocody)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-background/80"
          />
        </div>
      </div>

      {/* Top Graphic Chart */}
      <GeographicBarChart />

      {/* Communes Detail Table */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Performance Détaillée par Commune ({filtered.length} zones)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Données de rotation, demande et produits locomotives observés
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Commune & Ville</th>
                  <th className="py-2.5 px-3">Établissements Actifs</th>
                  <th className="py-2.5 px-3">Volume (Cols)</th>
                  <th className="py-2.5 px-3">Part Réseau</th>
                  <th className="py-2.5 px-3">Croissance</th>
                  <th className="py-2.5 px-3">Indice Demande</th>
                  <th className="py-2.5 px-3">Produit N°1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((zone) => (
                  <tr key={zone.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-foreground block">{zone.commune}</span>
                      <span className="text-[10px] text-muted-foreground">{zone.city}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">{zone.posCount} maquis/bars</td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      {zone.volume.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono">{zone.sharePercent}%</td>
                    <td className="py-3 px-3 font-semibold text-emerald-500">
                      +{zone.growthPercent}%
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{zone.demandIndex}</span>
                        <div className="h-1.5 w-16 bg-accent rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: \`\${zone.demandIndex}%\` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {zone.topProduct}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

// 5. PRODUCTS PAGE
write('src/app/products/page.tsx', `
'use client';

import React, { useState } from 'react';
import { PRODUCTS_DATA } from '@/data/mockMarketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Flame, AlertCircle } from 'lucide-react';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');

  const filtered = PRODUCTS_DATA.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchBrand = filterBrand === 'ALL' || p.brand === filterBrand;
    return matchSearch && matchBrand;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="size-5 text-orange-500" />
            Performance des Produits & Rotations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vélocité de vente, fréquence de réassort et analyse des risques de rupture par SKU.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Rechercher un produit ou marque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-56 bg-background/80"
          />
        </div>
      </div>

      {/* Brand quick filter pills */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Filtrer par brasserie :</span>
        {['ALL', 'SOLIBRA', 'BRASSIVOIRE', 'Coca-Cola Co', 'Guinness / Diageo'].map((b) => (
          <button
            key={b}
            onClick={() => setFilterBrand(b)}
            className={\`px-2.5 py-1 rounded-md transition-colors text-xs \${
              filterBrand === b
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground'
            }\`}
          >
            {b === 'ALL' ? 'Toutes les marques' : b}
          </button>
        ))}
      </div>

      {/* Products Grid / Table */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Catalogue Produits Analysés ({filtered.length} références)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Données de vélocité basées sur les tickets de caisse consolidés
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Produit & Format</th>
                  <th className="py-2.5 px-3">Brasserie</th>
                  <th className="py-2.5 px-3">Volume Vendu</th>
                  <th className="py-2.5 px-3">Croissance</th>
                  <th className="py-2.5 px-3">Rotation Hebdo</th>
                  <th className="py-2.5 px-3">Risque Rupture</th>
                  <th className="py-2.5 px-3">Zones Fortes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-foreground block">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.format}</span>
                    </td>
                    <td className="py-3 px-3 font-medium">{p.brand}</td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      {p.volumeSales.toLocaleString()} cols
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <span className={p.growthPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {p.growthPercent >= 0 ? \`+\${p.growthPercent}%\` : \`\${p.growthPercent}%\`}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {p.rotationRate}x / sem.
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant="outline"
                        className={\`text-[10px] font-medium \${
                          p.stockoutRisk === 'Élevé'
                            ? 'border-red-500/40 text-red-500 bg-red-500/10'
                            : p.stockoutRisk === 'Modéré'
                            ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                            : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                        }\`}
                      >
                        {p.stockoutRisk}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {p.topZones.map((z, idx) => (
                          <span key={idx} className="text-[10px] bg-accent px-1.5 py-0.5 rounded border border-border/50">
                            {z}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

console.log('✅ Pages Part 1 generated successfully!');
