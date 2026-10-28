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
  /** Dernière vente (arrondie à la minute) */
  lastSoldAt: z.string().nullable().optional(),
});

export const PublicBoardSchema = z.object({
  scope: z.string(),
  updatedAt: z.string(),
  items: z.array(PublicBoardItemSchema).default([]),
  countries: z.array(z.object({ code: z.string(), name: z.string(), flag: z.string().default(''), iso: z.string().default('') })).default([]),
});

export type PublicBoard = z.infer<typeof PublicBoardSchema>;
export type PublicBoardItem = z.infer<typeof PublicBoardItemSchema>;

export function parsePublicBoard(data: unknown): PublicBoard | null {
  const r = PublicBoardSchema.safeParse(data);
  return r.success ? r.data : null;
}
