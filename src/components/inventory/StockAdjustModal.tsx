import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Package } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useAuthStore } from "../../store/useAuthStore";
import type { Product } from "../../types";
import { dbService } from "../../services/database";

interface Props {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStock: number) => void;
}

const REASONS = [
  "Stock count correction",
  "Supplier delivery",
  "Damaged goods",
  "Returned to supplier",
  "Internal use",
  "Other",
];

export const StockAdjustModal: React.FC<Props> = ({ product, isOpen, onClose, onSuccess }) => {
  const { storeId, currentStaff } = useAuthStore();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const qty = parseFloat(quantity) || 0;
  const adjustment = mode === "add" ? qty : -qty;
  const newStock = Math.max(0, (product.stock || 0) + adjustment);

  const handleClose = () => {
    setQuantity("");
    setReason(REASONS[0]);
    setCustomReason("");
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!qty || qty <= 0) return setError("Enter a valid quantity greater than 0.");
    const finalReason = reason === "Other" ? customReason.trim() || "Other" : reason;

    setSaving(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke("api:inventory:adjustStock", {
        productId: product.id,
        adjustment,
        reason: finalReason,
        staffId: currentStaff?.id || null,
        store_id: storeId,
      });

      if (!result?.success) throw new Error(result?.error || "Adjustment failed");
      const syncLogId = result.logId || crypto.randomUUID();
      await dbService.enqueueSync("INVENTORY_ADJUST", syncLogId, {
        id: syncLogId,
        store_id: storeId,
        product_id: product.id,
        action_type: adjustment >= 0 ? "STOCK_IN" : "STOCK_OUT",
        quantity: Math.abs(adjustment),
        previous_stock: result.previousStock ?? product.stock,
        current_stock: result.newStock,
        reason: finalReason,
        staff_id: currentStaff?.id || null,
      });
      onSuccess(result.newStock);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Adjustment failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Package size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adjust Stock</h2>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">{product.name}</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Current stock display */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-xs text-slate-500 font-medium">Current Stock</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{product.stock ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-xs text-slate-500 font-medium">Adjustment</p>
                <p className={`text-xl font-black mt-0.5 ${qty ? (mode === "add" ? "text-emerald-600" : "text-rose-500") : "text-slate-400"}`}>
                  {qty ? (mode === "add" ? `+${qty}` : `-${qty}`) : "—"}
                </p>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl">
                <p className="text-xs text-primary font-medium">New Stock</p>
                <p className="text-xl font-black text-primary mt-0.5">{qty ? newStock : "—"}</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("add")}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                  mode === "add"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50"
                }`}
              >
                <TrendingUp size={16} /> Add Stock
              </button>
              <button
                onClick={() => setMode("remove")}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                  mode === "remove"
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50"
                }`}
              >
                <TrendingDown size={16} /> Remove Stock
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quantity</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {reason === "Other" && (
                <Input
                  className="mt-2"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe the reason..."
                />
              )}
            </div>

            {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className={`flex-1 ${mode === "remove" ? "bg-rose-600 hover:bg-rose-700 border-0" : ""}`}
                onClick={handleSave}
                disabled={saving || !qty}
              >
                {saving ? "Saving..." : mode === "add" ? "Add Stock" : "Remove Stock"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
