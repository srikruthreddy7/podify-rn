import { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface ThemeSlice {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
  themeMode: 'dark',
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleTheme: () =>
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
    })),
});
