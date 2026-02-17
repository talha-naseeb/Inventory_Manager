import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Shield, UserPlus, MoreHorizontal } from "lucide-react";

export const StaffSettings: React.FC = () => {
  const staff = [
    { id: 1, name: "Admin User", email: "admin@shop.com", role: "Owner", status: "Active" },
    { id: 2, name: "Jane Doe", email: "jane@shop.com", role: "Manager", status: "Active" },
    { id: 3, name: "John Smith", email: "john@shop.com", role: "Cashier", status: "Active" },
    { id: 4, name: "Mike Ross", email: "mike@shop.com", role: "Cashier", status: "Offline" },
  ];

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Staff Management</CardTitle>
        <Button size='sm' className='gap-2'>
          <UserPlus size={16} /> Add Staff
        </Button>
      </CardHeader>
      <CardContent>
        <div className='space-y-1'>
          {staff.map((member) => (
            <div key={member.id} className='flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group'>
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold'>{member.name.charAt(0)}</div>
                <div>
                  <h5 className='font-bold text-sm'>{member.name}</h5>
                  <p className='text-xs text-slate-500'>{member.email}</p>
                </div>
              </div>

              <div className='flex items-center gap-8'>
                <div className='hidden md:flex items-center gap-2'>
                  <Shield size={14} className='text-primary' />
                  <span className='text-xs font-semibold'>{member.role}</span>
                </div>

                <div className='flex items-center gap-2 min-w-[80px]'>
                  <span className={`w-2 h-2 rounded-full ${member.status === "Active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className='text-xs font-medium text-slate-500'>{member.status}</span>
                </div>

                <Button variant='ghost' size='icon' className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
