'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronDown, Search, X, Sparkles } from 'lucide-react';
import { ContextualFilterItem, MultiFilterValue } from '@/types/market';
import { normalizeCountry } from '@/constants/countries';

export interface SmartFilterOption {
  value: string;
  label: string;
  flag?: string;
  group?: string; // Groupe d'appartenance (ex: Pays pour les villes, Ville pour les communes)
}

interface SmartFilterDropdownProps {
  /** Icône affichée à gauche */
  icon?: React.ReactNode;
  /** Label de la dimension (ex: "Pays", "Ville", "Commune", "Marque") */
  label: string;
  /** Liste des options (chaînes simples ou objets avec label/flag/group) */
  options: (string | SmartFilterOption)[];
  /** Valeur(s) sélectionnée(s) */
  value: MultiFilterValue;
  /** Label pour l'option globale (ex: "Toutes les villes") */
  allLabel: string;
  /** Suggestions contextuelles issues du statut de vente actif */
  contextualItems?: ContextualFilterItem[];
  /** Mode multi-sélection (par défaut: true) */
  isMultiSelect?: boolean;
  /** Callback lors d'un changement de sélection */
  onChange: (value: MultiFilterValue) => void;
  /** Largeur minimale du bouton trigger */
  triggerWidth?: string;
  /** Indique si les données contextuelles sont en cours de chargement */
  isLoadingContextual?: boolean;
  /** Nom du statut actif pour clarifier l'info-bulle contextuelle */
  statusLabel?: string;
}

const normalizeKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

