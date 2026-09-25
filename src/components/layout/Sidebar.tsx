'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Package,
  Layers,
  Award,
  Swords,
  TrendingUp,
  Boxes,
  Flame,
  FileSpreadsheet,
  Bot,
  Database,
  Building2,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
}

const mainNavItems: NavItem[] = [
  { label: "Vue d'ensemble", href: '/', icon: LayoutDashboard },
  { label: 'Géographie', href: '/geography', icon: MapPin },
  { label: 'Produits', href: '/products', icon: Package },
  { label: 'Marques', href: '/brands', icon: Award },
  { label: 'Catégories', href: '/categories', icon: Layers },
  { label: 'Concurrence', href: '/competition', icon: Swords, badge: 'Insights' },
  { label: 'Tendances & Horaires', href: '/trends', icon: TrendingUp },
  { label: 'Stock Intelligence', href: '/stock-intelligence', icon: Boxes, badge: 'Alertes' },
  { label: 'Promotions & Uplift', href: '/promotions', icon: Flame },
  { label: 'Générateur Rapports', href: '/reports', icon: FileSpreadsheet },
];

const intelligenceNavItems: NavItem[] = [
  { label: 'Agent IA DeerFlow', href: '/ai-intelligence', icon: Bot, badge: 'IA' },
  { label: 'Couverture Réseau', href: '/data-coverage', icon: Database, badge: '57k+' },
  { label: 'Portail Partenaire', href: '/partner', icon: Building2 },
  { label: 'Paramètres & Audit', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
            <span className="font-extrabold text-lg tracking-tight">EM</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-foreground">E-MAQUIS</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                PRO
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
              Market Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {/* Analytics Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
            <span>Analytique Marché</span>
            <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`size-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary transition-colors'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-accent text-accent-foreground border border-border/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Intelligence & Data Access */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
            <span>Intelligence B2B</span>
            <Sparkles className="size-3 text-amber-500 animate-pulse" />
          </div>
          <nav className="space-y-1">
            {intelligenceNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`size-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-amber-500 transition-colors'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Partner Tier Status Card */}
      <div className="p-3 border-t border-border">
        <div className="p-3 rounded-xl bg-gradient-to-br from-card to-accent/40 border border-border/80 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Accès Partenaire Pro
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              Actif
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Flux certifié E-Maquis • 57 744 transactions réelles indexées
          </p>
          <Link
            href="/partner"
            className="mt-1 text-[11px] font-semibold text-primary hover:underline flex items-center justify-between"
          >
            <span>Gérer l'abonnement</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
