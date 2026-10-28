/**
 * Utilitaire de gestion des images et logos des produits réels E-Maquis.
 */

import { getBrandLogo } from './brandLogos';

export interface ProductVisualInfo {
  imageUrl: string | null;
  brandLogoUrl: string | null;
  colorScheme: string;
  badgeBg: string;
}


/**
 * Résout de façon résiliente l'image d'un produit
 */
export function resolveProductImage(
  imageFromDb?: string | null,
  productName?: string,
  brandName?: string
): string | null {
  // 1. Si une image valide est présente en DB (URL Cloudinary, S3, ou http)
  if (imageFromDb && typeof imageFromDb === 'string') {
    const trimmed = imageFromDb.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    // Si c'est un chemin relatif commençant par /
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
  }

  // 2. Pas d'image au catalogue : logo réel de la marque s'il est connu, sinon rien
  // (aucune photo d'illustration qui pourrait montrer un autre produit)
  return getBrandLogo(brandName || productName || '');
}

/**
 * Génère un symbole boursier concis à partir du nom réel du produit en base
 */
export function formatProductTicker(name: string): string {
  if (!name) return 'PRD-01';
  const clean = name.trim().replace(/['"()]/g, '');
  const parts = clean.split(/\s+/);
  
  if (parts.length === 1) {
    return `${parts[0].substring(0, 4).toUpperCase()}`;
  }

  const prefix = parts[0].substring(0, 3).toUpperCase();
  // Chercher une mention de volume (ex: 65, 50, 33)
  const volumeMatch = clean.match(/(\d{2})/);
  const suffix = volumeMatch ? volumeMatch[1] : parts[1].substring(0, 2).toUpperCase();

  return `${prefix}-${suffix}`;
}