export function SmartFilterDropdown({
  icon,
  label,
  options,
  value,
  allLabel,
  contextualItems = [],
  isMultiSelect = true,
  onChange,
  triggerWidth = 'w-[155px]',
  isLoadingContextual = false,
  statusLabel,
}: SmartFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Normalisation des options sous forme d'objets { value, label, flag, group }
  const normalizedOptions: SmartFilterOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Set des valeurs actuellement sélectionnées
  const selectedValues = useMemo(() => {
    if (!value) return new Set<string>();
    if (Array.isArray(value)) {
      return new Set(value);
    }
    if (typeof value === 'string') {
      if (value === allLabel || value === 'all') {
        return new Set<string>();
      }
      return new Set(value.split(',').map((s) => s.trim()).filter(Boolean));
    }
    return new Set<string>();
  }, [value, allLabel]);

  const isAllSelected = selectedValues.size === 0 || selectedValues.has(allLabel) || selectedValues.has('all');

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // Focus recherche lors de l'ouverture
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Map des comptes contextuels pour recherche O(1) avec support étendu des alias pays
  const contextualMap = useMemo(() => {
    const m = new Map<string, ContextualFilterItem>();
    contextualItems.forEach((item) => {
      m.set(item.name.toLowerCase().trim(), item);
      m.set(normalizeKey(item.name), item);

      // Si c'est un pays, associer également son code normalisé
      const normCode = normalizeCountry(item.name);
      if (normCode) {
        m.set(normCode.toLowerCase().trim(), item);
        m.set(normalizeKey(normCode), item);
      }
    });
    return m;
  }, [contextualItems]);

  const getContextualItem = useCallback(
    (optVal: string, optLabel?: string): ContextualFilterItem | undefined => {
      const kVal = optVal.toLowerCase().trim();
      if (contextualMap.has(kVal)) return contextualMap.get(kVal);

      const nVal = normalizeKey(optVal);
      if (contextualMap.has(nVal)) return contextualMap.get(nVal);

      if (optLabel) {
        const kLab = optLabel.toLowerCase().trim();
        if (contextualMap.has(kLab)) return contextualMap.get(kLab);
        const nLab = normalizeKey(optLabel);
        if (contextualMap.has(nLab)) return contextualMap.get(nLab);
      }

      const normCode = normalizeCountry(optVal) || (optLabel ? normalizeCountry(optLabel) : undefined);
      if (normCode) {
        const kCode = normCode.toLowerCase().trim();
        if (contextualMap.has(kCode)) return contextualMap.get(kCode);
        const nCode = normalizeKey(normCode);
        if (contextualMap.has(nCode)) return contextualMap.get(nCode);
      }

      return undefined;
    },
    [contextualMap],
  );

  const hasContextualData = useCallback(
    (optVal: string, optLabel?: string) => {
      if (optVal === allLabel || optVal === 'all') return true;
      return !!getContextualItem(optVal, optLabel);
    },
    [getContextualItem, allLabel],
  );

  const getCount = useCallback(
    (optVal: string, optLabel?: string) => {
      const item = getContextualItem(optVal, optLabel);
      return item?.count || 0;
    },
    [getContextualItem],
  );

  // Filtrage et regroupement ordonné avec séparateurs
  const sortedOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = normalizedOptions.filter((opt) => {
      if (!q) return true;
      return (
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q))
      );
    });

    // L'option "Tout" en tête
    const allOpt = filtered.find((o) => o.value === allLabel || o.value === 'all');
    const rest = filtered.filter((o) => o.value !== allLabel && o.value !== 'all');

    const hasGroups = rest.some((o) => !!o.group);

    if (hasGroups) {
      // Regrouper par groupe (ex: Pays pour les villes, Ville pour les communes)
      const groupMap = new Map<string, SmartFilterOption[]>();
      rest.forEach((o) => {
        const gName = o.group || 'Général';
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        groupMap.get(gName)!.push(o);
      });

      // Trier les groupes : ceux ayant des transactions contextuelles d'abord, puis alphabétiquement
      const sortedGroupEntries = Array.from(groupMap.entries()).sort(([gA, itemsA], [gB, itemsB]) => {
        const countA = itemsA.reduce((sum, item) => sum + getCount(item.value, item.label), 0);
        const countB = itemsB.reduce((sum, item) => sum + getCount(item.value, item.label), 0);
        if (countA > 0 && countB === 0) return -1;
        if (countA === 0 && countB > 0) return 1;
        if (countA !== countB) return countB - countA;
        return gA.localeCompare(gB, 'fr');
      });

      const groupedResult: SmartFilterOption[] = [];
      sortedGroupEntries.forEach(([, items]) => {
        // Dans chaque groupe, trier par volume de vente décroissant, puis alphabétique
        items.sort((a, b) => {
          const aCount = getCount(a.value, a.label);
          const bCount = getCount(b.value, b.label);
          if (aCount !== bCount) return bCount - aCount;
          return a.label.localeCompare(b.label, 'fr');
        });
        groupedResult.push(...items);
      });

      return allOpt ? [allOpt, ...groupedResult] : groupedResult;
    }

    // Tri standard sans groupes : ceux avec données de vente d'abord (trié par volume desc), puis alphabétique
    rest.sort((a, b) => {
      const aHas = hasContextualData(a.value, a.label);
      const bHas = hasContextualData(b.value, b.label);

      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      if (aHas && bHas) {
        return getCount(b.value, b.label) - getCount(a.value, a.label);
      }

      return a.label.localeCompare(b.label, 'fr');
    });

    return allOpt ? [allOpt, ...rest] : rest;
  }, [normalizedOptions, search, hasContextualData, getCount, allLabel]);

  // Liste des valeurs qui ont réellement des ventes dans ce contexte
  const activeContextualValues = useMemo(() => {
    return normalizedOptions
      .filter((o) => o.value !== allLabel && o.value !== 'all' && hasContextualData(o.value, o.label))
      .map((o) => o.value);
  }, [normalizedOptions, allLabel, hasContextualData]);

  // Formatage des compteurs
  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('fr-FR');
  };

  // Actions multi-sélection
  const handleToggle = (optVal: string) => {
    if (!isMultiSelect) {
      onChange(optVal);
      setIsOpen(false);
      return;
    }

    if (optVal === allLabel || optVal === 'all') {
      onChange(allLabel);
      return;
    }

    const next = new Set(selectedValues);
    if (isAllSelected) {
      onChange([optVal]);
      return;
    }

    if (next.has(optVal)) {
      next.delete(optVal);
    } else {
      next.add(optVal);
    }

    if (next.size === 0) {
      onChange(allLabel);
    } else {
      onChange(Array.from(next));
    }
  };

  // Cocher / Décocher tout un groupe à la fois
  const handleToggleGroup = (groupName: string) => {
    const groupItems = normalizedOptions.filter((o) => o.group === groupName);
    const groupValues = groupItems.map((o) => o.value);
    if (groupValues.length === 0) return;

    const next = new Set(isAllSelected ? [] : selectedValues);
    const allGroupSelected = groupValues.every((v) => next.has(v));

    if (allGroupSelected) {
      // Décocher le groupe
      groupValues.forEach((v) => next.delete(v));
    } else {
      // Cocher tous les éléments de ce groupe
      groupValues.forEach((v) => next.add(v));
    }

    if (next.size === 0) {
      onChange(allLabel);
    } else {
      onChange(Array.from(next));
    }
  };

  // Sélectionner automatiquement tous les correspondants liés à ces ventes
  const handleSelectActiveContextual = () => {
    if (activeContextualValues.length > 0) {
      onChange(activeContextualValues);
    }
  };

  const handleSelectAll = () => {
    onChange(allLabel);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Compter le nombre d'éléments par groupe pour afficher dans l'en-tête
  const groupCounts = useMemo(() => {
    const map = new Map<string, number>();
    normalizedOptions.forEach((o) => {
      if (o.group) {
        map.set(o.group, (map.get(o.group) || 0) + 1);
      }
    });
    return map;
  }, [normalizedOptions]);

  // Label affiché sur le bouton trigger
  const triggerDisplay = useMemo(() => {
    if (isAllSelected) {
      return allLabel;
    }
    const count = selectedValues.size;
    if (count === 1) {
      const firstVal = Array.from(selectedValues)[0];
      const match = normalizedOptions.find((o) => o.value === firstVal);
      return match ? (match.flag ? match.flag + ' ' + match.label : match.label) : firstVal;
    }
    if (count <= 2) {
      const items = Array.from(selectedValues).map((val) => {
        const match = normalizedOptions.find((o) => o.value === val);
        return match ? (match.flag ? match.flag + ' ' + match.label : match.label) : val;
      });
      return items.join(', ');
    }
    const suffix = label.toLowerCase().endsWith('s') ? '' : 's';
    return count + ' ' + label.toLowerCase() + suffix;
  }, [isAllSelected, allLabel, selectedValues, normalizedOptions, label]);

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-auto'}`}>
      {/* Bouton Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs transition-all select-none ' +
          triggerWidth + ' ' +
          (!isAllSelected
            ? 'border-primary/60 bg-primary/10 text-primary font-medium shadow-xs shadow-primary/10'
            : 'border-border/80 bg-background/60 hover:bg-muted/50 text-foreground')
        }
      >
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <span className="truncate flex-1 text-left">{triggerDisplay}</span>

        {!isAllSelected && selectedValues.size > 0 && (
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-semibold">
            {selectedValues.size}
          </span>
        )}

        <ChevronDown
          className={
            'size-3 shrink-0 text-muted-foreground transition-transform duration-200 ' +
            (isOpen ? 'rotate-180 text-foreground' : '')
          }
        />
      </button>

      {/* Menu Déroulant Popover avec Z-INDEX ÉLEVÉ pour ne jamais être en arrière-plan */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[9999] min-w-[290px] max-w-[370px] rounded-xl border border-border/90 bg-popover/98 backdrop-blur-2xl shadow-2xl p-1 animate-in fade-in-0 slide-in-from-top-2 duration-150 ring-1 ring-border/50">
          {/* Barre de recherche */}
          <div className="p-1.5 border-b border-border/50">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/50 border border-border/40">
              <Search className="size-3 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder={'Filtrer ' + label.toLowerCase() + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground/60 text-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Barre d'action rapide contextuelle */}
          {isMultiSelect && (
            <div className="px-2 py-1.5 border-b border-border/40 flex items-center justify-between gap-1 text-[11px]">
              {activeContextualValues.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectActiveContextual}
                  className="flex items-center gap-1 text-amber-500 hover:text-amber-400 font-medium px-1.5 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
                  title="Cocher tous les correspondants liés aux ventes de ce statut"
                >
                  <Sparkles className="size-3" />
                  <span>Ventes actives ({activeContextualValues.length})</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                >
                  Tout
                </button>
                {!isAllSelected && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors"
                  >
                    Vider
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bannière contextuelle du statut */}
          {statusLabel && activeContextualValues.length > 0 && (
            <div className="px-2.5 py-1 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[10px] text-amber-500 font-medium">
              <span>{activeContextualValues.length} {label.toLowerCase()} liés au statut</span>
              <span className="opacity-75">{statusLabel}</span>
            </div>
          )}

          {/* Liste des options défilante avec lignes de séparation et en-têtes de groupe */}
          <div className="max-h-[280px] overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
            {sortedOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Aucun résultat pour « {search} »
              </div>
            ) : (
              sortedOptions.map((opt, idx) => {
                const isAll = opt.value === allLabel || opt.value === 'all';
                const isSelected = isAll ? isAllSelected : selectedValues.has(opt.value);
                const hasData = hasContextualData(opt.value, opt.label);
                const count = getCount(opt.value, opt.label);

                // Détecter un changement de groupe pour afficher la ligne de séparation visuelle
                const prevOpt = idx > 0 ? sortedOptions[idx - 1] : null;
                const showGroupHeader =
                  !isAll &&
                  opt.group &&
                  (!prevOpt || prevOpt.group !== opt.group);

                const groupTotal = opt.group ? groupCounts.get(opt.group) || 0 : 0;
                const groupItems = opt.group ? normalizedOptions.filter((o) => o.group === opt.group) : [];
                const groupSelectedCount = groupItems.filter((o) => selectedValues.has(o.value)).length;
                const isGroupFullySelected = !isAllSelected && groupTotal > 0 && groupSelectedCount === groupTotal;

                return (
                  <React.Fragment key={opt.value}>
                    {/* Ligne de séparation et En-tête de Groupe */}
                    {showGroupHeader && (
                      <div className="pt-2.5 pb-1 px-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/60 mt-1.5 first:border-t-0 first:mt-0 select-none">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate text-foreground/90 font-medium">{opt.group}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-muted/80 text-muted-foreground font-mono">
                            {groupTotal}
                          </span>
                        </div>
                        {isMultiSelect && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleGroup(opt.group!);
                            }}
                            className="text-[9px] lowercase font-normal text-primary/80 hover:text-primary hover:underline px-1 transition-colors"
                          >
                            {isGroupFullySelected ? 'décocher tout' : 'cocher tout'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Option Individuelle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(opt.value)}
                      className={
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left group ' +
                        (isSelected
                          ? 'bg-primary/15 text-primary font-medium'
                          : hasData && !isAll
                          ? 'hover:bg-muted/70 text-foreground'
                          : 'hover:bg-muted/40 text-muted-foreground/80')
                      }
                    >
                      {/* Case à cocher multi-select */}
                      {isMultiSelect ? (
                        <span
                          className={
                            'shrink-0 size-4 rounded border flex items-center justify-center transition-all ' +
                            (isSelected
                              ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                              : 'border-border/80 group-hover:border-primary/50 bg-background/50')
                          }
                        >
                          {isSelected && <Check className="size-2.5 stroke-[3]" />}
                        </span>
                      ) : (
                        <span
                          className={
                            'shrink-0 size-3.5 rounded-full border flex items-center justify-center transition-all ' +
                            (isSelected ? 'border-primary bg-primary' : 'border-border/80')
                          }
                        >
                          {isSelected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                        </span>
                      )}

                      {/* Flag si présent (pays) */}
                      {opt.flag && <span className="shrink-0 text-sm leading-none">{opt.flag}</span>}

                      {/* Nom de l'option */}
                      <span className="flex-1 truncate">{opt.label}</span>

                      {/* Badge compteur de ventes contextuelles */}
                      {hasData && !isAll && count > 0 && (
                        <span
                          className={
                            'shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-md font-medium ' +
                            (isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground')
                          }
                          title={count.toLocaleString('fr-FR') + ' transactions sous ce statut'}
                        >
                          {formatCount(count)}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Pied avec loader si analyse contextuelle en cours */}
          {isLoadingContextual && (
            <div className="p-1.5 border-t border-border/40 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Actualisation des ventes...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
