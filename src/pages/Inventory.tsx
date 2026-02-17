import React, { useState, useEffect } from "react";
import { Package, Plus, Search, Filter, Edit2, Trash2, ArrowDownRight, Barcode, Tag, Box } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { dbService } from "../services/database";
import type { Product } from "../types";
import { useThemeStore } from "../store/useThemeStore";
import { cn } from "../lib/utils";
import { ProductImage } from "../components/ui/ProductImage";

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const sql = `
        SELECT p.*, c.name as category 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name LIKE ? OR p.sku LIKE ?
        ORDER BY p.created_at DESC
      `;
      const res = await dbService.query(sql, [`%${search}%`, `%${search}%`]);
      setProducts(
        res.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          wholesalePrice: p.wholesale_price,
          costPrice: p.cost_price,
          stock: p.stock,
          category: p.category,
          image: p.image,
          description: p.description,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search]);

  return (
    <div className='p-6 space-y-6 max-w-[1600px] mx-auto'>
      {/* Header Section */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-black font-display text-slate-900 dark:text-white'>Inventory Management</h1>
          <p className='text-slate-500 text-sm'>Manage your stock, variants, and pricing.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline' className='gap-2 hidden sm:flex'>
            <Barcode size={18} />
            <span>Print Labels</span>
          </Button>
          <Button className='gap-2 h-11 bg-primary text-white'>
            <Plus size={18} />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: "Total Products", value: products.length, icon: <Package />, color: "text-blue-600" },
          { label: "Low Stock Items", value: products.filter((p) => p.stock < 10).length, icon: <ArrowDownRight />, color: "text-amber-600" },
          { label: "Out of Stock", value: products.filter((p) => p.stock <= 0).length, icon: <Box />, color: "text-rose-600" },
          { label: "Inventory Value", value: `${currency} ${products.reduce((acc, p) => acc + p.price * p.stock, 0).toLocaleString()}`, icon: <Tag />, color: "text-emerald-600" },
        ].map((stat, i) => (
          <Card key={i} className='p-4 flex items-center gap-4'>
            <div className={cn("p-3 rounded-xl bg-slate-50 dark:bg-slate-800", stat.color)}>{stat.icon}</div>
            <div>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>{stat.label}</p>
              <p className='text-xl font-black font-display text-slate-900 dark:text-white leading-tight'>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Utility Bar */}
      <Card className='p-2 flex flex-col md:flex-row items-center gap-2'>
        <div className='relative flex-1 w-full'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
          <input
            type='text'
            placeholder='Search by SKU or product name...'
            className='w-full pl-10 pr-4 py-2 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 dark:border-dark-border pt-2 md:pt-0 md:pl-2'>
          <Button variant='ghost' size='sm' className='gap-2 text-slate-500'>
            <Filter size={16} />
            <span>Filter</span>
          </Button>
          <div className='h-4 w-[1px] bg-slate-100 dark:bg-dark-border hidden md:block' />
          <p className='text-[10px] font-bold uppercase text-slate-400 px-2'>{products.length} Products Found</p>
        </div>
      </Card>

      {/* Product Table */}
      <Card className='overflow-hidden border-none shadow-xl bg-white dark:bg-dark-surface'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-dark-border transition-colors'>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400'>Product Details</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center'>Category</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center'>Stock</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right'>Retail Price</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right'>Wholesale</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center'>Status</th>
                <th className='px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50 dark:divide-dark-border'>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className='animate-pulse'>
                      <td colSpan={7} className='px-6 py-8'>
                        <div className='h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mx-auto' />
                      </td>
                    </tr>
                  ))
              ) : products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className='group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all'>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <ProductImage src={product.image} name={product.name} className='w-10 h-10 rounded-lg shadow-sm border border-slate-100 dark:border-dark-border' />
                        <div>
                          <p className='text-sm font-bold text-slate-900 dark:text-white'>{product.name}</p>
                          <p className='text-[10px] font-mono text-slate-400 uppercase tracking-tighter'>{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-center'>
                      <span className='px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider'>{product.category}</span>
                    </td>
                    <td className='px-6 py-4 text-center'>
                      <span className={cn("font-mono font-bold text-sm", product.stock < 10 ? "text-amber-500" : "text-slate-600 dark:text-slate-300")}>{product.stock}</span>
                    </td>
                    <td className='px-6 py-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white'>
                      {currency} {product.price.toFixed(2)}
                    </td>
                    <td className='px-6 py-4 text-right font-mono font-bold text-sm text-primary'>
                      {currency} {product.wholesalePrice.toFixed(2)}
                    </td>
                    <td className='px-6 py-4 text-center'>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          product.stock > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
                        )}
                      >
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <button className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-primary'>
                          <Edit2 size={16} />
                        </button>
                        <button className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-500'>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className='px-6 py-20 text-center text-slate-500'>
                    <div className='flex flex-col items-center gap-3'>
                      <Package size={48} className='text-slate-200 dark:text-slate-800' />
                      <p className='font-display font-bold text-lg'>No products found</p>
                      <p className='text-xs'>Try adjusting your search or add a new product.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
