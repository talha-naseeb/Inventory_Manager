import { Globe, DollarSign, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { useThemeStore } from "../../store/useThemeStore";

export const SystemSettings: React.FC = () => {
  const { businessDetails, setBusinessDetails } = useThemeStore();

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBusinessDetails({
      ...businessDetails,
      currency: e.target.value,
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
              <CardTitle className='text-lg'>Regional & Fabric Settings</CardTitle>
              <p className='text-xs text-slate-500'>Manage currency, measurements, and suit defaults</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6 space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Currency Selector */}
            <div className='space-y-2'>
              <label className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <DollarSign size={16} className='text-slate-400' />
                Default Currency
              </label>
              <select
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
              <label className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <Globe size={16} className='text-slate-400' />
                Measurement Unit
              </label>
              <select
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
              <label className='flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300'>
                <Clock size={16} className='text-slate-400' />
                Default Suit Length ({businessDetails.measurementUnit})
              </label>
              <input
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
            <div className='relative inline-flex items-center cursor-not-allowed opacity-50'>
              <div className='w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full transition-colors' />
              <div className='absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform' />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
