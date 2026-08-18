import React, { useState } from "react";
import { Database, Trash2, AlertTriangle, Layers, ShoppingBag, Users, Download, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { dbService } from "../../services/database";
import { cn } from "../../lib/utils";

type ActionType = "inventory" | "sales" | "customers" | "full" | "backup" | "restore";

export const DatabaseSettings: React.FC = () => {
  const [confirmingAction, setConfirmingAction] = useState<ActionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const handleAction = async (type: ActionType) => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      let result;
      switch (type) {
        case "inventory":
          result = await dbService.clearInventory();
          break;
        case "sales":
          result = await dbService.clearSales();
          break;
        case "customers":
          result = await dbService.clearCustomers();
          break;
        case "full":
          result = await dbService.factoryReset();
          break;
        case "backup":
          result = await dbService.backup();
          if (result?.success && result.path) {
            setStatusMsg({ type: "success", text: `Backup saved to: ${result.path}` });
            setConfirmingAction(null);
            setIsProcessing(false);
            return;
          }
          break;
        case "restore":
          result = await dbService.restore();
          // If successful, the app will restart, so we don't need to handle it here
          break;
      }

      if (result?.success) {
        setStatusMsg({ type: "success", text: "Action completed successfully!" });
        setConfirmingAction(null);
      } else if (result?.error) {
        setStatusMsg({ type: "error", text: result.error });
      }
    } catch (error) {
      console.error("Maintenance action failed:", error);
      setStatusMsg({ type: "error", text: "System error occurred." });
    } finally {
      setIsProcessing(false);
    }
  };

  const actions = [
    {
      id: "inventory" as ActionType,
      title: "Clear Inventory",
      desc: "Deletes products, brands, stock logs, and rolls only. Sales, customers, settings, and sync state are kept.",
      icon: <Layers size={20} className='text-amber-600' />,
      btnText: "Delete Products",
      variant: "outline" as const,
    },
    {
      id: "sales" as ActionType,
      title: "Clear Sales History",
      desc: "Deletes past orders, order items, and returns only. Inventory stock is not reset.",
      icon: <ShoppingBag size={20} className='text-rose-600' />,
      btnText: "Delete Sales",
      variant: "outline" as const,
    },
    {
      id: "customers" as ActionType,
      title: "Clear Customers",
      desc: "Deletes all customer profiles. Orders will be unlinked from customers.",
      icon: <Users size={20} className='text-indigo-600' />,
      btnText: "Delete Customers",
      variant: "outline" as const,
    },
    {
      id: "full" as ActionType,
      title: "Full System Reset",
      desc: "Factory reset. Wipes ALL data, logs, and settings. Recovery is impossible.",
      icon: <AlertTriangle size={20} className='text-rose-600' />,
      btnText: "Reset Everything",
      variant: "danger" as const,
      isDangerous: true,
    },
  ];

  return (
    <div className='space-y-6'>
      <Card className='border-none shadow-sm dark:bg-dark-surface'>
        <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg'>
              <Download size={20} />
            </div>
            <div>
              <CardTitle className='text-lg'>Backup & Restore</CardTitle>
              <p className='text-xs text-slate-500'>Protect your data with local backups</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 rounded-2xl bg-slate-50/50 border border-slate-100 dark:border-dark-border flex flex-col justify-between'>
              <div className='mb-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Download size={20} className='text-blue-600' />
                  <h4 className='font-bold text-slate-800 dark:text-slate-100'>Create Backup</h4>
                </div>
                <p className='text-xs text-slate-500 leading-relaxed'>Creates a complete copy of your local database. Save this to a USB drive or cloud storage.</p>
              </div>
              <Button variant='outline' size='sm' className='w-full' onClick={() => handleAction("backup")} disabled={isProcessing}>
                <Download size={14} className='mr-2' />
                {isProcessing && confirmingAction === "backup" ? "Backing up..." : "Download Backup"}
              </Button>
            </div>

            <div className='p-4 rounded-2xl bg-slate-50/50 border border-slate-100 dark:border-dark-border flex flex-col justify-between'>
              <div className='mb-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Upload size={20} className='text-indigo-600' />
                  <h4 className='font-bold text-slate-800 dark:text-slate-100'>Restore Database</h4>
                </div>
                <p className='text-xs text-slate-500 leading-relaxed'>Restore from a previously created backup. <b>Warning:</b> This will overwrite current data and restart the app.</p>
              </div>
              <Button variant='outline' size='sm' className='w-full' onClick={() => handleAction("restore")} disabled={isProcessing}>
                <Upload size={14} className='mr-2' />
                Restore Backup
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='border-none shadow-sm dark:bg-dark-surface'>
        <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg'>
              <Database size={20} />
            </div>
            <div>
              <CardTitle className='text-lg'>Maintenance & Data Reset</CardTitle>
              <p className='text-xs text-slate-500'>The "Danger Zone" for managing your permanent records</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6 space-y-4'>
          {statusMsg && (
            <div className={cn("p-4 rounded-xl text-sm font-bold flex items-center gap-2 mb-4", statusMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
              {statusMsg.type === "success" ? "✅" : "⚠️"} {statusMsg.text}
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col justify-between",
                  action.isDangerous ? "bg-rose-50/30 border-rose-100" : "bg-slate-50/50 border-slate-100 dark:border-dark-border",
                )}
              >
                <div className='mb-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    {action.icon}
                    <h4 className='font-bold text-slate-800 dark:text-slate-100'>{action.title}</h4>
                  </div>
                  <p className='text-xs text-slate-500 leading-relaxed'>{action.desc}</p>
                </div>

                {confirmingAction === action.id ? (
                  <div className='space-y-2'>
                    <p className='text-[10px] font-black uppercase text-rose-600 text-center animate-pulse'>Are you absolutely sure?</p>
                    <div className='flex gap-2'>
                      <Button variant='danger' size='sm' className='flex-1' onClick={() => handleAction(action.id)} disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "Yes, Delete"}
                      </Button>
                      <Button variant='outline' size='sm' className='flex-1' onClick={() => setConfirmingAction(null)} disabled={isProcessing}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant={action.variant as any} size='sm' className='w-full' onClick={() => setConfirmingAction(action.id)}>
                    <Trash2 size={14} className='mr-2' />
                    {action.btnText}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className='p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20'>
        <div className='flex items-start gap-4'>
          <div className='p-2 bg-white dark:bg-dark-bg rounded-xl shadow-sm'>
            <AlertTriangle className='text-amber-500' size={20} />
          </div>
          <div className='flex-1'>
            <h5 className='text-sm font-bold text-amber-800 dark:text-amber-400'>Pro-Tip: Backup First</h5>
            <p className='text-[11px] text-amber-700 dark:text-amber-500/80 leading-relaxed mt-1'>
              Before performing bulk deletions, we recommend copying your <b>User Data</b> folder (found in License Settings) to an external drive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
