import { z } from 'zod';

/** Classement public (page d'accueil) : rangs, variations et indices uniquement */
export const PublicBoardItemSchema = z.object({
  rank: z.number(),
  previousRank: z.number().nullable(),
  name: z.string(),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  changePercent: z.number().nullable(),
  spark: z.array(z.number()).default([]),
});

export const PublicBoardSchema = z.object({
  scope: z.string(),
  window: z.enum(['24h', '7d', '14d']),
  /** Période demandée (window peut avoir été élargie faute de ventes) */
  requestedWindow: z.enum(['24h', '7d', '14d']).optional(),
  updatedAt: z.string(),
  items: z.array(PublicBoardItemSchema).default([]),
  countries: z.array(z.object({ code: z.string(), name: z.string(), flag: z.string().default('') })).default([]),
});

export type PublicBoard = z.infer<typeof PublicBoardSchema>;
export type PublicBoardItem = z.infer<typeof PublicBoardItemSchema>;
export type BoardWindow = PublicBoard['window'];

export function parsePublicBoard(data: unknown): PublicBoard | null {
  const r = PublicBoardSchema.safeParse(data);
  return r.success ? r.data : null;
}
