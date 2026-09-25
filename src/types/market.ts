export type DateRange = 'all' | '7d' | '30d' | '90d' | '12m' | 'custom' | string;
export type Country = string;
export type City = string;
export type Commune = string;
export type Category = string;
export type Brand = string;
export type PosType = string;

export interface FilterState {
  country?: Country;
  dateRange: DateRange;
  city: City;
  commune: Commune;
  category: Category;
  brand: Brand;
  posType: PosType;
}

export interface DynamicFiltersMetadata {
  countries?: {
    code: string;
    name: string;
    flag: string;
    currency?: string;
    phoneCode?: string;
  }[];
  dateRanges: { id: string; label: string }[];
  cities: string[];
  communes: string[];
  categories: string[];
  brands: string[];
  posTypes: string[];
}

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  comparisonPeriod: string;
  description: string;
  badge?: string;
}

export interface SalesTimelinePoint {
  date: string;
  label: string;
  volume: number;
  revenue: number;
  previousVolume: number;
}

export interface CategoryPerformance {
  id: string;
  name: string;
  volume: number;
  revenue?: number;
  sharePercent?: number;
  volumeShare?: number;
  growthPercent?: number;
  growth?: number;
  avgPrice?: number;
  color: string;
  image?: string | null;
  isFood?: boolean;
  session?: string | null;
  productsCount?: number;
  posPenetration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPerformance {
  id: string;
  name: string;
  brand: string;
  category: string;
  categoryId?: string;
  categoryImage?: string | null;
  categoryColor?: string;
  format?: string;
  size?: string;
  wineType?: string;
  image?: string | null;
  description?: string;
  volumeSales: number;
  volume?: number;
  revenue?: number;
  growthPercent: number;
  growth?: number;
  rotationRate: number;
  reorderFrequencyDays: number;
  stockoutRisk: 'Faible' | 'Modéré' | 'Élevé' | 'LOW' | 'MEDIUM' | 'HIGH';
  topZones?: string[];
  topCommunes?: string[];
}

export interface BrandPerformance {
  id: string;
  name: string;
  logoText?: string;
  marketShare: number;
  volume: number;
  growthPercent: number;
  penetrationRate: number;
  topCategory: string;
  strongestZone: string;
  confidenceScore: number;
}

export interface GeographicZonePerformance {
  id: string;
  commune: string;
  city: string;
  posCount: number;
  volume: number;
  sharePercent?: number;
  growthPercent: number;
  demandIndex: number;
  topProduct?: string;
  topCategory?: string;
  latitude?: number;
  longitude?: number;
}

export interface MarketAlert {
  id: string;
  type: string;
  title: string;
  zone: string;
  categoryOrProduct: string;
  variation: string;
  period: string;
  samplePosCount: number;
  confidence: string;
  date?: string;
  description?: string;
}

export interface PromotionImpact {
  id: string;
  title: string;
  brand: string;
  product?: string;
  zone?: string;
  startDate?: string;
  endDate?: string;
  period?: string;
  beforeSalesDaily: number;
  duringSalesDaily: number;
  afterSalesDaily: number;
  upliftPercent: number;
  durationDays?: number;
  retentionEffect?: string;
}

export interface HourlyTrend {
  hour: string;
  weekdayVolume: number;
  weekendVolume: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  toolUsed?: string;
  sampleMetadata?: {
    coverage: string;
    transactions: number;
    posCount: number;
    period: string;
  };
}