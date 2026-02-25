import React, { useState } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { dbService } from "../../services/database";
import { cn } from "../../lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) {
        setError("File is empty or missing headers");
        return;
      }

      // Simple CSV parser that handles commas inside quotes
      const parseCSVLine = (line: string) => {
        const result = [];
        let startValueToken = 0;
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            insideQuotes = !insideQuotes;
          } else if (line[i] === "," && !insideQuotes) {
            result.push(line.substring(startValueToken, i).replace(/^"|"$/g, "").trim());
            startValueToken = i + 1;
          }
        }
        result.push(line.substring(startValueToken).replace(/^"|"$/g, "").trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

      const data = lines.slice(1, 6).map((line) => {
        const values = parseCSVLine(line);
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        return obj;
      });
      setPreview(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        const parseCSVLine = (line: string) => {
          const result = [];
          let startValueToken = 0;
          let insideQuotes = false;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') insideQuotes = !insideQuotes;
            else if (line[i] === "," && !insideQuotes) {
              result.push(line.substring(startValueToken, i).replace(/^"|"$/g, "").trim());
              startValueToken = i + 1;
            }
          }
          result.push(line.substring(startValueToken).replace(/^"|"$/g, "").trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
        const products = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = values[i];
          });
          return obj;
        });

        // Use transaction or separate calls
        for (const p of products) {
          if (!p.name) continue;

          // 1. Handle Brand
          let brandId = null;
          const brandName = p.brand || p.category; // fallback to category header if brand not found
          if (brandName) {
            const existingBrand = await dbService.getOne<{ id: string }>("SELECT id FROM brands WHERE name = ?", [brandName]);
            if (existingBrand) {
              brandId = existingBrand.id;
            } else {
              brandId = crypto.randomUUID();
              await dbService.execute("INSERT INTO brands (id, name) VALUES (?, ?)", [brandId, brandName]);
            }
          }

          // 2. Insert Product
          const productId = crypto.randomUUID();
          const retailPrice = parseFloat(p["retail price"] || p.price || "0");
          const wholesalePrice = parseFloat(p["wholesale price"] || "0");
          const costPrice = parseFloat(p["cost price"] || "0");
          const stock = parseFloat(p.stock || "0");
          const metersPerUnit = parseFloat(p["meters per unit"] || p.multiplier || "1.0");

          await dbService.execute(
            `INSERT INTO products (id, name, sku, brand_id, price, wholesale_price, cost_price, stock, unit, meters_per_unit, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              p.name,
              p.sku || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
              brandId,
              retailPrice,
              wholesalePrice,
              costPrice,
              stock,
              p.unit || "item",
              metersPerUnit,
              p.description || "",
            ],
          );

          // 3. Log initial stock
          if (stock > 0) {
            await dbService.execute(
              `INSERT INTO inventory_logs (id, product_id, action_type, quantity, previous_stock, current_stock, reason)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), productId, "adjustment", stock, 0, stock, "Bulk Import"],
            );
          }
        }

        onSave();
        onClose();
      } catch (err) {
        console.error("Import failed:", err);
        setError("Failed to import CSV. Please check the file format.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };
  const downloadTemplate = () => {
    const headers = "Name,SKU,Brand,Retail Price,Wholesale Price,Cost Price,Stock,Unit,Meters Per Unit,Description\n";
    const samples = [
      "Wash n Wear Navy,WNW-001,Generic,3500,2800,2200,100,meter,4.0,Premium Navy Blue Fabric",
      "Cotton Latha White,LAT-002,Gul Ahmed,4200,3400,2800,50,meter,4.5,Classic White Cotton Latha",
      "Grace Designer Suit,GDS-003,Grace,5500,4500,3800,30,item,1.0,Men Designer Suit Piece",
      "Boski 8 Pounds,BSK-004,Local,8500,7200,6500,20,item,1.0,Traditional Silk Boski",
      "Karandi Winter,KR-005,Khaadi,2800,2200,1800,80,meter,4.0,Warm Winter Karandi Fabric",
    ].join("\n");

    const blob = new Blob([headers + samples], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
      <div className='bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='p-6 border-b border-slate-100 dark:border-dark-border flex justify-between items-center'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 bg-primary/10 rounded-2xl text-primary'>
              <Upload size={22} />
            </div>
            <div>
              <h2 className='text-xl font-bold'>Bulk Import Products</h2>
              <p className='text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5'>Article CSV Uploader</p>
            </div>
          </div>
          <button onClick={onClose} className='w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all'>
            <X size={24} />
          </button>
        </div>

        <div className='p-8 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-hide'>
          {!file ? (
            <div className='group border-2 border-dashed border-slate-200 dark:border-dark-border rounded-[2.5rem] p-12 text-center space-y-4 hover:border-primary/50 transition-all cursor-pointer relative bg-slate-50/50 dark:bg-dark-bg/20'>
              <input type='file' accept='.csv' onChange={handleFileChange} className='absolute inset-0 opacity-0 cursor-pointer' />
              <div className='w-20 h-20 bg-white dark:bg-dark-surface rounded-3xl shadow-sm border border-slate-100 dark:border-dark-border flex items-center justify-center mx-auto text-slate-400 group-hover:scale-110 transition-transform'>
                <FileText size={36} />
              </div>
              <div className='space-y-1'>
                <p className='font-bold text-lg text-slate-900 dark:text-white'>Choose CSV File</p>
                <p className='text-sm text-slate-500'>Drag and drop or click to browse</p>
              </div>
              <div className='pt-2'>
                <p className='text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border py-1.5 px-4 rounded-full inline-block shadow-sm'>
                  Excel / CSV Only
                </p>
              </div>
            </div>
          ) : (
            <div className='space-y-6'>
              <div className='flex items-center justify-between p-5 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/20 animate-in slide-in-from-top-2'>
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 bg-white dark:bg-dark-surface rounded-2xl flex items-center justify-center text-primary shadow-sm'>
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className='font-bold text-slate-900 dark:text-white truncate max-w-[240px]'>{file.name}</p>
                    <p className='text-xs text-slate-500'>
                      {(file.size / 1024).toFixed(1)} KB • {preview.length} rows detected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                  }}
                  className='text-xs font-black uppercase text-rose-500 hover:underline'
                >
                  Change
                </button>
              </div>

              {preview.length > 0 && (
                <div className='space-y-3'>
                  <p className='text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2'>
                    <CheckCircle2 size={12} className='text-emerald-500' />
                    Data Preview
                  </p>
                  <div className='rounded-3xl border border-slate-100 dark:border-dark-border overflow-hidden bg-white dark:bg-dark-surface shadow-sm'>
                    <div className='grid grid-cols-12 bg-slate-50 dark:bg-slate-800/50 p-3 font-black uppercase text-[9px] tracking-wider text-slate-500 border-b border-slate-100 dark:border-dark-border'>
                      <div className='col-span-5'>Article Name</div>
                      <div className='col-span-4'>SKU / Code</div>
                      <div className='col-span-3 text-right'>Stock</div>
                    </div>
                    <div className='divide-y divide-slate-50 dark:divide-dark-border'>
                      {preview.map((row, i) => (
                        <div key={i} className='grid grid-cols-12 p-3 text-[10px] font-medium text-slate-600 dark:text-slate-400'>
                          <div className='col-span-5 truncate pr-2 font-bold text-slate-800 dark:text-slate-200'>{row.name || "N/A"}</div>
                          <div className='col-span-4 font-mono truncate'>{row.sku || row.code || "AUTO"}</div>
                          <div className='col-span-3 text-right font-black text-primary'>{row.stock || row.quantity || "0"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className='p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs font-bold border border-rose-100 dark:border-rose-500/20'>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className='bg-slate-50 dark:bg-dark-bg/50 p-5 rounded-[2rem] border border-slate-200 dark:border-dark-border border-dashed'>
            <div className='flex gap-3'>
              <div className='shrink-0 w-8 h-8 bg-white dark:bg-dark-surface rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-dark-border'>
                <AlertCircle size={14} />
              </div>
              <div className='flex-1'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-tight'>CSV Guide</p>
                  <button onClick={downloadTemplate} className='text-[9px] font-black uppercase text-primary hover:underline'>
                    Download Template
                  </button>
                </div>
                <p className='text-[10px] text-slate-500 leading-normal'>
                  Ensure headers match: <code className='text-primary font-bold'>Name, SKU, Brand, Retail Price, Wholesale Price, Stock, Unit</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='p-6 bg-slate-50 dark:bg-dark-bg/80 border-t border-slate-100 dark:border-dark-border flex gap-4'>
          <Button variant='outline' onClick={onClose} className='flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest'>
            Discard
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className={cn("flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20", importing && "opacity-50 cursor-not-allowed")}
          >
            {importing ? "Processing..." : "Confirm Import"}
          </Button>
        </div>
      </div>
    </div>
  );
};
