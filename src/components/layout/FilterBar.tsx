'use client';

import React from 'react';
import {
  Calendar,
  MapPin,
  Tag,
  Store,
  RotateCcw,
  Globe,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterState, DateRange, City, Commune, Category, Brand, PosType } from '@/types/market';
import { useMarketFiltersQuery } from '@/hooks/market/useMarketQueries';
import { PAYS } from '@/constants/countries';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const { data: dynamicFilters } = useMarketFiltersQuery();

  // Liste des pays (PAYS croisé avec metadata API)
  const countriesList = dynamicFilters?.countries?.length
    ? dynamicFilters.countries.map((c) => ({
        ...c,
        name: c.name.replace(/_/g, ' '),
      }))
    : PAYS.map((p) => ({
        code: p.code,
        name: p.name.replace(/_/g, ' '),
        flag: p.flag,
        phoneCode: p.phoneCode,
      }));

  const currentCountryCode = filters.country || 'cote_d_ivoire';
  const selectedCountryObj = countriesList.find((p) => p.code === currentCountryCode) || PAYS.find((p) => p.code === currentCountryCode);

  // Villes adaptées dynamiquement au pays sélectionné
  const countryCities = (PAYS.find((p) => p.code === currentCountryCode))?.cities || [];
  const citiesList = Array.from(
    new Set([
      'Toutes les villes',
      ...(countryCities.length ? countryCities : ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Daloa']),
      ...(dynamicFilters?.cities || []),
    ]),
  );

  const communesList = dynamicFilters?.communes?.length
    ? dynamicFilters.communes
    : [
        'Toutes les communes',
        'Yopougon',
        'Cocody',
        'Abobo',
        'Marcory',
        'Koumassi',
        'Treichville',
        'Adjamé',
        'Plateau',
        'Port-Bouët',
        'Bingerville',
      ];

  const categoriesList = dynamicFilters?.categories?.length
    ? dynamicFilters.categories
    : [
        'Toutes catégories',
        'Bières',
        'Boissons gazeuses',
        'Énergisantes',
        'Spiritueux',
        'Vins & Champagnes',
        'Eaux & Jus',
      ];

  const brandsList = dynamicFilters?.brands?.length
    ? dynamicFilters.brands.map((b) => b.replace(/_/g, ' '))
    : [
        'Toutes marques',
        'SOLIBRA',
        'BRASSIVOIRE',
        'Coca-Cola Co',
        'Brakina',
        'Bramali',
      ];

  const posTypesList = dynamicFilters?.posTypes?.length
    ? dynamicFilters.posTypes
    : [
        'Tous types',
        'Maquis traditionnel',
        'Bar VIP / Lounge',
        'Restaurant',
        'Hôtel',
        'Dépôt / Grossiste',
      ];

  return (
    <div className="bg-card/70 border border-border/80 rounded-xl p-3 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {/* Période */}
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted-foreground ml-1" />
          <Select
            value={filters.dateRange}
            onValueChange={(val) => {
              if (val) onFilterChange('dateRange', val as DateRange);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] bg-background/60">
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
            <SelectContent>
              <SelectItem value="all">Toutes les dates (Global)</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="12m">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pays (sans underscore) */}
        <div className="flex items-center gap-1.5">
          <Globe className="size-3.5 text-muted-foreground ml-1" />
          <Select
            value={currentCountryCode}
            onValueChange={(val) => {
              if (val) {
                onFilterChange('country', val);
                const matched = PAYS.find((p) => p.code === val);
                if (matched && matched.cities.length) {
                  onFilterChange('city', 'Toutes les villes');
                } else {
                  onFilterChange('city', 'Toutes les villes');
                }
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[155px] bg-background/60">
              <SelectValue placeholder="Pays">
                {selectedCountryObj
                  ? `${selectedCountryObj.flag} ${selectedCountryObj.name.replace(/_/g, ' ')}`
                  : (filters.country ? filters.country.replace(/_/g, ' ') : "🇨🇮 Côte d'Ivoire")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {countriesList.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-1.5">
                    <span>{c.flag}</span>
                    <span className="truncate">{c.name.replace(/_/g, ' ')}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ville */}
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 text-muted-foreground ml-1" />
          <Select
            value={filters.city}
            onValueChange={(val) => {
              if (val) onFilterChange('city', val as City);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[135px] bg-background/60">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {citiesList.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commune */}
        <Select
          value={filters.commune}
          onValueChange={(val) => {
            if (val) onFilterChange('commune', val as Commune);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-[155px] bg-background/60">
            <SelectValue placeholder="Commune" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {communesList.map((commune) => (
              <SelectItem key={commune} value={commune}>
                {commune}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Catégorie */}
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 text-muted-foreground ml-1" />
          <Select
            value={filters.category}
            onValueChange={(val) => {
              if (val) onFilterChange('category', val as Category);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[145px] bg-background/60">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {categoriesList.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marque */}
        <Select
          value={filters.brand}
          onValueChange={(val) => {
            if (val) onFilterChange('brand', val as Brand);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-[135px] bg-background/60">
            <SelectValue placeholder="Marque" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {brandsList.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type d'établissement */}
        <div className="flex items-center gap-1.5">
          <Store className="size-3.5 text-muted-foreground ml-1" />
          <Select
            value={filters.posType}
            onValueChange={(val) => {
              if (val) onFilterChange('posType', val as PosType);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[155px] bg-background/60">
              <SelectValue placeholder="Type d'établissement" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {posTypesList.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
      >
        <RotateCcw className="size-3.5" />
        <span>Réinitialiser</span>
      </Button>
    </div>
  );
}