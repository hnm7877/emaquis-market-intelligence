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
 * Bibliothèque d'images / assets de repli haute fidélité pour les boissons réelles du réseau ivoirien
 * Utilisé si un produit dans la base n'a pas encore son image uploadée sur S3.
 */
const DEFAULT_PRODUCT_AVATARS: Record<string, string> = {
  bock: 'https://images.unsplash.com/photo-1608270114068-1eb29497e2c9?w=120&auto=format&fit=crop&q=80',
  heineken: 'https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=120&auto=format&fit=crop&q=80',
  beaufort: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=120&auto=format&fit=crop&q=80',
  guinness: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=120&auto=format&fit=crop&q=80',
  castel: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=120&auto=format&fit=crop&q=80',
  ivoire: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=120&auto=format&fit=crop&q=80',
  desperados: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=120&auto=format&fit=crop&q=80',
  doppel: 'https://images.unsplash.com/photo-1608270114068-1eb29497e2c9?w=120&auto=format&fit=crop&q=80',
  chill: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=120&auto=format&fit=crop&q=80',
  coca: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=120&auto=format&fit=crop&q=80',
  redbull: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=120&auto=format&fit=crop&q=80',
  vin: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=120&auto=format&fit=crop&q=80',
  eau: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=120&auto=format&fit=crop&q=80',
};

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

  // 2. Si pas d'image en DB ou si valeur par défaut (ex: '01.jpg'), repli intelligent sur le visuel de la référence réelle
  const nameNorm = (productName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [key, fallbackUrl] of Object.entries(DEFAULT_PRODUCT_AVATARS)) {
    if (nameNorm.includes(key)) {
      return fallbackUrl;
    }
  }

  // 3. Repli par marque
  const brandNorm = (brandName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (brandNorm.includes('solibra')) return DEFAULT_PRODUCT_AVATARS.bock;
  if (brandNorm.includes('brassivoire')) return DEFAULT_PRODUCT_AVATARS.heineken;
  if (brandNorm.includes('diageo') || brandNorm.includes('guinness')) return DEFAULT_PRODUCT_AVATARS.guinness;
  if (brandNorm.includes('coca')) return DEFAULT_PRODUCT_AVATARS.coca;

  return null;
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
