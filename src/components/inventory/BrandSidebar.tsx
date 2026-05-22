import React from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/database";
import { usePermissions } from "../../hooks/usePermissions";

interface Brand {
  id: string;
  name: string;
  productCount?: number;
}

interface BrandSidebarProps {
  brands: Brand[];
  selectedBrandId: string | null;
  onSelectBrand: (brandId: string | null) => void;
  onAddBrand: () => void;
  onBrandDeleted: () => void;
  totalProducts: number;
  categoryLabel: string;
}

export const BrandSidebar: React.FC<BrandSidebarProps> = ({ brands, selectedBrandId, onSelectBrand, onAddBrand, onBrandDeleted, totalProducts, categoryLabel }) => {
  const { isAdmin, isOwner } = usePermissions();
  const categoryPlural = categoryLabel.endsWith("y") ? `${categoryLabel.slice(0, -1)}ies` : `${categoryLabel}s`;
  const categoryLower = categoryLabel.toLowerCase();
  const categoryPluralLower = categoryPlural.toLowerCase();

  const handleDeleteBrand = async (brandId: string, brandName: string, productCount: number) => {
    const confirmMessage =
      productCount > 0
        ? `Are you sure you want to delete "${brandName}"?\n\n${productCount} product(s) will have their ${categoryLower} removed (set to no ${categoryLower}).`
        : `Are you sure you want to delete "${brandName}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      await dbService.deleteBrand(brandId);

      // If the deleted brand was selected, reset selection
      if (selectedBrandId === brandId) {
        onSelectBrand(null);
      }

      // Notify parent to refresh
      onBrandDeleted();
    } catch (error) {
      console.error("Failed to delete brand:", error);
      alert(`Failed to delete ${categoryLower}. Please try again.`);
    }
  };

  return (
    <div className='h-full flex flex-col bg-white dark:bg-dark-surface border-r border-slate-200 dark:border-dark-border'>
      {/* Header */}
      <div className='p-4 border-b border-slate-200 dark:border-dark-border'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-lg font-bold text-slate-900 dark:text-white'>{categoryPlural}</h2>
          <button type='button' onClick={onAddBrand} className='p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors' title={`Add new ${categoryLower}`} aria-label={`Add new ${categoryLower}`}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Brand List */}
      <div className='flex-1 overflow-y-auto p-2'>
        {/* All Brands */}
        <button
          type='button'
          onClick={() => onSelectBrand(null)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors mb-1",
            selectedBrandId === null ? "bg-primary text-white" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
          )}
        >
          <div className='flex items-center gap-2'>
            <Package size={16} />
            <span className='font-medium text-sm'>All {categoryPlural}</span>
          </div>
          <span className='text-xs font-bold'>{totalProducts}</span>
        </button>

        {/* Individual Brands */}
        {brands.map((brand) => (
          <div
            key={brand.id}
            className={cn(
              "group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors mb-1",
              selectedBrandId === brand.id ? "bg-primary/10 border border-primary" : "hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <button type='button' onClick={() => onSelectBrand(brand.id)} className='flex-1 flex items-center justify-between text-left'>
              <span className={cn("font-medium text-sm truncate", selectedBrandId === brand.id ? "text-primary" : "text-slate-700 dark:text-slate-300")}>{brand.name}</span>
              <span className={cn("text-xs font-bold ml-2", selectedBrandId === brand.id ? "text-primary" : "text-slate-500")}>{brand.productCount || 0}</span>
            </button>
            {(isAdmin || isOwner) && (
              <button
                type='button'
                onClick={() => handleDeleteBrand(brand.id, brand.name, brand.productCount || 0)}
                className='opacity-0 group-hover:opacity-100 ml-2 p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all'
                title={`Delete ${categoryLower}`}
                aria-label={`Delete ${brand.name}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}

        {brands.length === 0 && (
          <div className='text-center py-8 text-slate-500 dark:text-slate-400'>
            <Package size={32} className='mx-auto mb-2 opacity-50' />
            <p className='text-sm'>No {categoryPluralLower} yet</p>
            <p className='text-xs mt-1'>Click + to add one</p>
          </div>
        )}
      </div>
    </div>
  );
};
