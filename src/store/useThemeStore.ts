import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BusinessDetails {
  name: string;
  branchId: string;
  address: string;
  phone: string;
  website: string;
  currency: string;
  measurementUnit: "meters" | "yards";
  standardSuitLength: number;
  ntn?: string; // Optional NTN/Tax ID
  taxEnabled?: boolean;
  taxLabel?: string;
  taxNumber?: string;
  taxRateDefault?: number;
  footerMessage?: string;
  logo?: string;
}

interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  accentColor: string;
  sidebarColor: string | null;
  businessDetails: BusinessDetails;
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setSidebarColor: (color: string | null) => void;
  setBusinessDetails: (details: BusinessDetails) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      primaryColor: "#2563eb", // Default Royal Blue
      accentColor: "#f59e0b", // Default Amber
      sidebarColor: null,
      businessDetails: {
        name: "InventoriMan Main Store",
        branchId: "BR-001",
        address: "123 Business Avenue, Downtown, Central City",
        phone: "+1 (555) 000-0000",
        website: "www.inventoriman.com",
        currency: "PKR",
        measurementUnit: "meters",
        standardSuitLength: 4,
        ntn: "1234567-8",
        taxEnabled: false,
        taxLabel: "GST",
        taxNumber: "",
        taxRateDefault: 0,
        footerMessage: "Thank you for shopping with us!",
        logo: undefined,
      },
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setAccentColor: (color) => set({ accentColor: color }),
      setSidebarColor: (color) => set({ sidebarColor: color }),
      setBusinessDetails: (details) => set({ businessDetails: details }),
      resetTheme: () =>
        set({
          isDarkMode: false,
          primaryColor: "#2563eb",
          accentColor: "#f59e0b",
          sidebarColor: null,
          businessDetails: {
            name: "InventoriMan Main Store",
            branchId: "BR-001",
            address: "123 Business Avenue, Downtown, Central City",
            phone: "+1 (555) 000-0000",
            website: "www.inventoriman.com",
            currency: "PKR",
            measurementUnit: "meters",
            standardSuitLength: 4,
            ntn: "1234567-8",
            taxEnabled: false,
            taxLabel: "GST",
            taxNumber: "",
            taxRateDefault: 0,
            footerMessage: "Thank you for shopping with us!",
            logo: undefined,
          },
        }),
    }),
    {
      name: "theme-storage",
    },
  ),
);
