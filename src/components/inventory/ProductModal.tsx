import React, { useState, useEffect } from "react";
import { X, Package, DollarSign, Barcode, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "../ui/Button";
import { dbService } from "../../services/database";
import { cn } from "../../lib/utils";
import type { Product } from "../../types";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: Product | null;
  selectedBrandId?: string | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, selectedBrandId }) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    price: "",
    wholesalePrice: "",
    costPrice: "",
    stock: "",
    image: "",
    unit: "item",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Edit mode - populate form
        setFormData({
          name: product.name || "",
          sku: product.sku || "",
          description: product.description || "",
          category_id: product.brandId || "",
          price: product.price?.toString() || "",
          wholesalePrice: product.wholesalePrice?.toString() || "",
          costPrice: product.costPrice?.toString() || "",
          stock: product.stock?.toString() || "",
          image: product.image || "",
          unit: product.unit || "item",
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: "",
          sku: "",
          description: "",
          category_id: "",
          price: "",
          wholesalePrice: "",
          costPrice: "",
          stock: "",
          image: "",
          unit: "item",
        });
      }
      setErrors({});
    }
  }, [isOpen, product]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.sku.trim()) {
      newErrors.sku = "SKU is required";
    }

    // Brand is optional now
    // if (!formData.category_id) {
    //   newErrors.category_id = "Brand is required";
    // }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    const wholesalePrice = parseFloat(formData.wholesalePrice);
    if (isNaN(wholesalePrice) || wholesalePrice <= 0) {
      newErrors.wholesalePrice = "Wholesale price must be greater than 0";
    }

    if (!isNaN(price) && !isNaN(wholesalePrice) && wholesalePrice > price) {
      newErrors.wholesalePrice = "Wholesale price cannot exceed retail price";
    }

    const stock = parseInt(formData.stock);
    if (isNaN(stock) || stock < 0) {
      newErrors.stock = "Stock must be 0 or greater";
    }

    if (formData.costPrice && (isNaN(parseFloat(formData.costPrice)) || parseFloat(formData.costPrice) < 0)) {
      newErrors.costPrice = "Cost price must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || null,
        brand_id: selectedBrandId || null, // Use selectedBrandId from prop
        price: parseFloat(formData.price),
        wholesale_price: parseFloat(formData.wholesalePrice),
        cost_price: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        stock: parseInt(formData.stock),
        image: formData.image.trim() || null,
        unit: formData.unit || "item",
      };

      console.log("Saving product with data:", productData);

      if (product) {
        // Update existing product
        await dbService.execute(`UPDATE products SET name = ?, sku = ?, description = ?, brand_id = ?, price = ?, wholesale_price = ?, cost_price = ?, stock = ?, image = ?, unit = ? WHERE id = ?`, [
          productData.name,
          productData.sku,
          productData.description,
          productData.brand_id,
          productData.price,
          productData.wholesale_price,
          productData.cost_price,
          productData.stock,
          productData.image,
          productData.unit,
          product.id,
        ]);

        await dbService.enqueueSync("UPDATE_PRODUCT", product.id, {
          ...productData,
          id: product.id,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new product
        const productId = crypto.randomUUID();
        await dbService.execute(`INSERT INTO products (id, name, sku, description, brand_id, price, wholesale_price, cost_price, stock, image, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          productId,
          productData.name,
          productData.sku,
          productData.description,
          productData.brand_id,
          productData.price,
          productData.wholesale_price,
          productData.cost_price,
          productData.stock,
          productData.image,
          productData.unit,
        ]);

        await dbService.enqueueSync("CREATE_PRODUCT", productId, {
          ...productData,
          id: productId,
          createdAt: new Date().toISOString(),
        });
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Failed to save product:", error);
      if (error.message?.includes("UNIQUE constraint failed")) {
        setErrors({ sku: "SKU already exists" });
      } else if (error.message?.includes("FOREIGN KEY constraint failed")) {
        setErrors({ category_id: "Invalid brand selected. Please refresh and try again." });
      } else {
        setErrors({ submit: "Failed to save product. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
      <div className='bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-slate-200 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
              <Package className='text-primary' size={20} />
            </div>
            <div>
              <h2 className='text-xl font-bold text-slate-900 dark:text-white'>{product ? "Edit Product" : "Add New Product"}</h2>
              <p className='text-sm text-slate-500 dark:text-slate-400'>Fill in the product details below</p>
            </div>
          </div>
          <button onClick={onClose} className='text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors'>
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Product Name */}
            <div className='md:col-span-2'>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                Product Name <span className='text-rose-500'>*</span>
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.name ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='e.g., Premium Cotton T-Shirt'
              />
              {errors.name && <p className='text-rose-500 text-xs mt-1'>{errors.name}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                <Barcode size={14} className='inline mr-1' />
                SKU <span className='text-rose-500'>*</span>
              </label>
              <input
                type='text'
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.sku ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='e.g., TSH-001'
              />
              {errors.sku && <p className='text-rose-500 text-xs mt-1'>{errors.sku}</p>}
            </div>

            {/* Unit of Measurement */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                <Package size={14} className='inline mr-1' />
                Unit of Measurement <span className='text-rose-500'>*</span>
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors focus:border-primary'
              >
                <option value='item'>Item / Piece</option>
                <option value='meter'>Meter</option>
                <option value='yard'>Yard</option>
                <option value='kg'>Kilogram (kg)</option>
                <option value='gram'>Gram (g)</option>
                <option value='liter'>Liter (L)</option>
              </select>
              <p className='text-xs text-slate-500 mt-1'>Price will be shown per {formData.unit}</p>
            </div>

            {/* Retail Price */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                <DollarSign size={14} className='inline mr-1' />
                Retail Price <span className='text-rose-500'>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.price ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='0.00'
              />
              {errors.price && <p className='text-rose-500 text-xs mt-1'>{errors.price}</p>}
            </div>

            {/* Wholesale Price */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                Wholesale Price <span className='text-rose-500'>*</span>
              </label>
              <input
                type='number'
                step='0.01'
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.wholesalePrice ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='0.00'
              />
              {errors.wholesalePrice && <p className='text-rose-500 text-xs mt-1'>{errors.wholesalePrice}</p>}
            </div>

            {/* Cost Price */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Cost Price</label>
              <input
                type='number'
                step='0.01'
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.costPrice ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='0.00'
              />
              {errors.costPrice && <p className='text-rose-500 text-xs mt-1'>{errors.costPrice}</p>}
            </div>

            {/* Stock */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                Stock Quantity <span className='text-rose-500'>*</span>
              </label>
              <input
                type='number'
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                  errors.stock ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                )}
                placeholder='0'
              />
              {errors.stock && <p className='text-rose-500 text-xs mt-1'>{errors.stock}</p>}
            </div>

            {/* Image Upload */}
            <div>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                <ImageIcon size={14} className='inline mr-1' />
                Product Image
              </label>

              <Button
                type='button'
                variant='outline'
                onClick={async () => {
                  if (window.electronAPI) {
                    const filePath = await window.electronAPI.invoke("dialog:openFile");
                    if (filePath) {
                      setFormData({ ...formData, image: filePath });
                    }
                  }
                }}
                className='w-full mb-3'
              >
                <Upload size={16} className='mr-2' />
                Upload Image
              </Button>

              {formData.image && (
                <div className='mt-3 relative'>
                  <img
                    src={formData.image}
                    alt='Product preview'
                    className='w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-dark-border'
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => setFormData({ ...formData, image: "" })}
                    className='absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full hover:bg-rose-600 transition-colors'
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className='md:col-span-2'>
              <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white focus:border-primary transition-colors resize-none'
                placeholder='Product description...'
              />
            </div>
          </div>

          {errors.submit && (
            <div className='mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl'>
              <p className='text-rose-600 dark:text-rose-400 text-sm'>{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50'>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' onClick={handleSubmit} disabled={loading} className='bg-primary text-white'>
            {loading ? "Saving..." : product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </div>
    </div>
  );
};
