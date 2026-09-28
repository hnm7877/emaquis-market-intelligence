'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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

  const { data: dynamicFilters } = useMarketFiltersQuery();
  const { data: contextualData, isLoading: isLoadingContextual } = useContextualFiltersQuery();

  const hasSyncedStatusRef = useRef<string | null>(null);

  // Auto-sélection dynamique des correspondants (pays, villes, communes, marques) liés au statut sélectionné
  useEffect(() => {
    if (!autoSyncContextual || !contextualData) return;

    // Clé unique pour déclencher la synchronisation dès que le statut ou les données contextuelles changent
    const currentStatusKey = `${filters.status || 'valid'}_${filters.dateRange || 'all'}_${contextualData.totalTransactions}`;
    if (hasSyncedStatusRef.current === currentStatusKey) return;
    hasSyncedStatusRef.current = currentStatusKey;

    const updates: Partial<FilterState> = {};

    // 1. Tous les pays ayant des ventes sous ce statut
    if (contextualData.countries && contextualData.countries.length > 0) {
      const activeCountries = contextualData.countries
        .map((c) => normalizeCountry(c.name) || c.name)
        .filter(Boolean);
      if (activeCountries.length > 0) {
        updates.country = activeCountries;
      }
    }

    // 2. Villes contextuelles ayant des ventes sous ce statut
    if (contextualData.cities && contextualData.cities.length > 0) {
      updates.city = contextualData.cities.map((c) => c.name);
    }

    // 3. Communes contextuelles ayant des ventes sous ce statut
    if (contextualData.communes && contextualData.communes.length > 0) {
      updates.commune = contextualData.communes.map((c) => c.name);
    }

    // 4. Catégories contextuelles ayant des ventes sous ce statut
    if (contextualData.categories && contextualData.categories.length > 0) {
      updates.category = contextualData.categories.map((c) => c.name);
    }

    // 5. Marques contextuelles ayant des ventes sous ce statut
    if (contextualData.brands && contextualData.brands.length > 0) {
      updates.brand = contextualData.brands.map((b) => b.name);
    }

    if (Object.keys(updates).length > 0) {
      setMultipleFilters(updates);
    }
  }, [filters.status, filters.dateRange, contextualData, autoSyncContextual, setMultipleFilters]);

  // Normalisation de la liste des pays avec drapeaux
  const countriesOptions: SmartFilterOption[] = useMemo(() => {
    return PAYS.map((p) => ({
      value: p.code,
      label: p.name.replace(/_/g, ' '),
      flag: p.flag,
    }));
  }, []);

  // Villes avec regroupement par pays et séparateurs visuels
  const citiesOptions: SmartFilterOption[] = useMemo(() => {
    const options: SmartFilterOption[] = [];
    options.push({ value: 'Toutes les villes', label: 'Toutes les villes' });

    // Dictionnaire pays pour chaque ville connue
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

  // Communes avec regroupement par Ville / Région et séparateurs visuels
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

  // Catégories (Multi-sélection contextuelle)
  const categoriesList = useMemo(() => {
    return dynamicFilters?.categories?.length
      ? ['Toutes catégories', ...dynamicFilters.categories]
      : [
          'Toutes catégories',
          'Bières',
          'Boissons gazeuses',
          'Énergisantes',
          'Spiritueux',
          'Vins & Champagnes',
          'Eaux & Jus',
        ];
  }, [dynamicFilters?.categories]);

  // Marques avec regroupement Brasseur / Fabricant
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

  // Types de point de vente
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

  // Compter le nombre de filtres actifs non par défaut
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
    <div className="relative z-30 bg-card/75 border border-border/80 rounded-2xl p-3 shadow-md mb-6 backdrop-blur-xl transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Ligne principale des filtres dimensionnels */}
        <div className="flex flex-wrap items-center gap-2 flex-1 relative z-20">
          {/* Période temporelle */}
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground ml-1 shrink-0" />
            <Select
              value={typeof filters.dateRange === 'string' ? filters.dateRange : 'all'}
              onValueChange={(val) => {
                if (val) setFilter('dateRange', val as DateRange);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[135px] bg-background/60">
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

          {/* Statut de transaction (élément pivot qui pilote la sélection automatique) */}
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-amber-500 ml-1 shrink-0 animate-pulse" />
            <Select
              value={filters.status || 'valid'}
              onValueChange={(val) => {
                if (val) setFilter('status', val);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[205px] bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold focus:ring-amber-500">
                <SelectValue placeholder="Statut de vente" />
              </SelectTrigger>
              <SelectContent className="max-h-64 z-[9999]">
                <SelectItem value="valid">Validées & Consommées (53 727)</SelectItem>
                <SelectItem value="all">Tous les statuts (Brut - 58 032)</SelectItem>
                <SelectItem value="success">Réglées avec succès (51 586)</SelectItem>
                <SelectItem value="pending">En attente / Tables actives (1 315)</SelectItem>
                <SelectItem value="return">Retours & Consignes (816)</SelectItem>
                <SelectItem value="canceled">Commandes annulées (4 305)</SelectItem>
                <SelectItem value="offered">Offertes par le maquis (10)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Pays (Multi-select intelligent avec drapeaux & sélection auto liée aux ventes) */}
          <SmartFilterDropdown
            icon={<Globe className="size-3.5" />}
            label="Pays"
            options={countriesOptions}
            value={filters.country || 'cote_d_ivoire'}
            allLabel="🌍 Tous les pays"
            contextualItems={contextualData?.countries}
            onChange={(val) => setFilter('country', val)}
            triggerWidth="w-[155px]"
            isLoadingContextual={isLoadingContextual}
            statusLabel={activeStatusName}
            isMultiSelect={true}
          />

          {/* Villes (Groupées par Pays avec séparateurs visuels et sélection auto) */}
          <SmartFilterDropdown
            icon={<MapPin className="size-3.5" />}
            label="Ville"
            options={citiesOptions}
            value={filters.city}
            allLabel="Toutes les villes"
            contextualItems={contextualData?.cities}
            onChange={(val) => setFilter('city', val)}
            triggerWidth="w-[150px]"
            isLoadingContextual={isLoadingContextual}
            statusLabel={activeStatusName}
          />

          {/* Communes (Groupées par Ville avec séparateurs visuels et sélection auto) */}
          <SmartFilterDropdown
            label="Commune"
            options={communesOptions}
            value={filters.commune}
            allLabel="Toutes les communes"
            contextualItems={contextualData?.communes}
            onChange={(val) => setFilter('commune', val)}
            triggerWidth="w-[155px]"
            isLoadingContextual={isLoadingContextual}
            statusLabel={activeStatusName}
          />

          {/* Catégories (Multi-sélection contextuelle) */}
          <SmartFilterDropdown
            icon={<Tag className="size-3.5" />}
            label="Catégorie"
            options={categoriesList}
            value={filters.category}
            allLabel="Toutes catégories"
            contextualItems={contextualData?.categories}
            onChange={(val) => setFilter('category', val)}
            triggerWidth="w-[150px]"
            isLoadingContextual={isLoadingContextual}
            statusLabel={activeStatusName}
          />

          {/* Marques (Groupées par Fabricant avec séparateurs visuels) */}
          <SmartFilterDropdown
            label="Marque"
            options={brandsOptions}
            value={filters.brand}
            allLabel="Toutes marques"
            contextualItems={contextualData?.brands}
            onChange={(val) => setFilter('brand', val)}
            triggerWidth="w-[145px]"
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
            triggerWidth="w-[150px]"
            isMultiSelect={true}
          />
        </div>

        {/* Contrôles latéraux : Sélecteur d'Unité de Volume + Auto-sync statut + Reset */}
        <div className="flex items-center gap-2 shrink-0 ml-auto relative z-20 flex-wrap">
          {/* Sélecteur d'Unité de Mesure des Volumes */}
          <div className="flex items-center gap-0.5 bg-background/80 border border-border/80 p-0.5 rounded-lg shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold px-1.5 uppercase tracking-wider hidden xl:inline flex items-center gap-1">
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
                    'h-7 px-2 rounded-md text-xs font-medium transition-all flex items-center gap-1 ' +
                    (isSelected
                      ? 'bg-amber-500 text-white font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60')
                  }
                  title={`${u.label} (${u.description})`}
                >
                  <span className="text-xs">{u.icon}</span>
                  <span className="hidden sm:inline text-[11px]">{u.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Bouton Toggle Auto-Sync */}
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
            <Sparkles className={'size-3 ' + (autoSyncContextual ? 'animate-spin-slow text-amber-500' : '')} />
            <span className="hidden md:inline">Auto-sync statut</span>
            <span
              className={
                'size-2 rounded-full ' +
                (autoSyncContextual ? 'bg-amber-500 shadow-xs shadow-amber-500/50' : 'bg-muted-foreground/40')
              }
            />
          </button>

          {/* Compteur de filtres actifs */}
          {activeFiltersCount > 0 && (
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              <Layers className="size-3" />
              <span>{activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Bouton Réinitialiser */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span>Réinitialiser</span>
          </Button>
        </div>
      </div>

      {/* Bandeau d'information contextuelle si ventes filtrées */}
      {contextualData && (
        <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-foreground font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {contextualData.totalTransactions?.toLocaleString('fr-FR')} ventes
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span>Statut actif : <strong className="text-amber-500">{activeStatusName}</strong></span>
            {contextualData.countries?.length > 0 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>{contextualData.countries.length} pays lié{contextualData.countries.length > 1 ? 's' : ''}</span>
              </>
            )}
            {contextualData.cities?.length > 0 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>{contextualData.cities.length} ville{contextualData.cities.length > 1 ? 's' : ''} couverte{contextualData.cities.length > 1 ? 's' : ''}</span>
              </>
            )}
            {contextualData.communes?.length > 0 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>{contextualData.communes.length} communes</span>
              </>
            )}
            {contextualData.brands?.length > 0 && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>{contextualData.brands.length} marques</span>
              </>
            )}
          </div>

          {autoSyncContextual && (
            <span className="text-[10px] text-amber-500/90 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
              Filtres synchronisés en multi-sélection
            </span>
          )}
        </div>
      )}
    </div>
  );
}
