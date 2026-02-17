import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  accentColor: string;
  sidebarColor: string | null;
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setSidebarColor: (color: string | null) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      primaryColor: "#2563eb", // Default Royal Blue
      accentColor: "#f59e0b", // Default Amber
      sidebarColor: null,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setAccentColor: (color) => set({ accentColor: color }),
      setSidebarColor: (color) => set({ sidebarColor: color }),
      resetTheme: () =>
        set({
          isDarkMode: false,
          primaryColor: "#2563eb",
          accentColor: "#f59e0b",
          sidebarColor: null,
        }),
    }),
    {
      name: "theme-storage",
    },
  ),
);
