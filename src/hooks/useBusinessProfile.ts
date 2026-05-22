import { BUSINESS_PROFILES, getBusinessProfile, resolveStockUnitAbbr, resolveStockUnitLabel } from "../config/businessProfiles";
import { useBusinessProfileStore } from "../store/useBusinessProfileStore";

export function useBusinessProfile() {
  const { businessType, customStockUnit, isLoaded, isSaving, error, hydrate, save } = useBusinessProfileStore();
  const profile = getBusinessProfile(businessType);
  const stockUnitLabel = resolveStockUnitLabel(profile, customStockUnit);
  const stockUnitAbbr = resolveStockUnitAbbr(profile, customStockUnit);

  return {
    ...profile,
    businessType,
    customStockUnit,
    stockUnitLabel,
    stockUnitAbbr,
    isLoaded,
    isSaving,
    error,
    hydrate,
    save,
    profiles: BUSINESS_PROFILES,
  };
}
