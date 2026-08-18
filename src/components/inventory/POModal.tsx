import React, { useState, useEffect } from "react";
import { X, Truck, Search, Trash2, Package } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { dbService } from "../../services/database";

interface POModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  suppliers: any[];
  po?: any;
}

export const POModal: React.FC<POModalProps> = ({ isOpen, onClose, onSave, suppliers, po }) => {
  const [formData, setFormData] = useState({
    supplierId: "",
    referenceNumber: "",
    notes: ""
  });
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (po) {
      setFormData({
        supplierId: po.supplierId || "",
        referenceNumber: po.referenceNumber || "",
        notes: po.notes || ""
      });
      // Fetch items if editing
      dbService.getPurchaseOrderItems(po.id)
        .then(data => setItems(data.map(i => ({
          productId: i.product_id,
          name: i.name,
          sku: i.sku,
          costPrice: i.cost_price,
          quantity: i.quantity,
          totalCost: i.total_cost
        }))));
    }
  }, [po, isOpen]);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (val.length > 1) {
      const results = await dbService.searchProducts(val, "");
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addItem = (product: any) => {
    if (items.find(i => i.productId === product.id)) return;
    setItems([...items, {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      costPrice: product.cost_price || 0,
      quantity: 1,
      totalCost: product.cost_price || 0
    }]);
    setSearch("");
    setSearchResults([]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === "costPrice" || field === "quantity") {
      newItems[index].totalCost = newItems[index].costPrice * newItems[index].quantity;
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || items.length === 0) return;

    setIsSubmitting(true);
    try {
      await dbService.savePurchaseOrder({
        id: po?.id,
        supplierId: formData.supplierId,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
        items: items.map(i => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          costPrice: i.costPrice,
          quantity: i.quantity,
          totalCost: i.totalCost
        }))
      });

      onSave();
      onClose();
    } catch (err) {
      console.error("Failed to save PO:", err);
      alert("Failed to save PO.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-dark-border">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Truck size={22} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              {po ? "Edit Purchase Order" : "New Purchase Order"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Supplier *</label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-dark-border dark:bg-dark-bg focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Reference Number</label>
              <Input
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="h-12 rounded-2xl"
                placeholder="e.g. INV-1234"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Add Products</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12 rounded-2xl"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl z-10 max-h-60 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="w-10 h-10 bg-slate-100 dark:bg-dark-bg rounded-lg flex items-center justify-center">
                        <Package size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{product.name}</p>
                        <p className="text-[10px] text-slate-400">SKU: {product.sku || 'N/A'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-100 dark:border-dark-border rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-dark-bg/50">
                <tr className="text-left text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Product</th>
                  <th className="p-4 text-center">Cost Price</th>
                  <th className="p-4 text-center w-24">Qty</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No products added yet</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                        <p className="text-[10px] text-slate-500">SKU: {item.sku || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={item.costPrice}
                          onChange={(e) => updateItem(idx, "costPrice", parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-center mx-auto"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-center mx-auto"
                        />
                      </td>
                      <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-200">
                        PKR {item.totalCost.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-dark-bg/50 font-black">
                  <tr>
                    <td colSpan={3} className="p-4 text-right uppercase tracking-widest text-slate-400">Total Amount</td>
                    <td className="p-4 text-right text-lg text-primary">PKR {totalAmount.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-dark-border dark:bg-dark-bg focus:ring-2 focus:ring-primary outline-none transition-all resize-none h-24 text-sm"
              placeholder="Internal notes about this order..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-dark-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0} className="px-8">
            {isSubmitting ? "Saving..." : po ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </div>
    </div>
  );
};
