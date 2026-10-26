import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ReportSectionId } from '@/lib/reports/buildReport';

export type ReportTemplate = 'market' | 'brand' | 'stock' | 'promo';

export const ALL_SECTIONS: ReportSectionId[] = ['overview', 'brands', 'products', 'geography', 'trends', 'stock', 'promotions'];

export const TEMPLATES: Record<ReportTemplate, { label: string; description: string; sections: ReportSectionId[] }> = {
  market: { label: 'Synthèse marché', description: 'Vue complète du marché sur la période', sections: ['overview', 'brands', 'products', 'geography', 'trends'] },
  brand: { label: 'Rapport marque', description: 'Vos marques : ventes, stock, promotions', sections: ['overview', 'brands', 'products', 'stock', 'promotions'] },
  stock: { label: 'Stock & ruptures', description: 'Disponibilité et ruptures par marque', sections: ['overview', 'stock'] },
  promo: { label: 'Bilan promotions', description: 'Effet des promotions et remises', sections: ['overview', 'promotions'] },
};

export interface SavedReport {
  at: string;
  title: string;
  format: 'pdf' | 'xlsx';
  sections: ReportSectionId[];
}

interface ReportState {
  template: ReportTemplate;
  title: string;
  recipient: string;
  sections: ReportSectionId[];
  history: SavedReport[];
  set: (patch: Partial<Pick<ReportState, 'title' | 'recipient'>>) => void;
  applyTemplate: (t: ReportTemplate) => void;
  toggleSection: (id: ReportSectionId) => void;
  remember: (r: SavedReport) => void;
}

const TEMPLATE_KEYS = Object.keys(TEMPLATES) as ReportTemplate[];
const cleanSections = (v: unknown): ReportSectionId[] =>
  Array.isArray(v) ? ALL_SECTIONS.filter((s) => v.includes(s)) : TEMPLATES.market.sections;

/** Paramètres du générateur de rapports (mémorisés dans le navigateur, valeurs contrôlées) */
export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      template: 'market',
      title: 'Rapport de marché',
      recipient: '',
      sections: TEMPLATES.market.sections,
      history: [],
      set: (patch) =>
        set((s) => ({
          title: patch.title !== undefined ? patch.title.slice(0, 120) : s.title,
          recipient: patch.recipient !== undefined ? patch.recipient.slice(0, 120) : s.recipient,
        })),
      applyTemplate: (t) =>
        set(() => (TEMPLATE_KEYS.includes(t) ? { template: t, sections: TEMPLATES[t].sections, title: TEMPLATES[t].label } : {})),
      // Ordre toujours celui de ALL_SECTIONS
      toggleSection: (id) =>
        set((s) => ({ sections: ALL_SECTIONS.filter((x) => (x === id ? !s.sections.includes(id) : s.sections.includes(x))) })),
      remember: (r) => set((s) => ({ history: [r, ...s.history].slice(0, 8) })),
    }),
    {
      name: 'emaquis-reports',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ template: s.template, title: s.title, recipient: s.recipient, sections: s.sections, history: s.history }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReportState>;
        return {
          ...current,
          template: p.template && TEMPLATE_KEYS.includes(p.template) ? p.template : current.template,
          title: typeof p.title === 'string' ? p.title.slice(0, 120) : current.title,
          recipient: typeof p.recipient === 'string' ? p.recipient.slice(0, 120) : current.recipient,
          sections: cleanSections(p.sections),
          history: Array.isArray(p.history) ? p.history.slice(0, 8) : [],
        };
      },
    },
  ),
);
