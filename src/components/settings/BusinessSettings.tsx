import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Store, MapPin, Phone, Globe, Hash } from "lucide-react";

export const BusinessSettings: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "InventoriMan Main Store",
    branchId: "BR-001",
    address: "123 Business Avenue, Downtown, Central City",
    phone: "+1 (555) 000-0000",
    website: "www.inventoriman.com",
    currency: "USD",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                <Input name='name' value={formData.name} onChange={handleChange} className='pl-10' />
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400'>Branch ID</label>
              <div className='relative'>
                <Hash size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                <Input name='branchId' value={formData.branchId} onChange={handleChange} className='pl-10' />
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-bold uppercase text-slate-400'>Full Address</label>
            <div className='relative'>
              <MapPin size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
              <Input name='address' value={formData.address} onChange={handleChange} className='pl-10' />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400'>Phone Number</label>
              <div className='relative'>
                <Phone size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                <Input name='phone' value={formData.phone} onChange={handleChange} className='pl-10' />
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-bold uppercase text-slate-400'>Website</label>
              <div className='relative'>
                <Globe size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
                <Input name='website' value={formData.website} onChange={handleChange} className='pl-10' />
              </div>
            </div>
          </div>

          <div className='pt-4'>
            <Button className='w-full md:w-auto px-12'>Save Information</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <label className='text-xs font-bold uppercase text-slate-400'>Default Currency</label>
            <select className='w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all'>
              <option value='USD'>USD - US Dollar ($)</option>
              <option value='EUR'>EUR - Euro (€)</option>
              <option value='GBP'>GBP - British Pound (£)</option>
              <option value='INR'>INR - Indian Rupee (₹)</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
