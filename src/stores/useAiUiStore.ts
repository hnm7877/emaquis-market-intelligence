import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AiMode = 'chat' | 'research';

interface AiUiState {
  mode: AiMode;
  set: (patch: Partial<Pick<AiUiState, 'mode'>>) => void;
}

/** Mode de l'agent IA (mémorisé dans le navigateur, valeur contrôlée) */
export const useAiUiStore = create<AiUiState>()(
  persist(
    (set) => ({
      mode: 'chat',
      set: (patch) => set((s) => ({ mode: patch.mode === 'research' || patch.mode === 'chat' ? patch.mode : s.mode })),
    }),
    {
      name: 'emaquis-ai-ui',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ mode: s.mode }),
      merge: (p, c) => ({ ...c, mode: (p as Partial<AiUiState>)?.mode === 'research' ? 'research' : 'chat' }),
    },
  ),
);
