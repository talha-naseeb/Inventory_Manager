import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Store, MapPin, Phone, Globe, Hash, Receipt, Info } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

export const BusinessSettings: React.FC = () => {
  const { businessDetails, setBusinessDetails } = useThemeStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBusinessDetails({ ...businessDetails, [e.target.name]: e.target.value });
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
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
        </CardContent>
      </Card>
    </div>
  );
};
