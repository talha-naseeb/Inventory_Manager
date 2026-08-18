import { useEffect, useRef, useState } from "react";
import { Globe, DollarSign, Clock, Store, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { useThemeStore } from "../../store/useThemeStore";
import { BUSINESS_PROFILE_TYPES, type BusinessType } from "../../config/businessProfiles";
import { useBusinessProfile } from "../../hooks/useBusinessProfile";
import { useBusinessProfileStore } from "../../store/useBusinessProfileStore";
import { cn } from "../../lib/utils";

export const SystemSettings: React.FC = () => {
  const { businessDetails, setBusinessDetails } = useThemeStore();
  const profile = useBusinessProfile();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [customStockUnitDraft, setCustomStockUnitDraft] = useState(profile.customStockUnit);
  const isMountedRef = useRef(true);
  const saveRequestRef = useRef(0);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCustomStockUnitDraft(profile.customStockUnit);
  }, [profile.customStockUnit]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const showStatusMessage = (message: typeof statusMessage) => {
    if (!isMountedRef.current) {
      return;
    }

    setStatusMessage(message);

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    statusTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setStatusMessage(null);
      }

      statusTimeoutRef.current = null;
    }, 3000);
  };

  const saveProfile = async (next: { businessType?: BusinessType; customStockUnit?: string }) => {
    const currentProfile = useBusinessProfileStore.getState();
    const saveRequestId = ++saveRequestRef.current;

    try {
      const result = await profile.save({
        businessType: next.businessType ?? currentProfile.businessType,
        customStockUnit: next.customStockUnit ?? currentProfile.customStockUnit,
      });

      if (saveRequestId !== saveRequestRef.current) {
        return;
      }

      if (!result.success) {
        showStatusMessage({ type: "error", text: result.error || "Failed to update business profile." });
        return;
      }

      showStatusMessage({ type: "success", text: "Business profile updated - inventory labels refreshed." });
    } catch (error) {
      if (saveRequestId !== saveRequestRef.current) {
        return;
      }

      showStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update business profile.",
      });
    }
  };

  const saveCustomStockUnit = () => {
    const nextUnit = customStockUnitDraft.trim();
    const currentProfile = useBusinessProfileStore.getState();

    if (nextUnit === currentProfile.customStockUnit) {
      return;
    }

    void saveProfile({ customStockUnit: nextUnit });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBusinessDetails({
      ...businessDetails,
      currency: e.target.value,
    });
  };

  const handleTaxToggle = (enabled: boolean) => {
    setBusinessDetails({
      ...businessDetails,
      taxEnabled: enabled,
    });
  };

  const currencies = [
    { code: "PKR", label: "Pakistani Rupee (Rs.)" },
    { code: "USD", label: "US Dollar ($)" },
    { code: "EUR", label: "Euro (€)" },
    { code: "GBP", label: "British Pound (£)" },
    { code: "AED", label: "UAE Dirham (AED)" },
  ];

  return (
    <div className='space-y-6'>
      <Card className='border-none shadow-sm dark:bg-dark-surface'>
        <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg'>
              <Globe size={20} />
            </div>
            <div>
              <CardTitle className='text-lg'>Regional & business settings</CardTitle>
              <p className='text-xs text-slate-500'>Manage currency, inventory labels, and measurement defaults</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6 space-y-6'>
          <section className='space-y-4'>
            <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <h4 className='text-sm font-bold text-slate-800 dark:text-slate-100'>Business type</h4>
                <p className='text-xs text-slate-500'>Choose the inventory language that best fits your shop.</p>
              </div>
              {statusMessage && (
                <p
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                  )}
                  role='status'
                  aria-live='polite'
                >
                  {statusMessage.text}
                </p>
              )}
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {BUSINESS_PROFILE_TYPES.map((businessType) => {
                const businessProfile = profile.profiles[businessType];
                const isActive = profile.businessType === businessType;

                return (
                  <button
                    key={businessType}
                    type='button'
                    disabled={profile.isSaving}
                    aria-pressed={isActive}
                    onClick={() => {
                      if (!isActive) {
                        void saveProfile({ businessType });
                      }
                    }}
                    className={cn(
                      "group relative rounded-2xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-dark-surface",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10 dark:bg-primary/10"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-dark-border dark:bg-slate-800/50 dark:hover:border-primary/40",
                    )}
                  >
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <span
                        className={cn(
                          "rounded-xl p-2 transition-colors",
                          isActive
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary dark:bg-slate-700 dark:text-slate-300",
                        )}
                      >
                        <Store size={16} aria-hidden='true' />
                      </span>
                      {isActive && (
                        <span className='rounded-full bg-primary p-1 text-white'>
                          <Check size={14} aria-hidden='true' />
                        </span>
                      )}
                    </div>
                    <p className='text-sm font-bold text-slate-900 dark:text-slate-100'>{businessProfile.label}</p>
                    <p className='mt-1 text-xs text-slate-500'>
                      {businessProfile.productNoun.plural} tracked in {businessProfile.stockUnit.plural}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className='grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-dark-border dark:bg-slate-800/40 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]'>
              <div className='space-y-2'>
                <label htmlFor='custom-stock-unit' className='text-sm font-bold text-slate-700 dark:text-slate-300'>
                  Custom stock unit override
                </label>
                <input
                  id='custom-stock-unit'
                  type='text'
                  value={customStockUnitDraft}
                  placeholder={profile.stockUnit.singular}
                  disabled={profile.isSaving}
                  onBlur={saveCustomStockUnit}
                  onChange={(e) => setCustomStockUnitDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className='w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60'
                />
                <p className='text-[10px] text-slate-400 px-1'>Leave blank to use the default unit for the selected business type.</p>
              </div>

              <div className='rounded-xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/30'>
                <p className='text-xs font-bold uppercase tracking-wide text-slate-400'>Inventory preview</p>
                <p className='mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100'>Stock will show as: 24.5 {profile.stockUnitLabel}</p>
                <div className='mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400'>
                  <span className='font-semibold text-slate-700 dark:text-slate-200'>Receipt line:</span> 2{profile.stockUnitAbbr} x {businessDetails.currency || "PKR"} 450 = {businessDetails.currency || "PKR"} 900
                </div>
              </div>
            </div>
          </section>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Currency Selector */}
            <div className='space-y-2'>
              <label htmlFor='default-currency' className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <DollarSign size={16} className='text-slate-400' />
                Default Currency
              </label>
              <select
                id='default-currency'
                value={businessDetails.currency}
                onChange={handleCurrencyChange}
                className='w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer'
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className='text-[10px] text-slate-400 px-1'>Transaction values and reports will use this currency symbol.</p>
            </div>

            {/* Measurement Unit */}
            <div className='space-y-2'>
              <label htmlFor='measurement-unit' className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <Globe size={16} className='text-slate-400' />
                Measurement Unit
              </label>
              <select
                id='measurement-unit'
                value={businessDetails.measurementUnit}
                onChange={(e) => setBusinessDetails({ ...businessDetails, measurementUnit: e.target.value as any })}
                className='w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer'
              >
                <option value='meters'>Meters (m)</option>
                <option value='yards'>Yards (yd)</option>
              </select>
              <p className='text-[10px] text-slate-400 px-1'>Primary unit for fabric rolls and length-based sales.</p>
            </div>

            {/* Standard Suit Length */}
            <div className='space-y-2'>
              <label htmlFor='standard-suit-length' className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <Clock size={16} className='text-slate-400' />
                Default Suit Length ({businessDetails.measurementUnit})
              </label>
              <input
                id='standard-suit-length'
                type='number'
                step='0.1'
                value={businessDetails.standardSuitLength}
                onChange={(e) => setBusinessDetails({ ...businessDetails, standardSuitLength: parseFloat(e.target.value) || 0 })}
                className='w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all'
              />
              <p className='text-[10px] text-slate-400 px-1'>Standard cut length for "Suits" if not specified per product.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='border-none shadow-sm dark:bg-dark-surface'>
        <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg'>
              <Check size={20} />
            </div>
            <div>
              <CardTitle className='text-lg'>Tax Compliance</CardTitle>
              <p className='text-xs text-slate-500'>Configure GST/VAT and tax invoice settings</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6 space-y-6'>
          <div className='flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-dark-border'>
            <div>
              <p className='text-sm font-bold text-slate-800 dark:text-slate-100'>Enable Tax Calculation</p>
              <p className='text-xs text-slate-500'>Apply taxes to orders and show on receipts</p>
            </div>
            <button
              type='button'
              role='switch'
              aria-checked={Boolean(businessDetails.taxEnabled)}
              aria-label='Enable tax calculation'
              onClick={() => handleTaxToggle(!businessDetails.taxEnabled)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                businessDetails.taxEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  businessDetails.taxEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {businessDetails.taxEnabled && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2'>
              <div className='space-y-2'>
                <label htmlFor='tax-label' className='text-xs font-black text-slate-400 uppercase tracking-widest px-1'>Tax Label</label>
                <Input
                  id='tax-label'
                  value={businessDetails.taxLabel || "GST"}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, taxLabel: e.target.value })}
                  placeholder='e.g. GST, VAT'
                />
              </div>
              <div className='space-y-2'>
                <label htmlFor='tax-number' className='text-xs font-black text-slate-400 uppercase tracking-widest px-1'>Tax Number (GSTIN/VAT)</label>
                <Input
                  id='tax-number'
                  value={businessDetails.taxNumber || ""}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, taxNumber: e.target.value })}
                  placeholder='e.g. 24AAAAA0000A1Z5'
                />
              </div>
              <div className='space-y-2'>
                <label htmlFor='tax-rate-default' className='text-xs font-black text-slate-400 uppercase tracking-widest px-1'>Default Rate (%)</label>
                <Input
                  id='tax-rate-default'
                  type='number'
                  min='0'
                  max='100'
                  step='0.01'
                  value={businessDetails.taxRateDefault || 0}
                  onChange={(e) => setBusinessDetails({ ...businessDetails, taxRateDefault: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='border-none shadow-sm dark:bg-dark-surface'>
        <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg'>
              <Clock size={20} />
            </div>
            <div>
              <CardTitle className='text-lg'>System Behavior</CardTitle>
              <p className='text-xs text-slate-500'>Configure automated tasks and alerts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-dark-border'>
            <div>
              <p className='text-sm font-bold text-slate-800 dark:text-slate-100'>Auto-print Receipts</p>
              <p className='text-xs text-slate-500'>Automatically trigger print dialog after successful checkout</p>
            </div>
            <div className='relative inline-flex items-center cursor-not-allowed opacity-50' role='switch' aria-checked='false' aria-disabled='true' aria-label='Auto-print receipts'>
              <div className='w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full transition-colors' />
              <div className='absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
