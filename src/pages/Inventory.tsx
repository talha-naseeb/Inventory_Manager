import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit2, Trash2, Package, Upload, TrendingUp, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ProductModal } from "../components/inventory/ProductModal";
import { BrandSidebar } from "../components/inventory/BrandSidebar";
import { BrandModal } from "../components/inventory/BrandModal";
import { StockAdjustModal } from "../components/inventory/StockAdjustModal";
import { BulkImportModal } from "../components/inventory/BulkImportModal";
import { LabelPrinterModal } from "../components/inventory/LabelPrinterModal";
import { dbService } from "../services/database";
import { usePermissions } from "../hooks/usePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";
import { cn } from "../lib/utils";
import type { Product } from "../types";

interface Brand {
  id: string;
  name: string;
  productCount?: number;
}

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [isLabelPrinterOpen, setIsLabelPrinterOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();
  const profile = useBusinessProfile();
  const productPlural = profile.productNoun.plural;
  const productSingular = profile.productNoun.singular;
  const categoryPlural = profile.categoryNoun.endsWith("y") ? `${profile.categoryNoun.slice(0, -1)}ies` : `${profile.categoryNoun}s`;

  const fetchBrands = useCallback(async () => {
    try {
      const brandsData = await dbService.getBrandsWithCounts() as Brand[];
      setBrands(brandsData);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dbService.listProducts({ search, brandId: selectedBrandId || undefined });
      setProducts(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          brandId: p.brand_id,
          price: p.price,
          wholesalePrice: p.wholesale_price,
          costPrice: p.cost_price,
          stock: p.stock,
          image: p.image,
          description: p.description,
          unit: p.unit,
          meters_per_unit: p.meters_per_unit,
          metersPerUnit: p.meters_per_unit ?? p.metersPerUnit,
          lowStockAlert: p.low_stock_alert ?? p.lowStockAlert,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBrandId]);

  useEffect(() => {
    fetchBrands();
    fetchInventory();
  }, [fetchBrands, fetchInventory]);

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${productSingular}?`)) return;

    try {
      await dbService.deleteProduct(id);
      fetchInventory();
      fetchBrands(); // Refresh counts
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert(`Failed to delete ${productSingular}. Please try again.`);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleProductSave = () => {
    fetchInventory();
    fetchBrands(); // Refresh counts
  };

  const handleBrandSave = () => {
    fetchBrands();
  };

  const toggleProductSelection = (id: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedProductIds(newSelection);
  };

  const selectAll = () => {
    if (selectedProductIds.size === products.length && products.length > 0) setSelectedProductIds(new Set());
    else setSelectedProductIds(new Set(products.map(p => p.id)));
  };

  const handleDeleteAllProducts = async () => {
    if (products.length === 0) {
      alert(`No ${productPlural} to delete.`);
      return;
    }

    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL ${products.length} ${products.length === 1 ? productSingular : productPlural}!\n\nThis action cannot be undone.\n\nAre you absolutely sure?`;

    if (!confirm(confirmMessage)) return;
    if (!confirm(`Last chance! Delete all ${productPlural}?`)) return;

    try {
      await dbService.clearInventory();

      fetchInventory();
      fetchBrands(); // Refresh counts
      alert(`Successfully deleted ${products.length} ${products.length === 1 ? productSingular : productPlural}. Sales history and settings were kept.`);
    } catch (error) {
      console.error("Failed to delete all products:", error);
      alert(`Failed to delete ${productPlural}. Please try again.`);
    }
  };

  const totalProducts = products.length;
  const filteredProducts = products;
  const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

  return (
    <div className='h-screen flex flex-col bg-slate-50 dark:bg-dark-bg'>
      {/* Header */}
      <div className='bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>Your {productPlural}</h1>
            <p className='text-slate-600 dark:text-slate-400 mt-1'>
              {selectedBrandId ? brands.find((b) => b.id === selectedBrandId)?.name : `All ${categoryPlural}`} • {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? productSingular : productPlural}
            </p>
          </div>
          <div className='flex gap-2'>
            {selectedProductIds.size > 0 && (
              <Button variant='outline' onClick={() => setIsLabelPrinterOpen(true)} className='bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'>
                <Printer size={18} className='mr-2' />
                Print {selectedProductIds.size} Labels
              </Button>
            )}
            {products.length > 0 && can("delete_product") && selectedProductIds.size === 0 && (
              <Button variant='outline' onClick={handleDeleteAllProducts} className='text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'>
                <Trash2 size={18} className='mr-2' />
                Delete All {productPlural}
              </Button>
            )}
            {can("manage_inventory") && (
              <>
                <Button variant='outline' onClick={() => setIsBulkImportOpen(true)}>
                  <Upload size={18} className='mr-2' />
                  Import CSV
                </Button>
                <Button onClick={handleAddProduct}>
                  <Plus size={18} className='mr-2' />
                  Add {productSingular}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Sidebar - Brands */}
        <div className='w-64 shrink-0'>
          <BrandSidebar
            brands={brands}
            selectedBrandId={selectedBrandId}
            onSelectBrand={setSelectedBrandId}
            onAddBrand={() => setIsBrandModalOpen(true)}
            onBrandDeleted={() => {
              fetchBrands();
              fetchInventory();
            }}
            totalProducts={totalProducts}
            categoryLabel={profile.categoryNoun}
          />
        </div>

        {/* Right Panel - Products */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          {/* Search Bar */}
          <div className='p-4 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border flex items-center gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={20} />
              <label htmlFor='inventory-search' className='sr-only'>
                Search {productPlural}
              </label>
              <Input id='inventory-search' type='text' placeholder={`Search ${productPlural} by name or SKU...`} value={search} onChange={(e) => setSearch(e.target.value)} className='pl-10' />
            </div>
            {products.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAll} className="text-xs uppercase font-black tracking-widest px-4">
                {selectedProductIds.size === products.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          {/* Products Grid */}
          <div className='flex-1 overflow-y-auto p-6'>
            {loading ? (
              <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                <p className='text-slate-600 dark:text-slate-400 mt-4'>Loading {productPlural}...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className='text-center py-12'>
                <Package size={48} className='mx-auto text-slate-300 dark:text-slate-600 mb-4' />
                <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>No {productPlural} found</h3>
                <p className='text-slate-600 dark:text-slate-400 mb-4'>{search ? "Try adjusting your search" : `Get started by adding your first ${productSingular}`}</p>
                {!search && (
                  <Button onClick={handleAddProduct}>
                    <Plus size={18} className='mr-2' />
                    Add {productSingular}
                  </Button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className={cn(
                      "group overflow-hidden hover:shadow-lg transition-all relative cursor-pointer border-2",
                      selectedProductIds.has(product.id) ? "border-primary ring-4 ring-primary/10" : "border-transparent"
                    )}
                    onClick={() => toggleProductSelection(product.id)}
                  >
                    {/* Selection Indicator */}
                    <div className={cn(
                      "absolute top-3 left-3 z-10 transition-all",
                      selectedProductIds.has(product.id) ? "scale-100" : "scale-0 group-hover:scale-75"
                    )}>
                      <div className="bg-white dark:bg-dark-bg rounded-full shadow-lg">
                        <CheckCircle2 size={24} className={cn(selectedProductIds.has(product.id) ? "text-primary" : "text-slate-300")} />
                      </div>
                    </div>

                    {/* Product Image */}
                    <div className='aspect-square bg-slate-100 dark:bg-slate-800 relative'>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className='w-full h-full object-cover'
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <Package size={48} className='text-slate-300 dark:text-slate-600' />
                        </div>
                      )}
                      {product.brand && <div className='absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-medium ml-8'>{product.brand}</div>}
                      {product.stock <= 5 && <div className='absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full font-medium'>Low Stock</div>}
                    </div>

                    {/* Product Details */}
                    <div className='p-4' onClick={(e) => e.stopPropagation()}>
                      <h3 className='font-semibold text-slate-900 dark:text-white mb-1 truncate'>{product.name}</h3>
                      <p className='text-sm text-slate-600 dark:text-slate-400 mb-2'>SKU: {product.sku || 'N/A'}</p>
                      <div className='flex items-center justify-between mb-3'>
                        <div>
                          <p className='text-lg font-bold text-primary'>PKR {product.price.toFixed(2)}</p>
                          <p className='text-xs text-slate-500'>Stock: {product.stock}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex gap-2'>
                        {can("manage_inventory") && (
                          <>
                            <Button variant='outline' size='sm' onClick={() => handleEdit(product)} className='flex-1'>
                              <Edit2 size={14} className='mr-1' />
                              Edit
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => { setAdjustProduct(product); setIsStockAdjustOpen(true); }}
                              className='text-primary hover:bg-primary/5'
                              title="Adjust Stock"
                              aria-label={`Adjust stock for ${product.name}`}
                            >
                              <TrendingUp size={14} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSelectedProductIds(new Set([product.id]));
                            setIsLabelPrinterOpen(true);
                          }}
                          className='text-indigo-600 hover:bg-indigo-50'
                          title="Print Label"
                        >
                          <Printer size={14} />
                        </Button>
                        {can("delete_product") && (
                          <Button variant='outline' size='sm' onClick={() => handleDelete(product.id)} className='text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20' aria-label={`Delete ${product.name}`}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleProductSave}
        product={selectedProduct}
        selectedBrandId={selectedBrandId}
      />

      <BrandModal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} onSave={handleBrandSave} />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSave={() => {
          fetchInventory();
          fetchBrands();
        }}
      />

      <StockAdjustModal
        isOpen={isStockAdjustOpen}
        product={adjustProduct}
        onClose={() => { setIsStockAdjustOpen(false); setAdjustProduct(null); }}
        onSuccess={(newStock) => {
          setProducts((prev) => prev.map((p) => p.id === adjustProduct?.id ? { ...p, stock: newStock } : p));
          setIsStockAdjustOpen(false);
          setAdjustProduct(null);
        }}
      />

      {isLabelPrinterOpen && (
        <LabelPrinterModal
          products={selectedProducts}
          onClose={() => {
            setIsLabelPrinterOpen(false);
            // Don't clear selection, maybe they want to print more
          }}
        />
      )}
    </div>
  );
};
