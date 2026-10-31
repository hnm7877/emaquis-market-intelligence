'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Home, Layers, MapPin, Search, Store } from 'lucide-react';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';
import { anonymizeEstablishmentName } from '@/utils/anonymize';
import { Empty, Growth, Panel, Skeleton, fmtFcfa, fmtInt, EASE_OUT } from './ui';

type Level = 'root' | 'country' | 'city' | 'commune' | 'establishment';

interface Node {
  id: string;
  name: string;
  level: Level;
  volume: number;
  revenue: number;
  pos: number;
  growth?: number | null;
  gps?: boolean;
  children: Node[];
}

interface Props {
  unit: DisplayVolumeUnit;
  geoData?: any;
  onSelectTerritory: (name: string) => void;
}

const CHILD_LABEL: Record<Level, string> = { root: 'Pays', country: 'Villes', city: 'Communes', commune: 'Maquis', establishment: '' };

/** Pays → villes → communes → maquis (anonymisés), à partir des données géographiques réelles */
function buildTree(geoData: any): Node {
  const root: Node = { id: 'root', name: 'Réseau', level: 'root', volume: 0, revenue: 0, pos: 0, children: [] };
  const zones: any[] = geoData?.zones || [];
  const ests: any[] = geoData?.establishments || [];
  const estByZone = new Map<string, any[]>();
  for (const e of ests) {
    const k = `${String(e.city || '').toLowerCase()}|${String(e.zone || '').toLowerCase()}`;
    const list = estByZone.get(k) || [];
    list.push(e);
    estByZone.set(k, list);
  }
  const get = (parent: Node, name: string, level: Level) => {
    let n = parent.children.find((c) => c.name === name);
    if (!n) {
      n = { id: `${parent.id}/${name}`, name, level, volume: 0, revenue: 0, pos: 0, children: [] };
      parent.children.push(n);
    }
    return n;
  };
  for (const z of zones) {
    const volume = Number(z.volume) || 0;
    const revenue = Number(z.revenue) || 0;
    const pos = Number(z.posCount) || 0;
    const country = get(root, z.country || 'Pays non renseigné', 'country');
    const city = get(country, z.city || 'Ville inconnue', 'city');
    const commune = get(city, z.zone || 'Commune inconnue', 'commune');
    commune.growth = typeof z.growth === 'number' ? z.growth : null;
    for (const n of [root, country, city, commune]) {
      n.volume += volume;
      n.revenue += revenue;
      n.pos += pos;
    }
    const list = estByZone.get(`${String(z.city || '').toLowerCase()}|${String(z.zone || '').toLowerCase()}`) || [];
    list.forEach((e, i) => {
      commune.children.push({
        id: `${commune.id}/${e.id || i}`,
        name: anonymizeEstablishmentName(e.name, e.id, i),
        level: 'establishment',
        volume: Number(e.volume) || 0,
        revenue: Number(e.revenue) || 0,
        pos: 1,
        gps: Boolean(e.hasDirectGps),
        children: [],
      });
    });
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => b.volume - a.volume);
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

/**
 * Onglet « Pyramide territoriale » : exploration par clic du pays jusqu'au maquis.
 * Chaque niveau montre la part de chaque zone, son CA, ses maquis et le CA par maquis.
 */
export function TerritoryPyramidTab({ unit, geoData, onSelectTerritory }: Props) {
  const tree = useMemo(() => buildTree(geoData), [geoData]);
  const [path, setPath] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const vol = (n: number) => formatProductVolume(n, unit, 'Total').formatted;

  // Nœud courant (si les filtres ont changé et que le chemin n'existe plus, on remonte)
  const trail: Node[] = [tree];
  for (const id of path) {
    const next = trail[trail.length - 1].children.find((c) => c.id === id);
    if (!next) break;
    trail.push(next);
  }
  const node = trail[trail.length - 1];
  // Un seul pays : on l'ouvre directement
  const current = node.level === 'root' && node.children.length === 1 && path.length === 0 ? node.children[0] : node;
  const crumbs = current === node ? trail : [...trail, current];

  const q = query.trim().toLowerCase();
  const children = q ? current.children.filter((c) => c.name.toLowerCase().includes(q)) : current.children;
  const maxVol = Math.max(...current.children.map((c) => c.volume), 1);
  const avgPerPos = current.pos ? current.revenue / current.pos : 0;

  const open = (c: Node) => {
    if (c.level === 'commune' || c.level === 'city') onSelectTerritory(c.name);
    if (!c.children.length) return;
    setQuery('');
    setPath(crumbs.slice(1).map((n) => n.id).concat(c.id));
  };

  if (!geoData) return <Skeleton height={420} />;
  if (!tree.children.length) return <Empty height={300}>Aucune zone localisée pour ces filtres.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel
        className="xl:col-span-8"
        icon={<Layers className="size-4 text-amber-400" />}
        title="Pyramide territoriale"
        subtitle="Cliquez sur une ligne pour descendre d'un niveau"
        actions={
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1">
            <Search className="size-3.5 text-slate-500" />
            <span className="sr-only">Rechercher</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 60))}
              placeholder={`Chercher (${CHILD_LABEL[current.level].toLowerCase() || 'zone'})`}
              className="w-36 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </label>
        }
      >
        {/* Fil d'Ariane */}
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-[11px]" aria-label="Niveau">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <ChevronRight className="size-3 text-slate-600" />}
              <button
                onClick={() => setPath(crumbs.slice(1, i + 1).map((n) => n.id))}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors ${i === crumbs.length - 1 ? 'bg-amber-500/15 font-semibold text-amber-300' : 'text-slate-400 hover:text-white'}`}
              >
                {i === 0 && <Home className="size-3" />}
                {c.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.ul
            key={current.id + q}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1"
          >
            {children.slice(0, 200).map((c, i) => {
              const share = current.volume ? (c.volume / current.volume) * 100 : 0;
              const canOpen = c.children.length > 0;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => open(c)}
                    className={`group w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-left transition-colors ${canOpen ? 'hover:border-amber-500/40 hover:bg-slate-900' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 shrink-0 font-mono text-[10px] text-slate-500">#{i + 1}</span>
                      {c.level === 'establishment' ? <Store className="size-3.5 shrink-0 text-cyan-400" /> : <MapPin className="size-3.5 shrink-0 text-amber-400" />}
                      <span className="truncate text-xs font-semibold text-white">{c.name}</span>
                      {c.level === 'establishment' && (
                        <span className={`rounded px-1 text-[9px] ${c.gps ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{c.gps ? 'GPS' : 'adresse'}</span>
                      )}
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-300">{vol(c.volume)}</span>
                      {canOpen && <ChevronRight className="size-3.5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400" />}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-700" style={{ width: `${(c.volume / maxVol) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono text-[10px] text-amber-300">{share.toFixed(1)} %</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                      <span>CA {fmtFcfa(c.revenue)}</span>
                      {c.level !== 'establishment' && <span>{fmtInt(c.pos)} maquis</span>}
                      {c.level !== 'establishment' && c.pos > 0 && <span>{fmtFcfa(c.revenue / c.pos)} / maquis</span>}
                      {c.growth != null && <Growth value={c.growth} className="text-[10px]" />}
                    </div>
                  </button>
                </li>
              );
            })}
            {!children.length && <Empty height={120}>Aucun résultat.</Empty>}
          </motion.ul>
        </AnimatePresence>
      </Panel>

      <Panel className="xl:col-span-4" icon={<MapPin className="size-4 text-cyan-400" />} title={current.name} subtitle={`Niveau : ${CHILD_LABEL[current.level] ? `${CHILD_LABEL[current.level]} de cette zone` : 'maquis'}`}>
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Volume" value={vol(current.volume)} />
          <Kpi label="Chiffre d'affaires" value={fmtFcfa(current.revenue)} />
          <Kpi label="Maquis" value={fmtInt(current.pos)} />
          <Kpi label="CA moyen / maquis" value={fmtFcfa(avgPerPos)} />
        </div>
        {current.children.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-300">Concentration</div>
            <Concentration nodes={current.children} total={current.volume} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="truncate font-mono text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

/** Part du volume faite par les 3 premières zones : marché concentré ou éclaté */
function Concentration({ nodes, total }: { nodes: Node[]; total: number }) {
  const top3 = nodes.slice(0, 3).reduce((s, n) => s + n.volume, 0);
  const pct = total ? (top3 / total) * 100 : 0;
  const label = pct >= 70 ? 'Très concentré : quelques zones font le marché' : pct >= 45 ? 'Concentré' : 'Éclaté : le volume est réparti';
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
        {nodes.slice(0, 3).map((n, i) => (
          <div key={n.id} title={n.name} className="h-full transition-[width] duration-700" style={{ width: `${total ? (n.volume / total) * 100 : 0}%`, background: ['#f59e0b', '#fb923c', '#fcd34d'][i] }} />
        ))}
      </div>
      <div className="mt-1.5 text-[11px] text-slate-400">
        Les 3 premières font <b className="text-white">{pct.toFixed(0)} %</b> du volume. {label}.
      </div>
    </div>
  );
}
