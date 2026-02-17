import React, { useState } from "react";
import { X, Tag } from "lucide-react";
import { Button } from "../ui/Button";
import { dbService } from "../../services/database";
import { cn } from "../../lib/utils";

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  brand?: { id: string; name: string; description?: string };
}

export const BrandModal: React.FC<BrandModalProps> = ({ isOpen, onClose, onSave, brand }) => {
  const [formData, setFormData] = useState({
    name: brand?.name || "",
    description: brand?.description || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "Brand name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const brandData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (brand) {
        // Update existing brand
        await dbService.execute("UPDATE brands SET name = ?, description = ? WHERE id = ?", [brandData.name, brandData.description, brand.id]);
      } else {
        // Create new brand
        const brandId = crypto.randomUUID();
        await dbService.execute("INSERT INTO brands (id, name, description) VALUES (?, ?, ?)", [brandId, brandData.name, brandData.description]);
      }

      onSave();
      onClose();
      setFormData({ name: "", description: "" });
    } catch (error: any) {
      console.error("Failed to save brand:", error);
      if (error.message?.includes("UNIQUE constraint failed")) {
        setErrors({ name: "Brand name already exists" });
      } else {
        setErrors({ submit: "Failed to save brand. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border p-6 flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <Tag size={24} className='text-primary' />
            {brand ? "Edit Brand" : "Add New Brand"}
          </h2>
          <button onClick={onClose} className='text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors'>
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {/* Brand Name */}
          <div>
            <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
              Brand Name <span className='text-rose-500'>*</span>
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                errors.name ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
              )}
              placeholder='e.g., Nike, Adidas, Zara'
              autoFocus
            />
            {errors.name && <p className='text-rose-500 text-xs mt-1'>{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white focus:border-primary transition-colors resize-none'
              placeholder='Optional brand description'
            />
          </div>

          {errors.submit && (
            <div className='bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3'>
              <p className='text-rose-600 dark:text-rose-400 text-sm'>{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <Button type='button' variant='outline' onClick={onClose} className='flex-1'>
              Cancel
            </Button>
            <Button type='submit' disabled={loading} className='flex-1'>
              {loading ? "Saving..." : brand ? "Update Brand" : "Add Brand"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
