import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Store, MapPin, Phone, Globe, Hash, Receipt, Info } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";

export const BusinessSettings: React.FC = () => {
  const { businessDetails, setBusinessDetails } = useThemeStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBusinessDetails({ ...businessDetails, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.files.selectProductImage();
      if (filePath) setBusinessDetails({ ...businessDetails, logo: filePath });
    }
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Logo Upload Section */}
          <div className='flex flex-col items-center gap-4 py-4 border-b border-slate-100 dark:border-dark-border'>
            <label className='text-[10px] font-black uppercase text-slate-400 tracking-widest'>Business Logo</label>
            <div
              onClick={handleLogoUpload}
              className={cn(
                "relative group w-32 h-32 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                businessDetails.logo ? "border-primary/20 bg-white" : "border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 hover:border-primary/50",
              )}
            >
              {businessDetails.logo ? (
                <>
                  <img src={businessDetails.logo} alt='Business Logo' className='w-full h-full object-contain p-4' />
                  <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                    <p className='text-white text-[10px] font-black uppercase'>Change</p>
                  </div>
                </>
              ) : (
                <div className='flex flex-col items-center text-slate-400 gap-2'>
                  <Store size={24} />
                  <span className='text-[8px] font-black uppercase'>Upload</span>
                </div>
              )}
            </div>
          </div>

          <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase text-slate-400'>Shop Name</label>
                <div className='relative'>
                  <Store size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                  <Input name='name' value={businessDetails.name} onChange={handleChange} className='pl-10' />
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase text-slate-400'>Branch ID</label>
                <div className='relative'>
                  <Hash size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                  <Input name='branchId' value={businessDetails.branchId} onChange={handleChange} className='pl-10' />
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400'>Full Address</label>
              <div className='relative'>
                <MapPin size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                <Input name='address' value={businessDetails.address} onChange={handleChange} className='pl-10' />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase text-slate-400'>Phone Number</label>
                <div className='relative'>
                  <Phone size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                  <Input name='phone' value={businessDetails.phone} onChange={handleChange} className='pl-10' />
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase text-slate-400'>NTN / Tax ID</label>
                <div className='relative'>
                  <Info size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                  <Input name='ntn' value={businessDetails.ntn || ""} onChange={handleChange} className='pl-10' placeholder='e.g. 1234567-8' />
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400'>Website</label>
              <div className='relative'>
                <Globe size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                <Input name='website' value={businessDetails.website} onChange={handleChange} className='pl-10' />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400 text-primary flex items-center gap-2'>
                <Receipt size={14} />
                Receipt Footer Message
              </label>
              <textarea
                name='footerMessage'
                value={businessDetails.footerMessage || ""}
                onChange={handleChange}
                rows={3}
                className='w-full p-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none'
                placeholder='e.g. Thank you for shopping with us!'
              />
            </div>

            <div className='pt-2'>
              <Button className='w-full md:w-auto px-12' onClick={() => alert("Settings saved successfully!")}>
                Save Information
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
