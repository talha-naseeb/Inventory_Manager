import React, { useId, useState, useEffect } from "react";
import { X, Package, DollarSign, Barcode, Image as ImageIcon, Upload, Plus, Trash2, RefreshCcw, QrCode } from "lucide-react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { dbService } from "../../services/database";
import { cn } from "../../lib/utils";
import type { Product } from "../../types";
import { useBusinessProfile } from "../../hooks/useBusinessProfile";
import { useThemeStore } from "../../store/useThemeStore";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: Product | null;
  selectedBrandId?: string | null;
}

interface FormData {
  name: string;
  description: string;
  sku: string;
  brand_id: string;
  price: string;
  wholesale_price: string;
  cost_price: string;
  stock: string;
  image: string;
  unit: string;
  meters_per_unit: string;
  hsn_code: string;
  tax_rate: string;
}

const initialForm: FormData = {
  name: "",
  description: "",
  sku: "",
  brand_id: "",
  price: "",
  wholesale_price: "",
  cost_price: "",
  stock: "0",
  image: "",
  unit: "item",
  meters_per_unit: "1.0",
  hsn_code: "",
  tax_rate: "0",
};

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, selectedBrandId }) => {
  const profile = useBusinessProfile();
  const { businessDetails } = useThemeStore();
  const fieldId = useId();
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [rolls, setRolls] = useState<{ id: string; roll_number: string; current_length: string; initial_length: string; unit: string }[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const productLabel = profile.productNoun.singular;
  const productLabelTitle = productLabel.charAt(0).toUpperCase() + productLabel.slice(1);
  const defaultStockUnit = profile.stockUnit.singular;
  const nameInputId = `${fieldId}-product-name`;
  const skuInputId = `${fieldId}-product-sku`;
  const unitInputId = `${fieldId}-product-unit`;
  const priceInputId = `${fieldId}-product-price`;
  const stockInputId = `${fieldId}-product-stock`;
  const wholesalePriceInputId = `${fieldId}-product-wholesale-price`;
  const costPriceInputId = `${fieldId}-product-cost-price`;
  const metersPerUnitInputId = `${fieldId}-product-meters-per-unit`;
  const descriptionInputId = `${fieldId}-product-description`;
  const isRollUnit = (unit: string) => profile.hasRolls && (unit === "meter" || unit === "yard" || unit === defaultStockUnit);
  const canManageRolls = isRollUnit(formData.unit);
  const canConfigureLength = profile.hasRolls && (formData.unit === "suit" || canManageRolls);
  const unitOptions = [
    { value: defaultStockUnit, label: profile.stockUnitLabel },
    { value: "item", label: "Item / Piece" },
    ...(profile.hasRolls
      ? [
          { value: "meter", label: "Meter" },
          { value: "yard", label: "Yard" },
          { value: "suit", label: "Suit" },
        ]
      : []),
  ].filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || "",
          sku: product.sku || "",
          description: product.description || "",
          brand_id: product.brandId || "",
          price: product.price?.toString() || "",
          wholesale_price: product.wholesalePrice?.toString() || "",
          cost_price: product.costPrice?.toString() || "",
          stock: product.stock?.toString() || "0",
          image: product.image || "",
          unit: product.unit || defaultStockUnit,
          meters_per_unit: (product.meters_per_unit ?? product.metersPerUnit)?.toString() || "1.0",
          hsn_code: product.hsn_code || "",
          tax_rate: product.tax_rate?.toString() || businessDetails.taxRateDefault?.toString() || "0",
        });
      } else {
        setFormData({
          ...initialForm,
          brand_id: selectedBrandId || "",
          unit: defaultStockUnit,
          tax_rate: businessDetails.taxRateDefault?.toString() || "0",
        });
      }
      setErrors({});
      if (profile.hasRolls && product) {
        dbService
          .getProductRolls(product.id)
          .then((res) => {
            setRolls(
              res.map((r) => ({
                id: r.id,
                roll_number: r.roll_number || "",
                current_length: r.current_length.toString(),
                initial_length: r.initial_length.toString(),
                unit: r.unit,
              })),
            );
          });
      } else {
        setRolls([]);
      }
    }
  }, [isOpen, product, selectedBrandId, defaultStockUnit, profile.hasRolls, businessDetails.taxRateDefault]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.length < 2) newErrors.name = `${productLabelTitle} name must be at least 2 characters`;
    if (!formData.sku.trim()) newErrors.sku = "SKU is required";
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) newErrors.price = `${profile.priceLabel} must be greater than 0`;
    const wholesalePrice = parseFloat(formData.wholesale_price);
    if (isNaN(wholesalePrice) || wholesalePrice <= 0) newErrors.wholesale_price = "Wholesale price must be greater than 0";
    const stock = parseFloat(formData.stock);
    if (isNaN(stock) || stock < 0) newErrors.stock = `Stock (${profile.stockUnitLabel}) must be 0 or greater`;
    if (profile.hasRolls && formData.unit === "suit") {
      const metersPerUnit = parseFloat(formData.meters_per_unit);
      if (isNaN(metersPerUnit) || metersPerUnit <= 0) newErrors.meters_per_unit = "Meters per suit must be greater than 0";
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
        brand_id: formData.brand_id || null,
        price: parseFloat(formData.price),
        wholesale_price: parseFloat(formData.wholesale_price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        stock: parseFloat(formData.stock),
        image: formData.image.trim() || null,
        unit: formData.unit || defaultStockUnit,
        meters_per_unit: parseFloat(formData.meters_per_unit) || 1.0,
        hsn_code: formData.hsn_code.trim() || null,
        tax_rate: parseFloat(formData.tax_rate) || 0,
      };

      const productId = product?.id || crypto.randomUUID();
      const savedRolls = profile.hasRolls && isRollUnit(productData.unit)
        ? rolls.map((roll) => ({
            id: roll.id || crypto.randomUUID(),
            roll_number: roll.roll_number,
            initial_length: parseFloat(roll.initial_length),
            current_length: parseFloat(roll.current_length),
            unit: productData.unit,
          }))
        : [];
      await dbService.upsertProduct({ ...productData, id: productId }, savedRolls);
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Failed to save product:", error);
      setErrors({ submit: error.message || `Failed to save ${productLabel}.` });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.files.selectProductImage();
      if (filePath) setFormData({ ...formData, image: filePath });
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
      <div className='bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col'>
        <div className='flex items-center justify-between p-6 border-b border-slate-200 dark:border-dark-border'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center'>
              <Package className='text-primary' size={20} />
            </div>
            <div>
              <h2 className='text-xl font-bold text-slate-900 dark:text-white'>{product ? `Edit ${productLabelTitle}` : `Add New ${productLabelTitle}`}</h2>
              <p className='text-sm text-slate-500 dark:text-slate-400'>Fill in the {productLabel} details below</p>
            </div>
          </div>
          <button type='button' onClick={onClose} className='text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors' aria-label={`Close ${productLabel} modal`}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Left Column: Details */}
            <div className='space-y-6'>
              <div className='space-y-4'>
                <div>
                  <label htmlFor={nameInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                    {productLabelTitle} Name <span className='text-rose-500'>*</span>
                  </label>
                  <input
                    id={nameInputId}
                    type='text'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                      errors.name ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                    )}
                    placeholder={profile.placeholders.productName}
                  />
                  {errors.name && <p className='text-rose-500 text-xs mt-1'>{errors.name}</p>}
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label htmlFor={skuInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                      <Barcode size={14} className='inline mr-1' /> SKU <span className='text-rose-500'>*</span>
                    </label>
                    <input
                      id={skuInputId}
                      type='text'
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                        errors.sku ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                      )}
                      placeholder={profile.placeholders.sku}
                    />
                    {errors.sku && <p className='text-rose-500 text-xs mt-1'>{errors.sku}</p>}
                  </div>
                  <div>
                    <label htmlFor={unitInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Unit</label>
                    <select
                      id={unitInputId}
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors focus:border-primary'
                    >
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label htmlFor={priceInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                      <DollarSign size={14} className='inline mr-1' /> {profile.priceLabel} *
                    </label>
                    <input
                      id={priceInputId}
                      type='number'
                      step='0.01'
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                        errors.price ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                      )}
                      placeholder={profile.placeholders.price}
                    />
                    {errors.price && <p className='text-rose-500 text-xs mt-1'>{errors.price}</p>}
                  </div>
                  <div>
                    <label htmlFor={stockInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Stock ({profile.stockUnitLabel})</label>
                    <input
                      id={stockInputId}
                      type='number'
                      step='any'
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                        errors.stock ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                      )}
                      placeholder={profile.placeholders.stock}
                    />
                    {errors.stock && <p className='text-rose-500 text-xs mt-1'>{errors.stock}</p>}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label htmlFor={wholesalePriceInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Wholesale Price *</label>
                    <input
                      id={wholesalePriceInputId}
                      type='number'
                      step='0.01'
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-dark-bg text-slate-900 dark:text-white transition-colors",
                        errors.wholesale_price ? "border-rose-500" : "border-slate-200 dark:border-dark-border focus:border-primary",
                      )}
                      placeholder='0.00'
                    />
                    {errors.wholesale_price && <p className='text-rose-500 text-xs mt-1'>{errors.wholesale_price}</p>}
                  </div>
                  <div>
                    <label htmlFor={costPriceInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Cost Price</label>
                    <input
                      id={costPriceInputId}
                      type='number'
                      step='0.01'
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white focus:border-primary transition-colors'
                      placeholder='0.00'
                    />
                  </div>
                </div>

                {businessDetails.taxEnabled && (
                  <div className='grid grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20'>
                    <div>
                      <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>HSN / Tax Code</label>
                      <input
                        type='text'
                        value={formData.hsn_code}
                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                        className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:border-primary transition-colors'
                        placeholder='Optional'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>{businessDetails.taxLabel} Rate (%)</label>
                      <input
                        type='number'
                        step='0.01'
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                        className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:border-primary transition-colors'
                      />
                    </div>
                  </div>
                )}
              </div>

              {canConfigureLength && (
                <div className='p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20'>
                  <div className='flex items-center gap-2 mb-3'>
                    <RefreshCcw size={16} className='text-amber-500' />
                    <label htmlFor={metersPerUnitInputId} className='text-sm font-bold text-slate-700 dark:text-slate-300'>Set/Unit Length Construction</label>
                  </div>
                  <div className='space-y-3'>
                    <div className='relative'>
                      <Input
                        id={metersPerUnitInputId}
                        type='number'
                        step='0.01'
                        value={formData.meters_per_unit}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, meters_per_unit: e.target.value })}
                        className='w-full px-4 py-2.5 rounded-xl border pr-20 bg-white dark:bg-dark-bg'
                      />
                      <span className='absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400'>
                        {formData.unit === "suit" ? "meters / suit" : `meters / ${formData.unit}`}
                      </span>
                    </div>
                    <p className='text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-tight'>
                      {formData.unit === "suit"
                        ? "NOTE: In POS, adding 1 Suit will automatically deduct this length from stock."
                        : `NOTE: This value defines the standard selling length for this ${productLabel}.`}
                    </p>
                  </div>
                  {errors.meters_per_unit && <p className='text-rose-500 text-xs mt-1'>{errors.meters_per_unit}</p>}
                </div>
              )}

              <div>
                <label htmlFor={descriptionInputId} className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Description</label>
                <textarea
                  id={descriptionInputId}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className='w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white focus:border-primary transition-colors resize-none'
                  placeholder={profile.placeholders.description}
                />
              </div>
            </div>

            {/* Right Column: Image & Extras */}
            <div className='space-y-6'>
              {/* Image Upload */}
              <div>
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>
                  <ImageIcon size={14} className='inline mr-1' /> {productLabelTitle} Image
                </label>
                <div
                  className={cn(
                    "relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-bg/50",
                    formData.image ? "h-64 border-primary/20" : "h-48 border-slate-200 dark:border-dark-border hover:border-primary/50",
                  )}
                  role='button'
                  tabIndex={0}
                  aria-label={`Choose ${productLabel} image`}
                  onClick={handleImageSelect}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleImageSelect();
                    }
                  }}
                >
                  {formData.image ? (
                    <>
                      <img src={formData.image} alt={productLabelTitle} className='w-full h-full object-cover transition-transform group-hover:scale-105' />
                      <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                        <p className='text-white text-sm font-bold'>Change Image</p>
                      </div>
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, image: "" });
                        }}
                        className='absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-lg'
                        aria-label={`Remove ${productLabel} image`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div className='flex flex-col items-center text-slate-400 gap-2'>
                      <div className='w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm'>
                        <Upload size={20} />
                      </div>
                      <p className='text-xs font-bold uppercase tracking-widest'>Upload Image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Label Preview */}
              <div className='p-6 rounded-3xl border-2 border-dashed border-slate-100 dark:border-dark-border flex flex-col items-center gap-4 bg-slate-50/50 dark:bg-dark-bg/30'>
                <div className='flex items-center justify-between w-full'>
                  <div className='flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-400'>
                    <QrCode size={16} className='text-primary' /> {productLabelTitle} Label
                  </div>
                  <Button type='button' variant='ghost' size='sm' onClick={() => setShowQr(!showQr)} className='h-7 text-[10px]'>
                    {showQr ? "Hide" : "Generate"}
                  </Button>
                </div>
                {showQr && formData.sku && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3'>
                    <QRCode value={formData.sku} size={120} level='H' />
                    <div className='text-center text-[10px] font-black uppercase'>
                      <p className='truncate max-w-37.5'>{formData.name}</p>
                      <p className='text-slate-400'>{formData.sku}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Rolls (Fabric only) */}
              {canManageRolls && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between font-bold'>
                    <div className='flex items-center gap-2 text-sm'>
                      <RefreshCcw size={16} className='text-amber-500' />
                      <span>{productLabelTitle} Rolls</span>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setRolls([...rolls, { id: crypto.randomUUID(), roll_number: `Roll ${rolls.length + 1}`, initial_length: "0", current_length: "0", unit: formData.unit }])}
                      className='h-8 text-[10px]'
                    >
                      <Plus size={14} className='mr-1' /> Add Roll
                    </Button>
                  </div>
                  <div className='space-y-2 max-h-50 overflow-y-auto pr-2 scrollbar-hide'>
                    {rolls.map((roll, idx) => (
                      <div key={roll.id} className='bg-white dark:bg-dark-bg p-3 rounded-2xl border border-slate-100 dark:border-dark-border flex items-center gap-4 shadow-sm'>
                        <div className='flex-1'>
                          <input
                            type='text'
                            value={roll.roll_number}
                            onChange={(e) => {
                              const newRolls = [...rolls];
                              newRolls[idx].roll_number = e.target.value;
                              setRolls(newRolls);
                            }}
                            className='w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0'
                            placeholder='Roll No'
                            aria-label={`Roll ${idx + 1} number`}
                          />
                        </div>
                        <div className='w-20'>
                          <input
                            type='number'
                            step='0.01'
                            value={roll.current_length}
                            onChange={(e) => {
                              const newRolls = [...rolls];
                              newRolls[idx].current_length = e.target.value;
                              newRolls[idx].initial_length = e.target.value;
                              setRolls(newRolls);
                              const totalStock = newRolls.reduce((sum, r) => sum + (parseFloat(r.current_length) || 0), 0);
                              setFormData((prev) => ({ ...prev, stock: totalStock.toString() }));
                            }}
                            className='w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 text-right'
                            aria-label={`Roll ${idx + 1} length`}
                          />
                        </div>
                        <button type='button' onClick={() => setRolls(rolls.filter((_, i) => i !== idx))} className='text-slate-300 hover:text-rose-500 transition-colors' aria-label={`Remove ${roll.roll_number || `roll ${idx + 1}`}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {errors.submit && (
            <div className='mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'>
              <p className='text-rose-600 dark:text-rose-400 text-sm font-bold text-center'>{errors.submit}</p>
            </div>
          )}
        </form>

        <div className='flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50'>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading} className='h-11 px-10 rounded-xl'>
            Cancel
          </Button>
          <Button type='button' onClick={handleSubmit} disabled={loading} className='bg-primary text-white font-bold h-11 px-10 rounded-xl shadow-lg shadow-primary/20'>
            {loading ? "Saving..." : product ? `Update ${productLabelTitle}` : `Save ${productLabelTitle}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
