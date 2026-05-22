import { create } from "zustand";
import type { BusinessType } from "../config/businessProfiles";
import { isBusinessType } from "../config/businessProfiles";
import { dbService } from "../services/database";

type BusinessProfileSettings = {
  businessType: BusinessType;
  customStockUnit: string;
};

interface BusinessProfileState {
  businessType: BusinessType;
  customStockUnit: string;
  isLoaded: boolean;
  isSaving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  save: (settings: BusinessProfileSettings) => Promise<{ success: boolean; error?: string }>;
}

const normalizeCustomStockUnit = (value: unknown) => (typeof value === "string" ? value : "");

export const useBusinessProfileStore = create<BusinessProfileState>((set) => {
  let saveRequestVersion = 0;
  let persistenceChain: Promise<void> = Promise.resolve();
  let lastPersistedSettings: BusinessProfileSettings = {
    businessType: "general",
    customStockUnit: "",
  };

  const persistInOrder = <T,>(operation: () => Promise<T>) => {
    const queuedOperation = persistenceChain.then(operation, operation);
    persistenceChain = queuedOperation.then(
      () => undefined,
      () => undefined,
    );
    return queuedOperation;
  };

  return {
    businessType: "general",
    customStockUnit: "",
    isLoaded: false,
    isSaving: false,
    error: null,

    hydrate: async () => {
      try {
        const settings = await dbService.getBusinessProfileSettings();
        const nextSettings = {
          businessType: isBusinessType(settings.businessType) ? settings.businessType : "general",
          customStockUnit: normalizeCustomStockUnit(settings.customStockUnit),
        };

        lastPersistedSettings = nextSettings;

        set({
          ...nextSettings,
          isLoaded: true,
          error: null,
        });
      } catch (error) {
        console.error("Failed to hydrate business profile:", error);
        lastPersistedSettings = {
          businessType: "general",
          customStockUnit: "",
        };
        set({
          ...lastPersistedSettings,
          isLoaded: true,
          error: "Failed to load business profile settings.",
        });
      }
    },

    save: async (settings) => {
      const requestVersion = ++saveRequestVersion;
      const nextSettings = {
        businessType: settings.businessType,
        customStockUnit: normalizeCustomStockUnit(settings.customStockUnit),
      };

      set({
        businessType: nextSettings.businessType,
        customStockUnit: nextSettings.customStockUnit,
        isSaving: true,
        error: null,
      });

      try {
        const result = await persistInOrder(() => dbService.saveBusinessProfileSettings(nextSettings));

        if (!result.success) {
          if (requestVersion === saveRequestVersion) {
            set({
              ...lastPersistedSettings,
              isSaving: false,
              error: result.error || "Failed to save business profile settings.",
            });
          }

          return result;
        }

        lastPersistedSettings = nextSettings;

        if (requestVersion === saveRequestVersion) {
          set({ isSaving: false, error: null });
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save business profile settings.";

        if (requestVersion === saveRequestVersion) {
          set({ ...lastPersistedSettings, isSaving: false, error: message });
        }

        return { success: false, error: message };
      }
    },
  };
});
