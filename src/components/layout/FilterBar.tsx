'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  MapPin,
  Tag,
  Store,
  RotateCcw,
  Globe,
  Sparkles,
  Layers,
  Gauge,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterState, DateRange } from '@/types/market';
import { useMarketFiltersQuery, useContextualFiltersQuery } from '@/hooks/market/useMarketQueries';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { SmartFilterDropdown, SmartFilterOption } from '@/components/ui/smart-filter-dropdown';
import { PAYS, normalizeCountry } from '@/constants/countries';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';

const STATUS_LABELS: Record<string, string> = {
  valid: 'Validées & Consommées (53 727)',
  all: 'Tous les statuts (Brut - 58 032)',
  success: 'Réglées avec succès (51 586)',
  pending: 'En attente / Tables actives (1 315)',
  return: 'Retours & Consignes (816)',
  canceled: 'Commandes annulées (4 305)',
  offered: 'Offertes par le maquis (10)',
};

export interface FilterBarProps {
  filters?: FilterState;
  onFilterChange?: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset?: () => void;
}

export function FilterBar(props: FilterBarProps = {}) {
  const store = useMarketFilterStore();
  const filters = props.filters || store.filters;
  const setFilter = props.onFilterChange || store.setFilter;
  const resetFilters = props.onReset || store.resetFilters;
  const {
    setMultipleFilters,
    autoSyncContextual,
    setAutoSyncContextual,
    volumeUnit,
    setVolumeUnit,
  } = store;

  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { data: dynamicFilters } = useMarketFiltersQuery();
  const { data: contextualData, isLoading: isLoadingContextual } = useContextualFiltersQuery();

  const hasSyncedStatusRef = useRef<string | null>(null);

  // Auto-sélection dynamique des correspondants liés au statut
  useEffect(() => {
    if (!autoSyncContextual || !contextualData) return;

    const currentStatusKey = `${filters.status || 'valid'}_${filters.dateRange || 'all'}_${contextualData.totalTransactions}`;
    if (hasSyncedStatusRef.current === currentStatusKey) return;
    hasSyncedStatusRef.current = currentStatusKey;

    const updates: Partial<FilterState> = {};

    if (contextualData.countries && contextualData.countries.length > 0) {
      const activeCountries = contextualData.countries
        .map((c) => normalizeCountry(c.name) || c.name)
        .filter(Boolean);
      if (activeCountries.length > 0) {
        updates.country = activeCountries;
      }
    }

    if (contextualData.cities && contextualData.cities.length > 0) {
      updates.city = contextualData.cities.map((c) => c.name);
    }

    if (contextualData.communes && contextualData.communes.length > 0) {
      updates.commune = contextualData.communes.map((c) => c.name);
    }

    if (contextualData.categories && contextualData.categories.length > 0) {
      updates.category = contextualData.categories.map((c) => c.name);
    }

    if (contextualData.brands && contextualData.brands.length > 0) {
      updates.brand = contextualData.brands.map((b) => b.name);
    }

    if (Object.keys(updates).length > 0) {
      setMultipleFilters(updates);
    }
  }, [filters.status, filters.dateRange, contextualData, autoSyncContextual, setMultipleFilters]);

  // Options pays
  const countriesOptions: SmartFilterOption[] = useMemo(() => {
    return PAYS.map((p) => ({
      value: p.code,
      label: p.name.replace(/_/g, ' '),
      flag: p.flag,
    }));
  }, []);

  // Options villes
  const citiesOptions: SmartFilterOption[] = useMemo(() => {
    const options: SmartFilterOption[] = [];
    options.push({ value: 'Toutes les villes', label: 'Toutes les villes' });

    const cityCountryMap = new Map<string, string>();
    PAYS.forEach((p) => {
      const groupName = `${p.flag} ${p.name.replace(/_/g, ' ')}`;
      p.cities.forEach((c) => {
        cityCountryMap.set(c.toLowerCase().trim(), groupName);
      });
    });

    const allCityNames = new Set<string>();
    PAYS.forEach((p) => p.cities.forEach((c) => allCityNames.add(c)));
    (dynamicFilters?.cities || []).forEach((c: string) => allCityNames.add(c));
    (contextualData?.cities || []).forEach((c: any) => allCityNames.add(c.name));

    allCityNames.forEach((city) => {
      if (!city || city === 'Toutes les villes') return;
      const group = cityCountryMap.get(city.toLowerCase().trim()) || "🇨🇮 Côte d'Ivoire";
      options.push({
        value: city,
        label: city,
        group,
      });
    });

    return options;
  }, [dynamicFilters?.cities, contextualData?.cities]);

  // Options communes
  const communesOptions: SmartFilterOption[] = useMemo(() => {
    const options: SmartFilterOption[] = [];
    options.push({ value: 'Toutes les communes', label: 'Toutes les communes' });

    const abidjanCommunes = new Set([
      'yopougon',
      'cocody',
      'abobo',
      'marcory',
      'koumassi',
      'treichville',
      'adjamé',
      'adjame',
      'plateau',
      'port-bouët',
      'port-bouet',
      'attécoubé',
      'attecoube',
    ]);

    const allCommuneNames = new Set<string>([
      'Yopougon',
      'Cocody',
      'Abobo',
      'Marcory',
      'Koumassi',
      'Treichville',
      'Adjamé',
      'Plateau',
      'Port-Bouët',
      'Attécoubé',
      'Bingerville',
      'Tiassalé',
    ]);
    (dynamicFilters?.communes || []).forEach((c: string) => allCommuneNames.add(c));
    (contextualData?.communes || []).forEach((c: any) => allCommuneNames.add(c.name));

    allCommuneNames.forEach((commune) => {
      if (!commune || commune === 'Toutes les communes') return;
      const lower = commune.toLowerCase().trim();

      let group = '📍 Abidjan Métropole';
      if (lower.includes('bingerville')) {
        group = '📍 Grand Abidjan';
      } else if (lower.includes('tiassal')) {
        group = '📍 Agnéby-Tiassa';
      } else if (lower.includes('bouak')) {
        group = '📍 Bouaké';
      } else if (lower.includes('yamoussoukro')) {
        group = '📍 Yamoussoukro';
      } else if (!abidjanCommunes.has(lower)) {
        group = '📍 Intérieur & Régions';
      }

      options.push({
        value: commune,
        label: commune,
        group,
      });
    });

    return options;
  }, [dynamicFilters?.communes, contextualData?.communes]);

  // Options catégories
  const categoriesList = useMemo(() => {
    return dynamicFilters?.categories?.length
      ? ['Toutes catégories', ...dynamicFilters.categories]
      : [
          'Toutes catégories',
          'Bières',
          'Boissons gazeuses',
          'Boissons énergisantes',
          'Spiritueux',
          'Vins & Champagnes',
          'Eaux & Jus',
        ];
  }, [dynamicFilters?.categories]);

  // Options marques
  const brandsOptions: SmartFilterOption[] = useMemo(() => {
    const rawList = dynamicFilters?.brands?.length
      ? dynamicFilters.brands.map((b) => b.replace(/_/g, ' '))
      : ['SOLIBRA', 'BRASSIVOIRE', 'Coca-Cola Co', 'Brakina', 'Bramali', 'Guinness / Diageo', 'Pernod Ricard'];

    const options: SmartFilterOption[] = [{ value: 'Toutes marques', label: 'Toutes marques' }];

    rawList.forEach((brand) => {
      let group = 'Autres Marques';
      const bUpper = brand.toUpperCase();
      if (bUpper.includes('SOLIBRA') || bUpper.includes('BOCK') || bUpper.includes('BEAUFORT') || bUpper.includes('CASTEL')) {
        group = '🍺 Groupe SOLIBRA';
      } else if (bUpper.includes('BRASSIVOIRE') || bUpper.includes('IVOIRE') || bUpper.includes('HEINEKEN') || bUpper.includes('DESPERADOS')) {
        group = '🍺 Groupe BRASSIVOIRE';
      } else if (bUpper.includes('COCA') || bUpper.includes('FANTA') || bUpper.includes('SPRITE')) {
        group = '🥤 Sodas & Soft Drinks';
      } else if (bUpper.includes('GUINNESS') || bUpper.includes('DIAGEO')) {
        group = '🍷 Diageo / Guinness';
      } else if (bUpper.includes('BRAKINA') || bUpper.includes('BRAMALI')) {
        group = '🌍 Régional (Burkina / Mali)';
      }

      options.push({
        value: brand,
        label: brand,
        group,
      });
    });

    return options;
  }, [dynamicFilters?.brands]);

  // Types d'établissement
  const posTypesList = useMemo(() => {
    return dynamicFilters?.posTypes?.length
      ? ['Tous types', ...dynamicFilters.posTypes]
      : [
          'Tous types',
          'Maquis traditionnel',
          'Bar VIP / Lounge',
          'Restaurant',
          'Hôtel',
          'Dépôt / Grossiste',
        ];
  }, [dynamicFilters?.posTypes]);

  const activeStatusName = STATUS_LABELS[filters.status || 'valid'] || 'Validées';

  // Compter les filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const isCustom = (val: any, def: string) => {
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0 && !val.includes(def) && !val.includes('all');
      return val !== def && val !== 'all';
    };

    if (filters.country && filters.country !== 'cote_d_ivoire' && filters.country !== 'all') count++;
    if (filters.dateRange && filters.dateRange !== 'all') count++;
    if (isCustom(filters.city, 'Toutes les villes')) count++;
    if (isCustom(filters.commune, 'Toutes les communes')) count++;
    if (isCustom(filters.category, 'Toutes catégories')) count++;
    if (isCustom(filters.brand, 'Toutes marques')) count++;
    if (isCustom(filters.posType, 'Tous types')) count++;
    if (filters.status && filters.status !== 'valid') count++;
    return count;
  }, [filters]);

  const currentVolumeUnit = volumeUnit || 'cols';

  return (
    <div className="relative z-30 bg-card/75 border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-md mb-6 backdrop-blur-xl transition-all" suppressHydrationWarning>
      {/* Mobile Top Bar with Summary & Toggle */}
      <div className="flex lg:hidden items-center justify-between pb-2 border-b border-border/40 gap-2">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground"
        >
          <Filter className="size-3.5 text-amber-500" />
          <span>Filtres &amp; Dimensions</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
              {activeFiltersCount}
            </span>
          )}
          {mobileExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {/* Quick Reset on Mobile */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Main Filter Content (Visible always on Desktop, togglable on Mobile) */}
      <div className={`mt-2.5 lg:mt-0 ${mobileExpanded ? 'block' : 'hidden lg:block'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Dimensional Filters Row / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2 flex-1 relative z-20">
            {/* Période temporelle */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Calendar className="size-3.5 text-muted-foreground ml-1 shrink-0 hidden sm:block" />
              <Select
                value={typeof filters.dateRange === 'string' ? filters.dateRange : 'all'}
                onValueChange={(val) => {
                  if (val) setFilter('dateRange', val as DateRange);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-[135px] bg-background/60">
                  <SelectValue placeholder="Période">
                    {filters.dateRange === 'all'
                      ? 'Toutes les dates'
                      : filters.dateRange === '7d'
                      ? '7 derniers jours'
                      : filters.dateRange === '30d'
                      ? '30 derniers jours'
                      : filters.dateRange === '90d'
                      ? '90 derniers jours'
                      : filters.dateRange === '12m'
                      ? '12 derniers mois'
                      : 'Période'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="all">Toutes les dates (Global)</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                  <SelectItem value="12m">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statut de vente */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Activity className="size-3.5 text-amber-500 ml-1 shrink-0 animate-pulse hidden sm:block" />
              <Select
                value={filters.status || 'valid'}
                onValueChange={(val) => {
                  if (val) setFilter('status', val);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-[205px] bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold focus:ring-amber-500">
                  <SelectValue placeholder="Statut de vente" />
                </SelectTrigger>
                <SelectContent className="max-h-64 z-[9999]">
                  <SelectItem value="valid">Validées &amp; Consommées (53 727)</SelectItem>
                  <SelectItem value="all">Tous les statuts (Brut - 58 032)</SelectItem>
                  <SelectItem value="success">Réglées avec succès (51 586)</SelectItem>
                  <SelectItem value="pending">En attente / Tables (1 315)</SelectItem>
                  <SelectItem value="return">Retours &amp; Consignes (816)</SelectItem>
                  <SelectItem value="canceled">Commandes annulées (4 305)</SelectItem>
                  <SelectItem value="offered">Offertes par le maquis (10)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-5 w-px bg-border/60 mx-1 hidden xl:block" />

            {/* Pays */}
            <SmartFilterDropdown
              icon={<Globe className="size-3.5" />}
              label="Pays"
              options={countriesOptions}
              value={filters.country || 'cote_d_ivoire'}
              allLabel="🌍 Tous les pays"
              contextualItems={contextualData?.countries}
              onChange={(val) => setFilter('country', val)}
              triggerWidth="w-full sm:w-[150px]"
              isLoadingContextual={isLoadingContextual}
              statusLabel={activeStatusName}
              isMultiSelect={true}
            />

            {/* Villes */}
            <SmartFilterDropdown
              icon={<MapPin className="size-3.5" />}
              label="Ville"
              options={citiesOptions}
              value={filters.city}
              allLabel="Toutes les villes"
              contextualItems={contextualData?.cities}
              onChange={(val) => setFilter('city', val)}
              triggerWidth="w-full sm:w-[145px]"
              isLoadingContextual={isLoadingContextual}
              statusLabel={activeStatusName}
            />

            {/* Communes */}
            <SmartFilterDropdown
              label="Commune"
              options={communesOptions}
              value={filters.commune}
              allLabel="Toutes les communes"
              contextualItems={contextualData?.communes}
              onChange={(val) => setFilter('commune', val)}
              triggerWidth="w-full sm:w-[150px]"
              isLoadingContextual={isLoadingContextual}
              statusLabel={activeStatusName}
            />

            {/* Catégories */}
            <SmartFilterDropdown
              icon={<Tag className="size-3.5" />}
              label="Catégorie"
              options={categoriesList}
              value={filters.category}
              allLabel="Toutes catégories"
              contextualItems={contextualData?.categories}
              onChange={(val) => setFilter('category', val)}
              triggerWidth="w-full sm:w-[145px]"
              isLoadingContextual={isLoadingContextual}
              statusLabel={activeStatusName}
            />

            {/* Marques */}
            <SmartFilterDropdown
              label="Marque"
              options={brandsOptions}
              value={filters.brand}
              allLabel="Toutes marques"
              contextualItems={contextualData?.brands}
              onChange={(val) => setFilter('brand', val)}
              triggerWidth="w-full sm:w-[145px]"
              isLoadingContextual={isLoadingContextual}
              statusLabel={activeStatusName}
            />

            {/* Types d'établissement */}
            <SmartFilterDropdown
              icon={<Store className="size-3.5" />}
              label="Établissement"
              options={posTypesList}
              value={filters.posType}
              allLabel="Tous types"
              onChange={(val) => setFilter('posType', val)}
              triggerWidth="w-full sm:w-[145px]"
              isMultiSelect={true}
            />
          </div>

          {/* Lateral Controls: Units Selector + Auto-sync + Reset */}
          <div className="flex items-center gap-2 shrink-0 lg:ml-auto relative z-20 flex-wrap justify-between sm:justify-end pt-2 lg:pt-0 border-t border-border/40 lg:border-t-0">
            {/* Volume Measurement Units Selector */}
            <div className="flex items-center gap-0.5 bg-background/80 border border-border/80 p-0.5 rounded-lg shadow-2xs overflow-x-auto max-w-full">
              <span className="text-[10px] text-muted-foreground font-semibold px-1.5 uppercase tracking-wider hidden 2xl:inline flex items-center gap-1">
                <Gauge className="size-3 text-amber-500" />
                Volume :
              </span>
              {VOLUME_UNIT_OPTIONS.map((u) => {
                const isSelected = currentVolumeUnit === u.value;
                return (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setVolumeUnit(u.value)}
                    className={
                      'h-7 px-2 rounded-md text-xs font-medium transition-all flex items-center gap-1 shrink-0 ' +
                      (isSelected
                        ? 'bg-amber-500 text-black font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60')
                    }
                    title={`${u.label} (${u.description})`}
                  >
                    <span className="text-xs">{u.icon}</span>
                    <span className="text-[11px]">{u.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Auto-Sync Toggle */}
            <button
              type="button"
              onClick={() => setAutoSyncContextual(!autoSyncContextual)}
              className={
                'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all ' +
                (autoSyncContextual
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-xs'
                  : 'border-border/80 bg-background/50 text-muted-foreground hover:text-foreground')
              }
              title={
                autoSyncContextual
                  ? 'La sélection automatique des filtres selon le statut est active'
                  : 'Cliquer pour activer la sélection automatique liée aux ventes'
              }
            >
              <Sparkles className={'size-3 ' + (autoSyncContextual ? 'animate-spin text-amber-500' : '')} />
              <span className="hidden sm:inline">Auto-sync</span>
              <span
                className={
                  'size-2 rounded-full ' +
                  (autoSyncContextual ? 'bg-amber-500 shadow-xs shadow-amber-500/50' : 'bg-muted-foreground/40')
                }
              />
            </button>

            {/* Desktop Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="hidden lg:flex h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>Réinitialiser</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contextual Information Summary Banner */}
      {contextualData && (
        <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-muted-foreground relative z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-foreground font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {contextualData.totalTransactions?.toLocaleString('fr-FR')} ventes
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className="truncate max-w-[200px] sm:max-w-none">Statut : <strong className="text-amber-500">{activeStatusName}</strong></span>
          </div>

          {autoSyncContextual && (
            <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
              Filtres synchronisés
            </span>
          )}
        </div>
      )}
    </div>
  );
}
