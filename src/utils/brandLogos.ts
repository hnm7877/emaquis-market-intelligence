export const BRAND_LOGOS: Record<string, string> = {
  solibra: '/brands/solibra.png',
  brassivoire: '/brands/brassivoire.png',
  'coca-cola': '/brands/coca-cola.png',
  brakina: '/brands/brakina.svg',
  bramali: '/brands/bramali.svg',
  pepsi: '/brands/pepsi.svg',
  diageo: '/brands/diageo.svg',
};

export function getBrandLogo(brandKeyOrName?: string): string | null {
  if (!brandKeyOrName) return null;
  const norm = brandKeyOrName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (norm.includes('solibra')) return BRAND_LOGOS.solibra;
  if (norm.includes('brassivoire')) return BRAND_LOGOS.brassivoire;
  if (norm.includes('coca') || norm.includes('fanta') || norm.includes('sprite')) return BRAND_LOGOS['coca-cola'];
  if (norm.includes('brakina')) return BRAND_LOGOS.brakina;
  if (norm.includes('bramali')) return BRAND_LOGOS.bramali;
  if (norm.includes('pepsi')) return BRAND_LOGOS.pepsi;
  if (norm.includes('guinness') || norm.includes('diageo')) return BRAND_LOGOS.diageo;

  return null;
}
