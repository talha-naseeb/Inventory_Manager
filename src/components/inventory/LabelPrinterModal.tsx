import React, { useState } from "react";
import { X, Printer, Settings, Layers, QrCode, Barcode as BarcodeIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { BarcodeLabel } from "../ui/BarcodeLabel";
import { cn } from "../../lib/utils";
import type { Product } from "../../types";

interface LabelPrinterModalProps {
  products: Product[];
  onClose: () => void;
}

export const LabelPrinterModal: React.FC<LabelPrinterModalProps> = ({ products, onClose }) => {
  const [labelType, setLabelType] = useState<"barcode" | "qr">("barcode");
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(products.map(p => [p.id, 1]))
  );
  const [layout, setLayout] = useState<"continuous" | "grid">("continuous");
  const [showPrice, setShowPrice] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const totalLabels = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-none">
      <div className={cn(
        "bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-dark-border",
        "print:shadow-none print:border-none print:rounded-none print:max-h-none print:max-w-none print:fixed print:inset-0 print:z-[100]"
      )}>
        {/* Header - Hidden in Print */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-dark-border print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Print Labels</h2>
              <p className="text-xs text-slate-500 font-medium">{products.length} Products Selected • {totalLabels} Total Labels</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Controls - Hidden in Print */}
          <div className="w-80 border-r border-slate-100 dark:border-dark-border p-6 overflow-y-auto print:hidden space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Label Settings</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLabelType("barcode")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                    labelType === "barcode" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-dark-border text-slate-400"
                  )}
                >
                  <BarcodeIcon size={20} />
                  <span className="text-[10px] font-bold uppercase">Barcode</span>
                </button>
                <button
                  onClick={() => setLabelType("qr")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                    labelType === "qr" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-dark-border text-slate-400"
                  )}
                >
                  <QrCode size={20} />
                  <span className="text-[10px] font-bold uppercase">QR Code</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Layout</label>
              <div className="space-y-2">
                <button
                  onClick={() => setLayout("continuous")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    layout === "continuous" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-dark-border text-slate-400"
                  )}
                >
                  <div className="p-1.5 bg-white dark:bg-dark-bg rounded-lg shadow-sm">
                    <Settings size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase">80mm Thermal</p>
                    <p className="text-[9px] opacity-70">Continuous roll</p>
                  </div>
                </button>
                <button
                  onClick={() => setLayout("grid")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    layout === "grid" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-dark-border text-slate-400"
                  )}
                >
                  <div className="p-1.5 bg-white dark:bg-dark-bg rounded-lg shadow-sm">
                    <Layers size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase">A4 / Letter Grid</p>
                    <p className="text-[9px] opacity-70">Labels per sheet</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Label Content</label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-200 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 transition-colors">Show Price</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-dark-border">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quantities</label>
              <div className="space-y-3">
                {products.map(product => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{product.name}</p>
                      <p className="text-[10px] text-slate-400">{product.sku || 'No SKU'}</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={quantities[product.id]}
                      onChange={(e) => setQuantities({ ...quantities, [product.id]: parseInt(e.target.value) || 0 })}
                      className="w-16 h-8 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview / Print Area */}
          <div className="flex-1 bg-slate-50 dark:bg-dark-bg/50 p-8 overflow-y-auto print:bg-white print:p-0">
            <div className={cn(
              "mx-auto transition-all",
              layout === "continuous" ? "w-[80mm] print:w-full" : "w-full print:w-full",
              layout === "grid" ? "grid grid-cols-3 gap-2" : "space-y-2"
            )}>
              {products.flatMap(product => 
                Array.from({ length: quantities[product.id] }).map((_, i) => (
                  <div key={`${product.id}-${i}`} className="print:break-inside-avoid">
                    <BarcodeLabel
                      value={product.sku || product.id}
                      type={labelType}
                      label={product.name}
                      subLabel={showPrice ? `Price: $${product.price.toFixed(2)}` : undefined}
                      height={layout === "continuous" ? 60 : 40}
                      fontSize={10}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer - Hidden in Print */}
        <div className="p-6 border-t border-slate-100 dark:border-dark-border flex justify-end gap-3 print:hidden">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={18} />
            Print Now
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${layout === "continuous" ? "80mm auto" : "A4"};
            margin: 0;
          }
          body {
            background: white !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
};
