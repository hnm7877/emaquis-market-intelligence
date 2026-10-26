'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BellRing, Building2, Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import { useMarketFiltersQuery, useMarketSessionQuery, marketQueryKeys } from '@/hooks/market/useMarketQueries';
import { createPartner, fetchMyAlerts, fetchPartners, updateMyAlerts, updatePartner, type MarketPartner } from '@/api/marketIntelligence.api';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : 'Jamais');
const partnersKey = [...marketQueryKeys.all, 'partners'] as const;

function apiMessage(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof m === 'string' ? m : Array.isArray(m) ? String(m[0]) : fallback;
}

export default function PartnerPage() {
  const { isPartner, isLoading } = useMarketSessionQuery();
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  return isPartner ? <MyAccount /> : <DistributorsAdmin />;
}

/** Distributeur : son abonnement, en lecture seule */
function MyAccount() {
  const { data: session } = useMarketSessionQuery();
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Header title="Mon compte" subtitle="Votre abonnement Market Intelligence E-Maquis." />
      <Card className="p-6 border border-border/80 bg-card/70 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{session?.company || '—'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="size-3.5" /> Abonnement actif
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{session?.subject}</p>
        <div>
          <p className="text-xs font-semibold mb-2">Vos marques</p>
          <div className="flex flex-wrap gap-2">
            {(session?.brands || []).length ? session!.brands!.map((b) => <Badge key={b} variant="outline">{b}</Badge>) : <span className="text-xs text-muted-foreground">Aucune marque associée</span>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Toutes les zones et tous les tableaux de bord vous sont ouverts. Sur la carte, les chiffres de chaque établissement sont donnés par tranche.
          Pour modifier vos marques ou votre abonnement, contactez l&apos;équipe E-Maquis.
        </p>
      </Card>
      <MyAlerts />
    </div>
  );
}

const alertsKey = [...marketQueryKeys.all, 'my-alerts'] as const;

