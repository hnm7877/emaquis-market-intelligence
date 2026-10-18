/**
 * Règle stricte B2B Market Intelligence E-Maquis :
 * Anonymisation systématique de tous les débits, maquis et établissements.
 * Les enseignes commerciales réelles ne doivent JAMAIS apparaître en clair.
 */
export function anonymizeEstablishmentName(name?: string, id?: string, index?: number): string {
  // Si déjà sous forme anonymisée
  if (name) {
    const trimmed = name.trim();
    if (/^Point de vente/i.test(trimmed)) return trimmed;
    if (/^Débit connecté/i.test(trimmed)) return trimmed;
    if (/^Établissement pseudonymisé/i.test(trimmed)) return trimmed;
  }

  // Si un identifiant pseudonymisé existe (ex: pos-8f3a1b ou ObjectId)
  if (id) {
    const cleanId = id.toString().replace(/^(est-|pos-)/i, '').slice(-4).toUpperCase();
    return `Point de vente #${cleanId}`;
  }

  if (index !== undefined && index !== null) {
    return `Point de vente #${index + 1}`;
  }

  // Fallback basé sur un code dérivé
  if (name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    const shortCode = Math.abs(hash).toString(16).slice(0, 4).toUpperCase();
    return `Point de vente #${shortCode}`;
  }

  return 'Point de vente connecté';
}