/** Alertes de rupture par e-mail : activation, seuil, et ce qui serait envoyé aujourd'hui */
function MyAlerts() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: alertsKey, queryFn: fetchMyAlerts, staleTime: 60_000 });
  const [draft, setDraft] = useState<number | null>(null);
  const save = useMutation({
    mutationFn: updateMyAlerts,
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: alertsKey });
    },
  });
  if (isLoading) return <Card className="p-6 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></Card>;
  if (isError || !data) return <Card className="p-6 text-sm text-red-400">Alertes indisponibles pour le moment.</Card>;
  const threshold = draft ?? data.alertThreshold;

  return (
    <Card className="p-6 border border-border/80 bg-card/70 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><BellRing className="size-4 text-amber-500" /> Alertes de rupture par e-mail</CardTitle>
        <button
          role="switch"
          aria-checked={data.alertsEnabled}
          disabled={save.isPending}
          onClick={() => save.mutate({ alertsEnabled: !data.alertsEnabled })}
          className={`relative h-6 w-11 rounded-full transition-colors ${data.alertsEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
        >
          <span className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${data.alertsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Chaque jour à 7 h 30 et 16 h 30, vous recevez les communes où la disponibilité de vos marques passe sous votre seuil (une même alerte au plus une fois par jour).
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span>Seuil de disponibilité</span>
          <strong className="tabular-nums">{threshold} %</strong>
        </div>
        <input type="range" min={50} max={99} value={threshold} disabled={!data.alertsEnabled}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={() => draft != null && draft !== data.alertThreshold && save.mutate({ alertThreshold: draft })}
          onKeyUp={() => draft != null && draft !== data.alertThreshold && save.mutate({ alertThreshold: draft })}
          className="w-full accent-orange-500" />
      </div>
      <div>
        <p className="text-xs font-semibold mb-2">En ce moment sous {data.alertThreshold} % ({data.breaches.length})</p>
        {data.breaches.length === 0 ? (
          <p className="text-xs text-emerald-400">Vos marques sont bien disponibles partout. Rien à signaler.</p>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            {data.breaches.map((b) => (
              <div key={`${b.brand}|${b.zone}`} className="py-1.5 flex items-center justify-between gap-3">
                <span><strong>{b.brand}</strong> · {b.zone}</span>
                <span className="tabular-nums"><strong className="text-rose-400">{b.availabilityRate} %</strong> <span className="text-muted-foreground">({b.stockoutPos}/{b.positions})</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border/60 pt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold">Promotions des concurrents dans vos communes</p>
          <button
            role="switch"
            aria-checked={data.promoAlertsEnabled}
            disabled={save.isPending}
            onClick={() => save.mutate({ promoAlertsEnabled: !data.promoAlertsEnabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${data.promoAlertsEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
          >
            <span className={`absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${data.promoAlertsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">Une alerte quand une autre marque lance une promotion dans vos catégories, là où vos produits sont vendus. 7 derniers jours :</p>
        {data.competitorPromos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune promotion concurrente récente.</p>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            {data.competitorPromos.map((p) => (
              <div key={`${p.brand}|${p.product}|${p.zone}`} className="py-1.5 flex items-center justify-between gap-3">
                <span><strong>{p.brand}</strong> — {p.product} · {p.zone}</span>
                <span className="tabular-nums text-orange-400 shrink-0">{p.discountPercent == null ? '' : `−${p.discountPercent} % · `}{p.establishments} établ.</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {save.isError && <p className="text-xs text-red-400">{apiMessage(save.error, 'Enregistrement impossible.')}</p>}
    </Card>
  );
}

/** Administrateur E-Maquis : création et gestion des comptes distributeurs */
function DistributorsAdmin() {
  const queryClient = useQueryClient();
  const { data: partners, isLoading, isError } = useQuery({ queryKey: partnersKey, queryFn: fetchPartners });
  const { data: filters } = useMarketFiltersQuery();
  const knownBrands = useMemo(() => [...(filters?.brands || [])].sort((a, b) => a.localeCompare(b, 'fr')), [filters]);
  const [editing, setEditing] = useState<MarketPartner | 'new' | null>(null);

  const toggle = useMutation({
    mutationFn: (p: MarketPartner) => updatePartner(p.id, { active: !p.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partnersKey }),
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Header title="Distributeurs" subtitle="Comptes abonnés : connexion par code reçu par e-mail, consultation seule." />
        <Button size="sm" onClick={() => setEditing('new')} className="gap-1.5"><Plus className="size-4" /> Nouveau</Button>
      </div>

      {editing && (
        <PartnerForm
          partner={editing === 'new' ? null : editing}
          knownBrands={knownBrands}
          onDone={() => {
            setEditing(null);
            void queryClient.invalidateQueries({ queryKey: partnersKey });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <Card className="p-0 border border-border/80 bg-card/70 overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : isError ? (
          <p className="p-6 text-sm text-red-400">Impossible de charger les distributeurs.</p>
        ) : !partners?.length ? (
          <p className="p-6 text-sm text-muted-foreground">Aucun distributeur pour l&apos;instant.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b border-border/60">
              <tr><th className="text-left p-3">Entreprise</th><th className="text-left p-3">Marques</th><th className="text-left p-3">Dernière connexion</th><th className="text-left p-3">Statut</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3"><div className="font-semibold">{p.company}</div><div className="text-muted-foreground">{p.email}</div></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{p.brands.map((b) => <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>)}</div></td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(p.lastLoginAt)}</td>
                  <td className="p-3">{p.active ? <span className="text-emerald-400">Actif</span> : <span className="text-amber-400">Suspendu</span>}</td>
                  <td className="p-3 whitespace-nowrap text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Modifier</Button>
                    <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(p)}>{p.active ? 'Suspendre' : 'Réactiver'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function PartnerForm({ partner, knownBrands, onDone, onCancel }: { partner: MarketPartner | null; knownBrands: string[]; onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState(partner?.email || '');
  const [company, setCompany] = useState(partner?.company || '');
  const [brands, setBrands] = useState<string[]>(partner?.brands || []);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => (partner ? updatePartner(partner.id, { company, brands }) : createPartner({ email: email.trim(), company, brands })),
    onSuccess: onDone,
    onError: (e) => setError(apiMessage(e, 'Enregistrement impossible.')),
  });

  const toggleBrand = (b: string) => setBrands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));
  const addCustom = () => {
    const b = custom.trim();
    if (b && !brands.includes(b)) setBrands([...brands, b]);
    setCustom('');
  };

  return (
    <Card className="p-6 border border-primary/40 bg-card/70 space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold">{partner ? `Modifier ${partner.company}` : 'Nouveau distributeur'}</CardTitle>
        <button onClick={onCancel} aria-label="Fermer"><X className="size-4 text-muted-foreground" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span>E-mail de connexion</span>
          <Input type="email" value={email} disabled={!!partner} onChange={(e) => setEmail(e.target.value)} placeholder="contact@distributeur.ci" />
        </label>
        <label className="text-xs space-y-1">
          <span>Entreprise</span>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom du distributeur" />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-xs">Marques suivies (fabricants : Solibra, Brassivoire, Coca-Cola…)</p>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {[...new Set([...knownBrands, ...brands])].map((b) => (
            <button key={b} type="button" onClick={() => toggleBrand(b)}
              className={`text-[11px] px-2 py-1 rounded-full border ${brands.includes(b) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {b}
            </button>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} placeholder="Autre marque" />
          <Button size="sm" variant="outline" onClick={addCustom}>Ajouter</Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button size="sm" disabled={save.isPending || !company.trim() || (!partner && !email.trim())} onClick={() => { setError(null); save.mutate(); }}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : partner ? 'Enregistrer' : 'Créer le compte'}
        </Button>
      </div>
    </Card>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-2">
      <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"><Building2 className="size-5 text-orange-500" />{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
